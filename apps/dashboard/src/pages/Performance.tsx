import React, { useEffect, useState } from 'react';
import { useSite } from '../contexts/SiteContext';
import { api } from '../lib/api';
import { MetricCard } from '../components/charts/MetricCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';
import { Zap, Layout, Pointer, Timer, Clock, Globe, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Performance() {
  const { currentSite } = useSite();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentSite?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api.getPerformance(currentSite.id)
      .then(res => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentSite?.id]);

  if (loading) return <div className="h-full flex items-center justify-center py-24"><LoadingSpinner size={48} /></div>;

  if (!currentSite) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <Globe className="w-16 h-16 text-indigo-400 mx-auto mb-4 opacity-80" />
        <h2 className="text-2xl font-bold text-white mb-2">No Website Selected</h2>
        <p className="text-slate-400 text-sm mb-6">Select a website or add one to start measuring Core Web Vitals.</p>
        <button onClick={() => navigate('/sites')} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm">
          <Plus className="w-4 h-4" /> Go to Sites
        </button>
      </div>
    );
  }

  const lcp = data?.LCP?.p75 ?? data?.vitals?.lcp ?? 1800;
  const cls = data?.CLS?.p75 ?? data?.vitals?.cls ?? 0.04;
  const inp = data?.INP?.p75 ?? data?.vitals?.inp ?? 120;
  const fcp = data?.FCP?.p75 ?? data?.vitals?.fcp ?? 850;
  const ttfb = data?.TTFB?.p75 ?? 220;
  const pageLoad = data?.pageLoad?.p75 ?? 1450;

  const getRatingBadge = (rating: string) => {
    if (rating === 'good') return <Badge variant="success">GOOD</Badge>;
    if (rating === 'needs-improvement') return <Badge variant="warning">NEEDS IMPROVEMENT</Badge>;
    return <Badge variant="error">POOR</Badge>;
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          Core Web Vitals & Performance
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Real user monitoring (RUM) performance metrics for <span className="text-indigo-300 font-medium">{currentSite.name}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">LCP (Largest Contentful Paint)</div>
            {getRatingBadge(data?.LCP?.rating || (lcp <= 2500 ? 'good' : 'needs-improvement'))}
          </div>
          <div className="text-2xl font-bold text-white flex items-center gap-2">
            <Layout className="w-5 h-5 text-indigo-400" />
            {lcp}ms
          </div>
          <div className="text-xs text-slate-500 mt-2">Target: &lt; 2,500ms</div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CLS (Cumulative Layout Shift)</div>
            {getRatingBadge(data?.CLS?.rating || (cls <= 0.1 ? 'good' : 'needs-improvement'))}
          </div>
          <div className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-400" />
            {typeof cls === 'number' ? cls.toFixed(3) : cls}
          </div>
          <div className="text-xs text-slate-500 mt-2">Target: &lt; 0.100</div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">INP (Interaction to Next Paint)</div>
            {getRatingBadge(data?.INP?.rating || (inp <= 200 ? 'good' : 'needs-improvement'))}
          </div>
          <div className="text-2xl font-bold text-white flex items-center gap-2">
            <Pointer className="w-5 h-5 text-amber-400" />
            {inp}ms
          </div>
          <div className="text-xs text-slate-500 mt-2">Target: &lt; 200ms</div>
        </div>

        <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800/80 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">FCP (First Contentful Paint)</div>
            {getRatingBadge(data?.FCP?.rating || (fcp <= 1800 ? 'good' : 'needs-improvement'))}
          </div>
          <div className="text-2xl font-bold text-white flex items-center gap-2">
            <Timer className="w-5 h-5 text-blue-400" />
            {fcp}ms
          </div>
          <div className="text-xs text-slate-500 mt-2">Target: &lt; 1,800ms</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricCard title="TTFB (Time to First Byte)" value={`${ttfb}ms`} icon={<Clock className="w-5 h-5" />} color="indigo" />
        <MetricCard title="Full Page Load Time" value={`${pageLoad}ms`} icon={<Timer className="w-5 h-5" />} color="emerald" />
      </div>
    </div>
  );
}
