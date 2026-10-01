import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let Studio, root, host;
beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = globalThis.React = React;
  new Function(readFileSync('studio_module.js', 'utf8'))();
  Studio = window.AlloModules.AlloStudio;
});
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; host?.remove(); window.localStorage.clear(); vi.restoreAllMocks(); vi.useRealTimers();
});
function button(text) { return [...host.querySelectorAll('button')].find(b => b.textContent.replace(/^[^A-Za-z]+/, '').trim() === text); }
function click(text) { const b = button(text); expect(b, text).toBeTruthy(); act(() => b.click()); }
function mount(props = {}) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  const onClose = vi.fn();
  act(() => root.render(React.createElement(Studio, { t: key => key, onClose, addToast: vi.fn(), ...props })));
  click('Use template');
  return onClose;
}
function editTitle(value) {
  const input = host.querySelector('[aria-label="Document title"]');
  act(() => { input.value = value; input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); });
}
function saved() { return JSON.parse(localStorage.getItem('alloStudioAutosave_v1') || 'null'); }

describe('Page Designer recovery and workspace improvements', () => {
  it('saves the latest edit before the close callback, without waiting for autosave', () => {
    const onClose = mount(); editTitle('The latest teacher edit');
    act(() => host.querySelector('[aria-label="Close AlloStudio"]').click());
    expect(saved().doc.title).toBe('The latest teacher edit'); expect(onClose).toHaveBeenCalledOnce();
  });
  it('captures pending title text on pagehide', () => {
    mount(); const input = host.querySelector('[aria-label="Document title"]');
    act(() => { input.focus(); input.value = 'Final pending title'; window.dispatchEvent(new Event('pagehide')); });
    expect(saved().doc.title).toBe('Final pending title');
  });
  it('persists on unmount even if the debounce has not fired', () => {
    mount(); editTitle('Recovery after host navigation'); act(() => root.unmount()); root = null;
    expect(saved().doc.title).toBe('Recovery after host navigation');
  });
  it('keeps work open after a storage failure and supports retry', () => {
    const onClose = mount(); editTitle('Still recoverable in the editor');
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Storage is full', 'QuotaExceededError'); });
    act(() => host.querySelector('[aria-label="Close AlloStudio"]').click());
    expect(onClose).not.toHaveBeenCalled(); expect(host.textContent).toContain('Could not save on this device'); expect(button('Retry save')).toBeTruthy();
    write.mockRestore(); click('Retry save');
    expect(saved().doc.title).toBe('Still recoverable in the editor');
    expect(host.textContent).toContain('Saved on this device');
  });
  it('does not postpone autosave when an unrelated control changes', async () => {
    vi.useFakeTimers(); mount(); editTitle('Autosave independently');
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); }); click('Snap');
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(saved().doc.title).toBe('Autosave independently');
  });
  it('offers immediate text editing with secondary geometry collapsed', () => {
    mount();
    const object = host.querySelector('[role="group"][aria-label^="text: Your Event Title"]');
    expect(object).toBeTruthy(); act(() => object.dispatchEvent(new FocusEvent('focusin', { bubbles: true })));
    const text = host.querySelector('textarea[aria-label="Text"]'); expect(text).toBeTruthy();
    const layout = [...host.querySelectorAll('summary')].find(s => s.textContent === 'Layout and position');
    expect(layout.parentElement.open).toBe(false);
    expect(text.compareDocumentPosition(layout) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it('shows safe foreground colors for active snap and supports optional reading numbers', () => {
    mount(); const snap = button('Snap');
    expect(snap.style.color).toBe('rgb(15, 23, 42)'); expect(snap.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-st-reading-number]')).toBeNull(); click('Order numbers');
    expect(host.querySelector('[data-st-reading-number]')).toBeTruthy();
  });
  it('closes the export panel before closing the designer with Escape', () => {
    const onClose = mount(); click('Export');
    expect(host.querySelector('section[aria-label="Export choices"]')).toBeTruthy();
    act(() => button('Export').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(host.querySelector('section[aria-label="Export choices"]')).toBeNull(); expect(onClose).not.toHaveBeenCalled();
  });
});

describe('Measured page fit', () => {
  it('fits a portrait page within both dimensions of a short laptop viewport', () => {
    const scale = Studio.stCanvasViewportFitScale({ w: 816, h: 1056 }, { w: 717, h: 510 }, 'page');
    expect(1056 * scale).toBeLessThanOrEqual(494); expect(816 * scale).toBeLessThanOrEqual(701);
  });
  it('distinguishes fit width from fit page', () => {
    const canvas = { w: 816, h: 1056 }, viewport = { w: 372, h: 200 };
    const page = Studio.stCanvasViewportFitScale(canvas, viewport, 'page');
    const width = Studio.stCanvasViewportFitScale(canvas, viewport, 'width');
    expect(width).toBeGreaterThan(page); expect(width * 816).toBeCloseTo(356);
  });
});


describe('Page Designer editing gestures', () => {
  function titleObject() { return host.querySelector('[role="group"][aria-label*="text: Your Event Title"]'); }
  function pointer(node, type, x, y, button = 0) { node.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button })); }
  function recovery() { act(() => window.dispatchEvent(new Event('pagehide'))); return saved().doc; }
  it('commits the final pointer position when move and release share a React batch', () => {
    mount(); click('Snap'); const before = recovery(); const obj = before.objects.find(o => o.type === 'text');
    const scale = parseFloat(host.querySelector('[data-st-canvas-viewport]').firstElementChild.style.width) / before.canvas.w;
    const node = titleObject();
    act(() => { pointer(node, 'pointerdown', 100, 100); pointer(node, 'pointermove', 94, 110); pointer(node, 'pointerup', 88, 130); });
    const moved = recovery().objects.find(o => o.id === obj.id);
    expect(moved.frame.x).toBeCloseTo(obj.frame.x - 12 / scale, 0);
    expect(moved.frame.y).toBeCloseTo(obj.frame.y + 30 / scale, 0);
  });
  it('cancels a drag with Escape without adding an edit', () => {
    mount(); const before = recovery(); const node = titleObject();
    act(() => { pointer(node, 'pointerdown', 100, 100); pointer(node, 'pointermove', 160, 160); });
    act(() => node.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    act(() => pointer(node, 'pointerup', 160, 160));
    expect(recovery().objects).toEqual(before.objects); expect(recovery().ledger.ops.length).toBe(before.ledger.ops.length);
  });
  it('ignores secondary clicks and small tap movement', () => {
    mount(); const before = recovery(); const node = titleObject();
    act(() => { pointer(node, 'pointerdown', 100, 100, 2); pointer(node, 'pointermove', 150, 150, 2); pointer(node, 'pointerup', 150, 150, 2); });
    act(() => { pointer(node, 'pointerdown', 100, 100); pointer(node, 'pointermove', 101, 101); pointer(node, 'pointerup', 101, 101); });
    expect(recovery().objects).toEqual(before.objects); expect(recovery().ledger.ops.length).toBe(before.ledger.ops.length);
  });
  it('commits a pending field before selecting a canvas object', () => {
    mount(); const input = host.querySelector('[aria-label="Document title"]');
    act(() => { input.focus(); input.value = 'Pending text preserved'; });
    const node = titleObject(); act(() => { pointer(node, 'pointerdown', 100, 100); pointer(node, 'pointerup', 100, 100); });
    expect(recovery().title).toBe('Pending text preserved');
  });
  it('does not open an inline editor on locked text', () => {
    mount(); const node = titleObject(); act(() => node.focus());
    const checkbox = host.querySelector('[data-st-panel="inspector"] input[type="checkbox"]');
    act(() => checkbox.click()); act(() => titleObject().dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
    expect(host.querySelector('textarea[aria-label="Edit text"]')).toBeNull();
  });
});


describe('Page Designer insertion placement', () => {
  it('finds space without covering existing content on the current page', () => {
    const canvas = { w: 816, h: 1056 }, initial = { x: 60, y: 60, w: 400, h: 70 };
    const frame = Studio.stFindInsertFrame(initial, canvas, [{ type: 'text', frame: initial }], 0);
    expect(frame.y).toBeGreaterThanOrEqual(initial.y + initial.h + 12);
    expect(frame.x + frame.w).toBeLessThanOrEqual(canvas.w); expect(frame.y + frame.h).toBeLessThanOrEqual(canvas.h);
  });
  it('ignores occupied space on other pages and keeps crowded-page placement inside bounds', () => {
    const canvas = { w: 400, h: 300 }, initial = { x: 20, y: 20, w: 150, h: 60 };
    expect(Studio.stFindInsertFrame(initial, canvas, [{ page: 1, frame: initial }], 0)).toMatchObject(initial);
    const frame = Studio.stFindInsertFrame(initial, canvas, [{ frame: { x: 0, y: 0, w: 400, h: 300 } }], 0);
    expect(frame.x).toBeGreaterThanOrEqual(0); expect(frame.x + frame.w).toBeLessThanOrEqual(400); expect(frame.y + frame.h).toBeLessThanOrEqual(300);
  });
});

describe('Page Designer export lifecycle', () => {
  it('blocks duplicate PDF jobs and reports completion', async () => {
    let finish; const onExportTaggedPdf = vi.fn(() => new Promise(resolve => { finish = resolve; }));
    mount({ onExportTaggedPdf }); click('Export'); click('Tagged PDF (accessible)');
    expect(onExportTaggedPdf).toHaveBeenCalledOnce(); expect(button('Tagged PDF (accessible)').disabled).toBe(true);
    act(() => button('Tagged PDF (accessible)').click()); expect(onExportTaggedPdf).toHaveBeenCalledOnce();
    expect(host.querySelector('[data-st-export-status]').textContent).toContain('Preparing');
    await act(async () => finish(true)); expect(button('Tagged PDF (accessible)').disabled).toBe(false);
    expect(host.querySelector('[data-st-export-status]').textContent).toContain('export finished');
  });
  it('catches synchronous host failures and lets the user retry', async () => {
    const onExportTaggedPdf = vi.fn().mockImplementationOnce(() => { throw new Error('PDF service unavailable'); }).mockResolvedValue(true);
    mount({ onExportTaggedPdf }); click('Export'); await act(async () => button('Tagged PDF (accessible)').click());
    expect(host.querySelector('[data-st-export-status]').textContent).toContain('PDF service unavailable'); expect(button('Tagged PDF (accessible)').disabled).toBe(false);
    await act(async () => button('Tagged PDF (accessible)').click()); expect(onExportTaggedPdf).toHaveBeenCalledTimes(2);
    expect(host.querySelector('[data-st-export-status]').textContent).toContain('export finished');
  });
  it('shows an incomplete export instead of success when the host returns false', async () => {
    mount({ onExportTaggedPdf: () => Promise.resolve(false) }); click('Export'); await act(async () => button('Tagged PDF (accessible)').click());
    expect(host.querySelector('[data-st-export-status]').textContent).toContain('did not complete');
  });
});


describe('Page Designer review follow-through', () => {
  it('offers snap candidates only from the current page and excludes the selection', () => {
    const objects = [{ id: 'active' }, { id: 'same', page: 0 }, { id: 'hidden', page: 1 }, { id: 'locked', page: 0, locked: true }];
    expect(Studio.stSnapCandidates(objects, 0, ['active']).map(o => o.id)).toEqual(['same', 'locked']);
    expect(Studio.stSnapCandidates(objects, 1, ['hidden'])).toEqual([]);
  });
  it('marks linked Activity work dirty after Undo and Redo', () => {
    mount({ initialResource: { artifactId: 'test-worksheet', sourceRevision: '1' }, onSaveGeneratedArtifact: () => ({ ok: true, sourceRevision: '2' }) });
    editTitle('Activity edit'); click('Save to Activity'); expect(host.textContent).toContain('Saved to Activity');
    click('Undo'); expect(host.textContent).toContain('Unsaved Activity changes');
    click('Save to Activity'); expect(host.textContent).toContain('Saved to Activity');
    click('Redo'); expect(host.textContent).toContain('Unsaved Activity changes');
  });
  it('selects a group with taps without keyboard modifiers', () => {
    mount(); click('Select multiple');
    const objects = [...host.querySelectorAll('[role="group"][aria-label^="text:"]')].slice(0, 2);
    expect(objects.length).toBe(2);
    for (const node of objects) act(() => node.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: 100, clientY: 100 })));
    expect(host.textContent).toContain('2 selected'); click('Done selecting');
    expect(host.textContent).toContain('Selection - 2 objects');
    expect(host.querySelectorAll('[role="group"][aria-label^="Selected text:"]').length).toBe(2);
  });
  it('provides page previews that navigate to the chosen page', () => {
    mount(); const actions = host.querySelector('[aria-label="Page actions"]');
    act(() => { actions.value = 'duplicate'; actions.dispatchEvent(new Event('change', { bubbles: true })); });
    click('Pages'); const previews = host.querySelector('[aria-label="Page previews"]');
    expect(previews.querySelectorAll('button').length).toBe(2);
    act(() => previews.querySelector('[aria-label="Go to page 1"]').click());
    expect(host.querySelector('[aria-label="Select page"]').value).toBe('0');
    expect(previews.querySelector('[aria-label="Go to page 1"]').getAttribute('aria-current')).toBe('page');
  });
});
