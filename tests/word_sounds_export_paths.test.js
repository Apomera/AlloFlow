// Word Sounds downloads: what each export path really writes.
//
// The review of 2026-10-18 found every one of these untested and wrong in a
// way a teacher would notice: the probe CSV kept counting while its results
// screen stayed open, named the file by the UTC date (tomorrow after 8 pm
// Eastern) and freed the download link before the browser used it; the
// Assessment Center screening CSV left every Word Sounds probe's Date blank;
// and voice-pack and recording-set files lost every non-Latin letter of their
// names. These run the real functions sliced from the shipped files.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));

const wsSource = readFileSync('word_sounds_module.js', 'utf8');
const setupSource = readFileSync('word_sounds_setup_source.jsx', 'utf8');
const analyticsSource = readFileSync('student_analytics_module.js', 'utf8');

const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;
let root = null;
let host = null;

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  host?.remove();
  host = null;
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// Records every Blob, object URL and anchor download instead of letting jsdom
// try to navigate.
function captureDownloads() {
  const blobs = [];
  class FakeBlob {
    constructor(parts, options) {
      this.parts = parts;
      this.type = options && options.type;
      blobs.push(this);
    }
  }
  vi.stubGlobal('Blob', FakeBlob);
  const revoked = [];
  let made = 0;
  URL.createObjectURL = vi.fn(() => 'blob:test-' + (++made));
  URL.revokeObjectURL = vi.fn((url) => revoked.push(url));
  const downloads = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() {
    downloads.push({ download: this.download, href: this.href });
  });
  return { blobs, revoked, downloads, text: () => blobs.at(-1).parts.join('') };
}

// A local time whose UTC calendar date is a different day, so a UTC-named
// file is visibly wrong (in a UTC time zone the two cannot differ).
function dateSplittingLocalTime() {
  const offset = new Date(2026, 9, 18, 12, 0).getTimezoneOffset();
  return offset > 0 ? new Date(2026, 9, 18, 23, 30) : new Date(2026, 9, 18, 0, 30);
}
const pad = (n) => String(n).padStart(2, '0');
const localStamp = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const csvRows = (text) => text.split('\r\n').map((line) => line.split(','));

describe('the probe results CSV', () => {
  const renderSlice = sliceBetween(wsSource, 'const renderProbeResults = () => {', 'React.useEffect(', { label: 'probe results renderer' });
  const countHelpers = sliceBetween(wsSource, '// BEGIN WORD SOUNDS COUNT RESULTS', '// END WORD SOUNDS COUNT RESULTS');
  const Results = new Function('React', countHelpers + '\nreturn WordSoundsCountResults;')(React);
  const makeRenderer = new Function('React', 'WordSoundsCountResults', 'bindings', `
    const { probeStartTimeRef, probeEndTimeRef, wordSoundsScore, learnerScopedHistory, effectiveProbeGrade,
      effectiveProbeForm, wordSoundsActivity, probeResultsDialogRef, handleDialogKeyDown, t, ts, probeHiddenMs,
      PROBE_INTERRUPTION_MS, sessionWordResults, isTeacherMode, isParentMode, emitProbeComplete,
      resetRuntimeSession, onClose } = bindings;
    ${renderSlice}
    return renderProbeResults;
  `);

  function openResults(startedAt, overrides = {}) {
    const bindings = {
      probeStartTimeRef: { current: startedAt }, probeEndTimeRef: { current: null },
      wordSoundsScore: { correct: 8, total: 10 }, learnerScopedHistory: [], effectiveProbeGrade: 'K',
      effectiveProbeForm: 'A', wordSoundsActivity: 'segmentation', probeResultsDialogRef: { current: null },
      handleDialogKeyDown() {}, t: (key) => key, ts: () => '', probeHiddenMs: () => 0, PROBE_INTERRUPTION_MS: 2000,
      sessionWordResults: { current: [] }, isTeacherMode: true, isParentMode: false,
      emitProbeComplete: vi.fn(), resetRuntimeSession: vi.fn(), onClose: vi.fn(), ...overrides,
    };
    const renderProbeResults = makeRenderer(React, Results, bindings);
    const Screen = ({ tick }) => React.createElement('div', { 'data-tick': tick }, renderProbeResults());
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(React.createElement(Screen, { tick: 0 })));
    return {
      bindings,
      rerender: (tick) => act(() => root.render(React.createElement(Screen, { tick }))),
      download: () => {
        const button = [...host.querySelectorAll('button')].find((b) => b.textContent.includes('Download CSV'));
        expect(button, 'the probe results screen offers Download CSV').toBeTruthy();
        act(() => button.click());
      },
    };
  }

  it('stops the clock when the results screen opens, so a later download matches the probe', () => {
    vi.useFakeTimers();
    const shownAt = dateSplittingLocalTime();
    vi.setSystemTime(shownAt);
    const io = captureDownloads();
    const screen = openResults(shownAt.getTime() - 120000);
    // The teacher reads the screen for ten minutes; it re-renders meanwhile.
    vi.setSystemTime(shownAt.getTime() + 600000);
    screen.rerender(1);
    screen.download();
    const [head, row] = csvRows(io.text().slice(1));
    const col = (name) => row[head.indexOf(name)];
    expect(col('Duration (s)'), 'duration must be the probe, not the probe plus the results screen').toBe('120');
    expect(col('Items/Min'), '8 correct in 2 minutes').toBe('4');
    expect(col('Date')).toBe(shownAt.toLocaleDateString());
    expect(screen.bindings.probeEndTimeRef.current).toBe(shownAt.getTime());
  });

  it('names the file by the local date and time and carries the form and interruption', () => {
    vi.useFakeTimers();
    const shownAt = dateSplittingLocalTime();
    vi.setSystemTime(shownAt);
    const io = captureDownloads();
    openResults(shownAt.getTime() - 60000, { probeHiddenMs: () => 2500 }).download();
    const name = io.downloads.at(-1).download;
    expect(name).toBe(`Probe_K_segmentation_A_${localStamp(shownAt)}_${pad(shownAt.getHours())}${pad(shownAt.getMinutes())}.csv`);
    const text = io.text();
    expect(text.charCodeAt(0), 'a byte-order mark so Excel opens it as UTF-8').toBe(0xfeff);
    const [head, row] = csvRows(text.slice(1));
    expect(head.slice(-2)).toEqual(['Form', 'Interrupted']);
    expect(row.slice(-2)).toEqual(['A', 'yes']);
  });

  it('keeps the download link alive past the click', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 18, 10, 0));
    const io = captureDownloads();
    openResults(Date.now() - 60000).download();
    expect(io.revoked, 'revoking in the same tick can cancel the download').toEqual([]);
    vi.advanceTimersByTime(1000);
    expect(io.revoked).toEqual(['blob:test-1']);
  });

  it('quotes cells that need it and defuses spreadsheet formulas', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 18, 10, 0));
    const io = captureDownloads();
    openResults(Date.now() - 60000, { effectiveProbeForm: '=HYPERLINK("x"),B' }).download();
    const text = io.text();
    expect(text.includes(`"'=HYPERLINK(""x""),B"`), text).toBe(true);
  });
});

