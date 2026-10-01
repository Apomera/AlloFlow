import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const act = React.act, previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
let tool, mounted;
const ids = ['mystery', 'microscope', 'gram', 'growth', 'resistance', 'quiz'];
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); resetStemLab(); tool = loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology');
});
afterEach(() => {
  if (mounted) { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  act(() => vi.runOnlyPendingTimers());
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
});
function fixture() {
  const conditions = { profile: 'ecoli', tempC: 37, pH: 7, oxygen: 100 };
  const context = { version: 1, specimen: 'ecoli', method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 9, scaleUm: 2, referenceUm: 2 };
  const record = { claim: 'protist', evidence: ['structure', 'behavior'], reasoning: 'Original cilia evidence.', limitation: 'bounded' };
  const trial = { id: 2, control: conditions, conditions: { ...conditions, oxygen: 0 }, prediction: 'lower', hypothesis: 'Original growth hypothesis', explanation: 'Saved growth explanation', citedHours: [6] };
  const resistance = { dose: 30, duration: 8, initRes: 15, prediction: 'increase', notes: 'Original resistance evidence', history: [{ day: 0, sensitive: 68, resistant: 12 }, { day: 1, sensitive: 20, resistant: 12 }] };
  const gram = { prediction: 'thin', interpretation: 'wall', explanation: 'Original stain explanation.' };
  return {
    tab: 'home', gramStep: 0, quizIdx: 0, selectedBacterium: 'ecoli', selectedVirus: 'covid', selectedScope: 'lightbright',
    selectedMicrobiome: 'gut', selectedFerment: 'sourdough', selectedCase: 'snow', showMicroLibrary: false,
    scopeOrganism: 'ecoli', magnification: 1000, microscopeZoom: 20, microscopeFocus: 50, microscopeTargetFocus: 50, microscopeSeenSlides: [],
    microscopeMeasurements: { ecoli: { result: { value: 2, unit: 'um', context }, previousResult: { value: 4, unit: 'um', context }, draft: { value: '+2', unit: 'um', context }, extra: 'Keep raw measurement extras' } },
    mysteryLab: { active: 'pond', cases: { pond: { ...record, revealed: ['context', 'structure', 'behavior'], collapsed: ['structure'], record,
      previousRecord: { ...record, reasoning: 'Earlier cilia evidence.' }, reasoning: '<img src=x onerror=alert(1)>\nLiteral working revision' } }, extra: { legacy: true } },
    gramInvestigation: { ...gram, step: 4, maxStep: 4, explanation: 'Working stain revision', record: gram, previousRecord: { ...gram, explanation: 'Prior stain explanation' } },
    growthLab: { ...conditions, hypothesis: 'Legacy growth note', explanation: 'Earlier growth explanation', stuckRevealed: true, understood: true, log: [{ preserved: true }] },
    growthInvestigation: { control: conditions, trials: [trial], selectedId: 2, nextId: 5, prediction: 'higher', hypothesis: 'Working growth hypothesis', explanation: 'Working notebook explanation',
      removed: { index: 1, trial: { ...trial, id: 3, hypothesis: 'Recover this growth trial' } }, sweep: { variable: 'tempC', conditions }, previousSweep: { variable: 'pH', conditions }, unknown: 'Keep notebook metadata' },
    resistanceInvestigation: { ...resistance, notes: 'Working resistance notes', rawExtra: ['preserved'] },
    resistanceNotebook: { records: [{ id: 4, evidence: resistance, reviewNote: 'Later resistance reflection' }], selectedId: 4, nextId: 9,
      removed: { index: 0, record: { id: 8, evidence: { ...resistance, notes: 'Removed resistance evidence' }, reviewNote: 'Removed reflection' } } },
    quizAnswers: [0], quizSubmitted: true, quizCorrect: 999, quizPractice: { answers: [1], checked: [true], reflections: ['Imported practice must remain hidden'] },
    earnedXP: 73, unknownRoot: { values: [null, '<literal>', { custom: true }] }
  };
}
function mount(seed = fixture(), otherTool = { opaque: ['leave', 3], draft: 'Other activity draft' }) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const view = { container, root: ReactDOMClient.createRoot(container), state: null, wholeData: null, awardXP: vi.fn() };
  function Host() {
    const [data, setData] = React.useState({ microbiology: seed, otherTool });
    view.wholeData = data; view.state = data.microbiology;
    view.replace = next => setData(previous => ({ ...previous, microbiology: next }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData, awardXP: view.awardXP }));
  }
  mounted = view; act(() => view.root.render(React.createElement(Host))); return view;
}
const node = selector => mounted.container.querySelector(selector);
function click(selector) { const target = node(selector); expect(target, selector).toBeTruthy(); act(() => target.click()); return target; }
function choosePreview(id) {
  const select = node('#micro-portfolio-activity');
  act(() => { select.value = id; select.dispatchEvent(new Event('change', { bubbles: true })); });
}
function keyboardToggle(id) {
  const target = node('#micro-portfolio-include-' + id);
  act(() => {
    target.focus();
    target.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    target.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
    // JSDOM does not synthesize the browser's native Space activation.
    target.click();
  });
  return target;
}
function checked() { return ids.filter(id => node('#micro-portfolio-include-' + id).checked); }
function core() { return window.__MicrobiologyCore.work; }
function portfolio() { return core().portfolio(mounted.state); }
function downloads(initialFailure = '') {
  const blobs = [], urls = [], names = [];
  let failure = initialFailure;
  class CapturedBlob { constructor(parts, options) { this.parts = parts; this.type = options.type; } }
  const RealURL = globalThis.URL;
  class CapturedURL extends RealURL {}
  Object.defineProperties(CapturedURL, {
    createObjectURL: { configurable: true, writable: true, value: vi.fn(blob => {
      if (failure === 'create') throw new Error('URL unavailable');
      blobs.push(blob); const url = 'blob:selected-portfolio-' + blobs.length; urls.push(url); return url;
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
function expectCleanup(captured) {
  expect(document.querySelectorAll('a[download]')).toHaveLength(0);
  act(() => vi.runOnlyPendingTimers());
  expect(captured.revoke.mock.calls.flat()).toEqual(captured.urls);
}

describe('Home selected activity portfolio downloads', { timeout: 30000 }, () => {
  it('starts with six native unchecked choices and keeps selection, preview and whole saved state independent', () => {
    mount(); const before = JSON.stringify(mounted.wholeData), random = vi.spyOn(Math, 'random');
    click('#micro-portfolio-summary');
    expect(node('#micro-portfolio-selection').tagName).toBe('FIELDSET');
    expect(node('#micro-portfolio-selection legend').textContent).toBe('Activities to include in a selected download');
    expect(node('#micro-portfolio-selection-help').textContent).toContain('complete evidence and working notes');
    expect(checked()).toEqual([]); expect(node('#micro-portfolio-download-selected').disabled).toBe(true);
    expect(node('#micro-portfolio-included').textContent).toBe('Select at least one activity with evidence or working notes.');
    expect([...node('#micro-portfolio-selection').querySelectorAll('input')].map(item => item.type)).toEqual(ids.map(() => 'checkbox'));
    const originalPreview = node('#micro-portfolio-preview').textContent;
    const checkbox = keyboardToggle('growth');
    expect(checked()).toEqual(['growth']); expect(document.activeElement).toBe(checkbox);
    expect(node('#micro-portfolio-include-growth')).toBe(checkbox);
    expect(node('#micro-portfolio-preview').textContent).toBe(originalPreview);
    choosePreview('resistance'); expect(checked()).toEqual(['growth']);
    keyboardToggle('growth'); expect(checked()).toEqual([]);
    click('#micro-portfolio-select-all'); expect(checked()).toEqual(ids);
    click('#micro-portfolio-clear-selection'); expect(checked()).toEqual([]);
    expect(JSON.stringify(mounted.wholeData)).toBe(before);
    expect(mounted.awardXP).not.toHaveBeenCalled(); expect(random).not.toHaveBeenCalled();
  });

  it('downloads only complete selected sections in canonical order and leaves the complete download and preview unchanged', () => {
    mount(); const before = JSON.stringify(mounted.wholeData), captured = downloads(), all = portfolio();
    click('#micro-portfolio-summary'); choosePreview('gram');
    for (const id of ['quiz', 'mystery', 'growth']) click('#micro-portfolio-include-' + id);
    const selected = core().selectPortfolio(all, ['quiz', 'mystery', 'growth']);
    expect(node('#micro-portfolio-included').textContent).toBe('Included activities: ' + selected.sections.map(item => item.title).join(', '));
    const selectedButton = node('#micro-portfolio-download-selected'); selectedButton.focus();
    click('#micro-portfolio-download-selected');
    const first = node('#micro-portfolio-selected-download-status').firstChild;
    click('#micro-portfolio-download-selected');
    expect(node('#micro-portfolio-selected-download-status').firstChild).not.toBe(first);
    expect(document.activeElement).toBe(selectedButton);
    expect(node('#micro-portfolio-selected-download-status').textContent).toContain('selected activities download has started');
    const fullButton = node('#micro-portfolio-download'); fullButton.focus(); click('#micro-portfolio-download');
    expect(document.activeElement).toBe(fullButton);
    expect(captured.names).toEqual(['micro-lab-selected-portfolio.txt', 'micro-lab-selected-portfolio.txt', 'micro-lab-portfolio.txt']);
    expect(captured.blobs.map(blob => blob.parts.join(''))).toEqual([selected.text, selected.text, all.text]);
    expect(captured.blobs.every(blob => blob.type === 'text/plain;charset=utf-8')).toBe(true);
    expect(selected.text).toContain('Earlier cilia evidence.'); expect(selected.text).toContain('Recover this growth trial');
    expect(selected.text).not.toContain('Later resistance reflection'); expect(selected.text).not.toContain('Original stain explanation.');
    expect(selected.text).toContain('<img src=x onerror=alert(1)>');
    expect(node('#micro-portfolio-preview').textContent).toBe(all.sections.find(item => item.id === 'gram').text);
    expect(node('#micro-portfolio').querySelector('img,script,iframe')).toBeNull();
    expect(checked()).toEqual(['mystery', 'growth', 'quiz']);
    expectCleanup(captured); expect(JSON.stringify(mounted.wholeData)).toBe(before); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it.each([{}, { microscopeMeasurements: 'bad', mysteryLab: [], gramInvestigation: 'bad', growthInvestigation: [], resistanceNotebook: { records: [null] }, quizAnswers: ['0', false], quizSubmitted: true }])
  ('describes and disables every empty or malformed section without permitting a download', seed => {
    mount({ tab: 'home', ...seed }); const before = JSON.stringify(mounted.wholeData), captured = downloads();
    click('#micro-portfolio-summary');
    for (const id of ids) {
      const checkbox = node('#micro-portfolio-include-' + id);
      expect(checkbox.disabled).toBe(true); expect(checkbox.checked).toBe(false);
      expect(node('#' + checkbox.getAttribute('aria-describedby')).textContent).toBe('No evidence or working notes yet.');
      click('#micro-portfolio-include-' + id);
    }
    expect(node('#micro-portfolio-select-all').disabled).toBe(true);
    expect(node('#micro-portfolio-clear-selection').disabled).toBe(true);
    expect(node('#micro-portfolio-download-selected').disabled).toBe(true);
    expect(node('#micro-portfolio-download').disabled).toBe(true);
    click('#micro-portfolio-download-selected'); click('#micro-portfolio-download');
    expect(captured.blobs).toEqual([]); expect(checked()).toEqual([]);
    expect(JSON.stringify(mounted.wholeData)).toBe(before);
  });

  it('exports incomplete quiz answers without leaking imported scores, solutions or practice', () => {
    mount({ tab: 'home', quizAnswers: [0], quizSubmitted: true, quizCorrect: 999,
      quizPractice: { answers: [1], checked: [true], reflections: ['Hidden practice annotation'] } });
    const captured = downloads(), before = JSON.stringify(mounted.wholeData);
    click('#micro-portfolio-summary'); click('#micro-portfolio-select-all');
    expect(checked()).toEqual(['quiz']); click('#micro-portfolio-download-selected');
    const content = captured.blobs[0].parts.join(''); expect(content).toContain('Original answer');
    for (const secret of ['Original score:', 'Correct answer:', 'Practice status:', 'Hidden practice annotation']) expect(content).not.toContain(secret);
    expect(JSON.stringify(mounted.wholeData)).toBe(before); expectCleanup(captured);
  });

  it.each(['full', 'selected'].flatMap(kind => ['create', 'click'].map(failure => [kind, failure])))
  ('cleans up repeated %s download %s failures and keeps focus and selection for retry', (kind, failure) => {
    mount(); const captured = downloads(failure), before = JSON.stringify(mounted.wholeData);
    click('#micro-portfolio-summary'); click('#micro-portfolio-include-microscope');
    const buttonId = kind === 'full' ? '#micro-portfolio-download' : '#micro-portfolio-download-selected';
    const statusId = kind === 'full' ? '#micro-portfolio-download-status' : '#micro-portfolio-selected-download-status';
    const button = node(buttonId); button.focus(); click(buttonId);
    const status = node(statusId), first = status.firstChild;
    expect(status.getAttribute('role')).toBe('status'); expect(status.getAttribute('aria-live')).toBe('polite'); expect(status.getAttribute('aria-atomic')).toBe('true');
    expect(status.textContent).toContain('try again'); click(buttonId); expect(status.firstChild).not.toBe(first);
    captured.succeed(); click(buttonId); expect(status.textContent).toContain('download has started');
    expect(document.activeElement).toBe(button); expect(checked()).toEqual(['microscope']);
    expect(captured.names).toEqual([kind === 'full' ? 'micro-lab-portfolio.txt' : 'micro-lab-selected-portfolio.txt']);
    expectCleanup(captured); expect(captured.urls).toHaveLength(failure === 'click' ? 3 : 1);
    expect(JSON.stringify(mounted.wholeData)).toBe(before); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it.each(['selection', 'source evidence'])('permanently clears both download notices after %s changes away and back', change => {
    mount(); downloads(); click('#micro-portfolio-summary'); click('#micro-portfolio-include-mystery');
    click('#micro-portfolio-download'); click('#micro-portfolio-download-selected');
    expect(node('#micro-portfolio-download-status').textContent).toContain('download has started');
    expect(node('#micro-portfolio-selected-download-status').textContent).toContain('download has started');
    if (change === 'selection') { click('#micro-portfolio-include-quiz'); click('#micro-portfolio-include-quiz'); }
    else {
      const original = JSON.parse(JSON.stringify(mounted.state)), changed = JSON.parse(JSON.stringify(original));
      changed.mysteryLab.cases.pond.reasoning = 'Temporarily changed working reasoning';
      act(() => mounted.replace(changed)); act(() => mounted.replace(original));
    }
    expect(node('#micro-portfolio-download-status').textContent).toBe('');
    expect(node('#micro-portfolio-selected-download-status').textContent).toBe('');
    expect(checked()).toEqual(['mystery']);
    click('#micro-portfolio-download-selected'); expect(node('#micro-portfolio-selected-download-status').textContent).toContain('download has started');
  });

  it('prunes a now-empty choice permanently while retaining other choices and never auto-includes new evidence', () => {
    mount(); click('#micro-portfolio-summary');
    click('#micro-portfolio-include-mystery'); click('#micro-portfolio-include-quiz');
    const original = JSON.parse(JSON.stringify(mounted.state)), changed = JSON.parse(JSON.stringify(original));
    delete changed.mysteryLab; delete changed.growthLab; delete changed.growthInvestigation;
    act(() => mounted.replace(changed));
    expect(checked()).toEqual(['quiz']); expect(node('#micro-portfolio-include-mystery').disabled).toBe(true);
    act(() => mounted.replace(original));
    expect(node('#micro-portfolio-include-mystery').disabled).toBe(false);
    expect(node('#micro-portfolio-include-growth').disabled).toBe(false);
    expect(checked()).toEqual(['quiz']);
    const captured = downloads(); click('#micro-portfolio-download-selected');
    expect(captured.blobs[0].parts.join('')).toBe(core().selectPortfolio(portfolio(), ['quiz']).text);
    expect(mounted.state).toEqual(original);
  });

  it.each(['tab navigation', 'JSON remount'])('resets selection and feedback after %s without altering saved work or other tools', action => {
    mount(); downloads(); click('#micro-portfolio-summary'); click('#micro-portfolio-select-all');
    choosePreview('quiz'); click('#micro-portfolio-download-selected'); click('#micro-portfolio-download');
    const before = JSON.parse(JSON.stringify(mounted.wholeData));
    if (action === 'tab navigation') { click('#micro-tab-viruses'); click('#micro-tab-home'); }
    else {
      act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null;
      mount(before.microbiology, before.otherTool);
    }
    expect(checked()).toEqual([]); expect(node('#micro-portfolio-download-selected').disabled).toBe(true);
    expect(node('#micro-portfolio-download').disabled).toBe(false);
    expect(node('#micro-portfolio-download-status').textContent).toBe('');
    expect(node('#micro-portfolio-selected-download-status').textContent).toBe('');
    expect(node('#micro-portfolio').open).toBe(false); expect(node('#micro-portfolio-activity').value).toBe('mystery');
    expect(mounted.wholeData).toEqual(before); expect(mounted.awardXP).not.toHaveBeenCalled();
  });
});
