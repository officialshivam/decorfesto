import { createRepository } from './dataAccess/repository.js';
import { ensureDataDirectory } from './config.js';

function toDecorationRecord(product) {
  return {
    id: `decoration-${product.id}`,
    name: product.name,
    occasion: product.occasion,
    basePrice: product.price,
    originalPrice: product.originalPrice,
    rating: product.rating,
    reviewCount: product.reviewCount,
    location: product.location,
    description: product.description,
    highlights: product.highlights,
    includedItems: product.includedItems,
    customizationOptions: product.customizableOptions,
    image: product.image,
    images: product.images,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function seedBackendData() {
  await ensureDataDirectory();

  const decorationRepo = createRepository('decorations');
  const existingDecorations = await decorationRepo.list();
  if (existingDecorations.length === 0) {
    let productsList = [];
    try {
      const prodMod = await import('../../src/data/products.js');
      productsList = prodMod.products || [];
    } catch {
      // Fallback if products data is not present in deployment environment
    }
    if (productsList.length > 0) {
      await Promise.all(productsList.map((product) => decorationRepo.create(toDecorationRecord(product))));
    }
  }

  const defaultVendors = [
    {
      id: 'VND-0001',
      name: 'DecorFesto Studio',
      contactName: 'Aarav Mehta',
      email: 'vendor@decorfesto.com',
      phone: '+919876543210',
      specialties: ['Balloon', 'Floral', 'Birthday'],
      status: 'active',
    },
    {
      id: 'VND-0002',
      name: 'Delhi Celebrations Co.',
      contactName: 'Priya Sharma',
      email: 'delhi@decorfesto.com',
      phone: '+919812345670',
      specialties: ['Balloon', 'Kids', 'Corporate'],
      status: 'active',
    },
  ];

  const vendorRepo = createRepository('vendors');
  const existingVendors = await vendorRepo.list();
  const existingVendorIds = new Set(existingVendors.map((vendor) => vendor.id));
  for (const defaultVendor of defaultVendors) {
    if (existingVendorIds.has(defaultVendor.id)) {
      continue;
    }

    await vendorRepo.create({
      ...defaultVendor,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const defaultServiceAreas = [
    {
      id: '110001',
      pincode: '110001',
      city: 'Delhi',
      serviceable: true,
      leadTimeHours: 24,
    },
    {
      id: '110032',
      pincode: '110032',
      city: 'Delhi',
      serviceable: true,
      leadTimeHours: 24,
    },
    {
      id: '400001',
      pincode: '400001',
      city: 'Mumbai',
      serviceable: true,
      leadTimeHours: 36,
    },
  ];

  const serviceAreaRepo = createRepository('service-areas');
  const existingServiceAreas = await serviceAreaRepo.list();
  const existingServiceAreaIds = new Set(existingServiceAreas.map((area) => area.id));
  for (const defaultArea of defaultServiceAreas) {
    if (existingServiceAreaIds.has(defaultArea.id)) {
      continue;
    }

    await serviceAreaRepo.create({
      ...defaultArea,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const serviceAreaVendorRepo = createRepository('service-area-vendors');
  const existingServiceAreaVendors = await serviceAreaVendorRepo.list();
  const existingMappings = new Set(existingServiceAreaVendors.map((mapping) => mapping.id));
  const defaultMappings = defaultServiceAreas
    .filter((area) => area.id !== '110032')
    .map((area) => ({
      id: `${area.id}#vendor-001`,
      pincode: area.id,
      vendorId: 'vendor-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
  defaultMappings.push({
    id: '110032#vendor-002',
    pincode: '110032',
    vendorId: 'vendor-002',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  for (const mapping of defaultMappings) {
    if (existingMappings.has(mapping.id)) {
      continue;
    }

    await serviceAreaVendorRepo.create(mapping);
  }

  const chargeRepo = createRepository('charges');
  const existingCharges = await chargeRepo.list();
  if (existingCharges.length === 0) {
    await chargeRepo.create({
      id: 'booking_service_fee',
      name: 'Booking Service Fee',
      amount: 1,
      enabled: true,
      description: 'Booking/service charge applied to customer checkouts.',
      type: 'FIXED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}
