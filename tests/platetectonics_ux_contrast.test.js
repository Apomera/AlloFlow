import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Plate Tectonics — approachability, and the contrast that carries it.
 *
 * Two things came out of measuring this tool against the pixels it actually
 * paints rather than against the CSS it declares.
 *
 * The first is a whole class of bug: panels written with a TRANSLUCENT fill
 * (`bg-slate-950/60`, `rgba(15,23,42,0.85)`, `bg-purple-50/60`) take their real
 * colour from whatever sits behind them, and what sits behind them is not this
 * theme's surface. Every one of them composited to a mid-grey and dragged the
 * text on top down with it — the eight hub cards on the landing screen sat
 * between 2.6 and 2.8 to 1, in the dark theme, for every category title.
 *
 * The second is narrower and just as common: a label painted in the SAME vivid
 * brand colour as the pale tint behind it. Green-500 on a green wash is 2.1:1.
 * The fix is to split the roles — the swatch keeps the coding, the type gets a
 * darker ink — so nothing about the colour language changes.
 *
 * These pin the decisions. The measuring itself is not a unit test: it needs a
 * real browser, a real screenshot and a real compositor.
 */

const SOURCE = resolve(process.cwd(), 'stem_lab/stem_tool_platetectonics.js');
let cache = null;
function src() {
  if (cache == null) cache = readFileSync(SOURCE, 'utf8');
  return cache;
}

