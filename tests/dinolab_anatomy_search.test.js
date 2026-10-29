// @vitest-environment jsdom
import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

// Exercise the production filter with the real species-dependent catalog.
const source=readFileSync(resolve('stem_lab/stem_tool_dinolab.js'),'utf8');
const marker="window.StemLab.registerTool('dinoLab'";
if(!source.includes(marker))throw Error('Dino Lab registration anchor missing');
const previousRegistry=window.StemLab;
window.StemLab={ensureThree:()=>new Promise(()=>{}),registerTool(){}};
let api;
try{
  new Function(source.replace(marker,'globalThis.__dinoAnatomySearchContract = { DINOS, dinoFilterBodyParts, dinoDetailedBodyPartDefinitions, skeletalAnatomyProfileFor, reconstructionHypothesesFor }; '+marker))();
  api=globalThis.__dinoAnatomySearchContract;
}finally{
  delete globalThis.__dinoAnatomySearchContract;
  window.StemLab=previousRegistry;
}
const species=id=>api.DINOS.find(item=>item.id===id);
function catalog(id,mode='evidence'){
  const dn=typeof id==='string'?species(id):id;
  const profile=api.skeletalAnatomyProfileFor(dn);
  return api.dinoDetailedBodyPartDefinitions(dn,profile.weightBearingForelimbs,api.reconstructionHypothesesFor(dn,profile,mode).active);
}
const ids=parts=>parts.map(part=>part.id);
const search=(id,query,section)=>api.dinoFilterBodyParts(catalog(id),query,section);

