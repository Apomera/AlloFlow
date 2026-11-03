import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe,it,expect} from 'vitest';
const T=createRequire(import.meta.url)('../vendor/three-r128/three.min.js'),w={};new Function('window',readFileSync(process.env.REEF3D_SPECIES_SOURCE||'stem_lab/reef_3d_species.js','utf8'))(w);const S=w.Reef3DSpecies;
function meshes(m){const out=[];m.root.traverse(o=>{if(o.isMesh)out.push(o);});return out;}
function pixel(im,u,v){const x=Math.max(0,Math.min(im.width-1,Math.floor(u*im.width))),y=Math.max(0,Math.min(im.height-1,Math.floor(v*im.height)));return im.data[(y*im.width+x)*4];}
function headSurface(g,r,p,side){const ray=new T.Ray(new T.Vector3(p.x,p.y,side),new T.Vector3(0,0,-side)),out=new T.Vector3(),a=g.attributes.position;let closest=Infinity,z;
 for(let n=0;n<g.index.count;n+=3){const ids=[0,1,2].map(j=>g.index.getX(n+j));if(ids.some(i=>i<r.first||i>=r.first+r.count))continue;const pts=ids.map(i=>new T.Vector3().fromBufferAttribute(a,i));if(ray.intersectTriangle(...pts,false,out)){const d=out.distanceTo(ray.origin);if(d<closest){closest=d;z=out.z;}}}return z;}
