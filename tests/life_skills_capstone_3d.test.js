import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();

describe('Life Skills 3D day-in-the-life capstone', () => {
  it('ships an accessible five-station scene and parent bridge', () => {
    const source = readFileSync(resolve(root, 'life_skills_capstone/life_skills_capstone.html'), 'utf8');
    const publicCopy = readFileSync(resolve(root, 'desktop/web-app/public/life_skills_capstone/life_skills_capstone.html'), 'utf8');
    const scripts = [...source.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];

    expect(source).toContain('id="capstoneScene"');
    expect(source).toContain("id: 'stove'");
    expect(source).toContain("id: 'visibility'");
    expect(source).toContain('alloflow-life-capstone-3d-task-complete');
    expect(source).toContain('alloflow-life-capstone-3d-complete');
    expect(source).toContain('The 3D scene is unavailable in this browser.');
    expect(source).toContain('id="hintButton"');
    expect(source).toContain('id="challengeButton"');
    expect(source).toContain('function beginChallenge()');
    expect(source).toContain('alloflow-life-capstone-3d-challenge-start');
    expect(source).toContain('Safe-answer styling is intentionally hidden.');
    expect(source).toContain('id="state-stove"');
    expect(source).toContain('id="state-visibility"');
    expect(source).toContain('RISK STILL ACTIVE');
    expect(source).toContain('state.risk[task.id] = true');
    expect(source).toContain('state.focused = runTasks()[state.activeIndex].id');
    expect(source).toContain('id="debrief"');
    expect(source).toContain('data-confidence="ready"');
    expect(source).toContain('alloflow-life-capstone-3d-debrief');
    expect(source).toContain('id="teachBackInput"');
    expect(source).toContain('maxlength="180"');
    expect(source).toContain('function saveTeachBack()');
    expect(source).toContain('alloflow-life-capstone-3d-teach-back');
    expect(source).toContain('Rehearse the safe response');
    expect(source).toContain('focus(task.id, true)');
    expect(source).toContain('aria-current', 'step');
    scripts.forEach((match, index) => expect(() => new vm.Script(match[1], { filename: `capstone#script-${index + 1}` })).not.toThrow());
    expect(publicCopy).toBe(source);
  });
});
