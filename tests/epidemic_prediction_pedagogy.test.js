import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const canonicalPath = path.join(process.cwd(), 'stem_lab', 'stem_tool_epidemic.js');
const mirrorPath = path.join(process.cwd(), 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_epidemic.js');
const source = fs.readFileSync(canonicalPath, 'utf8');

function sourceSection(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(start, 'missing section start: ' + startMarker).toBeGreaterThanOrEqual(0);
  expect(end, 'missing section end: ' + endMarker).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('Epidemic Lab prediction and evidence pedagogy', () => {
  it('keeps the canonical and desktop copies identical', () => {
    expect(fs.readFileSync(mirrorPath, 'utf8')).toBe(source);
  });

  it('commits one AI scenario strategy before revealing ungraded feedback', () => {
    const scenarioRender = sourceSection("tab === 'scenarios'", "tab === 'challenge'");

    expect(source).toContain('var scenarioChoice = d.scenarioChoice !== undefined && d.scenarioChoice !== null ? d.scenarioChoice : null;');
    expect(source).toContain('if (!scenarioData || scenarioChoice !== null) return;');
    expect(source).toContain('scenarioChoice = idx; // Immediate event-level lock; state snapshot follows below.');
    expect(source).toContain("feedbackPolicy: 'descriptive-ungraded'");
    expect(source).toContain("'data-epidemic-scenario-decision-state': 'open'");
    expect(scenarioRender).toContain("'data-epidemic-scenario-decision-state': 'committed'");
    expect(scenarioRender).toContain("'data-epidemic-committed-strategy': 'true'");
    expect(scenarioRender).toContain("'data-epidemic-scenario-feedback': 'descriptive-ungraded'");
    expect(scenarioRender).toContain('Your committed strategy: ');
    expect(scenarioRender).toContain('(scenarioDecision && scenarioDecision.outcome) || scenarioResult.outcome');
    expect(scenarioRender).toContain('Modeled consequence \\u2014 ungraded');
    expect(scenarioRender).not.toContain('scenarioResult.score');
    expect(scenarioRender).not.toMatch(/Excellent Response|Adequate Response|Suboptimal Response|\/100/);
    expect(source).not.toContain('"score":number(0-100)');
    expect(source.match(/awardXP\(20, 'Scenario decision recorded'\)/g)).toHaveLength(1);
  });

  it('uses scientifically bounded live growth bands rather than calling growth a pandemic', () => {
    const inquiry = sourceSection("tab === 'inquiry'", '// SR status');
    const defaultREffective = 2.5 * 0.5 * (1 - 0.3 * 0.7);

    expect(defaultREffective).toBeCloseTo(0.9875, 8);
    expect(inquiry).toContain("var regime = rEff <= 1 ? 'declining' : (rEff < 1.5 ? 'growing' : 'fast_growth');");
    expect(inquiry).toContain("declining: { label:");
    expect(inquiry).toContain("growing: { label:");
    expect(inquiry).toContain("fast_growth: { label:");
    expect(inquiry).toContain("'data-epidemic-live-regime': regime");
    expect(inquiry).toContain("role: 'status', 'aria-live': 'polite'");
    expect(inquiry).toContain('This is not, by itself, a definition of a pandemic.');
    expect(inquiry).toContain('The model does not represent geographic spread');
    expect(inquiry).not.toContain("var regime = rEff < 0.9 ? 'contained'");
  });

  it('labels the visible inquiry as observation and explanation, not prediction-before-reveal', () => {
    const inquiry = sourceSection("tab === 'inquiry'", '// SR status');

    expect(inquiry).toContain('The display is evidence you can inspect now, not a hidden prediction or a graded answer.');
    expect(inquiry).toContain('Working explanation after observing (not a prediction):');
    expect(inquiry).toContain('Cite at least two logged settings as evidence.');
    expect(inquiry).toContain("'growth band'].map(function(c, i)");
    expect(inquiry).toContain('These prompts add no new result or hidden answer');
    expect(inquiry).toContain('Saved as your explanation. It is not scored;');
    expect(inquiry).toContain('Live SIR trajectories at R effective ');
    expect(inquiry).not.toContain('Your hypothesis (free text');
    expect(inquiry).not.toContain('There is no right answer');
  });

  it('describes already-live model buttons as recording a setup', () => {
    expect(source).toContain('The curves and statistics above update live as settings change.');
    expect(source).toContain("'Record current live SIR setup'");
    expect(source).toContain("'Record current live SEIR setup'");
    expect(source).toContain("'Record current live vaccination setup'");
    expect(source).toContain("awardXP(5, 'Recorded live setup')");
  });
});
