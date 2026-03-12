# MyHazardProfile

[![CI](https://github.com/sachinkg12/MyHazardProfile/actions/workflows/ci.yml/badge.svg)](https://github.com/sachinkg12/MyHazardProfile/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@myhazardprofile/core)](https://www.npmjs.com/package/@myhazardprofile/core)
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

**Know your risk. Be prepared.**

A free, open-source multi-hazard risk assessment tool for any US address. Combines federal open data from FEMA, USGS, and NOAA into a single personalized risk dashboard.

## The Problem

No single tool combines all natural hazard types — floods, earthquakes, wildfires, hurricanes, tornadoes — for a specific US address into one unified risk profile. Existing tools are either:

- **County-level only** (FEMA National Risk Index)
- **Single-state** (Cal MyHazards — California only)
- **Single-hazard** (USGS = earthquakes, NOAA = weather)
- **Alerts only** (FEMA App — no comprehensive risk assessment)

MyHazardProfile fills this gap.

## How It Works

```
Address Input → Geocoding → Parallel Data Fetch → Composite Scoring → Risk Dashboard
                               ├─ FEMA (floods, disasters)
                               ├─ USGS (earthquakes)
                               ├─ NOAA (weather, hurricanes, tornadoes)
                               └─ NIFC (wildfires)
```

### What You Get

- **Composite risk score** (0-100) combining all hazard types
- **Individual hazard scores** with data source transparency
- **Risk level classification** (Very Low → Very High)
- **Personalized preparation checklist** based on your specific risks
- **Interactive map** with hazard zone visualization

## Quick Start

### Use the Library

```bash
npm install @myhazardprofile/core
```

```typescript
import { HazardScorer } from '@myhazardprofile/core';

const scorer = new HazardScorer();
const profile = await scorer.assess('742 Evergreen Terrace, Springfield, IL');

console.log(profile.overallScore);     // 58
console.log(profile.topRisks[0].type); // 'tornado'
console.log(profile.recommendations);  // [{ title: 'Tornado Preparedness', ... }]
```

### Run the Web Dashboard

```bash
git clone https://github.com/sachinkg12/MyHazardProfile.git
cd MyHazardProfile
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

```
MyHazardProfile/
├── packages/
│   └── core/           # @myhazardprofile/core — standalone scoring engine (npm)
├── apps/
│   └── web/            # Next.js dashboard — visual risk assessment
└── docs/               # Methodology & architecture docs
```

The scoring engine is a **standalone npm package** — use it in your own apps, research, or tools. The web dashboard is just one consumer of the engine.

## Data Sources

All data is sourced from free US federal government APIs. No API keys required.

| Source | Agency | Data |
|--------|--------|------|
| [OpenFEMA](https://www.fema.gov/about/openfema/api) | FEMA | Disaster declarations, National Risk Index |
| [Earthquake Hazards](https://earthquake.usgs.gov/) | USGS | Seismic history, fault proximity |
| [Weather API](https://www.weather.gov/documentation/services-web-api) | NOAA/NWS | Active alerts, severe weather |
| [NIFC Open Data](https://data-nifc.opendata.arcgis.com/) | NIFC | Active wildfires, fire perimeters |

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Good first issues:**
- Add a new data provider (e.g., drought data from USDA)
- Improve the scoring algorithm for a specific hazard type
- Add nearest shelter lookup
- Improve address autocomplete UX

## License

Apache 2.0 — see [LICENSE](LICENSE)
