import { describe, it, expect, afterEach, vi } from 'vitest';
import { loadTool, resetStemLab, newStore, makeCtx, React } from './helpers/stem_widgets_smoke_harness.js';

function emptyGrid() {
  return Array.from({ length: 16 }, () => ({ plantId: null, growthDay: 0, health: 100, watered: false, pests: 0 }));
}
function garden(overrides = {}) {
  const grid = emptyGrid();
  grid[0].plantId = 'corn'; grid[1].plantId = 'beans'; grid[4].plantId = 'squash';
  return { grid, phase: 'grow', day: 0, budget: 41, moisture: 60, ...overrides };
}
function harness(seed = garden()) {
  resetStemLab();
  const config = loadTool('stem_lab/stem_tool_companionplanting.js', 'companionPlanting');
  const store = newStore({ companionPlanting: { gardenMode: 'community', communityGarden: seed } });
  const awardXP = vi.fn(), saveSnapshot = vi.fn();
  const state = () => store.toolData.companionPlanting.communityGarden;
  const tree = () => config.render(makeCtx({ toolData: store.toolData, awardXP, saveSnapshot }, store));
  function find(key, value = true) {
    const visit = node => {
      if (Array.isArray(node)) { for (const child of node) { const match = visit(child); if (match) return match; } return null; }
      if (!React.isValidElement(node)) return null;
      if (node.props[key] === value) return node;
      return visit(node.props.children);
    };
    const node = visit(tree());
    if (!node) throw new Error(`Control not found: ${key}=${value}`);
    return node;
  }
  return { state, store, awardXP, saveSnapshot, find,
    click: (key, value = true) => find(key, value).props.onClick(),
    change: (key, value) => find(key).props.onChange({ target: { value } }),
    patch: patch => Object.assign(state(), patch),
  };
}

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Companion Planting garden gameplay', () => {
  it('connects a first-plant preview to the garden and back without spending or planting', () => {
    const app=harness(garden({grid:emptyGrid(),phase:'plan',plantingTarget:4,selectedPlant:'beans',placementPreview:{plot:4,plantId:'beans'}}));
    const before=structuredClone(app.state()),canvas={_hoverCell:12,_cgRequestDraw:vi.fn()};window.__cgCanvasEl=canvas;
    try {
      expect(app.find('data-play-garden-views').props.hidden).toBe(false);
      expect(app.find('aria-describedby','community-plot-help').props['aria-label']).toContain('Previewing Beans in Plot 5. Not planted');
      app.click('data-preview-show-garden');expect(canvas._hoverCell).toBe(-1);expect(canvas._cgRequestDraw).toHaveBeenCalledOnce();
      app.click('data-play-preview-return',4);expect(app.state()).toEqual(before);
      app.patch({maximized:true});app.click('data-play-preview-return',4);
      expect(app.state().maximized).toBe(false);expect(app.state().placementPreview).toEqual(before.placementPreview);
      expect(app.state().grid).toEqual(before.grid);expect(app.state().budget).toBe(before.budget);
    } finally {delete window.__cgCanvasEl;}
  });

  it('animates only a confirmed affordable planting and preserves its zero-day seed stage', () => {
    const grid=emptyGrid(),app=harness(garden({grid,phase:'plan',day:35,plantingTarget:4,selectedPlant:'beans',placementPreview:{plot:4,plantId:'beans'}}));
    const canvas={_hoverCell:0,_cgRequestDraw:vi.fn()};window.__cgCanvasEl=canvas;
    try {
      app.click('data-confirm-placement-preview');
      expect(canvas._plantBurst).toEqual({idx:4,plantId:'beans',day:35,t0:null});
      expect(canvas._hoverCell).toBe(-1);expect(canvas._cgRequestDraw).toHaveBeenCalledOnce();
      expect(app.state().grid[4]).toMatchObject({plantId:'beans',growthDay:0,health:100});
      expect(app.state().day).toBe(35);expect(app.state().budget).toBeLessThan(41);expect(app.state().placementPreview).toBeNull();
      expect(app.find('aria-describedby','community-plot-help').props['aria-label']).not.toContain('Not planted');
      delete canvas._plantBurst;canvas._cgRequestDraw.mockClear();
      app.patch({grid:emptyGrid(),budget:0,plantingTarget:4,selectedPlant:'beans',placementPreview:{plot:4,plantId:'beans'}});
      app.click('data-confirm-placement-preview');
      expect(canvas._plantBurst).toBeUndefined();expect(canvas._cgRequestDraw).not.toHaveBeenCalled();
      expect(app.state().grid[4].plantId).toBeNull();expect(app.state().budget).toBe(0);
    } finally {delete window.__cgCanvasEl;}
  });

  it('locates an inspected crop and returns to details without changing garden state', () => {
    const app=harness(garden({playShowPlots:true}));
    app.click('data-play-plot',1);
    const before=structuredClone(app.state());
    const canvas={_hoverCell:9,_cgRequestDraw:vi.fn()};window.__cgCanvasEl=canvas;
    try {
      app.click('data-play-focus-locate',1);
      expect(canvas._hoverCell).toBe(-1);
      expect(canvas._cgLocate).toEqual({index:1,plantId:'beans',t0:null});
      expect(canvas._cgRequestDraw).toHaveBeenCalledOnce();
      app.click('data-play-selection-return',1);
      expect(app.state()).toEqual(before);
      app.patch({maximized:true});app.click('data-play-selection-return',1);
      expect(app.state().maximized).toBe(false);expect(app.state().relationshipFocus).toBe(1);
      expect(app.find('aria-describedby','community-plot-help').props['aria-label']).toContain('Selected Plot 2 · Beans.');
    } finally {delete window.__cgCanvasEl;}
  });

  it('updates selected-plot controls while browsing crops and clears them on close', () => {
    const app=harness(garden({playShowPlots:true}));
    app.click('data-play-plot',0);
    expect(app.find('data-play-selection-return',0)).toBeTruthy();
    app.click('data-play-focus-step',1);
    expect(app.find('data-play-selection-return',1)).toBeTruthy();
    expect(app.find('data-play-focus-locate',1)).toBeTruthy();
    app.click('data-play-focus-step',1);
    expect(app.find('data-play-selection-return',4)).toBeTruthy();
    app.click('data-play-focus-close');
    expect(()=>app.find('data-play-selection-return',4)).toThrow();
    expect(app.find('aria-describedby','community-plot-help').props['aria-label']).not.toContain('Selected Plot');
  });

  it('restores valid habitat selections and hides stale or preview-conflicting selection controls', () => {
    const grid=emptyGrid();grid[0]={...grid[0],plantId:'rain_barrel'};
    const app=harness(garden({grid,relationshipLens:true,relationshipFocus:0,phase:'plan',playShowPlots:true}));
    expect(app.find('data-play-focus-locate',0)).toBeTruthy();
    expect(app.find('data-play-selection-return',0)).toBeTruthy();
    app.click('data-play-plot',1);app.click('data-planting-candidate','radish');
    app.patch({relationshipLens:true,relationshipFocus:0});
    expect(()=>app.find('data-play-selection-return',0)).toThrow();
    expect(app.find('aria-describedby','community-plot-help').props['aria-label']).not.toContain('Selected Plot');
    app.patch({placementPreview:null,relationshipFocus:20});
    expect(()=>app.find('data-play-selection-return',20)).toThrow();
    app.patch({relationshipFocus:0,grid:emptyGrid()});
    expect(()=>app.find('data-play-selection-return',0)).toThrow();
  });

  it('flags actual low-health and pest plots while excluding empty beds and structures', () => {
    const grid=emptyGrid();
    grid[0]={...grid[0],plantId:'corn',health:20,pests:50};
    grid[1]={...grid[1],plantId:'beans',health:40};
    grid[4]={...grid[4],plantId:'squash',health:40.1,pests:30.1};
    grid[5]={...grid[5],plantId:'radish',health:40.1,pests:30};
    grid[6]={...grid[6],plantId:'rain_barrel',health:0,pests:70};
    const app=harness(garden({grid}));
    expect(app.find('data-play-crop-condition-guide',3)).toBeTruthy();
    expect(app.find('aria-describedby','community-plot-help').props['aria-label']).toContain('3 crops have low health or high pest pressure');
    app.patch({grid:grid.map(c=>({...c,health:100,pests:0}))});
    expect(()=>app.find('data-play-care-review')).toThrow();
    expect(app.find('aria-describedby','community-plot-help').props['aria-label']).not.toContain('low health or high pest pressure');
  });

  it('opens the highest-priority care inspection from natural view without changing the garden', () => {
    const grid=emptyGrid();grid[0]={...grid[0],plantId:'corn',health:35};grid[1]={...grid[1],plantId:'beans',health:18};
    const app=harness(garden({grid})),before=structuredClone(app.state());
    app.click('data-play-care-review');
    expect(app.state().playGardenLens).toBe('care');
    app.click('data-play-lens-inspect',1);
    expect(app.find('data-play-focus',1)).toBeTruthy();
    expect(app.find('data-botanical-condition','critical')).toBeTruthy();
    expect(app.state().playLensReturn).toBe('care');
    app.click('data-play-focus-close');
    expect(app.state().playLensReturn).toBeNull();
    expect(app.state().playGardenLens).toBe('care');
    expect(app.state().grid).toEqual(before.grid);
    expect(app.state().day).toBe(before.day);expect(app.state().budget).toBe(before.budget);
  });

  it('clears a resolved pest marker after weeding without claiming a health recovery', () => {
    const grid=emptyGrid();grid[0]={...grid[0],plantId:'corn',health:18,pests:35};grid[1]={...grid[1],plantId:'beans',health:100,pests:45};
    const app=harness(garden({grid,day:14}));
    expect(app.find('data-play-crop-condition-guide',2)).toBeTruthy();
    app.click('data-play-weed');
    expect(app.state().grid[0].health).toBe(18);expect(app.state().grid[1].pests).toBe(25);
    expect(app.find('data-play-crop-condition-guide',1)).toBeTruthy();
    expect(app.find('aria-describedby','community-plot-help').props['aria-label']).toContain('1 crop has low health');
    expect(app.state().day).toBe(14);
  });

  it('keeps the health guide out of placement previews and preserves the staged crop', () => {
    const grid=emptyGrid();grid[0]={...grid[0],plantId:'corn',health:18};
    const app=harness(garden({grid,phase:'plan',plantingTarget:1,playShowPlots:true}));
    app.click('data-play-plot',1);app.click('data-planting-candidate','radish');
    const preview=structuredClone(app.state().placementPreview);
    expect(()=>app.find('data-play-care-review')).toThrow();
    expect(app.state().placementPreview).toEqual(preview);
    expect(app.state().grid[0].health).toBe(18);
  });

  it('describes soil conditions at the actual dry and saturated boundaries', () => {
    const app=harness(garden());
    for(const [moisture,label,hint] of [[0,'Dry soil','Water before advancing'],[29.9,'Dry soil','Water before advancing'],[30,'Moist soil',null],[89.9,'Moist soil',null],[90,'Saturated soil','Let the soil drain'],[100,'Saturated soil','Let the soil drain']]){
      app.patch({moisture});
      const description=app.find('aria-describedby','community-plot-help').props['aria-label'];
      expect(description).toContain(label);
      if(hint)expect(description).toContain(hint);
      else expect(description).not.toMatch(/Water before advancing|Let the soil drain/);
      expect(app.find('data-play-water').props.disabled).toBe(moisture>=90);
    }
  });

  it('updates the visible soil description immediately after water without advancing crops', () => {
    const app=harness(garden({moisture:22.5}));
    const before=structuredClone(app.state());
    app.click('data-play-water');
    expect(app.state().moisture).toBe(47.5);
    expect(app.state().day).toBe(before.day);
    expect(app.state().budget).toBe(before.budget);
    expect(app.state().grid.map(c=>c.growthDay)).toEqual(before.grid.map(c=>c.growthDay));
    const description=app.find('aria-describedby','community-plot-help').props['aria-label'];
    expect(description).toContain('Moist soil, 48% moisture.');
    expect(description).not.toContain('Water before advancing');
  });

  it('clears the saturated description when a simulated day drains the soil', () => {
    vi.spyOn(Math,'random').mockReturnValue(.99);
    const app=harness(garden({moisture:90,day:14}));
    app.click('data-play-primary');
    expect(app.state().day).toBe(15);
    expect(app.state().moisture).toBe(88.5);
    expect(app.find('aria-describedby','community-plot-help').props['aria-label']).toContain('Moist soil');
    expect(app.find('data-play-water').props.disabled).toBe(false);
  });


  it('searches the in-garden seed choices without changing the garden and resets an empty search', () => {
    const app=harness(garden({phase:'plan',plantingTarget:8}));
    const before=structuredClone(app.state());
    app.find('data-seed-search','simulation').props.onChange({target:{value:'  RaDiSh  '}});
    expect(app.find('data-planting-candidate','radish')).toBeTruthy();
    expect(()=>app.find('data-planting-candidate','rain_barrel')).toThrow();
    app.find('data-seed-search','simulation').props.onChange({target:{value:'no-such-seed-193'}});
    expect(()=>app.find('data-planting-candidate','radish')).toThrow();
    expect(app.state().grid).toEqual(before.grid);
    expect(app.state().budget).toBe(before.budget);
    expect(app.state().day).toBe(before.day);
    app.click('data-seed-reset','simulation');
    expect(app.state().plantingDockSearch).toBe('');
    expect(app.state().plantingDockFilter).toBe('all');
    expect(app.find('data-planting-candidate','radish')).toBeTruthy();
  });

  it('keeps a staged placement and its funds intact while searching alternative plants', () => {
    const app=harness(garden({phase:'plan',plantingTarget:8}));
    const budget=app.state().budget;
    app.click('data-planting-candidate','beans');
    const preview=structuredClone(app.state().placementPreview);
    app.find('data-seed-search','simulation').props.onChange({target:{value:'lavender'}});
    expect(app.find('data-planting-candidate','lavender')).toBeTruthy();
    expect(app.state().placementPreview).toEqual(preview);
    expect(app.state().selectedPlant).toBe('beans');
    expect(app.state().grid[8].plantId).toBeNull();
    expect(app.state().budget).toBe(budget);
    expect(app.find('data-confirm-placement-preview').props.disabled).toBe(false);
  });



  it('offers a recovery seed without changing funds, time, or learning records', () => {
    const app=harness({grid:emptyGrid(),budget:0,day:16,journal:[{day:3,text:'Try flowers beside crops.'}],totalHarvested:7});
    const before=structuredClone(app.state());
    expect(app.find('data-play-primary').props.children).toBe('Plant a free radish');
    expect(app.find('data-play-primary').props.disabled).toBe(false);
    app.awardXP.mockClear();
    app.click('data-play-primary');
    expect(app.state().grid.filter(c=>c.plantId)).toHaveLength(1);
    expect(app.state().grid[0].plantId).toBe('radish');
    expect(app.state().budget).toBe(before.budget);
    expect(app.state().day).toBe(before.day);
    expect(app.state().journal).toEqual(before.journal);
    expect(app.state().totalHarvested).toBe(7);
    expect(app.state().lastPlacement).toBeNull();
    expect(app.state().phase).toBe('plan');
    expect(app.awardXP).not.toHaveBeenCalled();
    expect(app.find('data-play-primary').props.children).toBe('Resume growing');
  });


  it('donates a perennial in winter and preserves the experiment through the year change', () => {
    vi.spyOn(Math,'random').mockReturnValue(.99);
    const app=harness({grid:emptyGrid(),budget:0,day:119});
    app.click('data-experiment-capture');
    const experiment=structuredClone(app.state().experimentBench);
    expect(app.find('data-play-primary').props.children).toBe('Plant a free strawberry');
    app.click('data-play-primary');
    expect(app.state().grid[0].plantId).toBe('strawberry');
    expect(app.state().experimentBench).toEqual(experiment);
    app.click('data-play-primary');app.click('data-play-primary');
    expect(app.state().day).toBe(120);
    expect(app.state().grid[0].plantId).toBe('strawberry');
    expect(app.state().grid[0].growthDay).toBe(0);
    app.click('data-play-primary');
    expect(app.state().grid[0].growthDay).toBeGreaterThan(0);
    expect(app.state().experimentBench).toEqual(experiment);
    expect(app.state().budget).toBe(0);
  });

  it('only offers recovery when no crop or habitat remains and no seed is affordable', () => {
    const app=harness({grid:emptyGrid(),budget:.1});
    expect(app.find('data-play-primary').props.children).not.toMatch(/free/);
    expect(app.find('data-play-primary').props.disabled).toBe(true);
    const grid=emptyGrid(); grid[3]={...grid[3],plantId:'bee_hotel'};
    app.patch({grid,budget:0});
    expect(app.find('data-play-primary').props.children).toBe('Start growing');
  });

  it('prioritizes water, then plot pests, then depleted soil before advancing', () => {
    const grid=emptyGrid(); grid[0]={...grid[0],plantId:'corn',pests:45};
    const app=harness(garden({grid,nitrogen:0,moisture:20}));
    expect(app.find('data-play-primary').props.children).toBe('Water garden');
    app.click('data-play-primary');
    expect(app.find('data-play-primary').props.children).toBe('Weed affected plots');
    app.click('data-play-primary');
    expect(app.state().grid[0].pests).toBe(25);
    expect(app.find('data-play-primary').props.children).toBe('Add compost');
    app.click('data-play-primary');
    expect(app.state().nitrogen).toBe(15);
    expect(app.state().day).toBe(0);
    expect(app.find('data-play-primary').props.children).toBe('Advance 1 day');
    app.patch({nitrogen:0,lastCompostDay:0});
    expect(app.find('data-play-primary').props.children).toBe('Advance 1 day');
  });

  it('explains winter dormancy and overwatering without preventing day progression', () => {
    vi.spyOn(Math,'random').mockReturnValue(.99);
    const winterGrid=emptyGrid();winterGrid[0]={...winterGrid[0],plantId:'strawberry'};
    const app=harness(garden({grid:winterGrid,day:119}));
    expect(app.find('data-play-next-action').props.children).toContain('Spring begins in 1 simulated day.');
    app.click('data-play-primary');
    expect(app.state().day).toBe(120);
    expect(app.find('data-play-next-action').props.children).not.toContain('Growth pauses');
    app.patch({moisture:95});
    expect(app.find('data-play-next-action').props.children).toContain('Hold off on watering');
    expect(app.find('data-play-water').props.disabled).toBe(true);
    expect(app.find('data-play-primary').props.children).toBe('Advance 1 day');
  });

  it('offers quick undo with an exact refund only before growth', () => {
    const app=harness(garden({phase:'plan',playShowPlots:true}));
    app.click('data-play-plot',15);
    app.click('data-planting-candidate','lettuce');
    app.click('data-confirm-placement-preview');
    const paid=app.state().budget;
    expect(app.find('data-play-undo').props.children).toContain('refund');
    app.click('data-play-undo');
    expect(app.state().grid[15].plantId).toBeNull();
    expect(app.state().budget).toBe(41);
    expect(app.state().budget).toBeGreaterThan(paid);
    expect(app.state().plantingTarget).toBe(15);
    expect(()=>app.find('data-play-undo')).toThrow();
    app.click('data-planting-candidate','lettuce');app.click('data-confirm-placement-preview');
    app.patch({grid:app.state().grid.map((c,i)=>i===15?{...c,growthDay:1}:c)});
    expect(()=>app.find('data-play-undo')).toThrow();
  });

  it('defaults to a compact garden and respects a saved learning focus', () => {
    const app=harness({grid:emptyGrid()});
    expect(app.find('data-play-mode','garden')).toBeTruthy();
    expect(app.find('data-community-experiment-bench').props.hidden).toBe(true);
    expect(app.find('data-community-scene-panel').props.hidden).toBe(false);
    app.click('data-play-view','workshop');
    expect(app.find('data-community-experiment-bench').props.hidden).toBe(false);
    app.patch({playView:undefined,focusMode:true});
    expect(app.find('data-play-mode','workshop')).toBeTruthy();
    app.click('data-play-view','garden');
    expect(app.state().focusMode).toBe(false);
  });

  it('plants a costed starter and awards growth XP only on the first start', () => {
    const app=harness({grid:emptyGrid(),budget:50});
    app.click('data-play-primary');
    expect(app.state().grid.filter(c=>c.plantId).length).toBeGreaterThan(4);
    expect(app.state().budget).toBeCloseTo(46.2,2);
    expect(app.state().phase).toBe('plan');
    app.awardXP.mockClear();
    app.click('data-play-primary');
    expect(app.state().phase).toBe('grow');
    expect(app.state().hasStartedGrowing).toBe(true);
    const firstAwards=app.awardXP.mock.calls.length;
    expect(firstAwards).toBeGreaterThan(0);
    app.click('data-play-edit');
    app.click('data-play-primary');
    expect(app.state().phase).toBe('grow');
    expect(app.awardXP).toHaveBeenCalledTimes(firstAwards);
  });


  it('allows a starter at its exact rounded cost', () => {
    const app=harness({grid:emptyGrid(),budget:3.8});
    expect(app.find('data-play-primary').props.disabled).toBe(false);
    app.click('data-play-primary');
    expect(app.state().budget).toBe(0);
    expect(app.state().grid.filter(c=>c.plantId).length).toBe(14);
  });

  it('disables unaffordable starters without preventing custom planting', () => {
    const app=harness({grid:emptyGrid(),budget:.1});
    expect(app.find('data-play-primary').props.disabled).toBe(true);
    expect(app.find('data-play-edit').props.disabled).toBe(false);
    app.click('data-play-edit');
    expect(app.state().playShowPlots).toBe(true);
    expect(app.state().budget).toBe(.1);
  });

  it('prioritizes dry soil and advances exactly one day after care', () => {
    vi.spyOn(Math,'random').mockReturnValue(.99);
    const app=harness(garden({moisture:20}));
    expect(app.find('data-play-primary').props.children).toBe('Water garden');
    app.click('data-play-primary');
    expect(app.state().moisture).toBe(45);
    expect(app.state().day).toBe(0);
    app.change('data-play-prediction','moisture');
    app.click('data-play-primary');
    expect(app.state().day).toBe(1);
    expect(app.state().lastDayReport.day).toBe(1);
    expect(app.state().lastFeedback.title).toBe('Day 1 complete');
    expect(app.state().predictionResult.matched).toBe(true);
    expect(app.state().dayPrediction).toBeNull();
    expect(app.find('data-play-day-result',1)).toBeTruthy();
  });

  it('disables ineffective weeding and consecutive compost until the next day', () => {
    vi.spyOn(Math,'random').mockReturnValue(.99);
    const app=harness();
    expect(app.find('data-play-weed').props.disabled).toBe(true);
    app.patch({grid:app.state().grid.map(c=>({...c,pests:c.plantId?10:0}))});
    app.click('data-play-weed');
    expect(app.find('data-play-weed').props.disabled).toBe(true);
    app.click('data-play-compost');
    expect(app.find('data-play-compost').props.disabled).toBe(true);
    app.click('data-play-water');
    expect(app.find('data-play-compost').props.disabled).toBe(true);
    app.click('data-play-primary');
    expect(app.find('data-play-compost').props.disabled).toBe(false);
  });

  it('harvests eligible crops, pays funds and returns an empty garden to planning', () => {
    vi.useFakeTimers();
    const grid=emptyGrid(); grid[0]={...grid[0],plantId:'lettuce',growthDay:200};
    const app=harness(garden({grid}));
    expect(app.find('data-play-primary').props.children).toBe('Harvest 1 crop');
    app.click('data-play-primary');
    expect(app.state().grid[0].plantId).toBeNull();
    expect(app.state().totalHarvested).toBe(1);
    expect(app.state().budget).toBeGreaterThan(41);
    app.click('data-play-primary');
    expect(app.state().phase).toBe('plan');
    expect(app.state().totalHarvested).toBe(1);
    app.click('data-play-primary');
    expect(app.state().phase).toBe('grow');
  });

  it('requires a placement preview before spending and reopens an empty growing plot', () => {
    const app=harness(garden({playShowPlots:true}));
    app.click('data-play-plot',15);
    expect(app.state().phase).toBe('plan');
    expect(app.state().plantingTarget).toBe(15);
    app.click('data-planting-candidate','lettuce');
    expect(app.state().grid[15].plantId).toBeNull();
    expect(app.state().budget).toBe(41);
    expect(app.find('data-play-primary').props.disabled).toBe(true);
    app.click('data-confirm-placement-preview');
    expect(app.state().grid[15].plantId).toBe('lettuce');
    expect(app.state().budget).toBeLessThan(41);
    expect(app.find('data-play-primary').props.disabled).toBe(false);
  });


  it('requires explicit removal and preserves the crop when cancelled', () => {
    const app=harness(garden({playShowPlots:true,relationshipFocus:0}));
    app.click('data-play-remove',0);
    expect(app.state().grid[0].plantId).toBe('corn');
    expect(app.state().phase).toBe('plan');
    app.click('data-play-remove-cancel');
    expect(app.state().phase).toBe('grow');
    expect(app.state().grid[0].plantId).toBe('corn');
    app.click('data-play-remove',0);
    app.click('data-play-remove-confirm');
    expect(app.state().grid[0].plantId).toBeNull();
    expect(app.state().plantingTarget).toBe(0);
    expect(app.state().budget).toBe(41);
    expect(app.state().grid[1].plantId).toBe('beans');
  });


  it('keeps nearly mature crops below 100 percent until they are harvestable', () => {
    const grid=emptyGrid(); grid[0]={...grid[0],plantId:'corn',growthDay:89.9};
    const app=harness(garden({grid}));
    expect(app.find('aria-label','Corn maturity').props['aria-valuenow']).toBe(99);
    expect(app.find('data-play-primary').props.children).toBe('Advance 1 day');
    app.patch({grid:app.state().grid.map((c,i)=>i===0?{...c,growthDay:90}:c)});
    expect(app.find('aria-label','Corn maturity').props['aria-valuenow']).toBe(100);
    expect(app.find('data-play-primary').props.children).toBe('Harvest 1 crop');
  });

  it('excludes structures and unhealthy crops from harvest progress', () => {
    const grid=emptyGrid();
    grid[0]={...grid[0],plantId:'lettuce',growthDay:200,health:20};
    grid[1]={...grid[1],plantId:'bee_hotel',growthDay:200};
    grid[2]={...grid[2],plantId:'corn',growthDay:1};
    const app=harness(garden({grid}));
    expect(app.find('data-play-primary').props.children).toBe('Advance 1 day');
    expect(app.find('data-play-harvest-progress',2)).toBeTruthy();
    app.patch({grid:app.state().grid.map((c,i)=>i===0?{...c,health:21}:c)});
    expect(app.find('data-play-primary').props.children).toBe('Harvest 1 crop');
    expect(app.find('data-play-harvest-progress',0)).toBeTruthy();
  });
});

