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
    expect(cards).toContain('fifteen minutes');
    expect(cards).toContain('Up to sixty');
    expect(read('sitemap.xml')).toContain('school-rewards-quick-cards.html');
    expect(read('educator-evaluation-manual.html')).toContain('<h3>Practice first</h3>');
  });

  it('is one click away from the panel header', () => {
    expect(read('school_rewards_source.jsx')).toContain('href="https://alloflow-cdn.pages.dev/school-rewards-manual"');
    expect(read('school_rewards_module.js')).toContain('school-rewards-manual');
  });
});
