import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
const clone = value => JSON.parse(JSON.stringify(value));
const scan = { modality: 'CT', region: 'chest', plane: 'axial', slice: 50, sequence: 'T1' };
const savedWork = {
  note: 'My current scan note', showLabels: true,
  annotations: [{ id: 'saved-pin', type: 'pin', x: 0.2, y: 0.4, note: 'Saved observation', modality: 'CT', region: 'head', plane: 'axial', slice: 0 }],
  modalityPicks: { fracture: 'CT' }, bodyScopeAnswers: { saved: 'above' }
};
const context = value => ({ modality: value.modality, region: value.region, plane: value.plane, slice: value.slice, sequence: value.modality === 'MRI' ? value.sequence : null });
const boundRound = (extra = {}) => ({ version: 1, serial: 7, active: true, target: 'Heart', result: null, clickX: null, clickY: null, score: 2, total: 4, context: context(scan), ...extra });

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const match = find(child, predicate); if (match) return match; }
    return null;
  }
  return predicate(node) ? node : find(node.props?.children, predicate);
}

function drawingContext() {
  const noop = () => {};
  return { beginPath: noop, moveTo: noop, lineTo: noop, stroke: noop, fillText: noop, measureText: text => ({ width: String(text).length * 6 }), ellipse: noop, arc: noop, fill: noop, fillRect: noop, save: noop, restore: noop, clearRect: noop, setLineDash: noop };
}

function pointer(x, y) {
  const rect = { left: 12, top: 24, width: 320, height: 240 };
  return { currentTarget: { getBoundingClientRect: () => rect }, clientX: rect.left + (44 + x * 552) / 640 * rect.width, clientY: rect.top + (28 + y * 408) / 480 * rect.height };
}
const keyEvent = (key, extra = {}) => ({ key, preventDefault: vi.fn(), ...extra });
const settle = () => vi.advanceTimersByTime(20);

function session(file, imaging = {}, extra = {}) {
  resetStemLab();
  const tool = loadTool(file, 'anatomy');
  let data = { anatomy: { _activeTab: 'imaging', system: 'organs', view: 'anterior', complexity: 3, _startHereDismissed: true, _structureNotes: { heart: 'Structure note' }, imaging: { ...scan, ...clone(savedWork), ...imaging }, ...extra } };
  let host, deferred = false, queue = [];
  const announce = vi.fn();
  const apply = update => { data = typeof update === 'function' ? update(data) : update; };
  const setToolData = update => deferred ? queue.push(update) : apply(update);
  const ctx = () => ({ toolData: data, gradeLevel: '9', setToolData, announceToSR: announce });
  const tree = () => tool.render(makeCtx(ctx()));
  const node = (hook, value = true) => {
    const result = find(tree(), typeof hook === 'function' ? hook : element => element.props?.[hook] === value);
    expect(result).not.toBeNull();
    return result;
  };
  const handler = (hook, value = true) => node(hook, value).props.onClick;
  const markup = () => renderTool('anatomy', data, ctx());
  markup(); vi.advanceTimersByTime(0); announce.mockClear();
  return {
    data: () => data.anatomy, imaging: () => data.anatomy.imaging, announce, node, handler,
    click: (hook, value = true) => handler(hook, value)(),
    change: (id, value) => node('id', id).props.onChange({ target: { value } }),
    canvas: () => node('data-anatomy-imaging-canvas', 'true'),
    answer: (x = 0, y = 0) => node('data-anatomy-imaging-canvas', 'true').props.onClick(pointer(x, y)),
    hit: () => {
      const value = data.anatomy.imaging;
      const target = window.__alloAnatomyImagingPure.drawAnatomyImagingSlice(drawingContext(), 640, 480, { ...value, noise: false }).regions.find(item => item.text === value.spot.target);
      expect(target).toBeTruthy();
      node('data-anatomy-imaging-canvas', 'true').props.onClick(pointer((target.x - 44) / 552, (target.y - 28) / 408));
    },
    patch: patch => { data = { ...data, anatomy: { ...data.anatomy, ...patch } }; },
    patchImaging: patch => { data = { ...data, anatomy: { ...data.anatomy, imaging: { ...data.anatomy.imaging, ...patch } } }; },
    html: () => { const root = document.createElement('div'); root.innerHTML = markup(); return root; },
    mount: () => { if (!host) { host = document.createElement('div'); document.body.appendChild(host); } host.innerHTML = markup(); return host; },
    defer: () => { deferred = true; },
    flush: () => { deferred = false; const pending = queue; queue = []; pending.forEach(apply); }
  };
}

