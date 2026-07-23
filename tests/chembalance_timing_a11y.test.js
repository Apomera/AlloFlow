import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_chembalance.js');
const deployPath = path.join(root, 'prismflow-deploy', 'public', 'stem_lab', 'stem_tool_chembalance.js');

describe('ChemBalance timing accessibility', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');

  beforeEach(() => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_chembalance.js', 'chemBalance');
  });

  it('renders named pause, end, and non-announcing elapsed-time controls while running', () => {
    const html = renderTool('chemBalance', {
      chemBalance: {
        _everPicked: true,
        subtool: 'balance',
        timerActive: true,
        timerPaused: false,
        timerStart: Date.now() - 6200,
        timerElapsedMs: 0,
      },
    });

    expect(html).toContain('aria-label="Speed challenge timer controls"');
    expect(html).toContain('Pause timer');
    expect(html).toContain('End challenge');
    expect(html).toContain('role="timer"');
    expect(html).toContain('aria-live="off"');
    expect(html).toContain('Speed challenge timer running');
  });

  it('renders a paused timer with a clear resume action', () => {
    const html = renderTool('chemBalance', {
      chemBalance: {
        _everPicked: true,
        subtool: 'balance',
        timerActive: true,
        timerPaused: true,
        timerStart: null,
        timerElapsedMs: 42000,
      },
    });

    expect(html).toContain('Resume timer');
    expect(html).toContain('Speed challenge timer paused: 42 seconds elapsed');
    expect(html).toContain('>Paused<');
  });

  it('excludes paused time from scoring and cleans up its live interval', () => {
    expect(source).toContain('if (d.timerActive && !d.timerPaused && d.timerStart)');
    expect(source).toContain('elapsedMs += Math.max(0, Date.now() - d.timerStart)');
    expect(source).toContain('if (d.timerActive) speedTime = getTimerElapsedMs() / 1000');
    expect(source).toContain('return function() { window.clearInterval(intervalId); };');
  });

  it('keeps quiz and battle feedback until the learner chooses to continue', () => {
    expect(source).not.toContain('setTimeout(function()');
    expect(source).toContain("__alloT('stem.chembalance.next_question', 'Next question')");
    expect(source).toContain("__alloT('stem.chembalance.finish_challenge', 'Finish challenge')");
    expect(source).toContain("__alloT('stem.chembalance.next_battle_round', 'Next round')");
    expect(source).toContain("__alloT('stem.chembalance.finish_battle', 'Finish battle')");
  });

  it('keeps the source and deploy copies identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
