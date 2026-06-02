// Dino Lab golden master (stem_lab/stem_tool_dinolab.js).
//
// Pins (1) the registration contract, (2) the curated species + feature DATA,
// and (3) the SSR render of all 14 tabs under a fixed deterministic state, so
// the ~5k-line tool can be edited or decomposed with a safety net. A diff here
// means a behavior or data change — re-baseline deliberately with `vitest -u`
// ONLY when the change is reviewed and expected.
//
// It also permanently locks in the 8 paleontology fact-checks applied after the
// adversarial audit (Dimetrodon=Permian, the Orodromeus egg correction, etc.),
// so a future careless edit cannot silently revert them.

import { describe, it, expect, beforeAll } from 'vitest';
import { setupDinoLab, renderTab, baseData, meta, questState, internals, TABS } from './helpers/dino_lab_harness.js';

beforeAll(() => setupDinoLab());
const I = () => internals();

describe('Dino Lab — registration contract', () => {
  it('registers as dinoLab with metadata + quest hooks (snapshot)', () => {
    expect(meta()).toMatchSnapshot();
  });

  it('exposes exactly the 14 expected tabs as working renderers', () => {
    TABS.forEach(tab => {
      const html = renderTab(tab);
      expect(typeof html, tab).toBe('string');
      expect(html.length, tab).toBeGreaterThan(0);
    });
  });
});

describe('Dino Lab — data contract', () => {
  it('species roster (sorted ids) is pinned (snapshot)', () => {
    expect(I().DINOS.map(d => d.id).sort()).toMatchSnapshot();
  });

  it('dataset shape + distributions are pinned (snapshot)', () => {
    const D = I().DINOS;
    const tally = (key) => D.reduce((m, d) => { m[d[key]] = (m[d[key]] || 0) + 1; return m; }, {});
    expect({
      species: D.length,
      periods: I().PERIODS.length, clades: I().CLADES.length, extinctions: I().EXTINCTIONS.length,
      quiz: I().QUIZ.length, sites: I().SITES.length, glossary: I().GLOSSARY.length,
      records: I().RECORDS.length, people: I().PEOPLE.length,
      byPeriod: tally('period'), byDiet: tally('diet'), byGroup: tally('group'),
    }).toMatchSnapshot();
  });

  it('the Tyrannosaurus record is pinned (representative full entry, snapshot)', () => {
    expect(I().byId('tyrannosaurus')).toMatchSnapshot();
  });

  it('has no duplicate species ids', () => {
    const ids = I().DINOS.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every cross-reference resolves (PERIODS.dinos, CLADES.examples, quiz answers)', () => {
    const ids = new Set(I().DINOS.map(d => d.id));
    I().PERIODS.forEach(p => (p.dinos || []).forEach(id => expect(ids.has(id), `PERIODS ${p.id} -> ${id}`).toBe(true)));
    I().CLADES.forEach(c => (c.examples || []).forEach(id => expect(ids.has(id), `CLADES ${c.id} -> ${id}`).toBe(true)));
    I().QUIZ.forEach(q => expect(q.answer >= 0 && q.answer < q.options.length, `QUIZ ${q.id}`).toBe(true));
  });

  it('every species has the full schema with sane values', () => {
    const strFields = ['name', 'common', 'say', 'meaning', 'group', 'clade', 'diet', 'period', 'epoch', 'region', 'formation', 'namedBy', 'blurb', 'uncertain', 'howKnow'];
    const groups = new Set(['theropod', 'sauropod', 'ornithischian', 'other']);
    const diets = new Set(['carnivore', 'herbivore', 'omnivore', 'piscivore', 'insectivore']);
    const periods = new Set(['permian', 'triassic', 'jurassic', 'cretaceous', 'paleogene']);
    I().DINOS.forEach(d => {
      strFields.forEach(f => expect(typeof d[f] === 'string' && d[f].length > 0, `${d.id}.${f}`).toBe(true));
      expect(groups.has(d.group), `${d.id} group`).toBe(true);
      expect(diets.has(d.diet), `${d.id} diet`).toBe(true);
      expect(periods.has(d.period), `${d.id} period`).toBe(true);
      expect(d.myaHi >= d.myaLo, `${d.id} mya order`).toBe(true);
      expect(Array.isArray(d.traits) && d.traits.length > 0, `${d.id} traits`).toBe(true);
      expect(Array.isArray(d.facts) && d.facts.length > 0, `${d.id} facts`).toBe(true);
      expect(d.named >= 1820 && d.named <= 2026, `${d.id} named year`).toBe(true);
    });
  });

  it('every species carries a scientific-integrity pair (how we know + what is uncertain)', () => {
    I().DINOS.forEach(d => {
      expect(d.howKnow.length, `${d.id} howKnow`).toBeGreaterThan(10);
      expect(d.uncertain.length, `${d.id} uncertain`).toBeGreaterThan(10);
    });
  });
});

