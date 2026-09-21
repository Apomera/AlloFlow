import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = 'stem_lab/stem_tool_lifeskills.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_lifeskills.js';
const read = (f) => readFileSync(resolve(process.cwd(), f), 'utf8');

function bodyOf(src, name) {
  const i = src.search(new RegExp('function\\s+' + name + '\\s*\\('));
  if (i === -1) return null;
  let depth = 0, started = false;
  for (let j = i; j < src.length; j += 1) {
    if (src[j] === '{') { depth += 1; started = true; }
    else if (src[j] === '}') { depth -= 1; if (started && depth === 0) return src.slice(i, j + 1); }
  }
  return null;
}

/**
 * Bound a `var <name> = [ ... ];` by its terminating `\n  ];`, NOT by brace
 * matching. CHALLENGE_QS is followed immediately by BATTLE_QS, and a matcher
 * that over-reads silently merges the two — which is how an earlier pass
 * "found" 48 untiered questions that do not exist.
 */
function arrayLiteral(src, name) {
  const start = src.indexOf('var ' + name + ' = [');
  if (start === -1) return null;
  const end = src.indexOf('\n  ];', start);
  if (end === -1) return null;
  return src.slice(src.indexOf('[', start), end + 4);
}
// eslint-disable-next-line no-new-func
const load = (src, n) => new Function('return ' + arrayLiteral(src, n) + ';')();

/** The real matcher, sliced out and run. */
function loadMatcher(file) {
  const src = read(file);
  const norm = bodyOf(src, 'normalizeAnswerText');
  const match = bodyOf(src, 'answerMatches');
  if (!norm || !match) throw new Error('matcher not found in ' + file);
  // eslint-disable-next-line no-new-func
  return new Function(norm + '\n' + match + '\n; return answerMatches;')();
}

describe('Life Skills Lab — quiz answer keys', () => {
  it('states tax on $40,000 as the brackets actually compute it', () => {
    // The key said 4564. 11,600 x .10 = 1,160; (40,000 - 11,600) x .12 = 3,408;
    // total 4,568. The question's OWN hint gives that derivation, so a student who
    // followed the hint was marked wrong and could not appeal.
    const q = load(read(SOURCE), 'CHALLENGE_QS')
      .find((x) => x.q.includes('what is tax on $40,000'));
    expect(q).toBeTruthy();
    expect(parseFloat(q.a)).toBe(11600 * 0.10 + (40000 - 11600) * 0.12);
  });

  it('does not ask for a payoff time that does not exist', () => {
    // "Paying minimum ($25) on $5,000 at 24.99% APR — roughly how many years to
    // pay off?" keyed 30. At a FLAT $25/month the interest alone is ~$104, so the
    // balance grows without bound and the debt is NEVER repaid. Not a rounding
    // error — the wrong shape of answer.
    const qs = load(read(SOURCE), 'CHALLENGE_QS');
    const monthlyInterest = 5000 * (0.2499 / 12);
    expect(monthlyInterest).toBeGreaterThan(25); // the premise
    expect(qs.some((q) => /roughly how many years to pay off/.test(q.q))).toBe(false);
    const rewritten = qs.find((q) => /when is it paid off/.test(q.q));
    expect(rewritten, 'the rewritten question is missing').toBeTruthy();
    expect(rewritten.a).toBe('never');
  });

  it('states the contract minimum-payment trap at its real size', () => {
    // The Contracts tab claimed "30+ YEARS and costs $12,000+". Under the
    // contract's OWN rule (greater of $25 or 1% of balance + interest) it is
    // 19.7 years and $9,278. Overstating a real hazard is still wrong.
    let bal = 5000, months = 0, interest = 0;
    const r = 0.2499 / 12;
    while (bal > 0.005 && months < 12000) {
      const i = bal * r;
      const pay = Math.max(25, bal * 0.01 + i);
      interest += i;
      bal = bal + i - Math.min(pay, bal + i);
      months += 1;
    }
    expect(Math.round(months / 12)).toBe(20);
    expect(Math.round(interest / 100) * 100).toBe(9300);
    const src = read(SOURCE);
    expect(src).not.toContain('takes 30+ YEARS and costs $12,000+');
    expect(src).toContain('about 20 YEARS and costs about $9,300');
  });

  it('gives every question an answer, a hint, and a usable tier', () => {
    const src = read(SOURCE);
    const chal = load(src, 'CHALLENGE_QS');
    const battle = load(src, 'BATTLE_QS');
    // CHALLENGE_QS is filtered by tier; BATTLE_QS is not (no tier selector).
    expect(chal.length).toBeGreaterThan(50);
    expect(battle.length).toBeGreaterThan(20);
    for (const q of chal) expect([1, 2, 3], q.q.slice(0, 40)).toContain(q.tier);
    for (const q of chal.concat(battle)) {
      expect(String(q.a || '').trim(), 'no answer: ' + q.q.slice(0, 40)).not.toBe('');
      expect(String(q.h || '').trim(), 'no hint: ' + q.q.slice(0, 40)).not.toBe('');
    }
  });

  it('keeps every tier populated so the tab can never show a blank question', () => {
    const chal = load(read(SOURCE), 'CHALLENGE_QS');
    for (const tier of [1, 2, 3]) {
      expect(chal.filter((q) => q.tier === tier).length,
        'tier ' + tier + ' is empty').toBeGreaterThan(0);
    }
  });
});

