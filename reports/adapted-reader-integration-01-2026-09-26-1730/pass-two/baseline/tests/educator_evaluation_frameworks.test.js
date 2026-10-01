// Framework profiles + Article 16 refinements (2026-08-16).
// PA Act 13 stays the default with unchanged behavior; Maine PEPG is a
// configuration whose labels are State-Model defaults and whose category
// weights come from the district plan — never invented.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const src = read('educator_evaluation_source.jsx');
const gs = read(path.join('apps_script', 'educator_evaluation', 'Code.gs'));

describe('framework registry (client)', () => {
  it('defines every profile and defaults to Maine everywhere', () => {
    // Default flipped to Maine on 2026-08-18: this tool is built and piloted in
    // Maine, and the Maine profile is the one that is correct for any Maine
    // district because it mirrors the local PEPG plan rather than assuming one.
    expect(src).toMatch(/pa_act13:/);
    expect(src).toMatch(/maine_pepg:/);
    expect(src).toMatch(/portland_me:/);
    // Blank and sample workspaces both start on Maine.
    expect(src.match(/frameworkProfile: 'maine_pepg'/g).length).toBeGreaterThanOrEqual(2);
    expect(src).not.toMatch(/frameworkProfile: 'pa_act13'/);
    // Normalizer and sanitizer fall back to Maine, never to PA.
    expect(src).toMatch(/AE_FRAMEWORKS\[rawConfig\.frameworkProfile\] \? rawConfig\.frameworkProfile : 'maine_pepg'/);
    expect(src).toMatch(/AE_FRAMEWORKS\.maine_pepg, practiceWeight: null/);
  });

  it('PA weights and bands are unchanged', () => {
    expect(src).toMatch(/const observation = hasBuilding \? 70 : 80;/);
    expect(src).toMatch(/\{ min: 2\.5, label: 'Distinguished' \}/);
    expect(src).toMatch(/\{ min: 1\.5, label: 'Proficient' \}/);
  });

  it('Maine weights are district-entered, never invented — unset means 100% practice with a prompt', () => {
    expect(src).toMatch(/set an SLG split in About if your plan includes one/);
    expect(src).toMatch(/practice === null/);
    // Number(null)=0 guard: raw null/'' short-circuits before Number()
    expect(src).toMatch(/rawWeight != null && String\(rawWeight\) !== ''/);
    expect(src).toMatch(/if \(raw == null \|\| String\(raw\) === ''\) return null;/);
  });

  it('Maine practice composite is an equal average, and the UI says so', () => {
    expect(src).toMatch(/domainWeighted: false/);
    expect(src).toMatch(/four rubric domains average equally in this generic planning profile/);
  });

  it('the render pass refreshes the active framework from workspace config', () => {
    expect(src).toMatch(/aeSetActiveFramework\(workspace\.config\);/);
    expect(src).toMatch(/aeSetActiveFramework\(config\);/);
  });

  it('stamps new and legacy records from the active workspace framework', () => {
    expect(src).toContain('frameworkVersion: next.config.frameworkVersion || AE_ACTIVE_FW.versionTag');
    expect(src.match(/frameworkVersion: aeString\(raw\.frameworkVersion, 80, config\.frameworkVersion\)/g).length).toBeGreaterThanOrEqual(3);
    expect(src).toContain('frameworkVersion: teacher.frameworkVersion || next.config.frameworkVersion || AE_ACTIVE_FW.versionTag');
    expect(src).toContain("frameworkVersion: AE_FRAMEWORKS.maine_pepg.versionTag, frameworkProfile: 'maine_pepg'");
  });

  it('stamps new and unstamped formal observations with the current workspace framework', () => {
    const normalizer = src.slice(src.indexOf('const observations ='), src.indexOf('const statuses ='));
    expect(normalizer).toMatch(/frameworkVersion: aeString\(raw\.frameworkVersion, 80, config\.frameworkVersion\)/);
    expect(normalizer).not.toMatch(/frameworkVersion: aeString\(raw\.frameworkVersion, 80, AE_FRAMEWORK\)/);
    expect(src).toMatch(/frameworkVersion: next\.config\.frameworkVersion \|\| AE_ACTIVE_FW\.versionTag/);
  });

  it('PA-specific copy is gated: PDE/PEERS/Act 13 strings never render on the Maine branch', () => {
    // every remaining PDE/PEERS/Act 13 mention sits inside a pa_act13 conditional
    // or the PA half of a ternary; the Maine halves use PEPG language instead
    expect(src).toMatch(/not an official PEPG summative form/);
    expect(src).toMatch(/teacher-majority steering committee/);
    expect(src).toMatch(/20-A M\.R\.S\.A\. ch\. 508/);
    expect(src).toMatch(/law\.cornell\.edu\/regulations\/maine/);
  });

  it('About offers the framework selector and the Maine split input', () => {
    expect(src).toMatch(/Evaluation framework/);
    expect(src).toMatch(/optional; SLG measures are a district choice under the 2019 amendments/);
  });
});

