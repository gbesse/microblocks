export { designFor } from './designs.js';
import {
  begin,
  check,
  object,
  id,
  list,
  finite,
  nonnegative,
  indexed,
  references,
  graph,
  canonical,
  iso,
  numericRange,
  report,
  row,
  finding,
} from './common.js';

const quantities = (v, locale) => {
  check(object(v), locale);
  for (const q of Object.values(v)) check(object(q) && finite(q.value) && id(q.unit), locale);
};
function envelope(v, locale) {
  check(object(v), locale);
  for (const r of Object.values(v)) {
    numericRange(r, locale);
    check(id(r.unit), locale);
  }
}
function inside(values, ranges) {
  return (
    Object.keys(values).length === Object.keys(ranges).length &&
    Object.entries(ranges).every(
      ([k, r]) =>
        Object.hasOwn(values, k) &&
        values[k].unit === r.unit &&
        values[k].value >= r.min &&
        values[k].value <= r.max,
    )
  );
}
export function basisFor(block, recipeId, { locale = 'fr' } = {}) {
  check(object(block) && list(block.recipes), locale);
  const recipe = block.recipes.find((r) => r.id === recipeId);
  check(!!recipe, locale, 'reference');
  return structuredClone({
    id: block.id,
    version: block.version,
    function: block.function,
    interfaces: block.interfaces,
    requires: block.requires,
    metrics: block.metrics,
    design: block.design,
    recipe,
  });
}

