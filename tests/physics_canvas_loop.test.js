import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const PHYSICS_PATHS = [
  'stem_lab/stem_tool_physics.js',
  'desktop/web-app/public/stem_lab/stem_tool_physics.js',
];

describe('physics canvas animation loop', () => {
  it('cleans up the projectile canvas loop and visibility listener', () => {
    PHYSICS_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('if (prevCanvas && prevCanvas._physCleanup) prevCanvas._physCleanup();');
      expect(source).toContain('if (canvasEl._physScheduleFrame) canvasEl._physScheduleFrame();');
      expect(source).toContain("window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches");
      expect(source).toContain('function isPhysicsHidden()');
      expect(source).toContain('function cancelPhysicsFrame()');
      expect(source).toContain('function schedulePhysicsFrame()');
      expect(source).toContain('if (!physAlive || canvasEl._physAnim || isPhysicsHidden()) return;');
      expect(source).toContain('canvasEl._physAnim = requestAnimationFrame(draw);');
      expect(source).toContain('function cleanupPhysicsCanvas()');
      expect(source).toContain("document.addEventListener('visibilitychange', onPhysicsVisibilityChange);");
      expect(source).toContain("document.removeEventListener('visibilitychange', onPhysicsVisibilityChange);");
      expect(source).toContain('if (!canvasEl.isConnected) { cleanupPhysicsCanvas(); return; }');
      expect(source).toContain('tick += physMotionReduced ? 0.2 : 1;');
      expect(source).toContain('canvasEl._physCleanup = cleanupPhysicsCanvas;');
      expect(source).toContain('canvasEl._physScheduleFrame = schedulePhysicsFrame;');
      expect(source).toContain('schedulePhysicsFrame();');
      expect(source).not.toContain('canvasEl._physAnim = requestAnimationFrame(draw);\\n\\n            }\\n\\n            canvasEl._physAnim = requestAnimationFrame(draw);');
    });
  });
});
