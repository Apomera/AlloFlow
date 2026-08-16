// Does the Galaxy Explorer fullscreen button do anything where native fullscreen
// is unavailable?
//
//   node dev-tools/galaxy_fullscreen_check.cjs <out-dir>            (all three modes)
//   node dev-tools/galaxy_fullscreen_check.cjs <out-dir> --mode=blocked
//
// Aaron reported the button as dead. It was: the handler returned silently when
// requestFullscreen was missing, and merely undid its own styling when the request
// was refused — which is what a sandboxed iframe without allow="fullscreen" does,
// and that is how the tool reaches learners on the Canvas surface.
//
// Three surfaces are simulated, because they fail in three different ways:
//   blocked  — no requestFullscreen at all, fullscreenEnabled false (sandboxed embed)
//   reject   — the API exists and the promise rejects (permission refused)
//   throws   — the API exists and throws synchronously (older WebKit)
// In every one the immersive fallback must cover the viewport, offer a visible exit,
// and put the page back on Escape. The frame is MEASURED against the viewport rather
// than checked for a class, since position:fixed silently resolves against any
// transformed ancestor.
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const OUT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '.';
const only = (process.argv.find((a) => a.startsWith('--mode=')) || '').split('=')[1];
const MODES = only ? [only] : ['native', 'blocked', 'reject', 'throws'];

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const three = read('vendor/three-r128/three.min.js');
const tool = read('stem_lab/stem_tool_galaxy.js');
const uiStrings = read('ui_strings.js');

const SHELL = `
window.StemLab = window.StemLab || {};
window.StemLab._registry = window.StemLab._registry || {};
window.StemLab.registerTool = function (id, cfg) { window.StemLab._registry[id] = cfg; };
window.StemLab.findById = function (a, i) { return (a || []).find(function (x) { return x && x.id === i; }) || null; };
window.StemLab.ensureThree = function () { return Promise.resolve(window.THREE); };
window.StemLab.loadScriptResilient = function () { return Promise.resolve(); };
window.StemLab.registerHelper = function () {}; window.StemLab.getHelper = function () { return null; };
window.StemLab.makeBayViewer = function () { return { attach:function(){}, sync:function(){}, nudge:function(){}, zoom:function(){}, reset:function(){}, status:function(){return 'idle';} }; };

window.__mount = function (state) {
  var Icons = new Proxy({}, { get: function () { return function () { return React.createElement('span'); }; } });
  var cfg = window.StemLab._registry.galaxy;
  if (!cfg) { document.getElementById('slot').textContent = 'galaxy tool did not register'; return false; }
  var Host = function () {
    var pair = React.useState({ galaxy: state });
    var ctx = { React: React, toolData: pair[0], setToolData: pair[1], setStemLabTool: function(){},
      setStemLabTab: function(){}, setToolSnapshots: function(){}, addToast: function(){}, announceToSR: function(){},
      awardXP: function(){}, beep: function(){}, celebrate: function(){}, canvasNarrate: function(){}, canvasA11yDesc: function(){},
      callGemini: null, callTTS: null, callImagen: null, callGeminiVision: null, gradeLevel: '5th',
      stemLabTab: 'explore', stemLabTool: null, toolSnapshots: [], props: {}, srOnly: {},
      a11yClick: function (f) { return { onClick: f }; }, icons: Icons,
      t: function (k, fb) {
        var cur = window.__uiStrings, segs = String(k).split('.');
        for (var si = 0; si < segs.length; si++) {
          if (cur == null || typeof cur !== 'object') { cur = null; break; }
          cur = cur[segs[si]];
        }
        if (typeof cur === 'string') return cur;
        return fb != null ? fb : k;
      },
      getXP: function () { return 0; }, update: function(){}, updateMulti: function(){}, tryAward: function(){} };
    return cfg.render(ctx);
  };
  ReactDOM.unmountComponentAtNode(document.getElementById('slot'));
  ReactDOM.render(React.createElement(Host), document.getElementById('slot'));
  return true;
};
`;

const NEWLINE = new RegExp('\r?\n');

const VIEWPORT = { width: 1100, height: 820 };

// The button carries no test hook, so find it the way a learner does — by its
// accessible name, which is what the tool's own i18n produces.
const FS_BUTTON = '[data-galaxy-camera-controls] button[aria-label="Toggle fullscreen"]';

