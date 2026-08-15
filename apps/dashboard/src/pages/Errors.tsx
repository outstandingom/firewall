import React, { useEffect, useState } from 'react';
import { useSite } from '../contexts/SiteContext';
import { api } from '../lib/api';
import { TimeRangeSelector, TimeRange } from '../components/common/TimeRangeSelector';
import { DataTable } from '../components/tables/DataTable';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';
import { format } from 'date-fns';
import { AlertTriangle, Globe, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Errors() {
  const { currentSite } = useSite();
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<any | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>({ from: new Date(Date.now() - 24*60*60*1000), to: new Date(), label: '24h' });

  useEffect(() => {
    if (!currentSite?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getErrors(currentSite.id, { range: timeRange.label, from: timeRange.from.toISOString(), to: timeRange.to.toISOString() })
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.errors || []);
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
        <p className="text-slate-400 text-sm mb-6">Select a website or add one to start tracking runtime errors.</p>
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
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            JavaScript & Runtime Errors
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Automatic error grouping by stack trace fingerprint for <span className="text-indigo-300 font-medium">{currentSite.name}</span>
          </p>
        </div>
        <TimeRangeSelector onRangeChange={setTimeRange} />
      </div>

      <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80">
        <DataTable 
          data={data}
          pagination={{ pageSize: 15 }}
          onRowClick={(item) => setSelectedError(item)}
          columns={[
            { 
              header: 'Error Message', 
              accessorKey: 'message', 
              cell: (item) => (
                <div className="max-w-md">
                  <div className="font-medium text-slate-200 truncate">{item.message}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5 truncate">{item.filename ? `${item.filename}:${item.lineno || 0}` : 'Unknown source'}</div>
                </div>
              ) 
            },
            { 
              header: 'Type', 
              accessorKey: 'error_type', 
              cell: (item) => <Badge variant="error">{item.error_type || item.type || 'Error'}</Badge> 
            },
            { header: 'Occurrences', accessorKey: 'count', cell: (item) => item.count ?? item.occurrences ?? 1 },
            { header: 'Affected Sessions', accessorKey: 'affected_sessions', cell: (item) => item.affected_sessions ?? item.affectedUsers ?? 1 },
            { 
              header: 'Last Seen', 
              accessorKey: 'last_seen', 
              cell: (item) => {
                const ts = item.last_seen || item.lastSeen;
                return ts ? format(new Date(ts), 'MMM d, HH:mm:ss') : 'Recent';
              } 
            }
          ]}
        />
        {data.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            🎉 Zero errors recorded for this time range. Everything is operating smoothly.
          </div>
        )}
      </div>

      {/* Error Details Modal */}
      {selectedError && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <Badge variant="error">{selectedError.error_type || 'Error'}</Badge>
                <h3 className="text-lg font-bold text-white mt-2 break-all">{selectedError.message}</h3>
              </div>
              <button 
                onClick={() => setSelectedError(null)}
                className="text-slate-400 hover:text-white text-sm font-semibold px-2 py-1 bg-slate-800 rounded-md"
              >
                ✕ Close
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stack Trace</label>
              <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 overflow-x-auto text-xs font-mono text-rose-400 mt-1 max-h-60">
                {selectedError.stack_trace || selectedError.message || 'No stack trace available.'}
              </pre>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800">
              <div><strong className="text-slate-200">First seen:</strong> {selectedError.first_seen ? new Date(selectedError.first_seen).toLocaleString() : 'N/A'}</div>
              <div><strong className="text-slate-200">Total Count:</strong> {selectedError.count || 1}</div>
              <div><strong className="text-slate-200">Browser:</strong> {selectedError.browser || 'All'}</div>
              <div><strong className="text-slate-200">OS:</strong> {selectedError.os || 'All'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
