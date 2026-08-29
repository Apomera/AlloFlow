// Printing Press question-quality cues (2026-08-25).
//
// The bank had THREE separate ways of leaking its answer, and fixing one did
// not touch the others:
//   1. POSITION - 71% of keys at index 1. Fixed earlier, render-time, by
//      ppPlaceAnswer(); pinned by printingpress_answer_placement.test.js.
//   2. LENGTH - 184 of 246 keys were the uniquely longest option (75%), so
//      "pick the longest" beat knowing the material. A length tell SURVIVES the
//      position rotation. Paid down to 3 by hand-rewriting 173 questions'
//      distractors; the global ratchet in tool_answer_length_clue_ratchet.test
//      .js holds the count down.
//   3. WORDING - this file. Absolute qualifiers clustered on distractors, so
//      "an absolute is usually wrong" beat chance, and a handful of keys
//      repeated a distinctive word from their own stem.
//
// Measured over the SHIPPED bank using the sweep's own extraction schema, so a
// question that stops being extractable cannot quietly pass.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// PP_SRC lets the suite be pointed at a deliberately degraded COPY to prove the
// thresholds below actually fire. They are RATES, so a one-item sabotage cannot
// trip them by design - calibration has to degrade the bank at scale, and doing
// that to the real file risks leaving it broken.
const SRC = process.env.PP_SRC || 'stem_lab/stem_tool_printingpress.js';
const src = readFileSync(SRC, 'utf8');

function splitOptions(raw) {
  const out = [];
  let i = 0;
  while (i < raw.length) {
    const c = raw[i];
    if (c === "'" || c === '"') {
      const q = c; i += 1; let t = '';
      while (i < raw.length && raw[i] !== q) {
        if (raw[i] === '\\') { t += raw[i + 1]; i += 2; } else { t += raw[i]; i += 1; }
      }
      i += 1; out.push(t);
    } else if (' \n\r\t,'.includes(c)) { i += 1; } else { return null; }
  }
  return out;
}

