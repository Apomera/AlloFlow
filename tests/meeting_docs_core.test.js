// Tests for meeting_docs_module.js — Meeting Documentation (Leadership Hub).
//
// What's pinned: the two integrity mechanisms the tool stands on —
// (1) the local name-masking round trip: boundary-safe (no "Al" inside
//     "Alberto"), longest-first, Unicode-aware, and a PERFECT inverse; and
// (2) source anchoring: quotes verify only against the actual notes, and
//     AI output that can't be anchored comes back flagged, never silently
//     trusted. Plus the action rollup ordering and HTML export escaping.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let M;
beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.MeetingDocs;
  if (!window.React) {
    window.React = {
      createContext: () => ({}),
      createElement: () => null,
      Fragment: 'Fragment',
      memo: (c) => c,
      useState: (v) => [typeof v === 'function' ? v() : v, () => {}],
      useEffect: () => {},
      useRef: (v) => ({ current: v }),
      useMemo: (fn) => fn(),
      useCallback: (fn) => fn,
      useContext: () => null,
    };
  }
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'meeting_docs_module.js'), 'utf8'))();
  M = window.AlloModules.MeetingDocs && window.AlloModules.MeetingDocs._testing;
  if (!M) throw new Error('MeetingDocs did not register');
});

describe('name masking', () => {
  it('masks with letter boundaries: "Al" never matches inside "Alberto" or "Salvador"', () => {
    const pairs = M.meetdocsMaskPairs(['Al', 'Alberto']);
    const masked = M.meetdocsMask('Al met Alberto and Salvador. Al agreed.', pairs);
    expect(masked).not.toContain('Alberto');
    expect(masked).not.toMatch(/(^|[^\w])Al([^\w]|$)/);
    expect(masked).toContain('Salvador'); // not in the mask list — untouched
  });

  it('round-trips exactly, including possessives and punctuation edges', () => {
    const names = ['Marcus Rivera', 'Ms. Chen', 'José'];
    const pairs = M.meetdocsMaskPairs(names);
    const src = 'Marcus Rivera arrived late. Ms. Chen shared José’s reading data; Marcus Rivera agreed. (Ms. Chen will follow up.)';
    const masked = M.meetdocsMask(src, pairs);
    for (const n of names) expect(masked).not.toContain(n);
    expect(M.meetdocsUnmask(masked, pairs)).toBe(src);
  });

  it('handles non-Latin names (JS \\b is ASCII-only — the regex must be Unicode-aware)', () => {
    const pairs = M.meetdocsMaskPairs(['Núñez', 'Δημήτρης']);
    const masked = M.meetdocsMask('Núñez spoke with Δημήτρης about Núñez’s schedule.', pairs);
    expect(masked).not.toContain('Núñez');
    expect(masked).not.toContain('Δημήτρης');
    expect(M.meetdocsUnmask(masked, pairs)).toContain('Núñez’s');
  });

  it('assigns stable distinct codes and dedupes case-insensitively', () => {
    const pairs = M.meetdocsMaskPairs(['Ana', 'ana', 'Ben', 'C']);
    expect(pairs.length).toBe(2); // 'ana' dupe dropped, 'C' too short
    expect(pairs[0].code).not.toBe(pairs[1].code);
  });
});

