import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require=createRequire(import.meta.url);
let React,createRoot,act,Frames,Directions;const cleanups=[];
beforeAll(()=>{
 React=require(resolve('desktop/web-app/node_modules/react'));
 ({createRoot}=require(resolve('desktop/web-app/node_modules/react-dom/client')));
 act=React.act||require(resolve('desktop/web-app/node_modules/react-dom/test-utils')).act;
 window.React=globalThis.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 window.AlloIcons=new Proxy({},{get:()=>()=>null});window.sanitizeHtml=value=>value;
 loadAlloModule('view_sentence_frames_module.js');loadAlloModule('view_directions_result_module.js');
 Frames=window.AlloModules.SentenceFramesView;Directions=window.AlloModules.DirectionsResult.DirectionsResultView;
});
afterEach(()=>{cleanups.splice(0).reverse().forEach(fn=>fn());vi.restoreAllMocks();});
const mount=(Component,props)=>{const c=document.createElement('div');document.body.append(c);const root=createRoot(c);act(()=>root.render(React.createElement(Component,props)));cleanups.push(()=>{act(()=>root.unmount());c.remove();});return c;};
const click=el=>{expect(el).toBeTruthy();act(()=>el.click());};
const change=(el,value)=>act(()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});
describe('Main resource follow-up: Writing Scaffolds',()=>{
 it.each([undefined,null,{}, {mode:'list'},{mode:'list',items:null},{mode:'list',items:[null,{},false]},{mode:'paragraph',text:12},{mode:'paragraph',text:'  '}])('recovers gracefully from empty or malformed scaffold data: %j',data=>{
  const c=mount(Frames,{t:key=>key,generatedContent:{id:'s',data}});expect(c.querySelector('[role=status]').textContent).toContain('No writing prompts');
 });
 it('skips invalid list records without shifting saved response positions',()=>{
  const input=vi.fn();const c=mount(Frames,{t:()=>'',generatedContent:{id:'s',data:{mode:'list',items:[null,{text:'Explain your evidence.'},false,{text:'Give an example.'}]}},studentResponses:{s:{1:'First saved answer',3:'Second saved answer'}},handleStudentInput:input});
  const fields=[...c.querySelectorAll('textarea')];expect(fields.map(x=>x.value)).toEqual(['First saved answer','Second saved answer']);
  change(fields[1],'Updated example');expect(input).toHaveBeenCalledWith('s',3,'Updated example');
 });
 it('uses readable save-error and retry labels when translations are missing',()=>{
  const retry=vi.fn();const c=mount(Frames,{t:k=>k,generatedContent:{id:'s',data:{mode:'paragraph',text:'I noticed [evidence].'}},studentWorkStatus:'error',onRetrySave:retry});
  expect(c.querySelector('[role=status]').textContent).toContain('Your answers could not be saved');const b=c.querySelector('[role=status] button');expect(b.textContent).toBe('Try again');click(b);expect(retry).toHaveBeenCalledOnce();
 });
});
describe('Main resource follow-up: Assignment Directions',()=>{
 const stations=[{id:'read',title:'Read the passage',typeLabel:'Reading',visited:false}];
 const base=overrides=>({t:k=>k,title:'Today’s work',stationViews:stations,showQuestMap:true,goalViews:[],onTravel:vi.fn(),onChoose:vi.fn(),...overrides});
 it('retains the remaining choice when another assigned resource is missing',()=>{
  const choose=vi.fn();const c=mount(Directions,base({onChoose:choose,choiceBoardView:{title:'Choose an activity',items:[{resourceId:'read',label:'Reading'}],missingCount:1}}));
  expect(c.querySelector('[role=alert]').textContent).toContain('no longer available');
  const card=[...c.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='Choose activity: Reading');click(card);expect(choose).toHaveBeenCalledWith('read');
 });
 it('shows a truthful continuation message when no valid recommendation exists',()=>{
  const c=mount(Directions,base({recommendationView:{nextId:'missing'}}));expect(c.textContent).not.toContain('every station');expect(c.textContent).toContain('Choose a station');
 });
 it('still recognizes a fully visited map',()=>{
  const c=mount(Directions,base({stationViews:stations.map(x=>({...x,visited:true}))}));expect(c.textContent).toContain('every station');
 });
 it.each(['Enter',' '])('activates map stations with the %s key using the semantic resource ID',key=>{
  const travel=vi.fn();const c=mount(Directions,base({onTravel:travel}));const station=c.querySelector('svg [role=button]');
  expect(c.querySelector('svg').getAttribute('role')).toBe('group');expect(station.getAttribute('aria-label')).toBe('Read the passage');
  act(()=>station.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true})));expect(travel).toHaveBeenCalledExactlyOnceWith('read');
 });
 it('does not turn other map-navigation keys into activations',()=>{
  const travel=vi.fn();const c=mount(Directions,base({onTravel:travel}));act(()=>c.querySelector('svg [role=button]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true})));expect(travel).not.toHaveBeenCalled();
 });
});
describe('Main resource follow-up: shared host integration',()=>{
 it.each(['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx'])('keeps STEAM native and DBQ feedback scoped in %s',file=>{
  const source=readFileSync(file,'utf8');const start=source.indexOf("generatedContent && (activeView === 'math')");const end=source.indexOf('\n                    )}',start);const launch=source.slice(start,end);
  expect(launch).toContain('<button type="button"');expect(launch).not.toContain('<span role="button"');expect(launch).toContain("setStemLabTab('explore')");
  const dbqStart=source.indexOf('React.createElement(window.AlloModules.DbqView, {');
  const dbq=source.slice(dbqStart,source.indexOf("activeView === 'persona'",dbqStart));
  expect(dbq).toContain('callGemini: studentAiFeaturesHidden ? null : callGemini');expect(dbq).toContain("feedbackScopeKey: JSON.stringify([selectedProfileId");
 });
});

