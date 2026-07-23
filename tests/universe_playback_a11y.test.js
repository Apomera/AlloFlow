import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_universe.js');
const publicPath = path.join(process.cwd(), 'prismflow-deploy', 'public', 'stem_lab', 'stem_tool_universe.js');

beforeEach(() => resetStemLab());

describe('Universe playback accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('exposes a pausable playback toggle with an announced state', () => {
    loadTool('stem_lab/stem_tool_universe.js', 'universe');

    const paused = renderTool('universe', { universe: { isPlaying: false } });
    expect(paused).toContain('aria-label="Play cosmic timeline playback"');
    expect(paused).toContain('aria-pressed="false"');
    expect(paused).toContain('Playback can be paused at any time.');

    const playing = renderTool('universe', { universe: { isPlaying: true } });
    expect(playing).toContain('aria-label="Pause cosmic timeline playback"');
    expect(playing).toContain('aria-pressed="true"');
    expect(playing).toContain('Pause');
  });

  it('gives playback controls visible focus and sufficiently large targets', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('className: "min-h-11 px-3 py-2 rounded-lg');
    expect(source).toContain('focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700');
    expect(source).toContain('className: "flex-1 h-6 accent-violet-500"');
    expect(source).toContain('className: "w-20 h-6 accent-violet-400"');
    expect(source).not.toContain('"Toggle cosmic timeline playback"');
  });

  it('keeps an explicit escape from the repeating timer', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('clearInterval(window._universeTimeLapse)');
    expect(source).toContain('announceToSR("Cosmic timeline paused.")');
    expect(source).toContain('if (window._universeCleanupAll) window._universeCleanupAll()');
  });
});
