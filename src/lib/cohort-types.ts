export const MIN_COHORT_SIZE = 5;

export interface CohortStats {
  total: number;
  accept: number;
  reject: number;
  waitlist: number;
  defer: number;
  gpaBand: [number, number] | null;
  majorMatch: boolean;
}
