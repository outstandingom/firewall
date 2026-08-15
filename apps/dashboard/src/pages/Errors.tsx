import React, { useEffect, useState } from 'react';
import { useSite } from '../contexts/SiteContext';
import { api } from '../lib/api';
import { TimeRangeSelector, TimeRange } from '../components/common/TimeRangeSelector';
import { DataTable } from '../components/tables/DataTable';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';
import { format } from 'date-fns';

export function Errors() {
  const { currentSite } = useSite();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>({ from: new Date(Date.now() - 24*60*60*1000), to: new Date(), label: '24h' });

  useEffect(() => {
    if (!currentSite) return;
    setLoading(true);
    api.getErrors(currentSite.id, { timeframe: timeRange.label })
      .then(res => setData(res.errors || res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentSite?.id, timeRange]);

  if (loading) return <div className="h-full flex items-center justify-center"><LoadingSpinner size={48} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Error Monitoring</h1>
          <p className="text-sm text-slate-400 mt-1">Track and debug JavaScript errors</p>
        </div>
        <TimeRangeSelector onRangeChange={setTimeRange} />
      </div>

      <DataTable 
        data={data}
        pagination={{ pageSize: 15 }}
        columns={[
          { header: 'Message', accessorKey: 'message', cell: (item) => <div className="max-w-md truncate font-medium">{item.message}</div> },
          { header: 'Type', accessorKey: 'type', cell: (item) => <Badge variant="error">{item.type}</Badge> },
          { header: 'Occurrences', accessorKey: 'occurrences' },
          { header: 'Affected Users', accessorKey: 'affectedUsers' },
          { header: 'Last Seen', accessorKey: 'lastSeen', cell: (item) => format(new Date(item.lastSeen), 'MMM d, HH:mm:ss') }
        ]}
      />
    </div>
  );
}
