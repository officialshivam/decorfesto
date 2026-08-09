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

  if (!serviceArea || serviceArea.serviceable !== true || serviceArea.active === false) {
    return {
      statusCode: 200,
      body: {
        available: false,
        message: 'Service is not available for this pincode.',
        pincode,
      },
    };
  }

  const mappingRepo = createRepository('service-area-vendors');

  // Use the same normalized pincode for vendor mapping
  const mappings = await mappingRepo.queryByField('pincode', pincode);

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
