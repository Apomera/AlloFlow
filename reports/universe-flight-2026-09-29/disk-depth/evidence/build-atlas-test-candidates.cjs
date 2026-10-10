'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const stage=__dirname,repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const baselineHash='c0cc2486b3d5edd620e5975daec3d23b8f2e995a24db151be27ac30820d058c7',candidateHash='8121868ef2aa764c5e3e88284089ebf76fe0c9e1ec264ee4ae95fe434d7e9bc9';
const baseline=fs.readFileSync(path.join(stage,'baseline-renderer.js'),'utf8'),candidate=fs.readFileSync(path.join(stage,'candidate-renderer.js'),'utf8');
assert.equal(sha(baseline),baselineHash);assert.equal(sha(candidate),candidateHash);
assert.equal(sha(fs.readFileSync(path.join(repo,'stem_lab/universe_flight_scene.js'))),candidateHash);
const hostAudit=JSON.parse(fs.readFileSync(path.join(stage,'candidate-host-audit.json'),'utf8'));
assert.equal(hostAudit.completed,true);assert.equal(hostAudit.baselineHash,baselineHash);assert.equal(hostAudit.candidateHash,candidateHash);
function evaluate(source,newDisk){
  const marker='  global.UniverseFlight ='; assert.equal(source.split(marker).length,2);
  const exposed='  global.__atlasPin={galaxyPixels:galaxyPixels,cloudPixels:cloudPixels'+(newDisk?',profile:diskLightProfile,light:function(){return Array.from(galaxyDiskLight);}':'')+'};\n';
  const window={};new Function('window',source.replace(marker,exposed+marker))(window);return window.__atlasPin;
}
function tile(data,index){const out=new Uint8Array(512*512*4);for(let y=0;y<512;y++)out.set(data.subarray((y*2048+index*512)*4,(y*2048+(index+1)*512)*4),y*512*4);return out;}
function alpha(data){return data.filter((value,index)=>index%4===3);}
function core(data){const out=[];for(let y=8;y<504;y++)for(let x=8;x<504;x++){const px=((x-8)/495*2-1)*1.22,pz=((y-8)/495*2-1)*1.22;if(Math.hypot(px,pz)<.18)out.push(...data.subarray((y*512+x)*4,(y*512+x)*4+4));}return new Uint8Array(out);}
function gutter(data){const out=[];for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(x<8||x>=504||y<8||y>=504)out.push(...data.subarray((y*512+x)*4,(y*512+x)*4+4));return new Uint8Array(out);}
console.log('Atlas pin audit: evaluating frozen c0 with host intrinsics.');
const b=evaluate(baseline,false),before=b.galaxyPixels(512);
console.log('Atlas pin audit: evaluating frozen candidate with host intrinsics.');
const a=evaluate(candidate,true),after=a.galaxyPixels(512),light=a.light();
assert.equal(sha(before),'47e61b0e871129a48cbe8f814a5d629263750e16d068766c84e8beeeb057ad53');
const tilesBefore=[0,1,2,3].map(i=>tile(before,i)),tilesAfter=[0,1,2,3].map(i=>tile(after,i));
const coresBefore=tilesBefore.slice(0,3).map(core),coresAfter=tilesAfter.slice(0,3).map(core);
assert.deepEqual(tilesAfter[3],tilesBefore[3]);assert.equal(sha(b.cloudPixels()),sha(a.cloudPixels()));
const alphaHashes=tilesBefore.slice(0,3).map(data=>sha(alpha(data))),coreAlphaHashes=coresBefore.map(data=>sha(alpha(data)));
for(let i=0;i<3;i++){assert.deepEqual(alpha(tilesAfter[i]),alpha(tilesBefore[i]));assert.deepEqual(alpha(coresAfter[i]),alpha(coresBefore[i]));assert.deepEqual(gutter(tilesAfter[i]),gutter(tilesBefore[i]));assert.equal(coresAfter[i].length,16768);}
const pre=Array(9).fill(0),post=Array(9).fill(0),restored=Array(9).fill(0),maxError=Array(9).fill(0),coreMaxError=Array(9).fill(0);
for(let y=0;y<512;y++)for(let x=0;x<512;x++){
  const inner=x>=8&&x<504&&y>=8&&y<504,px=((x-8)/495*2-1)*1.22,pz=((y-8)/495*2-1)*1.22,r=Math.hypot(px,pz),profile=inner?a.profile(r):0;
  for(let i=0;i<3;i++)for(let ch=0;ch<3;ch++){
    const offset=(y*2048+i*512+x)*4+ch,channel=i*3+ch,reconstructed=after[offset]+255*profile*light[channel],error=Math.abs(reconstructed-before[offset]);
    assert.ok(after[offset]<=before[offset]);pre[channel]+=before[offset];post[channel]+=after[offset];restored[channel]+=reconstructed;maxError[channel]=Math.max(maxError[channel],error);if(inner&&r<.18)coreMaxError[channel]=Math.max(coreMaxError[channel],error);
  }
}
for(let i=0;i<9;i++){assert.ok(Math.abs(pre[i]-restored[i])<.02);assert.ok(maxError[i]<=1.86752);assert.ok(Math.abs(pre[i]-hostAudit.channelIntegrals.preTotals[i])<.01);assert.ok(Math.abs(post[i]-hostAudit.channelIntegrals.postTotals[i])<.01);}
const audit={completed:true,evaluatedWith:'Ordinary new Function host IIFE; no VM or product writes',baselineHash,candidateHash,wholeAtlasBefore:sha(before),wholeAtlasAfter:sha(after),tileHashesBefore:tilesBefore.map(sha),tileHashesAfter:tilesAfter.map(sha),coreHashesBefore:coresBefore.map(sha),coreHashesAfter:coresAfter.map(sha),alphaHashes,coreAlphaHashes,gutterHashes:tilesBefore.slice(0,3).map(data=>sha(gutter(data))),cloudHash:sha(a.cloudPixels()),pre,post,restored,maxError,coreMaxError,hostAuditPath:path.join(stage,'candidate-host-audit.json'),hostAuditHash:sha(fs.readFileSync(path.join(stage,'candidate-host-audit.json'))),allAlphaAndEllipseAndCloudAndGuttersExact:true};
const files=[];
function adapt(name,transform){
  const sourcePath=path.join(repo,'tests',name),original=fs.readFileSync(sourcePath),changes=[];
  const baselinePath=path.join(stage,'baseline-'+name),candidatePath=path.join(stage,'candidate-'+name);fs.writeFileSync(baselinePath,original);let text=original.toString('utf8');
  function replace(beforeText,afterText,purpose){assert.equal(text.split(beforeText).length,2,purpose+' has one exact anchor');text=text.replace(beforeText,()=>afterText);changes.push({purpose,before:beforeText,after:afterText});}
  transform(replace,text);fs.writeFileSync(candidatePath,text);assert.equal(sha(fs.readFileSync(sourcePath)),sha(original));
  files.push({sourcePath,baselinePath,candidatePath,baselineHash:sha(original),candidateHash:sha(text),changes});
}
adapt('universe_flight_cloud_surfaces.test.js',replace=>{
  replace("const ATLASES = {\n  2048: '47e61b0e871129a48cbe8f814a5d629263750e16d068766c84e8beeeb057ad53',",
    "// Before enhancement57, the complete galaxy atlas was pinned to\n// 47e61b0e871129a48cbe8f814a5d629263750e16d068766c84e8beeeb057ad53.\n// The smooth disk transfer changes spiral RGB only. The bulge suite and\n// the independent c0 host audit preserve its reconstructed light and alpha;\n// cloud bytes and all existing source/suffix assertions stay exact.\nconst ATLASES = {\n  2048: '"+audit.wholeAtlasAfter+"',",
    'Refresh only the deliberately changed galaxy RGB atlas pin; retain the c0 pin and proof provenance');
});
for(const [name,style,indices] of [
  ['universe_flight_spiral_detail.test.js',0,[]],
  ['universe_flight_two_arm_detail.test.js',1,[0,3]],
  ['universe_flight_barred_detail.test.js',2,[0,1,3]],
])adapt(name,(replace,text)=>{
  const atlasMatch=text.match(/const ATLAS = (\{[\s\S]*?\n\});/);assert.ok(atlasMatch);
  const oldAtlas=new Function('return ('+atlasMatch[1]+')')();
  assert.equal(oldAtlas.core,audit.coreHashesBefore[style],name+' accepted core matches c0 before transfer');
  for(const index of indices)assert.equal(oldAtlas.tiles[index],audit.tileHashesBefore[index],name+' preserved tile matches c0');
  assert.equal(oldAtlas.gutter,audit.gutterHashes[style]);assert.equal(oldAtlas.cloud,audit.cloudHash);
  const constants="// Enhancement57 moves a small smooth RGB component to its projected disk.\n// ATLAS retains every historical pin. Independently captured current RGB\n// pins cover the same tile/core bytes; their exact c0 alpha planes, ellipse,\n// gutters and clouds remain pinned. The bulge suite checks reconstructed\n// historical RGB samples and integrals; the host audit checks every RGB pixel.\nconst CURRENT_DIFFUSE = "+JSON.stringify({tiles:audit.tileHashesAfter,core:audit.coreHashesAfter[style],alpha:alphaHashes,coreAlpha:coreAlphaHashes[style]},null,2)+";\n";
  replace('const WORLD = {',constants+'const WORLD = {','Keep historical pins and add independently generated current RGB and unchanged alpha pins');
  replace('    expect(data).toHaveLength(4194304);','    expect(data).toHaveLength(4194304);\n    for (let index = 0; index < 3; index++) expect(hash(tile(data, index).filter((_value, offset) => offset % 4 === 3))).toBe(CURRENT_DIFFUSE.alpha[index]);','Require exact c0 alpha for all three spiral tiles');
  if(indices.length)replace('    for (const index of '+JSON.stringify(indices).replaceAll(',',', ')+') expect(hash(tile(data, index))).toBe(ATLAS.tiles[index]);',
    '    for (const index of '+JSON.stringify(indices).replaceAll(',',', ')+') expect(hash(tile(data, index))).toBe(index === 3 ? ATLAS.tiles[index] : CURRENT_DIFFUSE.tiles[index]);','Refresh only intentionally transferred spiral RGB and retain the exact old elliptical pin');
  replace('    expect(core).toHaveLength(16768); expect(hash(new Uint8Array(core))).toBe(ATLAS.core);',
    '    expect(core).toHaveLength(16768); expect(hash(new Uint8Array(core))).toBe(CURRENT_DIFFUSE.core);\n    expect(hash(new Uint8Array(core).filter((_value, offset) => offset % 4 === 3))).toBe(CURRENT_DIFFUSE.coreAlpha);','Keep full core byte coverage after the RGB transfer and pin its exact old alpha separately');
  if(style===0){
    replace('    expect(buffers.get(surfaceBuffer).subarray(4608)).toEqual(originalSurface.subarray(4608));',
      "    const cornerStart = galaxySurfaceFloats('galaxy', WORLD.galaxy.surfaceFloats);\n    expect(buffers.get(surfaceBuffer).subarray(cornerStart)).toEqual(originalSurface.subarray(cornerStart));",'Preserve the fixed corner suffix at its actual offset after the appended disk');
    replace('    expect(projectedUpdates.length).toBeGreaterThan(0);','    expect(projectedUpdates.length).toBeGreaterThan(0);\n    const projectedKinds = new Set();','Require both projected presentation kinds while preserving fixed source prefix');
    replace('      expect(update.buffer).toBe(surfaceBuffer); expect(update.offset).toBe(2304 * 4);\n      expect(update.data).toHaveLength(2304); expect(update.data.every(Number.isFinite)).toBe(true);',
      '      expect(update.buffer).toBe(surfaceBuffer); expect([2304 * 4, 4608 * 4]).toContain(update.offset);\n      projectedKinds.add(update.offset);\n      expect(update.data).toHaveLength(2304); expect(update.data.every(Number.isFinite)).toBe(true);\n      for (let offset = 5; offset < update.data.length; offset += 6) {\n        if (update.offset === 4608 * 4) expect(update.data[offset]).toBeLessThan(0);\n        else expect(update.data[offset]).toBeGreaterThanOrEqual(1);\n      }',
      'Permit only exact bulge/disk ranges and require their distinct positive/negative classes');
    replace('    expect(textureUploads).toHaveLength(2); expect(resources()).toEqual(objects);\n  });\n\n  it(\'keeps physical viewing uniforms',
      '    expect([...projectedKinds].sort((a, b) => a - b)).toEqual([2304 * 4, 4608 * 4]);\n    expect(textureUploads).toHaveLength(2); expect(resources()).toEqual(objects);\n  });\n\n  it(\'keeps physical viewing uniforms',
      'Require both exact projected ranges without relaxing texture, resource, or paused-surface checks');
  }
});
assert.equal(sha(fs.readFileSync(path.join(stage,'candidate-renderer.js'))),candidateHash);assert.equal(sha(fs.readFileSync(path.join(repo,'stem_lab/universe_flight_scene.js'))),candidateHash);
fs.writeFileSync(path.join(stage,'candidate-atlas-pin-audit.json'),JSON.stringify(audit,null,2));
fs.writeFileSync(path.join(stage,'candidate-atlas-test-patch-manifest.json'),JSON.stringify({completed:true,baselineRendererHash:baselineHash,candidateRendererHash:candidateHash,actualBuilderPath:__filename,actualBuilderHash:sha(fs.readFileSync(__filename)),auditPath:path.join(stage,'candidate-atlas-pin-audit.json'),auditHash:sha(fs.readFileSync(path.join(stage,'candidate-atlas-pin-audit.json'))),files,productionWrites:false},null,2));
console.log(JSON.stringify({staged:true,wholeAtlasAfter:audit.wholeAtlasAfter,tileHashesAfter:audit.tileHashesAfter,coreHashesAfter:audit.coreHashesAfter,alphaHashes,coreAlphaHashes,files:files.map(({candidatePath,baselineHash,candidateHash,changes})=>({candidatePath,baselineHash,candidateHash,changes:changes.length}))}));
