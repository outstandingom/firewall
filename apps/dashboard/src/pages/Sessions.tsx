import React, { useEffect, useState } from 'react';
import { useSite } from '../contexts/SiteContext';
import { api } from '../lib/api';
import { TimeRangeSelector, TimeRange } from '../components/common/TimeRangeSelector';
import { DataTable } from '../components/tables/DataTable';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { format } from 'date-fns';
import { Users, Globe, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Sessions() {
  const { currentSite } = useSite();
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>({ from: new Date(Date.now() - 24*60*60*1000), to: new Date(), label: '24h' });

  useEffect(() => {
    if (!currentSite?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getSessions(currentSite.id, { range: timeRange.label })
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data || res?.sessions || []);
        setData(list);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentSite?.id, timeRange]);

  if (loading) return <div className="h-full flex items-center justify-center py-24"><LoadingSpinner size={48} /></div>;

  if (!currentSite) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <Globe className="w-16 h-16 text-indigo-400 mx-auto mb-4 opacity-80" />
        <h2 className="text-2xl font-bold text-white mb-2">No Website Selected</h2>
        <p className="text-slate-400 text-sm mb-6">Select a website or add one to start exploring user sessions.</p>
        <button onClick={() => navigate('/sites')} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm">
          <Plus className="w-4 h-4" /> Go to Sites
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 p-5 rounded-xl border border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            User Sessions Explorer
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">Individual visitor session logs for <span className="text-indigo-300 font-medium">{currentSite.name}</span></p>
        </div>
        <TimeRangeSelector onRangeChange={setTimeRange} />
      </div>

      <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80">
        <DataTable 
          data={data}
          pagination={{ pageSize: 15 }}
          columns={[
            { 
              header: 'Visitor ID', 
              accessorKey: 'visitor_id', 
              cell: (item) => {
                const vid = item.visitor_id || item.visitorId || 'anon';
                return <span className="font-mono text-xs text-indigo-400 font-semibold">{vid.substring(0, 10)}...</span>;
              }
            },
            { 
              header: 'Start Time', 
              accessorKey: 'started_at', 
              cell: (item) => {
                const ts = item.started_at || item.startTime;
                return ts ? format(new Date(ts), 'MMM d, HH:mm:ss') : 'Just now';
              } 
            },
            { 
              header: 'Duration', 
              accessorKey: 'duration_ms', 
              cell: (item) => `${Math.round((item.duration_ms || item.duration || 0) / 1000)}s` 
            },
            { header: 'Page Views', accessorKey: 'page_count', cell: (item) => item.page_count ?? item.pagesCount ?? 1 },
            { header: 'Device', accessorKey: 'device_type', cell: (item) => item.device_type || item.device || 'Desktop' },
            { header: 'Browser', accessorKey: 'browser', cell: (item) => item.browser || 'Unknown' },
            { 
              header: 'Entry Page', 
              accessorKey: 'entry_page', 
              cell: (item) => <span className="truncate max-w-[150px] inline-block font-mono text-xs text-slate-300">{item.entry_page || item.entryPage || '/'}</span> 
            }
          ]}
        />
        {data.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            No visitor sessions recorded yet. Telemetry will automatically track session start, end, and duration once your script is loaded.
          </div>
        )}
      </div>
    </div>
  );
}
