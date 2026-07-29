import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (name) => readFileSync(resolve(process.cwd(), name), 'utf8');
const sidebar = read('view_sidebar_panels_source.jsx');
const dispatcher = read('generate_dispatcher_source.jsx');
const app = read('AlloFlowANTI.txt');

describe('live response policy authoring and launch', () => {
  it('keeps the choice inside the existing scoring accordion with two clear modes', () => {
    const scoringStart = sidebar.indexOf('4. Scoring and feedback');
    const policyStart = sidebar.indexOf('Live session response policy', scoringStart);
    const policyEnd = sidebar.indexOf('</select>', policyStart);
    const policyControl = sidebar.slice(policyStart, policyEnd);

    expect(scoringStart).toBeGreaterThanOrEqual(0);
    expect(policyStart).toBeGreaterThan(scoringStart);
    expect(policyControl).toContain('<option value="accuracy">');
    expect(policyControl).toContain('<option value="confidence">');
    expect(policyControl.match(/<option value=/g)).toHaveLength(2);
    expect(sidebar).toContain('Confidence never changes correctness or points.');
    expect(sidebar).toContain('Response speed never changes points.');
  });

  it('preserves strict booleans through quiz generation', () => {
    expect(dispatcher).toContain('accuracy: _requestedScoringPolicy.accuracy !== false');
    expect(dispatcher).toContain('confidence: _requestedScoringPolicy.confidence === true');
    expect(dispatcher).toContain('partialCredit: _requestedScoringPolicy.partialCredit !== false');
    expect(dispatcher).toContain('content.scoringPolicy = Object.assign({}, _scoringPolicy)');
  });

  it('snapshots the authored policy into each fresh live attempt', () => {
    expect(app).toContain("const authoredScoringPolicy = generatedContent?.data?.scoringPolicy");
    expect(app).toContain('accuracy: authoredScoringPolicy.accuracy !== false');
    expect(app).toContain('confidence: authoredScoringPolicy.confidence === true');
    expect(app).toContain('partialCredit: authoredScoringPolicy.partialCredit !== false');
    expect(app).toContain('"quizState.scoringPolicy": liveScoringPolicy');
  });

  it('keeps generated browser and desktop copies synchronized', () => {
    for (const name of [
      'view_sidebar_panels_module.js',
      'generate_dispatcher_module.js',
      'teacher_module.js',
      'quiz_live_aggregators.js',
    ]) {
      expect(read(`desktop/web-app/public/${name}`)).toBe(read(name));
    }
  });
});