let scrollDescriptor;
beforeEach(() => {
  resetStemLab(); vi.useFakeTimers(); vi.setSystemTime(1800000000000);
  document.body.innerHTML = '';
  scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() });
});
afterEach(() => {
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = '';
  if (scrollDescriptor) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scrollDescriptor);
  else delete HTMLElement.prototype.scrollIntoView;
});

for (const file of files) describe('Imaging question ownership and navigation: ' + file, () => {
  it.each([['CT', 'T1'], ['MRI', 'T1'], ['MRI', 'T2']])('binds a fresh question to stable %s codes and sequence %s while preserving learner work', (modality, sequence) => {
    const s = session(file, { modality, sequence }), before = clone(s.data());
    s.click('data-anatomy-spot-start');
    expect(s.imaging().spot).toMatchObject({ version: 1, serial: 1, active: true, result: null, context: { modality, region: 'chest', plane: 'axial', slice: 50, sequence: modality === 'MRI' ? sequence : null } });
    expect(s.imaging().spot.target).toEqual(expect.any(String));
    expect(s.imaging().spot).toMatchObject({ score: 0, total: 0 });
    const { spot, rulerStart, ...remaining } = s.imaging();
    expect(remaining).toEqual(before.imaging);
    expect(s.data()._structureNotes).toEqual(before._structureNotes);
  });

  it('keeps practice and its context above the scan, with resolvable answer instructions and mixed-language input', () => {
    const s = session(file, { spot: boundRound(), note: 'My note ملاحظتي' }), before = clone(s.data()), root = s.html();
    const practice = root.querySelector('[data-anatomy-imaging-practice]');
    const challenge = practice.querySelector('[data-anatomy-spot-challenge]'), canvas = practice.querySelector('[data-anatomy-imaging-canvas]');
    expect(challenge.compareDocumentPosition(canvas) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(practice.compareDocumentPosition(root.querySelector('[data-anatomy-bodyscope]')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(root.querySelectorAll('[data-anatomy-spot-challenge]')).toHaveLength(1);
    expect(practice.querySelector('[data-anatomy-spot-context]').textContent.replace(/[\u2066-\u2069]/g, '')).toContain('CT · Chest · Axial · slice 50');
    expect(root.querySelector('#imaging-note').getAttribute('dir')).toBe('auto');
    expect(canvas.getAttribute('aria-describedby').split(' ').every(id => !!root.querySelector('#' + id))).toBe(true);
    expect(practice.querySelector('[data-anatomy-spot-prompt]').getAttribute('tabindex')).toBe('-1');
    expect(root.querySelector('[data-anatomy-imaging-labels]').disabled).toBe(true);
    expect(s.data()).toEqual(before);
  });

  for (const [name, imaging, change] of [
    ['modality', {}, s => s.click('data-anatomy-imaging-modality', 'MRI')],
    ['region', {}, s => s.click('data-anatomy-imaging-region', 'head')],
    ['plane', {}, s => s.click('data-anatomy-imaging-plane', 'coronal')],
    ['slice', {}, s => s.change('anatomy-imaging-slice', 75)],
    ['MRI sequence', { modality: 'MRI', sequence: 'T1' }, s => s.click('data-anatomy-imaging-sequence', 'T2')]
  ]) it('ends a question when its ' + name + ' changes and retains every saved observation and answer', () => {
    const boundContext = context({ ...scan, ...imaging });
    const s = session(file, { ...imaging, spot: boundRound({ context: boundContext }) }), before = clone(s.data());
    change(s); settle();
    expect(s.imaging().spot).toMatchObject({ active: false, serial: 8, target: null, result: null, context: null, interrupted: 'context', score: 2, total: 4 });
    for (const field of ['note', 'annotations', 'modalityPicks', 'bodyScopeAnswers', 'showLabels']) expect(s.imaging()[field]).toEqual(before.imaging[field]);
    expect(s.data()._structureNotes).toEqual(before._structureNotes);
    expect(s.html().querySelector('[data-anatomy-spot-challenge]').textContent).toContain('The scan changed');
    expect(s.announce).toHaveBeenCalledWith(expect.stringContaining('The scan changed'));
    s.patchImaging(scan);
    expect(s.html().querySelector('[data-anatomy-spot-challenge]').getAttribute('data-anatomy-spot-challenge')).toBe('idle');
    expect(s.imaging().spot.active).toBe(false);
  });

  it('retains question ownership when only display contrast, crosshair and comparison change', () => {
    const s = session(file, { spot: boundRound() }), before = clone(s.imaging().spot);
    s.change('imaging-window-width', 800); s.change('imaging-window-level', 70);
    s.click('data-anatomy-imaging-compare-toggle', 'true');
    s.node(element => element.type === 'button' && element.props?.children === 'Hide crosshair').props.onClick();
    expect(s.imaging().showCrosshair).toBe(false);
    expect(s.imaging().spot).toEqual(before);
    expect(s.html().querySelector('[data-anatomy-spot-challenge]').getAttribute('data-anatomy-spot-challenge')).toBe('open');
  });

  it.each(['hit', 'miss'])('accepts one %s answer from repeated captured callbacks and announces it once', result => {
    const s = session(file, { spot: boundRound() }), captured = s.canvas().props.onClick;
    if (result === 'hit') s.hit(); else captured(pointer(0, 0));
    const answered = clone(s.data());
    captured(pointer(0.8, 0.8)); captured(pointer(0.1, 0.1)); settle();
    expect(s.data()).toEqual(answered);
    expect(s.imaging().spot).toMatchObject({ result, score: result === 'hit' ? 3 : 2, total: 5 });
    expect(s.announce).toHaveBeenCalledTimes(1);
    expect(s.announce.mock.calls[0][0]).toContain(s.imaging().spot.target);
    expect(s.imaging().annotations).toEqual(savedWork.annotations);
    expect(s.imaging().note).toBe(savedWork.note);
  });

  it('scores against the latest counters without replacing newer writing or observations', () => {
    const s = session(file, { spot: boundRound() }), answer = s.canvas().props.onClick;
    const newerAnnotations = [...savedWork.annotations, { id: 'newer', type: 'pin', note: 'Newer note' }];
    s.patchImaging({ spot: { ...s.imaging().spot, score: 9, total: 12 }, note: 'New draft', annotations: newerAnnotations });
    answer(pointer(0, 0));
    expect(s.imaging().spot).toMatchObject({ score: 9, total: 13, result: 'miss' });
    expect(s.imaging().note).toBe('New draft');
    expect(s.imaging().annotations).toEqual(newerAnnotations);
  });

  for (const [name, advance] of [
    ['Skip', s => s.click('data-anatomy-spot-skip')],
    ['Next', s => { s.answer(); s.click('data-anatomy-spot-next'); }],
    ['End', s => s.click('data-anatomy-spot-end')],
    ['a context change', s => s.change('anatomy-imaging-slice', 75)],
    ['leaving Imaging', s => s.patch({ _activeTab: 'explore' })],
    ['restoring a foreign context', s => s.patchImaging({ spot: boundRound({ context: { ...context(scan), slice: 75 } }) })]
  ]) it('rejects a captured answer after ' + name + ' without cursor writes or extra announcement', () => {
    const s = session(file, { spot: boundRound() }), answer = s.canvas().props.onClick;
    advance(s); settle(); s.announce.mockClear();
    const before = clone(s.data());
    answer(pointer(0.8, 0.7)); settle();
    expect(s.data()).toEqual(before);
    expect(s.announce).not.toHaveBeenCalled();
  });

  it.each(['start', 'skip', 'next', 'end'])('rejects a repeated captured %s action after its round changed', action => {
    const initial = action === 'start' ? {} : { spot: boundRound(action === 'next' ? { result: 'hit', clickX: 0.5, clickY: 0.5 } : {}) };
    const s = session(file, initial), callback = s.handler('data-anatomy-spot-' + action);
    callback(); settle(); s.announce.mockClear();
    const before = clone(s.data()); callback(); settle();
    expect(s.data()).toEqual(before);
    expect(s.announce).not.toHaveBeenCalled();
  });

  it('accepts only one deferred answer after multiple callbacks queue against one render', () => {
    const s = session(file, { spot: boundRound() }), callback = s.canvas().props.onClick;
    s.defer(); callback(pointer(0, 0)); callback(pointer(0.8, 0.8));
    expect(s.imaging().spot.result).toBeNull();
    s.flush(); settle();
    expect(s.imaging().spot).toMatchObject({ result: 'miss', total: 5 });
    expect(s.announce).toHaveBeenCalledTimes(1);
  });

  it('rejects a deferred answer if the tab changes before its updater executes', () => {
    const s = session(file, { spot: boundRound() }), callback = s.canvas().props.onClick;
    s.defer(); callback(pointer(0, 0)); s.patch({ _activeTab: 'explore' });
    const before = clone(s.data()); s.flush(); settle();
    expect(s.data()).toEqual(before);
    expect(s.announce).not.toHaveBeenCalled();
  });

  it.each([null, 'hit'])('restores a correctly bound %s round without changing its scan or saved data', result => {
    const s = session(file, { spot: boundRound({ result, clickX: result ? 0.5 : null, clickY: result ? 0.5 : null }) }), before = clone(s.data());
    const root = s.html();
    expect(root.querySelector('[data-anatomy-spot-challenge]').getAttribute('data-anatomy-spot-challenge')).toBe(result || 'open');
    expect(root.querySelector(result ? '[data-anatomy-spot-feedback]' : '[data-anatomy-spot-prompt]')).toBeTruthy();
    expect(s.data()).toEqual(before);
  });

  for (const [name, round] of [
    ['legacy', { active: true, target: 'Heart', score: 2, total: 4 }],
    ['foreign', boundRound({ context: { ...context(scan), slice: 75 } })],
    ['malformed', boundRound({ context: { ...context(scan), slice: '50' } })]
  ]) it('offers independent fresh recovery for a ' + name + ' saved question and blocks unintended pin placement', () => {
    const s = session(file, { spot: round }), before = clone(s.data());
    const root = s.html();
    expect(root.querySelector('[data-anatomy-spot-challenge]').textContent).toContain('This saved question cannot be matched');
    expect(s.data()).toEqual(before);
    s.answer(); settle(); expect(s.data()).toEqual(before); expect(s.announce).not.toHaveBeenCalled();
    s.click('data-anatomy-spot-start');
    expect(s.imaging().spot).toMatchObject({ active: true, version: 1, context: context(scan), score: 2, total: 4 });
    expect(s.imaging().spot.serial).toBeGreaterThan(round.serial || 0);
    expect(s.imaging().annotations).toEqual(before.imaging.annotations);
  });

  it.each([true, false])('keeps requested labels %s across an unanswered question and End', showLabels => {
    const s = session(file, { showLabels }), oldToggle = s.handler('data-anatomy-imaging-labels');
    s.click('data-anatomy-spot-start');
    expect(s.node('data-anatomy-imaging-labels').props.disabled).toBe(true);
    oldToggle(); s.handler('data-anatomy-imaging-labels')();
    expect(s.imaging().showLabels).toBe(showLabels);
    s.click('data-anatomy-spot-end');
    expect(s.imaging().showLabels).toBe(showLabels);
    expect(s.node('data-anatomy-imaging-labels').props.disabled).toBe(false);
  });

  it('uses the latest observation draft and log when an idle captured canvas places a pin', () => {
    const s = session(file), place = s.canvas().props.onClick;
    const annotations = [...savedWork.annotations, { id: 'extra', type: 'pin', note: 'Saved later' }];
    s.patchImaging({ note: 'ملاحظتي latest', annotations }); place(pointer(0.5, 0.5));
    expect(s.imaging().annotations.slice(0, -1)).toEqual(annotations);
    expect(s.imaging().annotations.at(-1)).toMatchObject({ type: 'pin', note: 'ملاحظتي latest', modality: 'CT', region: 'chest', plane: 'axial', slice: 50 });
    expect(s.imaging().note).toBe('');
    expect(s.imaging().modalityPicks).toEqual(savedWork.modalityPicks);
    expect(s.imaging().bodyScopeAnswers).toEqual(savedWork.bodyScopeAnswers);
  });

  it('keeps a stale idle placement callback from creating annotations in a new question', () => {
    const s = session(file), place = s.canvas().props.onClick;
    s.click('data-anatomy-spot-start'); settle(); s.announce.mockClear();
    const before = clone(s.data()); place(pointer(0.4, 0.4)); settle();
    expect(s.data()).toEqual(before); expect(s.announce).not.toHaveBeenCalled();
  });

  it('resumes annotations after ending an unmatched saved round and preserves its score', () => {
    const s = session(file, { spot: { active: true, target: 'Heart', score: 2, total: 4 } });
    s.click('data-anatomy-spot-end');
    const before = clone(s.imaging().spot); s.answer(0.5, 0.5);
    expect(s.imaging().spot).toEqual(before);
    expect(s.imaging().annotations).toHaveLength(savedWork.annotations.length + 1);
    expect(s.imaging().spot).toMatchObject({ active: false, score: 2, total: 4 });
  });

  it('moves the keyboard cursor from latest state and submits it once while leaving Tab and modified keys alone', () => {
    const s = session(file, { spot: boundRound(), kbX: 0.4, kbY: 0.3 }), key = s.canvas().props.onKeyDown;
    key(keyEvent('ArrowRight')); key(keyEvent('ArrowRight'));
    expect(s.imaging().kbX).toBeCloseTo(0.44, 8);
    key(keyEvent('ArrowDown', { shiftKey: true }));
    expect(s.imaging().kbY).toBeCloseTo(0.4, 8);
    const before = clone(s.data());
    for (const event of [keyEvent('Tab'), keyEvent('Enter', { ctrlKey: true }), keyEvent(' ', { repeat: true }), keyEvent('Enter', { isComposing: true })]) { key(event); expect(event.preventDefault).not.toHaveBeenCalled(); }
    expect(s.data()).toEqual(before);
    key(keyEvent('Enter')); key(keyEvent(' '));
    expect(s.imaging().spot).toMatchObject({ total: 5 });
    expect(s.imaging().spot.clickX).toBeCloseTo(0.44, 8);
    expect(s.imaging().spot.clickY).toBeCloseTo(0.4, 8);
  });

  it('focuses the scan, nearby answer, review scan and return target without changing learner data', () => {
    const s = session(file); s.mount(); s.click('data-anatomy-spot-start'); s.mount(); settle();
    expect(document.activeElement.hasAttribute('data-anatomy-imaging-canvas')).toBe(true);
    s.answer(); s.mount(); settle();
    expect(document.activeElement.hasAttribute('data-anatomy-spot-feedback')).toBe(true);
    const reviewed = clone(s.data());
    s.click('data-anatomy-spot-review-scan'); settle();
    expect(document.activeElement.hasAttribute('data-anatomy-imaging-canvas')).toBe(true);
    s.canvas().props.onKeyDown(keyEvent('Escape')); settle();
    expect(document.activeElement.hasAttribute('data-anatomy-spot-feedback')).toBe(true);
    expect(s.data()).toEqual(reviewed);
    s.click('data-anatomy-spot-next'); s.mount(); settle();
    s.canvas().props.onKeyDown(keyEvent('Escape')); settle();
    expect(document.activeElement.hasAttribute('data-anatomy-spot-prompt')).toBe(true);
    s.click('data-anatomy-spot-end'); s.mount(); settle();
    expect(document.activeElement.hasAttribute('data-anatomy-spot-start')).toBe(true);
    expect(document.querySelector('[data-anatomy-imaging-practice]').scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'auto' });
  });

  it('never focuses a replacement question from a previous round timer', () => {
    const s = session(file); s.mount(); s.click('data-anatomy-spot-start');
    s.change('anatomy-imaging-slice', 75); const root = s.mount();
    const slice = root.querySelector('#anatomy-imaging-slice'); slice.focus(); settle();
    expect(document.activeElement).toBe(slice);
    expect(s.imaging().spot.active).toBe(false);
  });
});
