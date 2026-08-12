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
    expect(html).toContain("get('allo_bridge')");
    expect(html).toContain("type.replace('-request', '-response')");
    // The popup uses the same two URL parameters; if it ever renames them the
    // page has to follow, so pin that both still read the same names.
    expect(popup).toContain("get('allo_bridge')");
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
    // Fragment, not query: a secret in the request line reaches the CDN's logs.
    expect(moduleText).toContain("u.hash = 'allo_bridge=' + encodeURIComponent(token)");
    expect(moduleText).not.toContain("u.searchParams.set('allo_bridge'");
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
      expect(url).toContain('posture=learner');
      // The token rides the fragment, so it never reaches a server. Assert both
      // halves: present after the '#', and absent from everything before it.
      const [beforeHash, afterHash] = url.split('#');
      expect(afterHash).toContain('allo_bridge=tok123');
      expect(beforeHash).not.toContain('allo_bridge');
      expect(beforeHash).not.toContain('tok123');
      // Anything that is not exactly 'educator' restricts, same as the page.
      expect(VS.coachUrlWithBridge('t', 'nonsense')).toContain('posture=learner');
      expect(VS.coachUrlWithBridge('t', 'educator')).toContain('posture=educator');
    });
  });
});

// ─── Cancelling an abandoned request ────────────────────────────────────────
// The app keeps an AbortController per request and drops it on
// 'allostudio-ai-cancel'. The popup has always sent that; the page was not,
// so an abandoned request left the app burning a vision call on a screen
// nobody was looking at while the page waited out its own timeout.
describe('request cancellation', () => {
  it('sends the cancel message the app already listens for', () => {
    expect(html).toContain("type: 'allostudio-ai-cancel', requestId: id");
    expect(moduleText).toContain("ev.data.type === 'allostudio-ai-cancel'");
    expect(moduleText).toContain("'allostudio-ai-cancel'"); // still in VS_AI_BRIDGE_TYPES
  });

  it('cancels on timeout, on stopping the watch, and on leaving the page', () => {
    expect(html).toContain('timer = setTimeout(function () { cancelBridgeRequest(id); finish({ error: \'timed out\' }); }');
    const stop = html.slice(html.indexOf('function stopWatch()'), html.indexOf('// ── Floating mirror'));
    expect(stop).toContain('cancelPendingRequest()');
    expect(html).toContain("window.addEventListener('pagehide', function () { try { cancelPendingRequest(); stopWatch(); }");
  });

  it('clears the pending id once a request settles, so a stale cancel is not sent', () => {
    const fn = html.slice(html.indexOf('function bridgeRequest('), html.indexOf('// ── Backend settings'));
    expect(fn).toContain('if (pendingRequestId === id) pendingRequestId = null;');
    expect(fn).toContain('pendingRequestId = id;');
  });
});

