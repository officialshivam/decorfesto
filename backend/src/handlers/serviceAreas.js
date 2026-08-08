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
  const serviceArea = {
    id: payload.pincode || `service-area-${Date.now()}`,
    pincode: payload.pincode,
    city: payload.city || '',
    serviceable: payload.serviceable !== false,
    leadTimeHours: payload.leadTimeHours || 24,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await repository.create(serviceArea);
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
