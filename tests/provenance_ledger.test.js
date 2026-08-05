// Process Provenance P0 — the ledger core, behavioral coverage of every
// constraint the design doc calls structural:
//   metadata-only collection (whitelist + strip), tamper-EVIDENT chain with
//   located breaks, the two-lens wall (integrity summary carries no support
//   fields), and no-verdict language anywhere in the module.
// Design: docs/PROCESS_PROVENANCE_DESIGN_2026-08-04.md
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require2 = createRequire(import.meta.url);
const P = require2('../allo_provenance_module.js');

function mkClock(startMs = 1000) {
  let t = startMs;
  return { now: () => t, tick: (ms) => { t += ms; } };
}

describe('event schema — metadata only, whitelist + strip', () => {
  it('accepts known types, strips unknown keys, clamps fields', () => {
    const e = P.sanitizeEvent('ai', {
      support: 'allobot', promptLevel: 'guided', promptPreview: 'x'.repeat(500),
      keystrokes: 'SECRET TRANSCRIPT', screenshot: 'data:image/png…', extra: { nested: true },
    });
    expect(e.support).toBe('allobot');
    expect(e.promptLevel).toBe('guided');
    expect(e.promptPreview).toHaveLength(120);
    expect(e.keystrokes).toBeUndefined();
    expect(e.screenshot).toBeUndefined();
    expect(e.extra).toBeUndefined();
  });
  it('rejects unknown types and malformed required fields outright', () => {
    expect(P.sanitizeEvent('keylog', { data: 'x' })).toBeNull();
    expect(P.sanitizeEvent('screenshot', {})).toBeNull();
    expect(P.sanitizeEvent('edit', { chars: 'lots' })).toBeNull(); // non-numeric
    expect(P.sanitizeEvent('session', { action: 'spy' })).toBeNull();
  });
  it('prompt levels are the errorless-learning hierarchy, junk collapses to none', () => {
    expect(P.PROMPT_LEVELS).toEqual(['model', 'guided', 'hint', 'none']);
    expect(P.sanitizeEvent('ai', { support: 's', promptLevel: 'FULL_ANSWER' }).promptLevel).toBe('none');
  });
});

describe('ledger chain — tamper-evident with located breaks', () => {
  it('appends serially, exports a verifiable chain', async () => {
    const clock = mkClock();
    const led = P.createLedger({ now: clock.now });
    await led.append('session', { action: 'start', assignmentId: 'a1', policy: { studentAi: 'scaffold' } });
    clock.tick(5000);
    await led.append('ai', { support: 'glossary', promptLevel: 'hint' });
    clock.tick(2000);
    await led.append('paste', { field: 'answer_1', chars: 412 });
    const out = await led.export();
    expect(out.events).toHaveLength(3);
    expect(out.head).toBe(out.events[2].h);
    expect(out.events[1].t).toBe(5000);
    const v = await P.verifyLedger(out);
    expect(v).toEqual({ ok: true, events: 3 });
  });

  it('detects edits, reorders, and head forgery — naming the first break', async () => {
    const clock = mkClock();
    const led = P.createLedger({ now: clock.now });
    await led.append('session', { action: 'start' });
    await led.append('paste', { field: 'answer_1', chars: 999 });
    await led.append('session', { action: 'end' });
    const out = await led.export();

    const edited = JSON.parse(JSON.stringify(out));
    edited.events[1].chars = 3; // shrink the paste after the fact
    expect((await P.verifyLedger(edited))).toMatchObject({ ok: false, brokenAt: 1, reason: 'chain break' });

    const reordered = JSON.parse(JSON.stringify(out));
    reordered.events.reverse();
    expect((await P.verifyLedger(reordered)).ok).toBe(false);

    const dropped = JSON.parse(JSON.stringify(out));
    dropped.events.splice(1, 1); // remove the paste entirely
    expect((await P.verifyLedger(dropped)).ok).toBe(false);

    const headForged = JSON.parse(JSON.stringify(out));
    headForged.head = 'f'.repeat(64);
    expect((await P.verifyLedger(headForged))).toMatchObject({ ok: false, reason: 'head mismatch' });
  });

  it('invalid events are refused without polluting the chain', async () => {
    const led = P.createLedger({ now: mkClock().now });
    expect(await led.append('keylog', { data: 'x' })).toBeNull();
    await led.append('session', { action: 'start' });
    expect(led.eventCount()).toBe(1);
    expect((await P.verifyLedger(await led.export())).ok).toBe(true);
  });
});

