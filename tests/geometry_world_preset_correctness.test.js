import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

// Assert the authored presets themselves, rather than separately maintained
// report fixtures. Match the loader's inclusive ranges and first-fill ownership.
const source=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8').replace(/\r\n/g,'\n');
function preset(id,next){const a=source.indexOf('    '+id+': {'),b=source.indexOf('    '+next+': {',a);if(a<0||b<a)throw Error('Missing preset '+id);return new Function('return ({'+source.slice(a,b)+'}).'+id+';')();}
const garden=preset('geometryGarden','compositeVolume'),shipping=preset('realWorld','geometryGarden');
const key=p=>p.join(',');
function cells(lesson){const result=new Map();for(const s of lesson.structures){if(s.measurementLayer==='ground'||s.y1===lesson.ground.y&&s.y2===lesson.ground.y)continue;for(let x=s.x1;x<=s.x2;x++)for(let y=s.y1;y<=s.y2;y++)for(let z=s.z1;z<=s.z2;z++){const k=key([x,y,z]);if(!result.has(k))result.set(k,{x,y,z,type:s.block});}}return result;}
function component(blocks,seed){const todo=[seed],seen=new Set(),found=[];while(todo.length){const p=todo.pop(),k=key(p);if(seen.has(k))continue;seen.add(k);if(!blocks.has(k))continue;found.push(blocks.get(k));for(const d of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]])todo.push(p.map((v,i)=>v+d[i]));}return found;}
function walkable(lesson,blocks,x,z){return x>=lesson.ground.xMin&&x<=lesson.ground.xMax&&z>=lesson.ground.zMin&&z<=lesson.ground.zMax&&!blocks.has(key([x,1,z]))&&!blocks.has(key([x,2,z]));}
function reachable(lesson,blocks){const todo=[[Math.floor(lesson.spawnPoint[0]),Math.floor(lesson.spawnPoint[2])]],seen=new Set();for(let i=0;i<todo.length;i++){const [x,z]=todo[i],k=key([x,z]);if(seen.has(k)||!walkable(lesson,blocks,x,z))continue;seen.add(k);for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]])todo.push([x+dx,z+dz]);}return seen;}

