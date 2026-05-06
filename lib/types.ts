export interface Athlete {
  name: string;
  sport: string;
  category: "Junior" | "Senior";
  gender: string;
  age: number;
  event: string;
  trainingBase: string;
  physio: string;
  snc: string;
  psychologist: string;
  nutritionist: string;
  topsSupport: string;
}

export const INTERVENTION_CATEGORIES = [
  "Physiotherapy",
  "Nutrition",
  "Strength & Conditioning",
  "Psychology",
  "Coaching Intervention",
  "Foreign Training",
  "Foreign Competition",
  "RPO Competition",
  "Medical Surgery",
  "Medical Intervention (PRP/TUE/Other)",
  "Ammunition Testing",
  "Equipment Procurement",
  "TOPS Support",
  "Sparring Partner",
] as const;

export type InterventionCategory = (typeof INTERVENTION_CATEGORIES)[number];

export interface Submission {
  athleteName: string;
  sport: string;
  event: string;
  category: "Junior" | "Senior";
  date: string;
  successfulCategory: InterventionCategory | "";
  successfulDetails: string;
  plannedCategory: InterventionCategory | "";
  plannedDetails: string;
  currentLocation: string;
  generalUpdate: string;
  callsCount: number;
  meetingsCount: number;
  timestamp: string;
}
