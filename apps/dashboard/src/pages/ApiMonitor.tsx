import React, { useEffect, useState } from 'react';
import { useSite } from '../contexts/SiteContext';
import { api } from '../lib/api';
import { DataTable } from '../components/tables/DataTable';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';

export function ApiMonitor() {
  const { currentSite } = useSite();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentSite) return;
    setLoading(true);
    api.getApis(currentSite.id)
      .then(res => setData(res.apis || res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentSite?.id]);

  if (loading) return <div className="h-full flex items-center justify-center"><LoadingSpinner size={48} /></div>;

  const getMethodBadge = (method: string) => {
    const colors: Record<string, 'success'|'info'|'warning'|'error'|'neutral'> = {
      GET: 'success',
      POST: 'info',
      PUT: 'warning',
      DELETE: 'error',
      PATCH: 'warning'
    };
    return <Badge variant={colors[method] || 'neutral'}>{method}</Badge>;
  };

  const getErrorRateBadge = (rate: number) => {
    if (rate < 1) return <Badge variant="success">{rate.toFixed(1)}%</Badge>;
    if (rate < 5) return <Badge variant="warning">{rate.toFixed(1)}%</Badge>;
    return <Badge variant="error">{rate.toFixed(1)}%</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">API Monitor</h1>
        <p className="text-sm text-slate-400 mt-1">Track external API calls and performance</p>
      </div>

      <DataTable 
        data={data}
        pagination={{ pageSize: 15 }}
        columns={[
          { header: 'Method', accessorKey: 'method', cell: (item) => getMethodBadge(item.method) },
          { header: 'Path', accessorKey: 'path' },
          { header: 'Requests', accessorKey: 'requests' },
          { header: 'Avg Latency', accessorKey: 'avgLatency', cell: (item) => `${Math.round(item.avgLatency)}ms` },
          { header: 'p95', accessorKey: 'p95', cell: (item) => `${Math.round(item.p95)}ms` },
          { header: 'p99', accessorKey: 'p99', cell: (item) => `${Math.round(item.p99)}ms` },
          { header: 'Error Rate', accessorKey: 'errorRate', cell: (item) => getErrorRateBadge(item.errorRate) }
        ]}
      />
    </div>
  );
}
