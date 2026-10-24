import {nativeOrnithopodBodyHarness,THREE,vec} from './dino_native_ornithopod_body_harness.js';
export {THREE,vec};
export function nativeCeratopsidBodyHarness(source){
  const native=nativeOrnithopodBodyHarness(source,{anchorName:'dinoCeratopsidBodyAnchors',limbName:'dinoCeratopsidBodyLimb'});
  function section(a,b){const start=source.indexOf(a),end=source.indexOf(b,start);if(start<0||end<=start)throw Error('Missing native seam '+a);return source.slice(start,end);}
  function extract(name){const start=source.indexOf('function '+name+'('),open=source.indexOf('{',start);let depth=1,end=open+1;if(start<0)throw Error(name);while(depth&&end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;end++;}return source.slice(start,end);}
  const evaluate=(code,result,context)=>new Function('context','with(context){'+code+'\nreturn '+result+';}')(context);
  const marker="window.StemLab.registerTool('dinoLab'";
  new Function(source.replace(marker,'globalThis.__ceratopsidCranialProfile = cranialSurfaceProfileFor;'+marker))();
  const cranial=globalThis.__ceratopsidCranialProfile;delete globalThis.__ceratopsidCranialProfile;
  function build(id,scale=1,enabled=true,transformed=false){
    const built=native.build(id,scale,enabled,transformed),c=built.context;
    Object.assign(c,{cranialSurface:cranial(c.dn),matureTyrannosaurPose:{active:false}});
    const bonesBefore=new Set(c.model.children);
    c.addCurvedBone=evaluate(extract('addCurvedBone'),'addCurvedBone',c);
    evaluate(section('var ribCount = isSauropod ? 10 : 9;','if (skeletalProfile.gastralia)'), 'undefined',c);
    const ribs=c.model.children.filter(mesh=>mesh.isMesh&&!bonesBefore.has(mesh));
    // Execute the native head/neck dimension and junction callers, including
    // the actual rendered loft and original minimum-radius behavior.
    c.surfaceHypothesis.neckSoftTissueScale=1;
    c.surfaceHypothesis.headSoftTissueScale=1;
    const headFactor=source.match(/^\s*var surfaceHeadFactor =.*;$/m)[0];
    Object.assign(c,evaluate(headFactor+'\n'+section('var surfaceHeadLength =','var cranialShape ='),
      '({surfaceHeadLength,surfaceHeadHeight,surfaceHeadDepth,surfaceSnout,neckBaseRadius,neckTipRadius,cervicalEnvelope,neckPoints,neckRadii,neckJunction})',c));
    const neckGeometry=c.dinoSurfaceGeometry(THREE,c.cervicalEnvelope.points,c.cervicalEnvelope.radii,{smoothProfile:true});
    const neck=new THREE.Mesh(neckGeometry,c.bodyMat);c.model.add(neck);
    c.model.updateMatrixWorld(true);
    function torsoForMode(mode){
      const before=new Set(c.model.children),old=c.surfaceHypothesis;
      c.surfaceHypothesis={...old,...mode};
      const torso=evaluate(section('var cladeName = String(dn.clade','function dorsalSurfacePoint(t)'), 'bodyShell',c);
      c.surfaceHypothesis=old;c.model.updateMatrixWorld(true);
      return {mesh:torso,dispose(){c.model.children.filter(child=>!before.has(child)).forEach(child=>{child.geometry?.dispose();c.model.remove(child);});}};
    }
    return {...built,ribs,neck,torsoForMode};
  }
  return {...native,build};
}
