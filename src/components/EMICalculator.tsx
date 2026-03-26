import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Calculator, IndianRupee, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { calculateEMI } from '../services/api';
import { EMIData } from '../types';
import { formatCurrency, cn } from '../lib/utils';

export default function EMICalculator() {
  const [principal, setPrincipal] = useState(5000000);
  const [rate, setRate] = useState(8.5);
  const [tenure, setTenure] = useState(240); // 20 years
  const [emiData, setEmiData] = useState<EMIData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await calculateEMI(principal, rate, tenure);
      setEmiData(data);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Calculation failed");
      setEmiData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleCalculate();
  }, [principal, rate, tenure]);

  const chartData = emiData ? [
    { name: 'Principal', value: emiData.principal },
    { name: 'Interest', value: emiData.totalInterest },
  ] : [];

  const COLORS = ['#4f46e5', '#f43f5e'];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="text-indigo-600" size={20} />
        <h2 className="text-lg font-bold text-neutral-900">EMI Calculator</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3 block">Loan Amount</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-medium text-lg">₹</span>
            <input
              type="number"
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-4 pl-10 pr-4 text-lg font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <input 
            type="range" 
            min="100000" 
            max="10000000" 
            step="100000"
            value={principal}
            onChange={(e) => setPrincipal(Number(e.target.value))}
            className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-6"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3 block">Interest Rate (%)</label>
            <input
              type="number"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-4 px-5 text-lg font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3 block">Tenure (Months)</label>
            <input
              type="number"
              value={tenure}
              onChange={(e) => setTenure(Number(e.target.value))}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-2xl py-4 px-5 text-lg font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex gap-2 items-center text-rose-600 text-xs">
          <AlertCircle size={16} />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {emiData && (
        <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100 space-y-4">
          <div className="text-center">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Monthly Payable Amount</p>
            <h3 className="text-3xl font-black text-indigo-900">{formatCurrency(emiData.emi)}</h3>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bg-white p-3 rounded-xl border border-indigo-100 col-span-2">
              <p className="text-[10px] font-bold text-neutral-400 uppercase mb-1">Monthly Payable Amount (EMI)</p>
              <p className="text-lg font-bold text-indigo-600">{formatCurrency(emiData.emi)}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-indigo-100">
              <p className="text-[10px] font-bold text-neutral-400 uppercase mb-1">Total Interest</p>
              <p className="text-sm font-bold text-rose-600">{formatCurrency(emiData.totalInterest)}</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-indigo-100">
              <p className="text-[10px] font-bold text-neutral-400 uppercase mb-1">Total Payable</p>
              <p className="text-sm font-bold text-indigo-900">{formatCurrency(emiData.totalPayment)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
