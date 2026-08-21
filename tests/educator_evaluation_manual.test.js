import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'desktop', 'web-app', 'public');
const MANUAL = fs.readFileSync(path.join(ROOT, 'educator-evaluation-manual.html'), 'utf8');
const MIRROR = fs.readFileSync(path.join(PUBLIC, 'educator-evaluation-manual.html'), 'utf8');
const SOURCE = fs.readFileSync(path.join(ROOT, 'educator_evaluation_source.jsx'), 'utf8');
const GS_SOURCE = fs.readFileSync(path.join(ROOT, 'apps_script', 'educator_evaluation', 'Code.gs'), 'utf8');
// The manual's own voice is the prose only: not the quoted Code.gs summary, and
// not script blocks, whose comments are code written by whoever owns them.
const PROSE = MANUAL
  .replace(/<section class="doc"[\s\S]*?<\/section>/g, '')
  .replace(/<script[\s\S]*?<\/script>/g, '');

const imageTags = [...MANUAL.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
const imageSrcs = imageTags.map((tag) => (tag.match(/src="([^"]+)"/) || [])[1]);

describe('educator evaluation user manual', () => {
  it('is mirrored byte-identically into the web-app public tree', () => {
    expect(MIRROR).toBe(MANUAL);
  });

  it('is a well-formed standalone page', () => {
    expect(MANUAL).toMatch(/^<!DOCTYPE html>/);
    expect(MANUAL).toContain('<html lang="en">');
    expect(MANUAL).toContain('<h1>Educator Growth &amp; Evaluation: User Manual</h1>');
    expect(MANUAL).toContain('<meta name="viewport"');
  });

  it('covers all three record paths and how to choose between them', () => {
    expect(MANUAL).toContain('Private, principal-managed, and district-hosted paths');
    expect(MANUAL).toContain('Principal Drive helper');
    expect(MANUAL).toContain('alloflow-cdn.pages.dev/educator-evaluation');
    expect(MANUAL).toContain('Setting Up the District Portal');
    expect(MANUAL).toContain('setupEvaluationRepository');
    expect(MANUAL).toContain('verifyDeploymentIdentity');
    expect(MANUAL).toContain('Execute as: Me');
    for (const name of ['Code.gs', 'Index.html', 'Portal.html', 'appsscript.json']) {
      expect(MANUAL).toContain(`educator_evaluation/${name}`);
    }
    expect(MANUAL).toContain('function runDistrictSetupOnce()');
  });

  it('documents the ten-step cycle with the tracker labels the tool actually renders', () => {
    for (const step of ['Assigned', 'Prework', 'Pre-conference', 'Observation', 'Evidence review',
      'Reflection', 'Post-conference', 'Ratings', 'Acknowledged', 'Finalized']) {
      expect(MANUAL).toContain(step);
    }
    expect(MANUAL).toContain('ten-step');
    // The tracker labels are the product's, so drift in either direction is a bug.
    expect(SOURCE).toContain('Evidence review');
    expect(SOURCE).toContain('Post-conference');
  });

  it('has a section for the educators being evaluated, naming their own tabs', () => {
    expect(MANUAL).toContain('For Educators Being Evaluated');
    for (const tab of ['My evaluation', 'My trends', 'My evidence', 'Timeline']) {
      expect(MANUAL).toContain(tab);
      expect(SOURCE).toContain(tab);
    }
    expect(MANUAL).toContain('Acknowledging a record means you have seen it, not that you agree with it.');
  });

  it('explains Drive sharing, receipts, and content-free notifications accurately', () => {
    expect(MANUAL).toContain('Google Doc');
    expect(MANUAL).toContain('viewer');
    expect(MANUAL).toContain('link-opened receipt');
    expect(MANUAL).toContain('not that the document was read, understood, or actually received');
    expect(MANUAL).toContain('content-free');
    expect(MANUAL).toContain('never a silent background job');
  });

  it('keeps the honest privacy and records boundaries', () => {
    expect(MANUAL).toContain('Where information goes and what triggers it');
    expect(MANUAL).toContain('AI provider configured in AlloFlow');
    expect(MANUAL).toContain('Google Drive is asked to notify the recipient');
    expect(MANUAL).toContain('Names-limited is not anonymous');
    expect(MANUAL).toContain('Role switching and Educator preview are not authentication');
    expect(MANUAL).toContain('The district decides the official record');
    expect(PROSE).not.toMatch(/nothing is uploaded, ever|all data stays inside/i);
    expect(MANUAL).toContain('not legal or contractual advice');
    expect(MANUAL).not.toMatch(/demonstration/i);
  });

  it('leads with strengths and the educator statement', () => {
    expect(MANUAL).toContain('strengths-first');
    expect(MANUAL).toContain('educator statement');
    expect(MANUAL).toContain('ahead of any ratings');
  });

  it('defines the jargon it uses', () => {
    for (const term of ['SPM', 'SLO', 'PEPG', 'Framework snapshot', 'Acknowledgment']) {
      expect(MANUAL).toContain(`<dt>${term}</dt>`);
    }
  });

  it('ships every referenced screenshot in both trees', () => {
    expect(imageSrcs.length).toBeGreaterThanOrEqual(6);
    for (const src of imageSrcs) {
      expect(src).toMatch(/^educator-evaluation-manual-assets\//);
      expect(fs.existsSync(path.join(ROOT, src))).toBe(true);
      expect(fs.existsSync(path.join(PUBLIC, src))).toBe(true);
      const local = fs.readFileSync(path.join(ROOT, src));
      expect(fs.readFileSync(path.join(PUBLIC, src)).equals(local)).toBe(true);
      expect(local.length).toBeGreaterThan(1024);
    }
  });

  it('keeps assets out of a folder that shadows the page URL', () => {
    // The page is served extensionless at /educator-evaluation-manual. A sibling
    // directory of the SAME name makes that URL ambiguous (file or directory?)
    // and can break every relative image path once deployed.
    for (const tree of [ROOT, PUBLIC]) {
      expect(fs.existsSync(path.join(tree, 'educator-evaluation-manual.html'))).toBe(true);
      expect(fs.existsSync(path.join(tree, 'educator-evaluation-manual'))).toBe(false);
    }
  });

  it('gives every screenshot descriptive alt text, dimensions, and lazy loading', () => {
    for (const tag of imageTags) {
      const alt = (tag.match(/alt="([^"]*)"/) || [])[1];
      expect(alt, tag).toBeTruthy();
      expect(alt.length, alt).toBeGreaterThan(60);
      expect(tag).toMatch(/width="\d+"/);
      expect(tag).toMatch(/height="\d+"/);
      expect(tag).toContain('loading="lazy"');
    }
    // Every figure carries a caption as well as alt text.
    expect((MANUAL.match(/<figcaption>/g) || []).length).toBe(imageTags.length);
  });

  it('adapts to dark scheme and to print', () => {
    expect(MANUAL).toContain('@media (prefers-color-scheme: dark)');
    expect(MANUAL).toContain('@media print');
    expect(MANUAL).toMatch(/body\{margin:0;background:var\(--bg\)/);
    expect(MANUAL).toContain('figure.phone-shot img');
    expect(MANUAL).toContain('beforeprint');
  });

  it('keeps the manual reading controls labelled, keyboard-capable, and outside headings', () => {
    expect(MANUAL).toContain('min-width:28px;min-height:28px');
    expect(MANUAL).toContain("'Read section aloud: ' + sectionLabel");
    expect(MANUAL).toContain("h2.insertAdjacentElement('afterend', btn)");
    expect(MANUAL).toContain("n.querySelectorAll('p, li, dt, dd, h3, h4, caption, th, td, figcaption')");
    expect(MANUAL).toContain("wrap.setAttribute('role', 'region')");
    expect(MANUAL).toContain("on('rt-ruler', 'keydown'");
    expect(PROSE).not.toMatch(/zero violations/i);
  });

  it('uses no em dashes or en dashes in its own prose', () => {
    expect(PROSE).not.toMatch(/[–—]/);
  });

  it('quotes a real released summary rather than an invented one', () => {
    const sample = (MANUAL.match(/<section class="doc"[\s\S]*?<\/section>/) || [])[0];
    expect(sample).toBeTruthy();
    // Every heading below is emitted by buildReleasedEvaluationDoc_ in Code.gs;
    // if the document is reworded, this sample has to be re-dumped.
    for (const heading of ['In your own words', 'Your strengths', 'Growth focus',
      'Transparency and your rights', 'Your overall rating, in plain language']) {
      expect(sample).toContain(heading);
      expect(GS_SOURCE).toContain(heading);
    }
    // The order is the promise: the educator's words lead, strengths precede growth.
    expect(sample.indexOf('In your own words')).toBeLessThan(sample.indexOf('Your strengths'));
    expect(sample.indexOf('Your strengths')).toBeLessThan(sample.indexOf('Growth focus'));
    expect(sample).toMatch(/abridged|two further domains/i);
  });

  it('tells each audience where to start', () => {
    expect(MANUAL).toContain('Where to start');
    expect(MANUAL).toContain('Evaluators and principals:');
    expect(MANUAL).toContain('Educators being evaluated:');
    expect(MANUAL).toContain('District IT and administrators:');
  });

  it('warns that browser data loss erases an on-device workspace, and names the fix', () => {
    expect(MANUAL).toContain('clearing browser data can erase it');
    expect(MANUAL).toContain('Export workspace JSON');
    expect(MANUAL).toContain('Import workspace or educator response');
    expect(MANUAL).toContain('downloads a pre-import checkpoint');
    expect(MANUAL).toContain('Download emergency backup');
    expect(SOURCE).toContain('Export workspace JSON');
    expect(SOURCE).toContain('Download backup and replace workspace');
  });

  it('states the cohort suppression threshold the Trends tab enforces', () => {
    expect(MANUAL).toContain('at least ten eligible peers');
    expect(SOURCE).toContain('eligible peers contribute; small groups are suppressed');
    expect(SOURCE).toContain('const AE_MIN_TREND_COHORT = 10;');
    expect(MANUAL).toContain('must not be the sole basis for personnel decisions');
  });

  it('documents formal-history navigation, conflict recovery, and the references-only artifact boundary', () => {
    expect(MANUAL).toContain('Observation record');
    expect(MANUAL).toContain('Selecting a finalized record opens its locked history');
    expect(MANUAL).toContain('Artifact references are not attachments');
    expect(MANUAL).toContain('does not upload, copy, scan, version, retain, or change access');
    expect(MANUAL).toContain('This record changed in another session');
    expect(MANUAL).toContain('Reapply only my non-conflicting work');
    expect(SOURCE).toContain('File upload, file versioning, and artifact retention are not implemented');
  });

  it('documents the Portland matrix rules and examples that the code actually produces', () => {
    expect(MANUAL).toContain('categorical, not an average');
    // Rule wording is the product's own; drift on either side is a bug.
    for (const rule of ['any domain rated Unsatisfactory',
      'two or more domains Excellent, none below Proficient',
      'three or more domains at Novice/Needs Improvement',
      'no more than two domains below Proficient, none Unsatisfactory']) {
      expect(SOURCE).toContain(rule);
    }
    // Each worked example in the manual is a case pinned in the executed suite.
    for (const row of ['0, 3, 3, 3', '3, 3, 2, 2', '3, 3, 1, 2', '1, 1, 1, 2', '2, 2, 2, 2']) {
      expect(MANUAL).toContain(row);
    }
    expect(MANUAL).toContain('until all four domains are rated');
  });

  it('covers phone use and says on-device workspaces do not sync between devices', () => {
    expect(MANUAL).toContain('Using It on a Phone');
    expect(MANUAL).toContain('do not sync between your phone and your laptop');
    // The phone figure must be a portrait capture, not a desktop one relabelled.
    const phone = imageTags.find((tag) => tag.includes('10-phone'));
    expect(phone).toBeTruthy();
    const width = Number((phone.match(/width="(\d+)"/) || [])[1]);
    const height = Number((phone.match(/height="(\d+)"/) || [])[1]);
    expect(height).toBeGreaterThan(width);
  });

  it('is honest that the evaluation workspace is English only for now', () => {
    expect(MANUAL).toContain('available in English only');
    expect(MANUAL).toContain('district policy question');
  });

  it('numbers its sections in order with no gaps or repeats', () => {
    const numbers = [...MANUAL.matchAll(/<h2 id="[^"]+">(\d+)\./g)].map((m) => Number(m[1]));
    expect(numbers).toEqual(numbers.map((value, index) => index + 1));
    // Every contents entry points at a heading that exists.
    const ids = [...MANUAL.matchAll(/<h2 id="([^"]+)"/g)].map((m) => m[1]);
    const links = [...MANUAL.matchAll(/<li><a href="#([^"]+)">/g)].map((m) => m[1]);
    expect(links).toEqual(ids);
  });

  it('repeats the encryption and retention boundaries the tool itself states', () => {
    // educator_evaluation_source.jsx pins these claims against softening; the
    // manual is the other place a reader meets them, so it must agree.
    expect(MANUAL).toContain('AlloFlow adds no encryption of its own');
    expect(SOURCE).toContain('encryption AlloFlow adds');
    expect(MANUAL).toContain('Retention and discoverability apply everywhere');
    expect(MANUAL).toContain('browser profile');
  });

  it('documents simulation language, manual controls, corrections, preview, and undo', () => {
    expect(MANUAL).toContain('Natural language only:');
    expect(MANUAL).toContain('Manual only:');
    expect(MANUAL).toContain('Combined:');
    expect(MANUAL).toContain('clauses it ignored');
    expect(MANUAL).toContain('requested-to-applied correction');
    expect(MANUAL).toContain('Preview changes');
    expect(MANUAL).toContain('Undo last simulation');
  });

  it('keeps the principal-helper setup and operational sequence aligned to the product', () => {
    for (const stage of ['Confirm approval and account', 'Create the private project', 'Replace Code.gs',
      'Add the Index page', 'Enable Drive API v3', 'Deploy privately and save the link',
      'Run the deployment check']) {
      expect(MANUAL).toContain(stage);
      expect(SOURCE).toContain(stage);
    }
    expect(MANUAL).toContain('helper version 3');
    expect(MANUAL).toContain('Review; do not share yet');
    expect(MANUAL).toContain('Filed packets and live access status');
    expect(MANUAL).toContain('Revoke this live access');
  });

  it('is linked from the workspace Setup tab', () => {
    expect(SOURCE).toContain('https://alloflow-cdn.pages.dev/educator-evaluation-manual');
    expect(SOURCE).toContain('User manual: private, principal-managed, and district portal paths');
  });

  it('documents direct next-action navigation and reviewed district configuration', () => {
    for (const phrase of ['Needs your attention', 'Next action', 'Review district configuration',
      'Confirm reviewed configuration', 'Custom rubric boundary', 'ordinary autosave',
      'exactly four unique domain ids', 'preserved in local browser storage']) {
      expect(MANUAL).toContain(phrase);
    }
    expect(SOURCE).toContain('Needs your attention');
    expect(SOURCE).toContain('Review district configuration');
    expect(SOURCE).toContain('Approved rubric boundary');
  });
});
