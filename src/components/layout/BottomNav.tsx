import React from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Plus,
  MessageCircle,
  Receipt,
} from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingCount: number;
  isAdmin: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, pendingCount, isAdmin }) => {
  const tabs = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'home' },
    { id: 'transactions', icon: Receipt, label: 'logs' },
    { id: 'add', icon: Plus, label: '' },
    ...(isAdmin ? [{ id: 'analytics', icon: BarChart3, label: 'analytics' }] : []),
    { id: 'chat', icon: MessageCircle, label: 'ai chat' },
  ];

  return (
    <nav className="bottom-nav" id="main-navigation">
      {tabs.map((tab) => {
        if (tab.id === 'add') {
          return (
            <button
              key={tab.id}
              className="nav-fab"
              onClick={() => setActiveTab('add')}
              aria-label="Add new entry"
            >
              <Plus size={20} strokeWidth={2.5} />
            </button>
          );
        }

        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <div style={{ position: 'relative' }}>
              <tab.icon size={20} strokeWidth={isActive ? 2 : 1.5} />
              {tab.id === 'transactions' && pendingCount > 0 && (
                <span className="badge">{pendingCount}</span>
              )}
            </div>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
