// Packets "Present or export" uses the app's own presenter, sheets and annotation tools (2026-11-16).
//
// The page already mounted the shared presenter (word_practice_core/media/ui.js), so it had the app's
// Full screen and Card appearance. Two things were not shared:
//   1. Annotate. The page downloaded the app's annotation suite (word_practice_annotation_assets.js) but
//      held it only as a string for the offline file, and the page's policy allows only its own scripts
//      (no eval), so the live presenter had no Annotate button. The bundle now exposes the same code as a
//      function (run) for a page and as text (runtime) for the offline file: one copy, two uses.
//   2. Seven sheet builders. packets-present-export.js carried its own copy of each (36 KB) behind a
//      check for the shared one, which the page always loads, so the copies never ran.
// The live behaviour is checked in a real browser by C:\tmp\overnight_1116\packets\present_probe2.cjs;
// these tests pin the wiring so it cannot drift back.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { sliceBetween } from './helpers/anchored_slice.js';

const read = (rel) => readFileSync(resolve(process.cwd(), rel), 'utf8');
const ASSETS = read('word_practice_annotation_assets.js');
const PAGE = read('packets-present-export.html');
const SCRIPT = read('packets-present-export.js');
const SHEETS = ['buildFlashcardsHtml', 'buildFrayerHtml', 'buildSortingCardsHtml', 'buildWorksheetHtml', 'buildBingoHtml', 'buildLoopGameHtml', 'buildWordWallHtml'];

function loadAssets() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true });
  dom.window.eval(ASSETS);
  return { win: dom.window, assets: dom.window.AlloWordPracticeAnnotationAssets };
}

describe('one annotation bundle for the app, the Packets page and the offline file', () => {
  it('exposes the suite as a function to run and as the same code in text', () => {
    const { assets } = loadAssets();
    expect(typeof assets.run).toBe('function');
    expect(typeof assets.runtime).toBe('string');
    expect(assets.runtime.length).toBeGreaterThan(100000);
    // The text IS the function's body: there is no second copy in the file.
    const whole = Function.prototype.toString.call(assets.run);
    expect(whole).toContain(assets.runtime);
    expect(ASSETS.length).toBeLessThan(assets.runtime.length + assets.css.length + 20000);
    expect(typeof assets.css).toBe('string');
    expect(Object.keys(assets.labels).length).toBeGreaterThan(10);
  });

  it('run() starts the same suite the app has, without eval', () => {
    const { win, assets } = loadAssets();
    expect(win.AlloModules && win.AlloModules.AnnotationSuite).toBeFalsy();
    assets.run();
    expect(typeof win.AlloModules.AnnotationSuite.mountWorkspace).toBe('function');
    // The offline file embeds the text; it must still be a complete script on its own.
    const fresh = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true });
    fresh.window.eval(assets.runtime);
    expect(typeof fresh.window.AlloModules.AnnotationSuite.mountWorkspace).toBe('function');
  }, 60000);

  it('the app module is built from the same bundle file', () => {
    const module = read('word_practice_module.js');
    expect(module).toContain(ASSETS.trim());
    expect(read('word_practice_ui.js')).toContain('const assets = root.AlloWordPracticeAnnotationAssets || {};');
  });
});

