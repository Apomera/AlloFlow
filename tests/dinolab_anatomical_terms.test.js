// @vitest-environment jsdom
import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

// Capture the shipped closure, including its real species-dependent catalog.
// No copied terminology table or alternate renderer is used by these tests.
const source=readFileSync(resolve('stem_lab/stem_tool_dinolab.js'),'utf8');
const marker="window.StemLab.registerTool('dinoLab'";
if(!source.includes(marker))throw Error('Dino Lab registration anchor missing');
const previousRegistry=window.StemLab;
window.StemLab={ensureThree:()=>new Promise(()=>{}),registerTool(){}};
new Function(source.replace(marker,'globalThis.__dinoAnatomicalTermsContract = { DINOS, dinoAnatomicalTermFor, dinoDetailedBodyPartDefinitions, dinoBodyPartDefinitions, dinoAnatomyQuizDeck, skeletalAnatomyProfileFor, reconstructionHypothesesFor }; '+marker))();
const api=globalThis.__dinoAnatomicalTermsContract;
delete globalThis.__dinoAnatomicalTermsContract;
window.StemLab=previousRegistry;
const species=id=>api.DINOS.find(item=>item.id===id);
const term=(part,id='tyrannosaurus')=>api.dinoAnatomicalTermFor(part,species(id));
function catalog(dn,mode='evidence'){
  const profile=api.skeletalAnatomyProfileFor(dn);
  return api.dinoDetailedBodyPartDefinitions(dn,profile.weightBearingForelimbs,api.reconstructionHypothesesFor(dn,profile,mode).active);
}
const find=(id,part,mode)=>catalog(species(id),mode).find(item=>item.id===part);