describe('Companion Planting crop inspection and harvest feedback', () => {
  it('shows maturity, health, and pest thresholds without rounding a crop ready early', () => {
    const grid=emptyGrid(); grid[0]={...grid[0],plantId:'corn',growthDay:89.9,health:20,pests:31};
    const app=harness(garden({grid,relationshipFocus:0}));
    expect(app.find('aria-label','Maturity for Corn').props['aria-valuenow']).toBe(99);
    expect(app.find('aria-label','Health for Corn').props['aria-valuenow']).toBe(20);
    expect(app.find('aria-label','Pest pressure for Corn').props['aria-valuetext']).toMatch(/31 pest points/);
    expect(app.find('data-play-crop-status').props.children).toBe('Needs care');
    expect(()=>app.find('data-play-focus-harvest')).toThrow();
    app.patch({grid:grid.map((c,i)=>i===0?{...c,growthDay:90,health:21}:c)});
    expect(app.find('data-play-crop-status').props.children).toBe('Ready to harvest');
    expect(app.find('data-play-focus-harvest')).toBeTruthy();
  });

  it('explains only adjacent modeled pairs, includes diagonals, and surfaces conflicts', () => {
    const grid=emptyGrid();
    grid[5].plantId='beans';grid[0].plantId='corn';grid[6].plantId='onion';grid[9].plantId='squash';grid[15].plantId='corn';
    const app=harness(garden({grid,relationshipFocus:5}));
    expect(app.find('data-play-neighbor-total',15)).toBeTruthy();
    expect(app.find('data-play-neighbor-link',0).props['aria-label']).toMatch(/plus 18/);
    expect(app.find('data-play-neighbor-link',6).props['aria-label']).toMatch(/Conflicting neighbor, -15/);
    expect(()=>app.find('data-play-neighbor-link',15)).toThrow();
    const before=structuredClone(app.state());
    app.click('data-play-neighbor-link',0);
    expect(app.state().relationshipFocus).toBe(0);
    expect(app.state().grid).toEqual(before.grid);
    expect(app.state().budget).toBe(before.budget);
    expect(app.state().day).toBe(before.day);
  });

  it('browses occupied beds with wraparound and cancels pending removal on navigation', () => {
    const grid=emptyGrid();grid[1].plantId='corn';grid[8].plantId='beans';grid[15].plantId='bee_hotel';
    const app=harness(garden({grid,relationshipFocus:1}));
    app.click('data-play-focus-step',-1);
    expect(app.state().relationshipFocus).toBe(15);
    app.click('data-play-focus-step',1);
    expect(app.state().relationshipFocus).toBe(1);
    app.click('data-play-remove',1);
    app.click('data-play-focus-step',1);
    expect(app.state().relationshipFocus).toBe(8);
    expect(app.state().playRemovePlot).toBeNull();
    expect(app.state().phase).toBe('grow');
    expect(app.state().grid[1].plantId).toBe('corn');
  });

  it('closes the crop panel without losing an armed crop or leaving growth paused', () => {
    const app=harness(garden({relationshipFocus:0}));
    app.click('data-play-remove',0);
    app.click('data-play-focus-close');
    expect(app.state().relationshipFocus).toBeNull();
    expect(app.state().playRemovePlot).toBeNull();
    expect(app.state().phase).toBe('grow');
    expect(app.state().grid[0].plantId).toBe('corn');
    expect(()=>app.find('data-play-focus-panel')).toThrow();
  });

  it('identifies habitat structures without treating them as harvestable crops', () => {
    const grid=emptyGrid();grid[3].plantId='bee_hotel';
    const app=harness(garden({grid,relationshipFocus:3}));
    expect(app.find('data-play-crop-status').props.children).toBe('Habitat structure');
    expect(()=>app.find('data-play-neighbors')).toThrow();
    expect(()=>app.find('data-play-focus-harvest')).toThrow();
    expect(app.find('data-play-focus-step',1).props.disabled).toBe(true);
  });

  it('records one harvest, then opens replanting without silently buying or advancing', () => {
    vi.useFakeTimers();
    const grid=emptyGrid();grid[0]={...grid[0],plantId:'lettuce',growthDay:200};grid[5]={...grid[5],plantId:'radish',growthDay:200};
    const app=harness(garden({grid,relationshipFocus:0}));
    app.click('data-play-focus-harvest');
    const batch=app.state().lastHarvestBatch;
    expect(batch.cropCount).toBe(2);
    expect(app.find('data-play-harvest-receipt',batch.id)).toBeTruthy();
    expect(app.state().budget).toBeCloseTo(41+batch.revenue);
    expect(app.state().score).toBe(batch.points);
    const before=structuredClone(app.state()),xpCalls=app.awardXP.mock.calls.length;
    app.click('data-play-harvest-next');
    expect(app.state().phase).toBe('plan');
    expect(app.state().plantingTarget).toBe(0);
    expect(app.state().budget).toBe(before.budget);
    expect(app.state().day).toBe(before.day);
    expect(app.state().grid).toEqual(before.grid);
    expect(app.awardXP).toHaveBeenCalledTimes(xpCalls);
    expect(()=>app.find('data-play-harvest-receipt',batch.id)).toThrow();
  });

  it('dismisses a harvest receipt without repeating its rewards', () => {
    vi.useFakeTimers();
    const grid=emptyGrid();grid[0]={...grid[0],plantId:'radish',growthDay:200};
    const app=harness(garden({grid}));
    app.click('data-play-primary');
    const before=structuredClone(app.state());
    app.click('data-play-harvest-dismiss');
    expect(app.state().playHarvestSeen).toBe(before.lastHarvestBatch.id);
    expect(app.state().budget).toBe(before.budget);
    expect(app.state().totalHarvested).toBe(before.totalHarvested);
    expect(app.state().day).toBe(before.day);
  });

  it('continues a full perennial garden after harvest without opening an occupied bed', () => {
    vi.useFakeTimers();
    const grid=emptyGrid().map(c=>({...c,plantId:'strawberry',growthDay:200}));
    const app=harness(garden({grid}));
    app.click('data-play-primary');
    expect(app.find('data-play-harvest-next').props.children).toBe('Keep growing');
    const budget=app.state().budget;
    app.click('data-play-harvest-next');
    expect(app.state().phase).toBe('grow');
    expect(app.state().day).toBe(0);
    expect(app.state().budget).toBe(budget);
    expect(app.state().grid.every(c=>c.plantId==='strawberry' && c.growthDay===0)).toBe(true);
  });
});


