'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const files=['stem_lab/stem_tool_flightsim.js','desktop/web-app/public/stem_lab/stem_tool_flightsim.js'].map(p=>path.join(root,p));
const source=fs.readFileSync(files[0],'utf8');
const snippets=['../vendor/skyschool-vector/decoder.js','skyschool-city-converter.js','skyschool-city-vector.js','skyschool-city-worker.js','skyschool-city-provider.js','skyschool-city-online.js','skyschool-city-start.js','skyschool-city-reveal.js','skyschool-city-coverage.js','skyschool-city-roads.js','skyschool-city-selection.js','skyschool-city-layout.js'];
const start='  // BEGIN GENERATED CITY RUNTIME',end='  // END GENERATED CITY RUNTIME';
const workerSource=require('./build_skyschool_city_worker.cjs').buildFlightCityWorkerSource();
const block=start+'\nvar FLIGHT_CITY_WORKER_SOURCE = '+JSON.stringify(workerSource)+';\n'+snippets.map(name=>fs.readFileSync(path.join(__dirname,name),'utf8').trimEnd()).join('\n\n')+'\n'+end+'\n\n';
const first=source.indexOf(start),last=source.indexOf(end);
let next;
if(first<0&&last<0) {
  const marker='  function getFlightCityTarget(value) {';
  if(source.split(marker).length!==2)throw new Error('Missing unique city runtime insertion point');
  next=source.replace(marker,()=>block+marker);
} else {
  if(first<0||last<first||source.indexOf(start,first+1)>=0)throw new Error('Invalid runtime markers');
  next=source.slice(0,first)+block+source.slice(last+end.length).replace(/^\r?\n\r?\n/,'');
}
// The facade predates the generated city block, and is shared by illustrative
// and mapped buildings. Keep its authoring source and both embeds in sync too.
const facadeStart=next.indexOf('function attachFlightCityFacade(');
const facadeEnd=next.indexOf('\n}',facadeStart)+2;
if(facadeStart<0||facadeEnd<facadeStart||next.indexOf('function attachFlightCityFacade(',facadeStart+1)>=0)throw Error('Invalid facade insertion point');
next=next.slice(0,facadeStart)+fs.readFileSync(path.join(__dirname,'skyschool-city-facade.js'),'utf8').trimEnd().replace(/\r\n/g,'\n')+next.slice(facadeEnd);
new vm.Script(next);
if(process.argv.includes('--check')) {
  if(next!==source||files.some(file=>fs.readFileSync(file,'utf8')!==next))throw new Error('Runtime embeds or simulator mirror differ');
} else {
  for(const file of files) {const temp=file+'.city-runtime-stage';fs.writeFileSync(temp,next);if(process.platform==='win32') require('node:child_process').execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"Move-Item -LiteralPath '"+temp.replace(/'/g,"''")+"' -Destination '"+file.replace(/'/g,"''")+"' -Force"],{windowsHide:true}); else fs.renameSync(temp,file);}
}
console.log(JSON.stringify({status:'verified',bytes:Buffer.byteLength(next),sha256:crypto.createHash('sha256').update(next).digest('hex'),snippets}));
