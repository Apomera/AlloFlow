import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let tool, mounted;
const answers = { pond: 'protist', budding: 'yeast', wall: 'bacterium', salt: 'archaeon', particle: 'phage', unresolved: 'unresolved' };
const act = React.act;
const priorAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab(); tool = loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology');
});
afterEach(() => {
  if (mounted) { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  globalThis.IS_REACT_ACT_ENVIRONMENT = priorAct;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const core = () => window.__MicrobiologyCore.mystery;
function mount(seed = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const view = { container, root: ReactDOMClient.createRoot(container), state: null, awardXP: vi.fn() };
  function Host() {
    const [data, setData] = React.useState({ microbiology: { tab: 'mystery', ...seed } });
    view.state = data.microbiology;
    return tool.render(makeCtx({ toolData: data, setToolData: setData, awardXP: view.awardXP }));
  }
  mounted = view; act(() => view.root.render(React.createElement(Host))); return view;
}
function button(text) {
  const node = [...mounted.container.querySelectorAll('button')].find(n => n.textContent.trim() === text);
  expect(node, text).toBeTruthy(); return node;
}
function click(node) { act(() => (typeof node === 'string' ? button(node) : node).click()); }
function choice(name, value) { click(mounted.container.querySelector(`input[name="${name}"][value="${value}"]`)); }
function write(text) {
  const node = mounted.container.querySelector('#micro-mystery-reasoning');
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(node, text);
    node.dispatchEvent(new Event('input', { bubbles: true }));
  }); return node;
}
function openCase(id) {
  const index = core().ids.indexOf(id); click(mounted.container.querySelectorAll('.micro-mystery-cases button')[index]);
}
function build(id) {
  openCase(id);
  click('Reveal: Size and shape'); click('Reveal: Cell structure and chemistry'); click('Reveal: Behavior and reproduction');
  choice('micro-mystery-claim', answers[id]);
  choice('micro-mystery-evidence', 'structure'); choice('micro-mystery-evidence', 'behavior');
  choice('micro-mystery-limitation', 'bounded');
  write('The supplied structure and behavior together support this group; the species remains unknown.');
}
const data = () => mounted.state.mysteryLab;
function captureReportDownload(url) {
  const contents = [];
  const NativeBlob = globalThis.Blob, NativeURL = globalThis.URL;
  class CapturedBlob extends NativeBlob {
    constructor(parts, options) { super(parts, options); contents.push(parts.join('')); }
  }
  class CapturedURL extends NativeURL {}
  Object.defineProperties(CapturedURL, {
    createObjectURL: { configurable: true, writable: true, value: vi.fn(() => url) },
    revokeObjectURL: { configurable: true, writable: true, value: vi.fn() }
  });
  vi.stubGlobal('Blob', CapturedBlob);
  vi.stubGlobal('URL', CapturedURL);
  const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  vi.useFakeTimers();
  return { contents, clickSpy, createUrl: CapturedURL.createObjectURL, revokeUrl: CapturedURL.revokeObjectURL };
}

describe('Mystery specimen evidence reasoning', { timeout: 20000 }, () => {
  it('requires distinguishing evidence and a bounded conclusion for every fictional case', () => {
    for (const [id, claim] of Object.entries(answers)) {
      const input = { claim, evidence: ['structure', 'behavior'], limitation: 'bounded', reasoning: 'Reasoned explanation.' };
      expect(core().evaluate(id, input).canRecord).toBe(true);
      expect(core().evaluate(id, { ...input, evidence: ['context', 'size'] }).code).toBe('evidence');
      expect(core().evaluate(id, { ...input, limitation: 'safe' }).code).toBe('limit');
      expect(core().evaluate(id, { ...input, limitation: 'species' }).code).toBe('limit');
      expect(core().evaluate(id, { ...input, reasoning: '  ' }).code).toBe('reasoning');
    }
  });
  it('allows uncertainty when bacteria and archaea cannot be distinguished', () => {
    const entry = { evidence: ['structure', 'behavior'], limitation: 'bounded', reasoning: 'Membrane or sequence data would distinguish them.' };
    expect(core().evaluate('unresolved', { ...entry, claim: 'bacterium' }).code).toBe('claim');
    expect(core().evaluate('unresolved', { ...entry, claim: 'archaeon' }).code).toBe('claim');
    expect(core().evaluate('unresolved', { ...entry, claim: 'unresolved' }).canRecord).toBe(true);
  });
  it('normalizes malformed state and prevents citing unrevealed observations', () => {
    for (const value of [null, [], 4, 'bad']) {
      const normalized = core().normalize(value);
      expect(normalized.active).toBe('pond'); expect(normalized.cases.pond.record).toBeNull();
    }
    const result = core().normalize({ active: '__proto__', cases: { pond: { revealed: ['context', 'context', 'bogus'], evidence: ['size', 'structure'], claim: {}, reasoning: 'x'.repeat(1800), record: { claim: 'protist' } } } });
    expect(result.cases.pond.evidence).toEqual([]);
    expect(result.cases.pond.reasoning).toHaveLength(1600);
    expect(result.cases.pond.record).toBeNull();
    expect(core().normalize(result)).toEqual(result);
  });
  it('revises an unsupported claim without losing the learner’s explanation', () => {
    mount();
    expect(button('Check my evidence').disabled).toBe(true);
    expect(mounted.container.querySelector('input[name="micro-mystery-evidence"][value="structure"]').disabled).toBe(true);
    click('Reveal: Cell structure and chemistry'); click('Reveal: Behavior and reproduction');
    choice('micro-mystery-claim', 'bacterium'); choice('micro-mystery-evidence', 'structure'); choice('micro-mystery-evidence', 'behavior');
    choice('micro-mystery-limitation', 'bounded'); write('I thought all microbes were bacteria.');
    click('Check my evidence'); expect(mounted.container.textContent).toContain('Reconsider the classification');
    expect(button('Record specimen report').disabled).toBe(true);
    choice('micro-mystery-claim', 'protist');
    expect(mounted.container.querySelector('#micro-mystery-reasoning').value).toBe('I thought all microbes were bacteria.');
    expect(button('Record specimen report').disabled).toBe(true); // recheck changed evidence
    click('Check my evidence'); expect(button('Record specimen report').disabled).toBe(false);
  });
  it('records every case through the actual controls and preserves drafts across cases', () => {
    mount();
    for (const id of core().ids) {
      build(id); click('Check my evidence'); click('Record specimen report');
      expect(data().cases[id].record.claim).toBe(answers[id]);
    }
    expect(mounted.container.textContent).toContain('6/6 reports recorded');
    expect(mounted.container.textContent).toContain('All six reports are recorded. You can review your evidence and download the reports.');
    openCase('pond');
    expect(mounted.container.querySelector('#micro-mystery-reasoning').value).toContain('supplied structure');
  });
  it('keeps the recorded snapshot intact until a valid replacement is explicitly recorded', () => {
    mount(); build('wall'); click('Check my evidence'); click('Record specimen report');
    const original = JSON.parse(JSON.stringify(data().cases.wall.record));
    const node = write('<img src=x onerror=alert(1)> a draft revision');
    expect(mounted.container.querySelector('#micro-mystery-reasoning')).toBe(node);
    expect(data().cases.wall.record).toEqual(original);
    expect(mounted.container.querySelector('.micro-mystery-record').textContent).toContain(original.reasoning);
    expect(mounted.container.querySelector('img')).toBeNull();
    click('Check my evidence'); click('Update recorded report');
    expect(data().cases.wall.record.reasoning).toContain('<img');
  });
  it('restores incomplete work and recorded reports after section changes and JSON reload', () => {
    mount(); build('unresolved'); click('Check my evidence'); click('Record specimen report');
    write('A revised draft asks for DNA-sequence evidence.');
    click('Practice with the microscope');
    click(mounted.container.querySelector('#micro-tab-mystery'));
    expect(mounted.container.querySelector('#micro-mystery-reasoning').value).toContain('revised draft');
    const restored = JSON.parse(JSON.stringify(mounted.state));
    act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null;
    mount(restored);
    expect(data()).toEqual(restored.mysteryLab);
    expect(mounted.container.querySelector('.micro-mystery-record')).toBeTruthy();
  });
  it('exports both original reports and current drafts without revealing unobserved case answers', () => {
    mount(); build('pond'); click('Check my evidence'); click('Record specimen report');
    const savedReport = JSON.parse(JSON.stringify(data().cases.pond.record));
    choice('micro-mystery-evidence', 'behavior');
    choice('micro-mystery-evidence', 'size');
    choice('micro-mystery-limitation', 'species');
    write('My revision is still in progress.');
    const download = captureReportDownload('blob:mystery-test');
    click('Download specimen reports');
    const text = download.contents[0];
    act(() => vi.advanceTimersByTime(1000));
    expect(download.revokeUrl).toHaveBeenCalledWith('blob:mystery-test');
    expect(text).toContain('Recorded claim: Ciliated protist');
    expect(text).toContain('My revision is still in progress.');
    expect(text).toContain('Revision status: Working notes contain revisions that have not replaced the recorded report.');
    const [recorded, working] = text.split('Current working notes');
    expect(recorded).toContain('The supplied cell map shows membrane-bound compartments');
    expect(recorded).toContain('many cilia beat together');
    expect(recorded).toContain('species and safety remain unknown.');
    expect(recorded).not.toContain('These observations establish the exact species.');
    expect(working).toContain('Current cited observations: Size and shape; Cell structure and chemistry');
    expect(working).not.toContain('Current cited observations: Cell structure and chemistry; Behavior and reproduction');
    expect(working).toContain('Current conclusion about limits: These observations establish the exact species.');
    expect(working).toContain('Revealed observations:\nSample context:');
    expect(data().cases.pond.record).toEqual(savedReport);
    expect(text).not.toContain('Beyond appearances');
    expect(download.clickSpy).toHaveBeenCalledOnce();
  });

  it('downloads a limitation-only draft even before a classification or explanation is chosen', () => {
    mount();
    expect(button('Download specimen reports').disabled).toBe(true);
    choice('micro-mystery-limitation', 'safe');
    expect(button('Download specimen reports').disabled).toBe(false);
    const download = captureReportDownload('blob:mystery-limits');
    click('Download specimen reports');
    const text = download.contents[0];
    act(() => vi.advanceTimersByTime(1000));
    expect(download.revokeUrl).toHaveBeenCalledWith('blob:mystery-limits');
    expect(text).toContain('A · Freshwater drifter');
    expect(text).toContain('My classification: No claim yet');
    expect(text).toContain('Current cited observations: No observations selected');
    expect(text).toContain('Current conclusion about limits: Knowing the group proves this sample is safe to handle or eat.');
    expect(text).not.toContain('Recorded claim:');
    expect(text).not.toContain('The supplied cell map shows');
    expect(text).not.toContain('A growing neighbor');
  });
});

describe('Mystery download feedback and retries', { timeout: 20000 }, () => {
  const current = { claim: 'bacterium', evidence: ['size', 'structure'], reasoning: 'Current report.\n<script>Keep this literal.</script>', limitation: 'bounded' };
  const previous = { claim: 'bacterium', evidence: ['structure', 'behavior'], reasoning: 'Previous report.\n<img src=x> stays text.', limitation: 'bounded' };
  const working = 'Unfinished working notes.\nThe original reports stay separate.';
  function seed(view = 'recorded') {
    return { mysteryLab: { active: 'wall', notice: 'download_failed', restoredMetadata: { keep: true }, cases: {
      wall: { revealed: ['context'], collapsed: ['context'], reportView: view, claim: 'archaeon', evidence: ['context'],
        reasoning: working, limitation: 'species', checked: true, record: current, previousRecord: previous },
      pond: { revealed: ['context'], reasoning: 'A separate unfinished case.' }
    } }, growthReviewHour: 17, growthHypothesis: 'Keep this unrelated draft.' };
  }
  const status = () => mounted.container.querySelector('#micro-mystery-download-status');
  const control = () => mounted.container.querySelector('#micro-mystery-download');

  it.each(['create', 'click'])('announces repeated %s failures and a successful retry without changing any restored work', failure => {
    mount(seed());
    const before = JSON.stringify(mounted.state), download = captureReportDownload('blob:mystery-retry');
    const buttonBefore = control();
    expect(status().textContent).toBe('');
    expect(mounted.container.querySelector('[data-mystery-notice="download_failed"]')).toBeNull();
    expect(mounted.container.textContent).not.toContain('The download could not start.');
    expect(core().normalize(data()).notice).toBe('download_failed');
    const fail = () => {
      const mock = failure === 'create' ? download.createUrl : download.clickSpy;
      mock.mockImplementationOnce(() => { throw new Error('Download unavailable'); });
    };
    fail(); act(() => buttonBefore.focus()); click(buttonBefore);
    const firstAnnouncement = status().firstElementChild;
    expect(status().textContent).toContain('The download could not start.');
    expect(status().getAttribute('role')).toBe('status');
    expect(status().getAttribute('aria-live')).toBe('polite');
    expect(status().getAttribute('aria-atomic')).toBe('true');
    expect(document.activeElement).toBe(buttonBefore);
    expect(JSON.stringify(mounted.state)).toBe(before);
    expect(document.querySelector('a[download="micro-lab-specimen-reports.txt"]')).toBeNull();
    fail(); click(buttonBefore);
    expect(status().firstElementChild).not.toBe(firstAnnouncement);
    expect(status().textContent).toContain('try again');
    expect(JSON.stringify(mounted.state)).toBe(before);
    click(buttonBefore);
    expect(status().textContent).toContain('The specimen report download has started.');
    expect(status().textContent).not.toContain('could not start');
    expect(mounted.container.textContent).not.toContain('The download could not start.');
    expect(control()).toBe(buttonBefore);
    expect(document.activeElement).toBe(buttonBefore);
    expect(JSON.stringify(mounted.state)).toBe(before);
    expect(mounted.awardXP).not.toHaveBeenCalled();
    expect(download.createUrl).toHaveBeenCalledTimes(3);
    expect(document.querySelector('a[download="micro-lab-specimen-reports.txt"]')).toBeNull();
    expect(download.revokeUrl).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000));
    expect(download.revokeUrl).toHaveBeenCalledTimes(failure === 'create' ? 1 : 3);
    expect(download.revokeUrl).toHaveBeenCalledWith('blob:mystery-retry');
  });

  it('announces each successful download while keeping the control, history and literal exported text stable', () => {
    mount(seed());
    const before = JSON.stringify(mounted.state), download = captureReportDownload('blob:mystery-repeat');
    const buttonBefore = control();
    act(() => buttonBefore.focus()); click(buttonBefore);
    const firstAnnouncement = status().firstElementChild;
    click(buttonBefore);
    expect(status().firstElementChild).not.toBe(firstAnnouncement);
    expect(status().textContent).toContain('download has started');
    expect(control()).toBe(buttonBefore);
    expect(document.activeElement).toBe(buttonBefore);
    expect(download.contents).toHaveLength(2);
    expect(download.contents[1]).toBe(download.contents[0]);
    const [saved, rest] = download.contents[0].split('Previous recorded report (available to restore)');
    const [prior, draft] = rest.split('Current working notes');
    expect(saved).toContain(current.reasoning); expect(saved).not.toContain(previous.reasoning);
    expect(prior).toContain(previous.reasoning); expect(prior).not.toContain(working);
    expect(draft).toContain(working);
    expect(draft).toContain('Revealed observations:\nSample context:');
    expect(draft).not.toContain('The supplied cell map has no membrane-bound nucleus.');
    expect(download.contents[0]).not.toContain('A dependent particle');
    expect(JSON.stringify(mounted.state)).toBe(before);
    expect(mounted.awardXP).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000));
    expect(download.revokeUrl).toHaveBeenCalledTimes(2);
  });

  it.each(['success', 'failure'])('clears %s feedback after an evidence edit and does not revive it when the text is restored', outcome => {
    mount(seed('working'));
    const download = captureReportDownload('blob:mystery-edits');
    if (outcome === 'failure') download.clickSpy.mockImplementationOnce(() => { throw new Error('Blocked'); });
    click(control());
    expect(status().textContent).not.toBe('');
    write('Changed working notes.');
    expect(status().textContent).toBe('');
    write(working);
    expect(status().textContent).toBe('');
    expect(data().cases.wall.record).toEqual(current);
    expect(data().cases.wall.previousRecord).toEqual(previous);
    const beforeRetry = JSON.stringify(mounted.state);
    click(control());
    expect(status().textContent).toContain('download has started');
    expect(JSON.stringify(mounted.state)).toBe(beforeRetry);
    act(() => vi.advanceTimersByTime(1000));
    expect(download.revokeUrl).toHaveBeenCalledTimes(2);
  });

  it.each(['case', 'section', 'JSON remount'])('keeps transient download feedback cleared after going away and back through %s', navigation => {
    mount(seed());
    const download = captureReportDownload('blob:mystery-navigation');
    click(control());
    expect(status().textContent).toContain('download has started');
    if (navigation === 'case') {
      openCase('pond'); expect(status().textContent).toBe(''); openCase('wall');
    } else if (navigation === 'section') {
      click(mounted.container.querySelector('#micro-tab-home'));
      click(mounted.container.querySelector('#micro-tab-mystery'));
    } else {
      const restored = JSON.parse(JSON.stringify(mounted.state));
      act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; mount(restored);
    }
    expect(status().textContent).toBe('');
    expect(mounted.container.textContent).not.toContain('The download could not start.');
    expect(data().cases.wall.record).toEqual(current);
    expect(data().cases.wall.previousRecord).toEqual(previous);
    expect(data().cases.wall.reasoning).toBe(working);
    expect(data().cases.wall.reportView).toBe('recorded');
    expect(data().cases.wall.revealed).toEqual(['context']);
    expect(data().cases.wall.collapsed).toEqual(['context']);
    expect(data().cases.wall.checked).toBe(true);
    const beforeRetry = JSON.stringify(mounted.state);
    click(control());
    expect(status().textContent).toContain('download has started');
    expect(JSON.stringify(mounted.state)).toBe(beforeRetry);
    expect(mounted.awardXP).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000));
    expect(download.revokeUrl).toHaveBeenCalledTimes(2);
  });

  it('keeps the report download unavailable for an untouched case without creating a URL or changing state', () => {
    mount();
    const before = JSON.stringify(mounted.state), download = captureReportDownload('blob:mystery-empty');
    expect(control().disabled).toBe(true);
    click(control());
    expect(status().textContent).toBe('');
    expect(download.createUrl).not.toHaveBeenCalled();
    expect(download.clickSpy).not.toHaveBeenCalled();
    expect(JSON.stringify(mounted.state)).toBe(before);
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });
});

