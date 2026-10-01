import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
let C;
beforeAll(() => {
  window.StemLab = { registerTool() {} };
  new Function(readFileSync('stem_lab/stem_tool_cell.js', 'utf8'))();
  C = window.__alloCellPure;
});
describe('Finite cell recall rounds', () => {
  it('prioritizes review then unmastered structures with five unique questions for each cell', () => {
    for (const type of ['animal', 'plant', 'bacterium']) {
      const keys = C.interiorOrganelles(type).filter(k => k !== 'cytoplasm');
      const round = C.createCellRecallRound(type, [keys[3], keys[3], 'invalid'], [keys[0]]);
      expect(round.keys).toHaveLength(5);
      expect(new Set(round.keys).size).toBe(5);
      expect(round.keys[0]).toBe(keys[3]);
      expect(round.keys).not.toContain(keys[0]);
      expect(round.keys.every(k => C.interiorHas(type, k))).toBe(true);
    }
  });
  it('records each answer once in order without mutating the prior round', () => {
    const initial = C.createCellRecallRound('animal', [], []);
    expect(C.recordCellRecallAnswer(initial, 'animal', initial.keys[1], true).answers).toEqual([]);
    let round = C.recordCellRecallAnswer(initial, 'animal', initial.keys[0], false);
    expect(initial.answers).toEqual([]);
    round = C.recordCellRecallAnswer(round, 'animal', initial.keys[0], true);
    expect(round.answers).toEqual([{ key: initial.keys[0], correct: false }]);
    for (const key of initial.keys.slice(1)) round = C.recordCellRecallAnswer(round, 'animal', key, true);
    expect(round.answers).toHaveLength(5);
    expect(C.normalizeCellRecallRound({ ...round, finished: true }, 'animal').finished).toBe(true);
  });
  it('rejects invalid queues and truncates malformed answer history', () => {
    expect(C.normalizeCellRecallRound({type:'animal',keys:['constructor']}, 'animal')).toBeNull();
    expect(C.normalizeCellRecallRound({type:'plant',keys:['nucleus']}, 'animal')).toBeNull();
    expect(C.normalizeCellRecallRound({type:'animal',keys:['nucleus','nucleus']}, 'animal')).toBeNull();
    const round = C.createCellRecallRound('animal', [], []);
    expect(C.normalizeCellRecallRound({...round, finished:true, answers:[{key:round.keys[1],correct:true}]}, 'animal').finished).toBe(false);
  });
  it('keeps partial rounds independent and portable across cell types', () => {
    const progress = C.createEmptyCellProgress();
    for (const type of ['animal','plant','bacterium']) {
      let round = C.createCellRecallRound(type, [], []);
      round = C.recordCellRecallAnswer(round, type, round.keys[0], false);
      const cell = {interiorRecallRound:round, interiorQuizAttempts:1, interiorQuizCorrect:0};
      progress.byCellType[type] = C.extractCellProgress(cell,type,progress.byCellType[type]);
    }
    const saved = C.normalizeCellProgress(JSON.parse(JSON.stringify(progress)), {});
    for (const type of ['animal','plant','bacterium']) {
      const restored = C.applyCellProgressToCell({},saved.byCellType[type],type);
      expect(restored.interiorRecallRound.type).toBe(type);
      expect(restored.interiorRecallRound.answers).toHaveLength(1);
      expect(restored.interiorRecallRound.finished).toBe(false);
    }
    expect(C.applyCellProgressToCell({},C.createCellProgressRecord('animal'),'animal').interiorRecallRound).toBeNull();
  });
});
