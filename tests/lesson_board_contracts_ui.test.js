import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
import {soloWorkspace,saveSolo,readSolo} from '../lesson_board_storage.js';
import {boardChanges,fixGroups} from '../lesson_board_quality.js';
const require=createRequire(import.meta.url),{makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs'),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
const board=()=>({...makeBoard(),playStyle:'tabletop',contracts:[{id:'survey',title:'Water survey',description:'Explore the stations for bonus supplies.',locations:['heater','cloud'],reward:[0,2]}]});
let UI,root,element;
beforeAll(()=>{window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;const code=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({entryPoints:['lesson_board_contracts_ui.jsx'],bundle:true,write:false,format:'iife',globalName:'Contracts',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});UI=new Function(code+';return Contracts;')();});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();root=element=null;localStorage.clear();});
async function render(name,props){if(!root){element=document.createElement('div');document.body.append(element);root=createRoot(element);}await act(async()=>root.render(React.createElement(UI[name],{t:key=>key,...props})));}
const click=async selector=>{await act(async()=>element.querySelector(selector).click());};
function move(b,run,id){if(engine.stepOf(run).phase==='review')run=engine.merge(run,engine.advance(b,run));run=engine.merge(run,engine.begin(b,run,id));if(engine.stepOf(run).phase==='answer'){run.steps['t'+run.turn].answers={solo:{value:engine.solution(b.locations.find(node=>node.id===id)),correct:true}};run=engine.merge(run,engine.resolve(b,run,{solo:{}}));}return run;}

