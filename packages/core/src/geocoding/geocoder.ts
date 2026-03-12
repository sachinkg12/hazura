import type { Location } from '../models/location.js';
import { fetchJson } from '../utils/http.js';

interface CensusGeocodingResult {
  result: {
    addressMatches: Array<{
      matchedAddress: string;
      coordinates: { x: number; y: number };
      addressComponents: {
        state: string;
        county: string;
      };
      geographies?: {
        Counties?: Array<{ GEOID: string }>;
      };
    }>;
  };
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    state?: string;
    county?: string;
    city?: string;
    town?: string;
    village?: string;
  };
}

/**
 * Geocode an address using the US Census Bureau Geocoding API.
 * Falls back to Nominatim (OpenStreetMap) for city/region-level queries.
 * Free, no API key required.
 */
export async function geocodeAddress(address: string): Promise<Location> {
  // Try Census Bureau first (best for street addresses)
  try {
    const result = await geocodeWithCensus(address);
    if (result) return result;
  } catch {
    // Census failed, try fallback
  }

  // Fallback: Nominatim for city-level or partial queries
  try {
    const result = await geocodeWithNominatim(address);
    if (result) return result;
  } catch {
    // Both failed
  }

  throw new Error(`Could not find address: "${address}". Please try a US street address or city name (e.g., "San Jose, CA" or "123 Main St, San Jose, CA 95112").`);
}

async function geocodeWithCensus(address: string): Promise<Location | null> {
  const encoded = encodeURIComponent(address);
  const url = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encoded}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;

  const data = await fetchJson<CensusGeocodingResult>(url, { timeout: 15_000 });

  const matches = data.result.addressMatches;
  if (matches.length === 0) return null;

  const match = matches[0];
  const fips = match.geographies?.Counties?.[0]?.GEOID;

  return {
    address: match.matchedAddress,
    coordinates: {
      latitude: match.coordinates.y,
      longitude: match.coordinates.x,
    },
    state: match.addressComponents.state,
    county: match.addressComponents.county,
    fips,
  };
}

async function geocodeWithNominatim(address: string): Promise<Location | null> {
  const encoded = encodeURIComponent(address);
  const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&countrycodes=us&limit=1&addressdetails=1`;

  const data = await fetchJson<NominatimResult[]>(url, { timeout: 15_000 });

  if (data.length === 0) return null;

  const match = data[0];
  const lat = parseFloat(match.lat);
  const lon = parseFloat(match.lon);

  const state = match.address.state || '';
  const county = match.address.county?.replace(' County', '') || '';
  const city = match.address.city || match.address.town || match.address.village || '';

  // Build a readable address
  const displayAddress = match.display_name.split(',').slice(0, 3).join(',').trim();

  // Try to get FIPS code via Census geocoder using coordinates
  let fips: string | undefined;
  try {
    const fipsUrl = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${lon}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&format=json`;
    const fipsData = await fetchJson<{ result: { geographies: { Counties?: Array<{ GEOID: string }> } } }>(fipsUrl, { timeout: 10_000 });
    fips = fipsData.result.geographies.Counties?.[0]?.GEOID;
  } catch {
    // FIPS lookup failed, continue without it
  }

  return {
    address: displayAddress,
    coordinates: { latitude: lat, longitude: lon },
    state,
    county: county || city,
    fips,
  };
}
