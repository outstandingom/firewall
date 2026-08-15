import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { Copy, CheckCircle2, Shield, Key } from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';

export function SiteDetail() {
  const { id } = useParams();
  const [site, setSite] = useState<any>(null);
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.getSite(id),
      api.getApiKeys(id).catch(() => [])
    ]).then(([siteData, keysData]) => {
      setSite(siteData);
      setKeys(keysData.keys || keysData);
      setLoading(false);
    });
  }, [id]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const createKey = async () => {
    if (!id) return;
    try {
      await api.createApiKey(id, { name: 'New API Key' });
      const keysData = await api.getApiKeys(id);
      setKeys(keysData.keys || keysData);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><LoadingSpinner size={48} /></div>;
  if (!site) return <div>Site not found</div>;

  const publicKey = keys.find(k => k.type === 'public')?.key || 'YOUR_PUBLIC_KEY';
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const installCode = `<script src="${apiUrl}/sdk.js" data-site-key="${publicKey}" data-endpoint="${apiUrl}"></script>`;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-bold text-white">{site.name}</h1>
          <Badge variant={site.status === 'active' ? 'success' : 'warning'}>
            {site.status === 'active' ? 'Active' : 'Pending'}
          </Badge>
        </div>
        <p className="text-slate-400">{site.domain}</p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-400" />
          Installation
        </h2>
        <p className="text-sm text-slate-400 mb-4">
          Add this script tag to your website's <code className="bg-slate-900 px-1 py-0.5 rounded text-indigo-300">&lt;head&gt;</code> to start monitoring.
        </p>
        <div className="relative group">
          <pre className="bg-slate-950 p-4 rounded-lg border border-slate-800 overflow-x-auto text-sm text-slate-300 font-mono">
            {installCode}
          </pre>
          <button 
            onClick={() => copyToClipboard(installCode)}
            className="absolute top-3 right-3 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        
        <div className="mt-6 flex items-center gap-3 p-4 bg-slate-900/50 rounded-lg border border-slate-800/50">
          <div className={`w-3 h-3 rounded-full ${site.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          <div>
            <div className="text-sm font-medium text-slate-300">SDK Status</div>
            <div className="text-xs text-slate-500">
              {site.status === 'active' ? 'Data is being received normally' : 'Waiting for first event...'}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-400" />
            API Keys
          </h2>
          <button 
            onClick={createKey}
            className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg transition-colors text-sm font-medium"
          >
            Create Key
          </button>
        </div>
        
        <div className="space-y-4">
          {keys.map((key) => (
            <div key={key.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-800/50 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-slate-300">{key.name}</span>
                  <Badge variant={key.type === 'public' ? 'info' : 'warning'}>{key.type}</Badge>
                </div>
                <code className="text-xs text-slate-500">{key.key.substring(0, 8)}...{key.key.substring(key.key.length - 4)}</code>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => copyToClipboard(key.key)}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
                >
                  Copy Full Key
                </button>
              </div>
            </div>
          ))}
          {keys.length === 0 && (
            <div className="text-sm text-slate-500 text-center py-4">No API keys found</div>
          )}
        </div>
      </div>
    </div>
  );
}
