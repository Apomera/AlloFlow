import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

// Pins the fixes for the strings a differential render (English -> Spanish,
// tests/e2e/30-ui-localization-audit.spec.ts) caught coming back byte-identical
// on the landing page, the reading catalog and the header Documents menu.
//
// The failure they shared was NOT a missing t(). Most were wrapped already:
//     t('input.qs_book') || 'Open reading catalog'
// That renders English and never shows a dotted key, so nothing flagged it —
// but useTranslation() builds its work list by diffing ui_strings.js against
// the user's cached pack, so a key absent from the registry is never handed to
// the translator in ANY language. Registering the key IS the fix.
//
// So these tests assert the registry, not the call sites: a call site can be
// perfect and the string still be permanently English.

const ui = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8'));
const readingLib = fs.readFileSync('reading_library_module.js', 'utf8');
const catalog = fs.readFileSync('catalog_module.js', 'utf8');
const header = fs.readFileSync('view_header_source.jsx', 'utf8');
const fab = fs.readFileSync('view_fab_stack_source.jsx', 'utf8');

function get(dotted) {
  return dotted.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), ui);
}

describe('landing page is translatable', () => {
  // Every card on the "starting point" block, both lines each. All eleven keys
  // were called and none were registered.
  const EXPECTED = {
    'input.quickstart_heading': 'Or choose a starting point',
    'input.qs_book': 'Open reading catalog',
    'input.qs_book_sub': 'Books, articles & primary sources',
    'input.qs_write': 'Write or paste text',
    'input.qs_write_sub': 'Use your own material',
    'input.qs_find': 'Find a resource online',
    'input.qs_find_sub': 'Paste a link or let AI search',
    'input.qs_generate': 'Generate from a topic',
    'input.qs_generate_sub': 'AI writes it for you',
    'input.actions.books_short': 'Books',
    'input.actions.books_hint': 'Open picture books — any book can become your source text',
  };
  for (const [key, english] of Object.entries(EXPECTED)) {
    it(`registers ${key}`, () => {
      expect(get(key), `${key} missing from ui_strings.js`).toBe(english);
    });
  }
});

describe('reading catalog is translatable', () => {
  it('registers every shelf name, source line and blurb', () => {
    // These three lines are the whole shelf-picker screen and were raw literals
    // rendered straight out of LIBRARY_COLLECTIONS.
    for (const id of ['stories', 'science', 'history', 'study', 'all']) {
      for (const part of ['label', 'sources', 'summary']) {
        const key = `readinglib_collection_${id}_${part}`;
        expect(typeof ui[key], `${key} missing`).toBe('string');
        expect(ui[key].length).toBeGreaterThan(2);
      }
    }
  });

  it('translates the shelf strings at render time, not from the raw table', () => {
    expect(readingLib).toContain("tr('readinglib_collection_' + collection.id + '_label', collection.label)");
    expect(readingLib).toContain("tr('readinglib_collection_' + collection.id + '_sources', collection.sourceLine)");
    expect(readingLib).toContain("tr('readinglib_collection_' + collection.id + '_summary', collection.summary)");
  });

  it('registers the filter facets and reader fonts', () => {
    for (const key of ['readinglib_length_quick', 'readinglib_length_long',
      'readinglib_license_public-domain', 'readinglib_license_noncommercial',
      'readinglib_topicfacet_stories', 'readinglib_topicfacet_business-career',
      'readinglib_font_default', 'readinglib_font_serif']) {
      expect(typeof ui[key], `${key} missing`).toBe('string');
    }
  });

  it('keeps the item count outside the translated string', () => {
    // "52 languages" must not become one translatable blob — the count changes
    // and word order does not survive concatenation in every language.
    expect(readingLib).toContain("tr('readinglib_topicfacet_' + option.id, option.label) + ' (' + option.count + ')'");
    expect(readingLib).toContain("tr('readinglib_length_' + option.id, option.label) + ' (' + option.count + ')'");
  });

  it('no longer reuses one key for two different controls', () => {
    // readinglib_export served both "Export" (a reading copy) and "Back up"
    // (imported books); whichever translation arrived would be wrong for one.
    expect(readingLib).toContain("tr('readinglib_backup_imports', 'Back up')");
    expect(readingLib).toContain("tr('readinglib_export', 'Export')");
    expect(ui.readinglib_export).toBe('Export');
    expect(ui.readinglib_backup_imports).toBe('Back up');
  });
});

