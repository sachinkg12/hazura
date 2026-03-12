'use client';

interface HazardScore {
  type: string;
  score: number;
  level: string;
  description: string;
  percentile?: number;
  percentileContext?: string;
  source: { name: string; url: string };
}

const HAZARD_ICONS: Record<string, string> = {
  flood: '\u{1F30A}',
  earthquake: '\u{1F30B}',
  wildfire: '\u{1F525}',
  hurricane: '\u{1F300}',
  tornado: '\u{1F32A}',
  severe_storm: '\u26C8\uFE0F',
  winter: '\u2744\uFE0F',
  drought: '\u2600\uFE0F',
  heatwave: '\u{1F321}\uFE0F',
};

function getLevelColor(level: string): string {
  switch (level) {
    case 'very_high':
      return 'bg-red-50 border-red-200';
    case 'high':
      return 'bg-orange-50 border-orange-200';
    case 'moderate':
      return 'bg-yellow-50 border-yellow-200';
    case 'low':
      return 'bg-lime-50 border-lime-200';
    case 'very_low':
      return 'bg-green-50 border-green-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
}

function getBarColor(level: string): string {
  switch (level) {
    case 'very_high':
      return 'bg-red-500';
    case 'high':
      return 'bg-orange-500';
    case 'moderate':
      return 'bg-yellow-500';
    case 'low':
      return 'bg-lime-500';
    case 'very_low':
      return 'bg-green-500';
    default:
      return 'bg-gray-400';
  }
}

function formatType(type: string): string {
  return type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function HazardCard({ hazard }: { hazard: HazardScore }) {
  const icon = HAZARD_ICONS[hazard.type] || '\u26A0\uFE0F';

  return (
    <article
      className={`rounded-xl border-2 p-5 ${getLevelColor(hazard.level)} transition-all hover:shadow-md`}
      aria-label={`${formatType(hazard.type)} risk: ${hazard.score} out of 100`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">{icon}</span>
          <div>
            <h3 className="font-semibold text-lg">{formatType(hazard.type)}</h3>
            <span className="text-xs text-gray-500">{hazard.source.name}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold">{hazard.score}</span>
          <span className="text-sm text-gray-400">/100</span>
        </div>
      </div>

      {/* Score bar */}
      <div
        className="w-full bg-gray-200 rounded-full h-2 mb-3"
        role="progressbar"
        aria-valuenow={hazard.score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${formatType(hazard.type)} risk score`}
      >
        <div
          className={`h-2 rounded-full ${getBarColor(hazard.level)} transition-all duration-1000 ease-out`}
          style={{ width: `${hazard.score}%` }}
        />
      </div>

      <p className="text-sm text-gray-600">{hazard.description}</p>
      {hazard.percentileContext && (
        <p className="text-xs text-gray-400 mt-2 italic">{hazard.percentileContext}</p>
      )}
    </article>
  );
}
