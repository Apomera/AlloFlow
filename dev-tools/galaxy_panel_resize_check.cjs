// Can a learner adjust the Galaxy fullscreen layout, and does the scene follow?
//
//   node dev-tools/galaxy_panel_resize_check.cjs <out-dir>
//   node dev-tools/galaxy_panel_resize_check.cjs <out-dir> --selftest
//
// Fullscreen used to hand the whole screen to a two-column grid that still spent
// 360px on the settings column, so the scene rendered into a fraction of the
// display, inset from the corner. The fix collapses that grid, and the panel is
// now optional and resizable rather than a fixed 360px.
//
// galaxy_fullscreen_check measures the FRAME. That is how the original defect hid:
// the frame covered the viewport perfectly while the canvas inside it did not. So
// this gate measures the CANVAS and the PANEL, and asserts the three columns
// account for the whole viewport - a split that loses width is a split that is
// hiding some of the scene.
//
// Every assertion is a geometry measurement, never a class or attribute check: the
// panel width is a CSS custom property read by a grid template, and any ancestor
// with a transform would leave the real boxes somewhere other than where the
// attributes claim.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const OUT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '.';
const SELFTEST = process.argv.includes('--selftest');

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const react = read('desktop/web-app/node_modules/react/umd/react.production.min.js');
const reactDom = read('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js');
const three = read('vendor/three-r128/three.min.js');
const uiStrings = read('ui_strings.js');
// Reuse the sibling gate's host stub rather than keeping a second copy in sync. A
// partial stub is worse than none: it invents crashes the real host never has.
const SHELL = read('dev-tools/galaxy_fullscreen_check.cjs').split('const SHELL = `')[1].split('\n`;')[0];

const VIEWPORT = { width: 1280, height: 800 };
const FS_BUTTON = '[data-galaxy-camera-controls] button[aria-label="Toggle fullscreen"]';
const PANEL_BTN = '[data-galaxy-fullscreen-panel]';
const HANDLE = '[data-galaxy-panel-resizer]';
// Matches GALAXY_PANEL_MIN / GALAXY_PANEL_MAX_FRAC in the tool.
const MIN = 240;
const MAX = Math.round(VIEWPORT.width * 0.6);

function buildPage(tool) {
  const file = path.join(OUT, 'galaxy-panel-resize.html');
  fs.writeFileSync(file, '<!doctype html><html lang="en"><head><meta charset="utf-8">\n'
    + '<script src="https://cdn.tailwindcss.com"><\/script>\n'
    + '<style>body{margin:0;padding:10px;background:#fff;font-family:system-ui}</style></head>\n'
    + '<body><main id="slot"></main>\n'
    + '<script>' + react + '<\/script><script>' + reactDom + '<\/script><script>' + three + '<\/script>\n'
    + '<script>window.__uiStrings = ' + uiStrings + ';<\/script>\n'
    + '<script>' + SHELL + '<\/script><script>window.React = React;<\/script>\n'
    + '<script>' + tool + '<\/script></body></html>', 'utf8');
  return file;
}

