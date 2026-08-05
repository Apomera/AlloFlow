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
    // The wall is about DATA about this student, not the word "support"
    // appearing in prose: `coverage` is a fixed explanatory string and is
    // excluded by identity, not by pattern.
    expect(s.coverage).toBe(P.COVERAGE_NOTE);
    const { coverage, ...data } = s;
    // Case-INSENSITIVE on purpose. This assertion once passed only because a
    // field was named `aiBySupport`: the capital S slipped a per-accommodation
    // breakdown past a wall test meant to stop exactly that.
    const flat = JSON.stringify(data).toLowerCase();
    expect(flat).not.toContain('promptlevel');
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
    // 'glossary' is an access support, and the line now says so. The old
    // wording ('1 AI support') counted it identically to a request to write a
    // paragraph, which is the flattening this pass exists to remove.
    expect(m.summaryLine).toContain('1 access support');
    expect(m.summaryLine).not.toContain('writing or explanation');
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
    const schemaTypes = ['ai', 'checkpoint', 'edit', 'paste', 'revision', 'session', 'support'];
    expect(described).toEqual(schemaTypes);
    for (const d of P.describeCollection()) expect(d.what.length).toBeGreaterThan(10);
  });
  it('narrates in student language with an explanation, never verdicts', async () => {
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
    // Constraint 2 as amended: an explanation, not a question. The old
    // 'nothing more' consent prompt is gone with the checkbox it belonged to.
    expect(m.consentPrompt).toBeUndefined();
    expect(m.whyTeacherSees).toContain('not a score');
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
  it('P1 wiring: collection and surface present in both ANTI copies', () => {
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
      // Constraint 2 AMENDED (2026-08-05): the student sees the log, they do
      // not gate it. The submit-time checkbox and the student-facing delete are
      // both gone — a pseudo-choice a minor cannot meaningfully make, whose
      // visible decline would have read as concealment. Consent is parental and
      // lives outside the app. What gates COLLECTION is the teacher's
      // per-assignment workStoryEnabled setting.
      expect(app, f).not.toContain('workStoryIncluded');
      expect(app, f).not.toContain('onClear: _alloClearWorkStory');
      // The ledger is still attached only when one exists at all.
      const embedIdx = app.indexOf('_P.attachProvenance(submissionData, _exported)');
      const gateIdx = app.indexOf('if (_alloLedgerRef.current) {');
      expect(gateIdx, f).toBeGreaterThan(-1);
      expect(embedIdx, f).toBeGreaterThan(gateIdx);
    }
  });
  it('the AI wrapper is transparent — same call through, properties preserved', () => {
    const app = readFileSync('AlloFlowANTI.txt', 'utf-8');
    const w = app.slice(app.indexOf('function _alloWrapCallGeminiForProvenance'), app.indexOf('function _isQrStudentAiDisabled'));
    expect(w).toContain('return fn.apply(this, args);');       // never alters the call
    expect(w).toContain('_alloflowBackend');                    // local-backend detection survives
    expect(w).toContain("if (typeof fn !== 'function' || fn._alloProvWrapped) return fn;"); // no double-wrap
    expect(w).toContain('try {');   // recording can never throw into the call
    // The label is no longer hard-coded; it is whatever the calling feature
    // declared, defaulting to the unattributed 'ai-help'.
    expect(w).toContain('window.__alloNoteAiUse(declared.support, declared.promptLevel)');
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
    // ★ A WRITER must exist. The earlier version of this test pinned only the
    // default and the readers, so it passed happily while the flag had no UI
    // and the whole feature was unreachable — a test that proved nothing.
    const settings = readFileSync('view_project_settings_source.jsx', 'utf-8');
    expect(settings).toContain("'workStoryEnabled'");                       // in settingKeys
    expect(settings).toContain("renderFeatureToggle('proj-work-story', 'workStoryEnabled'");
    expect(readFileSync('view_project_settings_module.js', 'utf-8')).toContain('workStoryEnabled'); // rebuilt
  });

  it('paste origin is never fabricated by the wiring (assistive tech must not read as a paste)', () => {
    // ★ The wiring hard-coded sourceHint:'external' on every inferred paste,
    // overriding the sanitizer's 'unknown' default and turning a dictation
    // flush into a teacher-visible "external paste" — the exact
    // accusation-shaped artifact this design exists to prevent.
    for (const f of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      const app = readFileSync(f, 'utf-8');
      expect(app, f).not.toContain("sourceHint: 'external'");
      expect(app, f).toContain("led.append('paste', { field: key, chars: delta });");
    }
    // The sanitizer's neutral default is what therefore lands.
    expect(P.sanitizeEvent('paste', { field: 'a', chars: 99 }).sourceHint).toBe('unknown');
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
  // P3 surface — the eight UI invariants from doc §13.5, as behaviour.
  it('P3 surface: the checkpoint card never blocks and never gates on length', () => {
    const src = readFileSync('allo_provenance_module.js', 'utf-8');
    const cp = src.slice(src.indexOf('function CheckpointPanel'), src.indexOf('// ── P2 (surface)'));
    expect(cp).toContain("h('section'");                       // a card, not a modal
    expect(cp).not.toMatch(/role: ['"]dialog|aria-modal|position: ?['"]fixed/);
    expect(cp).toContain('checkpoint.later');                   // defer always available
    expect(cp).toContain('checkpoint.misfit');                  // escape hatch
    expect(cp).toContain('no timer');                           // stated to the student
    // NO production floor: the Answer button carries no length condition.
    expect(cp).not.toMatch(/disabled: [^,\n]*\.length|minLength|s\.text\.length [<>]/);
    expect(cp).toContain('NO PRODUCTION FLOOR');
  });
  it('P3 surface: all four response modes ship, and the work stays visible', () => {
    const src = readFileSync('allo_provenance_module.js', 'utf-8');
    const cp = src.slice(src.indexOf('function CheckpointPanel'), src.indexOf('// ── P2 (surface)'));
    for (const mode of ['text', 'audio', 'choice', 'point']) expect(cp, mode).toContain("modeBtn('" + mode + "'");
    expect(cp).toContain('q.sourceExcerpt');                    // never a memory test
    // Accommodations are named on screen, and speech stays on-device.
    expect(cp).toContain('Only the answer helper is paused');
    expect(cp).toContain('it becomes text on this device');
  });
  it('P3: recognition choices come from the student’s own writing, deterministically', () => {
    const artifact = 'I picked the Colorado River because I saw it. Erosion cuts rock slowly over time. My cousin took the photo we used.';
    const provided = ['Erosion cuts rock slowly over time.'];
    const a = P.buildCheckpointChoices(artifact, 'I picked the Colorado River because I saw it.', provided);
    const b = P.buildCheckpointChoices(artifact, 'I picked the Colorado River because I saw it.', provided);
    expect(a).toEqual(b);                                       // no Math.random
    expect(a).toContain('I picked the Colorado River because I saw it.');
    expect(a.join(' ')).not.toContain('Erosion cuts rock');     // teacher text never a distractor
    expect(a.length).toBeGreaterThan(1);
  });
  it('P3 teacher view: answer first, guidance fixed, non-answers neutral, no metrics', () => {
    const src = readFileSync('allo_provenance_module.js', 'utf-8');
    const panel = src.slice(src.indexOf('function ProcessPanel'), src.indexOf('GLOBAL.AlloModules = GLOBAL.AlloModules'));
    const answerIdx = panel.indexOf('c.answerText');
    const questionIdx = panel.indexOf("'Question: '");
    expect(answerIdx).toBeGreaterThan(-1);
    expect(answerIdx).toBeLessThan(questionIdx);                // the answer renders FIRST
    expect(panel).toContain('not evidence of anything');        // fixed guidance line
    expect(panel).toContain('Not attempted. This can happen for many reasons');
    expect(panel).not.toMatch(/durationBucket|answerText\.length|\bscore\b/);
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

describe('AI attribution — which helper, not just how many', () => {
  it('classifies access supports apart from generative ones', () => {
    expect(P.classifySupport('read_aloud')).toBe('access');
    expect(P.classifySupport('translate')).toBe('access');
    expect(P.classifySupport('speech_to_text')).toBe('access');
    expect(P.classifySupport('compose')).toBe('generative');
    expect(P.classifySupport('allobot')).toBe('generative');
  });

  it('calls an unknown support UNATTRIBUTED, never generative', () => {
    // The direction matters. Guessing 'generative' for an unlabelled call
    // manufactures a claim about a student; guessing 'access' would hide one.
    // 'unattributed' is the only honest answer and the only safe one.
    expect(P.classifySupport('ai-help')).toBe('unattributed');
    expect(P.classifySupport('some_future_feature')).toBe('unattributed');
    expect(P.classifySupport('')).toBe('unattributed');
    expect(P.classifySupport(undefined)).toBe('unattributed');
  });

  it('is NOT the checkpoint gate, which must fail the other way', () => {
    // isAllowedDuringCheckpoint denies the unknown (fail closed); this
    // describes a past event and must not invent one (fail honest). If these
    // two ever collapse into one function, one of the behaviours is wrong.
    expect(P.isAllowedDuringCheckpoint('some_future_feature')).toBe(false);
    expect(P.classifySupport('some_future_feature')).toBe('unattributed');
  });

  it('counts by name so accommodations stop inflating an integrity number', async () => {
    const clock = mkClock();
    const led = P.createLedger({ now: clock.now });
    await led.append('session', { action: 'start' });
    await led.append('ai', { support: 'read_aloud', promptLevel: 'none' });
    await led.append('ai', { support: 'read_aloud', promptLevel: 'none' });
    await led.append('ai', { support: 'translate', promptLevel: 'none' });
    await led.append('ai', { support: 'compose', promptLevel: 'model' });
    await led.append('ai', { support: 'ai-help', promptLevel: 'none' });
    const s = P.summarizeProcess(await led.exportForSubmission());
    expect(s.aiInteractions).toBe(5);
    expect(s.aiKinds).toEqual({ access: 3, generative: 1, unattributed: 1 });
    // The NAMES are deliberately absent from the integrity lens: telling a
    // teacher WHICH accommodations a student leaned on, inside a panel about
    // integrity, is the "needs help reads as might be cheating" failure.
    expect(JSON.stringify(s)).not.toContain('read_aloud');
    // They live in the fade lens, where naming a scaffold is the whole point.
    const fade = P.summarizeSupport(await led.exportForSupport());
    expect(fade.bySupport).toEqual({ read_aloud: 2, translate: 1, compose: 1, 'ai-help': 1 });
  });

  it('describes the mix in words without grading it', () => {
    const line = P.describeAiUse({ aiInteractions: 5, aiKinds: { access: 3, generative: 1, unattributed: 1 } });
    expect(line).toContain('3 access supports');
    expect(line).toContain('1 writing or explanation helper');
    expect(line).toContain('1 helper not identified');
    for (const word of ['cheat', 'suspicio', 'violation', 'misconduct', 'excessive', 'too many']) {
      expect(line.toLowerCase()).not.toContain(word);
    }
  });

  it('says nothing rather than zero when no helper was used', () => {
    expect(P.describeAiUse({ aiInteractions: 0, aiKinds: { access: 0, generative: 0, unattributed: 0 } }))
      .toBe('no AlloFlow helpers');
  });

  it('keeps the two-lens wall: the breakdown carries no promptLevel', async () => {
    const clock = mkClock();
    const led = P.createLedger({ now: clock.now });
    await led.append('ai', { support: 'compose', promptLevel: 'model' });
    const s = P.summarizeProcess(await led.exportForSubmission());
    // Support level is the OTHER lens. It may never ride along with the
    // integrity summary, however convenient the join would be.
    expect(JSON.stringify(s)).not.toContain('promptLevel');
    expect(JSON.stringify(s)).not.toContain('model');
  });
});

describe('AI attribution — the host declares the calling feature', () => {
  const anti = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
  const COPIES = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt'];

  it('replaces the hard-coded label with a consumed declaration, in BOTH copies', () => {
    for (const p of COPIES) {
      const src = anti(p);
      expect(src, p).toContain('function _alloDeclareAiSupport(');
      expect(src, p).toContain('const declared = _alloConsumeAiSupport();');
      // The old blanket label must be gone from the wrapper.
      expect(src, p).not.toContain("window.__alloNoteAiUse('ai-help')");
    }
  });

  it('decays an unconsumed declaration instead of mislabelling a later call', () => {
    for (const p of COPIES) {
      const src = anti(p);
      // One-shot: consuming clears it.
      expect(src, p).toContain('_alloPendingAiSupport = null;');
      // And expiring: a stale declaration falls back rather than sticking.
      expect(src, p).toMatch(/Date\.now\(\) - pending\.at > \d+/);
    }
  });

  it('labels the student translate/explain path', () => {
    for (const p of COPIES) {
      expect(anti(p), p).toContain("_alloDeclareAiSupport(bp.mode === 'translate' ? 'translate' : 'explain_content'");
    }
  });

  it('exposes the declaration to loaded modules', () => {
    for (const p of COPIES) {
      expect(anti(p), p).toContain('window.__alloDeclareAiSupport = _alloDeclareAiSupport;');
    }
  });
});

describe('P7 — support events are the real unit of the ledger (§15)', () => {
  it('buckets repeated support into one event, like edits', async () => {
    const clock = mkClock();
    const led = P.createLedger({ now: clock.now, bucketMs: 15000 });
    for (let i = 0; i < 12; i++) led.noteSupport('read_aloud', 'none');
    await led.flush();
    const evts = (await led.export()).events.filter((e) => e.type === 'support');
    // Twelve read-alouds, ONE row. This is the whole reason support events can
    // live in a hash chain without costing payload and CPU on a Chromebook.
    expect(evts).toHaveLength(1);
    expect(evts[0]).toMatchObject({ kind: 'read_aloud', count: 12 });
  });

  it('splits a bucket when the window passes', async () => {
    const clock = mkClock();
    const led = P.createLedger({ now: clock.now, bucketMs: 15000 });
    led.noteSupport('read_aloud', 'none');
    clock.tick(16000);
    led.noteSupport('read_aloud', 'none');
    await led.flush();
    expect((await led.export()).events.filter((e) => e.type === 'support')).toHaveLength(2);
  });

  it('never merges across level or insertedToWork', async () => {
    const clock = mkClock();
    const led = P.createLedger({ now: clock.now, bucketMs: 15000 });
    led.noteSupport('allobot', 'hint');
    led.noteSupport('allobot', 'model');
    led.noteSupport('allobot', 'hint', { insertedToWork: true });
    await led.flush();
    // Collapsing these would average away exactly the distinction both lenses
    // are built on.
    expect((await led.export()).events.filter((e) => e.type === 'support')).toHaveLength(3);
  });

  it('refuses a nameless support rather than inventing one', async () => {
    const led = P.createLedger({ now: mkClock().now });
    await led.noteSupport('', 'none');
    await led.flush();
    expect(led.eventCount()).toBe(0);
  });
});

describe('P7 — the population rule (§15.4)', () => {
  async function mixed() {
    const clock = mkClock();
    const led = P.createLedger({ now: clock.now, bucketMs: 15000 });
    await led.append('session', { action: 'start' });
    led.noteSupport('read_aloud', 'none');            // helped, went nowhere
    led.noteSupport('glossary', 'none');              // helped, went nowhere
    led.noteSupport('compose', 'model', { insertedToWork: true }); // went INTO the work
    await led.flush();
    return led;
  }

  it('the integrity summary counts ONLY what went into the work', async () => {
    const led = await mixed();
    const s = P.summarizeProcess(await led.exportForSubmission());
    // A word bank does not make an essay non-original, and neither does
    // read-aloud. Only the composed text that landed in the work is an
    // integrity fact about it.
    expect(s.aiInteractions).toBe(1);
    expect(s.aiKinds).toEqual({ access: 0, generative: 1, unattributed: 0 });
  });

  it('the submission export cannot NAME an accommodation that stayed out of the work', async () => {
    const led = await mixed();
    const flat = JSON.stringify(await led.exportForSubmission());
    // Enforced in visibleBody, not in a view: no future panel can render these
    // because the strings are not in the document at all.
    expect(flat).not.toContain('read_aloud');
    expect(flat).not.toContain('glossary');
    expect(flat).toContain('compose');   // this one went into the work
  });

  it('scaffold INTENSITY never rides in the submission export, whatever carries it', async () => {
    const led = await mixed();
    const flat = JSON.stringify(await led.exportForSubmission());
    expect(flat).not.toContain('promptLevel');
    expect(flat).not.toContain('model');
  });

  it('the support lens sees ALL of it, at full fidelity', async () => {
    const led = await mixed();
    const fade = P.summarizeSupport(await led.exportForSupport());
    expect(fade.bySupport).toEqual({ read_aloud: 1, glossary: 1, compose: 1 });
    expect(fade.promptLevelCounts.model).toBe(1);
  });

  it('a stripped submission export still verifies', async () => {
    const led = await mixed();
    // The dual-commitment chain has to survive the population strip, or the
    // integrity claim dies the moment a scaffold is recorded.
    expect((await P.verifyLedger(await led.exportForSubmission())).ok).toBe(true);
  });
});

describe('P7 — coverage is stated, never implied (§15.5)', () => {
  it('both lenses carry the coverage note', async () => {
    const led = P.createLedger({ now: mkClock().now });
    await led.append('session', { action: 'start' });
    expect(P.summarizeProcess(await led.exportForSubmission()).coverage).toBe(P.COVERAGE_NOTE);
    expect(P.summarizeSupport(await led.exportForSupport()).coverage).toBe(P.COVERAGE_NOTE);
  });

  it('names what can NEVER be observed, so a short list is not read as little help', () => {
    // Verified against the source: neither string appears anywhere in ANTI,
    // because neither is an AlloFlow feature. Absence here is permanent, not
    // pending instrumentation.
    expect(P.NEVER_OBSERVABLE).toEqual(['spellcheck', 'word_prediction']);
    expect(P.COVERAGE_NOTE).toContain('does not mean little help was used');
  });

  it('the coverage note makes no claim about the student', () => {
    for (const word of ['cheat', 'suspicio', 'honest', 'verify', 'prove']) {
      expect(P.COVERAGE_NOTE.toLowerCase()).not.toContain(word);
    }
  });
});

describe('P7 — checkpoints document provision, never a tally (§15.7)', () => {
  it('keeps a sorted, de-duplicated list of supports provided', () => {
    const e = P.sanitizeEvent('checkpoint', {
      id: 'cp1', aiState: 'off', durationSec: 60,
      supportsProvided: ['read_aloud', 'glossary', 'read_aloud'],
    });
    expect(e.supportsProvided).toEqual(['glossary', 'read_aloud']);
  });

  it('has NO way to express how often a support was used', () => {
    const e = P.sanitizeEvent('checkpoint', {
      id: 'cp1', aiState: 'off', durationSec: 60,
      supportsProvided: ['read_aloud'], supportCounts: { read_aloud: 3 }, count: 3,
    });
    // A protocol records that accommodations were provided per the plan. It
    // does not attach a tally of how often the student used the reader: the
    // first protects the administration, the second characterizes the child.
    expect(e.supportCounts).toBeUndefined();
    expect(e.count).toBeUndefined();
    expect(JSON.stringify(e)).not.toContain('3');
  });

  it('records an empty list rather than omitting the field', () => {
    // An absent field is ambiguous between 'none provided' and 'not recorded'.
    // For accommodation compliance those are very different claims.
    const e = P.sanitizeEvent('checkpoint', { id: 'cp1', aiState: 'off', durationSec: 60 });
    expect(e.supportsProvided).toEqual([]);
  });
});

describe('P7 — constraint 2 amended: assent, not a checkbox', () => {
  const anti = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
  const COPIES = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt'];

  it('the model explains instead of asking', async () => {
    const clock = mkClock();
    const led = P.createLedger({ now: clock.now });
    await led.append('session', { action: 'start' });
    const m = P.buildWorkStoryModel(await led.export());
    expect(m.consentPrompt).toBeUndefined();
    expect(m.whyTeacherSees).toContain('Your teacher will see');
    // The instructional half: a reason to prefer supports we can account for.
    expect(m.useOurSupports).toContain('an adult you trust');
  });

  it('no submit-time gate survives in either ANTI copy', () => {
    for (const p of COPIES) {
      const src = anti(p);
      // A pseudo-choice is worse than none: a visible decline reads as
      // concealment, and the students most likely to decline are the ones the
      // support lane exists to serve.
      expect(src, p).not.toContain('workStoryIncluded');
      expect(src, p).not.toContain('setWorkStoryIncluded(');
    }
  });

  it('the student can still SEE everything — transparency is undiminished', async () => {
    const clock = mkClock();
    const led = P.createLedger({ now: clock.now });
    await led.append('session', { action: 'start' });
    led.noteSupport('read_aloud', 'none');
    await led.flush();
    const m = P.buildWorkStoryModel(await led.export());
    expect(m.lines.length).toBeGreaterThan(0);
    expect(m.collected.map((c) => c.type)).toContain('support');
    expect(m.neverCollected.length).toBeGreaterThan(0);
    expect(m.coverage).toBe(P.COVERAGE_NOTE);
  });
});

describe('P7 — tier-1 instrumentation (§15.6)', () => {
  const anti = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
  const COPIES = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt'];

  it('read_aloud is instrumented at the single front door, not per call site', () => {
    for (const p of COPIES) {
      const src = anti(p);
      expect(src, p).toContain("window.__alloNoteSupport('read_aloud'");
      // Instrumenting AlloSpeechPlayer covers every TTS backend at once; a
      // per-site approach would miss whichever site is added next.
      expect(src, p).toContain('speak: _instrumentedSpeak');
    }
  });

  it('recording never alters or delays playback', () => {
    for (const p of COPIES) {
      const src = anti(p);
      const w = src.slice(src.indexOf('const _instrumentedSpeak'), src.indexOf('window.AlloSpeechPlayer = {'));
      expect(w, p).toContain('return speak.apply(this, arguments);');
      expect(w, p).toContain('try {');
      expect(w, p).not.toContain('await');
    }
  });

  it('dictation names itself, so its burst never reads as an anomaly', () => {
    for (const p of COPIES) {
      expect(anti(p), p).toContain("window.__alloNoteSupport('speech_to_text'");
    }
  });

  it('the bridge is exposed for loaded modules and plugins', () => {
    for (const p of COPIES) {
      expect(anti(p), p).toContain('window.__alloNoteSupport = (k, lv, o) =>');
    }
  });
});

describe('P7 follow-up — the checkpoint record has BOTH a writer and a reader', () => {
  it('the student can read their own check-in line', async () => {
    const led = P.createLedger({ now: mkClock().now });
    await led.append('session', { action: 'start' });
    await led.append('checkpoint', {
      id: 'c', aiState: 'off', durationSec: 70,
      supportsProvided: ['read_aloud', 'glossary'],
    });
    const m = P.buildWorkStoryModel(await led.export());
    const line = m.lines[1];
    // This rendered 'undefineds' — the narrator read durationSec, which the
    // schema deliberately replaced with a coarse bucket.
    expect(line).not.toContain('undefined');
    // Slugs are for the schema. A child reads words.
    expect(line).toContain('read-aloud');
    expect(line).toContain('the glossary');
    expect(line).not.toContain('read_aloud');
  });

  it('never tells a student how long they took', async () => {
    const led = P.createLedger({ now: mkClock().now });
    await led.append('checkpoint', { id: 'c', aiState: 'off', durationSec: 900 });
    const line = P.buildWorkStoryModel(await led.export()).lines[0];
    // The coarse buckets exist so nobody reads into how long a child took.
    // Restating them in the student's own story defeats that.
    expect(line.toLowerCase()).not.toContain('minute');
    expect(line.toLowerCase()).not.toContain('second');
  });

  it('an unknown support still reaches the student, just de-slugged', async () => {
    const led = P.createLedger({ now: mkClock().now });
    await led.append('checkpoint', { id: 'c', aiState: 'off', supportsProvided: ['future_tool'] });
    // Falling through beats dropping it: a newly instrumented support must
    // never silently vanish from a student's own record.
    expect(P.buildWorkStoryModel(await led.export()).lines[0]).toContain('future tool');
  });

  it('the TEACHER panel renders the provision list, or the field is dead', () => {
    // I argued that suppressing accommodations leaves a compliance gap, then
    // shipped supportsProvided with no reader — the same gap with extra steps.
    // Same class as the workStoryEnabled toggle that had no writer.
    const src = readFileSync('allo_provenance_module.js', 'utf8');
    expect(src).toContain("'Accommodations provided: '");
    expect(src).toContain('c.supportsProvided.join');
  });

  it('and renders it as provision, never a count', () => {
    const src = readFileSync('allo_provenance_module.js', 'utf8');
    const panel = src.slice(src.indexOf('function ProcessPanel'), src.indexOf('GLOBAL.AlloModules ='));
    expect(panel).not.toMatch(/supportsProvided.length +/);
    expect(panel).not.toContain('times');
  });
});

describe('P3 wiring — checkpoints finally have a producer', () => {
  const anti = (p) => readFileSync(p, 'utf-8');
  const COPIES = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt'];

  it('generates, records, and stores — all three, in BOTH copies', () => {
    for (const p of COPIES) {
      const src = anti(p);
      expect(src, p).toContain('const _alloGenerateCheckpoints');
      expect(src, p).toContain('const _alloRecordCheckpoint');
      // Answers live in project.checkpoints[], never the ledger.
      expect(src, p).toContain('submissionData.checkpoints = _alloCheckpointRecordsRef.current');
    }
  });

  it('the generator is handed artifact text ONLY — the firewall is the signature', () => {
    for (const p of COPIES) {
      const src = anti(p);
      const gen = src.slice(src.indexOf('const _alloGenerateCheckpoints'), src.indexOf('const _alloRecordCheckpoint'));
      // A question aimed at a doubted span would be an accusation delivered to
      // a child in the second person. There must be no path from the ledger
      // into generation.
      expect(gen, p).not.toContain('_alloLedgerRef');
      expect(gen, p).not.toContain('pasteEvents');
      expect(gen, p).toContain('P.buildCheckpointPrompt(text,');
    }
  });

  it('honours no-egress: AI off means templates, not a degraded AI call', () => {
    for (const p of COPIES) {
      const src = anti(p);
      const gen = src.slice(src.indexOf('const _alloGenerateCheckpoints'), src.indexOf('const _alloRecordCheckpoint'));
      expect(gen, p).toContain('const aiAllowed = !_isQrStudentAiDisabled()');
      expect(gen, p).toContain('if (aiAllowed) {');
      // The fallback also catches generation FAILURE, so a student never meets
      // an error where a question should be.
      expect(gen, p).toContain('if (!questions.length) questions = P.templateCheckpoints(text');
    }
  });

  it('the ledger gets a hash, never the answer', () => {
    for (const p of COPIES) {
      const src = anti(p);
      const rec = src.slice(src.indexOf('const _alloRecordCheckpoint'), src.indexOf('const _alloCheckpointSupportsRef'));
      expect(rec, p).toContain('P.hashCheckpointAnswer(_alloCheckpointSaltRef.current, answerText)');
      expect(rec, p).not.toMatch(/append\('checkpoint', \{[^}]*answerText/);
    }
  });

  it('skip and defer are recorded as themselves, not as failures', () => {
    for (const p of COPIES) {
      const src = anti(p);
      // §13.5 requires the escape hatches to be real. An escape hatch that
      // records as 'unavailable' is not an escape hatch.
      expect(src, p).toContain("_alloRecordCheckpoint('deferred', '', 'text')");
      expect(src, p).toContain("_alloRecordCheckpoint('skipped', '', 'text')");
    }
  });

  it('is a CARD in the sidebar and never blocks submission', () => {
    for (const p of COPIES) {
      const src = anti(p);
      expect(src, p).toContain('window.AlloModules.CheckpointPanel');
      // If submission consulted checkpoint state at all, it could block.
      const save = src.slice(src.indexOf('submissionData.checkpoints'), src.indexOf('const safeName = submissionData.studentName'));
      expect(save, p).not.toContain('checkpointState.status');
      expect(save, p).not.toContain('return;');
    }
  });

  it('supports collected per QUESTION, so one check-in cannot inherit another', () => {
    for (const p of COPIES) {
      const src = anti(p);
      // Without the reset, the last record would accumulate the whole session
      // and read as though the student leaned on everything at once.
      const resets = src.split('_alloCheckpointSupportsRef.current = new Set();').length - 1;
      expect(resets, p).toBe(2);   // one on open, one after each record
    }
  });
});

describe('P7 tier-2 — allobot names itself', () => {
  const anti = (p) => readFileSync(p, 'utf-8');
  const COPIES = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt'];

  it('instruments the single delivery path into the chat module', () => {
    for (const p of COPIES) {
      expect(anti(p), p).toContain("window.__alloNoteSupport('allobot', 'guided')");
    }
  });

  it('records allobot as guided, not model', () => {
    // AlloBot is Socratic by design. Logging it at the level that means
    // "wrote it for them" would misstate what happened, in the direction that
    // hurts the student.
    for (const p of COPIES) {
      expect(anti(p), p).not.toContain("__alloNoteSupport('allobot', 'model')");
    }
    expect(P.classifySupport('allobot')).toBe('generative');
  });
});

describe('P7 — the ai/support population asymmetry is documented, not hidden', () => {
  it('every ai event counts toward integrity, even without insertedToWork', async () => {
    const led = P.createLedger({ now: mkClock().now });
    await led.append('ai', { support: 'allobot', promptLevel: 'guided' });
    const s = P.summarizeProcess(await led.exportForSubmission());
    // Deliberate. Nothing sets insertedToWork on an ai event yet, so applying
    // the population rule there would zero the count and hide a student who
    // had a helper write their essay.
    expect(s.aiInteractions).toBe(1);
  });

  it('a support event without insertedToWork does NOT count', async () => {
    const led = P.createLedger({ now: mkClock().now, bucketMs: 15000 });
    led.noteSupport('allobot', 'guided');
    await led.flush();
    expect(P.summarizeProcess(await led.exportForSubmission()).aiInteractions).toBe(0);
  });

  it('the asymmetry is explained in the source, so nobody rewrites it blindly', () => {
    const src = readFileSync('allo_provenance_module.js', 'utf8');
    expect(src).toContain('ASYMMETRY');
    expect(src).toContain('would silently zero the integrity AI count');
  });
});

