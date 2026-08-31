// Nuclear Lab - resumable, evidence-gated question routes.

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

let act;
let cfg;
let host;
let root;
let latestToolData;
let originalGetContext;
let originalScrollIntoView;

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
  window.HTMLCanvasElement.prototype.getContext = () => null;
  originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView;
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  latestToolData = null;
});

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  host?.remove();
  host = null;
  window.HTMLCanvasElement.prototype.getContext = originalGetContext;
  if (originalScrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  } else {
    delete window.HTMLElement.prototype.scrollIntoView;
  }
});

function mount(state, overrides = {}) {
  const Comp = () => {
    const [toolData, setToolData] = React.useState({ _nuclearLab: state || {} });
    latestToolData = toolData;
    return cfg.render(makeCtx({ ...overrides, toolData, setToolData }));
  };
  act(() => {
    root = ReactDOMClient.createRoot(host);
    root.render(React.createElement(Comp));
  });
}

function buttonAriaStarts(text) {
  return [...host.querySelectorAll('button')].find((button) =>
    (button.getAttribute('aria-label') || '').startsWith(text));
}

function buttonNamed(text) {
  return [...host.querySelectorAll('button')].find((button) =>
    button.textContent.trim() === text);
}

describe('question-route progress semantics', () => {
  it('places visible route context before every routed topic without changing the all-topics view', () => {
    host.innerHTML = renderTool('nuclearLab', {
      _nuclearLab: { nkPath: 'safety', nkOpen: false },
    });

    const expected = ['shielding', 'protect', 'shelter', 'evidence'];
    const sections = [...host.querySelectorAll('[data-nk-sec]')];
    expect(sections.map((section) => section.getAttribute('data-nk-sec'))).toEqual(expected);
    expect(host.querySelectorAll('[data-nk-route-step]')).toHaveLength(expected.length);

    sections.forEach((section, index) => {
      const id = expected[index];
      const kicker = section.querySelector('[data-nk-route-step=' + id + ']');
      const topicHeading = section.querySelector('h4');
      expect(kicker.id).toBe('nk-route-step-' + id);
      expect(kicker.textContent).toContain('Route step ' + (index + 1) + ' of 4');
      expect(kicker.textContent).toContain('How would I protect myself?');
      expect(section.getAttribute('aria-describedby')).toBe(kicker.id);
      expect(section.classList.contains('nk-route-section')).toBe(true);
      expect(kicker.compareDocumentPosition(topicHeading) & Node.DOCUMENT_POSITION_FOLLOWING)
        .toBeTruthy();
      expect(section.style.borderLeftWidth).toBe('4px');
      expect(topicHeading.style.fontSize).toBe('0.875rem');
    });

    host.innerHTML = renderTool('nuclearLab', { _nuclearLab: { nkOpen: false } });
    expect(host.querySelectorAll('[data-nk-route-step]')).toHaveLength(0);
    expect(host.querySelector('[data-nk-sec]').hasAttribute('aria-describedby')).toBe(false);
  });

  it('shows sanitized progress, a next step, and truthful completion guidance', () => {
    host.innerHTML = renderTool('nuclearLab', {
      _nuclearLab: {
        nkPath: 'know',
        nkOpen: true,
        nkRouteSeen: {
          know: ['not-a-step', 'detect', 'dating', 'detect'],
        },
        pathsCompleted: ['not-a-route', 'know'],
      },
    });

    const overview = host.querySelector('[data-nk-route-overview=know]');
    const progress = overview.querySelector('progress');
    expect(overview.textContent).toContain('2 of 4 steps opened');
    expect(overview.textContent).toContain('Continue: Uranium decay chain');
    expect(buttonAriaStarts('Continue How do we know all this? at step 3: Uranium decay chain'))
      .toBeTruthy();
    expect(progress.value).toBe(2);
    expect(progress.max).toBe(4);
    expect(progress.getAttribute('aria-label')).toContain('2 of 4 steps opened');
    expect(overview.textContent).not.toContain('Route complete');
    expect(buttonAriaStarts('Leave the route: How do we know all this?').textContent).toContain('2/4');
    expect(host.querySelector('#nksec-evidence').textContent)
      .toContain('Open every route step and finish the evidence challenge');

    host.innerHTML = renderTool('nuclearLab', {
      _nuclearLab: {
        nkPath: 'know',
        nkOpen: true,
        nkRouteSeen: { know: ['detect', 'dating', 'chain', 'evidence'] },
      },
    });
    expect(buttonAriaStarts('Continue How do we know all this? at step 4: Evidence challenge'))
      .toBeTruthy();
    expect(host.querySelector('#nksec-evidence').textContent)
      .toContain('Finish the evidence challenge to complete this route');

    host.innerHTML = renderTool('nuclearLab', {
      _nuclearLab: {
        nkPath: 'know',
        nkOpen: false,
        nkRouteSeen: { know: ['detect', 'dating', 'chain', 'evidence'] },
        pathsCompleted: ['know'],
        evidenceMastered: ['short-count'],
      },
    });

    expect(host.textContent).toContain('✓ 🔬 How do we know all this? · 4/4');
    expect(host.querySelector('#nksec-evidence').textContent).toContain('✓ Route complete');
  });

  it('requires two uniquely completed routes for the route quest', () => {
    const hook = cfg.questHooks.find((item) => item.id === 'nk_paths');
    expect(hook.label).toBe('Complete two question routes through the lab');
    expect(hook.check({ pathsTried: ['safe', 'know'] })).toBe(false);
    expect(hook.check({ pathsCompleted: ['safe', 'safe'] })).toBe(false);
    expect(hook.check({ pathsCompleted: ['safe', 'know'] })).toBe(true);
  });
});

