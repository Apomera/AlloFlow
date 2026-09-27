#!/usr/bin/env node
'use strict';
// Current generated module, disposable origins only. No runtime edits or release builds.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const esbuild = require('esbuild');
const root = path.resolve(__dirname, '../../../..');
const inputs = [
  'immersive_reader_source.jsx', 'immersive_reader_module.js',
  'desktop/web-app/public/immersive_reader_module.js',
  '_build_immersive_reader_module.js', 'desktop/web-app/package-lock.json',
  'AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx',
];
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hashes = () => Object.fromEntries(inputs.map(file => [file, hash(fs.readFileSync(path.join(root, file)))]));
const before = hashes();
const generated = fs.readFileSync(path.join(root, 'immersive_reader_module.js'));
assert.equal(before['immersive_reader_module.js'], before['desktop/web-app/public/immersive_reader_module.js'], 'Generated module mirrors differ');
const runtime = esbuild.buildSync({
  write: false, bundle: true, format: 'iife', platform: 'browser',
  absWorkingDir: path.join(root, 'desktop/web-app'),
  nodePaths: [path.join(root, 'desktop/web-app/node_modules'), path.join(root, 'node_modules')],
  define: { 'process.env.NODE_ENV': '"production"' },
  stdin: { resolveDir: path.join(root, 'desktop/web-app'), contents:
    "import React from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';window.React=React;window.createRoot=createRoot;window.flushSync=flushSync;window.AlloModules={};window.AlloIcons={};window.AlloLanguageContext=React.createContext({t:k=>k});" },
}).outputFiles[0].contents;
// Two seconds of local PCM; native HTMLAudioElement performs actual playback.
const rate = 16000, samples = rate * 2, wav = Buffer.alloc(44 + samples * 2);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
wav.writeUInt32LE(samples * 2, 40);
for (let n = 0; n < samples; n++) wav.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 220 * n / rate) * 500), 44 + n * 2);

function fixtureBoot() {
  const nativeTimeout = window.setTimeout.bind(window);
  const nativeClear = window.clearTimeout.bind(window);
  const nativeFrame = window.requestAnimationFrame.bind(window);
  const nativeCancel = window.cancelAnimationFrame.bind(window);
  const timers = new Map(), frames = new Set(), audio = [], utterances = [];
  let root, props, resolverPromise, resolveAudio, resolveClipboard, rejectClipboard;
  let legacyCopies = 0, clipboardMode = 'resolve', throwLegacy = false;
  window.setTimeout = (callback, delay, ...args) => {
    const id = nativeTimeout(() => { timers.delete(id); callback(...args); }, delay);
    timers.set(id, Number(delay) || 0); return id;
  };
  window.clearTimeout = id => { timers.delete(id); nativeClear(id); };
  window.requestAnimationFrame = callback => {
    const id = nativeFrame(time => { frames.delete(id); callback(time); }); frames.add(id); return id;
  };
  window.cancelAnimationFrame = id => { frames.delete(id); nativeCancel(id); };
  const NativeAudio = window.Audio;
  window.Audio = function (...args) { const value = new NativeAudio(...args); audio.push(value); return value; };
  window.Audio.prototype = NativeAudio.prototype;
  window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
    speak: value => utterances.push(value), cancel() {}, getVoices: () => [],
  } });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => {
    if (clipboardMode === 'pending') return new Promise((resolve, reject) => { resolveClipboard = resolve; rejectClipboard = reject; });
    if (clipboardMode === 'reject') return Promise.reject(Error('Fixture clipboard denial'));
    return Promise.resolve();
  } } });
  document.execCommand = () => { legacyCopies++; if (throwLegacy) throw Error('Fixture legacy-copy failure'); return true; };
  localStorage.setItem('allo_save_karaoke_audio', '0');
  const settle = async () => { for (let i = 0; i < 3; i++) await new Promise(resolve => nativeTimeout(resolve, 0)); };
  const render = update => {
    props = { ...props, ...update };
    window.flushSync(() => root.render(React.createElement(window.AlloModules.KaraokeReaderOverlay, props)));
  };
  const unmount = () => { if (root) { window.flushSync(() => root.unmount()); root = null; } };
  const snapshot = () => ({
    timers: [...timers.values()].sort((a, b) => a - b), frames: frames.size,
    audioCount: audio.length, playingAudio: audio.filter(value => !value.paused && !value.ended).length,
    utterances: utterances.length, legacyCopies, scratchFields: document.querySelectorAll('textarea').length,
    copiedVisible: document.body.textContent.includes('Copied'),
  });
  window.caseFixture = {
    audio, utterances, render, unmount, snapshot, settle,
    async mount(mode = 'device', copying = 'resolve') {
      clipboardMode = copying;
      resolverPromise = new Promise(resolve => { resolveAudio = resolve; });
      const resolver = mode === 'native' ? async () => location.origin + '/tone.wav'
        : mode === 'hung' ? () => resolverPromise : null;
      root = window.createRoot(document.getElementById('root'));
      props = { isOpen: true, onClose() {}, sentenceList: ['First sentence.', 'Second sentence.', 'Third sentence.'],
        captureOn: false, getAudioUrl: resolver };
      render({}); await settle();
    },
    start() {
      const button = document.querySelector('button[aria-label="Play"]');
      if (!button) throw Error('Play control unavailable');
      window.flushSync(() => button.click());
    },
    copy() {
      const button = [...document.querySelectorAll('button')].find(value => value.textContent.includes('Diagnostics'));
      if (!button) throw Error('Diagnostics control unavailable');
      window.flushSync(() => button.click());
    },
    resolveAudio: () => resolveAudio(location.origin + '/tone.wav'),
    resolveClipboard: () => resolveClipboard(),
    rejectClipboard: () => rejectClipboard(Error('Delayed fixture clipboard denial')),
    failLegacyCopy: () => { throwLegacy = true; },
  };
}

