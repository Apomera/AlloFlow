import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const scenarios = {
  safety: 'stove',
  repair: 'shutoff',
  kitchen: 'fire',
  laundry: 'lint',
  transit: 'route'
};

describe('Life Skills 3D branching scenarios', () => {
  it.each(Object.entries(scenarios))('adds safe decision practice to %s', (lab, safeTask) => {
    const source = readFileSync(resolve(root, `life_skills_${lab}/life_skills_${lab}.html`), 'utf8');
    const publicCopy = readFileSync(resolve(root, `desktop/web-app/public/life_skills_${lab}/life_skills_${lab}.html`), 'utf8');
    const scripts = [...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];

    expect(source).toContain('Decision practice');
    expect(source).toContain('id="scenarioChoices"');
    expect(source).toContain('function chooseScenario(choiceId)');
    expect(source).toContain('function renderScenario()');
    expect(source).toContain(`"safeTask":"${safeTask}"`);
    expect(scripts.length).toBeGreaterThan(0);
    scripts.forEach((match, index) => expect(() => new vm.Script(match[1], { filename: `${lab}#script-${index + 1}` })).not.toThrow());
    expect(publicCopy).toBe(source);
  });
});
