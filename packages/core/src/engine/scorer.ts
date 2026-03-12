import type { DataProvider } from '../models/provider.js';
import type { HazardProfile } from '../models/profile.js';
import type { HazardScore, HazardType } from '../models/hazard.js';
import type { Location } from '../models/location.js';
import type { ProviderError } from '../models/profile.js';
import { HazardAggregator } from './aggregator.js';
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

const ENGINE_VERSION = '0.1.0';

export interface ScorerOptions {
  /** Custom providers. If not specified, all default providers are used. */
  providers?: DataProvider[];
  /** Custom weights for composite scoring */
  weights?: Partial<Record<HazardType, number>>;
  /** Skip geocoding if location already has coordinates */
  skipGeocoding?: boolean;
}

/**
 * Main entry point for the MyHazardProfile scoring engine.
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
  private aggregator: HazardAggregator;

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
    this.aggregator = new HazardAggregator(options.weights);
  }

  /**
   * Assess hazard risk for a US address or location.
   * Runs all providers in parallel and aggregates results.
   */
  async assess(addressOrLocation: string | Location): Promise<HazardProfile> {
    // Resolve location
    const location: Location =
      typeof addressOrLocation === 'string'
        ? await geocodeAddress(addressOrLocation)
        : addressOrLocation;

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
    const { overallScore, overallLevel, topRisks, recommendations } =
      this.aggregator.aggregate(allScores);

    return {
      location,
      overallScore,
      overallLevel,
      hazards: allScores,
      topRisks,
      recommendations,
      meta: {
        assessedAt: new Date().toISOString(),
        engineVersion: ENGINE_VERSION,
        providersUsed,
        providerErrors,
      },
    };
  }
}
