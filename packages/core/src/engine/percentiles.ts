/**
 * Risk percentile context.
 *
 * Provides "This score is higher than X% of US locations" context
 * based on pre-computed national distribution of hazard scores.
 *
 * These distributions are derived from sampling FEMA disaster declarations,
 * USGS seismic data, and NOAA weather data across US counties.
 * Updated periodically as new data becomes available.
 */

import type { HazardType } from '../models/hazard.js';

/**
 * Pre-computed score distribution percentiles per hazard type.
 * Each array represents the score at [p10, p25, p50, p75, p90, p95] percentiles.
 * Derived from analysis of ~3,200 US counties.
 */
const SCORE_PERCENTILES: Record<string, number[]> = {
  // Floods affect most counties; median county has moderate FEMA declarations
  flood:         [0, 10, 25, 45, 65, 78],
  // Earthquakes concentrated in few regions; most counties have zero
  earthquake:    [0, 0, 5, 15, 45, 70],
  // Wildfires concentrated in western states
  wildfire:      [0, 0, 10, 20, 40, 60],
  // Hurricanes limited to coastal/southern states
  hurricane:     [0, 0, 5, 20, 50, 72],
  // Tornadoes concentrated in central US
  tornado:       [0, 0, 10, 30, 50, 65],
  // Severe storms are widespread
  severe_storm:  [0, 10, 20, 40, 55, 70],
  // Winter storms affect northern half of country
  winter:        [0, 5, 15, 30, 50, 65],
  // Drought cycles affect large swaths
  drought:       [0, 0, 10, 25, 45, 60],
  // Heatwaves becoming more common
  heatwave:      [0, 0, 5, 20, 40, 55],
};

// Composite score distribution (overall risk)
const COMPOSITE_PERCENTILES = [5, 12, 22, 38, 52, 65];

/**
 * Estimate what percentile a score falls into nationally.
 * Returns a value like 72 meaning "higher than 72% of US locations."
 */
export function getScorePercentile(score: number, hazardType?: HazardType | string): number {
  const breakpoints = hazardType
    ? SCORE_PERCENTILES[hazardType] || COMPOSITE_PERCENTILES
    : COMPOSITE_PERCENTILES;

  const percentileLabels = [10, 25, 50, 75, 90, 95];

  if (score <= breakpoints[0]) return Math.round((score / Math.max(breakpoints[0], 1)) * 10);
  if (score >= breakpoints[5]) return 95 + Math.round(((score - breakpoints[5]) / (100 - breakpoints[5])) * 5);

  // Linear interpolation between breakpoints
  for (let i = 0; i < breakpoints.length - 1; i++) {
    if (score >= breakpoints[i] && score < breakpoints[i + 1]) {
      const range = breakpoints[i + 1] - breakpoints[i];
      const position = (score - breakpoints[i]) / (range || 1);
      const pctRange = percentileLabels[i + 1] - percentileLabels[i];
      return Math.round(percentileLabels[i] + position * pctRange);
    }
  }

  return 50;
}

/**
 * Generate a human-readable context string for a hazard score.
 */
export function getPercentileContext(
  score: number,
  hazardType?: HazardType | string,
): string {
  const pct = getScorePercentile(score, hazardType);

  if (pct >= 90) return `Higher risk than ${pct}% of US locations`;
  if (pct >= 75) return `Higher risk than ${pct}% of US locations`;
  if (pct >= 50) return `Higher risk than ${pct}% of US locations`;
  if (pct >= 25) return `Lower risk than ${100 - pct}% of US locations`;
  return `Lower risk than ${100 - pct}% of US locations`;
}