async function run(chromium, tool, label) {
  const checks = [];
  const ok = (name, pass, detail) => { checks.push({ name, pass, detail }); return pass; };
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const errs = [];
  pg.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)));

  try {
    await pg.goto('file://' + buildPage(tool).split(path.sep).join('/'));
    await pg.waitForTimeout(2500);
    await pg.evaluate(() => window.__mount({ simMode: 'galaxy', galaxyType: 'barredSpiral' }));
    await pg.waitForTimeout(4000);

    const measure = () => pg.evaluate(() => {
      const cv = document.querySelector('[data-galaxy-canvas]');
      if (!cv) return null;
      const stage = cv.parentElement, ws = stage && stage.parentElement;
      const aside = ws && ws.querySelector('[data-galaxy-controls]');
      const handle = ws && ws.querySelector('[data-galaxy-panel-resizer]');
      const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top) }; };
      const shown = (el) => !!el && getComputedStyle(el).display !== 'none';
      return {
        canvas: box(cv), aside: box(aside), handle: box(handle),
        asideShown: shown(aside), handleShown: shown(handle),
        panelBtn: !!document.querySelector('[data-galaxy-fullscreen-panel]'),
        valuenow: handle ? Number(handle.getAttribute('aria-valuenow')) : null,
        buffer: { w: cv.width, h: cv.height },
        nativeFs: !!document.fullscreenElement,
        viewport: { w: window.innerWidth, h: window.innerHeight },
      };
    });

    const before = await measure();
    if (!before) { ok('tool rendered', false, 'no galaxy canvas'); throw new Error('no canvas'); }
    ok('panel toggle hidden outside fullscreen', !before.panelBtn,
      'a control that does nothing on the normal page is worse than none');

    const fsBtn = await pg.$(FS_BUTTON);
    if (!fsBtn) { ok('fullscreen button present', false, 'not found'); throw new Error('no fs button'); }
    await fsBtn.click({ force: true });
    // Poll rather than sleep: the toggle must appear WITH the view, and a generous
    // fixed wait would hide a regression that delays it by a poll interval.
    let appeared = -1;
    for (let i = 1; i <= 12; i++) {
      await pg.waitForTimeout(250);
      if (await pg.$(PANEL_BTN)) { appeared = i * 250; break; }
    }
    ok('panel toggle appears with fullscreen (<=750ms)', appeared >= 0 && appeared <= 750,
      appeared < 0 ? 'never appeared' : 'appeared after ' + appeared + 'ms');

    const full = await measure();
    // THE original defect: frame covered the viewport, canvas did not.
    ok('scene fills the screen with panel hidden',
      !!full.canvas && Math.abs(full.canvas.w - VIEWPORT.width) <= 2 && Math.abs(full.canvas.h - VIEWPORT.height) <= 2
        && Math.abs(full.canvas.left) <= 2 && Math.abs(full.canvas.top) <= 2,
      'canvas ' + JSON.stringify(full.canvas) + ' vs viewport ' + JSON.stringify(full.viewport));
    ok('settings column hidden with panel off', !full.asideShown, 'aside ' + JSON.stringify(full.aside));

    if (appeared < 0) throw new Error('no panel toggle');
    await (await pg.$(PANEL_BTN)).click({ force: true });
    await pg.waitForTimeout(1000);
    const shown = await measure();
    ok('settings column returns on request', shown.asideShown && shown.aside.w > 0, 'aside ' + JSON.stringify(shown.aside));
    ok('resize handle appears with the panel', shown.handleShown && shown.handle.w > 0, 'handle ' + JSON.stringify(shown.handle));
    // A split that does not account for the full width is hiding part of the scene.
    const sum = (m) => m.canvas.w + m.handle.w + m.aside.w;
    ok('columns account for the whole viewport', Math.abs(sum(shown) - VIEWPORT.width) <= 2,
      'canvas+handle+aside=' + sum(shown) + ' vs ' + VIEWPORT.width);
    ok('both columns use the full height',
      Math.abs(shown.canvas.h - VIEWPORT.height) <= 2 && Math.abs(shown.aside.h - VIEWPORT.height) <= 2,
      'canvas h=' + shown.canvas.h + ' aside h=' + shown.aside.h);

    // A real drag, not a synthetic width write: a resizer that only answers to
    // setState is not a resizer.
    const dragTo = async (toX) => {
      const box = await (await pg.$(HANDLE)).boundingBox();
      const y = box.y + box.height / 2;
      await pg.mouse.move(box.x + box.width / 2, y);
      await pg.mouse.down();
      await pg.mouse.move(toX, y, { steps: 12 });
      await pg.mouse.up();
      await pg.waitForTimeout(450);
    };

    await dragTo(700);
    const wide = await measure();
    ok('drag widens the panel', wide.aside.w > shown.aside.w + 40,
      shown.aside.w + 'px -> ' + wide.aside.w + 'px');
    ok('drag keeps the columns accounting for the viewport', Math.abs(sum(wide) - VIEWPORT.width) <= 2, 'sum=' + sum(wide));
    ok('WebGL buffer follows the drag', wide.buffer.w === wide.canvas.w,
      'buffer ' + wide.buffer.w + ' vs canvas ' + wide.canvas.w);

    // Both clamps. Overshooting the min would leave no handle to grab again;
    // overshooting the max would bury the scene the tool exists to show.
    await dragTo(VIEWPORT.width - 20);
    const min = await measure();
    ok('panel clamps at its minimum', min.aside.w === MIN, 'aside=' + min.aside.w + ' expected ' + MIN);
    await dragTo(20);
    const max = await measure();
    ok('panel clamps at its maximum', max.aside.w === MAX, 'aside=' + max.aside.w + ' expected ' + MAX);
    ok('scene survives the widest panel', max.canvas.w > 200, 'canvas=' + max.canvas.w);

    // Keyboard. A col-resize drag is unusable for anyone who cannot hold and move
    // a mouse, so the handle must resize without one. Reset first: at a clamp the
    // step in that direction is legitimately a no-op and would read as a failure.
    await pg.dblclick(HANDLE);
    await pg.waitForTimeout(400);
    const reset = await measure();
    ok('double-click resets the split', reset.aside.w === 360, 'aside=' + reset.aside.w);

    await pg.focus(HANDLE);
    await pg.keyboard.press('ArrowLeft');
    await pg.waitForTimeout(300);
    const kbd = await measure();
    ok('arrow key widens the panel', kbd.aside.w === reset.aside.w + 16,
      reset.aside.w + ' -> ' + kbd.aside.w + ' (expected +16)');
    await pg.keyboard.down('Shift'); await pg.keyboard.press('ArrowLeft'); await pg.keyboard.up('Shift');
    await pg.waitForTimeout(300);
    const kbdBig = await measure();
    ok('shift+arrow takes a bigger step', kbdBig.aside.w === kbd.aside.w + 64,
      kbd.aside.w + ' -> ' + kbdBig.aside.w + ' (expected +64)');
    ok('handle reports its value to assistive tech', kbdBig.valuenow === kbdBig.aside.w,
      'aria-valuenow=' + kbdBig.valuenow + ' aside=' + kbdBig.aside.w);

    // Leaving fullscreen must put the page back; a stranded fixed, full-viewport
    // container with a locked body scroll is the failure this replaces.
    await pg.evaluate(() => document.querySelector('[data-galaxy-canvas]')._galaxyToggleFullscreen());
    await pg.waitForTimeout(900);
    const after = await measure();
    ok('layout restored on exit',
      Math.abs(after.canvas.w - before.canvas.w) <= 2 && Math.abs(after.canvas.h - before.canvas.h) <= 2,
      JSON.stringify(before.canvas) + ' -> ' + JSON.stringify(after.canvas));
    ok('handle hidden again outside fullscreen', !after.handleShown, 'handleShown=' + after.handleShown);
    ok('no console errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  } catch (e) {
    checks.push({ name: 'run completed', pass: false, detail: String(e.message).split(/\r?\n/)[0] });
  }
  await b.close();

  const failed = checks.filter((c) => !c.pass);
  console.log('\n— ' + label + ' —');
  for (const c of checks) console.log('  ' + (c.pass ? 'ok  ' : 'FAIL') + '  ' + c.name + (c.pass ? '' : '   [' + c.detail + ']'));
  console.log('  ' + (checks.length - failed.length) + '/' + checks.length + ' passed');
  return { pass: failed.length === 0, failed: failed.length, total: checks.length };
}