export function analyze(input, { locale = 'fr' } = {}) {
  begin(input, locale);
  check(iso(input.asOf) && object(input.query), locale);
  const blocks = indexed(input.blocks, locale);
  check(blocks.size > 0 && blocks.size <= 100, locale);
  const q = input.query;
  check(
    blocks.has(q.blockId) &&
      id(q.profileId) &&
      id(q.version) &&
      Number.isInteger(q.minimumSamples) &&
      q.minimumSamples >= 1 &&
      q.minimumSamples <= 10000,
    locale,
  );
  quantities(q.parameters, locale);
  quantities(q.conditions, locale);
  const findings = [],
    catalog = [];
  let dependencyProblem = false;
  for (const b of blocks.values()) {
    check(/^\d+\.\d+\.\d+$/.test(b.version) && id(b.function) && list(b.requires), locale);
    check(
      object(b.design) &&
        ['scad', 'step'].includes(b.design.format) &&
        b.design.units === 'mm' &&
        typeof b.design.illustrative === 'boolean' &&
        /^fixtures\/[A-Za-z0-9_.-]+\.(?:scad|step)$/.test(b.design.file) &&
        /^[a-f0-9]{64}$/.test(b.design.sha256),
      locale,
    );
    const deps = new Set();
    for (const d of b.requires) {
      check(
        object(d) && blocks.has(d.blockId) && id(d.version) && !deps.has(d.blockId),
        locale,
        'reference',
      );
      deps.add(d.blockId);
    }
    const interfaces = indexed(b.interfaces, locale),
      recipes = indexed(b.recipes, locale),
      evidence = indexed(b.evidence, locale);
    check(
      interfaces.size > 0 && recipes.size > 0 && recipes.size <= 100 && evidence.size <= 500,
      locale,
    );
    for (const i of interfaces.values())
      check(
        ['mechanical', 'electrical', 'fluidic', 'thermal', 'optical'].includes(i.domain) &&
          id(i.unit),
        locale,
      );
    envelope(b.metrics, locale);
    check(Object.keys(b.metrics).length > 0, locale);
    for (const r of recipes.values()) {
      check(id(r.profileId), locale);
      envelope(r.parameters, locale);
      envelope(r.conditions, locale);
    }
    for (const e of evidence.values()) {
      check(
        recipes.has(e.recipeId) &&
          id(e.version) &&
          iso(e.measuredAt) &&
          iso(e.validUntil) &&
          Date.parse(e.measuredAt) <= Date.parse(e.validUntil) &&
          Number.isInteger(e.samples) &&
          e.samples > 0 &&
          ['synthetic', 'user'].includes(e.origin),
        locale,
      );
      quantities(e.parameters, locale);
      quantities(e.conditions, locale);
      check(
        object(e.basis) &&
          object(e.metrics) &&
          object(e.provenance) &&
          [e.provenance.protocolId, e.provenance.instrument, e.provenance.calibrationId].every(id),
        locale,
      );
      for (const m of Object.values(e.metrics))
        check(object(m) && finite(m.value) && nonnegative(m.uncertainty95) && id(m.unit), locale);
    }
    catalog.push({
      id: b.id,
      version: b.version,
      function: b.function,
      design: structuredClone(b.design),
      interfaces: structuredClone(b.interfaces),
      recipes: recipes.size,
      evidence: evidence.size,
    });
  }
  const g = graph(
    [...blocks.values()].map((b) => ({ id: b.id, dependsOn: b.requires.map((d) => d.blockId) })),
    locale,
  );
  const needed = new Set(),
    stack = [q.blockId];
  while (stack.length) {
    const k = stack.pop();
    if (needed.has(k)) continue;
    needed.add(k);
    for (const d of blocks.get(k).requires) {
      stack.push(d.blockId);
      if (blocks.get(d.blockId).version !== d.version) {
        dependencyProblem = true;
        findings.push(
          finding('dependencyVersion', locale, {
            id: k,
            dependency: d.blockId,
            version: d.version,
          }),
        );
      }
    }
  }
  const block = blocks.get(q.blockId),
    rows = [],
    matches = [];
  for (const r of block.recipes)
    if (r.profileId === q.profileId) {
      const scopeFits =
        q.version === block.version &&
        inside(q.parameters, r.parameters) &&
        inside(q.conditions, r.conditions);
      const evidence = block.evidence.filter(
        (e) =>
          e.recipeId === r.id &&
          e.version === q.version &&
          canonical(e.basis) === canonical(basisFor(block, r.id)) &&
          Date.parse(e.measuredAt) <= Date.parse(input.asOf) &&
          Date.parse(e.validUntil) >= Date.parse(input.asOf) &&
          canonical(e.parameters) === canonical(q.parameters) &&
          canonical(e.conditions) === canonical(q.conditions),
      );
      const at = evidence.reduce((s, e) => Math.max(s, Date.parse(e.measuredAt)), -Infinity);
      const fresh = evidence.filter((e) => Date.parse(e.measuredAt) === at);
      const checks = [];
      let failed = false,
        incomplete = !scopeFits || dependencyProblem || !fresh.length;
      for (const e of fresh) {
        if (e.samples < q.minimumSamples || (input.origin === 'user' && e.origin === 'synthetic'))
          incomplete = true;
        for (const [metric, target] of Object.entries(block.metrics)) {
          const m = e.metrics[metric];
          let state;
          if (!m || m.unit !== target.unit) {
            state = 'unknown';
            incomplete = true;
          } else if (
            m.value + m.uncertainty95 < target.min ||
            m.value - m.uncertainty95 > target.max
          ) {
            state = 'failed';
            failed = true;
          } else if (
            m.value - m.uncertainty95 >= target.min &&
            m.value + m.uncertainty95 <= target.max
          )
            state = 'qualified';
          else {
            state = 'unknown';
            incomplete = true;
          }
          checks.push({ evidenceId: e.id, metric, state, observed: m ?? null, target });
        }
      }
      const state =
        !scopeFits || dependencyProblem
          ? 'incomplete'
          : failed
            ? 'failed'
            : incomplete
              ? 'incomplete'
              : 'qualified';
      matches.push({ id: r.id, state, scopeFits, evidence: fresh.map((e) => e.id), checks });
      rows.push(
        row(
          r.id,
          state,
          state === 'qualified'
            ? 'scopeCovered'
            : state === 'failed'
              ? 'metricFailed'
              : 'scopeIncomplete',
          locale,
          { count: fresh.length },
          fresh.reduce((s, e) => s + e.samples, 0),
        ),
      );
    }
  if (!matches.length) {
    rows.push(row(q.blockId, 'incomplete', 'profileMissing', locale, { id: q.profileId }));
    findings.push(finding('profileMissing', locale, { id: q.profileId }));
  }
  const status = matches.some((r) => r.state === 'qualified')
    ? 'pass'
    : matches.length && matches.every((r) => r.state === 'failed')
      ? 'fail'
      : 'inconclusive';
  return report('MicroBlocks', input, locale, status, rows, findings, {
    query: structuredClone(q),
    catalog,
    matches,
    dependencies: [...needed].sort(),
  });
}