describe('Companion Planting visual garden views', () => {
  it('shows exact harvest eligibility and maturity without scoring structures or empty beds', () => {
    const grid=emptyGrid();
    grid[0]={...grid[0],plantId:'corn',growthDay:89.9};
    grid[1]={...grid[1],plantId:'lettuce',growthDay:200,health:20};
    grid[2]={...grid[2],plantId:'radish',growthDay:200,health:21};
    grid[3]={...grid[3],plantId:'bee_hotel',growthDay:200};
    const app=harness(garden({grid,playShowPlots:true,playGardenLens:'harvest'}));
    expect(app.find('data-play-plot',0).props['data-play-plot-value']).toBe('99%');
    expect(app.find('data-play-plot',1).props['data-play-plot-value']).toBe('Care');
    expect(app.find('data-play-plot',2).props['data-play-plot-value']).toBe('Ready');
    expect(app.find('data-play-plot',3).props['data-play-plot-value']).toBe('Habitat');
    expect(app.find('data-play-plot',4).props['data-play-plot-value']).toBe('Open');
    expect(app.find('data-play-lens-summary','harvest').props.children).toBe('1 ready · 1 growing · 1 need care');
    app.click('data-play-lens-inspect',2);
    expect(app.state().relationshipFocus).toBe(2);
    expect(app.state().grid[2].plantId).toBe('radish');
  });

  it('prioritizes actual care needs and refreshes labels immediately after care', () => {
    const grid=emptyGrid();
    grid[0]={...grid[0],plantId:'corn',health:20};
    grid[1]={...grid[1],plantId:'lettuce',health:80,pests:45};
    grid[2]={...grid[2],plantId:'beans',health:84};
    const app=harness(garden({grid,moisture:60,playShowPlots:true,playGardenLens:'care'}));
    expect(app.find('data-play-plot',0).props['data-play-plot-tone']).toBe('critical');
    expect(app.find('data-play-plot',1).props['data-play-plot-value']).toBe('45 pests');
    expect(app.find('data-play-plot',2).props['data-play-plot-value']).toBe('84%');
    expect(app.find('data-play-lens-inspect',0)).toBeTruthy();
    app.click('data-play-weed');
    expect(app.find('data-play-plot',1).props['data-play-plot-value']).toBe('80%');
    expect(app.state().day).toBe(0);
    app.patch({moisture:20});
    expect(app.find('data-play-plot',2).props['data-play-plot-value']).toBe('Dry');
    app.click('data-play-water');
    expect(app.find('data-play-plot',2).props['data-play-plot-value']).toBe('84%');
  });

  it('distinguishes depleted nitrogen for heavy feeders from legumes and overly wet soil', () => {
    const app=harness(garden({nitrogen:14,playShowPlots:true,playGardenLens:'care'}));
    expect(app.find('data-play-plot',0).props['data-play-plot-value']).toBe('Low N');
    expect(app.find('data-play-plot',1).props['data-play-plot-value']).toBe('100%');
    app.click('data-play-lens-inspect',0);
    expect(app.find('data-play-crop-status').props.children).toBe('Low nitrogen');
    expect(app.find('data-play-crop-advice').props.children).toMatch(/Compost adds nitrogen/);
    app.click('data-play-compost');
    expect(app.find('data-play-plot',0).props['data-play-plot-value']).toBe('100%');
    app.patch({moisture:91});
    expect(app.find('data-play-plot',0).props['data-play-plot-value']).toBe('Wet');
  });

  it('uses net effects from actual adjacent pairs and inspects a net conflict first', () => {
    const grid=emptyGrid();grid[0].plantId='corn';grid[5].plantId='beans';grid[6].plantId='onion';grid[9].plantId='squash';grid[15].plantId='corn';
    const app=harness(garden({grid,playShowPlots:true,playGardenLens:'companions'}));
    expect(app.find('data-play-plot',5).props['data-play-plot-value']).toBe('+15%');
    expect(app.find('data-play-plot',6).props['data-play-plot-value']).toBe('-15%');
    expect(app.find('data-play-plot',15).props['data-play-plot-value']).toBe('0%');
    expect(app.find('data-play-plot',5).props['aria-label']).toMatch(/net modeled growth effect/);
    app.click('data-play-lens-inspect',6);
    expect(app.state().relationshipFocus).toBe(6);
  });

  it('changes views without spending, advancing, awarding XP, or disturbing a placement preview', () => {
    const app=harness(garden({phase:'plan',playShowPlots:true}));
    app.click('data-play-plot',15);
    app.click('data-planting-candidate','lettuce');
    const before=structuredClone(app.state());
    app.awardXP.mockClear();
    for(const id of ['harvest','care','companions','natural'])app.click('data-play-garden-lens',id);
    expect(app.state().day).toBe(before.day);
    expect(app.state().budget).toBe(before.budget);
    expect(app.state().grid).toEqual(before.grid);
    expect(app.state().placementPreview).toEqual(before.placementPreview);
    expect(app.awardXP).not.toHaveBeenCalled();
  });

  it('restores a saved view, falls back safely, and opens text values without advancing', () => {
    const app=harness(garden({playGardenLens:'care',maximized:true}));
    expect(app.find('data-play-garden-lens','care').props['aria-pressed']).toBe(true);
    app.click('data-play-lens-map');
    expect(app.state().playShowPlots).toBe(true);
    expect(app.state().maximized).toBe(false);
    expect(app.state().day).toBe(0);
    app.patch({playGardenLens:'unknown-future-view'});
    expect(app.find('data-play-garden-lens','natural').props['aria-pressed']).toBe(true);
    expect(app.find('data-play-plot',0).props['data-play-plot-value']).toBeUndefined();
  });

  it('keeps empty gardens and habitat-only gardens out of crop comparisons', () => {
    const app=harness(garden({grid:emptyGrid(),playGardenLens:'harvest'}));
    expect(app.find('data-play-garden-views').props.hidden).toBe(true);
    const grid=emptyGrid();grid[4].plantId='rain_barrel';
    app.patch({grid});
    expect(app.find('data-play-lens-summary','harvest').props.children).toMatch(/Plant a crop/);
    expect(()=>app.find('data-play-lens-inspect',4)).toThrow();
  });
});



