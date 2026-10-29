// @vitest-environment jsdom
import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const source=readFileSync(resolve('stem_lab/stem_tool_dinolab.js'),'utf8').replace(/\r\n/g,'\n');
const marker="window.StemLab.registerTool('dinoLab'";
if(!source.includes(marker))throw Error('Dino Lab registration anchor missing');
const previousRegistry=window.StemLab;
window.StemLab={ensureThree:()=>new Promise(()=>{}),registerTool(){}};
let api;
try{
  new Function(source.replace(marker,'globalThis.__dinoPartVisibilityContract={DINOS,dinoPartVisibilityFor,dinoPartInspectionLayers,dinoDetailedBodyPartDefinitions,skeletalAnatomyProfileFor,reconstructionHypothesesFor}; '+marker))();
  api=globalThis.__dinoPartVisibilityContract;
}finally{delete globalThis.__dinoPartVisibilityContract;window.StemLab=previousRegistry;}
const species=id=>api.DINOS.find(dn=>dn.id===id);
function catalog(id){
  const dn=species(id),profile=api.skeletalAnatomyProfileFor(dn);
  return api.dinoDetailedBodyPartDefinitions(dn,profile.weightBearingForelimbs,api.reconstructionHypothesesFor(dn,profile,'evidence').active);
}
const parts=catalog('archaeopteryx'),part=id=>parts.find(item=>item.id===id);
const visible=(id,skeleton,body,opacity)=>api.dinoPartVisibilityFor(species('archaeopteryx'),part(id),skeleton,body,opacity);

describe('Selected body-part layer visibility',()=>{
  it('distinguishes a disabled bone layer from bone covered by an opaque life surface, at the real opacity boundary',()=>{
    for(const [skeleton,body,opacity] of [[false,false,45],[false,true,45],[false,true,100],[true,true,98],[true,true,'98'],[true,true,100]]){
      const notice=visible('skull',skeleton,body,opacity);
      expect(notice.kind).toBe('bone');expect(notice.action).toBe('Show bone structure');
      expect(notice.patch).toEqual({field3dShowSkeleton:true,field3dShowBody:false,field3dBodyOpacity:28});
      expect(notice.title).toBe(skeleton?'Bone view is covered':'Bone layer is hidden');
      expect(notice.message).toMatch(/fossil layer/i);
    }
    for(const [body,opacity] of [[false,100],[false,98],[true,97.99],[true,45],[true,0]])expect(visible('skull',true,body,opacity)).toBeNull();
  });

  it('prioritizes inferred tissues and reveals their body layer translucently while preserving either skeleton setting',()=>{
    for(const id of ['lungs','airsacs','muscles'])for(const skeleton of [false,true]){
      for(const [body,opacity] of [[false,45],[false,100],[true,98],[true,100]]){
        const notice=visible(id,skeleton,body,opacity);
        expect(notice.kind).toBe('tissue');expect(notice.action).toBe('Reveal inferred tissues');
        expect(notice.message).toMatch(/reconstructions, not preserved organs/i);
        expect(notice.patch).toEqual({field3dShowBody:true,field3dBodyOpacity:45});
        const state={field3dShowSkeleton:skeleton,field3dShowBody:body,field3dBodyOpacity:opacity,...notice.patch};
        expect(state.field3dShowSkeleton).toBe(skeleton);
        expect(visible(id,state.field3dShowSkeleton,state.field3dShowBody,state.field3dBodyOpacity)).toBeNull();
      }
      for(const opacity of [0,45,97.99])expect(visible(id,skeleton,true,opacity)).toBeNull();
    }
  });

  it('reveals the correct surface for surface-only parts and uses a general model notice only for shared-layer parts',()=>{
    for(const skeleton of [false,true]){
      const notice=visible('wing',skeleton,false,45);
      expect(notice.kind).toBe('life');expect(notice.action).toBe('Show life surface');
      expect(notice.patch).toEqual(api.dinoPartInspectionLayers('life'));
      for(const opacity of [0,45,100])expect(visible('wing',skeleton,true,opacity)).toBeNull();
    }
    const general=visible('hand',false,false,45);
    expect(general.kind).toBe('model');expect(general.patch).toEqual(api.dinoPartInspectionLayers('life'));
    for(const [skeleton,body] of [[true,false],[false,true],[true,true]])expect(visible('hand',skeleton,body,100)).toBeNull();
  });

  it('does not invent reveal guidance for missing selections or non-dinosaur comparison proxies',()=>{
    for(const dn of [null,undefined])expect(api.dinoPartVisibilityFor(dn,part('lungs'),false,false,100)).toBeNull();
    for(const selected of [null,undefined])expect(api.dinoPartVisibilityFor(species('archaeopteryx'),selected,false,false,100)).toBeNull();
    const outgroups=api.DINOS.filter(dn=>dn.group==='other');expect(outgroups.length).toBeGreaterThan(0);
    for(const dn of outgroups)for(const selected of [...catalog(dn.id),part('lungs'),part('skull'),part('wing')]){
      expect(api.dinoPartVisibilityFor(dn,selected,false,false,100)).toBeNull();
      expect(api.dinoPartVisibilityFor(dn,selected,true,true,100)).toBeNull();
    }
  });

  it('produces fresh patches that resolve the notice without mutating catalog evidence or unrelated saved settings',()=>{
    let notices=0;
    for(const id of ['archaeopteryx','tyrannosaurus','triceratops']){
      const dn=species(id),catalogParts=catalog(id),before=JSON.stringify({dn,catalogParts});
      catalogParts.forEach(Object.freeze);
      for(const selected of catalogParts)for(const skeleton of [false,true])for(const body of [false,true])for(const opacity of [45,100]){
        const notice=api.dinoPartVisibilityFor(dn,selected,skeleton,body,opacity);if(!notice)continue;notices++;
        const repeat=api.dinoPartVisibilityFor(dn,selected,skeleton,body,opacity);
        expect(repeat).toEqual(notice);expect(repeat).not.toBe(notice);expect(repeat.patch).not.toBe(notice.patch);
        expect(Object.keys(notice.patch).every(key=>['field3dShowSkeleton','field3dShowBody','field3dBodyOpacity'].includes(key))).toBe(true);
        const state={field3dShowSkeleton:skeleton,field3dShowBody:body,field3dBodyOpacity:opacity,
          field3dShowHuman:true,field3dShowEvidence:true,field3dSelected:id,field3dReconstructionMode:'evidence',
          field3dFocusSelectedLabel:true,field3dScientificNames:true,field3dPartComparisons:{saved:'My observation'}};
        const original=JSON.stringify(state),next={...state,...notice.patch};
        for(const key of Object.keys(state).filter(key=>!['field3dShowSkeleton','field3dShowBody','field3dBodyOpacity'].includes(key)))expect(next[key]).toBe(state[key]);
        expect(api.dinoPartVisibilityFor(dn,selected,next.field3dShowSkeleton,next.field3dShowBody,next.field3dBodyOpacity)).toBeNull();
        notice.patch.field3dBodyOpacity=12;
        expect(api.dinoPartVisibilityFor(dn,selected,skeleton,body,opacity)).toEqual(repeat);
        expect(JSON.stringify(state)).toBe(original);
      }
      expect(JSON.stringify({dn,catalogParts})).toBe(before);
    }
    expect(notices).toBeGreaterThan(100);
  });
});

