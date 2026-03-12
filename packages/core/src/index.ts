// Engine
export { HazardScorer, type ScorerOptions } from './engine/scorer.js';
export { HazardAggregator } from './engine/aggregator.js';
export { getRegionalWeights, getRegionName, DEFAULT_WEIGHTS } from './engine/weights.js';
export { getScorePercentile, getPercentileContext } from './engine/percentiles.js';

// Models
export {
  HazardType,
  scoreToLevel,
  type HazardScore,
  type RiskLevel,
} from './models/hazard.js';
export { type Location, type Coordinates, type BoundingBox } from './models/location.js';
export { type HazardProfile, type Recommendation, type ProviderError } from './models/profile.js';
export { type DataProvider } from './models/provider.js';

// Providers (for advanced usage / custom configurations)
export { BaseProvider } from './providers/base.provider.js';
export { FemaProvider } from './providers/fema.provider.js';
export { EarthquakeProvider } from './providers/earthquake.provider.js';
export { WeatherProvider } from './providers/weather.provider.js';
export { WildfireProvider } from './providers/wildfire.provider.js';
export { DroughtProvider } from './providers/drought.provider.js';
export { StormEventsProvider } from './providers/storm-events.provider.js';
export { NfipProvider } from './providers/nfip.provider.js';
export { LandslideProvider } from './providers/landslide.provider.js';

// Plan Generator
export { PlanGenerator } from './engine/plan-generator.js';
export type {
  HouseholdProfile,
  HouseholdMember,
  Pet,
  MedicalNeeds,
  HousingType,
  TransportationType,
} from './models/household.js';
export { totalPeople, hasInfants, hasChildren, hasElderly, hasPets } from './models/household.js';
export type {
  PrepPlan,
  PrepRisk,
  KitSection,
  KitItem,
  ActionPlan,
  ActionStep,
  MaintenanceTask,
} from './models/plan.js';

// Geocoding
export { geocodeAddress } from './geocoding/geocoder.js';
