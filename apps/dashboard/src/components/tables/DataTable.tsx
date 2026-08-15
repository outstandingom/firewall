import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessorKey: keyof T | string;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  pagination?: {
    pageSize: number;
  };
  emptyMessage?: string;
}

export function DataTable<T>({ 
  data, 
  columns, 
  onRowClick,
  pagination,
  emptyMessage = "No data available" 
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig) return data;
    
    return [...data].sort((a: any, b: any) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  const paginatedData = React.useMemo(() => {
    if (!pagination) return sortedData;
    const start = (currentPage - 1) * pagination.pageSize;
    return sortedData.slice(start, start + pagination.pageSize);
  }, [sortedData, pagination, currentPage]);

  const totalPages = pagination ? Math.ceil(data.length / pagination.pageSize) : 1;

  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 border border-slate-700/50 rounded-xl bg-slate-800/20">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col border border-slate-700/50 rounded-xl bg-slate-800/30 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-400 bg-slate-900/50 uppercase border-b border-slate-700/50">
            <tr>
              {columns.map((col, i) => (
                <th 
                  key={i} 
                  className={`px-4 py-3 font-medium ${col.sortable !== false ? 'cursor-pointer hover:bg-slate-800' : ''}`}
                  onClick={() => col.sortable !== false && handleSort(col.accessorKey as string)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{col.header}</span>
                    {sortConfig?.key === col.accessorKey && (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item, i) => (
              <tr 
                key={i} 
                className={`border-b border-slate-700/30 last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-slate-800/50 transition-colors' : ''}`}
                onClick={() => onRowClick && onRowClick(item)}
              >
                {columns.map((col, j) => (
                  <td key={j} className="px-4 py-3 text-slate-300">
                    {col.cell ? col.cell(item) : (item as any)[col.accessorKey]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/50 bg-slate-900/30">
          <span className="text-xs text-slate-500">
            Showing {(currentPage - 1) * pagination.pageSize + 1} to {Math.min(currentPage * pagination.pageSize, data.length)} of {data.length} entries
          </span>
          <div className="flex space-x-1">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded bg-slate-800 text-slate-400 disabled:opacity-50 hover:bg-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded bg-slate-800 text-slate-400 disabled:opacity-50 hover:bg-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
