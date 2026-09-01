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
let originalMatchMedia;

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
  originalMatchMedia = window.matchMedia;
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
  if (originalMatchMedia) window.matchMedia = originalMatchMedia;
  else delete window.matchMedia;
  vi.restoreAllMocks();
  vi.useRealTimers();
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

function enterSearch(node, value) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
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

  it('describes the active claim from its statement, question, and feedback without competing live regions', () => {
    host.innerHTML = renderTool('nuclearLab', { _nuclearLab: {} });
    const claim = host.querySelector('#nk-evidence-claim');
    const describedBy = (claim.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);

    expect(describedBy).toEqual(expect.arrayContaining([
      'nk-evidence-statement',
      'nk-evidence-question',
      'nk-evidence-feedback',
    ]));
    const statement = host.querySelector('#nk-evidence-statement');
    const question = host.querySelector('#nk-evidence-question');
    expect(claim.contains(statement)).toBe(true);
    expect(claim.contains(question)).toBe(true);
    expect(statement.textContent.trim().length).toBeGreaterThan(40);
    expect(question.textContent).toContain('Which verdict is justified');

    const guidance = host.querySelector('#nk-evidence-feedback');
    expect(guidance.textContent).toBe('Choose a verdict to continue.');
    expect(guidance.getAttribute('role')).toBeNull();
    expect(guidance.getAttribute('aria-live')).toBeNull();

    const progress = host.querySelector('progress[aria-label$="evidence claims mastered"]');
    const masteryCounter = progress.nextElementSibling;
    expect(masteryCounter.textContent).toBe('0 of 5 mastered');
    expect(masteryCounter.getAttribute('role')).toBeNull();
    expect(masteryCounter.getAttribute('aria-live')).toBeNull();
  });

  it('keeps the reading adaptations explicit and exposes a keyboard skip path', () => {
    host.innerHTML = renderTool('nuclearLab', {
      _nuclearLab: { nkLargeText: true, nkReduceMotion: true },
    });
    const lab = host.querySelector('[data-nuclear-lab]');
    expect(lab.getAttribute('data-nk-large-text')).toBe('true');
    expect(lab.getAttribute('data-nk-reduce-motion')).toBe('true');
    expect(host.querySelector('button[aria-label^="A+ Text."]').getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('button[aria-label^="Motion: low."]').getAttribute('aria-pressed')).toBe('true');
    expect(buttonNamed('Skip topic controls and start reading')).toBeTruthy();
    expect(host.querySelector('#nksec-halflife').getAttribute('tabindex')).toBe('-1');
    const adaptations = host.querySelector('style').textContent;
    expect(adaptations).toContain('[data-nk-sec]:focus');
    expect(adaptations).toContain('.nk-readable textarea:focus-visible');
    expect(adaptations).toContain('.nk-index-secondary{display:none!important}');
    expect(adaptations).toContain('.nk-route-kicker-question{flex-basis:100%}');
  });

  it('makes the challenge the final step of every question-led route', () => {
    const routeClaimCounts = { safe: 1, me: 1, safety: 2, works: 1, know: 1 };
    for (const [route, count] of Object.entries(routeClaimCounts)) {
      host.innerHTML = renderTool('nuclearLab', { _nuclearLab: { nkPath: route } });
      const evidence = host.querySelector('#nksec-evidence');
      expect(evidence, route + ' route omits the challenge').toBeTruthy();
      expect(evidence.querySelector('nav[aria-label*=route]'), route + ' route has no final progress footer').toBeTruthy();
      expect(evidence.querySelector('legend').textContent).toBe('Claim 1 of ' + count);
      expect(evidence.querySelectorAll('nav[aria-label*=claims] button')).toHaveLength(count);
      expect(evidence.querySelector('progress').getAttribute('aria-label'))
        .toBe('0 of ' + count + ' evidence claims mastered');
      expect(evidence.textContent).toContain('This route asks only about evidence from the sections you just opened.');
      expect(evidence.textContent).toContain('finish the evidence challenge');
    }
  });

  it('falls back to the first relevant claim when saved position came from another route', () => {
    host.innerHTML = renderTool('nuclearLab', {
      _nuclearLab: {
        nkPath: 'safety',
        evidenceIndex: 4,
        evidenceClaimId: 'short-count',
      },
    });
    const claim = host.querySelector('#nk-evidence-claim');
    expect(claim.querySelector('legend').textContent).toBe('Claim 1 of 2');
    expect(claim.textContent).toContain('doubling the distance cuts the dose rate to one quarter');
    expect(claim.textContent).not.toContain('One short Geiger count');
  });

  it('offers a named, optional route reflection only after evidence mastery', () => {
    host.innerHTML = renderTool('nuclearLab', { _nuclearLab: { nkPath: 'know' } });
    expect(host.querySelector('[data-nk-reflection=know]')).toBeNull();

    host.innerHTML = renderTool('nuclearLab', {
      _nuclearLab: {
        nkPath: 'know',
        evidenceMastered: ['short-count'],
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
    expect(reflection.querySelector('h5').textContent).toBe('Reflect on the evidence so far');
    expect(reflection.textContent).toMatch(/route steps? to open/);
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
          evidenceMastered: ['short-count'],
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

  it('debounces the screen-reader search count while keeping the visible count current', () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 0);
    mount({ nkOpen: true });

    const search = host.querySelector('#nk-topic-search');
    const visibleCount = search.nextElementSibling;
    const liveCount = visibleCount.nextElementSibling;
    expect(liveCount.getAttribute('role')).toBe('status');
    expect(liveCount.textContent).toBe('');

    enterSearch(search, 'r');
    act(() => vi.advanceTimersByTime(200));
    enterSearch(search, 're');
    act(() => vi.advanceTimersByTime(200));
    enterSearch(search, 'reactor');

    expect(visibleCount.textContent).toMatch(/^showing \d+$/);
    expect(liveCount.textContent, 'an intermediate query was announced').toBe('');
    act(() => vi.advanceTimersByTime(349));
    expect(liveCount.textContent, 'the live count was not debounced for 350 ms').toBe('');
    act(() => vi.advanceTimersByTime(1));
    expect(liveCount.textContent).toMatch(/^\d+ topics? match the search\.$/);
  });

  it('keeps slider results visual immediately but debounces their spoken summaries', () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 0);
    mount({});

    const thickness = host.querySelector('#nk-thick');
    const shielding = host.querySelector('#nksec-shielding');
    const shieldLive = shielding.querySelector('p[role="status"].sr-only');
    enterSearch(thickness, '3');
    enterSearch(thickness, '4');
    expect(shielding.textContent).toContain('gets through 4 cm');
    expect(shieldLive.textContent).toBe('');
    act(() => vi.advanceTimersByTime(449));
    expect(shieldLive.textContent).toBe('');
    act(() => vi.advanceTimersByTime(1));
    expect(shieldLive.textContent).toContain('gets through 4 cm');

    const altitude = host.querySelector('#ds-alt');
    const dose = host.querySelector('#nksec-mydose');
    const doseLive = dose.querySelector('p[role="status"].sr-only');
    enterSearch(altitude, '500');
    expect(dose.textContent).toContain('mSv this year');
    expect(doseLive.textContent).toBe('');
    act(() => vi.advanceTimersByTime(450));
    expect(doseLive.textContent).toMatch(/^Estimated annual dose: .* millisieverts\.$/);
  });

  it('ORs learner and live system motion preferences before syncing the viewer', () => {
    let matches = true;
    const listeners = new Set();
    const motionQuery = {
      media: '(prefers-reduced-motion: reduce)',
      get matches() { return matches; },
      addEventListener(type, listener) {
        if (type === 'change') listeners.add(listener);
      },
      removeEventListener(type, listener) {
        if (type === 'change') listeners.delete(listener);
      },
      addListener(listener) { listeners.add(listener); },
      removeListener(listener) { listeners.delete(listener); },
    };
    window.matchMedia = vi.fn(() => motionQuery);

    resetStemLab();
    const sync = vi.fn();
    window.StemLab.makeBayViewer = () => ({
      attach() {},
      sync,
      nudge() {},
      zoom() {},
      reset() {},
      status() { return 'ready'; },
    });
    cfg = loadTool('stem_lab/stem_tool_nuclearlab.js', 'nuclearLab');
    mount({ nkReduceMotion: false });

    const lab = () => host.querySelector('[data-nuclear-lab]');
    const latestReduced = () => sync.mock.calls.at(-1)[0].reduced;
    let toggle = host.querySelector('button[aria-label^="Motion: low · system."]');
    expect(lab().getAttribute('data-nk-reduce-motion')).toBe('true');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.disabled, 'the OS reduction could be overridden').toBe(true);
    expect(latestReduced()).toBe(true);

    act(() => {
      matches = false;
      listeners.forEach((listener) => listener({ matches, media: motionQuery.media }));
    });

    toggle = host.querySelector('button[aria-label^="Motion: standard."]');
    expect(lab().getAttribute('data-nk-reduce-motion')).toBe('false');
    expect(toggle.disabled).toBe(false);
    expect(latestReduced()).toBe(false);

    act(() => toggle.click());
    expect(lab().getAttribute('data-nk-reduce-motion')).toBe('true');
    expect(latestReduced()).toBe(true);

    act(() => {
      matches = true;
      listeners.forEach((listener) => listener({ matches, media: motionQuery.media }));
    });
    expect(lab().getAttribute('data-nk-reduce-motion')).toBe('true');
    expect(latestReduced()).toBe(true);
  });
});

