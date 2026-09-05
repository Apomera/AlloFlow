import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),E=require('../desktop/mcp/remediation_epub_validation.cjs');
const assertion=outcome=>({'@type':'earl:assertion','earl:result':{'earl:outcome':outcome}});
const ace=(outcome,children)=>({'@type':'earl:report','earl:result':{'earl:outcome':outcome},assertions:children});
it('parses Ace native outcomes and nested findings, preserving contradictory failures',()=>{
 expect(E.parseAce(ace('pass',[assertion('pass')]))).toMatchObject({status:'passed',failures:0,assertions:1});
 expect(E.parseAce(ace('pass',[{'@type':'earl:assertion',assertions:[assertion('fail'),assertion('cantTell')]}]))).toMatchObject({status:'failed',failures:1,reviewFindings:1,assertions:2});
 expect(E.parseAce(ace('cantTell',[assertion('earl:passed')]))).toMatchObject({status:'review-required'});
});
it('rejects empty, malformed and unrecognized Ace reports',()=>{
 for(const report of [{},ace('pass',[]),ace('unknown',[assertion('pass')]),{'@type':'earl:report','earl:result':{'earl:outcome':'pass'}}])expect(()=>E.parseAce(report)).toThrow();
});
it('distinguishes EPUBCheck errors, warnings and incomplete counts',()=>{
 const report={checker:{nError:0,nFatal:0,nWarning:0},messages:[]};expect(E.parseEpubcheck(report).status).toBe('passed');
 expect(E.parseEpubcheck({...report,checker:{...report.checker,nWarning:1}}).status).toBe('review-required');
 expect(E.parseEpubcheck({...report,checker:{...report.checker,nFatal:1}}).status).toBe('failed');
 expect(()=>E.parseEpubcheck({...report,checker:{nError:0}})).toThrow();
});
it('cancels a validator before launch and terminates a running child',async()=>{
 const stopped=new AbortController();stopped.abort();await expect(E.run(process.execPath,['-e','process.exit(0)'],{signal:stopped.signal})).rejects.toMatchObject({code:'ALLOFLOW_VALIDATION_CANCELLED'});
 const active=new AbortController(),pending=E.run(process.execPath,['-e','setInterval(()=>{},1000)'],{signal:active.signal});setTimeout(()=>active.abort(),100);await expect(pending).rejects.toMatchObject({code:'ALLOFLOW_VALIDATION_CANCELLED'});
},15000);
it('enforces a bounded validator runtime',async()=>{await expect(E.run(process.execPath,['-e','setInterval(()=>{},1000)'],{timeoutMs:100})).rejects.toThrow('timed out');},15000);
it('reports missing runtimes as unavailable and survives a failed scratch cleanup',async()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'alloflow-epub-'));const epub=path.join(dir,'sample.epub');fs.writeFileSync(epub,'PK fixture');
 const prevJar=process.env.ALLOFLOW_MCP_EPUBCHECK_JAR;process.env.ALLOFLOW_MCP_EPUBCHECK_JAR=path.join(dir,'missing.jar');
 const realRm=fs.rmSync;let rmCalls=0;fs.rmSync=(...a)=>{rmCalls++;throw Object.assign(Error('EPERM fixture'),{code:'EPERM'});};
 const logs=[];let result;
 try{result=await E.validate(epub,{stateDir:dir,resolveChromium:()=>({installed:false}),onLog:m=>logs.push(m)});}
 finally{fs.rmSync=realRm;if(prevJar===undefined)delete process.env.ALLOFLOW_MCP_EPUBCHECK_JAR;else process.env.ALLOFLOW_MCP_EPUBCHECK_JAR=prevJar;}
 expect(result.status).toBe('review-required');expect(result.reviewRequired).toBe(true);expect(result.humanReviewRequired).toBe(true);
 expect(result.checks.epubcheck.status).toBe('unavailable');expect(result.checks.ace.status).toBe('unavailable');
 expect(rmCalls).toBe(1);expect(logs.some(l=>/Could not remove private validation scratch/.test(l))).toBe(true);
 expect(fs.readdirSync(dir).some(n=>n.startsWith('epub-verify-'))).toBe(true);
 realRm(dir,{recursive:true,force:true});
},15000);
