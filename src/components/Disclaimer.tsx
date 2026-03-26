import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function Disclaimer() {
  return (
    <div className="bg-neutral-100 border-t border-neutral-200 p-4">
      <div className="max-w-4xl mx-auto flex gap-3">
        <AlertCircle size={16} className="text-neutral-400 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-neutral-500 leading-relaxed uppercase tracking-wider font-medium">
          <strong>Disclaimer:</strong> Lonix is an AI assistant. Interest rates and EMI calculations are indicative. Actual rates depend on bank policies, credit scores, and other factors. Please verify all information with your financial institution before making any decisions.
        </p>
      </div>
    </div>
  );
}
