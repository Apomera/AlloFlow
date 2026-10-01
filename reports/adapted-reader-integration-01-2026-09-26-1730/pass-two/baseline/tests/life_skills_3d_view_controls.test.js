import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const labs = ['safety', 'repair', 'kitchen', 'laundry', 'transit'];

describe('Life Skills 3D camera presets', () => {
  it.each(labs)('provides accessible scene view presets for %s', (lab) => {
    const source = readFileSync(resolve(root, `life_skills_${lab}/life_skills_${lab}.html`), 'utf8');
    const publicCopy = readFileSync(resolve(root, `desktop/web-app/public/life_skills_${lab}/life_skills_${lab}.html`), 'utf8');

    expect(source).toContain('data-view="left"');
    expect(source).toContain('data-view="center"');
    expect(source).toContain('data-view="right"');
    expect(source).toContain('role="group" aria-label="3D scene view"');
    expect(source).toContain('function setView(view)');
    expect(source).toContain("document.querySelector('a-camera')");
    expect(source).toContain("camera.setAttribute('position', preset.position)");
    expect(publicCopy).toBe(source);
  });
});
