import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const paths = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const day = 86400000;
function find(node, predicate) { if (!node || typeof node !== 'object') return null; if (Array.isArray(node)) { for (const child of node) { const hit = find(child, predicate); if (hit) return hit; } return null; } return predicate(node) ? node : find(node.props?.children, predicate); }
function text(node) { return node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(text).join(' ') : text(node.props?.children); }
function session(file, extra = {}) {
  resetStemLab(); const tool = loadTool(file, 'anatomy');
  let data = { anatomy: { system: 'skeletal', view: 'anterior', complexity: 3, _activeTab: 'quiz', ...extra } };
  const announcements = [];
  const render = () => tool.render(makeCtx({ toolData: data, gradeLevel: '9', announceToSR: message => announcements.push(message), setToolData: updater => { data = typeof updater === 'function' ? updater(data) : updater; } }));
  const button = predicate => { const b = find(render(), n => n.type === 'button' && predicate(n)); expect(b).not.toBeNull(); return b; };
  const html = () => { const root = document.createElement('div'); root.innerHTML = renderTool('anatomy', data, { gradeLevel: '9' }); return root; };
  return { data: () => data.anatomy, announcements, button, html,
    patch: patch => { data = { anatomy: { ...data.anatomy, ...patch } }; },
    click: label => button(n => n.props['aria-label'] === label || text(n).trim() === label).props.onClick(),
    answer: id => button(n => n.props['data-anatomy-quiz-option'] === id).props.onClick(),
    prompt: () => html().querySelector('[data-anatomy-quiz-panel] p.bg-slate-50').textContent,
    options: () => [...html().querySelectorAll('[data-anatomy-quiz-option]')].map(n => n.dataset.anatomyQuizOption),
    feedback: () => html().querySelector('[data-anatomy-quiz-panel] [role="status"]')?.textContent
  };
}
beforeEach(resetStemLab);
afterEach(() => vi.restoreAllMocks());
for (const file of paths) {
  describe(`Anatomy learning reliability in ${file}`, () => {
    for (const [index, correctId] of [[0, 'skull'], [1, 'true'], [2, 'skeletal'], [3, 'sternum'], [5, 'false']]) {
      for (const correct of [true, false]) {
        it(`keeps question ${index} and options stable after a ${correct ? 'correct' : 'wrong'} answer and reload`, () => {
          const s = session(file, { quizIdx: index });
          const prompt = s.prompt(); const options = s.options();
          expect(options).toContain(correctId);
          const chosen = correct ? correctId : options.find(id => id !== correctId);
          s.answer(chosen);
          expect(s.prompt()).toBe(prompt); expect(s.options()).toEqual(options);
          expect(s.data().quizFeedback.correct).toBe(correct);
          expect(s.feedback()).toContain(correct ? 'Correct!' : 'The answer was:');
          expect(s.data().quizScore || 0).toBe(correct ? 1 : 0);
          expect(s.html().querySelectorAll('[data-anatomy-quiz-option]:disabled').length).toBe(options.length);
          const restored = session(file, JSON.parse(JSON.stringify(s.data())));
          expect(restored.prompt()).toBe(prompt); expect(restored.options()).toEqual(options);
          expect(restored.feedback()).toBe(s.feedback());
          restored.patch({ _hoverStructure: 'femur' }); expect(restored.prompt()).toBe(prompt);
        });
      }
    }
    it('captures unanswered questions when opening Quiz and replaces them on Next and Restart', () => {
      const s = session(file, { _activeTab: 'explore' }); s.click('Quiz');
      const original = s.prompt(); const originalOptions = s.options();
      s.patch({ _structureConfidence: { ribs: 'practice' } });
      expect(s.prompt()).toBe(original); expect(s.options()).toEqual(originalOptions);
      s.answer('skull'); s.click('Next Question');
      expect(s.data()._quizQuestion.index).toBe(1); expect(s.data()._quizQuestion.poolIds[0]).toBe('ribs');
      expect(s.feedback()).toBeUndefined();
      s.click('Restart quiz');
      expect(s.data()._quizQuestion.index).toBe(0); expect(s.data().quizScore).toBe(0); expect(s.data()._quizAttempts).toBe(0);
      expect(s.options()).toContain('ribs');
    });
    it('rejects saved feedback when the diagram context changes or the saved question is malformed', () => {
      const s = session(file); s.answer('skull');
      const saved = JSON.parse(JSON.stringify(s.data()));
      for (const patch of [{ view: 'posterior' }, { complexity: 1 }, { system: 'respiratory' }, { _quizQuestion: { ...saved._quizQuestion, poolIds: ['skull', 'skull'] } }, { _quizQuestion: { ...saved._quizQuestion, poolIds: ['forged'] } }]) {
        const changed = session(file, { ...saved, ...patch });
        expect(changed.feedback()).toBeUndefined();
        expect(changed.html().querySelectorAll('[data-anatomy-quiz-option]:disabled')).toHaveLength(0);
      }
    });
    it('accepts only one answer and timestamp write for a question', () => {
      const clock = vi.spyOn(Date, 'now').mockReturnValue(1800000000000);
      const s = session(file); const submit = s.button(n => n.props['data-anatomy-quiz-option'] === 'skull').props.onClick;
      submit(); const saved = JSON.parse(JSON.stringify(s.data()));
      clock.mockReturnValue(1800000005000); submit(); s.answer('skull');
      expect(s.data()).toEqual(saved); expect(s.data()._quizAttempts).toBe(1);
    });
    for (const level of ['learning', 'mastered']) {
      it(`refreshes successful ${level} evidence without changing the confidence level`, () => {
        const now = 1800000000000; vi.spyOn(Date, 'now').mockReturnValue(now);
        const s = session(file, { _structureConfidence: { skull: level }, _confidenceAt: { skull: now - 10 * day } });
        s.answer('skull');
        expect(s.data()._structureConfidence.skull).toBe(level); expect(s.data()._confidenceAt.skull).toBe(now);
        s.click('Cards'); expect(s.html().textContent).toContain('Due for review (0)');
      });
    }
    it('refreshes an unchanged Need practice timestamp and keeps the structure due', () => {
      const now = 1800000000000; vi.spyOn(Date, 'now').mockReturnValue(now);
      const s = session(file, { _structureConfidence: { skull: 'practice' }, _confidenceAt: { skull: now - 10 * day } });
      s.answer(s.options().find(id => id !== 'skull'));
      expect(s.data()._structureConfidence.skull).toBe('practice'); expect(s.data()._confidenceAt.skull).toBe(now);
      s.click('Cards'); expect(s.html().textContent).toContain('Due for review (1)');
    });
    it('records fresh Spotter evidence once even when confidence is already Got it', () => {
      const now = 1800000000000; const clock = vi.spyOn(Date, 'now').mockReturnValue(now);
      const s = session(file, { _activeTab: 'spotter', _spotterActive: true, _spotterTarget: 'skull', _spotterOpts: ['skull', 'mandible', 'clavicle', 'ribs'].map(id => ({ id })), _spotterStartTime: now - 2000, _structureConfidence: { skull: 'mastered' }, _confidenceAt: { skull: now - 10 * day } });
      s.button(n => n.props['aria-keyshortcuts'] === '1').props.onClick();
      expect(s.data()._structureConfidence.skull).toBe('mastered'); expect(s.data()._confidenceAt.skull).toBe(now);
      expect(s.data()._spotterTotal).toBe(1); expect(s.data()._spotterScore).toBe(1);
      clock.mockReturnValue(now + 1000); s.button(n => n.props['aria-keyshortcuts'] === '1').props.onClick();
      expect(s.data()._confidenceAt.skull).toBe(now); expect(s.data()._spotterTotal).toBe(1);
    });
    it('keeps hidden card announcements limited to names and positions across navigation and Locate', () => {
      const s = session(file, { _activeTab: 'explore', _structureConfidence: { ribs: 'practice' } }); s.click('Cards');
      const hiddenAnnouncement = () => {
        const root = s.html(); const card = root.querySelector('[data-anatomy-recall-card]');
        const name = card.querySelector('h3').textContent; const position = root.querySelector('[aria-label="Flashcard progress"]').textContent.split('/');
        expect(s.announcements.at(-1)).toBe(`Flashcard ${position[0]} / ${position[1]}. ${name}. Answer hidden`);
      };
      hiddenAnnouncement();
      for (const label of ['Next flashcard', 'Previous', 'Random', 'Next unrated', 'Locate this card']) { s.click(label); hiddenAnnouncement(); }
      s.click('Reveal function');
      const answer = s.html().querySelector('#anatomy-flashcard-content p.text-xs').textContent;
      s.click('Locate this card'); expect(s.announcements.at(-1)).toContain(answer);
      s.click('Show structure name'); s.click('Locate this card'); hiddenAnnouncement();
    });
  });
}