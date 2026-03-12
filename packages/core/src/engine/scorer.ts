import type { DataProvider } from '../models/provider.js';
import type { HazardProfile } from '../models/profile.js';
import type { HazardScore, HazardType } from '../models/hazard.js';
import type { Location } from '../models/location.js';
import type { ProviderError } from '../models/profile.js';
import { HazardAggregator } from './aggregator.js';
import { getRegionalWeights, getRegionName } from './weights.js';
import { geocodeAddress } from '../geocoding/geocoder.js';
import {
  FemaProvider,
  EarthquakeProvider,
  WeatherProvider,
  WildfireProvider,
  DroughtProvider,
  StormEventsProvider,
  NfipProvider,
  LandslideProvider,
} from '../providers/index.js';

const ENGINE_VERSION = '0.2.0';

export interface ScorerOptions {
  /** Custom providers. If not specified, all default providers are used. */
  providers?: DataProvider[];
  /** Custom weights for composite scoring. Overrides regional auto-detection. */
  weights?: Partial<Record<HazardType, number>>;
  /** Skip geocoding if location already has coordinates */
  skipGeocoding?: boolean;
  /** Disable region-aware weights (use flat defaults instead) */
  disableRegionalWeights?: boolean;
}

/**
 * Main entry point for the Hazura scoring engine.
 *
 * @example
 * ```typescript
 * const scorer = new HazardScorer();
 * const profile = await scorer.assess('123 Main St, San Francisco, CA');
 * console.log(profile.overallScore); // 72
 * console.log(profile.topRisks);     // [{ type: 'earthquake', score: 92, ... }]
 * ```
 */
export class HazardScorer {
  private providers: DataProvider[];
  private customWeights?: Partial<Record<HazardType, number>>;
  private disableRegionalWeights: boolean;

  constructor(options: ScorerOptions = {}) {
    this.providers = options.providers ?? [
      new FemaProvider(),
      new EarthquakeProvider(),
      new WeatherProvider(),
      new WildfireProvider(),
      new DroughtProvider(),
      new StormEventsProvider(),
      new NfipProvider(),
      new LandslideProvider(),
    ];
    this.customWeights = options.weights;
    this.disableRegionalWeights = options.disableRegionalWeights ?? false;
  }

  /**
   * Assess hazard risk for a US address or location.
   * Runs all providers in parallel and aggregates results.
   * Automatically applies region-aware weights based on the state.
   */
  async assess(addressOrLocation: string | Location): Promise<HazardProfile> {
    // Resolve location
    const location: Location =
      typeof addressOrLocation === 'string'
        ? await geocodeAddress(addressOrLocation)
        : addressOrLocation;

    // Determine weights: custom > regional > default
    const weights = this.customWeights
      ?? (this.disableRegionalWeights ? undefined : getRegionalWeights(location.state));

    const aggregator = new HazardAggregator(weights);

    // Run all providers in parallel
    const results = await Promise.allSettled(
      this.providers.map((provider) => provider.fetchRisk(location)),
    );

    const allScores: HazardScore[] = [];
    const providerErrors: ProviderError[] = [];
    const providersUsed: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const provider = this.providers[i];

      if (result.status === 'fulfilled' && result.value.length > 0) {
        allScores.push(...result.value);
        providersUsed.push(provider.id);
      } else if (result.status === 'rejected') {
        providerErrors.push({
          providerId: provider.id,
          error: result.reason?.message ?? 'Unknown error',
        });
      }
    }

    // Aggregate scores
    const { overallScore, overallLevel, overallPercentile, overallPercentileContext, topRisks, recommendations } =
      aggregator.aggregate(allScores);

    return {
      location,
      overallScore,
      overallLevel,
      overallPercentile,
      overallPercentileContext,
      hazards: allScores,
      topRisks,
      recommendations,
      meta: {
        assessedAt: new Date().toISOString(),
        engineVersion: ENGINE_VERSION,
        providersUsed,
        providerErrors,
        region: getRegionName(location.state) ?? undefined,
      },
    };
  }
}
