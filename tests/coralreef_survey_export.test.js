import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const SOURCE = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const mounted = [];
let X, downloads, createURL, revokeURL;

beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool(SOURCE, 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef;
  downloads = [];
  const NativeURL = window.URL;
  createURL = vi.fn(() => 'blob:reef-survey-' + createURL.mock.calls.length); revokeURL = vi.fn();
  vi.stubGlobal('URL', class extends NativeURL { static createObjectURL = createURL; static revokeObjectURL = revokeURL; });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
    downloads.push({ href: this.href, filename: this.download, attached: document.body.contains(this), hidden: this.hidden });
  });
});
afterEach(async () => {
  while (mounted.length) await unmount(mounted[mounted.length - 1]);
  delete window.__RR_TEST_EXPORTS__;
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

// Parse the file independently of its encoder, including quoted newlines and
// escaped quotes, so assertions describe the spreadsheet cells a teacher gets.
function csvRows(csv) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = csv.charCodeAt(0) === 0xFEFF ? 1 : 0; i < csv.length; i++) {
    const ch = csv[i];
    if (ch === '"') {
      if (quoted && csv[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
    } else if (!quoted && ch === ',') { row.push(cell); cell = ''; }
    else if (!quoted && (ch === '\r' || ch === '\n')) {
      if (ch === '\r' && csv[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (row.length || cell) { row.push(cell); rows.push(row); }
  expect(quoted, 'CSV must end outside a quoted cell').toBe(false);
  return rows;
}
function csvObjects(csv) {
  const [headers, ...rows] = csvRows(csv);
  expect(new Set(headers).size).toBe(headers.length);
  return rows.map(row => { expect(row).toHaveLength(headers.length); return Object.fromEntries(headers.map((header, i) => [header, row[i]])); });
}
function survey(overrides = {}) {
  return { id: 'reserve:4127:', siteId: 'reserve', seed: 4127, transect: 1, modelYear: null, at: 123,
    recorded: 38, agreement: 36,
    cover: { hard_coral: 25, bleached_coral: 10, recently_dead_coral: 5, macroalgae: 10, rock: 20, rubble: 15, sand: 10 },
    indicators: { liveCoral: 35, bleachedShare: 29, macroalgae: 10, coralToAlgae: 3.5 },
    fish: { parrotfish: 4, surgeonfish: 0, butterflyfish: 2, grouper: 1, snapper: 0 }, ...overrides };
}
async function mount(log = [survey()], extra = {}) {
  let data = { coralReef: { section: 'compare', surveyLog: log, compareNotes: 'My claim stays private.', speciesFieldNotes: { clownfish: 'Keep my note.' }, ...extra } };
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  function Shell() { const [state, setState] = React.useState(data); data = state; return cfg.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key, reduceMotion: true }); }
  const t = { host, root, get data() { return data; } }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell))); return t;
}
async function unmount(t) { await React.act(async () => t.root.unmount()); t.host.remove(); mounted.splice(mounted.indexOf(t), 1); }
const exportButton = t => t.host.querySelector('[data-survey-export] button');
const exportStatus = t => t.host.querySelector('[data-survey-export-status]');
async function click(node) { expect(node).toBeTruthy(); await React.act(async () => { node.focus(); node.click(); }); }
function blobText(blob) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsText(blob); }); }

