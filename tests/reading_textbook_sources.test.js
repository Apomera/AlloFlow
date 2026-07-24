import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const ROOT = resolve(process.cwd());
const LIB = path.join(ROOT, 'reading_library');
const MODULES = resolve(ROOT, 'desktop/web-app/node_modules');
const index = JSON.parse(fs.readFileSync(path.join(LIB, 'index.json'), 'utf8'));
const books = index.books;
const openStax = books.filter((book) => book.sourceId === 'openstax');
const ck12 = books.filter((book) => book.sourceId === 'ck12');
const openStaxManifest = JSON.parse(fs.readFileSync(path.join(LIB, 'openstax_mirror_manifest.json'), 'utf8'));
const openStaxImporter = require(path.join(LIB, 'import_openstax_chapters.js'));

describe('textbook source catalog contract', () => {
  it('publishes thirty readable, license-audited OpenStax chapter mirrors', () => {
    const chapters = openStax.filter((book) => book.contentType === 'open-textbook-chapter');
    expect(chapters).toHaveLength(30);
    for (const entry of chapters) {
      expect(entry.license).toBe('CC BY-NC-SA 4.0');
      expect(entry.licenseUrl).toBe('https://creativecommons.org/licenses/by-nc-sa/4.0/');
      expect(entry.file).toMatch(/^books\/openstax-.+-chapter-(?:[1-9]|10)\.json$/);
      const book = JSON.parse(fs.readFileSync(path.join(LIB, entry.file), 'utf8'));
      expect(book.usagePolicy).toMatchObject({
        access: 'mirrored',
        mirror: true,
        adapt: true,
        ai: false,
        commercial: false,
        aiPermissionRequired: true,
        attributionRequired: true,
        shareAlike: true
      });
      expect(book.source.attributionUrl).toMatch(/^https:\/\/openstax\.org\/books\/.+\/pages\/1-introduction$/);
      expect(book.usagePolicy.reason).toMatch(/generative AI offerings/i);
      expect(book.pages.length).toBeGreaterThanOrEqual(3);
      expect(book.mirror.contentDigest).toBe('sha256:' + crypto.createHash('sha256')
        .update(book.pages.map((page) => page.sourceDigest).join('\n'), 'utf8').digest('hex'));
      expect(book.stats.words).toBeGreaterThan(500);
      expect(book.pages.every((page) =>
        /^https:\/\/openstax\.org\/books\/.+\/pages\//.test(page.sourceUrl) &&
        typeof page.text === 'string' &&
        page.text.length > 100 &&
        page.sourceWordCount === page.text.split(/\s+/).filter(Boolean).length &&
        page.sourceWordCount > 40 &&
        page.sourceDigest === 'sha256:' + crypto.createHash('sha256').update(page.text, 'utf8').digest('hex')
      )).toBe(true);
    }
  });

  it('fails closed when an OpenStax page omits the publisher AI notice', () => {
    expect(openStaxImporter.pageHasExpectedAiNotice({
      body: { textContent: openStaxManifest.aiNotice }
    })).toBe(true);
    expect(openStaxImporter.pageHasExpectedAiNotice({
      body: { textContent: 'CC BY-NC-SA 4.0 without the separate publisher notice' }
    })).toBe(false);
  });

  it('supports incremental chapter selection and confines alternate catalogs', () => {
    const selected = openStaxImporter.selectManifestBooks(openStaxManifest, [
      '--only',
      'openstax-biology-2e-chapter-4,openstax-us-history-chapter-4'
    ]);
    expect(selected.map((entry) => entry.slug)).toEqual([
      'openstax-biology-2e-chapter-4',
      'openstax-us-history-chapter-4'
    ]);
    expect(() => openStaxImporter.selectManifestBooks(openStaxManifest, [
      '--only', 'missing-openstax-chapter'
    ])).toThrow(/Unknown OpenStax mirror slug/);
    expect(path.basename(openStaxImporter.catalogOutputPath([
      '--catalog-output', 'open_catalog.next.json'
    ]))).toBe('open_catalog.next.json');
    expect(() => openStaxImporter.catalogOutputPath([
      '--catalog-output', '../outside.json'
    ])).toThrow(/inside reading_library/);
  });

  it('publishes eight CK-12 discovery cards with fail-closed use policy', () => {
    expect(ck12).toHaveLength(8);
    for (const entry of ck12) {
      expect(entry.contentType).toBe('textbook-source-card');
      const book = JSON.parse(fs.readFileSync(path.join(LIB, entry.file), 'utf8'));
      expect(book.source.url).toBe('https://www.ck12.org/flexbooks');
      expect(book.usagePolicy).toMatchObject({
        access: 'link-only',
        mirror: false,
        adapt: false,
        ai: false,
        commercial: false
      });
      expect(book.pages).toHaveLength(3);
      expect(book.pages[2].text).toMatch(/not mirrored|AI features/i);
    }
  });

  it('keeps every OpenStax source card on the audited current license', () => {
    const cards = openStax.filter((book) => /card/.test(book.contentType));
    expect(cards.length).toBeGreaterThanOrEqual(27);
    for (const entry of cards) {
      expect(entry.license).toBe('CC BY-NC-SA 4.0');
      const book = JSON.parse(fs.readFileSync(path.join(LIB, entry.file), 'utf8'));
      expect(book.usagePolicy.auditSource).toMatch(/^https:\/\/help\.openstax\.org\//);
      expect(book.usagePolicy).toMatchObject({ ai: false, aiPermissionRequired: true });
      expect(book.licenseAudit.auditedAt).toBe('2026-07-23');
    }
  });
});

let React;
let ReactDOMClient;
let act;
let ReadingLibrary;
let root;
let host;

beforeAll(() => {
  React = require(resolve(MODULES, 'react'));
  ReactDOMClient = require(resolve(MODULES, 'react-dom/client'));
  ({ act } = require(resolve(MODULES, 'react-dom/test-utils')));
  global.React = window.React = React;
  if (!global.requestAnimationFrame) global.requestAnimationFrame = () => 0;
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = () => {};
  loadAlloModule('reading_library_module.js');
  ReadingLibrary = window.AlloModules.ReadingLibrary;
});

afterEach(() => {
  if (root) {
    try { root.unmount(); } catch {}
    root = null;
  }
  if (host) {
    host.remove();
    host = null;
  }
});

async function mountReader(book, extra = {}) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const calls = {
    gemini: vi.fn(() => Promise.resolve('')),
    generate: vi.fn(),
    source: vi.fn(),
    practice: vi.fn(),
    docBuilder: vi.fn(),
    save: vi.fn()
  };
  await act(async () => {
    root.render(React.createElement(ReadingLibrary.BookReader, {
      book,
      onExit: () => {},
      addToast: () => {},
      callGemini: calls.gemini,
      handleGenerate: calls.generate,
      setInputText: calls.source,
      onPracticeLanguage: calls.practice,
      onOpenInDocBuilder: calls.docBuilder,
      onSaveToLesson: calls.save,
      isTeacherMode: true,
      ...extra
    }));
  });
  await act(async () => { await Promise.resolve(); });
  return calls;
}