async function runMode(chromium, mode) {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });

  await pg.addInitScript((m) => {
    if (m === 'native') return; // leave the real API alone
    Object.defineProperty(document, 'fullscreenEnabled', { get: () => m !== 'blocked', configurable: true });
    if (m === 'blocked') {
      delete Element.prototype.requestFullscreen;
      delete Element.prototype.webkitRequestFullscreen;
    } else if (m === 'reject') {
      Element.prototype.requestFullscreen = function () { return Promise.reject(new TypeError('permissions check failed')); };
    } else {
      Element.prototype.requestFullscreen = function () { throw new TypeError('fullscreen error'); };
    }
  }, mode);

  const logs = [];
  pg.on('console', (m) => { if (m.type() === 'error') logs.push(m.text().slice(0, 400)); });
  pg.on('pageerror', (e) => logs.push('pageerror: ' + String(e.message).slice(0, 400)));

  const file = path.join(OUT, 'galaxy-fullscreen-' + mode + '.html');
  fs.writeFileSync(file, `<!doctype html><html lang="en"><head><meta charset="utf-8">
<script src="https://cdn.tailwindcss.com"><\/script>
<style>body{margin:0;padding:10px;background:#fff;font-family:system-ui}</style></head>
<body><main id="slot"></main>
<script>${react}<\/script><script>${reactDom}<\/script>
<script>${three}<\/script>
<script>window.__uiStrings = ${uiStrings};<\/script>
<script>${SHELL}<\/script><script>window.React = React;<\/script>
<script>${tool}<\/script></body></html>`, 'utf8');

  await pg.goto('file://' + file.replace(/\\/g, '/'));
  await pg.waitForTimeout(2500);
  await pg.evaluate(() => window.__mount({ simMode: 'galaxy', galaxyType: 'barredSpiral' }));
  await pg.waitForTimeout(3500);

  const measure = () => pg.evaluate(() => {
    const cv = document.querySelector('[data-galaxy-canvas]');
    const frame = cv && cv.parentElement && cv.parentElement.parentElement;
    const r = frame ? frame.getBoundingClientRect() : null;
    return {
      hasToggle: !!(cv && cv._galaxyToggleFullscreen),
      immersive: !!(cv && cv.getAttribute('data-galaxy-immersive')),
      pill: !!document.querySelector('[data-galaxy-exit-immersive]'),
      nativeFs: !!document.fullscreenElement,
      bodyOverflow: document.body.style.overflow,
      rect: r ? { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) } : null,
      canvasBox: cv ? { w: Math.round(cv.getBoundingClientRect().width), h: Math.round(cv.getBoundingClientRect().height) } : null,
      status: (document.querySelector('[data-galaxy-announcer]') || {}).textContent || '',
    };
  });

  const before = await measure();
  const btn = await pg.$(FS_BUTTON);
  if (!btn) { console.log(mode.padEnd(8) + 'FAIL — fullscreen button not found'); await b.close(); return false; }
  // The scene animates, so Playwright's stability check can hang for the full timeout —
  // the same trap the screenshot in galaxy_no_webgl_check hits. A forced click skips
  // actionability while still dispatching a trusted event, which native
  // requestFullscreen needs. Retrying instead of forcing double-fires the toggle.
  await btn.click({ force: true });
  await pg.waitForTimeout(1500);
  const during = await measure();

  // A screenshot of a live WebGL scene can wait forever for the page to go quiet, so
  // it is best-effort: a missing image is not a failed check.
  try {
    await pg.screenshot({ path: path.join(OUT, 'galaxy-fullscreen-' + mode + '.png'), timeout: 8000, animations: 'disabled' });
  } catch (shotError) {
    console.log('          (screenshot skipped: ' + String(shotError.message).split(NEWLINE)[0] + ')');
  }

  // Escape is the interesting exit for the fallback, and it must not leak through to
  // the shell's close-the-tool handler. Headless Chromium has no browser chrome to
  // handle Escape for NATIVE fullscreen, so that mode leaves the same way it came.
  // Exiting needs no user gesture, and a real click cannot be delivered to a headless
  // fullscreen page — so drive the tool's own toggle instead of the button.
  if (mode === 'native') await pg.evaluate(() => document.querySelector('[data-galaxy-canvas]')._galaxyToggleFullscreen());
  else await pg.keyboard.press('Escape');
  await pg.waitForTimeout(700);
  const after = await measure();

  const covers = during.rect
    && Math.abs(during.rect.top) <= 2 && Math.abs(during.rect.left) <= 2
    && Math.abs(during.rect.w - VIEWPORT.width) <= 2
    && Math.abs(during.rect.h - VIEWPORT.height) <= 2;
  const grew = during.canvasBox && before.canvasBox && during.canvasBox.h > before.canvasBox.h;
  const restored = !after.immersive && !after.pill
    && after.rect && Math.abs(after.rect.top - before.rect.top) <= 2
    && Math.abs(after.rect.h - before.rect.h) <= 2
    && after.bodyOverflow === before.bodyOverflow;

  // Native fullscreen must NOT be shouldered aside by the fallback where it works:
  // the browser takes the page over, so there is no pill and no immersive flag.
  // Headless Chromium does not always honour exitFullscreen (there is no browser
  // chrome to leave), so the native restore leg is only asserted when the browser
  // actually left. The fallback modes always assert it — that is the interesting one.
  const nativeStuck = mode === 'native' && after.nativeFs;
  const pass = mode === 'native'
    ? (during.nativeFs && !during.immersive && !during.pill && covers && grew && (nativeStuck || restored))
    : (during.immersive && covers && grew && during.pill && restored);
  console.log(mode.padEnd(8) + (pass ? 'PASS' : 'FAIL') + '  native=' + during.nativeFs
    + '  frame ' + JSON.stringify(before.rect) + ' -> ' + JSON.stringify(during.rect) + ' -> ' + JSON.stringify(after.rect)
    + '\n          canvas ' + JSON.stringify(before.canvasBox) + ' -> ' + JSON.stringify(during.canvasBox)
    + '  covers=' + covers + ' grew=' + grew + ' pill=' + during.pill
    + ' bodyLock=' + JSON.stringify(during.bodyOverflow) + ' restored=' + restored
    + '\n          status: ' + during.status.replace(/\s+/g, ' ').slice(0, 90));
  if (nativeStuck) console.log('          (headless kept the page fullscreen after exitFullscreen; restore leg not exercised)');
  if (logs.length) console.log('          console errors: ' + logs.slice(0, 3).join(' | '));
  await b.close();
  return pass;
}

(async () => {
  const { chromium } = require('playwright');
  let allPass = true;
  for (const mode of MODES) {
    let ok = false;
    try {
      ok = await runMode(chromium, mode);
    } catch (modeError) {
      console.log(mode.padEnd(8) + 'FAIL — ' + String(modeError.message).split(NEWLINE)[0]);
    }
    allPass = allPass && ok;
  }
  console.log('\n' + (allPass ? 'galaxy fullscreen fallback: OK in every blocked mode' : 'galaxy fullscreen fallback: FAILURES above'));
  process.exit(allPass ? 0 : 1);
})();
