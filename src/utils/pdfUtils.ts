import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import type { Transaction, DashboardStats, User, DailyReport } from '../types';
import { getExpenseBreakdown } from './financeUtils';

// Register autoTable
applyPlugin(jsPDF);

// Standardize PDF currency formatting to avoid unicode font issues (jsPDF default fonts don't support ₹ securely without custom font files)
const formatPDFNumber = (amount: number): string => {
  return 'Rs. ' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Global PDF styling constants
const brandDark: [number, number, number] = [20, 20, 20];
const brandGrey: [number, number, number] = [120, 120, 120];
const lightBorder: [number, number, number] = [230, 230, 230];

// Custom header renderer for PDF
const renderPDFHeader = (doc: jsPDF, title: string, subtitle: string, restaurantName: string) => {
  const pageWidth = doc.internal.pageSize.width;
  
  // Brand accent line
  doc.setDrawColor(...brandDark);
  doc.setLineWidth(1.5);
  doc.line(14, 15, pageWidth - 14, 15);

  doc.setTextColor(...brandDark);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(restaurantName.toUpperCase(), 14, 28);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...brandGrey);
  doc.text(title.toUpperCase(), 14, 35);
  doc.text(subtitle.toUpperCase(), pageWidth - 14, 35, { align: 'right' });
  
  // Bottom border for header area
  doc.setDrawColor(...lightBorder);
  doc.setLineWidth(0.5);
  doc.line(14, 40, pageWidth - 14, 40);
};

