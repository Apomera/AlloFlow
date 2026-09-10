// School Rewards & Store user manual (2026-09-02).
//
// Mirrors the Educator Evaluation manual's contract: byte-identical mirror in
// the desktop public tree, every referenced figure present in both trees,
// sections that match the tool, registration in the manuals hub catalog, the
// hub page, and the sitemap, and a link from the panel header.

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { JSDOM } from 'jsdom';

const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, 'desktop', 'web-app', 'public');
const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');
const MANUAL = read('school-rewards-manual.html');
const imageSrcs = Array.from(MANUAL.matchAll(/<img src="([^"]+)"/g), (m) => m[1]);

describe('School Rewards manual', () => {
  it('explains unsaved addresses, explicit disconnect, and uncertain new-tab feedback', () => {
    const join = MANUAL.slice(MANUAL.indexOf('id="path-join"'), MANUAL.indexOf('id="path-setup"'));
    for (const text of ['Save address</strong> or <strong>Discard', 'before opening the Store, opening its deployment check or sharing its link', 'Saving a blank field does not disconnect', 'separate <strong>Disconnect</strong> action', 'cannot tell whether the tab opened or Google accepted the account', 'direct fallback link']) {
      expect(join, text).toContain(text);
    }
    expect(MANUAL).toContain('These actions stay unavailable while the address has unsaved changes');
    expect(MANUAL).not.toContain('The portal was blocked:</strong> allow pop-ups');
    expect(MANUAL).toContain('opening a link does not verify access.');
  });

  it('distinguishes failed local settings saves from failed address saves and from role verification', () => {
    expect(MANUAL).toContain('id="setup-storage-warning"');
    expect(MANUAL).toContain('href="#setup-storage-warning"');
    expect(MANUAL).toContain('visible browser-storage warning');
    expect(MANUAL).toContain('Retry saving');
    expect(MANUAL).toContain('Setup-form and checklist changes are kept in this tab only and may be lost on reload');
    expect(MANUAL).toContain('If saving an address or disconnecting fails, the previous saved address stays in place');
    expect(MANUAL).toContain('an edited new address remains unsaved');
    expect(MANUAL).toContain('Retrying local storage does not rerun setup, change Google permissions or verify a deployment');
    expect(MANUAL).toContain('recorded-activity checks, not proof that every intended role has been tested');
    expect(MANUAL).toContain('an administrator can record an award too');
    expect(MANUAL).not.toContain('their sign-in and role are proven');
  });

  it('keeps the five fixed local troubleshooting topics identical to the shared guide', () => {
    const guide = runInNewContext(read('school_store_setup_guide.js') + ';createSchoolStoreSetupGuide();');
    const document = new DOMParser().parseFromString(MANUAL, 'text/html');
    const topics = guide.getTroubleshooting();
    expect(topics.map(topic => topic.id)).toEqual(['new-tab', 'sign-in', 'role-access', 'address', 'connections']);
    expect(document.querySelectorAll('[data-troubleshooting-topic]')).toHaveLength(5);
    for (const topic of topics) {
      const title = document.querySelector('[data-troubleshooting-topic="' + topic.id + '"]');
      expect(title.textContent).toBe(topic.title);
      expect(title.nextElementSibling.textContent).toBe(topic.body);
      expect(document.getElementById(topic.manualHash)).not.toBeNull();
    }
    expect(document.querySelector('#opening-store-help').textContent).toBe('Help opening your Store');
    expect(MANUAL).toContain('It starts collapsed and does not inspect a Google page, send the request to AI, collect student data, grant access or change settings');
  });

  it('keeps narrow setup tables readable and linked headings clear of the reading toolbar', () => {
    expect(MANUAL).toContain('html{scroll-padding-top:calc(var(--reading-tools-height, 0px) + 14px);}');
    expect(MANUAL).toContain('@media screen and (max-width:600px){.setup-states table{min-width:620px;}');
    const dom = new JSDOM(MANUAL, {
      runScripts: 'dangerously',
      beforeParse(window) {
        window.HTMLElement.prototype.getBoundingClientRect = function () {
          return { height: this.id === 'rtools' ? (window.document.querySelector('#rtools-panel')?.hidden ? 42 : 168) : 0 };
        };
      },
    });
    try {
      const document = dom.window.document;
      const offset = () => document.documentElement.style.getPropertyValue('--reading-tools-height');
      expect(offset()).toBe('42px');
      document.querySelector('#rt-toggle').click();
      expect(offset()).toBe('168px');
      document.querySelector('#rt-toggle').click();
      expect(offset()).toBe('42px');
      document.querySelector('#rtools-panel').hidden = false;
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(offset()).toBe('168px');
      const table = document.querySelector('.setup-states');
      expect(table.tabIndex).toBe(0);
      expect(table.getAttribute('role')).toBe('region');
      expect(table.getAttribute('aria-label')).toContain('Scroll horizontally if needed.');
      expect(document.querySelector('.table-scroll-hint').textContent).toContain('Scroll the table sideways');
    } finally { dom.window.close(); }
  });

  it('offers the same practice, join, and school-setup paths as the shared local guide', () => {
    const guide = runInNewContext(read('school_store_setup_guide.js') + '\ncreateSchoolStoreSetupGuide();');
    const dom = new JSDOM(MANUAL), document = dom.window.document;
    try {
      expect(guide.getPaths().map(item => item.id)).toEqual(['practice', 'join', 'setup']);
      for (const entry of guide.getPaths()) {
        const heading = document.querySelector('[data-guide-path="' + entry.id + '"]');
        expect(heading, entry.id).not.toBeNull();
        expect(heading.textContent).toBe(entry.title);
        expect(document.querySelector('a[href="#' + heading.id + '"]'), entry.id).not.toBeNull();
      }
      const joinList = document.querySelector('#path-join').nextElementSibling.nextElementSibling;
      expect(joinList.tagName).toBe('OL');
      expect(joinList.children).toHaveLength(4);
      for (const step of guide.getPath('join').steps) expect(joinList.textContent).toContain(step.title);
      expect(document.querySelector('#school-setup-checklist').children).toHaveLength(10);
      expect(MANUAL).toContain('You do not need to create an Apps Script project.');
      expect(MANUAL).toContain('not something every teacher repeats');
    } finally { dom.window.close(); }
  });

  it('distinguishes a saved URL, human-confirmed verification, and district approval', () => {
    for (const text of [
      'URL saved', 'Human-confirmed deployment verification', 'District review',
      'Saving is not deployment verification.', 'AlloBot cannot certify the separate page.',
      'A local checkbox does not grant Google permission or prove approval.',
      'approved accounts and fictional records', 'Save the approved deployment URL.',
      'does not publish code, grant access or establish that the deployment works.',
      'If Google shows a warning or district policy blocks access, stop and consult IT; do not bypass the warning.',
    ]) expect(MANUAL, text).toContain(text);
    expect(MANUAL).not.toMatch(/click Advanced|Go to AlloFlow School Rewards \(unsafe\)|Approve the scopes once|then Allow/i);
  });

  it('explains the local AlloBot setup route without assigning it authority or private data', () => {
    const section = MANUAL.slice(MANUAL.indexOf('id="allobot-setup-help"'), MANUAL.indexOf('</div>', MANUAL.indexOf('id="allobot-setup-help"')));
    expect(section).toContain('Help me set up School Store');
    expect(section).toContain('handled locally');
    expect(section).toContain('an explicit guide action opens the existing School Store panel');
    expect(section).toContain('does not send the setup request to AI, handle student data, authorize Google permissions, create a project, run setup, deploy code or write to the points ledger');
    expect(section).toContain('approved URL only in the connection field');
  });

  it('keeps public practice distinct from an own-server local demo and unsent email preview', () => {
    const section = MANUAL.slice(MANUAL.indexOf('id="local-guided-demo"'), MANUAL.indexOf('<h2 id="setup">'));
    expect(MANUAL).toContain('href="https://alloflow-cdn.pages.dev/school-rewards-practice"');
    expect(section).toContain('npm run demo:alloflow');
    expect(section).toContain('their own AlloFlow repository checkout and its existing dependencies');
    expect(section).toContain('on that same computer');
    expect(section).toContain('it is not a public demo link for colleagues');
    expect(section).toContain('60 &rarr; 65 &rarr; 55');
    expect(section).toContain('Preview student email');
    expect(section).toContain('DEMO EMAIL — NOT SENT');
    expect(section).toContain('no message is delivered');
    expect(section).toContain('does not establish live email delivery');
    expect(MANUAL).not.toMatch(/href=["']https?:\/\/(?:127\.0\.0\.1|localhost)/);
    expect(JSON.parse(read('package.json')).scripts['demo:alloflow']).toContain('school_rewards_admin_demo.mjs');
  });

  it('describes reviewed class links and bounded draft dictation without automatic awards', () => {
    const section = MANUAL.slice(MANUAL.indexOf('id="reviewed-class-links"'), MANUAL.indexOf('<h2 id="printlab">'));
    for (const text of [
      'Store review file', 'Preserve these stable identities', 'manually match each intended learner',
      'Historical associations remain retained', 'new or empty AlloFlow class', 'not repeat synchronization',
      'Review typed recognition', 'Use this student in the award form', 'confirm the award separately',
      'Start on-device dictation', 'already installed language pack', '15 seconds including the readiness check',
      'fills editable text only', 'no cloud fallback or automatic language-pack installation',
      'ordinary AlloBot microphone', 'Real microphone support in a particular Apps Script deployment remains unverified',
    ]) expect(section, text).toContain(text);
    const guides = ['school_store_class_links.md', 'google_classroom_import.md', 'google_workspace_connections.md', 'school_store_typed_recognition.md', 'school_store_voice_awards.md'];
    for (const guide of guides) {
      expect(section).toContain('href="docs/' + guide + '"');
      expect(fs.existsSync(path.join(ROOT, 'docs', guide))).toBe(true);
      expect(fs.existsSync(path.join(PUBLIC, 'docs', guide))).toBe(true);
    }
  });

  it('labels retained screenshots rather than presenting older setup badges as verification evidence', () => {
    expect(MANUAL).toContain('Earlier setup-panel screenshot');
    expect(MANUAL).toContain('Earlier launcher screenshot');
    expect(MANUAL).toContain('Connected badge does not itself prove deployment verification');
  });

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
