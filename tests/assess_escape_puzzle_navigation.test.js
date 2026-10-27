import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url), React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
const strings = JSON.parse(readFileSync('ui_strings.js','utf8'));
const t = (key, params={}) => {
  const value = key.split('.').reduce((node,part)=>node?.[part],strings);
  return (typeof value === 'string' ? value : params.defaultValue || key).replace(/\{(\w+)\}/g,(match,name)=>params[name]??match);
};
let api, root, host, write;
const object = {id:'object',name:'Plant puzzle',emoji:'🌱'};
const sequence = {id:'p',linkedObjectId:object.id,type:'sequence',question:'Order the growth stages.',items:['Seed','Shoot','Flower'],shuffledItems:[1,0,2],correctOrder:[0,1,2]};
const matching = {id:'p',linkedObjectId:object.id,type:'matching',question:'Match plant parts to their needs.',pairs:[{left:'Root',right:'Water'},{left:'Leaf',right:'Light'}],leftColumn:['Root','Leaf'],rightColumn:['Light','Water']};
beforeAll(()=>{
  global.React=window.React=React; global.IS_REACT_ACT_ENVIRONMENT=true;
  window.AlloLanguageContext=React.createContext({t}); window.UiLanguageSelector=()=>null;
  write=vi.fn(async()=>{}); window.__alloShared={db:{},warnLog(){}};
  window.__alloFirebase={doc:(_db,...parts)=>parts.join('/'),updateDoc:(...args)=>write(...args)};
  window._fbDoc=window.__alloFirebase.doc; window._fbUpdateDoc=(...args)=>write(...args); window.__alloHooks={useFocusTrap(){}};
  loadAlloModule('escape_room_module.js'); loadAlloModule('teacher_module.js'); api=window.AlloModules;
});
afterEach(async()=>{ if(root) await act(async()=>root.unmount()); host?.remove(); root=host=null; write.mockClear(); });
async function mount(Component,props={}) {
  host=document.createElement('div'); document.body.append(host); root=createRoot(host);
  await act(async()=>root.render(React.createElement(Component,props)));
}
async function click(button) { expect(button).toBeTruthy(); button.focus(); await act(async()=>button.click()); }
async function key(element,value) { element.focus(); await act(async()=>element.dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true}))); }
const named=(label,scope=host)=>[...scope.querySelectorAll('button')].find(button=>button.getAttribute('aria-label')===label || button.textContent.trim()===label);
const liveState=puzzle=>({isActive:true,isPaused:false,startedAt:100,timerEnabled:false,timeRemaining:300,room:{theme:'Garden',description:'Use the evidence.'},objects:[object],puzzles:[puzzle],teams:{u:'Red'},teamProgress:{Red:{progressVersion:2,maxLives:3,maxHints:3,solved:{},misses:{},revealedHints:{}}}});
async function live(puzzle) { await mount(api.StudentEscapeRoomOverlay,{sessionData:{escapeRoomState:liveState(puzzle)},user:{uid:'u'},activeSessionCode:'LIVE',targetAppId:'app',t}); await click(host.querySelector('[data-help-key=escape_room_object]')); }
function Solo({onState=()=>{}}) {
  const [state,setState]=React.useState({isActive:true,hasStarted:true,room:{theme:'Garden',description:'Use the evidence.'},objects:[object],puzzles:[sequence],selectedObject:object,sequenceOrder:[1,0,2],solvedPuzzles:new Set(),livesRemaining:3,hintsRemaining:3,discoveredClues:{},hintsUsed:{},totalPuzzles:1});
  onState(state);
  return React.createElement(api.EscapeRoomGameplay,{escapeRoomState:state,setEscapeRoomState:setState,escapeTimeLeft:300,isEscapeTimerRunning:true,handlers:{},t,soundEnabled:false,setSoundEnabled(){}});
}