describe('framework awareness (server)', () => {
  it('config sanitizer carries frameworkProfile and pepgPracticeWeight with null-safe validation', () => {
    expect(gs).toMatch(/var profile = oneOf_\(v\.frameworkProfile \|\| 'maine_pepg', \['pa_act13', 'maine_pepg', 'portland_me'\]/);
    expect(gs).toMatch(/profile === 'maine_pepg' && !\(v\.pepgPracticeWeight == null \|\| String\(v\.pepgPracticeWeight\) === ''\)/);
    expect(gs).toContain('aiReflectionEnabled: !!v.aiReflectionEnabled');
  });

  it('serverWeightProfile_ branches on the profile and threads config at every call site', () => {
    expect(gs).toMatch(/function serverWeightProfile_\(teacher, config\)/);
    expect(gs).toMatch(/Student Learning & Growth/);
    expect(gs.match(/serverWeightProfile_\((?:teacher|old), (?:merged\.config|workspace\.config)\)/g).length).toBeGreaterThanOrEqual(3);
  });

  it('band labels and the released summary explain themselves per framework', () => {
    expect(gs).toMatch(/function eeBandLabel_\(score, frameworkProfile\)/);
    expect(gs).toMatch(/\['Distinguished', 'Effective', 'Developing', 'Ineffective'\]/);
    expect(gs).toMatch(/confirm this label against the plan/);
    expect(gs).toMatch(/fixed statewide cut points/);
  });
});

describe('Portland ME profile (verified from the district guidebook)', () => {
  it('carries the guidebook rating labels and the 22 Portland Framework components', () => {
    expect(src).toMatch(/portland_me:/);
    expect(src).toMatch(/'Novice\/Needs Improvement'/);
    expect(src).toMatch(/\['1f', 'Designing Student Assessments'\]/);
    expect(src).toMatch(/\['3e', 'Demonstrating Flexibility and Responsiveness'\]/);
    expect(src).toMatch(/\['4f', 'Showing Professionalism'\]/);
  });

  it('the categorical roll-up mirrors the guidebook operating principles on BOTH sides', () => {
    for (const text of [src, gs]) {
      expect(text).toMatch(/any domain rated Unsatisfactory/);
      expect(text).toMatch(/two or more domains Excellent, none below Proficient/);
      expect(text).toMatch(/three or more domains at Novice\/Needs Improvement/);
    }
  });

  it('numeric averages never masquerade as the official Portland rating', () => {
    expect(src).toMatch(/by rule, not by averaging/);
    expect(gs).toMatch(/never by averaging/);
    // the composer chip shows the categorical label, not score·band, for Portland
    expect(src).toMatch(/aePortlandPracticeRating\(teacher\.ratings\.domains\) \|\| \{\}\)\.label/);
  });

  it('rating dropdowns take their labels from the active profile', () => {
    expect(src.match(/AE_ACTIVE_FW\.ratingLabels && AE_ACTIVE_FW\.ratingLabels\[rating\.value\]/g).length).toBeGreaterThanOrEqual(3);
  });
});

