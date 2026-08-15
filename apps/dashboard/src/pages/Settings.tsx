import React from 'react';
import { useSite } from '../contexts/SiteContext';
import { Settings as SettingsIcon, Shield, Database, Trash2 } from 'lucide-react';

export function Settings() {
  const { currentSite } = useSite();

  if (!currentSite) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Manage configuration for {currentSite.name}</p>
      </div>

      <div className="space-y-6">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-700/50 bg-slate-800/80 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">General</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Site Name</label>
              <input 
                defaultValue={currentSite.name}
                className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Domain</label>
              <input 
                defaultValue={currentSite.domain}
                className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <button className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors text-sm font-medium">
              Save Changes
            </button>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-700/50 bg-slate-800/80 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Privacy & Tracking</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between max-w-md">
              <div>
                <div className="text-sm font-medium text-white">Record Clicks & Keystrokes</div>
                <div className="text-xs text-slate-400">Capture detailed user interactions</div>
              </div>
              <button className="w-11 h-6 bg-indigo-500 rounded-full relative transition-colors">
                <div className="absolute right-1 top-1 bg-white w-4 h-4 rounded-full transition-transform"></div>
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Exclude Routes</label>
              <p className="text-xs text-slate-500 mb-2">Comma-separated list of paths to ignore (e.g. /admin, /private)</p>
              <input 
                placeholder="/admin, /billing"
                className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-700/50 bg-slate-800/80 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold text-white">Data Retention</h2>
          </div>
          <div className="p-6">
            <label className="block text-sm font-medium text-slate-300 mb-4">Retention Period: <span className="text-white font-bold">30 Days</span></label>
            <input 
              type="range" 
              min="1" 
              max="90" 
              defaultValue="30"
              className="w-full max-w-md h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between max-w-md mt-2 text-xs text-slate-500">
              <span>1 Day</span>
              <span>90 Days</span>
            </div>
          </div>
        </div>

        <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-rose-500/20 bg-rose-500/10 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-500" />
            <h2 className="text-lg font-semibold text-rose-500">Danger Zone</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-400 mb-4">
              Permanently delete this site and all of its data. This action cannot be undone.
            </p>
            <button className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-lg transition-colors text-sm font-medium">
              Delete Site
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