describe('source anchoring', () => {
  const notes = 'The team decided to move Marcus to Tier 2 reading support. Ms. Chen will send the consent form by Friday.';

  it('verifies quotes case/whitespace/quote-mark-insensitively, rejects fabrications and stubs', () => {
    expect(M.meetdocsVerifyQuote('decided to move Marcus to  Tier 2', notes)).toBe(true);
    expect(M.meetdocsVerifyQuote('DECIDED TO MOVE MARCUS TO TIER 2', notes)).toBe(true);
    expect(M.meetdocsVerifyQuote('retain Marcus in Tier 1', notes)).toBe(false);
    expect(M.meetdocsVerifyQuote('Marcus', notes)).toBe(false); // <8 chars can't anchor
  });

  it('buildFromAi flags unanchored items and unmasks everything locally', () => {
    const pairs = M.meetdocsMaskPairs(['Marcus', 'Ms. Chen']);
    const masked = M.meetdocsMask(notes, pairs);
    const template = { sections: [{ id: 'plan', title: 'Plan' }] };
    const ai = {
      sections: { plan: 'Person A moves to Tier 2.' },
      decisions: [
        { text: 'Move Person A to Tier 2 reading support', quote: masked.slice(9, 60) },
        { text: 'Suspend Person A', quote: 'this never appears in the notes' },
      ],
      actionItems: [{ text: 'Person B sends consent form', owner: 'Person B', due: '2026-08-07', quote: 'Person B will send the consent form' }],
    };
    const built = M.meetdocsBuildFromAi(ai, template, masked, pairs);
    expect(built.sections.plan).toBe('Marcus moves to Tier 2.');
    expect(built.decisions[0].verified).toBe(true);
    expect(built.decisions[0].text).toContain('Marcus');
    expect(built.decisions[1].verified).toBe(false); // fabricated → flagged, not dropped
    expect(built.actionItems[0].verified).toBe(true);
    expect(built.actionItems[0].owner).toBe('Ms. Chen');
    expect(JSON.stringify(built)).not.toContain('Person A');
  });

  it('parseAiJson strips fences and tolerates junk', () => {
    expect(M.meetdocsParseAiJson('```json\n{"a":1}\n```').a).toBe(1);
    expect(M.meetdocsParseAiJson('noise before {"a":2} noise after').a).toBe(2);
    expect(M.meetdocsParseAiJson('not json at all')).toBe(null);
    expect(M.meetdocsParseAiJson(null)).toBe(null);
  });

  it('the AI prompt forbids invention and carries the masked text + section ids', () => {
    const tpl = M.MEETDOCS_BUILTIN_TEMPLATES.find((t) => t.id === 'sst');
    const prompt = M.meetdocsAiPrompt(tpl, 'MASKED-BODY');
    expect(prompt).toContain('never invent');
    expect(prompt).toContain('"interventions"');
    expect(prompt).toContain('MASKED-BODY');
  });
});

describe('action rollup', () => {
  it('orders open-overdue first, then by due date, done last; overdue is date-based', () => {
    const meetings = [
      { id: 'm1', title: 'A', date: '2026-08-01', actionItems: [
        { id: 'i1', text: 'done thing', due: '2026-07-01', done: true },
        { id: 'i2', text: 'overdue thing', due: '2026-08-01', done: false },
      ] },
      { id: 'm2', title: 'B', date: '2026-08-02', actionItems: [
        { id: 'i3', text: 'future thing', due: '2026-09-01', done: false },
        { id: 'i4', text: 'no-date thing', due: '', done: false },
      ] },
    ];
    const r = M.meetdocsActionRollup(meetings, '2026-08-03');
    expect(r.map((x) => x.id)).toEqual(['i2', 'i3', 'i4', 'i1']);
    expect(r[0].overdue).toBe(true);
    expect(r.find((x) => x.id === 'i3').overdue).toBe(false);
  });
});

describe('HTML export', () => {
  it('escapes injected markup and marks unverified items', () => {
    const template = { sections: [{ id: 's1', title: 'Notes <b>bold</b>' }] };
    const meeting = {
      title: 'SST <script>alert(1)</script>', date: '2026-08-03', templateName: 'SST',
      sections: { s1: 'Body & "quotes"' },
      decisions: [{ text: 'Decision <img src=x>', verified: false }],
      actionItems: [{ text: 'Do thing', owner: 'Ms. Chen', due: '2026-08-10', verified: true }],
    };
    const html = M.meetdocsMeetingHtml(meeting, template);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<img');
    expect(html).toContain('unverified against notes');
    expect(html).toContain('Body &amp; &quot;quotes&quot;');
    expect(html).toContain('<!DOCTYPE html>');
  });
});
