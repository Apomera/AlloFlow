#!/usr/bin/env node
'use strict';
/*
 * verify_compiled.cjs - SPIKE (2026-11-08). Checks a compiled tutorial the way a viewer would meet it, using
 * ffprobe/ffmpeg on the FINAL MP4s (not the process that made them):
 *   1. container + codecs + that both videos decode with zero errors
 *   2. captions: soft track is a real subtitle stream (mov_text), cue count matches the script;
 *      the open-captions version really has text burned into the lower third and the soft one does not
 *   3. NARRATION PLACEMENT: each spoken beat's first audio sample vs the time the timeline says it started
 *   4. VISUAL SYNC: each logged click vs the first on-screen change after it (the cursor/ring also move,
 *      so the real answer is "does the page react where the log says it was clicked")
 *   5. text beats == script (no beat lost, no extra)
 *
 *   node verify_compiled.cjs compiled/<slug>/<slug>.steps.json
 */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const stepsPath = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(stepsPath)) { console.error('usage: node verify_compiled.cjs <slug>.steps.json'); process.exit(2); }
const dir = path.dirname(stepsPath);
const S = JSON.parse(fs.readFileSync(stepsPath, 'utf8'));
const slug = path.basename(stepsPath).replace(/\.steps\.json$/, '');
const EXPECT_DUR = S.videoSeconds || S.actualSeconds; // length of the video AFTER the sync flash
const soft = path.join(dir, slug + '.mp4'), open = path.join(dir, slug + '.open-captions.mp4');
const run = (cmd, args, o) => spawnSync(cmd, args, Object.assign({ maxBuffer: 256 * 1024 * 1024 }, o));
const checks = [];
const check = (name, ok, detail) => { checks.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  - ' + detail : '')); };
const probe = f => JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', f]).stdout.toString());

// 1. container + decode
const pv = {};
for (const [k, f] of [['soft', soft], ['open', open]]) {
  if (!fs.existsSync(f)) { check(k + ' file exists', false, f); continue; }
  const p = probe(f); pv[k] = p;
  const v = p.streams.find(s => s.codec_type === 'video'), a = p.streams.find(s => s.codec_type === 'audio');
  check(k + ': H.264 video + AAC audio', v && v.codec_name === 'h264' && a && a.codec_name === 'aac', (v && v.codec_name + ' ' + v.width + 'x' + v.height + ' ' + v.avg_frame_rate) + ' / ' + (a && a.codec_name + ' ' + a.sample_rate));
  const dur = +p.format.duration;
  check(k + ': duration matches the compile (' + EXPECT_DUR + ' s)', Math.abs(dur - EXPECT_DUR) < 0.25, dur.toFixed(2) + ' s, ' + (p.format.size / 1e6).toFixed(2) + ' MB');
  const dec = run('ffmpeg', ['-v', 'error', '-i', f, '-f', 'null', '-']);
  check(k + ': decodes with zero errors', String(dec.stderr || '').trim() === '', String(dec.stderr || '').split('\n')[0]);
}

// 2. captions
const cueCount = S.timeline.filter(b => String(b.text).trim()).length;
if (pv.soft) {
  const sub = pv.soft.streams.find(s => s.codec_type === 'subtitle');
  check('soft: a real subtitle stream (mov_text), switchable by the viewer', sub && sub.codec_name === 'mov_text', sub ? sub.codec_name + ' lang=' + (sub.tags && sub.tags.language) : 'none');
  const vtt = fs.readFileSync(path.join(dir, slug + '.vtt'), 'utf8');
  // captions are split to caption size (long beats become several short cues), so the test is: every spoken word is in the captions,
  // in order, and no cue is long enough to cover a chunk of the screen
  const cueBlocks = vtt.split(/\r?\n\r?\n/).filter(b => /-->/.test(b)).map(b => b.split(/\r?\n/).slice(2).filter(line => line.trim())); // the last cue ends with a newline: do not count the empty string after it as a line
  const norm = s => s.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const capWords = cueBlocks.flatMap(l => norm(l.join(' '))), spokenWords = S.timeline.flatMap(b => norm(b.text));
  const maxLines = Math.max(...cueBlocks.map(l => l.length)), maxChars = Math.max(...cueBlocks.map(l => l.join(' ').length));
  check('sidecar .vtt: every spoken word is captioned in order, no cue longer than 2 lines / 80 chars', capWords.join(' ') === spokenWords.join(' ') && maxLines <= 2 && maxChars <= 80, cueBlocks.length + ' cues for ' + cueCount + ' beats; longest cue ' + maxChars + ' chars / ' + maxLines + ' lines; ' + capWords.length + ' words captioned vs ' + spokenWords.length + ' spoken');
}
if (pv.soft && pv.open) {
  // burned-in check: grab a frame mid-way through the longest cue from both files and compare the lower third vs the upper two thirds
  const cue = S.timeline.slice().sort((a, b) => (b.endSec - b.startSec) - (a.endSec - a.startSec))[0];
  const t = ((cue.startSec + cue.endSec) / 2).toFixed(2);
  const grab = f => run('ffmpeg', ['-v', 'error', '-ss', t, '-i', f, '-frames:v', '1', '-vf', 'scale=320:180,format=gray', '-f', 'rawvideo', '-']).stdout;
  const a = grab(soft), b = grab(open);
  const diff =(y0, y1) => { let s = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = 0; x < 320; x++) { s += Math.abs(a[y * 320 + x] - b[y * 320 + x]); n++; } return s / n; };
  const lower = diff(120, 180), upper = diff(0, 100);
  check('open-captions: text is burned into the lower third, soft version is clean', lower > 3 && upper < 1.5, 'frame diff @' + t + 's lower third ' + lower.toFixed(2) + ', upper ' + upper.toFixed(2));
}

