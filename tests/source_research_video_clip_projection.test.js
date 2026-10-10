import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = React;
const url = 'https://www.youtube.com/watch?v=AbCdEfGhI_1';
const text = 'Plants use sunlight to make sugars.';
const reading = 'Plants use sunlight [1](' + url + ').';
const bounds = { startSeconds: 65, endSeconds: 185 };
const cfg = { includeSimplified: true, includeOriginalReading: true, includeAnalysis: true, includeTeacherKey: false };
let sources, pipeline, Panel, root, host;
const passage = (overrides = {}) => ({ text, evidenceType: 'AI video transcript', locatorLabel: 'AI transcript - Characters 1-35', videoClip: { ...bounds }, ...overrides });
const record = (passages = [passage()], overrides = {}) => ({ version: 1, writingMode: 'synthesis', bodyKey: sources.bodyKey(reading), sources: [{
  citationHref: url, url, title: 'Plant video', shareExcerpt: true, passages, ...overrides,
}] });
const adapted = studentSources => ({ id: 'reading', type: 'simplified', title: 'Plants', data: reading, instructionalText: { role: 'supplemental', form: 'adapted' }, studentSources });
const parse = html => new DOMParser().parseFromString(html, 'text/html');

beforeAll(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('doc_pipeline_module.js');
  sources = window.AlloModules.StudentSources;
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t: () => undefined, isRtlLang: () => false, updateExportPreview: () => {},
    getDefaultTitle: () => 'Reading', state: { leveledTextLanguage: 'English', exportConfig: {}, currentUiLanguage: 'English' },
  });
  const file = readFileSync('view_simplified_source.jsx', 'utf8');
  const source = file.slice(file.indexOf('  function SimplifiedStudentSources('), file.indexOf('  function SimplifiedPreviewReferences('));
  const code = transformSync(source, { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  Panel = new Function('React', 'simplifiedText', code + '\nreturn SimplifiedStudentSources;')(React, (_key, fallback, values) => fallback.replace(/\{(\w+)\}/g, (match, key) => values?.[key] ?? match));
});
afterEach(() => { if (root) act(() => root.unmount()); host?.remove(); root = null; host = null; });
const mount = value => {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(Panel, { record: sources.sanitize(value) })));
};

