// A pack value that is the English text plus a CJK full stop is an untranslated
// string, not a translation. 30 such values sat in the Japanese pack until
// 2026-09-28, including the app name in the header ("AlloFlow。") and
// "SEL Station removed。"; "Try again" had become the word salad "試す再度。".
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const flat = (d, p = '', out = {}) => {
  for (const [k, v] of Object.entries(d)) {
    if (v && typeof v === 'object') flat(v, p + k + '.', out);
    else if (typeof v === 'string') out[p + k] = v;
  }
  return out;
};
const en = flat(JSON.parse(readFileSync(resolve(ROOT, 'ui_strings.js'), 'utf8')));

describe('CJK packs carry no English-plus-full-stop values', () => {
  for (const lang of ['japanese', 'chinese_simplified', 'chinese_traditional']) {
    for (const dir of ['lang', 'desktop/web-app/public/lang']) {
      it(dir + '/' + lang, () => {
        const pack = flat(JSON.parse(readFileSync(resolve(ROOT, dir, lang + '.js'), 'utf8')));
        const bad = Object.keys(pack).filter((k) => typeof en[k] === 'string' && /[A-Za-z]/.test(en[k]) && pack[k] === en[k] + '。');
        expect(bad).toEqual([]);
      });
    }
  }
  it('the Japanese "Try again" is Japanese', () => {
    const ja = flat(JSON.parse(readFileSync(resolve(ROOT, 'lang/japanese.js'), 'utf8')));
    expect(ja['ui_common.try_again']).toBe('もう一度試す');
  });
});
