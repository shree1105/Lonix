import { LoanRate, EMIData } from "../types";

export async function fetchLoanRates(): Promise<{ rbiRepoRate: string; banks: LoanRate[]; lastUpdated: string }> {
  const response = await fetch("/api/loan-rates");
  if (!response.ok) throw new Error("Failed to fetch rates");
  return response.json();
}

export async function calculateEMI(principal: number, annualRate: number, tenureMonths: number): Promise<EMIData> {
  const response = await fetch("/api/emi-calculate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ principal, annualRate, tenureMonths }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errorData.error || "EMI calculation failed");
  }
  
  return response.json();
}
