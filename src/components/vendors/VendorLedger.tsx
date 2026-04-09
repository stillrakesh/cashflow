import React, { useState, useMemo } from 'react';
import { Truck, Search, ChevronRight, TrendingUp, Plus, Trash2, ArrowLeft } from 'lucide-react';
import type { Vendor, Transaction } from '../../types';
import { formatINR } from '../../utils/financeUtils';

interface VendorLedgerProps {
  vendors: Vendor[];
  transactions: Transaction[];
  orgId: string;
  onSaveVendor: (vendor: Vendor) => Promise<void>;
  onDeleteVendor: (vendorId: string) => Promise<void>;
}

const VendorLedger: React.FC<VendorLedgerProps> = ({ vendors, transactions, orgId, onSaveVendor, onDeleteVendor }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');

  // Calculate stats for each vendor
  const vendorStats = useMemo(() => {
    const stats: Record<string, { totalSpent: number; count: number; lastTransaction?: string }> = {};
    
    // Initialize stats for known vendors
    vendors.forEach(v => {
      stats[v.name.toLowerCase()] = { totalSpent: 0, count: 0 };
    });

    // Sum transactions
    transactions.forEach(t => {
      if (t.type === 'expense' && t.vendor) {
        const vKey = t.vendor.toLowerCase();
        if (!stats[vKey]) {
          stats[vKey] = { totalSpent: 0, count: 0 };
        }
        stats[vKey].totalSpent += t.amount;
        stats[vKey].count += 1;
        
        const txnDate = t.date;
        if (!stats[vKey].lastTransaction || txnDate > stats[vKey].lastTransaction) {
          stats[vKey].lastTransaction = txnDate;
        }
      }
    });

    return stats;
  }, [vendors, transactions]);

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSpentAll = Object.values(vendorStats).reduce((acc, s) => acc + s.totalSpent, 0);

  const selectedVendor = vendors.find(v => v.id === selectedVendorId);
  const selectedVendorTxns = useMemo(() => {
    if (!selectedVendor) return [];
    return transactions
      .filter(t => t.vendor?.toLowerCase() === selectedVendor.name.toLowerCase())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedVendor, transactions]);

  const handleCreateVendor = async () => {
    if (!newVendorName.trim()) return;
    const vendor: Vendor = {
      id: 'vend_' + Date.now().toString(36),
      orgId,
      name: newVendorName.trim(),
      createdAt: new Date().toISOString()
    };
    await onSaveVendor(vendor);
    setNewVendorName('');
    setIsAddingVendor(false);
  };

  if (selectedVendorId && selectedVendor) {
    const stats = vendorStats[selectedVendor.name.toLowerCase()] || { totalSpent: 0, count: 0 };
    return (
      <div className="animate-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <button onClick={() => setSelectedVendorId(null)} className="btn-secondary" style={{ width: '48px' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{selectedVendor.name}</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', margin: 0 }}>Vendor Ledger</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '2rem' }}>
          <div className="card" style={{ padding: '1rem' }}>
            <p className="section-label" style={{ marginBottom: '0.5rem' }}>total payments</p>
            <p className="mono" style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{formatINR(stats.totalSpent)}</p>
          </div>
          <div className="card" style={{ padding: '1rem' }}>
            <p className="section-label" style={{ marginBottom: '0.5rem' }}>transactions</p>
            <p className="mono" style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{stats.count}</p>
          </div>
        </div>

        <p className="section-label">payment history</p>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {selectedVendorTxns.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>No transactions found for this vendor.</div>
          ) : (
            selectedVendorTxns.map((t, i) => (
              <div key={t.id} style={{ 
                padding: '1rem', 
                borderBottom: i === selectedVendorTxns.length - 1 ? 'none' : '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500 }}>{t.category}</p>
                  <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-3)' }}>
                    {new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p className="mono" style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>{formatINR(t.amount)}</p>
                  <p style={{ margin: 0, fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase' }}>{t.paymentType}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <button 
          onClick={() => { if(confirm(`Delete vendor "${selectedVendor.name}"? Historical data will remain but vendor link will be removed.`)) { onDeleteVendor(selectedVendor.id); setSelectedVendorId(null); } }}
          className="btn-danger"
          style={{ width: '100%', marginTop: '2rem', gap: '0.5rem' }}
        >
          <Trash2 size={14} /> Remove Vendor from List
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in">
      <div className="screen-header">
        <div>
          <h1 className="page-title">Vendors</h1>
          <p className="page-subtitle">Track payments to your suppliers</p>
        </div>
        <button 
          onClick={() => setIsAddingVendor(true)} 
          className="btn-primary" 
          style={{ width: '48px' }}
        >
          <Plus size={18} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1rem', background: 'linear-gradient(135deg, var(--bg-card), var(--bg-1))' }}>
          <p className="section-label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Truck size={12} /> total vendors
          </p>
          <p className="mono" style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{vendors.length}</p>
        </div>
        <div className="card" style={{ padding: '1rem', background: 'linear-gradient(135deg, var(--bg-card), var(--bg-1))' }}>
          <p className="section-label" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <TrendingUp size={12} /> total spent
          </p>
          <p className="mono" style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>{formatINR(totalSpentAll)}</p>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <Search size={14} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
        <input 
          type="text" 
          placeholder="search vendors..."
          className="input"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ paddingLeft: '2.5rem' }}
        />
      </div>

      {isAddingVendor && (
        <div className="card animate-in" style={{ padding: '1rem', marginBottom: '1.5rem', border: '1px solid var(--blue-soft)' }}>
          <p className="section-label" style={{ marginBottom: '0.75rem' }}>new vendor name</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              className="input" 
              autoFocus 
              value={newVendorName} 
              onChange={e => setNewVendorName(e.target.value)}
              placeholder="e.g. Green Grocery"
            />
            <button onClick={handleCreateVendor} className="btn-primary">Add</button>
            <button onClick={() => setIsAddingVendor(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filteredVendors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-3)' }}>
            <Truck size={32} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p style={{ fontSize: '0.875rem' }}>No vendors found. Add your first supplier to track payments.</p>
          </div>
        ) : (
          filteredVendors.map(vendor => {
            const stats = vendorStats[vendor.name.toLowerCase()] || { totalSpent: 0, count: 0 };
            return (
              <button 
                key={vendor.id} 
                className="card" 
                onClick={() => setSelectedVendorId(vendor.id)}
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '1.25rem', width: '100%', textAlign: 'left', border: '1px solid var(--border)',
                  background: 'var(--bg-card)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>
                    📦
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 500 }}>{vendor.name}</h3>
                    <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--text-3)' }}>
                      {stats.count} transactions • Last pay {stats.lastTransaction ? new Date(stats.lastTransaction).toLocaleDateString() : 'never'}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <p className="mono" style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600 }}>{formatINR(stats.totalSpent)}</p>
                    <p style={{ margin: 0, fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase' }}>total spend</p>
                  </div>
                  <ChevronRight size={16} color="var(--text-4)" />
                </div>
              </button>
            );
          })
        )}
      </div>
      <div style={{ height: '5rem' }} />
    </div>
  );
};

export default VendorLedger;