describe('reactor dashboard interaction', () => {
  it('reveals a persistent text snapshot when current status is requested', () => {
    const announceToSR = vi.fn();
    mount({}, { announceToSR });

    const button = host.querySelector('button[aria-label^="Show current status."]');
    const summary = host.querySelector('#rx-status-summary');
    expect(button).toBeTruthy();
    expect(button.getAttribute('aria-controls')).toBe('rx-status-summary');
    expect(summary.hidden).toBe(true);
    expect(summary.getAttribute('role')).toBeNull();
    expect(summary.getAttribute('aria-live')).toBeNull();

    act(() => button.click());

    expect(summary.hidden).toBe(false);
    expect(summary.textContent).toContain('Current status · paused.');
    expect(summary.textContent).toContain('Power 100 percent.');
    expect(summary.textContent).toMatch(/Fuel temperature [\d,.]+ degrees Celsius\./);
    expect(summary.textContent).toMatch(/Xenon [\d,.]+ times normal\./);
    expect(summary.textContent).toContain('Objective:');
    expect(announceToSR).toHaveBeenCalledTimes(1);
    expect(announceToSR.mock.calls[0][0]).toContain('Reactor status: paused.');
  });

  it('replays a viewer status reached during attach and reads later status changes', () => {
    resetStemLab();
    let viewerStatus = 'loading';
    let reportStatus;
    const status = vi.fn(() => viewerStatus);
    const sync = vi.fn((options) => {
      reportStatus = options.onStatus;
    });
    window.StemLab.makeBayViewer = () => ({
      attach(node) {
        // Reproduce the synchronous-ready edge: attach completes before the
        // following effect installs onStatus through sync().
        if (node) viewerStatus = 'ready';
      },
      sync,
      nudge() {},
      zoom() {},
      reset() {},
      status,
    });
    cfg = loadTool('stem_lab/stem_tool_nuclearlab.js', 'nuclearLab');

    let latestToolData;
    mount({ rxStatus: 'loading' }, {}, (toolData) => {
      latestToolData = toolData;
    });

    expect(sync).toHaveBeenCalled();
    expect(status).toHaveBeenCalled();
    expect(latestToolData._nuclearLab.rxStatus).toBe('ready');
    expect(host.textContent).not.toContain('Loading the 3D core…');

    act(() => {
      viewerStatus = 'failed';
      reportStatus('failed');
    });

    expect(latestToolData._nuclearLab.rxStatus).toBe('failed');
    expect(host.textContent).toContain('The 3D core could not start here');
  });
});

