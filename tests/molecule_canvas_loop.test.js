import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const MOLECULE_PATHS = [
  'stem_lab/stem_tool_molecule.js',
  'desktop/web-app/public/stem_lab/stem_tool_molecule.js',
];

describe('molecule Bohr canvas animation loop', () => {
  it('cleans up the Bohr model canvas loop and visibility listener', () => {
    MOLECULE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("if (typeof window !== 'undefined' && window._moleculeBohrCleanup) window._moleculeBohrCleanup();");
      expect(source).toContain('if (canvas._bohrInit) {');
      expect(source).toContain('if (canvas._bohrSchedule) canvas._bohrSchedule();');
      expect(source).toContain("window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches");
      expect(source).toContain('function isBohrHidden()');
      expect(source).toContain('function cancelBohrFrame()');
      expect(source).toContain('function scheduleBohrFrame()');
      expect(source).toContain('if (!bohrAlive || animId || bohrMotionReduced || isBohrHidden()) return;');
      expect(source).toContain('animId = requestAnimationFrame(draw);');
      expect(source).toContain('function cleanupBohrCanvas()');
      expect(source).toContain("document.addEventListener('visibilitychange', onBohrVisibilityChange);");
      expect(source).toContain("document.removeEventListener('visibilitychange', onBohrVisibilityChange);");
      expect(source).toContain('if (!canvas.isConnected) { cleanupBohrCanvas(); return; }');
      expect(source).toContain('canvas._bohrInit = true;');
      expect(source).toContain('canvas._bohrCleanup = cleanupBohrCanvas;');
      expect(source).toContain('canvas._bohrSchedule = scheduleBohrFrame;');
      expect(source).toContain('window._moleculeBohrCleanup = cleanupBohrCanvas;');
      expect(source).toContain('if (!bohrMotionReduced) angle += 0.015;');
      expect(source).toContain('cleanupBohrCanvas();');
      expect(source).not.toContain('canvas._bohrCleanup = function() { if (animId) cancelAnimationFrame(animId); };');
    });
  });
});
