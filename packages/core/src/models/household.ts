export interface HouseholdMember {
  type: 'adult' | 'child' | 'infant' | 'elderly';
  count: number;
  /** Age in years (optional, used for children) */
  age?: number;
}

export interface Pet {
  type: 'dog' | 'cat' | 'bird' | 'fish' | 'other';
  count: number;
}

export interface MedicalNeeds {
  dailyMedications: string[];
  medicalEquipment: boolean;
  mobilityAids: boolean;
  allergies: string[];
}

export type HousingType = 'house' | 'apartment' | 'mobile_home' | 'condo';
export type TransportationType = 'car' | 'no_car';

export interface HouseholdProfile {
  members: HouseholdMember[];
  pets: Pet[];
  medical: MedicalNeeds;
  housing: HousingType;
  transportation: TransportationType;
}

/** Calculate total people in household */
export function totalPeople(members: HouseholdMember[]): number {
  return members.reduce((sum, m) => sum + m.count, 0);
}

/** Check if household has infants */
export function hasInfants(members: HouseholdMember[]): boolean {
  return members.some((m) => m.type === 'infant' && m.count > 0);
}

/** Check if household has children */
export function hasChildren(members: HouseholdMember[]): boolean {
  return members.some((m) => m.type === 'child' && m.count > 0);
}

/** Check if household has elderly */
export function hasElderly(members: HouseholdMember[]): boolean {
  return members.some((m) => m.type === 'elderly' && m.count > 0);
}

/** Check if household has pets */
export function hasPets(pets: Pet[]): boolean {
  return pets.some((p) => p.count > 0);
}
