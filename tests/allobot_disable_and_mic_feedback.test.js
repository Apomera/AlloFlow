// Lane 7 / A3 + A4 + A5.
//
// A3 — the X on AlloBot and the header toggle must disable AlloBot TIPS and
//      nothing else. Neither may take text-to-speech down with it.
// A4 — the microphone must show the user that it is picking them up.
// A5 — recording state must not be carried by colour alone, and a state change
//      must reach assistive technology.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const botSource = readFileSync(resolve(process.cwd(), 'allobot_source.jsx'), 'utf-8');

describe('A3 — hiding AlloBot must not silence the rest of the app', () => {
  it('never calls the GLOBAL speechSynthesis.cancel() outside the ownership guard', () => {
    // speechSynthesis.cancel() has no per-utterance form: it stops everything
    // the page is speaking. AlloBot called it on unmount, on mute, on idle
    // sleep and on the X, so dismissing the bot killed Read This Page and the
    // voice loop mid-sentence. Exactly one call site is allowed, inside
    // cancelAlloBotBrowserSpeech, which returns early unless the bot owns the
    // current utterance.
    const guard = botSource.slice(
      botSource.indexOf('const cancelAlloBotBrowserSpeech = () =>'),
      botSource.indexOf('const AlloBot = React.memo'),
    );
    expect(guard).toContain('if (!_alloBotOwnsBrowserSpeech) return false;');
    expect(guard).toContain('window.speechSynthesis.cancel()');

    const callSites = botSource
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .filter((line) => /speechSynthesis(?:\?)?\.cancel\(\)/.test(line));
    expect(callSites.length, callSites.join(' || ')).toBe(1);
  });

  it('claims ownership only while its own browser utterance is in flight', () => {
    expect(botSource).toContain('alloBotClaimBrowserSpeech();\n                      window.speechSynthesis.speak(utter);');
    expect(botSource).toContain('utter.onend = () => { alloBotReleaseBrowserSpeech(); resetState(); };');
    expect(botSource).toContain('utter.onerror = () => {');
    expect(botSource).toContain('alloBotReleaseBrowserSpeech();\n                      reportPlaybackFailure');
  });

  it('routes every silence path through the scoped helper', () => {
    for (const marker of [
      'if (speechTimeoutRef.current) { clearTimeout(speechTimeoutRef.current); speechTimeoutRef.current = null; }\n      cancelAlloBotBrowserSpeech();', // silenceSpeech
      'if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);\n      cancelAlloBotBrowserSpeech();\n      if (wasPlaying && onSpeechEnd) onSpeechEnd();', // unmount cleanup
      'cancelAlloBotBrowserSpeech();\n          setIsTalking(false);',                                                                               // mute toggle
    ]) {
      expect(botSource).toContain(marker);
    }
  });

  it('keeps both disable controls on one piece of state so they cannot diverge', () => {
    const app = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf-8');
    // The header toggle and the bot's own X both write isBotVisible and nothing
    // else. handleHideBot additionally moves focus, which is a11y, not policy.
    expect(app).toContain('const handleToggleIsBotVisible = React.useCallback(() => setIsBotVisible(prev => !prev), []);');
    const hide = app.slice(app.indexOf('const handleHideBot = React.useCallback('), app.indexOf('const handleToggleIsHelpMode'));
    expect(hide).toContain('setIsBotVisible(false);');
    expect(hide).not.toMatch(/setSoundEnabled|ttsProvider|stopPlayback|speechSynthesis/);
  });

  it('answers a spoken question out loud even when AlloBot is not on screen', () => {
    const app = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf-8');
    // A reply owed to a hands-free turn is handed to the voice loop instead of
    // the avatar, so an unmounted avatar no longer means silence.
    expect(app).toContain('const _voiceConverseWaitersRef = useRef([]);');
    expect(app).toContain("if (lastMsg.role === 'model' && waiters.length) {");
    expect(app).toContain('waiter.resolve(String(lastMsg.text || \'\'))');
  });
});

