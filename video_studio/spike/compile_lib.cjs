'use strict';
// compile_lib.cjs - SPIKE (2026-11-08). Pure helpers for compile_tutorial.cjs: no browser, no
// ffmpeg, no TTS, so every piece here is unit-tested (compile_tutorial.test.mjs).
//
// The pipeline contract is the REAL tutorial_compiler_module.js: a workflow is mapped onto its
// GUIDED_STEPS shape ({id,label,action,success} + an id->anchor map), buildTutorialManifest()
// makes the script, and compileTutorial() runs it against the adapters in compile_tutorial.cjs.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const WORKFLOW_VERSION = 'workflow-1';
const ACTION_KINDS = ['none', 'click', 'type', 'press', 'goto', 'wait', 'waitFor'];
const SETUP_KINDS = ACTION_KINDS.filter(k => k !== 'none');
const RESERVED_IDS = ['__intro', '__outro'];
const ID_RE = /^[a-z0-9][a-z0-9_-]{0,40}$/;
const isEvenInt = n => Number.isInteger(n) && n > 0 && n % 2 === 0;

function validateAction(a, at, err, allowed) {
  const kinds = allowed || ACTION_KINDS;
  if (!a || typeof a !== 'object') { err(at + ' must be an object'); return; }
  if (!kinds.includes(a.kind)) { err(at + '.kind "' + a.kind + '" is not one of ' + kinds.join(', ')); return; }
  if (['click', 'type', 'press', 'waitFor'].includes(a.kind) && !String(a.selector || '').trim()) err(at + '.selector is required for ' + a.kind);
  if (a.kind === 'type' && typeof a.text !== 'string') err(at + '.text is required for type');
  if (a.kind === 'type' && a.delayMs !== undefined && !(typeof a.delayMs === 'number' && a.delayMs >= 0 && a.delayMs <= 300)) err(at + '.delayMs must be 0..300');
  if (a.kind === 'press' && !String(a.key || '').trim()) err(at + '.key is required for press');
  if (a.kind === 'goto' && !String(a.url || '').trim()) err(at + '.url is required for goto');
  if (a.kind === 'wait' && !(typeof a.ms === 'number' && a.ms >= 0 && a.ms <= 15000)) err(at + '.ms must be 0..15000');
  if (a.kind === 'waitFor') {
    if (a.state !== undefined && !['visible', 'hidden'].includes(a.state)) err(at + '.state must be "visible" or "hidden"');
    if (a.timeoutMs !== undefined && !(typeof a.timeoutMs === 'number' && a.timeoutMs >= 0 && a.timeoutMs <= 180000)) err(at + '.timeoutMs must be 0..180000');
  }
}

