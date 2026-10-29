import {describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const require=createRequire(import.meta.url),THREE=require(resolve('vendor/three-r128/three.min.js'));
const source=readFileSync(resolve('stem_lab/stem_tool_dinolab.js'),'utf8').replace(/\r\n/g,'\n');
function block(start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a);
  if(a<0||b<=a)throw Error('Context return capture missing: '+start);
  return source.slice(a,b);
}
const methods=block('            activeCameraControl.showPartContext = function () {','            activeCameraControl.captureShapeView = function () {');
const clearSource=block('        function clearPartContextView() {','        var partInspectionFrameRef');
const toggleSource=block('        function togglePartContextView() {','        function focusBodyPartDirectory(');
const vec=(x,y,z)=>new THREE.Vector3(x,y,z);

function cameraFixture(overrides={}){
  const frame={context:'tyrannosaurus|evidence',part:'knee',study:'body',half:vec(.8,.5,.35),target:vec(.2,.6,.1)};
  const deps={
    activeCameraControl:function(){},props:{species:{id:'tyrannosaurus'}},
    selectedBodyPartRef:{current:'knee'},supportingRelationRef:{current:null},shapeStudyRef:{current:null},
    partContextFrameRef:{current:null},partInspectionFrameRef:{current:{part:'earlier locked inspection'}},
    yawRef:{current:{study:'body',framing:'detail'}},modelCenter:vec(.1,.75,-.2),currentCameraFrame:frame,
    start:{yaw:.731,pitch:.247,zoom:.843,study:'body',target:vec(.2,.55,.1),evidence:true},
    setStudyView:vi.fn(),pauseAutoRotate:vi.fn(),setStatus:vi.fn(),draw:vi.fn(),...overrides
  };
  // The extracted methods share real mutable camera variables. The draw stub
  // can supply a newly measured frame without reproducing camera-fit logic.
  const build=new Function('deps',`
    var {activeCameraControl,props,selectedBodyPartRef,supportingRelationRef,shapeStudyRef,partContextFrameRef,partInspectionFrameRef,yawRef,modelCenter,setStudyView,pauseAutoRotate,setStatus,currentCameraFrame}=deps;
    var yaw=deps.start.yaw,pitch=deps.start.pitch,zoom=deps.start.zoom,cameraStudy=deps.start.study,cameraTarget=deps.start.target,cameraTargetIsEvidence=deps.start.evidence;
    function updateCameraView(schedule){deps.draw(schedule);if(schedule===false&&deps.frameOnRefresh)currentCameraFrame=deps.frameOnRefresh;}
    ${methods}
    return {control:activeCameraControl,
      read:function(){return {yaw,pitch,zoom,study:cameraStudy,target:cameraTarget,evidence:cameraTargetIsEvidence,framing:yawRef.current.framing};},
      orbit:function(next){yaw=next.yaw;pitch=next.pitch;zoom=next.zoom;cameraTarget=next.target;cameraTargetIsEvidence=next.evidence;yawRef.current.framing=next.framing;}
    };
  `);
  return {...build(deps),deps};
}
function outerFixture(control,overrides={}){
  const deps={cameraControlRef:{current:control},partContextFrameRef:{current:null},partContextPresetRef:{current:null},active:false,preset:'side',activeChanges:vi.fn(),presetChanges:vi.fn(),focus:vi.fn(),...overrides};
  const build=new Function('deps',`
    var {cameraControlRef,partContextFrameRef,partContextPresetRef}=deps;
    var partContextActive=deps.active,cameraPreset=deps.preset;
    function setPartContextActive(next){partContextActive=next;deps.activeChanges(next);}
    function setCameraPreset(next){cameraPreset=next;deps.presetChanges(next);}
    function focusBodyPartModel(){deps.focus();}
    ${clearSource}${toggleSource}
    return {toggle:togglePartContextView,read:function(){return {active:partContextActive,preset:cameraPreset,savedPreset:partContextPresetRef.current};}};
  `);
  return {...build(deps),deps};
}

