import type { HazardScore, RiskLevel } from './hazard.js';
import type { Location } from './location.js';

export interface HazardProfile {
  location: Location;
  /** Composite risk score 0-100 */
  overallScore: number;
  overallLevel: RiskLevel;
  /** National percentile for the composite score */
  overallPercentile?: number;
  overallPercentileContext?: string;
  /** Individual hazard assessments */
  hazards: HazardScore[];
  /** Top risks sorted by score descending */
  topRisks: HazardScore[];
  /** Personalized preparation recommendations */
  recommendations: Recommendation[];
  /** Assessment metadata */
  meta: {
    assessedAt: string;
    engineVersion: string;
    providersUsed: string[];
    providerErrors: ProviderError[];
    /** Region used for weight adjustment (e.g., "Pacific / West Coast") */
    region?: string;
  };
}

export interface Recommendation {
  priority: 'critical' | 'high' | 'medium' | 'low';
  hazardType: string;
  title: string;
  description: string;
  actionItems: string[];
}

export interface ProviderError {
  providerId: string;
  error: string;
}