describe('Landing screen — a way in', () => {
  it('offers an ordered start path before the eight category cards', () => {
    const text = src();
    expect(text).toMatch(/'data-pt-start-here': 'true'/);
    expect(text).toMatch(/var START_STEPS = \[/);
    const strip = text.slice(text.indexOf('var START_STEPS'), text.indexOf('var START_STEPS') + 1800);
    // Three steps, numbered, each with a verb first.
    expect((strip.match(/n: '[123]'/g) || []).length).toBe(3);
    expect(strip).toMatch(/Watch the plates move/);
    expect(strip).toMatch(/Take the three types apart/);
    expect(strip).toMatch(/Check what stuck/);
  });

  it('points step two at what actually keeps its promise', () => {
    const text = src();
    // "Boundaries in Detail" is a catalogue of twenty named real-world
    // boundaries — a good reference, and not an explanation of the three types.
    // The widget that does take them one at a time is always on the page.
    expect(text).toMatch(/scrollTo: 'pt-boundary-simulator'/);
    expect(text).toMatch(/id: 'pt-boundary-simulator'/);
  });

  it('moves focus with the scroll, not just the viewport', () => {
    const text = src();
    // The window is meant to be "this handler", not a byte budget for it. At 900
    // it failed on a two-line comment being added inside the body, which is a
    // property of the slice and not of the behaviour under test.
    const step = text.slice(text.indexOf("var target = document.getElementById(st.scrollTo)"),
                            text.indexOf("var target = document.getElementById(st.scrollTo)") + 1500);
    expect(step).toMatch(/scrollIntoView/);
    expect(step).toMatch(/\[data-tect-section\]/);
    expect(step).toMatch(/focus\(/);
    expect(step).toMatch(/announceToSR/);
  });
});

describe('Three boundary types panel — the first summary a student meets', () => {
  it('gives each type its own captioned cell', () => {
    const text = src();
    const panel = text.slice(text.indexOf('var CELLS = ['), text.indexOf('var CELLS = [') + 1400);
    expect(panel).toMatch(/CONVERGENT/);
    expect(panel).toMatch(/DIVERGENT/);
    expect(panel).toMatch(/TRANSFORM/);
    // Every cell answers the same three things, so the three are comparable.
    ['desc', 'out', 'eg'].forEach((f) => {
      expect((panel.match(new RegExp('\\b' + f + ': ', 'g')) || []).length).toBe(3);
    });
  });

  it('names the view each cell is drawn in', () => {
    const text = src();
    // Transform is the one boundary a slice cannot show, so its cell looks down
    // at the ground instead — and has to say so, or it reads as inconsistent
    // with the two beside it.
    expect(text).toMatch(/view: 'side view'/);
    expect(text).toMatch(/view: 'view from above'/);
    expect(text).toMatch(/'\(' \+ cell\.view \+ '\)'/);
  });

  it('shows the motion rather than only asserting it', () => {
    const text = src();
    expect(text).toMatch(/function arrow\(ax, ay, dir, ink\)/);
    expect(text).toMatch(/function vArrow\(ax, ay, dir, ink, sc\)/);
    // The transform cell shows the displacement itself.
    expect(text).toMatch(/one stream, cut in two|c2\.moveTo\(cx - mHW \+ 4, sy \+ slip\)/);
  });

  it('scales the diagrams to the panel instead of to one hand-tuned size', () => {
    const text = src();
    // The exact floor is a tuning value; that the scale is DERIVED from the
    // stage height is the invariant.
    expect(text).toMatch(/var u = Math\.max\([\d.]+, Math\.min\([\d.]+, stageH \/ 150\)\)/);
  });

  it('lays the three cells out in columns on a wide panel and rows on a narrow one', () => {
    const text = src();
    // Three columns need about 170 px each. Below that the diagrams overlapped
    // their own headings and the captions ran into the footnote.
    expect(text).toMatch(/var stacked = W < 520/);
    expect(text).toMatch(/var cols = stacked \? 1 : 3/);
    expect(text).toMatch(/var rows = stacked \? 3 : 1/);
    // The stage is per CELL. Computed once before the loop it read diagTop and
    // diagBot before they were assigned, so stageH was NaN and the first
    // gradient fed from it threw — taking the whole panel down with it.
    const loopAt = text.indexOf('for (var ci = 0; ci < 3; ci++)');
    expect(loopAt).toBeGreaterThan(-1);
    expect(text.indexOf('var stageH =')).toBeGreaterThan(loopAt);
    // And the shell's height follows, which an inline aspectRatio cannot do.
    expect(text).toMatch(/\.pt-tb-shell\{aspect-ratio:16\/[\d.]+\}/);
    expect(text).toMatch(/@media\(max-width:640px\)\{\.pt-tb-shell\{aspect-ratio:16\/[\d.]+\}\}/);
  });

  it('redraws in the CURRENT theme', () => {
    const text = src();
    // The rAF loop starts once, so without a live channel it would repaint the
    // first render's colours forever.
    expect(text).toMatch(/cvEl\._tbDark = isDark;/);
    expect(text).toMatch(/var dk = !!cvEl\._tbDark;/);
  });

  it('describes all three cells for a student who cannot see them', () => {
    const text = src();
    // Found by its own opening words, not by sitting directly on the attribute:
    // the description is wrapped in __alloT now, and what matters is that all
    // three cells are still described, not where the literal lives.
    const label = /'Three diagrams comparing[^']+'/.exec(text);
    expect(label, 'panel description not found').toBeTruthy();
    expect(label[0]).toMatch(/trench/);
    expect(label[0]).toMatch(/new crust/);
    expect(label[0]).toMatch(/from above rather than in section/);
  });
});

describe('Deep time — drawn to scale', () => {
  it('sizes each era stripe by the time it actually took', () => {
    const text = src();
    // The bar used to give all eight eras `flex: 1`: eight equal stripes for
    // spans of 1,100 Ma, 765 Ma, 135 Ma and 50 Ma, under a heading reading
    // "geological timescale". Equal stripes say the eras are equal lengths of
    // time, which is exactly the misconception a student arrives with.
    expect(text).toMatch(/'data-pt-deeptime': 'true'/);
    expect(text).toMatch(/flex: sp\.span/);
    expect(text).not.toMatch(/flex: 1,\s*\n\s*background: colors\[ei\]/);
  });

  it('reads the ages out of the era table rather than a second list', () => {
    const text = src();
    // Two hand-maintained copies drift the moment an era is added or a date is
    // corrected.
    expect(text).toMatch(/function ageOf\(era\) \{/);
    expect(text).toMatch(/parseFloat\(String\(era\.mya\)\.replace\(\/,\/g, ''\)\)/);
  });

  it('magnifies the tail, and drops entries with no duration', () => {
    const text = src();
    expect(text).toMatch(/'data-pt-deeptime-zoom': 'true'/);
    expect(text).toMatch(/var ZOOM_MA = 500/);
    // 'Present' is a snapshot, not a span; as a flex-0 block its label spilled
    // onto the strip beside it.
    expect(text).toMatch(/Math\.min\(sp\.from, ZOOM_MA\) - sp\.to > 0/);
  });

  it('fades the fill rather than the element, so labels stay readable', () => {
    const text = src();
    expect(text).toMatch(/function fade\(hex, a\)/);
    expect(text).toMatch(/background: fade\(COLORS\[sp\.i\]/);
  });

  it('says out loud that the buttons below are NOT to scale', () => {
    const text = src();
    expect(text).toMatch(/evenly spaced so you can reach any era in one click/);
    expect(text).toMatch(/every stripe is as wide as the time it took/);
  });
});

describe('Screen furniture — the tab you asked for is what you land on', () => {
  it('shows the Earth globe only where it belongs', () => {
    const text = src();
    // It is the Timeline's own picture and worth having beside the Simulation.
    // On the other fifty-two tabs it was five hundred pixels of unrelated
    // scenery between the tab strip and the tab's content.
    expect(text).toMatch(/\(simTab === 'timeline' \|\| simTab === 'sim'\) &&\s*\n\s*React\.createElement\("div", \{ className: "rounded-2xl border-2 border-red-200 overflow-hidden mt-4"/);
  });
});

describe('Motion — the canvases honour prefers-reduced-motion', () => {
  it('asks in one place, and tracks a change of setting', () => {
    const text = src();
    // The CSS at the top of the file covers CSS animations and transitions and
    // does nothing at all for a <canvas> — and this tool is mostly canvas.
    expect(text).toMatch(/function ptReducedMotion\(\)/);
    expect(text).toMatch(/mq\.addEventListener\('change', onChange\)/);
    expect(text).toMatch(/function ptAmbientClock\(seconds, frozenAt\)/);
  });

  it('freezes ambient motion in the simulation while leaving the sim live', () => {
    const text = src();
    // Dragging a plate and triggering an eruption both still have to work, so
    // the loop keeps running; what stops is everything that moves for atmosphere.
    expect(text).toMatch(/var amb = ptReducedMotion\(\) \? 210 : tick;/);
    expect(text).toMatch(/var ambSpin = ptReducedMotion\(\) \? 0 : 1;/);
    expect(text).toMatch(/dot\.angle \+= [\d.]+ \* speed \* spin \* ambSpin;/);
    // Clouds, stars and waves read the ambient phase, not the frame counter.
    expect(text).toMatch(/amb \* 0\.2 \* speed/);
    expect(text).toMatch(/amb \* 0\.05 \+ si/);
    expect(text).toMatch(/amb \* 0\.03 \* speed/);
  });

  it('freezes the two explainer panels at a chosen frame, not a random one', () => {
    const text = src();
    // A frozen mid-animation frame is often a worse picture than any the
    // animation was passing through.
    expect(text).toMatch(/ptAmbientClock\(\(performance\.now\(\) - start\) \/ 1000, 0\.9\)/);
    expect(text).toMatch(/ptAmbientClock\(\(performance\.now\(\) - start\) \/ 1000, 1\.4\)/);
  });

  it('parks those loops rather than spinning on an identical frame', () => {
    const text = src();
    expect(text).toMatch(/if \(!ptReducedMotion\(\)\) cvEl\._tbAnim = requestAnimationFrame\(drawTb\);/);
    expect(text).toMatch(/if \(!ptReducedMotion\(\)\) cvEl\._eqAnim = requestAnimationFrame\(drawEq\);/);
    // A parked panel has no loop coming to repaint it after a resize clears the
    // backing store, so the observer has to do it.
    expect(text).toMatch(/if \(ptReducedMotion\(\)\) drawTb\(\);/);
    expect(text).toMatch(/if \(ptReducedMotion\(\)\) drawEq\(\);/);
  });

  it('does not confuse the rAF handle with a setup flag', () => {
    const text = src();
    // Under reduced motion the handle is 0, so guarding setup on it would re-run
    // setup on the next render and attach a second ResizeObserver every time.
    // The invariant is that the guard reads the INIT FLAG, not the handle —
    // whether it then returns or redraws for a theme change is free to move.
    expect(text).toMatch(/if \(cvEl\._tbInit\)/);
    expect(text).toMatch(/if \(cvEl\._eqInit\)/);
    expect(text).not.toMatch(/if \(cvEl\._tbAnim\) return;/);
    expect(text).not.toMatch(/if \(cvEl\._eqAnim\) return;/);
  });

  it('holds the seismograph trace still without freezing the reading', () => {
    const text = src();
    // The trace scrolls to look like a live instrument. What it teaches is the
    // AMPLITUDE, which the magnitude slider sets and a still trace shows just as
    // well — and the loop keeps running, so the slider still redraws it.
    expect(text).toMatch(/if \(!ptReducedMotion\(\)\) sTick\+\+;/);
  });

  it('stops the globe drifting but leaves the user-driven time-lapse alone', () => {
    const text = src();
    expect(text).toMatch(/if \(!ptReducedMotion\(\)\) tick \+= 0\.5;/);
  });

  it('starts the boundary simulator paused, and the drift off, rather than removing them', () => {
    const text = src();
    // Both are clocks that run unprompted. Neither control is taken away.
    expect(text).toMatch(/running: !ptReducedMotion\(\),/);
    expect(text).toMatch(/var ptDrift = d\.ptDrift != null \? !!d\.ptDrift : !ptReducedMotion\(\);/);
  });
});

describe('Keyboard — the 3D views can be driven without a mouse', () => {
  it('makes both 3D canvases a focus stop', () => {
    const text = src();
    // Both labels call their model "rotatable", and until now the only way to
    // rotate either was to drag it: a keyboard user tabbed from the view toggle
    // straight past the model to the buttons beside it.
    const vent = text.slice(text.indexOf("'data-pt-vent-gl': 'true'"), text.indexOf("'data-pt-vent-gl': 'true'") + 2200);
    const block = text.slice(text.indexOf("'data-tect-gl': 'true'"), text.indexOf("'data-tect-gl': 'true'") + 2200);
    expect(vent).toMatch(/tabIndex: 0/);
    expect(block).toMatch(/tabIndex: 0/);
    expect(vent).toMatch(/onKeyDown: function \(ev\)/);
    expect(block).toMatch(/onKeyDown: function \(ev\)/);
  });

  it('turns, zooms and resets from the keyboard', () => {
    const text = src();
    const vent = text.slice(text.indexOf("'data-pt-vent-gl': 'true'"), text.indexOf("'data-pt-vent-gl': 'true'") + 2200);
    expect(vent).toMatch(/VentGL\.nudge\(-step, 0\)/);
    expect(vent).toMatch(/VentGL\.zoom\(0\.15\)/);
    expect(vent).toMatch(/VentGL\.setCam\(-7, -17\)/);
    const block = text.slice(text.indexOf("'data-tect-gl': 'true'"), text.indexOf("'data-tect-gl': 'true'") + 2200);
    expect(block).toMatch(/rotY: view3d\.rotY - step/);
    expect(block).toMatch(/scale: Math\.min\(2\.6, view3d\.scale \+ 0\.15\)/);
  });

  it('claims the arrow keys so the page does not scroll instead', () => {
    const text = src();
    // The failure that makes a canvas feel dead: you press an arrow and the page
    // moves under you while the model sits still.
    const vent = text.slice(text.indexOf("'data-pt-vent-gl': 'true'"), text.indexOf("'data-pt-vent-gl': 'true'") + 2200);
    const block = text.slice(text.indexOf("'data-tect-gl': 'true'"), text.indexOf("'data-tect-gl': 'true'") + 2200);
    expect(vent).toMatch(/ev\.preventDefault\(\)/);
    expect(block).toMatch(/ev\.preventDefault\(\)/);
  });

  it('tells a nonvisual reader which keys work', () => {
    const text = src();
    expect(text).toMatch(/Focus this model and use the arrow keys to turn it, plus and minus to zoom, and Home to reset/);
    expect(text).toMatch(/Focus this block and use the arrow keys to turn it, plus and minus to zoom, and Home to reset/);
  });
});

describe('Performance — loops stop working when nobody is looking', () => {
  it('asks one cheap, conservative question', () => {
    const text = src();
    expect(text).toMatch(/function ptOnScreen\(el\)/);
    // If the element cannot be measured it returns true: a loop that wrongly
    // keeps running costs a frame, one that wrongly stops is a broken feature.
    expect(text).toMatch(/catch \(e\) \{ return true; \}/);
    // One viewport of slack, so a panel is already running by the time it
    // scrolls into view rather than starting from a blank frame.
    expect(text).toMatch(/r\.bottom > -vh && r\.top < vh \* 2/);
  });

  it('guards every heavy loop on the page', () => {
    const text = src();
    // The simulation, the seismograph, the globe, both explainer panels and the
    // boundary widget's own section.
    expect((text.match(/ptOnScreen\(/g) || []).length).toBeGreaterThanOrEqual(7);
    // The invariant: the sim skips its frame when off screen and stays armed.
    // How the condition is spelled is free to move — it now carries an eruption
    // exception (below), and pinning the old spelling made a correct change red.
    expect(text).toMatch(/if \(!ptOnScreen\(canvasEl\)[^)]*\)[\s\S]{0,120}?canvasEl\._ptAnim = requestAnimationFrame\(draw\);[\s\S]{0,40}?return;/);
    expect(text).toMatch(/if \(!ptOnScreen\(canvasEl\)\) \{ canvasEl\._seisAnim = requestAnimationFrame\(drawSeis\); return; \}/);
    expect(text).toMatch(/if \(!ptOnScreen\(canvas\)\) return;/);
    expect(text).toMatch(/if \(ptOnScreen\(canvas\)\) \(drawRef\.current \|\| draw\)\(ctx, W, H, cur\);/);
  });

  it('stays armed while skipped, so it resumes on scroll rather than staying dead', () => {
    const text = src();
    // Every skip re-arms its own loop. A `return` without one is a panel that
    // never comes back.
    expect(text).toMatch(/if \(!ptOnScreen\(cvEl\)\) \{\s*\n\s*if \(!ptReducedMotion\(\)\) cvEl\._tbAnim = requestAnimationFrame\(drawTb\);/);
    expect(text).toMatch(/if \(!ptOnScreen\(cvEl\)\) \{\s*\n\s*if \(!ptReducedMotion\(\)\) cvEl\._eqAnim = requestAnimationFrame\(drawEq\);/);
  });

  it('lets an in-flight eruption finish even off screen', () => {
    const text = src();
    // `eruptState.tick` only advances inside draw(), so skipping the frame froze
    // the eruption mid-blast — and because the Erupt button is inert while one is
    // active, scrolling away once left it inert FOREVER. Found by driving the
    // challenge list: "trigger 5 eruptions" could not be completed at all.
    expect(text).toMatch(/if \(!ptOnScreen\(canvasEl\) && !eruptState\.active\)/);
  });

  it('bounds how long an eruption can hold the button', () => {
    const text = src();
    // The wait for the last particles to clear was unbounded, so a straggling
    // ash grain could hold the vent "active" for twenty seconds or more.
    expect(text).toMatch(/if \(\(eT > 520 && eDone\) \|\| eT > 900\)/);
    expect(text).not.toMatch(/if \(eT > 520 && volcanoParticles\.length === 0/);
  });

  it('keeps the widget clock running while skipping only its repaint', () => {
    const text = src();
    // The widget is a simulation; a student expects the years to have moved on
    // when they scroll back, so only the expensive half is skipped.
    expect(text).toMatch(/if \(ptOnScreen\(canvas\)\) \(drawRef\.current \|\| draw\)/);
    expect(text).not.toMatch(/if \(!ptOnScreen\(canvas\)\) \{ animRef\.current/);
  });
});

describe('Nonvisual — the description says what is on screen, not what could be', () => {
  it('describes the CURRENT scene, not just the tool', () => {
    const text = src();
    // The canvas label describes what this tool can show. It never said what it
    // was showing: a student reading by ear could drag a plate, produce a trench
    // and a descending slab, and hear nothing about it.
    expect(text).toMatch(/var ptSceneText = \(function \(\)/);
    expect(text).toMatch(/'aria-describedby': 'pt-scene-desc'/);
    expect(text).toMatch(/id: 'pt-scene-desc', className: 'sr-only'/);
    // It reports the live state, not a fixed sentence.
    const scene = text.slice(text.indexOf('var ptSceneText'), text.indexOf('var ptSceneText') + 2400);
    expect(scene).toMatch(/ptFocusBoundary\.a/);
    expect(scene).toMatch(/ptDrift\s*\n?\s*\?/);
    expect(scene).toMatch(/d\.quakeCount/);
  });

  it('splits the long form from the announcement', () => {
    const text = src();
    // The explainer used to be aria-live: five paragraphs fired at a screen
    // reader on every boundary change, which under mantle drift is every few
    // seconds. That is being talked over, not kept informed.
    const expl = text.slice(text.indexOf("'data-pt-boundary-explainer': 'true'"),
                            text.indexOf("'data-pt-boundary-explainer': 'true'") + 700);
    expect(expl).not.toMatch(/'aria-live'/);
    expect(expl).toMatch(/role: 'region'/);
    // One sentence carries the change instead.
    expect(text).toMatch(/'data-pt-scene-live': 'true',\s*\n\s*'aria-live': 'polite', 'aria-atomic': 'true'/);
  });

  it('says it out loud in a form worth hearing', () => {
    const text = src();
    // The visible caption reads "Convergent — ocean sinks under continent",
    // which is right on a chip and clumsy read aloud.
    expect(text).toMatch(/var spoken = ptFocusBoundary\.kind === 'divergent'/);
    expect(text).toMatch(/a convergent boundary where two continents collide/);
    // And it counts in English.
    expect(text).toMatch(/\(qn === 1 \? ' earthquake' : ' earthquakes'\)/);
    expect(text).toMatch(/\(en === 1 \? ' eruption\.' : ' eruptions\.'\)/);
  });

  it('gives every boundary type a plain-language mechanism', () => {
    const text = src();
    const gist = text.slice(text.indexOf('var PT_BOUNDARY_GIST'), text.indexOf('var PT_BOUNDARY_GIST') + 1200);
    ['subduction', 'collision', 'divergent'].forEach((k) => {
      expect(gist).toMatch(new RegExp(k + ':'));
    });
    // No jargon that the sentence does not itself unpack.
    expect(gist).toMatch(/denser ocean plate is bending down and sinking/);
    expect(gist).toMatch(/neither plate is dense enough to sink/);
    expect(gist).toMatch(/new rock is rising into the gap/);
  });
});

describe('Seismogram — the trace shows what the panels around it claim', () => {
  it('draws three arrivals rather than one undifferentiated bump', () => {
    const text = src();
    // It used to be a single smooth sine that swelled and faded — under three
    // cards naming P, S and surface waves, above a widget that locates a quake
    // from the S-minus-P interval, and beside a quiz question about arrival
    // order. None of those three things were visible in the trace.
    expect(text).toMatch(/var VP = PT_SEISMIC\.VP, VS = PT_SEISMIC\.VS, VL = PT_SEISMIC\.VL;/);
    expect(text).toMatch(/var tP = eqDistKm \/ VP;/);
    expect(text).toMatch(/var tS = eqDistKm \/ VS;/);
    expect(text).toMatch(/var tSurf = eqDistKm \/ VL;/);
    expect(text).toMatch(/\{ t: tP, name: 'P wave'/);
    expect(text).toMatch(/\{ t: tS, name: 'S wave'/);
    expect(text).toMatch(/\{ t: tSurf, name: 'surface waves'/);
  });

  it('orders the three by size the way a real record does', () => {
    const text = src();
    const seis = text.slice(text.indexOf('var yP = Math.sin'), text.indexOf('var yP = Math.sin') + 700);
    const amp = [...seis.matchAll(/A \* ([\d.]+) \* env/g)].map(m => +m[1]);
    expect(amp.length).toBe(3);
    // P smallest, then S, then the surface train largest.
    expect(amp[0]).toBeLessThan(amp[1]);
    expect(amp[1]).toBeLessThan(amp[2]);
  });

  it('fits the biggest quakes inside the panel', () => {
    const text = src();
    // Scaled to a nominal fraction of the height, the surface train ran off the
    // top and bottom from about M7 upward — so the largest earthquakes were the
    // ones you could not read. Scaled to the room actually left between the
    // label rows and the bracket, and to the LARGEST phase.
    expect(text).toMatch(/var halfRoom = Math\.max\(24, Math\.min\(mid - 46, sH - 36 - mid\)\)/);
    expect(text).toMatch(/var A = gain \* halfRoom \/ 1\.2;/);
    expect(text).not.toMatch(/var A = gain \* sH \* 0\.40;/);
  });

  it('marks the S minus P interval on the trace it is measured from', () => {
    const text = src();
    expect(text).toMatch(/var spGap = tS - tP;/);
    expect(text).toMatch(/'S − P = ' \+ spGap\.toFixed\(0\) \+ ' s'/);
  });

  it('uses the same velocities as the epicenter widget', () => {
    const text = src();
    // Two derivations of one quantity is a bug class in this file. The widget's
    // KM_PER_SP is (Vp*Vs)/(Vp-Vs) on exactly these numbers, so a distance read
    // off the trace and a distance the widget computes cannot disagree.
    const at = text.indexOf('var PT_SEISMIC =');
    expect(at, 'no shared velocity table').toBeGreaterThan(-1);
    expect(text.slice(at, at + 120)).toMatch(/VP: 6\.0, VS: 3\.5/);
    expect(text).toMatch(/var VP = PT_SEISMIC\.VP;/);
    expect(text).toMatch(/var VS = PT_SEISMIC\.VS;/);
    expect(text).toMatch(/var VP = PT_SEISMIC\.VP, VS = PT_SEISMIC\.VS, VL = PT_SEISMIC\.VL;/);
    expect(text, 'a panel declares its own velocities again').not.toMatch(/var VP = 6\.0/);
  });

  it('gives distance its own control, so the gap is interrogable', () => {
    const text = src();
    // With only a magnitude slider the S-minus-P gap was a constant a student
    // could not question. Magnitude sets amplitude; distance sets the gap.
    expect(text).toMatch(/'data-pt-eq-distance': 'true'/);
    expect(text).toMatch(/var eqDistKm = d\.eqDistKm != null \? d\.eqDistKm : 600;/);
    expect(text).toMatch(/eqDistKm: eqDistKm, isDark: isDark/);
  });

  it('makes magnitude logarithmic on the trace, not just in the caption', () => {
    const text = src();
    // The panel's own prose says a whole unit is about ten times the shaking.
    expect(text).toMatch(/Math\.pow\(10, \(eqMagnitude - 5\) \/ 1\.6\)/);
  });

  it('says out loud what the trace is for', () => {
    const text = src();
    expect(text).toMatch(/'data-pt-seis-note': 'true'/);
    expect(text).toMatch(/about 8\.4 kilometres for every second of the gap/);
    expect(text).toMatch(/Epicenter Triangulation panel below/);
  });
});

describe('Magnitude vs intensity — the panel draws both scales', () => {
  it('shows intensity at all, not just magnitude', () => {
    const text = src();
    // The panel is titled "Magnitude vs Intensity" and its footnote defines both.
    // What it DREW was six magnitude traces, each captioned with what people feel
    // — M2 "barely felt", M8 "severe destruction" — which maps magnitude straight
    // onto felt effects and is the misconception the panel exists to correct.
    expect(text).toMatch(/colHeader\(mx0, my0, 'MAGNITUDE', 'one number for the whole earthquake'/);
    expect(text).toMatch(/colHeader\(ix0, iy0, 'INTENSITY', 'a different value in every place, for ONE earthquake'/);
    expect(text).toMatch(/var PLACES = \[/);
  });

  it('varies intensity with distance for ONE earthquake', () => {
    const text = src();
    const places = text.slice(text.indexOf('var PLACES = ['), text.indexOf('var PLACES = [') + 900);
    // Mercalli's own Roman numerals, four distances, one quake.
    ['IX', 'VII', 'V', 'II'].forEach(n => expect(places).toMatch(new RegExp("num: '" + n + "'")));
    [10, 60, 200, 600].forEach(k => expect(places).toMatch(new RegExp('km: ' + k + ',')));
    expect(text).toMatch(/The same M7 quake\. Distance, depth and ground all change what is felt\./);
  });

  it('says the magnitude rows are compressed instead of faking the ratio', () => {
    const text = src();
    // A true M8 is 10,000x an M4 — four orders of magnitude no single panel can
    // draw. Scaling honestly and clipping was WORSE: M6 and M8 both hit the cap
    // and came out the same size, directly under a caption saying each whole
    // number is ten times the last.
    expect(text).toMatch(/a real M8 is 10,000x an M4/);
    expect(text).not.toMatch(/rowH \* 0\.10 \* Math\.pow\(10, \(mg\.m - 4\) \/ 2\.4\)/);
    // And the rows still increase monotonically.
    const m = /var amp = rowH \* \(mi === 0 \? ([\d.]+) : mi === 1 \? ([\d.]+) : ([\d.]+)\)/.exec(text);
    expect(m, 'row amplitudes not found').toBeTruthy();
    expect(+m[1]).toBeLessThan(+m[2]);
    expect(+m[2]).toBeLessThan(+m[3]);
  });

  it('states the distinction in one line a student can carry away', () => {
    expect(src()).toMatch(/Magnitude is what the earthquake DID\. Intensity is what it did TO YOU, where you were standing\./);
  });

  it('stacks and shortens rather than clipping on a narrow panel', () => {
    const text = src();
    expect(text).toMatch(/var stacked = W < 620;/);
    expect(text).toMatch(/colW < 430 \? pl\.tight : pl\.say/);
    expect(text).toMatch(/\.pt-eq-shell\{aspect-ratio:16\/[\d.]+\}/);
    expect(text).toMatch(/@media\(max-width:620px\)\{\.pt-eq-shell\{aspect-ratio:16\/[\d.]+\}\}/);
  });

  it('redraws in the current theme and describes both columns', () => {
    const text = src();
    expect(text).toMatch(/cvEl\._eqDark = isDark;/);
    expect(text).toMatch(/var dk = !!cvEl\._eqDark;/);
    const label = /'Two columns comparing the two earthquake scales[^']+'/.exec(text);
    expect(label, 'panel description not found').toBeTruthy();
    expect(label[0]).toMatch(/Mercalli nine at ten kilometres/);
    expect(label[0]).toMatch(/what it did to you, where you were standing/);
  });
});

describe('Learn panel — the reference that sits on every screen', () => {
  it('does not list subduction as a fourth boundary type', () => {
    const text = src();
    // Flush with the other three, the table said there are FOUR types — the same
    // category error the simulation used to make, and one the quiz's own
    // wrong-answer feedback explicitly corrects.
    expect(text).toMatch(/'↳ Subduction','a KIND of convergent boundary'/);
    expect(text).toMatch(/'↳ Collision','the OTHER kind of convergent'/);
    expect(text).not.toMatch(/\['Subduction','Oceanic dives under continental'/);
  });

  it('themes its own inks instead of borrowing light-mode ones', () => {
    const text = src();
    // The panel's container was theme-aware; its headings and table cells were
    // not — red-800 and slate-600 on a dark card, in a state the contrast sweeps
    // never measured because the accordion is collapsed by default.
    const learn = text.slice(text.indexOf("Learn: Earth's Layers"), text.indexOf("Learn: Earth's Layers") + 3200);
    expect(learn).not.toMatch(/"font-black text-red-800 mb-1"/);
    expect(learn).not.toMatch(/"py-1\.5 text-slate-600/);
    expect(learn).toMatch(/isDark \? "text-red-300" : "text-red-800"/);
    expect(learn).toMatch(/isDark \? "text-slate-300" : "text-slate-700"/);
  });
});

describe('Contrast — translucent fills that took their colour from the wrong surface', () => {
  it('paints the hub category cards opaquely in dark mode', () => {
    const text = src();
    expect(text).toMatch(/isDark \? "bg-slate-950 border-2 border-slate-800/);
    expect(text).not.toMatch(/bg-slate-950\/60 border-2 border-slate-800/);
  });

  it('paints the progress card and the sim controls opaquely in dark mode', () => {
    const text = src();
    expect(text).not.toMatch(/isDark \? "bg-slate-900\/60 border-slate-800"/);
    expect(text).not.toMatch(/isDark \? "border-slate-800 bg-slate-950\/60"/);
  });

  it('gives the widget container fallbacks an opaque value', () => {
    const text = src();
    // Where the host defines these vars nothing changes; where it does not, the
    // panel was painting mid-grey and every ink on it was graded against the
    // wrong surface.
    expect(text).not.toMatch(/var\(--allo-stem-deeper, rgba\(15,23,42,0\.85\)\)/);
    expect(text).not.toMatch(/var\(--allo-stem-panel, rgba\(30,41,59,0\.7\)\)/);
  });

  it('paints both goal notes and the AI panel opaquely in both themes', () => {
    const text = src();
    // A 14% wash only reads as a pale card when something light happens to be
    // behind it.
    expect(text).not.toMatch(/rgba\(220,38,38,0\.14\) 0%/);
    expect(text).not.toMatch(/rgba\(245,158,11,0\.14\) 0%/);
    expect(text).not.toMatch(/bg-purple-950\/20|bg-purple-50\/60/);
  });

  it('gives light-mode cards their own text colour', () => {
    const text = src();
    // These cards named a background but no ink, so anything inside them that
    // did not set its own inherited the shell's dark-theme colour — slate-200
    // on white, about 1.4:1.
    expect(text).not.toMatch(/text-slate-200' : 'bg-white border-emerald-300'/);
    expect(text).not.toMatch(/text-slate-200' : 'bg-white border-orange-300'/);
    expect((text.match(/bg-white border-(emerald|orange)-300 text-slate-800/g) || []).length).toBeGreaterThanOrEqual(9);
  });
});

describe('Contrast — colour coding and legibility split apart', () => {
  it('gives the magnitude tiers and wave types a separate text ink', () => {
    const text = src();
    // `color` still drives the borders, fills and canvas; `ink` drives the type.
    // Scoped to the two tables in question. These hexes also appear as station
    // colours elsewhere in the file, and an unscoped indexOf lands on the first
    // of those instead — a test that then reports on code it was never about.
    const magAt = text.indexOf("{ range: '1-3'");
    const waveAt = text.indexOf("{ name: 'P-wave', desc:");
    expect(magAt, 'magnitude table not found').toBeGreaterThan(-1);
    expect(waveAt, 'wave table not found').toBeGreaterThan(-1);
    const tables = text.slice(magAt, magAt + 1200) + text.slice(waveAt, waveAt + 1200);
    ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'].forEach((c) => {
      const at = tables.indexOf("color: '" + c + "'");
      expect(at, 'no entry for ' + c).toBeGreaterThan(-1);
      expect(tables.slice(at, at + 90)).toMatch(/ink: '#[0-9a-f]{6}', inkDark: '#[0-9a-f]{6}'/);
    });
    expect(text).toMatch(/color: isDark \? \(d2\.inkDark \|\| d2\.color\) : \(d2\.ink \|\| d2\.color\)/);
    expect(text).toMatch(/color: isDark \? \(w2\.inkDark \|\| w2\.color\) : \(w2\.ink \|\| w2\.color\)/);
  });

  it('fills the magnitude badge with the tier ink rather than the vivid swatch', () => {
    const text = src();
    expect(text).toMatch(/eqMagnitude >= 7 \? '#b91c1c' : eqMagnitude >= 5 \? '#b45309' : '#15803d'/);
    expect(text).not.toMatch(/eqMagnitude >= 7 \? '#dc2626' : eqMagnitude >= 5 \? '#f59e0b' : '#22c55e'/);
  });

  it('darkens both inks on the selected era chip, which paints a red gradient', () => {
    const text = src();
    expect(text).toMatch(/isActive \? 'text-red-900' : 'text-slate-700'/);
    expect(text).not.toMatch(/className: 'text-\[11px\] text-slate-600' \}, era\.mya\)/);
  });

  it('keeps the header subtitle off the raw banner colour', () => {
    const text = src();
    expect(text).not.toMatch(/className: "text-red-200 text-sm font-bold ml-2"/);
  });

  // The whole-tool sweep (54 tabs x 2 themes) ended on two bug classes that had
  // survived every earlier pass because neither is visible in the source colour:
  // a dark card painted at 60% alpha takes its real colour from whatever is
  // behind it, and a catalogue ink written once serves both themes.
  it('paints dark cards opaque, so the ink is graded against the colour it lands on', () => {
    const text = src();
    expect(text).not.toMatch(/bg-slate-9(5|0)0\/[0-9]/);
  });

  it('gives every catalogue card ink a value for each theme', () => {
    const text = src();
    // Small metadata inks sit on near-white; the -600 tier lands at ~3.4:1.
    ['cyan', 'emerald', 'green', 'teal'].forEach((hue) => {
      expect(text, hue + '-600 metadata ink is below AA at 10px')
        .not.toMatch(new RegExp("text-\[10px\] text-" + hue + "-600"));
    });
    // The plate cards: name and metadata both branch on the theme.
    // Anchored on the card's own data hook, not on what its click handler
    // happens to write — this pinned `upd({ _plateFocus: p.id })` and went red
    // when that dead state was replaced by the wired one, though the invariant
    // it exists to protect never moved.
    const at = text.indexOf("'data-pt-plate-card': p.name");
    expect(at, 'plate encyclopedia cards not found').toBeGreaterThan(-1);
    const card = text.slice(at, at + 1400);
    expect(card).toMatch(/isDark \? 'text-red-\d00' : 'text-red-800'/);
    expect(card, 'unthemed slate metadata ink on a plate card')
      .not.toMatch(/className: 'text-\[10px\] text-slate-\d00'/);
  });

  // ── Classroom Activities ────────────────────────────────────────────────
  // Thirty activities in a flat wall, no search (every sibling catalogue tab
  // has one), no grade filter, and not one mention of the simulator they are
  // embedded in.
  describe('classroom activities', () => {
    const activities = () => {
      const text = src();
      const at = text.indexOf('var L = [["Graham Cracker');
      expect(at, 'activity table not found').toBeGreaterThan(-1);
      // eslint-disable-next-line no-eval
      return eval(text.slice(text.indexOf('[[', at), text.indexOf('];', at) + 1));
    };
    const homeMap = () => {
      const text = src();
      const at = text.indexOf('var HOME = {');
      expect(at, 'activity link map not found').toBeGreaterThan(-1);
      // eslint-disable-next-line no-eval
      return eval('(' + text.slice(text.indexOf('{', at), text.indexOf('};', at) + 1) + ')');
    };

    it('offers a grade band filter and a search, like its sibling tabs', () => {
      const text = src();
      expect(text).toMatch(/'data-pt-lesson-band': b\.id/);
      expect(text).toMatch(/aria_search_activities', 'Search classroom activities'/);
      // The band set itself, so a rename cannot quietly drop one.
      const at = text.indexOf('var BANDS = [');
      expect(at, 'band table not found').toBeGreaterThan(-1);
      const bands = text.slice(at, at + 600);
      ['all', 'k2', '35', '68', '912'].forEach((id) => {
        expect(bands, 'missing grade band ' + id).toMatch(new RegExp("id: '" + id + "'"));
      });
      // Bands are pressable state, not just styled buttons.
      expect(text).toMatch(/'aria-pressed': on \? 'true' : 'false'/);
    });

    it('filters by overlap so a 4-8 activity reaches both a 3-5 and a 6-8 teacher', () => {
      const text = src();
      const at = text.indexOf('if (bandSpan) {');
      expect(at).toBeGreaterThan(-1);
      const block = text.slice(at, at + 400);
      expect(block).toMatch(/s\[1\] < bandSpan\[0\] \|\| s\[0\] > bandSpan\[1\]/);
    });

    it('reads K as a grade rather than as NaN', () => {
      const text = src();
      const at = text.indexOf('function gradeSpan');
      expect(at, 'gradeSpan not found').toBeGreaterThan(-1);
      const block = text.slice(at, at + 500);
      // 'K-12' and 'K-2' are both in the data; parseInt('K') is NaN and would
      // have silently dropped them from every band.
      expect(block).toMatch(/toUpperCase\(\) === 'K'/);
      expect(block).toMatch(/isNaN\(lo\)/);
      expect(block).toMatch(/isNaN\(hi\)/);
      expect(activities().some((r) => /K/.test(r[1])), 'no K-grade rows to protect').toBe(true);
    });

    it('floats the best fits to the top instead of hiding the rest', () => {
      const text = src();
      const at = text.indexOf('var bandMid');
      expect(at, 'best-fit ordering not found').toBeGreaterThan(-1);
      const block = text.slice(at, at + 400);
      expect(block).toMatch(/Math\.abs/);
      // Sorts a copy: mutating the shared row table in place would reorder the
      // list for every later render.
      expect(block).toMatch(/shown\.slice\(\)\.sort/);
    });

    it('sends every activity to a tab that actually exists', () => {
      const text = src();
      const rows = activities();
      const HOME = homeMap();
      const titles = new Set(rows.map((r) => r[0]));
      // A key that matches no activity is a dead entry nothing will ever show.
      Object.keys(HOME).forEach((k) => {
        expect(titles.has(k), 'link map key matches no activity: ' + k).toBe(true);
      });
      // Every target must be a rendered tab, or the button navigates to a blank.
      const tabs = new Set((text.match(/simTab === ["'][a-zA-Z_]*["']/g) || [])
        .map((m) => m.replace(/simTab === ["']/, '').replace(/["']/, '')));
      Object.keys(HOME).forEach((k) => {
        expect(tabs.has(HOME[k][0]), k + ' links to a tab that does not render: ' + HOME[k][0]).toBe(true);
      });
      expect(rows.length).toBeGreaterThanOrEqual(30);
      expect(Object.keys(HOME).length, 'some activities have no home in the tool').toBe(rows.length);
    });

    it('keeps the count line on a light ink, because the panel never goes dark', () => {
      const text = src();
      const at = text.indexOf("key: 'count'");
      expect(at).toBeGreaterThan(-1);
      const block = text.slice(at, at + 1100);
      // bg-teal-50 is unthemed: this tool renders as a light card in a dark
      // shell. A dark-mode ink here measured 1.42:1.
      expect(block, 'count line branches on theme while its panel does not')
        .not.toMatch(/isDark \? 'text-teal-300'/);
      expect(block).toMatch(/text-teal-800/);
    });
  });

  it('does not strand the AI panel when the host has no working AI bridge', () => {
    const text = src();
    // The typeof guard proves callGemini is a FUNCTION, not that it returns a
    // promise. A host supplying a disabled no-op bridge returned undefined,
    // .then threw, and aiLoading stayed true for the rest of the session.
    const at = text.indexOf('var aiPromise = callGemini(');
    expect(at, 'AI call is not captured before use').toBeGreaterThan(-1);
    const block = text.slice(at, at + 420);
    expect(block).toMatch(/typeof aiPromise\.then !== 'function'/);
    // The bail-out must clear the spinner, not just set an error. Scoped to the
    // guard body: a wider window also caught the .catch further down, so the
    // assertion passed with the spinner left running.
    const gAt = block.indexOf("typeof aiPromise.then !== 'function'");
    const guardBody = block.slice(gAt, block.indexOf('}', gAt));
    expect(guardBody, 'bail-out leaves the spinner running').toMatch(/aiLoading: false/);
    expect(text, 'AI result is still consumed without a thenable check')
      .not.toMatch(/callGemini\(prompt, false, false, 0\.5\)\.then/);
  });
});

describe('The reference shelf is not an answer key', () => {
  // Everything below the tab content is deliberately a shelf that stays on the
  // page whatever tab you are on — right everywhere except the quiz. Counted
  // against the bank: FOUR of the eight questions are answered by the panels
  // sitting under them. "What type of boundary creates the Himalayas?" has "the
  // Andes, Japan, the Himalaya" printed under CONVERGENT about four hundred
  // pixels below the question; "What forms at a divergent boundary in the
  // ocean?" has the ridge under DIVERGENT; subduction is drawn in the
  // convergent cell; and the simulator labels its own convection limbs, which
  // is question five. Scrolling is not retrieval.
  it('puts the shelf away while the quiz is being answered', () => {
    const text = src();
    expect(text).toMatch(/var ptShelfOpen = simTab !== 'quiz'/);
    // Reopens on its own once a full pass is done — then the shelf is for review.
    expect(text).toMatch(/var ptQuizPassDone = quizIdx >= QUIZZES\.length/);
    expect(text).toMatch(/ptQuizPassDone \|\| !!d\.ptShelfOpen/);
  });

  it('gates every panel of the shelf, not just the one that gives away question one', () => {
    const text = src();
    // All four: the boundary-types panel, magnitude vs intensity, the boundary
    // simulator and the epicentre widget.
    const gated = text.match(/ptShelfOpen && React\.createElement/g) || [];
    expect(gated.length, 'expected all four shelf panels to be gated').toBeGreaterThanOrEqual(4);
    expect(text).toMatch(/ptShelfOpen && React\.createElement\(window\.AlloTectonicsInteractive/);
    expect(text).toMatch(/ptShelfOpen && React\.createElement\(window\.AlloTectonicsEpicenter/);
  });

  it('says where the shelf went and lets the student open it anyway', () => {
    const text = src();
    // Hiding it silently would just look broken, and a student who wants the
    // boundary table should not have to guess it still exists.
    expect(text).toMatch(/'data-pt-shelf-closed': 'true'/);
    expect(text).toMatch(/'data-pt-shelf-open': 'true'/);
    expect(text).toMatch(/shelf_open_btn/);
    expect(text).toMatch(/upd\(\{ ptShelfOpen: true \}\)/);
  });

  it('keeps the Start here step working when the shelf it points at is closed', () => {
    const text = src();
    // Step 2 scrolls to the boundary simulator, which is now conditional. A
    // missing target must open the shelf, not leave the button inert.
    expect(text).toMatch(/if \(!target\) \{ upd\(\{ ptShelfOpen: true \}\); return; \}/);
  });
});

describe('The magnitude panel can name the earthquakes the tool makes', () => {
  it('carries a tier above Strong', () => {
    const text = src();
    // The slider runs to M9 and settleBoundary produces 7.4-9.1 for subduction,
    // but the tiers stopped at "Strong (6-7)" and lit that card for everything
    // from M6 up. A student who built a megathrust, watched it trace on the
    // seismograph and came here was told they had made a "Strong (6-7)".
    expect(text).toMatch(/range: '8-9'/);
    expect(text).toMatch(/stem\.platetectonics\.great'/);
    expect(text).toMatch(/Megathrust/);
  });

  it('derives the highlight from the tier bands instead of restating them', () => {
    const text = src();
    // The old test was three hard-coded comparisons that had to be kept in step
    // with three hard-coded labels by hand, which is how M8 and M9 ended up
    // inside a card reading 6-7.
    expect(text).toMatch(/var isActive = eqMagnitude >= d2\.lo && eqMagnitude < d2\.hi/);
    expect(text, 'the hard-coded band test is back')
      .not.toMatch(/d2\.range === '6-7' && eqMagnitude >= 6\)/);
  });
});

describe('The seismogram is readable at its own default', () => {
  it('lifts the trace off the baseline without abandoning the log law', () => {
    const text = src();
    // Drawn at true log scale with M9 filling the box, the panel's own default
    // (M5) came out at four per cent of the available amplitude — a flat line,
    // with the three arrivals it exists to show invisible until a student
    // happened to drag past about M7. The law is still the basis; it is the
    // normalisation that was wrong.
    expect(text).toMatch(/Math\.pow\(10, \(eqMagnitude - 5\) \/ 1\.6\)/);
    expect(text).toMatch(/var gain = 0\.14 \+ 0\.86 \* Math\.pow\(logA, 0\.45\)/);
  });

  it('declares the compression rather than hiding it', () => {
    const text = src();
    // Same choice the Magnitude vs Intensity panel makes further down the page:
    // an abbreviation you declare beats a distortion you hide.
    expect(text).toMatch(/the height of the trace is compressed/);
    expect(text).toMatch(/use this one for the ORDER and the TIMING/);
  });
});

describe('Phone legibility — figures drawn in a fixed space', () => {
  // Four panels draw in fixed coordinates and scale to fit, so on a 340 px
  // screen their 10-11 px labels came out at 4-6 px. Each got a different
  // remedy; these pin that the remedy is still wired, not how it is spelled.
  it('toggles the stacked figure layouts and the scroll frame from CSS, so the hidden variant leaves the a11y tree', () => {
    const text = src();
    expect(text).toMatch(/\.pt-stress-narrow,\.pt-casc-narrow,\.pt-casc-key,\.pt-tl-legend,\.pt-tect-swipe\{display:none\}/);
    expect(text).toMatch(/@media\(max-width:520px\)\{\.pt-stress-wide,\.pt-casc-wide\{display:none\}\.pt-stress-narrow,\.pt-casc-narrow\{display:block\}\.pt-casc-key\{display:grid\}\}/);
    expect(text).toMatch(/@media\(max-width:560px\)\{\.pt-tect-frame\{overflow-x:auto[^}]*\}\.pt-tect-frame>canvas\[data-tect-section\]\{min-width:540px\}/);
    expect(text).toMatch(/@media\(max-width:640px\)\{\.pt-tl-lbl\{display:none\}\.pt-tl-legend\{display:flex\}\}/);
  });

  it('builds the stress diagram twice and scales the fault block up as a group in the stacked one', () => {
    const text = src();
    const start = text.indexOf('var buildStress = function (narrow)');
    expect(start).toBeGreaterThan(0);
    const body = text.slice(start, start + 9000);
    expect(body).toMatch(/var W = narrow \? 380 : 760/);
    expect(body).toMatch(/var blockKids = kids\.splice\(blockStart\);\s*kids\.push\(h\('g', \{ key: 'blk', transform: 'scale\(1\.4\)' \}, blockKids\)\)/);
    expect(body).toMatch(/var meterX = narrow \? 16 : 330, meterW = narrow \? 348 : 400/);
    expect(body).toMatch(/return h\(React\.Fragment, null, buildStress\(false\), buildStress\(true\)\)/);
    // both variants keep the outcome hook the stress-lab test reads
    expect(body.match(/'data-pt-stress-diagram': failure/g)).toHaveLength(1);
    expect(body).toMatch(/'data-pt-stress-layout': narrow \? 'narrow' : 'wide'/);
  });

  it('gives the Cascadia section numbered markers plus an HTML key on phones, with the SVG text dropped', () => {
    const text = src();
    const start = text.indexOf('var CASC_KEY = [');
    expect(start).toBeGreaterThan(0);
    const body = text.slice(start, start + 9000);
    const entries = body.slice(0, body.indexOf('];')).match(/\{ n: \d, at: \[/g) || [];
    expect(entries).toHaveLength(7);
    expect(body).toMatch(/var geom = kids\.filter\(function \(k\) \{ return k && k\.type !== 'text'; \}\)/);
    expect(body).toMatch(/e\('g', \{ key: 'geom', transform: 'scale\(0\.5\)' \}, geom\)/);
    expect(body).toMatch(/var mx = m\.at\[0\] \* 0\.5, my = m\.at\[1\] \* 0\.5/);
    expect(body).toMatch(/buildCasc\(false\), buildCasc\(true\),\s*e\('ol', \{ className: 'pt-casc-key/);
    expect(body).toMatch(/CASC_KEY\.map\(function \(m\)/);
  });

  it('keeps the boundary widget at 540 px inside a sideways-scrolling frame with a swipe hint', () => {
    const text = src();
    expect(text).toMatch(/className: 'pt-tect-frame md:col-span-2 rounded-xl overflow-hidden border relative /);
    expect(text).toMatch(/className: 'pt-tect-swipe text-\[11px\][^']*' \+ \(isDark[\s\S]{0,200}style: \{ position: 'sticky', left: 0 \}/);
  });

  it('scales the epicenter map text and readings box by the canvas shrink, and redraws when that changes', () => {
    const text = src();
    const start = text.indexOf('function draw(ctx, cur) {');
    const body = text.slice(start, start + 7000);
    expect(body).toMatch(/var ui = Math\.max\(1, Math\.min\(1\.7, W_CANVAS \/ \(\(cvNode && cvNode\.clientWidth\) \|\| W_CANVAS\)\)\)/);
    // the HUD grows with its text: width, height, row step and x all follow ui
    expect(body).toMatch(/var rowH = 14 \* ui, hudW = 170 \* ui, hudX = W_CANVAS - 8 - hudW/);
    expect(body).toMatch(/ctx\.fillRect\(hudX, 8, hudW, hudH\)/);
    // every label font in the map reads ui
    const fonts = body.match(/ctx\.font = [^;]+;/g) || [];
    expect(fonts.length).toBeGreaterThanOrEqual(7);
    fonts.forEach((f) => expect(f).toMatch(/\* ui\)/));
    // a resize alone must trigger a repaint: the width is part of the signature
    const sig = text.slice(text.indexOf('var sig = JSON.stringify(sRef.current)'), text.indexOf('var sig = JSON.stringify(sRef.current)') + 260);
    expect(sig).toMatch(/\+ '\|' \+ canvas\.clientWidth;/);
  });

  it('moves the deep-time era names out of the bar and into a legend on phones', () => {
    const text = src();
    const start = text.indexOf("'data-pt-deeptime-zoom': 'true'");
    const body = text.slice(start, start + 4000);
    expect(body).toMatch(/className: 'pt-tl-lbl text-\[10px\] font-bold whitespace-nowrap/);
    const legend = body.indexOf("'data-pt-deeptime-legend': 'true'");
    expect(legend).toBeGreaterThan(0);
    expect(body.slice(legend, legend + 700)).toMatch(/tail\.map\(function \(sp\)[\s\S]*ERAS\[sp\.i\]\.name/);
  });
});

describe('The 3D volcano view owns its own screen furniture', () => {
  it('changes the canvas header and drops the currents chip when the cutaway is up', () => {
    const text = src();
    const i = text.indexOf('"Live tectonic model"');
    const body = text.slice(i, i + 1600);
    expect(body).toMatch(/ptVent3D\s*\?\s*"Volcano cutaway[^"]*"\s*:\s*"Drag the crust plates and compare the boundary response"/);
    expect(body).toMatch(/!ptVent3D && React\.createElement\("span", \{[^}]*\}, showConvection \? "Currents visible" : "Currents hidden"\)/);
  });
  it('keeps the depth ticks readable and the resting glow off', () => {
    const text = src();
    const scale = text.slice(text.indexOf("[-25,   '10 km',   '#cbd5e1']"), text.indexOf("[-25,   '10 km',   '#cbd5e1']") + 2200);
    const m = scale.match(/tl\.scale\.multiplyScalar\(([\d.]+)\)/);
    expect(m).not.toBeNull();
    expect(parseFloat(m[1])).toBeGreaterThanOrEqual(0.85);
    const hot = text.match(/var hot = ph === 'blast' \? 1 : [^;]*: ([\d.]+);/);
    expect(hot).not.toBeNull();
    expect(parseFloat(hot[1])).toBe(0);
  });
});

describe('Sim canvas on a phone: the contact state', () => {
  it('drops the quake reason line below 720 px and shrinks the box with it', () => {
    const text = src();
    const i = text.indexOf("var lqTxt = 'M ' + lq.mag.toFixed(1);");
    const body = text.slice(i, i + 1400);
    expect(body).toMatch(/var lqWhy = cW < 720 \? '' : \(KIND_WHY\[lq\.kind\] \|\| ''\)/);
    expect(body).toMatch(/var lqH = lqWhy \? 32 : 22/);
  });
  it('lets the boundary caption cross to the arc side when the clamp would push it back over the cone', () => {
    const text = src();
    const i = text.indexOf('var chxWant = arcSide === 0 ? C.mid');
    const body = text.slice(i, i + 900);
    expect(body).toMatch(/if \(arcSide !== 0 && Math\.abs\(chx - chxWant\) > 8\) \{[\s\S]*if \(Math\.abs\(chxAlt - C\._arcX\) > Math\.abs\(chx - C\._arcX\)\) chx = chxAlt;/);
  });
  it('keeps the crustal root label on the canvas', () => {
    const text = src();
    // The invariant is that the label is drawn and CLAMPED inside the canvas,
    // not how the words read - the text is translated now.
    expect(text).toContain("fig_crustal_root', 'crustal root'");
    expect(text).toMatch(/fig_crustal_root'[^)]*\), Math\.max\(rootLblW \/ 2 \+ 6, Math\.min\(cW - rootLblW \/ 2 - 6, B\.mid\)\)/);
  });
});

describe('Catalogue searches say when nothing matches', () => {
  it('routes the plate, volcano and glossary lists through one empty-state wrapper', () => {
    const text = src();
    expect(text).toMatch(/var ptEmptyOr = function \(term, list\) \{\s*if \(list\.length \|\| !term\) return list;/);
    expect(text).toMatch(/'data-pt-no-matches': 'true', role: 'status'/);
    expect(text).toMatch(/ptEmptyOr\(d\._plateSearch, PLATE_DB\.filter\(/);
    expect(text).toMatch(/ptEmptyOr\(d\._volcanoSearch, VOLCANO_DB\.filter\(/);
    expect(text).toMatch(/ptEmptyOr\(d\._glossarySearch, G\.filter\(/);
  });
});

describe('Quick-Review cards are flash cards, not an answer sheet', () => {
  // The panel told the student to answer in their head and then check, while
  // printing the answer in the same card. Same defect class as the reference
  // shelf that used to sit open under the quiz.
  it('hides every answer behind its own reveal, with one control for all sixty', () => {
    const text = src();
    const i = text.indexOf('simTab === "review"');
    const j = text.indexOf('simTab === "faq"', i);
    const blk = text.slice(i, j);
    expect((blk.match(/ptReviewAnswer\(\d+, __alloT\(/g) || []).length).toBe(60);
    // no answer is rendered as a bare labelled div any more
    expect(blk).not.toMatch(/React\.createElement\('span', \{ className: 'font-bold text-indigo-700' \}, "Answer: "\)/);
    const helper = text.slice(text.indexOf('var ptReviewAnswer = function (n, text)'), text.indexOf('var ptReviewAnswer = function (n, text)') + 2600);
    expect(helper).toMatch(/var open = !!\(d\._ptRevealed \|\| \{\}\)\[n\]/);
    expect(helper).toMatch(/'data-pt-review-reveal': String\(n\)/);
  });

  it('keeps the button in place as a toggle, so activating it does not destroy the focused element', () => {
    const text = src();
    const helper = text.slice(text.indexOf('var ptReviewAnswer = function (n, text)'), text.indexOf('var ptReviewAnswer = function (n, text)') + 2600);
    // The button is rendered unconditionally and the answer hangs off it.
    expect(helper).toMatch(/React\.createElement\('button', \{\s*type: 'button', 'data-pt-review-reveal': String\(n\)/);
    expect(helper).toMatch(/'aria-expanded': open \? 'true' : 'false', 'aria-controls': aid/);
    expect(helper).toMatch(/open \? __alloT\('stem\.platetectonics\.hide_answer'[^)]*\) : __alloT\('stem\.platetectonics\.show_answer'/);
    // and the element aria-controls names actually exists when open
    expect(helper).toMatch(/open && React\.createElement\('div', \{ id: aid/);
    // the toggle closes as well as opens
    expect(helper).toMatch(/if \(open\) \{ delete m\[n\]; \} else \{ m\[n\] = true; \}/);
  });

  it('drives show-all from the same per-card state, so the two cannot disagree', () => {
    const text = src();
    const i = text.indexOf("'data-pt-review-reveal-all'");
    const body = text.slice(i - 500, i + 900);
    expect(body).toMatch(/var allOpen = opened >= PT_REVIEW_CARDS/);
    expect(body).toMatch(/'data-pt-review-reveal-all': String\(allOpen\)/);
    expect(body).toMatch(/if \(allOpen\) \{ upd\(\{ _ptRevealed: \{\} \}\); return; \}/);
    // no separate reveal-all flag survives anywhere
    expect(text).not.toMatch(/_ptRevealAll/);
    // and the count the control iterates matches the cards the markup renders
    const blk = text.slice(text.indexOf('simTab === "review"'), text.indexOf('simTab === "faq"'));
    const n = parseInt((text.match(/var PT_REVIEW_CARDS = (\d+)/) || [])[1], 10);
    expect((blk.match(/ptReviewAnswer\(\d+, __alloT\(/g) || []).length).toBe(n);
  });

  it('renders each field label once, by stripping the value that repeats it', () => {
    const text = src();
    const i = text.indexOf('simTab === "review"');
    const blk = text.slice(i, text.indexOf('simTab === "faq"', i));
    expect((blk.match(/ptReviewField\("(Concept|Question): ", __alloT\(/g) || []).length).toBe(120);
    const strip = text.slice(text.indexOf('var ptStripLabel = function (label, text)'), text.indexOf('var ptStripLabel = function (label, text)') + 700);
    // The label can never carry regex punctuation into new RegExp: everything
    // but letters, digits and spaces is stripped before the pattern is built.
    expect(strip).toMatch(/replace\(\/\[\^A-Za-z0-9 \]\+\/g, ' '\)/);
    // Built from the label, anchored, and case-insensitive — so it removes a
    // repeated PREFIX and can never eat a match from the middle of an answer.
    expect(strip).toMatch(/new RegExp\([^)]*\+ lab \+[^)]*'i'\)/);
    expect(strip).toMatch(/new RegExp\('\^/);
  });

  it('keeps the review card ink light, because the card is white in both themes', () => {
    const text = src();
    const field = text.slice(text.indexOf('var ptReviewField = function (label, text)'), text.indexOf('var ptReviewField = function (label, text)') + 600);
    expect(field).toMatch(/className: 'text-\[11px\] text-slate-700 mb-1'/);
    expect(field).not.toMatch(/isDark/);
  });
});

describe('An element with no background of its own keeps the light ink', () => {
  // Measured, not assumed: the theme-branched first draft of this message put
  // slate-300 on the rose-50 card at 1.35:1 in the dark theme, because these
  // catalogue cards are light in BOTH themes. dev-tools/pt_contrast_probe.cjs
  // graded it 1.35 before and 6.9 after.
  it('does not branch the no-matches message on theme', () => {
    const text = src();
    const i = text.indexOf('var ptEmptyOr = function (term, list)');
    const body = text.slice(i, i + 900);
    expect(body).toMatch(/className: 'p-3 rounded-lg text-xs italic border text-slate-600 border-slate-300'/);
    expect(body).not.toMatch(/isDark/);
  });
});

describe('Every key the sim writes is read by something', () => {
  // `lastQuakeMag` was written by the boundary-settle patch and read nowhere:
  // the on-canvas M readout fades after ~200 frames, so once it went the
  // student had no record of the quake they had just made, only of the biggest.
  // It hid from the dead-state sweep because that sweep did not recognise the
  // `liveUpd({...})` channel the canvas writes through.
  it('reads lastQuakeMag back out in the mission card', () => {
    const text = src();
    expect(text).toMatch(/lastQuakeMag: qMag/);
    const i = text.indexOf("['Strongest quake'");
    expect(i).toBeGreaterThan(-1);
    const tile = text.slice(i, i + 700);
    expect(tile).toMatch(/d\.lastQuakeMag\s*\?\s*'latest M ' \+ d\.lastQuakeMag\.toFixed\(1\)/);
    // and the record is still what the tile's headline number reports
    expect(tile).toMatch(/d\.maxQuakeMag \? 'M ' \+ d\.maxQuakeMag\.toFixed\(1\) : '--'/);
  });

  it('leaves no badge key that nothing writes', () => {
    const text = src();
    const code = text.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
    const keys = ['quakeCount', 'maxQuakeMag', 'eruptionCount', 'quizScore',
      'vocabLookedUp', 'timelapsePlayed', 'ptMythBest', 'selectedPlate'];
    keys.forEach((k) => {
      const written = new RegExp('[{,]\\s*' + k + '\\s*:').test(code) || new RegExp('\\.' + k + '\\s*=[^=]').test(code);
      expect(written, k + ' is checked by a challenge but nothing writes it').toBe(true);
    });
  });
});

describe('A catalogue does not claim a count its own content contradicts', () => {
  // The plate encyclopedia said "7 majors, ~10 minors, and ~50 microplates"
  // while holding 87 microplates; the volcano, tsunami and rock intros each
  // named a number their arrays had outgrown. Nothing tied the sentence to the
  // rows, so nothing noticed. Same shape as the M8 badge that was earned by
  // dragging a slider two panels away: one claim, one derivation.
  const rowsIn = (text, varName) => {
    const m = new RegExp('var ' + varName + '\\s*=\\s*\\[').exec(text);
    if (!m) return null;
    let i = text.indexOf('[', m.index), depth = 0, end = -1;
    for (let j = i; j < text.length; j++) {
      if (text[j] === '[') depth++;
      else if (text[j] === ']') { depth--; if (!depth) { end = j; break; } }
    }
    const blk = text.slice(i, end);
    let d = 0, n = 0;
    for (const ch of blk) {
      if (ch === '{') { if (!d) n++; d++; }
      else if (ch === '}') d--;
    }
    return n;
  };

  it('derives the array-backed counts instead of naming them', () => {
    const text = src();
    [['volcano_intro_counted', 'VOLCANO_DB'], ['tsunami_intro_counted', 'TSUNAMI_DB'], ['rocks_intro_counted', 'ROCK_DB']].forEach(([key, arr]) => {
      const i = text.indexOf('stem.platetectonics.' + key);
      expect(i, key + ' missing').toBeGreaterThan(-1);
      expect(text.slice(i, i + 700), key + ' not tied to ' + arr).toContain(".replace('{n}', " + arr + ".length)");
    });
  });

  it('counts the plate tiers from the table rather than asserting them', () => {
    const text = src();
    const i = text.indexOf('var tierCount = { major: 0, minor: 0, micro: 0 }');
    expect(i).toBeGreaterThan(-1);
    const body = text.slice(i, i + 1200);
    expect(body).toMatch(/PLATE_DB\.forEach\(function \(pl\) \{ if \(tierCount\[pl\.tier\] != null\) tierCount\[pl\.tier\]\+\+; \}\)/);
    ['{major}', '{minor}', '{micro}'].forEach((t) => expect(body).toContain(".replace('" + t + "'"));
    // and each filter chip carries the count it will render
    expect(text).toMatch(/'data-pt-tier-count': String\(n\)/);
    // the old hard-coded sentence is gone
    expect(text).not.toMatch(/7 majors, ~10 minors, and ~50 microplates/);
  });

  it('keeps the hand-written card counts honest', () => {
    const text = src();
    // A tab's block runs to the NEXT tab guard, whichever tab that is — naming
    // the follower hard-codes an ordering the file does not promise, and the
    // first draft of this test silently measured an empty slice.
    const cardsIn = (name) => {
      const start = text.indexOf('simTab === "' + name + '"');
      expect(start, 'tab ' + name + ' not found').toBeGreaterThan(-1);
      const next = text.slice(start + 20).search(/simTab === ["'][a-zA-Z_]+["']/);
      const blk = next === -1 ? text.slice(start) : text.slice(start, start + 20 + next);
      return (blk.match(/rounded-lg bg-white/g) || []).length;
    };
    const constOf = (n) => parseInt((text.match(new RegExp('var ' + n + ' = (\\d+)')) || [])[1], 10);
    expect(cardsIn('minerals'), 'mineral cards').toBe(constOf('PT_MINERAL_CARDS'));
    expect(cardsIn('insights'), 'insight cards').toBe(constOf('PT_INSIGHT_CARDS'));
  });
});

describe('A field label is printed once', () => {
  // Pin the PATTERN, not the tabs that happened to be swept: 45 cards across
  // impacts, projects and extinctions printed "Visit: Visit: ...", because the
  // value carries the same label the bold span already shows. The review cards
  // had the identical defect on 180 fields.
  const doubled = (text) => {
    const re = /React\.createElement\('span',\s*\{[^}]*\},\s*"([A-Z][A-Za-z ]{2,20}):\s*"\),\s*\n\s*(?:__alloT\('[^']+',\s*)?"((?:[^"\\]|\\.){0,60})/g;
    const out = [];
    let m;
    while ((m = re.exec(text))) {
      if (m[2].toLowerCase().startsWith(m[1].toLowerCase() + ':')) out.push(m[1] + ' -> ' + m[2].slice(0, 40));
    }
    return out;
  };
  it('has no render site whose value repeats the label beside it', () => {
    const hits = doubled(src());
    expect(hits, 'labels printed twice: ' + hits.slice(0, 5).join(' | ')).toHaveLength(0);
  });
  it('routes the ones that did through the shared stripper', () => {
    const text = src();
    expect((text.match(/ptStripLabel\("(Causes|Visit|Discussion)", __alloT\(/g) || []).length).toBe(45);
  });
});

describe('Controls are big enough to hit', () => {
  it('lifts sliders and check boxes to a 24px target, scoped to this tool', () => {
    const text = src();
    const css = text.slice(text.indexOf(".pt-metric-grid{display:grid"), text.indexOf(".pt-tb-shell{aspect-ratio"));
    expect(css).toMatch(/\.pt-sim-shell input\[type=range\],\.plate-tectonics-container input\[type=range\]\{min-height:24px\}/);
    expect(css).toMatch(/\.pt-sim-shell input\[type=checkbox\],\.plate-tectonics-container input\[type=checkbox\]\{min-width:24px;min-height:24px\}/);
    // This stylesheet is injected into the document head, so an unscoped
    // element selector would resize every slider in the host app.
    expect(text).not.toMatch(/'input\[type=range\]\{/);
    expect(text).not.toMatch(/'input\[type=checkbox\]\{/);
  });
});

describe('The plate encyclopedia cards do something', () => {
  // 102 cards wrote `_plateFocus`, which nothing read: every one looked
  // clickable, carried a hover style and a focus ring, and had no effect.
  // Orphan-setter class, same as plate.vx in the original sim.
  it('writes the state that is actually wired, not a dead one', () => {
    const text = src();
    const i = text.indexOf('PLATE_DB.filter(function(p)');
    const body = text.slice(i, i + 2600);
    expect(body).toMatch(/onClick: function\(\) \{ upd\(\{ selectedPlate: plateOn \? null : p\.name \}\); \}/);
    expect(body).toMatch(/'aria-pressed': plateOn \? 'true' : 'false', 'data-pt-plate-card': p\.name/);
    expect(body).toMatch(/var plateOn = d\.selectedPlate === p\.name/);
    // the dead key survives only in the comment that explains it
    const live = text.replace(/\/\/[^\n]*/g, '');
    expect(live).not.toMatch(/_plateFocus/);
  });

  it('reaches the challenge that checks exactly this', () => {
    const text = src();
    // 'Study a tectonic plate' checks selectedPlate; the encyclopedia is now a
    // path that writes it, so studying a plate there counts.
    expect(text).toMatch(/id: 'select_plate'[\s\S]{0,200}return !!d\.selectedPlate/);
    const writers = (text.match(/upd\(\{ selectedPlate:/g) || []).length +
      (text.match(/\(live\.upd \|\| upd\)\(\{ selectedPlate:/g) || []).length;
    expect(writers).toBeGreaterThanOrEqual(2);
  });

  it('names each review reveal by its question, so sixty stops are not sixty identical ones', () => {
    const text = src();
    const helper = text.slice(text.indexOf('var ptReviewAnswer = function (n, text)'), text.indexOf('var ptReviewAnswer = function (n, text)') + 1900);
    // The visible words stay at the FRONT of the accessible name, so speaking
    // the label still matches what is written on the control (WCAG 2.5.3).
    expect(helper).toMatch(/'aria-label': \(open \? __alloT\('stem\.platetectonics\.hide_answer'[^)]*\) : __alloT\('stem\.platetectonics\.show_answer'[^)]*\)\) \+/);
    expect(helper).toMatch(/__alloT\('stem\.platetectonics\.review_question_n', 'review question'\) \+ ' ' \+ n/);
  });

  it('gives every search input a name that says what it searches', () => {
    const text = src();
    // Seven inputs shared one aria-label, so two identical names were on screen
    // on every catalogue tab and neither said which list it filtered.
    expect(text).not.toMatch(/'stem\.platetectonics\.search_input'/);
    ['tools', 'plates', 'volcanoes', 'glossary', 'quakestories', 'eruptions', 'plateprofiles'].forEach((k) => {
      expect(text, 'missing search label for ' + k).toMatch(new RegExp("stem\\.platetectonics\\.search_input_" + k + "'"));
    });
  });

  it('shows the trials the Log button records', () => {
    const text = src();
    // The button appended to iq.log and nothing rendered it: the one control
    // promising a record of your experiments gave no feedback, and the evidence
    // the hypothesis box asks for stayed invisible.
    // Pin the GUARD, not just the markup: disabling the table with `false ?`
    // left every string below intact and this test passed the sabotage. A
    // substring that survives its own sabotage is not an assertion.
    expect(text).toMatch(/\(iq\.log \|\| \[\]\)\.length \? h\('div', \{\s*'data-pt-stress-log': String\(iq\.log\.length\)/);
    const i = text.indexOf("'data-pt-stress-log'");
    // Wide enough for the whole table: a fixed window means "this component",
    // not a byte budget, and adding four static keys pushed the tbody past a
    // 2200-char slice. Third time this trap has fired in this suite.
    const table = text.slice(i, i + 3600);
    // a real table, with column headers a screen reader can use
    expect(table).toMatch(/h\('table'/);
    expect(table).toMatch(/h\('th', \{ key: c\[0\], scope: 'col'/);
    // Four columns, each named by its OWN static translation key. Building the
    // key by concatenation hides it from the harvester that registers strings,
    // and an unregistered key is never translated in any language — so the
    // static spelling is the invariant here, not an incidental one.
    ['boundary', 'stress', 'friction', 'result'].forEach((c) =>
      expect(table, 'missing static key for column ' + c).toContain("stem.platetectonics.trial_col_" + c + "'"));
    // Comments describe the past — the comment here quotes the old dynamic
    // spelling to explain why it went, so grade the CODE, not the prose.
    expect(table.replace(/\/\/[^\n]*/g, '')).not.toMatch(/trial_col_' \+/);
    // every logged field is rendered, so none of them is dead state
    ['row.bt', 'row.f', 'row.fr', 'row.st'].forEach((r) => expect(table).toContain(r));
  });

  it('registers every string it invents, so a new key can be translated', () => {
    // ui_strings.js is the work list the runtime pack builder diffs against a
    // user's cached pack. A key that never lands there renders English in every
    // language, permanently — however correctly its call site is wrapped.
    const used = new Set((src().match(/__alloT\('stem\.platetectonics\.[a-z0-9_]+'/g) || [])
      .map((m) => m.slice("__alloT('stem.platetectonics.".length, -1)));
    const ui = JSON.parse(readFileSync(resolve(process.cwd(), 'ui_strings.js'), 'utf8'));
    const have = new Set(Object.keys(((ui.stem || {}).platetectonics) || {}));
    const missing = [...used].filter((k) => !have.has(k));
    expect(missing, 'unregistered keys: ' + missing.slice(0, 8).join(', ')).toHaveLength(0);
  });

  it('prints the plate area once, with the unit the data already carries', () => {
    const text = src();
    // Every row stores area as a string like "103M km²", so appending a unit
    // printed it twice in two spellings: "Area: 103M km² km2".
    expect(text).not.toMatch(/p\.area\.toLocaleString\(\) \+ ' km2'/);
    expect(text).toMatch(/typeof p\.area === 'number' \? p\.area\.toLocaleString\(\) \+ ' km²' : String\(p\.area\)/);
  });

  it('ends the quiz pass instead of wrapping the index forever', () => {
    const text = src();
    // Driven, before the fix: answering ten questions left the header reading
    // "Score: 3 | Question 3 / 8" — a score counted against a denominator it
    // had already passed, on a lap where every answer was already known. The
    // modulo was what made the bank infinite.
    expect(text).not.toMatch(/QUIZZES\[quizIdx % QUIZZES\.length\]/);
    expect(text).not.toMatch(/quizIdx % QUIZZES\.length \+ 1/);
    expect(text).toContain('var qDone = quizIdx >= QUIZZES.length;');
    // The question body, the option grid and the answered view are all gated on
    // the pass not being over — otherwise question 8 would sit under the
    // results card.
    expect(text).toContain('!qDone && !isAnswered &&');
    expect(text).toContain('!qDone && isAnswered &&');
    expect(text).toContain("qDone && React.createElement(\"div\", { 'data-pt-quiz-results'");
  });

  it('resets the whole pass when the student runs it again', () => {
    const text = src();
    const i = text.indexOf("'data-pt-quiz-restart'");
    expect(i, 'restart button missing').toBeGreaterThan(-1);
    // Slice to the end of this button's props, whatever follows it.
    const btn = text.slice(i, text.indexOf('}, __alloT', i));
    // A restart that kept the old score or the old miss list would make the
    // next results card report a lap that never happened. All four move.
    ['quizIdx: 0', 'quizScore: 0', 'quizAnswer: null', 'quizMissed: []'].forEach((k) =>
      expect(btn, 'restart does not clear ' + k).toContain(k));
  });

  it('speaks the verdict, because answering destroys the buttons that showed it', () => {
    const text = src();
    const i = text.indexOf("var correct = oi === qz.ans;");
    expect(i).toBeGreaterThan(-1);
    const handler = text.slice(i, text.indexOf('className: "p-3 rounded-xl text-sm font-bold border-2', i));
    // The option buttons are replaced by plain divs, so nothing carries the
    // result to a screen reader unless it is announced here.
    expect(handler).toContain('announceToSR(correct');
    expect(handler).toContain('quiz_sr_correct');
    expect(handler).toContain('quiz_sr_incorrect');
    // The miss is remembered by concept so the results card can name it.
    expect(handler).toContain('quizMissed: missed');
    // The feedback card is itself a status region.
    expect(text).toContain("role: 'status', 'data-pt-quiz-verdict'");
  });

  it('picks focus back up only when answering actually dropped it', () => {
    const text = src();
    const i = text.indexOf("'data-pt-quiz-next': 'true'");
    expect(i).toBeGreaterThan(-1);
    const btn = text.slice(i, text.indexOf('onClick', i));
    // Measured: focus landed on <body> after every one of the eight answers.
    // The guard matters as much as the focus() — an unconditional focus would
    // yank back a student who had already tabbed onward.
    expect(btn).toContain('document.activeElement === document.body');
    expect(btn).toContain('el.focus()');
  });

  it('reads the miss list it writes, so quizMissed is not orphan state', () => {
    const text = src();
    expect(text).toContain('var qMissed = d.quizMissed || [];');
    expect(text).toContain('qMissed.length ? React.createElement');
    expect(text).toContain('qMissed.map(function(c)');
  });


  it('saves the triangulation map, not whichever canvas is biggest', () => {
    const text = src();
    // Measured on the sim tab: six canvases, and this button - which lives in
    // the triangulation panel - exported the 2152x940 plate simulation rather
    // than the 540x360 map above it. The widget's own ref was in scope.
    expect(text).not.toMatch(/_cs\.sort\(function\(a,b\)\{ return \(b\.width\*b\.height\)/);
    expect(text).not.toMatch(/querySelectorAll\('canvas'\)\); if \(!_cs\.length\) return;/);
    const i = text.indexOf("save_epicenter_png_aria");
    expect(i, 'PNG button missing').toBeGreaterThan(-1);
    const btn = text.slice(i, text.indexOf('marginLeft', i));
    expect(btn).toContain('var _c = canvasRef.current;');
    // The file name should say what the picture is of.
    expect(btn).toContain("'epicenter_triangulation_'");
    // Firefox will not act on a click against a detached anchor.
    expect(btn).toContain('document.body.appendChild(_a)');
    expect(btn).toContain('document.body.removeChild(_a)');
  });

  it('tells the student when the image could not be saved', () => {
    const text = src();
    const i = text.indexOf("save_epicenter_png_aria");
    const btn = text.slice(i, text.indexOf('marginLeft', i));
    // The old handler was `catch (e) {}` around a bare `return`, so a failed
    // save and a successful one looked identical from the outside: nothing.
    expect(btn).not.toMatch(/catch \(e\) \{\}/);
    expect(btn).toContain("addToast('\\u26a0\\ufe0f ' + msg, 'error')");
    expect(btn).toContain('png_map_not_ready');
    expect(btn).toContain('png_save_failed');
    // Success is announced too - a toast alone is not reliably read out.
    expect(btn).toContain('announceToSR(okMsg)');
  });

  it('gives the epicenter widget a translator instead of hardcoded English', () => {
    const text = src();
    // AlloTectonicsEpicenter is a top-level component, so the tool's own
    // __alloT is out of its scope. Every string in the panel was therefore
    // unreachable by any language pack.
    const i = text.indexOf('window.AlloTectonicsEpicenter = function(props)');
    expect(i).toBeGreaterThan(-1);
    const head = text.slice(i, text.indexOf('var useState = React.useState;', i));
    expect(head).toContain('var f = props && props.t;');
    // The host has to actually pass it, or the fallback silently wins forever.
    expect(text).toMatch(/window\.AlloTectonicsEpicenter, \{[^}]*t: __alloT \}/);
    // A sample of the panel's own strings now goes through the helper.
    ['epi_show_circles', 'epi_show_fit', 'epi_heading', 'epi_tip_draggable'].forEach((k) =>
      expect(text, 'unwrapped: ' + k).toContain("stem.platetectonics." + k));
  });


  it('gives the boundary simulator a translator, like the epicenter widget', () => {
    const text = src();
    // The same hole, found by generalising the last one: AlloTectonicsInteractive
    // is also a top-level component, so the tool's __alloT was out of scope and
    // all 1,155 lines of the panel were English for every language.
    const i = text.indexOf('window.AlloTectonicsInteractive = function(props)');
    expect(i).toBeGreaterThan(-1);
    const head = text.slice(i, text.indexOf('var st = useState(', i));
    expect(head).toContain('var f = props && props.t;');
    expect(text).toMatch(/window\.AlloTectonicsInteractive, \{[^}]*t: __alloT \}/);
  });

  it('leaves the simulator with no untranslated student-facing prose', () => {
    const text = src();
    const a = text.indexOf('window.AlloTectonicsInteractive = function(props)');
    const b = text.indexOf("label: 'Plate Tectonics',", a);
    expect(b).toBeGreaterThan(a);
    const body = text.slice(a, b);
    const wrapped = new Set(
      [...body.matchAll(/__alloT\('stem\.platetectonics\.[a-z0-9_]+', '([^']+)'\)/g)].map((m) => m[1])
    );
    // Anything starting with a capital and long enough to be a sentence or a
    // label. The three arrow-key names are DOM VALUES compared against
    // KeyboardEvent.key - translating those would break the keyboard handler.
    const KEEP = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home']);
    const bare = [...body.matchAll(/'([A-Z][^']{8,})'/g)]
      .map((m) => m[1])
      .filter((t) => !wrapped.has(t) && !KEEP.has(t));
    expect(bare, 'untranslated: ' + bare.slice(0, 4).join(' | ')).toHaveLength(0);
  });

  it('substitutes every placeholder it puts in any template', () => {
    // Scoped to the simulator at first, which made it blind: a sabotage that
    // stripped .replace() from an announcement in the MAIN render closure left
    // this green. The whole file is the right scope - templates live wherever
    // a string meets a value.
    const body = src();
    const bad = [];
    for (const m of body.matchAll(/__alloT\('stem\.platetectonics\.([a-z0-9_]+)', '([^']*\{[a-z]+\}[^']*)'\)/g)) {
      const tokens = [...new Set([...m[2].matchAll(/\{([a-z]+)\}/g)].map((x) => x[1]))];
      // Read the .replace() chain attached to THIS call, by walking balanced
      // parens from the end of it. A fixed character window was the first
      // version and it was blind: {n} is used by half a dozen templates, so a
      // neighbour's substitution satisfied the check for a call that had lost
      // its own. Calibration caught it - the sabotage stayed green.
      let k = m.index + m[0].length;
      const done = new Set();
      const skipWs = () => { while (k < body.length && /\s/.test(body[k])) k++; };
      skipWs();
      while (body.startsWith(".replace('{", k)) {
        const tok = body.slice(k + 11, body.indexOf('}', k + 11));
        done.add(tok);
        let depth = 0;
        k = body.indexOf('(', k);
        for (; k < body.length; k++) {
          if (body[k] === '(') depth++;
          else if (body[k] === ')') { depth--; if (depth === 0) { k++; break; } }
        }
        skipWs();
      }
      // A template whose placeholder is never replaced prints "{n}" to a student.
      tokens.filter((t) => !done.has(t)).forEach((t) => bad.push(m[1] + '.' + t));
    }
    expect(bad, 'unsubstituted: ' + bad.join(', ')).toHaveLength(0);
  });

  it('keeps the boundary keys the code compares out of the translated fields', () => {
    const text = src();
    // name/desc are display; the object keys convergent/divergent/transform are
    // what every mode check compares against and must stay literal.
    expect(text).toMatch(/convergent: \{ name: __alloT\('stem\.platetectonics\.sim_convergent'/);
    expect(text).toMatch(/divergent:\s+\{ name: __alloT\('stem\.platetectonics\.sim_divergent'/);
    expect(text).toMatch(/transform:\s+\{ name: __alloT\('stem\.platetectonics\.sim_transform'/);
    expect(text).toContain("mode: 'convergent'");
  });


  it('keeps the running simulator numbers out of the live region', () => {
    const text = src();
    // Measured with dev-tools/pt_live_chatter.cjs before the fix: 19 changes in
    // 20 seconds, 57 announcements a minute, with nobody touching anything.
    const i = text.indexOf("'data-pt-sim-readout': 'true'");
    expect(i, 'sim readout missing').toBeGreaterThan(-1);
    // Bounded by the element's OWN content, not a byte count: a fixed window
    // ran past the closing paren into the sr-only span that follows, which does
    // carry aria-live, so the assertion graded the wrong element.
    const span = text.slice(text.lastIndexOf("h('span'", i), text.indexOf('depthSummary', i) + 12);
    // The element carrying the tick-by-tick count and the currently-active
    // depth must NOT be a live region.
    expect(span).not.toContain("aria-live");
    expect(span).not.toContain("role: 'status'");
    expect(span).toContain("(s.quakeTotal || 0) + ' events | ' + depthSummary");
  });

  it('announces the deepest band reached, which is monotonic per boundary', () => {
    const text = src();
    const i = text.indexOf("'data-pt-sim-depth-band'");
    expect(i, 'depth band live region missing').toBeGreaterThan(-1);
    const live = text.slice(text.lastIndexOf("h('span'", i), text.indexOf('depthBandLine', i) + 20);
    expect(live).toContain("aria-live': 'polite'");
    expect(live).toContain("className: 'sr-only'");
    // The band comes from the deepest focus SEEN. Deriving it from the active
    // list is what made it flip as events decayed.
    expect(text).toContain('var deepestSeen = Math.round(s.deepestKm || 0);');
    expect(text).toMatch(/var depthBand = deepestSeen >= 300 \? 'deep'/);
    expect(text).not.toMatch(/var depthBand = deepestActive/);
  });

  it('resets the deepest-seen depth with the boundary type', () => {
    const text = src();
    // Switching boundary calls reset(); if deepestKm survived it, a convergent
    // run would leave "deep" announced under a transform boundary, which is
    // exactly the misconception the panel exists to correct.
    expect(text).toMatch(/update\(\{ years: 0, quakes: \[\], quakeTotal: 0, deepestKm: 0,/);
    expect(text).toContain('patch.deepestKm = Math.max(cur.deepestKm || 0, depthKm);');
    // and it is initialised, so the first render is not undefined
    expect(text).toMatch(/quakeTotal: 0,[\s\S]{0,400}deepestKm: 0,/);
  });


  it('has one definition of the 3D block view a reset returns to', () => {
    const text = src();
    // Driven with dev-tools/pt_block_keys.cjs: there were three. The block
    // opened at (-22,-38); the Home key reset to (-18,-28); the "Reset view"
    // button went to (-22,-38) and also cleared the cutaway. Two controls that
    // both say "reset", landing in different places.
    expect(text).toContain('var TECT_VIEW_HOME = { rotX: -22, rotY: -38, scale: 1, cut: null };');
    expect(text).toContain('var v3 = useState(Object.assign({ on: false }, TECT_VIEW_HOME));');
    expect(text).toContain("else if (k === 'Home') patch = Object.assign({}, TECT_VIEW_HOME);");
    expect(text).toContain('onClick: function() { updView(Object.assign({}, TECT_VIEW_HOME)); },');
    // No stray literal orientation may re-enter and become a fourth source.
    expect(text).not.toMatch(/rotX: -18, rotY: -28/);
    expect(text).not.toMatch(/\{ rotX: -22, rotY: -38, scale: 1, cut: null \}\)/);
  });

  it('publishes the block orientation so the keyboard promise is testable', () => {
    const text = src();
    // The orientation lives in WebGL and is invisible to the DOM, so the help
    // text's claims about arrow keys could not be driven at all without this.
    expect(text).toContain("'data-tect-view': view3d.rotX + ',' + view3d.rotY + ',' + view3d.scale.toFixed(2),");
    // and the block must still be reachable by keyboard at all
    const i = text.indexOf("'data-tect-gl': 'true'");
    const el = text.slice(text.lastIndexOf("h('canvas'", i), text.indexOf('onKeyDown', i));
    expect(el).toContain('tabIndex: 0');
  });


  it('translates what it says to a screen reader, not only what it shows', () => {
    const text = src();
    // The accessibility layer had been skipped by every translation pass: 4700+
    // visible strings went through __alloT while announceToSR and the aria
    // descriptions stayed English. Nobody testing visually would ever see it.
    const calls = [...text.matchAll(/announceToSR\(([\s\S]{0,400}?)\)\s*;/g)].map((m) => m[1]);
    expect(calls.length, 'no announceToSR calls found - the scan is broken').toBeGreaterThan(20);
    // A call may pass a variable that was translated where it was built.
    const bare = calls.filter((c) => !c.includes('__alloT') && !/^\s*[a-zA-Z_$][\w$]*\s*$/.test(c));
    expect(bare, 'untranslated announcement: ' + bare.slice(0, 2).map((c) => c.slice(0, 60)).join(' | '))
      .toHaveLength(0);
  });

  it('translates the long canvas descriptions, which are the figure for some students', () => {
    const text = src();
    // These carry the actual teaching content of three figures. A student on a
    // non-English pack had no other route into them.
    ['aria_cascadia_section', 'aria_three_boundaries', 'aria_magnitude_vs_intensity'].forEach((k) =>
      expect(text, k + ' not registered').toContain("stem.platetectonics." + k));
    const literal = [...text.matchAll(/['"]aria-(?:label|description)['"]\s*:\s*(['"][A-Z][\s\S]{0,90}?)(?:,\n|\n)/g)]
      .map((m) => m[1].replace(/\s+/g, ' '))
      .filter((v) => !v.includes('__alloT'));
    expect(literal, 'literal English aria value: ' + literal.slice(0, 2).join(' | ')).toHaveLength(0);
  });

  it('keeps the tab ids the shortcut handler compares out of the translated labels', () => {
    const text = src();
    // _PT_TABS holds the ids the code switches on; _PT_TAB_LABELS holds what a
    // student hears. Translating the first would break the 1-4 shortcuts.
    expect(text).toContain("var _PT_TABS = ['sim', 'earthquake', 'timeline', 'quiz'];");
    expect(text).toMatch(/sim: __alloT\('stem\.platetectonics\.tab_name_sim', 'Simulation'\)/);
    expect(text).toContain("sr_switched_to_tab', 'Switched to {tab}.'");
  });


  it('translates the words painted onto the figures, not just the DOM', () => {
    const text = src();
    // Text drawn with fillText is invisible to every DOM audit, to axe, and to
    // the key harvester - and it is exactly what a student reads off the
    // diagram: "trench", "volcanic arc", "Outer core (liquid)", the scale bars.
    const bad = [];
    const re = /fillText\(/g;
    let m;
    while ((m = re.exec(text))) {
      const p = m.index + m[0].length;
      const q = text[p];
      if (q !== "'" && q !== '"') continue;
      let j = p + 1;
      for (;;) {
        j = text.indexOf(q, j);
        if (text[j - 1] !== '\\') break;
        j += 1;
      }
      const lit = text.slice(p, j + 1);
      // Three letters in a row is a word, not a unit or a single symbol.
      if (/[A-Za-z]{3}/.test(lit)) bad.push(lit.slice(0, 40));
    }
    expect(bad, 'untranslated figure label: ' + bad.slice(0, 3).join(' | ')).toHaveLength(0);
  });

  it('translates the search placeholders and the challenge toast', () => {
    const text = src();
    // A placeholder is visible text; the toast is the moment a student is told
    // they won something.
    expect(text).toContain("search_placeholder', 'Search...'");
    expect(text).toContain("search_activities_placeholder', 'Search activities...'");
    expect(text).toContain("toast_challenge_won', 'Challenge: {name} (+{rp} RP)'");
    const lit = [...text.matchAll(/\b(?:placeholder|title)\s*:\s*(['"][A-Za-z][^'"]{3,})/g)]
      .map((x) => x[1])
      .filter((v) => !v.includes('__alloT'));
    expect(lit, 'literal English attribute: ' + lit.slice(0, 2).join(' | ')).toHaveLength(0);
  });


  it('does not theme-branch ink on cards that are light in both themes', () => {
    const text = src();
    // The results card, its miss list and the shelf note all sit on emerald-50
    // and amber-50, which stay light whatever the theme. Branching their ink on
    // isDark is how this tool has produced 1.35:1 text before: a dark-theme
    // colour painted on a permanently light card.
    const a = text.indexOf("'data-pt-quiz-results'");
    expect(a, 'results card missing').toBeGreaterThan(-1);
    const b = text.indexOf("'data-pt-quiz-restart'", a);
    expect(b).toBeGreaterThan(a);
    const card = text.slice(a, b);
    expect(card).toContain('bg-emerald-50');
    expect(card).toContain('bg-amber-50');
    // Measured with dev-tools/pt_contrast_probe.cjs: 7.29 / 5.21 / 9.99 in both
    // themes, identical, because nothing here branches.
    expect(card, 'results card branches its ink on the theme').not.toMatch(/isDark/);
  });

  it('measures the verdict card by its leaves, not by the box around them', () => {
    // Not about the tool: the probe graded the CARD, whose computed colour is
    // the inherited black, and reported 19.94:1 for text no student sees. The
    // targets now name the elements that actually carry ink.
    const probe = readFileSync(resolve(process.cwd(), 'dev-tools/pt_contrast_probe.cjs'), 'utf8');
    expect(probe).toContain("'[data-pt-quiz-verdict] > div:nth-child(1)'");
    expect(probe).not.toMatch(/\['quiz', '\[data-pt-quiz-verdict\]',/);
    // Every results-card target must carry the reach that CREATES that state.
    // Asserting only that the word "finish-quiz" appears somewhere in the file
    // was too weak: a sabotage that dropped it from one target left this green,
    // and that target would then have silently measured nothing.
    [".text-2xl", ".text-xs", " li", "-restart"].forEach((sel) => {
      const line = probe.split('\n').find((l) => l.includes('data-pt-quiz-results') && l.includes(sel))
        || probe.split('\n').find((l) => l.includes('data-pt-quiz-restart'));
      expect(line, 'no target line for ' + sel).toBeTruthy();
      expect(line, sel + ' does not reach the finished state').toContain("'finish-quiz'");
    });
  });


  it('spreads the correct answer evenly and keeps feedback in step', () => {
    // Runs the real function rather than grepping for it. Extracted by brace
    // matching from the source, so the test exercises the shipped code.
    const text = src();
    const at = text.indexOf('function ptBalanceAnswers(bank) {');
    expect(at, 'ptBalanceAnswers not found').toBeGreaterThan(-1);
    let depth = 0;
    let end = text.indexOf('{', at);
    for (let k = end; k < text.length; k++) {
      if (text[k] === '{') depth++;
      else if (text[k] === '}') { depth--; if (depth === 0) { end = k + 1; break; } }
    }
    // eslint-disable-next-line no-new-func
    const balance = new Function(text.slice(at, end) + '; return ptBalanceAnswers;')();

    // A deliberately lopsided bank: every answer in one of three slots.
    const bank = [];
    for (let i = 0; i < 8; i++) {
      bank.push({ q: 'Q' + i, opts: ['t0', 't1', 't2', 't3'], wrongFeedback: ['t0', 't1', 't2', 't3'], ans: i % 3 });
    }
    const out = balance(bank);
    const dist = [0, 0, 0, 0];
    out.forEach((q) => dist[q.ans]++);
    // As authored the real bank was 13/38/38/13 percent, so a student who never
    // picked the first or last option scored 75% knowing no geology.
    expect(dist, 'answers are not evenly spread: ' + dist.join('/')).toEqual([2, 2, 2, 2]);

    out.forEach((q, i) => {
      // wrongFeedback is read as wrongFeedback[chosenOpt]. If it does not rotate
      // with opts, a student is handed the explanation for a choice they did
      // not make - and a correct answer can be told it was wrong.
      for (let k = 0; k < 4; k++) {
        expect(q.wrongFeedback[k], 'feedback slipped out of step at question ' + i + ' slot ' + k)
          .toBe(q.opts[k]);
      }
      // and the option now marked correct is still the one that was correct
      expect(q.opts[q.ans]).toBe(bank[i].opts[bank[i].ans]);
    });
  });

  it('leaves a question alone when it has no options or no answer', () => {
    const text = src();
    const at = text.indexOf('function ptBalanceAnswers(bank) {');
    let depth = 0;
    let end = text.indexOf('{', at);
    for (let k = end; k < text.length; k++) {
      if (text[k] === '{') depth++;
      else if (text[k] === '}') { depth--; if (depth === 0) { end = k + 1; break; } }
    }
    // eslint-disable-next-line no-new-func
    const balance = new Function(text.slice(at, end) + '; return ptBalanceAnswers;')();
    // A string-typed answer is the case the type guard actually earns its keep
    // on: the later `if (!shift)` check catches a missing answer by accident,
    // but '2' coerces cleanly through the arithmetic and would be rotated as if
    // it were valid. Removing the guard is only observable here.
    const odd = [{ q: 'no opts' }, { q: 'no ans', opts: ['a', 'b'] }];
    const out = balance(odd);
    expect(out[0]).toEqual(odd[0]);
    expect(out[1]).toEqual(odd[1]);

    // Isolated in a one-question bank so the target slot is 0 and the shift is
    // therefore non-zero. Placed at any index where i % 4 === 2 the shift works
    // out to zero and the early return masks the missing guard - which is how
    // this assertion first passed against the sabotage.
    const strung = balance([{ q: 'string ans', opts: ['a', 'b', 'c', 'd'], wrongFeedback: ['a', 'b', 'c', 'd'], ans: '2' }]);
    expect(strung[0].ans, 'a malformed answer was rotated as if it were valid').toBe('2');
    expect(strung[0].opts).toEqual(['a', 'b', 'c', 'd']);
  });


  it('translates announcements made through a local alias, not just direct calls', () => {
    const text = src();
    // The pass-33 audit keyed on the call name `announceToSR(` and was blind to
    // a handler that wrapped it: `var say = function (msg) { announceToSR(msg) }`.
    // Four announcements for the tool's PRIMARY keyboard interaction - picking
    // and pushing a plate, and the boundary that forms - stayed English because
    // of it. Find the wrappers by shape, then grade their calls too.
    const aliases = [];
    for (const m of text.matchAll(/var\s+([A-Za-z_$][\w$]*)\s*=\s*function\s*\((\w+)\)\s*\{/g)) {
      let depth = 0;
      let k = text.indexOf('{', m.index + m[0].length - 1);
      let end = k;
      for (; end < text.length; end++) {
        if (text[end] === '{') depth++;
        else if (text[end] === '}') { depth--; if (depth === 0) { end++; break; } }
      }
      const body = text.slice(k, end);
      if (!new RegExp('announceToSR\\(\\s*' + m[2] + '\\s*\\)').test(body)) continue;
      // An alias is only in scope until its enclosing block closes. Two
      // different `fail` functions live in this file - one forwards a message
      // to the screen reader, the other takes an internal WebGL reason code
      // like 'frame' - and a file-global search by NAME flagged the second as
      // untranslated announcements. Record the region instead of the bare name.
      let d = 0;
      let stop = end;
      for (; stop < text.length; stop++) {
        if (text[stop] === '{') d++;
        else if (text[stop] === '}') { if (d === 0) break; d--; }
      }
      aliases.push({ name: m[1], from: end, to: stop });
    }
    expect(aliases.length, 'no announce alias found - this scan has gone blind').toBeGreaterThan(0);

    const bare = [];
    for (const a of aliases) {
      const name = a.name;
      const scope = text.slice(a.from, a.to);
      const call = new RegExp('\\b' + name + '\\(', 'g');
      for (const c0 of scope.matchAll(call)) {
        const c = { index: c0.index + a.from, 0: c0[0] };
        // Walk balanced parens: a fixed window truncated the longest of these
        // calls and hid it from the first version of this scan.
        let depth = 0;
        let k = c.index + c[0].length - 1;
        let end = k;
        for (; end < text.length; end++) {
          if (text[end] === '(') depth++;
          else if (text[end] === ')') { depth--; if (depth === 0) break; }
        }
        const arg = text.slice(k + 1, end);
        // A bare identifier is a message translated where it was built.
        if (/^\s*[A-Za-z_$][\w$]*\s*$/.test(arg)) continue;
        // "Contains __alloT somewhere" is too weak: a call that reverts HALF of
        // a concatenation still contains one, and that sabotage stayed green.
        // Deleting the translated parts by regex was worse - it left unbalanced
        // quotes and flagged correct code. Collect the literals properly, then
        // subtract the ones that are __alloT fallbacks.
        const translated = new Set(
          [...arg.matchAll(/__alloT\('[^']*',\s*('(?:[^'\\]|\\.)*')\)/g)].map((x) => x[1])
        );
        const literals = [];
        for (let i = 0; i < arg.length; i++) {
          if (arg[i] !== "'") continue;
          let j = i + 1;
          while (j < arg.length && arg[j] !== "'") { if (arg[j] === '\\') j++; j++; }
          literals.push(arg.slice(i, j + 1));
          i = j;
        }
        // A phrase is a literal with a space and a real word in it; '{name}' and
        // 'right' are placeholders and single words handled by their own keys.
        const english = literals.filter((lit) => !translated.has(lit) && /[A-Za-z]{3}/.test(lit) && /\s/.test(lit));
        if (english.length) bare.push(name + '(' + english[0].slice(0, 46) + ')');
      }
    }
    expect(bare, 'untranslated aliased announcement: ' + bare.slice(0, 2).join(' | ')).toHaveLength(0);
  });

  it('keeps the coarse keyboard step, so a plate can actually reach a boundary', () => {
    const text = src();
    // Shift is a real coarse step, not a decoration: 48 canvas units against 14.
    // At the fine step alone a keyboard user needed dozens of presses to close a
    // gap, which is the difference between usable and technically-operable.
    expect(text).toContain("p.x = clampPlateX(plates, kbIdx, p.x + dir * (big ? 48 : 14));");
    // One settlement per gesture: settling per key press let a held arrow farm a
    // quake per press.
    expect(text).toMatch(/var rep2 = \{ collided: false, withName: '', erupted: false \};/);
    expect(text).toContain('moved: p.x !== was');
  });


  it('has one glossary, not a live list beside an unreachable table', () => {
    const text = src();
    // GEO_GLOSSARY held 106 authored entries and was referenced exactly once -
    // by its own definition. The tab rendered a DIFFERENT inline list of 106,
    // overlapping by only 40 terms, so 66 terms a teacher had written could not
    // be reached by any student, and a later edit could land in either one.
    expect(text).toContain('var G = GEO_GLOSSARY.map(function (e) { return [e.term, e.definition]; })');
    // No second inline pair-array may reappear beside it.
    expect(text).not.toMatch(/var G = \[\[/);
    // Referenced by the table AND the renderer: an orphan again would be one.
    expect((text.match(/GEO_GLOSSARY/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it('keeps both origins of the merged glossary', () => {
    const text = src();
    const at = text.indexOf('var GEO_GLOSSARY = [');
    let depth = 0;
    let end = text.indexOf('[', at);
    for (let k = end; k < text.length; k++) {
      if (text[k] === '[') depth++;
      else if (text[k] === ']') { depth--; if (depth === 0) { end = k; break; } }
    }
    const table = text.slice(at, end);
    const terms = [...table.matchAll(/term:\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
    // 106 + 106 with 40 shared.
    expect(terms.length, 'merged glossary lost entries').toBe(172);
    expect(new Set(terms).size, 'duplicate terms in the glossary').toBe(terms.length);
    // Terms that existed ONLY in the previously-unreachable table...
    ['Bolide', 'Anthropocene', 'Continental drift'].forEach((t) =>
      expect(terms, 'lost a term that was already unreachable: ' + t).toContain(t));
    // ...and one that was already on screen, so the merge did not drop the live side.
    expect(terms).toContain('Asthenosphere');
    // Every entry carries a definition.
    const defs = [...table.matchAll(/definition:\s*"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
    expect(defs.length).toBe(terms.length);
    expect(defs.filter((d) => d.trim().length < 8), 'empty definitions').toHaveLength(0);
  });

  it('searches the glossary by definition as well as by term', () => {
    const text = src();
    // A student who remembers "the layer plates float on" but not
    // "asthenosphere" is exactly who a glossary search is for.
    expect(text).toMatch(/g\[0\]\.toLowerCase\(\)\.indexOf\(s\) !== -1 \|\| g\[1\]\.toLowerCase\(\)\.indexOf\(s\) !== -1/);
  });


  it('translates the myth bank, which is assessment content', () => {
    const text = src();
    const at = text.indexOf('var PT_MYTHS_35 = [');
    const to = text.indexOf('var PT_MYTH_BANK =', at);
    expect(at).toBeGreaterThan(-1);
    expect(to).toBeGreaterThan(at);
    const bank = text.slice(at, to);
    // 19 myths across three grade bands, each a statement and an explanation.
    const wrapped = (bank.match(/(?:^|\b)(?:s|why): __alloT\('stem\.platetectonics\./g) || []).length;
    expect(wrapped, 'myth strings not translated').toBe(38);
    // No statement or explanation may sit as a bare literal beside them.
    const bare = [...bank.matchAll(/\b(s|why):\s*(['"])/g)]
      .filter((m) => bank.slice(m.index, m.index + 40).indexOf('__alloT') === -1);
    expect(bare, 'a myth string is still a bare literal').toHaveLength(0);
    // The truth flag is data, not text - translating it would break grading.
    expect(bank).toMatch(/t: (?:true|false),/);
    expect(bank).not.toMatch(/t: __alloT/);
  });

  it('translates magma wording in the render closure, not in the module-scope table', () => {
    const text = src();
    // Wrapping MAGMA's fields in place crashed the tool: the table lives at
    // module scope where __alloT does not exist. The compared `id` stays a
    // literal and the words move to a lookup inside the render closure, under
    // static keys a harvester can find.
    const at = text.indexOf('var MAGMA = [');
    const to = text.indexOf('];', at);
    const table = text.slice(at, to);
    expect(table, 'MAGMA must not reference __alloT at module scope').not.toContain('__alloT');
    expect(table).toMatch(/id: 'basalt'/);

    expect(text).toContain('var PT_MAGMA_TEXT = {');
    ['basalt', 'andesite', 'rhyolite'].forEach((id) =>
      ['label', 'silica', 'visc', 'gas', 'landform', 'example'].forEach((f) =>
        expect(text, 'missing key for ' + id + '.' + f)
          .toContain("stem.platetectonics.magma_" + id + '_' + f + "'")));
    // and NO display site reads the raw row. Asserting that the wrapped form
    // "appears somewhere" was too weak - it stayed green when one of the three
    // sites reverted, because the other two still contained the string.
    const stripped = text.replace(/ptMagmaText\((?:t2|cur|row)\)/g, 'WRAPPED');
    const raw = [...stripped.matchAll(/\b(?:t2|cur)\.(silica|visc|gas|landform|example|label)\b/g)]
      .map((m) => m[0]);
    expect(raw, 'a magma field is read straight off the untranslated row: ' + raw.join(', '))
      .toHaveLength(0);
  });


  it('does not strand new catalogues where no student can reach them', () => {
    const text = src();
    // Found the hard way: GEO_GLOSSARY held 106 authored entries and was
    // referenced exactly once - by its own definition - while the tab rendered a
    // different inline list. Merged. Then the same audit turned up four more
    // tables that nothing reads at all, including 28 classroom activities and 62
    // historic earthquakes a teacher wrote and no student can open.
    //
    // These four are the known backlog. The gate is that the list does not GROW:
    // a new catalogue must be wired to something.
    const KNOWN_ORPHANS = ['EARTHQUAKE_DB', 'GEOLOGISTS', 'GEO_LESSONS', 'BOUNDARIES'];
    const names = [...text.matchAll(/\bvar ([A-Z][A-Z_0-9]{3,})\s*=\s*\[/g)].map((m) => m[1]);
    expect(names.length, 'no catalogue tables found - this scan has gone blind').toBeGreaterThan(10);

    const orphans = [];
    for (const nm of new Set(names)) {
      const defAt = text.indexOf('var ' + nm + ' =');
      let reads = 0;
      for (const m of text.matchAll(new RegExp('\\b' + nm + '\\b', 'g'))) {
        if (Math.abs(m.index - (defAt + 4)) < 2) continue;          // the definition itself
        const lineStart = text.lastIndexOf('\n', m.index) + 1;
        if (text.slice(lineStart, m.index).trimStart().startsWith('//')) continue;  // a comment naming it
        reads++;
      }
      if (!reads) orphans.push(nm);
    }
    const unexpected = orphans.filter((o) => !KNOWN_ORPHANS.includes(o));
    expect(unexpected, 'a new catalogue is unreachable: ' + unexpected.join(', ')).toHaveLength(0);
    // And the known ones must not quietly multiply either.
    expect(orphans.length, 'orphan count grew: ' + orphans.join(', '))
      .toBeLessThanOrEqual(KNOWN_ORPHANS.length);
  });

  it('translates the tsunami, hotspot and fault catalogues a student reads', () => {
    const text = src();
    // Field-level, not blanket: `type` is compared against literals and
    // `volcanoes` holds proper nouns, so both stay as authored.
    ['tsu_note_', 'tsu_place_', 'hs_note', 'hs_plat', 'fa_note', 'fa_regi'].forEach((k) =>
      expect(text, 'no keys with prefix ' + k).toContain('stem.platetectonics.' + k));
    const hs = text.slice(text.indexOf('var HOTSPOT_DB = ['), text.indexOf('var ROCK_DB = ['));
    expect(hs, 'volcano names must not be translated').toMatch(/volcanoes: "[^"]+"/);
    expect(hs).not.toMatch(/volcanoes: __alloT/);
    // `source` duplicated `mag` under a name promising the tsunami's cause, and
    // nothing rendered it - a trap for whoever showed it next.
    const tsu = text.slice(text.indexOf('var TSUNAMI_DB = ['), text.indexOf('var FAULT_DB = ['));
    expect(tsu, 'the dead source field is back').not.toMatch(/source:/);
  });

});