describe('edit bucketing — direction and magnitude, never content', () => {
  it('aggregates a burst into one bucket, splits across the window', async () => {
    const clock = mkClock();
    const led = P.createLedger({ now: clock.now, bucketMs: 15000 });
    await led.append('session', { action: 'start' });
    led.noteEdit('answer_1', 10, 10);
    clock.tick(4000);
    led.noteEdit('answer_1', 22, 32);
    clock.tick(16000); // beyond the bucket window → prior bucket flushes
    led.noteEdit('answer_1', 5, 37);
    await led.flushEdits();
    const out = await led.export();
    const edits = out.events.filter((e) => e.type === 'edit');
    expect(edits).toHaveLength(2);
    expect(edits[0].chars).toBe(32); // 10 + 22 aggregated
    expect(edits[1].chars).toBe(5);
    expect(JSON.stringify(out)).not.toContain('content'); // no text ever stored
  });
});

describe('the two-lens wall (hard constraint 8)', () => {
  async function sampleLedger() {
    const clock = mkClock();
    const led = P.createLedger({ now: clock.now });
    await led.append('session', { action: 'start' });
    await led.append('ai', { support: 'allobot', promptLevel: 'model' });
    clock.tick(60000);
    await led.append('ai', { support: 'glossary', promptLevel: 'hint' });
    await led.append('paste', { field: 'a', chars: 40, sourceHint: 'intra-app' });
    await led.append('checkpoint', { id: 'cp1', aiState: 'off', durationSec: 70 });
    return led.export();
  }
  it('integrity summary carries counts and pastes but NO support fields', async () => {
    const s = P.summarizeProcess(await sampleLedger());
    expect(s.aiInteractions).toBe(2);
    expect(s.pasteEvents[0]).toEqual({ t: 60000, chars: 40, sourceHint: 'intra-app' });
    expect(s.checkpoints).toBe(1);
    const flat = JSON.stringify(s);
    expect(flat).not.toContain('promptLevel');
    expect(flat).not.toContain('support');
  });
  it('support summary carries the fade series and stays out of the other lens', async () => {
    const s = P.summarizeSupport(await sampleLedger());
    expect(s.promptLevelCounts).toEqual({ model: 1, guided: 0, hint: 1, none: 0 });
    expect(s.series.map((x) => x.promptLevel)).toEqual(['model', 'hint']);
  });
});

describe('P2 — teacher process panel view-model', () => {
  it('builds the one-line default view, verifies the chain, carries the disclaimer', async () => {
    const clock = mkClock();
    const led = P.createLedger({ now: clock.now });
    await led.append('session', { action: 'start' });
    await led.append('ai', { support: 'glossary', promptLevel: 'hint' });
    clock.tick(120000);
    await led.append('checkpoint', { id: 'cp1', aiState: 'off', durationSec: 60 });
    const project = P.attachProvenance({ title: 'w' }, await led.exportForSubmission());
    const m = await P.buildProcessPanelModel(JSON.parse(JSON.stringify(project)));
    expect(m.present).toBe(true);
    expect(m.summaryLine).toContain('1 AI support');
    expect(m.summaryLine).toContain('1 checkpoint attached');
    expect(m.integrity.verified).toBe(true);
    expect(m.integrity.disclaimer).toContain('tamper-evident, not tamper-proof');
    // The wall holds here too: no support-lens fields in the panel model.
    const flat = JSON.stringify(m);
    expect(flat).not.toContain('promptLevel');
    // A tampered ledger reads as unverified, never as a verdict about the student.
    const bad = JSON.parse(JSON.stringify(project));
    bad.provenance.ledger.events[1].support = 'edited-later';
    const mb = await P.buildProcessPanelModel(bad);
    expect(mb.integrity.verified).toBe(false);
    expect(mb.integrity.line).toContain('could not be verified');
    expect(JSON.stringify(mb).toLowerCase()).not.toContain('cheat');
  });
  it('absent provenance is simply absent — no panel, no implication', async () => {
    expect(await P.buildProcessPanelModel({ title: 'no ledger' })).toEqual({ present: false });
    expect(await P.buildProcessPanelModel(null)).toEqual({ present: false });
  });
});

