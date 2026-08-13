export function calculateAddOnCost(selections) {
  if (!selections || typeof selections !== 'object') return 0;

  let total = 0;

  Object.values(selections).forEach((val) => {
    if (!val) return;

    if (typeof val === 'number') {
      total += val;
    } else if (typeof val === 'string') {
      const match = val.match(/\+₹\s*(\d[\d,]*)/);
      if (match) {
        const rawNum = match[1].replace(/,/g, '');
        const num = parseInt(rawNum, 10);
        if (!isNaN(num)) {
          total += num;
        }
      }
    } else if (typeof val === 'object' && typeof val.price === 'number') {
      total += val.price;
    }
  });

  return total;
}
