import React, { useEffect, useState } from 'react';
import { useSite } from '../contexts/SiteContext';
import { api } from '../lib/api';
import { TimeRangeSelector, TimeRange } from '../components/common/TimeRangeSelector';
import { MetricCard } from '../components/charts/MetricCard';
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart';
import { PieChartComponent } from '../components/charts/PieChartComponent';
import { DataTable } from '../components/tables/DataTable';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Users, Eye, Clock, ArrowRightLeft, Globe, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Traffic() {
  const { currentSite } = useSite();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>({ from: new Date(Date.now() - 24*60*60*1000), to: new Date(), label: '24h' });

  useEffect(() => {
    if (!currentSite?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getTraffic(currentSite.id, { range: timeRange.label, from: timeRange.from.toISOString(), to: timeRange.to.toISOString() })
      .then(res => {
        setData(res);
      })
      .catch(err => {
        console.error('Error loading traffic data:', err);
      })
      .finally(() => setLoading(false));
  }, [currentSite?.id, timeRange]);

  if (loading) return <div className="h-full flex items-center justify-center py-24"><LoadingSpinner size={48} /></div>;

  if (!currentSite) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <Globe className="w-16 h-16 text-indigo-400 mx-auto mb-4 opacity-80" />
        <h2 className="text-2xl font-bold text-white mb-2">No Website Selected</h2>
        <p className="text-slate-400 text-sm mb-6">Select a website or add one to start seeing traffic analytics.</p>
        <button onClick={() => navigate('/sites')} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm">
          <Plus className="w-4 h-4" /> Go to Sites
        </button>
      </div>
    );
  }

  const totalVisitors = data?.visitors ?? data?.totalVisitors ?? data?.overview?.totalVisitors ?? 0;
  const pageViews = data?.pageViews ?? data?.overview?.pageViews ?? 0;
  const avgDuration = data?.avgSessionDuration ?? data?.overview?.avgDuration ?? 0;
  const bounceRate = data?.bounceRate ?? data?.overview?.bounceRate ?? 0;

  // Format device/browser/os data for charts
  const deviceData = data?.deviceDistribution 
    ? Object.entries(data.deviceDistribution).map(([name, count]) => ({ name, count })) 
    : (data?.devices || []);

  const browserData = data?.browserDistribution 
    ? Object.entries(data.browserDistribution).map(([name, count]) => ({ name, count })) 
    : (data?.browsers || []);

  const osData = data?.osDistribution 
    ? Object.entries(data.osDistribution).map(([name, count]) => ({ name, count })) 
    : (data?.os || []);

  const timelineData = (data?.trafficOverTime || data?.timeline || []).map((item: any) => ({
    time: item.timestamp ? item.timestamp.substring(11, 16) : item.time || '',
    pageViews: item.views ?? item.pageViews ?? 0,
    visitors: item.visitors ?? 0
  }));

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-5 rounded-xl border border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold text-white">Traffic Analytics</h1>
          <p className="text-sm text-slate-400 mt-0.5">Live visitor metrics for <span className="text-indigo-300 font-medium">{currentSite.name}</span></p>
        </div>
        <TimeRangeSelector onRangeChange={setTimeRange} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Visitors" value={totalVisitors} icon={<Users className="w-5 h-5" />} color="indigo" />
        <MetricCard title="Page Views" value={pageViews} icon={<Eye className="w-5 h-5" />} color="emerald" />
        <MetricCard title="Avg Duration" value={`${Math.round(avgDuration / 1000)}s`} icon={<Clock className="w-5 h-5" />} color="amber" />
        <MetricCard title="Bounce Rate" value={`${bounceRate.toFixed(1)}%`} icon={<ArrowRightLeft className="w-5 h-5" />} color="rose" />
      </div>

      <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-5 shadow-lg">
        <TimeSeriesChart 
          data={timelineData} 
          dataKey="pageViews" 
          xAxisKey="time" 
          title="Page Views Over Time" 
          color="#10b981"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80">
          <PieChartComponent data={deviceData.length > 0 ? deviceData : [{ name: 'Desktop', count: 1 }]} dataKey="count" nameKey="name" title="Device Types" />
        </div>
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80">
          <PieChartComponent data={browserData.length > 0 ? browserData : [{ name: 'Chrome', count: 1 }]} dataKey="count" nameKey="name" title="Browsers" />
        </div>
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80">
          <PieChartComponent data={osData.length > 0 ? osData : [{ name: 'Windows', count: 1 }]} dataKey="count" nameKey="name" title="Operating Systems" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Top Pages</h3>
          <DataTable 
            data={data?.topPages || []} 
            columns={[
              { header: 'URL Path', accessorKey: 'route' },
              { header: 'Visits', accessorKey: 'count' }
            ]} 
          />
        </div>
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Top Referrers</h3>
          <DataTable 
            data={data?.topReferrers || []} 
            columns={[
              { header: 'Referrer Domain', accessorKey: 'referrer' },
              { header: 'Visits', accessorKey: 'count' }
            ]} 
          />
        </div>
      </div>
    </div>
  );
}
