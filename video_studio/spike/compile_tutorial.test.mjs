// Run: node --test compile_tutorial.test.mjs  (Node's built-in runner, not vitest)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const L = require('./compile_lib.cjs');
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const demo = () => JSON.parse(fs.readFileSync(path.join(here, 'workflows', 'demo_tracker.workflow.json'), 'utf8'));
const errs = w => L.validateWorkflow(w).errors.join(' | ');

test('the shipped demo workflow is valid', () => {
  const r = L.validateWorkflow(demo());
  assert.deepEqual(r.errors, []);
});

test('validateWorkflow rejects the mistakes an agent is likely to make', () => {
  let w = demo(); w.version = 'workflow-0'; assert.match(errs(w), /version/);
  w = demo(); w.viewport = { width: 1281, height: 720 }; assert.match(errs(w), /even/);
  w = demo(); w.title = ' '; assert.match(errs(w), /title/);
  w = demo(); w.steps[1].id = w.steps[0].id; assert.match(errs(w), /duplicated/);
  w = demo(); w.steps[0].id = '__intro'; assert.match(errs(w), /reserved/);
  w = demo(); w.steps[0].id = 'Has Spaces'; assert.match(errs(w), /lowercase/);
  w = demo(); delete w.steps[0].action.selector; assert.match(errs(w), /selector is required/);
  w = demo(); delete w.steps[1].action.text; assert.match(errs(w), /text is required for type/);
  w = demo(); w.steps[0].action = { kind: 'press' }; assert.match(errs(w), /selector is required|key is required/);
  w = demo(); w.steps[0].action = { kind: 'teleport' }; assert.match(errs(w), /not one of/);
  w = demo(); w.steps[0].action = { kind: 'wait', ms: 99999 }; assert.match(errs(w), /ms must be/);
  w = demo(); w.steps[0].pauseAfter = 20; assert.match(errs(w), /pauseAfter/);
  w = demo(); w.steps[0].narration.action = 'x'.repeat(301); assert.match(errs(w), /300 characters/);
  w = demo(); w.steps[0].label = ''; assert.match(errs(w), /label is required/);
  w = demo(); w.steps = []; assert.match(errs(w), /non-empty/);
  w = demo(); delete w.start; assert.match(errs(w), /start\.url/);
  assert.equal(L.validateWorkflow(null).ok, false);
});

test('toGuidedSteps maps onto the real compiler shape: intro, steps in order, outro, anchors and actions kept', () => {
  const g = L.toGuidedSteps(demo());
  assert.deepEqual(g.guidedSteps.map(s => s.id), ['__intro', 'choose-student', 'enter-score', 'save-score', '__outro']);
  assert.equal(g.tourMap['choose-student'], '#sb');
  assert.equal(g.tourMap.__intro, null);
  assert.equal(g.actions['enter-score'].kind, 'type');
  assert.equal(g.pauseAfter['save-score'], 1.2);
  assert.equal(g.pauseAfter['choose-student'], 0.4, 'default settle time');
});

test('the REAL tutorial_compiler_module.js builds the script: label is spoken before the instruction', () => {
  const TC = L.loadCompiler(repoRoot);
  const g = L.toGuidedSteps(demo());
  const m = TC.buildTutorialManifest(g.guidedSteps, g.tourMap, null, { wpm: 150 });
  assert.equal(m.stepCount, 5);
  const s1 = m.steps.find(s => s.id === 'choose-student');
  assert.equal(s1.anchorId, '#sb');
  assert.deepEqual(s1.beats.map(b => b.kind), ['action', 'success']);
  assert.equal(s1.beats[0].text, 'Choose the student. Select Student B from the list.');
  assert.equal(s1.beats[1].text, 'Student B is now selected.');
  assert.equal(m.steps[0].anchorId, null, 'the intro has no anchor');
  assert.equal(m.steps[0].beats.length, 1, 'the intro has no success beat');
  assert.ok(m.totalSeconds > 8 && m.totalSeconds < 40, 'estimated length is plausible: ' + m.totalSeconds);
});