// ---- workflow validation ---------------------------------------------------------
// A workflow is DATA an agent (or a person) can write and review before anything runs.
function validateWorkflow(w) {
  const errors = [];
  const err = m => errors.push(m);
  if (!w || typeof w !== 'object') return { ok: false, errors: ['workflow must be an object'] };
  if (w.version !== WORKFLOW_VERSION) err('version must be "' + WORKFLOW_VERSION + '"');
  if (!String(w.title || '').trim()) err('title is required');
  const vp = w.viewport || { width: 1280, height: 720 };
  if (!isEvenInt(vp.width) || !isEvenInt(vp.height)) err('viewport width and height must be even positive integers');
  if (!w.start || !String(w.start.url || '').trim()) err('start.url is required');
  // setup runs BEFORE recording starts (dismiss a launcher, wait for lazy modules): none of it appears in the video
  if (w.start && w.start.setup !== undefined) {
    if (!Array.isArray(w.start.setup)) err('start.setup must be a list of actions');
    else w.start.setup.forEach((a, j) => validateAction(a, 'start.setup[' + j + ']', err, SETUP_KINDS));
  }
  ['intro', 'outro'].forEach(k => {
    if (w[k] !== undefined && (!w[k] || !String(w[k].text || '').trim())) err(k + ' needs text');
  });
  if (!Array.isArray(w.steps) || !w.steps.length) { err('steps must be a non-empty array'); return { ok: false, errors }; }
  const seen = new Set();
  w.steps.forEach((s, i) => {
    const at = 'steps[' + i + ']';
    if (!s || typeof s !== 'object') { err(at + ' must be an object'); return; }
    if (RESERVED_IDS.includes(s.id)) err(at + '.id "' + s.id + '" is reserved');
    else if (!ID_RE.test(String(s.id || ''))) err(at + '.id must be lowercase letters, digits, - or _ (got "' + s.id + '")');
    else if (seen.has(s.id)) err(at + '.id "' + s.id + '" is duplicated');
    else seen.add(s.id);
    if (!String(s.label || '').trim()) err(at + '.label is required (it is spoken before the instruction)');
    const n = s.narration || {};
    if (!String(n.action || '').trim()) err(at + '.narration.action is required');
    if (String(n.action || '').length > 300 || String(n.success || '').length > 300) err(at + ' narration is over 300 characters; split the step');
    if (s.anchor !== undefined && s.anchor !== null && !String(s.anchor).trim()) err(at + '.anchor must be a CSS selector or null');
    if (s.pauseAfter !== undefined && !(typeof s.pauseAfter === 'number' && s.pauseAfter >= 0 && s.pauseAfter <= 8)) err(at + '.pauseAfter must be 0..8 seconds');
    // one action, or a list run in order (e.g. choose "Paste text", type the passage, press "Use this source")
    if (Array.isArray(s.action) && !s.action.length) err(at + '.action must not be an empty list');
    const list = Array.isArray(s.action) ? s.action : [s.action || { kind: 'none' }];
    list.forEach((a, j) => validateAction(a, at + '.action' + (Array.isArray(s.action) ? '[' + j + ']' : ''), err));
    // text that must be visible once the step has run: the narration names it, so if it is not there the script is out of date
    if (s.expect !== undefined && !(Array.isArray(s.expect) && s.expect.every(x => typeof x === 'string' && x.trim()))) err(at + '.expect must be a list of non-empty strings');
  });
  return { ok: errors.length === 0, errors };
}

// ---- workflow -> the real compiler's input shape -----------------------------------
function toGuidedSteps(w) {
  const guidedSteps = [], tourMap = {}, actions = {}, pauseAfter = {}, expects = {};
  if (w.intro) {
    guidedSteps.push({ id: '__intro', label: w.intro.label || w.title, action: w.intro.text, success: '' });
    tourMap.__intro = null; actions.__intro = { kind: 'none' };
  }
  w.steps.forEach(s => {
    guidedSteps.push({ id: s.id, label: s.label, action: s.narration.action, success: s.narration.success || '' });
    tourMap[s.id] = s.anchor || null;
    actions[s.id] = s.action || { kind: 'none' };
    pauseAfter[s.id] = s.pauseAfter === undefined ? 0.4 : s.pauseAfter;
    expects[s.id] = s.expect || [];
  });
  if (w.outro) {
    guidedSteps.push({ id: '__outro', label: w.outro.label || 'Done', action: w.outro.text, success: '' });
    tourMap.__outro = null; actions.__outro = { kind: 'none' };
  }
  return { guidedSteps, tourMap, actions, pauseAfter, expects };
}

