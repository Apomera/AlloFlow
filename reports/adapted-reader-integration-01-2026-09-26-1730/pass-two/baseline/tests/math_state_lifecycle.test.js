import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const hostPaths = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

const readHosts = () => hostPaths.map(path => [path, readFileSync(path, 'utf8')]);
const rootHost = readFileSync('AlloFlowANTI.txt', 'utf8');

describe('math resource state lifecycle', () => {
  it('resets draft assessment state when the active math resource changes', () => {
    for (const [path, host] of readHosts()) {
      const start = host.indexOf('const mathSelfGradeContextKey');
      const block = host.slice(start, start + 1200);
      expect(start, path).toBeGreaterThan(-1);
      expect(block, path).toContain("activeView === 'math'");
      expect(block, path).toContain("generatedContent?.type === 'math'");
      expect(block, path).toContain("mathSelfGradeSubmissionRef.current = ''");
      expect(block, path).toContain('setMathStudentAnswers({})');
      expect(block, path).toContain('setMathSelfGradeMode(false)');
      expect(block, path).toContain('setShowMathAnswers(false)');
      expect(block, path).toContain('[mathSelfGradeContextKey]');
      expect(block, path).toContain('React.useLayoutEffect(() =>');
      expect(block, path).toContain('mathActiveResourceKeyRef.current = mathSelfGradeContextKey');
    }
  });

  it('deduplicates double submissions and stores only learner-safe grading details', () => {
    for (const [path, host] of readHosts()) {
      const start = host.indexOf('const submitMathSelfGrade');
      const end = host.indexOf('const handleToggleIsEditingLessonPlan', start);
      const block = host.slice(start, end);
      const resultStart = block.indexOf('const result =');
      const resultBlock = block.slice(resultStart, block.indexOf('setHistory', resultStart));
      expect(start, path).toBeGreaterThan(-1);
      expect(block, path).toContain('gradeMathSelfAssessment(problems, mathStudentAnswers)');
      expect(block, path).toContain('const gradedProblems = grade.results;');
      expect(block, path).toContain('const submittedAnswers = grade.answers;');
      expect(block, path).toContain('mathSelfGradeSubmissionRef.current === submissionSignature');
      expect(resultBlock, path).toContain('...grade');
      expect(resultBlock, path).toContain('sourceId');
      expect(resultBlock, path).not.toMatch(/\bexpected\s*:/);
      expect(resultBlock, path).not.toMatch(/\bcorrect_answer\s*:/);
    }
  });

  it('invalidates per-resource interaction state after structural math edits', () => {
    for (const [path, host] of readHosts()) {
      const start = host.indexOf('onMathProblemsChanged:');
      const block = host.slice(start, start + 700);
      const editStart = host.indexOf('const handleMathEdit =');
      const editBlock = host.slice(editStart, editStart + 1800);
      const clearStart = host.indexOf('const clearMathResourceState');
      const clearBlock = host.slice(clearStart, clearStart + 1700);
      expect(start, path).toBeGreaterThan(-1);
      expect(clearStart, path).toBeGreaterThan(-1);
      expect(block, path).toContain('const clearActiveAssessment = mathActiveResourceKeyRef.current === resourceId');
      expect(block, path).toContain('clearMathResourceState(resourceId, clearActiveAssessment, getMathStoredProblemKeys(generatedContent))');
      expect(editBlock, path).toContain('setHistory,');
      expect(clearBlock, path).toContain('invalidateMathResourceRequests?.(key)');
      expect(clearBlock, path).toContain('delete next[key]');
      expect(clearBlock, path).not.toContain('startsWith(');
    }
  });

  it('invalidates the exact problem request and state before applying an inline edit', () => {
    for (const [path, host] of readHosts()) {
      const start = host.indexOf('const handleMathProblemEdit');
      const end = host.indexOf('const getMathEditorProblemKey', start);
      const block = host.slice(start, end);
      expect(start, path).toBeGreaterThan(-1);
      expect(block, path).toContain('invalidateMathProblemRequests?.(resourceId, stableKey)');
      expect(block, path).toContain('delete nextResource[stableKey]');
      expect(block, path).toContain('delete next[`${resourceId}_${stableKey}`]');
      expect(block, path).toContain('if (mathActiveResourceKeyRef.current === resourceId)');
      expect(block, path).toMatch(/getMathResourceStateKey\((?:prev|artifact)\) !== resourceId/);
      expect(block, path).toContain('findIndex(h => getMathResourceStateKey(h) === resourceId)');
    }
  });

  it('uses tuple-encoded edit keys so underscores cannot alias another resource', () => {
    for (const [path, host] of readHosts()) {
      const start = host.indexOf('const getMathEditorStateKey');
      const block = host.slice(start, start + 700);
      expect(start, path).toBeGreaterThan(-1);
      expect(block, path).toContain('JSON.stringify([');
      expect(block, path).toContain('String(viewResourceId ?? getMathResourceStateKey(generatedContent))');
      expect(block, path).toContain('getMathEditorStateKey(pIdx, viewProblemKey, viewResourceId)');
    }
  });

  it('prunes deleted resources and clears all math state with the workspace', () => {
    for (const [path, host] of readHosts()) {
      const deleteStart = host.indexOf('const handleDeleteHistoryItem');
      const deleteBlock = host.slice(deleteStart, deleteStart + 2600);
      const clearStart = host.indexOf('const handleClearHistory');
      const clearBlock = host.slice(clearStart, clearStart + 900);
      expect(deleteStart, path).toBeGreaterThan(-1);
      expect(deleteBlock, path).toContain('itemRef = null');
      expect(deleteBlock, path).toContain('getMathResourceStateKey(deletedArtifact)');
      expect(deleteBlock, path).toContain('clearMathResourceState(mathStateResourceId, deletingActiveResource, getMathStoredProblemKeys(deletedArtifact))');
      expect(deleteBlock, path).not.toContain('prev.filter(item => String(item.id) !== String(id))');
      const resetStart = host.indexOf('const resetAllMathRuntimeState');
      if (resetStart >= 0) {
        const resetBlock = host.slice(resetStart, resetStart + 1100);
        expect(clearBlock, path).toContain('resetAllMathRuntimeState()');
        expect(resetBlock, path).toContain('invalidateAllMathRequests?.()');
        expect(resetBlock, path).toContain('setStudentResponses({})');
        expect(resetBlock, path).toContain('setMathCheckResults({})');
        expect(resetBlock, path).toContain('setMathHintData({})');
        expect(resetBlock, path).toContain('setMathEditingProblem({})');
        expect(resetBlock, path).toContain('setMathStudentAnswers({})');
        expect(resetBlock, path).toContain("mathSelfGradeSubmissionRef.current = ''");
      } else {
        expect(clearBlock, path).toContain('invalidateAllMathRequests?.()');
        expect(clearBlock, path).toContain('setStudentResponses({})');
        expect(clearBlock, path).toContain('setMathCheckResults({})');
        expect(clearBlock, path).toContain('setMathHintData({})');
        expect(clearBlock, path).toContain('setMathEditingProblem({})');
        expect(clearBlock, path).toContain('setMathStudentAnswers({})');
        expect(clearBlock, path).toContain("mathSelfGradeSubmissionRef.current = ''");
      }
    }
  });

  it('deletes the exact clicked history artifact when imported IDs collide', () => {
    const panelSource = readFileSync('view_history_panel_source.jsx', 'utf8');
    expect(panelSource).toContain('handleDeleteHistoryItem(e, itemPublicId, item)');
    for (const [path, host] of readHosts()) {
      const deleteStart = host.indexOf('const handleDeleteHistoryItem');
      const deleteBlock = host.slice(deleteStart, deleteStart + 3600);
      expect(deleteBlock, path).toContain('const requestedInstanceId = getArtifactInstanceId(itemRef)');
      expect(deleteBlock, path).toContain('findArtifactInstanceIndex(history, requestedInstanceId, safePublicId)');
      expect(deleteBlock, path).toContain('removeArtifactInstanceFromList(prev, requestedInstanceId, safePublicId)');
      expect(deleteBlock, path).toContain('sameArtifactInstance(generatedContent, deletedArtifact)');
      expect(deleteBlock, path).toContain('next.splice(targetIndex, 1)');
      expect(deleteBlock, path).not.toContain('prev.filter(item => String(item.id) !== String(id))');
    }
  });

  it('centralizes complete math runtime cleanup at workspace replacement boundaries', () => {
    const resetStart = rootHost.indexOf('const resetAllMathRuntimeState');
    const resetBlock = rootHost.slice(resetStart, resetStart + 1200);
    expect(resetStart).toBeGreaterThan(-1);
    expect(resetBlock).toContain('invalidateAllMathRequests?.()');
    expect(resetBlock).toContain('setStudentResponses({})');
    expect(resetBlock).toContain('setMathCheckResults({})');
    expect(resetBlock).toContain('setMathHintData({})');
    expect(resetBlock).toContain('setMathEditingProblem({})');
    expect(resetBlock).toContain('setMathStudentAnswers({})');
    expect(resetBlock).toContain('setMathSelfGradeMode(false)');
    expect(resetBlock).toContain('setShowMathAnswers(false)');
    expect(resetBlock).toContain('setMathAssessmentStateKey(null)');
    expect(resetBlock).toContain("setMathEditInput('')");
    expect(resetBlock).toContain('setIsMathEditingChat(false)');
    expect(resetBlock).toContain("mathSelfGradeSubmissionRef.current = ''");
    expect(resetBlock).toContain('mathSelfGradeContextRef.current = null');

    const canvasClearStart = rootHost.indexOf('const clearCanvasWorkspaceState');
    const canvasRestoreStart = rootHost.indexOf('const restoreCanvasWorkspaceSnapshot');
    const historyClearStart = rootHost.indexOf('const handleClearHistory');
    const importCompleteStart = rootHost.indexOf('onProjectLoadComplete:');
    expect(rootHost.slice(canvasClearStart, canvasClearStart + 500)).toContain('resetAllMathRuntimeState()');
    expect(rootHost.slice(canvasRestoreStart, canvasRestoreStart + 1800)).toContain('resetAllMathRuntimeState()');
    expect(rootHost.slice(historyClearStart, historyClearStart + 500)).toContain('resetAllMathRuntimeState()');
    expect(rootHost.slice(importCompleteStart, importCompleteStart + 500)).toContain('if (success) resetAllMathRuntimeState()');
  });

  it('keeps inline artifact updaters pure and applies one shared patch to active and history state', () => {
    const start = rootHost.indexOf('const handleMathProblemEdit');
    const end = rootHost.indexOf('const getMathEditorProblemKey', start);
    const block = rootHost.slice(start, end);
    const generatedSetter = 'setGeneratedContent(previous => patchMathArtifact(previous));';
    expect(start).toBeGreaterThan(-1);
    expect(block).toContain('const patchMathArtifact = artifact =>');
    expect(block).toContain(generatedSetter);
    expect(block).toContain('setHistory(previousHistory =>');
    expect(block).toContain('const updatedArtifact = patchMathArtifact(currentArtifact);');
    expect(block.indexOf('setHistory(previousHistory =>')).toBeGreaterThan(block.indexOf(generatedSetter));
    expect(block).not.toContain('setGeneratedContent(prev => {');
  });

  it('toggles self-grade mode without nesting another state update inside its updater', () => {
    const start = rootHost.indexOf('const handleToggleMathSelfGrade');
    const end = rootHost.indexOf('const submitMathSelfGrade', start);
    const block = rootHost.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(block).toContain('setShowMathAnswers(false);');
    expect(block).toContain('setMathSelfGradeMode(previous => !previous);');
    expect(block).not.toContain('setMathSelfGradeMode(previous => {');
  });

  it('gates a newly committed math resource from the previous resource assessment draft', () => {
    const contextStart = rootHost.indexOf('const mathSelfGradeContextKey');
    const contextEnd = rootHost.indexOf('const [nlChallenge', contextStart);
    const contextBlock = rootHost.slice(contextStart, contextEnd);
    const firstLayoutEffect = contextBlock.indexOf('React.useLayoutEffect(() =>');
    expect(contextStart).toBeGreaterThan(-1);
    expect(rootHost).toContain('const [mathAssessmentStateKey, setMathAssessmentStateKey]');
    expect(firstLayoutEffect).toBeGreaterThan(-1);
    expect(contextBlock.slice(0, firstLayoutEffect)).not.toContain('mathActiveResourceKeyRef.current =');
    expect(contextBlock.slice(0, firstLayoutEffect)).not.toContain('mathSelfGradeContextRef.current =');
    expect(contextBlock).toContain('mathActiveResourceKeyRef.current = mathSelfGradeContextKey');
    expect(contextBlock).toContain('mathSelfGradeContextRef.current = mathSelfGradeContextKey');
    expect(contextBlock).toContain('setMathAssessmentStateKey(mathSelfGradeContextKey)');
    expect(contextBlock).toContain('const mathAssessmentContextIsCurrent = mathSelfGradeContextKey !== null');
    expect(contextBlock).toContain('const effectiveMathStudentAnswers = mathAssessmentContextIsCurrent ? mathStudentAnswers : {}');
    expect(contextBlock).toContain('const effectiveMathSelfGradeMode = mathAssessmentContextIsCurrent && mathSelfGradeMode');
    expect(contextBlock).toContain('const effectiveShowMathAnswers = mathAssessmentContextIsCurrent && showMathAnswers');
    expect(contextBlock).not.toContain('\n  useEffect(() => {');

    const viewStart = rootHost.indexOf("{activeView === 'math' && window.AlloModules");
    const viewBlock = rootHost.slice(viewStart, viewStart + 1700);
    expect(viewStart).toBeGreaterThan(-1);
    expect(viewBlock).toContain('showMathAnswers: effectiveShowMathAnswers');
    expect(viewBlock).toContain('mathSelfGradeMode: effectiveMathSelfGradeMode');
    expect(viewBlock).toContain('mathStudentAnswers: effectiveMathStudentAnswers');
    expect(viewBlock).toContain('mathResourceId: mathSelfGradeContextKey');
    expect(viewBlock).not.toContain('showMathAnswers, mathSelfGradeMode, mathStudentAnswers');
  });

  it('threads duplicate-aware artifact identity through assessment and edit state', () => {
    const keyStart = rootHost.indexOf('const getMathResourceStateKey');
    const keyBlock = rootHost.slice(keyStart, keyStart + 1800);
    const inlineEditStart = rootHost.indexOf('const handleMathProblemEdit');
    const inlineEditBlock = rootHost.slice(inlineEditStart, rootHost.indexOf('const getMathEditorProblemKey', inlineEditStart));
    const asyncEditStart = rootHost.indexOf('const handleMathEdit =');
    const asyncEditBlock = rootHost.slice(asyncEditStart, asyncEditStart + 1800);

    expect(keyStart).toBeGreaterThan(-1);
    expect(keyBlock).toContain('helper?.getMathResourceInstanceId');
    expect(keyBlock).toContain('helper.getMathResourceInstanceId(artifact, history)');
    expect(inlineEditBlock).toContain('_mathResourceStateKey: resourceId');
    expect(asyncEditBlock).toContain('const mathResourceId = getMathResourceStateKey(generatedContent)');
    expect(asyncEditBlock).toContain('history,');
    expect(asyncEditBlock).toContain('mathResourceId,');
  });

  it('rejects stale assessment controls and submission before grading or history mutation', () => {
    const contextStart = rootHost.indexOf('const isCommittedMathAssessmentContext');
    const contextEnd = rootHost.indexOf('const [nlChallenge', contextStart);
    const contextBlock = rootHost.slice(contextStart, contextEnd);
    expect(contextStart).toBeGreaterThan(-1);
    expect(contextBlock).toContain('key === mathSelfGradeContextKey');
    expect(contextBlock).toContain('key === mathAssessmentStateKey');
    expect(contextBlock).toContain('mathSelfGradeContextRef.current === key');
    expect(contextBlock).toContain('mathActiveResourceKeyRef.current === key');
    expect(contextBlock).toContain('const handleToggleShowMathAnswers = React.useCallback');
    expect(contextBlock).toContain('const handleSetShowMathAnswersToTrue = React.useCallback');

    const submitStart = rootHost.indexOf('const submitMathSelfGrade');
    const submitEnd = rootHost.indexOf('const handleToggleIsEditingLessonPlan', submitStart);
    const submitBlock = rootHost.slice(submitStart, submitEnd);
    const guardPosition = submitBlock.indexOf('if (!isCommittedMathAssessmentContext(requestedResourceId)) return;');
    const gradePosition = submitBlock.indexOf('gradeMathSelfAssessment(problems, mathStudentAnswers)');
    const historyPosition = submitBlock.indexOf('setHistory');
    expect(guardPosition).toBeGreaterThan(-1);
    expect(guardPosition).toBeLessThan(gradePosition);
    expect(guardPosition).toBeLessThan(historyPosition);
    expect(submitBlock).toContain('const sourceId = requestedResourceId;');
  });
});