describe('the Packets Present page uses the shared setup', () => {
  it('loads the shared presenter files and allows only its own scripts', () => {
    const doc = new JSDOM(PAGE).window.document;
    const scripts = [...doc.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'));
    for (const file of ['word_practice_annotation_assets.js', 'word_practice_core.js', 'word_practice_media.js', 'word_practice_ui.js']) {
      expect(scripts, file).toContain(file);
      expect(scripts.indexOf(file), file + ' before the page script').toBeLessThan(scripts.indexOf('packets-present-export.js'));
    }
    const policy = doc.querySelector('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    // Scripts: this site's own files only. No eval and no inline script, which is why the suite is a function.
    expect(policy.split(';').map((part) => part.trim()).find((part) => part.startsWith('script-src'))).toBe("script-src 'self'");
  });

  it('starts the annotation suite before it mounts the presenter', () => {
    const start = SCRIPT.indexOf('annoAssets.run()');
    const mount = SCRIPT.indexOf('controller = wp.mount(host, {');
    expect(start).toBeGreaterThan(0);
    expect(mount).toBeGreaterThan(start);
    expect(SCRIPT).toContain("if (!(root.AlloModules && root.AlloModules.AnnotationSuite) && annoAssets && typeof annoAssets.run === 'function') {");
    expect(SCRIPT).not.toMatch(/\beval\s*\(|new\s+Function/);
  });

  it('has no sheet builders of its own: each of the seven hands the work to word_practice_media.js', () => {
    const media = read('word_practice_media.js');
    for (const name of SHEETS) {
      expect(media, name).toContain('function ' + name + '(input, rawOptions = {}) {');
      const body = sliceBetween(SCRIPT, '  function ' + name + '(packArg) {', '\n  }\n', { file: 'packets-present-export.js', label: name });
      expect(body, name).toContain('return root.AlloWordPracticeMedia.' + name + '(');
      expect(body.split('\n').length, name + ' is a thin wrapper').toBeLessThan(14);
      expect(body, name).not.toMatch(/<article|<section|<!doctype|<style/i);
    }
    // The helpers only the removed copies used are gone with them.
    for (const helper of ['phonemeBoxesOf', 'blankedExample', 'safeDataImg', 'sortingOrder']) expect(SCRIPT, helper).not.toContain('function ' + helper + '(');
    expect(Buffer.byteLength(SCRIPT)).toBeLessThan(55000);
  });
});

// The teacher can change a word's meaning and example sentence in the shared presenter's setup, beside its
// picture controls. Run here in jsdom with the same three files the Packets page and the app module load.
describe('the presenter lets the teacher edit a meaning and a sentence', () => {
  function mountPresenter() {
    const dom = new JSDOM('<!doctype html><html><body><div id="host"></div></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/packets-present-export.html' });
    const w = dom.window;
    w.HTMLElement.prototype.scrollIntoView = function () {};
    for (const file of ['word_picture_matcher.js', 'word_practice_core.js', 'word_practice_media.js', 'word_practice_ui.js']) w.eval(read(file));
    const controller = w.AlloModules.WordPractice.mount(w.document.getElementById('host'), {
      title: 'Pets', language: 'en', options: { mode: 'vocabulary', includePictures: true },
      words: [{ word: 'cat', definition: 'a small furry animal', example: 'The cat slept.' }, { word: 'dog', definition: 'a pet that barks', example: 'The dog ran.' }],
      // A prepared word bank, as on the Packets page: it must not overwrite what the teacher typed.
      resolveEntry: (word) => ({ word, definition: 'BANK MEANING for ' + word, example: 'BANK SENTENCE for ' + word }),
    });
    return { w, d: w.document, controller };
  }

  it('each word has Edit meaning; saving changes that word only and survives the word list being read again', () => {
    const { w, d } = mountPresenter();
    const manager = d.querySelector('.awp-picture-manager');
    expect(manager.querySelector('summary').textContent).toBe('Card pictures and meanings (edit)');
    manager.open = true;
    const rows = () => [...d.querySelectorAll('.awp-picture-row')];
    expect(rows().map((row) => row.querySelector('.awp-picture-word').textContent)).toEqual(['cat', 'dog']);
    const editButton = (i) => rows()[i].querySelector('[data-edit-text]');
    expect(editButton(0).textContent).toBe('Edit meaning…');
    expect(editButton(0).getAttribute('aria-expanded')).toBe('false');
    expect(editButton(0).getAttribute('aria-label')).toBe('Edit the meaning and sentence for cat');
    editButton(0).click();
    expect(editButton(0).getAttribute('aria-expanded')).toBe('true');
    const areas = () => [...d.querySelectorAll('.awp-text-edit textarea')];
    expect(areas().map((area) => [area.dataset.editField, area.value])).toEqual([['definition', 'a small furry animal'], ['example', 'The cat slept.']]);
    for (const area of areas()) expect(area.closest('label').querySelector('span').textContent).toMatch(/^(Meaning|Example sentence)$/);
    areas()[0].value = 'MY MEANING: a pet that purrs';
    areas()[1].value = 'MY SENTENCE: The cat purrs.';
    d.querySelector('.awp-text-edit [data-edit-save]').click();
    expect(d.querySelector('.awp-text-edit')).toBeNull();
    expect(d.querySelector('.awp').textContent).toContain('Meaning updated for cat.');
    // Reopened: the teacher's text. The other word is untouched.
    editButton(0).click();
    expect(areas().map((area) => area.value)).toEqual(['MY MEANING: a pet that purrs', 'MY SENTENCE: The cat purrs.']);
    [...d.querySelectorAll('.awp-text-edit button')].find((b) => b.textContent === 'Close').click();
    editButton(1).click();
    expect(areas().map((area) => area.value)).toEqual(['a pet that barks', 'The dog ran.']);
    [...d.querySelectorAll('.awp-text-edit button')].find((b) => b.textContent === 'Close').click();
    // The word list is read again (a word is added): the edit stays, and only the NEW word takes the bank's text.
    const list = [...d.querySelectorAll('.awp textarea')].find((area) => area.value.split('\n').includes('cat'));
    list.value = 'cat\ndog\nfish';
    list.dispatchEvent(new w.Event('input', { bubbles: true }));
    list.dispatchEvent(new w.Event('change', { bubbles: true }));
    return new Promise((resolve) => setTimeout(resolve, 700)).then(() => {
      manager.open = true;
      expect(rows().map((row) => row.querySelector('.awp-picture-word').textContent)).toEqual(['cat', 'dog', 'fish']);
      editButton(0).click();
      expect(areas().map((area) => area.value)).toEqual(['MY MEANING: a pet that purrs', 'MY SENTENCE: The cat purrs.']);
      [...d.querySelectorAll('.awp-text-edit button')].find((b) => b.textContent === 'Close').click();
      editButton(2).click();
      expect(areas()[0].value).toBe('BANK MEANING for fish');
    });
  }, 60000);
});
