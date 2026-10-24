import {describe, it, expect} from 'vitest';
import {readFileSync} from 'node:fs';

const source=readFileSync('stem_lab/stem_tool_dinolab.js','utf8');
const marker="window.StemLab.registerTool('dinoLab'";
const exported='globalThis.__armoredGuides={DINOS,dinoDetailedBodyPartDefinitions,dinoPartInspectionFor,skeletalAnatomyProfileFor};';
new Function('window',source.replace(marker,exported+marker))({StemLab:{registerTool(){}}});
const api=globalThis.__armoredGuides;
delete globalThis.__armoredGuides;
const ids=['ankylosaurus','euoplocephalus','sauropelta','borealopelta'];
const dinosaur=id=>api.DINOS.find(d=>d.id===id);
const guide=(id,part)=>api.dinoPartInspectionFor(dinosaur(id),{id:part,region:part==='head'?'head':'body'});

describe('armored dinosaur guides distinguish preserved anatomy from reconstruction',()=>{
  it.each(ids)('%s exposes inspectable dermal armor with a primary source and limits',id=>{
    const parts=api.dinoDetailedBodyPartDefinitions(dinosaur(id),true);
    expect(parts.some(part=>part.id==='armor')).toBe(true);
    expect(parts.some(part=>part.id==='tailclub')).toBe(['ankylosaurus','euoplocephalus'].includes(id));
    const inspection=guide(id,'armor');
    expect(inspection.bone).toMatch(/skin|dermal/i);
    expect(inspection.bone+' '+inspection.limit).toMatch(/separate|distinct/i);
    expect(inspection.limit).toMatch(/sample|representative|interpret|reconstruct/i);
    expect(inspection.source.url).toMatch(/^https:\/\//);
  });
  it('does not teach Sauropelta spines as pointing forward or Edmontonia longiceps as necessarily forked',()=>{
    expect(dinosaur('sauropelta').blurb).not.toMatch(/forward-pointing/i);
    expect(dinosaur('edmontonia').traits.join(' ')).not.toMatch(/forked/i);
    expect(dinosaur('borealopelta').facts.join(' ')).toMatch(/interpreted/);
    expect(dinosaur('borealopelta').uncertain).not.toMatch(/needed camouflage/);
  });
  it('grounds the two measured forearm examples in individuals instead of species means',()=>{
    const euo=guide('euoplocephalus','forelimb'),sauro=guide('sauropelta','forelimb');
    expect(euo.bone).toMatch(/5403/);expect(euo.bone).toMatch(/495/);expect(euo.bone).toMatch(/308/);
    expect(sauro.bone).toMatch(/3016/);expect(sauro.bone).toMatch(/520/);expect(sauro.bone).toMatch(/355/);
    for(const inspection of [euo,sauro])expect(inspection.bone+' '+inspection.limit).toMatch(/individual|specimen/);
  });
  it('does not turn the Borealopelta mummy into a complete preserved skeleton',()=>{
    for(const part of ['tail','thigh','shin','knee','ankle']){
      const inspection=guide('borealopelta',part);
      expect(inspection.bone+' '+inspection.limit).toMatch(/comparative|relative|incomplete|unpreserved|not preserved|not complete|not a complete/i);
      expect(inspection.limit).toMatch(/reconstruct|interpret/i);
    }
  });
  it.each(ids)('%s does not equate a static joint trace with gait or speed',id=>{
    const inspection=guide(id,'forelimb');
    expect(inspection.limit).toMatch(/pose|posture|joint angle/i);
    expect(inspection.limit).toMatch(/gait|speed|locomot/i);
    expect(inspection.life).toMatch(/same|fixed|shared/i);
  });
  it('uses the tridactyl Euoplocephalus pes while identifying the sampled formula',()=>{
    const profile=api.skeletalAnatomyProfileFor(dinosaur('euoplocephalus'));
    expect(profile.pedalDigits).toBe(3);
    expect(profile.pedalPhalanxFormula).toEqual([3,4,4]);
    expect(profile.distalLimbEvidence).toMatch(/4.?5|four|sample|var/i);
  });
});
