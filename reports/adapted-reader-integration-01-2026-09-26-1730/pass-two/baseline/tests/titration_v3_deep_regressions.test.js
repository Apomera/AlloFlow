// Deep Titration Lab regressions: measurement validity, endpoint-qualified
// replicates, unknown-specific indicators, physical burette geometry, 3D/a11y
// parity, and the safety-critical localization boundary.

import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE_PATH = 'stem_lab/stem_tool_titration.js';
const SOURCE = fs.readFileSync(SOURCE_PATH, 'utf8');

// Keep missing planned helpers local to their own assertions. That produces a
// useful failed test instead of aborting collection of the whole file while a
// source batch is being developed.
const MODEL = (() => {
  const head = SOURCE.slice(0, SOURCE.indexOf("window.StemLab.registerTool('titrationLab'"));
  const win = { StemLab: {} };
  const doc = {
    getElementById: () => ({}),
    createElement: () => ({ style: {} }),
    head: { appendChild() {} },
  };
  return new Function('window', 'document', head + `; return {
    BURETTE,
    roundBuretteDelta: typeof roundBuretteDelta === 'function' ? roundBuretteDelta : null,
    titreFromReadings: typeof titreFromReadings === 'function' ? titreFromReadings : null
  };`)(win, doc);
})();

function renderState(state, overrides) {
  const html = renderTool('titrationLab', {
    titrationLab: Object.assign({ safetyChecked: true }, state),
  }, overrides);
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

function buttonNamed(root, pattern) {
  return Array.from(root.querySelectorAll('button')).find((button) => {
    const name = button.getAttribute('aria-label') || button.textContent || '';
    return pattern.test(name.trim());
  });
}

function gradedTrial(endpointState, recorded = 20.00) {
  return {
    initialTrue: 2,
    finalTrue: 2 + recorded,
    initialRecorded: 2,
    finalRecorded: 2 + recorded,
    initialEyeCm: 0,
    finalEyeCm: 0,
    recorded,
    endpointState,
    included: true,
  };
}

function gradedRoot(trials, extra = {}) {
  return renderState(Object.assign({
    labTab: 'challenge',
    chMode: 'graded',
    gRun: 1,
    gVb: 0,
    gEyeCm: 0,
    gTrials: trials,
  }, extra));
}

function gradedFlaskSwatch(root) {
  const label = Array.from(root.querySelectorAll('div')).find((node) =>
    node.children.length === 0 && node.textContent.trim() === 'IN THE FLASK');
  const content = label?.parentElement;
  return content?.previousElementSibling || null;
}

beforeEach(() => {
  resetStemLab();
  loadTool(SOURCE_PATH, 'titrationLab');
  window._titrationXPFlags = {};
});

describe('signed burette differences preserve invalid evidence', () => {
  it('rounds a delta at display resolution without clamping its sign', () => {
    expect(MODEL.roundBuretteDelta).toBeTypeOf('function');
    expect(MODEL.roundBuretteDelta(0.006)).toBeCloseTo(0.01, 10);
    expect(MODEL.roundBuretteDelta(-0.006)).toBeCloseTo(-0.01, 10);
    expect(MODEL.roundBuretteDelta(-1.234)).toBeCloseTo(-1.23, 10);
    expect(MODEL.roundBuretteDelta(-0.006)).toBeCloseTo(
      -MODEL.roundBuretteDelta(0.006),
      10,
    );
  });

  it('marks a visible final-below-initial pair invalid instead of turning it into 0.00 mL', () => {
    const reading = MODEL.titreFromReadings(10, -0.25, 0, 0);
    expect(reading.initial).toBeCloseTo(10, 10);
    expect(reading.final).toBeCloseTo(9.75, 10);
    expect(reading.final).toBeLessThan(reading.initial);
    expect(reading.valid).toBe(false);
    expect(reading.titre).toBeNull();
  });
});

describe('graded reports require endpoint-qualified replicates', () => {
  it.each([
    ['pre-endpoint', 'none', /before endpoint|pre-endpoint/i],
    ['overshot', 'over', /overshot|past endpoint/i],
  ])('rejects two identical concordant %s readings', (_label, endpointState, statusText) => {
    const root = gradedRoot([
      gradedTrial(endpointState),
      gradedTrial(endpointState),
    ]);
    const table = root.querySelector('#titration-trials table');
    const report = buttonNamed(root, /finish and report/i);

    expect(table).not.toBeNull();
    expect(table.textContent).toMatch(statusText);
    expect(report).not.toBeNull();
    expect(report.disabled).toBe(true);
  });

  it('accepts two concordant readings that were both recorded at the endpoint', () => {
    const root = gradedRoot([
      gradedTrial('endpoint'),
      gradedTrial('endpoint'),
    ]);
    const table = root.querySelector('#titration-trials table');
    const report = buttonNamed(root, /finish and report/i);

    expect(table).not.toBeNull();
    expect(table.textContent).toMatch(/endpoint/i);
    expect(report).not.toBeNull();
    expect(report.disabled).toBe(false);
  });
});

describe('the graded unknown owns its endpoint indicator', () => {
  it('keeps the flask colour independent of the exploratory indicator selection', () => {
    const common = {
      labTab: 'challenge', chMode: 'graded', gRun: 1,
      gInitialTrue: 2, gInitialLocked: true, gInitialRecorded: 2,
      gInitialEyeCm: 0, gEyeCm: 0, gVb: 0,
    };
    const methylOrange = renderState(Object.assign({}, common, { indicator: 'methylOrange' }));
    const universal = renderState(Object.assign({}, common, { indicator: 'universal' }));
    const a = gradedFlaskSwatch(methylOrange);
    const b = gradedFlaskSwatch(universal);

    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a.style.background).not.toBe('');
    expect(a.style.background).toBe(b.style.background);
    expect(methylOrange.textContent).toContain('Phenolphthalein');
    expect(universal.textContent).toContain('Phenolphthalein');
  });
});

