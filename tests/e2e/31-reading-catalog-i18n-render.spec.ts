import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Renders the reading catalog module in a real browser against a stub language
 * pack, to prove the shelf/facet strings now go THROUGH the translator.
 *
 * The full differential audit (30-…) drives the deployed site, so it can only
 * confirm a fix after a deploy. This one loads the local module file directly,
 * which means it verifies the working tree — including the thing a static grep
 * cannot see: whether tr() runs at RENDER time or was frozen at module load.
 * A tr() evaluated in a module-scope `var` returns English forever no matter
 * how correct it looks in the source.
 */

const ROOT = path.resolve('.');
const MODULE = fs.readFileSync(path.join(ROOT, 'reading_library_module.js'), 'utf8');

// A deliberately tiny pack: only the keys this test asserts on. Anything the
// module renders in English that is NOT in here is simply untranslated in the
// stub, so the assertions below have to name their keys explicitly.
const STUB_PACK: Record<string, string> = {
  readinglib_collection_stories_label: 'ES-Historias',
  readinglib_collection_stories_sources: 'ES-Fuentes de historias',
  readinglib_collection_stories_summary: 'ES-Resumen de historias',
  readinglib_collection_science_label: 'ES-Ciencia',
  readinglib_collection_history_label: 'ES-Historia',
  readinglib_collection_study_label: 'ES-Libros de texto',
  readinglib_collection_all_label: 'ES-Todas las fuentes',
  readinglib_books: 'ES-libros',
  readinglib_languages: 'ES-idiomas',
};

test.describe('reading catalog renders through the translator', () => {
  test.describe.configure({ timeout: 120000 });

  test('shelf names, source lines and blurbs resolve from the language pack', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.setContent('<!doctype html><html><body><div id="root"></div></body></html>');
    await page.addScriptTag({ url: 'https://unpkg.com/react@18/umd/react.production.min.js' });
    await page.addScriptTag({ url: 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js' });

    // Host contract: the module reads window.__alloT and treats a key echoed
    // back unchanged as a miss.
    await page.evaluate((pack) => {
      (window as any).__alloT = (key: string) => (pack as any)[key];
    }, STUB_PACK);

    await page.addScriptTag({ content: MODULE });

    const registered = await page.evaluate(() => !!(window as any).AlloModules?.ReadingLibrary);
    expect(registered, 'ReadingLibrary did not register').toBe(true);

    await page.evaluate(() => {
      const React = (window as any).React;
      const ReactDOM = (window as any).ReactDOM;
      const Comp = (window as any).AlloModules.ReadingLibrary;
      ReactDOM.createRoot(document.getElementById('root')).render(
        React.createElement(Comp, { isOpen: true, onClose: () => {}, addToast: () => {} })
      );
    });
    await page.waitForTimeout(3000);

    const text = await page.evaluate(() => document.body.innerText);

    // Every shelf name must come from the pack.
    for (const key of ['readinglib_collection_stories_label', 'readinglib_collection_science_label',
      'readinglib_collection_history_label', 'readinglib_collection_study_label',
      'readinglib_collection_all_label']) {
      expect(text, `${key} did not render from the pack`).toContain(STUB_PACK[key]);
    }
    // The source line and blurb were raw literals rendered straight out of the
    // table; they are the bulk of the shelf-picker screen.
    expect(text).toContain(STUB_PACK.readinglib_collection_stories_sources);
    expect(text).toContain(STUB_PACK.readinglib_collection_stories_summary);

    // ...and their English must be gone, not merely joined by a translation.
    expect(text).not.toContain('Stories & fiction');
    expect(text, 'English shelf blurb still on screen')
      .not.toContain('Leveled picture books and attributed open-book discovery');

    expect(errors, 'module threw while rendering').toEqual([]);
  });
});
