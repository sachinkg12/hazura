import { describe, it, expect, vi } from 'vitest';
import { HazardScorer } from '../src/engine/scorer.js';
import { HazardType, scoreToLevel } from '../src/models/hazard.js';
import type { DataProvider } from '../src/models/provider.js';
import type { Location } from '../src/models/location.js';

const mockLocation: Location = {
  address: '123 Test St, San Francisco, CA',
  coordinates: { latitude: 37.7749, longitude: -122.4194 },
  state: 'CA',
  county: 'San Francisco',
  fips: '06075',
};

function createMockProvider(id: string, score: number, type = HazardType.Earthquake): DataProvider {
  return {
    id,
    name: `Mock ${id}`,
    hazardTypes: [type],
    fetchRisk: vi.fn().mockResolvedValue([
      {
        type,
        score,
        level: scoreToLevel(score),
        description: `Mock ${type} score`,
        source: { name: 'Mock', url: 'https://mock.com' },
      },
    ]),
  };
}

describe('HazardScorer', () => {
  it('runs all providers and returns a profile', async () => {
    const providers = [
      createMockProvider('mock-eq', 80, HazardType.Earthquake),
      createMockProvider('mock-flood', 40, HazardType.Flood),
    ];

    const scorer = new HazardScorer({ providers });
    const profile = await scorer.assess(mockLocation);

    expect(profile.location).toEqual(mockLocation);
    expect(profile.hazards).toHaveLength(2);
    expect(profile.overallScore).toBeGreaterThan(0);
    expect(profile.meta.providersUsed).toEqual(['mock-eq', 'mock-flood']);
    expect(profile.meta.providerErrors).toHaveLength(0);
  });

  it('handles provider failures gracefully', async () => {
    const failingProvider: DataProvider = {
      id: 'failing',
      name: 'Failing Provider',
      hazardTypes: [HazardType.Wildfire],
      fetchRisk: vi.fn().mockResolvedValue([]), // Returns empty on error (per contract)
    };

    const workingProvider = createMockProvider('working', 60, HazardType.Earthquake);

    const scorer = new HazardScorer({ providers: [failingProvider, workingProvider] });
    const profile = await scorer.assess(mockLocation);

    expect(profile.hazards).toHaveLength(1);
    expect(profile.meta.providersUsed).toContain('working');
  });

  it('includes engine version in metadata', async () => {
    const scorer = new HazardScorer({ providers: [] });
    const profile = await scorer.assess(mockLocation);

    expect(profile.meta.engineVersion).toBe('0.2.0');
    expect(profile.meta.assessedAt).toBeTruthy();
  });
});
