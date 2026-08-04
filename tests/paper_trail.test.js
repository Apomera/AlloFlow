// PaperTrail — the safety contract for a document-practice tool.
//
// A tool that teaches students to fill in official forms must not, in the
// teaching, train the habit that gets them scammed: typing real personal
// information into whatever box asks for it. These tests pin the fictional
// -identity rule, the danger-field marking, and the "asking for time is
// allowed" spine, because those are the parts a future content edit would
// most plausibly sand off.
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_papertrail.js';
const src = fs.readFileSync(FILE, 'utf8');

describe('PaperTrail — renders and is wired', () => {
  beforeEach(() => resetStemLab());

  it('registers and renders the document picker', () => {
    const cfg = loadTool(FILE, 'paperTrail');
    expect(typeof cfg.render).toBe('function');
    const html = renderTool('paperTrail', {});
    expect(html.length).toBeGreaterThan(400);
    for (const t of ['Job application', 'W-4', 'Apartment lease', 'Medical intake', 'permit', 'IEP meeting invitation']) {
      expect(html).toContain(t);
    }
  });

  it('is registered, tiled, plugin-flagged, aliased and loaded in both ANTI copies', () => {
    const mod = fs.readFileSync('stem_lab/stem_lab_module.js', 'utf8');
    expect(mod).toMatch(/id: 'paperTrail'/);          // catalog tile
    expect(mod).toMatch(/paperTrail: true/);           // _pluginOnlyTools
    expect(mod).toMatch(/paperTrail: 'papertrail/);    // search alias at birth
    for (const anti of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt']) {
      expect(fs.readFileSync(anti, 'utf8'), anti).toContain('stem_lab/stem_tool_papertrail.js');
    }
    expect(fs.readFileSync('build.js', 'utf8')).toContain('stem_lab/stem_tool_papertrail.js');
    // Desktop mirror must exist and match, or the desktop build ships stale.
    expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_papertrail.js', 'utf8')).toBe(src);
  });

  it('every view renders without throwing', () => {
    loadTool(FILE, 'paperTrail');
    for (const state of [
      {}, { view: 'doc', docId: 'jobapp' }, { view: 'doc', docId: 'iep' },
      { view: 'scenarios' }, { view: 'scripts' },
      { view: 'scenarios', scenCurrent: 4, scenDone: { s5: { pick: 'b', ok: true } } }
    ]) {
      const html = renderTool('paperTrail', { paperTrail: state });
      expect(typeof html, JSON.stringify(state)).toBe('string');
      expect(html.length, JSON.stringify(state)).toBeGreaterThan(100);
    }
  });
});

describe('PaperTrail — never-real-data contract', () => {
  beforeEach(() => resetStemLab());

  it('warns against entering real personal information, on the practice surfaces', () => {
    loadTool(FILE, 'paperTrail');
    for (const state of [{}, { view: 'doc', docId: 'w4' }]) {
      const html = renderTool('paperTrail', { paperTrail: state });
      expect(html).toMatch(/never type your real/i);
      expect(html).toMatch(/Sam Rivera/);
    }
  });

  it('the sample identity is unmistakably fictional', () => {
    // A realistic-looking SSN or phone number in a teaching tool is an
    // accident waiting to be copied. Use reserved/blank patterns only.
    expect(src).toMatch(/ssn:\s*'000-00-0000'/);
    expect(src).toMatch(/\(207\) 555-\d{4}/);      // 555 = reserved for fiction
    expect(src).toMatch(/@example\.com/);          // reserved documentation domain
    // And no real-looking SSN anywhere in the file.
    const ssnLike = src.match(/\b(?!000)\d{3}-\d{2}-\d{4}\b/g) || [];
    expect(ssnLike, 'real-looking SSNs present').toEqual([]);
  });

  it('marks the fields that can cost you, and does not over-mark', () => {
    const kinds = [...src.matchAll(/kind:\s*'(\w+)'/g)].map((m) => m[1]);
    for (const k of kinds) expect(['normal', 'watch', 'danger']).toContain(k);
    const danger = kinds.filter((k) => k === 'danger').length;
    expect(danger, 'some fields flagged as costly').toBeGreaterThanOrEqual(4);
    // If everything is a danger, nothing is.
    expect(danger, 'danger flags are selective').toBeLessThan(kinds.length / 2);
    // Signatures must always be flagged — they are the irreversible one.
    expect(src).toMatch(/A signature is a promise|signature is a contract|certifying everything above/i);
  });

  it('teaches that context decides whether an SSN request is normal', () => {
    // The lesson is not "never give your SSN" (a W-4 needs it) but "notice
    // WHO is asking and WHEN". Both halves must survive edits.
    expect(src).toMatch(/available upon offer/i);         // job application: defer
    expect(src).toMatch(/here it IS required and appropriate/i); // W-4: legitimate
    expect(src).toMatch(/Context is what makes an SSN request normal or not/i);
  });
});

describe('PaperTrail — judgment and self-advocacy', () => {
  beforeEach(() => resetStemLab());

  it('every pressure scenario has exactly one protective answer', () => {
    const blocks = src.split(/\{ id: 's\d'/).slice(1);
    expect(blocks.length).toBeGreaterThanOrEqual(5);
    for (const b of blocks) {
      const oks = (b.match(/ok:\s*true/g) || []).length;
      expect(oks, 'one protective option per scenario').toBe(1);
    }
  });

  it('the protective answer is not always in the same position', () => {
    const blocks = src.split(/\{ id: 's\d'/).slice(1);
    const positions = blocks.map((b) => {
      const opts = [...b.matchAll(/ok:\s*(true|false)/g)].map((m) => m[1]);
      return opts.indexOf('true');
    });
    expect(new Set(positions).size, 'answer position varies').toBeGreaterThan(1);
  });

  it('scripts for asking for time are present and unapologetic', () => {
    loadTool(FILE, 'paperTrail');
    const html = renderTool('paperTrail', { paperTrail: { view: 'scripts' } });
    expect(html).toMatch(/Can I take this home/i);
    expect(html).toMatch(/you do not need to apologize/i);
    // The closing reframe: refusal tells you about them, not you.
    expect(html).toMatch(/information about them, not about you/i);
  });

  it('work-rights module teaches the request-driven handoff with real citations', () => {
    loadTool(FILE, 'paperTrail');
    const open = {};
    for (const id of ['cliff', 'accommodation', 'timing', 'decision', 'how', 'systems', 'subminimum']) open[id] = true;
    const html = renderTool('paperTrail', { paperTrail: { view: 'work', workOpen: open } });
    // The core asymmetry students are never told.
    expect(html).toMatch(/REQUEST-DRIVEN/);
    expect(html).toMatch(/undue hardship/i);
    // Pre-offer inquiry rules — the part that changes how an application feels.
    expect(html).toMatch(/Before a job offer/);
    // The service systems that were entirely absent from the platform.
    expect(html).toMatch(/VOCATIONAL REHABILITATION/);
    expect(html).toMatch(/JOB COACH/);
    expect(html).toMatch(/SUPPORTED EMPLOYMENT/);
    // Every citation shown must exist in the ingested ADA corpus.
    const ada = JSON.parse(fs.readFileSync('law_corpus/ada-title-i.json', 'utf8'));
    const have = new Set(ada.sections.map((s) => s.number));
    const cited = [...src.matchAll(/cite:\s*'29 CFR ([\d.,\s]+)'/g)]
      .flatMap((m) => m[1].split(',').map((x) => x.trim()));
    expect(cited.length).toBeGreaterThan(2);
    for (const c of cited) expect(have.has(c), 'ADA corpus has § ' + c).toBe(true);
  });

  it('disclosure is framed as a decision, never a recommendation', () => {
    loadTool(FILE, 'paperTrail');
    const html = renderTool('paperTrail', { paperTrail: { view: 'work', workOpen: { decision: true } } });
    // Scientific-integrity rule: a genuine tradeoff must not be resolved for
    // the student. Both directions must be represented, and the framing must
    // say the choice is theirs.
    expect(html).toMatch(/not required to disclose/i);
    expect(html).toMatch(/Reasons people disclose/);
    expect(html).toMatch(/Reasons people wait/);
    expect(html).toMatch(/no universally right answer/i);
    // The scenario set must NOT score answers right/wrong.
    expect(html).toMatch(/These are not scored/);
    const workBlock = src.slice(src.indexOf('var WORK_SCENARIOS'), src.indexOf('var HELP_SCRIPTS'));
    expect(workBlock, 'work scenarios carry no ok:true/false grading').not.toMatch(/\bok:\s*(true|false)/);
  });

  it('subminimum wage is presented as contested and narrowing, not as normal', () => {
    loadTool(FILE, 'paperTrail');
    const html = renderTool('paperTrail', { paperTrail: { view: 'work', workOpen: { subminimum: true } } });
    expect(html).toMatch(/14\(c\)/);
    expect(html).toMatch(/contested/i);
    expect(html).toMatch(/competitive integrated employment/i);
    // Must not state a phase-out as settled fact — the details are shifting.
    expect(html).toMatch(/still shifting|has been narrowing/i);
  });

  it('the IEP document treats the student as a participant, not a spectator', () => {
    loadTool(FILE, 'paperTrail');
    // Field detail is collapsed until opened, so reveal the rows we assert on.
    const html = renderTool('paperTrail', {
      paperTrail: { view: 'doc', docId: 'iep', revealed: { 'iep:i3': true, 'iep:i5': true } }
    });
    expect(html).toMatch(/YOU should be on this list/);
    expect(html).toMatch(/it is your plan for life after school/i);
    expect(html).toMatch(/What do you want to say/i);
  });
});
