import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('allohaven_module.js', 'utf8');
const publicMirror = readFileSync('desktop/web-app/public/allohaven_module.js', 'utf8');

function section(start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

describe('shared arcade session timer accessibility', () => {
  it('keeps root and deployed AlloHaven modules synchronized', () => {
    expect(publicMirror).toBe(source);
  });

  it('stops ticking and cannot auto-expire while the timer is paused', () => {
    const effects = section(
      '// Only runs while the timer is active.',
      '// Procedural Web Audio noise'
    );

    expect(effects).toContain('arcadeSession && !arcadeSession.timerPaused');
    expect(effects).toContain('if (state.arcade.session.timerPaused) return;');
    expect(effects).toContain(
      'state.arcade && state.arcade.session && state.arcade.session.timerPaused'
    );
  });

  it('preserves the remaining duration across pause and resume', () => {
    const actions = section(
      'function getArcadeRemainingMs(session)',
      'function endArcadeSession(reason)'
    );

    expect(actions).toContain('Number(session.pausedRemainingMs)');
    expect(actions).toContain('timerPaused: true');
    expect(actions).toContain('pausedRemainingMs: remainingMs');
    expect(actions).toContain('endsAt: new Date(Date.now() + remainingMs).toISOString()');
    expect(actions).toContain('timerPaused: false');
    expect(actions).toContain('pausedRemainingMs: null');
    expect(actions).toContain('Arcade timer paused with ');
    expect(actions).toContain('Arcade timer resumed with ');
  });

  it('offers quiet, named timer controls with WCAG 2.2 target sizing', () => {
    const banner = section(
      '// Active session banner',
      '// Token balance row'
    );

    expect(banner).toContain("role: 'timer'");
    expect(banner).toContain("'aria-live': 'off'");
    expect(banner).toContain("'aria-label': timerLabel");
    expect(banner).toContain("session.timerPaused ? 'Resume timer' : 'Pause timer'");
    expect(banner).toContain("minHeight: '44px', minWidth: '44px'");
    expect(banner).not.toContain("role: 'status'");
  });
});
