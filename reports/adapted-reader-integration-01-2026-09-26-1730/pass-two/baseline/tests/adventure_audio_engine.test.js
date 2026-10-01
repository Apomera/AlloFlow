import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('adventure_source.jsx', 'utf8');
const moduleCode = fs.readFileSync('adventure_module.js', 'utf8');
const sessionSource = fs.readFileSync('adventure_session_handlers_source.jsx', 'utf8');
const handlerSource = fs.readFileSync('adventure_handlers_source.jsx', 'utf8');

const engineStart = source.indexOf('// Shared Adventure mixer.');
const ambienceStart = source.indexOf('const AdventureAmbience = React.memo');
const diceStart = source.indexOf('const playDiceSound = () =>', ambienceStart);
const engineSource = source.slice(engineStart, ambienceStart);
const ambienceSource = source.slice(ambienceStart, diceStart);
const viewSource = fs.readFileSync('view_adventure_source.jsx', 'utf8');

const bufferHelpersStart = engineSource.indexOf('const createAdventureAudioRng =');
const voiceBudgetStart = engineSource.indexOf('const createAdventureVoiceBudget =');
const lifecycleStart = engineSource.indexOf('const isAdventureAudioDocumentHidden =');
const bufferHelpersSource = engineSource.slice(bufferHelpersStart, voiceBudgetStart);
const voiceBudgetSource = engineSource.slice(voiceBudgetStart, lifecycleStart);
const clampAudioForTest = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value) || 0));
const audioBufferHelpers = new Function('clampAdventureAudio', `${bufferHelpersSource}; return { createAdventureNoiseBuffer, createAdventureReverb };`)(clampAudioForTest);
const audioThemeHelpers = new Function('clampAdventureAudio', `${bufferHelpersSource}\n${voiceBudgetSource}; return { createAdventureThemeProfile, createAdventureThemeState, createAdventureMixFocus };`)(clampAudioForTest);
const createVoiceBudgetForTest = new Function(`${voiceBudgetSource}; return createAdventureVoiceBudget;`)();

