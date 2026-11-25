import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const { CONFIGS, buildFirstWaveModule } = require('../_build_first_wave_view_modules.js');

// Third cold-path wave (2026-11-17, dev-tools/extract_third_wave_cdn_views.cjs): six screens that open only on
// request left the startup host for one CDN module, view_cold_path_screens_module.js. First batch: the Gemini
// bridge view, the saved math assessment view, the adventure cast lobby call and the "save artwork as a visual
// support" dialog. Second batch: the Teach live and Translate dialogs, which took their focus trap with them.
// Same contract as the first two waves (tests/second_wave_cdn_extraction.test.js): a `_alloCreateFirstWaveCdnView`
// shim per component, the module pinned by content hash, and the committed artifacts are exactly what the builder
// makes from the committed source. New here: each moved screen is drawn, with real React, from the built module.
const HOST = 'AlloFlowANTI.txt';
const KEY = 'ColdPathScreens';
const SOURCE = 'view_cold_path_screens_source.jsx';
const MODULE = 'view_cold_path_screens_module.js';
const LOADER = '__alloLazyColdPathScreens';
const EXPORTS = ['GeminiBridgeView', 'SavedMathAssessmentView', 'AdventureCastLobbyView', 'StemArtworkHandoffView', 'SessionStartOptionsView', 'TranslateModalView'];
const host = readFileSync(HOST, 'utf8');
const source = readFileSync(SOURCE, 'utf8');

