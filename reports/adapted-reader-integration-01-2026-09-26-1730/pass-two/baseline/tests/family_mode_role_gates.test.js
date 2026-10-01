// Family mode role gating (fleet 2026-08-16, N8).
//
// The invariant that makes this a recurring bug class: selecting the parent role
// sets isTeacherMode(true) AND isParentMode(true) (AlloFlowANTI.txt, the role
// switch near "role === 'parent'"). Independent mode does the same. So a surface
// gated on a bare `isTeacherMode` is visible to parents and independent learners,
// not just to school staff.
//
// Principal Evaluation was gated that way, which put a district personnel
// evaluation portal, and a field asking for a district Apps Script deployment
// URL, in front of a parent running a lesson for their own child.

import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

let anti;
let settings;

beforeAll(() => {
  anti = readFileSync('AlloFlowANTI.txt', 'utf8');
  settings = readFileSync('view_project_settings_source.jsx', 'utf8');
});

describe('the role invariant this depends on', () => {
  it('parent mode really does turn teacher mode on as well', () => {
    const branch = anti.slice(anti.indexOf("} else if (role === 'parent') {"), anti.indexOf("} else if (role === 'parent') {") + 400);
    expect(branch).toContain('setIsTeacherMode(true);');
    expect(branch).toContain('setIsParentMode(true);');
  });

  it('which is why the app derives its posture by excluding parent mode', () => {
    expect(anti).toContain("isTeacherMode && !isParentMode ? 'educator' : 'learner'");
  });
});

describe('project settings distinguishes a school role from a family role', () => {
  it('receives both role flags from the host', () => {
    const props = anti.slice(
      anti.indexOf('window.AlloModules.ProjectSettingsView, {'),
      anti.indexOf('onSaveEvaluationPortalUrl: handleSaveEvaluationPortalUrl')
    );
    expect(props).toContain('isParentMode, isIndependentMode,');
  });

  it('derives isSchoolRole rather than trusting isTeacherMode', () => {
    expect(settings).toContain('var isSchoolRole = isTeacherMode && !isParentMode && !isIndependentMode;');
  });

  it('hides Principal Evaluation from family and independent modes', () => {
    expect(settings).toContain("{isSchoolRole && typeof onOpenPrincipalEvaluation === 'function' && (");
    expect(settings).not.toContain("{isTeacherMode && typeof onOpenPrincipalEvaluation === 'function' && (");
  });

  it('does not hide the settings a family legitimately uses', () => {
    // The Adventure switch, XP settings and student-AI toggles stay on
    // isTeacherMode, because a parent authoring for their child is the author.
    expect(settings).toContain("renderFeatureToggle('proj-adventure-enabled', 'adventureEnabled'");
    expect(settings).toContain("{isTeacherMode && studentProjectSettings.allowSocraticTutor !== false && (");
  });

  it('keeps the built module in step', () => {
    const built = readFileSync('view_project_settings_module.js', 'utf8');
    expect(built).toContain('isTeacherMode && !isParentMode && !isIndependentMode');
  });
});
