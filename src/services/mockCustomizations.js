const CUSTOMIZATIONS_STORAGE_KEY = 'decorfesto-admin-customizations';

export const defaultColorPalettes = [
  {
    id: 'palette-1',
    type: 'colorPalette',
    name: 'Classic Pink & White',
    category: 'Theme Color Palette',
    price: 0,
    active: true,
    colors: ['#FFC0CB', '#FFFFFF'],
    assignedDesigns: ['1', '2', '5', '11'],
  },
  {
    id: 'palette-2',
    type: 'colorPalette',
    name: 'Royal Blue & White',
    category: 'Theme Color Palette',
    price: 0,
    active: true,
    colors: ['#1E90FF', '#FFFFFF'],
    assignedDesigns: ['1', '2', '5', '11'],
  },
  {
    id: 'palette-3',
    type: 'colorPalette',
    name: 'Red & Gold Luxury',
    category: 'Theme Color Palette',
    price: 350,
    active: true,
    colors: ['#DC143C', '#FFD700'],
    assignedDesigns: ['1', '2', '8', '9'],
  },
  {
    id: 'palette-4',
    type: 'colorPalette',
    name: 'Pastel Rainbow',
    category: 'Theme Color Palette',
    price: 400,
    active: true,
    colors: ['#FFB6C1', '#B0E0E6', '#FFFACD', '#E6E6FA'],
    assignedDesigns: ['1', '2', '5', '11'],
  },
  {
    id: 'palette-5',
    type: 'colorPalette',
    name: 'Emerald & Champagne Gold',
    category: 'Theme Color Palette',
    price: 450,
    active: true,
    colors: ['#008080', '#F7E7CE'],
    assignedDesigns: ['2', '8', '9', '10', '12'],
  },
  {
    id: 'palette-6',
    type: 'colorPalette',
    name: 'Custom Signature Palette',
    category: 'Theme Color Palette',
    price: 600,
    active: true,
    colors: ['#8A2BE2', '#FF69B4'],
    assignedDesigns: ['2', '6', '12'],
  },
];

export const defaultFloralArrangements = [
  {
    id: 'floral-1',
    type: 'floralArrangement',
    name: 'No Floral Arrangement',
    category: 'Floral Arrangement',
    description: 'Standard setup without additional fresh floral arrangements',
    price: 0,
    active: true,
    image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=400&q=80',
    assignedDesigns: ['2', '3', '4', '7', '9', '10', '12'],
  },
  {
    id: 'floral-2',
    type: 'floralArrangement',
    name: 'Standard Floral Accents',
    category: 'Floral Arrangement',
    description: 'Elegantly arranged silk rose clusters and greenery accents',
    price: 500,
    active: true,
    image: 'https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&w=400&q=80',
    assignedDesigns: ['2', '3', '4', '7', '9'],
  },
  {
    id: 'floral-3',
    type: 'floralArrangement',
    name: 'Fresh Dutch Roses & Lilies',
    category: 'Floral Arrangement',
    description: 'Handpicked fresh red Dutch roses and fragrant Oriental lilies',
    price: 850,
    active: true,
    image: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=400&q=80',
    assignedDesigns: ['2', '3', '4', '9', '10', '12'],
  },
  {
    id: 'floral-4',
    type: 'floralArrangement',
    name: 'Rose & Baby’s Breath Swag',
    category: 'Floral Arrangement',
    description: 'Delicate white baby’s breath garland with pastel rose accents',
    price: 900,
    active: true,
    image: 'https://images.unsplash.com/photo-1527061011665-3652c757a4d4?auto=format&fit=crop&w=400&q=80',
    assignedDesigns: ['3', '4', '6', '10'],
  },
  {
    id: 'floral-5',
    type: 'floralArrangement',
    name: 'Luxury Mixed Exotic Flowers',
    category: 'Floral Arrangement',
    description: 'Exotic orchids, premium roses, carnations & gold leaf foliage',
    price: 1500,
    active: true,
    image: 'https://images.unsplash.com/photo-1582794543139-8ac9cb0f7b11?auto=format&fit=crop&w=400&q=80',
    assignedDesigns: ['2', '8', '9', '10', '12'],
  },
];

