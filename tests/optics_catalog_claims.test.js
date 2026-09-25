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

// Every nav tooltip that states a quantity, with the table its panel shows.
// `desc` is rendered as `title:` on the tab button, so a student hovering the
// tab reads this and then opens a panel printing the real number.
//
// Round 12: the "50+ / 100+ / 120+" literals were all true lower bounds but
// stale (the glossary said 120+ over 456 entries, 38 of them duplicates). Each
// tooltip now reads the length of the same array its panel lists, so no copy
// can promise more (or less) than the tab holds. optics_reference_r12 checks
// the rendered tooltip against the panel's own "Showing N of N".
const CLAIMS = [
  { tab: 'Scientists', table: 'FAMOUS_OPTICIANS', stale: /'\d+\+ optical scientists/ },
  { tab: 'History', table: 'OPTICS_HISTORY', stale: /'\d+\+ optics milestones'/ },
  { tab: 'Instruments', table: 'OPTICAL_INSTRUMENTS', stale: /'\d+\+ telescopes, microscopes/ },
  { tab: 'Lab Kits', table: 'OPTICS_LAB_KITS', stale: /'\d+\+ hands-on experiments'/ },
  { tab: 'Worked Problems', table: 'WORKED_PROBLEMS', stale: /'\d+\+ step-by-step AP problems'/ },
  { tab: 'Careers', table: 'OPTICS_CAREERS', stale: /'\d+\+ optics career paths'/ },
  { tab: 'Glossary+', table: 'GLOSSARY_EXPANDED', stale: /'\d+\+ optics terms with examples'/ },
];

describe('Optics catalogue claims — the tab promises no more than it holds', () => {
  for (const c of CLAIMS) {
    it(`${c.tab} derives its count from the table it shows`, () => {
      expect(SRC, `${c.tab}: a hand-written count is back`).not.toMatch(c.stale);
      expect(SRC, `${c.tab}: the tooltip no longer reads ${c.table}.length`)
        .toContain(".replace('{n}', " + c.table + '.length) },');
      expect(table(c.table), `${c.tab}: the table was renamed`).not.toBeNull();
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
