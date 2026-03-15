import { BaseProvider } from './base.provider.js';
import { HazardType, scoreToLevel, type HazardScore } from '../models/hazard.js';
import type { Location } from '../models/location.js';
import { fetchJson } from '../utils/http.js';

interface HazardCastPrediction {
  fips: string;
  county: string;
  state: string;
  yearMonth: string;
  riskScore: number;
  modelType: string;
  warning?: string;
  topFactors: Record<string, number>;
  seasonality: Record<string, boolean>;
}

/**
 * Provider for HazardCast ML predictions.
 *
 * Calls the HazardCast Java API to get XGBoost-based disaster declaration
 * probability for a county. This is a 90-day-ahead prediction trained on
 * 966K county-month feature vectors with 43 features including multi-hazard
 * cascade interaction effects.
 *
 * Gracefully degrades if HazardCast API is unavailable — BaseProvider
 * catches errors and returns empty array.
 */
export class HazardCastProvider extends BaseProvider {
  readonly id = 'hazardcast-ml';
  readonly name = 'HazardCast ML Prediction';
  readonly hazardTypes = [
    HazardType.Flood,
    HazardType.Earthquake,
    HazardType.Wildfire,
    HazardType.Hurricane,
    HazardType.Tornado,
    HazardType.SevereStorm,
    HazardType.Winter,
    HazardType.Drought,
  ];

  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:8080') {
    super();
    this.baseUrl = baseUrl;
  }

  protected async assess(location: Location): Promise<HazardScore[]> {
    if (!location.fips) {
      return [];
    }

    const prediction = await fetchJson<HazardCastPrediction>(
      `${this.baseUrl}/api/predict/${location.fips}`,
      { timeout: 5_000, retries: 1 },
    );

    const probability = prediction.riskScore;
    // Convert probability (0-1) to score (0-100)
    const score = Math.round(probability * 100);

    const description = buildDescription(probability, prediction);

    return [
      {
        type: HazardType.SevereStorm, // composite multi-hazard prediction
        score,
        level: scoreToLevel(score),
        description,
        rawData: {
          probability,
          modelType: prediction.modelType,
          yearMonth: prediction.yearMonth,
          warning: prediction.warning,
          topFactors: prediction.topFactors,
          cascadeAware: true,
        },
        source: {
          name: 'HazardCast ML',
          url: 'https://github.com/sachinkg12/hazardcast',
          lastUpdated: prediction.yearMonth,
        },
      },
    ];
  }
}

function buildDescription(probability: number, prediction: HazardCastPrediction): string {
  const pct = (probability * 100).toFixed(1);
  const county = prediction.county || prediction.fips;

  if (probability >= 0.7) {
    return `HazardCast ML model predicts ${pct}% probability of a FEMA disaster declaration in ${county} within 90 days. Very high risk.`;
  }
  if (probability >= 0.4) {
    return `HazardCast ML model predicts ${pct}% probability of a FEMA disaster declaration in ${county} within 90 days. Elevated risk.`;
  }
  if (probability >= 0.15) {
    return `HazardCast ML model predicts ${pct}% probability of a FEMA disaster declaration in ${county} within 90 days. Moderate risk.`;
  }
  return `HazardCast ML model predicts ${pct}% probability of a FEMA disaster declaration in ${county} within 90 days. Low risk.`;
}
