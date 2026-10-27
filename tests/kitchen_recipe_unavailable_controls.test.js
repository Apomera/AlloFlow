// @vitest-environment jsdom
import {afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
const runtime=process.env.KITCHEN_MOTION_RUNTIME||path.dirname(require.resolve('../stem_lab/kitchen_studio/recipe_lab_engine.js'));
const load=file=>require(path.join(runtime,'recipe_lab_'+file+'.js'));
const R=load('engine'),Lid=load('lid'),Thermometer=load('thermometer');
const $=id=>document.getElementById(id),filled=()=>R.act(R.start(),'fill');
const lessons=[
 {name:'lid',module:Lid,panel:'potLidTools',preview:'lidKeyboardPanel',control:'lidControl',instruction:'lidInstruction',status:'lidStatus'},
 {name:'thermometer',module:Thermometer,panel:'waterThermometer',preview:'thermometerKeyboardPanel',control:'thermometerControl',instruction:'thermometerInstruction',status:'thermometerStatus'}
];
let cleanups=[];
afterEach(()=>{cleanups.reverse().forEach(fn=>fn());cleanups=[];vi.restoreAllMocks();document.body.replaceChildren();});
function mounted(spec,initial=R.start(),historical=false){
 document.body.innerHTML='<button id="invoker" type="button">Use keyboard controls</button><div id="lessonAnchor"></div>';let state=initial;
 const host={after:$('lessonAnchor'),getState:()=>state,has3D:()=>true,pause:vi.fn(),cancelNative:vi.fn(),openNative:vi.fn(),apply:vi.fn(),observed:vi.fn()};
 const ui=spec.module.mount(host);ui.render(state,historical,true);host.observed.mockClear();cleanups.push(()=>ui.dispose());
 return {ui,host,panel:$(spec.panel),summary:$(spec.panel).querySelector('summary'),state:()=>state,render(next=state,recorded=false){state=next;ui.render(state,recorded,false);}};
}

describe.each(lessons)('Unavailable $name keyboard routes',spec=>{
 it('opens the missing-prerequisite explanation and focuses its described summary without changing the cook',()=>{
  const m=mounted(spec),before=JSON.stringify(m.state());$('invoker').focus();expect(m.panel.open).toBe(false);m.ui.open();
  expect(m.panel.open).toBe(true);expect(document.activeElement).toBe(m.summary);expect(m.summary.getAttribute('aria-describedby')).toBe(spec.instruction);
  expect($(spec.instruction).textContent).toContain('Fill the pot');expect($(spec.status).textContent).toContain('Fill the pot');expect($(spec.status).textContent).not.toContain('Recorded or finished');expect($(spec.preview).hidden).toBe(true);
  expect(m.host.apply).not.toHaveBeenCalled();expect(m.host.observed).not.toHaveBeenCalled();expect(m.host.cancelNative).not.toHaveBeenCalled();expect(m.host.openNative).not.toHaveBeenCalled();expect(JSON.stringify(m.state())).toBe(before);
 });
 it.each(['historical','finished'])('opens a read-only explanation for a %s kitchen without starting a practice sequence',mode=>{
  const initial=mode==='finished'?{...filled(),plated:true}:filled(),m=mounted(spec,initial,mode==='historical'),before=JSON.stringify(initial);$('invoker').focus();m.ui.open();
  expect(m.panel.open).toBe(true);expect(document.activeElement).toBe(m.summary);expect($(spec.preview).hidden).toBe(true);expect($(spec.instruction).textContent).toMatch(/recorded|locked/i);expect($(spec.status).textContent).toMatch(/recorded|locked/i);
  expect(m.host.apply).not.toHaveBeenCalled();expect(m.host.observed).not.toHaveBeenCalled();expect(m.host.cancelNative).not.toHaveBeenCalled();expect(JSON.stringify(initial)).toBe(before);
 });
 it('does not rewrite the same live explanation on repeated route activation',()=>{
  const m=mounted(spec);m.ui.open();const status=$(spec.status),text=status.textContent,observer=new MutationObserver(()=>{});observer.observe(status,{childList:true,characterData:true,subtree:true});
  for(let i=0;i<3;i++){ $('invoker').focus();m.ui.open();expect(document.activeElement).toBe(m.summary); }
  expect(observer.takeRecords()).toHaveLength(0);observer.disconnect();expect(status.textContent).toBe(text);expect(status.getAttribute('role')).toBe('status');expect(status.getAttribute('aria-live')).toBe('polite');
 });
 it('focuses the actionable control after the prerequisite is met, then returns to explanation if it becomes unavailable',()=>{
  const m=mounted(spec);m.ui.open();const state=filled();m.render(state);m.ui.open();
  expect(m.panel.open).toBe(true);expect($(spec.preview).hidden).toBe(false);expect(document.activeElement).toBe($(spec.control));expect($(spec.control).getAttribute('aria-disabled')).toBe('false');expect(m.host.cancelNative).toHaveBeenCalledOnce();
  m.render(R.start());m.ui.open();expect(m.panel.open).toBe(true);expect($(spec.preview).hidden).toBe(true);expect(document.activeElement).toBe(m.summary);expect($(spec.status).textContent).toContain('Fill the pot');expect(m.host.apply).not.toHaveBeenCalled();expect(m.host.observed).not.toHaveBeenCalledWith(expect.objectContaining({temp:expect.any(Number)}));
 });
});

it('explains a covered pot when the thermometer route is requested',()=>{
 const spec=lessons[1],state=R.act(filled(),'lidPlace','covered'),m=mounted(spec,state),before=JSON.stringify(state);m.ui.open();
 expect(document.activeElement).toBe(m.summary);expect($(spec.status).textContent).toContain('Lift the lid onto its rest');expect($(spec.preview).hidden).toBe(true);expect(m.host.observed).not.toHaveBeenCalled();expect(JSON.stringify(state)).toBe(before);
});

it('preserves existing temperature checks when an unavailable historical route opens',()=>{
 const spec=lessons[1],state=filled(),m=mounted(spec,state),reading={time:state.time,temp:state.pot.temp,water:state.pot.water,heat:state.pot.heat,logIndex:state.log.length};
 expect(m.ui.record(reading)).toBe(true);m.render(state,true);m.host.observed.mockClear();const recorded=$('thermometerReadings').textContent;m.ui.open();
 expect(document.activeElement).toBe(m.summary);expect($('thermometerReadings').textContent).toBe(recorded);expect(recorded).toContain('22.0°C');expect(m.host.observed).not.toHaveBeenCalled();expect(m.host.apply).not.toHaveBeenCalled();
});
