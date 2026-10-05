import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let pathModel;
beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_geometryworld.js', 'geometryWorld');
  pathModel = window.StemLab.geometryWorldLessonChecks.learningPathModel;
});

describe('Geometry World learning path uses objective evidence', () => {
  const goal = (index, text, done = false) => ({ index, text, status: { done } });

  it('does not report an empty lesson as completed', () => {
    expect(pathModel(null)).toEqual({ total: 0, done: 0, next: null, complete: false });
    expect(pathModel([]).complete).toBe(false);
  });

  it('selects the first unfinished goal even when later goals were completed first', () => {
    const entries = [goal(0, 'Measure the prism'), goal(1, 'Build a prism', true), goal(2, 'Explain your strategy')];
    expect(pathModel(entries)).toEqual({ total: 3, done: 1, next: entries[0], complete: false });
    expect(entries[0].status.done).toBe(false);
  });

  it('advances when evidence is recorded and returns to a goal if its self-check is removed', () => {
    const first = goal(0, 'Compare layers', true);
    const second = goal(1, 'Describe what changed');
    expect(pathModel([first, second]).next.index).toBe(1);
    first.status.done = false;
    expect(pathModel([first, second]).next.index).toBe(0);
  });

  it('retains evidence and guide names for the current goal without revealing answers', () => {
    const entry = { index: 2, text: 'Build equal volumes', status: { done: false, npcs: ['Builder Bot'], evidence: 'Place 12 cubes', self: true } };
    expect(pathModel([entry]).next).toBe(entry);
    expect(pathModel([entry]).done).toBe(0);
  });

  it('completes only after every goal has evidence and tolerates unavailable status', () => {
    const unfinished = { index: 1, text: 'Try another shape' };
    expect(pathModel([goal(0, 'Count layers', true), unfinished]).complete).toBe(false);
    const result = pathModel([goal(0, 'Count layers', true), goal(1, 'Explain', true)]);
    expect(result).toEqual({ total: 2, done: 2, next: null, complete: true });
  });
});
