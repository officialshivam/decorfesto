import { createRepository } from '../dataAccess/repository.js';

export async function checkAvailability({ req }) {
  const payload = req.body || {};
  const pincode = String(payload.pincode ?? '').trim();

  if (!pincode || !/^[1-9][0-9]{5}$/.test(pincode)) {
    return {
      statusCode: 400,
      body: {
        available: false,
        error: 'Please enter a valid 6-digit Indian pincode.',
      },
    };
  }

  const serviceAreaRepo = createRepository('service-areas');
  const serviceArea = await serviceAreaRepo.getById(pincode);

  if (!serviceArea) {
    return {
      statusCode: 200,
      body: {
        available: false,
        status: 'UNKNOWN',
        message: '✕ We currently do not provide decoration services in this pincode.',
        pincode,
      },
    };
  }

  const isServiceable = serviceArea.serviceable === true;
  const mappingRepo = createRepository('service-area-vendors');
  let mappings = [];

  if (isServiceable) {
    mappings = await mappingRepo.queryByField('pincode', pincode);
  }

  const checkRecord = {
    id: `check-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    pincode,
    available: isServiceable,
    vendorCount: mappings.length,
    checkedAt: new Date().toISOString(),
  };

  const checkRepo = createRepository('availability-checks');
  try {
    await checkRepo.create(checkRecord);
  } catch (error) {
    console.warn('Unable to persist availability check.', error);
  }

  if (!isServiceable) {
    return {
      statusCode: 200,
      body: {
        available: false,
        status: 'NON_SERVICEABLE',
        message: '✕ Decoration service is currently unavailable at your location.',
        pincode,
      },
    };
  }

  return {
    statusCode: 200,
    body: {
      available: true,
      status: 'SERVICEABLE',
      message: '✓ Decoration service available at your location.',
      pincode,
      vendorCount: mappings.length,
    },
  };
}
