import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const simplifiedSource = readFileSync(resolve(process.cwd(), 'view_simplified_source.jsx'), 'utf8');
const immersiveSource = readFileSync(resolve(process.cwd(), 'immersive_reader_source.jsx'), 'utf8');
const hostSources = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
  'desktop/web-app/src/AlloFlowANTI.txt',
].map((file) => ({ file, source: readFileSync(resolve(process.cwd(), file), 'utf8') }));

describe('Immersive Reader word-level read-along regressions', () => {
  it('turns the host sentence sweep into a per-word visual fill', () => {
    expect(simplifiedSource).toContain('Number(chunkReaderSweepPct)');
    expect(simplifiedSource).toContain('data-read-along-state={readAlongWordState || undefined}');
    expect(simplifiedSource).toContain('data-read-along-progress={readAlongWordProgress == null ? undefined : Math.round(readAlongWordProgress)}');
    expect(simplifiedSource).toContain('linear-gradient(to right');
    expect(simplifiedSource).toContain('readAlongWordProgress}%');
    expect(simplifiedSource).toContain('!chunkReaderReadAlong || readAlongWordProgress > 0');
  });

  it('sends an atomic word tap through the direct interactive speech path', () => {
    expect(simplifiedSource).not.toMatch(/handleSpeak\(simplifiedReadAloudText, 'simplified-main', assignedIdx\)/);
    expect(simplifiedSource).toContain('const spokenWord = String(wordData.text');
    expect(simplifiedSource).toContain('handleSpeak(spokenWord,');
    expect(simplifiedSource).toContain('immersive-word-');
    expect(simplifiedSource).toContain(', 0, true);');
  });

  it('runs foreground Read Along on an abortable interactive request in every host', () => {
    for (const entry of hostSources) {
      expect(entry.source, entry.file).toContain('reason: \'immersive-read-along\'');
      expect(entry.source, entry.file).toContain('maxRetries: 0');
      expect(entry.source, entry.file).toContain('priority: \'interactive\'');
      expect(entry.source, entry.file).toContain('signal: requestController ? requestController.signal : undefined');
      expect(entry.source, entry.file).toContain('requestController && requestController.abort()');
      expect(entry.source, entry.file).toContain('requestAnimationFrame(updateAudioSweep)');
      expect(entry.source, entry.file).toContain('audio.playbackRate = Math.max(0.5, Math.min(2, Number(voiceSpeed) || 1))');
      expect(entry.source, entry.file).toContain('const fallbackRate = Math.max(0.5, Math.min(2, 0.95 * (Number(voiceSpeed) || 1)))');
      expect(entry.source, entry.file).toContain('selectedVoice, voiceSpeed, leveledTextLanguage, currentUiLanguage]');
    }
  });
});

describe('Karaoke sweep clock regressions', () => {
  it('samples generated audio on animation frames', () => {
    expect(immersiveSource).toContain('const tickGeneratedSweep = () => {');
    expect(immersiveSource).toContain('requestAnimationFrame(tickGeneratedSweep)');
    expect(immersiveSource).toMatch(/addEventListener\('playing', startGeneratedSweepClock\)/);
    expect(immersiveSource).not.toMatch(/addEventListener\('timeupdate', updateSweep\)/);
  });

  it('starts browser estimates when speech actually starts', () => {
    expect(immersiveSource).toContain('let startTs = null;');
    const fallbackStart = immersiveSource.indexOf('const u = new SpeechSynthesisUtterance(sentenceText);');
    const onStart = immersiveSource.indexOf('u.onstart = () => {', fallbackStart);
    const clockStart = immersiveSource.indexOf('startTs = performance.now();', onStart);
    const speak = immersiveSource.indexOf('window.speechSynthesis.speak(u);', clockStart);
    expect(onStart).toBeGreaterThan(fallbackStart);
    expect(clockStart).toBeGreaterThan(onStart);
    expect(speak).toBeGreaterThan(clockStart);
  });

  it('does not let sentence-only boundaries freeze the estimate', () => {
    expect(immersiveSource).toMatch(/boundaryKind && boundaryKind !== 'word'/);
    expect(immersiveSource).toContain('(now - lastWordBoundaryAt) > 750');
  });
});