describe('Mystery reports and pending revisions', { timeout: 20000 }, () => {
  it('compares report content independently of evidence order, visibility, checks, and view selection', () => {
    const record = { claim: 'protist', evidence: ['structure', 'behavior'], reasoning: 'Nuclei and cilia support a protist.', limitation: 'bounded' };
    const entry = { ...record, record, evidence: ['behavior', 'structure'], revealed: ['context', 'structure', 'behavior'], collapsed: ['structure'], checked: false, reportView: 'recorded' };
    expect(core().reportChanges(entry)).toEqual([]);
    expect(core().hasPendingRevision(entry)).toBe(false);
    expect(core().reportChanges({ ...entry, claim: 'bacterium', evidence: ['size'], reasoning: 'Revised wording.', limitation: 'safe' })).toEqual(['claim', 'evidence', 'reasoning', 'limitation']);
    expect(core().reportChanges({ ...entry, reasoning: 'Revised wording.' })).toEqual(['reasoning']);
    for (const value of [null, {}, [], 'bad']) expect(core().hasPendingRevision(value)).toBe(false);
  });

  it('shows pending revisions clearly and prevents redundant report updates', () => {
    mount(); build('pond'); click('Check my evidence'); click('Record specimen report');
    expect(button('Update recorded report').disabled).toBe(true);
    expect(mounted.container.querySelector('[data-mystery-pending]').getAttribute('data-mystery-pending')).toBe('false');
    write('Nuclei and coordinated cilia support a protist, but not its exact species.');
    expect(core().reportChanges(data().cases.pond)).toEqual(['reasoning']);
    expect(mounted.container.textContent).toContain('Your working notes are saved, but these revisions have not replaced the recorded report');
    expect(mounted.container.textContent).toContain('Changed: written reasoning');
    expect(mounted.container.textContent).toContain('Reports with pending revisions: 1');
    expect(mounted.container.querySelector('.micro-mystery-cases button').textContent).toContain('Report recorded · revisions pending');
    click('Check my evidence'); click('Update recorded report');
    expect(core().hasPendingRevision(data().cases.pond)).toBe(false);
    expect(mounted.container.textContent).not.toContain('Reports with pending revisions: 1');
    expect(button('Update recorded report').disabled).toBe(true);
  });

  it('reviews the complete recorded evidence without copying it over unfinished working notes', () => {
    mount(); build('wall'); click('Check my evidence'); click('Record specimen report');
    const record = JSON.parse(JSON.stringify(data().cases.wall.record));
    write('An unfinished alternative explanation.');
    choice('micro-mystery-claim', 'archaeon');
    choice('micro-mystery-evidence', 'behavior');
    choice('micro-mystery-limitation', 'species');
    const working = JSON.parse(JSON.stringify(data().cases.wall));
    vi.useFakeTimers();
    click('Recorded report');
    act(() => vi.runOnlyPendingTimers());
    expect(button('Recorded report').getAttribute('aria-pressed')).toBe('true');
    expect(button('Working notes').getAttribute('aria-pressed')).toBe('false');
    expect(document.activeElement.id).toBe('micro-mystery-report-heading');
    expect(mounted.container.querySelector('#micro-mystery-reasoning')).toBeNull();
    const savedView = mounted.container.querySelector('[data-recorded-report="wall"]');
    expect(savedView.textContent).toContain('Recorded claim: Bacterium');
    expect(savedView.textContent).toContain('Chemical analysis detects peptidoglycan');
    expect(savedView.textContent).toContain('cells dividing into two');
    expect(savedView.textContent).toContain(record.reasoning);
    expect(savedView.textContent).not.toContain('An unfinished alternative explanation');
    expect(savedView.textContent).toContain('species and safety remain unknown');
    expect(data().cases.wall).toEqual({ ...working, reportView: 'recorded' });
    click('Working notes');
    act(() => vi.runOnlyPendingTimers());
    expect(data().cases.wall).toEqual({ ...working, reportView: 'working' });
    expect(mounted.container.querySelector('#micro-mystery-reasoning').value).toBe(working.reasoning);
    expect(mounted.container.querySelector('input[name="micro-mystery-claim"][value="archaeon"]').checked).toBe(true);
    expect(mounted.container.querySelector('input[name="micro-mystery-limitation"][value="species"]').checked).toBe(true);
    expect(data().cases.wall.record).toEqual(record);
  });

  it('uses real show/hide controls without losing revealed observations, citations or recorded progress', () => {
    mount(); build('pond'); click('Check my evidence'); click('Record specimen report');
    const control = button('Hide: Cell structure and chemistry');
    const panel = mounted.container.querySelector('#' + control.getAttribute('aria-controls'));
    expect(panel.getAttribute('aria-labelledby')).toBe(control.id);
    expect(panel.getAttribute('role')).toBe('region');
    expect(panel.hidden).toBe(false);
    click(control);
    expect(button('Show: Cell structure and chemistry').getAttribute('aria-expanded')).toBe('false');
    expect(panel.hidden).toBe(true);
    expect(data().cases.pond.revealed).toHaveLength(4);
    expect(data().cases.pond.evidence).toContain('structure');
    expect(data().cases.pond.collapsed).toContain('structure');
    const cited = mounted.container.querySelector('input[name="micro-mystery-evidence"][value="structure"]');
    expect(cited.disabled).toBe(false); expect(cited.checked).toBe(true);
    expect(core().hasPendingRevision(data().cases.pond)).toBe(false);
    expect(mounted.container.textContent).toContain('1/6 reports recorded');
    click('Show: Cell structure and chemistry');
    expect(button('Hide: Cell structure and chemistry').getAttribute('aria-expanded')).toBe('true');
    expect(panel.hidden).toBe(false);
  });

  it('preserves recorded review and collapsed evidence through case changes and JSON reload', () => {
    mount(); build('unresolved'); click('Check my evidence'); click('Record specimen report');
    write('Request membrane or DNA-sequence evidence before narrowing the group.');
    click('Hide: Cell structure and chemistry');
    click('Recorded report');
    const entry = JSON.parse(JSON.stringify(data().cases.unresolved));
    openCase('pond'); openCase('unresolved');
    expect(data().cases.unresolved).toEqual(entry);
    expect(mounted.container.querySelector('[data-recorded-report="unresolved"]')).toBeTruthy();
    expect(button('Show: Cell structure and chemistry').getAttribute('aria-expanded')).toBe('false');
    const saved = JSON.parse(JSON.stringify(mounted.state));
    act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null;
    mount(saved);
    expect(data().cases.unresolved).toEqual(entry);
    expect(button('Recorded report').getAttribute('aria-pressed')).toBe('true');
    click('Working notes');
    expect(mounted.container.querySelector('#micro-mystery-reasoning').value).toBe(entry.reasoning);
  });

  it('normalizes invalid recorded-view and collapsed-observation settings without fabricating revealed evidence', () => {
    const clean = core().normalize({ cases: { pond: { reportView: 'recorded', collapsed: ['structure', 'context', 'bogus'] } } });
    expect(clean.cases.pond.reportView).toBe('working');
    expect(clean.cases.pond.collapsed).toEqual(['context']);
    expect(clean.cases.pond.revealed).toEqual(['context']);
    expect(clean.cases.pond.record).toBeNull();
    expect(core().normalize(clean)).toEqual(clean);
  });

  it('guides learners to the next unrecorded case without changing their report or unfinished revision', () => {
    mount(); build('pond'); click('Check my evidence'); click('Record specimen report');
    write('A pending revision stays with case A.');
    const first = JSON.parse(JSON.stringify(data().cases.pond));
    vi.useFakeTimers();
    click('Next unrecorded case: B · A growing neighbor');
    act(() => vi.runOnlyPendingTimers());
    expect(data().active).toBe('budding');
    expect(data().cases.pond).toEqual(first);
    expect(document.activeElement.id).toBe('micro-mystery-observation-heading');
    expect(document.activeElement.getAttribute('data-case')).toBe('budding');
    expect(mounted.container.querySelector('#micro-mystery-reasoning').value).toBe('');
  });
  it('does not apply a queued view focus request to a newly reopened mystery panel', () => {
    mount(); build('pond'); click('Check my evidence'); click('Record specimen report');
    vi.useFakeTimers();
    click('Recorded report');
    click('Practice with the microscope');
    const mysteryTab = mounted.container.querySelector('#micro-tab-mystery');
    mysteryTab.focus(); click(mysteryTab);
    const activeTab = mounted.container.querySelector('#micro-tab-mystery');
    activeTab.focus();
    act(() => vi.runOnlyPendingTimers());
    expect(document.activeElement).toBe(activeTab);
    expect(button('Recorded report').getAttribute('aria-pressed')).toBe('true');
  });

});

