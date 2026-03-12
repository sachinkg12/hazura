import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress } from '@myhazardprofile/core';

interface FemaDeclaration {
  incidentType: string;
  declarationDate: string;
}

interface FemaApiResponse {
  DisasterDeclarationsSummaries: FemaDeclaration[];
}

const INCIDENT_TYPES = new Set([
  'Flood', 'Severe Storm(s)', 'Hurricane', 'Tornado',
  'Fire', 'Earthquake', 'Snow/Ice Storm', 'Drought',
]);

const INCIDENT_LABEL: Record<string, string> = {
  'Flood': 'Flood',
  'Severe Storm(s)': 'Severe Storm',
  'Hurricane': 'Hurricane',
  'Tornado': 'Tornado',
  'Fire': 'Wildfire',
  'Earthquake': 'Earthquake',
  'Snow/Ice Storm': 'Winter Storm',
  'Drought': 'Drought',
};

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    const location = await geocodeAddress(address.trim());
    if (!location.fips) {
      return NextResponse.json({ error: 'Could not determine county FIPS code' }, { status: 400 });
    }

    const stateCode = location.fips.slice(0, 2);
    const countyCode = location.fips.slice(2);
    const filter = `fipsStateCode eq '${stateCode}' and fipsCountyCode eq '${countyCode}'`;
    const url = `https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$filter=${encodeURIComponent(filter)}&$select=incidentType,declarationDate&$orderby=declarationDate asc&$top=1000`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'MyHazardProfile/1.0' },
    });
    const data: FemaApiResponse = await res.json();
    const declarations = data.DisasterDeclarationsSummaries || [];

    // Group by 5-year periods
    const periodCounts = new Map<string, Map<string, number>>();
    const allTypes = new Set<string>();

    for (const decl of declarations) {
      if (!INCIDENT_TYPES.has(decl.incidentType)) continue;

      const year = new Date(decl.declarationDate).getFullYear();
      const periodStart = Math.floor(year / 5) * 5;
      const periodKey = `${periodStart}–${periodStart + 4}`;
      const label = INCIDENT_LABEL[decl.incidentType] || decl.incidentType;
      allTypes.add(label);

      if (!periodCounts.has(periodKey)) {
        periodCounts.set(periodKey, new Map());
      }
      const types = periodCounts.get(periodKey)!;
      types.set(label, (types.get(label) || 0) + 1);
    }

    // Only include last 8 periods (40 years)
    const sortedPeriods = Array.from(periodCounts.keys()).sort();
    const recentPeriods = sortedPeriods.slice(-8);

    const periods = recentPeriods.map((period) => {
      const types = periodCounts.get(period)!;
      const breakdown: Record<string, number> = {};
      let total = 0;
      for (const [type, count] of types) {
        breakdown[type] = count;
        total += count;
      }
      return { period, total, breakdown };
    });

    return NextResponse.json({
      county: location.county,
      state: location.state,
      totalDeclarations: declarations.filter(d => INCIDENT_TYPES.has(d.incidentType)).length,
      periods,
      hazardTypes: Array.from(allTypes).sort(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch trends';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
