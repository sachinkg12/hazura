import type { HazardScore, HazardType, RiskLevel } from '../models/hazard.js';
import { scoreToLevel } from '../models/hazard.js';
import type { Recommendation } from '../models/profile.js';
import { normalizeWeights, DEFAULT_WEIGHTS } from './weights.js';
import { getScorePercentile, getPercentileContext } from './percentiles.js';

export interface AggregateResult {
  overallScore: number;
  overallLevel: RiskLevel;
  overallPercentile: number;
  overallPercentileContext: string;
  topRisks: HazardScore[];
  recommendations: Recommendation[];
}

const PREPARATION_TIPS: Record<string, { title: string; items: string[] }> = {
  flood: {
    title: 'Flood Preparedness',
    items: [
      'Know your flood zone and evacuation routes',
      'Consider flood insurance (not covered by standard homeowners)',
      'Keep important documents in waterproof containers',
      'Have sandbags and a sump pump ready if in a high-risk area',
      'Never drive through flooded roads',
    ],
  },
  earthquake: {
    title: 'Earthquake Preparedness',
    items: [
      'Secure heavy furniture and water heaters to walls',
      'Keep an earthquake kit: water, food, flashlight, first aid',
      'Identify safe spots in each room (under sturdy furniture)',
      'Know how to shut off gas, water, and electricity',
      'Practice Drop, Cover, and Hold On drills',
    ],
  },
  wildfire: {
    title: 'Wildfire Preparedness',
    items: [
      'Create defensible space: clear vegetation 30ft from structures',
      'Use fire-resistant building materials where possible',
      'Have a go-bag packed and evacuation plan ready',
      'Sign up for local emergency alerts',
      'Know multiple evacuation routes from your area',
    ],
  },
  hurricane: {
    title: 'Hurricane Preparedness',
    items: [
      'Install storm shutters or have plywood pre-cut for windows',
      'Stock 3-7 days of water, food, and medications',
      'Know your evacuation zone and routes',
      'Trim trees and secure outdoor items before hurricane season',
      'Keep important documents in a waterproof safe',
    ],
  },
  tornado: {
    title: 'Tornado Preparedness',
    items: [
      'Identify your safe room (interior room on lowest floor)',
      'Have a weather radio with backup batteries',
      'Practice tornado drills with your household',
      'Keep shoes and a flashlight near your bed',
      'Sign up for local tornado warning alerts',
    ],
  },
  severe_storm: {
    title: 'Severe Storm Preparedness',
    items: [
      'Have a battery-powered weather radio',
      'Keep a basic emergency kit with flashlight and first aid',
      'Know the difference between watches and warnings',
      'Have a plan for power outages lasting 24-72 hours',
    ],
  },
  winter: {
    title: 'Winter Storm Preparedness',
    items: [
      'Insulate pipes and know how to prevent freezing',
      'Keep extra blankets, warm clothing, and heating fuel',
      'Stock de-icing salt and snow removal equipment',
      'Keep your car winter-ready: antifreeze, chains, emergency kit',
    ],
  },
};

export class HazardAggregator {
  private weights: Partial<Record<HazardType, number>>;

  constructor(weights?: Partial<Record<HazardType, number>>) {
    this.weights = weights ?? DEFAULT_WEIGHTS;
  }

  aggregate(scores: HazardScore[]): AggregateResult {
    if (scores.length === 0) {
      return {
        overallScore: 0,
        overallLevel: 'very_low',
        overallPercentile: 0,
        overallPercentileContext: 'Lower risk than 100% of US locations',
        topRisks: [],
        recommendations: [],
      };
    }

    // For hazards with multiple scores (e.g. FEMA + NOAA both report hurricane),
    // take the maximum score per hazard type
    const bestByType = new Map<string, HazardScore>();
    for (const score of scores) {
      const existing = bestByType.get(score.type);
      if (!existing || score.score > existing.score) {
        bestByType.set(score.type, score);
      }
    }

    const uniqueScores = Array.from(bestByType.values());
    const activeTypes = uniqueScores.map((s) => s.type);
    const normalized = normalizeWeights(this.weights, activeTypes);

    // Weighted average
    let overallScore = 0;
    for (const score of uniqueScores) {
      overallScore += score.score * (normalized[score.type] || 0);
    }
    overallScore = Math.round(overallScore);

    // Enrich each score with percentile context
    for (const score of uniqueScores) {
      score.percentile = getScorePercentile(score.score, score.type);
      score.percentileContext = getPercentileContext(score.score, score.type);
    }

    // Sort by score descending for top risks
    const topRisks = [...uniqueScores].sort((a, b) => b.score - a.score);

    // Generate recommendations for hazards with score >= 20
    const recommendations: Recommendation[] = topRisks
      .filter((s) => s.score >= 20)
      .map((s) => {
        const tips = PREPARATION_TIPS[s.type];
        const priority =
          s.score >= 80 ? 'critical' : s.score >= 60 ? 'high' : s.score >= 40 ? 'medium' : 'low';

        return {
          priority,
          hazardType: s.type,
          title: tips?.title ?? `${s.type} Preparedness`,
          description: s.description,
          actionItems: tips?.items ?? ['Review local emergency management resources'],
        };
      });

    return {
      overallScore,
      overallLevel: scoreToLevel(overallScore),
      overallPercentile: getScorePercentile(overallScore),
      overallPercentileContext: getPercentileContext(overallScore),
      topRisks,
      recommendations,
    };
  }
}
