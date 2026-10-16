/* Local full-app preview and QA, adapted from the Tyler merge browser harness. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const esbuild = require('esbuild');
const { chromium } = require('playwright');
const expect = require('@playwright/test').expect.configure({ timeout: 20000 });

const root = path.resolve(__dirname, '..');
const appDir = path.join(root, 'desktop/web-app');
const publicDir = path.join(appDir, 'public');
const out = path.join(root, '.codex-artifacts/onboarding-workspace-qa-2026-10-14');
const mode = process.argv[2] || 'check';
if (!['check', 'serve'].includes(mode)) throw new Error('Usage: node dev-tools/onboarding-workspace-qa.cjs check|serve [--port=PORT]');
const portArgument = process.argv.slice(3).find(value => value.startsWith('--port='));
const requestedPort = portArgument ? Number(portArgument.slice(7)) : 0;
if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65535) throw new Error('Invalid loopback port');
const report = { at: new Date().toISOString(), scope: 'local generated App.jsx, no external services', checks: [], served: {}, blocked: [], errors: [], consoleErrors: [], diagnostics: [] };
let server, browser, qaPage;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');

async function buildPreview() {
  const globals = "import React from 'react'; import {createRoot} from 'react-dom/client'; import * as icons from 'lucide-react'; window.React=React; window.ReactDOM={createRoot}; window.AlloIcons=icons;";
  const result = await esbuild.build({
    stdin: { contents: globals + "import App from './src/App.jsx'; createRoot(document.getElementById('root')).render(React.createElement(App));", resolveDir: appDir, sourcefile: 'onboarding-workspace-preview.jsx', loader: 'jsx' },
    bundle: true, write: false, format: 'iife', define: { 'process.env.NODE_ENV': '"development"' }, logLevel: 'warning',
    plugins: [{ name: 'installed-icons', setup(build) {
      build.onResolve({ filter: /^lucide-react$/ }, () => ({ path: require.resolve('lucide-react', { paths: [appDir] }) }));
    } }],
  });
  const postcss = require(require.resolve('postcss', { paths: [appDir] }));
  const tailwind = require(require.resolve('tailwindcss', { paths: [appDir] }));
  const tailwindConfig = require(path.join(appDir, 'tailwind.config.js'));
  const styleFiles = [
    'desktop/web-app/src/App.jsx', 'view_launch_pad_source.jsx', 'view_header_source.jsx',
    'view_guided_mode_banner_source.jsx', 'view_sidebar_panels_source.jsx', 'view_sidebar_tabs_nav_source.jsx',
    'view_teacher_history_tab_source.jsx', 'view_fab_stack_source.jsx', 'view_educator_hub_modal_source.jsx',
    'view_learning_hub_modal_source.jsx', 'view_misc_modals_source.jsx', 'ui_modals_source.jsx', 'teacher_source.jsx',
    'onboarding_coach_source.jsx', 'allobot_source.jsx', 'misc_components_source.jsx',
  ];
  const css = (await postcss([tailwind({ ...tailwindConfig, content: styleFiles.map(name => path.join(root, name)) })])
    .process(fs.readFileSync(path.join(appDir, 'src/index.css'), 'utf8'), { from: undefined })).css;
  report.hostHash = sha(fs.readFileSync(path.join(appDir, 'src/App.jsx')));
  report.styleFiles = styleFiles;
  return { bundle: result.outputFiles[0].contents, css };
}

async function startServer(preview) {
  const mime = { '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.html': 'text/html' };
  server = http.createServer((req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', "default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; connect-src 'self' blob:; img-src 'self' data: blob:; font-src 'self' data:; worker-src 'self' blob:; media-src 'self' data: blob:; object-src 'none'; base-uri 'self'");
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname === '/' || url.pathname === '/app') { res.writeHead(302, { Location: '/app/' }); res.end(); return; }
    if (url.pathname === '/app/' || url.pathname === '/app/index.html') {
      res.setHeader('Content-Type', 'text/html');
      res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>AlloFlow local onboarding preview</title><link rel="stylesheet" href="/app/qa.css"></head><body><div id="root"></div><script>window.__alloCdnBase=location.origin+"/app/";</script><script src="/app/qa-app.js"></script></body></html>');
      return;
    }
    if (url.pathname === '/app/qa-app.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(preview.bundle); return; }
    if (url.pathname === '/app/qa.css') { res.setHeader('Content-Type', 'text/css'); res.end(preview.css); return; }
    if (!url.pathname.startsWith('/app/')) { res.writeHead(404); res.end(); return; }
    let relative;
    try { relative = decodeURIComponent(url.pathname.slice(5)); } catch (_) { res.writeHead(400); res.end(); return; }
    const file = path.resolve(publicDir, relative);
    if (relative.includes('\0') || !file.toLowerCase().startsWith(publicDir.toLowerCase() + path.sep)) { res.writeHead(400); res.end(); return; }
    let stat;
    try { stat = fs.statSync(file); } catch (_) { res.writeHead(404); res.end('Unavailable local asset'); return; }
    if (!stat.isFile()) { res.writeHead(404); res.end(); return; }
    if (!report.served[relative]) report.served[relative] = { bytes: stat.size };
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    if (req.method === 'HEAD') { res.end(); return; }
    const stream = fs.createReadStream(file);
    stream.on('error', () => { if (!res.headersSent) res.writeHead(500); res.end(); });
    stream.pipe(res);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(requestedPort, '127.0.0.1', resolve); });
  const origin = 'http://127.0.0.1:' + server.address().port;
  report.origin = origin;
  console.log('Local preview: ' + origin + '/app/ (external services blocked)');
  return origin;
}

async function record(name, work) {
  await work();
  await captureDiagnostics(name);
  report.checks.push({ name, passed: true });
  console.log('PASS ' + name);
}

async function captureDiagnostics(stage) {
  if (!qaPage) return;
  const entries = await qaPage.evaluate(() => {
    const reporter = window.AlloModules && window.AlloModules.ErrorReporter;
    return reporter && reporter.getBuffer ? reporter.getBuffer().slice(-20).map(entry => ({
      level: entry.level, message: String(entry.message || '').slice(0, 3000), load: entry.load,
    })) : [];
  }).catch(() => []);
  if (entries.length) report.diagnostics.push({ stage, entries });
}

async function screenshot(page, name, selector) {
  if (selector) await page.locator(selector).scrollIntoViewIfNeeded();
  const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(dimensions.scrollWidth, name + ' page overflow').toBeLessThanOrEqual(dimensions.width + 1);
  report.checks.push({ name: name + ' no horizontal page overflow', passed: true, ...dimensions });
  if (name.startsWith('launch-')) {
    const coveredRoles = await page.evaluate(() => {
      const coach = document.querySelector('[data-help-key="onboarding_ask_allobot_button"]');
      if (!coach) return [];
      const clip = rect => ({ left: Math.max(0, rect.left), right: Math.min(innerWidth, rect.right), top: Math.max(0, rect.top), bottom: Math.min(innerHeight, rect.bottom) });
      const launcher = clip(coach.getBoundingClientRect());
      return [...document.querySelectorAll('.lp-role-grid .lp-card')].filter(card => {
        const bounds = clip(card.getBoundingClientRect());
        return Math.min(bounds.right, launcher.right) > Math.max(bounds.left, launcher.left)
          && Math.min(bounds.bottom, launcher.bottom) > Math.max(bounds.top, launcher.top);
      }).map(card => card.dataset.pathway);
    });
    expect(coveredRoles, name + ' coach must not cover role choices').toEqual([]);
    report.checks.push({ name: name + ' coach does not overlap role choices', passed: true });
  }
  await page.screenshot({ path: path.join(out, name + '.png'), fullPage: false, animations: 'disabled' });
}

async function returnToStart(page) {
  await page.locator('[data-help-key="header_rerun_wizard"]:visible').first().click();
  await page.locator('[data-help-key="header_return_to_start"]').click();
  await expect(page.locator('[data-alloflow-launch-pad="true"]')).toBeVisible();
}

async function checks(origin) {
  fs.mkdirSync(out, { recursive: true });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await context.route('**/*', async route => {
    const url = route.request().url();
    if (url.startsWith(origin + '/') || url.startsWith('blob:') || url.startsWith('data:')) return route.continue();
    if (report.blocked.length < 60 && !report.blocked.includes(url)) report.blocked.push(url);
    return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  qaPage = page;
  page.setDefaultTimeout(45000);
  page.on('pageerror', error => { if (report.errors.length < 30) report.errors.push(String(error)); });
  page.on('console', message => {
    if (message.type() !== 'error') return;
    const text = message.text().slice(0, 4000);
    if (report.consoleErrors.length < 100 && !report.consoleErrors.some(entry => entry.text === text)) report.consoleErrors.push({ text, location: message.location() });
  });
  try {
    await page.goto(origin + '/app/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    const pad = page.locator('[data-alloflow-launch-pad="true"]');
    await expect(pad).toBeVisible({ timeout: 90000 });
    await record('fresh role entry without forced AI setup', async () => {
      for (const name of ['Teacher', 'Student', 'Family', 'Professional tools', 'Learn independently']) await expect(pad.getByRole('button', { name, exact: true })).toBeVisible();
      await expect(pad.locator('.lp-role-grid button.lp-card')).toHaveCount(4);
      await expect(page.getByRole('dialog')).toHaveCount(0);
    });
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      await screenshot(page, 'launch-' + width, '[data-pathway="teacher"]');
    }
    await record('keyboard Student disclosure and exact class-code validation', async () => {
      await pad.getByRole('button', { name: 'Student', exact: true }).focus();
      await page.keyboard.press('Enter');
      const input = page.locator('#launch-pad-class-code');
      await expect(input).toHaveAccessibleName('Class code');
      await expect(input).toBeFocused();
      const join = pad.getByRole('button', { name: 'Join class', exact: true });
      for (const value of ['ABC1', 'ABC123', 'ABC!1']) { await input.fill(value); await expect(join).toBeDisabled(); }
      await input.fill('ab-c12');
      await expect(join).toBeEnabled();
      await screenshot(page, 'student-320', '#launch-pad-student-panel');
      await input.press('Escape');
      await expect(pad.getByRole('button', { name: 'Student', exact: true })).toBeFocused();
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await pad.getByRole('button', { name: 'Teacher', exact: true }).click();
    const guided = page.locator('[data-help-key="guided_workflow"]');
    await record('fresh Teacher starts the reading path with editable source', async () => {
      await expect(pad).toHaveCount(0);
      await expect(guided).toBeVisible();
      await expect(guided.locator('[data-help-key="guided_path_summary"]')).toContainText('Read original with supports');
      await expect(page.locator('textarea[data-allo-textundo="input"]')).toBeVisible();
      await expect(guided.locator('[data-help-key="guided_path_choice"]')).toHaveCount(0);
      expect(await page.evaluate(() => localStorage.getItem('allo_guided_auto_advance'))).toBe('false');
    });
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
      await screenshot(page, 'teacher-' + width, '[data-help-key="guided_workflow"]');
      await record('Class & Materials remains available during Guided at ' + width, async () => {
        const materials = page.locator(width < 768 ? '#workspace-tab-history' : '#tab-history');
        await expect(materials).toBeVisible();
        await expect(materials).toBeEnabled();
        await expect(materials).toContainText('Class & Materials');
        await materials.click();
        await expect(page.locator('#ui-roster-strip')).toBeVisible();
        if (width === 1440) {
          await record('quick group saves locally without applying its profile', async () => {
            const roster = page.locator('#ui-roster-strip');
            const add = roster.getByRole('button', { name: 'Add group', exact: true });
            await add.click();
            const form = page.locator('#roster-quick-group-form');
            const grade = form.getByRole('combobox', { name: /^Grade/ });
            const language = form.getByRole('combobox', { name: /^Language/ });
            const initial = { grade: await grade.inputValue(), language: await language.inputValue() };
            const alternate = async (select, value) => select.locator('option').evaluateAll((options, current) => options.find(option => option.value !== current)?.value, value);
            await form.getByLabel('Group name', { exact: true }).fill('Local QA reading group');
            await grade.selectOption(await alternate(grade, initial.grade));
            const otherLanguage = await alternate(language, initial.language);
            if (otherLanguage) await language.selectOption(otherLanguage);
            await form.getByRole('button', { name: 'Add group', exact: true }).click();
            await expect(roster.getByRole('button', { name: 'Local QA reading group', exact: true })).toBeVisible();
            await expect(form).toHaveCount(0);
            await add.click();
            await expect(grade).toHaveValue(initial.grade);
            await expect(language).toHaveValue(initial.language);
            await form.getByRole('button', { name: 'Cancel', exact: true }).click();
          });
        }
        await screenshot(page, 'materials-' + width, '#ui-roster-strip');
        await page.getByRole('button', { name: 'Back to my step', exact: true }).click();
        await expect(guided).toBeVisible();
      });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await record('prepared example is explicit and does not silently advance source', async () => {
      await guided.getByRole('button', { name: /example passage|Try an example|Try this example/i }).click();
      await expect(page.locator('textarea[data-allo-textundo="input"]')).not.toHaveValue('');
      await page.waitForTimeout(1500); // Exercise the removed delayed source-step advance.
      await expect(page.locator('#source-ready-title')).toBeVisible();
      await guided.locator('[data-help-key="guided_next_step"]').click();
      const sample = guided.locator('[data-help-key="guided_sample_result"]');
      await expect(sample).toBeVisible();
      await sample.locator('summary').click();
      await expect(sample).toContainText('not generated just now');
      await expect(sample).toContainText('does not complete the analysis step');
      await screenshot(page, 'prepared-example', '[data-help-key="guided_sample_result"]');
    });
    await returnToStart(page);
    await pad.getByRole('button', { name: 'Family', exact: true }).click();
    await record('Family starts from reading without the teacher setup wizard', async () => {
      await expect(page.locator('#source-ready-title')).toHaveText("Start with your child's reading");
      await expect(guided).toHaveCount(0);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.locator('textarea[data-allo-textundo="input"]').fill('A plant uses sunlight, water, and air to grow. Its leaves capture light energy.');
      const actions = page.locator('[data-help-key="family_source_actions"]');
      for (const name of ['Simpler text', 'Word list', 'Story']) await expect(actions.getByRole('button', { name, exact: true })).toBeEnabled();
      await screenshot(page, 'family-desktop', '[data-help-key="family_source_actions"]');
      await page.setViewportSize({ width: 390, height: 844 });
      await screenshot(page, 'family-390', '[data-help-key="family_source_actions"]');
      await actions.getByRole('button', { name: 'Word list', exact: true }).click();
      await expect(page.locator('#ui-tool-glossary')).toBeVisible();
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await returnToStart(page);
    await pad.getByRole('button', { name: 'Professional tools', exact: true }).click();
    await record('Family to Professional tools clears restrictive role state', async () => {
      const tools = page.locator('[data-help-key="educator_hub_modal_panel"]');
      await expect(tools).toBeVisible();
      await expect(tools.locator('[data-help-key="educator_hub_behavior_lens_card"]')).toBeVisible();
      await expect(tools.locator('[data-hub-id="report-writer"]')).toBeVisible();
      await expect(guided).toHaveCount(0);
      await screenshot(page, 'professional-tools', '[data-help-key="educator_hub_modal_panel"]');
    });
    await record('reload offers explicit resume rather than entering the remembered role', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(pad).toBeVisible({ timeout: 90000 });
      await expect(pad.getByRole('button', { name: 'Continue last workspace', exact: true })).toBeVisible();
      await expect(page.locator('[data-help-key="educator_hub_modal_panel"]')).toHaveCount(0);
      await pad.getByRole('button', { name: 'Continue last workspace', exact: true }).click();
      await expect(page.locator('[data-help-key="educator_hub_modal_panel"]')).toBeVisible();
    });
    expect(report.errors, 'browser runtime errors').toEqual([]);
  } catch (error) {
    await captureDiagnostics('failure');
    await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: false }).catch(() => {});
    const failureText = await page.locator('body').innerText().catch(() => 'Unavailable');
    fs.writeFileSync(path.join(out, 'failure-text.txt'), failureText.slice(0, 128 * 1024));
    throw error;
  } finally { await context.close(); }
}

async function main() {
  console.log('Bundling the generated host in memory');
  const origin = await startServer(await buildPreview());
  if (mode === 'serve') {
    await new Promise(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve); });
    return;
  }
  await checks(origin);
}

main().catch(error => { report.failure = String(error.stack || error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
  if (mode === 'check') {
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed: report.checks.length, failure: report.failure, errors: report.errors, report: path.join(out, 'report.json') }, null, 2));
  } else if (report.failure) console.error(report.failure);
});