describe('Companion Planting visual day recaps', () => {
  it('records exact readiness and highlights a crop that became harvestable', () => {
    vi.spyOn(Math,'random').mockReturnValue(.99);
    const grid=emptyGrid();grid[0]={...grid[0],plantId:'corn',growthDay:89.9};
    const app=harness(garden({grid}));
    app.click('data-play-primary');
    const change=app.state().lastDayReport.plotChanges[0];
    expect(change.beforeMaturity).toBe(99);
    expect(change.afterMaturity).toBe(100);
    expect(change.beforeReady).toBe(false);
    expect(change.afterReady).toBe(true);
    expect(app.find('data-play-day-highlight',0).props['data-play-highlight-kind']).toBe('ready');
    expect(app.find('data-play-day-title').props.children).toBe('Spring · Day 1 complete');
    const before=structuredClone(app.state()),xp=app.awardXP.mock.calls.length;
    app.click('data-play-day-focus',0);
    expect(app.state().relationshipFocus).toBe(0);
    expect(app.state().grid).toEqual(before.grid);
    expect(app.state().day).toBe(before.day);
    expect(app.state().budget).toBe(before.budget);
    expect(app.awardXP).toHaveBeenCalledTimes(xp);
  });

  it('explains the year reset with cleared and carried-over counts instead of misleading averages', () => {
    vi.spyOn(Math,'random').mockReturnValue(.99);
    const grid=emptyGrid();grid[0]={...grid[0],plantId:'corn',growthDay:30};grid[1]={...grid[1],plantId:'strawberry',growthDay:10};grid[2].plantId='bee_hotel';
    const app=harness(garden({grid,day:119,year:1}));
    app.click('data-play-primary');
    expect(app.state().day).toBe(120);
    expect(app.state().year).toBe(2);
    expect(app.state().lastDayReport.year).toBe(1);
    expect(app.state().lastDayReport.yearReset).toBe(true);
    expect(app.find('data-play-day-title').props.children).toBe('Winter · Day 30 complete');
    expect(app.find('data-play-day-value','cleared').props.children).toBe('1');
    expect(app.state().grid[2].plantId).toBe('bee_hotel');
    expect(app.find('data-play-day-value','carried').props.children).toBe('1');
    expect(()=>app.find('data-play-day-value','growth')).toThrow();
    expect(app.find('data-play-day-highlight',0).props['data-play-highlight-kind']).toBe('cleared');
    expect(app.find('data-play-day-highlight',1).props['data-play-highlight-kind']).toBe('carryover');
    expect(()=>app.find('data-play-day-highlight',2)).toThrow();
    app.click('data-play-day-replant',0);
    expect(app.state().plantingTarget).toBe(0);
    expect(app.state().phase).toBe('plan');
    expect(app.state().budget).toBe(41);
  });

  it('labels the completed season accurately when the next season begins', () => {
    vi.spyOn(Math,'random').mockReturnValue(.99);
    const app=harness(garden({day:29,year:2}));
    app.click('data-play-primary');
    expect(app.find('data-play-day-title').props.children).toBe('Spring · Day 30 complete');
    expect(app.find('data-play-season-change').props.children[0].props.children).toBe('Summer begins');
    expect(app.state().lastDayReport.year).toBe(2);
    expect(app.state().lastDayReport.yearReset).toBe(false);
  });

  it('retains the day-end snapshot after care and prevents stale inspection of a replacement crop', () => {
    vi.spyOn(Math,'random').mockReturnValue(.99);
    const grid=emptyGrid();grid[0]={...grid[0],plantId:'corn',growthDay:89.9};
    const app=harness(garden({grid}));
    app.click('data-play-primary');
    const report=structuredClone(app.state().lastDayReport),value=app.find('data-play-day-value','moisture').props.children;
    app.click('data-play-water');
    expect(app.state().lastDayReport).toEqual(report);
    expect(app.find('data-play-day-value','moisture').props.children).toBe(value);
    app.patch({grid:grid.map((c,i)=>i===0?{...c,plantId:'tomato',growthDay:0}:c)});
    expect(()=>app.find('data-play-day-focus',0)).toThrow();
    expect(()=>app.find('data-play-day-replant',0)).toThrow();
  });

  it('makes old reports readable without inventing missing values or readiness', () => {
    const grid=emptyGrid();grid[0].plantId='corn';
    const app=harness(garden({grid,phase:'plan',lastDayReport:{day:4,season:'Spring',growthDelta:1.2,healthDelta:.3,
      plotChanges:[{index:0,plantId:'corn',beforeGrowth:99,afterGrowth:100,beforeHealth:100,afterHealth:100,beforePests:0,afterPests:0}]}}));
    expect(app.find('data-play-day-value','moisture').props.children).toBe('—');
    expect(app.find('data-play-day-highlight',0).props['data-play-highlight-kind']).toBe('growth');
    expect(app.find('data-play-outcome').props.hidden).toBe(false);
    expect(app.find('data-play-review-day')).toBeTruthy();
  });

  it('keeps forecast feedback attached to its recorded day', () => {
    vi.spyOn(Math,'random').mockReturnValue(.99);
    const app=harness();
    app.change('data-play-prediction','moisture');
    app.click('data-play-primary');
    expect(app.find('data-play-day-prediction').props.children).toMatch(/Your forecast matched/);
    app.patch({predictionResult:{day:99,matched:true,observed:'An older result.'}});
    expect(()=>app.find('data-play-day-prediction')).toThrow();
  });

  it('disables snapshot navigation while a planting preview awaits confirmation', () => {
    vi.spyOn(Math,'random').mockReturnValue(.99);
    const grid=emptyGrid();grid[0]={...grid[0],plantId:'corn',growthDay:89.9};
    const app=harness(garden({grid,playShowPlots:true}));
    app.click('data-play-primary');
    app.click('data-play-plot',15);
    app.click('data-planting-candidate','lettuce');
    expect(app.find('data-play-day-focus',0).props.disabled).toBe(true);
    const before=structuredClone(app.state());
    app.click('data-play-review-day');
    app.click('data-play-day-return');
    expect(app.state()).toEqual(before);
  });

  it('reports dormant growth without manufacturing a crop highlight', () => {
    vi.spyOn(Math,'random').mockReturnValue(.99);
    const grid=emptyGrid();grid[0]={...grid[0],plantId:'corn',growthDay:30,health:95};
    const app=harness(garden({grid,day:95}));
    app.click('data-play-primary');
    expect(app.find('data-play-day-value','growth').props.children).toBe('0');
    expect(()=>app.find('data-play-day-highlight',0)).toThrow();
    expect(()=>app.find('data-play-season-change')).toThrow();
  });
});


