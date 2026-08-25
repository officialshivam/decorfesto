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

export async function checkAvailabilityOnServer(pincode) {
  const response = await fetch(`${API_BASE_URL}/availability/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pincode }),
  });
  if (response.ok) {
    return await response.json();
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
    return await response.json();
  }
  const errData = await response.json().catch(() => ({}));
  throw new Error(errData.error || `Failed to delete service area (HTTP ${response.status}).`);
}
