import { createRepository } from '../dataAccess/repository.js';
import { getUserRole } from '../auth.js';

export async function createCustomer({ req }) {
  const repository = createRepository('customers');
  const payload = req.body && typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const customer = {
    id: payload.customerId || `customer-${Date.now()}`,
    cognitoSub: payload.cognitoSub || null,
    fullName: payload.fullName || 'Guest Customer',
    email: payload.email || '',
    phone: payload.phone || '',
    addresses: payload.addresses || [],
    defaultPincode: payload.defaultPincode || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await repository.create(customer);
  return {
    statusCode: 201,
    body: { customer },
  };
}

export async function getCustomer({ req, params }) {
  const repository = createRepository('customers');
  const customer = await repository.getById(params[0]);
  const role = getUserRole(req.headers);

  if (!customer) {
    return {
      statusCode: 404,
      body: { error: 'Customer not found.' },
    };
  }

  if (role !== 'admin' && customer.id !== params[0]) {
    return {
      statusCode: 403,
      body: { error: 'Forbidden.' },
    };
  }

  return {
    statusCode: 200,
    body: { customer },
  };
}
