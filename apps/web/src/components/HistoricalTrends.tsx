'use client';

import { useEffect, useState } from 'react';

interface TrendPeriod {
  period: string;
  total: number;
  breakdown: Record<string, number>;
}

interface TrendsData {
  county: string;
  state: string;
  totalDeclarations: number;
  periods: TrendPeriod[];
  hazardTypes: string[];
}

const HAZARD_COLORS: Record<string, string> = {
  Flood: '#3B82F6',
  Hurricane: '#8B5CF6',
  Tornado: '#F59E0B',
  Wildfire: '#EF4444',
  'Severe Storm': '#6366F1',
  Earthquake: '#D97706',
  'Winter Storm': '#06B6D4',
  Drought: '#CA8A04',
};

export function HistoricalTrends({ address }: { address: string }) {
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchTrends() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/trends', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to load trends');
        }
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trends');
      } finally {
        setLoading(false);
      }
    }

    fetchTrends();
  }, [address]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-lg font-semibold mb-4">Historical Disaster Trend</h3>
        <div className="h-48 flex items-center justify-center text-gray-400 animate-pulse">
          Loading FEMA historical data...
        </div>
      </div>
    );
  }

  if (error || !data || data.periods.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-lg font-semibold mb-4">Historical Disaster Trend</h3>
        <p className="text-gray-400 text-sm">
          {error || 'No historical disaster declaration data available for this county.'}
        </p>
      </div>
    );
  }

  const maxTotal = Math.max(...data.periods.map((p) => p.total), 1);

  return (
    <div className="bg-white rounded-xl border p-6">
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-lg font-semibold">Historical Disaster Trend</h3>
        <span className="text-xs text-gray-400 mt-1">
          {data.totalDeclarations} total declarations
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        FEMA disaster declarations for {data.county} County, {data.state} by 5-year period
      </p>

      {/* Bar chart */}
      <div className="flex items-end gap-2 h-48 mb-4" role="img" aria-label="Bar chart showing disaster declarations over time">
        {data.periods.map((period) => {
          const heightPct = (period.total / maxTotal) * 100;
          const segments = Object.entries(period.breakdown);

          return (
            <div key={period.period} className="flex-1 flex flex-col items-center gap-1 h-full">
              <span className="text-xs text-gray-500 font-medium">{period.total}</span>
              <div className="flex-1 w-full flex flex-col justify-end">
                <div
                  className="w-full rounded-t-md overflow-hidden flex flex-col-reverse transition-all"
                  style={{ height: `${Math.max(heightPct, 3)}%` }}
                >
                  {segments.map(([type, count]) => {
                    const segPct = (count / period.total) * 100;
                    return (
                      <div
                        key={type}
                        style={{
                          height: `${segPct}%`,
                          backgroundColor: HAZARD_COLORS[type] || '#9CA3AF',
                          minHeight: '2px',
                        }}
                        title={`${type}: ${count}`}
                      />
                    );
                  })}
                </div>
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">{period.period}</span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-3 border-t">
        {data.hazardTypes.map((type) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-gray-500">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: HAZARD_COLORS[type] || '#9CA3AF' }}
            />
            {type}
          </div>
        ))}
      </div>
    </div>
  );
}
