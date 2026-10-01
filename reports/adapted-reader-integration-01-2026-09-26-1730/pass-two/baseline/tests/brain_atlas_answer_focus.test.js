// A disabled button leaves the tab order. Answering therefore removed the
// element the keyboard user was standing on, dropped focus to the document, and
// left the feedback that had just appeared reachable only by tabbing from the
// top of the tool again. The authored-card checks in this file have used
// aria-disabled for exactly this reason since June; four answer surfaces had
// not: the Brain Quiz, Function Match, the 3D Find It challenge, and the
// patient-response radio group.
//
// Two of those had no guard at all, so a second click overwrote the recorded
// answer, and in the Brain Quiz it also incremented the score again.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_brainatlas.js';
const src = readFileSync(FILE, 'utf8');

function flatten(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  return [node, ...flatten(node.props?.children)];
}

function session(state = {}) {
  const tool = loadTool(FILE, 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'lateral', ...state } });
  const nodes = () => flatten(tool.render(makeCtx({ announceToSR: vi.fn() }, store)));
  return { store, nodes, state: () => store.toolData.brainAtlas };
}

describe('brainAtlas answer choices keep keyboard focus', () => {
  beforeEach(() => { resetStemLab(); vi.useFakeTimers(); });

  it('no answer surface uses the disabled attribute any more', () => {
    ['disabled: fmAns', 'disabled: !!terminalFeedback', 'disabled: show,', 'disabled: showResult']
      .forEach((fragment) => expect(src, fragment + ' still present').not.toContain(fragment));
  });

  it('the Brain Quiz marks answered options aria-disabled, not disabled', () => {
    const s = session({ quizMode: true, quizIdx: 0 });
    const before = s.nodes().filter((el) => el.props?.['data-brainatlas-quiz-option']);
    expect(before.length).toBe(4);
    before.forEach((el) => expect(el.props['aria-disabled']).toBe('false'));
    before[0].props.onClick();
    const after = s.nodes().filter((el) => el.props?.['data-brainatlas-quiz-option']);
    expect(after.length).toBe(4);
    after.forEach((el) => {
      expect(el.props['aria-disabled']).toBe('true');
      expect(el.props.disabled).toBeUndefined();
    });
  });

  it('a second Brain Quiz click cannot overwrite the answer or the score', () => {
    const s = session({ quizMode: true, quizIdx: 0 });
    const opts = s.nodes().filter((el) => el.props?.['data-brainatlas-quiz-option']);
    opts[0].props.onClick();
    const first = JSON.stringify(s.state().quizFeedback);
    const score = s.state().quizScore || 0;
    const correctCount = s.state().quizCorrect || 0;
    s.nodes().filter((el) => el.props?.['data-brainatlas-quiz-option'])[1].props.onClick();
    expect(JSON.stringify(s.state().quizFeedback)).toBe(first);
    expect(s.state().quizScore || 0).toBe(score);
    expect(s.state().quizCorrect || 0).toBe(correctCount);
  });

  it('the guard sits before the state write, not after it', () => {
    // a guard after the write would still corrupt the answer on the way past
    expect(src).toMatch(/if \(showResult\) return;[\s\S]{0,120}upd\('quizFeedback'/);
    expect(src).toMatch(/if \(show\) return; upd\('patientGuess'/);
    expect(src).toMatch(/if \(terminalFeedback\) return; chooseBrainAtlas3DChallengeOption/);
  });

  it('the patient radio group keeps its answered options focusable', () => {
    expect(src).toContain('role: "radio", "aria-checked": !!wasChosen, "aria-disabled": show ? "true" : "false",');
    // a disabled radio is skipped by the radio group's own arrow-key handling,
    // so this one mattered twice over
    expect(src).not.toMatch(/role: "radio"[^}]*\bdisabled:/);
  });

  it('Function Match relies on the guard its handler already had', () => {
    expect(src).toContain('"aria-disabled": fmAns ? "true" : "false"');
    expect(src).toMatch(/function pickFm\(rId\) \{\s*if \(fmAns\) return;/);
  });

  it('leaves genuinely unavailable controls disabled', () => {
    // a zoom button at its limit, or a study set with nothing in it, has
    // nothing to act on; that is not the same as a locked answer
    expect(src).toContain('disabled: canvasZoom <= 0.75');
    expect(src).toContain('disabled: !brain3DSavedItems.length');
  });

  it('the desktop mirror is byte-identical', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_brainatlas.js', 'utf8')).toBe(src);
  });
});
