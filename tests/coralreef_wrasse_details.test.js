import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe,it,expect} from 'vitest';
const T=createRequire(import.meta.url)('../vendor/three-r128/three.min.js'),w={};new Function('window',readFileSync(process.env.REEF3D_SPECIES_SOURCE||'stem_lab/reef_3d_species.js','utf8'))(w);const S=w.Reef3DSpecies;
function part(m,name){let found;m.root.traverse(o=>{if(o.isMesh)for(const range of o.geometry.userData.batch||[])if(range.part===name&&!found)found={mesh:o,range};});return found;}
const pigment=m=>m.root.getObjectByName(m.root.userData.speciesId+'-body').material.map.image;
const pixel=(im,u,v)=>{const i=(Math.min(im.height-1,Math.floor(v*im.height))*im.width+Math.min(im.width-1,Math.floor(u*im.width)))*4;return [...im.data.slice(i,i+3)].map(c=>c/255);};
const lum=c=>c[0]*.2126+c[1]*.7152+c[2]*.0722;
describe('wrasse adult study detail',()=>{
 it.each(['low','high'])('resolves irregular pale head and bilateral chest lines in %s detail',quality=>{
  const m=S.create(T,'humphead_wrasse',{quality,seed:7});try{const im=pigment(m);expect(im.width).toBeGreaterThanOrEqual(quality==='low'?256:512);expect(im.height).toBeGreaterThanOrEqual(quality==='low'?128:256);
   // v=0 is the belly seam; the opposite flank is at 1-v.
   for(const [a,b]of [[.08,.18],[.82,.92]]){let warm=0,n=0;for(let x=.13;x<.245;x+=.004)for(let v=a;v<b;v+=.006){const c=pixel(im,(.5-x)/.8,v);n++;if(c[0]>.64*c[1]&&c[2]<.82*c[1])warm++;}expect(warm/n,'visible pale lines extend onto each side of the chest').toBeGreaterThan(.035);}
   let head=0;for(let x=.34;x<.45;x+=.004)for(let v=.15;v<.35;v+=.008){const c=pixel(im,(.5-x)/.8,v);if(c[0]>.64*c[1]&&c[2]<.82*c[1])head++;}expect(head,'facial wavy marks retained').toBeGreaterThan(20);
  }finally{m.dispose();}
 });
 it.each(['low','high'])('seats a small dark mouth at the snout tip in %s detail',quality=>{
  const m=S.create(T,'cleaner_wrasse',{quality,seed:7});try{const body=m.root.getObjectByName('cleaner_wrasse-body').geometry;body.computeBoundingBox();const unit=body.boundingBox.max.x/.503,{mesh,range}=part(m,'detail'),g=mesh.geometry,p=g.attributes.position,c=g.attributes.color,ink=new T.Color(0x0b0b14).convertSRGBToLinear(),points=[];
   for(let i=range.first;i<range.first+range.count;i++)if(p.getX(i)>.5*unit&&Math.max(Math.abs(c.getX(i)-ink.r),Math.abs(c.getY(i)-ink.g),Math.abs(c.getZ(i)-ink.b))<.00001)points.push(new T.Vector3().fromBufferAttribute(p,i));
   expect(points.length,'drawn dark terminal aperture').toBeGreaterThan(12);const box=new T.Box3().setFromPoints(points);expect(box.max.x).toBeGreaterThan(body.boundingBox.max.x);expect(box.getCenter(new T.Vector3()).y/unit).toBeCloseTo(-.006,3);expect(box.getSize(new T.Vector3()).z/unit).toBeGreaterThan(.008);expect(box.min.y/unit,'opening remains above the underside of the snout').toBeGreaterThan(-.012);
  }finally{m.dispose();}
 });
 it.each(['low','high'])('keeps adult basal fin stripes and the dark head midline in %s detail',quality=>{
  const m=S.create(T,'cleaner_wrasse',{quality,seed:7});try{const im=pigment(m),u=(.5-.35)/.8;expect(lum(pixel(im,u,.5)),'dark dorsal midline on head').toBeLessThan(.08);expect(lum(pixel(im,u,.4)),'pale forehead beside the narrow midline').toBeGreaterThan(.35);
   const {mesh,range}=part(m,'fins'),g=mesh.geometry,p=g.attributes.position,uv=g.attributes.uv,c=g.attributes.color,unit=m.root.getObjectByName('cleaner_wrasse-body').geometry.boundingBox?.max.x/.503||m.bounds.max.x/.503;
   for(const side of [-1,1]){const values=[];for(let i=range.first;i<range.first+range.count;i++)if(Math.abs(uv.getY(i))<.00001&&p.getX(i)<0&&side*p.getY(i)>.02*unit)values.push(lum([c.getX(i),c.getY(i),c.getZ(i)]));expect(values.length,'sample both dorsal and anal fin bases').toBeGreaterThan(2);expect(Math.max(...values),'dark basal pigment contrasts with outer blue fin').toBeLessThan(.025);}
  }finally{m.dispose();}
 });
 it.each(['low','high'])('retains two draws and the %s animal budget',quality=>{
  for(const id of ['humphead_wrasse','cleaner_wrasse']){const m=S.create(T,id,{quality,seed:7,reducedMotion:true});try{let calls=0,tris=0;m.root.traverse(o=>{if(o.isMesh){calls++;tris+=o.geometry.index.count/3;}});expect(calls).toBe(2);expect(tris).toBeLessThanOrEqual(quality==='low'?1500:6000);}finally{m.dispose();}}
 });
 it('connects identification guidance to age, mouth position, refuge and eye pattern',()=>{
  const local={StemLab:{isRegistered:()=>false,registerTool(){}},__RR_TEST_EXPORTS__:{}};new Function('window',readFileSync(process.env.CORALREEF_SOURCE||'stem_lab/stem_tool_coralreef.js','utf8'))(local);const x=local.__RR_TEST_EXPORTS__.coralReef,t=x.speciesText((k,f)=>f),p=x.marineProfiles((k,f)=>f);
  expect(t.humphead_wrasse.fact).toMatch(/undulatus.*wavy.*large adults/);expect(p.humphead_wrasse.behavior).toMatch(/study model shows a large adult/);expect(p.cleaner_wrasse.behavior).toMatch(/adult colouring.*Juveniles.*black.*neon-blue/);expect(p.cleaner_wrasse.observe).toMatch(/mouth.*tip.*false cleanerfish.*under the snout/);expect(p.firefish.behavior).toMatch(/current.*burrow/);expect(t.pajama_cardinalfish.marks[0]).toMatch(/red bar.*iris/);
  for(const [id,source]of [['humphead_wrasse','dx-am-humphead-form'],['cleaner_wrasse','dx-rls-cleaner-mouth'],['firefish','dx-foa-firefish'],['pajama_cardinalfish','dx-foa-pajama_cardinalfish']])expect(x.marineEntrySources(p[id]).map(s=>s.id)).toContain(source);
 });
});
