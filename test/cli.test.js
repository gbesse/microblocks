import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { message } from '../src/i18n.js';
const cli = new URL('../bin/cli.js', import.meta.url).pathname;
const run = (args) =>
  spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 10000 });
test('CLI emits localized, replayable reports and input-byte hashes', () => {
  for (const locale of ['fr', 'en', 'es']) {
    const result = run(['demo', '--locale=' + locale]);
    assert.equal(result.status, 0, result.stderr);
    const r = JSON.parse(result.stdout);
    assert.equal(r.locale, locale);
    assert.equal(r.origin, 'synthetic');
    const raw = readFileSync(new URL('../fixtures/demo.json', import.meta.url));
    assert.equal(r.evidence[0].sha256, createHash('sha256').update(raw).digest('hex'));
  }
});
test('CI gate returns the documented decision code', () => {
  const demo = JSON.parse(run(['demo']).stdout);
  const r = run(['check', new URL('../fixtures/demo.json', import.meta.url).pathname]);
  assert.equal(r.status, demo.status === 'pass' ? 0 : demo.status === 'fail' ? 1 : 3);
});
test('CLI exclusive exports preserve existing files and protect permissions', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fab-tool-cli-'));
  try {
    const file = join(dir, 'report.json');
    const r = run(['demo', '--locale=es', '--output=' + file]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(statSync(file).mode & 0o777, 0o600);
    const before = readFileSync(file, 'utf8');
    assert.equal(run(['demo', '--output=' + file]).status, 2);
    assert.equal(readFileSync(file, 'utf8'), before);
    const bad = join(dir, 'bad.json');
    writeFileSync(bad, '{broken');
    const invalid = run(['run', bad, '--locale=en']);
    assert.equal(invalid.status, 2);
    assert.match(
      invalid.stderr,
      new RegExp(message('invalidJson', 'en').replace(/[.*+?^$()|[\]\\]/g, '\\$&')),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test('malformed, duplicate and unsupported flags are rejected', () => {
  for (const args of [
    ['demo', '--locale=de'],
    ['demo', '--locale=fr', '--locale=en'],
    ['demo', '--missing=true'],
    ['run'],
    ['demo', 'unexpected'],
    ['demo', '--__proto__=x'],
  ])
    assert.equal(run(args).status, 2, JSON.stringify(args));
});
