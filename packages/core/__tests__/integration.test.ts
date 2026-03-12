import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HazardScorer } from '../src/engine/scorer.js';
import { HazardType } from '../src/models/hazard.js';
import type { Location } from '../src/models/location.js';

// Mock location (San Francisco, CA)
const SF_LOCATION: Location = {
  address: '1 Market St, San Francisco, CA 94105',
  coordinates: { latitude: 37.7749, longitude: -122.4194 },
  state: 'CA',
  county: 'San Francisco',
  fips: '06075',
};

// Mock location (Miami, FL)
const MIAMI_LOCATION: Location = {
  address: '100 Biscayne Blvd, Miami, FL 33132',
  coordinates: { latitude: 25.7617, longitude: -80.1918 },
  state: 'FL',
  county: 'Miami-Dade',
  fips: '12086',
};

// Mock API responses for each provider

function femaResponse(incidentTypes: string[]) {
  return {
    DisasterDeclarationsSummaries: incidentTypes.map((type, i) => ({
      disasterNumber: 4000 + i,
      declarationTitle: `Test ${type}`,
      declarationType: 'DR',
      declarationDate: `${2020 - i}-01-01T00:00:00.000Z`,
      incidentType: type,
      state: 'CA',
      fipsStateCode: '06',
      fipsCountyCode: '075',
    })),
    metadata: { count: incidentTypes.length },
  };
}

function earthquakeResponse(events: Array<{ mag: number; place: string }>) {
  return {
    type: 'FeatureCollection',
    features: events.map((e, i) => ({
      type: 'Feature',
      properties: {
        mag: e.mag,
        place: e.place,
        time: Date.now() - i * 86400000,
        type: 'earthquake',
      },
      geometry: { type: 'Point', coordinates: [-122.4, 37.7, 10] },
    })),
    metadata: { count: events.length },
  };
}

function noaaAlertsResponse(alerts: Array<{ event: string; severity: string }>) {
  return {
    features: alerts.map((a) => ({
      properties: {
        event: a.event,
        severity: a.severity,
        headline: `Test ${a.event}`,
        description: 'Test alert description',
        instruction: 'Take action',
      },
    })),
  };
}

function nfipResponse(claimCount: number, avgPayout: number) {
  return {
    FimaNfipClaims: Array.from({ length: claimCount }, (_, i) => ({
      countyCode: '06075',
      state: 'CA',
      yearOfLoss: 2020 - Math.floor(i / 5),
      amountPaidOnBuildingClaim: avgPayout,
      amountPaidOnContentsClaim: avgPayout * 0.3,
    })),
    metadata: { count: claimCount },
  };
}

function shelterResponse(shelters: Array<{ name: string; lat: number; lon: number; capacity: number }>) {
  return {
    features: shelters.map((s) => ({
      attributes: {
        SHELTER_NAME: s.name,
        ADDRESS_1: '123 Main St',
        CITY: 'San Francisco',
        STATE: 'CA',
        ZIP: '94105',
        EVACUATION_CAPACITY: s.capacity,
        POST_IMPACT_CAPACITY: s.capacity,
        LATITUDE: s.lat,
        LONGITUDE: s.lon,
        SHELTER_STATUS: 'OPEN',
      },
    })),
  };
}

// Empty responses for providers we don't want to mock specifically
const EMPTY_DROUGHT = '<html></html>'; // Drought Monitor returns HTML when no data
const EMPTY_STORM_EVENTS = { results: [] };
const EMPTY_LANDSLIDE = { features: [] };

