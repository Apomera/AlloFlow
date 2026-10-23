import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { installCanvas2DStub, installLoopStubs, installThreeStub } from './helpers/galaxy_three_stub.js';

const FILE='stem_lab/stem_tool_galaxy.js', source=readFileSync(FILE,'utf8');
const kernel=['GALAXY ROTATION MODEL','GALAXY ROTATION INVESTIGATION','GALAXY RADIUS GUIDES'].map(name=>source.split('// BEGIN '+name)[1].split('// END '+name)[0]).join('\n');
const model=new Function(kernel+';return {spec:galaxyRotationGuideSpec,segments:galaxyRadiusGuideSegments};')();
const samples=(...radii)=>radii.map(radiusKpc=>({radiusKpc}));

describe('Galaxy scene radius guide model',()=>{
  it('maps probe and saved radii onto the same disk scale and avoids coincident rings',()=>{
    expect(model.spec({galaxyControlPanel:'motion',rotationProbeRadius:12,rotationSamples:samples(12,6,3)})).toMatchObject({visible:true,radiusKpc:12,savedRadii:[3,6,12],displayedSavedRadii:[3,6]});
    expect(model.spec({rotationProbeRadius:8.25,rotationSamples:samples(8.2)}).displayedSavedRadii).toEqual([]);
    expect(model.spec({rotationProbeRadius:8.26,rotationSamples:samples(8.2)}).displayedSavedRadii).toEqual([8.2]);
  });
  it('follows exact selected radii until the probe is fixed and uses bounded fallbacks',()=>{
    const selectedStarMeasurement={radiusNorm:.23456};
    expect(model.spec({selectedStarMeasurement})).toMatchObject({followingStar:true,radiusKpc:.23456*15});
    expect(model.spec({selectedStarMeasurement,rotationProbeRadius:12})).toMatchObject({followingStar:false,radiusKpc:12});
    expect(model.spec({selectedStarMeasurement:{radiusNorm:'bad'},rotationProbeRadius:Infinity}).radiusKpc).toBe(8.2);
    expect(model.spec({rotationProbeRadius:-2}).radiusKpc).toBe(.6);
    expect(model.spec({rotationProbeRadius:40}).radiusKpc).toBe(15);
  });
  it.each([
    {galaxyControlPanel:'view'}, {galaxyType:'elliptical'}, {galaxyType:'irregular'}, {simMode:'blackHole'}, {quizMode:true}, {webglError:true}, {rotationGuides:false}
  ])('suppresses scene guides in the correct scope: %j', patch=>{
    expect(model.spec({galaxyControlPanel:'motion',...patch}).visible).toBe(false);
  });
  it('preserves bounded saved locations when guides are hidden',()=>{
    const spec=model.spec({rotationGuides:false,rotationSamples:[null,...samples(1,2,3,4,5,6,7,8,9),{radiusKpc:Infinity}]});
    expect(spec.savedRadii).toEqual([1,2,3,4,5,6,7,8]);expect(spec.enabled).toBe(false);
    expect(model.spec({galaxyType:'grandDesign',galaxyControlPanel:'motion'}).visible).toBe(true);
  });
  it('creates separated finite unit-radius segments confined to the disk plane',()=>{
    const vertices=model.segments();expect(vertices).toHaveLength(96*6);
    for(let i=0;i<vertices.length;i+=3){expect(vertices[i+1]).toBe(0);expect(Math.hypot(vertices[i],vertices[i+2])).toBeCloseTo(1,6);}
    const endpoint=Math.atan2(vertices[5],vertices[3]),nextStart=Math.atan2(vertices[8],vertices[6]);expect(nextStart).toBeGreaterThan(endpoint);
  });
});

