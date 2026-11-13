// D6: on the access-code path the Help tip, the AlloBot intro and the Quick
// Start wizard must not fire or mount behind the gate. Runs the REAL host
// transitions (chooseLaunchRole, onGateUnlock, handleCloseGate, executeRoleSelect)
// from base|lane AlloFlowANTI.txt in a vm, and evaluates the REAL cue
// expressions and the REAL help-tip effect against the resulting state.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const ROOT = process.cwd().replace(/\\/g, '/');
const source = readFileSync(`${ROOT}/AlloFlowANTI.txt`, 'utf8').replace(/\r\n/g, '\n');
function between(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to <= from) throw new Error(`Missing host anchors: ${start} -> ${end}`);
  return source.slice(from, to);
}
function lineWith(marker) {
  const lines = source.split('\n').filter((l) => l.includes(marker));
  if (lines.length !== 1) throw new Error(marker + ' matched ' + lines.length + ' lines');
  return lines[0];
}
const transitionSource = [
  between('  const handleCloseGate = useCallback(', '  const handleCloseDashboard ='),
  between('  const onGateUnlock = () => {', '  const handleToggleAllTools ='),
  between('  const executeRoleSelect = (role, options = {}) => {', '  // \u2500\u2500 Family deep link'),
].join('\n');
const setterNames = [
  'IsSpecialistMode', 'GuidedMode', 'ShowEducatorHub', 'ShowLearningHub', 'ShowBehaviorLens',
  'ShowStudentEntry', 'PendingJoinCode', 'ShowWizard', 'WorkspacePane', 'ActiveSidebarTab',
  'ExpandedTools', 'IsTeacherMode', 'IsParentMode', 'IsIndependentMode', 'IsStudentLinkMode',
  'IsAdventureStoryMode', 'GradeLevel', 'SourceLevel', 'HasSelectedRole', 'HasSelectedMode', 'PendingRole',
  'IsGateOpen', 'IsAdminHubOpen', 'ShowEducatorHub',
];
function host() {
  const storage = new Map();
  const ctx = {
    guidedMode: false, isTeacherMode: true, isParentMode: false, isIndependentMode: false,
    isSpecialistMode: false, isStudentLinkMode: false, pendingRole: null,
    hasSelectedMode: false, hasSelectedRole: false, isGateOpen: false, showWizard: true,
    expandedTools: [], guidedSelectedIds: null, guidedStep: 0, guidedPlanBrief: null, _guidedSaved: null,
    guidedCompletedIds: [], guidedSkippedIds: [], guidedCreatedHistoryIds: [],
    guidedStarterRequestedRef: { current: false }, pendingRoleOptionsRef: { current: null },
    gateFromPadRef: { current: false }, launchChoiceEpochRef: { current: 0 },
    padFocusTargetRef: { current: null }, studentEntryFromPadRef: { current: false }, studentHubAfterEntryRef: { current: false },
    localStorage: { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)) },
    window: {}, setTimeout: () => 1, useCallback: (cb) => cb,
    _alloEducatorAccessCodeSettled: () => Promise.resolve(),
    _alloEducatorAccessCodeRequired: () => true,
    _alloCleanLiveSessionCode: (v) => v, t: (k) => k, addToast: () => {},
  };
  for (const suffix of setterNames) {
    const key = suffix[0].toLowerCase() + suffix.slice(1);
    ctx['set' + suffix] = (value) => { ctx[key] = typeof value === 'function' ? value(ctx[key]) : value; };
  }
  vm.createContext(ctx);
  vm.runInContext(transitionSource + '\nglobalThis.api = { executeRoleSelect, chooseLaunchRole, onGateUnlock, handleCloseGate };', ctx);
  return ctx;
}
// TeacherGate's success path: onUnlock() then closeGate() -> onClose().
const acceptCode = (ctx) => { ctx.api.onGateUnlock(); ctx.api.handleCloseGate(); };

function evalExpr(expr, scope) {
  const names = Object.keys(scope);
  return new Function(...names, 'return (' + expr + ');')(...names.map((n) => scope[n]));
}
const introExpr = (() => { const l = lineWith('canPlayIntro={'); return l.slice(l.indexOf('canPlayIntro={') + 'canPlayIntro={'.length, l.lastIndexOf('}')); })();
const wizardExpr = (() => { const l = lineWith('isOpen={showWizard && hasSelectedRole'); return l.slice(l.indexOf('isOpen={') + 'isOpen={'.length, l.lastIndexOf('}')); })();
const wizardMirrorExpr = (() => { const l = lineWith('_guidedWizardOpenRef.current = showWizard'); return l.slice(l.indexOf('=') + 1, l.indexOf(';')).trim(); })();
const cues = (ctx) => ({
  intro: !!evalExpr(introExpr, { canPlayBotIntro: true, isBotVisible: true, hasSelectedRole: ctx.hasSelectedRole, guidedMode: ctx.guidedMode, isGateOpen: ctx.isGateOpen }),
  wizard: !!evalExpr(wizardExpr, { showWizard: ctx.showWizard, hasSelectedRole: ctx.hasSelectedRole, isTeacherMode: ctx.isTeacherMode, isGateOpen: ctx.isGateOpen }),
});

