import assert from 'assert';
import { validateImageBuffer, uploadAiSpaceImage, analyzeAiSpace, resetAiRateLimiters } from '../backend/src/handlers/aiAssistant.js';

async function runAiAssistantTests() {
  console.log('==================================================');
  console.log('RUNNING AI ASSISTANT RATE LIMIT & SECURITY TESTS');
  console.log('==================================================\n');

  resetAiRateLimiters();

  const validJpgBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x00, 0x00]);

  // TEST 1: Upload Rate Limiter (Max 10 requests per 10 mins per IP)
  console.log('TEST 1: Upload Rate Limiter (10 requests/10 min limit per IP)');
  const reqIp1 = { headers: { 'x-forwarded-for': '192.168.1.100' }, body: { imageBase64: `data:image/jpeg;base64,${validJpgBuffer.toString('base64')}` } };

  for (let i = 1; i <= 10; i++) {
    const res = await uploadAiSpaceImage({ req: reqIp1 });
    assert.strictEqual(res.statusCode, 200, `Upload attempt #${i} for IP 192.168.1.100 should succeed with 200 OK`);
  }

  // 11th Request from IP 192.168.1.100 must return HTTP 429
  const res11 = await uploadAiSpaceImage({ req: reqIp1 });
  assert.strictEqual(res11.statusCode, 429, '11th upload attempt for IP 192.168.1.100 must return HTTP 429 Too Many Requests');
  assert.ok(res11.body.error.includes('Too many upload requests'), 'Response body must contain rate limit error message');
  console.log('PASS: Upload 11th request returned HTTP 429 as expected.\n');

  // TEST 2: IP Isolation for Upload Rate Limiter
  console.log('TEST 2: IP Isolation (Different IP gets independent upload allowance)');
  const reqIp2 = { headers: { 'x-forwarded-for': '203.0.113.50' }, body: { imageBase64: `data:image/jpeg;base64,${validJpgBuffer.toString('base64')}` } };
  const resIp2 = await uploadAiSpaceImage({ req: reqIp2 });
  assert.strictEqual(resIp2.statusCode, 200, 'Upload from different IP 203.0.113.50 should succeed with 200 OK');
  console.log('PASS: Different IP received independent allowance.\n');

  // Get uploaded image URL for analysis testing
  const uploadedUrl = resIp2.body.imageUrl;

  // TEST 3: Analyze Rate Limiter (Max 5 requests per 10 mins per IP)
  console.log('TEST 3: Analyze Rate Limiter (5 requests/10 min limit per IP)');
  const reqAnalyzeIp1 = { headers: { 'x-forwarded-for': '192.168.1.200' }, body: { imageUrl: uploadedUrl, roomType: 'Living Room' } };

  // Delete AI keys to test failure response code without external call
  delete process.env.GEMINI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.DECORFESTO_AI_API_KEY;

  for (let i = 1; i <= 5; i++) {
    const res = await analyzeAiSpace({ req: reqAnalyzeIp1 });
    // Should pass rate limiter (returning 503 missing API key or 400 validation, but NOT 429)
    assert.notStrictEqual(res.statusCode, 429, `Analyze attempt #${i} should not be blocked by rate limiter`);
  }

  // 6th Request from IP 192.168.1.200 must return HTTP 429
  const resAnalyze6 = await analyzeAiSpace({ req: reqAnalyzeIp1 });
  assert.strictEqual(resAnalyze6.statusCode, 429, '6th analyze attempt for IP 192.168.1.200 must return HTTP 429 Too Many Requests');
  assert.ok(resAnalyze6.body.error.includes('Too many space analysis requests'), 'Response body must contain analyze rate limit error message');
  console.log('PASS: Analyze 6th request returned HTTP 429 as expected.\n');

  // TEST 4: Path Traversal Lockdown & Filename Isolation
  console.log('TEST 4: Path Traversal Lockdown & Filename Isolation');
  resetAiRateLimiters();

  const badPaths = [
    '../../etc/passwd',
    '/etc/passwd',
    'ai-space-bad.png',
    '../config.js',
    'https://example.com/malicious.jpg'
  ];

  for (const badPath of badPaths) {
    const badRes = await analyzeAiSpace({ req: { headers: { 'x-forwarded-for': '10.0.0.1' }, body: { imageUrl: badPath } } });
    assert.strictEqual(badRes.statusCode, 400, `Bad path "${badPath}" should be rejected with 400 Bad Request`);
    assert.ok(badRes.body.error.includes('Invalid or unauthorized image reference'));
  }
  console.log('PASS: Path traversal and non-server generated filenames rejected cleanly.\n');

  // TEST 5: Image Content Validation (Magic Numbers & Decoded Size)
  console.log('TEST 5: Image Content Validation');
  const invalidBuffer = Buffer.from('Text payload not an image');
  const valInv = validateImageBuffer(invalidBuffer);
  assert.strictEqual(valInv.valid, false);

  const oversizedBuffer = Buffer.alloc(10 * 1024 * 1024 + 50);
  oversizedBuffer[0] = 0xFF; oversizedBuffer[1] = 0xD8; oversizedBuffer[2] = 0xFF;
  const valOver = validateImageBuffer(oversizedBuffer);
  assert.strictEqual(valOver.valid, false);
  console.log('PASS: Image content validation (magic numbers & 10MB limit) working as expected.\n');

  console.log('==================================================');
  console.log('ALL AI ASSISTANT RATE LIMIT & SECURITY TESTS PASSED!');
  console.log('==================================================');
}

runAiAssistantTests().catch(err => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
