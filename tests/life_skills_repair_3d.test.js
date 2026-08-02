import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const scene = readFileSync(resolve(root, 'life_skills_repair/life_skills_repair.html'), 'utf8');
const publicScene = readFileSync(resolve(root, 'desktop/web-app/public/life_skills_repair/life_skills_repair.html'), 'utf8');
const lifeSkills = readFileSync(resolve(root, 'stem_lab/stem_tool_lifeskills.js'), 'utf8');
const build = readFileSync(resolve(root, 'build.js'), 'utf8');

describe('Life Skills 3D home repair and systems lab', () => {
  it('defines six safe-decision targets and three practice modes', () => {
    const literal = scene.match(/var TASKS = (\[[\s\S]*?\]);/);
    expect(literal).not.toBeNull();
    const tasks = Function('return ' + literal[1])();
    expect(tasks.map((task) => task.id)).toEqual(['flapper', 'shutoff', 'bucket', 'gfci', 'breaker', 'pro']);
    expect(scene).toContain('value="guided"');
    expect(scene).toContain('value="practice"');
    expect(scene).toContain('value="challenge"');
  });

  it('keeps the 3D view optional and provides an accessible checklist fallback', () => {
    expect(scene).toContain('../immersive_geometry/vendor/aframe.min.js');
    expect(scene).toContain('repair-interactive');
    expect(scene).toContain('raycaster="objects: .clickable');
    expect(scene).toContain('Accessible repair checklist');
    expect(scene).toContain('id="sceneFallback"');
    expect(scene).toContain('aria-live="polite"');
    expect(scene).toContain('id="helpPauseButton"');
    expect(scene).toContain('id="whyButton"');
    expect(scene).toContain('function revealWhy()');
    expect(scene).toContain('alloflow-life-repair-3d-why-reveal');
    expect(scene).toContain('function pauseForHelp()');
    expect(scene).toContain('alloflow-life-repair-3d-help-pause');
    expect(scene).toContain('id="reflectionPanel"');
    expect(scene).toContain('id="reflectionInput"');
    expect(scene).toContain('function saveReflection()');
    expect(scene).toContain('data-confidence="ready"');
    expect(scene).toContain('function saveConfidence(value)');
    expect(scene).toContain('alloflow-life-repair-3d-confidence');
    expect(scene).toContain('data-next-step="replay"');
    expect(scene).toContain('function saveNextStep(value)');
    expect(scene).toContain('function applyNextStep(value)');
    expect(scene).toContain('id="replayPanel"');
    expect(scene).toContain('function completeReplay()');
    expect(scene).toContain('alloflow-life-repair-3d-replay-complete');
    expect(scene).toContain('data-task-id');
    expect(scene).toContain('alloflow-life-repair-3d-next-step');
    expect(scene).toContain('alloflow-life-repair-3d-reflection');
    expect(scene).toContain("button.type = 'button'");
    expect(scene).toContain('prefers-reduced-motion');
  });

  it('keeps scene object IDs unique and mirrors the public companion', () => {
    const ids = [...scene.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    expect(duplicates).toEqual([]);
    expect(publicScene).toBe(scene);
  });

  it('launches the lab from the existing Home Repair tab', () => {
    expect(lifeSkills).toContain('function openLifeSkillsRepair3D()');
    expect(lifeSkills).toContain('/life_skills_repair/life_skills_repair.html');
    expect(lifeSkills).toContain('Open the 3D home repair and systems lab in a new window');
    expect(lifeSkills).toContain('Open 3D repair lab');
  });

  it('copies the repair lab alongside the shared local A-Frame runtime', () => {
    expect(build).toContain("'immersive_geometry'");
    expect(build).toContain("'life_skills_repair'");
  });
});
