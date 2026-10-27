// @vitest-environment jsdom
// WCAG 2.1.4 Character Key Shortcuts: the page-wide "?" help-mode shortcut can be turned
// off in Text settings ("Single-key shortcuts"). The setting is a per-device preference
// (localStorage allo_single_key_shortcuts = 'off'); the host reads it at keydown time.
// Help Mode stays reachable through the toolbar button either way.
// ANTI_CANDIDATE=<path> runs the host checks against a scratch copy (mutation checks).
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sliceBetween } from './helpers/anchored_slice.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(file === 'AlloFlowANTI.txt' && process.env.ANTI_CANDIDATE ? process.env.ANTI_CANDIDATE : path.join(ROOT, file), 'utf8');
const sliceFile = (file, start, end) => sliceBetween(read(file), start, end, { file });

// The real host handler, built against stubs for the help-mode state it closes over.
const handlerBody = sliceFile('AlloFlowANTI.txt', 'const onHelpKeyDown = (e) => {', "document.addEventListener('keydown', onHelpKeyDown, true);");
let calls;
function makeHandler(isHelpMode) {
  return new Function('handleToggleIsHelpMode', 'isHelpMode', 'isSpotlightMode', 'setIsSpotlightMode',
    handlerBody + '\nreturn onHelpKeyDown;')(() => calls.push('toggle'), isHelpMode, false, () => calls.push('spotlight'));
}
function press(handler, key, target = document.body, init = {}) {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  Object.defineProperty(e, 'target', { value: target });
  handler(e);
  return e;
}

// The header's real preference state + toggle, run with a minimal hook stub.
const headerModule = readFileSync(path.join(ROOT, 'view_header_module.js'), 'utf8');
const prefBlock = sliceBetween(headerModule, 'const [singleKeyShortcuts, setSingleKeyShortcuts] = React.useState(', '}, []);',
  { file: 'view_header_module.js', includeEnd: true });
function mountPreference() {
  let state;
  const React = {
    useState(init) {
      state = typeof init === 'function' ? init() : init;
      return [undefined, (upd) => { state = typeof upd === 'function' ? upd(state) : upd; }];
    },
    useCallback: (fn) => fn,
  };
  const toggle = new Function('React', prefBlock + '\nreturn toggleSingleKeyShortcuts;')(React);
  return { toggle, get on() { return state; } };
}

describe('"?" help shortcut respects the Single-key shortcuts setting', () => {
  beforeEach(() => { calls = []; localStorage.clear(); document.body.innerHTML = '<main id="m"><input id="i"></main>'; });

  it('is on by default: "?" toggles Help Mode', () => {
    const e = press(makeHandler(false), '?');
    expect(calls).toEqual(['toggle']);
    expect(e.defaultPrevented).toBe(true);
  });

  it('does nothing when the setting is off, and leaves the key to the page', () => {
    localStorage.setItem('allo_single_key_shortcuts', 'off');
    const e = press(makeHandler(false), '?');
    expect(calls).toEqual([]);
    expect(e.defaultPrevented).toBe(false);
  });

  it('still lets Escape leave Help Mode when single-key shortcuts are off', () => {
    localStorage.setItem('allo_single_key_shortcuts', 'off');
    press(makeHandler(true), 'Escape');
    expect(calls).toEqual(['toggle']);
  });

  it('the header switch writes the preference the host reads, and back again', () => {
    const pref = mountPreference();
    expect(pref.on).toBe(true);
    pref.toggle();
    expect(pref.on).toBe(false);
    expect(localStorage.getItem('allo_single_key_shortcuts')).toBe('off');
    press(makeHandler(false), '?');
    expect(calls).toEqual([]);
    pref.toggle();
    expect(pref.on).toBe(true);
    expect(localStorage.getItem('allo_single_key_shortcuts')).toBe(null);
    press(makeHandler(false), '?');
    expect(calls).toEqual(['toggle']);
  });

  it('a stored "off" survives a reload of the header', () => {
    localStorage.setItem('allo_single_key_shortcuts', 'off');
    expect(mountPreference().on).toBe(false);
  });
});

describe('Help Mode stays reachable without the shortcut', () => {
  const source = readFileSync(path.join(ROOT, 'view_header_source.jsx'), 'utf8');

  it('keeps the toolbar Help Mode button wired straight to the toggle, not gated by the setting', () => {
    const region = sliceBetween(source, '<div className="relative">\n                        <button type="button"\n                            data-help-ignore="true"', '</button>',
      { file: 'view_header_source.jsx', label: 'toolbar Help Mode button' });
    expect(region).toContain('onClick={handleToggleIsHelpMode}');
    expect(region).toContain("aria-label={isHelpMode ? t('help_mode.deactivate') : t('help_mode.activate')}");
    expect(region).not.toContain('singleKeyShortcuts');
    expect(headerModule).toContain('onClick: handleToggleIsHelpMode');
  });

  it('offers the setting as a named switch in the Text settings dialog', () => {
    const dialog = sliceFile('view_header_source.jsx', 'aria-labelledby="header-text-settings-title"', '{showVoiceSettings && _headerPortal(');
    expect(dialog).toContain('role="switch"');
    expect(dialog).toContain('aria-checked={singleKeyShortcuts}');
    expect(dialog).toContain('onClick={toggleSingleKeyShortcuts}');
    expect(dialog).toContain("t('settings.text.single_key_shortcuts')");
    expect(dialog).toContain('aria-describedby="header-single-key-shortcuts-desc"');
    expect(dialog).toContain("t('settings.text.single_key_shortcuts_sub')");
  });
});
