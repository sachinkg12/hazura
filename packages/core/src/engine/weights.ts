import { HazardType } from '../models/hazard.js';

/**
 * Default weights for composite risk score calculation.
 * These can be overridden when creating a HazardScorer instance.
 * Weights should sum to 1.0.
 */
export const DEFAULT_WEIGHTS: Record<HazardType, number> = {
  [HazardType.Flood]: 0.20,
  [HazardType.Earthquake]: 0.15,
  [HazardType.Wildfire]: 0.15,
  [HazardType.Hurricane]: 0.15,
  [HazardType.Tornado]: 0.10,
  [HazardType.SevereStorm]: 0.10,
  [HazardType.Winter]: 0.05,
  [HazardType.Drought]: 0.05,
  [HazardType.Heatwave]: 0.05,
};

/**
 * Region-aware weight profiles based on dominant hazard patterns.
 * States are grouped by their primary risk profiles using FEMA historical data.
 */
type WeightOverrides = Partial<Record<HazardType, number>>;

const REGION_WEIGHTS: Record<string, WeightOverrides> = {
  // Pacific / West Coast — earthquake + wildfire dominant
  pacific: {
    [HazardType.Earthquake]: 0.25,
    [HazardType.Wildfire]: 0.20,
    [HazardType.Flood]: 0.15,
    [HazardType.Hurricane]: 0.02,
    [HazardType.Tornado]: 0.05,
    [HazardType.SevereStorm]: 0.08,
    [HazardType.Drought]: 0.10,
    [HazardType.Winter]: 0.05,
    [HazardType.Heatwave]: 0.10,
  },
  // Gulf Coast — hurricane + flood dominant
  gulf: {
    [HazardType.Hurricane]: 0.25,
    [HazardType.Flood]: 0.25,
    [HazardType.Tornado]: 0.10,
    [HazardType.SevereStorm]: 0.10,
    [HazardType.Wildfire]: 0.05,
    [HazardType.Earthquake]: 0.02,
    [HazardType.Heatwave]: 0.08,
    [HazardType.Winter]: 0.05,
    [HazardType.Drought]: 0.10,
  },
  // Atlantic Coast — hurricane + flood + nor'easters
  atlantic: {
    [HazardType.Hurricane]: 0.22,
    [HazardType.Flood]: 0.22,
    [HazardType.Winter]: 0.12,
    [HazardType.SevereStorm]: 0.12,
    [HazardType.Tornado]: 0.08,
    [HazardType.Earthquake]: 0.05,
    [HazardType.Wildfire]: 0.05,
    [HazardType.Heatwave]: 0.07,
    [HazardType.Drought]: 0.07,
  },
  // Tornado Alley — tornado + severe storm dominant
  tornado_alley: {
    [HazardType.Tornado]: 0.25,
    [HazardType.SevereStorm]: 0.20,
    [HazardType.Flood]: 0.15,
    [HazardType.Drought]: 0.10,
    [HazardType.Heatwave]: 0.08,
    [HazardType.Winter]: 0.08,
    [HazardType.Hurricane]: 0.05,
    [HazardType.Wildfire]: 0.05,
    [HazardType.Earthquake]: 0.04,
  },
  // Mountain West — wildfire + drought + winter
  mountain: {
    [HazardType.Wildfire]: 0.22,
    [HazardType.Drought]: 0.15,
    [HazardType.Winter]: 0.15,
    [HazardType.Flood]: 0.12,
    [HazardType.Earthquake]: 0.10,
    [HazardType.SevereStorm]: 0.10,
    [HazardType.Heatwave]: 0.08,
    [HazardType.Tornado]: 0.05,
    [HazardType.Hurricane]: 0.03,
  },
  // Upper Midwest / Great Lakes — winter + flood + severe storms
  midwest: {
    [HazardType.Winter]: 0.18,
    [HazardType.Flood]: 0.18,
    [HazardType.SevereStorm]: 0.15,
    [HazardType.Tornado]: 0.15,
    [HazardType.Heatwave]: 0.10,
    [HazardType.Drought]: 0.08,
    [HazardType.Wildfire]: 0.05,
    [HazardType.Earthquake]: 0.05,
    [HazardType.Hurricane]: 0.06,
  },
  // Alaska — earthquake + winter dominant
  alaska: {
    [HazardType.Earthquake]: 0.30,
    [HazardType.Winter]: 0.25,
    [HazardType.Flood]: 0.15,
    [HazardType.Wildfire]: 0.10,
    [HazardType.SevereStorm]: 0.08,
    [HazardType.Drought]: 0.05,
    [HazardType.Tornado]: 0.02,
    [HazardType.Hurricane]: 0.02,
    [HazardType.Heatwave]: 0.03,
  },
  // Hawaii — hurricane + earthquake + flood
  hawaii: {
    [HazardType.Hurricane]: 0.25,
    [HazardType.Earthquake]: 0.20,
    [HazardType.Flood]: 0.20,
    [HazardType.Wildfire]: 0.10,
    [HazardType.Heatwave]: 0.05,
    [HazardType.SevereStorm]: 0.10,
    [HazardType.Drought]: 0.05,
    [HazardType.Tornado]: 0.02,
    [HazardType.Winter]: 0.03,
  },
};

