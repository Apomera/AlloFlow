// School Rewards & Store user manual (2026-09-02).
//
// Mirrors the Educator Evaluation manual's contract: byte-identical mirror in
// the desktop public tree, every referenced figure present in both trees,
// sections that match the tool, registration in the manuals hub catalog, the
// hub page, and the sitemap, and a link from the panel header.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'desktop', 'web-app', 'public');
const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');
const MANUAL = read('school-rewards-manual.html');
const imageSrcs = Array.from(MANUAL.matchAll(/<img src="([^"]+)"/g), (m) => m[1]);

describe('School Rewards manual', () => {
  it('ships byte-identical in both trees with the shared manual furniture', () => {
    expect(read('desktop', 'web-app', 'public', 'school-rewards-manual.html')).toBe(MANUAL);
    expect(MANUAL).toContain('<html lang="en">');
    expect(MANUAL).toContain('<h1>School Rewards &amp; Store: User Manual</h1>');
    expect(MANUAL).toContain('<nav class="toc" aria-label="Contents">');
    expect(MANUAL).toContain('All manuals and guides');
    // Reading tools and read-aloud come from the same block the evaluation manual uses.
    expect(MANUAL).toContain("$('rt-theme')");
    expect(MANUAL).toContain('speechSynthesis');
  });

  it('covers every part of the tool, in the order a principal meets it', () => {
    const ids = Array.from(MANUAL.matchAll(/<h2 id="([^"]+)">/g), (m) => m[1]);
    expect(ids).toEqual(['what', 'quickstart', 'setup', 'awarding', 'store', 'students', 'classroom', 'printlab', 'admin', 'privacy', 'access', 'troubleshooting', 'glossary']);
    for (const needle of ['runInitialSchoolRewardsSetup', 'Execute as <strong>Me</strong>', 'Deployment check passed', 'up to sixty students', 'fifteen minutes', 'Save for this', 'Recognition worksheet', 'Classroom roster bridge', 'School settings', 'verifySchoolRewardsAuditChain()', 'not legal advice', 'Español']) {
      expect(MANUAL, needle).toContain(needle);
    }
    // Claims that must stay true to the code.
    expect(read('apps_script', 'school_rewards', 'Code.gs')).toContain('var SR_MAX_GROUP_AWARD = 60;');
    expect(read('apps_script', 'school_rewards', 'Code.gs')).toContain('var SR_STAFF_UNDO_MS = 15 * 60 * 1000;');
    expect(read('school_rewards_source.jsx')).toContain('Deployment check passed');
  });

  it('ships every referenced screenshot in both trees, with alt text on each', () => {
    expect(imageSrcs.length).toBeGreaterThanOrEqual(8);
    for (const src of imageSrcs) {
      expect(src).toMatch(/^school-rewards-manual-assets\//);
      const local = fs.readFileSync(path.join(ROOT, src));
      expect(fs.readFileSync(path.join(PUBLIC, src)).equals(local)).toBe(true);
      expect(local.length).toBeGreaterThan(10240);
    }
    for (const img of MANUAL.matchAll(/<img [^>]*>/g)) expect(img[0]).toMatch(/ alt="[^"]{40,}"/);
  });

  it('is registered in the manuals catalog, hub page, and sitemap', () => {
    const catalog = JSON.parse(read('docs', 'manuals', 'catalog.json'));
    const item = catalog.items.find((entry) => entry.id === 'school-rewards-manual');
    expect(item).toBeTruthy();
    expect(item.status).toBe('available');
    expect(item.href).toBe('school-rewards-manual.html');
    const hub = read('manuals.html');
    expect(hub).toContain('<article id="school-rewards-manual" class="manual-card" data-manual-card');
    expect(hub).toContain('"name":"School Rewards & Store Manual"');
    expect(read('sitemap.xml')).toContain('https://apomera.github.io/AlloFlow/school-rewards-manual.html');
  });

  it('teaches practice first and ships the printable quick cards in both trees', () => {
    expect(MANUAL).toContain('<h3>Practice first</h3>');
    expect(MANUAL).toContain('school-rewards-practice');
    expect(MANUAL).toContain('href="school-rewards-quick-cards.html"');
    const cards = read('school-rewards-quick-cards.html');
    expect(read('desktop', 'web-app', 'public', 'school-rewards-quick-cards.html')).toBe(cards);
    expect(cards).toContain('<h2 id="card-staff">');
    expect(cards).toContain('<h2 id="card-cashier">');
    expect(cards).toContain('<h2 id="card-student">');
    expect(cards).toContain('fifteen minutes');
    expect(cards).toContain('Up to sixty');
    expect(read('sitemap.xml')).toContain('school-rewards-quick-cards.html');
    expect(read('educator-evaluation-manual.html')).toContain('<h3>Practice first</h3>');
  });

  it('prints without splitting a card, a diagram, a table, or the at-a-glance box', () => {
    // Verified against real Chromium PDFs by scratch/school-rewards-print-check.cjs:
    // Letter with half-inch margins gives 3 pages for 3 cards and 29 for the manual
    // (measured with every figure decoded; an undecoded run under-reports).
    const cards = read('school-rewards-quick-cards.html');
    expect(cards).toMatch(/\.card\{[^}]*break-inside:avoid/);
    expect(cards).toMatch(/@media print\{\.card\{page-break-after:always\}/);
    expect(MANUAL).toContain('figure.diagram,.glance,.tablewrap{break-inside:avoid;page-break-inside:avoid;}');
    // Tall screenshots stay breakable on purpose so a caption can follow to the next sheet.
    expect(MANUAL).toContain('figure{break-inside:auto;page-break-inside:auto;}');
    expect(MANUAL).toContain('can be printed with your preferred paper size and margins');
  });

  it('keeps every cross-document link and metadata claim true', () => {
    const ids = new Set(Array.from(MANUAL.matchAll(/id="([^"]+)"/g), (m) => m[1]));
    const internal = Array.from(MANUAL.matchAll(/href="#([^"]+)"/g), (m) => m[1]);
    expect(internal.filter((a) => !ids.has(a))).toEqual([]);
    // The built-in Help panel sends each role to its own manual section. A renamed
    // heading id would silently drop the reader at the top of a 29-page document.
    const portal = read('apps_script', 'school_rewards', 'Portal.html');
    const deep = Array.from(portal.matchAll(/school-rewards-manual#([a-z-]+)/g), (m) => m[1]);
    expect(deep.sort()).toEqual(['admin', 'awarding', 'store', 'students']);
    expect(deep.filter((a) => !ids.has(a))).toEqual([]);
    const cardIds = new Set(Array.from(read('school-rewards-quick-cards.html').matchAll(/id="([^"]+)"/g), (m) => m[1]));
    const toCards = Array.from(MANUAL.matchAll(/href="school-rewards-quick-cards\.html#([^"]+)"/g), (m) => m[1]);
    expect(toCards.length).toBeGreaterThan(0);
    expect(toCards.filter((a) => !cardIds.has(a))).toEqual([]);
    // The contents list and the "13 sections" claim describe the same sections.
    const sections = Array.from(MANUAL.matchAll(/<h2 id="([^"]+)"/g), (m) => m[1]);
    const toc = (MANUAL.match(/<nav class="toc"[\s\S]*?<\/nav>/) || [''])[0];
    expect(sections).toHaveLength(13);
    expect(toc.split('<li>').length - 1).toBe(sections.length);
    expect(MANUAL).toContain('<span>' + sections.length + ' sections</span>');
  });

  it('keeps the presenter guide in step with the in-page demo guide', () => {
    // Nothing else covers docs/school_rewards_admin_demo.md, so a change to the
    // practice page can leave the printed route describing a screen that moved.
    const guide = read('docs', 'school_rewards_admin_demo.md');
    const page = read('school-rewards-practice.html');
    const inPage = page.slice(page.indexOf('id="practice-demo-guide"'));
    const steps = Array.from(inPage.slice(0, inPage.indexOf('</ol>')).matchAll(/<li><strong>([^<]+)<\/strong>/g), (m) => m[1].replace(/[:\s]+$/, ''));
    expect(steps.length).toBeGreaterThanOrEqual(6);
    // Every role the in-page route visits is named in the presenter guide.
    for (const role of ['Staff', 'Student', 'Cashier', 'Administrator']) {
      expect(steps.join(' '), 'in-page guide: ' + role).toContain(role);
      expect(guide, 'presenter guide: ' + role).toContain(role);
    }
    // The two capabilities the route now opens with.
    expect(inPage).toContain('Help');
    expect(guide).toContain('**Help**');
    expect(guide).toContain('Español');
    // The figures the demo walkthrough harness asserts at runtime.
    for (const fact of ['9 to 29', '**14**', '20 to 19', 'Shopping day']) {
      expect(guide, fact).toContain(fact);
    }
    expect(guide).toContain('school-rewards-quick-cards.html');
  });

  it('describes the Print Lab default the repository actually ships', () => {
    // Opt-in since 2026-09-05: the repository hides the tab unless the flag is
    // explicitly true, and school_rewards_repository.test.js pins a fresh book
    // to false. Every document has to say so.
    const code = read('apps_script', 'school_rewards', 'Code.gs');
    expect(code).toContain("function printLabEnabled_(config) { return String((config && config.printLabEnabled) || '') === 'true'; }");
    const portal = read('apps_script', 'school_rewards', 'Portal.html');
    expect(portal).toContain('The tab stays hidden until you turn it on here');
    expect(MANUAL).toContain('A new deployment starts with the tab <strong>hidden</strong>');
    expect(read('docs', 'school_rewards_admin_demo.md')).toContain('start with the tab **hidden**');
  });

  it('is one click away from the panel header', () => {
    expect(read('school_rewards_source.jsx')).toContain('href="https://alloflow-cdn.pages.dev/school-rewards-manual"');
    expect(read('school_rewards_module.js')).toContain('school-rewards-manual');
  });
});
