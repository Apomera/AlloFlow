import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const act = React.act, previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
const require = createRequire(import.meta.url);
const { Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let config, mounted;
const currentReport = () => ({ claim: 'bacterium', evidence: ['structure', 'behavior'], reasoning: 'Peptidoglycan and division support a bacterial group.', limitation: 'bounded', imported: { source: 'Current raw report' } });
const previousReport = () => ({ claim: 'bacterium', evidence: ['size', 'structure'], reasoning: 'The wall chemistry is the strongest clue.', limitation: 'bounded', imported: { source: 'Previous raw report' } });

function seed() {
  return {
    tab: 'mystery', showMicroLibrary: false, earnedXP: 41, rootMetadata: { keep: true },
    microscopeMeasurements: { importedRawData: ['Keep the other section'] },
    mysteryLab: { active: 'wall', notice: 'saved', imported: { original: ['Keep all notebook metadata'] }, cases: {
      wall: { revealed: ['context', 'size', 'structure', 'behavior'], collapsed: ['context'], reportView: 'working',
        claim: 'bacterium', evidence: ['structure', 'behavior'], reasoning: 'Revised wall reasoning awaits explicit recording.', limitation: 'bounded', checked: true,
        record: currentReport(), previousRecord: previousReport(), imported: { original: 'Keep active case metadata' } },
      pond: { revealed: ['context'], reasoning: 'Untouched long pond draft ' + 'p'.repeat(1750), invalidImport: [null, { keep: true }] },
      budding: { revealed: ['context', 'structure', 'behavior'], claim: 'yeast', evidence: ['structure', 'behavior'],
        reasoning: 'A pending yeast revision.', limitation: 'bounded', checked: false, reportView: 'recorded',
        record: { claim: 'yeast', evidence: ['structure', 'behavior'], reasoning: 'Original yeast report.', limitation: 'bounded', metadata: 'Keep raw target report' }, imported: ['Keep another case'] },
      unknownImportedCase: { reasoning: 'This imported case is outside the teaching catalog.', extra: { keep: true } }
    } }
  };
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); resetStemLab(); config = loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology');
});
afterEach(() => {
  if (mounted) { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
});

function mount(value = seed(), { strict = false } = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const view = { container, root: ReactDOMClient.createRoot(container), state: null, hold: false, pending: [], awardXP: vi.fn() };
  function Host() {
    const [data, setData] = React.useState({ microbiology: value, otherTool: { notes: 'Keep another tool', imported: [null, 4] } });
    view.state = data; view.change = setData;
    return config.render(makeCtx({ toolData: data, setToolData: update => {
      if (view.hold) view.pending.push(update); else setData(update);
    }, awardXP: view.awardXP }));
  }
  mounted = view; act(() => view.root.render(React.createElement(strict ? React.StrictMode : React.Fragment, null, React.createElement(Host)))); return view;
}
const node = selector => mounted.container.querySelector(selector);
const book = () => mounted.state.microbiology.mysteryLab;
function button(text) {
  const found = [...mounted.container.querySelectorAll('button')].find(item => item.textContent.trim() === text);
  expect(found, text).toBeTruthy(); return found;
}
function click(control) { const target = typeof control === 'string' ? button(control) : control; expect(target).toBeTruthy(); act(() => target.click()); return target; }
function chooseCase(id) { return click(node('.micro-mystery-cases').querySelectorAll('button')[window.__MicrobiologyCore.mystery.ids.indexOf(id)]); }
function write(value) {
  const target = node('#micro-mystery-reasoning'); expect(target).toBeTruthy();
  act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(target, value);
    target.dispatchEvent(new Event('input', { bubbles: true }));
  }); return target;
}
function updateBook(before, patch) { return { ...before, microbiology: { ...before.microbiology, mysteryLab: { ...before.microbiology.mysteryLab, ...patch } } }; }
function updateCase(before, patch, id = 'wall', notice = '') {
  const prior = before.microbiology.mysteryLab;
  const raw = prior.cases[id], entry = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return updateBook(before, { cases: { ...prior.cases, [id]: { ...entry, ...patch } }, notice });
}
function release() {
  const pending = mounted.pending.splice(0); mounted.hold = false;
  expect(pending).toHaveLength(1); expect(typeof pending[0]).toBe('function');
  act(() => mounted.change(previous => pending[0](previous)));
}
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }

