import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

describe('water cycle canvas animation loop', () => {
  it('cleans up frames/listeners while preserving journey progression under reduced motion', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var detachedCanvas = _lastWcCanvas;');
      expect(source).toContain('if (detachedCanvas && !detachedCanvas.isConnected && detachedCanvas._wcCleanup) {');
      expect(source).toContain("var journey = { state: canvasEl.dataset.journeyState || 'idle'");
      expect(source).toContain('function advanceJourneyFrame()');
      expect(source).toContain("if (canvasEl.dataset.renderMode === 'state-only')");
      expect(source).toContain('canvasEl.dataset.journeyProgress = String');
      expect(source).toContain('"data-render-mode": journeyView === \'2d\' ? \'visual\' : \'state-only\'');
      expect(source).toContain("\"data-journey-state\": d.journeyActive ? (d.journeyState || 'ocean') : 'idle'");
      expect(source).toContain("canvasEl._onJourneyTransition('ground_choice')");
      expect(source).toContain('var current = prev.waterCycle || {};');
      expect(source).not.toContain('if (_lastWcCanvas && _lastWcCanvas._wcCleanup) { _lastWcCanvas._wcCleanup(); _lastWcCanvas._wcInit = false; }');
      expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
      expect(source).toContain('function isWaterCycleHidden()');
      expect(source).toContain('function cancelWaterCycleFrame()');
      // Match the declaration without pinning its parameter list. The literal
      // 'function scheduleWaterCycleFrame()' went stale the moment the function
      // gained a forceRender argument — the scheduling behaviour this test cares
      // about was unchanged, but the assertion reported a failure anyway.
      expect(source).toMatch(/function scheduleWaterCycleFrame\(/);
      expect(source).toContain('if (!wcAlive || canvasEl._wcAnim || isWaterCycleHidden()) return;');
      expect(source).toContain('canvasEl._wcAnim = requestAnimationFrame(draw);');
      expect(source).toContain('function cleanupWaterCycleCanvas()');
      expect(source).toContain("canvasEl.removeEventListener('click', onWaterCycleCanvasClick);");
      expect(source).toContain("document.addEventListener('visibilitychange', onWaterCycleVisibilityChange);");
      expect(source).toContain("document.removeEventListener('visibilitychange', onWaterCycleVisibilityChange);");
      expect(source).toContain('function onWaterCycleCanvasClick(e)');
      expect(source).toContain("canvasEl.addEventListener('click', onWaterCycleCanvasClick);");
      expect(source).toContain('if (!canvasEl.isConnected) { cleanupWaterCycleCanvas(); return; }');
      expect(source).toContain('tick += wcMotionReduced ? 0.2 : 1;');
      expect(source).toContain('scheduleWaterCycleFrame();');
      expect(source).not.toContain("canvasEl.addEventListener('click', function(e)");
      expect(source).not.toContain('if (!canvasEl.isConnected) { if (canvasEl._wcAnim) cancelAnimationFrame(canvasEl._wcAnim); return; }');
      expect(source).not.toContain('canvasEl._wcCleanup = function ()');
    });
  });

  it('makes the focusable 2D canvas keyboard-controllable', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('function handleWc2dKey(e)');
      expect(source).toContain("if (e.key === ' ' || e.key === 'Enter') {");
      expect(source).toContain('toggleWc2dPlayback();');
      expect(source).toContain('"aria-keyshortcuts": journeyView === \'2d\' ? "Space Enter" : undefined,');
      expect(source).toContain('Press Space or Enter on the model to pause.');
    });
  });

  it('repaints the paused 2D frame when state changes', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('if (canvasEl._wcInit) {');
      expect(source).toContain('canvasEl._wcRedraw();');
      expect(source).toContain('function draw(forceRender)');
      expect(source).toContain("&& forceRender !== true");
      expect(source).toContain('canvasEl._wcRedraw = function()');
      expect(source).toContain('Control changes still repaint this frame;');
    });
  });
});
