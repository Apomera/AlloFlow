import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {React,ReactDOMClient,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let api,downloads,filenames,apps=[];

beforeEach(()=>{
  vi.useFakeTimers();window.localStorage.clear();
  for(const key of ['__geoWorldEngine','__alloGeometryWorldLastDraft','__alloGeometryWorldPendingBuild','__alloGeometryWorldReturnProject'])delete window[key];
  const lab=resetStemLab();
  lab.registerTool('geometryWorld',{aliases:[],render(ctx){return ctx.React.createElement('main',{id:'geoworld-fs-workspace'},ctx.React.createElement('div',{id:'geoworld-fs-wrap',tabIndex:0}));}});
  if(!document.getElementById('allo-geometryworld-builder-css')){
    const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);
  }
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();
  api=window.StemLab.geometryWorldBuilderPure;downloads=[];filenames=[];
  vi.stubGlobal('Blob',class{constructor(parts,options){this.parts=parts;this.type=options?.type;}});
  vi.stubGlobal('URL',{createObjectURL(blob){downloads.push(blob);return 'blob:world-backup';},revokeObjectURL:vi.fn()});
  vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(){filenames.push(this.download);});
});

afterEach(()=>{
  for(const app of apps.splice(0))app.close();
  vi.restoreAllMocks();vi.unstubAllGlobals();vi.clearAllTimers();vi.useRealTimers();window.localStorage.clear();
  for(const key of ['__geoWorldEngine','__alloGeometryWorldLastDraft','__alloGeometryWorldPendingBuild','__alloGeometryWorldReturnProject'])delete window[key];
});

function addBlock(engine,x,y=1,z=0){
  engine.blocks[[x,y,z].join(',')]={userData:{gridPos:{x,y,z},blockType:'stone',shape:'cube',rotation:0,_measurementLayer:'student'}};
}
function world({empty=false,title='Sunlit bridge'}={}){
  const engine={blocks:{},_currentLesson:api.FREE_BUILD_LESSON,_builderSelection:null,_undoStack:[{action:'place',x:0,y:1,z:0}],_redoStack:[],blocksPlaced:1,
    _modalState:{},releaseInput:vi.fn(),loadLesson:vi.fn(function(lesson){this.blocks={};this._currentLesson=lesson;this._workshopProjectId=null;this._workshopProjectVersion=null;this._workshopSavedSignature=null;}),getBlocksArr(){return Object.values(this.blocks);}};
  if(!empty){addBlock(engine,0);expect(api.saveWorldDraft(engine,title).ok).toBe(true);}
  return engine;
}
function mount(engine){
  window.__geoWorldEngine=engine;
  const host=document.createElement('div');document.body.appendChild(host);
  const root=ReactDOMClient.createRoot(host);let current,patch;
  function Host(){
    const [toolData,setToolData]=React.useState({geometryWorld:{activeLesson:'builderSandbox',worldActive:true,showGeometryHome:false,sandboxDockCollapsed:false,builderPanel:'build'}});
    current=toolData.geometryWorld;patch=values=>setToolData(old=>({...old,geometryWorld:{...old.geometryWorld,...values}}));
    return window.StemLab._registry.geometryWorld.render({React,toolData,updateMulti:(tool,values)=>setToolData(old=>({...old,[tool]:{...old[tool],...values}})),setStemLabTool:vi.fn(),addToast:vi.fn(),announceToSR:vi.fn()});
  }
  React.act(()=>root.render(React.createElement(Host)));
  const app={host,engine,state:()=>current,patch:values=>React.act(()=>patch(values)),close(){if(host.isConnected){React.act(()=>root.unmount());host.remove();}}};
  apps.push(app);return app;
}
function field(app){return app.host.querySelector('#gwe-project-name');}
function pending(app){return app.host.querySelector('[data-gwe-name-pending]');}
function button(app,label){
  const result=[...app.host.querySelectorAll('button')].find(node=>node.textContent.trim()===label);
  expect(result,label).toBeTruthy();return result;
}
function activate(node){React.act(()=>{node.focus();node.click();});}
function typeName(app,value){
  const input=field(app);expect(input).toBeTruthy();
  React.act(()=>{input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});
}
function currentProject(engine){return api.readWorldShelf().projects.find(project=>project.id===engine._workshopProjectId);}
function autosave(){React.act(()=>vi.advanceTimersByTime(2750));}
function backup(app){
  const trigger=app.host.querySelector('[data-gwe-backup-current]') || [...app.host.querySelectorAll('button')].find(node=>node.textContent.includes('Save editable world'));
  expect(trigger).toBeTruthy();activate(trigger);expect(downloads).toHaveLength(1);return JSON.parse(downloads[0].parts.join(''));
}

