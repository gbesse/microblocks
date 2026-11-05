import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { auditDesignDigests } from '../src/design-digests.js';
test('read actual design bytes and preserve mismatches', async () => {
  const root = await mkdtemp(join(tmpdir(), 'blocks-'));
  try {
    await mkdir(join(root, 'fixtures'));
    await writeFile(join(root, 'fixtures/a.scad'), 'cube(1);');
    const hash = createHash('sha256').update('cube(1);').digest('hex');
    const x = await auditDesignDigests(
      [
        { id: 'ok', design: { file: 'fixtures/a.scad', sha256: hash } },
        { id: 'bad', design: { file: 'fixtures/a.scad', sha256: '0'.repeat(64) } },
        { id: 'missing', design: { file: 'fixtures/missing.scad', sha256: hash } },
      ],
      root,
    );
    assert.deepEqual(
      x.map((x) => x.status),
      ['verified', 'mismatch', 'missing'],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
