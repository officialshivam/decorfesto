import { getApiBaseUrl } from './apiConfig';

export async function uploadAiSpaceImage(file) {
  if (!file) {
    throw new Error('Please select an image file to upload.');
  }

  // Frontend size check: 10 MB = 10 * 1024 * 1024 bytes
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Selected image exceeds the 10 MB maximum file size limit.');
  }

  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (file.type && !validTypes.includes(file.type.toLowerCase())) {
    throw new Error('Invalid image type. Please select a JPG, PNG, or WEBP file.');
  }

  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/ai-assistant/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: base64,
      fileName: file.name,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Failed to upload image to server.');
  }

  return {
    imageUrl: data.imageUrl,
    filename: data.filename,
  };
}

export async function analyzeAiSpaceImage({ imageUrl, roomType, occasion }) {
  if (!imageUrl) {
    throw new Error('Image URL is required for AI space analysis.');
  }

  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/ai-assistant/analyze-space`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageUrl,
      roomType,
      occasion,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success || !data.analysis) {
    throw new Error(data.error || 'AI space analysis is currently unavailable.');
  }

  return {
    analysis: data.analysis,
    matchingDecorations: data.matchingDecorations || [],
  };
}

export async function generateDecorationPreview({ imageUrl, occasion, spaceAnalysis, selectedDecorationIds }) {
  if (!imageUrl) {
    throw new Error('Image URL is required for decoration preview generation.');
  }

  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/ai-assistant/generate-decoration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageUrl,
      occasion,
      spaceAnalysis,
      selectedDecorationIds,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'AI decoration preview generation is currently unavailable.');
  }

  return {
    generatedImageUrl: data.generatedImageUrl,
    matchingDecorations: data.matchingDecorations || [],
  };
}
