import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_coding.js');
const publicPath = path.join(process.cwd(), 'prismflow-deploy', 'public', 'stem_lab', 'stem_tool_coding.js');

beforeEach(() => resetStemLab());

describe('Coding Lab playback controls', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  });

  it('exposes explicit turtle playback controls with sufficiently large targets', () => {
    loadTool('stem_lab/stem_tool_coding.js', 'codingPlayground');
    const html = renderTool('codingPlayground', {
      _codingPlayground: { tutorialDismissed: true, running: true, blocks: [{ type: 'forward', distance: 10 }] },
    });
    expect(html).toContain('aria-label="Run turtle program"');
    expect(html).toContain('aria-label="Stop turtle program playback"');
    expect(html).toContain('min-h-11');
  });

  it('exposes explicit robot playback controls with sufficiently large targets', () => {
    loadTool('stem_lab/stem_tool_coding.js', 'codingPlayground');
    const html = renderTool('codingPlayground', {
      _codingPlayground: {
        tutorialDismissed: true,
        playgroundMode: 'robot',
        robotChallengeIdx: 0,
        robotRunning: true,
        robotBlocks: [{ type: 'moveForward' }],
      },
    });
    expect(html).toContain('aria-label="Run robot program"');
    expect(html).toContain('aria-label="Stop robot program playback"');
    expect(html).toContain('min-h-11');
  });

  it('names the music action from its current state', () => {
    loadTool('stem_lab/stem_tool_coding.js', 'codingPlayground');
    const stopped = renderTool('codingPlayground', {
      _codingPlayground: { tutorialDismissed: true, bgMusicPlaying: false },
    });
    expect(stopped).toContain('aria-label="Play background music"');
    expect(stopped).toContain('aria-pressed="false"');

    const playing = renderTool('codingPlayground', {
      _codingPlayground: { tutorialDismissed: true, bgMusicPlaying: true },
    });
    expect(playing).toContain('aria-label="Stop background music"');
    expect(playing).toContain('aria-pressed="true"');
  });

  it('clears every pending playback scheduler when Coding Lab unmounts', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('function CodingActivityCleanup(props)');
    expect(source).toContain('if (_codeStepTimer) { clearTimeout(_codeStepTimer); _codeStepTimer = null; }');
    expect(source).toContain('if (_codeRobotTimer) { clearTimeout(_codeRobotTimer); _codeRobotTimer = null; }');
    expect(source).toContain('clearInterval(window.__bgMusicInterval)');
    expect(source).toContain('React.createElement(CodingActivityCleanup, { React: React })');
  });
});
