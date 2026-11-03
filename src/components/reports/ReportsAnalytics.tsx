import React, { useState } from 'react';
import {
  BarChart3,
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  Bus,
  DollarSign,
  Package,
  Wrench,
  Users,
  CheckCircle2,
} from 'lucide-react';
import {
  Customer,
  Subscription,
  InventoryItem,
  WorkOrder,
  Dealer,
  Invoice,
  Expense,
} from '../../types/erp';
import { formatNPR, formatDate } from '../../utils/formatters';
import { exportToExcel, exportTableToPDF } from '../../utils/exportUtils';

interface ReportsAnalyticsProps {
  customers: Customer[];
  subscriptions: Subscription[];
  inventory: InventoryItem[];
  workOrders: WorkOrder[];
  dealers: Dealer[];
  invoices: Invoice[];
  expenses: Expense[];
}

export const ReportsAnalytics: React.FC<ReportsAnalyticsProps> = ({
  customers,
  subscriptions,
  inventory,
  workOrders,
  dealers,
  invoices,
  expenses,
}) => {
  const [selectedReport, setSelectedReport] = useState<'subs' | 'tax' | 'inventory' | 'tickets' | 'dealers'>('subs');

  // Total inventory valuation
  const totalInventoryCost = inventory.reduce((acc, curr) => acc + curr.costNpr, 0);
  const totalInventorySelling = inventory.reduce((acc, curr) => acc + curr.sellingNpr, 0);

  // Revenue & tax
  const totalTaxCollected = invoices
    .filter((i) => i.status === 'paid')
    .reduce((acc, curr) => acc + curr.vatAmountNpr, 0);
  const totalNetRevenue = invoices
    .filter((i) => i.status === 'paid')
    .reduce((acc, curr) => acc + curr.amountNpr, 0);

  // 1. Export Subscriptions
  const handleExportSubs = (format: 'excel' | 'pdf') => {
    if (format === 'excel') {
      const data = subscriptions.map((s) => ({
        'Vehicle Number': s.vehicleNumber,
        Operator: s.customerName,
        'Plan Name': s.planName,
        'Service Type': s.serviceType.toUpperCase(),
        'Fee (NPR)': s.feeNpr,
        'Billing Cycle': s.billingCycle,
        'Expiry Date': formatDate(s.expiryDate),
        Status: s.status.toUpperCase(),
      }));
      exportToExcel(data, 'Netcare_Fleet_Subscriptions', 'Subscriptions');
    } else {
      const headers = ['Vehicle No.', 'Operator', 'Service Plan', 'Cycle', 'Fee (NPR)', 'Status'];
      const rows = subscriptions.map((s) => [
        s.vehicleNumber,
        s.customerName,
        s.planName,
        s.billingCycle,
        formatNPR(s.feeNpr),
        s.status.toUpperCase(),
      ]);
      exportTableToPDF(
        'Netcare Nepal - Bus Fleet Telematics Subscriptions Report',
        headers,
        rows,
        'Netcare_Fleet_Subscriptions',
        `Generated for ${subscriptions.length} registered bus telematics systems.`
      );
    }
  };

  // 2. Export Tax & Invoicing
  const handleExportTax = (format: 'excel' | 'pdf') => {
    if (format === 'excel') {
      const data = invoices.map((i) => ({
        'Invoice #': i.invoiceNumber,
        Customer: i.customerName,
        'PAN Number': i.customerPan || 'N/A',
        'Subtotal (NPR)': i.amountNpr,
        '13% VAT (NPR)': i.vatAmountNpr,
        'Total Invoiced (NPR)': i.totalNpr,
        'Issued Date': formatDate(i.issuedDate),
        Status: i.status.toUpperCase(),
      }));
      exportToExcel(data, 'Netcare_VAT_Tax_Audit_Report', 'VAT Invoices');
    } else {
      const headers = ['Invoice #', 'Operator', 'PAN No.', 'Subtotal (NPR)', '13% VAT (NPR)', 'Total (NPR)', 'Status'];
      const rows = invoices.map((i) => [
        i.invoiceNumber,
        i.customerName,
        i.customerPan || '-',
        formatNPR(i.amountNpr),
        formatNPR(i.vatAmountNpr),
        formatNPR(i.totalNpr),
        i.status.toUpperCase(),
      ]);
      exportTableToPDF(
        'Netcare Nepal - IRD 13% VAT Audit & Invoicing Report',
        headers,
        rows,
        'Netcare_VAT_Tax_Report',
        `Net 13% Nepal VAT Liability Tracked: ${formatNPR(totalTaxCollected)}`
      );
    }
  };

  // 3. Export Inventory
  const handleExportInventory = (format: 'excel' | 'pdf') => {
    if (format === 'excel') {
      const data = inventory.map((i) => ({
        'Item Name': i.itemName,
        Category: i.category,
        'Serial No': i.serialNumber,
        'IMEI / IMSI': i.imeiOrImsi || '-',
        'Cost (NPR)': i.costNpr,
        'Location / Bus': i.assignedVehicle || i.location,
        Status: i.status.toUpperCase(),
      }));
      exportToExcel(data, 'Netcare_Hardware_Valuation_Report', 'Inventory');
    } else {
      const headers = ['Model / Asset', 'Serial / IMEI', 'Cost (NPR)', 'Assignment / Depot', 'Status'];
      const rows = inventory.map((i) => [
        i.brandModel || i.itemName || '-',
        i.serialNumber || (i.serialNumbers && i.serialNumbers[0]) || '-',
        formatNPR(i.costNpr || i.purchasePriceNpr || 0),
        i.assignedVehicle ? `Bus ${i.assignedVehicle}` : (i.location || i.warehouseLocation || '-'),
        (i.status || 'in_stock').toUpperCase(),
      ]);
      exportTableToPDF(
        'Netcare Nepal - Hardware & M2M SIM Asset Valuation Report',
        headers,
        rows,
        'Netcare_Asset_Valuation',
        `Total Assets Tracked: ${inventory.length} units | Asset Book Value: ${formatNPR(totalInventoryCost)}`
      );
    }
  };

  // 4. Export Work Orders
  const handleExportTickets = (format: 'excel' | 'pdf') => {
    if (format === 'excel') {
      const data = workOrders.map((w) => ({
        'Ticket #': w.ticketNumber,
        Title: w.title,
        Vehicle: w.vehicleNumber,
        Operator: w.customerName,
        Technician: w.assignedTechnicianName || 'Unassigned',
        Priority: w.priority.toUpperCase(),
        Status: w.status.toUpperCase(),
        Date: formatDate(w.createdAt),
      }));
      exportToExcel(data, 'Netcare_Technician_Operations_Report', 'WorkOrders');
    } else {
      const headers = ['Ticket #', 'Title & Vehicle', 'Operator', 'Priority', 'Technician', 'Status'];
      const rows = workOrders.map((w) => [
        w.jobId || w.ticketNumber || '-',
        `${w.title || w.jobType || 'Service'} (${w.busNumber || w.vehicleNumber || '-'})`,
        w.customerName || '-',
        String(w.priority || 'Medium').toUpperCase(),
        w.assignedTechnicianName || 'Pending',
        String(w.status || 'Pending').toUpperCase(),
      ]);
      exportTableToPDF(
        'Netcare Nepal - Field Operations & Technician SLA Report',
        headers,
        rows,
        'Netcare_Technician_SLA',
        `Field Work Orders Completed: ${workOrders.filter((w) => w.status === 'completed').length} / ${workOrders.length}`
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">
          Executive Reports & Analytics Engine
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Generate formal enterprise compliance reports, Nepal VAT filings, and fleet telematics analytics
        </p>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Subscriptions Report */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-red-400 transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <Bus className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Fleet Subscriptions & Expiries</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Full breakdown of active bus WiFi routers, GPS telematics, and upcoming SIM contract expiries.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
            <button
              onClick={() => handleExportSubs('excel')}
              className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>
            <button
              onClick={() => handleExportSubs('pdf')}
              className="flex-1 py-1.5 px-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Card 2: VAT Tax & Audit */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-red-400 transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <DollarSign className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Nepal 13% VAT & Invoicing Audit</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Tax invoices, customer PAN matching, VAT collections, and accounts receivable reconciliation.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
            <button
              onClick={() => handleExportTax('excel')}
              className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>
            <button
              onClick={() => handleExportTax('pdf')}
              className="flex-1 py-1.5 px-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Card 3: Hardware Valuation */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-red-400 transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Hardware & Asset Valuation</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Cost vs selling valuation for routers, Concox GPS units, Dahua MDVRs, and SIM inventory.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
            <button
              onClick={() => handleExportInventory('excel')}
              className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>
            <button
              onClick={() => handleExportInventory('pdf')}
              className="flex-1 py-1.5 px-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* Card 4: Technician Performance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-red-400 transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <Wrench className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Field Technician Operations</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Ticket resolution turnaround times, technician dispatch logs at bus terminals, and parts replaced.
            </p>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-2">
            <button
              onClick={() => handleExportTickets('excel')}
              className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>
            <button
              onClick={() => handleExportTickets('pdf')}
              className="flex-1 py-1.5 px-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
