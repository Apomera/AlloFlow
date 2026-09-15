const fs=require('node:fs');
function edit(file,before,after){let s=fs.readFileSync(file,'utf8');if(!s.includes(before))throw Error('Missing '+before);s=s.replace(before,after);const fd=fs.openSync(file,'r+');try{fs.writeSync(fd,s,0,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(s));}finally{fs.closeSync(fd);}}
edit('reports/geometry-world-refinement-2026-09-12/coastal-landscape.js','var beaconX=x1+24,beaconZ=z0-18','var beaconX=x1+27,beaconZ=z0+7');
edit('reports/geometry-world-refinement-2026-09-12/capture-coastal-preview.cjs','for(const view of views)','for(const view of (process.argv.includes("--overview-only") ? views.slice(0,1) : views))');
console.log('Separated the offshore beacon from the lesson lighthouse silhouette.');