const bank = (() => {
  const seen = new Set();
  const items = [];
  const add = (raw, idx, at) => {
    const opts = splitOptions(raw);
    if (!opts || opts.length < 2 || opts.length > 6) return;
    if (idx < 0 || idx >= opts.length || seen.has(at)) return;
    seen.add(at);
    const before = src.slice(Math.max(0, at - 400), at);
    const qm = /(?:q|prompt|question|clue):\s*(?:__alloT\('[^']*',\s*)?'((?:[^'\\]|\\.)*)'/g;
    let last = null; let mm;
    while ((mm = qm.exec(before)) !== null) last = mm[1];
    items.push({ q: (last || '').replace(/\\'/g, "'"), opts, ans: idx });
  };
  for (const m of src.matchAll(/(?:options|opts|choices|a):\s*\[([^\]]{4,900})\]\s*,\s*(?:correctIndex|correctIdx|correct|answer|ans|a|c):\s*(\d+)/g)) add(m[1], +m[2], m.index);
  for (const m of src.matchAll(/(?:correctIndex|correctIdx|correct|answer|ans|a|c):\s*(\d+)\s*,\s*(?:options|opts|choices|a):\s*\[([^\]]{4,900})\]/g)) add(m[2], +m[1], m.index);
  return items;
})();

const ABS_RAW = /\b(always|never|entirely|completely|impossible|invariably)\b/i;
const FREQ = /\bevery\s+(?:\d|few|other|second|third)/i;
const carriesAbsolute = (s) => {
  if (ABS_RAW.test(s)) return true;
  if (/\bevery\b/i.test(s) && !FREQ.test(s)) return true;
  return /\bonly\b/i.test(s) || /\bnone\b/i.test(s);
};

describe('printingpress question cues', () => {
  it('extraction still reaches the whole bank (guards every other assertion here)', () => {
    // If a rewrite pushes an option array past the sweep's 900-char window the
    // question stops being MEASURED rather than failing, and every rate below
    // would improve for the wrong reason. This happened once: the count fell
    // 246 -> 245 and the item had to be trimmed back under the cap.
    expect(bank.length).toBeGreaterThanOrEqual(246);
  });

  it('keeps the answer out of the longest option', () => {
    let longest = 0;
    let arity4 = 0;
    bank.forEach((it) => {
      if (it.opts.length !== 4) return;
      arity4 += 1;
      const lens = it.opts.map((o) => o.length);
      const others = lens.filter((_, k) => k !== it.ans);
      if (lens[it.ans] > Math.max(...others)) longest += 1;
    });
    // Chance for a 4-option item is 25%. Anything at or above that is not a
    // tell; the bank sits far below it and must not climb back.
    expect(longest / arity4, longest + ' of ' + arity4 + ' keys uniquely longest').toBeLessThan(0.1);
  });

  it('does not make the shortest option the answer instead (the anti-tell)', () => {
    let shortest = 0;
    let arity4 = 0;
    bank.forEach((it) => {
      if (it.opts.length !== 4) return;
      arity4 += 1;
      const lens = it.opts.map((o) => o.length);
      const others = lens.filter((_, k) => k !== it.ans);
      if (lens[it.ans] < Math.min(...others)) shortest += 1;
    });
    // Over-correcting length is its own tell in the opposite direction.
    expect(shortest / arity4, shortest + ' of ' + arity4 + ' keys uniquely shortest').toBeLessThan(0.25);
  });

  it('does not let "an absolute is usually wrong" beat the material', () => {
    let onKey = 0;
    let onDistractor = 0;
    bank.forEach((it) => {
      it.opts.forEach((o, k) => {
        if (!carriesAbsolute(o)) return;
        if (k === it.ans) onKey += 1; else onDistractor += 1;
      });
    });
    const total = onKey + onDistractor;
    expect(total, 'no absolutes found at all - the detector is broken').toBeGreaterThan(5);
    // Some restrictive distractors are load-bearing: "Only at the Library of
    // Congress" is wrong BECAUSE it over-restricts, and that is fair game. So
    // the SHARE sitting on distractors barely moves however much you clean up
    // (it was 83% before the paydown and is ~82% after) - guarding it would
    // pass on the known-bad state and prove nothing.
    //
    // What the cleanup actually changed is the heuristic's REACH: how many
    // questions "an absolute is probably wrong" can be applied to at all. That
    // fell from 50 distractors to ~23, so guard the count.
    expect(onDistractor, onDistractor + ' distractors carry an absolute (' + onKey + ' keys do)')
      .toBeLessThan(32);
  });

  it('does not answer itself by echoing a distinctive stem word', () => {
    const STOP = new Set(('the a an of to in on for and or is are was were be been it its this that these those what which who whom whose why how when where did do does not no with from by as at than then their there they you your we our but if so all any some more most other another each').split(' '));
    const words = (s) => (s.toLowerCase().match(/[a-z][a-z-]{3,}/g) || []).filter((w) => !STOP.has(w));
    let cueing = 0;
    bank.forEach((it) => {
      if (!it.q) return;
      const qw = new Set(words(it.q));
      if (!qw.size) return;
      const hit = it.opts.map((o) => words(o).some((w) => qw.has(w)));
      if (hit.filter(Boolean).length === 1 && hit[it.ans]) cueing += 1;
    });
    // Some overlap is unavoidable (a clue naming "The Times of London" and an
    // answer of "Times New Roman"), so this is a ceiling, not zero.
    expect(cueing, cueing + ' keys uniquely echo a stem word').toBeLessThan(12);
  });

  it('never lets a rewrite touch the key, the stem, or the option count', () => {
    // Structural sanity the distractor-only policy depends on.
    bank.forEach((it) => {
      expect(it.opts.length).toBeGreaterThanOrEqual(2);
      expect(it.ans).toBeGreaterThanOrEqual(0);
      expect(it.ans).toBeLessThan(it.opts.length);
      expect(it.opts[it.ans].trim().length, 'empty key: ' + it.q.slice(0, 50)).toBeGreaterThan(0);
      expect(new Set(it.opts.map((o) => o.trim().toLowerCase())).size,
        'duplicate options in: ' + it.q.slice(0, 60)).toBe(it.opts.length);
    });
  });
});