describe('Life Skills Lab — quiz grading', () => {
  it('accepts every answer key it ships', () => {
    const matches = loadMatcher(SOURCE);
    const src = read(SOURCE);
    for (const q of load(src, 'CHALLENGE_QS').concat(load(src, 'BATTLE_QS'))) {
      expect(matches(q.a, q.a), 'rejects its own key: ' + q.a).toBe(true);
    }
  });

  it('does not score a number that merely CONTAINS the answer', () => {
    // THE BUG. Grading was `normalise(typed).indexOf(normalise(key)) >= 0`, which
    // fails open. 16 numeric keys in this bank are substrings of other numeric
    // keys, so "2000" scored a question whose answer was "2".
    const matches = loadMatcher(SOURCE);
    expect(matches('2000', '2')).toBe(false);
    expect(matches('22', '2')).toBe(false);
    expect(matches('134', '13')).toBe(false);
    expect(matches('3500', '35')).toBe(false);
  });

  it('does not score an explicit negation of the right answer', () => {
    const matches = loadMatcher(SOURCE);
    expect(matches('not 165', '165')).toBe(false);
    expect(matches('never', '165')).toBe(false);
    // ...but a key that IS a negative must still be accepted.
    expect(matches('no', 'no')).toBe(true);
    expect(matches('No.', 'no')).toBe(true);
    expect(matches('never', 'never')).toBe(true);
  });

  it('does not score a word that merely contains the answer', () => {
    const matches = loadMatcher(SOURCE);
    expect(matches('nothing', 'no')).toBe(false);
  });

  it('still accepts the ways a student really types a right answer', () => {
    // A stricter grader must not start failing correct work.
    const matches = loadMatcher(SOURCE);
    for (const [typed, key] of [
      ['600', '600'], ['$600.00', '600'], ['600 dollars', '600'],
      ['165 degrees', '165'], ['  4568 ', '4568'], ['2.250', '2.25'],
      ['a resume', 'resume'], ['the flapper valve', 'flapper'],
      ['Annual Percentage Rate', 'annual percentage rate'],
      ['gay-lussac', 'gay-lussac'], ['it is never paid off', 'never'],
      ['about 165', '165'], ['165, I think', '165'],
    ]) {
      expect(matches(typed, key), `rejected "${typed}" for key "${key}"`).toBe(true);
    }
  });

  it('scores nothing for an empty or nonsense answer', () => {
    const matches = loadMatcher(SOURCE);
    for (const junk of ['', '   ', 'asdf', '???', 'null', 'undefined']) {
      for (const key of ['165', '2', 'resume', 'never', 'no']) {
        expect(matches(junk, key), `"${junk}" scored key "${key}"`).toBe(false);
      }
    }
  });

  it('guards the tier against a persisted value that has no questions', () => {
    // `d.chalTier || 1` accepted any truthy value. chalTier: 99 left the pool
    // empty, made `chalIdx % 0` NaN, rendered a BLANK question with a live Check
    // button — and Check then threw on chalQ.a, blanking the lab.
    const src = read(SOURCE);
    expect(src).toMatch(/d\.chalTier === 1 \|\| d\.chalTier === 2 \|\| d\.chalTier === 3/);
    expect(src).toContain('tierQs.length ? tierQs[');
    expect(src).toContain('if (!chalAnswer.trim() || !chalQ) return;');
  });

  it('uses one grader for both quizzes', () => {
    // Battle had its own copy of the same failing-open expression.
    const src = read(SOURCE);
    expect(src).toContain('answerMatches(chalAnswer, chalQ.a)');
    expect(src).toContain('answerMatches(battleAnswer, q.a)');
    expect(src).not.toMatch(/indexOf\(q\.a\.toLowerCase\(\)/);
  });

  it('ships the same grader in the desktop mirror', () => {
    for (const fn of ['normalizeAnswerText', 'answerMatches']) {
      expect(bodyOf(read(MIRROR), fn), fn + ' missing from mirror')
        .toBe(bodyOf(read(SOURCE), fn));
    }
  });
});
