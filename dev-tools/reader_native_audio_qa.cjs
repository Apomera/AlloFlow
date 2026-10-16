#!/usr/bin/env node
'use strict';

// Local player integration only. Providers are replaced at callTTS; host and
// content-engine stop functions and PhaseK playback execute unchanged.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const requireHere = createRequire(path.join(root, 'package.json'));
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const files = ['AlloFlowANTI.txt', 'content_engine_module.js', 'phase_k_helpers_source.jsx'];
const sources = Object.fromEntries(files.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]));
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const sourceHashes = Object.fromEntries(files.map(file => [file, digest(sources[file])]));

function between(source, start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first + start.length);
  assert.ok(first >= 0 && last > first && source.indexOf(start, first + 1) < 0, 'Source anchor requires review: ' + start);
  return source.slice(first, last);
}

const hostStop = between(sources['AlloFlowANTI.txt'], "  function stopPlayback(reason = 'manual'", '  const togglePause = useCallback');
const hostSpeak = between(sources['AlloFlowANTI.txt'], '  const handleSpeak = async (text, contentId, startIndex = 0, forceRestart = false, languageOverride = null)', '  useEffect(() => {');
const engineStop = between(sources['content_engine_module.js'], '  const stopPlayback = () => {', '  var _wrap = function(fn)');
const phase = requireHere('esbuild').transformSync(sources['phase_k_helpers_source.jsx'], { loader: 'jsx', target: 'es2020' }).code;
const factories = `
window.makeEngineStop = function(env) {
  const { _s, setPlayingContentId, setPlaybackState, isPlayingRef, isSystemAudioActiveRef } = env;
  ${engineStop}
  return stopPlayback;
};
window.makeHostApi = function(env) {
  const { rtpReadingRef, rtpCurrentAudioRef, rtpPausedRef, stopReadThisPage,
    playbackSessionRef, playbackTimeoutRef, isPlayingRef, isSystemAudioActiveRef,
    setIsPlaying, setIsPaused, setPlayingContentId, setPlaybackState,
    _ceStopPlayback, _alloPhaseKHelpersDeps, _alloAwaitModules } = env;
  const playingContentId = env.playingContentId;
  ${hostStop}
  ${hostSpeak}
  return { stopPlayback, handleSpeak };
};`;

