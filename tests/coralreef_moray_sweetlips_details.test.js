import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe,it,expect} from 'vitest';
const T=createRequire(import.meta.url)('../vendor/three-r128/three.min.js'),w={};new Function('window',readFileSync(process.env.REEF3D_SPECIES_SOURCE||'stem_lab/reef_3d_species.js','utf8'))(w);const S=w.Reef3DSpecies;
function part(m,name){let found;m.root.traverse(o=>{if(o.isMesh)for(const range of o.geometry.userData.batch||[])if(range.part===name&&!found)found={mesh:o,range};});return found;}
function components(g,range,select){const parent=new Map(),find=i=>{if(!parent.has(i))parent.set(i,i);while(parent.get(i)!==i)i=parent.get(i);return i;},union=(a,b)=>parent.set(find(a),find(b));for(let n=range.start;n<range.start+range.length;n+=3){const ids=[0,1,2].map(j=>g.index.getX(n+j));if(ids.every(select)){union(ids[0],ids[1]);union(ids[1],ids[2]);}}const groups=new Map();for(const i of parent.keys()){const root=find(i);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(i);}return [...groups.values()];}
const colour=(g,hex)=>{const c=g.attributes.color,t=new T.Color(hex).convertSRGBToLinear();return i=>Math.max(Math.abs(c.getX(i)-t.r),Math.abs(c.getY(i)-t.g),Math.abs(c.getZ(i)-t.b))<.00001;};
const centroid=(g,ids)=>ids.reduce((v,i)=>v.add(new T.Vector3().fromBufferAttribute(g.attributes.position,i)),new T.Vector3()).multiplyScalar(1/ids.length);
describe('sweetlips median fins and moray anterior nostrils',()=>{
 it.each(['low','high'])('keeps bilateral sweetlips dots on the median fins in %s detail',quality=>{
  const m=S.create(T,'oriental_sweetlips',{quality,seed:7});try{const unit=m.root.getObjectByName('oriental_sweetlips-body').geometry.boundingBox.max.x/.503;
   for(const [name,n]of [['fins',quality==='low'?24:32],['tail',quality==='low'?12:16]]){const {mesh,range}=part(m,name),g=mesh.geometry,p=g.attributes.position,ink=colour(g,0x121214),dots=components(g,range,ink);expect(dots,name+' has separate marks on both faces').toHaveLength(n);
    const membrane=[];for(let q=range.start;q<range.start+range.length;q+=3){const ids=[0,1,2].map(k=>g.index.getX(q+k));if(!ids.every(ink))membrane.push(new T.Triangle(...ids.map(i=>new T.Vector3().fromBufferAttribute(p,i))));}
    for(const ids of dots){const centre=centroid(g,ids),near=new T.Vector3();let d=Infinity;for(const tri of membrane)d=Math.min(d,tri.closestPointToPoint(centre,near).distanceTo(centre));expect(d/unit,'pigment rests on the billowed membrane').toBeLessThan(.0005);for(const i of ids){expect(g.attributes.reefPart.getW(i)).toBe(range.slot);if(name==='fins')expect(Math.abs(p.getZ(i))/unit,'paired pelvic fins stay unspotted').toBeLessThan(.018);}}
   }
   const pec=part(m,'pectoral'),pc=pec.mesh.geometry,black=colour(pc,0x121214);expect(Array.from({length:pec.range.count},(_,j)=>pec.range.first+j).filter(black),'adult pectorals stay plain yellow').toHaveLength(0);
  }finally{m.dispose();}
 });
 it.each(['low','high'])('shows two genuinely open moray nostril tubes in %s detail',quality=>{
  const m=S.create(T,'giant_moray',{quality,seed:7});try{const body=m.root.getObjectByName('giant_moray-body'),unit=body.geometry.boundingBox.max.x/.503,{mesh,range}=part(m,'detail'),g=mesh.geometry,p=g.attributes.position,dark=colour(g,0x17100b),outer=colour(g,0xb08c52),inner=colour(g,0x39291b),caps=components(g,range,dark);expect(caps,'one recessed opening per anterior nostril').toHaveLength(2);
   const nasal=[];for(let q=range.start;q<range.start+range.length;q+=3){const ids=[0,1,2].map(j=>g.index.getX(q+j));if(ids.every(i=>dark(i)||outer(i)||inner(i)))nasal.push({ids,tri:new T.Triangle(...ids.map(i=>new T.Vector3().fromBufferAttribute(p,i)))});}
   for(const ids of caps){const centre=centroid(g,ids),side=Math.sign(centre.z),direction=new T.Vector3(.88,.16,side*.45).normalize(),ray=new T.Ray(centre.clone().addScaledVector(direction,.012*unit),direction.clone().negate()),hit=new T.Vector3();let distance=Infinity,firstDark=false;
    let front=-Infinity;for(let i=range.first;i<range.first+range.count;i++)if(outer(i)&&Math.sign(p.getZ(i))===side)front=Math.max(front,new T.Vector3().fromBufferAttribute(p,i).dot(direction));expect((front-centre.dot(direction))/unit,'dark recess stays behind the open lip').toBeGreaterThan(.003);
    expect(centre.x/unit).toBeGreaterThan(.48);for(const item of nasal)if(ray.intersectTriangle(item.tri.a,item.tri.b,item.tri.c,false,hit)){const d=hit.distanceTo(ray.origin);if(d<distance){distance=d;firstDark=item.ids.every(dark);}}
    expect(firstDark,'view through the lumen reaches its dark recess first').toBe(true);expect(distance/unit,'opening is recessed, not capped by a solid horn').toBeCloseTo(.012,4);
   }
   expect(body.material.map.image.height).toBeGreaterThanOrEqual(quality==='low'?64:128);
  }finally{m.dispose();}
 });
 it.each(['low','high'])('retains two draws and the %s animal triangle budget',quality=>{
  for(const id of ['oriental_sweetlips','giant_moray']){const m=S.create(T,id,{quality,seed:7,reducedMotion:true});try{let calls=0,tris=0;m.root.traverse(o=>{if(o.isMesh){calls++;tris+=o.geometry.index.count/3;}});expect(calls).toBe(2);expect(tris).toBeLessThanOrEqual(quality==='low'?1500:6000);}finally{m.dispose();}}
 });
 it('keeps age, smell/breathing, variable colour and perching guidance specific',()=>{
  const local={StemLab:{isRegistered:()=>false,registerTool(){}},__RR_TEST_EXPORTS__:{}};new Function('window',readFileSync(process.env.CORALREEF_SOURCE||'stem_lab/stem_tool_coralreef.js','utf8'))(local);const x=local.__RR_TEST_EXPORTS__.coralReef,t=x.speciesText((k,f)=>f),p=x.marineProfiles((k,f)=>f);
  expect(t.oriental_sweetlips.fact).toMatch(/striped model represents an adult.*Juveniles/);expect(p.oriental_sweetlips.observe).toMatch(/pectoral fins are plain yellow/);expect(p.giant_moray.behavior).toMatch(/nostrils sample scents.*separately.*breathing/);expect(p.giant_moray.observe).toMatch(/pair of tubular nostrils/);expect(t.leaf_scorpionfish.fact).toMatch(/white, pink, red or green/);expect(p.longnose_hawkfish.observe).toMatch(/lower pectoral-fin rays used for perching/);expect(x.marineEntrySources(p.giant_moray).map(s=>s.id)).toContain('dx-moray-nasal-anatomy');
 });
});
