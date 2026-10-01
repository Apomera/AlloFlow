import {describe, it, expect} from 'vitest';
import {readFileSync} from 'node:fs';

// Read the production presets, not the JSON patch fixtures. Inclusive fills and
// first-fill ownership below mirror the world loader. Floors belong to a
// separate measurement layer, while touching colors in a model stay connected.
const source = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8').replace(/\r\n/g, '\n');
function preset(id, next) {
  const start = source.indexOf('    ' + id + ': {'), end = source.indexOf('    ' + next + ': {', start);
  if (start < 0 || end < start) throw Error('Missing production preset ' + id);
  return new Function('return ({' + source.slice(start, end) + '}).' + id + ';')();
}
const area = preset('areaSurface', 'buildChallenge'), composite = preset('compositeVolume', 'fractionVolume');
const faceStart = source.indexOf('  function countExposedCubeFaces(');
const faceEnd = source.indexOf('  function completeMeasurementRecords(', faceStart);
const exposedFaces = new Function(source.slice(faceStart, faceEnd) + '\nreturn countExposedCubeFaces;')();
const key = point => point.join(',');
const directions = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
function cells(lesson) {
  const result = new Map();
  for (const s of lesson.structures) {
    if (s.measurementLayer === 'ground' || s.y1 === lesson.ground.y && s.y2 === lesson.ground.y) continue;
    for (let x=s.x1; x<=s.x2; x++) for (let y=s.y1; y<=s.y2; y++) for (let z=s.z1; z<=s.z2; z++) {
      const k=key([x,y,z]);
      if (!result.has(k)) result.set(k,{x,y,z,type:s.block});
    }
  }
  return result;
}
function component(blocks, seed) {
  const todo=[seed], seen=new Set(), result=[];
  while (todo.length) {
    const p=todo.pop(), k=key(p);
    if (seen.has(k)) continue;
    seen.add(k);
    if (!blocks.has(k)) continue;
    result.push(blocks.get(k));
    for (const d of directions) todo.push(p.map((v,i)=>v+d[i]));
  }
  return result;
}
function bounds(model) {
  const lengths=['x','y','z'].map(axis=>Math.max(...model.map(c=>c[axis]))-Math.min(...model.map(c=>c[axis]))+1);
  return {lengths, volume:lengths.reduce((n,v)=>n*v,1)};
}
function canWalk(lesson, blocks, x, z) {
  const g=lesson.ground;
  return x>=g.xMin && x<=g.xMax && z>=g.zMin && z<=g.zMax && !blocks.has(key([x,1,z])) && !blocks.has(key([x,2,z]));
}
function reachable(lesson, blocks) {
  const todo=[[Math.floor(lesson.spawnPoint[0]),Math.floor(lesson.spawnPoint[2])]], seen=new Set();
  for(let i=0;i<todo.length;i++) {
    const [x,z]=todo[i], k=key([x,z]);
    if(seen.has(k)||!canWalk(lesson,blocks,x,z)) continue;
    seen.add(k);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]) todo.push([x+dx,z+dz]);
  }
  return seen;
}
function expectClearArrival(lesson, blocks, position, name) {
  const [x,eye,z]=position;
  expect(eye,name).toBe(lesson.ground.y+2.6);
  // Match travelToActivity's four foot/body columns, so travel does not need
  // to lift a learner onto a model despite the nominal ground waypoint.
  for(const [dx,dz] of [[-.25,-.25],[.25,-.25],[-.25,.25],[.25,.25]]) {
    expect(canWalk(lesson,blocks,Math.floor(x+dx),Math.floor(z+dz)),name).toBe(true);
    for(let y=Math.floor(eye-1.6);y<=Math.floor(eye+.2);y++) expect(blocks.has(key([Math.floor(x+dx),y,Math.floor(z+dz)])),name).toBe(false);
  }
}
function questionSteps(lesson) {
  function flatten(q) { return q ? [q,...(q.followUp||[]).flatMap(flatten)] : []; }
  return lesson.npcs.flatMap(n=>flatten(n.question));
}

