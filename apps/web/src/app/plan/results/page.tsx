'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface KitItem {
  name: string;
  quantity: string;
  rationale?: string;
  critical?: boolean;
}

interface KitSection {
  category: string;
  icon: string;
  items: KitItem[];
  tip?: string;
}

interface ActionStep {
  phase: 'before' | 'during' | 'after';
  instructions: string[];
}

interface ActionPlan {
  hazardType: string;
  title: string;
  steps: ActionStep[];
}

interface MaintenanceTask {
  frequency: '6_months' | 'annual';
  task: string;
}

interface PrepRisk {
  type: string;
  score: number;
  level: string;
  description: string;
  implication: string;
}

interface PlanData {
  plan: {
    address: string;
    risks: PrepRisk[];
    kit: KitSection[];
    actionPlans: ActionPlan[];
    maintenance: MaintenanceTask[];
    meta: {
      generatedAt: string;
      totalItems: number;
      totalPeople: number;
      daysOfSupplies: number;
    };
  };
  hazardProfile: {
    overallScore: number;
    overallLevel: string;
    overallPercentileContext?: string;
    location: { address: string; county?: string; state?: string };
    meta: { region?: string };
  };
}

function getLevelColor(level: string): string {
  switch (level) {
    case 'very_high': return 'text-red-600 bg-red-50 border-red-200';
    case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'moderate': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    case 'low': return 'text-lime-700 bg-lime-50 border-lime-200';
    default: return 'text-green-700 bg-green-50 border-green-200';
  }
}

function formatType(type: string): string {
  return type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  before: { label: 'Before', color: 'bg-blue-100 text-blue-700' },
  during: { label: 'During', color: 'bg-red-100 text-red-700' },
  after: { label: 'After', color: 'bg-green-100 text-green-700' },
};

