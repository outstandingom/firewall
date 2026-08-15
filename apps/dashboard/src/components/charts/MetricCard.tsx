import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  color?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'slate';
  className?: string;
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  trend = 'neutral', 
  icon, 
  color = 'indigo',
  className 
}: MetricCardProps) {
  const colorStyles = {
    indigo: 'from-indigo-500/10 to-transparent border-indigo-500/20 text-indigo-500',
    emerald: 'from-emerald-500/10 to-transparent border-emerald-500/20 text-emerald-500',
    rose: 'from-rose-500/10 to-transparent border-rose-500/20 text-rose-500',
    amber: 'from-amber-500/10 to-transparent border-amber-500/20 text-amber-500',
    slate: 'from-slate-500/10 to-transparent border-slate-500/20 text-slate-500',
  };

  return (
    <div className={twMerge(
      'relative flex flex-col p-5 rounded-xl border bg-gradient-to-br bg-slate-800/50 backdrop-blur-sm',
      colorStyles[color].split(' ')[0],
      colorStyles[color].split(' ')[1],
      colorStyles[color].split(' ')[2],
      className
    )}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-slate-400">{title}</h3>
        <div className={`p-2 rounded-lg bg-slate-900/50 ${colorStyles[color].split(' ')[3]}`}>
          {icon}
        </div>
      </div>
      
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">{value}</span>
        {change !== undefined && (
          <div className={clsx(
            'flex items-center text-xs font-medium',
            trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-slate-500'
          )}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3 mr-1" /> : 
             trend === 'down' ? <ArrowDownRight className="w-3 h-3 mr-1" /> : 
             <Minus className="w-3 h-3 mr-1" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
    </div>
  );
}
