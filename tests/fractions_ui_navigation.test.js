import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let root;
beforeEach(() => {
  const drawing = new Proxy({}, { get: (target, key) => key in target ? target[key] : /create.*Gradient/.test(key) ? () => ({ addColorStop() {} }) : key === 'measureText' ? () => ({ width: 20 }) : () => {} });
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(drawing);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  resetStemLab();
  document.body.innerHTML = '<div id="root"></div>';
  loadTool('stem_lab/stem_tool_fractions.js', 'fractionViz');
  window.__fracTabTracked = true;
});
afterEach(async () => {
  if (root) await React.act(() => root.unmount());
  root = null;
  window.removeEventListener('keydown', window._fracKbHandler);
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function mount(patch = {}) {
  let latest;
  function App() {
    const [state, setState] = React.useState({ _fractions: patch });
    latest = state._fractions;
    return window.StemLab._registry.fractionViz.render(makeCtx({ toolData: state, setToolData: setState }));
  }
  root = ReactDOMClient.createRoot(document.getElementById('root'));
  await React.act(() => root.render(React.createElement(App)));
  return () => latest;
}
const tabs = () => [...document.querySelectorAll('#fraction-activity-list [role="tab"]')];
const more = () => document.querySelector('.fraction-lab-more');
const selected = () => document.querySelector('#fraction-activity-list [aria-selected="true"]');
async function click(element) { expect(element).toBeTruthy(); await React.act(() => element.click()); }
async function key(element, value, options = {}) {
  await React.act(() => element.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...options })));
}

describe('Fraction Lab activity navigation', () => {
  it('offers four starting activities and retains every activity in each mode', async () => {
    await mount();
    for (const [mode, count] of [['learn',10], ['practice',6], ['apply',10], ['teacher',5]]) {
      await click(document.getElementById('fraction-mode-tab-' + mode));
      expect(tabs()).toHaveLength(mode === 'teacher' ? 5 : 4);
      if (mode !== 'teacher') {
        expect(more().getAttribute('aria-expanded')).toBe('false');
        await click(more());
        expect(more().getAttribute('aria-expanded')).toBe('true');
      }
      expect(tabs()).toHaveLength(count);
      for (const id of tabs().map(button => button.id)) {
        await click(document.getElementById(id));
        expect(selected().id).toBe(id);
        const panel = document.getElementById('fraction-section-panel');
        expect(panel.getAttribute('aria-labelledby')).toBe(id);
        expect(panel.textContent.trim().length).toBeGreaterThan(10);
      }
    }
  });

  it('keeps selected secondary activities visible and leaves saved math work intact', async () => {
    const state = await mount({ navMode: 'learn', tab: 'cra', num1: 7, den1: 4, score: { correct: 3, total: 5 }, opInputDraft: { values: { den2: '' } } });
    expect(selected().textContent).toContain('Build, draw & write');
    expect(tabs()).toHaveLength(5);
    await click(more());
    await click(more());
    expect(selected().id).toBe('fraction-section-tab-cra');
    expect(state()).toMatchObject({ num1: 7, den1: 4, score: { correct: 3, total: 5 }, opInputDraft: { values: { den2: '' } } });
    expect(document.getElementById('root').textContent).toContain('Practice score: 3/5');
  });

  it('moves keyboard focus through the currently visible activities and expanded list', async () => {
    await mount();
    await key(selected(), 'End');
    expect(selected().id).toBe('fraction-section-tab-wall');
    expect(document.activeElement).toBe(selected());
    await click(more());
    await key(selected(), 'End');
    expect(selected().id).toBe('fraction-section-tab-sliderMixer');
    await key(selected(), 'ArrowRight');
    expect(selected().id).toBe('fraction-section-tab-practice');
    await key(document.getElementById('fraction-mode-tab-learn'), 'End');
    expect(selected().id).toBe('fraction-section-tab-standardsPlanning');
    expect(document.activeElement.id).toBe('fraction-mode-tab-teacher');
  });

  it('number shortcuts switch both the focus and activity', async () => {
    const state = await mount({ navMode: 'teacher', tab: 'myAccount' });
    for (const [number, mode, tab] of [['3','practice','operations'],['6','learn','wall'],['2','practice','compare'],['1','learn','practice'],['4','practice','equivalents'],['5','practice','converter']]) {
      await key(document.body, number);
      expect(state()).toMatchObject({ navMode: mode, tab });
      expect(selected().id).toBe('fraction-section-tab-' + tab);
    }
  });

  it('does not intercept editing fields or modified browser shortcuts', async () => {
    const state = await mount({ navMode: 'learn', tab: 'practice' });
    for (const tag of ['input','textarea','select']) {
      const field = document.createElement(tag);
      document.body.appendChild(field);
      await key(field, '3');
      expect(state().tab).toBe('practice');
    }
    await key(document.body, '3', { ctrlKey: true });
    await key(document.body, '3', { altKey: true });
    await key(document.body, '3', { metaKey: true });
    expect(state().tab).toBe('practice');
  });

  it('keeps guidance relevant and preserves the optional learning path', async () => {
    await mount();
    await click(more());
    await click(document.getElementById('fraction-section-tab-reference'));
    expect(document.querySelector('[data-fraction-guidance]')).toBeNull();
    expect(document.getElementById('fraction-section-panel').textContent).toContain('Vocabulary');
    const path = [...document.querySelectorAll('details')].find(item => item.querySelector('summary')?.textContent === 'Follow a learning path');
    expect(path).toBeTruthy();
    await click([...path.querySelectorAll('button')].find(button => button.textContent === '4. Explore operations'));
    expect(selected().id).toBe('fraction-section-tab-operations');
    expect(document.querySelector('[data-fraction-guidance]').textContent).toContain('Choose an operation and enter two fractions');
  });
});
