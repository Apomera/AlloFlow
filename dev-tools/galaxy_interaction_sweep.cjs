// Click every control in every Galaxy mode and watch for runtime errors.
//   node dev-tools/galaxy_interaction_sweep.cjs <out-dir>
//
// Render checks prove a mode DRAWS; this proves its controls can be USED. Every
// non-disabled button is clicked, every range driven to min / max / middle, every
// select cycled, every checkbox toggled and every text field filled, while pageerror,
// console.error and React warnings are collected and charged to the control that was
// just touched. A handler that throws on the third option, a slider whose minimum
// produces NaN, a click on a stale closure - none of those are visible to a render gate.
//
// Baseline 2026-09-04: 316 controls, the tool's own 255 across eight modes clean. The
// eight findings in Real Sky are all inside Aladin Lite's injected panels (its search
// form, projection picker, symbol select, and the `size` / `opacity` sliders) failing
// with no HiPS server reachable - third-party, not this tool's markup. Two are worth
// knowing about because they are UNCAUGHT and reachable by a real user: Aladin's own
// `size` slider at its minimum passes a negative radius to canvas arc(), and its
// `opacity` slider throws when no overlay layer has loaded.
//
// ★ Controls that LEAVE the mode under test are skipped (mode tabs, the Real Sky
// launcher, "Back to tools", the cross-tool links). Before that skip existed, clicking
// the launcher mid-sweep switched to Real Sky and every later index landed on Aladin's
// controls, so its offline errors were charged to whatever galaxy button the sweep
// happened to be on. Attribution is only as good as the mode staying put.
// ★ Controls are re-queried by index before each action; the tree re-renders on
// every click and a stale handle would act on a detached node.
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const OUT = process.argv[2];
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const src = read('dev-tools/galaxy_core_clipping.cjs');
const SHELL = src.slice(src.indexOf('const SHELL = `') + 15, src.indexOf('`;\n\n(async'));
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const three = read('vendor/three-r128/three.min.js');
const tool = read('stem_lab/stem_tool_galaxy.js');
const uiStrings = read('ui_strings.js');

const MODES = [
  ['galaxy-view', { simMode: 'galaxy', galaxyControlPanel: 'view' }],
  ['galaxy-motion', { simMode: 'galaxy', galaxyControlPanel: 'motion' }],
  ['galaxy-time', { simMode: 'galaxy', galaxyControlPanel: 'time' }],
  ['galaxy-discover', { simMode: 'galaxy', galaxyControlPanel: 'discover' }],
  ['blackHole', { simMode: 'blackHole' }],
  ['star', { simMode: 'star' }],
  ['metalHunt', { simMode: 'metalHunt' }],
  ['quiz', { simMode: 'galaxy', quizMode: true }],
  ['realSky', { simMode: 'realSky' }],
];

const NOISE = /CORS|ERR_FAILED|Failed to load resource|mirrors urls|alasky|casda|net::/;

