const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Compile the actual TypeScript modules in memory; no generated files or services.
const modules = new Map();
function load(name) {
  const filename = path.resolve(__dirname, '..', 'lib', `${name}.ts`);
  if (modules.has(filename)) return modules.get(filename);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(
    (id) => id.startsWith('./') ? load(id.slice(2)) : require(id), module, module.exports,
  );
  modules.set(filename, module.exports);
  return module.exports;
}
const { parseVoiceSaleCommand: parse, normalizeVoiceText: normalize } = load('voice-sale-parser');
const { matchVoiceProducts: match, convertVoiceQuantity: convert, checkVoiceStock: stock } = load('voice-sale-matching');
const { createVoiceRecording } = load('voice-recording');
const { validateVoiceAIResult } = load('voice-sale-ai');

for (const [spoken, expected] of [
  ['two Parle-G', [{quantity: 2, productQuery: 'parle g'}]],
  ['दोन दोन दोन दूध', [{quantity: 2, productQuery: 'दूध'}]],
  ['दोन 2 दोन दूध', [{quantity: 2, productQuery: 'दूध'}]],
  ['दोन दोन रुपयांचे बिस्किट', [{quantity: 2, productQuery: 'बिस्किट', priceOverride: 2}]],
  ['दोन दूध आणि दोन दूध', [{quantity: 2, productQuery: 'दूध'}, {quantity: 2, productQuery: 'दूध'}]],
  ['दोन पार्ले जी आणि अर्धा लिटर दूध', [
    { quantity: 2, productQuery: 'पार्ले जी' },
    { quantity: 0.5, productQuery: 'दूध', requestedUnit: 'l' },
  ]],
  ['१.५ किलो साखर, २५० ग्रॅम चहा', [
    { quantity: 1.5, productQuery: 'साखर', requestedUnit: 'kg' },
    { quantity: 250, productQuery: 'चहा', requestedUnit: 'g' },
  ]],
  ['दूध आणि ब्रेड', [{quantity: 1, productQuery: 'दूध'}, {quantity: 1, productQuery: 'ब्रेड'}]],
  ['दूध दोन लिटर', [{quantity: 2, productQuery: 'दूध', requestedUnit: 'l'}]],
  ['एक डझन अंडी', [{quantity: 1, productQuery: 'अंडी', requestedUnit: 'dozen'}]],
  ['शून्य दूध', [{quantity: 0, productQuery: 'दूध'}]],
  ['दोन दहा रुपयांचे पार्ले जी', [{quantity: 2, productQuery: 'पार्ले जी', priceOverride: 10}]],
  ['दोन पाव', [{quantity: 2, productQuery: 'पाव'}]],
  ['पाव किलो साखर', [{quantity: 0.25, productQuery: 'साखर', requestedUnit: 'kg'}]],
  ['two bread and half a litre of milk', [{quantity: 2, productQuery: 'bread'}, {quantity: 0.5, productQuery: 'milk', requestedUnit: 'l'}]],
  ['दोन दूध तीन ब्रेड', [{quantity: 2, productQuery: 'दूध'}, {quantity: 3, productQuery: 'ब्रेड'}]],
]) test(`parses: ${spoken}`, () => assert.deepEqual(parse(spoken), expected));

test('matches both scripts and preserves brand ambiguity', () => {
  const products = [{id: 1, name: 'Milk', brand: 'A'}, {id: 2, name: 'Milk', brand: 'B'}, {id: 3, name: 'Biscuits', brand: 'Parle-G'}];
  assert.equal(match('दूध', products).selectedId, null);
  assert.equal(match('दूध', products).candidates.length, 2);
  assert.equal(match('पार्ले जी बिस्किटे', products).selectedId, 3);
  assert.equal(match('Milk A', products).selectedId, 1);
  assert.equal(match('unknown', products).selectedId, null);
  assert.equal(normalize('Parle-G'), normalize('पार्ले जी'));
});
test('converts compatible units once, rejects guessed pack sizes', () => {
  assert.equal(convert(250, 'g', 'kg'), 0.25);
  assert.equal(convert(0.5, 'l', 'ml'), 500);
  assert.equal(convert(1, 'dozen', 'pcs'), 12);
  assert.equal(convert(1, 'dozen', 'dz'), 1);
  assert.equal(convert(2, 'packet', 'pack'), 2);
  assert.equal(convert(1, 'kg', 'packet'), null);
  assert.equal(convert(1, 'box', 'pcs'), null);
  assert.equal(convert(0, undefined, 'pcs'), null);
  assert.equal(convert(NaN, undefined, 'pcs'), null);
});

