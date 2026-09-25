// The reading view's interface text can be translated.
//
// WHY (2026-09-24 audit): about 200 strings in view_simplified_source.jsx were
// hard-coded English, including nearly all the Novak features (Original /
// Adapted / Both, the role card, the word-support editor, Word help, Listen to
// original). They showed in English in every language, and the language-pack
// builder could not translate them because they were not in ui_strings.js.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const SOURCE = readFileSync(process.env.ALLO_VIEW_SOURCE_CANDIDATE || 'view_simplified_source.jsx', 'utf8');
const STRINGS = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const lookup = key => key.split('.').reduce((o, p) => o && o[p], STRINGS);
let React, createRoot, act, View, root, host, pure, phase, api;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('instructional_context_module.js'); loadAlloModule('pure_helpers_module.js'); loadAlloModule('phase_n_misc_helpers_module.js');
  loadAlloModule(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js');
  pure = window.AlloModules.PureHelpers; phase = window.AlloModules.PhaseNHelpers; View = window.AlloModules.SimplifiedView; api = window.AlloModules.InstructionalContext;
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; delete window.__alloT; });

// A pretend language pack: every registered key reads "[xx] <English>".
const pack = (key, params) => {
  const english = lookup(key);
  if (typeof english !== 'string') return undefined;
  return '[xx] ' + english.replace(/\{(\w+)\}/g, (m, name) => params && params[name] != null ? params[name] : m);
};

describe('every translatable string is registered', () => {
  const ast = parser.parse(SOURCE, { sourceType: 'script', plugins: ['jsx'] });
  const calls = [];
  traverse(ast, {
    CallExpression(p) {
      const { callee, arguments: [key, fallback] } = p.node;
      if (callee.type !== 'Identifier' || !['simplifiedText', 'viewText'].includes(callee.name) || !key || !fallback) return;
      if (key.type === 'StringLiteral') calls.push([key.value, fallback.value, p.node.loc.start.line]);
      if (key.type === 'ConditionalExpression') calls.push([key.consequent.value, fallback.consequent.value, p.node.loc.start.line], [key.alternate.value, fallback.alternate.value, p.node.loc.start.line]);
    },
  });
  it('finds the calls', () => { expect(calls.length).toBeGreaterThan(150); });
  it('with the same English in ui_strings.js as in the code', () => {
    const wrong = calls.filter(([key, english]) => lookup(key) !== english).map(([key, english, line]) => line + ' ' + key + ' = ' + JSON.stringify(lookup(key)) + ' but the code shows ' + JSON.stringify(english));
    expect(wrong).toEqual([]);
  });
});

