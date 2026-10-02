import { getApiBaseUrl } from './apiConfig.js';
import { getAdminAuthHeaders } from './adminAuthService.js';

const API_BASE_URL = getApiBaseUrl();

export async function fetchServiceAreasApi() {
  const response = await fetch(`${API_BASE_URL}/service-areas`, {
    headers: getAdminAuthHeaders(),
    credentials: 'include',
  });
  if (response.ok) {
    const result = await response.json();
    if (Array.isArray(result.serviceAreas)) {
      return result.serviceAreas;
    }
  }
  const errData = await response.json().catch(() => ({}));
  throw new Error(errData.error || `Failed to fetch service areas from server (HTTP ${response.status}).`);
}

const availabilityCache = new Map();

export function clearAvailabilityCache() {
  availabilityCache.clear();
}

export async function checkAvailabilityOnServer(pincode) {
  const cleanPincode = String(pincode || '').trim();
  if (!cleanPincode || !/^[1-9][0-9]{5}$/.test(cleanPincode)) {
    return {
      available: false,
      error: 'Please enter a valid 6-digit Indian pincode.',
    };
  }

  if (availabilityCache.has(cleanPincode)) {
    return availabilityCache.get(cleanPincode);
  }

  const response = await fetch(`${API_BASE_URL}/availability/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pincode: cleanPincode }),
  });
  if (response.ok) {
    const result = await response.json();
    availabilityCache.set(cleanPincode, result);
    return result;
  }
  const errData = await response.json().catch(() => ({}));
  throw new Error(errData.error || `Availability check failed (HTTP ${response.status}).`);
}

export async function saveServiceAreaOnServer(serviceArea) {
  const response = await fetch(`${API_BASE_URL}/service-areas`, {
    method: 'POST',
    headers: getAdminAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(serviceArea),
    credentials: 'include',
  });
  if (response.ok) {
    clearAvailabilityCache();
    const result = await response.json();
    return result.serviceArea || result;
  }
  const errData = await response.json().catch(() => ({}));
  throw new Error(errData.error || `Failed to save service area (HTTP ${response.status}).`);
}

export async function deleteServiceAreaApi(pincode) {
  const response = await fetch(`${API_BASE_URL}/service-areas/${pincode}`, {
    method: 'DELETE',
    headers: getAdminAuthHeaders(),
    credentials: 'include',
  });
  if (response.ok) {
    clearAvailabilityCache();
    return await response.json();
  }
  const errData = await response.json().catch(() => ({}));
  throw new Error(errData.error || `Failed to delete service area (HTTP ${response.status}).`);
}
