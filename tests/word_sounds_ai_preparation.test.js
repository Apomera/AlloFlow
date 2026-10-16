// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';
import { React } from './helpers/word_sounds_harness.js';

const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act, Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const source = readFileSync('word_sounds_setup_source.jsx', 'utf8');
const section = (start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b < a) throw Error('Missing production boundary: ' + start);
  return source.slice(a, b);
};
const helperSource = section('function parseWordSoundsAnalysis(', 'const WordSoundsGenerator =');
const { parse, useTopic } = new Function('React', helperSource + '; return {parse:parseWordSoundsAnalysis,useTopic:useWordSoundsAiTopic};')(React);
const preparationLoop = section('             for (let i = 0; i < wordsToProcess.length; i++) {', '             // Flag generated words');
const prepare = new Function('env', `
  const {wordsToProcess, processed, preloadedMap, isGenerationActive, wordSoundsLanguage, gradeLevel, packIsEnglish,
    signal, awaitGeneration, callImagen, effectiveImageTheme, callGemini, espeakPackPhonemes, estimatePackPhonemes,
    derivePackRhyme, isUnusableAsPhonicsWord, setGeneratedCount, warnLog, parseWordSoundsAnalysis} = env;
  return (async () => { ${preparationLoop} return processed; })();
`);
function generation(response, selected = 'cat') {
  const env = { wordsToProcess: [selected], processed: [], preloadedMap: {}, isGenerationActive: () => true,
    wordSoundsLanguage: 'en', gradeLevel: 'K', packIsEnglish: true, signal: new AbortController().signal,
    awaitGeneration: value => value, effectiveImageTheme: '',
    callGemini: vi.fn().mockResolvedValue(JSON.stringify(response)), callImagen: vi.fn().mockResolvedValue('image:cat'),
    espeakPackPhonemes: vi.fn().mockResolvedValue(['k','a','t']), estimatePackPhonemes: () => [],
    derivePackRhyme: () => '', isUnusableAsPhonicsWord: () => false, setGeneratedCount: () => {}, warnLog: vi.fn(),
    parseWordSoundsAnalysis: parse };
  return { env, run: () => prepare(env) };
}

describe('generated analysis belongs to the selected word', () => {
  it.each([{word:'dog',phonemes:['d','o','g'],imagePrompt:'A dog'}, {}, {word:null}, [], null])(
    'rejects mismatched or missing identity before generating images: %j', async response => {
      const fixture = generation(response);
      const words = await fixture.run();
      expect(words).toMatchObject([{word:'cat',targetWord:'cat',phonemes:['k','a','t'],_phonemeSource:'espeak'}]);
      expect(fixture.env.callImagen).not.toHaveBeenCalled();
      expect(fixture.env.espeakPackPhonemes).toHaveBeenCalledWith('cat','en');
      expect(words[0].definition).toBeUndefined();
    });

  it('accepts case and whitespace equivalents while preserving the selected spelling', async () => {
    const fixture = generation({word:' CAT ',phonemes:['k','a','t'],definition:'A cat'});
    expect(await fixture.run()).toMatchObject([{word:'cat',targetWord:'cat',definition:'A cat',_phonemeSource:'gemini'}]);
    expect(fixture.env.callImagen).toHaveBeenCalledTimes(1);
    expect(fixture.env.espeakPackPhonemes).not.toHaveBeenCalled();
  });

  it('accepts canonically equivalent accented spelling without accepting another word', () => {
    expect(parse(JSON.stringify({word:'re\u0301sume\u0301'}),'résumé').word).toBe('résumé');
    expect(() => parse(JSON.stringify({word:'resume'}),'résumé')).toThrow(/does not match/);
  });
});

const markup = section('<div className={`p-3 rounded-xl border-2 transition-all ${includeAI', '\n                            </div>\n                            <div className="space-y-3');
const hostCode = transformSync(`return function Host({callGemini,capture,language='en',gradeLevel='K',range={min:1,max:4}}) {
  const [includeAI,setIncludeAI]=React.useState(true), [aiTopic,setAiTopic]=React.useState('Ocean');
  const aiSuggestions=useTopic({enabled:includeAI,topic:aiTopic,language,gradeLevel,syllableRange:range,callGemini,warnLog:()=>{}});
  const {busy:isAiGenerating,generate:handleAiGenerate}=aiSuggestions;
  const tf=(_key,fallback)=>fallback, t=key=>key, Check=()=>null, Sparkles=()=>null;
  capture({includeAI,aiTopic,...aiSuggestions});
  return (${markup});
}`, {configFile:false,babelrc:false,parserOpts:{allowReturnOutsideFunction:true},plugins:['@babel/plugin-transform-react-jsx']}).code;
const Host = new Function('React','useTopic',hostCode)(React,useTopic);
const deferred = () => {let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
let root, container, state, props;
const render = async changes => {props={...props,...changes};await act(async()=>root.render(React.createElement(Host,props)));};
const button = name => [...container.querySelectorAll('button')].find(item=>item.textContent===name);
const click = name => act(async()=>button(name).click());
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
  container=document.createElement('div');document.body.appendChild(container);root=createRoot(container);
  props={capture:value=>{state=value;}};
});
afterEach(() => {if(root)act(()=>root.unmount());container.remove();vi.unstubAllGlobals();});

