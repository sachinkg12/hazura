import { NextRequest, NextResponse } from 'next/server';
import { HazardScorer } from '@myhazardprofile/core';

const scorer = new HazardScorer();

// Simple in-memory rate limiter: 10 requests per minute per IP
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
const ipHits = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);

  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > MAX_REQUESTS;
}

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipHits) {
    if (now > entry.resetAt) ipHits.delete(ip);
  }
}, 5 * 60_000);

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a minute before trying again.' },
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const { address } = body;

    if (!address || typeof address !== 'string' || address.trim().length < 5) {
      return NextResponse.json(
        { error: 'Please provide a valid US address.' },
        { status: 400 },
      );
    }

    const profile = await scorer.assess(address.trim());
    return NextResponse.json(profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Assessment failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
