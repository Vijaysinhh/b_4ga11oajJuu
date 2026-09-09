// Run: node --env-file=.env.local scripts/check-voice-ai.cjs
// Synthetic text only. Never prints credentials or provider error payloads.
const { GoogleGenAI } = require('@google/genai');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

async function main() {
  if (!process.env.GEMINI_API_KEY) throw new Error('Missing configuration');
  const source = fs.readFileSync(path.join(__dirname, '../lib/voice-sale-ai.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText;
  const localModule = {exports: {}};
  new Function('require', 'exports', compiled)(require, localModule.exports);
  const {voiceAIInstructions, voiceAIJsonSchema, validateVoiceAIResult} = localModule.exports;
  const lines = [{index: 0, productQuery: 'दूध', quantity: 2, candidateIds: [42], candidates: [{id: 42, name: 'Milk', name_marathi: 'दूध', unit: 'packet', quantity: 10, sell_price: 30}]}];
  const ai = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_TEXT_MODEL || 'gemini-3.5-flash-lite',
    contents: JSON.stringify({transcript: 'दोन दोन दोन दूध', lines}),
    config: {systemInstruction: voiceAIInstructions, responseMimeType: 'application/json', responseJsonSchema: voiceAIJsonSchema,
      temperature: 0, maxOutputTokens: 512, httpOptions: {timeout: 15000}},
  });
  const result = validateVoiceAIResult(JSON.parse(response.text || '{}'), lines);
  if (result.lines[0].productId !== 42 || result.lines[0].quantity !== 2) throw new Error('Unexpected interpretation');
  console.log('Gemini connection and synthetic Marathi product-matching check passed.');
}
main().catch((error) => {
  const status = Number(error.status) || null;
  const message = String(error.message || '').toLowerCase();
  const reason = message.includes('leaked') ? 'key-reported-leaked'
    : message.includes('expired') ? 'key-expired'
    : message.includes('api key not valid') || message.includes('api_key_invalid') ? 'invalid-key'
    : message.includes('has not been used') || message.includes('service_disabled') ? 'api-not-enabled'
    : message.includes('blocked') ? 'request-blocked'
    : message.includes('permission') ? 'permission-denied'
    : 'unspecified';
  const network = ['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'].includes(error.cause?.code) || /fetch failed|network|timeout/i.test(error.message || '');
  console.log(JSON.stringify({ok: false, status, reason, category: network ? 'network' : status === 400 || status === 401 || status === 403 ? 'credentials-or-request' : status === 404 ? 'model-unavailable' : status === 429 ? 'quota' : 'request-or-validation-failed'}));
  process.exitCode = 1;
});
