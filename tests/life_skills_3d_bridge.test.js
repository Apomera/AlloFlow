import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const lifeSkills = readFileSync(resolve(root, 'stem_lab/stem_tool_lifeskills.js'), 'utf8');

describe('Life Skills 3D host bridge', () => {
  it('accepts completion and transfer events from the six labs and deduplicates rewards', () => {
    expect(lifeSkills).toContain("window.__alloflowLifeSkills3dBridge");
    expect(lifeSkills).toContain("window.addEventListener('message'");
    expect(lifeSkills).toContain('alloflow-life-(safety|repair|kitchen|laundry|transit|capstone)-3d');
    expect(lifeSkills).toContain("'alloflow-life-safety-3d': 'homeSafetyReady'");
    expect(lifeSkills).toContain("'alloflow-life-repair-3d': 'handyman'");
    expect(lifeSkills).toContain("'alloflow-life-kitchen-3d': 'chefSafe'");
    expect(lifeSkills).toContain("'alloflow-life-laundry-3d': 'laundryPro'");
    expect(lifeSkills).toContain("'alloflow-life-transit-3d': 'routeNavigator'");
    expect(lifeSkills).toContain("'alloflow-life-capstone-3d': 'capstoneReady'");
    expect(lifeSkills).toContain('bridge.seen[taskKey]');
    expect(lifeSkills).toContain('lifeSkills3dStatus');
    expect(lifeSkills).toContain('/-targeted-replay-start$/.test(type)');
    expect(lifeSkills).toContain('/-challenge-start$/.test(type)');
    expect(lifeSkills).toContain('/-procedure-start$/.test(type)');
    expect(lifeSkills).toContain('/-procedure-practiced$/.test(type)');
    expect(lifeSkills).toContain('/-debrief$/.test(type)');
    expect(lifeSkills).toContain('/-teach-back$/.test(type)');
    expect(lifeSkills).toContain('/-reflection$/.test(type)');
    expect(lifeSkills).toContain('/-confidence$/.test(type)');
    expect(lifeSkills).toContain('/-next-step$/.test(type)');
    expect(lifeSkills).toContain('/-replay-complete$/.test(type)');
    expect(lifeSkills).toContain('/-help-pause$/.test(type)');
    expect(lifeSkills).toContain('/-why-reveal$/.test(type)');
    expect(lifeSkills).toContain('firstTry: data.firstTry');
    expect(lifeSkills).toContain('selfCorrected: data.selfCorrected');
    expect(lifeSkills).toContain('coached: data.coached');
    expect(lifeSkills).toContain('contextTransfer: data.contextTransfer');
    expect(lifeSkills).toContain('procedurePractice: data.procedurePractice');
    expect(lifeSkills).toContain('recommendedTask: data.recommendedTask');
  });
});
