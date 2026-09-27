import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_microbiology.js', 'utf8');
const start = source.indexOf('  function SnowCholeraMap(props)');
const end = source.indexOf('  // ── 3. VIRTUAL MICROSCOPE', start);
const SnowCholeraMap = new Function('R', 'hh', 'microInkFor', '__alloMBT', source.slice(start, end) + '\nreturn SnowCholeraMap;')(
  React, React.createElement, value => value, (_key, fallback) => fallback
);
let container;
let root;
let awardXP;
const previousActSetting = globalThis.IS_REACT_ACT_ENVIRONMENT;
const act = React.act;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
  awardXP = vi.fn();
  act(() => root.render(React.createElement(SnowCholeraMap, { awardXP, isDark: true })));
});

afterEach(() => {
  if (root) act(() => root.unmount());
  container.remove();
  root = null;
  vi.useRealTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousActSetting;
});

function button(label) {
  const result = [...container.querySelectorAll('button')].find(node => node.textContent.trim() === label);
  expect(result, label).toBeTruthy();
  return result;
}
function click(label) { act(() => button(label).click()); }
function checkpoint(value) {
  const input = container.querySelector('input[type="range"]');
  act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, String(value));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
function markers() { return [...container.querySelectorAll('[data-snow-markers] circle')]; }
function summary() { return container.querySelector('[data-snow-summary]').textContent; }

describe('John Snow illustrative map evidence and accessibility', () => {
  it('labels generated evidence and dated checkpoints without presenting invented death counts', () => {
    expect(container.textContent).toContain('seven dated checkpoints from August 31 to September 15');
    expect(container.textContent).toContain('They are not Snow\'s original map or a historical death-count dataset.');
    expect(container.textContent).toContain('Theory overlays are conceptual sketches');
    expect(container.textContent).not.toMatch(/\bweeks\b|\b\d+ deaths\b/);
    expect(container.querySelector('svg').getAttribute('role')).toBe('img');
    expect(container.querySelector('svg').getAttribute('aria-label')).toContain('Generated locations are examples');
    const slider = container.querySelector('input[type="range"]');
    expect(slider.getAttribute('aria-label')).toBe('Outbreak date checkpoint');
    expect(slider.getAttribute('aria-valuetext')).toBe('Aug 31, 1854; checkpoint 1 of 7');
    checkpoint(4);
    expect(slider.getAttribute('aria-valuetext')).toBe('Sept 8, 1854; checkpoint 5 of 7');
    expect(container.textContent).toContain('The Broad Street pump handle was removed on September 8, 1854');
    expect(container.querySelector('a[href="https://epi-snow.ph.ucla.edu/Stream2_BSPoutbreak_d.html"]')).toBeTruthy();
    expect(container.querySelector('a[href="https://www.cdc.gov/mmwr/preview/mmwrhtml/mm5334a1.htm"]')).toBeTruthy();
  });

  it('preserves all existing markers and their prominence when the pump handle is removed', () => {
    checkpoint(6);
    const before = markers().map(node => node.outerHTML);
    expect(before).toHaveLength(220);
    click('🔧 Remove pump handle (Snow\'s intervention)');
    expect(markers().map(node => node.outerHTML)).toEqual(before);
    expect(summary()).toContain('Marks representing past deaths remain unchanged');
    expect(summary()).toContain('220 illustrative markers');
    expect(summary()).toContain('not historical death counts');
    expect(container.textContent).toContain('a before-and-after pattern alone cannot measure the intervention\'s effect');
    click('↺ Replace pump handle');
    expect(markers().map(node => node.outerHTML)).toEqual(before);
    expect(awardXP).toHaveBeenCalledTimes(1);
  });

  it('provides native keyboard controls for pump animation and stops animation when closed', () => {
    const animate = button('Animate pump');
    expect(animate.tagName).toBe('BUTTON');
    expect(animate.type).toBe('button');
    expect(animate.tabIndex).toBe(0);
    expect(animate.closest('svg')).toBeNull();
    animate.focus();
    expect(document.activeElement).toBe(animate);
    click('Animate pump');
    expect(container.querySelector('[data-snow-pump]').getAttribute('data-snow-pump')).toBe('pumping');
    act(() => vi.advanceTimersByTime(400));
    expect(container.querySelector('[data-snow-pump]').getAttribute('data-snow-pump')).toBe('still');
    click('Animate pump');
    click('🔧 Remove pump handle (Snow\'s intervention)');
    expect(animate.disabled).toBe(true);
    expect(container.querySelector('[data-snow-pump]').getAttribute('data-snow-pump')).toBe('still');
    expect(vi.getTimerCount()).toBe(0);
    expect(button('↺ Replace pump handle').getAttribute('aria-pressed')).toBe('true');
  });

  it('offers the same marker details through a labeled select and announces the result', () => {
    const select = container.querySelector('select');
    expect(select.getAttribute('aria-label')).toBe('Inspect an illustrative location');
    expect(select.options).toHaveLength(markers().length + 1);
    select.focus();
    act(() => {
      select.value = '3';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(document.activeElement).toBe(select);
    expect(markers()[3].getAttribute('r')).toBe('4.5');
    const announcements = [...container.querySelectorAll('[role="status"][aria-live="polite"]')];
    expect(announcements.some(node => node.textContent.includes('Illustrative location 4. Example address:'))).toBe(true);
    expect(announcements.some(node => node.textContent.includes('not a verified historical household'))).toBe(true);
    checkpoint(6);
    expect(select.value).toBe('');
  });

  it('separates the display toggle from historical evidence and restarts all display controls', () => {
    checkpoint(6);
    click('💧 Waterborne Theory');
    expect(button('💧 Waterborne Theory').getAttribute('aria-pressed')).toBe('true');
    click('👁 Hide death dots');
    expect(markers()).toHaveLength(0);
    expect(summary()).toContain('The marker display is hidden');
    expect(container.querySelector('select').disabled).toBe(true);
    click('↺ Restart walkthrough');
    expect(markers()).toHaveLength(22);
    expect(container.querySelector('select').disabled).toBe(false);
    expect(button('None').getAttribute('aria-pressed')).toBe('true');
    expect(button('👁 Hide death dots').getAttribute('aria-pressed')).toBe('true');
    expect(summary()).toContain('Aug 31, 1854');
  });

  it('clears the animation timer when the map unmounts', () => {
    click('Animate pump');
    expect(vi.getTimerCount()).toBe(1);
    act(() => root.unmount());
    root = null;
    expect(vi.getTimerCount()).toBe(0);
  });
});
