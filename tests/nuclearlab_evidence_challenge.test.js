// Nuclear & Radiation Lab — accessible evidence challenge and reading controls.
//
// The lab already exposes the calculations. This suite protects the learning
// layer added on top: students can distinguish support, contradiction, and
// uncertainty; revise without a penalty; and use the same activity with a
// keyboard, larger text, or reduced motion.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

let act;
let cfg;
let host;
let root;
let originalGetContext;

beforeAll(() => {
  act = React.act;
  global.IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  resetStemLab();
  cfg = loadTool('stem_lab/stem_tool_nuclearlab.js', 'nuclearLab');
  host = document.createElement('div');
  document.body.appendChild(host);
  originalGetContext = window.HTMLCanvasElement.prototype.getContext;
  // These tests exercise DOM interaction, not pixels. Returning null is the
  // browser-supported "context unavailable" path every chart already handles.
  window.HTMLCanvasElement.prototype.getContext = () => null;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  host?.remove();
  host = null;
  window.HTMLCanvasElement.prototype.getContext = originalGetContext;
});

function mount(state, overrides = {}) {
  const Comp = () => {
    const [toolData, setToolData] = React.useState({ _nuclearLab: state || {} });
    return cfg.render(makeCtx({ ...overrides, toolData, setToolData }));
  };
  act(() => {
    root = ReactDOMClient.createRoot(host);
    root.render(React.createElement(Comp));
  });
}

function buttonNamed(text) {
  return [...host.querySelectorAll('button')].find((button) => button.textContent.trim() === text);
}

describe('evidence challenge semantics', () => {
  it('renders a named, untimed three-verdict activity with progress', () => {
    host.innerHTML = renderTool('nuclearLab', { _nuclearLab: {} });
    const section = host.querySelector('#nksec-evidence');
    expect(section).toBeTruthy();
    expect(section.querySelector('h4').textContent).toContain('21. Evidence challenge');

    const fieldset = section.querySelector('fieldset');
    expect(fieldset).toBeTruthy();
    expect(fieldset.querySelector('legend').textContent).toBe('Claim 1 of 5');
    expect(fieldset.querySelectorAll('input[type="radio"]')).toHaveLength(3);
    expect([...fieldset.querySelectorAll('label')].map((label) => label.textContent.trim())).toEqual([
      'Supported by this evidence',
      'Contradicted by this evidence',
      'Not settled by this evidence',
    ]);
    expect(section.querySelector('progress').getAttribute('aria-label')).toBe('0 of 5 evidence claims mastered');
    expect(section.textContent).toContain('There is no timer and no penalty for revising an answer.');
  });

  it('keeps the reading adaptations explicit and exposes a keyboard skip path', () => {
    host.innerHTML = renderTool('nuclearLab', {
      _nuclearLab: { nkLargeText: true, nkReduceMotion: true },
    });
    const lab = host.querySelector('[data-nuclear-lab]');
    expect(lab.getAttribute('data-nk-large-text')).toBe('true');
    expect(lab.getAttribute('data-nk-reduce-motion')).toBe('true');
    expect(host.querySelector('button[aria-label="Use larger text throughout the nuclear lab"]').getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('button[aria-label="Reduce non-essential motion throughout the nuclear lab"]').getAttribute('aria-pressed')).toBe('true');
    expect(buttonNamed('Skip topic controls and start reading')).toBeTruthy();
    expect(host.querySelector('#nksec-halflife').getAttribute('tabindex')).toBe('-1');
    expect(host.querySelector('style').textContent).toContain('[data-nk-sec]:focus');
  });

  it('makes the challenge the final step of every question-led route', () => {
    for (const route of ['safe', 'me', 'safety', 'works', 'know']) {
      host.innerHTML = renderTool('nuclearLab', { _nuclearLab: { nkPath: route } });
      expect(host.querySelector('#nksec-evidence'), route + ' route omits the challenge').toBeTruthy();
      expect(host.querySelector('#nksec-evidence nav[aria-label*="route progress"]'), route + ' route has no final progress footer').toBeTruthy();
      expect(host.querySelector('#nksec-evidence').textContent).toContain('End of this route');
    }
  });
});

describe('evidence challenge interaction', () => {
  it('explains a weak verdict, then lets the learner revise and master it', () => {
    mount({ nkPath: 'know' });
    const supported = host.querySelector('input[name="nk-evidence-verdict"][value="supported"]');
    act(() => supported.click());
    act(() => buttonNamed('Check the evidence').click());

    expect(host.querySelector('#nk-evidence-feedback').textContent).toContain('Take another look');
    expect(host.querySelector('#nk-evidence-feedback').textContent).toContain('Best verdict: Contradicted by this evidence.');
    expect(host.textContent).toContain('0 of 5 mastered');

    const contradicted = host.querySelector('input[name="nk-evidence-verdict"][value="contradicted"]');
    act(() => contradicted.click());
    act(() => buttonNamed('Check the evidence').click());

    expect(host.querySelector('#nk-evidence-feedback').textContent).toContain('Evidence match');
    expect(host.textContent).toContain('1 of 5 mastered');
    expect(buttonNamed('Next claim →')).toBeTruthy();
  });

  it('tracks all five claims, celebrates once, and satisfies the quest hook', () => {
    const celebrate = vi.fn();
    const awardXP = vi.fn();
    mount({ nkPath: 'know' }, { celebrate, awardXP });

    const answers = ['contradicted', 'supported', 'uncertain', 'supported', 'uncertain'];
    for (let i = 0; i < answers.length; i++) {
      const radio = host.querySelector(`input[name="nk-evidence-verdict"][value="${answers[i]}"]`);
      act(() => radio.click());
      act(() => buttonNamed('Check the evidence').click());
      expect(host.querySelector('#nk-evidence-feedback').textContent, 'claim ' + (i + 1)).toContain('Evidence match');
      if (i < answers.length - 1) act(() => buttonNamed('Next claim →').click());
    }

    expect(host.textContent).toContain('5 of 5 mastered');
    expect(host.textContent).toContain('Challenge complete');
    expect(celebrate).toHaveBeenCalledTimes(1);
    expect(awardXP).toHaveBeenCalledWith('nuclear_evidence', 15, 'Mastered the evidence challenge');

    const hook = cfg.questHooks.find((item) => item.id === 'nk_evidence');
    expect(hook).toBeTruthy();
    expect(hook.check({ evidenceMastered: ['reactor-bomb', 'inverse-square', 'low-dose-zero', 'neutron-layers'] })).toBe(false);
    expect(hook.check({ evidenceMastered: ['reactor-bomb', 'inverse-square', 'low-dose-zero', 'neutron-layers', 'short-count'] })).toBe(true);
  });
});