describe('Companion Planting crop watch', () => {
  it('shows ready crops, blocked harvests, and the most mature remaining crop without rounding early', () => {
    const grid=emptyGrid();
    grid[0]={...grid[0],plantId:'corn',growthDay:89.9};
    grid[1]={...grid[1],plantId:'radish',growthDay:25};
    grid[2]={...grid[2],plantId:'lettuce',growthDay:200,health:20};
    grid[3]={...grid[3],plantId:'basil',growthDay:39};
    grid[4]={...grid[4],plantId:'rain_barrel',growthDay:200};
    const app=harness(garden({grid}));
    expect(app.find('data-crop-watch-summary').props.children).toBe('1 ready · 2 growing · 1 need care');
    expect(app.find('data-watch-plot',1).props['data-tone']).toBe('ready');
    expect(app.find('data-watch-plot',2).props['data-tone']).toBe('care');
    expect(app.find('aria-label','Corn maturity').props['aria-valuenow']).toBe(99);
    expect(()=>app.find('data-watch-plot',3)).toThrow();
    expect(()=>app.find('data-watch-plot',4)).toThrow();
    const before=structuredClone(app.state());
    app.click('data-crop-watch-all');
    expect(app.state().playGardenLens).toBe('harvest');
    expect(app.state().playShowPlots).toBe(true);
    expect(app.state().playKeyboardPlot).toBe(1);
    expect(app.state().grid).toEqual(before.grid);
    expect(app.state().budget).toBe(before.budget);
    expect(app.state().day).toBe(before.day);
  });

  it('explains winter rest and current care without resetting maturity', () => {
    const grid=emptyGrid();
    grid[0]={...grid[0],plantId:'radish',growthDay:12};
    grid[1]={...grid[1],plantId:'corn',growthDay:90};
    const app=harness(garden({grid,day:95,moisture:60}));
    expect(app.find('data-crop-watch-summary').props.children).toBe('1 ready · 1 resting');
    expect(app.find('data-watch-stage',0).props.children).toBe('Winter rest');
    expect(app.find('aria-label','Radish maturity').props['aria-valuenow']).toBe(48);
    app.patch({moisture:20});
    expect(app.find('data-watch-stage',0).props.children).toBe('Dry');
    expect(app.find('data-watch-stage',1).props.children).toBe('Ready to harvest');
    app.patch({day:5,moisture:60});
    expect(app.find('data-watch-stage',0).props.children).toBe('Leafing');
  });

  it('opens inspection without changing the crop and marks the watch as its return destination', () => {
    const grid=emptyGrid();grid[0]={...grid[0],plantId:'radish',growthDay:15};
    const app=harness(garden({grid}));
    const before=structuredClone(app.state());
    app.click('data-watch-inspect',0);
    expect(app.state().relationshipFocus).toBe(0);
    expect(app.state().playCropWatchReturn).toBe(0);
    expect(app.state().grid).toEqual(before.grid);
    expect(app.state().budget).toBe(before.budget);
    app.click('data-play-focus-close');
    expect(app.state().relationshipFocus).toBeNull();
    expect(app.state().playCropWatchReturn).toBeNull();
    app.patch({grid:emptyGrid()});
    expect(()=>app.find('data-crop-watch')).toThrow();
    grid[0]={...grid[0],plantId:'bee_hotel'};
    app.patch({grid});
    expect(()=>app.find('data-crop-watch')).toThrow();
  });

  it('updates after harvest while keeping blocked crops out of harvested rotation history', () => {
    const grid=emptyGrid();
    grid[0]={...grid[0],plantId:'strawberry',growthDay:200};
    grid[1]={...grid[1],plantId:'corn',growthDay:90};
    grid[2]={...grid[2],plantId:'lettuce',growthDay:200,health:20};
    const app=harness(garden({grid,totalHarvested:7,cellHistory:{2:['radish']}}));
    app.click('data-play-primary');
    expect(app.state().lastHarvestBatch.cropCount).toBe(2);
    expect(app.state().grid[1].plantId).toBeNull();
    expect(app.state().grid[0].growthDay).toBe(0);
    expect(app.find('data-watch-stage',0).props.children).toBe('Newly planted');
    expect(app.find('data-watch-stage',2).props.children).toBe('Needs care');
    expect(app.state().cellHistory[2]).toEqual(['radish']);
    expect(app.state().cellHistory[0]).toEqual(['strawberry']);
    expect(app.state().cellHistory[1]).toEqual(['corn']);
  });
});


