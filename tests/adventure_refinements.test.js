// Adventure refinement wave 2 (2026-07-16, Aaron-approved):
//  A. Scene TTS pre-warm — first sentences synthesize into the tts urlCache during
//     dead time (dice modal / image gen / auto-read delay / hover intent) so playback
//     starts instantly. Voice resolution is SHARED with playSequence via the extracted
//     resolveAdventureSentenceVoice so the warm call hits the same cache key.
//  B. Live concepts chip — stats.conceptsFound was accumulated every turn but only
//     rendered on the game-over Mission Report; now visible during play.
//  C. Options Listen — the per-option audio button rendered only when opt.audio
//     existed, but nothing ever generated opt.audio (dead branch); now it falls back
//     to on-demand TTS of the option text.
//  D. Free-response Strategy Hint — a validated Notice/Connect/Try scaffold, available
//     once per scene with normal rewards and support-use metadata.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (f) => fs.readFileSync(path.join(process.cwd(), f), 'utf8');
const PK_SRC = read('phase_k_helpers_source.jsx');
const PK_MOD = read('phase_k_helpers_module.js');
const VIEW_SRC = read('view_adventure_source.jsx');
const VIEW_MOD = read('view_adventure_module.js');
const HANDLERS_SRC = read('adventure_handlers_source.jsx');
const HANDLERS_MOD = read('adventure_handlers_module.js');
const SESSION_SRC = read('adventure_session_handlers_source.jsx');
const SESSION_MOD = read('adventure_session_handlers_module.js');
const ANTI = read('AlloFlowANTI.txt');

describe('A. adventure scene TTS pre-warm', () => {
  for (const [name, s] of [['source', PK_SRC], ['module', PK_MOD]]) {
    it(`phase_k ${name}: prewarm + shared voice resolution are exported`, () => {
      expect(s).toContain('prewarmSequenceAudio');
      expect(s).toContain('resolveAdventureSentenceVoice');
      // playSequence must DELEGATE to the shared resolver (no duplicated fork to drift)
      expect(s).toMatch(/resolveAdventureSentenceVoice\(sentences, index, activeSpeaker, voiceMap, selectedVoice\)/);
      // Kokoro voices are skipped (urlCache is bypassed for them)
      expect(s).toMatch(/_kokoroPrewarmSkip\s*=\s*\/\^\(af_\|am_\|bf_\|bm_\)\//);
    });
  }
  it('ANTI: prewarm wrapper is de-duped per scene and quota-gated to auto-read + pending scenes', () => {
    expect(ANTI).toMatch(/const prewarmAdventureAudio = \(text, voices\) =>/);
    expect(ANTI).toMatch(/_advPrewarmedRef\.current === key\) return;/);
    // pending-scene warm only when auto-read is ON (quota-safe)
    expect(ANTI).toMatch(/if \(!adventureAutoRead \|\| !pendingAdventureUpdate\) return;/);
    // auto-read effect warms before the 500ms handleSpeak timer
    expect(ANTI).toMatch(/prewarmAdventureAudio\(textToSpeak, adventureState\.currentScene && adventureState\.currentScene\.voices\);/);
  });
  for (const [name, s] of [['source', VIEW_SRC], ['module', VIEW_MOD]]) {
    it(`view ${name}: hover-intent warms both narrative renderers`, () => {
      expect((s.match(/onPointerEnter/g) || []).length).toBeGreaterThanOrEqual(2);
    });
  }
});

describe('B. live concepts chip (the collected-but-hidden pedagogy data)', () => {
  for (const [name, s] of [['source', VIEW_SRC], ['module', VIEW_MOD]]) {
    it(`view ${name}: conceptsFound renders during play with the full list announced`, () => {
      expect(s).toContain('conceptsFound.length');
      expect(s).toMatch(/conceptsFound\.join\(', '\)/);
    });
  }
});

