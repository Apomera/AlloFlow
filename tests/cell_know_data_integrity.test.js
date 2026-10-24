// Cell Simulator — the five Knowledge & History tables are facts shown to K-12
// students. This pins their shape (every row renders, every cross-link resolves),
// the people table holding only people with plausible lifespans, a sorted timeline,
// and specific corrections made in the 2026-10 fact-check, so a later edit cannot
// quietly bring back "Watson & Crick model", "Edward Salmon" or "atomic-scale" TEM.
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const req = createRequire(resolve(process.cwd(), 'tests/_x.js'));
const { parse } = req('acorn');
const SRC = 'stem_lab/stem_tool_cell.js';
let source, T, K;

function tablesFromSource(src) {
  const ast = parse(src, { ecmaVersion: 2022, sourceType: 'script' });
  const want = { CELL_HISTORY: 'history', FAMOUS_BIOLOGISTS: 'biologists', LAB_TECHNIQUES: 'techniques', MICROBIAL_DISEASES: 'diseases', MICRO_ECOLOGY: 'ecology' };
  const out = {}; const seen = {};
  (function walk(n) {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(walk);
    if (n.type === 'VariableDeclarator' && n.id && want[n.id.name] && n.init && n.init.type === 'ArrayExpression') {
      seen[n.id.name] = (seen[n.id.name] || 0) + 1;
      // eslint-disable-next-line no-new-func
      out[want[n.id.name]] = new Function('return ' + src.slice(n.init.start, n.init.end))();
    }
    for (const k of Object.keys(n)) if (k !== 'type' && k !== 'start' && k !== 'end') walk(n[k]);
  })(ast);
  out.__seen = seen;
  return out;
}

beforeAll(() => {
  source = readFileSync(resolve(process.cwd(), SRC), 'utf8');
  T = tablesFromSource(source);
  window.StemLab = { registerTool() {} };
  delete window.__alloCellKnow;
  // eslint-disable-next-line no-new-func
  new Function(source)();
  K = window.__alloCellKnow;
});

const THIS_YEAR = new Date().getFullYear();
const unique = (rows, f) => new Set(rows.map(f)).size === rows.length;
const str = (v) => typeof v === 'string' && v.trim().length > 0;

