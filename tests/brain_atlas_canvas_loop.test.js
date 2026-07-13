import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const BRAIN_ATLAS_PATHS = [
  'stem_lab/stem_tool_brainatlas.js',
  'prismflow-deploy/public/stem_lab/stem_tool_brainatlas.js',
];

describe('brain atlas canvas loops', () => {
  it('manages the main atlas canvas lifecycle through a visibility-aware scheduler', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('if (window.__alloBrainAtlasCanvasCleanup) window.__alloBrainAtlasCanvasCleanup();');
      expect(source).toContain('if (canvas._brainCleanup) canvas._brainCleanup();');
      expect(source).toContain('function cleanupBrainCanvas()');
      expect(source).toContain('function isBrainAtlasHidden()');
      expect(source).toContain('function cancelBrainFrame()');
      expect(source).toContain('function scheduleBrainFrame()');
      expect(source).toContain('if (!brainAlive || brainMotionReduced || canvas._brainAnim || isBrainAtlasHidden()) return;');
      expect(source).toContain('canvas._brainAnim = requestAnimationFrame(drawBrainFrame);');
      expect(source).toContain('if (!brainMotionReduced) canvas._brainTick++;');
      expect(source).toContain("document.addEventListener('visibilitychange', onBrainAtlasVisibilityChange);");
      expect(source).toContain("document.removeEventListener('visibilitychange', onBrainAtlasVisibilityChange);");
      expect(source).toContain('if (!canvas.isConnected) { cleanupBrainCanvas(); return; }');
      expect(source).toContain('scheduleBrainFrame(); return;');
      expect(source).not.toContain('if (canvas._brainAnim && canvas._brainViewKey === _cacheKey) return;');
    });
  });

  it('cleans up the EEG brainwave mini-canvas instead of leaving a detached loop running', () => {
    BRAIN_ATLAS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('if (window.__alloBrainwaveCanvasCleanup) window.__alloBrainwaveCanvasCleanup();');
      expect(source).toContain('if (canvas._bwCleanup) canvas._bwCleanup();');
      expect(source).toContain('function cleanupBrainwaveCanvas()');
      expect(source).toContain('function isBrainwaveHidden()');
      expect(source).toContain('function cancelBrainwaveFrame()');
      expect(source).toContain('function scheduleBrainwaveFrame()');
      expect(source).toContain('if (!bwAlive || prefersReducedMotion || canvas._bwAnimFrame || isBrainwaveHidden()) return;');
      expect(source).toContain('canvas._bwAnimFrame = requestAnimationFrame(drawFrame);');
      expect(source).toContain('if (!prefersReducedMotion) tick += 0.8;');
      expect(source).toContain("document.addEventListener('visibilitychange', onBrainwaveVisibilityChange);");
      expect(source).toContain("document.removeEventListener('visibilitychange', onBrainwaveVisibilityChange);");
      expect(source).toContain('if (!canvas.isConnected) { cleanupBrainwaveCanvas(); return; }');
      expect(source).toContain('scheduleBrainwaveFrame();');
      expect(source).not.toContain('canvas._bwCleanup = function () { cancelAnimationFrame(canvas._bwAnimFrame); canvas._bwAnimFrame = null; };');
    });
  });
});
