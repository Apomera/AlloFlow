// The Pennsylvania numbers in this tool are set by regulation, not by taste, so
// they are pinned here with the source that fixes them. All four citations were
// fetched and confirmed live on 2026-08-18.
//
//   22 Pa. Code section 19.2a, Classroom Teacher Evaluation
//     Observation and Practice 70 percent, split across four domains:
//     Planning and Preparation 20, Classroom Environment 30, Instruction 30,
//     Professional Responsibilities 20. Student performance data up to 30.
//   PDE/SAS Act 13 toolkit
//     Distinguished 2.50 to 3.00, Proficient 1.50 to 2.49,
//     Needs Improvement 0.50 to 1.49, Failing 0.00 to 0.49.
//   20-A M.R.S.A. section 13704, Elements of system (Maine)
//     "A majority of the steering committee members must be teachers and must
//     be chosen by the local representative of the applicable collective
//     bargaining unit if the teachers ... are covered by a collective
//     bargaining agreement."
//     "Any revisions ... made by the steering committee must be reached by
//     consensus."
//     Rules "may include, but may not require, the use of student learning and
//     growth measures or state assessment results".
//
// If a future edit changes any of these, it is either a regulatory change that
// needs a new citation, or a bug.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'educator_evaluation_source.jsx'), 'utf8');
const GS = fs.readFileSync(path.join(ROOT, 'apps_script', 'educator_evaluation', 'Code.gs'), 'utf8');

describe('Maine PEPG description matches 20-A section 13704', () => {
  const surfaces = [['tool', SOURCE], ['manual', fs.readFileSync(path.join(ROOT, 'educator-evaluation-manual.html'), 'utf8')]];

  it('describes the steering committee the statute actually requires', () => {
    for (const [name, text] of surfaces) {
      expect(text, name).toMatch(/teacher majority/i);
      // The statute conditions bargaining-unit selection on coverage by an
      // agreement; districts without one are not bound by that clause.
      expect(text, name).toMatch(/covered by an agreement/i);
      expect(text, name).toMatch(/consensus/i);
    }
  });

  it('states that student learning and growth measures are a district choice', () => {
    for (const [name, text] of surfaces) {
      expect(text, name).toMatch(/district choice|a district choice rather than a state mandate/i);
      // Never claim Maine mandates them: the statute forbids rules requiring it.
      expect(text, name).not.toMatch(/Maine requires student learning/i);
    }
  });

  it('never presents the Maine profile as anything but a mirror of the local plan', () => {
    for (const [name, text] of surfaces) {
      expect(text, name).toMatch(/never substitutes? for it|district plan governs/i);
    }
  });
});

describe('Pennsylvania Act 13 values match the regulation', () => {
  it('splits Observation and Practice exactly as 22 Pa. Code 19.2a requires', () => {
    const expected = {
      'Planning and Preparation': 20,
      'Classroom Environment': 30,
      'Instruction': 30,
      'Professional Responsibilities': 20,
    };
    const found = {};
    for (const m of SOURCE.matchAll(/label: '([^']+)', weight: (\d+)/g)) {
      if (expected[m[1]] !== undefined) found[m[1]] = Number(m[2]);
    }
    expect(found).toEqual(expected);
    // The four domain weights must still total 100 percent of O&P.
    expect(Object.values(found).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('uses the statewide band cut points from the Act 13 toolkit', () => {
    expect(GS).toContain('2.50 and above is Distinguished');
    expect(GS).toContain('1.50 to 2.49 Proficient');
    expect(GS).toContain('0.50 to 1.49 Needs Improvement');
    expect(GS).toContain('below 0.50 Failing');
  });

  it('keeps the citations themselves in the tool, so a reader can check the claim', () => {
    // A district reviewer will follow these. All four were live on 2026-08-18.
    for (const url of [
      'https://www.pacodeandbulletin.gov/secure/pacode/data/022/chapter19/s19.2a.html',
      'https://www.pdesas.org/Page/Viewer/ViewPage/75',
      'https://www.maine.gov/doe/educators/educatoreval/educator',
      'https://legislature.maine.gov/statutes/20-A/title20-Ach508sec0.html',
      'https://www.law.cornell.edu/regulations/maine/department-05/division-071/chapter-180',
    ]) {
      expect(SOURCE, url).toContain(url);
    }
  });
});
