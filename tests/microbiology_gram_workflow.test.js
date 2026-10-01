import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let tool, mounted;
const act = React.act, priorAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab(); tool = loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology');
});
function unmount() {
  if (mounted) { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
}
afterEach(() => { unmount(); globalThis.IS_REACT_ACT_ENVIRONMENT = priorAct; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const core = () => window.__MicrobiologyCore.gram;
function mount(seed = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const view = { container, root: ReactDOMClient.createRoot(container), state: null, awardXP: vi.fn() };
  function Host() {
    const [data, setData] = React.useState({ microbiology: { tab: 'bacteria', ...seed } });
    view.state = data.microbiology;
    return tool.render(makeCtx({ toolData: data, setToolData: setData, awardXP: view.awardXP }));
  }
  mounted = view; act(() => view.root.render(React.createElement(Host))); return view;
}
function lab() { return mounted.container.querySelector('#micro-gram-lab'); }
function button(text) {
  const node = [...lab().querySelectorAll('button')].find(n => n.textContent.trim() === text);
  expect(node, text).toBeTruthy(); return node;
}
function click(node) { act(() => (typeof node === 'string' ? button(node) : node).click()); }
function choose(name, value) { click(lab().querySelector(`input[name="micro-gram-${name}"][value="${value}"]`)); }
function write(text) {
  const node = lab().querySelector('#micro-gram-explanation');
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(node, text);
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
function stages() { return [...lab().querySelectorAll('.micro-gram-stages button')]; }
function observe() { for (let i = 1; i <= 4; i++) click(stages()[i]); }
function tab(id) { click(mounted.container.querySelector('#micro-tab-' + id)); }
function captureDownload() {
  const contents = [], NativeBlob = globalThis.Blob, NativeURL = globalThis.URL;
  class CapturedBlob extends NativeBlob {
    constructor(parts, options) { super(parts, options); contents.push(parts.join('')); }
  }
  class CapturedURL extends NativeURL {}
  Object.defineProperties(CapturedURL, {
    createObjectURL: { configurable: true, writable: true, value: vi.fn(() => 'blob:gram-evidence') },
    revokeObjectURL: { configurable: true, writable: true, value: vi.fn() }
  });
  vi.stubGlobal('Blob', CapturedBlob); vi.stubGlobal('URL', CapturedURL);
  const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  vi.useFakeTimers();
  return { contents, clickSpy, createUrl: CapturedURL.createObjectURL, revokeUrl: CapturedURL.revokeObjectURL };
}

describe('Gram-stain inquiry model', () => {
  it.each([false, true])('does not resurrect an old export notice after reversed working-note edits (failure=%s)', failure => {
    mount({ gramInvestigation: { prediction: 'thin', explanation: 'Original working note.' } });
    const download = captureDownload(), trigger = button('Download Gram evidence report');
    if (failure) download.clickSpy.mockImplementationOnce(() => { throw new Error('blocked'); });
    const before = JSON.stringify(mounted.state); trigger.focus(); click(trigger);
    const status = lab().querySelector('#micro-gram-download-status');
    expect(status.textContent).toContain(failure ? 'could not start' : 'download has started');
    expect(JSON.stringify(mounted.state)).toBe(before); expect(document.activeElement).toBe(trigger);
    write('An edited working note.'); expect(status.textContent).toBe('');
    write('Original working note.'); expect(status.textContent).toBe('');
    click(trigger); expect(status.textContent).toContain('download has started');
    expect(download.contents[1]).toBe(download.contents[0]); expect(mounted.awardXP).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000)); expect(download.revokeUrl).toHaveBeenCalledTimes(2);
  });

  it('announces repeated Gram evidence downloads through a fresh status node while preserving evidence', () => {
    mount({ gramInvestigation: { prediction: 'thick', explanation: 'Unscored working notes.' } });
    const download = captureDownload(), before = JSON.stringify(mounted.state), trigger = button('Download Gram evidence report');
    click(trigger); const status = lab().querySelector('#micro-gram-download-status'), first = status.firstChild;
    click(trigger); expect(status.firstChild).not.toBe(first); expect(download.contents[1]).toBe(download.contents[0]);
    expect(JSON.stringify(mounted.state)).toBe(before); expect(mounted.awardXP).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000)); expect(download.revokeUrl).toHaveBeenCalledTimes(2);
  });

  it('bounds malformed legacy and saved data without inventing a completed report', () => {
    for (const raw of [null, [], 7, 'bad']) expect(core().normalize(raw)).toEqual({ step: 0, maxStep: 0, prediction: '', interpretation: '', explanation: '', record: null });
    for (const step of [Infinity, NaN, {}, '3', -4, 99, 2.9]) expect(core().normalize(null, step)).toMatchObject({ step: 0, maxStep: 0 });
    const normalized = core().normalize({ step: 2.9, maxStep: 90, prediction: '__proto__', interpretation: 'bad', explanation: 'x'.repeat(1300), record: { interpretation: 'drug', explanation: 'Not supported' } });
    expect(normalized).toMatchObject({ step: 0, maxStep: 0, prediction: '', interpretation: '', record: null });
    expect(normalized.explanation).toHaveLength(1200);
    expect(core().normalize(normalized)).toEqual(normalized);
  });

  it('requires completed observations, a supported mechanism, and a nonblank explanation', () => {
    const draft = { step: 0, prediction: 'thin', interpretation: 'wall', explanation: 'A retained purple at decolorization.' };
    expect(core().evaluate(draft).code).toBe('observe');
    expect(core().evaluate({ ...draft, maxStep: 4, interpretation: 'shape' }).code).toBe('interpretation');
    expect(core().evaluate({ ...draft, maxStep: 4, explanation: '  ' }).code).toBe('explanation');
    expect(core().evaluate({ ...draft, maxStep: 4 })).toMatchObject({ canRecord: true, predictionMatches: false });
    expect(core().evaluate({ ...draft, maxStep: 3, prediction: 'thick' }).predictionMatches).toBe(true);
    expect(core().evaluate({ ...draft, maxStep: 2 }).predictionMatches).toBeNull();
  });

  it('preserves a valid saved snapshot independently of a new draft and returns copies', () => {
    const record = Object.freeze({ prediction: 'both', interpretation: 'wall', explanation: 'Decolorization distinguishes the envelopes.' });
    const input = Object.freeze({ step: 0, maxStep: 0, record });
    const result = core().normalize(input);
    expect(result.record).toEqual(record);
    expect(result.record).not.toBe(record);
    expect(core().evaluate(result).canRecord).toBe(false);
    result.record.explanation = 'Changed copy';
    expect(record.explanation).toBe('Decolorization distinguishes the envelopes.');
  });

  it('rejects invalid progress without discarding a valid report or a valid independent stage', () => {
    const record = { prediction: 'thick', interpretation: 'wall', explanation: 'A retains the dye at decolorization because of its envelope.' };
    for (const invalid of [99, 4.1, -1, Infinity, '4']) {
      const review = core().evaluate({ ...record, step: invalid, maxStep: invalid, record }, 4);
      expect(review).toMatchObject({ canRecord: false, sameRecord: false, pendingRevision: true, nextStep: 'observe' });
      expect(review.state).toMatchObject({ step: 0, maxStep: 0, record });
      expect(core().normalize({ step: invalid, maxStep: 3, record })).toMatchObject({ step: 0, maxStep: 3, record });
      expect(core().normalize({ step: 2, maxStep: invalid, record })).toMatchObject({ step: 2, maxStep: 2, record });
    }
  });

  it('identifies the next learner action and distinguishes edits from reviewing saved evidence', () => {
    const record = { prediction: 'both', interpretation: 'wall', explanation: 'B loses the violet complex at decolorization.' };
    const complete = { ...record, step: 4, maxStep: 4 };
    expect(core().evaluate({}).nextStep).toBe('prediction');
    expect(core().evaluate({ prediction: 'both' }).nextStep).toBe('observe');
    expect(core().evaluate(null, 3).nextStep).toBe('observe');
    expect(core().evaluate({ ...complete, interpretation: 'shape' }).nextStep).toBe('interpretation');
    expect(core().evaluate({ ...complete, explanation: ' ' }).nextStep).toBe('explanation');
    expect(core().evaluate(complete)).toMatchObject({ nextStep: 'record', pendingRevision: false });
    expect(core().evaluate({ ...complete, record, step: 1 })).toMatchObject({ nextStep: 'saved', sameRecord: true, pendingRevision: false });
    expect(core().evaluate({ ...complete, record, explanation: 'A new explanation.' })).toMatchObject({ nextStep: 'record', sameRecord: false, pendingRevision: true });
    expect(core().evaluate({ record })).toMatchObject({ nextStep: 'prediction', pendingRevision: true });
  });

  it('projects a saved report independently of current observed stages without inventing historical evidence', () => {
    const saved = Object.freeze({ prediction: 'thin', interpretation: 'wall', explanation: 'A retained purple despite my prediction.' });
    const input = Object.freeze({ record: saved, maxStep: 99, step: 0, explanation: '<script>literal notes</script>' });
    const report = core().report(input);
    expect(report.saved).toEqual(saved);
    expect(report.saved).not.toHaveProperty('observedStages');
    expect(report.working.observedStages).toEqual([]);
    expect(report.working.explanation).toBe('<script>literal notes</script>');
    expect(report.changes).toEqual(['prediction', 'interpretation', 'explanation']);
    expect(report.canDownload).toBe(true);
    report.saved.explanation = 'Changed copy';
    expect(saved.explanation).toBe('A retained purple despite my prediction.');
    expect(core().report(null, 2).working.observedStages).toEqual([1, 2]);
  });

  it('compares only changed written fields and permits useful unfinished notes to be exported', () => {
    const record = { prediction: '', interpretation: 'wall', explanation: 'Original legacy explanation.' };
    const same = { ...record, record, step: 2, maxStep: 4 };
    expect(core().report(same)).toMatchObject({ changes: [], pendingRevision: false });
    expect(core().report({ ...same, interpretation: 'shape' }).changes).toEqual(['interpretation']);
    expect(core().report({ ...same, explanation: 'A revision.' }).changes).toEqual(['explanation']);
    expect(core().report({ ...same, step: 0, maxStep: 0 })).toMatchObject({ changes: [], pendingRevision: true });
    for (const raw of [null, {}, { explanation: '  ' }, { step: 99, maxStep: 99 }]) expect(core().report(raw).canDownload).toBe(false);
    for (const raw of [{ prediction: 'thin' }, { interpretation: 'shape' }, { explanation: 'A question.' }, { record }]) expect(core().report(raw).canDownload).toBe(true);
  });

  it('keeps independent previous written evidence without accepting invalid, identical or orphaned history', () => {
    const record = Object.freeze({ prediction: 'both', interpretation: 'wall', explanation: 'Current explanation.' });
    const previousRecord = Object.freeze({ prediction: '', interpretation: 'wall', explanation: '<img> Earlier explanation.\nLiteral text.' });
    const input = Object.freeze({ record, previousRecord, step: 99, maxStep: 99 });
    const normalized = core().normalize(input), report = core().report(input);
    expect(normalized).toMatchObject({ step: 0, maxStep: 0, record, previousRecord });
    expect(normalized.previousRecord).not.toBe(previousRecord);
    expect(report).toMatchObject({ saved: record, previousSaved: previousRecord });
    expect(report.previousSaved).not.toHaveProperty('observedStages');
    expect(report.working.observedStages).toEqual([]);
    expect(core().normalize(JSON.parse(JSON.stringify(normalized)))).toEqual(normalized);
    normalized.previousRecord.explanation = 'Changed copy';
    expect(previousRecord.explanation).toContain('Earlier explanation.');
    for (const invalid of [null, [], 'bad', record, { ...previousRecord, prediction: 'invalid' }, { ...previousRecord, interpretation: 'shape' }, { ...previousRecord, explanation: ' ' }]) {
      expect(core().normalize({ record, previousRecord: invalid })).not.toHaveProperty('previousRecord');
    }
    expect(core().normalize({ previousRecord })).not.toHaveProperty('previousRecord');
    expect(core().normalize({ record, previousRecord: { ...previousRecord, explanation: 'x'.repeat(1300) } }).previousRecord.explanation).toHaveLength(1200);
  });

  it('retains exactly one previous report only when a changed complete report is saved', () => {
    const previousRecord = { prediction: '', interpretation: 'wall', explanation: 'First legacy report.' };
    const record = { prediction: 'thin', interpretation: 'wall', explanation: 'Second report with a wrong original prediction.' };
    const input = { ...record, record, previousRecord, step: 1, maxStep: 4 };
    const before = JSON.stringify(input);
    expect(core().saveReport(input)).toEqual(input);
    expect(core().saveReport({ ...input, maxStep: 2, explanation: 'Incomplete revision.' }).previousRecord).toEqual(previousRecord);
    const next = core().saveReport({ ...input, explanation: 'Third saved explanation.' });
    expect(next.record).toEqual({ ...record, explanation: 'Third saved explanation.' });
    expect(next.previousRecord).toEqual(record);
    expect(core().saveReport(next)).toEqual(next);
    expect(JSON.stringify(input)).toBe(before);
    expect(core().saveReport({ ...record, maxStep: 4 }).record).toEqual(record);
    expect(core().saveReport({ ...record, maxStep: 4 })).not.toHaveProperty('previousRecord');
  });

  it('swaps saved versions without changing the active draft or manufacturing observed stages', () => {
    const record = { prediction: 'both', interpretation: 'wall', explanation: 'Current report.' };
    const previousRecord = { prediction: 'neither', interpretation: 'wall', explanation: 'Earlier report.' };
    const input = { record, previousRecord, step: 1, maxStep: 2, prediction: 'thin', interpretation: 'shape', explanation: 'Unfinished notes.' };
    const before = JSON.stringify(input), restored = core().restoreReport(input);
    expect(restored).toEqual({ ...input, record: previousRecord, previousRecord: record });
    expect(core().restoreReport(restored)).toEqual(input);
    expect(core().report(restored).working.observedStages).toEqual([1, 2]);
    expect(core().evaluate(restored)).toMatchObject({ canRecord: false, pendingRevision: true });
    expect(JSON.stringify(input)).toBe(before);
    expect(restored.record).not.toBe(previousRecord);
    expect(core().restoreReport({ record })).toEqual(core().normalize({ record }));
  });
});

