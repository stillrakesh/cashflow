import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  placeholder?: string;
  maxDate?: string; // YYYY-MM-DD
  minDate?: string; // YYYY-MM-DD
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, placeholder = 'Select date', maxDate, minDate }) => {
  const today = new Date();
  const parsed = value ? new Date(value + 'T00:00:00') : null;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.getMonth() ?? today.getMonth());
  const [mode, setMode] = useState<'day' | 'month' | 'year'>('day');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    if (parsed) { setViewYear(parsed.getFullYear()); setViewMonth(parsed.getMonth()); }
    setMode('day');
    setOpen(v => !v);
  };

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();

  const cells: { day: number; cur: boolean; date: Date }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrev - i, cur: false, date: new Date(viewYear, viewMonth - 1, daysInPrev - i) });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, cur: true, date: new Date(viewYear, viewMonth, d) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: cells.length - daysInMonth - firstDay + 1, cur: false, date: new Date(viewYear, viewMonth + 1, cells.length - daysInMonth - firstDay + 1) });
  }

  const isSelected = (date: Date) => parsed && date.toDateString() === parsed.toDateString();
  const isToday = (date: Date) => date.toDateString() === today.toDateString();
  const isDisabled = (date: Date) => {
    const d = date.toISOString().slice(0, 10);
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  };

  const selectDate = (date: Date) => {
    if (isDisabled(date)) return;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1); }
    else setViewMonth(v => v - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1); }
    else setViewMonth(v => v + 1);
  };

  const yearRange = Array.from({ length: 100 }, (_, i) => today.getFullYear() - 80 + i).reverse();

  const displayValue = parsed
    ? parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        style={{
          width: '100%', height: '40px',
          padding: '0 1rem',
          background: 'var(--bg-2)',
          border: `1px solid ${open ? 'var(--text-3)' : 'transparent'}`,
          borderRadius: 'var(--radius-m)',
          color: displayValue ? 'var(--text-0)' : 'var(--text-3)',
          fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 400,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', transition: 'border-color 150ms ease',
        }}
      >
        <span>{displayValue || placeholder}</span>
        <Calendar size={14} color="var(--text-3)" />
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 9999,
          background: 'var(--bg-card)', border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-l)', boxShadow: 'var(--shadow-modal)',
          width: '280px', padding: '1rem',
          animation: 'dropdownIn 150ms cubic-bezier(0.4,0,0.2,1) forwards',
        }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <button type="button" onClick={prevMonth}
              style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--bg-2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronLeft size={14} />
            </button>

            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <button type="button" onClick={() => setMode(mode === 'month' ? 'day' : 'month')}
                style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', background: mode === 'month' ? 'var(--text-0)' : 'var(--bg-2)', color: mode === 'month' ? 'var(--bg-0)' : 'var(--text-0)', border: 'none', fontFamily: 'inherit', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
                {MONTHS[viewMonth]}
              </button>
              <button type="button" onClick={() => setMode(mode === 'year' ? 'day' : 'year')}
                style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', background: mode === 'year' ? 'var(--text-0)' : 'var(--bg-2)', color: mode === 'year' ? 'var(--bg-0)' : 'var(--text-0)', border: 'none', fontFamily: 'inherit', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
                {viewYear}
              </button>
            </div>

            <button type="button" onClick={nextMonth}
              style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'var(--bg-2)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Month Picker */}
          {mode === 'month' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.375rem' }}>
              {MONTHS.map((m, i) => (
                <button key={m} type="button" onClick={() => { setViewMonth(i); setMode('day'); }}
                  style={{ padding: '0.5rem', borderRadius: '8px', border: 'none', fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', background: i === viewMonth ? 'var(--text-0)' : 'var(--bg-2)', color: i === viewMonth ? 'var(--bg-0)' : 'var(--text-1)', transition: 'background 80ms' }}>
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          )}

          {/* Year Picker */}
          {mode === 'year' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.375rem', maxHeight: '160px', overflowY: 'auto' }}>
              {yearRange.map(y => (
                <button key={y} type="button" onClick={() => { setViewYear(y); setMode('day'); }}
                  style={{ padding: '0.5rem', borderRadius: '8px', border: 'none', fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer', background: y === viewYear ? 'var(--text-0)' : 'var(--bg-2)', color: y === viewYear ? 'var(--bg-0)' : 'var(--text-1)', transition: 'background 80ms' }}>
                  {y}
                </button>
              ))}
            </div>
          )}

          {/* Day Grid */}
          {mode === 'day' && (
            <>
              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '0.375rem' }}>
                {DAYS.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '0.5625rem', fontWeight: 600, color: 'var(--text-3)', padding: '0.25rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
                ))}
              </div>

              {/* Date cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                {cells.map((cell, idx) => {
                  const sel = isSelected(cell.date);
                  const tod = isToday(cell.date);
                  const dis = isDisabled(cell.date);
                  return (
                    <button key={idx} type="button" onClick={() => selectDate(cell.date)}
                      disabled={dis}
                      style={{
                        aspectRatio: '1', borderRadius: '50%', border: tod && !sel ? '1.5px solid var(--text-3)' : 'none',
                        background: sel ? 'var(--text-0)' : 'transparent',
                        color: sel ? 'var(--bg-0)' : !cell.cur ? 'var(--text-4)' : dis ? 'var(--text-4)' : 'var(--text-0)',
                        fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: sel ? 700 : 400,
                        cursor: dis ? 'not-allowed' : 'pointer', opacity: dis ? 0.4 : 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 80ms',
                      }}
                      onMouseEnter={e => { if (!sel && !dis) (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)'; }}
                      onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                <button type="button" onClick={() => { onChange(''); setOpen(false); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Clear
                </button>
                <button type="button" onClick={() => selectDate(today)}
                  style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Today
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default DatePicker;
