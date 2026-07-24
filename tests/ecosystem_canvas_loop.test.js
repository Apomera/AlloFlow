import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const ECOSYSTEM_PATHS = [
  'stem_lab/stem_tool_ecosystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_ecosystem.js',
];

describe('ecosystem canvas animation loop', () => {
  it('cleans up the ecosystem canvas loop, touch listeners, and visibility listener', () => {
    ECOSYSTEM_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("if (typeof window !== 'undefined' && window._ecosystemCanvasCleanup) window._ecosystemCanvasCleanup();");
      expect(source).toContain('if (canvas._ecoSchedule) canvas._ecoSchedule();');
      expect(source).toContain('function isEcoHidden()');
      expect(source).toContain('function cancelEcoFrame()');
      expect(source).toContain('function scheduleEcoFrame()');
      expect(source).toContain('if (!ecoAlive || animId || isEcoHidden()) return;');
      expect(source).toContain('animId = requestAnimationFrame(draw);');
      expect(source).toContain('function cleanupEcoCanvas()');
      expect(source).toContain("canvas.removeEventListener('touchstart', onTouchStart);");
      expect(source).toContain("canvas.removeEventListener('touchmove', onTouchMove);");
      expect(source).toContain("canvas.removeEventListener('touchend', onMouseUp);");
      expect(source).toContain("canvas.removeEventListener('touchcancel', onMouseUp);");
      expect(source).toContain("document.addEventListener('visibilitychange', onEcoVisibilityChange);");
      expect(source).toContain("document.removeEventListener('visibilitychange', onEcoVisibilityChange);");
      expect(source).toContain('if (!canvas.isConnected) { cleanupEcoCanvas(); return; }');
      expect(source).toContain('canvas._ecoCleanup = cleanupEcoCanvas;');
      expect(source).toContain('canvas._ecoSchedule = scheduleEcoFrame;');
      expect(source).toContain('window._ecosystemCanvasCleanup = cleanupEcoCanvas;');
      expect(source).toContain('scheduleEcoFrame();');
      expect(source).not.toContain('canvas._ecoCleanup = function()');
    });
  });
});