describe('topic suggestions respect the current teacher choices', () => {
  it('ignores a late response after the source is switched off in the actual control', async () => {
    const request=deferred(), provider=vi.fn(()=>request.promise);
    await render({callGemini:provider});await click('Go');
    await act(async()=>{
      container.querySelector('input[type="checkbox"]').click();
      request.resolve('fish, crab');
    });
    expect(provider.mock.calls[0][5].aborted).toBe(true);
    expect(state).toMatchObject({includeAI:false,terms:[],busy:false});
    expect(container.querySelector('input[type="checkbox"]').checked).toBe(false);
  });

  it('cancels an old topic immediately and preserves a newer pending request', async () => {
    const first=deferred(), second=deferred(), provider=vi.fn().mockImplementationOnce(()=>first.promise).mockImplementationOnce(()=>second.promise);
    await render({callGemini:provider});await click('Go');
    await act(async()=>Simulate.change(container.querySelector('input:not([type="checkbox"])'),{target:{value:'Space'}}));
    await click('Go');
    await act(async()=>first.resolve('fish, crab'));
    expect(state).toMatchObject({aiTopic:'Space',terms:[],busy:true});
    await act(async()=>second.resolve('moon, sun'));
    expect(state).toMatchObject({terms:['moon','sun'],busy:false});
  });

  it.each([{language:'es'},{gradeLevel:'2'},{range:{min:2,max:4}}])('ignores obsolete response after configuration changes: %j', async changes => {
    const request=deferred(), provider=vi.fn(()=>request.promise);
    await render({callGemini:provider});await click('Go');await render(changes);
    await act(async()=>request.resolve('fish, crab'));
    expect(state).toMatchObject({terms:[],busy:false});
    expect(provider.mock.calls[0][5].aborted).toBe(true);
  });

  it('releases a cancelled request even if its provider never settles, and accepts a fresh request', async () => {
    const pending=deferred(), provider=vi.fn().mockImplementationOnce(()=>pending.promise).mockResolvedValueOnce('moon, sun');
    await render({callGemini:provider});await click('Go');await click('Cancel generation');await click('Go');
    expect(state).toMatchObject({terms:['moon','sun'],busy:false});
    await act(async()=>pending.resolve('fish'));
    expect(state.terms).toEqual(['moon','sun']);
  });

  it('does not expose stale results when changed props and a response arrive in the same render batch', async () => {
    const request=deferred();
    await render({callGemini:()=>request.promise});await click('Go');
    await act(async()=>{
      props={...props,gradeLevel:'2'};
      root.render(React.createElement(Host,props));
      request.resolve('fish, crab');
    });
    expect(state).toMatchObject({terms:[],busy:false});
  });

  it('keeps the previous list after failure and allows retry without mixing languages', async () => {
    const provider=vi.fn().mockResolvedValueOnce('fish, crab').mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce('niño, río');
    await render({callGemini:provider});await click('Go');await click('Go');
    expect(state).toMatchObject({terms:['fish','crab'],failed:true,busy:false});
    expect(container.querySelector('[role="status"]').textContent).toContain('previous list was kept');
    await render({language:'es'});expect(state.terms).toEqual([]);await click('Go');
    expect(state).toMatchObject({terms:['niño','río'],failed:false});
  });

  it('aborts on unmount and cannot write into a later setup instance', async () => {
    const request=deferred(), provider=vi.fn(()=>request.promise);
    await render({callGemini:provider});await click('Go');
    await act(async()=>root.unmount());root=createRoot(container);
    await render({callGemini:vi.fn()});await act(async()=>request.resolve('fish'));
    expect(provider.mock.calls[0][5].aborted).toBe(true);
    expect(state).toMatchObject({terms:[],busy:false});
  });
});