describe('Dino Lab — audit fact-checks stay fixed (regression lock)', () => {
  it('Dimetrodon is Permian, not Triassic (and stays a non-dinosaur foil)', () => {
    const d = I().byId('dimetrodon');
    expect(d.period).toBe('permian');
    expect(d.group).toBe('other');
  });
  it('Sinosauropteryx etymology uses the -saur- = lizard root', () => {
    expect(I().byId('sinosauropteryx').meaning).toBe('Chinese lizard wing');
  });
  it('Tornieria is authored 1911 (Sternfeld replacement name)', () => {
    expect(I().byId('tornieria').named).toBe(1911);
  });
  it('Becklespinax is an indeterminate allosauroid, not a carcharodontosaur', () => {
    expect(I().byId('becklespinax').clade).toMatch(/allosauroid/i);
  });
  it('Orodromeus no longer claims it laid the spiral eggs (reassigned to Troodon)', () => {
    const d = I().byId('orodromeus');
    const text = (d.blurb + ' ' + d.facts.join(' ') + ' ' + d.uncertain).toLowerCase();
    expect(text).not.toMatch(/neat spirals|carefully arranged eggs/);
    expect(text).toMatch(/troodon/);
  });
  it('Tianyulong / Australovenator / Manidens / Haya ages are corrected + consistent', () => {
    expect(I().byId('tianyulong').epoch).toBe('Late Jurassic');
    expect(I().byId('australovenator').epoch).toBe('Late Cretaceous');
    expect(I().byId('manidens').epoch).toBe('Early Jurassic');
    expect(I().byId('haya').myaHi).toBe(86);
  });
});

describe('Dino Lab — render per tab (golden master)', () => {
  TABS.forEach(tab => {
    it(`renders the ${tab} tab (snapshot)`, () => {
      expect(renderTab(tab)).toMatchSnapshot();
    });
  });

  it('every tab renders deterministically (identical output twice)', () => {
    TABS.forEach(tab => {
      expect(renderTab(tab), tab).toBe(renderTab(tab));
    });
  });
});

describe('Dino Lab — render invariants (the science a student actually sees)', () => {
  it('the explore detail card shows what we know AND what is uncertain', () => {
    const html = renderTab('explore');
    expect(html).toMatch(/How we know/);
    expect(html).toMatch(/not sure about/);
    expect(html).toMatch(/tyrant lizard king/); // T. rex meaning
  });

  it('the Dimetrodon detail is labeled Permian, not Triassic (the foil lesson)', () => {
    const d = baseData('explore');
    d.selected = 'dimetrodon';
    d.query = 'dimetrodon';
    const html = renderTab(d);
    expect(html).toMatch(/Permian/);
    expect(html).not.toMatch(/Triassic · /);
  });

  it('the Bird Link tab teaches that birds are dinosaurs and lists feathered species', () => {
    const html = renderTab('birds');
    expect(html).toMatch(/Birds ARE dinosaurs/);
    expect(html).toMatch(/Microraptor/);
  });

  it('the Ecosystems tab groups a real formation into hunters and plant-eaters', () => {
    const html = renderTab('ecosystem');
    expect(html).toMatch(/Morrison Formation/);
    expect(html).toMatch(/Hunters/);
    expect(html).toMatch(/Plant-eaters/);
  });

  it('Field Notes corrects the "all dinosaurs died out" myth', () => {
    expect(renderTab('notes')).toMatch(/Birds are dinosaurs/i);
  });
});

describe('Dino Lab — quest hooks', () => {
  it('start empty, then complete with the matching progress state (snapshot)', () => {
    const empty = questState({});
    const done = questState({ seen: { a: 1, b: 1, c: 1, d: 1, e: 1 }, digsSolved: 2, quizCorrect: 6, compareA: 'x', compareB: 'y' });
    expect({ empty, done }).toMatchSnapshot();
  });
});
