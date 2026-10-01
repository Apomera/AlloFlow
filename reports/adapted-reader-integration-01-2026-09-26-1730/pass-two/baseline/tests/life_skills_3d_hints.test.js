import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const labs = ['safety', 'repair', 'kitchen', 'laundry', 'transit'];

describe('Life Skills 3D scenario hints', () => {
  it.each(labs)('provides a non-punitive hint path for %s', (lab) => {
    const source = readFileSync(resolve(root, `life_skills_${lab}/life_skills_${lab}.html`), 'utf8');
    const publicCopy = readFileSync(resolve(root, `desktop/web-app/public/life_skills_${lab}/life_skills_${lab}.html`), 'utf8');

    expect(source).toContain('id="scenarioHint"');
    expect(source).toContain('Show a hint');
    expect(source).toContain('id="scenarioHintText"');
    expect(source).toContain('state.hintShown = true');
    expect(source).toContain('scenarioHintText.hidden = !state.hintShown');
    expect(source).toContain("say('Hint: ' + activeScenario.hint)");
    expect(publicCopy).toBe(source);
  });
});
