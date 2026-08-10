import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const ANATOMY_PATHS = [
  'stem_lab/stem_tool_anatomy.js',
  'desktop/web-app/public/stem_lab/stem_tool_anatomy.js',
];

describe('anatomy canvas animation loop', () => {
  it('keeps one 2D controller lifecycle and respects resize, DPR, motion, and visibility changes', () => {
    ANATOMY_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var anatomy2dController = (function()');
      expect(source).toContain('function stableAnatomy2dRef(canvas)');
      expect(source).toContain('anatomy2dController.attach(canvas);');
      expect(source).toContain('anatomy2dController.push(paintAnatomyFrame);');
      expect(source).toContain('ref: stableAnatomy2dRef');
      expect(source).not.toContain('ref: canvasRef');

      expect(source).toContain('function detach()');
      expect(source).toContain('if (resizeObserver) resizeObserver.disconnect();');
      expect(source).toContain("window.removeEventListener('resize', scheduleResize)");
      expect(source).toContain("document.removeEventListener('visibilitychange', onVisibilityChange)");
      expect(source).toContain('detachedCanvas._anatomyCleanup = null;');
      expect(source).toContain('anatomyTick = 0;');

      expect(source).toContain("window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null");
      expect(source).toContain('function onMotionPreferenceChange(event)');
      expect(source).toContain("motionQuery.addEventListener('change', onMotionPreferenceChange)");
      expect(source).toContain("motionQuery.removeEventListener('change', onMotionPreferenceChange)");
      expect(source).toContain('motionReduced = !!(event && event.matches);');
      expect(source).toContain('function isDocumentHidden()');
      expect(source).toContain('function cancelPaint()');
      expect(source).toContain('function requestPaint()');
      expect(source).toContain("if (!canvas || !canvas.isConnected || isDocumentHidden() || typeof latestPainter !== 'function') return;");
      expect(source).toContain('if (!motionReduced) anatomyTick++;');
      expect(source).toContain("if (!motionReduced && typeof requestAnimationFrame === 'function') requestPaint();");

      expect(source).toContain("document.addEventListener('visibilitychange', onVisibilityChange)");
      expect(source).toContain('if (!canvas || !canvas.isConnected) { detach(); return; }');
      expect(source).toContain('if (isDocumentHidden()) cancelPaint();');
    });
  });
});
