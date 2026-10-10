import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const policy = require('../desktop/web-app/functions/public_search_policy.js');
let provider, worker, chat;
const denied = ['avery secret reads at grade two', 'avery@example.com', 'IEP for 小明', 'site:udlguidelines.cast.org UDL Guidelines 3.0 Avery', 'photosynthesis student ID 45678', 'site:thecorestandards.org CCSS.ELA-LITERACY.AVERY.SECRET official standard', 'photosynthesis\u0000secret', 'photosynthesis' + ' '.repeat(200) + 'private', 'unsupported public topic'];
beforeAll(async()=>{
  loadAlloModule('ai_backend_module.js');loadAlloModule('udl_chat_module.js');
  provider=window.WebSearchProvider;chat=window.AlloModules.UdlChat;
  const src=fs.readFileSync('catalog/cloudflare-worker/src/index.js','utf8');
  worker=(await import(`data:text/javascript;base64,${Buffer.from(src).toString('base64')}`)).default;
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();localStorage.removeItem('alloflow_ai_config');window.__alloSearchTrace=[];});
describe('external search privacy boundary',()=>{
  it('normalizes explicit topics without applying the automatic-search vocabulary',()=>{
    for(const topic of ['R', '\u03c0', 'AI', 'How clouds form', 'photosynthesis in desert plants', 'History of jazz', '\u96f2\u306e\u5f62\u6210', 'x'.repeat(500)]) {
      expect(policy(topic)).toBe('');
      expect(policy.forIntent(topic,'user-topic')).toBe(topic);
      expect(policy.forIntent(topic,'unknown')).toBe('');
    }
    expect(policy.userTopic('  cloud\n  formation\t')).toBe('cloud formation');
    for(const topic of [null, {}, '', ' \t ', 'x'.repeat(501), 'cloud\u0000formation']) expect(policy.userTopic(topic)).toBe('');
  });

  it('transports explicit topics unchanged through every provider while defaults remain restricted',async()=>{
    const topic='History of jazz in New Orleans';
    const fetch=vi.fn(async()=>({ok:true,json:async()=>({organic:[],results:[],RelatedTopics:[]})}));
    vi.stubGlobal('fetch',fetch);
    vi.spyOn(provider,'_serperDirectKey').mockReturnValue('synthetic-test-key');
    const original={url:provider._serperProxyUrl,mode:provider._serperProxyMode};
    const canvas=vi.spyOn(provider,'_isCanvas','get').mockReturnValue(true);
    const firebase=window.__alloFirebase;
    try {
      provider._serperProxyUrl='https://search.example.test/search';
      provider._serperProxyMode='canvas-compat-get';
      await provider._fetchSerper(topic,3,'user-topic');
      expect(new URL(fetch.mock.calls[0][0]).searchParams.get('q')).toBe(topic);
      expect(new URL(fetch.mock.calls[0][0]).searchParams.get('intent')).toBe('user-topic');
      canvas.mockReturnValue(false);
      window.__alloFirebase={getFunctionSecurityHeaders:async()=>({Authorization:'Bearer synthetic'})};
      await provider._fetchSerper(topic,3,'user-topic');
      expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({query:topic,num:3,intent:'user-topic'});
      await provider._fetchSerperDirect(topic,3,'user-topic');
      expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({q:topic,num:3});
      await provider._fetchSearXNG(topic,3,'user-topic');
      await provider._fetchDuckDuckGo(topic,3,'user-topic');
      for(const [url,opts] of fetch.mock.calls.slice(3)) {
        expect(new URL(url).searchParams.get('q')).toBe(topic);
        expect(opts).toMatchObject({referrerPolicy:'no-referrer',credentials:'omit'});
      }
      for(const method of ['_fetchSerperDirect','_fetchSerper','_fetchSearXNG','_fetchDuckDuckGo'])
        await expect(provider[method](topic,3)).rejects.toThrow('approved public topic');
      expect(fetch).toHaveBeenCalledTimes(5);
    } finally {
      provider._serperProxyUrl=original.url; provider._serperProxyMode=original.mode;
      window.__alloFirebase=firebase;
    }
  });

  it('rejects arbitrary text at every transport without network or trace disclosure',async()=>{
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
    vi.spyOn(provider,'_serperDirectKey').mockReturnValue('synthetic-test-key');
    const log=vi.spyOn(console,'log').mockImplementation(()=>{});
    for(const q of denied){
      expect(policy(q)).toBe('');
      expect((await provider.search(q,3,q)).privacyBlocked).toBe(true);
      for(const method of ['_fetchSerperDirect','_fetchSerper','_fetchSearXNG','_fetchDuckDuckGo'])
        await expect(provider[method](q,3)).rejects.toThrow('approved public topic');
      expect(JSON.stringify(window.__alloSearchTrace)).not.toContain(q);
      expect(JSON.stringify(log.mock.calls)).not.toContain(q);
    }
    expect(fetch).not.toHaveBeenCalled();
  });
  it('never extracts a web query from a contextual prompt',async()=>{
    const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
    const extract=vi.spyOn(provider,'_extractSearchQuery');
    expect((await provider.search('Topic: photosynthesis. Private student Avery Secret',3)).privacyBlocked).toBe(true);
    expect(extract).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
  });
  it('sends only the canonical topic with a personal key and no referrer',async()=>{
    localStorage.setItem('alloflow_ai_config','{"serperApiKey":"synthetic-test-key"}');
    const fetch=vi.fn(async()=>({ok:true,json:async()=>({organic:[]})}));vi.stubGlobal('fetch',fetch);
    await provider._fetchSerperDirect('  PHOTOSYNTHESIS  ',3);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({q:'photosynthesis',num:3});
    expect(fetch.mock.calls[0][1]).toMatchObject({referrerPolicy:'no-referrer',credentials:'omit'});
  });
  it('preserves approved UDL and standard queries',()=>{
    for(const q of ['site:udlguidelines.cast.org UDL Guidelines 3.0 choice engagement','site:thecorestandards.org CCSS.ELA-LITERACY.RI.5.1 official standard','site:nextgenscience.org MS-LS1-1 official standard','site:thecorestandards.org 5.NF.A.1 official standard','retrieval practice'])expect(policy(q)).toBe(q);
  });
  it('blocks unsupported Allobot external research before calling a provider',async()=>{
    localStorage.setItem('alloflow_ai_config','{"serperApiKey":"synthetic-test-key"}');
    const search=vi.spyOn(provider,'search');
    const result=await chat.evidence.retrieve('Research unsupported public topic');
    expect(result.status).toBe('public-topic-required');expect(result.query).toBeUndefined();
    expect(search).not.toHaveBeenCalled();expect(chat.evidence.prompt(result)).toContain('was not sent');
  });
  it('rejects direct Worker requests before fetch, cache or rate storage',async()=>{
    const fetch=vi.fn(),match=vi.fn(),get=vi.fn();vi.stubGlobal('fetch',fetch);vi.stubGlobal('caches',{default:{match}});
    for(const q of denied){
      const response=await worker.fetch(new Request('https://worker.test/search?q='+encodeURIComponent(q)),{SERPER_API_KEY:'synthetic',SEARCH_RATE:{get}});
      expect(response.status).toBe(400);expect(await response.json()).toEqual({ok:false,error:'public-query-required'});
    }
    expect(fetch).not.toHaveBeenCalled();expect(match).not.toHaveBeenCalled();expect(get).not.toHaveBeenCalled();
  });
  it('validates authenticated Firebase requests before sending anything to Serper',async()=>{
    const fetch=vi.fn(async()=>({ok:true,json:async()=>({organic:[]})}));
    const admin={apps:[{}],auth:()=>({verifyIdToken:async()=>({uid:'synthetic'})}),appCheck:()=>({verifyToken:async()=>({appId:'synthetic'})}),firestore:Object.assign(()=>({collection:()=>({doc:()=>({})}),runTransaction:async()=>{}}),{Timestamp:{fromMillis:()=>0}})};
    const context={exports:{},require:name=>name==='firebase-admin'?admin:name==='firebase-functions/v2/https'?{onRequest:(opts,handler)=>handler}:name==='firebase-functions/params'?{defineSecret:()=>({value:()=> 'synthetic'}),defineString:()=>({value:()=> 'https://app.test'})}:name==='./public_search_policy'?policy:name==='./web_source_fetch'?{}:require(name),process:{env:{}},fetch,console,URL,AbortController,setTimeout,clearTimeout};
    vm.runInNewContext(fs.readFileSync('desktop/web-app/functions/index.js','utf8'),context);
    for(const q of [...denied,'photosynthesis']){
      let status=200,body;
      const res={set:()=>{},status:n=>{status=n;return res;},json:b=>{body=b;}};
      const req={method:'POST',is:()=>true,body:{query:q},get:name=>({Origin:'https://app.test',Authorization:'Bearer synthetic','X-Firebase-AppCheck':'synthetic'}[name])};
      await context.exports.searchProxy(req,res);
      expect(status).toBe(q==='photosynthesis'?200:400);
      if(q!=='photosynthesis')expect(body.error).toBe('public-query-required');
    }
    expect(fetch).toHaveBeenCalledOnce();expect(JSON.parse(fetch.mock.calls[0][1].body).q).toBe('photosynthesis');
    for(const [q,intent,expected] of [
      ['History of jazz','user-topic',200],
      ['R','user-topic',200],
      ['\u03c0','user-topic',200],
      ['History of jazz','automatic',400],
      ['clouds\u0000private','user-topic',400],
      ['x'.repeat(501),'user-topic',400],
    ]) {
      let status=200;
      const res={set:()=>{},status:n=>{status=n;return res;},json:()=>{}};
      const req={method:'POST',is:()=>true,body:{query:q,intent},get:name=>({Origin:'https://app.test',Authorization:'Bearer synthetic','X-Firebase-AppCheck':'synthetic'}[name])};
      await context.exports.searchProxy(req,res);
      expect(status).toBe(expected);
    }
    expect(fetch).toHaveBeenCalledTimes(4);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({q:'History of jazz',num:5});
  });
  it('keeps the canonical server policy identical to both embedded copies',()=>{
    const canonical=fs.readFileSync('desktop/web-app/functions/public_search_policy.js','utf8').replace('module.exports = publicSearchQuery;','').trim().replace(/\r\n/g,'\n');
    for(const file of ['ai_backend_module.js','catalog/cloudflare-worker/src/index.js']){
      const content=fs.readFileSync(file,'utf8');
      expect(content.split('// BEGIN PUBLIC SEARCH POLICY')[1].split('// END PUBLIC SEARCH POLICY')[0].trim().replace(/\r\n/g,'\n')).toBe(canonical);
    }
  });
});
