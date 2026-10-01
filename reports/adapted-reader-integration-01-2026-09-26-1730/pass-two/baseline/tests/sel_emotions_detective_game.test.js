import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_emotions.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_emotions.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Emotion Detective game', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('provides a dedicated, accessible game surface with progress feedback', () => {
    const text = source();
    expect(text).toContain("id: 'detective'");
    expect(text).toContain("role: 'region'");
    expect(text).toContain("'aria-label': 'Emotion Detective game'");
    expect(text).toContain("role: 'progressbar'");
    expect(text).toContain("'aria-label': 'Emotion Detective progress'");
    expect(text).toContain("role: 'status'");
    expect(text).toContain("'aria-live': 'polite'");
  });

  it('keeps five structured choice groups and inclusive, no-timer feedback', () => {
    const text = source();
    expect(text).toContain("detectiveRadioGroup('1. Pick the broad emotion family', 'Choose an emotion family'");
    expect(text).toContain("detectiveRadioGroup('2. Estimate the intensity', 'Choose an intensity from 1 to 5'");
    expect(text).toContain("detectiveRadioGroup('3. Add a possible blend', 'Choose a possible blend'");
    expect(text).toContain("detectiveRadioGroup('4. Notice a body clue', 'Choose a body clue'");
    expect(text).toContain("detectiveRadioGroup('5. Choose a helpful next step', 'Choose a strategy'");
    expect(text).toContain('There is no timer');
    expect(text).toContain("announceToSR('Emotion Detective case complete.");
    expect(text).toContain('Your family read is a valid alternative.');
  });

  it('preserves the existing emotion wheel experiences', () => {
    const text = source();
    expect(text).toContain("id: 'wheel'");
    expect(text).toContain("id: 'plutchik'");
    expect(text).toContain("'aria-label': 'Interactive Plutchik emotion wheel'");
  });
});