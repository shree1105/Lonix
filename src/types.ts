export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'emi' | 'rates';
  data?: any;
}

export interface LoanRate {
  name: string;
  homeLoan: string;
  personalLoan: string;
  carLoan: string;
  educationalLoan: string;
  vehicleLoan: string;
  goldLoan: string;
}

export interface EMIData {
  emi: number;
  totalPayment: number;
  totalInterest: number;
  principal: number;
  breakdown: {
    principalPercent: number;
    interestPercent: number;
  };
}
