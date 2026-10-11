import { message } from '../src/i18n.js';
export const $ = (id) => document.getElementById(id);
export const element = (tag, text, cls) => {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
};
export function format(value, locale = 'fr', digits = 2) {
  return value === null || !Number.isFinite(value)
    ? '—'
    : new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
}
export const colors = ['#b8edcd', '#f0c477', '#8cbeef', '#e7a9d2'];
export function table(headers, rows) {
  const t = element('table'),
    head = element('thead'),
    hr = element('tr');
  for (const h of headers) hr.append(element('th', h));
  head.append(hr);
  t.append(head);
  const body = element('tbody');
  for (const row of rows) {
    const tr = element('tr');
    for (const cell of row) tr.append(element('td', String(cell)));
    body.append(tr);
  }
  t.append(body);
  return t;
}
export function metric(label, value) {
  const e = element('div', undefined, 'metric');
  e.append(element('strong', value), element('span', label));
  return e;
}
export function download(value, filename, type) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const a = element('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const ns = 'http://www.w3.org/2000/svg';
function svgElement(tag, attrs, text) {
  const e = document.createElementNS(ns, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  return e;
}
export function chart(
  series,
  { xLabel, yLabel, locale = 'fr', scatter = false, logX = false } = {},
) {
  const all = series.flatMap((s) => s.points);
  const svg = svgElement('svg', {
    xmlns: ns,
    viewBox: '0 0 840 370',
    role: 'img',
    'aria-label': yLabel + ' / ' + xLabel,
  });
  svg.append(svgElement('rect', { width: 840, height: 370, fill: '#111918' }));
  if (!all.length) return svg;
  const transform = (x) => (logX ? Math.log10(1 + x) : x);
  const xmin = Math.min(0, ...all.map((p) => transform(p.x))),
    xmax = Math.max(...all.map((p) => transform(p.x))),
    ymin = Math.min(0, ...all.map((p) => p.y)),
    ymax = Math.max(0.000001, ...all.map((p) => p.y));
  const px = (x) => 70 + ((transform(x) - xmin) / Math.max(0.000001, xmax - xmin)) * 735,
    py = (y) => 300 - ((y - ymin) / Math.max(0.000001, ymax - ymin)) * 270;
  for (let i = 0; i <= 4; i++) {
    const yf = ymin + ((ymax - ymin) * i) / 4,
      xf = xmin + ((xmax - xmin) * i) / 4;
    const yy = py(yf),
      xx = 70 + (735 * i) / 4;
    svg.append(
      svgElement('line', { x1: 70, x2: 805, y1: yy, y2: yy, stroke: '#34413c' }),
      svgElement(
        'text',
        { x: 62, y: yy + 5, 'text-anchor': 'end', fill: '#a8bab1', 'font-size': 12 },
        format(yf, locale),
      ),
      svgElement(
        'text',
        { x: xx, y: 325, 'text-anchor': 'middle', fill: '#a8bab1', 'font-size': 12 },
        format(logX ? 10 ** xf - 1 : xf, locale),
      ),
    );
  }
  series.forEach((s, i) => {
    const color = colors[i % colors.length];
    if (!scatter)
      svg.append(
        svgElement('polyline', {
          points: s.points.map((p) => px(p.x) + ',' + py(p.y)).join(' '),
          fill: 'none',
          stroke: color,
          'stroke-width': 2,
        }),
      );
    else
      for (const p of s.points)
        svg.append(svgElement('circle', { cx: px(p.x), cy: py(p.y), r: 4, fill: color }));
  });
  svg.append(
    svgElement(
      'text',
      { x: 430, y: 355, 'text-anchor': 'middle', fill: '#edf3ed', 'font-size': 13 },
      xLabel,
    ),
    svgElement('text', { x: 70, y: 18, fill: '#edf3ed', 'font-size': 13 }, yLabel),
  );
  return svg;
}
export function legend(series) {
  $('legend').replaceChildren(
    ...series.map((s, i) => {
      const e = element('span', s.label);
      e.style.setProperty('--series', colors[i % colors.length]);
      return e;
    }),
  );
}
export async function mount({ name, analyze, fields, view, extra }) {
  let locale = new URL(location.href).searchParams.get('lang') ?? 'fr';
  if (!['fr', 'en', 'es'].includes(locale)) locale = 'fr';
  $('locale').value = locale;
  const fixture = await (await fetch(new URL('../fixtures/demo.json', import.meta.url))).json();
  let input = structuredClone(fixture),
    report;
  const m = (key, values) => message(key, locale, values);
  const controlNodes = new Map();
  const drawFields = () => {
    controlNodes.clear();
    $('fields').replaceChildren();
    for (const f of input.origin === 'synthetic' ? fields : []) {
      const label = element('label'),
        caption = element('span', m(f.label)),
        control = element('input');
      control.id = 'control-' + f.key;
      control.type = f.type ?? 'number';
      if (control.type === 'checkbox') control.checked = f.get(input);
      else {
        control.value = f.get(input);
        for (const k of ['min', 'max', 'step']) if (f[k] !== undefined) control[k] = f[k];
      }
      label.append(caption, control);
      $('fields').append(label);
      control.step = f.step === undefined ? 'any' : String(f.step);
      controlNodes.set(f.key, control);
    }
  };
  const render = () => {
    document.documentElement.lang = locale;
    document.title = name + ' · ' + m('title');
    for (const e of document.querySelectorAll('[data-key]')) e.textContent = m(e.dataset.key);
    report = analyze(input, { locale });
    $('notice').textContent = report.notice;
    $('summary').textContent = report.summary;
    $('metrics').replaceChildren();
    $('chart').replaceChildren();
    $('table').replaceChildren();
    $('legend').replaceChildren();
    view({ input, report, locale, m });
    $('findings').replaceChildren(...report.findings.map((f) => element('li', f.message)));
    $('report').textContent = JSON.stringify(report, null, 2);
    $('input').value = JSON.stringify(input, null, 2);
    $('status').textContent = m('ready');
    $('status').className = '';
    document.body.dataset.ready = 'true';
  };
  const fail = (e) => {
    $('status').textContent = e.message || m('invalidInput');
    $('status').className = 'error';
  };
  const replace = (next) => {
    const candidate = structuredClone(next);
    candidate.origin = 'user';
    analyze(candidate, { locale });
    input = candidate;
    drawFields();
    render();
  };
  $('form').addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const next = structuredClone(input);
      for (const f of fields) {
        const control = controlNodes.get(f.key);
        if (!control) continue;
        f.set(next, control.type === 'checkbox' ? control.checked : Number(control.value));
      }
      analyze(next, { locale });
      input = next;
      render();
    } catch (e) {
      fail(e);
    }
  });
  $('locale').addEventListener('change', () => {
    locale = $('locale').value;
    const url = new URL(location.href);
    url.searchParams.set('lang', locale);
    history.replaceState(null, '', url);
    drawFields();
    render();
    extra?.({ input, m, replace, locale });
  });
  $('reset').addEventListener('click', () => {
    input = structuredClone(fixture);
    drawFields();
    render();
    extra?.({ input, m, replace, locale });
  });
  $('apply').addEventListener('click', () => {
    try {
      let value;
      try {
        value = JSON.parse($('input').value);
      } catch {
        throw Error(m('invalidJson'));
      }
      replace(value);
      extra?.({ input, m, replace, locale });
    } catch (e) {
      fail(e);
    }
  });
  $('upload').addEventListener('change', async () => {
    try {
      const file = $('upload').files[0];
      if (!file) return;
      if (file.size > 5000000) throw Error(m('invalidInput'));
      let value;
      try {
        value = JSON.parse(await file.text());
      } catch {
        throw Error(m('invalidJson'));
      }
      replace(value);
      extra?.({ input, m, replace, locale });
    } catch (e) {
      fail(e);
    }
  });
  $('download').addEventListener('click', () =>
    download(
      JSON.stringify(report, null, 2),
      name.toLowerCase() + '-' + locale + '.json',
      'application/json',
    ),
  );
  $('download-svg').addEventListener('click', () => {
    const svg = $('chart').querySelector('svg');
    if (svg)
      download(
        new XMLSerializer().serializeToString(svg),
        name.toLowerCase() + '-' + locale + '.svg',
        'image/svg+xml',
      );
  });
  const uploadButton = element('button', m('selectFile'), 'secondary');
  uploadButton.type = 'button';
  uploadButton.dataset.key = 'selectFile';
  uploadButton.addEventListener('click', () => $('upload').click());
  $('upload').hidden = true;
  $('upload').after(uploadButton);
  drawFields();
  render();
  extra?.({ input, m, replace, locale });
}
