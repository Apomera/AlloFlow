import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const MODES = [
  { id: 'brightness', starts: [16, 240, 109], values: [121, 134, 146], reference: 136, controls: { target: 136, contrast: 63 }, choices: ['Left', 'Same', 'Right'], source: 'https://michaelbach.de/ot/lum-inducedBrightness/index.html' },
  { id: 'ebbinghaus', starts: [32, 72, 51], values: [44, 50, 53], reference: 48, controls: { surround: 42, gap: 19 }, choices: ['Left', 'Same', 'Right'], source: 'https://michaelbach.de/ot/cog-Ebbinghaus/index.html' },
  { id: 'mullerLyer', starts: [250, 550, 411], values: [380, 410, 425], reference: 400, controls: { angle: 55, fin: 61 }, choices: ['Top', 'Same', 'Bottom'], source: 'https://michaelbach.de/ot/sze-muelue/index.html' },
];
const DATES = ['2026-10-04T12:00:00.000Z', '2026-10-04T12:01:00.000Z', '2026-10-04T12:02:00.000Z'];
const FULL_NOTE = ('A full saved note\n<script>window.reportAttack=1</script><img src="https://example.invalid/track" onerror="alert(1)"><svg onload="alert(2)">literal & < > " \'</svg>\n' + 'Learner observations stay intact. '.repeat(20)).slice(0, 500);
let engine, config, host, root, latest, latestAll, externalState, changeProfile, announce, writes;

