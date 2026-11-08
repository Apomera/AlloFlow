'use strict';
// tts_engines.cjs - SPIKE (2026-11-08). Pluggable narration engines for compile_tutorial.cjs.
// Every engine returns { samples: Float32Array (mono), sampleRate } so the mixer never cares which one spoke.
//
//   kokoro  LOCAL, offline after the first model download (~90 MB, cached), no account, no per-use cost.
//           English only: kokoro-js 1.2.1 ships 28 en-US / en-GB voices, and AlloFlow's own loader
//           (kokoro_tts_loader.js: KOKORO_LANGS = new Set(['en'])) agrees. Other languages need another engine.
//   sapi    Windows built-in voices. Dev fallback only: robotic, Windows-only.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readWav } = require('./compile_lib.cjs');

async function createKokoro(opts) {
  const voice = (opts && opts.voice) || 'af_heart';
  const { KokoroTTS } = await import('kokoro-js'); // resolves from spike/node_modules
  const t0 = performance.now();
  const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'cpu' });
  if (!tts.voices[voice]) throw new Error('Unknown Kokoro voice "' + voice + '". Available: ' + Object.keys(tts.voices).join(', '));
  return {
    name: 'kokoro', voice, loadMs: Math.round(performance.now() - t0), languages: ['en-us', 'en-gb'],
    async synth(text) {
      const a = await tts.generate(text, { voice });
      return { samples: Float32Array.from(a.audio), sampleRate: a.sampling_rate };
    },
  };
}

function createSapi(opts) {
  const rate = opts && opts.rate !== undefined ? opts.rate : 1;
  const script = path.join(__dirname, 'fixtures', 'tts.ps1');
  return {
    name: 'sapi', voice: 'Windows default', loadMs: 0, languages: ['system'],
    async synth(text) {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sapi-'));
      try {
        fs.writeFileSync(path.join(dir, 'in.json'), JSON.stringify([{ id: 'x', text }]));
        const r = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, '-LinesJson', path.join(dir, 'in.json'), '-OutDir', dir, '-Rate', String(rate)], { encoding: 'utf8' });
        if (r.status !== 0) throw new Error('SAPI failed: ' + (r.stderr || r.stdout));
        return readWav(fs.readFileSync(path.join(dir, 'x.wav')));
      } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    },
  };
}

async function createTts(name, opts) {
  if (name === 'kokoro') return createKokoro(opts);
  if (name === 'sapi') return createSapi(opts);
  throw new Error('Unknown TTS engine "' + name + '" (use kokoro or sapi)');
}

module.exports = { createTts };
