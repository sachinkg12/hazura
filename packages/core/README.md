# @myhazardprofile/core

Multi-hazard personal risk assessment engine using federal open data (FEMA, USGS, NOAA).

Enter any US address and get a composite risk profile covering floods, earthquakes, wildfires, hurricanes, tornadoes, and more.

## Install

```bash
npm install @myhazardprofile/core
```

## Quick Start

```typescript
import { HazardScorer } from '@myhazardprofile/core';

const scorer = new HazardScorer();
const profile = await scorer.assess('1600 Pennsylvania Ave, Washington, DC');

console.log(profile.overallScore);    // 45
console.log(profile.overallLevel);    // 'moderate'
console.log(profile.topRisks);        // [{ type: 'flood', score: 68, ... }, ...]
console.log(profile.recommendations); // [{ title: 'Flood Preparedness', ... }]
```

## Data Sources

All data comes from free, public US federal government APIs:

| Provider | Data | API |
|----------|------|-----|
| FEMA | Disaster declarations, National Risk Index | [OpenFEMA](https://www.fema.gov/about/openfema/api) |
| USGS | Earthquake history & seismic hazard | [USGS Earthquake Hazards](https://earthquake.usgs.gov/) |
| NOAA | Active weather alerts, severe storms | [NWS API](https://www.weather.gov/documentation/services-web-api) |
| NIFC | Active wildfires, fire perimeters | [NIFC Open Data](https://data-nifc.opendata.arcgis.com/) |

No API keys required.

## Custom Providers

Extend `BaseProvider` to add your own data source:

```typescript
import { BaseProvider, HazardType, scoreToLevel } from '@myhazardprofile/core';
import type { HazardScore, Location } from '@myhazardprofile/core';

class MyCustomProvider extends BaseProvider {
  readonly id = 'my-provider';
  readonly name = 'My Custom Data Source';
  readonly hazardTypes = [HazardType.Flood];

  protected async assess(location: Location): Promise<HazardScore[]> {
    // Fetch from your data source
    const score = 42;
    return [{
      type: HazardType.Flood,
      score,
      level: scoreToLevel(score),
      description: 'Custom flood risk assessment',
      source: { name: 'My Source', url: 'https://example.com' },
    }];
  }
}

const scorer = new HazardScorer({ providers: [new MyCustomProvider()] });
```

## License

Apache 2.0
