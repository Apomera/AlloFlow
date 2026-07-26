// Under-hood 3D tour (Auto Repair Shop) — content + graceful-degradation gate.
//
// The 3D bay is an ENHANCEMENT. The contract this file pins is that the
// module's instructional content lives in the accessible DOM and never
// depends on WebGL, Three.js, or the CDN being reachable. If a school filter
// blocks the CDN or the Chromebook has no WebGL, the student loses a picture
// and loses nothing else.
//
// Also pins the safety-critical facts, because those are the ones where being
// wrong hurts someone: pressurized radiator caps and battery terminal order.

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_autorepair.js';
const ID = 'autoRepair';

const PART_LABELS = [
  'Engine block',
  'Oil filler cap',
  'Oil dipstick',
  'Coolant overflow tank',
  'Radiator + cap',
  'Brake fluid reservoir',
  'Washer fluid reservoir',
  'Battery',
  'Serpentine belt + pulleys',
  'Alternator',
  'Air filter box',
  'Under-hood fuse box',
];

function underhood(extra) {
  return renderTool(ID, { autoRepair: Object.assign({ view: 'underhood' }, extra || {}) });
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, ID);
});

describe('under-hood tour — module wiring', () => {
  it('is reachable from the main menu', () => {
    const html = renderTool(ID, {});
    expect(html).toContain('Under-hood tour (3D)');
  });

  it('renders the under-hood view without throwing', () => {
    const html = underhood();
    expect(html).toContain('Under-hood tour');
    expect(html.length).toBeGreaterThan(2000);
  });

  it('renders under every theme without throwing', () => {
    for (const theme of [{ isDark: true }, { isDark: false }, { isContrast: true }]) {
      const html = renderTool(ID, { autoRepair: { view: 'underhood' } }, theme);
      expect(html).toContain('Parts in the bay');
    }
  });
});

describe('under-hood tour — content lives in the accessible DOM', () => {
  it('lists all 12 parts as real buttons, with no 3D engine present', () => {
    const html = underhood();
    for (const label of PART_LABELS) {
      expect(html, 'missing part: ' + label).toContain(label);
    }
    // The list items are <button>, not canvas-only hit targets.
    const buttons = (html.match(/<button/g) || []).length;
    expect(buttons).toBeGreaterThanOrEqual(PART_LABELS.length);
  });

  it('keeps the full parts list when the 3D engine has FAILED', () => {
    const html = underhood({ uh3dStatus: 'failed' });
    expect(html).toContain('3D view unavailable');
    for (const label of PART_LABELS) {
      expect(html, 'part lost in fallback: ' + label).toContain(label);
    }
  });

  it('keeps the full parts list while the 3D engine is still LOADING', () => {
    const html = underhood({ uh3dStatus: 'loading' });
    for (const label of PART_LABELS) {
      expect(html, 'part lost while loading: ' + label).toContain(label);
    }
  });

  it('surfaces where / what / check / failure for every selected part', () => {
    const ids = [
      'engine', 'oilcap', 'dipstick', 'coolant', 'radiator', 'brake',
      'washer', 'battery', 'belt', 'alternator', 'airbox', 'fusebox',
    ];
    for (const id of ids) {
      const html = underhood({ uhSel: id });
      expect(html, id + ' missing location').toContain('Where to look');
      expect(html, id + ' missing function').toContain('What it does');
      expect(html, id + ' missing check').toContain('How to check it');
      expect(html, id + ' missing failure mode').toContain('What failure looks like');
    }
  });

  it('states that the 3D view shows nothing the parts list does not', () => {
    const html = underhood();
    // The viewport is now keyboard-operable, so the old "keyboard users: use
    // the list" wording no longer applies — but the EQUIVALENCE promise still
    // has to be stated, in the visible hint and in the viewport's own label.
    expect(html).toContain('Everything the 3D view shows is also in the parts list');
    expect(html).toContain('All of this content is also in the parts list');
  });

  it('makes the 3D viewport focusable and keyboard-operable', () => {
    const html = underhood();
    expect(html).toMatch(/tabindex="0"[^>]*role="group"/);
    expect(html).toContain('Arrow keys rotate, plus and minus zoom, zero resets');
  });

  it('offers camera controls as buttons, not mouse-only gestures', () => {
    const html = underhood();
    for (const label of ['Rotate view left', 'Rotate view right', 'Tilt view up',
      'Tilt view down', 'Zoom in', 'Zoom out', 'Reset the view']) {
      expect(html, 'missing camera control: ' + label).toContain(label);
    }
  });

  it('offers a label-everything mode with correct pressed state', () => {
    expect(underhood()).toContain('Show a label on every part');
    expect(underhood()).toMatch(/aria-pressed="false"[^>]*aria-label="Show a label on every part"/);
    const on = underhood({ uhAllLabels: true });
    expect(on).toContain('Hide the labels on every part');
    expect(on).toMatch(/aria-pressed="true"[^>]*aria-label="Hide the labels on every part"/);
  });
});

