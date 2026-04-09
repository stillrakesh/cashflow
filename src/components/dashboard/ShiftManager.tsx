import React, { useState } from 'react';
import type { Shift, Role } from '../../types';
import { formatINR } from '../../utils/financeUtils';
import { Clock, Lock, Unlock } from 'lucide-react';

interface ShiftManagerProps {
  activeShift: Shift | null;
  onStartShift: (startingCash: number) => void;
  onEndShift: (actualEndingCash: number) => void;
  role: Role;
}

const ShiftManager: React.FC<ShiftManagerProps> = ({ activeShift, onStartShift, onEndShift, role }) => {
  const [startingCash, setStartingCash] = useState<string>('');
  const [endingCash, setEndingCash] = useState<string>('');
  const [isEnding, setIsEnding] = useState(false);

  // If Admin, they don't *need* a shift block to work, but let's hide the strict gate for admins later
  if (role === 'admin') return null;

  if (!activeShift) {
    return (
      <div className="card animate-in" style={{ marginBottom: 'var(--spacing-section)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)', color: 'var(--red)' }}>
          <Lock size={18} />
          <h3 className="text-heading" style={{ fontSize: '1rem' }}>Register Locked</h3>
        </div>
        <p className="text-regular" style={{ fontSize: '0.8125rem', color: 'var(--text-2)', marginBottom: 'var(--spacing-card)', lineHeight: 1.4 }}>
          You must open the register to start logging transactions. Count the cash currently in the drawer and enter the float amount below.
        </p>
        <div>
          <label className="text-label" style={{ marginBottom: 'var(--spacing-sm)', display: 'block' }}>Starting Cash (Float)</label>
          <input 
            type="number" 
            className="input text-regular" 
            value={startingCash} 
            onChange={e => setStartingCash(e.target.value)} 
            placeholder="e.g. 2000"
            style={{ marginBottom: 'var(--spacing-sm)' }} 
          />
          <button 
            className="btn-primary" 
            style={{ width: '100%' }}
            disabled={!startingCash || parseFloat(startingCash) < 0}
            onClick={() => onStartShift(parseFloat(startingCash))}
          >
            Start Shift
          </button>
        </div>
      </div>
    );
  }

  // Active Shift View
  return (
    <div className="card animate-in" style={{ marginBottom: 'var(--spacing-section)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', color: 'var(--green)' }}>
          <Unlock size={18} />
          <h3 className="text-heading" style={{ fontSize: '1rem' }}>Shift Active</h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className="text-label" style={{ margin: 0, textTransform: 'lowercase' }}>Started At</p>
          <p className="text-number" style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Clock size={12} /> {new Date(activeShift.startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
      
      <div style={{ background: 'var(--bg-2)', padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-m)', marginBottom: 'var(--spacing-card)' }}>
        <p className="text-label" style={{ margin: 0, textTransform: 'none', display: 'flex', justifyContent: 'space-between' }}>
          <span>Starting Float:</span>
          <span className="text-number">{formatINR(activeShift.startingCash)}</span>
        </p>
      </div>

      {!isEnding ? (
        <button 
          onClick={() => setIsEnding(true)}
          className="btn-secondary"
          style={{ width: '100%' }}
        >
          Close Register
        </button>
      ) : (
        <div className="animate-in">
          <p className="text-regular" style={{ fontSize: '0.8125rem', color: 'var(--text-2)', marginBottom: 'var(--spacing-sm)' }}>
            To end your shift, count the physical cash currently in the drawer and enter it below for reconciliation.
          </p>
          <label className="text-label" style={{ marginBottom: 'var(--spacing-sm)', display: 'block' }}>Actual Cash Counted</label>
          <input 
            type="number" 
            className="input text-regular" 
            value={endingCash} 
            onChange={e => setEndingCash(e.target.value)} 
            placeholder="e.g. 5400"
            style={{ marginBottom: 'var(--spacing-sm)' }} 
          />
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <button 
              onClick={() => setIsEnding(false)}
              className="btn-secondary" style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button 
              onClick={() => onEndShift(parseFloat(endingCash))}
              disabled={!endingCash || parseFloat(endingCash) < 0}
              className="btn-primary" style={{ flex: 1 }}
            >
              Confirm Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftManager;
