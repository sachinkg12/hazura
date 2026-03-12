import type { HouseholdProfile } from './household.js';
import type { HazardScore, RiskLevel } from './hazard.js';

export interface PrepPlan {
  /** Household this plan was generated for */
  household: HouseholdProfile;
  /** Location address */
  address: string;
  /** Risk summary from hazard assessment */
  risks: PrepRisk[];
  /** Personalized emergency kit checklist */
  kit: KitSection[];
  /** Hazard-specific action plans */
  actionPlans: ActionPlan[];
  /** Maintenance schedule */
  maintenance: MaintenanceTask[];
  /** Plan metadata */
  meta: {
    generatedAt: string;
    totalItems: number;
    totalPeople: number;
    daysOfSupplies: number;
  };
}

export interface PrepRisk {
  type: string;
  score: number;
  level: RiskLevel;
  description: string;
  /** What this risk means for this household specifically */
  implication: string;
}

export interface KitSection {
  category: string;
  icon: string;
  items: KitItem[];
  tip?: string;
}

export interface KitItem {
  name: string;
  quantity: string;
  /** Why this quantity was chosen */
  rationale?: string;
  critical?: boolean;
}

export interface ActionPlan {
  hazardType: string;
  title: string;
  steps: ActionStep[];
}

export interface ActionStep {
  phase: 'before' | 'during' | 'after';
  instructions: string[];
}

export interface MaintenanceTask {
  frequency: '6_months' | 'annual';
  task: string;
}
