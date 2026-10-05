import { Buffer } from 'node:buffer';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let BH, config;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
  BH = window.__RR_TEST_EXPORTS__.beehive;
});
const date = '2026-10-01T08:00:00Z';
const noteState = note => ({ notebook: { synthesis: note } });

async function mounted(state, check, getContext = () => null) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const canvas = vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(getContext);
  let latest;
  function MountedBee() {
    const [toolData, setToolData] = React.useState({ wave: { saved: 'Unrelated work' }, beehive: { tutorialDone: true, soundOn: false, motionPaused: true, ...state } });
    latest = toolData;
    return config.render(makeCtx({ toolData, setToolData }));
  }
  try {
    await act(async () => { root.render(React.createElement(MountedBee)); await Promise.resolve(); });
    await check(host, () => latest);
  } finally {
    await act(async () => { root.unmount(); }); host.remove(); canvas.mockRestore();
  }
}

describe('Legacy Bee daily history compatibility', () => {
  it('preserves healthy current records and valid partial measurements by identity', () => {
    const point = { d: 2, h: 21, w: 0, v: 12, m: 60 }, partial = { d: 3, h: 20 };
    const state = { history: [point, partial] }, result = BH.bhRecoverBeehiveState(state);
    expect(result.state).toBe(state); expect(result.repairs).toEqual([]);
    expect(result.state.history[1]).not.toHaveProperty('w');
  });

  it('adds compatible aliases to legacy readings without losing original finite values or notes', () => {
    const point = { day: 2, honey: 21, workers: 12000, varroa: 12, morale: 60, note: 'Original finite observations.' };
    const state = { history: [point] }, result = BH.bhRecoverBeehiveState(state);
    expect(result.repairs).toEqual(['history']);
    expect(result.state.history[0]).toEqual({ ...point, d: 2, h: 21, w: 12000, v: 12, m: 60 });
    expect(point).not.toHaveProperty('d');
    expect(BH.bhRecoverBeehiveState(result.state).state).toBe(result.state);
  });

  it('keeps valid daily evidence when another metric is damaged and recovers finite alternate aliases', () => {
    const state = { history: [null, { d: {}, day: 2, h: 'bad', honey: 21, w: {}, workers: 12000, v: NaN }, { d: 3, h: {}, w: 12100 }, { d: 'unknown', h: 20 }] };
    const result = BH.bhRecoverBeehiveState(state);
    expect(result.state.history).toEqual([{ day: 2, honey: 21, workers: 12000, d: 2, h: 21, w: 12000 }, { d: 3, w: 12100 }]);
    expect(result.state.history[0]).not.toHaveProperty('v');
    expect(result.state.history[1]).not.toHaveProperty('h');
    expect(BH.bhDiscoveryFoodTrend(result.state.history, 4, 22)).toEqual([{ day: 2, honey: 21 }, { day: 4, honey: 22 }]);
  });

  it('retains an empty latest duplicate so the history view does not resurrect earlier measurements', () => {
    const state = { history: [{ d: 1, w: 10, h: 5, v: 2, m: 70 }, { d: 1 }] };
    const result = BH.bhRecoverBeehiveState(state);
    expect(result.state.history).toHaveLength(2);
    const view = BH.bhColonyHistoryView(result.state.history, 'workers', 'all', 1);
    expect(view.rows).toEqual([{ day: 1, workers: null, food: null, mites: null, stability: null }]);
    expect(view).toMatchObject({ recordedCount: 1, validCount: 0, duplicateCount: 1 });
    expect(view.series[0].value).toBeNull();
    expect(view.segments).toEqual([]);
    expect(view.endpoints.delta).toBeNull();
  });

  it('preserves a date-only legacy checkpoint as a missing first endpoint instead of moving the delta inward', () => {
    const state = { history: [{ day: 1 }, { d: 2, w: 10 }, { d: 3, w: 20 }] };
    const result = BH.bhRecoverBeehiveState(state);
    expect(result.state.history).toHaveLength(3);
    expect(result.state.history[0]).toEqual({ day: 1, d: 1 });
    expect(state.history[0]).not.toHaveProperty('d');
    expect(BH.bhRecoverBeehiveState(result.state).state).toBe(result.state);
    const view = BH.bhColonyHistoryView(result.state.history, 'workers', 'all', 3);
    expect(view).toMatchObject({ firstDay: 1, lastDay: 3, recordedCount: 3, validCount: 2, missingCount: 1 });
    expect(view.endpoints).toEqual({ first: { day: 1, value: null }, last: { day: 3, value: 20 }, delta: null });
    expect(BH.bhColonyHistoryCSV(view)).toContain('\n1,,,,\n2,10,,,');
  });

  it('uses real legacy baselines in seasonal deltas and shows unavailable readings instead of zero baselines', () => {
    const markup = renderTool('beehive', { beehive: { tutorialDone: true, day: 30, workers: 11000, honey: 15, varroaLevel: 12, history: [{ day: 0, honey: 12, workers: 10000, varroaLevel: 10 }], notebook: { beekeeper: { explanation: 'Preserved explanation.' } } } });
    const host = document.createElement('div'); host.innerHTML = markup;
    const report = host.querySelector('#beehive-season-report');
    expect(report.textContent).toContain('+3 lb');
    expect(report.textContent).not.toContain('+15 lb');
    expect(report.textContent).not.toContain('unavailable');
    const partial = document.createElement('div');
    partial.innerHTML = renderTool('beehive', { beehive: { tutorialDone: true, day: 30, honey: 15, history: [{ d: 0, h: 12 }] } });
    expect(partial.querySelector('#beehive-season-report').textContent).toContain('Earlier reading unavailable');
    expect(partial.querySelector('#beehive-season-report').textContent).not.toContain('NaN');
  });

  it('does not claim annual peaks when the retained history has no readings for those metrics', () => {
    const report = BH.bhYearReport({ day: 120, history: [{ day: 90, honey: 50, workers: 12000, varroa: 22 }] }, 1, BH.SIMULATION_PARAMS);
    expect(report).toMatchObject({ peakWorkers: 12000, peakVarroa: 22, winterHoney: 50 });
    const partial = BH.bhYearReport({ day: 120, history: [{ d: 90, h: 50 }] }, 1, BH.SIMULATION_PARAMS);
    expect(partial).toMatchObject({ peakWorkers: null, peakVarroa: null, winterHoney: 50 });
    const html = renderTool('beehive', { beehive: { tutorialDone: true, day: 120, history: [{ d: 90, h: 50 }] } });
    expect(html).toContain('Unavailable');
    expect(html).not.toContain('Mites peaked at 0');
  });

  it('mounts partial legacy history with gaps in the chart rather than invented zero observations', async () => {
    await mounted({ day: 5, history: [{ day: 0, honey: 8, workers: 100 }, { day: 1, honey: 9 }, { day: 2, honey: 10, workers: 0 }], notebook: { beekeeper: { explanation: 'Preserved history notes.' } } }, async (host, latest) => {
      expect(host.textContent).toContain('Preserved history notes.');
      expect(latest().beehive.history[1]).not.toHaveProperty('w');
      const before = JSON.stringify(latest());
      const chart = host.querySelector('[data-history-chart]');
      expect(chart.querySelectorAll('[data-history-segment]')).toHaveLength(0);
      expect(Array.from(chart.querySelectorAll('[data-history-point]')).map(point => [point.dataset.day, point.dataset.value])).toEqual([['0', '100'], ['2', '0']]);
      expect(host.querySelector('[data-history-row="1"]').textContent).toContain('Unavailable');
      expect(host.querySelector('[data-history-row="2"]').children[1].textContent).toBe('0');
      await act(async () => {
        const metric = host.querySelector('[data-history-metric]'); metric.value = 'food';
        metric.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve();
      });
      expect(host.querySelectorAll('[data-history-segment]')).toHaveLength(1);
      expect(Array.from(host.querySelectorAll('[data-history-point]')).map(point => point.dataset.value)).toEqual(['8', '9', '10']);
      expect(JSON.stringify(latest())).toBe(before);
    });
  });
});

