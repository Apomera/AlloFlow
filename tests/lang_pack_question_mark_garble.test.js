// A write that saved non-Latin text in the wrong encoding once turned 448 pack values in 31 languages into
// question marks ("Read aloud" showed as "???? ???" in Arabic, Bengali, Chinese, Amharic...) and dropped single
// accented letters in 58 more ("Derni?re modification annul?e", "Letzte ?nderung r?ckg?ngig"). Neither is ever a
// real translation, so no pack may hold one.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';

const DIR = process.env.LANG_GARBLE_DIR || 'lang';
export const isQuestionMarkGarble = (v) => {
  if (typeof v !== 'string' || v.length < 2) return false;
  if ((v.match(/\p{L}\?\p{L}/gu) || []).length >= 2) return true; // letters lost inside words
  if (!/\?{2,}/.test(v)) return false;
  const text = v.replace(/\{\w+\}/g, '');
  if (text.replace(/[\s?.,:;!()\-–—0-9a-zA-Z_]/g, '').length) return false;
  return (text.match(/\?/g) || []).length >= Math.max(2, text.replace(/\s/g, '').length * 0.5);
};

describe('language packs hold no question-mark garble', () => {
  it('recognises garble and leaves real text alone', () => {
    for (const v of ['???? ???', '?? ?????? ?? ??????', '{count} ????', '??', 'Derni?re modification de {domain} annul?e.']) expect(isQuestionMarkGarble(v), v).toBe(true);
    for (const v of ['قراءة بصوت عالٍ', 'Why?', 'What now??', '?', 'Ready? Go!', '¿Qué?', '{count} 件', 'Dernière modification annulée.', 'Open page?id=3']) expect(isQuestionMarkGarble(v), v).toBe(false);
  });

  it('no pack value is mostly question marks', () => {
    const found = [];
    for (const f of readdirSync(DIR).filter((x) => x.endsWith('.js'))) {
      const walk = (o, p) => { for (const [k, v] of Object.entries(o)) { const id = p ? p + '.' + k : k;
        if (v && typeof v === 'object') walk(v, id); else if (isQuestionMarkGarble(v)) found.push(f.slice(0, -3) + ' ' + id + ' = ' + v); } };
      walk(JSON.parse(readFileSync(DIR + '/' + f, 'utf8')), '');
    }
    expect(found.length, found.slice(0, 20).join('\n')).toBe(0);
  });
});
