// The Sequence Sense card in the Assess view, driven the way a student clicks
// it: verify, point at a misplaced item, arrange the correct order, and
// optionally claim the +1 bonus ordering principle (or skip it without penalty).
import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
let root, host, api;
const t = (key, options) => options?.defaultValue || key;
const swapped = {
  type: 'sequence-sense', question: 'Check the water cycle.', items: ['Evaporation', 'Condensation', 'Precipitation', 'Collection'],
  presentedOrder: [0, 2, 1, 3], intentionallyWrongIndex: 1, orderingPrinciple: 'process', principleOptions: ['process', 'chronological', 'size'],
};
let testSeqId = 0;
function base(question, extra = {}) {
  return {
    t, isTeacherMode: false, isParentMode: false, isIndependentMode: true, studentProjectSettings: {}, activeSessionCode: null, sessionData: {},
    isPresentationMode: false, isReviewGame: false, isEditingQuiz: false, escapeRoomState: { isActive: false }, presentationState: {}, reviewGameState: {},
    isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English', generatedContent: { id: 'seq-card-' + (++testSeqId), data: { questions: [question] } },
    formatInlineText: (value) => value, renderFormattedText: (value) => value, getReviewCategories: () => [], getRows: () => 1, playSound: () => {},
    handleToggleIsPresentationMode: vi.fn(), handleToggleIsReviewGame: vi.fn(), resetPresentation: vi.fn(), onSubmitLiveAnswer: vi.fn(), ...extra,
  };
}
beforeAll(() => { global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true; window.AlloLanguageContext = React.createContext({ t }); window.__alloT = t; window.AlloIcons = {}; loadAlloModule('view_quiz_module.js'); api = window.AlloModules; });
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; localStorage.clear(); sessionStorage.clear(); vi.restoreAllMocks(); });
async function render(props) { if (!root) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); } await act(async () => root.render(React.createElement(api.QuizView, { ErrorBoundary: ({ children }) => children, TeacherLiveQuizControls: () => null, ConfettiExplosion: () => null, ...props }))); }
const button = (text) => [...host.querySelectorAll('button')].find((el) => el.textContent.trim() === text);
const byLabel = (label) => host.querySelector(`button[aria-label="${label}"]`);
const rows = () => [...host.querySelectorAll('li[role="button"], li button')].filter((el) => /^\d+\./.test(el.textContent.trim()));
async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); }
const yourOrder = () => [...host.querySelectorAll('ol[aria-label="Your order"] li')].map((li) => li.querySelectorAll('span')[1].textContent);

