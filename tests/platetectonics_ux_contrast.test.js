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
    const label = /'aria-label': 'Three diagrams comparing[^']+'/.exec(text);
    expect(label, 'panel aria-label not found').toBeTruthy();
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
    const label = /'aria-label': 'Two columns comparing the two earthquake scales[^']+'/.exec(text);
    expect(label, 'panel aria-label not found').toBeTruthy();
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
    const at = text.indexOf('upd({ _plateFocus: p.id })');
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
      expect(text).toMatch(/aria-label': 'Search classroom activities'/);
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
    expect(text).toMatch(/ctx\.fillText\('crustal root', Math\.max\(rootLblW \/ 2 \+ 6, Math\.min\(cW - rootLblW \/ 2 - 6, B\.mid\)\)/);
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
    expect(blk).toMatch(/'data-pt-review-reveal-all': String\(!!d\._ptRevealAll\)/);
    const helper = text.slice(text.indexOf('var ptReviewAnswer = function (n, text)'), text.indexOf('var ptReviewAnswer = function (n, text)') + 1200);
    expect(helper).toMatch(/var open = !!\(d\._ptRevealAll \|\| \(d\._ptRevealed \|\| \{\}\)\[n\]\)/);
    expect(helper).toMatch(/'data-pt-review-reveal': String\(n\)/);
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
