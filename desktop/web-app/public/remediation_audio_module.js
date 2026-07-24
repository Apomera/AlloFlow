(function() {
'use strict';
if (window.AlloModules && window.AlloModules.RemediationAudioModule) { console.log('[CDN] RemediationAudioModule already loaded, skipping'); return; }
// remediation_audio_source.jsx — Web Audio feedback beeps.
// Extracted from AlloFlowANTI.txt on 2026-04-21.
// remediation_audio_source.jsx — Web Audio feedback sounds CDN module
// Extracted from AlloFlowANTI.txt 2026-04-21 (v3 audit — Module G).
//
// Contents:
//   remediationAudio — IIFE returning { chunkGood, chunkMedium, chunkBad,
//     refixStart, refixSuccess, sessionComplete, error } — short Web Audio
//     beeps for live chunk review UI. Respects prefers-reduced-motion + mute.
//
// Dependencies aliased from window: getGlobalAudioContext, isGlobalMuted.
// The monolith-side shim is a Proxy that forwards to window.remediationAudio
// (set below), so all existing remediationAudio.X() call sites continue to work.

var getGlobalAudioContext = (typeof window !== 'undefined' && window.getGlobalAudioContext)
    ? window.getGlobalAudioContext
    : function() {
        var Ctx = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
        return Ctx ? new Ctx() : null;
    };
var isGlobalMuted = (typeof window !== 'undefined' && window.isGlobalMuted)
    ? window.isGlobalMuted
    : function() { return false; };

const remediationAudio = (() => {
  let lastChunkSoundAt = 0;
  const DEBOUNCE_MS = 150;
  const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canPlay = () => !isGlobalMuted() && !prefersReducedMotion();

  // Generic tone generator: frequency (Hz), duration (s), type, gain, attack, release
  const playTone = (freq, duration = 0.12, type = 'sine', gain = 0.12, attack = 0.005, release = 0.08) => {
    if (!canPlay()) return;
    try {
      const ctx = getGlobalAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') { try { ctx.resume(); } catch(e) {} }
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const now = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(gain, now + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, now + duration + release);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + release + 0.02);
    } catch(e) { /* non-blocking */ }
  };

  // Play a chord: array of frequencies, layered
  const playChord = (freqs, duration = 0.5, type = 'triangle', gain = 0.08) => {
    if (!canPlay()) return;
    freqs.forEach((f, i) => setTimeout(() => playTone(f, duration, type, gain, 0.01, 0.25), i * 50));
  };

  return {
    // Chunk completed — good score (≥80): soft high tick, debounced
    chunkGood: () => {
      const now = Date.now();
      if (now - lastChunkSoundAt < DEBOUNCE_MS) return;
      lastChunkSoundAt = now;
      playTone(1760, 0.06, 'sine', 0.08, 0.002, 0.04); // A6
    },
    // Chunk completed — borderline score (60-79): medium tick
    chunkMedium: () => {
      const now = Date.now();
      if (now - lastChunkSoundAt < DEBOUNCE_MS) return;
      lastChunkSoundAt = now;
      playTone(880, 0.08, 'sine', 0.09, 0.003, 0.05); // A5
    },
    // Chunk completed — bad score (<60) or fell back to original: low thud
    chunkBad: () => {
      const now = Date.now();
      if (now - lastChunkSoundAt < DEBOUNCE_MS) return;
      lastChunkSoundAt = now;
      playTone(220, 0.18, 'triangle', 0.12, 0.005, 0.12); // A3
    },
    // Re-fix starts — quick ascending whoosh
    refixStart: () => {
      if (!canPlay()) return;
      playTone(440, 0.08, 'sine', 0.07, 0.005, 0.05);
      setTimeout(() => playTone(660, 0.08, 'sine', 0.07, 0.005, 0.05), 60);
    },
    // Re-fix succeeded — short rising tone
    refixSuccess: () => {
      if (!canPlay()) return;
      playTone(523, 0.1, 'sine', 0.09, 0.005, 0.08);  // C5
      setTimeout(() => playTone(784, 0.12, 'sine', 0.09, 0.005, 0.1), 90); // G5
    },
    // Session complete — triumphant chord (C major → G major)
    sessionComplete: () => {
      if (!canPlay()) return;
      playChord([523.25, 659.25, 783.99], 0.5, 'triangle', 0.08); // C E G
      setTimeout(() => playChord([587.33, 739.99, 880], 0.6, 'triangle', 0.08), 300); // D F# A
    },
    // Error / pipeline failure — descending minor tone
    error: () => {
      if (!canPlay()) return;
      playTone(440, 0.15, 'sawtooth', 0.1, 0.005, 0.1);
      setTimeout(() => playTone(311, 0.25, 'sawtooth', 0.1, 0.005, 0.2), 130);
    },
  };
})();


// ─── Registration ───────────────────────────────────────────────────────────
window.AlloModules = window.AlloModules || {};
window.AlloModules.RemediationAudio = remediationAudio;
window.remediationAudio = remediationAudio;
console.log('[RemediationAudioModule] remediationAudio registered.');

window.AlloModules.RemediationAudioModule = true;
})();
