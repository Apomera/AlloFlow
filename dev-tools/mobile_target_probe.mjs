// Phone-sized checks, in a real browser. A classroom tool is used on phones and
// small tablets, and none of the harnesses so far have looked below 900px.
//
//   - horizontal overflow: the page must not scroll sideways
//   - tap targets: WCAG 2.5.5 wants 44x44 CSS px for anything you tap
//   - clipped text: a label whose scrollWidth exceeds its clientWidth is cut off
//   - touchstart handlers that preventDefault, which kills scrolling on touch
import { chromium, devices } from 'playwright';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const TOOL_ID = args[0];
if (!TOOL_ID) {
  console.error('usage: node dev-tools/mobile_target_probe.mjs <toolId> [tab,tab,...]');
  process.exit(2);
}
const ROOT = process.cwd();
const toolPath = resolve(ROOT, 'stem_lab/stem_tool_' + TOOL_ID + '.js');
if (!existsSync(toolPath)) { console.error('no such tool: ' + toolPath); process.exit(2); }
const TABS = args[1] ? args[1].split(',') : [null];
const browser = await chromium.launch();
let problems = 0;

for (const tab of TABS) {
  const ctxb = await browser.newContext(Object.assign({}, devices['iPhone 12'], { isMobile: true, hasTouch: true }));
  const page = await ctxb.newPage();
  page.on('pageerror', (e) => console.error('[pageerror ' + tab + '] ' + String(e).slice(0, 160)));

  // The real tool ships its own CSS inside the module; Tailwind supplies the
  // utility classes the markup also uses.
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>body{margin:0;padding:8px;background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif}
  .space-y-3>*+*{margin-top:.75rem}.space-y-2>*+*{margin-top:.5rem}.space-y-4>*+*{margin-top:1rem}</style>
  </head><body><div id="root"></div></body></html>`, { waitUntil: 'domcontentloaded' });

  await page.evaluate(() => {
    window.AlloIcons = new Proxy({}, {
      get: () => function Icon() { return window.React.createElement('span', { 'aria-hidden': 'true' }, '\u25AA'); }, has: () => true
    });
    // Record any touchstart listener that blocks the default action.
    window.__touchBlockers = [];
    const add = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, fn, opts) {
      if (type === 'touchstart' || type === 'touchmove') {
        const passive = opts && typeof opts === 'object' ? opts.passive : undefined;
        window.__touchBlockers.push({
          type,
          passive: passive === true,
          node: (this.tagName || this.constructor.name || '?') + (this.className ? '.' + String(this.className).slice(0, 30) : '')
        });
      }
      return add.call(this, type, fn, opts);
    };
  });
  await page.addScriptTag({ path: resolve(ROOT, 'desktop/web-app/node_modules/react/umd/react.development.js') });
  await page.addScriptTag({ path: resolve(ROOT, 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js') });
  await page.addScriptTag({ path: toolPath });
  const started = await page.evaluate(({ toolId, tab }) => {
    // The id a tool registers under is not always its file name:
    // stem_tool_watercycle.js registers 'waterCycle'.
    const reg = (window.StemLab && window.StemLab._registry) || {};
    const ids = Object.keys(reg);
    const key = reg[toolId] ? toolId
      : ids.find((k) => k.toLowerCase() === String(toolId).toLowerCase())
      || (ids.length === 1 ? ids[0] : null);
    const tool = key && reg[key];
    if (!tool) return 'tool did not register (registry has: ' + (ids.join(', ') || 'nothing') + ')';
    let store = { [key]: Object.assign({ selectedSpecies: 'canada_goose' }, tab ? { tab } : {}) };
    let setTick = null;
    const ctx = {
      React: window.React, get toolData() { return store; },
      update: (t, k, v) => { store = { ...store, [t]: { ...store[t], [k]: v } }; setTick && setTick((n) => n + 1); },
      updateMulti: (t, o) => { store = { ...store, [t]: { ...store[t], ...o } }; setTick && setTick((n) => n + 1); },
      addToast: () => {}, announceToSR: () => {}, t: (k, fb) => (fb == null ? k : fb),
      isDark: true, setStemLabTool: () => {}, awardXP: () => {}, beep: () => {}, icons: window.AlloIcons
    };
    function Host() { const [, tick] = window.React.useState(0); setTick = tick; return tool.render(ctx); }
    try { window.ReactDOM.render(window.React.createElement(Host), document.getElementById('root')); }
    catch (e) { return 'render threw: ' + String(e).slice(0, 160); }
    return 'ok';
  }, { toolId: TOOL_ID, tab });
  if (started !== 'ok') { console.error(String(tab || 'default') + ': ' + started); problems++; await ctxb.close(); continue; }
  await page.waitForTimeout(900);

  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const overflowBy = Math.max(0, document.documentElement.scrollWidth - vw);
    const wide = [];
    for (const el of document.querySelectorAll('#root *')) {
      const b = el.getBoundingClientRect();
      if (b.width > 0 && b.right > vw + 1) {
        const cs = getComputedStyle(el);
        // An element inside a deliberate horizontal scroller is fine.
        let p = el.parentElement, scroller = false;
        while (p && p.id !== 'root') {
          const pcs = getComputedStyle(p);
          if (pcs.overflowX === 'auto' || pcs.overflowX === 'scroll') { scroller = true; break; }
          p = p.parentElement;
        }
        if (!scroller && cs.position !== 'fixed') {
          wide.push(el.tagName + (el.className ? '.' + String(el.className).slice(0, 34) : '') + ' right=' + Math.round(b.right));
        }
      }
    }
    const small = [];
    for (const el of document.querySelectorAll('button,a[href],input,select,textarea,[role="button"],[role="tab"]')) {
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) continue;
      // WCAG 2.5.8 Target Size (Minimum), AA in WCAG 2.2, is 24x24 CSS px.
      // 44x44 is 2.5.5 (AAA) and the comfortable bar for a primary control; a
      // checkbox at 28 is fine and a 44px one would be absurd.
      const floor = el.tagName === 'INPUT' && el.getAttribute('type') === 'checkbox' ? 24 : 44;
      if (b.width < floor || b.height < floor) {
        small.push({
          label: ((el.textContent || el.getAttribute('aria-label') || el.tagName) + '').trim().replace(/\s+/g, ' ').slice(0, 30),
          w: Math.round(b.width), h: Math.round(b.height)
        });
      }
    }
    const clipped = [];
    for (const el of document.querySelectorAll('#root *')) {
      if (el.children.length) continue;
      const cs = getComputedStyle(el);
      if (cs.overflow === 'visible' || cs.textOverflow === 'ellipsis') continue;
      if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) {
        clipped.push(((el.textContent || '') + '').trim().slice(0, 34) + ' (' + el.scrollWidth + '>' + el.clientWidth + ')');
      }
    }
    const blockers = (window.__touchBlockers || []).filter((b) => !b.passive);
    return { vw, overflowBy, wide: wide.slice(0, 5), wideN: wide.length, small, clipped: clipped.slice(0, 4), clippedN: clipped.length, blockers: blockers.length };
  });

  const bad = r.overflowBy > 1 || r.wideN > 0 || r.small.length > 0;
  if (bad) problems++;
  console.log((bad ? '! ' : '  ') + String(tab || 'default').padEnd(11) +
    'overflow ' + String(r.overflowBy).padStart(3) + 'px' +
    '  wide-elems ' + String(r.wideN).padStart(2) +
    '  small-taps ' + String(r.small.length).padStart(2) +
    '  clipped ' + String(r.clippedN).padStart(2) +
    '  non-passive-touch ' + r.blockers);
  for (const w of r.wide) console.log('      wide: ' + w);
  for (const s of r.small.slice(0, 6)) console.log('      tap ' + s.w + 'x' + s.h + '  "' + s.label + '"');
  if (r.small.length > 6) console.log('      ... and ' + (r.small.length - 6) + ' more small targets');
  await ctxb.close();
}
await browser.close();
console.log('\n' + (problems ? problems + ' tab(s) with mobile findings' : 'no mobile findings'));
