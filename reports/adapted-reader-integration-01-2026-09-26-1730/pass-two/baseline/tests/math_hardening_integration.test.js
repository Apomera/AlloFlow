import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const viewSource = readFileSync('view_math_source.jsx', 'utf8');
const buildSource = readFileSync('build.js', 'utf8');
const hostPaths = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

describe('math hardening production integration', () => {
  it('manages the defensive manipulative grader', () => {
    expect(buildSource).toMatch(/name: 'MathManipulativeGraderModule'/);
    expect(buildSource).toMatch(/filename: 'math_manipulative_grader_module\.js'/);
    expect(buildSource.match(/name: 'MathManipulativeGraderModule'/g)).toHaveLength(1);
  });

  it('loads the grader before MathView in every host', () => {
    for (const hostPath of hostPaths) {
      const host = readFileSync(hostPath, 'utf8');
      const graderLoad = host.indexOf('MathManipulativeGraderModule');
      const viewLoad = host.indexOf('ViewMathModule');
      expect(graderLoad, hostPath).toBeGreaterThan(-1);
      expect(viewLoad, hostPath).toBeGreaterThan(graderLoad);
    }
  });

  it('keeps the desktop grader mirror identical to the root module', () => {
    const publicPath = 'desktop/web-app/public/math_manipulative_grader_module.js';
    expect(existsSync(publicPath)).toBe(true);
    expect(readFileSync(publicPath, 'utf8')).toBe(readFileSync('math_manipulative_grader_module.js', 'utf8'));
  });
});

describe('MathView host state wiring', () => {
  it('threads self-grade state into every MathView mount', () => {
    for (const hostPath of hostPaths) {
      const host = readFileSync(hostPath, 'utf8');
      const mountStart = host.indexOf('window.AlloModules.MathView && React.createElement');
      const mount = host.slice(mountStart, mountStart + 2600);
      expect(mountStart, hostPath).toBeGreaterThan(-1);
      expect(mount, hostPath).toContain('mathStudentAnswers');
      expect(mount, hostPath).toContain('setMathStudentAnswers');
      expect(host, hostPath).not.toContain('generatedContent?.data && window.AlloModules.MathView');
    }
  });

  it('converts legacy single-problem artifacts on first direct edit', () => {
    expect(viewSource).toContain("handleMathProblemEdit(pIdx, 'question', e.target.value, null, problem.__viewKey, mathResourceId)");
    expect(viewSource).toContain('toggleMathEdit(pIdx, problem.__viewKey, mathResourceId)');
    for (const hostPath of hostPaths) {
      const host = readFileSync(hostPath, 'utf8');
      expect(host, hostPath).toContain('stepIdx = null, viewProblemKey = null');
      expect(host, hostPath).toContain('existingData.problem != null || existingData.question != null');
      expect(host, hostPath).toContain('pIdx === 0 && existingProblem ? [existingProblem] : null');
      expect(host, hostPath).toContain('getMathEditorProblemKey(pIdx, viewProblemKey)');
    }
  });
});

describe('MathView stable and privacy-safe contracts', () => {
  it('does not override the pure manipulative grader with legacy branches', () => {
    const start = viewSource.indexOf("const manipulativeGrader = typeof window !== 'undefined'");
    const end = viewSource.indexOf('handleStudentInput(', start);
    const gradingBlock = viewSource.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(gradingBlock).toContain('evaluateMathViewManipulativeResponse(');
    expect(gradingBlock).toContain('gradeMathViewManipulativeResponse(');
    expect(gradingBlock).not.toContain('else if (problem.manipulativeResponse.tool');
  });

  it('uses stable problem keys for rendered and student-owned state', () => {
    expect(viewSource).toContain('key={problem.__viewKey}');
    expect(viewSource).toContain('var resourceStudentResponses = _mathSafeShallowCopy(studentResponses[mathResourceId]);');
    expect(viewSource).toContain('var getMathCheckResult = problemKey => {');
    expect(viewSource).toContain("_mathRequestActivity('check', mathResourceId, problemKey) === false");
    expect(viewSource).toContain('resourceStudentResponses[problem.__viewKey]');
    expect(viewSource).toContain('getMathCheckResult(problem.__viewKey)');
  });

  it('copies answers only while a teacher has explicitly revealed them', () => {
    const copyStart = viewSource.indexOf('aria-label={t(\'common.copy\')}');
    const copyBlock = viewSource.slice(copyStart, copyStart + 1100);
    expect(copyStart).toBeGreaterThan(-1);
    expect(copyBlock).toContain('isTeacherMode && showMathAnswers');
    expect(copyBlock).toContain('const answer = includeAnswers');
  });

  it('uses normalized problem count and real busy state for footer controls', () => {
    expect(viewSource).toContain('mathProblems.length === 1');
    expect(viewSource).toContain('isTeacherMode && mathProblems.length > 0');
    expect(viewSource).toContain('disabled={!canHandleGenerateSimilar || isProcessing}');
    expect(viewSource).toContain('disabled={!canSetMathEditInput || isMathEditingChat || isProcessing}');
    expect(viewSource).toContain('disabled={!canHandleMathEdit || !mathEditInput.trim() || isMathEditingChat || isProcessing}');
    expect(viewSource).toContain('disabled={!canSetMathEditInput || !canHandleMathEdit || isMathEditingChat || isProcessing}');
    expect(viewSource).not.toContain('disabled={isMathEditing}');
  });
});
