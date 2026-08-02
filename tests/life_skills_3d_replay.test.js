import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const labs = ['safety', 'repair', 'kitchen', 'laundry', 'transit'];

describe('Life Skills 3D replayable scenarios', () => {
  it.each(labs)('offers a second scenario after completion for %s', (lab) => {
    const source = readFileSync(resolve(root, `life_skills_${lab}/life_skills_${lab}.html`), 'utf8');
    const publicCopy = readFileSync(resolve(root, `desktop/web-app/public/life_skills_${lab}/life_skills_${lab}.html`), 'utf8');
    const match = source.match(/  var SCENARIO = (.+);\r?\n/);
    const config = match ? JSON.parse(match[1]) : null;

    expect(config?.next?.title).toBeTruthy();
    expect(config?.next?.choices?.length).toBe(3);
    expect(config?.next?.next?.title).toBeTruthy();
    expect(config?.next?.next?.choices?.length).toBe(3);
    expect(source).toContain('id="scenarioNext"');
    expect(source).toContain('function loadNextScenario()');
    expect(source).toContain('activeScenario = activeScenario.next');
    expect(source).toContain("'Scenario ' + (state.scenarioStep + 1) + ' of 3'");
    expect(publicCopy).toBe(source);
  });
});
