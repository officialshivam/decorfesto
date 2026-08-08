export function getUserRole(headers = {}) {
  const roleHeader = headers['x-user-role'] || headers['X-User-Role'];
  if (roleHeader) {
    return String(roleHeader).toLowerCase();
  }

  const authHeader = headers.authorization || headers.Authorization;
  if (!authHeader) {
    return 'customer';
  }

  const token = String(authHeader).replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return 'customer';
  }

  if (token.includes('admin')) {
    return 'admin';
  }

  if (token.includes('vendor')) {
    return 'vendor';
  }

  return 'customer';
}

export function requireRole(role, request) {
  const userRole = getUserRole(request.headers);
  if (userRole !== role) {
    return {
      allowed: false,
      message: `Role ${role} required.`,
    };
  }

  return { allowed: true, userRole };
}
