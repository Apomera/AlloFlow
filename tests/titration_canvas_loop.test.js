import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const TITRATION_PATHS = [
  'stem_lab/stem_tool_titration.js',
  'desktop/web-app/public/stem_lab/stem_tool_titration.js',
];

describe('titration animation canvas loop', () => {
  it('cleans up animation, resize, and visibility listeners across rerenders', () => {
    TITRATION_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var titrAnimCanvases = new Set();');
      expect(source).toContain('if (cvEl._ttCleanup) cvEl._ttCleanup();');
      expect(source).toContain('function cleanupTitrationAnim()');
      expect(source).toContain('if (ro) ro.disconnect();');
      expect(source).toContain('titrAnimCanvases.delete(cvEl);');
      expect(source).toContain('titrAnimCanvases.add(cvEl);');
      expect(source).not.toContain('window.__alloTitrationAnimCleanup');
      expect(source).toContain("event.currentTarget.closest('[data-titration-instance]')");
      expect(source).toContain("instance.querySelector('[data-titration-anim=\"true\"]')");

      expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
      expect(source).toContain('function isTitrationHidden()');
      expect(source).toContain('function cancelTitrationFrame()');
      expect(source).toContain('function scheduleTitrationFrame()');
      expect(source).toContain('if (!alive || reducedMotion || cvEl._ttAnim || isTitrationHidden()) return;');
      expect(source).toContain('var t = reducedMotion ? 5 : (performance.now() - start) / 1000;');

      expect(source).toContain("document.addEventListener('visibilitychange', onTitrationVisibilityChange);");
      expect(source).toContain("document.removeEventListener('visibilitychange', onTitrationVisibilityChange);");
      expect(source).toContain('if (!cvEl.isConnected) { cleanupTitrationAnim(); return; }');
      expect(source).toContain('cancelTitrationFrame();');
      expect(source).toContain('if (c2.setTransform) c2.setTransform(2, 0, 0, 2, 0, 0);');
      expect(source).not.toContain('if (cvEl._ttAnim) return;');
    });
  });
});
