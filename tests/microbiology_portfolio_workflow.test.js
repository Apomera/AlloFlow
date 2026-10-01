import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const act = React.act, priorAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
let tool, mounted, replaceState;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); resetStemLab(); tool = loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology');
});
afterEach(() => {
  if (mounted) { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  act(() => vi.runOnlyPendingTimers());
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = priorAct;
});
function mount(seed = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const view = { container, root: ReactDOMClient.createRoot(container), state: null, awardXP: vi.fn() };
  function Host() {
    const [data, setData] = React.useState({ microbiology: { tab: 'home', ...seed } });
    view.state = data.microbiology;
    replaceState = next => setData({ microbiology: next });
    return tool.render(makeCtx({ toolData: data, setToolData: setData, awardXP: view.awardXP }));
  }
  mounted = view; act(() => view.root.render(React.createElement(Host))); return view;
}
const node = selector => mounted.container.querySelector(selector);
function click(selector) { const target = node(selector); expect(target, selector).toBeTruthy(); act(() => target.click()); return target; }
function choose(id) {
  const select = node('#micro-portfolio-activity');
  act(() => { select.value = id; select.dispatchEvent(new Event('change', { bubbles: true })); });
}
function portfolio() { return window.__MicrobiologyCore.work.portfolio(mounted.state); }
function fixture() {
  const conditions = { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100 };
  const context = { version: 1, specimen: 'ecoli', method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 9, scaleUm: 2, referenceUm: 2 };
  const gram = { prediction: 'thin', interpretation: 'wall', explanation: 'Saved stain reasoning.' };
  const mystery = { claim: 'protist', evidence: ['structure', 'behavior'], reasoning: 'Nuclei and cilia support a protist.', limitation: 'bounded' };
  const trial = { id: 7, control: conditions, conditions: { ...conditions, tempC: 25 }, prediction: 'lower', hypothesis: 'Original growth reasoning', explanation: 'The trial curve rose more slowly.' };
  const run = { dose: 30, duration: 8, initRes: 15, prediction: 'increase', notes: 'Resistance run notes', history: [{ day: 0, sensitive: 68, resistant: 12 }, { day: 1, sensitive: 20, resistant: 12 }] };
  return {
    gramStep: 0, quizIdx: 0, selectedBacterium: 'ecoli', selectedCase: 'snow', selectedFerment: 'sourdough',
    selectedMicrobiome: 'gut', selectedVirus: 'covid', showMicroLibrary: false,
    scopeOrganism: 'ecoli', selectedScope: 'lightbright', magnification: 1000, microscopeZoom: 20, microscopeFocus: 50, microscopeTargetFocus: 50, microscopeSeenSlides: [],
    microscopeMeasurements: { ecoli: { result: { value: 2, unit: 'um', context }, previousResult: { value: 4, unit: 'um', context }, draft: { value: '+2', unit: 'um', context } } },
    gramInvestigation: { ...gram, step: 4, maxStep: 4, explanation: 'Working stain revision', record: gram, previousRecord: { ...gram, explanation: 'Earlier stain reasoning.' }, unknownView: 'keep' },
    growthLab: { ...conditions, hypothesis: 'Legacy growth note', log: [{ note: 'Earlier entry' }] },
    growthInvestigation: { control: conditions, selectedId: 7, nextId: 10, prediction: 'higher', hypothesis: 'Next growth reasoning', explanation: 'Unsaved explanation', trials: [trial],
      removed: { index: 0, trial: { ...trial, id: 8, hypothesis: 'Recover this trial' } }, sweep: { variable: 'tempC', conditions }, previousSweep: { variable: 'pH', conditions } },
    resistanceInvestigation: { ...run, notes: 'Current run note', legacyExtra: '<do not rewrite>' },
    resistanceNotebook: { selectedId: 4, nextId: 10, records: [{ id: 4, evidence: run, reviewNote: 'Later reflection' }], removed: { index: 0, record: { id: 9, evidence: { ...run, notes: 'Removed snapshot' }, reviewNote: 'Recover this reflection' } } },
    mysteryLab: { active: 'pond', cases: { pond: { ...mystery, reasoning: '<img src=x onerror=alert(1)>\nWorking notes & literal text', revealed: ['context', 'structure', 'behavior'], collapsed: ['structure'], record: mystery, previousRecord: { ...mystery, reasoning: 'Earlier case explanation' } } }, rawExtra: 'keep' },
    quizAnswers: [0], quizSubmitted: true, quizCorrect: 999, quizPractice: { answers: [1], checked: [true], reflections: ['Hidden unchecked-import practice'] },
    untouchedLegacyMetadata: { label: 'Preserve raw state', list: [null, 'value'] }
  };
}
function downloads(initialFailure = '') {
  const blobs = [], urls = [], names = [];
  let failure = initialFailure;
  class CapturedBlob { constructor(parts, options) { this.parts = parts; this.type = options.type; } }
  const RealURL = globalThis.URL;
  class CapturedURL extends RealURL {}
  Object.defineProperties(CapturedURL, {
    createObjectURL: { configurable: true, writable: true, value: vi.fn(blob => {
      if (failure === 'create') throw new Error('URL unavailable');
      blobs.push(blob); const url = 'blob:portfolio-' + blobs.length; urls.push(url); return url;
    }) },
    revokeObjectURL: { configurable: true, writable: true, value: vi.fn() }
  });
  vi.stubGlobal('Blob', CapturedBlob); vi.stubGlobal('URL', CapturedURL);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() {
    if (failure === 'click') throw new Error('Download unavailable');
    names.push(this.download);
  });
  return { blobs, urls, names, revoke: CapturedURL.revokeObjectURL, succeed: () => { failure = ''; } };
}

