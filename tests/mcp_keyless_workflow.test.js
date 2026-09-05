// Protocol-level orchestration tests. The fake driver deliberately asks the client
// for work; browser/pipeline fidelity is covered by mcp_agent_bridge_e2e.
import {it,expect,afterEach,vi} from 'vitest';
import {spawn} from 'node:child_process';
import {mkdtempSync,writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
vi.setConfig({testTimeout:60000});
const children=[];
afterEach(()=>{for(const c of children)c.kill();children.length=0;});
function client(dir, fakeNarration=false, coverageReview=false, pdfOutcome=null) {
 const server=resolve('desktop/mcp/alloflow-remediation-mcp-stdio.cjs');const driver=resolve('desktop/mcp/remediation_headless_driver.cjs');
 const bootstrap=`const D=require(${JSON.stringify(driver)}); D.createDriver=()=>({remediate:async o=>{const [a,b]=await Promise.all([o.modelBridge({kind:'text',prompt:'Reply alpha'}),o.modelBridge({kind:'text',prompt:'Reply beta'})]);if(a!=='alpha'||b!=='beta')throw Error('incorrect reply');return {taggedPdfB64:${pdfOutcome ? JSON.stringify(Buffer.from('%PDF-1.7 fixture').toString('base64')) : 'null'},verificationState:'complete',taggedPdfDelivery:{ok:true,code:'verified'},contentCoverage:${coverageReview ? '{status:"review_required",reviewRequired:true,missingTokens:1}' : 'null'},runId:'fixture-'+require('crypto').randomUUID(),accessibleHtml:'<!doctype html><html lang="en"><title>Test</title><body><h1>Test</h1><p>Verified fixture</p></body></html>',afterScore:95,beforeScore:60,verdict:{level:'ready',review:[],cautions:[]},stats:{fixPasses:o.fixPasses,autoContinue:o.autoContinue,validateUa:o.validateUa}};},validatePdfUaCli:async o=>{if(${JSON.stringify(pdfOutcome)}==='error')throw Error('Fixture Java unavailable');const bytes=require('fs').readFileSync(o.filePath);return {status:${JSON.stringify(pdfOutcome)}==='pass'?'compliant':'noncompliant',failedChecks:${JSON.stringify(pdfOutcome)}==='pass'?0:2,failedRules:${JSON.stringify(pdfOutcome)}==='pass'?0:1,failedRuleSummaries:[],profile:'ua1',validatorVersion:'fixture',inputSha256:require('crypto').createHash('sha256').update(bytes).digest('hex'),inputBytes:bytes.length};},cancelActiveRun:async()=>true,close:async()=>{}});${fakeNarration ? `const N=require(${JSON.stringify(resolve('desktop/mcp/remediation_narration.cjs'))});N.narrate=async o=>{if(o.filePath.includes('broken.html'))throw Error('unsupported fixture');return {status:'completed',totalSections:1,completedSections:1,files:{}};};` : ''}require(${JSON.stringify(server)});`;
 const env={...process.env,ALLOFLOW_MCP_NO_KEY_FILES:'1',ALLOFLOW_MCP_STATE_DIR:join(dir,'state')};delete env.GEMINI_API_KEY;
 const child=spawn(process.execPath,['-e',bootstrap],{env,stdio:['pipe','pipe','pipe']});children.push(child);
 let seq=0,buffer='',errors='';const pending=new Map();child.stderr.on('data',d=>errors+=d);child.stdout.on('data',d=>{buffer+=d;let n;while((n=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,n);buffer=buffer.slice(n+1);if(!line.trim())continue;const m=JSON.parse(line);pending.get(m.id)?.(m);pending.delete(m.id);}});
 const rpc=(method,params)=>new Promise((res,rej)=>{const id=++seq;const timer=setTimeout(()=>rej(Error('RPC timed out '+errors)),20000);pending.set(id,m=>{clearTimeout(timer);res(m);});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});
 const call=async(name,args)=>{const m=await rpc('tools/call',{name,arguments:args});if(m.error)throw Error(m.error.message);if(m.result.isError)throw Error(JSON.stringify(m.result.content));return m.result.structuredContent;};
 return {rpc,call,child,init:()=>rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'workflow-test',version:'1'}})};
}
async function finish(c,id) {
 let v;for(let i=0;i<20;i++) {v=await c.call('remediation_agent_requests',{run_id:id,wait_seconds:1});if(v.status!=='running')return v;
 if(v.pendingRequests.length)v=await c.call('remediation_agent_respond_batch',{run_id:id,responses:v.pendingRequests.map(r=>({request_id:r.requestId,text:r.prompt.includes('alpha')?'alpha':'beta'})),wait_seconds:1});
 if(v.status!=='running')return v;
 }throw Error('run did not complete');
}
it('batches keyless files, validates replies atomically, applies thorough effort and resumes after restart without repeating verified work',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'alloflow-workflow-'));const inputs=join(dir,'inputs');mkdirSync(inputs);for(const n of ['a','b'])writeFileSync(join(inputs,n+'.txt'),'A synthetic document for '+n);
 let c=client(dir);await c.init();const start=await c.call('pdf_remediate_agent_start',{dir_path:inputs,output_dir:join(dir,'out'),tagged_pdf:false,effort:'thorough'});
 let v=await c.call('remediation_agent_requests',{run_id:start.runId,wait_seconds:1});expect(v.pendingRequests.length).toBe(2);
 const invalid=await c.rpc('tools/call',{name:'remediation_agent_respond_batch',arguments:{run_id:start.runId,responses:[{request_id:v.pendingRequests[0].requestId,text:'alpha'},{request_id:'missing',text:'beta'}]}});expect(invalid.error).toBeTruthy();
 v=await c.call('remediation_agent_requests',{run_id:start.runId,wait_seconds:0});expect(v.pendingRequests.length).toBe(2);
 const result=await finish(c,start.runId);expect(result.status).toBe('completed');expect(result.result.completed).toBe(2);expect(result.result.failed).toBe(0);
 expect(result.result.files[0].result.stats).toMatchObject({fixPasses:3,autoContinue:true,validateUa:true});
 await new Promise(res=>{c.child.once('exit',res);c.child.kill();});c=client(dir);await c.init();
 const saved=await c.call('remediation_agent_requests',{run_id:start.runId,wait_seconds:0});expect(saved.status).toBe('completed');
 const listed=await c.call('remediation_agent_runs',{});expect(listed.runs.some(r=>r.runId===start.runId&&r.status==='completed')).toBe(true);
 const voices=await c.call('document_narration_voices',{language:'es-MX'});expect(voices.voices).toHaveLength(1);expect(voices.voices[0].voiceId).toBe('es_MX-ald-medium');
 await c.call('remediation_agent_resume',{run_id:start.runId});const resumed=await finish(c,start.runId);expect(resumed.status).toBe('completed');expect(resumed.result.modelCallsAnswered).toBe(0);expect(resumed.result.files.every(r=>r.result.reused)).toBe(true);
});
it('recovers an interrupted run after restart and regenerates a modified source',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'alloflow-interrupted-'));const file=join(dir,'input.txt');writeFileSync(file,'First source');let c=client(dir);await c.init();
 const start=await c.call('pdf_remediate_agent_start',{file_path:file,tagged_pdf:false});await c.call('remediation_agent_requests',{run_id:start.runId,wait_seconds:1});
 await new Promise(res=>{c.child.once('exit',res);c.child.kill();});c=client(dir);await c.init();expect((await c.call('remediation_agent_requests',{run_id:start.runId,wait_seconds:0})).status).toBe('interrupted');
 await c.call('remediation_agent_resume',{run_id:start.runId});expect((await finish(c,start.runId)).status).toBe('completed');
 writeFileSync(file,'Changed source must be processed again');await c.call('remediation_agent_resume',{run_id:start.runId});const final=await finish(c,start.runId);expect(final.result.modelCallsAnswered).toBe(2);expect(final.result.reused).not.toBe(true);
});