const origin = 'https://immersive-lifecycle.test';
const html = '<!doctype html><html lang="en"><meta charset="utf-8"><title>Immersive lifecycle fixture</title><body><div id="root"></div><script src="/runtime.js"></script><script src="/fixture.js"></script><script src="/module.js"></script></body></html>';
const fixture = '(' + fixtureBoot.toString() + ')();';
const assets = {
  '/': { body: html, contentType: 'text/html' },
  '/runtime.js': { body: Buffer.from(runtime), contentType: 'text/javascript' },
  '/fixture.js': { body: fixture, contentType: 'text/javascript' },
  '/module.js': { body: generated, contentType: 'text/javascript' },
  '/tone.wav': { body: wav, contentType: 'audio/wav' },
};
const report = {
  at: new Date().toISOString(), ok: false, inputsBefore: before, runnerSha256: hash(fs.readFileSync(__filename)),
  cases: [], limitations: [
    'Current generated module in a disposable browser origin; full host, cloud services and deployed bytes are not exercised.',
    'Generated route uses native local PCM playback. Device voice, resolver and clipboard responses are deterministic stubs.',
    'Checks lifecycle correctness and immediate timer/frame cleanup; no latency, heap, cache or general performance acceptance.',
    'The React fixture bundle is compiled only in memory; production module source is served unchanged.',
  ],
};
function clean(snapshot) {
  assert.deepEqual(snapshot.timers, [], 'Timeouts remain after teardown');
  assert.equal(snapshot.frames, 0, 'Animation frames remain after teardown');
  assert.equal(snapshot.playingAudio, 0, 'Audio remains playing after teardown');
  assert.equal(snapshot.scratchFields, 0, 'Temporary clipboard field remains');
}

