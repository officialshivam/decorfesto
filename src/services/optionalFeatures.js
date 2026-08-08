import { products } from '../data/products';

const DEFAULT_PROVIDER = 'mock';

function buildBudgetMatch(budget) {
  return Number(budget) || 20000;
}

function normalizeAssistantInput(input = {}) {
  return {
    occasion: input.occasion || 'Birthday',
    roomType: input.roomType || 'Living room',
    dimensions: input.dimensions || '4m x 5m',
    budget: buildBudgetMatch(input.budget),
    themePreferences: input.themePreferences || 'soft luxury',
    colorPreferences: input.colorPreferences || 'blush pink and ivory',
    decorationPreferences: input.decorationPreferences || input.preferences || 'statement entrance with soft lighting',
    photoName: input.photoName || '',
    photoDataUrl: input.photoDataUrl || '',
  };
}

export async function getMockAssistantRecommendation(input) {
  const normalized = normalizeAssistantInput(input);
  const budget = normalized.budget;
  const normalizedOccasion = normalized.occasion.toLowerCase();

  const occasionMatches = products.filter((product) => product.occasion.toLowerCase() === normalizedOccasion);
  const budgetMatches = products.filter((product) => product.price <= budget + 5000);
  const candidates = occasionMatches.length > 0 ? occasionMatches : budgetMatches;
  const topMatches = candidates.slice(0, 3);

  const packageRecommendations = topMatches.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    reason: product.occasion.toLowerCase() === normalizedOccasion
      ? 'Strong fit for your requested occasion and styling preference.'
      : 'A flexible premium option that balances budget and visual impact.',
  }));

  return {
    id: `ai-${Date.now()}`,
    headline: `A ${normalized.themePreferences} setup is the best fit for ${normalized.roomType} spaces around ${normalized.dimensions}`,
    summary: `Our mock AI assistant recommends a premium setup that matches your budget of ₹${budget.toLocaleString('en-IN')} and your preferred ${normalized.occasion} mood${normalized.photoName ? ` using your uploaded ${normalized.photoName}` : ''}.`,
    confidence: 'High',
    estimatedBudget: `₹${Math.min(budget + 3000, 40000).toLocaleString('en-IN')}`,
    recommendedPackages: packageRecommendations,
    designNotes: [
      `Blend ${normalized.themePreferences} accents with layered lighting for a polished finish.`,
      `Use the available floor area to create a focal point around the entry or photo corner.`,
      `Keep the ${normalized.colorPreferences} palette cohesive so the theme feels elevated rather than crowded.`,
      `Lean into ${normalized.decorationPreferences} to make the setup feel signature and premium.`,
    ],
    explanation: `The ${normalized.themePreferences} styling and ${normalized.colorPreferences} palette create a balanced, elevated look for a ${normalized.roomType.toLowerCase()} while staying within your budget and ${normalized.dimensions} footprint.`,
    previewConfig: {
      style: normalized.themePreferences,
      palette: normalized.colorPreferences,
      overlay: normalized.decorationPreferences,
      accent: normalized.occasion,
    },
    nextSteps: [
      'Review the recommended packages in the catalog.',
      'Use the selected package as a starting point for your final booking.',
      'Add your favorite package to cart when you are ready.',
    ],
    photoName: normalized.photoName,
    provider: 'mock',
  };
}

export async function createMockConsultationRequest(input) {
  const date = input.preferredDate || 'Select a preferred date';
  const time = input.preferredTime || 'Select a preferred time';

  return {
    id: `consult-${Date.now()}`,
    occasion: input.occasion || 'General celebration',
    requirements: input.requirements || 'No additional requirements provided yet.',
    preferredDate: date,
    preferredTime: time,
    contactName: input.contactName || 'Guest',
    contactMobile: input.contactMobile || 'Not provided',
    fee: 49,
    status: 'Mock payment ready',
    paymentStatus: 'Mock payment pending',
    provider: 'mock',
  };
}

export function createOptionalFeatureService(options = {}) {
  const provider = options.provider || DEFAULT_PROVIDER;
  const baseUrl = options.baseUrl || '/api/optional-features';

  return {
    async getAssistantRecommendation(input) {
      if (provider === 'mock') {
        return getMockAssistantRecommendation(input);
      }

      const response = await fetch(`${baseUrl}/ai-recommendation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error('Unable to fetch AI recommendations right now.');
      }

      return response.json();
    },
    async createConsultationRequest(input) {
      if (provider === 'mock') {
        return createMockConsultationRequest(input);
      }

      const response = await fetch(`${baseUrl}/consultation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error('Unable to submit consultation request right now.');
      }

      return response.json();
    },
  };
}

export const optionalFeatureService = createOptionalFeatureService();
