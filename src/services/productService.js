import { defaultDecorations } from './mockDecorations';

const DECORATIONS_STORAGE_KEY = 'decorfesto-decorations-v2';

function cleanProduct(prod) {
  if (!prod) return null;
  const base = Number(prod.basePrice ?? prod.price) || 0;
  const orig = Number(prod.originalPrice) || base;
  return {
    id: String(prod.id).trim(),
    name: String(prod.name || prod.productName || 'Decoration Package').trim(),
    occasion: String(prod.occasion || 'Celebration').trim(),
    category: String(prod.category || 'Theme').trim(),
    description: String(prod.description || '').trim(),
    basePrice: base,
    price: base,
    originalPrice: orig,
    discount: prod.discount || (orig > base ? `${Math.round(((orig - base) / orig) * 100)}% OFF` : ''),
    images: Array.isArray(prod.images) ? prod.images : [prod.image].filter(Boolean),
    image: prod.image || (Array.isArray(prod.images) ? prod.images[0] : ''),
    rating: Number(prod.rating) || 4.9,
    reviewCount: Number(prod.reviewCount || prod.reviewsCount) || 120,
    status: prod.active !== false ? 'ACTIVE' : 'INACTIVE',
    active: prod.active !== false,
    customizationOptions: Array.isArray(prod.customizationOptions) ? prod.customizationOptions : [],
    addOns: Array.isArray(prod.addOns) ? prod.addOns : [],
    createdAt: prod.createdAt || new Date().toISOString(),
    updatedAt: prod.updatedAt || new Date().toISOString(),
  };
}

export function readProducts() {
  if (typeof window === 'undefined') {
    return defaultDecorations.map(cleanProduct);
  }

  try {
    const raw = window.localStorage.getItem(DECORATIONS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(DECORATIONS_STORAGE_KEY, JSON.stringify(defaultDecorations));
      return defaultDecorations.map(cleanProduct);
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed.map(cleanProduct)
      : defaultDecorations.map(cleanProduct);
  } catch (err) {
    console.warn('Unable to read products from storage.', err);
    return defaultDecorations.map(cleanProduct);
  }
}

export function writeProducts(products) {
  if (typeof window !== 'undefined' && Array.isArray(products)) {
    window.localStorage.setItem(
      DECORATIONS_STORAGE_KEY,
      JSON.stringify(products.map(cleanProduct)),
    );
  }
}

export function getProducts() {
  return readProducts();
}

export function getActiveProducts() {
  return getProducts().filter((p) => p.status === 'ACTIVE');
}

export function getProductById(id) {
  const pid = String(id || '').trim();
  return getProducts().find((p) => p.id === pid) || null;
}

export function saveProduct(prod) {
  const products = readProducts();
  const existing = products.find((p) => p.id === String(prod.id));
  const timestamp = new Date().toISOString();

  const nextProd = cleanProduct({
    ...existing,
    ...prod,
    id: prod.id || `prod_${Date.now()}`,
    updatedAt: timestamp,
    createdAt: existing?.createdAt || timestamp,
  });

  const nextProducts = existing
    ? products.map((p) => (p.id === nextProd.id ? nextProd : p))
    : [...products, nextProd];

  writeProducts(nextProducts);
  return nextProd;
}

export function deleteProduct(id) {
  const products = readProducts();
  const nextProducts = products.filter((p) => p.id !== String(id));
  writeProducts(nextProducts);
  return { ok: true };
}