describe('Temporary whole-animal context and exact detail return',()=>{
  it('captures the displayed detail frame independently and fits the whole animal without changing its viewing direction or selection',()=>{
    for(const study of ['head','body','tail']){
      const view=cameraFixture({start:{yaw:.731,pitch:.247,zoom:.843,study,target:vec(.2,.55,.1),evidence:true}}),d=view.deps;
      const latest={context:'tyrannosaurus|evidence',part:'knee',study,half:vec(1.1,.9,.6),target:vec(.3,.8,-.1)};
      d.frameOnRefresh=latest;
      const before=JSON.stringify({start:d.start,latest,center:d.modelCenter,selection:d.selectedBodyPartRef});
      Object.freeze(d.start.target);Object.freeze(latest.half);Object.freeze(latest.target);
      expect(view.control.showPartContext()).toBe(true);
      const saved=d.partContextFrameRef.current;
      expect(saved.owner).toBe(view.control);expect(saved.part).toBe('knee');
      expect([saved.yaw,saved.pitch,saved.zoom,saved.study,saved.evidence,saved.framing]).toEqual([.731,.247,.843,study,true,'detail']);
      expect(saved.target.toArray()).toEqual([.2,.55,.1]);expect(saved.target).not.toBe(d.start.target);
      expect(saved.inspection).toEqual(latest);expect(saved.inspection).not.toBe(latest);
      expect(saved.inspection.half).not.toBe(latest.half);expect(saved.inspection.target).not.toBe(latest.target);
      expect(view.read()).toEqual({yaw:.731,pitch:.247,zoom:1,study:'full',target:d.modelCenter,evidence:false,framing:'full'});
      expect(view.read().target).not.toBe(d.modelCenter);expect(d.partInspectionFrameRef.current).toBeNull();
      expect(d.selectedBodyPartRef.current).toBe('knee');expect(d.setStudyView).toHaveBeenLastCalledWith({speciesId:'tyrannosaurus',region:'full'});
      expect(d.draw.mock.calls).toEqual([[false],[undefined]]);expect(d.pauseAutoRotate).toHaveBeenCalledWith(30000);
      expect(JSON.stringify({start:d.start,latest,center:d.modelCenter,selection:d.selectedBodyPartRef})).toBe(before);
    }
  });

  it('restores the saved private camera pose, target, evidence mode and measured inspection after orbiting context, exactly once',()=>{
    const f=cameraFixture(),d=f.deps,original=f.read();
    expect(f.control.showPartContext()).toBe(true);
    const saved=d.partContextFrameRef.current,savedJson=JSON.stringify({...saved,owner:undefined});
    d.currentCameraFrame.half.set(9,9,9);d.currentCameraFrame.target.set(8,8,8);
    f.orbit({yaw:-1.2,pitch:1.1,zoom:1.6,target:vec(-4,3,2),evidence:false,framing:'whole'});
    d.draw.mockClear();
    expect(f.control.restorePartDetail()).toBe(true);
    expect(f.read()).toEqual(original);expect(f.read().target).not.toBe(saved.target);
    expect(d.partInspectionFrameRef.current).toBe(saved.inspection);
    expect(d.partInspectionFrameRef.current.half.toArray()).toEqual([.8,.5,.35]);
    expect(d.partInspectionFrameRef.current.target.toArray()).toEqual([.2,.6,.1]);
    expect(JSON.stringify({...saved,owner:undefined})).toBe(savedJson);
    expect(d.partContextFrameRef.current).toBeNull();expect(d.selectedBodyPartRef.current).toBe('knee');
    expect(d.setStudyView).toHaveBeenLastCalledWith({speciesId:'tyrannosaurus',region:'body'});
    expect(d.draw).toHaveBeenCalledOnce();expect(f.control.restorePartDetail()).toBe(false);expect(d.draw).toHaveBeenCalledOnce();
  });

  it('rejects unselected, comparison and non-detail views before saving or mutating any camera state',()=>{
    for(const patch of [
      {selectedBodyPartRef:{current:''}},{supportingRelationRef:{current:{id:'knee-ankle'}}},{shapeStudyRef:{current:{key:'shape-study'}}},
      ...['full','size','tray'].map(study=>({start:{yaw:.3,pitch:.2,zoom:1,study,target:vec(1,2,3),evidence:false}}))
    ]){
      const f=cameraFixture(patch),before=f.read(),inspection=f.deps.partInspectionFrameRef.current;
      expect(f.control.showPartContext()).toBe(false);expect(f.read()).toEqual(before);
      expect(f.deps.partContextFrameRef.current).toBeNull();expect(f.deps.partInspectionFrameRef.current).toBe(inspection);
      expect(f.deps.draw).not.toHaveBeenCalled();expect(f.deps.setStudyView).not.toHaveBeenCalled();expect(f.deps.pauseAutoRotate).not.toHaveBeenCalled();
    }
  });

  it('rejects stale owner, changed part and newly active comparisons without applying another view’s saved camera',()=>{
    for(const invalidation of ['owner','part','supporting','shape','missing']){
      const f=cameraFixture(),d=f.deps;expect(f.control.showPartContext()).toBe(true);
      if(invalidation==='owner')d.partContextFrameRef.current.owner=function anotherScene(){};
      if(invalidation==='part')d.selectedBodyPartRef.current='ankle';
      if(invalidation==='supporting')d.supportingRelationRef.current={id:'knee-ankle'};
      if(invalidation==='shape')d.shapeStudyRef.current={key:'shape-study'};
      if(invalidation==='missing')d.partContextFrameRef.current=null;
      const before=f.read(),saved=d.partContextFrameRef.current;
      d.draw.mockClear();d.setStudyView.mockClear();
      expect(f.control.restorePartDetail(),invalidation).toBe(false);expect(f.read()).toEqual(before);
      expect(d.partContextFrameRef.current).toBe(saved);expect(d.partInspectionFrameRef.current).toBeNull();
      expect(d.draw).not.toHaveBeenCalled();expect(d.setStudyView).not.toHaveBeenCalled();
    }
  });

  it('coordinates the actual camera methods with temporary UI state and restores the previous preset without changing selected anatomy',()=>{
    const camera=cameraFixture(),outer=outerFixture(camera.control,{partContextFrameRef:camera.deps.partContextFrameRef});
    outer.toggle();
    expect(outer.read()).toEqual({active:true,preset:null,savedPreset:'side'});expect(camera.read().study).toBe('full');
    outer.toggle();
    expect(outer.read()).toEqual({active:false,preset:'side',savedPreset:null});expect(camera.read().study).toBe('body');
    expect(camera.deps.selectedBodyPartRef.current).toBe('knee');expect(outer.deps.focus).toHaveBeenCalledTimes(2);
    expect(outer.deps.activeChanges.mock.calls).toEqual([[true],[false]]);expect(outer.deps.presetChanges.mock.calls).toEqual([[null],['side']]);
  });

  it('leaves inactive controls alone on failed entry and clears a stale return without moving focus or restoring an unrelated preset',()=>{
    for(const control of [null,{}, {showPartContext:vi.fn(()=>false)}]){
      const f=outerFixture(control);f.toggle();
      expect(f.read()).toEqual({active:false,preset:'side',savedPreset:null});
      expect(f.deps.focus).not.toHaveBeenCalled();expect(f.deps.activeChanges).not.toHaveBeenCalled();expect(f.deps.presetChanges).not.toHaveBeenCalled();
    }
    const stale={owner:'old scene'},f=outerFixture({restorePartDetail:vi.fn(()=>false)},{active:true,preset:null,partContextPresetRef:{current:'side'},partContextFrameRef:{current:stale}});
    f.toggle();expect(f.read()).toEqual({active:false,preset:null,savedPreset:null});
    expect(f.deps.partContextFrameRef.current).toBeNull();expect(f.deps.focus).not.toHaveBeenCalled();expect(f.deps.presetChanges).not.toHaveBeenCalled();
  });
});
