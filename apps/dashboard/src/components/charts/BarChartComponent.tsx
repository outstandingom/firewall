import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BarChartComponentProps {
  data: any[];
  dataKey: string;
  nameKey: string;
  color?: string;
  title?: string;
  layout?: 'horizontal' | 'vertical';
  height?: number;
}

export function BarChartComponent({
  data,
  dataKey,
  nameKey,
  color = '#6366f1',
  title,
  layout = 'horizontal',
  height = 300
}: BarChartComponentProps) {
  return (
    <div className="w-full flex flex-col bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
      {title && <h3 className="text-sm font-medium text-slate-300 mb-4">{title}</h3>}
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout={layout} margin={{ top: 10, right: 10, left: layout === 'vertical' ? 40 : 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={layout === 'horizontal'} vertical={layout === 'vertical'} />
            <XAxis 
              type={layout === 'vertical' ? 'number' : 'category'} 
              dataKey={layout === 'vertical' ? undefined : nameKey}
              stroke="#64748b" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              type={layout === 'vertical' ? 'category' : 'number'}
              dataKey={layout === 'vertical' ? nameKey : undefined}
              stroke="#64748b" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
            />
            <Tooltip 
              cursor={{ fill: '#334155', opacity: 0.4 }}
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '0.5rem' }}
            />
            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 4, 4]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
