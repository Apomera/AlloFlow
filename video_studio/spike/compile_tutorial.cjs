#!/usr/bin/env node
'use strict';
/*
 * compile_tutorial.cjs - SPIKE (2026-11-08)
 *
 * workflow JSON  ->  narrated, captioned tutorial video, by running the REAL
 * tutorial_compiler_module.js (buildTutorialManifest + compileTutorial) with real adapters:
 *
 *   startCapture  Playwright records the page (Edge/Chromium); a black flash at the start is the sync mark
 *   spotlight     draws a ring around the step's anchor, inside the page, so it is in the recording
 *   speak         plays a PRE-SYNTHESIZED beat (Kokoro, local) by holding for its real duration
 *   performStep   real click/type/press with a visible cursor and click ripple (not a state fixture)
 *   composite     mixes the narration, finds the flash in the video to align clocks, writes captions,
 *                 encodes with ffmpeg
 *
 * No compositor: zoom/highlight/document pages are a later layer. This is the "mux-only" version.
 *
 * Outputs (in compiled/<slug>/):  <slug>.mp4 (soft, switchable captions), <slug>.open-captions.mp4
 *   (burned in), <slug>.vtt / .srt, <slug>.transcript.md, <slug>.steps.json (script, timeline, events,
 *   calibration, engine, warnings).
 *
 *   node compile_tutorial.cjs workflows/demo_tracker.workflow.json [--tts=kokoro|sapi] [--voice=af_heart]
 *        [--browser=msedge|chrome|chromium] [--out=DIR] [--keep]
 *
 * USE DEMO OR SANDBOX ACCOUNTS ONLY. The recording captures everything on screen.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const L = require('./compile_lib.cjs');
const { createTts } = require('./tts_engines.cjs');

const SPIKE = __dirname;
const REPO = path.resolve(SPIKE, '..', '..');
const argv = process.argv.slice(2);
const positional = argv.filter(a => !a.startsWith('--'));
const arg = (k, d) => { const a = argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const flag = k => argv.includes('--' + k);
const log = m => process.stdout.write(m + '\n');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clock = () => performance.now() / 1000;
const r3 = n => Math.round(n * 1000) / 1000;

// ---- page-side scripts ----------------------------------------------------------------
const INIT_SCRIPT = `(() => {
  if (window.__tourInit) return; window.__tourInit = true;
  const ripple = (x, y) => { const r = document.createElement('div');
    r.style.cssText = 'position:fixed;left:' + x + 'px;top:' + y + 'px;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;border:4px solid #f59e0b;z-index:2147483646;pointer-events:none;opacity:.95;transition:transform .55s ease-out,opacity .55s ease-out';
    document.documentElement.appendChild(r); requestAnimationFrame(() => { r.style.transform = 'scale(4)'; r.style.opacity = '0'; }); setTimeout(() => r.remove(), 700); };
  const mk = () => {
    const c = document.createElement('div'); c.id = '__tour_cursor';
    c.style.cssText = 'position:fixed;left:-60px;top:-60px;width:30px;height:30px;margin:-2px 0 0 -3px;z-index:2147483647;pointer-events:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))';
    c.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M3 2l7 18 2.6-7.4L20 10z" fill="#111827" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    addEventListener('mousemove', e => { c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }, true);
    // page-clock time of the real input event: Node-side timestamps include the round trip to the browser (tens of ms)
    // Also measure the page's own PAINT DELAY for this click: how long until the next animation frame can run. On a heavy app the
    // main thread is busy with the click handler, so nothing (the ripple, the app's reaction) can be drawn until it is done.
    addEventListener('mousedown', e => {
      window.__tourDownAt = performance.timeOrigin + e.timeStamp;
      const id = window.__tourDownCurrent = (window.__tourDownCurrent || 0) + 1, t0 = performance.now();
      window.__tourPaint = window.__tourPaint || {};
      requestAnimationFrame(() => { window.__tourPaint[id] = Math.round(performance.now() - t0); });
      ripple(e.clientX, e.clientY);
    }, true);
  };
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', mk) : mk();
})();`;
const FLASH_ON = () => { const d = document.createElement('div'); d.id = '__tour_flash'; d.style.cssText = 'position:fixed;inset:0;background:#000;z-index:2147483647'; document.documentElement.appendChild(d); };
const FLASH_OFF = () => { const d = document.getElementById('__tour_flash'); if (d) d.remove(); return performance.timeOrigin + performance.now(); };
// The ring FOLLOWS its target every frame: a click often changes the page (a banner appears and pushes everything down), and a
// ring drawn once at step start would be left hovering over the wrong thing in the recording.
const SPOT = sel => {
  window.__tourSpotSel = sel || null;
  let ring = document.getElementById('__tour_ring');
  if (!sel) { if (ring) ring.remove(); return true; }
  const el = document.querySelector(sel); if (!el) return false;
  el.scrollIntoView({ block: 'center', inline: 'center' });
  if (!ring) {
    ring = document.createElement('div'); ring.id = '__tour_ring';
    ring.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483645;border:4px solid #f59e0b;border-radius:10px;box-shadow:0 0 0 4px rgba(245,158,11,.28)';
    document.documentElement.appendChild(ring);
  }
  window.__tourPlace = () => {
    const rg = document.getElementById('__tour_ring'); if (!rg) return;
    const e = window.__tourSpotSel && document.querySelector(window.__tourSpotSel);
    if (!e) { rg.style.display = 'none'; return; }
    const r = e.getBoundingClientRect();
    rg.style.display = 'block'; rg.style.left = (r.left - 6) + 'px'; rg.style.top = (r.top - 6) + 'px'; rg.style.width = (r.width + 12) + 'px'; rg.style.height = (r.height + 12) + 'px';
  };
  window.__tourPlace();
  if (!window.__tourSpotLoop) { window.__tourSpotLoop = true; const tick = () => { window.__tourPlace(); requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
  return true;
};

// ---- ffmpeg helpers -------------------------------------------------------------------
function ff(args, opts) {
  const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], Object.assign({ encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }, opts));
  if (r.status !== 0) throw new Error('ffmpeg failed (' + r.status + '): ' + String(r.stderr || '').split('\n').slice(0, 4).join(' | '));
}
function sceneChanges(file) {
  const p = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-vf', "select='gt(scene,0.02)',metadata=print:file=-", '-an', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
  const out = []; let t = null;
  for (const line of String(p.stdout || '').split(/\r?\n/)) {
    const a = line.match(/pts_time:([0-9.]+)/); if (a) t = parseFloat(a[1]);
    const b = line.match(/lavfi\.scene_score=([0-9.]+)/); if (b && t !== null) { out.push({ t, score: parseFloat(b[1]) }); t = null; }
  }
  return out;
}

async function main() {
  if (!positional[0]) { console.error('usage: node compile_tutorial.cjs <workflow.json> [--tts=kokoro|sapi] [--voice=af_heart] [--browser=msedge|chrome|chromium] [--out=DIR] [--keep]'); process.exit(2); }
  const wfPath = path.resolve(positional[0]);
  let wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
  // steps with "fromGuided" take their wording and anchor from AlloFlow's own guided-mode data, so the narration cannot drift from it
  if (Array.isArray(wf.steps) && wf.steps.some(s => s && s.fromGuided !== undefined)) wf = L.resolveGuidedRefs(wf, L.loadGuidedConfig(REPO));
  const v = L.validateWorkflow(wf);
  if (!v.ok) { console.error('Invalid workflow:\n - ' + v.errors.join('\n - ')); process.exit(2); }

  const viewport = wf.viewport || { width: 1280, height: 720 };
  const slug = String(wf.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'tutorial';
  const outDir = path.resolve(arg('out', path.join(SPIKE, 'compiled', slug)));
  const work = path.join(outDir, '_work');
  // Empty the folder instead of deleting it: on Windows a directory that is some process's current directory cannot be removed (EPERM).
  fs.mkdirSync(outDir, { recursive: true });
  for (const entry of fs.readdirSync(outDir)) fs.rmSync(path.join(outDir, entry), { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });
  const startUrl = /^(https?|file):/i.test(wf.start.url) ? wf.start.url : pathToFileURL(path.resolve(path.dirname(wfPath), wf.start.url)).href;
  if (/^https?:/i.test(startUrl) && !/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(startUrl)) log('NOTE: recording a live site. Use demo/sandbox accounts only; everything on screen is captured.');

  // 1. the script, from the REAL compiler
  const TC = L.loadCompiler(REPO);
  const { guidedSteps, tourMap, actions, pauseAfter, expects } = L.toGuidedSteps(wf);
  const manifest = TC.buildTutorialManifest(guidedSteps, tourMap, null, { wpm: 150 });
  log('script: ' + manifest.stepCount + ' steps, ~' + Math.round(manifest.totalSeconds) + ' s estimated');

  // 2. narration first: synthesize every beat BEFORE recording, so nothing waits on the engine mid-take
  const ttsName = arg('tts', 'kokoro');
  const tts = await createTts(ttsName, { voice: arg('voice', undefined) });
  log('tts: ' + tts.name + ' (' + tts.voice + '), model load ' + tts.loadMs + ' ms');
  const audio = new Map(), synthLog = [];
  for (const s of manifest.steps) for (const b of s.beats) {
    if (audio.has(b.text)) continue;
    const t0 = performance.now();
    // Re-takes are common (the app changed, a selector moved) and the words did not: cache the raw clip by engine+voice+text.
    const cacheFile = path.join(SPIKE, 'compiled', '_tts_cache', crypto.createHash('sha1').update([tts.name, tts.voice, b.text].join('|')).digest('hex') + '.wav');
    let raw, fromCache = false;
    if (fs.existsSync(cacheFile)) { raw = L.readWav(fs.readFileSync(cacheFile)); fromCache = true; }
    else { raw = await tts.synth(b.text); fs.mkdirSync(path.dirname(cacheFile), { recursive: true }); fs.writeFileSync(cacheFile, L.writeWavPcm16(raw.samples, raw.sampleRate)); }
    const tr = L.trimSilence(raw.samples, raw.sampleRate); // engines pad each clip with ~0.3 s of silence
    const a = { samples: tr.samples, sampleRate: raw.sampleRate };
    audio.set(b.text, a);
    synthLog.push({ text: b.text, fromCache, synthMs: Math.round(performance.now() - t0), rawSec: r3(raw.samples.length / raw.sampleRate), audioSec: r3(a.samples.length / a.sampleRate), trimmedLeadMs: Math.round(tr.trimmedLeadSec * 1000), trimmedTailMs: Math.round(tr.trimmedTailSec * 1000) });
  }
  log('synthesized ' + synthLog.length + ' beats: ' + synthLog.reduce((n, x) => n + x.audioSec, 0).toFixed(1) + ' s of audio (' + synthLog.reduce((n, x) => n + x.rawSec, 0).toFixed(1) + ' s before trimming silence) in ' + (synthLog.reduce((n, x) => n + x.synthMs, 0) / 1000).toFixed(1) + ' s');

  // 3. adapters for the real compileTutorial
  const rec = { clips: [], events: [] };
  let browser = null, page = null, mouse = { x: viewport.width * 0.8, y: viewport.height * 0.88 };
  const launchOpts = arg('browser', 'msedge') === 'chromium' ? {} : { channel: arg('browser', 'msedge') };
  const sinceStart = () => clock() - rec.flashOffPerf;
  const glide = async (x, y, ms) => {
    const n = Math.max(8, Math.round(ms / 22)), x0 = mouse.x, y0 = mouse.y;
    for (let i = 1; i <= n; i++) {
      const p = i / n, e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      await page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e);
      await sleep(ms / n);
    }
    mouse = { x, y };
  };
  const clickSelector = async (sel, kind, stepId) => {
    const loc = page.locator(sel).first();
    await loc.waitFor({ state: 'visible', timeout: 15000 });
    await loc.scrollIntoViewIfNeeded();
    // Ring the control we are about to press. The step's own anchor can be a whole card that has since grown tall (a ring
    // around half the screen teaches nothing), and Playwright selectors like text=... cannot be used by the in-page ring,
    // so mark the element itself.
    await loc.evaluate(el => { document.querySelectorAll('[data-tour-spot]').forEach(e => e.removeAttribute('data-tour-spot')); el.setAttribute('data-tour-spot', '1'); });
    await page.evaluate(SPOT, '[data-tour-spot="1"]');
    await sleep(300);
    // A control that has just appeared or moved (a card expanding, a smooth scroll) is still travelling: measuring it once and
    // clicking those coordinates clicks empty space. Wait until its box stops changing, glide, then re-check before pressing.
    const stable = async () => {
      let prev = null;
      for (let i = 0; i < 40; i++) {
        const cur = await loc.boundingBox();
        if (cur && prev && ['x', 'y', 'width', 'height'].every(k => Math.abs(cur[k] - prev[k]) < 1)) return cur;
        prev = cur; await sleep(100);
      }
      return prev;
    };
    let b = await stable();
    if (!b) throw new Error('Could not measure "' + sel + '" (it has no box on the page).');
    let x = b.x + b.width / 2, y = b.y + b.height / 2;
    await glide(x, y, 650);
    const b2 = await stable();
    if (b2 && (Math.abs(b2.x - b.x) > 3 || Math.abs(b2.y - b.y) > 3)) { b = b2; x = b.x + b.width / 2; y = b.y + b.height / 2; await glide(x, y, 250); } // it moved while we were gliding
    await sleep(200);
    const t = sinceStart();
    await page.mouse.click(x, y);
    const meta = await page.evaluate(() => ({ at: window.__tourDownAt, id: window.__tourDownCurrent })); // when the page really received the mousedown
    const tPage = (meta.at - rec.flashOffPage) / 1000;            // same clock as the flash mark, so the browser round trip cancels
    rec.events.push({ kind, stepId, t: r3(tPage), tNodeSide: r3(t), downId: meta.id, selector: sel, x: r3(x / viewport.width), y: r3(y / viewport.height), box: { x: r3(b.x / viewport.width), y: r3(b.y / viewport.height), w: r3(b.width / viewport.width), h: r3(b.height / viewport.height) } });
  };

  const deps = {
    now: clock,
    log: () => {},
    startCapture: async () => {
      browser = await chromium.launch(launchOpts);
      const ctx = await browser.newContext({ viewport, recordVideo: { dir: path.join(work, 'rec'), size: viewport } });
      await ctx.addInitScript(INIT_SCRIPT);
      page = await ctx.newPage();
      rec.pageCreatedWall = Date.now();
      await page.goto(startUrl, { waitUntil: 'load', timeout: 60000 });
      if (wf.start.waitFor) await page.waitForSelector(wf.start.waitFor, { timeout: 30000 });
      // silent setup BEFORE the take: get past a launcher, wait out the app's lazy module loading (clicking too early silently does nothing)
      for (const a of wf.start.setup || []) {
        const ts = performance.now();
        if (a.kind === 'click') await page.locator(a.selector).first().click({ timeout: 30000 });
        else if (a.kind === 'type') { await page.locator(a.selector).first().click({ timeout: 30000 }); await page.keyboard.type(a.text, { delay: a.delayMs === undefined ? 20 : a.delayMs }); }
        else if (a.kind === 'press') await page.keyboard.press(a.key);
        else if (a.kind === 'goto') await page.goto(a.url, { waitUntil: 'load', timeout: 60000 });
        else if (a.kind === 'wait') await sleep(a.ms);
        else if (a.kind === 'waitFor') await page.locator(a.selector).first().waitFor({ state: a.state || 'visible', timeout: a.timeoutMs || 30000 });
        log('  setup ' + a.kind + (a.selector ? ' ' + a.selector : '') + ' (' + ((performance.now() - ts) / 1000).toFixed(1) + ' s)');
      }
      await page.mouse.move(mouse.x, mouse.y);
      await sleep(500);
      await page.evaluate(FLASH_ON); await sleep(600); rec.flashOffPage = await page.evaluate(FLASH_OFF); // the sync mark, on the page's own clock
      rec.flashOffWall = Date.now();
      // Node and the page both expose epoch time (timeOrigin + now), so the flash can be placed on Node's performance clock
      // EXACTLY, instead of "when evaluate() returned" (which is late by the round trip, ~100 ms under load).
      rec.flashOffPerf = (rec.flashOffPage - performance.timeOrigin) / 1000;
      rec.returnPerf = clock(); // compileTutorial starts its own clock (startedAt) a moment after this returns
      const video = page.video();
      return { stop: async () => { await ctx.close(); rec.webm = await video.path(); await browser.close(); browser = null; return { path: rec.webm }; } };
    },
    spotlight: async anchorId => {
      const ok = await page.evaluate(SPOT, anchorId || null);
      if (!ok) throw new Error('Tutorial anchor "' + anchorId + '" was not found on the page. The page changed, or the workflow is out of date.');
      await sleep(250);
    },
    speak: async (text, c) => {
      const a = audio.get(text);
      if (!a) throw new Error('internal: no synthesized audio for beat "' + text + '"');
      const dur = a.samples.length / a.sampleRate;
      rec.clips.push({ text, samples: a.samples, sampleRate: a.sampleRate, stepId: c.step.id, kind: c.beat.kind, onsetSec: L.firstOnsetSec(a.samples, a.sampleRate) });
      await sleep(Math.round((dur + 0.3) * 1000)); // hold for the beat's real length (+ a breath)
    },
    performStep: async step => {
      const raw = actions[step.id];
      const list = Array.isArray(raw) ? raw : [raw || { kind: 'none' }]; // one action, or several run in order
      for (const a of list) {
        if (a.kind === 'click') await clickSelector(a.selector, 'click', step.id);
        else if (a.kind === 'type') {
          await clickSelector(a.selector, 'click', step.id);
          rec.events.push({ kind: 'key', stepId: step.id, t: r3(sinceStart()), selector: a.selector, text: a.text });
          await page.keyboard.type(a.text, { delay: a.delayMs === undefined ? 110 : a.delayMs });
        } else if (a.kind === 'press') { rec.events.push({ kind: 'key', stepId: step.id, t: r3(sinceStart()), key: a.key }); await page.keyboard.press(a.key); }
        else if (a.kind === 'goto') await page.goto(a.url, { waitUntil: 'load', timeout: 60000 });
        else if (a.kind === 'wait') await sleep(a.ms);
        else if (a.kind === 'waitFor') await page.locator(a.selector).first().waitFor({ state: a.state || 'visible', timeout: a.timeoutMs || 30000 });
      }
      // drift detector: the narration names things; if the page does not show them after the step, the script is out of date
      for (const text of expects[step.id] || []) {
        // ">> visible=true" so a hidden duplicate earlier in the DOM cannot be the one we wait on
        try { await page.locator('text=' + text + ' >> visible=true').first().waitFor({ state: 'visible', timeout: 10000 }); }
        catch (_) {
          const shot = path.join(work, 'failure-' + step.id + '.png');
          try { await page.screenshot({ path: shot }); } catch (__) {}
          throw new Error('Step "' + step.id + '" expected to see "' + text + '" after its actions, but it is not visible on the page. The app changed or the script is out of date. Screenshot of what was on screen: ' + shot);
        }
      }
      // by now every frame requested after a mousedown has run: attach each click's measured paint delay to its event
      try {
        await sleep(150); // the animation frame requested at the last mousedown must have had time to run
        const paint = await page.evaluate(() => window.__tourPaint || {});
        rec.events.filter(e => e.stepId === step.id && e.downId !== undefined && e.paintDelayMs === undefined && paint[e.downId] !== undefined).forEach(e => { e.paintDelayMs = paint[e.downId]; });
      } catch (_) {}
      await sleep(Math.round((pauseAfter[step.id] === undefined ? 0.4 : pauseAfter[step.id]) * 1000));
    },
    composite: async (videoResult, compiled) => composite(videoResult, compiled),
  };

  // 4. composite: align clocks, mix narration, captions, encode
  async function composite(videoResult, compiled) {
    const t0 = performance.now();
    const warnings = [];
    // compileTutorial starts its own clock a moment AFTER the flash (startCapture returns after the browser round trip).
    // Put every beat on the flash clock, so narration, captions and the page-clock click events all share one zero.
    let shift = rec.returnPerf - rec.flashOffPerf;
    if (!isFinite(shift) || shift < -0.05 || shift > 1.5) { warnings.push('Node and browser clocks disagree by ' + r3(shift) + ' s; narration was NOT shifted, so it may be off by that much against the click events.'); shift = 0; }
    const timeline = compiled.timeline.map(b => ({ ...b, startSec: r3(b.startSec + shift), endSec: r3(b.endSec + shift) }));
    const videoSeconds = compiled.actualSeconds + shift;
    if (rec.clips.length !== timeline.length) throw new Error('internal: ' + rec.clips.length + ' clips vs ' + timeline.length + ' timeline beats');
    // clock alignment: the video clock started at page creation, the compile clock at the flash. Find the flash in the video.
    const expected = (rec.flashOffWall - rec.pageCreatedWall) / 1000;
    const scenes = sceneChanges(videoResult.path).filter(s => s.score > 0.25 && s.t > expected - 1.5 && s.t < expected + 1.5);
    const found = scenes.length ? scenes[scenes.length - 1] : null; // the LAST big change = the flash turning off
    const videoStart = found ? found.t : expected;
    const calibration = { expectedVideoSec: r3(expected), detectedVideoSec: found ? r3(found.t) : null, score: found ? r3(found.score) : null, usedSec: r3(videoStart), driftFromExpectedSec: r3(videoStart - expected) };
    if (!found) warnings.push('Could not find the sync flash in the video; fell back to the wall-clock estimate (less accurate).');

    const RATE = 24000;
    const mix = L.mixNarration(rec.clips.map((c, i) => ({ startSec: timeline[i].startSec, samples: c.samples, sampleRate: c.sampleRate })), videoSeconds, RATE);
    if (mix.overlaps.length) warnings.push('Narration overlaps: ' + JSON.stringify(mix.overlaps));
    if (mix.clipped.length) warnings.push('Narration runs past the end of the video: ' + JSON.stringify(mix.clipped));
    const wav = path.join(work, 'narration.wav');
    fs.writeFileSync(wav, L.writeWavPcm16(mix.samples, RATE));

    const cues = L.cuesFromTimeline(timeline.map((b, i) => ({ ...b, text: rec.clips[i].text })));
    fs.writeFileSync(path.join(outDir, slug + '.srt'), L.srtFromCues(cues));
    fs.writeFileSync(path.join(outDir, slug + '.vtt'), L.vttFromCues(cues));
    fs.writeFileSync(path.join(work, 'captions.srt'), L.srtFromCues(cues));
    fs.writeFileSync(path.join(outDir, slug + '.transcript.md'), L.transcriptMarkdown(wf, manifest));

    const vf = 'fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p';
    const enc = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart'];
    const base = ['-ss', videoStart.toFixed(3), '-i', videoResult.path, '-i', wav];
    const soft = path.join(outDir, slug + '.mp4'), open = path.join(outDir, slug + '.open-captions.mp4');
    const tEnc = performance.now();
    ff([...base, '-i', path.join(work, 'captions.srt'), '-t', videoSeconds.toFixed(3), '-map', '0:v', '-map', '1:a', '-map', '2:s', '-vf', vf, ...enc, '-c:s', 'mov_text', '-metadata:s:s:0', 'language=eng', '-metadata:s:s:0', 'title=English captions', soft]);
    ff([...base, '-t', videoSeconds.toFixed(3), '-map', '0:v', '-map', '1:a', '-vf', vf + ",subtitles=captions.srt:force_style='FontSize=12,PrimaryColour=&H00FFFFFF,OutlineColour=&H26000000,BorderStyle=3,Outline=3,Shadow=0,MarginV=22'", ...enc, open], { cwd: work });
    const encodeMs = Math.round(performance.now() - tEnc);

    const stepsJson = {
      generator: 'compile_tutorial.cjs (spike)', workflow: path.basename(wfPath), title: wf.title,
      engine: { tts: tts.name, voice: tts.voice, languages: tts.languages, browser: arg('browser', 'msedge') },
      manifest, timeline: timeline.map((b, i) => ({ ...b, text: rec.clips[i].text, audioSec: r3(rec.clips[i].samples.length / rec.clips[i].sampleRate), clipOnsetSec: rec.clips[i].onsetSec === null ? null : r3(rec.clips[i].onsetSec) })),
      events: rec.events, calibration: { ...calibration, compileClockShiftSec: r3(shift) }, actualSeconds: r3(compiled.actualSeconds), videoSeconds: r3(videoSeconds), audioPeak: mix.peak, synth: synthLog,
      timingsMs: { composite: Math.round(performance.now() - t0), ffmpegEncodes: encodeMs }, warnings,
    };
    fs.writeFileSync(path.join(outDir, slug + '.steps.json'), JSON.stringify(stepsJson, null, 1));
    return { ok: true, slug, outDir, files: [soft, open, path.join(outDir, slug + '.vtt'), path.join(outDir, slug + '.srt'), path.join(outDir, slug + '.transcript.md'), path.join(outDir, slug + '.steps.json')], calibration, warnings, actualSeconds: videoSeconds, encodeMs };
  }

  // 5. run the real compiler
  const tRun = performance.now();
  let result;
  try {
    result = await TC.compileTutorial(manifest, deps);
  } finally {
    if (browser) { try { await browser.close(); } catch (_) {} }
  }
  if (!result || !result.ok) throw new Error('compileTutorial did not complete: ' + JSON.stringify(result));
  if (!flag('keep')) fs.rmSync(work, { recursive: true, force: true });
  log('\ncompiled in ' + ((performance.now() - tRun) / 1000).toFixed(1) + ' s  (video ' + result.actualSeconds.toFixed(1) + ' s, encode ' + (result.encodeMs / 1000).toFixed(1) + ' s)');
  log('clock alignment: ' + JSON.stringify(result.calibration));
  if (result.warnings.length) log('WARNINGS:\n - ' + result.warnings.join('\n - '));
  result.files.forEach(f => log('  ' + f));
}

main().catch(e => { console.error('\nFAILED: ' + (e && e.stack || e)); process.exit(1); });
