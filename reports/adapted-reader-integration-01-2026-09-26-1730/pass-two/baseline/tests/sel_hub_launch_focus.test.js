import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync('sel_hub/sel_hub_module.js', 'utf8');
const start = src.indexOf('  function alloFocusToolStart() {');
const end = src.indexOf('  function alloFocusToolCard(', start);
const launch = new Function('document', 'setTimeout', src.slice(start, end) + '; return alloFocusToolStart;');

afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });
function setup() {
  vi.useFakeTimers();
  document.body.innerHTML = '<button id="opener">Open activity</button><button aria-label="Back to SEL tools">Back</button><h3 id="history" tabindex="-1">Saved entries</h3><textarea aria-label="Draft"></textarea>';
  document.getElementById('opener').focus();
  return launch(document, setTimeout);
}

describe('SEL delayed tool launch focus', () => {
  it('places focus at the tool start after the old card is removed', () => {
    const focus = setup(); focus(); document.getElementById('opener').remove();
    vi.advanceTimersByTime(60);
    expect(document.activeElement.getAttribute('aria-label')).toBe('Back to SEL tools');
  });
  it('keeps focus on a destination the learner already opened', () => {
    const focus = setup(); focus(); document.getElementById('history').focus();
    vi.advanceTimersByTime(60);
    expect(document.activeElement.id).toBe('history');
  });
  it('does not interrupt someone who already started writing', () => {
    const focus = setup(); focus(); document.querySelector('textarea').focus();
    vi.advanceTimersByTime(60);
    expect(document.activeElement.getAttribute('aria-label')).toBe('Draft');
  });
});
