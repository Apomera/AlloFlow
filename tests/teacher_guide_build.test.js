// MEMORY NOTE (2026-08-16): this suite jsdom-parses every generated page,
// including offline.html, which inlines ALL chapters. At 18 chapters that sits
// right at Node's default ~4GB worker heap and the fork can die with a V8 OOM
// that vitest reports as "Worker exited unexpectedly" (28 passed, rest never
// ran, zero assertion failures). If you see that signature, run with:
//   NODE_OPTIONS=--max-old-space-size=6144 npx vitest run tests/teacher_guide_build.test.js --maxWorkers=1
import { beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const builder = require('../dev-tools/build_teacher_guide.cjs');
const root = process.cwd();
const manifest = JSON.parse(readFileSync(resolve(root, 'docs/teacher-guide/guide.json'), 'utf8'));
const outputRoot = resolve(root, 'guide');
const chapterPages = manifest.chapters.map((chapter) => resolve(outputRoot, chapter.slug + '.html'));
const pagePaths = [
  resolve(outputRoot, 'index.html'),
  ...chapterPages,
  resolve(outputRoot, 'offline.html'),
];

function text(filePath) {
  return readFileSync(filePath, 'utf8');
}

function documentFor(filePath) {
  return new DOMParser().parseFromString(text(filePath), 'text/html');
}

function expectSequentialHeadings(document) {
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  expect(headings.length).toBeGreaterThan(1);
  expect(headings.filter((heading) => heading.tagName === 'H1')).toHaveLength(1);
  expect(headings[0].tagName).toBe('H1');
  for (let index = 1; index < headings.length; index += 1) {
    const previous = Number(headings[index - 1].tagName.slice(1));
    const current = Number(headings[index].tagName.slice(1));
    expect(current, headings[index].textContent).toBeLessThanOrEqual(previous + 1);
  }
}

function expectUniqueIds(document) {
  const ids = Array.from(document.querySelectorAll('[id]')).map((element) => element.id);
  expect(new Set(ids).size).toBe(ids.length);
}

function expectSafeLinksAndImages(document) {
  for (const link of document.querySelectorAll('a[href]')) {
    const href = link.getAttribute('href');
    expect(href).not.toMatch(/^(?:javascript|data|vbscript):/i);
    expect(href).not.toMatch(/^\/\//);
    expect(href).not.toMatch(/[\u0000-\u001f\u007f]/);
    expect(link.textContent.trim() || link.getAttribute('aria-label')).toBeTruthy();
  }
  for (const image of document.querySelectorAll('img')) {
    const alt = (image.getAttribute('alt') || '').trim();
    expect(alt.length).toBeGreaterThanOrEqual(3);
    expect(alt).not.toMatch(/^(?:image|photo|picture|screenshot|graphic|illustration)$/i);
    expect(image.getAttribute('src')).not.toMatch(/^(?:javascript|vbscript):/i);
  }
}

function hash(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

beforeAll(() => {
  const result = spawnSync(process.execPath, ['dev-tools/build_teacher_guide.cjs', '--check'], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error('Teacher guide drift check failed:\n' + result.stdout + '\n' + result.stderr);
  }
});

describe('teacher guide task paths', () => {
  it('renders the manifest task chooser with normal and offline-safe chapter links', { timeout: 240000 }, () => {
    expect(Array.isArray(manifest.paths)).toBe(true);
    expect(manifest.paths.length).toBeGreaterThan(0);

    const index = documentFor(resolve(outputRoot, 'index.html'));
    const chooser = index.querySelector('section.guide-paths');
    expect(chooser).not.toBeNull();
    expect(chooser.querySelectorAll('.guide-path-card')).toHaveLength(manifest.paths.length);

    for (const pathEntry of manifest.paths) {
      for (const slug of pathEntry.chapterSlugs) {
        expect(chooser.querySelector('a[href="' + slug + '.html"]'), pathEntry.title + ': ' + slug).not.toBeNull();
      }
    }

    const offline = documentFor(resolve(outputRoot, 'offline.html'));
    const offlineChooser = offline.querySelector('section.guide-paths');
    expect(offlineChooser).not.toBeNull();
    const offlineHrefs = Array.from(offlineChooser.querySelectorAll('a[href]'))
      .map((link) => link.getAttribute('href'));
    for (const pathEntry of manifest.paths) {
      for (const slug of pathEntry.chapterSlugs) {
        expect(offlineHrefs.some((href) => href.startsWith('#' + slug + '--')), pathEntry.title + ': ' + slug).toBe(true);
      }
    }
  });
});
describe('teacher guide generated tool reference', () => {
  it('matches the public catalog and exposes safe search/filter markup', () => {
    const source = readFileSync(resolve(outputRoot, 'tool-reference.html'), 'utf8');
    const document = documentFor(resolve(outputRoot, 'tool-reference.html'));
    expect(source).toContain('Generated public catalog');
    expect(document.querySelector('[data-tool-reference]')).not.toBeNull();
    expect(document.querySelectorAll('[data-tool-card]')).toHaveLength(33);
    expect(document.querySelectorAll('[data-tool-reference-category] option').length).toBeGreaterThan(2);
    expect(document.querySelector('[data-tool-reference-input][type="search"]')).not.toBeNull();
    expect(document.querySelector('[role="status"][aria-live="polite"]')).not.toBeNull();
    expect(document.querySelector('script[src]')).toBeNull();
    expect(document.querySelector('a[href="tool-reference.html"]')).not.toBeNull();
  });
});
describe('teacher guide triage cues', () => {
  it('renders maintained audience and typical-use metadata on cards and chapter pages', { timeout: 240000 }, () => {
    const index = documentFor(resolve(outputRoot, 'index.html'));
    for (const chapter of manifest.chapters) {
      expect(chapter.audience).toEqual(expect.any(String));
      expect(chapter.time).toEqual(expect.any(String));

      const card = index.querySelector('.chapter-browser a[href="' + chapter.slug + '.html"]')?.closest('.chapter-card');
      expect(card, chapter.slug).not.toBeNull();
      expect(card.querySelector('dt')?.textContent).toBe('Best for');
      expect(card.querySelector('dd')?.textContent).toBe(chapter.audience);
      expect(card.querySelectorAll('dt')[1]?.textContent).toBe('Typical use');
      expect(card.querySelectorAll('dd')[1]?.textContent).toBe(chapter.time);

      const page = documentFor(resolve(outputRoot, chapter.slug + '.html'));
      const cues = page.querySelector('.chapter-cues');
      expect(cues, chapter.slug).not.toBeNull();
      expect(cues.querySelectorAll('dd')[0].textContent).toBe(chapter.audience);
      expect(cues.querySelectorAll('dd')[1].textContent).toBe(chapter.time);
    }
  });
});
describe('teacher guide deterministic build', () => {
  it('tracks every generated artifact and its exact digest', () => {
    const generated = JSON.parse(text(resolve(outputRoot, 'generated-manifest.json')));
    expect(generated).toMatchObject({
      schemaVersion: 1,
      generator: 'dev-tools/build_teacher_guide.cjs',
      sourceManifest: 'docs/teacher-guide/guide.json',
      version: manifest.version,
      lastVerified: manifest.lastVerified,
    });
    expect(generated.outputs.length).toBe(manifest.chapters.length + 7);
    for (const record of generated.outputs) {
      const content = text(resolve(root, record.path));
      expect(record.sha256, record.path).toBe(hash(content));
    }
  });

  it('generates an index, one page per chapter, assets, search data, offline edition, and consolidated manual', () => {
    expect(text(resolve(outputRoot, 'index.html'))).toContain(manifest.title);
    manifest.chapters.forEach((chapter) => {
      expect(text(resolve(outputRoot, chapter.slug + '.html'))).toContain(chapter.summary);
    });
    const normalized = (value) => value.replace(/\r\n?/g, '\n');
    expect(normalized(text(resolve(outputRoot, 'guide.css')))).toBe(
      normalized(text(resolve(root, 'docs/teacher-guide/guide.css')))
    );
    expect(normalized(text(resolve(outputRoot, 'guide-search.js')))).toBe(
      normalized(text(resolve(root, 'docs/teacher-guide/guide-search.js')))
    );

    const manual = text(resolve(root, 'AlloFlow Complete User Manual.md'));
    expect(manual).toContain('Generated by dev-tools/build_teacher_guide.cjs');
    expect(manual.match(/^# /gm)).toHaveLength(1);
    manifest.chapters.forEach((chapter) => {
      const source = text(resolve(root, 'docs/teacher-guide', chapter.source));
      const title = source.match(/^# (.+)$/m)?.[1];
      expect(manual).toContain('## ' + title);
    });
  });

  it('passes the public check mode without writing or drift', { timeout: 240000 }, () => {
    const result = spawnSync(process.execPath, ['dev-tools/build_teacher_guide.cjs', '--check'], {
      cwd: root,
      encoding: 'utf8',
    });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('Teacher guide verified');
  });
});

describe('teacher guide HTML accessibility', () => {
  it('adds a compact, valid in-page table of contents to each chapter page', { timeout: 240000 }, () => {
    for (const chapter of manifest.chapters) {
      const document = documentFor(resolve(outputRoot, chapter.slug + '.html'));
      const articleHeadings = Array.from(document.querySelectorAll('.guide-article > h2'));
      const navigation = document.querySelector('nav.section-nav');
      expect(navigation, chapter.slug).not.toBeNull();
      expect(navigation.querySelectorAll('a')).toHaveLength(articleHeadings.length);

      const targets = Array.from(navigation.querySelectorAll('a')).map((link) => link.getAttribute('href'));
      expect(new Set(targets).size).toBe(targets.length);
      for (const target of targets) {
        expect(target).toMatch(/^#[a-z0-9-]+$/);
        expect(document.getElementById(target.slice(1)), chapter.slug + target).not.toBeNull();
      }
    }
  });
  it.each(pagePaths.map((filePath) => [filePath.replace(root, ''), filePath]))(
    '%s has a semantic, keyboard-oriented shell',
    (_label, filePath) => {
      const document = documentFor(filePath);
      expect(document.documentElement.lang).toBe('en');
      expect(document.querySelector('meta[name="viewport"]')).not.toBeNull();
      expect(document.querySelector('a.skip-link')?.getAttribute('href')).toBe('#main-content');
      expect(document.querySelector('main#main-content[tabindex="-1"]')).not.toBeNull();
      expect(document.querySelector('nav[aria-label="Teacher guide chapters"]')).not.toBeNull();
      expect(document.querySelector('form[role="search"]')).not.toBeNull();
      expect(document.querySelector('label[for="guide-search-input"]')).not.toBeNull();
      expect(document.querySelector('#guide-search-input[type="search"]')).not.toBeNull();
      expect(document.querySelector('[role="status"][aria-live="polite"]')).not.toBeNull();
      expect(document.querySelector('.guide-search__results[aria-labelledby]')).toBeNull();
      expect(document.querySelector('noscript')).not.toBeNull();
      for (const table of document.querySelectorAll('table')) {
        const wrapper = table.closest('.table-scroll');
        expect(wrapper).not.toBeNull();
        expect(wrapper.getAttribute('role')).toBe('region');
        expect(wrapper.getAttribute('aria-label')).toBe('Scrollable table');
        expect(wrapper.getAttribute('tabindex')).toBe('0');
        for (const header of table.querySelectorAll('th')) {
          expect(header.getAttribute('scope')).toBe('col');
        }
      }
      expectSequentialHeadings(document);
      expectUniqueIds(document);
      expectSafeLinksAndImages(document);
    }
  );

  it('resolves every generated chapter and in-page link', { timeout: 240000 }, () => {
    for (const filePath of [resolve(outputRoot, 'index.html'), ...chapterPages]) {
      const document = documentFor(filePath);
      for (const link of document.querySelectorAll('a[href]')) {
        const href = link.getAttribute('href');
        if (!href || /^(?:https?:|mailto:|\/)/i.test(href)) continue;
        const [relativePath, fragment] = href.split('#', 2);
        const targetPath = relativePath ? resolve(outputRoot, relativePath) : filePath;
        if (!targetPath.endsWith('.html')) continue;
        const targetDocument = documentFor(targetPath);
        if (fragment) expect(targetDocument.getElementById(decodeURIComponent(fragment)), href).not.toBeNull();
      }
    }
  });
});

describe('teacher guide search and offline contracts', () => {
  it('indexes each chapter by section and points to real headings', { timeout: 240000 }, () => {
    const records = JSON.parse(text(resolve(outputRoot, 'search-index.json')));
    expect(records.length).toBeGreaterThan(manifest.chapters.length);
    expect(new Set(records.map((record) => record.id)).size).toBe(records.length);
    for (const record of records) {
      expect(record).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        chapter: expect.any(String),
        level: expect.any(Number),
        url: expect.any(String),
        text: expect.any(String),
      });
      expect(record.title.trim()).not.toBe('');
      expect(record.url).toMatch(/^[a-z0-9-]+\.html#[a-z0-9-]+$/);
      const [fileName, fragment] = record.url.split('#');
      expect(documentFor(resolve(outputRoot, fileName)).getElementById(fragment), record.url).not.toBeNull();
    }
  });

  it('keeps the offline edition self-contained with globally unique anchors', { timeout: 240000 }, () => {
    const source = text(resolve(outputRoot, 'offline.html'));
    const document = documentFor(resolve(outputRoot, 'offline.html'));
    expect(document.querySelector('link[rel="stylesheet"]')).toBeNull();
    expect(document.querySelector('script[src]')).toBeNull();
    expect(source).not.toMatch(/@import\s+/i);
    expect(source).not.toMatch(/\bsrc=["']https?:/i);
    expectUniqueIds(document);
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    expect(document.querySelectorAll('[data-offline-chapter]')).toHaveLength(manifest.chapters.length);

    const data = document.getElementById('guide-search-data');
    expect(data).not.toBeNull();
    const records = JSON.parse(data.textContent);
    for (const record of records) {
      expect(record.url).toMatch(/^#[a-z0-9-]+--[a-z0-9-]+$/);
      expect(document.getElementById(record.url.slice(1)), record.url).not.toBeNull();
    }
  });

  it('uses DOM construction, token matching, live counts, URL query sync, and a 25-result ceiling', () => {
    const source = text(resolve(root, 'docs/teacher-guide/guide-search.js'));
    expect(source).not.toContain('inner' + 'HTML');
    expect(source).not.toContain('insertAdjacent' + 'HTML');
    expect(source).not.toContain('document.write');
    expect(source).toContain('document.createElement');
    expect(source).toContain('.textContent');
    expect(source).toContain('MAX_RESULTS = 25');
    expect(source).toContain("searchParams.get('q')");
    expect(source).toContain("searchParams.set('q'");
    expect(source).toContain('tokens.every');
  });
});

describe('teacher guide renderer security', () => {
  it('disables raw HTML and automatic linkification in Markdown', () => {
    const markdown = builder.createMarkdownEngine();
    const rendered = markdown.render('# Safe\n\n<script>alert(1)</script>\n\nhttps://example.test');
    expect(rendered).not.toContain('<script>');
    expect(rendered).toContain('&lt;script&gt;');
    expect(rendered).not.toContain('<a href=');
  });

  it('escapes metadata and accepts only intended URL classes', () => {
    expect(builder.escapeHtml('<img src=x onerror="bad">')).toBe('&lt;img src=x onerror=&quot;bad&quot;&gt;');
    expect(builder.validateBasicUrl('https://example.org/help', 'link')).toBe(true);
    expect(builder.validateBasicUrl('http://example.org/help', 'link')).toBe(true);
    expect(builder.validateBasicUrl('mailto:teacher@example.org', 'link')).toBe(true);
    expect(builder.validateBasicUrl('../outside.md', 'link')).toBe(false);
    expect(builder.validateBasicUrl('//evil.example/x', 'link')).toBe(false);
    expect(builder.validateBasicUrl('javascript:alert(1)', 'link')).toBe(false);
    expect(builder.validateBasicUrl('java%73cript:alert(1)', 'link')).toBe(false);
    expect(builder.validateBasicUrl('data:text/html,bad', 'link')).toBe(false);
    expect(builder.validateBasicUrl('mailto:bad@example.org', 'image')).toBe(false);
  });

  it('creates deterministic unique heading IDs and includes resilient media styles', () => {
    const next = builder.createSlugger('');
    expect([next('Plan & teach'), next('Plan & teach'), next('Evidence')]).toEqual([
      'plan-and-teach',
      'plan-and-teach-2',
      'evidence',
    ]);
    const css = text(resolve(root, 'docs/teacher-guide/guide.css'));
    expect(css).toContain('@media print');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('@media (forced-colors: active)');
    expect(css).toContain(':focus-visible');
  });
});

// The build digests every artifact, so a corrupted character reproduces forever
// and passes as "verified". These two suites check what determinism cannot.
describe('teacher guide text integrity', () => {
  const sourcePaths = [
    resolve(root, 'docs/teacher-guide/guide.json'),
    resolve(root, 'dev-tools/build_teacher_guide.cjs'),
    ...manifest.chapters.map((chapter) => resolve(root, 'docs/teacher-guide', chapter.source)),
  ];
  const generatedPaths = [...pagePaths, resolve(root, 'AlloFlow Complete User Manual.md')];
  const footerPaths = generatedPaths;

  // A UTF-8 lead byte decoded as Windows-1252 lands on one of these three
  // characters, followed by a continuation that decodes into the cp1252
  // punctuation block. Built from escapes so this file stays pure ASCII.
  const mojibake = new RegExp(
    '[\\u00c2\\u00c3\\u00e2]'
      + '[\\u0080-\\u00bf\\u0152\\u0153\\u0160\\u0161\\u0178\\u017d\\u017e'
      + '\\u0192\\u02c6\\u02dc\\u2013\\u2014\\u2018-\\u201e\\u2020-\\u2022'
      + '\\u2026\\u2030\\u2039\\u203a\\u20ac\\u2122]'
  );
  const REPLACEMENT_CHAR = String.fromCharCode(0xfffd);

  it('keeps guide sources free of mojibake', () => {
    for (const filePath of sourcePaths) {
      const content = text(filePath);
      expect(content, filePath).not.toMatch(mojibake);
      expect(content, filePath).not.toContain(REPLACEMENT_CHAR);
    }
  });

  it('keeps generated output free of mojibake', () => {
    for (const filePath of generatedPaths) {
      const content = text(filePath);
      expect(content, filePath).not.toMatch(mojibake);
      expect(content, filePath).not.toContain(REPLACEMENT_CHAR);
    }
  });

  it('emits the footer separator intact rather than a flattened "?"', () => {
    // Assert the intact separator rather than scanning for a stray "?":
    // offline.html inlines the search script, whose ternaries would
    // false-positive on any generic question-mark check.
    const intact = new RegExp('Guide version .+ (?:\\u00b7|&#183;) Content verified');
    for (const filePath of footerPaths) {
      const content = text(filePath);
      expect(content, filePath).toMatch(intact);
      expect(content, filePath).not.toMatch(/ \? Content verified/);
    }
  });
});

describe('teacher guide content completeness', () => {
  const chapterSources = manifest.chapters.map((chapter) => ({
    slug: chapter.slug,
    body: text(resolve(root, 'docs/teacher-guide', chapter.source)),
  }));

  it('never leaves a heading without body text beneath it', () => {
    for (const { slug, body } of chapterSources) {
      const lines = body.split(/\r?\n/);
      for (let index = 0; index < lines.length; index += 1) {
        const heading = /^(#{1,6})\s+\S/.exec(lines[index]);
        if (!heading) continue;
        const label = slug + ': heading "' + lines[index].trim() + '"';
        const next = lines.slice(index + 1).find((line) => line.trim() !== '');
        expect(next, label + ' has nothing beneath it').toBeTruthy();
        // A section may open directly on a deeper subheading, which is normal
        // structure. An empty section is one followed by a heading at the same
        // or a shallower level, with no prose in between.
        const following = /^(#{1,6})\s/.exec(next);
        if (!following) continue;
        expect(
          following[1].length > heading[1].length,
          label + ' is an empty section: the next heading is not nested under it'
        ).toBe(true);
      }
    }
  });

  it('never ends a chapter on a dangling lead-in', () => {
    for (const { slug, body } of chapterSources) {
      const lines = body.split(/\r?\n/).filter((line) => line.trim() !== '');
      const last = lines[lines.length - 1].trim();
      expect(last.endsWith(':'), slug + ': ends on a colon, so a promised list is missing').toBe(false);
      expect(/^#{1,6}\s/.test(last), slug + ': ends on a heading with no content').toBe(false);
    }
  });

  it('reaches every chapter from at least one task path', () => {
    // A chapter absent from every path is unreachable from the index chooser,
    // which is how most readers enter the guide.
    const routed = new Set(manifest.paths.flatMap((path) => path.chapterSlugs));
    for (const chapter of manifest.chapters) {
      expect(
        routed.has(chapter.slug),
        chapter.slug + ' is in no task path, so the index chooser never offers it'
      ).toBe(true);
    }
  });

  it('routes task paths only to chapters that exist', () => {
    const slugs = new Set(manifest.chapters.map((chapter) => chapter.slug));
    for (const path of manifest.paths) {
      for (const slug of path.chapterSlugs) {
        expect(slugs.has(slug), '"' + path.title + '" routes to unknown chapter ' + slug).toBe(true);
      }
    }
  });

  it('refers to each chapter by one consistent name', () => {
    // A reader who meets a chapter as "Live sessions" in one place and
    // "Live Sessions" in another cannot tell whether they are the same page.
    const seen = new Map();
    for (const { slug, body } of chapterSources) {
      const pattern = /\[([^\]]+)\]\((\d\d-[a-z-]+)\.md\)/g;
      let match = pattern.exec(body);
      while (match !== null) {
        if (!seen.has(match[2])) seen.set(match[2], new Map());
        const uses = seen.get(match[2]);
        if (!uses.has(match[1])) uses.set(match[1], []);
        uses.get(match[1]).push(slug);
        match = pattern.exec(body);
      }
    }
    for (const [target, uses] of seen) {
      const variants = [...uses.keys()];
      const detail = variants
        .map((name) => '"' + name + '" (' + [...new Set(uses.get(name))].join(', ') + ')')
        .join(' vs ');
      expect(variants.length, target + ' is linked under conflicting names: ' + detail).toBe(1);
    }
  });

  it('links every chapter under the name its own title carries', () => {
    const titles = new Map(
      manifest.chapters.map((chapter) => [
        chapter.slug,
        text(resolve(root, 'docs/teacher-guide', chapter.source))
          .split(/\r?\n/)[0]
          .replace(/^#\s*/, '')
          .trim(),
      ])
    );
    for (const { slug, body } of chapterSources) {
      const pattern = /\[([^\]]+)\]\((\d\d-([a-z-]+))\.md\)/g;
      let match = pattern.exec(body);
      while (match !== null) {
        const targetSlug = match[3];
        const title = titles.get(targetSlug);
        if (title) {
          // Link text may freely shorten or paraphrase a title: "Prepare a
          // lesson" is a good inline name for "Prepare a purposeful,
          // differentiated lesson". What it may not do is capitalize a word
          // differently from the title, which is how Title Case drift starts.
          const titleCase = new Map(
            title.split(/[\s,:]+/).filter(Boolean).map((word) => [word.toLowerCase(), word])
          );
          // Skip the leading word: link text always opens with a capital,
          // however the title happens to write that word mid-sentence.
          for (const word of match[1].split(/[\s,:]+/).filter(Boolean).slice(1)) {
            const inTitle = titleCase.get(word.toLowerCase());
            if (!inTitle) continue;
            expect(
              word,
              slug + ': links to ' + targetSlug + ' as "' + match[1]
                + '", but its title writes that word as "' + inTitle + '"'
            ).toBe(inTitle);
          }
        }
        match = pattern.exec(body);
      }
    }
  });
});
