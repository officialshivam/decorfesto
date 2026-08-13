export const TIME_SLOTS = [
  { label: '10:00 AM – 12:00 PM', startHour: 10, startMinute: 0 },
  { label: '12:00 PM – 2:00 PM', startHour: 12, startMinute: 0 },
  { label: '2:00 PM – 4:00 PM', startHour: 14, startMinute: 0 },
  { label: '4:00 PM – 6:00 PM', startHour: 16, startMinute: 0 },
  { label: '6:00 PM – 8:00 PM', startHour: 18, startMinute: 0 },
  { label: '8:00 PM – 10:00 PM', startHour: 20, startMinute: 0 },
];

export function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function normalizeDateToISO(dateVal) {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    const year = dateVal.getFullYear();
    const month = String(dateVal.getMonth() + 1).padStart(2, '0');
    const day = String(dateVal.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const str = String(dateVal).trim();
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
  }

  return str;
}

export function isTimeSlotPast(dateStr, slotLabel) {
  if (!dateStr || !slotLabel) return false;

  const isoDate = normalizeDateToISO(dateStr);
  const todayStr = getTodayDateString();

  if (isoDate < todayStr) return true; // Past date
  if (isoDate > todayStr) return false; // Future date

  // For TODAY: compare current local hour & minute vs slot start time
  const targetLabel = String(slotLabel).replace(/\s+/g, ' ').replace(/–|-/g, '-').trim();
  const slotObj = TIME_SLOTS.find((s) => {
    const norm = String(s.label).replace(/\s+/g, ' ').replace(/–|-/g, '-').trim();
    return norm === targetLabel || targetLabel.startsWith(norm);
  });

  if (!slotObj) return false;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  if (currentHour > slotObj.startHour) {
    return true;
  }
  if (currentHour === slotObj.startHour && currentMinute >= slotObj.startMinute) {
    return true;
  }

  return false;
}
