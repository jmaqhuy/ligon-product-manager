/**
 * MSKU Generator
 * Format: {abbreviation}{yymm}-{3-digit sequence}
 * Example: NQH2601-005
 */

import { db } from "./db";

/**
 * Generate the next MSKU for a user
 */
export async function generateMsku(
  nameAbbreviation: string,
  date?: Date
): Promise<string> {
  const now = date || new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `${nameAbbreviation}${yy}${mm}-`;

  // Find the latest MSKU with this prefix
  const latestIdea = await db.idea.findFirst({
    where: {
      msku: {
        startsWith: prefix,
      },
    },
    orderBy: {
      msku: "desc",
    },
    select: {
      msku: true,
    },
  });

  let nextNumber = 1;
  if (latestIdea) {
    const currentNumber = parseInt(latestIdea.msku.split("-").pop() || "0", 10);
    nextNumber = currentNumber + 1;
  }

  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
}

/**
 * Validate MSKU format and uniqueness
 */
export async function validateMsku(msku: string, excludeId?: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  if (!msku || msku.trim().length === 0) {
    return { valid: false, error: "MSKU không được để trống" };
  }

  if (msku.length > 30) {
    return { valid: false, error: "MSKU không được quá 30 ký tự" };
  }

  // Check uniqueness
  const existing = await db.idea.findFirst({
    where: {
      msku: msku,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  if (existing) {
    return { valid: false, error: "MSKU này đã tồn tại" };
  }

  return { valid: true };
}
