const fs=require('node:fs'),path=require('node:path');
for(const file of ['candidate-patch-manifest.json','driver-provenance.json','host-audit-provenance.json','original-audit-outcome.json','browser-derivation.json','native-report/analysis.json','native-report/beta-check.json']){
 const full=path.join(__dirname,file);if(!fs.existsSync(full)){console.log(JSON.stringify({file,missing:true}));continue;}
 const data=JSON.parse(fs.readFileSync(full));
 if(file==='candidate-patch-manifest.json')console.log(JSON.stringify({file,keys:Object.keys(data),replacementCount:data.replacements?.length,first:data.replacements?.[0]}));
 else if(file==='browser-derivation.json')console.log(JSON.stringify({file,keys:Object.keys(data),harnessHash:data.harnessHash}));
 else if(file.endsWith('analysis.json'))console.log(JSON.stringify({file,completed:data.completed,comparisons:data.comparisons?.map(x=>({name:x.name,total:x.totalLightRatio,outer:x.outerLightRatio})),resources:data.resources?.length,stability:data.stability?.length,near:data.nearObserver?.length,errors:data.errors}));
 else console.log(JSON.stringify({file,data}));
}
