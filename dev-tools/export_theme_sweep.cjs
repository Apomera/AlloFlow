// Reading-theme sweep for the downloaded HTML export (the export view's generateFullPackHTML).
// Builds full-pack exports from allopack fixtures plus a generated-source reading (headings and
// [⁽¹⁾](https://…) citations, as Analyze Source produces), then in Chromium clicks each theme
// button (Light, Dark, Sepia, High Contrast) and reports text below WCAG contrast, and any raw
// Markdown a reader would see. Exits 1 on an AA miss in any theme or a Markdown leak; High
// Contrast's 7:1 target is reported, not failed. Disabled controls are exempt; aria-hidden
// decoration is counted separately.
//
// WHY (2026-10-25): the shipped Dark theme was grey because a post-process rewrote its CSS, and
// "Original with supports" showed raw Markdown. Neither showed in the source; only the
// generated file, read in a real browser after a theme click, shows them.
//
// usage: node dev-tools/export_theme_sweep.cjs [--packs a,b | --packs all] [--module file] [--out dir]
//        node dev-tools/export_theme_sweep.cjs --selftest
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_PACKS = ['american_revolution_causes_grade5', 'academic_discourse_reading_space_grade6', 'area_perimeter_grade4',
  'argument_evidence_grade6', 'constitution_grade8', 'ecosystems_food_webs_grade5', 'reading_decisions_grade6'];
const THEMES = ['light', 'dark', 'sepia', 'hc'];
const MARKDOWN = {
  link: /\[[^\]\n]{1,80}\]\((?:https?:|mailto:|#|\/)[^)\s]*\)/,
  heading: /(^|\n)[ \t]*#{1,6}[ \t]+\S/,
  bold: /\*\*[^*\n]{1,80}\*\*/,
};

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

// ── Export generation (child process: jsdom globals stay out of the Playwright process) ──
function generate(outDir, moduleFile, packs) {
  const { JSDOM } = require(path.join(ROOT, 'node_modules/jsdom'));
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'https://example.test/', pretendToBeVisual: true });
  global.window = dom.window;
  for (const key of Object.getOwnPropertyNames(dom.window)) { if (!(key in global)) { try { global[key] = dom.window[key]; } catch (_) {} } }
  global.warnLog = () => {}; global.debugLog = () => {};
  const quiet = console.warn; console.warn = () => {};
  dom.window.AlloModules = {};
  const load = file => new Function(fs.readFileSync(file, 'utf8'))();
  load(path.join(ROOT, 'instructional_context_module.js'));
  try { load(path.join(ROOT, 'text_pipeline_helpers_module.js')); } catch (_) {}
  load(moduleFile);
  const contract = dom.window.AlloModules.InstructionalContext;
  const stub = async () => '{}';
  const pipeline = (state = {}) => dom.window.AlloModules.createDocPipeline({
    callGemini: stub, callGeminiVision: stub, callImagen: async () => null,
    addToast: () => {}, t: key => key, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Document',
    state: { leveledTextLanguage: 'English', currentUiLanguage: 'English', exportConfig: {}, ...state },
  });
  const source = '# Justice\n\n## What Does It Mean to Be Just?\n\nJustice is a big idea about being fair to all people. '
    + '[⁽¹⁾](https://en.wikipedia.org/wiki/Justice) **Justice is like this balance.** Being just means treating people '
    + 'in a way that is honest and reasonable. [⁽²⁾](https://www.law.cornell.edu/wex/justice)\n\n- Fair rules\n- Equal treatment\n';
  const generated = {
    id: 'adapt-generated', type: 'simplified', title: 'Adapted Text (5th Grade)', meta: 'Grade 5',
    data: '## Justice\n\nJustice means being **fair** to everyone. [⁽¹⁾](https://en.wikipedia.org/wiki/Justice)\n\n- Fair rules\n- Equal treatment',
    sourceSnapshot: contract.createSourceSnapshot(source, { sourceArtifactId: 'src-generated', language: 'English' }),
    sourceFamilyId: 'src-generated', instructionalText: { schemaVersion: 1, role: 'supplemental', form: 'adapted' },
  };
  const jobs = [{ name: 'generated-source', items: [generated], topic: 'Justice' }];
  for (const name of packs) {
    const file = path.join(ROOT, 'allopacks', name + '.allopack.json');
    if (!fs.existsSync(file)) { process.stderr.write('missing pack ' + name + '\n'); continue; }
    const pack = JSON.parse(fs.readFileSync(file, 'utf8'));
    jobs.push({ name, items: pack.history || [], topic: pack.sourceTopic || name });
  }
  const cfg = { includeOriginalReading: true, includeTeacherKey: false, includeSimplified: true, includeGlossary: true, includeQuiz: true,
    includeOutline: true, includeFaq: true, includeSentenceFrames: true, includeImage: true, includeMath: true, includeDbq: true,
    includeLessonPlan: true, includeMemoryAid: true, includeAppliedChallenge: true, includeConceptSort: true };
  fs.mkdirSync(outDir, { recursive: true });
  const manifest = [];
  for (const job of jobs) {
    for (const base of ['light', 'dark']) {
      try {
        const html = pipeline(base === 'dark' ? { exportTheme: 'dark' } : {}).generateFullPackHTML(job.items, job.topic, false, {}, cfg);
        const file = path.join(outDir, job.name + (base === 'dark' ? '.base-dark' : '') + '.html');
        fs.writeFileSync(file, html);
        manifest.push({ name: job.name, base, file });
      } catch (e) { process.stderr.write('export failed: ' + job.name + ' (' + base + '): ' + e.message + '\n'); }
    }
  }
  console.warn = quiet;
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1));
}

