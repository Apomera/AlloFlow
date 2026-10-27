// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Camera = require('../stem_lab/kitchen_studio/recipe_lab_camera_controls.js');
const radians = degrees => degrees * Math.PI / 180;
const initial = () => ({
  azimuth: 0.2, polar: Math.PI / 3, distance: 8,
  minDistance: 2, maxDistance: 20, minPolar: 0.1, maxPolar: 1.5,
  baseAzimuth: 0.2, baseDistance: 8, viewLabel: 'Whole kitchen', adjusted: false
});
let mounted = [];

function fixture(overrides = {}, callbacks = {}) {
  let frame = { ...initial(), ...overrides };
  const container = document.getElementById('controls');
  const onAdjust = vi.fn(command => {
    frame = { ...Camera.step(frame, command), adjusted: true };
    return true;
  });
  const onReset = vi.fn(() => { frame = initial(); return true; });
  const onLook = vi.fn(() => document.getElementById('scene').focus());
  const options = { container, sceneId: 'scene', read: () => frame, onAdjust, onReset, onLook, ...callbacks };
  const ui = Camera.mount(options);
  mounted.push(ui);
  return {
    ui, options, container, get frame() { return frame; },
    setFrame(next) { frame = next; },
    button(command) { return ui.element.querySelector(`[data-camera-command="${command}"]`); },
    status: ui.element.querySelector('[role="status"]'),
    readout: ui.element.querySelector('.camera-controls-readout')
  };
}

beforeEach(() => {
  document.body.innerHTML = '<h2 id="kitchenTitle">Recipe Kitchen</h2><button id="textView">Use text view</button><p id="sceneHelp">Kitchen scene</p><section id="scene" tabindex="-1" aria-describedby="sceneHelp"></section><div id="controls"></div><button id="outside">Outside</button>';
});
afterEach(() => {
  mounted.forEach(ui => ui.dispose());
  mounted = [];
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Recipe Kitchen bounded camera steps', () => {
  it('changes the requested camera axis in radians without mutating the source', () => {
    const frame = Object.freeze(initial());
    const left = Camera.step(frame, 'left');
    expect(left).not.toBe(frame);
    expect(left.azimuth).toBeCloseTo(frame.azimuth - radians(15));
    expect(left.polar).toBe(frame.polar);
    expect(left.distance).toBe(frame.distance);
    expect(left.viewLabel).toBe(frame.viewLabel);
    expect(Camera.step(frame, 'right').azimuth).toBeCloseTo(frame.azimuth + radians(15));
    expect(Camera.step(frame, 'up').polar).toBeCloseTo(frame.polar - radians(10));
    expect(Camera.step(frame, 'down').polar).toBeCloseTo(frame.polar + radians(10));
    expect(Camera.step(frame, 'in').distance).toBeCloseTo(frame.distance / 1.2);
    expect(Camera.step(frame, 'out').distance).toBeCloseTo(frame.distance * 1.2);
    expect(frame).toEqual(initial());
  });

  it('normalizes rotations across the back of the kitchen instead of accumulating turns', () => {
    expect(Camera.step({ ...initial(), azimuth: radians(179) }, 'right').azimuth).toBeCloseTo(radians(-166));
    expect(Camera.step({ ...initial(), azimuth: radians(-179) }, 'left').azimuth).toBeCloseTo(radians(166));
    expect(Camera.step({ ...initial(), azimuth: 12 * Math.PI }, 'up').azimuth).toBeCloseTo(0);
  });

  it.each([
    ['up', { polar: 0.15 }, 'polar', 0.1],
    ['down', { polar: 1.45 }, 'polar', 1.5],
    ['in', { distance: 2.1 }, 'distance', 2],
    ['out', { distance: 19 }, 'distance', 20]
  ])('clamps %s at its actual scene boundary', (command, overrides, key, expected) => {
    const next = Camera.step({ ...initial(), ...overrides }, command);
    expect(next[key]).toBe(expected);
    expect(Camera.step(next, command)[key]).toBe(expected);
  });

  it('allows returning from the boundary and reversible moves away from boundaries', () => {
    const frame = initial();
    expect(Camera.step({ ...frame, distance: 2 }, 'out').distance).toBeGreaterThan(2);
    expect(Camera.step({ ...frame, polar: 0.1 }, 'down').polar).toBeGreaterThan(0.1);
    expect(Camera.step(Camera.step(frame, 'right'), 'left').azimuth).toBeCloseTo(frame.azimuth);
    expect(Camera.step(Camera.step(frame, 'in'), 'out').distance).toBeCloseTo(frame.distance);
  });

  it('rejects incomplete, nonfinite, nonnumeric, out-of-range, and inverted frames', () => {
    const bad = [null, {}, { ...initial(), azimuth: NaN }, { ...initial(), polar: Infinity },
      { ...initial(), distance: '8' }, { ...initial(), minDistance: 0 },
      { ...initial(), maxDistance: 1 }, { ...initial(), distance: 30 },
      { ...initial(), minPolar: -0.1 }, { ...initial(), maxPolar: Math.PI + 0.1 },
      { ...initial(), minPolar: 1.6 }, { ...initial(), polar: 0 },
      { ...initial(), maxDistance: undefined }];
    for (const frame of bad) expect(Camera.step(frame, 'left')).toBeNull();
    expect(Camera.step(initial(), 'cook')).toBeNull();
    expect(Camera.step(initial(), undefined)).toBeNull();
  });

  it('supports a deliberately fixed distance or elevation without creating an invalid frame', () => {
    const frame = { ...initial(), minDistance: 8, maxDistance: 8, minPolar: Math.PI / 3, maxPolar: Math.PI / 3 };
    expect(Camera.step(frame, 'in').distance).toBe(frame.distance);
    expect(Camera.step(frame, 'up').polar).toBe(frame.polar);
    expect(Camera.step(frame, 'left')).not.toEqual(frame);
  });
});

