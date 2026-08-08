import { products } from '../data/products';
import { getStoredCategories } from './mockCategories';

const DECORATIONS_STORAGE_KEY = 'decorfesto-admin-decorations';

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeImageAssets(decoration) {
  const legacyUrls = asList(decoration.galleryUrls).length
    ? decoration.galleryUrls
    : (asList(decoration.images).length ? decoration.images : [decoration.imageUrl || decoration.image || products[0].image]);
  const candidates = asList(decoration.imageAssets).length ? decoration.imageAssets : legacyUrls;
  const assets = candidates
    .map((asset, index) => {
      const url = typeof asset === 'string' ? asset : asset.url;
      if (!url) return null;
      return {
        id: typeof asset === 'string' ? `image-${index}` : (asset.id || `image-${index}`),
        url,
        name: typeof asset === 'string' ? '' : (asset.name || ''),
        mimeType: typeof asset === 'string' ? '' : (asset.mimeType || ''),
        source: typeof asset === 'string' ? 'hosted-url' : (asset.source || 'hosted-url'),
        isPrimary: typeof asset === 'string' ? asset === decoration.imageUrl : asset.isPrimary === true,
      };
    })
    .filter(Boolean);
  const primaryIndex = assets.findIndex((asset) => asset.isPrimary);
  const primaryAsset = assets[primaryIndex >= 0 ? primaryIndex : 0];

  return assets.map((asset, index) => ({ ...asset, isPrimary: asset.id === primaryAsset?.id || (primaryIndex < 0 && index === 0) }));
}

function categoryFor(decoration) {
  const name = String(decoration.name || '').toLowerCase();
  if (name.includes('kids')) return 'Kids';
  if (name.includes('romantic')) return 'Romantic';
  if (name.includes('corporate')) return 'Custom';
  const requestedCategory = decoration.category || decoration.occasion || 'Custom';
  const categoryNames = getStoredCategories().map((category) => category.name);
  return categoryNames.includes(requestedCategory) ? requestedCategory : (categoryNames[0] || requestedCategory);
}

function normalizeDecoration(decoration, index = 0) {
  const packageData = { ...decoration };
  delete packageData.serviceLocation;
  delete packageData.location;
  const imageAssets = normalizeImageAssets(packageData);
  const primaryImage = imageAssets.find((asset) => asset.isPrimary) || imageAssets[0];
  const imageUrl = primaryImage?.url || products[0].image;
  const galleryUrls = imageAssets.map((asset) => asset.url);
  const basePrice = Number(packageData.basePrice ?? packageData.price ?? 0);
  const customizationOptions = asList(packageData.customizationOptions);
  const hasStructuredGroups = customizationOptions.length > 0 && customizationOptions.every(
    (entry) => entry && typeof entry === 'object' && Array.isArray(entry.options),
  );

  return {
    ...packageData,
    decorationId: packageData.decorationId || `decoration-${packageData.id || Date.now()}`,
    id: packageData.id || packageData.decorationId || `decoration-${Date.now()}`,
    name: packageData.name || 'New Decoration',
    category: categoryFor(packageData),
    shortDescription: packageData.shortDescription || packageData.description || '',
    description: packageData.description || packageData.shortDescription || '',
    basePrice,
    originalPrice: Number(packageData.originalPrice ?? basePrice),
    imageUrl,
    imageAssets,
    galleryUrls,
    rating: Number(packageData.rating ?? 0),
    reviewCount: Number(packageData.reviewCount ?? 0),
    highlights: asList(packageData.highlights),
    includedItems: asList(packageData.includedItems),
    excludedItems: asList(packageData.excludedItems),
    customizationOptions: hasStructuredGroups ? customizationOptions : [],
    addOns: asList(packageData.addOns),
    duration: packageData.duration || '',
    setupRequirements: packageData.setupRequirements || '',
    featured: packageData.featured === true,
    active: packageData.active !== false,
    displayOrder: Number(packageData.displayOrder ?? index + 1),
    createdAt: packageData.createdAt || new Date().toISOString(),
    updatedAt: packageData.updatedAt || new Date().toISOString(),
    occasion: categoryFor(packageData),
    price: basePrice,
    image: imageUrl,
    images: galleryUrls,
  };
}

function defaultDecorations() {
  return products.map((product, index) => normalizeDecoration({ ...product, active: true }, index));
}

function readDecorations() {
  if (typeof window === 'undefined') return defaultDecorations();

  try {
    const stored = window.localStorage.getItem(DECORATIONS_STORAGE_KEY);
    if (!stored) return defaultDecorations();
    const decorations = JSON.parse(stored);
    return Array.isArray(decorations) ? decorations.map(normalizeDecoration) : defaultDecorations();
  } catch (error) {
    console.warn('Unable to read saved decorations.', error);
    return defaultDecorations();
  }
}

function writeDecorations(decorations) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(DECORATIONS_STORAGE_KEY, JSON.stringify(decorations));
  }
}

export function getStoredDecorations() {
  return readDecorations().sort((first, second) => first.displayOrder - second.displayOrder);
}

export function getActiveStoredDecorations() {
  return getStoredDecorations().filter((decoration) => decoration.active);
}

export function saveStoredDecoration(decoration) {
  const decorations = readDecorations();
  const existingDecoration = decorations.find((entry) => entry.id === decoration.id || entry.decorationId === decoration.decorationId);
  const nextDecoration = normalizeDecoration({
    ...existingDecoration,
    ...decoration,
    decorationId: decoration.decorationId || existingDecoration?.decorationId || `decoration-${Date.now()}`,
    id: decoration.id || existingDecoration?.id || decoration.decorationId || `decoration-${Date.now()}`,
    createdAt: existingDecoration?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const nextDecorations = existingDecoration
    ? decorations.map((entry) => (entry.id === existingDecoration.id ? nextDecoration : entry))
    : [...decorations, nextDecoration];

  writeDecorations(nextDecorations);
  return nextDecoration;
}