describe('the Novak reading parts show translated text', () => {
  const snapshot = () => api.createSourceSnapshot('The heath was quiet.', { language: 'English', sourceArtifactId: 'analysis', selection: 'input' });
  function mountView(extra) {
    const s = snapshot();
    const adapted = { id: 'adapted', type: 'simplified', data: 'The land was quiet.', sourceSnapshot: s, instructionalText: { role: 'supplemental', form: 'adapted' }, config: { language: 'English', grade: '5' } };
    const props = { ComplexityGauge: () => null, t: pack, generatedContent: adapted, leveledTextLanguage: 'English', isTeacherMode: true, isZenMode: true, interactionMode: 'read', history: [api.createSupportedReading(s, { id: 'orig' }), adapted], textEditorRef: React.createRef(), splitTextToSentences: x => pure.splitTextToSentences(x, {}), getSideBySideContent: () => null, handleSpeak: vi.fn(), cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false, renderFormattedText: x => x, formatInteractiveText: (x, cloze) => phase.formatInteractiveText(x, cloze, false, { highlightGlossaryTerms: y => y, latestGlossary: [], MathSymbol: ({ text }) => text }), SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: y => y, latestGlossary: [], setFocusedParagraphIndex: () => {}, onReadOriginal: () => {}, onOpenReadingArtifact: () => {}, setIsCompareMode: vi.fn(), setInteractionMode: vi.fn(), ...extra };
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    act(() => root.render(React.createElement(View, props)));
  }
  it('the Original / Adapted / Both switch uses the view translator', () => {
    mountView();
    const group = host.querySelector('[aria-label="[xx] Reading versions"]');
    expect(group).not.toBeNull();
    expect([...group.querySelectorAll('button')].map(b => b.textContent.trim())).toEqual(expect.arrayContaining(['[xx] Original', '[xx] Adapted', '[xx] Both']));
  });
  it('the role card, outside the view, uses the host translator', () => {
    window.__alloT = pack;
    mountView();
    expect(host.textContent).toContain('[xx] Use in this lesson');
  });
  it('the word-support editor fills in placeholders after translating', () => {
    window.__alloT = pack;
    const text = 'Fair is foul.';
    const item = api.createSupportedReading(text, { id: 'original' });
    const supports = api.validateReadingSupports(item, [{ id: 'f', start: 8, end: 12, quote: 'foul', text: 'Very bad.', priority: 'essential', origin: 'generated', pinned: false, kind: 'gloss' }]);
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    act(() => root.render(React.createElement(View.ReadingGlossEditor, { item, supports, onUpdate: vi.fn(), disabled: false })));
    const toggle = [...host.querySelectorAll('button')].find(b => b.textContent.includes('[xx] Review word supports'));
    expect(toggle).toBeTruthy();
    act(() => toggle.click());
    expect(host.textContent).toContain('[xx] Essential');
    const edit = [...host.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || '').startsWith('[xx] Edit gloss for'));
    expect(edit.getAttribute('aria-label')).toMatch(/^\[xx\] Edit gloss for \[xx\] foul, text position 9–12: /);
  });
  it('fills in placeholders in the English fallback too', () => {
    window.__alloT = () => undefined;
    const text = 'Fair is foul.';
    const item = api.createSupportedReading(text, { id: 'original' });
    const supports = api.validateReadingSupports(item, [{ id: 'f', start: 8, end: 12, quote: 'foul', text: 'Very bad.', priority: 'helpful', origin: 'generated', pinned: false, kind: 'gloss' }]);
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    act(() => root.render(React.createElement(View.ReadingGlossEditor, { item, supports, onUpdate: vi.fn(), disabled: false })));
    act(() => [...host.querySelectorAll('button')].find(b => b.textContent.includes('Review word supports')).click());
    const edit = [...host.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') || '').startsWith('Edit gloss for'));
    expect(edit.getAttribute('aria-label')).toMatch(/^Edit gloss for foul, text position 9–12: /);
  });
  it('shows English when a key has no translation', () => {
    window.__alloT = () => undefined;
    mountView({ t: () => undefined });
    expect(host.textContent).toContain('Use in this lesson');
    expect(host.textContent).not.toContain('[xx]');
  });
});

describe('no new hard-coded English in the Novak reading parts', () => {
  // Text shown to people in these components must go through a translator.
  const COMPONENTS = ['SimplifiedReadingRoleControl', 'ReadingGlossEditor', 'AdaptedWordHelp', 'renderSimplifiedComparison', 'renderOriginalReading'];
  it.each(COMPONENTS)('%s', name => {
    const ast = parser.parse(SOURCE, { sourceType: 'script', plugins: ['jsx'] });
    const found = [];
    traverse(ast, {
      FunctionDeclaration(p) {
        if (p.node.id.name !== name) return;
        p.traverse({
          JSXText(q) { const s = q.node.value.replace(/\s+/g, ' ').trim(); if (/[A-Za-z]{2,}/.test(s)) found.push(q.node.loc.start.line + ': ' + s); },
          JSXAttribute(q) { const v = q.node.value; if (['aria-label', 'title', 'placeholder'].includes(q.node.name.name) && v && v.type === 'StringLiteral' && /[A-Za-z]{2,}/.test(v.value)) found.push(q.node.loc.start.line + ': ' + v.value); },
        });
      },
    });
    expect(found).toEqual([]);
  });
});
