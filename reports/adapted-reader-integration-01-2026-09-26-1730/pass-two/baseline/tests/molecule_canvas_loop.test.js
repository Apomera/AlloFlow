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
      expect(source).toContain('if (!bohrAlive || animId || canvas._bohrMotionReduced || isBohrHidden()) return;');
      expect(source).toContain('animId = requestAnimationFrame(draw);');
      expect(source).toContain('function cleanupBohrCanvas()');
      expect(source).toContain("document.addEventListener('visibilitychange', onBohrVisibilityChange);");
      expect(source).toContain("document.removeEventListener('visibilitychange', onBohrVisibilityChange);");
      expect(source).toContain('if (!canvas.isConnected) { cleanupBohrCanvas(); return; }');
      expect(source).toContain('canvas._bohrInit = true;');
      expect(source).toContain('canvas._bohrSystemMotionReduced = bohrMotionReduced;');
      expect(source).toContain('canvas._bohrMotionReduced = bohrMotionReduced || calmDiagrams;');
      expect(source).toContain('canvas._bohrCleanup = cleanupBohrCanvas;');
      expect(source).toContain('canvas._bohrSchedule = scheduleBohrFrame;');
      expect(source).toContain('window._moleculeBohrCleanup = cleanupBohrCanvas;');
      expect(source).toContain('if (!canvas._bohrMotionReduced) angle += 0.015;');
      expect(source).toContain('cleanupBohrCanvas();');
      expect(source).not.toContain('canvas._bohrCleanup = function() { if (animId) cancelAnimationFrame(animId); };');
    });
  });
});

describe('molecule 3D canvas animation loop', () => {
  it('pauses while the document is hidden and removes its visibility listener on disposal', () => {
    MOLECULE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain("if (typeof document !== 'undefined' && document.hidden) {");
      expect(source).toContain("document.addEventListener('visibilitychange', onThreeVisibilityChange);");
      expect(source).toContain('renderer._alloVisibilityHandler = onThreeVisibilityChange;');
      expect(source).toContain('threeRendererRef.current === renderer && threeSceneRef.current && !animationFrameIdRef.current');
      expect(source).toContain("document.removeEventListener('visibilitychange', renderer._alloVisibilityHandler);");
    });
  });
});

describe('molecule element quiz generation', () => {
  it('avoids immediate target and question-type repeats when the pool permits', () => {
    MOLECULE_PATHS.forEach((filePath) => {
      const source = readFileSync(filePath, 'utf8');

      expect(source).toContain('var previousSymbol = elQuiz && elQuiz.targetSymbol;');
      expect(source).toContain('var previousType = elQuiz && elQuiz.type;');
      expect(source).toContain('pool = pool.filter(function(el) { return el.s !== previousSymbol; });');
      expect(source).toContain('quizTypes.filter(function(quizType) { return quizType.id !== previousType; });');
      expect(source).toContain('q.catalogSize = elQuizPool.length;');
      expect(source).toContain('elAttempts: elAttempts + 1,');
      expect(source).toContain('var elementQuizTypeCount = 6;');
      expect(source).toContain("id: 'period'");
      expect(source).toContain("id: 'block'");
      expect(source).toContain("opts: makeElQuizOptions(answer, ['s-block', 'p-block', 'd-block', 'f-block'])");
      expect(source).toContain("if (d.elQuizScope === 'filtered') nextState.elQuiz = null;");
    });
  });
});
