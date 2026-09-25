import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

// Word help on ADAPTED texts in documents and student packs (2026-09-24).
let contract, pipeline, serialize;
const dom = html => new DOMParser().parseFromString(html, 'text/html');
const PASSAGE = 'The heron walked slowly in the shallow water.';
beforeAll(() => {
  // Mutation runs load scratch copies so a mutant never reaches the shared files.
  const load = (name, env) => process.env[env] ? new Function(readFileSync(process.env[env], 'utf8'))() : loadAlloModule(name);
  load('instructional_context_module.js', 'ADAPTED_HELP_CONTRACT');
  loadAlloModule('firestore_sync_module.js');
  // The app loads it (with React) at start-up; exports use its credit line.
  window.React = window.React || createRequire(import.meta.url)(resolve('desktop/web-app/node_modules/react'));
  loadAlloModule('alt_text_module.js');
  load('doc_pipeline_module.js', 'ADAPTED_HELP_DOCS');
  contract = window.AlloModules.InstructionalContext;
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t: () => undefined, isRtlLang: () => false, updateExportPreview: () => {},
    getDefaultTitle: () => 'Reading', state: { leveledTextLanguage: 'English', exportConfig: {}, currentUiLanguage: 'English' }
  });
  const source = readFileSync(process.env.ADAPTED_HELP_PACK || 'live_aac_source.jsx', 'utf8');
  const start = source.indexOf('const _alloSerializeResourceForStudentPack =');
  const end = source.indexOf('const LiveAacBoardDialog =', start);
  serialize = new Function('window', source.slice(start, end) + '\nreturn _alloSerializeResourceForStudentPack;')(window);
});
const cfg = { includeSimplified: true, includeOriginalReading: false, includeAnalysis: false, includeTeacherKey: false };
function adapted(shown, entries = [['shallow', 'Not <b>deep</b> & calm.']], data = PASSAGE) {
  const item = { id: 'adapted-1', type: 'simplified', title: 'Heron', data: PASSAGE, config: { language: 'English' },
    sourceSnapshot: contract.createSourceSnapshot('The heron waded through the marsh.', { sourceArtifactId: 'src' }),
    instructionalText: { role: 'supplemental', form: 'adapted', sourceArtifactId: 'src' } };
  let help;
  for (const [quote, text, image] of entries) {
    const start = PASSAGE.indexOf(quote);
    help = contract.upsertAdaptedReadingSupport(item, help, { id: 'w-' + start, start, end: start + quote.length, quote, text, image });
  }
  item.adaptedReadingSupports = contract.setAdaptedReadingSupportsShown(item, help, shown);
  return { ...item, data };
}

