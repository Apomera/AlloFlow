import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
const require=createRequire(import.meta.url),{makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs'),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
let UI,root,element;
beforeAll(()=>{window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;const code=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export * from './lesson_board_tabletop_ui.jsx';export {nextContractStep} from './lesson_board_contracts_ui.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'TravelUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});UI=new Function(code+';return TravelUI;')();});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();root=element=null;});
async function render(name,props){if(!root){element=document.createElement('div');document.body.append(element);root=createRoot(element);}await act(async()=>root.render(React.createElement(UI[name],{t:key=>key,...props})));}
function move(b,run,id){if(engine.stepOf(run).phase==='review')run=engine.merge(run,engine.advance(b,run));run=engine.merge(run,engine.begin(b,run,id));if(engine.stepOf(run).phase==='answer'){run.steps['t'+run.turn].answers={solo:{value:engine.solution(b.locations.find(node=>node.id===id)),correct:true}};run=engine.merge(run,engine.resolve(b,run,{solo:{}}));}return run;}
function longRoute(){const b={...makeBoard(),playStyle:'tabletop',travelLimit:3},ids=['heater','cloud','river','rain','lake','sequence','cooler','weather'];b.edges=ids.slice(1).map((id,i)=>[ids[i],id]);return {b,ids};}
describe('Tactical travel guidance',()=>{
 it('shows a legal cleared waypoint without moving or changing the selected destination',async()=>{
  const {b,ids}=longRoute();let run=ids.slice(0,-1).reduce((r,id)=>move(b,r,id),engine.emptyRun());const before=JSON.stringify(run),onSelect=vi.fn();
  await render('TabletopPreview',{board:b,run,target:b.locations[0],onSelect});expect(element.querySelector('[data-travel-distance]').textContent).toContain('6 segments');expect(element.querySelector('[data-travel-waypoint]').textContent).toContain('Rain observatory');
  await act(async()=>element.querySelector('[data-inspect-waypoint]').click());expect(onSelect).toHaveBeenCalledWith('rain');expect(engine.targets(b,run).some(node=>node.id==='rain')).toBe(true);expect(JSON.stringify(run)).toBe(before);
  await render('TabletopRules',{board:b});expect(element.textContent).toContain('up to 3 segments');expect(element.textContent).toContain('Deliver discoveries');
 });
 it('guides a contract through an in-range waypoint before a remote frontier',()=>{
  const {b,ids}=longRoute();b.contracts=[{id:'survey',title:'Survey',description:'Visit the stations.',locations:['cloud','weather'],reward:[1,1]}];let run=ids.slice(0,-1).reduce((r,id)=>move(b,r,id),engine.emptyRun());run=move(b,move(b,run,'rain'),'heater');
  const next=UI.nextContractStep(b,run,engine.contractProgress(b,run)[0]);expect(next).toMatchObject({id:'rain',destination:'weather',via:true});expect(engine.targets(b,run).some(node=>node.id===next.id)).toBe(true);
 });
 it('offers explicit delivery at home and gives a delivery recap without a fabricated journey',async()=>{
  const b={...makeBoard(),playStyle:'tabletop'};let run=['heater','cloud','heater','bridge','sequence','heater','research'].reduce((r,id)=>move(b,r,id),engine.emptyRun());const target=b.locations[0];
  expect(UI.tabletopActionLabel(b,run,target,key=>key)).toBe('Deliver discoveries');await render('TabletopHud',{board:b,run});expect(element.textContent).toContain('Deliver them at camp');expect(element.textContent).not.toContain('Visit another space');
  run=move(b,run,'heater');await render('TabletopTravelRecap',{board:b,run});expect(element.textContent).toContain('Discoveries delivered');expect(element.textContent).not.toContain('party arrived');expect(element.querySelector('.lb-tabletop-route')).toBeNull();
 });
});
