export { ARABIC_MONTHS } from '@/types';

export function formatNumber(n: number, decimals = 2): string {
  if (isNaN(n) || n === null || n === undefined) return '0';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function formatCurrency(n: number): string {
  return `${formatNumber(n, 2)} دج`;
}

export function formatQuantity(n: number): string {
  return formatNumber(n, 3);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ar-DZ');
}

export function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function getStockStatus(remaining: number, minStock: number): {
  label: string;
  color: string;
  dot: string;
} {
  if (remaining <= 0) {
    return { label: 'نفدت المادة', color: 'text-red-600', dot: 'bg-red-500' };
  }
  if (remaining < minStock) {
    return { label: 'مخزون منخفض', color: 'text-amber-600', dot: 'bg-amber-500' };
  }
  return { label: 'مخزون جيد', color: 'text-emerald-600', dot: 'bg-emerald-500' };
}