describe('Gram-stain inquiry workflow', { timeout: 20000 }, () => {
  it('locks a prediction before observation, enforces stage order, and distinguishes color without shape cues', () => {
    mount();
    expect(stages()[1].disabled).toBe(true);
    choose('prediction', 'thin'); click(stages()[1]);
    expect(stages()[3].disabled).toBe(true);
    expect(lab().querySelector('fieldset').disabled).toBe(true);
    choose('prediction', 'thick');
    expect(mounted.state.gramInvestigation.prediction).toBe('thin');
    click(stages()[2]);
    expect(lab().querySelector('[data-gram-prediction-result]')).toBeNull();
    click(stages()[3]);
    const summary = lab().querySelector('.micro-gram-observation');
    expect(summary.textContent).toContain('Model A — Purple; Model B — Colorless');
    expect(summary.getAttribute('aria-live')).toBe('polite');
    expect(lab().textContent).toContain('The observation differed from your prediction.');
    for (const model of ['A', 'B']) {
      const graphic = lab().querySelector(`[data-model="${model}"]`);
      expect(graphic.querySelectorAll('circle')).toHaveLength(3);
      expect(graphic.querySelectorAll('rect')).toHaveLength(3);
      expect(graphic.getAttribute('aria-label')).toContain('Both round and rod-shaped cells');
      const expected = model === 'A' ? '#a78bfa' : 'none';
      expect([...graphic.querySelectorAll('circle,rect')].every(n => n.getAttribute('fill') === expected)).toBe(true);
    }
    click(stages()[4]);
    expect(lab().querySelector('.micro-gram-observation').textContent).toContain('Model A — Purple; Model B — Pink');
    expect(lab().textContent).toContain('shape does not determine Gram-stain response');
    click(stages()[1]);
    expect(mounted.state.gramInvestigation.maxStep).toBe(4);
    expect(stages()[4].disabled).toBe(false);
    expect(stages().filter(node => node.getAttribute('aria-current') === 'step')).toEqual([stages()[1]]);
  });

  it('revises an unsupported interpretation, then saves a report independently of draft edits', () => {
    mount(); choose('prediction', 'both'); write('Both models were purple until decolorization, when B lost the dye.');
    expect(button('Save Gram-stain report').disabled).toBe(true);
    observe();
    for (const [value, feedback] of [['shape', 'Round cells and rods share the same color'], ['species', 'More evidence is needed to identify a species'], ['drug', 'does not measure antibiotic susceptibility']]) {
      choose('interpretation', value);
      expect(lab().querySelector('.micro-gram-feedback').textContent).toContain(feedback);
      expect(button('Save Gram-stain report').disabled).toBe(true);
    }
    choose('interpretation', 'wall'); click('Save Gram-stain report');
    const saved = JSON.parse(JSON.stringify(mounted.state.gramInvestigation.record));
    expect(button('Report saved').disabled).toBe(true);
    write('A revised draft, still being considered.'); choose('interpretation', 'shape');
    expect(mounted.state.gramInvestigation.record).toEqual(saved);
    expect(lab().querySelector('.micro-gram-record blockquote').textContent).toBe(saved.explanation);
    expect(lab().querySelector('#micro-gram-explanation').value).toBe('A revised draft, still being considered.');
    expect(button('Save Gram-stain report').disabled).toBe(true);
  });

  it('preserves the whole investigation through tab changes and JSON remount without changing other work', () => {
    mount({ growthLab: { hypothesis: 'Independent growth work' } });
    choose('prediction', 'thick'); observe(); choose('interpretation', 'wall'); write('The change at decolorization reflects different envelopes.'); click('Save Gram-stain report');
    click(stages()[2]); write('Current draft after reviewing iodine.');
    const saved = JSON.parse(JSON.stringify(mounted.state));
    tab('home'); tab('bacteria');
    expect(mounted.state.gramInvestigation).toEqual(saved.gramInvestigation);
    expect(lab().querySelector('#micro-gram-explanation').value).toBe('Current draft after reviewing iodine.');
    expect(mounted.state.growthLab).toEqual(saved.growthLab);
    unmount(); mount(saved);
    expect(stages()[2].getAttribute('aria-current')).toBe('step');
    expect(mounted.state.gramInvestigation).toEqual(saved.gramInvestigation);
    expect(lab().querySelector('.micro-gram-record blockquote').textContent).toBe(saved.gramInvestigation.record.explanation);
    click('Start a new investigation');
    expect(mounted.state.gramInvestigation).toMatchObject({ step: 0, maxStep: 0, prediction: '', interpretation: '', explanation: '', record: saved.gramInvestigation.record });
    expect(mounted.state.gramStep).toBe(0);
    expect(stages()[1].disabled).toBe(true);
  });

  it('recovers a legacy step without fabricating a prediction and renders malformed legacy values safely', () => {
    mount({ gramStep: 3 });
    expect(stages()[3].getAttribute('aria-current')).toBe('step');
    expect(lab().textContent).toContain('No prediction was saved for this earlier observation.');
    click(stages()[4]); choose('interpretation', 'wall'); write('The two models separated at decolorization.'); click('Save Gram-stain report');
    expect(mounted.state.gramInvestigation.record.prediction).toBe('');
    unmount(); mount({ gramStep: { invalid: true } });
    expect(stages()[0].getAttribute('aria-current')).toBe('step');
    expect(lab().textContent).not.toContain('undefined');
  });

  it('announces a saved report, focuses its heading, then returns restart focus to the prediction', () => {
    vi.useFakeTimers(); mount();
    const status = lab().querySelector('#micro-gram-save-status');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-atomic')).toBe('true');
    expect(status.textContent).toBe('');
    choose('prediction', 'thin'); observe(); choose('interpretation', 'wall'); write('Only A retained purple at decolorization because its envelope differs.');
    act(() => button('Save Gram-stain report').focus()); click('Save Gram-stain report');
    act(() => vi.runOnlyPendingTimers());
    expect(document.activeElement).toBe(lab().querySelector('#micro-gram-record-heading'));
    expect(status.textContent).toContain('Your Gram-stain report is saved.');
    const report = JSON.parse(JSON.stringify(mounted.state.gramInvestigation.record));
    write('An unfinished revised explanation.');
    expect(status.textContent).toBe('');
    act(() => button('Start a new investigation').focus()); click('Start a new investigation');
    act(() => vi.runOnlyPendingTimers());
    const prediction = lab().querySelector('#micro-gram-prediction-thick');
    expect(document.activeElement).toBe(prediction);
    expect(prediction.closest('fieldset').disabled).toBe(false);
    expect(prediction.checked).toBe(false);
    expect(mounted.state.gramInvestigation.record).toEqual(report);
  });

  it('does not move focus into a newly opened Gram activity after leaving the original one', () => {
    vi.useFakeTimers(); mount();
    click('Start a new investigation');
    tab('home'); tab('bacteria');
    const activeTab = mounted.container.querySelector('#micro-tab-bacteria');
    act(() => activeTab.focus());
    act(() => vi.runOnlyPendingTimers());
    expect(document.activeElement).toBe(activeTab);
  });

  it('provides named controls, a focusable resume target, and conceptual reference limits', () => {
    mount();
    expect(lab().getAttribute('aria-labelledby')).toBe('micro-gram-heading');
    const heading = lab().querySelector('#micro-gram-heading');
    expect(heading.tabIndex).toBe(-1);
    act(() => heading.focus()); expect(document.activeElement).toBe(heading);
    expect([...lab().querySelectorAll('input')].every(node => node.closest('label'))).toBe(true);
    expect([...lab().querySelectorAll('button')].every(node => node.type === 'button')).toBe(true);
    const textarea = lab().querySelector('textarea');
    expect(lab().querySelector(`label[for="${textarea.id}"]`)).toBeTruthy();
    expect(lab().querySelector('#' + textarea.getAttribute('aria-describedby'))).toBeTruthy();
    expect(lab().textContent).toContain('cannot identify a species or establish antibiotic susceptibility');
    expect(lab().querySelectorAll('a[rel="noopener noreferrer"]')).toHaveLength(2);
    const surrounding = lab().parentElement;
    expect(surrounding.textContent).toContain('Both Gram-positive and Gram-negative bacteria can cause serious disease');
    expect(surrounding.textContent).not.toMatch(/~3 seconds|Generally susceptible to:|Generally tougher to treat|medically more dangerous/);
  });

  it('compares only changed fields in a stable native disclosure without replacing the saved explanation', () => {
    const record = { prediction: 'thin', interpretation: 'wall', explanation: 'My saved explanation.' };
    mount({ gramInvestigation: { ...record, record, step: 2, maxStep: 4 } });
    const disclosure = lab().querySelector('#micro-gram-comparison');
    expect(disclosure.tagName).toBe('DETAILS');
    expect(disclosure.open).toBe(false);
    expect(disclosure.textContent).toContain('No written fields have changed.');
    click(disclosure.querySelector('summary'));
    expect(disclosure.open).toBe(true);
    write('<img src=x onerror=alert(1)> My working explanation.');
    choose('interpretation', 'shape');
    expect(lab().querySelector('#micro-gram-comparison')).toBe(disclosure);
    expect(disclosure.open).toBe(true);
    expect([...disclosure.querySelectorAll('[data-gram-change]')].map(node => node.dataset.gramChange)).toEqual(['interpretation', 'explanation']);
    const changed = disclosure.querySelector('[data-gram-change="explanation"]');
    expect(changed.querySelector('[data-gram-value="saved"]').textContent).toBe(record.explanation);
    expect(changed.querySelector('[data-gram-value="working"]').textContent).toContain('<img src=x onerror=alert(1)>');
    expect(disclosure.querySelector('img')).toBeNull();
    expect(mounted.state.gramInvestigation.record).toEqual(record);
    choose('interpretation', 'wall'); write(record.explanation);
    expect(disclosure.querySelectorAll('[data-gram-change]')).toHaveLength(0);
    expect(disclosure.textContent).toContain('No written fields have changed.');
  });

  it('exports saved and contradictory working explanations as distinct literal text with model limits', () => {
    const record = { prediction: 'thin', interpretation: 'wall', explanation: 'A kept purple at decolorization despite my original prediction.' };
    const working = '<script>literal draft</script>\nI am reconsidering the shape explanation.';
    mount({ gramInvestigation: { ...record, record, step: 1, maxStep: 4, interpretation: 'shape', explanation: working } });
    const download = captureDownload(), before = JSON.stringify(mounted.state);
    const control = button('Download Gram evidence report');
    act(() => control.focus()); click(control);
    const [saved, draft] = download.contents[0].split('Current working notes');
    expect(saved).toContain('Prediction: Only model B');
    expect(saved).toContain(record.explanation);
    expect(saved).not.toContain(working);
    expect(saved).toContain('It does not store a historical log of observed stages.');
    expect(draft).toContain(working);
    expect(draft).toContain('Selected interpretation: Round cells retain purple dye');
    expect(draft).toContain('The current investigation has not replaced the saved report.');
    expect(draft).toContain('Stages observed in the current investigation: 4/4');
    expect(draft).toContain('4. Safranin counterstain: Model A — Purple; Model B — Pink');
    expect(draft).toContain('cannot identify a species or establish antibiotic susceptibility');
    expect(draft).toContain('https://asm.org/protocols/gram-stain-protocols');
    expect(draft).toContain('https://openstax.org/books/microbiology/pages/2-4-staining-microscopic-specimens');
    expect(JSON.stringify(mounted.state)).toBe(before);
    expect(document.activeElement).toBe(control);
    const status = lab().querySelector('#micro-gram-download-status');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-atomic')).toBe('true');
    expect(status.textContent).toContain('download has started');
    expect(document.querySelector('a[download="micro-lab-gram-evidence.txt"]')).toBeNull();
    expect(download.revokeUrl).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000));
    expect(download.revokeUrl).toHaveBeenCalledWith('blob:gram-evidence');
    write('A later working note.');
    expect(lab().querySelector('#micro-gram-download-status').textContent).toBe('');
    expect(button('Download Gram evidence report')).toBe(control);
  });

  it('downloads note-only and partial investigations without leaking unobserved stage results', () => {
    mount(); expect(button('Download Gram evidence report').disabled).toBe(true);
    write('I wonder when the model colors will first differ.');
    const download = captureDownload(); click('Download Gram evidence report');
    expect(download.contents[0]).toContain('No report has been saved.');
    expect(download.contents[0]).toContain('No prediction selected.');
    expect(download.contents[0]).toContain('No staining stages have been observed');
    choose('prediction', 'both'); click(stages()[1]); click(stages()[2]);
    click('Download Gram evidence report');
    const partial = download.contents[1];
    expect(partial).toContain('Stages observed in the current investigation: 2/4');
    expect(partial).toContain('1. Crystal violet: Model A — Purple; Model B — Purple');
    expect(partial).toContain('2. Iodine: Model A — Purple; Model B — Purple');
    expect(partial).not.toContain('3. Decolorization:');
    expect(partial).not.toContain('4. Safranin counterstain:');
    expect(partial).not.toContain('allow the complex to wash out');
    act(() => vi.runOnlyPendingTimers()); expect(download.revokeUrl).toHaveBeenCalledTimes(2);
  });

  it('preserves a legacy saved report after restart and JSON remount without inventing draft observations', () => {
    mount({ gramStep: 3 }); click(stages()[4]); choose('interpretation', 'wall'); write('My legacy report with no initial prediction.'); click('Save Gram-stain report');
    const record = JSON.parse(JSON.stringify(mounted.state.gramInvestigation.record));
    click('Start a new investigation');
    const download = captureDownload(); click('Download Gram evidence report');
    const first = download.contents[0], [saved, working] = first.split('Current working notes');
    expect(saved).toContain('No prediction was saved for this earlier observation.');
    expect(saved).toContain(record.explanation);
    expect(working).toContain('No prediction selected.');
    expect(working).toContain('Stages observed in the current investigation: 0/4');
    expect(working).not.toContain('1. Crystal violet:');
    const restored = JSON.parse(JSON.stringify(mounted.state));
    unmount(); mount(restored); click('Download Gram evidence report');
    expect(download.contents[1]).toBe(first);
    expect(mounted.state.gramInvestigation.record).toEqual(record);
    expect(lab().querySelectorAll('[data-gram-change]')).toHaveLength(2);
    act(() => vi.runOnlyPendingTimers());
  });

  it.each(['create', 'click'])('reports a %s download failure and cleans up without changing evidence', failure => {
    mount({ gramInvestigation: { prediction: 'thin', explanation: 'An unfinished question.' } });
    const download = captureDownload(), before = JSON.stringify(mounted.state);
    if (failure === 'create') download.createUrl.mockImplementation(() => { throw new Error('URL unavailable'); });
    else download.clickSpy.mockImplementation(() => { throw new Error('Download blocked'); });
    click('Download Gram evidence report');
    expect(lab().querySelector('#micro-gram-download-status').textContent).toContain('The report download could not start.');
    expect(JSON.stringify(mounted.state)).toBe(before);
    expect(document.querySelector('a[download="micro-lab-gram-evidence.txt"]')).toBeNull();
    act(() => vi.runOnlyPendingTimers());
    expect(download.revokeUrl).toHaveBeenCalledTimes(failure === 'click' ? 1 : 0);
  });
});

