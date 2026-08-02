import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const source = readFileSync(resolve(root, 'stem_lab/stem_tool_lifeskills.js'), 'utf8');
const labIds = ['safety', 'repair', 'kitchen', 'laundry', 'transit', 'capstone'];

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
    expect(source).toContain('updateLifeSkills3dPassportSignals(data.source, { confidence: data.confidence, nextStep: data.nextStep });');
    expect(source).toContain("if (/-progress$/.test(type))");
    expect(source).toContain("record.confidence = lifeSkills3dConfidenceNames[signals.confidence] ? signals.confidence : ''");
    expect(source).toContain("record.nextStep = lifeSkills3dNextStepNames[signals.nextStep] ? signals.nextStep : ''");
    expect(source).toContain("All ' + LIFE_SKILLS_3D_LABS.length + ' 3D labs are complete.");
    expect(source).not.toContain('All five 3D labs are complete.');
  });

  it('renders an accessible overview launch surface with progress bars and next-practice signals', () => {
    expect(source).toContain("'data-lifeskills-3d-passport': 'true'");
    expect(source).toContain("lifeSkills3dCompletedSteps + '/' + lifeSkills3dTotalSteps + ' scene steps practiced'");
    expect(source).toContain("role: 'progressbar'");
    expect(source).toContain('Open the scene and practice safely.');
    expect(source).toContain('openLifeSkills3dById(lab.id)');
    expect(source).toContain("'aria-label': 'Open suggested next lab: ' + lifeSkills3dNextLab.title");
    expect(source).toContain('capstoneFocusLab');
    expect(source).toContain('capstoneFoundationsComplete');
    expect(source).toContain("'&focus=' + encodeURIComponent(capstoneFocusLab.id)");
    expect(source).toContain("'&support=' + encodeURIComponent(capstoneSupport)");
    expect(source).toContain("lifeSkills3dReadinessCount + '/' + LIFE_SKILLS_3D_LABS.length + ' readiness check-ins'");
    expect(source).toContain("h('span', null, 'Readiness: ' + readiness)");
    expect(source).toContain("h('span', { className: 'text-right' }, nextStep)");
  });

  it('receives privacy-preserving progress snapshots from every local lab', () => {
    for (const id of labIds) {
      const rel = id === 'capstone'
        ? 'life_skills_capstone/life_skills_capstone.html'
        : 'life_skills_' + id + '/life_skills_' + id + '.html';
      const lab = readFileSync(resolve(root, rel), 'utf8');
      expect(lab).toContain("type: 'alloflow-life-" + id + "-3d-progress'");
      expect(lab).toContain('function postProgressSnapshot()');
      expect(lab).toContain('completed: doneCount()');
      expect(lab).toContain('confidence: state.');
      expect(lab).toContain('nextStep: state.');
      expect(lab).not.toContain('reflection: text');
      expect(lab).not.toContain('teachBack: text');
      expect(lab).not.toContain('teachBack: state.debrief.teachBack');
      expect(lab).toContain("type: 'alloflow-life-" + id + "-3d-hello'");
    }
  });
  it('adds a visual journey path and polished scene surfaces', () => {
    expect(source).toContain("'data-lifeskills-3d-path': 'true'");
    expect(source).toContain("'data-lifeskills-3d-passport-tile': lab.id");
    expect(source).toContain('conic-gradient(');
    expect(source).toContain('bg-gradient-to-br from-white to-slate-50');
    for (const id of labIds) {
      const rel = id === 'capstone'
        ? 'life_skills_capstone/life_skills_capstone.html'
        : 'life_skills_' + id + '/life_skills_' + id + '.html';
      const lab = readFileSync(resolve(root, rel), 'utf8');
      if (id === 'capstone') {
        expect(lab).toContain('header::before');
        expect(lab).toContain('3D SCENE');
      } else {
        expect(lab).toContain('.' + id + '-header::before');
        expect(lab).toContain('3D PRACTICE');
      }
      expect(lab).toContain('prefers-reduced-motion');
    }
  });

});
