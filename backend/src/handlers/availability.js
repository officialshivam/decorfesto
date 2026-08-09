import { createRepository } from '../dataAccess/repository.js';

export async function checkAvailability({ req }) {
  const payload = req.body || {};

  // Always normalize pincode to a string
  const pincode = String(payload.pincode ?? '').trim();

  if (!pincode) {
    return {
      statusCode: 400,
      body: {
        available: false,
        error: 'Pincode is required.',
      },
    };
  }

  const serviceAreaRepo = createRepository('service-areas');

  // Use normalized string pincode for lookup
  const serviceArea = await serviceAreaRepo.getById(pincode);

  const mappingRepo = createRepository('service-area-vendors');
  let mappings = [];

  const available = Boolean(serviceArea && serviceArea.serviceable === true && serviceArea.active !== false);

  if (available) {
    // Use the same normalized pincode for vendor mapping
    mappings = await mappingRepo.queryByField('pincode', pincode);
  }

  const checkRecord = {
    id: `check-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    pincode,
    available,
    vendorCount: mappings.length,
    checkedAt: new Date().toISOString(),
  };

  const checkRepo = createRepository('availability-checks');
  try {
    await checkRepo.create(checkRecord);
  } catch (error) {
    console.warn('Unable to persist availability check.', error);
  }

  if (!available) {
    return {
      statusCode: 200,
      body: {
        available: false,
        message: 'Service is not available for this pincode.',
        pincode,
      },
    };
  }

  return {
    statusCode: 200,
    body: {
      available: true,
      message: 'Service is available for this pincode.',
      pincode,
      vendorCount: mappings.length,
    },
  };
}
