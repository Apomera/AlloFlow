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
    expect(text).toContain("'aria-label': __alloFill(__alloT('stem.probability.a11y_d6_showing', 'd6 showing {value1}')");
    expect(text).toContain("role: \"img\", 'aria-label': result ? 'Spinner showing '");
    expect(text).toContain("role: \"img\", 'aria-label': 'Coin showing '");
    expect(text).toContain("'aria-label': __alloFill(__alloT('stem.probability.a11y_marble_bag_containing_marbles_across_colors'");
    expect(text).toContain("'aria-label': __alloFill(__alloT('stem.probability.a11y_convergence_chart_observed_percent_expected_per'");
    expect(text).toContain("'aria-label': __alloFill(__alloT('stem.probability.a11y_monte_carlo_pi_scatter_plot_with_of_points_insi'");
  });

  it('exposes a stable pressed-state control for automatic trials', () => {
    const text = source();
    expect(text).toContain(`"aria-label": __alloT('stem.probability.a11y_automatic_simulation', 'Automatic simulation')`);
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
