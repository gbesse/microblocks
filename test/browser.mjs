import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { createDemoServer } from '../bin/serve.js';
import { message } from '../src/i18n.js';
const server = createDemoServer();
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const browser = await chromium.launch({ headless: true }),
  origin = 'http://127.0.0.1:' + server.address().port;
const output = new URL('../output/', import.meta.url);
await mkdir(output, { recursive: true });
try {
  for (const locale of ['fr', 'en', 'es']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } }),
      errors = [],
      requests = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (r) => requests.push(r.url()));
    await page.goto(origin + '/?lang=' + locale);
    await page.waitForSelector('body[data-ready="true"]');
    assert.equal(await page.locator('html').getAttribute('lang'), locale);
    assert.equal(await page.locator('h1').textContent(), message('title', locale));
    assert.equal(await page.locator('#notice').textContent(), message('notice', locale));
    let raw = await page.locator('#report').textContent();
    const current = () => JSON.parse(raw);
    const submit = async () => {
      await page.locator('#form button[type=submit]').click();
      raw = await page.locator('#report').textContent();
    };
    const initial = current();
    assert.equal(initial.locale, locale);
    assert.ok(await page.locator('#chart svg').count());
    await page.locator('#control-samples').fill('6');
    await submit();
    assert.equal(current().status, 'inconclusive');
    await page.locator('#reset').click();
    await page
      .locator('summary')
      .filter({ hasText: message('inputData', locale) })
      .evaluate((el) => (el.parentElement.open = true));
    await page.locator('#input').fill('{broken');
    await page.locator('#apply').click();
    assert.equal(await page.locator('#status').textContent(), message('invalidJson', locale));
    assert.deepEqual(JSON.parse(await page.locator('#report').textContent()), initial);
    await page
      .locator('#upload')
      .setInputFiles(new URL('../fixtures/demo.json', import.meta.url).pathname);
    await page.waitForFunction(
      () => JSON.parse(document.getElementById('report').textContent).origin === 'user',
    );
    assert.equal(await page.locator('#notice').textContent(), message('userNotice', locale));
    assert.equal(await page.locator('#fields input').count(), 0);
    const input = await page.locator('#input').inputValue();
    await page.locator('#locale').selectOption(locale === 'fr' ? 'es' : 'fr');
    await page.locator('#locale').selectOption(locale);
    assert.equal(await page.locator('#input').inputValue(), input);
    const exported = page.waitForEvent('download');
    await page.locator('#download').click();
    const download = await exported;
    assert.equal(JSON.parse(await readFile(await download.path(), 'utf8')).locale, locale);
    const svgExport = page.waitForEvent('download');
    await page.locator('#download-svg').click();
    assert.match(await readFile(await (await svgExport).path(), 'utf8'), /<svg/);
    await page.locator('#reset').click();
    await page
      .locator('summary')
      .filter({ hasText: message('inputData', locale) })
      .evaluate((el) => (el.parentElement.open = false));
    await page.screenshot({
      path: new URL('microblocks-' + locale + '.png', output).pathname,
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.locator('body').evaluate((el) => el.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    assert.ok(requests.every((url) => new URL(url).origin === origin));
    await page.close();
  }
  for (const path of ['/bin/cli.js', '/.env', '/public/../bin/cli.js'])
    assert.equal((await fetch(origin + path)).status, 404);
  console.log(
    'FR : parcours FR/EN/ES vérifiés. EN: FR/EN/ES flows verified. ES: flujos FR/EN/ES verificados.',
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