describe('Home evidence portfolio workflow', { timeout: 30000 }, () => {
  it('reviews all six activities as literal text without mounting activities or changing any learner state', () => {
    mount(fixture());
    const before = JSON.stringify(mounted.state), report = portfolio();
    const random = vi.spyOn(Math, 'random');
    const disclosure = node('#micro-portfolio');
    expect(disclosure.tagName).toBe('DETAILS'); expect(disclosure.open).toBe(false);
    click('#micro-portfolio-summary'); expect(disclosure.open).toBe(true);
    expect(node('#micro-portfolio-title').tagName).toBe('H4');
    expect(node('#micro-portfolio-activity-title').tagName).toBe('H5');
    const select = node('#micro-portfolio-activity');
    expect(mounted.container.querySelector('label[for="micro-portfolio-activity"]').textContent).toBe('Activity to review');
    expect(select.getAttribute('aria-controls')).toBe('micro-portfolio-preview');
    expect(node('#' + select.getAttribute('aria-describedby'))).not.toBeNull();
    expect([...select.options].map(option => option.value)).toEqual(report.sections.map(section => section.id));
    select.focus();
    for (const section of report.sections) {
      choose(section.id);
      expect(node('#micro-portfolio-preview').dataset.portfolioActivity).toBe(section.id);
      expect(node('#micro-portfolio-preview').textContent).toBe(section.text);
      expect(document.activeElement).toBe(select);
    }
    choose('mystery');
    expect(node('#micro-portfolio-preview').textContent).toContain('<img src=x onerror=alert(1)>');
    expect(node('#micro-portfolio-preview').querySelector('img,script,iframe')).toBeNull();
    expect(node('[data-microscope-workspace],[data-micro-resistance-workspace],[data-micro-growth],#micro-gram-lab')).toBeNull();
    expect(JSON.stringify(mounted.state)).toBe(before);
    expect(mounted.awardXP).not.toHaveBeenCalled(); expect(random).not.toHaveBeenCalled();
  });

  it.each([{}, { microscopeMeasurements: 'bad', growthInvestigation: [], resistanceNotebook: { records: [null] }, mysteryLab: [], gramInvestigation: 'bad', quizSubmitted: true, quizAnswers: ['0', false] }])
  ('keeps download disabled for empty or malformed restored work', seed => {
    mount(seed); const captured = downloads(); const before = JSON.stringify(mounted.state);
    click('#micro-portfolio-summary');
    expect(node('#micro-portfolio-download').disabled).toBe(true);
    for (const section of portfolio().sections) {
      choose(section.id);
      expect(node('#micro-portfolio-preview').textContent).toBe('No evidence or working notes yet.');
    }
    click('#micro-portfolio-download');
    expect(captured.blobs).toHaveLength(0); expect(node('#micro-portfolio-download-status').textContent).toBe('');
    expect(JSON.stringify(mounted.state)).toBe(before); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('does not reveal quiz solutions, scores or imported practice for an incomplete attempt', () => {
    mount({ quizAnswers: [0], quizSubmitted: true, quizCorrect: 999, quizPractice: { answers: [1], checked: [true], reflections: ['Never reveal this imported practice'] } });
    const before = JSON.stringify(mounted.state), captured = downloads();
    click('#micro-portfolio-summary'); choose('quiz');
    const preview = node('#micro-portfolio-preview').textContent;
    expect(preview).toContain('Original answer');
    for (const text of ['Correct answer:', 'Original score:', 'Practice status:', 'Never reveal this imported practice']) expect(preview).not.toContain(text);
    click('#micro-portfolio-download');
    for (const text of ['Correct answer:', 'Original score:', 'Practice status:', 'Never reveal this imported practice']) expect(captured.blobs[0].parts.join('')).not.toContain(text);
    expect(JSON.stringify(mounted.state)).toBe(before); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('downloads the complete portfolio repeatedly while preserving focus, evidence and local selection', () => {
    mount(fixture()); const captured = downloads(), before = JSON.stringify(mounted.state), expected = portfolio().text;
    click('#micro-portfolio-summary'); choose('microscope');
    const button = node('#micro-portfolio-download'); button.focus(); click('#micro-portfolio-download');
    const notice = node('#micro-portfolio-download-status'), firstAnnouncement = notice.firstChild;
    expect(notice.getAttribute('role')).toBe('status'); expect(notice.getAttribute('aria-live')).toBe('polite'); expect(notice.getAttribute('aria-atomic')).toBe('true');
    expect(notice.textContent).toContain('full portfolio download has started');
    click('#micro-portfolio-download');
    expect(notice.firstChild).not.toBe(firstAnnouncement);
    expect(node('#micro-portfolio-download')).toBe(button); expect(document.activeElement).toBe(button);
    expect(node('#micro-portfolio-activity').value).toBe('microscope');
    expect(captured.names).toEqual(['micro-lab-portfolio.txt', 'micro-lab-portfolio.txt']);
    expect(captured.blobs.map(blob => blob.parts.join(''))).toEqual([expected, expected]);
    expect(captured.blobs.every(blob => blob.type === 'text/plain;charset=utf-8')).toBe(true);
    expect(document.querySelectorAll('a[download]')).toHaveLength(0);
    act(() => vi.runOnlyPendingTimers()); expect(captured.revoke.mock.calls.flat()).toEqual(captured.urls);
    expect(JSON.stringify(mounted.state)).toBe(before); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it.each(['create', 'click'])('cleans up a %s failure and permits repeated failure followed by retry', failure => {
    mount(fixture()); const captured = downloads(failure), before = JSON.stringify(mounted.state);
    click('#micro-portfolio-summary'); const button = node('#micro-portfolio-download'); button.focus();
    click('#micro-portfolio-download'); const status = node('#micro-portfolio-download-status'), first = status.firstChild;
    expect(status.textContent).toContain('try again'); expect(document.activeElement).toBe(button);
    click('#micro-portfolio-download'); expect(status.firstChild).not.toBe(first);
    captured.succeed(); click('#micro-portfolio-download'); expect(status.textContent).toContain('download has started');
    expect(captured.names).toEqual(['micro-lab-portfolio.txt']); expect(document.querySelectorAll('a[download]')).toHaveLength(0);
    act(() => vi.runOnlyPendingTimers()); expect(captured.revoke.mock.calls.flat()).toEqual(captured.urls);
    expect(captured.urls).toHaveLength(failure === 'click' ? 3 : 1);
    expect(JSON.stringify(mounted.state)).toBe(before); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('permanently clears an old download notice after evidence changes away and back', () => {
    mount(fixture()); downloads(); click('#micro-portfolio-summary'); click('#micro-portfolio-download');
    const original = JSON.parse(JSON.stringify(mounted.state));
    expect(node('#micro-portfolio-download-status').textContent).toContain('download has started');
    const changed = JSON.parse(JSON.stringify(original)); changed.mysteryLab.cases.pond.reasoning = 'A later working explanation.';
    act(() => replaceState(changed)); expect(node('#micro-portfolio-download-status').textContent).toBe('');
    act(() => replaceState(original)); expect(node('#micro-portfolio-download-status').textContent).toBe('');
    click('#micro-portfolio-download'); expect(node('#micro-portfolio-download-status').textContent).toContain('download has started');
    expect(mounted.state).toEqual(original); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it.each(['tab navigation', 'JSON reload'])('drops local feedback after %s and preserves the complete raw learning record', action => {
    mount(fixture()); downloads(); click('#micro-portfolio-summary'); choose('quiz'); click('#micro-portfolio-download');
    const before = JSON.parse(JSON.stringify(mounted.state)), expected = portfolio().text;
    if (action === 'tab navigation') { click('#micro-tab-viruses'); click('#micro-tab-home'); }
    else { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; mount(before); }
    expect(node('#micro-portfolio').open).toBe(false);
    expect(node('#micro-portfolio-download-status').textContent).toBe('');
    expect(node('#micro-portfolio-activity').value).toBe(portfolio().sections[0].id);
    expect(portfolio().text).toBe(expected); expect(mounted.state).toEqual(before);
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });
});