describe('evidence challenge interaction', () => {
  it('explains a weak verdict, then lets the learner revise and master it', () => {
    mount({});
    const supported = host.querySelector('input[name="nk-evidence-verdict"][value="supported"]');
    act(() => supported.click());
    act(() => buttonNamed('Check the evidence').click());

    expect(host.querySelector('#nk-evidence-feedback').textContent).toContain('Take another look');
    expect(host.querySelector('#nk-evidence-feedback').textContent).toContain('Use that evidence to revise');
    expect(host.querySelector('#nk-evidence-answer').hidden).toBe(true);
    expect(host.textContent).toContain('0 of 5 mastered');

    const reveal = buttonNamed('Show best verdict');
    reveal.focus();
    act(() => reveal.click());
    expect(host.querySelector('#nk-evidence-answer').hidden).toBe(false);
    expect(host.querySelector('#nk-evidence-answer').textContent).toContain('Best verdict: Contradicted by this evidence.');
    expect(document.activeElement).toBe(buttonNamed('Hide best verdict'));

    const contradicted = host.querySelector('input[name="nk-evidence-verdict"][value="contradicted"]');
    act(() => contradicted.click());
    act(() => buttonNamed('Check the evidence').click());

    expect(host.querySelector('#nk-evidence-feedback').textContent).toContain('Evidence match');
    expect(host.textContent).toContain('1 of 5 mastered');
    expect(buttonNamed('Next claim →')).toBeTruthy();
  });

  it('keeps keyboard focus and lets each screen-reader event speak once', () => {
    const announceToSR = vi.fn();
    mount({ nkPath: 'safety' }, { announceToSR });
    const supported = host.querySelector('input[name=nk-evidence-verdict][value=supported]');
    act(() => supported.click());

    const check = buttonNamed('Check the evidence');
    check.focus();
    act(() => check.click());

    expect(document.activeElement).toBe(buttonNamed('Check again'));
    expect(host.querySelector('#nk-evidence-feedback').textContent).toContain('Evidence match');
    expect(announceToSR, 'live feedback was also announced by hand').not.toHaveBeenCalled();
    const next = buttonNamed('Next claim →');
    next.focus();
    act(() => next.click());

    expect(document.activeElement.id).toBe('nk-evidence-claim');
    expect(document.activeElement.querySelector('legend').textContent).toBe('Claim 2 of 2');
    expect(announceToSR, 'focused claim name was also announced by hand').not.toHaveBeenCalled();
  });

  it('moves focus from numbered claim navigation to the newly selected claim', () => {
    const announceToSR = vi.fn();
    mount({}, { announceToSR });
    const claimTwo = host.querySelector('nav[aria-label="Evidence challenge claims"] button[aria-label^="Claim 2 of 5"]');
    expect(claimTwo).toBeTruthy();

    claimTwo.focus();
    act(() => claimTwo.click());

    expect(document.activeElement).toBe(host.querySelector('#nk-evidence-claim'));
    expect(document.activeElement.querySelector('legend').textContent).toBe('Claim 2 of 5');
    expect(announceToSR, 'the focused claim was also announced by hand').not.toHaveBeenCalled();
  });

  it('does not show a no-op next control on a one-claim route', () => {
    mount({ nkPath: 'know' });
    const uncertain = host.querySelector('input[name=nk-evidence-verdict][value=uncertain]');
    act(() => uncertain.click());
    act(() => buttonNamed('Check the evidence').click());

    expect(host.querySelector('#nk-evidence-feedback').textContent).toContain('Evidence match');
    expect(buttonNamed('Next claim →')).toBeUndefined();
    expect(buttonNamed('Review claim 1')).toBeUndefined();
  });

  it('resets only the active route claims and preserves mastery earned elsewhere', () => {
    let latestToolData;
    mount({
      nkPath: 'safety',
      evidenceChoices: {
        'inverse-square': 'supported',
        'short-count': 'uncertain',
      },
      evidenceChecked: {
        'inverse-square': true,
        'short-count': true,
      },
      evidenceMastered: ['inverse-square', 'short-count'],
    }, {}, (toolData) => {
      latestToolData = toolData;
    });

    act(() => buttonNamed('Start over').click());

    expect(latestToolData._nuclearLab.evidenceMastered).toEqual(['short-count']);
    expect(latestToolData._nuclearLab.evidenceChoices).toEqual({ 'short-count': 'uncertain' });
    expect(latestToolData._nuclearLab.evidenceChecked).toEqual({ 'short-count': true });
  });

  it('returns focus to the first claim when the learner starts over', () => {
    mount({
      nkPath: 'safety',
      evidenceIndex: 1,
      evidenceClaimId: 'neutron-layers',
    });
    expect(host.querySelector('#nk-evidence-claim legend').textContent).toBe('Claim 2 of 2');

    const reset = buttonNamed('Start over');
    reset.focus();
    act(() => reset.click());

    const claim = host.querySelector('#nk-evidence-claim');
    expect(claim.querySelector('legend').textContent).toBe('Claim 1 of 2');
    expect(document.activeElement).toBe(claim);
  });

  it('tracks all five claims, celebrates once, and satisfies the quest hook', () => {
    const celebrate = vi.fn();
    const awardXP = vi.fn();
    mount({}, { celebrate, awardXP });

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
      evidenceMastered: ['short-count'],
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

describe('reactor status interaction', () => {
  it('announces one concise, complete snapshot only when requested', () => {
    const announceToSR = vi.fn();
    mount({}, { announceToSR });
    const readStatus = host.querySelector('button[aria-label^="Show current status."]');
    const statusSummary = host.querySelector('#rx-status-summary');
    expect(readStatus).toBeTruthy();
    expect(readStatus.getAttribute('aria-controls')).toBe('rx-status-summary');
    expect(statusSummary).toBeTruthy();
    expect(statusSummary.hidden).toBe(true);
    expect(announceToSR).not.toHaveBeenCalled();

    act(() => readStatus.click());

    expect(announceToSR).toHaveBeenCalledTimes(1);
    expect(statusSummary.hidden).toBe(false);
    expect(statusSummary.textContent).toMatch(/current status/i);
    expect(statusSummary.textContent).toMatch(/power/i);
    expect(statusSummary.textContent).toMatch(/objective/i);
    const announcement = announceToSR.mock.calls[0][0];
    expect(announcement).toMatch(/state|status/i);
    expect(announcement).toMatch(/power/i);
    expect(announcement).toMatch(/fuel temperature/i);
    expect(announcement).toMatch(/net reactivity/i);
    expect(announcement).toMatch(/xenon/i);
    expect(announcement).toMatch(/objective/i);
    expect(announcement).not.toMatch(/NaN|Infinity|undefined/);
    expect(announcement.length).toBeLessThan(400);
  });
});