export const defaultAddOns = [
  {
    id: 'addon-1',
    type: 'addon',
    name: 'Custom Name Neon Sign',
    category: 'Personalization',
    description: 'Warm LED custom neon sign with birthday or couple name',
    price: 500,
    active: true,
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=400&q=80',
    assignedDesigns: ['1', '2', '6', '9', '11'],
  },
  {
    id: 'addon-2',
    type: 'addon',
    name: 'Warm LED Fairy Lights',
    category: 'Recommended',
    description: 'Ambient warm curtain lights for photo background backdrop',
    price: 299,
    active: true,
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=400&q=80',
    assignedDesigns: ['1', '2', '3', '4', '6', '9', '10', '12'],
  },
  {
    id: 'addon-3',
    type: 'addon',
    name: 'Luxe Plinth Cake Table',
    category: 'Furniture & Styling',
    description: 'White acrylic cylindrical plinth stands for cake presentation',
    price: 399,
    active: true,
    image: 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?auto=format&fit=crop&w=400&q=80',
    assignedDesigns: ['1', '2', '5', '11'],
  },
  {
    id: 'addon-4',
    type: 'addon',
    name: 'Hanging Photo Clip Wall',
    category: 'Personalization',
    description: '12 printed polaroid photos clipped with warm fairy lights',
    price: 349,
    active: true,
    image: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=400&q=80',
    assignedDesigns: ['1', '3', '4', '6'],
  },
  {
    id: 'addon-5',
    type: 'addon',
    name: 'Bluetooth Music Setup',
    category: 'Entertainment',
    description: 'High quality Bluetooth speaker with curated celebration playlist',
    price: 299,
    active: true,
    image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=400&q=80',
    assignedDesigns: ['3', '4', '6', '12'],
  },
  {
    id: 'addon-6',
    type: 'addon',
    name: 'Cold Fire Pyro Entrance',
    category: 'Special Effects',
    description: 'Indoor-safe cold spark fireworks for grand entry moment',
    price: 999,
    active: true,
    image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=400&q=80',
    assignedDesigns: ['2', '6', '8', '9', '12'],
  },
  {
    id: 'addon-7',
    type: 'addon',
    name: '5ft Rose Petal Carpet',
    category: 'Recommended',
    description: 'Fresh red rose petal carpet pathway leading to decor backdrop',
    price: 399,
    active: true,
    image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=400&q=80',
    assignedDesigns: ['3', '4', '6', '10'],
  },
];

function readCustomizations() {
  if (typeof window === 'undefined') {
    return [...defaultColorPalettes, ...defaultFloralArrangements, ...defaultAddOns];
  }

  try {
    const stored = window.localStorage.getItem(CUSTOMIZATIONS_STORAGE_KEY);
    if (!stored) {
      const initial = [...defaultColorPalettes, ...defaultFloralArrangements, ...defaultAddOns];
      window.localStorage.setItem(CUSTOMIZATIONS_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [...defaultColorPalettes, ...defaultFloralArrangements, ...defaultAddOns];
  } catch (error) {
    console.warn('Unable to read saved customizations.', error);
    return [...defaultColorPalettes, ...defaultFloralArrangements, ...defaultAddOns];
  }
}

function writeCustomizations(data) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CUSTOMIZATIONS_STORAGE_KEY, JSON.stringify(data));
  }
}

export function getStoredCustomizations() {
  return readCustomizations();
}

export function getCustomizationsForDesign(designId, type = null) {
  const all = getStoredCustomizations();
  const dId = String(designId || '');

  return all.filter((item) => {
    if (!item.active) return false;
    if (type && item.type !== type) return false;

    const assigned = Array.isArray(item.assignedDesigns)
      ? item.assignedDesigns.map(String)
      : [];
    return assigned.includes(dId);
  });
}

export function saveStoredCustomization(item) {
  const all = readCustomizations();
  const existingIndex = all.findIndex((e) => e.id === item.id);
  const nextItem = {
    ...item,
    id: item.id || `custom-${Date.now()}`,
    name: String(item.name || '').trim(),
    price: Number(item.price || 0),
    active: item.active !== false,
    assignedDesigns: Array.isArray(item.assignedDesigns) ? item.assignedDesigns.map(String) : [],
    updatedAt: new Date().toISOString(),
  };

  let nextAll = [];
  if (existingIndex >= 0) {
    nextAll = all.map((e, index) => (index === existingIndex ? nextItem : e));
  } else {
    nextAll = [...all, nextItem];
  }

  writeCustomizations(nextAll);
  return nextItem;
}

export function deleteStoredCustomization(itemId) {
  const all = readCustomizations();
  const nextAll = all.filter((e) => e.id !== itemId);
  writeCustomizations(nextAll);
  return { ok: true };
}

export function toggleCustomizationAssignment(itemId, designId, isAssigned) {
  const all = readCustomizations();
  const dId = String(designId);
  const item = all.find((e) => e.id === itemId);
  if (!item) return;

  let currentAssigned = Array.isArray(item.assignedDesigns)
    ? item.assignedDesigns.map(String).filter((id) => id !== 'all')
    : [];

  if (isAssigned) {
    if (!currentAssigned.includes(dId)) {
      currentAssigned.push(dId);
    }
  } else {
    currentAssigned = currentAssigned.filter((id) => id !== dId);
  }

  saveStoredCustomization({
    ...item,
    assignedDesigns: currentAssigned,
  });
}
