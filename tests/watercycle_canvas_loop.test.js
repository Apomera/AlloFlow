import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'prismflow-deploy/public/stem_lab/stem_tool_watercycle.js',
];

describe('water cycle canvas animation loop', () => {
  it('cleans up frames/listeners while preserving journey progression under reduced motion', () => {
    WATER_CYCLE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('if (_lastWcCanvas && _lastWcCanvas._wcCleanup) { _lastWcCanvas._wcCleanup(); _lastWcCanvas._wcInit = false; }');
      expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
      expect(source).toContain('function isWaterCycleHidden()');
      expect(source).toContain('function cancelWaterCycleFrame()');
      expect(source).toContain('function scheduleWaterCycleFrame()');
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
});