describe('Escape puzzle selection and reorder accessibility',()=>{
  it('retains the live sequence item and announces positions at both move boundaries',async()=>{
    await live(sequence); const status=host.querySelector('[data-live-puzzle-action-status]');
    expect(host.querySelector('[role=dialog]').textContent).toContain('Use Move up and Move down');
    await click(named(t('escape_room.move_up')+': Seed'));
    expect(document.activeElement).toBe(named(t('escape_room.move_down')+': Seed'));
    expect(status.textContent).toBe('Seed moved to position 1 of 3.');
    await click(document.activeElement); await click(document.activeElement);
    expect(document.activeElement).toBe(named(t('escape_room.move_up')+': Seed'));
    expect(status.textContent).toBe('Seed moved to position 3 of 3.');
    expect(host.querySelector('[data-live-puzzle-action-status]')).toBe(status);
    expect(write).not.toHaveBeenCalled();
  });
  it('exposes a word-bank selection with pressed state and a visible non-color marker',async()=>{
    await live({id:'p',linkedObjectId:object.id,type:'fillin',question:'Choose a resource.',sentence:'Roots absorb ___.',wordbank:['Water','Stone'],answer:'Water'});
    const water=named('Water'), stone=named('Stone');
    expect(water.getAttribute('aria-pressed')).toBe('false'); await click(water);
    expect(water.getAttribute('aria-pressed')).toBe('true'); expect(water.textContent).toContain('✓');
    await click(stone); expect(water.getAttribute('aria-pressed')).toBe('false'); expect(stone.getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(stone); expect(write).not.toHaveBeenCalled();
  });
  it('moves live matching focus to the next pair or submit, and restores the removed pair for correction',async()=>{
    await live(matching); const status=host.querySelector('[data-live-puzzle-action-status]');
    const rootButton=named('Root'); await click(rootButton);
    expect(rootButton.getAttribute('aria-pressed')).toBe('true'); expect(rootButton.textContent).toContain('✓');
    expect(status.textContent).toContain('Choose its partner'); await click(named('Water'));
    expect(document.activeElement).toBe(named('Leaf')); expect(status.textContent).toBe('Paired Root with Water.');
    await click(named('Leaf')); await click(named('Light'));
    expect(document.activeElement).toBe(named(t('escape_room.submit_answer')));
    const remove=host.querySelector('button[aria-label="'+t('common.remove')+': Root ↔ Water"]'); await click(remove);
    expect(document.activeElement).toBe(named('Root')); expect(rootButton.disabled).toBe(false);
    expect(status.textContent).toContain('Removed the pair Root and Water'); expect(write).not.toHaveBeenCalled();
  });
  it('supports selecting matching partners from either column without losing focus on completion',async()=>{
    await live(matching); await click(named('Light')); await click(named('Leaf'));
    expect(document.activeElement).toBe(named('Root')); await click(named('Water')); await click(named('Root'));
    const submit=named(t('escape_room.submit_answer')); expect(document.activeElement).toBe(submit);
    await click(submit);
    expect(write).toHaveBeenCalledWith('artifacts/app/public/data/sessions/LIVE',expect.objectContaining({'escapeRoomState.teamProgress.Red.solved.p':'p'}));
  });
  it('retains the solo sequence move control at boundaries instead of sending focus to a row',async()=>{
    let state; await mount(Solo,{onState:value=>{state=value;}}); const status=host.querySelector('[data-escape-sequence-status]');
    expect(host.querySelector('[role=dialog]').textContent).toContain('Use the Move up and Move down buttons');
    await click(named(t('escape_room.move_up')+': Seed'));
    expect(state.sequenceOrder).toEqual([0,1,2]); expect(document.activeElement).toBe(named(t('escape_room.move_down')+': Seed'));
    await click(document.activeElement); await click(document.activeElement);
    expect(state.sequenceOrder).toEqual([1,2,0]); expect(document.activeElement).toBe(named(t('escape_room.move_up')+': Seed'));
    expect(status.textContent).toBe('Seed moved to position 3 of 3.'); expect(host.querySelector('[data-escape-sequence-status]')).toBe(status);
  });
  it('preserves solo row focus for arrow-key ordering and ignores arrows bubbled from a move button',async()=>{
    let state; await mount(Solo,{onState:value=>{state=value;}});
    const row=[...host.querySelectorAll('[role=listitem]')].find(element=>element.getAttribute('aria-label')?.includes(': Seed.'));
    await key(row,'ArrowUp'); expect(state.sequenceOrder).toEqual([0,1,2]); expect(document.activeElement).toBe(row);
    expect(row.getAttribute('aria-label')).toContain('1: Seed');
    await key(named(t('escape_room.move_down')+': Seed'),'ArrowDown'); expect(state.sequenceOrder).toEqual([0,1,2]);
  });
  it('keeps solo sequence focus within its own component when two activities are rendered',async()=>{
    await mount(()=>React.createElement(React.Fragment,null,React.createElement('section',{'data-copy':'first'},React.createElement(Solo)),React.createElement('section',{'data-copy':'second'},React.createElement(Solo))));
    const first=host.querySelector('[data-copy=first]'),second=host.querySelector('[data-copy=second]');
    await click(named(t('escape_room.move_up')+': Seed',second));
    expect(document.activeElement).toBe(named(t('escape_room.move_down')+': Seed',second));
    expect(first.querySelector('[data-escape-sequence-status]').textContent).toBe('');
    expect(second.querySelector('[data-escape-sequence-status]').textContent).toContain('position 1');
  });
  it('rejects an invalid dragged sequence position without changing the answer',async()=>{
    let state; await mount(Solo,{onState:value=>{state=value;}}); const row=host.querySelector('[role=listitem]');
    for(const value of ['invalid','','1.5','-1','99']) {
      const drop=new Event('drop',{bubbles:true,cancelable:true}); Object.defineProperty(drop,'dataTransfer',{value:{getData:()=>value}});
      await act(async()=>row.dispatchEvent(drop)); expect(state.sequenceOrder).toEqual([1,0,2]); expect(host.querySelector('[data-escape-sequence-status]').textContent).toBe('');
    }
  });
});
