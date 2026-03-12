import type { HazardScore } from '../models/hazard.js';
import { HazardType } from '../models/hazard.js';

export interface InsuranceGap {
  hazardType: HazardType;
  riskLevel: string;
  riskScore: number;
  gapType: 'flood_zone' | 'earthquake_zone' | 'wildfire_zone' | 'hurricane_zone';
  title: string;
  description: string;
  recommendation: string;
  urgency: 'critical' | 'high' | 'medium';
}

/**
 * Detects potential insurance coverage gaps by cross-referencing
 * hazard scores with typical homeowner insurance exclusions.
 *
 * Standard homeowner insurance does NOT cover:
 * - Flood damage (requires separate NFIP or private flood policy)
 * - Earthquake damage (requires separate earthquake rider)
 * - Sometimes wildfire/hurricane deductibles are separate
 */
export function detectInsuranceGaps(hazardScores: HazardScore[]): InsuranceGap[] {
  const gaps: InsuranceGap[] = [];

  // Build a map of highest score per hazard type
  const scoreMap = new Map<HazardType, HazardScore>();
  for (const score of hazardScores) {
    const existing = scoreMap.get(score.type);
    if (!existing || score.score > existing.score) {
      scoreMap.set(score.type, score);
    }
  }

  // Check for flood insurance gap
  const floodScore = scoreMap.get(HazardType.Flood);
  if (floodScore && floodScore.score >= 30) {
    const urgency = floodScore.score >= 60 ? 'critical' : floodScore.score >= 40 ? 'high' : 'medium';
    gaps.push({
      hazardType: HazardType.Flood,
      riskLevel: floodScore.level,
      riskScore: floodScore.score,
      gapType: 'flood_zone',
      title: 'Flood Insurance Gap',
      description: `Your flood risk score is ${floodScore.score}/100. Standard homeowner insurance does NOT cover flood damage. You may need a separate flood policy through the NFIP (National Flood Insurance Program) or a private insurer.`,
      recommendation: floodScore.score >= 60
        ? 'Strongly recommended: Contact your insurer about NFIP flood coverage. Properties in high-risk flood zones may be required to carry flood insurance if they have a federally-backed mortgage.'
        : 'Consider adding flood insurance. Even moderate-risk areas account for 25% of all flood claims. NFIP policies start around $700/year.',
      urgency,
    });
  }

  // Check for earthquake insurance gap
  const earthquakeScore = scoreMap.get(HazardType.Earthquake);
  if (earthquakeScore && earthquakeScore.score >= 30) {
    const urgency = earthquakeScore.score >= 60 ? 'critical' : earthquakeScore.score >= 40 ? 'high' : 'medium';
    gaps.push({
      hazardType: HazardType.Earthquake,
      riskLevel: earthquakeScore.level,
      riskScore: earthquakeScore.score,
      gapType: 'earthquake_zone',
      title: 'Earthquake Insurance Gap',
      description: `Your earthquake risk score is ${earthquakeScore.score}/100. Standard homeowner insurance does NOT cover earthquake damage. You need a separate earthquake policy or endorsement.`,
      recommendation: earthquakeScore.score >= 60
        ? 'Strongly recommended: Add earthquake coverage through your insurer or the California Earthquake Authority (if in CA). Earthquake damage to foundations, walls, and personal property is excluded from standard policies.'
        : 'Consider earthquake insurance, especially if your home has a raised foundation or masonry construction. Deductibles are typically 10-20% of coverage amount.',
      urgency,
    });
  }

  // Check for wildfire insurance gap
  const wildfireScore = scoreMap.get(HazardType.Wildfire);
  if (wildfireScore && wildfireScore.score >= 40) {
    const urgency = wildfireScore.score >= 70 ? 'critical' : 'high';
    gaps.push({
      hazardType: HazardType.Wildfire,
      riskLevel: wildfireScore.level,
      riskScore: wildfireScore.score,
      gapType: 'wildfire_zone',
      title: 'Wildfire Coverage Risk',
      description: `Your wildfire risk score is ${wildfireScore.score}/100. While standard homeowner insurance may cover fire damage, insurers in high-risk wildfire areas have been canceling policies or dramatically increasing premiums.`,
      recommendation: wildfireScore.score >= 70
        ? 'Review your policy now: Many insurers are non-renewing policies in high-risk wildfire zones. Consider the FAIR Plan (state-backed insurer of last resort) as a backup. Document your property and create defensible space.'
        : 'Verify your current policy covers wildfire damage and review your deductible. Consider documenting property contents for claims purposes.',
      urgency,
    });
  }

  // Check for hurricane/wind insurance gap
  const hurricaneScore = scoreMap.get(HazardType.Hurricane);
  if (hurricaneScore && hurricaneScore.score >= 30) {
    const urgency = hurricaneScore.score >= 60 ? 'critical' : hurricaneScore.score >= 40 ? 'high' : 'medium';
    gaps.push({
      hazardType: HazardType.Hurricane,
      riskLevel: hurricaneScore.level,
      riskScore: hurricaneScore.score,
      gapType: 'hurricane_zone',
      title: 'Hurricane Deductible Warning',
      description: `Your hurricane risk score is ${hurricaneScore.score}/100. Many coastal policies have separate, higher hurricane/windstorm deductibles (typically 2-5% of insured value instead of a flat dollar amount).`,
      recommendation: hurricaneScore.score >= 60
        ? 'Review your hurricane deductible immediately. A $300,000 home with a 5% hurricane deductible means you pay the first $15,000 of damage out of pocket. Consider supplemental windstorm coverage.'
        : 'Check if your policy has a separate hurricane/named storm deductible. This is common in coastal states even for moderate-risk areas.',
      urgency,
    });
  }

  // Sort by urgency
  const urgencyOrder = { critical: 0, high: 1, medium: 2 };
  gaps.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

  return gaps;
}
