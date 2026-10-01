import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const host = readFileSync('AlloFlowANTI.txt', 'utf8');
const commands = readFileSync('allo_commands_source.jsx', 'utf8');

function between(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  expect(from, 'start marker: ' + start).toBeGreaterThan(-1);
  expect(to, 'end marker: ' + end).toBeGreaterThan(from);
  return source.slice(from, to);
}

describe('learner semantic host wiring', () => {
  it('keeps protected Educator onboarding on role selection until access is authorized', () => {
    const choosePath = between(host, 'const chooseOnboardingPath = (path) => {', 'const chooseOnboardingRole = (role) => {');
    const educator = between(choosePath, "if (choice === 'educator') {", 'return false;');
    expect(educator).toContain('setHasSelectedRole(false)');
    expect(educator).not.toContain('setIsGateOpen(true)');
    expect(educator).not.toContain('setShowEducatorHub(true)');
  });

  it('does not describe or close a persisted hidden resource as though it were visible', () => {
    const describeScreen = between(host, 'const describeCurrentScreen = () => {', 'const listCurrentActions = () => {');
    expect(describeScreen.indexOf("if (activeView === 'dashboard')")).toBeLessThan(describeScreen.indexOf('if (generatedContent)'));
    expect(describeScreen.indexOf("if (activeView === 'input')")).toBeLessThan(describeScreen.indexOf('if (generatedContent)'));

    const closeSurface = between(host, 'const closeCurrentSurface = () => {', 'const goBack = () => {');
    expect(closeSurface).toContain("if (activeView !== 'dashboard')");
    expect(closeSurface).not.toContain("generatedContent || activeView !== 'dashboard'");
  });

  it('derives spoken action discovery from commands available in the same live context', () => {
    const actions = between(host, 'const listCurrentActions = () => {', 'const closeCurrentSurface = () => {');
    expect(actions).toContain('commandApi.buildAlloCommands(ctx)');
    expect(actions).toContain('commandApi.listActiveCommandScopes(ctx)');
    expect(actions).toContain("preferredIds.push('tutorial-surface')");
    expect(actions).toContain("preferredIds.push('generated-resource')");
    expect(actions).toContain("ids = ['describe_current_screen', 'close_current_surface', 'repeat_last_response']");
    expect(actions).toContain('Test Prep\'s local completion grammar is still being consolidated');
    expect(actions).toContain('filter(Boolean).map((command) => command.label)');
  });

  it('keeps learner resources fail-closed behind every semantic top surface', () => {
    const bridge = between(host, 'const listLearnerResources = () => {', 'const chooseOnboardingPath = (path) => {');
    expect(bridge).toContain('catch (_) { return []; }');
    expect(bridge).toContain('const isLearnerResourceSurfaceBlocked = () =>');
    for (const blocker of [
      'showStudentEntry', 'showSaveModal', 'showSubmitModal', 'showReadThisPage',
      'isTestPrepHubOpen', 'showNotebook', 'showExportMenu', 'runTour', 'guidedMode',
      '!hasSelectedMode', '!hasSelectedRole',
    ]) {
      expect(bridge).toContain(blocker);
    }
    expect(bridge).toContain("commandAudience === 'student'");
    expect(bridge).toContain('listLearnerResources().some');
    expect(bridge).toContain('frontmost: !isLearnerResourceSurfaceBlocked()');
    expect(bridge).not.toContain('.click(');
  });

  it('aligns orientation, close, and back with the rendered tutorial and top learner dialogs', () => {
    const describeScreen = between(host, 'const describeCurrentScreen = () => {', 'const listCurrentActions = () => {');
    const closeSurface = between(host, 'const closeCurrentSurface = () => {', 'const goBack = () => {');
    const back = between(host, 'const goBack = () => {', 'const repeatLastResponse = () => {');
    expect(describeScreen).toContain('if (runTour && tourRect)');
    expect(describeScreen).toContain('if (showSaveModal)');
    expect(describeScreen).toContain('if (showSubmitModal)');
    expect(closeSurface).toContain('if (runTour && tourRect)');
    expect(closeSurface).toContain('handleCloseSubmitModal()');
    expect(back).toContain('tutorial.canPrevious');
    expect(back).toContain("invokeTutorialVoiceAction('previous')");
  });

  it('exposes orientation and onboarding capabilities through the shared command context', () => {
    const context = between(host, 'const ctx = {', '_alloCmdCtxRef.current = ctx;');
    for (const symbol of [
      'onboardingStage', 'chooseOnboardingPath', 'chooseOnboardingRole',
      'describeCurrentScreen', 'listCurrentActions', 'goBack',
      'closeCurrentSurface', 'repeatLastResponse',
      'listLearnerResources', 'isLearnerResourceDiscoveryActive',
      'getCurrentLearnerResource', 'invokeLearnerResourceAction',
    ]) {
      expect(context).toContain(symbol);
    }
  });

  it('uses one global voice loop for launch-pad and role-selection Voice Access', () => {
    expect(host).toContain('const enableGlobalVoiceAccess = async () => {');
    expect(host).toContain('onStartVoiceAccess={enableGlobalVoiceAccess}');
    expect(host).toContain('enableVoiceAccess: enableGlobalVoiceAccess');
    expect(host).toContain('voiceAccessActive: alloVoiceAccessListening');
    expect(host).toContain('if (!window.__alloVoiceLoop) window.__alloVoiceLoop = AC.createVoiceLoop');
  });
});

describe('production voice kernel bridge', () => {
  it('routes single spoken commands through the scoped kernel with confidence metadata', () => {
    const voiceLoop = between(commands, 'function createVoiceLoop(getCtx, opts = {}) {', 'function scoreCommand(cmd, q) {');
    expect(voiceLoop).toContain("createCommandKernel(getCtx, { channel: 'voice'");
    expect(voiceLoop).toContain('commandKernel.handleUtterance(text');
    expect(voiceLoop).toContain('recognitionConfidence: confidence');
    expect(voiceLoop).toContain('kind: "kernel-command"');
    expect(voiceLoop).toContain('commandKernel.confirm("yes"');
    expect(voiceLoop).toContain('if (paused) return;');
  });
});

