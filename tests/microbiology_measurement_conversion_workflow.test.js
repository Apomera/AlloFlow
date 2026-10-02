import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const act = React.act, previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
let config, mounted;

function context(id = 'ecoli', method = 'lightbright', mag = 1000, zoom = 20) {
  const referenceUm = { ecoli: 2, strep: 1, parame: 250, plasmo: 7.5, phage: 0.2 }[id];
  const fieldUm = (method === 'em' ? 40000 : 180000) / mag / zoom;
  const raw = fieldUm / 4, power = 10 ** Math.floor(Math.log(raw) / Math.LN10), factor = raw / power;
  const scaleUm = (factor >= 5 ? 5 : factor >= 2 ? 2 : 1) * power;
  return { version: 1, specimen: id, method, mag, zoom, fieldUm, scaleUm, referenceUm };
}

function seed(value = '2.75', unit = 'um', overrides = {}) {
  return {
    tab: 'microscope', showMicroLibrary: false, scopeOrganism: 'ecoli', selectedScope: 'lightbright',
    magnification: 1000, microscopeZoom: 20, microscopeFocus: 50, microscopeTargetFocus: 50,
    microscopeLabels: false, microscopeSeenSlides: ['ecoli', 'strep', 'parame', 'plasmo', 'phage'],
    microscopeMeasurements: {
      ecoli: {
        draft: { value, unit, context: { ...context(), importedCalibration: 'Keep this calibration metadata' }, extra: { imported: true } },
        result: { value: 2, unit: 'um', context: context(), extra: 'Current raw evidence' },
        previousResult: { value: 3, unit: 'um', context: context('ecoli', 'lightbright', 400, 50), extra: 'Previous raw evidence' },
        metadata: ['Imported entry', { keep: true }]
      },
      strep: { draft: { value: '1000', unit: 'nm', context: context('strep') }, imported: 'Other slide metadata' },
      unknown: { draft: { value: 'Do not coerce', unit: 'mm', context: { original: true } }, imported: [null, 'Untouched'] },
      importMetadata: { notebookVersion: 'old', keep: true }
    },
    mysteryLab: { rawImportedData: ['Preserve other Micro Lab work'] },
    resistanceComparison: { aId: 17, bId: 9, imported: true },
    earnedXP: 41, rootMetadata: { untouched: true }, ...overrides
  };
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab(); config = loadTool('stem_lab/stem_tool_microbiology.js', 'microbiology');
});

afterEach(() => {
  if (mounted) { act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null; }
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
});

function mount(value = seed()) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const view = { container, root: ReactDOMClient.createRoot(container), state: null, hold: false, pending: [], awardXP: vi.fn() };
  function Host() {
    const [data, setData] = React.useState({ microbiology: value, otherTool: { draft: 'Keep another tool', imported: [4, null] } });
    view.state = data; view.change = setData;
    return config.render(makeCtx({ toolData: data, setToolData: update => {
      if (view.hold) view.pending.push(update); else setData(update);
    }, awardXP: view.awardXP }));
  }
  mounted = view; act(() => view.root.render(React.createElement(Host))); return view;
}

const node = selector => mounted.container.querySelector(selector);
const draft = () => mounted.state.microbiology.microscopeMeasurements.ecoli.draft;
const input = () => node('input[type="number"]');
const units = () => node('select[aria-label="Estimate units"]');
const preview = () => node('#micro-measure-conversion-preview');
const convert = () => node('#micro-measure-convert');

function clickConversion() {
  const button = convert(); expect(button).toBeTruthy(); expect(button.disabled).toBe(false);
  act(() => { button.focus(); button.click(); }); return button;
}

function expectedConversion(before, value, unit) {
  const book = before.microbiology.microscopeMeasurements, entry = book.ecoli;
  return { ...before, microbiology: { ...before.microbiology, microscopeMeasurements: {
    ...book, ecoli: { ...entry, draft: { ...entry.draft, value, unit } }
  } } };
}

