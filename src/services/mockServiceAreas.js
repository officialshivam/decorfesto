const SERVICE_AREAS_STORAGE_KEY = 'decorfesto-admin-service-areas';

export const defaultServiceAreas = [
  {
    id: '110001',
    pincode: '110001',
    city: 'Connaught Place, New Delhi',
    serviceable: true,
    createdAt: '2026-08-10T12:00:00.000Z',
    updatedAt: '2026-08-10T21:18:00.000Z',
  },
  {
    id: '400001',
    pincode: '400001',
    city: 'Fort, Mumbai',
    serviceable: true,
    createdAt: '2026-08-10T12:00:00.000Z',
    updatedAt: '2026-08-10T21:20:00.000Z',
  },
  {
    id: '110032',
    pincode: '110032',
    city: 'Shahdara Bihari Colony, Delhi',
    serviceable: false,
    createdAt: '2026-08-10T12:00:00.000Z',
    updatedAt: '2026-08-10T21:21:00.000Z',
  },
];

function cleanServiceArea(area) {
  const next = { ...area };
  delete next.leadTimeHours;
  delete next.active;
  return {
    id: String(next.id || next.pincode).trim(),
    pincode: String(next.pincode).trim(),
    city: String(next.city || '').trim(),
    serviceable: next.serviceable === true,
    createdAt: next.createdAt || new Date().toISOString(),
    updatedAt: next.updatedAt || new Date().toISOString(),
  };
}

function readServiceAreas() {
  if (typeof window === 'undefined') {
    return defaultServiceAreas.map(cleanServiceArea);
  }

  try {
    const stored = window.localStorage.getItem(SERVICE_AREAS_STORAGE_KEY);
    if (!stored) {
      window.localStorage.setItem(SERVICE_AREAS_STORAGE_KEY, JSON.stringify(defaultServiceAreas));
      return defaultServiceAreas.map(cleanServiceArea);
    }

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed.map(cleanServiceArea)
      : defaultServiceAreas.map(cleanServiceArea);
  } catch (error) {
    console.warn('Unable to read saved service areas.', error);
    return defaultServiceAreas.map(cleanServiceArea);
  }
}

function writeServiceAreas(serviceAreas) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SERVICE_AREAS_STORAGE_KEY, JSON.stringify(serviceAreas.map(cleanServiceArea)));
  }
}

export function getStoredServiceAreas() {
  return readServiceAreas();
}

export function findServiceAreaByPincode(pincode) {
  const pc = String(pincode || '').trim();
  if (!pc) return null;
  const areas = readServiceAreas();
  return areas.find((area) => area.pincode === pc || area.id === pc) || null;
}

export function saveStoredServiceArea(serviceArea) {
  const serviceAreas = readServiceAreas();
  const pincode = String(serviceArea.pincode).trim();
  const existingArea = serviceAreas.find((area) => area.pincode === pincode || area.id === serviceArea.id);

  const timestamp = new Date().toISOString();
  const isServiceable = serviceArea.serviceable === true;

  const nextArea = cleanServiceArea({
    ...existingArea,
    ...serviceArea,
    id: pincode,
    pincode,
    city: serviceArea.city || existingArea?.city || 'India',
    serviceable: isServiceable,
    createdAt: existingArea?.createdAt || timestamp,
    updatedAt: timestamp,
  });

  const nextServiceAreas = existingArea
    ? serviceAreas.map((area) => (area.id === nextArea.id || area.pincode === pincode ? nextArea : area))
    : [...serviceAreas, nextArea];

  writeServiceAreas(nextServiceAreas);
  return nextArea;
}

export function deleteStoredServiceArea(idOrPincode) {
  const serviceAreas = readServiceAreas();
  const key = String(idOrPincode).trim();
  const nextAreas = serviceAreas.filter((a) => a.id !== key && a.pincode !== key);
  writeServiceAreas(nextAreas);
  return { ok: true };
}
