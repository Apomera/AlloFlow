import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const source = readFileSync(resolve(root, 'stem_lab/stem_tool_lifeskills.js'), 'utf8');

describe('Life Skills 3D passport', () => {
  it('tracks all six labs through the host bridge', () => {
    expect(source).toContain('var LIFE_SKILLS_3D_LABS = [');
    expect(source).toContain("id: 'safety', source: 'alloflow-life-safety-3d'");
    expect(source).toContain("id: 'repair', source: 'alloflow-life-repair-3d'");
    expect(source).toContain("id: 'kitchen', source: 'alloflow-life-kitchen-3d'");
    expect(source).toContain("id: 'laundry', source: 'alloflow-life-laundry-3d'");
    expect(source).toContain("id: 'transit', source: 'alloflow-life-transit-3d'");
    expect(source).toContain("id: 'capstone', source: 'alloflow-life-capstone-3d'");
    expect(source).toContain('updateLifeSkills3dPassport(data.source, data.completed, data.total, false)');
    expect(source).toContain('updateLifeSkills3dPassport(data.source, data.total || lifeSkills3dTotal(data.source), data.total || lifeSkills3dTotal(data.source), true)');
    expect(source).toContain('updateLifeSkills3dPassport(data.source, 0, lifeSkills3dTotal(data.source), false)');
    expect(source).toContain("All ' + LIFE_SKILLS_3D_LABS.length + ' 3D labs are complete.");
    expect(source).not.toContain('All five 3D labs are complete.');
  });

  it('renders an accessible overview launch surface with progress bars', () => {
    expect(source).toContain("'data-lifeskills-3d-passport': 'true'");
    expect(source).toContain("lifeSkills3dCompletedSteps + '/' + lifeSkills3dTotalSteps + ' scene steps practiced'");
    expect(source).toContain("role: 'progressbar'");
    expect(source).toContain('Open the scene and practice safely.');
    expect(source).toContain('openLifeSkills3dById(lab.id)');
  });
});
