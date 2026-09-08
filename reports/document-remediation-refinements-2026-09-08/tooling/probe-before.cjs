'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=process.cwd(),dir=path.resolve('reports/document-remediation-refinements-2026-09-08/tooling');
const {main}=require(path.join(root,'dev-tools/pdf_calibration_ingest.cjs'));
const {hash}=require(path.join(root,'dev-tools/lib/pdf_calibration.cjs'));
const {runBenchmark}=require(path.join(root,'dev-tools/benchmark_document_remediation.cjs'));
const c=path.join(dir,'calibration-before');fs.mkdirSync(c,{recursive:true});
const artifact=Buffer.from('<html>Private-free fault injection fixture</html>');
const observation=JSON.parse(fs.readFileSync('tests/fixtures/pdf_calibration/synthetic_cases.json','utf8')).entries[0];
observation.evidenceKind='unreviewed';delete observation.expected;observation.artifact={sha256:hash(artifact),size:artifact.length};
for(const [name,bytes] of [['artifact.html',artifact],['observation.json',JSON.stringify(observation)],['manifest.json',JSON.stringify({schemaVersion:2,entries:[]})]])fs.writeFileSync(path.join(c,name),bytes);
const manifest=path.join(c,'manifest.json'),original=fs.readFileSync(manifest,'utf8'),write=fs.writeFileSync;
let calibrationError;
fs.writeFileSync=function(filename,data,...args){if(path.resolve(filename)===manifest){write(filename,'{"schemaVersion":2,');const error=Error('Injected partial write');error.code='ENOSPC';throw error;}return write(filename,data,...args);};
try {main(['--observation',path.join(c,'observation.json'),'--artifact',path.join(c,'artifact.html'),'--manifest',manifest],{log(){}});}catch(error){calibrationError=error.code||error.message;}finally{fs.writeFileSync=write;}
const after=fs.readFileSync(manifest,'utf8');let parseable=true;try{JSON.parse(after);}catch(_){parseable=false;}
const b=path.join(dir,'benchmark-before');fs.mkdirSync(b,{recursive:true});
const source=path.join(b,'source.pdf'),plan=path.join(b,'plan.json');fs.writeFileSync(source,'%PDF-1.4 probe');fs.writeFileSync(plan,'{}');
fs.writeFileSync(path.join(b,'manifest.json'),JSON.stringify({schemaVersion:1,corpusId:'source-disappears',cases:[{id:'removed-source',backend:'portable',sourcePath:'source.pdf',planPath:'plan.json'}]}));
(async()=>{
 let benchmarkError;
 try{await runBenchmark({mode:'local',manifest:path.join(b,'manifest.json'),trials:1,outDir:path.join(b,'output')},{execute:async()=>{fs.unlinkSync(source);return {exitCode:0,signal:null,error:null,timedOut:false,durationMs:1,stdout:JSON.stringify({ok:true,humanReviewRequired:true}),stderr:''};}});}catch(error){benchmarkError=error.code||error.message;}
 const result={calibration:{error:calibrationError,originalPreserved:original===after,manifestParseable:parseable},benchmark:{error:benchmarkError,rawResultSaved:fs.existsSync(path.join(b,'output/trials/removed-source/trial-01/result.json')),summarySaved:fs.existsSync(path.join(b,'output/benchmark-report.json'))}};
 fs.writeFileSync(path.join(dir,'probe-before.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
