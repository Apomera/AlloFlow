#!/usr/bin/env node
// AlloFlow Self-Audit — runs axe-core 4.10.3 against the live app via Playwright
// Usage:
//   node scripts/axe_audit.mjs                              (audit live Firebase URL)
//   node scripts/axe_audit.mjs --url=http://localhost:3000  (audit local dev)
//   node scripts/axe_audit.mjs --headed                     (show browser window)

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v === undefined ? true : v];
}));

const TARGET_URL = args.url || 'https://prismflow-911fe.web.app';
const HEADED = Boolean(args.headed);
const AXE_CDN = 'https://cdn.jsdelivr.net/npm/axe-core@4.10.3/axe.min.js';
const OUT_JSON = path.resolve('axe_audit_report.json');
const OUT_MD = path.resolve('AXE_AUDIT.md');

const AXE_CONFIG = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
  resultTypes: ['violations', 'incomplete'],
};

// Scenarios: each one is { name, setup } — setup runs with (page) and prepares the state.
// We deliberately scope to non-AI-dependent chrome so this audit doesn't burn API quota.
const SCENARIOS = [
  {
    name: 'landing',
    description: 'Initial page load (input view, light theme)',
    setup: async () => { /* default state */ },
  },
  {
    name: 'landing_with_text',
    description: 'Input view after typing source text',
    setup: async (page) => {
      const ta = page.locator('textarea').first();
      if (await ta.count()) {
        await ta.click().catch(() => {});
        await ta.fill('The water cycle describes how water moves through the environment. '
          + 'Water evaporates from oceans and lakes, forms clouds, and falls as precipitation.');
      }
    },
  },
  {
    name: 'theme_dark',
    description: 'Dark theme applied',
    setup: async (page) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add('theme-dark');
        try { localStorage.setItem('allo-theme', 'dark'); } catch(e) {}
      });
      await page.waitForTimeout(500);
    },
  },
  {
    name: 'theme_contrast',
    description: 'High-contrast theme',
    setup: async (page) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'contrast');
        document.documentElement.classList.add('theme-contrast');
      });
      await page.waitForTimeout(500);
    },
  },
  {
    name: 'reading_theme_sepia',
    description: 'Sepia reading theme',
    setup: async (page) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-reading-theme', 'sepia');
      });
      await page.waitForTimeout(500);
    },
  },
  {
    name: 'reading_theme_dyslexia',
    description: 'Dyslexia-friendly reading theme',
    setup: async (page) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-reading-theme', 'dyslexia');
      });
      await page.waitForTimeout(500);
    },
  },
  {
    name: 'color_overlay_blue',
    description: 'Blue Irlen-style color overlay',
    setup: async (page) => {
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-color-overlay', 'blue');
      });
      await page.waitForTimeout(300);
    },
  },
];

function severityOrder(impact) {
  return { critical: 4, serious: 3, moderate: 2, minor: 1 }[impact] ?? 0;
}

function summarizeResults(scenario, axeResult) {
  const violations = axeResult.violations || [];
  const incomplete = axeResult.incomplete || [];
  const byImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  let totalNodes = 0;
  for (const v of violations) {
    byImpact[v.impact] = (byImpact[v.impact] || 0) + 1;
    totalNodes += v.nodes.length;
  }
  return {
    scenario,
    counts: {
      violationRules: violations.length,
      violationNodes: totalNodes,
      incomplete: incomplete.length,
      byImpact,
    },
    violations: violations.map(v => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      helpUrl: v.helpUrl,
      tags: v.tags,
      nodeCount: v.nodes.length,
      nodes: v.nodes.slice(0, 5).map(n => ({
        target: n.target,
        html: (n.html || '').slice(0, 300),
        failureSummary: n.failureSummary,
      })),
    })),
    incomplete: incomplete.map(i => ({
      id: i.id,
      help: i.help,
      nodeCount: i.nodes.length,
    })),
  };
}

async function resetState(page) {
  // Clear all theme-related DOM state so each scenario starts from the baseline.
  await page.evaluate(() => {
    const h = document.documentElement;
    for (const attr of ['data-theme', 'data-reading-theme', 'data-color-overlay']) {
      h.removeAttribute(attr);
    }
    h.classList.remove('theme-dark', 'theme-contrast', 'theme-light');
    try {
      localStorage.removeItem('allo-theme');
      localStorage.removeItem('allo-reading-theme');
      localStorage.removeItem('allo-color-overlay');
    } catch (e) {}
  });
  await page.waitForTimeout(200);
}

async function auditScenario(page, scenario) {
  console.log(`\n[audit] ${scenario.name} — ${scenario.description}`);
  await resetState(page);
  try {
    await scenario.setup(page);
  } catch (e) {
    console.warn(`  setup warning: ${e.message}`);
  }

  // Inject axe-core fresh each scenario (safe — it's idempotent)
  const hasAxe = await page.evaluate(() => !!window.axe);
  if (!hasAxe) {
    await page.addScriptTag({ url: AXE_CDN });
    await page.waitForFunction(() => !!window.axe, null, { timeout: 15000 });
  }

  const result = await page.evaluate(async (cfg) => {
    return await window.axe.run(document, cfg);
  }, AXE_CONFIG);

  const summary = summarizeResults(scenario.name, result);
  console.log(`  violations: ${summary.counts.violationRules} rules, ${summary.counts.violationNodes} nodes`
    + ` (critical:${summary.counts.byImpact.critical} serious:${summary.counts.byImpact.serious} moderate:${summary.counts.byImpact.moderate} minor:${summary.counts.byImpact.minor})`);
  return summary;
}

