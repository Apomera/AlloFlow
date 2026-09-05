// audit_two_engines must expose the per-engine status contract the driver computes
// (checks / engineErrors / scope) and must never describe a failed engine as a pass.
import {it,expect,afterEach} from 'vitest';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const children=[];
afterEach(()=>{for(const c of children)c.kill();children.length=0;});
function client(driverResult) {
 const server=resolve('desktop/mcp/alloflow-remediation-mcp-stdio.cjs');const driver=resolve('desktop/mcp/remediation_headless_driver.cjs');
 const bootstrap=`const D=require(${JSON.stringify(driver)});D.createDriver=()=>({auditWithBothEngines:async()=>(${JSON.stringify(driverResult)}),close:async()=>{}});require(${JSON.stringify(server)});`;
 const dir=mkdtempSync(join(tmpdir(),'alloflow-two-engines-'));
 const env={...process.env,ALLOFLOW_MCP_NO_KEY_FILES:'1',ALLOFLOW_MCP_STATE_DIR:join(dir,'state')};delete env.GEMINI_API_KEY;
 const child=spawn(process.execPath,['-e',bootstrap],{env,stdio:['pipe','pipe','pipe']});children.push(child);
 let seq=0,buffer='',errors='';const pending=new Map();child.stderr.on('data',d=>errors+=d);
 child.stdout.on('data',d=>{buffer+=d;let n;while((n=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,n);buffer=buffer.slice(n+1);if(!line.trim())continue;const m=JSON.parse(line);pending.get(m.id)?.(m);pending.delete(m.id);}});
 const rpc=(method,params)=>new Promise((res,rej)=>{const id=++seq;const timer=setTimeout(()=>rej(Error('RPC timed out '+errors)),20000);pending.set(id,m=>{clearTimeout(timer);res(m);});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});
 const html=join(dir,'page.html');writeFileSync(html,'<!doctype html><html lang="en"><body><p>x</p></body></html>');
 return {html,init:()=>rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'two-engines-test',version:'1'}}),
  call:async(name,args)=>{const m=await rpc('tools/call',{name,arguments:args});if(m.error)throw Error(m.error.message);if(m.result.isError)throw Error(JSON.stringify(m.result.content));return m.result.structuredContent;}};
}
const axe={score:100,violations:0,incomplete:0,ids:[]};
it('passes the per-engine checks, engineErrors and scope through to the MCP result',async()=>{
 const c=client({checks:{axe:{status:'passed',findings:0,reviewFindings:0},equalAccess:{status:'passed',findings:0,reviewFindings:0}},scope:'static HTML; live scripts and interactions are not exercised',
  axe,equalAccess:{score:100,failViolations:0,reviewFindingCount:0,ids:[]},equalAccessError:null,engineErrors:{},onlyAxe:[],onlyEqualAccess:[]});
 await c.init();const r=await c.call('audit_two_engines',{file_path:c.html});
 expect(r.checks).toMatchObject({axe:{status:'passed'},equalAccess:{status:'passed'}});expect(r.engineErrors).toEqual({});expect(r.scope).toMatch(/static HTML/);expect(r.disagreements).toBe(0);
});
it('reports a failed engine as unavailable and refuses to call the result cross-validated',async()=>{
 const c=client({checks:{axe:{status:'passed',findings:0,reviewFindings:0},equalAccess:{status:'unavailable',findings:null,reviewFindings:null}},scope:'static HTML; live scripts and interactions are not exercised',
  axe,equalAccess:null,equalAccessError:'engine crashed',engineErrors:{equalAccess:'engine crashed'},onlyAxe:[],onlyEqualAccess:[]});
 await c.init();const r=await c.call('audit_two_engines',{file_path:c.html});
 expect(r.checks.equalAccess.status).toBe('unavailable');expect(r.engineErrors.equalAccess).toBe('engine crashed');expect(r.note).toMatch(/SINGLE-engine/);
});
it('derives the contract itself when an older driver omits it, and names axe when axe is the engine that failed',async()=>{
 const c=client({axe:{score:null,violations:null,incomplete:null,ids:[]},equalAccess:{score:90,failViolations:1,reviewFindingCount:0,ids:['x']},equalAccessError:null,engineErrors:{axe:'launch failed'},onlyAxe:[],onlyEqualAccess:['x']});
 await c.init();const r=await c.call('audit_two_engines',{file_path:c.html});
 expect(r.checks.axe.status).toBe('unavailable');expect(r.checks.equalAccess.status).toBe('failed');expect(r.note).toMatch(/axe-core failed to run/);
});
