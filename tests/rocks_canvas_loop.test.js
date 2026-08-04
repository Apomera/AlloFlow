import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const ROCKS_PATHS = [
  'stem_lab/stem_tool_rocks.js',
  'desktop/web-app/public/stem_lab/stem_tool_rocks.js',
];

describe('rocks canvas animation loops', () => {
  it('cleans up the landscape canvas loop, listeners, resize observer, and visibility listener', () => {
    ROCKS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      // Cleanup still runs on real unmount, but from the module-scope stable ref
      // rather than a per-render inline closure (see the stable-ref test below).
      expect(source).toContain('if (_rocksLastCanvas && _rocksLastCanvas._rocksCleanup) { _rocksLastCanvas._rocksCleanup(); }');
      expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
      expect(source).toContain('function isRocksHidden()');
      expect(source).toContain('function cancelRocksFrame()');
      expect(source).toContain('function scheduleRocksFrame()');
      expect(source).toContain('if (!rocksAlive || rocksMotionReduced || animId || isRocksHidden()) return;');
      expect(source).toContain('animId = requestAnimationFrame(loop);');
      expect(source).toContain("document.addEventListener('visibilitychange', onRocksVisibilityChange);");
      expect(source).toContain("document.removeEventListener('visibilitychange', onRocksVisibilityChange);");
      expect(source).toContain('if (!canvasEl.isConnected) { canvasEl._rocksCleanup(); return; }');
      expect(source).toContain('if (!rocksMotionReduced) tick++;');
      expect(source).toContain('if (rocksMotionReduced) drawLandscape();');
      expect(source).toContain('canvasEl._rocksRO = null;');
      expect(source).toContain('canvasEl._rocksCleanup = null;');
      expect(source).not.toContain('animId = requestAnimationFrame(loop);\\n\\n            }\\n\\n            animId = requestAnimationFrame(loop);');
    });
  });

  it('cleans up the rock-cycle diagram loop and click handler', () => {
    ROCKS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      // Cleanup still runs when React hands the ref a null (real unmount) — but
      // it now lives in the module-scope stable ref, not in a per-render inline
      // closure. See the stable-ref test below for why that matters.
      expect(source).toContain('if (_rcLastCanvas && _rcLastCanvas._rcCleanup) { _rcLastCanvas._rcCleanup(); }');
      expect(source).toContain('function isRockCycleHidden()');
      expect(source).toContain('function cancelRockCycleFrame()');
      expect(source).toContain('function scheduleRockCycleFrame()');
      expect(source).toContain('if (!rcAlive || rcMotionReduced || canvasEl._rcAnim || isRockCycleHidden()) return;');
      expect(source).toContain('canvasEl._rcAnim = requestAnimationFrame(draw);');
      expect(source).toContain('function cleanupRockCycleCanvas()');
      expect(source).toContain("canvasEl.removeEventListener('click', onRockCycleClick);");
      expect(source).toContain("document.addEventListener('visibilitychange', onRockCycleVisibilityChange);");
      expect(source).toContain("document.removeEventListener('visibilitychange', onRockCycleVisibilityChange);");
      expect(source).toContain('if (!canvasEl.isConnected) { cleanupRockCycleCanvas(); return; }');
      expect(source).toContain('if (!rcMotionReduced) tick++;');
      expect(source).toContain('function onRockCycleClick(e)');
      expect(source).toContain("canvasEl.addEventListener('click', onRockCycleClick);");
      expect(source).not.toContain("canvasEl.addEventListener('click', function (e)");
      expect(source).not.toContain('canvasEl._rcCleanup = function () { if (canvasEl._rcAnim) cancelAnimationFrame(canvasEl._rcAnim); };');
    });
  });

  // ── Regression: the rock cycle "kept resetting" ──
  // The canvas ref used to be an inline `const canvasRef = function (canvasEl)`
  // built inside the tool body. React compares callback-ref identity, so a fresh
  // function each commit meant ref(null) → cleanup → ref(el) → full re-init on
  // EVERY state update: tick reset to 0 and all particles were re-randomised, so
  // the animation snapped back to its start whenever anything changed — including
  // ten times a second while the transformation machine's progress timer ran.
  it('hands React an identity-stable canvas ref so state updates cannot re-init the canvas', () => {
    ROCKS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      // The ref passed to React must be the module-scope function, never inline.
      expect(source).toContain('function rockCycleCanvasRef(canvasEl)');
      expect(source).toContain('ref: rockCycleCanvasRef');
      expect(source).not.toContain('ref: canvasRef');
      expect(source).not.toContain('const canvasRef = function (canvasEl)');

      // Per-render initialiser is published into a mutable box instead of being
      // handed to React directly (assigning a property keeps the ref identity).
      expect(source).toContain('var _rcInitBox = { fn: null };');
      expect(source).toContain('_rcInitBox.fn = initRockCycleCanvas;');
      expect(source).toContain('if (_rcInitBox.fn) _rcInitBox.fn(canvasEl);');

      // Initialising once per mount means a 0x0 measurement can no longer be
      // papered over by the next render, so it must retry rather than latch.
      expect(source).toContain('if (!canvasEl.offsetWidth || !canvasEl.offsetHeight)');
      expect(source).toContain('canvasEl._rcSizeRetry = requestAnimationFrame(');
    });
  });

  // ── Regression: the landscape canvas re-initialised every render ──
  // Same defect as the rock-cycle canvas, but with a heavier teardown: the ref
  // was `ref: function (el) { landscapeRef(el); ... }` — inline, so a new
  // identity on every commit. Every state update in the rocks tool cancelled the rAF
  // loop, removed the mousemove/click/keydown listeners, disconnected the
  // ResizeObserver, then rebuilt all of it with tick reset to 0 and hoverZone
  // dropped — so the landscape animation restarted and the hover highlight
  // vanished on every interaction.
  it('hands React an identity-stable landscape ref', () => {
    ROCKS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('function rocksLandscapeCanvasRef(canvasEl)');
      expect(source).toContain('ref: rocksLandscapeCanvasRef');
      expect(source).toContain('var _rocksInitBox = { fn: null };');
      expect(source).toContain('_rocksInitBox.fn = landscapeRef;');

      // The inline ref (and its per-render _onSelectRock rebind) must be gone.
      // Scoped to the landscape canvas — the quiz panel has its own harmless
      // inline focus ref that only reads a flag off the element.
      expect(source).not.toContain('landscapeRef(el);');
      expect(source).not.toContain('el._onSelectRock = function (rockId, type) {');

      // Zone clicks forward into the CURRENT render's closure, so binding the
      // element handler once at mount does not staleness-trap the callback.
      expect(source).toContain('var _rocksSelectBox = { fn: null };');
      expect(source).toContain('if (_rocksSelectBox.fn) _rocksSelectBox.fn(rockId, type);');
      expect(source).toContain('_rocksSelectBox.fn = function (rockId, type) {');

      // Initialising once per mount needs the 0x0 retry guard.
      expect(source).toContain('if (!canvasEl.offsetWidth || !canvasEl.offsetHeight)');
      expect(source).toContain('canvasEl._rocksSizeRetry = requestAnimationFrame(');
    });
  });

  // ── Regression: the transformation machine "got stuck" ──
  // updMulti / ROCKS_CHALLENGES / ROCKS_VOCAB were declared inside the `rocks`
  // tool body but referenced from the separately-registered `rockCycle` tool.
  // updMulti threw the instant the progress bar hit 100%, so
  // transformationAnimActive never went back to false: the Transform button
  // stayed disabled and no result ever rendered. ROCKS_VOCAB threw during RENDER
  // (in the rock-cycle quiz), and StemLab.renderTool swallows render throws and
  // returns null — which blanked the entire tool.
  it('declares the shared rock tables and updMulti where both tools can see them', () => {
    ROCKS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      // Module scope = two-space indent, inside the top-level IIFE but outside
      // either registerTool() body.
      expect(source).toContain('\n  var ROCKS_CHALLENGES = [');
      expect(source).toContain('\n  var ROCKS_VOCAB = {');

      // ...and exactly one definition of each, so the two tools cannot drift.
      expect(source.match(/var ROCKS_CHALLENGES = \[/g)).toHaveLength(1);
      expect(source.match(/var ROCKS_VOCAB = \{/g)).toHaveLength(1);

      // The rockCycle tool has its own updMulti bound to its own state slice.
      expect(source).toContain('var rc = Object.assign({}, (prev && prev.rockCycle) || {});');

      // The old challenge `check` closures read the rocks tool's `d`, which is
      // exactly what could not be hoisted. State must now come in as a param.
      expect(source).not.toContain('var st = s || d || {};');
    });
  });

  it('cancels the transformation timer instead of leaking it, and cannot latch the run flag', () => {
    ROCKS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('function rcStopTransformTimer()');
      expect(source).toContain('if (_rcTransformTimer) { clearInterval(_rcTransformTimer); _rcTransformTimer = null; }');
      // Cancelled on unmount (canvas cleanup is the tool's unmount hook)...
      expect(source).toContain('// one reliable place to stop an in-flight transformation run.\n              rcStopTransformTimer();');
      // ...and the completion path is guarded so a throw can never re-wedge it.
      expect(source).toContain("try { upd('transformationAnimActive', false); } catch (e2) {}");
      expect(source).toContain("try { awardCycleInteraction(); } catch (e) {");
      // Reduced motion skips the animation instead of running the timer.
      expect(source).toContain('if (reduced) { finish(); return; }');
    });
  });

  it('drives the machine from named specimens with a visual scene, not a bare family dropdown', () => {
    ROCKS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var RC_SPECIMENS = [');
      expect(source).toContain('var RC_TRANSFORMS = {');
      expect(source).toContain('var rcSwatch = function (h, key, texture, family, x, y, w, hgt, opacity)');

      // The pairings students are actually asked to know.
      expect(source).toContain("product: 'Quartzite'");
      expect(source).toContain("product: 'Marble'");
      expect(source).toContain("product: 'Gneiss'");
      expect(source).toContain("product: 'Slate → Phyllite → Schist → Gneiss'");

      // Every specimen/agent pair must resolve — no dead cells in the table.
      const specimenIds = ['granite', 'basalt', 'sandstone', 'limestone', 'shale', 'slate', 'marble', 'gneiss'];
      const table = source.slice(source.indexOf('var RC_TRANSFORMS = {'));
      specimenIds.forEach((id) => {
        // Indentation-independent: the table dedented when it was hoisted out of
        // the render function, and pinning leading spaces made that a failure.
        expect(table, `${id} has no row in RC_TRANSFORMS`).toMatch(new RegExp('\\n\\s+' + id + ': \\{'));
      });

      // Progress bar exposes its value to assistive tech.
      expect(source).toContain('role: "progressbar"');
      expect(source).toContain('"aria-valuenow": Math.round(prog)');
    });
  });
});