describe('P1 (view half) — the student-owned Work Story', () => {
  it('the collection disclosure is derived from the schema — no drift possible', () => {
    const described = P.describeCollection().map((d) => d.type).sort();
    // Every schema type described, nothing described that the schema lacks.
    const schemaTypes = ['ai', 'checkpoint', 'edit', 'paste', 'revision', 'session'];
    expect(described).toEqual(schemaTypes);
    for (const d of P.describeCollection()) expect(d.what.length).toBeGreaterThan(10);
  });
  it('narrates in student language with consent framing, never verdicts', async () => {
    const clock = mkClock();
    const led = P.createLedger({ now: clock.now });
    await led.append('session', { action: 'start' });
    clock.tick(120000);
    await led.append('paste', { field: 'a', chars: 300, sourceHint: 'external' });
    await led.append('ai', { support: 'glossary', promptLevel: 'hint' });
    const m = P.buildWorkStoryModel(await led.export());
    expect(m.lines[0]).toBe('You started working.');
    expect(m.lines[1]).toContain('pasted in about 300 characters at 2 min');
    expect(m.lines[2]).toContain('glossary helper');
    expect(m.summary).toContain('You worked for about');
    expect(m.neverCollected.join(' ')).toContain('Screenshots');
    expect(m.consentPrompt).toContain('nothing more');
    const flat = JSON.stringify(m).toLowerCase();
    expect(flat).not.toContain('cheat');
    expect(flat).not.toContain('suspic');
    expect(flat).not.toContain('promptlevel'); // support lens stays out of the student view too
  });
});

