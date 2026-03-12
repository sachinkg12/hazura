import type { HazardScore } from '../models/hazard.js';
import { HazardType } from '../models/hazard.js';
import type {
  HouseholdProfile,
} from '../models/household.js';
import {
  totalPeople,
  hasInfants,
  hasChildren,
  hasElderly,
  hasPets,
} from '../models/household.js';
import type {
  PrepPlan,
  PrepRisk,
  KitSection,
  KitItem,
  ActionPlan,
  MaintenanceTask,
} from '../models/plan.js';

const SUPPLY_DAYS = 3;

/**
 * Generates a personalized emergency preparedness plan based on
 * hazard assessment results and household composition.
 */
export class PlanGenerator {
  generate(
    household: HouseholdProfile,
    hazards: HazardScore[],
    address: string,
  ): PrepPlan {
    const people = totalPeople(household.members);
    const risks = this.buildRisks(hazards, household);
    const kit = this.buildKit(household, hazards);
    const actionPlans = this.buildActionPlans(hazards, household);
    const maintenance = this.buildMaintenance(household);

    const totalItems = kit.reduce((sum, s) => sum + s.items.length, 0);

    return {
      household,
      address,
      risks,
      kit,
      actionPlans,
      maintenance,
      meta: {
        generatedAt: new Date().toISOString(),
        totalItems,
        totalPeople: people,
        daysOfSupplies: SUPPLY_DAYS,
      },
    };
  }

  private buildRisks(hazards: HazardScore[], household: HouseholdProfile): PrepRisk[] {
    return hazards
      .filter((h) => h.score >= 15)
      .sort((a, b) => b.score - a.score)
      .map((h) => ({
        type: h.type,
        score: h.score,
        level: h.level,
        description: h.description,
        implication: this.getImplication(h, household),
      }));
  }

  private getImplication(hazard: HazardScore, household: HouseholdProfile): string {
    const parts: string[] = [];
    const type = hazard.type;

    if (hasInfants(household.members)) {
      if (type === 'earthquake') parts.push('Secure cribs away from windows and heavy objects');
      else if (type === 'wildfire') parts.push('Pack infant go-bag with formula, diapers, and medications');
      else if (type === 'flood') parts.push('Keep infant supplies on upper floors');
      else if (type === 'hurricane') parts.push('Pre-pack 5-day infant supply kit before hurricane season');
      else parts.push('Ensure infant supplies are included in emergency kit');
    }

    if (hasChildren(household.members)) {
      if (type === 'tornado') parts.push('Practice tornado drills so children know safe spots');
      else if (type === 'earthquake') parts.push('Teach children Drop, Cover, Hold On at home and school');
      else parts.push('Prepare age-appropriate emergency activities to reduce anxiety');
    }

    if (hasElderly(household.members)) {
      if (type === 'heatwave') parts.push('Ensure cooling access — elderly are most vulnerable to heat');
      else if (type === 'winter') parts.push('Stock extra heating fuel and warm blankets');
      else parts.push('Plan for mobility assistance during evacuation');
    }

    if (household.medical.dailyMedications.length > 0) {
      parts.push(`Keep 7-day backup of ${household.medical.dailyMedications.join(', ')}`);
    }

    if (household.medical.mobilityAids) {
      if (type === 'earthquake' || type === 'flood') {
        parts.push('Pre-identify accessible evacuation routes');
      }
    }

    if (hasPets(household.pets)) {
      if (type === 'wildfire' || type === 'hurricane') {
        parts.push('Know pet-friendly shelters along evacuation routes');
      }
    }

    if (household.housing === 'mobile_home') {
      if (type === 'tornado' || type === 'hurricane') {
        parts.push('CRITICAL: Mobile homes must evacuate — identify nearest sturdy building');
      }
    }

    if (household.transportation === 'no_car') {
      if (type === 'wildfire' || type === 'hurricane' || type === 'flood') {
        parts.push('Pre-arrange evacuation transport with neighbors or local services');
      }
    }

    return parts.length > 0
      ? parts.join('. ') + '.'
      : 'Review general preparedness guidelines for this hazard type.';
  }

