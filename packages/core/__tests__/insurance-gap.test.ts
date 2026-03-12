import { describe, it, expect } from 'vitest';
import { detectInsuranceGaps } from '../src/engine/insurance-gap.js';
import { HazardType, scoreToLevel } from '../src/models/hazard.js';
import type { HazardScore } from '../src/models/hazard.js';

function makeScore(type: HazardType, score: number): HazardScore {
  return {
    type,
    score,
    level: scoreToLevel(score),
    description: `Test ${type} score: ${score}`,
    source: { name: 'Test', url: 'https://test.com' },
  };
}

describe('Insurance Gap Detection', () => {
  it('detects flood insurance gap for score >= 30', () => {
    const scores = [makeScore(HazardType.Flood, 45)];
    const gaps = detectInsuranceGaps(scores);

    expect(gaps).toHaveLength(1);
    expect(gaps[0].gapType).toBe('flood_zone');
    expect(gaps[0].urgency).toBe('high');
    expect(gaps[0].title).toBe('Flood Insurance Gap');
  });

  it('detects earthquake insurance gap for score >= 30', () => {
    const scores = [makeScore(HazardType.Earthquake, 65)];
    const gaps = detectInsuranceGaps(scores);

    expect(gaps).toHaveLength(1);
    expect(gaps[0].gapType).toBe('earthquake_zone');
    expect(gaps[0].urgency).toBe('critical');
  });

  it('detects wildfire coverage risk for score >= 40', () => {
    const scores = [makeScore(HazardType.Wildfire, 50)];
    const gaps = detectInsuranceGaps(scores);

    expect(gaps).toHaveLength(1);
    expect(gaps[0].gapType).toBe('wildfire_zone');
    expect(gaps[0].urgency).toBe('high');
  });

  it('detects hurricane deductible warning for score >= 30', () => {
    const scores = [makeScore(HazardType.Hurricane, 70)];
    const gaps = detectInsuranceGaps(scores);

    expect(gaps).toHaveLength(1);
    expect(gaps[0].gapType).toBe('hurricane_zone');
    expect(gaps[0].urgency).toBe('critical');
  });

  it('returns no gaps for low risk scores', () => {
    const scores = [
      makeScore(HazardType.Flood, 10),
      makeScore(HazardType.Earthquake, 15),
      makeScore(HazardType.Wildfire, 20),
      makeScore(HazardType.Hurricane, 5),
    ];
    const gaps = detectInsuranceGaps(scores);
    expect(gaps).toHaveLength(0);
  });

  it('detects multiple gaps simultaneously', () => {
    const scores = [
      makeScore(HazardType.Flood, 50),
      makeScore(HazardType.Earthquake, 60),
      makeScore(HazardType.Wildfire, 75),
      makeScore(HazardType.Hurricane, 40),
    ];
    const gaps = detectInsuranceGaps(scores);
    expect(gaps).toHaveLength(4);
  });

  it('sorts gaps by urgency (critical first)', () => {
    const scores = [
      makeScore(HazardType.Flood, 35),     // medium
      makeScore(HazardType.Earthquake, 80), // critical
      makeScore(HazardType.Hurricane, 45),  // high
    ];
    const gaps = detectInsuranceGaps(scores);

    expect(gaps[0].urgency).toBe('critical'); // earthquake
    expect(gaps[1].urgency).toBe('high');     // hurricane
    expect(gaps[2].urgency).toBe('medium');   // flood
  });

  it('takes max score when duplicate hazard types exist', () => {
    const scores = [
      makeScore(HazardType.Flood, 20), // below threshold
      makeScore(HazardType.Flood, 50), // above threshold - should use this
    ];
    const gaps = detectInsuranceGaps(scores);

    expect(gaps).toHaveLength(1);
    expect(gaps[0].riskScore).toBe(50);
  });

  it('includes actionable recommendations', () => {
    const scores = [makeScore(HazardType.Flood, 70)];
    const gaps = detectInsuranceGaps(scores);

    expect(gaps[0].recommendation).toContain('NFIP');
    expect(gaps[0].description).toContain('does NOT cover');
  });
});
