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
//  D. Free-response nudge with a COST — hint halves the turn's XP gain (hintUsedTurn
//     stamped by handleAdventureHint, applied in handleDiceRollComplete); one per scene.
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

describe('D. free-response nudge costs half the turn XP gain', () => {
  for (const [name, s] of [['source', HANDLERS_SRC], ['module', HANDLERS_MOD]]) {
    it(`handlers ${name}: handleAdventureHint exported, stamps hintUsedTurn BEFORE the await, never reveals the answer`, () => {
      expect(s).toContain('handleAdventureHint');
      expect(s).toMatch(/hintUsedTurn: prev\.turnCount/);
      expect(s).toMatch(/do NOT reveal the solution/);
    });
  }
  for (const [name, s] of [['source', SESSION_SRC], ['module', SESSION_MOD]]) {
    it(`session ${name}: XP gain is halved only when the hint was used for THIS scene, never below 0`, () => {
      expect(s).toMatch(/xpDelta > 0 && prev\.hintUsedTurn === prev\.turnCount/);
      expect(s).toMatch(/Math\.round\(xpDelta \/ 2\)/);
    });
  }
  for (const [name, s] of [['source', VIEW_SRC], ['module', VIEW_MOD]]) {
    it(`view ${name}: hint button discloses the cost and locks after one use per scene`, () => {
      expect(s).toMatch(/half XP this turn/);
      expect((s.match(/hintUsedTurn === adventureState\.turnCount/g) || []).length).toBeGreaterThanOrEqual(2);
      expect(s).toMatch(/hint_use_starter|Use this sentence starter/);
    });
  }
  it('ANTI: hint wrapper delegates with the deps the handler needs', () => {
    expect(ANTI).toMatch(/const handleAdventureHint = async \(\) =>/);
    expect(ANTI).toMatch(/prewarmAdventureAudio, handleAdventureHint,/);
  });
});
