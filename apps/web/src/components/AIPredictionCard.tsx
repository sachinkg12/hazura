'use client';

interface AIPrediction {
  type: string;
  score: number;
  level: string;
  description: string;
  source: { name: string; url: string; lastUpdated?: string };
  rawData?: {
    probability?: number;
    modelType?: string;
    yearMonth?: string;
    warning?: string;
    topFactors?: Record<string, number>;
    cascadeAware?: boolean;
  };
}

function getProbabilityColor(prob: number): string {
  if (prob >= 0.7) return 'text-red-600';
  if (prob >= 0.4) return 'text-orange-600';
  if (prob >= 0.15) return 'text-yellow-600';
  return 'text-green-600';
}

function getProbabilityBg(prob: number): string {
  if (prob >= 0.7) return 'bg-red-500';
  if (prob >= 0.4) return 'bg-orange-500';
  if (prob >= 0.15) return 'bg-yellow-500';
  return 'bg-green-500';
}

export function AIPredictionCard({ hazard }: { hazard: AIPrediction }) {
  const probability = hazard.rawData?.probability ?? hazard.score / 100;
  const pct = (probability * 100).toFixed(1);
  const modelType = hazard.rawData?.modelType ?? 'unknown';
  const yearMonth = hazard.rawData?.yearMonth;
  const warning = hazard.rawData?.warning;
  const topFactors = hazard.rawData?.topFactors;

  return (
    <article className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-5 col-span-full">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">&#x1F9E0;</span>
          <div>
            <h3 className="font-semibold text-lg">AI Disaster Prediction</h3>
            <span className="text-xs text-gray-500">
              {hazard.source.name} &middot; Model: {modelType}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className={`text-3xl font-bold ${getProbabilityColor(probability)}`}>
            {pct}%
          </span>
          <p className="text-xs text-gray-400">90-day probability</p>
        </div>
      </div>

      {/* Probability bar */}
      <div
        className="w-full bg-gray-200 rounded-full h-3 mb-3"
        role="progressbar"
        aria-valuenow={Math.round(probability * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="AI disaster prediction probability"
      >
        <div
          className={`h-3 rounded-full ${getProbabilityBg(probability)} transition-all duration-1000 ease-out`}
          style={{ width: `${Math.min(probability * 100, 100)}%` }}
        />
      </div>

      <p className="text-sm text-gray-600 mb-3">{hazard.description}</p>

      {/* Top contributing factors */}
      {topFactors && Object.keys(topFactors).length > 0 && (
        <div className="mt-3 pt-3 border-t border-indigo-100">
          <p className="text-xs font-semibold text-gray-500 mb-2">Top Risk Factors</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(topFactors)
              .filter(([, v]) => v > 0)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-100 text-xs text-indigo-700"
                >
                  {formatFactorName(key)}: {typeof value === 'number' && value > 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Stale data warning */}
      {warning && (
        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700">{warning}</p>
        </div>
      )}

      {/* Model info footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
        <span>
          Data: {yearMonth ?? 'N/A'} &middot; Cascade-aware multi-hazard model
        </span>
        <a
          href={hazard.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-500 hover:text-indigo-700 underline"
        >
          About HazardCast
        </a>
      </div>
    </article>
  );
}

function formatFactorName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b5yr\b/g, '(5yr)')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
