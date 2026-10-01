import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('adventure_source.jsx', 'utf8');
const engineStart = source.indexOf('// Shared Adventure mixer.');
const ambienceStart = source.indexOf('const AdventureAmbience = React.memo');
const engineSource = source.slice(engineStart, ambienceStart);
const analyzerStart = engineSource.indexOf('const analyzeAdventureRenderedAudio =');
const lifecycleStart = engineSource.indexOf('const isAdventureAudioDocumentHidden =');
const analyzerSource = engineSource.slice(analyzerStart, lifecycleStart);
const analyzeRenderedAudio = new Function(`${analyzerSource}; return analyzeAdventureRenderedAudio;`)();

const renderSmoothProbe = (sampleRate = 12000, duration = 1.1) => {
  const samples = new Float32Array(Math.floor(sampleRate * duration));
  for (let index = 0; index < samples.length; index++) {
    const time = index / sampleRate;
    let envelope = 0;
    if (time < 0.02) envelope = 0.22 * (time / 0.02);
    else if (time < 0.42) envelope = 0.22;
    else if (time < 0.8) envelope = 0.22 * Math.max(0, 1 - ((time - 0.42) / 0.38));
    samples[index] = Math.sin(2 * Math.PI * 440 * time) * envelope;
  }
  return samples;
};

describe('Adventure offline audio rendering diagnostics', () => {
  it('accepts a bounded smooth tone with a silent tail', () => {
    const result = analyzeRenderedAudio(renderSmoothProbe(), 12000);
    expect(result.passed).toBe(true);
    expect(result.peak).toBeGreaterThan(0.2);
    expect(result.peak).toBeLessThan(0.23);
    expect(result.maxStep).toBeLessThan(0.06);
    expect(result.tailPeak).toBe(0);
    expect(result.nonFinite).toBe(0);
  });

  it('rejects clipping, discontinuities, silence, and non-finite samples', () => {
    const clipped = new Float32Array(1200).fill(1.05);
    const clicked = new Float32Array(1200);
    clicked[500] = 0.8;
    const silent = new Float32Array(1200);
    const invalid = new Float32Array(1200);
    invalid[20] = Number.NaN;
    expect(analyzeRenderedAudio(clipped, 12000).passed).toBe(false);
    expect(analyzeRenderedAudio(clicked, 12000).passed).toBe(false);
    expect(analyzeRenderedAudio(clicked, 12000).maxStep).toBe(0.8);
    expect(analyzeRenderedAudio(silent, 12000).passed).toBe(false);
    expect(analyzeRenderedAudio(invalid, 12000).nonFinite).toBe(1);
  });

  it('renders the browser diagnostic through OfflineAudioContext and the production compressor shape', () => {
    expect(engineSource).toContain('scope.OfflineAudioContext || scope.webkitOfflineAudioContext');
    expect(engineSource).toContain('const offline = new OfflineContext(1, Math.floor(sampleRate * 1.1), sampleRate)');
    expect(engineSource).toContain('offline.createDynamicsCompressor()');
    expect(engineSource).toContain('const rendered = await offline.startRendering()');
    expect(engineSource).toContain('return analyzeAdventureRenderedAudio(rendered, sampleRate)');
  });

  it('keeps Sound Lab ambience isolated from the live scene layer', () => {
    expect(engineSource).toContain('let currentPreview = null');
    expect(engineSource).toContain('const previewThemeState = createAdventureThemeState()');
    expect(engineSource).toContain('const playPreview =');
    expect(engineSource).toContain('const stopPreview =');
    expect(engineSource).toContain('currentPreview ? { ...currentPreview.profile }');
    expect(engineSource).toContain('currentAmbience.volume * 0.16');
    expect(engineSource).toContain('rampGain(currentAmbience.gain, currentAmbience.volume, 0.32)');
    expect(engineSource).toContain("'alloflow-adventure-audio-preview'");
  });

  it('exposes accessible profile, cue, stop, and waveform controls', () => {
    expect(source).toContain('Adventure Sound Lab');
    expect(source).toContain('id="adventure-lab-atmosphere"');
    expect(source).toContain('id="adventure-lab-element"');
    expect(source).toContain('id="adventure-lab-space"');
    expect(source).toContain('id="adventure-lab-motion"');
    expect(source).toContain('id="adventure-lab-intensity"');
    expect(source).toContain("aria-label={translate('adventure.audio_event_previews'");
    expect(source).toContain('Run waveform check');
    expect(source).toContain("role=\"status\" aria-live=\"polite\"");
  });
});
