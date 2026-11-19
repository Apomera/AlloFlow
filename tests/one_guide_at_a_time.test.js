// One guide on screen at a time (2026-11-17). The first-run Help tip and the AlloBot intro used to check
// almost nothing, so they could appear over the tour, Quick Start or the AI Guide. The host now derives the
// one guide on screen from state it already has; the tip and the intro wait while any guide is up, and stay
// out of Guided Mode. Quick Start's last step offers Guided Mode (default) or the full workspace.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ANTI = readFileSync(resolve(process.cwd(), process.env.ONE_GUIDE_HOST || 'AlloFlowANTI.txt'), 'utf8');

describe('the host derives the one guide on screen', () => {
  const start = ANTI.indexOf('  const _alloGuideOnScreen =');
  const end = ANTI.indexOf('\n  useEffect(', start);
  const expr = ANTI.slice(start, end);
  const guide = (state) => Function(...Object.keys(state), expr + '\nreturn _alloGuideOnScreen;')(...Object.values(state));
  const base = { hasSelectedRole: true, runTour: false, isHelpMode: false, showUDLGuide: false, isGateOpen: false, showWizard: false, isTeacherMode: true };

  it('is defined once, after the tour state it reads', () => {
    expect(start).toBeGreaterThan(ANTI.indexOf('const [runTour, setRunTour] = useState(false);'));
    expect(ANTI.indexOf('const _alloGuideOnScreen =', start + 10)).toBe(-1);
  });
  it('names each guide, and none when the screen is clear', () => {
    expect(guide(base)).toBeNull();
    expect(guide({ ...base, hasSelectedRole: false })).toBe('launch-pad');
    expect(guide({ ...base, runTour: true })).toBe('tour');
    expect(guide({ ...base, isHelpMode: true })).toBe('help-mode');
    expect(guide({ ...base, showUDLGuide: true })).toBe('ai-guide');
    expect(guide({ ...base, isGateOpen: true })).toBe('gate');
    expect(guide({ ...base, showWizard: true })).toBe('quick-start');
    expect(guide({ ...base, showWizard: true, isTeacherMode: false }), 'Quick Start opens only for teachers').toBeNull();
  });
  it('the Help tip waits while a guide is up, stays out of Guided Mode, and hides if a guide opens', () => {
    const tipStart = ANTI.indexOf('useEffect(', start);
    const tip = ANTI.slice(tipStart, ANTI.indexOf('}, [_alloGuideOnScreen, guidedMode]);', tipStart));
    expect(tip).toContain('if (_alloGuideOnScreen || guidedMode) { setShowHelpOnboarding(false); return undefined; }');
    expect(tip).toContain("safeSetItem('allo_help_onboarded', 'true')");
    // The old copy that checked only the role and the gate is gone.
    expect(ANTI).not.toContain('}, [hasSelectedRole, isGateOpen]);');
  });
  it('the AlloBot intro waits for a clear screen and for the Help tip', () => {
    expect(ANTI).toContain('canPlayIntro={canPlayBotIntro && isBotVisible && hasSelectedRole && !guidedMode && !_alloGuideOnScreen && _alloHelpTipSettled}');
    // The tip has had its turn: not showing now, and shown at least once (on this visit or an earlier one).
    expect(ANTI).toContain("const _alloHelpTipSettled = !showHelpOnboarding && safeGetItem('allo_help_onboarded') === 'true';");
  });
  it('Quick Start waits while the tour runs, and continues into Guided Mode only for teachers who can use it', () => {
    const at = ANTI.indexOf('<QuickStartWizard');
    const wiz = ANTI.slice(at, ANTI.indexOf('/>', at));
    expect(wiz).toContain('isOpen={showWizard && hasSelectedRole && isTeacherMode && !isGateOpen && !runTour}');
    expect(wiz).toContain('canContinueGuided={isTeacherMode && !isParentMode && !isIndependentMode && !isSpecialistMode}');
    expect(wiz).toContain("if (data && data.continueIn === 'guided' && isTeacherMode && !isParentMode && !isIndependentMode && !isSpecialistMode) { resetGuidedProgress(); setGuidedMode(true); }");
  });
});

describe("Quick Start's last step", () => {
  const MODULES_DIR = resolve(process.cwd(), 'desktop/web-app/node_modules');
  const T = { 'common.next': 'Next', 'common.finish': 'Finish', 'launch_pad.guided_title': 'Guided Mode', 'launch_pad.teacher_full_link': 'Open the full workspace instead' };
  let React, ReactDOMClient, act, Wizard, root, host;
  beforeAll(() => {
    React = require(resolve(MODULES_DIR, 'react'));
    ReactDOMClient = require(resolve(MODULES_DIR, 'react-dom/client'));
    ({ act } = require(resolve(MODULES_DIR, 'react-dom/test-utils')));
    global.React = window.React = React;
    window.AlloLanguageContext = React.createContext({ t: (k) => T[k] || k });
    if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
    if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
    loadAlloModule('quickstart_module.js');
    Wizard = window.AlloModules.QuickStartWizard;
  });
  afterEach(() => {
    if (root) { try { act(() => root.unmount()); } catch (_) {} root = null; }
    if (host) { host.remove(); host = null; }
  });
  const flush = async () => { await act(async () => { await Promise.resolve(); }); };
  const byText = (text) => Array.from(host.querySelectorAll('button')).find((b) => (b.textContent || '').includes(text));
  const click = (el) => { expect(el, 'missing control').toBeTruthy(); act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); }); };
  const setValue = (el, value) => act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(el, value);
    el.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
  // Walks to the last step with a pasted passage (the shortest route).
  async function toLastStep(extra) {
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    const completed = [];
    await act(async () => {
      root.render(React.createElement(Wizard, { isOpen: true, onClose: () => {}, onComplete: (d) => completed.push(d), onUpload: () => {},
        onLookupStandards: null, onCallGemini: () => Promise.resolve(''), onWebSearch: null, addToast: () => {}, isParentMode: false,
        isIndependentMode: false, isHelpMode: false, setIsHelpMode: () => {}, ...extra }));
    });
    await flush();
    click(byText('Next'));
    await flush();
    click(host.querySelector('[data-help-key="wizard_paste_source"]'));
    setValue(host.querySelector('#wizard-paste-text'), 'Rain falls on the hills. Rivers carry it to the sea.');
    click(host.querySelector('[data-help-key="wizard_paste_next"]'));
    await flush();
    return completed;
  }

  it('offers Guided Mode first and the full workspace as the other way', async () => {
    const completed = await toLastStep({ canContinueGuided: true });
    const guided = host.querySelector('[data-help-key="wizard_complete_btn"]');
    const workspace = host.querySelector('[data-help-key="wizard_complete_workspace_btn"]');
    expect(guided.textContent).toContain('Guided Mode');
    expect(workspace.textContent).toBe('Open the full workspace instead');
    click(guided);
    expect(completed[0]).toMatchObject({ sourceMode: 'paste', continueIn: 'guided' });
  });
  it('the full workspace keeps the same set-up and says so', async () => {
    const completed = await toLastStep({ canContinueGuided: true });
    click(host.querySelector('[data-help-key="wizard_complete_workspace_btn"]'));
    expect(completed[0]).toMatchObject({ sourceMode: 'paste', continueIn: 'workspace' });
  });
  it('without Guided Mode (family, independent, specialist) it is the one Finish button as before', async () => {
    const completed = await toLastStep({});
    expect(host.querySelector('[data-help-key="wizard_complete_workspace_btn"]')).toBeNull();
    click(byText('Finish'));
    expect(completed[0].continueIn).toBeUndefined();
  });
});
