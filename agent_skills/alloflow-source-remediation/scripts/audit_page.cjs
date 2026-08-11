'use strict';

/**
 * AlloFlow source remediation: deterministic page audit.
 *
 * Loads a LOCAL page in headless Chromium with http(s) blocked, then records:
 *  - axe-core violations/incomplete (axe injected from a local file);
 *  - a keyboard walk: Tab traversal sequence, interactive elements that are
 *    never reached, and trap detection;
 *  - the structural outline: title, lang, headings, landmarks, images
 *    without alt, form controls without an accessible label;
 *  - a normalized rendered-text digest (the behavior-preservation channel).
 *
 * Same privacy posture as the documents pathway: network policy is deny,
 * blocked requests are counted, nothing leaves the machine.
 *
 * Usage: node audit_page.cjs --html <file> --out <json> [--axe <axe.min.js>]
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function output(value, code = 0) {
  process.stdout.write(JSON.stringify(value, null, 2) + '\n');
  process.exit(code);
}

function loadPlaywright() {
  for (const name of ['playwright', 'playwright-core']) {
    try {
      const candidate = require(name);
      if (candidate && candidate.chromium) return { api: candidate, packageName: name };
    } catch (_) {}
  }
  return null;
}

function executableReady(chromium) {
  try {
    const bundled = chromium.executablePath();
    if (bundled && fs.existsSync(bundled)) return { ready: true, executablePath: bundled };
  } catch (_) {}
  const configured = process.env.ALLOFLOW_CHROMIUM_PATH;
  if (configured && fs.existsSync(configured)) {
    return { ready: true, executablePath: path.resolve(configured) };
  }
  return { ready: false, reason: 'No Chromium executable found (install Playwright browsers or set ALLOFLOW_CHROMIUM_PATH).' };
}

function resolveAxe() {
  const configured = arg('--axe') || process.env.ALLOFLOW_AXE_PATH;
  const candidates = [
    configured,
    path.resolve(process.cwd(), 'node_modules/axe-core/axe.min.js'),
    path.resolve(__dirname, '../../../node_modules/axe-core/axe.min.js'),
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

async function main() {
  const htmlPath = arg('--html');
  const outPath = arg('--out');
  if (!htmlPath || !outPath) {
    output({ ok: false, error: 'Usage: --html <file> --out <json> [--axe <axe.min.js>]' }, 2);
  }
  const resolved = path.resolve(htmlPath);
  if (!fs.existsSync(resolved)) output({ ok: false, error: 'Page file does not exist: ' + path.basename(resolved) }, 2);
  const axePath = resolveAxe();

  const loaded = loadPlaywright();
  if (!loaded) output({ ok: false, error: 'A local Playwright or Playwright Core package is required.' }, 2);
  const executable = executableReady(loaded.api.chromium);
  if (!executable.ready) output({ ok: false, error: executable.reason }, 2);

  let browser;
  let blockedNetworkRequests = 0;
  try {
    browser = await loaded.api.chromium.launch({
      headless: true,
      executablePath: executable.executablePath,
      args: ['--disable-background-networking', '--disable-component-update'],
    });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.route(/^https?:/, (route) => { blockedNetworkRequests += 1; route.abort(); });
    const page = await context.newPage();
    await page.goto('file://' + resolved.replace(/\\/g, '/'), { waitUntil: 'load', timeout: 60000 });

    let axeReport = { available: false, violations: [], incomplete: 0 };
    if (axePath) {
      await page.addScriptTag({ content: fs.readFileSync(axePath, 'utf8') });
      const raw = await page.evaluate(async () => {
        const result = await window.axe.run(document, { resultTypes: ['violations', 'incomplete'] });
        return {
          violations: result.violations.map((v) => ({
            id: v.id,
            impact: v.impact || null,
            helpUrl: v.helpUrl || null,
            wcag: (v.tags || []).filter((t) => /^wcag\d+$/.test(t)),
            nodes: v.nodes.length,
            // First few node selectors: a violation report an author cannot
            // LOCATE from is not evidence, it is homework (W3C BAD run:
            // "image-alt x33" was unactionable without targets).
            targets: v.nodes.slice(0, 8).map((n) => (n.target || []).join(' ')),
          })),
          incomplete: result.incomplete.length,
        };
      });
      axeReport = { available: true, ...raw };
    }

    const outline = await page.evaluate(() => {
      const visible = (el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
      };
      const controlHasName = (el) => {
        if (el.labels && el.labels.length) return true;
        if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title')) return true;
        if (el.tagName === 'INPUT' && ['submit', 'button', 'reset'].includes(el.type)) return true;
        return false;
      };
      return {
        title: document.title || '',
        lang: document.documentElement.getAttribute('lang') || '',
        headings: Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6'))
          .filter(visible)
          .map((h) => ({ level: Number(h.tagName[1]), text: h.textContent.trim().slice(0, 80) })),
        landmarks: Array.from(document.querySelectorAll('main,nav,header,footer,aside,[role=main],[role=navigation],[role=banner],[role=contentinfo]'))
          .map((l) => l.tagName.toLowerCase() + (l.getAttribute('role') ? '[' + l.getAttribute('role') + ']' : '')),
        imagesWithoutAlt: Array.from(document.querySelectorAll('img:not([alt])')).filter(visible).length,
        unlabeledControls: Array.from(document.querySelectorAll('input:not([type=hidden]),select,textarea'))
          .filter(visible)
          .filter((el) => !controlHasName(el)).length,
      };
    });

    const keyboard = await (async () => {
      const interactive = await page.evaluate(() => {
        const visible = (el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
        };
        // [onclick] matters: a click-only div carries no role or tabindex, so a
        // selector of "proper" interactive elements never sees it — the exact
        // reason it is invisible to keyboard users. Counting click affordances
        // as interactive is what lets the walk report them as unreachable.
        const els = Array.from(document.querySelectorAll(
          'a[href],button,input:not([type=hidden]),select,textarea,[tabindex],[role=button],[role=link],[role=checkbox],[role=tab],[onclick]'
        )).filter(visible);
        els.forEach((el, i) => el.setAttribute('data-allo-kb', String(i)));
        return els.map((el) => ({
          index: el.getAttribute('data-allo-kb'),
          brief: (el.tagName + ' ' + (el.textContent || el.getAttribute('aria-label') || el.getAttribute('name') || '').trim()).slice(0, 60),
        }));
      });
      await page.evaluate(() => { document.body.focus(); });
      const reached = new Set();
      const sequence = [];
      const cap = Math.max(50, interactive.length * 3 + 10);
      for (let step = 0; step < cap; step += 1) {
        await page.keyboard.press('Tab');
        const mark = await page.evaluate(() => {
          const el = document.activeElement;
          return el && el.getAttribute ? el.getAttribute('data-allo-kb') : null;
        });
        if (mark === null) {
          // Focus left the tracked set (browser chrome wrap-around) — one full cycle done.
          if (sequence.length) break;
          continue;
        }
        if (reached.has(mark) && sequence.length >= interactive.length) break;
        if (!reached.has(mark)) sequence.push(mark);
        reached.add(mark);
      }
      const unreachable = interactive.filter((el) => !reached.has(el.index)).map((el) => el.brief);
      return {
        interactiveElements: interactive.length,
        reached: reached.size,
        unreachable,
        // A trap = the walk burned its whole budget without covering the set
        // or cycling out; distinct from simply-unreachable elements.
        suspectedTrap: reached.size < interactive.length && sequence.length >= cap - 1,
      };
    })();

    const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());
    const textDigest = crypto.createHash('sha256').update(text, 'utf8').digest('hex');

    const report = {
      ok: true,
      page: path.basename(resolved),
      audit: {
        axe: axeReport,
        keyboard,
        outline,
        text: { sha256: textDigest, chars: text.length },
      },
      blockedNetworkRequests,
      networkPolicy: 'deny',
      note: 'axe automates only part of WCAG; keyboard reachability is evidence, not usability judgement. A person must still operate the page.',
      createdAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    };
    fs.writeFileSync(path.resolve(outPath), JSON.stringify(report, null, 2));
    output(report);
  } catch (error) {
    output({ ok: false, error: String((error && error.message) || error).slice(0, 500), networkPolicy: 'deny' }, 2);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

main();
