'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RiskGauge } from '@/components/RiskGauge';
import { HazardCard } from '@/components/HazardCard';
import { HazardMap } from '@/components/HazardMap';
import { Recommendations } from '@/components/Recommendations';
import { ShareButton } from '@/components/ShareButton';
import { ExportButtons } from '@/components/ExportButtons';
import { HistoricalTrends } from '@/components/HistoricalTrends';

interface HazardProfile {
  location: {
    address: string;
    coordinates: { latitude: number; longitude: number };
    state?: string;
    county?: string;
  };
  overallScore: number;
  overallLevel: string;
  overallPercentile?: number;
  overallPercentileContext?: string;
  hazards: Array<{
    type: string;
    score: number;
    level: string;
    description: string;
    percentile?: number;
    percentileContext?: string;
    source: { name: string; url: string };
  }>;
  topRisks: Array<{
    type: string;
    score: number;
    level: string;
    description: string;
    percentile?: number;
    percentileContext?: string;
    source: { name: string; url: string };
  }>;
  recommendations: Array<{
    priority: string;
    hazardType: string;
    title: string;
    description: string;
    actionItems: string[];
  }>;
  meta: {
    assessedAt: string;
    engineVersion: string;
    providersUsed: string[];
    providerErrors: Array<{ providerId: string; error: string }>;
    region?: string;
  };
}

function getLevelBg(level: string): string {
  switch (level) {
    case 'very_high': return 'from-red-500 to-red-600';
    case 'high': return 'from-orange-500 to-orange-600';
    case 'moderate': return 'from-yellow-500 to-yellow-600';
    case 'low': return 'from-lime-500 to-lime-600';
    case 'very_low': return 'from-green-500 to-green-600';
    default: return 'from-gray-500 to-gray-600';
  }
}

function ProfileContent() {
  const [profile, setProfile] = useState<HazardProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const address = searchParams.get('address');

  useEffect(() => {
    if (!address) {
      router.push('/');
      return;
    }

    async function fetchProfile() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/assess', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Assessment failed');
        }

        const data = await res.json();
        setProfile(data);

        // Update page title dynamically
        document.title = `Risk Score: ${data.overallScore}/100 — ${data.location.address} | Hazura`;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [address, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-gray-200 rounded-full" />
          <div className="absolute top-0 left-0 w-20 h-20 border-4 border-blue-500 rounded-full border-t-transparent animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-gray-700">Analyzing hazard data...</p>
          <p className="text-sm text-gray-400 mt-1">Querying FEMA, USGS, NOAA, and NIFC</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4">&#x26A0;&#xFE0F;</div>
          <h1 className="text-2xl font-bold mb-2">Assessment Failed</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold transition-colors"
          >
            Try Another Address
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const { location, overallScore, overallLevel, topRisks, recommendations, meta } = profile;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header with overall score */}
      <header className={`bg-gradient-to-r ${getLevelBg(overallLevel)} text-white`}>
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.push('/')}
              className="text-white/80 hover:text-white text-sm flex items-center gap-1"
              aria-label="Go back and assess a new address"
            >
              &larr; New Assessment
            </button>
            <div className="flex gap-2">
              <ExportButtons profile={profile as unknown as Record<string, unknown>} />
              <ShareButton address={location.address} score={overallScore} level={overallLevel} />
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">Hazard Risk Profile</h1>
              <p className="text-white/90 text-lg">{location.address}</p>
              {location.county && location.state && (
                <p className="text-white/70 text-sm mt-1">
                  {location.county} County, {location.state}
                  {meta.region && (
                    <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                      {meta.region}
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="relative flex flex-col items-center">
              <RiskGauge score={overallScore} level={overallLevel} size="lg" />
              <p className="text-white/80 text-sm mt-2">Composite Risk Score</p>
              {profile.overallPercentileContext && (
                <p className="text-white/70 text-xs mt-1">{profile.overallPercentileContext}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        {/* Map */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Location</h2>
          <HazardMap
            latitude={location.coordinates.latitude}
            longitude={location.coordinates.longitude}
            address={location.address}
            overallScore={overallScore}
            overallLevel={overallLevel}
          />
        </section>

        {/* Hazard breakdown */}
        <section>
          <h2 className="text-2xl font-bold mb-2">Hazard Breakdown</h2>
          <p className="text-gray-500 mb-4">
            Individual risk scores from {meta.providersUsed.length} federal data sources.
          </p>

          {topRisks.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {topRisks.map((hazard, i) => (
                <HazardCard key={i} hazard={hazard} />
              ))}
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center text-green-700">
              No significant hazard risks detected for this location.
            </div>
          )}
        </section>

        {/* Historical Trends */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Historical Trend</h2>
          <HistoricalTrends address={location.address} />
        </section>

        {/* Recommendations */}
        <section>
          <Recommendations items={recommendations} />
        </section>

        {/* Meta info */}
        <section className="border-t pt-8">
          <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-400">
            <span>Assessed: {new Date(meta.assessedAt).toLocaleString()}</span>
            <span>Engine: v{meta.engineVersion}</span>
            <span>Sources: {meta.providersUsed.join(', ')}</span>
          </div>
          {meta.providerErrors.length > 0 && (
            <div className="mt-3 text-sm text-yellow-600">
              Some data sources were unavailable:{' '}
              {meta.providerErrors.map((e) => e.providerId).join(', ')}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold transition-colors"
            >
              Assess Another Address
            </button>
          </div>
        </section>
      </div>

      <footer className="border-t py-6 px-4 text-center text-sm text-gray-400">
        <p>
          <a href="/compare" className="underline hover:text-gray-600">
            Compare Addresses
          </a>{' '}
          &middot;{' '}
          <a href="/about" className="underline hover:text-gray-600">
            Methodology
          </a>{' '}
          &middot;{' '}
          <a href="https://github.com/sachinkg12/Hazura" className="underline hover:text-gray-600">
            GitHub
          </a>{' '}
          &middot; Data from FEMA, USGS, NOAA, NIFC
        </p>
      </footer>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
