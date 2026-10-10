import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
let Panel, host, root, control, record;
const sourceFile = readFileSync('view_simplified_source.jsx', 'utf8');
const text = 'Plants use sunlight.\n  Their leaves make sugars.';
const makeRecord = () => ({ version: 1, writingMode: 'synthesis', sources: [{ id: 'web-1', kind: 'web', title: 'Plant science', url: 'https://example.edu/plants', citationHref: 'https://example.edu/plants', shareExcerpt: true, passages: [{ text, evidenceType: 'Page excerpt', locatorLabel: 'Paragraph 2' }] }] });

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('text_pipeline_helpers_module.js');
  const source = sourceFile.slice(sourceFile.indexOf('  function SimplifiedStudentSources('), sourceFile.indexOf('  function SimplifiedPreviewReferences('));
  const code = transformSync(source, { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  Panel = new Function('React', 'simplifiedText', code + '\nreturn SimplifiedStudentSources;')(React, (_key, fallback) => fallback);
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function mount(value = makeRecord(), referencesText) {
  record = value;
  host = document.createElement('div'); document.body.append(host); root = createRoot(host); control = React.createRef();
  act(() => root.render(React.createElement(Panel, { record, referencesText, controlRef: control })));
}
const click = node => act(() => node.click());
const sources = () => host.querySelector('[data-student-sources]');
const source = () => host.querySelector('[data-student-source]');
function opener() { const button = document.createElement('button'); button.textContent = 'Citation'; host.append(button); return button; }
function openCitation(trigger) { let handled; act(() => { handled = control.current.openSource('https://example.edu/plants', trigger); }); return handled; }

describe('student source disclosure', () => {
  it('starts collapsed with a source title and domain and no teacher controls', () => {
    const value = makeRecord(); value.activity = ['Private search']; value.sources[0].excludedSources = ['Private rejected title'];
    mount(value);
    expect(sources().open).toBe(false); expect(source().open).toBe(false);
    expect(host.textContent).toContain('Plant science'); expect(host.textContent).toContain('example.edu');
    expect(host.textContent).toContain('AI-written reading'); expect(host.textContent).not.toContain('Private');
    expect(host.querySelectorAll('input, select, textarea, button')).toHaveLength(0);
  });
  it('preserves exact whitespace in supplied passages and groups a page once', () => {
    const value = makeRecord(); value.sources[0].passages.push({ text: 'Another passage.', evidenceType: 'Page excerpt', locatorLabel: 'Paragraph 4' });
    const before = JSON.stringify(value); mount(value);
    expect(host.querySelectorAll('[data-student-source]')).toHaveLength(1);
    expect(host.querySelectorAll('[data-student-source-passage]')).toHaveLength(2);
    expect(host.querySelector('[data-student-source-passage]').textContent).toBe(text);
    expect(host.textContent).toContain('Page excerpt: Paragraph 2'); expect(JSON.stringify(value)).toBe(before);
  });
  it.each([
    ['Search snippet', 'This is a search preview, not a passage from a page that was read.'],
    ['Source-linked AI note', "This is an AI note linked to the source, not the source's exact wording."]
  ])('makes the limits of %s explicit', (evidenceType, notice) => {
    const value = makeRecord(); value.sources[0].passages[0].evidenceType = evidenceType; mount(value);
    expect(host.textContent).toContain(notice); expect(host.textContent).not.toContain('verified');
  });
  it('identifies video transcripts as unverified AI text rather than a source quotation', () => {
    const value = makeRecord();
    value.sources[0].url = value.sources[0].citationHref = 'https://www.youtube.com/watch?v=AbCdEfGhI_1';
    value.sources[0].passages[0].evidenceType = 'AI video transcript';
    mount(value);
    expect(source().querySelector('summary').textContent).toContain('AI video transcript');
    expect(host.textContent).toContain('AI-generated transcript, not verified captions. It may contain transcription errors.');
    expect(host.querySelector('[data-student-source-passage]').tagName).toBe('DIV');
    expect(host.querySelector('[data-student-source-passage]').textContent).toBe(text);
    expect(host.querySelector('blockquote')).toBeNull();
    expect(host.querySelector('a').href).toBe('https://www.youtube.com/watch?v=AbCdEfGhI_1');
  });
  it('does not render a document passage without separate student sharing permission', () => {
    const value = makeRecord(); value.sources[0] = { id: 'doc-1', kind: 'document', title: 'Teacher-provided source', shareExcerpt: false, passages: [{ text: 'Private original wording', evidenceType: 'Document passage', locatorLabel: 'Confidential filename' }] };
    mount(value);
    expect(host.textContent).toContain('The source text has not been shared with students.');
    expect(host.textContent).not.toContain('Private'); expect(host.textContent).not.toContain('Confidential');
    expect(host.querySelector('a')).toBe(null);
  });
  it('labels a links-only record honestly without inferring how it was written', () => {
    const value = makeRecord(); value.writingMode = 'unknown'; value.sources[0].passages = []; mount(value);
    expect(host.textContent).toContain('Only a source link is available'); expect(host.querySelector('[data-student-sources-writing]')).toBe(null);
    const link = host.querySelector('a'); expect(link.href).toBe('https://example.edu/plants');
    expect(link.rel).toBe('noopener noreferrer'); expect(link.getAttribute('referrerpolicy')).toBe('no-referrer');
  });
  it('distinguishes source quotations from AI-written synthesis', () => {
    const value = makeRecord(); value.writingMode = 'quotes'; mount(value);
    expect(host.textContent).toContain('This reading uses selected source quotations.'); expect(host.textContent).not.toContain('AI-written reading');
  });
  it('opens a cited source and restores focus without entering network or AI services', () => {
    mount(); const trigger = opener(), fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    expect(openCitation(trigger)).toBe(true);
    expect(sources().open).toBe(true); expect(source().open).toBe(true);
    expect(document.activeElement).toBe(source().querySelector('summary'));
    click(host.querySelector('[data-student-sources-return]')); expect(document.activeElement).toBe(trigger);
    expect(fetch).not.toHaveBeenCalled(); expect(host.querySelector('[data-student-sources-return]')).toBe(null);
    expect(control.current.openSource('https://unrelated.example', trigger)).toBe(false);
  });
  it('closes with Escape and returns to the citation', () => {
    mount(); const trigger = opener(); openCitation(trigger);
    act(() => source().querySelector('summary').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    expect(sources().open).toBe(false); expect(document.activeElement).toBe(trigger);
  });
  it('matches a raw-parentheses citation to the actual helper canonical URL', () => {
    const raw = 'https://en.wikipedia.org/wiki/Cloud_(meteorology)';
    const value = window.AlloModules.StudentSources.sanitize({ version: 1, sources: [{ citationHref: raw, title: 'Clouds', passages: [] }] });
    expect(value.sources[0].citationHref).toBe('https://en.wikipedia.org/wiki/Cloud_%28meteorology%29');
    mount(value); const trigger = opener(); let handled;
    act(() => { handled = control.current.openSource(raw, trigger); });
    expect(handled).toBe(true); expect(sources().open).toBe(true); expect(source().open).toBe(true);
    expect(document.activeElement).toBe(source().querySelector('summary'));
  });
  it('retains unlinked bibliography entries beside web sources without teacher appendices', () => {
    mount(makeRecord(), '### Source Text References\n\n1. [Plant science](https://example.edu/plants)\n2. Printed book, 2020.\n\n### Research Review\n\n3. PRIVATE_REVIEW_SENTINEL\n\n### Your Document References\n\n4. PRIVATE_DOCUMENT_SENTINEL');
    expect(host.querySelectorAll('[data-student-source]')).toHaveLength(1);
    expect(host.querySelectorAll('[data-student-plain-reference]')).toHaveLength(1);
    expect(host.querySelector('[data-student-plain-reference]').textContent).toBe('2. Printed book, 2020.');
    expect(sources().querySelector('summary').textContent).toBe('Sources (2)');
    expect(host.textContent).not.toContain('PRIVATE_'); expect(host.textContent).not.toContain('Research Review');
  });
  it('discards old disclosure and focus state when the reading changes', () => {
    mount(); openCitation(opener());
    const next = makeRecord(); next.sources[0].title = 'New reading source';
    act(() => root.render(React.createElement(Panel, { record: next, controlRef: control })));
    expect(sources().open).toBe(false); expect(host.querySelector('[data-student-sources-return]')).toBe(null);
    expect(host.textContent).toContain('New reading source');
  });
  it('leaves empty records absent from the reading', () => { mount({ version: 1, sources: [] }); expect(sources()).toBe(null); });
  it('uses the artifact-owned safe contract and keeps the references fallback', () => {
    expect(sourceFile).toContain('studentSourcesApi?.forText?.(generatedContent?.studentSources, generatedContent?.data)');
    expect(sourceFile).toContain('studentSourcesApi.publicText(simplifiedReferences, studentSourcesRecord)');
    expect(sourceFile).toContain('onClickCapture={openStudentSource}');
    expect(sourceFile).toContain(': <SourceReferencesPanel referencesText={simplifiedReferences} />');
  });
});