describe('Expedition contract guidance',()=>{
  it('suggests only a reachable frontier stop before a distant destination, with no gameplay mutation',()=>{
    const b=board();b.contracts[0].locations=['lake','weather'];let run=engine.emptyRun();
    const before=JSON.stringify(run),initial=UI.nextContractStep(b,run,engine.contractProgress(b,run)[0]);
    expect(initial).toMatchObject({id:'heater',destination:'lake',via:true});expect(engine.targets(b,run).some(node=>node.id===initial.id)).toBe(true);expect(JSON.stringify(run)).toBe(before);
    run=move(b,run,'heater');const next=UI.nextContractStep(b,run,engine.contractProgress(b,run)[0]);expect(next).toMatchObject({id:'river',destination:'lake',path:['heater','river','lake'],via:true});expect(engine.targets(b,run).some(node=>node.id===next.id)).toBe(true);
  });
  it('stops before home at the tactical range limit so a ready mission can still finish its optional contract',()=>{
    const b=board();b.travelLimit=3;b.starts=['heater','sequence'];
    b.edges=[['heater','cloud'],['cloud','rain'],['rain','sequence'],['sequence','weather'],['heater','river'],['river','lake'],['lake','cooler']];
    b.projects.find(project=>project.id==='research').cost=[1,1];
    Object.assign(b.projects.find(project=>project.id==='network'),{id:'workshop',cost:[1,1]});
    b.contracts[0].locations=['heater','river'];
    let run=['heater','cloud','rain','sequence','research','workshop','weather','sequence'].reduce((current,id)=>move(b,current,id),engine.emptyRun());
    expect(engine.derive(b,run)).toMatchObject({position:'sequence',objectiveReady:true,complete:false});
    const before=JSON.stringify(run),next=UI.nextContractStep(b,run,engine.contractProgress(b,run)[0]);
    expect(next).toEqual({id:'cloud',destination:'river',path:['sequence','rain','cloud','heater','river'],via:true});
    expect(engine.targets(b,run).some(node=>node.id===next.id)).toBe(true);
    expect(JSON.stringify(run)).toBe(before);
    run=move(b,run,next.id);
    expect(engine.derive(b,run).complete).toBe(false);
    const onward=UI.nextContractStep(b,run,engine.contractProgress(b,run)[0]);
    expect(onward).toMatchObject({id:'river',destination:'river',via:false});
    run=move(b,run,onward.id);
    expect(engine.derive(b,run)).toMatchObject({position:'river',complete:false,completedContracts:['survey']});
  });
  it('gives no contract waypoint when an unresolved home would finish the mission before the destination',()=>{
    const b=board();b.travelLimit=3;b.starts=['heater','sequence'];
    b.edges=[['heater','sequence'],['heater','river'],['sequence','rain'],['rain','cloud'],['cloud','weather'],['weather','cooler'],['cooler','lake']];
    b.projects.find(project=>project.id==='research').cost=[1,1];
    Object.assign(b.projects.find(project=>project.id==='network'),{id:'workshop',cost:[1,1]});
    b.contracts[0].locations=['rain','river'];
    const run=['sequence','rain','cloud','sequence','research','workshop','weather'].reduce((current,id)=>move(b,current,id),engine.emptyRun());
    expect(engine.derive(b,run)).toMatchObject({position:'weather',objectiveReady:true,complete:false});
    expect(engine.derive(b,run).visited).not.toContain('heater');
    const before=JSON.stringify(run);
    expect(UI.nextContractStep(b,run,engine.contractProgress(b,run)[0])).toBeNull();
    expect(JSON.stringify(run)).toBe(before);
    b.contracts[0].locations=['heater','river'];
    expect(UI.nextContractStep(b,run,engine.contractProgress(b,run)[0])).toBeNull();
  });
  it('leaves a terminal home destination until the other contract investigation is complete',()=>{
    const b=board();b.travelLimit=3;b.starts=['heater','sequence'];
    b.edges=[['heater','sequence'],['heater','river'],['sequence','rain'],['rain','cloud'],['cloud','weather'],['weather','cooler'],['cooler','lake']];
    b.projects.find(project=>project.id==='research').cost=[1,1];
    Object.assign(b.projects.find(project=>project.id==='network'),{id:'workshop',cost:[1,1]});
    b.contracts[0].locations=['heater','lake'];
    let run=['sequence','rain','cloud','sequence','research','workshop','weather','sequence'].reduce((current,id)=>move(b,current,id),engine.emptyRun());
    expect(engine.derive(b,run)).toMatchObject({position:'sequence',objectiveReady:true,complete:false});
    expect(engine.derive(b,run).visited).not.toContain('heater');
    const before=JSON.stringify(run),next=UI.nextContractStep(b,run,engine.contractProgress(b,run)[0]);
    expect(next).toMatchObject({id:'weather',destination:'lake',via:true});
    expect(engine.targets(b,run).some(node=>node.id===next.id)).toBe(true);
    expect(JSON.stringify(run)).toBe(before);
    for(const id of ['weather','cooler','lake'])run=move(b,run,id);
    expect(engine.derive(b,run).complete).toBe(false);
    expect(UI.nextContractStep(b,run,engine.contractProgress(b,run)[0])).toMatchObject({destination:'heater'});
  });
  it('tracks and inspects a route without dispatching movement, and preserves tracking across storage',async()=>{
    const b=board(),run=engine.emptyRun(),onTrack=vi.fn(),onInspect=vi.fn();
    await render('ContractHand',{board:b,run,trackedId:'survey',onTrack,onInspect});await click('[data-contract-next=survey]');expect(onInspect).toHaveBeenCalledWith('heater');await click('[data-track-contract=survey]');expect(onTrack).toHaveBeenCalledWith('');expect(engine.derive(b,run).visited).toEqual([]);
    expect(saveSolo(localStorage,b,'contracts','u',{run,workspace:{view:'tabletop',contractGoal:'survey'}}).status).toBe('saved');expect(readSolo(localStorage,b,'contracts','u').workspace).toMatchObject({view:'tabletop',contractGoal:'survey'});
    expect(soloWorkspace(b,run,{contractGoal:'missing'})).not.toHaveProperty('contractGoal');const legacy={...b};delete legacy.playStyle;expect(soloWorkspace(legacy,run,{contractGoal:'survey'})).not.toHaveProperty('contractGoal');
  });
  it('shows the earned bonus only on the completing move and hides future route guidance',async()=>{
    const b=board();let run=move(b,engine.emptyRun(),'heater');await render('ContractRewards',{board:b,run});expect(element.querySelector('[data-contract-reward]')).toBeNull();
    run=move(b,run,'cloud');await render('ContractRewards',{board:b,run});expect(element.textContent).toContain('+2 Connection tokens');expect(element.textContent).toContain('included in this move');
    expect(UI.nextContractStep(b,run,engine.contractProgress(b,run)[0])).toBeNull();await render('ContractHand',{board:b,run});expect(element.querySelector('[data-track-contract]')).toBeNull();expect(element.querySelector('[data-contract]')?.dataset.complete).toBe('true');
    run=move(b,run,'heater');await render('ContractRewards',{board:b,run});expect(element.querySelector('[data-contract-reward]')).toBeNull();
  });
  it('lets authors remove the final optional contract while preserving the board and reports contract revisions',async()=>{
    const b=board(),onChange=vi.fn();await render('ContractEditor',{board:b,onChange});await click('[data-remove-contract=survey]');const next=onChange.mock.calls[0][0];expect(next).not.toHaveProperty('contracts');expect(next.locations).toBe(b.locations);expect(engine.validateBoard(next)).toEqual([]);expect(boardChanges(b,next).contracts).toBe(true);expect(fixGroups(['contracts'])).toEqual(['contracts']);
  });
});
