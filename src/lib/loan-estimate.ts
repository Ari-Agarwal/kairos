// Financial aid buildout, loan/debt calculator (Software_Timeline.md,
// decided 2026-07-24 to reverse the earlier "not built" call). Deliberately
// a SIMPLE estimator, not a full planning tool: pure arithmetic from the
// net-price estimate already on screen, no AI call, no new data storage.
// Never recommends borrowing or frames a "you should take this loan"
// conclusion -- just converts an annual gap into a rough loan-need and
// monthly-payment figure, always paired with a not-financial-advice
// disclaimer.

// Illustrative fixed-rate assumption (rounded, not tied to any specific
// year's actual federal rate) -- the UI must label this explicitly.
export const ASSUMED_ANNUAL_RATE = 0.065;
export const ASSUMED_REPAYMENT_YEARS = 10;
export const ASSUMED_PROGRAM_YEARS = 4;

export interface LoanEstimate {
  totalLoanNeeded: number;
  monthlyPayment: number;
}

/**
 * annualGap: estimated net price minus what the family expects to cover
 * per year (savings, current income, 529, etc). Assumes the same gap
 * repeats for ASSUMED_PROGRAM_YEARS and is borrowed each year, then repaid
 * over ASSUMED_REPAYMENT_YEARS at ASSUMED_ANNUAL_RATE.
 */
export function estimateLoan(annualGap: number): LoanEstimate | null {
  if (annualGap <= 0) return null;

  const totalLoanNeeded = Math.round(annualGap * ASSUMED_PROGRAM_YEARS);

  const monthlyRate = ASSUMED_ANNUAL_RATE / 12;
  const numPayments = ASSUMED_REPAYMENT_YEARS * 12;
  const monthlyPayment =
    (totalLoanNeeded * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  return { totalLoanNeeded, monthlyPayment: Math.round(monthlyPayment) };
}
