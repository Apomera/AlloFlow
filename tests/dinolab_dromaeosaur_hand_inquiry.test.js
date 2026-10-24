// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url), React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const source = readFileSync(resolve(process.env.DINO_DROMAEOSAUR_LEARNING_SOURCE || 'stem_lab/stem_tool_dinolab.js'), 'utf8').replace(/\r\n/g, '\n');
const marker = "window.StemLab.registerTool('dinoLab'", mounted = [], frames = [];
const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT, previousRaf = window.requestAnimationFrame;
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; window.requestAnimationFrame = callback => { frames.push(callback); return frames.length; }; });
afterAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct; window.requestAnimationFrame = previousRaf; });
afterEach(async () => { for (const { root, host } of mounted.splice(0)) { await React.act(async () => root.unmount()); host.remove(); } delete window.__raptorHandCamera; delete window.__raptorHandSelection; frames.splice(0); });
function load() {
  const captured = { ensures: 0 };
  window.StemLab = { ensureThree() { captured.ensures++; return new Promise(() => {}); }, registerTool(_id, cfg) { captured.cfg = cfg; } };
  new Function(source
    .replace('var cameraControlRef = React.useRef(null);', 'var cameraControlRef = React.useRef(null); window.__raptorHandCamera=cameraControlRef;')
    .replace('shapeHandRef.current = { active: shapeHandEligible, context: shapeViewContext, ray: shapeHandRay, focused: shapeHandFocused };', 'shapeHandRef.current = { active: shapeHandEligible, context: shapeViewContext, ray: shapeHandRay, focused: shapeHandFocused }; window.__raptorHandSelection=shapeHandRef;')
    .replace(marker, 'globalThis.__raptorHandAPI={DINOS,DINO_SHAPE_STUDY_FAMILIES,dinoShapeStudyFor,dinoShapeStudyPairFor,dinoShapeHandEvidenceEligible,dinoShapeHandRayEvidence,dinoTheropodForelimbProfileFor,dinoShapeViewCapture,dinoShapeViewCaption,dinoShapeViewNotebookAppend,dinoDetailedBodyPartDefinitions,dinoPartInspectionFor,comparisonPairKey};'+marker))();
  const api=globalThis.__raptorHandAPI; delete globalThis.__raptorHandAPI;
  return { api, cfg: captured.cfg, ensures: () => captured.ensures };
}
const animal=(api,id)=>api.DINOS.find(row=>row.id===id);
const study=(api,extra={})=>api.dinoShapeStudyFor({family:'dromaeosaur-hands',b:'deinonychus',active:'a',...extra});
const ownWriting={version:1,pairs:[{key:'deinonychus|velociraptor',a:'deinonychus',b:'velociraptor',step:'explain',prediction:'The finger proportions may differ.',evidence:['traits'],explanation:'My own observation.',limit:'The complete resting pose is reconstructed.'}]};
async function mount() {
  const loaded=load(),host=document.createElement('div');document.body.append(host);const root=createRoot(host);
  let data={tab:'field3d',selected:'velociraptor',field3dSelected:'velociraptor',field3dLabelMode:'anatomy',field3dReconstructionMode:'evidence',field3dShapeStudy:{family:'dromaeosaur-hands',b:'deinonychus',active:'a'},field3dShowSkeleton:true,field3dShowBody:false,compareInquiry:structuredClone(ownWriting)};
  function render(){root.render(loaded.cfg.render({React,toolData:{dinoLab:data},update(_scope,key,value){data={...data,[key]:value};render();},updateMulti(_scope,patch){data={...data,...patch};render();},announceToSR(){}}));}
  mounted.push({root,host});await React.act(async()=>render());
  const camera=vi.fn();camera.focusHand=vi.fn(()=>true);camera.preserveInspectionFrame=vi.fn();window.__raptorHandCamera.current=camera;
  async function act(callback){await React.act(async()=>callback());await React.act(async()=>frames.splice(0).forEach(frame=>frame(0)));}
  return {...loaded,host,camera,data:()=>data,click:selector=>act(()=>{const node=host.querySelector(selector);if(!node)throw Error('Missing hand control '+selector);node.click();}),ray:value=>act(()=>{const select=host.querySelector('[data-dino-hand-ray]');select.value=String(value);select.dispatchEvent(new Event('change',{bubbles:true}));})};
}