describe('Knowledge tables: shape and cross-links', () => {
  it('declares each table exactly once and all five are populated', () => {
    for (const name of ['CELL_HISTORY', 'FAMOUS_BIOLOGISTS', 'LAB_TECHNIQUES', 'MICROBIAL_DISEASES', 'MICRO_ECOLOGY']) {
      expect(T.__seen[name], name).toBe(1);
    }
    expect(T.history.length).toBeGreaterThanOrEqual(40);
    expect(T.biologists.length).toBeGreaterThanOrEqual(30);
    expect(T.techniques.length).toBeGreaterThanOrEqual(25);
    expect(T.diseases.length).toBeGreaterThanOrEqual(25);
    expect(T.ecology.length).toBeGreaterThanOrEqual(20);
  });

  it('every cross-link (event -> person/technique, person -> technique, record -> habitat) resolves', () => {
    expect(K.knowBrokenLinks(T)).toEqual([]);
    // And the audit itself can fail.
    const broken = JSON.parse(JSON.stringify(T));
    broken.history[0].people = ['nobody'];
    broken.biologists[0].techniques = ['tea-leaf-reading'];
    expect(K.knowBrokenLinks(broken)).toEqual(['history 1 -> person nobody', 'person ' + broken.biologists[0].key + ' -> technique tea-leaf-reading']);
  });

  it('the timeline is sorted, uniquely keyed, themed and illustrated', () => {
    const themes = K.KNOW_THEMES.map((t) => t.id);
    expect(unique(T.history, (e) => e.id)).toBe(true);
    T.history.forEach((e, i) => {
      if (i) expect(e.year, e.title).toBeGreaterThanOrEqual(T.history[i - 1].year);
      expect(Number.isInteger(e.year) && e.year >= 1600 && e.year <= THIS_YEAR, e.title).toBe(true);
      expect(str(e.title) && str(e.event) && str(e.why) && str(e.country), e.title).toBe(true);
      expect(e.themes.length, e.title).toBeGreaterThan(0);
      e.themes.forEach((t) => expect(themes, e.title).toContain(t));
      if (e.yearLabel) expect(e.yearLabel, e.title).toMatch(new RegExp(String(e.year).slice(0, 3)));
    });
    // Each era has something in it, so no era card is empty.
    K.KNOW_ERAS.forEach((er) => expect(T.history.some((e) => K.knowEraOf(e.year) === er.id), er.id).toBe(true));
  });

  it('the people table holds only people, each with a plausible lifespan', () => {
    const fields = K.KNOW_THEMES.map((t) => t.id);
    expect(unique(T.biologists, (b) => b.key)).toBe(true);
    expect(unique(T.biologists, (b) => b.name)).toBe(true);
    T.biologists.forEach((b) => {
      expect(b.name, 'a person, not a model or a pair').not.toMatch(/model|&|\band\b|N\/A/i);
      expect(b.name.trim().split(/\s+/).length, b.name).toBeGreaterThanOrEqual(2);
      expect(Number.isInteger(b.born) && b.born >= 1550 && b.born <= THIS_YEAR - 18, b.name).toBe(true);
      if (b.died !== undefined) {
        expect(Number.isInteger(b.died) && b.died > b.born && b.died <= THIS_YEAR, b.name).toBe(true);
        expect(b.died - b.born, b.name + ' lifespan').toBeLessThanOrEqual(110);
      } else {
        expect(THIS_YEAR - b.born, b.name + ' listed as living').toBeLessThanOrEqual(100);
      }
      expect(b.fields.length, b.name).toBeGreaterThan(0);
      b.fields.forEach((f) => expect(fields, b.name).toContain(f));
      expect(str(b.contribution) && str(b.country), b.name).toBe(true);
      expect('years' in b, 'old free-text years field').toBe(false);
    });
    // Initials come from the name, so no badge reads "?" or a single letter.
    T.biologists.forEach((b) => expect(K.knowInitials(b.name), b.name).toMatch(/^[A-ZÀ-Ý]{2}$/));
  });

  it('techniques, diseases and habitats use only known groups, glyphs, routes and scenes', () => {
    const groups = K.KNOW_LAB_GROUPS.map((g) => g.id), views = K.KNOW_LAB_VIEWS.map((v) => v.id);
    expect(unique(T.techniques, (t) => t.key)).toBe(true);
    T.techniques.forEach((t) => {
      expect(groups, t.name).toContain(t.group);
      expect(str(t.method) && str(t.purpose) && str(t.skill) && str(t.glyph), t.name).toBe(true);
      if (t.view) expect(views, t.name).toContain(t.view);
    });
    groups.forEach((g) => expect(T.techniques.some((t) => t.group === g), g).toBe(true));
    const types = K.KNOW_PATHOGEN_TYPES.map((p) => p.id), routes = K.KNOW_ROUTES.map((r) => r.id);
    expect(unique(T.diseases, (r) => r.key)).toBe(true);
    expect(unique(T.diseases, (r) => r.disease.toLowerCase()), 'no duplicate diseases (there were two plague rows)').toBe(true);
    T.diseases.forEach((r) => {
      expect(types, r.disease).toContain(r.type);
      expect(r.routes.length, r.disease).toBeGreaterThan(0);
      r.routes.forEach((x) => expect(routes, r.disease).toContain(x));
      ['pathogen', 'symptoms', 'prevention', 'treatment', 'burden', 'source'].forEach((f) => expect(str(r[f]), r.disease + '.' + f).toBe(true));
      // A number shown to students needs a named WHO/CDC source.
      if (/\d/.test(r.burden)) expect(r.source, r.disease).toMatch(/WHO|CDC/);
    });
    types.forEach((t) => expect(T.diseases.some((r) => r.type === t), t).toBe(true));
    const hgroups = K.KNOW_HABITAT_GROUPS.map((g) => g.id);
    expect(unique(T.ecology, (r) => r.key)).toBe(true);
    T.ecology.forEach((r) => {
      expect(hgroups, r.habitat).toContain(r.group);
      expect(str(r.inhabitants) && str(r.importance), r.habitat).toBe(true);
      expect(r.inhabitants, r.habitat + ' filler').not.toMatch(/^(Variable|Extreme conditions)$/);
    });
  });
});