// P3 — comprehension checkpoints. Every pin below traces to a specific harm
// raised in adversarial review; the comments name the harm so a future editor
// knows what they would be re-enabling.
describe('P3 — checkpoint safety rules', () => {
  const ARTIFACT = 'Erosion wore the canyon down over time. I picked the Colorado River because my family drove there last summer and I saw the layers myself.';
  const PROVIDED = ['Erosion wore the canyon down over time.']; // teacher starter text

  it('accommodations survive the AI-off state; unclassified generative help does not', () => {
    // HARM: gating the whole AI layer strips read-aloud/glossary/translation
    // from students whose IEP requires them, at the highest-stakes moment.
    for (const ok of P.CHECKPOINT_ALWAYS_ALLOWED) expect(P.isAllowedDuringCheckpoint(ok), ok).toBe(true);
    expect(P.isAllowedDuringCheckpoint('allobot')).toBe(false);
    expect(P.isAllowedDuringCheckpoint('compose')).toBe(false);
    expect(P.isAllowedDuringCheckpoint('some_new_generative_thing')).toBe(false); // default-deny
    expect(P.CHECKPOINT_ALWAYS_ALLOWED).toContain('speech_to_text');
  });

  it('vocabularies fail toward the non-incriminating value', () => {
    // HARM: a race or typo recording a student as having answered with AI on;
    // assistive-tech insertions stamped "external paste".
    expect(P.sanitizeEvent('checkpoint', {}).aiState).toBe('unknown');
    expect(P.sanitizeEvent('checkpoint', {}).outcome).toBe('unavailable');
    expect(P.sanitizeEvent('paste', { chars: 9 }).sourceHint).toBe('unknown');
    expect(P.sanitizeEvent('paste', { chars: 9, assistiveTech: true }).assistiveTech).toBe(true);
    // No precise duration beside an answer — coarse buckets only.
    expect(P.sanitizeEvent('checkpoint', { durationSec: 74 }).durationBucket).toBe('1_5m');
    expect(P.sanitizeEvent('checkpoint', {}).durationSec).toBeUndefined();
    expect(P.bucketDuration(-1)).toBe('unknown');
  });

  it('the generator is firewalled from the ledger by signature and is deterministic', () => {
    // HARM: a question aimed at a pasted span is an accusation to a child.
    expect(P.buildCheckpointPrompt.length).toBe(3); // (artifactText, readingLevel, language) — no ledger param
    const a = P.templateCheckpoints(ARTIFACT, { providedTexts: PROVIDED });
    const b = P.templateCheckpoints(ARTIFACT, { providedTexts: PROVIDED });
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
    for (const q of a) expect(PROVIDED.join(' ')).not.toContain(q.sourceExcerpt); // never quotes teacher text
  });

  it('rejects hallucinated, teacher-authored, copy-answerable and yes/no questions', () => {
    const raw = [
      // A good question: its strong answer is NOT sitting in the artifact.
      { question: 'What would change in your work if you had picked a river you had never seen?', sourceExcerpt: 'I picked the Colorado River', expectedAnswer: 'I could not have described the rock layers from memory and would have needed a source' },
      { question: 'Explain this.', sourceExcerpt: 'a sentence the student never wrote', expectedAnswer: 'x' },       // hallucinated
      { question: 'What does erosion mean here?', sourceExcerpt: 'Erosion wore the canyon down over time.', expectedAnswer: 'y' }, // teacher-provided span
      { question: 'Is the canyon deep?', sourceExcerpt: 'I saw the layers myself', expectedAnswer: 'z' },            // yes/no
      { question: 'What wore the canyon down?', sourceExcerpt: 'I saw the layers myself', expectedAnswer: 'Erosion wore the canyon down over time' }, // copy-answerable
    ];
    const out = P.sanitizeCheckpointQuestions(raw, ARTIFACT, { providedTexts: PROVIDED });
    expect(out).toHaveLength(1);
    expect(out[0].question).toContain('What would change');
    // The rejected one that matters most: "why did you pick X" is dropped when
    // the student already wrote the reason two words later — that question
    // rewards the copier and punishes the student who paraphrases.
    const leaky = P.sanitizeCheckpointQuestions(
      [{ question: 'Why did you pick the Colorado River?', sourceExcerpt: 'I picked the Colorado River', expectedAnswer: 'because my family drove there' }],
      ARTIFACT, { providedTexts: PROVIDED });
    expect(leaky).toHaveLength(0);
    expect(out[0].id).toBe('cp1');
  });

  it('answers and questions live OUTSIDE the ledger, and the schema can never take them', () => {
    // HARM: stuffing answers into the ledger detonates the no-words promise.
    const rec = P.buildCheckpointRecord({ id: 'cp1', question: 'Why?', sourceExcerpt: 'I picked' }, 'Because I saw it.', { outcome: 'answered', responseMode: 'audio', answerLanguage: 'Spanish', aiState: 'off' });
    expect(rec.answerText).toBe('Because I saw it.');
    expect(rec.responseMode).toBe('audio');
    expect(rec.answerLanguage).toBe('Spanish');
    expect(rec.teacherNote).toContain('not evidence of anything');
    // The ledger event shape has no channel for text.
    const evt = P.sanitizeEvent('checkpoint', { id: 'cp1', answerText: 'sneaky', questionText: 'sneaky' });
    expect(evt.answerText).toBeUndefined();
    expect(evt.questionText).toBeUndefined();
  });

  it('a non-answer is recorded as a neutral outcome, never as silence to interpret', () => {
    // HARM: a blank could be a crash, an offline device, or an accommodation —
    // teachers fill silence with the least charitable story.
    expect(P.CHECKPOINT_OUTCOMES).toEqual(['answered', 'skipped', 'deferred', 'unavailable']);
    const skipped = P.buildCheckpointRecord({ id: 'cp1' }, '', { outcome: 'skipped' });
    expect(skipped.outcome).toBe('skipped');
    expect(skipped.answerText).toBe('');
  });

  it('answer hashes are salted — no accidental collusion detector', () => {
    // HARM: identical short answers collide, producing the plagiarism flag
    // this design refused to build; short answers are also brute-forceable.
    expect(P.makeCheckpointSalt()).toHaveLength(32);
    return Promise.all([
      P.hashCheckpointAnswer('saltA', 'The river carved it.'),
      P.hashCheckpointAnswer('saltB', 'The river carved it.'),
    ]).then(([h1, h2]) => expect(h1).not.toBe(h2));
  });

  it('teacher verdicts are two words, neither of them a judgement of the student', () => {
    expect(P.CHECKPOINT_VERDICTS).toEqual(['confirmed', 'talk_with_student']);
    expect(P.CHECKPOINT_VERDICTS.join(' ')).not.toMatch(/fail|insufficient|incomplete|poor/i);
  });

  it('no production floor exists anywhere in the checkpoint flow', () => {
    // HARM: a word minimum measures expressive language and English
    // proficiency, then presents the result as evidence about authorship.
    const src = readFileSync('allo_provenance_module.js', 'utf-8');
    const cp = src.slice(src.indexOf('P3: comprehension checkpoints'), src.indexOf('P1 (view half)'));
    expect(cp).not.toMatch(/minWords|minLength|minChars|at least \d+ words/i);
    expect(cp).toContain('NO PRODUCTION FLOOR');
  });
});