// The real first-run help-tip effect, run with React's dependency rule.
const tipAt = source.indexOf('  // First-run help tip: only once a role is chosen');
const tipSrc = source.slice(source.indexOf('useEffect(', tipAt), source.indexOf(']);', source.indexOf('useEffect(', tipAt)) + 3);
function tipEffect() {
  const store = {}; const shown = []; let prevDeps = null; let cleanup;
  const render = (ctx) => {
    let fn; let deps;
    const scope = { hasSelectedRole: ctx.hasSelectedRole, isGateOpen: ctx.isGateOpen, safeGetItem: (k) => store[k], safeSetItem: (k, v) => { store[k] = v; }, setShowHelpOnboarding: (v) => shown.push(v), useEffect: (f, d) => { fn = f; deps = d; } };
    new Function(...Object.keys(scope), tipSrc)(...Object.values(scope));
    if (!prevDeps || deps.some((d, i) => !Object.is(d, prevDeps[i]))) { if (typeof cleanup === 'function') cleanup(); cleanup = fn(); prevDeps = deps; }
  };
  return { render, shown, store };
}

afterEach(() => vi.useRealTimers());

describe('access-code gate holds first-run cues', () => {
  it('nothing fires or mounts while the gate is up; after the code, the tip shows once and the intro may play', async () => {
    vi.useFakeTimers();
    expect(source.indexOf('const [isGateOpen, setIsGateOpen] = useState(false);'), 'gate state declared before the tip effect reads it').toBeLessThan(tipAt);
    expect(wizardMirrorExpr).toBe(wizardExpr);
    const ctx = host(); const tip = tipEffect();
    tip.render(ctx);
    await ctx.api.chooseLaunchRole('teacher_full');
    expect(ctx.isGateOpen).toBe(true); expect(ctx.hasSelectedRole).toBe(true);
    tip.render(ctx);
    expect(cues(ctx)).toEqual({ intro: false, wizard: false });
    vi.advanceTimersByTime(30000);
    expect(tip.shown, 'tip behind the gate').toEqual([]); expect(tip.store.allo_help_onboarded).toBeUndefined();
    acceptCode(ctx); tip.render(ctx);
    expect(ctx.isGateOpen).toBe(false); expect(ctx.hasSelectedRole).toBe(true);
    expect(cues(ctx)).toEqual({ intro: true, wizard: false }); // Launch Pad doors never open the wizard
    vi.advanceTimersByTime(4000); expect(tip.shown).toEqual([true]);
    vi.advanceTimersByTime(20000); expect(tip.shown).toEqual([true, false]); expect(tip.store.allo_help_onboarded).toBe('true');
  });

  it('backing out of the gate spends nothing', async () => {
    vi.useFakeTimers();
    const ctx = host(); const tip = tipEffect();
    tip.render(ctx);
    await ctx.api.chooseLaunchRole('family');
    tip.render(ctx);
    expect(cues(ctx)).toEqual({ intro: false, wizard: false });
    vi.advanceTimersByTime(5000);
    ctx.api.handleCloseGate(); tip.render(ctx);
    expect(ctx.hasSelectedRole).toBe(false);
    expect(cues(ctx)).toEqual({ intro: false, wizard: false });
    vi.advanceTimersByTime(60000);
    expect(tip.shown).toEqual([]); expect(tip.store.allo_help_onboarded).toBeUndefined();
  });

  it('the wizard never mounts behind the gate, and a gated shell-config role still opens it after the code', async () => {
    const pad = host();
    expect(pad.isTeacherMode && pad.showWizard, 'host defaults').toBe(true);
    await pad.api.chooseLaunchRole('teacher');
    expect(pad.isGateOpen).toBe(true);
    expect(cues(pad).wizard, 'wizard behind the gate').toBe(false);
    const shell = host();
    shell.hasSelectedMode = true; shell.pendingRole = 'teacher'; shell.isGateOpen = true; // the forceRole branch
    expect(cues(shell).wizard).toBe(false);
    acceptCode(shell);
    expect(shell.isGateOpen).toBe(false); expect(shell.hasSelectedRole).toBe(true); expect(shell.showWizard).toBe(true);
    expect(cues(shell).wizard).toBe(true);
  });
});