describe('community catalog is translatable', () => {
  it('has a translator at all', () => {
    // It shipped with zero translator calls of any kind.
    expect(catalog).toContain('function tr(key, fallback)');
    expect(catalog).toContain('window.__alloT');
    expect((catalog.match(/\btr\(/g) || []).length).toBeGreaterThan(60);
  });

  it('localizes the submission consent checkboxes', () => {
    // Consent a reader cannot read is the sharpest item in the audit.
    const consent = [
      'catalog_i_am_the_author_of_this_lesson_or_have_permi',
      'catalog_i_agree_to_release_this_lesson_under_the_cho',
      'catalog_i_am_13_years_or_older_or_an_adult_is_submit',
      'catalog_i_am_the_author_of_this_module_or_have_permi',
      'catalog_i_agree_to_release_this_module_under_an_open',
    ];
    for (const key of consent) expect(typeof ui[key], `${key} missing`).toBe('string');
    expect(catalog).toContain("tr('catalog_i_am_the_author_of_this_lesson_or_have_permi'");
  });

  it('resolves licence labels at render time, not at module load', () => {
    // A tr() evaluated in a module-scope `var` runs once at load, before the
    // user has picked a language, and its English is frozen for the session.
    const licenceTable = catalog.slice(catalog.indexOf('var ALLOWED_LICENSES'), catalog.indexOf('var ALLOWED_LICENSES') + 400);
    expect(licenceTable).not.toContain('tr(');
    expect(catalog).toContain("tr('catalog_license_' + lic.value, lic.label)");
  });

  it('leaves JSON code samples untranslated', () => {
    // Translating a JSON placeholder would teach the user to type something
    // that does not parse, so the wrapper skips anything starting with "{".
    expect(catalog).toContain(`placeholder: '{\\n  "mode": "teacher",\\n  "history": [...]\\n}'`);
    expect(catalog).not.toMatch(/tr\('[^']*',\s*'\{\\n\s*"mode"/);
    // Same for the PD module schema sample.
    expect(catalog).not.toMatch(/tr\('[^']*',\s*'\{[^']*schema_version/);
  });
});

describe('header Documents menu and Student tools are translatable', () => {
  it('registers every Documents menu string', () => {
    for (const key of ['export_menu.section_documents', 'export_menu.document_builder',
      'export_menu.section_print', 'export_menu.section_digital', 'export_menu.section_student_qr',
      'export_menu.section_lms', 'export_menu.homework_qr', 'export_menu.homework_link_length',
      'export_menu.setup_activity', 'export_menu.shared_links', 'export_menu.custom_style_active',
      'export_menu.share_policy_ai_off', 'export_menu.share_policy_byok']) {
      expect(typeof get(key), `${key} missing`).toBe('string');
    }
  });

  it('gives each expiry option its own key rather than gluing a number to a noun', () => {
    for (const key of ['expiry_1_day', 'expiry_1_week', 'expiry_2_weeks', 'expiry_30_days',
      'expiry_90_days', 'expiry_180_days', 'expiry_365_days']) {
      expect(typeof get('export_menu.' + key), `export_menu.${key} missing`).toBe('string');
    }
    expect(header).toContain("{t('export_menu.expiry_90_days') || '90 days (quarter)'}");
  });

  it('localizes the Student tools control a student is meant to reach for', () => {
    expect(get('student_tools.title')).toBe('Student tools');
    expect(get('student_tools.subtitle')).toBe('Read, focus, and practice your way');
    // It was hardcoded in two places — the panel heading and the closed pill.
    expect((fab.match(/t\('student_tools\.title'\)/g) || []).length).toBe(2);
    expect(fab).not.toContain('tracking-tight text-slate-900">Student tools<');
  });
});

describe('generated copies stay in step', () => {
  it('mirrors every touched file into the deploy tree', () => {
    for (const f of ['ui_strings.js', 'reading_library_module.js', 'catalog_module.js',
      'view_header_module.js', 'view_fab_stack_module.js', 'error_reporter_module.js']) {
      expect(fs.readFileSync(`desktop/web-app/public/${f}`, 'utf8'), `${f} mirror drifted`)
        .toBe(fs.readFileSync(f, 'utf8'));
    }
  });
});