const fixture = String.raw`
const qa = window.nativeAudioQa = { requests: [], audios: [], speechEvents: [], errors: [], mode: 'immediate', sequence: 0 };
const noop = () => {};
const ref = value => ({ current: value });
const state = { isPlaying: false, isPaused: false, isGeneratingAudio: false, playingContentId: null };
const refs = {
  audioRef: ref(null), playbackSessionRef: ref(0), playbackTimeoutRef: ref(null),
  isPlayingRef: ref(false), isSystemAudioActiveRef: ref(false), lastHandleSpeakRef: ref(null),
  recognitionRef: ref(null), alloBotRef: ref(null), playbackRateRef: ref(1),
  persistentVoiceMapRef: ref({}), lastReadTurnRef: ref(null), audioBufferRef: ref({}),
  activeBlobUrlsRef: ref(new Set()), glossaryAudioCache: ref(new Map()),
  rtpReadingRef: ref(false), rtpCurrentAudioRef: ref(null), rtpPausedRef: ref(false)
};
const setters = Object.fromEntries(['IsPlaying', 'IsPaused', 'IsGeneratingAudio', 'PlayingContentId', 'PlaybackState'].map(name =>
  ['set' + name, value => { state[name[0].toLowerCase() + name.slice(1)] = value; }]));
const NativeAudio = window.Audio;
window.Audio = function(...values) {
  const audio = new NativeAudio(...values);
  const record = { audio, starts: 0, pauses: 0, ended: 0, errors: 0 };
  audio.addEventListener('playing', () => record.starts++);
  audio.addEventListener('pause', () => record.pauses++);
  audio.addEventListener('ended', () => record.ended++);
  audio.addEventListener('error', () => record.errors++);
  qa.audios.push(record);
  return audio;
};
window.Audio.prototype = NativeAudio.prototype;
const callTTS = (text, voice, speed, options) => {
  const request = { text, voice, speed, options, released: false };
  qa.requests.push(request);
  const url = '/tone.wav?request=' + qa.requests.length;
  if (qa.mode === 'immediate') return Promise.resolve(url);
  return new Promise(resolve => { request.resolve = () => { request.released = true; resolve(url); }; });
};
let api;
const deps = () => ({ ...refs, ...state, ...setters,
  selectedVoice: qa.voice || 'Kore', voiceSpeed: 1, voiceVolume: 0.05,
  currentUiLanguage: 'English', leveledTextLanguage: 'English',
  adventureState: {}, personaState: {}, _ttsState: {}, AVAILABLE_VOICES: ['Kore'],
  isCanvas: false, _isCanvasEnv: false, isMuted: false,
  t: key => key, warnLog: noop, debugLog: noop, setError: value => qa.errors.push(String(value)),
  addToast: noop, fetchTTSBytes: async () => null, getSideBySideContent: () => null,
  splitTextToSentences: text => [text], callTTS, stopPlayback: (...values) => host().stopPlayback(...values),
  addBlobUrl: url => refs.activeBlobUrlsRef.current.add(url),
  releaseBlob: url => refs.activeBlobUrlsRef.current.delete(url)
});
function host() {
  const engine = makeEngineStop({ ...refs, ...setters, _s: deps });
  return api = makeHostApi({ ...refs, ...state, ...setters,
    _ceStopPlayback: engine, _alloPhaseKHelpersDeps: deps, stopReadThisPage: noop,
    _alloAwaitModules: () => Promise.reject(new Error('Required fixture module missing'))
  });
}
qa.start = () => {
  const id = 'reading-native-fixture-section-0-instance-' + (++qa.sequence);
  qa.lastId = id;
  qa.lastPromise = host().handleSpeak('Plants collect light and water.', id, 0, true, 'English');
  qa.lastPromise.catch(error => qa.errors.push(String(error.message || error)));
};
qa.stop = () => host().stopPlayback();
qa.releasePending = () => { for (const request of qa.requests) if (request.resolve && !request.released) request.resolve(); };
qa.snapshot = () => ({ ...state, lastId: qa.lastId, requests: qa.requests.length,
  signals: qa.requests.map(entry => !!entry.options.signal?.aborted), errors: [...qa.errors],
  audios: qa.audios.map(entry => ({ starts: entry.starts, pauses: entry.pauses, ended: entry.ended,
    errors: entry.errors, currentTime: entry.audio.currentTime, paused: entry.audio.paused }))
});
qa.enableLocalSpeech = () => {
  const synthesis = window.speechSynthesis;
  const voice = synthesis?.getVoices().find(entry => entry.localService === true && /^en(?:-|$)/i.test(entry.lang));
  if (!voice) return null;
  const nativeSpeak = synthesis.speak.bind(synthesis);
  synthesis.speak = utterance => {
    if (!utterance.voice?.localService) throw new Error('Refusing non-local browser voice');
    utterance.addEventListener('start', () => qa.speechEvents.push({ type: 'start' }));
    utterance.addEventListener('end', () => qa.speechEvents.push({ type: 'end' }));
    utterance.addEventListener('error', event => qa.speechEvents.push({ type: 'error', error: event.error }));
    nativeSpeak(utterance);
  };
  qa.voice = voice.name;
  localStorage.setItem('alloflow_ai_config', JSON.stringify({ ttsProvider: 'browser', browserTtsFallback: false }));
  return { name: voice.name, language: voice.lang, localService: voice.localService };
};
localStorage.setItem('alloflow_ai_config', JSON.stringify({ ttsProvider: 'auto', browserTtsFallback: false }));
document.querySelector('#listen').addEventListener('click', qa.start);
document.querySelector('#stop').addEventListener('click', qa.stop);
`;

function makeTone() {
  const rate = 16000, samples = rate * 5, wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index++) {
    const envelope = Math.min(1, index / 400, (samples - index) / 400);
    wav.writeInt16LE(Math.round(2400 * envelope * Math.sin(index * 2 * Math.PI * 440 / rate)), 44 + index * 2);
  }
  return wav;
}

