import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.cwd(), 'stem_lab/stem_tool_probability.js');
const publicPath = resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_probability.js');
const source = () => readFileSync(sourcePath, 'utf8');

describe('Probability Lab accessibility', () => {
  it('keeps the deployed copy identical to the audited source', () => {
    expect(readFileSync(publicPath, 'utf8')).toBe(source());
  });

  it('names the informative probability visuals', () => {
    const text = source();
    expect(text).toContain("role: \"img\", 'aria-label': 'd6 showing '");
    expect(text).toContain("role: \"img\", 'aria-label': result ? 'Spinner showing '");
    expect(text).toContain("role: \"img\", 'aria-label': 'Coin showing '");
    expect(text).toContain("role: \"img\", 'aria-label': 'Marble bag containing '");
    expect(text).toContain("role: \"img\", 'aria-label': 'Convergence chart: observed '");
    expect(text).toContain("role: \"img\", 'aria-label': 'Monte Carlo pi scatter plot with '");
  });

  it('exposes an explicit pause control for automatic trials', () => {
    const text = source();
    expect(text).toContain('"aria-label": d._autoRunning ?');
    expect(text).toContain('"Pause automatic simulation"');
    expect(text).toContain('"Start automatic simulation"');
    expect(text).toContain('"aria-pressed": d._autoRunning ? "true" : "false"');
    expect(text).toContain("d._autoRunning ? '\\u23F8 Pause' : '\\u25B6 Auto-Run'");
  });

  it('suppresses the running pulse when reduced motion is requested', () => {
    const text = source();
    expect(text).toContain('window.matchMedia("(prefers-reduced-motion: reduce)").matches');
    expect(text).not.toContain('font-bold animate-pulse');
  });

  it('names written responses and scopes observation headers', () => {
    const text = source();
    expect(text).toContain("'aria-label': t('stem.probability.hypothesis_label'");
    expect(text).toContain("'aria-label': t('stem.probability.explanation_label'");
    expect(text).toContain("return h('th', { key: 'h' + i, scope: 'col'");
  });
});
