import { products } from '../../src/data/products.js';
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
    await Promise.all(products.map((product) => decorationRepo.create(toDecorationRecord(product))));
  }

  const vendorRepo = createRepository('vendors');
  const existingVendors = await vendorRepo.list();
  if (existingVendors.length === 0) {
    await vendorRepo.create({
      id: 'vendor-001',
      name: 'DecorFesto Studio',
      contactName: 'Aarav Mehta',
      email: 'vendor@decorfesto.com',
      phone: '+919876543210',
      specialties: ['Balloon', 'Floral', 'Birthday'],
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const serviceAreaRepo = createRepository('service-areas');
  const existingServiceAreas = await serviceAreaRepo.list();
  if (existingServiceAreas.length === 0) {
    await serviceAreaRepo.create({
      id: '110001',
      pincode: '110001',
      city: 'Delhi',
      serviceable: true,
      leadTimeHours: 24,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await serviceAreaRepo.create({
      id: '400001',
      pincode: '400001',
      city: 'Mumbai',
      serviceable: true,
      leadTimeHours: 36,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const serviceAreaVendorRepo = createRepository('service-area-vendors');
  const existingServiceAreaVendors = await serviceAreaVendorRepo.list();
  if (existingServiceAreaVendors.length === 0) {
    await serviceAreaVendorRepo.create({
      id: '110001#vendor-001',
      pincode: '110001',
      vendorId: 'vendor-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await serviceAreaVendorRepo.create({
      id: '400001#vendor-001',
      pincode: '400001',
      vendorId: 'vendor-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}
