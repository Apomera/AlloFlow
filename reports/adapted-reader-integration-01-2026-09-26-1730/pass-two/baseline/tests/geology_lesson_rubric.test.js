import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

let P;
const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_geologyexplorer.js');

beforeAll(() => {
  window.StemLab = { registerTool() {}, isRegistered() { return false; } };
  delete window.__alloGeologyPure;
  // eslint-disable-next-line no-new-func
  new Function(fs.readFileSync(sourcePath, 'utf8'))();
  P = window.__alloGeologyPure;
  if (!P) throw new Error('geology pure hook not exposed');
});

beforeEach(() => {
  P.setScene('crust');
  P.setGrid('standard');
});

describe('Geology Explorer lesson guide and CER rubric', () => {
  it('defines a classroom sequence with objectives, phases, and prompts', () => {
    const guide = P.lessonGuide();
    expect(guide.duration).toBe('25-35 minutes');
    expect(guide.objectives).toHaveLength(3);
    expect(guide.phases).toHaveLength(4);
    expect(guide.prompts).toHaveLength(3);
  });

  it('awards full credit for a complete, evidence-based explanation', () => {
    const mission = P.missions().crust;
    const result = P.evaluateCER(mission, {
      evidence: [{ id: 'a' }, { id: 'b' }],
      missionComplete: true
    }, {
      claim: 'The pluton arrived after the layers formed.',
      explanation: 'The pluton cuts the older layers, so cross-cutting shows it formed later.'
    });
    expect(result.score).toBe(4);
    expect(result.ready).toBe(true);
    expect(result.criteria.every((criterion) => criterion.met)).toBe(true);
  });

  it('gives actionable feedback when a response is incomplete', () => {
    const result = P.evaluateCER(P.missions().geode, {
      evidence: [],
      missionComplete: false
    }, { claim: '', explanation: 'Crystals formed.' });
    expect(result.score).toBe(0);
    expect(result.ready).toBe(false);
    expect(result.criteria.map((criterion) => criterion.id)).toEqual(['claim', 'evidence', 'reasoning', 'mission']);
    expect(result.criteria.map((criterion) => criterion.feedback).join(' ')).toContain('at least two observations');
  });

  it('uses a complete Evidence Map when scoring the evidence criterion', () => {
    const mission = P.missions().crust;
    const result = P.evaluateCER(mission, {
      evidence: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      evidenceMapStatus: { ready: false },
      missionComplete: true
    }, { claim: 'The layers record a sequence.', explanation: 'The layers support this because the sequence is visible.' });
    expect(result.criteria.find((criterion) => criterion.id === 'evidence').met).toBe(false);
    expect(result.criteria.find((criterion) => criterion.id === 'evidence').feedback).toContain('Observation, Process, and Outcome');
  });

  it('drafts an editable CER response from mapped evidence', () => {
    const draft = P.evidenceMapDraft(P.missions().crust, [
      { id: 'obs', label: 'Shale layer', detail: 'lies below sandstone' },
      { id: 'proc', label: 'Sediment settles', detail: 'builds layers over time' },
      { id: 'out', label: 'Relative order', detail: 'deeper layers are older' }
    ], { obs: 'observation', proc: 'process', out: 'outcome' });
    expect(draft.ready).toBe(true);
    expect(draft.claim).toContain('deeper layers are older');
    expect(draft.explanation).toContain('because');
    expect(draft.usedIds).toEqual(['obs', 'proc', 'out']);
  });

  it('keeps both app mirrors identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });
});