describe('the probe payload sent on Finish', () => {
  const payloadSlice = sliceBetween(wsSource, 'const buildProbePayload = (score, extraEntry = null) => {', 'const emitProbeComplete', { label: 'probe payload' });
  const build = (bindings) => new Function('bindings', `
    const { probeStartTimeRef, probeEndTimeRef, probeHiddenMs, wordSoundsActivity, effectiveProbeGrade,
      effectiveProbeForm, effectiveProbeFormId, sessionWordResults, runtimeSessionConfig, historyLearnerId,
      activeHistorySessionIdRef, historyResourceId, sessionConfigVersion, isFixedForm, probeItemGoal,
      PROBE_INTERRUPTION_MS, computeProbeByBand } = bindings;
    ${payloadSlice}
    return buildProbePayload;
  `)(bindings);
  const bindings = (start, end) => ({
    probeStartTimeRef: { current: start }, probeEndTimeRef: { current: end }, probeHiddenMs: () => 0,
    wordSoundsActivity: 'segmentation', effectiveProbeGrade: 'K', effectiveProbeForm: 'A', effectiveProbeFormId: null,
    sessionWordResults: { current: [] }, runtimeSessionConfig: {}, historyLearnerId: null,
    activeHistorySessionIdRef: { current: null }, historyResourceId: null, sessionConfigVersion: 1,
    isFixedForm: false, probeItemGoal: 10, PROBE_INTERRUPTION_MS: 2000, computeProbeByBand: () => null,
  });

  it('times the probe to when its results screen opened', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 18, 10, 10));
    const start = new Date(2026, 9, 18, 10, 0).getTime();
    const payload = build(bindings(start, start + 120000))({ correct: 8, total: 10 });
    expect(payload.elapsed).toBe(120);
    expect(payload.itemsPerMin).toBe(4);
  });

  it('still times a probe that ends on its last answer (no results screen)', () => {
    vi.useFakeTimers();
    const start = new Date(2026, 9, 18, 10, 0).getTime();
    vi.setSystemTime(start + 90000);
    expect(build(bindings(start, null))({ correct: 3, total: 3 }).elapsed).toBe(90);
  });
});

