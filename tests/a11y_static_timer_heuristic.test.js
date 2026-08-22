import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function scanFixture(source) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-timer-rule-'));
  const fixture = path.join(directory, 'fixture.js');
  fs.writeFileSync(fixture, source, 'utf8');
  try {
    return spawnSync(process.execPath, ['a11y-audit/static-audit.js', '--file', fixture], {
      cwd: process.cwd(),
      encoding: 'utf8',
    }).stdout;
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

describe('static audit timer rule', () => {
  it('does not treat registry availability polling as a user deadline', () => {
    const report = scanFixture([
      'let attempts = 0;',
      'const interval = setInterval(() => { attempts += 1; findRegistry(); }, 100);',
      'if (attempts > 50) clearInterval(interval);',
    ].join('\n'));
    expect(report).not.toContain('TIMER-001');
  });

  it('does not treat autosave intervals as user deadlines', () => {
    const report = scanFixture(
      'setInterval(() => saveDraft(), 30000);'
    );
    expect(report).not.toContain('TIMER-001');
  });

  it('does not treat transport expiry metadata as a user deadline', () => {
    const report = scanFixture([
      'const SIGNALING_TTL_MS = 60 * 60 * 1000;',
      'const payload = { createdAt: Date.now(), expiresAt: Date.now() + SIGNALING_TTL_MS };',
      'writeTransportMetadata(payload);',
    ].join('\n'));
    expect(report).not.toContain('TIMER-001');
  });

  it('does not combine an operational poll with unrelated deadline prose', () => {
    const report = scanFixture([
      'setInterval(sendHandshake, 250);',
      '// The network approval deadline is extended while consent is open.',
    ].join('\n'));
    expect(report).not.toContain('TIMER-001');
  });

  it('reports a ticking user countdown without adjustment controls', () => {
    const report = scanFixture([
      'let timeLeft = 60;',
      'setInterval(() => { timeLeft -= 1; render(timeLeft); }, 1000);',
    ].join('\n'));
    expect(report).toContain('TIMER-001');
  });

  it('accepts an optional timer with an explicit cancel control', () => {
    const report = scanFixture([
      'const timerActive = deadline && Date.now() < deadline;',
      'button.setAttribute("aria-label", "Cancel timer");',
      'setTimerEnd(null);',
    ].join('\\n'));
    expect(report).not.toContain('TIMER-001');
  });
  it('accepts a ticking countdown with pause or extension controls', () => {
    const paused = scanFixture([
      'let timeLeft = 60;',
      'let timerPaused = false;',
      'setInterval(() => { if (!timerPaused) timeLeft -= 1; }, 1000);',
    ].join('\n'));
    const extended = scanFixture([
      'let deadline = Date.now() + 60000;',
      'function extendTimer() { deadline += 60000; }',
    ].join('\n'));
    expect(paused).not.toContain('TIMER-001');
    expect(extended).not.toContain('TIMER-001');
  });

  it('accepts explicitly documented essential timing for a standardized measure', () => {
    const report = scanFixture([
      '// data-a11y-essential-timing: standardized fluency probe; extending time invalidates the measure.',
      'let timeLeft = 60;',
      'setInterval(() => { timeLeft -= 1; }, 1000);',
    ].join('\n'));
    expect(report).not.toContain('TIMER-001');
  });
});