describe('Mystery pending revision navigation', { timeout: 20000 }, () => {
  function savedCases(active = 'unresolved', revised = ['pond', 'wall']) {
    const cases = {};
    for (const id of core().ids) {
      const record = { claim: answers[id], evidence: ['structure', 'behavior'], reasoning: 'Recorded reasoning for ' + id + '.', limitation: 'bounded' };
      cases[id] = {
        ...record, revealed: ['context', 'size', 'structure', 'behavior'], collapsed: ['structure'], checked: true, reportView: 'recorded',
        reasoning: revised.includes(id) ? 'Unfinished reasoning for ' + id + '.' : record.reasoning,
        record, previousRecord: { ...record, reasoning: 'Earlier recorded reasoning for ' + id + '.' }
      };
    }
    return core().normalize({ active, cases });
  }

  it('cycles through other pending reports after all cases are recorded and preserves all evidence', () => {
    vi.useFakeTimers();
    const initial = savedCases();
    mount({ mysteryLab: initial });
    const expected = JSON.parse(JSON.stringify(initial));
    expect(mounted.container.textContent).toContain('6/6 reports recorded');
    expect(mounted.container.textContent).toContain('All six reports are recorded. Some working notes still contain pending revisions');
    expect(mounted.container.textContent).not.toContain('Next unrecorded case:');
    for (const [id, name] of [['pond', 'A · Freshwater drifter'], ['wall', 'C · The wall is the clue'], ['pond', 'A · Freshwater drifter']]) {
      const next = button('Next report with working revisions: ' + name);
      expect(next.dataset.mysteryNextRevision).toBe(id);
      click(next); act(() => vi.runOnlyPendingTimers());
      expected.active = id;
      expected.cases[id].reportView = 'working';
      expect(data()).toEqual(expected);
      expect(document.activeElement.id).toBe('micro-mystery-report-heading');
      expect(document.activeElement.getAttribute('data-case')).toBe(id);
      expect(document.activeElement.getAttribute('data-report-view')).toBe('working');
      expect(mounted.container.querySelector('#micro-mystery-reasoning').value).toBe(initial.cases[id].reasoning);
      expect(button('Show: Cell structure and chemistry').getAttribute('aria-expanded')).toBe('false');
      expect(mounted.container.textContent).toContain('Reports with pending revisions: 2');
    }
  });

  it('does not offer the active revision or an unrecorded draft as another pending report', () => {
    const state = savedCases('pond', ['pond']);
    state.cases.budding.record = null;
    state.cases.budding.previousRecord = null;
    state.cases.budding.reasoning = 'An unrecorded working explanation.';
    state.cases.budding.reportView = 'working';
    mount({ mysteryLab: state });
    expect(mounted.container.querySelector('[data-mystery-next-revision]')).toBeNull();
    expect(button('Next unrecorded case: B · A growing neighbor')).toBeTruthy();
    expect(data()).toEqual(state);
  });

  it('does not focus a different case after a queued revision shortcut', () => {
    vi.useFakeTimers(); mount({ mysteryLab: savedCases() });
    click('Next report with working revisions: A · Freshwater drifter');
    openCase('budding');
    act(() => vi.runOnlyPendingTimers());
    expect(data().active).toBe('budding');
    expect(data().cases.budding.reportView).toBe('recorded');
    expect(document.activeElement.id).toBe('micro-mystery-observation-heading');
    expect(document.activeElement.getAttribute('data-case')).toBe('budding');
  });

  it('does not focus a newly reopened panel after a queued revision shortcut', () => {
    vi.useFakeTimers(); mount({ mysteryLab: savedCases() });
    click('Next report with working revisions: A · Freshwater drifter');
    click('Practice with the microscope');
    click(mounted.container.querySelector('#micro-tab-mystery'));
    const tab = mounted.container.querySelector('#micro-tab-mystery'); tab.focus();
    act(() => vi.runOnlyPendingTimers());
    expect(document.activeElement).toBe(tab);
    expect(data().active).toBe('pond');
    expect(button('Working notes').getAttribute('aria-pressed')).toBe('true');
  });
});

