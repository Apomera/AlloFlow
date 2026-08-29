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

function mount(state, overrides = {}, onRender) {
  const Comp = () => {
    const [toolData, setToolData] = React.useState({ _nuclearLab: state || {} });
    if (typeof onRender === 'function') onRender(toolData);
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

const COMPLETE_EVIDENCE = [
  'reactor-bomb',
  'inverse-square',
  'low-dose-zero',
  'neutron-layers',
  'short-count',
];

function enterText(node, value) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value',
  ).set;
  act(() => {
    setter.call(node, value);
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
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
    expect(host.querySelector('style').textContent).toContain('.nk-readable textarea:focus-visible');
  });

  it('makes the challenge the final step of every question-led route', () => {
    for (const route of ['safe', 'me', 'safety', 'works', 'know']) {
      host.innerHTML = renderTool('nuclearLab', { _nuclearLab: { nkPath: route } });
      expect(host.querySelector('#nksec-evidence'), route + ' route omits the challenge').toBeTruthy();
      expect(host.querySelector('#nksec-evidence nav[aria-label*="route progress"]'), route + ' route has no final progress footer').toBeTruthy();
      expect(host.querySelector('#nksec-evidence').textContent).toContain('finish the evidence challenge');
    }
  });

  it('offers a named, optional route reflection only after evidence mastery', () => {
    host.innerHTML = renderTool('nuclearLab', { _nuclearLab: { nkPath: 'know' } });
    expect(host.querySelector('[data-nk-reflection=know]')).toBeNull();

    host.innerHTML = renderTool('nuclearLab', {
      _nuclearLab: {
        nkPath: 'know',
        evidenceMastered: COMPLETE_EVIDENCE,
        nkReflections: {
          know: {
            confidence: 'explain',
            idea: 'A measurement needs uncertainty before it can prove a claim.',
            question: 'How long should a weak source be counted?',
          },
        },
      },
    });

    const reflection = host.querySelector('[data-nk-reflection=know]');
    expect(reflection).toBeTruthy();
    expect(reflection.querySelector('h5').textContent).toBe('Finish your route');
    expect(reflection.textContent).toContain('How do we know all this?');
    expect(reflection.textContent).toContain('There is no right answer and no score.');
    expect(reflection.querySelectorAll('input[type=radio][name=nk-reflection-confidence-know]')).toHaveLength(3);
    expect(reflection.querySelector('input[value=explain]').checked).toBe(true);
    const textareas = [...reflection.querySelectorAll('textarea')];
    expect(textareas).toHaveLength(2);
    expect(textareas.every((node) => node.maxLength === 280)).toBe(true);
    expect(reflection.querySelector('label[for=nk-reflection-idea-know]')).toBeTruthy();
    expect(reflection.querySelector('label[for=nk-reflection-question-know]')).toBeTruthy();
    expect(reflection.querySelector('#nk-reflection-idea-know').value).toContain('measurement needs uncertainty');
    expect(reflection.querySelector('[role=status]').textContent).toBe('Reflection saved for this route.');
    expect(reflection.previousElementSibling.getAttribute('aria-label')).toBe('Evidence challenge complete');
    expect(reflection.previousElementSibling.previousElementSibling.tagName).toBe('FIELDSET');
  });

  it('recovers safely from malformed saved reflection progress', () => {
    expect(() => {
      host.innerHTML = renderTool('nuclearLab', {
        _nuclearLab: {
          nkPath: 'know',
          evidenceMastered: COMPLETE_EVIDENCE,
          nkReflections: {
            know: {
              confidence: 'not-a-choice',
              idea: { stale: true },
              question: 42,
            },
          },
        },
      });
    }).not.toThrow();

    const reflection = host.querySelector('[data-nk-reflection=know]');
    expect(reflection.querySelector('input:checked')).toBeNull();
    expect([...reflection.querySelectorAll('textarea')].every((node) => node.value === '')).toBe(true);
    expect(reflection.querySelector('[role=status]').textContent).toBe('Nothing saved yet.');
  });
});

describe('reading adaptation interaction', () => {
  it('shows and hides chart tables without changing the default reading view', () => {
    const announceToSR = vi.fn();
    mount({}, { announceToSR });

    expect(host.querySelectorAll('[data-nk-chart-table]')).toHaveLength(0);
    act(() => buttonNamed('Chart data').click());
    expect(host.querySelector('[data-nuclear-lab]').getAttribute('data-nk-chart-data')).toBe('true');
    expect(host.querySelectorAll('[data-nk-chart-table]')).toHaveLength(6);
    expect(buttonNamed('Chart data').getAttribute('aria-pressed')).toBe('true');
    expect(announceToSR).toHaveBeenLastCalledWith('Chart data tables shown.');

    act(() => buttonNamed('Chart data').click());
    expect(host.querySelectorAll('[data-nk-chart-table]')).toHaveLength(0);
    expect(buttonNamed('Chart data').getAttribute('aria-pressed')).toBe('false');
    expect(announceToSR).toHaveBeenLastCalledWith('Chart data tables hidden.');
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

  it('saves and clears a route-specific reflection without re-rendering the lab while typing', () => {
    let latestToolData;
    let labRenders = 0;
    mount({
      nkPath: 'know',
      evidenceMastered: COMPLETE_EVIDENCE,
    }, {}, (toolData) => {
      latestToolData = toolData;
      labRenders += 1;
    });

    const reflection = host.querySelector('[data-nk-reflection=know]');
    const rendersBeforeDraft = labRenders;
    act(() => reflection.querySelector('input[value=growing]').click());
    enterText(
      reflection.querySelector('#nk-reflection-idea-know'),
      'A short count can be ordinary statistical noise.',
    );
    enterText(
      reflection.querySelector('#nk-reflection-question-know'),
      'How does detector efficiency change the conclusion?',
    );

    expect(labRenders).toBe(rendersBeforeDraft);
    expect(reflection.querySelector('[role=status]').textContent).toBe('Unsaved changes.');
    expect(buttonNamed('Save reflection').disabled).toBe(false);

    act(() => buttonNamed('Save reflection').click());

    expect(labRenders).toBe(rendersBeforeDraft + 1);
    expect(latestToolData._nuclearLab.nkReflections.know).toEqual({
      confidence: 'growing',
      idea: 'A short count can be ordinary statistical noise.',
      question: 'How does detector efficiency change the conclusion?',
    });
    expect(host.querySelector('[data-nk-reflection-status=know]').textContent)
      .toBe('Reflection saved with your lab progress.');
    expect(buttonNamed('Save changes').disabled).toBe(true);

    act(() => buttonNamed('Clear saved reflection').click());

    expect(latestToolData._nuclearLab.nkReflections).toEqual({});
    expect(host.querySelector('[data-nk-reflection-status=know]').textContent)
      .toBe('Saved reflection cleared.');
    expect(buttonNamed('Save reflection').disabled).toBe(true);
  });
});
