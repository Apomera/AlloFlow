// Student tools: the page Magnifier.
//
// WHY (2026-11-12): students asked for a magnifying glass that works on the
// whole reading page (passage text, pictures, anything), not a button on each
// picture. The lens is a scaled copy of the real page region under the pointer,
// kept in a shadow root. These pins cover the promises it makes: one toggle in
// the Focus tools, a lens that never takes a click and that screen readers skip,
// geometry that puts the point under the pointer in the middle of the lens, a
// copy that does not load or play media twice, Escape and arrow keys, and the
// on/off + strength choice remembered on this device like the reading ruler.
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import fs from 'node:fs';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let FabStack;
let container;
let root;
let restoreRects = null;
let content = null;
const realElementFromPoint = document.elementFromPoint;
const noop = () => {};

function propsFor(extra = {}) {
  return {
    activeView: 'dashboard', addToast: noop, focusMode: false, generatedContent: null,
    handleSetIsSyntaxGameToTrue: noop, handleSetShowStudyTimerModalToTrue: noop, handleToggleFocusMode: noop,
    handleToggleIsFabExpanded: noop, handleToggleReadingRuler: noop, handleToggleShowSocraticChat: noop,
    handleToggleVisualSupports: noop, interactionMode: 'read', isCompareMode: false, isDictationMode: false,
    dictationStatus: null, isFabExpanded: true, isFluencyMode: false, isLineFocusMode: false,
    isStudyTimerRunning: false, isTeacherMode: false, readingRuler: false, runTour: false,
    setFocusedParagraphIndex: noop, setInteractionMode: noop, setIsCompareMode: noop, setIsDictationMode: noop,
    setIsFluencyMode: noop, setIsLineFocusMode: noop, setRevisionData: noop, setSelectionMenu: noop,
    showSocraticChat: false, showVisualSupports: false, stopPlayback: noop,
    studentProjectSettings: { allowSocraticTutor: false, allowDictation: false }, studentAiFeaturesHidden: false,
    t: (key) => key,
    ...extra,
  };
}

function Harness() {
  const [expanded, setExpanded] = React.useState(true);
  return React.createElement(FabStack, propsFor({ isFabExpanded: expanded, handleToggleIsFabExpanded: () => setExpanded((v) => !v) }));
}

const lens = () => document.querySelector('[data-allo-magnifier="lens"]');
const stage = () => lens().shadowRoot.querySelector('[data-magnifier-stage]');
const toggle = () => container.querySelector('[data-magnifier-toggle]');
const zoomButton = (zoom) => container.querySelector(`[data-magnifier-zoom="${zoom}"]`);
const settle = (ms = 80) => act(async () => { await new Promise((done) => setTimeout(done, ms)); });
const moveType = () => (typeof window.PointerEvent === 'function' ? 'pointermove' : 'mousemove');

async function mount() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
  await act(async () => root.render(React.createElement(Harness)));
}
async function click(element) {
  await act(async () => { element.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); });
}
async function key(target, init) {
  let event;
  await act(async () => {
    event = new window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
  });
  return event;
}
async function pointAt(x, y) {
  await act(async () => { window.dispatchEvent(new window.MouseEvent(moveType(), { clientX: x, clientY: y, bubbles: true })); });
  await settle();
}

// jsdom has no layout: give the reading page fixed boxes, the way a browser would.
function stubRects() {
  const original = window.Element.prototype.getBoundingClientRect;
  window.Element.prototype.getBoundingClientRect = function rect() {
    const r = this.__rect || { left: 0, top: 0, width: 0, height: 0 };
    return { ...r, x: r.left, y: r.top, right: r.left + r.width, bottom: r.top + r.height };
  };
  return () => { window.Element.prototype.getBoundingClientRect = original; };
}
function buildPage() {
  content = document.createElement('main');
  content.id = 'content';
  content.style.cssText = 'display:block;overflow:visible;';
  content.innerHTML = '<p id="para" style="display:block;overflow:visible;">Bees make <b>honey</b>.</p>'
    + '<video id="clip" autoplay></video><iframe id="frame" title="x"></iframe><audio autoplay></audio>'
    + '<input type="radio" name="pick" value="a"><input type="radio" name="pick" value="b" checked>'
    + '<textarea id="answer">old</textarea><img id="pic" alt="A bee" onerror="window.__fired = 1">';
  document.body.insertBefore(content, document.body.firstChild);
  content.__rect = { left: 100, top: 20, width: 600, height: 400 };
  content.querySelector('#para').__rect = { left: 120, top: 80, width: 500, height: 120 };
  document.elementFromPoint = () => content.querySelector('#para');
}

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule(process.env.ALLO_FAB_CANDIDATE || 'view_fab_stack_module.js');
  FabStack = window.AlloModules.FabStack.FabStack;
});