describe('Area & Surface Area models support their explanations',()=>{
  const blocks=cells(area);
  it.each([
    ['blue prism',[2,1,2],72,[6,3,4],108],
    ['gold prism',[12,1,2],72,[3,8,3],114],
    ['striped prism',[2,1,10],100,[5,4,5],130]
  ])('measures the %s independently with its full six-face area',(name,seed,count,dimensions,surface)=>{
    const model=component(blocks,seed);
    expect(model,name).toHaveLength(count);
    expect(bounds(model).lengths).toEqual(dimensions);
    expect(exposedFaces(model).surfaceArea).toBe(surface);
  });
  it('preserves four physical layers and two 50-cube material totals',()=>{
    const model=component(blocks,[2,1,10]);
    expect([1,2,3,4].map(y=>model.filter(c=>c.y===y).length)).toEqual([25,25,25,25]);
    expect(model.filter(c=>c.type==='sand')).toHaveLength(50);
    expect(model.filter(c=>c.type==='wood')).toHaveLength(50);
    expect(blocks.size).toBe(244);
  });
  it('supports a meaningful surface-area comparison without excluding the underside',()=>{
    const activity=area.activities.find(a=>a.id==='area-surface-comparison');
    expect(activity.challenge).toMatch(/all six sides, including the underside/);
    expect(activity.hint).toContain('108'); expect(activity.hint).toContain('114');
    const blue=component(blocks,[2,1,2]), gold=component(blocks,[12,1,2]);
    expect(blue.length).toBe(gold.length);
    expect(exposedFaces(gold).surfaceArea-exposedFaces(blue).surfaceArea).toBe(6);
  });
  it('leaves a real empty sand pad for both hinted 24-cube alternatives with a gap',()=>{
    const pad=area.structures.find(s=>s.block==='sand'&&s.measurementLayer==='ground'&&s.x1===10);
    expect(pad).toBeTruthy();
    const build=new Map();
    for(const [x1,x2,y2,z1,z2] of [[10,13,2,12,14],[15,17,4,12,13]]) {
      for(let x=x1;x<=x2;x++) for(let y=1;y<=y2;y++) for(let z=z1;z<=z2;z++) {
        expect(x>=pad.x1&&x<=pad.x2&&z>=pad.z1&&z<=pad.z2).toBe(true);
        expect(blocks.has(key([x,y,z]))).toBe(false);
        build.set(key([x,y,z]),{x,y,z,type:'student'});
      }
    }
    expect(component(build,[10,1,12])).toHaveLength(24);
    expect(component(build,[15,1,12])).toHaveLength(24);
    expect(area.activities.find(a=>a.id==='area-layer-design').reflection).toContain('self-review');
  });
});

