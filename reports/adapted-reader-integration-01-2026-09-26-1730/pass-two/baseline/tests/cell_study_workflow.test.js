import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

let C;
beforeAll(() => {
  window.StemLab = { registerTool() {} };
  new Function(readFileSync('stem_lab/stem_tool_cell.js', 'utf8'))();
  C = window.__alloCellPure;
});

describe('Cell structure recall', () => {
  it('has a concise clue without the answer name for every assessed structure', () => {
    for (const type of ['animal', 'plant', 'bacterium']) {
      for (const key of C.interiorOrganelles(type).filter(k => k !== 'cytoplasm')) {
        const clue = C.CELL_RECALL_CLUES[key];
        expect(clue, key).toBeTypeOf('string');
        expect(clue.length).toBeGreaterThan(30);
        expect(clue.toLowerCase()).not.toContain(C.CELL_ORGANELLES[key].name.toLowerCase());
      }
    }
  });

  it('produces distinct, valid choices for every cell structure', () => {
    for (const type of ['animal', 'plant', 'bacterium']) {
      const keys = C.interiorOrganelles(type).filter(k => k !== 'cytoplasm');
      for (const key of keys) {
        const options = C.cellRecallOptions(keys, key);
        expect(options).toHaveLength(4);
        expect(new Set(options).size).toBe(4);
        expect(options).toContain(key);
        expect(options.every(k => C.interiorHas(type, k))).toBe(true);
        expect(C.cellRecallOptions(keys, key)).toEqual(options);
      }
    }
  });

  it('terminates for a seven-distractor pool and small or duplicate pools', () => {
    const keys = C.interiorOrganelles('plant').slice(0, 8);
    expect(C.cellRecallOptions(keys, keys[0])).toHaveLength(4);
    expect(C.cellRecallOptions([keys[0]], keys[0])).toEqual([keys[0]]);
    expect(C.cellRecallOptions([keys[0], keys[1], keys[1]], keys[0])).toHaveLength(2);
    expect(C.cellRecallOptions(keys, 'missing')).toEqual([]);
  });
});
