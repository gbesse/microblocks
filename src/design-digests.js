import { readFile, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
export async function auditDesignDigests(blocks, root) {
  const fail = () => {
    throw new TypeError(
      'FR: Référence de design invalide. / EN: Invalid design reference. / ES: Referencia de diseño inválida.',
    );
  };
  if (!Array.isArray(blocks) || blocks.length > 100) fail();
  const base = await realpath(root),
    out = [];
  for (const b of blocks) {
    const d = b?.design;
    if (
      !d ||
      !/^fixtures\/[A-Za-z0-9_.-]+\.(?:scad|step)$/.test(d.file) ||
      !/^[a-f0-9]{64}$/.test(d.sha256)
    )
      fail();
    let actual;
    try {
      actual = await realpath(resolve(base, d.file));
    } catch (e) {
      if (e.code === 'ENOENT') {
        out.push({ id: b.id, file: d.file, status: 'missing' });
        continue;
      }
      throw e;
    }
    const rel = relative(base, actual);
    if (rel.startsWith('..') || isAbsolute(rel)) fail();
    const bytes = await readFile(actual);
    if (bytes.length > 10000000) fail();
    const hash = createHash('sha256').update(bytes).digest('hex');
    out.push({
      id: b.id,
      file: d.file,
      status: hash === d.sha256 ? 'verified' : 'mismatch',
      sha256: hash,
      bytes: bytes.length,
    });
  }
  return out;
}

export async function designUsageLedger(blocks, root) {
  const fail = () => {
    throw new TypeError(
      'Usages de design invalides / Invalid design uses / Usos de diseño inválidos',
    );
  };
  if (
    !Array.isArray(blocks) ||
    !blocks.length ||
    blocks.length > 100 ||
    new Set(blocks.map((b) => b.id)).size !== blocks.length ||
    blocks.some((b) => typeof b.id !== 'string' || !b.id)
  )
    fail();
  const audits = await auditDesignDigests(blocks, root),
    files = new Map();
  for (const b of blocks) {
    const file = b.design.file;
    if (!files.has(file)) files.set(file, { file, blockIds: [], expectedDigests: new Set() });
    files.get(file).blockIds.push(b.id);
    files.get(file).expectedDigests.add(b.design.sha256);
  }
  const uses = [...files.values()].map(({ expectedDigests, ...r }) => ({
    ...r,
    expectedDigests: [...expectedDigests],
    conflictingReferences: expectedDigests.size > 1,
  }));
  return {
    audits,
    files: uses,
    allReferencesVerified:
      audits.every((a) => a.status === 'verified') && uses.every((u) => !u.conflictingReferences),
    geometryValidated: false,
  };
}
