import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
const start=source.indexOf('  SAMPLE_LESSONS.geometryHarbor = '),end=source.indexOf('  // The authored lessons',start);
const lesson=new Function('const SAMPLE_LESSONS={};'+source.slice(start,end)+'return SAMPLE_LESSONS.geometryHarbor;')();
const key=(x,y,z)=>[x,y,z].join(',');
const blocks=new Map();
for(const s of lesson.structures)if(s.measurementLayer!=='ground')for(let x=s.x1;x<=s.x2;x++)for(let y=s.y1;y<=s.y2;y++)for(let z=s.z1;z<=s.z2;z++){const k=key(x,y,z);if(!blocks.has(k))blocks.set(k,{x,y,z,type:s.block});}
const dirs=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
function connected(seed){const todo=[seed],seen=new Set(),result=[];while(todo.length){const p=todo.pop(),k=key(...p);if(seen.has(k)||!blocks.has(k))continue;seen.add(k);result.push(blocks.get(k));for(const d of dirs)todo.push(p.map((v,i)=>v+d[i]));}return result;}
function canWalk(x,z){const g=lesson.ground;return x>=g.xMin&&x<=g.xMax&&z>=g.zMin&&z<=g.zMax&&!blocks.has(key(x,1,z))&&!blocks.has(key(x,2,z));}
function reachable(){const todo=[[Math.floor(lesson.spawnPoint[0]),Math.floor(lesson.spawnPoint[2])]],seen=new Set();for(let i=0;i<todo.length;i++){const [x,z]=todo[i],k=x+','+z;if(seen.has(k)||!canWalk(x,z))continue;seen.add(k);for(const d of [[1,0],[-1,0],[0,1],[0,-1]])todo.push([x+d[0],z+d[1]]);}return seen;}
const faceStart=source.indexOf('  function countExposedCubeFaces('),faceEnd=source.indexOf('  function completeMeasurementRecords(',faceStart);
const faces=new Function(source.slice(faceStart,faceEnd)+'return countExposedCubeFaces;')();

describe('the expanded Harbor is connected, buildable, and mathematically honest',()=>{
 it('preserves earlier activity IDs and adds two linked challenges with matching NPCs',()=>{
  expect(lesson.activities.map(a=>a.id)).toEqual(['quay-practice','garden-area','garden-perimeter','reservoir-fill','reservoir-compare','makers-project','arcade-patterns','community-studio']);
  expect(lesson.objectives).toHaveLength(8);expect(lesson.estimatedMinutes).toBe(60);
  for(const a of lesson.activities)expect(lesson.npcs.some(n=>n.name===a.npcName)).toBe(true);
 });
 it('keeps both district links and every new arrival reachable on foot with headroom',()=>{
  const access=reachable();
  for(const z of [-12,11])for(let x=18;x<=42;x++)expect(access.has(x+','+z),'link '+x+','+z).toBe(true);
  for(const a of lesson.activities.slice(6))for(const dx of [-.25,.25])for(const dz of [-.25,.25]){
   const x=Math.floor(a.position[0]+dx),z=Math.floor(a.position[2]+dz);expect(access.has(x+','+z),a.title).toBe(true);
   for(let y=Math.floor(a.position[1]-1.6);y<=Math.floor(a.position[1]+.2);y++)expect(blocks.has(key(x,y,z)),a.title).toBe(false);
  }
 });
 it('contains three separate nine-cube reference arches, spanning eleven columns',()=>{
  const samples=[29,33,37].map(x=>connected([x,1,-17]));expect(samples.map(s=>s.length)).toEqual([9,9,9]);
  expect(samples.flat().length).toBe(27);expect(Math.max(...samples.flat().map(b=>b.x))-Math.min(...samples.flat().map(b=>b.x))+1).toBe(11);
  expect(lesson.activities[6].hint).toContain('9, not 27');expect(lesson.activities[6].buildGoal).toBeUndefined();
 });
 it('leaves both large work courts empty and fits every suggested model without overlap',()=>{
  for(const id of ['arcade-pattern-pad','arcade-studio-pad']){
   const s=lesson.structures.find(s=>s.id===id);expect(s.measurementLayer).toBe('ground');expect(s.x2-s.x1+1).toBe(13);
   for(let x=s.x1;x<=s.x2;x++)for(let z=s.z1;z<=s.z2;z++)for(let y=1;y<=4;y++)expect(blocks.has(key(x,y,z)),id+' '+key(x,y,z)).toBe(false);
  }
  const pattern=[];for(const x of [29,33,37]){for(let y=1;y<=3;y++)pattern.push({x,y,z:-5},{x:x+2,y,z:-5});for(let dx=0;dx<3;dx++)pattern.push({x:x+dx,y:4,z:-5});}
  expect(pattern).toHaveLength(27);expect(pattern.every(b=>b.x>=28&&b.x<=40&&b.z>=-8&&b.z<=-2)).toBe(true);
 });
 it('supports the stated 36-cube alternatives and correct six-face surface areas',()=>{
  const step=[],prism=[];
  for(let x=28;x<=33;x++)for(let z=3;z<=6;z++){step.push({x,y:1,z});if(z<=4)step.push({x,y:2,z});}
  for(let x=35;x<=40;x++)for(let z=3;z<=5;z++)for(let y=1;y<=2;y++)prism.push({x,y,z});
  expect(step).toHaveLength(36);expect(prism).toHaveLength(36);expect(faces(step).surfaceArea).toBe(84);expect(faces(prism).surfaceArea).toBe(72);
  expect(new Set(step.concat(prism).map(b=>key(b.x,b.y,b.z))).size).toBe(72);expect(lesson.activities[7].buildGoal.target).toBe(36);
 });
 it('keeps all architecture inside the lesson ground and below the student block budget',()=>{
  for(const s of lesson.structures){expect(s.x1).toBeGreaterThanOrEqual(lesson.ground.xMin);expect(s.x2).toBeLessThanOrEqual(lesson.ground.xMax);expect(s.z1).toBeGreaterThanOrEqual(lesson.ground.zMin);expect(s.z2).toBeLessThanOrEqual(lesson.ground.zMax);}
  expect(blocks.size).toBeLessThan(800);
 });
});
