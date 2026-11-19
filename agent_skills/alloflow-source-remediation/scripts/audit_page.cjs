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
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { fileURLToPath, pathToFileURL } = require('node:url');

function normalizeForContainment(p) {
  const resolved = path.resolve(p);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function isWithinRoot(candidatePath, rootRealPath) {
  const normRoot = normalizeForContainment(rootRealPath);
  const normCand = normalizeForContainment(candidatePath);
  const prefix = normRoot.endsWith(path.sep) ? normRoot : normRoot + path.sep;
  return normCand === normRoot || normCand.startsWith(prefix);
}

function isAllowedFileUrl(requestUrl, rootRealPath) {
  try {
    const filePath = fileURLToPath(requestUrl);
    const realTarget = fs.realpathSync(filePath);
    return isWithinRoot(realTarget, rootRealPath);
  } catch (_) {
    return false;
  }
}

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

function browserLaunchOptions() {
  // Leave executablePath unset for Playwright's matching headless shell rather
  // than forcing the separate headed Chromium build returned by executablePath().
  const options = {
    headless: true,
    timeout: 30000,
    args: [
      '--disable-background-networking',
      '--disable-component-update',
      '--webrtc-ip-handling-policy=disable_non_proxied_udp',
      '--force-webrtc-ip-handling-policy',
    ],
  };
  const configured = process.env.ALLOFLOW_CHROMIUM_PATH;
  if (configured) {
    if (!fs.existsSync(configured) || !fs.statSync(configured).isFile()) {
      throw new Error('ALLOFLOW_CHROMIUM_PATH does not identify a local Chromium executable.');
    }
    options.executablePath = path.resolve(configured);
  }
  return options;
}

function resolveAxe() {
  const configured = arg('--axe') || process.env.ALLOFLOW_AXE_PATH;
  const candidates = [
    configured,
    path.resolve(__dirname, '../../../desktop/web-app/public/vendor/axe-core/axe.min.js'),
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
  const resolvedReal = fs.realpathSync(resolved);
  const rootArg = arg('--root');
  const rootReal = fs.realpathSync(rootArg ? path.resolve(rootArg) : path.dirname(resolvedReal));
  if (!isWithinRoot(resolvedReal, rootReal)) {
    output({ ok: false, error: 'Page file escapes the audited root directory.' }, 2);
  }
  const axePath = resolveAxe();

  const loaded = loadPlaywright();
  if (!loaded) output({ ok: false, error: 'A local Playwright or Playwright Core package is required.' }, 2);

  let browser;
  let blockedNetworkRequests = 0;
  try {
    browser = await loaded.api.chromium.launch(browserLaunchOptions());
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
    await context.route('**/*', (route) => {
      const req = route.request();
      const url = req.url();
      if (req.resourceType() === 'script') {
        blockedNetworkRequests += 1;
        return route.abort('blockedbyclient');
      }
      if (url.startsWith('data:') || url.startsWith('blob:') || url === 'about:blank') {
        return route.continue();
      }
      if (url.startsWith('file:')) {
        if (isAllowedFileUrl(url, rootReal)) return route.continue();
        blockedNetworkRequests += 1;
        return route.abort('blockedbyclient');
      }
      blockedNetworkRequests += 1;
      return route.abort('blockedbyclient');
    });
    const page = await context.newPage();
    await page.goto(pathToFileURL(resolvedReal).href, { waitUntil: 'load', timeout: 60000 });

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
        if (el.labels && Array.from(el.labels).some((lbl) => (lbl.textContent || '').trim().length > 0)) return true;
        if ((el.getAttribute('aria-label') || '').trim().length > 0) return true;
        const labelledBy = (el.getAttribute('aria-labelledby') || '').trim();
        if (labelledBy) {
          const ids = labelledBy.split(/\s+/);
          if (ids.some((id) => {
            const ref = document.getElementById(id);
            return ref && (ref.textContent || '').trim().length > 0;
          })) return true;
        }
        if ((el.getAttribute('title') || '').trim().length > 0) return true;
        if (el.tagName === 'INPUT') {
          if (el.type === 'submit' || el.type === 'reset') return true;
          if (el.type === 'button') return (el.getAttribute('value') || '').trim().length > 0;
          if (el.type === 'image') return (el.getAttribute('alt') || '').trim().length > 0;
        }
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
        unlabeledControlTargets: Array.from(document.querySelectorAll('input:not([type=hidden]),select,textarea'))
          .filter(visible)
          .filter((el) => !controlHasName(el))
          .slice(0, 20)
          .map((el) => el.tagName.toLowerCase()
            + (el.type ? '[' + el.type + ']' : '')
            + (el.name ? '[name=' + el.name + ']' : '')
            + (el.id ? '#' + el.id : '')),
        // Form evidence (BAD survey run): radio/checkbox GROUPS need a
        // fieldset+legend to give each control its group context, and a form
        // without a real submit control is keyboard-hostile.
        forms: (() => {
          const groups = {};
          document.querySelectorAll('input[type=radio],input[type=checkbox]').forEach((el) => {
            const key = (el.type || 'radio') + ':' + (el.getAttribute('name') || '(unnamed)');
            (groups[key] = groups[key] || []).push(el);
          });
          const grouped = (el) => {
            const fs = el.closest('fieldset');
            if (fs && fs.querySelector('legend')) return true;
            // ARIA grouping is the legitimate surgical form when the controls
            // live inside a layout table a fieldset cannot wrap.
            const g = el.closest('[role=group],[role=radiogroup]');
            return !!(g && (g.getAttribute('aria-label') || g.getAttribute('aria-labelledby')));
          };
          const ungroupedGroups = Object.entries(groups)
            .filter(([, els]) => els.length >= 2)
            .filter(([, els]) => !els.every(grouped))
            .map(([key, els]) => ({ group: key, controls: els.length }));
          const forms = Array.from(document.querySelectorAll('form')).map((f) => ({
            action: f.getAttribute('action') || '',
            controls: f.querySelectorAll('input:not([type=hidden]),select,textarea').length,
            hasSubmit: !!f.querySelector('input[type=submit],input[type=image],button[type=submit],button:not([type])'),
          }));
          return { count: forms.length, forms, ungroupedGroups };
        })(),
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
        // Exclude disabled native controls and programmatic focus targets
        // (e.g. <main id="main-content" tabindex="-1">) that are not Tab stops
        // by HTML spec.
        const isDisabledControl = (el) => Boolean(
          el.disabled
          || (typeof el.matches === 'function' && el.matches(':disabled'))
        );
        const isProgrammaticFocusTarget = (el) => {
          if (!el.hasAttribute('tabindex')) return false;
          const raw = Number(el.getAttribute('tabindex'));
          if (!Number.isFinite(raw) || raw >= 0) return false;
          if (['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return false;
          if (el.hasAttribute('onclick')) return false;
          return !['button', 'link', 'checkbox', 'tab'].includes((el.getAttribute('role') || '').toLowerCase());
        };
        const els = Array.from(document.querySelectorAll(
          'a[href],button,input:not([type=hidden]),select,textarea,[tabindex],[role=button],[role=link],[role=checkbox],[role=tab],[onclick]'
        )).filter((el) => visible(el) && !isDisabledControl(el) && !isProgrammaticFocusTarget(el));
        els.forEach((el, i) => el.setAttribute('data-allo-kb', String(i)));
        return els.map((el) => ({
          index: el.getAttribute('data-allo-kb'),
          brief: (el.tagName + ' ' + (el.textContent || el.getAttribute('aria-label') || el.getAttribute('name') || '').trim()).slice(0, 60),
        }));
      });
      // Radio-group awareness (E-SRC-4, BAD survey run): Tab reaches ONE
      // member of a same-name radio group by design; the others are arrow-key
      // targets. Compute named radio groups BEFORE the Tab loop so wrapping
      // pages with named radio groups never false-positive as keyboard traps.
      // Unnamed radios (name="") are NOT grouped by browsers and remain
      // individually tabbable.
      const radios = await page.evaluate(() =>
        Array.from(document.querySelectorAll('input[type=radio][data-allo-kb]'))
          .map((el) => ({ mark: el.getAttribute('data-allo-kb'), name: (el.getAttribute('name') || '').trim() })));
      const radioGroupCounts = new Map();
      for (const r of radios) {
        if (r.name) radioGroupCounts.set(r.name, (radioGroupCounts.get(r.name) || 0) + 1);
      }
      let extraGroupedRadios = 0;
      for (const count of radioGroupCounts.values()) {
        if (count > 1) extraGroupedRadios += (count - 1);
      }
      const expectedTabStops = interactive.length > 0
        ? Math.max(1, interactive.length - extraGroupedRadios)
        : 0;

      await page.evaluate(() => { document.body.focus(); });
      const reached = new Set();
      const sequence = [];
      let steps = 0;
      let stepsSinceNewReach = 0;
      let sameMarkStreak = 0;
      let lastMark = null;
      let cycleTrapDetected = false;
      const cap = Math.max(50, interactive.length * 3 + 10);
      if (interactive.length > 0) {
        for (let step = 0; step < cap; step += 1) {
          steps = step + 1;
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
          if (mark === lastMark) {
            sameMarkStreak += 1;
          } else {
            sameMarkStreak = 0;
            lastMark = mark;
          }
          if (!reached.has(mark)) {
            sequence.push(mark);
            reached.add(mark);
            stepsSinceNewReach = 0;
          } else {
            stepsSinceNewReach += 1;
            // If we already reached every expected Tab stop, we completed a normal cycle
            // unless Tab is literally pinned on the exact same control across multiple presses
            // (e.g. a single-control page with preventDefault on Tab).
            if (reached.size >= expectedTabStops) {
              if (sameMarkStreak >= 3) {
                cycleTrapDetected = true;
                break;
              }
              if (sameMarkStreak === 0) break;
            } else {
              // Still missing interactive controls while cycling endlessly inside a reached subset:
              // a real keyboard trap (e.g. a modal or widget that captures Tab).
              const cycleBudget = Math.max(6, reached.size * 2 + 2);
              if (sameMarkStreak >= 3 || stepsSinceNewReach >= cycleBudget) {
                cycleTrapDetected = true;
                break;
              }
            }
          }
        }
      }
      const reachedRadioNames = new Set(radios.filter((r) => r.name && reached.has(r.mark)).map((r) => r.name));
      radios.forEach((r) => { if (r.name && reachedRadioNames.has(r.name)) reached.add(r.mark); });
      const unreachable = interactive.filter((el) => !reached.has(el.index)).map((el) => el.brief);
      const suspectedTrap = interactive.length > 0 && (
        cycleTrapDetected
        || (reached.size < interactive.length && steps >= cap)
      );
      return {
        interactiveElements: interactive.length,
        reached: reached.size,
        unreachable,
        radioGroupAware: true,
        // A trap = focus cycled inside a subset without escaping or remained
        // pinned on a control despite repeated Tab presses.
        suspectedTrap,
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
    const resolvedOut = path.resolve(outPath);
    const outDirReal = fs.realpathSync(path.dirname(resolvedOut));
    const tmpReal = fs.realpathSync(os.tmpdir());
    if (!isWithinRoot(outDirReal, rootReal) && !isWithinRoot(outDirReal, fs.realpathSync(process.cwd())) && !isWithinRoot(outDirReal, tmpReal)) {
      output({ ok: false, error: 'Audit output path escapes the audited root, working directory, and temp directory.' }, 2);
    }
    const finalOutPath = path.join(outDirReal, path.basename(resolvedOut));
    for (const candidateOut of [resolvedOut, finalOutPath]) {
      try {
        if (fs.lstatSync(candidateOut).isSymbolicLink()) {
          output({ ok: false, error: 'Refusing to write audit output through a symbolic link.' }, 2);
        }
      } catch (err) {
        if (!err || err.code !== 'ENOENT') {
          output({ ok: false, error: 'Cannot inspect audit output path: ' + ((err && err.message) || err) }, 2);
        }
      }
    }
    fs.writeFileSync(finalOutPath, JSON.stringify(report, null, 2));
    output(report);
  } catch (error) {
    output({ ok: false, error: String((error && error.message) || error).slice(0, 500), networkPolicy: 'deny' }, 2);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

main();
