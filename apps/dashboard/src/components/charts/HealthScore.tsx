import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface HealthScoreProps {
  score: number;
  breakdown: {
    performance: number;
    reliability: number;
    apiHealth: number;
    frontend: number;
  };
  explanations: string[];
}

export function HealthScore({ score, breakdown, explanations }: HealthScoreProps) {
  const getColor = (val: number) => {
    if (val >= 80) return '#10b981'; // emerald
    if (val >= 60) return '#f59e0b'; // amber
    return '#ef4444'; // rose
  };

  const color = getColor(score);
  const data = [
    { name: 'Score', value: score },
    { name: 'Remaining', value: 100 - score }
  ];

  return (
    <div className="flex flex-col bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
      <h3 className="text-sm font-medium text-slate-300 mb-6">Website Health Score</h3>
      
      <div className="flex items-center justify-between mb-8">
        <div className="relative w-32 h-32 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={60}
                startAngle={225}
                endAngle={-45}
                dataKey="value"
                stroke="none"
              >
                <Cell fill={color} />
                <Cell fill="#334155" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white" style={{ color }}>{score}</span>
            <span className="text-xs text-slate-500">/ 100</span>
          </div>
        </div>

        <div className="flex-1 ml-8 space-y-4">
          {Object.entries(breakdown).map(([key, value]) => (
            <div key={key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span className="text-white font-medium">{value}</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5">
                <div 
                  className="h-1.5 rounded-full" 
                  style={{ width: `${value}%`, backgroundColor: getColor(value) }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {explanations.length > 0 && (
        <div className="mt-2 p-3 bg-slate-900/50 rounded-lg border border-slate-800">
          <h4 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Key Insights</h4>
          <ul className="space-y-1">
            {explanations.map((exp, i) => (
              <li key={i} className="text-xs text-slate-300 flex items-start">
                <span className="mr-2 text-indigo-500">•</span>
                {exp}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
