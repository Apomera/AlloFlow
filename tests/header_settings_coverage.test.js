import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { parse } from '@babel/parser';
const require=createRequire(import.meta.url);
const React=require('../desktop/web-app/node_modules/react');
const { createRoot }=require('../desktop/web-app/node_modules/react-dom/client');
const { act }=React;
const app=readFileSync('AlloFlowANTI.txt','utf8');
const header=readFileSync('view_header_source.jsx','utf8');
const previousActEnvironment=globalThis.IS_REACT_ACT_ENVIRONMENT;
beforeAll(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=true;});
afterAll(()=>{globalThis.IS_REACT_ACT_ENVIRONMENT=previousActEnvironment;});
const roots=[];
afterEach(async()=>{for(const {root,node}of roots.splice(0)){await act(async()=>root.unmount());node.remove();}});
function block(source,start,end){const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<0)throw Error('Missing source block '+start);return source.slice(a,b);}
function line(needle){const value=app.split('\n').find(l=>l.includes(needle));if(!value)throw Error('Missing host line '+needle);return value;}
function preferenceHarness(storage){
  const code=block(app,'const SETTINGS_INITIAL_STATE =','const ADV_INITIAL_STATE =');
  const bindings=[line('const [settingsState, settingsDispatch]'),line('const { isProjectSettingsOpen, theme,'),line('const setTheme ='),line("safeSetItem('allo_theme', theme)"),line('const [focusMode, setFocusMode]'),line("safeSetItem('allo_bionic_reading'")].join('\n');
  const toggle=block(app,'  const toggleTheme = () => {','  window.AlloToggleTheme');
  return new Function('React','safeGetItem','safeSetItem',`${code}\nconst {useReducer,useState,useEffect}=React; return function Preferences(){${bindings}\n${toggle}\nreturn React.createElement('div',null,React.createElement('output',{id:'theme'},theme),React.createElement('button',{id:'cycle',onClick:toggleTheme},'Cycle'),React.createElement('button',{id:'twice',onClick:()=>{toggleTheme();toggleTheme();}},'Cycle twice'),React.createElement('button',{id:'literal',onClick:()=>setTheme('contrast')},'Contrast'),React.createElement('button',{id:'bionic','aria-pressed':focusMode,onClick:()=>setFocusMode(previous=>!previous)},'Bionic'));}`)(React,k=>storage.get(k)??null,(k,v)=>storage.set(k,String(v)));
}
async function mount(Component){const node=document.createElement('div');document.body.appendChild(node);const root=createRoot(node);roots.push({root,node});await act(async()=>root.render(React.createElement(Component)));return {root,node};}
async function unmount(mounted){await act(async()=>mounted.root.unmount());mounted.node.remove();roots.splice(roots.findIndex(value=>value.root===mounted.root),1);}
async function click(node,selector){await act(async()=>node.querySelector(selector).click());}
const elements=[];
function walk(node){if(!node||typeof node!=='object')return;if(node.type==='JSXElement')elements.push(node);for(const value of Object.values(node)){if(Array.isArray(value))value.forEach(walk);else if(value&&typeof value==='object')walk(value);}}
walk(parse(header,{sourceType:'script',plugins:['jsx']}));
function element(attribute,value){const result=elements.find(node=>node.openingElement.attributes.some(a=>a.name?.name===attribute&&a.value?.value===value));if(!result)throw Error('Missing header control '+value);return result;}
function attributeValue(node,name,scope){const attr=node.openingElement.attributes.find(a=>a.name?.name===name);if(!attr)throw Error('Missing attribute '+name);if(attr.value?.type==='StringLiteral')return attr.value.value;return vm.runInNewContext('('+header.slice(attr.value.expression.start,attr.value.expression.end)+')',scope);}
const settle=()=>new Promise(resolve=>setTimeout(resolve,0));

