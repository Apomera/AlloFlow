// Math review 2 (2026-10-19): self-grade help text vs problems awaiting review.
//
// A generated problem whose answer key conflicts with its expression is marked
// _verification.reviewRequired. In self-grade mode that problem shows a "needs
// teacher review" notice and no answer box, and Submit Assessment stays disabled
// until a teacher fixes it (pinned by math_view_second_pass.test.js). The help
// text under the title still said "Answered 1 of 2. Answer every problem to
// enable Submit Assessment." The student cannot answer the flagged problem, so
// that instruction could never be followed. The help now counts the problems
// the student can answer and says how many are waiting for teacher review.
//
// MATH_REVIEW2_VIEW_MODULE lets the mutation check load a copy with the fix reverted.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const MODULE = process.env.MATH_REVIEW2_VIEW_MODULE || 'view_math_module.js';

function loadMathView() {
  const hookSlots = [];
  const layoutEffects = [];
  let hookCursor = 0;
  const createElement = (type, props, ...children) => ({ type, props: props || {}, children });
  const React = {
    Fragment: Symbol('Fragment'),
    createElement,
    useRef(initialValue) {
      const index = hookCursor++;
      if (!hookSlots[index]) hookSlots[index] = { current: initialValue };
      return hookSlots[index];
    },
    useLayoutEffect(effect) { layoutEffects.push(effect); },
    useEffect: () => {},
  };
  const window = { React, AlloIcons: {}, AlloModules: {}, setTimeout: callback => callback() };
  const icon = () => null;
  vm.runInNewContext(fs.readFileSync(path.resolve(MODULE), 'utf8'), {
    console: { error: vi.fn(), warn: vi.fn(), log: vi.fn() },
    document: { getElementById: () => null },
    window, React,
    EyeOff: icon, Eye: icon, Copy: icon, ImageIcon: icon, CheckCircle2: icon,
    Pencil: icon, Globe: icon, RefreshCw: icon, Sparkles: icon, ChevronDown: icon,
  });
  const Raw = window.AlloModules.MathView;
  return props => {
    hookCursor = 0;
    layoutEffects.length = 0;
    const tree = Raw(props);
    layoutEffects.splice(0).forEach(effect => effect());
    return tree;
  };
}

function walk(node, out = []) {
  if (Array.isArray(node)) { node.forEach(child => walk(child, out)); return out; }
  if (!node || typeof node !== 'object') return out;
  out.push(node);
  walk(node.children, out);
  return out;
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join('');
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return typeof node === 'object' ? text(node.children) : '';
}

const flagged = { id: 'flagged', question: '4 × 5', expression: '4+5', answer: '20', steps: [], _verification: { reviewRequired: true, verified: false } };
const plain = id => ({ id, question: 'What is 2 + 2?', answer: '4', steps: [] });
const content = problems => ({ id: 'r', type: 'math', meta: 'Math - Practice', data: { title: 'Practice', problems } });

function render(problems, answers, extra = {}) {
  const MathView = loadMathView();
  const tree = MathView({
    generatedContent: content(problems), isTeacherMode: false, mathSelfGradeMode: true,
    mathStudentAnswers: answers, submitMathSelfGrade: vi.fn(), ...extra,
  });
  const help = walk(tree).find(n => n.type === 'p' && /^math-self-grade-help-/.test(String(n.props.id || '')));
  const submit = walk(tree).find(n => n.type === 'button' && /Submit Assessment/.test(text(n)));
  return { help: help ? text(help) : '', submit };
}

describe('self-grade help counts problems awaiting teacher review', () => {
  it('says how many problems await review instead of "answer every problem"', () => {
    const { help, submit } = render([plain('a'), flagged], { a: '4' });
    expect(help).not.toMatch(/Answer every problem/);
    expect(help).toContain('Answered 1 of 1.');
    expect(help).toContain('Problems waiting for teacher review: 1.');
    expect(help).toContain('Submit Assessment stays off until teacher review is done.');
    if (submit) expect(submit.props.disabled).toBe(true);
  });

  it('counts only the problems the student can answer', () => {
    const { help } = render([plain('a'), plain('b'), flagged, { ...flagged, id: 'flagged2' }], { a: '4', flagged: '20' });
    expect(help).toContain('Answered 1 of 2.');
    expect(help).toContain('Problems waiting for teacher review: 2.');
  });

  it('when every problem awaits review it does not report "Answered 0 of 0"', () => {
    const { help } = render([flagged], {});
    expect(help).not.toMatch(/Answered 0 of 0|Answer every problem/);
    expect(help).toContain('Problems waiting for teacher review: 1.');
  });

  it('uses the translated string with its counts when the host has one', () => {
    const t = (key, params) => key === 'math.self_grade_review_pending'
      ? `Respondidas ${params.answered} de ${params.answerable}; en revision: ${params.count}`
      : key;
    const { help } = render([plain('a'), flagged], { a: '4' }, { t });
    expect(help).toBe('Respondidas 1 de 1; en revision: 1');
  });

  it('without flagged problems the original guidance is unchanged', () => {
    expect(render([plain('a'), plain('b')], { a: '4' }).help)
      .toBe('Answered 1 of 2. Answer every problem to enable Submit Assessment.');
    expect(render([plain('a'), plain('b')], { a: '4', b: '4' }).help)
      .toBe('All 2 problems are answered. Review your responses, then submit.');
  });
});
