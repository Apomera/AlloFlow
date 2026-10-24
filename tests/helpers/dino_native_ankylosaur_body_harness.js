import {nativeOrnithopodBodyHarness,THREE,vec} from './dino_native_ornithopod_body_harness.js';
export {THREE,vec};

// Execute production anchors, torso, ribs, long bones, joints and feet. Only
// rendering and UI plumbing are replaced by the shared native mesh harness.
export function nativeAnkylosaurBodyHarness(source) {
  const native=nativeOrnithopodBodyHarness(source,{anchorName:'dinoAnkylosaurBodyAnchors',limbName:'dinoAnkylosaurBodyLimb'});
  function section(a,b){const start=source.indexOf(a),end=source.indexOf(b,start);if(start<0||end<=start)throw Error('Missing native seam '+a);return source.slice(start,end);}
  function extract(name){const start=source.indexOf('function '+name+'('),open=source.indexOf('{',start);if(start<0)throw Error(name);let depth=1,end=open+1;while(depth&&end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;end++;}return source.slice(start,end);}
  const evaluate=(code,result,context)=>new Function('context','with(context){'+code+'\nreturn '+result+';}')(context);
  function build(id,scale=1,enabled=true,transformed=false){
    const built=native.build(id,scale,enabled,transformed),c=built.context;
    const before=new Set(c.model.children);
    c.addCurvedBone=evaluate(extract('addCurvedBone'),'addCurvedBone',c);
    evaluate(section('var ribCount = isSauropod ? 10 : 9;','if (skeletalProfile.gastralia)'),'undefined',c);
    const ribs=c.model.children.filter(mesh=>mesh.isMesh&&!before.has(mesh));
    c.model.updateMatrixWorld(true);
    function torsoForMode(mode){
      const old=c.surfaceHypothesis,prior=new Set(c.model.children);
      c.surfaceHypothesis={...old,...mode};
      const mesh=evaluate(section('var cladeName = String(dn.clade','function dorsalSurfacePoint(t)'),'bodyShell',c);
      c.surfaceHypothesis=old;c.model.updateMatrixWorld(true);
      return {mesh,dispose(){c.model.children.filter(child=>!prior.has(child)).forEach(child=>{child.geometry?.dispose();c.model.remove(child);});}};
    }
    return {...built,ribs,torsoForMode};
  }
  return {...native,build};
}
