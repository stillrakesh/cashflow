import React, { useEffect, useState } from 'react';
import type { Shift, Role } from '../../types';
import { formatINR } from '../../utils/financeUtils';
import { listenToAllShifts } from '../../lib/db';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ShiftLogsProps {
  orgId: string;
  role: Role;
}

const ShiftLogs: React.FC<ShiftLogsProps> = ({ orgId, role }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);

  useEffect(() => {
    if (role !== 'admin' || !orgId) return;
    const unsub = listenToAllShifts(orgId, setShifts);
    return () => unsub();
  }, [orgId, role]);

  if (role !== 'admin') return null;

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <p className="section-label">recent staff shifts</p>
      {shifts.length === 0 ? (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)' }}>No shifts recorded yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {shifts.slice(0, 5).map(shift => {
            const isClosed = shift.status === 'closed';
            const discrepancy = shift.discrepancy || 0;
            const hasShortage = discrepancy < 0;
            const hasOverage = discrepancy > 0;

            return (
              <div key={shift.id} className="card animate-in" style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderLeft: isClosed ? (hasShortage ? '3px solid var(--red)' : hasOverage ? '3px solid var(--yellow)' : '3px solid var(--green)') : '3px solid var(--blue)' }}>
                <div>
                  <p className="text-heading" style={{ fontSize: '0.8125rem', marginBottom: '0.125rem' }}>{shift.userName}</p>
                  <p className="text-label" style={{ textTransform: 'none', marginBottom: '0.25rem' }}>
                    {new Date(shift.startTime).toLocaleString('en-IN', { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' })} 
                    {isClosed && shift.endTime ? ` — ${new Date(shift.endTime).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}` : ' (Active)'}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {isClosed ? (
                    <>
                      <p className="text-label" style={{ textTransform: 'none' }}>
                        Float: <span className="text-number" style={{ fontSize: '0.75rem' }}>{formatINR(shift.startingCash)}</span>
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem', marginTop: '0.125rem' }}>
                        {discrepancy === 0 ? (
                          <><CheckCircle2 size={12} color="var(--green)" /> <span className="text-heading" style={{ fontSize: '0.75rem', color: 'var(--green)' }}>Matched</span></>
                        ) : hasShortage ? (
                          <><AlertCircle size={12} color="var(--red)" /> <span className="text-heading" style={{ fontSize: '0.75rem', color: 'var(--red)' }}><span className="text-number" style={{ fontSize: '0.75rem' }}>{formatINR(Math.abs(discrepancy))}</span> Short</span></>
                        ) : (
                          <><AlertCircle size={12} color="var(--yellow)" /> <span className="text-heading" style={{ fontSize: '0.75rem', color: 'var(--yellow)' }}><span className="text-number" style={{ fontSize: '0.75rem' }}>{formatINR(Math.abs(discrepancy))}</span> Over</span></>
                        )}
                      </div>
                    </>
                  ) : (
                    <span className="text-label" style={{ color: 'var(--blue)', background: 'var(--blue-soft)', padding: '0.125rem 0.375rem', borderRadius: '4px', textTransform: 'uppercase' }}>Active</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ShiftLogs;
