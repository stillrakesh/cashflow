import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  style?: React.CSSProperties;
  placeholder?: string;
  minWidth?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  value, onChange, options, style, placeholder, minWidth = '90px'
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', minWidth, flexShrink: 0, ...style }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%',
          height: '36px',
          padding: '0 0.625rem 0 0.75rem',
          background: 'var(--bg-2)',
          border: `1px solid ${open ? 'var(--text-3)' : 'transparent'}`,
          borderRadius: 'var(--radius-m)',
          color: 'var(--text-0)',
          fontFamily: 'inherit',
          fontSize: '0.8125rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.375rem',
          cursor: 'pointer',
          transition: 'border-color 150ms ease',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label || placeholder || '—'}
        </span>
        <ChevronDown
          size={13}
          style={{
            flexShrink: 0,
            color: 'var(--text-3)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 9999,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-m)',
            boxShadow: 'var(--shadow-modal)',
            minWidth: '100%',
            maxHeight: '220px',
            overflowY: 'auto',
            padding: '0.25rem',
            animation: 'dropdownIn 150ms cubic-bezier(0.4, 0, 0.2, 1) forwards',
          }}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                background: opt.value === value ? 'var(--bg-2)' : 'transparent',
                color: opt.value === value ? 'var(--text-0)' : 'var(--text-1)',
                fontFamily: 'inherit',
                fontSize: '0.8125rem',
                fontWeight: opt.value === value ? 600 : 400,
                textAlign: 'left',
                border: 'none',
                cursor: 'pointer',
                display: 'block',
                whiteSpace: 'nowrap',
                transition: 'background 80ms ease',
              }}
              onMouseEnter={e => { if (opt.value !== value) (e.target as HTMLElement).style.background = 'var(--bg-2)'; }}
              onMouseLeave={e => { if (opt.value !== value) (e.target as HTMLElement).style.background = 'transparent'; }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
