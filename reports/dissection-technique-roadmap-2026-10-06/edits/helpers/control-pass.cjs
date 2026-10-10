const fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib'),vm=require('vm');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',scratch=__dirname,report=path.join(repo,'reports/dissection-technique-roadmap-2026-10-06');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const source='stem_lab/stem_tool_dissection.js',mirror='desktop/web-app/public/'+source,unit='tests/dissection_lab_improvements.test.js',browser='tests/e2e/dissection-technique-roadmap.spec.ts';
const baseline=JSON.parse(fs.readFileSync(path.join(report,'workspace-before.json')));
function read(p){return fs.readFileSync(path.join(repo,p));}
function json(p,obj){fs.writeFileSync(path.join(report,p),JSON.stringify(obj,null,2));}
function applyEdits(old,next,edits){let value=old.toString();for(const e of edits){const a=e.old??e.before,b=e.next??e.after;if(typeof a!=='string'||typeof b!=='string')throw Error('Unrecognized edit');if(value.split(a).length!==2)throw Error('Nonunique edit '+e.name);value=value.replace(a,()=>b);}if(value!==next.toString())throw Error('Forward mismatch');for(const e of edits.slice().reverse()){const a=e.old??e.before,b=e.next??e.after;if(value.split(b).length!==2)throw Error('Nonunique reversal');value=value.replace(b,()=>a);}if(value!==old.toString())throw Error('Reverse mismatch');}
const mode=process.argv[2];
if(mode==='apply-browser'){
  const stage=path.join(scratch,'browser-work',browser),bytes=fs.readFileSync(stage);if(hash(bytes)!=='1dc64d0ae57c32ff5792a721b2ae9d2bff86ed0822f80225a2cb68d15e5b240d')throw Error('Browser stage drift');if(fs.existsSync(path.join(repo,browser)))throw Error('Browser exists');
  fs.writeFileSync(path.join(repo,browser),bytes);fs.writeFileSync(path.join(report,'edits/browser-created.ts.gz'),zlib.gzipSync(bytes));json('edits/browser-creation.json',{path:browser,sha256:hash(bytes),createdAt:new Date().toISOString()});console.log('Created guarded browser fixture');
}else if(mode==='apply'){
  const oldSource=read(source),oldMirror=read(mirror),oldUnit=read(unit);
  if(hash(oldSource)!=='c9c4d0a4170a44cb7492f19c7e10823bded91490edcc7ad0998e59a814508a56'||!oldSource.equals(oldMirror)||hash(oldUnit)!=='e2468a2b7e90db503e29ca3ae5c4c4d29f663e2c61de2c875ea1a9116b3eaba1')throw Error('Baseline drift');
  const nextSource=fs.readFileSync(path.join(scratch,'renderer-next.js')),nextUnit=fs.readFileSync(path.join(scratch,'unit-work/unit-next.js'));
  if(hash(nextSource)!=='b522924b06bd29c8b58e0c1e1b155a57beb7215114bd7f452a2e1076c332c7a8'||hash(nextUnit)!=='3dd0b7306ccb79d313a21f6f8ce068b31dce8d8d50682314a3f9a8d151b6fede')throw Error('Candidate drift');
  const sourceReceipt=JSON.parse(fs.readFileSync(path.join(scratch,'renderer-edits.json'))),unitReceipt=JSON.parse(fs.readFileSync(path.join(scratch,'unit-work/unit-edits.json')));
  applyEdits(oldSource,nextSource,sourceReceipt.edits||sourceReceipt);applyEdits(oldUnit,nextUnit,unitReceipt.edits||unitReceipt);
  new vm.Script(nextSource.toString());require(path.join(repo,'node_modules/acorn')).parse(nextUnit.toString(),{ecmaVersion:'latest',sourceType:'module'});
  fs.writeFileSync(path.join(repo,source),nextSource);fs.writeFileSync(path.join(repo,mirror),nextSource);fs.writeFileSync(path.join(repo,unit),nextUnit);
  json('edits/renderer-edits.json',sourceReceipt);json('edits/unit-edits.json',unitReceipt);
  fs.writeFileSync(path.join(report,'edits/renderer-final.js.gz'),zlib.gzipSync(nextSource));fs.writeFileSync(path.join(report,'edits/unit-final.js.gz'),zlib.gzipSync(nextUnit));
  json('edits/apply-receipt.json',{at:new Date().toISOString(),source:hash(nextSource),unit:hash(nextUnit),exactReversal:true,syntax:true,mirrorEqual:true});console.log('Applied source, mirror and guarded unit append');
}else if(mode==='prepare-runner'){
  let src=fs.readFileSync(path.join(repo,'reports/dissection-scenario-clarity-2026-10-06/edits/helpers/run-scenario.cjs'),'utf8');
  src=src.replaceAll('dissection-scenario-clarity-2026-10-06','dissection-technique-roadmap-2026-10-06').replaceAll('.diss-scenario-20261006','.diss-roadmap-20261006');
  src=src.replace("'baseline,scenario,unit-main,unit-axe,study,view'","'baseline,roadmap,unit-main,unit-axe,scenario,study,view'").replace("['baseline','scenario','unit-main','unit-axe','study','view']","['baseline','roadmap','scenario','unit-main','unit-axe','study','view']");
  src=src.replace("'tests/e2e/dissection-scenario-clarity.spec.ts'];","'tests/e2e/dissection-scenario-clarity.spec.ts','tests/e2e/dissection-technique-roadmap.spec.ts'];");
  src=src.replace("mode==='tools'?'tests/e2e/dissection-tools-cohesion.spec.ts':","mode==='baseline'||mode==='roadmap'?'tests/e2e/dissection-technique-roadmap.spec.ts':");
  src=src.replace("'scenario clarity layout'","'technique roadmap .* remains readable'");
  src=src.replace("DISSECTION_SCENARIO_CLARITY_OUTPUT:path.join(out,'captures'),DISSECTION_SCENARIO_CLARITY_BASELINE:mode==='baseline'?'1':'0'","DISSECTION_SCENARIO_CLARITY_OUTPUT:path.join(out,'captures'),DISSECTION_SCENARIO_CLARITY_BASELINE:'0',DISSECTION_TECHNIQUE_ROADMAP_OUTPUT:path.join(out,'captures'),DISSECTION_TECHNIQUE_ROADMAP_BASELINE:mode==='baseline'?'1':'0'");
  new vm.Script(src);fs.writeFileSync(path.join(scratch,'run-roadmap.cjs'),src);console.log('Prepared sequential single-worker runner');
}else if(mode==='status'){
  for(const name of fs.readdirSync(report).filter(n=>/^sequence-.*json$/.test(n)))console.log(name,fs.readFileSync(path.join(report,name),'utf8'));
  const suites=fs.readdirSync(report,{withFileTypes:true}).filter(d=>d.isDirectory()&&/^(baseline|roadmap|unit|scenario|study|view)/.test(d.name));
  for(const d of suites){const p=path.join(report,d.name);for(const f of ['stdout.log','stderr.log'])if(fs.existsSync(path.join(p,f)))console.log(d.name+'/'+f,fs.readFileSync(path.join(p,f),'utf8').slice(-4500));}
}else if(mode==='inspect-baseline')console.log(JSON.stringify(baseline,null,2));else throw Error('Mode');
