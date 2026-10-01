import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('arcade_mode_modelun.js', 'utf8');

describe('Model UN crisis-response WCAG controls', () => {
  it('lets the Chair pause, resume, and extend the shared deadline', () => {
    expect(source).toContain('function setCrisisTimerPaused(shouldPause)');
    expect(source).toContain('function extendCrisisTimer()');
    expect(source).toContain("'aria-pressed': crisisPaused");
    expect(source).toContain("'Add 60 seconds to the crisis response timer'");
    expect(source).toContain('deadline: nowMs + retainedMs');
  });

  it('keeps a paused crisis active without ticking toward closure', () => {
    expect(source).toContain('!crisis || !crisis.deadline || crisis.timerPaused');
    expect(source).toContain('(crisisPaused || Date.now() < crisis.deadline)');
    expect(source).toContain('!crisisPaused && Date.now() >= crisis.deadline');
    expect(source).toContain('Number(crisis.pausedRemainingMs)');
  });

  it('exposes timer state without announcing every second', () => {
    expect(source).toContain("role: 'timer'");
    expect(source).toContain("role: 'status'");
    expect(source).toContain("'Crisis response timer paused with '");
    expect(source).toContain("'Crisis response timer running.'");
  });

  it('associates the response instructions and text area', () => {
    expect(source).toContain("htmlFor: 'mun_crisis_response_text'");
    expect(source).toContain("id: 'mun_crisis_response_text'");
    expect(source).toContain("'aria-describedby': 'mun_crisis_response_help'");
    expect(source).toContain("id: 'mun_crisis_response_help'");
  });

  it('provides large, strongly focused crisis controls', () => {
    expect(source).toContain('.mun-crisis-control:focus-visible');
    expect(source).toContain('.mun-crisis-response:focus-visible');
    expect(source).toContain('outline: 3px solid #fff');
    expect(source).toContain('@media (forced-colors: active)');
    expect(source.match(/className: 'mun-crisis-control'/g)?.length).toBeGreaterThanOrEqual(5);
    expect(source.match(/minHeight: 44/g)?.length).toBeGreaterThanOrEqual(5);
  });
});