test('compileTutorial run order with this wiring: spotlight, action beat, performStep, success beat; cleanup on failure', async () => {
  const TC = L.loadCompiler(repoRoot);
  const g = L.toGuidedSteps(demo());
  const m = TC.buildTutorialManifest(g.guidedSteps, g.tourMap, null, {});
  const calls = [];
  let clock = 0;
  const mkDeps = failAt => ({
    now: () => clock, log: () => {},
    startCapture: async () => { calls.push('start'); return { stop: async () => { calls.push('stop'); return { path: 'x.webm' }; } }; },
    spotlight: async a => { calls.push('spot:' + a); },
    performStep: async s => { calls.push('do:' + s.id); if (s.id === failAt) throw new Error('boom'); },
    speak: async (t, c) => { calls.push('say:' + c.step.id + ':' + c.beat.kind); clock += 1; },
  });
  const ok = await TC.compileTutorial(m, mkDeps(null));
  assert.equal(ok.ok, true);
  const i = calls.indexOf('spot:#sb');
  assert.deepEqual(calls.slice(i, i + 4), ['spot:#sb', 'say:choose-student:action', 'do:choose-student', 'say:choose-student:success']);
  assert.equal(calls[0], 'start');
  assert.equal(calls[calls.length - 1], 'stop');
  assert.equal(ok.timeline.length, 1 + 2 + 2 + 2 + 1, 'one timeline entry per spoken beat');
  assert.ok(ok.timeline.every((b, j) => j === 0 || b.startSec >= ok.timeline[j - 1].endSec), 'beats do not overlap in time');
  calls.length = 0;
  await assert.rejects(() => TC.compileTutorial(m, mkDeps('enter-score')), /boom/);
  assert.ok(calls.includes('stop'), 'capture is stopped even when a step fails');
});

test('mixNarration places each clip at its exact sample, sums, reports overlap and clipping', () => {
  const rate = 1000;
  const one = new Float32Array(100).fill(0.5);
  const r = L.mixNarration([{ startSec: 0.25, samples: one, sampleRate: rate }, { startSec: 1.0, samples: one, sampleRate: rate }], 2, rate);
  assert.equal(r.samples.length, 2000);
  assert.equal(r.samples[249], 0); assert.equal(r.samples[250], 0.5); assert.equal(r.samples[349], 0.5); assert.equal(r.samples[350], 0);
  assert.equal(r.samples[1000], 0.5);
  assert.deepEqual(r.overlaps, []);
  const o = L.mixNarration([{ startSec: 0, samples: one, sampleRate: rate }, { startSec: 0.05, samples: one, sampleRate: rate }], 1, rate);
  assert.equal(o.overlaps.length, 1);
  assert.equal(o.samples[60], 1, 'overlapping 0.5 + 0.5 sums to 1 (clamped at 1)');
  const c = L.mixNarration([{ startSec: 0.95, samples: one, sampleRate: rate }], 1, rate);
  assert.equal(c.clipped.length, 1);
  assert.ok(Math.abs(c.clipped[0].lostSec - 0.05) < 1e-9);
  const loud = L.mixNarration([{ startSec: 0, samples: new Float32Array(10).fill(0.9), sampleRate: rate }, { startSec: 0, samples: new Float32Array(10).fill(0.9), sampleRate: rate }], 1, rate);
  assert.equal(loud.samples[5], 1); assert.equal(loud.peak, 1.8);
});

test('resampleLinear keeps duration when the rate changes', () => {
  const x = new Float32Array(22050).fill(0.25);
  const y = L.resampleLinear(x, 22050, 24000);
  assert.equal(y.length, 24000);
  assert.ok(Math.abs(y[12000] - 0.25) < 1e-6);
  assert.equal(L.resampleLinear(x, 22050, 22050), x);
});