function release() {
  const pending = mounted.pending.splice(0); mounted.hold = false;
  expect(pending).toHaveLength(1); expect(typeof pending[0]).toBe('function');
  act(() => mounted.change(previous => pending.reduce((value, update) => update(value), previous)));
}

function checkButton() {
  const button = [...mounted.container.querySelectorAll('button')].find(item => item.textContent.trim() === 'Check and save estimate');
  expect(button).toBeTruthy(); return button;
}

function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

describe('Explicit microscope draft conversion', { timeout: 60000 }, () => {
  it.each([
    { value: '2.75', unit: 'um', converted: '2750', target: 'nm', equality: '2.75 µm = 2750 nm' },
    { value: '2750', unit: 'nm', converted: '2.75', target: 'um', equality: '2750 nm = 2.75 µm' },
    { value: '1.001', unit: 'um', converted: '1001', target: 'nm', equality: '1.001 µm = 1001 nm' },
    { value: '2e3', unit: 'nm', converted: '2', target: 'um', equality: /(?:2000|2e3) nm = 2 µm/ }
  ])('changes only the raw $unit draft representation and preserves every other saved field', item => {
    mount(seed(item.value, item.unit));
    const before = mounted.state, book = before.microbiology.microscopeMeasurements, entry = book.ecoli;
    const random = vi.spyOn(Math, 'random');
    if (typeof item.equality === 'string') expect(preview().textContent).toContain(item.equality);
    else expect(preview().textContent).toMatch(item.equality);
    const button = clickConversion();
    expect(mounted.state).toEqual(expectedConversion(before, item.converted, item.target));
    expect(input().value).toBe(item.converted); expect(units().value).toBe(item.target);
    expect(draft().context).toBe(entry.draft.context); expect(draft().extra).toBe(entry.draft.extra);
    expect(mounted.state.microbiology.microscopeMeasurements.ecoli.result).toBe(entry.result);
    expect(mounted.state.microbiology.microscopeMeasurements.ecoli.previousResult).toBe(entry.previousResult);
    expect(mounted.state.microbiology.microscopeMeasurements.strep).toBe(book.strep);
    expect(mounted.state.microbiology.microscopeMeasurements.unknown).toBe(book.unknown);
    expect(mounted.state.otherTool).toBe(before.otherTool);
    expect(document.activeElement).toBe(button); expect(convert()).toBe(button);
    expect(random).not.toHaveBeenCalled(); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('previews a learner value without checking, revealing a reference, awarding XP, or creating results', () => {
    const value = seed('3.125'); delete value.microscopeMeasurements.ecoli.result; delete value.microscopeMeasurements.ecoli.previousResult;
    mount(value); const before = mounted.state;
    expect(preview().textContent).toContain('3.125 µm = 3125 nm');
    expect(preview().textContent).not.toMatch(/Reference size|practice band|within|Difference:|correct|checked result/i);
    const reference = [...mounted.container.querySelectorAll('details')].find(item => item.querySelector('summary')?.textContent === 'Reveal reference size and calibration');
    expect(reference).toBeTruthy(); expect(reference.open).toBe(false);
    expect(mounted.state).toBe(before); expect(mounted.awardXP).not.toHaveBeenCalled();
    clickConversion();
    expect(draft()).toMatchObject({ value: '3125', unit: 'nm' });
    expect(mounted.state.microbiology.microscopeMeasurements.ecoli.result).toBeUndefined();
    expect(mounted.state.microbiology.microscopeMeasurements.ecoli.previousResult).toBeUndefined();
    expect(reference.open).toBe(false); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('keeps manual unit selection as a reinterpretation of the unchanged number and explains the distinction', () => {
    mount(); const result = mounted.state.microbiology.microscopeMeasurements.ecoli.result;
    act(() => Simulate.change(units(), { target: { value: 'nm' } }));
    expect(input().value).toBe('2.75'); expect(draft()).toMatchObject({ value: '2.75', unit: 'nm' });
    expect(preview().textContent).toContain('2.75 nm = 0.00275 µm');
    expect(mounted.container.textContent).toMatch(/unit.*keeps.*number|number.*unchanged|unit.*does not convert/i);
    expect(mounted.state.microbiology.microscopeMeasurements.ecoli.result).toMatchObject({ value: result.value, unit: result.unit, context: result.context });
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it.each(['', ' ', '+2', '2.', '1e', '0', '-2', '0x2', 'Infinity'])('keeps partial or invalid input %j raw and disables conversion', value => {
    mount(seed(value)); const before = mounted.state;
    expect(convert()).toBeTruthy(); expect(convert().disabled).toBe(true);
    act(() => convert().click());
    expect(mounted.state).toBe(before); expect(draft().value).toBe(value); expect(draft().unit).toBe('um');
    expect(preview().textContent).not.toContain('='); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'an unsupported raw unit', change: item => { item.unit = 'mm'; } },
    { label: 'an absent raw unit', change: item => { delete item.unit; } },
    { label: 'a numeric value without original decimal text', change: item => { item.value = 2.75; } },
    { label: 'an overlong raw value with a valid truncated prefix', change: item => { item.value = '2.75' + '0'.repeat(35); } }
  ])('does not convert $label after display normalization', item => {
    const value = seed(); item.change(value.microscopeMeasurements.ecoli.draft);
    mount(value); const before = mounted.state;
    expect(convert().disabled).toBe(true); act(() => convert().click());
    expect(mounted.state).toBe(before); expect(preview().textContent).not.toContain('=');
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('accepts the maximum target number without altering checked evidence', () => {
    mount(seed('1000000')); const before = mounted.state;
    clickConversion(); expect(mounted.state).toEqual(expectedConversion(before, '1000000000', 'nm'));
    expect(input().value).toBe('1000000000'); expect(checkButton().disabled).toBe(false);
  });

  it.each([
    { value: '1000001', unit: 'um' }, { value: '1000000000', unit: 'um' }, { value: '5e-324', unit: 'nm' }
  ])('disables a conversion outside the usable numeric range for $value $unit', item => {
    mount(seed(item.value, item.unit)); const before = mounted.state;
    expect(convert().disabled).toBe(true); act(() => convert().click());
    expect(mounted.state).toBe(before); expect(draft()).toMatchObject(item);
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('converts an earlier-calibration draft without replacing its context or making it ready to check', () => {
    const value = seed(); value.microscopeMeasurements.ecoli.draft.context = { ...context('ecoli', 'lightbright', 400, 50), imported: true };
    mount(value); const before = mounted.state, originalContext = draft().context;
    expect(checkButton().disabled).toBe(true); expect(convert().disabled).toBe(false);
    clickConversion();
    expect(mounted.state).toEqual(expectedConversion(before, '2750', 'nm'));
    expect(draft().context).toBe(originalContext); expect(checkButton().disabled).toBe(true);
    clickConversion(); expect(draft()).toMatchObject({ value: '2.75', unit: 'um' });
    expect(draft().context).toBe(originalContext); expect(checkButton().disabled).toBe(true);
  });

  it('uses latest unrelated state and preserves newer checked results, metadata, focus, and other tool work', () => {
    mount(); mounted.hold = true; clickConversion();
    act(() => mounted.change(previous => {
      const book = previous.microbiology.microscopeMeasurements;
      return { ...previous, otherTool: { ...previous.otherTool, newer: true }, microbiology: {
        ...previous.microbiology, microscopeFocus: 12, rootMetadata: { newer: true }, microscopeMeasurements: {
          ...book, importMetadata: { newer: true }, strep: { ...book.strep, newer: 'Other slide edit' },
          ecoli: { ...book.ecoli, metadata: ['Newer metadata'], result: { ...book.ecoli.result, value: 4, extra: 'Newer checked evidence' } }
        }
      } };
    }));
    const latest = mounted.state, originalContext = draft().context;
    release();
    expect(mounted.state).toEqual(expectedConversion(latest, '2750', 'nm'));
    expect(draft().context).toBe(originalContext); expect(mounted.state.microbiology.microscopeFocus).toBe(12);
    expect(checkButton().disabled).toBe(true); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  const superseding = [
    { label: 'a newer value', change: entry => ({ ...entry, draft: { ...entry.draft, value: '4.5' } }) },
    { label: 'a newer unit', change: entry => ({ ...entry, draft: { ...entry.draft, unit: 'nm' } }) },
    { label: 'an equal replacement draft', change: entry => ({ ...entry, draft: { ...entry.draft } }) },
    { label: 'a removed draft', change: entry => { const next = { ...entry }; delete next.draft; return next; } },
    { label: 'a changed draft calibration', change: entry => ({ ...entry, draft: { ...entry.draft, context: context('ecoli', 'lightbright', 400, 50) } }) },
    { label: 'a value changed on the same imported draft object', mutate: entry => { entry.draft.value = '7.5'; } },
    { label: 'a unit changed on the same imported draft object', mutate: entry => { entry.draft.unit = 'nm'; } },
    { label: 'a context replaced on the same imported draft object', mutate: entry => { entry.draft.context = { ...entry.draft.context }; } },
    { label: 'calibration changed on the same imported context object', mutate: entry => { Object.assign(entry.draft.context, context('ecoli', 'lightbright', 400, 20)); } },
    { label: 'a JSON reload', clone: true },
    { label: 'a different tab', patch: { tab: 'home' } },
    { label: 'a different slide', patch: { scopeOrganism: 'strep' } },
    { label: 'a different viewing method', patch: { selectedScope: 'em' } },
    { label: 'a different magnification', patch: { magnification: 400 } },
    { label: 'a different display zoom', patch: { microscopeZoom: 50 } }
  ];
  it.each(superseding)('rejects the queued conversion after $label and preserves the newer state exactly', item => {
    mount(); mounted.hold = true; clickConversion();
    act(() => mounted.change(previous => {
      if (item.clone) return JSON.parse(JSON.stringify(previous));
      const current = previous.microbiology, book = current.microscopeMeasurements;
      if (item.mutate) item.mutate(book.ecoli);
      return { ...previous, microbiology: { ...current, ...(item.patch || {}),
        ...(item.change ? { microscopeMeasurements: { ...book, ecoli: item.change(book.ecoli) } } : {}) } };
    }));
    const latest = mounted.state; release();
    expect(mounted.state).toBe(latest); expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('round-trips representation through JSON reload and retains both checked snapshots and raw import metadata', () => {
    mount(); const original = mounted.state.microbiology.microscopeMeasurements;
    clickConversion(); const saved = JSON.parse(JSON.stringify(mounted.state.microbiology));
    act(() => mounted.root.unmount()); mounted.container.remove(); mounted = null;
    mount(saved);
    expect(input().value).toBe('2750'); expect(units().value).toBe('nm');
    expect(preview().textContent).toContain('2750 nm = 2.75 µm');
    clickConversion();
    expect(mounted.state.microbiology.microscopeMeasurements).toEqual(original);
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });

  it('accepts frozen raw imports without mutating any context, result, or notebook metadata', () => {
    const value = freeze(seed()), original = JSON.stringify(value);
    mount(value); const before = mounted.state;
    clickConversion();
    expect(mounted.state).toEqual(expectedConversion(before, '2750', 'nm'));
    expect(JSON.stringify(value)).toBe(original); expect(draft().context).toBe(value.microscopeMeasurements.ecoli.draft.context);
    expect(mounted.awardXP).not.toHaveBeenCalled();
  });
});