// ── In-page contrast measurement (runs in Chromium) ──
function measure(theme) {
  const root = document.documentElement;
  const button = document.querySelector('[data-rt-theme="' + theme + '"]');
  if (button) button.click(); // the page's own theme code, as a student switches
  else if (theme === 'light') root.removeAttribute('data-alloflow-theme');
  else root.setAttribute('data-alloflow-theme', theme);
  document.querySelectorAll('details').forEach(d => { d.open = true; });
  const parse = s => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (top, under) => { const a = top.a + under.a * (1 - top.a); if (!a) return { r: 0, g: 0, b: 0, a: 0 }; return { r: (top.r * top.a + under.r * under.a * (1 - top.a)) / a, g: (top.g * top.a + under.g * under.a * (1 - top.a)) / a, b: (top.b * top.a + under.b * under.a * (1 - top.a)) / a, a }; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const surface = el => {
    const layers = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n), c = parse(cs.backgroundColor);
      // A gradient or image under the text cannot be judged here (ruled answer lines excepted).
      if (cs.backgroundImage !== 'none' && !/1px, transparent 1px\)/.test(cs.backgroundImage) && (!c || c.a < 1)) return null;
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
    }
    let out = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) out = over(layers[i], out);
    return out;
  };
  const shown = el => { if (!el.getClientRects().length) return false; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const out = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (el.closest('svg, script, style, noscript, template')) continue;
    const own = [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
    const control = /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName) && (el.value || el.textContent || el.placeholder);
    if ((!own && !control) || el.closest(':disabled, [aria-disabled="true"]') || !shown(el)) continue;
    const cs = getComputedStyle(el), fg0 = parse(cs.color), bg = surface(el);
    if (!fg0 || !bg) continue;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) fg0.a *= +getComputedStyle(n).opacity;
    const r = ratio(over(fg0, bg), bg), size = parseFloat(cs.fontSize), large = size >= 24 || (+cs.fontWeight >= 700 && size >= 18.66);
    const aa = large ? 3 : 4.5, need = theme === 'hc' ? (large ? 4.5 : 7) : aa;
    if (r + 1e-6 >= need) continue;
    const section = el.closest('[data-alloflow-resource-id]');
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
    out.push({ theme, ratio: +r.toFixed(2), need, failsAA: r + 1e-6 < aa, decorative: !!el.closest('[aria-hidden="true"]'),
      fg: hex(over(fg0, bg)), bg: hex(bg), tag: el.tagName.toLowerCase() + (cls ? '.' + cls : ''),
      section: section ? section.getAttribute('data-alloflow-resource-id') : '', text: (own || el.value || el.placeholder || '').slice(0, 60) });
  }
  return out;
}

async function sweep(manifest) {
  const { chromium } = require(path.join(ROOT, 'node_modules/playwright'));
  const browser = await chromium.launch();
  const contrast = [], markdown = [];
  try {
    for (const entry of manifest) {
      const label = entry.name + (entry.base === 'dark' ? ' (dark base)' : '');
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
      await page.goto('file:///' + entry.file.split(path.sep).join('/'), { waitUntil: 'load' });
      // The "Who is working on this resource?" gate aria-hides the page until answered.
      const once = page.getByRole('button', { name: 'Use once without autosave' });
      if (await once.count()) { await once.first().click().catch(() => {}); await page.waitForTimeout(150); }
      // Settled colors only: a theme switch mid-transition reads as false greys.
      await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
      if (entry.base === 'light') {
        const texts = await page.evaluate(() => [...document.querySelectorAll('[data-alloflow-resource-id]')].map(w => ({ id: w.getAttribute('data-alloflow-resource-id'), text: w.innerText })));
        for (const s of texts) for (const [kind, re] of Object.entries(MARKDOWN)) {
          const m = s.text.match(re);
          if (m) { const at = s.text.indexOf(m[0]); markdown.push({ file: label, section: s.id, kind, snippet: s.text.slice(Math.max(0, at - 30), at + 70).replace(/\s+/g, ' ') }); }
        }
      }
      for (const theme of THEMES) for (const row of await page.evaluate(measure, theme)) contrast.push({ file: label, ...row });
      await page.close();
    }
  } finally { await browser.close(); }
  return { contrast, markdown };
}

