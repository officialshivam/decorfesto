import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import { createRepository } from '../dataAccess/repository.js';

const UPLOAD_SUBDIR = path.join('uploads', 'ai-space');
const SERVER_FILENAME_REGEX = /^ai-(space|generated)-\d+-[a-f0-9]{16}\.(jpg|png|webp)$/;

// Rate Limiter Configuration: 10 minutes window
const WINDOW_MS = 10 * 60 * 1000;
const MAX_UPLOAD_REQUESTS = 10;
const MAX_ANALYZE_REQUESTS = 5;
const MAX_GENERATE_REQUESTS = 5;

// In-memory stores: IP -> Array of timestamps [t1, t2, ...]
const uploadRateMap = new Map();
const analyzeRateMap = new Map();
const generateRateMap = new Map();

export function getClientIp(req) {
  if (!req) return '127.0.0.1';
  const headers = req.headers || {};
  const forwarded = headers['x-forwarded-for'] || headers['X-Forwarded-For'];

  if (forwarded && typeof forwarded === 'string') {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  const realIp = headers['x-real-ip'] || headers['X-Real-IP'];
  if (realIp && typeof realIp === 'string') return realIp.trim();

  const socketIp = req.socket && req.socket.remoteAddress;
  if (socketIp && typeof socketIp === 'string') return socketIp.trim();

  return '127.0.0.1';
}

function checkRateLimit(rateMap, ip, maxLimit, now = Date.now()) {
  if (rateMap.size > 1000) {
    const windowStart = now - WINDOW_MS;
    for (const [key, timestamps] of rateMap.entries()) {
      const valid = timestamps.filter((t) => t > windowStart);
      if (valid.length === 0) {
        rateMap.delete(key);
      } else {
        rateMap.set(key, valid);
      }
    }
  }

  const windowStart = now - WINDOW_MS;
  const userTimestamps = (rateMap.get(ip) || []).filter((t) => t > windowStart);

  if (userTimestamps.length >= maxLimit) {
    rateMap.set(ip, userTimestamps);
    return { allowed: false, count: userTimestamps.length };
  }

  userTimestamps.push(now);
  rateMap.set(ip, userTimestamps);
  return { allowed: true, count: userTimestamps.length };
}

export function resetAiRateLimiters() {
  uploadRateMap.clear();
  analyzeRateMap.clear();
  generateRateMap.clear();
}

function getUploadDirectories() {
  const root = process.cwd();
  return [
    path.join(root, 'dist', UPLOAD_SUBDIR),
    path.join(root, UPLOAD_SUBDIR),
  ];
}

async function ensureUploadDirs() {
  const dirs = getUploadDirectories();
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true }).catch(() => {});
  }
}

export function validateImageBuffer(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 12) {
    return { valid: false, reason: 'File buffer is invalid or empty.' };
  }

  if (buffer.length > 10485760) {
    return { valid: false, reason: 'Decoded image size exceeds maximum 10 MB limit.' };
  }

  const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
                buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A;
  const isRiff = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
  const isWebp = isRiff && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;

  if (!isJpeg && !isPng && !isWebp) {
    return { valid: false, reason: 'Invalid file format. Only JPG, PNG, and WEBP images are supported.' };
  }

  const ext = isJpeg ? 'jpg' : isPng ? 'png' : 'webp';
  const mime = isJpeg ? 'image/jpeg' : isPng ? 'image/png' : 'image/webp';

  return { valid: true, ext, mime, size: buffer.length };
}

