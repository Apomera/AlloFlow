import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = path.join(process.cwd(), 'stem_lab', 'stem_tool_fisherlab.js');
const publicPath = path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_fisherlab.js');

describe('Fisher Lab active panel accessibility', () => {
  it('keeps source and public mirrors identical', () => {
    expect(fs.readFileSync(sourcePath, 'utf8')).toBe(fs.readFileSync(publicPath, 'utf8'));
  }, 15000);

  it('labels and focuses the active panel from the selected section tab', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("'aria-controls': 'fl-active-panel'");
    expect(source).toContain("'aria-labelledby': 'fl-tab-' + tab");
    expect(source).toContain('id: \'fl-active-panel\'');
    expect(source).toContain("role: 'tabpanel'");
    expect(source).toContain('tabIndex: 0');
    expect(source).toContain("'aria-label': 'Species ranking hypothesis'");
  });

  it('keeps selected-region scope visible inside every non-Maine section', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const main = source.slice(source.indexOf('// ─── Main render'), source.indexOf("tab === 'home' ? homeTab()"));

    expect(main).toContain('var activeSectionScope = getCoreSectionScope(tab, region)');
    expect(main).toContain("activeSectionScope.visible ? h('aside'");
    expect(main).toContain("role: 'note'");
    expect(main).toContain("'data-fisherlab-section-scope': activeSectionScope.scope");
    expect(main).toContain("'data-fisherlab-selected-region': activeSectionScope.region");
    expect(main).toContain("'aria-labelledby': 'fl-section-scope-title'");
    expect(main).toContain('activeSectionScope.message');
    expect(source).toContain("{ id: 'regs', label: '📜 Regional Regs' }");
    expect(source).not.toContain("label: '📜 DMR Regs'");
  });

  it('labels the regulations provenance note and opens official sources securely', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const regs = source.slice(source.indexOf('function regsTab()'), source.indexOf('// ─── LICENSE LADDER tab'));

    expect(regs).toContain("'data-fisherlab-regulation-provenance': regulationProvenance.status");
    expect(regs).toContain("'data-fisherlab-regulation-reviewed-on': regulationProvenance.reviewedOn");
    expect(regs).toContain("'aria-labelledby': 'fl-regulation-source-title'");
    expect(regs).toContain("target: '_blank'");
    expect(regs).toContain("rel: 'noopener noreferrer'");
    expect(regs).toContain("'aria-label': 'Open current fishing regulations from ' + regulationProvenance.authority + ' in a new tab'");
  });

  it('uses the regional gear action in both pointer and keyboard controls', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const sim = source.slice(source.indexOf('function simTab()'), source.indexOf('function headingToCompass'));

    expect(sim).toContain('var trapActionLabel = getCoreTrapActionLabel(region)');
    expect(sim).toContain("trapActionLabel + ' (H)'");
    expect(sim).toContain("d: trapActionLabel + ' (near buoy)'");
    expect(sim).not.toContain('🦞 Haul Trap (H)');
    expect(sim).not.toContain("d: 'Haul lobster trap (near buoy)'");
  });

  it('contains keyboard focus inside every simulator dialog with one shared handler', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const sim = source.slice(source.indexOf('function simTab()'), source.indexOf('function chartTab()'));
    const handler = source.slice(
      source.indexOf('function handleSimulatorDialogKeyDown'),
      source.indexOf('function recordObservation')
    );
    const dialogTitles = [
      'fl-fishing-title',
      'fl-traffic-title',
      'fl-fish-inspection-title',
      'fl-debrief-title',
      'fl-shellfish-inspection-title'
    ];

    expect(source).toContain('function containCoreDialogFocus');
    expect(handler).toContain('containCoreDialogFocus(e)');
    expect(source).not.toContain('handleFishingDialogKeyDown');
    expect(sim.match(/onKeyDown: handleSimulatorDialogKeyDown/g) || []).toHaveLength(5);

    dialogTitles.forEach((titleId) => {
      const label = "'aria-labelledby': '" + titleId + "'";
      const labelAt = sim.indexOf(label);
      const roleAt = labelAt < 0 ? -1 : sim.lastIndexOf("role: 'dialog'", labelAt);
      const dialogRoot = labelAt < 0 || roleAt < 0
        ? ''
        : sim.slice(Math.max(0, roleAt - 180), labelAt + label.length + 220);

      expect(labelAt).toBeGreaterThan(-1);
      expect(roleAt).toBeGreaterThan(-1);
      expect(labelAt - roleAt).toBeLessThan(220);
      expect(dialogRoot).toContain('tabIndex: -1');
      expect(dialogRoot).toContain('onKeyDown: handleSimulatorDialogKeyDown');
    });
  });

  it('publishes toolbar height before observing and falls back to window resize events', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const resizeEffect = source.slice(
      source.indexOf('// The control bar wraps'),
      source.indexOf('function simIsNativelyFullscreen()')
    );
    const initialPushAt = resizeEffect.indexOf('push();');
    const observerCheckAt = resizeEffect.indexOf("if (typeof ResizeObserver !== 'undefined')");

    expect(source).toContain('function publishCoreToolbarHeight');
    expect(resizeEffect).toContain('publishCoreToolbarHeight(bar, stage)');
    expect(initialPushAt).toBeGreaterThan(-1);
    expect(observerCheckAt).toBeGreaterThan(initialPushAt);
    expect(resizeEffect).toContain("window.addEventListener('resize', push)");
    expect(resizeEffect).toContain("window.removeEventListener('resize', push)");
    expect(resizeEffect).toContain('ro.disconnect()');
  });

  it('focuses simulator elements and refs without scrolling, with a safe fallback', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_fisherlab.js', 'fisherLab');
    const { focusCoreElement } = window.__FisherLabCore;
    const direct = { focus: vi.fn() };
    const fallback = {
      focus: vi.fn((options) => {
        if (options) throw new Error('preventScroll unsupported');
      })
    };

    expect(focusCoreElement).toBeTypeOf('function');
    expect(focusCoreElement(direct)).toBe(true);
    expect(direct.focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(focusCoreElement({ current: fallback })).toBe(true);
    expect(fallback.focus).toHaveBeenNthCalledWith(1, { preventScroll: true });
    expect(fallback.focus).toHaveBeenNthCalledWith(2);
    expect(focusCoreElement(null)).toBe(false);
    expect(focusCoreElement({ current: null })).toBe(false);
  });

  it('restores the simulator launcher after every simulator exit', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const refs = source.slice(source.indexOf('var canvasRef = useRef(null)'), source.indexOf('var expandHook = useState(false)'));
    const stop = source.slice(source.indexOf('function stopSim()'), source.indexOf('var activeSimRegionRef = useRef(region)'));
    const sim = source.slice(source.indexOf('function simTab()'), source.indexOf('function chartTab()'));

    expect(refs).toContain('var simLaunchRef = useRef(null)');
    expect(sim.split('ref: savedVoyageCheckpoint ? null : simLaunchRef').length - 1).toBe(2);
    expect(source).toContain('onClick: resumeSavedVoyage');
    expect(stop).toContain('setTimeout(function()');
    expect(stop).toContain('focusCoreElement(simLaunchRef)');
    expect(stop.indexOf('setSim(')).toBeLessThan(stop.indexOf('focusCoreElement(simLaunchRef)'));
  });

  it('restores canvas focus after traffic decisions without masking the result announcement', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const sim = source.slice(source.indexOf('function simTab()'), source.indexOf('function chartTab()'));
    const resolverAt = source.indexOf('function resolveSimulatorTrafficChoice(action)');
    const resolverEnd = source.indexOf('\n    function ', resolverAt + 1);
    const resolver = resolverAt < 0 ? '' : source.slice(resolverAt, resolverEnd);
    const traffic = sim.slice(
      sim.indexOf("activeTraffic ? h('section'"),
      sim.indexOf('activeFish ? (function()')
    );
    const canvas = sim.slice(
      sim.indexOf("h('canvas', { ref: canvasRef"),
      sim.indexOf('// Names the rig on the scene itself')
    );
    const clearAt = resolver.indexOf('setActiveTraffic(null)');
    const queueAt = resolver.indexOf('setTimeout(function()');
    const focusAt = resolver.indexOf('focusCoreElement(canvasRef)');

    expect(resolverAt).toBeGreaterThan(-1);
    expect(resolver).toContain('harborRef.current.resolveTrafficEncounter(action)');
    expect(clearAt).toBeGreaterThan(-1);
    expect(queueAt).toBeGreaterThan(clearAt);
    expect(focusAt).toBeGreaterThan(queueAt);
    expect(traffic.match(/resolveSimulatorTrafficChoice\(/g) || []).toHaveLength(2);
    expect(canvas).toContain("'aria-label': 'Interactive 3D harbor");
    expect(canvas).not.toContain('onFocus:');
    expect(canvas).not.toContain("flAnnounce('Harbor controls active.");
  });

  it('keeps the traffic overlay and decision card reachable in short simulator stages', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const sim = source.slice(source.indexOf('function simTab()'), source.indexOf('function chartTab()'));
    const traffic = sim.slice(
      sim.indexOf("activeTraffic ? h('section'"),
      sim.indexOf('activeFish ? (function()')
    );
    const cardAt = traffic.indexOf("h('div', { style: { width: 'min(590px,100%)'");
    const overlay = cardAt < 0 ? '' : traffic.slice(0, cardAt);
    const card = cardAt < 0 ? '' : traffic.slice(cardAt, cardAt + 420);

    expect(cardAt).toBeGreaterThan(-1);
    expect(overlay).toContain("overflowY: 'auto'");
    expect(card).toContain("maxHeight: 'calc(100% - 24px)'");
    expect(card).toContain("overflowY: 'auto'");
  });

  it('exports the one-shot repeat-key policy and applies it before simulator shortcuts', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_fisherlab.js', 'fisherLab');
    const { shouldIgnoreCoreRepeatedKey } = window.__FisherLabCore;
    const oneShotKeys = ['p', 'P', 'Escape', 'h', 'b', 'f', 'v', 'm', '1', '2', '3'];

    expect(shouldIgnoreCoreRepeatedKey).toBeTypeOf('function');
    oneShotKeys.forEach((key) => expect(shouldIgnoreCoreRepeatedKey(key, true)).toBe(true));
    expect(shouldIgnoreCoreRepeatedKey('ArrowUp', true)).toBe(false);
    expect(shouldIgnoreCoreRepeatedKey(' ', true)).toBe(false);
    expect(shouldIgnoreCoreRepeatedKey('p', false)).toBe(false);

    const source = fs.readFileSync(sourcePath, 'utf8');
    const onKeyDown = source.slice(source.indexOf('function onKeyDown(e)'), source.indexOf('function onKeyUp(e)'));
    const repeatGuardAt = onKeyDown.indexOf('shouldIgnoreCoreRepeatedKey(pressedKey, e.repeat)');
    const keyStateAt = onKeyDown.indexOf('keys[pressedKey] = true');

    expect(onKeyDown).toContain("var pressedKey = String(e.key || '').toLowerCase()");
    expect(repeatGuardAt).toBeGreaterThan(-1);
    expect(keyStateAt).toBeGreaterThan(repeatGuardAt);
    expect(onKeyDown).toContain('e.preventDefault();');
  });

  it('gives every held helm control pointer, keyboard, assistive-tech, and blur release parity', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const sim = source.slice(source.indexOf('function simTab()'), source.indexOf('function headingToCompass'));
    const handlers = sim.slice(sim.indexOf('function setHeldControl'), sim.indexOf('function toggleSimulatorPause'));
    const touch = sim.slice(
      sim.indexOf("h('div', { className: 'fl-sim-touch'"),
      sim.indexOf('activeFishing ? (function()')
    );
    const controlDefinitions = touch.slice(touch.indexOf('['), touch.indexOf('].map(function(control)'));

    expect((controlDefinitions.match(/\{ key:/g) || [])).toHaveLength(5);
    expect(controlDefinitions).toContain("{ key: 'arrowleft', label: 'Turn port'");
    expect(controlDefinitions).toContain("{ key: 'arrowup', label: 'Throttle forward'");
    expect(controlDefinitions).toContain("{ key: ' ', label: 'Throttle boost'");
    expect(controlDefinitions).toContain("{ key: 'arrowdown', label: 'Reduce speed or reverse'");
    expect(controlDefinitions).toContain("{ key: 'arrowright', label: 'Turn starboard'");

    expect(handlers).toContain('target.setPointerCapture(event.pointerId)');
    expect(handlers).toContain('target.releasePointerCapture(event.pointerId)');
    expect(handlers).toContain("event.key !== ' ' && event.key !== 'Enter'");
    expect(handlers.match(/event\.preventDefault\(\)/g) || []).toHaveLength(3);
    expect(handlers).toContain('if (event.repeat) return');
    expect(handlers).toContain('event.detail !== 0');
    expect(handlers).toContain('heldControlPulseTimersRef.current[key] = setTimeout(function()');
    expect(handlers).toContain('releaseHeldControl(key)');

    expect(touch).toContain('onPointerDown: function(e) { handleHeldControlPointerDown(control.key, e); }');
    expect(touch).toContain('onPointerUp: function(e) { handleHeldControlPointerUp(control.key, e); }');
    expect(touch).toContain('onPointerCancel: function(e) { handleHeldControlPointerUp(control.key, e); }');
    expect(touch).toContain('onLostPointerCapture: function() { releaseHeldControl(control.key); }');
    expect(touch).toContain('onKeyDown: function(e) { handleHeldControlKeyDown(control.key, e); }');
    expect(touch).toContain('onKeyUp: function(e) { handleHeldControlKeyUp(control.key, e); }');
    expect(touch).toContain('onClick: function(e) { handleHeldControlClick(control.key, e); }');
    expect(touch).toContain('onBlur: function() { releaseHeldControl(control.key);');
    expect(touch).toContain("touchAction: 'none'");
  });

  it('returns focus to the simulator canvas when the toolbar resumes a voyage', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const sim = source.slice(source.indexOf('function simTab()'), source.indexOf('function headingToCompass'));
    const toggle = sim.slice(sim.indexOf('function toggleSimulatorPause()'), sim.indexOf('function restartCoreMission()'));
    const resumeBranchAt = toggle.indexOf('if (!nextPaused)');
    const queueAt = toggle.indexOf('setTimeout(function()');
    const focusAt = toggle.indexOf('focusCoreElement(canvasRef)');

    expect(toggle).toContain('var nextPaused = !hud.paused');
    expect(toggle).toContain('harborRef.current.setPaused(nextPaused)');
    expect(resumeBranchAt).toBeGreaterThan(-1);
    expect(queueAt).toBeGreaterThan(resumeBranchAt);
    expect(focusAt).toBeGreaterThan(queueAt);
    expect(sim).toContain("'aria-pressed': !!hud.paused, disabled: graphicsContextLost");
    expect(sim).toContain('onClick: toggleSimulatorPause');
    expect(sim).toContain("'aria-describedby': 'fl-graphics-recovery-detail'");
    expect(sim).toContain('onClick: restartSimulatorGraphics');
  });

  it('exposes saved motion, caption, and text preferences in the active lab UI', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const bar = source.slice(source.indexOf('function accessibilityBar()'), source.indexOf('var TABS = ['));
    const sim = source.slice(source.indexOf('function simTab()'), source.indexOf('function headingToCompass'));
    const captions = sim.slice(
      sim.indexOf("h('div', { className: 'fl-sim-log'"),
      sim.indexOf("h('div', { className: 'fl-sim-touch'")
    );
    const root = source.slice(source.indexOf('var activeTabEntry = TABS.find'), source.indexOf("tab === 'home' ? homeTab()"));

    expect(bar).toContain("className: 'fl-accessibility-controls'");
    expect(bar).toContain("'aria-label': 'Accessibility preferences'");
    expect(bar).toContain("{ key: 'staticCamera', label: 'Reduced scene motion'");
    expect(bar).toContain("{ key: 'captionMode', label: 'Expanded captions'");
    expect(bar).toContain("{ key: 'largeText', label: 'Large text'");
    expect(bar).toContain("'aria-pressed': selected");
    expect(bar).toContain("var locked = option.key === 'staticCamera' && sim.active");

    expect(root).toContain("className: 'fl-fisherlab-root' + (accessibilityPreferences.largeText ? ' fl-large-text' : '')");
    expect(root).toContain("'data-caption-mode': accessibilityPreferences.captionMode ? 'true' : 'false'");
    expect(root).toContain("'data-static-camera': accessibilityPreferences.staticCamera ? 'true' : 'false'");
    expect(root).toContain('accessibilityBar()');
    expect(source).toContain('.fl-fisherlab-root.fl-large-text button');

    expect(captions).toContain("'data-expanded-captions': accessibilityPreferences.captionMode ? 'true' : 'false'");
    expect(captions).toContain('maxHeight: accessibilityPreferences.captionMode ? 180 : 100');
    expect(captions).toContain('(status || []).slice(accessibilityPreferences.captionMode ? -8 : -4)');
  });
});