// ─── Canvas hardening (workflow findings, 2026-08-11) ───────────────────────
// Gemini Canvas serves the app from a real origin (confirmed: in-app dictation
// works there, and the microphone is Permissions-Policy gated so it could not
// be granted to an opaque origin). So the bridge DOES have an origin to use,
// and these are the repairs that were masked while we assumed otherwise.
describe('canvas hardening', () => {
  const popup = readFileSync(resolve(process.cwd(), 'video_studio/video_studio.html'), 'utf-8');

  // One token serves every window we opened. openStudio minted a fresh one
  // unconditionally, rotating it out from under a live coach window.
  it('does not rotate the shared token out from under a live coach window', () => {
    expect(moduleText).toContain("var bridgeToken = (vsTakeStore.token && vsTakeStore.coachWin && !vsTakeStore.coachWin.closed)");
    // And a blocked Studio popup must not clear a token the coach still holds.
    expect(moduleText).toContain('if (!vsTakeStore.coachWin || vsTakeStore.coachWin.closed) vsTakeStore.setToken(null);');
  });

  // usercontent.goog is the origin Canvas actually serves from, and it was
  // missing, so teachers on the primary surface were warned their own app was
  // an unrecognised site before every first Send.
  it('recognises the Canvas hosts the rest of the repo already knows', () => {
    const fn = popup.slice(popup.indexOf('function openerOriginRecognised'), popup.indexOf('var unknownOriginSendApproved'));
    for (const host of ['usercontent', 'idx.google', 'run.app', 'googleusercontent']) {
      expect(fn, `openerOriginRecognised is missing ${host}`).toContain(host);
    }
    // Same set the sheet bridge enumerates.
    const sheet = readFileSync(resolve(process.cwd(), 'allo_sheet/allo_sheet.js'), 'utf-8');
    expect(sheet).toContain('usercontent.goog');
  });

  it('no longer treats "no destination" as consent', () => {
    const fn = popup.slice(popup.indexOf('function confirmUnknownOriginSend'), popup.indexOf('function postToOpener'));
    expect(fn).toContain('if (!target) return false;');
    expect(fn).not.toContain('if (!target || openerOriginRecognised(target)');
  });

  it('does not claim to be connected when it cannot send', () => {
    expect(popup).toContain('⚠ Opened by AlloFlow, but not connected');
    expect(popup).not.toContain("if (!target) { $('linkState').textContent = 'Connected to AlloFlow'; return; }");
  });

  // Dead in the case it existed for, and worse than nothing if it resolved.
  it('drops the referrer fallback in both windows', () => {
    expect(html).not.toContain('document.referrer');
    expect(popup).not.toContain('document.referrer');
  });

  it('names the real cause when AlloFlow opened it but the link is dead', () => {
    const gate = html.slice(html.indexOf('var p = bridgeAvailable ? null : getProvider();'), html.indexOf('var frame = grabFrame();'));
    expect(gate).toContain('the two windows could not connect');
    expect(gate).toContain('if (opener && !opener.closed)');
    // The "configure a backend" advice survives only for a genuine cold open.
    expect(gate).toContain('No AI backend is configured');
  });

  // allostudio-ping had a handler and no sender since the popup was written.
  it('finally sends the ping its handler was waiting for', () => {
    expect(moduleText).toContain('function vsPingBridgeWindow(win)');
    expect(moduleText).toContain("vsPostToStudio(win, { type: 'allostudio-ping' })");
    expect(moduleText).toContain('if (w) vsPingBridgeWindow(w);');   // coach
    expect(moduleText).toContain('vsPingBridgeWindow(w);');          // studio
    expect(popup).toContain("isOpenerMessage(ev, 'allostudio-ping')");
    // Bounded: a handshake, not a heartbeat.
    expect(moduleText).toContain('if (attempts >= 8) return;');
    // Guarded for the no-React helper surface, where vsPostToStudio is undefined.
    expect(moduleText).toContain("if (typeof vsPostToStudio !== 'function') return;");
  });

  it('lets the coach learn a REAL origin from the ping, never an opaque one', () => {
    const listener = html.slice(html.indexOf("ev.data.type !== 'allostudio-ping'") - 400, html.indexOf('// ── Backend settings'));
    expect(listener).toContain("var realOrigin = (ev.origin && ev.origin !== 'null') ? ev.origin : '';");
    expect(listener).toContain('if (!openerOrigin && realOrigin) openerOrigin = realOrigin;');
    expect(listener).toContain("ev.data.bridge !== bridgeToken");
    // No wildcard target anywhere on this page.
    expect(html).not.toMatch(/postMessage\([^\n]*['"]\*['"]/);
  });
});

// ─── Token handoff ──────────────────────────────────────────────────────────
// window.open only works inside the user's click, and the VideoStudio module is
// lazy. A command fired in a session where Video Studio was never opened cannot
// wait for it, so it opens the coach unbridged. Without a handoff the FIRST
// coach of a session is permanently unbridged, which in Canvas means it cannot
// work at all. The module adopts the window when it loads and pings it, and the
// ping already carries the token, so no new message type was needed.
describe('token handoff', () => {
  it('leaves the window handle for the module to adopt', () => {
    const cmd = readFileSync(resolve(process.cwd(), 'allo_commands_module.js'), 'utf-8');
    expect(cmd).toContain('window.__alloPendingCoachWin = win');
    // Only on the unbridged branch: when the module is already loaded its own
    // opener registers the window itself.
    const run = cmd.slice(cmd.indexOf('id: "open_it_coach"'), cmd.indexOf('id: "print_page"'));
    expect(run.indexOf('VS.openCoachWindow(posture)')).toBeLessThan(run.indexOf('__alloPendingCoachWin'));
    const hub = readFileSync(resolve(process.cwd(), 'view_learning_hub_modal_module.js'), 'utf-8');
    expect(hub).toContain('__alloPendingCoachWin');
  });

  it('adopts the pending window once, after the receivers are listening', () => {
    expect(moduleText).toContain('function adoptPendingCoachWindow()');
    expect(moduleText).toContain('window.__alloPendingCoachWin = null;');
    expect(moduleText).toContain('vsTakeStore.coachWin = pending;');
    expect(moduleText).toContain('vsPingBridgeWindow(pending);');
    // Ordering: adoption must come after both receivers are registered, or a
    // reply could arrive before anything is listening for it.
    expect(moduleText.indexOf("window.addEventListener('message', vsAiBridgeReceiver)"))
      .toBeLessThan(moduleText.indexOf('function adoptPendingCoachWindow()'));
  });

  it('upgrades the page from standalone to bridged, once, from a named origin', () => {
    const listener = html.slice(html.indexOf("ev.data.type !== 'allostudio-ping'") - 300, html.indexOf('// ── Backend settings'));
    expect(listener).toContain('if (!bridgeToken && ev.data.bridge && realOrigin) bridgeToken = String(ev.data.bridge);');
    // An opaque sender is not a destination we will ever adopt.
    expect(listener).toContain("var realOrigin = (ev.origin && ev.origin !== 'null') ? ev.origin : '';");
    // Single-shot: a token already held is never replaced, and a mismatched
    // stamp is rejected before any of this runs.
    expect(listener).toContain('if (bridgeToken && ev.data.bridge !== bridgeToken) return;');
    // The upgrade is visible to the user rather than silent.
    expect(listener).toContain('Connected to AlloFlow');
    expect(listener).toContain('paintBackendForm()');
  });
});

// ─── Bridge token hygiene ───────────────────────────────────────────────────
// A query string is part of the request line, so a token there is sent to
// Cloudflare on every load and can settle in CDN access logs, any proxy in
// between, and browser history. A fragment never leaves the browser. Same place
// allo_sheet/host_bridge.js has always put its own bridge token.
describe('bridge token stays out of the request line', () => {
  const popup = readFileSync(resolve(process.cwd(), 'video_studio/video_studio.html'), 'utf-8');

  it('is written to the fragment by both URL builders', () => {
    const writes = moduleText.match(/u\.hash = 'allo_bridge=' \+ encodeURIComponent\(token\)/g) || [];
    expect(writes.length).toBe(2);   // coachUrlWithBridge + studioUrlWithBridge
    expect(moduleText).not.toContain("searchParams.set('allo_bridge'");
  });

  it('is read from the fragment by both windows, with a legacy fallback', () => {
    for (const [name, src] of [['coach page', html], ['studio popup', popup]]) {
      expect(src, `${name} does not read the fragment`).toContain("new URLSearchParams(String(window.location.hash || '').replace(/^#/, '')).get('allo_bridge')");
      // A window opened by an app build that predates the move still works.
      expect(src, `${name} dropped the legacy fallback`).toContain("get('allo_bridge') || '';   // legacy");
    }
  });

  it('scrubs the fragment once read, in both windows', () => {
    for (const [name, src] of [['coach page', html], ['studio popup', popup]]) {
      expect(src, `${name} leaves the token in the address bar`)
        .toContain("history.replaceState(null, '', window.location.pathname + window.location.search)");
    }
  });

  it('matches the house pattern the sheet bridge already uses', () => {
    const sheet = readFileSync(resolve(process.cwd(), 'allo_sheet/host_bridge.js'), 'utf-8');
    expect(sheet).toContain("'#bridgeToken='");
  });
});

// ─── Accessibility of the coach surface ─────────────────────────────────────
describe('coach accessibility', () => {
  // #coachStatus and #beStatus are themselves role="status" aria-live regions.
  // Writing to one AND calling announce() read the same sentence twice, on top
  // of the spoken guidance: three channels for one message. The Studio popup
  // had to unpick the same storm.
  it('announces each suggestion once, not twice', () => {
    const suggest = html.slice(html.indexOf('async function suggest(fromAuto)'), html.indexOf("$('coachSuggestBtn').addEventListener"));
    expect(suggest).not.toContain("announce('Coach: '");
    // #live is still there for messages with no visible home.
    expect(html).toContain("announce('Screen Coach is watching");
    expect(html).toContain('id="live" class="sr-only" aria-live="polite" role="status"');
    // And the visible status element is still a live region.
    expect(html).toContain('id="coachStatus" role="status" aria-live="polite" aria-atomic="true"');
  });

  // The amber box lives on a canvas that must be aria-hidden, so a screen
  // reader gets nothing from it unless the position is also said in words.
  it('says where the highlight landed, not just that there is one', () => {
    expect(html).toContain('function describeTarget(box)');
    const suggest = html.slice(html.indexOf('async function suggest(fromAuto)'), html.indexOf("$('coachSuggestBtn').addEventListener"));
    expect(suggest).toContain('var where = describeTarget(resp.target);');
    expect(suggest).toContain("' Look at the ' + where");
    // Spoken guidance carries it too, for a user who is not reading the page.
    expect(suggest).toContain("speak(guidance + (where ? '. Look at the ' + where + '.' : ''))");
    // Coarse by design: the box is an estimate and thirds are honest about it.
    expect(html).toContain("centre < 0.34 ? low : (centre < 0.67 ? mid : high)");
  });

  it('does not drop keyboard focus while a request is in flight', () => {
    const suggest = html.slice(html.indexOf('async function suggest(fromAuto)'), html.indexOf("$('coachSuggestBtn').addEventListener"));
    expect(suggest).toContain("var hadFocus = document.activeElement === $('coachSuggestBtn');");
    expect(suggest).toContain("$('coachSuggestBtn').setAttribute('aria-busy', 'true');");
    // Both exits restore it: the error path and the success path.
    expect((suggest.match(/restoreFocus\(\);/g) || []).length).toBe(2);
    expect((suggest.match(/removeAttribute\('aria-busy'\)/g) || []).length).toBe(2);
  });

  it('keeps every control a real element the keyboard already understands', () => {
    // No hand-rolled controls: nothing on this page carries role="button", so
    // there is no way to build the mouse-only trap the repo keeps hitting.
    expect(html).not.toContain('role="button"');
    expect(html).toMatch(/<button[^>]*id="coachSuggestBtn"/);
    expect(html).toMatch(/<button[^>]*id="coachWatchBtn"/);
    // The drawing surface is hidden from assistive tech, with the words above
    // carrying the information instead.
    expect(html).toContain('id="coachOverlay" hidden aria-hidden="true"');
  });
});
