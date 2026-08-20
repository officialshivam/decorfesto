import { createRepository } from '../dataAccess/repository.js';
import { requireRole } from '../auth.js';

export async function listEnabledCharges() {
  const repository = createRepository('charges');
  const allCharges = await repository.list();
  const enabledCharges = (allCharges || [])
    .filter((c) => c.enabled !== false && c.is_enabled !== 0)
    .map((c) => ({
      id: c.id || c.charge_id,
      name: c.name,
      amount: Number(c.amount || 0),
      description: c.description || '',
      type: c.type || 'FIXED',
      enabled: true,
    }));

  return {
    statusCode: 200,
    body: { charges: enabledCharges },
  };
}

export async function listAdminCharges({ req }) {
  const auth = requireRole('ADMIN', req);
  if (!auth.allowed) {
    return { statusCode: 403, body: { error: auth.message } };
  }

  const repository = createRepository('charges');
  const charges = await repository.list();
  return {
    statusCode: 200,
    body: { charges },
  };
}

export async function createAdminCharge({ req }) {
  const auth = requireRole('ADMIN', req);
  if (!auth.allowed) {
    return { statusCode: 403, body: { error: auth.message } };
  }

  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const repository = createRepository('charges');

  const newCharge = {
    id: payload.id || `charge_${Date.now().toString().slice(-6)}`,
    name: String(payload.name || 'Service Charge').trim(),
    amount: Number(payload.amount || 0),
    description: String(payload.description || '').trim(),
    type: payload.type || 'FIXED',
    enabled: payload.enabled !== false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await repository.create(newCharge);
  return {
    statusCode: 201,
    body: { charge: newCharge },
  };
}

export async function updateAdminCharge({ req, params }) {
  const auth = requireRole('ADMIN', req);
  if (!auth.allowed) {
    return { statusCode: 403, body: { error: auth.message } };
  }

  const chargeId = params[0];
  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  const repository = createRepository('charges');

  const updatedCharge = await repository.update(chargeId, {
    ...payload,
    updatedAt: new Date().toISOString(),
  });

  if (!updatedCharge) {
    return { statusCode: 404, body: { error: 'Charge not found.' } };
  }

  return {
    statusCode: 200,
    body: { charge: updatedCharge },
  };
}

export async function deleteAdminCharge({ req, params }) {
  const auth = requireRole('ADMIN', req);
  if (!auth.allowed) {
    return { statusCode: 403, body: { error: auth.message } };
  }

  const chargeId = params[0];
  const repository = createRepository('charges');
  await repository.delete(chargeId);

  return {
    statusCode: 200,
    body: { success: true },
  };
}
