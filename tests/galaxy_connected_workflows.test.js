import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

describe('Galaxy connected investigations', () => {
  beforeEach(() => {
    resetStemLab();
    window._galaxyHasLoadedOnce = true;
    loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy');
  });

  it.each([['O', 30], ['B', 8], ['A', 1.8], ['F', 1.2], ['G', 1], ['K', 0.7], ['M', 0.3]])(
    'offers an illustrative mass for a selected %s star', (type, mass) => {
      const html = renderTool('galaxy', { galaxy: { selectedStar: type } });
      expect(html).toContain(`illustrative mass of ${mass} M☉`);
      expect(html).toContain('data-galaxy-star-life-link');
      expect(html).toContain('data-galaxy-metallicity-link');
    },
  );

  it('reopens saved quiz progress even if a previous loading flag was saved', () => {
    const html = renderTool('galaxy', { galaxy: {
      quizMode: true, isGeneratingQuiz: true, quizIdx: 1,
      dynamicQuiz: [
        { q: 'First question', a: 'A', options: ['A', 'B'] },
        { q: 'Saved second question', a: 'C', options: ['C', 'D'] },
      ],
      quizFeedback: { picked: 'D', correct: false, msg: 'Saved feedback' },
    } });
    expect(html).toContain('Saved second question');
    expect(html).toContain('Saved feedback');
    expect(html).not.toContain('Loading new astronomy questions');
    expect(html).toContain('Restart this quiz');
  });

  it.each([
    { metallicity: null, mass: null, age: null },
    { metallicity: -5, mass: 200, age: Infinity },
    { metallicity: 'very high', mass: {}, age: NaN },
  ])('renders usable chemistry controls from malformed saved values: %j', (metalHunt) => {
    const html = renderTool('galaxy', { galaxy: { simMode: 'metalHunt', metalHunt } });
    expect(html).toContain('Explore this mass in Star Life');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Infinity');
    expect(html).not.toContain('[object Object]');
    const root = document.createElement('div'); root.innerHTML = html;
    for (const id of ['mh-metallicity', 'mh-mass', 'mh-age']) {
      const input = root.querySelector('#' + id), value = Number(input.value);
      expect(value).toBeGreaterThanOrEqual(Number(input.min));
      expect(value).toBeLessThanOrEqual(Number(input.max));
    }
  });

  it('offers restore controls only for valid chemistry log entries', () => {
    const html = renderTool('galaxy', { galaxy: { simMode: 'metalHunt', metalHunt: { log: [
      null, { z: 'bad', m: 1, a: 1 }, { z: 0.1, m: 0.7, a: 10, st: {} },
      { z: 1, m: 4, a: 0.1, st: 'solar' }, { z: 1, m: -2, a: 0.1 },
    ] } } });
    const root = document.createElement('div'); root.innerHTML = html;
    expect(root.querySelectorAll('[data-galaxy-metallicity-restore]')).toHaveLength(2);
    expect(html).toContain('Restore combination 1');
    expect(html).toContain('Metal-poor composition');
    expect(html).not.toContain('[object Object]');
  });

  it.each([0.05, 0.3, 1, 12, 30])('keeps stage navigation bounded for mass %s', (mass) => {
    const root = document.createElement('div');
    root.innerHTML = renderTool('galaxy', { galaxy: { simMode: 'star', lifecycleMass: mass, activeStage: 'nebula' } });
    const controls = root.querySelector('[data-galaxy-stage-controls]');
    expect(controls.textContent).toMatch(/Stage 1 of \d+: /);
    expect(controls.querySelectorAll('button')[0].disabled).toBe(true);
    expect(controls.querySelectorAll('button')[1].disabled).toBe(false);
  });
});
