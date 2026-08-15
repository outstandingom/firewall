import React, { useEffect, useState } from 'react';
import { useSite } from '../contexts/SiteContext';
import { api } from '../lib/api';
import { DataTable } from '../components/tables/DataTable';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';
import { format } from 'date-fns';
import { ShieldAlert, Globe, Plus, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Anomalies() {
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
    api.getAnomalies(currentSite.id)
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.anomalies || []);
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
        <p className="text-slate-400 text-sm mb-6">Select a website or add one to start tracking statistical anomalies.</p>
        <button onClick={() => navigate('/sites')} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm">
          <Plus className="w-4 h-4" /> Go to Sites
        </button>
      </div>
    );
  }

  const getSeverityBadge = (severity: string, score: number) => {
    const sev = severity?.toUpperCase();
    if (sev === 'CRITICAL' || score >= 0.8) return <Badge variant="error">CRITICAL</Badge>;
    if (sev === 'WARNING' || score >= 0.5) return <Badge variant="warning">WARNING</Badge>;
    return <Badge variant="info">INFO</Badge>;
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          Adaptive Anomaly Detection
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Real-time statistical anomaly and deviation tracking for <span className="text-indigo-300 font-medium">{currentSite.name}</span>
        </p>
      </div>

      <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-slate-200">Detected Incident Reports</h3>
        </div>

        <DataTable 
          data={data}
          pagination={{ pageSize: 15 }}
          columns={[
            { 
              header: 'Severity', 
              accessorKey: 'severity', 
              cell: (item) => getSeverityBadge(item.severity, item.anomaly_score ?? item.score ?? 0) 
            },
            { 
              header: 'Metric', 
              accessorKey: 'metric_name', 
              cell: (item) => <span className="font-semibold text-slate-200">{item.metric_name || item.metric || 'General'}</span> 
            },
            { 
              header: 'Root Cause Explanation', 
              accessorKey: 'explanation', 
              cell: (item) => <div className="max-w-md text-xs text-slate-300 leading-relaxed">{item.explanation || 'Anomaly detected by statistical threshold.'}</div> 
            },
            { 
              header: 'Expected vs Actual', 
              accessorKey: 'expected_value', 
              cell: (item) => {
                const exp = item.expected_value ?? item.expected ?? 'baseline';
                const act = item.actual_value ?? item.actual ?? 'spike';
                return (
                  <span className="text-xs font-mono">
                    {exp} → <span className="text-rose-400 font-bold">{act}</span>
                  </span>
                );
              } 
            },
            { 
              header: 'Detected Time', 
              accessorKey: 'detected_at', 
              cell: (item) => {
                const ts = item.detected_at || item.detectedAt;
                return ts ? format(new Date(ts), 'MMM d, HH:mm') : 'Just now';
              } 
            }
          ]} 
        />
        {data.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            ✨ No anomalies detected. Telemetry baselines are steady within standard deviation limits.
          </div>
        )}
      </div>
    </div>
  );
}
