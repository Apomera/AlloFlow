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
    const project = P.attachProvenance({ title: 'w' }, await led.export());
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
  it('is inert: nothing in the app references the module yet (P1 gates activation)', () => {
    for (const f of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      expect(readFileSync(f, 'utf-8')).not.toContain('allo_provenance_module');
    }
  });
  it('attach is additive and round-trips through JSON', async () => {
    const led = P.createLedger({ now: mkClock().now });
    await led.append('session', { action: 'start' });
    const project = { title: 'My work', items: [1, 2] };
    const out = P.attachProvenance(project, await led.export());
    expect(out.title).toBe('My work');
    expect(out.provenance.ledger.events).toHaveLength(1);
    const back = JSON.parse(JSON.stringify(out));
    expect((await P.verifyLedger(back.provenance.ledger)).ok).toBe(true);
  });
});
