import { createRepository } from '../dataAccess/repository.js';
import { requireRole } from '../auth.js';

function sanitizeCategory(item) {
  if (!item || typeof item !== 'object') return null;
  const name = String(item.name || '').trim();
  const id = item.id || `category-${name.toLowerCase().replace(/\s+/g, '-') || Date.now()}`;
  return {
    id,
    name,
    displayOrder: Number(item.displayOrder ?? item.display_order ?? 0),
    active: item.active !== false && item.status !== 'INACTIVE',
    createdAt: item.createdAt || item.created_at || new Date().toISOString(),
    updatedAt: item.updatedAt || item.updated_at || new Date().toISOString(),
  };
}

export async function listCategories() {
  const repository = createRepository('categories');
  const all = await repository.list();
  const categories = (all || []).map(sanitizeCategory).filter(Boolean);
  categories.sort((a, b) => a.displayOrder - b.displayOrder);

  return {
    statusCode: 200,
    body: { categories },
  };
}

export async function createAdminCategory({ req }) {
  const auth = requireRole('ADMIN', req);
  if (!auth.allowed) {
    return { statusCode: 403, body: { error: auth.message } };
  }

  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const name = String(payload.name || '').trim();

  if (!name) {
    return { statusCode: 400, body: { error: 'Category name is required.' } };
  }

  const repository = createRepository('categories');
  const existingList = await repository.list();
  const duplicate = (existingList || []).find((c) => String(c.name || '').trim().toLowerCase() === name.toLowerCase());

  if (duplicate) {
    return { statusCode: 400, body: { error: `Category "${name}" already exists.` } };
  }

  const newRecord = sanitizeCategory({
    id: payload.id || `category-${name.toLowerCase().replace(/\s+/g, '-') || Date.now()}`,
    name,
    displayOrder: Number(payload.displayOrder ?? (existingList.length + 1)),
    active: payload.active !== false,
  });

  const created = await repository.create(newRecord);
  return {
    statusCode: 201,
    body: { success: true, category: sanitizeCategory(created || newRecord) },
  };
}

export async function updateAdminCategory({ req, params }) {
  const auth = requireRole('ADMIN', req);
  if (!auth.allowed) {
    return { statusCode: 403, body: { error: auth.message } };
  }

  const id = params[0];
  if (!id) {
    return { statusCode: 400, body: { error: 'Category ID is required.' } };
  }

  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const repository = createRepository('categories');
  const existing = await repository.getById(id);

  if (!existing) {
    return { statusCode: 404, body: { error: 'Category not found.' } };
  }

  const name = payload.name !== undefined ? String(payload.name).trim() : existing.name;
  const nextRecord = sanitizeCategory({
    ...existing,
    ...payload,
    id,
    name: name || existing.name,
    displayOrder: payload.displayOrder !== undefined ? Number(payload.displayOrder) : existing.displayOrder,
    active: payload.active !== undefined ? Boolean(payload.active) : existing.active,
    updatedAt: new Date().toISOString(),
  });

  const updated = await repository.update(id, nextRecord);
  return {
    statusCode: 200,
    body: { success: true, category: sanitizeCategory(updated || nextRecord) },
  };
}

export async function toggleAdminCategoryStatus({ req, params }) {
  const auth = requireRole('ADMIN', req);
  if (!auth.allowed) {
    return { statusCode: 403, body: { error: auth.message } };
  }

  const id = params[0];
  const repository = createRepository('categories');
  const existing = await repository.getById(id);

  if (!existing) {
    return { statusCode: 404, body: { error: 'Category not found.' } };
  }

  const nextActive = !existing.active;
  const updated = await repository.update(id, { active: nextActive, updatedAt: new Date().toISOString() });

  return {
    statusCode: 200,
    body: { success: true, category: sanitizeCategory(updated || { ...existing, active: nextActive }) },
  };
}

export async function deleteAdminCategory({ req, params }) {
  const auth = requireRole('ADMIN', req);
  if (!auth.allowed) {
    return { statusCode: 403, body: { error: auth.message } };
  }

  const id = params[0];
  const repository = createRepository('categories');
  const existing = await repository.getById(id);

  if (!existing) {
    return { statusCode: 404, body: { error: 'Category not found.' } };
  }

  // Check if used by decorations
  const decorRepo = createRepository('decorations');
  const allDecorations = await decorRepo.list();
  const inUse = (allDecorations || []).some(
    (d) => (d.category && String(d.category).trim().toLowerCase() === String(existing.name).trim().toLowerCase())
      || (d.occasion && String(d.occasion).trim().toLowerCase() === String(existing.name).trim().toLowerCase())
  );

  if (inUse) {
    return {
      statusCode: 400,
      body: { error: 'Categories in use by decorations cannot be deleted. Deactivate the category instead.' },
    };
  }

  await repository.delete(id);
  return {
    statusCode: 200,
    body: { success: true, message: 'Category deleted successfully.' },
  };
}