(async () => {
  const { chromium } = require('playwright');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1180, height: 1600 }, deviceScaleFactor: 1 });
  await pg.addInitScript(() => { let s = 1337; Math.random = () => { s = (1103515245 * s + 12345) % 2147483648; return s / 2147483648; }; });
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, 'click.html');
  fs.writeFileSync(file, '<!doctype html><html lang="en"><head><meta charset="utf-8">'
    + '<script src="https://cdn.tailwindcss.com"><\/script>'
    + '<style>body{margin:0;padding:10px;background:#fff;font-family:system-ui}</style></head>'
    + '<body><main id="slot"></main>'
    + '<script>' + react + '<\/script><script>' + reactDom + '<\/script><script>' + three + '<\/script>'
    + '<script>window.__uiStrings = ' + uiStrings + ';<\/script>'
    + '<script>' + SHELL + '<\/script><script>window.React = React;<\/script>'
    + '<script>' + tool + '<\/script></body></html>', 'utf8');
  await pg.goto('file:///' + path.resolve(file).split(path.sep).join('/'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await pg.waitForTimeout(2400);

  let errors = [];
  const push = (kind, t) => { if (!NOISE.test(t)) errors.push(kind + ': ' + t.split('\n')[0].slice(0, 160)); };
  pg.on('pageerror', (e) => push('pageerror', String(e)));
  pg.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error') push('console.error', t);
    else if (m.type() === 'warning' && /React|Warning:|Each child|key/.test(t)) push('react', t);
  });

  const lines = ['Interaction sweep - every control, every mode', ''];
  let totalControls = 0, totalFindings = 0;

  for (const [name, state] of MODES) {
    await pg.evaluate((st) => { window.__mount(st); document.querySelectorAll('details').forEach((d) => { d.open = true; }); }, state);
    await pg.waitForTimeout(3200);
    errors = [];
    const findings = [];

    // Inventory once; controls are re-queried by index before each action because the
    // tree re-renders after every click.
    const count = await pg.evaluate(() => document.querySelectorAll('#slot button:not([disabled]), #slot input, #slot select').length);
    totalControls += count;

    for (let i = 0; i < count; i += 1) {
      const before = errors.length;
      const label = await pg.evaluate((idx) => {
        const els = document.querySelectorAll('#slot button:not([disabled]), #slot input, #slot select');
        const el = els[idx];
        if (!el) return null;
        const desc = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || el.name || el.type || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 44);
        const tag = el.tagName.toLowerCase();
        const type = (el.getAttribute('type') || '').toLowerCase();
        // Mode-switching tabs and disclosure summaries would leave the mode under test;
        // they are exercised by mounting each mode directly.
        if (el.hasAttribute('data-galaxy-mode')) return { skip: true, desc };
        if (/Open the Real Sky Atlas|Back to tools|Open atlas|Astronomy|Universe|Data Lab/i.test(desc)) return { skip: true, desc };
        // Snapshot / copy / download touch host callbacks the shell stubs; still click
        // them, since a throw there is exactly the kind of thing this looks for.
        try {
          if (tag === 'button') { el.click(); }
          else if (tag === 'select') {
            const opts = Array.from(el.options);
            const next = opts[(el.selectedIndex + 1) % Math.max(1, opts.length)];
            if (next) { el.value = next.value; el.dispatchEvent(new Event('change', { bubbles: true })); }
          } else if (type === 'range') {
            const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
            for (const v of [el.min, el.max, String((parseFloat(el.min) + parseFloat(el.max)) / 2)]) {
              set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
            }
          } else if (type === 'checkbox' || type === 'radio') { el.click(); }
          else if (tag === 'input' || tag === 'textarea') {
            const set = Object.getOwnPropertyDescriptor(el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set;
            set.call(el, 'probe text that is long enough to count'); el.dispatchEvent(new Event('input', { bubbles: true }));
          }
        } catch (e) { return { threw: String(e).slice(0, 120), desc, tag }; }
        return { desc, tag, type };
      }, i);
      await pg.waitForTimeout(140);
      if (!label || label.skip) continue;
      if (label.threw) { findings.push('THREW  [' + label.tag + '] "' + label.desc + '" -> ' + label.threw); continue; }
      const fresh = errors.slice(before);
      if (fresh.length) findings.push('[' + label.tag + (label.type ? ':' + label.type : '') + '] "' + label.desc + '" -> ' + fresh.join(' || '));
    }
    totalFindings += findings.length;
    lines.push('## ' + name.padEnd(16) + ' controls=' + String(count).padStart(3) + '  findings=' + findings.length);
    for (const f of findings) lines.push('   ' + f);
  }

  lines.push('');
  lines.push('controls exercised: ' + totalControls + '   findings: ' + totalFindings);
  fs.writeFileSync(path.join(OUT, 'click-sweep.txt'), lines.join('\n'), 'utf8');
  console.log(lines.join('\n'));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