describe('P3 — the two-lens wall is enforced at the DATA layer', () => {
  async function ledgerWithAi() {
    const led = P.createLedger({ now: mkClock().now });
    await led.append('session', { action: 'start' });
    await led.append('ai', { support: 'allobot', promptLevel: 'model', promptPreview: 'my mom is in the hospital so I' });
    await led.append('paste', { field: 'a', chars: 90 });
    return led;
  }
  it('the submission export physically cannot carry scaffold level or the student’s words', async () => {
    // HARM: promptLevel beside paste sizes conflates "needed help" with doubt;
    // promptPreview hands a teacher what a child typed into a helper.
    const led = await ledgerWithAi();
    const sub = await led.exportForSubmission();
    const flat = JSON.stringify(sub);
    expect(flat).not.toContain('promptLevel');
    expect(flat).not.toContain('promptPreview');
    expect(flat).not.toContain('hospital');
    expect(sub.lens).toBe('integrity');
    // And it is still fully verifiable despite the stripping.
    expect((await P.verifyLedger(sub)).ok).toBe(true);
    // Attaching it to a project keeps it clean end to end.
    const project = P.attachProvenance({ title: 'w' }, sub);
    expect(JSON.stringify(project)).not.toContain('promptLevel');
  });
  it('attachProvenance REFUSES a support-lens export rather than downgrading it', async () => {
    const led = await ledgerWithAi();
    const sup = await led.exportForSupport();
    expect(sup.lens).toBe('support');
    expect(JSON.stringify(sup)).toContain('promptLevel'); // the MTSS lane keeps it, by design
    expect(() => P.attachProvenance({}, sup)).toThrow(/integrity-lens/);
    const full = await led.export();
    expect(() => P.attachProvenance({}, full)).toThrow(/integrity-lens/);
  });
  it('the stripped export still catches edits to what the teacher CAN see', async () => {
    const led = await ledgerWithAi();
    const sub = await led.exportForSubmission();
    const tampered = JSON.parse(JSON.stringify(sub));
    tampered.events[2].chars = 5; // shrink the paste
    expect((await P.verifyLedger(tampered)).ok).toBe(false);
    const reordered = JSON.parse(JSON.stringify(sub));
    reordered.events.reverse();
    expect((await P.verifyLedger(reordered)).ok).toBe(false);
  });
});

