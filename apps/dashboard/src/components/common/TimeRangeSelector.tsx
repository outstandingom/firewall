import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { subHours, subDays, format } from 'date-fns';

export interface TimeRange {
  from: Date;
  to: Date;
  label: string;
}

interface TimeRangeSelectorProps {
  onRangeChange: (range: TimeRange) => void;
}

export function TimeRangeSelector({ onRangeChange }: TimeRangeSelectorProps) {
  const [active, setActive] = useState('24h');

  const options = [
    { id: '1h', label: 'Last Hour', getRange: () => ({ from: subHours(new Date(), 1), to: new Date(), label: '1h' }) },
    { id: '24h', label: 'Last 24h', getRange: () => ({ from: subHours(new Date(), 24), to: new Date(), label: '24h' }) },
    { id: '7d', label: 'Last 7 Days', getRange: () => ({ from: subDays(new Date(), 7), to: new Date(), label: '7d' }) },
    { id: '30d', label: 'Last 30 Days', getRange: () => ({ from: subDays(new Date(), 30), to: new Date(), label: '30d' }) },
  ];

  const handleSelect = (id: string, getRange: () => TimeRange) => {
    setActive(id);
    onRangeChange(getRange());
  };

  return (
    <div className="flex items-center space-x-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50 w-fit">
      <Calendar className="w-4 h-4 text-slate-400 mx-2" />
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => handleSelect(opt.id, opt.getRange)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            active === opt.id
              ? 'bg-indigo-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
