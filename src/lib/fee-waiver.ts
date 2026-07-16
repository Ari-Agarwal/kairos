export type FeeWaiverSignal = "likely_eligible" | "not_indicated";

export interface FeeWaiverInput {
  financial_aid_need: boolean | null;
  first_gen: boolean | null;
}

export function checkFeeWaiverEligibility(input: FeeWaiverInput): FeeWaiverSignal {
  if (input.financial_aid_need === true || input.first_gen === true) {
    return "likely_eligible";
  }
  return "not_indicated";
}