describe('adapted word help in exported documents', () => {
  it('lists shown word help after the adapted passage, escaped', () => {
    const result = dom(pipeline.generateResourceHTML(adapted(true), false, {}, cfg));
    const notes = result.querySelector('#adapted-1 .reading-support-notes');
    expect(notes, 'word help aside').toBeTruthy();
    expect(notes.querySelector('dt').textContent).toBe('shallow');
    expect(notes.querySelector('dd').textContent).toBe('Not <b>deep</b> & calm.');
    expect(notes.querySelector('b')).toBeNull();
    // Not a paragraph, so the export's sentence read-aloud leaves it alone.
    expect(notes.querySelector('p')).toBeNull();
    expect(result.getElementById('adapted-1').textContent).toContain('The heron walked slowly');
  });

  it('prints a teacher picture beside its word, with its credit', () => {
    const credit = { set: 'Mulberry Symbols', author: 'Steve Lee', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', via: 'Global Symbols', url: 'https://mulberrysymbols.org' };
    const result = dom(pipeline.generateResourceHTML(adapted(true, [['heron', 'A tall wading bird.', { src: 'data:image/png;base64,QUJD', alt: 'A "heron".', source: 'mulberry', attribution: credit }], ['shallow', 'Not deep.']]), false, {}, cfg));
    const notes = result.querySelector('#adapted-1 .reading-support-notes');
    const img = notes.querySelector('dt img');
    expect(img.getAttribute('src')).toBe('data:image/png;base64,QUJD');
    expect(img.getAttribute('alt')).toBe('A "heron".');
    expect(img.closest('dt').textContent).toBe('heron');
    expect(notes.querySelectorAll('img')).toHaveLength(1);
    expect(notes.querySelector('.picture-credits').textContent).toBe('Picture credits: heron: Mulberry Symbols by Steve Lee, CC BY-SA 4.0, via Global Symbols. Source: https://mulberrysymbols.org. License: https://creativecommons.org/licenses/by-sa/4.0/');
    expect([...notes.querySelectorAll('.picture-credits a')].map(link => link.getAttribute('href'))).toEqual(['https://mulberrysymbols.org', 'https://creativecommons.org/licenses/by-sa/4.0/']);
    expect(notes.querySelector('p')).toBeNull();
  });

  it('prints the same for the original’s word supports', () => {
    const original = contract.createSupportedReading('The heron waded through the marsh.', { id: 'orig' });
    original.readingSupports = contract.upsertReadingSupport(original, undefined,
      { id: 'h', start: 4, end: 9, quote: 'heron', text: 'A tall wading bird.', image: { src: 'data:image/png;base64,QUJD', alt: 'A heron.', source: 'mulberry', attribution: { set: 'Mulberry Symbols', author: 'Steve Lee', license: 'CC BY-SA 4.0' } } });
    const notes = dom(pipeline.generateResourceHTML(original, false, {}, { ...cfg, includeOriginalReading: true })).querySelector('.reading-support-notes');
    expect(notes.querySelector('dt img').getAttribute('alt')).toBe('A heron.');
    expect(notes.querySelector('.picture-credits').textContent).toContain('heron:');
    expect(notes.querySelector('.picture-credits').textContent).toContain('CC BY-SA 4.0');
  });

  it('leaves it out until the teacher shows it, and when the passage was edited', () => {
    expect(dom(pipeline.generateResourceHTML(adapted(false), false, {}, cfg)).querySelector('.reading-support-notes')).toBeNull();
    const edited = adapted(true, undefined, 'The heron walked quickly in the shallow water.');
    expect(dom(pipeline.generateResourceHTML(edited, false, {}, cfg)).querySelector('.reading-support-notes')).toBeNull();
  });

  it('never adds word help to a fill-in-the-blanks sheet', () => {
    const result = dom(pipeline.generateFullPackHTML([
      adapted(true), { id: 'g', type: 'glossary', data: [{ term: 'heron', def: 'A wading bird' }] }
    ], 'Birds', true, {}, { ...cfg, clozeWorksheet: true, includeGlossary: false }));
    expect(result.querySelector('.alloflow-cloze-blank'), 'cloze sheet built').toBeTruthy();
    expect(result.querySelector('.reading-support-notes')).toBeNull();
  });
});

describe('adapted word help in student packs', () => {
  it('keeps the word help, with its pictures, after the privacy filters', () => {
    const item = adapted(true, [['heron', 'A tall wading bird.', { src: 'data:image/png;base64,QUJD', alt: 'A heron.', source: 'mulberry' }]]);
    const packed = serialize(item, { sanitizeHistoryForCloud: window.sanitizeHistoryForCloud, stripUndefined: value => value });
    const help = contract.validateAdaptedReadingSupports(packed, packed.adaptedReadingSupports);
    expect(help).toMatchObject({ shown: true, annotations: [{ quote: 'heron', text: 'A tall wading bird.', image: { alt: 'A heron.' } }] });
  });

  it('keeps them for an adapted reading with no captured original', () => {
    const { sourceSnapshot, ...item } = adapted(true, [['heron', 'A tall wading bird.', { src: 'data:image/png;base64,QUJD', alt: 'A heron.', source: 'mulberry' }]]);
    const packed = serialize(item, { sanitizeHistoryForCloud: window.sanitizeHistoryForCloud, stripUndefined: value => value });
    expect(contract.validateAdaptedReadingSupports(packed, packed.adaptedReadingSupports).annotations[0]).toMatchObject({ quote: 'heron', image: { alt: 'A heron.' } });
  });

  it('keeps pictures on the original\'s word supports too', () => {
    const original = contract.createSupportedReading('The heron waded through the marsh.', { id: 'orig' });
    original.readingSupports = contract.upsertReadingSupport(original, undefined,
      { id: 'h', start: 4, end: 9, quote: 'heron', text: 'A tall wading bird.', image: { src: 'data:image/png;base64,QUJD', alt: 'A heron.', source: 'mulberry' } });
    const packed = serialize(original, { sanitizeHistoryForCloud: window.sanitizeHistoryForCloud, stripUndefined: value => value });
    expect(contract.validateReadingSupports(packed, packed.readingSupports).annotations[0].image).toMatchObject({ src: 'data:image/png;base64,QUJD', alt: 'A heron.' });
  });

  it('still restores ordinary pictures, and drops one a resource may not carry', () => {
    const pack = imageUrl => serialize({ id: 'img', type: 'image', title: 'Pic', data: { imageUrl, prompt: 'x' } },
      { sanitizeHistoryForCloud: window.sanitizeHistoryForCloud, stripUndefined: value => value }).data.imageUrl;
    expect(pack('https://upload.wikimedia.org/heron.png')).toBe('https://upload.wikimedia.org/heron.png');
    expect(pack('javascript:alert(1)')).toBe(null);
  });
});