// 3. narration placement from the decoded audio of the final MP4
const raw = run('ffmpeg', ['-v', 'error', '-i', soft, '-vn', '-ac', '1', '-ar', '24000', '-f', 'f32le', 'pipe:1']).stdout;
const au = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.byteLength / 4));
const onset = (from, to) => { for (let i = Math.max(0, Math.floor(from * 24000)); i < Math.min(au.length, Math.floor(to * 24000)); i++) if (Math.abs(au[i]) > 0.02) return i / 24000; return null; };
// Compare against each clip's OWN first-audible-sample time (recorded when it was synthesized), so what is tested
// is placement, not how much silence a voice engine happens to put at the start of a clip.
const audioErr = [], leadMs = [];
S.timeline.forEach(b => {
  const o = onset(b.startSec - 0.15, b.startSec + 0.6);
  if (o !== null && b.clipOnsetSec !== null && b.clipOnsetSec !== undefined) { audioErr.push(Math.round((o - b.startSec - b.clipOnsetSec) * 1000)); leadMs.push(Math.round(b.clipOnsetSec * 1000)); }
});
const maxA = Math.max(...audioErr.map(Math.abs));
check('narration: every beat has audio near its start time', audioErr.length === S.timeline.length, audioErr.length + '/' + S.timeline.length + ' beats found');
check('narration placement: observed onset = timeline start + the clip\'s own onset (within 50 ms, AAC included)', audioErr.length && maxA <= 50, 'error ms per beat: ' + audioErr.join(', ') + ' (pre-roll left in each clip: ' + leadMs.join(', ') + ' ms)');
const spokenGaps = S.timeline.every((b, i) => i === 0 || b.startSec >= S.timeline[i - 1].endSec - 0.001);
check('beats never overlap in time', spokenGaps);