describe('Companion Planting tending tools', () => {
  it('records the actual bounded watering change without advancing time or spending funds', () => {
    const app=harness(garden({moisture:82.5,day:14}));
    const before=structuredClone(app.state());
    app.click('data-play-water');
    expect(app.state().moisture).toBe(100);
    expect(app.state().day).toBe(before.day);
    expect(app.state().budget).toBe(before.budget);
    expect(app.state().lastCareAction.changes).toEqual([{label:'Moisture',before:82.5,after:100,unit:'%'}]);
    expect(app.find('data-care-result','water')).toBeTruthy();
    expect(app.state().lastFeedback.detail).toBe('Moisture +17.5 points; now 100%.');
    expect(app.find('data-play-water').props.disabled).toBe(true);
    expect(app.find('data-care-value','water').props.children).toBe('100%');
    app.click('data-play-primary');
    expect(()=>app.find('data-care-result','water')).toThrow();
  });

  it('keeps plot pest effects separate from the garden-wide population', () => {
    const grid=emptyGrid();grid[0]={...grid[0],plantId:'corn',pests:43.5};grid[1]={...grid[1],plantId:'basil',pests:12};
    const app=harness(garden({grid,pestPop:75}));
    app.click('data-play-weed');
    expect(app.state().grid[0].pests).toBe(23.5);
    expect(app.state().grid[1].pests).toBe(0);
    expect(app.state().pestPop).toBe(75);
    expect(app.state().lastCareAction.changes).toEqual([{label:'Peak plot pests',before:43.5,after:23.5}]);
    app.click('data-play-weed');app.click('data-play-weed');
    expect(app.find('data-play-weed').props.disabled).toBe(true);
    expect(app.find('data-care-value','weed').props.children).toBe('0');
  });

  it('shows capped compost changes and keeps the once-per-day control after other care', () => {
    const app=harness(garden({nitrogen:98,phosphorus:97,potassium:99,organicMatter:9.9,day:7}));
    app.click('data-play-compost');
    expect(app.state().lastCareAction.changes).toEqual([
      {label:'N',before:98,after:100},{label:'P',before:97,after:100},
      {label:'K',before:99,after:100},{label:'Organic matter',before:9.9,after:10,unit:'%'}
    ]);
    expect(app.find('data-care-result','compost')).toBeTruthy();
    expect(app.state().lastFeedback.detail).toBe('N +2, P +3, K +1, and organic matter +0.1 percentage points.');
    app.click('data-play-water');
    expect(app.find('data-play-compost').props.disabled).toBe(true);
    expect(()=>app.find('data-care-result','compost')).toThrow();
    expect(app.find('data-care-result','water')).toBeTruthy();
  });

  it('does not invent immediate change receipts for legacy actions or show tools while planning', () => {
    const app=harness(garden({lastCareAction:{id:'water',label:'Watered garden'}}));
    expect(app.find('data-care-tray')).toBeTruthy();
    expect(()=>app.find('data-care-result','water')).toThrow();
    app.patch({lastCareAction:{id:'water',day:2,changes:[{label:'Moisture',before:20,after:45}]}});
    expect(()=>app.find('data-care-result','water')).toThrow();
    app.patch({phase:'plan'});
    expect(()=>app.find('data-care-tray')).toThrow();
    app.patch({phase:'grow',grid:emptyGrid()});
    expect(()=>app.find('data-care-tray')).toThrow();
  });
});

