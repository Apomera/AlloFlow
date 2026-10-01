import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const WAVE_PATHS = [
  'stem_lab/stem_tool_wave.js',
  'desktop/web-app/public/stem_lab/stem_tool_wave.js',
];

describe('wave canvas animation loop', () => {
  it('cleans up animation, pointer listeners, visibility listener, and audio context', () => {
    WAVE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('if (_prevCv && !document.body.contains(_prevCv)) {');
      expect(source).toContain('if (_prevCv._waveCleanup) _prevCv._waveCleanup();');
      expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
      expect(source).toContain('function isWaveHidden()');
      expect(source).toContain('function cancelWaveFrame()');
      expect(source).toContain('function scheduleWaveFrame()');
      expect(source).toContain('if (!waveAlive || canvasEl._waveAnim || isWaveHidden()) return;');
      expect(source).toContain('canvasEl._waveAnim = requestAnimationFrame(draw);');
      expect(source).toContain('function cleanupWaveCanvas()');
      expect(source).toContain("canvasEl.removeEventListener('mousedown', onPointerDown);");
      expect(source).toContain("canvasEl.removeEventListener('mousemove', onPointerMove);");
      expect(source).toContain("canvasEl.removeEventListener('touchstart', onPointerDown);");
      expect(source).toContain("canvasEl.removeEventListener('touchmove', onPointerMove);");
      expect(source).toContain("window.removeEventListener('mouseup', onPointerUp);");
      expect(source).toContain("window.removeEventListener('touchend', onPointerUp);");
      expect(source).toContain("document.addEventListener('visibilitychange', onWaveVisibilityChange);");
      expect(source).toContain("document.removeEventListener('visibilitychange', onWaveVisibilityChange);");
      expect(source).toContain('if (!document.body.contains(canvasEl)) { cleanupWaveCanvas(); return; }');
      expect(source).toContain('tick += waveMotionReduced ? 0.2 : 1;');
      expect(source).toContain('function _waveAudioStop()');
      expect(source).toContain('_waveAudioStop();');
      expect(source).toContain('scheduleWaveFrame();');
      expect(source).not.toContain('if (!document.body.contains(canvasEl)) return;');
    });
  });
});