describe('Sequence Sense card', () => {
  it('accepts the other half of the swap, scores the 3 core steps, and awards +1 bonus for the principle', async () => {
    // A session code is what makes the card report each answer to the host.
    const props = base(swapped, { activeSessionCode: 'LIVE1', sessionData: { quizState: { isActive: true }, roster: {} } });
    await render(props);
    expect(host.textContent).toContain('Step 1 of 3');
    await click(button('✗ No, something is off'));
    expect(host.textContent).toContain('Step 2 of 3');
    // Displayed: Evaporation, Precipitation, Condensation, Collection. The author
    // wrote index 1 (Precipitation); the student points at Condensation (index 2).
    expect(rows().map((li) => li.textContent)).toEqual(['1.Evaporation', '2.Precipitation', '3.Condensation', '4.Collection']);
    await click(rows()[2]);
    expect(host.textContent).toContain('Step 3 of 3');
    expect(yourOrder()).toEqual(['Evaporation', 'Precipitation', 'Condensation', 'Collection']);
    expect(byLabel('Move up: Evaporation').disabled).toBe(true);
    await click(byLabel('Move up: Condensation'));
    expect(yourOrder()).toEqual(['Evaporation', 'Condensation', 'Precipitation', 'Collection']);
    await click(button('Done arranging'));
    expect(host.textContent).toContain('Bonus (+1, optional)');
    await click(button('process'));
    expect(host.textContent).toContain('3 / 3 (+1 bonus)');
    expect(host.textContent).toContain('✓ Verify: items 2 and 3 were swapped');
    expect(host.textContent).toContain('✓ Diagnose: you found a misplaced item');
    expect(host.textContent).toContain('✓ Arrange: your order matched');
    expect(host.textContent).toContain('★ Bonus (+1): "process"');
    expect(host.querySelectorAll('li').length).toBeGreaterThan(0);
    expect([...host.querySelectorAll('span')].filter((el) => el.textContent === '↔ misplaced')).toHaveLength(2);
    expect(props.onSubmitLiveAnswer).toHaveBeenCalledWith(expect.objectContaining({
      itemType: 'sequence-sense',
      answer: expect.objectContaining({ verifyAnswer: 'no', clickedIdx: 2, orderAnswer: [0, 1, 2, 3], principleAnswer: 'process', bonusScore: 1, score: 3, status: 'correct' }),
    }));
  });

  it('allows skipping or missing the bonus principle without lowering the 3 / 3 sequence score, and honors acceptablePrinciples', async () => {
    await render(base(swapped));
    await click(button('✗ No, something is off'));
    await click(rows()[2]);
    await click(byLabel('Move up: Condensation'));
    await click(button('Done arranging'));
    await click(host.querySelector('[data-sequence-skip-bonus]'));
    expect(host.textContent).toContain('3 / 3 — All correct');
    expect(host.textContent).toContain('Bonus (skipped)');
    expect(host.textContent).toContain('no penalty');

    // Picking an overlapping principle (chronological vs process) gives an encouraging overlap note without lowering the 3/3 core score.
    await click(button('Try again'));
    await click(button('✗ No, something is off'));
    await click(rows()[2]);
    await click(byLabel('Move up: Condensation'));
    await click(button('Done arranging'));
    await click(button('chronological'));
    expect(host.textContent).toContain('3 / 3 — All correct');
    expect(host.textContent).toContain('Bonus (0)');
    expect(host.textContent).toContain('can often overlap');

    // When the teacher marks chronological in acceptablePrinciples, it earns the +1 bonus.
    await act(async () => root.unmount()); host.remove(); root = host = null; localStorage.clear(); sessionStorage.clear();
    await render(base({ ...swapped, acceptablePrinciples: ['chronological'] }));
    await click(button('✗ No, something is off'));
    await click(rows()[2]);
    await click(byLabel('Move up: Condensation'));
    await click(button('Done arranging'));
    await click(button('chronological'));
    expect(host.textContent).toContain('3 / 3 (+1 bonus)');
    expect(host.textContent).toContain('★ Bonus (+1): "chronological"');
  });

  it('marks a wrong verdict honestly and names the swap instead of one arbitrary item', async () => {
    await render(base(swapped));
    await click(button('✓ Yes, correct'));
    expect(host.textContent).toContain('Step 3 of 3');
    await click(button('Done arranging'));
    await click(button('size'));
    expect(host.textContent).toContain('0 / 3');
    expect(host.textContent).toContain('✗ Verify: items 2 and 3 were swapped (you said "yes")');
    expect(host.textContent).toContain('✗ Arrange: correct order is Evaporation → Condensation → Precipitation → Collection');
    expect(host.textContent).toContain('Bonus (0): suggested "process" (you picked "size" — no penalty)');
    await click(button('Try again'));
    expect(host.textContent).toContain('Step 1 of 3');
    await click(button('✗ No, something is off'));
    await click(rows()[0]);
    await click(button('Done arranging'));
    await click(button('process'));
    expect(host.textContent).toContain('1 / 3 (+1 bonus)');
    expect(host.textContent).toContain('✗ Diagnose: items 2 and 3 were swapped (either one counts)');
  });

  it('treats a canonical display as correct even when the authored index is stale, and never shuffles a missing order', async () => {
    await render(base({ ...swapped, presentedOrder: [0, 1, 2, 3], intentionallyWrongIndex: 2 }));
    expect(rows().length).toBe(0);
    await click(button('✓ Yes, correct'));
    await click(button('Done arranging'));
    await click(button('process'));
    expect(host.textContent).toContain('3 / 3 (+1 bonus)');
    expect(host.textContent).toContain('✓ Verify: order was correct');
    await act(async () => root.unmount()); host.remove(); root = host = null;
    await render(base({ ...swapped, presentedOrder: undefined, intentionallyWrongIndex: null }));
    await click(button('✗ No, something is off'));
    expect(rows().map((li) => li.textContent.replace(/^\d+\./, ''))).toEqual(['Evaporation', 'Condensation', 'Precipitation', 'Collection']);
  });
});

describe('Assess Edit Mode picture removal', () => {
  it('lets teachers remove MCQ question and option pictures as well as non-MCQ pictures even when AI is unavailable', async () => {
    const handleQuizImageRefine = vi.fn();
    const handleQuizQuestionAction = vi.fn();
    const mcqWithImages = {
      type: 'mcq',
      question: 'Which planet is largest?',
      imageUrl: 'data:image/png;base64,AAAA',
      imageAltText: 'Solar system diagram',
      options: ['Jupiter', 'Mars'],
      optionImageUrls: ['data:image/png;base64,BBBB', null],
      correctAnswer: 'Jupiter',
    };
    const seqWithImage = {
      ...swapped,
      imageUrl: 'data:image/png;base64,CCCC',
      imageAltText: 'Water cycle diagram',
    };
    await render(base(mcqWithImages, {
      isTeacherMode: true,
      isIndependentMode: false,
      isEditingQuiz: true,
      generatedContent: { id: 'img-edit', data: { questions: [mcqWithImages, seqWithImage] } },
      handleQuizImageRefine,
      handleQuizQuestionAction,
      handleQuizChange: vi.fn(),
    }));

    const removeMcqQ = host.querySelector('[data-quiz-remove-image="question-0"]');
    const removeMcqOpt = host.querySelector('[data-quiz-remove-image="option-0-0"]');
    const removeNonMcqQ = host.querySelector('[data-quiz-remove-image="question-1"]');
    expect(removeMcqQ).toBeTruthy();
    expect(removeMcqOpt).toBeTruthy();
    expect(removeNonMcqQ).toBeTruthy();
    expect(removeMcqQ.disabled).toBe(false);
    expect(removeMcqOpt.disabled).toBe(false);
    expect(removeNonMcqQ.disabled).toBe(false);

    await click(removeMcqQ);
    expect(handleQuizImageRefine).toHaveBeenCalledWith(0, 'question', null, null);
    await click(removeMcqOpt);
    expect(handleQuizImageRefine).toHaveBeenCalledWith(0, 'option', 0, null);
    await click(removeNonMcqQ);
    expect(handleQuizQuestionAction).toHaveBeenCalledWith(1, 'patch', { imageUrl: '', imageAltText: '' });
  });
});