const editActions = [
  { label: 'classification', act: () => click(node('input[name="micro-mystery-claim"][value="archaeon"]')), patch: { claim: 'archaeon', checked: false } },
  { label: 'evidence citation', act: () => click(node('input[name="micro-mystery-evidence"][value="behavior"]')), patch: { evidence: ['structure'], checked: false } },
  { label: 'conclusion about limits', act: () => click(node('input[name="micro-mystery-limitation"][value="species"]')), patch: { limitation: 'species', checked: false } },
  { label: 'observation visibility', act: () => click('Hide: Size and shape'), patch: { collapsed: ['context', 'size'] } },
  { label: 'check status', act: () => click('Check my evidence'), patch: { checked: true } }
];
const queuedActions = [
  { label: 'case navigation', act: () => chooseCase('pond'), expected: before => updateBook(before, { active: 'pond', notice: '' }) },
  { label: 'recorded report view', act: () => click('Recorded report'), expected: before => updateCase(before, { reportView: 'recorded' }) },
  { label: 'draft annotation', act: () => write('Queued learner explanation.'), expected: before => updateCase(before, { reasoning: 'Queued learner explanation.', checked: false }) },
  { label: 'record replacement', act: () => click('Update recorded report'), expected: before => {
    const entry = before.microbiology.mysteryLab.cases.wall;
    return updateCase(before, { previousRecord: entry.record, record: { claim: entry.claim, evidence: entry.evidence.slice(), reasoning: entry.reasoning, limitation: entry.limitation } }, 'wall', 'saved');
  } },
  { label: 'previous report restore', act: () => click('Restore previous report'), expected: before => {
    const entry = before.microbiology.mysteryLab.cases.wall;
    return updateCase(before, { record: entry.previousRecord, previousRecord: entry.record }, 'wall', 'restored');
  } }
];

