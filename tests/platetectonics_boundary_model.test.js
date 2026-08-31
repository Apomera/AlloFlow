import { describe, it, expect } from 'vitest';
import { readFileSync , existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Plate Tectonics — the cross-section's teaching model.
 *
 * The main sim was rebuilt because the thing it claimed to teach was not in the
 * picture: the lithosphere was a 50-pixel strip under an 800-pixel decorative
 * interior, the "Subduction" caption sat over a plain orange glow with nothing
 * sinking under anything, the convection cells spun in the middle of the mantle
 * while the plates never moved on their own, and the boundary classifier put
 * subduction and "convergent" in the same category slot.
 *
 * These pin the INVARIANTS of the replacement, not its spellings — a pinned
 * pixel value is a test that goes red on a retune and stays green on a
 * regression. Read as source: the sim loop lives inside a canvas ref callback
 * with a rAF draw() and cannot be instantiated in jsdom, but the rules it
 * encodes are still checkable statements about the source.
 */

const SOURCE = resolve(process.cwd(), 'stem_lab/stem_tool_platetectonics.js');
const MIRRORS = [
  'desktop/web-app/public/stem_lab/stem_tool_platetectonics.js',
  'desktop/app-build/stem_lab/stem_tool_platetectonics.js'
]
  // desktop/app-build/ is a gitignored local build output — absent in CI.
  .filter((rel) => !rel.includes('app-build') || existsSync(rel));

let cache = null;
function src() {
  if (cache == null) cache = readFileSync(SOURCE, 'utf8');
  return cache;
}

/** Pull one function body out of the source by name, balanced-brace. */
function fnBody(name) {
  const text = src();
  const at = text.indexOf('function ' + name + '(');
  expect(at, 'function ' + name + ' not found').toBeGreaterThan(-1);
  const open = text.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(open, i + 1);
    }
  }
  throw new Error('unbalanced braces in ' + name);
}

