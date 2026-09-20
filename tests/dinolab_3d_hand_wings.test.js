import {describe,it,expect} from 'vitest';
import {internals} from './helpers/dino_lab_harness.js';
const {DINOS,byId,skeletalAnatomyProfileFor,reconstructionHypothesesFor,handWingProfileFor,coveringEvidenceFor}=internals();
const preserved=['microraptor','archaeopteryx','anchiornis','caudipteryx'];
describe('Hand-wing evidence boundaries',()=>{
 for(const id of preserved)it(id+' keeps hand feathers in evidence-based views but removes historical plumage',()=>{
  const dn=byId(id),anatomy=skeletalAnatomyProfileFor(dn);
  for(const mode of ['evidence','conservative','avian'])expect(handWingProfileFor(dn,reconstructionHypothesesFor(dn,anatomy,mode).active)).not.toBeNull();
  expect(handWingProfileFor(dn,reconstructionHypothesesFor(dn,anatomy,'classic').active)).toBeNull();
 });
 it('does not extend curated hand-wing claims to other catalog species',()=>{
  for(const dn of DINOS.filter(d=>!preserved.includes(d.id)))for(const mode of ['evidence','conservative','avian'])expect(handWingProfileFor(dn,reconstructionHypothesesFor(dn,skeletalAnatomyProfileFor(dn),mode).active),dn.id+' '+mode).toBeNull();
 });
 it('separates Caudipteryx hand evidence from inferred forearm feathers',()=>{
  const dn=byId('caudipteryx'),s=skeletalAnatomyProfileFor(dn),minimum=reconstructionHypothesesFor(dn,s,'conservative').active;
  expect(minimum.forearmFeathers).toBe(false);expect(minimum.wingFeathers).toBe(true);expect(handWingProfileFor(dn,minimum)).not.toBeNull();
  expect(minimum.warning).toMatch(/not proof/);expect(coveringEvidenceFor(dn,s).source.url).toBe('https://doi.org/10.1038/s41598-019-42547-6');
 });
 it('keeps Velociraptor minimum evidence limited to forearm feathers',()=>{
  const dn=byId('velociraptor'),h=reconstructionHypothesesFor(dn,skeletalAnatomyProfileFor(dn),'conservative').active;
  expect(h.wingFeathers).toBe(true);expect(h.filamentCoverage).toBe(0);expect(h.tailFrond).toBe(false);expect(handWingProfileFor(dn,h)).toBeNull();
 });
});
