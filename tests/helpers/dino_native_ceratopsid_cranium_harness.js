import { readFileSync } from 'node:fs';
import { nativeRosetteHarness, THREE, vec } from './dino_native_rosette_harness.js';
export { THREE, vec };
export const source=readFileSync(process.env.DINO_CERATOPSID_CRANIUM_SOURCE||'stem_lab/stem_tool_dinolab.js','utf8');
globalThis.window=globalThis.window||{StemLab:{registerTool(){}}};
const exports=[...source.matchAll(/^  function (\w+)\(/gm)].map(m=>m[1]).join(',');
// Reuse the captured native cranial assembly, choosing its quadrupedal branch.
// The baryonychine-only postprocessing section is intentionally not executed.
const factorySource='('+nativeRosetteHarness.toString()
  .replace('dinoPartViewpointTaskFor};','dinoPartViewpointTaskFor,'+exports+'};')
  .replace('const toothMat =', 'const boneMaterial = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }); const toothMat =')
  .replace('boneMat: material', 'boneMat: boneMaterial')
  .replace('material.dispose(); toothMat.dispose();', 'material.dispose(); boneMaterial.dispose(); toothMat.dispose();')
  .replace('isTheropod: true, isSauropod: false','isTheropod: false, isSauropod: false')
  .replace('craniocervicalDetail: false','craniocervicalDetail: true')
  .replace('evaluate(bones + shaping, context','evaluate(bones, context')
  .replace('{head,snout,headShell,detailScale','{ceratopsidCranium,head,snout,headShell,detailScale')+')';
const factory=new Function('THREE','vec','return '+factorySource+';')(THREE,vec);
const native=factory(source);
export const api=native.art;
function section(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<=a)throw Error('Missing native cranium assembly '+start);return source.slice(a,b);}
const frill=section('function addFrillSurface(mat, size) {','function addStyracosaurusOrnaments(core) {');
const ornaments=section('function addStyracosaurusOrnaments(core) {','var hasHighSail =');
const nativeNeck=section('var neckSkinEnvelope = dinoCervicalSkinEnvelope(cervicalEnvelope,','var neckSurfaceCurve =');
function run(code,result,c){return new Function('context','with(context){'+code+';return '+result+';}')(c);}
export function nativeCeratopsidCranium(id,scale=1,tissue=.90) {
  const b=native.build(id,scale,tissue),c=b.context;
  c.surfaceBodyDepth=c.bodyDepth*(tissue===.90?.89:1.10);c.keratinMat=c.headMat;c.anatomyAccentMat=c.headMat;
  c.hasAnatomyPart=()=>true;c.dinoMarkSpecialPart=(m,id)=>{m.userData.dinoPartIds=[id];};
  c.addFrillSurface=run(frill,'addFrillSurface',c);c.addStyracosaurusOrnaments=run(ornaments,'addStyracosaurusOrnaments',c);
  const lifeFrill=c.addFrillSurface(c.headMat,1),boneFrill=c.addFrillSurface(c.boneMat,.95);
  const neck=run(nativeNeck,'neckMeshes[0]',c);
  let lifeHorns=api.dinoAddCeratopsidHorns(THREE,c.dn,c.model,c.ceratopsidCranium,c.len,c.headMat,false,b.upper);
  let boneHorns=api.dinoAddCeratopsidHorns(THREE,c.dn,c.model,c.ceratopsidCranium,c.len,c.boneMat,true,null);
  c.addStyracosaurusOrnaments(false);c.addStyracosaurusOrnaments(true);
  lifeHorns=lifeHorns.concat(c.model.children.filter(m=>m.userData.dinoCranialOrnament?.core===false));
  boneHorns=boneHorns.concat(c.model.children.filter(m=>m.userData.dinoCranialOrnament?.core===true));
  c.model.updateMatrixWorld(true);
  return {...b,lifeFrill,boneFrill,neck,lifeHorns,boneHorns,
    skins:[b.upper,b.lower,neck,lifeFrill,...lifeHorns],allBones:[...b.bones,boneFrill,...boneHorns]};
}
export function enclosed(b,p){return b.skins.some(m=>{const h=new THREE.Raycaster(vec(p.x,p.y,b.context.ht*20),vec(0,0,-1)).intersectObject(m,false);return h.length>=2&&p.z<=h[0].point.z+b.context.ht*2e-6&&p.z>=h.at(-1).point.z-b.context.ht*2e-6;});}
