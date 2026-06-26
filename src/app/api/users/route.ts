import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { can, canManageUser, type Role } from "@/lib/permissions";
import { findUniqueAbbreviation } from "@/lib/name-abbreviation";
import { withRateLimit } from "@/lib/rate-limit-helper";

// GET /api/users - List all users
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await db.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        nameAbbreviation: true,
        role: true,
        status: true,
        startDate: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/users - Create new user
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: strict tier for user creation (sensitive operation)
    const { blocked } = withRateLimit(session.user.id, "POST", "/api/users");
    if (blocked) return blocked;

    const currentRole = session.user.role as Role;

    // Only manager/boss can create users
    if (!can(currentRole, "manage_employee")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { email, password, fullName, role } = body;

    // Validate required fields
    if (!email || !password || !fullName || !role) {
      return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
    }

    // Password min length
    if (password.length < 8) {
      return NextResponse.json({ error: "Mật khẩu phải có tối thiểu 8 ký tự" }, { status: 400 });
    }

    // Check role permissions
    if (role === "manager" && !can(currentRole, "manage_manager")) {
      return NextResponse.json({ error: "Bạn không có quyền tạo tài khoản Quản lý" }, { status: 403 });
    }

    if (role === "boss") {
      return NextResponse.json({ error: "Không thể tạo tài khoản Sếp" }, { status: 403 });
    }

    // Check email uniqueness
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email đã tồn tại" }, { status: 400 });
    }

    // Generate name abbreviation
    const activeAbbreviations = await db.user.findMany({
      where: { status: "active" },
      select: { nameAbbreviation: true },
    });
    const existingAbbrs = activeAbbreviations.map((u) => u.nameAbbreviation);
    const nameAbbreviation = await findUniqueAbbreviation(fullName, existingAbbrs);

    // Hash password
    const passwordHash = await hash(password, 12);

    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        nameAbbreviation,
        role,
        status: "active",
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        nameAbbreviation: true,
        role: true,
        status: true,
        startDate: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
