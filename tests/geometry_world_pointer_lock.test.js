import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');
const start = source.indexOf("        canvas.addEventListener('click', _cvH.click");
const end = source.indexOf("        document.addEventListener('pointerlockchange'", start);
if (start < 0 || end < start) throw Error('Canvas click registration was not found');

afterEach(() => { document.body.innerHTML = ''; });

function fixture(overrides = {}) {
  const canvas = document.createElement('canvas'), handlers = {};
  const engine = { isLocked: false, _showcase: null, _touchControlsEnabled: false, ...overrides };
  let lockRequests = 0;
  canvas.requestPointerLock = () => { lockRequests++; };
  document.body.appendChild(canvas);
  // Register the production listener on a real DOM canvas. A renderer or a
  // permission prompt is unnecessary to observe whether native lock is requested.
  new Function('canvas', 'engine', '_cvH', source.slice(start, end))(canvas, engine, handlers);
  return { canvas, handlers, requests: () => lockRequests };
}

function click(canvas, { pointerType, firesTouchEvents, detail = 1 } = {}) {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, detail });
  // jsdom does not expose Chromium's InputDeviceCapabilities. These are exactly
  // the event fields the browser supplies after a touch release retargets canvas.
  if (pointerType !== undefined) Object.defineProperty(event, 'pointerType', { value: pointerType });
  if (firesTouchEvents !== undefined) Object.defineProperty(event, 'sourceCapabilities', { value: { firesTouchEvents } });
  canvas.dispatchEvent(event);
}

describe('Geometry World canvas pointer-lock provenance', () => {
  it.each([
    ['touch pointer type', { pointerType: 'touch' }],
    ['legacy touch capabilities', { firesTouchEvents: true }],
    ['both Chromium touch signals', { pointerType: 'touch', firesTouchEvents: true }]
  ])('ignores a retargeted click identified by %s after Touch is off', (_name, fields) => {
    const f = fixture();
    click(f.canvas, fields);
    expect(f.requests()).toBe(0);
  });

  it.each([
    ['mouse pointer', { pointerType: 'mouse', firesTouchEvents: false }],
    ['legacy mouse click', {}],
    ['keyboard activation', { pointerType: '', detail: 0 }]
  ])('still requests lock for an unlocked %s', (_name, fields) => {
    const f = fixture();
    click(f.canvas, fields);
    expect(f.requests()).toBe(1);
  });

  it.each([
    ['locked mouse', { isLocked: true }, { pointerType: 'mouse' }],
    ['locked keyboard', { isLocked: true }, { detail: 0 }],
    ['Showcase mouse', { _showcase: {} }, { pointerType: 'mouse' }],
    ['Showcase keyboard', { _showcase: {} }, { detail: 0 }]
  ])('preserves the existing guard for %s', (_name, engine, fields) => {
    const f = fixture(engine);
    click(f.canvas, fields);
    expect(f.requests()).toBe(0);
  });

  it('retains the registered handler so engine teardown can detach it', () => {
    const f = fixture();
    f.canvas.removeEventListener('click', f.handlers.click);
    click(f.canvas, { pointerType: 'mouse' });
    expect(f.requests()).toBe(0);
  });
});
