import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_machinelab.js';
const source = () => fs.readFileSync(path.resolve(process.cwd(), FILE), 'utf8');
const BANDS = ['k2', 'g35', 'g68', 'g912'];
const VIEWS = ['machines', 'build', 'range', 'siege', 'scene', 'compare', 'learn'];

// The harness renders at g35 unless told otherwise, and much of this tool now
// restates per band. These cases assert the grade 6-8 wording, so they pin it;
// the per-band wording itself is covered in machinelab_density.test.js.
function state(overrides = {}) {
  return { machineLab: Object.assign({ view: 'machines', bandOverride: 'g68' }, overrides) };
}

beforeEach(() => {
  resetStemLab();
  loadTool(FILE, 'machineLab');
});

describe('Machine Lab: every view renders at every band', () => {
  for (const view of VIEWS) {
    for (const band of BANDS) {
      it(`renders ${view} at ${band}`, () => {
        const html = renderTool('machineLab', state({ view, bandOverride: band }));
        expect(html).toBeTruthy();
        expect(html).not.toContain('undefined');
        expect(html).not.toContain('NaN');
        expect(html).not.toContain('Infinity');
      });
    }
  }

  it('offers navigation to every view', () => {
    const html = renderTool('machineLab', state());
    expect(html).toContain('Machine Shop');
    expect(html).toContain('Build');
    expect(html).toContain('Test Range');
    expect(html).toContain('Target Wall');
    expect(html).toContain('Compare');
    expect(html).toContain('Field Manual');
  });
});

