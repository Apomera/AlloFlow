import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
const require=createRequire(import.meta.url),{makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs'),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
let UI,root,element;
const restoreBrowserAPIs=[];
function mockMotion(reduced=false){
  const controls=[],listeners=new Set(),media={matches:reduced,addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn)};
  const animate=vi.fn(()=>{let finish;const control={cancel:vi.fn(),finished:new Promise(resolve=>{finish=resolve;}),finish:()=>finish()};controls.push(control);return control;});
  for(const [target,key,value] of [[Element.prototype,'animate',animate],[window,'matchMedia',()=>media]]){
    const previous=Object.getOwnPropertyDescriptor(target,key);Object.defineProperty(target,key,{configurable:true,writable:true,value});
    restoreBrowserAPIs.push(()=>previous?Object.defineProperty(target,key,previous):delete target[key]);
  }
  return {animate,controls,reduce:()=>{media.matches=true;listeners.forEach(fn=>fn({matches:true}));}};
}
const board=()=>({...makeBoard(),playStyle:'tabletop'}),find=selector=>element.querySelector(selector);
function motionMove(b,run,id){
  if(engine.stepOf(run).phase==='review')run=engine.merge(run,engine.advance(b,run));
  run=engine.merge(run,engine.begin(b,run,id));
  if(engine.stepOf(run).phase==='answer'){
    const target=b.locations.find(node=>node.id===id);
    run=engine.merge(run,engine.processAction(b,run,{attemptId:'motion-test',requestId:engine.requestId(run),turn:run.turn,kind:'answer',targetId:id,value:engine.solution(target)},'solo',{attemptId:'motion-test',active:true}));
    run=engine.merge(run,engine.resolve(b,run,{solo:{}}));
  }
  return run;
}
// Motion needs recorded engine history. A supplied progress snapshot alone
// deliberately cannot create a travelled route on the authoritative map.
function motionFixture(b,bridge=false){
  let run=engine.emptyRun();
  for(const id of ['heater','river','heater',...(bridge?['bridge']:[])])run=motionMove(b,run,id);
  run=engine.merge(run,engine.advance(b,run));
  const arrived=engine.merge(run,engine.begin(b,run,bridge?'sequence':'lake'));
  return {run,arrived,route:engine.routeForStep(b,arrived,arrived.turn)};
}
async function render(props={}){
  if(!root){element=document.createElement('div');element.className='lb';document.body.append(element);root=createRoot(element);}
  const b=props.board||board(),run=props.run||engine.emptyRun(),progress=props.progress||engine.derive(b,run);
  await act(async()=>root.render(React.createElement(UI.BoardMap,{board:b,run,progress,ready:engine.targets(b,run).map(node=>node.id),selected:b.starts[0],view:'board',Icon:()=>null,...props})));
}
const click=async selector=>{await act(async()=>find(selector).click());};
beforeAll(()=>{
  window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const source=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {BoardMap} from './lesson_board_map.jsx';export {tabletopLayout} from './lesson_board_tabletop.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'TabletopUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});
  UI=new Function(source+';return TabletopUI;')();
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();root=element=null;while(restoreBrowserAPIs.length)restoreBrowserAPIs.pop()();vi.useRealTimers();vi.restoreAllMocks();});

