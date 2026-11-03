import {afterEach,beforeAll,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url),React=require(resolve('desktop/web-app/node_modules/react'));
const {createRoot}=require(resolve('desktop/web-app/node_modules/react-dom/client'));
const {act}=React;
const strings=JSON.parse(readFileSync('ui_strings.js','utf8'));
const t=(key,params={})=>Object.entries(params).reduce((s,[k,v])=>s.replace('{'+k+'}',String(v)),key.split('.').reduce((o,k)=>o?.[k],strings)||key);
const createHostHandlers=new Function(readFileSync('host_handlers_source.jsx','utf8')+'\nreturn createHostHandlers;')();
const initialItems=()=>['Plant the seed','Water the soil','Watch the leaves','Measure the plant'].map((event,i)=>({id:'s'+i,date:'Step '+(i+1),event,event_en:'Translation '+i,verification:{factual:true,position:true}}));
let root,host,api;
beforeAll(()=>{window.React=globalThis.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;delete window.AlloModules.TimelineView;new Function(readFileSync('timeline_revision_module.js','utf8'))();new Function(readFileSync(process.env.ALLO_TIMELINE_VIEW||'view_timeline_module.js','utf8'))();});
afterEach(()=>{if(root)act(()=>root.unmount());root=null;document.body.innerHTML='';vi.restoreAllMocks();});
function mount({array=false,delay=false,extra={}}={}){
  const calls={move:vi.fn(),toast:vi.fn(),history:vi.fn()};
  function Harness(){
    const [current,setCurrent]=React.useState({id:'sequence',type:'timeline',config:{translationTarget:'English'},data:array?initialItems():{mode:'procedural',items:initialItems()}});
    const [editing,setEditing]=React.useState(true);
    const handlers=createHostHandlers({generatedContent:current,setGeneratedContent:setCurrent,setHistory:calls.history,setDraggedTimelineIndex:()=>{},draggedTimelineIndex:null,addToast:calls.toast,warnLog:()=>{},t});
    api={...api,current,setCurrent,setEditing};
    const move=(from,to)=>{calls.move(from,to);if(delay)api.apply=()=>handlers.handleTimelineMove(from,to);else handlers.handleTimelineMove(from,to);};
    return React.createElement(window.AlloModules.TimelineView,{t,generatedContent:current,isTeacherMode:true,isIndependentMode:false,leveledTextLanguage:'English',TIMELINE_MODE_DEFINITIONS:{},dismissedVerifications:new Set(),draggedTimelineIndex:null,timelineImageSize:96,timelineRefinementInputs:{},timelineRevisionInput:'',isAutoFixingTimeline:false,isEditingTimeline:editing,isGeneratingTimelineImage:{},isRevisingTimeline:false,isTimelineGame:false,isVerifyingTimeline:false,handleTimelineMove:move,handleTimelineChange:handlers.handleTimelineChange,setTimelineImageSize:()=>{},setTimelineRevisionInput:()=>{},setTimelineRefinementInputs:()=>{},setDismissedVerifications:()=>{},...extra});
  }
  host=document.createElement('div');document.body.append(host);root=createRoot(host);act(()=>root.render(React.createElement(Harness)));return calls;
}
const rows=()=>[...host.querySelectorAll('[data-timeline-row]')];
const items=()=>Array.isArray(api.current.data)?api.current.data:api.current.data.items;
const moveButton=(index,direction)=>rows()[index].querySelector('[data-timeline-move="'+direction+'"]')||rows()[index].querySelectorAll('button')[direction==='up'?0:1];
function key(node,key,props={}){const e=new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...props});act(()=>node.dispatchEvent(e));return e;}
function clickMove(index,direction){const button=moveButton(index,direction);act(()=>{button.focus();button.click();});}
describe('Timeline teacher keyboard editing',()=>{
  it.each([false,true])('keeps repeated row shortcuts on the same moved item (array=%s)',array=>{
    const calls=mount({array});act(()=>rows()[3].focus());key(document.activeElement,'ArrowUp',{altKey:true});expect(document.activeElement).toBe(rows()[2]);expect(items()[2].event).toBe('Measure the plant');
    key(document.activeElement,'ArrowUp',{altKey:true});expect(document.activeElement).toBe(rows()[1]);expect(items()[1].event).toBe('Measure the plant');expect(calls.move.mock.calls).toEqual([[3,2],[2,1]]);expect(items().map(i=>i.date)).toEqual(['Step 1','Step 2','Step 3','Step 4']);expect(calls.history).toHaveBeenCalledTimes(2);
  });
  it('keeps repeated move-button activation on the same item',()=>{
    const calls=mount();clickMove(3,'up');expect(document.activeElement).toBe(moveButton(2,'up'));act(()=>document.activeElement.click());expect(items()[1].event).toBe('Measure the plant');expect(document.activeElement).toBe(moveButton(1,'up'));expect(calls.move.mock.calls).toEqual([[3,2],[2,1]]);
  });
  it.each([['up',1,0,'ArrowDown',1],['down',2,3,'ArrowUp',2]])('returns focus to the moved row at the %s boundary',(direction,from,to,keyName,next)=>{
    mount();const name=items()[from].event;clickMove(from,direction);expect(moveButton(to,direction).disabled).toBe(true);expect(document.activeElement).toBe(rows()[to]);key(document.activeElement,keyName,{altKey:true});expect(document.activeElement).toBe(rows()[next]);expect(items()[next].event).toBe(name);
  });
  it('does not reorder while the user is editing a text field',()=>{
    const calls=mount(),field=rows()[1].querySelector('[data-timeline-event]');act(()=>field.focus());expect(key(field,'ArrowUp',{altKey:true}).defaultPrevented).toBe(false);expect(calls.move).not.toHaveBeenCalled();expect(document.activeElement).toBe(field);
  });
  it.each([{isComposing:true},{keyCode:229},{ctrlKey:true},{metaKey:true}])('leaves composing or modified input alone (%j)',flag=>{
    const calls=mount();act(()=>rows()[1].focus());expect(key(document.activeElement,'ArrowUp',{altKey:true,...flag}).defaultPrevented).toBe(false);expect(calls.move).not.toHaveBeenCalled();
  });
  it('does not take focus back from another control after a delayed update',()=>{
    mount({delay:true});clickMove(2,'up');const outside=document.createElement('button');document.body.append(outside);act(()=>outside.focus());act(()=>api.apply());expect(items()[1].event).toBe('Watch the leaves');expect(document.activeElement).toBe(outside);
  });
  it('discards pending move focus when another resource replaces the sequence',()=>{
    mount({delay:true});clickMove(2,'up');const before=document.activeElement;act(()=>api.setCurrent(r=>({...r,id:'another-sequence',data:{...r.data,items:[r.data.items[0],r.data.items[2],r.data.items[1],r.data.items[3]]}})));expect(document.activeElement).toBe(before);expect(document.activeElement).not.toBe(moveButton(1,'up'));
  });
  it('does not treat an unrelated content update as the requested move',()=>{
    mount({delay:true});clickMove(2,'up');const before=document.activeElement;act(()=>api.setCurrent(r=>({...r,data:{...r.data,items:r.data.items.map((item,i)=>i===0?{...item,event:'An unrelated correction'}:item)}})));expect(document.activeElement).toBe(before);
  });
  it('names the fields and controls by purpose and position without assuming an English companion',()=>{
    mount();const first=rows()[0],fields=[...first.querySelectorAll('input')];expect(fields.map(n=>n.getAttribute('aria-label'))).toEqual(['Label/Step — Timeline item 1 of 4','Event description — Timeline item 1 of 4','Label/Step — Companion translation — Timeline item 1 of 4','Event description — Companion translation — Timeline item 1 of 4']);expect(fields[2].placeholder).toBe('Companion translation');expect(fields[3].placeholder).toBe('Companion translation');for(const field of fields)expect(field.style.minHeight).toBe('44px');expect(moveButton(1,'up').getAttribute('aria-label')).toBe('Move timeline item 2 up: Water the soil');expect(moveButton(1,'up').style.minWidth).toBe('44px');expect(moveButton(1,'down').style.minHeight).toBe('44px');
  });
});