(async () => {
  const { chromium } = require('playwright');
  const tool = read('stem_lab/stem_tool_galaxy.js');
  const real = await run(chromium, tool, 'stem_lab/stem_tool_galaxy.js');

  if (!SELFTEST) {
    console.log('\n' + (real.pass ? 'galaxy panel + resize: OK' : 'galaxy panel + resize: FAILURES above'));
    process.exit(real.pass ? 0 : 1);
  }

  // A gate that cannot fail is worse than none. Reinstate the original defect —
  // the fullscreen grid keeping its 360px settings column — and require a red.
  console.log('\n=== selftest: reinstating the original defect ===');
  const marker = "[data-galaxy-workspace][data-galaxy-fullscreen=true][data-galaxy-sidebar=hidden] { grid-template-columns: minmax(0, 1fr) !important;";
  if (tool.indexOf(marker) < 0) {
    console.log('SELFTEST INCONCLUSIVE — the collapse rule this mutates was not found; update the marker.');
    process.exit(1);
  }
  const broken = tool.replace(marker, "[data-galaxy-workspace][data-galaxy-fullscreen=true][data-galaxy-sidebar=hidden] { grid-template-columns: minmax(0, 1fr) 360px !important;");
  const mutated = await run(chromium, broken, 'MUTATED (360px column restored)');
  const good = !mutated.pass;
  console.log('\nselftest: ' + (good ? 'PASS — the gate goes red on the real defect' : 'FAIL — the gate stayed green with the defect reinstated'));
  console.log(real.pass ? 'live tool: OK' : 'live tool: FAILURES above');
  process.exit(good && real.pass ? 0 : 1);
})();
