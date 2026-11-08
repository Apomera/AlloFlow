/*
 * make_fixtures.cjs - SPIKE (2026-11-07). Builds the test inputs for the storyboard renderer
 * from FICTIONAL demo pages only (fixtures/demo_tracker.html, fixtures/handout.html).
 *
 * Order matters, and it is the same order tutorial_compiler_module.js uses: NARRATION FIRST.
 *   1. Speak every narration beat (Windows SAPI here; Kokoro in production) and measure it.
 *   2. Drive + record the demo page with Playwright, pacing each step to its beat's length
 *      (start the beat, perform the action, hold until the beat is done), logging each click.
 *   3. Measure how well the logged event times line up with the recorded video.
 *   4. Screenshot the handout at 2x; take the highlight box from the DOM, not by eye.
 *   5. Lay out the storyboard from the measured durations and validate it with the same
 *      validator the renderer uses.
 *
 * Usage: node make_fixtures.cjs
 */
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const SPIKE = __dirname;
const ASSETS = path.join(SPIKE, 'assets');
const FIX = path.join(SPIKE, 'fixtures');
const W = 1280, H = 720, FPS = 30;
const log = m => process.stdout.write(m + '\n');
fs.mkdirSync(ASSETS, { recursive: true });

function mediaDuration(file) {
  const p = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const d = parseFloat(String(p.stdout || '').trim());
  if (isFinite(d) && d > 0) return d;
  // WebM written by Playwright often has no duration header: decode to null and read the last time=
  const q = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-f', 'null', '-'], { encoding: 'utf8' });
  const m = String(q.stderr || '').match(/time=(\d+):(\d+):(\d+\.\d+)/g);
  if (!m) throw new Error('cannot read duration of ' + file);
  const [h, mi, s] = m[m.length - 1].replace('time=', '').split(':').map(parseFloat);
  return h * 3600 + mi * 60 + s;
}

function sceneChanges(file) {
  const p = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-vf', "select='gt(scene,0.003)',metadata=print:file=-", '-an', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const out = [];
  let t = null;
  for (const line of String(p.stdout || '').split(/\r?\n/)) {
    const a = line.match(/pts_time:([0-9.]+)/);
    if (a) t = parseFloat(a[1]);
    const b = line.match(/lavfi\.scene_score=([0-9.]+)/);
    if (b && t !== null) { out.push({ t, score: parseFloat(b[1]) }); t = null; }
  }
  return out;
}

