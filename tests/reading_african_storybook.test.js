import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIB = path.join(ROOT, 'reading_library');
const require = createRequire(import.meta.url);
const importer = require('../reading_library/import_african_storybook.js');

describe('African Storybook importer parsing', () => {
  it('parses approved catalog rows without evaluating source JavaScript', () => {
    const row = 'parent.bookItemsAppr.push({id:"7",title:"G&oacute;or \\"Test\\"",date:"1",' +
      'summary:"A child\\\'s story",author:"A. Author",people:"A. Author I. Artist",' +
      'lang:"16702",booktype:"3",level:"2",dual:false,app:true,approved:"1",' +
      'other:"approved first sentences Wolof"});';
    const original = globalThis.eval;
    globalThis.eval = () => { throw new Error('eval must not be used'); };
    try {
      const rows = importer.parseApprovedCatalog(row.repeat(1001));
      expect(rows[0]).toMatchObject({
        id: '7',
        title: 'Góor "Test"',
        summary: "A child's story",
        lang: '16702',
        approved: '1',
        app: true,
      });
    } finally {
      globalThis.eval = original;
    }
  });

  it('extracts paired pages, creator roles, and a noncommercial license', () => {
    const record = {
      id: '77',
      title: 'Accessible Story',
      summary: 'A test story.',
      author: 'Translator Name',
      lang: '1095',
      booktype: '3',
      level: '2',
    };
    const language = { siteId: '1095', name: 'Somali', langCode: 'so' };
    const html = `
      <div id="container"><div class="flipbook">
        <div class="page"><div class="cover-wrapper">
          <div id="cover-image" style="background-image:url(https://www.africanstorybook.org/illustrations/pages/10.png)"></div>
          <div class="cover-title">Accessible Story</div><div id="lang">Somali</div>
        </div></div>
        <div class="page"><div class="page-wrapper"><div class="page-borders">
          <image src="https://www.africanstorybook.org/illustrations/pages/11.png"></image>
          <p class="single-text">Bogga koowaad.</p>
        </div><div class="page-number">1</div></div></div>
        <div class="page"><div class="page-wrapper"><div class="page-borders">
          <p class="single-text">Bogga labaad.</p>
        </div><div class="page-number">2</div></div></div>
        <div class="page">
          <div class="backcover_title">Accessible Story</div>
          <div class="bookcover_author">
            <span>Author - </span> Author Name<br>
            <span>Translation - </span> Translator Name<br>
            <span>Illustration - </span> Artist Name<br>
            <span>Language - </span> Somali<br>
            <span>Level - </span> First sentences
          </div>
          <div class="backcover_copyright">
            © Example Publisher 2024<br>
            Creative Commons: Attribution-Non Commercial 4.0<br>
            <span>Source </span>www.africanstorybook.org
          </div>
        </div>
      </div></div>`;
    const parsed = importer.parseViewer(html, record, language);
    expect(parsed.license).toMatchObject({
      eligible: true,
      label: 'CC BY-NC 4.0',
      nonCommercial: true,
    });
    expect(parsed.pages).toHaveLength(2);
    expect(parsed.pages[0]).toMatchObject({
      n: 1,
      text: 'Bogga koowaad.',
      img: 'https://www.africanstorybook.org/illustrations/pages/11.png',
    });
    expect(parsed.credits).toContainEqual({ role: 'Illustration', name: 'Artist Name' });
    const book = importer.makeBook(record, parsed, language);
    expect(book.usagePolicy).toMatchObject({
      mirror: true,
      adapt: true,
      ai: true,
      commercial: false,
      attributionRequired: true,
    });
    expect(book.authors).toEqual(['Author Name']);
    expect(book.illustrators).toEqual(['Artist Name']);
    expect(book.translators).toEqual(['Translator Name']);
  });

  it('fails closed for unknown, versionless, and NoDerivatives licenses', () => {
    const parse = (statement) => {
      const dom = new (require('jsdom').JSDOM)(
        '<div class="backcover_copyright">© Holder 2024<br>Creative Commons: ' +
        statement + '<br>Source www.africanstorybook.org</div>'
      );
      return importer.parseLicense(dom.window.document);
    };
    expect(parse('Attribution 4.0').eligible).toBe(true);
    expect(parse('Attribution-NoDerivatives 4.0')).toMatchObject({
      eligible: false,
      noDerivatives: true,
    });
    expect(parse('Attribution').eligible).toBe(false);
    expect(parse('Something Else 4.0').eligible).toBe(false);
  });
});

describe('African Storybook mirrored catalog', () => {
  const index = JSON.parse(fs.readFileSync(path.join(LIB, 'index.json'), 'utf8'));
  const entries = index.books.filter((entry) => entry.sourceId === 'african-storybook');

  it('includes substantial approved coverage in every priority language', () => {
    expect(entries.length).toBeGreaterThanOrEqual(150);
    for (const language of importer.LANGUAGE_PLAN.map((item) => item.name)) {
      expect(entries.some((entry) => entry.language === language)).toBe(true);
    }
  });

  it('publishes multilingual work families for verified side-by-side reading', () => {
    const families = new Map();
    for (const entry of entries) {
      if (!entry.workKey) continue;
      const family = families.get(entry.workKey) || [];
      family.push(entry);
      families.set(entry.workKey, family);
    }
    const multilingual = [...families.values()].filter((family) =>
      family.length > 1 && new Set(family.map((entry) => entry.language)).size > 1);
    expect(multilingual.length).toBeGreaterThanOrEqual(20);
    expect(multilingual.flat().length).toBeGreaterThanOrEqual(50);
  });
  it('retains exact rights, attribution, page text, and official sources', () => {
    const allowedLicenses = /^CC BY(?:-NC)?(?:-SA)? \d+(?:\.\d+)?$/;
    for (const entry of entries) {
      const book = JSON.parse(fs.readFileSync(path.join(LIB, entry.file), 'utf8'));
      expect(book.contentType).toBe('story');
      expect(book.workKey).toMatch(/^asb-(?:images|edition)-/);
      expect(entry.workKey).toBe(book.workKey);
      expect(book.source.approved).toBe(true);
      expect(book.source.url).toMatch(/^https:\/\/www\.africanstorybook\.org\/newviewer\/index\.php\?/);
      expect(book.license).toMatch(allowedLicenses);
      expect(book.license).not.toMatch(/ND/);
      expect(book.licenseUrl).toMatch(/^https:\/\/creativecommons\.org\/licenses\/by/);
      expect(book.attribution).toBeTruthy();
      expect(book.contributors.length).toBeGreaterThan(0);
      expect(book.usagePolicy).toMatchObject({
        access: 'mirrored',
        mirror: true,
        adapt: true,
        ai: true,
        attributionRequired: true,
        auditSource: 'https://www.africanstorybook.org/terms.html',
      });
      expect(book.usagePolicy.commercial).toBe(!book.license.includes('-NC'));
      expect(book.cover).toMatch(/^https:\/\/www\.africanstorybook\.org\/illustrations\/pages\//);
      expect(book.pages.length).toBeGreaterThan(0);
      expect(book.pages.some((page) => page.text)).toBe(true);
      expect(book.pages.every((page) =>
        page.n > 0 &&
        /^sha256:[a-f0-9]{64}$/.test(page.sourceDigest) &&
        page.sourceUrl.startsWith(book.source.url + '#page=')
      )).toBe(true);
      expect(book.mirror.contentDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(book.accessibility).toMatchObject({
        structuredPageText: true,
        pageImagesPaired: true,
        accessibilityTransformationAllowed: true,
      });
    }
  });
});
