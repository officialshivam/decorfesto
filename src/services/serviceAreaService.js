const SERVICE_AREAS_STORAGE_KEY = 'decorfesto-admin-service-areas';

export const defaultServiceAreas = [
  {
    id: '110001',
    pincode: '110001',
    city: 'Connaught Place, New Delhi',
    state: 'Delhi',
    serviceable: true,
    createdAt: '2026-08-10T12:00:00.000Z',
    updatedAt: '2026-08-10T21:18:00.000Z',
  },
  {
    id: '400001',
    pincode: '400001',
    city: 'Fort, Mumbai',
    state: 'Maharashtra',
    serviceable: true,
    createdAt: '2026-08-10T12:00:00.000Z',
    updatedAt: '2026-08-10T21:20:00.000Z',
  },
  {
    id: '110032',
    pincode: '110032',
    city: 'Shahdara Bihari Colony, Delhi',
    state: 'Delhi',
    serviceable: true,
    createdAt: '2026-08-10T12:00:00.000Z',
    updatedAt: '2026-08-10T21:21:00.000Z',
  },
];

function cleanServiceArea(area) {
  if (!area) return null;
  return {
    id: String(area.id || area.pincode).trim(),
    pincode: String(area.pincode || '').trim(),
    city: String(area.city || 'Delhi NCR').trim(),
    state: String(area.state || 'Delhi').trim(),
    serviceable: area.serviceable === true,
    deliveryCharge: Number(area.deliveryCharge || 0),
    createdAt: area.createdAt || new Date().toISOString(),
    updatedAt: area.updatedAt || new Date().toISOString(),
  };
}

export function readServiceAreas() {
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
    console.warn('Unable to read service areas from storage.', error);
    return defaultServiceAreas.map(cleanServiceArea);
  }
}

export function writeServiceAreas(serviceAreas) {
  if (typeof window !== 'undefined' && Array.isArray(serviceAreas)) {
    window.localStorage.setItem(
      SERVICE_AREAS_STORAGE_KEY,
      JSON.stringify(serviceAreas.map(cleanServiceArea)),
    );
  }
}

export function findServiceAreaByPincode(pincode) {
  const pc = String(pincode || '').trim();
  if (!pc) return null;
  const areas = readServiceAreas();
  return areas.find((area) => area.pincode === pc || area.id === pc) || null;
}

export function saveServiceArea(serviceArea) {
  const serviceAreas = readServiceAreas();
  const pincode = String(serviceArea.pincode || '').trim();
  const existingArea = serviceAreas.find(
    (area) => area.pincode === pincode || area.id === serviceArea.id,
  );

  const timestamp = new Date().toISOString();
  const isServiceable = serviceArea.serviceable === true;

  const nextArea = cleanServiceArea({
    ...existingArea,
    ...serviceArea,
    id: pincode,
    pincode,
    city: serviceArea.city || existingArea?.city || 'Delhi NCR',
    state: serviceArea.state || existingArea?.state || 'Delhi',
    serviceable: isServiceable,
    createdAt: existingArea?.createdAt || timestamp,
    updatedAt: timestamp,
  });

  const nextServiceAreas = existingArea
    ? serviceAreas.map((area) =>
        area.id === nextArea.id || area.pincode === pincode ? nextArea : area,
      )
    : [...serviceAreas, nextArea];

  writeServiceAreas(nextServiceAreas);
  return nextArea;
}

export function deleteServiceArea(idOrPincode) {
  const serviceAreas = readServiceAreas();
  const key = String(idOrPincode || '').trim();
  const nextAreas = serviceAreas.filter((a) => a.id !== key && a.pincode !== key);
  writeServiceAreas(nextAreas);
  return { ok: true };
}

export function checkPincodeServiceability(pincode) {
  const pc = String(pincode || '').trim();
  if (!/^[1-9][0-9]{5}$/.test(pc)) {
    return {
      isServiceable: false,
      pincode: pc,
      message: '✕ Please enter a valid 6-digit Indian pincode.',
    };
  }

  const existingArea = findServiceAreaByPincode(pc);
  if (existingArea) {
    const ok = existingArea.serviceable === true;
    return {
      isServiceable: ok,
      pincode: pc,
      city: existingArea.city || 'Delhi NCR',
      state: existingArea.state || 'Delhi',
      message: ok
        ? '✓ Decoration service available at your location.'
        : '✕ Sorry, decoration service is currently unavailable at this pincode.',
    };
  }

  return {
    isServiceable: false,
    pincode: pc,
    city: 'Delhi NCR',
    state: 'Delhi',
    message: '✕ Decoration service is currently unavailable at this pincode.',
  };
}

import { getApiBaseUrl } from './apiConfig.js';

const API_BASE_URL = getApiBaseUrl();

export async function checkPincodeServiceabilityApi(pincode) {
  try {
    const response = await fetch(`${API_BASE_URL}/availability/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pincode }),
    });
    if (response.ok) {
      const result = await response.json();
      return {
        isServiceable: result.available === true,
        pincode,
        city: result.city || 'Delhi NCR',
        state: 'Delhi',
        message: result.available === true
          ? '✓ Decoration service available at your location.'
          : '✕ Sorry, decoration service is currently unavailable at this pincode.',
      };
    }
  } catch (error) {
    console.debug('Backend API unavailable, using local repository fallback for serviceability.', error);
  }
  return checkPincodeServiceability(pincode);
}
