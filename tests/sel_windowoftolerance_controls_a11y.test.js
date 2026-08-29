import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'sel_hub/sel_tool_windowoftolerance.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/sel_hub/sel_tool_windowoftolerance.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Window of Tolerance control accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('exposes the selected zone as pressed state', () => {
    const text = source();
    expect(text).toContain("'aria-pressed': cur === 'hyper'");
    expect(text).toContain("'aria-pressed': cur === 'window'");
    expect(text).toContain("'aria-pressed': cur === 'hypo'");
  });

  it('announces check-in guidance and keeps remove targets touch-sized', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Return to the window guidance'");
    expect(text).toContain("'aria-label': 'In-window check-in result'");
    expect(text).toContain("'aria-live': 'polite'");
    expect(text).toContain('minWidth: 24, minHeight: 24');
  });

  it('presents the three zones as one clear activation continuum', () => {
    const text = source();
    expect(text).toContain("'aria-label': 'Nervous system activation continuum'");
    expect(text).toContain("'data-wot-zone': 'hyper'");
    expect(text).toContain("'data-wot-zone': 'window'");
    expect(text).toContain("'data-wot-zone': 'hypo'");
    expect(text).toContain('↑ MORE ACTIVATION');
    expect(text).toContain('↓ LESS ACTIVATION');
  });

  it('lets the learner choose one saved practice and see a short regulation path', () => {
    const text = source();
    expect(text).toContain('selectedPractice: null');
    expect(text).toContain("setWOT({ currentZone: z, selectedPractice: null })");
    expect(text).toContain("'aria-label': 'Choose regulation practice'");
    expect(text).toContain("'aria-pressed': chosenPractice === s");
    expect(text).toContain('Notice → Choose → Recheck');
    expect(text).toContain('After 2–3 minutes, look for even a 1% shift.');
  });
});
