const staticPincodeFallback = {
  '110032': 'Shahdara Bihari Colony, Delhi',
  '110001': 'Connaught Place, New Delhi',
  '400001': 'Fort, Mumbai',
  '560001': 'Bangalore G.P.O., Bangalore',
  '600001': 'Chennai G.P.O., Chennai',
  '700001': 'Kolkata G.P.O., Kolkata',
};

export async function fetchPincodeLocation(pincode) {
  const pc = String(pincode || '').trim();
  if (!/^[1-9][0-9]{5}$/.test(pc)) {
    return { ok: false, error: 'Pincode must be exactly 6 digits.' };
  }

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pc}`);
    const data = await response.json();

    if (
      Array.isArray(data) &&
      data[0]?.Status === 'Success' &&
      Array.isArray(data[0]?.PostOffice) &&
      data[0].PostOffice.length > 0
    ) {
      const po = data[0].PostOffice[0];
      const name = po.Name || '';
      const district = po.District || po.State || '';
      const locationStr = district && !name.includes(district) ? `${name}, ${district}` : name || district || 'India';
      return { ok: true, location: locationStr, pincode: pc };
    }

    if (staticPincodeFallback[pc]) {
      return { ok: true, location: staticPincodeFallback[pc], pincode: pc };
    }

    return { ok: false, error: 'Pincode not found. Please verify the 6-digit Indian pincode.' };
  } catch {
    if (staticPincodeFallback[pc]) {
      return { ok: true, location: staticPincodeFallback[pc], pincode: pc };
    }
    return { ok: false, error: 'Unable to reach location lookup service.' };
  }
}
