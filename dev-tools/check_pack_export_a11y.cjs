#!/usr/bin/env node
'use strict';
// Accessibility gate for the resource-pack export (Download HTML, worksheet, Arabic, teacher copy), 2026-11-12.
// Builds real packs with the real modules (doc_pipeline_module.js and its helpers, as the app loads them), then runs
// the shared audit (dev-tools/a11y_page_audit.cjs: axe WCAG 2.0-2.2 A/AA at 1280 + 375 px, structure, dark, reflow
// 640/320, reduced motion, button names, keyboard reach + visible focus) on each state, plus "quiz feedback is
// announced". "Skipped is not passed": a state that cannot be reached fails the run.
//
//   node dev-tools/check_pack_export_a11y.cjs                          three packs (several minutes; one browser)
//   node dev-tools/check_pack_export_a11y.cjs --packs body_systems_grade6
//   node dev-tools/check_pack_export_a11y.cjs --only arabic --json out.json
// Heavy: not part of the default test run.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createAudit } = require('./a11y_page_audit.cjs');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const argOf = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const PACKS = (argOf('--packs') || 'body_systems_grade6,source_media_literacy_grade7_8,american_revolution_causes_grade5').split(',');
const ONLY = argOf('--only');
const JSON_OUT = argOf('--json');
const MODULES = ['text_pipeline_helpers_module.js', 'instructional_context_module.js', 'anchor_charts_module.js', 'memory_aid_module.js',
  'applied_challenge_module.js', 'export_runtime_copy_module.js', 'doc_pipeline_module.js', 'export_labels/ar.js'];
