// Search query rule (2026-10-19). One rule for every search transport: any subject may be
// searched; a query that looks like it carries an email address, phone number or ID number is
// refused with a readable reason, before any network, cache or rate-limit access. A caller's own
// query always wins; without one, a short query is extracted from the prompt. The earlier topic
// allowlist (2026-09-19) is gone.
import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const policy = require('../desktop/web-app/functions/public_search_policy.js');
let provider, worker, chat;
const topics = ['The American Revolution', 'Gettysburg Address', 'birth of the universe', 'Abraham Lincoln', 'IEP goals for reading fluency',
  'medical advances in World War I', 'speed of light 299792458 m/s', 'population of India 1400000000', 'World War I 1914-1918', 'R', 'π', 'AI',
  'site:thecorestandards.org CCSS.ELA-LITERACY.RI.5.1 official standard', 'x'.repeat(500)];
const identifiers = [['avery@example.com reading level', 'email'], ['call 555-123-4567 about photosynthesis', 'phone'], ['(555) 123 4567', 'phone'],
  ['SSN 123-45-6789', 'id-number'], ['student ID 45678 grades', 'id-number'], ['pupil #12345', 'id-number']];
const denied = identifiers.map(([q]) => q);
beforeAll(async()=>{
  loadAlloModule('ai_backend_module.js');loadAlloModule('udl_chat_module.js');
  provider=window.WebSearchProvider;chat=window.AlloModules.UdlChat;
  worker=(await import('../catalog/cloudflare-worker/src/index.js')).default;
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();localStorage.removeItem('alloflow_ai_config');window.__alloSearchTrace=[];});
function canvasTransport(){
  const fetch=vi.fn(async()=>({ok:true,json:async()=>({organic:[],results:[],RelatedTopics:[]})}));
  vi.stubGlobal('fetch',fetch);
  const original={url:provider._serperProxyUrl,mode:provider._serperProxyMode,init:provider._serperInitialized,available:provider._serperAvailable};
  vi.spyOn(provider,'_isCanvas','get').mockReturnValue(true);
  provider._serperProxyUrl='https://search.example.test/search';provider._serperProxyMode='canvas-compat-get';provider._serperInitialized=true;provider._serperAvailable=true;
  return {fetch,restore:()=>{provider._serperProxyUrl=original.url;provider._serperProxyMode=original.mode;provider._serperInitialized=original.init;provider._serperAvailable=original.available;}};
}
describe('search query rule',()=>{
  it('lets any subject through, tidied, whatever the intent',()=>{
    for(const topic of topics){
      expect(policy.reason(topic),topic).toBe('');
      expect(policy(topic)).toBe(topic);
      expect(policy.forIntent(topic,'automatic')).toBe(topic);
      expect(policy.userTopic(topic)).toBe(topic);
      expect(provider.publicSearchQuery(topic)).toBe(topic);
    }
    expect(policy('  cloud\n  formation\t')).toBe('cloud formation');
    expect(policy.topics).toBeUndefined();
  });

  it('refuses identifiers, empty, control-character and over-long input, each with a reason',()=>{
    for(const [q,reason] of identifiers){
      expect(policy.reason(q),q).toBe(reason);
      expect(policy(q)).toBe('');
      expect(policy.explain(q)).toContain('so it was not sent');
    }
    for(const q of [null,{},'',' \t ']) expect(policy.reason(q)).toBe('empty');
    expect(policy.reason('x'.repeat(501))).toBe('too-long');
    expect(policy.reason('cloud' + String.fromCharCode(0) + 'formation')).toBe('control-characters');
    expect(policy.explain('The American Revolution')).toBe('');
  });

  it('sends the query unchanged through every transport, with no referrer or credentials',async()=>{
    const topic='History of jazz in New Orleans';
    const {fetch,restore}=canvasTransport();
    vi.spyOn(provider,'_serperDirectKey').mockReturnValue('synthetic-test-key');
    const firebase=window.__alloFirebase;
    try {
      await provider._fetchSerper(topic,3,'user-topic');
      expect(new URL(fetch.mock.calls[0][0]).searchParams.get('q')).toBe(topic);
      vi.spyOn(provider,'_isCanvas','get').mockReturnValue(false);
      window.__alloFirebase={getFunctionSecurityHeaders:async()=>({Authorization:'Bearer synthetic'})};
      await provider._fetchSerper(topic,3,'user-topic');
      expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({query:topic,num:3,intent:'user-topic'});
      await provider._fetchSerperDirect(topic,3);
      expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({q:topic,num:3});
      await provider._fetchSearXNG(topic,3);
      await provider._fetchDuckDuckGo(topic,3);
      for(const [url,opts] of fetch.mock.calls.slice(3)) {
        expect(new URL(url).searchParams.get('q')).toBe(topic);
        expect(opts).toMatchObject({referrerPolicy:'no-referrer',credentials:'omit'});
      }
      expect(fetch).toHaveBeenCalledTimes(5);
    } finally { restore(); window.__alloFirebase=firebase; }
  });

  it('refuses identifiers at every transport without network, trace or log disclosure',async()=>{
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
    vi.spyOn(provider,'_serperDirectKey').mockReturnValue('synthetic-test-key');
    const log=vi.spyOn(console,'log').mockImplementation(()=>{});
    for(const q of denied){
      const out=await provider.search(q,3,q);
      expect(out.privacyBlocked,q).toBe(true);expect(out.blockedReason).toBe(policy.reason(q));expect(out.contextPrompt).toContain('Do not claim web verification');
      for(const method of ['_fetchSerperDirect','_fetchSerper','_fetchSearXNG','_fetchDuckDuckGo'])
        await expect(provider[method](q,3)).rejects.toThrow('so it was not sent');
      expect(JSON.stringify(window.__alloSearchTrace)).not.toContain(q);
      expect(JSON.stringify(log.mock.calls)).not.toContain(q);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses the caller's query when given, otherwise a short extracted one, and never logs it",async()=>{
    const {fetch,restore}=canvasTransport();
    const log=vi.spyOn(console,'log').mockImplementation(()=>{});
    try {
      const prompt='Topic: "photosynthesis". Write three short paragraphs for grade 5 students that explain how plants make food from light.';
      await provider.search(prompt,3);
      expect(new URL(fetch.mock.calls[0][0]).searchParams.get('q')).toBe('photosynthesis');
      await provider.search(prompt,3,'water cycle');
      expect(new URL(fetch.mock.calls[1][0]).searchParams.get('q')).toBe('water cycle');
      expect(JSON.stringify(log.mock.calls)).not.toContain('photosynthesis');
      const blocked=await provider.search('Note: email avery@example.com about cells',3);
      expect(blocked.privacyBlocked).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(2);
    } finally { restore(); }
  });

  it('sends the tidied query with a personal key and no referrer',async()=>{
    localStorage.setItem('alloflow_ai_config','{"serperApiKey":"synthetic-test-key"}');
    const fetch=vi.fn(async()=>({ok:true,json:async()=>({organic:[]})}));vi.stubGlobal('fetch',fetch);
    await provider._fetchSerperDirect('  The   American Revolution  ',3);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({q:'The American Revolution',num:3});
    expect(fetch.mock.calls[0][1]).toMatchObject({referrerPolicy:'no-referrer',credentials:'omit'});
  });

  it('lets Allobot research any topic but not a question about a particular student',async()=>{
    expect(chat.evidence.plan('Search for The American Revolution')).toEqual({kind:'research',query:'The American Revolution'});
    expect(chat.evidence.plan('Research his role in the Civil War').query).toBeTruthy();
    expect(chat.evidence.plan('Research the Gettysburg Address').query).toBeTruthy();
    localStorage.setItem('alloflow_ai_config','{"serperApiKey":"synthetic-test-key"}');
    const search=vi.spyOn(provider,'search').mockResolvedValue({results:[]});
    await chat.evidence.retrieve('Search for Gettysburg Address');
    expect(search).toHaveBeenCalledWith('Gettysburg Address',6,'Gettysburg Address');
    search.mockClear();
    for(const question of ['Verify my student John Smith scored 40%','Research avery@example.com','Search for student ID 123456789']){
      const result=await chat.evidence.retrieve(question);
      expect(result.status,question).toBe('private-query');expect(result.query).toBeUndefined();
      expect(chat.evidence.prompt(result)).toContain('was not sent');
    }
    expect(search).not.toHaveBeenCalled();
  });

  it('refuses identifiers at the Worker before fetch, cache or rate storage, and serves ordinary topics',async()=>{
    const fetch=vi.fn(),match=vi.fn(),get=vi.fn();vi.stubGlobal('fetch',fetch);vi.stubGlobal('caches',{default:{match}});
    for(const q of denied){
      const response=await worker.fetch(new Request('https://worker.test/search?q='+encodeURIComponent(q)),{SERPER_API_KEY:'synthetic',SEARCH_RATE:{get}});
      expect(response.status).toBe(400);expect(await response.json()).toEqual({ok:false,error:'query-refused',reason:policy.reason(q)});
    }
    expect(fetch).not.toHaveBeenCalled();expect(match).not.toHaveBeenCalled();expect(get).not.toHaveBeenCalled();
    const ok=vi.fn(async()=>new Response(JSON.stringify({organic:[]}),{status:200}));vi.stubGlobal('fetch',ok);
    vi.stubGlobal('caches',{default:{match:vi.fn(async()=>null),put:vi.fn(async()=>{})}});
    const response=await worker.fetch(new Request('https://worker.test/search?q='+encodeURIComponent('The American Revolution')),{SERPER_API_KEY:'synthetic'});
    expect(response.status).toBe(200);expect(JSON.parse(ok.mock.calls[0][1].body).q).toBe('The American Revolution');
  });

  it('refuses identifiers at the Firebase proxy before sending anything to Serper',async()=>{
    const fetch=vi.fn(async()=>({ok:true,json:async()=>({organic:[]})}));
    const admin={apps:[{}],auth:()=>({verifyIdToken:async()=>({uid:'synthetic'})}),appCheck:()=>({verifyToken:async()=>({appId:'synthetic'})}),firestore:Object.assign(()=>({collection:()=>({doc:()=>({})}),runTransaction:async()=>{}}),{Timestamp:{fromMillis:()=>0}})};
    const context={exports:{},require:name=>name==='firebase-admin'?admin:name==='firebase-functions/v2/https'?{onRequest:(opts,handler)=>handler}:name==='firebase-functions/params'?{defineSecret:()=>({value:()=> 'synthetic'}),defineString:()=>({value:()=> 'https://app.test'})}:name==='./public_search_policy'?policy:name==='./web_source_fetch'?{}:require(name),process:{env:{}},fetch,console,URL,AbortController,setTimeout,clearTimeout};
    vm.runInNewContext(fs.readFileSync('desktop/web-app/functions/index.js','utf8'),context);
    for(const q of [...denied,'The American Revolution']){
      let status=200,body;
      const res={set:()=>{},status:n=>{status=n;return res;},json:b=>{body=b;}};
      const req={method:'POST',is:()=>true,body:{query:q},get:name=>({Origin:'https://app.test',Authorization:'Bearer synthetic','X-Firebase-AppCheck':'synthetic'}[name])};
      await context.exports.searchProxy(req,res);
      expect(status,q).toBe(q==='The American Revolution'?200:400);
      if(q!=='The American Revolution')expect(body.error).toBe('query-refused');
    }
    expect(fetch).toHaveBeenCalledOnce();expect(JSON.parse(fetch.mock.calls[0][1].body).q).toBe('The American Revolution');
    for(const [q,intent,expected] of [
      ['History of jazz','user-topic',200],
      ['R','user-topic',200],
      ['π','user-topic',200],
      ['History of jazz','automatic',200],
      ['clouds'+String.fromCharCode(0)+'private','user-topic',400],
      ['x'.repeat(501),'user-topic',400],
    ]) {
      let status=200;
      const res={set:()=>{},status:n=>{status=n;return res;},json:()=>{}};
      const req={method:'POST',is:()=>true,body:{query:q,intent},get:name=>({Origin:'https://app.test',Authorization:'Bearer synthetic','X-Firebase-AppCheck':'synthetic'}[name])};
      await context.exports.searchProxy(req,res);
      expect(status).toBe(expected);
    }
    expect(fetch).toHaveBeenCalledTimes(5);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({q:'History of jazz',num:5});
  });

  it('keeps the canonical rule identical to both embedded copies',()=>{
    const canonical=fs.readFileSync('desktop/web-app/functions/public_search_policy.js','utf8').replace('module.exports = publicSearchQuery;','').trim().replace(/\r\n/g,'\n');
    for(const file of ['ai_backend_module.js','catalog/cloudflare-worker/src/index.js']){
      const content=fs.readFileSync(file,'utf8');
      expect(content.split('// BEGIN PUBLIC SEARCH POLICY')[1].split('// END PUBLIC SEARCH POLICY')[0].trim().replace(/\r\n/g,'\n')).toBe(canonical);
    }
  });
});
