function resolveApiBases() {
  const bases = [window.location.origin];
  if (window.location.port === '5173') {
    bases.push('http://localhost:4100');
  }
  return bases;
}

async function postJson(path, payload, extraHeaders = {}) {
  const bases = resolveApiBases();
  let lastError;

  for (const base of bases) {
    try {
      const response = await fetch(`${base}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...extraHeaders,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        lastError = new Error(`Request to ${base}${path} failed with status ${response.status}.`);
        continue;
      }

      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export async function checkAvailabilityOnServer(pincode) {
  return postJson('/availability/check', { pincode });
}

export async function saveServiceAreaOnServer(serviceArea) {
  return postJson('/service-areas', serviceArea, { 'X-User-Role': 'admin' });
}
