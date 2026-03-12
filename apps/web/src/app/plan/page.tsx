'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AddressInput } from '@/components/AddressInput';

interface HouseholdForm {
  address: string;
  adults: number;
  children: number;
  childAge: string;
  infants: number;
  infantAge: string;
  elderly: number;
  dogs: number;
  cats: number;
  otherPets: number;
  dailyMedications: string;
  medicalEquipment: boolean;
  mobilityAids: boolean;
  allergies: string;
  housing: 'house' | 'apartment' | 'mobile_home' | 'condo';
  transportation: 'car' | 'no_car';
}

function PlanQuiz() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillAddress = searchParams.get('address') || '';

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<HouseholdForm>({
    address: prefillAddress,
    adults: 1,
    children: 0,
    childAge: '',
    infants: 0,
    infantAge: '',
    elderly: 0,
    dogs: 0,
    cats: 0,
    otherPets: 0,
    dailyMedications: '',
    medicalEquipment: false,
    mobilityAids: false,
    allergies: '',
    housing: 'house',
    transportation: 'car',
  });

  function update(field: keyof HouseholdForm, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.address.trim()) {
      setError('Please enter your address.');
      return;
    }

    setLoading(true);
    setError('');

    const household = {
      members: [
        ...(form.adults > 0 ? [{ type: 'adult' as const, count: form.adults }] : []),
        ...(form.children > 0 ? [{ type: 'child' as const, count: form.children, age: parseInt(form.childAge) || 8 }] : []),
        ...(form.infants > 0 ? [{ type: 'infant' as const, count: form.infants, age: parseInt(form.infantAge) || 0 }] : []),
        ...(form.elderly > 0 ? [{ type: 'elderly' as const, count: form.elderly }] : []),
      ],
      pets: [
        ...(form.dogs > 0 ? [{ type: 'dog' as const, count: form.dogs }] : []),
        ...(form.cats > 0 ? [{ type: 'cat' as const, count: form.cats }] : []),
        ...(form.otherPets > 0 ? [{ type: 'other' as const, count: form.otherPets }] : []),
      ],
      medical: {
        dailyMedications: form.dailyMedications
          ? form.dailyMedications.split(',').map((m) => m.trim()).filter(Boolean)
          : [],
        medicalEquipment: form.medicalEquipment,
        mobilityAids: form.mobilityAids,
        allergies: form.allergies
          ? form.allergies.split(',').map((a) => a.trim()).filter(Boolean)
          : [],
      },
      housing: form.housing,
      transportation: form.transportation,
    };

    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: form.address.trim(), household }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate plan');
      }

      const data = await res.json();
      // Store in sessionStorage and navigate
      sessionStorage.setItem('hazura-plan', JSON.stringify(data));
      router.push('/plan/results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    // Step 0: Address
    <div key="address" className="space-y-4">
      <h2 className="text-2xl font-bold">Where do you live?</h2>
      <p className="text-gray-500">We&apos;ll detect the natural hazards in your area.</p>
      <AddressInput
        value={form.address}
        onChange={(v) => update('address', v)}
        onSubmit={() => setStep(1)}
      />
    </div>,

    // Step 1: Household
    <div key="household" className="space-y-6">
      <h2 className="text-2xl font-bold">Who lives with you?</h2>
      <p className="text-gray-500">We&apos;ll customize supply quantities for your household.</p>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Adults</label>
          <input type="number" min={1} max={10} value={form.adults}
            onChange={(e) => update('adults', parseInt(e.target.value) || 1)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Children (2-17)</label>
          <input type="number" min={0} max={10} value={form.children}
            onChange={(e) => update('children', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Infants (under 2)</label>
          <input type="number" min={0} max={5} value={form.infants}
            onChange={(e) => update('infants', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Elderly / Disabled</label>
          <input type="number" min={0} max={10} value={form.elderly}
            onChange={(e) => update('elderly', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none" />
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-semibold mb-3">Pets</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dogs</label>
            <input type="number" min={0} max={10} value={form.dogs}
              onChange={(e) => update('dogs', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cats</label>
            <input type="number" min={0} max={10} value={form.cats}
              onChange={(e) => update('cats', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Other</label>
            <input type="number" min={0} max={10} value={form.otherPets}
              onChange={(e) => update('otherPets', parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none" />
          </div>
        </div>
      </div>
    </div>,

    // Step 2: Medical
    <div key="medical" className="space-y-6">
      <h2 className="text-2xl font-bold">Medical needs</h2>
      <p className="text-gray-500">We&apos;ll include critical medical supplies in your kit.</p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Daily medications (comma-separated)
        </label>
        <input type="text" value={form.dailyMedications}
          onChange={(e) => update('dailyMedications', e.target.value)}
          placeholder="e.g., insulin, inhaler, blood pressure"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Allergies (comma-separated)
        </label>
        <input type="text" value={form.allergies}
          onChange={(e) => update('allergies', e.target.value)}
          placeholder="e.g., peanuts, bee stings, penicillin"
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none" />
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.medicalEquipment}
            onChange={(e) => update('medicalEquipment', e.target.checked)}
            className="w-5 h-5 rounded border-gray-300" />
          <span className="text-gray-700">Requires medical equipment (CPAP, oxygen, etc.)</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={form.mobilityAids}
            onChange={(e) => update('mobilityAids', e.target.checked)}
            className="w-5 h-5 rounded border-gray-300" />
          <span className="text-gray-700">Uses mobility aids (wheelchair, walker, etc.)</span>
        </label>
      </div>
    </div>,

    // Step 3: Housing & Transport
    <div key="housing" className="space-y-6">
      <h2 className="text-2xl font-bold">Housing & transportation</h2>
      <p className="text-gray-500">This affects your shelter and evacuation plans.</p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Housing type</label>
        <div className="grid grid-cols-2 gap-3">
          {(['house', 'apartment', 'condo', 'mobile_home'] as const).map((type) => (
            <button key={type} onClick={() => update('housing', type)}
              className={`px-4 py-3 rounded-xl border-2 text-left transition-colors ${
                form.housing === type
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
              {type === 'mobile_home' ? 'Mobile Home' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Transportation</label>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => update('transportation', 'car')}
            className={`px-4 py-3 rounded-xl border-2 text-left transition-colors ${
              form.transportation === 'car'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}>
            Have a car
          </button>
          <button onClick={() => update('transportation', 'no_car')}
            className={`px-4 py-3 rounded-xl border-2 text-left transition-colors ${
              form.transportation === 'no_car'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}>
            No car
          </button>
        </div>
      </div>
    </div>,
  ];

  const totalSteps = steps.length;
  const isLastStep = step === totalSteps - 1;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-8">
          <a href="/" className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block">
            &larr; Back to Home
          </a>
          <h1 className="text-4xl font-bold mb-2">Get Your Prep Plan</h1>
          <p className="text-gray-500">
            Personalized emergency kit and action plans in under 2 minutes.
          </p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full transition-colors ${
              i <= step ? 'bg-blue-500' : 'bg-gray-200'
            }`} />
          ))}
        </div>

        {/* Current step */}
        {steps[step]}

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm" role="alert">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="px-6 py-3 text-gray-500 hover:text-gray-700 disabled:opacity-0 transition-colors"
          >
            Back
          </button>

          {isLastStep ? (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating your plan...
                </span>
              ) : (
                'Generate My Plan'
              )}
            </button>
          ) : (
            <button
              onClick={() => setStep(step + 1)}
              className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default function PlanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    }>
      <PlanQuiz />
    </Suspense>
  );
}
