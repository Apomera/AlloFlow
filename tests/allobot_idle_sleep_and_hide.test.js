import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

// The project has no React dependency, so AlloBot cannot be mounted and driven
// here — these are structural gates over the source and the two generated
// copies. They are written to fail on the specific regressions that produced
// the reported behaviour, not to restate the code.
const source = fs.readFileSync('allobot_source.jsx', 'utf8');
const moduleSource = fs.readFileSync('allobot_module.js', 'utf8');
const publicModule = fs.readFileSync('desktop/web-app/public/allobot_module.js', 'utf8');
const app = fs.readFileSync('AlloFlowANTI.txt', 'utf8');
const APP_COPIES = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
].map((path) => [path, fs.readFileSync(path, 'utf8')]);

describe('AlloBot idle sleep', () => {
  it('refuses to speak while asleep, and does not wake itself to do it', () => {
    // speak() used to clear isSleeping on every utterance, so a tip fired by
    // the 5-minute inactivity fallback would wake the bot and narrate to an
    // empty room. The guard has to come before any audio work.
    const speakStart = source.indexOf('const speak = useCallback(');
    const speakGuard = source.indexOf('if (isSleepingRef.current) {', speakStart);
    const firstAudio = source.indexOf('currentAudioRef.current.pause()', speakStart);
    expect(speakStart).toBeGreaterThan(0);
    expect(speakGuard).toBeGreaterThan(speakStart);
    expect(speakGuard).toBeLessThan(firstAudio);
    // Nothing in speak() may clear the sleep flag.
    const speakBody = source.slice(speakStart, source.indexOf('const handleTypingState', speakStart));
    expect(speakBody).not.toContain('setIsSleeping(false)');
  });

  it('reads the live sleep flag rather than a captured copy', () => {
    // speak is a useCallback; a captured `isSleeping` would freeze at "awake"
    // and the suppression above would never fire.
    expect(source).toContain('const isSleepingRef = useRef(false);');
    expect(source).toContain('useEffect(() => { isSleepingRef.current = isSleeping; }, [isSleeping]);');
  });

  it('writes the ref before the state when waking', () => {
    // summon() wakes and speaks in the same tick. The ref-sync effect has not
    // run at that point, so waking via setState alone would leave speak()
    // reading "still asleep" and silence the greeting it just triggered.
    const wake = source.slice(source.indexOf('const wake = useCallback('), source.indexOf('const summon = useCallback('));
    expect(wake.indexOf('isSleepingRef.current = false;')).toBeLessThan(wake.indexOf('setIsSleeping(false);'));
  });

  it('silences audio already in flight when it falls asleep', () => {
    const silence = source.slice(source.indexOf('const silenceSpeech = useCallback('), source.indexOf('const fallAsleep = useCallback('));
    expect(silence).toContain('speechRequestAbortRef.current?.abort()');
    expect(silence).toContain('currentAudioRef.current.pause()');
    // Scoped, not global (L7/A3): cancelOwnedBrowserSpeech(true) only calls
    // speechSynthesis.cancel() when AlloBot itself owns the current utterance.
    // The bare global call used to take Read This Page and the voice loop down
    // with it, which is what made "hide the bot" read as "turn off TTS".
    expect(silence).toContain('speechGenerationRef.current += 1;');
    expect(silence).toContain('cancelOwnedBrowserSpeech(true)');
    expect(silence).toContain('releaseAlloBotAudioUrl(lastAudioUrlRef.current)');
    const fall = source.slice(source.indexOf('const fallAsleep = useCallback('), source.indexOf('// The corner "X"'));
    expect(fall).toContain('isSleepingRef.current = true;');
    expect(fall).toContain('silenceSpeech();');
  });

  it('stops audio when the bot is unmounted mid-sentence', () => {
    // Hiding the bot drops the component; a detached <audio> keeps playing.
    const marker = source.indexOf('// Hiding the bot unmounts');
    const cleanup = source.slice(marker, source.indexOf('const latestPositionRef', marker));
    expect(marker).toBeGreaterThan(-1);
    expect(cleanup).toContain('speechGenerationRef.current += 1;');
    expect(cleanup).toContain('currentAudioRef.current.pause()');
    expect(cleanup).toContain('cancelOwnedBrowserSpeech(true)');
  });

  it('owns and tears down every flight Web Audio node', () => {
    for (const copy of [source, moduleSource, publicModule]) {
      expect(copy).toMatch(/const isFlightActive\s*=\s*!motionDisabled\s*&&\s*!isSleeping\s*&&\s*!isDocumentHidden/);
    }
    const flight = source.slice(
      source.indexOf('const flightAudioNodesRef = useRef(null);'),
      source.indexOf('const movementTimersRef = useRef([]);'),
    );
    expect(flight).toContain('flightAudioNodesRef.current = null;');
    expect(flight).toContain('nodes.noise?.stop?.(0)');
    expect(flight).toContain('nodes.osc?.stop?.(0)');
    expect(flight).toContain('node?.disconnect?.()');
    expect(flight).toContain('flightAudioNodesRef.current = { noise, noiseFilter, noiseGain, osc, oscGain };');
    expect(flight).toContain('return stopFlightAudio;');
    expect(flight).toContain('[isFlightActive, soundEnabled, isDocumentHidden, stopFlightAudio]');
    const mute = source.slice(source.indexOf('const handleGlobalMute ='), source.indexOf('const fallAsleep = useCallback('));
    expect(mute).toContain('silenceSpeech();');
    expect(mute).toContain('stopFlightAudio();');
  });

  it('naps after three idle minutes and treats work in progress as activity', () => {
    expect(source).toContain('idleSleepMs = 180000');
    const effect = source.slice(source.indexOf('const idleBusyRef = useRef(false);'), source.indexOf('React.useImperativeHandle'));
    // A long generation must not put the bot under mid-answer and swallow it.
    expect(effect).toContain("effectiveMood === 'thinking'");
    expect(effect).toContain('isTalking || isDragging || isListening || isSystemAudioActive');
    expect(effect).toContain('if (idleBusyRef.current) { lastInput = Date.now(); return; }');
    expect(effect).toContain('if (Date.now() - lastInput >= idleSleepMs) fallAsleep();');
    // Real input wakes it quietly — no greeting, no reposition.
    expect(effect).toContain('if (isSleepingRef.current) wake();');
    for (const evt of ['pointerdown', 'keydown', 'touchstart', 'scroll', 'wheel']) {
      expect(effect).toContain(`'${evt}'`);
    }
    // Every listener and the interval must be torn down.
    expect(effect).toContain('clearInterval(timer)');
    expect(effect).toContain('window.removeEventListener(evt, onInput)');
  });

  it('leaves the bot where the user put it when it wakes', () => {
    // Sleep is automatic now; snapping home on every wake would keep stealing a
    // dragged position.
    const summon = source.slice(source.indexOf('const summon = useCallback('), source.indexOf('const fallAsleep = useCallback('));
    expect(summon).not.toContain('setPosition(');
  });
});

