import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

// The landing page is the first screen every non-English user meets. Its eleven
// keys are hand-translated into all 63 packs; this pins that so a later pack
// rebuild cannot silently drop them back to the English fallback.
//
// A pack can also be "present but useless": a value that is byte-identical to
// the English source renders exactly like no translation at all, and the
// exact-match passthrough metric is the one this project has been burned by
// before. Both conditions are checked.

const KEYS = [
  'input.quickstart_heading',
  'input.qs_book', 'input.qs_book_sub',
  'input.qs_write', 'input.qs_write_sub',
  'input.qs_find', 'input.qs_find_sub',
  'input.qs_generate', 'input.qs_generate_sub',
  'input.actions.books_short', 'input.actions.books_hint',
];

const get = (obj, dotted) => dotted.split('.').reduce((a, p) => (a == null ? undefined : a[p]), obj);
const english = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8'));
const slugs = fs.readdirSync('lang').filter((f) => f.endsWith('.js')).map((f) => f.replace('.js', ''));

describe('landing page pack coverage', () => {
  it('ships all 63 packs', () => {
    expect(slugs.length).toBe(63);
  });

  it('registers every landing key in the English source of truth', () => {
    for (const key of KEYS) expect(typeof get(english, key), `${key} missing`).toBe('string');
  });

  for (const slug of slugs) {
    it(`${slug} translates all ${KEYS.length} landing keys`, () => {
      const pack = JSON.parse(fs.readFileSync(`lang/${slug}.js`, 'utf8'));
      for (const key of KEYS) {
        const value = get(pack, key);
        expect(typeof value, `${slug}: ${key} missing`).toBe('string');
        expect(value.trim().length, `${slug}: ${key} empty`).toBeGreaterThan(0);
        // Byte-identical to English renders exactly like no translation at all.
        expect(value, `${slug}: ${key} is still the English source`).not.toBe(get(english, key));
      }
    });
  }

  // Parses 126 packs of a few megabytes each; the 5s default is not enough and
  // a timeout here reads as drift when nothing has drifted.
  it('keeps the deploy mirror in step for every pack', { timeout: 120000 }, () => {
    for (const slug of slugs) {
      const pack = JSON.parse(fs.readFileSync(`lang/${slug}.js`, 'utf8'));
      const mirror = JSON.parse(fs.readFileSync(`desktop/web-app/public/lang/${slug}.js`, 'utf8'));
      for (const key of KEYS) {
        expect(get(mirror, key), `${slug}: ${key} drifted from lang/`).toBe(get(pack, key));
      }
    }
  });

  it('uses each pack\'s own established abbreviation for AI', () => {
    // Writing "AI" into a pack that already says KI/IA/ИИ everywhere else reads
    // as a half-finished import, so the two AI-bearing strings must match the
    // term the pack already uses.
    const EXPECTED = {
      german: 'KI', french: 'IA', spanish_castilian: 'IA', spanish_latin_america: 'IA',
      italian: 'IA', portuguese_brazil: 'IA', russian: 'ИИ', ukrainian: 'ШІ',
      polish: 'SI', turkish: 'YZ', greek: 'ΤΝ',
    };
    for (const [slug, term] of Object.entries(EXPECTED)) {
      const pack = JSON.parse(fs.readFileSync(`lang/${slug}.js`, 'utf8'));
      const sub = get(pack, 'input.qs_generate_sub');
      expect(sub, `${slug} should use "${term}" for AI`).toContain(term);
    }
  });
});