  private buildKit(household: HouseholdProfile, hazards: HazardScore[]): KitSection[] {
    const people = totalPeople(household.members);
    const sections: KitSection[] = [];
    const activeHazards = new Set(hazards.filter((h) => h.score >= 15).map((h) => h.type));

    // Water
    const waterItems: KitItem[] = [
      {
        name: 'Drinking water',
        quantity: `${people * SUPPLY_DAYS} gallons`,
        rationale: `1 gallon/person/day × ${people} people × ${SUPPLY_DAYS} days`,
      },
    ];
    if (hasInfants(household.members)) {
      const infantCount = household.members.find((m) => m.type === 'infant')?.count || 1;
      waterItems.push({
        name: 'Distilled water for formula',
        quantity: `${infantCount * 6} bottles`,
        rationale: `6 bottles per infant for ${SUPPLY_DAYS} days`,
      });
    }
    for (const pet of household.pets) {
      if (pet.type === 'dog' && pet.count > 0) {
        waterItems.push({
          name: 'Water for dog(s)',
          quantity: `${pet.count * SUPPLY_DAYS} gallons`,
          rationale: `1 gallon/dog/day × ${SUPPLY_DAYS} days`,
        });
      } else if (pet.type === 'cat' && pet.count > 0) {
        waterItems.push({
          name: 'Water for cat(s)',
          quantity: `${Math.ceil(pet.count * SUPPLY_DAYS * 0.5)} gallons`,
          rationale: `0.5 gallon/cat/day × ${SUPPLY_DAYS} days`,
        });
      }
    }
    sections.push({
      category: 'Water',
      icon: '\u{1F4A7}',
      items: waterItems,
      tip: 'Store in a cool, dark place. Replace every 6 months.',
    });

    // Food
    const foodItems: KitItem[] = [
      {
        name: 'Non-perishable food for adults',
        quantity: `${SUPPLY_DAYS}-day supply`,
        rationale: 'Canned goods, protein bars, dried fruit, peanut butter',
      },
      { name: 'Manual can opener', quantity: '1' },
    ];
    if (hasChildren(household.members)) {
      const childCount = household.members.find((m) => m.type === 'child')?.count || 1;
      foodItems.push({
        name: 'Kid-friendly food',
        quantity: `${SUPPLY_DAYS}-day supply for ${childCount} child(ren)`,
        rationale: 'Crackers, juice boxes, PB&J supplies, granola bars',
      });
    }
    if (hasInfants(household.members)) {
      const infantCount = household.members.find((m) => m.type === 'infant')?.count || 1;
      foodItems.push({
        name: 'Baby food/formula',
        quantity: `${infantCount * 12} jars + ${infantCount * 6} bottles formula`,
        rationale: `4 jars + 2 bottles formula per infant per day × ${SUPPLY_DAYS} days`,
      });
    }
    for (const pet of household.pets) {
      if ((pet.type === 'dog' || pet.type === 'cat') && pet.count > 0) {
        foodItems.push({
          name: `${pet.type === 'dog' ? 'Dog' : 'Cat'} food`,
          quantity: `${SUPPLY_DAYS}-day supply in sealed container`,
          rationale: `${pet.count} ${pet.type}(s) × ${SUPPLY_DAYS} days`,
        });
      }
    }
    sections.push({
      category: 'Food',
      icon: '\u{1F96B}',
      items: foodItems,
      tip: 'Rotate food every 6 months — eat and replace.',
    });

    // Medical
    const medItems: KitItem[] = [
      { name: 'First aid kit', quantity: '1 comprehensive kit' },
    ];
    if (household.medical.dailyMedications.length > 0) {
      for (const med of household.medical.dailyMedications) {
        medItems.push({
          name: `${med} (backup supply)`,
          quantity: '7-day supply',
          critical: true,
          rationale: 'Talk to your doctor about an emergency prescription',
        });
      }
    }
    if (household.medical.medicalEquipment) {
      medItems.push({
        name: 'Backup power for medical equipment',
        quantity: '1 portable battery/generator',
        critical: true,
        rationale: 'Power outages are common in disasters',
      });
    }
    if (household.medical.mobilityAids) {
      medItems.push({
        name: 'Backup mobility aids',
        quantity: 'As needed',
        critical: true,
        rationale: 'Primary aids may be inaccessible after disaster',
      });
    }
    if (hasInfants(household.members)) {
      medItems.push(
        { name: 'Baby Tylenol/Motrin', quantity: '1 bottle' },
        { name: 'Diaper rash cream', quantity: '1 tube' },
        { name: 'Baby thermometer', quantity: '1' },
      );
    }
    if (hasChildren(household.members) || hasInfants(household.members)) {
      medItems.push({ name: 'Children\'s pain/fever medication', quantity: '1 bottle' });
    }
    if (household.medical.allergies.length > 0) {
      medItems.push({
        name: 'Allergy medication / EpiPen',
        quantity: '2 doses minimum',
        critical: true,
        rationale: `For: ${household.medical.allergies.join(', ')}`,
      });
    }
    medItems.push({ name: 'Prescription list with dosages (printed)', quantity: '1 copy' });
    sections.push({
      category: 'Medical & First Aid',
      icon: '\u{1FA7A}',
      items: medItems,
      tip: household.medical.dailyMedications.some(m => m.toLowerCase().includes('insulin'))
        ? 'CRITICAL: Insulin needs refrigeration — keep cooler with ice packs ready.'
        : 'Check expiration dates every 6 months.',
    });

    // Baby essentials
    if (hasInfants(household.members)) {
      const infantCount = household.members.find((m) => m.type === 'infant')?.count || 1;
      sections.push({
        category: 'Baby Essentials',
        icon: '\u{1F476}',
        items: [
          { name: 'Diapers', quantity: `${infantCount * 100} count`, rationale: 'About 1 week supply per infant' },
          { name: 'Wipes', quantity: `${infantCount * 3} packs` },
          { name: 'Extra bottles', quantity: `${infantCount * 4}` },
          { name: 'Pacifiers', quantity: `${infantCount * 2} extras` },
          { name: 'Baby blankets', quantity: `${infantCount * 2}` },
          { name: 'Changes of clothes', quantity: `${infantCount * 3} outfits` },
          { name: 'Baby carrier/wrap', quantity: '1', rationale: 'Hands-free evacuation with infant' },
        ],
      });
    }

    // Pet supplies
    if (hasPets(household.pets)) {
      const petItems: KitItem[] = [];
      for (const pet of household.pets) {
        if (pet.count === 0) continue;
        const label = pet.type.charAt(0).toUpperCase() + pet.type.slice(1);
        petItems.push(
          { name: `${label} leash/carrier`, quantity: `${pet.count}` },
          { name: `${label} ID tags (current)`, quantity: `${pet.count}` },
          { name: `${label} vaccination records (printed)`, quantity: '1 copy' },
          { name: `Recent ${label.toLowerCase()} photo`, quantity: '1', rationale: 'For lost pet identification' },
        );
        if (pet.type === 'dog') {
          petItems.push({ name: 'Poop bags', quantity: '1 roll per dog' });
        }
        if (pet.type === 'cat') {
          petItems.push({ name: 'Portable litter box + litter', quantity: '1 set' });
        }
      }
      sections.push({
        category: 'Pet Supplies',
        icon: '\u{1F43E}',
        items: petItems,
        tip: 'Not all emergency shelters accept pets. Know pet-friendly options in advance.',
      });
    }

    // Documents
    sections.push({
      category: 'Documents',
      icon: '\u{1F4C4}',
      items: [
        { name: 'Photo IDs (copies)', quantity: `${household.members.filter(m => m.type === 'adult').reduce((s, m) => s + m.count, 0)} copies` },
        { name: 'Birth certificates', quantity: `${people} (originals or certified copies)` },
        { name: 'Insurance policies (home, car, health)', quantity: '1 copy each' },
        { name: 'Bank account information', quantity: '1 printout' },
        { name: 'Medical records & vaccination records', quantity: '1 set' },
        { name: 'Emergency contacts list', quantity: '1 printed copy' },
        { name: 'Photos of home/belongings', quantity: 'Digital + printed', rationale: 'For insurance claims' },
      ],
      tip: 'Store in a waterproof bag. Keep digital backup on USB drive + cloud storage.',
    });

    // Hazard-specific gear
    const hazardGear: KitItem[] = [];
    if (activeHazards.has(HazardType.Earthquake)) {
      hazardGear.push(
        { name: 'Gas shut-off wrench', quantity: '1', rationale: 'For shutting off gas after earthquake' },
        { name: 'Heavy-duty gloves', quantity: `${people} pairs`, rationale: 'For broken glass' },
        { name: 'Sturdy shoes (keep by each bed)', quantity: `${people} pairs` },
        { name: 'Whistle', quantity: `${people}`, rationale: 'To signal for help if trapped' },
      );
    }
    if (activeHazards.has(HazardType.Wildfire)) {
      hazardGear.push(
        { name: 'N95 masks', quantity: `${people * 3}`, rationale: 'For smoke protection' },
        { name: 'Go-bag (pre-packed)', quantity: '1', rationale: 'Keep in car trunk during fire season (May-Oct)' },
      );
    }
    if (activeHazards.has(HazardType.Hurricane)) {
      hazardGear.push(
        { name: 'Plywood / storm shutters for windows', quantity: 'As needed' },
        { name: 'Tarps for roof damage', quantity: '2' },
      );
    }
    if (activeHazards.has(HazardType.Flood)) {
      hazardGear.push(
        { name: 'Sandbags', quantity: '10-20', rationale: 'For door and garage protection' },
        { name: 'Rubber boots', quantity: `${household.members.filter(m => m.type === 'adult').reduce((s, m) => s + m.count, 0)} pairs` },
      );
    }
    if (activeHazards.has(HazardType.Tornado)) {
      hazardGear.push(
        { name: 'Bike helmets (for head protection)', quantity: `${people}` },
        { name: 'Mattress or heavy blankets', quantity: '1 per person', rationale: 'To cover body in safe room' },
      );
    }
    if (activeHazards.has(HazardType.Winter)) {
      hazardGear.push(
        { name: 'Extra heating fuel or space heater', quantity: '1' },
        { name: 'Pipe insulation / heat tape', quantity: 'As needed' },
        { name: 'De-icing salt', quantity: '1 bag' },
        { name: 'Snow shovel', quantity: '1' },
      );
    }
    if (hazardGear.length > 0) {
      sections.push({
        category: 'Hazard-Specific Gear',
        icon: '\u{1F6E1}\uFE0F',
        items: hazardGear,
      });
    }

    // Communication & Light
    sections.push({
      category: 'Communication & Light',
      icon: '\u{1F4FB}',
      items: [
        { name: 'NOAA weather radio (battery-powered)', quantity: '1' },
        { name: 'Flashlights', quantity: `${Math.max(people, 3)}`, rationale: 'One per person minimum' },
        { name: 'Extra batteries (AA, AAA, D)', quantity: '2 packs each' },
        { name: 'Phone chargers + portable battery bank', quantity: '2 banks (fully charged)' },
        { name: 'Paper map of local area', quantity: '1', rationale: 'GPS may not work' },
      ],
    });

    // Shelter & Warmth
    sections.push({
      category: 'Shelter & Warmth',
      icon: '\u{1F3D5}\uFE0F',
      items: [
        { name: 'Emergency Mylar blankets', quantity: `${people}` },
        { name: 'Sleeping bags or warm blankets', quantity: `${people}` },
        { name: 'Extra clothes for each person', quantity: `${people} sets` },
        { name: 'Rain ponchos', quantity: `${people}` },
      ],
    });

    // Sanitation
    const sanitationItems: KitItem[] = [
      { name: 'Toilet paper', quantity: `${people * 2} rolls` },
      { name: 'Heavy-duty garbage bags', quantity: '1 box' },
      { name: 'Hand sanitizer', quantity: '2 bottles' },
      { name: 'Soap', quantity: '2 bars' },
      { name: 'Feminine hygiene products', quantity: 'As needed' },
    ];
    if (hasInfants(household.members)) {
      sanitationItems.push({ name: 'Diaper disposal bags', quantity: '1 roll' });
    }
    sections.push({ category: 'Sanitation', icon: '\u{1F9F4}', items: sanitationItems });

    // Tools & Cash
    sections.push({
      category: 'Tools & Cash',
      icon: '\u{1F527}',
      items: [
        { name: 'Multi-tool or Swiss Army knife', quantity: '1' },
        { name: 'Duct tape', quantity: '1 roll' },
        { name: 'Waterproof matches / lighter', quantity: '1 set' },
        { name: 'Cash in small bills', quantity: '$500', rationale: 'ATMs may be down for days' },
      ],
    });

    return sections;
  }

