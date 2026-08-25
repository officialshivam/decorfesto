import { getApiBaseUrl } from './apiConfig.js';

function resolveApiBases() {
  const base = getApiBaseUrl();
  return base ? [base, ''] : [''];
}

export function sanitizeDecoration(item) {
  if (!item || typeof item !== 'object') return null;
  const id = String(item.id || item.decorationId || '').trim();
  const name = String(item.name || item.productName || 'Decoration Package').trim();
  const category = String(item.category || item.occasion || 'Celebration').trim();
  const occasion = String(item.occasion || item.category || 'Celebration').trim();
  const basePrice = Number(item.basePrice ?? item.price ?? 0);
  const originalPrice = Number(item.originalPrice ?? basePrice);
  const rating = Number(item.rating ?? 4.9);
  const reviewCount = Number(item.reviewCount ?? 120);

  const gallery = Array.isArray(item.images) && item.images.length > 0
    ? item.images
    : (Array.isArray(item.galleryUrls) && item.galleryUrls.length > 0
      ? item.galleryUrls
      : [item.image || item.imageUrl].filter(Boolean));

  const image = item.image || item.imageUrl || gallery[0] || '';

  return {
    ...item,
    id,
    decorationId: id,
    name,
    category,
    occasion,
    description: String(item.description || item.shortDescription || '').trim(),
    shortDescription: String(item.shortDescription || item.description || '').trim(),
    basePrice,
    price: basePrice,
    originalPrice,
    rating,
    reviewCount,
    image,
    imageUrl: image,
    images: gallery,
    galleryUrls: gallery,
    active: item.active !== false && item.status !== 'INACTIVE',
    status: item.active !== false && item.status !== 'INACTIVE' ? 'ACTIVE' : 'INACTIVE',
    customizationOptions: Array.isArray(item.customizationOptions) ? item.customizationOptions : [],
    addOns: Array.isArray(item.addOns) ? item.addOns : [],
  };
}

export async function fetchDecorationsApi() {
  const bases = resolveApiBases();
  let lastError;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}/decorations`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} fetching decorations`);
        continue;
      }

      const data = await response.json();
      const rawList = Array.isArray(data.decorations) ? data.decorations : (Array.isArray(data) ? data : []);
      return rawList.map(sanitizeDecoration).filter(Boolean);
    } catch (err) {
      lastError = err;
    }
  }

  console.error('fetchDecorationsApi error:', lastError);
  throw lastError || new Error('Failed to fetch decorations from server.');
}

export async function fetchDecorationByIdApi(id) {
  if (!id) return null;
  const targetId = String(id).trim();
  const bases = resolveApiBases();
  let lastError;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}/decorations/${targetId}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} fetching decoration ${targetId}`);
        continue;
      }

      const data = await response.json();
      if (data.decoration) {
        return sanitizeDecoration(data.decoration);
      }
    } catch (err) {
      lastError = err;
    }
  }

  // Fallback check against full list if single lookup returns 404
  try {
    const list = await fetchDecorationsApi();
    return list.find((item) => String(item.id) === targetId || String(item.decorationId) === targetId) || null;
  } catch {
    console.error('fetchDecorationByIdApi error:', lastError);
    return null;
  }
}
