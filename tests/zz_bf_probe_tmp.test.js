// TEMPORARY probe (session 0e5f5014, butterfly enhancements). Safe to delete.
import {it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
function outcomes(file){
  resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool(file,'butterfly');
  const BF=window.__RR_TEST_EXPORTS__.butterfly,out={};
  for(const p of BF.plants.concat(BF.designs))for(const m of BF.mowings){const o=BF.seasonOutcome(p,m.id);out[p.id+'/'+m.id]=[o.completes,o.blocked,o.cutShort,o.reason];}
  return out;
}
it('probe',()=>{
  const a=outcomes(process.env.BF_OLD),b=outcomes(process.env.BF_NEW);
  for(const k of Object.keys(a)){console.log('PROBE',k,JSON.stringify(a[k].slice(0,3)),'->',JSON.stringify(b[k].slice(0,3)),'|',b[k][3]);expect(b[k].slice(0,3)).toEqual(a[k].slice(0,3));}
});
