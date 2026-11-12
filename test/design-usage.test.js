import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { designUsageLedger } from '../src/design-digests.js';
const file = 'fixtures/contact.scad',
  sha = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
test('same fixture referenced by two blocks is verified once per use', async () => {
  const x = await designUsageLedger(
    [
      { id: 'a', design: { file, sha256: sha } },
      { id: 'b', design: { file, sha256: sha } },
    ],
    process.cwd(),
  );
  assert.equal(x.files.length, 1);
  assert.equal(x.files[0].blockIds.length, 2);
  assert.equal(x.allReferencesVerified, true);
  assert.equal(x.geometryValidated, false);
});
test('same file with incompatible pinned digests exposes contradiction', async () => {
  const x = await designUsageLedger(
    [
      { id: 'a', design: { file, sha256: sha } },
      { id: 'b', design: { file, sha256: '0'.repeat(64) } },
    ],
    process.cwd(),
  );
  assert.equal(x.files[0].conflictingReferences, true);
  assert.equal(x.allReferencesVerified, false);
});
