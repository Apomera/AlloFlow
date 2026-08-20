import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (relativePath) => readFileSync(resolve(root, relativePath), 'utf8');
const catalog = JSON.parse(read('docs/manuals/catalog.json'));
const hub = read('manuals.html');
const sitemap = read('sitemap.xml');
const available = catalog.items.filter((item) => item.status === 'available');
const planned = catalog.items.filter((item) => item.status === 'planned');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function cardMarkup(id) {
  const match = hub.match(new RegExp('<article\\s+id="' + escapeRegex(id) + '"[\\s\\S]*?<\\/article>'));
  return match ? match[0] : '';
}

function localPath(href) {
  return decodeURIComponent(href.split('#')[0]);
}

describe('manuals and guides hub', () => {
  it('publishes every available catalog item exactly once', () => {
    const cardIds = Array.from(hub.matchAll(/<article\s+id="([^"]+)"[^>]*data-manual-card/g), (match) => match[1]);
    expect(new Set(cardIds).size).toBe(cardIds.length);
    expect(cardIds.sort()).toEqual(available.map((item) => item.id).sort());

    for (const item of available) {
      const card = cardMarkup(item.id);
      expect(card, item.id + ' card').toContain('<h3>' + item.title.replace('&', '&amp;') + '</h3>');
      expect(card, item.id + ' href').toContain('href="' + item.href + '"');
      for (const audience of item.audiences) {
        expect(card, item.id + ' audience ' + audience).toMatch(new RegExp('data-audience="[^"]*\\b' + audience + '\\b'));
      }
    }
  });

  it('keeps future manuals visibly planned rather than publishing dead links', () => {
    expect(planned.length).toBeGreaterThan(0);
    for (const item of planned) {
      expect(item.href, item.id).toBeUndefined();
      expect(item.currentPath, item.id).toBeTruthy();
      expect(cardMarkup(item.id), item.id).toBe('');
    }
  });

  it('keeps local destinations and canonical sources present', () => {
    for (const item of available) {
      expect(existsSync(resolve(root, item.canonicalSource)), item.id + ' canonical source').toBe(true);
      if (/^https?:\/\//.test(item.href)) continue;
      expect(existsSync(resolve(root, localPath(item.href))), item.id + ' local destination').toBe(true);
    }
  });

  it('offers a progressive, accessible finder without hiding content from no-JavaScript users', () => {
    expect(hub).toContain('data-manual-controls hidden');
    expect(hub).toContain('role="status" aria-live="polite"');
    expect(hub).toContain('aria-label="Filter guides by audience"');
    expect(hub).toContain('src="manuals.js"');
    expect(hub).toContain('href="manuals.css"');
    const script = read('manuals.js');
    expect(script).not.toContain('innerHTML');
    expect(script).toContain('aria-pressed');
    expect(script).toContain('queryTokens.every');
  });

  it('has valid collection structured data and sitemap discovery', () => {
    const block = hub.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(block).toBeTruthy();
    expect(() => JSON.parse(block[1])).not.toThrow();
    expect(sitemap).toContain('https://apomera.github.io/AlloFlow/manuals.html');
    expect(sitemap).toContain('https://apomera.github.io/AlloFlow/docs/dynamic_assessment_guide.html');

    for (const item of available) {
      if (/^https?:\/\//.test(item.href)) continue;
      const destination = localPath(item.href);
      if (!destination.endsWith('.html')) continue;
      expect(sitemap, item.id + ' sitemap entry').toContain('https://apomera.github.io/AlloFlow/' + destination);
    }
  });

  it('links major manuals back to the central hub', () => {
    expect(read('guide/index.html')).toContain('href="../manuals.html">All manuals and guides</a>');
    const dynamic = read('docs/dynamic_assessment_guide.html');
    expect(dynamic).toContain('href="../manuals.html">← All manuals and guides</a>');
    expect(dynamic).toContain('<link rel="canonical" href="https://apomera.github.io/AlloFlow/docs/dynamic_assessment_guide.html">');
    expect(dynamic).toContain('name="twitter:image:alt"');
    const evaluation = read('educator-evaluation-manual.html');
    expect(evaluation).toContain('https://apomera.github.io/AlloFlow/manuals.html">← All manuals and guides</a>');
    expect(evaluation).toContain('<link rel="canonical" href="https://apomera.github.io/AlloFlow/educator-evaluation-manual.html">');
    expect(evaluation).toContain('name="twitter:image:alt"');
  });
});

describe('manual quality guardrails', () => {
  it('documents Universal image style as the default and per-resource style as an override', () => {
    const universal = read('docs/teacher-guide/chapters/11-universal-settings.md');
    const settings = read('docs/teacher-guide/chapters/23-settings-and-help.md');
    expect(universal).toContain('Set image style once unless a resource needs an exception');
    expect(universal).toContain('Override for this resource');
    expect(settings).toContain('Use Universal style');
  });

  it('keeps the specialist guides from repeating the reviewed high-risk claims', () => {
    const dynamic = read('docs/dynamic_assessment_guide.md');
    expect(dynamic).toContain('may not use one measure as the sole criterion');
    expect(dynamic).toContain('34 CFR §300.304');
    expect(dynamic).not.toContain('Eligibility decisions require standardized batteries');
    expect(dynamic).not.toContain('Use only with parent/guardian consent for non-standardized procedures');

    const sel = read('sel_hub/FOR_EDUCATORS.md');
    expect(sel).toContain('local-first does not mean ephemeral in every runtime');
    expect(sel).toContain('data protections for school accounts depend on the Workspace edition');
    expect(sel).not.toContain("Google's default policy restricts Gemini for users under 18");
    expect(sel).not.toContain('everything is gone');
  });
});
