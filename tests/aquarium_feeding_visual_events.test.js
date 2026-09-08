import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMServer, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function findElement(node,predicate) {
  if(!node||typeof node!=='object')return null;
  if(Array.isArray(node)){for(const child of node){const found=findElement(child,predicate);if(found)return found;}return null;}
  if(predicate(node))return node;
  return findElement(node.props?.children,predicate);
}

// Render the actual tool with its hooks, then invoke its own button handlers.
// The functional state updater is real; no feeding equations are duplicated.
function renderTank(patch={}) {
  resetStemLab();const tool=loadTool('stem_lab/stem_tool_aquarium.js','aquarium'),store=newStore();
  store.toolData={_aquarium:{
    mode:'tank',selectedTank:'freshwater',soundEnabled:false,simRunning:false,simTick:10,simDay:0,simHour:12,
    tutorialDismissed:true,fishIdentityVersion:3,nextFishInstanceId:3,
    tankFish:['neon','guppy'],fishInstanceIds:['fish-1','fish-2'],fishNames:{'fish-1':'Azure','fish-2':'Pearl'},
    hungerLevels:{'fish-1':50,'fish-2':60},fishStress:{},fishCareLog:{},quarantinedFish:{},
    tankPlants:[],plantHealth:{},plantBiomass:{},eventLog:[],
    waterChem:{temp:76,pH:7,ammonia:0,nitrite:0,nitrate:20,salinity:0,dissolvedO2:7,co2:3},
    lightsOn:true,equipment:{filter:0,heater:0,light:0,airPump:0},
    equipmentCondition:{filter:100,heater:100,light:100,airPump:100},equipmentFaults:{},...patch
  }};
  let element;
  function Capture(){element=tool.render(makeCtx({},store));return null;}
  function render(){ReactDOMServer.renderToStaticMarkup(React.createElement(Capture));return element;}
  render();
  return {
    store,render,get state(){return store.toolData._aquarium;},
    button(label){const result=findElement(element,node=>node.type==='button'&&node.props?.['aria-label']===label);expect(result,'Actual aquarium button '+label).toBeTruthy();return result;},
    click(label){this.button(label).props.onClick();},
    find(predicate){return findElement(element,predicate);}
  };
}
afterEach(()=>vi.restoreAllMocks());

