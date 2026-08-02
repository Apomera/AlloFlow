import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const labs = ['safety', 'repair', 'kitchen', 'laundry', 'transit'];

describe('Life Skills 3D resume support', () => {
  it.each(labs)('persists completed targets for the %s lab', (lab) => {
    const source = readFileSync(resolve(root, `life_skills_${lab}/life_skills_${lab}.html`), 'utf8');
    const publicCopy = readFileSync(resolve(root, `desktop/web-app/public/life_skills_${lab}/life_skills_${lab}.html`), 'utf8');
    expect(source).toContain(`storageKey = 'alloflow-life-${lab}-3d-progress-v1'`);
    expect(source).toContain('window.localStorage.getItem(storageKey)');
    expect(source).toContain('window.localStorage.setItem(storageKey');
    expect(source).toContain('done: loadDone()');
    expect(source).toContain('saveProgress();');
    expect(publicCopy).toBe(source);
  });
});