describe('question-route progress interaction', () => {
  it('continues an already-active saved route without stealing scroll on mount', () => {
    mount({
      nkPath: 'know',
      nkOpen: true,
      nkRouteSeen: { know: ['detect', 'dating'] },
    });

    expect(document.activeElement.id).not.toBe('nksec-chain');
    act(() => buttonAriaStarts(
      'Continue How do we know all this? at step 3: Uranium decay chain',
    ).click());

    expect(document.activeElement.id).toBe('nksec-chain');
    expect(latestToolData._nuclearLab.nkRouteSeen.know)
      .toEqual(['detect', 'dating', 'chain']);
  });

  it('records navigation, resumes at the next unopened step, and restores focus there', () => {
    const announceToSR = vi.fn();
    mount({ nkOpen: true, evidenceMastered: ['short-count'] }, { announceToSR });

    act(() => buttonAriaStarts('Follow the route: How do we know all this?').click());
    expect(latestToolData._nuclearLab.nkRouteSeen.know).toEqual(['detect']);
    expect(document.activeElement.id).toBe('nksec-detect');

    act(() => buttonAriaStarts('On to step 2:').click());
    expect(latestToolData._nuclearLab.nkRouteSeen.know).toEqual(['detect', 'dating']);

    const topicNav = [...host.querySelectorAll('nav')].find((node) =>
      node.getAttribute('aria-label') === 'Nuclear lab topics');
    act(() => topicNav.querySelector('button[aria-expanded]').click());
    act(() => buttonAriaStarts('Leave the route: How do we know all this?').click());

    const resume = buttonAriaStarts('Resume route: How do we know all this?');
    expect(resume.getAttribute('aria-label')).toContain('Next is step 3: Uranium decay chain.');
    act(() => resume.click());

    expect(document.activeElement.id).toBe('nksec-chain');
    expect(latestToolData._nuclearLab.nkRouteSeen.know)
      .toEqual(['detect', 'dating', 'chain']);

    act(() => buttonAriaStarts('On to step 4:').click());

    expect(latestToolData._nuclearLab.nkRouteSeen.know)
      .toEqual(['detect', 'dating', 'chain', 'evidence']);
    expect(latestToolData._nuclearLab.pathsCompleted).toEqual(['know']);
    expect(host.querySelector('#nksec-evidence').textContent).toContain('✓ Route complete');
    expect(announceToSR).toHaveBeenLastCalledWith(
      'Jumped to Evidence challenge. Route complete: How do we know all this?',
    );
  });

  it('completes an opened route when its final evidence verdict is mastered', () => {
    const announceToSR = vi.fn();
    mount({
      nkPath: 'know',
      nkOpen: false,
      nkRouteSeen: { know: ['detect', 'dating', 'chain', 'evidence'] },
      evidenceIndex: 4,
      evidenceChoices: { 'short-count': 'uncertain' },
      evidenceChecked: { 'short-count': false },
      evidenceMastered: [],
    }, { announceToSR });

    act(() => buttonNamed('Check the evidence').click());

    expect(latestToolData._nuclearLab.evidenceMastered).toEqual(['short-count']);
    expect(latestToolData._nuclearLab.pathsCompleted).toEqual(['know']);
    expect(host.querySelector('#nksec-evidence').textContent).toContain('✓ Route complete');
    expect(cfg.questHooks.find((item) => item.id === 'nk_evidence')
      .check(latestToolData._nuclearLab)).toBe(false);
    expect(announceToSR.mock.calls.at(-1)[0]).toContain(
      'Route complete: How do we know all this?',
    );
  });

  it('reviews supporting evidence without ejecting the learner from the route', () => {
    mount({
      nkPath: 'know',
      evidenceIndex: 4,
      evidenceChoices: { 'short-count': 'uncertain' },
      evidenceChecked: { 'short-count': true },
      evidenceMastered: ['short-count'],
    });

    act(() => buttonNamed('Review the supporting topic').click());

    expect(latestToolData._nuclearLab.nkPath).toBe('know');
    expect(document.activeElement.id).toBe('nksec-detect');
  });
});