describe('Composite Volume measures its intended non-overlapping parts',()=>{
  const blocks=cells(composite);
  it('contains a 48-cube bar and the intended 20-cube stem, totaling 68',()=>{
    const model=component(blocks,[2,1,2]);
    expect(model).toHaveLength(68);
    expect(model.filter(c=>c.type==='diamond')).toHaveLength(48);
    expect(model.filter(c=>c.type==='gold')).toHaveLength(20);
    expect(component(blocks,[5,1,4])).toHaveLength(68);
    expect(bounds(model).volume).toBe(168);
    const quiz=composite.npcs.find(n=>n.name==='T-Shape Quiz').question;
    expect(quiz.choices[quiz.correct]).toMatch(/^48/);
    expect(quiz.followUp[0].choices[quiz.followUp[0].correct]).toMatch(/^20/);
    expect(quiz.followUp[1].choices[quiz.followUp[1].correct]).toMatch(/^68/);
  });
  it('contains a separate 56-cube pyramid with the stated layer footprints',()=>{
    const model=component(blocks,[14,1,2]);
    expect(model).toHaveLength(56);
    expect([1,2,3].map(y=>model.filter(c=>c.y===y).length)).toEqual([36,16,4]);
    expect(bounds(model).volume).toBe(108);
  });
  it('counts the U corners once and distinguishes 64 occupied from 80 empty units',()=>{
    const model=component(blocks,[2,1,12]);
    expect(model).toHaveLength(64);
    expect(bounds(model).volume).toBe(144);
    expect(model.filter(c=>c.x===2)).toHaveLength(24);
    expect(model.filter(c=>c.x===7)).toHaveLength(24);
    expect(model.filter(c=>c.x>2&&c.x<7)).toHaveLength(16);
    let empty=0;
    for(let x=3;x<=6;x++) for(let y=1;y<=4;y++) for(let z=12;z<=16;z++) {
      expect(blocks.has(key([x,y,z]))).toBe(false); empty++;
    }
    expect(empty).toBe(80);
    expect(blocks.size).toBe(188);
  });
  it('offers a feasible 50-cube composite build with a step, not only a rectangular prism',()=>{
    const pad=composite.structures.find(s=>s.block==='sand'&&s.measurementLayer==='ground');
    expect(pad).toBeTruthy();
    const build=new Map();
    for(const [y1,y2,z1,z2] of [[1,2,13,15],[3,4,14,15]]) {
      for(let x=15;x<=19;x++) for(let y=y1;y<=y2;y++) for(let z=z1;z<=z2;z++) {
        expect(x>=pad.x1&&x<=pad.x2&&z>=pad.z1&&z<=pad.z2).toBe(true);
        expect(blocks.has(key([x,y,z]))).toBe(false);
        expect(build.has(key([x,y,z]))).toBe(false);
        build.set(key([x,y,z]),{x,y,z,type:'student'});
      }
    }
    const model=component(build,[15,1,13]);
    expect(model).toHaveLength(50);
    expect(bounds(model).volume).toBe(60);
    expect(composite.activities.find(a=>a.id==='composite-fifty-design').reflection).toContain('self-review');
  });
});

describe.each([['areaSurface',area,5,3,8],['compositeVolume',composite,4,4,10]])('%s offers reachable optional guidance',(id,lesson,activityCount,quizCount,stepCount)=>{
  const blocks=cells(lesson);
  it('keeps its original assessment count and valid answers',()=>{
    expect(lesson.npcs.filter(n=>n.question)).toHaveLength(quizCount);
    const questions=questionSteps(lesson);
    expect(questions).toHaveLength(stepCount);
    for(const q of questions) { expect(q.correct).toBeGreaterThanOrEqual(0); expect(q.correct).toBeLessThan(q.choices.length); }
  });
  it('starts on clear ground and lets learners walk to every guide without climbing',()=>{
    const visited=reachable(lesson,blocks);
    expectClearArrival(lesson,blocks,lesson.spawnPoint,'spawn');
    for(const npc of lesson.npcs) {
      expect(npc.position[1],npc.name).toBe(1);
      expect(visited.has(key([npc.position[0],npc.position[2]])),npc.name).toBe(true);
    }
  });
  it('provides ground-safe activity arrivals, specific hints and reflection prompts',()=>{
    const visited=reachable(lesson,blocks);
    expect(lesson.activities).toHaveLength(activityCount);
    expect(new Set(lesson.activities.map(a=>a.id)).size).toBe(activityCount);
    for(const a of lesson.activities) {
      expect(lesson.npcs.some(n=>n.name===a.npcName),a.id).toBe(true);
      expectClearArrival(lesson,blocks,a.position,a.id);
      expect(visited.has(key([a.position[0],a.position[2]])),a.id).toBe(true);
      expect(a.challenge.length).toBeGreaterThan(60); expect(a.hint.length).toBeGreaterThan(60);
      expect(a.successCriteria).toHaveLength(2); expect(a.reflection.length).toBeGreaterThan(30);
    }
  });
  it('keeps structures inside supported ground and leaves ample student building capacity',()=>{
    for(const s of lesson.structures) {
      expect(s.x1).toBeGreaterThanOrEqual(lesson.ground.xMin); expect(s.x2).toBeLessThanOrEqual(lesson.ground.xMax);
      expect(s.z1).toBeGreaterThanOrEqual(lesson.ground.zMin); expect(s.z2).toBeLessThanOrEqual(lesson.ground.zMax);
      if(s.y1===0&&s.y2===0) expect(s.measurementLayer).toBe('ground');
    }
    expect(1500-blocks.size).toBeGreaterThanOrEqual(1200);
  });
});