beforeEach(() => { window.localStorage.clear(); });

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null;
  if (container) container.remove();
  container = null;
  if (content) content.remove();
  content = null;
  if (restoreRects) restoreRects();
  restoreRects = null;
  document.elementFromPoint = realElementFromPoint;
});

describe('Magnifier toggle in Student tools', () => {
  it('sits in Focus after the reading ruler, with an English fallback while the key is untranslated', async () => {
    await mount();
    const tools = container.querySelectorAll('[data-student-tool="true"]');
    expect(tools[0].getAttribute('data-help-key')).toBe('fab_ruler');
    expect(tools[1]).toBe(toggle());
    expect(toggle().getAttribute('aria-label')).toBe('Magnifier');
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
    expect(toggle().textContent).toContain('Enlarges what is under your pointer or finger');
    expect(lens()).toBeNull();
    expect(container.querySelector('[data-magnifier-zoom-group]')).toBeNull();
  });

  it('turns on one lens that never takes a click and is hidden from screen readers', async () => {
    await mount();
    await click(toggle());
    await settle();
    expect(toggle().getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelectorAll('[data-allo-magnifier="lens"]')).toHaveLength(1);
    const host = lens();
    expect(host.getAttribute('aria-hidden')).toBe('true');
    expect(host.hasAttribute('inert')).toBe(true);
    expect(host.style.pointerEvents).toBe('none');
    expect(host.style.position).toBe('fixed');
    expect(host.shadowRoot).toBeTruthy();
    // Copied page CSS cannot switch pointer events back on inside the lens.
    expect(host.shadowRoot.textContent).toContain('pointer-events: none !important');
    expect(toggle().getAttribute('aria-describedby')).toBe('student-tools-magnifier-hint student-tools-magnifier-keys');
    const group = container.querySelector('[data-magnifier-zoom-group] [role="group"]');
    expect(group.getAttribute('aria-labelledby')).toBe('student-tools-magnifier-zoom-label');
    expect(Array.from(group.querySelectorAll('button')).map((b) => b.textContent)).toEqual(['1.5×', '2×', '3×']);
    expect(zoomButton('2').getAttribute('aria-pressed')).toBe('true');

    await click(toggle());
    expect(lens()).toBeNull();
    expect(toggle().getAttribute('aria-pressed')).toBe('false');
  });
});

describe('Magnifier geometry', () => {
  it('puts the page point under the pointer in the middle of the lens at every strength', () => {
    const layout = FabStack.magnifierLayout;
    const at = layout({ x: 300, y: 200, zoom: 2, size: 190, touch: false, vw: 1280, vh: 800 });
    expect(at).toEqual({ left: 205, top: 105, size: 190, zoom: 2, tx: -505, ty: -305 });
    for (const zoom of [1.5, 2, 3]) {
      const l = layout({ x: 431, y: 277, zoom, size: 190, touch: false, vw: 1280, vh: 800 });
      expect(l.tx + zoom * 431).toBeCloseTo(95);
      expect(l.ty + zoom * 277).toBeCloseTo(95);
      expect(l.left + 95).toBe(431);
    }
    expect(layout({ x: 10, y: 10, zoom: 7, size: 190, touch: false, vw: 1280, vh: 800 }).zoom).toBe(2);
  });

  it('lifts the lens above a finger, and stands it beside the finger near the top', () => {
    const layout = FabStack.magnifierLayout;
    const lifted = layout({ x: 300, y: 600, zoom: 2, size: 190, touch: true, vw: 390, vh: 844 });
    expect(lifted.left).toBe(205);
    expect(lifted.top).toBe(600 - 95 - 143);
    expect(lifted.tx + 2 * 300).toBeCloseTo(95);
    const beside = layout({ x: 100, y: 100, zoom: 2, size: 190, touch: true, vw: 390, vh: 844 });
    expect(beside.top).toBe(5);
    expect(beside.left).toBe(Math.round(100 + 190 * 0.35));
    const besideLeft = layout({ x: 300, y: 100, zoom: 2, size: 190, touch: true, vw: 390, vh: 844 });
    expect(besideLeft.left).toBe(Math.round(300 - 190 * 1.35));
  });

  it('is about 190 px, never more than half a small screen', () => {
    expect(FabStack.magnifierLensSize(1280, 800)).toBe(190);
    expect(FabStack.magnifierLensSize(390, 844)).toBe(190);
    expect(FabStack.magnifierLensSize(320, 568)).toBe(160);
    expect(FabStack.magnifierLensSize(200, 200)).toBe(120);
  });
});

