import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');

function productionFunction(name, bindings = {}) {
  const matches = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (matches.length !== 1) throw new Error('Expected one production function: ' + name);
  const match = matches[0], start = match.index + match[1].length;
  const ending = '\n' + match[1] + '}', end = source.indexOf(ending, start);
  if (end < start) throw new Error('Missing function ending: ' + name);
  return new Function(...Object.keys(bindings), '"use strict"; return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}

const sentenceExcerpt = productionFunction('dissectionSentenceExcerpt');
const structureCue = productionFunction('dissectionStructureCue', { dissectionSentenceExcerpt: sentenceExcerpt });
const dissHash = productionFunction('dissHash');
const dissStableOrder = productionFunction('dissStableOrder', { dissHash });
const guidedChoices = productionFunction('dissectionGuidedObservationChoices', { dissStableOrder });
const specimenStart = source.indexOf('var SPECIMENS = ') + 'var SPECIMENS = '.length;
const specimenEnd = source.indexOf('// ════════ ACTIVE STATE', specimenStart);
const specimens = new Function('return ' + source.slice(specimenStart, specimenEnd))();

describe('dissection authored assessment cues', () => {
  it.each([
    ['~1.2 million axons. Exits at the optic disc.', '~1.2 million axons.'],
    ['Compare e.g. a nerve and a vessel. Then explain the difference.', 'Compare e.g. a nerve and a vessel.'],
    ['Dr. Smith recorded 2.5 cm. Another observation follows.', 'Dr. Smith recorded 2.5 cm.'],
    ['A U.S. reference describes the model. Another sentence follows.', 'A U.S. reference describes the model.'],
    ['The optic disc is visible! Which feature supports it?', 'The optic disc is visible!'],
    ['  An observation without punctuation  ', 'An observation without punctuation.'],
  ])('keeps a complete first statement in %s', (text, expected) => {
    expect(sentenceExcerpt(text, 1)).toBe(expected);
  });

  it('preserves decimals and abbreviations in the two-sentence feedback fallback', () => {
    const organ = { fn: '~1.2 million axons. Exits at the optic disc, i.e. the blind spot. A third fact.' };
    expect(structureCue(organ, 'explanation')).toBe('~1.2 million axons. Exits at the optic disc, i.e. the blind spot.');
    expect(structureCue(organ, 'observation')).toBe('~1.2 million axons.');
  });

  it('uses authored function, observation and explanation fields independently', () => {
    const organ = { fn: 'Generic reference text.', functionClue: '  Carries signals  ', observationCue: 'A visible bundle leaves the eye.', assessmentExplanation: 'The signal route has two stages. Both stages matter.' };
    expect(structureCue(organ, 'function')).toBe('Carries signals.');
    expect(structureCue(organ, 'observation')).toBe('A visible bundle leaves the eye.');
    expect(structureCue(organ, 'explanation')).toBe('The signal route has two stages. Both stages matter.');
    expect(structureCue({ fn: 'Fallback text.', functionClue: '  ' }, 'function')).toBe('Fallback text.');
    expect(structureCue(null, 'function')).toBe('Description not available.');
  });

  it('provides meaningful cues for the optic nerve and the perch stomach', () => {
    const opticNerve = specimens.sheepEye.organs.skin.find(organ => organ.id === 'optic_nerve');
    const stomach = specimens.perch.organs.organs.find(organ => organ.id === 'stomach_f');
    expect(structureCue(opticNerve, 'function')).toContain('retinal signals');
    expect(structureCue(opticNerve, 'observation')).toContain('nerve bundle');
    expect(structureCue(opticNerve, 'explanation')).toContain('no photoreceptors');
    expect(structureCue(stomach, 'function')).toContain('acid and pepsin');
    expect(structureCue(stomach, 'observation')).toContain('gastric sac');
    expect(structureCue(stomach, 'observation')).toContain('pyloric outlet');
    expect(structureCue(stomach, 'observation')).toContain('three pyloric caeca');
    expect(structureCue(stomach, 'explanation')).toContain('between the esophagus and intestine');
    expect(structureCue(stomach, 'function')).not.toBe('J-shaped.');
  });

  it.each(['correct answer', 'supported reveal'])('uses the authored explanation after a %s', mode => {
    const quizQ = specimens.sheepEye.organs.skin.find(organ => organ.id === 'optic_nerve');
    const d = mode === 'supported reveal' ? { quizRetry: { questionId: quizQ.id, chosen: 'cornea' } } : {};
    const bindings = {
      d, quizQ, specimen: 'sheepEye', quizKind: 'function', dissectionStructureCue: structureCue,
      updMany: patch => Object.assign(d, patch), addToast: null, awardStemXP: vi.fn(), setProcedureFeedback: vi.fn(),
      preserveAssessmentFocus: vi.fn(),
    };
    if (mode === 'supported reveal') productionFunction('revealQuizAnswer', bindings)();
    else productionFunction('submitQuizAnswer', bindings)(quizQ.id);
    expect(d.quizExplanation).toBe(quizQ.assessmentExplanation);
    expect(d.quizExplanation).not.toContain('~1.');
    expect(d.quizFeedback.supported).toBe(mode === 'supported reveal');
  });
});

describe('dissection Guided answer integrity', () => {
  it('keeps choices stable without fixing the answer position across real catalog targets', () => {
    const positions = new Set();
    let checked = 0;
    for (const [specimenId, specimen] of Object.entries(specimens)) {
      for (const organs of Object.values(specimen.organs)) {
        for (const target of organs) {
          const before = organs.slice();
          const salt = specimenId + '|guided-observation|' + target.id;
          const choices = guidedChoices(target, organs, salt);
          expect(choices).toEqual(guidedChoices(target, organs, salt));
          expect(choices).toHaveLength(Math.min(3, organs.length));
          expect(new Set(choices.map(organ => organ.id)).size).toBe(choices.length);
          expect(choices.filter(organ => organ.id === target.id)).toHaveLength(1);
          expect(organs).toEqual(before);
          positions.add(choices.findIndex(organ => organ.id === target.id));
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect([...positions].sort()).toEqual([0, 1, 2]);
  });

  it('uses only the exposed distractor pool and handles a single available structure', () => {
    const target = { id: 'target' }, visible = { id: 'visible' };
    expect(guidedChoices(null, [visible], 'test')).toEqual([]);
    expect(guidedChoices(target, [target], 'test')).toEqual([target]);
    expect(new Set(guidedChoices(target, [target, visible], 'test'))).toEqual(new Set([target, visible]));
  });

  it('checks shuffled choices by identity and never grants credit for a distractor', () => {
    const target = { id: 'optic_nerve', name: 'Optic Nerve' }, distractor = { id: 'cornea' };
    const choices = guidedChoices(target, [target, distractor], 'sheepEye|guided-observation|optic_nerve');
    const d = { guidedObservationPending: target.id, verifiedIdentifications: {} };
    const upd = vi.fn((key, value) => { d[key] = value; });
    const updMany = vi.fn(patch => Object.assign(d, patch));
    const awardStemXP = vi.fn();
    const record = productionFunction('recordGuidedObservationChoice', {
      d, organs: [target, distractor], currentGuided: { organId: target.id }, specimen: 'sheepEye', activeLayer: 'skin',
      guidedStep: 0, guidedSteps: [target, distractor], guidedTargetIds: [target.id, distractor.id],
      upd, updMany, awardStemXP, setProcedureFeedback: vi.fn(), sfxDisProbe: vi.fn(), addToast: null,
      setTimeout: () => 0, focusDissectionTarget: vi.fn(),
    });
    expect(record(choices.find(organ => organ.id !== target.id).id)).toBe(false);
    expect(d.verifiedIdentifications).toEqual({});
    expect(awardStemXP).not.toHaveBeenCalled();
    expect(record(choices.find(organ => organ.id === target.id).id)).toBe(true);
    expect(d.verifiedIdentifications['sheepEye|optic_nerve']).toMatchObject({ status: 'verified', guided: true, layer: 'skin' });
    expect(d.guidedStep).toBe(1);
    expect(awardStemXP).toHaveBeenCalledTimes(1);
  });
});

describe('dissection assessment cue integration', () => {
  beforeEach(() => { resetStemLab(); localStorage.clear(); loadTool('stem_lab/stem_tool_dissection.js', 'dissection'); });

  it('renders the authored observation cue in the actual Guided evidence panel', () => {
    const html = renderTool('dissection', { dissection: {
      specimen: 'sheepEye', activeLayer: 'skin', _dissLoadedSpec: 'sheepEye',
      guidedMode: true, guidedStep: 0, guidedTargetIds: ['optic_nerve'], guidedObservationPending: 'optic_nerve',
    } });
    const page = new DOMParser().parseFromString(html, 'text/html');
    const panel = page.querySelector('#diss-guided-observation-check');
    expect(panel).not.toBeNull();
    expect(panel.textContent).toContain('A nerve bundle leaves the back of the eye');
    expect(panel.textContent).not.toContain('~1.');
    const optionText = [...panel.querySelectorAll('.diss-learning-check__option')].map(button => button.textContent);
    expect(optionText).toHaveLength(3);
    const skin = specimens.sheepEye.organs.skin;
    const target = skin.find(organ => organ.id === 'optic_nerve');
    expect(optionText.map(text => text.replace(/^\s*[1-3]\s*/, '').trim())).toEqual(
      guidedChoices(target, skin, 'sheepEye|guided-observation|optic_nerve').map(organ => structureCue(organ, 'observation'))
    );
  });

  it('renders the authored function cue in the actual practice question', () => {
    const html = renderTool('dissection', { dissection: {
      specimen: 'sheepEye', activeLayer: 'skin', _dissLoadedSpec: 'sheepEye',
      quizMode: true, quizReviewMode: true, quizReviewQueue: ['optic_nerve'], quizIdx: 0,
    } });
    const page = new DOMParser().parseFromString(html, 'text/html');
    const panel = page.querySelector('#diss-quiz-panel');
    expect(panel).not.toBeNull();
    expect(panel.textContent).toContain('Function clue: "Carries retinal signals from the eye toward the brain and exits at the optic disc."');
    expect(panel.textContent).not.toContain('Function clue: "~1.');
  });
});
