import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const paths = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const result = find(child, predicate); if (result) return result; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function session(file, extra = {}) {
  const tool = loadTool(file, 'anatomy');
  let data = { anatomy: { _activeTab: 'quiz', system: 'organs', complexity: 3, view: 'anterior', ...extra } };
  const render = () => tool.render(makeCtx({ toolData: data, gradeLevel: '9', setToolData: update => { data = typeof update === 'function' ? update(data) : update; } }));
  const node = predicate => { const result = find(render(), predicate); expect(result).not.toBeNull(); return result; };
  return {
    data: () => data.anatomy,
    patch: patch => { data = { anatomy: { ...data.anatomy, ...patch } }; },
    capture: () => node(n => n.props?.['data-anatomy-quiz-panel']).ref({}),
    answer: id => node(n => n.props?.['data-anatomy-quiz-option'] === id).props.onClick(),
    next: () => node(n => n.props?.['data-anatomy-quiz-next']).props.onClick(),
    options: () => { const ids = []; function walk(n) { if (!n || typeof n !== 'object') return; if (Array.isArray(n)) return n.forEach(walk); if (n.props?.['data-anatomy-quiz-option']) ids.push(n.props['data-anatomy-quiz-option']); walk(n.props?.children); } walk(render()); return ids; }
  };
}
beforeEach(resetStemLab);
for (const file of paths) describe('Quiz coverage and saved sessions: ' + file, () => {
  // Execute the production helper in isolation; no copy of the scheduling formula.
  const source = fs.readFileSync(file, 'utf8');
  const helper = source.match(/  function anatomyQuizPosition\(index, count\) \{[\s\S]*?\n  \}/)?.[0];
  const position = new Function('return (' + helper + ');')();
  it('covers every structure and every question type once for pool sizes 1–128', () => {
    for (let count = 1; count <= 128; count++) {
      const seen = new Set();
      for (let index = 0; index < 4 * count; index++) {
        const p = position(index, count);
        expect(p.poolIndex).toBeGreaterThanOrEqual(0); expect(p.poolIndex).toBeLessThan(count);
        expect(p.type).toBe(index % 4);
        seen.add(p.poolIndex + ':' + p.type);
        expect(position(index + 4 * count, count)).toEqual(p);
      }
      expect(seen.size, 'pool size ' + count).toBe(4 * count);
    }
  });
  it('starts with the four highest-priority structures and handles long sessions', () => {
    for (const count of [4, 6, 8, 16, 23, 128]) {
      expect([0, 1, 2, 3].map(index => position(index, count).poolIndex)).toEqual([0, 1, 2, 3]);
      const p = position(Number.MAX_SAFE_INTEGER, count);
      expect(p.poolIndex).toBeGreaterThanOrEqual(0); expect(p.poolIndex).toBeLessThan(count);
    }
  });
  it('pins an explicit structure and question type across confidence changes and reload', () => {
    const s = session(file, { quizIdx: 18 }); s.capture();
    const question = JSON.parse(JSON.stringify(s.data()._quizQuestion)); const options = s.options();
    expect(question.schedule).toBe('coverage-v1'); expect(question.type).toBe(2); expect(question.poolIds).toContain(question.structureId);
    s.patch({ _structureConfidence: { pancreas: 'practice', thyroid: 'mastered' } }); s.capture();
    expect(s.data()._quizQuestion).toEqual(question); expect(s.options()).toEqual(options);
    resetStemLab(); const restored = session(file, JSON.parse(JSON.stringify(s.data()))); restored.capture();
    expect(restored.data()._quizQuestion).toEqual(question); expect(restored.options()).toEqual(options);
  });
  it('keeps a legacy system answer attached to its original structure, then adopts the new rotation', () => {
    const s = session(file, { quizIdx: 18 }); s.capture();
    const legacy = { ...s.data()._quizQuestion }; delete legacy.schedule; delete legacy.structureId; delete legacy.type;
    s.patch({ _quizQuestion: legacy }); s.answer('endocrine');
    expect(s.data().quizFeedback.correct).toBe(true); expect(s.data()._retrievalEvidence.thyroid).toEqual({ attempts: 1, correct: 1 });
    s.capture(); expect(s.data()._quizQuestion).toEqual(legacy);
    s.next(); expect(s.data()._quizQuestion.schedule).toBe('coverage-v1'); expect(s.data()._quizQuestion.index).toBe(19);
  });
  it('keeps coverage intact after a miss changes confidence priorities', () => {
    const s = session(file); s.capture(); const original = s.data()._quizQuestion;
    s.answer(s.options().find(id => id !== original.structureId));
    s.patch({ _structureConfidence: { thyroid: 'practice' } }); s.next();
    expect(s.data()._quizQuestion.poolIds).toEqual(original.poolIds);
    expect(s.data()._quizQuestion.structureId).toBe(original.poolIds[1]);
  });
  it('refreshes review priorities at the next coverage cycle', () => {
    const s = session(file); s.capture(); const count = s.data()._quizQuestion.poolIds.length;
    s.patch({ quizIdx: count * 4 - 1, _quizQuestion: null }); s.capture();
    const last = s.data()._quizQuestion;
    s.patch({ _structureConfidence: { thyroid: 'practice' } }); s.answer(last.structureId); s.next();
    expect(s.data()._quizQuestion.index).toBe(count * 4);
    expect(s.data()._quizQuestion.poolIds[0]).toBe('thyroid'); expect(s.data()._quizQuestion.structureId).toBe('thyroid');
  });
  it('rejects inconsistent structure IDs, types, and unknown schedule versions', () => {
    const s = session(file); s.capture(); const original = s.data()._quizQuestion;
    for (const patch of [{ structureId: 'thyroid' }, { type: 3 }, { schedule: 'unknown' }]) {
      s.patch({ _quizQuestion: { ...original, ...patch }, quizFeedback: { chosen: 'endocrine', questionKey: original.context + '|0' } });
      s.capture(); expect(s.data()._quizQuestion.schedule).toBe('coverage-v1'); expect(s.data()._quizQuestion.structureId).toBe(original.structureId);
      expect(s.data()._quizQuestion.token).not.toBe(original.token);
    }
  });
  it('resets indices that cannot be represented safely', () => {
    const s = session(file, { quizIdx: 1e99 }); s.capture();
    expect(s.data()._quizQuestion.index).toBe(0); expect(s.data()._quizQuestion.type).toBe(0);
    s.answer(s.data()._quizQuestion.structureId); expect(s.data().quizFeedback.correct).toBe(true);
    s.next(); expect(s.data()._quizQuestion.index).toBe(1);
  });
});
