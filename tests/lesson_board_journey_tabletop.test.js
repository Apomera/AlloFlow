import {beforeAll,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import * as engine from '../lesson_board_engine.js';
import {destinationJourney} from '../lesson_board_journey.js';
import {spatialState} from '../lesson_board_spatial.js';
// Tabletop spaces keep a short name; their details are the accessible description.
const spoken=node=>[node?.getAttribute('aria-label'),...(node?.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean).map(id=>document.getElementById(id)?.textContent)].filter(Boolean).join('. ');
const require=createRequire(import.meta.url),React=require('../desktop/web-app/node_modules/react'),{createRoot}=require('../desktop/web-app/node_modules/react-dom/client'),{act}=React;
const {makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs');
let UI,root,element;
const board=()=>({...makeBoard(),playStyle:'tabletop',chance:true,goal:'expedition'}),find=selector=>element.querySelector(selector),all=selector=>[...element.querySelectorAll(selector)];
const edgeKey=(a,b)=>[a,b].sort().join(':');
const progress=b=>({...engine.derive(b,engine.emptyRun()),visited:['heater','cloud'],position:'cloud',fieldLead:{targetId:'cooler',reward:[2,1],turn:1,id:'survey'}});
const alternative=()=>{
  const b={...board(),travelLimit:3,edges:[['heater','river'],['river','cooler'],['heater','cloud'],['cloud','rain'],['rain','lake'],['lake','cooler'],['river','sequence'],['sequence','weather']]};
  return {b,p:{...progress(b),visited:['heater','cloud','rain','lake'],position:'heater'}};
};
async function render(props={}){
  if(!root){element=document.createElement('div');element.className='lb';document.body.append(element);root=createRoot(element);}
  const b=props.board||board(),p=props.progress||progress(b);
  await act(async()=>root.render(React.createElement(UI.BoardMap,{board:b,run:engine.emptyRun(),progress:p,ready:spatialState(b,p).moves.map(item=>item.id),selected:'cooler',view:'tabletop',Icon:()=>null,t:key=>key,...props})));
}
const click=async selector=>{await act(async()=>find(selector).click());};
beforeAll(()=>{
  window.React=React;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const source=require('node:child_process').execFileSync(process.execPath,['-e',"process.stdout.write(require('esbuild').buildSync({stdin:{contents:\"export {BoardMap} from './lesson_board_map.jsx';\",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'JourneyTabletopUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"],{encoding:'utf8'});
  UI=new Function(source+';return JourneyTabletopUI;')();
});
afterEach(async()=>{if(root)await act(async()=>root.unmount());element?.remove();root=element=null;vi.restoreAllMocks();});

describe('Destination journey on the tabletop',()=>{
  it('shows only the selected real active destination, without suggesting new connections',async()=>{
    const b=board(),p=progress(b),before=JSON.stringify(p);await render({board:b,progress:p});
    expect(find('[data-journey-overlay="cooler"]')).toBeTruthy();
    const route=destinationJourney(b,p,'cooler').routes[0],next=spatialState(b,p).moves.find(move=>move.id===route.nextId);
    const legal=new Set(next.path.slice(1).map((id,index)=>edgeKey(next.path[index],id)));
    const existing=new Set(spatialState(b,p).routes.map(({from,to})=>edgeKey(from,to)));
    for(const edge of all('[data-journey-edge]')){
      const key=edgeKey(...edge.dataset.journeyEdge.split(':'));
      expect(existing.has(key)).toBe(true);expect(edge.dataset.journeyCurrent).toBe(String(legal.has(key)));
    }
    expect(all('[data-journey-current="false"]').length).toBeGreaterThan(0);
    expect(find('[data-location="cooler"]').dataset.state).toBe('locked');
    expect(spoken(find('[data-location="'+route.nextId+'"]'))).toContain('Next journey waypoint');
    expect(find('[data-journey-map-help]').textContent).toContain('Dots suggest later travel');
    expect(JSON.stringify(p)).toBe(before);
  });

  it('compares a shorter investigation route with a longer cleared route and respects travel limits',async()=>{
    const {b,p}=alternative(),before=JSON.stringify({b,p}),random=vi.spyOn(Math,'random');await render({board:b,progress:p});
    expect(find('[data-journey-overlay]').dataset.journeyOverlayRoute).toBe('direct');
    expect(find('[data-location="river"]').dataset.journeyWaypoint).toBe('true');
    expect(find('[data-journey-next="river"]').textContent).toContain('Next investigation');
    expect(all('[data-journey-edge]').map(node=>node.dataset.journeyEdge)).toEqual(['heater:river','river:cooler']);
    await click('[data-journey-option="discovery"]');
    expect(find('[data-journey-overlay]').dataset.journeyOverlayRoute).toBe('discovery');
    expect(find('[data-location="lake"]').dataset.journeyWaypoint).toBe('true');
    expect(find('[data-journey-next="lake"]').textContent).toContain('Next travel stop');
    expect(all('[data-journey-current="true"]').map(node=>node.dataset.journeyEdge)).toEqual(['heater:cloud','cloud:rain','rain:lake']);
    expect(all('[data-journey-current="false"]').map(node=>node.dataset.journeyEdge)).toEqual(['lake:cooler']);
    expect(find('[data-journey-investigations]').textContent).toBe('1');
    expect(find('[data-journey-turns]').textContent).toBe('2');
    expect(random).not.toHaveBeenCalled();expect(JSON.stringify({b,p})).toBe(before);
  });

  it('keeps journey choice and inspection equivalent in 3D, 2D and accessible list views',async()=>{
    const {b,p}=alternative(),onSelect=vi.fn();
    for(const view of ['tabletop','board','list']){
      await render({board:b,progress:p,onSelect,view});await click('[data-journey-option="discovery"]');
      expect(find('[data-journey-tabletop="cooler"] [data-journey-route]').dataset.journeyRoute).toBe('discovery');
      expect(find('[data-location="lake"]').dataset.journeyWaypoint).toBe('true');
      expect(find('[data-journey-inspect="lake"]').disabled).toBe(false);
      if(view==='list'){
        expect(find('[data-journey-overlay]')).toBeNull();
        expect(find('[data-location="lake"]').textContent).toContain('Next journey waypoint');
        expect(find('[data-journey-map-help]').textContent).toContain('Investigate unresolved stops');
      }else expect(find('[data-journey-overlay]')).toBeTruthy();
      await click('[data-journey-inspect="lake"]');
    }
    expect(onSelect).toHaveBeenCalledTimes(3);expect(onSelect).toHaveBeenLastCalledWith('lake');
    expect(p.position).toBe('heater');expect(p.visited).not.toContain('cooler');
  });

  it('leaves the existing legal selected-move preview clear when the destination is next',async()=>{
    const b=board(),p={...progress(b),position:'river',visited:['heater','cloud','river','lake']};
    await render({board:b,progress:p});
    const preview=all('[data-route-preview="true"]');expect(preview).toHaveLength(2);
    expect(all('[data-journey-edge]')).toHaveLength(0);
    expect(find('[data-location="cooler"]').dataset.journeyWaypoint).toBe('true');
    expect(all('[data-route-step]')).toHaveLength(2);
    expect(find('[data-journey-turns]').textContent).toBe('1');
  });

  it('shows only the chosen journey when a longer explored route also reaches the destination now',async()=>{
    const {b,p}=alternative();delete b.travelLimit;await render({board:b,progress:p});
    expect(all('[data-route-preview="true"]')).toHaveLength(0);
    expect(all('[data-route-step]')).toHaveLength(0);
    expect(all('[data-journey-edge]').map(node=>node.dataset.journeyEdge)).toEqual(['heater:river','river:cooler']);
    expect(find('[data-spatial-selection]').textContent).toContain('An explored route also reaches this destination in one move: 4 spaces.');
    await click('[data-journey-option="discovery"]');
    expect(all('[data-route-preview="true"]')).toHaveLength(4);
    expect(all('[data-route-step]')).toHaveLength(4);
    expect(all('[data-journey-edge]')).toHaveLength(0);
    expect(find('[data-location="cooler"]').dataset.journeyWaypoint).toBe('true');
  });

  it('updates the next stop after progress and removes advice after the destination is investigated',async()=>{
    const {b,p}=alternative();await render({board:b,progress:p});
    expect(find('[data-location="river"]').dataset.journeyWaypoint).toBe('true');
    const later={...p,position:'river',visited:[...p.visited,'river']};await render({board:b,progress:later});
    expect(find('[data-location="cooler"]').dataset.journeyWaypoint).toBe('true');
    expect(find('[data-journey-turns]').textContent).toBe('1');
    await render({board:b,progress:{...later,position:'cooler',visited:[...later.visited,'cooler'],fieldLead:null}});
    expect(find('[data-journey-overlay]')).toBeNull();expect(find('[data-journey-tabletop]')).toBeNull();
    expect(find('[data-location][data-journey-waypoint="true"]')).toBeNull();
  });

  it('omits journey advice for other selections, projections, chance-free boards and completed games',async()=>{
    const b=board(),p=progress(b);
    for(const props of [{selected:'river'},{selected:undefined},{projection:true},{board:{...b,chance:false}},{progress:{...p,complete:true}},{progress:{...p,fieldLead:null}}]){
      await render({board:b,progress:p,...props});
      expect(find('[data-journey-overlay]')).toBeNull();expect(find('[data-journey-tabletop]')).toBeNull();
      expect(find('[data-location][data-journey-waypoint="true"]')).toBeNull();
    }
  });

  it('preserves the selected journey across camera changes and disables unavailable inspection',async()=>{
    const {b,p}=alternative();await render({board:b,progress:p});await click('[data-journey-option="discovery"]');
    const edges=all('[data-journey-edge]').map(node=>node.dataset.journeyEdge);
    for(const camera of ['left','right','overhead','angle']){
      await click('[data-tabletop-camera="'+camera+'"]');
      expect(find('[data-journey-overlay]').dataset.journeyOverlayRoute).toBe('discovery');
      expect(all('[data-journey-edge]').map(node=>node.dataset.journeyEdge)).toEqual(edges);
    }
    expect(find('[data-journey-inspect]').disabled).toBe(true);
    expect(p.position).toBe('heater');
  });
});
