# HazardPrep — Project Tracker

## Phase 1: Core Engine (Scaffold) — COMPLETE
- [x] Initialize monorepo (pnpm + Turborepo)
- [x] Define models: Location, HazardType, HazardScore, HazardProfile, DataProvider
- [x] Implement BaseProvider with caching
- [x] Build FEMA provider (OpenFEMA disaster declarations)
- [x] Build USGS Earthquake provider
- [x] Build NOAA Weather/Alerts provider
- [x] Build NIFC Wildfire provider
- [x] Implement HazardScorer (parallel provider execution)
- [x] Implement HazardAggregator (weighted composite scoring + recommendations)
- [x] US Census geocoder (free, no API key)
- [x] Unit tests (8 passing)
- [x] CI/CD GitHub Actions workflow
- [x] Issue templates (bug, feature, data source request)
- [x] README, CONTRIBUTING, LICENSE (Apache 2.0)

## Phase 2: Web Dashboard — COMPLETE
- [x] Create Next.js app (`apps/web`)
- [x] Landing page with address input + example addresses
- [x] API route wrapping `@hazardprep/core`
- [x] Risk profile results page (composite score, per-hazard breakdown)
- [x] Interactive map with hazard zone visualization (Leaflet + OpenStreetMap)
- [x] Risk gauge / chart components (circular gauge + score bars)
- [x] Personalized preparation checklist with priority levels
- [x] Mobile-responsive design (Tailwind CSS)

## Phase 3: Launch Readiness (P0 — do before going public) — PARTIAL
- [x] Create GitHub repo and push code — https://github.com/sachinkg12/hazardprep
- [x] Switch license to Apache 2.0 (patent grant, trademark protection)
- [ ] Deploy to Vercel (live URL)
- [x] Add error boundary (`error.tsx`) + custom not-found page
- [x] Add rate limiting on `/api/assess` route (10 req/min per IP)
- [x] Add OG image API (dynamic per-profile social preview cards)
- [x] Make profile URL-based (`/profile?address=...`) — shareable links that survive refresh
- [x] Add favicon

## Phase 4: Virality & Sharing (P1 — what makes it spread) — COMPLETE
- [x] Share buttons (Twitter, LinkedIn, Facebook, copy link, native share)
- [x] Dynamic OG image API (`/api/og?address=...&score=...&level=...`)
- [x] SEO meta tags (OpenGraph, Twitter card, keywords, author)
- [x] "Compare addresses" feature (`/compare` — side-by-side risk comparison)
- [x] Seasonal landing page banners (hurricane, wildfire, tornado, winter storm seasons)

## Phase 5: Credibility & Publishing (P2 — what builds your EB-1A case) — PARTIAL
- [x] Methodology page (`/about`) with scoring algorithm, weights, data sources, limitations
- [ ] Publish `@hazardprep/core` to npm
- [x] Add README badges (CI status, npm version, license)
- [ ] Write methodology blog post / arXiv preprint
  - Title: "HazardPrep: Multi-Hazard Personal Risk Assessment Using Federated Government Open Data"
  - Venues: CHI, CSCW, ACM COMPASS, Natural Hazards journal

## Phase 5.5: Personalized Prep Plans — COMPLETE
- [x] Household profile model (members, pets, medical needs, housing, transport)
- [x] Plan generator engine (household-aware kit builder, action plans, maintenance)
- [x] Region-aware hazard weights (8 US regions with auto-detection)
- [x] Risk percentile context ("Higher risk than X% of US locations")
- [x] Quiz UI with 4-step flow (address, household, medical, housing)
- [x] Plan results page with interactive checklist, action plans, maintenance schedule
- [x] PDF/print export for prep plans
- [x] Connected from landing page CTA and profile page

## Phase 6: UX Polish (P3 — better experience) — COMPLETE
- [x] Address autocomplete (US Census Bureau geocoder suggestions)
- [x] Accessibility: ARIA labels, form labels, roles on gauges and score bars
- [x] PDF report export (print-to-PDF via browser)
- [x] JSON export for researchers/developers
- [x] Loading animation with data source indicator (instead of plain spinner)
- [x] Historical trend view (FEMA disaster declarations by 5-year period with stacked bar chart)

## Phase 7: Depth & Data (P4 — richer scoring) — PARTIAL
- [x] USDA Drought Monitor provider
- [x] NOAA historical severe storm provider (Storm Events Database)
- [x] FEMA National Flood Insurance Program (NFIP) claims data
- [x] USGS/NASA landslide catalog provider
- [ ] Nearest emergency shelter lookup (FEMA shelters API)
- [ ] Insurance gap detection ("you're in a flood zone but may not have flood insurance")
- [ ] Integration tests (core engine with mocked HTTP)
- [ ] E2E tests (Playwright for web dashboard)

## Phase 8: EB-1A Traction (P5 — evidence gathering)
- [ ] Present at Code for America / SF Civic Tech meetup
- [ ] Submit paper to CHI / CSCW / ACM COMPASS
- [ ] Pitch to local TV news (tie to seasonal disaster coverage)
- [ ] Contact FEMA social media team for amplification
- [ ] Partner with a city/county emergency management office
- [ ] Reach out to Red Cross for endorsement
- [ ] Collect recommendation letters:
  - Emergency management directors
  - FEMA officials
  - Disaster preparedness researchers
  - Red Cross leaders
- [ ] Track GitHub stars, npm downloads, media mentions as evidence

## Data Sources Reference

| Source | Agency | API | Key Required | Status |
|--------|--------|-----|--------------|--------|
| OpenFEMA | FEMA | https://www.fema.gov/api/open/v2/ | No | Integrated |
| Earthquake Hazards | USGS | https://earthquake.usgs.gov/fdsnws/event/1/ | No | Integrated |
| Weather API | NOAA/NWS | https://api.weather.gov/ | No | Integrated |
| NIFC Wildfire | NIFC | ArcGIS REST Services | No | Integrated |
| Census Geocoder | US Census | https://geocoding.geo.census.gov/ | No | Integrated |
| Drought Monitor | USDA | https://usdm.unl.edu/ | No | Integrated |
| Storm Events | NOAA/NCEI | https://www.ncei.noaa.gov/access/monitoring/storm-events/ | No | Integrated |
| NFIP Claims | FEMA | https://www.fema.gov/api/open/v2/ | No | Integrated |
| Landslide Catalog | NASA/USGS | https://landslides.nasa.gov/ | No | Integrated |
| Shelters | FEMA | https://gis.fema.gov/arcgis/rest/services/ | No | Planned |

## Key Metrics to Track (for EB-1A evidence)
- [ ] GitHub stars count
- [ ] npm weekly downloads
- [ ] Unique visitors / monthly active users
- [ ] Media mentions / press coverage
- [ ] Academic citations
- [ ] Government/NGO partnerships
- [ ] Conference presentations