describe('Machine Lab: the siege view', () => {
  it('offers all four built-in targets, with no import required', () => {
    const html = renderTool('machineLab', state({ view: 'siege' }));
    expect(html).toContain('Curtain wall');
    expect(html).toContain('Gatehouse');
    expect(html).toContain('Keep');
    expect(html).toContain('Motte and tower');
  });

  it('draws the wall and reports its condition', () => {
    const html = renderTool('machineLab', state({ view: 'siege' }));
    expect(html).toContain('<rect');
    expect(html).toContain('intact 72');      // fresh curtain wall, 12 x 6
    expect(html).toContain('Loose!');
    expect(html).toContain('Rebuild the wall');
  });

  it('ships the course-by-course table even while it is visually collapsed', () => {
    // Same accessibility contract as the energy ledger: the picture is never
    // the only carrier of the information.
    const html = renderTool('machineLab', state({ view: 'siege', wallAsTable: false }));
    expect(html).toContain('Condition of each course, counting up from the ground');
    expect(html).toContain('<table');
    expect(html).toContain('Cracked');
  });

  it('describes the wall state in the image label', () => {
    const html = renderTool('machineLab', state({ view: 'siege' }));
    expect(html).toMatch(/aria-label="Curtain wall\. 72 blocks intact, 0 cracked, 0 gone\./);
  });

  it('shows standoff against what this machine can actually reach', () => {
    const html = renderTool('machineLab', state({ view: 'siege' }));
    expect(html).toContain('Standoff');
    expect(html).toContain('This machine reaches');
    expect(html).not.toContain('NaN');
  });

  it('reports a breach with the shot count and the crank work spent', () => {
    const blocks = [];
    for (let c = 0; c < 12; c++) {
      for (let r = 0; r < 6; r++) {
        blocks.push({
          id: c + ',' + r, col: c, row: r, x: c, y: r, z: 0,
          mat: 'limestone', absorbed: 0,
          state: c === 4 ? 'breached' : 'intact'
        });
      }
    }
    const html = renderTool('machineLab', state({
      view: 'siege', wallBlocks: blocks, breached: true, shotsFired: 4, totalCrankWork: 180000
    }));
    expect(html).toContain('Breached in 4 shots');
    expect(html).toContain('180 kJ');
  });

  it('offers a 3D wall and degrades to the diagram when WebGL is absent', () => {
    const html = renderTool('machineLab', state({ view: 'siege' }));
    expect(html).toContain('3D wall unavailable');
    // The 2D diagram and the course table are unaffected by the 3D failing.
    expect(html).toContain('<rect');
    expect(html).toContain('Condition of each course');
  });

  it('states that the block budgets are classroom values, not a prediction', () => {
    const html = renderTool('machineLab', state({
      view: 'siege',
      lastImpact: { outcome: 'hit', ke: 14000, energyDensity: 310000, col: 5, row: 1 }
    }));
    expect(html).toContain('order-of-magnitude classroom values');
    expect(html).toContain('not a prediction of how real masonry fails');
  });
});

describe('Machine Lab: the build view', () => {
  it('shows the 3D container and degrades honestly when WebGL is absent', () => {
    // The smoke harness does not stub makeOrbitViewer, so the tool takes its
    // host-too-old path. That is exactly the degradation students on a locked
    // down Chromebook get, and every number must survive it.
    const html = renderTool('machineLab', state({ view: 'build' }));
    expect(html).toContain('3D view unavailable');
    expect(html).toContain('Energy ledger');
    expect(html).toContain('Stored in the raised counterweight');
  });

  it('offers Test fire beside the 3D machine, so the swing is reachable', () => {
    // The only Fire control used to live in the Test Range, which has no 3D
    // view, so the machine's animation could not be watched by anyone.
    const html = renderTool('machineLab', state({ view: 'build' }));
    expect(html).toContain('Test fire');
    expect(html).toContain('Watch the arm');
  });

  it('shows the winch panel with the numbers that move and the one that does not', () => {
    const html = renderTool('machineLab', state({ view: 'build' }));
    expect(html).toContain('Winch mechanical advantage');
    expect(html).toContain('Crank force');
    expect(html).toContain('Turns of the crank');
    expect(html).toContain('Launch speed');
  });

  it('reports the same launch speed regardless of winch gearing', () => {
    // The UI-level restatement of the invariance the math tests pin. If the
    // ledger ever started reading gearing into the shot, this catches it.
    const light = renderTool('machineLab', state({ view: 'build', winchPulleys: 1 }));
    const heavy = renderTool('machineLab', state({ view: 'build', winchPulleys: 6 }));
    const speedOf = (html) => (html.match(/Launch speed: ([\d.]+) m\/s/) || [])[1];
    expect(speedOf(light)).toBeDefined();
    expect(speedOf(light)).toBe(speedOf(heavy));
  });
});

describe('Machine Lab: the energy ledger', () => {
  it('names every stage from crank to impact', () => {
    const html = renderTool('machineLab', state({ view: 'build' }));
    expect(html).toContain('Work you do at the crank');
    expect(html).toContain('Stored in the raised counterweight');
    expect(html).toContain('Kinetic energy of the stone at release');
    expect(html).toContain('Kinetic energy at impact');
  });

  it('attributes each loss to a named cause', () => {
    const html = renderTool('machineLab', state({ view: 'build' }));
    expect(html).toContain('winch friction');
    expect(html).toContain('energy left in the moving arm and counterweight');
    expect(html).toContain('air resistance');
  });

  it('always ships the table equivalent, even while showing bars', () => {
    // The accessibility claim the whole machine-first design rests on: a
    // screen-reader user gets the identical content, not a summary of a picture.
    const bars = renderTool('machineLab', state({ view: 'build', ledgerAsTable: false }));
    expect(bars).toContain('Energy ledger from crank to impact');   // table caption
    expect(bars).toContain('% of input');
    expect(bars).toContain('<table');
  });

  it('shows the table on its own when toggled', () => {
    const table = renderTool('machineLab', state({ view: 'build', ledgerAsTable: true }));
    expect(table).toContain('<table');
    expect(table).toContain('Show bars');
  });

  it('reports transfer efficiency as a percentage', () => {
    const html = renderTool('machineLab', state({ view: 'build' }));
    expect(html).toMatch(/Transfer efficiency: [\d.]+%/);
  });

  it('shows the effective mass that produces that percentage, from g68 up', () => {
    // The efficiency is m_p/(m_p + m_eff), and the g9-12 copy quotes that
    // formula. m_eff was computed and returned by shot() and then never shown,
    // so the arithmetic the student was handed could not be checked.
    const g68 = renderTool('machineLab', state({ view: 'build', bandOverride: 'g68' }));
    expect(g68).toContain('of effective mass');
    expect(g68).toMatch(/The stone is [\d.]+ kg, and the moving parts of the machine add another [\d.]+ kg/);
    expect(g68).toMatch(/= [\d.]+%\./);

    // Lower bands get the percentage without the algebra behind it, and in
    // their own words: "Transfer efficiency" is itself a grade 6 phrase.
    const g35 = renderTool('machineLab', state({ view: 'build', bandOverride: 'g35' }));
    expect(g35).toMatch(/The stone got [\d.]+% of the energy the machine had saved up/);
    expect(g35).not.toContain('of effective mass');
    expect(g35).not.toContain('Transfer efficiency');
  });

  it('states an effective mass consistent with the efficiency it quotes', () => {
    const html = renderTool('machineLab', state({ view: 'build', bandOverride: 'g912', projMass: 25 }));
    const m = html.match(/The stone is ([\d.]+) kg, and the moving parts of the machine add another ([\d.]+) kg/);
    const pct = html.match(/Transfer efficiency: ([\d.]+)%/);
    expect(m).toBeTruthy();
    expect(pct).toBeTruthy();
    const mp = parseFloat(m[1]), me = parseFloat(m[2]);
    expect(100 * (mp / (mp + me))).toBeCloseTo(parseFloat(pct[1]), 0);
  });

  it('refuses to draw a ledger for a machine that cannot store energy', () => {
    const html = renderTool('machineLab', state({ view: 'build', cwMass: 0 }));
    expect(html).toContain('do not describe a working machine');
    expect(html).not.toContain('NaN');
  });
});

describe('Machine Lab: the range view', () => {
  it('asks for a prediction before offering the release', () => {
    const html = renderTool('machineLab', state({ view: 'range' }));
    expect(html).toContain('Predict, then fire');
    expect(html).toContain('Fire');
  });

  it('clears a prior score when a live range input changes', () => {
    const text = source();
    expect(text).toContain('var RANGE_RESULT_KEYS = {');
    expect(text).toContain('rangePrediction: true');
    expect(text).toContain('if (RANGE_RESULT_KEYS[key]) next.rangeResult = null;');
  });

  it('offers gravity presets and an air-resistance switch', () => {
    const html = renderTool('machineLab', state({ view: 'range' }));
    expect(html).toContain('Earth');
    expect(html).toContain('Moon');
    expect(html).toContain('Mars');
    expect(html).toContain('Air resistance on');
  });

  it('draws the flight path and its numbers once a shot exists', () => {
    const shot = {
      range: 120.5, apex: 30.2, flightTime: 5.1, impactSpeed: 33.3,
      crankWork: 44000, stored: 37700, muzzleKE: 20000, impactKE: 14000, eta: 0.53,
      path: [
        { t: 0, x: 0, y: 2, z: 0, v: 40 },
        { t: 2, x: 60, y: 30, z: 0, v: 30 },
        { t: 5.1, x: 120.5, y: 0, z: 0, v: 33.3 }
      ]
    };
    const html = renderTool('machineLab', state({ view: 'range', lastShot: shot }));
    expect(html).toContain('Flight path');
    expect(html).toContain('<polyline');
    expect(html).toContain('Range: 120.5 m');
    expect(html).toContain('Apex: 30.2 m');
  });

  it('gives the trajectory graph a text alternative', () => {
    const shot = {
      range: 100, apex: 25, flightTime: 4, impactSpeed: 30,
      crankWork: 44000, stored: 37700, muzzleKE: 20000, impactKE: 14000, eta: 0.53,
      path: [{ t: 0, x: 0, y: 0, z: 0, v: 40 }, { t: 4, x: 100, y: 0, z: 0, v: 30 }]
    };
    const html = renderTool('machineLab', state({ view: 'range', lastShot: shot }));
    expect(html).toContain('aria-label="Trajectory. Range 100 metres');
  });

  it('shows the shot log only once there is something to compare', () => {
    const one = renderTool('machineLab', state({
      view: 'range', shotHistory: [{ range: 100, projMass: 25, muzzleV: 40, eta: 0.5 }]
    }));
    expect(one).not.toContain('Shot log');

    const two = renderTool('machineLab', state({
      view: 'range',
      shotHistory: [
        { range: 100, projMass: 25, muzzleV: 40, eta: 0.5 },
        { range: 140, projMass: 50, muzzleV: 32, eta: 0.7 }
      ]
    }));
    expect(two).toContain('Shot log');
    expect(two).toContain('140 m');
  });

  it('adds the vacuum-sweep note only for the highest band', () => {
    const g68 = renderTool('machineLab', state({ view: 'range', bandOverride: 'g68' }));
    const g912 = renderTool('machineLab', state({ view: 'range', bandOverride: 'g912' }));
    expect(g68).not.toContain('a fact about drag, not about levers');
    expect(g912).toContain('a fact about drag, not about levers');
  });
});

describe('Machine Lab: lever observation follows the selected arm ratio',()=>{
  it('explains the force cost of a shorter effort arm with consistent ratio precision',()=>{
    const html=renderTool('machineLab',state({bench:'lever',leverEffortArm:0.2,leverLoadArm:4}));
    expect(html).toContain('The shorter effort arm moves less and needs more force');
    expect(html).not.toContain('The long effort arm travels farther');
    expect(html).toContain('Distance ×0.05');expect(html).toContain('Force ÷0.05');
  });
  it('explains equal-distance motion when the arms are equal',()=>{
    const html=renderTool('machineLab',state({bench:'lever',leverEffortArm:2,leverLoadArm:2}));
    expect(html).toContain('Equal arms move equal distances');
    expect(html).not.toContain('The long effort arm travels farther');
  });
});

it('explains why a single fixed pulley redirects effort without multiplying force',()=>{
  const single=renderTool('machineLab',state({bench:'pulley',pulleySegments:1}));
  expect(single).toContain('A fixed pulley changes the pull direction; ideal effort equals the load.');
  expect(single).toContain('Distance ×1');expect(single).toContain('Force ÷1');
  const multiple=renderTool('machineLab',state({bench:'pulley',pulleySegments:6}));
  expect(multiple).toContain('More supporting rope segments share the load.');
  expect(multiple).not.toContain('ideal effort equals the load');
});

describe('Machine Lab: force and distance comparison cards',()=>{
  function barPair(html,kind){
    const section=html.slice(html.indexOf('data-ml-comparison="'+kind+'"'));
    return ['effort','load'].map(side=>Number(section.match(new RegExp('data-ml-bar="'+side+'" style="width:([0-9.e+-]+)%'))[1]));
  }
  for(const [settings,ratio] of [[{bench:'lever',leverEffortArm:0.2,leverLoadArm:4},0.05],[{bench:'lever',leverEffortArm:2,leverLoadArm:2},1],[{bench:'lever',leverEffortArm:2,leverLoadArm:1},2],[{bench:'pulley',pulleySegments:6},6],[{bench:'screw',screwHandleR:0.5,screwPitch:0.001},Math.PI*1000]])it(`shows reciprocal distance and force ratios at ${ratio}`,()=>{
    const html=renderTool('machineLab',state(settings)),distance=barPair(html,'distance'),force=barPair(html,'force');
    expect(distance[0]/distance[1]).toBeCloseTo(ratio,8);expect(force[0]/force[1]).toBeCloseTo(1/ratio,8);
    expect(Math.max(...distance)).toBe(100);expect(Math.max(...force)).toBe(100);
    expect(html).toContain('role="group" aria-label="Distance comparison"');expect(html).toContain('role="group" aria-label="Force comparison"');
    expect(html).toContain(ratio>1?'Less force · more distance':ratio<1?'More force · less distance':'Same force · same distance');
  });
  it('withholds comparison bars for an invalid machine',()=>{
    const html=renderTool('machineLab',state({bench:'lever',leverEffortArm:0}));expect(html).not.toContain('data-ml-comparison');
  });
  it('explains reversed and equal tradeoffs without adding a numerical ledger for young learners',()=>{
    const short=renderTool('machineLab',state({bandOverride:'k2',bench:'lever',leverEffortArm:0.2,leverLoadArm:4}));
    const equal=renderTool('machineLab',state({bandOverride:'k2',bench:'pulley',pulleySegments:1}));
    expect(short).toContain('Here you push harder');expect(equal).toContain('the same distance, with the same force');
    expect(short).not.toContain('data-ml-comparison');expect(equal).not.toContain('Work in:');
  });
});


describe('Machine Lab: motion inspection controls',()=>{
  beforeEach(()=>{
    const host=resetStemLab();
    host.makeOrbitViewer=()=>({attach(){},push(){},status(){return 'ready';},onStatusChange(){}});
    loadTool(FILE,'machineLab');
  });
  for(const band of BANDS)it('offers labelled keyboard inspection at '+band,()=>{
    const html=renderTool('machineLab',state({bandOverride:band,shopMotionProgress:0.37}));
    const doc=new DOMParser().parseFromString(html,'text/html'),slider=doc.querySelector('#ml-shop-stroke');
    expect(slider.type).toBe('range');expect(slider.value).toBe('37');
    expect(slider.getAttribute('aria-valuetext')).toBe('37% of the working stroke');
    expect(doc.querySelector('label[for="ml-shop-stroke"]').textContent).toBe('Inspect the motion');
    expect(doc.getElementById(slider.getAttribute('aria-describedby')).textContent).toContain('model stays still');
    expect(doc.querySelectorAll('.ml-shop-inspector button')).toHaveLength(3);
  });
  for(const [progress,label] of [[0,'Start'],[0.5,'Halfway'],[1,'Full stroke']])it('marks the held '+label+' pose',()=>{
    const doc=new DOMParser().parseFromString(renderTool('machineLab',state({shopMotionProgress:progress})),'text/html');
    expect(doc.querySelector('.ml-shop-inspector [aria-pressed="true"]').textContent).toBe(label);
    expect(doc.querySelectorAll('.ml-shop-inspector [aria-pressed="true"]')).toHaveLength(1);
  });
  it('does not claim a held pose during playback, while leaving stop-at-position buttons available',()=>{
    const doc=new DOMParser().parseFromString(renderTool('machineLab',state({shopAnimating:true,shopDemoId:1,shopMotionProgress:0.5})),'text/html');
    expect(doc.querySelector('#ml-shop-stroke').disabled).toBe(true);
    expect(doc.querySelector('.ml-shop-inspector [aria-pressed="true"]')).toBeNull();
    expect([...doc.querySelectorAll('.ml-shop-inspector button')].every(b=>!b.disabled)).toBe(true);
  });
});


describe('Machine Lab: focus mechanism control',()=>{
  for(const band of BANDS)for(const focused of [false,true])it('exposes focus state '+focused+' at '+band,()=>{
    const html=renderTool('machineLab',state({bandOverride:band,shopFocusMechanism:focused}));
    const doc=new DOMParser().parseFromString(html,'text/html'),button=doc.querySelector('button[aria-label="Focus mechanism"]');
    expect(button).not.toBeNull();expect(button.type).toBe('button');expect(button.textContent).toBe('Focus mechanism');
    expect(button.getAttribute('aria-pressed')).toBe(String(focused));expect(button.title).toContain('restore the workshop');
  });
  it('keeps focus control scoped to the workshop',()=>{
    const html=renderTool('machineLab',state({view:'build'}));expect(html).not.toContain('aria-label="Focus mechanism"');
  });
});


describe('Machine Lab: shape-based distance legend',()=>{
  for(const band of BANDS)it('explains both shapes at '+band,()=>{
    const doc=new DOMParser().parseFromString(renderTool('machineLab',state({bandOverride:band})),'text/html');
    expect(doc.querySelector('[data-ml-distance-symbol="effort"]').textContent).toBe('◆ Effort path');
    expect(doc.querySelector('[data-ml-distance-symbol="load"]').textContent).toBe('○ Load path');
    expect(doc.querySelector('.ml-shop-bay').getAttribute('aria-label')).toContain('A solid diamond marks the effort distance and an open ring marks the load distance');
    expect(doc.querySelector('.ml-shop-bay').getAttribute('aria-label')).toContain('Both distances share one scale');
  });
});


it('explains the lever arm guides without showing them as a feature of other stations',()=>{
  const html=renderTool('machineLab',state({bench:'lever'}));
  expect(html).toContain('The colored guides beneath the beam measure each arm from the pivot to its contact point.');
  expect(renderTool('machineLab',state({bench:'pulley'}))).not.toContain('The colored guides beneath the beam');
});


it('explains equal-tension arrows only at the pulley station',()=>{
  for(const bench of ['lever','pulley','windlass','ramp','wedge','screw']){
    const doc=new DOMParser().parseFromString(renderTool('machineLab',state({bench})),'text/html');
    const guide=doc.querySelector('[data-ml-pulley-support-guide]');
    if(bench==='pulley'){
      expect(guide.textContent).toContain('Equal arrows show equal tension in this ideal rope');
      expect(guide.textContent).toContain('the free end is pulled down');
    }else expect(guide).toBeNull();
  }
});


describe('Machine Lab: traveled-distance legend',()=>{
  for(const band of BANDS)it('explains full rails and traveled bars visually and accessibly at '+band,()=>{
    const doc=new DOMParser().parseFromString(renderTool('machineLab',state({bandOverride:band})),'text/html');
    const text='Thin rails show the full stroke; wide bars show distance traveled.';
    expect(doc.querySelector('[data-ml-distance-fill-guide]').textContent).toBe(text);
    expect(doc.querySelector('.ml-shop-bay').getAttribute('aria-label')).toContain(text);
  });
});


it('explains the screw thread and compression bands at the press station',()=>{
  const html=renderTool('machineLab',state({bench:'screw'}));
  expect(html).toContain('one visible thread spacing per revolution');
  expect(html).toContain('The bands show the block compressing without turning.');
  expect(renderTool('machineLab',state({bench:'pulley'}))).not.toContain('The bands show the block compressing');
});


it('explains the marked wheel and striped drum at the wheel-and-axle station',()=>{
  const html=renderTool('machineLab',state({bench:'windlass'}));
  expect(html).toContain('The marked grip and striped drum turn together');
  expect(html).toContain('Rotate to a side view to follow the drum');
  expect(renderTool('machineLab',state({bench:'screw'}))).not.toContain('The marked grip and striped drum');
});
