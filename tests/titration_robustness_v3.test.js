import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE_PATH = 'stem_lab/stem_tool_titration.js';

let tool;
let host;
let root;

function renderState(state) {
  const mount = document.createElement('div');
  mount.innerHTML = renderTool('titrationLab', { titrationLab: state });
  return mount;
}

async function mountState(initialState, overrides = {}) {
  host = document.createElement('div');
  document.body.appendChild(host);

  function App() {
    const [toolData, setToolData] = React.useState({ titrationLab: initialState });
    const ctx = makeCtx(Object.assign({
      toolData,
      updateMulti(toolId, patch) {
        setToolData((previous) => Object.assign({}, previous, {
          [toolId]: Object.assign({}, previous[toolId] || {}, patch || {}),
        }));
      },
    }, overrides));
    return tool.render(ctx);
  }

  root = ReactDOMClient.createRoot(host);
  await React.act(async () => {
    root.render(React.createElement(App));
    await Promise.resolve();
  });
  return host;
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  tool = loadTool(SOURCE_PATH, 'titrationLab');
  window._titrationXPFlags = {};
});

afterEach(async () => {
  if (root) {
    await React.act(async () => root.unmount());
    root = null;
  }
  host?.remove();
  host = null;
  if (window._titrationDrillTimer) {
    clearInterval(window._titrationDrillTimer);
    window._titrationDrillTimer = null;
  }
  vi.useRealTimers();
});