describe('survey CSV data', () => {
  it('exports one row per transect with the recorded denominator, units, zeros and model provenance', () => {
    const settings = { years: 30, scenarioId: 'custom', runoff: 'low', label: 'Récif, "bleu"\nYear two' };
    const log = [survey(), survey({ id: 'model:0:0', siteId: 'model', seed: 0, transect: 2, modelYear: 0, recorded: 40,
      cover: { hard_coral: 30, bleached_coral: 10, recently_dead_coral: 5, macroalgae: 10, rock: 20, rubble: 15, sand: 10 },
      modelRun: { scenarioId: 'custom', seed: 0, settings } })];
    const before = JSON.stringify(log), csv = X.surveyLogCsv(log, e => e.siteId === 'model' ? 'Récif, "bleu"\nYear zero' : 'Reserve');
    expect(csv.charCodeAt(0)).toBe(0xFEFF); expect(csv.endsWith('\r\n')).toBe(true);
    const [field, modeled] = csvObjects(csv);
    expect(field).toMatchObject({ reef: 'Reserve', site_id: 'reserve', transect: '1', survey_seed: '4127',
      model_year: '', model_scenario: '', model_weather_seed: '', model_settings: '',
      points_recorded: '38', points_total: '40', bottom_points_complete: 'false', points_matching_key: '36', missing_cover_pct: '5',
      live_coral_pct: '35', bleached_share_of_live_pct: '29', hard_coral_pct: '25', bleached_coral_pct: '10',
      recently_dead_coral_pct: '5', macroalgae_pct: '10', rock_pct: '20', rubble_pct: '15', sand_pct: '10',
      parrotfish_per_100_m2: '4', surgeonfish_per_100_m2: '0', butterflyfish_per_100_m2: '2', grouper_per_100_m2: '1', snapper_per_100_m2: '0' });
    expect(modeled).toMatchObject({ reef: 'Récif, "bleu"\nYear zero', model_year: '0', survey_seed: '0', model_weather_seed: '0',
      model_scenario: 'custom', bottom_points_complete: 'true', missing_cover_pct: '0' });
    expect(JSON.parse(modeled.model_settings)).toEqual(settings); expect(JSON.stringify(log)).toBe(before);
  });

  it('leaves absent legacy values blank without turning a measured zero into missing data', () => {
    const legacy = { siteId: 'harbor', transect: 1, cover: { hard_coral: 0 }, fish: { parrotfish: 0 }, indicators: { liveCoral: 0 } };
    const [row] = csvObjects(X.surveyLogCsv([legacy]));
    expect(row).toMatchObject({ reef: 'harbor', survey_seed: '', model_year: '', points_recorded: '', bottom_points_complete: '',
      points_matching_key: '', missing_cover_pct: '', hard_coral_pct: '0', live_coral_pct: '0', bleached_coral_pct: '',
      parrotfish_per_100_m2: '0', surgeonfish_per_100_m2: '', bleached_share_of_live_pct: '' });
    expect(X.surveyLogCsv([legacy])).not.toMatch(/undefined|NaN/);
  });

  it('quotes punctuation and multiline Unicode labels and neutralizes spreadsheet formulas', () => {
    for (const input of ['=1+1', '+SUM(A1:A2)', '-1+2', '@SUM(A1)', ' \t\r\n=HYPERLINK("x")', '\uFEFF+2']) {
      expect(csvRows(X.surveyCsvCell(input) + '\r\n')).toEqual([["'" + input]]);
    }
    expect(csvRows(X.surveyCsvCell('Récif, "bleu"\n珊瑚') + '\r\n')).toEqual([['Récif, "bleu"\n珊瑚']]);
    expect(csvRows(X.surveyCsvCell(0) + ',' + X.surveyCsvCell(null) + ',' + X.surveyCsvCell(false) + '\r\n')).toEqual([['0', '', 'false']]);
    const [row] = csvObjects(X.surveyLogCsv([survey()], () => '=1+1'));
    expect(row.reef).toBe("'=1+1");
  });
});

