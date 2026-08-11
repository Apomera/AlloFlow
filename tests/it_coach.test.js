// Standalone IT Coach (it_coach/it_coach.html) — contract pins.
//
// The page guides someone through any website they share. It is a real
// top-level page, so these are structural assertions over its source plus a
// parse check of the inline script; the behavioral coverage of the advice
// clamp itself lives in tests/video_studio.test.js, because the page loads
// that one shared implementation instead of copying it.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Script } from 'node:vm';
import { loadAlloModule } from './setup.js';

const PAGE = 'it_coach/it_coach.html';
const html = readFileSync(resolve(process.cwd(), PAGE), 'utf-8');
const moduleText = readFileSync(resolve(process.cwd(), 'video_studio_module.js'), 'utf-8');
const inlineScript = () => {
  const start = html.indexOf('<script>');
  const end = html.lastIndexOf('</script>');
  return html.slice(start + '<script>'.length, end);
};

describe('standalone IT coach page', () => {
  it('parses', () => {
    expect(() => new Script(inlineScript(), { filename: 'it-coach-inline.js' })).not.toThrow();
  });

  // The whole reason the sanitizer moved into [VS_SHARED]: one implementation,
  // guarded by one gate. A copy here would be a third place for the
  // null-when-unsure rule and the learner guardrail to rot.
  it('loads the advice clamp instead of copying it', () => {
    expect(html).toContain('<script src="../video_studio_module.js"></script>');
    expect(html).not.toContain('function vsSanitizeCoachAdvice');
    expect(html).toContain('window.AlloModules && window.AlloModules.VideoStudio');
    expect(html).toContain('sanitizeAdvice(parsed, { posture: posture })');
  });

  it('disables itself when the clamp is missing rather than guessing', () => {
    const guard = html.slice(html.indexOf("if (typeof sanitizeAdvice !== 'function')"), html.indexOf('// ── Backend settings'));
    expect(guard).toContain("$('coachSuggestBtn').disabled = true");
    expect(guard).toContain("$('coachWatchBtn').disabled = true");
    // And the ask path refuses to run even if something re-enabled the button.
    expect(html).toContain("if (busy || typeof sanitizeAdvice !== 'function') return;");
  });

  it('defaults to the learner posture and only the URL can widen it', () => {
    expect(html).toContain("var posture = params.get('posture') === 'educator' ? 'educator' : 'learner';");
    // No in-page control that flips posture: a student handed the link cannot
    // click their way out of the contract.
    expect(html).not.toMatch(/posture\s*=\s*['"]educator['"]\s*;(?![\s\S]{0,80}params)/);
    expect(html).toContain('It will not answer questions, quizzes, or other schoolwork');
  });

  it('keeps the classification contract in step with the module prompt', () => {
    const handler = moduleText.slice(moduleText.indexOf("ev.data.type === 'allostudio-coach-request'"), moduleText.indexOf("ev.data.type === 'allostudio-lesson-request'"));
    for (const clause of [
      'THE USER IS A STUDENT',
      '"kind":"navigation"|"content"',
      'or you are unsure, answer "content"'
    ]) {
      expect(html, `page prompt is missing: ${clause}`).toContain(clause);
      expect(handler, `module prompt is missing: ${clause}`).toContain(clause);
    }
  });

  it('gates the frame read on consent, in that order', () => {
    const suggest = html.slice(html.indexOf('async function suggest(fromAuto)'), html.indexOf("$('coachSuggestBtn').addEventListener"));
    expect(suggest.indexOf("coachPrivacyAck').checked")).toBeLessThan(suggest.indexOf('grabFrame()'));
    expect(suggest).toContain('captureActive()');
  });

  it('treats a refusal as not-guidance', () => {
    const suggest = html.slice(html.indexOf('async function suggest(fromAuto)'), html.indexOf("$('coachSuggestBtn').addEventListener"));
    const refusal = suggest.slice(suggest.indexOf('if (resp.refused)'));
    expect(refusal).toContain('hideOverlay()');
    expect(refusal).toContain('stopAuto()');
    expect(refusal).toContain('lastAdvice = null');
    expect(suggest.indexOf('if (resp.refused)')).toBeLessThan(suggest.indexOf('history.push(guidance)'));
  });

  // Watch-only by construction: there is no recorder on this page at all, so
  // "nothing is saved" is a property of the code and not a promise in copy.
  it('cannot record', () => {
    expect(html).not.toContain('MediaRecorder');
    expect(html).toContain('getDisplayMedia({ video: true, audio: false })');
    expect(html).toContain('track.onended = stopWatch');
    expect(html).toContain("window.addEventListener('pagehide'");
  });

  it('says plainly what leaves the device, and offers a local backend first', () => {
    expect(html).toContain('sends ONE downscaled picture');
    expect(html).toContain('Ollama (on this device)');
    // The local options precede the cloud ones in the picker.
    expect(html.indexOf('value="ollama"')).toBeLessThan(html.indexOf('value="gemini"'));
    expect(html).toContain("A cloud key is stored in this browser's local storage, unencrypted");
  });
});

// ─── Reachability: the command that opens it ────────────────────────────────
// A tool nothing links to is a tool nobody uses. open_it_coach puts the page in
// the palette, chat, and voice, and is where the app decides which posture the
// page is handed.
describe('open_it_coach command', () => {
  let AC;
  beforeAll(() => {
    const noop = () => {};
    vi.stubGlobal('React', {
      createElement: noop, useState: () => [undefined, noop], useEffect: noop,
      useRef: () => ({ current: null }), useMemo: noop, useCallback: (f) => f,
    });
    loadAlloModule('allo_commands_module.js');
    AC = window.AlloModules.AlloCommands;
    if (!AC) throw new Error('AlloCommands failed to register');
  });
  afterAll(() => { vi.unstubAllGlobals(); });

  const find = (ctx) => AC.buildAlloCommands(ctx || {}, { includeGated: true }).filter((c) => c.id === 'open_it_coach');

  // The registry currently contains a block of entries twice over (a
  // pre-existing defect, tracked separately). This pins that OURS is not one of
  // them: a duplicate would show the coach twice in the palette and give its
  // aliases two identical things to score.
  it('is registered exactly once', () => {
    expect(find({}).length).toBe(1);
  });

  it('hands the page a posture, and only a teacher gets the unrestricted one', () => {
    const opened = [];
    const openSpy = vi.spyOn(window, 'open').mockImplementation((url) => { opened.push(url); return { closed: false }; });
    try {
      const run = (ctx) => { opened.length = 0; find(ctx)[0].run(ctx); return opened[0]; };
      expect(run({ isTeacherMode: true })).toContain('posture=educator');
      // Everything that is not a teacher lands on the restrictive posture.
      expect(run({})).toContain('posture=learner');
      expect(run({ isTeacherMode: false })).toContain('posture=learner');
      // A parent surface is not a teacher, even where the teacher flag is set.
      expect(run({ isTeacherMode: true, isParentMode: true })).toContain('posture=learner');
    } finally { openSpy.mockRestore(); }
  });

  it('points at the standalone page and says so honestly when blocked', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    try {
      const msg = find({})[0].run({});
      expect(msg).toMatch(/blocked/i);
    } finally { openSpy.mockRestore(); }
    const src = readFileSync(resolve(process.cwd(), 'allo_commands_source.jsx'), 'utf-8');
    expect(src).toContain('it_coach/it_coach.html?posture=');
    // Generated module and its deploy mirror agree with source.
    const built = readFileSync(resolve(process.cwd(), 'allo_commands_module.js'), 'utf-8');
    expect(built).toContain('id: "open_it_coach"');
    expect(readFileSync(resolve(process.cwd(), 'desktop/web-app/public/allo_commands_module.js'), 'utf-8')).toBe(built);
  });

  it('is barred from demo autopilot, which cannot drive a screen-share dialog', () => {
    const contract = AC.getCommandContract('open_it_coach');
    expect(contract && contract.demoSafe).toBe(false);
    expect(contract && contract.interaction).toBe('external');
  });
});

// ─── Learner Hub card ───────────────────────────────────────────────────────
describe('Learning Hub card', () => {
  const hubSrc = readFileSync(resolve(process.cwd(), 'view_learning_hub_modal_source.jsx'), 'utf-8');

  it('is on the learner surface, in the practice section', () => {
    expect(hubSrc).toContain('data-hub-id="screen-coach" data-hub-label="Screen Coach" data-hub-section="practice"');
    expect(hubSrc).toContain('Stuck on a website?');
  });

  // The card is the way a STUDENT reaches the coach, so it must never be the
  // way a student reaches the unrestricted posture. The page defaults to
  // learner anyway; this pins that the learner surface never even asks.
  it('always opens the learner posture, never the educator one', () => {
    const card = hubSrc.slice(hubSrc.indexOf('data-hub-id="screen-coach"'), hubSrc.indexOf('data-hub-id="research-hub"'));
    expect(card).toContain('it_coach.html?posture=learner');
    expect(card).not.toContain('posture=educator');
    expect(card).not.toContain('isTeacherMode');
    // Closes the hub before opening the window, like every other card here.
    expect(card.indexOf('setShowLearningHub(false)')).toBeLessThan(card.indexOf('window.open'));
  });

  it('carries the same favourite control and naming as its neighbours', () => {
    const card = hubSrc.slice(hubSrc.indexOf('data-hub-id="screen-coach"'), hubSrc.indexOf('data-hub-id="research-hub"'));
    expect(card).toContain("aria-pressed={hubFavoriteIds.includes('screen-coach')}");
    expect(card).toContain("toggleHubFavorite('screen-coach')");
    expect(card).toContain('aria-hidden="true"');
  });

  it('reached the generated module and its mirror', () => {
    const built = readFileSync(resolve(process.cwd(), 'view_learning_hub_modal_module.js'), 'utf-8');
    expect(built).toContain('screen-coach');
    expect(built).toContain('it_coach.html?posture=learner');
    expect(readFileSync(resolve(process.cwd(), 'desktop/web-app/public/view_learning_hub_modal_module.js'), 'utf-8')).toBe(built);
  });
});

// ─── Bridge transport ───────────────────────────────────────────────────────
// The page reuses the Video Studio bridge rather than inventing a transport:
// same token parameter, same origin parameter, same message type, and the
// module's existing vsAiBridgeReceiver answers it. Nothing new was added to the
// protocol, so these pins are mostly "did we actually reuse it".
describe('bridge transport', () => {
  it('speaks the popup protocol, parameter for parameter', () => {
    const popup = readFileSync(resolve(process.cwd(), 'video_studio/video_studio.html'), 'utf-8');
    expect(html).toContain("params.get('allo_bridge')");
    expect(html).toContain("type.replace('-request', '-response')");
    // The popup uses the same two URL parameters; if it ever renames them the
    // page has to follow, so pin that both still read the same names.
    expect(popup).toContain("bridgeParams.get('allo_bridge')");
    expect(popup).toContain("bridgeParams.get('allo_origin')");
    expect(html).toContain("params.get('allo_origin')");
    // Same message type the module already routes.
    expect(html).toContain("bridgeRequest('allostudio-coach-request'");
    expect(moduleText).toContain("'allostudio-coach-request',"); // still in VS_AI_BRIDGE_TYPES
  });

  it('prefers the bridge and only falls back to its own backend without one', () => {
    expect(html).toContain('var bridgeAvailable = !!(opener && !opener.closed && bridgeToken && openerOrigin);');
    expect(html).toContain('var p = bridgeAvailable ? null : getProvider();');
    // With a bridge there is nothing to configure, so the panel says so rather
    // than asking for a second key.
    expect(html).toContain('there is no second key to enter here');
  });

  // The page must not trust the opener to have kept the learner contract.
  it('re-clamps the bridge reply on arrival', () => {
    const suggest = html.slice(html.indexOf('async function suggest(fromAuto)'), html.indexOf("$('coachSuggestBtn').addEventListener"));
    expect(suggest.indexOf('sanitizeAdvice(parsed, { posture: posture })')).toBeGreaterThan(suggest.indexOf('bridgeRequest('));
    // Token and origin are both checked on the way in.
    expect(html).toContain('if (bridgeToken && ev.data.bridge !== bridgeToken) return;');
    expect(html).toContain('if (openerOrigin && ev.origin && ev.origin !== openerOrigin) return;');
  });

  it('mints the token through the existing take store, not a new one', () => {
    expect(moduleText).toContain('function vsOpenCoachWindow(posture)');
    expect(moduleText).toContain('if (store) store.setToken(token);');
    expect(moduleText).toContain('u.searchParams.set(\'allo_bridge\', token)');
    // Sender check widened to "a window we opened", with token and origin
    // checks untouched above it.
    expect(moduleText).toContain('function vsIsKnownBridgeWindow(source)');
    expect(moduleText).toContain('if (!vsIsKnownBridgeWindow(ev.source)) return;');
    expect(moduleText).toContain("if (!vsTakeStore.token || ev.data.bridge !== vsTakeStore.token) return;");
    expect(moduleText).toContain('if (ev.origin && ev.origin !== STUDIO_ORIGIN) return;');
  });

  describe('sender check', () => {
    let VS;
    beforeAll(() => { loadAlloModule('video_studio_module.js'); VS = window.AlloModules.VideoStudio; });
    it('is exported and falls back to the token when no handle is live', () => {
      expect(typeof VS.vsIsKnownBridgeWindow).toBe('function');
      // No live handles (the app reloaded): the token stays the only proof,
      // which is exactly the behaviour this check had before it was widened.
      expect(VS.vsIsKnownBridgeWindow({})).toBe(true);
    });
    it('builds a coach URL carrying the token, origin, and posture', () => {
      const url = VS.coachUrlWithBridge('tok123', 'learner');
      expect(url).toContain('it_coach/it_coach.html');
      expect(url).toContain('allo_bridge=tok123');
      expect(url).toContain('posture=learner');
      // Anything that is not exactly 'educator' restricts, same as the page.
      expect(VS.coachUrlWithBridge('t', 'nonsense')).toContain('posture=learner');
      expect(VS.coachUrlWithBridge('t', 'educator')).toContain('posture=educator');
    });
  });
});