describe('third-wave CDN extraction', () => {
  it('renders every moved screen through a host shim pinned to the module content hash', () => {
    const version = createHash('sha256').update(readFileSync(MODULE)).digest('hex').slice(0, 8);
    expect(host).toContain(`${MODULE}?v=${version}`);
    expect(host).toContain(`window.${LOADER} = `);
    expect(host.match(new RegExp(`loadModule\\('${KEY}'`, 'g'))).toHaveLength(1);
    for (const component of EXPORTS) {
      expect(host.match(new RegExp(`<${component}\\n`, 'g')), component).toHaveLength(1);
      expect(host).toContain(`const ${component} = _alloCreateFirstWaveCdnView('${component}', '${LOADER}',`);
      expect(source).toContain(`function ${component}(props)`);
    }
    // The host hands each screen exactly the names the screen reads: none missing (it would be undefined in the
    // screen), none extra.
    const names = (text) => text.split(',').map((name) => name.trim()).filter(Boolean).sort();
    for (const component of EXPORTS) {
      const call = host.slice(host.indexOf(`<${component}\n`), host.indexOf('/>', host.indexOf(`<${component}\n`)));
      const reads = source.slice(source.indexOf(`function ${component}(props)`));
      const handed = names(/\{\.\.\.\{([\s\S]*?)\}\}/.exec(call)[1]);
      expect(handed.length, component).toBeGreaterThan(0);
      // A screen may also read a prop directly (props.t, props.addToast); those count as reads too.
      // onTrapEscape is handed as its own attribute (checked below), not through the spread.
      const body = reads.slice(0, reads.indexOf('\n}\n'));
      const direct = [...body.matchAll(/\bprops\.([A-Za-z_$][\w$]*)/g)].map((m) => m[1]).filter((n) => n !== 'onTrapEscape');
      const wanted = [...new Set([...names(/const \{([\s\S]*?)\} = props;/.exec(reads)[1]), ...direct])].sort();
      expect(handed, component).toEqual(wanted);
    }
    // The inline copies are gone: each screen's distinctive marker now lives only in its source.
    for (const marker of ['<Terminal size={18} aria-hidden="true" />', 'id="saved-math-assessment-title"', 'onAddCharacter={(newChar)', 'id="stem-artwork-handoff-title"', "t('share_collect.start_live_session')", 'id="header-translate-dialog-title"']) {
      expect(host, marker).not.toContain(marker);
      expect(source, marker).toContain(marker);
    }
    // The gates stay in the host, so a screen is asked for only when it is shown.
    expect(host).toContain("{activeView === 'stem-assessment' && <SavedMathAssessmentView");
    expect(host).toContain('{stemArtworkHandoff && <StemArtworkHandoffView');
    expect(host).toContain("{activeView === 'gemini-bridge' && generatedContent && (");
    expect(host).toContain('{adventureState.isReviewingCharacters && adventureState.characters.length > 0 && (');
    expect(host).toContain('{showSessionStartOptions && (\n        <SessionStartOptionsView\n');
    expect(host).toContain('{isTranslateModalOpen && <TranslateModalView\n');
    // A dialog can be closed while its module is still loading.
    expect(host).toContain('__alloOnClose={() => setStemArtworkHandoff(null)}');
    expect(host).toContain('__alloOnClose={() => setShowSessionStartOptions(false)}');
    expect(host).toContain('__alloOnClose={() => setIsTranslateModalOpen(false)}');
  });

  it('rebuilds byte-identical CDN artifacts in all four copies', () => {
    const build = readFileSync('build.js', 'utf8');
    const expected = buildFirstWaveModule(KEY, source);
    for (const dir of ['', 'desktop/web-app/public/', 'desktop/app-build/', 'desktop/web-app/build/']) {
      if (dir && !existsSync(dir)) continue;
      expect(readFileSync(dir + MODULE, 'utf8'), dir + MODULE).toBe(expected);
    }
    expect(CONFIGS[KEY].source).toBe(SOURCE);
    expect(CONFIGS[KEY].exports).toEqual(EXPORTS);
    expect(build).toContain(`'${MODULE}',`);
    expect(build).toContain(`filename: '${MODULE}'`);
    expect(build).toContain(`buildFirstWaveModule('${KEY}', src)`);
  });

  it('moves a focus trap only together with its dialog, and keeps the save dialog in the host', () => {
    // A trap's effect runs when its dialog opens; on the first opening a lazy view is not mounted yet, so a ref the
    // host owns would be empty and the dialog would have no trap. The tool refuses such a target unless the trap
    // goes with it: then the view makes the ref and calls the host's hook, and the host's two lines are deleted.
    const tool = readFileSync('dev-tools/extract_third_wave_cdn_views.cjs', 'utf8');
    expect(tool).toContain("throw new Error('Target takes a ref the host traps focus on (' + trapped.join(', ') + '); refusing: ' + spec.key);");
    expect(host).toContain('window.__alloHooks = { useFocusTrap };');
    for (const [ref, component, close] of [['sessionStartOptionsRef', 'SessionStartOptionsView', '() => setShowSessionStartOptions(false)'], ['translateModalRef', 'TranslateModalView', '() => setIsTranslateModalOpen(false)']]) {
      expect(host, ref).not.toContain(ref);
      const view = source.slice(source.indexOf('function ' + component + '(props) {'));
      // The trap (plus a body scroll lock) now goes through the shared _useColdPathDialogLock helper.
      const lockAt = view.indexOf('_useColdPathDialogLock(');
      expect(lockAt, ref).toBeGreaterThan(0);
      const head = view.slice(0, view.indexOf('\n', lockAt));
      // The hook is called on every render, before anything can return, with the dialog open for as long as it is mounted.
      expect(head, ref).toContain('  const ' + ref + ' = React.useRef(null);\n');
      expect(head, ref).toContain('  _useColdPathDialogLock(' + ref + ', props.onTrapEscape || ');
      expect(head, ref).not.toMatch(/\breturn\b/);
      expect(view.slice(0, view.indexOf('\n}\n')), ref).toContain('ref={' + ref + '}');
      expect(host, component).toContain('onTrapEscape={' + close + '}');
    }
    // ...and that helper calls the host's trap with the dialog open, the same hook count every render.
    const lock = source.slice(source.indexOf('function _useColdPathDialogLock(dialogRef, onEscape) {'));
    expect(lock.slice(0, lock.indexOf('\n}\n'))).toContain('window.__alloHooks.useFocusTrap\n    : null;');
    expect(lock.slice(0, lock.indexOf('\n}\n'))).toContain('    hostHook(dialogRef, true, onEscape);');
    // Saving a project has to work with no network, so its dialog is not lazy.
    expect(host).toMatch(/useFocusTrap\(\s*saveModalRef\b/);
    expect(host).toContain('ref={saveModalRef}');
    expect(source).not.toContain('saveModalRef');
  });
});

describe('the moved screens, drawn from the built module', () => {
  // The module as a browser would run it: its own window with React, nothing else.
  const trapCalls = [];
  const win = { React, AlloModules: {}, console: { log() {}, error() {} }, __alloHooks: { useFocusTrap: (ref, isOpen, onEscape) => { trapCalls.push({ ref, isOpen, onEscape }); } } };
  new Function('window', 'console', readFileSync(MODULE, 'utf8'))(win, win.console);
  const views = win.AlloModules;
  const t = (key, params) => key + (params ? ':' + JSON.stringify(params) : '');
  const Icon = (name) => (props) => React.createElement('svg', { 'data-icon': name, width: props.size });
  const draw = (name, props) => ReactDOMServer.renderToStaticMarkup(React.createElement(views[name], props));

  it('registers the six screens', () => {
    for (const name of EXPORTS) expect(typeof views[name], name).toBe('function');
    expect(views[KEY]).toBe(views[EXPORTS[0]]);
  });

  it('Gemini bridge: every prompt step with its own copy button', () => {
    const copied = [];
    const html = draw('GeminiBridgeView', { Copy: Icon('copy'), Terminal: Icon('terminal'), copyToClipboard: (v) => copied.push(v), generatedContent: { data: ['First prompt', 'Second prompt'] }, t });
    expect(html).toContain('First prompt');
    expect(html).toContain('Second prompt');
    expect(html.match(/data-icon="copy"/g).length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('data-icon="terminal"');
    // One prompt that is not a list still draws.
    expect(draw('GeminiBridgeView', { Copy: Icon('copy'), Terminal: Icon('terminal'), copyToClipboard() {}, generatedContent: { data: 'Only prompt' }, t })).toContain('Only prompt');
  });

  it('saved math assessment: a plan and submitted results draw from the stored data, with no generation', () => {
    const base = { formatInlineText: (v) => v, isTeacherMode: true, openMathCreate() {}, setAssessmentBlocks() {}, setGradeLevel() {}, setLeveledTextLanguage() {}, setMathSubject() {}, setShowAssessmentBuilder() {}, t };
    const plan = draw('SavedMathAssessmentView', { ...base, generatedContent: { title: 'Fractions check', data: { blocks: [{ type: 'computation', title: 'Adding fractions' }] } } });
    expect(plan).toContain('id="saved-math-assessment-title"');
    expect(plan).toContain('Fractions check');
    expect(plan).toContain('Assessment plan');
    const results = draw('SavedMathAssessmentView', { ...base, generatedContent: { title: 'Fractions check', data: { results: [{ title: 'Adding fractions', score: 3, total: 4 }] } } });
    expect(results).toContain('Submitted assessment results');
    // Nothing stored: it still draws its heading rather than failing.
    expect(draw('SavedMathAssessmentView', { ...base, generatedContent: null })).toContain('id="saved-math-assessment-title"');
  });

  it('adventure cast lobby: the host component is called with the characters and its handlers', () => {
    let seen = null;
    const CastLobby = (props) => { seen = props; return React.createElement('div', { 'data-cast': props.characters.length }); };
    const html = draw('AdventureCastLobbyView', { CastLobby, adventureArtStyle: 'storybook', adventureCustomArtStyle: '', adventureState: { characters: [{ name: 'Ada' }, { name: 'Ben' }] },
      callGeminiImageEdit() {}, callImagen() {}, generateAdventureImage() {}, setAdventureState() {}, t, universalImageStyle: '', warnLog() {} });
    expect(html).toBe('<div data-cast="2"></div>');
    expect(seen.t).toBe(t);
    expect(typeof seen.onAddCharacter).toBe('function');
    for (const key of Object.keys(seen)) if (/^on[A-Z]/.test(key)) expect(typeof seen[key], key).toBe('function');
  });

  it('save artwork dialog: a labelled dialog with the artwork and the places it can go', () => {
    const calls = [];
    const html = draw('StemArtworkHandoffView', {
      _alloReadVisualSupportCollection: (name) => { calls.push(name); return name === 'alloSymbolBoards' ? [{ id: 'b1', title: 'Morning board' }] : [{ id: 's1', title: 'Monday' }]; },
      saveStemArtworkAsVisualSupport() {}, setStemArtworkDestination() {}, setStemArtworkHandoff() {}, setStemArtworkLabel() {},
      stemArtworkDestination: 'new-board', stemArtworkHandoff: { src: 'data:image/png;base64,AAAA', title: 'My drawing', sourceTab: 'Paint' }, stemArtworkLabel: 'My drawing' });
    expect(calls).toEqual(['alloSymbolBoards', 'alloSchedules']);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="stem-artwork-handoff-title"');
    expect(html).toContain('id="stem-artwork-handoff-title"');
    expect(html).toContain('Board: Morning board');
    expect(html).toContain('Schedule: Monday');
    expect(html).toContain('alt="My drawing"');
  });

  it('teach live dialog: three ways to start, and it asks the host for a focus trap', () => {
    trapCalls.length = 0;
    const onTrapEscape = () => {};
    const html = draw('SessionStartOptionsView', { X: Icon('x'), setMbPanelOpen() {}, setShowLiveLessonPrep() {}, setShowSessionStartOptions() {}, startClassSession() {}, t: () => '', onTrapEscape });
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="Teach live"');
    for (const words of ['Prepare live lesson', 'Standard live session', 'Class Mailbox QR session']) expect(html).toContain(words);
    expect(html.match(/<button/g)).toHaveLength(4);
    expect(trapCalls).toHaveLength(1);
    expect(trapCalls[0].isOpen).toBe(true);
    expect(trapCalls[0].onEscape).toBe(onTrapEscape);
    expect(trapCalls[0].ref).toHaveProperty('current');
  });

  it('translate dialog: the language box, the companion choice and both actions', () => {
    trapCalls.length = 0;
    const base = { Languages: Icon('languages'), X: Icon('x'), _alloHostHandlersOptional: () => ({ getTranslationBatchItems: (kind) => (kind === 'pack' ? { items: [{ id: 1, type: 'glossary' }, { id: 2 }], kind: 'pack' } : { items: [{ id: 1 }] }) }),
      currentUiLanguage: 'English', generatedContent: { type: 'simplified' }, handleSetIsTranslateModalOpenToFalse() {}, handleTranslateAction() {}, headerTranslationMode: null, isProcessing: false,
      resolveTranslationPolicy: (mode, out, ui) => ({ enabled: true, target: ui, mode: mode || 'auto' }), selectedLanguages: ['Spanish', 'French'], setHeaderTranslationMode() {}, setTargetTranslationLang() {}, setTranslateScope() {}, t,
      targetTranslationLang: 'Spanish', translationMode: 'auto', translationTargetChoices: () => ['French'], onTrapEscape() {} };
    const html = draw('TranslateModalView', base);
    expect(html).toContain('aria-labelledby="header-translate-dialog-title"');
    expect(html).toContain('id="header-translate-target-language"');
    expect(html).toContain('value="Spanish"');
    expect(html).toContain('<option value="French">French</option>');
    expect(html).toContain('translate.action_pack:{&quot;count&quot;:2}');
    expect(html).toContain('translate.glossary_hint');
    expect(html).not.toMatch(/<button[^>]*disabled=""/);
    expect(trapCalls).toHaveLength(1);
    // The host handlers module may not have arrived yet: the dialog still draws, with nothing to translate.
    const early = draw('TranslateModalView', { ...base, _alloHostHandlersOptional: () => undefined, targetTranslationLang: '  ' });
    expect(early).toContain('translate.action_workspace:{&quot;count&quot;:0}');
    expect(early.match(/<button[^>]*disabled=""/g)).toHaveLength(2);
  });
});

describe('the two dialogs that own their focus trap, in a real DOM with the host hook', () => {
  // The host's own useFocusTrap, sliced from the host file, shared with modules as window.__alloHooks exactly as
  // the host shares it; the views come from the built module.
  let ReactDom, createRoot, act, root, box, views;
  const t = () => '';
  const Icon = () => null;
  beforeAll(() => {
    ReactDom = require(resolve('desktop/web-app/node_modules/react'));
    ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
    ({ act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils')));
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window.React = globalThis.React = ReactDom;
    const start = host.indexOf('const useFocusTrap = (ref, isOpen, onEscape) => {');
    const end = host.indexOf('\nwindow.__alloHooks = { useFocusTrap };', start);
    expect(start).toBeGreaterThan(-1); expect(end).toBeGreaterThan(start);
    window.__alloHooks = { useFocusTrap: new Function('React', 'const { useRef, useEffect } = React;\n' + host.slice(start, end) + '\nreturn useFocusTrap;')(ReactDom) };
    loadAlloModule(MODULE);
    views = window.AlloModules;
  });
  afterEach(() => { if (root) act(() => root.unmount()); root = null; if (box) box.remove(); box = null; window.__alloFocusTrapStack = []; });
  const key = (name, shiftKey = false) => { const event = new KeyboardEvent('keydown', { key: name, shiftKey, bubbles: true, cancelable: true }); document.dispatchEvent(event); return event; };
  // A page with a button that opens the dialog, as the app has; the dialog is mounted only while it is open.
  function mount(render) {
    const calls = { closed: 0 };
    function Page() {
      const [open, setOpen] = ReactDom.useState(false);
      const close = () => { calls.closed += 1; setOpen(false); };
      return ReactDom.createElement('div', null,
        ReactDom.createElement('button', { type: 'button', id: 'opener', onClick: () => setOpen(true) }, 'open'),
        open && render(close));
    }
    box = document.createElement('div'); document.body.appendChild(box); root = createRoot(box);
    act(() => root.render(ReactDom.createElement(Page)));
    const opener = box.querySelector('#opener');
    opener.focus();
    act(() => opener.click());
    return { calls, opener };
  }

  it('teach live: focus enters the dialog, Tab wraps inside it, Escape closes it and focus goes back', () => {
    const started = vi.fn();
    const { calls, opener } = mount((close) => ReactDom.createElement(views.SessionStartOptionsView, {
      X: Icon, setMbPanelOpen() {}, setShowLiveLessonPrep() {}, setShowSessionStartOptions: (value) => { if (value === false) close(); }, startClassSession: started, t, onTrapEscape: close,
    }));
    const dialog = box.querySelector('[role="dialog"][aria-modal="true"]');
    expect(dialog).toBeTruthy();
    const buttons = Array.from(dialog.querySelectorAll('button'));
    expect(buttons).toHaveLength(4);
    expect(document.activeElement).toBe(buttons[0]);
    expect(window.__alloFocusTrapStack).toHaveLength(1);
    // Tab on the last control goes to the first; Shift+Tab on the first goes to the last.
    buttons[3].focus();
    expect(key('Tab').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(buttons[0]);
    expect(key('Tab', true).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(buttons[3]);
    // Focus that got outside is pulled back in.
    opener.focus();
    key('Tab');
    expect(dialog.contains(document.activeElement)).toBe(true);
    act(() => { key('Escape'); });
    expect(calls.closed).toBe(1);
    expect(box.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(window.__alloFocusTrapStack).toHaveLength(0);
    expect(started).not.toHaveBeenCalled();
  });

  it('teach live: a choice starts the session and closes the dialog', () => {
    const started = vi.fn();
    const { calls } = mount((close) => ReactDom.createElement(views.SessionStartOptionsView, {
      X: Icon, setMbPanelOpen() {}, setShowLiveLessonPrep() {}, setShowSessionStartOptions: (value) => { if (value === false) close(); }, startClassSession: started, t, onTrapEscape: close,
    }));
    const standard = Array.from(box.querySelectorAll('[role="dialog"] button')).find((button) => button.textContent.includes('Standard live session'));
    act(() => standard.click());
    expect(started).toHaveBeenCalledTimes(1);
    expect(calls.closed).toBe(1);
    expect(box.querySelector('[role="dialog"]')).toBeNull();
  });

  it('translate: the trap starts with the dialog and Escape closes it', () => {
    const translate = vi.fn();
    const { calls, opener } = mount((close) => ReactDom.createElement(views.TranslateModalView, {
      Languages: Icon, X: Icon, _alloHostHandlersOptional: () => ({ getTranslationBatchItems: (kind) => (kind === 'pack' ? { items: [{ id: 1 }, { id: 2 }], kind: 'pack' } : { items: [{ id: 1 }] }) }),
      currentUiLanguage: 'English', generatedContent: { type: 'simplified' }, handleSetIsTranslateModalOpenToFalse: close, handleTranslateAction: translate, headerTranslationMode: null, isProcessing: false,
      resolveTranslationPolicy: (mode) => ({ enabled: false, target: '', mode: mode || 'auto' }), selectedLanguages: [], setHeaderTranslationMode() {}, setTargetTranslationLang() {}, setTranslateScope() {}, t,
      targetTranslationLang: 'Spanish', translationMode: 'auto', translationTargetChoices: () => [], onTrapEscape: close,
    }));
    const dialog = box.querySelector('[role="dialog"][aria-labelledby="header-translate-dialog-title"]');
    expect(dialog).toBeTruthy();
    // The language box gets focus first, chosen through data-autofocus (not autoFocus, which ran before the trap
    // recorded where focus came from, so closing left focus on the page body; fixed 2026-11-17).
    expect(document.activeElement.id).toBe('header-translate-target-language');
    expect(dialog.querySelector('[autofocus]')).toBeNull();
    expect(window.__alloFocusTrapStack).toHaveLength(1);
    const buttons = Array.from(dialog.querySelectorAll('button'));
    act(() => buttons[buttons.length - 1].click());
    expect(translate).toHaveBeenCalledWith('pack', { translationMode: 'auto' });
    act(() => { key('Escape'); });
    expect(calls.closed).toBeGreaterThanOrEqual(1);
    expect(box.querySelector('[role="dialog"]')).toBeNull();
    expect(window.__alloFocusTrapStack).toHaveLength(0);
    // Focus goes back to the button that opened the dialog.
    expect(document.activeElement).toBe(opener);
  });
});