test('trimSilence cuts TTS padding to a short pre-roll/tail and reports what it removed; firstOnsetSec finds the speech', () => {
  const rate = 1000, x = new Float32Array(2000);
  for (let i = 500; i < 1200; i++) x[i] = 0.4; // 0.5 s of silence, 0.7 s of "speech", 0.8 s of silence
  const t = L.trimSilence(x, rate);
  assert.equal(t.samples.length, 60 + 700 + 120, 'keeps 60 ms before and 120 ms after');
  assert.ok(Math.abs(t.trimmedLeadSec - 0.44) < 1e-9 && Math.abs(t.trimmedTailSec - 0.68) < 1e-9);
  assert.ok(Math.abs(L.firstOnsetSec(t.samples, rate) - 0.06) < 1e-9, 'speech now starts at the pre-roll');
  assert.ok(Math.abs(L.firstOnsetSec(x, rate) - 0.5) < 1e-9);
  const silent = new Float32Array(500);
  assert.equal(L.trimSilence(silent, rate).samples, silent, 'an all-silent clip is returned untouched, not emptied');
  assert.equal(L.firstOnsetSec(silent, rate), null);
  const tight = new Float32Array(100).fill(0.5);
  assert.equal(L.trimSilence(tight, rate).samples.length, 100, 'a clip with no padding is left alone');
});

test('WAV writer/reader round-trip, 16-bit mono header is correct', () => {
  const src = new Float32Array([0, 0.5, -0.5, 1, -1, 0.25]);
  const buf = L.writeWavPcm16(src, 24000);
  assert.equal(buf.toString('ascii', 0, 4), 'RIFF'); assert.equal(buf.toString('ascii', 36, 40), 'data');
  assert.equal(buf.readUInt32LE(24), 24000); assert.equal(buf.readUInt16LE(34), 16); assert.equal(buf.readUInt32LE(40), 12); assert.equal(buf.length, 44 + 12);
  const back = L.readWav(buf);
  assert.equal(back.sampleRate, 24000);
  src.forEach((v, i) => assert.ok(Math.abs(back.samples[i] - v) < 1 / 16384, 'sample ' + i));
  assert.throws(() => L.readWav(Buffer.from('not a wav at all, definitely')), /not a WAV/);
});

test('readWav understands float32 WAV (what kokoro-js writes) and averages stereo to mono', () => {
  const frames = 4, h = Buffer.alloc(44), d = Buffer.alloc(frames * 2 * 4);
  h.write('RIFF', 0); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(24000, 24); h.writeUInt16LE(32, 34); h.write('data', 36); h.writeUInt32LE(d.length, 40);
  for (let i = 0; i < frames; i++) { d.writeFloatLE(0.5, i * 8); d.writeFloatLE(-0.5, i * 8 + 4); }
  const r = L.readWav(Buffer.concat([h, d]));
  assert.equal(r.samples.length, 4); assert.ok(r.samples.every(v => Math.abs(v) < 1e-6));
});

test('cuesFromTimeline: one cue per beat, never overlapping, with a minimum duration', () => {
  const tl = [
    { stepId: 'a', kind: 'action', text: 'First.', startSec: 0, endSec: 0.2 },
    { stepId: 'a', kind: 'success', text: 'Second beat is longer than the first.', startSec: 0.25, endSec: 3 },
    { stepId: 'b', kind: 'action', text: '   ', startSec: 3, endSec: 4 },
    { stepId: 'b', kind: 'action', text: 'Third.', startSec: 3.05, endSec: 5 },
  ];
  const cues = L.cuesFromTimeline(tl);
  assert.equal(cues.length, 3, 'blank text is dropped');
  cues.forEach((c, i) => { if (i) assert.ok(c.start >= cues[i - 1].end, 'cue ' + i + ' starts after the previous one ends'); assert.ok(c.end > c.start); });
  assert.ok(Math.abs(cues[0].end - 0.25) < 1e-9, 'a cue that would run into the next is cut short, to touching (non-overlap beats minimum duration)');
  const alone = L.cuesFromTimeline([{ stepId: 'a', kind: 'action', text: 'Solo.', startSec: 2, endSec: 2.1 }]);
  assert.ok(alone[0].end - alone[0].start >= 0.6 - 1e-9, 'with room to spare the minimum duration holds');
  const tie = L.cuesFromTimeline([{ stepId: 'a', kind: 'action', text: 'One.', startSec: 1, endSec: 2 }, { stepId: 'a', kind: 'success', text: 'Two.', startSec: 1, endSec: 2 }]);
  assert.ok(tie[1].start >= tie[0].end && tie[0].end > tie[0].start, 'beats that start together still come out in order, without overlap');
});

