import { createRepository } from '../dataAccess/repository.js';
import { getUserRole } from '../auth.js';

export async function listVendors({ req }) {
  const role = getUserRole(req.headers);
  if (role !== 'admin') {
    return {
      statusCode: 403,
      body: { error: 'Admin access required.' },
    };
  }

  const repository = createRepository('vendors');
  return {
    statusCode: 200,
    body: { vendors: await repository.list() },
  };
}

export async function getVendor({ req, params }) {
  const role = getUserRole(req.headers);
  if (role !== 'admin') {
    return {
      statusCode: 403,
      body: { error: 'Admin access required.' },
    };
  }

  const repository = createRepository('vendors');
  const vendor = await repository.getById(params[0]);
  if (!vendor) {
    return {
      statusCode: 404,
      body: { error: 'Vendor not found.' },
    };
  }

  return {
    statusCode: 200,
    body: { vendor },
  };
}

export async function createVendor({ req }) {
  const role = getUserRole(req.headers);
  if (role !== 'admin') {
    return {
      statusCode: 403,
      body: { error: 'Admin access required.' },
    };
  }

  const repository = createRepository('vendors');
  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const vendor = {
    id: payload.vendorId || payload.id || `vendor-${Date.now()}`,
    name: payload.name || 'New Vendor',
    contactName: payload.contactName || '',
    email: payload.email || '',
    phone: payload.phone || '',
    specialties: payload.specialties || [],
    servicePincodes: payload.servicePincodes || [],
    status: payload.status || 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await repository.create(vendor);
  return {
    statusCode: 201,
    body: { vendor },
  };
}

export async function updateVendor({ req, params }) {
  const role = getUserRole(req.headers);
  if (role !== 'admin') {
    return {
      statusCode: 403,
      body: { error: 'Admin access required.' },
    };
  }

  const repository = createRepository('vendors');
  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const updated = await repository.update(params[0], {
    ...payload,
    updatedAt: new Date().toISOString(),
  });

  if (!updated) {
    return {
      statusCode: 404,
      body: { error: 'Vendor not found.' },
    };
  }

  return {
    statusCode: 200,
    body: { vendor: updated },
  };
}