describe('Plate Tectonics cross-section — depth frame', () => {
  it('measures every depth from one shared mapping', () => {
    // GEO is read by draw() AND by the pointer and keyboard hit tests. Two
    // mappings would mean a student clicks somewhere other than what they see.
    const text = src();
    expect(text).toMatch(/var GEO = \(function \(\)/);
    expect(text).toMatch(/function plateHit\(p, my\)/);
    expect(fnBody('plateHit')).toMatch(/GEO\.top\(p\)/);
    expect(fnBody('plateHit')).toMatch(/GEO\.base\(p\)/);
  });

  it('gives the tectonic zone a real kilometre scale', () => {
    const geo = src().slice(src().indexOf('var GEO = (function ()'));
    expect(geo).toMatch(/TECT_KM = 400/);
    // Half the canvas for 400 km. The whole point of the rebuild is that the
    // boundary zone, not the core, owns the frame.
    expect(geo).toMatch(/pxPerKm = \(cH \* 0\.50\) \/ TECT_KM/);
  });

  it('keeps oceanic lithosphere thinner than continental, and lower', () => {
    const geo = src().slice(src().indexOf('var TOP_KM'), src().indexOf('var TOP_KM') + 400);
    const top = /oceanic: (-?\d+),\s*continental: (-?\d+)/.exec(geo);
    const base = /oceanic: (-?\d+),\s*continental: (-?\d+)/.exec(geo.slice(geo.indexOf('BASE_KM')));
    expect(top, 'TOP_KM not parseable').toBeTruthy();
    expect(base, 'BASE_KM not parseable').toBeTruthy();
    const oTop = +top[1], cTop = +top[2], oBase = +base[1], cBase = +base[2];
    // Ocean floor sits BELOW sea level; continents stand above it.
    expect(oTop).toBeGreaterThan(cTop);
    // And the oceanic plate is the thinner of the two. Both halves of that
    // contrast are why the ocean plate is the one that goes down, so a change
    // that inverted either would make the subduction rule below arbitrary.
    expect(oBase - oTop).toBeLessThan(cBase - cTop);
  });

  it('never prints a kilometre depth against the compressed strip', () => {
    // Depth labels are only honest above the scale break. If a number is ever
    // drawn below deepTop the compression silently becomes a false reading.
    const text = src();
    const ruler = text.slice(text.indexOf('// ── Depth ruler'), text.indexOf('// ── Depth ruler') + 2000);
    expect(ruler).toMatch(/\[0, 100, 200, 300, 400\]/);
    expect(ruler).toMatch(/GEO\.dY\(km\)/);
    expect(text).toMatch(/scale break/);
  });
});

describe('Plate Tectonics cross-section — boundary classification', () => {
  const body = () => fnBody('classifyPair');

  it('treats subduction as a KIND of convergent boundary, not an alternative', () => {
    // The old rule was `types differ ? 'Subduction' : gap < 0 ? 'Convergent' :
    // 'Divergent'`, which is a category error and also labelled a pair
    // "Subduction" while they were being pulled apart.
    const b = body();
    expect(b).toMatch(/kind: 'subduction'/);
    expect(b).toMatch(/kind: 'divergent'/);
    expect(b).toMatch(/kind: 'collision'/);
    // Every label says which of the two families it belongs to, in words. The
    // divergent branch picks its label with a ternary, so collect both forms.
    const labels = (b.match(/'(Convergent|Divergent)[^']*'/g) || []);
    expect(labels.length).toBeGreaterThanOrEqual(4);
    expect(labels.filter((l) => l.startsWith("'Convergent")).length).toBeGreaterThanOrEqual(2);
    expect(labels.filter((l) => l.startsWith("'Divergent")).length).toBeGreaterThanOrEqual(2);
  });

  it('sinks the DENSE plate, whichever one the student moved', () => {
    const b = body();
    // The oceanic plate is chosen as `down` on its type, never on drag order.
    expect(b).toMatch(/var down = a\.type === 'oceanic' \? a : b/);
    expect(b).not.toMatch(/dragIdx/);
  });

  it('classifies an overlap as convergent however deep it is', () => {
    // A hard collision used to push the gap past the detection window, so the
    // most violent convergence the model allows produced NO caption at all.
    const b = body();
    expect(b).toMatch(/if \(gap > cW \* 0\.034\) return null;/);
    expect(b).toMatch(/PT_MAX_OVERLAP/);
  });

  it('starts with the plates apart, so nothing is a boundary until it is made', () => {
    const text = src();
    const m = /PT_SPREAD = ([\d.]+), PT_GAP = ([\d.]+)/.exec(text);
    expect(m, 'layout constants not found').toBeTruthy();
    // The resting gap must exceed the detection window, or all six boundaries
    // are live before the student has touched anything.
    expect(+m[2]).toBeGreaterThan(0.034);
  });
});

describe('Plate Tectonics cross-section — what each boundary produces', () => {
  it('draws the structures a subduction zone is recognised by', () => {
    const text = src();
    // A caption naming a process the picture does not show is the exact failure
    // this replaced: the word "Subduction" over an orange glow.
    expect(text).toMatch(/Wadati-Benioff/);
    expect(text).toMatch(/'trench'/);
    expect(text).toMatch(/'volcanic arc'/);
    // Foci get deeper with distance from the trench, on the slab.
    const wb = text.slice(text.indexOf('for (var wq = 0'), text.indexOf('for (var wq = 0') + 700);
    expect(wb).toMatch(/wqY = slabTop \+ \(reachY - slabTop\) \* frac/);
    expect(wb).toMatch(/wqX = B\.mid \+ dirS \* \(runX \* frac/);
  });

  it('stands the arc back from the trench rather than on it', () => {
    const text = src();
    // Measured from the slab's own top surface at the trench. Taken from
    // GEO.base() the origin was 80 km down and the arc landed on the trench.
    expect(text).toMatch(/meltX = B\.mid \+ dirS \* \(\(meltY - GEO\.top\(B\.down\)\) \/ Math\.tan\(DIP\)\)/);
    const dip = /var DIP = (\d+) \* Math\.PI \/ 180/.exec(text);
    expect(dip).toBeTruthy();
    expect(+dip[1]).toBeGreaterThan(15);
    expect(+dip[1]).toBeLessThan(60);
  });

  it('erupts where an eruption belongs and nowhere else', () => {
    const text = src();
    const settle = fnBody('settleBoundary');
    // Two continents colliding have no slab going down to melt, so no arc.
    // The old rule fired an eruption on a 60% coin toss at any same-type
    // boundary, putting a stratovolcano on top of a Himalaya-style collision.
    expect(settle).toMatch(/bKind === 'subduction' \|\| bKind === 'divergent'/);
    expect(settle).not.toMatch(/Math\.random\(\) > 0\.4/);
    // And the classifier is the single source of that verdict.
    expect(text).toMatch(/canvasEl\._ptBoundaryKind\[bi\] = bres\.kind/);
  });

  it('gives a rift a valley and a ridge a crest, not the same wall for both', () => {
    const text = src();
    const div = text.slice(text.indexOf("if (B.kind === 'divergent') {"));
    expect(div.slice(0, 1600)).toMatch(/bothOc/);
    expect(text).toMatch(/'rift valley'/);
    expect(text).toMatch(/ridge — new sea floor/);
  });

  it('matches a collision range with a root below it', () => {
    const text = src();
    expect(text).toMatch(/'crustal root'/);
    const col = text.slice(text.indexOf("} else if (B.kind === 'collision') {"));
    // Both grow with the same squeeze, so the pair cannot drift apart.
    expect(col.slice(0, 900)).toMatch(/squeeze = Math\.max\(0, -B\.gap\)/);
  });
});

describe('Plate Tectonics cross-section — the mantle drives the plates', () => {
  it('derives the cells, the arrows and the drift from ONE flow field', () => {
    const text = src();
    expect(text).toMatch(/function surfaceFlow\(x\) \{ return Math\.sin\(Math\.PI \* x \/ cellW\); \}/);
    // Cell spin is read off the field, so a cell cannot circulate against the
    // arrows the same field draws.
    expect(text).toMatch(/var spin = surfaceFlow\(cellCx\) > 0 \? 1 : -1;/);
    // The coupling arrows ARE the field.
    expect(text).toMatch(/var fv = surfaceFlow\(ax\);/);
    // And drift moves the plates with it.
    expect(text).toMatch(/dpl\.vx = surfaceFlow\(mid0\);/);
  });

  it('actually integrates the plate velocity it computes', () => {
    // `vx` was written in three places and read in none: the field existed, the
    // plates never moved by it, and "convection moves the plates" was a claim
    // the model contradicted every frame by standing still.
    const text = src();
    expect(text).toMatch(/clampPlateX\(plates, dr, dpl\.x \+ dpl\.vx \* [\d.]+ \* speed\)/);
  });

  it('runs drift by default so the mechanism is seen, not just offered', () => {
    const text = src();
    // The invariant is "on unless the student turned it off" — NOT the exact
    // expression. It is now also off by default for anyone who asked the system
    // for reduced motion, which is a different question from whether they chose.
    expect(text).toMatch(/var ptDrift = d\.ptDrift != null \? !!d\.ptDrift : /);
    expect(text).not.toMatch(/var ptDrift = !!d\.ptDrift;/);
  });

  it('throttles the events drift produces', () => {
    const text = src();
    // settleBoundary awards XP and can spawn an eruption. Unthrottled at 60 fps
    // it would score a student thousands of quakes for sitting still.
    expect(text).toMatch(/canvasEl\._ptDriftNext = tick \+ \d+/);
  });

  it('will not let a plate drive through its neighbour', () => {
    const clamp = fnBody('clampPlateX');
    expect(clamp).toMatch(/lft\.x \+ lft\.w - slack/);
    expect(clamp).toMatch(/rgt\.x - me\.w \+ slack/);
    // Every route that moves a plate goes through it: drag, touch, keyboard,
    // drift. One that did not would reach a state the others cannot.
    const text = src();
    expect((text.match(/clampPlateX\(/g) || []).length).toBeGreaterThanOrEqual(5);
  });
});

describe('Plate Tectonics — the explanation beside the picture', () => {
  it('answers the same four questions for all three boundary types', () => {
    const text = src();
    const panel = text.slice(text.indexOf('var BOUNDARY_NOTES'), text.indexOf('var BOUNDARY_NOTES') + 4000);
    ['subduction', 'collision', 'divergent'].forEach((k) => {
      expect(panel).toMatch(new RegExp(k + ': \\{'));
    });
    // Comparable only if every type answers the same questions in the same
    // order; otherwise they are three unrelated stories.
    ['motion', 'rock', 'look', 'real'].forEach((field) => {
      expect((panel.match(new RegExp('\\b' + field + ': ', 'g')) || []).length).toBe(3);
    });
  });

  it('publishes the focus boundary on CHANGE, never per frame', () => {
    const text = src();
    // draw() runs 60 times a second and upd() re-renders the whole tool.
    expect(text).toMatch(/if \(sig !== canvasEl\._ptBoundarySig\)/);
  });

  it('names each stage of the eruption the 3D cutaway plays', () => {
    const text = src();
    ['Pressure builds', 'Eruption', 'Chamber drains', 'Summit collapses'].forEach((n) => {
      expect(text).toContain(n);
    });
    // The model already knew the stage; it just never said it.
    expect(text).toMatch(/phase: function \(m\) \{ return phaseOf\(m \|\| pending\); \}/);
    expect(text).toMatch(/ptEruptPhase: vPhase/);
  });
});

describe('Plate Tectonics — 3D cutaway', () => {
  it('gives the country rock beds for the sill to lie along', () => {
    const text = src();
    // "A dike cuts ACROSS the beds, a sill runs ALONG them" pointed at a single
    // uniform slab with no beds in it.
    expect(text).toMatch(/var BED_N = 5/);
    expect(text).toMatch(/parts\.bedMeshes/);
    // And the sill is seated on a contact rather than floating mid-bed.
    expect(text).toMatch(/parts\.sill\.position\.set\(19, -18\.2, 0\)/);
  });

  it('carries a depth scale in kilometres', () => {
    const text = src();
    expect(text).toMatch(/'surface'/);
    expect(text).toMatch(/'5 km'/);
    expect(text).toMatch(/'10 km'/);
  });

  it('lights the interior it opens onto', () => {
    // The block is sliced open by default, so most of what the camera sees are
    // faces whose normals point away from every directional light.
    expect(src()).toMatch(/scene\.add\(new T\.AmbientLight/);
  });

  it('frames the model rather than the worst case', () => {
    const text = src();
    expect(text).toMatch(/frameDist \+= \(Math\.min\(126, want\) - frameDist\) \* [\d.]+/);
    // The eased distance is in the camera cache key, or it is computed every
    // frame and applied never.
    expect(text).toMatch(/Math\.round\(frameDist\)/);
  });
});

describe('Plate Tectonics — theme and honesty', () => {
  it('applies the dark class its own dark rules key on', () => {
    // Eighteen `.plate-tectonics-container.dark` rules were installed and the
    // class was never set, so in dark mode every card stayed white.
    expect(src()).toMatch(/plate-tectonics-container ' \+ \(isDark \? 'dark /);
  });

  it('does not leave the dark text-slate override on a dangling selector', () => {
    const text = src();
    expect(text).not.toMatch(/text-slate-700, \.plate-tectonics-container\.dark ' \+/);
    expect(text).toMatch(/\.plate-tectonics-container\.dark \.text-slate-700 \{ color: #cbd5e1/);
  });

  it('states the vertical exaggeration it uses', () => {
    const text = src();
    expect(text).toMatch(/Surface heights exaggerated/);
    expect(text).toMatch(/Depths to scale above the break/);
  });

  it('does not promise a transform boundary the cross-section cannot show', () => {
    const text = src();
    const label = /main_canvas_label', '([^']+)'/.exec(text);
    expect(label, 'canvas label not found').toBeTruthy();
    expect(label[1]).not.toMatch(/create convergent, divergent, and transform/);
    expect(label[1]).toMatch(/Transform boundaries/);
  });
});

describe('Plate Tectonics — deployed copies', () => {
  it('keeps every served copy identical to the source', () => {
    MIRRORS.forEach((rel) => {
      expect(readFileSync(resolve(process.cwd(), rel), 'utf8'), rel).toBe(src());
    });
  });

  // ── Earthquake magnitude ────────────────────────────────────────────────
  // The sim fired quakes with no size at all, while the "Cataclysmic Rumble"
  // badge asked for an M8.0+ and read `eqMagnitude` — a value written ONLY by
  // the seismograph slider in another panel. The badge was earned by dragging a
  // slider. These pin the model that replaced it.
  describe('earthquake magnitude', () => {
    it('bands magnitude by boundary type, with subduction the only M9 maker', () => {
      const text = src();
      const at = text.indexOf('var MAG_BAND');
      expect(at, 'magnitude band table not found').toBeGreaterThan(-1);
      const block = text.slice(at, at + 500);
      const band = (k, re) => {
        const m = re.exec(block);
        expect(m, 'no band for ' + k).toBeTruthy();
        return [parseFloat(m[1]), parseFloat(m[2])];
      };
      const sub = band('subduction', /subduction:\s*\[([0-9.]+),\s*([0-9.]+)\]/);
      const col = band('collision', /collision:\s*\[([0-9.]+),\s*([0-9.]+)\]/);
      const div = band('divergent', /divergent:\s*\[([0-9.]+),\s*([0-9.]+)\]/);
      // Every M9 on record is a subduction megathrust.
      expect(sub[1]).toBeGreaterThanOrEqual(9);
      expect(col[1]).toBeLessThan(9);
      // A spreading ridge breaks a thin brittle layer; it cannot make an M8, so
      // the badge stays a question about WHERE rather than how hard you push.
      expect(div[1]).toBeLessThan(7);
      expect(sub[0]).toBeGreaterThan(div[1]);
      // Bands are ordered low-to-high and do not collapse to a point.
      [sub, col, div].forEach(([lo, hi]) => expect(hi).toBeGreaterThan(lo));
    });

    it('places the quake inside its band from rupture size, not from a coin toss', () => {
      const text = src();
      const at = text.indexOf('var band = MAG_BAND[bKind]');
      expect(at).toBeGreaterThan(-1);
      const block = text.slice(at, at + 1600);
      // Two physical controls: how locked the plates are, and how long the fault
      // can be (limited by the smaller plate).
      expect(block).toMatch(/var press = Math\.max\(0, Math\.min\(1,/);
      expect(block).toMatch(/Math\.min\(dp\.w, op\.w\)/);
      // Randomness is a garnish, not the driver.
      const rand = /([0-9.]+) \* Math\.random\(\)/.exec(block);
      expect(rand, 'no random term found').toBeTruthy();
      expect(parseFloat(rand[1])).toBeLessThan(0.25);
      // Never above the band ceiling.
      expect(block).toMatch(/Math\.min\(band\[1\], qMag\)/);
    });

    it('earns the M8 badge from a quake the sim made, never from the slider', () => {
      const text = src();
      const at = text.indexOf("id: 'major_quake'");
      expect(at).toBeGreaterThan(-1);
      const ch = text.slice(at, at + 480);
      expect(ch).toMatch(/maxQuakeMag/);
      expect(ch, 'badge still readable off the seismograph slider').not.toMatch(/s\.eqMagnitude/);
    });

    it('points the seismograph at the quake the student just made', () => {
      const text = src();
      const at = text.indexOf('lastQuakeMag: qMag');
      expect(at).toBeGreaterThan(-1);
      const block = text.slice(at - 200, at + 300);
      expect(block).toMatch(/eqMagnitude: qMag/);
      expect(block).toMatch(/maxQuakeMag: Math\.max\(liveD\.maxQuakeMag \|\| 0, qMag\)/);
    });

    it('draws the magnitude clear of the boundary caption band', () => {
      const text = src();
      const at = text.indexOf('var lqCapBot');
      expect(at, 'magnitude readout placement not found').toBeGreaterThan(-1);
      const block = text.slice(at, at + 600);
      // Placed against the caption band, and degrades to one line rather than
      // overlapping it on a short canvas.
      expect(block).toMatch(/lqCapBot/);
      expect(block).toMatch(/lqWhy = ''/);
    });
  });

  // ── Myth or fact ────────────────────────────────────────────────────────
  // Every statement in this bank was FALSE. All thirteen. A student could hold
  // down one button, finish at 100%, and earn the badge in three taps.
  describe('myth or fact bank', () => {
    const bank = (name) => {
      const text = src();
      const at = text.indexOf('var ' + name + ' =');
      expect(at, name + ' not found').toBeGreaterThan(-1);
      const open = text.indexOf('[', at);
      let depth = 0, i = open;
      for (; i < text.length; i++) {
        if (text[i] === '[') depth++;
        else if (text[i] === ']') { depth--; if (!depth) break; }
      }
      // eslint-disable-next-line no-eval
      return eval(text.slice(open, i + 1));
    };
    const bands = () => {
      const b35 = bank('PT_MYTHS_35');
      const b68 = b35.concat(bank('PT_MYTHS_68'));
      const b912 = b68.concat(bank('PT_MYTHS_912'));
      return { '3-5': b35, '6-8': b68, '9-12': b912 };
    };

    it('carries both true and false statements in every grade band', () => {
      Object.entries(bands()).forEach(([name, b]) => {
        const t = b.filter((x) => x.t === true).length;
        const f = b.filter((x) => x.t === false).length;
        expect(t, name + ' band has no TRUE statements — one button scores 100%').toBeGreaterThan(0);
        expect(f, name + ' band has no FALSE statements').toBeGreaterThan(0);
        // Neither answer may be the safe bet: guessing one way must stay near
        // a coin flip rather than becoming a strategy.
        const skew = Math.max(t, f) / b.length;
        expect(skew, name + ' band is ' + Math.round(skew * 100) + '% one answer').toBeLessThanOrEqual(0.65);
      });
    });

    it('gives every statement the fields the panel renders', () => {
      const all = bands()['9-12'];
      all.forEach((m) => {
        expect(typeof m.s, 'statement missing text').toBe('string');
        expect(typeof m.t, 'statement missing a truth value: ' + m.s).toBe('boolean');
        expect(typeof m.why, 'statement missing an explanation: ' + m.s).toBe('string');
        // The panel appends m.tryIt into a string. A statement without one
        // printed the literal words "Try it: undefined" to the student.
        expect(typeof m.tryIt, 'statement missing tryIt: ' + m.s).toBe('string');
      });
      expect(new Set(all.map((m) => m.s)).size, 'duplicate statements in the bank').toBe(all.length);
    });

    it('guards the Try it line rather than printing undefined', () => {
      const text = src();
      expect(text).toMatch(/m\.tryIt \? React\.createElement/);
      expect(text, 'Try it renders unconditionally').not.toMatch(/\}, "\u{1F52C} Try it: " \+ m\.tryIt\)\n/u);
    });

    it('earns the myth badge from a streak, which cannot be tapped out', () => {
      const text = src();
      // ptMythsDone counts every tap, right or wrong; a badge reading it was
      // three presses of one button.
      const at = text.indexOf("id: 'myth_buster'");
      expect(at).toBeGreaterThan(-1);
      const badge = text.slice(at, at + 420);
      expect(badge).toMatch(/ptMythBest/);
      expect(badge, 'badge still counts taps rather than correct calls').not.toMatch(/ptMythsDone/);
      // The streak resets on a wrong call, or it is just a counter again.
      expect(text).toMatch(/ptMythStreak: right \? \(d\.ptMythStreak \|\| 0\) \+ 1 : 0/);
      expect(text).toMatch(/ptMythBest: Math\.max\(d\.ptMythBest \|\| 0,/);
    });

    it('paints the result card opaque, over an opaque panel', () => {
      const text = src();
      const at = text.indexOf('PLATE TECTONICS MYTHS');
      expect(at).toBeGreaterThan(-1);
      const panel = text.slice(at, at + 4000);
      // Both were translucent: the card at 40% and the panel gradient at 25/60%,
      // so every ink on them was graded against whatever showed through.
      expect(panel, 'result card is translucent').not.toMatch(/bg-(emerald|red)-950\/\d/);
      expect(panel, 'panel gradient is translucent').not.toMatch(/linear-gradient\(135deg, rgba\(76,29,149/);
    });
  });

  it('derives both seismic panels from ONE set of velocities', () => {
    const text = src();
    // The seismograph draws P/S/surface arrivals from these, and the epicentre
    // widget turns an S-minus-P interval back into a distance with them. Two
    // separate declarations agreed only by coincidence: change one and the
    // trace shows a gap the widget then misreads, with nothing failing.
    const at = text.indexOf('var PT_SEISMIC =');
    expect(at, 'shared velocity table not found').toBeGreaterThan(-1);
    expect(text.slice(at, at + 120)).toMatch(/VP: 6\.0, VS: 3\.5, VL: 3\.0/);
    // No second copy anywhere.
    expect(text, 'a panel still declares its own VP').not.toMatch(/var VP = 6\.0/);
    expect(text, 'a panel still declares its own VS').not.toMatch(/VS = 3\.5[,;]/);
    expect(text).toMatch(/var VP = PT_SEISMIC\.VP/);
    expect(text).toMatch(/var VP = PT_SEISMIC\.VP, VS = PT_SEISMIC\.VS, VL = PT_SEISMIC\.VL/);
  });
});

describe('Plate Tectonics — a gap is not a boundary until the plates say so', () => {
  // Measured before this rule existed: on load, with mantle drift running, the
  // seam nearest the DOWNWELLING limb spends its first several seconds closing
  // through the divergent band. The model captioned it "Divergent — the two
  // plates are moving APART" while its own label directly beneath read "cool
  // rock sinks" and the coupling arrows under it pointed at each other. The
  // tool's central claim is that convection drives the plates, and the first
  // boundary it put in focus contradicted it. Probed again after: no boundary
  // in focus until the seam closes, then "convergent, subduction".
  it('refuses to call a CLOSING gap divergent', () => {
    const body = fnBody('classifyPair');
    // The question has to be asked of the plates' own motion.
    expect(body, 'classifyPair never consults vx').toMatch(/\.vx/);
    expect(body, 'no closing test in the divergent branch').toMatch(/closing/);
    // And it must bail rather than label it.
    expect(body).toMatch(/if \(closing\) return null;/);
  });

  it('asks the plates, not who dragged them', () => {
    // The verdict must not depend on which plate the student happens to hold —
    // the dense plate sinks either way. Guarded here as well as on the
    // subduction branch, because the closing test was the newest place this
    // could have crept back in.
    const body = fnBody('classifyPair');
    expect(body, 'classification consults dragIdx').not.toMatch(/dragIdx/);
  });

  it('clears a released plate\'s velocity so a stale sign cannot speak for it', () => {
    const text = src();
    // vx decides whether a gap is opening or closing. A plate you let go of is
    // not moving, and leaving the last drag direction on it would let a boundary
    // nobody is touching be judged by a movement that finished.
    const up = text.slice(text.indexOf('var mouseUp = function()'), text.indexOf('var mouseUp = function()') + 600);
    // ★ The first draft of this asserted only /plates\[dragIdx\]\.vx = 0/, which
    // matched happily when the statement was disabled as
    // `if (false && plates[dragIdx]) plates[dragIdx].vx = 0;`. Calibration caught
    // it: a substring that survives its own sabotage is not an assertion. Pin the
    // whole statement, guard included.
    expect(up).toMatch(/if \(plates\[dragIdx\]\)\s*plates\[dragIdx\]\.vx = 0;/);
  });

  it('names all three kinds of divergence, and does not call them all rifts', () => {
    const body = fnBody('classifyPair');
    // A continental rift splits CONTINENTAL lithosphere — that is why the
    // example given for it is East Africa. Ocean-meets-continent pulling apart
    // was being handed that same label, and with it a continental-rift
    // explanation, because the old test was a bare `bothOcean ? ridge : rift`.
    expect(body).toMatch(/bothOcean/);
    expect(body).toMatch(/bothLand/);
    expect(body).toMatch(/Divergent — mid-ocean ridge/);
    expect(body).toMatch(/Divergent — continental rift/);
    expect(body).toMatch(/Divergent — rifting margin/);
    // The mixed case must not fall through to either familiar label.
    expect(body, 'a mixed pair can still be called a continental rift')
      .not.toMatch(/bothOcean \? 'Divergent — mid-ocean ridge' : 'Divergent — continental rift'/);
  });

  it('points each kind of divergence at an example that is actually that kind', () => {
    const text = src();
    expect(text).toMatch(/realOceanRidge:/);
    expect(text).toMatch(/realContinentalRift:/);
    expect(text).toMatch(/realRiftingMargin:/);
    // The rifting-margin case is the one worth splitting out: it is how a
    // passive margin forms, and it stops being a plate boundary at all.
    expect(text).toMatch(/realRiftingMargin: 'The Red Sea/);
    // And the panel has to actually choose between them.
    expect(text).toMatch(/rifting margin\/i\.test\(lbl\)/);
  });
});