describe('under-hood tour — safety-critical facts', () => {
  it('warns never to open a warm radiator cap, and says why', () => {
    const html = underhood({ uhSel: 'radiator' });
    expect(html).toContain('NEVER open the radiator cap');
    expect(html).toContain('pressurized');
    expect(html).toMatch(/steam/i);
  });

  it('gives battery terminal order as negative-first / negative-last', () => {
    const html = underhood({ uhSel: 'battery' });
    expect(html).toContain('Disconnect NEGATIVE first and reconnect NEGATIVE last');
    expect(html).toMatch(/short/i);
  });

  it('teaches that a battery light while driving is a CHARGING fault', () => {
    const html = underhood({ uhSel: 'alternator' });
    expect(html).toContain('WHILE DRIVING');
    expect(html).toMatch(/charging-system warning/i);
  });

  it('warns against over-rating a replacement fuse', () => {
    const html = underhood({ uhSel: 'fusebox' });
    expect(html).toMatch(/same amperage/i);
  });

  it('says the belt must never be inspected with the engine running', () => {
    const html = underhood({ uhSel: 'belt' });
    expect(html).toMatch(/never inspect with the engine running/i);
  });
});

describe('under-hood tour — honesty about generalization', () => {
  it('states up front that positions vary by make and model', () => {
    const html = underhood();
    expect(html).toMatch(/vary by make, model, and year/i);
  });

  it('scopes the one reliable rule (brake reservoir) to left-hand drive', () => {
    const html = underhood();
    expect(html).toMatch(/left-hand drive/i);
    expect(html).toContain('brake fluid reservoir sits on the firewall');
  });

  it('does not overclaim the dipstick procedure — defers to the manual', () => {
    const html = underhood({ uhSel: 'dipstick' });
    expect(html).toMatch(/check your manual/i);
  });
});

describe('under-hood tour — runs on the hardware it targets', () => {
  const SRC = readFileSync(resolve(process.cwd(), FILE), 'utf8');

  it('does not trap vertical scrolling on touch devices', () => {
    // touch-action:none on a full-width canvas eats every vertical swipe, so a
    // phone user cannot scroll past the bay to the parts list underneath.
    expect(SRC).toContain("touchAction = 'pan-y'");
    expect(SRC).not.toContain("touchAction = 'none'");
  });

  it('clears the drag state when the browser takes the gesture for scrolling', () => {
    expect(SRC).toContain("'pointercancel'");
  });

  it('pauses rendering when hidden or scrolled out of view', () => {
    expect(SRC).toContain("'visibilitychange'");
    expect(SRC).toContain('IntersectionObserver');
    expect(SRC).toContain('function pauseLoop');
    expect(SRC).toContain('function resumeLoop');
    // and disconnects the observer on teardown rather than leaking it
    const td = SRC.slice(SRC.indexOf('function teardown'), SRC.indexOf('function start'));
    expect(td).toContain('S.io.disconnect');
  });

  it('attempts one rebuild after WebGL context loss instead of giving up', () => {
    expect(SRC).toContain("'webglcontextlost'");
    expect(SRC).toContain('restoreAttempts');
    // capped, so a repeatedly-failing GPU cannot spin forever
    expect(SRC).toMatch(/restoreAttempts >= 1/);
    // and a fresh visit gets its own retry
    expect(SRC).toMatch(/restoreAttempts = 0/);
  });
});

describe('under-hood tour — cross-links with the Repair Bay', () => {
  it('offers a way back to the case when arriving from one', () => {
    const from = underhood({ uhFrom: 'repairbay' });
    expect(from).toContain('Back to the case you were working');
  });

  it('does not show that link when arriving from the menu', () => {
    expect(underhood()).not.toContain('Back to the case you were working');
  });
});

describe('under-hood tour — progress', () => {
  it('reports exploration progress out of 12', () => {
    expect(underhood()).toContain('0 / 12');
    expect(underhood({ uhSeen: { engine: true, battery: true } })).toContain('2 / 12');
  });

  it('shows the completion prompt only once every part is explored', () => {
    const partial = underhood({ uhSeen: { engine: true } });
    expect(partial).not.toContain('Every part explored');

    const all = {};
    for (const id of ['engine', 'oilcap', 'dipstick', 'coolant', 'radiator', 'brake',
      'washer', 'battery', 'belt', 'alternator', 'airbox', 'fusebox']) all[id] = true;
    expect(underhood({ uhSeen: all })).toContain('Every part explored');
  });
});
