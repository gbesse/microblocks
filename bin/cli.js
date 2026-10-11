#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { analyze } from '../src/index.js';
import { message } from '../src/i18n.js';
const flags = Object.create(null),
  positional = [];
let invalid = false;
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith('--') && arg.includes('=')) {
    const i = arg.indexOf('=');
    const key = arg.slice(2, i);
    if (Object.hasOwn(flags, key)) invalid = true;
    flags[key] = arg.slice(i + 1);
  } else if (arg.startsWith('--')) invalid = true;
  else positional.push(arg);
}
const locale = flags.locale ?? 'fr';
try {
  message('invalidInput', locale);
  if (invalid || Object.keys(flags).some((k) => !['locale', 'output'].includes(k)))
    throw Error(message('failure', locale));
  const [command, file] = positional;
  if (!command || command === 'help') {
    if (positional.length > 1) throw Error(message('failure', locale));
    console.log(message('cliUsage', locale, { name: 'microblocks' }));
    console.log(message('checkUsage', locale));
  } else {
    if (
      !['demo', 'run', 'check'].includes(command) ||
      positional.length !== (command === 'demo' ? 1 : 2)
    )
      throw Error(message('failure', locale));
    const raw = await readFile(
      command === 'demo' ? new URL('../fixtures/demo.json', import.meta.url) : file,
    );
    if (raw.length > 5000000) throw Error(message('invalidInput', locale));
    const report = analyze(JSON.parse(raw.toString('utf8')), { locale });
    report.evidence = [
      { role: 'input', sha256: createHash('sha256').update(raw).digest('hex'), bytes: raw.length },
    ];
    const text = JSON.stringify(report, null, 2) + '\n';
    if (flags.output) await writeFile(flags.output, text, { flag: 'wx', mode: 0o600 });
    else process.stdout.write(text);
    if (command === 'check')
      process.exitCode = report.status === 'pass' ? 0 : report.status === 'fail' ? 1 : 3;
  }
} catch (e) {
  const lang = ['fr', 'en', 'es'].includes(locale) ? locale : 'fr';
  console.error(
    e.code === 'EEXIST'
      ? message('noOverwrite', lang)
      : e instanceof SyntaxError
        ? message('invalidJson', lang)
        : e.code
          ? message('failure', lang)
          : e.message,
  );
  process.exitCode = 2;
}