describe('Physical tabletop board',()=>{
  it('keeps the legacy map and uses the spatial map only for tabletop rules',async()=>{
    await render({board:makeBoard()});expect(find('[data-spatial-board]')).toBeNull();expect(find('[data-board-map]')).toBeTruthy();
    await render();expect(find('[data-spatial-board]')).toBeTruthy();expect(find('[data-party-pawn="heater"]')).toBeTruthy();
  });
  it('keeps a persistent party marker through choosing, answering and review',async()=>{
    const b=board();let run=engine.emptyRun();await render({board:b,run});expect(find('[data-location="heater"]').getAttribute('aria-current')).toBe('location');
    run=engine.merge(run,engine.begin(b,run,'cloud'));await render({board:b,run});expect(find('[data-party-pawn="cloud"]')).toBeTruthy();
    run.steps.t0.answers={solo:{value:engine.solution(b.locations.find(node=>node.id==='cloud')),correct:true}};run=engine.merge(run,engine.resolve(b,run,{solo:{}}));await render({board:b,run});expect(find('[data-party-pawn="cloud"]')).toBeTruthy();expect(find('[data-location="cloud"]').dataset.state).toBe('explored');
    run=engine.merge(run,engine.advance(b,run));await render({board:b,run});expect(find('[data-party-pawn="cloud"]')).toBeTruthy();
  });
  it('places constructions at actual sites and draws shortcuts from site to target',async()=>{
    const b=board(),run=engine.emptyRun(),p={...engine.derive(b,run),visited:b.starts.slice(),built:['bridge']},site=engine.buildSite(b,'bridge'),onSelect=vi.fn();
    await render({board:b,run,progress:p,onSelect,selected:'bridge'});
    const bridge=find('[data-built-route="bridge"]');expect(bridge.dataset.routeFrom).toBe(site);expect(bridge.dataset.routeTo).toBe('sequence');
    expect(find('[data-map-construction="bridge"]').closest('[data-build-site]').dataset.buildSite).toBe(site);
    expect(find('[data-map-construction="bridge"]').getAttribute('aria-label')).toContain(b.locations.find(node=>node.id===site).name);
    await click('[data-map-construction="bridge"]');expect(onSelect).toHaveBeenCalledWith('bridge');expect(p.built).toEqual(['bridge']);
  });
  it('previews real multi-space travel and prevents map selection from becoming a move',async()=>{
    const b=board(),progress={...engine.derive(b,engine.emptyRun()),visited:['heater','river'],position:'heater'},onSelect=vi.fn();
    await render({board:b,progress,selected:'lake',onSelect});expect(find('[data-spatial-selection]').textContent).toContain('2 spaces');
    expect(find('[data-spatial-route]').textContent).toBe('Heating station → River station → Lake station');
    expect(element.querySelectorAll('[data-route-preview="true"]')).toHaveLength(2);
    await click('[data-location="lake"]');expect(onSelect).toHaveBeenCalledWith('lake');expect(find('[data-party-pawn="heater"]')).toBeTruthy();
  });
  it('changes only the camera and preserves equivalent list selection',async()=>{
    const b=board(),onSelect=vi.fn();await render({board:b,view:'tabletop',onSelect});
    expect(find('[data-spatial-board]').dataset.camera).toBe('angle');
    const positions=[...element.querySelectorAll('[data-space-position]')].map(node=>node.getAttribute('style'));
    for(const camera of ['left','right','overhead','angle']){
      await click('[data-tabletop-camera="'+camera+'"]');expect(find('[data-spatial-board]').dataset.camera).toBe(camera);
      expect(find('[data-tabletop-camera="'+camera+'"]').getAttribute('aria-pressed')).toBe('true');
      expect([...element.querySelectorAll('[data-space-position]')].map(node=>node.getAttribute('style'))).toEqual(positions);
      expect(find('[data-party-pawn="heater"]')).toBeTruthy();expect(find('[data-location="heater"]').getAttribute('aria-pressed')).toBe('true');
    }
    await click('[data-tabletop-fit]');expect(find('[data-spatial-board]').dataset.camera).toBe('overhead');expect(onSelect).not.toHaveBeenCalled();
    await render({board:b,view:'list',onSelect});expect(find('.lb-spatial-stage')).toBeNull();expect(find('[data-location="heater"]').getAttribute('aria-current')).toBe('location');expect(element.querySelectorAll('[data-map-construction]')).toHaveLength(3);
    await click('[data-location="cloud"]');expect(onSelect).toHaveBeenCalledWith('cloud');
  });
  it('magnifies in a keyboard-scrollable region, centers the selected space locally and restores fit without moving the party',async()=>{
    const b=board(),run=engine.emptyRun(),progress=engine.derive(b,run),onSelect=vi.fn(),before=JSON.stringify({b,run,progress});
    await render({board:b,run,progress,view:'tabletop',selected:'river',onSelect});
    const viewport=find('[data-tabletop-viewport]'),target=find('[data-location="river"]'),scrollTo=vi.fn();
    expect(viewport.hasAttribute('tabindex')).toBe(false);expect(viewport.hasAttribute('role')).toBe(false);
    Object.defineProperties(viewport,{clientWidth:{configurable:true,value:300},clientHeight:{configurable:true,value:400},scrollWidth:{configurable:true,value:1000},scrollHeight:{configurable:true,value:1000},scrollTo:{configurable:true,value:scrollTo}});
    vi.spyOn(viewport,'getBoundingClientRect').mockReturnValue({left:20,top:100,width:300,height:400});
    vi.spyOn(target,'getBoundingClientRect').mockReturnValue({left:450,top:510,width:120,height:100});
    await click('[data-tabletop-close]');expect(viewport.dataset.zoom).toBe('close');expect(viewport.getAttribute('tabindex')).toBe('0');expect(viewport.getAttribute('role')).toBe('region');
    expect(element.querySelector('[id="'+viewport.getAttribute('aria-describedby')+'"]')?.textContent).toContain('arrow keys');
    expect(find('[data-tabletop-close]').getAttribute('aria-pressed')).toBe('true');expect(scrollTo).toHaveBeenLastCalledWith({left:340,top:260,behavior:'instant'});
    viewport.scrollLeft=80;viewport.scrollTop=45;await click('[data-tabletop-center]');expect(scrollTo).toHaveBeenLastCalledWith({left:420,top:305,behavior:'instant'});
    await click('[data-tabletop-camera="right"]');expect(viewport.dataset.zoom).toBe('close');
    await click('[data-tabletop-fit]');expect(viewport.dataset.zoom).toBe('fit');expect(viewport.hasAttribute('tabindex')).toBe(false);expect(viewport.scrollLeft).toBe(0);expect(viewport.scrollTop).toBe(0);
    expect(find('[data-tabletop-close]').getAttribute('aria-pressed')).toBe('false');expect(find('[data-tabletop-center]')).toBeNull();expect(find('[data-spatial-board]').dataset.camera).toBe('overhead');
    expect(find('[data-party-pawn="heater"]')).toBeTruthy();expect(onSelect).not.toHaveBeenCalled();expect(JSON.stringify({b,run,progress})).toBe(before);
  });
  it('offers magnification in 2D and restores a readable selected-name readout when switching views',async()=>{
    const b=board();b.locations.find(node=>node.id==='river').name='The unusually long river exploration station beside the community waterworks';
    await render({board:b,view:'board',selected:'river'});const readout=find('[data-spatial-readout]');
    expect(readout.textContent).toContain(b.locations.find(node=>node.id==='river').name);
    await click('[data-tabletop-close]');expect(find('[data-tabletop-viewport]').dataset.zoom).toBe('close');
    await render({board:b,view:'list',selected:'river'});expect(find('[data-tabletop-viewport]')).toBeNull();expect(find('[data-location="river"]').textContent).toContain(b.locations.find(node=>node.id==='river').name);
    await render({board:b,view:'board',selected:'bridge'});expect(find('[data-spatial-readout]').textContent).toContain(b.projects.find(item=>item.id==='bridge').name);expect(find('[data-tabletop-viewport]').dataset.zoom).toBe('close');
    await click('[data-tabletop-fit]');expect(find('[data-tabletop-viewport]').dataset.zoom).toBe('fit');
  });
  it('follows the party only after opting in, keeps panning within the board and leaves inspection unchanged',async()=>{
    const b=board(),run=engine.emptyRun(),progress=engine.derive(b,run),onSelect=vi.fn(),before=JSON.stringify({b,run,progress}),pageScroll=vi.spyOn(window,'scrollTo');
    mockMotion();await render({board:b,run,progress,view:'tabletop',selected:'river',onSelect});
    const viewport=find('[data-tabletop-viewport]'),scrollTo=vi.fn();
    Object.defineProperties(viewport,{clientWidth:{configurable:true,value:300},clientHeight:{configurable:true,value:400},scrollWidth:{configurable:true,value:900},scrollHeight:{configurable:true,value:800},scrollTo:{configurable:true,value:scrollTo}});
    vi.spyOn(viewport,'getBoundingClientRect').mockReturnValue({left:20,top:100,width:300,height:400});
    vi.spyOn(find('[data-location="heater"]'),'getBoundingClientRect').mockReturnValue({left:10,top:20,width:100,height:100});
    vi.spyOn(find('[data-location="river"]'),'getBoundingClientRect').mockReturnValue({left:450,top:510,width:120,height:100});
    vi.spyOn(find('[data-location="lake"]'),'getBoundingClientRect').mockReturnValue({left:1000,top:900,width:120,height:100});
    await click('[data-tabletop-close]');expect(find('[data-tabletop-follow]').getAttribute('aria-pressed')).toBe('false');scrollTo.mockClear();
    await render({board:b,run,progress:{...progress,position:'cloud'},view:'tabletop',selected:'river',onSelect});expect(scrollTo).not.toHaveBeenCalled();
    await render({board:b,run,progress,view:'tabletop',selected:'river',onSelect});await click('[data-tabletop-center-party]');
    expect(scrollTo).toHaveBeenLastCalledWith({left:0,top:0,behavior:'smooth'});expect(find('[data-tabletop-follow]').getAttribute('aria-pressed')).toBe('false');
    await click('[data-tabletop-follow]');expect(find('[data-tabletop-follow]').getAttribute('aria-pressed')).toBe('true');scrollTo.mockClear();
    await render({board:b,run,progress:{...progress,position:'lake'},view:'tabletop',selected:'river',onSelect});
    expect(scrollTo).toHaveBeenCalledTimes(1);expect(scrollTo).toHaveBeenLastCalledWith({left:600,top:400,behavior:'smooth'});
    expect(find('[data-location="river"]').getAttribute('aria-pressed')).toBe('true');expect(find('[data-spatial-readout]').textContent).toContain('River station');
    await render({board:b,run,progress:{...progress,position:'lake'},view:'tabletop',selected:'cloud',onSelect});expect(scrollTo).toHaveBeenCalledTimes(1);
    await click('[data-tabletop-follow]');scrollTo.mockClear();await render({board:b,run,progress,view:'tabletop',selected:'river',onSelect});expect(scrollTo).not.toHaveBeenCalled();
    await click('[data-tabletop-follow]');await click('[data-tabletop-fit]');expect(find('[data-spatial-board]').dataset.followParty).toBe('false');
    await click('[data-tabletop-close]');expect(find('[data-tabletop-follow]').getAttribute('aria-pressed')).toBe('false');
    expect(onSelect).not.toHaveBeenCalled();expect(pageScroll).not.toHaveBeenCalled();expect(JSON.stringify({b,run,progress})).toBe(before);
  });
  it('stops local camera motion when reduced motion is enabled and uses immediate centering afterward',async()=>{
    const b=board(),motion=mockMotion(),progress=engine.derive(b,engine.emptyRun());await render({board:b,progress});await click('[data-tabletop-close]');
    const viewport=find('[data-tabletop-viewport]'),scrollTo=vi.fn();Object.defineProperty(viewport,'scrollTo',{configurable:true,value:scrollTo});
    await click('[data-tabletop-follow]');expect(scrollTo).toHaveBeenLastCalledWith({left:0,top:0,behavior:'smooth'});
    viewport.scrollLeft=80;viewport.scrollTop=45;await act(async()=>motion.reduce());expect(scrollTo).toHaveBeenLastCalledWith({left:80,top:45,behavior:'instant'});
    await render({board:b,progress:{...progress,position:'river'}});expect(scrollTo).toHaveBeenLastCalledWith({left:0,top:0,behavior:'instant'});
    await click('[data-tabletop-center-party]');expect(scrollTo).toHaveBeenLastCalledWith({left:0,top:0,behavior:'instant'});
  });
  it('keeps projected routes separate from camera following and the last actual journey',async()=>{
    const b=board();let run=engine.emptyRun();
    for(const id of ['heater','river','heater']){
      run=engine.merge(run,engine.begin(b,run,id));
      if(engine.stepOf(run).phase==='answer'){
        run.steps['t'+run.turn].answers={solo:{value:engine.solution(b.locations.find(node=>node.id===id)),correct:true}};
        run=engine.merge(run,engine.resolve(b,run,{solo:{}}));
      }
      run=engine.merge(run,engine.advance(b,run));
    }
    run=engine.merge(run,engine.begin(b,run,'lake'));const before=JSON.stringify(run);
    await render({board:b,run,selected:'weather',view:'tabletop'});
    expect(find('[data-last-move]').dataset.lastMove).toBe('heater,river,lake');expect(find('[data-last-move]').textContent).toContain('Heating station → River station → Lake station');
    expect([...element.querySelectorAll('[data-last-route]')].map(node=>node.dataset.lastRoute)).toEqual(['heater:river','river:lake']);
    await render({board:b,run,selected:'heater'});expect(find('[data-last-move]').dataset.lastMove).toBe('heater,river,lake');expect(find('[data-last-route]')).toBeNull();expect(element.querySelectorAll('[data-route-preview="true"]')).toHaveLength(2);
    await render({board:b,run:structuredClone(run),selected:'weather',view:'list'});expect(find('[data-last-move]').dataset.lastMove).toBe('heater,river,lake');
    await render({board:b,run,selected:'weather',projection:true});expect(find('[data-last-move]')).toBeNull();expect(find('[data-last-route]')).toBeNull();
    await click('[data-tabletop-close]');expect(find('[data-tabletop-follow]')).toBeNull();expect(find('[data-tabletop-center-party]')).toBeNull();
    expect(JSON.stringify(run)).toBe(before);
  });
  it('distinguishes connected destinations beyond tactical travel range from unexplored route blockers',async()=>{
    const b={...board(),travelLimit:3},progress={...engine.derive(b,engine.emptyRun()),position:'heater',visited:['heater','river','lake','cooler']},onSelect=vi.fn(),before=JSON.stringify({b,progress});
    await render({board:b,progress,selected:'weather',view:'tabletop',onSelect});
    expect(find('[data-location="weather"]').dataset.outOfRange).toBe('true');expect(find('[data-location="weather"]').getAttribute('aria-label')).toContain('Beyond travel range · 4 spaces away');
    expect(find('[data-location="weather"] [data-range-distance]').textContent).toBe('4 away');expect(find('[data-spatial-readout]').textContent).toContain('Beyond travel range · 4 spaces away');
    expect(find('[data-spatial-selection]').textContent).toContain('This expedition allows 3 spaces per turn.');expect(find('[data-destination-ring]')).toBeNull();expect(find('[data-route-step]')).toBeNull();
    expect(find('[data-location="sequence"]').dataset.outOfRange).toBe('false');expect(find('[data-location="sequence"]').getAttribute('aria-label')).toContain('Explore a connected space first');
    expect(find('[data-location="cooler"]').dataset.outOfRange).toBe('false');
    await click('[data-location="weather"]');expect(onSelect).toHaveBeenCalledWith('weather');
    await render({board:b,progress:{...progress,visited:[...progress.visited,'weather']},selected:'weather',view:'list'});
    expect(find('[data-location="weather"]').textContent).toContain('Explored · Beyond travel range · 4 spaces away');expect(find('[data-location="weather"]').dataset.state).toBe('explored');
    await render({board:{...b,travelLimit:undefined},progress,selected:'weather',view:'tabletop'});expect(find('[data-range-distance]')).toBeNull();expect(find('[data-spatial-readout]').textContent).not.toContain('Beyond travel range');expect(element.querySelectorAll('[data-route-step]')).toHaveLength(4);
    await render({board:b,progress:{...progress,complete:true},selected:'weather',view:'tabletop'});expect(find('[data-range-distance]')).toBeNull();
    expect(JSON.stringify({b,progress})).toBe(before);
  });
  it('describes the explicit home delivery action without reopening a cleared challenge',async()=>{
    const b={...board(),travelLimit:3},progress={...engine.derive(b,engine.emptyRun()),position:'heater',visited:['heater'],objectiveReady:true,complete:false};
    await render({board:b,progress,selected:'heater'});expect(find('[data-spatial-selection]').textContent).toContain('The party is home. Deliver the expedition to finish.');
    expect(find('[data-spatial-selection]').textContent).not.toContain('Open this space’s challenge');expect(find('[data-route-step]')).toBeNull();
  });
  it('distinguishes planned destinations from the legal route and describes their order in the list',async()=>{
    const b=board(),run=engine.emptyRun(),progress=engine.derive(b,run),planned=['weather','bridge','river'],before=JSON.stringify({b,run,progress,planned});
    await render({board:b,run,progress,view:'tabletop',selected:'weather',planned});
    expect(find('[data-location="weather"] [data-plan-pin]').textContent).toBe('1');expect(find('[data-map-construction="bridge"] [data-plan-pin]').textContent).toBe('2');expect(find('[data-location="river"] [data-plan-pin]').textContent).toBe('3');
    expect(find('[data-location="weather"]').getAttribute('aria-label')).toContain('Planned stop 1');expect(find('[data-map-construction="bridge"]').getAttribute('aria-label')).toContain('Planned stop 2');
    expect(find('[data-spatial-readout]').textContent).toContain('Planned stop 1');expect(find('[data-route-step]')).toBeNull();expect(find('[data-route-preview="true"]')).toBeNull();
    await render({board:b,run,progress,view:'list',selected:'weather',planned});expect(find('[data-location="weather"]').textContent).toContain('Planned stop 1');expect(find('[data-map-construction="bridge"]').textContent).toContain('Planned stop 2');
    expect(JSON.stringify({b,run,progress,planned})).toBe(before);
  });
  it('separates construction attachments from actual routes and paints the selected route last',async()=>{
    const b=board(),progress={...engine.derive(b,engine.emptyRun()),visited:['heater','river'],position:'heater'},before=JSON.stringify(progress);
    const connections=()=>[...element.querySelectorAll('[data-route-from]')].map(node=>[node.dataset.routeFrom,node.dataset.routeTo].sort().join(':')).sort();
    await render({board:b,progress});const topology=connections();expect(topology).toHaveLength(b.edges.length);expect(find('[data-site-attachment]')).toBeNull();
    await render({board:b,progress,selected:'bridge'});expect(connections()).toEqual(topology);expect(element.querySelectorAll('[data-site-attachment]')).toHaveLength(1);
    expect(find('[data-site-attachment="bridge"]').hasAttribute('data-route-from')).toBe(false);
    await render({board:b,progress,selected:'lake'});expect(connections()).toEqual(topology);expect(find('[data-site-attachment]')).toBeNull();
    const routes=[...element.querySelectorAll('[data-route-from]')];expect(routes.slice(-2).every(node=>node.dataset.routePreview==='true')).toBe(true);
    expect(routes.slice(0,-2).every(node=>node.dataset.routePreview==='false')).toBe(true);expect(JSON.stringify(progress)).toBe(before);
  });
  it('shows construction availability, completion and actual use in both map and list',async()=>{
    const b=board(),progress=engine.derive(b,engine.emptyRun());
    await render({board:b,progress,ready:[]});expect(find('[data-map-construction="bridge"]').dataset.constructionState).toBe('blueprint');
    await render({board:b,progress,ready:['bridge']});expect(find('[data-map-construction="bridge"]').dataset.constructionState).toBe('ready');expect(find('[data-map-construction="bridge"]').getAttribute('aria-label')).toContain('Ready to build');
    const built={...progress,built:['bridge']};await render({board:b,progress:built});expect(find('[data-map-construction="bridge"]').dataset.constructionState).toBe('built');
    expect(find('[data-map-construction="bridge"] [data-constructed="true"]')).toBeTruthy();
    const used={...built,usedProjects:['bridge']};await render({board:b,progress:used});expect(find('[data-map-construction="bridge"]').dataset.constructionState).toBe('used');expect(find('[data-map-construction="bridge"]').getAttribute('aria-label')).toContain('Used on this expedition');
    await render({board:b,progress:used,view:'list'});expect(find('[data-map-construction="bridge"]').dataset.constructionState).toBe('used');expect(find('[data-map-construction="bridge"]').textContent).toContain('Used on this expedition');expect(built.usedProjects||[]).toEqual([]);
  });
  it('previews an unbuilt shortcut without adding a legal route, travelling or moving focus',async()=>{
    const b=board(),run=engine.emptyRun(),progress={...engine.derive(b,run),visited:['heater','cloud','rain'],position:'cloud'},onSelect=vi.fn(),before=JSON.stringify({b,run,progress});
    await render({board:b,run,progress,selected:'bridge',view:'tabletop',onSelect});
    const preview=find('[data-shortcut-preview="bridge"]'),site=engine.buildSite(b,'bridge'),layout=UI.tabletopLayout(b),a=layout.positions[site],z=layout.positions.sequence;
    expect(preview).toBeTruthy();expect(preview.closest('svg').getAttribute('aria-hidden')).toBe('true');
    expect(preview.querySelector('path').getAttribute('d')).toBe(`M ${a.x*1000} ${a.y*700} L ${z.x*1000} ${z.y*700}`);
    expect(preview.querySelector('[data-route-from]')).toBeNull();expect(element.querySelectorAll('[data-route-from]')).toHaveLength(b.edges.length);
    expect(find('[data-built-route="bridge"]')).toBeNull();expect(find('[data-shortcut-model]')).toBeNull();expect(find('[data-route-step]')).toBeNull();
    expect([...element.querySelectorAll('[data-construction-endpoint="true"]')].map(node=>node.dataset.location)).toEqual([site,'sequence']);
    expect(find('[data-location="sequence"]').getAttribute('aria-label')).toContain('Endpoint of the construction preview');
    expect(find('[data-construction-preview-label]').textContent).toContain('Not built yet.');
    expect(find('[data-shortcut-before]').textContent).toBe('3 spaces away');expect(find('[data-shortcut-after]').textContent).toBe('1 space · direct route');
    expect(find('[data-shortcut-benefit]').textContent).toContain('2 fewer spaces');expect(find('[data-shortcut-range-benefit]')).toBeNull();
    await click('[data-location="sequence"]');expect(onSelect).toHaveBeenCalledWith('sequence');expect(find('[data-party-pawn="cloud"]')).toBeTruthy();
    expect(JSON.stringify({b,run,progress})).toBe(before);
  });
  it('explains shortcut benefits from its camp even when the party is elsewhere, including tactical reach',async()=>{
    const b={...board(),travelLimit:3},progress={...engine.derive(b,engine.emptyRun()),visited:['heater','river','lake','cooler','weather'],position:'cloud'};
    await render({board:b,progress,selected:'bridge'});
    expect(find('[data-shortcut-before]').textContent).toBe('5 spaces away');
    expect(find('[data-shortcut-range-benefit]').textContent).toContain('within the 3-space travel limit from this camp');
    await render({board:b,progress:{...progress,visited:['heater']},selected:'bridge',view:'list'});
    expect(find('[data-shortcut-preview]')).toBeNull();expect(find('[data-shortcut-before]').textContent).toBe('Route not open');
    expect(find('[data-shortcut-benefit]').textContent).toContain('without first exploring the spaces in between');expect(find('[data-shortcut-range-benefit]')).toBeNull();
  });
  it('never promises savings for an already direct connection and removes proposals after construction',async()=>{
    const b=board();b.projects.find(item=>item.id==='network').effect={kind:'path',targetId:'sequence'};
    const progress={...engine.derive(b,engine.emptyRun()),visited:['heater'],built:['network']};
    await render({board:b,progress,selected:'bridge'});expect(find('[data-shortcut-before]').textContent).toBe('1 space away');
    expect(find('[data-shortcut-benefit]').textContent).toContain('An equally short route is already open');
    await render({board:b,progress:{...progress,built:['bridge']},selected:'bridge'});
    expect(find('[data-shortcut-preview]')).toBeNull();expect(find('[data-shortcut-comparison]')).toBeNull();expect(find('[data-construction-preview-label]')).toBeNull();expect(find('[data-construction-endpoint="true"]')).toBeNull();expect(find('[data-shortcut-model="bridge"]')).toBeTruthy();
    await render({board:b,progress,selected:'research'});expect(find('[data-shortcut-preview]')).toBeNull();expect(find('[data-shortcut-comparison]')).toBeNull();
  });
  it('gives every 8–12-space board deterministic unique positions',()=>{
    for(let count=8;count<=12;count++){
      const b=board();while(b.locations.length<count){const node={...b.locations[2],id:'extra'+b.locations.length};b.edges.push([b.locations.at(-1).id,node.id]);b.locations.push(node);}
      const a=UI.tabletopLayout(b),copy=UI.tabletopLayout(structuredClone(b));expect(a).toEqual(copy);
      expect(Object.keys(a.positions)).toHaveLength(count);expect(new Set(Object.values(a.positions).map(p=>p.x+','+p.y)).size).toBe(count);
      for(const p of Object.values(a.positions)){expect(p.x).toBeGreaterThan(.05);expect(p.x).toBeLessThan(.95);expect(p.y).toBeGreaterThan(.05);expect(p.y).toBeLessThan(.95);}
    }
  });
  it('uses wider two-column location rows on narrow boards and keeps construction pieces under their own camp',async()=>{
    const previous=Object.getOwnPropertyDescriptor(window,'innerWidth');Object.defineProperty(window,'innerWidth',{configurable:true,value:320});restoreBrowserAPIs.push(()=>Object.defineProperty(window,'innerWidth',previous));
    const b=board(),run=engine.emptyRun(),before=JSON.stringify({b,run}),layout=UI.tabletopLayout(b,2);await render({board:b,run,view:'tabletop'});
    expect(find('[data-spatial-board]').dataset.boardColumns).toBe('2');expect(layout.columns).toBe(2);expect(layout.rows).toBe(3);
    for(const node of b.locations){const tile=find('[data-space-position="'+node.id+'"]');expect(tile.style.left).toBe(layout.positions[node.id].x*100+'%');expect(tile.style.top).toBe(layout.positions[node.id].y*100+'%');}
    for(const project of b.projects){const site=engine.buildSite(b,project),piece=find('[data-map-construction="'+project.id+'"]').parentElement;expect(piece.dataset.buildSite).toBe(site);expect(layout.projects[project.id].x).toBe(layout.positions[site].x);expect(piece.style.top).toBe(layout.projects[project.id].y*100+'%');}
    await click('[data-map-construction="bridge"]');await click('[data-tabletop-close]');expect(find('[data-spatial-board]').dataset.boardColumns).toBe('2');expect(JSON.stringify({b,run})).toBe(before);
    for(let count=8;count<=12;count++){const expanded=board();while(expanded.locations.length<count){const node={...expanded.locations[2],id:'extra'+expanded.locations.length};expanded.edges.push([expanded.locations.at(-1).id,node.id]);expanded.locations.push(node);}const narrow=UI.tabletopLayout(expanded,2);expect(new Set(Object.values(narrow.positions).map(p=>p.x+','+p.y)).size).toBe(count);expect(narrow.height).toBeGreaterThan(600);}
  });
  it('reserves camp clearance in deeply nested narrow maps without changing wider board layouts',()=>{
    const b=board(),before=JSON.stringify(b),regular=UI.tabletopLayout(b,2),nested=UI.tabletopLayout(b,2,28);
    const pixels=(layout,point)=>point.y*layout.height;
    for(const camp of b.starts){
      const projects=b.projects.filter(project=>engine.buildSite(b,project)===camp);if(!projects.length)continue;
      const first=Math.min(...projects.map(project=>pixels(nested,nested.projects[project.id])));
      expect(first-pixels(nested,nested.positions[camp])).toBeGreaterThanOrEqual(120);
      expect(pixels(nested,nested.positions[camp])).toBeCloseTo(pixels(regular,regular.positions[camp]));
    }
    const firstLocation=Math.min(...b.locations.filter(node=>!b.starts.includes(node.id)).map(node=>pixels(nested,nested.positions[node.id])));
    const lastProject=Math.max(...Object.values(nested.projects).map(point=>pixels(nested,point)));
    expect(firstLocation-lastProject).toBeGreaterThanOrEqual(109);
    expect(UI.tabletopLayout(b,3,28)).toEqual(UI.tabletopLayout(b,3));
    expect(JSON.stringify(b)).toBe(before);
  });
  it('asks the party to deliver when it is already home and to return only while away',async()=>{
    const b=board(),progress={...engine.derive(b,engine.emptyRun()),visited:['heater','river'],objectiveReady:true,complete:false};
    await render({board:b,progress,selected:'heater'});expect(find('[data-party-position]').textContent).toContain('Deliver at Heating station to finish');expect(find('[data-party-position]').textContent).not.toContain('Return to');
    await render({board:b,progress:{...progress,position:'river'},selected:'river'});expect(find('[data-party-position]').textContent).toContain('Return to Heating station to finish');
  });
  it('animates the exact connected path once without mutating progress or selection',async()=>{
    const b={...board(),goal:'expedition'},{run,arrived,route}=motionFixture(b),motion=mockMotion(),onSelect=vi.fn(),before=JSON.stringify(run),saved=JSON.stringify(arrived);
    expect(route).toEqual(['heater','river','lake']);
    await render({board:b,run,onSelect});expect(motion.animate).not.toHaveBeenCalled();
    await click('[data-location="lake"]');expect(motion.animate).not.toHaveBeenCalled();expect(onSelect).toHaveBeenCalledWith('lake');
    await render({board:b,run:arrived,onSelect});
    expect(motion.animate).toHaveBeenCalledTimes(1);const positions=UI.tabletopLayout(b).positions;
    expect(motion.animate.mock.calls[0][0]).toEqual(route.map(id=>({left:positions[id].x*100+'%',top:positions[id].y*100+'%'})));
    expect(find('[data-party-pawn="lake"]').dataset.partyMoving).toBe('true');expect(find('[data-party-pawn="lake"]').dataset.partyRoute).toBe('heater,river,lake');
    await render({board:b,run:arrived,selected:'cloud',onSelect});expect(motion.animate).toHaveBeenCalledTimes(1);
    vi.useFakeTimers();await act(async()=>motion.controls[0].finish());expect(find('[data-party-pawn="lake"]').dataset.partyMoving).toBe('false');
    expect(find('[data-party-pawn="lake"]').dataset.partyArrival).toBe('true');expect(find('.lb-pawn-arrival')).toBeTruthy();
    await act(async()=>vi.advanceTimersByTime(650));expect(find('[data-party-pawn="lake"]').dataset.partyArrival).toBe('false');expect(find('.lb-pawn-arrival')).toBeNull();
    expect(JSON.stringify(run)).toBe(before);expect(JSON.stringify(arrived)).toBe(saved);
  });
  it('uses a built bridge in the motion route and settles immediately when reduced motion is enabled',async()=>{
    const b={...board(),goal:'expedition'},site=engine.buildSite(b,'bridge'),{run,arrived,route}=motionFixture(b,true),motion=mockMotion();
    expect(engine.derive(b,run).built).toContain('bridge');expect(route).toEqual([site,'sequence']);
    await render({board:b,run});await render({board:b,run:arrived});
    expect(find('[data-party-pawn="sequence"]').dataset.partyRoute).toBe(route.join(','));expect(motion.animate.mock.calls[0][0]).toHaveLength(2);
    await act(async()=>motion.reduce());expect(motion.controls[0].cancel).toHaveBeenCalledTimes(1);expect(find('[data-party-pawn="sequence"]').dataset.partyMoving).toBe('false');
    const p=UI.tabletopLayout(b).positions.sequence;expect(find('[data-party-pawn="sequence"]').style.left).toBe(p.x*100+'%');
  });
  it.each([['reduced motion',true,false],['projected preview',false,true]])('keeps %s static even when the party position changes',async(_,reduced,projection)=>{
    const b={...board(),goal:'expedition'},motion=mockMotion(reduced),{run,arrived,route}=motionFixture(b);expect(route).toEqual(['heater','river','lake']);
    await render({board:b,run,projection});await render({board:b,run:arrived,projection});
    expect(motion.animate).not.toHaveBeenCalled();expect(find('[data-party-pawn="lake"]').dataset.partyMoving).toBe('false');expect(find('[data-party-pawn="lake"]').dataset.partyArrival).toBe('false');expect(find('.lb-pawn-arrival')).toBeNull();
  });
  it.each(['reduced motion','projected preview'])('clears arrival feedback when switching to %s',async(mode)=>{
    const b={...board(),goal:'expedition'},motion=mockMotion(),{run,arrived}=motionFixture(b);
    await render({board:b,run});await render({board:b,run:arrived});await act(async()=>motion.controls[0].finish());
    expect(find('[data-party-pawn="lake"]').dataset.partyArrival).toBe('true');
    if(mode==='reduced motion')await act(async()=>motion.reduce());else await render({board:b,run:arrived,projection:true});
    expect(find('[data-party-pawn="lake"]').dataset.partyArrival).toBe('false');expect(find('.lb-pawn-arrival')).toBeNull();expect(motion.animate).toHaveBeenCalledTimes(1);expect(engine.derive(b,arrived).position).toBe('lake');
  });
  it('cancels in-flight motion on unmount without changing the recorded party position',async()=>{
    const b={...board(),goal:'expedition'},motion=mockMotion(),{run,arrived}=motionFixture(b);
    await render({board:b,run});await render({board:b,run:arrived});
    await act(async()=>root.unmount());root=null;expect(motion.controls[0].cancel).toHaveBeenCalledTimes(1);expect(engine.derive(b,arrived).position).toBe('lake');
  });
  it('shows contract destinations and challenge identities without turning selection into a game action',async()=>{
    const b=board(),onSelect=vi.fn(),run=engine.emptyRun(),before=JSON.stringify(run);
    await render({board:b,run,contractTargets:['river'],onSelect});expect(find('[data-location="river"]').getAttribute('aria-label')).toContain('Contract destination');
    expect(find('[data-location="river"] [data-challenge-type="choice"]')).toBeTruthy();expect(find('[data-location="river"] .lb-spatial-contract')).toBeTruthy();
    expect(find('[data-board-terrain="river"]')).toBeTruthy();expect(find('[data-location="river"] [data-landmark="water"]')).toBeTruthy();
    await click('[data-location="river"]');expect(onSelect).toHaveBeenCalledWith('river');expect(JSON.stringify(run)).toBe(before);
    await render({board:b,run,view:'list',contractTargets:['river'],onSelect});expect(find('[data-location="river"]').textContent).toContain('Contract destination');expect(find('[data-location="river"]').textContent).toContain('Choose an answer');
  });
  it('identifies supply allocation and repair challenges consistently on the board and in the list',async()=>{
    const b=board();Object.assign(b.locations[2],{kind:'allocate',needs:['Greenhouse','Seed bed','Nursery'],budget:6,constraints:['Give the greenhouse three tokens, the seed bed two, and nursery one.'],allocation:[3,2,1]});
    Object.assign(b.locations[3],{kind:'repair',items:['Water vapour is a gas.','Ice is liquid water.','Evaporation makes vapour.'],repairs:[0,1,0],corrections:['','Ice is solid water.','']});
    await render({board:b,selected:'river'});expect(find('[data-location="river"] [data-challenge-type="allocate"]')).toBeTruthy();expect(find('[data-location="river"]').getAttribute('aria-label')).toContain('Distribute supplies');
    expect(find('[data-location="rain"] [data-challenge-type="repair"]')).toBeTruthy();expect(find('[data-location="rain"]').getAttribute('aria-label')).toContain('Find and repair faults');expect(find('[data-spatial-selection]').textContent).toContain('Distribute supplies');
    await render({board:b,view:'list'});expect(find('[data-location="river"]').textContent).toContain('Distribute supplies');expect(find('[data-location="rain"]').textContent).toContain('Find and repair faults');
  });
  it('shows authored base supplies in caches, accessible labels and the list, without including conditional bonuses',async()=>{
    const b=board(),run=engine.emptyRun(),progress={...engine.derive(b,run),bonus:[2,1]};b.locations.find(node=>node.id==='river').reward=[3,0];
    await render({board:b,run,progress,selected:'river',view:'tabletop'});
    const cache=find('[data-resource-cache="river"]');expect(cache).toBeTruthy();expect(cache.getAttribute('aria-hidden')).toBe('true');
    expect([...cache.querySelectorAll('[data-resource-amount]')].map(node=>node.dataset.resourceAmount)).toEqual(['3','0']);expect(cache.querySelectorAll('.lb-resource-pips i')).toHaveLength(3);
    expect(find('[data-location="river"]').getAttribute('aria-label')).toContain('Base supplies on success: 3 Observation tokens · 0 Connection tokens');
    expect(find('[data-spatial-selection] [data-resource-summary="river"]').textContent).toContain('3 Observation tokens');
    const saved=JSON.stringify({b,run,progress});await render({board:b,run,progress,selected:'river',view:'list'});
    expect(find('[data-location="river"] [data-resource-summary]').textContent).toContain('3 Observation tokens · 0 Connection tokens');expect(find('[data-resource-cache]')).toBeNull();expect(JSON.stringify({b,run,progress})).toBe(saved);
  });
  it('removes a cache only after its location is cleared and restores it when the exploration is undone',async()=>{
    const b=board(),progress=engine.derive(b,engine.emptyRun()),onSelect=vi.fn();
    await render({board:b,progress,onSelect});expect(element.querySelectorAll('[data-resource-cache]')).toHaveLength(b.locations.length);
    await click('[data-location="river"]');expect(onSelect).toHaveBeenCalledWith('river');expect(find('[data-resource-cache="river"]')).toBeTruthy();
    const cleared={...progress,visited:['river']};await render({board:b,progress:cleared,selected:'river'});expect(find('[data-resource-cache="river"]')).toBeNull();expect(find('[data-resource-summary="river"]')).toBeNull();expect(find('[data-location="river"]').getAttribute('aria-label')).not.toContain('Base supplies');
    await render({board:b,progress:cleared,selected:'river',view:'list'});expect(find('[data-location="river"] [data-resource-summary]')).toBeNull();
    await render({board:b,progress});expect(find('[data-resource-cache="river"]')).toBeTruthy();expect(cleared.visited).toEqual(['river']);
  });
  it('numbers the exact traversable preview and removes its steps when a destination cannot be reached',async()=>{
    const b=board(),progress={...engine.derive(b,engine.emptyRun()),visited:['heater','river'],position:'heater'};
    await render({board:b,progress,selected:'lake'});
    expect([...element.querySelectorAll('[data-route-step]')].map(node=>[node.dataset.routeStep,node.dataset.stepFrom,node.dataset.stepTo])).toEqual([['1','heater','river'],['2','river','lake']]);
    await render({board:b,progress,selected:'weather'});expect(find('[data-route-step]')).toBeNull();
    await render({board:b,progress:{...progress,complete:true},selected:'lake'});expect(find('[data-route-step]')).toBeNull();
    await render({board:b,progress,selected:'lake',view:'list'});expect(find('[data-route-step]')).toBeNull();expect(find('[data-location="lake"]').textContent).toContain('2 spaces away');
  });
  it('keeps destination and directional feedback tied to the selected legal route, including the reverse journey',async()=>{
    const b=board(),progress={...engine.derive(b,engine.emptyRun()),visited:['heater','river','lake'],position:'heater'},before=JSON.stringify(progress);
    await render({board:b,progress,selected:'lake',view:'tabletop'});
    expect(find('[data-position-disc="heater"]')).toBeTruthy();expect(find('[data-destination-ring="lake"]')).toBeTruthy();
    expect([...element.querySelectorAll('[data-route-direction]')].map(node=>node.dataset.routeDirection)).toEqual(['heater:river','river:lake']);
    const forward=find('[data-route-direction="river:lake"]').style.transform;
    await render({board:b,progress:{...progress,position:'lake'},selected:'heater',view:'tabletop'});
    expect(find('[data-position-disc="lake"]')).toBeTruthy();expect(find('[data-destination-ring="heater"]')).toBeTruthy();
    expect([...element.querySelectorAll('[data-route-direction]')].map(node=>node.dataset.routeDirection)).toEqual(['lake:river','river:heater']);
    expect(find('[data-route-direction="lake:river"]').style.transform).not.toBe(forward);
    await render({board:b,progress,selected:'weather',view:'tabletop'});expect(find('[data-destination-ring]')).toBeNull();expect(find('[data-route-direction]')).toBeNull();
    await render({board:b,progress:{...progress,complete:true},selected:'lake',view:'tabletop'});expect(find('[data-destination-ring]')).toBeNull();expect(find('[data-route-direction]')).toBeNull();
    expect(JSON.stringify(progress)).toBe(before);
  });
  it('replaces construction scaffolding with a finished foundation and shows actual use without changing its effect',async()=>{
    const b=board(),progress=engine.derive(b,engine.emptyRun()),before=JSON.stringify({b,progress});
    await render({board:b,progress,selected:'bridge',view:'tabletop'});
    const blueprint=find('[data-map-construction="bridge"]');expect(blueprint.querySelector('[data-miniature-foundation="blueprint"]')).toBeTruthy();expect(blueprint.querySelector('.lb-model-scaffold')).toBeTruthy();expect(blueprint.querySelector('[data-project-material="blueprint"]')).toBeTruthy();
    await render({board:b,progress:{...progress,built:['bridge'],usedProjects:['bridge']},selected:'bridge',view:'tabletop'});
    const built=find('[data-map-construction="bridge"]');expect(built.querySelector('[data-miniature-foundation="built"]')).toBeTruthy();expect(built.querySelector('.lb-model-scaffold')).toBeNull();expect(built.querySelector('[data-project-material="used"]')).toBeTruthy();
    expect(find('[data-spatial-selection]').textContent).toContain('Connects');expect(built.getAttribute('aria-label')).toContain('Used on this expedition');
    await render({board:b,progress,selected:'bridge',view:'list'});expect(find('[data-miniature-foundation]')).toBeNull();expect(find('[data-map-construction="bridge"]').textContent).toContain('Cost:');expect(JSON.stringify({b,progress})).toBe(before);
  });
  it('constructs a physical shortcut only on the built engine edge and preserves a fixed home landmark',async()=>{
    const b=board(),progress=engine.derive(b,engine.emptyRun());await render({board:b,progress,view:'tabletop'});
    expect(find('[data-shortcut-model]')).toBeNull();expect(find('[data-home-standard="heater"]')).toBeTruthy();expect(find('[data-tabletop-compass]')).toBeTruthy();
    const built={...progress,built:['bridge'],position:'river'},layout=UI.tabletopLayout(b),a=layout.positions[engine.buildSite(b,'bridge')],z=layout.positions.sequence;
    await render({board:b,progress:built,view:'tabletop'});const model=find('[data-shortcut-model="bridge"]');expect(model).toBeTruthy();
    expect([...model.querySelectorAll('path')].every(path=>path.getAttribute('d')===`M ${a.x*1000} ${a.y*700} L ${z.x*1000} ${z.y*700}`)).toBe(true);
    expect(find('[data-home-standard="heater"]')).toBeTruthy();expect(find('[data-party-pawn="river"]')).toBeTruthy();
    await render({board:b,progress,view:'board'});expect(find('[data-shortcut-model]')).toBeNull();expect(find('[data-home-standard="heater"]')).toBeTruthy();expect(built.built).toEqual(['bridge']);
  });
});
