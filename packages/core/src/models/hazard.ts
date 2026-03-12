export enum HazardType {
  Flood = 'flood',
  Earthquake = 'earthquake',
  Wildfire = 'wildfire',
  Hurricane = 'hurricane',
  Tornado = 'tornado',
  SevereStorm = 'severe_storm',
  Winter = 'winter',
  Drought = 'drought',
  Heatwave = 'heatwave',
}

export type RiskLevel = 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';

export interface HazardScore {
  type: HazardType;
  /** Normalized score 0-100 */
  score: number;
  level: RiskLevel;
  /** Human-readable explanation */
  description: string;
  /** National percentile (0-100): "higher than X% of US locations" */
  percentile?: number;
  /** Human-readable percentile context */
  percentileContext?: string;
  /** Raw data from the provider for transparency */
  rawData?: Record<string, unknown>;
  /** Data source attribution */
  source: {
    name: string;
    url: string;
    lastUpdated?: string;
  };
}

export function scoreToLevel(score: number): RiskLevel {
  if (score >= 80) return 'very_high';
  if (score >= 60) return 'high';
  if (score >= 40) return 'moderate';
  if (score >= 20) return 'low';
  return 'very_low';
}