async function main() {
  const report = { status: 'running', sourceHashes,
    blockHashes: { hostStop: digest(hostStop), hostSpeak: digest(hostSpeak), engineStop: digest(engineStop) },
    checks: {}, localSpeech: { status: 'not-attempted' }, errors: [], externalRequests: [],
    limitations: ['Synthetic controls, not the SimplifiedView DOM or full application host.',
      'Actual host wrappers, content-engine stop and PhaseK source; minimal injected host state.',
      'Native HTMLAudio playback uses a generated local tone, not provider speech.',
      'No cloud synthesis, credentials, saved learner data, deployed assets or acoustic listening verified.'] };
  const wav = makeTone();
  const scripts = { '/phase.js': '(function(){\n' + phase + '\n})();', '/host.js': factories, '/fixture.js': fixture };
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    response.setHeader('Cache-Control', 'no-store');
    if (pathname === '/') {
      response.setHeader('Content-Type', 'text/html');
      response.end('<!doctype html><html lang="en"><meta charset="utf-8"><title>Local reader audio verification</title><button id="listen">Listen</button><button id="stop">Stop</button><script src="/phase.js"></script><script src="/host.js"></script><script src="/fixture.js"></script></html>');
    } else if (pathname === '/tone.wav') {
      response.setHeader('Content-Type', 'audio/wav'); response.end(wav);
    } else if (scripts[pathname]) {
      response.setHeader('Content-Type', 'text/javascript'); response.end(scripts[pathname]);
    } else { response.statusCode = 404; response.end(); }
  });
  let browser;
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const origin = 'http://127.0.0.1:' + server.address().port;
    const { chromium } = requireHere('playwright');
    browser = await chromium.launch({ channel: option('--browser', 'msedge'), headless: !args.includes('--headed') });
    report.browser = browser.version();
    const context = await browser.newContext();
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin === origin) return route.continue();
      report.externalRequests.push(route.request().url()); return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(origin);
    await page.locator('#listen').click();
    await page.waitForFunction(() => nativeAudioQa.snapshot().audios.some(audio => audio.starts > 0 && audio.currentTime > 0.15), null, { timeout: 10000 });
    const active = await page.evaluate(() => nativeAudioQa.snapshot());
    assert.equal(active.isPlaying, true); assert.equal(active.playingContentId, active.lastId);
    assert.equal(active.audios.length, 1); assert.equal(active.requests, 1);
    report.checks.nativePlaybackAdvances = true;
    await page.locator('#stop').click();
    const stopped = await page.evaluate(() => nativeAudioQa.snapshot());
    assert.equal(stopped.isPlaying, false); assert.equal(stopped.playingContentId, null);
    assert.equal(stopped.audios[0].paused, true); assert.equal(stopped.signals[0], true);
    await page.waitForTimeout(200);
    const settled = await page.evaluate(() => nativeAudioQa.snapshot());
    assert.ok(Math.abs(settled.audios[0].currentTime - stopped.audios[0].currentTime) < 0.04);
    report.checks.stopPausesNativeAudio = true;

    await page.evaluate(() => { nativeAudioQa.mode = 'delayed'; });
    await page.locator('#listen').click();
    const pending = await page.evaluate(() => nativeAudioQa.snapshot());
    assert.equal(pending.isGeneratingAudio, true); assert.equal(pending.playingContentId, pending.lastId);
    assert.equal(pending.requests, 2); assert.equal(pending.audios.length, 1);
    await page.locator('#stop').click();
    await page.evaluate(async () => { nativeAudioQa.releasePending(); await nativeAudioQa.lastPromise; });
    const late = await page.evaluate(() => nativeAudioQa.snapshot());
    assert.equal(late.signals[1], true); assert.equal(late.playingContentId, null);
    assert.equal(late.isPlaying, false); assert.equal(late.audios.length, 1);
    report.checks.lateSynthesisCannotStart = true;

    await page.evaluate(() => { nativeAudioQa.mode = 'immediate'; });
    await page.locator('#listen').click();
    await page.waitForFunction(() => nativeAudioQa.snapshot().audios[1]?.currentTime > 0.15, null, { timeout: 10000 });
    assert.notEqual(await page.evaluate(() => nativeAudioQa.lastId), pending.lastId);
    await page.locator('#stop').click();
    report.checks.restartAfterCancellation = true;

    // Native voices may arrive asynchronously. Never select an online voice.
    await page.evaluate(async () => {
      const synth = window.speechSynthesis;
      if (!synth || synth.getVoices().length) return;
      await new Promise(resolve => {
        const finish = () => { clearTimeout(timer); synth.removeEventListener('voiceschanged', finish); resolve(); };
        const timer = setTimeout(finish, 1500); synth.addEventListener('voiceschanged', finish);
      });
    });
    const voice = await page.evaluate(() => nativeAudioQa.enableLocalSpeech());
    if (!voice) report.localSpeech = { status: 'unavailable', reason: 'No English localService voice enumerated.' };
    else {
      await page.locator('#listen').click();
      try {
        await page.waitForFunction(() => nativeAudioQa.speechEvents.some(event => event.type === 'end' || event.type === 'error'), null, { timeout: 12000 });
      } catch (error) {
        if (error.name !== 'TimeoutError') throw error;
      }
      const events = await page.evaluate(() => nativeAudioQa.speechEvents);
      const started = events.some(event => event.type === 'start');
      const ended = events.some(event => event.type === 'end');
      report.localSpeech = { status: started && ended ? 'passed' : 'unavailable', voice, events,
        ...(started && ended ? {} : { reason: 'Native service did not deliver both start and end within 12 seconds.' }) };
      await page.locator('#stop').click();
    }
    const final = await page.evaluate(() => nativeAudioQa.snapshot());
    assert.deepEqual(final.errors, []); assert.ok(final.audios.every(audio => audio.paused && audio.errors === 0));
    assert.equal(final.requests, 3, 'Browser speech must not call the injected provider');
    assert.deepEqual(report.errors, []); assert.deepEqual(report.externalRequests, []);
    for (const file of files) assert.equal(digest(fs.readFileSync(path.join(root, file), 'utf8')), sourceHashes[file], file + ' changed during verification');
    report.checks.noExternalRequests = true;
    report.checks.allNativeAudioStopped = true;
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed'; report.failure = error.message; process.exitCode = 1;
  } finally {
    try { if (browser) await browser.close(); }
    finally { if (server.listening) await new Promise(resolve => server.close(resolve)); }
    const output = option('--output', null);
    if (output) {
      const target = path.resolve(root, output);
      assert.ok(target.startsWith(root + path.sep), 'Output must remain within this workspace');
      fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, JSON.stringify(report, null, 2) + '\n');
    }
    console.log(JSON.stringify(report));
  }
}

main().catch(error => { console.error(JSON.stringify({ status: 'failed', failure: error.message })); process.exitCode = 1; });
