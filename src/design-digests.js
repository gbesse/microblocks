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
