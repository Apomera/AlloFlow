// The DBQ briefing card (title, historical context, print/timer, progress
// steps) is reference material stacked above the work surface. It used to be
// unconditionally visible and shrink-0, so on a short window — or with a long
// historical context — it squeezed the documents into a few visible lines with
// no way to reclaim the space. These tests pin the fold and the space it frees.
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React;
let ReactDOMClient;
let act;
let DbqView;

beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  ReactDOMClient = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
  window.React = React;
  act = React.act;
  window.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_dbq_module.js');
  DbqView = window.AlloModules.DbqView;
});

const LONG_CONTEXT = 'In the decades after the war, competing accounts of the settlement circulated widely. '.repeat(12);

const CONTENT = {
  id: 'dbq-1',
  data: {
    title: 'Whose Account of the Settlement?',
    historicalContext: LONG_CONTEXT,
    documents: [
      { id: 'A', title: 'Letter home', source: 'Private collection', excerpt: 'We arrived in spring.' },
      { id: 'B', title: 'Official report', source: 'State archive', excerpt: 'The survey was completed.' }
    ],
    rubric: [{ criteria: 'Thesis', 1: 'none', 2: 'vague', 3: 'clear', 4: 'nuanced' }],
    corroborationClaims: ['The settlement was peaceful.']
  }
};

function mountDbq(responses) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const store = { current: responses };
  const root = ReactDOMClient.createRoot(container);
  const writes = [];

  function Harness() {
    const [, tick] = React.useState(0);
    return React.createElement(DbqView, {
      generatedContent: CONTENT,
      studentResponses: store.current,
      handleStudentInput: (resId, key, value) => {
        writes.push([resId, key, value]);
        store.current = { ...store.current, [resId]: { ...(store.current[resId] || {}), [key]: value } };
        tick(n => n + 1);
      },
      callGemini: null,
      cleanJson: (s) => s,
      addToast: () => {},
      handleScoreUpdate: () => {},
      gradeLevel: '9',
      t: (key) => key,
      isTeacherMode: false,
      callTTS: null,
      selectedVoice: 'Kore'
    });
  }

  act(() => { root.render(React.createElement(Harness)); });
  return { container, writes, root, store };
}

const toggleButton = (container) =>
  [...container.querySelectorAll('button')].find(b => b.getAttribute('aria-expanded') !== null);

const contextParagraph = (container) =>
  [...container.querySelectorAll('p')].find(p => p.textContent.includes('Historical Context'));

describe('DBQ briefing collapse', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('shows the briefing expanded by default, with a control to fold it', () => {
    const { container } = mountDbq({});
    const button = toggleButton(container);
    expect(button, 'a briefing toggle should exist').toBeTruthy();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(contextParagraph(container)).toBeTruthy();
  });

  it('caps the historical context so a long one cannot push the work pane off screen', () => {
    const { container } = mountDbq({});
    const context = contextParagraph(container);
    // The paragraph must scroll within a bounded box rather than growing without limit.
    expect(context.style.maxHeight).toBeTruthy();
    expect(context.className).toContain('overflow-y-auto');
  });

  it('folds the context and the progress steps away, and remembers the fold', () => {
    const { container, writes } = mountDbq({});
    const before = container.textContent;
    expect(before).toContain('Historical Context');
    expect(before).toContain('Corroborate');

    act(() => { toggleButton(container).click(); });

    // The fold is persisted with the rest of the student's work, not local state,
    // so navigating away and back keeps it.
    expect(writes.some(([, key, value]) => key === '_dbqHeaderCollapsed' && value === true)).toBe(true);

    const after = container.textContent;
    expect(contextParagraph(container), 'context should be gone when folded').toBeFalsy();
    expect(after).not.toContain('Self-Assess');
    expect(toggleButton(container).getAttribute('aria-expanded')).toBe('false');
    // The tabs and the work surface survive the fold.
    expect(after).toContain('Corroborate');
    expect(container.querySelector('[role="tabpanel"]')).toBeTruthy();
  });

  it('restores the briefing from persisted state and folds back open', () => {
    const { container, writes } = mountDbq({ 'dbq-1': { _dbqHeaderCollapsed: true } });
    expect(contextParagraph(container)).toBeFalsy();
    expect(toggleButton(container).getAttribute('aria-expanded')).toBe('false');

    act(() => { toggleButton(container).click(); });
    expect(writes.some(([, key, value]) => key === '_dbqHeaderCollapsed' && value === false)).toBe(true);
    expect(contextParagraph(container)).toBeTruthy();
  });

  it('keeps the briefing bounded no matter how long the historical context is', () => {
    // The defect: the header was shrink-0 with an uncapped context, so a long
    // one grew the header without limit and crushed the work pane (measured at
    // 1673px header / 41px pane in a real browser before this fix). The cap is
    // what makes the layout independent of content length, and of zoom.
    const shortCtx = mountDbq({});
    const shortMax = contextParagraph(shortCtx.container).style.maxHeight;

    document.body.innerHTML = '';
    const longContent = JSON.parse(JSON.stringify(CONTENT));
    longContent.data.historicalContext = LONG_CONTEXT.repeat(10);
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);
    act(() => {
      root.render(React.createElement(DbqView, {
        generatedContent: longContent, studentResponses: {}, handleStudentInput: () => {},
        callGemini: null, cleanJson: (s) => s, addToast: () => {}, handleScoreUpdate: () => {},
        gradeLevel: '9', t: (key) => key, isTeacherMode: false, callTTS: null, selectedVoice: 'Kore'
      }));
    });
    // A context ten times longer gets the same bound, not ten times the height.
    expect(contextParagraph(container).style.maxHeight).toBe(shortMax);
  });

  it('gives the work pane a floor that does not depend on browser zoom', () => {
    const { container } = mountDbq({});
    const panel = container.querySelector('[role="tabpanel"]');
    // A viewport-relative minimum, so the pane keeps usable height at any zoom
    // rather than only reading well at 80%.
    expect(panel.style.minHeight).toContain('vh');
  });

  it('lets the resource scroll instead of clipping when the pane hits its floor', () => {
    const { container } = mountDbq({});
    const rootEl = container.firstElementChild;
    expect(rootEl.className).toContain('overflow-y-auto');
    expect(rootEl.className).not.toContain('overflow-hidden');
    // min-h-0 is what allows the flex child above to shrink at all.
    expect(rootEl.className).toContain('min-h-0');
  });
});
