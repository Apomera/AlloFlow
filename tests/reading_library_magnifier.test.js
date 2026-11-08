// Reading Library pictures: Zoom (enlarge and scroll, the default) or a magnifying glass that shows detail under
// the pointer, under a finger (raised above it), or wherever the arrow keys move it, with the whole picture in view.
// READLIB_SRC points the suite at another copy of the module for the fail-first check.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
let React, act, createRoot, Picture, host, root;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react')); act = React.act;
  createRoot = require(resolve('desktop/web-app/node_modules/react-dom/client')).createRoot;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const src = readFileSync(process.env.READLIB_SRC || 'reading_library_module.js', 'utf8');
  const a = src.indexOf('  // Inline enlargement keeps the story and its controls in the same focus order.');
  const b = src.indexOf('  // --------------------------------------------------------------- browse', a);
  const tr = (key, fallback) => fallback || key;
  Picture = new Function('React', 'e', 'tr', 'useState', 'useRef', 'useEffect', src.slice(a, b) + '\nreturn ReadingIllustration;')(
    React, React.createElement, tr, React.useState, React.useRef, React.useEffect);
});
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); host = null; vi.restoreAllMocks(); });

function mount() {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(Picture, { src: 'pics/fox.png', alt: 'A fox in the woods' })));
}
const button = (text) => [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === text);
const click = (node) => act(() => { node.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
const slider = () => host.querySelector('input[type=range]');
const lens = () => host.querySelector('[data-reading-magnifier]');
// jsdom lays nothing out: give the picture a 400 x 200 box.
function sizePicture(w = 400, h = 200) {
  const img = host.querySelector('img');
  img.getBoundingClientRect = () => ({ left: 0, top: 0, width: w, height: h, right: w, bottom: h });
  Object.defineProperty(img, 'clientWidth', { configurable: true, value: w });
  Object.defineProperty(img, 'clientHeight', { configurable: true, value: h });
}
function pointer(type, x, y, pointerType, buttons = 0) {
  const ev = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, buttons });
  Object.defineProperty(ev, 'pointerType', { value: pointerType }); Object.defineProperty(ev, 'pointerId', { value: 1 });
  act(() => { host.querySelector('[data-reading-picture-stage]').dispatchEvent(ev); });
}
function openLens() { mount(); click(button('Enlarge picture')); click(button('Magnifying glass')); sizePicture(); }

describe('Zoom stays the default', () => {
  it('opens in Zoom with the same slider and Fit button as before', () => {
    mount(); click(button('Enlarge picture'));
    expect(button('Zoom').getAttribute('aria-pressed')).toBe('true');
    expect(button('Magnifying glass').getAttribute('aria-pressed')).toBe('false');
    expect(slider().min).toBe('100'); expect(slider().max).toBe('300');
    expect(host.textContent).toContain('Picture zoom');
    expect(button('Fit picture')).toBeTruthy();
    expect(lens()).toBeNull();
  });
});

describe('the magnifying glass', () => {
  it('switches the slider to the glass strength and explains how to use it', () => {
    openLens();
    expect(button('Magnifying glass').getAttribute('aria-pressed')).toBe('true');
    expect(host.textContent).toContain('Magnifier strength');
    expect([slider().min, slider().max, slider().value]).toEqual(['150', '400', '250']);
    expect(host.textContent).toContain('Arrow keys move the magnifying glass');
    expect(button('Fit picture')).toBeFalsy();
    expect(host.querySelector('[role=region]').getAttribute('aria-label')).toBe('Picture with magnifying glass');
  });

  it('follows a mouse pointer and shows that spot enlarged', () => {
    openLens();
    pointer('pointermove', 100, 50, 'mouse');
    const s = lens().style;
    expect(lens().getAttribute('aria-hidden')).toBe('true');
    expect(s.backgroundSize).toBe('1000px 500px');            // 2.5 x the 400 x 200 picture
    expect(s.backgroundPosition).toBe('-160px -35px');         // the spot under the pointer sits in the middle of the glass
    expect([s.left, s.top]).toEqual(['10px', '-40px']);        // centred on the pointer
  });

  it('sits above a finger on a touch screen so the finger does not hide it', () => {
    openLens(); sizePicture(400, 400);
    pointer('pointerdown', 100, 300, 'touch', 1);
    expect(lens().style.top).toBe(String(300 - 90 - 135) + 'px'); // raised by three quarters of the glass
    expect(lens().style.left).toBe('10px');
    expect(lens().style.backgroundPosition).toBe('-160px -660px');
  });

  it('near the top, where there is no room above the finger, it stands beside it inside the picture', () => {
    openLens(); sizePicture(400, 400);
    pointer('pointerdown', 100, 40, 'touch', 1);                 // left half: glass to the right of the finger
    expect([lens().style.left, lens().style.top]).toEqual(['163px', '0px']);
    pointer('pointerdown', 330, 40, 'touch', 1);                 // right half: glass to the left
    expect(lens().style.left).toBe(String(Math.round(330 - 180 * 1.35)) + 'px');
    expect(lens().style.backgroundPosition).toBe('-735px -10px'); // still magnifying the spot under the finger (90 - 40 x 2.5)
  });

  it('goes away when the mouse leaves the picture', () => {
    openLens();
    pointer('pointermove', 100, 50, 'mouse'); expect(lens()).toBeTruthy();
    // React derives onPointerLeave from pointerout with a target outside the element.
    const out = new MouseEvent('pointerout', { bubbles: true, clientX: 500, clientY: 50, relatedTarget: document.body });
    Object.defineProperty(out, 'pointerType', { value: 'mouse' });
    act(() => { host.querySelector('[data-reading-picture-stage]').dispatchEvent(out); });
    expect(lens()).toBeNull();
  });

  it('can be used from the keyboard alone', () => {
    openLens();
    const region = host.querySelector('[role=region]'), outside = vi.fn();
    document.addEventListener('keydown', outside);
    act(() => { region.focus(); });
    expect(lens().style.backgroundPosition).toBe('-410px -160px'); // centre of the picture
    act(() => { region.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
    expect(lens().style.backgroundPosition).toBe('-460px -160px'); // 5% further right
    act(() => { region.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true })); });
    expect(lens().style.backgroundPosition).toBe('-460px -235px'); // 15% further down with Shift
    expect(outside).not.toHaveBeenCalled();                        // the arrows do not also turn the page
    document.removeEventListener('keydown', outside);
  });

  it('the slider changes how strong the glass is', () => {
    openLens();
    pointer('pointermove', 100, 50, 'mouse');
    const input = slider();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    act(() => { setter.call(input, '400'); input.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(lens().style.backgroundSize).toBe('1600px 800px');
  });

  it('Escape returns to page size, and the picture opens in Zoom again next time', () => {
    openLens();
    act(() => { host.querySelector('[role=region]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(host.querySelector('figure').getAttribute('data-reading-picture-expanded')).toBe('false');
    click(button('Enlarge picture'));
    expect(button('Zoom').getAttribute('aria-pressed')).toBe('true');
  });
});
