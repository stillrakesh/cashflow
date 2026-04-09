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
    <div className="animate-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-card)', marginBottom: 'var(--spacing-section)' }}>
        <button onClick={onBack} className="btn-ghost" style={{ width: '48px' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-title" style={{ fontSize: '1.5rem' }}>Reports History</h1>
          <p className="text-label" style={{ textTransform: 'none', margin: 0 }}>View past daily closings and reconciliations</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-card)' }}>
        {reports.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <History size={48} style={{ color: 'var(--text-4)', marginBottom: 'var(--spacing-sm)', margin: '0 auto' }} />
            <p className="text-light" style={{ color: 'var(--text-3)' }}>No reports generated yet.</p>
          </div>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-card)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ 
                    width: '40px', height: '40px', borderRadius: 'var(--radius-m)', background: 'var(--bg-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)'
                  }}>
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="text-heading" style={{ fontSize: '0.9375rem' }}>{report.date}</h3>
                    <p className="text-label" style={{ textTransform: 'none', margin: 0 }}>
                      Closed at {new Date(report.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                
                {isAdmin && onDeleteReport && (
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <button 
                      onClick={() => generateDailyReportPDF(report, transactions, restaurantName)}
                      className="btn-ghost"
                      style={{ width: '48px' }}
                      title="Download PDF Report"
                    >
                      <FileText size={16} />
                    </button>
                    <button 
                      onClick={() => onDeleteReport(report.id)}
                      className="btn-danger" 
                      style={{ width: '48px' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-sm)' }}>
                <div>
                  <p className="text-label" style={{ marginBottom: '0.25rem' }}>Sales</p>
                  <p className="text-number" style={{ fontSize: '0.8125rem', color: 'var(--green)' }}>{formatINR(report.sales)}</p>
                </div>
                <div>
                  <p className="text-label" style={{ marginBottom: '0.25rem' }}>Expenses</p>
                  <p className="text-number" style={{ fontSize: '0.8125rem', color: 'var(--red)' }}>{formatINR(report.expenses)}</p>
                </div>
                <div>
                  <p className="text-label" style={{ marginBottom: '0.25rem' }}>Net profit</p>
                  <p className="text-number" style={{ fontSize: '0.8125rem' }}>{formatINR(report.profit)}</p>
                </div>
              </div>

              <div style={{ 
                marginTop: 'var(--spacing-card)', paddingTop: 'var(--spacing-card)', borderTop: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <p className="text-label" style={{ marginBottom: '0.25rem' }}>Cash Discrepancy</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    {report.discrepancy === 0 ? (
                      <span className="text-heading" style={{ fontSize: '0.75rem', color: 'var(--green)' }}>Balanced</span>
                    ) : (
                      <>
                        {report.discrepancy > 0 ? <ArrowUpRight size={14} color="var(--blue)" /> : <ArrowDownRight size={14} color="var(--red)" />}
                        <span className="text-number" style={{ fontSize: '0.75rem', color: report.discrepancy > 0 ? 'var(--blue)' : 'var(--red)' }}>
                          {formatINR(Math.abs(report.discrepancy))}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <p className="text-label" style={{ marginBottom: '0.25rem' }}>Counted Cash</p>
                  <p className="text-number" style={{ fontSize: '0.8125rem' }}>{formatINR(report.actualCash)}</p>
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
