import React, { useEffect, useState } from 'react';
import { useSite } from '../contexts/SiteContext';
import { api } from '../lib/api';
import { TimeRangeSelector, TimeRange } from '../components/common/TimeRangeSelector';
import { MetricCard } from '../components/charts/MetricCard';
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart';
import { PieChartComponent } from '../components/charts/PieChartComponent';
import { DataTable } from '../components/tables/DataTable';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Users, Eye, MousePointerClick, Clock, ArrowRightLeft } from 'lucide-react';

export function Traffic() {
  const { currentSite } = useSite();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>({ from: new Date(Date.now() - 24*60*60*1000), to: new Date(), label: '24h' });

  useEffect(() => {
    if (!currentSite) return;
    setLoading(true);
    api.getTraffic(currentSite.id, { timeframe: timeRange.label })
      .then(res => {
        setData(res);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentSite?.id, timeRange]);

  if (loading) return <div className="h-full flex items-center justify-center"><LoadingSpinner size={48} /></div>;
  if (!data) return <div>No data</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Traffic Analytics</h1>
          <p className="text-sm text-slate-400 mt-1">Monitor visitor traffic and behavior</p>
        </div>
        <TimeRangeSelector onRangeChange={setTimeRange} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Visitors" value={data.overview?.totalVisitors || 0} icon={<Users className="w-5 h-5" />} color="indigo" />
        <MetricCard title="Page Views" value={data.overview?.pageViews || 0} icon={<Eye className="w-5 h-5" />} color="emerald" />
        <MetricCard title="Avg Duration" value={`${Math.round(data.overview?.avgDuration || 0)}s`} icon={<Clock className="w-5 h-5" />} color="amber" />
        <MetricCard title="Bounce Rate" value={`${(data.overview?.bounceRate || 0).toFixed(1)}%`} icon={<ArrowRightLeft className="w-5 h-5" />} color="rose" />
      </div>

      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-1">
        <TimeSeriesChart 
          data={data.timeline || []} 
          dataKey="pageViews" 
          xAxisKey="time" 
          title="Page Views Over Time" 
          color="#10b981"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PieChartComponent data={data.devices || []} dataKey="count" nameKey="device" title="Devices" />
        <PieChartComponent data={data.browsers || []} dataKey="count" nameKey="browser" title="Browsers" />
        <PieChartComponent data={data.os || []} dataKey="count" nameKey="os" title="Operating Systems" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-4">Top Pages</h3>
          <DataTable 
            data={data.topPages || []} 
            columns={[
              { header: 'Path', accessorKey: 'path' },
              { header: 'Views', accessorKey: 'views' }
            ]} 
          />
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-4">Top Referrers</h3>
          <DataTable 
            data={data.topReferrers || []} 
            columns={[
              { header: 'Source', accessorKey: 'source' },
              { header: 'Visitors', accessorKey: 'visitors' }
            ]} 
          />
        </div>
      </div>
    </div>
  );
}
