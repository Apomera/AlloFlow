import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
let C;
beforeAll(() => {
  window.StemLab = { registerTool() {} };
  new Function(readFileSync('stem_lab/stem_tool_cell.js', 'utf8'))();
  C = window.__alloCellPure;
});
describe('cell progress integrity', () => {
  it('ignores inherited object names in imported organelles and guides', () => {
    const raw = JSON.parse('{"schemaVersion":1,"currentType":"animal","byCellType":{"animal":{"seen":["constructor","__proto__","nucleus"],"mastered":["toString"],"guideId":"constructor","selected":"__proto__"}}}');
    const rec = C.normalizeCellProgress(raw, {}).byCellType.animal;
    expect(rec.seen).toEqual(['nucleus']);
    expect(rec.mastered).toEqual([]);
    expect(rec.guideId).toBe(null);
    expect(rec.selected).toBe(null);
  });
  it('bounds counters and indices to finite whole numbers', () => {
    const progress = C.normalizeCellProgress({ schemaVersion: 1, byCellType: { animal: {
      quizAttempts: 2.8, quizCorrect: 99, checkCorrect: Infinity,
      guideId: 'geneExpression', guideStep: 1.9, quizKey: 'nucleus', quizChoice: 1.5
    } } }, {});
    const rec = progress.byCellType.animal;
    expect(rec.quizAttempts).toBe(2);
    expect(rec.quizCorrect).toBe(2);
    expect(rec.checkCorrect).toBe(0);
    expect(rec.guideStep).toBe(1);
    expect(rec.quizChoice).toBe(null);
    expect(C.normalizeCellProgress(JSON.parse(JSON.stringify(progress)), {})).toEqual(progress);
  });
  it('drops nonfinite imported counts without creating phantom mastery', () => {
    const rec = C.normalizeCellProgress({ schemaVersion: 1, byCellType: { plant: {
      quizAttempts: 'Infinity', quizCorrect: 10, mastered: ['chloroplast'], review: ['chloroplast']
    } } }, {}).byCellType.plant;
    expect(rec.quizAttempts).toBe(0);
    expect(rec.quizCorrect).toBe(0);
    expect(rec.mastered).toEqual([]);
    expect(rec.review).toEqual(['chloroplast']);
  });
});