export default function PlanResultsPage() {
  const router = useRouter();
  const [data, setData] = useState<PlanData | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = sessionStorage.getItem('hazura-plan');
    if (!stored) {
      router.push('/plan');
      return;
    }
    setData(JSON.parse(stored));
  }, [router]);

  function toggleItem(sectionIdx: number, itemIdx: number) {
    const key = `${sectionIdx}-${itemIdx}`;
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function printPlan() {
    window.print();
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading your plan...</div>
      </div>
    );
  }

  const { plan, hazardProfile } = data;
  const progress = plan.meta.totalItems > 0
    ? Math.round((checkedItems.size / plan.meta.totalItems) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-gray-50 print:bg-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white print:bg-blue-700">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-4 print:hidden">
            <a href="/plan" className="text-white/80 hover:text-white text-sm">
              &larr; New Plan
            </a>
            <button
              onClick={printPlan}
              className="px-4 py-2 bg-white/20 border border-white/40 rounded-xl hover:bg-white/30 text-sm font-medium"
            >
              Print / Save PDF
            </button>
          </div>
          <h1 className="text-3xl font-bold mb-2">Your Emergency Prep Plan</h1>
          <p className="text-white/90">{hazardProfile.location.address}</p>
          {hazardProfile.meta.region && (
            <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-sm">
              {hazardProfile.meta.region}
            </span>
          )}
          <div className="mt-4 flex items-center gap-6">
            <div>
              <span className="text-4xl font-bold">{hazardProfile.overallScore}</span>
              <span className="text-white/70">/100 risk score</span>
            </div>
            <div className="text-sm text-white/70">
              <div>{plan.meta.totalPeople} people + {plan.kit.some(s => s.category === 'Pet Supplies') ? 'pets' : 'no pets'}</div>
              <div>{plan.meta.totalItems} items in your kit</div>
              <div>{plan.meta.daysOfSupplies}-day supply</div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-12">
        {/* Progress bar (interactive) */}
        <div className="print:hidden sticky top-0 z-10 bg-gray-50 py-3 -mx-4 px-4 border-b">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="font-medium">{checkedItems.size} of {plan.meta.totalItems} items checked</span>
            <span className="font-bold text-blue-600">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Part 1: Your Risks */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Part 1: Your Disaster Risks</h2>
          <div className="space-y-3">
            {plan.risks.map((risk, i) => (
              <div key={i} className={`rounded-xl border-2 p-4 ${getLevelColor(risk.level)}`}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-lg">{formatType(risk.type)}</h3>
                  <span className="font-bold">{risk.score}/100</span>
                </div>
                <p className="text-sm opacity-80 mb-2">{risk.description}</p>
                <p className="text-sm font-medium">{risk.implication}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Part 2: Your Kit */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Part 2: Your Emergency Kit</h2>
          <p className="text-gray-500 mb-6">
            Customized for {plan.meta.totalPeople} people, {plan.meta.daysOfSupplies}-day supply.
            Check items off as you gather them.
          </p>

          <div className="space-y-6">
            {plan.kit.map((section, sIdx) => (
              <div key={sIdx} className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <span>{section.icon}</span>
                  {section.category}
                  <span className="text-sm font-normal text-gray-400 ml-auto">
                    {section.items.filter((_, iIdx) => checkedItems.has(`${sIdx}-${iIdx}`)).length}/{section.items.length}
                  </span>
                </h3>

                <div className="space-y-2">
                  {section.items.map((item, iIdx) => {
                    const key = `${sIdx}-${iIdx}`;
                    const checked = checkedItems.has(key);
                    return (
                      <label key={iIdx}
                        className={`flex items-start gap-3 py-2 px-3 rounded-lg cursor-pointer transition-colors ${
                          checked ? 'bg-green-50' : 'hover:bg-gray-50'
                        } ${item.critical ? 'border-l-4 border-red-400 pl-4' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleItem(sIdx, iIdx)}
                          className="mt-0.5 w-5 h-5 rounded border-gray-300 print:hidden"
                        />
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm ${checked ? 'line-through text-gray-400' : ''}`}>
                            <span className="font-medium">{item.name}</span>
                            <span className="text-gray-400 ml-2">— {item.quantity}</span>
                          </div>
                          {item.rationale && (
                            <p className="text-xs text-gray-400 mt-0.5">{item.rationale}</p>
                          )}
                        </div>
                        {item.critical && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                            Critical
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>

                {section.tip && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
                    {section.tip}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Part 3: Action Plans */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Part 3: Your Action Plans</h2>
          <div className="space-y-6">
            {plan.actionPlans.map((ap, i) => (
              <div key={i} className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold text-lg mb-4">{ap.title}</h3>
                <div className="space-y-4">
                  {ap.steps.map((step, j) => {
                    const phase = PHASE_LABELS[step.phase] || PHASE_LABELS.before;
                    return (
                      <div key={j}>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold mb-2 ${phase.color}`}>
                          {phase.label}
                        </span>
                        <ul className="space-y-1.5 ml-1">
                          {step.instructions.map((inst, k) => (
                            <li key={k} className="flex items-start gap-2 text-sm text-gray-700">
                              <span className="text-gray-300 mt-0.5">&#x2022;</span>
                              <span className={inst.startsWith('CRITICAL') ? 'font-bold text-red-600' : ''}>
                                {inst}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Part 4: Maintenance */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Part 4: Maintenance Schedule</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold mb-3">Every 6 Months</h3>
              <ul className="space-y-2">
                {plan.maintenance.filter((t) => t.frequency === '6_months').map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-blue-400 mt-0.5">&#x2022;</span>
                    {t.task}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white rounded-xl border p-5">
              <h3 className="font-semibold mb-3">Every Year</h3>
              <ul className="space-y-2">
                {plan.maintenance.filter((t) => t.frequency === 'annual').map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-400 mt-0.5">&#x2022;</span>
                    {t.task}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-8 border-t print:hidden">
          <p className="text-gray-400 text-sm mb-4">
            Generated by Hazura on {new Date(plan.meta.generatedAt).toLocaleDateString()}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button onClick={printPlan}
              className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">
              Print / Save as PDF
            </button>
            <a href="/"
              className="px-6 py-3 border-2 border-gray-200 rounded-xl hover:border-gray-400 font-semibold transition-colors">
              Back to Home
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