describe('Dromaeosaur hand investigation connects homologous bones to a cautious explanation',()=>{
  it('opens the shared hand tool deliberately while keeping ambiguous pair resumes on feet',()=>{
    const {api}=load(),a=animal(api,'velociraptor'),b=animal(api,'deinonychus'),hands=study(api);
    expect(hands).toMatchObject({region:'full',partId:'hand',family:{fullBody:true,explicitOnly:true},lens:{id:'hands'}});
    expect(api.dinoShapeHandEvidenceEligible(hands)).toBe(true);
    expect(api.dinoShapeHandEvidenceEligible(study(api,{lens:'outline'}))).toBe(false);
    expect(api.dinoShapeStudyPairFor(a,b).family.id).toBe('dromaeosaur-feet');
    expect(api.dinoShapeStudyPairFor(a,b,'dromaeosaur-hands').family.id).toBe('dromaeosaur-hands');
    expect(api.dinoShapeStudyPairFor(a,b,{key:'deinonychus|velociraptor',family:'dromaeosaur-hands'}).family.id).toBe('dromaeosaur-hands');
    expect(api.dinoShapeStudyPairFor(a,b,{key:'allosaurus|tyrannosaurus',family:'dromaeosaur-hands'}).family.id).toBe('dromaeosaur-feet');
    expect(hands.family.question).toContain('2, 3 and 4 phalanges');expect(hands.lens.prompt).toContain('including unguals');
    expect(hands.family.limit).toContain('does not imply different digit counts');
    expect(hands.family.limit).toContain('maximum motion range');
  });
  it('reports the same three supported rays independently of outline visibility or inferred missing-ray markers',()=>{
    const {api}=load();
    for(const id of ['velociraptor','deinonychus']){
      const p=api.dinoTheropodForelimbProfileFor(animal(api,id));expect(p).not.toBeNull();
      const metadata={species:id,sources:p.sources,limit:p.limit,manualRays:p.manualRays};
      expect(p.manualRays.map(row=>row.phalanges)).toEqual([2,3,4]);
      for(const ray of [1,2,3])expect(api.dinoShapeHandRayEvidence(metadata,id,ray)).toMatchObject({ray,state:'claw-bearing'});
      for(const ray of [4,5]){const result=api.dinoShapeHandRayEvidence(metadata,id,ray);expect(result.state).toBe('not-modeled');expect(result.evidence).toContain('missing outline alone');}
      expect(api.dinoShapeHandRayEvidence({...metadata,species:id==='velociraptor'?'deinonychus':'velociraptor'},id,2).state).toBe('unknown');
      expect(api.dinoShapeHandRayEvidence({...metadata,manualRays:[...p.manualRays,p.manualRays[0]]},id,2).state).toBe('unknown');
      expect(api.dinoShapeHandRayEvidence(metadata,id,2).sources.every(url=>url.startsWith('https://'))).toBe(true);
    }
  });
  it('distinguishes finger structure, palms-in reconstruction, bony core and inferred covering in part inspection',()=>{
    const {api}=load();
    for(const id of ['velociraptor','deinonychus'])for(const partId of ['forelimb','forearm','hand','fingers','elbow','wrist']){
      const dn=animal(api,id),parts=api.dinoDetailedBodyPartDefinitions(dn,false),part=parts.find(row=>row.id===partId);expect(part).toBeTruthy();
      const inspection=api.dinoPartInspectionFor(dn,part);
      expect(inspection.bone).toContain('2-3-4 phalangeal pattern includes each terminal ungual');
      expect(inspection.bone).toContain('missing outline');expect(inspection.life).toContain('keratin sheath');
      expect(inspection.life).toContain('Palms face inward');expect(inspection.limit).toContain('maximum wrist range');
      expect(inspection.limit).toContain('changes visibility, not fossil certainty');expect(inspection.source.url).toMatch(/^https:\/\//);
    }
  });
  it('retains deliberate focus, selected ray and own writing across A/B and layer changes without rebuilding on selection',async()=>{
    const view=await mount(),before=view.ensures(),writing=structuredClone(view.data().compareInquiry);
    expect(view.host.querySelector('[data-dino-hand-ray]').options).toHaveLength(5);
    expect(view.host.querySelector('.dinolab-hand-evidence-control').textContent).toContain('Both species share rays I–III');
    await view.ray(3);expect(window.__raptorHandSelection.current.ray).toBe(3);expect(view.ensures()).toBe(before);expect(view.camera.focusHand).not.toHaveBeenCalled();
    await view.click('[data-dino-inspect-hand]');expect(view.camera.focusHand).toHaveBeenLastCalledWith(true);
    await view.click('[data-dino-shape-side="b"]');expect(window.__raptorHandSelection.current).toMatchObject({ray:3,focused:true});
    await view.click('[data-dino-shape-layer="life"]');expect(window.__raptorHandSelection.current).toMatchObject({ray:3,focused:true});
    expect(view.data().field3dShapeStudy).toMatchObject({family:'dromaeosaur-hands',lens:'hands'});expect(view.data().compareInquiry).toEqual(writing);
    for(const selector of ['[data-dino-hand-ray]','[data-dino-inspect-hand]','[data-dino-hand-whole-body]'])expect(view.host.querySelector(selector).style.minHeight).toBe('44px');
    await view.click('[data-dino-hand-whole-body]');expect(view.camera.focusHand).toHaveBeenLastCalledWith(false);
    await view.click('[data-dino-shape-lens="outline"]');expect(view.host.querySelector('[data-dino-hand-ray]')).toBeNull();expect(view.data().compareInquiry).toEqual(writing);
  });
  it('keeps two-view ray context as model evidence without replacing a student explanation or uncertainty',()=>{
    const {api}=load(),hands=study(api),parts=api.dinoDetailedBodyPartDefinitions(hands.species,false);
    const raw={key:hands.key,species:'velociraptor',hypothesis:'evidence',yaw:0,pitch:.16,zoom:1,showSkeleton:true,showBody:false,visible:['hand'],sources:hands.family.sources,hand:{active:true,ray:2,state:'claw-bearing',focused:true,layer:'bone',visibleElements:['metacarpal','phalanx','ungual','invented']}};
    const first=api.dinoShapeViewCapture(hands,raw,parts),second=api.dinoShapeViewCapture(hands,{...raw,yaw:Math.PI/2},parts);
    expect(first.hand.visibleElements).toEqual(['metacarpal','phalanx','ungual']);expect(api.dinoShapeViewCaption(first,parts)).toContain('ray II / claw-bearing / hand focus');expect(first.sources).toEqual(hands.family.sources.map(row=>row.url));
    const result=api.dinoShapeViewNotebookAppend(ownWriting,hands,[first,second],parts,'evidence'),pair=result.state.pairs[0];
    expect(result.added).toBe(true);expect(pair.explanation).toMatch(/^My own observation\./);expect(pair.explanation).toContain('not fossil proof');expect(pair.explanation).toContain('https://par.nsf.gov/servlets/purl/10249195');
    expect(pair.prediction).toBe(ownWriting.pairs[0].prediction);expect(pair.limit).toBe(ownWriting.pairs[0].limit);
    expect(api.dinoShapeViewNotebookAppend(result.state,hands,[first,second],parts,'evidence').reason).toBe('duplicate');
  });
});
