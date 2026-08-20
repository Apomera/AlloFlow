// Educator Evaluation is IN SERVICE, not a demo (2026-08-17, Aaron's call).
//
// The tool shipped with prototype-era framing: a role switcher labelled "Demo
// role view", a blank workspace that invited "fictional test entries as you
// explore", a step hint about switching views "to demonstrate submission", and
// a header calling the whole thing an MVP/prototype. A principal running a real
// evaluation year should never be told the instrument is a toy.
//
// The hard part is the line this test defends in BOTH directions. Removing
// demo framing must not slide into overclaiming, so two statements must
// survive every future edit: AlloFlow adds no encryption of its own (it
// inherits the device's), and no deployment makes this a state-approved
// instrument. Both are true; asserting otherwise would be a false claim about
// security and about regulatory approval.
//
// What this file does NOT assert any more (corrected 2026-08-17): that the
// on-device workspace is unfit for real personnel records. It is fit — storage
// is scoped to the signed-in profile, encrypted at rest by managed devices,
// and never uploaded. What the district portal adds is shared authenticated
// access and a retained, discoverable store: records MANAGEMENT, not
// confidentiality. Note also that these are PERSONNEL records, so FERPA is the
// wrong lens; state personnel law, the CBA, and retention policy govern.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const source = read('educator_evaluation_source.jsx');
const built = read('educator_evaluation_module.js');
const standalone = read('educator_evaluation_standalone.js');
const portal = read('apps_script/educator_evaluation/Portal.html');

describe('demo-era framing is gone', () => {
  const BANNED = [
    ['Demo role view', 'the evaluator/educator switch is a real view control, not a demo toy'],
    ['fictional test entries', 'a blank workspace is for real work, not pretend entries'],
    ['to demonstrate submission', 'the step hint should tell a principal what to DO'],
    ['workflow prototype', 'the tool is in service'],
    ['workflow MVP', 'the tool is in service'],
  ];
  for (const [needle, why] of BANNED) {
    it(`no "${needle}" — ${why}`, () => {
      expect(source).not.toContain(needle);
      expect(built).not.toContain(needle);
    });
  }
});

describe('the boundaries that are TRUE stay put (this is not a confidence edit)', () => {
  it('the encryption boundary is stated honestly, without the old overclaim', () => {
    // Revised 2026-08-17. The prior wording ("not secure personnel records")
    // implied the tool was unfit for real data. On a managed 1:1 fleet the
    // real posture is: profile-scoped, never uploaded, and protected by the
    // DEVICE rather than by anything AlloFlow adds. That last clause is the
    // part IT needs, so it is what this pins — the sentence may be reworded,
    // but the tool must never imply it encrypts data it does not encrypt.
    expect(source).toMatch(/no encryption of its own|rather than by encryption AlloFlow adds|rather than by separate encryption/i);
    expect(source).toMatch(/never uploaded/i);
    expect(source).toMatch(/signed-in (?:browser )?profile/i);
  });
  it('the tool still refuses to imply state approval of the instrument', () => {
    expect(source).toMatch(/approved form|state-approved|PDE approves/i);
  });
  it('the portal is still named as where authorized, shared records live', () => {
    expect(source).toMatch(/district portal/i);
    expect(source).toMatch(/LEA authorizes|district-authorized|authorizes its deployment/i);
  });
  it('the simulated-data option is still labelled as simulated', () => {
    // Removing demo framing must not disguise the sample workspace itself.
    expect(source).toContain('Simulated data');
    expect(source).toMatch(/simulated data|fictional school roster/i);
  });
});

describe('the manual is reachable from inside the app', () => {
  const URL = 'https://alloflow-cdn.pages.dev/educator-evaluation-manual';
  it('a persistent header link, not only the one buried in the Setup tab', () => {
    expect(source).toContain('data-help-key="ae_manual_link"');
    const at = source.indexOf('data-help-key="ae_manual_link"');
    const tag = source.slice(source.lastIndexOf('<a', at), source.indexOf('</a>', at));
    expect(tag).toContain(URL);
    expect(tag).toContain('target="_blank"');
    expect(tag).toContain('rel="noopener noreferrer"');
    expect(tag, 'a new-tab link must say so in its accessible name').toMatch(/opens in a new tab/i);
  });
  it('every surface points at the SAME url (one manual, one address)', () => {
    const urls = new Set();
    for (const text of [source, portal]) {
      for (const m of text.matchAll(/https:\/\/alloflow-cdn\.pages\.dev\/educator-evaluation-manual[^"'\s<)]*/g)) {
        urls.add(m[0].split('#')[0]);
      }
    }
    expect([...urls]).toEqual([URL]);
  });
  it('the link survives the build into both shipped bundles', () => {
    expect(built).toContain(URL);
    expect(standalone).toContain(URL);
  });
  it('the manual file it points at exists and covers the whole workflow', () => {
    const manual = read('educator-evaluation-manual.html');
    for (const section of ['Quick Start', 'Framework Profiles', 'Setting Up the District Portal',
      'Privacy, Records, and Boundaries', 'Troubleshooting']) {
      expect(manual).toContain(section);
    }
  });
});

describe('the teacher view holds up when a principal demos it', () => {
  it('the About panel heading follows the About tab, and does not tell an educator to configure', () => {
    // One panel, two tab labels: "Setup" (evaluator) and "About" (educator).
    // The heading used to say "Setup, sources, and sharing" in both, so the
    // teacher view a principal shows off opened a config screen under About.
    expect(source).toContain("role === 'teacher' ? 'About this workspace'");
    const at = source.indexOf("role === 'teacher' ? 'About this workspace'");
    const block = source.slice(at, at + 420);
    expect(block).toMatch(/Where your records live/);
    expect(block, 'the evaluator wording must still be there for evaluators')
      .toContain('Setup, sources, and ');
  });
  it('both roles still get the same tab ids, so no panel becomes unreachable', () => {
    const at = source.indexOf("const tabs = role === 'teacher' ?");
    const block = source.slice(at, at + 700);
    const teacherIds = [...block.slice(0, block.indexOf('] : [')).matchAll(/\['(\w+)',/g)].map((m) => m[1]);
    const evaluatorIds = [...block.slice(block.indexOf('] : [')).matchAll(/\['(\w+)',/g)].map((m) => m[1]);
    expect(teacherIds.length).toBeGreaterThan(5);
    expect(new Set(teacherIds)).toEqual(new Set(evaluatorIds.filter((id) => id !== 'staff')));
  });
});
