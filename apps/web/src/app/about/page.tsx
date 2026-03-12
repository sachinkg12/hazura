import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Methodology',
  description:
    'How MyHazardProfile calculates composite risk scores using FEMA, USGS, NOAA, and NIFC data.',
};

const DATA_SOURCES = [
  {
    name: 'FEMA Disaster Declarations',
    agency: 'Federal Emergency Management Agency',
    url: 'https://www.fema.gov/about/openfema/data-sets',
    description:
      'Historical disaster declarations by county. Covers floods, hurricanes, tornadoes, wildfires, severe storms, and winter storms.',
    coverage: 'All US counties, 1953–present',
    method:
      'Counts disaster declarations per hazard type for the county. Uses logarithmic scaling (log\u2082) to normalize: 0 declarations = 0, 1 = 20, 5 = 50, 15+ = 80, 30+ = 100.',
  },
  {
    name: 'USGS Earthquake Hazards',
    agency: 'United States Geological Survey',
    url: 'https://earthquake.usgs.gov/',
    description:
      'Historical earthquake events within 150km of the location over the past 30 years (M2.5+).',
    coverage: 'Global coverage, address-level precision',
    method:
      'Composite of maximum magnitude (60% weight) and frequency of M4.0+ events (40% weight). Max magnitude is scored as (magnitude / 8.0) \u00D7 100.',
  },
  {
    name: 'NOAA National Weather Service',
    agency: 'National Oceanic and Atmospheric Administration',
    url: 'https://www.weather.gov/',
    description:
      'Active weather alerts for the location. Covers hurricanes, tornadoes, severe storms, and winter weather.',
    coverage: 'All US locations, real-time',
    method:
      'Categorizes active alerts by hazard type. Scores by maximum severity: Extreme = 100, Severe = 80, Moderate = 50, Minor = 25.',
  },
  {
    name: 'NIFC Wildfire Data',
    agency: 'National Interagency Fire Center',
    url: 'https://data-nifc.opendata.arcgis.com/',
    description: 'Active wildfire incidents within 200km of the location.',
    coverage: 'All US locations, real-time during fire season',
    method:
      'Composite of active fire count (up to 50 points) and total acreage burned (up to 50 points, logarithmic scale).',
  },
];

