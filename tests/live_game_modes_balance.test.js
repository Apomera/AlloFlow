// Live-session game-mode balance + assist fixes (2026-07-16).
//
//  1. Boss battle was class-size-broken: damage = correctCount * 10 vs a fixed
//     1000 maxHP — a class of 8 answering PERFECTLY needed 13 flawless questions
//     (unwinnable on a 10-question quiz) while a class of 30 won in 4. Damage is
//     now accuracy × a per-question HP budget (maxHP / quizLength × 1.2 headroom),
//     making pacing roster-size-invariant.
//  2. Running out of questions with both HP bars alive STALLED the battle with no
//     resolution; the final reveal now resolves by remaining-HP percentage
//     (class wins ties), reusing the existing boss-defeated/class-defeated phases.
//     The both-zero-same-turn edge (previously fell through) counts as the win.
//  3. Team showdown scored accuracy of RESPONDERS only — one lone correct answer
//     beat a team with 5 of 6 correct. Points now normalize by team size.
//  4. Pictionary guesses stay TEACHER-JUDGED (concept-probe design), but likely
//     matches get a suggest-only "≈ match?" highlight (never auto-awarded).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (f) => fs.readFileSync(path.join(process.cwd(), f), 'utf8');
const T_SRC = read('teacher_source.jsx');
const T_MOD = read('teacher_module.js');
const P_SRC = read('concept_pictionary_source.jsx');
const P_MOD = read('concept_pictionary_module.js');

describe('boss battle: class-size-fair pacing', () => {
  for (const [name, s] of [['source', T_SRC], ['module', T_MOD]]) {
    it(`teacher ${name}: damage is accuracy × per-question HP budget (not correctCount×10)`, () => {
      expect(s).not.toMatch(/damage = correctCount \* 10/);
      expect(s).toMatch(/perQuestionBudget = bossMaxHP \/ quizLength/);
      expect(s).toMatch(/answerAccuracy \* perQuestionBudget \* 1\.2/);
    });
    it(`teacher ${name}: the battle always resolves — last-question HP comparison + both-zero edge`, () => {
      expect(s).toMatch(/isLastQuestion = currentQuestionIndex >= quizLength - 1/);
      expect(s).toMatch(/classPct >= bossPct \? "boss-defeated" : "class-defeated"/);
      // both-zero: newHP <= 0 alone decides (no `&& newClassHP > 0` guard anymore)
      expect(s).not.toMatch(/newHP <= 0 && newClassHP > 0/);
    });
  }
});

describe('team showdown: whole team counts', () => {
  for (const [name, s] of [['source', T_SRC], ['module', T_MOD]]) {
    it(`teacher ${name}: points normalize by team member count, not responders`, () => {
      expect(s).toMatch(/teamMemberCounts/);
      expect(s).toMatch(/Math\.max\(stats\.total, teamMemberCounts\[team\] \|\| 0, 1\)/);
    });
  }
});

describe('pictionary: suggest-only guess matching', () => {
  for (const [name, s] of [['source', P_SRC], ['module', P_MOD]]) {
    it(`pictionary ${name}: normalizer + looksRight helper exist with the suggest chip`, () => {
      expect(s).toMatch(/_pic_normalizeGuess/);
      expect(s).toMatch(/_pic_guessLooksRight/);
      expect(s).toMatch(/match\?/);                         // the suggest chip
    });
  }
  it('pictionary source: the matcher only highlights — it never calls handleMarkCorrect', () => {
    // line-proximity check is meaningful in the SOURCE (compiled output can
    // legitimately co-locate identifiers on one line)
    expect(P_SRC).not.toMatch(/looksRight[^\n]*handleMarkCorrect|handleMarkCorrect[^\n]*looksRight/);
    // and the helper itself is pure (no setter/transport calls in its body)
    const body = P_SRC.match(/const _pic_guessLooksRight = \(guess, concept\) => \{[\s\S]*?\n\};/)[0];
    expect(body).not.toMatch(/set[A-Z]|hostRef|sendGuess|handleMark/);
  });
  it('matcher behavior: case/article/plural tolerant, rejects unrelated guesses', () => {
    // exercise the pure logic by evaluating the source-defined functions
    const src = P_SRC;
    const normBody = src.match(/const _pic_normalizeGuess = \(s\) => String[\s\S]*?\.trim\(\);/)[0];
    const matchBody = src.match(/const _pic_guessLooksRight = \(guess, concept\) => \{[\s\S]*?\n\};/)[0];
    // eslint-disable-next-line no-new-func
    const factory = new Function(`${normBody}\n${matchBody}\nreturn _pic_guessLooksRight;`);
    const looksRight = factory();
    expect(looksRight('The Water Cycle!!', 'water cycle')).toBe(true);
    expect(looksRight('photosynthesis', 'Photosynthesis')).toBe(true);
    expect(looksRight('checks and balance', 'checks and balances')).toBe(true);
    expect(looksRight('a volcano', 'volcanoes')).toBe(true); // article stripped + containment ('volcanoes' ⊃ 'volcano')
    expect(looksRight('dinosaur', 'water cycle')).toBe(false);
    expect(looksRight('', 'water cycle')).toBe(false);
  });
});
