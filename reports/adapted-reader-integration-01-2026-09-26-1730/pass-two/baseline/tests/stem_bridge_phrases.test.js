// Pins the Bridge "quick phrases" phrasebook data (the live-translation UX smoothing).
// The phrasebook UI is Canvas-smoke-only, but the phrase SET is static data we can
// hold to a standard: well-formed categories, a useful count, unique ids, and —
// because these go to families — FERPA-safe and em-dash-free (the family-comms style),
// with no name/student placeholders that could leak identifying content.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let P;
beforeAll(() => {
  // minimal React stub so the view module can define its components at load
  window.React = { createElement: () => null, useState: () => [null, () => {}], useEffect: () => {}, useRef: () => ({ current: null }), useMemo: (f) => (typeof f === 'function' ? f() : undefined), Fragment: 'Fragment' };
  delete window.__alloBridgePure;
  try {
    // eslint-disable-next-line no-new-func
    new Function(readFileSync(resolve(process.cwd(), 'view_gemini_bridge_module.js'), 'utf8'))();
  } catch (e) { /* the hook is set before any browser-only code; a later throw is fine */ }
  P = window.__alloBridgePure;
  if (!P) throw new Error('bridge phrasebook hook not exposed (window.__alloBridgePure)');
});

describe('Bridge — quick-phrases phrasebook', () => {
  it('is a set of categorized phrases (id / icon / label / phrases[])', () => {
    expect(Array.isArray(P.BRIDGE_PHRASES)).toBe(true);
    expect(P.BRIDGE_PHRASES.length).toBeGreaterThanOrEqual(4);
    P.BRIDGE_PHRASES.forEach((c) => {
      expect(typeof c.id).toBe('string'); expect(c.id.length).toBeGreaterThan(0);
      expect(typeof c.label).toBe('string'); expect(c.label.length).toBeGreaterThan(0);
      expect(typeof c.icon).toBe('string'); expect(c.icon.length).toBeGreaterThan(0);
      expect(Array.isArray(c.phrases)).toBe(true); expect(c.phrases.length).toBeGreaterThan(0);
      c.phrases.forEach((p) => { expect(typeof p).toBe('string'); expect(p.trim().length).toBeGreaterThan(0); });
    });
  });

  it('offers a useful number of phrases (≥16) with unique category ids', () => {
    const total = P.BRIDGE_PHRASES.reduce((n, c) => n + c.phrases.length, 0);
    expect(total).toBeGreaterThanOrEqual(16);
    const ids = P.BRIDGE_PHRASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('is FERPA-safe + family-friendly: no name/student placeholders, no em-dashes', () => {
    P.BRIDGE_PHRASES.forEach((c) => c.phrases.forEach((p) => {
      expect(p).not.toMatch(/[\{\}\[\]<>]/);                 // no template/name placeholders
      expect(p.toLowerCase()).not.toMatch(/student name|child's name|\bname\b/);
      expect(p).not.toMatch(/—/);                       // em-dash-free
    }));
  });
});

describe('Bridge — conversation transcript (the exportable log)', () => {
  it('renders an empty conversation as an empty string', () => {
    expect(P._bridgeTranscript([], 'English', 'Spanish')).toBe('');
    expect(P._bridgeTranscript(null, 'English', 'Spanish')).toBe('');
  });

  it('labels each turn by speaker language and includes original + translation', () => {
    const out = P._bridgeTranscript([
      { sender: 'personA', text: 'Your child is doing well.', translated: 'Su hijo va muy bien.' },
      { sender: 'personB', text: 'Gracias.', translated: 'Thank you.' },
    ], 'English', 'Spanish');
    expect(out).toMatch(/English: Your child is doing well\./);
    expect(out).toMatch(/Spanish: Su hijo va muy bien\./);    // personA's translation labelled with the OTHER language
    expect(out).toMatch(/Spanish: Gracias\./);
    expect(out).toMatch(/English: Thank you\./);              // personB's translation labelled English
  });

  it('marks AI-helper exchanges with the question, answer and its translation', () => {
    const out = P._bridgeTranscript([
      { ai: true, text: 'how do I say hello warmly?', answer: 'You can say: Hello, I am so glad to see you.', translated: 'Hola, me alegro mucho de verle.' },
    ], 'English', 'Spanish');
    expect(out).toMatch(/\[AI helper\] asked: how do I say hello warmly\?/);
    expect(out).toMatch(/English: You can say/);
    expect(out).toMatch(/Spanish: Hola/);
  });
});
