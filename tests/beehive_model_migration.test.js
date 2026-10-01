import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Beehive saved daily-model provenance', () => {
  let BH;
  let config;
  let host;
  let root;
  let latest;
  let originalRaf;
  let originalCancelRaf;

  beforeEach(() => {
    resetStemLab();
    window.__RR_TEST_EXPORTS__ = {};
    config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
    BH = window.__RR_TEST_EXPORTS__.beehive;
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    originalRaf = globalThis.requestAnimationFrame;
    originalCancelRaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn(() => 1);
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = vi.fn();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    host.remove();
    globalThis.requestAnimationFrame = window.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = originalCancelRaf;
    vi.restoreAllMocks();
  });

  function savedColony(modelVersion, overrides = {}) {
    return {
      ...BH.bhCreateNewColonyState(777, 5),
      viewMode: 'beekeeper',
      beeView: 'scene',
      tutorialDone: true,
      soundOn: false,
      day: 47,
      modelVersion,
      randomState: 12345,
      ...overrides,
    };
  }

  async function mount(initial) {
    const Component = () => {
      const [toolData, setToolData] = React.useState({ beehive: initial });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    };
    await act(async () => root.render(React.createElement(Component)));
  }

  async function nextDay() {
    const button = host.querySelector('#beehive-next-day');
    expect(button).toBeTruthy();
    await act(async () => button.click());
  }

  it('preserves the model that produced a saved colony and its frozen checkpoint', () => {
    const old = savedColony('colony-daily-1.0');
    const before = structuredClone(old);
    expect(BH.bhExperimentProvenance(old)).toMatchObject({
      modelVersion: 'colony-daily-1.0',
      seededFromDay: 0,
      exactFromStart: true,
    });
    const checkpoint = BH.bhCreateExperimentSnapshot(old);
    expect(checkpoint.modelVersion).toBe('colony-daily-1.0');
    expect(BH.bhNormalizeExperimentSnapshot(checkpoint).modelVersion).toBe('colony-daily-1.0');
    expect(old).toEqual(before);
  });

  it('explains the pending model change without migrating an unopened day', async () => {
    await mount(savedColony('colony-daily-1.0'));
    expect(latest.beehive.modelVersion).toBe('colony-daily-1.0');
    expect(latest.beehive.seededFromDay).toBe(0);
    expect(latest.beehive.randomState).toBe(12345);
    const note = host.querySelector('[data-beehive-model-migration-note]');
    expect(note.textContent).toContain('repeatable tracking starting from Day 47');
    expect(note.textContent).toContain('Start a fresh colony');
    expect(host.textContent).toContain('Recorded daily model colony-daily-1.0');
    expect(host.textContent).toContain(`Forecasts and new days use ${BH.BEEHIVE_COLONY_MODEL_VERSION}`);
  }, 30000);

  it('retains the next random draw while making mixed-model history ineligible for a full-run comparison', async () => {
    const initial = savedColony('colony-daily-1.0');
    const expectedRandom = BH.bhCreateSeededRandom(initial.randomState);
    // This healthy, uncrowded colony uses one daily event draw; it fires no
    // event, so another activation can verify the migration boundary is stable.
    expect(expectedRandom.rand()).toBeGreaterThan(BH.SIMULATION_PARAMS.randomEventChance);
    await mount(initial);
    await nextDay();

    expect(latest.beehive).toMatchObject({
      day: 48,
      modelVersion: BH.BEEHIVE_COLONY_MODEL_VERSION,
      simulationSeed: 777,
      experimentRunSerial: 5,
      seededFromDay: 47,
      randomState: expectedRandom.getState(),
    });
    expect(BH.bhExperimentProvenance(latest.beehive).exactFromStart).toBe(false);
    const freshBaseline = BH.bhCreateExperimentSnapshot(savedColony(BH.BEEHIVE_COLONY_MODEL_VERSION, {
      day: 48,
      experimentRunSerial: 4,
    }));
    const comparison = BH.bhCompareExperiments(freshBaseline, latest.beehive);
    expect(comparison.status).toBe('exploratory');
    expect(comparison.matchedCheckpoint).toBe(false);
    expect(comparison.interpretationReady).toBe(false);
    expect(comparison.checks.find((check) => check.id === 'tracking').matched).toBe(false);
    expect(host.querySelector('[data-beehive-seed-migration-note]').textContent).toContain('Day 47');
    expect(host.querySelector('[data-beehive-model-migration-note]')).toBeNull();

    await nextDay();
    expect(latest.beehive.day).toBe(49);
    expect(latest.beehive.seededFromDay).toBe(47);
  }, 30000);

  it('continues current-model saves with their full-run tracking and saved random cursor intact', async () => {
    const initial = savedColony(BH.BEEHIVE_COLONY_MODEL_VERSION);
    const expectedRandom = BH.bhCreateSeededRandom(initial.randomState);
    expectedRandom.rand();
    await mount(initial);
    await nextDay();
    expect(latest.beehive).toMatchObject({
      day: 48,
      modelVersion: BH.BEEHIVE_COLONY_MODEL_VERSION,
      seededFromDay: 0,
      randomState: expectedRandom.getState(),
    });
    expect(BH.bhExperimentProvenance(latest.beehive).exactFromStart).toBe(true);
    expect(host.querySelector('[data-beehive-model-migration-note]')).toBeNull();
    expect(host.querySelector('[data-beehive-seed-migration-note]')).toBeNull();
  }, 30000);
});