const WEIGHTS = [
  { type: 'Flood', weight: '20%' },
  { type: 'Earthquake', weight: '15%' },
  { type: 'Wildfire', weight: '15%' },
  { type: 'Hurricane', weight: '15%' },
  { type: 'Tornado', weight: '10%' },
  { type: 'Severe Storm', weight: '10%' },
  { type: 'Winter Storm', weight: '5%' },
  { type: 'Drought', weight: '5%' },
  { type: 'Heatwave', weight: '5%' },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-12">
          <a href="/" className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block">
            &larr; Back to Home
          </a>
          <h1 className="text-4xl font-bold mb-4">Methodology</h1>
          <p className="text-lg text-gray-600">
            How MyHazardProfile calculates your personalized multi-hazard risk score.
          </p>
        </div>

        {/* Overview */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Overview</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            MyHazardProfile generates a composite risk score (0–100) for any US address by
            combining data from four federal government sources. Each address is geocoded using
            the US Census Bureau API, then assessed across multiple hazard types simultaneously.
          </p>
          <p className="text-gray-700 leading-relaxed">
            The system uses a provider-based architecture where each data source independently
            calculates risk scores for its domain. Providers run in parallel, and the system
            degrades gracefully if any source is unavailable — you still get results from the
            remaining providers.
          </p>
        </section>

        {/* Pipeline */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Assessment Pipeline</h2>
          <div className="bg-white rounded-xl border p-6 font-mono text-sm text-gray-700">
            <div className="space-y-2">
              <p>1. Address Input</p>
              <p className="pl-4 text-gray-400">&darr; US Census Bureau Geocoder</p>
              <p>2. Geocoding &rarr; (latitude, longitude, FIPS code, county, state)</p>
              <p className="pl-4 text-gray-400">&darr; Parallel API queries</p>
              <p>3. Data Fetch &rarr; FEMA + USGS + NOAA + NIFC (concurrent)</p>
              <p className="pl-4 text-gray-400">&darr; Normalize to 0-100</p>
              <p>4. Per-Hazard Scoring &rarr; individual scores per hazard type</p>
              <p className="pl-4 text-gray-400">&darr; Weighted average</p>
              <p>5. Composite Score &rarr; overall risk score (0-100)</p>
              <p className="pl-4 text-gray-400">&darr; Rule-based</p>
              <p>6. Recommendations &rarr; personalized preparation checklist</p>
            </div>
          </div>
        </section>

        {/* Data Sources */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Data Sources</h2>
          <div className="space-y-6">
            {DATA_SOURCES.map((source) => (
              <div key={source.name} className="bg-white rounded-xl border p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg">{source.name}</h3>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    API &rarr;
                  </a>
                </div>
                <p className="text-sm text-gray-500 mb-3">{source.agency}</p>
                <p className="text-gray-700 text-sm mb-3">{source.description}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs font-medium text-gray-400 uppercase">Coverage</span>
                    <p className="text-sm text-gray-600">{source.coverage}</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-gray-400 uppercase">
                      Scoring Method
                    </span>
                    <p className="text-sm text-gray-600">{source.method}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Composite Score */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Composite Score Calculation</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            The overall risk score is a weighted average of individual hazard scores. When
            multiple data sources report on the same hazard type (e.g., both FEMA and NOAA
            report hurricane risk), the highest score is used.
          </p>

          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold">Hazard Type</th>
                  <th className="text-right px-4 py-3 font-semibold">Default Weight</th>
                </tr>
              </thead>
              <tbody>
                {WEIGHTS.map((w) => (
                  <tr key={w.type} className="border-b last:border-0">
                    <td className="px-4 py-2.5">{w.type}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{w.weight}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-gray-500 mt-3">
            Weights are automatically re-normalized when not all hazard types are present
            for a given location.
          </p>
        </section>

        {/* Risk Levels */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Risk Level Classification</h2>
          <div className="grid grid-cols-5 gap-2 text-center text-sm">
            <div className="bg-green-100 text-green-800 rounded-lg py-3 px-2">
              <div className="font-bold">0–19</div>
              <div>Very Low</div>
            </div>
            <div className="bg-lime-100 text-lime-800 rounded-lg py-3 px-2">
              <div className="font-bold">20–39</div>
              <div>Low</div>
            </div>
            <div className="bg-yellow-100 text-yellow-800 rounded-lg py-3 px-2">
              <div className="font-bold">40–59</div>
              <div>Moderate</div>
            </div>
            <div className="bg-orange-100 text-orange-800 rounded-lg py-3 px-2">
              <div className="font-bold">60–79</div>
              <div>High</div>
            </div>
            <div className="bg-red-100 text-red-800 rounded-lg py-3 px-2">
              <div className="font-bold">80–100</div>
              <div>Very High</div>
            </div>
          </div>
        </section>

        {/* Limitations */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Limitations</h2>
          <ul className="list-disc pl-6 space-y-2 text-gray-700 text-sm">
            <li>
              FEMA disaster data is at the county level, not address-specific. Two addresses
              in the same county will receive the same FEMA-based scores.
            </li>
            <li>
              NOAA weather alerts reflect current conditions, not historical risk. Scores
              fluctuate based on active weather events.
            </li>
            <li>
              Wildfire data reflects active fires only. Historical burn area and vegetation
              analysis would improve baseline risk assessment.
            </li>
            <li>
              The composite weighting system uses fixed defaults. Ideal weights would vary by
              region (e.g., earthquakes weighted higher on the West Coast).
            </li>
            <li>
              This tool is for informational purposes only. It should not be used as the sole
              basis for insurance, real estate, or emergency planning decisions.
            </li>
          </ul>
        </section>

        {/* Open Source */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Open Source</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            The scoring engine is available as a standalone npm package:{' '}
            <code className="bg-gray-100 px-2 py-0.5 rounded text-sm">@myhazardprofile/core</code>.
            You can integrate it into your own applications, extend it with custom data providers,
            or contribute improvements.
          </p>
          <a
            href="https://github.com/sachinkg12/MyHazardProfile"
            className="inline-block px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 font-semibold transition-colors"
          >
            View on GitHub
          </a>
        </section>
      </div>

      <footer className="border-t py-6 px-4 text-center text-sm text-gray-400">
        <p>
          MyHazardProfile &middot; Open source &middot; Apache 2.0
        </p>
      </footer>
    </main>
  );
}
