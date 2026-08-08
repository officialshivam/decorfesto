const CATEGORIES_STORAGE_KEY = 'decorfesto-admin-categories';

const defaultCategories = [
  'Birthday', 'Anniversary', 'Proposal', 'Baby Shower', 'Housewarming',
  'Wedding', 'Kids', 'Romantic', 'Festival', 'Custom',
].map((name, index) => ({
  id: `category-${name.toLowerCase().replace(/\s+/g, '-')}`,
  name,
  active: true,
  displayOrder: index + 1,
}));

function readCategories() {
  if (typeof window === 'undefined') return defaultCategories;

  try {
    const stored = window.localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (!stored) return defaultCategories;
    const categories = JSON.parse(stored);
    return Array.isArray(categories) ? categories : defaultCategories;
  } catch (error) {
    console.warn('Unable to read saved categories.', error);
    return defaultCategories;
  }
}

function writeCategories(categories) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  }
}

export function getStoredCategories() {
  return readCategories().sort((first, second) => Number(first.displayOrder) - Number(second.displayOrder));
}

export function saveStoredCategory(category) {
  const categories = readCategories();
  const existingCategory = categories.find((entry) => entry.id === category.id);
  const nextCategory = {
    ...existingCategory,
    ...category,
    id: category.id || `category-${Date.now()}`,
    name: String(category.name || '').trim(),
    active: category.active !== false,
    displayOrder: Number(category.displayOrder || categories.length + 1),
    createdAt: existingCategory?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const nextCategories = existingCategory
    ? categories.map((entry) => (entry.id === nextCategory.id ? nextCategory : entry))
    : [...categories, nextCategory];

  writeCategories(nextCategories);
  return nextCategory;
}

export function deleteStoredCategory(categoryId, decorations) {
  const category = readCategories().find((entry) => entry.id === categoryId);
  if (category && decorations.some((decoration) => decoration.category === category.name)) {
    return { ok: false, error: 'Categories in use by decorations cannot be deleted. Deactivate the category instead.' };
  }

  writeCategories(readCategories().filter((entry) => entry.id !== categoryId));
  return { ok: true };
}