describe('header settings resolved state and coverage',()=>{
  it('persists the actual cycled theme and restores it after reload',async()=>{
    const storage=new Map();const first=await mount(preferenceHarness(storage));
    await click(first.node,'#cycle');expect(first.node.querySelector('#theme').textContent).toBe('dark');expect(storage.get('allo_theme')).toBe('dark');
    await unmount(first);const second=await mount(preferenceHarness(storage));expect(second.node.querySelector('#theme').textContent).toBe('dark');
    await click(second.node,'#cycle');expect(storage.get('allo_theme')).toBe('contrast');
    await click(second.node,'#cycle');expect(storage.get('allo_theme')).toBe('light');
  });
  it('restores the latest theme when the same component remounts without a script reload',async()=>{
    const storage=new Map();const Component=preferenceHarness(storage);const first=await mount(Component);
    await click(first.node,'#cycle');await unmount(first);
    const second=await mount(Component);expect(second.node.querySelector('#theme').textContent).toBe('dark');expect(storage.get('allo_theme')).toBe('dark');
  });
  it('preserves reducer batching and literal selections without serializing callbacks',async()=>{
    const storage=new Map();const {node}=await mount(preferenceHarness(storage));
    await click(node,'#twice');expect(node.querySelector('#theme').textContent).toBe('contrast');expect(storage.get('allo_theme')).toBe('contrast');
    await click(node,'#cycle');await click(node,'#literal');expect(storage.get('allo_theme')).toBe('contrast');
  });
  it('restores Bionic choice and persists both toggle directions',async()=>{
    const storage=new Map();const first=await mount(preferenceHarness(storage));
    expect(first.node.querySelector('#bionic').getAttribute('aria-pressed')).toBe('false');
    await click(first.node,'#bionic');expect(storage.get('allo_bionic_reading')).toBe('1');
    await unmount(first);const second=await mount(preferenceHarness(storage));expect(second.node.querySelector('#bionic').getAttribute('aria-pressed')).toBe('true');
    await click(second.node,'#bionic');expect(storage.get('allo_bionic_reading')).toBe('0');
  });
  it('rejects invalid stored themes and Bionic values',async()=>{
    const storage=new Map([['allo_theme','previous => next'],['allo_bionic_reading','garbage']]);const {node}=await mount(preferenceHarness(storage));
    expect(node.querySelector('#theme').textContent).toBe('light');expect(node.querySelector('#bionic').getAttribute('aria-pressed')).toBe('false');
  });
  it('exposes the actual Bionic and motion toggle states rather than icon-only cues',()=>{
    for(const [key,variable]of [['header_settings_text_bionic','focusMode'],['header_settings_anim','disableAnimations'],['header_bot_toggle','isBotVisible']]){
      const control=element('data-help-key',key);for(const value of [true,false])expect(attributeValue(control,'aria-pressed',{[variable]:value})).toBe(value);
    }
    expect(attributeValue(element('data-help-key','header_settings_anim'),'aria-describedby',{})).toBe('header-motion-scope');
  });
  it('includes selected app theme and overlay in their accessible names',()=>{
    const t=key=>key==='a11y.theme_toggle'?'Theme':'Overlay';
    expect(attributeValue(element('data-help-key','header_settings_theme'),'aria-label',{t,selectedAppThemeLabel:'High Contrast'})).toContain('High Contrast');
    expect(attributeValue(element('data-help-key','header_settings_overlay'),'aria-label',{t,selectedOverlayLabel:'Peach'})).toContain('Peach');
  });
  it('describes the existing reset scope and preserves font family/Bionic choices',()=>{
    const writes=[];const reset=block(app,'  const resetFontSize = () => {','  const getRows =');
    const run=vm.runInNewContext(`(()=>{${reset};return resetFontSize;})()`,Object.fromEntries(['setBaseFontSize','setSliderFontSize','setLineHeight','setLetterSpacing','setSelectedFont','setFocusMode'].map(key=>[key,value=>writes.push([key,value])])));
    run();expect(writes).toEqual([['setBaseFontSize',16],['setSliderFontSize',16],['setLineHeight',1.6],['setLetterSpacing',0]]);
    const resetControl=element('data-help-key','header_settings_text_reset');expect(header.slice(resetControl.start,resetControl.end)).toContain('Reset size & spacing');
  });
});

describe('header on-device voice setup recovery',()=>{
  function setup(loader){const selected=[],toasts=[];const fakeWindow={__loadKokoroTTS:loader};const callback=attributeValue(element('id','header-spoken-output-voice'),'onChange',{window:fakeWindow,setSelectedVoice:v=>selected.push(v),canUseKokoroVoicePicker:true,KOKORO_VOICES:[{id:'af_heart'}],kokoroCapability:{isIOS:false},addToast:(text,type)=>toasts.push({text,type}),t:()=>null});return {fakeWindow,selected,toasts,choose:()=>callback({target:{value:'af_heart'}})};}
  it.each(['reject','throw','false'])('clears setup flags and permits retry after %s',async(mode)=>{
    let count=0;const s=setup(()=>{count++;if(mode==='throw')throw Error('unavailable');return mode==='reject'?Promise.reject(Error('unavailable')):Promise.resolve(false);});
    s.choose();await settle();expect(s.fakeWindow.__kokoroTTSDownloading).toBe(false);expect(s.fakeWindow.__kokoroLoadUserInitiated).toBe(false);expect(s.toasts.at(-1).type).toBe('error');
    s.choose();await settle();expect(count).toBe(2);
  });
  it('shares a pending download and reports successful completion',async()=>{
    let finish,count=0;const s=setup(()=>{count++;return new Promise(resolve=>finish=resolve);});s.choose();s.choose();await settle();expect(count).toBe(1);expect(s.selected).toEqual(['af_heart','af_heart']);expect(s.fakeWindow.__kokoroTTSDownloading).toBe(true);
    finish(true);await settle();expect(s.fakeWindow.__kokoroTTSDownloading).toBe(false);expect(s.toasts.at(-1).type).toBe('success');
  });
});


describe('header browser fallback persistence',()=>{
  function setup(config,fail=false){const toasts=[];let saved=config;const callback=attributeValue(element('id','header-browser-voice-fallback'),'onChange',{localStorage:{getItem:()=>JSON.stringify(saved),setItem:(key,value)=>{if(fail)throw Error('storage unavailable');expect(key).toBe('alloflow_ai_config');saved=JSON.parse(value);}},addToast:(text,type)=>toasts.push({text,type}),t:()=>null});return {callback,toasts,read:()=>saved};}
  it.each([true,false])('saves fallback=%s without dropping the selected provider',requested=>{const state=setup({ttsProvider:'kokoro',browserTtsFallback:!requested});const input={checked:requested};state.callback({currentTarget:input});expect(state.read()).toEqual({ttsProvider:'kokoro',browserTtsFallback:requested});expect(input.checked).toBe(requested);expect(state.toasts).toHaveLength(0);});
  it.each([true,false])('restores the visible choice if fallback=%s cannot be saved',requested=>{const state=setup({ttsProvider:'gemini',browserTtsFallback:!requested},true);const input={checked:requested};state.callback({currentTarget:input});expect(input.checked).toBe(!requested);expect(state.read().browserTtsFallback).toBe(!requested);expect(state.toasts.at(-1).type).toBe('error');});
});
