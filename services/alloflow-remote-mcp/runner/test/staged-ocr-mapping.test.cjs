'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function extractArrowFunction(source, name) {
  const anchor = `const ${name} = `;
  const at = source.indexOf(anchor);
  if (at < 0) throw new Error(`not found: ${name}`);
  const arrow = source.indexOf('=>', at);
  const braceStart = source.indexOf('{', arrow);
  let depth = 0;
  let end = -1;
  for (let index = braceStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = index;
        break;
      }
    }
  }
  if (arrow < 0 || braceStart < 0 || end < 0) {
    throw new Error(`malformed function: ${name}`);
  }
  const head = source.slice(at + anchor.length, arrow);
  // The extracted function is a pure mapping with no ambient dependencies.
  // eslint-disable-next-line no-eval
  return eval(`(${head}=> ${source.slice(braceStart, end + 1)})`);
}

test('the staged runner module maps every advertised OCR example correctly', () => {
  const stagedModule = path.resolve(
    __dirname,
    '..',
    '..',
    '.runner-context',
    'doc_pipeline_module.js',
  );
  const source = fs.readFileSync(stagedModule, 'utf8');
  const toTesseractLanguage = extractArrowFunction(
    source,
    '_toTesseractLang',
  );

  assert.equal(toTesseractLanguage('en'), 'eng');
  assert.equal(toTesseractLanguage('es'), 'spa');
  assert.equal(toTesseractLanguage('fr'), 'fra');
  assert.equal(toTesseractLanguage('zh'), 'chi_sim');
  assert.equal(toTesseractLanguage('zh-hant'), 'chi_tra');

  // These Tesseract-native/composite values are deliberately rejected at the
  // public Worker and runner boundaries because the canonical mapper treats
  // them as unknown and silently falls back to English.
  assert.equal(toTesseractLanguage('spa'), 'eng');
  assert.equal(toTesseractLanguage('fra'), 'eng');
  assert.equal(toTesseractLanguage('eng+spa'), 'eng');
  assert.equal(toTesseractLanguage('chi_sim'), 'eng');
});
