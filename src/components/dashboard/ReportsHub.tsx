import React from 'react';
import { 
  History, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  Trash2,
  ArrowLeft,
  FileText
} from 'lucide-react';
import { formatINR } from '../../utils/financeUtils';
import { generateDailyReportPDF } from '../../utils/pdfUtils';
import type { DailyReport, Transaction } from '../../types';

interface ReportsHubProps {
  reports: DailyReport[];
  transactions: Transaction[];
  onDeleteReport?: (id: string) => Promise<void>;
  onBack: () => void;
  isAdmin: boolean;
  restaurantName?: string;
}

const ReportsHub: React.FC<ReportsHubProps> = ({ 
  reports, transactions, onDeleteReport, onBack, isAdmin, restaurantName 
}) => {
  return (
    <div className="animate-in" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-card)', marginBottom: 'var(--spacing-section)' }}>
        <button onClick={onBack} className="btn-ghost" style={{ width: '48px' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-title" style={{ fontSize: '1.5rem' }}>Reports History</h1>
          <p className="text-label" style={{ textTransform: 'none', margin: 0 }}>View past daily closings and reconciliations</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {reports.length === 0 ? (
          <div className="card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
            <History size={40} style={{ color: 'var(--text-4)', marginBottom: '1rem', margin: '0 auto' }} />
            <p className="text-light" style={{ color: 'var(--text-3)', fontSize: '0.875rem' }}>No reports generated yet.</p>
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ 
                    width: '44px', height: '44px', borderRadius: '12px', background: 'var(--bg-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-1)'
                  }}>
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="text-heading" style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{report.date}</h3>
                    <div style={{ display: 'inline-block', marginTop: '2px', padding: '2px 8px', background: 'var(--bg-2)', borderRadius: '6px' }}>
                      <p style={{ fontSize: '0.625rem', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.025em', fontWeight: 500 }}>
                        Closed {new Date(report.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
                
                {isAdmin && onDeleteReport && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => generateDailyReportPDF(report, transactions, restaurantName)}
                      className="btn-ghost"
                      style={{ width: '36px', height: '36px', padding: 0 }}
                      title="Download PDF Report"
                    >
                      <FileText size={16} />
                    </button>
                    <button 
                      onClick={() => { if(confirm(`Delete report for ${report.date}?`)) onDeleteReport(report.id); }}
                      className="btn-ghost" 
                      style={{ width: '36px', height: '36px', padding: 0, color: 'var(--red)' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', fontWeight: 600 }}>Sales</p>
                  <p className="text-number" style={{ fontSize: '0.875rem', color: 'var(--green)' }}>{formatINR(report.sales).replace('₹', 'Rs. ')}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', fontWeight: 600 }}>Expenses</p>
                  <p className="text-number" style={{ fontSize: '0.875rem', color: 'var(--red)' }}>{formatINR(report.expenses).replace('₹', 'Rs. ')}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', fontWeight: 600 }}>Net profit</p>
                  <p className="text-number" style={{ fontSize: '0.875rem', fontWeight: 600 }}>{formatINR(report.profit).replace('₹', 'Rs. ')}</p>
                </div>
              </div>

              <div style={{ 
                marginTop: '1.25rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', fontWeight: 600 }}>Cash Discrepancy</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    {report.discrepancy === 0 ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--green)', fontWeight: 600 }}>Balanced</span>
                    ) : (
                      <>
                        {report.discrepancy > 0 ? <ArrowUpRight size={14} color="var(--blue)" /> : <ArrowDownRight size={14} color="var(--red)" />}
                        <span className="text-number" style={{ fontSize: '0.8125rem', fontWeight: 500, color: report.discrepancy > 0 ? 'var(--blue)' : 'var(--red)' }}>
                          {formatINR(Math.abs(report.discrepancy)).replace('₹', 'Rs. ')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.625rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', fontWeight: 600 }}>Counted Cash</p>
                  <p className="text-number" style={{ fontSize: '0.875rem', fontWeight: 600 }}>{formatINR(report.actualCash).replace('₹', 'Rs. ')}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReportsHub;
