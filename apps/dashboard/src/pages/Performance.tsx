import React, { useEffect, useState } from 'react';
import { useSite } from '../contexts/SiteContext';
import { api } from '../lib/api';
import { MetricCard } from '../components/charts/MetricCard';
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart';
import { DataTable } from '../components/tables/DataTable';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Zap, Layout, Pointer, Timer } from 'lucide-react';

export function Performance() {
  const { currentSite } = useSite();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentSite) return;
    setLoading(true);
    api.getPerformance(currentSite.id)
      .then(res => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentSite?.id]);

  if (loading) return <div className="h-full flex items-center justify-center"><LoadingSpinner size={48} /></div>;
  if (!data) return <div>No data</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Performance Overview</h1>
        <p className="text-sm text-slate-400 mt-1">Core Web Vitals and load times</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="LCP (Largest Contentful Paint)" value={`${data.vitals?.lcp || 0}ms`} icon={<Layout className="w-5 h-5" />} color={(data.vitals?.lcp || 0) < 2500 ? 'emerald' : 'amber'} />
        <MetricCard title="CLS (Cumulative Layout Shift)" value={(data.vitals?.cls || 0).toFixed(3)} icon={<Zap className="w-5 h-5" />} color={(data.vitals?.cls || 0) < 0.1 ? 'emerald' : 'amber'} />
        <MetricCard title="INP (Interaction to Next Paint)" value={`${data.vitals?.inp || 0}ms`} icon={<Pointer className="w-5 h-5" />} color={(data.vitals?.inp || 0) < 200 ? 'emerald' : 'amber'} />
        <MetricCard title="FCP (First Contentful Paint)" value={`${data.vitals?.fcp || 0}ms`} icon={<Timer className="w-5 h-5" />} color={(data.vitals?.fcp || 0) < 1800 ? 'emerald' : 'amber'} />
      </div>

      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-1">
        <TimeSeriesChart 
          data={data.timeline || []} 
          dataKey="avgLoadTime" 
          xAxisKey="time" 
          title="Average Page Load Time (ms)" 
          color="#8b5cf6"
        />
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-4">Performance by Route</h3>
        <DataTable 
          data={data.routes || []} 
          columns={[
            { header: 'Path', accessorKey: 'path' },
            { header: 'Views', accessorKey: 'views' },
            { header: 'Avg Load Time', accessorKey: 'loadTime', cell: (item) => `${Math.round(item.loadTime)}ms` },
            { header: 'LCP', accessorKey: 'lcp', cell: (item) => `${Math.round(item.lcp)}ms` }
          ]} 
        />
      </div>
    </div>
  );
}