describe('the Assessment Center screening CSV', () => {
  const exportSlice = sliceBetween(analyticsSource, 'const exportScreeningCSV = () => {', 'const generateRTICSV', { label: 'screening CSV' });
  // The export writes through the module's shared CSV helpers (quoting and the download).
  const csvHelpers = sliceBetween(analyticsSource, 'function _acCsvCell(value) {', 'function _acRestoreIdentityLinks(raw) {', { label: 'CSV helpers' });
  const run = (importedStudents) => {
    const addToast = vi.fn();
    new Function('importedStudents', 'addToast', 't', `${csvHelpers}\n${exportSlice}\nexportScreeningCSV();`)(importedStudents, addToast, (key) => key);
    return addToast;
  };

  it('dates Word Sounds probes, which carry `date` rather than `timestamp`', () => {
    vi.useFakeTimers();
    const shownAt = dateSplittingLocalTime();
    vi.setSystemTime(shownAt);
    const io = captureDownloads();
    const probeDate = new Date(2026, 9, 14, 9, 15);
    run([{ name: 'Ana', screeningHistory: [
      { date: probeDate.toISOString(), grade: 'K', form: 'A', activity: 'segmentation', correct: 8, total: 10, accuracy: 80, itemsPerMin: 4 },
      { timestamp: probeDate.getTime(), grade: 'K', activity: 'orf', correct: 30, total: 32, accuracy: 94, itemsPerMin: 30 },
    ] }]);
    const lines = io.text().split('\n');
    expect(lines[1].split('","')[3], 'Word Sounds probe Date column').toBe(probeDate.toLocaleDateString());
    expect(lines[2].split('","')[3], 'a timestamped record keeps its date').toBe(probeDate.toLocaleDateString());
    expect(io.downloads.at(-1).download).toBe(`screening_results_${localStamp(shownAt)}.csv`);
    expect(io.revoked).toEqual([]);
    // _acDownloadCsv frees the file's URL 1.5 s after the download starts.
    vi.advanceTimersByTime(1500);
    expect(io.revoked).toEqual(['blob:test-1']);
  });
});

describe('recording set and voice pack file names', () => {
  it('keeps the language and every letter of a recording set word', () => {
    const slice = sliceBetween(wsSource, 'const downloadSet = () => {', 'const importSet = async file => {', { label: 'recording set download' });
    const io = captureDownloads();
    vi.useFakeTimers();
    const names = [];
    for (const [word, languageKey] of [['мама', 'ru'], ['مرحبا', 'ar'], ['niño', 'es'], ['cat', 'en']]) {
      const library = { exportSet: () => '{}', identity: () => ({ targetWord: word, languageKey }) };
      // errorText/tr: the editor's translated-status helpers, defined outside this slice.
      new Function('library', 'board', 'word', 'language', 'setLibraryStatus', 'errorText', 'tr', `${slice}\ndownloadSet();`)(library, [], word, languageKey, () => {}, (e) => String((e && e.message) || ''), (k, en) => en);
      names.push(io.downloads.at(-1).download);
    }
    expect(names).toEqual(['syllables-ru-мама.json', 'syllables-ar-مرحبا.json', 'syllables-es-niño.json', 'syllables-en-cat.json']);
  });

  it('names a voice pack in any script and frees its link after the download', () => {
    const slice = sliceBetween(setupSource, 'const exportPack = () => {', 'const importPack = (ev) => {', { label: 'voice pack export' });
    const T = (key, fallback, params) => {
      let text = fallback;
      Object.keys(params || {}).forEach((p) => { text = text.split('{' + p + '}').join(params[p]); });
      return text;
    };
    const exportWith = (pack, isStudent) => {
      const status = vi.fn();
      new Function('pack', 'kind', 'isStudent', 'T', 'setStatus', `${slice}\nexportPack();`)(pack, isStudent ? 'student-voice' : 'teacher-model', isStudent, T, status);
      return status;
    };
    vi.useFakeTimers();
    const io = captureDownloads();
    exportWith({ name: 'Голос мамы', clips: {} }, false);
    expect(io.downloads.at(-1).download).toBe('phoneme_pack_Голос_мамы.json');
    expect(io.revoked).toEqual([]);
    vi.advanceTimersByTime(1000);
    expect(io.revoked).toEqual(['blob:test-1']);
    exportWith({ name: 'صوت سارة', clips: {}, studentName: 'Sara' }, true);
    expect(io.downloads.at(-1).download).toBe('phoneme_pack_CONFIDENTIAL_صوت_سارة.json');
    exportWith({ name: '***', clips: {} }, false);
    expect(io.downloads.at(-1).download, 'a name with no letters still gets a usable file name').toBe('phoneme_pack_voice.json');
  });
});
