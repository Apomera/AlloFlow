import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_fisherlab.js', 'fisherLab'); });
describe('Fisher Lab quiz learning support', () => {
  it('maps every question to a real existing section and returns detached metadata', () => {
    const c = window.__FisherLabCore;
    const source = fs.readFileSync('stem_lab/stem_tool_fisherlab.js', 'utf8');
    const tabSource = source.slice(source.indexOf('var TABS = ['), source.indexOf('var CATEGORIES = ['));
    const ids = [...tabSource.matchAll(/id: '([^']+)'/g)].map(m => m[1]);
    const indices = c.createCoreQuizRound('full').indices;
    expect(indices.length).toBeGreaterThan(70);
    for (const index of indices) {
      const support = c.getCoreQuizLearningSupport(index);
      expect(ids).toContain(support.tab);
      expect(support.label.length).toBeGreaterThan(2);
      expect(support.prompt.length).toBeGreaterThan(20);
      expect(support.misconception).toBeNull();
      support.tab = 'changed';
      expect(c.getCoreQuizLearningSupport(index).tab).not.toBe('changed');
    }
    expect(c.getCoreQuizLearningSupport(-1)).toBeNull();
    expect(c.getCoreQuizLearningSupport(indices.length)).toBeNull();
    expect(c.getCoreQuizLearningSupport('0')).toBeNull();
  });
  it('keeps targeted misconception feedback aligned with rotated answer labels', () => {
    const c = window.__FisherLabCore;
    const expectations = [
      [0, 'Port (left), keeping the red mark to port', 'boat’s left side'],
      [0, 'Either side', 'direction matters'],
      [0, 'Stop and wait', 'not an instruction to stop'],
      [4, 'The highest water level of the day', 'high tide'],
      [4, 'A whole day without a change in water level', 'whole day'],
      [4, 'The lowest water level at every location', 'low tide'],
      [8, 'Nun', 'conical top'],
      [8, 'Sphere', 'sphere is round'],
      [8, 'Pillar', 'cylinder is a can']
    ];
    for (const [index, answer, expected] of expectations) {
      const question = c.getCoreQuizQuestion(index);
      const option = question.a.indexOf(answer);
      expect(option).toBeGreaterThanOrEqual(0);
      expect(c.getCoreQuizLearningSupport(index, option).misconception.toLowerCase()).toContain(expected.toLowerCase());
    }
    for (const index of [0,4,8]) {
      const question = c.getCoreQuizQuestion(index);
      expect(c.getCoreQuizLearningSupport(index, question.correct).misconception).toBeNull();
      expect(c.getCoreQuizLearningSupport(index, -1).misconception).toBeNull();
      expect(c.getCoreQuizLearningSupport(index, '1').misconception).toBeNull();
      expect(question.sourceUrl).toMatch(/^https:\/\//);
    }
  });
  it('does not alter scores, options or round state when retrieving support', () => {
    const c = window.__FisherLabCore;
    let round = c.createCoreQuizRound('quick');
    round = c.answerCoreQuizRound(round, 2);
    const before = JSON.stringify(round), question = c.getCoreQuizQuestion(0);
    for (let i=0;i<20;i++) c.getCoreQuizLearningSupport(0, 2);
    expect(JSON.stringify(round)).toBe(before);
    expect(c.getCoreQuizQuestion(0)).toEqual(question);
    expect(c.getCoreQuizLearningSupport(1, 0).misconception).toBeNull();
  });
});