export async function getMatchingDecorations({ occasion, spaceAnalysis }) {
  try {
    const repository = createRepository('decorations');
    const all = await repository.list();
    if (!all || !Array.isArray(all)) return [];

    const activeDecorations = all.filter((item) => item && item.active !== false && item.status !== 'INACTIVE');
    if (activeDecorations.length === 0) return [];

    const normOccasion = String(occasion || '').toLowerCase().trim();
    const normSpaceType = String(spaceAnalysis?.spaceType || '').toLowerCase().trim();
    const styles = Array.isArray(spaceAnalysis?.styleCompatibility)
      ? spaceAnalysis.styleCompatibility.map((s) => String(s).toLowerCase().trim())
      : [];

    const scored = activeDecorations.map((item) => {
      let score = 0;
      const itemOccasion = String(item.occasion || item.category || '').toLowerCase().trim();
      const itemName = String(item.name || '').toLowerCase().trim();
      const itemDesc = String(item.description || item.shortDescription || '').toLowerCase().trim();

      if (normOccasion && (itemOccasion.includes(normOccasion) || normOccasion.includes(itemOccasion) || itemName.includes(normOccasion))) {
        score += 10;
      }
      if (normSpaceType && (itemName.includes(normSpaceType) || itemDesc.includes(normSpaceType))) {
        score += 5;
      }
      for (const style of styles) {
        if (style && (itemName.includes(style) || itemDesc.includes(style))) {
          score += 3;
        }
      }

      return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const topMatches = scored.slice(0, 3).map((entry) => entry.item);

    return topMatches.map((item) => ({
      id: String(item.id || item.decorationId),
      name: String(item.name || 'DecorFesto Package'),
      category: String(item.category || item.occasion || 'Decoration'),
      price: Number(item.price ?? item.basePrice ?? 0),
      image: item.image || item.imageUrl || (Array.isArray(item.images) ? item.images[0] : '') || '',
    }));
  } catch (err) {
    console.warn('Catalog matching notice:', err.message);
    return [];
  }
}

export async function uploadAiSpaceImage({ req }) {
  try {
    const clientIp = getClientIp(req);
    const limitCheck = checkRateLimit(uploadRateMap, clientIp, MAX_UPLOAD_REQUESTS);

    if (!limitCheck.allowed) {
      return {
        statusCode: 429,
        body: { error: 'Too many upload requests from your IP. Maximum 10 uploads per 10 minutes allowed. Please try again later.' },
      };
    }

    await ensureUploadDirs();
    const payload = req.body || {};
    const rawBase64 = String(payload.imageBase64 || '').trim();

    if (!rawBase64) {
      return {
        statusCode: 400,
        body: { error: 'No image data provided. Please select an image file.' },
      };
    }

    if (rawBase64.length > 14000000) {
      return {
        statusCode: 400,
        body: { error: 'Upload payload size exceeds maximum 10 MB image limit.' },
      };
    }

    const cleanBase64 = rawBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    if (!/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
      return {
        statusCode: 400,
        body: { error: 'Invalid image encoding (malformed base64).' },
      };
    }

    const buffer = Buffer.from(cleanBase64, 'base64');
    const validation = validateImageBuffer(buffer);
    if (!validation.valid) {
      return {
        statusCode: 400,
        body: { error: validation.reason },
      };
    }

    const filename = `ai-space-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${validation.ext}`;
    const dirs = getUploadDirectories();

    for (const dir of dirs) {
      await fs.writeFile(path.join(dir, filename), buffer).catch(() => {});
    }

    const safeUrl = `/uploads/ai-space/${filename}`;
    return {
      statusCode: 200,
      body: {
        success: true,
        imageUrl: safeUrl,
        filename,
        sizeBytes: validation.size,
        mimeType: validation.mime,
      },
    };
  } catch {
    return {
      statusCode: 500,
      body: { error: 'Failed to process and store image upload.' },
    };
  }
}

async function callGeminiVision(apiKey, imageBuffer, mimeType, roomType, occasion) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  const base64Data = imageBuffer.toString('base64');

  const promptText = `You are a professional room and space interior decorator for event decor (birthdays, weddings, anniversaries, corporate events).
Analyze the provided room or wall photo for event decoration planning (Requested Room Type: "${roomType || 'Room'}", Occasion: "${occasion || 'Celebration'}").
Respond ONLY with a valid raw JSON object (do NOT include markdown code block formatting like \`\`\`json ... \`\`\`) matching this exact schema:
{
  "spaceType": "string (e.g. Living Room, Terrace, Stage, Hallway)",
  "surfaceType": "string (e.g. Plain Accent Wall, Glass Partition, Brick Backdrop)",
  "usableArea": "string (estimated decoration width x height or area, e.g. 3m x 2.5m section)",
  "wallColor": "string (primary wall/background color)",
  "lighting": "string (lighting condition, e.g. Natural Daylight, Warm Ambient)",
  "existingFurniture": ["string (visible furniture/objects near decor zone)"],
  "availableDecorationArea": "string (specific prime spot for arches, backdrops, lighting)",
  "dominantColors": ["string (2-4 dominant colors in room)"],
  "styleCompatibility": ["string (3-4 complementary decor styles, e.g. Soft Luxury, Minimal, Elegant)"],
  "decorationConstraints": ["string (objects/areas to avoid obscuring)"]
}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: promptText },
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Gemini API returned status ${response.status}: ${errorText.slice(0, 100)}`);
  }

  const resData = await response.json();
  const rawText = resData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleanedJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

  return JSON.parse(cleanedJson);
}

