import React, { useEffect, useState } from 'react';
import { useSite } from '../contexts/SiteContext';
import { api } from '../lib/api';
import { DataTable } from '../components/tables/DataTable';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';
import { format } from 'date-fns';
import { Plus, Bell } from 'lucide-react';

export function Alerts() {
  const { currentSite } = useSite();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentSite) return;
    setLoading(true);
    Promise.all([
      api.getAlerts(currentSite.id),
      api.getAlertHistory(currentSite.id)
    ])
      .then(([alertsRes, historyRes]) => {
        setAlerts(alertsRes.alerts || alertsRes);
        setHistory(historyRes.history || historyRes);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentSite?.id]);

  const handleDelete = async (id: string) => {
    if (!currentSite) return;
    try {
      await api.deleteAlert(currentSite.id, id);
      setAlerts(alerts.filter(a => a.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><LoadingSpinner size={48} /></div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Alerts</h1>
          <p className="text-sm text-slate-400 mt-1">Manage notification rules and view alert history</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" />
          Create Alert
        </button>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Bell className="w-5 h-5 text-indigo-400" /> Alert Rules</h2>
        <DataTable 
          data={alerts} 
          columns={[
            { header: 'Name', accessorKey: 'name', cell: (item) => <span className="font-medium">{item.name}</span> },
            { header: 'Metric', accessorKey: 'metric' },
            { header: 'Condition', accessorKey: 'condition', cell: (item) => `${item.condition} ${item.threshold}` },
            { header: 'Severity', accessorKey: 'severity', cell: (item) => <Badge variant={item.severity === 'critical' ? 'error' : 'warning'}>{item.severity}</Badge> },
            { header: 'Status', accessorKey: 'enabled', cell: (item) => <Badge variant={item.enabled ? 'success' : 'neutral'}>{item.enabled ? 'Enabled' : 'Disabled'}</Badge> },
            { header: 'Actions', accessorKey: 'id', cell: (item) => (
              <button onClick={() => handleDelete(item.id)} className="text-rose-400 hover:text-rose-300 text-xs font-medium">Delete</button>
            )}
          ]} 
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Alert History</h2>
        <DataTable 
          data={history} 
          columns={[
            { header: 'Time', accessorKey: 'triggeredAt', cell: (item) => format(new Date(item.triggeredAt), 'MMM d, HH:mm:ss') },
            { header: 'Severity', accessorKey: 'severity', cell: (item) => <Badge variant={item.severity === 'critical' ? 'error' : 'warning'}>{item.severity}</Badge> },
            { header: 'Message', accessorKey: 'message', cell: (item) => <span className="text-slate-300">{item.message}</span> }
          ]} 
        />
      </div>
    </div>
  );
}
