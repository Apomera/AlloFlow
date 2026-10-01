// The Sequence Sense card in the Assess view, driven the way a student clicks
// it: verify, point at a misplaced item, arrange the correct order, name the
// principle. Pins the two changes: either half of a swap counts as the
// misplaced item, and the arrange step is scored (4 points, not 3).
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
  presentedOrder: [0, 2, 1, 3], intentionallyWrongIndex: 1, orderingPrinciple: 'process', principleOptions: ['process', 'size'],
};
function base(question, extra = {}) {
  return {
    t, isTeacherMode: false, isParentMode: false, isIndependentMode: true, studentProjectSettings: {}, activeSessionCode: null, sessionData: {},
    isPresentationMode: false, isReviewGame: false, isEditingQuiz: false, escapeRoomState: { isActive: false }, presentationState: {}, reviewGameState: {},
    isFactChecking: {}, showQuizAnswers: false, leveledTextLanguage: 'English', generatedContent: { id: 'seq-card', data: { questions: [question] } },
    formatInlineText: (value) => value, renderFormattedText: (value) => value, getReviewCategories: () => [], getRows: () => 1, playSound: () => {},
    handleToggleIsPresentationMode: vi.fn(), handleToggleIsReviewGame: vi.fn(), resetPresentation: vi.fn(), onSubmitLiveAnswer: vi.fn(), ...extra,
  };
}
beforeAll(() => { global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true; window.AlloLanguageContext = React.createContext({ t }); window.__alloT = t; window.AlloIcons = {}; loadAlloModule('view_quiz_module.js'); api = window.AlloModules; });
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; localStorage.clear(); vi.restoreAllMocks(); });
async function render(props) { if (!root) { host = document.createElement('div'); document.body.append(host); root = createRoot(host); } await act(async () => root.render(React.createElement(api.QuizView, { ErrorBoundary: ({ children }) => children, TeacherLiveQuizControls: () => null, ConfettiExplosion: () => null, ...props }))); }
const button = (text) => [...host.querySelectorAll('button')].find((el) => el.textContent.trim() === text);
const byLabel = (label) => host.querySelector(`button[aria-label="${label}"]`);
const rows = () => [...host.querySelectorAll('li[role="button"]')];
async function click(el) { expect(el).toBeTruthy(); await act(async () => el.click()); }
const yourOrder = () => [...host.querySelectorAll('ol[aria-label="Your order"] li')].map((li) => li.querySelectorAll('span')[1].textContent);

describe('Sequence Sense card', () => {
  it('accepts the other half of the swap, scores the arranged order, and reports 4 points', async () => {
    // A session code is what makes the card report each answer to the host.
    const props = base(swapped, { activeSessionCode: 'LIVE1', sessionData: { quizState: { isActive: true }, roster: {} } });
    await render(props);
    expect(host.textContent).toContain('Step 1 of 4');
    await click(button('✗ No, something is off'));
    expect(host.textContent).toContain('Step 2 of 4');
    // Displayed: Evaporation, Precipitation, Condensation, Collection. The author
    // wrote index 1 (Precipitation); the student points at Condensation (index 2).
    expect(rows().map((li) => li.textContent)).toEqual(['1.Evaporation', '2.Precipitation', '3.Condensation', '4.Collection']);
    await click(rows()[2]);
    expect(host.textContent).toContain('Step 3 of 4');
    expect(yourOrder()).toEqual(['Evaporation', 'Precipitation', 'Condensation', 'Collection']);
    expect(byLabel('Move up: Evaporation').disabled).toBe(true);
    await click(byLabel('Move up: Condensation'));
    expect(yourOrder()).toEqual(['Evaporation', 'Condensation', 'Precipitation', 'Collection']);
    await click(button('Done arranging'));
    expect(host.textContent).toContain('Step 4 of 4');
    await click(button('process'));
    expect(host.textContent).toContain('4 / 4');
    expect(host.textContent).toContain('✓ Verify: items 2 and 3 were swapped');
    expect(host.textContent).toContain('✓ Diagnose: you found a misplaced item');
    expect(host.textContent).toContain('✓ Arrange: your order matched');
    expect(host.textContent).toContain('✓ Principle: "process"');
    expect(host.querySelectorAll('li').length).toBeGreaterThan(0);
    expect([...host.querySelectorAll('span')].filter((el) => el.textContent === '↔ misplaced')).toHaveLength(2);
    expect(props.onSubmitLiveAnswer).toHaveBeenCalledWith(expect.objectContaining({
      itemType: 'sequence-sense',
      answer: expect.objectContaining({ verifyAnswer: 'no', clickedIdx: 2, orderAnswer: [0, 1, 2, 3], principleAnswer: 'process', score: 4, status: 'correct' }),
    }));
  });

  it('marks a wrong verdict honestly and names the swap instead of one arbitrary item', async () => {
    await render(base(swapped));
    await click(button('✓ Yes, correct'));
    expect(host.textContent).toContain('Step 3 of 4');
    await click(button('Done arranging'));
    await click(button('size'));
    expect(host.textContent).toContain('0 / 4');
    expect(host.textContent).toContain('✗ Verify: items 2 and 3 were swapped (you said "yes")');
    expect(host.textContent).toContain('✗ Arrange: correct order is Evaporation → Condensation → Precipitation → Collection');
    expect(host.textContent).toContain('✗ Principle: correct answer was "process" (you picked "size")');
    await click(button('Try again'));
    expect(host.textContent).toContain('Step 1 of 4');
    await click(button('✗ No, something is off'));
    await click(rows()[0]);
    await click(button('Done arranging'));
    await click(button('process'));
    expect(host.textContent).toContain('2 / 4');
    expect(host.textContent).toContain('✗ Diagnose: items 2 and 3 were swapped (either one counts)');
  });

  it('treats a canonical display as correct even when the authored index is stale, and never shuffles a missing order', async () => {
    await render(base({ ...swapped, presentedOrder: [0, 1, 2, 3], intentionallyWrongIndex: 2 }));
    expect(rows().length).toBe(0);
    await click(button('✓ Yes, correct'));
    await click(button('Done arranging'));
    await click(button('process'));
    expect(host.textContent).toContain('4 / 4');
    expect(host.textContent).toContain('✓ Verify: order was correct');
    await act(async () => root.unmount()); host.remove(); root = host = null;
    await render(base({ ...swapped, presentedOrder: undefined, intentionallyWrongIndex: null }));
    await click(button('✗ No, something is off'));
    expect(rows().map((li) => li.textContent.replace(/^\d+\./, ''))).toEqual(['Evaporation', 'Condensation', 'Precipitation', 'Collection']);
  });
});
