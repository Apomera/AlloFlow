import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The word-support editor decides "saved" by comparing a draft's signature
// with the entry that came back. Its picture signature was a copy of the
// contract's normalizer that kept http links and credits naming no set or
// author, which the contract drops, so such a save could never confirm.
const require = createRequire(import.meta.url);
let signature, contract;
beforeAll(() => {
  const React = require(resolve('desktop/web-app/node_modules/react'));
  contract = require('../instructional_context_module.js');
  const source = readFileSync(process.env.PICTURE_SIGNATURE_VIEW || 'view_simplified_source.jsx', 'utf8');
  const compiled = require('@babel/core').transformSync(source.slice(source.indexOf('  function findReadingGlossOccurrences('), source.indexOf('  function SimplifiedView(props)')), {
    plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]], babelrc: false, configFile: false
  }).code;
  signature = new Function('React', 'getInstructionalContextApi', compiled + '\nreturn readingSupportImageSignature;')(React, () => contract);
});

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const saved = image => contract.upsertReadingSupport(contract.createSupportedReading('The heron stood.', { id: 'o' }), null,
  { id: 'h', start: 4, end: 9, quote: 'heron', text: 'A bird.', image }).annotations[0].image;

describe('a draft picture compares equal to what it saves as', () => {
  it.each([
    ['a full Mulberry credit', { src: PNG, alt: 'A heron.', source: 'mulberry', attribution: { set: 'Mulberry Symbols', author: 'Steve Lee', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', url: 'https://mulberrysymbols.org' } }],
    ['an http source link', { src: PNG, alt: 'A heron.', source: 'wikimedia', attribution: { set: 'Wikimedia Commons', author: 'Kim', license: 'CC BY 2.0', url: 'http://example.org/heron' } }],
    ['a credit naming no set or author', { src: PNG, alt: 'A heron.', source: 'upload', attribution: { license: 'CC0' } }],
    ['extra spaces and an unknown source', { src: PNG, alt: '  A   heron.  ', source: 'somewhere', attribution: null }]
  ])('with %s', (_, draft) => {
    expect(signature(draft)).toEqual(signature(saved(draft)));
  });
});