function summarize({ contrast, markdown }) {
  const lines = [];
  const real = contrast.filter(r => !r.decorative), failing = real.filter(r => r.failsAA), aaaOnly = real.filter(r => !r.failsAA);
  const count = rows => THEMES.map(t => t + ' ' + rows.filter(r => r.theme === t).length).join(', ');
  lines.push('AA contrast misses (fail): ' + count(failing));
  lines.push('High Contrast 7:1 misses (report): ' + aaaOnly.length + ' | aria-hidden decoration (report): ' + (contrast.length - real.length));
  const groups = {};
  for (const r of failing.concat(aaaOnly)) { const k = [r.failsAA ? 'FAIL' : 'hc-7', r.theme, r.tag, r.fg + ' on ' + r.bg, r.ratio + ':1'].join(' | '); (groups[k] = groups[k] || { n: 0, ex: r }).n++; }
  Object.entries(groups).sort((a, b) => b[1].n - a[1].n).slice(0, 40).forEach(([k, g]) => lines.push(String(g.n).padStart(4) + ' ' + k + ' | ' + g.ex.file + ' ' + g.ex.section + ' | ' + JSON.stringify(g.ex.text.slice(0, 44))));
  lines.push('Raw Markdown visible: ' + markdown.length);
  markdown.forEach(m => lines.push('   ' + m.file + ' | ' + m.section + ' | ' + m.kind + ' | ' + JSON.stringify(m.snippet)));
  return { text: lines.join('\n'), failed: failing.length > 0 || markdown.length > 0 };
}

// ── Self-test: the detectors must fire on a known-bad page and stay quiet on a clean one ──
async function selftest(outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const page = (body, darkInk) => '<!doctype html><html><head><meta charset="utf-8"><style>body{background:#fff;color:#111}'
    + 'html[data-alloflow-theme="dark"] body{background:#0f172a;color:#fff}html[data-alloflow-theme="dark"] .section{background:#1e293b}</style></head>'
    + '<body><div data-alloflow-resource-id="r1"><div class="section"><p style="color:' + darkInk + '">' + body + '</p>'
    + '<button disabled style="color:#ccc;background:#fff">Inactive</button></div></div></body></html>';
  const bad = path.join(outDir, 'bad.html'), clean = path.join(outDir, 'clean.html');
  fs.writeFileSync(bad, page('Read [the source](https://example.test/) closely.', '#1e293b'));
  fs.writeFileSync(clean, page('Read the source closely.', 'inherit'));
  const badResult = await sweep([{ name: 'bad', base: 'light', file: bad }]);
  const cleanResult = await sweep([{ name: 'clean', base: 'light', file: clean }]);
  const checks = [
    ['dark ink on a dark card fails AA in Dark', badResult.contrast.some(r => r.theme === 'dark' && r.failsAA && r.fg === '#1e293b')],
    ['raw Markdown link is reported', badResult.markdown.some(m => m.kind === 'link')],
    ['the disabled button is exempt', !badResult.contrast.concat(cleanResult.contrast).some(r => r.text === 'Inactive')],
    ['the clean page reports nothing', !cleanResult.contrast.length && !cleanResult.markdown.length],
  ];
  checks.forEach(([name, ok]) => console.log((ok ? 'ok   ' : 'FAIL ') + name));
  return checks.every(([, ok]) => ok);
}

(async () => {
  const out = path.resolve(arg('--out', path.join(ROOT, 'reports', 'export-theme-sweep')));
  if (process.argv.includes('--generate')) return generate(out, path.resolve(arg('--module')), arg('--packs').split(','));
  if (process.argv.includes('--selftest')) { process.exitCode = (await selftest(path.join(out, 'selftest'))) ? 0 : 1; return; }
  const moduleFile = path.resolve(arg('--module', path.join(ROOT, 'doc_pipeline_module.js')));
  const packsArg = arg('--packs', DEFAULT_PACKS.join(','));
  const packs = packsArg === 'all'
    ? fs.readdirSync(path.join(ROOT, 'allopacks')).filter(f => f.endsWith('.allopack.json')).map(f => f.replace('.allopack.json', ''))
    : packsArg.split(',');
  fs.rmSync(out, { recursive: true, force: true });
  const gen = spawnSync(process.execPath, [__filename, '--generate', '--out', out, '--module', moduleFile, '--packs', packs.join(',')], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (gen.status !== 0) { process.stderr.write(gen.stderr || 'export generation failed\n'); process.exitCode = 2; return; }
  if (gen.stderr && gen.stderr.trim()) process.stderr.write(gen.stderr);
  const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8'));
  const result = await sweep(manifest);
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(result, null, 1));
  const { text, failed } = summarize(result);
  console.log(manifest.length + ' exports from ' + path.relative(ROOT, moduleFile) + '\n' + text + '\nfull report: ' + path.relative(ROOT, path.join(out, 'report.json')));
  process.exitCode = failed ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 2; });
