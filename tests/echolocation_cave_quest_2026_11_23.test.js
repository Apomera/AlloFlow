// Echolocation Lab, final recommendations round (2026-11-23, evening): the "map the cave" quest.
// Before: it finished at 80% clarity (share of the cave's things an echo has found), which about three calls from the
// start reach, and paid 25 XP. Aaron accepted: require the hidden passage AND 90% clarity, in one flight. The quest card
// says both parts and shows progress on each. Playing it in a browser also showed "Discovered 32/28": cave walls were
// counted as discoveries but not in the total, which pushed clarity past 100% (and made 80% easier still).
// ECHOLOCATION_FILE=<path> points the suite at another copy (the round's reference copy turns it red).
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.ECHOLOCATION_FILE || 'stem_lab/stem_tool_echolocation.js';
const SRC = readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');

function loadModel() {
  const sandbox = { console: { log() {}, warn() {}, error() {} } };
  sandbox.window = sandbox;
  vm.runInNewContext(SRC, sandbox);
  return sandbox.__alloEcholocationModel;
}
const M = loadModel();
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

// The cave as the game builds it: SCENE_CAVE plus the objects getActiveScene() adds (webs, colony, passage, luna moth).
function caveObjects() {
  const a = SRC.indexOf('  var SCENE_CAVE = {');
  const b = SRC.indexOf('  var SCENE_FOREST', a);
  const cave = new Function('return ' + SRC.slice(a + '  var SCENE_CAVE = '.length, b).trim().replace(/;$/, ''))();
  const extra = [...SRC.matchAll(/base\.objects\.push\((\{[^\n]*\})\);/g)].map((m) => new Function('return ' + m[1])());
  return cave.objects.concat(extra);
}
// A call is a growing circle; it finds a thing once the circle touches it (circleRectIntersect / circleCircleIntersect).
function inReach(o, x, y, r) {
  if (o.radius != null || o.type === 'moth') return Math.hypot(o.x - x, o.y - y) <= r + (o.radius || 8);
  const cx = Math.max(o.x, Math.min(x, o.x + (o.width || 30))), cy = Math.max(o.y, Math.min(y, o.y + (o.height || 30)));
  return Math.hypot(x - cx, y - cy) <= r;
}

describe('cave quest model', () => {
  it('needs the hidden passage AND 90% clarity; 80% or the passage alone is not enough', () => {
    expect(M.CAVE_MAP_CLARITY).toBe(90);
    expect(M.caveQuest(false, 80).done).toBe(false);   // the old finish line
    expect(M.caveQuest(false, 100).done).toBe(false);  // all mapped, passage never found
    expect(M.caveQuest(true, 85).done).toBe(false);
    expect(M.caveQuest(true, 90).done).toBe(true);
    const q = M.caveQuest(true, 25 / 28 * 100);       // 89.3% shows as 89% and is not done
    expect(q.clarity).toBe(89);
    expect(q.done).toBe(false);
    expect(M.caveQuest(true, 26 / 28 * 100)).toMatchObject({ clarity: 93, clarityMet: true, done: true, need: 90 });
    expect(M.caveQuest(undefined, undefined)).toMatchObject({ passage: false, clarity: 0, done: false });
  });

  it('calling from the start cannot finish it: the passage is out of reach, and so is 90% of the cave', () => {
    const objs = caveObjects().filter((o) => o.type !== 'wall');
    expect(objs.length).toBe(28);
    const passage = objs.find((o) => o.type === 'passage');
    expect(passage).toBeTruthy();
    // the insect bat's call reaches sonarRange x 1.6 px from where it was made; the bat starts at (100, 250)
    const range = Number(SRC.match(/id: 'insectivore'[\s\S]*?sonarRange: (\d+)/)[1]) * 1.6;
    expect(SRC).toContain('batX: 100, batY: 250');
    expect(inReach(passage, 100, 250, range)).toBe(false);
    const fixed = objs.filter((o) => !o.moving);                 // moths wander, so count only the still things
    const reach = fixed.filter((o) => inReach(o, 100, 250, range)).length;
    // even if every moth drifted into reach, the start cannot see 90% of the cave
    expect((reach + objs.filter((o) => o.moving).length) / objs.length * 100).toBeLessThan(90);
    // flying across the cave does reach the passage
    expect(inReach(passage, 600, 330, range)).toBe(true);
  });

  it('walls do not count as discoveries (they are not in the total; the browser showed "Discovered 32/28")', () => {
    // wall hits come from segments and carry no type; every counted thing has one
    expect(SRC).toContain("hits.push({ x: hx, y: hy, reflectivity: obj.reflectivity, id: obj.id, material: obj.material });");
    expect(SRC).toContain('if (hit.id && hit.type && !st.discoveredIds[hit.id]) {');
    expect(SRC).toContain("scene.objects.forEach(function(o) { if (o.type !== 'wall') st.totalObjects++; });");
  });

  it('the game loop finishes the quest only through the model, once per flight', () => {
    expect(SRC).not.toMatch(/st\.clarity >= 80/);
    expect(SRC).toContain('var caveQ = sceneIdx === 0 ? EchoModel.caveQuest(st.hiddenChamberFound, st.clarity) : null;');
    expect(SRC).toContain('if (caveQ && caveQ.done && !d.caveMapped && !st.caveQuestDone) {');
    expect(SRC).toMatch(/label: 'Map the cave by echo: find the hidden passage and reach 90% clarity'/);
  });
});

describe('quest card', () => {
  beforeEach(() => resetStemLab());
  const render = (state) => { resetStemLab(); loadTool(FILE, 'echolocation'); return renderTool('echolocation', { echolocation: state || {} }); };

  it('says both parts and shows the progress of this flight on each', () => {
    const html = render({ playableSpecies: 'insectivore', sonarScene: 0 });
    expect(html).toContain('data-echolocation-cave-quest="open"');
    const t = text(html);
    expect(t).toContain('Cave quest: find the hidden passage and map 90% of the cave in one flight.');
    expect(t).toContain('Hidden passage: not found yet.');
    expect(t).toContain('Clarity 0% of 90%.');
    expect(html).toContain('data-echolocation-pill-passage="missing"');
    expect(t).toContain('0/90%');
  });

  it('says it is complete once mapped, and is not shown away from the cave', () => {
    const done = render({ playableSpecies: 'insectivore', sonarScene: 0, caveMapped: true });
    expect(done).toContain('data-echolocation-cave-quest="done"');
    expect(text(done)).toContain('Cave quest complete.');
    const forest = render({ playableSpecies: 'insectivore', sonarScene: 1 });
    expect(forest).not.toContain('data-echolocation-cave-quest');
  });
});