  private buildActionPlans(hazards: HazardScore[], household: HouseholdProfile): ActionPlan[] {
    const plans: ActionPlan[] = [];
    const activeHazards = hazards.filter((h) => h.score >= 30).sort((a, b) => b.score - a.score);

    for (const hazard of activeHazards.slice(0, 4)) {
      const plan = this.getActionPlan(hazard.type, household);
      if (plan) plans.push(plan);
    }

    // Always add communication plan
    plans.push({
      hazardType: 'communication',
      title: 'Family Communication Plan',
      steps: [
        {
          phase: 'before',
          instructions: [
            'Choose an out-of-state contact person everyone calls to check in',
            'Designate two meeting places: one near home, one outside neighborhood',
            'Ensure all family members have emergency contact cards',
            'Practice the plan with children twice a year',
          ],
        },
        {
          phase: 'during',
          instructions: [
            'Text instead of calling — texts get through when calls don\'t',
            'Use your out-of-state contact as a message relay',
            'Conserve phone battery — keep in airplane mode when not in use',
            household.transportation === 'no_car'
              ? 'Contact pre-arranged transport immediately'
              : 'Keep car fueled to at least half tank during disaster season',
          ],
        },
      ],
    });

    return plans;
  }

  private getActionPlan(type: string, household: HouseholdProfile): ActionPlan | null {
    const isMobile = household.housing === 'mobile_home';

    switch (type) {
      case 'earthquake':
        return {
          hazardType: 'earthquake',
          title: 'Earthquake: Shelter-in-Place',
          steps: [
            {
              phase: 'before',
              instructions: [
                'Secure heavy furniture, water heaters, and bookshelves to walls',
                'Know how to shut off gas, water, and electricity',
                hasInfants(household.members) ? 'Secure cribs away from windows and hanging objects' : 'Identify safe spots in each room (under sturdy desks/tables)',
                hasChildren(household.members) ? 'Practice Drop, Cover, Hold On with children regularly' : 'Practice Drop, Cover, Hold On drills',
                'Keep sturdy shoes and flashlight by each bed',
              ].filter(Boolean),
            },
            {
              phase: 'during',
              instructions: [
                'DROP to hands and knees, take COVER under sturdy furniture, HOLD ON',
                'Stay away from windows, mirrors, and heavy objects',
                'If in bed, stay there and cover head with pillow',
                hasInfants(household.members) ? 'Cover infant\'s body with yours under doorway or sturdy table' : '',
                'If outside, move to open area away from buildings',
              ].filter(Boolean),
            },
            {
              phase: 'after',
              instructions: [
                'Check for injuries — administer first aid',
                'Put on sturdy shoes immediately (broken glass)',
                'Turn off gas ONLY if you smell a leak (use wrench)',
                'Stay out of damaged buildings — expect aftershocks',
                'Use stored water — don\'t trust tap water until cleared',
                'Use battery radio for emergency updates',
              ],
            },
          ],
        };

      case 'wildfire':
        return {
          hazardType: 'wildfire',
          title: 'Wildfire: Evacuation Plan',
          steps: [
            {
              phase: 'before',
              instructions: [
                household.housing === 'house' ? 'Create 30ft defensible space around your home' : 'Know building\'s fire safety features and exits',
                'Keep go-bag packed in car trunk during fire season (May-October)',
                'Sign up for local emergency alerts (Nixle, county alerts)',
                'Know at least 2 evacuation routes from your neighborhood',
                hasPets(household.pets) ? 'Know pet-friendly shelters along evacuation routes' : 'Identify shelter locations along routes',
              ],
            },
            {
              phase: 'during',
              instructions: [
                'Don\'t wait for mandatory evacuation if you see smoke nearby',
                'Wear N95 mask, long sleeves, and closed-toe shoes',
                hasInfants(household.members) ? 'Cover infant carrier with damp cloth to filter smoke' : '',
                'Close all windows and doors (don\'t lock — firefighters may need access)',
                'Take go-bag, documents, and irreplaceable items',
                household.transportation === 'no_car' ? 'Contact pre-arranged evacuation transport NOW' : 'Keep car windows closed, headlights on while driving',
              ].filter(Boolean),
            },
            {
              phase: 'after',
              instructions: [
                'Don\'t return home until authorities say it\'s safe',
                'Watch for hot spots and smoldering debris',
                'Document all damage with photos for insurance',
                'Avoid ash and debris — use N95 mask during cleanup',
              ],
            },
          ],
        };

      case 'hurricane':
        return {
          hazardType: 'hurricane',
          title: isMobile ? 'Hurricane: MANDATORY Evacuation' : 'Hurricane: Shelter or Evacuate',
          steps: [
            {
              phase: 'before',
              instructions: [
                isMobile ? 'CRITICAL: Mobile homes must evacuate for ANY hurricane' : 'Install storm shutters or pre-cut plywood for windows',
                'Stock 5-7 days of water and food (hurricanes can cause extended outages)',
                'Know your evacuation zone and routes',
                'Trim trees and secure outdoor items',
                'Fill bathtub with water (for flushing toilets)',
                hasPets(household.pets) ? 'Pre-identify pet-friendly evacuation shelters' : '',
              ].filter(Boolean),
            },
            {
              phase: 'during',
              instructions: [
                'Stay in interior room away from windows',
                hasInfants(household.members) ? 'Keep infant in safest interior room, away from glass' : '',
                'If flooding starts, move to highest floor',
                'Don\'t go outside during the eye — the storm will resume',
                'Use battery radio for updates',
              ].filter(Boolean),
            },
            {
              phase: 'after',
              instructions: [
                'Don\'t walk through flood water (contamination, hidden debris)',
                'Don\'t use tap water until cleared by authorities',
                'Photograph all damage before cleanup for insurance',
                'Watch for downed power lines',
              ],
            },
          ],
        };

      case 'tornado':
        return {
          hazardType: 'tornado',
          title: 'Tornado: Shelter-in-Place',
          steps: [
            {
              phase: 'before',
              instructions: [
                isMobile ? 'CRITICAL: Identify nearest sturdy building — mobile homes are NOT safe' : 'Identify your safe room (interior room on lowest floor, no windows)',
                'Get a NOAA weather radio with backup batteries',
                hasChildren(household.members) ? 'Practice tornado drills with children — make it a game' : 'Practice tornado drills',
                'Keep shoes and flashlight by bed (tornadoes often hit at night)',
              ],
            },
            {
              phase: 'during',
              instructions: [
                isMobile ? 'Leave mobile home IMMEDIATELY — go to pre-identified sturdy building' : 'Go to safe room — lowest floor, interior room',
                'Cover body with blankets or mattress',
                'Protect head and neck',
                hasInfants(household.members) ? 'Hold infant against your chest, cover both of you' : '',
                'Stay away from windows, doors, and outside walls',
              ].filter(Boolean),
            },
            {
              phase: 'after',
              instructions: [
                'Watch for broken glass and nails',
                'Don\'t enter damaged buildings',
                'Check on neighbors, especially elderly',
                'Photograph damage for insurance',
              ],
            },
          ],
        };

      case 'flood':
        return {
          hazardType: 'flood',
          title: 'Flood: Evacuate or Shelter High',
          steps: [
            {
              phase: 'before',
              instructions: [
                'Know if you\'re in a FEMA flood zone (check FEMA.gov)',
                'Consider flood insurance (NOT covered by standard homeowner\'s)',
                'Keep important items and documents above expected flood level',
                'Have sandbags ready if in a flood-prone area',
                hasInfants(household.members) ? 'Keep baby supplies on upper floors' : '',
              ].filter(Boolean),
            },
            {
              phase: 'during',
              instructions: [
                'NEVER drive or walk through flood water (6 inches can knock you down)',
                'Move to higher ground immediately if water is rising',
                'If trapped, go to highest floor — signal from window',
                'Don\'t touch electrical equipment in wet areas',
              ],
            },
            {
              phase: 'after',
              instructions: [
                'Don\'t return until authorities say it\'s safe',
                'Don\'t drink tap water until cleared',
                'Watch for contaminated mud and debris',
                'Document all damage with photos for insurance',
                'Discard food that contacted flood water',
              ],
            },
          ],
        };

      default:
        return null;
    }
  }

