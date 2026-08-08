const SERVICE_AREAS_STORAGE_KEY = 'decorfesto-admin-service-areas';

const initialServiceAreas = [
  { id: '110001', pincode: '110001', city: 'Delhi', serviceable: true, leadTimeHours: 24, active: true },
  { id: '400001', pincode: '400001', city: 'Mumbai', serviceable: true, leadTimeHours: 36, active: true },
];

function readServiceAreas() {
  if (typeof window === 'undefined') {
    return initialServiceAreas;
  }

  try {
    const stored = window.localStorage.getItem(SERVICE_AREAS_STORAGE_KEY);
    if (!stored) {
      return initialServiceAreas;
    }

    const serviceAreas = JSON.parse(stored);
    return Array.isArray(serviceAreas) ? serviceAreas : initialServiceAreas;
  } catch (error) {
    console.warn('Unable to read saved service areas.', error);
    return initialServiceAreas;
  }
}

function writeServiceAreas(serviceAreas) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(SERVICE_AREAS_STORAGE_KEY, JSON.stringify(serviceAreas));
  }
}

export function getStoredServiceAreas() {
  return readServiceAreas();
}

export function saveStoredServiceArea(serviceArea) {
  const serviceAreas = readServiceAreas();
  const existingArea = serviceAreas.find((area) => area.id === serviceArea.id);
  const nextArea = {
    ...existingArea,
    ...serviceArea,
    id: serviceArea.id || serviceArea.pincode,
    leadTimeHours: Number(serviceArea.leadTimeHours || 0),
    createdAt: existingArea?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const nextServiceAreas = existingArea
    ? serviceAreas.map((area) => (area.id === nextArea.id ? nextArea : area))
    : [...serviceAreas, nextArea];

  writeServiceAreas(nextServiceAreas);
  return nextArea;
}
