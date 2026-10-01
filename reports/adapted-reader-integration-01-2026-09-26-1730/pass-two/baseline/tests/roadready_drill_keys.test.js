// RoadReady — the driving drills' shared keyboard contract.
//
// Four drills (ScenarioParking, Parking, ThreePoint, BackingDrill) each carried
// their own copy of the same keydown handler, and the copies had DRIFTED: their
// preventDefault lists were 11, 10, 9 and 5 keys long.
//
// The 5-key copy cost a student real control. BackingDrillMode neither READ nor
// SUPPRESSED the arrow keys, while its three siblings steer with arrows as well as
// WASD. So a student who learned arrows in the parking drills went to the backing
// drill and got no steering at all — and, because the keys were unsuppressed, the
// page scrolled out from under the canvas while they were reversing.
//
// Arrows are not a nicety: WASD assumes one hand position, and arrows are the
// conventional alternative for a student who cannot use it.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_roadready.js';

let RR;
beforeAll(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(SOURCE, 'roadReady');
  RR = window.__RR_TEST_EXPORTS__.roadReady;
  if (!RR) throw new Error('roadready did not populate __RR_TEST_EXPORTS__');
});

// A keydown/keyup pair the handler will accept, recording preventDefault.
const press = (key, extra) => {
  const ev = Object.assign({ key, repeat: false, prevented: false }, extra || {});
  ev.preventDefault = () => { ev.prevented = true; };
  return ev;
};

describe('DRILL_KEYS — the contract itself', () => {
  it('covers both control schemes, not just WASD', () => {
    ['w', 'a', 's', 'd'].forEach((k) => expect(RR.DRILL_KEYS).toContain(k));
    ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].forEach((k) =>
      expect(RR.DRILL_KEYS).toContain(k));
  });

  it('covers the keys that would otherwise scroll the page', () => {
    // Arrows and space are the page-scroll keys; leaving them unsuppressed moved
    // the page under a student mid-manoeuvre.
    expect(RR.DRILL_KEYS).toContain(' ');
  });

  it('is lower-case throughout, since the handler lower-cases before comparing', () => {
    RR.DRILL_KEYS.forEach((k) => expect(k).toBe(k.toLowerCase()));
  });
});

describe('attachDrillKeys — behaviour', () => {
  const harness = () => {
    const keysRef = { current: {} };
    let resets = 0;
    const detach = RR.attachDrillKeys(keysRef, () => { resets += 1; });
    const fire = (type, ev) => {
      window.dispatchEvent(Object.assign(new window.Event(type), ev));
      return ev;
    };
    return { keysRef, detach, fire, resets: () => resets };
  };

  it('records a pressed key and clears it on release', () => {
    const H = harness();
    H.fire('keydown', press('ArrowLeft'));
    expect(H.keysRef.current.arrowleft).toBe(true);
    H.fire('keyup', press('ArrowLeft'));
    expect(H.keysRef.current.arrowleft).toBe(false);
    H.detach();
  });

  it('suppresses the browser default for every contract key', () => {
    const H = harness();
    RR.DRILL_KEYS.forEach((k) => {
      const ev = press(k);
      H.fire('keydown', ev);
      expect(ev.prevented, `${k} should be suppressed`).toBe(true);
    });
    H.detach();
  });

  it('leaves keys outside the contract alone', () => {
    const H = harness();
    ['Tab', 'F5', 'p'].forEach((k) => {
      const ev = press(k);
      H.fire('keydown', ev);
      expect(ev.prevented, `${k} should NOT be suppressed`).toBe(false);
    });
    H.detach();
  });

  it('fires reset once on R and ignores auto-repeat', () => {
    const H = harness();
    H.fire('keydown', press('r'));
    expect(H.resets()).toBe(1);
    H.fire('keydown', press('r', { repeat: true }));
    expect(H.resets()).toBe(1);
    H.detach();
  });

  it('stops listening after detach — no leak across drill remounts', () => {
    const H = harness();
    H.detach();
    const ev = press('w');
    H.fire('keydown', ev);
    expect(H.keysRef.current.w).toBeUndefined();
    expect(ev.prevented).toBe(false);
  });

  it('survives a synthetic event with no key', () => {
    const H = harness();
    expect(() => H.fire('keydown', press(undefined))).not.toThrow();
    H.detach();
  });
});

describe('every drill uses the shared contract — no copy left to drift', () => {
  const source = readFileSync(SOURCE, 'utf8');

  it('wires all four drills through attachDrillKeys', () => {
    const uses = source.split('attachDrillKeys(keysRef, resetCar)').length - 1;
    expect(uses).toBe(4);
  });

  it('leaves exactly one inlined key list — the main driving view, which is not a drill', () => {
    // The four drifted drill copies each inlined an array literal. Only the main
    // driving view may keep its own: it has a genuinely different contract (q/z/x
    // plus one-shot pause / camera / HUD toggles), so folding it in would be wrong.
    // If this count moves, a fifth copy has appeared and drift has started again.
    const inlined = source
      .split(/\r?\n/)
      .map((line, i) => ({ line, n: i + 1 }))
      .filter(({ line }) => /\[\s*'w'\s*,\s*'a'\s*,\s*'s'\s*,\s*'d'\s*[,\]]/.test(line))
      .filter(({ line }) => !/var DRILL_KEYS/.test(line));
    expect(inlined).toHaveLength(1);
    expect(inlined[0].line).toContain("'q'");   // the main view's distinguishing keys
  });

  it('guards text fields, the lesson the main driving view already paid for', () => {
    // Its comment records that typing "was" into a shared modal's input paused the
    // sim and throttled the car. The drills bind to window too and had no guard.
    const keysRef = { current: {} };
    const detach = RR.attachDrillKeys(keysRef, () => {});

    // Event.target is a read-only getter, so it cannot be faked by assignment —
    // dispatch from a REAL element and let the event bubble to the window listener.
    const fireFrom = (el, key) => {
      document.body.appendChild(el);
      const ev = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      el.dispatchEvent(ev);
      document.body.removeChild(el);
      return ev;
    };

    ['input', 'textarea'].forEach((tag) => {
      const ev = fireFrom(document.createElement(tag), 'w');
      expect(keysRef.current.w, `typing in <${tag}> must not drive the car`).toBeUndefined();
      expect(ev.defaultPrevented).toBe(false);
    });

    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    Object.defineProperty(editable, 'isContentEditable', { value: true });
    fireFrom(editable, 'a');
    expect(keysRef.current.a).toBeUndefined();

    // Control: the same key from the page itself still drives.
    const ok = fireFrom(document.createElement('div'), 'w');
    expect(keysRef.current.w).toBe(true);
    expect(ok.defaultPrevented).toBe(true);

    detach();
  });

  it('lets the backing drill steer with arrows, like its three siblings', () => {
    // It read WASD alone; the arrows it now suppresses must also DO something.
    const idx = source.indexOf('Arrows as well as WASD, matching the other three drills');
    expect(idx).toBeGreaterThan(-1);
    const block = source.slice(idx, idx + 400);
    ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].forEach((k) =>
      expect(block).toContain(`k['${k}']`));
  });
});
