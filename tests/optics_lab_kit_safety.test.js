import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { sliceBetween } from './helpers/anchored_slice.js';

const ROOT = process.cwd();
const SRC = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_optics.js'), 'utf8');

// The kits ship as three tables that are concatenated at load time. Reading
// them the same way means a kit added to ANY of the three is covered here.
function table(name) {
  const open = `var ${name} = [`;
  const start = SRC.indexOf(open);
  if (start === -1) throw new Error(`lab kit table ${name} not found — it was renamed or removed`);
  let depth = 0;
  let i = start + open.length - 1;
  for (; i < SRC.length; i += 1) {
    const c = SRC[i];
    if (c === '[') depth += 1;
    else if (c === ']') { depth -= 1; if (depth === 0) break; }
  }
  return vm.runInNewContext(`(${SRC.slice(start + open.length - 1, i + 1)})`, {});
}

const KITS = [
  ...table('OPTICS_LAB_KITS'),
  ...table('OPTICS_LAB_KITS_MORE'),
  ...table('OPTICS_LAB_KITS_FINAL'),
];

// Everything a learner is told to gather or do, minus the safety note itself.
function activity(kit) {
  return [kit.goal, (kit.materials || []).join(' '), (kit.steps || []).join(' '),
          kit.science || '', kit.extension || ''].join(' ');
}

describe('Optics lab kits — structure', () => {
  it('concatenates all three tables with unique ids', () => {
    expect(KITS.length).toBeGreaterThanOrEqual(32);
    const ids = KITS.map((k) => k.id);
    expect(ids.filter((x, i) => ids.indexOf(x) !== i), 'duplicate kit id').toEqual([]);
  });

  it('gives every kit a non-empty safety note', () => {
    for (const k of KITS) {
      expect(typeof k.safety, `${k.id} has no safety note`).toBe('string');
      expect(k.safety.trim().length, `${k.id} safety note is empty`).toBeGreaterThan(10);
    }
  });
});

