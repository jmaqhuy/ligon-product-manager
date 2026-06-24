import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// PATCH /api/users/me - Update my settings
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { avatarUrl, notificationSettings } = body;

    const updatedUser = await db.user.update({
      where: { id: session.user.id },
      data: {
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
        notificationSettings: notificationSettings !== undefined ? JSON.stringify(notificationSettings) : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        avatarUrl: updatedUser.avatarUrl,
        notificationSettings: updatedUser.notificationSettings,
      }
    });
  } catch (error) {
    console.error("PATCH /api/users/me error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
