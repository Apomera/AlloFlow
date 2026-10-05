const fs=require('fs'),crypto=require('crypto'),out='reports/sky-lab-habitable-zone-2026-10-01';
const read=n=>JSON.parse(fs.readFileSync(out+'/'+n,'utf8').replace(/^\uFEFF/,''));
const scope=read('scope-verification.json'),units=read('unit-final.json'),corrected=read('browser-corrected.json'),geometry=read('phone-geometry.json'),data=read('data-provenance.json');
const hash=crypto.createHash('sha256').update(fs.readFileSync('stem_lab/stem_tool_astronomy.js','utf8').replace(/\r\n/g,'\n')).digest('hex');
if(hash!==scope.sourceSha256||!scope.scopeReconstructsBaseline||!scope.sourceMatchesMirror||!scope.syntaxValid)throw Error('Source verification mismatch');
if(!units.success||units.numFailedTests||units.numPassedTests!==178)throw Error('Unit result mismatch');
if(corrected.stats.expected!==3||corrected.stats.unexpected||corrected.stats.flaky)throw Error('Corrected browser run incomplete');
const accepted=new Map();
for(const report of ['browser-final.json','browser-corrected.json']){
 const r=read(report),walk=suites=>{for(const s of suites){for(const spec of s.specs||[])for(const t of spec.tests||[]){
  const result=t.results?.at(-1),file=(spec.file||s.file||'').replace(/\\/g,'/');
  if(t.status==='expected'&&result?.status==='passed')accepted.set(file+'::'+spec.title,{file,title:spec.title,report,status:result.status,attempts:t.results.length});
 }walk(s.suites||[]);}};walk(r.suites||[]);
}
const hz=[...accepted.values()].filter(t=>t.file.includes('astronomy-habitable-zone.spec.ts')),brightness=[...accepted.values()].filter(t=>t.file.includes('astronomy-magnitude-explorer.spec.ts'));
if(hz.length!==6||brightness.length!==6)throw Error('Browser coverage mismatch');
const overlaps=[];for(const svg of geometry.svgs)for(let i=0;i<svg.text.length;i++)for(let j=i+1;j<svg.text.length;j++){
 const a=svg.text[i],b=svg.text[j];if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)overlaps.push([svg.id,a.label,b.label]);
}
if(geometry.overflow||geometry.table.overflow||overlaps.length)throw Error('Phone geometry mismatch');
const verification={checkedOn:'2026-10-01',sourceSha256:hash,scope,
 unitChecks:{passed:178,failed:0,report:'unit-final.json',files:units.testResults.map(t=>({file:t.name.split(/[\\/]/).pop(),status:t.status,tests:t.assertionResults.length})),timing:'Completed before the final distance-axis label alignment. Calculation and interaction logic unchanged by that layout adjustment.'},
 browserScenarios:{passed:12,failed:0,habitableZone:hz,brightnessRegression:brightness,correctedRun:{report:'browser-corrected.json',stats:corrected.stats},coverage:'Unique passing scenarios across the cited reports. The original touch scenario failed on a malformed test fill value; the input was corrected from .9 to 0.9 and passed again. Published examples and the corrected phone layout also passed on the final source.'},
 phone:{widthPx:320,horizontalOverflow:false,svgTextOverlaps:0,minSvgFontPx:Math.min(...geometry.svgs.flatMap(s=>s.text.map(t=>t.font))),minTargetHeightPx:Math.min(...geometry.targets.map(t=>t.height)),catalogue:geometry.table,report:'phone-geometry.json'},
 provenance:'data-provenance.json',sourceSyntax:'passed',scopedDiffWhitespaceCheck:'passed',committed:false};
const summary={title:'Sky Lab habitable-zone explorer',checkedOn:'2026-10-01',enhancements:[
 'Replaced the text-only habitable-zone section with linked orbit and energy-balance diagrams.',
 'Added independent temperature, total luminosity, orbital distance and Bond albedo controls.',
 'Used the published one-Earth-mass conservative climate coefficients and retained their 5780 K polynomial offset.',
 'Added NASA Venus, Earth and Mars input presets with measured surface-temperature comparisons.',
 'Made chart selection accessible by keyboard and touch, added a page shortcut and preserved other saved investigations.',
 'Verified readable 320px contrast figures and a source table with visible model assumptions.'
 ],sources:data,validation:'verification.json',previews:['habitable-zone-desktop.png','habitable-zone-phone-contrast.png','habitable-zone-orbit-phone.png','habitable-zone-energy-phone.png','habitable-zone-catalog-phone.png','habitable-zone-extreme.png'],committed:false};
for(const[name,value]of[['verification.json',verification],['enhancement-summary.json',summary]]){
 const file=out+'/'+name,temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(value,null,2)+'\n');fs.renameSync(temp,file);
}
console.log(JSON.stringify({unitChecks:178,browserScenarios:12,sourceSha256:hash,phone:verification.phone,committed:false}));
