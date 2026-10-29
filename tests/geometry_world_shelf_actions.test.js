import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {React,ReactDOMClient,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

let api,mounted,downloads,clicked;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
beforeEach(()=>{
  vi.useFakeTimers();
  const lab=resetStemLab();lab.registerTool('geometryWorld',{aliases:[],render(ctx){return ctx.React.createElement('main',{id:'geoworld-fs-workspace'});}});
  if(!document.getElementById('allo-geometryworld-builder-css')){const style=document.createElement('style');style.id='allo-geometryworld-builder-css';document.head.appendChild(style);}
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();api=window.StemLab.geometryWorldBuilderPure;
  downloads=[];clicked=[];
  vi.stubGlobal('Blob',class{constructor(parts,options){this.parts=parts;this.type=options?.type;}});
  vi.stubGlobal('URL',{createObjectURL(blob){downloads.push(blob);return 'blob:shelf-test';},revokeObjectURL:vi.fn()});
  vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(){clicked.push(this.download);});
});
afterEach(()=>{if(mounted){React.act(()=>mounted.root.unmount());mounted.host.remove();mounted=null;}vi.clearAllTimers();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();window.localStorage.removeItem(api.WORLD_SHELF_KEY);delete window.__geoWorldEngine;});
function project(id='world_a',version='v1',title='First build',x=0){return {id,version,savedAt:100, garden:true,world:{schema:'alloflow-geometry-world/2',coordinateSystem:'x-right,y-up,z-depth',title,blocks:[{x,y:1,z:0,type:'stone',shape:'cube',rotation:0}]}};}
function shelf(projects){return JSON.stringify({schema:'alloflow-geometry-projects/1',projects});}
function storage(projects=[project()]){let raw=shelf(projects);return {getItem:()=>raw,setItem:vi.fn((_key,value)=>{raw=value;}),raw:()=>raw,replace:projects=>{raw=shelf(projects);}};}
function mountShelf(projects){
  window.localStorage.setItem(api.WORLD_SHELF_KEY,shelf(projects));
  window.__geoWorldEngine={blocks:{},_currentLesson:{sandbox:false},_builderSelection:null};
  const toolData={geometryWorld:{showGeometryHome:true,geometryHomePage:'open',worldActive:false,_introShownOnce:true}};
  let bump;const ctx={React,toolData,updateMulti(tool,patch){toolData[tool]={...toolData[tool],...patch};bump?.();},t:(_key,fallback)=>fallback};
  const host=document.createElement('div');document.body.append(host);const root=ReactDOMClient.createRoot(host);
  React.act(()=>root.render(React.createElement(function Host(){const state=React.useState(0);bump=()=>state[1](x=>x+1);return window.StemLab._registry.geometryWorld.render(ctx);})));
  mounted={host,root,ctx};return mounted;
}
function click(node){expect(node).toBeTruthy();React.act(()=>node.click());}
function button(app,text){return [...app.host.querySelectorAll('button')].find(node=>node.textContent===text);}
function settle(){React.act(()=>vi.advanceTimersByTime(40));}

