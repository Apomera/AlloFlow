import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { React, ReactDOMServer, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const POOL = ['quartz', 'feldspar', 'mica', 'calcite', 'halite', 'pyrite', 'talc', 'gypsum', 'magnetite', 'hematite', 'galena', 'fluorite'];
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const found = find(child, predicate); if (found) return found; } return null; }
  if (predicate(node)) return node;
  return find(node.props?.children, predicate);
}
function session(patch = {}) {
  const store = { rocks: { mode: 'workbench', wb: {
    spId: 'calcite', order: POOL, scratch: {}, lens: 'glassy', streakDone: true, streakObs: 'powder-white',
    selectedId: 'calcite', claimEvidence: ['luster', 'streak'], claimReasoning: 'both', claimConfidence: 'somewhat', guided: false,
    history: [{ tool: 'lens', choice: 'glassy', label: 'Glassy' }, { tool: 'streak', choice: 'powder-white', label: 'White powder' }],
    ...patch,
  } }, rockCycle: {}, unrelated: { preserved: true } };
  const announce = vi.fn();
  const render = () => window.StemLab._registry.rocks.render(makeCtx({ toolData: store, setToolData: (update) => Object.assign(store, typeof update === 'function' ? update(store) : update), announceToSR: announce }));
  const control = (attribute, value = true) => find(render(), (node) => node.props?.[attribute] === value);
  const submit = () => find(render(), (node) => node.type === 'button' && node.props['aria-describedby'] === 'wb-claim-readiness');
  return { store, render, control, submit, announce };
}
const archiveEntry = (n) => ({ id: 'investigation-' + n, specimenId: 'calcite', specimenLabel: 'Calcite', report: 'Evidence report ' + n, reflection: '', evidence: [{ key: 'lens', text: 'Glassy' }] });

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_rocks.js', 'rocks'); vi.useFakeTimers(); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('mineral investigation portfolio', () => {
  it('archives evidence, observation history, reasoning and confidence only once on successful submission', () => {
    const run = session();
    const submit = run.submit();
    expect(submit.props.disabled).toBe(false);
    submit.props.onClick();
    submit.props.onClick();
    expect(run.store.rocks.wb.solved).toBe(1);
    expect(run.store.rocks.wb.archive).toHaveLength(1);
    const entry = run.store.rocks.wb.archive[0];
    expect(entry).toMatchObject({ specimenId: 'calcite', confidence: 'somewhat', claimEvidence: ['luster', 'streak'] });
    expect(entry.observations).toHaveLength(2);
    expect(entry.evidence).toHaveLength(2);
    expect(entry.reasoning).toBeTruthy();
    expect(entry.report).toContain('Identified:');
    expect(entry.report).toContain('Confidence at submission:');
    expect(JSON.parse(JSON.stringify(entry))).toEqual(entry);
    expect(run.store.unrelated).toEqual({ preserved: true });
    run.control('data-wb-next-specimen', 'true').props.onClick();
    expect(run.store.rocks.wb.history).toEqual([]);
    expect(run.store.rocks.wb.archive[0]).toEqual(entry);
    expect(run.control('data-wb-archive-entry', entry.id)).toBeTruthy();
  });

  it('does not archive an incomplete, incorrect, or stale claim', () => {
    const incomplete = session({ claimConfidence: null });
    incomplete.submit().props.onClick();
    expect(incomplete.store.rocks.wb.archive).toBeUndefined();
    const wrong = session({ spId: 'halite' });
    wrong.submit().props.onClick();
    expect(wrong.store.rocks.wb.archive).toBeUndefined();
    const stale = session();
    const oldSubmit = stale.submit();
    stale.store.rocks.wb.spId = 'quartz';
    oldSubmit.props.onClick();
    expect(stale.store.rocks.wb.archive).toBeUndefined();
  });

  it('keeps the most recent 30 records and safely ignores malformed saved records', () => {
    const run = session({ archive: Array.from({ length: 30 }, (_, i) => archiveEntry(i + 1)), archiveSerial: 30 });
    run.submit().props.onClick();
    expect(run.store.rocks.wb.archive).toHaveLength(30);
    expect(run.store.rocks.wb.archive[0].id).toBe('investigation-2');
    expect(run.store.rocks.wb.archive.at(-1).id).toBe('investigation-31');
    const damaged = session({ archive: [null, 'bad', { id: 'investigation-2', specimenId: 'unknown', report: 'bad' }, archiveEntry(1), archiveEntry(1)] });
    const html = ReactDOMServer.renderToStaticMarkup(React.createElement(() => damaged.render()));
    expect(html).toContain('data-wb-archive-count="1"');
  });

  it('keeps reflection changes with their original report and includes them in the download', () => {
    const run = session({ archive: [archiveEntry(1)] });
    run.control('data-wb-archive-reflection', 'investigation-1').props.onChange({ target: { value: 'Next time I would bracket the hardness.' } });
    expect(run.store.rocks.wb.archive[0].reflection).toContain('bracket');
    let downloaded;
    const RealBlob = globalThis.Blob;
    vi.stubGlobal('Blob', class extends RealBlob { constructor(parts, opts) { super(parts, opts); downloaded = parts.join(''); } });
    const createURL = vi.fn(() => 'blob:report');
    const revokeURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    run.control('data-wb-download-report', 'investigation-1').props.onClick();
    expect(downloaded).toContain('Evidence report 1');
    expect(downloaded).toContain('Next time I would bracket the hardness.');
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download="investigation-1-calcite.txt"]')).toBeNull();
    vi.advanceTimersByTime(1000);
    expect(revokeURL).toHaveBeenCalledWith('blob:report');
    delete URL.createObjectURL;
    delete URL.revokeObjectURL;
  });
});

describe('notebook copying', () => {
  it('waits for clipboard completion before announcing success', async () => {
    const run = session();
    let resolve;
    window.StemLab.writeClipboard = vi.fn(() => new Promise((done) => { resolve = done; }));
    const pending = run.control('data-wb-copy-notebook', 'true').props.onClick();
    expect(run.announce).not.toHaveBeenCalled();
    resolve(true);
    await pending;
    expect(run.announce).toHaveBeenCalledWith('Notebook copied to the clipboard.');
  });

  it('provides a visible selectable report when asynchronous clipboard and fallback copying fail', async () => {
    const run = session();
    window.StemLab.writeClipboard = vi.fn().mockRejectedValue(new Error('permission denied'));
    const previous = document.execCommand;
    document.execCommand = vi.fn(() => false);
    await run.control('data-wb-copy-notebook', 'true').props.onClick();
    expect(run.announce).not.toHaveBeenCalledWith('Notebook copied to the clipboard.');
    expect(run.store.rocks.wb.copyFallbackText).toContain('Evidence in force:');
    const manual = run.control('data-wb-manual-copy');
    expect(manual.props.readOnly).toBe(true);
    expect(manual.props.value).toContain('White powder');
    document.execCommand = previous;
  });
});
