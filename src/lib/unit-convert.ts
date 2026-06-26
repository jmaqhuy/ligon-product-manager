/**
 * Unit conversion helpers for Amazon FBA shipments.
 * Amazon requires dimensions in inches and weight in pounds.
 */

const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.45359237;

/** Convert centimeters to inches, rounded to 1 decimal place */
export function cmToIn(cm: number): number {
  return Math.round((cm / CM_PER_INCH) * 10) / 10;
}

/** Convert inches to centimeters, rounded to 1 decimal place */
export function inToCm(inches: number): number {
  return Math.round((inches * CM_PER_INCH) * 10) / 10;
}

/** Convert kilograms to pounds, rounded to 2 decimal places */
export function kgToLb(kg: number): number {
  return Math.round((kg / KG_PER_LB) * 100) / 100;
}

/** Convert pounds to kilograms, rounded to 2 decimal places */
export function lbToKg(lb: number): number {
  return Math.round((lb * KG_PER_LB) * 100) / 100;
}

/** Format a dimension pair: cm (inches) */
export function formatDimension(cm: number | null | undefined): string {
  if (cm == null) return "—";
  return `${cm} cm (${cmToIn(cm)} in)`;
}

/** Format a weight pair: kg (lbs) */
export function formatWeight(kg: number | null | undefined): string {
  if (kg == null) return "—";
  return `${kg} kg (${kgToLb(kg)} lb)`;
}