describe('Gram saved report history', { timeout: 20000 }, () => {
  const original = { prediction: 'thin', interpretation: 'wall', explanation: 'My first explanation, after the observation contradicted my prediction.' };
  const revised = { prediction: 'both', interpretation: 'wall', explanation: 'My revised explanation of dye retention.' };

  it('keeps the previous report through editing, restart, section changes and JSON reload', () => {
    mount({ gramInvestigation: { ...original, record: original, step: 4, maxStep: 4 }, growthLab: { hypothesis: 'Keep independent work.' } });
    write(revised.explanation); click('Save Gram-stain report');
    const current = { ...original, explanation: revised.explanation };
    expect(mounted.state.gramInvestigation).toMatchObject({ record: current, previousRecord: original });
    const history = lab().querySelector('#micro-gram-history');
    expect(history.tagName).toBe('DETAILS'); expect(history.open).toBe(false);
    click(history.querySelector('summary')); expect(history.open).toBe(true);
    write('Working notes after saving.');
    expect(lab().querySelector('#micro-gram-history')).toBe(history); expect(history.open).toBe(true);
    expect(history.querySelector('[data-gram-previous-field="explanation"]').textContent).toContain(original.explanation);
    click('Start a new investigation');
    expect(mounted.state.gramInvestigation).toMatchObject({ record: current, previousRecord: original, step: 0, maxStep: 0, explanation: '' });
    const persisted = JSON.parse(JSON.stringify(mounted.state));
    tab('home'); tab('bacteria');
    expect(mounted.state.gramInvestigation).toEqual(persisted.gramInvestigation);
    unmount(); mount(persisted);
    expect(lab().querySelector('[data-gram-previous-field="explanation"]').textContent).toContain(original.explanation);
    expect(lab().querySelector('#micro-gram-history-status').textContent).toBe('');
    expect(mounted.state.growthLab).toEqual(persisted.growthLab);
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('previews and restores the previous report while retaining unfinished notes and stages', () => {
    vi.useFakeTimers();
    const draft = { prediction: 'neither', interpretation: 'shape', explanation: 'My unfinished <script>literal</script> draft.', step: 2, maxStep: 3 };
    mount({ gramInvestigation: { ...draft, record: revised, previousRecord: original }, growthReviewHour: 6 });
    const history = lab().querySelector('#micro-gram-history'); click(history.querySelector('summary'));
    expect(history.textContent).toContain(original.explanation); expect(history.textContent).toContain('Only model B');
    click('Restore previous Gram report'); act(() => vi.runOnlyPendingTimers());
    expect(mounted.state.gramInvestigation).toEqual({ ...draft, record: original, previousRecord: revised });
    expect(document.activeElement.id).toBe('micro-gram-record-heading');
    const status = lab().querySelector('#micro-gram-history-status'), notice = status.firstChild;
    expect(status.getAttribute('role')).toBe('status'); expect(status.getAttribute('aria-live')).toBe('polite'); expect(status.getAttribute('aria-atomic')).toBe('true');
    expect(status.textContent).toContain('Your working notes and observed stages were kept.');
    expect(history.open).toBe(true); expect(lab().querySelector('#micro-gram-history')).toBe(history);
    expect(button('Save Gram-stain report').disabled).toBe(true);
    click('Restore previous Gram report'); act(() => vi.runOnlyPendingTimers());
    expect(mounted.state.gramInvestigation).toEqual({ ...draft, record: revised, previousRecord: original });
    expect(status.firstChild).not.toBe(notice);
    expect(mounted.state.growthReviewHour).toBe(6); expect(mounted.awardXP).not.toHaveBeenCalled();
    const saved = JSON.parse(JSON.stringify(mounted.state)); unmount(); mount(saved);
    expect(lab().querySelector('#micro-gram-history-status').textContent).toBe('');
  });

  it('exports current, previous and unfinished evidence separately without a historical stage log', () => {
    const legacy = { prediction: '', interpretation: 'wall', explanation: '<img src=x> Legacy explanation.\nSecond line.' };
    const draft = 'Working notes that have not replaced either saved report.';
    mount({ gramInvestigation: { record: revised, previousRecord: legacy, explanation: draft, step: 99, maxStep: 99 } });
    const before = JSON.stringify(mounted.state), download = captureDownload();
    click('Download Gram evidence report');
    const [current, rest] = download.contents[0].split('Previous saved Gram-stain report (available to restore)');
    const [previous, working] = rest.split('Current working notes');
    expect(current).toContain(revised.explanation); expect(current).not.toContain(legacy.explanation); expect(current).not.toContain(draft);
    expect(previous).toContain(legacy.explanation); expect(previous).toContain('No prediction was saved for this earlier observation.');
    expect(previous).toContain('It does not store a historical log of observed stages.'); expect(previous).not.toContain(draft);
    expect(working).toContain(draft); expect(working).toContain('Stages observed in the current investigation: 0/4');
    expect(working).not.toContain('1. Crystal violet:');
    expect(lab().querySelector('[data-gram-previous-report] img')).toBeNull();
    expect(JSON.stringify(mounted.state)).toBe(before); expect(mounted.awardXP).not.toHaveBeenCalled();
    const persisted = JSON.parse(before); unmount(); mount(persisted); click('Download Gram evidence report');
    expect(download.contents[1]).toBe(download.contents[0]);
    act(() => vi.runOnlyPendingTimers()); expect(download.revokeUrl).toHaveBeenCalledTimes(2);
  });

  it.each(['focus', 'draft', 'stage', 'download', 'active tab', 'topic library', 'away and back'])('cancels queued restore focus after a later %s action', action => {
    vi.useFakeTimers();
    mount({ gramInvestigation: { ...revised, record: revised, previousRecord: original, step: 2, maxStep: 4 } });
    click(lab().querySelector('#micro-gram-history summary')); click('Restore previous Gram report');
    let target;
    if (action === 'focus' || action === 'draft') {
      target = lab().querySelector('#micro-gram-explanation'); act(() => target.focus());
      if (action === 'draft') write('A later learner action.');
    } else if (action === 'stage') { target = stages()[1]; act(() => target.focus()); click(target); }
    else if (action === 'download') { captureDownload(); target = button('Download Gram evidence report'); act(() => target.focus()); click(target); }
    else if (action === 'active tab') { target = mounted.container.querySelector('#micro-tab-bacteria'); act(() => target.focus()); click(target); }
    else if (action === 'topic library') { target = mounted.container.querySelector('.micro-library-toggle'); act(() => target.focus()); click(target); }
    else { tab('home'); tab('bacteria'); target = mounted.container.querySelector('#micro-tab-bacteria'); act(() => target.focus()); }
    act(() => vi.runOnlyPendingTimers());
    expect(document.activeElement).toBe(target);
    expect(mounted.state.gramInvestigation.record).toEqual(original);
    expect(mounted.state.gramInvestigation.previousRecord).toEqual(revised);
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('cancels queued save and restart focus when the learner moves to another control', () => {
    vi.useFakeTimers(); mount({ gramInvestigation: { ...revised, step: 4, maxStep: 4 } });
    click('Save Gram-stain report');
    const textarea = lab().querySelector('#micro-gram-explanation'); act(() => textarea.focus());
    act(() => vi.runOnlyPendingTimers()); expect(document.activeElement).toBe(textarea);
    click('Start a new investigation');
    const topic = mounted.container.querySelector('.micro-library-toggle'); act(() => topic.focus()); click(topic);
    act(() => vi.runOnlyPendingTimers()); expect(document.activeElement).toBe(topic);
    expect(mounted.state.gramInvestigation.record).toEqual(revised);
  });
});
