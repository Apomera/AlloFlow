import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require=createRequire(import.meta.url);
let React,createRoot,act,Selector,LanguageContext,root,host;
beforeAll(()=>{
 React=require(resolve('desktop/web-app/node_modules/react'));
 ({createRoot}=require(resolve('desktop/web-app/node_modules/react-dom/client')));act=React.act;
 global.React=window.React=React;global.IS_REACT_ACT_ENVIRONMENT=true;
 LanguageContext=window.AlloLanguageContext=React.createContext({});
 window.AlloIcons=new Proxy({},{get:()=>()=>null});
 loadAlloModule('ui_language_selector_module.js');Selector=window.AlloModules.UILanguageSelector;
});
afterEach(()=>{if(root)act(()=>root.unmount());host?.remove();root=null;host=null;vi.restoreAllMocks();vi.unstubAllGlobals();delete window.setConfirmDialog;});
async function mount(props={},context={}){
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({available:[{display:'French',endonym:'Français'}]})})));
 const value={t:key=>key,currentUiLanguage:'French',setUiLanguage:vi.fn(),isTranslating:false,regenerateLanguage:vi.fn(),exportLanguagePack:vi.fn(),importLanguagePack:vi.fn(),...context};
 host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);
 await act(async()=>root.render(React.createElement(LanguageContext.Provider,{value},React.createElement(Selector,props))));
 return value;
}
const regenerateButton=()=>host.querySelector('button[aria-label="Regenerate Translations"]');
describe('header language selector control behavior',()=>{
 it('opens the injected confirmation and regenerates only when confirmed',async()=>{
  const setConfirmDialog=vi.fn(),context=await mount({setConfirmDialog});
  act(()=>regenerateButton().click());
  expect(setConfirmDialog).toHaveBeenCalledOnce();expect(context.regenerateLanguage).not.toHaveBeenCalled();
  const request=setConfirmDialog.mock.calls[0][0];expect(request.message).toBe('Regenerate language pack?');
  act(()=>request.onConfirm());expect(context.regenerateLanguage).toHaveBeenCalledOnce();
 });
 it.each([false,true])('uses the standalone confirmation fallback without bypassing cancellation (accepted=%s)',async accepted=>{
  const confirm=vi.spyOn(window,'confirm').mockReturnValue(accepted),context=await mount();
  act(()=>regenerateButton().click());expect(confirm).toHaveBeenCalledWith('Regenerate language pack?');
  expect(context.regenerateLanguage).toHaveBeenCalledTimes(accepted?1:0);
 });
 it('moves Custom choice to the existing manual input without setting an invalid language',async()=>{
  const context=await mount();const select=host.querySelector('select');
  act(()=>{select.value='Custom';select.dispatchEvent(new Event('change',{bubbles:true}));});
  expect(document.activeElement).toBe(host.querySelector('input[type=text]'));
  expect(context.setUiLanguage).not.toHaveBeenCalled();
 });
 it('continues to select a prepared language normally',async()=>{
  const context=await mount();const select=host.querySelector('select');
  act(()=>{select.value='English';select.dispatchEvent(new Event('change',{bubbles:true}));});
  expect(context.setUiLanguage).toHaveBeenCalledWith('English');
 });
 it('clears each file selection so the same corrected pack can be imported again',async()=>{
  const context=await mount(),input=host.querySelector('input[type=file]'),file=new File(['{}'],'pack.json',{type:'application/json'});
  Object.defineProperty(input,'files',{value:[file],configurable:true});
  Object.defineProperty(input,'value',{value:'C:\\fakepath\\pack.json',writable:true,configurable:true});
  act(()=>input.dispatchEvent(new Event('change',{bubbles:true})));expect(input.value).toBe('');
  input.value='C:\\fakepath\\pack.json';
  act(()=>input.dispatchEvent(new Event('change',{bubbles:true})));expect(input.value).toBe('');
  expect(context.importLanguagePack).toHaveBeenCalledTimes(2);
  Object.defineProperty(input,'files',{value:[],configurable:true});
  act(()=>input.dispatchEvent(new Event('change',{bubbles:true})));
  expect(context.importLanguagePack).toHaveBeenCalledTimes(2);
 });
 it('keeps toolbar actions named and prevents form submission',async()=>{
  await mount();for(const button of host.querySelectorAll('button')){expect(button.type).toBe('button');expect(button.getAttribute('aria-label')?.trim()).toBeTruthy();}
 });
});
