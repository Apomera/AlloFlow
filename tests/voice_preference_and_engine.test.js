// Two reports from a real session, both about "the app is not using the voice I
// picked":
//
//   1. The Narrator Voice dropdown did not come back on the last choice. The
//      write was guarded by `if (storedVoice && storedVoice !== selectedVoice &&
//      !catalogsReady) return;`, which cannot tell a transient default apart
//      from a deliberate pick, so a voice chosen before the catalogs loaded was
//      never saved. On a surface where a catalog never fills, it was never
//      saved at all.
//   2. Piper was being fetched and attempted for ENGLISH narration while a
//      Gemini voice (Kore) was selected, surfacing a Piper model error as the
//      only visible symptom.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const COPIES = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt'];
const TTS_SRC = readFileSync('tts_source.jsx', 'utf8');
const TTS_MOD = readFileSync('tts_module.js', 'utf8');

describe('a deliberate voice choice is saved immediately', () => {
  for (const f of COPIES) {
    it(`${f} routes the picker through chooseVoice`, () => {
      const src = readFileSync(f, 'utf8');
      expect(src).toContain('const chooseVoice = useCallback(');
      // Going through a named handler is what lets the app know a HUMAN chose
      // this; the effect cannot infer it from a state change.
      expect(src).toContain('setSelectedVoice={chooseVoice}');
      expect(src, 'raw setter no longer reaches the picker').not.toContain('setSelectedVoice={setSelectedVoice}');
    });

    it(`${f} writes storage without waiting for the voice catalogs`, () => {
      const src = readFileSync(f, 'utf8');
      const at = src.indexOf('const chooseVoice = useCallback(');
      // Slice to the END of the callback: a fixed window bleeds into the
      // effect that follows, which legitimately mentions catalogsReady.
      const body = src.slice(at, src.indexOf('}, [selectedVoice]);', at));
      expect(body).toContain("safeSetItem('allo_voice_preference', next)");
      // The catalogs-ready guard belongs to the effect, not to a real pick.
      expect(body, 'a pick must not be gated on catalogs').not.toContain('catalogsReady');
    });

    it(`${f} keeps the effect's guard against a transient default`, () => {
      // The original bug this guard fixed is real: a validator fallback equal to
      // 'Kore' must not overwrite a stored preference while catalogs load.
      const src = readFileSync(f, 'utf8');
      expect(src).toContain('const catalogsReady = (AVAILABLE_VOICES.length > 0 || KOKORO_VOICES.length > 0);');
    });

    it(`${f} still supports a functional updater`, () => {
      const src = readFileSync(f, 'utf8');
      const at = src.indexOf('const chooseVoice = useCallback(');
      // setState(fn) is a legitimate call shape; wrapping must not break it.
      expect(src.slice(at, at + 400)).toMatch(/typeof value === 'function' \? value\(selectedVoice\) : value/);
    });
  }
});

describe('English narration does not detour through Piper', () => {
  it('does not fetch a Piper model for English', () => {
    // Was: fetch Piper whenever Kokoro was not ready, English included.
    expect(TTS_SRC).not.toContain("(ttsLang !== 'en' || !window._kokoroTTS?.ready)");
    const gates = TTS_SRC.split("if (!window._piperTTS && ttsLang !== 'en') {").length - 1;
    expect(gates, 'both code paths').toBe(2);
  });

  it('does not attempt Piper for English even if already loaded', () => {
    // Loading it for another language must not make it the English fallback.
    expect(TTS_SRC).toContain('const PIPER_HANDLES_ENGLISH = false;');
    const guarded = TTS_SRC.split('if (PIPER_HANDLES_ENGLISH && window._piperTTS) {').length - 1;
    expect(guarded, 'both English branches').toBe(2);
  });

  it('keeps Piper for the languages it exists to serve', () => {
    // The multilingual path is the reason Piper is here at all.
    expect(TTS_SRC).toContain('window._piperTTS.supportsLanguage(ttsLang)');
  });

  it('leaves the browser voice as the final fallback', () => {
    // Skipping Piper is only safe because something always answers after it.
    expect(TTS_SRC).toMatch(/fall back to the device\/browser voice/);
  });

  it('reached the built module, not just the source', () => {
    expect(TTS_MOD).toContain('PIPER_HANDLES_ENGLISH');
    expect(TTS_MOD).not.toContain("(ttsLang !== 'en' || !window._kokoroTTS?.ready)");
  });
});