function harness(t) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const engines = [], texts = [], finished = [], errors = [];
  const recording = createVoiceRecording(() => {
    const engine = { start() {}, stop() {}, abort() {}, onresult: null, onend: null, onerror: null };
    engines.push(engine);
    return engine;
  }, 'mr-IN', { onText: (text) => texts.push(text), onFinish: (text) => finished.push(text), onError: (code) => errors.push(code) });
  recording.start();
  const result = (engine, phrases) => engine.onresult({ results: phrases.map(([text, final = true]) => ({ isFinal: final, 0: { transcript: text } })) });
  return {recording, engines, texts, finished, errors, result};
}
test('stock checks include bill quantities, pending quantities and expiry', () => {
  const now = new Date(2026, 8, 7, 12);
  assert.equal(stock({quantity: 0}, 1, 0, 0, now).state, 'insufficient');
  assert.deepEqual(stock({quantity: 4}, 2, 2, 1, now), {state: 'insufficient', available: 1});
  assert.equal(stock({quantity: 4, expiryDate: new Date(2026, 8, 6)}, 1, 0, 0, now).state, 'expired');
  assert.equal(stock({quantity: 4, expiryDate: new Date(2026, 8, 7)}, 1, 0, 0, now).state, 'ready');
  assert.equal(stock({quantity: 4, expiryDate: 'bad-date'}, 1, 0, 0, now).state, 'invalid');
  assert.equal(stock({quantity: 0.3}, 0.2, 0.1, 0, now).state, 'ready');
  assert.equal(stock({quantity: NaN}, 1, 0, 0, now).state, 'invalid');
});
test('result revisions never duplicate a product; Done processes once', (t) => {
  const h = harness(t), engine = h.engines[0];
  assert.equal(engine.lang, 'mr-IN');
  h.result(engine, [['दोन दूध', false]]);
  h.result(engine, [['दोन दूध'], ['एक ब्रेड', false]]);
  h.result(engine, [['दोन दूध'], ['एक ब्रेड']]);
  h.recording.stop(); engine.onend();
  t.mock.timers.tick(2000);
  assert.deepEqual(h.finished, ['दोन दूध एक ब्रेड']);
});
test('short pauses restart while preserving the order', (t) => {
  const h = harness(t);
  h.result(h.engines[0], [['दोन दूध']]); h.engines[0].onend();
  t.mock.timers.tick(250);
  assert.equal(h.engines.length, 2);
  h.result(h.engines[1], [['एक ब्रेड']]);
  h.recording.stop(); h.engines[1].onend();
  assert.deepEqual(h.finished, ['दोन दूध एक ब्रेड']);
});
test('Done between browser sessions does not reopen mic', (t) => {
  const h = harness(t);
  h.result(h.engines[0], [['दूध']]); h.engines[0].onend();
  h.recording.stop(); t.mock.timers.tick(1000);
  assert.equal(h.engines.length, 1);
  assert.deepEqual(h.finished, ['दूध']);
});
test('Cancel ignores queued callbacks and clears restart timers', (t) => {
  const h = harness(t), result = h.engines[0].onresult;
  h.engines[0].onend(); h.recording.cancel();
  result({ results: [{isFinal: true, 0: {transcript: 'late'}}] });
  t.mock.timers.tick(125000);
  assert.equal(h.engines.length, 1);
  assert.deepEqual(h.finished, []);
  assert.deepEqual(h.errors, []);
  assert.deepEqual(h.texts, []);
});
test('network errors preserve text and do not add partial orders', (t) => {
  const h = harness(t);
  h.result(h.engines[0], [['दूध']]);
  h.engines[0].onerror({error: 'network'});
  t.mock.timers.tick(125000);
  assert.deepEqual(h.texts, ['दूध']);
  assert.deepEqual(h.errors, ['network']);
  assert.deepEqual(h.finished, []);
});
test('Done completes even if browser never sends end', (t) => {
  const h = harness(t);
  h.result(h.engines[0], [['दूध']]); h.recording.stop();
  t.mock.timers.tick(1500);
  assert.deepEqual(h.finished, ['दूध']);
});
test('recordings have a finite lifetime', (t) => {
  const h = harness(t);
  t.mock.timers.tick(120000);
  assert.deepEqual(h.errors, ['time-limit']);
  assert.deepEqual(h.finished, []);
});

const sourceLines = [{index: 0, candidateIds: [42, 43]}];
const validAI = {index: 0, productId: 42, quantity: 2, unit: 'packet', price: null, needsClarification: false};
test('AI accepts only existing shortlisted IDs', () => {
  assert.equal(validateVoiceAIResult({lines: [validAI]}, sourceLines).lines[0].productId, 42);
  assert.throws(() => validateVoiceAIResult({lines: [{...validAI, productId: 999}]}, sourceLines));
});
test('AI cannot omit, duplicate or invent order lines', () => {
  assert.throws(() => validateVoiceAIResult({lines: []}, sourceLines));
  assert.throws(() => validateVoiceAIResult({lines: [validAI, validAI]}, sourceLines));
  assert.throws(() => validateVoiceAIResult({lines: [{...validAI, index: 2}]}, sourceLines));
});
test('AI rejects invalid quantities and accepts explicit uncertainty', () => {
  for (const quantity of [-1, Infinity, '2']) {
    assert.throws(() => validateVoiceAIResult({lines: [{...validAI, quantity}]}, sourceLines));
  }
  assert.equal(validateVoiceAIResult({lines: [{...validAI, productId: null, needsClarification: true}]}, sourceLines).lines[0].productId, null);
});
test('AI cannot silently change a parsed quantity or unit', () => {
  const source = [{...sourceLines[0], quantity: 2, requestedUnit: 'packet'}];
  assert.throws(() => validateVoiceAIResult({lines: [{...validAI, quantity: 3}]}, source));
  assert.throws(() => validateVoiceAIResult({lines: [{...validAI, unit: 'kg'}]}, source));
  assert.equal(validateVoiceAIResult({lines: [{...validAI, quantity: 0, needsClarification: true}]}, source).lines[0].quantity, 0);
});