const STRINGS = JSON.parse(fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8'));

// Every export the gate opens, built in one blank page by the same function the Builder calls.
async function buildExports(browser, dir) {
  const page = await browser.newPage();
  await page.goto('about:blank');
  await page.evaluate(() => { window.warnLog = function () {}; window.debugLog = function () {}; window.processMathHTML = function (v) { return v; }; window.AlloModules = window.AlloModules || {}; });
  await page.addScriptTag({ path: path.join(ROOT, 'desktop/web-app/node_modules/react/umd/react.production.min.js') });
  for (const f of MODULES) await page.addScriptTag({ path: path.join(ROOT, f) });
  const build = (items, topic, ws, lang, cfg) => page.evaluate(({ items, strings, ws, topic, cfg, lang }) => {
    const look = (k) => { let o = strings; for (const p of String(k).split('.')) { if (o && typeof o === 'object' && p in o) o = o[p]; else return undefined; } return typeof o === 'string' ? o : undefined; };
    const stub = async () => '{}';
    const pipeline = window.AlloModules.createDocPipeline({
      callGemini: stub, callGeminiVision: stub, callImagen: async () => null, addToast: () => {},
      t: (key) => { const v = look(key); return v === undefined ? key : v; },
      isRtlLang: (l) => /arabic|hebrew|urdu|persian|farsi|pashto|dari/i.test(String(l || '')), updateExportPreview: () => {},
      getDefaultTitle: (type) => String(type || 'Resource'),
      getState: () => ({ leveledTextLanguage: lang, currentUiLanguage: 'English', exportConfig: cfg }), state: {},
    });
    return pipeline.generateFullPackHTML(items, topic, ws, {}, Object.assign({ annotations: [], annotationsByResource: {} }, cfg));
  }, { items, strings: STRINGS, ws, topic, cfg: cfg || {}, lang });
  const out = [];
  for (const name of PACKS) {
    const pack = JSON.parse(fs.readFileSync(path.join(ROOT, 'allopacks/current', name + '.allopack.json'), 'utf8'));
    const topic = pack.sourceTopic || name;
    const variants = [
      ['interactive', false, 'English', {}],
      ['worksheet', true, 'English', {}],
      ['arabic interactive', false, 'Arabic', {}],
      ['teacher copy', false, 'English', { audience: 'teacher', includeTeacherKey: true }],
    ];
    for (const [variant, ws, lang, cfg] of variants) {
      const file = path.join(dir, name + '__' + variant.replace(/\s+/g, '_') + '.html');
      fs.writeFileSync(file, await build(pack.history, topic, ws, lang, cfg));
      out.push({ pack: name, variant, file, hasQuiz: pack.history.some((i) => i.type === 'quiz' && !(i.data && i.data.deliverySettings && i.data.deliverySettings.feedbackTiming === 'teacher-graded') && ((i.data && i.data.questions) || []).some((q) => Array.isArray(q.options) && q.options.length > 1)) });
    }
  }
  await page.close();
  return out;
}

// Close the name / workspace prompts a fresh page opens with (their own buttons, in any language).
async function settle(page) {
  for (let i = 0; i < 4; i++) {
    const open = await page.$('.alloflow-export-prompt-overlay');
    if (!open || !(await open.isVisible())) return;
    const buttons = await open.$$('button');
    if (!buttons.length) return;
    await buttons[0].click();
    await page.waitForTimeout(200);
  }
}

async function main() {
  const { chromium } = require(require.resolve('playwright', { paths: [ROOT] }));
  const t0 = Date.now();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pack-export-a11y-'));
  const browser = await chromium.launch();
  const A = createAudit();
  await A.selfTest(browser);
  const exportsList = await buildExports(browser, dir);
  const states = [];
  for (const e of exportsList) {
    states.push({ name: e.pack + ' / ' + e.variant + ' / name prompt open', e, prompt: true });
    states.push({ name: e.pack + ' / ' + e.variant, e });
    // Only a self-checked quiz with choices has a Check button (teacher-graded quizzes have none, by design).
    if (e.hasQuiz && e.variant === 'interactive') states.push({ name: e.pack + ' / quiz feedback', e, quiz: true });
  }
  const run = states.filter((s) => !ONLY || s.name.toLowerCase().includes(ONLY.toLowerCase()));
  for (const s of run) {
    const began = Date.now();
    const context = await browser.newContext({ bypassCSP: true, viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference', colorScheme: 'light' });
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on('pageerror', (err) => errors.push(String(err.message || err).slice(0, 160)));
    try {
      await page.goto(pathToFileURL(s.e.file).href, { waitUntil: 'load', timeout: 60000 });
      await page.waitForTimeout(500);
      if (s.prompt) {
        const open = await page.$('.alloflow-export-prompt-overlay');
        if (!open || !(await open.isVisible())) throw new Error('no name prompt on a fresh page');
        // The dialog alone: keyboard reach is checked for its own controls (the page behind is inert).
        await A.audit(page, s.name, { dark: false });
      } else {
        await settle(page);
        if (s.quiz) {
          const q = await page.$('.quiz-box input[type=radio], input[type=radio][name*=quiz]');
          const check = await page.$('.quiz-check-btn');
          if (!q || !check) throw new Error('no answer + Check button in the quiz');
          await A.liveStart(page);
          await q.check();
          await page.evaluate((b) => b.click(), check);
          await page.waitForTimeout(300);
          await A.liveCheck(page, s.name);
          await A.axeRun(page, s.name, 'after Check');
        } else {
          await A.audit(page, s.name, { dark: s.e.variant !== 'worksheet' });
        }
      }
    } catch (error) {
      A.skipped.push({ state: s.name, what: 'the state', why: String(error.message || error).split('\n')[0].slice(0, 200) });
    }
    if (errors.length) A.add(s.name, 'page', 'script-error', errors.length, errors.slice(0, 2).join(' || '));
    await context.close();
    process.stderr.write(s.name + ' ' + Math.round((Date.now() - began) / 100) / 10 + ' s\n');
  }
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 5000))]);
  fs.rmSync(dir, { recursive: true, force: true });
  const { text, byRule } = A.report(run.map((s) => s.name));
  console.log(text + '\n' + run.length + ' states, ' + Math.round((Date.now() - t0) / 1000) + ' s.');
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ when: new Date().toISOString(), states: run.map((s) => s.name), findings: A.findings, skipped: A.skipped, byRule, passes: A.passes }, null, 1));
  process.exitCode = A.findings.length || A.skipped.length ? 1 : 0;
}

if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 2; });
module.exports = { buildExports, settle };
