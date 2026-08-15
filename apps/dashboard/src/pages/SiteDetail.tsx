import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Copy, CheckCircle2, Shield, Key, ArrowLeft, Terminal, Check, Play, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Badge } from '../components/common/Badge';

export function SiteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [site, setSite] = useState<any>(null);
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'html' | 'npm' | 'nextjs'>('html');
  const [testEventStatus, setTestEventStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const fetchSiteData = () => {
    if (!id) return;
    Promise.all([
      api.getSite(id),
      api.getApiKeys(id).catch(() => [])
    ]).then(([siteData, keysData]) => {
      setSite(siteData);
      const allKeys = Array.isArray(keysData) && keysData.length > 0 
        ? keysData 
        : (siteData?.api_keys || []);
      setKeys(allKeys);
      setLoading(false);
    }).catch(err => {
      console.error('Error loading site data:', err);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchSiteData();
  }, [id]);

  const copyToClipboard = (text: string, type: 'script' | 'key', keyId?: string) => {
    navigator.clipboard.writeText(text);
    if (type === 'script') {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } else if (keyId) {
      setCopiedKey(keyId);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const createKey = async () => {
    if (!id) return;
    try {
      await api.createApiKey(id, { key_type: 'public', label: 'Public SDK Key' });
      fetchSiteData();
    } catch (e) {
      console.error('Failed to create key:', e);
    }
  };

  const sendTestEvent = async () => {
    if (!site) return;
    setTestEventStatus('sending');
    try {
      const publicKey = keys.find(k => k.key_type === 'public')?.key_preview || keys[0]?.key_preview;
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      
      const res = await fetch(`${apiUrl}/v1/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Site-Key': publicKey || 'test-key',
        },
        body: JSON.stringify({
          site_id: site.id,
          site_key: publicKey,
          event_type: 'page_view',
          timestamp: new Date().toISOString(),
          route: window.location.pathname,
          metadata: { test: true, url: window.location.href, title: 'Test Event from Dashboard' }
        })
      });

      if (res.ok) {
        setTestEventStatus('success');
        setTimeout(() => {
          fetchSiteData();
        }, 1000);
      } else {
        setTestEventStatus('error');
      }
    } catch (err) {
      console.error('Failed to send test event:', err);
      setTestEventStatus('error');
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center py-20"><LoadingSpinner size={48} /></div>;
  if (!site) return (
    <div className="max-w-4xl mx-auto text-center py-20 text-slate-400">
      <p className="text-xl text-white mb-4">Site not found</p>
      <button onClick={() => navigate('/sites')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Back to Sites</button>
    </div>
  );

  const publicKeyObj = keys.find(k => k.key_type === 'public') || keys[0];
  // Use the fullKey if returned by the API (on auto-provision), or if key_preview is a full pk_live_ key, or fallback to site UUID
  const publicKey = publicKeyObj?.fullKey 
    || (publicKeyObj?.key_preview && publicKeyObj.key_preview.startsWith('pk_live_') && !publicKeyObj.key_preview.includes('...') ? publicKeyObj.key_preview : null) 
    || site.id;
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const htmlInstallCode = `<!-- Growhaz Observability Tracking Code -->
<script
  src="${apiUrl}/sdk.js"
  data-site-key="${publicKey}"
  data-endpoint="${apiUrl}"
  defer
></script>`;

  const nextjsInstallCode = `// In Next.js (app/layout.tsx or pages/_app.tsx)
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <Script
          src="${apiUrl}/sdk.js"
          data-site-key="${publicKey}"
          data-endpoint="${apiUrl}"
          strategy="afterInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}`;

  const npmInstallCode = `// 1. Install SDK in your project
npm install @awo/browser-sdk

// 2. Initialize in your main index.ts / App.tsx
import { AWO } from '@awo/browser-sdk';

AWO.init({
  siteKey: '${publicKey}',
  endpoint: '${apiUrl}'
});`;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate('/sites')} 
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to all sites
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">{site.name}</h1>
            <Badge variant={site.sdk_detected ? 'success' : 'warning'}>
              {site.sdk_detected ? 'SDK Connected' : 'Waiting for SDK'}
            </Badge>
          </div>
          <p className="text-slate-400 text-sm mt-0.5">{site.domain}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              navigate('/');
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            View Analytics Dashboard
          </button>
        </div>
      </div>

      {/* Quick Setup / SDK Snippet */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 sm:p-7 shadow-lg backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              Website Tracking Code (Google Analytics style)
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Copy and paste this snippet into the <code className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-xs">&lt;head&gt;</code> of your website's <code className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-xs">index.html</code>.
            </p>
          </div>

          {/* Installation Framework Tabs */}
          <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-700/50 text-xs self-start sm:self-auto">
            <button
              onClick={() => setActiveTab('html')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'html' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              HTML (Direct)
            </button>
            <button
              onClick={() => setActiveTab('nextjs')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'nextjs' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Next.js / React
            </button>
            <button
              onClick={() => setActiveTab('npm')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'npm' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              NPM Module
            </button>
          </div>
        </div>

        {/* Code Snippet Box */}
        <div className="relative group">
          <pre className="bg-slate-950 p-5 rounded-xl border border-slate-800/80 overflow-x-auto text-sm text-emerald-400 font-mono leading-relaxed shadow-inner">
            {activeTab === 'html' && htmlInstallCode}
            {activeTab === 'nextjs' && nextjsInstallCode}
            {activeTab === 'npm' && npmInstallCode}
          </pre>
          <button 
            onClick={() => copyToClipboard(
              activeTab === 'html' ? htmlInstallCode : activeTab === 'nextjs' ? nextjsInstallCode : npmInstallCode,
              'script'
            )}
            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors border border-slate-700 shadow-sm"
          >
            {copiedScript ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Snippet</span>
              </>
            )}
          </button>
        </div>

        {/* Live SDK Status & Test Verification */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-900/60 rounded-xl border border-slate-800/80 gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3.5 h-3.5 rounded-full ${site.sdk_detected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <div>
              <div className="text-sm font-semibold text-slate-200">
                {site.sdk_detected ? 'SDK is Connected and Active' : 'Waiting for first event...'}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {site.last_event_at 
                  ? `Last event received: ${new Date(site.last_event_at).toLocaleString()}` 
                  : 'No telemetry data received yet. Add the script snippet to your site and reload it.'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchSiteData}
              title="Refresh SDK status"
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={sendTestEvent}
              disabled={testEventStatus === 'sending'}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              {testEventStatus === 'sending' ? 'Sending Test...' : testEventStatus === 'success' ? 'Event Sent!' : 'Send Test Ping'}
            </button>
          </div>
        </div>
      </div>

      {/* API Keys Management */}
      <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 sm:p-7 shadow-lg backdrop-blur-sm">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-400" />
              Site API Keys
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Public keys are used by the frontend SDK to identify your site.</p>
          </div>
          <button 
            onClick={createKey}
            className="px-3.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg transition-colors text-xs font-medium"
          >
            + Create New Key
          </button>
        </div>
        
        <div className="space-y-3">
          {keys.map((k) => {
            const keyString = k.key_preview || k.key || '';
            const keyLabel = k.label || k.name || 'Site Key';
            const keyType = k.key_type || k.type || 'public';
            const isCopied = copiedKey === k.id;

            return (
              <div key={k.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-900/60 rounded-lg border border-slate-800/70 gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-200">{keyLabel}</span>
                    <Badge variant={keyType === 'public' ? 'info' : 'warning'}>{keyType.toUpperCase()}</Badge>
                  </div>
                  <code className="text-xs text-slate-400 font-mono break-all">{keyString}</code>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => copyToClipboard(keyString, 'key', k.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors border border-slate-700"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Key</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
          {keys.length === 0 && (
            <div className="text-sm text-slate-500 text-center py-6">No API keys found. Click "+ Create New Key" above.</div>
          )}
        </div>
      </div>
    </div>
  );
}
