import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_sensoryregulation.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_sensoryregulation.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Sensory Regulation quick check-in', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('offers four neutral present-state choices with pressed feedback', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Quick sensory check-in'");
    expect(text).toContain("'aria-label': 'Choose current sensory need'");
    expect(text).toContain("'data-sensory-need': item.id");
    expect(text).toContain("'aria-pressed': current === item.id");
    expect(text).toContain("{ id: 'less'");
    expect(text).toContain("{ id: 'more'");
    expect(text).toContain("{ id: 'control'");
    expect(text).toContain("{ id: 'steady'");
  });

  it('connects the selected state to one saved support and a recheck path', () => {
    const text = source();
    expect(text).toContain('currentNeed: null');
    expect(text).toContain('activeSupport: null');
    expect(text).toContain("'aria-label': 'Choose a support from my sensory plan'");
    expect(text).toContain("'aria-label': 'Sensory next step'");
    expect(text).toContain('After 2–5 minutes, notice whether anything shifted.');
    expect(text).toContain('Sensory support selected: ');
  });

  it('summarizes the profile mix without ranking sensory patterns', () => {
    const text = source();
    expect(text).toContain('var profileMix = { seek: 0, avoid: 0, mixed: 0, typical: 0 }');
    expect(text).toContain("role: 'img', 'aria-label': 'Sensory profile mix: '");
    expect(text).toContain("'My profile mix'");
    expect(text).not.toContain("_senFg(current) === 'seek'");
    expect(text).not.toContain("_senFg(current) === 'avoid'");
    expect(text).not.toContain("_senFg(current) === 'mixed'");
  });
});
