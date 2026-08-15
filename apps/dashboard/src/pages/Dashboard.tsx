import React, { useEffect, useState } from 'react';
import { useSite } from '../contexts/SiteContext';
import { api } from '../lib/api';
import { useRealtime } from '../lib/sse';
import { HealthScore } from '../components/charts/HealthScore';
import { MetricCard } from '../components/charts/MetricCard';
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart';
import { DataTable } from '../components/tables/DataTable';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Users, Activity, AlertTriangle, Clock, ActivitySquare, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';

export function Dashboard() {
  const { currentSite } = useSite();
  const [overview, setOverview] = useState<any>(null);
  const [traffic, setTraffic] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { data: realtimeData } = useRealtime(currentSite?.id);

  const fetchData = async () => {
    if (!currentSite) return;
    try {
      const [overviewData, trafficData] = await Promise.all([
        api.getSiteOverview(currentSite.id),
        api.getTraffic(currentSite.id, { timeframe: '24h' })
      ]);
      setOverview(overviewData);
      setTraffic(trafficData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [currentSite?.id]);

  if (loading) return <div className="h-full flex items-center justify-center"><LoadingSpinner size={48} /></div>;
  if (!overview) return <EmptyState icon={<Activity className="w-12 h-12" />} title="No data" description="Could not load dashboard data" />;

  // Real-time overrides or fallbacks
  const activeUsers = realtimeData?.activeUsers || overview.activeUsers || 0;
  const requestsPerMin = realtimeData?.requestsPerMin || overview.requestsPerMin || 0;
  const errorsPerMin = realtimeData?.errorsPerMin || overview.errorsPerMin || 0;
  const avgLatency = realtimeData?.avgLatency || overview.avgLatency || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-6">
        <div className="w-full sm:w-1/3 min-w-[300px]">
          <HealthScore 
            score={overview.healthScore?.score || 85} 
            breakdown={overview.healthScore?.breakdown || { performance: 90, reliability: 80, apiHealth: 85, frontend: 88 }} 
            explanations={overview.healthScore?.explanations || ["Performance is good", "Minor API latency detected"]} 
          />
        </div>
        <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Active Users" value={activeUsers} change={12} trend="up" icon={<Users className="w-5 h-5" />} color="indigo" />
          <MetricCard title="Requests/min" value={requestsPerMin} change={5} trend="up" icon={<Activity className="w-5 h-5" />} color="emerald" />
          <MetricCard title="Errors/min" value={errorsPerMin} change={-2} trend="down" icon={<AlertTriangle className="w-5 h-5" />} color={errorsPerMin > 10 ? 'rose' : 'slate'} />
          <MetricCard title="Avg Latency" value={`${avgLatency}ms`} change={15} trend="down" icon={<Clock className="w-5 h-5" />} color={avgLatency > 500 ? 'amber' : 'slate'} />
        </div>
      </div>

      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-1">
        <TimeSeriesChart 
          data={traffic?.timeline || []} 
          dataKey="pageViews" 
          xAxisKey="time" 
          title="Traffic Over Time (24h)" 
          color="#3b82f6"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center"><ActivitySquare className="w-4 h-4 mr-2" /> Top Pages</h3>
          <DataTable 
            data={overview.topPages?.slice(0,5) || []} 
            columns={[
              { header: 'Path', accessorKey: 'path' },
              { header: 'Views', accessorKey: 'views' }
            ]} 
          />
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center"><Zap className="w-4 h-4 mr-2" /> Top APIs</h3>
          <DataTable 
            data={overview.topApis?.slice(0,5) || []} 
            columns={[
              { header: 'Method', accessorKey: 'method', cell: (item) => <Badge variant="info">{item.method}</Badge> },
              { header: 'Path', accessorKey: 'path' },
              { header: 'Latency', accessorKey: 'avgLatency', cell: (item) => `${item.avgLatency}ms` }
            ]} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center"><AlertTriangle className="w-4 h-4 mr-2 text-rose-500" /> Recent Errors</h3>
          <DataTable 
            data={overview.recentErrors?.slice(0,5) || []} 
            columns={[
              { header: 'Message', accessorKey: 'message', cell: (item) => <div className="truncate max-w-xs">{item.message}</div> },
              { header: 'Count', accessorKey: 'occurrences' },
              { header: 'Time', accessorKey: 'lastSeen', cell: (item) => format(new Date(item.lastSeen), 'HH:mm:ss') }
            ]} 
          />
        </div>
        <div>
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center"><ShieldAlert className="w-4 h-4 mr-2 text-amber-500" /> Recent Anomalies</h3>
          <DataTable 
            data={overview.recentAnomalies?.slice(0,5) || []} 
            columns={[
              { header: 'Metric', accessorKey: 'metric' },
              { header: 'Score', accessorKey: 'score', cell: (item) => <Badge variant={item.score > 0.8 ? 'error' : 'warning'}>{(item.score * 100).toFixed(0)}</Badge> },
              { header: 'Detected', accessorKey: 'detectedAt', cell: (item) => format(new Date(item.detectedAt), 'MMM d, HH:mm') }
            ]} 
          />
        </div>
      </div>
    </div>
  );
}