async function callOpenAIVision(apiKey, imageBuffer, mimeType, roomType, occasion) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const base64Data = imageBuffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  const promptText = `Analyze this room or wall photo for event decoration planning (Room: "${roomType || 'Space'}", Occasion: "${occasion || 'Event'}").
Respond ONLY with a JSON object matching this schema:
{
  "spaceType": "string",
  "surfaceType": "string",
  "usableArea": "string",
  "wallColor": "string",
  "lighting": "string",
  "existingFurniture": ["string"],
  "availableDecorationArea": "string",
  "dominantColors": ["string"],
  "styleCompatibility": ["string"],
  "decorationConstraints": ["string"]
}`;

  const requestBody = {
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: promptText },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OpenAI API returned status ${response.status}: ${errorText.slice(0, 100)}`);
  }

  const resData = await response.json();
  const rawText = resData?.choices?.[0]?.message?.content || '';
  return JSON.parse(rawText);
}

async function callGeminiImageGeneration(apiKey, imageBuffer, mimeType, promptText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${encodeURIComponent(apiKey)}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: promptText },
          {
            inlineData: {
              mimeType,
              data: imageBuffer.toString('base64'),
            },
          },
        ],
      },
    ],
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Gemini Image API returned status ${response.status}: ${errorText.slice(0, 100)}`);
  }

  const resData = await response.json();
  const parts = resData?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData && part.inlineData.data) {
      return Buffer.from(part.inlineData.data, 'base64');
    }
  }

  throw new Error('Gemini 3.1 Flash Image service did not return generated image data.');
}

export async function analyzeAiSpace({ req }) {
  try {
    const clientIp = getClientIp(req);
    const limitCheck = checkRateLimit(analyzeRateMap, clientIp, MAX_ANALYZE_REQUESTS);

    if (!limitCheck.allowed) {
      return {
        statusCode: 429,
        body: { error: 'Too many space analysis requests from your IP. Maximum 5 analysis requests per 10 minutes allowed. Please try again later.' },
      };
    }

    const payload = req.body || {};
    const imageUrl = String(payload.imageUrl || '').trim();
    const roomType = String(payload.roomType || '').trim();
    const occasion = String(payload.occasion || '').trim();

    if (!imageUrl) {
      return {
        statusCode: 400,
        body: { error: 'Image URL is required for AI space analysis.' },
      };
    }

    const filename = path.basename(imageUrl);
    if (!filename || !SERVER_FILENAME_REGEX.test(filename)) {
      return {
        statusCode: 400,
        body: { error: 'Invalid or unauthorized image reference. Only images uploaded through the AI Assistant flow can be analyzed.' },
      };
    }

    const dirs = getUploadDirectories();
    let imageBuffer = null;

    for (const dir of dirs) {
      const fullPath = path.join(dir, filename);
      try {
        imageBuffer = await fs.readFile(fullPath);
        if (imageBuffer) break;
      } catch {}
    }

    if (!imageBuffer) {
      return {
        statusCode: 404,
        body: { error: 'Uploaded image file not found on server.' },
      };
    }

    const validation = validateImageBuffer(imageBuffer);
    if (!validation.valid) {
      return {
        statusCode: 400,
        body: { error: validation.reason },
      };
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.DECORFESTO_AI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!geminiKey && !openaiKey) {
      return {
        statusCode: 503,
        body: {
          error: 'AI visual analysis service is currently unavailable. Server AI API key (GEMINI_API_KEY or OPENAI_API_KEY) is not configured.',
        },
      };
    }

    let parsed = null;
    if (geminiKey) {
      parsed = await callGeminiVision(geminiKey, imageBuffer, validation.mime, roomType, occasion);
    } else if (openaiKey) {
      parsed = await callOpenAIVision(openaiKey, imageBuffer, validation.mime, roomType, occasion);
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('AI Vision service returned an invalid or empty response.');
    }

    const structuredAnalysis = {
      spaceType: String(parsed.spaceType || roomType || 'Living Room').trim(),
      surfaceType: String(parsed.surfaceType || 'Accent Wall').trim(),
      usableArea: String(parsed.usableArea || 'Available Section').trim(),
      wallColor: String(parsed.wallColor || 'Neutral').trim(),
      lighting: String(parsed.lighting || 'Natural Daylight').trim(),
      existingFurniture: Array.isArray(parsed.existingFurniture) ? parsed.existingFurniture.map(String) : [],
      availableDecorationArea: String(parsed.availableDecorationArea || parsed.usableArea || 'Central Wall Area').trim(),
      dominantColors: Array.isArray(parsed.dominantColors) ? parsed.dominantColors.map(String) : [],
      styleCompatibility: Array.isArray(parsed.styleCompatibility) ? parsed.styleCompatibility.map(String) : ['Soft Luxury', 'Minimal', 'Elegant'],
      decorationConstraints: Array.isArray(parsed.decorationConstraints) ? parsed.decorationConstraints.map(String) : [],
    };

    const matchingDecorations = await getMatchingDecorations({ occasion, spaceAnalysis: structuredAnalysis });

    return {
      statusCode: 200,
      body: {
        success: true,
        analysis: structuredAnalysis,
        matchingDecorations,
      },
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: { error: `AI Space Analysis failed: ${err.message}` },
    };
  }
}