  private buildMaintenance(household: HouseholdProfile): MaintenanceTask[] {
    const tasks: MaintenanceTask[] = [
      { frequency: '6_months', task: 'Rotate stored water' },
      { frequency: '6_months', task: 'Rotate stored food (eat and replace)' },
      { frequency: '6_months', task: 'Test flashlights and replace batteries' },
      { frequency: '6_months', task: 'Check medications for expiration' },
      { frequency: '6_months', task: 'Recharge portable battery banks' },
      { frequency: '6_months', task: 'Update emergency documents if anything changed' },
      { frequency: 'annual', task: 'Practice evacuation plan with entire household' },
      { frequency: 'annual', task: 'Review meeting places — still accessible?' },
      { frequency: 'annual', task: 'Update emergency contacts list' },
      { frequency: 'annual', task: 'Review insurance coverage' },
      { frequency: 'annual', task: 'Take updated photos of home/belongings' },
    ];

    if (hasInfants(household.members) || hasChildren(household.members)) {
      tasks.push({
        frequency: '6_months',
        task: 'Update children\'s clothing sizes and supplies (kids grow!)',
      });
    }

    if (household.medical.dailyMedications.length > 0) {
      tasks.push({
        frequency: '6_months',
        task: 'Rotate backup medication supply — check with doctor for refills',
      });
    }

    if (hasPets(household.pets)) {
      tasks.push({
        frequency: 'annual',
        task: 'Update pet vaccination records and ID tags',
      });
    }

    return tasks;
  }
}
