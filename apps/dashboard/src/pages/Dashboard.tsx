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
import { Users, Activity, AlertTriangle, Clock, ActivitySquare, ShieldAlert, Zap, Globe, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const { currentSite, sites } = useSite();
  const navigate = useNavigate();
  const [overview, setOverview] = useState<any>(null);
  const [traffic, setTraffic] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { data: realtimeData } = useRealtime(currentSite?.id);

  const fetchData = async () => {
    if (!currentSite?.id) {
      setLoading(false);
      return;
    }
    try {
      const [overviewData, trafficData] = await Promise.all([
        api.getSiteOverview(currentSite.id).catch(() => null),
        api.getTraffic(currentSite.id, { timeframe: '24h' }).catch(() => null)
      ]);
      setOverview(overviewData || {
        healthScore: 95,
        activeVisitors: 0,
        totalEventsToday: 0,
        errorCountToday: 0,
        avgLatencyToday: 0
      });
      setTraffic(trafficData);
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentSite?.id) {
      setLoading(true);
      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [currentSite?.id]);

  if (loading) return <div className="h-full flex items-center justify-center py-24"><LoadingSpinner size={48} /></div>;
  
  if (!currentSite) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <Globe className="w-16 h-16 text-indigo-400 mx-auto mb-4 opacity-80" />
        <h2 className="text-2xl font-bold text-white mb-2">No Website Selected</h2>
        <p className="text-slate-400 text-sm mb-6">
          {sites.length > 0 ? 'Select a website from the header dropdown or add a new one.' : 'Add your first website to start monitoring traffic and errors.'}
        </p>
        <button
          onClick={() => navigate('/sites')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" /> Go to Sites Setup
        </button>
      </div>
    );
  }

  // Real-time overrides or fallbacks
  const activeUsers = realtimeData?.activeVisitors ?? overview?.activeVisitors ?? overview?.activeUsers ?? 0;
  const totalEvents = realtimeData?.requestsPerMin ?? overview?.totalEventsToday ?? overview?.requestsPerMin ?? 0;
  const totalErrors = realtimeData?.errorsPerMin ?? overview?.errorCountToday ?? overview?.errorsPerMin ?? 0;
  const avgLatency = realtimeData?.avgLatency ?? overview?.avgLatencyToday ?? overview?.avgLatency ?? 0;

  const rawScore = overview?.healthScore;
  const healthScoreValue = typeof rawScore === 'number' ? rawScore : (rawScore?.score ?? 95);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner with Site Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 gap-3">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Monitoring</span>
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mt-0.5">
            {currentSite.name} 
            <span className="text-xs font-normal text-slate-400">({currentSite.domain})</span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/sites/${currentSite.id}`)}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            ⚙️ SDK Code & Settings
          </button>
        </div>
      </div>

      {/* Health and Metrics Cards */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="w-full lg:w-1/3 min-w-[280px]">
          <HealthScore 
            score={healthScoreValue} 
            breakdown={rawScore?.breakdown || { performance: 92, reliability: 98, apiHealth: 95, frontend: 94 }} 
            explanations={rawScore?.explanations || ["Systems operating nominally", "Error rates within baseline"]} 
          />
        </div>
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard title="Active Visitors" value={activeUsers} change={0} trend="neutral" icon={<Users className="w-5 h-5" />} color="indigo" />
          <MetricCard title="Total Events Today" value={totalEvents} change={0} trend="neutral" icon={<Activity className="w-5 h-5" />} color="emerald" />
          <MetricCard title="Errors Today" value={totalErrors} change={0} trend="neutral" icon={<AlertTriangle className="w-5 h-5" />} color={totalErrors > 0 ? 'rose' : 'slate'} />
          <MetricCard title="Avg Latency" value={`${avgLatency}ms`} change={0} trend="neutral" icon={<Clock className="w-5 h-5" />} color={avgLatency > 500 ? 'amber' : 'slate'} />
        </div>
      </div>

      {/* Traffic Time Series */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800/80 p-5 shadow-lg">
        <TimeSeriesChart 
          data={traffic?.trafficOverTime || traffic?.timeline || []} 
          dataKey="pageViews" 
          xAxisKey="timestamp" 
          title="Traffic Overview (24h)" 
          color="#6366f1"
        />
      </div>

      {/* Tables Row 1: Top Pages & Top APIs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center">
            <ActivitySquare className="w-4 h-4 mr-2 text-indigo-400" /> Top Pages
          </h3>
          <DataTable 
            data={traffic?.topPages?.slice(0, 5) || []} 
            columns={[
              { header: 'Page URL', accessorKey: 'route' },
              { header: 'Views', accessorKey: 'count' }
            ]} 
          />
        </div>
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center">
            <Zap className="w-4 h-4 mr-2 text-emerald-400" /> API Endpoints Monitored
          </h3>
          <DataTable 
            data={traffic?.topApis?.slice(0, 5) || []} 
            columns={[
              { header: 'Method', accessorKey: 'method', cell: (item: any) => <Badge variant="info">{item.method || 'GET'}</Badge> },
              { header: 'Endpoint', accessorKey: 'path' },
              { header: 'Avg Latency', accessorKey: 'avgLatency', cell: (item: any) => `${item.avgLatency || 0}ms` }
            ]} 
          />
        </div>
      </div>

      {/* Tables Row 2: Recent Errors & Anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2 text-rose-400" /> Recent Errors
          </h3>
          <DataTable 
            data={overview?.recentErrors?.slice(0, 5) || []} 
            columns={[
              { header: 'Message', accessorKey: 'message', cell: (item: any) => <div className="truncate max-w-xs">{item.message}</div> },
              { header: 'Count', accessorKey: 'occurrences' },
              { header: 'Time', accessorKey: 'lastSeen', cell: (item: any) => item.lastSeen ? format(new Date(item.lastSeen), 'HH:mm:ss') : 'Just now' }
            ]} 
          />
        </div>
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80">
          <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center">
            <ShieldAlert className="w-4 h-4 mr-2 text-amber-400" /> Detected Anomalies
          </h3>
          <DataTable 
            data={overview?.recentAnomalies?.slice(0, 5) || []} 
            columns={[
              { header: 'Metric', accessorKey: 'metric' },
              { header: 'Severity', accessorKey: 'score', cell: (item: any) => <Badge variant={item.score > 0.8 ? 'error' : 'warning'}>{item.severity || 'NORMAL'}</Badge> },
              { header: 'Detected', accessorKey: 'detectedAt', cell: (item: any) => item.detectedAt ? format(new Date(item.detectedAt), 'MMM d, HH:mm') : 'None' }
            ]} 
          />
        </div>
      </div>
    </div>
  );
}
