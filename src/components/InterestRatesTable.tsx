import React from 'react';
import { Table, TrendingUp, Info, Clock } from 'lucide-react';
import { LoanRate } from '../types';

interface Props {
  data: { rbiRepoRate: string; banks: LoanRate[] } | null;
}

export default function InterestRatesTable({ data }: Props) {
  if (!data) return (
    <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
      <Clock size={40} className="mb-4 opacity-20" />
      <p className="text-sm font-medium">Fetching latest rates...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Table className="text-indigo-600" size={20} />
          <h2 className="text-lg font-bold text-neutral-900">Interest Rates</h2>
        </div>
        <div className="bg-green-50 px-2 py-1 rounded-md border border-green-100 flex items-center gap-1.5">
          <TrendingUp size={12} className="text-green-600" />
          <span className="text-[10px] font-bold text-green-700 uppercase">RBI Repo: {data.rbiRepoRate}</span>
        </div>
      </div>

      <div className="overflow-x-auto border border-neutral-200 rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200">
            <tr>
              <th className="px-4 py-3 font-bold text-neutral-500 uppercase text-[10px] tracking-wider sticky left-0 bg-neutral-50 z-10">Bank</th>
              <th className="px-4 py-3 font-bold text-neutral-500 uppercase text-[10px] tracking-wider">Home Loan</th>
              <th className="px-4 py-3 font-bold text-neutral-500 uppercase text-[10px] tracking-wider">Personal</th>
              <th className="px-4 py-3 font-bold text-neutral-500 uppercase text-[10px] tracking-wider">Education</th>
              <th className="px-4 py-3 font-bold text-neutral-500 uppercase text-[10px] tracking-wider">Vehicle</th>
              <th className="px-4 py-3 font-bold text-neutral-500 uppercase text-[10px] tracking-wider">Gold</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {data.banks.map((bank, i) => (
              <tr key={i} className="hover:bg-neutral-50 transition-colors">
                <td className="px-4 py-3 font-bold text-neutral-900 sticky left-0 bg-white group-hover:bg-neutral-50 z-10">{bank.name}</td>
                <td className="px-4 py-3 text-neutral-600 whitespace-nowrap">{bank.homeLoan}</td>
                <td className="px-4 py-3 text-neutral-600 whitespace-nowrap">{bank.personalLoan}</td>
                <td className="px-4 py-3 text-neutral-600 whitespace-nowrap">{bank.educationalLoan}</td>
                <td className="px-4 py-3 text-neutral-600 whitespace-nowrap">{bank.vehicleLoan}</td>
                <td className="px-4 py-3 text-neutral-600 whitespace-nowrap">{bank.goldLoan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
        <Info size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Note:</strong> These rates are indicative. Actual rates depend on your credit score (CIBIL), loan amount, and employment type.
        </p>
      </div>
    </div>
  );
}
