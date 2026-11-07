// Every pack names the reader's two buttons the same way everywhere a teacher or student reads them.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const HELD = new Set(['maay_maay', 'lingala', 'acholi', 'karen', 'marshallese', 'chin_hakha', 'chin_falam']);
const LANG = path.resolve('lang');
const packs = readdirSync(LANG).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3)).filter(p => !HELD.has(p));
const load = p => JSON.parse(readFileSync(path.join(LANG, p + '.js'), 'utf8'));
const get = (o, k) => k.split('.').reduce((a, s) => (a && typeof a === 'object' ? a[s] : undefined), o);

// Wrong meanings and garbled names found in the packs on 2026-11-06.
const WRONG = {
  amharic: ['ምዕላዶች'], bengali: ['ইমার্সিভ পড়ুন'], burmese: ['သံယောဇဉ်', 'သရအသံ'], hausa: ['Saiwa', 'Nutsewa', 'Nutsarwa'],
  igbo: ['Onye na-agụ mmiri', 'Akpụ Okwu'], kinyarwanda: ['Birimo Reader', 'Imisaze'], kirundi: ['Birimo Reader'],
  somali: ['Daboolaalka', 'Hoos-u-dhac', 'aqdar'], tigrinya: ['ጻውታት'], yoruba: ['Onígbàgbọ́'], hmong: ['Kiv ntsuab'],
  dari: ['اخیرنغماسی'], farsi: ['اخیرنغماسی'], pashto: ['انهنغماسی'], urdu: ['انہیںنغماسی'],
  german: ['Plastisch'], italian: ['Immersivo Lettore', 'focusato'], swahili: ['Ya kuvutia'], tagalog: ['Imersibo '], romanian: ['Imersiv Reader'],
};
const NAMING_KEYS = ['immersive.syllables', 'immersive.toggle_syllables', 'simplified.immersive', 'simplified.immersive_reader', 'simplified.tip_immersive_btn', 'adventure.simplified_immersive_reader', 'syllable_prep.intro', 'syllable_prep.table_failed_reader', 'tour.simplified_text'];

describe('reader button names in the language packs', () => {
  it('finds the active packs', () => { expect(packs.length).toBe(56); });

  it.each(packs)('%s: the panel intro quotes the real Syllables button', pack => {
    const j = load(pack);
    expect(get(j, 'syllable_prep.intro').toLowerCase()).toContain(get(j, 'immersive.syllables').toLowerCase());
  });

  it.each(packs)('%s: no leftover English or known wrong wording in the keys that name the buttons', pack => {
    const j = load(pack);
    for (const k of NAMING_KEYS) {
      const v = get(j, k);
      expect(typeof v, k).toBe('string');
      expect(v.includes('Syllabification'), k + ': ' + v).toBe(false);
      for (const bad of WRONG[pack] || []) expect(v.includes(bad), k + ' holds ' + bad).toBe(false);
    }
    for (const k of ['simplified.immersive', 'simplified.tip_immersive_btn', 'adventure.simplified_immersive_reader', 'tour.simplified_text']) {
      if (pack === 'kinyarwanda' && k === 'tour.simplified_text') continue; // English name is given in brackets after the Kinyarwanda one.
      expect(get(j, k).includes('Immersive Reader'), k + ': still English').toBe(false);
    }
  });

  it.each(packs)('%s: the reader buttons use one name for each of their labels', pack => {
    const j = load(pack);
    const imm = ['simplified.immersive', 'simplified.immersive_reader', 'stem.allobotsage.immersive_reader'].map(k => get(j, k));
    expect(new Set(imm).size, imm.join(' | ')).toBe(1);
    expect(get(j, 'readinglib_syllables')).toBeTruthy();
  });
});
