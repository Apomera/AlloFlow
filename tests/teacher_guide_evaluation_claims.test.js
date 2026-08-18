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