describe('Galaxy scene radius guide rendering',()=>{
  beforeEach(()=>{resetStemLab();window._galaxyHasLoadedOnce=true;loadTool(FILE,'galaxy');});
  function render(data={}){const root=document.createElement('div');root.innerHTML=renderTool('galaxy',{galaxy:{simMode:'galaxy',galaxyControlPanel:'motion',...data}});return root;}
  it('explains the ring patterns and defers scene controls until the scene is ready',()=>{
    const root=render(),button=root.querySelector('[data-galaxy-radius-guide-toggle]');
    expect(button.disabled).toBe(true);expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('#galaxy-radius-guides-help').textContent).toContain('not individual star orbits');
    expect(root.querySelector('[data-galaxy-radius-guide-face]').textContent).toContain('from above');
    expect(root.querySelector('[data-galaxy-radius-guide-status]').textContent).toContain('scene loads');
  });
  it.each(['elliptical','irregular'])('does not offer disk guides for %s', galaxyType=>{
    expect(render({galaxyType}).querySelector('[data-galaxy-radius-guide-controls]')).toBeNull();
  });
  it('retains the chart investigation when 3D is unavailable',()=>{
    const root=render({webglError:true,rotationSamples:samples(6,12)});
    expect(root.querySelector('[data-galaxy-radius-guide-controls]')).toBeNull();
    expect(root.querySelector('[data-galaxy-rotation-investigation]')).not.toBeNull();
    expect(root.querySelectorAll('[data-galaxy-rotation-sample]')).toHaveLength(2);
  });
  it('mirrors every guide label in the English catalog and both registries',()=>{
    const a=JSON.parse(readFileSync('ui_strings.js','utf8')).stem.galaxy,b=JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js','utf8')).stem.galaxy,c=JSON.parse(readFileSync('dev-tools/i18n/stem_galaxy_en.json','utf8'));
    const keys=[...source.matchAll(/__alloT\('stem\.galaxy\.(radius_guides_[a-z_]+)'/g)].map(m=>m[1]);expect(new Set(keys).size).toBe(8);
    for(const key of keys){expect(a[key]).toBe(b[key]);expect(a[key]).toBe(c[key]);}
  });
});

