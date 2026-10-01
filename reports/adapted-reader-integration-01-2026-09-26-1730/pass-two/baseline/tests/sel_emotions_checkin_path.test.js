import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_emotions.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_emotions.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Emotions check-in next-step path', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('shows a compact Name, Notice, Choose path', () => {
    const text = source();
    expect(text).toContain("role: 'list', 'aria-label': 'Emotion check-in path'");
    expect(text).toContain("{ label: 'Name'");
    expect(text).toContain("{ label: 'Notice'");
    expect(text).toContain("{ label: 'Choose'");
    expect(text).toContain('checkinStrategy = d.checkinStrategy || null');
  });

  it('exposes emotion and strategy selections to assistive technology', () => {
    const text = source();
    expect(text).toContain("role: 'group', 'aria-label': 'Choose primary emotion family'");
    expect(text).toContain("role: 'group', 'aria-label': 'Choose specific feeling'");
    expect(text).toContain("role: 'group', 'aria-label': 'Choose a regulation next step'");
    expect(text).toContain("'aria-pressed': isSel");
    expect(text).toContain("'aria-pressed': selected");
  });

  it('matches intensity-aware strategies with a safe generic fallback', () => {
    const text = source();
    expect(text).toContain("checkinIntensity <= 3 ? 'low'");
    expect(text).toContain("checkinIntensity <= 7 ? 'medium' : 'high'");
    expect(text).toContain("happy: 'joy', sad: 'sadness', angry: 'anger', scared: 'fear', surprised: 'awe'");
    expect(text).toContain("name: 'Feet + long exhale'");
    expect(text).toContain('this is an invitation, not a prescription.');
  });

  it('stores the chosen next step with the check-in and shows it in recent history', () => {
    const text = source();
    expect(text).toContain('strategy: checkinStrategy');
    expect(text).toContain("checkinNote: '', checkinStrategy: null");
    expect(text).toContain("'\\u2192 Next: ' + entry.strategy");
    expect(text).toContain("'\\u2705 Save Feeling + Next Step'");
  });
});