const revealStart=source.indexOf('        function revealSelectedBodyPart() {');
const revealEnd=source.indexOf('        function renderBodyPartGuide(',revealStart);
if(revealStart<0||revealEnd<=revealStart)throw Error('Body-part reveal handler capture missing');
const revealCode=source.slice(revealStart,revealEnd);
function revealFixture(overrides={}){
  const events=[],frames=[],camera=vi.fn();camera.preserveInspectionFrame=vi.fn(()=>events.push('preserve'));
  const props={species:species('archaeopteryx'),showSkeleton:true,showBody:true,bodyOpacity:100,onPartReveal:vi.fn(()=>events.push('patch')),...overrides.props};
  const focus=vi.fn(()=>events.push('focus'));
  const values={props,selected:part('lungs'),opacity:100,camera,...overrides};values.props=props;
  const reveal=new Function('dinoPartVisibilityFor','props','selectedBodyPart','bodyOpacity','cameraControlRef','window','focusBodyPartModel',revealCode+'\nreturn revealSelectedBodyPart;')
    (api.dinoPartVisibilityFor,props,values.selected,values.opacity,{current:values.camera},{requestAnimationFrame(callback){frames.push(callback);events.push('queued');}},focus);
  return {reveal,props,camera,events,frames,focus};
}
describe('Selected-part reveal action',()=>{
  it('preserves the current frame before changing layers and focuses the canvas only after React can commit',()=>{
    const f=revealFixture();f.reveal();
    expect(f.camera.preserveInspectionFrame).toHaveBeenCalledOnce();expect(f.camera).not.toHaveBeenCalled();
    expect(f.props.onPartReveal).toHaveBeenCalledWith({field3dShowBody:true,field3dBodyOpacity:45},part('lungs').label,'tissue');
    expect(f.events).toEqual(['preserve','patch','queued']);expect(f.focus).not.toHaveBeenCalled();
    f.frames[0]();expect(f.events).toEqual(['preserve','patch','queued','focus']);
  });

  it('uses live local opacity instead of stale saved props and safely skips absent notices or callbacks',()=>{
    for(const overrides of [{opacity:45},{selected:null},{props:{species:species('dimetrodon')}},{props:{onPartReveal:null}}]){
      const f=revealFixture(overrides);f.reveal();expect(f.events).toEqual([]);
      expect(f.camera).not.toHaveBeenCalled();expect(f.camera.preserveInspectionFrame).not.toHaveBeenCalled();expect(f.frames).toHaveLength(0);
    }
  });

  it('can reveal a hidden bone without a ready camera control, leaving selection and reconstruction records unchanged',()=>{
    const f=revealFixture({selected:part('skull'),camera:null,props:{showSkeleton:false,showBody:true}});
    const selectedBefore=JSON.stringify(part('skull'));f.reveal();
    expect(f.props.onPartReveal).toHaveBeenCalledWith(api.dinoPartInspectionLayers('bone'),part('skull').label,'bone');
    expect(f.events).toEqual(['patch','queued']);expect(JSON.stringify(part('skull'))).toBe(selectedBefore);
  });
});
