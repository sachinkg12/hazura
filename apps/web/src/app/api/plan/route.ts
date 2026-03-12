import { NextRequest, NextResponse } from 'next/server';
import { HazardScorer, PlanGenerator } from '@hazura/core';
import type { HouseholdProfile } from '@hazura/core';

const scorer = new HazardScorer();
const planGenerator = new PlanGenerator();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, household } = body as { address: string; household: HouseholdProfile };

    if (!address || typeof address !== 'string' || address.trim().length < 5) {
      return NextResponse.json(
        { error: 'Please provide a valid US address.' },
        { status: 400 },
      );
    }

    if (!household || !household.members || household.members.length === 0) {
      return NextResponse.json(
        { error: 'Please provide household information.' },
        { status: 400 },
      );
    }

    // First, get hazard assessment
    const profile = await scorer.assess(address.trim());

    // Then generate personalized plan
    const plan = planGenerator.generate(
      household,
      profile.topRisks,
      profile.location.address,
    );

    return NextResponse.json({
      plan,
      hazardProfile: {
        overallScore: profile.overallScore,
        overallLevel: profile.overallLevel,
        overallPercentile: profile.overallPercentile,
        overallPercentileContext: profile.overallPercentileContext,
        location: profile.location,
        topRisks: profile.topRisks,
        meta: profile.meta,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Plan generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
