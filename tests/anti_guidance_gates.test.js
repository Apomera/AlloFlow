// B1 (partial): evaluates the REAL host expressions from AlloFlowANTI.txt
// (base or lane) instead of grepping for them.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const REPO = process.cwd().replace(/\\/g, '/');

let anti;
beforeAll(() => { anti = readFileSync(REPO + '/AlloFlowANTI.txt', 'utf8').replace(/\r\n/g, '\n'); });

function lineWith(marker) {
  const lines = anti.split('\n').filter((l) => l.includes(marker));
  if (lines.length !== 1) throw new Error(marker + ' matched ' + lines.length + ' lines');
  return lines[0];
}
function evalExpr(expr, scope) {
  const names = Object.keys(scope);
  return new Function(...names, 'return (' + expr + ');')(...names.map((n) => scope[n]));
}

const lpScope = (over) => ({
  isAppReady: true, canvasRecoveryDecisionMade: true, hasSelectedMode: false, runTour: false,
  shellDeepLinkTool: null, lessonDeepLinkActive: false, window: { AlloModules: { LaunchPadView: {} } }, ...over,
});

describe('Launch Pad and the coach tour', () => {
  const lpExpr = () => {
    const line = lineWith('React.createElement(window.AlloModules.LaunchPadView, {');
    return line.slice(line.indexOf('{') + 1, line.indexOf(' && React.createElement(window.AlloModules.LaunchPadView'));
  };
  it('still shows the Launch Pad before a choice', () => {
    expect(!!evalExpr(lpExpr(), lpScope({}))).toBe(true);
  });
  it('steps the Launch Pad aside while the coach-started tour runs, so the tour is visible', () => {
    expect(!!evalExpr(lpExpr(), lpScope({ runTour: true }))).toBe(false);
  });
  it('reveals the concealed workspace while that tour runs, and re-conceals after', () => {
    const line = lineWith('const concealWorkspace =');
    const expr = line.slice(line.indexOf('=') + 1).replace(/;\s*$/, '');
    const scope = { isAppReady: true, hasSelectedMode: false, shellDeepLinkTool: null, lessonDeepLinkActive: false };
    expect(evalExpr(expr, { ...scope, runTour: false })).toBe(true);
    expect(evalExpr(expr, { ...scope, runTour: true })).toBe(false);
    const at = anti.indexOf(line);
    const deps = anti.slice(at, anti.indexOf('\n  }, [', at) + 200).match(/\n  \}, \[([^\]]*)\]\);/);
    expect(deps && deps[1].split(',').map((s) => s.trim()).includes('runTour')).toBe(true);
  });
});

describe('Guided Mode is not competed with', () => {
  it('hides the sidebar AI Guide button while Guided Mode runs, and only then', () => {
    const line = lineWith('<UDLGuideButton handleToggleShowUDLGuide=');
    const expr = line.slice(line.indexOf('{') + 1, line.indexOf('<UDLGuideButton')).trim().replace(/&&$/, '').trim();
    expect(!!evalExpr(expr, { isTeacherMode: true, guidedMode: false })).toBe(true);
    expect(!!evalExpr(expr, { isTeacherMode: true, guidedMode: true })).toBe(false);
    expect(!!evalExpr(expr, { isTeacherMode: false, guidedMode: false })).toBe(false);
  });
  it('defers (does not spend) the AlloBot intro while Guided Mode runs', () => {
    const line = lineWith('canPlayIntro={');
    const expr = line.slice(line.indexOf('canPlayIntro={') + 'canPlayIntro={'.length, line.lastIndexOf('}'));
    const on = { canPlayBotIntro: true, isBotVisible: true, hasSelectedRole: true };
    expect(!!evalExpr(expr, { ...on, guidedMode: false })).toBe(true);
    expect(!!evalExpr(expr, { ...on, guidedMode: true })).toBe(false);
  });
  it('lets an AI coach chip open the Learn independently door', () => {
    const line = lineWith("const choices = { full: 'teacher_full'");
    const obj = evalExpr(line.slice(line.indexOf('{'), line.lastIndexOf('}') + 1), {});
    expect(obj.adult).toBe('adult');
    for (const k of ['teacher', 'full', 'student', 'family', 'specialist', 'guided', 'learning_tools', 'educator']) expect(typeof obj[k], k).toBe('string');
  });
});
