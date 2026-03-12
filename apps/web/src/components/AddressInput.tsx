'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

interface Suggestion {
  address: string;
  city: string;
  state: string;
}

export function AddressInput({ value, onChange, onSubmit, disabled }: AddressInputProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 4) {
      setSuggestions([]);
      return;
    }

    try {
      // Use Nominatim (OpenStreetMap) for autocomplete — supports partial addresses and city names
      const encoded = encodeURIComponent(query);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&countrycodes=us&limit=5&addressdetails=1`,
        { headers: { 'User-Agent': 'HazardPrep/1.0' } },
      );
      const data = await res.json();

      setSuggestions(
        data.slice(0, 5).map((item: any) => ({
          address: item.display_name,
          city: item.address?.city || item.address?.town || item.address?.village || '',
          state: item.address?.state || '',
        })),
      );
      setShowSuggestions(data.length > 0);
    } catch {
      setSuggestions([]);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    onChange(val);
    setActiveIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 400);
  }

  function selectSuggestion(suggestion: Suggestion) {
    onChange(suggestion.address);
    setShowSuggestions(false);
    setSuggestions([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <label htmlFor="address-input" className="sr-only">
        US Address
      </label>
      <input
        id="address-input"
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        placeholder="Enter a US address..."
        aria-label="Enter a US street address for risk assessment"
        aria-expanded={showSuggestions}
        aria-autocomplete="list"
        aria-controls="address-suggestions"
        autoComplete="off"
        className="w-full px-5 py-4 text-lg rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
        disabled={disabled}
      />

      {showSuggestions && suggestions.length > 0 && (
        <ul
          id="address-suggestions"
          role="listbox"
          className="absolute z-30 top-full mt-1 w-full bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden"
        >
          {suggestions.map((s, i) => (
            <li
              key={i}
              role="option"
              aria-selected={i === activeIndex}
              className={`px-4 py-3 cursor-pointer text-sm ${
                i === activeIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
              }`}
              onClick={() => selectSuggestion(s)}
            >
              {s.address}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
