import React, { useEffect, useState } from 'react';
import { useSite } from '../contexts/SiteContext';
import { api } from '../lib/api';
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart';
import { DataTable } from '../components/tables/DataTable';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';
import { format } from 'date-fns';

export function Anomalies() {
  const { currentSite } = useSite();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentSite) return;
    setLoading(true);
    api.getAnomalies(currentSite.id)
      .then(res => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentSite?.id]);

  if (loading) return <div className="h-full flex items-center justify-center"><LoadingSpinner size={48} /></div>;
  if (!data) return <div>No data</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Anomalies</h1>
        <p className="text-sm text-slate-400 mt-1">AI-detected abnormal patterns in traffic and performance</p>
      </div>

      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 p-1">
        <TimeSeriesChart 
          data={data.timeline || []} 
          dataKey="score" 
          xAxisKey="time" 
          title="Anomaly Score Timeline" 
          color="#f59e0b"
        />
      </div>

      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-4">Detected Anomalies</h3>
        <DataTable 
          data={data.anomalies || []} 
          columns={[
            { header: 'Severity', accessorKey: 'score', cell: (item) => <Badge variant={item.score > 0.8 ? 'error' : 'warning'}>{item.score > 0.8 ? 'High' : 'Medium'}</Badge> },
            { header: 'Metric', accessorKey: 'metric' },
            { header: 'Explanation', accessorKey: 'explanation' },
            { header: 'Expected vs Actual', accessorKey: 'expected', cell: (item) => <span className="text-xs">{item.expected} → <span className="text-rose-400 font-semibold">{item.actual}</span></span> },
            { header: 'Detected', accessorKey: 'detectedAt', cell: (item) => format(new Date(item.detectedAt), 'MMM d, HH:mm') }
          ]} 
        />
      </div>
    </div>
  );
}
