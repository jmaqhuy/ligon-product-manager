import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { suggestProductionRuns } from "@/lib/production-layout-engine";

// GET /api/production-layouts/suggest - Get production run suggestions
// Query: ?ideaIds=id1,id2,id3&qtys=100,50,30
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    if (role !== "manager" && role !== "boss") {
      return NextResponse.json(
        { error: "Bạn không có quyền xem gợi ý sản xuất" },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const ideaIdsParam = searchParams.get("ideaIds");
    const qtysParam = searchParams.get("qtys");

    if (!ideaIdsParam || !qtysParam) {
      return NextResponse.json(
        { error: "Thiếu ideaIds hoặc qtys" },
        { status: 400 }
      );
    }

    const ideaIds = ideaIdsParam.split(",").map((s) => s.trim()).filter(Boolean);
    const qtys = qtysParam.split(",").map((s) => parseInt(s.trim(), 10));

    if (ideaIds.length === 0 || qtys.length === 0 || ideaIds.length !== qtys.length) {
      return NextResponse.json(
        { error: "Số lượng ideaIds và qtys không khớp" },
        { status: 400 }
      );
    }

    // Build requirements map
    const requirements = new Map<string, number>();
    for (let i = 0; i < ideaIds.length; i++) {
      if (!isNaN(qtys[i]) && qtys[i] > 0) {
        requirements.set(ideaIds[i], qtys[i]);
      }
    }

    if (requirements.size === 0) {
      return NextResponse.json(
        { error: "Không có yêu cầu hợp lệ" },
        { status: 400 }
      );
    }

    const result = await suggestProductionRuns(requirements);

    // Convert Map to object for JSON serialization
    const remainingObj: Record<string, number> = {};
    for (const [key, value] of result.remaining) {
      remainingObj[key] = value;
    }

    return NextResponse.json({
      runPlan: result.runPlan,
      suggestions: result.suggestions,
      remaining: remainingObj,
      computedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GET /api/production-layouts/suggest error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
