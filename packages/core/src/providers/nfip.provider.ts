import { BaseProvider } from './base.provider.js';
import { HazardType, scoreToLevel, type HazardScore } from '../models/hazard.js';
import type { Location } from '../models/location.js';
import { fetchJson } from '../utils/http.js';

interface NfipClaim {
  countyCode: string;
  state: string;
  yearOfLoss: number;
  amountPaidOnBuildingClaim: number;
  amountPaidOnContentsClaim: number;
}

interface NfipResponse {
  FimaNfipClaims: NfipClaim[];
  metadata: { count: number };
}

/**
 * FEMA National Flood Insurance Program (NFIP) claims provider.
 * Uses OpenFEMA API to fetch historical flood insurance claims by county.
 * Free, no API key required.
 */
export class NfipProvider extends BaseProvider {
  readonly id = 'fema-nfip';
  readonly name = 'FEMA NFIP Flood Insurance Claims';
  readonly hazardTypes = [HazardType.Flood];

  protected async assess(location: Location): Promise<HazardScore[]> {
    if (!location.fips) {
      return [];
    }

    const countyCode = location.fips;

    // Query NFIP claims aggregated by county
    const filter = `countyCode eq '${countyCode}'`;
    const url = `https://www.fema.gov/api/open/v2/FimaNfipClaims?$filter=${encodeURIComponent(filter)}&$select=yearOfLoss,amountPaidOnBuildingClaim,amountPaidOnContentsClaim&$top=1000&$orderby=yearOfLoss desc`;

    let claims: NfipClaim[];
    try {
      const data = await fetchJson<NfipResponse>(url, { timeout: 15000 });
      claims = data.FimaNfipClaims || [];
    } catch {
      return [];
    }

    if (claims.length === 0) {
      return [];
    }

    // Calculate total claims and total payout
    const totalClaims = claims.length;
    const totalPayout = claims.reduce(
      (sum, c) => sum + (c.amountPaidOnBuildingClaim || 0) + (c.amountPaidOnContentsClaim || 0),
      0,
    );

    // Count recent claims (last 10 years)
    const currentYear = new Date().getFullYear();
    const recentClaims = claims.filter(c => c.yearOfLoss >= currentYear - 10).length;

    // Scoring based on claims volume and payouts:
    // Claims component (0-60): log scale of total claims
    const claimsScore = Math.min(60, Math.round(15 * Math.log2(totalClaims + 1)));

    // Payout component (0-20): log scale of total dollars paid
    const payoutScore = totalPayout > 0
      ? Math.min(20, Math.round(3 * Math.log10(totalPayout)))
      : 0;

    // Recency component (0-20): are claims increasing recently?
    const recencyScore = Math.min(20, Math.round(10 * Math.log2(recentClaims + 1)));

    const score = Math.min(100, claimsScore + payoutScore + recencyScore);

    const formattedPayout = totalPayout >= 1_000_000
      ? `$${(totalPayout / 1_000_000).toFixed(1)}M`
      : `$${(totalPayout / 1_000).toFixed(0)}K`;

    return [
      {
        type: HazardType.Flood,
        score,
        level: scoreToLevel(score),
        description: `${totalClaims.toLocaleString()} flood insurance claims in this county (${formattedPayout} total payouts). ${recentClaims} claims in the last 10 years.`,
        source: {
          name: 'FEMA NFIP Claims',
          url: 'https://www.fema.gov/about/openfema/data-sets#nfip',
        },
        rawData: {
          totalClaims,
          recentClaims,
          totalPayout,
        },
      },
    ];
  }
}
