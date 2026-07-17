import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('AlloFlowANTI.txt', 'utf8');

describe('Student/Teacher Dashboard close routing', () => {
  it('returns both dashboard variants to the valid main screen', () => {
    expect(source).toContain("const handleCloseDashboard = useCallback(() => setActiveView('input'), []);");

    const teacherBranch = source.slice(
      source.indexOf("activeView === 'dashboard' && isTeacherMode"),
      source.indexOf("activeView === 'dashboard' && !isTeacherMode")
    );
    const learnerBranchStart = source.indexOf("activeView === 'dashboard' && !isTeacherMode");
    const learnerBranch = source.slice(
      learnerBranchStart,
      source.indexOf('onShareWithTeacher=', learnerBranchStart)
    );

    expect(teacherBranch).toContain('onClose={handleCloseDashboard}');
    expect(learnerBranch).toContain('onClose={handleCloseDashboard}');
    expect(source).not.toContain("setActiveView('content')");
  });
});
