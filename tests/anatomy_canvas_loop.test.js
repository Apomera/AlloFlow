import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const ANATOMY_PATHS = [
  'stem_lab/stem_tool_anatomy.js',
  'desktop/web-app/public/stem_lab/stem_tool_anatomy.js',
];

describe('anatomy canvas animation loop', () => {
  it('cleans up rerendered anatomy canvases and respects motion/visibility preferences', () => {
    ANATOMY_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('if (!canvas) {');
      expect(source).toContain('if (window.__alloAnatomyCanvasCleanup) window.__alloAnatomyCanvasCleanup();');
      expect(source).toContain('if (canvas._anatomyCleanup) canvas._anatomyCleanup();');
      expect(source).toContain('window.__alloAnatomyCanvasCleanup = canvas._anatomyCleanup;');
      expect(source).toContain('function cleanupAnatomyCanvas()');
      expect(source).toContain('canvas._anatomyCleanup = null;');

      expect(source).toContain("window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null");
      expect(source).toContain('function onAnatomyMotionPreferenceChange(event)');
      expect(source).toContain("anatomyMotionQuery.addEventListener('change', onAnatomyMotionPreferenceChange)");
      expect(source).toContain("anatomyMotionQuery.removeEventListener('change', onAnatomyMotionPreferenceChange)");
      expect(source).toContain('anatomyMotionReduced = !!(event && event.matches);');
      expect(source).toContain('if (anatomyAlive && canvas.isConnected && !isAnatomyHidden()) drawAnatomyFrame();');
      expect(source).toContain('function isAnatomyHidden()');
      expect(source).toContain('function cancelAnatomyFrame()');
      expect(source).toContain('function scheduleAnatomyFrame()');
      expect(source).toContain('if (!anatomyAlive || anatomyMotionReduced || canvas._anatomyAnim || isAnatomyHidden()) return;');
      expect(source).toContain('if (!anatomyMotionReduced) anatTick++;');
      expect(source).toContain('scheduleAnatomyFrame();');

      expect(source).toContain("document.addEventListener('visibilitychange', onAnatomyVisibilityChange);");
      expect(source).toContain("document.removeEventListener('visibilitychange', onAnatomyVisibilityChange);");
      expect(source).toContain('if (!canvas.isConnected) { cleanupAnatomyCanvas(); return; }');
      expect(source).toContain('if (isAnatomyHidden()) cancelAnatomyFrame();');
    });
  });
});
