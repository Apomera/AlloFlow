import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const CIRCUIT_PATHS = [
  'stem_lab/stem_tool_circuit.js',
  'desktop/web-app/public/stem_lab/stem_tool_circuit.js',
];

describe('circuit short-circuit spark canvas loop', () => {
  it('keeps the spark overlay idempotent and cleanup-aware', () => {
    CIRCUIT_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('if (canvas._circuitSparkInit) {');
      expect(source).toContain('if (canvas._circuitSparkResize) canvas._circuitSparkResize();');
      expect(source).toContain('if (canvas._circuitSparkSchedule) canvas._circuitSparkSchedule();');
      expect(source).toContain('function resizeCircuitSparkCanvas()');
      expect(source).toContain('function isCircuitSparkHidden()');
      expect(source).toContain('function cancelCircuitSparkFrame()');
      expect(source).toContain('function scheduleCircuitSparkFrame()');
      expect(source).toContain('if (!sparkActive || sparkRaf || _prefersReducedMotion || isCircuitSparkHidden()) return;');
      expect(source).toContain('sparkRaf = requestAnimationFrame(loop);');
      expect(source).toContain('function cleanupCircuitSparkCanvas()');
      expect(source).toContain("document.addEventListener('visibilitychange', onCircuitSparkVisibilityChange);");
      expect(source).toContain("document.removeEventListener('visibilitychange', onCircuitSparkVisibilityChange);");
      expect(source).toContain('if (!canvas.isConnected) { cleanupCircuitSparkCanvas(); return; }');
      expect(source).toContain('canvas._circuitSparkCleanup = cleanupCircuitSparkCanvas;');
      expect(source).toContain('canvas._circuitSparkResize = resizeCircuitSparkCanvas;');
      expect(source).toContain('canvas._circuitSparkSchedule = scheduleCircuitSparkFrame;');
      expect(source).toContain('window._circuitCanvasCleanup = cleanupCircuitSparkCanvas;');
      expect(source).not.toContain('if (!_prefersReducedMotion) requestAnimationFrame(loop);');
      expect(source).not.toContain('window._circuitCanvasCleanup = function() { active = false; };');
    });
  });
});
