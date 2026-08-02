import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const labs = ['safety', 'repair', 'kitchen', 'laundry', 'transit'];

describe('Life Skills 3D practice summaries', () => {
  it.each(labs)('summarizes practice support for %s', (lab) => {
    const source = readFileSync(resolve(root, `life_skills_${lab}/life_skills_${lab}.html`), 'utf8');
    const publicCopy = readFileSync(resolve(root, `desktop/web-app/public/life_skills_${lab}/life_skills_${lab}.html`), 'utf8');

    expect(source).toContain('id="practiceSummary"');
    expect(source).toContain('scenarioMissteps: 0');
    expect(source).toContain('scenarioHintsUsed: 0');
    expect(source).toContain('practiceSummary.textContent');
    expect(source).toContain("'Session: ' + completedScenarios + '/3 scenarios complete");
    expect(publicCopy).toBe(source);
  });
});