export const generateTransactionStatement = (
  transactions: Transaction[],
  user: User,
  dateRange: string = 'Current Period',
  restaurantName: string = 'CafeFlow'
) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    renderPDFHeader(doc, 'ACCOUNT STATEMENT', dateRange, restaurantName);

    doc.setFontSize(8);
    doc.setTextColor(...brandGrey);
    doc.text(`REQUESTED BY: ${user.phone || user.email}`, pageWidth - 14, 45, { align: 'right' });

    const tableBody = transactions.map(t => {
      const d = new Date(t.date);
      const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      const ref = `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      return [
        `${dateStr}\n${timeStr}`,
        `${(t.type === 'sale' ? 'Sale / Revenue' : (t.vendor || t.category || 'General')).toUpperCase()}\n${ref}`,
        t.type.toUpperCase(),
        t.paymentType.toUpperCase(),
        formatPDFNumber(t.amount)
      ];
    });

    (doc as any).autoTable({
      startY: 55,
      head: [['DATE / TIME', 'DESCRIPTION', 'TYPE', 'METHOD', 'AMOUNT']],
      body: tableBody,
      theme: 'plain',
      headStyles: { textColor: brandDark, fontSize: 8, fontStyle: 'bold', cellPadding: 6 },
      styles: { fontSize: 8, cellPadding: 6, textColor: [60,60,60], valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 35 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 40, halign: 'right', fontStyle: 'bold', textColor: brandDark },
      },
      didDrawCell: (data: any) => {
        // Add subtle bottom border to all rows for clean minimal look
        if (data.row.section === 'body' || data.row.section === 'head') {
          doc.setDrawColor(...lightBorder);
          doc.setLineWidth(0.1);
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
        }
      }
    });

    // Footer
    const pages = doc.internal.pages.length - 1;
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(...brandGrey);
      doc.text(
        `${restaurantName.toUpperCase()} · PAGE ${i}/${pages} · GENERATED ON ${new Date().toLocaleDateString('en-IN').toUpperCase()}`,
        pageWidth / 2, pageHeight - 10, { align: 'center' }
      );
    }

    doc.save(`Statement_${restaurantName.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  } catch (err) {
    console.error('[CafeFlow] PDF generation failed:', err);
  }
};

export const generateDailyReportPDF = (
  report: DailyReport,
  transactions: Transaction[],
  restaurantName: string = 'CafeFlow'
) => {
  try {
    const doc = new jsPDF();
    renderPDFHeader(doc, 'DAILY CLOSING REPORT', report.date, restaurantName);

    doc.setTextColor(...brandDark);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Financial Summary', 14, 55);

    (doc as any).autoTable({
      startY: 62,
      head: [['METRIC', 'AMOUNT']],
      body: [
        ['Total Sales Revenue', formatPDFNumber(report.sales)],
        ['Total Expenses', formatPDFNumber(report.expenses)],
        ['Expected Cash in Drawer', formatPDFNumber(report.expectedCash)],
        ['Actual Cash Counted', formatPDFNumber(report.actualCash)],
        ['Cash Discrepancy', formatPDFNumber(report.discrepancy)],
        ['Net Profit (Today)', formatPDFNumber(report.profit)],
      ],
      theme: 'plain',
      headStyles: { textColor: brandDark, fontSize: 9, fontStyle: 'bold', cellPadding: 6 },
      styles: { fontSize: 9, cellPadding: 6, textColor: [60,60,60] },
      columnStyles: { 
        0: { fontStyle: 'bold' },
        1: { halign: 'right', fontStyle: 'bold', textColor: brandDark } 
      },
      didDrawCell: (data: any) => {
        doc.setDrawColor(...lightBorder);
        doc.setLineWidth(0.1);
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    });

    const breakdown = getExpenseBreakdown(transactions.filter(t => t.date.split('T')[0] === report.date));
    if (breakdown.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Expense Allocation', 14, (doc as any).lastAutoTable.finalY + 20);

      (doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 26,
        head: [['CATEGORY', 'AMOUNT', 'SHARE']],
        body: breakdown.map(b => [b.name.toUpperCase(), formatPDFNumber(b.value), `${b.percentage}%`]),
        theme: 'plain',
        headStyles: { textColor: brandDark, fontSize: 9, fontStyle: 'bold', cellPadding: 6 },
        styles: { fontSize: 9, cellPadding: 6, textColor: [60,60,60] },
        columnStyles: { 
          1: { halign: 'right', fontStyle: 'bold' }, 
          2: { halign: 'right' } 
        },
        didDrawCell: (data: any) => {
          doc.setDrawColor(...lightBorder);
          doc.setLineWidth(0.1);
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
        }
      });
    }

    doc.save(`ClosingReport_${report.date}.pdf`);
  } catch (err) {
    console.error('[CafeFlow] Daily report failed:', err);
  }
};

export const generateMonthlyReportPDF = (
  transactions: Transaction[],
  stats: DashboardStats,
  monthLabel: string,
  restaurantName: string = 'CafeFlow'
) => {
  try {
    const doc = new jsPDF();
    renderPDFHeader(doc, 'MONTHLY BUSINESS REVIEW', monthLabel, restaurantName);

    doc.setTextColor(...brandDark);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Performance Indicators', 14, 55);

    (doc as any).autoTable({
      startY: 62,
      head: [['KPI', 'VALUE', 'CLASSIFICATION']],
      body: [
        ['Total Revenue (Sales)', formatPDFNumber(stats.totalSales), 'Credit'],
        ['Total Operating Expenses', formatPDFNumber(stats.totalExpenses), 'Debit'],
        ['Estimated Cost of Goods (COGS)', formatPDFNumber(stats.cogs), 'Variable / Material'],
        ['Fixed Overhead Costs', formatPDFNumber(stats.fixedExpenses), 'Fixed'],
        ['Variable Operating Costs', formatPDFNumber(stats.variableExpenses), 'Variable'],
        ['Net Profit (Period)', formatPDFNumber(stats.netProfit), stats.netProfit >= 0 ? 'Surplus' : 'Deficit'],
      ],
      theme: 'plain',
      headStyles: { textColor: brandDark, fontSize: 9, fontStyle: 'bold', cellPadding: 6 },
      styles: { fontSize: 9, cellPadding: 6, textColor: [60,60,60] },
      columnStyles: { 
        0: { fontStyle: 'bold' },
        1: { halign: 'right', fontStyle: 'bold', textColor: brandDark },
        2: { halign: 'right', textColor: brandGrey } 
      },
      didDrawCell: (data: any) => {
        doc.setDrawColor(...lightBorder);
        doc.setLineWidth(0.1);
        doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
      }
    });

    const breakdown = getExpenseBreakdown(transactions);
    if (breakdown.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Expense Allocation by Category', 14, (doc as any).lastAutoTable.finalY + 20);

      (doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 26,
        head: [['CATEGORY', 'TOTAL SPENT', 'SHARE']],
        body: breakdown.map(b => [b.name.toUpperCase(), formatPDFNumber(b.value), `${b.percentage}%`]),
        theme: 'plain',
        headStyles: { textColor: brandDark, fontSize: 9, fontStyle: 'bold', cellPadding: 6 },
        styles: { fontSize: 9, cellPadding: 6, textColor: [60,60,60] },
        columnStyles: { 
          1: { halign: 'right', fontStyle: 'bold' }, 
          2: { halign: 'right' } 
        },
        didDrawCell: (data: any) => {
          doc.setDrawColor(...lightBorder);
          doc.setLineWidth(0.1);
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
        }
      });
    }

    doc.setFontSize(8);
    doc.setTextColor(...brandGrey);
    doc.text(`Generated exactly at ${new Date().toLocaleString('en-IN')} · Powered by CafeFlow AI`, 14, doc.internal.pageSize.height - 12);

    doc.save(`MonthlyReview_${monthLabel.replace(/\s+/g, '_')}.pdf`);
  } catch (err) {
    console.error('[CafeFlow] Monthly report failed:', err);
  }
};
