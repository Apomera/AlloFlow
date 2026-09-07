import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const portal = readFileSync('apps_script/school_rewards/Portal.html', 'utf8');
const goalFunctions = portal.slice(portal.indexOf('  function goalStorageKey'), portal.indexOf('  function renderGoal'));
function goalSession(studentId, role = 'student', year = '2026') {
  return new Function('state', 'localStorage', goalFunctions + '; return { get: goalId, set: setGoalId };')({ data: {
    actor: { studentId, role }, config: { schoolName: 'Demo school', academicYear: year },
  } }, localStorage);
}

beforeEach(() => { localStorage.clear(); resetStemLab(); });

describe('private reinforcement and store preferences', () => {
  it('isolates savings goals by student and school year and ignores the old shared goal', () => {
    localStorage.setItem('alloflow_school_rewards_goal', 'legacy-prize');
    const a = goalSession('a'), b = goalSession('b');
    expect(a.get()).toBe('');
    a.set('turtle');
    expect(b.get()).toBe('');
    b.set('rocket');
    expect(a.get()).toBe('turtle');
    expect(b.get()).toBe('rocket');
    expect(goalSession('a', 'student', '2027').get()).toBe('');
    expect(goalSession('a', 'staff').get()).toBe('');
    goalSession('a', 'staff').set('forbidden');
    expect(a.get()).toBe('turtle');
    a.set('');
    expect(a.get()).toBe('');
    expect(b.get()).toBe('rocket');
  });

  it('exports recognition and roster labels as text, including formula-like codenames', () => {
    window.React = React;
    window.AlloModules = window.AlloModules || {};
    delete window.AlloModules.SchoolRewards;
    new Function(readFileSync('school_rewards_module.js', 'utf8'))();
    const t = window.AlloModules.SchoolRewards._testing;
    const csv = t.srRecognitionCsv({ rows: ['=1+2', '+SUM(A1)', '-1+2', '@SUM(A1)', '  =1', '\t=1', 'Calm, Otter'].map(codename => ({ codename, total: 2, reasons: [] })) });
    for (const start of ["'=1+2", "'+SUM(A1)", "'-1+2", "'@SUM(A1)", "'  =1", "'\t=1", '"Calm, Otter"']) expect(csv).toContain(start);
    expect(csv).toContain(',2,1,');
    expect(t.srRosterTemplateCsv({ groups: [{ id: 'a', name: '=1+2', codenames: ['@SUM(A1)'] }] }, ['a'])).toContain("'=1+2");
  });
});

describe('manufacturing comparison and design handoff', () => {
  it('calculates savings and increases without treating blank, zero, or invalid input as evidence', () => {
    loadTool('stem_lab/stem_tool_printlab.js', 'printLab');
    const compare = window.StemLab.printLabPure.compareSlicerPlans;
    expect(compare({ baselineGrams: 20, candidateGrams: 14, baselineMinutes: 100, candidateMinutes: 120 })).toEqual({
      mass: { before: 20, after: 14, saved: 6, percent: 30 },
      time: { before: 100, after: 120, saved: -20, percent: -20 },
    });
    for (const invalid of ['', ' ', 0, -1, 'NaN', Infinity, true, [], 1000001]) {
      expect(compare({ baselineGrams: invalid, candidateGrams: 10 }).mass).toBeNull();
      expect(compare({ baselineGrams: 10, candidateGrams: invalid }).mass).toBeNull();
    }
    expect(compare({ baselineGrams: '12.5', candidateGrams: '12.5' }).mass.saved).toBe(0);
  });

  it('shows the strength boundary and slicer comparison without claiming a safety result', () => {
    loadTool('stem_lab/stem_tool_printlab.js', 'printLab');
    const html = renderTool('printLab', { printLab: { activeTab: 'Materials' } });
    for (const text of ['Strength and material savings', 'does not calculate load capacity', 'Compare two slicer runs', 'Baseline filament (g)', 'Candidate print time (min)', '51.2%', 'Clear comparison']) expect(html).toContain(text);
  });

  it('retains scale and AI disclosure through both bridge normalizers', () => {
    window.AlloModules = {};
    new Function(readFileSync('prim3d_module.js', 'utf8'))();
    loadTool('stem_lab/stem_tool_printlab.js', 'printLab');
    loadTool('stem_lab/stem_tool_artstudio.js', 'artStudio');
    const recipe = window.AlloModules.Prim3D.normalizeRecipe({ name: 'Turtle', parts: [{ shape: 'box', size: [1, 1, 1], position: [0, 0.5, 0], rotation: [0, 0, 0] }] });
    const context = { unitMm: 8, aiUse: 'MOSTLY_AI', aiDisclosure: 'AI proposed the first model.' };
    const sculpt = window.StemLab.artStudioPure.readPendingSculpt({ schema: 'alloflow-artstudio-sculpt/1', recipe, printContext: context });
    expect(sculpt.printContext).toEqual(context);
    const print = window.StemLab.printLabPure.readPendingRecipeHandoff({ schema: 'alloflow-print-source/1', sourceTool: 'artStudio', format: 'RECIPE', recipe: sculpt.recipe, ...sculpt.printContext });
    expect(print).toMatchObject(context);
    const invalid = window.StemLab.artStudioPure.readPendingSculpt({ schema: 'alloflow-artstudio-sculpt/1', recipe, printContext: { unitMm: Infinity, aiUse: 'APPROVED', aiDisclosure: 'a'.repeat(1000) } });
    expect(invalid.printContext).toMatchObject({ unitMm: 20, aiUse: 'NONE' });
    expect(invalid.printContext.aiDisclosure.length).toBe(500);
  });
});
