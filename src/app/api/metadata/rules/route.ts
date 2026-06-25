import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { handleApiError } from "@/lib/api-errors";

// GET /api/metadata/rules
// Cho phép tất cả user đã đăng nhập lấy danh sách rules (để validate ở frontend)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rules = await db.systemSetting.findMany();
    // Chuyển array thành object map để dễ dùng ở client
    const ruleMap: Record<string, string> = {};
    for (const r of rules) {
      ruleMap[r.key] = r.value;
    }

    // Default rules nếu db chưa có
    if (!ruleMap["idea_title_max_length"]) ruleMap["idea_title_max_length"] = "75";
    if (!ruleMap["idea_prompt_max_length"]) ruleMap["idea_prompt_max_length"] = "500";

    return NextResponse.json(ruleMap);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/metadata/rules
// Chỉ Boss/Manager được cập nhật
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || (session.user.role !== "boss" && session.user.role !== "manager")) {
      return NextResponse.json({ error: "Bạn không có quyền thực hiện thao tác này." }, { status: 403 });
    }

    const body = await req.json();
    const { updates } = body; // Expect { updates: { key: value, ... } }

    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(updates)) {
        await tx.systemSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value), description: `Dynamic rule for ${key}` },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