describe('Article 16 refinements', () => {
  it('16.B: complaint-provenance guidance appears at both evidence entry points', () => {
    expect(src.match(/stems from a parent, student, or other complaint/g)).toHaveLength(2);
  });

  it('16.C: the server bars new records for archived educators (creation only)', () => {
    expect(gs).toMatch(/New records cannot be created for an archived educator/);
    expect(gs).toMatch(/function mergeRecords_\(current, incoming, actor, allowed, kind, frameworkVersion, teachers\)/);
  });

  it('16.A: long-unpublished walkthrough drafts announce their age and the publish-or-clear guidance', () => {
    expect(src).toMatch(/days unpublished/);
    expect(src).toMatch(/outside the educator’s review rights/);
  });
});

describe('era integrity — history never rescored by the active profile', () => {
  it('client trend points score each record under its OWN frameworkVersion', () => {
    expect(src).toMatch(/function aeObservationScoreFor\(ratings, frameworkVersion\)/);
    expect(src).toMatch(/aeObservationScoreFor\(\{ domains \}, snapshot\.frameworkVersion\)/);
    expect(src).toMatch(/aeObservationScoreFor\(\{ domains \}, observation\.frameworkVersion\)/);
  });

  it('finalized teachers export their FROZEN score, never a recompute', () => {
    expect(src).toMatch(/selectedTeacher\.finalizedAt && selectedTeacher\.finalScore != null \? selectedTeacher\.finalScore : aeOverallScore\(selectedTeacher\)/);
  });

  it('server release scoring is framework-aware and stamps the same era tags as the client', () => {
    expect(gs).toMatch(/function serverObservationScore_\(domains, config\)/);
    expect(gs).toMatch(/serverOverallScore_\(teacher, workspace\.config\)/);
    expect(gs).toMatch(/function eeFrameworkTag_\(config\)/);
    expect(gs).toMatch(/teacher\.frameworkVersion = eeFrameworkTag_\(workspace\.config\);/);
    // the client's tags and the server's tags are the same strings
    for (const tag of ['pa-act13-classroom-2021', 'me-pepg-local', 'me-portland-pepg-guidebook-v1']) {
      expect(src).toContain(tag);
      expect(gs).toContain(tag);
    }
  });
});

describe('formative growth snapshot', () => {
  it('exists, is wired for both roles, and audits its export', () => {
    expect(src).toMatch(/const exportGrowthSnapshot = \(\) => \{/);
    expect(src).toMatch(/Growth snapshot \(formative\)/);
    expect(src).toMatch(/Download my growth snapshot/);
    expect(src).toMatch(/Formative growth snapshot exported/);
  });

  it('draws from PUBLISHED records only and never emits ratings or bands', () => {
    const fn = src.slice(src.indexOf('const exportGrowthSnapshot'), src.indexOf('const exportSummary'));
    expect(fn).toMatch(/item\.publishedAt/);
    expect(fn).toMatch(/evidencePublishedAt/);
    expect(fn).toMatch(/contains no ratings/);
    // no band/score machinery inside the snapshot builder
    expect(fn).not.toMatch(/aeBand|aeOverallScore|finalScore|toFixed/);
    // coverage framing is explicitly non-judgmental
    expect(fn).toMatch(/not a judgment about practice/);
  });

  it('derives coverage from evidence tags instead of inventing content', () => {
    const fn = src.slice(src.indexOf('const exportGrowthSnapshot'), src.indexOf('const exportSummary'));
    expect(fn).toMatch(/componentTags/);
    expect(fn).toMatch(/tagCounts/);
  });
});

describe('built outputs carry the framework work', () => {
  it.each([
    'educator_evaluation_module.js',
    path.join('desktop', 'web-app', 'public', 'educator_evaluation_module.js'),
  ])('%s includes both profiles and the Maine copy', (relPath) => {
    const built = read(relPath);
    expect(built).toMatch(/maine_pepg/);
    expect(built).toMatch(/Student Learning & Growth|Student Learning &amp; Growth/);
  });

  it('the regenerated portal bundle includes the framework registry', () => {
    const portal = read(path.join('apps_script', 'educator_evaluation', 'Portal.html'));
    expect(portal).toMatch(/maine_pepg/);
  });
});
