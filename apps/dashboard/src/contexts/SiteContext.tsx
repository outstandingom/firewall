import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';
import { useAuth } from './AuthContext';

interface SiteContextType {
  sites: any[];
  currentSite: any;
  selectSite: (id: string) => void;
  refreshSites: () => Promise<void>;
  loading: boolean;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export function SiteProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [sites, setSites] = useState<any[]>([]);
  const [currentSite, setCurrentSite] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const refreshSites = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.getSites();
      setSites(data.sites || data);
      
      const savedSiteId = localStorage.getItem('currentSiteId');
      if (savedSiteId) {
        const found = (data.sites || data).find((s: any) => s.id === savedSiteId);
        if (found) setCurrentSite(found);
        else if (data.sites?.length > 0) setCurrentSite(data.sites[0]);
      } else if (data.sites?.length > 0) {
        setCurrentSite(data.sites[0]);
      }
    } catch (e) {
      console.error('Failed to fetch sites', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSites();
  }, [user]);

  const selectSite = (id: string) => {
    const site = sites.find(s => s.id === id);
    if (site) {
      setCurrentSite(site);
      localStorage.setItem('currentSiteId', id);
    }
  };

  return (
    <SiteContext.Provider value={{ sites, currentSite, selectSite, refreshSites, loading }}>
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const context = useContext(SiteContext);
  if (context === undefined) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  return context;
}
