#!/usr/bin/env node
'use strict';

// Run axe against STEM tools inside the real local AlloFlow host. Unlike the
// lightweight theme sweep, this includes renderTool(), the white dark-theme
// surface, and the host's runtime theme overrides.
//
// Usage:
//   node dev-tools/live_stem_a11y_probe.cjs
//   node dev-tools/live_stem_a11y_probe.cjs http://localhost:3000/ cellularlab,papertrail

const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const AXE_PATH = path.join(ROOT, 'node_modules', 'axe-core', 'axe.min.js');
const OUT_PATH = path.join(__dirname, '.cache', 'live-stem-a11y.json');
const DEFAULT_TOOLS = [
  'astronomy',
  'cellularlab',
  'funcgrapher',
  'magnetism',
  'papertrail',
  'physics',
  'spacestation',
  'watercycle',
  'wave',
];

const args = process.argv.slice(2);
const baseUrl = args.find((arg) => /^https?:\/\//i.test(arg)) || 'http://localhost:3000/';
const toolArg = args.find((arg) => !/^https?:\/\//i.test(arg) && !arg.startsWith('--'));
const tools = toolArg ? toolArg.split(',').map((value) => value.trim()).filter(Boolean) : DEFAULT_TOOLS;

if (!fs.existsSync(AXE_PATH)) {
  throw new Error('axe-core is not installed at ' + AXE_PATH);
}

function compactViolation(violation) {
  return {
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    help: violation.help,
    helpUrl: violation.helpUrl,
    tags: violation.tags,
    nodes: violation.nodes.map((node) => ({
      impact: node.impact,
      target: node.target,
      html: node.html,
      failureSummary: node.failureSummary,
      any: node.any.map((check) => check.message),
      all: node.all.map((check) => check.message),
      none: node.none.map((check) => check.message),
    })),
  };
}

async function waitForStableTool(page) {
  await page.waitForFunction(() => {
    const shell = document.querySelector('[data-stem-tool-shell]');
    return !!shell && shell.querySelectorAll('*').length > 5 && (shell.textContent || '').trim().length > 20;
  }, null, { timeout: 60_000 });

  await page.evaluate(async () => {
    const shell = document.querySelector('[data-stem-tool-shell]');
    let last = '';
    let stable = 0;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const now = shell.querySelectorAll('*').length + ':' + (shell.textContent || '').length;
      stable = now === last ? stable + 1 : 0;
      last = now;
      if (stable >= 3) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  });
}

async function ensureTheme(page, wanted) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const current = await page.locator('[data-stem-tool-shell]').getAttribute('data-stem-theme');
    if (current === wanted) return;
    const toggle = page.locator('button[aria-label="Toggle theme"]');
    await toggle.waitFor({ state: 'attached', timeout: 20_000 });
    // The CRA error overlay can cover the app in development. Calling the real
    // button's handler is deterministic and matches the established local E2E
    // helpers used elsewhere in this repository.
    await toggle.evaluate((element) => element.click());
    await page.waitForTimeout(150);
  }
  throw new Error('could not switch STEM host to ' + wanted + ' theme');
}

async function auditTheme(page, theme) {
  await ensureTheme(page, theme);
  await waitForStableTool(page);
  if (typeof await page.evaluate(() => window.axe) === 'undefined') {
    await page.addScriptTag({ path: AXE_PATH });
  }
  const result = await page.evaluate(async () => window.axe.run(
    document.querySelector('[data-stem-tool-shell]'),
    {
      resultTypes: ['violations', 'incomplete'],
      rules: {
        'color-contrast-enhanced': { enabled: false },
      },
    }
  ));
  const headings = await page.evaluate(() => Array.from(
    document.querySelectorAll('[data-stem-tool-shell] h1, [data-stem-tool-shell] h2, [data-stem-tool-shell] h3, [data-stem-tool-shell] h4, [data-stem-tool-shell] h5, [data-stem-tool-shell] h6')
  ).map((heading) => ({
    level: Number(heading.tagName.slice(1)),
    text: (heading.textContent || '').replace(/\s+/g, ' ').trim(),
    hidden: !!(heading.hidden || heading.getAttribute('aria-hidden') === 'true' || heading.closest('[hidden],[aria-hidden="true"]')),
  })));
  return {
    theme,
    headings,
    violations: result.violations.map(compactViolation),
    incomplete: result.incomplete.map(compactViolation),
    passes: result.passes.length,
    inapplicable: result.inapplicable.length,
  };
}

(async () => {
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl,
    tools: [],
  };

  try {
    for (const slug of tools) {
      const entry = { slug, themes: [], error: '' };
      report.tools.push(entry);
      try {
        const url = new URL(baseUrl);
        url.searchParams.set('tool', slug);
        await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 120_000 });
        await waitForStableTool(page);
        for (const theme of ['light', 'dark']) {
          const result = await auditTheme(page, theme);
          entry.themes.push(result);
          const nodes = result.violations.reduce((sum, violation) => sum + violation.nodes.length, 0);
          process.stdout.write(
            slug.padEnd(15) + ' ' + theme.padEnd(5) + ' ' +
            String(result.violations.length).padStart(2) + ' rules / ' +
            String(nodes).padStart(3) + ' nodes\n'
          );
        }
      } catch (error) {
        entry.error = error && error.stack ? error.stack : String(error);
        process.stdout.write(slug.padEnd(15) + ' ERROR ' + String(error.message || error) + '\n');
      }
    }
  } finally {
    await browser.close();
    fs.writeFileSync(OUT_PATH, JSON.stringify(report, null, 2) + '\n');
  }

  process.stdout.write('Report: ' + path.relative(ROOT, OUT_PATH) + '\n');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