// ---- the REAL guided-mode data -----------------------------------------------------
// A workflow step with "fromGuided": "<id>" takes its spoken label / instruction / result and its anchor from AlloFlow's own
// GUIDED_STEPS + GUIDED_TOUR_MAP, so the narration is the product's wording, not a copy that can drift. Anything the step
// states itself wins (an explicit "success": "" drops the result beat, for a step that stops short of the result).
function loadGuidedConfig(repoRoot) {
  const file = path.join(repoRoot, 'guided_mode_config_module.js');
  const sandbox = { window: { AlloModules: {} }, console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  const cfg = sandbox.window.AlloModules.GuidedModeConfig;
  if (!cfg || !Array.isArray(cfg.GUIDED_STEPS) || !cfg.GUIDED_TOUR_MAP) throw new Error('guided_mode_config_module.js did not register GuidedModeConfig');
  const plain = v => JSON.parse(JSON.stringify(v));
  return { steps: plain(cfg.GUIDED_STEPS), tourMap: plain(cfg.GUIDED_TOUR_MAP) };
}

function resolveGuidedRefs(w, guided) {
  const out = JSON.parse(JSON.stringify(w));
  (out.steps || []).forEach((s, i) => {
    if (!s || s.fromGuided === undefined) return;
    const g = guided.steps.find(x => x.id === s.fromGuided);
    if (!g) throw new Error('steps[' + i + '].fromGuided "' + s.fromGuided + '" is not a guided-mode step id');
    if (s.label === undefined) s.label = g.label;
    s.narration = Object.assign({}, s.narration);
    if (s.narration.action === undefined) s.narration.action = g.action;
    if (s.narration.success === undefined) s.narration.success = g.success || '';
    if (s.anchor === undefined && guided.tourMap[g.id]) s.anchor = '#' + guided.tourMap[g.id];
  });
  return out;
}

// Load the REAL tutorial_compiler_module.js (a browser IIFE) into a Node vm context with just
// enough `window` for it to register itself. No copy, no re-implementation.
function loadCompiler(repoRoot) {
  const file = path.join(repoRoot, 'tutorial_compiler_module.js');
  const sandbox = { window: { AlloModules: {} }, console: { log() {}, warn() {}, error() {} }, performance, setTimeout, clearTimeout };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  const TC = sandbox.window.AlloModules.TutorialCompiler;
  if (!TC || typeof TC.compileTutorial !== 'function') throw new Error('tutorial_compiler_module.js did not register TutorialCompiler');
  // Objects built inside a vm context carry that realm's Array/Object prototypes, so deepStrictEqual,
  // `instanceof Array` and friends misbehave on them. The manifest is pure data: hand back plain,
  // main-realm copies. compileTutorial is passed through untouched (its result may hold a Blob/path).
  const plain = v => JSON.parse(JSON.stringify(v));
  return {
    narrationForStep: (...a) => plain(TC.narrationForStep(...a)),
    estimateNarrationSeconds: TC.estimateNarrationSeconds,
    buildTutorialManifest: (...a) => plain(TC.buildTutorialManifest(...a)),
    compileTutorial: TC.compileTutorial,
  };
}

// ---- audio ---------------------------------------------------------------------------
function resampleLinear(samples, from, to) {
  if (from === to) return samples;
  const n = Math.max(1, Math.round(samples.length * to / from));
  const out = new Float32Array(n);
  const ratio = (samples.length - 1) / Math.max(1, n - 1);
  for (let i = 0; i < n; i++) {
    const p = i * ratio, i0 = Math.floor(p), i1 = Math.min(samples.length - 1, i0 + 1), f = p - i0;
    out[i] = samples[i0] * (1 - f) + samples[i1] * f;
  }
  return out;
}

// clips: [{startSec, samples:Float32Array, sampleRate}] -> one mono Float32Array at `rate`, `totalSec` long.
// Clips are SUMMED (then clamped), and any overlap longer than 10 ms is reported, because overlapping
// narration is a pacing bug, not something to mix over silently.
function mixNarration(clips, totalSec, rate) {
  const out = new Float32Array(Math.max(1, Math.round(totalSec * rate)));
  const placed = [], overlaps = [], clipped = [];
  clips.forEach((c, i) => {
    const s = resampleLinear(c.samples, c.sampleRate, rate);
    const at = Math.max(0, Math.round(c.startSec * rate));
    const end = at + s.length;
    if (end > out.length) clipped.push({ index: i, lostSec: +((end - out.length) / rate).toFixed(3) });
    for (let k = 0; k < s.length && at + k < out.length; k++) out[at + k] += s[k];
    placed.push({ index: i, startSample: at, endSample: Math.min(end, out.length) });
  });
  const sorted = placed.slice().sort((a, b) => a.startSample - b.startSample);
  for (let i = 1; i < sorted.length; i++) {
    const ov = (sorted[i - 1].endSample - sorted[i].startSample) / rate;
    if (ov > 0.01) overlaps.push({ a: sorted[i - 1].index, b: sorted[i].index, overlapSec: +ov.toFixed(3) });
  }
  let peak = 0;
  for (let i = 0; i < out.length; i++) { const a = Math.abs(out[i]); if (a > peak) peak = a; if (a > 1) out[i] = out[i] > 0 ? 1 : -1; }
  return { samples: out, placed, overlaps, clipped, peak: +peak.toFixed(3) };
}

// First sample whose magnitude passes `thresh`, in seconds (null if the clip is silent).
function firstOnsetSec(samples, rate, thresh) {
  const t = thresh === undefined ? 0.02 : thresh;
  for (let i = 0; i < samples.length; i++) if (Math.abs(samples[i]) > t) return i / rate;
  return null;
}

// TTS engines pad each clip with silence (Kokoro: about 0.3 s up front). Left in, the caption appears a third of a second
// before the voice and every beat is held that much longer. Trim to a short pre-roll/tail instead of to zero, so the
// speech does not start or stop abruptly. An all-silent clip is returned untouched rather than emptied.
function trimSilence(samples, rate, opts) {
  const o = Object.assign({ thresh: 0.01, keepLead: 0.06, keepTail: 0.12 }, opts || {});
  let first = -1, last = -1;
  for (let i = 0; i < samples.length; i++) if (Math.abs(samples[i]) > o.thresh) { first = i; break; }
  if (first < 0) return { samples, trimmedLeadSec: 0, trimmedTailSec: 0 };
  for (let i = samples.length - 1; i >= 0; i--) if (Math.abs(samples[i]) > o.thresh) { last = i; break; }
  const from = Math.max(0, first - Math.round(o.keepLead * rate)), to = Math.min(samples.length, last + 1 + Math.round(o.keepTail * rate));
  return { samples: samples.slice(from, to), trimmedLeadSec: from / rate, trimmedTailSec: (samples.length - to) / rate };
}

function writeWavPcm16(samples, rate) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    data.writeInt16LE(Math.round(v < 0 ? v * 32768 : v * 32767), i * 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

// Reads PCM16 / float32 mono-or-stereo WAV -> {samples:Float32Array(mono), sampleRate}
function readWav(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') throw new Error('not a WAV file');
  let p = 12, fmt = null, data = null;
  while (p + 8 <= buf.length) {
    const id = buf.toString('ascii', p, p + 4), size = buf.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { tag: buf.readUInt16LE(p + 8), ch: buf.readUInt16LE(p + 10), rate: buf.readUInt32LE(p + 12), bits: buf.readUInt16LE(p + 22) };
    if (id === 'data') { data = buf.subarray(p + 8, Math.min(buf.length, p + 8 + size)); break; }
    p += 8 + size + (size % 2);
  }
  if (!fmt || !data) throw new Error('WAV is missing fmt or data');
  const bytes = fmt.bits / 8, frames = Math.floor(data.length / (bytes * fmt.ch));
  const out = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let c = 0; c < fmt.ch; c++) {
      const o = (i * fmt.ch + c) * bytes;
      sum += fmt.tag === 3 && fmt.bits === 32 ? data.readFloatLE(o) : fmt.bits === 16 ? data.readInt16LE(o) / 32768 : (() => { throw new Error('unsupported WAV format ' + fmt.tag + '/' + fmt.bits); })();
    }
    out[i] = sum / fmt.ch;
  }
  return { samples: out, sampleRate: fmt.rate };
}