// 4. click timing, from a signal INDEPENDENT of the one used to calibrate the clocks (the black flash): the amber click
// ripple is drawn in the page on mousedown, so its first appearance in the FINAL video must land on the logged click time.
// A whole-frame scene-change test cannot do this: a focus ring or a typed digit changes too few pixels to register.
const vs = pv.soft && pv.soft.streams.find(s => s.codec_type === 'video');
const clicks = S.events.filter(e => e.kind === 'click');
const rippleErr = [];
if (vs) clicks.forEach(e => {
  const R = 14, cx = Math.round(e.x * vs.width), cy = Math.round(e.y * vs.height);
  const ss = Math.max(0, e.t - 0.3), t0 = Math.ceil(ss * 30 - 1e-9) / 30; // first frame at/after the seek point
  const buf = run('ffmpeg', ['-v', 'error', '-ss', ss.toFixed(3), '-t', '1.0', '-i', soft, '-vf', 'crop=' + 2 * R + ':' + 2 * R + ':' + (cx - R) + ':' + (cy - R), '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1']).stdout;
  const frameBytes = 4 * R * R * 3, n = Math.floor(buf.length / frameBytes), amber = [];
  for (let f = 0; f < n; f++) { let c = 0; for (let p = f * frameBytes; p < (f + 1) * frameBytes; p += 3) if (buf[p] > 200 && buf[p + 1] > 110 && buf[p + 1] < 205 && buf[p + 2] < 110) c++; amber.push(c); }
  const preFrames = Math.max(1, Math.floor((e.t - 0.1 - t0) * 30));
  const base = Math.max(0, ...amber.slice(0, preFrames));
  const hit = amber.findIndex((c, i) => i >= preFrames && c >= base + 6);
  if (hit >= 0) rippleErr.push(Math.round((t0 + hit / 30 - e.t) * 1000));
});
// WHAT THIS MEASURES: how late the click ripple appears in the final video compared with the logged click. It is NOT a clean clock
// test, and an earlier version of this check assumed otherwise. Measured across runs: ~1..90 ms when a click changes little on screen,
// 200..510 ms when it changes a lot (a card expanding, a whole view loading), and it varies run to run with machine load. The page's
// own paint delay (next animation frame after mousedown, recorded per click) is only 6..76 ms in those same clicks, so the app is
// not the cause: it is Playwright's screen-recording latency, which depends on how much of the frame changed. The start-of-video
// flash is a simple frame, so the calibration it gives does not fully apply to heavy frames.
// A fixed ceiling fitted to a few samples is the wrong test (it was exceeded twice), so the raw lag only gets a loose "something is
// badly broken" bound (1.5 s) plus "never early"; the criterion a viewer actually experiences is the sequence check just below:
// they must SEE the click land before they HEAR its result described. The values are printed, not hidden.
const paintMs = clicks.map(e => (typeof e.paintDelayMs === 'number' ? e.paintDelayMs : null));
check('click timing: each click ripple appears in the final video after its logged time (never early) and within 1.5 s', clicks.length > 0 && rippleErr.length === clicks.length && rippleErr.every(x => x >= -40 && x <= 1500), 'ripple-vs-log ms: ' + rippleErr.join(', ') + ' | page paint delay ms (not the cause): ' + (paintMs.every(x => x !== null) ? paintMs.join(', ') : 'partly not recorded') + ' (frames are 33 ms apart; capture latency grows with how much of the screen changes)');

// 4b. sequence on the ONE clock: a step's click happens after its action narration has finished and before its success
// narration starts (this is what "narration, captions and clicks share one zero" has to mean to a viewer)
const seqProblems = [];
clicks.forEach((e, ci) => {
  const lagSec = (rippleErr[ci] || 0) / 1000; // the viewer sees the click this much after it was logged
  const action = S.timeline.find(b => b.stepId === e.stepId && b.kind === 'action'), success = S.timeline.find(b => b.stepId === e.stepId && b.kind === 'success');
  if (!action || !success) { seqProblems.push(e.stepId + ': missing beat'); return; }
  const actionEnd = action.startSec + action.audioSec;
  if (e.t < actionEnd - 0.05) seqProblems.push(e.stepId + ': click ' + Math.round((actionEnd - e.t) * 1000) + ' ms BEFORE its instruction finished');
  if (e.t + Math.max(0, lagSec) > success.startSec + 0.05) seqProblems.push(e.stepId + ': click is VISIBLE ' + Math.round((e.t + Math.max(0, lagSec) - success.startSec) * 1000) + ' ms AFTER its result narration began');
});
check('sequence: each click is heard described, then SEEN to land (including capture lag), before its result narration begins', clicks.length > 0 && seqProblems.length === 0, seqProblems.join('; ') || clicks.map(e => { const a = S.timeline.find(b => b.stepId === e.stepId && b.kind === 'action'); return e.stepId + ' +' + Math.round((e.t - (a.startSec + a.audioSec)) * 1000) + ' ms after instruction'; }).join(', '));

// 5. script fidelity
const manifestBeats = S.manifest.steps.reduce((n, s) => n + s.beats.length, 0);
check('timeline has exactly one entry per scripted beat', S.timeline.length === manifestBeats, S.timeline.length + ' vs ' + manifestBeats);
check('no pipeline warnings', S.warnings.length === 0, S.warnings.join(' | '));
check('clock alignment found the sync flash, and the compile clock sits a sane distance after it', S.calibration.detectedVideoSec !== null && S.calibration.compileClockShiftSec >= 0 && S.calibration.compileClockShiftSec < 0.5, JSON.stringify(S.calibration));

const failed = checks.filter(c => !c.ok);
console.log('\n' + (checks.length - failed.length) + '/' + checks.length + ' checks passed');
fs.writeFileSync(path.join(dir, slug + '.verify.json'), JSON.stringify({ checks, narrationPlacementErrorMs: audioErr, clickRippleVsLogMs: rippleErr }, null, 1));
process.exit(failed.length ? 1 : 0);
