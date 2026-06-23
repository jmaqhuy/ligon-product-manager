/**
 * Name abbreviation generator with collision handling
 * Used for generating unique abbreviations for MSKU
 */

/**
 * Remove Vietnamese diacritics from string
 */
export function removeDiacritics(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/**
 * Generate name abbreviation with collision handling
 * Priority order:
 * 1. First letter of each word: "Nguyễn Quốc Huy" → "NQH"
 * 2. Keep first letters of family+middle, full first name: → "NQHuy"
 * 3. Full middle name too: → "NQuocHuy"
 * 4. Full name no diacritics: → "NguyenQuocHuy"
 */
export function generateAbbreviationCandidates(fullName: string): string[] {
  const clean = removeDiacritics(fullName.trim());
  const parts = clean.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return [];
  if (parts.length === 1) return [parts[0]];

  const candidates: string[] = [];

  // 1. First letter of each word
  candidates.push(parts.map((p) => p[0].toUpperCase()).join(""));

  if (parts.length >= 2) {
    const lastName = parts.slice(0, -1); // All except last
    const firstName = parts[parts.length - 1]; // Last word

    // 2. First letters of family+middle + full first name
    const prefix2 = lastName.map((p) => p[0].toUpperCase()).join("");
    candidates.push(prefix2 + firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase());

    if (parts.length >= 3) {
      // 3. First letter of family + full middle + full first name
      const familyInitial = parts[0][0].toUpperCase();
      const middleParts = parts.slice(1, -1);
      const fullMiddle = middleParts
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join("");
      candidates.push(
        familyInitial + fullMiddle + firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
      );
    }

    // 4. Full name concatenated
    candidates.push(
      parts
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join("")
    );
  }

  return candidates;
}

/**
 * Find a unique abbreviation that doesn't conflict with existing ones
 */
export async function findUniqueAbbreviation(
  fullName: string,
  existingAbbreviations: string[]
): Promise<string> {
  const candidates = generateAbbreviationCandidates(fullName);

  for (const candidate of candidates) {
    if (!existingAbbreviations.includes(candidate)) {
      return candidate;
    }
  }

  // Fallback: add number suffix
  const baseName = candidates[candidates.length - 1] || removeDiacritics(fullName).replace(/\s+/g, "");
  let i = 2;
  while (existingAbbreviations.includes(`${baseName}${i}`)) {
    i++;
  }
  return `${baseName}${i}`;
}