describe('Mystery revision comparisons', { timeout: 20000 }, () => {
  it('compares all changed report fields and complete evidence without mutating either version', () => {
    mount(); build('wall'); click('Check my evidence'); click('Record specimen report');
    const recorded = JSON.parse(JSON.stringify(data().cases.wall.record));
    choice('micro-mystery-claim', 'archaeon');
    choice('micro-mystery-evidence', 'behavior');
    choice('micro-mystery-limitation', 'safe');
    write('Unfinished revision.\n<img src=x onerror=alert(1)> stays plain text.');
    click('Hide: Cell structure and chemistry');
    const working = JSON.parse(JSON.stringify(data().cases.wall));
    const comparison = mounted.container.querySelector('[data-mystery-comparison="wall"]');
    expect(comparison.open).toBe(false);
    expect(comparison.querySelector('summary').textContent).toBe('Compare revisions');
    click(comparison.querySelector('summary'));
    expect(comparison.open).toBe(true);
    expect([...comparison.querySelectorAll('[data-mystery-change]')].map(node => node.dataset.mysteryChange)).toEqual(['claim', 'evidence', 'reasoning', 'limitation']);
    const value = (field, version) => comparison.querySelector(`[data-mystery-change="${field}"] [data-revision-version="${version}"]`);
    expect(value('claim', 'recorded').textContent).toContain('Bacterium');
    expect(value('claim', 'working').textContent).toContain('Archaeon');
    expect(value('evidence', 'recorded').querySelectorAll('li')).toHaveLength(2);
    expect(value('evidence', 'working').querySelectorAll('li')).toHaveLength(1);
    expect(value('evidence', 'recorded').textContent).toContain('cells dividing into two');
    expect(value('evidence', 'working').textContent).toContain('Chemical analysis detects peptidoglycan');
    expect(value('reasoning', 'recorded').textContent).toContain(recorded.reasoning);
    expect(value('reasoning', 'working').textContent).toContain(working.reasoning);
    expect(comparison.querySelector('img')).toBeNull();
    expect(value('limitation', 'recorded').textContent).toContain('species and safety remain unknown');
    expect(value('limitation', 'working').textContent).toContain('Knowing the group proves this sample is safe to handle or eat.');
    for (const field of comparison.querySelectorAll('[data-mystery-change]')) {
      expect(field.querySelector('h5').id).toBe(field.getAttribute('aria-labelledby'));
    }
    expect(comparison.querySelectorAll('input,textarea,button')).toHaveLength(0);
    expect(data().cases.wall).toEqual(working);
    click('Recorded report');
    expect(mounted.container.querySelector('[data-mystery-comparison="wall"]').open).toBe(true);
    expect(mounted.container.querySelector('[data-recorded-report="wall"]').textContent).not.toContain('Unfinished revision');
    expect(data().cases.wall).toEqual({ ...working, reportView: 'recorded' });
    expect(data().cases.wall.record).toEqual(recorded);
  });

  it('shows only changed fields, names empty revisions, and disappears after an explicit update', () => {
    mount(); build('pond'); click('Check my evidence'); click('Record specimen report');
    expect(mounted.container.querySelector('[data-mystery-comparison]')).toBeNull();
    write('');
    let comparison = mounted.container.querySelector('[data-mystery-comparison="pond"]');
    expect([...comparison.querySelectorAll('[data-mystery-change]')].map(node => node.dataset.mysteryChange)).toEqual(['reasoning']);
    expect(comparison.querySelector('[data-revision-version="working"]').textContent).toContain('No written reasoning yet.');
    choice('micro-mystery-evidence', 'structure'); choice('micro-mystery-evidence', 'behavior');
    comparison = mounted.container.querySelector('[data-mystery-comparison="pond"]');
    expect(comparison.querySelector('[data-mystery-change="evidence"] [data-revision-version="working"]').textContent).toContain('No observations selected');
    choice('micro-mystery-evidence', 'structure'); choice('micro-mystery-evidence', 'behavior');
    write('Nuclei and cilia together support a protist. The species remains unknown.');
    click('Check my evidence'); click('Update recorded report');
    expect(mounted.container.querySelector('[data-mystery-comparison]')).toBeNull();
    expect(core().hasPendingRevision(data().cases.pond)).toBe(false);
  });
});

