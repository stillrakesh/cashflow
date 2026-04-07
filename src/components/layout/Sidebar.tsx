import React from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  TrendingUp, 
  Users, 
  Settings, 
  PlusCircle, 
  LogOut, 
  Sparkles,
  History
} from 'lucide-react';
import type { User } from '../../types';

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ user, activeTab, setActiveTab, onLogout }) => {
  const isAdmin = user.role === 'admin';

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Overview', roles: ['admin', 'user'] },
    { id: 'transactions', icon: Receipt, label: 'Transactions', roles: ['admin', 'user'] },
    { id: 'add', icon: PlusCircle, label: 'Add Entry', roles: ['admin', 'user'] },
    isAdmin && { id: 'users', icon: Users, label: 'Team', roles: ['admin'] },
    { id: 'insights', icon: Sparkles, label: 'AI Insights', roles: ['admin', 'user'] },
    { id: 'history', icon: History, label: 'Version Log', roles: ['admin', 'user'] },
  ].filter(Boolean) as any[];

  return (
    <aside className="glass" style={{ 
      padding: '2rem 1.5rem', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '2rem',
      height: '100vh',
      position: 'sticky',
      top: 0
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.5rem' }}>
        <div style={{ 
          background: 'var(--gradient-primary)', 
          width: '40px', 
          height: '40px', 
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white'
        }}>
          <TrendingUp size={24} />
        </div>
        <h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 700 }}>CafeFlow</h1>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === item.id ? 'var(--gradient-primary)' : 'transparent',
              color: activeTab === item.id ? 'white' : 'var(--card-foreground)',
              textAlign: 'left',
              width: '100%',
              transition: 'all 0.2s ease'
            }}
          >
            <item.icon size={20} />
            <span style={{ fontWeight: activeTab === item.id ? 600 : 500 }}>{item.label}</span>
          </button>
        ))}
      </nav>

      <div style={{ 
        paddingTop: '1rem', 
        borderTop: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.5rem' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '50%', 
            background: 'var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            fontWeight: 700
          }}>
            {user.name[0]}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user.name}</p>
            <p style={{ fontSize: '0.75rem', opacity: 0.7, margin: 0 }}>{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
          </div>
        </div>
        
        <button
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '12px',
            color: 'var(--danger)',
            background: 'transparent',
            width: '100%'
          }}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
