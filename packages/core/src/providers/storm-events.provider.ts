import { BaseProvider } from './base.provider.js';
import { HazardType, scoreToLevel, type HazardScore } from '../models/hazard.js';
import type { Location } from '../models/location.js';
import { fetchJson } from '../utils/http.js';

interface StormEvent {
  event_type: string;
  year: number;
  injuries_direct: number;
  injuries_indirect: number;
  deaths_direct: number;
  deaths_indirect: number;
  damage_property: string;
  damage_crops: string;
  state_fips: string;
  cz_fips: string;
}

interface NOAAStormResponse {
  results: StormEvent[];
  count: number;
}

const EVENT_TYPE_MAP: Record<string, HazardType> = {
  'Tornado': HazardType.Tornado,
  'Hail': HazardType.SevereStorm,
  'Thunderstorm Wind': HazardType.SevereStorm,
  'Flash Flood': HazardType.Flood,
  'Flood': HazardType.Flood,
  'Hurricane': HazardType.Hurricane,
  'Hurricane (Typhoon)': HazardType.Hurricane,
  'Tropical Storm': HazardType.Hurricane,
  'Winter Storm': HazardType.Winter,
  'Ice Storm': HazardType.Winter,
  'Blizzard': HazardType.Winter,
  'Heavy Snow': HazardType.Winter,
  'Heat': HazardType.Heatwave,
  'Excessive Heat': HazardType.Heatwave,
  'Wildfire': HazardType.Wildfire,
  'Drought': HazardType.Drought,
};

/**
 * NOAA Storm Events Database provider.
 * Uses the NCEI Storm Events API for historical severe weather data by county.
 * Free, no API key required.
 */
export class StormEventsProvider extends BaseProvider {
  readonly id = 'noaa-storm-events';
  readonly name = 'NOAA Storm Events Database';
  readonly hazardTypes = [
    HazardType.Tornado,
    HazardType.SevereStorm,
    HazardType.Flood,
    HazardType.Hurricane,
    HazardType.Winter,
    HazardType.Heatwave,
  ];

  protected async assess(location: Location): Promise<HazardScore[]> {
    if (!location.fips) {
      return [];
    }

    const stateFips = location.fips.slice(0, 2);
    const countyFips = location.fips.slice(2);

    // Query last 20 years of storm events for this county
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 20;

    const url = `https://www.ncei.noaa.gov/access/monitoring/storm-events/api/v1/events?state_fips=${stateFips}&cz_fips=${countyFips}&begin_date=${startYear}-01-01&end_date=${currentYear}-12-31&limit=500`;

    let events: StormEvent[];
    try {
      const data = await fetchJson<NOAAStormResponse>(url, { timeout: 15000 });
      events = data.results || [];
    } catch {
      // NCEI API can be slow; degrade gracefully
      return [];
    }

    // Count events by hazard type
    const counts = new Map<HazardType, number>();
    const casualties = new Map<HazardType, number>();

    for (const event of events) {
      const hazardType = EVENT_TYPE_MAP[event.event_type];
      if (!hazardType) continue;

      counts.set(hazardType, (counts.get(hazardType) || 0) + 1);

      const eventCasualties =
        (event.deaths_direct || 0) + (event.deaths_indirect || 0) +
        (event.injuries_direct || 0) + (event.injuries_indirect || 0);
      casualties.set(hazardType, (casualties.get(hazardType) || 0) + eventCasualties);
    }

    // Normalize counts to 0-100: use log scale
    // 0 events = 0, 1-2 = 20, 5-10 = 40, 20-50 = 60, 100+ = 80+
    const normalize = (count: number, casualtyCount: number): number => {
      if (count === 0) return 0;
      const baseScore = Math.min(80, Math.round(20 * Math.log2(count + 1)));
      // Bonus for events with casualties (up to 20 extra)
      const casualtyBonus = Math.min(20, Math.round(10 * Math.log2(casualtyCount + 1)));
      return Math.min(100, baseScore + casualtyBonus);
    };

    const scores: HazardScore[] = [];

    for (const [hazardType, count] of counts) {
      const casualtyCount = casualties.get(hazardType) || 0;
      const score = normalize(count, casualtyCount);

      scores.push({
        type: hazardType,
        score,
        level: scoreToLevel(score),
        description: `${count} ${hazardType} event${count !== 1 ? 's' : ''} recorded in this county over the past 20 years.${casualtyCount > 0 ? ` ${casualtyCount} casualties reported.` : ''}`,
        source: {
          name: 'NOAA Storm Events Database',
          url: 'https://www.ncei.noaa.gov/access/monitoring/storm-events/',
        },
        rawData: {
          eventCount: count,
          casualties: casualtyCount,
          yearsAnalyzed: 20,
        },
      });
    }

    return scores;
  }
}