describe('Previous mystery report recovery', { timeout: 20000 }, () => {
  function recordTwoVersions(id = 'wall') {
    build(id); click('Check my evidence'); click('Record specimen report');
    const first = JSON.parse(JSON.stringify(data().cases[id].record));
    write('Second recorded explanation: compare the supplied structure and reproduction; species remains unknown.');
    if (id === 'wall') { choice('micro-mystery-evidence', 'behavior'); choice('micro-mystery-evidence', 'size'); }
    click('Check my evidence'); click('Update recorded report');
    return { first, second: JSON.parse(JSON.stringify(data().cases[id].record)) };
  }

  it('retains one independent previous snapshot only after an explicit report update', () => {
    mount(); build('wall'); click('Check my evidence'); click('Record specimen report');
    const first = JSON.parse(JSON.stringify(data().cases.wall.record));
    expect(data().cases.wall.previousRecord).toBeNull();
    expect(mounted.container.querySelector('[data-mystery-history]')).toBeNull();
    write('Second explanation, still bounded by the supplied evidence.');
    click('Check my evidence');
    expect(data().cases.wall.previousRecord).toBeNull();
    expect(data().cases.wall.record).toEqual(first);
    click('Update recorded report');
    const second = JSON.parse(JSON.stringify(data().cases.wall.record));
    expect(data().cases.wall.previousRecord).toEqual(first);
    expect(data().cases.wall.previousRecord.evidence).not.toBe(data().cases.wall.record.evidence);
    write('Third explanation: peptidoglycan supports bacteria but cannot establish a species.');
    click('Check my evidence'); click('Update recorded report');
    expect(data().cases.wall.previousRecord).toEqual(second);
    expect(data().cases.wall.previousRecord).not.toEqual(first);
    expect(Object.keys(data().cases.wall.previousRecord).sort()).toEqual(['claim', 'evidence', 'limitation', 'reasoning']);
  });

  it.each(['working', 'recorded'])('previews and reversibly restores a report while preserving the %s view and complete draft', view => {
    vi.useFakeTimers();
    mount(); const { first, second } = recordTwoVersions();
    choice('micro-mystery-claim', 'archaeon'); choice('micro-mystery-limitation', 'species');
    write('Unfinished draft.\n<img src=x> remains text.');
    click('Hide: Cell structure and chemistry');
    if (view === 'recorded') click('Recorded report');
    act(() => vi.runOnlyPendingTimers());
    const before = JSON.parse(JSON.stringify(data().cases.wall));
    const history = mounted.container.querySelector('[data-mystery-history="wall"]');
    expect(history.open).toBe(false);
    expect(history.querySelector('summary').textContent).toBe('Review previous report');
    click(history.querySelector('summary'));
    const preview = history.querySelector('[data-previous-report="wall"]');
    expect(preview.querySelectorAll('[data-previous-field]')).toHaveLength(4);
    expect(preview.textContent).toContain('Bacterium');
    expect(preview.textContent).toContain('Chemical analysis detects peptidoglycan');
    expect(preview.textContent).toContain('cells dividing into two');
    expect(preview.textContent).toContain(first.reasoning);
    expect(preview.textContent).toContain('species and safety remain unknown');
    expect(preview.querySelectorAll('input,textarea,button')).toHaveLength(0);
    expect(data().cases.wall).toEqual(before);
    expect(button('Restore previous report').getAttribute('aria-describedby')).toBe('micro-mystery-restore-note');
    click('Restore previous report'); act(() => vi.runOnlyPendingTimers());
    expect(data().cases.wall).toEqual({ ...before, record: first, previousRecord: second });
    expect(document.activeElement.id).toBe('micro-mystery-report-heading');
    expect(document.activeElement.getAttribute('data-report-view')).toBe(view);
    expect(mounted.container.querySelector('[data-mystery-notice="restored"]').textContent).toContain('Your working notes and current view were kept');
    expect(mounted.container.querySelector('[data-previous-report="wall"]').textContent).toContain(second.reasoning);
    expect(mounted.container.textContent).toContain('1/6 reports recorded');
    expect(core().hasPendingRevision(data().cases.wall)).toBe(true);
    click('Restore previous report'); act(() => vi.runOnlyPendingTimers());
    expect(data().cases.wall).toEqual(before);
  });

  it('keeps history separate by case and survives a JSON reload', () => {
    mount(); recordTwoVersions('wall');
    write('Wall draft remains unfinished.');
    const wall = JSON.parse(JSON.stringify(data().cases.wall));
    const pond = recordTwoVersions('pond');
    click('Recorded report');
    const saved = JSON.parse(JSON.stringify(mounted.state));
    act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null;
    mount(saved);
    const preview = mounted.container.querySelector('[data-mystery-history="pond"]');
    click(preview.querySelector('summary')); click('Restore previous report');
    expect(data().cases.pond.record).toEqual(pond.first);
    expect(data().cases.pond.previousRecord).toEqual(pond.second);
    expect(data().cases.pond.reportView).toBe('recorded');
    expect(data().cases.wall).toEqual(wall);
    expect(core().hasPendingRevision(data().cases.pond)).toBe(true);
    openCase('wall');
    expect(data().cases.wall).toEqual(wall);
    expect(mounted.container.querySelector('#micro-mystery-reasoning').value).toBe('Wall draft remains unfinished.');
  });

  it('rejects invalid, orphaned and identical history and sanitizes a valid independent snapshot', () => {
    const record = { claim: 'bacterium', evidence: ['structure', 'behavior'], reasoning: 'Current bounded reasoning.', limitation: 'bounded' };
    for (const previousRecord of [null, [], 'invalid', { ...record, claim: 'yeast' }, { ...record, evidence: ['size'] }, { ...record, limitation: 'safe' }, { ...record, reasoning: ' ' }, record]) {
      expect(core().normalize({ cases: { wall: { record, previousRecord } } }).cases.wall.previousRecord).toBeNull();
    }
    const previousRecord = { ...record, evidence: ['behavior', 'structure', 'structure', 'unknown'], reasoning: 'Earlier reasoning.', previousRecord: record };
    const raw = { cases: { wall: { record, previousRecord } } }, before = JSON.stringify(raw);
    const normalized = core().normalize(raw);
    expect(normalized.cases.wall.previousRecord).toEqual({ ...record, reasoning: 'Earlier reasoning.' });
    expect(normalized.cases.wall.previousRecord.evidence).not.toBe(previousRecord.evidence);
    expect(core().normalize(normalized)).toEqual(normalized);
    expect(JSON.stringify(raw)).toBe(before);
    expect(core().normalize({ cases: { wall: { previousRecord } } }).cases.wall.previousRecord).toBeNull();
  });

  it('exports current, previous and working reports with distinct labels and complete previous evidence', () => {
    mount(); const { first, second } = recordTwoVersions();
    write('Unfinished explanation to keep separate.');
    const before = JSON.parse(JSON.stringify(data()));
    const download = captureReportDownload('blob:mystery-history');
    click('Download specimen reports');
    const text = download.contents[0];
    const [current, rest] = text.split('Previous recorded report (available to restore)');
    const [previous, working] = rest.split('Current working notes');
    expect(current).toContain(second.reasoning); expect(current).not.toContain(first.reasoning);
    expect(previous).toContain('Previous recorded classification: Bacterium');
    expect(previous).toContain(first.reasoning);
    expect(previous).toContain('Cell structure and chemistry: The supplied cell map has no membrane-bound nucleus. Chemical analysis detects peptidoglycan');
    expect(previous).toContain('Behavior and reproduction: The observation sequence shows cells dividing into two');
    expect(previous).toContain('Previous conclusion about limits: The evidence supports a broad group');
    expect(working).toContain('Unfinished explanation to keep separate.');
    expect(text).not.toContain('A growing neighbor');
    expect(data()).toEqual(before);
    act(() => vi.advanceTimersByTime(1000));
    expect(download.revokeUrl).toHaveBeenCalledWith('blob:mystery-history');
  });

  it('does not move focus into a reopened panel after a queued restore', () => {
    vi.useFakeTimers(); mount(); recordTwoVersions(); click('Recorded report');
    act(() => vi.runOnlyPendingTimers());
    click(mounted.container.querySelector('[data-mystery-history] summary'));
    click('Restore previous report');
    click('Practice with the microscope');
    click(mounted.container.querySelector('#micro-tab-mystery'));
    const tab = mounted.container.querySelector('#micro-tab-mystery'); tab.focus();
    act(() => vi.runOnlyPendingTimers());
    expect(document.activeElement).toBe(tab);
    expect(button('Recorded report').getAttribute('aria-pressed')).toBe('true');
  });
});

