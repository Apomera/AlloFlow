// Released-evaluation sharing (2026-08-16): a finalized cycle can be shared
// with the educator as a strengths-first, view-only Google Doc. These pins
// hold the contract together across the four layers it spans.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('Code.gs — sharePortalReleasedEvaluation', () => {
  const gs = read(path.join('apps_script', 'educator_evaluation', 'Code.gs'));

  it('exposes the server function with evaluator/admin gating and finalization gate', () => {
    expect(gs).toMatch(/function sharePortalReleasedEvaluation\(request\)/);
    expect(gs).toMatch(/Only an assigned evaluator or administrator can share a released evaluation/);
    expect(gs).toMatch(/must be finalized before the evaluation can be shared/);
  });

  it('shares a single file view-only inside the district domain, never the folder', () => {
    expect(gs).toMatch(/addViewer\(recipient\)/);
    expect(gs).toMatch(/setShareableByEditors\(false\)/);
    expect(gs).toMatch(/emailDomain_\(recipient\) !== allowedDomain/);
    // the folder itself is never shared
    expect(gs).not.toMatch(/releasedEvaluationsFolder_\(\)\.addViewer/);
  });

  it('strengths come first and are the evaluator\'s own words, never generated', () => {
    const docFn = gs.slice(gs.indexOf('function buildReleasedEvaluationDoc_'));
    const strengthsAt = docFn.indexOf('Your strengths');
    const ratingsAt = docFn.indexOf('Your overall rating, in plain language');
    const growthAt = docFn.indexOf('Growth focus');
    const rightsAt = docFn.indexOf('Transparency and your rights');
    expect(strengthsAt).toBeGreaterThan(-1);
    // ordering: strengths → ratings → growth → rights
    expect(strengthsAt).toBeLessThan(ratingsAt);
    expect(ratingsAt).toBeLessThan(growthAt);
    expect(growthAt).toBeLessThan(rightsAt);
    // content sources are the human rationale fields, read from the REAL
    // workspace key (`observations` — `formalObservations` exists nowhere and
    // silently yielded an always-empty strengths section on first write)
    expect(docFn).toMatch(/workspace\.observations \|\| \[\]/);
    expect(docFn).not.toMatch(/formalObservations/);
    expect(docFn).toMatch(/observation\.rationales/);
    expect(docFn).toMatch(/software performs arithmetic only/);
  });

  it('releasedDoc is server-owned: the merge overwrites client values BEFORE the immutability check', () => {
    const overwriteAt = gs.indexOf('next.releasedDoc = old.releasedDoc ? clone_(old.releasedDoc) : null;');
    const immutableAt = gs.indexOf("'A released educator cycle cannot be edited.'");
    expect(overwriteAt).toBeGreaterThan(-1);
    expect(overwriteAt).toBeLessThan(immutableAt);
  });

  it('records the share in the audit log and on the educator record', () => {
    expect(gs).toMatch(/RELEASED_DOC_SHARED/);
    expect(gs).toMatch(/teacher\.releasedDoc = \{ url: built\.url/);
  });
});