test('SRT uses a comma, WebVTT a dot; long captions wrap', () => {
  const cues = [{ start: 1.5, end: 3.25, text: 'A fairly long instruction that should wrap onto two lines for easy reading.' }];
  assert.match(L.srtFromCues(cues), /^1\n00:00:01,500 --> 00:00:03,250\n/);
  const vtt = L.vttFromCues(cues);
  assert.ok(vtt.startsWith('WEBVTT\n\n1\n00:00:01.500 --> 00:00:03.250\n'));
  const lines = L.wrapCaption(cues[0].text, 42).split('\n');
  assert.ok(lines.length >= 2 && lines.every(l => l.length <= 42), JSON.stringify(lines));
  assert.equal(L.wrapCaption('Short.', 42), 'Short.');
});

test('transcriptMarkdown numbers the real steps and leaves out the intro/outro pseudo-steps', () => {
  const TC = L.loadCompiler(repoRoot);
  const w = demo(), g = L.toGuidedSteps(w);
  const md = L.transcriptMarkdown(w, TC.buildTutorialManifest(g.guidedSteps, g.tourMap, null, {}));
  assert.match(md, /^# Recording a progress monitoring score/);
  assert.match(md, /\n1\. Choose the student\. Select Student B from the list\.\s+Result: Student B is now selected\./);
  assert.match(md, /\n3\. Save the score\. Select Save\./);
  assert.ok(!/\n4\. /.test(md), 'only three numbered steps');
  assert.match(md, /Practice with a demo student before you use real data\./);
});

// ---- action lists, setup, waitFor, expect, fromGuided ----------------------------------------------
const alloflow = () => JSON.parse(fs.readFileSync(path.join(here, 'workflows', 'alloflow_text_adaptation.workflow.json'), 'utf8'));
const guided = () => L.loadGuidedConfig(repoRoot);

test('action LISTS, waitFor, start.setup and expect validate; their mistakes are rejected', () => {
  let w = demo();
  w.steps[0].action = [{ kind: 'click', selector: '#a' }, { kind: 'type', selector: '#b', text: 'x', delayMs: 30 }, { kind: 'waitFor', selector: '#c', state: 'hidden', timeoutMs: 5000 }];
  w.steps[0].expect = ['Saved'];
  w.start.setup = [{ kind: 'click', selector: '#launch' }, { kind: 'waitFor', selector: 'text=Loading', state: 'hidden' }, { kind: 'wait', ms: 500 }];
  assert.deepEqual(L.validateWorkflow(w).errors, []);
  w = demo(); w.steps[0].action = []; assert.match(errs(w), /must not be an empty list/);
  w = demo(); w.steps[0].action = [{ kind: 'click', selector: '#a' }, { kind: 'type', selector: '#b' }]; assert.match(errs(w), /action\[1\]\.text is required for type/);
  w = demo(); w.steps[0].action = [{ kind: 'type', selector: '#b', text: 'x', delayMs: 999 }]; assert.match(errs(w), /delayMs must be 0\.\.300/);
  w = demo(); w.steps[0].action = [{ kind: 'waitFor', selector: '#c', state: 'gone' }]; assert.match(errs(w), /state must be/);
  w = demo(); w.steps[0].action = [{ kind: 'waitFor', selector: '#c', timeoutMs: 999999 }]; assert.match(errs(w), /timeoutMs must be/);
  w = demo(); w.steps[0].action = [{ kind: 'waitFor' }]; assert.match(errs(w), /selector is required for waitFor/);
  w = demo(); w.steps[0].expect = ['ok', '  ']; assert.match(errs(w), /expect must be a list of non-empty strings/);
  w = demo(); w.start.setup = 'click it'; assert.match(errs(w), /start\.setup must be a list/);
  w = demo(); w.start.setup = [{ kind: 'none' }]; assert.match(errs(w), /start\.setup\[0\]\.kind "none" is not one of/);
  w = demo(); w.start.setup = [{ kind: 'click' }]; assert.match(errs(w), /start\.setup\[0\]\.selector is required/);
});

test('toGuidedSteps keeps action lists as given and collects expect', () => {
  const w = demo(); w.steps[0].action = [{ kind: 'click', selector: '#a' }, { kind: 'wait', ms: 10 }]; w.steps[0].expect = ['Student B'];
  const g = L.toGuidedSteps(w);
  assert.equal(Array.isArray(g.actions['choose-student']), true);
  assert.equal(g.actions['choose-student'].length, 2);
  assert.deepEqual(g.expects['choose-student'], ['Student B']);
  assert.deepEqual(g.expects['save-score'], []);
});

test('fromGuided takes wording and anchor from the REAL guided-mode data; what a step states itself wins', () => {
  const r = L.resolveGuidedRefs(alloflow(), guided());
  const s1 = r.steps[0], s2 = r.steps[1];
  assert.equal(s1.label, 'Source Material');
  assert.match(s1.narration.action, /^Choose, paste, or type the original source for your lesson\./);
  assert.match(s1.narration.success, /^Source captured\./);
  assert.equal(s1.anchor, '#tour-input-panel');
  assert.equal(s2.label, 'Original with Supports');
  assert.equal(s2.anchor, '#ui-tool-simplified');
  const w = alloflow(); w.steps[0].label = 'My label'; w.steps[0].narration = { success: '' }; w.steps[0].anchor = '#mine';
  const o = L.resolveGuidedRefs(w, guided()).steps[0];
  assert.equal(o.label, 'My label'); assert.equal(o.narration.success, '', 'an explicit empty success drops the result beat'); assert.equal(o.anchor, '#mine');
  assert.match(o.narration.action, /^Choose, paste/, 'the instruction still comes from the guided data');
  const bad = alloflow(); bad.steps[0].fromGuided = 'no-such-step';
  assert.throws(() => L.resolveGuidedRefs(bad, guided()), /not a guided-mode step id/);
  assert.equal(alloflow().steps[0].label, undefined, 'resolving does not mutate the original');
});

test('the AlloFlow text-adaptation workflow validates once resolved, and the real compiler scripts it from the product wording', () => {
  const w = L.resolveGuidedRefs(alloflow(), guided());
  assert.deepEqual(L.validateWorkflow(w).errors, []);
  const TC = L.loadCompiler(repoRoot), g = L.toGuidedSteps(w);
  const m = TC.buildTutorialManifest(g.guidedSteps, g.tourMap, null, { wpm: 150 });
  assert.deepEqual(m.steps.map(s => s.id), ['__intro', 'source-input', 'simplified', '__outro']);
  const simplified = m.steps.find(s => s.id === 'simplified');
  assert.match(simplified.beats[0].text, /^Original with Supports\. Choose Read original with supports to keep the exact source text\./);
  assert.match(simplified.beats[1].text, /^Reading ready\./);
  assert.equal(simplified.anchorId, '#ui-tool-simplified');
  assert.deepEqual(g.expects.simplified, ['Word meaning']);
  assert.equal(g.actions['source-input'].length, 3, 'paste choice, type the passage, use this source');
  assert.ok(w.start.setup.some(a => a.kind === 'waitFor' && /Loading tools/.test(a.selector) && a.state === 'hidden'), 'setup waits out the app\'s lazy loading before recording');
});

// ---- caption splitting ---------------------------------------------------------------------------
const words = s => s.replace(/\s+/g, ' ').trim().split(' ');

test('splitCaption: short text is untouched; long beats split at sentence/clause boundaries, every word kept in order, none over the limit', () => {
  assert.deepEqual(L.splitCaption('Select Save.'), ['Select Save.']);
  const real = L.resolveGuidedRefs(alloflow(), guided()).steps.flatMap(s => [s.narration.action, s.narration.success]).filter(Boolean);
  assert.ok(real.some(t => t.length > 160), 'the real guided wording includes very long beats');
  real.forEach(t => {
    const parts = L.splitCaption(t, 80);
    assert.ok(parts.every(p => p.length > 0 && p.length <= 80), 'every piece fits: ' + JSON.stringify(parts.map(p => p.length)));
    assert.deepEqual(parts.flatMap(words), words(t), 'no word lost, added or reordered');
  });
  const p = L.splitCaption('Source Material. Choose, paste, or type the original source for your lesson. Keep its wording and learning goal in view as you add supports.', 80);
  assert.deepEqual(p, ['Source Material. Choose, paste, or type the original source for your lesson.', 'Keep its wording and learning goal in view as you add supports.']);
  assert.deepEqual(L.splitCaption('One clause here; another clause there that is long enough to need its own caption piece, really.', 40).every(x => x.length <= 40), true);
  const noPunct = L.splitCaption('word '.repeat(60).trim(), 80);
  assert.ok(noPunct.length >= 4 && noPunct.every(x => x.length <= 80), 'unpunctuated text still splits at word boundaries');
});

test('cuesFromTimeline splits a long beat into contiguous cues that share its span in proportion to their length', () => {
  const text = 'Source Material. Choose, paste, or type the original source for your lesson. Keep its wording and learning goal in view as you add supports.';
  const cues = L.cuesFromTimeline([{ stepId: 's', kind: 'action', text, startSec: 10, endSec: 20 }]);
  assert.equal(cues.length, 2);
  assert.ok(Math.abs(cues[0].start - 10) < 1e-9 && Math.abs(cues[1].end - 19.9) < 1e-9, 'the pieces span the whole beat (less the 0.1 s tail)');
  assert.ok(Math.abs(cues[0].end - cues[1].start) < 1e-9, 'contiguous: no gap and no overlap inside a beat');
  assert.ok((cues[0].end - cues[0].start) > (cues[1].end - cues[1].start), 'the longer piece (77 chars vs 63) is on screen longer');
  assert.deepEqual(cues.flatMap(c => words(c.text)), words(text));
  const two = L.cuesFromTimeline([{ stepId: 'a', kind: 'action', text, startSec: 0, endSec: 8 }, { stepId: 'b', kind: 'action', text: 'Next.', startSec: 8.1, endSec: 9.5 }]);
  two.forEach((c, i) => { if (i) assert.ok(c.start >= two[i - 1].end - 1e-9, 'cue ' + i + ' does not overlap the previous one'); });
});

test('wrapCaption: any piece splitCaption produces wraps to at most TWO balanced lines (a greedy wrap strands a third)', () => {
  const real = L.resolveGuidedRefs(alloflow(), guided()).steps.flatMap(s => [s.narration.action, s.narration.success]).filter(Boolean);
  real.flatMap(t => L.splitCaption(t, 80)).forEach(piece => {
    const lines = L.wrapCaption(piece, 42).split('\n');
    assert.ok(lines.length <= 2, lines.length + ' lines for: ' + piece);
    assert.ok(lines.every(l => l.length <= 50), 'a line is too long in: ' + piece);
    assert.equal(lines.join(' '), piece, 'wrapping only changes where the line breaks, never the words');
    if (lines.length === 2) assert.ok(Math.abs(lines[0].length - lines[1].length) <= 16, 'lines are balanced: ' + lines.map(l => l.length).join('/'));
  });
  assert.equal(L.wrapCaption('Short enough.', 42), 'Short enough.');
});

test('wrapCaption prefers a break after punctuation when it is nearly as balanced as the middle', () => {
  assert.equal(L.wrapCaption('Choose the student. Select Student B from the list.', 42), 'Choose the student.\nSelect Student B from the list.');
  assert.equal(L.wrapCaption('A banner confirms the save, and a new green bar joins the chart.', 42).split('\n').length, 2);
  const p = 'Reading ready. Review the original and its word help, check any optional adaptation for accuracy.';
  const lines = L.wrapCaption(L.splitCaption(p, 80)[0], 42).split('\n');
  assert.ok(lines.length <= 2);
});
