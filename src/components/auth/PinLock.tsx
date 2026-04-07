import React, { useState } from 'react';
import { Lock, Delete } from 'lucide-react';

interface PinLockProps {
  correctPin: string;
  onUnlock: () => void;
}

const PinLock: React.FC<PinLockProps> = ({ correctPin, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handlePress = (num: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + num;
    setPin(newPin);
    
    if (newPin.length === 4) {
      if (newPin === correctPin) {
        setTimeout(() => onUnlock(), 150);
      } else {
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 400);
      }
    }
  };

  const handleBackspace = () => {
    setPin(p => p.slice(0, -1));
    setError(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, 
      background: 'var(--bg-0)',
      zIndex: 9999, display: 'flex', flexDirection: 'column', 
      alignItems: 'center', justifyContent: 'center', padding: '2rem'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ 
          width: '64px', height: '64px', borderRadius: '50%', 
          background: 'var(--bg-2)', display: 'flex', alignItems: 'center', 
          justifyContent: 'center', margin: '0 auto 1.5rem',
          color: 'var(--text-0)'
        }}>
          <Lock size={28} />
        </div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>CafeFlow Locked</h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>Enter your 4-digit security PIN</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '4rem' }} className={error ? 'shake' : ''}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            width: '16px', height: '16px', borderRadius: '50%',
            background: pin.length > i ? 'var(--text-0)' : 'var(--border-strong)',
            transition: 'background 0.2s ease',
            border: error ? '2px solid var(--red)' : 'none'
          }} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem 2rem', maxWidth: '300px', width: '100%' }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
          <button 
            key={num} 
            onClick={() => handlePress(num)}
            style={{ 
              width: '72px', height: '72px', borderRadius: '50%', 
              background: 'transparent', border: 'none', 
              fontSize: '2rem', fontWeight: 300, color: 'var(--text-0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            {num}
          </button>
        ))}
        <div />
        <button 
          onClick={() => handlePress('0')}
          style={{ 
            width: '72px', height: '72px', borderRadius: '50%', 
            background: 'transparent', border: 'none', 
            fontSize: '2rem', fontWeight: 300, color: 'var(--text-0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          0
        </button>
        <button 
          onClick={handleBackspace}
          style={{ 
            width: '72px', height: '72px', borderRadius: '50%', 
            background: 'transparent', border: 'none', 
            color: 'var(--text-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <Delete size={28} strokeWidth={1.5} />
        </button>
      </div>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .shake { animation: shake 0.4s ease-in-out; }
      `}</style>
    </div>
  );
};

export default PinLock;
