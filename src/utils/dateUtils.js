import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, subDays } from 'date-fns';

export function today() {
  return format(new Date(), 'yyyy-MM-dd');
}

export function formatDate(dateStr, fmt = 'MMM d, yyyy') {
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return dateStr;
  }
}

export function formatTime(dateStr, fmt = 'h:mm a') {
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr) {
  try {
    return format(parseISO(dateStr), 'MMM d, h:mm a');
  } catch {
    return dateStr;
  }
}

export function weekRange() {
  const now = new Date();
  return {
    start: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    end: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  };
}

export function last7Days() {
  return eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() })
    .map(d => format(d, 'yyyy-MM-dd'));
}

export function last30Days() {
  return eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() })
    .map(d => format(d, 'yyyy-MM-dd'));
}

export function groupByDate(items, dateKey = 'date') {
  return items.reduce((acc, item) => {
    const key = item[dateKey] ? item[dateKey].slice(0, 10) : 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

export function isoNow() {
  return new Date().toISOString();
}

export function todayISO() {
  return `${today()}T00:00:00.000Z`;
}

export function durationMinutes(start, end) {
  try {
    const s = parseISO(start);
    const e = parseISO(end);
    return Math.round((e - s) / 60000);
  } catch {
    return 0;
  }
}

export function minutesToHoursLabel(mins) {
  if (!mins) return '0h';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
