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

      expect(source).toContain('if (_lastRocksCanvas && _lastRocksCanvas._rocksCleanup) { _lastRocksCanvas._rocksCleanup(); _lastRocksCanvas._rocksInit = false; }');
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

      expect(source).toContain('if (_lastRcCanvas && _lastRcCanvas._rcCleanup) { _lastRcCanvas._rcCleanup(); _lastRcCanvas._rcInit = false; }');
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
});
