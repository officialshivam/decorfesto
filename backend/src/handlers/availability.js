import { createRepository } from '../dataAccess/repository.js';

export async function checkAvailability({ req }) {
  const payload = req.body ? req.body : {};
  const pincode = payload.pincode;
  if (!pincode) {
    return {
      statusCode: 400,
      body: { error: 'Pincode is required.' },
    };
  }

  const serviceAreaRepo = createRepository('service-areas');
  const serviceArea = await serviceAreaRepo.getById(pincode);
  if (!serviceArea || !serviceArea.serviceable) {
    return {
      statusCode: 200,
      body: { available: false, message: 'Service is not available for this pincode.', pincode },
    };
  }

  const mappingRepo = createRepository('service-area-vendors');
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
