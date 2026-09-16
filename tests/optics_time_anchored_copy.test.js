import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const SRC = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_optics.js'), 'utf8');

function table(name) {
  const open = `  var ${name} = [`;
  const start = SRC.indexOf(open);
  if (start === -1) return null;
  let depth = 0;
  let i = start + open.length - 1;
  for (; i < SRC.length; i += 1) {
    const c = SRC[i];
    if (c === '[') depth += 1;
    else if (c === ']') { depth -= 1; if (depth === 0) break; }
  }
  try {
    return vm.runInNewContext(`(${SRC.slice(start + open.length - 1, i + 1)})`, {});
  } catch {
    return null;
  }
}

const SAFETY = table('SAFETY_SCENARIOS');
const MAINE = table('OPTICS_MAINE');

describe('Optics safety scenarios — structure', () => {
  it('gives every scenario the four fields a reader acts on', () => {
    expect(Array.isArray(SAFETY)).toBe(true);
    expect(SAFETY.length).toBeGreaterThanOrEqual(9);
    for (const s of SAFETY) {
      for (const field of ['scenario', 'risk', 'action', 'prevention']) {
        expect(typeof s[field], `${s.id} has no ${field}`).toBe('string');
        expect(s[field].trim().length, `${s.id}.${field} is too thin`).toBeGreaterThan(30);
      }
    }
  });
});

// Copy that says "just past", "upcoming" or "next" about a DATE goes stale on
// its own, with no code change and no failing test. Safety guidance especially
// must not depend on when the reader happens to open it.
describe('Optics copy — no claim that decays with the calendar', () => {
  const RELATIVE = /\b(just past|just passed|coming up|upcoming|next (?:major )?(?:solar |total |lunar )?eclipse|this year|last year|recently launched|will launch)\b/i;

  function fields(rows) {
    const out = [];
    for (const r of rows || []) {
      for (const [k, v] of Object.entries(r)) {
        if (typeof v === 'string') out.push({ id: r.id || r.title, key: k, text: v });
      }
    }
    return out;
  }

  it('the eclipse safety note is not pinned to a passing date', () => {
    const sun = SAFETY.find((s) => s.id === 'sunGazing');
    expect(sun, 'the solar-viewing scenario is gone').toBeTruthy();
    const joined = Object.values(sun).filter((v) => typeof v === 'string').join(' ');
    expect(joined, 'the note still says an eclipse is "just past"').not.toMatch(/just past/i);

    // The rule a reader needs is the FILTER rule, and it has to be in ACTION —
    // the field describing what to do in the moment. Asserting it against the
    // whole record passes while `action` says only "look away", because
    // `prevention` still mentions glasses further down the card.
    expect(sun.action, 'the action step no longer names a certified filter')
      .toMatch(/ISO-12312-2|certified/i);
    expect(sun.action, 'the action step no longer forbids unfiltered viewing')
      .toMatch(/never|do not|don't/i);
  });

  it('does not state a "next eclipse" that contradicts the Maine entry', () => {
    // These two tables both name the next totality visible from Maine. They
    // said 2045 and 2079; the August 2045 path crosses California to Florida,
    // not Maine, so the safety note was simply wrong.
    const bangor = MAINE.find((m) => m.id === 'meBangorEclipse');
    expect(bangor, 'the Maine eclipse entry is gone').toBeTruthy();
    const maineYear = bangor.detail.match(/next total eclipse visible from Maine:?\s*(\d{4})/i);
    expect(maineYear, 'the Maine entry no longer names the next totality').toBeTruthy();

    const sun = SAFETY.find((s) => s.id === 'sunGazing');
    const years = (sun.maine.match(/\b(20\d\d)\b/g) || []).map(Number);
    const futures = years.filter((y) => y > 2026);
    for (const y of futures) {
      expect(y, `the safety note claims a Maine totality in ${y}, but the Maine entry says ${maineYear[1]}`)
        .toBe(Number(maineYear[1]));
    }
  });

  it('carries no UNDATED relative-time phrase in any safety scenario', () => {
    // "the next total eclipse visible from Maine is in 2079" names a year, so
    // it stays true however long the tool sits. What decays is a relative
    // phrase with no date attached — "just past", "coming up", "this year".
    // Judge each SENTENCE, since one field can hold both kinds.
    const bad = [];
    for (const f of fields(SAFETY)) {
      for (const sentence of f.text.split(/(?<=[.;])\s+/)) {
        const hit = sentence.match(RELATIVE);
        if (!hit) continue;
        if (/\b(?:19|20)\d\d\b/.test(sentence)) continue;   // anchored to a year
        bad.push(`${f.id}.${f.key}: "${sentence.trim()}"`);
      }
    }
    expect(bad, 'safety copy that decays with the calendar').toEqual([]);
  });

  it('allows past-tense history, which does not decay', () => {
    // Guards against over-correcting: the Maine entry describes April 8 2024
    // in the past tense and must stay exactly as it is.
    const bangor = MAINE.find((m) => m.id === 'meBangorEclipse');
    expect(bangor.detail).toMatch(/passed through northern Maine/i);
    expect(bangor.detail).not.toMatch(/just past|upcoming/i);
  });
});
