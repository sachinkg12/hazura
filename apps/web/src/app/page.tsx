'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SeasonalBanner } from '@/components/SeasonalBanner';
import { AddressInput } from '@/components/AddressInput';

const EXAMPLE_ADDRESSES = [
  { label: 'San Francisco, CA', address: '1 Market St, San Francisco, CA 94105' },
  { label: 'Miami, FL', address: '100 Biscayne Blvd, Miami, FL 33132' },
  { label: 'Oklahoma City, OK', address: '100 N Broadway Ave, Oklahoma City, OK 73102' },
  { label: 'Los Angeles, CA', address: '200 N Spring St, Los Angeles, CA 90012' },
];

export default function HomePage() {
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setError('');
    router.push(`/profile?address=${encodeURIComponent(address.trim())}`);
  }

  function handleExample(addr: string) {
    setAddress(addr);
  }

  return (
    <main className="min-h-screen flex flex-col">
      <SeasonalBanner />
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-2xl w-full text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            Know Your Risk.
            <br />
            <span className="text-blue-600">Be Prepared.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10">
            Enter any US address to get a personalized multi-hazard risk assessment.
            <br />
            Floods, earthquakes, wildfires, hurricanes, tornadoes — all in one profile.
          </p>

          {/* Search Form */}
          <form onSubmit={handleSubmit} className="relative mb-6">
            <div className="flex gap-3">
              <AddressInput
                value={address}
                onChange={setAddress}
                onSubmit={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
              />
              <button
                type="submit"
                disabled={!address.trim()}
                aria-label="Assess hazard risk for this address"
                className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                Assess Risk
              </button>
            </div>
          </form>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl" role="alert">
              {error}
            </div>
          )}

          {/* Example addresses */}
          <div className="flex flex-wrap gap-2 justify-center">
            <span className="text-sm text-gray-400">Try:</span>
            {EXAMPLE_ADDRESSES.map((ex) => (
              <button
                key={ex.label}
                onClick={() => handleExample(ex.address)}
                className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <section className="bg-white border-t py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold mb-2">Enter Your Address</h3>
              <p className="text-gray-500 text-sm">
                Any US street address. We geocode it using the US Census Bureau API.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold mb-2">We Analyze the Data</h3>
              <p className="text-gray-500 text-sm">
                FEMA, USGS, NOAA, and NIFC data are queried in parallel to build your risk profile.
              </p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold mb-2">Get Your Profile</h3>
              <p className="text-gray-500 text-sm">
                See your composite risk score, per-hazard breakdown, map, and personalized checklist.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Data sources */}
      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-gray-400 mb-4">Powered by federal open data</p>
          <div className="flex flex-wrap gap-6 justify-center text-sm text-gray-500 font-medium">
            <span>FEMA</span>
            <span>USGS</span>
            <span>NOAA</span>
            <span>NIFC</span>
            <span>US Census Bureau</span>
          </div>
        </div>
      </section>

      {/* Footer */}
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
          <a href="https://github.com/sachinkg12/MyHazardProfile" className="underline hover:text-gray-600">
            GitHub
          </a>{' '}
          &middot; Apache 2.0
        </p>
      </footer>
    </main>
  );
}