describe('Magnifier copy of the page', () => {
  it('copies the region under the pointer, pinned where it is and scaled around the pointer', async () => {
    restoreRects = stubRects();
    buildPage();
    content.querySelector('#answer').value = 'typed just now';
    await mount();
    await click(toggle());
    await pointAt(300, 140);

    const host = lens();
    expect(host.style.display).toBe('block');
    expect(host.style.width).toBe('190px');
    expect(host.style.transform).toBe('translate(205px, 45px)');
    expect(stage().style.transform).toBe('translate(-505px, -185px) scale(2)');
    const copy = stage().querySelector('#content');
    expect(copy).toBeTruthy();
    expect(copy.style.getPropertyValue('position')).toBe('absolute');
    expect(copy.style.getPropertyValue('left')).toBe('100px');
    expect(copy.style.getPropertyValue('top')).toBe('20px');
    expect(copy.style.getPropertyValue('width')).toBe('600px');
    expect(copy.style.getPropertyValue('height')).toBe('400px');
    // Ancestors come along as boxless shells so theme selectors still match.
    expect(copy.parentElement.tagName).toBe('BODY');
    expect(copy.parentElement.style.getPropertyValue('display')).toBe('contents');
    expect(stage().querySelector('#para').textContent).toBe('Bees make honey.');
    expect(stage().querySelector('#answer').value).toBe('typed just now');
    expect(stage().querySelector('input[value="b"]').checked).toBe(true);
    // Nothing in the copy loads, plays or runs: video -> still canvas, frames -> plain box.
    expect(stage().querySelector('video')).toBeNull();
    expect(stage().querySelector('canvas').getAttribute('aria-hidden')).toBe('true');
    expect(stage().querySelector('iframe')).toBeNull();
    expect(stage().querySelector('audio')).toBeNull();
    expect(stage().querySelector('#pic').hasAttribute('onerror')).toBe(false);
    // The copy stays out of document queries and leaves the real page alone.
    expect(document.querySelectorAll('#para')).toHaveLength(1);
    expect(document.querySelector('input[value="b"]').checked).toBe(true);
  });

  it('refreshes the copy when the page changes', async () => {
    restoreRects = stubRects();
    buildPage();
    await mount();
    await click(toggle());
    await pointAt(300, 140);
    expect(stage().querySelector('#para').textContent).toBe('Bees make honey.');
    await act(async () => { content.querySelector('#para').textContent = 'Wasps do not make honey.'; });
    await settle(400);
    expect(stage().querySelector('#para').textContent).toBe('Wasps do not make honey.');
  });

  it('hides while the pointer is over the student tools, so the off switch is never covered', async () => {
    restoreRects = stubRects();
    buildPage();
    await mount();
    await click(toggle());
    document.elementFromPoint = () => toggle();
    await pointAt(900, 600);
    expect(lens().style.display).toBe('none');
    document.elementFromPoint = () => content.querySelector('#para');
    await pointAt(300, 140);
    expect(lens().style.display).toBe('block');
  });
});