describe('Code.gs — 2026-08-16 refinement batch', () => {
  const gs = read(path.join('apps_script', 'educator_evaluation', 'Code.gs'));

  it('releasedDoc and educatorStatement SURVIVE the stored-workspace sanitizer', () => {
    // sanitizeStoredWorkspace_ rebuilds every teacher through sanitizeTeacher_
    // at commit time — a field missing there evaporates before reaching disk
    // (this is exactly how the first releasedDoc write was silently lost).
    const sanitizer = gs.slice(gs.indexOf('function sanitizeTeacher_'), gs.indexOf('function sanitizeReleasedDoc_'));
    expect(sanitizer).toMatch(/releasedDoc:sanitizeReleasedDoc_\(v\.releasedDoc\)/);
    expect(sanitizer).toMatch(/educatorStatement:sanitizeEducatorStatement_\(v\.educatorStatement\)/);
  });

  it('educator statement is teacher-owned: adopted only from the educator\'s own pre-finalization saves', () => {
    expect(gs).toMatch(/actor\.teacherId === id && !old\.finalizedAt/);
    // evaluator saves overwrite the client copy back to the stored value
    expect(gs).toMatch(/next\.educatorStatement = old\.educatorStatement \? clone_\(old\.educatorStatement\) : null;/);
  });

  it('the released-summary open receipt is teacher-only and honestly labeled', () => {
    expect(gs).toMatch(/function recordReleasedSummaryOpened\(request\)/);
    expect(gs).toMatch(/Educator opened the released summary link/);
    const fn = gs.slice(gs.indexOf('function recordReleasedSummaryOpened'), gs.indexOf('function getPortalSetupHealth'));
    expect(fn).toMatch(/actor\.role !== 'teacher'/);
  });

  it('setup health is admin-only and reports counts, never member emails', () => {
    const fn = gs.slice(gs.indexOf('function getPortalSetupHealth'), gs.indexOf('function getPortalCohortStats'));
    expect(fn).toMatch(/requireAdmin_\(\)/);
    expect(fn).toMatch(/educatorsWithoutMemberAccount/);
    expect(fn).not.toMatch(/m\.email|member\.email|\.email\b.*push/);
  });

  it('notification deep link carries only opaque identifiers', () => {
    expect(gs).toMatch(/view=overview&teacher=' \+ encodeURIComponent\(teacherId\)/);
  });

  it('the summary leads with the educator\'s own words and mines published walkthroughs only', () => {
    const docFn = gs.slice(gs.indexOf('function buildReleasedEvaluationDoc_'));
    const ownWordsAt = docFn.indexOf('In your own words');
    const strengthsAt = docFn.indexOf('Your strengths');
    expect(ownWordsAt).toBeGreaterThan(-1);
    expect(ownWordsAt).toBeLessThan(strengthsAt);
    expect(docFn).toMatch(/no one edited it/);
    expect(docFn).toMatch(/w\.publishedAt && safeString_\(w\.interpretation/);
  });
});

describe('portal adapter and client panel', () => {
  it('the Apps Script portal repository wires shareReleasedEvaluation', () => {
    const builder = read('_build_educator_evaluation_apps_script.js');
    expect(builder).toMatch(/shareReleasedEvaluation: sharePortalReleasedEvaluation/);
    expect(builder).toMatch(/\.sharePortalReleasedEvaluation\(request\)/);
    // the generated portal bundle carries it too
    const portal = read(path.join('apps_script', 'educator_evaluation', 'Portal.html'));
    expect(portal).toMatch(/sharePortalReleasedEvaluation/);
  });

  it.each([
    'educator_evaluation_source.jsx',
    'educator_evaluation_module.js',
    path.join('desktop', 'web-app', 'public', 'educator_evaluation_module.js'),
  ])('%s carries the share button, released-doc link, and normalizer passthrough', (relPath) => {
    const src = read(relPath);
    expect(src).toMatch(/shareReleasedEvaluation/);
    expect(src).toMatch(/releasedDoc/);
    // the link renders only for Google Docs URLs
    expect(src).toMatch(/docs\\\.google\\\.com|docs\\.google\\.com/);
    // teachers never see the share button, only the link
    expect(src).toMatch(/role !== ["']teacher["'] && typeof repository\.shareReleasedEvaluation === ["']function["']/);
  });

  it('the demo panel explains the portal setup steps and the mailbox distinction', () => {
    const src = read('educator_evaluation_source.jsx');
    expect(src).toMatch(/Connecting the district portal, step by step/);
    expect(src).toMatch(/separate deployment from the Class Mailbox/);
    expect(src).toMatch(/verifyDeploymentIdentity/);
  });

  it('client wires statement card, workload strip, teacher-lens composer, receipt, and setup health', () => {
    const src = read('educator_evaluation_source.jsx');
    expect(src).toMatch(/AeEducatorStatement/);
    expect(src).toMatch(/Your statement for the record/);
    expect(src).toMatch(/Coming due/);
    expect(src).toMatch(/How your final rating is calculated/);
    expect(src).toMatch(/recordReleasedSummaryOpened/);
    expect(src).toMatch(/AeSetupHealth/);
    // adapter carries the two new repository methods
    const builder = read('_build_educator_evaluation_apps_script.js');
    expect(builder).toMatch(/recordReleasedSummaryOpened: recordPortalReleasedSummaryOpened/);
    expect(builder).toMatch(/getSetupHealth: getPortalSetupHealthClient/);
  });

  it('README documents quick start and the released-summary behavior', () => {
    const readme = read(path.join('apps_script', 'educator_evaluation', 'README.md'));
    expect(readme).toMatch(/## Quick start/);
    expect(readme).toMatch(/## Released evaluation summaries/);
    expect(readme).toMatch(/view-only/);
  });
});