describe('constraints in the module text itself', () => {
  const src = readFileSync('allo_provenance_module.js', 'utf-8');
  it('never scores, flags, or names cheating; says tamper-EVIDENT only', () => {
    expect(src.toLowerCase()).not.toContain('cheat');
    expect(src).not.toMatch(/integrity ?score|suspicio|flagged/i);
    expect(src).toContain('Tamper-EVIDENT, never claimed tamper-proof');
    // "tamper-proof" may appear ONLY when negated — every occurrence must be
    // preceded by "not" or "never claimed".
    for (const m of src.matchAll(/tamper-proof/gi)) {
      const before = src.slice(Math.max(0, m.index - 30), m.index);
      expect(before, 'un-negated tamper-proof claim at index ' + m.index).toMatch(/not |never claimed /i);
    }
  });
  // P1 flipped this from "no references anywhere" to the wiring contract.
  // The point is unchanged: collection may not exist without the student
  // surface and consent, so these pins fail if any half is removed.
  it('P1 wiring: collection, surface, and consent all present in both ANTI copies', () => {
    for (const f of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      const app = readFileSync(f, 'utf-8');
      // loader + module reachable
      expect(app, f).toContain("loadModule('Provenance', 'https://alloflow-cdn.pages.dev/allo_provenance_module.js?v=prov-p1')");
      // collection hooks
      expect(app, f).toContain('_alloNoteStudentText(resourceId, questionKey, value);');
      expect(app, f).toContain('_alloWrapCallGeminiForProvenance(api.callGemini)');
      expect(app, f).toContain('_alloWrapCallGeminiForProvenance(localCallGemini)');
      // student-mode only
      expect(app, f).toMatch(/_alloEnsureLedger = \(\) => \{\s*if \(!isStudentLinkMode\) return null;/);
      // THE SURFACE — must exist wherever collection does
      expect(app, f).toContain('window.AlloModules.WorkStoryPanel');
      expect(app, f).toContain('onClear: _alloClearWorkStory');
      // consent gate on transmission, default unchecked
      expect(app, f).toContain('const [workStoryIncluded, setWorkStoryIncluded] = useState(false);');
      expect(app, f).toMatch(/if \(workStoryIncluded && _alloLedgerRef\.current\) \{/);
      // and the ledger is attached ONLY inside that consent branch
      const embedIdx = app.indexOf('_P.attachProvenance(submissionData, _exported)');
      const consentIdx = app.indexOf('if (workStoryIncluded && _alloLedgerRef.current) {');
      expect(embedIdx, f).toBeGreaterThan(consentIdx);
    }
  });
  it('the AI wrapper is transparent — same call through, properties preserved', () => {
    const app = readFileSync('AlloFlowANTI.txt', 'utf-8');
    const w = app.slice(app.indexOf('function _alloWrapCallGeminiForProvenance'), app.indexOf('function _isQrStudentAiDisabled'));
    expect(w).toContain('return fn.apply(this, args);');       // never alters the call
    expect(w).toContain('_alloflowBackend');                    // local-backend detection survives
    expect(w).toContain("if (typeof fn !== 'function' || fn._alloProvWrapped) return fn;"); // no double-wrap
    expect(w).toMatch(/try \{ if \(window\.__alloNoteAiUse\)/); // recording can never throw into the call
  });
  // End-to-end usability (P5 + P2): a teacher can turn it on, and a teacher
  // can read the result. Without both, the ledger is a feature nobody reaches.
  it('P5: the teacher toggle is opt-IN and rides the same share pipe as the AI policy', () => {
    for (const f of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      const app = readFileSync(f, 'utf-8');
      expect(app, f).toContain('workStoryEnabled: false,');                       // default OFF
      expect(app, f).toContain('workStoryEnabled: source.workStoryEnabled === true,'); // survives normalize
      // Teacher writes it into all three assignment share transports.
      expect((app.match(/workStory: studentProjectSettings\.workStoryEnabled === true/g) || []).length, f).toBe(3);
      // Student reads it on all three matching load paths.
      expect((app.match(/workStory: packet && packet\.workStory === true/g) || []).length, f).toBe(3);
      // And collection is gated on it: no teacher opt-in, no ledger at all.
      expect(app, f).toContain("if (!(window.__alloQrStudentMode && window.__alloQrStudentMode.workStory === true)) return null;");
    }
  });
  it('P2: the teacher panel is mounted and renders only on consented submissions', () => {
    const inbox = readFileSync('view_submission_inbox_source.jsx', 'utf-8');
    expect(inbox).toContain('window.AlloModules.ProcessPanel');
    expect(inbox).toContain('row.payload.provenance');            // only rows carrying a ledger
    expect(inbox).toContain('React.useEffect');                   // builder injects no bare useEffect
    expect(inbox).toContain('no "declined" state exists here');   // absence is never a fact
    // Built module carries it (forgot-to-rebuild guard) and the mirror matches.
    const built = readFileSync('view_submission_inbox_module.js', 'utf-8');
    expect(built).toContain('ProcessPanel');
    expect(readFileSync('desktop/web-app/public/view_submission_inbox_module.js', 'utf-8')).toBe(built);
  });
  it('P2: the panel shows observations and never a verdict', () => {
    const src = readFileSync('allo_provenance_module.js', 'utf-8');
    const panel = src.slice(src.indexOf('function ProcessPanel'), src.indexOf('GLOBAL.AlloModules = GLOBAL.AlloModules'));
    expect(panel).toContain('model.summaryLine');                  // one-line default view
    expect(panel).toContain('model.integrity.disclaimer');         // stated, always
    expect(panel).toMatch(/origin not recorded|'not recorded'/);   // unknown renders neutrally
    expect(panel).toContain('entered with assistive technology');  // AT never reads as a paste
    expect(panel).not.toMatch(/score|flag|percent|%/i);
    expect(panel).not.toMatch(/durationSec|durationBucket/);       // no duration beside anything
  });
  it('the module ships in the deploy file list', () => {
    expect(readFileSync('build.js', 'utf-8')).toContain("'allo_provenance_module.js',");
  });
  it('attach is additive and round-trips through JSON', async () => {
    const led = P.createLedger({ now: mkClock().now });
    await led.append('session', { action: 'start' });
    const project = { title: 'My work', items: [1, 2] };
    const out = P.attachProvenance(project, await led.exportForSubmission());
    expect(out.title).toBe('My work');
    expect(out.provenance.ledger.events).toHaveLength(1);
    const back = JSON.parse(JSON.stringify(out));
    expect((await P.verifyLedger(back.provenance.ledger)).ok).toBe(true);
  });
});