describe('Magnifier keyboard', () => {
  it('moves by arrow keys while its toggle is focused (Shift for bigger steps)', async () => {
    await mount();
    await click(toggle());
    await settle();
    const host = lens();
    const start = host.style.transform;
    const cx = window.innerWidth / 2 - 95;
    const cy = window.innerHeight / 2 - 95;
    expect(start).toBe(`translate(${cx}px, ${cy}px)`);
    toggle().focus();
    const right = await key(toggle(), { key: 'ArrowRight' });
    await settle();
    expect(right.defaultPrevented).toBe(true);
    expect(host.style.transform).toBe(`translate(${cx + 24}px, ${cy}px)`);
    await key(toggle(), { key: 'ArrowDown', shiftKey: true });
    await settle();
    expect(host.style.transform).toBe(`translate(${cx + 24}px, ${cy + 96}px)`);
  });

  it('Escape turns it off, unless that Escape belonged to something else', async () => {
    await mount();
    await click(toggle());
    await settle();
    // Escape inside the tools panel closes the panel first.
    await key(toggle(), { key: 'Escape' });
    expect(container.querySelector('#alloflow-student-tools-panel')).toBeNull();
    expect(lens()).toBeTruthy();
    // An Escape another control already handled.
    const claim = (event) => event.preventDefault();
    document.addEventListener('keydown', claim);
    await key(document.body, { key: 'Escape' });
    document.removeEventListener('keydown', claim);
    expect(lens()).toBeTruthy();
    // An open modal owns Escape.
    const modal = document.createElement('div');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    document.body.appendChild(modal);
    await key(document.body, { key: 'Escape' });
    modal.remove();
    expect(lens()).toBeTruthy();
    // A plain Escape on the page turns the magnifier off and remembers that.
    await key(document.body, { key: 'Escape' });
    expect(lens()).toBeNull();
    expect(window.localStorage.getItem('allo_magnifier')).toBe('0');
  });
});

describe('Magnifier remembers its state on this device', () => {
  it('writes nothing for a student who never used it', async () => {
    await mount();
    expect(window.localStorage.getItem('allo_magnifier')).toBeNull();
    expect(window.localStorage.getItem('allo_magnifier_zoom')).toBeNull();
  });

  it('restores on/off and strength, and saves each change', async () => {
    window.localStorage.setItem('allo_magnifier', '1');
    window.localStorage.setItem('allo_magnifier_zoom', '3');
    await mount();
    await settle();
    expect(lens()).toBeTruthy();
    expect(toggle().getAttribute('aria-pressed')).toBe('true');
    expect(zoomButton('3').getAttribute('aria-pressed')).toBe('true');
    expect(lens().getAttribute('data-magnifier-zoom')).toBe('3');
    await click(zoomButton('1.5'));
    await settle();
    expect(window.localStorage.getItem('allo_magnifier_zoom')).toBe('1.5');
    expect(lens().getAttribute('data-magnifier-zoom')).toBe('1.5');
    await click(toggle());
    expect(window.localStorage.getItem('allo_magnifier')).toBe('0');
    await act(async () => root.unmount());
    root = null;
    container.remove();
    await mount();
    expect(lens()).toBeNull();
    expect(zoomButton('1.5')).toBeNull();
  });

  it('falls back to 2x for an unknown stored strength', async () => {
    window.localStorage.setItem('allo_magnifier', '1');
    window.localStorage.setItem('allo_magnifier_zoom', '7');
    await mount();
    expect(zoomButton('2').getAttribute('aria-pressed')).toBe('true');
  });
});

describe('Magnifier build copies', () => {
  it('keeps the four module copies identical', () => {
    const built = fs.readFileSync('view_fab_stack_module.js', 'utf8');
    for (const file of ['desktop/web-app/public/view_fab_stack_module.js', 'desktop/app-build/view_fab_stack_module.js', 'desktop/web-app/build/view_fab_stack_module.js']) {
      if (!fs.existsSync(file)) continue;
      expect(fs.readFileSync(file, 'utf8'), file).toBe(built);
    }
    expect(built).toContain("host.setAttribute(\"aria-hidden\", \"true\")");
    expect(built).toContain('pointer-events:none;');
  });
});