export async function generateAiDecoration({ req }) {
  try {
    const clientIp = getClientIp(req);
    const limitCheck = checkRateLimit(generateRateMap, clientIp, MAX_GENERATE_REQUESTS);

    if (!limitCheck.allowed) {
      return {
        statusCode: 429,
        body: { error: 'Too many decoration preview requests from your IP. Maximum 5 generation requests per 10 minutes allowed. Please try again later.' },
      };
    }

    await ensureUploadDirs();
    const payload = req.body || {};
    const imageUrl = String(payload.imageUrl || '').trim();
    const occasion = String(payload.occasion || 'Celebration').trim();

    if (!imageUrl) {
      return {
        statusCode: 400,
        body: { error: 'Image URL is required for decoration preview generation.' },
      };
    }

    const filename = path.basename(imageUrl);
    if (!filename || !SERVER_FILENAME_REGEX.test(filename)) {
      return {
        statusCode: 400,
        body: { error: 'Invalid or unauthorized image reference for generation.' },
      };
    }

    const dirs = getUploadDirectories();
    let imageBuffer = null;

    for (const dir of dirs) {
      const fullPath = path.join(dir, filename);
      try {
        imageBuffer = await fs.readFile(fullPath);
        if (imageBuffer) break;
      } catch {}
    }

    if (!imageBuffer) {
      return {
        statusCode: 404,
        body: { error: 'Uploaded image file not found on server.' },
      };
    }

    const validation = validateImageBuffer(imageBuffer);
    if (!validation.valid) {
      return {
        statusCode: 400,
        body: { error: validation.reason },
      };
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.DECORFESTO_AI_API_KEY;
    if (!geminiKey) {
      return {
        statusCode: 503,
        body: { error: 'AI decoration preview service is currently unavailable. Server GEMINI_API_KEY is not configured.' },
      };
    }

    const matchingDecorations = await getMatchingDecorations({ occasion, spaceAnalysis: payload.spaceAnalysis });
    const selectedNames = matchingDecorations.map((d) => d.name).join(', ');

    const promptText = `Use the uploaded room/wall photograph as the exact base scene.
Preserve the wall, room proportions, doors, windows, flooring, furniture and camera perspective.
Decorate only the usable wall/free-space area.
Create a realistic decoration for the selected occasion (${occasion}).
Use the supplied DecorFesto catalog decoration references (${selectedNames || 'Balloon Arch & Backdrop Setup'}) as the design inspiration.
Adapt the referenced decoration to fit the actual wall dimensions and available space.
Do not redesign the room.
Do not remove structural elements.
Do not change doors or windows.
Do not create unrelated decorations.
The result should look like a realistic DecorFesto decoration installed in this exact space.`;

    let generatedBuffer = null;
    try {
      generatedBuffer = await callGeminiImageGeneration(geminiKey, imageBuffer, validation.mime, promptText);
    } catch (err) {
      return {
        statusCode: 500,
        body: { error: `AI Image Generation failed: ${err.message}` },
      };
    }

    const generatedFilename = `ai-generated-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.png`;
    for (const dir of dirs) {
      await fs.writeFile(path.join(dir, generatedFilename), generatedBuffer).catch(() => {});
    }

    const safeUrl = `/uploads/ai-space/${generatedFilename}`;

    return {
      statusCode: 200,
      body: {
        success: true,
        generatedImageUrl: safeUrl,
        filename: generatedFilename,
        matchingDecorations,
      },
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: { error: `Decoration preview generation error: ${err.message}` },
    };
  }
}
