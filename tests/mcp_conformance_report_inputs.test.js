// generate_conformance_report must hand the report generator the evidence it was given (2026-11-02): a compliant
// veraPDF verdict as the independent verdict (it printed "No independent veraPDF validation was run"), Equal Access
// and AI results when audit_json carries them (always "unavailable" before), check rows the report can print,
// and only a veraPDF result that validated the tagged_pdf bytes. Also: EPUB validation on a fresh state dir.
import {it,expect,afterEach} from 'vitest';
import {spawn} from 'node:child_process';
import {resolve,join} from 'node:path';
import {mkdtempSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const children=[];
afterEach(()=>{for(const c of children)c.kill();children.length=0;});
function client() {
 const server=resolve('desktop/mcp/alloflow-remediation-mcp-stdio.cjs');const driver=resolve('desktop/mcp/remediation_headless_driver.cjs');
 const dir=mkdtempSync(join(tmpdir(),'alloflow-conformance-'));const seen=join(dir,'seen.json');
 const bootstrap=`const fs=require('fs');const D=require(${JSON.stringify(driver)});D.createDriver=()=>({buildConformanceReport:async(o)=>{fs.writeFileSync(${JSON.stringify(seen)},JSON.stringify(o));return '<html></html>';},close:async()=>{}});require(${JSON.stringify(server)});`;
 const env={...process.env,ALLOFLOW_MCP_NO_KEY_FILES:'1',ALLOFLOW_MCP_STATE_DIR:join(dir,'state')};delete env.GEMINI_API_KEY;
 const child=spawn(process.execPath,['-e',bootstrap],{env,stdio:['pipe','pipe','pipe']});children.push(child);
 let seq=0,buffer='',errors='';const pending=new Map();child.stderr.on('data',d=>errors+=d);
 child.stdout.on('data',d=>{buffer+=d;let n;while((n=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,n);buffer=buffer.slice(n+1);if(!line.trim())continue;const m=JSON.parse(line);pending.get(m.id)?.(m);pending.delete(m.id);}});
 const rpc=(method,params)=>new Promise((res,rej)=>{const id=++seq;const timer=setTimeout(()=>rej(Error('RPC timed out '+errors)),20000);pending.set(id,m=>{clearTimeout(timer);res(m);});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});
 const file=(name,body)=>{const p=join(dir,name);writeFileSync(p,body);return p;};
 return {dir,file,seen:()=>JSON.parse(readFileSync(seen,'utf8')),init:()=>rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'conformance-test',version:'1'}}),
  call:async(name,args)=>{const m=await rpc('tools/call',{name,arguments:args});if(m.error)throw Error(m.error.message);if(m.result.isError)throw Error(JSON.stringify(m.result.content));return m.result.structuredContent;}};
}
const pdf=Buffer.from('%PDF-1.7\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
const sha=createHash('sha256').update(pdf).digest('hex');
const report={beforeScore:53,afterScore:98,verification:{ai:{score:100,issues:[]},axe:{score:100,totalViolations:0,totalIncomplete:0,violations:[]},
 equalAccess:{score:98,failViolations:0,potentialViolations:1,manualViolations:0,reviewFindingCount:1}}};
it('passes a compliant veraPDF verdict, Equal Access, AI and the tagged bytes to the report generator',async()=>{
 const c=client();await c.init();
 const r=await c.call('generate_conformance_report',{audit_json:c.file('report.json',JSON.stringify(report)),verapdf_json:c.file('vera.json',JSON.stringify({compliant:true,failedRules:[],passedChecks:1234,inputSha256:sha})),
  tagged_pdf:c.file('doc-tagged.pdf',pdf),output_path:join(c.dir,'out.html')});
 expect(r.pdfUaIncluded).toBe(true);
 const o=c.seen();
 expect(o.reportOpts.veraPdf).toMatchObject({compliant:true});
 expect(o.pdfUa.checks).toEqual([expect.objectContaining({status:'pass',rule:expect.stringMatching(/veraPDF/),detail:expect.stringMatching(/1234 checks passed/)})]);
 expect(o.pdfUa.summary).toMatchObject({pass:1,fail:0});
 expect(o.fixResult.secondEngineAudit).toMatchObject({score:98,failViolations:0,reviewFindingCount:1});
 expect(o.fixResult.verificationAudit).toMatchObject({score:100});
 expect(o.fixResult._aiVerificationIncomplete).toBe(false);
 expect(o.fixResult.axeAudit).toMatchObject({score:100,totalViolations:0,totalIncomplete:0});
 expect(o.fixResult).toMatchObject({beforeScore:53,afterScore:98});
 expect(Buffer.from(o.taggedPdfBase64,'base64').equals(pdf)).toBe(true);
});
it('prints failed veraPDF rules as named rows and still reads a legacy axe-only audit',async()=>{
 const c=client();await c.init();
 await c.call('generate_conformance_report',{audit_json:c.file('axe.json',JSON.stringify({totalViolations:2,violations:[{id:'x'},{id:'y'}],axeScore:80})),
  verapdf_json:c.file('vera.json',JSON.stringify({compliant:false,failedRules:[{clause:'7.21.7',testNumber:1,message:'ToUnicode missing',count:4}]})),output_path:join(c.dir,'out.html')});
 const o=c.seen();
 expect(o.pdfUa.checks[0]).toMatchObject({status:'fail',rule:'ISO 14289-1 clause 7.21.7 test 1: ToUnicode missing',detail:'4 occurrence(s)'});
 expect(o.fixResult.axeAudit).toMatchObject({score:80,totalViolations:2});
 expect(o.fixResult.secondEngineAudit).toBeUndefined();
 expect(o.fixResult._aiVerificationIncomplete).toBe(true);
 expect(o.fixResult.afterScore).toBe(80);
 expect(o.taggedPdfBase64).toBeNull();
});
it('refuses a veraPDF result that validated different bytes than tagged_pdf',async()=>{
 const c=client();await c.init();
 await expect(c.call('generate_conformance_report',{audit_json:c.file('report.json',JSON.stringify(report)),
  verapdf_json:c.file('vera.json',JSON.stringify({compliant:true,failedRules:[],inputSha256:'0'.repeat(64)})),tagged_pdf:c.file('doc-tagged.pdf',pdf),output_path:join(c.dir,'out.html')}))
  .rejects.toThrow(/inputSha256 mismatch/);
});
it('EPUB validation creates a missing state dir instead of failing at mkdtemp',async()=>{
 const E=require('../desktop/mcp/remediation_epub_validation.cjs');
 const stateDir=join(mkdtempSync(join(tmpdir(),'alloflow-epub-state-')),'not-yet-created');
 let error=null;try{await E.validate(join(stateDir,'..','missing.epub'),{stateDir});}catch(e){error=e;}
 expect(existsSync(stateDir)).toBe(true);
 expect(String(error&&error.message)).not.toMatch(/mkdtemp/);
});