describe('sea-krait scales and spotted-seahorse armour',()=>{
 it.each(['low','high'])('shows coherent broad belly plates, distinct from side scales and tail, at %s detail',quality=>{
  const m=S.create(T,'banded_sea_krait',{quality,seed:7,reducedMotion:true});try{const im=meshes(m)[0].material.bumpMap.image,bellyA=[],bellyB=[],tailA=[],tailB=[];for(let x=Math.floor(im.width*.2);x<im.width*.7;x++){bellyA.push(pixel(im,(x+.5)/im.width,.48));bellyB.push(pixel(im,(x+.5)/im.width,.52));}expect(bellyA,'transverse seams cross the broad ventral surface').toEqual(bellyB);expect(Math.max(...bellyA)-Math.min(...bellyA),'plates have real relief').toBeGreaterThan(50);
   for(let x=Math.floor(im.width*.83);x<im.width*.95;x++){tailA.push(pixel(im,(x+.5)/im.width,.48));tailB.push(pixel(im,(x+.5)/im.width,.52));}expect(tailA,'single belly-plate series stops at the tail').not.toEqual(tailB);
   const side=Array.from({length:100},(_,i)=>pixel(im,.2+i*.005,.26));expect(Math.max(...side)-Math.min(...side),'small flank scales remain').toBeGreaterThan(30);
  }finally{m.dispose();}
 });
 it.each(['low','high'])('seats two wet krait corneas on the actual head triangles at %s detail',quality=>{
  const m=S.create(T,'banded_sea_krait',{quality,seed:7,reducedMotion:true});try{const [body,head]=meshes(m),g=head.geometry,r=g.userData.bandedSeaKrait.ranges,k=body.geometry.attributes.position.getX(0)/.53,p=g.attributes.position,uv=g.attributes.uv,sides=new Set();let rims=0;
   for(let i=r.eyes.first;i<r.eyes.first+r.eyes.count;i++){const point=new T.Vector3().fromBufferAttribute(p,i),side=Math.sign(point.z),z=headSurface(g,r.head,point,side),lift=side*(point.z-z)/k;expect(Number.isFinite(lift)).toBe(true);expect(lift).toBeGreaterThan(0);expect(lift).toBeLessThan(.0011);sides.add(side);expect(uv.getX(i)).toBeGreaterThan(1.8);if(Math.hypot(uv.getX(i)-2.5,uv.getY(i)-.5)>.52){expect(lift,'limbus is seated').toBeLessThan(.0002);rims++;}}
   expect([...sides].sort()).toEqual([-1,1]);expect(rims).toBe(quality==='low'?16:32);const shader={uniforms:{},vertexShader:'#include <common>',fragmentShader:'#include <common>'};head.material.onBeforeCompile(shader,{});expect(shader.uniforms.reefFeature.value.y).toBe(1);
  }finally{m.dispose();}
 });
 it.each(['low','high'])('aligns seahorse relief seams with trunk and curled-tail ring stations at %s detail',quality=>{
  const m=S.create(T,'spotted_seahorse',{quality,seed:7});try{const im=meshes(m)[0].material.bumpMap.image;
   for(const [count,baseV]of [[11,.02],[36,.52]]){let seams=0,centres=0,n=0;for(let j=3;j<count-2;j++){const v=baseV+.46*.125,uc=.02+.46*j/count,um=.02+.46*(j+.5)/count,radius=.46/count*.23;let minimum=255;for(let x=Math.ceil((uc-radius)*im.width-.5);x<=(uc+radius)*im.width-.5;x++)minimum=Math.min(minimum,pixel(im,(x+.5)/im.width,v));seams+=minimum;centres+=pixel(im,um,v);n++;}expect((centres-seams)/n,'dark relief follows physical joints, not the middle of each plate').toBeGreaterThan(8);}
  }finally{m.dispose();}
 });
 it.each(['low','high'])('gives ring corners low rounded tubercles within two draws and the %s animal budget',quality=>{
  for(const id of ['banded_sea_krait','spotted_seahorse']){const m=S.create(T,id,{quality,seed:7});try{const ms=meshes(m);expect(ms).toHaveLength(2);expect(ms.reduce((n,o)=>n+o.geometry.index.count/3,0)).toBeLessThanOrEqual(quality==='low'?1500:6000);
   if(id==='spotted_seahorse'){const g=ms[0].geometry,r=g.userData.spottedSeahorse.ranges['armoured-trunk'],uv=g.attributes.uv,p=g.attributes.position;
    function cornerRatio(u){const row=[];for(let i=r.first;i<r.first+r.count;i++)if(Math.abs((uv.getX(i)-.02)/.46-u)<.00001)row.push(i);const xs=row.map(i=>p.getX(i)),lo=Math.min(...xs),hi=Math.max(...xs),centre=(lo+hi)/2,diagonal=[];for(const i of row){const a=(uv.getY(i)-.02)/.46*Math.PI*2,c=Math.abs(Math.cos(a));if(c>.45&&c<.85)diagonal.push(Math.abs(p.getX(i)-centre)/Math.pow(c,.79));}return (hi-lo)/2/(diagonal.reduce((a,b)=>a+b,0)/diagonal.length);}
    const joint=cornerRatio(5/11),middle=cornerRatio(5.5/11);expect(joint-middle,'joint corners are rounded bumps rather than a smooth uniform ridge').toBeGreaterThan(.035);expect(joint-middle,'tubercles remain low instead of becoming spines').toBeLessThan(.065);
   }
  }finally{m.dispose();}}
 });
 it('connects inspection views to belly plates, tubercles, contrasting tails and nostril function',()=>{
  const local={StemLab:{isRegistered:()=>false,registerTool(){}},__RR_TEST_EXPORTS__:{}};new Function('window',readFileSync(process.env.CORALREEF_SOURCE||'stem_lab/stem_tool_coralreef.js','utf8'))(local);const x=local.__RR_TEST_EXPORTS__.coralReef,t=x.speciesText((k,f)=>f),p=x.marineProfiles((k,f)=>f);
  expect(t.banded_sea_krait.marks[3]).toMatch(/transverse plates.*no fins/);expect(p.banded_sea_krait.observe).toMatch(/Choose Below.*smaller scales.*venomous/);expect(t.spotted_seahorse.marks[2]).toMatch(/rounded tubercles \(bumps\)/);expect(p.spotted_seahorse.observe).toMatch(/low rounded bumps.*finless gripping tail/);expect(p.banded_pipefish.observe).toMatch(/separate tail fin.*no tail fin/);expect(p.ribbon_eel.observe).toMatch(/nostrils detect scents.*mouth and gills.*finless sea krait/);expect(x.marineEntrySources(p.ribbon_eel).map(s=>s.id)).toContain('dx-fish-smell-route');
 });
});