describe('Geometry Garden discoveries match the authored geometry',()=>{
  const blocks=cells(garden);
  it.each([
    ['unit',[3,1,2],1],['row',[8,1,2],5],['one-layer area model',[16,1,1],15],['three-layer prism',[24,1,1],45],
    ['long equal-volume model',[32,1,0],24],['compact equal-volume model',[32,1,8],24],['tall equal-volume model',[38,1,8],24],
    ['two-part L model',[32,1,-7],72],['filled nested model',[42,1,-8],125],['hidden stepped monument',[48,1,1],85]
  ])('measures the %s independently without joining scenery',(name,seed,count)=>{expect(component(blocks,seed),name).toHaveLength(count);});
  it('contains an actual gold inner cube surrounded by98glass shell cells',()=>{
    const nested=component(blocks,[42,1,-8]);
    expect(nested.filter(c=>c.type==='glass')).toHaveLength(98);expect(nested.filter(c=>c.type==='gold')).toHaveLength(27);
    for(let x=43;x<=45;x++)for(let y=2;y<=4;y++)for(let z=-7;z<=-5;z++)expect(blocks.get(key([x,y,z])).type).toBe('gold');
    expect(nested.every(c=>c.type==='gold'||c.x===42||c.x===46||c.y===1||c.y===5||c.z===-8||c.z===-4)).toBe(true);
  });
  it('contains the hidden monument and all declared structures inside supported ground',()=>{
    for(const s of garden.structures){expect(s.x1).toBeGreaterThanOrEqual(garden.ground.xMin);expect(s.x2).toBeLessThanOrEqual(garden.ground.xMax);expect(s.z1).toBeGreaterThanOrEqual(garden.ground.zMin);expect(s.z2).toBeLessThanOrEqual(garden.ground.zMax);}
    const layers=[1,2,3,4,5].map(y=>component(blocks,[48,1,1]).filter(c=>c.y===y).length);expect(layers).toEqual([45,21,15,3,1]);
    expect(blocks.size).toBeLessThanOrEqual(900);
  });
  it('offers eight ungraded discoveries with reachable guides and clear arrival columns',()=>{
    const reached=reachable(garden,blocks);expect(garden.activities).toHaveLength(8);expect(garden.npcs.every(n=>n.question===null)).toBe(true);
    expect(new Set(garden.activities.map(a=>a.id)).size).toBe(8);
    for(const npc of garden.npcs){expect(npc.position[1],npc.name).toBe(1);expect(reached.has(key([npc.position[0],npc.position[2]])),npc.name).toBe(true);}
    for(const a of garden.activities){expect(garden.npcs.some(n=>n.name===a.npcName),a.id).toBe(true);expect(a.hint.length).toBeGreaterThan(30);expect(a.successCriteria.length).toBeGreaterThanOrEqual(2);expect(a.reflection.length).toBeGreaterThan(20);expect(reached.has(key([a.position[0],a.position[2]])),a.id).toBe(true);for(const [dx,dz]of[[-.25,-.25],[.25,-.25],[-.25,.25],[.25,.25]])for(let y=Math.floor(a.position[1]-1.6);y<=Math.floor(a.position[1]+.2);y++)expect(blocks.has(key([Math.floor(a.position[0]+dx),y,Math.floor(a.position[2]+dz)])),a.id+' arrival collision').toBe(false);}
  });
  it('has a continuous level path around the screen wall to the hidden garden',()=>{
    const route=new Set();for(const s of garden.structures.filter(s=>s.measurementLayer==='ground'&&s.block==='stone'))for(let x=s.x1;x<=s.x2;x++)for(let z=s.z1;z<=s.z2;z++)if(walkable(garden,blocks,x,z))route.add(key([x,z]));
    const todo=[[0,5]],visited=new Set();for(let i=0;i<todo.length;i++){const[x,z]=todo[i],k=key([x,z]);if(visited.has(k)||!route.has(k))continue;visited.add(k);for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]])todo.push([x+dx,z+dz]);}
    expect(visited.has('53,10')).toBe(true);expect(visited.has('46,10')).toBe(true);expect(route.has('46,5')).toBe(false);
  });
});

describe('Real-World packing uses geometric fit instead of only a volume quotient',()=>{
  const blocks=cells(shipping),expert=shipping.npcs.find(n=>n.name==='Packing Expert');
  it('shows exactly three2by2by2boxes and12unused interior cells',()=>{
    let occupied=0,empty=0;for(let x=3;x<=8;x++)for(let y=2;y<=3;y++)for(let z=3;z<=5;z++){const cell=blocks.get(key([x,y,z]));if(cell){expect(['gold','diamond']).toContain(cell.type);occupied++;}else empty++;}
    expect(occupied).toBe(24);expect(empty).toBe(12);
  });
  it('proves at most three axis-aligned boxes fit by checking every integer placement',()=>{
    const placements=[];for(let x=0;x<=4;x++)for(let z=0;z<=1;z++){let mask=0n;for(let dx=0;dx<2;dx++)for(let y=0;y<2;y++)for(let dz=0;dz<2;dz++)mask|=1n<<BigInt(((x+dx)*2+y)*3+z+dz);placements.push(mask);}
    function best(i,used){if(i===placements.length)return 0;let n=best(i+1,used);if(!(used&placements[i]))n=Math.max(n,1+best(i+1,used|placements[i]));return n;}
    expect(best(0,0n)).toBe(3);expect(expert.question.followUp[0].choices[expert.question.followUp[0].correct]).toMatch(/^3 boxes/);expect(expert.question.followUp[1].choices[expert.question.followUp[1].correct]).toBe('12 cubic units');
  });
  it('starts outside the boxes and provides clear ground access to every guide',()=>{
    const reached=reachable(shipping,blocks);expect(reached.has(key([shipping.spawnPoint[0],shipping.spawnPoint[2]]))).toBe(true);for(const npc of shipping.npcs)expect(reached.has(key([npc.position[0],npc.position[2]])),npc.name).toBe(true);expect(expert.position[1]).toBe(1);
  });
});
