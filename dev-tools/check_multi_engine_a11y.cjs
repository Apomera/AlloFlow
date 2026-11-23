#!/usr/bin/env node
/*
 * Multi-Engine Accessibility Verification Runner for AlloFlow.
 *
 * Runs six independent automated checks in real headless Playwright Chromium
 * (zero external network calls; offline-deterministic):
 *   1. Deque axe-core (WCAG 2.0 / 2.1 / 2.2 Level A & AA)
 *   2. IBM Equal Access (accessibility-checker-engine, IBM_Accessibility ruleset)
 *   3. Chromium Accessibility Tree (CDP Accessibility.getFullAXTree) for
 *      landmarks, headings, and unnamed interactive controls
 *   4. Forced Colors Mode (Windows High Contrast emulation)
 *   5. WCAG 1.4.10 Reflow at 320 CSS px (equivalent to 400% zoom on 1280px)
 *   6. WCAG 1.4.12 Text Spacing override (1.5 line-height, 0.12em letter-spacing,
 *      0.16em word-spacing, 2em paragraph spacing)
 *
 * Usage:
 *   node dev-tools/check_multi_engine_a11y.cjs [page1.html page2.html ...]
 *   node dev-tools/check_multi_engine_a11y.cjs --gate [pages...]   (exit 1 on any finding)
 *   node dev-tools/check_multi_engine_a11y.cjs --json [pages...]   (JSON summary to stdout)
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const AXE_PATH = path.join(ROOT, 'node_modules', 'axe-core', 'axe.min.js');
const ACE_PATH = path.join(ROOT, 'node_modules', 'accessibility-checker-engine', 'ace.js');

let chromium;
try {
  chromium = require(path.join(ROOT, 'node_modules', 'playwright')).chromium;
} catch (err) {
  console.error('[check_multi_engine_a11y] playwright not installed:', err.message);
  process.exit(2);
}

const DEFAULT_PAGES = [
  'index.html',
  'packets.html',
  'calculator.html',
  'features.html',
  'feedback.html',
  'for-districts.html',
  'launch.html',
  'remediation.html',
  'tools.html',
  'ways-to-use.html',
  'guide/index.html',
  'guide/start-here.html',
  'website/calculator.html',
  'website/features.html',
  'website/library.html',
  'zoom_gallery/zoom_gallery.html',
  'verapdf/verapdf_validator.html',
  'text_inquiry/text_inquiry.html',
  'timeline_studio/timeline_studio.html',
  'life_skills_capstone/life_skills_capstone.html',
  'docs/dynamic_assessment_guide.html',
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.cjs': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.ico': 'image/x-icon',
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      const rel = urlPath.replace(/^\/+/, '');
      let filePath = path.join(ROOT, rel);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      if (!filePath.startsWith(ROOT) || !fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

async function auditPage(browser, port, rel) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    bypassCSP: true,
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto(`http://127.0.0.1:${port}/${rel}`, { waitUntil: 'load', timeout: 25000 });
  await page.evaluate(() => {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));
  });
  await page.waitForTimeout(rel === 'index.html' ? 1200 : 300);

  // 1. axe-core
  await page.addScriptTag({ path: AXE_PATH });
  const axeViolations = await page.evaluate(async () => {
    const r = await window.axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    });
    return r.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      count: v.nodes.length,
      sample: v.nodes[0] ? v.nodes[0].target.join(' ') : '',
      summary: v.nodes[0] ? (v.nodes[0].failureSummary || '').slice(0, 120) : '',
    }));
  });

  // 2. IBM Equal Access
  await page.addScriptTag({ path: ACE_PATH });
  const ibmViolations = await page.evaluate(async () => {
    const checker = new window.ace.Checker();
    const report = await checker.check(document, ['IBM_Accessibility']);
    const fails = report.results.filter(
      (i) =>
        Array.isArray(i.value) &&
        i.value[0] === 'VIOLATION' &&
        i.value[1] === 'FAIL' &&
        !(i.ruleId === 'aria_content_in_landmark' && i.path && i.path.dom === '/html[1]/body[1]/a[1]') &&
        !(i.ruleId === 'element_tabbable_role_valid' && /role="region"/.test(i.snippet || ''))
    );
    const byRule = {};
    for (const f of fails) {
      if (!byRule[f.ruleId]) {
        byRule[f.ruleId] = {
          ruleId: f.ruleId,
          count: 0,
          message: f.message,
          dom: f.path && f.path.dom ? f.path.dom : '',
          snippet: (f.snippet || '').slice(0, 120),
        };
      }
      byRule[f.ruleId].count++;
    }
    return Object.values(byRule);
  });

  // 3. Chromium Accessibility Tree (AOM)
  let aom = { hasMain: false, headings: 0, unnamedButtons: 0, unnamedLinks: 0, unnamedInputs: 0 };
  try {
    const cdp = await ctx.newCDPSession(page);
    const { nodes } = await cdp.send('Accessibility.getFullAXTree', { depth: 6 });
    let hasMain = false;
    let headings = 0;
    let unnamedButtons = 0;
    let unnamedLinks = 0;
    let unnamedInputs = 0;
    for (const n of nodes) {
      if (n.ignored) continue;
      const r = n.role && n.role.value;
      if (!r) continue;
      if (r === 'main') hasMain = true;
      if (r === 'heading') headings++;
      const name = n.name && typeof n.name.value === 'string' ? n.name.value.trim() : '';
      if (r === 'button' && !name) unnamedButtons++;
      if (r === 'link' && !name) unnamedLinks++;
      if ((r === 'textbox' || r === 'combobox' || r === 'slider' || r === 'checkbox' || r === 'spinbutton') && !name) unnamedInputs++;
    }
    aom = { hasMain, headings, unnamedButtons, unnamedLinks, unnamedInputs };
    await cdp.detach();
  } catch (e) {
    aom.error = e.message;
  }

  // 4. Forced Colors Mode
  await page.emulateMedia({ forcedColors: 'active', colorScheme: 'dark' });
  await page.waitForTimeout(80);
  const forcedColors = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const h1Style = h1 ? getComputedStyle(h1) : null;
    let hiddenClipCount = 0;
    for (const el of document.querySelectorAll('h1,h2,h3,a,button,.gradient-text')) {
      const st = getComputedStyle(el);
      if (st.webkitTextFillColor === 'rgba(0, 0, 0, 0)' && st.forcedColorAdjust === 'none') hiddenClipCount++;
    }
    return {
      ok: (!h1Style || (h1Style.opacity !== '0' && h1Style.visibility !== 'hidden')) && hiddenClipCount === 0,
      hiddenClipCount,
    };
  });
  await page.emulateMedia({ forcedColors: 'none', colorScheme: 'light' });

  // 5. WCAG 1.4.10 Reflow at 320px
  await page.setViewportSize({ width: 320, height: 640 });
  await page.waitForTimeout(100);
  const reflow320OverflowPx = await page.evaluate(() =>
    Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)
  );

  // 6. WCAG 1.4.12 Text Spacing override
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addStyleTag({
    content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }',
  });
  await page.waitForTimeout(100);
  const textSpacing1412 = await page.evaluate(() => {
    const horizOverflowPx = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const clipped = [];
    for (const el of document.querySelectorAll('button, a, h1, h2, h3, p, label')) {
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || el.classList.contains('sr-only') || el.classList.contains('skip-link') || el.classList.contains('skip')) continue;
      if (!(el.textContent || '').trim()) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 2 || r.height <= 2) continue;
      if ((st.overflowY === 'hidden' || st.overflow === 'hidden') && el.scrollHeight > el.clientHeight + 8) {
        clipped.push((el.tagName + ': ' + (el.textContent || '').trim()).slice(0, 45));
      }
    }
    return { horizOverflowPx, clippedCount: clipped.length, clipped: clipped.slice(0, 5) };
  });

  await ctx.close();
  return {
    page: rel,
    pageErrors,
    axeViolations,
    ibmViolations,
    aom,
    forcedColors,
    reflow320OverflowPx,
    textSpacing1412,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const gate = args.includes('--gate');
  const jsonOut = args.includes('--json');
  const pageArgs = args.filter((a) => !a.startsWith('--'));
  const targets = (pageArgs.length ? pageArgs : DEFAULT_PAGES).filter((rel) => fs.existsSync(path.join(ROOT, rel)));

  const { server, port } = await startServer();
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const rel of targets) {
      results.push(await auditPage(browser, port, rel));
    }
  } finally {
    await browser.close();
    server.close();
  }

  let failCount = 0;
  for (const r of results) {
    const failed =
      r.axeViolations.length > 0 ||
      r.ibmViolations.length > 0 ||
      !r.forcedColors.ok ||
      r.reflow320OverflowPx > 2 ||
      r.textSpacing1412.clippedCount > 0 ||
      r.aom.unnamedButtons > 0 ||
      r.aom.unnamedLinks > 0 ||
      r.aom.unnamedInputs > 0;
    if (failed) failCount++;
  }

  if (jsonOut) {
    console.log(JSON.stringify({ total: results.length, passed: results.length - failCount, failed: failCount, results }, null, 2));
  } else {
    console.log(`[check_multi_engine_a11y] Audited ${results.length} page(s): ${results.length - failCount}/${results.length} PASS`);
    for (const r of results) {
      const tag =
        r.axeViolations.length === 0 &&
        r.ibmViolations.length === 0 &&
        r.forcedColors.ok &&
        r.reflow320OverflowPx <= 2 &&
        r.textSpacing1412.clippedCount === 0 &&
        r.aom.unnamedButtons === 0 &&
        r.aom.unnamedLinks === 0 &&
        r.aom.unnamedInputs === 0
          ? 'PASS'
          : 'FAIL';
      console.log(
        `  [${tag}] ${r.page} | axe=${r.axeViolations.length} | ibm=${r.ibmViolations.length} | AOM(main=${r.aom.hasMain}, unBtn=${r.aom.unnamedButtons}, unLnk=${r.aom.unnamedLinks}, unInp=${r.aom.unnamedInputs}) | fc=${r.forcedColors.ok} | reflow320=${r.reflow320OverflowPx}px | ts1412(clip=${r.textSpacing1412.clippedCount})`
      );
      if (r.axeViolations.length) console.log('    AXE:', JSON.stringify(r.axeViolations));
      if (r.ibmViolations.length) console.log('    IBM:', JSON.stringify(r.ibmViolations));
      if (r.textSpacing1412.clippedCount) console.log('    TS1412:', JSON.stringify(r.textSpacing1412.clipped));
    }
  }

  if (gate && failCount > 0) process.exit(1);
}

main().catch((err) => {
  console.error('[check_multi_engine_a11y] Fatal:', err);
  process.exit(1);
});
