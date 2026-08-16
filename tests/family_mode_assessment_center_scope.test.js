// Assessment Center in family mode (fleet wave 2, W3).
//
// Family mode runs with isTeacherMode true AND isParentMode true
// (executeRoleSelect, role === 'parent'), so any surface gated on a bare
// isTeacherMode is visible to a parent. The Assessment Center header button is
// gated exactly that way.
//
// It is NOT a mistake that the button has no !isParentMode:
// MODE_AUDIT_2026-08-03.md F1 lists Class Analytics under "Kept for parents by
// decision", because a home-schooling parent has a real use for administering a
// probe and watching progress. What was wrong was one level down. The panel gave
// a parent the full school presentation, including importing a class roster and
// an embedded research study suite with IRB consent and Likert instruments.
//
// So the contract pinned here is: the door stays open, and what is behind it is
// scoped. If someone later "fixes" the header gate instead, the first test here
// tells them why not.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const panel = fs.readFileSync(path.join(root, 'student_analytics_module.js'), 'utf8');
const panelMirror = fs.readFileSync(path.join(root, 'desktop/web-app/public/student_analytics_module.js'), 'utf8');
const header = fs.readFileSync(path.join(root, 'view_header_source.jsx'), 'utf8');
const headerModule = fs.readFileSync(path.join(root, 'view_header_module.js'), 'utf8');
const anti = fs.readFileSync(path.join(root, 'AlloFlowANTI.txt'), 'utf8');
const audit = fs.readFileSync(path.join(root, 'MODE_AUDIT_2026-08-03.md'), 'utf8');

describe('the role invariant that makes this a bug class at all', () => {
  it('selecting the parent role really does turn teacher mode on as well', () => {
    const at = anti.indexOf("} else if (role === 'parent') {");
    expect(at, "the parent branch of executeRoleSelect").toBeGreaterThan(-1);
    const branch = anti.slice(at, at + 400);
    expect(branch).toContain('setIsTeacherMode(true);');
    expect(branch).toContain('setIsParentMode(true);');
  });
});

describe('the header door is deliberately left open to parents', () => {
  it('is a recorded decision, not an oversight', () => {
    expect(audit).toContain('Kept for parents by');
    expect(audit.slice(audit.indexOf('Kept for parents by'), audit.indexOf('Kept for parents by') + 260))
      .toContain('Class Analytics');
  });

  it('so the Assessment Center button carries no !isParentMode, and says why', () => {
    const at = header.indexOf('data-help-key="header_analytics"');
    expect(at).toBeGreaterThan(-1);
    const block = header.slice(at - 1800, at);
    expect(block, 'the reason must travel with the gate').toContain('MODE_AUDIT_2026-08-03.md F1');
    // The button element itself must not be wrapped in a parent exclusion.
    const openTag = header.lastIndexOf('<button type="button"', at);
    expect(header.slice(openTag, at)).not.toContain('isParentMode');
  });

  it('and the compiled module keeps the button reachable', () => {
    expect(headerModule).toContain('"data-help-key": "header_analytics"');
    const at = headerModule.indexOf('"data-help-key": "header_analytics"');
    // 300 chars back covers the createElement call opening this button.
    expect(headerModule.slice(at - 300, at)).not.toContain('!isParentMode');
  });
});

describe('what is behind the door is scoped for a family', () => {
  it('the panel accepts isParentMode and defaults it off for an older host', () => {
    expect(panel).toContain('isParentMode = false,');
  });

  it('the host actually passes it (a prop nobody supplies is the classic dead gate)', () => {
    const at = anti.indexOf('<StudentAnalyticsPanel');
    expect(at).toBeGreaterThan(-1);
    const props = anti.slice(at, at + 2000);
    expect(props).toContain('isParentMode={isParentMode}');
    expect(props, 'the independent flag stays separate').toContain('isIndependentMode={isIndependentMode}');
  });

  it('drops the Student Data and Research tabs in family mode, keeping Administer', () => {
    expect(panel).toContain(".filter(tab => !isParentMode || tab.id === 'assessments')");
    // Behavioural check on the filter itself, not just its presence.
    const tabs = [{ id: 'assessments' }, { id: 'students' }, { id: 'research' }];
    const forParent = (isParentMode) => tabs.filter(tab => !isParentMode || tab.id === 'assessments').map(t => t.id);
    expect(forParent(true)).toEqual(['assessments']);
    expect(forParent(false)).toEqual(['assessments', 'students', 'research']);
  });

  it('will not render roster import or the research suite even from a stale tab value', () => {
    expect(panel).toContain("!isIndependentMode && !isParentMode && assessmentCenterTab === 'students'");
    expect(panel).toContain("!isIndependentMode && !isParentMode && assessmentCenterTab === 'research'");
  });

  it('lands a parent on a tab that still exists', () => {
    expect(panel).toContain('React.useState("assessments")');
  });

  it('leaves the independent learner view untouched', () => {
    // Independent mode has its own presentation and must not be swept up in this.
    expect(panel).toContain("isIndependentMode ? '\\u{1F4CA} My Learning Journey' : '🎯 Assessment Center'");
    const at = panel.indexOf("isIndependentMode ? '\\u{1F4CA} My Learning Journey'");
    expect(panel.slice(at, at + 120)).not.toContain('isParentMode');
  });

  it('keeps the deploy mirror byte-identical', () => {
    expect(panelMirror).toBe(panel);
  });
});