describe('Dino Lab anatomy search',()=>{
  it('finds the same body part by its familiar label, scientific name or a combination of both',()=>{
    for(const [id,label,scientific,part] of [
      ['tyrannosaurus','Hand','Manus','hand'],
      ['triceratops','Front foot','Manus','hand'],
      ['tyrannosaurus','Upper arm','Brachium','forelimb'],
      ['triceratops','Beak','Rhamphotheca','beak'],
      ['allosaurus','Lacrimal processes','Lacrimal processes','brow'],
      ['carnotaurus','Horns','Frontal horn cores','horns'],
      ['huayangosaurus','Lower beak','Lower rhamphotheca','beak']
    ]){
      for(const query of [label,scientific,label+' '+scientific])expect(ids(search(id,query)),id+': '+query).toContain(part);
    }
  });

  it('indexes each actual label and anatomical term in varied clades and reconstruction modes',()=>{
    let inspected=0;
    for(const id of ['tyrannosaurus','triceratops','brachiosaurus','stegosaurus','ankylosaurus','archaeopteryx','microraptor','parasaurolophus']){
      for(const mode of ['evidence','conservative','classic','avian']){
        const parts=catalog(id,mode);
        for(const part of parts){
          inspected++;
          expect(api.dinoFilterBodyParts(parts,part.label),id+': '+mode+': '+part.label).toContain(part);
          expect(api.dinoFilterBodyParts(parts,part.anatomicalTerm),id+': '+mode+': '+part.anatomicalTerm).toContain(part);
        }
      }
    }
    expect(inspected).toBeGreaterThan(1000);
  });

  it('normalizes case, punctuation, whitespace and composed or decomposed accents on both sides',()=>{
    for(const query of ['  ANTEBRÁCHIUM / radius — ULNA  ','ulna\nRADIUS\tantebrachium','Antebra\u0301chium · radius + ulna']){
      expect(ids(search('tyrannosaurus',query))).toEqual(['forearm']);
    }
    expect(ids(search('tyrannosaurus','CÉRVICAL...REGION'))).toEqual(['neck']);
    const accented=[{id:'accented',label:'Métatarsal arch',anatomicalTerm:'Pés',section:'Limbs and digits'}];
    expect(api.dinoFilterBodyParts(accented,'PES--METATARSAL')).toEqual(accented);
  });

  it('requires every query token while allowing words in either order and across the two name fields',()=>{
    const parts=catalog('tyrannosaurus');
    const hand=parts.find(part=>part.id==='hand');
    expect(api.dinoFilterBodyParts(parts,'manus hand')).toEqual([hand]);
    expect(api.dinoFilterBodyParts(parts,'hand manus')).toEqual([hand]);
    expect(api.dinoFilterBodyParts(parts,'hand manus absentword')).toEqual([]);
    expect(api.dinoFilterBodyParts(parts,'manus pes')).toEqual([]);
    expect(ids(api.dinoFilterBodyParts(parts,'ulna radius'))).toEqual(['elbow','forearm']);
  });

  it('searches names only, without matching internal identifiers, descriptions, evidence or group names',()=>{
    const record={id:'secretidentifier',label:'Hand',anatomicalTerm:'Manus',section:'Secretsection',
      purpose:'Secretpurpose',look:'Secretlook',detail:'Secretdetail',characteristics:'Secretcharacteristics',
      evidence:'Secretevidence',source:'Secretsource',region:'Secretregion',layer:'Secretlayer'};
    for(const query of ['secretidentifier','secretsection','secretpurpose','secretlook','secretdetail','secretcharacteristics','secretevidence','secretsource','secretregion','secretlayer']){
      expect(api.dinoFilterBodyParts([record],query),query).toEqual([]);
    }
    expect(api.dinoFilterBodyParts([record],'hand manus')).toEqual([record]);
    // "Metacarpals" occurs in this real hand's explanation, not either name.
    const hand=catalog('triceratops').find(part=>part.id==='hand');
    expect(hand.characteristics).toMatch(/metacarpals/i);
    expect(api.dinoFilterBodyParts([hand],'metacarpals')).toEqual([]);
  });

  it('intersects the text query with an exact section and treats empty or all as unfiltered',()=>{
    const parts=catalog('tyrannosaurus');
    const limbParts=parts.filter(part=>part.section==='Limbs and digits');
    expect(api.dinoFilterBodyParts(parts,'','Limbs and digits')).toEqual(limbParts);
    expect(ids(api.dinoFilterBodyParts(parts,'region','Head and neck'))).toEqual(['head','neck']);
    expect(ids(api.dinoFilterBodyParts(parts,'manus','Limbs and digits'))).toEqual(['hand']);
    expect(api.dinoFilterBodyParts(parts,'manus','Head and neck')).toEqual([]);
    for(const section of ['',undefined,'all'])expect(api.dinoFilterBodyParts(parts,'manus',section)).toEqual([parts.find(part=>part.id==='hand')]);
    for(const section of ['limbs and digits','Limbs','Unknown section','ALL'])expect(api.dinoFilterBodyParts(parts,'',section)).toEqual([]);
  });

  it('keeps empty queries complete and returns an empty result for unmatched queries or an empty catalog',()=>{
    const parts=catalog('archaeopteryx');
    for(const query of ['',undefined,null,'   ','— / · !!!'])expect(api.dinoFilterBodyParts(parts,query)).toEqual(parts);
    expect(api.dinoFilterBodyParts(parts,'nonexistentanatomy')).toEqual([]);
    expect(api.dinoFilterBodyParts([],'manus','Limbs and digits')).toEqual([]);
    expect(api.dinoFilterBodyParts([],undefined)).toEqual([]);
  });

  it('preserves catalog order, original object identities and all source records',()=>{
    const parts=catalog('triceratops');
    const before=JSON.stringify(parts);
    parts.forEach(Object.freeze);Object.freeze(parts);
    const expected=parts.filter(part=>part.section==='Limbs and digits');
    for(const query of ['','region','digits','manus','absentword']){
      const result=api.dinoFilterBodyParts(parts,query,'Limbs and digits');
      const positions=result.map(part=>parts.indexOf(part));
      expect(positions.every(position=>position>=0)).toBe(true);
      expect(positions).toEqual([...positions].sort((a,b)=>a-b));
      for(const part of result)expect(part).toBe(expected.find(entry=>entry.id===part.id));
    }
    expect(api.dinoFilterBodyParts(parts,'','Limbs and digits')).toEqual(expected);
    expect(JSON.stringify(parts)).toBe(before);
  });

  it('keeps shared-rig outgroups searchable by proxy labels without importing dinosaur scientific terms',()=>{
    const outgroups=api.DINOS.filter(dn=>dn.group==='other');
    expect(outgroups.length).toBeGreaterThan(0);
    for(const dn of outgroups){
      const parts=catalog(dn);
      expect(parts.every(part=>part.anatomicalTerm==='')).toBe(true);
      expect(api.dinoFilterBodyParts(parts,'proxy')).toEqual(parts);
      expect(ids(api.dinoFilterBodyParts(parts,'front limb end proxy'))).toEqual(['hand']);
      for(const query of ['manus','pes','cephalic','femorotibial','rhamphotheca'])expect(api.dinoFilterBodyParts(parts,query),dn.id+': '+query).toEqual([]);
    }
  });
});