describe('Adventure dynamic audio engine', () => {
  it('routes ambience and effects through a compressed shared mixer', () => {
    expect(engineSource).toContain('ctx.createDynamicsCompressor()');
    expect(engineSource).toContain('ambienceBus.connect(masterGain)');
    expect(engineSource).toContain('sfxBus.connect(masterGain)');
    expect(engineSource).toContain('masterGain.connect(compressor)');
    expect(engineSource).toContain('compressor.connect(ctx.destination)');
  });

  it('obeys global mute and ducks ambience during narration', () => {
    expect(engineSource).toContain("window.addEventListener('alloflow-mute-changed'");
    expect(engineSource).toContain("window.addEventListener('allo-speech-state'");
    expect(engineSource).toContain('if (!enabled || documentHidden || isGlobalMuted()) return false');
    expect(engineSource).toMatch(/speechActive \? 0\.24 : 1/);
    expect(engineSource).toMatch(/speechActive \? 0\.42 : 1/);
    expect(engineSource).toContain("document.addEventListener('visibilitychange'");
    expect(engineSource).toContain('documentHidden || isGlobalMuted()');
    expect(ambienceSource).toContain('engine.setEnabled(false)');
    expect(ambienceSource).toContain('engine.setEnabled(true)');
  });

  // ── CONTRACT FLIP (2026-08-23, Aaron's classroom feedback) ────────────────────────────────
  // The previous test here pinned CONTINUOUS ambience ("keeps ambience alive ... instead of
  // auto-killing"). Field use showed the opposite need: the bed read as "a drone that never
  // stops", and students need silence to focus on the text/TTS. The contract is now scene
  // BOOKENDS - swell in, hold ~7s, fade to silence; the next scene's swell closes the previous
  // one. If someone re-pins continuous ambience, they are reverting a deliberate product
  // decision by the maintainer, not fixing a bug.
  it('plays a scene-intro bookend that fades to silence instead of a perpetual bed', () => {
    // The constants are declared just above the component (engine side of the slice).
    expect(source).toContain('ADVENTURE_AMBIENCE_INTRO_HOLD_MS = 7000');
    expect(source).toContain('ADVENTURE_AMBIENCE_OUTRO_FADE_S = 3.5');
    expect(ambienceSource).toContain('autoStopMs: ADVENTURE_AMBIENCE_INTRO_HOLD_MS + ADVENTURE_AMBIENCE_OUTRO_FADE_S * 1000 + 4000');
    expect(ambienceSource).toContain('engine.stopAmbience(ADVENTURE_AMBIENCE_OUTRO_FADE_S)');
    // Same-scene re-renders (state churn recreates soundParams identity) must not restart the
    // bookend - mid-scene silence is the point.
    expect(ambienceSource).toContain('if (lastSceneRef.current === sceneText) return;');
    // Scene TRANSITIONS still crossfade rather than hard-cutting.
    expect(engineSource).toContain('if (oldLayer) stopLayer(oldLayer, 1.8)');
    expect(engineSource).toContain("join(':')");
  });

  it('TTS starting during the intro cuts the ambience short - speech always wins', () => {
    const at = ambienceSource.indexOf("window.addEventListener('allo-speech-state', onSpeech);");
    expect(at).toBeGreaterThan(-1);
    expect(ambienceSource).toContain('if (!event?.detail?.isPlaying) return;');
    expect(ambienceSource).toContain('engineRef.current.stopAmbience(1.3);');
    expect(ambienceSource).toContain("window.removeEventListener('allo-speech-state', onSpeech);");
  });

  it('positive cues resolve on the fixed reward tonic, never the scene scale (2026-08-23, Aaron)', () => {
    // A success in a tense scene used to ring out on a low semitone-cluster root. Reinforcement
    // cues are now one consistent bright key with pure ratios, ending ON the tonic.
    expect(engineSource).toContain('const ADVENTURE_REWARD_TONIC = 523.25;');
    const successCase = engineSource.slice(engineSource.indexOf("case 'success': {"), engineSource.indexOf("case 'failure': {"));
    expect(successCase).toContain('ADVENTURE_REWARD_TONIC');
    expect(successCase).not.toContain('eventRoot');
    const critCase = engineSource.slice(engineSource.indexOf("case 'critical_success': {"), engineSource.indexOf("case 'success': {"));
    expect(critCase).toContain('ADVENTURE_REWARD_TONIC');
    expect(critCase).toContain('15 / 16'); // the leading tone - what makes the landing feel earned
    expect(critCase).not.toContain('eventRoot');
    const itemCase = engineSource.slice(engineSource.indexOf("case 'item_get': {"), engineSource.indexOf("case 'decision_select':"));
    expect(itemCase).toContain('ADVENTURE_REWARD_TONIC * 2');
    expect(itemCase).not.toContain('eventRoot');
    // Failure and damage deliberately KEEP the scene's darker language.
    const failCase = engineSource.slice(engineSource.indexOf("case 'failure': {"), engineSource.indexOf("case 'damage':"));
    expect(failCase).toContain("getAdventureEventRoot(sceneProfile, variation, 'failure'");
  });

  it('the dead legacy cue function stays deleted, and the Sound Lab can audition the big win', () => {
    // playAdventureEventSoundLegacy had its own success/failure recipes with no caller - a trap
    // for future sessions editing the wrong function.
    expect(source).not.toContain('const playAdventureEventSoundLegacy');
    expect(source).toContain("['critical_success', 'Big win']");
    expect(source).toContain("'adventure.audio_ambience_hint'");
  });

  it('the ENGINE enforces a declared layer lifetime, so a leaked caller cannot leave a drone running', () => {
    // The field failure: a drone "kept going perpetually". The layer now owns its own bound.
    expect(engineSource).toContain('const autoStopMs = Number(options.autoStopMs);');
    expect(engineSource).toContain('layer.autoStopTimer = setTimeout(');
    // stopLayer clears the watchdog (no timer firing on an already-stopped layer)...
    expect(engineSource).toContain('if (layer.autoStopTimer) { clearTimeout(layer.autoStopTimer); layer.autoStopTimer = null; }');
    // ...and a same-signature re-play refreshes the bound instead of escaping it.
    expect(engineSource).toContain('const refreshMs = Number(options.autoStopMs);');
  });

  it('adds semantic intensity and motion while preserving old atmosphere and element fields', () => {
    expect(engineSource).toContain('safe.atmosphere || safe.mood');
    expect(engineSource).toContain('safe.element || safe.environment');
    expect(engineSource).toContain('safe.motion || safe.pacing');
    expect(engineSource).toContain('safe.space || safe.acousticSpace || safe.room');
    expect(engineSource).toContain('acousticSpace');
    expect(engineSource).toContain('safe.intensity');
    expect((handlerSource.match(/"intensity": "Number from 0\.0/g) || []).length).toBe(7);
    expect((handlerSource.match(/"motion": "One of: Still/g) || []).length).toBe(7);
    expect((handlerSource.match(/"space": "One of: Open, Room, Cave, Void/g) || []).length).toBe(7);
    expect((handlerSource.match(/Rain, Ocean, Cave, City, Space, Laboratory, Crowd/g) || []).length).toBe(7);
    expect(engineSource).toContain("profile.element === 'space'");
    expect(engineSource).toContain("profile.element === 'cave'");
  });

  it('persists independent mix levels and offers a sensory-safe gentle mode', () => {
    expect(engineSource).toContain("ADVENTURE_AUDIO_PREFS_KEY = 'alloflow-adventure-audio-v1'");
    expect(engineSource).toContain('window.localStorage.setItem(ADVENTURE_AUDIO_PREFS_KEY');
    expect(engineSource).toContain('preferences.ambience');
    expect(engineSource).toContain('preferences.effects');
    expect(engineSource).toContain("preferences.gentle ? 'gentle' : 'full'");
    expect(engineSource).toContain("lfo.type = gentle ? 'sine' : 'square'");
  });

  it('adds coherent procedural texture without importing samples', () => {
    expect(engineSource).toContain('createAdventureAudioRng');
    expect(engineSource).toContain('createAdventureReverb');
    expect(engineSource).toContain('const reverbSpace =');
    expect(engineSource).toContain('const spaceColoration =');
    expect(engineSource).toContain('const ambienceSwell = ctx.createOscillator()');
    expect(engineSource).toContain('ambienceSwellDepth.connect(textureDest.gain)');
    expect(engineSource).toContain('spaceLfo.connect(spaceDepth)');
    expect(engineSource).toContain('textureDest.connect(spaceFilter)');
    expect(engineSource).toContain('const playNoiseDetail =');
    expect(engineSource).toContain('createAdventureNoiseBuffer(ctx, duration + 0.05,');
    expect(engineSource).toContain("profile.element === 'rain' && rng()");
    expect(engineSource).toContain('const maxTransientCount = gentle ? 4 : 10');
    expect(engineSource).toContain('const claimTransient =');
    expect(engineSource).toContain('releaseTransient');
    expect(engineSource).toContain('ctx.createConvolver()');
    expect(engineSource).toContain('panner.pan.linearRampToValueAtTime');
    expect(engineSource).toContain('const motifScales =');
    expect(engineSource).toContain('timers.push(setInterval');
    expect(engineSource).toContain('rawMotionFactor');
    expect(engineSource).toContain('const cadence = milliseconds');
    expect(engineSource).toContain("profile.element === 'fire'");
    expect(engineSource).toContain("profile.element === 'wind'");
  });

  it('reuses generated buffers and shares a priority-aware transient budget', () => {
    expect(engineSource).toContain('const adventureAudioBufferCaches = new WeakMap()');
    expect(engineSource).toContain('const getAdventureCachedBuffer =');
    expect(engineSource).toContain("getAdventureCachedBuffer(ctx, 'noise'");
    expect(engineSource).toContain("getAdventureCachedBuffer(ctx, 'reverb'");
    expect(engineSource).toContain('const createAdventureVoiceBudget =');
    expect(engineSource).toContain('reserves: { detail: 8, event: 5, critical: 0 }');
    expect(engineSource).toContain('maxVoices: () => preferences.gentle ? 12 : 24');
    expect(engineSource).toContain('voiceBudget\n            })');
    expect(engineSource).toContain('const eventPriority =');
    expect(engineSource).toContain('engine.claimVoice(eventPriority)');
    expect(engineSource).toContain('engine.releaseVoice(voiceToken)');
    expect(engineSource).toContain('source.onended = cleanup');
    expect(source).toContain("engine.claimVoice(index < 2 ? 'event' : 'detail')");
    expect(source).toContain('createAdventureNoiseBuffer(ctx, 0.1, index)');
  });

  it('reuses immutable noise and reverb buffers by context and variation', () => {
    let createBufferCalls = 0;
    const fakeCtx = {
      sampleRate: 8000,
      createBuffer: (channels, length, sampleRate) => {
        createBufferCalls += 1;
        const channelData = Array.from({ length: channels }, () => new Float32Array(length));
        return { numberOfChannels: channels, length, sampleRate, getChannelData: channel => channelData[channel] };
      },
      createConvolver: () => ({ buffer: null })
    };
    const firstNoise = audioBufferHelpers.createAdventureNoiseBuffer(fakeCtx, 0.11, 1);
    const repeatedNoise = audioBufferHelpers.createAdventureNoiseBuffer(fakeCtx, 0.11, 1);
    const alternateNoise = audioBufferHelpers.createAdventureNoiseBuffer(fakeCtx, 0.11, 2);
    const firstReverb = audioBufferHelpers.createAdventureReverb(fakeCtx, 1.05, 2.4);
    const repeatedReverb = audioBufferHelpers.createAdventureReverb(fakeCtx, 1.05, 2.4);
    expect(repeatedNoise).toBe(firstNoise);
    expect(alternateNoise).not.toBe(firstNoise);
    expect(repeatedReverb).not.toBe(firstReverb);
    expect(repeatedReverb.buffer).toBe(firstReverb.buffer);
    expect(createBufferCalls).toBe(3);
  });

  it('reserves shared voice capacity by priority and releases tokens once', () => {
    const budget = createVoiceBudgetForTest({
      maxVoices: 12,
      reserves: { detail: 8, event: 5, critical: 0 }
    });
    const details = Array.from({ length: 5 }, () => budget.claim('detail'));
    expect(details.filter(Boolean)).toHaveLength(4);
    const events = Array.from({ length: 4 }, () => budget.claim('event'));
    expect(events.filter(Boolean)).toHaveLength(3);
    const critical = Array.from({ length: 6 }, () => budget.claim('critical'));
    expect(critical.filter(Boolean)).toHaveLength(5);
    expect(budget.snapshot()).toEqual({
      active: 12,
      max: 12,
      byPriority: { detail: 4, event: 3, critical: 5 }
    });
    budget.release(details[0]);
    budget.release(details[0]);
    expect(budget.snapshot().active).toBe(11);
  });

  it('keeps a deterministic theme cursor across scene reharmonizations', () => {
    const first = audioThemeHelpers.createAdventureThemeProfile('the-same-adventure');
    const repeated = audioThemeHelpers.createAdventureThemeProfile('the-same-adventure');
    const different = audioThemeHelpers.createAdventureThemeProfile('another-adventure');
    expect(repeated).toEqual(first);
    expect(different.key).not.toBe(first.key);
    const state = audioThemeHelpers.createAdventureThemeState();
    expect(Array.from({ length: 6 }, () => state.next(first.key, first.contour.length))).toEqual([0, 1, 2, 3, 0, 1]);
    expect(state.next(different.key, different.contour.length)).toBe(0);
    expect(engineSource).toContain('const themeIndex = themeState.next');
    expect(engineSource).toContain('const degree = themeProfile.contour[themeIndex] % motifScale.length');
    expect(engineSource).toContain("getAdventureEventRoot(sceneProfile, variation, 'scene', themeProfile)");
    expect(viewSource).toContain("? 'session:' + String(activeSessionCode)");
    expect(viewSource).toContain('themeSeed={adventureThemeSeed}');
  });

  it('ducks ambience for overlapping important cues and restores it safely', () => {
    const focus = audioThemeHelpers.createAdventureMixFocus();
    expect(focus.add('detail')).toBeNull();
    const event = focus.add('event', false);
    expect(focus.snapshot()).toEqual({ active: 1, multiplier: 0.7 });
    const critical = focus.add('critical', false);
    expect(focus.snapshot()).toEqual({ active: 2, multiplier: 0.45 });
    focus.release(critical);
    focus.release(critical);
    expect(focus.snapshot()).toEqual({ active: 1, multiplier: 0.7 });
    focus.release(event);
    expect(focus.snapshot()).toEqual({ active: 0, multiplier: 1 });
    const gentleCritical = focus.add('critical', true);
    expect(focus.snapshot().multiplier).toBe(0.6);
    focus.release(gentleCritical);
    expect(engineSource).toContain('const getAmbienceBusLevel =');
    expect(engineSource).toContain('mixFocus.multiplier()');
    expect(engineSource).toContain('engine.focusEvent(eventPriority, focusDuration)');
    expect(source).toContain("engine.focusEvent('event', 850)");
  });

  it('renders accessible Adventure-specific sound controls in the toolbar', () => {
    expect(ambienceSource).toContain('const AdventureAudioControls = React.memo');
    expect(ambienceSource).toContain('type="range"');
    expect(ambienceSource).toContain('type="checkbox"');
    expect(ambienceSource).toContain('Gentle sound mode');
    expect(ambienceSource).toContain('Reset sound settings');
    expect(ambienceSource).toContain("window.addEventListener('storage'");
    expect(viewSource).toContain('<AdventureAudioControls soundEnabled={soundEnabled} t={t} />');
  });

  it('varies event cues, rate-limits duplicates and routes dice through the effects bus', () => {
    expect(engineSource).toContain('Math.floor(Math.random() * 3)');
    expect(engineSource).toContain("type === 'transition' ? 500");
    expect(engineSource).toContain('getSceneProfile');
    expect(engineSource).toContain('ADVENTURE_EVENT_SCALES');
    expect(engineSource).toContain('ADVENTURE_EVENT_ELEMENT_BANDS');
    expect(engineSource).toContain('getAdventureEventRoot');
    expect(engineSource).toContain('const eventSpaceLift =');
    expect(engineSource).toContain('const playSceneAccent =');
    expect(source).toContain("engine.canPlayEvent('dice', 250)");
    expect(source).toContain('const destination = engine.getSfxBus()');
    expect(source).toContain('gain.connect(destination)');
  });

  it('retains one explicit transition cue in the normal resolved-turn path', () => {
    expect((sessionSource.match(/playAdventureEventSound\('transition'\)/g) || []).length).toBe(1);
  });

  it('build output contains the same mixer and lifecycle contract', () => {
    expect(moduleCode).toContain('createDynamicsCompressor');
    expect(moduleCode).toMatch(/addEventListener\(["']allo-speech-state["']/);
    expect(moduleCode).toContain('playAmbience(soundParams');
    expect(moduleCode).toContain('stopLayer(oldLayer, 1.8)');
    expect(moduleCode).toContain('AdventureAudioControls');
  });

  it('does not fetch or instantiate third-party sample audio in the new engine', () => {
    expect(engineSource).not.toMatch(/\bfetch\s*\(/);
    expect(engineSource).not.toMatch(/new Audio\s*\(/);
  });
});