describe('survey CSV download control', () => {
  it('downloads a real CSV Blob through a native button while retaining focus, feedback and learner data', async () => {
    const t = await mount(), button = exportButton(t), status = exportStatus(t), before = JSON.stringify(t.data);
    expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button'); expect(button.textContent).toBe('Download survey data (CSV)');
    expect(document.getElementById(button.getAttribute('aria-describedby')).textContent).toContain('Percent cover uses all 40 points.');
    expect(status.getAttribute('role')).toBe('status'); expect(status.getAttribute('aria-live')).toBe('polite'); expect(status.getAttribute('aria-atomic')).toBe('true');
    expect(status.textContent).toBe('');
    await click(button);
    expect(downloads).toEqual([{ href: 'blob:reef-survey-1', filename: 'coral-reef-surveys.csv', attached: true, hidden: true }]);
    expect(document.querySelector('a[download]')).toBeNull(); expect(document.activeElement).toBe(button);
    expect(createURL).toHaveBeenCalledTimes(1);
    const blob = createURL.mock.calls[0][0]; expect(blob).toBeInstanceOf(Blob); expect(blob.type).toBe('text/csv;charset=utf-8');
    const text = await blobText(blob), rows = csvObjects(text); expect(rows).toHaveLength(1); expect(rows[0].points_recorded).toBe('38');
    expect(text).not.toContain('My claim stays private.'); expect(text).not.toContain('Keep my note.');
    expect(exportStatus(t)).toBe(status); expect(status.dataset.surveyExportStatus).toBe('saved'); expect(status.textContent).toBe('CSV download started.');
    expect(JSON.stringify(t.data)).toBe(before);
    const firstFeedback = status.firstElementChild; await click(button);
    expect(exportStatus(t)).toBe(status); expect(status.firstElementChild).not.toBe(firstFeedback); expect(document.activeElement).toBe(button);
    expect(JSON.stringify(t.data)).toBe(before);
  });

  it('revokes object URLs after handoff and releases pending downloads on unmount exactly once', async () => {
    const t = await mount(); vi.useFakeTimers();
    await click(exportButton(t)); expect(revokeURL).not.toHaveBeenCalled();
    await React.act(async () => vi.advanceTimersByTime(999)); expect(revokeURL).not.toHaveBeenCalled();
    await React.act(async () => vi.advanceTimersByTime(1)); expect(revokeURL.mock.calls).toEqual([['blob:reef-survey-1']]);
    await click(exportButton(t)); await click(exportButton(t)); await unmount(t);
    expect(revokeURL.mock.calls).toEqual([['blob:reef-survey-1'], ['blob:reef-survey-2'], ['blob:reef-survey-3']]);
    await React.act(async () => vi.advanceTimersByTime(2000)); expect(revokeURL).toHaveBeenCalledTimes(3);
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('cleans a failed anchor handoff and allows retry without losing focus or saved surveys', async () => {
    const t = await mount(), button = exportButton(t), before = JSON.stringify(t.data);
    HTMLAnchorElement.prototype.click.mockImplementationOnce(() => { throw new Error('Download blocked'); });
    await click(button);
    expect(exportStatus(t).dataset.surveyExportStatus).toBe('error'); expect(exportStatus(t).textContent).toContain('your saved surveys are still here');
    expect(document.querySelector('a[download]')).toBeNull(); expect(revokeURL.mock.calls).toEqual([['blob:reef-survey-1']]); expect(downloads).toEqual([]);
    expect(document.activeElement).toBe(button); expect(JSON.stringify(t.data)).toBe(before);
    await click(button); expect(downloads).toHaveLength(1); expect(exportStatus(t).dataset.surveyExportStatus).toBe('saved');
    expect(JSON.stringify(t.data)).toBe(before);
  });

  it('reports missing download support and allocation failures, then succeeds on retry', async () => {
    const t = await mount(), button = exportButton(t), before = JSON.stringify(t.data);
    window.URL.createObjectURL = undefined;
    await click(button); expect(exportStatus(t).dataset.surveyExportStatus).toBe('error'); expect(downloads).toEqual([]);
    window.URL.createObjectURL = createURL; createURL.mockImplementationOnce(() => { throw new Error('Out of resources'); });
    await click(button); expect(exportStatus(t).dataset.surveyExportStatus).toBe('error'); expect(revokeURL).not.toHaveBeenCalled();
    await click(button); expect(exportStatus(t).dataset.surveyExportStatus).toBe('saved'); expect(downloads).toHaveLength(1);
    expect(document.querySelector('a[download]')).toBeNull(); expect(document.activeElement).toBe(button); expect(JSON.stringify(t.data)).toBe(before);
  });

  it('explains incomplete samples where averages are shown and offers export only for a saved log', async () => {
    const incomplete = await mount([survey(), survey({ id: 'reserve:2:', seed: 2, recorded: 40 })]);
    const note = incomplete.host.querySelector('[data-survey-incomplete-note]');
    expect(note.getAttribute('role')).toBe('note'); expect(note.textContent).toContain('Incomplete transects: 1.');
    expect(note.textContent).toContain('These averages include surveys with fewer than 40 recorded points'); expect(note.textContent).toContain('do not show that coral is absent');
    expect(exportButton(incomplete)).toBeTruthy();
    const complete = await mount([survey({ recorded: 40 })]); expect(complete.host.querySelector('[data-survey-incomplete-note]')).toBeNull();
    const empty = await mount([]); expect(exportButton(empty)).toBeNull(); expect(empty.host.textContent).toContain('No surveys saved yet');
  });
});
