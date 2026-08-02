import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const scene = readFileSync(resolve(root, 'life_skills_kitchen/life_skills_kitchen.html'), 'utf8');
const publicScene = readFileSync(resolve(root, 'desktop/web-app/public/life_skills_kitchen/life_skills_kitchen.html'), 'utf8');
const lifeSkills = readFileSync(resolve(root, 'stem_lab/stem_tool_lifeskills.js'), 'utf8');
const build = readFileSync(resolve(root, 'build.js'), 'utf8');

describe('Life Skills 3D kitchen and food safety lab', () => {
  it('defines six safe-decision targets and three practice modes', () => {
    const literal = scene.match(/var TASKS = (\[[\s\S]*?\]);/);
    expect(literal).not.toBeNull();
    const tasks = Function('return ' + literal[1])();
    expect(tasks.map((task) => task.id)).toEqual(['hands', 'separate', 'thermometer', 'stove', 'leftovers', 'fire']);
    expect(scene).toContain('value="guided"');
    expect(scene).toContain('value="practice"');
    expect(scene).toContain('value="challenge"');
  });

  it('keeps the 3D view optional and provides an accessible checklist fallback', () => {
    expect(scene).toContain('../immersive_geometry/vendor/aframe.min.js');
    expect(scene).toContain('kitchen-interactive');
    expect(scene).toContain('raycaster="objects: .clickable');
    expect(scene).toContain('Accessible kitchen checklist');
    expect(scene).toContain('id="sceneFallback"');
    expect(scene).toContain('aria-live="polite"');
    expect(scene).toContain('id="helpPauseButton"');
    expect(scene).toContain('id="whyButton"');
    expect(scene).toContain('function revealWhy()');
    expect(scene).toContain('alloflow-life-kitchen-3d-why-reveal');
    expect(scene).toContain('function pauseForHelp()');
    expect(scene).toContain('alloflow-life-kitchen-3d-help-pause');
    expect(scene).toContain("button.type = 'button'");
    expect(scene).toContain('prefers-reduced-motion');
  });

  it('keeps scene object IDs unique and mirrors the public companion', () => {
    const ids = [...scene.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect(duplicates).toEqual([]);
    expect(publicScene).toBe(scene);
  });

  it('launches the lab from the existing Cooking tab', () => {
    expect(lifeSkills).toContain('function openLifeSkillsKitchen3D()');
    expect(lifeSkills).toContain('/life_skills_kitchen/life_skills_kitchen.html');
    expect(lifeSkills).toContain('Open the 3D kitchen and food safety lab in a new window');
    expect(lifeSkills).toContain('Open 3D kitchen lab');
  });

  it('copies the kitchen lab alongside the shared local A-Frame runtime', () => {
    expect(build).toContain("'immersive_geometry'");
    expect(build).toContain("'life_skills_kitchen'");
  });
});
