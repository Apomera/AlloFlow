import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

// Glossary pictures in the document export (2026-09-28). The credit drawn under a
// picked picture shrinks to 1-2 px at the export's 40-140 px sizes, so CC BY and
// BY-SA credits must also appear as text, with the licence and source addresses.
let pipeline;
const dom = html => new DOMParser().parseFromString(html, 'text/html');
const labels = { 'flashcards.picture_credits': 'Picture credits', 'flashcards.credit_license': 'License', 'flashcards.credit_source': 'Source' };
const PHOTO = { set: 'Wikimedia Commons', title: 'Oak leaf', author: 'Kim', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0/', via: 'Wikimedia Commons', url: 'https://commons.wikimedia.org/wiki/File:Oak.jpg', modified: true };
const SYMBOL = { set: 'Mulberry Symbols', author: 'Steve Lee', license: 'CC BY-SA 4.0', licenseUrl: 'javascript:alert(1)' };
const SVG = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>';
const glossary = data => ({ type: 'glossary', id: 'credits-qa', title: 'Vocabulary', data });
const withPictures = () => glossary([
  { term: 'Oak', def: 'A tree.', image: 'data:image/png;base64,QUJD', imageAttribution: PHOTO },
  { term: 'Tree', def: 'A plant.', image: SVG, imageAttribution: SYMBOL },
  { term: 'Leaf', def: 'Part of a plant.', image: 'data:image/png;base64,REVG', imageAttribution: SYMBOL },
  // A credit left behind on a term whose picture was removed credits nothing.
  { term: 'Root', def: 'Under the ground.', image: null, imageAttribution: { set: 'Openverse', title: 'Old root', author: 'Lee', license: 'CC BY 4.0' } },
]);
const render = (item, mode) => dom(pipeline.generateResourceHTML(item, false, {}, { glossaryDisplayMode: mode, includeTeacherKey: false }));
const texts = nodes => [...nodes].map(node => node.textContent.trim());
const FULL = [
  '"Oak leaf" by Kim, CC BY 2.0, via Wikimedia Commons, edited (License: creativecommons.org/licenses/by/2.0; Source: commons.wikimedia.org/wiki/File:Oak.jpg)',
  'Mulberry Symbols by Steve Lee, CC BY-SA 4.0',
];

beforeAll(() => {
  // Mutation runs load a scratch copy so a mutant never reaches the shared file.
  window.React = window.React || createRequire(import.meta.url)(resolve('desktop/web-app/node_modules/react'));
  loadAlloModule('alt_text_module.js');
  if (process.env.DOC_CREDITS_PIPELINE) new Function(readFileSync(process.env.DOC_CREDITS_PIPELINE, 'utf8'))();
  else loadAlloModule('doc_pipeline_module.js');
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t: key => labels[key], isRtlLang: () => false, updateExportPreview: () => {},
    getDefaultTitle: () => 'Vocabulary', state: { exportConfig: {}, currentUiLanguage: 'English' },
  });
});

describe('glossary picture credits in the document export', () => {
  it.each(['flash-cards', 'language-cards'])('%s: a short credit under each picture, every full credit once at the end', mode => {
    const doc = render(withPictures(), mode);
    expect(texts(doc.querySelectorAll('.alloflow-glossary-card-credit'))).toEqual([
      '"Oak leaf" by Kim, CC BY 2.0, via Wikimedia Commons, edited', 'Mulberry Symbols by Steve Lee, CC BY-SA 4.0', 'Mulberry Symbols by Steve Lee, CC BY-SA 4.0']);
    const list = doc.querySelector('[data-picture-credits]');
    expect(list.querySelector('strong').textContent).toBe('Picture credits');
    expect(texts(list.querySelectorAll('li'))).toEqual(FULL);
    expect([...list.querySelectorAll('a')].map(a => a.getAttribute('href'))).toEqual([PHOTO.licenseUrl, PHOTO.url]);
  });

  it('table: the full credits follow the table (a 64 px image column has no room for a caption)', () => {
    const doc = render(withPictures(), 'table');
    expect(doc.querySelector('.alloflow-glossary-card-credit')).toBeNull();
    expect(doc.querySelector('table[data-gloss-table] ~ [data-picture-credits]')).not.toBeNull();
    expect(texts(doc.querySelectorAll('[data-picture-credits] li'))).toEqual(FULL);
  });

  it.each(['table', 'flash-cards'])('%s: a picture address with quotes stays one attribute and no unsafe link is written', mode => {
    const html = pipeline.generateResourceHTML(withPictures(), false, {}, { glossaryDisplayMode: mode });
    const picture = [...dom(html).querySelectorAll('img')].find(img => img.getAttribute('src').startsWith('data:image/svg'));
    expect(picture.getAttribute('src')).toBe(SVG);
    expect(picture.hasAttribute('onload')).toBe(false);
    expect(html.includes('javascript:'), 'an unsafe licence address was written').toBe(false);
  });

  it.each(['table', 'flash-cards'])('%s: no credits list when no picture has a credit', mode => {
    const doc = render(glossary([{ term: 'Oak', def: 'A tree.', image: 'data:image/png;base64,QUJD', imageAttribution: null }, { term: 'Sun', def: 'A star.' }]), mode);
    expect(doc.querySelector('img')).not.toBeNull();
    expect(doc.querySelector('[data-picture-credits]')).toBeNull();
    expect(doc.querySelector('.alloflow-glossary-card-credit')).toBeNull();
  });
});
