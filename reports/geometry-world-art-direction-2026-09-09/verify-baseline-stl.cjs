const fs=require('node:fs'),path=require('node:path');
const after=JSON.parse(fs.readFileSync(path.join(__dirname,'after-results.json'),'utf8'));
let source=fs.readFileSync(path.join(__dirname,'capture-baseline.cjs'),'utf8');
source=source.replace('fs.readFileSync(f)]','fs.readFileSync(path.join(__dirname,\'before-\'+path.basename(f)))]');
source=source.replace(/^for \(const \[file,bytes\] of frozenSources\).*\r?\n/m,'');
source=source.replace('Frozen baseline sources, actual WebGL pavilion and material gallery, balanced and saver','Frozen baseline actual mesh and STL comparison against the matched after fixtures');
source=source.replace('baseline-source-loaded','baseline-stl-loaded').replaceAll('baseline-results.json','baseline-stl-results.json').replaceAll('before-failure.png','baseline-stl-failure.png');
source=source.replace(/  async function profiles\(prefix\)\{[\s\S]*?\r?\n  \}\r?\n  try\{/,`  async function profiles(prefix){
    const actual=await page.evaluate(async()=>{
      const e=__geoWorldEngine,b=StemLab.geometryWorldBuilderPure.buildGeometryWorldStl(e,e._builderSelection.blocks,{title:'Matched visual invariant'});
      const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(v=>v.toString(16).padStart(2,'0')).join('');
      const blocks=Object.keys(e.blocks).sort().map(k=>{const m=e.blocks[k],g=m.geometry;return [k,m.userData.blockType,m.userData.shape,m.userData.rotation,m.position.toArray(),m.quaternion.toArray(),m.scale.toArray(),Array.from(g.attributes.position.array),g.index?Array.from(g.index.array):null];});
      return {stlHash:await digest(b.buffer),stlBytes:b.buffer.byteLength,stlTriangles:b.triangleCount,meshHash:await digest(new TextEncoder().encode(JSON.stringify(blocks))),selected:e._builderSelection.blocks.length,shaderErrors:e.renderer.info.programs.filter(p=>p.diagnostics?.runnable===false).map(p=>p.diagnostics)};
    });
    const expected=after.captures.find(c=>c.file==='after-'+prefix+'-meadow-balanced.png');
    if(!expected)throw Error('Missing after comparison for '+prefix);
    actual.kind=prefix;actual.stlMatchesAfter=actual.stlHash===expected.stlHash;actual.meshMatchesAfter=actual.meshHash===expected.meshHash;
    results.captures.push(actual);
    if(!actual.stlMatchesAfter||!actual.meshMatchesAfter)throw Error('Frozen baseline geometry differs from after: '+prefix);
    console.log(JSON.stringify({stage:'compared',kind:prefix,stlMatchesAfter:actual.stlMatchesAfter,meshMatchesAfter:actual.meshMatchesAfter,stlHash:actual.stlHash}));
  }
  try{`);
if(!source.includes('actual.stlMatchesAfter')||source.includes('fs.writeFileSync(path.join(__dirname,\'before-\''))throw Error('Baseline probe adaptation failed');
eval(source);
