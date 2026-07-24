import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('concept_pictionary_source.jsx', 'utf8');

describe('Concept Pictionary WCAG 2.2 timed-round controls', () => {
  it('provides host-authoritative pause and resume without consuming paused time', () => {
    expect(source).toContain('pauseRound()');
    expect(source).toContain('resumeRound()');
    expect(source).toContain("type: 'roundTiming'");
    expect(source).toContain('round.pausedTotalMs = (round.pausedTotalMs || 0)');
    expect(source).toContain('this._armRoundTimer(remainingMs)');
    expect(source).toContain('if (!this.activeRound || delayMs == null) return;');
  });

  it('synchronizes pause state with late joiners and connected guests', () => {
    expect(source).toContain('isPaused: !!this.activeRound.isPaused');
    expect(source).toContain('pausedAt: this.activeRound.pausedAt || null');
    expect(source).toContain('pausedTotalMs: this.activeRound.pausedTotalMs || 0');
    expect(source).toContain("else if (parsed.type === 'roundTiming') this.onRoundTiming(parsed.payload || {});");
  });

  it('exposes an announced toggle and a frozen, reduced-motion countdown', () => {
    expect(source).toContain('aria-pressed={!!activeRoundMeta.isPaused}');
    expect(source).toContain("activeRoundMeta.isPaused ? 'Resume timer' : 'Pause timer'");
    expect(source).toContain('role="timer" aria-live="off"');
    expect(source).toContain('Timer paused at ${secs} seconds');
    expect(source).toContain('motion-reduce:transition-none');
    expect(source).toContain("'Round paused' : 'Round live'");
  });

  it('blocks drawing, undo, and guessing consistently while paused', () => {
    expect(source).toContain('this.activeRound.isPaused || !this.activeRound.drawerUids.has(senderUid)');
    expect(source).toContain("drawingEnabled={!!(activeRound && isDrawer && activeRound.status === 'drawing' && !activeRound.isPaused && !(isSketchResponse && sketchSubmitted))}");
    expect(source).toContain('disabled={!!activeRound.isPaused}');
    expect(source).toContain('disabled={!guessText.trim() || !!activeRound.isPaused}');
    expect(source).toContain('Round paused by the teacher. Drawing and guessing will resume with the timer.');
  });

  it('uses explicit button types throughout the embedded form controls', () => {
    const implicitButtons = source.match(/<button\b(?![^>]*\btype=)[^>]*>/gs) || [];
    expect(implicitButtons).toEqual([]);
  });
});
