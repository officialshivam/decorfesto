import { createRepository } from '../dataAccess/repository.js';
import { requireRole } from '../auth.js';

function sanitizeDecorationRecord(item) {
  if (!item || typeof item !== 'object') return null;

  const name = String(item.name || 'Decoration Package').trim();
  const id = String(item.id || item.decorationId || `decoration-${Date.now()}`).trim();
  const category = String(item.category || item.occasion || 'Celebration').trim();
  const occasion = String(item.occasion || item.category || category).trim();
  const basePrice = Number(item.basePrice ?? item.price ?? 0);
  const originalPrice = Number(item.originalPrice ?? basePrice);
  const rating = Number(item.rating ?? 4.8);
  const reviewCount = Number(item.reviewCount ?? 12);

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
    shortDescription: String(item.shortDescription || item.description || '').trim(),
    description: String(item.description || item.shortDescription || '').trim(),
    basePrice,
    price: basePrice,
    originalPrice,
    rating,
    reviewCount,
    image,
    imageUrl: image,
    images: gallery,
    galleryUrls: gallery,
    imageAssets: Array.isArray(item.imageAssets) ? item.imageAssets : [],
    highlights: Array.isArray(item.highlights) ? item.highlights : (typeof item.highlights === 'string' ? item.highlights.split(',').map((s) => s.trim()).filter(Boolean) : []),
    includedItems: Array.isArray(item.includedItems) ? item.includedItems : (typeof item.includedItems === 'string' ? item.includedItems.split(',').map((s) => s.trim()).filter(Boolean) : []),
    excludedItems: Array.isArray(item.excludedItems) ? item.excludedItems : (typeof item.excludedItems === 'string' ? item.excludedItems.split(',').map((s) => s.trim()).filter(Boolean) : []),
    customizationOptions: Array.isArray(item.customizationOptions) ? item.customizationOptions : [],
    addOns: Array.isArray(item.addOns) ? item.addOns : (typeof item.addOns === 'string' ? item.addOns.split(',').map((s) => s.trim()).filter(Boolean) : []),
    duration: String(item.duration || '4 hours').trim(),
    setupRequirements: String(item.setupRequirements || '').trim(),
    featured: item.featured === true || item.featured === 1 || item.featured === 'true',
    active: item.active !== false && item.status !== 'INACTIVE',
    displayOrder: Number(item.displayOrder ?? item.display_order ?? 0),
    createdAt: item.createdAt || item.created_at || new Date().toISOString(),
    updatedAt: item.updatedAt || item.updated_at || new Date().toISOString(),
  };
}

export async function listDecorations() {
  const repository = createRepository('decorations');
  const all = await repository.list();
  const decorations = (all || []).map(sanitizeDecorationRecord).filter(Boolean);

  return {
    statusCode: 200,
    body: { decorations },
  };
}

export async function getDecoration({ params }) {
  const repository = createRepository('decorations');
  const decoration = await repository.getById(params[0]);
  if (!decoration) {
    return {
      statusCode: 404,
      body: { error: 'Decoration not found.' },
    };
  }

  return {
    statusCode: 200,
    body: { decoration: sanitizeDecorationRecord(decoration) },
  };
}

export async function createAdminDecoration({ req }) {
  const auth = requireRole('ADMIN', req);
  if (!auth.allowed) {
    return { statusCode: 403, body: { error: auth.message } };
  }

  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const name = String(payload.name || '').trim();

  if (!name) {
    return { statusCode: 400, body: { error: 'Decoration name is required.' } };
  }

  const newRecord = sanitizeDecorationRecord({
    ...payload,
    id: payload.id || payload.decorationId || `decoration-${Date.now()}`,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const repository = createRepository('decorations');
  const created = await repository.create(newRecord);

  return {
    statusCode: 201,
    body: { success: true, decoration: sanitizeDecorationRecord(created || newRecord) },
  };
}

export async function updateAdminDecoration({ req, params }) {
  const auth = requireRole('ADMIN', req);
  if (!auth.allowed) {
    return { statusCode: 403, body: { error: auth.message } };
  }

  const id = params[0];
  if (!id) {
    return { statusCode: 400, body: { error: 'Decoration ID is required.' } };
  }

  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const repository = createRepository('decorations');
  const existing = await repository.getById(id);

  if (!existing) {
    return { statusCode: 404, body: { error: 'Decoration not found.' } };
  }

  const nextRecord = sanitizeDecorationRecord({
    ...existing,
    ...payload,
    id,
    updatedAt: new Date().toISOString(),
  });

  const updated = await repository.update(id, nextRecord);

  return {
    statusCode: 200,
    body: { success: true, decoration: sanitizeDecorationRecord(updated || nextRecord) },
  };
}

export async function toggleAdminDecorationStatus({ req, params }) {
  const auth = requireRole('ADMIN', req);
  if (!auth.allowed) {
    return { statusCode: 403, body: { error: auth.message } };
  }

  const id = params[0];
  const repository = createRepository('decorations');
  const existing = await repository.getById(id);

  if (!existing) {
    return { statusCode: 404, body: { error: 'Decoration not found.' } };
  }

  const nextActive = payloadStatus(req, existing);
  const updated = await repository.update(id, { active: nextActive, updatedAt: new Date().toISOString() });

  return {
    statusCode: 200,
    body: { success: true, decoration: sanitizeDecorationRecord(updated || { ...existing, active: nextActive }) },
  };
}

function payloadStatus(req, existing) {
  const body = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  if (body.active !== undefined) return Boolean(body.active);
  return !existing.active;
}

export async function deleteAdminDecoration({ req, params }) {
  const auth = requireRole('ADMIN', req);
  if (!auth.allowed) {
    return { statusCode: 403, body: { error: auth.message } };
  }

  const id = params[0];
  const repository = createRepository('decorations');
  const existing = await repository.getById(id);

  if (!existing) {
    return { statusCode: 404, body: { error: 'Decoration not found.' } };
  }

  await repository.delete(id);
  return {
    statusCode: 200,
    body: { success: true, message: 'Decoration deleted successfully.' },
  };
}