describe('Scientific anatomical names in the dinosaur catalog',()=>{
  it('names every supported part across every species and active reconstruction without changing species records',()=>{
    const before=JSON.stringify(api.DINOS),problems=[],seen=new Set();let inspected=0;
    for(const dn of api.DINOS.filter(item=>item.group!=='other'))for(const mode of ['evidence','conservative','classic','avian']){
      for(const part of catalog(dn,mode)){
        inspected++;seen.add(part.id);
        if(typeof part.anatomicalTerm!=='string'||!part.anatomicalTerm.trim())problems.push(dn.id+':'+mode+':'+part.id+' missing term');
        else if(part.anatomicalTerm!==api.dinoAnatomicalTermFor(part.id,dn))problems.push(dn.id+':'+part.id+' catalog/helper disagreement');
        if(!part.label||!part.purpose||!part.evidence)problems.push(dn.id+':'+part.id+' lost plain-language explanation');
      }
    }
    expect(inspected).toBeGreaterThan(10000);expect(seen.size).toBeGreaterThanOrEqual(50);expect(problems).toEqual([]);
    expect(JSON.stringify(api.DINOS)).toBe(before);
  });

  it('keeps non-dinosaur shared-rig proxies outside the anatomical naming feature',()=>{
    const outgroups=api.DINOS.filter(item=>item.group==='other');expect(outgroups.length).toBeGreaterThan(0);
    for(const dn of outgroups)for(const part of catalog(dn)){
      expect(part.anatomicalTerm).toBe('');expect(api.dinoAnatomicalTermFor(part.id,dn)).toBe('');
      expect(part.label).toMatch(/proxy/i);expect(part.evidence).toMatch(/placeholder/i);
    }
    // The proxy boundary takes precedence even over species-specific exceptions.
    for(const [id,part] of [['allosaurus','brow'],['carnotaurus','horns'],['huayangosaurus','beak']])expect(api.dinoAnatomicalTermFor(part,{id,group:'other'})).toBe('');
  });

  it('returns no invented label for absent species, unknown parts or inherited object names',()=>{
    for(const part of ['head','hand','skull'])for(const dn of [null,undefined])expect(api.dinoAnatomicalTermFor(part,dn)).toBe('');
    for(const part of [undefined,null,'','made-up','constructor','toString','valueOf','__proto__','hasOwnProperty',42])expect(api.dinoAnatomicalTermFor(part,species('tyrannosaurus'))).toBe('');
  });

  it('keeps manus, pes, their digits, and adjacent joints distinct in bipedal and quadrupedal catalogs',()=>{
    for(const id of ['tyrannosaurus','triceratops','brachiosaurus']){
      expect(find(id,'hand').anatomicalTerm).toBe('Manus');expect(find(id,'foot').anatomicalTerm).toBe('Pes');
      expect(find(id,'fingers').anatomicalTerm).toMatch(/manual digits/i);expect(find(id,'toes').anatomicalTerm).toMatch(/pedal digits/i);
      expect(find(id,'wrist').anatomicalTerm).toMatch(/carpal/i);expect(find(id,'ankle').anatomicalTerm).toMatch(/tarsal/i);
      expect(find(id,'knee').anatomicalTerm).toMatch(/femorotibial/i);expect(find(id,'hip').anatomicalTerm).toMatch(/coxofemoral/i);
    }
    expect(find('triceratops','hand').label).toBe('Front foot');expect(find('tyrannosaurus','hand').label).toBe('Hand');
  });

  it('names depicted limb regions without reducing a whole limb or girdle to one bone',()=>{
    expect(find('tyrannosaurus','forelimb').label).toBe('Upper arm');expect(term('forelimb')).toMatch(/brachium.*humerus region/i);
    expect(term('forearm')).toMatch(/radius and ulna region/i);expect(term('shin')).toMatch(/tibia and fibula region/i);
    expect(term('hindlimb')).toBe('Pelvic limb');expect(term('thigh')).toBe('Femoral region');
    expect(term('pelvis')).toBe('Pelvic girdle');expect(term('hip')).not.toBe(term('pelvis'));
    expect(term('jaw')).toMatch(/upper jaws and mandible/i);
  });

  it('distinguishes living openings, keratin coverings and inferred soft tissues from bone',()=>{
    expect(term('nostrils')).toBe('External nares');expect(term('beak')).toBe('Rhamphotheca');expect(term('skin')).toBe('Integument');
    expect(term('claws')).toMatch(/ungual bones and keratin sheaths/i);
    for(const partId of ['lungs','airsacs','muscles']){
      const part=find('archaeopteryx',partId);expect(part).toBeDefined();expect(part.anatomicalTerm).toMatch(/inferred/i);
      expect(part.inferredProxy).toBe(true);expect(part.requiresTranslucentBody).toBe(true);
    }
    expect(term('lungs')).not.toBe(term('airsacs'));
  });

  it('keeps dermal armor, neural spines and feather regions anatomically distinct',()=>{
    for(const id of ['plates','spikes','armor'])expect(term(id)).toMatch(/osteoderm/i);
    expect(term('sail')).toMatch(/neural spines/i);expect(term('sail')).not.toMatch(/osteoderm/i);
    expect(term('tailclub')).toMatch(/vertebral handle.*osteoderm knob/i);expect(term('thumbspike')).toMatch(/manual digit I$/);
    expect(term('wing')).toBe('Forelimb plumage');expect(term('feathers')).toMatch(/plumage and integumentary filaments/i);
    expect(term('bristles')).toMatch(/integumentary bristles/i);expect(term('bristles')).not.toMatch(/hair|remiges/i);
    expect(term('crest')).toMatch(/bony/i);expect(term('feathercrest')).toMatch(/plumage/i);
  });

  it('uses the established species-specific cranial exceptions in both helper and displayed catalog',()=>{
    for(const [id,part,expected] of [
      ['allosaurus','brow','Lacrimal processes'],
      ['carnotaurus','horns','Frontal horn cores and covering'],
      ['huayangosaurus','beak','Lower rhamphotheca']
    ]){
      expect(term(part,id)).toBe(expected);expect(find(id,part).anatomicalTerm).toBe(expected);
    }
    expect(term('brow','tyrannosaurus')).not.toBe(term('brow','allosaurus'));
    expect(term('horns','triceratops')).not.toBe(term('horns','carnotaurus'));
    expect(term('beak','triceratops')).toBe('Rhamphotheca');
  });

  it('does not mutate the ten-part quiz library or alter seeded questions when detailed names are read or edited',()=>{
    const ids=['head','tail','trunk','hand','foot','neck','forelimb','knee','ankle','thigh'];
    for(const quadruped of [false,true]){
      const base=api.dinoBodyPartDefinitions(quadruped),decks=[1,17,912].map(seed=>api.dinoAnatomyQuizDeck(quadruped,seed));
      expect(base.map(part=>part.id)).toEqual(ids);expect(base.every(part=>!Object.hasOwn(part,'anatomicalTerm'))).toBe(true);
      const detailed=catalog(species(quadruped?'triceratops':'tyrannosaurus'));detailed[0].anatomicalTerm='temporary inspection edit';
      expect(catalog(species(quadruped?'triceratops':'tyrannosaurus'))[0].anatomicalTerm).not.toBe('temporary inspection edit');
      expect(api.dinoBodyPartDefinitions(quadruped)).toEqual(base);
      for(const [index,seed] of [1,17,912].entries()){
        const deck=api.dinoAnatomyQuizDeck(quadruped,seed);expect(deck).toEqual(decks[index]);expect(deck).toHaveLength(5);
        for(const question of deck){expect(ids).toContain(question.partId);expect(question.choices.every(choice=>ids.includes(choice))).toBe(true);}
      }
    }
  });
});