describe('Galaxy scene radius guide runtime',()=>{
  let host,root,restoreCanvas,restoreThree,loops,errorSpy,latest,patch,scenes,originalMatchMedia;
  beforeEach(()=>{
    resetStemLab();window._galaxyHasLoadedOnce=true;window._galaxyPPLoaded=true;delete window._galaxyPPLoading;delete window._galaxyPPCallbacks;
    globalThis.IS_REACT_ACT_ENVIRONMENT=true;
    originalMatchMedia=window.matchMedia;
    window.matchMedia=vi.fn(query=>({matches:query.includes('prefers-reduced-motion'),media:query,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}}));
    restoreCanvas=installCanvas2DStub().restore;restoreThree=installThreeStub();loops=installLoopStubs();
    const Attribute=window.THREE.BufferAttribute;window.THREE.BufferAttribute=function(array,itemSize){const attr=new Attribute(array,itemSize);attr.setXYZ=function(i,x,y,z){const offset=i*itemSize;attr.array[offset]=x;attr.array[offset+1]=y;attr.array[offset+2]=z;return attr;};return attr;};
    scenes=[];const Scene=window.THREE.Scene;window.THREE.Scene=function(){const scene=new Scene();scenes.push(scene);return scene;};
    errorSpy=vi.spyOn(console,'error').mockImplementation(()=>{});host=document.createElement('div');document.body.appendChild(host);
  });
  afterEach(async()=>{
    if(root)await React.act(async()=>root.unmount());root=null;host.remove();
    expect(errorSpy.mock.calls.filter(call=>/\[Galaxy\]|\[StemLab\]/.test(call.join(' ')))).toEqual([]);
    errorSpy.mockRestore();loops();restoreThree();restoreCanvas();window.matchMedia=originalMatchMedia;delete globalThis.IS_REACT_ACT_ENVIRONMENT;delete window._galaxyPPLoaded;vi.restoreAllMocks();
  });
  async function mount(data={}){
    window.StemLab.ensureThree=()=>Promise.resolve();const cfg=loadTool(FILE,'galaxy');latest={galaxy:{simMode:'galaxy',galaxyControlPanel:'motion',starCount:2500,galaxyQuality:'balanced',galaxyAutoRotate:false,...data}};
    function Host(){const state=React.useState(latest);latest=state[0];patch=p=>state[1](prev=>({...prev,galaxy:{...prev.galaxy,...p}}));return cfg.render(makeCtx({toolData:state[0],setToolData:state[1]}));}
    root=ReactDOMClient.createRoot(host);await React.act(async()=>root.render(React.createElement(Host)));
    return host.querySelector('[data-galaxy-canvas]');
  }
  const guideGroup=()=>scenes.flatMap(scene=>scene.children).find(node=>node.name==='galaxyRadiusGuides');
  async function update(data){await React.act(async()=>patch(data));}
  it('updates guide scales without rebuilding geometry, stars, or the camera view',async()=>{
    const canvas=await mount({rotationProbeRadius:12,rotationSamples:samples(6,12)}),group=guideGroup(),objects=group.children.slice(),geometries=objects.map(o=>o.geometry),sceneCount=scenes.length;
    expect(canvas._galaxyGetRadiusGuideState()).toMatchObject({visible:true,probeRadiusKpc:12,probeScale:.8,displayedSavedRadii:[{radiusKpc:6,scale:.4}]});
    await React.act(async()=>canvas._galaxySetViewAngle('edge'));
    for(const radius of [3,15,.6,8.2])await update({rotationProbeRadius:radius,rotationSamples:samples(6,9,12)});
    expect(scenes).toHaveLength(sceneCount);expect(group.children).toEqual(objects);expect(group.children.map(o=>o.geometry)).toEqual(geometries);
    expect(canvas._galaxyGetOrientationState()).toMatchObject({ preset: 'edge', roundedElevation: 0 });
    expect(host.querySelector('[data-galaxy-orientation] [data-galaxy-orientation-elevation]').textContent).toBe('0°');
    expect(canvas._galaxyGetRadiusGuideState().probeScale).toBeCloseTo(8.2/15,12);
    expect(new Set(geometries).size).toBe(3);
  });
  it('follows native star selections and keeps a fixed probe while another star is selected',async()=>{
    const canvas=await mount();await React.act(async()=>canvas._galaxyCycleStar(1));
    const radius=latest.galaxy.selectedStarMeasurement.radiusNorm*15;
    expect(canvas._galaxyGetRadiusGuideState()).toMatchObject({followingStar:true,probeRadiusKpc:radius});
    await update({rotationProbeRadius:12});await React.act(async()=>canvas._galaxyCycleStar(1));
    expect(canvas._galaxyGetRadiusGuideState()).toMatchObject({followingStar:false,probeRadiusKpc:12});
  });
  it('hides and restores guides across tabs and respects the saved preference',async()=>{
    const canvas=await mount({rotationSamples:samples(6,12)});await update({galaxyControlPanel:'view'});expect(canvas._galaxyGetRadiusGuideState().visible).toBe(false);
    await update({galaxyControlPanel:'motion'});expect(canvas._galaxyGetRadiusGuideState().visible).toBe(true);
    await update({rotationGuides:false});expect(canvas._galaxyGetRadiusGuideState().visible).toBe(false);
    expect(latest.galaxy.rotationSamples).toEqual(samples(6,12));
  });
  it('restores the latest guide state after leaving Focus view',async()=>{
    const canvas=await mount();await React.act(async()=>canvas._galaxySetFocusView(true));expect(canvas._galaxyGetRadiusGuideState().visible).toBe(false);
    await update({rotationGuides:false,rotationProbeRadius:12});await React.act(async()=>canvas._galaxySetFocusView(false));expect(canvas._galaxyGetRadiusGuideState()).toMatchObject({visible:false,probeRadiusKpc:12});
    await update({rotationGuides:true});await React.act(async()=>canvas._galaxySetFocusView(true));await update({rotationProbeRadius:6});await React.act(async()=>canvas._galaxySetFocusView(false));expect(canvas._galaxyGetRadiusGuideState()).toMatchObject({visible:true,probeRadiusKpc:6});
  });
  it('disposes each shared guide geometry and material once and retires scene handles',async()=>{
    const canvas=await mount(),group=guideGroup(),geometry=[...new Set(group.children.map(o=>o.geometry))],materials=[...new Set(group.children.map(o=>o.material))];
    const disposals=[...geometry,...materials].map(resource=>vi.spyOn(resource,'dispose'));
    await React.act(async()=>root.unmount());root=null;
    for(const dispose of disposals)expect(dispose).toHaveBeenCalledTimes(1);
    expect(canvas._galaxySetRadiusGuides).toBeNull();expect(canvas._galaxyGetRadiusGuideState).toBeNull();
  });
},30000);
