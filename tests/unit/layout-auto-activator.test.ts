import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  db: {
    productionRequest: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/production-layout-engine", () => ({
  suggestProductionRuns: vi.fn(),
}));

import { activateAwaitingRequests } from "@/lib/layout-auto-activator";
import { db } from "@/lib/db";
import { suggestProductionRuns } from "@/lib/production-layout-engine";

describe("activateAwaitingRequests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("activates awaiting_layout requests when layout becomes available", async () => {
    const mockRequest = {
      id: "req-1",
      ideaId: "idea-a",
      requestedQty: 50,
      status: "awaiting_layout",
      idea: { msku: "NQH2606-001" },
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      type: "batch",
      priority: "normal",
      requestedAt: new Date(),
      actualQty: null,
      completedAt: null,
      noteForWorkers: null,
      layoutSnapshot: null,
      layoutAssigneeId: null,
      shipped: false,
    };

    vi.mocked(db.productionRequest.findMany).mockResolvedValue([mockRequest]);
    vi.mocked(suggestProductionRuns).mockResolvedValue({
      runPlan: [
        {
          layoutId: "l1",
          code: "LAYOUT-NEW",
          materialCode: "BW-3-MXL",
          materialWidth: 910,
          materialLength: 600,
          runCount: 1,
          dxfFileUrl: "https://drive.google.com/file/d/dxf",
          pdfFileUrl: null,
          items: [
            {
              ideaId: "idea-a",
              msku: "NQH2606-001",
              quantityPerRun: 54,
              producedQty: 54,
            },
          ],
        },
      ],
      suggestions: [],
      remaining: new Map(),
    });
    vi.mocked(db.productionRequest.update).mockResolvedValue({
      ...mockRequest,
      status: "ready",
      layoutSnapshot: JSON.stringify([]),
    });

    const activated = await activateAwaitingRequests(["idea-a"]);

    expect(activated).toBe(1);
    expect(db.productionRequest.findMany).toHaveBeenCalledWith({
      where: {
        status: "awaiting_layout",
        ideaId: { in: ["idea-a"] },
      },
      include: { idea: { select: { msku: true } } },
    });
    expect(db.productionRequest.update).toHaveBeenCalledTimes(1);
  });

  it("returns 0 when no awaiting requests match the ideaIds", async () => {
    vi.mocked(db.productionRequest.findMany).mockResolvedValue([]);

    const activated = await activateAwaitingRequests(["idea-z"]);

    expect(activated).toBe(0);
    expect(db.productionRequest.update).not.toHaveBeenCalled();
  });

  it("returns 0 for empty ideaIds array", async () => {
    const activated = await activateAwaitingRequests([]);

    expect(activated).toBe(0);
    expect(db.productionRequest.findMany).not.toHaveBeenCalled();
  });

  it("activates multiple awaiting requests at once", async () => {
    const base = {
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      type: "batch" as const,
      priority: "normal" as const,
      requestedAt: new Date(),
      actualQty: null as number | null,
      completedAt: null as Date | null,
      noteForWorkers: null as string | null,
      layoutSnapshot: null as string | null,
      layoutAssigneeId: null as string | null,
      shipped: false,
    };
    const mockRequests = [
      { id: "req-1", ideaId: "idea-a", requestedQty: 50, status: "awaiting_layout", idea: { msku: "NQH2606-001" }, ...base },
      { id: "req-2", ideaId: "idea-b", requestedQty: 30, status: "awaiting_layout", idea: { msku: "NQH2606-002" }, ...base },
    ];

    vi.mocked(db.productionRequest.findMany).mockResolvedValue(mockRequests);
    vi.mocked(suggestProductionRuns).mockResolvedValue({
      runPlan: [],
      suggestions: [],
      remaining: new Map(),
    });
    vi.mocked(db.productionRequest.update).mockResolvedValue({
      ...mockRequests[0],
      status: "ready",
      layoutSnapshot: null,
    });

    const activated = await activateAwaitingRequests(["idea-a", "idea-b"]);

    expect(activated).toBe(2);
    expect(db.productionRequest.update).toHaveBeenCalledTimes(2);
  });

  it("continues activating other requests even if one fails", async () => {
    const base = {
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      type: "batch" as const,
      priority: "normal" as const,
      requestedAt: new Date(),
      actualQty: null as number | null,
      completedAt: null as Date | null,
      noteForWorkers: null as string | null,
      layoutSnapshot: null as string | null,
      layoutAssigneeId: null as string | null,
      shipped: false,
    };
    const mockRequests = [
      { id: "req-1", ideaId: "idea-a", requestedQty: 50, status: "awaiting_layout", idea: { msku: "NQH2606-001" }, ...base },
      { id: "req-2", ideaId: "idea-b", requestedQty: 30, status: "awaiting_layout", idea: { msku: "NQH2606-002" }, ...base },
    ];

    vi.mocked(db.productionRequest.findMany).mockResolvedValue(mockRequests);

    // First call fails, second succeeds
    vi.mocked(suggestProductionRuns)
      .mockRejectedValueOnce(new Error("DB error"))
      .mockResolvedValueOnce({
        runPlan: [],
        suggestions: [],
        remaining: new Map(),
      });

    vi.mocked(db.productionRequest.update).mockResolvedValue({
      ...mockRequests[1],
      status: "ready",
      layoutSnapshot: null,
    });

    const activated = await activateAwaitingRequests(["idea-a", "idea-b"]);

    // Only the second one should succeed
    expect(activated).toBe(1);
    expect(db.productionRequest.update).toHaveBeenCalledTimes(1);
  });
});
