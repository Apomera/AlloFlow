import {nativeOrnithopodBodyHarness,THREE,vec} from './dino_native_ornithopod_body_harness.js';
export {THREE,vec};

// Execute the actual anchor, torso, cervical, caudal, cage and four addLeg
// callers. No independently positioned stand-in bones or inferred ellipsoids.
export function nativeLambeosaurBodyHarness(source){
 const native=nativeOrnithopodBodyHarness(source),art=native.art;
 const marker="window.StemLab.registerTool('dinoLab'";
 window.StemLab={registerTool(){}};
 new Function(source.replace(marker,'globalThis.__lambeosaurBodyCranial={cranialSurfaceProfileFor};'+marker))();
 Object.assign(art,globalThis.__lambeosaurBodyCranial);delete globalThis.__lambeosaurBodyCranial;
 const evaluate=(code,result,c)=>new Function('context','with(context){'+code+'\nreturn '+result+';}')(c);
 function section(a,b){const i=source.indexOf(a),j=source.indexOf(b,i);if(i<0||j<i)throw Error('Missing actual lambeosaur assembly: '+a);return source.slice(i,j);}
 function extract(name){const i=source.indexOf('function '+name+'('),open=source.indexOf('{',i);let depth=1,j=open+1;for(;depth;j++){if(source[j]==='{')depth++;if(source[j]==='}')depth--;}return source.slice(i,j);}
 function build(id,scale=1,layer='both',tissue=.88,transformed=false){
  const layers={showBody:layer!=='bone',showSkeleton:layer!=='life'};
  const built=native.build(id,scale,true,false,layers),c=built.context;
  // The common harness builds its isolated tail fixture first. Replace those
  // fixture bones by the full native axial callers and cage used in the app.
  for(const mesh of built.bones)c.model.remove(mesh);
  if(!layers.showBody)for(const mesh of [c.bodyShell,...c.tailMeshes])c.model.remove(mesh);
  Object.assign(c,art,{cranialSurface:art.cranialSurfaceProfileFor(c.dn),matureTyrannosaurPose:{active:false},headMat:c.bodyMat,
    surfaceHypothesis:{bodyHeightScale:tissue,bodyDepthScale:tissue,neckSoftTissueScale:tissue,headSoftTissueScale:.90,tailSoftTissueScale:tissue},
    props:{species:c.dn,...layers}});
  const head=section('var surfaceHeadFactor = reconstructionProfile.head','if (headShell) {');
  Object.assign(c,evaluate(head,'({headShell,surfaceHeadLength,surfaceHeadHeight,surfaceHeadDepth,neckBaseRadius,neckTipRadius,cervicalEnvelope,neckPoints,neckRadii,neckJunction})',c));
  const neck=section('var neckSkinEnvelope =','var neckContours =');
  Object.assign(c,evaluate(neck,'({neckMeshes,neckSkinEnvelope})',c));
  if(c.lambeosaurBody&&c.neckMeshes[0])art.dinoLambeosaurBodyTag(c.model,c.model.children.filter(m=>m!==c.neckMeshes[0]),c.dn,'neck','cervical-envelope',0,'life');
  c.addVertebralChain=evaluate(extract('addVertebralChain'),'addVertebralChain',c);
  c.addDorsalSpine=evaluate(extract('addDorsalSpine'),'addDorsalSpine',c);
  const dorsal=source.match(/^\s*addVertebralChain\(shoulder, hip,.*'dorsal'\);$/m)[0];
  const caudal=source.match(/^\s*addVertebralChain\(hip,.*'caudal'\);$/m)[0];
  evaluate(dorsal+caudal,'undefined',c);
  const cervical=section('var skullLength = Math.max(0.20 * detailScale','var cranialDisplay =');
  evaluate(cervical,'undefined',c);
  const caller=source.match(/if\(lambeosaurBody\)\{(dinoAddLambeosaurBodyCage\([^;]+;)/)?.[1];
  if(caller&&c.props.showSkeleton)evaluate(caller,'undefined',c);
  if(transformed){c.model.position.set(scale,-.3*scale,2*scale);c.model.rotation.set(.12,-.25,.18);c.model.scale.set(1.12,.94,1.06);}
  c.model.updateMatrixWorld(true);
  const tagged=[];c.model.traverse(m=>{if(m.isMesh&&m.userData.dinoLambeosaurBodyElement)tagged.push(m);});
  return {...built,context:c,tagged,skin:tagged.filter(m=>m.userData.dinoLambeosaurBodyElement.layer==='life'),bone:tagged.filter(m=>m.userData.dinoLambeosaurBodyElement.layer==='bone')};
 }
 return {art,build};
}