describe('Titration Lab persisted-state recovery', () => {
  it('falls back from removed navigation ids and non-numeric volume', () => {
    let view;
    expect(() => {
      view = renderState({
        safetyChecked: true,
        labTab: 'removed-tab',
        presetId: 'removed-preset',
        indicator: 'removed-indicator',
        volumeAdded: 'not-a-number',
        _firstRun: true,
      });
    }).not.toThrow();

    const selected = view.querySelector('[role="tab"][aria-selected="true"]');
    expect(selected?.id).toBe('titration-tab-titrate');
    expect(view.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby'))
      .toBe('titration-tab-titrate');
    expect(view.textContent).not.toMatch(/NaN|Infinity/);
  });

  it('normalizes stale quiz and incident indexes/answers', () => {
    let quiz;
    expect(() => {
      quiz = renderState({
        safetyChecked: true,
        labTab: 'challenge',
        chMode: 'quiz',
        challengeIdx: -1,
        challengeAnswer: null,
        _firstRun: true,
      });
    }).not.toThrow();
    expect(quiz.querySelector('#titration-quiz-question')).not.toBeNull();
    expect(quiz.textContent).toContain('Q1 of');

    let incident;
    expect(() => {
      incident = renderState({
        safetyChecked: true,
        labTab: 'incidents',
        incidentIdx: 999,
        incidentAnswer: 'option-removed-in-a-new-version',
        incidentCompleted: {},
        _firstRun: true,
      });
    }).not.toThrow();
    expect(incident.querySelectorAll('[aria-current="true"]')).toHaveLength(1);
    expect(incident.querySelector('#titration-incident-feedback')).toBeNull();
  });

  it('discards malformed graded collections and stale result shapes', () => {
    let view;
    expect(() => {
      view = renderState({
        safetyChecked: true,
        labTab: 'challenge',
        chMode: 'graded',
        gRun: 4,
        gTrials: { legacy: true },
        gLog: [{ run: 3, name: 'old entry' }],
        gResult: { band: 'retired-band' },
        _firstRun: true,
      });
    }).not.toThrow();
    expect(view.querySelector('#titration-graded-run')).not.toBeNull();
    expect(view.querySelector('#titration-graded-result')).toBeNull();
    expect(view.textContent).not.toMatch(/NaN|Infinity/);
  });

  it('merges partial buffer state with defaults', () => {
    let view;
    expect(() => {
      view = renderState({
        safetyChecked: true,
        labTab: 'buffers',
        buffers: { hypothesis: 'A saved note from an older version' },
        _firstRun: true,
      });
    }).not.toThrow();
    expect(view.querySelector('#bf-ka')).not.toBeNull();
    expect(view.querySelector('#bf-ratio')).not.toBeNull();
    expect(view.textContent).not.toMatch(/NaN|Infinity/);
  });

  it('renders numeric-string graded results and logs as formatted numbers', () => {
    let view;
    expect(() => {
      view = renderState({
        safetyChecked: true,
        labTab: 'challenge',
        chMode: 'graded',
        gRun: 4,
        gResult: {
          run: '4',
          band: 'good',
          measuredConc: '0.81234',
          volErrMl: '-0.126',
          techniqueErrMl: '0.104',
          methodBiasMl: '-0.229',
          concErrPct: '-1.246',
          withinTolerance: false,
          seconds: '42',
          stats: { n: '2', mean: '20.125', spread: '0.050', sd: '0.035' },
          pa: {
            verdict: 'both',
            precise: true,
            accurate: true,
            biasMl: '-0.126',
          },
        },
        gLog: [{
          run: '3',
          name: 'Saved numeric-string run',
          volErrMl: '-0.126',
          concErrPct: '-1.246',
          seconds: '42',
        }],
        _firstRun: true,
      });
    }).not.toThrow();

    expect(view.querySelector('#titration-graded-result')).not.toBeNull();
    expect(view.textContent).toContain('0.812 M');
    expect(view.textContent).toContain('+0.10 mL');
    expect(view.textContent).toContain('-0.23 mL');
    expect(view.textContent).toContain('-1.25%');
    expect(view.textContent).toContain('Saved numeric-string run');
    expect(view.textContent).toContain('-0.13');
    expect(view.textContent).not.toMatch(/NaN|Infinity/);
  });
});

describe('Titration Lab lifecycle and update atomicity', () => {
  it('keeps a null endpoint sentinel unreached after the first small delivery', async () => {
    await mountState({
      safetyChecked: true,
      labTab: 'challenge',
      chMode: 'graded',
      gRun: 1,
      gInitialTrue: 1,
      gInitialLocked: true,
      gInitialRecorded: 1,
      gInitialEyeCm: 0,
      gEyeCm: 0,
      gVb: 0,
      gEndpointReachedAt: null,
      gTrials: [],
      _firstRun: true,
    });

    expect(host.textContent).toContain('No colour change yet.');
    const oneDrop = host.querySelector('button[aria-label="Deliver +1 drop"]');
    expect(oneDrop).not.toBeNull();
    expect(oneDrop.disabled).toBe(false);

    await React.act(async () => {
      oneDrop.click();
      await Promise.resolve();
    });

    expect(host.textContent).toContain('No colour change yet.');
    expect(host.textContent).not.toContain('Strong, deep colour throughout');
  });

  it('keeps the AI busy state and resolved explanation in one atomic state flow', async () => {
    let finish;
    const pending = new Promise((resolve) => { finish = resolve; });
    await mountState({
      safetyChecked: true,
      labTab: 'titrate',
      presetId: 'sa_sb',
      indicator: 'phenolphthalein',
      volumeAdded: 1,
      aiLoading: false,
      aiError: '',
      aiExplain: 'An older explanation that is being replaced.',
      _firstRun: true,
      _reachedEquiv: true,
    }, {
      callGemini: () => pending,
    });

    const explain = host.querySelector('button[aria-label^="Re-explain at"]');
    expect(explain).not.toBeNull();
    await React.act(async () => {
      explain.click();
      await Promise.resolve();
    });
    const busyDuringRequest = host.querySelector('[aria-label="AI titration tutor"]')
      ?.getAttribute('aria-busy');

    await React.act(async () => {
      finish('The retained explanation proves the async update was not overwritten.');
      await pending;
      await Promise.resolve();
    });

    expect({
      busyDuringRequest,
      responseRetained: host.textContent.includes('The retained explanation proves'),
    }).toEqual({ busyDuringRequest: 'true', responseRetained: true });
  });

  it('does not start the safety countdown as a server-render side effect', () => {
    vi.useFakeTimers();
    const now = Date.now();
    expect(() => renderTool('titrationLab', {
      titrationLab: {
        safetyChecked: false,
        safetyStation: 4,
        drillActive: true,
        drillStartTime: now,
        _firstRun: true,
      },
    })).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('Titration Lab extended curve domain', () => {
  it('keeps a saved 75 mL phosphoric-acid state controllable and on the plot', async () => {
    await mountState({
      safetyChecked: true,
      labTab: 'titrate',
      presetId: 'poly_h3po4',
      indicator: 'phenolphthalein',
      volumeAdded: 75,
      _prevVolume: 74.9,
      _firstRun: true,
      _reachedEquiv: true,
    });

    let range = host.querySelector('input[type="range"][aria-label="Titrant volume"]');
    expect(range).not.toBeNull();
    expect(Number(range.max)).toBeGreaterThanOrEqual(75);
    expect(Number(range.value)).toBe(75);

    const curve = host.querySelector('svg[aria-label^="Titration curve for"]');
    expect(curve).not.toBeNull();
    expect(curve.getAttribute('aria-label')).toContain('Currently 75.0 mL');
    const marker = [...curve.querySelectorAll('circle')].find((circle) =>
      circle.getAttribute('r') === '5' && circle.getAttribute('fill') === '#38bdf8');
    expect(marker).toBeTruthy();
    expect(Number(marker.getAttribute('cx'))).toBeGreaterThanOrEqual(50);
    expect(Number(marker.getAttribute('cx'))).toBeLessThanOrEqual(680);

    const add = host.querySelector('button[aria-label="Add 0.1 milliliters of titrant"]');
    expect(add).not.toBeNull();
    await React.act(async () => {
      add.click();
      await Promise.resolve();
    });

    range = host.querySelector('input[type="range"][aria-label="Titrant volume"]');
    expect(Number(range.value)).toBeGreaterThanOrEqual(75);
    expect(range.getAttribute('aria-valuetext')).toMatch(/^75(?:\.0|\.1) milliliters,/);
  });
});

describe('Titration Lab embedding and focus contracts', () => {
  const surfaces = [
    { safetyChecked: false },
    { safetyChecked: true, labTab: 'titrate', _firstRun: true },
    { safetyChecked: true, labTab: 'challenge', chMode: 'graded', _firstRun: true },
    { safetyChecked: true, labTab: 'challenge', chMode: 'quiz', _firstRun: true },
    { safetyChecked: true, labTab: 'incidents', _firstRun: true },
    { safetyChecked: true, labTab: 'equipment', _firstRun: true },
    { safetyChecked: true, labTab: 'molarity', _firstRun: true },
    { safetyChecked: true, labTab: 'buffers', _firstRun: true },
  ];

  it('gives every rendered button type=button so an ancestor form is never submitted', () => {
    const missing = [];
    for (const state of surfaces) {
      const view = renderState(state);
      for (const button of view.querySelectorAll('button:not([type])')) {
        missing.push((button.getAttribute('aria-label') || button.textContent || 'unnamed').trim());
      }
    }
    expect(missing).toEqual([]);
  });

  it('uses the instance-scoped focus helper when the safety gate enters the lab', async () => {
    const source = await import('node:fs').then((fs) => fs.readFileSync(SOURCE_PATH, 'utf8'));
    const enterBlock = source.slice(
      source.indexOf('allStationsComplete && React.createElement("button"'),
      source.indexOf('// \u2500\u2500 Keyboard shortcuts'),
    );
    expect(enterBlock).toContain("focusTitrationRegion('titration-lab-root')");
    expect(enterBlock).not.toContain("document.getElementById('titration-lab-root')");
  });
});
