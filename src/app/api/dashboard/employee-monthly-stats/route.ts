import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, type Role } from "@/lib/permissions";

// GET /api/dashboard/employee-monthly-stats
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role as Role;
    const isAdmin = can(role, "view_all_stats");

    // Employee filter for non-admin
    const userFilter = isAdmin ? {} : { createdById: session.user.id };

    // Get all ideas with relevant fields
    const ideas = await db.idea.findMany({
      where: userFilter,
      select: {
        id: true,
        status: true,
        createdById: true,
        createdAt: true,
        createdBy: { select: { id: true, fullName: true, nameAbbreviation: true } },
        amazonListing: { select: { videoUrl: true, contentAPlusUrl: true } },
        etsyListing: { select: { videoUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group by employee and month
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statsMap: Record<string, any> = {};

    for (const idea of ideas) {
      const empKey = idea.createdBy.id;
      const month = idea.createdAt.toISOString().slice(0, 7); // YYYY-MM

      if (!statsMap[empKey]) {
        statsMap[empKey] = {
          employeeId: idea.createdBy.id,
          employeeName: idea.createdBy.fullName,
          employeeAbbr: idea.createdBy.nameAbbreviation,
          months: {},
        };
      }

      if (!statsMap[empKey].months[month]) {
        statsMap[empKey].months[month] = {
          ideasCreated: 0,
          ideasApproved: 0,
          photosDone: 0,
          videosDone: 0,
          contentAPlusDone: 0,
        };
      }

      const m = statsMap[empKey].months[month];
      m.ideasCreated++;
      if (idea.status === "approved") m.ideasApproved++;
      // Count photos done (photoStatus = approved means photos are done)
      // We track via amazon/etsy gallery images count or photo_status
      if (idea.amazonListing?.videoUrl) m.videosDone++;
      if (idea.etsyListing?.videoUrl) m.videosDone++;
      if (idea.amazonListing?.contentAPlusUrl) m.contentAPlusDone++;
    }

    // Removed unused photo data processing

    // Flatten to array, sort by employee name
    const result = Object.values(statsMap).sort((a: any, b: any) =>
      a.employeeName.localeCompare(b.employeeName)
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/dashboard/employee-monthly-stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
