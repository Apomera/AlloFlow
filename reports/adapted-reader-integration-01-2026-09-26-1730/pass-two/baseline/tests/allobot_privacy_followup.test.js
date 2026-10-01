import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { webcrypto, createHash } from 'node:crypto';
import { loadAlloModule } from './setup.js';
let chat, Provider, apiFactory;
beforeAll(()=>{loadAlloModule('ai_backend_module.js');loadAlloModule('udl_chat_module.js');loadAlloModule('gemini_api_module.js');chat=window.AlloModules.UdlChat;Provider=window.AIProvider;apiFactory=window.AlloModules.createGeminiAPI;});
afterEach(()=>{delete window.ALLOFLOW_MANAGED_AI_POLICY;window.AlloFlowChatPrivacy.clear();localStorage.clear();vi.restoreAllMocks();vi.unstubAllGlobals();});
const harness=()=>{
 let messages=[];
 const deps={udlMessages:[{role:'user',text:'Old private question'},{role:'model',text:'Old private answer'}],history:[{type:'analysis',title:'Private title',data:{originalText:'Private source'}}],inputText:'Private editor',gradeLevel:'5th Grade',currentUiLanguage:'English',getGroupDifferentiationContext:vi.fn(()=> 'Private roster'),callGemini:vi.fn(async()=> 'Helpful answer'),warnLog:vi.fn(),setUdlMessages:update=>{messages=update(messages);}};
 return {deps,messages:()=>messages};
};
const managed=(connection,extra={})=>{window.ALLOFLOW_MANAGED_AI_POLICY={version:1,connections:[connection],allowExternalSearch:false,...extra};};
const makeApi=(transport=vi.fn(),key='synthetic',canvas=false)=>apiFactory({apiKey:key,_isCanvasEnv:canvas,GEMINI_MODELS:{default:'fixture',fallback:'fixture',vision:'fixture'},fetchWithExponentialBackoff:transport,optimizeImage:async x=>x,warnLog:vi.fn(),debugLog:vi.fn(),getAbortSignal:()=>null});
describe('ordinary Allobot context minimization',()=>{
 it('sends only the question and coaching instructions by default',async()=>{
  const h=harness();await chat.generateStandardChatResponse('Suggest a reading strategy',h.deps);
  const prompt=h.deps.callGemini.mock.calls[0][0];expect(prompt).toContain('Suggest a reading strategy');expect(prompt).not.toMatch(/Private|Old private/);expect(h.deps.getGroupDifferentiationContext).not.toHaveBeenCalled();
 });
 it('includes explicitly reviewed context once with strict bounds',async()=>{
  const h=harness();h.deps.udlMessages=Array.from({length:15},(_,i)=>({role:i%2?'model':'user',text:'Message '+i+' '+ 'x'.repeat(900)}));
  window.AlloFlowChatPrivacy.set({recent:true,excerpt:'Reviewed excerpt '+ 'z'.repeat(1700)});
  await chat.generateStandardChatResponse('Use my excerpt',h.deps);
  const prompt=h.deps.callGemini.mock.calls[0][0];expect(prompt).toContain('Reviewed excerpt');expect(prompt).toContain('Message 11');expect(prompt).not.toContain('Message 10');expect(prompt).not.toContain('z'.repeat(1501));expect(prompt).not.toContain('x'.repeat(501));
  expect(window.AlloFlowChatPrivacy.get()).toEqual({recent:false,excerpt:''});
  await chat.generateStandardChatResponse('Another question',h.deps);expect(h.deps.callGemini.mock.calls[1][0]).not.toMatch(/Reviewed excerpt|Message 11/);
 });
 it('does not persist context choices and excludes local-only/control messages',()=>{
  const storage=vi.spyOn(Storage.prototype,'setItem');window.AlloFlowChatPrivacy.set({recent:true,excerpt:'Private choice'});
  const ctx=window.AlloFlowChatPrivacy.context(window.AlloFlowChatPrivacy.consume(),[{role:'user',text:'Local private',localOnly:true},{role:'model',text:'Plan details',operationKind:'command-plan'},{role:'model',text:'Hello',isWelcome:true},{role:'model',text:'Relevant reply'}],'Next');
  expect(ctx).toContain('Relevant reply');expect(ctx).not.toMatch(/Local private|Plan details|Hello/);expect(storage).not.toHaveBeenCalled();
 });
 it('clears selected context even on failure and logs no question/provider body',async()=>{
  const h=harness();h.deps.callGemini.mockRejectedValue(new Error('Private student and secret API key'));window.AlloFlowChatPrivacy.set({excerpt:'Reviewed private excerpt'});
  await chat.generateStandardChatResponse('Private question',h.deps);
  expect(JSON.stringify(h.deps.warnLog.mock.calls)).not.toMatch(/Private|secret|excerpt/);expect(window.AlloFlowChatPrivacy.get().excerpt).toBe('');expect(h.messages()[0].retryText).toBe('Private question');
 });
 it('uses reviewed public topics without sending context to external search',async()=>{
  localStorage.setItem('alloflow_ai_config','{"serperApiKey":"synthetic"}');
  for(const topic of window.WebSearchProvider.publicSearchQuery.topics){expect(window.WebSearchProvider.publicSearchQuery(topic)).toBe(topic);const plan=chat.evidence.plan('Search for '+topic);expect(plan.query,topic).toBeTruthy();}
  const search=vi.spyOn(window.WebSearchProvider,'search').mockResolvedValue({results:[]});const h=harness();window.AlloFlowChatPrivacy.set({excerpt:'Private reviewed student excerpt'});
  await chat.generateStandardChatResponse('Search for cell structure',h.deps);
  expect(search).toHaveBeenCalledWith('cell structure',6,'cell structure');expect(JSON.stringify(search.mock.calls)).not.toContain('Private');
 });
});
describe('deployment-managed AI request restrictions',()=>{
 it('blocks a different provider or endpoint before network access',async()=>{
  const fetch=vi.fn();vi.stubGlobal('fetch',fetch);managed({backend:'custom',baseUrl:'https://district.test/v1',keyless:true});
  for(const cfg of [{backend:'custom',baseUrl:'https://other.test/v1'},{backend:'openai',baseUrl:'https://district.test/v1'},{backend:'custom',baseUrl:'https://district.test/v1?student=private'}])await expect(new Provider(cfg).generateText('Private prompt')).rejects.toMatchObject({code:'managed-ai-blocked'});
  expect(fetch).not.toHaveBeenCalled();
 });
 it('allows an approved endpoint and only the approved credential fingerprint',async()=>{
  vi.stubGlobal('crypto',webcrypto);const key='synthetic-district-key',digest=createHash('sha256').update(key).digest('hex');managed({backend:'custom',baseUrl:'https://district.test/v1',apiKeySha256:[digest]});
  const good=new Provider({backend:'custom',baseUrl:'https://district.test/v1/',apiKey:key});const route=vi.spyOn(good,'_openaiGenerateText').mockResolvedValue('ok');await expect(good.generateText('Question')).resolves.toBe('ok');expect(route).toHaveBeenCalledOnce();
  good.apiKey='personal-key';await expect(good.generateText('Private prompt')).rejects.toMatchObject({code:'managed-ai-blocked'});expect(route).toHaveBeenCalledOnce();
 });
 it('ignores localStorage approval and fails closed for malformed policies',async()=>{
  localStorage.setItem('ALLOFLOW_MANAGED_AI_POLICY',JSON.stringify({version:1,connections:[{backend:'custom',baseUrl:'https://other.test',keyless:true}]}));
  window.ALLOFLOW_MANAGED_AI_POLICY={version:99,connections:[]};await expect(new Provider({backend:'custom',baseUrl:'https://other.test'}).generateText('Private')).rejects.toMatchObject({code:'managed-ai-blocked'});
 });
 it('blocks external search including direct transport calls',async()=>{
  managed({backend:'custom',baseUrl:'https://district.test',keyless:true});const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
  expect((await window.WebSearchProvider.search('photosynthesis')).policyBlocked).toBe(true);await expect(window.WebSearchProvider._fetchSerperDirect('photosynthesis',3)).rejects.toMatchObject({code:'managed-ai-blocked'});
  expect((await chat.evidence.retrieve('Check UDL',{callGemini:fetch})).status).toBe('managed-disabled');expect(fetch).not.toHaveBeenCalled();
 });
 it('rejects Gemini and fallback endpoints outside the profile',async()=>{
  managed({backend:'custom',baseUrl:'https://district.test/v1',keyless:true});const transport=vi.fn(),api=makeApi(transport);
  await expect(api.callGemini('Private')).rejects.toMatchObject({code:'managed-ai-blocked'});await expect(api.callGeminiSingleAttempt('Private')).rejects.toMatchObject({code:'managed-ai-blocked'});expect(transport).not.toHaveBeenCalled();
 });
 it('requires explicit Canvas host approval rather than assuming district coverage',async()=>{
  const transport=vi.fn(async()=>({ok:true,text:async()=>JSON.stringify({candidates:[{content:{parts:[{text:'ok'}]}}]})}));const api=makeApi(transport,'host-injected',true);
  managed({backend:'gemini',baseUrl:'https://generativelanguage.googleapis.com/v1beta',keyless:true});await expect(api.callGemini('Private')).rejects.toMatchObject({code:'managed-ai-blocked'});
  window.ALLOFLOW_MANAGED_AI_POLICY.connections[0].canvasHost=true;await expect(api.callGemini('Question')).resolves.toBe('ok');expect(transport).toHaveBeenCalledOnce();
 });
 it('blocks media override/fallback paths until they have their own managed policy',async()=>{
  managed({backend:'custom',baseUrl:'https://district.test/v1',keyless:true});const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const ai=new Provider({backend:'custom',baseUrl:'https://district.test/v1',ttsProvider:'gemini',imageProvider:'gemini'});
  for(const method of ['generateImage','editImage','analyzeImage','analyzeImages','analyzeAudio','textToSpeech','checkSafety'])await expect(ai[method]('Private',[])).rejects.toMatchObject({code:'managed-ai-blocked'});
  const api=makeApi(fetch);await expect(api.callGeminiVision('Private','data','image/png')).rejects.toMatchObject({code:'managed-ai-blocked'});await expect(api.callGeminiImageEdit('Private','data')).rejects.toMatchObject({code:'managed-ai-blocked'});expect(fetch).not.toHaveBeenCalled();
 });
});

