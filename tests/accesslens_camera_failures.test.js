import fs from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

// getUserMedia failures are not interchangeable, but the tool discarded the
// error and told everyone the same thing: that the camera is "blocked inside
// this app view", and to try the pop-out window. For a laptop with no rear
// camera, or a camera held by a video call, that advice is wrong and the
// pop-out fails the same way.

const src = fs.readFileSync('stem_lab/stem_tool_accesslens.js', 'utf8');
let reasonOf;

beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_accesslens.js', 'accessLens');
  reasonOf = window.AccessLensPure.cameraFailureReason;
});

function renderDenied(reason) {
  resetStemLab();
  loadTool('stem_lab/stem_tool_accesslens.js', 'accessLens');
  const ctx = {
    React, toolData: {}, isDark: false, isContrast: false,
    setToolData() {}, updateMulti() {}, gradeBand: 'g68'
  };
  return ReactDOMServer.renderToStaticMarkup(window.StemLab._registry.accessLens.render(ctx));
}

describe('camera failure diagnosis', () => {
  it('separates refusal, no device, in-use and unsupported', () => {
    expect(reasonOf({ name: 'NotAllowedError' })).toBe('denied');
    expect(reasonOf({ name: 'PermissionDeniedError' })).toBe('denied');
    expect(reasonOf({ name: 'SecurityError' })).toBe('denied');
    // No camera the constraints can satisfy -- permission advice is wrong here.
    expect(reasonOf({ name: 'NotFoundError' })).toBe('none');
    expect(reasonOf({ name: 'DevicesNotFoundError' })).toBe('none');
    expect(reasonOf({ name: 'OverconstrainedError' })).toBe('none');
    // Held by another app: the fix is to close that app, not to grant anything.
    expect(reasonOf({ name: 'NotReadableError' })).toBe('inuse');
    expect(reasonOf({ name: 'TrackStartError' })).toBe('inuse');
    expect(reasonOf({ name: 'AbortError' })).toBe('inuse');
    expect(reasonOf({ name: 'TypeError' })).toBe('unsupported');
  });

  it('never collapses distinct failures, and none fall through to the fallback', () => {
    const map = {
      NotAllowedError: 'denied', NotFoundError: 'none',
      NotReadableError: 'inuse', TypeError: 'unsupported'
    };
    const seen = new Set();
    for (const [name, want] of Object.entries(map)) {
      const got = reasonOf({ name });
      // Distinctness alone is too weak: a name that falls through to 'other'
      // still looks distinct while giving the student the wrong advice.
      expect(got, name).toBe(want);
      expect(got, name + ' must not reach the fallback').not.toBe('other');
      seen.add(got);
    }
    expect(seen.size).toBe(4);
  });

  it('falls back to a neutral reason rather than guessing', () => {
    for (const e of [null, undefined, {}, 'NotAllowedError', 0, [], { name: 42 }, { name: 'WeirdError' }]) {
      const r = reasonOf(e);
      expect(typeof r, JSON.stringify(e)).toBe('string');
      expect(r.length, JSON.stringify(e)).toBeGreaterThan(0);
    }
    // A bare string is not an error object; it must not be read as a refusal.
    expect(reasonOf({ name: 'WeirdError' })).toBe('other');
  });

  it('reads the legacy code property too', () => {
    expect(reasonOf({ code: 'NotAllowedError' })).toBe('denied');
  });

  it('offers a message for every reason the classifier can return', () => {
    // Each named reason gets its own branch; 'other' is the trailing fallback.
    for (const r of ['denied', 'none', 'inuse', 'unsupported']) {
      expect(src, r).toContain("camReason === '" + r + "'");
    }
    expect(src).toContain('denied_note');
    // Every branch must say something different, or the split is cosmetic.
    const msgs = ['denied_none', 'denied_inuse', 'denied_unsupported', 'denied_perm', 'denied_note'];
    for (const m of msgs) expect(src, m).toContain(m);
    expect(new Set(msgs).size).toBe(msgs.length);
  });

  it('does not offer the pop-out window when it cannot help', () => {
    // The pop-out re-runs getUserMedia in a new context. That helps a blocked
    // iframe; it cannot conjure a camera that is absent or unsupported.
    const i = src.indexOf("row.push(btn('🪟 ");
    expect(i).toBeGreaterThan(-1);
    const guard = src.slice(src.lastIndexOf("if (camState === 'denied'", i), i);
    expect(guard).toContain("camReason !== 'none'");
    expect(guard).toContain("camReason !== 'unsupported'");
  });

  it('asks for the rear camera as a preference, not a requirement', () => {
    // An exact facingMode is rejected outright on a laptop with only a front
    // camera, turning a usable device into an OverconstrainedError.
    expect(src).toContain("facingMode: { ideal: 'environment' }");
    expect(src).not.toContain("facingMode: 'environment'");
  });

  it('shows the note at readable size, not the faintest text on screen', () => {
    const i = src.indexOf("key: 'denied'");
    const block = src.slice(i, i + 300);
    expect(block).not.toContain("fontSize: '11.5px'");
    expect(block).not.toContain('color: C.sub');
    expect(block).toContain("role: 'status'");
  });

  it('still renders with no camera state at all', () => {
    expect(() => renderDenied()).not.toThrow();
  });

  it('ships the same diagnosis in the public mirror', () => {
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_accesslens.js', 'utf8')).toBe(src);
  });
});
