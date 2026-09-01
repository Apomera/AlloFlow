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
      expect(topicHeading.textContent).not.toMatch(/\b(?:[1-9]|1\d|2[01])\.\s/);
      expect(section.style.borderLeftWidth).toBe('4px');
      expect(topicHeading.style.fontSize).toBe('0.875rem');
    });

    host.innerHTML = renderTool('nuclearLab', { _nuclearLab: { nkOpen: false } });
    expect(host.querySelectorAll('[data-nk-route-step]')).toHaveLength(0);
    expect(host.querySelector('[data-nk-sec]').hasAttribute('aria-describedby')).toBe(false);
    expect(host.querySelector('#nksec-halflife h4').textContent)
      .toContain('1. Half-life: stable under ordinary conditions');
    expect(host.querySelector('#nksec-evidence h4').textContent)
      .toContain('21. Evidence challenge: what does the evidence earn?');
  });

  it('shows five named route cards with truthful start, resume, completion, and progress states', () => {
    host.innerHTML = renderTool('nuclearLab', {
      _nuclearLab: {
        nkOpen: true,
        nkRouteSeen: {
          me: ['weighting', 'not-a-step', 'weighting'],
          safety: ['shielding', 'protect', 'shelter', 'evidence'],
        },
        pathsCompleted: ['safety'],
        evidenceMastered: ['inverse-square', 'neutron-layers'],
      },
    });

    const cards = [...host.querySelectorAll('button[data-nk-route-card]')];
    expect(cards.map((card) => card.getAttribute('data-nk-route-card')))
      .toEqual(['safe', 'me', 'safety', 'works', 'know']);

    const byId = Object.fromEntries(cards.map((card) => [card.getAttribute('data-nk-route-card'), card]));
    expect(byId.safe.getAttribute('data-state')).toBe('new');
    expect(byId.safe.textContent).toContain('Is nuclear power safe?');
    expect(byId.safe.textContent).toContain('Start');
    expect(byId.safe.textContent).toContain('7 guided steps');
    expect(byId.safe.querySelector('.sr-only').textContent).toContain('Follow this route');

    expect(byId.me.getAttribute('data-state')).toBe('started');
    expect(byId.me.textContent).toContain('Does this dose matter to me?');
    expect(byId.me.textContent).toContain('Resume');
    expect(byId.me.textContent).toContain('1/6 opened');
    expect(byId.me.querySelector('.sr-only').textContent).toContain('Resume this route');

    expect(byId.safety.getAttribute('data-state')).toBe('complete');
    expect(byId.safety.textContent).toContain('How would I protect myself?');
    expect(byId.safety.textContent).toContain('Complete');
    expect(byId.safety.textContent).toContain('4 steps opened');
    expect(byId.safety.querySelector('.sr-only').textContent)
      .toContain('Review this completed route');

    for (const card of cards) {
      expect(card.hasAttribute('aria-label')).toBe(false);
      expect(card.textContent.trim().length).toBeGreaterThan(30);
      expect(card.querySelector('.sr-only')).toBeTruthy();
      expect(['new', 'started', 'complete']).toContain(card.getAttribute('data-state'));
      const meter = card.querySelector('progress');
      expect(meter, card.getAttribute('data-nk-route-card') + ' has no progress indicator').toBeTruthy();
      expect(meter.getAttribute('aria-hidden')).toBe('true');
      expect(meter.value).toBeLessThanOrEqual(meter.max);
    }
  });

  it('shows a route-specific cue when that route has a saved reflection', () => {
    host.innerHTML = renderTool('nuclearLab', {
      _nuclearLab: {
        nkOpen: true,
        nkReflections: {
          know: {
            confidence: 'growing',
            idea: 'A defensible measurement needs uncertainty.',
            question: '',
          },
        },
      },
    });

    const cards = [...host.querySelectorAll('button[data-nk-route-card]')];
    const byId = Object.fromEntries(cards.map((card) => [card.getAttribute('data-nk-route-card'), card]));
    expect(byId.know.textContent).toContain('Reflection saved');
    for (const id of ['safe', 'me', 'safety', 'works']) {
      expect(byId[id].textContent).not.toContain('Reflection saved');
    }
  });

  it('marks explored choices in words, sanitizes saved exploration, and keeps responsive stat chrome', () => {
    host.innerHTML = renderTool('nuclearLab', {
      _nuclearLab: {
        nkOpen: false,
        isoTried: ['tc99m', 'tc99m', 'not-an-isotope'],
        chainSeen: ['U-238', 'Th-234', 'Pa-234m', 'U-234', 'Th-230', 'U-238', 'invalid'],
        enrSeen: ['Natural uranium', 'Reactor fuel (LEU)', 'Upper limit for most fuel', 'HALEU ceiling', 'Natural uranium', 'invalid'],
        radTried: ['alpha', 'beta', 'gamma', 'neutron', 'alpha', 'invalid'],
        reactionsSeen: ['dt', 'pp', 'u235', 'coal', 'dt', 'invalid'],
        wrTried: ['gamma', 'beta', 'proton', 'neutron', 'alpha', 'gamma', 'invalid'],
        bioSeen: ['tc99m', 'h3', 'k40', 'i131', 'po210', 'tc99m', 'invalid'],
        dosesSeen: ['Eating one banana', 'Dental X-ray', 'Flight, London to New York', 'Chest X-ray', 'Mammogram', 'CT scan, head', 'Eating one banana', 'invalid'],
      },
    });

    const exploredChoices = [...host.querySelectorAll('button[data-nk-explored="true"]')];
    expect(exploredChoices.length).toBeGreaterThan(8);
    for (const choice of exploredChoices) {
      expect(choice.textContent).toMatch(/^Seen: /);
      expect(choice.getAttribute('aria-label')).toMatch(/^Seen: /);
      expect(choice.getAttribute('aria-label').startsWith(choice.textContent)).toBe(true);
    }

    const expectedProgress = {
      isoTried: [1, 3, 'isotopes'],
      chainSeen: [4, 4, 'chain steps'],
      enrSeen: [3, 3, 'enrichment levels'],
      radTried: [4, 4, 'radiation types'],
      reactionsSeen: [3, 3, 'reactions'],
      wrTried: [3, 3, 'radiation types'],
      bioSeen: [4, 4, 'nuclides'],
      dosesSeen: [5, 5, 'dose examples'],
    };
    for (const [key, [value, max, label]] of Object.entries(expectedProgress)) {
      const progress = host.querySelector('[data-nk-exploration-progress="' + key + '"]');
      expect(progress, key + ' progress is missing').toBeTruthy();
      const meter = progress.querySelector('progress');
      expect(meter.value, key + ' did not sanitize or cap its saved values').toBe(value);
      expect(meter.max).toBe(max);
      expect(meter.getAttribute('aria-label'))
        .toBe(value + ' of ' + max + ' ' + label + ' deliberately compared');
      expect(progress.textContent)
        .toContain(value + ' of ' + max + ' ' + label + ' deliberately compared');
    }

    const shielding = host.querySelector('#nksec-shielding');
    expect(shielding.style.borderLeftColor).toBe('rgb(56, 189, 248)');
    expect(shielding.querySelector('h4').style.color).toBe('rgb(56, 189, 248)');

    const statGrids = [...host.querySelectorAll('.nk-stat-grid')];
    expect(statGrids).toHaveLength(4);
    for (const grid of statGrids) {
      expect(grid.classList.contains('grid')).toBe(true);
      expect(grid.className).not.toMatch(/grid-cols-/);
    }
    expect(host.querySelector('style').textContent)
      .toContain('.nk-readable .nk-stat-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,9rem),1fr))}');

    host.innerHTML = renderTool('nuclearLab', { _nuclearLab: { nkOpen: false } });
    const zeroProgress = host.querySelector('[data-nk-exploration-progress="isoTried"]');
    expect(zeroProgress.textContent).toContain('Try another option');
    expect(zeroProgress.textContent).toContain('0 of 3 isotopes deliberately compared');
    expect(zeroProgress.querySelector('progress').value).toBe(0);
  });

  it('shows opened progress in every route footer without duplicating the visible step label', () => {
    host.innerHTML = renderTool('nuclearLab', {
      _nuclearLab: {
        nkPath: 'know',
        nkOpen: false,
        nkRouteSeen: { know: ['detect', 'dating'] },
      },
    });

    const footers = [...host.querySelectorAll('nav')].filter((nav) =>
      (nav.getAttribute('aria-label') || '').startsWith('How do we know all this?, route progress,'));
    expect(footers).toHaveLength(4);
    for (const footer of footers) {
      expect(footer.textContent.match(/2\/4 opened/g)).toHaveLength(1);
      expect(footer.textContent).not.toMatch(/\bStep\s+\d/i);
    }
  });

  it('shows sanitized progress, a next step, and truthful completion guidance', () => {
    host.innerHTML = renderTool('nuclearLab', {
      _nuclearLab: {
        nkPath: 'know',
        nkOpen: true,
        nkRouteSeen: {
          know: ['not-a-step', 'detect', 'dating', 'detect'],
        },
        pathsCompleted: ['not-a-route'],
      },
    });

    const overview = host.querySelector('[data-nk-route-overview=know]');
    const progress = overview.querySelector('progress');
    expect(overview.textContent).toContain('2 of 4 steps opened');
    expect(overview.textContent).toContain('Continue: Uranium decay chain');
    expect(buttonAriaStarts('Continue: Uranium decay chain'))
      .toBeTruthy();
    expect(progress.value).toBe(2);
    expect(progress.max).toBe(4);
    expect(progress.getAttribute('aria-label')).toContain('2 of 4 steps opened');
    expect(overview.textContent).not.toContain('Route complete');
    expect(host.querySelector('button[data-nk-route-card=know]').textContent).toContain('2/4');
    expect(host.querySelector('#nksec-evidence').textContent)
      .toContain('Open every route step and finish the evidence challenge');

    host.innerHTML = renderTool('nuclearLab', {
      _nuclearLab: {
        nkPath: 'know',
        nkOpen: true,
        nkRouteSeen: { know: ['detect', 'dating', 'chain', 'evidence'] },
      },
    });
    expect(buttonAriaStarts('Continue: Evidence challenge'))
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

    const collapsed = host.querySelector('[data-nk-current-summary]');
    expect(collapsed.querySelector('[data-nk-current-label]').textContent)
      .toBe('Step 1 of 4 · Measure it: counts vs dose');
    expect(collapsed.querySelector('[data-nk-current-count]').textContent)
      .toBe(' · 4/4 opened');
    expect(collapsed.querySelector('[data-nk-current-meter]').value).toBe(4);
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
  it('distinguishes current completion from a prior completion after route evidence is reset', () => {
    mount({
      nkPath: 'know',
      nkOpen: true,
      nkRouteSeen: { know: ['detect', 'dating', 'chain', 'evidence'] },
      pathsCompleted: ['know'],
      evidenceIndex: 4,
      evidenceClaimId: 'short-count',
      evidenceChoices: { 'short-count': 'uncertain' },
      evidenceChecked: { 'short-count': true },
      evidenceMastered: ['short-count'],
    });

    expect(host.querySelector('[data-nk-route-overview=know]').textContent)
      .toContain('✓ Route complete');
    act(() => buttonNamed('Start over').click());

    const card = host.querySelector('button[data-nk-route-card=know]');
    const overview = host.querySelector('[data-nk-route-overview=know]');
    expect(card.textContent).toContain('Completed before');
    expect(card.textContent).toMatch(/revisit evidence/i);
    expect(overview.textContent).not.toContain('✓ Route complete');
    expect(overview.textContent).toContain('Continue: Evidence challenge');
    expect(latestToolData._nuclearLab.pathsCompleted).toEqual(['know']);

    act(() => host.querySelector(
      'input[name="nk-evidence-verdict"][value="uncertain"]',
    ).click());
    act(() => buttonNamed('Check the evidence').click());

    expect(latestToolData._nuclearLab.evidenceMastered).toEqual(['short-count']);
    expect(latestToolData._nuclearLab.pathsCompleted).toEqual(['know']);
    expect(host.querySelector('[data-nk-route-overview=know]').textContent)
      .toContain('✓ Route complete');
  });

  it('continues an already-active saved route without stealing scroll on mount', () => {
    mount({
      nkPath: 'know',
      nkOpen: true,
      nkRouteSeen: { know: ['detect', 'dating'] },
    });

    expect(document.activeElement.id).not.toBe('nksec-chain');
    act(() => buttonAriaStarts(
      'Continue: Uranium decay chain',
    ).click());

    expect(document.activeElement.id).toBe('nksec-chain');
    expect(latestToolData._nuclearLab.nkRouteSeen.know)
      .toEqual(['detect', 'dating', 'chain']);
  });

  it('records navigation, resumes at the next unopened step, and restores focus there', () => {
    const announceToSR = vi.fn();
    mount({ nkOpen: true, evidenceMastered: ['short-count'] }, { announceToSR });

    act(() => host.querySelector('button[data-nk-route-card=know]').click());
    expect(latestToolData._nuclearLab.nkRouteSeen.know).toEqual(['detect']);
    expect(document.activeElement.id).toBe('nksec-detect');
    expect(announceToSR, 'the focused first section was also announced by hand').not.toHaveBeenCalled();

    act(() => buttonAriaStarts('On to step 2:').click());
    expect(latestToolData._nuclearLab.nkRouteSeen.know).toEqual(['detect', 'dating']);
    expect(announceToSR, 'the focused second section was also announced by hand').not.toHaveBeenCalled();

    const topicNav = [...host.querySelectorAll('nav')].find((node) =>
      node.getAttribute('aria-label') === 'Nuclear lab topics');
    act(() => topicNav.querySelector('button[aria-expanded]').click());
    act(() => host.querySelector('button[data-nk-route-card=know]').click());

    const resume = host.querySelector('button[data-nk-route-card=know]');
    expect(resume.hasAttribute('aria-label')).toBe(false);
    expect(resume.textContent).toContain('How do we know all this?');
    expect(resume.textContent).toContain('Resume');
    expect(resume.textContent).toContain('next: Uranium decay chain');
    expect(resume.querySelector('.sr-only').textContent).toContain('Resume this route');
    act(() => resume.click());

    expect(document.activeElement.id).toBe('nksec-chain');
    expect(latestToolData._nuclearLab.nkRouteSeen.know)
      .toEqual(['detect', 'dating', 'chain']);
    expect(announceToSR, 'the focused resumed section was also announced by hand').not.toHaveBeenCalled();

    act(() => buttonAriaStarts('On to step 4:').click());

    expect(latestToolData._nuclearLab.nkRouteSeen.know)
      .toEqual(['detect', 'dating', 'chain', 'evidence']);
    expect(latestToolData._nuclearLab.pathsCompleted).toEqual(['know']);
    expect(host.querySelector('#nksec-evidence').textContent).toContain('✓ Route complete');
    expect(announceToSR).toHaveBeenCalledTimes(1);
    expect(announceToSR).toHaveBeenLastCalledWith(
      'Route complete: How do we know all this?',
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