async function main() {
  const channel = process.env.ALLO_LIFECYCLE_BROWSER || 'msedge';
  const browser = await chromium.launch({ headless: true, ...(channel === 'chromium' ? {} : { channel }) });
  report.browser = browser.version();
  async function run(name, callback) {
    const context = await browser.newContext({ viewport: { width: 1100, height: 850 } });
    const page = await context.newPage(), errors = [], external = [], transport = [], routeErrors = [];
    let deadline;
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => transport.push({ type: 'request', url: request.url() }));
    page.on('requestfailed', request => transport.push({ type: 'requestfailed', url: request.url(), error: request.failure()?.errorText }));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) { external.push(url.origin + url.pathname); return route.abort(); }
      const asset = assets[url.pathname];
      try {
        await (asset ? route.fulfill({ status: 200, ...asset }) : route.fulfill({ status: 404, body: '' }));
        transport.push({ type: 'fulfilled', path: url.pathname, status: asset ? 200 : 404 });
      } catch (error) {
        routeErrors.push({ path: url.pathname, error: error.message });
        await route.abort().catch(() => {});
      }
    });
    const result = { name, ok: false };
    report.cases.push(result);
    try {
      await page.goto(origin + '/');
      await page.waitForFunction(() => !!window.AlloModules.KaraokeReaderOverlay);
      result.observation = await Promise.race([
        callback(page), new Promise((_resolve, reject) => { deadline = setTimeout(() => reject(Error('Lifecycle case exceeded 15 seconds')), 15000); }),
      ]);
      await page.evaluate(async () => { caseFixture.unmount(); await caseFixture.settle(); });
      result.final = await page.evaluate(() => caseFixture.snapshot());
      clean(result.final); assert.deepEqual(errors, []); assert.deepEqual(external, []); assert.deepEqual(routeErrors, []);
      result.ok = true;
    } catch (error) { result.error = error.message; throw error; }
    finally { clearTimeout(deadline); result.pageErrors = errors; result.externalRequests = external; result.transport = transport; result.routeErrors = routeErrors; await context.close(); }
  }
  try {
    await run('native PCM ends; queued advance is cancelled immediately on unmount', async page => {
      await page.evaluate(() => caseFixture.mount('native'));
      await page.getByRole('button', { name: 'Play', exact: true }).click();
      await page.waitForFunction(() => caseFixture.audio.some(value => !value.paused && !value.ended));
      const result = await page.evaluate(async () => {
        const audio = caseFixture.audio[0];
        if (audio.ended) throw Error('Native clip ended before observation was armed');
        await new Promise(resolve => audio.addEventListener('ended', resolve, { once: true }));
        const before = caseFixture.snapshot(); caseFixture.unmount();
        return { nativeEnded: audio.ended, before, immediate: caseFixture.snapshot() };
      });
      assert.equal(result.nativeEnded, true); assert.ok(result.before.timers.includes(250));
      clean(result.immediate); return result;
    });
    await run('device voice advance and startup timer cancel immediately on unmount', async page => {
      const result = await page.evaluate(async () => {
        await caseFixture.mount(); caseFixture.start(); await caseFixture.settle();
        if (!caseFixture.utterances[0]) throw Error('Device speech was not requested');
        caseFixture.utterances[0].onend();
        const before = caseFixture.snapshot(); caseFixture.unmount();
        return { before, immediate: caseFixture.snapshot() };
      });
      assert.ok(result.before.timers.includes(250)); clean(result.immediate); return result;
    });
    await run('hung resolver closes without watchdog work or late playback', async page => {
      const result = await page.evaluate(async () => {
        await caseFixture.mount('hung'); caseFixture.start(); await caseFixture.settle();
        const before = caseFixture.snapshot(); caseFixture.render({ isOpen: false });
        await caseFixture.settle(); const closed = caseFixture.snapshot();
        caseFixture.resolveAudio(); await caseFixture.settle();
        return { before, closed, late: caseFixture.snapshot() };
      });
      assert.ok(result.before.timers.includes(20000)); clean(result.closed); clean(result.late);
      assert.equal(result.late.audioCount, 0); assert.equal(result.late.utterances, 0); return result;
    });
    await run('late successful clipboard completion after unmount schedules no feedback', async page => {
      const result = await page.evaluate(async () => {
        await caseFixture.mount('device', 'pending'); caseFixture.copy(); caseFixture.unmount();
        caseFixture.resolveClipboard(); await caseFixture.settle(); return caseFixture.snapshot();
      });
      clean(result); assert.equal(result.copiedVisible, false); return result;
    });
    await run('late clipboard rejection after close does not invoke legacy copying', async page => {
      const result = await page.evaluate(async () => {
        await caseFixture.mount('device', 'pending'); caseFixture.copy(); caseFixture.render({ isOpen: false });
        caseFixture.rejectClipboard(); await caseFixture.settle(); return caseFixture.snapshot();
      });
      clean(result); assert.equal(result.legacyCopies, 0); return result;
    });
    await run('visible diagnostics feedback cancels immediately on unmount', async page => {
      const result = await page.evaluate(async () => {
        await caseFixture.mount(); caseFixture.copy(); await caseFixture.settle();
        const before = caseFixture.snapshot(); caseFixture.unmount();
        return { before, immediate: caseFixture.snapshot() };
      });
      assert.equal(result.before.copiedVisible, true); assert.ok(result.before.timers.includes(2000));
      clean(result.immediate); return result;
    });
    await run('replacement sentence scope clears diagnostics feedback', async page => {
      const result = await page.evaluate(async () => {
        await caseFixture.mount(); caseFixture.copy(); await caseFixture.settle();
        const before = caseFixture.snapshot(); caseFixture.render({ sentenceList: ['Replacement sentence.'] });
        await caseFixture.settle(); const after = caseFixture.snapshot(); caseFixture.unmount();
        return { before, after, immediate: caseFixture.snapshot() };
      });
      assert.equal(result.before.copiedVisible, true); assert.equal(result.after.copiedVisible, false);
      assert.ok(!result.after.timers.includes(2000)); clean(result.immediate); return result;
    });
    await run('legacy clipboard exception removes its temporary DOM field', async page => {
      const result = await page.evaluate(async () => {
        await caseFixture.mount('device', 'reject'); caseFixture.failLegacyCopy();
        caseFixture.copy(); await caseFixture.settle(); return caseFixture.snapshot();
      });
      assert.equal(result.legacyCopies, 1); assert.equal(result.scratchFields, 0);
      assert.equal(result.copiedVisible, false); return result;
    });
    report.ok = true;
  } finally { await browser.close(); }
}
main().catch(error => { report.error = error.stack || error.message; process.exitCode = 1; }).finally(() => {
  report.inputsAfter = hashes();
  try { assert.deepEqual(report.inputsAfter, report.inputsBefore); }
  catch (_) { report.ok = false; report.inputDrift = true; process.exitCode = 1; }
  fs.writeFileSync(path.join(__dirname, 'browser-current-results.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ ok: report.ok, cases: report.cases.map(value => ({ name: value.name, ok: value.ok, error: value.error })),
    inputDrift: !!report.inputDrift, error: report.error }, null, 2));
});