describe('student-safe requested video clip provenance', () => {
  it('allowlists clip bounds without retaining transcript caches or mutating the teacher record', () => {
    const value = record([passage({ videoClip: { ...bounds, privateNote: 'PRIVATE_CLIP_NOTE' }, transcript: 'FULL_TRANSCRIPT_CACHE' })]);
    value.privatePrompt = 'PRIVATE_PROMPT';
    const before = JSON.stringify(value);
    const safe = sources.sanitize(value);
    expect(safe.sources[0].passages[0]).toEqual({ text, evidenceType: 'AI video transcript', locatorLabel: 'AI transcript - Characters 1-35', videoClip: bounds });
    expect(JSON.stringify(safe)).not.toMatch(/PRIVATE|FULL_TRANSCRIPT/);
    expect(JSON.stringify(value)).toBe(before);
    expect(safe.sources[0].citationHref).toBe(url);
  });

  it.each([
    null, undefined, [], {}, { startSeconds: 0, endSeconds: 0 }, { startSeconds: 5, endSeconds: 4 },
    { startSeconds: -1, endSeconds: 5 }, { startSeconds: 0.5, endSeconds: 5 },
    { startSeconds: '0', endSeconds: 5 }, { startSeconds: 0, endSeconds: Infinity },
    { startSeconds: 0, endSeconds: Number.MAX_SAFE_INTEGER + 1 },
  ])('rejects explicitly malformed clip metadata instead of treating it as a whole video: %j', videoClip => {
    const safe = sources.sanitize(record([passage({ videoClip })]));
    expect(safe.sources[0].passages).toEqual([]);
  });

  it.each([
    'https://youtube.com.evil.example/watch?v=AbCdEfGhI_1',
    'https://user:secret@youtube.com/watch?v=AbCdEfGhI_1',
    'https://youtube.com:8443/watch?v=AbCdEfGhI_1',
    'https://www.youtube.com/playlist?list=AbCdEfGhI_1',
    'https://www.youtube.com/watch?v=AbCdEfGhI_1&v=XbCdEfGhI_1',
    'https://www.youtube-nocookie.com/embed/AbCdEfGhI_1',
    'https://example.org/video',
  ])('does not attach video clip provenance to an unsupported URL: %s', badUrl => {
    const safe = sources.sanitize(record([passage()], { citationHref: badUrl, url: badUrl }));
    expect(safe?.sources?.[0]?.passages || []).toEqual([]);
    expect(sources.videoClipDetails(passage(), badUrl)).toBeNull();
  });

  it('keeps normal whole-video and non-video passages unchanged', () => {
    const whole = passage(); delete whole.videoClip;
    const safe = sources.sanitize(record([whole, passage({ evidenceType: 'Page excerpt' })]));
    expect(safe.sources[0].passages).toEqual([whole, { text, evidenceType: 'Page excerpt', locatorLabel: 'AI transcript - Characters 1-35' }]);
    expect(sources.videoClipDetails(whole, url)).toBeNull();
  });

  it('keeps equal excerpts from different clips distinct while deduplicating the same clip', () => {
    const safe = sources.sanitize(record([passage(), passage(), passage({ videoClip: { startSeconds: 200, endSeconds: 240 } })]));
    expect(safe.sources).toHaveLength(1);
    expect(safe.sources[0].passages).toHaveLength(2);
    expect(safe.sources[0].passages.map(item => item.videoClip.startSeconds)).toEqual([65, 200]);
  });

  it('captures only cited clip excerpts and leaves private research context behind', () => {
    const report = { citedIds: ['clip'], supplied: [
      { id: 'clip', kind: 'web', title: 'Plant video', url, passage: text, evidenceType: 'AI video transcript', videoClip: { ...bounds, prompt: 'PRIVATE_PROMPT' } },
      { id: 'excluded', kind: 'web', title: 'EXCLUDED_TITLE', url, passage: 'EXCLUDED_PASSAGE', evidenceType: 'AI video transcript', videoClip: { startSeconds: 300, endSeconds: 400 } },
    ], transcriptCache: 'FULL_TRANSCRIPT_CACHE', searchQuery: 'PRIVATE_SEARCH' };
    const safe = sources.capture(report, reading, { writingMode: 'synthesis' });
    expect(safe.sources[0].passages[0].videoClip).toEqual(bounds);
    expect(safe.sources[0].passages).toHaveLength(1);
    expect(JSON.stringify(safe)).not.toMatch(/PRIVATE|EXCLUDED|FULL_TRANSCRIPT/);
    expect(sources.forText(safe, reading.replace('sunlight', 'water')).sources[0].passages).toEqual([]);
  });

  it('keeps clips private when the source record does not share excerpts', () => {
    const safe = sources.sanitize(record([passage()], { shareExcerpt: false }));
    expect(safe.sources[0].passages).toEqual([]);
    expect(JSON.stringify(safe)).not.toContain('videoClip');
  });

  it('links to the requested start without changing canonical source identity', () => {
    const clip = sources.videoClipDetails(passage(), 'https://youtu.be/AbCdEfGhI_1?t=999&si=tracker');
    expect(clip.label).toBe('Requested clip 1:05 to 3:05');
    expect(clip.url).toBe(url + '&t=65');
    expect(sources.videoClipDetails(passage({ videoClip: { startSeconds: 0, endSeconds: 3601 } }), url).label).toBe('Requested clip 0:00 to 1:00:01');
  });

  it.each([false, true])('shows one requested-clip label and an honest start link in the reader (locator includes clip: %s)', inLocator => {
    const locatorLabel = inLocator ? 'Requested clip 1:05 to 3:05 - AI transcript - Characters 1-35' : 'AI transcript - Characters 1-35';
    mount(record([passage({ locatorLabel })]));
    expect(host.textContent.match(/Requested clip 1:05 to 3:05/g)).toHaveLength(1);
    expect(host.textContent).toContain('AI-generated transcript, not verified captions.');
    const link = [...host.querySelectorAll('a')].find(node => node.textContent === 'Open clip start');
    expect(link.href).toBe(url + '&t=65');
    expect(link.rel).toBe('noopener noreferrer');
    expect(link.getAttribute('referrerpolicy')).toBe('no-referrer');
    expect(host.querySelector('[data-student-source-passage]').tagName).toBe('DIV');
    expect(host.querySelector('blockquote')).toBeNull();
    expect([...host.querySelectorAll('a')].find(node => node.textContent === 'Open source').href).toBe(url);
  });

  it.each([false, true])('exports one requested-clip label without presenting AI text as a quotation (locator includes clip: %s)', inLocator => {
    const locatorLabel = inLocator ? 'Requested clip 1:05 to 3:05 - AI transcript - Characters 1-35' : 'AI transcript - Characters 1-35';
    const output = parse(pipeline.generateResourceHTML(adapted(record([passage({ locatorLabel })])), false, {}, cfg));
    const aside = output.querySelector('.reading-source-excerpts');
    expect(aside.textContent.match(/Requested clip 1:05 to 3:05/g)).toHaveLength(1);
    expect(aside.textContent).toContain('not verified captions');
    const clipLink = [...aside.querySelectorAll('a')].find(node => node.textContent === 'Open clip start');
    expect(clipLink?.getAttribute('href')).toBe(url + '&t=65');
    expect(aside.querySelector('blockquote')).toBeNull();
    expect(aside.textContent).toContain(text);
  });

  it('does not add clip controls to a whole-video student reader', () => {
    const whole = passage(); delete whole.videoClip;
    mount(record([whole]));
    expect(host.textContent).not.toContain('Requested clip');
    expect(host.textContent).not.toContain('Open clip start');
    expect(host.querySelectorAll('a')).toHaveLength(1);
  });
});