// ---- captions + transcript ------------------------------------------------------------
function wrapCaption(text, maxChars) {
  const flat = String(text).replace(/\s+/g, ' ').trim();
  const max = maxChars || 42;
  if (flat.length <= max) return flat;
  // up to ~2 lines of text: break at the space nearest the middle, so two BALANCED lines (a greedy wrap can strand a third line)
  if (flat.length <= 2 * max + 8) {
    let best = -1, bestDiff = Infinity;
    for (let i = 0; i < flat.length; i++) {
      if (flat[i] !== ' ') continue;
      const a = i, b = flat.length - i - 1;
      // a break right after . , ; ! ? reads better than one mid-phrase, so it wins unless it is clearly less balanced
      const score = Math.abs(a - b) - (/[.,;!?]/.test(flat[i - 1]) ? 14 : 0);
      if (a <= max + 8 && b <= max + 8 && score < bestDiff) { best = i; bestDiff = score; }
    }
    if (best > 0) return flat.slice(0, best) + '\n' + flat.slice(best + 1);
  }
  const words = flat.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if (line && (line + ' ' + w).length > (maxChars || 42)) { lines.push(line); line = w; } else line = line ? line + ' ' + w : w;
  }
  if (line) lines.push(line);
  return lines.join('\n');
}

// One cue per spoken beat, timed to the audio that was actually played. Cues never overlap.
// Break a long spoken beat into caption-sized pieces (two short lines at most) at sentence / clause boundaries, never mid-word,
// and keep every word, in order. A 2-sentence beat shown as one 5-line caption covers a quarter of the screen.
function splitCaption(text, maxChars) {
  const max = maxChars || 80;
  const flat = String(text).replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return [flat];
  const pieces = (flat.match(/[^.!?;]+[.!?;]+\s*|[^.!?;]+$/g) || [flat]).map(p => p.trim()).filter(Boolean);
  const small = [];
  for (const p of pieces) {
    if (p.length <= max) { small.push(p); continue; }
    let cur = '';
    for (const w of p.split(' ')) { if (cur && (cur + ' ' + w).length > max) { small.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
    if (cur) small.push(cur);
  }
  const out = [];
  for (const p of small) { if (out.length && (out[out.length - 1] + ' ' + p).length <= max) out[out.length - 1] += ' ' + p; else out.push(p); }
  return out;
}

function cuesFromTimeline(timeline, opts) {
  const o = Object.assign({ minDur: 0.6, tail: 0.1, maxChars: 80 }, opts || {});
  const cues = [];
  (timeline || []).filter(b => b && String(b.text || '').trim()).forEach(b => {
    const start = b.startSec, end = Math.max(b.startSec + o.minDur, b.endSec - o.tail);
    const parts = splitCaption(b.text, o.maxChars), total = parts.reduce((n, p) => n + p.length + 1, 0);
    let at = start; // no word timings from the voice engine, so each piece gets a share of the beat proportional to its length
    parts.forEach((p, i) => {
      const share = (end - start) * (p.length + 1) / total;
      cues.push({ start: at, end: i === parts.length - 1 ? end : at + share, text: p, stepId: b.stepId, kind: b.kind });
      at += share;
    });
  });
  cues.sort((a, b) => a.start - b.start);
  // Non-overlap beats minimum duration: a cue that would run into the next one is cut short, not the other way round.
  for (let i = 0; i + 1 < cues.length; i++) {
    // trim only a real overlap, to TOUCHING (no gap): a safety margin here would leave a frame with no caption between pieces
    if (cues[i].end > cues[i + 1].start) cues[i].end = cues[i + 1].start;
    if (cues[i].end <= cues[i].start + 0.01) { // two beats starting (almost) together: keep both readable in order
      cues[i].end = cues[i].start + 0.01;
      cues[i + 1].start = Math.max(cues[i + 1].start, cues[i].end + 0.01);
    }
  }
  return cues;
}

function stamp(sec, sep) {
  const s = Math.max(0, sec), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), whole = Math.floor(s % 60);
  const ms = Math.min(999, Math.round((s - Math.floor(s)) * 1000));
  const p = (n, w) => String(n).padStart(w, '0');
  return p(h, 2) + ':' + p(m, 2) + ':' + p(whole, 2) + sep + p(ms, 3);
}
const srtFromCues = cues => cues.map((c, i) => (i + 1) + '\n' + stamp(c.start, ',') + ' --> ' + stamp(c.end, ',') + '\n' + wrapCaption(c.text) + '\n').join('\n');
const vttFromCues = cues => 'WEBVTT\n\n' + cues.map((c, i) => (i + 1) + '\n' + stamp(c.start, '.') + ' --> ' + stamp(c.end, '.') + '\n' + wrapCaption(c.text) + '\n').join('\n');

// The written how-to that ships beside the video: same steps, same words, no video needed.
function transcriptMarkdown(workflow, manifest) {
  const lines = ['# ' + workflow.title, ''];
  if (workflow.intro) lines.push(workflow.intro.text, '');
  let n = 0;
  manifest.steps.filter(s => !String(s.id).startsWith('__')).forEach(s => {
    n += 1;
    const action = s.beats.find(b => b.kind === 'action'), success = s.beats.find(b => b.kind === 'success');
    lines.push(n + '. ' + (action ? action.text : s.label) + (success ? '  \n   Result: ' + success.text : ''));
  });
  if (workflow.outro) lines.push('', workflow.outro.text);
  lines.push('', '_Generated from the same workflow script as the video. Demo data only._', '');
  return lines.join('\n');
}

module.exports = { WORKFLOW_VERSION, ACTION_KINDS, validateWorkflow, toGuidedSteps, loadGuidedConfig, resolveGuidedRefs, loadCompiler, resampleLinear, mixNarration, firstOnsetSec, trimSilence, writeWavPcm16, readWav, wrapCaption, splitCaption, cuesFromTimeline, srtFromCues, vttFromCues, transcriptMarkdown };