it('narrates a folder with no model replies, excludes generated players and keeps per-file failures visible',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'alloflow-narration-folder-')),inputs=join(dir,'inputs');mkdirSync(inputs);
 for(const name of ['a.html','broken.html','c.html','a-readalong.html','a-readalong-2.html'])writeFileSync(join(inputs,name),'<html lang="en"><body><p>Fixture.</p></body></html>');
 const c=client(dir,true);await c.init();const started=await c.call('document_narrate_start',{dir_path:inputs,output_dir:join(dir,'out')});const result=await finish(c,started.runId);
 expect(result.status).toBe('completed');expect(result.result).toMatchObject({total:3,completed:2,failed:1,modelCallsAnswered:0,outcome:'completed_with_failures',failedFiles:[join(inputs,'broken.html')],retry:{tool:'remediation_agent_resume',arguments:{run_id:started.runId}}});expect(result.log.join(' ')).toContain('2 completed, 1 failed');expect(result.log.join(' ')).not.toContain('all narration sections');expect(result.result.files.find(r=>r.status==='failed').error).toMatch(/unsupported fixture/);
});

it('returns the remediation report location and does not start narration when source coverage needs review',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'alloflow-coverage-gate-')),file=join(dir,'source.txt');writeFileSync(file,'A source requiring review.');
 const c=client(dir,true,true);await c.init();const started=await c.call('pdf_remediate_agent_start',{file_path:file,output_dir:join(dir,'out'),tagged_pdf:false,narration:'natural'});const result=await finish(c,started.runId);
 expect(result.status).toBe('failed');expect(result.error).toMatch(/Source-to-HTML content coverage requires review before narration/);expect(result.error).toContain('remediation-report.json');
});

it.each(['pass','fail','error','not-run'])('binds final PDF delivery to independent evidence through MCP: %s',async outcome=>{
 const dir=mkdtempSync(join(tmpdir(),'alloflow-pdf-delivery-')),file=join(dir,'input.txt');writeFileSync(file,'Synthetic PDF delivery fixture');const c=client(dir,false,false,outcome);await c.init();
 const start=await c.call('pdf_remediate_agent_start',{file_path:file,output_dir:join(dir,'out'),tagged_pdf:true,validate_ua:outcome!=='not-run'});const done=await finish(c,start.runId);expect(done.status).toBe('completed');
 const result=Array.isArray(done.result.files) ? done.result.files[0].result : done.result;
 expect(result.pdfUa.status).toBe(outcome==='pass'?'passed':outcome==='fail'?'failed':outcome==='error'?'unavailable':'not-run');
 expect(result.reviewRequired).toBe(outcome!=='pass');expect(result.verdict.level).toBe(outcome==='pass'?'ready':'review');
 expect(result.files.taggedPdf.endsWith(outcome==='pass'?'-tagged.pdf':'-tagged-review-required.pdf')).toBe(true);expect(readFileSync(result.files.taggedPdf,'utf8')).toBe('%PDF-1.7 fixture');
 expect(readFileSync(result.files.accessibleHtml,'utf8')).toContain('Verified fixture');
 const report=JSON.parse(readFileSync(result.files.report,'utf8'));expect(report.pdfUa).toEqual(result.pdfUa);expect(report.reviewRequired).toBe(result.reviewRequired);
});
