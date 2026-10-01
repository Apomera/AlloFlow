import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const labs = ['safety', 'repair', 'kitchen', 'laundry', 'transit'];

describe('Life Skills 3D scene-linked coaching', () => {
  it.each(labs)('highlights the safer scene target for %s choices', (lab) => {
    const source = readFileSync(resolve(root, `life_skills_${lab}/life_skills_${lab}.html`), 'utf8');
    const publicCopy = readFileSync(resolve(root, `desktop/web-app/public/life_skills_${lab}/life_skills_${lab}.html`), 'utf8');
    const focusCalls = source.match(/focusTask\(activeScenario\.safeTask, false\)/g) || [];

    expect(focusCalls.length).toBe(2);
    expect(source).toContain('The safer scene target is highlighted.');
    expect(publicCopy).toBe(source);
  });
});
