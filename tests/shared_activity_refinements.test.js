import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
let API, root, element;
beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('shared_activity_module.js');
  API = window.AlloModules.SharedActivity;
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; element?.remove(); element = null;
  localStorage.clear(); vi.restoreAllMocks();
  delete window.__alloSharedActivityMailboxCallWithRetry;
});
const mailbox = { id: 'pack', url: 'https://mailbox.example/exec', secret: 'secret' };
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
const options = [{id:'o1',label:'Tuesday'}, {id:'o2',label:'Wednesday'}];
const items = [
  {id:'i1',type:'likert',text:'Confidence',required:true,steps:3,labels:['Low','Some','High']},
  {id:'i2',type:'numeric',text:'Hours',min:0,max:10},
  {id:'i3',type:'freetext',text:'A note'},
  {id:'i4',type:'choice',text:'Support',options:[{id:'a',label:'Reading'},{id:'b',label:'Audio'}]},
];
function summary(type, extra={}) {
  return {ok:true,version:1,type,identityMode:'real_name',options,items,allowMaybe:true,multiSelect:true,maxPerPerson:1,
    slots:options.map(o=>({...o,capacity:1,remaining:1,taken:0})),closed:false,own:null,...extra};
}
function transport(initial) {
  const state = { current:initial, save:null, load:null, join:null };
  const call=vi.fn(async (_url,p) => {
    if(p.a==='joinactivity') return state.join ? state.join(p) : {uid:'u',pt:'token'};
    if(p.a==='getactivitysummary' || p.a==='getactivityadmin') return state.load ? state.load(p) : state.current;
    if(p.a==='activityupsert') {
      if(state.save) return state.save(p);
      const own={name:p.nm, ...(p.picks ? {picks:p.picks}:{}), ...(p.claims ? {claims:p.claims}:{}), ...(p.answers ? {answers:JSON.parse(p.answers)}:{})};
      return (state.current={...state.current,version:state.current.version+1,own});
    }
    throw Error('Unexpected action '+p.a);
  });
  window.__alloSharedActivityMailboxCallWithRetry=call;
  state.call=call; state.writes=()=>call.mock.calls.map(c=>c[1]).filter(p=>p.a==='activityupsert');
  return state;
}
async function render(type,extra={}) {
  if(!root){element=document.createElement('div');document.body.appendChild(element);root=createRoot(element);}
  await act(async()=>root.render(React.createElement(API.SharedAssignmentActivityPanel,{activity:{activityId:type,type,prompt:'Activity prompt'},mailbox,...extra})));
}
const button=text=>[...element.querySelectorAll('button')].find(el=>el.textContent.trim()===text);
async function click(el){expect(el).toBeTruthy();await act(async()=>el.dispatchEvent(new MouseEvent('click',{bubbles:true})));}
async function input(el,value){expect(el).toBeTruthy();await act(async()=>{Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});}
async function submit(times=1){await act(async()=>{for(let i=0;i<times;i++)element.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});}
const refresh=()=>click([...element.querySelectorAll('button')].find(b=>b.textContent.startsWith('Refresh')));