describe('saved Geometry World project actions',()=>{
  it('downloads the current stored version, not the old card snapshot, without changing live work',()=>{
    const store=storage(),old=api.readWorldShelf(store).projects[0];const live={blocks:{keep:true},_builderSelection:{blocks:[{x:7,y:2,z:3}]},_workshopProjectId:'other',_workshopProjectVersion:'keep',_undoStack:[{keep:true}]};window.__geoWorldEngine=live;const before=JSON.stringify(live);
    const latest=project('world_a','v2','Updated build',4);store.replace([latest]);const raw=store.raw();
    const result=api.downloadWorldProject(old.id,store);
    expect(result.ok).toBe(true);expect(result.project.version).toBe('v2');expect(JSON.parse(downloads[0].parts[0])).toEqual(latest.world);expect(clicked).toEqual(['updated-build.json']);expect(store.raw()).toBe(raw);expect(store.setItem).not.toHaveBeenCalled();expect(JSON.stringify(live)).toBe(before);
  });
  it('keeps a newer version when removal was confirmed against an older card',()=>{
    const newer=project('world_a','v2','New title',4),store=storage([newer]),raw=store.raw();
    window.__geoWorldEngine={_workshopProjectId:'other',_builderSelection:{blocks:[{x:9,y:1,z:0}]}};const before=JSON.stringify(window.__geoWorldEngine);
    const result=api.removeWorldProject('world_a',store,'v1');expect(result).toMatchObject({ok:false,conflict:true,projects:[newer]});expect(result.reason).toContain('changed in another tab');expect(store.raw()).toBe(raw);expect(store.setItem).not.toHaveBeenCalled();expect(JSON.stringify(window.__geoWorldEngine)).toBe(before);
  });
  it('removes only the reviewed version and preserves every other project',()=>{
    const other=project('world_b','v5','Other build',5),store=storage([project(),other]);const result=api.removeWorldProject('world_a',store,'v1');expect(result.ok).toBe(true);expect(api.readWorldShelf(store).projects).toEqual([other]);expect(store.setItem).toHaveBeenCalledOnce();
  });
  it.each(['downloadWorldProject','removeWorldProject'])('reports a deleted project without downloading or rewriting the shelf (%s)',action=>{
    const other=project('world_b'),store=storage([other]),raw=store.raw();const result=api[action]('world_a',store,'v1');expect(result).toMatchObject({ok:false,missing:true,projects:[other]});expect(store.raw()).toBe(raw);expect(store.setItem).not.toHaveBeenCalled();expect(downloads).toEqual([]);
  });
  it.each(['downloadWorldProject','removeWorldProject'])('preserves corrupt or unavailable browser storage (%s)',action=>{
    for(const store of [{getItem(){throw Error('blocked');},setItem:vi.fn()},{getItem:()=>'{broken',setItem:vi.fn()}]){expect(api[action]('world_a',store,'v1').ok).toBe(false);expect(store.setItem).not.toHaveBeenCalled();}expect(downloads).toEqual([]);
  });
  it('keeps the shelf unchanged after a failed removal write',()=>{
    const store=storage(),raw=store.raw();store.setItem.mockImplementation(()=>{throw Error('quota');});const result=api.removeWorldProject('world_a',store,'v1');expect(result.ok).toBe(false);expect(store.raw()).toBe(raw);
  });
  it('reports download failures without deleting or changing the saved project',()=>{
    const store=storage(),raw=store.raw();vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{throw Error('blocked');});expect(api.downloadWorldProject('world_a',store)).toMatchObject({ok:false,reason:expect.stringContaining('Try Download project JSON again')});expect(store.raw()).toBe(raw);expect(store.setItem).not.toHaveBeenCalled();
  });
  it('refuses empty saved projects without creating a misleading download',()=>{
    const empty=project();empty.world.blocks=[];const store=storage([empty]);expect(api.downloadWorldProject(empty.id,store)).toMatchObject({ok:false,reason:expect.stringContaining('empty')});expect(downloads).toEqual([]);expect(store.setItem).not.toHaveBeenCalled();
  });
});

describe('My Worlds refreshed action feedback and focus',()=>{
  it('keeps a saved project if it becomes the active workspace before confirmation',()=>{
    const app=mountShelf([project()]);click(app.host.querySelector('.gwe-project-pick'));click(button(app,'Remove from shelf'));
    window.__geoWorldEngine._workshopProjectId='world_a';click(button(app,'Confirm removal'));settle();
    expect(api.readWorldShelf().projects).toEqual([project()]);expect(app.host.querySelector('.gwe-project-remove')).toBeNull();expect(app.host.querySelector('.gwe-project-status').textContent).toContain('now your current project');expect(document.activeElement).toBe(app.host.querySelector('.gwe-project-pick'));
  });
  it('refreshes the saved card after downloading a newer version',()=>{
    const app=mountShelf([project()]);click(app.host.querySelector('.gwe-project-pick'));
    window.localStorage.setItem(api.WORLD_SHELF_KEY,shelf([project('world_a','v2','Latest title',4)]));click(button(app,'Download project JSON'));settle();
    expect(app.host.querySelector('.gwe-project-pick').textContent).toContain('Latest title');expect(JSON.parse(downloads[0].parts[0]).title).toBe('Latest title');expect(app.host.querySelector('.gwe-project-status').textContent).toContain('latest saved version');expect(document.activeElement).toBe(app.host.querySelector('.gwe-project-pick'));
  });
  it('requires a fresh removal confirmation after another tab edits the selected saved project',()=>{
    const app=mountShelf([project()]);click(app.host.querySelector('.gwe-project-pick'));click(button(app,'Remove from shelf'));
    const updated=project('world_a','v2','Updated after confirmation',4);window.localStorage.setItem(api.WORLD_SHELF_KEY,shelf([updated]));click(button(app,'Confirm removal'));settle();
    expect(api.readWorldShelf().projects).toEqual([updated]);expect(app.host.querySelector('.gwe-project-remove')).toBeNull();expect(app.host.querySelector('.gwe-project-status').textContent).toContain('changed in another tab');expect(document.activeElement).toBe(app.host.querySelector('.gwe-project-pick'));
    click(button(app,'Remove from shelf'));click(button(app,'Confirm removal'));settle();expect(api.readWorldShelf().projects).toEqual([]);expect(document.activeElement).toBe(app.host.querySelector('.gwe-shelf-heading h2'));
  });
});
