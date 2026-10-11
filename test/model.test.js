import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyze, designFor } from '../src/index.js';
const fixture = () => JSON.parse(readFileSync(new URL('../fixtures/demo.json', import.meta.url)));
test('catalog contains five documented functions and one exactly covered query', () => {
  const r = analyze(fixture());
  assert.equal(r.catalog.length, 5);
  assert.equal(r.status, 'pass');
  assert.equal(r.matches[0].checks[0].state, 'qualified');
});
test('insufficient sample count prevents qualification', () => {
  const x = fixture();
  x.query.minimumSamples = 6;
  assert.equal(analyze(x).status, 'inconclusive');
});
test('a changed parameter cannot borrow evidence from a nearby value', () => {
  const x = fixture();
  x.query.parameters.scale.value = 1.05;
  assert.equal(analyze(x).status, 'inconclusive');
});
test('out-of-envelope request, changed units or unknown profile remain incomplete', () => {
  for (const mutate of [
    (x) => (x.query.parameters.scale.value = 2),
    (x) => (x.query.conditions.temperature.unit = 'K'),
    (x) => (x.query.profileId = 'fab-missing'),
  ]) {
    const x = fixture();
    mutate(x);
    assert.equal(analyze(x).status, 'inconclusive');
  }
});
test('boundary-overlapping intervals are unknown; disjoint intervals fail', () => {
  const x = fixture();
  const m = x.blocks[0].evidence[0].metrics.stiffness;
  m.value = 18;
  m.uncertainty95 = 1;
  assert.equal(analyze(x).status, 'inconclusive');
  m.value = 10;
  assert.equal(analyze(x).status, 'fail');
});
test('expired evidence and version drift cannot qualify a query', () => {
  for (const mutate of [
    (x) => (x.blocks[0].evidence[0].validUntil = '2026-10-05T00:00:00Z'),
    (x) => (x.query.version = '1.1.0'),
  ]) {
    const x = fixture();
    mutate(x);
    assert.equal(analyze(x).status, 'inconclusive');
  }
});
test('synthetic records do not qualify an imported user dossier', () => {
  const x = fixture();
  x.origin = 'user';
  assert.equal(analyze(x).status, 'inconclusive');
  x.blocks[0].evidence[0].origin = 'user';
  assert.equal(analyze(x).status, 'pass');
});
test('dependency version drift is explicit and blocks coverage', () => {
  const x = fixture();
  x.blocks[0].requires = [{ blockId: 'contact', version: '2.0.0' }];
  const r = analyze(x);
  assert.equal(r.status, 'inconclusive');
  assert.equal(r.findings[0].code, 'dependencyVersion');
});
test('cyclic libraries, duplicate evidence and invalid uncertainties are rejected', () => {
  for (const mutate of [
    (x) => (x.blocks[0].requires = [{ blockId: 'flexure', version: '1.0.0' }]),
    (x) => x.blocks[0].evidence.push(x.blocks[0].evidence[0]),
    (x) => (x.blocks[0].evidence[0].metrics.stiffness.uncertainty95 = -1),
  ]) {
    const x = fixture();
    mutate(x);
    assert.throws(() => analyze(x));
  }
});
test('changing geometry identity, recipe or contract invalidates old evidence', () => {
  for (const mutate of [
    (x) => (x.blocks[0].design.sha256 = 'f'.repeat(64)),
    (x) => (x.blocks[0].recipes[0].parameters.scale.max = 1.3),
    (x) => (x.blocks[0].metrics.stiffness.max = 23),
  ]) {
    const x = fixture();
    mutate(x);
    assert.equal(analyze(x).status, 'inconclusive');
  }
});
test('illustrative designs export with bounded scale and reject arbitrary paths', () => {
  for (const b of fixture().blocks) {
    const scad = designFor(b.id, { scale: 1.1 });
    assert.match(scad, /scale\(\[1.1, 1.1, 1.1\]\)/);
    assert.match(scad, /unvalidated function/);
  }
  assert.throws(() => designFor('../unknown'));
  assert.throws(() => designFor('flexure', { scale: 0 }));
  assert.throws(() => designFor('flexure', { scale: Infinity }));
});