describe('Mystery raw state integrity', { timeout: 60000 }, () => {
  it('changes only active and notice during ordinary case navigation', () => {
    mount(); const before = mounted.state, prior = book(), random = vi.spyOn(Math, 'random');
    chooseCase('pond');
    expect(mounted.state).toEqual(updateBook(before, { active: 'pond', notice: '' }));
    expect(book().cases).toBe(prior.cases);
    expect(book().cases.pond.reasoning.length).toBeGreaterThan(1600);
    expect(mounted.state.otherTool).toBe(before.otherTool);
    expect(random).not.toHaveBeenCalled(); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('changes only the selected report view and notice while preserving raw reports and long drafts', () => {
    mount(); const before = mounted.state, prior = book().cases.wall;
    click('Recorded report');
    expect(mounted.state).toEqual(updateCase(before, { reportView: 'recorded' }));
    expect(book().cases.wall.record).toBe(prior.record); expect(book().cases.wall.previousRecord).toBe(prior.previousRecord);
    expect(book().cases.pond).toBe(before.microbiology.mysteryLab.cases.pond);
    act(() => vi.advanceTimersByTime(0)); expect(document.activeElement.id).toBe('micro-mystery-report-heading');
    const recorded = mounted.state; click('Working notes');
    expect(mounted.state).toEqual(updateCase(recorded, { reportView: 'working' }));
    expect(node('#micro-mystery-reasoning').value).toBe(prior.reasoning);
  });

  it('changes only the learner explanation, checked flag, and notice through the real textarea', () => {
    mount(); const before = mounted.state, prior = book().cases.wall, target = write('Rewritten explanation.\n<script>This is learner text.</script>');
    expect(mounted.state).toEqual(updateCase(before, { reasoning: 'Rewritten explanation.\n<script>This is learner text.</script>', checked: false }));
    expect(node('#micro-mystery-reasoning')).toBe(target); expect(node('script')).toBeNull();
    expect(book().cases.wall.record).toBe(prior.record); expect(book().cases.wall.previousRecord).toBe(prior.previousRecord);
    expect(book().cases.pond).toBe(before.microbiology.mysteryLab.cases.pond);
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it.each(editActions)('changes only the owned $label fields and leaves imported evidence intact', action => {
    const value = seed(); if (action.label === 'check status') value.mysteryLab.cases.wall.checked = false;
    mount(value); const before = mounted.state, prior = book().cases.wall;
    action.act(); expect(mounted.state).toEqual(updateCase(before, action.patch));
    expect(book().cases.wall.record).toBe(prior.record); expect(book().cases.wall.previousRecord).toBe(prior.previousRecord);
    expect(book().cases.wall.imported).toBe(prior.imported); expect(book().cases.pond).toBe(before.microbiology.mysteryLab.cases.pond);
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('reveals one previously hidden observation without repairing unrelated imported fields', () => {
    const value = seed(); value.mysteryLab.cases.wall.revealed = ['context', 'structure']; value.mysteryLab.cases.wall.collapsed = ['context'];
    value.mysteryLab.cases.wall.evidence = ['structure']; mount(value); const before = mounted.state;
    click('Reveal: Behavior and reproduction');
    expect(mounted.state).toEqual(updateCase(before, { revealed: ['context', 'structure', 'behavior'], collapsed: ['context'] }));
    expect(book().cases.wall.record).toBe(before.microbiology.mysteryLab.cases.wall.record);
  });

  it('opens the next unrecorded case without materializing its defaults', () => {
    mount(); const before = mounted.state;
    click([...mounted.container.querySelectorAll('button')].find(item => item.textContent.startsWith('Next unrecorded case:')));
    expect(mounted.state).toEqual(updateBook(before, { active: 'salt', notice: '' }));
    expect(book().cases).toBe(before.microbiology.mysteryLab.cases); expect(book().cases.salt).toBeUndefined();
  });

  it('opens the next pending revision by changing only its view and the active case', () => {
    mount(); const before = mounted.state;
    click(node('[data-mystery-next-revision="budding"]'));
    const expected = updateCase(before, { reportView: 'working' }, 'budding'); expected.microbiology.mysteryLab.active = 'budding';
    expect(mounted.state).toEqual(expected);
    expect(book().cases.wall).toBe(before.microbiology.mysteryLab.cases.wall);
    expect(book().cases.budding.record).toBe(before.microbiology.mysteryLab.cases.budding.record);
    act(() => vi.advanceTimersByTime(0)); expect(document.activeElement.id).toBe('micro-mystery-report-heading');
  });

  it('retains the exact raw current report as previous history on explicit recording', () => {
    mount(); const before = mounted.state, entry = book().cases.wall;
    click('Update recorded report'); expect(mounted.state).toEqual(queuedActions[3].expected(before));
    expect(book().cases.wall.previousRecord).toBe(entry.record); expect(book().cases.wall.previousRecord.imported).toBe(entry.record.imported);
    expect(book().cases.wall.evidence).toBe(entry.evidence); expect(book().cases.pond).toBe(before.microbiology.mysteryLab.cases.pond);
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('swaps exact raw report objects on restore without rewriting working notes', () => {
    mount(); const before = mounted.state, entry = book().cases.wall;
    click('Restore previous report'); expect(mounted.state).toEqual(queuedActions[4].expected(before));
    expect(book().cases.wall.record).toBe(entry.previousRecord); expect(book().cases.wall.previousRecord).toBe(entry.record);
    expect(book().cases.wall.reasoning).toBe(entry.reasoning); expect(book().cases.wall.evidence).toBe(entry.evidence);
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('retains an overlong active explanation on visibility, view, and check changes', () => {
    const value = seed(); value.mysteryLab.cases.wall.reasoning = 'Long imported active explanation ' + 'w'.repeat(1750);
    mount(value); const raw = book().cases.wall.reasoning;
    expect(node('#micro-mystery-reasoning').value).toHaveLength(1600);
    click('Hide: Size and shape'); expect(book().cases.wall.reasoning).toBe(raw);
    click('Recorded report'); expect(book().cases.wall.reasoning).toBe(raw);
    click('Working notes'); click('Check my evidence'); expect(book().cases.wall.reasoning).toBe(raw);
  });

  it('does not replace a longer imported explanation with its unchanged bounded display value', () => {
    const value = seed(); value.mysteryLab.cases.wall.reasoning = 'Imported explanation ' + 'w'.repeat(1750);
    mount(value); const before = mounted.state, target = node('#micro-mystery-reasoning');
    expect(target.value).toHaveLength(1600);
    act(() => Simulate.change(target, { target: { value: target.value } }));
    expect(mounted.state).toBe(before);
    expect(book().cases.wall.reasoning).toBe(value.mysteryLab.cases.wall.reasoning);
  });

  it('preserves frozen imported data and survives a JSON reload after editing', () => {
    mount(freeze(seed())); const before = mounted.state;
    write('Annotation after restoring frozen imports.');
    expect(mounted.state).toEqual(updateCase(before, { reasoning: 'Annotation after restoring frozen imports.', checked: false }));
    const restored = JSON.parse(JSON.stringify(mounted.state.microbiology));
    act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; mount(restored);
    expect(mounted.state.microbiology).toEqual(restored); expect(node('#micro-mystery-reasoning').value).toContain('frozen imports');
    chooseCase('pond'); expect(book().cases.pond.reasoning.length).toBeGreaterThan(1600);
  });

  it('preserves exact raw deltas and accepted transition focus when StrictMode repeats functional updaters', () => {
    mount(seed(), { strict: true }); let before = mounted.state;
    chooseCase('pond'); expect(mounted.state).toEqual(updateBook(before, { active: 'pond', notice: '' }));
    act(() => vi.advanceTimersByTime(0)); expect(document.activeElement).toBe(node('#micro-mystery-observation-heading'));
    before = mounted.state; chooseCase('wall'); expect(mounted.state).toEqual(updateBook(before, { active: 'wall', notice: '' }));
    act(() => vi.advanceTimersByTime(0)); expect(document.activeElement).toBe(node('#micro-mystery-observation-heading'));
    before = mounted.state; click('Recorded report'); expect(mounted.state).toEqual(updateCase(before, { reportView: 'recorded' }));
    act(() => vi.advanceTimersByTime(0)); expect(document.activeElement).toBe(node('#micro-mystery-report-heading'));
    before = mounted.state; click('Working notes'); expect(mounted.state).toEqual(updateCase(before, { reportView: 'working' }));
    act(() => vi.advanceTimersByTime(0)); expect(document.activeElement).toBe(node('#micro-mystery-report-heading'));
    before = mounted.state; click('Update recorded report'); expect(mounted.state).toEqual(queuedActions[3].expected(before));
    expect(book().cases.wall.previousRecord).toBe(before.microbiology.mysteryLab.cases.wall.record);
    act(() => vi.advanceTimersByTime(0)); expect(document.activeElement).toBe(node('#micro-mystery-report-heading'));
    before = mounted.state; click('Restore previous report'); expect(mounted.state).toEqual(queuedActions[4].expected(before));
    expect(book().cases.wall.record).toBe(before.microbiology.mysteryLab.cases.wall.previousRecord);
    act(() => vi.advanceTimersByTime(0)); expect(document.activeElement).toBe(node('#micro-mystery-report-heading'));
    expect(book().cases.pond.reasoning.length).toBeGreaterThan(1600); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it.each([undefined, null, [], 'malformed notebook'])('creates only the edited branch for an absent or malformed notebook %j', raw => {
    const value = seed(); value.mysteryLab = raw; mount(value); const before = mounted.state;
    write('First learner note.');
    expect(mounted.state).toEqual({ ...before, microbiology: { ...before.microbiology, mysteryLab: {
      cases: { pond: { checked: false, reasoning: 'First learner note.' } }, notice: ''
    } } });
  });

  it.each([undefined, null, [], 'malformed case'])('creates only an edited selected case while preserving the rest of the raw notebook %j', raw => {
    const value = seed(); value.mysteryLab.cases.wall = raw; mount(value); const before = mounted.state;
    write('First selected-case note.');
    expect(mounted.state).toEqual(updateCase(before, { checked: false, reasoning: 'First selected-case note.' }));
    expect(book().cases.pond).toBe(before.microbiology.mysteryLab.cases.pond);
  });
});

describe('Mystery actions applied to latest state', { timeout: 60000 }, () => {
  it.each(queuedActions)('keeps intervening unrelated notebook, case, tool and root edits for queued $label', action => {
    mount(); mounted.hold = true; action.act();
    act(() => mounted.change(previous => ({ ...previous, otherTool: { ...previous.otherTool, newer: true }, microbiology: {
      ...previous.microbiology, rootMetadata: { newerRoot: true }, microscopeMeasurements: { newerOtherSection: true }, mysteryLab: {
        ...previous.microbiology.mysteryLab, newerNotebookMetadata: { keep: true }, cases: {
          ...previous.microbiology.mysteryLab.cases, pond: { ...previous.microbiology.mysteryLab.cases.pond, newerReasoning: 'Keep the later other case' }
        }
      }
    } })));
    const latest = mounted.state; release(); expect(mounted.state).toEqual(action.expected(latest));
    expect(book().cases.pond).toBe(latest.microbiology.mysteryLab.cases.pond); expect(mounted.state.otherTool).toBe(latest.otherTool);
  });

  it.each(queuedActions.flatMap(action => ['tab change', 'active case change', 'replacement source case', 'JSON import', 'changed reasoning'].map(change => ({ action, change }))))
  ('rejects queued $action.label after $change', ({ action, change }) => {
    mount(); mounted.hold = true; action.act();
    act(() => mounted.change(previous => {
      if (change === 'tab change') return { ...previous, microbiology: { ...previous.microbiology, tab: 'home' } };
      if (change === 'active case change') return updateBook(previous, { active: 'pond' });
      if (change === 'JSON import') return JSON.parse(JSON.stringify(previous));
      const prior = previous.microbiology.mysteryLab, source = prior.cases.wall;
      return updateBook(previous, { cases: { ...prior.cases, wall: { ...source,
        ...(change === 'changed reasoning' ? { reasoning: 'A later valid reasoning edit.' } : { replacementOwner: true })
      } } });
    }));
    const latest = mounted.state; release(); expect(mounted.state).toBe(latest);
  });

  it.each([
    { label: 'evidence array', change: entry => entry.evidence.push('size') },
    { label: 'revealed array', change: entry => entry.revealed.pop() },
    { label: 'collapsed array', change: entry => entry.collapsed.push('size') },
    { label: 'record fields', change: entry => { entry.record.reasoning = 'A later raw saved-report revision.'; } },
    { label: 'previous record evidence', change: entry => entry.previousRecord.evidence.push('behavior') },
    { label: 'check status', change: entry => { entry.checked = false; } },
    { label: 'report view', change: entry => { entry.reportView = 'recorded'; } },
    { label: 'working reasoning', change: entry => { entry.reasoning = 'A later edit on the same original owner.'; } },
    { label: 'classification', change: entry => { entry.claim = 'archaeon'; } },
    { label: 'conclusion about limits', change: entry => { entry.limitation = 'species'; } }
  ])('rejects queued annotation after an in-place $label change', change => {
    mount(); mounted.hold = true; write('A queued older annotation.');
    act(() => mounted.change(previous => {
      change.change(previous.microbiology.mysteryLab.cases.wall);
      return { ...previous, microbiology: { ...previous.microbiology } };
    }));
    const latest = mounted.state; release(); expect(mounted.state).toBe(latest);
  });

  it('retains later unknown metadata on the same original target case', () => {
    mount(); mounted.hold = true; write('Queued note retains additional metadata.');
    act(() => mounted.change(previous => {
      previous.microbiology.mysteryLab.cases.wall.laterImportMetadata = { keep: ['Original owner'] };
      return { ...previous, microbiology: { ...previous.microbiology } };
    }));
    const latest = mounted.state; release();
    expect(mounted.state).toEqual(updateCase(latest, { reasoning: 'Queued note retains additional metadata.', checked: false }));
    expect(book().cases.wall.laterImportMetadata).toBe(latest.microbiology.mysteryLab.cases.wall.laterImportMetadata);
  });

  it.each([queuedActions[0], queuedActions[1], queuedActions[3], queuedActions[4]])('does not redirect focus after rejected queued $label', action => {
    mount(); mounted.hold = true; action.act();
    act(() => mounted.change(previous => JSON.parse(JSON.stringify(previous))));
    const latest = mounted.state, target = node('#micro-mystery-reasoning'); act(() => target.focus());
    release(); act(() => vi.advanceTimersByTime(0));
    expect(mounted.state).toBe(latest); expect(document.activeElement).toBe(target);
  });

  it('does not redirect accepted navigation focus after a newer same-case JSON import', () => {
    mount(); chooseCase('pond');
    act(() => mounted.change(previous => JSON.parse(JSON.stringify(previous))));
    const target = node('#micro-mystery-reasoning'); act(() => target.focus());
    act(() => vi.advanceTimersByTime(0)); expect(document.activeElement).toBe(target);
  });
});
