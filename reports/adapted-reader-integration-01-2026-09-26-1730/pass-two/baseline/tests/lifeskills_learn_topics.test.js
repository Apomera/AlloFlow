import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = 'stem_lab/stem_tool_lifeskills.js';
const MIRROR = 'desktop/web-app/public/stem_lab/stem_tool_lifeskills.js';
const read = (f) => readFileSync(resolve(process.cwd(), f), 'utf8');

/** Bound by the terminating `\n  ];`, never by brace matching — adjacent array
 *  literals in this file sit three lines apart and a matcher merges them. */
function arrayLiteral(src, name) {
  const start = src.indexOf('var ' + name + ' = [');
  if (start === -1) return null;
  const end = src.indexOf('\n  ];', start);
  if (end === -1) return null;
  return src.slice(src.indexOf('[', start), end + 4);
}
// eslint-disable-next-line no-new-func
const load = (src, n) => new Function('return ' + arrayLiteral(src, n) + ';')();

const BANDS = ['K-2', '3-5', '6-8', '9-12'];

describe('Life Skills Lab — Learn topics', () => {
  it('differentiates every topic across all four grade bands', () => {
    // This tool's whole premise is UDL differentiation; a topic missing a band
    // renders nothing for that reader.
    const topics = load(read(SOURCE), 'LEARN_TOPICS');
    expect(topics.length).toBeGreaterThan(20);
    for (const t of topics) {
      for (const b of BANDS) {
        expect(String((t.content || {})[b] || '').trim(), `${t.title} has no ${b} text`)
          .not.toBe('');
      }
    }
  });

  it('sends every "try it" link to a tab that exists', () => {
    // A tryIt naming a tab that was renamed would land the student nowhere.
    const src = read(SOURCE);
    const tabs = [...new Set([...src.matchAll(/tab === '([a-z0-9]+)'/g)].map((m) => m[1]))];
    for (const t of load(src, 'LEARN_TOPICS')) {
      if (t.tryIt) expect(tabs, `${t.title} -> ${t.tryIt}`).toContain(t.tryIt);
    }
  });

  it('teaches a minimum SAFE cooking temperature, not only the chemistry', () => {
    // THE GAP. The Cooking topic taught the danger zone (40-140F) and the reaction
    // temperatures (Maillard 280F, caramelization 320F) but never a minimum safe
    // internal temperature. The 6-8 band did say 160F — labelled "protein
    // denaturation", i.e. texture, not safety. A student could finish the topic
    // without ever learning the numbers that prevent foodborne illness, while the
    // tool's own FOOD_SAFETY table had them all along.
    const src = read(SOURCE);
    const cooking = load(src, 'LEARN_TOPICS').find((t) => /Cooking/.test(t.title));
    expect(cooking).toBeTruthy();
    for (const b of ['3-5', '6-8', '9-12']) {
      expect(String(cooking.content[b]), `${b} states no safe minimum`).toMatch(/165/);
    }
  });

  it('states cooking temperatures that match the FOOD_SAFETY table', () => {
    // Prose and model drifting apart is how this tool taught a standard deduction
    // its own calculator ignored. Pin the agreement.
    const src = read(SOURCE);
    const table = load(src, 'FOOD_SAFETY');
    const poultry = table.find((f) => /Poultry/i.test(f.food));
    const ground = table.find((f) => /Ground meat/i.test(f.food));
    const whole = table.find((f) => /Beef steaks/i.test(f.food));
    expect(poultry.tempF).toBe(165);
    expect(ground.tempF).toBe(160);
    expect(whole.tempF).toBe(145);

    const cooking = load(src, 'LEARN_TOPICS').find((t) => /Cooking/.test(t.title));
    const prose = BANDS.map((b) => String(cooking.content[b] || '')).join(' ');
    for (const temp of [poultry.tempF, ground.tempF, whole.tempF]) {
      expect(prose, `prose never states ${temp}F`).toContain(String(temp));
    }
  });

  it('does not let the denaturation temperature read as a safety threshold', () => {
    // 160F appears twice in the 6-8 band for two different reasons. The text has to
    // say which is which, or the chemistry number reads as the safety rule.
    const cooking = load(read(SOURCE), 'LEARN_TOPICS').find((t) => /Cooking/.test(t.title));
    const band = String(cooking.content['6-8']);
    expect(band).toMatch(/protein denatur/i);
    expect(band).toMatch(/safety thresholds, not the same thing/i);
  });

  it('keeps the tax figures in the prose equal to the code constants', () => {
    // The Learn text stated the standard deduction while calcFedTax ignored it, for
    // as long as both existed. Prose is a spec the model must satisfy.
    const src = read(SOURCE);
    const consts = src.match(/var STD_DEDUCTION = \{[^}]*\}/)[0];
    const cap = src.match(/var SS_WAGE_CAP = (\d+)/)[1];
    const prose = load(src, 'LEARN_TOPICS')
      .map((t) => Object.values(t.content || {}).join(' ')).join(' ');
    expect(consts).toContain('14600');
    expect(prose).toMatch(/14,600/);
    expect(cap).toBe('168600');
    expect(prose).toMatch(/168,600/);
  });

  it('ships the same Learn topics in the desktop mirror', () => {
    expect(arrayLiteral(read(MIRROR), 'LEARN_TOPICS'))
      .toBe(arrayLiteral(read(SOURCE), 'LEARN_TOPICS'));
  });
});