describe('Aquarium feeding actions and visual records',()=>{
  it('records actual flake responders, excludes hospital stock, and increments events at the same simulation tick',()=>{
    const h=renderTank({tankFish:['neon','guppy','cory'],fishInstanceIds:['fish-1','fish-2','fish-3'],nextFishInstanceId:4,
      hungerLevels:{'fish-1':50,'fish-2':0,'fish-3':60},quarantinedFish:{'fish-3':true},
      aquariumFeedingEvent:{eventId:'prior',sequence:8,tick:9,foodType:'live',acceptedIds:[],scope:'display'}});
    h.click('Flake');
    const first=h.state.aquariumFeedingEvent;
    expect(first).toMatchObject({sequence:9,tick:10,foodType:'flake',targetId:null,acceptedIds:['fish-1'],scope:'display'});
    expect(h.state.hungerLevels).toMatchObject({'fish-1':15,'fish-2':0,'fish-3':60});
    expect(h.state.waterChem.ammonia).toBeCloseTo(.3);
    h.render();h.click('Flake');
    expect(h.state.aquariumFeedingEvent.sequence).toBe(10);expect(h.state.aquariumFeedingEvent.eventId).not.toBe(first.eventId);
    expect(h.state.aquariumFeedingEvent.tick).toBe(first.tick);
    h.render();h.click('Flake');
    expect(h.state.aquariumFeedingEvent.acceptedIds).toEqual([]);expect(h.state.aquariumFeedingEvent.sequence).toBe(11);
  });

  it('reports the actual mixed-diet live-food average and includes omnivore responses',()=>{
    const h=renderTank({selectedTank:'planted',tankFish:['betta','shrimp','oto'],fishInstanceIds:['carnivore','omnivore','herbivore'],nextFishInstanceId:4,
      hungerLevels:{carnivore:12,omnivore:8,herbivore:40}});
    h.click('Live');
    expect(h.state.hungerLevels).toMatchObject({carnivore:0,omnivore:0,herbivore:40});
    expect(h.state.feedingLog.avgHungerDrop).toBeCloseTo(20/3);
    // The planted preset is 40 US gal, twice the concentration model's reference volume.
    expect(h.state.feedingLog.ammoniaAdded).toBeCloseTo(.33);
    expect(h.state.waterChem.ammonia).toBeCloseTo(h.state.feedingLog.ammoniaAdded);
    expect(h.state.aquariumFeedingEvent.acceptedIds).toEqual(['carnivore','omnivore']);
    expect(h.state.feedingLog.tip).toContain('omnivores');
    expect(h.state.eventLog.at(-1).msg).toContain('1 carnivores and 1 omnivores');
    h.render();h.click('Live');
    expect(h.state.feedingLog.avgHungerDrop).toBe(0);expect(h.state.aquariumFeedingEvent.acceptedIds).toEqual([]);
    expect(h.state.feedingLog.tip).toContain('No displayed resident had lower hunger');
  });

  it('does not emit a feeding event for empty, all-hospital, or already-full guarded actions',()=>{
    const previous={eventId:'keep-this',sequence:4,tick:9,foodType:'flake',acceptedIds:[],scope:'display'};
    for(const patch of [{tankFish:[],fishInstanceIds:[]},{quarantinedFish:{'fish-1':true,'fish-2':true}}]){
      const h=renderTank({...patch,aquariumFeedingEvent:previous});
      // Invoke even disabled controls to exercise their defensive action guards.
      h.click('Flake');h.click('Live');
      expect(h.state.aquariumFeedingEvent).toEqual(previous);expect(h.state.waterChem.ammonia).toBe(0);
    }
    const full=renderTank({hungerLevels:{'fish-1':10,'fish-2':0},aquariumFeedingEvent:previous});
    full.click('Azure is full');
    expect(full.state.aquariumFeedingEvent).toEqual(previous);expect(full.state.hungerLevels['fish-1']).toBe(10);
  });

  it('distinguishes targeted display and hospital feeding while preserving hospital chemistry isolation',()=>{
    const h=renderTank({quarantinedFish:{'fish-2':true}});
    h.click('Feed Azure individually');
    expect(h.state.aquariumFeedingEvent).toMatchObject({foodType:'individual',targetId:'fish-1',acceptedIds:['fish-1'],scope:'display',sequence:1});
    expect(h.state.hungerLevels['fish-1']).toBe(20);expect(h.state.waterChem.ammonia).toBeCloseTo(.05);
    h.render();h.click('Feed Pearl individually');
    expect(h.state.aquariumFeedingEvent).toMatchObject({foodType:'individual',targetId:'fish-2',acceptedIds:['fish-2'],scope:'hospital',sequence:2});
    expect(h.state.hungerLevels['fish-2']).toBe(30);expect(h.state.waterChem.ammonia).toBeCloseTo(.05);
  });

  it('clears the feeding event when a new tank starts',()=>{
    const h=renderTank({selectedTank:null,tankFish:[],fishInstanceIds:[],aquariumFeedingEvent:{eventId:'old-tank',sequence:5,tick:8,scope:'display'}});
    const tankButton=h.find(node=>node.type==='button'&&/^Select tank:.*Freshwater/.test(node.props?.['aria-label']||''));
    expect(tankButton).toBeTruthy();tankButton.props.onClick();
    expect(h.state.selectedTank).toBe('freshwater');expect(h.state.aquariumFeedingEvent).toBeNull();
  });

  it('uses dark-period observation language instead of predicting universal fish rest',()=>{
    const h=renderTank();h.click('Toggle Lights');
    expect(h.state.lightsOn).toBe(false);
    expect(h.state.eventLog.at(-1).msg).toContain('compare oxygen as the dark period progresses');
    expect(h.state.eventLog.at(-1).msg).not.toContain('fish will rest');
  });
});
