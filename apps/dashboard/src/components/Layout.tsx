import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Globe, Activity, Users, ActivitySquare, AlertTriangle, 
  Zap, ShieldAlert, Bell, Settings, LogOut, ChevronDown, Menu, X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSite } from '../contexts/SiteContext';
import { LoadingSpinner } from './common/LoadingSpinner';

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Sites', path: '/sites', icon: Globe },
  { name: 'Traffic', path: '/traffic', icon: Activity },
  { name: 'Sessions', path: '/sessions', icon: Users },
  { name: 'API Monitor', path: '/api-monitor', icon: ActivitySquare },
  { name: 'Errors', path: '/errors', icon: AlertTriangle },
  { name: 'Performance', path: '/performance', icon: Zap },
  { name: 'Anomalies', path: '/anomalies', icon: ShieldAlert },
  { name: 'Alerts', path: '/alerts', icon: Bell },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export function Layout() {
  const { user, logout } = useAuth();
  const { sites, currentSite, selectSite, loading } = useSite();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return <Outlet />;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-300 overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        md:static md:flex md:flex-col
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold text-xl">
              A
            </div>
            <span className="text-xl font-bold text-white tracking-tight">AWO</span>
          </div>
          <button className="md:hidden text-slate-400" onClick={() => setMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) => `
                  flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${isActive 
                    ? 'bg-indigo-500/10 text-indigo-400' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}
                `}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-medium">
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-rose-400 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm z-30">
          <div className="flex items-center">
            <button 
              className="mr-4 md:hidden text-slate-400 hover:text-white"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            
            {/* Site Selector */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-colors text-sm font-medium">
                <Globe className="w-4 h-4 text-slate-400" />
                <span className="text-slate-200">
                  {loading ? 'Loading...' : currentSite?.name || 'Select a site'}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </button>
              
              <div className="absolute top-full left-0 mt-1 w-64 py-1 rounded-lg border border-slate-700 bg-slate-800 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {sites.map(site => (
                  <button
                    key={site.id}
                    onClick={() => selectSite(site.id)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-700 transition-colors
                      ${currentSite?.id === site.id ? 'text-indigo-400 bg-slate-700/50' : 'text-slate-300'}`}
                  >
                    <div className="font-medium">{site.name}</div>
                    <div className="text-xs text-slate-500">{site.domain}</div>
                  </button>
                ))}
                {sites.length === 0 && !loading && (
                  <div className="px-4 py-2 text-sm text-slate-500">No sites available</div>
                )}
                <div className="border-t border-slate-700 mt-1">
                  <NavLink 
                    to="/sites" 
                    className="block w-full text-left px-4 py-2 text-sm text-indigo-400 hover:bg-slate-700 transition-colors"
                  >
                    Manage Sites
                  </NavLink>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="text-slate-400 hover:text-white transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
