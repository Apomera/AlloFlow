// Keeps the prose guides honest about the evaluation tool. Both chapters make
// claims that are checkable against the shipping code, and both drifted before:
// ch20 named two framework profiles when three exist, and linked the manual with
// a .html suffix that no other link uses.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const LEADERS = read('docs/teacher-guide/chapters/20-for-school-leaders.md');
const IT = read('docs/teacher-guide/chapters/17-for-your-it-department.md');
const CONSOLIDATED = read('AlloFlow Complete User Manual.md');
const SOURCE = read('educator_evaluation_source.jsx');
const GS = read('apps_script/educator_evaluation/Code.gs');

// The framework registry, sliced between two stable landmarks in the source.
const registryBlock = () => {
  const start = SOURCE.indexOf('const AE_FRAMEWORKS');
  const end = SOURCE.indexOf('function aeSetActiveFramework');
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return SOURCE.slice(start, end);
};

describe('teacher guide screenshots', () => {
  const CHAPTER_DIR = path.join(ROOT, 'docs', 'teacher-guide', 'chapters');
  const chapters = fs.readdirSync(CHAPTER_DIR).filter((f) => f.endsWith('.md'));
  const images = [];
  for (const file of chapters) {
    const text = fs.readFileSync(path.join(CHAPTER_DIR, file), 'utf8');
    for (const m of text.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) images.push({ file, alt: m[1], src: m[2] });
  }

  it('references only images that exist on disk', () => {
    expect(images.length).toBeGreaterThan(30);
    const missing = images
      .filter((img) => !fs.existsSync(path.join(CHAPTER_DIR, img.src)))
      .map((img) => img.file + ' -> ' + img.src);
    expect(missing).toEqual([]);
  });

  it('gives every screenshot alt text a screen reader can use', () => {
    // A screenshot with a filename-shaped or one-word alt is decoration pretending
    // to be content; these are instructional images and must describe the screen.
    const weak = images
      .filter((img) => img.alt.trim().length < 40 || /\.(png|jpg)$/i.test(img.alt.trim()))
      .map((img) => img.file + ': "' + img.alt.slice(0, 40) + '"');
    expect(weak).toEqual([]);
  });
});

describe('tool catalog launch links', () => {
  const CATALOG = read('tool-catalog-data.js');
  const REDIRECTS = read('_redirects');
  const REFERENCE = read('guide/tool-reference.html');

  it('only points at deep links that actually exist in _redirects', () => {
    const slugs = new Set([...REDIRECTS.matchAll(/^\/([a-z0-9-]+) \/app\/\?tool=/gm)].map((m) => m[1]));
    const launched = [...CATALOG.matchAll(/launchHref: 'https:\/\/alloflow-cdn\.pages\.dev\/([a-z0-9-]+)'/g)].map((m) => m[1]);
    expect(launched.length).toBeGreaterThan(10);
    expect(launched.filter((slug) => !slugs.has(slug))).toEqual([]);
  });

  it('uses absolute CDN URLs, because the deep links 404 on GitHub Pages', () => {
    // A relative deep link here would break the promotional site, which is
    // served from Pages and ignores _redirects entirely.
    expect(CATALOG).not.toMatch(/launchHref: '(?!https:\/\/)/);
    expect(REFERENCE).toContain('https://alloflow-cdn.pages.dev/');
  });

  it('renders the launch action ahead of the details link on every linked card', () => {
    const launches = (REFERENCE.match(/tool-reference-card__launch/g) || []).length;
    expect(launches).toBeGreaterThan(10);
    // Primary action first, then a separator, then the details link.
    expect(REFERENCE).toMatch(/tool-reference-card__launch[^<]*>Open the tool<\/a><span aria-hidden="true"> · <\/span><a/);
  });
});

describe('promotional site link integrity', () => {
  const REDIRECTS = read('_redirects');
  const slugs = new Set([...REDIRECTS.matchAll(/^\/([a-z0-9-]+) \/app\/\?tool=/gm)].map((m) => m[1]));
  const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));

  it('never links a tool by bare slug, which only resolves on Cloudflare', () => {
    // GitHub Pages ignores _redirects entirely, so href="water-cycle" is a 404
    // on the promotional site. This has shipped broken twice: once on the home
    // page "Try one tool" cards, once on every "Open instantly" button in the
    // tool catalog. Absolute CDN URLs work on both hosts.
    const offenders = [];
    for (const page of pages) {
      const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
      for (const m of html.matchAll(/href="([a-z0-9-]+)"/g)) {
        if (slugs.has(m[1])) offenders.push(page + ' -> ' + m[1]);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('resolves every relative link to a file that exists', () => {
    const missing = [];
    for (const page of pages) {
      const html = fs.readFileSync(path.join(ROOT, page), 'utf8');
      for (const m of html.matchAll(/href="([^"]+)"/g)) {
        const href = m[1];
        if (/^(https?:|mailto:|#|data:|javascript:)/.test(href)) continue;
        // Strip fragment and query before resolving.
        const file = href.split('#')[0].split('?')[0];
        if (!file || file.includes("' +")) continue;
        const target = path.resolve(ROOT, file);
        if (!fs.existsSync(target) && !fs.existsSync(target + '.html')) missing.push(page + ' -> ' + href);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('teacher guide: educator evaluation claims', () => {
  it('names every framework profile the tool actually ships', () => {
    const profiles = [...registryBlock().matchAll(/name: '([^']+)'/g)].map((match) => match[1]);
    // Derived from the registry, not a hand-list, so a fourth profile fails here.
    expect(profiles.length).toBeGreaterThanOrEqual(3);
    expect(profiles.some((name) => /Portland/i.test(name))).toBe(true);
    for (const name of profiles) {
      const key = /Portland/i.test(name) ? 'Portland' : (/Act 13/i.test(name) ? 'Act 13' : 'Maine PEPG');
      expect(LEADERS, 'chapter 20 never mentions ' + name).toContain(key);
    }
  });

  it('links the manual in the extensionless form every other link uses', () => {
    for (const [label, text] of [['ch20', LEADERS], ['ch17', IT], ['consolidated', CONSOLIDATED]]) {
      expect(text, label).toContain('alloflow-cdn.pages.dev/educator-evaluation-manual');
      expect(text, label).not.toContain('educator-evaluation-manual.html');
    }
  });

  it('tells IT the portal is district-hosted, domain-locked, and free of external egress', () => {
    expect(IT).toContain('district-owned Google account');
    expect(IT).toContain('no external network calls');
    expect(IT).toContain('fails closed');
    expect(IT).toContain('verifyDeploymentIdentity');
    // The zero-egress promise is only true while it is true.
    expect(GS).not.toContain('UrlFetchApp');
  });

  it('frames evaluation records as personnel records rather than FERPA records', () => {
    for (const [label, text] of [['ch20', LEADERS], ['ch17', IT]]) {
      expect(text, label).toMatch(/personnel/i);
      expect(text, label).toMatch(/FERPA/);
    }
  });
});
