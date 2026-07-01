import { db } from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────
export interface Suggestion {
  type: "overproduction" | "cross_sell" | "no_layout" | "critical_waste";
  message: string;
  layoutId?: string;
  ideaIds?: string[];
  suggestedReduction?: number;
  wastePercent?: number;
}

export interface RunPlanItem {
  ideaId: string;
  msku: string;
  quantityPerRun: number;
  producedQty: number;
}

export interface RunPlanEntry {
  layoutId: string;
  code: string;
  materialCode: string;
  materialWidth: number;
  materialLength: number;
  dxfFileUrl: string;
  pdfFileUrl: string | null;
  runCount: number;
  items: RunPlanItem[];
}

// ─── Configurable thresholds ────────────────────────────────────────
// Can be overridden via SystemSetting in the future
const MAX_OVERPRODUCTION_THRESHOLD = 0.2;  // 20% — ngưỡng cảnh báo dư thừa
const MAX_WASTE_CRITICAL = 0.5;             // 50% — ngưỡng yêu cầu layout mới

// ─── Core ───────────────────────────────────────────────────────────
function calculateRuns(requestedQty: number, quantityPerRun: number): number {
  return Math.ceil(requestedQty / quantityPerRun);
}

// ─── Main entry point ───────────────────────────────────────────────
export async function suggestProductionRuns(
  requirements: Map<string, number>
): Promise<{
  runPlan: RunPlanEntry[];
  suggestions: Suggestion[];
  remaining: Map<string, number>;
}> {
  const remaining = new Map(requirements);
  const runPlan: RunPlanEntry[] = [];
  const suggestions: Suggestion[] = [];

  // Step 1 & 2: Fetch all active layouts with their items
  const layouts = await db.productionLayout.findMany({
    where: { status: "active" },
    include: {
      items: {
        include: {
          idea: { select: { id: true, msku: true } },
        },
      },
    },
  });

  // Score layouts: perfect match bonus, then by matchCount desc
  const scored = layouts
    .map((layout) => {
      const matchCount = layout.items.filter((item) =>
        remaining.has(item.ideaId)
      ).length;
      const perfectMatch = matchCount === layout.items.length && matchCount > 0;
      return { layout, matchCount, perfectMatch };
    })
    .filter((s) => s.matchCount > 0)
    .sort((a, b) => {
      if (a.perfectMatch && !b.perfectMatch) return -1;
      if (!a.perfectMatch && b.perfectMatch) return 1;
      return b.matchCount - a.matchCount;
    });

  // Step 3: Greedy allocation
  for (const { layout } of scored) {
    let neededRuns = 0;

    for (const item of layout.items) {
      const req = remaining.get(item.ideaId);
      if (req && req > 0 && item.quantityPerRun > 0) {
        const runs = calculateRuns(req, item.quantityPerRun);
        neededRuns = Math.max(neededRuns, runs);
      }
    }

    if (neededRuns > 0) {
      const items: RunPlanItem[] = layout.items.map((item) => ({
        ideaId: item.ideaId,
        msku: item.idea.msku,
        quantityPerRun: item.quantityPerRun,
        producedQty: neededRuns * item.quantityPerRun,
      }));

      runPlan.push({
        layoutId: layout.id,
        code: layout.code,
        materialCode: layout.materialCode,
        materialWidth: layout.materialWidth,
        materialLength: layout.materialLength,
        dxfFileUrl: layout.dxfFileUrl,
        pdfFileUrl: layout.pdfFileUrl,
        runCount: neededRuns,
        items,
      });

      // Subtract produced quantities from remaining
      for (const item of layout.items) {
        const current = remaining.get(item.ideaId) || 0;
        remaining.set(
          item.ideaId,
          Math.max(0, current - neededRuns * item.quantityPerRun)
        );
      }
    }
  }

  // Step 4: Generate suggestions
  // Type A — Overproduction > 20%
  for (const entry of runPlan) {
    for (const item of entry.items) {
      const requested = requirements.get(item.ideaId) || 0;
      if (requested > 0 && item.producedQty > requested) {
        const waste = item.producedQty - requested;
        const wastePercent = waste / item.producedQty;

        if (wastePercent > MAX_OVERPRODUCTION_THRESHOLD) {
          suggestions.push({
            type: "overproduction",
            message: `Chạy ${entry.runCount} lần layout ${entry.code}, SKU ${item.msku} dư ${waste} cái (${Math.round(wastePercent * 100)}%). Có muốn giảm xuống ${entry.runCount - 1} lần?`,
            layoutId: entry.layoutId,
            suggestedReduction: 1,
          });
        }

        if (wastePercent > MAX_WASTE_CRITICAL) {
          suggestions.push({
            type: "critical_waste",
            message: `Tỷ lệ hao phí lên tới ${Math.round(wastePercent * 100)}% cho SKU ${item.msku}. Cân nhắc yêu cầu Designer làm file mới.`,
            layoutId: entry.layoutId,
            wastePercent,
          });
        }
      }
    }
  }

  // Type B — Cross-selling
  for (const entry of runPlan) {
    const layout = layouts.find((l) => l.id === entry.layoutId);
    if (!layout) continue;

    for (const item of layout.items) {
      if (!requirements.has(item.ideaId)) {
        suggestions.push({
          type: "cross_sell",
          message: `Layout ${entry.code} còn chứa mã ${item.idea.msku}. Có muốn thêm vào lệnh này không?`,
          layoutId: entry.layoutId,
        });
      }
    }
  }

  // Type C — No layout found for some SKUs
  const noLayoutIdeaIds: string[] = [];
  for (const [ideaId, qty] of remaining) {
    if (qty > 0) {
      // Check if any layout contains this SKU at all
      const hasAnyLayout = layouts.some((l) =>
        l.items.some((item) => item.ideaId === ideaId)
      );
      if (!hasAnyLayout) {
        noLayoutIdeaIds.push(ideaId);
      }
    }
  }
  if (noLayoutIdeaIds.length > 0) {
    suggestions.push({
      type: "no_layout",
      message: `Không tìm thấy file layout nào chứa ${noLayoutIdeaIds.length} SKU đã chọn.`,
      ideaIds: noLayoutIdeaIds,
    });
  }

  return { runPlan, suggestions, remaining };
}