function group(id, experiment = 'brightness', changes = {}) {
  const mode = MODES.find(item => item.id === experiment);
  return engine.normalize({ studies: mode.values.map((matchValue, index) => ({
    id: id + '-record-' + (index + 1), experiment, date: DATES[index],
    model: { matching: true, reveal: true, swap: true, ...mode.controls, matchValue, prediction: mode.choices[index], note: index === 2 ? FULL_NOTE : 'Saved trial ' + (index + 1) + ' note', ...changes },
    repeat: { id, trial: index + 1, startValue: mode.starts[index] },
  })) }).studies;
}
function seed(studies = []) {
  return engine.normalize({
    experiment: 'moire', studies, expanded: true,
    models: { moire: { angle: 13.2, spacing: 18, prediction: 'Both', note: 'PRIVATE CURRENT DRAFT' } },
    comparison: { experiment: 'necker', model: { depth: 75, cue: 'front', note: 'PRIVATE PINNED VIEW' } },
  });
}
const plan = (state, first = 'study', second) => engine.planStudyReport(state, first, second);
function expectBlocked(result, status) { expect(result).toEqual({ status, studies: [], comparison: null }); }
function expectedStudy(members) {
  const sorted = members.slice().sort((a, b) => a.repeat.trial - b.repeat.trial);
  return { id: sorted[0].repeat.id, experiment: sorted[0].experiment, base: sorted[0].model, revealed: true, trials: sorted.map(record => ({ id: record.id, trial: record.repeat.trial, startValue: record.repeat.startValue, model: record.model, date: record.date })) };
}
const signed = value => { const rounded = Number(value.toFixed(2)); return (rounded > 0 ? '+' : '') + rounded; };
const tableRows = table => [...table.querySelectorAll('tbody tr')].map(row => [...row.children].map(cell => cell.textContent));
function targetValue(svg, experiment) {
  const target = svg.querySelector('[data-perception-target="right"]'); expect(target).toBeTruthy();
  if (experiment === 'brightness') return Number(target.getAttribute('fill').match(/^rgb\((\d+),/)[1]);
  if (experiment === 'ebbinghaus') return Number(target.getAttribute('r')) * 2;
  return Number(target.getAttribute('x2')) - Number(target.getAttribute('x1'));
}
async function mount(value = seed(), { strict = false, translate } = {}) {
  writes = 0;
  function Harness() {
    const [data, setData] = React.useState({ perceptionLab: value, otherTool: { preserved: 37 } });
    const [profile, setProfile] = React.useState('study-report-learner');
    latest = engine.normalize(data.perceptionLab); latestAll = data; changeProfile = setProfile;
    externalState = update => setData(previous => ({ ...previous, perceptionLab: typeof update === 'function' ? update(previous.perceptionLab) : update }));
    return config.render(makeCtx({ toolData: data, setToolData: update => { writes++; setData(update); }, activeProfileId: profile, announceToSR: announce, ...(translate ? { t: translate } : {}) }));
  }
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  const content = React.createElement(Harness);
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, content) : content));
}
function button(label, scope = host) {
  const found = [...scope.querySelectorAll('button')].find(node => (node.getAttribute('aria-label') || node.textContent).trim() === label);
  expect(found, label).toBeTruthy(); return found;
}
const click = async (label, scope = host) => act(async () => button(label, scope).click());
const row = id => [...host.querySelectorAll('[data-perception-study]')].find(node => node.dataset.perceptionStudy === id);
const reportButton = slot => host.querySelector('[data-perception-report-slot="' + slot + '"]');
const comparisonButton = () => host.querySelector('[data-perception-report-comparison]');
async function input(node, value) {
  expect(node).toBeTruthy(); const select = node instanceof HTMLSelectElement;
  const prototype = select ? HTMLSelectElement.prototype : node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event(select ? 'change' : 'input', { bubbles: true }));
  });
}
async function review(id) { await click('Review study', row(id + '-record-1')); }
async function compare(id) { await input(host.querySelector('[data-perception-study-selector]'), id); }
function installDownloads() {
  const create = vi.fn(() => 'blob:perception-study-report'), revoke = vi.fn(), downloads = [];
  vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
  const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { downloads.push({ filename: this.download, href: this.href }); });
  const NativeBlob = globalThis.Blob;
  const blob = vi.spyOn(globalThis, 'Blob').mockImplementation(function (parts, options) { return new NativeBlob(parts, options); });
  return { create, revoke, downloads, anchorClick, blob };
}
function downloadedDocument(downloads) {
  expect(downloads.create).toHaveBeenCalledOnce(); expect(downloads.blob).toHaveBeenCalledOnce();
  const [parts, options] = downloads.blob.mock.calls[0];
  expect(options.type).toBe('text/html;charset=utf-8'); expect(downloads.create.mock.calls[0][0].type).toBe('text/html;charset=utf-8');
  const markup = parts.join(''); expect(markup).toMatch(/^<!doctype html>/i);
  return { markup, document: new DOMParser().parseFromString(markup, 'text/html') };
}
function expectSafeDocument(report, drawingCount) {
  const { document: doc } = report;
  expect(doc.title.trim()).not.toBe(''); expect(doc.documentElement.lang).not.toBe('');
  expect(doc.querySelector('meta[charset]').getAttribute('charset').toLowerCase()).toBe('utf-8');
  const csp = [...doc.querySelectorAll('meta[http-equiv]')].find(node => node.getAttribute('http-equiv').toLowerCase() === 'content-security-policy');
  expect(csp).toBeTruthy(); expect(csp.getAttribute('content')).toMatch(/default-src\s+'none'/);
  expect(csp.getAttribute('content')).toMatch(/style-src\s+'unsafe-inline'/);
  expect(doc.querySelector('script,iframe,object,embed,link,base,form,img,video,audio,canvas')).toBeNull();
  expect(doc.querySelector('meta[http-equiv="refresh"]')).toBeNull();
  for (const node of doc.querySelectorAll('*')) for (const attribute of node.attributes) {
    expect(attribute.name).not.toMatch(/^on/i);
    expect(attribute.name).not.toMatch(/^(?:src|srcset|action|formaction|poster)$/i);
    if (/href$/i.test(attribute.name)) {
      expect(attribute.value).not.toMatch(/^(?:javascript:|data:)/i);
      if (node.tagName.toLowerCase() !== 'a') expect(attribute.value).not.toMatch(/^(?:https?:|\/\/)/i);
    }
  }
  const css = [...doc.querySelectorAll('style')].map(node => node.textContent).join('\n');
  expect(css).toMatch(/@media\s+print/); expect(css).not.toMatch(/@import|url\s*\(/i);
  const anchors = [...doc.querySelectorAll('a[href]')]; expect(anchors).toHaveLength(1);
  expect(MODES.map(mode => mode.source)).toContain(anchors[0].getAttribute('href'));
  expect(anchors[0].closest('footer')).toBeTruthy(); expect(anchors[0].getAttribute('rel')).toBe('noopener noreferrer');
  expect(doc.querySelectorAll('[data-perception-report-drawing]')).toHaveLength(drawingCount);
  const ids = [...doc.querySelectorAll('[id]')].map(node => node.id); expect(new Set(ids).size).toBe(ids.length);
  for (const svg of doc.querySelectorAll('[data-perception-report-drawing]')) {
    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg'); expect(svg.getAttribute('viewBox')).toBe('0 0 800 480');
    expect(svg.getAttribute('role')).toBe('img'); expect(svg.querySelectorAll('[data-perception-guide]').length).toBeGreaterThan(0);
    const refs = (svg.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean); expect(refs).toHaveLength(2);
    expect(refs).toEqual([svg.querySelector('title').id, svg.querySelector('desc').id]);
    refs.forEach(id => { expect(doc.getElementById(id)).toBeTruthy(); });
  }
  expect(doc.body.textContent).not.toContain('PRIVATE CURRENT DRAFT'); expect(doc.body.textContent).not.toContain('PRIVATE PINNED VIEW');
}
function expectStudyDrawings(section, mode, members) {
  expect(section).toBeTruthy(); const drawings = [...section.querySelectorAll('[data-perception-report-drawing]')];
  expect(section.ownerDocument.querySelector('footer a').getAttribute('href')).toBe(mode.source);
  expect(drawings.map(svg => svg.dataset.perceptionReportDrawing)).toEqual(['1', '2', '3']);
  drawings.forEach((svg, index) => {
    expect(targetValue(svg, mode.id)).toBe(members[index].model.matchValue);
    const reference = svg.querySelector('[data-perception-target="left"]');
    if (mode.id === 'brightness') expect(reference.getAttribute('fill')).toBe('rgb(' + mode.reference + ',' + mode.reference + ',' + mode.reference + ')');
    else if (mode.id === 'ebbinghaus') expect(Number(reference.getAttribute('r')) * 2).toBe(mode.reference);
    else expect(Number(reference.getAttribute('x2')) - Number(reference.getAttribute('x1'))).toBe(mode.reference);
    expect(section.textContent).toContain(members[index].model.prediction);
    expect(section.textContent).toContain(members[index].model.note);
    const card = section.querySelector('[data-perception-report-trial="' + (index + 1) + '"]');
    expect(card.querySelector('[data-perception-report-values="' + (index + 1) + '"]')).toBeTruthy();
    expect(card.querySelector('[data-perception-report-note="' + (index + 1) + '"]').textContent).toBe('Observation note: ' + members[index].model.note);
  });
  const dates = [...section.querySelectorAll('time')].map(node => node.getAttribute('datetime'));
  DATES.forEach(date => expect(dates).toContain(date));
  expect(tableRows(section.querySelector('[data-perception-report-matches]'))).toEqual(members.map((record, index) => [String(index + 1), String(record.repeat.startValue), String(record.model.matchValue), signed(record.model.matchValue - mode.reference)]));
  const values = members.map(record => record.model.matchValue).sort((a, b) => a - b), median = values[1], unit = mode.id === 'brightness' ? 'RGB-code steps' : 'units';
  const summary = [...section.querySelectorAll('[data-perception-report-summary] > div')].map(item => [item.querySelector('dt').textContent, item.querySelector('dd').textContent]);
  expect(summary).toEqual([
    ['Median match', median + ' ' + unit], ['Match range', values[0] + '–' + values[2] + ' (' + (values[2] - values[0]) + ' ' + unit + ')'],
    ['Median difference', signed(median - mode.reference) + ' ' + unit + (mode.id === 'brightness' ? '' : ' (' + signed((median - mode.reference) / mode.reference * 100) + '%)')],
  ]);
  const settings = tableRows(section.querySelector('[data-perception-report-settings]'));
  const controls = mode.id === 'brightness' ? [['Background difference', '63%'], ['Center gray value', '136 RGB']] : mode.id === 'ebbinghaus' ? [['Large surrounding radius', '42 units'], ['Gap around center', '19 units']] : [['Fin angle', '55°'], ['Fin length', '61 units']];
  expect(settings).toEqual([...controls, ['Surroundings', members[0].model.context ? 'Visible' : 'Removed'], ['Surrounding order', members[0].model.swap ? 'Swapped' : 'Original']]);
}
function expectNoWorkspaceWrite(baseline, beforeWrites) {
  expect(latest).toEqual(baseline); expect(writes).toBe(beforeWrites); expect(latestAll.otherTool).toEqual({ preserved: 37 });
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab(); config = loadTool('stem_lab/stem_tool_perception.js', 'perceptionLab'); engine = window.StemLab.PerceptionEngine; announce = vi.fn();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1); vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); host?.remove(); root = host = null;
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('Perception portable study report plan', () => {
  it.each([['undefined', undefined], ['null', null], ['empty', {}], ['empty notebook', { studies: [] }]])('withholds all report data for a missing group in %s input', (_, state) => {
    expectBlocked(plan(state), 'incomplete');
  });

  it.each([1, 2])('requires all three retained records when only %s remain', count => {
    expectBlocked(plan(seed(group('study').slice(0, count))), 'incomplete');
  });

  it.each([
    ['duplicate trial', members => { members[2].repeat.trial = 2; }],
    ['different surroundings', members => { members[2].model.contrast = 22; }],
    ['different reference', members => { members[2].model.target = 144; }],
    ['different context', members => { members[2].model.context = false; }],
    ['different order', members => { members[2].model.swap = false; }],
    ['missing impression', members => { members[2].model.prediction = ''; }],
    ['mixed experiments', members => { members[2] = group('study', 'ebbinghaus')[2]; }],
    ['extra retained member', members => { members.push({ ...structuredClone(members[0]), id: 'extra-record' }); }],
  ])('returns a private conflict result for %s', (_, alter) => {
    const members = group('study'); alter(members); const state = seed(members), baseline = structuredClone(state);
    expectBlocked(plan(state), 'conflict'); expect(state).toEqual(baseline);
  });

  it.each([
    ['all hidden', [false, false, false]], ['first revealed', [true, false, false]], ['last hidden', [true, true, false]], ['first hidden', [false, true, true]],
  ])('withholds model and summary data for %s', (_, reveals) => {
    const members = group('study'); reveals.forEach((value, index) => { members[index].model.reveal = value; });
    expectBlocked(plan(seed(members)), 'hidden');
  });

  it.each(MODES)('returns a detached complete $id study in actual trial order', mode => {
    const members = group('study', mode.id), state = seed([members[2], members[0], members[1]]), baseline = structuredClone(state);
    const result = plan(state);
    expect(result).toEqual({ status: 'ready', studies: [{ groupId: 'study', study: expectedStudy(members) }], comparison: null });
    expect(result.studies[0].study.trials.map(trial => trial.model.matchValue)).toEqual(mode.values);
    result.studies[0].study.base.note = 'mutated report base'; result.studies[0].study.trials[2].model.note = 'mutated report trial';
    result.studies[0].study.trials[0].startValue = 0;
    expect(state).toEqual(baseline); expect(plan(state).studies[0].study.trials[2].model.note).toBe(FULL_NOTE);
  });

  it.each([['omitted', undefined], ['empty', ''], ['whitespace', '   '], ['nontext', 17]])('treats a %s second ID as a single report and trims the first ID', (_, second) => {
    const result = plan(seed(group('study')), '  study  ', second);
    expect(result.status).toBe('ready'); expect(result.studies.map(item => item.groupId)).toEqual(['study']); expect(result.comparison).toBeNull();
  });

  it('bounds incoming group identifiers to the same normalized 96-character identity', () => {
    const id = 's'.repeat(96); expect(plan(seed(group(id)), id + 'extra').studies[0].groupId).toBe(id);
  });

  it.each([
    ['same group', 'a', 'a', () => [...group('a'), ...group('b')], 'same'],
    ['unknown first', 'missing', 'b', () => [...group('a'), ...group('b')], 'incomplete'],
    ['unknown second', 'a', 'missing', () => [...group('a'), ...group('b')], 'incomplete'],
    ['partial first', 'a', 'b', () => [...group('a').slice(0, 2), ...group('b')], 'incomplete'],
    ['partial second', 'a', 'b', () => [...group('a'), ...group('b').slice(0, 2)], 'incomplete'],
    ['hidden first', 'a', 'b', () => [...group('a', 'brightness', { reveal: false }), ...group('b')], 'hidden'],
    ['hidden second', 'a', 'b', () => [...group('a'), ...group('b', 'brightness', { reveal: false })], 'hidden'],
    ['different experiments', 'a', 'b', () => [...group('a'), ...group('b', 'ebbinghaus')], 'experiment'],
    ['different fixed references', 'a', 'b', () => [...group('a'), ...group('b', 'brightness', { target: 144 })], 'reference'],
    ['conflicted second', 'a', 'b', () => { const b = group('b'); b[2].repeat.trial = 2; return [...group('a'), ...b]; }, 'conflict'],
  ])('preserves the exact pair gate for %s without leaking either study', (_, first, second, build, status) => {
    const state = seed(build()), baseline = structuredClone(state);
    expectBlocked(plan(state, first, second), status); expect(state).toEqual(baseline);
  });

  it.each(MODES)('returns separate $id snapshots and the actual A/B comparison without pooling their matches', mode => {
    const a = group('a', mode.id), b = group('b', mode.id);
    b.forEach((record, index) => { record.model.matchValue += mode.id === 'brightness' ? 19 : mode.id === 'ebbinghaus' ? 4 : 20; record.model.note = 'B saved note ' + (index + 1); });
    const state = seed([...a, ...b]), baseline = structuredClone(state), result = plan(state, ' a ', ' b ');
    expect(result.status).toBe('ready'); expect(result.studies).toEqual([{ groupId: 'a', study: expectedStudy(a) }, { groupId: 'b', study: expectedStudy(b) }]);
    expect(result.comparison).toEqual(engine.compareStudies(state, 'a', 'b'));
    expect(result.comparison.summaryA.values).toEqual(a.map(record => record.model.matchValue));
    expect(result.comparison.summaryB.values).toEqual(b.map(record => record.model.matchValue));
    expect(result.comparison.medianShift).toBe(mode.id === 'brightness' ? 19 : mode.id === 'ebbinghaus' ? 4 : 20);
    result.comparison.summaryA.values[0] = 999; result.studies[1].study.trials[0].model.note = 'mutated report';
    expect(state).toEqual(baseline);
  });
});

