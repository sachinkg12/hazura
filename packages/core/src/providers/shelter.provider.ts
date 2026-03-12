import { BaseProvider } from './base.provider.js';
import { HazardType, scoreToLevel, type HazardScore } from '../models/hazard.js';
import type { Location } from '../models/location.js';
import { fetchJson } from '../utils/http.js';

interface ShelterFeature {
  attributes: {
    SHELTER_NAME: string;
    ADDRESS_1: string;
    CITY: string;
    STATE: string;
    ZIP: string;
    EVACUATION_CAPACITY: number;
    POST_IMPACT_CAPACITY: number;
    LATITUDE: number;
    LONGITUDE: number;
    SHELTER_STATUS: string;
  };
}

interface ShelterResponse {
  features: ShelterFeature[];
}

export interface NearestShelter {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  capacity: number;
  distanceKm: number;
  latitude: number;
  longitude: number;
}

/**
 * FEMA National Shelter System provider.
 * Finds nearest emergency shelters via FEMA ArcGIS services.
 * Free, no API key required.
 */
export class ShelterProvider extends BaseProvider {
  readonly id = 'fema-shelters';
  readonly name = 'FEMA National Shelter System';
  readonly hazardTypes = [HazardType.Flood, HazardType.Hurricane, HazardType.Tornado, HazardType.Wildfire];

  protected async assess(location: Location): Promise<HazardScore[]> {
    const shelters = await this.findNearestShelters(location, 100); // 100km radius

    // Shelter access score: more nearby shelters = lower risk (better preparedness)
    // 0 shelters in 100km = high concern, 5+ = well-covered
    const shelterCount = shelters.length;
    const nearestDistance = shelters.length > 0 ? shelters[0].distanceKm : Infinity;

    // Inverse scoring: fewer shelters / farther away = higher risk
    let accessScore: number;
    if (shelterCount === 0) {
      accessScore = 0; // No data, don't penalize
      return [];
    } else if (shelterCount >= 5 && nearestDistance < 20) {
      accessScore = 10; // Well covered
    } else if (shelterCount >= 3 && nearestDistance < 40) {
      accessScore = 25;
    } else if (shelterCount >= 1 && nearestDistance < 60) {
      accessScore = 40;
    } else {
      accessScore = 60; // Limited shelter access
    }

    const totalCapacity = shelters.reduce((sum, s) => sum + s.capacity, 0);

    return [
      {
        type: HazardType.Flood, // General shelter access applies to all hazards
        score: accessScore,
        level: scoreToLevel(accessScore),
        description: `${shelterCount} emergency shelter${shelterCount !== 1 ? 's' : ''} within 100km. Nearest: ${nearestDistance < 1 ? '<1' : Math.round(nearestDistance)}km away. Total capacity: ${totalCapacity.toLocaleString()}.`,
        source: {
          name: 'FEMA National Shelter System',
          url: 'https://gis.fema.gov/arcgis/rest/services/NSS/OpenShelters/MapServer',
        },
        rawData: {
          shelterCount,
          nearestDistanceKm: nearestDistance,
          totalCapacity,
          shelters: shelters.slice(0, 5), // Include top 5 nearest
        },
      },
    ];
  }

  /**
   * Find nearest shelters within a radius (km) of the location.
   * Returns shelters sorted by distance, closest first.
   */
  async findNearestShelters(location: Location, radiusKm: number = 100): Promise<NearestShelter[]> {
    const { latitude, longitude } = location.coordinates;

    // FEMA shelter ArcGIS REST API - query within radius
    // Using a bounding box approach since the API supports geometry queries
    const latDelta = radiusKm / 111; // ~111km per degree latitude
    const lonDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));

    const xmin = longitude - lonDelta;
    const ymin = latitude - latDelta;
    const xmax = longitude + lonDelta;
    const ymax = latitude + latDelta;

    const url = `https://gis.fema.gov/arcgis/rest/services/NSS/OpenShelters/MapServer/0/query?` +
      `geometry=${xmin},${ymin},${xmax},${ymax}` +
      `&geometryType=esriGeometryEnvelope` +
      `&spatialRel=esriSpatialRelIntersects` +
      `&outFields=SHELTER_NAME,ADDRESS_1,CITY,STATE,ZIP,EVACUATION_CAPACITY,POST_IMPACT_CAPACITY,LATITUDE,LONGITUDE,SHELTER_STATUS` +
      `&returnGeometry=false` +
      `&f=json`;

    let data: ShelterResponse;
    try {
      data = await fetchJson<ShelterResponse>(url, { timeout: 15000 });
    } catch {
      return [];
    }

    if (!data.features || data.features.length === 0) {
      return [];
    }

    const shelters: NearestShelter[] = data.features
      .filter(f => f.attributes.LATITUDE && f.attributes.LONGITUDE)
      .map(f => {
        const attr = f.attributes;
        const dist = haversineDistance(
          latitude, longitude,
          attr.LATITUDE, attr.LONGITUDE,
        );
        return {
          name: attr.SHELTER_NAME || 'Unknown Shelter',
          address: attr.ADDRESS_1 || '',
          city: attr.CITY || '',
          state: attr.STATE || '',
          zip: attr.ZIP || '',
          capacity: attr.EVACUATION_CAPACITY || attr.POST_IMPACT_CAPACITY || 0,
          distanceKm: Math.round(dist * 10) / 10,
          latitude: attr.LATITUDE,
          longitude: attr.LONGITUDE,
        };
      })
      .filter(s => s.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return shelters;
  }
}

/** Haversine distance between two coordinates in kilometers */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
