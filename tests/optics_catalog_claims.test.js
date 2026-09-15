import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const SRC = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_optics.js'), 'utf8');

// Read a top-level catalogue table straight out of the source. Several ship as
// a base table plus *_MORE / *_FINAL appended at load time, so a claim has to
// be measured against the CONCATENATED total, not the first table.
function table(name) {
  const open = `  var ${name} = [`;
  const start = SRC.indexOf(open);
  if (start === -1) return null;
  let depth = 0;
  let i = start + open.length - 1;
  for (; i < SRC.length; i += 1) {
    const c = SRC[i];
    if (c === '[') depth += 1;
    else if (c === ']') { depth -= 1; if (depth === 0) break; }
  }
  try {
    return vm.runInNewContext(`(${SRC.slice(start + open.length - 1, i + 1)})`, {});
  } catch {
    return null;
  }
}

function total(...names) {
  return names.reduce((sum, n) => {
    const t = table(n);
    return sum + (Array.isArray(t) ? t.length : 0);
  }, 0);
}

// Every nav tooltip that promises a quantity, with the tables behind it.
// `desc` is rendered as `title:` on the tab button, so a student hovering the
// tab reads this and then opens a panel printing the real number.
//
// ★ The promised number is READ FROM THE SOURCE, never written here. Copying
// it into the test would only assert the test against itself: raising the
// shipped claim to "80+ hands-on experiments" would still pass a test that
// hardcoded 20.
const CLAIMS = [
  { tab: 'Scientists', claim: /'(\d+)\+ optical scientists/, tables: ['FAMOUS_OPTICIANS', 'FAMOUS_OPTICIANS_MORE'] },
  { tab: 'History', claim: /'(\d+)\+ optics milestones'/, tables: ['OPTICS_HISTORY', 'OPTICS_HISTORY_MORE'] },
  { tab: 'Instruments', claim: /'(\d+)\+ telescopes, microscopes/, tables: ['OPTICAL_INSTRUMENTS', 'OPTICAL_INSTRUMENTS_MORE'] },
  { tab: 'Lab Kits', claim: /'(\d+)\+ hands-on experiments'/, tables: ['OPTICS_LAB_KITS', 'OPTICS_LAB_KITS_MORE', 'OPTICS_LAB_KITS_FINAL'] },
  { tab: 'Worked Problems', claim: /'(\d+)\+ step-by-step AP problems'/, tables: ['WORKED_PROBLEMS', 'WORKED_PROBLEMS_MORE', 'WORKED_PROBLEMS_EXTRA'] },
  { tab: 'Careers', claim: /'(\d+)\+ optics career paths'/, tables: ['OPTICS_CAREERS', 'OPTICS_CAREERS_MORE'] },
  { tab: 'Glossary+', claim: /'(\d+)\+ optics terms with examples'/, tables: ['GLOSSARY_EXPANDED', 'GLOSSARY_EXPANDED_MORE', 'GLOSSARY_E_Z', 'GLOSSARY_RZ'] },
];

describe('Optics catalogue claims — the tab promises no more than it holds', () => {
  for (const c of CLAIMS) {
    it(`${c.tab} holds at least what its tooltip promises`, () => {
      const m = SRC.match(c.claim);
      expect(m, `${c.tab}: the claim was reworded — this rule now guards nothing`).toBeTruthy();
      const promise = Number(m[1]);
      const actual = total(...c.tables);
      expect(actual, `${c.tab}: no table resolved — they were renamed`).toBeGreaterThan(0);
      expect(actual,
        `${c.tab} promises ${promise}+ but only ${actual} entries exist`)
        .toBeGreaterThanOrEqual(promise);
    });
  }

  it('the Encyclopedia count is derived, never written into the copy', () => {
    // It promised "120+ optical phenomena" against a database of 72, while the
    // panel printed its real length the moment you opened it. Hardcoding also
    // put the number inside 60+ translated packs, where it can only go stale.
    expect(SRC, 'the stale 120+ literal is back')
      .not.toContain("'120+ optical phenomena'");
    expect(SRC, 'the Encyclopedia tooltip no longer derives its count')
      .toContain("desc: OPTICAL_PHENOMENA_DB.length + ' ' + t('stem.optics.optical_phenomena'");
  });

  it('the derived count matches what the panel reports', () => {
    const dbTotal = total('OPTICAL_PHENOMENA_DB', 'OPTICAL_PHENOMENA_DB_MORE');
    expect(dbTotal).toBeGreaterThan(0);
    // The panel prints `OPTICAL_PHENOMENA_DB.length + ' entries'`, and the
    // tooltip now reads the same array, so the two cannot disagree.
    expect(SRC).toContain("OPTICAL_PHENOMENA_DB.length + ' entries · '");
  });

  it('the Calculators tab lists exactly as many calculators as it claims', () => {
    const hub = SRC.slice(SRC.indexOf('function _renderCalculatorsHub(d, upd, h) {'));
    const listEnd = hub.indexOf('];');
    expect(listEnd).toBeGreaterThan(0);
    const ids = (hub.slice(0, listEnd).match(/\{ id: '/g) || []).length;
    const claim = SRC.match(/'(\d+) interactive calculators \+ visualizers'/);
    expect(claim, 'the calculators claim was reworded').toBeTruthy();
    expect(ids, `the tab claims ${claim[1]} calculators but ${ids} are listed`)
      .toBe(Number(claim[1]));
  });
});
