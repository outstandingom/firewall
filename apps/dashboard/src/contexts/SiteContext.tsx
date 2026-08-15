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
  const [loading, setLoading] = useState(true);

  const refreshSites = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getSites();
      const list = Array.isArray(data) ? data : (data?.sites || []);
      setSites(list);
      
      const savedSiteId = localStorage.getItem('currentSiteId');
      if (savedSiteId) {
        const found = list.find((s: any) => s.id === savedSiteId);
        if (found) {
          setCurrentSite(found);
        } else if (list.length > 0) {
          setCurrentSite(list[0]);
          localStorage.setItem('currentSiteId', list[0].id);
        } else {
          setCurrentSite(null);
        }
      } else if (list.length > 0) {
        setCurrentSite(list[0]);
        localStorage.setItem('currentSiteId', list[0].id);
      } else {
        setCurrentSite(null);
      }
    } catch (e) {
      console.error('Failed to fetch sites:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSites();
  }, [user]);

  const selectSite = (id: string) => {
    localStorage.setItem('currentSiteId', id);
    const found = sites.find(s => s.id === id);
    if (found) {
      setCurrentSite(found);
    } else {
      // Fetch directly if not in cache
      api.getSite(id).then(site => {
        if (site) setCurrentSite(site);
      }).catch(() => {});
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
  if (!context) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  return context;
}
