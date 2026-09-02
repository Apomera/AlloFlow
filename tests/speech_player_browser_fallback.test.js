import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// Pins for the host speech player's browser-voice fallback (AlloFlowANTI.txt,
// `_browserFallback` + `_clearAudio`). speechSynthesis.cancel() is global, so
// the player must only fire it while it owns the speaking/queued utterance;
// an "interrupted"/"canceled" utterance is an ordinary finish, not a failure.
const anti = readFileSync('AlloFlowANTI.txt', 'utf8');
const start = anti.indexOf('let _ownsUtterance = false;');
const end = anti.indexOf('const _invalidateUrl = (url) =>', start);
const player = start >= 0 && end > start ? anti.slice(start, end) : '';

describe('host speech player browser fallback', () => {
  it('locates the player block', () => {
    expect(player.length).toBeGreaterThan(1000);
  });

  it('only cancels speechSynthesis while it owns the utterance', () => {
    expect(player).toContain('if (_ownsUtterance) {');
    expect(player).toContain('_ownsUtterance = true;\n        try { window.speechSynthesis.speak(utterance); }');
    // No bare global cancel on every stop.
    expect(player).not.toContain('        try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}\n    };\n    const _stop');
  });

  it('retires a stuck utterance without cutting off another speaker', () => {
    expect(player).toContain('let orphaned = false;');
    expect(player).toContain('othersSpeaking = !!(synth && synth.speaking)');
    expect(player).toContain('orphaned = true;');
    expect(player).toContain('if (orphaned) {');
  });

  it('treats interrupted and canceled as a quiet finish', () => {
    expect(player).toContain("if (code === 'interrupted' || code === 'canceled') { _finishIfCurrent(id); return; }");
  });

  it('honors mute before queueing and prefers a locale voice', () => {
    expect(player).toContain('if (isGlobalMuted()) { resolve(false); return; }');
    expect(player).toContain('if (match) utterance.voice = match;');
  });
});