// A safety note that does not mention the hazard the kit actually creates is
// worse than none: it reads as though the risks were considered.
describe('Optics lab kits — the safety note covers the kit\'s own hazards', () => {
  // `trigger` must be something the kit ASKS THE LEARNER TO DO, not a word
  // that merely appears while explaining the physics. "Sunlight passing
  // through atmosphere" in a science paragraph is not a solar hazard, so each
  // trigger is anchored to an instruction or a materials entry.
  const HAZARDS = [
    {
      name: 'solar viewing',
      // A kit is a solar-viewing hazard when it puts an OPTIC between the
      // learner's eye and the sky. Needing a sunny day is not enough:
      // rainbowWaterHose has you stand with your BACK to the Sun and look at
      // your own shadow, which is the opposite of a hazard.
      trigger: (k) => {
        if (/back to the sun/i.test((k.steps || []).join(' '))) return false;
        const optic = /lens|mirror|telescope|magnif|slit|pinhole|spectro|grating|eyepiece/i;
        const solar = /\bsun\b|sunlight|sunny/i;
        return optic.test(`${k.title} ${k.goal}`) && solar.test(activity(k));
      },
      covered: /sun|solar|sky|filter/i,
    },
    {
      name: 'laser',
      trigger: (k) => /laser/i.test((k.materials || []).join(' ')),
      covered: /laser|class 3r|mW/i,
    },
    {
      name: 'open flame',
      trigger: (k) => /candle|flame|match\b/i.test((k.materials || []).join(' ') + (k.steps || []).join(' ')),
      covered: /candle|flame|fire|burn|supervis|extinguish|unattended/i,
    },
    {
      name: 'boiling or hot liquid',
      trigger: (k) => /boiling|hot water|stove|molten/i.test((k.materials || []).join(' ') + (k.steps || []).join(' ')),
      covered: /scald|boil|hot|burn|adult|supervis/i,
    },
  ];

  // Ignition kits are the only ones that can start a fire on purpose, so a
  // single matching word is not enough: an OR across "water|supervision|..."
  // still passes after the extinguish plan is deleted, because some OTHER
  // word in the note keeps matching. Each element is required separately.
  const IGNITION_ELEMENTS = [
    { name: 'a way to put it out', re: /water|sand|extinguish|bucket/i },
    { name: 'adult supervision', re: /adult|supervis/i },
    { name: 'not looking at the Sun through the optic', re: /never look|do not look|don't look/i },
  ];

  for (const hazard of HAZARDS) {
    it(`warns about ${hazard.name} in every kit that involves it`, () => {
      const involved = KITS.filter(hazard.trigger);
      expect(involved.length, `no kit exercises the ${hazard.name} rule any more`).toBeGreaterThan(0);
      const uncovered = involved
        .filter((k) => !hazard.covered.test(k.safety || ''))
        .map((k) => `${k.id} (age ${k.age}): "${k.safety}"`);
      expect(uncovered, `kits involving ${hazard.name} with no matching warning`).toEqual([]);
    });
  }

  it('gives every ignition kit all three elements of a fire plan', () => {
    // Match the id and title too: concaveMirrorBurn's goal says "focus
    // sunlight to a HOT SPOT", which no ignition word in the goal alone
    // would catch, and that kit is exactly the one that starts fires.
    const igniters = KITS.filter((k) =>
      /burn|ignite|scorch|char|hot spot/i.test(`${k.id} ${k.title} ${k.goal || ''}`));
    expect(igniters.length, 'no kit deliberately starts a fire any more').toBeGreaterThanOrEqual(2);
    for (const k of igniters) {
      for (const el of IGNITION_ELEMENTS) {
        expect(el.re.test(k.safety || ''),
          `${k.id} is an ignition kit with no ${el.name}: "${k.safety}"`).toBe(true);
      }
    }
  });

  // An open flame is unattended-fire risk rather than ignition-on-purpose, so
  // it needs supervision AND an instruction not to walk away, both separately.
  it('gives every open-flame kit supervision and an unattended warning', () => {
    const flames = KITS.filter((k) =>
      /candle|flame|match\b/i.test((k.materials || []).join(' ') + (k.steps || []).join(' ')));
    expect(flames.length, 'no kit uses an open flame any more').toBeGreaterThan(0);
    for (const k of flames) {
      expect(/adult|supervis/i.test(k.safety || ''),
        `${k.id} uses an open flame with no supervision note: "${k.safety}"`).toBe(true);
      expect(/unattended|leave|never leave|extinguish|put .{0,10}out/i.test(k.safety || ''),
        `${k.id} never says not to walk away from the flame: "${k.safety}"`).toBe(true);
    }
  });

  // The two regressions this file was written for.
  it('warns both CD spectroscopes off the Sun', () => {
    for (const id of ['spectroscope', 'phoneSpectrometer']) {
      const kit = KITS.find((k) => k.id === id);
      expect(kit, `${id} is gone`).toBeTruthy();
      // Both list sunlight among the sources to collect and tell the learner
      // to aim the slit at a source, so "sharp CD edges" was not enough.
      expect(kit.safety, `${id} lost its solar warning`).toMatch(/\bsun\b/i);
      expect(kit.safety, `${id} lost its sharp-edge warning`).toMatch(/sharp|cut/i);
    }
  });

  it('keeps the spectroscope off lasers even though none is in its kit list', () => {
    // The laser was removed from the materials, so the generic LASER rule no
    // longer selects this kit — but a learner with a pointer will still try
    // it, and the slit puts their eye on the beam axis. The clause has to be
    // pinned directly or nothing asserts it.
    const kit = KITS.find((k) => k.id === 'spectroscope');
    expect(kit.safety, 'the spectroscope lost its laser warning').toMatch(/laser/i);
    expect((kit.materials || []).join(' '),
      'a laser is back in the spectroscope materials').not.toMatch(/laser/i);
  });

  it('warns that a water-filled bottle is a converging lens', () => {
    const kit = KITS.find((k) => k.id === 'sodaBottleLens');
    expect(kit.safety).toMatch(/converging lens/i);
    expect(kit.safety).toMatch(/sun/i);
  });

  it('warns about the boiling water in the gelatin fibre kit', () => {
    const kit = KITS.find((k) => k.id === 'fiberOpticGel');
    expect(kit.safety, 'the scald warning is gone').toMatch(/scald|boil/i);
    expect(kit.safety, 'the laser warning was displaced').toMatch(/laser/i);
  });
});

// A safety note is undermined by the kit's own teaching copy inviting the very
// thing it forbids. The CD spectroscope said "never the Sun" in its safety box
// while its science paragraph listed the Sun as a spectrum to compare, and its
// extension put sunlight in the database to collect. Only the screenshot
// caught it: every structural test passed.
describe('Optics lab kits — the copy does not contradict the safety note', () => {
  it('never invites solar observation in a kit that forbids it', () => {
    const forbidsSun = KITS.filter((k) => /never .{0,30}\bsun\b|not .{0,20}at the sun|don't .{0,20}at the sun/i.test(k.safety || ''));
    expect(forbidsSun.length, 'no kit warns off the Sun any more').toBeGreaterThanOrEqual(4);

    for (const k of forbidsSun) {
      // An invitation is the Sun named as a TARGET to view, photograph or
      // collect a spectrum from. Merely describing what the Sun does (the
      // sundial explains its 15°/hour apparent motion, and reads a SHADOW)
      // is not an invitation to look at it.
      const copy = `${k.science || ''} ${k.extension || ''}`;
      const sentences = copy.match(/[^.]*\bsun(?:light)?\b[^.]*/gi) || [];
      const TARGETS = /\b(?:view|look|observe|aim|point|photograph|image|compare spectra|spectra|spectrum|through the)\b/i;
      const bad = sentences
        .filter((s) => TARGETS.test(s))
        .filter((s) => !/never|away from|not the sun|north-facing|avoid|filter/i.test(s));
      expect(bad, `${k.id} tells the learner to use the Sun its safety note forbids`).toEqual([]);
    }
  });
});

describe('Optics lab kits — the panel renders the safety note', () => {
  it('shows safety on the kit card, not just in the data', () => {
    const panel = sliceBetween(SRC, 'function _renderLabKitsPanel(d, upd, h) {',
      'function _renderCareersPanel', { file: 'stem_lab/stem_tool_optics.js' });
    // `k.safety` appears TWICE: once as the `k.safety && ...` guard and once
    // as the rendered text. A bare toContain passes while the text node has
    // been swapped for something else, because the guard still matches.
    expect((panel.match(/k\.safety/g) || []).length,
      'the safety note is no longer both guarded and rendered').toBe(2);
    expect(panel, 'the safety text node was replaced').toMatch(/\}\s*\}, k\.safety\)/);
  });
});
