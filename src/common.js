import { message } from './i18n.js';
export const object = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
export const finite = (v) => typeof v === 'number' && Number.isFinite(v);
export const positive = (v) => finite(v) && v > 0;
export const nonnegative = (v) => finite(v) && v >= 0;
export const id = (v) => typeof v === 'string' && v.length > 0 && v.length <= 128;
export const list = (v) => Array.isArray(v) && v.length <= 2000;
export const check = (condition, locale = 'fr', key = 'invalidInput') => {
  if (!condition) throw Error(message(key, locale));
};
export const canonical = (v) => JSON.stringify(normalize(v));
function normalize(v) {
  if (Array.isArray(v)) return v.map(normalize);
  if (object(v))
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, normalize(v[k])]),
    );
  return v;
}
export function begin(input, locale) {
  message('invalidInput', locale);
  let count = 0;
  function visit(v, depth) {
    check(depth <= 32 && ++count <= 100000, locale);
    if (object(v)) {
      check(
        Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null,
        locale,
      );
      for (const x of Object.values(v)) visit(x, depth + 1);
    } else if (Array.isArray(v)) {
      check(v.length <= 10000, locale);
      for (const x of v) visit(x, depth + 1);
    } else
      check(v === null || typeof v === 'string' || typeof v === 'boolean' || finite(v), locale);
  }
  visit(input, 0);
  check(
    object(input) && input.schemaVersion === 1 && ['synthetic', 'user'].includes(input.origin),
    locale,
  );
}
export function indexed(items, locale) {
  check(list(items), locale);
  const map = new Map();
  for (const item of items) {
    check(object(item) && id(item.id) && !map.has(item.id), locale, 'reference');
    map.set(item.id, item);
  }
  return map;
}
export function references(refs, map, locale) {
  check(
    list(refs) && new Set(refs).size === refs.length && refs.every((k) => id(k) && map.has(k)),
    locale,
    'reference',
  );
}
export function graph(nodes, locale) {
  const map = indexed(nodes, locale),
    degree = new Map(),
    children = new Map(nodes.map((n) => [n.id, []]));
  for (const n of nodes) {
    references(n.dependsOn, map, locale);
    degree.set(n.id, n.dependsOn.length);
    for (const parent of n.dependsOn) children.get(parent).push(n.id);
  }
  const queue = nodes.filter((n) => !degree.get(n.id)).map((n) => n.id),
    order = [];
  for (let i = 0; i < queue.length; i++) {
    const k = queue[i];
    order.push(k);
    for (const child of children.get(k)) {
      degree.set(child, degree.get(child) - 1);
      if (!degree.get(child)) queue.push(child);
    }
  }
  check(order.length === nodes.length, locale, 'cycle');
  return { map, children, order };
}
export function ancestors(refs, map) {
  const found = new Set(),
    stack = [...refs];
  while (stack.length) {
    const k = stack.pop();
    if (found.has(k)) continue;
    found.add(k);
    stack.push(...map.get(k).dependsOn);
  }
  return [...found].sort();
}
export function pathTo(from, targets, children) {
  const queue = [[from]],
    seen = new Set([from]);
  for (let i = 0; i < queue.length; i++) {
    const path = queue[i],
      last = path.at(-1);
    if (targets.has(last)) return path;
    for (const child of children.get(last) ?? [])
      if (!seen.has(child)) {
        seen.add(child);
        queue.push([...path, child]);
      }
  }
  return null;
}
export function report(tool, input, locale, status, rows, findings = [], extra = {}) {
  return structuredClone({
    tool,
    schemaVersion: 1,
    locale,
    origin: input.origin,
    status,
    notice: message(input.origin === 'synthetic' ? 'notice' : 'userNotice', locale),
    summary: message('summary', locale, { count: rows.length, status: message(status, locale) }),
    rows,
    findings,
    ...extra,
  });
}
export function row(id, state, key, locale, values = {}, value = 0) {
  return { id, state, detail: message(key, locale, values), value };
}
export function finding(code, locale, values = {}) {
  return { code, message: message(code, locale, values) };
}
export function iso(v) {
  return (
    typeof v === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(v) &&
    Number.isFinite(Date.parse(v)) &&
    new Date(v).toISOString().replace('.000Z', 'Z') === v.replace('.000Z', 'Z')
  );
}
export function numericRange(v, locale) {
  check(object(v) && finite(v.min) && finite(v.max) && v.min <= v.max, locale);
}