describe('graded 3D burette and accessible description use absolute readings', () => {
  it('pushes final true/recorded positions and explains final reading versus titre', () => {
    // Reload with a controllable viewer so the render-time push payload is observable.
    resetStemLab();
    const viewers = {};
    window.StemLab.makeOrbitViewer = (config) => {
      const pushes = [];
      const viewer = {
        attach() {},
        push(value) { pushes.push(value); },
        onStatusChange() {},
        status() { return 'ready'; },
        debug() { return {}; },
        dispose() {},
      };
      viewers[config.attr] = { viewer, pushes };
      return viewer;
    };
    loadTool(SOURCE_PATH, 'titrationLab');

    const root = renderState({
      labTab: 'challenge', chMode: 'graded', gRun: 1,
      gInitialTrue: 5, gInitialLocked: true, gInitialRecorded: 5,
      gInitialEyeCm: 0, gEyeCm: 0, gVb: 10, gTrials: [],
    });
    const capture = viewers['data-titration-burette-gl'];
    const pushed = capture?.pushes.at(-1);
    const prose = Array.from(root.querySelectorAll('[role="img"]'))
      .map((node) => node.getAttribute('aria-label') || '')
      .find((label) => /arrow keys orbit/i.test(label));

    expect(pushed).toBeDefined();
    expect(pushed.trueMl).toBeCloseTo(15, 10);
    expect(pushed.readMl).toBeCloseTo(15, 10);
    expect(pushed.sig).toContain('15.00');
    expect(prose).toMatch(/final burette reading[^.]*15\.00/i);
    expect(prose).toMatch(/titre[^.]*10\.00/i);
  });
});

describe('the physical burette stays a 50 mL instrument', () => {
  it('uses the redox curve window for the graph control but 50 mL for the glass scale', () => {
    const root = renderState({ labTab: 'titrate', presetId: 'redox_kmno4', volumeAdded: 6 });
    const curveControl = root.querySelector('input[aria-label="Titrant volume"]');
    const physicalCardTitle = Array.from(root.querySelectorAll('div')).find((node) =>
      node.children.length === 0 && node.textContent.trim() === 'BURETTE & FLASK');
    const physicalCard = physicalCardTitle?.parentElement;
    const fifty = Array.from(physicalCard?.querySelectorAll('span') || []).find((node) =>
      node.textContent.trim() === '50' && node.parentElement?.style.position === 'absolute');

    expect(curveControl).not.toBeNull();
    expect(curveControl.getAttribute('max')).toBe('12');
    expect(fifty).not.toBeNull();
    expect(fifty.parentElement.style.top).toBe('260px');
  });
});

describe('safety-critical localization is fail-safe', () => {
  it('ignores a stale unsafe emergency translation while retaining ordinary localization', () => {
    const unsafe = 'STALE UNSAFE ADVICE: neutralize the acid on your skin with baking soda.';
    const localizedTab = 'TITRAR — localized non-safety label';
    const root = renderState({ labTab: 'incidents', incidentIdx: 0 }, {
      t(key, fallback) {
        if (key === 'stem.titration.remove_clothing_rinse_under_running_wa') return unsafe;
        if (key === 'stem.titration.titrate') return localizedTab;
        return fallback || key;
      },
    });

    expect(root.textContent).not.toContain(unsafe);
    expect(root.textContent).toContain(
      'Immediately rinse under running water for at least 15 minutes and alert the teacher',
    );
    expect(root.textContent).toContain(localizedTab);
  });
});