function buildMarkdown(results, meta) {
  const lines = [];
  lines.push(`# AlloFlow axe-core Audit Report`);
  lines.push('');
  lines.push(`- **Target:** ${meta.url}`);
  lines.push(`- **When:** ${meta.timestamp}`);
  lines.push(`- **axe-core:** ${meta.axeVersion || '4.10.3 (jsDelivr)'}`);
  lines.push(`- **Scenarios audited:** ${results.length}`);
  lines.push('');
  lines.push('## Summary by scenario');
  lines.push('');
  lines.push('| Scenario | Rules | Nodes | Critical | Serious | Moderate | Minor | Incomplete |');
  lines.push('|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const r of results) {
    const c = r.counts;
    lines.push(`| ${r.scenario} | ${c.violationRules} | ${c.violationNodes} | `
      + `${c.byImpact.critical || 0} | ${c.byImpact.serious || 0} | ${c.byImpact.moderate || 0} | ${c.byImpact.minor || 0} | ${c.incomplete} |`);
  }
  lines.push('');

  // Aggregate: rule → total nodes across scenarios + worst impact
  const ruleAgg = new Map();
  for (const r of results) {
    for (const v of r.violations) {
      const e = ruleAgg.get(v.id) || { id: v.id, impact: v.impact, help: v.help, helpUrl: v.helpUrl, nodes: 0, scenarios: new Set() };
      e.nodes += v.nodeCount;
      e.scenarios.add(r.scenario);
      if (severityOrder(v.impact) > severityOrder(e.impact)) e.impact = v.impact;
      ruleAgg.set(v.id, e);
    }
  }
  const ranked = [...ruleAgg.values()].sort((a, b) =>
    (severityOrder(b.impact) - severityOrder(a.impact)) || (b.nodes - a.nodes));

  lines.push('## Rules ranked by severity × impact');
  lines.push('');
  lines.push('| Rule | Impact | Nodes (summed) | Scenarios | Help |');
  lines.push('|---|---|---:|---|---|');
  for (const r of ranked) {
    lines.push(`| \`${r.id}\` | ${r.impact} | ${r.nodes} | ${[...r.scenarios].join(', ')} | [${r.help}](${r.helpUrl}) |`);
  }
  lines.push('');

  lines.push('## Top violations per scenario (first 5 nodes shown)');
  lines.push('');
  for (const r of results) {
    lines.push(`### ${r.scenario}`);
    lines.push('');
    if (!r.violations.length) {
      lines.push('_No violations._');
      lines.push('');
      continue;
    }
    const sorted = [...r.violations].sort((a, b) =>
      (severityOrder(b.impact) - severityOrder(a.impact)) || (b.nodeCount - a.nodeCount));
    for (const v of sorted.slice(0, 10)) {
      lines.push(`#### \`${v.id}\` — ${v.impact} (${v.nodeCount} node${v.nodeCount === 1 ? '' : 's'})`);
      lines.push(`${v.help} — [docs](${v.helpUrl})`);
      lines.push('');
      for (const n of v.nodes) {
        lines.push(`- Target: \`${(n.target || []).join(' >> ')}\``);
        if (n.html) lines.push(`  - HTML: \`${n.html.replace(/`/g, '\\`').slice(0, 200)}\``);
        if (n.failureSummary) lines.push(`  - Failure: ${n.failureSummary.split('\n').join(' ')}`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

async function main() {
  console.log(`[axe-audit] target: ${TARGET_URL}`);
  const browser = await chromium.launch({ headless: !HEADED });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();

  // Forward page console errors for debugging
  page.on('pageerror', err => console.warn('  [page error]', err.message.split('\n')[0]));

  console.log('[axe-audit] navigating...');
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait for AlloModules to populate (signals CDN spokes loaded)
  try {
    await page.waitForFunction(() => window.AlloModules && Object.keys(window.AlloModules).length > 3, null, { timeout: 30000 });
    console.log('[axe-audit] AlloModules loaded');
  } catch {
    console.warn('[axe-audit] AlloModules never populated — auditing anyway (may be degraded)');
  }

  // Give React an extra moment to finish mounting
  await page.waitForTimeout(1500);

  const axeVersion = await page.evaluate(async (url) => {
    const s = document.createElement('script'); s.src = url;
    document.head.appendChild(s);
    await new Promise((res, rej) => { s.onload = res; s.onerror = () => rej(new Error('axe load failed')); });
    return window.axe?.version || '4.10.3';
  }, AXE_CDN);
  console.log(`[axe-audit] axe-core ${axeVersion} loaded`);

  const results = [];
  for (const scenario of SCENARIOS) {
    try {
      const r = await auditScenario(page, scenario);
      results.push(r);
    } catch (e) {
      console.error(`  ✗ scenario ${scenario.name} failed: ${e.message}`);
      results.push({ scenario: scenario.name, error: e.message, counts: { violationRules: 0, violationNodes: 0, incomplete: 0, byImpact: {} }, violations: [], incomplete: [] });
    }
  }

  await browser.close();

  const meta = { url: TARGET_URL, timestamp: new Date().toISOString(), axeVersion };
  fs.writeFileSync(OUT_JSON, JSON.stringify({ meta, results }, null, 2));
  fs.writeFileSync(OUT_MD, buildMarkdown(results, meta));

  console.log(`\n[axe-audit] wrote ${OUT_JSON}`);
  console.log(`[axe-audit] wrote ${OUT_MD}`);
  const totalNodes = results.reduce((s, r) => s + (r.counts?.violationNodes || 0), 0);
  console.log(`[axe-audit] TOTAL violation nodes across all scenarios: ${totalNodes}`);
}

main().catch(e => { console.error(e); process.exit(1); });
