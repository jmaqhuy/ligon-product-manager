import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("@/lib/db", () => ({
  db: {
    productionLayout: {
      findMany: vi.fn(),
    },
  },
}));

import { suggestProductionRuns } from "@/lib/production-layout-engine";
import { db } from "@/lib/db";

// Helper to create mock layout data
function mockLayout(
  id: string,
  code: string,
  materialCode: string,
  materialWidth: number,
  materialLength: number,
  items: { ideaId: string; msku: string; quantityPerRun: number }[]
) {
  return {
    id,
    code,
    name: null,
    materialCode,
    materialWidth,
    materialLength,
    dxfFileUrl: `https://drive.google.com/file/d/${id}-dxf`,
    pdfFileUrl: null,
    status: "active",
    isVerified: true,
    verifiedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: items.map((item) => ({
      id: `${id}-${item.ideaId}`,
      productionLayoutId: id,
      ideaId: item.ideaId,
      quantityPerRun: item.quantityPerRun,
      idea: { id: item.ideaId, msku: item.msku },
    })),
  };
}

describe("suggestProductionRuns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Scenario 1: Single SKU, exact match ──────────────────────
  it("suggests 1 run for a single SKU with exact quantityPerRun match (50 MA A)", async () => {
    const layout = mockLayout("l1", "LAYOUT-PURE-A", "BW-3-MXL", 910, 600, [
      { ideaId: "idea-a", msku: "MA-A", quantityPerRun: 54 },
    ]);

    vi.mocked(db.productionLayout.findMany).mockResolvedValue([layout]);

    const requirements = new Map([["idea-a", 50]]);
    const result = await suggestProductionRuns(requirements);

    expect(result.runPlan).toHaveLength(1);
    expect(result.runPlan[0].code).toBe("LAYOUT-PURE-A");
    expect(result.runPlan[0].runCount).toBe(1);
    expect(result.runPlan[0].items[0].producedQty).toBe(54);
    // 54 produced, 50 requested → 4 waste (7.4%)
    expect(result.suggestions.length).toBeGreaterThanOrEqual(0);
  });

  // ─── Scenario 2: Multi-SKU optimal ────────────────────────────
  it("optimizes multi-SKU with mixed layout (90 MA A + 20 MA B)", async () => {
    const mixLayout = mockLayout("l1", "LAYOUT-MIX-AB", "BW-3-MXL", 910, 600, [
      { ideaId: "idea-a", msku: "MA-A", quantityPerRun: 30 },
      { ideaId: "idea-b", msku: "MA-B", quantityPerRun: 20 },
    ]);
    const pureLayout = mockLayout("l2", "LAYOUT-PURE-A", "BW-3-MXL", 910, 600, [
      { ideaId: "idea-a", msku: "MA-A", quantityPerRun: 54 },
    ]);

    vi.mocked(db.productionLayout.findMany).mockResolvedValue([
      mixLayout,
      pureLayout,
    ]);

    const requirements = new Map([
      ["idea-a", 90],
      ["idea-b", 20],
    ]);
    const result = await suggestProductionRuns(requirements);

    // Mix layout should be used first (perfect match for both SKUs)
    const mixRun = result.runPlan.find((r) => r.code === "LAYOUT-MIX-AB");
    expect(mixRun).toBeDefined();
    // Greedy: mix runs 3 times (ceil(90/30)=3 for A, ceil(20/20)=1 for B → max=3)
    // 3 runs of mix = 90 A + 60 B → satisfies both, remaining A=0, B=0
    expect(mixRun!.runCount).toBe(3);

    // Remaining should be fully satisfied
    expect(result.remaining.get("idea-a")).toBe(0);
    expect(result.remaining.get("idea-b")).toBe(0);
  });

  // ─── Scenario 3: No layout found ──────────────────────────────
  it("returns no_layout suggestion when no layout contains the SKU", async () => {
    const layout = mockLayout("l1", "LAYOUT-OTHER", "BW-3-MXL", 910, 600, [
      { ideaId: "idea-other", msku: "MA-OTHER", quantityPerRun: 10 },
    ]);

    vi.mocked(db.productionLayout.findMany).mockResolvedValue([layout]);

    const requirements = new Map([["idea-c", 100]]);
    const result = await suggestProductionRuns(requirements);

    expect(result.runPlan).toHaveLength(0);
    expect(result.suggestions.some((s) => s.type === "no_layout")).toBe(true);
    // remaining should still have idea-c
    expect(result.remaining.get("idea-c")).toBe(100);
  });

  // ─── Scenario 4: Exact match, no waste ────────────────────────
  it("produces exact match with no overproduction suggestion when waste < 20%", async () => {
    const layout = mockLayout("l1", "LAYOUT-X", "ACRYLIC-3MM", 600, 400, [
      { ideaId: "idea-x", msku: "MA-X", quantityPerRun: 100 },
    ]);

    vi.mocked(db.productionLayout.findMany).mockResolvedValue([layout]);

    const requirements = new Map([["idea-x", 95]]);
    const result = await suggestProductionRuns(requirements);

    expect(result.runPlan).toHaveLength(1);
    expect(result.runPlan[0].runCount).toBe(1);
    // 100 produced, 95 requested → 5 waste (5%) < 20%
    const overproduction = result.suggestions.filter(
      (s) => s.type === "overproduction"
    );
    expect(overproduction).toHaveLength(0);
  });

  // ─── Scenario 5: Overproduction > 20% ─────────────────────────
  it("suggests overproduction reduction when waste > 20%", async () => {
    const layout = mockLayout("l1", "LAYOUT-Y", "BW-2-T", 800, 500, [
      { ideaId: "idea-y", msku: "MA-Y", quantityPerRun: 50 },
    ]);

    vi.mocked(db.productionLayout.findMany).mockResolvedValue([layout]);

    // Request 15 → need 1 run = 50 produced, 35 waste = 70%
    const requirements = new Map([["idea-y", 15]]);
    const result = await suggestProductionRuns(requirements);

    expect(result.runPlan).toHaveLength(1);
    expect(result.runPlan[0].runCount).toBe(1);

    const overproduction = result.suggestions.filter(
      (s) => s.type === "overproduction"
    );
    expect(overproduction.length).toBeGreaterThanOrEqual(1);
    expect(overproduction[0].message).toContain("dư");
  });

  // ─── Scenario 6: Critical waste > 50% ─────────────────────────
  it("suggests critical_waste when overproduction > 50%", async () => {
    const layout = mockLayout("l1", "LAYOUT-Z", "BW-3-MXL", 900, 600, [
      { ideaId: "idea-z", msku: "MA-Z", quantityPerRun: 100 },
    ]);

    vi.mocked(db.productionLayout.findMany).mockResolvedValue([layout]);

    // Request 10 → need 1 run = 100 produced, 90 waste = 90%
    const requirements = new Map([["idea-z", 10]]);
    const result = await suggestProductionRuns(requirements);

    const criticalWaste = result.suggestions.filter(
      (s) => s.type === "critical_waste"
    );
    expect(criticalWaste.length).toBeGreaterThanOrEqual(1);
    expect(criticalWaste[0].message).toContain("hao phí");
  });

  // ─── Scenario 7: Cross-selling detection ──────────────────────
  it("detects cross-sell opportunities when layout contains unrequested SKUs", async () => {
    const layout = mockLayout("l1", "LAYOUT-MULTI", "BW-3-MXL", 900, 600, [
      { ideaId: "idea-d", msku: "MA-D", quantityPerRun: 20 },
      { ideaId: "idea-e", msku: "MA-E", quantityPerRun: 20 },
    ]);

    vi.mocked(db.productionLayout.findMany).mockResolvedValue([layout]);

    const requirements = new Map([["idea-d", 50]]);
    const result = await suggestProductionRuns(requirements);

    // idea-e is in the layout but not requested → cross-sell
    const crossSell = result.suggestions.filter(
      (s) => s.type === "cross_sell"
    );
    expect(crossSell.length).toBeGreaterThanOrEqual(1);
    expect(crossSell[0].message).toContain("MA-E");
  });

  // ─── Scenario 8: Empty requirements ───────────────────────────
  it("returns empty plan for empty requirements", async () => {
    vi.mocked(db.productionLayout.findMany).mockResolvedValue([]);

    const requirements = new Map<string, number>();
    const result = await suggestProductionRuns(requirements);

    expect(result.runPlan).toHaveLength(0);
    expect(result.suggestions).toHaveLength(0);
  });

  // ─── Scenario 9: Perfect match ────────────────────────────────
  it("prioritizes perfect match layout over partial match", async () => {
    const perfectLayout = mockLayout(
      "l1",
      "LAYOUT-PERFECT",
      "BW-3-MXL",
      900,
      600,
      [
        { ideaId: "idea-a", msku: "MA-A", quantityPerRun: 10 },
        { ideaId: "idea-b", msku: "MA-B", quantityPerRun: 10 },
      ]
    );
    const partialLayout = mockLayout(
      "l2",
      "LAYOUT-PARTIAL",
      "BW-3-MXL",
      900,
      600,
      [
        { ideaId: "idea-a", msku: "MA-A", quantityPerRun: 100 },
        { ideaId: "idea-c", msku: "MA-C", quantityPerRun: 10 },
      ]
    );

    vi.mocked(db.productionLayout.findMany).mockResolvedValue([
      partialLayout,
      perfectLayout,
    ]);

    const requirements = new Map([
      ["idea-a", 20],
      ["idea-b", 30],
    ]);
    const result = await suggestProductionRuns(requirements);

    // Perfect match should be used first
    expect(result.runPlan[0].code).toBe("LAYOUT-PERFECT");
  });
});
