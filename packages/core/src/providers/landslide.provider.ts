import { BaseProvider } from './base.provider.js';
import { HazardType, scoreToLevel, type HazardScore } from '../models/hazard.js';
import type { Location } from '../models/location.js';
import { fetchJson } from '../utils/http.js';

interface LandslideFeature {
  attributes: {
    OBJECTID: number;
    event_title: string;
    event_date: number;
    landslide_size: string;
    fatality_count: number;
    injury_count: number;
    country_name: string;
    state_name: string;
    source_name: string;
  };
}

interface LandslideResponse {
  features: LandslideFeature[];
}

// HazardType doesn't have Landslide, so we'll classify it under SevereStorm
// since landslides are often triggered by severe weather events.
// A future version could add a dedicated HazardType.Landslide.

/**
 * USGS Landslide Susceptibility / NASA Global Landslide Catalog provider.
 * Uses NASA's Cooperative Open Online Landslide Repository (COOLR) via ArcGIS.
 * Free, no API key required.
 */
export class LandslideProvider extends BaseProvider {
  readonly id = 'usgs-landslide';
  readonly name = 'USGS/NASA Landslide Data';
  readonly hazardTypes = [HazardType.SevereStorm];

  private readonly searchRadiusKm = 100;

  protected async assess(location: Location): Promise<HazardScore[]> {
    const { latitude, longitude } = location.coordinates;

    // Query NASA COOLR landslide catalog via ArcGIS REST API
    // This covers historical reported landslide events globally
    const geometry = JSON.stringify({
      x: longitude,
      y: latitude,
      spatialReference: { wkid: 4326 },
    });

    const radiusMeters = this.searchRadiusKm * 1000;
    const params = new URLSearchParams({
      geometry,
      geometryType: 'esriGeometryPoint',
      spatialRel: 'esriSpatialRelIntersects',
      distance: radiusMeters.toString(),
      units: 'esriSRUnit_Meter',
      outFields: 'event_title,event_date,landslide_size,fatality_count,injury_count,state_name',
      returnGeometry: 'false',
      f: 'json',
    });

    const url = `https://services.arcgis.com/hRUr1F8lE8Jq2uJo/arcgis/rest/services/Global_Landslide_Catalog/FeatureServer/0/query?${params}`;

    let events: LandslideFeature[];
    try {
      const data = await fetchJson<LandslideResponse>(url, { timeout: 15000 });
      events = data.features || [];
    } catch {
      return [];
    }

    if (events.length === 0) {
      return [];
    }

    // Count events and casualties
    const totalEvents = events.length;
    const totalFatalities = events.reduce(
      (sum, e) => sum + (e.attributes.fatality_count || 0), 0
    );
    const totalInjuries = events.reduce(
      (sum, e) => sum + (e.attributes.injury_count || 0), 0
    );

    // Size-based scoring
    const sizeWeights: Record<string, number> = {
      catastrophic: 5,
      'very_large': 4,
      large: 3,
      medium: 2,
      small: 1,
    };
    const weightedSize = events.reduce((sum, e) => {
      const size = e.attributes.landslide_size?.toLowerCase() || 'small';
      return sum + (sizeWeights[size] || 1);
    }, 0);

    // Scoring: event count (0-50) + size/severity (0-30) + casualties (0-20)
    const countScore = Math.min(50, Math.round(15 * Math.log2(totalEvents + 1)));
    const sizeScore = Math.min(30, Math.round(10 * Math.log2(weightedSize + 1)));
    const casualtyScore = Math.min(20, Math.round(10 * Math.log2(totalFatalities + totalInjuries + 1)));
    const score = Math.min(100, countScore + sizeScore + casualtyScore);

    return [
      {
        type: HazardType.SevereStorm,
        score,
        level: scoreToLevel(score),
        description: `${totalEvents} landslide event${totalEvents !== 1 ? 's' : ''} recorded within ${this.searchRadiusKm}km.${totalFatalities > 0 ? ` ${totalFatalities} fatalities reported.` : ''}`,
        source: {
          name: 'NASA/USGS Global Landslide Catalog',
          url: 'https://landslides.nasa.gov/',
        },
        rawData: {
          eventCount: totalEvents,
          fatalities: totalFatalities,
          injuries: totalInjuries,
        },
      },
    ];
  }
}