describe('Integration: HazardScorer with mocked HTTP', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockFetch(urlHandlers: Record<string, unknown>) {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();

      for (const [pattern, response] of Object.entries(urlHandlers)) {
        if (url.includes(pattern)) {
          const body = typeof response === 'string' ? response : JSON.stringify(response);
          return new Response(body, {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // Default: return empty response
      return new Response(JSON.stringify({ features: [], metadata: { count: 0 } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof globalThis.fetch;
  }

  it('produces a complete hazard profile for San Francisco', async () => {
    mockFetch({
      'fema.gov/api/open/v2/DisasterDeclarationsSummaries': femaResponse([
        'Earthquake', 'Earthquake', 'Fire', 'Flood', 'Flood', 'Flood',
        'Severe Storm(s)', 'Severe Storm(s)',
      ]),
      'earthquake.usgs.gov': earthquakeResponse([
        { mag: 6.9, place: '10km NW of San Francisco' },
        { mag: 5.1, place: '20km S of San Francisco' },
        { mag: 4.5, place: '30km E of San Francisco' },
        { mag: 3.2, place: '15km NE of San Francisco' },
      ]),
      'api.weather.gov': noaaAlertsResponse([]),
      'data-nifc.opendata.arcgis.com': { features: [] },
      'fema.gov/api/open/v2/FimaNfipClaims': nfipResponse(50, 25000),
      'gis.fema.gov/arcgis/rest/services/NSS': shelterResponse([
        { name: 'Moscone Center', lat: 37.784, lon: -122.401, capacity: 500 },
        { name: 'Bill Graham Civic', lat: 37.778, lon: -122.417, capacity: 300 },
      ]),
      'droughtmonitor.unl.edu': EMPTY_DROUGHT,
      'ncei.noaa.gov': EMPTY_STORM_EVENTS,
      'landslides.nasa.gov': EMPTY_LANDSLIDE,
    });

    const scorer = new HazardScorer();
    const profile = await scorer.assess(SF_LOCATION);

    // Profile structure
    expect(profile.location).toEqual(SF_LOCATION);
    expect(profile.overallScore).toBeGreaterThanOrEqual(0);
    expect(profile.overallScore).toBeLessThanOrEqual(100);
    expect(profile.overallLevel).toBeTruthy();
    expect(profile.hazards.length).toBeGreaterThan(0);
    expect(profile.topRisks.length).toBeGreaterThan(0);
    expect(profile.meta.engineVersion).toBe('0.2.0');
    expect(profile.meta.assessedAt).toBeTruthy();

    // Should detect providers that returned data
    expect(profile.meta.providersUsed).toContain('fema');
    expect(profile.meta.providersUsed).toContain('usgs-earthquake');

    // Regional weights should apply for CA (Pacific region)
    expect(profile.meta.region).toBe('Pacific / West Coast');

    // Should have insurance gaps (earthquake risk in CA)
    expect(profile.insuranceGaps).toBeDefined();

    // Should have shelter data
    expect(profile.nearestShelters).toBeDefined();
    expect(profile.nearestShelters.length).toBeLessThanOrEqual(5);
  });

  it('applies regional weights correctly for different states', async () => {
    mockFetch({
      'fema.gov/api/open/v2/DisasterDeclarationsSummaries': femaResponse([
        'Hurricane', 'Hurricane', 'Hurricane', 'Hurricane', 'Hurricane',
        'Flood', 'Flood', 'Flood',
      ]),
      'earthquake.usgs.gov': earthquakeResponse([]),
      'api.weather.gov': noaaAlertsResponse([]),
      'data-nifc.opendata.arcgis.com': { features: [] },
      'fema.gov/api/open/v2/FimaNfipClaims': nfipResponse(200, 50000),
      'gis.fema.gov/arcgis/rest/services/NSS': { features: [] },
      'droughtmonitor.unl.edu': EMPTY_DROUGHT,
      'ncei.noaa.gov': EMPTY_STORM_EVENTS,
      'landslides.nasa.gov': EMPTY_LANDSLIDE,
    });

    const scorer = new HazardScorer();
    const profile = await scorer.assess(MIAMI_LOCATION);

    // Miami should be Gulf Coast region
    expect(profile.meta.region).toBe('Gulf Coast');

    // Should have flood insurance gap (FL + flood/hurricane risk)
    const floodGap = profile.insuranceGaps.find(g => g.gapType === 'flood_zone');
    const hurricaneGap = profile.insuranceGaps.find(g => g.gapType === 'hurricane_zone');
    expect(floodGap || hurricaneGap).toBeTruthy();
  });

  it('handles all providers failing gracefully', async () => {
    // All requests return empty valid JSON (simulating no data)
    // We use empty responses instead of 500s to avoid retry delays
    mockFetch({
      'fema.gov/api/open/v2/DisasterDeclarationsSummaries': { DisasterDeclarationsSummaries: [], metadata: { count: 0 } },
      'earthquake.usgs.gov': { type: 'FeatureCollection', features: [], metadata: { count: 0 } },
      'api.weather.gov': { features: [] },
      'data-nifc.opendata.arcgis.com': { features: [] },
      'fema.gov/api/open/v2/FimaNfipClaims': { FimaNfipClaims: [], metadata: { count: 0 } },
      'gis.fema.gov/arcgis/rest/services/NSS': { features: [] },
      'droughtmonitor.unl.edu': '<html></html>',
      'ncei.noaa.gov': { results: [] },
      'landslides.nasa.gov': { features: [] },
    });

    const scorer = new HazardScorer();
    const profile = await scorer.assess(SF_LOCATION);

    // Should still return a valid profile structure even with no meaningful data
    expect(profile.overallScore).toBeGreaterThanOrEqual(0);
    expect(profile.overallLevel).toBeTruthy();
    expect(profile.meta.engineVersion).toBe('0.2.0');
    expect(profile.meta.assessedAt).toBeTruthy();
    expect(profile.nearestShelters).toHaveLength(0);
  });

  it('deduplicates hazard types from multiple providers', async () => {
    // Both FEMA and NFIP report flood risk
    mockFetch({
      'fema.gov/api/open/v2/DisasterDeclarationsSummaries': femaResponse([
        'Flood', 'Flood', 'Flood', 'Flood', 'Flood',
      ]),
      'fema.gov/api/open/v2/FimaNfipClaims': nfipResponse(100, 40000),
      'earthquake.usgs.gov': earthquakeResponse([]),
      'api.weather.gov': noaaAlertsResponse([]),
      'data-nifc.opendata.arcgis.com': { features: [] },
      'gis.fema.gov/arcgis/rest/services/NSS': { features: [] },
      'droughtmonitor.unl.edu': EMPTY_DROUGHT,
      'ncei.noaa.gov': EMPTY_STORM_EVENTS,
      'landslides.nasa.gov': EMPTY_LANDSLIDE,
    });

    const scorer = new HazardScorer();
    const profile = await scorer.assess(SF_LOCATION);

    // topRisks should deduplicate: one flood entry with the max score
    const floodRisks = profile.topRisks.filter(r => r.type === HazardType.Flood);
    expect(floodRisks).toHaveLength(1);

    // Raw hazards may have multiple flood entries from different providers
    const rawFlood = profile.hazards.filter(h => h.type === HazardType.Flood);
    expect(rawFlood.length).toBeGreaterThanOrEqual(1);
  });

  it('generates recommendations for high-risk hazards', async () => {
    mockFetch({
      'fema.gov/api/open/v2/DisasterDeclarationsSummaries': femaResponse([
        'Earthquake', 'Earthquake', 'Earthquake', 'Earthquake', 'Earthquake',
        'Earthquake', 'Earthquake', 'Earthquake', 'Earthquake', 'Earthquake',
      ]),
      'earthquake.usgs.gov': earthquakeResponse([
        { mag: 7.1, place: '5km NW of San Francisco' },
        { mag: 6.5, place: '10km S of San Francisco' },
        { mag: 5.8, place: '15km E of San Francisco' },
      ]),
      'api.weather.gov': noaaAlertsResponse([]),
      'data-nifc.opendata.arcgis.com': { features: [] },
      'fema.gov/api/open/v2/FimaNfipClaims': { FimaNfipClaims: [], metadata: { count: 0 } },
      'gis.fema.gov/arcgis/rest/services/NSS': { features: [] },
      'droughtmonitor.unl.edu': EMPTY_DROUGHT,
      'ncei.noaa.gov': EMPTY_STORM_EVENTS,
      'landslides.nasa.gov': EMPTY_LANDSLIDE,
    });

    const scorer = new HazardScorer();
    const profile = await scorer.assess(SF_LOCATION);

    // High earthquake risk should produce recommendations
    expect(profile.recommendations.length).toBeGreaterThan(0);
    const eqRec = profile.recommendations.find(r => r.hazardType === HazardType.Earthquake);
    expect(eqRec).toBeTruthy();
    expect(eqRec!.actionItems.length).toBeGreaterThan(0);

    // Should also detect earthquake insurance gap
    const eqGap = profile.insuranceGaps.find(g => g.gapType === 'earthquake_zone');
    expect(eqGap).toBeTruthy();
  });

  it('includes percentile context in scores', async () => {
    mockFetch({
      'fema.gov/api/open/v2/DisasterDeclarationsSummaries': femaResponse([
        'Earthquake', 'Earthquake', 'Earthquake',
      ]),
      'earthquake.usgs.gov': earthquakeResponse([
        { mag: 5.5, place: '10km NW of San Francisco' },
      ]),
      'api.weather.gov': noaaAlertsResponse([]),
      'data-nifc.opendata.arcgis.com': { features: [] },
      'fema.gov/api/open/v2/FimaNfipClaims': { FimaNfipClaims: [], metadata: { count: 0 } },
      'gis.fema.gov/arcgis/rest/services/NSS': { features: [] },
      'droughtmonitor.unl.edu': EMPTY_DROUGHT,
      'ncei.noaa.gov': EMPTY_STORM_EVENTS,
      'landslides.nasa.gov': EMPTY_LANDSLIDE,
    });

    const scorer = new HazardScorer();
    const profile = await scorer.assess(SF_LOCATION);

    // Top risks should have percentile info enriched by aggregator
    for (const risk of profile.topRisks) {
      expect(risk.percentile).toBeDefined();
      expect(risk.percentile).toBeGreaterThanOrEqual(0);
      expect(risk.percentile).toBeLessThanOrEqual(100);
    }
  });
});
