import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/dashboard/source-link-stats
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all ideas with source_links
    const ideas = await db.idea.findMany({
      select: {
        id: true,
        msku: true,
        sourceLinks: true,
        status: true,
        amazonListing: { select: { itemName: true, sku: true } },
      },
    });

    // Parse source_links and aggregate
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const linkMap: Record<string, any> = {};

    for (const idea of ideas) {
      let links: string[] = [];
      try {
        links = JSON.parse(idea.sourceLinks || "[]");
      } catch {
        continue;
      }

      for (const link of links) {
        if (!link) continue;
        // Normalize: strip query strings to get base URL
        let baseUrl = link;
        try {
          const url = new URL(link);
          baseUrl = url.origin + url.pathname;
        } catch {
          // Keep as-is if not a valid URL
        }

        if (!linkMap[baseUrl]) {
          linkMap[baseUrl] = {
            url: baseUrl,
            ideaCount: 0,
            ideas: [],
          };
        }

        linkMap[baseUrl].ideaCount++;
        if (!linkMap[baseUrl].ideas.find((i: any) => i.id === idea.id)) {
          linkMap[baseUrl].ideas.push({
            id: idea.id,
            msku: idea.msku,
            title: idea.amazonListing?.itemName || idea.amazonListing?.sku || idea.msku,
            status: idea.status,
          });
        }
      }
    }

    // Sort by idea count descending
    const result = Object.values(linkMap).sort(
      (a: any, b: any) => b.ideaCount - a.ideaCount
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/dashboard/source-link-stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
