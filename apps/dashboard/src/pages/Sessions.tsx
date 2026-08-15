import React, { useEffect, useState } from 'react';
import { useSite } from '../contexts/SiteContext';
import { api } from '../lib/api';
import { TimeRangeSelector, TimeRange } from '../components/common/TimeRangeSelector';
import { DataTable } from '../components/tables/DataTable';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { format } from 'date-fns';

export function Sessions() {
  const { currentSite } = useSite();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>({ from: new Date(Date.now() - 24*60*60*1000), to: new Date(), label: '24h' });

  useEffect(() => {
    if (!currentSite) return;
    setLoading(true);
    api.getSessions(currentSite.id, { timeframe: timeRange.label })
      .then(res => {
        setData(res.sessions || res);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentSite?.id, timeRange]);

  if (loading) return <div className="h-full flex items-center justify-center"><LoadingSpinner size={48} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">User Sessions</h1>
          <p className="text-sm text-slate-400 mt-1">Explore individual user journeys</p>
        </div>
        <TimeRangeSelector onRangeChange={setTimeRange} />
      </div>

      <DataTable 
        data={data}
        pagination={{ pageSize: 15 }}
        columns={[
          { header: 'Visitor', accessorKey: 'visitorId', cell: (item) => <span className="font-mono text-xs">{item.visitorId?.substring(0,8)}</span> },
          { header: 'Start Time', accessorKey: 'startTime', cell: (item) => format(new Date(item.startTime), 'MMM d, HH:mm:ss') },
          { header: 'Duration', accessorKey: 'duration', cell: (item) => `${Math.round(item.duration)}s` },
          { header: 'Pages', accessorKey: 'pagesCount' },
          { header: 'Device', accessorKey: 'device' },
          { header: 'Browser', accessorKey: 'browser' },
          { header: 'Entry Page', accessorKey: 'entryPage', cell: (item) => <span className="truncate max-w-[150px] inline-block">{item.entryPage}</span> }
        ]}
      />
    </div>
  );
}
