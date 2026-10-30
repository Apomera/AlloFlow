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
let calls, toasts;
function makeHandler(isHelpMode) {
  return new Function('handleToggleIsHelpMode', 'isHelpMode', 'isSpotlightMode', 'setIsSpotlightMode', 'addToast', 't', 'setIsHelpMode',
    handlerBody + '\nreturn onHelpKeyDown;')(() => calls.push('toggle'), isHelpMode, false, () => calls.push('spotlight'),
    (message, type, options) => toasts.push({ message, type, options }), (k) => k, (v) => calls.push('helpMode:' + v));
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
  beforeEach(() => { calls = []; toasts = []; window.__alloHelpKeyNoticeShown = true; localStorage.clear(); document.body.innerHTML = '<main id="m"><input id="i"></main>'; });

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

// Speech input or a stray key can turn Help Mode on by accident, and the off switch
// lives in Text settings, where nobody looks for a keyboard setting (10-29).
describe('the first "?" of a session offers the off switch', () => {
  beforeEach(() => { calls = []; toasts = []; delete window.__alloHelpKeyNoticeShown; localStorage.clear(); });

  it('shows one notice with a working "Turn off this shortcut" action, once per session', () => {
    press(makeHandler(false), '?');
    expect(toasts).toHaveLength(1);
    expect(toasts[0].message).toBe('help_mode.shortcut_notice');
    expect(toasts[0].options.action.label).toBe('help_mode.shortcut_turn_off');
    const heard = [];
    const listen = (e) => heard.push(e.detail.enabled);
    window.addEventListener('alloflow:single-key-shortcuts-changed', listen);
    try { toasts[0].options.action.onClick(); } finally { window.removeEventListener('alloflow:single-key-shortcuts-changed', listen); }
    expect(localStorage.getItem('allo_single_key_shortcuts')).toBe('off');
    expect(heard, 'the header switch hears it').toEqual([false]);
    expect(calls).toContain('helpMode:false');
    expect(toasts[1]).toMatchObject({ message: 'help_mode.shortcut_off', type: 'success' });
    localStorage.clear(); toasts = [];
    press(makeHandler(false), '?');
    expect(toasts, 'not again this session').toEqual([]);
  });

  it('says nothing when "?" turns Help Mode off', () => {
    press(makeHandler(true), '?');
    expect(calls).toEqual(['toggle']);
    expect(toasts).toEqual([]);
  });

  it('the header switch follows the notice', () => {
    const block = sliceBetween(headerModule, 'const sync = (e) => {', '}, []);', { file: 'view_header_module.js', includeEnd: true });
    let state = true, listener = null;
    const fakeWindow = { addEventListener: (name, fn) => { if (name === 'alloflow:single-key-shortcuts-changed') listener = fn; }, removeEventListener() {} };
    new Function('window', 'setSingleKeyShortcuts', block.replace(/\}, \[\]\);$/, ''))(fakeWindow, (v) => { state = v; });
    expect(typeof listener).toBe('function');
    listener({ detail: { enabled: false } });
    expect(state).toBe(false);
    listener({ detail: { enabled: 'nope' } });
    expect(state, 'ignores a malformed event').toBe(false);
  });
});
