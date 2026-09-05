// Optional Streamable HTTP transport: same dispatcher as stdio, bearer-token gated, loopback only.
import {it,expect,afterEach} from 'vitest';
import {spawn} from 'node:child_process';
import {resolve} from 'node:path';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import http from 'node:http';
const children=[];
afterEach(()=>{for(const c of children)c.kill();children.length=0;});
const TOKEN='test-token-0123456789abcdef';
function startHttpServer(extraEnv={}) {
 const server=resolve('desktop/mcp/alloflow-remediation-mcp-stdio.cjs');const dir=mkdtempSync(join(tmpdir(),'alloflow-http-'));
 const env={...process.env,ALLOFLOW_MCP_NO_KEY_FILES:'1',ALLOFLOW_MCP_STATE_DIR:join(dir,'state'),ALLOFLOW_MCP_HTTP_PORT:'0',ALLOFLOW_MCP_HTTP_TOKEN:TOKEN,...extraEnv};delete env.GEMINI_API_KEY;
 const child=spawn(process.execPath,[server],{env,stdio:['pipe','pipe','pipe']});children.push(child);
 let stderr='';
 const port=new Promise((res,rej)=>{const t=setTimeout(()=>rej(Error('no listen line: '+stderr)),60000);child.stderr.on('data',d=>{stderr+=d;const m=/http transport listening on http:\/\/127\.0\.0\.1:(\d+)\/mcp/.exec(stderr);if(m){clearTimeout(t);res(Number(m[1]));}});});
 return {child,port,stderr:()=>stderr};
}
function post(port,body,{token=TOKEN,path='/mcp',headers={}}={}) {
 return new Promise((res,rej)=>{const data=typeof body==='string'?body:JSON.stringify(body);
  const req=http.request({host:'127.0.0.1',port,path,method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json, text/event-stream',...(token?{Authorization:'Bearer '+token}:{}),...headers}},r=>{let b='';r.on('data',d=>b+=d);r.on('end',()=>res({status:r.statusCode,headers:r.headers,body:b&&/json/.test(String(r.headers['content-type']))?JSON.parse(b):b||null}));});
  req.on('error',rej);req.end(data);});
}
it('answers initialize, tools/list and tools/call over HTTP with the same registry as stdio',async()=>{
 const s=startHttpServer();const port=await s.port;
 const init=await post(port,{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'http-test',version:'1'}}});
 expect(init.status).toBe(200);expect(init.body.result.serverInfo.name).toBe('alloflow-remediation');expect(init.headers['mcp-session-id']).toMatch(/[0-9a-f-]{36}/);
 const note=await post(port,{jsonrpc:'2.0',method:'notifications/initialized'});expect(note.status).toBe(202);
 const list=await post(port,{jsonrpc:'2.0',id:'abc',method:'tools/list'});expect(list.status).toBe(200);expect(list.body.id).toBe('abc');expect(list.body.result.tools.length).toBeGreaterThan(30);
 const call=await post(port,{jsonrpc:'2.0',id:7,method:'tools/call',params:{name:'document_narration_voices',arguments:{language:'es-MX'}}});
 expect(call.status).toBe(200);expect(call.body.result.isError).toBe(false);expect(call.body.result.structuredContent.voices[0].voiceId).toBe('es_MX-ald-medium');
 const batch=await post(port,[{jsonrpc:'2.0',id:8,method:'ping'},{jsonrpc:'2.0',id:9,method:'ping'}]);expect(batch.status).toBe(200);expect(batch.body.map(r=>r.id).sort()).toEqual([8,9]);
 const caps=await post(port,{jsonrpc:'2.0',id:10,method:'tools/call',params:{name:'remediation_capabilities',arguments:{}}});
 expect(caps.body.result.structuredContent.transports).toMatchObject({stdio:true,http:{enabled:true,listening:true,port,endpoint:'http://127.0.0.1:'+port+'/mcp'}});
},90000);
it('rejects missing or wrong tokens, foreign origins and unknown paths, and accepts the path-token form',async()=>{
 const s=startHttpServer();const port=await s.port;const ping={jsonrpc:'2.0',id:1,method:'ping'};
 expect((await post(port,ping,{token:null})).status).toBe(401);
 expect((await post(port,ping,{token:'wrong-token-0123456789abcdef'})).status).toBe(401);
 expect((await post(port,ping,{headers:{Origin:'https://evil.example'}})).status).toBe(403);
 expect((await post(port,ping,{path:'/other'})).status).toBe(404);
 expect((await post(port,ping,{token:null,path:'/mcp/'+TOKEN})).status).toBe(200);
 expect((await post(port,'{not json',{})).status).toBe(400);
},90000);
it('refuses a non-loopback bind unless explicitly allowed',async()=>{
 const s=startHttpServer({ALLOFLOW_MCP_HTTP_HOST:'0.0.0.0'});
 await new Promise(r=>setTimeout(r,4000));
 expect(s.stderr()).toMatch(/refusing to bind HTTP transport to 0\.0\.0\.0/);
 expect(s.stderr()).not.toMatch(/http transport listening/);
},30000);
