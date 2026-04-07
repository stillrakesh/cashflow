import { jsPDF } from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';
import type { Transaction, DashboardStats, User } from '../types';
import { formatINR } from './financeUtils';

// Register autoTable as doc.autoTable()
applyPlugin(jsPDF);

export const generateTransactionStatement = (
  transactions: Transaction[],
  user: User,
  dateRange: string = 'Current Period',
  restaurantName: string = 'CafeFlow'
) => {
  try {
    console.log('[CafeFlow] Starting PDF Generation…', transactions.length, 'transactions');
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const textColor: [number, number, number] = [26, 26, 26];
    const mutedColor: [number, number, number] = [115, 115, 115];

    // — Header: Brand block —
    doc.setFillColor(26, 26, 26);
    doc.rect(20, 20, 10, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Cf', 25, 26.5, { align: 'center' });

    doc.setTextColor(...textColor);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(restaurantName, 35, 25.5);

    doc.setFontSize(8);
    doc.text('ACCOUNT STATEMENT', pageWidth - 20, 24, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedColor);
    doc.text(`ID: ${user.phone || user.email}`, pageWidth - 20, 28, { align: 'right' });
    doc.text(dateRange, pageWidth - 20, 32, { align: 'right' });

    // — Table rows —
    const tableBody = transactions.map(t => {
      const d = new Date(t.date);
      const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      const ref = `CF-${Math.floor(Math.random() * 1e6).toString().padStart(6, '0')}`;

      return [
        `${dateStr}\n${timeStr.toLowerCase()}`,
        `${(t.type === 'sale' ? 'Daily Sales' : (t.vendor || t.category || 'General')).toUpperCase()}\nRef: ${ref} · ${t.status}`,
        t.type === 'sale' ? '+ Credit' : '- Debit',
        formatINR(t.amount),
      ];
    });

    (doc as any).autoTable({
      startY: 45,
      head: [['DATE', 'DETAILS', 'TYPE', 'AMOUNT']],
      body: tableBody,
      theme: 'plain',
      headStyles: { fillColor: [255, 255, 255], textColor: textColor, fontSize: 7, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 5, textColor: textColor, valign: 'top' as const },
      columnStyles: {
        0: { cellWidth: 32 },
        2: { cellWidth: 28, halign: 'center' as const, fontStyle: 'bold' as const },
        3: { cellWidth: 38, halign: 'right' as const, fontStyle: 'bold' as const },
      },
    });

    // — Footer —
    const pages = doc.internal.pages.length - 1;
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(...mutedColor);
      doc.text(
        `${restaurantName.toUpperCase()} LEDGER · PAGE ${i}/${pages} · ${new Date().toLocaleDateString('en-IN').toUpperCase()}`,
        pageWidth / 2, pageHeight - 10, { align: 'center' }
      );
    }

    doc.save(`Statement_${restaurantName.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    console.log('[CafeFlow] PDF downloaded successfully.');
  } catch (err) {
    console.error('[CafeFlow] PDF generation failed:', err);
    alert('PDF download failed. Please check the console for logs.');
  }
};

export const generateMonthlyReport = (
  transactions: Transaction[],
  stats: DashboardStats,
  monthLabel: string,
  restaurantName: string = 'CafeFlow'
) => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, pageWidth, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(restaurantName.toUpperCase(), 15, 22);
    doc.setFontSize(9);
    doc.text(`FINANCIAL SUMMARY: ${monthLabel.toUpperCase()}`, 15, 30);

    (doc as any).autoTable({
      startY: 50,
      head: [['METRIC', 'VALUE']],
      body: [
        ['Total Income', formatINR(stats.totalSales)],
        ['Total Expenses', formatINR(stats.totalExpenses)],
        ['Net Result', formatINR(stats.netProfit)],
        ['Profitability', `${(stats.profitMargin * 100).toFixed(1)}%`],
      ],
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 4 },
    });

    doc.save(`Report_${monthLabel.replace(/\s+/g, '_')}.pdf`);
  } catch (err) {
    console.error('[CafeFlow] Monthly report failed:', err);
  }
};