(async () => {
  // ---- 1. narration first ------------------------------------------------------------
  const lines = [
    { id: 'n1', text: "Let's record a progress monitoring score." },
    { id: 'n2', text: 'First, choose the student.' },
    { id: 'n3', text: 'Next, type the score.' },
    { id: 'n4', text: 'Then select Save. A new bar appears in the chart.' },
    { id: 'n5', text: 'Now check the intervention log.' },
    { id: 'n6', text: 'Week four was a shorter session, so the score dipped.' },
    { id: 'n7', text: "That's it. Practice with a demo student first." },
  ];
  fs.writeFileSync(path.join(ASSETS, '_lines.json'), JSON.stringify(lines));
  const tts = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(FIX, 'tts.ps1'), '-LinesJson', path.join(ASSETS, '_lines.json'), '-OutDir', ASSETS, '-Rate', '1'], { encoding: 'utf8' });
  if (tts.status !== 0) throw new Error('SAPI narration failed: ' + (tts.stderr || tts.stdout));
  log(String(tts.stdout).trim());
  fs.rmSync(path.join(ASSETS, '_lines.json'));
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=1000:duration=0.15', '-ar', '48000', '-ac', '1', path.join(ASSETS, 'beep.wav')]);
  const dur = {};
  lines.forEach(l => { dur[l.id] = mediaDuration(path.join(ASSETS, l.id + '.wav')); });
  log('beat durations: ' + JSON.stringify(Object.fromEntries(Object.entries(dur).map(([k, v]) => [k, +v.toFixed(2)]))));

  // ---- 2. drive + record the demo page, paced to the beats -----------------------------
  const tmpVid = path.join(ASSETS, '_rec');
  fs.rmSync(tmpVid, { recursive: true, force: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: tmpVid, size: { width: W, height: H } } });
  const page = await ctx.newPage();
  const t0 = Date.now();
  await page.goto(pathToFileURL(path.join(FIX, 'demo_tracker.html')).href);
  const nowRec = () => (Date.now() - t0) / 1000;
  const events = [];
  const beatStartRec = {};
  const clickEl = async sel => {
    const b = await page.locator(sel).boundingBox();
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    await page.mouse.move(x, y, { steps: 18 });
    await page.waitForTimeout(250);
    const t = nowRec();
    await page.mouse.click(x, y);
    events.push({ kind: 'click', t, x: x / W, y: y / H, target: sel });
  };
  const beat = async (id, action, tail) => {
    await page.waitForTimeout(400);
    beatStartRec[id] = nowRec();          // the narration for this step starts here
    await page.waitForTimeout(450);       // the viewer hears the first words, then the action happens
    await action();
    const holdUntil = beatStartRec[id] + dur[id] + tail; // never move on before the beat is finished
    await page.waitForTimeout(Math.max(0, (holdUntil - nowRec()) * 1000));
  };
  await page.waitForTimeout(500);
  await beat('n2', () => clickEl('#sb'), 0.4);
  await beat('n3', async () => {
    await clickEl('#score');
    events.push({ kind: 'key', t: nowRec(), target: '#score' });
    await page.keyboard.type('47', { delay: 250 });
  }, 0.4);
  await beat('n4', () => clickEl('#save'), 1.0);
  const video = page.video();
  await ctx.close();
  fs.copyFileSync(await video.path(), path.join(ASSETS, 'screen.webm'));
  fs.rmSync(tmpVid, { recursive: true, force: true });
  log('recorded screen.webm, ' + events.length + ' events');

  // ---- 3. event-log <-> video alignment -------------------------------------------------
  const screenFile = path.join(ASSETS, 'screen.webm');
  const screenDur = mediaDuration(screenFile);
  const scenes = sceneChanges(screenFile);
  const calib = [];
  for (const e of events.filter(ev => ev.kind === 'click')) {
    const near = scenes.filter(s => s.t >= e.t - 0.3 && s.t <= e.t + 1.0).sort((a, b) => b.score - a.score)[0];
    if (near) calib.push({ target: e.target, loggedT: +e.t.toFixed(3), videoT: +near.t.toFixed(3), offsetSec: +(near.t - e.t).toFixed(3), score: +near.score.toFixed(4) });
  }
  const saveCal = calib.find(c => c.target === '#save'); // biggest visible change (banner + new bar)
  const offset = saveCal ? saveCal.offsetSec : 0;
  events.forEach(e => { e.t = +(e.t + offset).toFixed(3); });
  Object.keys(beatStartRec).forEach(k => { beatStartRec[k] = +(beatStartRec[k] + offset).toFixed(3); });
  fs.writeFileSync(path.join(ASSETS, 'events.json'), JSON.stringify(events, null, 1));
  log('calibration: ' + JSON.stringify(calib) + '  -> applied offset ' + offset + ' s');

  // ---- 4. the document clip ---------------------------------------------------------------
  const ctx2 = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  const p2 = await ctx2.newPage();
  await p2.goto(pathToFileURL(path.join(FIX, 'handout.html')).href);
  const c3 = await p2.locator('#row-week4 td:nth-child(3)').boundingBox();
  const c4 = await p2.locator('#row-week4 td:nth-child(4)').boundingBox();
  const bx = Math.min(c3.x, c4.x), by = Math.min(c3.y, c4.y);
  const bw = Math.max(c3.x + c3.width, c4.x + c4.width) - bx, bh = Math.max(c3.y + c3.height, c4.y + c4.height) - by;
  const rect = [bx / W, by / H, bw / W, bh / H].map(n => +n.toFixed(4));
  const focus = { x: +((bx + bw / 2) / W).toFixed(4), y: +((by + bh / 2) / H).toFixed(4) };
  await p2.screenshot({ path: path.join(ASSETS, 'handout.png') });
  await browser.close();
  log('handout.png  highlight rect ' + JSON.stringify(rect));

  // ---- 5. lay out the storyboard from measured durations ---------------------------------------
  const r3 = n => +n.toFixed(3);
  const TITLE1 = r3(Math.max(3.0, 0.3 + dur.n1 + 0.7));          // intro beat finishes 0.7 s before the cut
  const SCREEN_START = TITLE1;
  const DOC_START = r3(SCREEN_START + screenDur);
  const n5 = r3(DOC_START + 0.5);                                 // beat 5 after the cut (clear of the beep)
  const n6 = r3(n5 + dur.n5 + 0.5);
  const zoomRel = r3(n6 - DOC_START - 0.4);                       // zoom starts just before beat 6, lands 1.2 s later
  const DOC_DUR = r3(zoomRel + 1.2 + dur.n6 + 0.4 + 1.0);
  const END_START = r3(DOC_START + DOC_DUR);
  const n7 = r3(END_START + 0.5);
  const TOTAL = r3(n7 + dur.n7 + 1.2);
  const start = {
    n1: 0.3,
    n2: r3(SCREEN_START + beatStartRec.n2), n3: r3(SCREEN_START + beatStartRec.n3), n4: r3(SCREEN_START + beatStartRec.n4),
    n5, n6, n7,
  };
  const beeps = [TITLE1, DOC_START, END_START];
  // narration must not overlap itself or a sync beep; fail loudly instead of shipping a bad layout
  const spans = lines.map(l => ({ id: l.id, a: start[l.id], b: start[l.id] + dur[l.id] })).sort((x, y) => x.a - y.a);
  spans.forEach((s, i) => { if (i && s.a < spans[i - 1].b + 0.05) throw new Error('narration overlap: ' + spans[i - 1].id + ' / ' + s.id); });
  spans.forEach(s => beeps.forEach(b => { if (s.a < b + 0.3 && s.b > b - 0.15) throw new Error('narration ' + s.id + ' overlaps the sync beep at ' + b); }));

  const assets = { screen: 'assets/screen.webm', events: 'assets/events.json', page: 'assets/handout.png', beep: 'assets/beep.wav' };
  lines.forEach(l => { assets[l.id] = 'assets/' + l.id + '.wav'; });
  const clips = [
    { track: 'title', start: 0, end: TITLE1, text: 'Recording a progress monitoring score', sub: 'Demo data only - fictional students' },
    { track: 'screen', start: SCREEN_START, end: DOC_START, asset: 'screen', srcStart: 0, events: 'events', camera: 'auto-from-events' },
    { track: 'document', start: DOC_START, end: END_START, asset: 'page',
      camera: [{ t: 0, x: 0.5, y: 0.5, scale: 1 }, { t: zoomRel, x: 0.5, y: 0.5, scale: 1 }, { t: r3(zoomRel + 1.2), x: focus.x, y: focus.y, scale: 2.1 }, { t: r3(DOC_DUR - 1.0), x: focus.x, y: focus.y, scale: 2.1 }, { t: DOC_DUR, x: 0.5, y: 0.5, scale: 1 }] },
    { track: 'highlight', anchor: 'document', start: r3(DOC_START + zoomRel + 1.2), end: r3(END_START - 0.6), rect, label: 'Shorter session' },
    { track: 'title', start: END_START, end: TOTAL, text: 'Practice with a demo student first', sub: 'Then try it with your own caseload' },
  ];
  lines.forEach(l => clips.push({ track: 'caption', start: start[l.id], end: r3(start[l.id] + dur[l.id] + 0.25), text: l.text }));
  const audio = lines.map(l => ({ asset: l.id, start: start[l.id] }));
  beeps.forEach(b => audio.push({ asset: 'beep', start: b, gain: 0.5 }));
  const sb = { version: 0, width: W, height: H, fps: FPS, assets, clips, audio };

  const { validateStoryboard } = await import(pathToFileURL(path.join(SPIKE, 'storyboard.js')).href);
  const v = validateStoryboard(sb);
  if (!v.ok) throw new Error('generated storyboard is invalid:\n - ' + v.errors.join('\n - '));
  fs.writeFileSync(path.join(SPIKE, 'sample_storyboard.json'), JSON.stringify(sb, null, 1));
  fs.writeFileSync(path.join(SPIKE, 'fixtures_report.json'), JSON.stringify({
    screenDurSec: r3(screenDur), calibration: calib, appliedOffsetSec: offset,
    cuts: { titleToScreen: TITLE1, screenToDocument: DOC_START, documentToEnd: END_START }, totalSec: TOTAL,
    narrationStart: start, narrationDur: Object.fromEntries(Object.entries(dur).map(([k, v2]) => [k, r3(v2)])),
  }, null, 1));
  log('wrote sample_storyboard.json (' + TOTAL.toFixed(1) + ' s) - valid. cuts at ' + [TITLE1, DOC_START, END_START].join(', '));
})().catch(e => { console.error(e); process.exit(1); });
