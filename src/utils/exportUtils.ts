import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

/**
 * Enterprise Report Exporter for Netcare Nepal ERP
 */

export function exportToExcel(data: Record<string, any>[], filename: string, sheetTitle = 'Report') {
  try {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetTitle.slice(0, 31));
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  } catch (error) {
    console.error('Failed to export to Excel:', error);
    alert('Failed to generate Excel file: ' + (error as Error).message);
  }
}

export function exportTableToPDF(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string,
  summaryNotes?: string
) {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // Netcare Red Top Accent Bar
    doc.setFillColor(225, 29, 72); // Netcare Crimson Red
    doc.rect(0, 0, pageWidth, 12, 'F');

    // Netcare Charcoal Header Bar
    doc.setFillColor(15, 23, 42); // Charcoal
    doc.rect(0, 12, pageWidth, 60, 'F');

    // Header Titles
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('NETCARE NEPAL PVT. LTD. - ERP REPORT', 40, 42);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Subidhanagar, Tinkune, Kathmandu, Nepal | Bus WiFi • CCTV • GPS Telematics', 40, 58);

    // Report Title & Date
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), 40, 105);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const nepaliDateStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kathmandu',
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(new Date());
    doc.text(`Generated on: ${nepaliDateStr} (Kathmandu Time)`, 40, 120);

    if (summaryNotes) {
      doc.text(summaryNotes, 40, 134);
    }

    // Render Table manually with clean styling
    let startY = summaryNotes ? 150 : 138;
    const colWidth = (pageWidth - 80) / headers.length;
    const rowHeight = 22;

    // Table Header Row
    doc.setFillColor(241, 245, 249);
    doc.rect(40, startY, pageWidth - 80, rowHeight, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);

    headers.forEach((h, i) => {
      doc.text(String(h).toUpperCase(), 45 + i * colWidth, startY + 14);
    });

    startY += rowHeight;

    // Table Body Rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    rows.forEach((row, rowIndex) => {
      if (startY > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        startY = 40;
      }

      // Alternating row background
      if (rowIndex % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(40, startY, pageWidth - 80, rowHeight, 'F');
      }

      // Border line
      doc.setDrawColor(226, 232, 240);
      doc.line(40, startY + rowHeight, pageWidth - 40, startY + rowHeight);

      doc.setTextColor(51, 65, 85);
      row.forEach((cell, i) => {
        const text = String(cell ?? '');
        const truncated = text.length > 28 ? text.slice(0, 25) + '...' : text;
        doc.text(truncated, 45 + i * colWidth, startY + 14);
      });

      startY += rowHeight;
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Confidential - Netcare Nepal Pvt. Ltd. | Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 15,
        { align: 'center' }
      );
    }

    doc.save(`${filename}_${new Date().toISOString().slice(0, 10)}.pdf`);
  } catch (error) {
    console.error('Failed to export PDF:', error);
    alert('Failed to generate PDF file: ' + (error as Error).message);
  }
}
