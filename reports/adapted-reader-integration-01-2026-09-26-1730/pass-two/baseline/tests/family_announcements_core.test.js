// Tests for family_announcements_module.js — Family Announcements.
//
// Pinned: the accessibility mechanics the tool exists for (lang= and
// dir= on every section — screen-reader voice switching and RTL layout
// are the product, not decoration), the translation disclosure appearing
// in every exported document, prompt hygiene (no-invention rules, exact
// preservation of dates/numbers), fence/label peeling, and escaping.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let F;
beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules.FamilyAnnouncements;
  if (!window.React) {
    window.React = {
      createContext: () => ({}),
      createElement: () => null,
      Fragment: 'Fragment',
      memo: (c) => c,
      useState: (v) => [typeof v === 'function' ? v() : v, () => {}],
      useEffect: () => {},
      useRef: (v) => ({ current: v }),
      useMemo: (fn) => fn(),
      useCallback: (fn) => fn,
      useContext: () => null,
    };
  }
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'family_announcements_module.js'), 'utf8'))();
  F = window.AlloModules.FamilyAnnouncements && window.AlloModules.FamilyAnnouncements._testing;
  if (!F) throw new Error('FamilyAnnouncements did not register');
});

const ES = () => F.FAMANN_LANGS.find((l) => l.tag === 'es');
const AR = () => F.FAMANN_LANGS.find((l) => l.tag === 'ar');

describe('language table', () => {
  it('has unique BCP-47 tags, native names, and marks the RTL set', () => {
    const tags = F.FAMANN_LANGS.map((l) => l.tag);
    expect(new Set(tags).size).toBe(tags.length);
    F.FAMANN_LANGS.forEach((l) => { expect(l.native.length).toBeGreaterThan(0); });
    expect(AR().rtl).toBe(true);
    expect(F.FAMANN_LANGS.find((l) => l.tag === 'prs').rtl).toBe(true); // Dari
    expect(ES().rtl).toBe(false);
  });
});

describe('packet HTML — the accessibility contract', () => {
  const ann = { title: 'Early release <Friday>', date: '2026-08-07', text: 'School ends at 11:30 AM.\n\nBuses run early.' };
  const entries = () => [
    { lang: ES(), text: 'La escuela termina a las 11:30 AM.', status: 'done' },
    { lang: AR(), text: 'تنتهي المدرسة الساعة 11:30 صباحًا.', status: 'done' },
  ];

  it('every section is lang-tagged; RTL sections carry dir="rtl"; native names head each section', () => {
    const html = F.famannPacketHtml(ann, entries());
    expect(html).toContain('<section lang="en">');
    expect(html).toContain('<section lang="es">');
    expect(html).toContain('<section lang="ar" dir="rtl">');
    expect(html).toContain('Español');
    expect(html).toContain('العربية');
    // English master comes first and paragraphs split properly.
    expect(html.indexOf('<section lang="en">')).toBeLessThan(html.indexOf('<section lang="es">'));
    expect(html).toContain('School ends at 11:30 AM.</p>');
  });

  it('the translation disclosure appears in every language section and escaping holds', () => {
    const html = F.famannPacketHtml(ann, entries());
    const count = html.split(F.FAMANN_DISCLAIMER_EN).length - 1;
    expect(count).toBe(entries().length); // once per translated section (English master needs none)
    expect(html).toContain('Early release &lt;Friday&gt;');
    expect(html).not.toContain('<Friday>');
  });

  it('single-language file leads with the target language and sets the document lang/dir', () => {
    const html = F.famannSingleHtml(ann, { lang: AR(), text: 'نص', status: 'done' });
    expect(html).toContain('<html lang="ar" dir="rtl">');
    // Target section before the English master; English forced back to LTR.
    expect(html.indexOf('<section lang="ar"')).toBeLessThan(html.indexOf('<section lang="en"'));
    expect(html).toContain('<section lang="en" dir="ltr">');
    expect(html).toContain(F.FAMANN_DISCLAIMER_EN);
  });

  it('an announcement with zero reviewed translations still exports an English-only packet', () => {
    const html = F.famannPacketHtml(ann, []);
    expect(html).toContain('<section lang="en">');
    // No RTL *sections* (the stylesheet's section[dir="rtl"] selector is fine).
    expect(html).not.toContain(' dir="rtl">');
  });
});

describe('translation prompt + response hygiene', () => {
  it('the prompt forbids additions and pins names/dates/times/numbers', () => {
    const p = F.famannPrompt(ES(), 'Picture day is Tuesday, September 9 at 8:00 AM. Call 555-0122.');
    expect(p).toContain('add NOTHING');
    expect(p).toContain('exactly as written');
    expect(p).toContain('Español');
    expect(p).toContain('Return ONLY the translated text');
    expect(p).toContain('555-0122');
  });

  it('cleanTranslation peels fences and label prefixes, nothing else', () => {
    expect(F.famannCleanTranslation('```\nHola\n```')).toBe('Hola');
    expect(F.famannCleanTranslation('Translation: Hola')).toBe('Hola');
    expect(F.famannCleanTranslation('  Hola  ')).toBe('Hola');
    // Never touches content that merely CONTAINS a colon.
    expect(F.famannCleanTranslation('Nota: la escuela cierra')).toBe('Nota: la escuela cierra');
    expect(F.famannCleanTranslation(null)).toBe('');
  });
});