describe('credential and diagnostic minimization',()=>{
 it('keeps Gemini credentials in headers for text, media and model discovery',async()=>{
  const fetch=vi.fn(async()=>({ok:true,status:200,json:async()=>({models:[],candidates:[{content:{parts:[{text:'ok',inlineData:{data:'AA==',mimeType:'image/png'}}]}}]})}));vi.stubGlobal('fetch',fetch);
  const log=vi.fn(),ai=new Provider({backend:'gemini',apiKey:'synthetic-secret-key',debugLog:log,warnLog:log,optimizeImage:async value=>value});
  for(const action of [()=>ai.generateText('Private student prompt'),()=>ai.analyzeImage('Private student prompt','AA=='),()=>ai.analyzeAudio('Private student prompt','AA=='),()=>ai.editImage('Private student prompt','AA=='),()=>ai.listAvailableModels()])await action();
  expect(fetch.mock.calls.length).toBeGreaterThanOrEqual(5);
  for(const [url,opts] of fetch.mock.calls){expect(String(url)).not.toContain('synthetic-secret-key');expect(String(url)).not.toContain('?key=');expect(opts.headers['x-goog-api-key']).toBe('synthetic-secret-key');}
  expect(JSON.stringify(log.mock.calls)).not.toContain('Private student');
 });
 it('keeps queued Gemini speech credentials out of URLs and text out of logs',async()=>{
  const fetch=vi.fn(async()=>({ok:false,status:429}));vi.stubGlobal('fetch',fetch);const log=vi.fn();const ai=new Provider({backend:'gemini',apiKey:'synthetic-speech-key',debugLog:log,warnLog:log});
  await ai.textToSpeech('Private speech transcript');expect(fetch).toHaveBeenCalledOnce();const [url,opts]=fetch.mock.calls[0];expect(String(url)).not.toContain('synthetic-speech-key');expect(opts.headers['x-goog-api-key']).toBe('synthetic-speech-key');expect(JSON.stringify(log.mock.calls)).not.toContain('Private speech');
 });
});

it('does not follow redirects from managed AI endpoints',async()=>{
 managed({backend:'custom',baseUrl:'https://district.test',keyless:true});const transport=vi.fn(async()=>({ok:true,json:async()=>({choices:[{message:{content:'ok'}}]})}));const ai=new Provider({backend:'custom',baseUrl:'https://district.test',fetchWithRetry:transport});await ai.generateText('Question');expect(transport.mock.calls[0][1].redirect).toBe('error');
});