describe('Companion Planting harvest collection visuals', () => {
  it('captures only collected plots and gives the basket the same harvest summary', () => {
    vi.useFakeTimers();
    const grid=emptyGrid();
    grid[0]={...grid[0],plantId:'corn',growthDay:90};
    grid[5]={...grid[5],plantId:'strawberry',growthDay:200};
    grid[8]={...grid[8],plantId:'radish',growthDay:0};
    grid[10]={...grid[10],plantId:'lettuce',growthDay:200,health:20};
    grid[15]={...grid[15],plantId:'rain_barrel',growthDay:200};
    const app=harness(garden({grid,totalHarvested:4}));
    const previous=window.__cgCanvasEl;
    const canvas={_cgRequestDraw:vi.fn()};window.__cgCanvasEl=canvas;
    try {
      app.click('data-play-primary');
      expect(canvas._actionBurst.kind).toBe('harvest');
      expect(canvas._actionBurst.batchId).toBe(app.state().lastHarvestBatch.id);
      expect(canvas._actionBurst.plots).toEqual([{index:0,plantId:'corn'},{index:5,plantId:'strawberry'}]);
      expect(app.state().lastHarvestBatch.cropCount).toBe(2);
      expect(app.state().grid[0].plantId).toBeNull();
      expect(app.state().grid[5].growthDay).toBe(0);
      expect(app.state().grid[10]).toEqual(grid[10]);
      const label=app.find('aria-describedby','community-plot-help').props['aria-label'];
      expect(label).toContain('Last harvest: 1 Corn, 1 Strawberry.');
      expect(app.state()).not.toHaveProperty('_actionBurst');
      expect(canvas._cgRequestDraw).toHaveBeenCalledOnce();
    } finally {window.__cgCanvasEl=previous;}
  });

  it('retains the recorded basket when replanting and clears it with cleared harvest history', () => {
    const batch={id:'saved-harvest',cropCount:2,items:[{plantId:'carrot',count:2}]};
    const app=harness(garden({lastHarvestBatch:batch,harvestBatches:[batch]}));
    app.click('data-play-edit');
    expect(app.find('aria-describedby','community-plot-help').props['aria-label']).toContain('Last harvest: 2 Carrot.');
    expect(app.state().lastHarvestBatch).toEqual(batch);
    app.patch({lastHarvestBatch:null,harvestBatches:[]});
    expect(app.find('aria-describedby','community-plot-help').props['aria-label']).toContain('basket is empty');
  });

  it('uses valid recorded crop items without inventing produce from an old total', () => {
    const app=harness(garden({totalHarvested:99}));
    expect(app.find('aria-describedby','community-plot-help').props['aria-label']).toContain('basket is empty');
    app.patch({harvestBatches:[{id:'legacy',items:[{plantId:'beans',count:3},{plantId:'rain_barrel',count:1},{plantId:'missing',count:4},{plantId:'corn',count:-2}]}]});
    expect(app.find('aria-describedby','community-plot-help').props['aria-label']).toContain('Last harvest: 3 Beans.');
    app.patch({lastHarvestBatch:{id:'older',items:null}});
    expect(app.find('aria-describedby','community-plot-help').props['aria-label']).toContain('basket is empty');
  });
});

