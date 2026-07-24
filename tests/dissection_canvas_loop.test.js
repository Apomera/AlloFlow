import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const DISSECTION_PATHS = [
  'stem_lab/stem_tool_dissection.js',
  'prismflow-deploy/public/stem_lab/stem_tool_dissection.js',
];

describe('dissection canvas animation loop', () => {
  it('preserves canvas state updates while cleaning up the heavyweight redraw loop', () => {
    DISSECTION_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('if (window.__alloDissectionCanvasCleanup) window.__alloDissectionCanvasCleanup();');
      expect(source).toContain('if (canvas._dissAnim && canvas._dissCleanup) return;');
      expect(source).toContain('if (canvas._dissCleanup) canvas._dissCleanup();');
      expect(source).toContain('function cleanupDissectionCanvas()');
      expect(source).toContain('function isDissectionHidden()');
      expect(source).toContain('function cancelDissectionFrame()');
      expect(source).toContain('function scheduleDissectionFrame()');
      expect(source).toContain('if (!dissAlive || dissMotionReduced || canvas._dissAnim || isDissectionHidden()) return;');
      expect(source).toContain('canvas._dissAnim = requestAnimationFrame(drawDissectionFrame);');
      expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
      expect(source).toContain("var liveRenderQuality = drawState.renderQuality || 'auto';");
      expect(source).toContain("var autoBalanced = liveRenderQuality === 'auto'");
      expect(source).toContain("var minFrameMs = liveRenderQuality === 'high' ? 16");
      expect(source).toContain('if (!dissMotionReduced) { dissLastDrawAt = arguments[0] || Date.now(); dissTick++; }');
      expect(source).toContain('var dissTimeTimer = setInterval(function ()');
      expect(source).toContain('if (dissTimeTimer) { clearInterval(dissTimeTimer); dissTimeTimer = null; }');
      expect(source).toContain("document.addEventListener('visibilitychange', onDissectionVisibilityChange);");
      expect(source).toContain("document.removeEventListener('visibilitychange', onDissectionVisibilityChange);");
      expect(source).toContain('if (!canvas.isConnected) { cleanupDissectionCanvas(); return; }');
      expect(source).toContain('scheduleDissectionFrame();');
      expect(source).not.toContain('if (canvas._dissAnim) return;');
      expect(source).not.toContain('canvas._dissAnim = requestAnimationFrame(drawDissectionFrame);\\n\\n                return;');
    });
  });
});
