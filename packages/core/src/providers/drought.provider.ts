import { BaseProvider } from './base.provider.js';
import { HazardType, scoreToLevel, type HazardScore } from '../models/hazard.js';
import type { Location } from '../models/location.js';
import { fetchJson } from '../utils/http.js';

interface DroughtArea {
  FIPS: string;
  State: string;
  County: string;
  None: number;
  D0: number;
  D1: number;
  D2: number;
  D3: number;
  D4: number;
  ValidStart: string;
}

/**
 * USDA Drought Monitor provider.
 * Uses the US Drought Monitor API for current drought conditions by county.
 * Free, no API key required.
 */
export class DroughtProvider extends BaseProvider {
  readonly id = 'usda-drought';
  readonly name = 'USDA Drought Monitor';
  readonly hazardTypes = [HazardType.Drought];

  protected async assess(location: Location): Promise<HazardScore[]> {
    if (!location.fips) {
      return [];
    }

    // USDA Drought Monitor API — county-level drought data
    const url = `https://usdm.unl.edu/DmData/DataTables.aspx/ReturnTabularDMAreaPercent_county?aession=${encodeURIComponent(location.fips)}&statstype=1`;

    let droughtData: DroughtArea[];
    try {
      // The USDA API returns data as { d: JSON string }
      const raw = await fetchJson<{ d: string }>(url);
      droughtData = JSON.parse(raw.d) as DroughtArea[];
    } catch {
      // Fallback: try the comprehensive statistics endpoint
      try {
        const fallbackUrl = `https://usdm.unl.edu/DmData/DataTables.aspx/ReturnTabularDMAreaPercent_state?aession=${encodeURIComponent(location.state || '')}&statstype=1`;
        const raw = await fetchJson<{ d: string }>(fallbackUrl);
        droughtData = JSON.parse(raw.d) as DroughtArea[];
      } catch {
        return [];
      }
    }

    if (!droughtData || droughtData.length === 0) {
      return [];
    }

    // Use the most recent entry
    const latest = droughtData[droughtData.length - 1];

    // Drought severity scoring:
    // D0 (Abnormally Dry) = 10pts, D1 (Moderate) = 25pts, D2 (Severe) = 50pts,
    // D3 (Extreme) = 75pts, D4 (Exceptional) = 100pts
    // Weight by percentage of county area affected
    const score = Math.min(100, Math.round(
      (latest.D0 || 0) * 0.10 +
      (latest.D1 || 0) * 0.25 +
      (latest.D2 || 0) * 0.50 +
      (latest.D3 || 0) * 0.75 +
      (latest.D4 || 0) * 1.00
    ));

    const droughtLevel =
      (latest.D4 || 0) > 0 ? 'exceptional' :
      (latest.D3 || 0) > 0 ? 'extreme' :
      (latest.D2 || 0) > 0 ? 'severe' :
      (latest.D1 || 0) > 0 ? 'moderate' :
      (latest.D0 || 0) > 0 ? 'abnormally dry' : 'none';

    const totalDrought = (latest.D0 || 0) + (latest.D1 || 0) + (latest.D2 || 0) + (latest.D3 || 0) + (latest.D4 || 0);

    return [
      {
        type: HazardType.Drought,
        score,
        level: scoreToLevel(score),
        description: totalDrought > 0
          ? `${Math.round(totalDrought)}% of county area in drought conditions (worst level: ${droughtLevel}).`
          : 'No current drought conditions in this county.',
        source: {
          name: 'US Drought Monitor (USDA/NOAA/NDMC)',
          url: 'https://droughtmonitor.unl.edu/',
          lastUpdated: latest.ValidStart,
        },
        rawData: {
          none: latest.None,
          D0: latest.D0,
          D1: latest.D1,
          D2: latest.D2,
          D3: latest.D3,
          D4: latest.D4,
        },
      },
    ];
  }
}