describe('Knowledge tables: fact-check corrections stay corrected', () => {
  const bio = (k) => T.biologists.find((b) => b.key === k);
  const tech = (k) => T.techniques.find((t) => t.key === k);
  const dis = (k) => T.diseases.find((r) => r.key === k);
  const ev = (title) => T.history.find((e) => e.title === title);

  it('people', () => {
    expect(bio('watson').died).toBe(2025);                      // died 6 Nov 2025
    expect([bio('franklin').born, bio('franklin').died]).toEqual([1920, 1958]);
    expect(bio('franklin').contribution).not.toMatch(/denied/i); // Nobel is never posthumous
    expect(bio('salmon').name).toBe('Daniel Elmer Salmon');    // not "Edward"
    expect(bio('salmon').contribution).toMatch(/Theobald Smith/);
    expect(bio('gram').name).toBe('Hans Christian Gram');
    expect(bio('leeuwenhoek').contribution).not.toMatch(/first to observe .*blood cells/i);
    ['franklin', 'mcclintock', 'margulis', 'stevens', 'hesse', 'just', 'doudna', 'charpentier', 'kariko'].forEach((k) => expect(bio(k), k).toBeTruthy());
    const living = T.biologists.filter((b) => b.died === undefined).map((b) => b.key).sort();
    expect(living).toEqual(['charpentier', 'doudna', 'kariko', 'yamanaka']);
  });

  it('timeline dates and attributions', () => {
    expect(ev('Rules of inheritance').year).toBe(1866);         // presented 1865, published 1866
    expect(ev('Reprogrammed stem cells').year).toBe(2006);      // mouse 2006, human 2007
    expect(ev('Predicting protein shapes').year).toBe(2020);    // AlphaFold 2 at CASP14
    expect(ev('CRISPR gene editing').country).toMatch(/Sweden/);
    expect(ev('A third domain of life').why).toMatch(/1990/);
    expect(ev('Every cell comes from a cell').event).toMatch(/Remak/);
    expect(ev('The double helix').event).toMatch(/Franklin/);
    expect(ev('The double helix').why).toMatch(/not awarded after death/);
    expect(ev('The Gram stain').event).toMatch(/brown dye; today a pink counterstain such as safranin/); // Gram 1884 used Bismarck brown
    expect(T.history.some((e) => /Koch wins Nobel/i.test(e.event))).toBe(false); // filler row removed
  });

  it('techniques and diseases', () => {
    expect(tech('tem').purpose).not.toMatch(/atomic/i);
    expect(tech('tem').purpose).toMatch(/2 nm/);
    expect(tech('transfection').method).toMatch(/transduction/);
    expect(dis('tb').burden).toMatch(/1\.23 million died in 2024/);
    expect(dis('malaria').burden).toMatch(/610,000 deaths in 2024/);
    expect(dis('chagas').burden).toMatch(/8 million/);
    expect(dis('campylobacter').symptoms).not.toMatch(/foodborne illness/i); // was a burden claim in the symptoms field
    expect(dis('campylobacter').burden).toMatch(/1\.9 million/);
    expect(dis('tetanus').treatment).not.toMatch(/^Vaccination/);        // prevention is not treatment
    ['flu', 'measles', 'covid', 'cold'].forEach((k) => expect(dis(k).type).toBe('virus'));
    expect(K.KNOW_PATHOGEN_TYPES.find((p) => p.id === 'virus').cell).toBe(false);
    expect(K.KNOW_PATHOGEN_TYPES.find((p) => p.id === 'prion').cell).toBe(false);
  });

  it('ecology numbers', () => {
    const gut = T.ecology.find((r) => r.key === 'gut');
    expect(gut.inhabitants).toMatch(/38 trillion/);             // Sender et al. 2016, not "100 trillion"
    expect(T.ecology.find((r) => r.key === 'skin').inhabitants).not.toMatch(/1B|billion/);
    expect(T.ecology.find((r) => r.key === 'ocean').importance).toMatch(/about half/);
  });
});
