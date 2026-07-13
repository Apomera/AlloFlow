// Generate Source — flat one-line "Source Text References" trailer strip (truncation fix).
//
// Symptom (was): in single-call SHORT-text generation, Gemini sometimes appends its OWN inline
// "Source Text References" list despite the prompt forbidding it, and often truncates the final URL
// mid-domain when it runs out of output budget. The app then appends its OWN clean bibliography from
// structured grounding metadata, so the user saw TWO refs blocks — the first one a truncated mess.
// The OLD strip regex required `\s*[\n\r]+` immediately after the header word, so it MISSED Gemini's
// flat one-line trailer (header + entries all on a single space-separated line).
//
// Fix (already shipped): (1) the prompt now SPECIFICALLY FORBIDS a refs heading, and (2) the strip is
// a lookahead-gated regex that fires on a reference header immediately followed by a numbered markdown
// link — regardless of newlines — present in all four citation-cleanup paths (short+dialogue, long
// LLM-cleanup, long fallback, short-text retry). This test pins that regex's BEHAVIOR (strips a flat
// trailer, never false-matches body prose or a non-citation heading) plus its presence in the source,
// so the truncation fix can't silently regress.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ce = readFileSync(resolve(process.cwd(), 'content_engine_source.jsx'), 'utf8');

// The contract: the exact lookahead-gated strip the fix introduced (kept in lock-step with the source
// by the anti-drift block below).
const STRIP = /(?:\n|^)\s*(?:#{1,4}\s*)?(?:\*+\s*)?(?:Source\s+Text\s+References|Accuracy\s+Check\s+References|Verified\s+Sources|Works?\s+Cited|Bibliography|Citations)(?:\*+)?[\s:]*(?=\s*\d+\.\s*\[[^\]]+\]\()[\s\S]*$/i;

describe('Generate Source: lookahead-gated refs-trailer strip (truncation fix)', () => {
  it("strips Gemini's FLAT one-line trailer — the exact shape the old `[\\n\\r]+` strip missed", () => {
    const body = 'Water gathers in a big, still puddle at the bottom. ⁽⁸⁾';
    // header + entries on ONE space-separated line, last URL truncated mid-domain
    const truncated = body + '\nSource Text References 1. [Dream - Wikipedia](https://en.wikipedia.org/wiki/Dream) 2. [Water cycle](https://www.khanacademy';
    const out = truncated.replace(STRIP, '').trim();
    expect(out).toBe(body);
    expect(out).not.toContain('khanacademy');          // the truncated URL is gone
    expect(out).not.toContain('Source Text References'); // and so is the unsolicited header
  });

  it('strips a hash-headed multi-line trailer too (the app appends its own clean one)', () => {
    const out = 'Body text here.\n\n### Source Text References\n\n1. [A](https://a.com)\n2. [B](https://b.com)'.replace(STRIP, '').trim();
    expect(out).toBe('Body text here.');
  });

  it('does NOT false-match body prose containing the words "Sources"/"References" (specific headers only)', () => {
    const prose = 'Sources of freshwater include rivers and lakes. References to groundwater appear later.';
    expect(prose.replace(STRIP, '')).toBe(prose);
  });

  it('does NOT strip a real Bibliography heading that is NOT a numbered citation list (lookahead gate)', () => {
    const txt = 'Body.\n\n### Bibliography\n\nSee your textbook chapter 4 for more.';
    expect(txt.replace(STRIP, '')).toBe(txt);
  });
});

describe('anti-drift: the lookahead-gated strip ships in every citation-cleanup path', () => {
  it('the strip literal appears in all four paths (short+dialogue, long LLM, long fallback, short retry)', () => {
    const count = (ce.match(/Accuracy\\s\+Check\\s\+References/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(4);
  });
  it('the source carries the lookahead gate + the documented "flat one-line trailer" rationale', () => {
    expect(ce).toContain('(?=\\s*\\d+\\.\\s*\\[[^\\]]+\\]\\(');
    expect(ce).toContain('flat one-line trailer');
  });
});