describe('Recipe Kitchen camera control accessibility', () => {
  it('provides native named controls, grouped instructions, and a quiet scene description', () => {
    const f = fixture();
    expect(f.ui.element.tagName).toBe('DETAILS');
    expect(f.ui.element.querySelector('summary').textContent).toBe('Adjust 3D view');
    expect(f.ui.element.querySelectorAll('button')).toHaveLength(8);
    expect([...f.ui.element.querySelectorAll('button')].map(button => button.textContent)).toEqual([
      'Rotate left', 'Rotate right', 'Raise view', 'Lower view', 'Zoom in', 'Zoom out', 'Reset selected view', 'Look at 3D view'
    ]);
    for (const button of f.ui.element.querySelectorAll('button')) {
      expect(button.type).toBe('button');
      expect(button.getAttribute('aria-controls')).toBe('scene');
      expect(button.disabled).toBe(false);
    }
    for (const group of f.ui.element.querySelectorAll('fieldset')) {
      expect(document.getElementById(group.getAttribute('aria-describedby')).textContent).toContain('do not cook food or advance kitchen time');
    }
    expect(document.getElementById('scene').getAttribute('aria-describedby').split(' ')).toContain(f.readout.id);
    expect(f.readout.closest('[aria-live]')).toBeNull();
    expect(f.status.getAttribute('aria-live')).toBe('polite');
    expect(f.status.getAttribute('aria-atomic')).toBe('true');
    expect(f.status.textContent).toBe('');
    expect(f.options.onAdjust).not.toHaveBeenCalled();
    expect(f.options.onReset).not.toHaveBeenCalled();
  });

  it('describes orientation relative to the selected view and zoom without internal distances', () => {
    const f = fixture({ azimuth: 0.2 - radians(30), distance: 4 });
    expect([...f.readout.querySelectorAll('dd')].map(node => node.textContent)).toEqual(['30° left', '30° above level', '200%']);
    expect(f.readout.textContent).toContain('Selected view: Whole kitchen');
    f.setFrame({ ...f.frame, azimuth: 0.2 + radians(15), polar: Math.PI / 2, maxPolar: Math.PI });
    f.ui.sync();
    expect([...f.readout.querySelectorAll('dd')].map(node => node.textContent)).toEqual(['15° right', 'Level', '200%']);
    f.setFrame({ ...f.frame, polar: radians(100) });
    f.ui.sync();
    expect(f.readout.textContent).toContain('10° below level');
    expect(f.status.textContent).toBe('');
  });

  it('reports the camera result after a user action and retains the control focus', () => {
    const f = fixture();
    f.ui.open();
    const left = f.button('left');
    left.click();
    expect(f.options.onAdjust).toHaveBeenCalledExactlyOnceWith('left');
    expect(document.activeElement).toBe(left);
    expect(f.status.textContent).toBe('Whole kitchen: 15 degrees left, elevation 30 degrees, zoom 100 percent.');
    expect(f.readout.textContent).toContain('15° left');
  });

  it('quietly follows pointer updates and does not rewrite live status during rendering', () => {
    const f = fixture();
    f.button('right').click();
    const spoken = f.status.textContent;
    const observer = new MutationObserver(() => {});
    observer.observe(f.status, { subtree: true, childList: true, characterData: true });
    for (let i = 0; i < 20; i++) {
      f.setFrame({ ...f.frame, distance: 8 + i / 10 });
      f.ui.sync();
    }
    expect(f.readout.textContent).toContain('81%');
    expect(f.status.textContent).toBe(spoken);
    expect(observer.takeRecords()).toEqual([]);
    observer.disconnect();
  });

  it.each([
    ['up', { polar: 0.1 }, 'Highest'], ['down', { polar: 1.5 }, 'Lowest'],
    ['in', { distance: 2 }, 'Closest'], ['out', { distance: 20 }, 'Farthest']
  ])('keeps the bounded %s control focusable and explains its limit without another camera action', (command, overrides, label) => {
    const f = fixture(overrides);
    f.ui.open();
    const button = f.button(command);
    button.focus();
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.disabled).toBe(false);
    expect(button.tabIndex).toBe(0);
    button.click();
    expect(f.options.onAdjust).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(button);
    expect(f.status.textContent).toBe(`${label} view reached. Camera unchanged.`);
  });

  it('checks current bounds at activation even if the last render showed the button as available', () => {
    const f = fixture();
    expect(f.button('in').getAttribute('aria-disabled')).toBe('false');
    f.setFrame({ ...f.frame, distance: f.frame.minDistance });
    f.button('in').click();
    expect(f.options.onAdjust).not.toHaveBeenCalled();
    expect(f.button('in').getAttribute('aria-disabled')).toBe('true');
  });

  it('blocks camera callbacks when a scene frame is invalid and shows an honest unavailable state', () => {
    const f = fixture();
    f.setFrame(null);
    f.ui.sync();
    for (const button of f.ui.element.querySelectorAll('button')) {
      expect(button.getAttribute('aria-disabled')).toBe('true');
      button.click();
    }
    expect(f.options.onAdjust).not.toHaveBeenCalled();
    expect(f.options.onReset).not.toHaveBeenCalled();
    expect(f.options.onLook).not.toHaveBeenCalled();
    expect(f.readout.textContent).toContain('The 3D view is unavailable.');
    expect(f.status.textContent).toBe('The 3D view is unavailable.');
  });

  it('reports an adjustment failure without claiming a new orientation', () => {
    const f = fixture({}, { onAdjust: vi.fn(() => false) });
    f.button('left').click();
    expect(f.readout.textContent).toContain('Centered');
    expect(f.status.textContent).toBe('The camera could not be adjusted.');
  });

  it('resets an adjusted camera through the host and describes the resulting selected view', () => {
    const f = fixture({ azimuth: radians(30), distance: 4, adjusted: true });
    f.button('reset').click();
    expect(f.options.onReset).toHaveBeenCalledOnce();
    expect(f.status.textContent).toBe('View reset. Whole kitchen: centered, elevation 30 degrees, zoom 100 percent.');
    expect(f.button('reset').getAttribute('aria-disabled')).toBe('true');
    f.button('reset').click();
    expect(f.options.onReset).toHaveBeenCalledOnce();
    expect(f.status.textContent).toBe('The selected view is already reset.');
  });

  it('preserves the current camera when the host cannot reset it', () => {
    const f = fixture({ distance: 4, adjusted: true }, { onReset: vi.fn(() => false) });
    f.button('reset').click();
    expect(f.readout.textContent).toContain('200%');
    expect(f.status.textContent).toBe('The camera could not be reset.');
  });

  it('opens onto the first rotation control without moving the camera or cooking', () => {
    const f = fixture();
    expect(f.ui.open()).toBe(true);
    expect(f.ui.element.open).toBe(true);
    expect(document.activeElement).toBe(f.button('left'));
    expect(f.options.onAdjust).not.toHaveBeenCalled();
    expect(f.status.textContent).toBe('');
    f.ui.element.open = false;
    f.ui.element.dispatchEvent(new Event('toggle'));
    expect(document.activeElement).toBe(f.ui.element.querySelector('summary'));
  });

  it('returns to the described scene without adding redundant status announcements', () => {
    const f = fixture();
    f.ui.open();
    f.button('look').click();
    expect(f.options.onLook).toHaveBeenCalledOnce();
    expect(document.activeElement.id).toBe('scene');
    expect(f.status.textContent).toBe('');
  });

  it('repairs focus to the enabled text-view control before hiding and blocks hidden actions', () => {
    const f = fixture();
    f.ui.open();
    f.button('left').click();
    f.options.onAdjust.mockClear();
    f.ui.setVisible(false);
    expect(f.ui.element.hidden).toBe(true);
    expect(document.activeElement.id).toBe('textView');
    expect(f.status.textContent).toBe('');
    expect(f.ui.open()).toBe(false);
    f.button('left').click();
    expect(f.options.onAdjust).not.toHaveBeenCalled();
    f.ui.setVisible(true);
    expect(document.activeElement.id).toBe('textView');
    expect(f.status.textContent).toBe('');
  });

  it.each(['disabled', 'hidden'])('uses the kitchen heading when the text-view button is %s', reason => {
    const f = fixture();
    document.getElementById('textView')[reason] = true;
    document.getElementById('scene').hidden = true;
    f.ui.open();
    f.ui.setVisible(false);
    const heading = document.getElementById('kitchenTitle');
    expect(document.activeElement).toBe(heading);
    expect(heading.tabIndex).toBe(-1);
  });

  it('leaves focus elsewhere alone when graphics become unavailable', () => {
    const f = fixture();
    document.getElementById('outside').focus();
    f.ui.setVisible(false);
    expect(document.activeElement.id).toBe('outside');
  });

  it('keeps multiple instances uniquely identified and removes only its own description on disposal', () => {
    const first = fixture(), second = fixture();
    const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    const scene = document.getElementById('scene');
    scene.setAttribute('aria-describedby', scene.getAttribute('aria-describedby') + ' addedLater');
    first.ui.dispose();
    expect(scene.getAttribute('aria-describedby').split(' ')).toEqual(['sceneHelp', second.readout.id, 'addedLater']);
    expect(second.ui.element.isConnected).toBe(true);
    second.ui.dispose();
    expect(scene.getAttribute('aria-describedby')).toBe('sceneHelp addedLater');
  });

  it('disposes event handlers and repairs focus without removing sibling content', () => {
    const f = fixture();
    const sibling = document.createElement('p');
    sibling.textContent = 'Other controls';
    f.container.append(sibling);
    const detachedButton = f.button('left');
    f.ui.open();
    f.ui.dispose();
    f.ui.dispose();
    detachedButton.click();
    expect(f.options.onAdjust).not.toHaveBeenCalled();
    expect(document.activeElement.id).toBe('textView');
    expect(sibling.isConnected).toBe(true);
    expect(f.ui.open()).toBe(false);
  });

  it('rejects incomplete mount options rather than silently creating unusable controls', () => {
    expect(() => Camera.mount()).toThrow(TypeError);
    expect(() => Camera.mount({ container: document.getElementById('controls'), sceneId: 'scene' })).toThrow(TypeError);
  });
});