describe('current Geometry World project name and portable backup',()=>{
  it('hydrates the committed project name after mounting and remounting the current workspace',()=>{
    const engine=world(),first=mount(engine);expect(field(first).value).toBe('Sunlit bridge');expect(pending(first)).toBeNull();
    first.close();const second=mount(engine);expect(field(second).value).toBe('Sunlit bridge');expect(api.readWorldShelf().projects).toHaveLength(1);
  });

  it('keeps a pending name edit while autosave records geometry under the committed title',()=>{
    const engine=world(),app=mount(engine),history=structuredClone(engine._undoStack);
    typeName(app,'A name still being edited');const notice=pending(app);expect(notice).toBeTruthy();
    expect(notice.textContent).toMatch(/not saved|unsaved|not applied|waiting/i);
    const description=notice.querySelector('[id]') || notice;expect(description.id).not.toBe('');
    expect(field(app).getAttribute('aria-describedby')?.split(/\s+/)).toContain(description.id);
    addBlock(engine,2);autosave();
    expect(field(app).value).toBe('A name still being edited');expect(pending(app)).toBeTruthy();
    expect(currentProject(engine).world.title).toBe('Sunlit bridge');expect(currentProject(engine).world.blocks).toHaveLength(2);
    expect(engine._undoStack).toEqual(history);
  });

  it('keeps a typed name when the first autosave assigns a new project identity',()=>{
    const engine=world({empty:true}),app=mount(engine);typeName(app,'My first tower');
    addBlock(engine,0);autosave();
    expect(engine._workshopProjectId).toBeTruthy();expect(field(app).value).toBe('My first tower');expect(pending(app)).toBeTruthy();
    expect(currentProject(engine).world.title).toBe('Untitled build');
  });

  it('discards only the name edit and returns keyboard focus to its input',()=>{
    const engine=world(),app=mount(engine),raw=window.localStorage.getItem(api.WORLD_SHELF_KEY),blocks=JSON.stringify(engine.blocks);
    typeName(app,'Discard this draft');activate(button(app,'Discard name edit'));React.act(()=>vi.advanceTimersByTime(40));
    expect(field(app).value).toBe('Sunlit bridge');expect(pending(app)).toBeNull();expect(document.activeElement).toBe(field(app));
    expect(window.localStorage.getItem(api.WORLD_SHELF_KEY)).toBe(raw);expect(JSON.stringify(engine.blocks)).toBe(blocks);
  });

  it('commits an explicitly saved project name and clears the pending notice',()=>{
    const engine=world(),app=mount(engine);typeName(app,'  Stone pavilion  ');activate(button(app,'Save project name'));
    expect(field(app).value).toBe('Stone pavilion');expect(currentProject(engine).world.title).toBe('Stone pavilion');expect(pending(app)).toBeNull();
  });

  it('clears the earlier project name when a fresh empty sandbox is opened',()=>{
    const engine=world(),app=mount(engine);typeName(app,'An unfinished rename');
    activate(app.host.querySelector('[data-gwe-focus-return="sandbox-dock"]'));
    activate(button(app,'Open blank sandbox'));
    expect(engine._workshopProjectId).toBeNull();expect(Object.keys(engine.blocks)).toHaveLength(0);
    expect(field(app).value).toBe('');expect(pending(app)).toBeNull();
    expect(api.readWorldShelf().projects[0].world.title).toBe('Sunlit bridge');
  });

  it('exports current live geometry with the committed title while a rename is still pending',()=>{
    const engine=world(),app=mount(engine),raw=window.localStorage.getItem(api.WORLD_SHELF_KEY);
    typeName(app,'Uncommitted alternate name');addBlock(engine,7,3,-2);
    const exported=backup(app);
    expect(exported.title).toBe('Sunlit bridge');expect(exported.blocks).toEqual(api.editableWorld(engine).blocks);
    expect(exported.blocks).toHaveLength(2);expect(filenames[0]).toMatch(/sunlit-bridge/i);
    expect(window.localStorage.getItem(api.WORLD_SHELF_KEY)).toBe(raw);expect(field(app).value).toBe('Uncommitted alternate name');expect(pending(app)).toBeTruthy();
  });
});

describe('autosave failure stays actionable',()=>{
  it('keeps a failed rename pending and exports the earlier committed title until the name is saved successfully',()=>{
    const engine=world(),app=mount(engine);typeName(app,'A requested new name');
    const blocked=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('quota');});
    activate(button(app,'Save project name'));
    expect(field(app).value).toBe('A requested new name');expect(pending(app)).toBeTruthy();
    expect(currentProject(engine).world.title).toBe('Sunlit bridge');
    expect(backup(app).title).toBe('Sunlit bridge');
    blocked.mockRestore();autosave();
    expect(field(app).value).toBe('A requested new name');expect(currentProject(engine).world.title).toBe('Sunlit bridge');
    activate(button(app,'Save project name'));
    expect(currentProject(engine).world.title).toBe('A requested new name');expect(pending(app)).toBeNull();
  });

  it('keeps an accessible backup action until storage can save the live build again',()=>{
    const engine=world(),app=mount(engine),raw=window.localStorage.getItem(api.WORLD_SHELF_KEY);
    const blocked=vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw Error('quota');});
    addBlock(engine,3);autosave();
    const status=app.host.querySelector('[data-gwe-save-status]');expect(status).toBeTruthy();expect(status.textContent).toMatch(/could not|unavailable|not saved|failed/i);
    app.patch({blockRotation:1});expect(app.host.querySelector('[data-gwe-save-status]')).toBeTruthy();
    app.patch({sandboxDockCollapsed:true});
    const collapsedStatus=app.host.querySelector('[data-gwe-save-status]');expect(collapsedStatus).toBeTruthy();expect(collapsedStatus.querySelector('[role=alert]')).toBeTruthy();
    expect(collapsedStatus.closest('.gwe-builder-body')).toBeNull();
    expect(app.host.querySelector('[data-gwe-backup-current]')).toBeTruthy();
    const exported=backup(app);expect(exported.title).toBe('Sunlit bridge');expect(exported.blocks).toHaveLength(2);
    expect(window.localStorage.getItem(api.WORLD_SHELF_KEY)).toBe(raw);
    blocked.mockRestore();
    // Commit the automatic save before the following frame restores focus.
    React.act(()=>vi.advanceTimersByTime(2500));React.act(()=>vi.advanceTimersByTime(40));
    expect(currentProject(engine).world.blocks).toHaveLength(2);expect(app.host.querySelector('[data-gwe-backup-current]')).toBeNull();
    expect(document.activeElement).toBe(app.host.querySelector('.gwe-builder-head button'));
  });
});
