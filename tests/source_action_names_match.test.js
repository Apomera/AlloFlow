import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// 2026-11-09. The same five ways to start (paste, upload, find online, reading
// catalog, write with AI) were named three different ways in the Quick Start wizard,
// the Create screen's left panel and its right-hand cards. They now share names:
//   Paste or type your own text / Upload / Find online / Reading catalog / Write with AI
// and the right-hand big button says what it does instead of repeating the panel title.
const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');
const COPIES = (name) => [name, `desktop/web-app/public/${name}`, `desktop/app-build/${name}`, `desktop/web-app/build/${name}`];
const anti = read('AlloFlowANTI.txt');
const wizard = read('quickstart_source.jsx');
const panel = read('view_sidebar_panels_source.jsx');

describe('the five source actions share one name everywhere', () => {
  it('Create screen, left panel', () => {
    expect(panel).toContain("t('input.find_online') || 'Find online'");
    expect(panel).toContain("t('input.reading_catalog') || 'Reading catalog'");
    expect(panel).toContain("headerText('input.actions.write_with_ai', 'Write with AI')");
    expect(panel).toContain('panelText(\'sidebar.source_paste_or_type\', \'Paste or type your own text\')');
    expect(panel).toContain("panelText('sidebar.source_ways_in_hint_named', 'Or start from Upload, Find online, Reading catalog or Write with AI above.");
    expect(panel).not.toContain("t('common.link')");
    expect(panel).not.toContain("t('input.actions.books_short') || 'Books'");
  });

  it('Create screen, right-hand cards', () => {
    expect(anti).toContain("label: t('input.find_online') || 'Find online'");
    expect(anti).toContain("label: t('input.reading_catalog') || 'Reading catalog'");
    expect(anti).toContain("label: t('input.actions.write_with_ai') || 'Write with AI'");
    // The big button names its action; the panel title above it already says Source Material.
    expect(anti).toContain("{t('sidebar.source_paste_or_type') || 'Paste or type your own text'}\n                    </button>");
    for (const old of ["'Find a resource online'", "'Generate from a topic'", "'Open reading catalog'"]) expect(anti, old).not.toContain(`|| ${old},`);
  });

  it('Quick Start wizard, step 2 and the headings that follow', () => {
    expect(wizard).toContain("wt('input.find_online', 'Find online')");
    expect(wizard).toContain("wt('input.reading_catalog', 'Reading catalog')");
    expect(wizard).toContain("wt('input.actions.write_with_ai', 'Write with AI')");
    expect(wizard).toContain("pick(t('sidebar.source_paste_or_type'), 'Paste or type your own text')");
    // These two cards had no entry in any language file, so every language saw English.
    expect(wizard).not.toContain("'wizard.find_web', 'Find on the Web'");
    expect(wizard).not.toContain("'wizard.storybooks', 'Reading Catalog'");
    expect(wizard).not.toContain("t('wizard.generate_scratch')");
    // The descriptions now come from keys that are already translated.
    expect(wizard).toContain("wt('input.qs_find_sub', 'Paste a link or let AI search')");
    expect(wizard).toContain("wt('input.qs_book_sub', 'Books, articles & primary sources')");
  });

  it('the new names are registered in all four string files and ship in the built modules', () => {
    for (const file of COPIES('ui_strings.js')) {
      const raw = read(file);
      const strings = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
      expect(strings.input.find_online, file).toBe('Find online');
      expect(strings.input.reading_catalog, file).toBe('Reading catalog');
      expect(strings.sidebar.source_ways_in_hint_named, file).toContain('Find online, Reading catalog');
    }
    for (const file of COPIES('quickstart_module.js')) expect(read(file), file).toContain("wt('input.find_online', 'Find online')");
    for (const file of COPIES('view_sidebar_panels_module.js')) expect(read(file), file).toContain('input.reading_catalog');
  });
});