describe('A4 — the microphone shows that it is hearing you', () => {
  let AC;
  beforeAll(() => {
    const noop = () => {};
    vi.stubGlobal('React', {
      createElement: noop, useState: () => [undefined, noop], useEffect: noop,
      useRef: () => ({ current: null }), useMemo: noop, useCallback: (f) => f,
      memo: (f) => f, forwardRef: (f) => f,
    });
    loadAlloModule('allo_commands_module.js');
    AC = window.AlloModules.AlloCommands;
  });
  afterAll(() => { vi.unstubAllGlobals(); });

  it('exposes one reference-counted level monitor rather than a stream per surface', () => {
    expect(AC.micLevelMonitor).toBeTruthy();
    expect(typeof AC.micLevelMonitor.acquire).toBe('function');
    expect(typeof AC.micLevelMonitor.subscribe).toBe('function');
    expect(AC.micLevelMonitor.isActive()).toBe(false);

    const releaseA = AC.micLevelMonitor.acquire(null);
    const releaseB = AC.micLevelMonitor.acquire(null);
    expect(AC.micLevelMonitor.isActive()).toBe(true);
    releaseA();
    expect(AC.micLevelMonitor.isActive()).toBe(true); // B still holds it
    releaseB();
    expect(AC.micLevelMonitor.isActive()).toBe(false);
    releaseB(); // idempotent: a double release must not underflow the count
    expect(AC.micLevelMonitor.isActive()).toBe(false);
  });

  it('publishes the level on the window contract subscribers rely on', () => {
    const seen = [];
    const unsubscribe = AC.micLevelMonitor.subscribe((detail) => seen.push(detail.value));
    const events = [];
    const onEvent = (e) => events.push(e.detail.value);
    window.addEventListener('alloflow:mic-level', onEvent);
    AC.micLevelMonitor._publish(0.42);
    window.removeEventListener('alloflow:mic-level', onEvent);
    unsubscribe();
    expect(seen).toEqual([0.42]);
    expect(events).toEqual([0.42]);
    expect(window.__alloMicLevel.value).toBe(0.42);
  });

  it('reuses a stream the caller already owns instead of opening a second capture', () => {
    // The on-device Whisper engine already holds the microphone. Handing that
    // stream in must not trigger getUserMedia, or the user gets two recording
    // indicators for one microphone.
    const original = navigator.mediaDevices;
    const getUserMedia = vi.fn(() => Promise.resolve({ getTracks: () => [] }));
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true });
    try {
      const release = AC.micLevelMonitor.acquire({ stream: { getTracks: () => [] } });
      expect(getUserMedia).not.toHaveBeenCalled();
      release();
    } finally {
      if (original === undefined) delete navigator.mediaDevices;
      else Object.defineProperty(navigator, 'mediaDevices', { value: original, configurable: true });
    }
  });

  it('renders the meter outside the hover-only satellite ring', () => {
    // The satellites are opacity-0 until hover on a fine pointer. A meter you
    // have to hover to see cannot tell you the mic is picking you up.
    const ring = botSource.slice(botSource.indexOf('<LandingDust active='), botSource.indexOf('{!isDragging && !isPoofing && !isSleeping && ('));
    expect(ring).toContain('<AlloMicMeter active={!!isListening && !isPoofing}');
    expect(ring).toContain('theme={theme}');
    expect(botSource).toContain('const AlloMicMeter = React.memo(');
    expect(botSource).toContain('const ALLOBOT_MIC_METER_CSS');
    expect(botSource).toContain('data-allo-mic-theme={theme}');
    expect(botSource).toContain('data-allo-mic-placement={placement}');
    expect(botSource).toContain("data-allo-mic-motion={motionDisabled ? 'static' : 'animated'}");
    expect(botSource).toContain('.allobot-mic-meter[data-allo-mic-theme="contrast"]');
    // Instantaneous loudness is noise to a screen reader; A5 carries the state.
    expect(botSource).toMatch(/aria-hidden="true"\s*\n\s*data-allo-mic-meter="true"/);
  });
});