describe('C. options Listen has an on-demand TTS fallback (was a dead branch)', () => {
  for (const [name, s] of [['source', VIEW_SRC], ['module', VIEW_MOD]]) {
    it(`view ${name}: plays opt.audio when present, else synthesizes the option text`, () => {
      expect(s).toMatch(/adventure-option-/);
      // the old dead gate (render only when opt.audio) must be gone as a RENDER condition
      expect(s).not.toMatch(/opt\?\.audio && \(\s*\n?\s*<button|opt\.audio && \/\*#__PURE__\*\//);
    });
  }
});

describe('D. free-response Strategy Hint is useful, retryable, and reward-neutral', () => {
  for (const [name, s] of [['source', HANDLERS_SRC], ['module', HANDLERS_MOD]]) {
    it(`handlers ${name}: validates a grounded Notice/Connect/Try scaffold before consuming the clue`, () => {
      expect(s).toContain('handleAdventureHint');
      expect(s).toContain('await resilientJsonParse');
      expect(s).toContain('const notice =');
      expect(s).toContain('const connect =');
      expect(s).toContain('const tryStep =');
      expect(s).toContain('Strategy Hint response was too vague');
      expect(s).toMatch(/hintUsedTurn:\s*requestTurn/);
      expect(s).toMatch(/currentHint:\s*null/);
    });
  }
  for (const [name, s] of [['source', SESSION_SRC], ['module', SESSION_MOD]]) {
    it(`session ${name}: keeps earned XP intact and records scaffold use as metadata`, () => {
      expect(s).not.toMatch(/Math\.round\(xpDelta \/ 2\)/);
      expect(s).toMatch(/support:\s*['"]strategy_hint['"]/);
    });
  }
  for (const [name, s] of [['source', VIEW_SRC], ['module', VIEW_MOD]]) {
    it(`view ${name}: presents the scaffold clearly without penalty language`, () => {
      expect(s).not.toMatch(/half XP this turn|Need a nudge|Ask for a nudge/);
      expect(s).toContain('renderStrategyHintCard');
      expect(s).toContain('hint_button_helper');
      expect(s).toMatch(/hintUsedTurn === adventureState\.turnCount/);
    });
  }
  it('ANTI: hint wrapper delegates source, draft, objective, mode, and language context', () => {
    expect(ANTI).toMatch(/const handleAdventureHint = async \(\) =>/);
    expect(ANTI).toMatch(/adventureTextInput,[\s\S]*standardsInput,[\s\S]*adventureLanguageMode/);
    expect(ANTI).toMatch(/prewarmAdventureAudio, handleAdventureHint,/);
  });
});

// ── Climax + game-based assessment hardening (2026-07-16, same wave) ─────────
describe('E. climax score integrity', () => {
  for (const [name, s] of [['source', SESSION_SRC], ['module', SESSION_MOD]]) {
    it(`session ${name}: AI masteryScore is coerced, jump-capped to ±25, and clamped 0-100`, () => {
      expect(s).toMatch(/Math\.max\(-25, Math\.min\(25, _candidate - _prevSafe\)\)/);
      expect(s).toMatch(/aiMasteryScore = Math\.min\(100, Math\.max\(0, _candidate\)\)/);
    });
    it(`session ${name}: climax resolves from the CLAMPED score only — the model cannot declare early victory`, () => {
      // the old direct assignment must be gone
      expect(s).not.toMatch(/finalResult = data\.climaxResult/);
      expect(s).toMatch(/if \(finalMasteryScore >= 100\) finalResult = 'victory';/);
    });
    it(`session ${name}: victory/failure ledger input no longer double-counts the final scene+choice`, () => {
      // the duplicated reconstruction pattern must be gone
      expect(s).not.toMatch(/\.\.\.prev\.history,\s*\n\s*\{ type: 'scene', text: prev\.currentScene\?\.text/);
    });
  }
});

describe('F. deterministic-mode score↔outcomeType consistency guard', () => {
  for (const [name, s] of [['source', SESSION_SRC], ['module', SESSION_MOD]]) {
    it(`session ${name}: a misconception can never grade as a success and vice versa (deterministic only)`, () => {
      expect(s).toMatch(/!adventureChanceMode && data\.rollDetails/);
      expect(s).toMatch(/_tag === 'misconception' && _s >= 12/);
      expect(s).toMatch(/_tag === 'strategic_success' && _s < 12/);
    });
  }
});

describe('H. 3-band assessment + unified scales + honest report framing (2026-07-16 wave 2)', () => {
  const UI = read('ui_strings.js');
  const ADV_SRC = read('adventure_source.jsx');
  const ADV_MOD = read('adventure_module.js');
  for (const [name, s] of [['source', SESSION_SRC], ['module', SESSION_MOD]]) {
    it(`session ${name}: partial_success is tracked (was invisible) and scales are named constants`, () => {
      expect(s).toMatch(/if \(outcomeType === 'partial_success'\) newPartials\+\+/);
      expect(s).toMatch(/partials: newPartials,/);
      expect(s).toMatch(/CLIMAX_OUTCOME_DELTAS = \{ strategic_success: 10, partial_success: -5, neutral: -5, misconception: -15 \}/);
      expect(s).toMatch(/HIDDEN_MASTERY_DELTAS = \{ strategic_success: 8, partial_success: 3, neutral: -2, misconception: -8 \}/);
      // the old divergent inline fallback scale must be gone
      expect(s).not.toMatch(/let delta = -2; \/\/ Default slight penalty/);
    });
  }
  for (const [name, s] of [['source', ADV_SRC], ['module', ADV_MOD]]) {
    it(`mission report ${name}: honest framing + AI-estimate caption + 3 bands`, () => {
      expect(s).toMatch(/performance_rating/);
      expect(s).toMatch(/ai_estimate_note/);
      expect(s).toMatch(/band_strong/);
      expect(s).toMatch(/band_partial/);
      expect(s).toMatch(/band_misconception/);
      expect(s).toMatch(/rating2_strong/);
    });
  }
  it('ui_strings: the new keys exist (old keys kept so lang packs are unaffected)', () => {
    for (const k of ['"performance_rating"', '"ai_estimate_note"', '"band_strong"', '"band_partial"', '"band_misconception"', '"rating2_strong"', '"setup_hint"']) {
      expect(UI).toContain(k);
    }
    // old keys retained
    expect(UI).toContain('"proficiency_rating"');
    expect(UI).toContain('"rating_mastery"');
  });
  for (const [name, s] of [['source', VIEW_SRC], ['module', VIEW_MOD]]) {
    it(`view ${name}: climax setup explainer is present`, () => {
      expect(s).toMatch(/climax\.setup_hint|adds a final challenge that tests what the story taught/);
    });
  }
});

describe('G. defeat is not celebrated', () => {
  for (const [name, s] of [['source', VIEW_SRC], ['module', VIEW_MOD]]) {
    it(`view ${name}: energy-death game-over suppresses confetti/trophy and shows the defeat treatment`, () => {
      expect(s).toMatch(/_isDefeat/);
      expect(s).toMatch(/!_isDefeat && /); // confetti gated
      expect(s).toMatch(/game_over_defeat|Out of energy — the journey ends here/);
    });
  }
  for (const [name, s] of [['source', SESSION_SRC], ['module', SESSION_MOD]]) {
    it(`session ${name}: energy-death announces itself (toast + failure sound)`, () => {
      expect(s).toMatch(/newEnergy <= 0 && !prev\.isGameOver/);
      expect(s).toMatch(/energy_depleted/);
    });
  }
});
