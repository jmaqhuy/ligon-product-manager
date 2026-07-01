import { db } from "@/lib/db";
import { suggestProductionRuns } from "@/lib/production-layout-engine";

/**
 * Auto-trigger: Khi Designer tick isCompleted = true trên notification
 * (type = layout_requested), quét các ProductionRequest đang awaiting_layout
 * có chứa SKU liên quan, tính layoutSnapshot, chuyển status = "ready".
 *
 * Được gọi từ PATCH /api/notifications/[id] khi isCompleted chuyển true.
 */
export async function activateAwaitingRequests(
  ideaIds: string[]
): Promise<number> {
  if (!ideaIds || ideaIds.length === 0) return 0;

  // 1. Tìm tất cả ProductionRequest đang awaiting_layout, có ideaId trong danh sách
  const pendingRequests = await db.productionRequest.findMany({
    where: {
      status: "awaiting_layout",
      ideaId: { in: ideaIds },
    },
    include: {
      idea: { select: { msku: true } },
    },
  });

  if (pendingRequests.length === 0) return 0;

  let activated = 0;

  // 2. Với mỗi request, chạy lại suggestProductionRuns để tính layoutSnapshot
  for (const req of pendingRequests) {
    try {
      const { runPlan } = await suggestProductionRuns(
        new Map([[req.ideaId, req.requestedQty]])
      );

      // 3. Cập nhật layoutSnapshot + chuyển status sang ready
      await db.productionRequest.update({
        where: { id: req.id },
        data: {
          layoutSnapshot: runPlan.length > 0 ? JSON.stringify(runPlan) : null,
          status: "ready",
          version: { increment: 1 },
        },
      });

      activated++;
    } catch (error) {
      console.error(
        `activateAwaitingRequests: Failed for request ${req.id} (MSKU: ${req.idea.msku})`,
        error
      );
      // Continue with other requests even if one fails
    }
  }

  return activated;
}