const STATE_TO_REGION: Record<string, string> = {
  // Pacific
  CA: 'pacific', OR: 'pacific', WA: 'pacific',
  // Gulf Coast
  TX: 'gulf', LA: 'gulf', MS: 'gulf', AL: 'gulf', FL: 'gulf',
  // Atlantic Coast
  ME: 'atlantic', NH: 'atlantic', VT: 'atlantic', MA: 'atlantic',
  CT: 'atlantic', RI: 'atlantic', NY: 'atlantic', NJ: 'atlantic',
  DE: 'atlantic', MD: 'atlantic', VA: 'atlantic', NC: 'atlantic',
  SC: 'atlantic', GA: 'atlantic', DC: 'atlantic',
  // Tornado Alley
  OK: 'tornado_alley', KS: 'tornado_alley', NE: 'tornado_alley',
  SD: 'tornado_alley', IA: 'tornado_alley', MO: 'tornado_alley',
  AR: 'tornado_alley', TN: 'tornado_alley', KY: 'tornado_alley',
  IN: 'tornado_alley',
  // Mountain West
  CO: 'mountain', UT: 'mountain', NV: 'mountain', AZ: 'mountain',
  NM: 'mountain', ID: 'mountain', MT: 'mountain', WY: 'mountain',
  // Upper Midwest / Great Lakes
  MN: 'midwest', WI: 'midwest', MI: 'midwest', IL: 'midwest',
  OH: 'midwest', PA: 'midwest', ND: 'midwest', WV: 'midwest',
  // Alaska & Hawaii
  AK: 'alaska', HI: 'hawaii',
};

/**
 * Get region-aware weights for a given US state.
 * Falls back to DEFAULT_WEIGHTS for unknown states.
 */
export function getRegionalWeights(state?: string): Record<HazardType, number> {
  if (!state) return { ...DEFAULT_WEIGHTS };

  // Handle full state names or abbreviations
  const abbr = state.length === 2 ? state.toUpperCase() : stateNameToAbbr(state);
  const region = STATE_TO_REGION[abbr];

  if (!region) return { ...DEFAULT_WEIGHTS };

  return { ...DEFAULT_WEIGHTS, ...REGION_WEIGHTS[region] } as Record<HazardType, number>;
}

/**
 * Get the region name for display purposes.
 */
export function getRegionName(state?: string): string | null {
  if (!state) return null;
  const abbr = state.length === 2 ? state.toUpperCase() : stateNameToAbbr(state);
  const region = STATE_TO_REGION[abbr];
  if (!region) return null;

  const names: Record<string, string> = {
    pacific: 'Pacific / West Coast',
    gulf: 'Gulf Coast',
    atlantic: 'Atlantic Coast',
    tornado_alley: 'Tornado Alley',
    mountain: 'Mountain West',
    midwest: 'Upper Midwest',
    alaska: 'Alaska',
    hawaii: 'Hawaii',
  };
  return names[region] || null;
}

function stateNameToAbbr(name: string): string {
  const map: Record<string, string> = {
    alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
    colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
    hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
    kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
    massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
    missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK',
    oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
    virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI',
    wyoming: 'WY', 'district of columbia': 'DC',
  };
  return map[name.toLowerCase().trim()] || name;
}

/** Normalize weights so they sum to 1.0 for the given hazard types */
export function normalizeWeights(
  weights: Partial<Record<HazardType, number>>,
  activeTypes: HazardType[],
): Record<HazardType, number> {
  const filtered: Record<string, number> = {};
  let total = 0;

  for (const type of activeTypes) {
    const w = weights[type] ?? DEFAULT_WEIGHTS[type] ?? 0;
    filtered[type] = w;
    total += w;
  }

  // Normalize to sum to 1.0
  if (total > 0) {
    for (const type of activeTypes) {
      filtered[type] = filtered[type] / total;
    }
  }

  return filtered as Record<HazardType, number>;
}
