import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyze } from '../src/index.js';
import { translations, message } from '../src/i18n.js';
const fixture = () => JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
test('all copy and placeholders ship in FR/EN/ES', () => {
  for (const [key, row] of Object.entries(translations)) {
    assert.equal(row.length, 3, key);
    assert.ok(
      row.every((v) => typeof v === 'string' && v.length),
      key,
    );
    const parameters = row.map((s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort());
    assert.deepEqual(parameters[0], parameters[1], key);
    assert.deepEqual(parameters[0], parameters[2], key);
  }
  for (const locale of ['fr', 'en', 'es']) {
    const r = analyze(fixture(), { locale });
    assert.equal(r.locale, locale);
    assert.equal(r.notice, message('notice', locale));
    assert.ok(r.rows.every((row) => !row.detail.includes('{')));
  }
  assert.throws(() => analyze(fixture(), { locale: 'de' }));
});
test('bad envelopes and non-finite values are rejected', () => {
  for (const mutate of [
    (x) => (x.schemaVersion = 2),
    (x) => (x.origin = 'unverified'),
    (x) => (x.extra = Infinity),
    (x) => (x.extra = Array(10001).fill(1)),
  ]) {
    const x = fixture();
    mutate(x);
    assert.throws(() => analyze(x));
  }
});
test('source input remains unchanged and reports are repeatable', () => {
  const x = fixture(),
    before = JSON.stringify(x);
  assert.deepEqual(analyze(x), analyze(x));
  assert.equal(JSON.stringify(x), before);
});
