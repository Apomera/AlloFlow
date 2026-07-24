import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const UNIT_CONVERT_PATHS = [
  'stem_lab/stem_tool_unitconvert.js',
  'desktop/web-app/public/stem_lab/stem_tool_unitconvert.js',
];

describe('unit converter metric-prefix canvas loop', () => {
  it('cleans up animation, resize, and visibility work across rerenders', () => {
    UNIT_CONVERT_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('if (window.__alloMetricPrefixCleanup) window.__alloMetricPrefixCleanup();');
      expect(source).toContain('if (cvEl._mpCleanup) cvEl._mpCleanup();');
      expect(source).toContain('function cleanupMetricPrefixCanvas()');
      expect(source).toContain('if (ro) ro.disconnect();');
      expect(source).toContain('cvEl._mpCleanup = null;');
      expect(source).toContain('cvEl._mpRO = null;');
      expect(source).toContain('window.__alloMetricPrefixCleanup = cvEl._mpCleanup;');

      expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
      expect(source).toContain('function isMetricPrefixHidden()');
      expect(source).toContain('function cancelMetricPrefixFrame()');
      expect(source).toContain('function scheduleMetricPrefixFrame()');
      expect(source).toContain('if (!alive || reducedMotion || cvEl._mpAnim || isMetricPrefixHidden()) return;');
      expect(source).toContain('cvEl._mpAnim = requestAnimationFrame(drawMp);');
      expect(source).toContain('var t = reducedMotion ? 8 : (performance.now() - start) / 1000;');
      expect(source).toContain('scheduleMetricPrefixFrame();');

      expect(source).toContain("document.addEventListener('visibilitychange', onMetricPrefixVisibilityChange);");
      expect(source).toContain("document.removeEventListener('visibilitychange', onMetricPrefixVisibilityChange);");
      expect(source).toContain('if (!cvEl.isConnected) { cleanupMetricPrefixCanvas(); return; }');
      expect(source).toContain('if (typeof ResizeObserver === \'function\')');
      expect(source).not.toContain('if (cvEl._mpAnim) return;');
    });
  });
});
