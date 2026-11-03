/**
 * Currency, Date & Nepali Localization Formatters
 * Netcare Nepal Pvt. Ltd. (Kathmandu, Nepal)
 */

export function formatNPR(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'रू 0';
  // South Asian numbering system (Lakhs and Crores)
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(amount);
  return `रू ${formatted}`;
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${day}/${month}/${year} ${formattedHours}:${minutes} ${ampm}`;
  } catch {
    return dateString;
  }
}

export function getDaysUntil(dateString: string): number {
  try {
    const target = new Date(dateString).getTime();
    const now = new Date().getTime();
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

export function getStatusBadge(status: string): { label: string; bg: string; text: string; dot: string } {
  switch (status.toLowerCase()) {
    case 'active':
    case 'paid':
    case 'completed':
    case 'in_stock':
      return { label: status.toUpperCase().replace('_', ' '), bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' };
    case 'pending':
    case 'pending_renewal':
    case 'assigned':
    case 'assigned_vehicle':
    case 'partially_paid':
      return { label: status.toUpperCase().replace('_', ' '), bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', dot: 'bg-amber-500' };
    case 'in_progress':
    case 'inspection':
      return { label: 'IN PROGRESS', bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' };
    case 'expired':
    case 'overdue':
    case 'faulty':
    case 'cancelled':
    case 'critical':
      return { label: status.toUpperCase().replace('_', ' '), bg: 'bg-rose-50 border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' };
    case 'suspended':
    case 'under_repair':
    case 'probation':
      return { label: status.toUpperCase().replace('_', ' '), bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500' };
    default:
      return { label: status.toUpperCase().replace('_', ' '), bg: 'bg-slate-100 border-slate-200', text: 'text-slate-700', dot: 'bg-slate-400' };
  }
}
