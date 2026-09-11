import { getApiBaseUrl } from './apiConfig.js';

function resolveApiBases() {
  const base = getApiBaseUrl();
  return base ? [base, ''] : [''];
}

export async function fetchSiteBrandingApi() {
  const bases = resolveApiBases();
  let lastError;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}/site-settings/branding`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} fetching site branding`);
        continue;
      }

      const data = await response.json();
      return {
        logo: data.logo || '/uploads/branding/decorfesto-logo.png',
      };
    } catch (err) {
      lastError = err;
    }
  }

  console.warn('fetchSiteBrandingApi fallback:', lastError?.message);
  return { logo: '/uploads/branding/decorfesto-logo.png' };
}
