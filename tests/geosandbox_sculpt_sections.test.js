import {afterEach,beforeAll,describe,it,expect} from 'vitest';
import {React,ReactDOMClient,loadTool,makeCtx,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
globalThis.IS_REACT_ACT_ENVIRONMENT=true;let cfg,mounted;
const box=extra=>({shape:'box',size:[1,2,.5],position:[1,.5,-1],rotation:[0,0,0],color:'#60a5fa',group:'Pair',...extra});
beforeAll(()=>{resetStemLab();cfg=loadTool('stem_lab/stem_tool_geosandbox.js','geoSandbox');});
afterEach(()=>{if(mounted){React.act(()=>mounted.root.unmount());mounted.container.remove();mounted=null;}});
function mount(parts=[box()],bucket={}){const container=document.createElement('div');document.body.appendChild(container);const v={container,root:ReactDOMClient.createRoot(container)};function Host(){const[data,setData]=React.useState({_threeLoaded:true,geoSandbox:{mode:'sculpt',sculptRecipe:{parts},...bucket}});v.state=data.geoSandbox;return cfg.render(makeCtx({toolData:data,setToolData:setData}));}mounted=v;React.act(()=>v.root.render(React.createElement(Host)));click(container.querySelector('#geo-sculpt-tab-edit'));return v;}
function click(el){expect(el).toBeTruthy();React.act(()=>el.click());}
function field(label){const el=mounted.container.querySelector('[aria-label="'+label+'"]');expect(el).toBeTruthy();return el;}
function value(el,v,blur=false){React.act(()=>{const proto=el.tagName==='SELECT'?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,String(v));el.dispatchEvent(new window.Event('input',{bubbles:true}));el.dispatchEvent(new window.Event('change',{bubbles:true}));if(blur)el.dispatchEvent(new window.FocusEvent('focusout',{bubbles:true}));});}
function history(name){click([...mounted.container.querySelectorAll('button')].find(el=>el.textContent.trim()===name));}


function nav(name){return [...mounted.container.querySelectorAll('.geo-sculpt-jumps button')].find(b=>b.textContent===name);}
function open(){return [...mounted.container.querySelectorAll('#geo-part-inspector>.geo-sculpt-section[open]')].map(s=>s.id);}
function summary(id){return mounted.container.querySelector('#geo-sculpt-section-'+id+'>summary');}
describe('Sculpt section navigation',()=>{
 it('starts with Size active and opens only the requested section',()=>{mount();expect(open()).toEqual(['geo-sculpt-section-size']);expect(nav('Size').getAttribute('aria-expanded')).toBe('true');click(nav('Move'));expect(open()).toEqual(['geo-sculpt-section-position']);expect(nav('Move').getAttribute('aria-expanded')).toBe('true');expect(nav('Size').getAttribute('aria-expanded')).toBe('false');expect(document.activeElement).toBe(summary('position'));});
 it('supports native summary activation and allows all sections to close',()=>{const v=mount();click(summary('material'));expect(open()).toEqual(['geo-sculpt-section-material']);expect(nav('Material').getAttribute('aria-expanded')).toBe('true');click(summary('material'));expect(open()).toEqual([]);expect(v.state.sculptInspectorSection).toBeNull();click(summary('identity'));expect(open()).toEqual(['geo-sculpt-section-identity']);});
 it('retains the active section across part selection and project navigation',()=>{mount([box(),box({label:'Other'})]);click(nav('Rotate'));value(field('Selected part'),'1');expect(open()).toEqual(['geo-sculpt-section-rotation']);click(mounted.container.querySelector('#geo-sculpt-tab-project'));click(mounted.container.querySelector('#geo-sculpt-tab-edit'));expect(open()).toEqual(['geo-sculpt-section-rotation']);});
 it('restores valid preferences and falls back safely from unknown sections',()=>{mount(undefined,{sculptInspectorSection:'material'});expect(open()).toEqual(['geo-sculpt-section-material']);});
 it('uses Size when a stored preference is unsupported',()=>{mount(undefined,{sculptInspectorSection:'missing'});expect(open()).toEqual(['geo-sculpt-section-size']);});
 it('respects a saved all-closed preference',()=>{mount(undefined,{sculptInspectorSection:null});expect(open()).toEqual([]);click(nav('Arrange'));expect(open()).toEqual(['geo-sculpt-section-arrange']);});
 it('preserves geometry and redo while navigating or closing sections',()=>{const v=mount();value(field('Width (u)'),3,true);history('↶ Undo');const before=JSON.stringify(v.state.sculptRecipe);click(nav('Material'));click(summary('identity'));expect(JSON.stringify(v.state.sculptRecipe)).toBe(before);const redo=[...v.container.querySelectorAll('button')].find(b=>b.textContent==='Redo');expect(redo.disabled).toBe(false);history('Redo');expect(v.state.sculptRecipe.parts[0].size[0]).toBeCloseTo(3/2.6);});
});