describe('Shared survey and scheduling UI recovery',()=>{
  it.each([['availability','Availability poll'],['signup','Sign-up sheet'],['survey','Survey']])('gives %s its own labels without a word-cloud threshold',async(type,title)=>{
    transport(summary(type)); await render(type);
    expect(element.querySelector('h3').textContent).toBe(title);
    expect(element.textContent).not.toMatch(/cloud appears|Teacher review required|Anonymous class totals/);
    expect(element.textContent).toContain('organizer can see your name');
  });
  it('restores saved availability and retains edits during a refresh',async()=>{
    const t=transport(summary('availability',{own:{name:'Sam',picks:{o1:'yes',o2:'no'}}})); await render('availability');
    expect(element.querySelector('input').value).toBe('Sam');
    expect(element.querySelector('[aria-label="Tuesday"] button[aria-pressed="true"]').textContent).toBe('Yes');
    await click(element.querySelector('[aria-label="Tuesday"] button:nth-child(2)')); await refresh();
    expect(element.querySelector('[aria-label="Tuesday"] button[aria-pressed="true"]').textContent).toBe('Maybe');
    await submit(); expect(t.writes()[0].picks).toEqual({o1:'maybe',o2:'no'});
    expect(element.textContent).toContain('Your availability was saved');
  });
  it('serializes rapid saves, holds controls while pending, and retains a failed draft for retry',async()=>{
    const t=transport(summary('availability',{own:{name:'Sam',picks:{o1:'yes'}}})), save=deferred();
    t.save=()=>save.promise; await render('availability'); await input(element.querySelector('input'),'Taylor'); await submit(2);
    expect(t.writes()).toHaveLength(1); expect(element.querySelector('fieldset').disabled).toBe(true);
    await act(async()=>save.reject(Error('offline')));
    expect(element.querySelector('input').value).toBe('Taylor'); expect(element.querySelector('[role="alert"]').textContent).toContain('draft is still here');
    t.save=null; await submit(); expect(t.writes()).toHaveLength(2); expect(element.textContent).toContain('Your availability was saved');
  });
  it('restores a full slot reserved by this respondent and saves a release',async()=>{
    const t=transport(summary('signup',{own:{name:'Sam',claims:['o1']},slots:[{...options[0],capacity:1,remaining:0,taken:1}, {...options[1],capacity:1,remaining:1,taken:0}]})); await render('signup');
    expect(button('Reserved · deselect').disabled).toBe(false);
    await click(button('Reserved · deselect')); expect(button('Keep reservation').disabled).toBe(false);
    await submit(); expect(t.writes()[0].claims).toEqual([]); expect(element.textContent).toContain('Your slot was released.');
  });
  it('refreshes full slots after a conflict without claiming a pending selection is reserved',async()=>{
    const t=transport(summary('signup',{own:{name:'Sam',claims:['o1']}})); await render('signup');
    await click(button('Select slot')); expect(button('Selected · remove')).toBeTruthy();
    t.save=async()=>{t.current={...t.current,version:2,slots:options.map(o=>({...o,capacity:1,remaining:0,taken:1}))};throw Object.assign(Error('slot-full'),{code:'slot-full'});};
    await submit(); expect(element.textContent).toContain('previous reservation is unchanged');
    expect(button('Selected · remove')).toBeTruthy(); await click(button('Selected · remove')); expect(button('Full').disabled).toBe(true);
    expect(button('Keep reservation').disabled).toBe(false);
  });
  it('restores survey values including zero and accepts a decimal answer',async()=>{
    const t=transport(summary('survey',{own:{name:'Sam',answers:{i1:2,i2:0,i3:'Saved note',i4:'a'}}})); await render('survey');
    expect(element.querySelector('[aria-label="Hours"]').value).toBe('0'); expect(button('Reading').getAttribute('aria-pressed')).toBe('true');
    expect(element.querySelector('textarea').value).toBe('Saved note'); await input(element.querySelector('[aria-label="Hours"]'),'1.5'); await submit();
    expect(JSON.parse(t.writes()[0].answers)).toMatchObject({i1:2,i2:1.5}); expect(button('Update my answers')).toBeTruthy();
  });
  it('focuses missing required questions and rejects out-of-range numbers before sending',async()=>{
    const t=transport(summary('survey',{identityMode:'anonymous'})); await render('survey'); await submit();
    expect(element.querySelector('[role="alert"]').textContent).toContain('required question: Confidence'); expect(document.activeElement.getAttribute('aria-label')).toBe('1: Low');
    await click(button('2')); await input(element.querySelector('[aria-label="Hours"]'),'11'); await submit();
    expect(document.activeElement.getAttribute('aria-label')).toBe('Hours'); expect(document.activeElement.getAttribute('aria-invalid')).toBe('true'); expect(t.writes()).toHaveLength(0);
  });
  it('lets respondents clear optional answers without polling restoring them',async()=>{
    const t=transport(summary('survey',{identityMode:'anonymous',own:{answers:{i1:2,i4:'a'}}})); await render('survey');
    await click(element.querySelector('[aria-label="Clear answer: Support"]')); await refresh(); await submit();
    expect(JSON.parse(t.writes()[0].answers)).toEqual({i1:2});
  });
  it('keeps closed and loading forms unavailable',async()=>{
    const t=transport(summary('survey',{closed:true,own:{name:'Sam',answers:{i1:2}}})); await render('survey'); await submit();
    expect(element.querySelector('fieldset').disabled).toBe(true); expect(t.writes()).toHaveLength(0);
    const wait=deferred();t.load=()=>wait.promise; await render('availability'); expect(element.querySelector('fieldset').disabled).toBe(true); await act(async()=>wait.resolve(summary('availability')));
  });
  it('clears scheduling names and selections when navigating and ignores an old save',async()=>{
    const t=transport(summary('signup',{own:{name:'Old person',claims:['o1']}})),save=deferred(),toasts=vi.fn();await render('signup',{addToast:toasts});t.save=()=>save.promise;await submit();
    t.current=summary('availability');await render('availability',{addToast:toasts});await input(element.querySelector('input'),'New person');
    await act(async()=>save.resolve(summary('signup',{version:3,own:{name:'Old person',claims:['o1']}})));
    expect(element.querySelector('input').value).toBe('New person');expect(toasts).not.toHaveBeenCalled();expect(element.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
  });
  it('discards a delayed join from a different mailbox even if activity IDs match',async()=>{
    const t=transport(summary('availability')),pending=deferred();t.join=()=>pending.promise;await render('availability');
    t.join=async()=>({uid:'new-user',pt:'new-token'});t.current=summary('availability',{own:{name:'New person',picks:{o2:'yes'}}});
    await render('availability',{mailbox:{...mailbox,url:'https://second.example/exec'}});
    await act(async()=>pending.resolve({uid:'old-user',pt:'old-token'}));
    expect(element.querySelector('input').value).toBe('New person');await submit();expect(t.writes()[0].uid).toBe('new-user');
    expect(t.call.mock.calls.filter(c=>c[1].a==='getactivitysummary'&&c[1].uid==='old-user')).toHaveLength(0);
  });
});

describe('Survey authoring validation',()=>{
  const build=async surveyItems=>{
    const toasts=[];
    const result=await API.buildAssignmentPackEncoded({includeSharedActivity:true},{resolveAssignmentResources:()=>[],serializeResourceForStudentPack:x=>x,stripUndefined:x=>x,generateUUID:()=> 'survey',encodeAlloPack:async x=>x,addToast:x=>toasts.push(x),sharedAssignmentActivity:{enabled:true,type:'survey',identityMode:'anonymous',surveyItems}});
    return {result,toasts};
  };
  it('keeps blank numeric limits unset while preserving an explicit zero',async()=>{
    const {result}=await build([{type:'numeric',text:'Unbounded',min:'',max:' '},{type:'numeric',text:'At least zero',min:0,max:null}]);
    expect(result).toBeTruthy();const rows=JSON.parse(result.encoded).sharedActivities[0].items;
    expect(rows[0]).not.toHaveProperty('min');expect(rows[0]).not.toHaveProperty('max');expect(rows[1].min).toBe(0);expect(rows[1]).not.toHaveProperty('max');
  });
  it('blocks a malformed choice or inverted bounds instead of silently omitting the question',async()=>{
    const choice=await build([{type:'likert',text:'Good'},{type:'choice',text:'Broken',optionsText:'Only one'}]);expect(choice.result).toBeNull();expect(choice.toasts[0]).toContain('two choices');
    const numeric=await build([{type:'numeric',text:'Hours',min:10,max:2}]);expect(numeric.result).toBeNull();expect(numeric.toasts[0]).toContain('minimum');
  });
});