function labels() {
  return Array.from(host.querySelectorAll('button')).map((button) => button.textContent || '');
}

describe('textbook provider policy UI', () => {
  it('keeps CK-12 link-only and removes every AI text handoff', async () => {
    const book = JSON.parse(fs.readFileSync(path.join(LIB, ck12[0].file), 'utf8'));
    const calls = await mountReader(book);
    const text = host.textContent || '';
    const buttons = labels();
    expect(text).toContain('CK-12 remains link-only');
    expect(text).toContain('Link only · AI off');
    expect(buttons.some((label) => /Translate|Create|Define|Sounds|Practice|Lingua/.test(label))).toBe(false);
    expect(calls.gemini).not.toHaveBeenCalled();
    expect(calls.generate).not.toHaveBeenCalled();
    expect(calls.source).not.toHaveBeenCalled();
  });

  it('keeps OpenStax non-AI accessibility and export tools while blocking AI handoffs', async () => {
    const chapter = openStax.find((book) => book.contentType === 'open-textbook-chapter');
    const book = JSON.parse(fs.readFileSync(path.join(LIB, chapter.file), 'utf8'));
    const calls = await mountReader(book);
    const text = host.textContent || '';
    const buttons = labels();
    expect(text).toContain('Accessibility-ready OpenStax chapter mirror');
    expect(text).toContain('CC BY-NC-SA 4.0');
    expect(text).toContain('Extract to Source and generative-AI handoffs are blocked');
    expect(text).toContain('Access for free at');
    expect(buttons.some((label) => /Translate|Create|Define|Sounds|Practice|Lingua|Use as source|Document Builder/.test(label))).toBe(false);
    expect(buttons.some((label) => label.includes('Read this page'))).toBe(true);
    expect(buttons.some((label) => label.includes('Export'))).toBe(true);
    expect(ReadingLibrary._bookPlainText(book)).toBe('');
    expect(ReadingLibrary._bookPlainTextForLocalAccessibility(book)).toContain(book.title);
    expect(calls.gemini).not.toHaveBeenCalled();
    expect(calls.generate).not.toHaveBeenCalled();
    expect(calls.source).not.toHaveBeenCalled();
    expect(calls.practice).not.toHaveBeenCalled();
    expect(calls.docBuilder).not.toHaveBeenCalled();
  });

  it('keeps Open original attributed to the section currently displayed', async () => {
    const chapter = openStax.find((book) => book.contentType === 'open-textbook-chapter' && book.pageCount > 1);
    const book = JSON.parse(fs.readFileSync(path.join(LIB, chapter.file), 'utf8'));
    await mountReader(book);
    const sourceLink = () => Array.from(host.querySelectorAll('a')).find((link) =>
      (link.textContent || '').includes('Open original'));
    expect(sourceLink().href).toBe(book.pages[0].sourceUrl);
    const next = host.querySelector('button[aria-label="Next page"]');
    await act(async () => {
      next.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    expect(sourceLink().href).toBe(book.pages[1].sourceUrl);
  });
});
