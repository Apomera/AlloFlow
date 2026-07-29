// Two smaller rock-cycle defects, both only visible when you use the tool.
//
//   1. QUIZ REPEATS. "Next Question" picked with a bare Math.random() over ten
//      questions and kept no memory, so it had a one-in-ten chance of serving
//      the identical question straight back, and a ten-press run showed about
//      six distinct ones.
//
//   2. HEADING WORD ORDER. The family panel built its title as
//      `sel.label + " Rocks"`. sel.label is translated and " Rocks" was not, so
//      a Spanish pack rendered "Ígneas Rocks" — and a language that puts the
//      noun first could not fix it at all, because the order was in the code.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const ROCKS_FILE = 'stem_lab/stem_tool_rocks.js';

function session(overrides) {
  const store = { rocks: {}, rockCycle: {} };
  const ctx = makeCtx(Object.assign({
    toolData: store,
    setToolData: (f) => { const n = typeof f === 'function' ? f(store) : f; Object.assign(store, n); },
  }, overrides || {}));
  return {
    store,
    render: () => window.StemLab._registry.rockCycle.render(ctx),
  };
}

function findAll(node, predicate, acc = []) {
  if (node == null || typeof node !== 'object') return acc;
  if (Array.isArray(node)) { node.forEach((n) => findAll(n, predicate, acc)); return acc; }
  if (predicate(node)) acc.push(node);
  const kids = node.props && node.props.children;
  if (kids != null) findAll(kids, predicate, acc);
  return acc;
}

function text(node) {
  return findAll(node, () => true)
    .map((n) => (typeof n.props.children === 'string' ? n.props.children : ''))
    .join(' ');
}

// Press "Quiz Mode" / "Next Question" once, re-rendering so the handler closes
// over the state the previous press produced.
function nextQuestion(s) {
  const btn = findAll(s.render(), (n) =>
    n.type === 'button' && n.props['aria-label'] === 'Start rock cycle quiz');
  expect(btn, 'quiz button not found').toHaveLength(1);
  btn[0].props.onClick();
  return s.store.rockCycle.rcQuiz;
}

beforeEach(() => {
  resetStemLab();
  loadTool(ROCKS_FILE, 'rocks');
});

describe('the quiz works through its questions instead of resampling', () => {
  it('never repeats until every question has been asked', () => {
    const s = session();
    const seen = [];
    for (let i = 0; i < 10; i++) seen.push(nextQuestion(s).q);
    expect(new Set(seen).size, `got ${new Set(seen).size} distinct of 10:\n${seen.join('\n')}`)
      .toBe(seen.length);
  });

  it('refills the bag rather than running out', () => {
    const s = session();
    for (let i = 0; i < 10; i++) nextQuestion(s);
    expect(s.store.rockCycle.rcQuiz.asked).toHaveLength(10);

    const q11 = nextQuestion(s);
    expect(q11.q, 'an eleventh press must still produce a question').toBeTruthy();
    expect(q11.asked, 'the bag should have refilled, not kept growing').toHaveLength(1);
  });

  it('keeps the score and the asked list across answering', () => {
    const s = session();
    nextQuestion(s);
    const quiz = s.store.rockCycle.rcQuiz;
    const answer = findAll(s.render(), (n) =>
      n.type === 'button' && String(n.props['aria-label'] || '').startsWith('Select answer: ')
      && n.props.children === quiz.a);
    expect(answer, 'the correct option should be on screen').toHaveLength(1);
    answer[0].props.onClick();

    const after = s.store.rockCycle.rcQuiz;
    expect(after.answered).toBe(true);
    expect(after.score).toBe(1);
    // Answering must not drop the memory of what has been asked, or the very
    // next press could serve the question just answered.
    expect(after.asked).toEqual(quiz.asked);

    const next = nextQuestion(s);
    expect(next.q).not.toBe(quiz.q);
    expect(next.score, 'score carries forward').toBe(1);
  });

  it('every question is reachable', () => {
    const s = session();
    const seen = new Set();
    for (let i = 0; i < 10; i++) seen.add(nextQuestion(s).q);
    // Ten presses with no repeats means the bag holds exactly the ten written
    // questions — if one were unreachable the loop could not have filled.
    expect(seen.size).toBe(10);
  });
});

describe('the family heading lets a translation own its word order', () => {
  it('renders through a template, not a concatenation', () => {
    // A pack that puts the noun first must be able to say so. If the code still
    // built `label + " Rocks"`, this key would be ignored and the assertion
    // below would fail.
    const s = session({
      t: (k, fb) => {
        if (k === 'stem.rocks.family_rocks_heading') return 'Rocas {family}';
        if (k === 'stem.rocks.igneous') return 'ígneas';
        return fb || k;
      },
    });
    s.store.rockCycle.selectedRock = 'igneous';
    const out = text(s.render());
    expect(out).toContain('Rocas ígneas');
    expect(out).not.toContain('ígneas Rocks');
  });

  it('still reads correctly with no pack loaded', () => {
    const s = session({ t: (k, fb) => fb || String(k).split('.').pop() });
    s.store.rockCycle.selectedRock = 'metamorphic';
    expect(text(s.render())).toContain('metamorphic Rocks');
  });

  it('leaves no unsubstituted placeholder on screen', () => {
    const s = session();
    s.store.rockCycle.selectedRock = 'sedimentary';
    expect(text(s.render())).not.toContain('{family}');
  });
});
