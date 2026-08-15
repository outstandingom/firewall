import React, { useEffect, useState } from 'react';
import { useSite } from '../contexts/SiteContext';
import { api } from '../lib/api';
import { DataTable } from '../components/tables/DataTable';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';
import { Globe, Plus, ActivitySquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ApiMonitor() {
  const { currentSite } = useSite();
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentSite?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getApis(currentSite.id)
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.apis || []);
        setData(list);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentSite?.id]);

  if (loading) return <div className="h-full flex items-center justify-center py-24"><LoadingSpinner size={48} /></div>;

  if (!currentSite) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <Globe className="w-16 h-16 text-indigo-400 mx-auto mb-4 opacity-80" />
        <h2 className="text-2xl font-bold text-white mb-2">No Website Selected</h2>
        <p className="text-slate-400 text-sm mb-6">Select a website or add one to start tracking outbound and internal API metrics.</p>
        <button onClick={() => navigate('/sites')} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm">
          <Plus className="w-4 h-4" /> Go to Sites
        </button>
      </div>
    );
  }

  const getMethodBadge = (method: string) => {
    const colors: Record<string, 'success'|'info'|'warning'|'error'|'neutral'> = {
      GET: 'success',
      POST: 'info',
      PUT: 'warning',
      DELETE: 'error',
      PATCH: 'warning'
    };
    return <Badge variant={colors[method] || 'neutral'}>{method || 'GET'}</Badge>;
  };

  const getErrorRateBadge = (rate: number) => {
    const r = rate || 0;
    if (r < 1) return <Badge variant="success">{r.toFixed(1)}%</Badge>;
    if (r < 5) return <Badge variant="warning">{r.toFixed(1)}%</Badge>;
    return <Badge variant="error">{r.toFixed(1)}%</Badge>;
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <ActivitySquare className="w-5 h-5 text-indigo-400" />
          API & Network Monitor
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Automatic endpoint discovery, latency percentiles, and error rate tracking for <span className="text-indigo-300 font-medium">{currentSite.name}</span>
        </p>
      </div>

      <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80">
        <DataTable 
          data={data}
          pagination={{ pageSize: 15 }}
          columns={[
            { header: 'Method', accessorKey: 'method', cell: (item) => getMethodBadge(item.method) },
            { header: 'Endpoint Path', accessorKey: 'normalized_path', cell: (item) => item.normalized_path || item.path || '/' },
            { header: 'Total Requests', accessorKey: 'request_count', cell: (item) => item.request_count ?? item.requests ?? 0 },
            { header: 'Avg Latency', accessorKey: 'avg_duration_ms', cell: (item) => `${Math.round(item.avg_duration_ms ?? item.avgLatency ?? 0)}ms` },
            { header: 'p95 Latency', accessorKey: 'p95_duration_ms', cell: (item) => `${Math.round(item.p95_duration_ms ?? item.p95 ?? 0)}ms` },
            { header: 'p99 Latency', accessorKey: 'p99_duration_ms', cell: (item) => `${Math.round(item.p99_duration_ms ?? item.p99 ?? 0)}ms` },
            { header: 'Error Rate', accessorKey: 'error_rate', cell: (item) => getErrorRateBadge(item.error_rate ?? item.errorRate ?? 0) }
          ]}
        />
        {data.length === 0 && (
          <div className="text-center py-10 text-slate-500 text-sm">
            No API requests recorded yet. Telemetry will automatically discover and list your `fetch()` and `XMLHttpRequest` calls once the SDK is loaded on your site.
          </div>
        )}
      </div>
    </div>
  );
}