describe('Perception portable HTML report downloads', () => {
  it.each(MODES)('exports every actual $id saved trial and its full metadata as a self-contained HTML file', async mode => {
    const members = group('study', mode.id); await mount(seed(members)); await review('study');
    const downloads = installDownloads(), baseline = structuredClone(latest), beforeWrites = writes;
    const control = reportButton('review'); expect(control.textContent).toBe('Export study report');
    expect(control.dataset.perceptionReportStudy).toBe('study');
    await act(async () => control.click());
    const report = downloadedDocument(downloads); expectSafeDocument(report, 3);
    expect([...report.document.querySelectorAll('[data-perception-report-section]')].map(node => node.dataset.perceptionReportSection)).toEqual(['study']);
    expectStudyDrawings(report.document.querySelector('[data-perception-report-section="study"]'), mode, members);
    expect(downloads.downloads).toEqual([{ filename: 'perception-study-' + mode.id + '.html', href: 'blob:perception-study-report' }]);
    expect(document.querySelector('a[download$=".html"]')).toBeNull();
    expectNoWorkspaceWrite(baseline, beforeWrites);
  });

  it('escapes a full 500-character saved note as literal text without creating executable or network elements', async () => {
    expect(FULL_NOTE).toHaveLength(500);
    await mount(seed(group('study'))); await review('study'); const downloads = installDownloads();
    await act(async () => reportButton('review').click());
    const report = downloadedDocument(downloads); expectSafeDocument(report, 3);
    expect(report.document.body.textContent).toContain(FULL_NOTE);
    expect(report.document.querySelector('script,img,svg[onload]')).toBeNull();
    expect(report.markup).toContain('&lt;script&gt;'); expect(report.markup).not.toContain('<script>window.reportAttack');
    expect(window.reportAttack).toBeUndefined();
  });

  it('exports three actual matches with full guides independently of the selected preview trial and hidden preview guides', async () => {
    await mount(seed(group('study'))); await review('study');
    await input(host.querySelector('[data-perception-preview-trial="review"]'), 3);
    await act(async () => host.querySelector('[data-perception-preview-guides="review"]').click());
    await input(host.querySelector('[data-perception-notebook-view]'), 'studies');
    await input(host.querySelector('[data-perception-notebook-search]'), 'no matching study');
    const downloads = installDownloads(), baseline = structuredClone(latest), beforeWrites = writes;
    await act(async () => reportButton('review').click());
    const report = downloadedDocument(downloads); expectSafeDocument(report, 3);
    expectStudyDrawings(report.document.querySelector('[data-perception-report-section="study"]'), MODES[0], latest.studies);
    expect(host.querySelector('[data-perception-preview-trial="review"]').value).toBe('3');
    expect(host.querySelector('[data-perception-preview-guides="review"]').getAttribute('aria-pressed')).toBe('false');
    expect(host.querySelector('[data-perception-notebook-search]').value).toBe('no matching study');
    expect(host.querySelector('[data-perception-notebook-view]').value).toBe('studies');
    expectNoWorkspaceWrite(baseline, beforeWrites);
  });

  it.each([
    ['hidden', members => members.forEach(record => { record.model.reveal = false; })],
    ['mixed reveal', members => { members[2].model.reveal = false; }],
    ['partial', members => members.pop()],
    ['conflict', members => { members[2].repeat.trial = 2; }],
  ])('offers no study export control for a %s group', async (_, alter) => {
    const members = group('study'); alter(members); await mount(seed(members)); await review('study');
    expect(reportButton('review')).toBeNull(); expect(host.querySelector('[data-perception-report-study]')).toBeNull();
    expect(comparisonButton()).toBeNull();
  });

  it('adds the single-report action only after an explicit saved-study reveal', async () => {
    await mount(seed(group('study', 'brightness', { reveal: false }))); await review('study');
    expect(reportButton('review')).toBeNull(); await click('Reveal saved study');
    const downloads = installDownloads(); await act(async () => reportButton('review').click());
    expectSafeDocument(downloadedDocument(downloads), 3);
  });

  it.each(MODES)('exports separate A and B $id sections with all six actual drawings and native geometry', async mode => {
    const a = group('a', mode.id), b = group('b', mode.id);
    b.forEach((record, index) => { record.model.matchValue += mode.id === 'brightness' ? 19 : mode.id === 'ebbinghaus' ? 4 : 20; record.model.note = 'B saved trial ' + (index + 1); });
    await mount(seed([...a, ...b]), { strict: true }); await review('a'); await compare('b');
    await input(host.querySelector('[data-perception-preview-trial="a"]'), 3);
    await input(host.querySelector('[data-perception-preview-trial="b"]'), 2);
    await act(async () => host.querySelector('[data-perception-preview-guides="b"]').click());
    const downloads = installDownloads(), baseline = structuredClone(latest), beforeWrites = writes;
    expect(comparisonButton().textContent).toBe('Export comparison report');
    await act(async () => comparisonButton().click());
    const report = downloadedDocument(downloads); expectSafeDocument(report, 6);
    expect([...report.document.querySelectorAll('[data-perception-report-section]')].map(node => node.dataset.perceptionReportSection)).toEqual(['a', 'b']);
    expectStudyDrawings(report.document.querySelector('[data-perception-report-section="a"]'), mode, a);
    expectStudyDrawings(report.document.querySelector('[data-perception-report-section="b"]'), mode, b);
    expect(downloads.downloads).toEqual([{ filename: 'perception-comparison-' + mode.id + '.html', href: 'blob:perception-study-report' }]);
    expect(host.querySelector('[data-perception-preview-trial="a"]').value).toBe('3');
    expect(host.querySelector('[data-perception-preview-trial="b"]').value).toBe('2');
    expect(host.querySelector('[data-perception-preview-guides="b"]').getAttribute('aria-pressed')).toBe('false');
    expectNoWorkspaceWrite(baseline, beforeWrites);
  });

  it('withholds the comparison action until both complete studies are explicitly revealed', async () => {
    await mount(seed([...group('a', 'brightness', { reveal: false }), ...group('b', 'brightness', { reveal: false, contrast: 28 })]));
    await review('a'); await compare('b'); expect(comparisonButton()).toBeNull(); expect(reportButton('review')).toBeNull();
    await click('Reveal saved study'); expect(reportButton('review')).toBeTruthy(); expect(comparisonButton()).toBeNull();
    await click('Reveal comparison study'); expect(comparisonButton()).toBeTruthy();
    const downloads = installDownloads(); await act(async () => comparisonButton().click());
    expectSafeDocument(downloadedDocument(downloads), 6);
  });

  it.each([
    ['partial study', () => group('b').slice(0, 2)],
    ['conflicted study', () => { const members = group('b'); members[2].repeat.trial = 2; return members; }],
    ['different experiment', () => group('b', 'ebbinghaus')],
    ['different reference', () => group('b', 'brightness', { target: 144 })],
  ])('does not offer a comparison report for a %s even when its retained members are revealed', async (_, build) => {
    await mount(seed([...group('a'), ...build()])); await review('a'); await compare('b');
    expect(comparisonButton()).toBeNull(); expect(reportButton('review')).toBeTruthy();
  });

  it('removes study and comparison export controls when notebook edits invalidate the selected source', async () => {
    await mount(seed([...group('a'), ...group('b', 'brightness', { contrast: 28 })])); await review('a'); await compare('b');
    expect(reportButton('review')).toBeTruthy(); expect(comparisonButton()).toBeTruthy();
    await act(async () => externalState(previous => engine.normalize({ ...previous, studies: previous.studies.filter(record => record.id !== 'b-record-3') })));
    expect(host.querySelector('[data-perception-report-study]')).toBeNull(); expect(comparisonButton()).toBeNull();
    await review('a'); await compare('b'); expect(reportButton('review')).toBeTruthy(); expect(comparisonButton()).toBeNull();
    await act(async () => externalState(previous => engine.normalize({ ...previous, studies: previous.studies.map(record => record.id === 'a-record-3' ? { ...record, model: { ...record.model, reveal: false } } : record) })));
    expect(reportButton('review')).toBeNull(); await review('a'); expect(reportButton('review')).toBeNull();
  });

  it('removes report controls across learner profiles and exports only a newly reviewed valid source', async () => {
    await mount(seed(group('study'))); await review('study'); expect(reportButton('review')).toBeTruthy();
    await act(async () => changeProfile('another-report-learner')); expect(reportButton('review')).toBeNull();
    const replacement = group('study'); replacement[0].model.note = 'NEW PROFILE SAVED NOTE';
    await act(async () => externalState(seed(replacement))); await review('study');
    const downloads = installDownloads(); await act(async () => reportButton('review').click());
    const report = downloadedDocument(downloads); expect(report.document.body.textContent).toContain('NEW PROFILE SAVED NOTE');
    expect(report.document.body.textContent).not.toContain('Saved trial 1 note');
  });

  it.each(MODES)('offers an active $id report only after three matches and explicit reveal', async mode => {
    const initial = seed(); initial.experiment = mode.id;
    initial.models[mode.id] = engine.normalize({ models: { [mode.id]: { matching: true, ...mode.controls, swap: true } } }).models[mode.id];
    await mount(initial); await click('Start three matches'); expect(reportButton('active')).toBeNull();
    for (const [index, value] of mode.values.entries()) {
      await input(host.querySelector('#perception-match-value'), value);
      await input(host.querySelector('.perception-note'), 'Active saved note ' + (index + 1));
      await click('Same'); await click('Record match'); expect(reportButton('active')).toBeNull();
    }
    await click('Reveal study results'); expect(reportButton('active')).toBeTruthy();
    await input(host.querySelector('[data-perception-preview-trial="active"]'), 2);
    await act(async () => host.querySelector('[data-perception-preview-guides="active"]').click());
    const downloads = installDownloads(), baseline = structuredClone(latest), beforeWrites = writes;
    await act(async () => reportButton('active').click());
    const report = downloadedDocument(downloads); expectSafeDocument(report, 3);
    const section = report.document.querySelector('[data-perception-report-section="study"]');
    const drawings = [...section.querySelectorAll('[data-perception-report-drawing]')];
    expect(drawings.map(svg => targetValue(svg, mode.id))).toEqual(mode.values);
    ['Active saved note 1', 'Active saved note 2', 'Active saved note 3'].forEach(note => expect(section.textContent).toContain(note));
    expect(reportButton('active').dataset.perceptionReportStudy).toBe(latest.studies[0].repeat.id);
    expectNoWorkspaceWrite(baseline, beforeWrites);
    await click('End repeated study'); expect(reportButton('active')).toBeNull();
  });

  it('cleans the temporary anchor and revokes the successful download URL after the download starts', async () => {
    vi.useFakeTimers(); await mount(seed(group('study'))); await review('study'); const downloads = installDownloads();
    await act(async () => reportButton('review').click());
    expect(downloads.downloads).toHaveLength(1); expect(document.querySelector('a[download$=".html"]')).toBeNull();
    expect(downloads.revoke).not.toHaveBeenCalled();
    await act(async () => vi.runOnlyPendingTimers()); expect(downloads.revoke).toHaveBeenCalledWith('blob:perception-study-report');
  });

  it.each(['HTML creation', 'Blob creation', 'URL creation', 'download start'])('announces %s failure, cleans allocated resources, and preserves all workspace data', async phase => {
    await mount(seed(group('study'))); await review('study'); const downloads = installDownloads();
    const baseline = structuredClone(latest), beforeWrites = writes;
    if (phase === 'HTML creation') vi.spyOn(document.implementation, 'createHTMLDocument').mockImplementation(() => { throw new Error('HTML document unavailable'); });
    if (phase === 'Blob creation') downloads.blob.mockImplementation(() => { throw new Error('Blob unavailable'); });
    if (phase === 'URL creation') downloads.create.mockImplementation(() => { throw new Error('Object URL unavailable'); });
    if (phase === 'download start') downloads.anchorClick.mockImplementation(() => { throw new Error('Download blocked'); });
    announce.mockClear(); await act(async () => reportButton('review').click());
    expect(downloads.downloads).toHaveLength(0); expect(document.querySelector('a[download$=".html"]')).toBeNull();
    if (phase === 'download start') expect(downloads.revoke).toHaveBeenCalledWith('blob:perception-study-report');
    else expect(downloads.revoke).not.toHaveBeenCalled();
    expect(announce).toHaveBeenCalled(); expect(announce.mock.calls.at(-1)[0]).toBe('The study report could not be created. Try again.');
    expect(announce.mock.calls.some(([message]) => /exported/i.test(message))).toBe(false);
    expectNoWorkspaceWrite(baseline, beforeWrites);
  });

  it.each([
    ['identical surroundings', {}, {}, false, []],
    ['one active setting', {}, { contrast: 27 }, false, []],
    ['multiple active settings', {}, { contrast: 27, swap: false }, false, ['multiple']],
    ['inactive setting', { context: false }, { context: false, contrast: 27 }, false, ['inactive']],
    ['different starts', {}, {}, true, ['starts']],
    ['inactive setting and different starts', { context: false }, { context: false, contrast: 27 }, true, ['inactive', 'starts']],
  ])('carries the appropriate A/B interpretation cautions for %s', async (_, firstChanges, secondChanges, changeStarts, expectedWarnings) => {
    const a = group('a', 'brightness', firstChanges), b = group('b', 'brightness', secondChanges);
    if (changeStarts) b[2].repeat.startValue = 100;
    b.forEach(record => { record.model.matchValue += 19; });
    await mount(seed([...a, ...b])); await review('a'); await compare('b'); const downloads = installDownloads();
    await act(async () => comparisonButton().click()); const report = downloadedDocument(downloads);
    const comparison = report.document.querySelector('[data-perception-report-comparison]'); expect(comparison).toBeTruthy();
    expect([...comparison.querySelectorAll('[data-perception-report-warning]')].map(node => node.dataset.perceptionReportWarning)).toEqual(expectedWarnings);
    const summaryRows = tableRows(comparison.querySelector('table'));
    expect(summaryRows).toEqual([
      ['Recorded matches', '121, 134, 146', '140, 153, 165'],
      ['Starting positions', '16, 240, 109', changeStarts ? '16, 240, 100' : '16, 240, 109'],
      ['Median match', '134 RGB-code steps', '153 RGB-code steps'],
      ['Match range', '121–146', '140–165'], ['Median difference', '-2 RGB-code steps', '+17 RGB-code steps'],
    ]);
    expect(comparison.textContent).toContain('Median shift · B minus A: +19 RGB-code steps');
    if (expectedWarnings.includes('inactive')) {
      expect(comparison.textContent).toContain('Inactive');
      for (const svg of report.document.querySelectorAll('[data-perception-report-drawing]')) expect(svg.querySelector('[data-perception-context]')).toBeNull();
    }
    if (expectedWarnings.includes('multiple')) expect(comparison.textContent).toContain('does not isolate the effect of one variable');
    if (expectedWarnings.includes('starts')) expect(comparison.textContent).toContain('different starting positions');
    expectSafeDocument(report, 6);
  });

  it('includes localized labels, literal translated HTML, valid language and direction metadata', async () => {
    const previousLang = document.documentElement.lang, previousDir = document.documentElement.dir;
    document.documentElement.lang = 'ar'; document.documentElement.dir = 'rtl';
    try {
      const labels = { study_report_title: 'تقرير <img src="https://example.invalid/title">', brightness_title: 'السطوع', recorded_impression: 'انطباع', brightness_choice_2: 'يمين', observation_note: 'ملاحظة', recorded_trial_option: 'محاولة {trial}' };
      const translate = (key, fallback) => labels[key.slice(key.lastIndexOf('.') + 1)] || fallback;
      await mount(seed(group('study')), { translate }); await review('study'); const downloads = installDownloads();
      await act(async () => reportButton('review').click()); const report = downloadedDocument(downloads);
      expect(report.document.documentElement.lang).toBe('ar'); expect(report.document.documentElement.dir).toBe('rtl');
      expect(report.document.title).toBe(labels.study_report_title); expect(report.document.querySelector('h1').textContent).toBe(labels.study_report_title);
      expect(report.document.querySelector('img')).toBeNull();
      expect(report.document.querySelector('[data-perception-report-trial="3"]').textContent).toContain('انطباع: يمين');
      expect(report.document.querySelector('[data-perception-report-note="3"]').textContent).toBe('ملاحظة: ' + FULL_NOTE);
      expectSafeDocument(report, 3);
    } finally { document.documentElement.lang = previousLang; document.documentElement.dir = previousDir; }
  });

  it('omits invalid saved timestamps while keeping the actual trial note, start, match and geometry', async () => {
    const members = group('study'); members[1].date = 'not-a-valid-date';
    await mount(seed(members)); await review('study'); const downloads = installDownloads();
    await act(async () => reportButton('review').click()); const report = downloadedDocument(downloads);
    const second = report.document.querySelector('[data-perception-report-trial="2"]');
    expect(second.querySelector('time')).toBeNull(); expect(second.textContent).toContain('Saved trial 2 note');
    expect(targetValue(second.querySelector('svg'), 'brightness')).toBe(134);
    expect(tableRows(report.document.querySelector('[data-perception-report-matches]'))[1]).toEqual(['2', '240', '134', '-2']);
    expectSafeDocument(report, 3);
  });

  it.each([
    ['removed trial', members => members.splice(2, 1)],
    ['revoked reveal', members => { members[2].model.reveal = false; }],
    ['conflicting trial', members => { members[2].repeat.trial = 2; }],
  ])('replans at click time after a current notebook mutation with a %s before allocating any report resource', async (_, mutate) => {
    await mount(seed(group('study'))); await review('study');
    const control = reportButton('review'), downloads = installDownloads();
    const createDocument = vi.spyOn(document.implementation, 'createHTMLDocument'), beforeWrites = writes;
    // The host can change the same stored notebook object before a React commit.
    // The still-visible action must inspect that current object instead of its
    // earlier normalized render snapshot.
    mutate(latestAll.perceptionLab.studies);
    announce.mockClear(); await act(async () => control.click());
    expect(createDocument).not.toHaveBeenCalled(); expect(downloads.blob).not.toHaveBeenCalled();
    expect(downloads.create).not.toHaveBeenCalled(); expect(downloads.downloads).toHaveLength(0);
    expect(announce.mock.calls.at(-1)[0]).toBe('A report needs complete, consistent, revealed studies. Review the saved results before exporting.');
    expect(writes).toBe(beforeWrites); expect(latestAll.otherTool).toEqual({ preserved: 37 });
    expect(latest.models.moire.note).toBe('PRIVATE CURRENT DRAFT'); expect(latest.comparison.model.note).toBe('PRIVATE PINNED VIEW');
  });
});
