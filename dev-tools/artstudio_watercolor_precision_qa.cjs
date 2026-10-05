'use strict';

// Real Chromium interaction against the existing React/Tailwind Art Studio shell.
// Physics is paused so view changes and recovered history can be compared exactly.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const read = file => fs.readFileSync(file, 'utf8');
const out = path.resolve('reports/artstudio-workspace');
const shell = read('dev-tools/pixel_contrast_probe.cjs').match(/const SHELL = `([\s\S]+?)`;/)[1]
  .replace('var ctx = { React: React', 'var saved=React.useState([]);window.__saved=saved[0];window.__edit=pair[1];window.__state=pair[0];var ctx = { React: React')
  .replace('setToolSnapshots: function(){},', 'setToolSnapshots: saved[1],').replace('toolSnapshots: [],', 'toolSnapshots: saved[0],');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [], checks = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.route('http://localhost:47839/**', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }));
    await page.goto('http://localhost:47839/');
    await page.setContent('<html><head><style>' + read('dev-tools/.cache/sweep-tailwind.css') + '</style><style>body{margin:0;font-family:system-ui}*{box-sizing:border-box}</style></head><body><div id="slot"></div></body></html>');
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'stem_lab/stem_lab_module.js', 'stem_lab/stem_tool_artstudio.js']) {
      await page.addScriptTag({ content: read(file) });
    }
    await page.addScriptTag({ content: shell });
    await page.evaluate(() => __mount('artStudio', false, {
      tab: 'watercolor', studioStarted: true, studioHome: false,
      watercolorColor: '#b54579', watercolorBrush: 'round', watercolorSize: 18,
      watercolorDrying: 0, watercolorHumidity: 100, watercolorAirflow: 0, watercolorFlowDirection: 'none'
    }));

    const canvas = page.locator('#watercolorCanvas');
    const viewport = page.locator('.artstudio-watercolor-paper');
    const workspace = page.locator('#watercolorFullscreenWorkspace');
    const outline = page.locator('#artstudio-watercolor-cursor');
    const help = page.locator('#artstudio-watercolor-keyboard-help');
    const zoom = page.getByRole('combobox', { name: 'Paper zoom', exact: true });
    const pan = page.getByRole('button', { name: 'Pan paper', exact: true });
    const paint = page.getByRole('button', { name: 'Paint on paper', exact: true });
    const fit = page.getByRole('button', { name: 'Fit whole paper', exact: true });
    const undo = page.locator('#artstudio-watercolor-undo');
    const redo = page.locator('#artstudio-watercolor-redo');
    const settle = () => canvas.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const png = () => canvas.evaluate(c => c._watercolorEngine.captureExport());
    const cursor = () => canvas.evaluate(c => { const s = c._watercolorEngine.captureState(); return { x: s.keyboardX, y: s.keyboardY }; });
    const scroll = () => viewport.evaluate(p => ({ x: p.scrollLeft, y: p.scrollTop, maxX: p.scrollWidth - p.clientWidth, maxY: p.scrollHeight - p.clientHeight }));
    const outerScroll = () => canvas.evaluate(c => {
      const list = [];
      for (let n = c.closest('.artstudio-watercolor-paper').parentElement; n; n = n.parentElement) list.push([n.id || n.tagName, n.scrollLeft, n.scrollTop]);
      return { page: [window.scrollX, window.scrollY], ancestors: list };
    });
    const focus = () => canvas.evaluate(c => c.focus({ preventScroll: true }));
    const remember = key => canvas.evaluate((c, k) => { window[k] = c._watercolorEngine.captureState(); }, key);
    const compare = key => canvas.evaluate((c, k) => {
      const a = c._watercolorEngine.captureState(), b = window[k];
      let error = 0;
      for (const name of ['water', 'pigmentDensity', 'pigmentR', 'pigmentG', 'pigmentB', 'stainDensity', 'stainR', 'stainG', 'stainB', 'mask']) {
        if (!a[name] || !b[name]) continue;
        for (let i = 0; i < a[name].length; i++) error = Math.max(error, Math.abs(a[name][i] - b[name][i]));
      }
      return error;
    }, key);
    const visibleCursor = async whole => {
      const box = await canvas.evaluate(c => {
        const p = c.closest('.artstudio-watercolor-paper'), r = c.getBoundingClientRect(), v = p.getBoundingClientRect();
        const e = document.getElementById('artstudio-watercolor-cursor'), b = e.getBoundingClientRect(), s = c._watercolorEngine.captureState();
        return {
          display: getComputedStyle(e).display,
          center: { x: b.left + b.width / 2, y: b.top + b.height / 2 },
          expected: { x: r.left + s.keyboardX * r.width / 192, y: r.top + s.keyboardY * r.height / 192 },
          outline: { left: b.left, top: b.top, right: b.right, bottom: b.bottom, width: b.width, height: b.height },
          viewport: { left: v.left + p.clientLeft, top: v.top + p.clientTop, right: v.left + p.clientLeft + p.clientWidth, bottom: v.top + p.clientTop + p.clientHeight }
        };
      });
      assert.equal(box.display, 'block');
      assert(Math.abs(box.center.x - box.expected.x) < 1 && Math.abs(box.center.y - box.expected.y) < 1, JSON.stringify(box));
      const v = box.viewport, b = box.outline, p = box.center;
      assert(p.x >= v.left - 1 && p.x <= v.right + 1 && p.y >= v.top - 1 && p.y <= v.bottom + 1, JSON.stringify(box));
      if (whole) assert(b.left >= v.left - 1 && b.top >= v.top - 1 && b.right <= v.right + 1 && b.bottom <= v.bottom + 1, JSON.stringify(box));
      return box;
    };
    const visiblePoint = () => viewport.evaluate(p => {
      const r = p.getBoundingClientRect();
      return { x: r.left + p.clientLeft + p.clientWidth / 2, y: r.top + p.clientTop + p.clientHeight / 2 };
    });

    await canvas.waitFor();
    await canvas.evaluate(c => {
      const e = c._watercolorEngine;
      if (!e.captureState().paused) e.togglePause();
      const s = e.captureState();
      for (let y = 40; y <= 152; y++) for (let x = 40; x <= 152; x++) {
        const i = y * 192 + x, r = Math.hypot((x - 96) / 56, (y - 96) / 45);
        if (r > 1) continue;
        const m = .35 * (1 - .18 * r);
        s.water[i] = .45 * (1 - .3 * r); s.pigmentDensity[i] = m;
        s.pigmentR[i] = m * .15; s.pigmentG[i] = m * .41; s.pigmentB[i] = m * .65;
        s.pigmentStainingMass[i] = m * .35; s.pigmentOpacityMass[i] = m * .12;
        s.pigmentGranulationMass[i] = m * .65; s.pigmentMobilityMass[i] = m * .60;
        for (const k of ['R', 'G', 'B']) s['pigmentMobility' + k + 'Mass'][i] = s['pigment' + k][i] * .6;
      }
      e.restoreState(s);
    });
    await page.getByRole('button', { name: 'Expand watercolor canvas', exact: true }).click();
    await page.waitForFunction(() => document.getElementById('watercolorCanvas').getBoundingClientRect().width > 700);
    await settle();
    const expanded = await canvas.boundingBox(), baselinePNG = await png();
    await zoom.selectOption('3'); await settle();
    const detailed = await canvas.boundingBox();
    assert(Math.abs(detailed.width / expanded.width - 3) < .005);
    assert.equal(await png(), baselinePNG);
    assert.equal(await undo.isDisabled(), true);
    checks.push({ expandedPaper: expanded, detailPaper: detailed, fixedBacking: await canvas.evaluate(c => [c.width, c.height]), zoomDoesNotPaint: true });

    // Precision and accelerated movements operate in simulation cells, independent of zoom.
    await focus(); await visibleCursor(true);
    const first = await cursor(), outerBefore = await outerScroll();
    await canvas.press('Alt+ArrowRight'); const fine = await cursor();
    assert(Math.abs(fine.x - first.x - 1) < 1e-8);
    await canvas.press('ArrowDown'); const normal = await cursor();
    const normalStep = normal.y - fine.y;
    assert(normalStep >= 2);
    await canvas.press('Shift+ArrowDown'); const fast = await cursor();
    assert(Math.abs(fast.y - normal.y - normalStep * 4) < 1e-8);
    await visibleCursor(true);
    const minimalBefore = await scroll();
    await canvas.press('Alt+ArrowLeft');
    assert.deepEqual(await scroll(), minimalBefore);
    await canvas.press('End'); const endBox = await visibleCursor(false), endScroll = await scroll();
    assert(Math.abs(endScroll.x - endScroll.maxX) < 1 && Math.abs(endScroll.y - endScroll.maxY) < 1, JSON.stringify({endScroll,endBox}));
    await canvas.press('Home'); const homeBox = await visibleCursor(false), homeScroll = await scroll();
    assert.equal(homeScroll.x, 0); assert.equal(homeScroll.y, 0);
    assert.deepEqual(await outerScroll(), outerBefore);
    assert.equal(await png(), baselinePNG);
    checks.push({ precision: { fineStepCells: fine.x - first.x, normalStepCells: normalStep, acceleratedStepCells: fast.y - normal.y }, cornerReveal: { home: homeBox.center, end: endBox.center }, minimalRevealDoesNotScrollVisibleBrush: true, outerScrollUnchanged: true, noPaintOrUndoEntry: true });

    // Maximum mop/wash tips exceed this viewport; their center must remain reachable.
    const size = page.getByRole('slider', { name: 'Brush size', exact: true });
    await size.press('End'); assert.equal(await size.inputValue(), '80');
    const broadBrushes = [];
    for (const label of ['Mop', 'Wash']) {
      await workspace.getByRole('group', { name: 'Watercolor brush', exact: true }).getByRole('button', { name: new RegExp(label + '$') }).click();
      await focus(); await canvas.press('End');
      const edge = await visibleCursor(false), extent = await scroll();
      assert(Math.abs(extent.x - extent.maxX) < 1 && Math.abs(extent.y - extent.maxY) < 1, JSON.stringify({label,extent,edge}));
      await canvas.press('Home'); assert.equal((await scroll()).x, 0); assert.equal((await scroll()).y, 0);
      await canvas.press('Shift+ArrowRight'); await canvas.press('Shift+ArrowRight');
      await canvas.press('Shift+ArrowDown'); await canvas.press('Shift+ArrowDown');
      const interior = await visibleCursor(false);
      assert(interior.outline.width > interior.viewport.right - interior.viewport.left || interior.outline.height > interior.viewport.bottom - interior.viewport.top);
      broadBrushes.push({ brush:label, size:80, oversizedInteriorCenterVisible:true, cornerScrollExtentStable:true, outlineDimensions:[interior.outline.width,interior.outline.height] });
    }
    await workspace.getByRole('group', { name: 'Watercolor brush', exact: true }).getByRole('button', { name: /Round$/ }).click();
    await size.press('Home');
    for (let i=0;i<10;i++) await size.press('ArrowRight');
    assert.equal(await size.inputValue(), '18');
    await focus();
    assert.equal(await png(), baselinePNG);
    assert.equal(await canvas.evaluate(c => {
      const layer = c.parentElement.querySelector('[data-watercolor-cursor-layer]');
      return !!layer && layer.contains(document.getElementById('artstudio-watercolor-cursor')) && !layer.contains(c)
        && getComputedStyle(layer).overflow === 'hidden' && getComputedStyle(c.parentElement).overflow !== 'hidden';
    }), true);
    checks.push({ maximumBrushNavigation: broadBrushes, cursorLayerClippedToSheet:true, canvasFocusRingUnclipped:true, noPaintFromBrushViewChanges:true });

    assert.match(await help.innerText(), /Alt/i);
    assert.match(await help.innerText(), /Shift/i);
    assert.match(await canvas.getAttribute('aria-keyshortcuts'), /Alt\+ArrowRight/);
    assert.match(await canvas.getAttribute('aria-keyshortcuts'), /Escape/);
    // Leaving a hover restores the focused keyboard brush; blur hides it.
    await canvas.press('End');
    const keyboardBox = await visibleCursor(false), hoverPoint = await visiblePoint();
    await page.mouse.move(hoverPoint.x, hoverPoint.y);
    const hoverBox = await outline.boundingBox();
    assert(Math.abs(hoverBox.x + hoverBox.width / 2 - keyboardBox.center.x) > 8 || Math.abs(hoverBox.y + hoverBox.height / 2 - keyboardBox.center.y) > 8);
    await page.mouse.move(3, 3);
    await visibleCursor(false);
    await zoom.focus(); assert.equal(await outline.isVisible(), false);
    await focus(); await visibleCursor(false);
    checks.push({ keyboardOutlinePersistsAfterHoverLeave: true, blurHidesOutline: true, paintHelpAndShortcutsDescribePrecision: true });

    // A pointer can focus at the visible position without jumping to a distant keyboard cursor.
    await zoom.focus();
    await viewport.evaluate(p => { p.scrollLeft = (p.scrollWidth - p.clientWidth) / 2; p.scrollTop = (p.scrollHeight - p.clientHeight) / 2; });
    const mousePoint = await visiblePoint(), pointerView = await scroll();
    await remember('__precisionBeforePointer');
    await page.mouse.move(mousePoint.x, mousePoint.y); await page.mouse.down();
    assert.deepEqual(await scroll(), pointerView);
    await page.mouse.move(mousePoint.x + 38, mousePoint.y + 22, { steps: 4 });
    await remember('__precisionStroke');
    const strokePNG = await png();
    assert.notEqual(strokePNG, baselinePNG);
    await page.keyboard.press('Enter');
    const bothPNG = await png();
    assert.notEqual(bothPNG, strokePNG);
    await remember('__precisionBoth');
    await page.mouse.move(mousePoint.x + 90, mousePoint.y + 45); await page.mouse.up();
    assert.equal(await png(), bothPNG, 'A late pointer release must not extend the ended stroke');
    await undo.click(); const strokeError = await compare('__precisionStroke'); assert(strokeError < .00006);
    await undo.click(); const baselineError = await compare('__precisionBeforePointer'); assert(baselineError < .00006);
    await redo.click(); await redo.click(); const redoError = await compare('__precisionBoth'); assert(redoError < .00006);
    checks.push({ pointerFocusDoesNotJumpToKeyboardCursor: true, keyboardDabEndsPointerStroke: true, latePointerDoesNotPaint: true, separateUndoEntries: { strokeError, baselineError, redoError } });

    // Captured Pan must yield to keyboard scrolling and Escape, never paint.
    await pan.click();
    assert.match(await help.innerText(), /Pan mode/i); assert.match(await help.innerText(), /do not (?:paint|draw)/i);
    assert.doesNotMatch(await canvas.getAttribute('aria-keyshortcuts'), /Alt\+ArrowRight/);
    await viewport.evaluate(p => { p.scrollLeft = p.scrollTop = 200; });
    await focus();
    let drag = await visiblePoint();
    await page.mouse.move(drag.x, drag.y); await page.mouse.down();
    await page.mouse.move(drag.x - 30, drag.y - 20);
    const dragged = await scroll(), panPNG = await png();
    await page.keyboard.press('ArrowRight'); const afterArrow = await scroll();
    assert(Math.abs(afterArrow.x - dragged.x - 48) < 1);
    await page.mouse.move(drag.x - 70, drag.y - 40); await page.mouse.up();
    assert.deepEqual(await scroll(), afterArrow);
    await canvas.press('Home'); const panHome = await scroll();
    assert.equal(panHome.x, 0); assert.equal(panHome.y, 0);
    await canvas.press('End'); const panEnd = await scroll();
    assert(Math.abs(panEnd.x - panEnd.maxX) < 1 && Math.abs(panEnd.y - panEnd.maxY) < 1);
    await canvas.press('Enter'); await canvas.press('Space'); assert.equal(await png(), panPNG);
    checks.push({ capturedPanYieldsToKeyboard: true, panArrowCSSPixels: afterArrow.x - dragged.x, panHomeEndReachEdges: true, panEnterSpaceDoesNotPaint: true, panHelpAndShortcutsMatchMode: true });

    // Synthetic primary pen/touch samples supplement the real mouse checks above.
    const dispatch = (type, pointerType, pointerId, point) => canvas.evaluate((c, data) => {
      c.dispatchEvent(new PointerEvent(data.type, {
        bubbles: true, cancelable: true, isPrimary: true, button: 0,
        pointerType: data.pointerType, pointerId: data.pointerId,
        clientX: data.point.x, clientY: data.point.y, pressure: .7
      }));
    }, { type, pointerType, pointerId, point });
    const synthetic = [];
    for (const [pointerType, pointerId] of [['pen', 81], ['touch', 82]]) {
      await viewport.evaluate(p => { p.scrollLeft = p.scrollTop = 200; });
      const start = await visiblePoint(), before = await scroll();
      await dispatch('pointerdown', pointerType, pointerId, start);
      await dispatch('pointermove', pointerType, pointerId + 100, {x:start.x-50,y:start.y-40});
      assert.deepEqual(await scroll(), before);
      await dispatch('pointermove', pointerType, pointerId, {x:start.x-30,y:start.y-20});
      const moved = await scroll();
      assert.equal(moved.x - before.x, 30); assert.equal(moved.y - before.y, 20);
      await canvas.press('ArrowLeft'); const ended = await scroll();
      await dispatch('pointermove', pointerType, pointerId, {x:start.x-70,y:start.y-55});
      await dispatch('pointerup', pointerType, pointerId, {x:start.x-70,y:start.y-55});
      assert.deepEqual(await scroll(), ended); assert.equal(await png(), panPNG);
      synthetic.push({ pointerType, ownedPanDelta:[30,20], otherPointerIgnored:true, keyboardEndsPan:true, latePointerIgnored:true });
    }
    checks.push({ syntheticPrimaryPenTouchPan: synthetic, physicalStylusHardwareTested: false });

    // Exit expanded view before Escape, whose global fullscreen shortcut is independent.
    await page.getByRole('button', { name: 'Exit expanded watercolor canvas (Esc)', exact: true }).click();
    await page.waitForFunction(() => !document.fullscreenElement && !document.getElementById('watercolorFullscreenWorkspace').hasAttribute('data-allo-fullscreen-active'));
    await viewport.scrollIntoViewIfNeeded(); await focus();
    drag = await visiblePoint();
    await page.mouse.move(drag.x, drag.y); await page.mouse.down(); await page.mouse.move(drag.x - 20, drag.y - 15);
    await page.keyboard.press('Escape'); const escapedPan = await scroll();
    await page.mouse.move(drag.x - 65, drag.y - 30); await page.mouse.up();
    assert.deepEqual(await scroll(), escapedPan); assert.equal(await png(), panPNG);
    await paint.click(); await viewport.scrollIntoViewIfNeeded();
    const beforeEscapeKey = '__precisionBeforeEscape'; await remember(beforeEscapeKey);
    drag = await visiblePoint();
    await page.mouse.move(drag.x, drag.y); await page.mouse.down(); await page.mouse.move(drag.x + 24, drag.y + 18, { steps: 3 });
    await remember('__precisionEscapedStroke'); const escapedStrokePNG = await png();
    await page.keyboard.press('Escape'); assert.equal(await outline.isVisible(), false);
    await page.mouse.move(drag.x + 60, drag.y + 36); await page.mouse.up();
    assert.equal(await png(), escapedStrokePNG);
    await undo.click(); assert(await compare(beforeEscapeKey) < .00006);
    await redo.click(); assert(await compare('__precisionEscapedStroke') < .00006);
    checks.push({ escapeEndsCapturedPan: true, escapePreservesCompletedStrokeAsOneUndo: true, escapeHidesBrush: true, latePointerReleaseIgnored: true });

    await page.getByRole('button', { name: 'Expand watercolor canvas', exact: true }).click();
    await settle(); await zoom.selectOption('3'); await focus(); await canvas.press('End'); await visibleCursor(false);
    const cleanPNG = await png();
    assert.equal(await outline.isVisible(), true);
    const [download] = await Promise.all([page.waitForEvent('download'), workspace.getByRole('button', { name: 'Export PNG', exact: true }).click()]);
    await download.saveAs(path.join(out, 'watercolor-precision-export.png'));
    assert.deepEqual(fs.readFileSync(path.join(out, 'watercolor-precision-export.png')), Buffer.from(cleanPNG.split(',')[1], 'base64'));
    const exportDimensions = await canvas.evaluate(async (c, url) => { const i = new Image(); i.src = url; await i.decode(); return [i.naturalWidth, i.naturalHeight]; }, cleanPNG);
    assert.deepEqual(exportDimensions, [1024, 1024]);
    await focus(); await canvas.press('Home'); await canvas.press('Shift+ArrowRight'); await canvas.press('Shift+ArrowDown');
    await page.screenshot({ path: path.join(out, 'watercolor-precision-desktop.png') });
    checks.push({ cleanFullSheetExport: { dimensions: exportDimensions, exactCaptureBytes: true, atZoom: '300%', excludesDOMBrush: true } });

    await page.getByRole('button', { name: 'Exit expanded watercolor canvas (Esc)', exact: true }).click();
    await page.waitForFunction(() => !document.fullscreenElement && !document.getElementById('watercolorFullscreenWorkspace').hasAttribute('data-allo-fullscreen-active'));
    await pan.click(); await page.locator('summary[aria-label="Studio actions"]').click();
    await page.getByRole('button', { name: 'Save current study', exact: true }).click();
    await page.waitForFunction(() => __saved.length === 1);
    const original = await page.evaluate(() => JSON.stringify(__saved[0].data));
    await remember('__precisionSaved');
    assert.equal(await page.evaluate(() => Object.hasOwn(__saved[0].data, 'watercolorZoom') || Object.hasOwn(__saved[0].data, 'watercolorNavigation')), false);
    await workspace.getByRole('button', { name: 'Clear', exact: true }).click();
    if (await page.locator('#artstudio-process-button').getAttribute('aria-expanded') !== 'true') await page.locator('#artstudio-process-button').click();
    await page.getByRole('button', { name: /^Fork Watercolor/ }).click();
    await page.waitForFunction(() => document.getElementById('watercolorCanvas')._watercolorEngine.captureState().pigmentDensity.some(v => v > 0));
    const studyError = await compare('__precisionSaved'); assert(studyError < .00006);
    assert.equal(await zoom.inputValue(), '1'); assert.equal(await paint.getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => JSON.stringify(__saved[0].data)), original);
    checks.push({ savedStudy: { wetPaintRecoveredMaxCellError: studyError, viewResetToFitPaint: true, viewAbsentFromSavedArtwork: true, originalUnchanged: true, realIndexedDBOrigin: 'http://localhost:47839' } });

    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 }); await zoom.selectOption('1'); await settle();
      const fitted = await viewport.boundingBox(); await zoom.selectOption('3'); await settle();
      const enlarged = await viewport.boundingBox();
      assert(Math.abs(enlarged.height - fitted.height) < 1 && Math.abs(enlarged.width - fitted.width) < 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const heights = await page.locator('.artstudio-watercolor-navigation').evaluate(n => [...n.querySelectorAll('button,select')].map(b => b.getBoundingClientRect().height));
      assert(heights.every(h => h >= 44));
      await viewport.scrollIntoViewIfNeeded(); await focus(); const phoneOuter = await outerScroll();
      await canvas.press('End'); const phoneEnd = await visibleCursor(false);
      await canvas.press('Home'); await visibleCursor(false);
      assert.deepEqual(await outerScroll(), phoneOuter);
      await zoom.scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(out, 'watercolor-precision-phone-' + width + '.png') });
      checks.push({ phoneWidth: width, controlHeights: heights, viewportStaysFixed: true, noHorizontalOverflow: true, keyboardCursorFollowsViewport: true, outerScrollUnchanged: true, endCursorCenter: phoneEnd.center });
      await fit.click();
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'watercolor-precision-browser-results.json'), JSON.stringify({ passed: true, checks, errors }, null, 2) + '\n');
    console.log(JSON.stringify({ passed: true, checks }));
  } catch (error) {
    fs.writeFileSync(path.join(out, 'watercolor-precision-browser-results.json'), JSON.stringify({ passed: false, checks, errors, failure: String(error) }, null, 2) + '\n');
    await page.screenshot({ path: path.join(out, 'watercolor-precision-browser-failure.png') });
    throw error;
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
