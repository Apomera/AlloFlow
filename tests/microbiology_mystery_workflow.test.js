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
  const view = { container, root: ReactDOMClient.createRoot(container), state: null };
  function Host() {
    const [data, setData] = React.useState({ microbiology: { tab: 'mystery', ...seed } });
    view.state = data.microbiology;
    return tool.render(makeCtx({ toolData: data, setToolData: setData }));
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
  return { contents, clickSpy, revokeUrl: CapturedURL.revokeObjectURL };
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