describe('Bee backup UTF-8 size contract', () => {
  it('counts UTF-8 bytes consistently for ASCII, multilingual text, emoji, and unpaired surrogates', () => {
    for (const text of ['plain text', '蜂と花', '🐝🌼', '\ud800', '\udc00', 'x🐝蜂\ud800']) expect(BH.bhBeeBackupByteLength(text)).toBe(Buffer.byteLength(text, 'utf8'));
    expect(BH.BEEHIVE_BACKUP_MAX_BYTES).toBe(2097152);
  });

  for (const character of ['x', '蜂', '🐝']) {
    it(`exports and imports an exact-limit backup containing ${character}`, () => {
      const empty = BH.bhBuildBeeBackup(noteState(''), date), room = BH.BEEHIVE_BACKUP_MAX_BYTES - Buffer.byteLength(empty, 'utf8');
      const characterBytes = Buffer.byteLength(character, 'utf8');
      const note = character.repeat(Math.floor(room / characterBytes)) + 'x'.repeat(room % characterBytes);
      const backup = BH.bhBuildBeeBackup(noteState(note), date);
      expect(Buffer.byteLength(backup, 'utf8')).toBe(BH.BEEHIVE_BACKUP_MAX_BYTES);
      const restored = BH.bhReadBeeBackup(backup);
      expect(restored.error).toBeUndefined(); expect(restored.state.notebook.synthesis).toBe(note);
      const oversized = backup.replace('"synthesis": "', '"synthesis": "x');
      expect(BH.bhReadBeeBackup(oversized).error).toContain('2 MB');
      const state = noteState(note + 'x');
      expect(() => BH.bhBuildBeeBackup(state, date)).toThrow('exceeds the 2 MB import limit');
      expect(state.notebook.synthesis).toBe(note + 'x'); expect(state).not.toHaveProperty('motionPaused');
    });
  }

  it('rejects multibyte content over the byte limit even when its character count fits', () => {
    const text = JSON.stringify({ kind: 'alloflow-beehive-backup', schemaVersion: 1, state: noteState('蜂'.repeat(Math.ceil(BH.BEEHIVE_BACKUP_MAX_BYTES / 3))) });
    expect(text.length).toBeLessThan(BH.BEEHIVE_BACKUP_MAX_BYTES);
    expect(Buffer.byteLength(text, 'utf8')).toBeGreaterThan(BH.BEEHIVE_BACKUP_MAX_BYTES);
    expect(BH.bhReadBeeBackup(text).error).toContain('2 MB');
  });

  it('shows a recoverable oversized-export error and blocks oversized upload before reading without changing work', async () => {
    const note = 'x'.repeat(BH.BEEHIVE_BACKUP_MAX_BYTES);
    const priorCreate = URL.createObjectURL, create = vi.fn(); URL.createObjectURL = create;
    try {
      await mounted(noteState(note), async (host, latest) => {
        await act(async () => { host.querySelector('[data-bee-backup-download]').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
        expect(host.querySelector('[data-beehive-backup] [role=alert]').textContent).toContain('exceeds the 2 MB import limit');
        expect(create).not.toHaveBeenCalled();
        expect(latest().beehive.notebook.synthesis).toBe(note);
        const input = host.querySelector('[data-bee-backup-file]');
        const file = new File(['蜂'.repeat(Math.ceil(BH.BEEHIVE_BACKUP_MAX_BYTES / 3))], 'large.json', { type: 'application/json' });
        const read = vi.fn(); file.text = read;
        Object.defineProperty(input, 'files', { configurable: true, value: [file] });
        await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve(); });
        expect(host.querySelector('[data-beehive-backup] [role=alert]').textContent).toContain('no larger than 2 MB');
        expect(read).not.toHaveBeenCalled();
        expect(latest().beehive.notebook.synthesis).toBe(note);
        expect(latest().wave.saved).toBe('Unrelated work');
      });
    } finally { if (priorCreate === undefined) delete URL.createObjectURL; else URL.createObjectURL = priorCreate; }
  });

  it('restores a small backup and undoes it without losing oversized current notes', async () => {
    const note = 'x'.repeat(BH.BEEHIVE_BACKUP_MAX_BYTES);
    const backup = BH.bhBuildBeeBackup({ day: 5, notebook: { synthesis: 'Imported short note.' } }, date);
    await mounted({ day: 9, notebookOpen: true, ...noteState(note) }, async (host, latest) => {
      host.querySelector('[data-beehive-backup]').open = true;
      const input = host.querySelector('[data-bee-backup-file]');
      Object.defineProperty(input, 'files', { configurable: true, value: [{ size: Buffer.byteLength(backup, 'utf8'), text: async () => backup }] });
      await act(async () => { input.dispatchEvent(new Event('change', { bubbles: true })); await Promise.resolve(); await Promise.resolve(); });
      expect(host.querySelector('[data-bee-backup-restore]')).not.toBeNull();
      await act(async () => { host.querySelector('[data-bee-backup-restore]').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
      expect(latest().beehive).toMatchObject({ day: 5, notebook: { synthesis: 'Imported short note.' } });
      expect(host.querySelector('[data-beehive-backup] [role=alert]')).toBeNull();
      expect(host.querySelector('[data-bee-backup-undo]')).not.toBeNull();
      await act(async () => { host.querySelector('[data-bee-backup-undo]').dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
      expect(latest().beehive).toMatchObject({ day: 9, notebook: { synthesis: note } });
      expect(latest().wave.saved).toBe('Unrelated work');
      expect(host.querySelector('[data-beehive-backup] [role=alert]')).toBeNull();
    });
  });
});