describe('Companion Planting neighborhood explorer', () => {
  function neighborhoodGarden(extra={}) {
    const grid=emptyGrid();grid[0].plantId='corn';grid[5].plantId='beans';grid[6].plantId='onion';grid[9].plantId='squash';grid[15].plantId='corn';
    return garden({grid,playGardenLens:'companions',...extra});
  }
  it('isolates actual adjacent pairs without changing the planting or advancing time', () => {
    const app=harness(neighborhoodGarden());
    expect(app.find('data-companion-crop').props.value).toBe(6);
    const before=structuredClone(app.state());
    app.change('data-companion-crop','5');
    expect(app.find('data-companion-net',15)).toBeTruthy();
    expect(app.find('data-companion-pair',0).props['aria-label']).toContain('Plus 18');
    expect(app.find('data-companion-pair',6).props['data-tone']).toBe('conflict');
    expect(app.find('data-companion-pair',9)).toBeTruthy();
    expect(()=>app.find('data-companion-pair',15)).toThrow();
    app.click('data-companion-pair',6);
    expect(app.find('data-companion-pair',6).props['aria-pressed']).toBe(true);
    expect(app.state().playCompanionNeighbor).toBe(6);
    app.click('data-companion-all');
    expect(app.find('data-companion-pair',6).props['aria-pressed']).toBe(false);
    expect(app.state().grid).toEqual(before.grid);
    expect(app.state().day).toBe(before.day);expect(app.state().budget).toBe(before.budget);
  });

  it('restores a valid pair but drops a highlight when that neighbor is no longer present', () => {
    const app=harness(neighborhoodGarden({playCompanionFocus:5,playCompanionNeighbor:6}));
    expect(app.find('data-companion-pair',6).props['aria-pressed']).toBe(true);
    const restored=harness(JSON.parse(JSON.stringify(app.state())));
    expect(restored.find('data-companion-crop').props.value).toBe(5);
    const nextGrid=structuredClone(restored.state().grid);nextGrid[6].plantId=null;
    restored.patch({grid:nextGrid});
    expect(restored.find('data-companion-net',30)).toBeTruthy();
    expect(()=>restored.find('data-companion-all')).toThrow();
    restored.patch({playCompanionFocus:99});
    expect(restored.find('data-companion-crop').props.value).not.toBe(99);
  });

  it('keeps crop inspection aligned with the explored neighborhood and supports returning to it', () => {
    const app=harness(neighborhoodGarden());
    app.change('data-companion-crop','5');app.click('data-companion-pair',6);
    app.click('data-play-lens-inspect',5);
    expect(app.state().relationshipFocus).toBe(5);
    expect(app.state().playCompanionReturn).toBe(true);
    expect(app.find('data-play-focus',5)).toBeTruthy();
    app.click('data-play-focus-close');
    expect(app.state().playCompanionReturn).toBe(false);
    expect(app.find('data-companion-pair',6).props['aria-pressed']).toBe(true);
    expect(app.find('data-companion-crop').props.value).toBe(5);
    expect(app.state().phase).toBe('grow');
  });

  it('hides the explorer during a placement preview and for habitat-only gardens', () => {
    const app=harness(neighborhoodGarden({phase:'plan',plantingTarget:15,playShowPlots:true}));
    app.click('data-play-plot',2);app.click('data-planting-candidate','lettuce');
    const preview=structuredClone(app.state().placementPreview);
    expect(()=>app.find('data-companion-explorer')).toThrow();
    app.click('data-play-garden-lens','natural');app.click('data-play-garden-lens','companions');
    expect(app.state().placementPreview).toEqual(preview);
    const grid=emptyGrid();grid[4].plantId='rain_barrel';
    app.patch({grid,placementPreview:null,selectedPlant:null,plantingTarget:null});
    expect(()=>app.find('data-companion-explorer')).toThrow();
  });
});