describe('Mystery saved-version comparison', { timeout: 20000 }, () => {
  const previous = { claim: 'bacterium', evidence: ['structure', 'behavior'], reasoning: 'Earlier explanation.\n<img src=x> is literal.', limitation: 'bounded' };
  const current = { claim: 'bacterium', evidence: ['size', 'structure'], reasoning: 'Current explanation.\n<script>Keep these words.</script>', limitation: 'bounded' };
  function entry(overrides = {}) {
    return { revealed: ['context'], collapsed: ['context'], reportView: 'working', claim: 'archaeon', evidence: [],
      reasoning: 'Unfinished working reasoning.', limitation: 'species', checked: true, record: current, previousRecord: previous, ...overrides };
  }
  function openHistory() {
    const history = mounted.container.querySelector('[data-mystery-history="wall"]');
    click(history.querySelector('summary')); return history;
  }
  function comparison() { return mounted.container.querySelector('[data-mystery-history-comparison="wall"]'); }

  it('compares canonical citation membership and literal reasoning independently of the draft and view', () => {
    const raw = entry({ record: { ...current, evidence: ['structure', 'size', 'structure', 'unknown'] },
      previousRecord: { ...previous, evidence: ['behavior', 'structure', 'behavior'] } });
    const before = JSON.stringify(raw), result = core().historyComparison('wall', raw);
    expect(result).toEqual({ current, previous, changes: ['evidence', 'reasoning'], evidenceOnlyCurrent: ['size'], evidenceOnlyPrevious: ['behavior'] });
    expect(result.current.evidence).not.toBe(raw.record.evidence); expect(result.previous.evidence).not.toBe(raw.previousRecord.evidence);
    expect(core().historyComparison('wall', { ...raw, claim: 'yeast', reasoning: 'Changed draft.', revealed: ['context', 'size'], reportView: 'recorded', checked: false })).toEqual(result);
    expect(core().historyComparison('wall', JSON.parse(before))).toEqual(result);
    result.previous.reasoning = 'Mutated projection'; result.current.evidence.push('context');
    expect(JSON.stringify(raw)).toBe(before);
  });

  it('rejects invalid case IDs, invalid snapshots, orphaned history and identical normalized reports', () => {
    for (const id of [null, [], 'bad', '__proto__', 0]) expect(core().historyComparison(id, entry())).toBeNull();
    for (const value of [null, [], 2, 'bad', {}, { record: current }, { previousRecord: previous }]) expect(core().historyComparison('wall', value)).toBeNull();
    for (const invalid of [null, [], { ...current, claim: 'protist' }, { ...current, evidence: ['size'] }, { ...current, limitation: 'safe' }, { ...current, reasoning: ' ' }]) {
      expect(core().historyComparison('wall', entry({ record: invalid }))).toBeNull();
      expect(core().historyComparison('wall', entry({ previousRecord: invalid }))).toBeNull();
    }
    expect(core().historyComparison('wall', entry({ previousRecord: { ...current, evidence: ['structure', 'size', 'size'] } }))).toBeNull();
  });

  it('treats text changes literally and reverses version-specific citations when reports are swapped', () => {
    const changed = core().historyComparison('wall', entry({ previousRecord: { ...current, reasoning: current.reasoning + ' ' } }));
    expect(changed.changes).toEqual(['reasoning']);
    expect(changed.previous.reasoning).toBe(current.reasoning + ' ');
    expect(changed.evidenceOnlyCurrent).toEqual([]); expect(changed.evidenceOnlyPrevious).toEqual([]);
    const swapped = core().historyComparison('wall', entry({ record: previous, previousRecord: current }));
    expect(swapped).toEqual({ current: previous, previous: current, changes: ['evidence', 'reasoning'], evidenceOnlyCurrent: ['behavior'], evidenceOnlyPrevious: ['size'] });
  });

  it('shows complete literal values for changed saved fields while preserving the full previous preview', () => {
    mount({ mysteryLab: { active: 'wall', cases: { wall: entry() } }, growthReviewHour: 6 });
    const before = JSON.stringify(mounted.state), history = openHistory(), compared = comparison();
    expect(history.open).toBe(true);
    expect(compared.textContent).toContain('Compare recorded versions');
    expect([...compared.querySelectorAll('[data-mystery-history-change]')].map(node => node.dataset.mysteryHistoryChange)).toEqual(['evidence', 'reasoning']);
    expect(compared.querySelector('[data-mystery-history-fields]').textContent).toBe('Fields that differ: Cited observations; Written reasoning.');
    const citations = compared.querySelector('[data-mystery-history-change="evidence"]');
    expect(citations.querySelector('[data-history-citations="previous"]').textContent).toBe('Cited only in the previous report: Behavior and reproduction');
    expect(citations.querySelector('[data-history-citations="current"]').textContent).toBe('Cited only in the current report: Size and shape');
    const catalog = core().catalog().find(item => item.id === 'wall');
    for (const version of ['previous', 'current']) expect(citations.querySelector('[data-history-version="' + version + '"]').textContent).toContain(catalog.structure);
    expect(citations.querySelector('[data-history-version="previous"]').textContent).toContain(catalog.behavior);
    expect(citations.querySelector('[data-history-version="current"]').textContent).toContain(catalog.size);
    const reasoning = compared.querySelector('[data-mystery-history-change="reasoning"]');
    expect(reasoning.querySelector('[data-history-version="previous"] > p:last-child').textContent).toBe(previous.reasoning);
    expect(reasoning.querySelector('[data-history-version="current"] > p:last-child').textContent).toBe(current.reasoning);
    expect(compared.querySelector('img,script,input,textarea,button')).toBeNull();
    expect(compared.textContent).not.toContain('Unfinished working reasoning.');
    expect(history.querySelectorAll('[data-previous-field]')).toHaveLength(4);
    expect(history.querySelector('[data-previous-report]').textContent).toContain(previous.reasoning);
    for (const region of compared.querySelectorAll('[aria-labelledby]')) expect(document.getElementById(region.getAttribute('aria-labelledby'))).toBeTruthy();
    expect(JSON.stringify(mounted.state)).toBe(before); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('keeps the comparison open during draft edits and swaps version labels only after an explicit restore', () => {
    vi.useFakeTimers(); mount({ mysteryLab: { active: 'wall', cases: { wall: entry() } }, growthReviewHour: 6 });
    const history = openHistory(); write('Later working reasoning.');
    expect(mounted.container.querySelector('[data-mystery-history="wall"]')).toBe(history); expect(history.open).toBe(true);
    const before = JSON.parse(JSON.stringify(data().cases.wall));
    const unchangedComparison = comparison().textContent;
    click('Recorded report'); act(() => vi.runOnlyPendingTimers());
    expect(comparison().textContent).toBe(unchangedComparison); expect(history.open).toBe(true);
    const restoreBefore = JSON.parse(JSON.stringify(data().cases.wall));
    click('Restore previous report'); act(() => vi.runOnlyPendingTimers());
    expect(data().cases.wall).toEqual({ ...restoreBefore, record: previous, previousRecord: current });
    expect(document.activeElement.id).toBe('micro-mystery-report-heading');
    expect(document.activeElement.dataset.reportView).toBe('recorded');
    const reasoning = comparison().querySelector('[data-mystery-history-change="reasoning"]');
    expect(reasoning.querySelector('[data-history-version="previous"]').textContent).toContain(current.reasoning);
    expect(reasoning.querySelector('[data-history-version="current"]').textContent).toContain(previous.reasoning);
    expect(comparison().querySelector('[data-history-citations="current"]').textContent).toContain('Behavior and reproduction');
    expect(history.open).toBe(true); expect(mounted.state.growthReviewHour).toBe(6);
    click('Restore previous report'); act(() => vi.runOnlyPendingTimers());
    expect(data().cases.wall).toEqual(restoreBefore);
    click('Working notes'); expect(data().cases.wall).toEqual(before);
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('shows only the differing saved field and keeps comparison case-specific across JSON reload', () => {
    const reasoningOnly = entry({ previousRecord: { ...current, reasoning: 'Previous reasoning only.' } });
    mount({ mysteryLab: { active: 'wall', cases: { wall: reasoningOnly } } });
    openHistory();
    expect([...comparison().querySelectorAll('[data-mystery-history-change]')].map(node => node.dataset.mysteryHistoryChange)).toEqual(['reasoning']);
    expect(comparison().querySelector('[data-history-citations]')).toBeNull();
    const saved = JSON.parse(JSON.stringify(mounted.state));
    openCase('pond'); expect(mounted.container.querySelector('[data-mystery-history-comparison]')).toBeNull();
    openCase('wall'); expect(mounted.container.querySelector('[data-mystery-history="wall"]').open).toBe(false);
    act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; mount(saved);
    expect(mounted.container.querySelector('[data-mystery-history="wall"]').open).toBe(false);
    openHistory();
    expect(comparison().querySelector('[data-history-version="previous"]').textContent).toContain('Previous reasoning only.');
    expect(data().cases.wall).toEqual(saved.mysteryLab.cases.wall);
  });

  it.each(['focus', 'typing', 'observation', 'download', 'active tab', 'topic library', 'away and back'])('cancels queued restore focus after a later %s action', action => {
    vi.useFakeTimers(); mount({ mysteryLab: { active: 'wall', cases: { wall: entry() } } });
    openHistory(); click('Restore previous report');
    let target;
    if (action === 'focus' || action === 'typing') {
      target = mounted.container.querySelector('#micro-mystery-reasoning'); act(() => target.focus());
      if (action === 'typing') write('A subsequent edit.');
    } else if (action === 'observation') { target = button('Show: Sample context'); act(() => target.focus()); click(target); }
    else if (action === 'download') { captureReportDownload('blob:mystery-history-comparison'); target = button('Download specimen reports'); act(() => target.focus()); click(target); }
    else if (action === 'active tab') { target = mounted.container.querySelector('#micro-tab-mystery'); act(() => target.focus()); click(target); }
    else if (action === 'topic library') { target = mounted.container.querySelector('.micro-library-toggle'); act(() => target.focus()); click(target); }
    else { click(mounted.container.querySelector('#micro-tab-home')); click(mounted.container.querySelector('#micro-tab-mystery')); target = mounted.container.querySelector('#micro-tab-mystery'); act(() => target.focus()); }
    act(() => vi.runOnlyPendingTimers());
    expect(document.activeElement).toBe(target);
    expect(data().cases.wall.record).toEqual(previous); expect(data().cases.wall.previousRecord).toEqual(current);
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('keeps later control focus after view and case navigation while allowing an uninterrupted case transition', () => {
    vi.useFakeTimers(); mount({ mysteryLab: { active: 'wall', cases: { wall: entry() } } });
    click('Recorded report');
    const tab = mounted.container.querySelector('#micro-tab-mystery'); act(() => tab.focus()); click(tab);
    act(() => vi.runOnlyPendingTimers()); expect(document.activeElement).toBe(tab);
    openCase('pond');
    const textarea = mounted.container.querySelector('#micro-mystery-reasoning'); act(() => textarea.focus()); write('A new case draft.');
    act(() => vi.runOnlyPendingTimers()); expect(document.activeElement).toBe(textarea);
    openCase('wall'); act(() => vi.runOnlyPendingTimers());
    expect(document.activeElement.id).toBe('micro-mystery-observation-heading'); expect(document.activeElement.dataset.case).toBe('wall');
    expect(data().cases.pond.reasoning).toBe('A new case draft.');
  });
});