describe('AlloBot dismissal', () => {
  it('hides the bot outright from the corner control when the host can', () => {
    const handler = source.slice(source.indexOf('const handleSleep = (e) =>'), source.indexOf('// ── Idle auto-sleep'));
    expect(handler).toContain('if (onHide) {');
    // Silence first, then unmount — otherwise the clip outlives the component.
    expect(handler.indexOf('silenceSpeech();')).toBeLessThan(handler.indexOf('onHide();'));
    // Dismissal must not flip isSleeping on the way out: the sleep cap and the
    // greyed-out styling would show for the 400ms of the puff, so a bot being
    // dismissed would visibly doze off before vanishing.
    const hidePath = handler
      .slice(handler.indexOf('if (onHide) {'), handler.indexOf('if (motionDisabled) {', handler.indexOf('if (onHide) {')))
      .split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
    expect(hidePath).not.toContain('fallAsleep(');
    // Without a host handler it still degrades to the old minimise behaviour.
    expect(handler).toContain('fallAsleep();');
  });

  it('labels the control as Hide, reusing an already translated key', () => {
    // toolbar.hide_bot ships in all 64 language packs; a new key would not.
    expect(source).toContain("onHide ? t('toolbar.hide_bot') : t('bot.sleep_title')");
    expect(source).toContain("onHide ? t('toolbar.hide_bot') : t('bot.sleep_aria')");
    const strings = fs.readFileSync('ui_strings.js', 'utf8');
    expect(strings).toContain('"hide_bot"');
  });

  it('is wired through the host, with focus handed to the way back', () => {
    for (const [path, text] of APP_COPIES) {
      expect(text, path).toContain('onHide={handleHideBot}');
      expect(text, path).toContain('const handleHideBot = React.useCallback(');
      expect(text, path).toContain('setIsBotVisible(false);');
      // Unmounting drops focus to <body>; send it to the header toggle instead.
      expect(text, path).toContain('[data-help-key="header_bot_toggle"]');
    }
    expect(app).toContain('onHide={handleHideBot}');
  });
});

describe('AlloBot orbit controls on touch', () => {
  it('resolves the pointer type instead of relying on a hover variant alone', () => {
    expect(source).toContain("const QUERY = '(hover: none), (pointer: coarse), (any-pointer: coarse)';");
    expect(source).toContain('const coarsePointer = useAlloCoarsePointer();');
  });

  it('pushes the controls apart far enough not to overlap at touch size', () => {
    // Four 36px targets around a 64px avatar: at a -10px offset the top pair
    // spans y -10..26 and the bottom pair 38..74, so they clear each other.
    const pos = source.slice(source.indexOf('const satellitePos = {'), source.indexOf('const stopTouch'));
    for (const corner of ['tl', 'tr', 'bl', 'br']) {
      expect(pos).toContain(`${corner}: coarsePointer ?`);
      expect(pos).toContain('-2.5');
    }
  });
});

describe('AlloBot generated copies', () => {
  it('carries the sleep and touch changes into both built modules', () => {
    for (const built of [moduleSource, publicModule]) {
      expect(built).toContain('isSleepingRef.current = true;');
      expect(built).toContain('idleSleepMs = 18e4');
      expect(built).toContain('onTouchStart: stopTouch');
      expect(built).toContain('onHide');
    }
    expect(publicModule).toBe(moduleSource);
  });
});
