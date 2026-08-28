import { ColorBrandPrimary } from "@acme/design-tokens";

export const defaultSeriesColor = ColorBrandPrimary;

export function normalize(values: number[]): number[] {
  const max = Math.max(...values, 1);
  return values.map((v) => v / max);
}
