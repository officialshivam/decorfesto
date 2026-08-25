import { createRepository } from '../dataAccess/repository.js';
import { getUserRole } from '../auth.js';

export async function createServiceArea({ req }) {
  const role = getUserRole(req.headers);
  if (role !== 'admin') {
    return {
      statusCode: 403,
      body: { error: 'Admin access required.' },
    };
  }

  const repository = createRepository('service-areas');
  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const pincode = String(payload.pincode || '').trim();

  const existingArea = await repository.getById(pincode);
  const timestamp = new Date().toISOString();
  const isServiceable = payload.serviceable === true;

  const serviceArea = {
    id: pincode || `service-area-${Date.now()}`,
    pincode,
    city: payload.city || existingArea?.city || '',
    serviceable: isServiceable,
    createdAt: existingArea?.createdAt || timestamp,
    updatedAt: timestamp,
  };

  if (existingArea) {
    await repository.update(existingArea.id, serviceArea);
  } else {
    await repository.create(serviceArea);
  }

  return {
    statusCode: 201,
    body: { serviceArea },
  };
}

export async function getServiceArea({ params }) {
  const repository = createRepository('service-areas');
  const serviceArea = await repository.getById(params[0]);
  if (!serviceArea) {
    return {
      statusCode: 404,
      body: { error: 'Service area not found.' },
    };
  }

  return {
    statusCode: 200,
    body: { serviceArea },
  };
}

export async function listServiceAreaVendors({ params }) {
  const serviceAreaRepository = createRepository('service-areas');
  const mappingRepository = createRepository('service-area-vendors');

  const serviceArea = await serviceAreaRepository.getById(params[0]);
  if (!serviceArea) {
    return {
      statusCode: 404,
      body: { error: 'Service area not found.' },
    };
  }

  const mappings = await mappingRepository.queryByField('pincode', params[0]);
  const vendorIds = mappings.map((mapping) => mapping.vendorId);
  const vendorRepository = createRepository('vendors');
  const vendors = await Promise.all(vendorIds.map((vendorId) => vendorRepository.getById(vendorId)));

  return {
    statusCode: 200,
    body: { pincode: params[0], vendors: vendors.filter(Boolean) },
  };
}

export async function listServiceAreas({ req }) {
  const role = getUserRole(req.headers);
  if (role !== 'admin') {
    return {
      statusCode: 403,
      body: { error: 'Admin access required.' },
    };
  }

  const repository = createRepository('service-areas');
  const serviceAreas = await repository.list();

  return {
    statusCode: 200,
    body: { serviceAreas: serviceAreas || [] },
  };
}

export async function deleteServiceArea({ req, params }) {
  const role = getUserRole(req.headers);
  if (role !== 'admin') {
    return {
      statusCode: 403,
      body: { error: 'Admin access required.' },
    };
  }

  const pincode = params[0];
  const repository = createRepository('service-areas');
  const existingArea = await repository.getById(pincode);

  if (!existingArea) {
    return {
      statusCode: 404,
      body: { error: 'Service area not found.' },
    };
  }

  await repository.delete(pincode);

  return {
    statusCode: 200,
    body: { success: true, message: `Service area ${pincode} deleted.` },
  };
}
