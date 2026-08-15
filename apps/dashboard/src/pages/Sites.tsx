import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSite } from '../contexts/SiteContext';
import { api } from '../lib/api';
import { Globe, Plus, Settings, ChevronRight, Activity } from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { formatDistanceToNow } from 'date-fns';

export function Sites() {
  const { sites, refreshSites, selectSite } = useSite();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteDomain, setNewSiteDomain] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.createSite({ name: newSiteName, domain: newSiteDomain });
      await refreshSites();
      setShowModal(false);
      setNewSiteName('');
      setNewSiteDomain('');
      if (res?.site?.id) {
        selectSite(res.site.id);
        navigate(`/sites/${res.site.id}`);
      }
    } catch (e) {
      console.error('Failed to create site', e);
    } finally {
      setCreating(false);
    }
  };

  const handleSiteClick = (id: string) => {
    selectSite(id);
    navigate(`/sites/${id}`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Sites</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your monitored websites</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Site
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sites.map(site => (
          <div 
            key={site.id}
            onClick={() => handleSiteClick(site.id)}
            className="group relative flex flex-col bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:bg-slate-800 transition-colors cursor-pointer overflow-hidden"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-slate-900/50 rounded-lg text-indigo-400 group-hover:text-indigo-300 transition-colors">
                <Globe className="w-6 h-6" />
              </div>
              <Badge variant={site.status === 'active' ? 'success' : 'warning'}>
                {site.status === 'active' ? 'Receiving Data' : 'Pending'}
              </Badge>
            </div>
            
            <h3 className="text-lg font-semibold text-white mb-1 truncate">{site.name}</h3>
            <p className="text-sm text-slate-400 mb-6 truncate">{site.domain}</p>
            
            <div className="mt-auto pt-4 border-t border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center text-xs text-slate-500">
                <Activity className="w-3.5 h-3.5 mr-1" />
                {site.lastEventAt ? `Last event ${formatDistanceToNow(new Date(site.lastEventAt))} ago` : 'No events yet'}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6">Add New Site</h2>
            <form onSubmit={handleCreateSite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Site Name</label>
                <input 
                  required
                  value={newSiteName}
                  onChange={e => setNewSiteName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="e.g. Production App"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Domain</label>
                <input 
                  required
                  value={newSiteDomain}
                  onChange={e => setNewSiteDomain(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  placeholder="e.g. example.com"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  {creating ? 'Creating...' : 'Create Site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