describe('A5 — recording state is labelled, announced, and not colour-only', () => {
  it('marks the mic control as a real toggle with a state-specific name', () => {
    const mic = botSource.slice(botSource.indexOf('data-help-key="bot_mic_btn"'), botSource.indexOf('{isSleeping && ('));
    expect(mic).toContain("aria-pressed={isListening ? 'true' : 'false'}");
    expect(mic).toContain("aria-label={isListening ? t('bot.mic_stop_aria') : t('bot.mic_start_aria')}");
    // Non-colour cues: the icon swaps Mic/MicOff and a focus-independent ring
    // marks the live state for anyone who cannot separate red from white.
    expect(mic).toContain('<Mic size={satelliteIconSize}');
    expect(mic).toContain('<MicOff size={satelliteIconSize}');
    expect(mic).toContain('ring-2 ring-offset-1 ring-red-500');
  });

  it('announces the change through the app announcer, not a component-local one', () => {
    // The documented failure mode here is a component defining its own
    // announcer that only writes to local state, so nothing is ever spoken.
    // window.alloAnnounce owns the real #allo-live-polite region.
    const block = botSource.slice(botSource.indexOf('const micStateAnnouncedRef = useRef(null);'), botSource.indexOf('const idleBusyRef = useRef(false);'));
    expect(block).toContain('window.alloAnnounce(message, \'polite\')');
    expect(block).toContain("t('bot.mic_live_announce')");
    expect(block).toContain("t('bot.mic_off_announce')");
    // The resting state on mount is not worth announcing.
    expect(block).toContain('if (micStateAnnouncedRef.current === null)');
  });

  it('keeps the app announcer real: window.alloAnnounce is defined by the host', () => {
    const app = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf-8');
    expect(app).toContain('window.alloAnnounce = alloAnnounce;');
    expect(app).toContain("const id = (priority === 'assertive') ? 'allo-live-assertive' : 'allo-live-polite';");
  });
});

// Real render, not a source grep. React lives under desktop/web-app/node_modules
// (same place dev-tools/check_module_render.cjs finds it). SSR runs the render
// phase only, so the subscribe effect never fires and the level stays at rest;
// what this proves is that the component mounts, emits the bars, and carries the
// aria contract. The live level is covered by the monitor tests above.
describe('A4 — AlloMicMeter renders (SSR)', () => {
  it('emits five bars, none lit at rest, and hides itself from assistive tech', async () => {
    const path = await import('node:path');
    const modulesDir = path.resolve(process.cwd(), 'desktop/web-app', 'node_modules');
    let React2, RDS;
    try {
      const { createRequire } = await import('node:module');
      const req = createRequire(import.meta.url);
      React2 = req(path.join(modulesDir, 'react'));
      RDS = req(path.join(modulesDir, 'react-dom', 'server'));
    } catch (e) {
      // Matches check_module_render's posture: skip loudly rather than fail.
      console.warn('[L7] SSR render check SKIPPED — React not found at ' + modulesDir);
      return;
    }
    const prevReact = window.React;
    const prevRegistry = window.AlloModules;
    window.React = React2;
    globalThis.React = React2;
    window.AlloModules = {};
    try {
      const { readFileSync: read } = await import('node:fs');
      const src = read(path.resolve(process.cwd(), 'allobot_module.js'), 'utf-8');
      // eslint-disable-next-line no-new-func
      new Function('window', 'document', 'navigator', 'React', src)(window, window.document, window.navigator, React2);
      const Meter = window.AlloModules.AlloMicMeter;
      expect(Meter, 'AlloMicMeter must be exported for the voice pill to reuse it').toBeTruthy();

      const html = RDS.renderToStaticMarkup(React2.createElement(Meter, { active: true, motionDisabled: true }));
      expect(html).toContain('data-allo-mic-meter="true"');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('data-allo-mic-level="0"');
      expect(html).toContain('data-allobot-mic-meter-styles="true"');
      expect(html).toContain('data-allo-mic-placement="below"');
      expect(html).toContain('data-allo-mic-theme="light"');
      expect(html).toContain('data-allo-mic-motion="static"');
      expect((html.match(/<span/g) || []).length).toBe(5);
      expect((html.match(/data-allo-mic-bar-state="off"/g) || []).length).toBe(5);
      // At rest every bar is the dim track colour, so a still meter cannot be
      // misread as "loud".
      expect(html).not.toContain('bg-emerald-300');

      // Inactive renders nothing at all rather than an empty shell.
      expect(RDS.renderToStaticMarkup(React2.createElement(Meter, { active: false }))).toBe('');

      // The inline placement the voice pill uses must drop the absolute
      // positioning, or the meter lands under the pill instead of inside it.
      const inline = RDS.renderToStaticMarkup(React2.createElement(Meter, { active: true, placement: 'inline' }));
      expect(inline).toContain('data-allo-mic-placement="inline"');
      expect(inline).toContain('class="allobot-mic-meter"');

      const contrast = RDS.renderToStaticMarkup(React2.createElement(Meter, { active: true, theme: 'contrast' }));
      expect(contrast).toContain('data-allo-mic-theme="contrast"');
    } finally {
      window.React = prevReact;
      window.AlloModules = prevRegistry;
    }
  });
});
