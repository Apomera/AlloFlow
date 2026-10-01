import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const {makeGsSandbox}=createRequire(import.meta.url)('../dev-tools/fixtures/shared_activity_mailbox.cjs');
function fixture(){let time=Date.now();const sb=makeGsSandbox({now:()=>time}),admin=sb.call({a:'claim'}).admin,base={admin,c:'PLANX',k:'sandbox_fixture_secret_12345'};expect(sb.call({...base,a:'open'}).ok).toBe(true);expect(sb.call({...base,a:'dset',p:'s',d:{roster:{},note:'Keep this document'}}).ok).toBe(true);return {sb,base,advance:ms=>time+=ms};}
describe('Board classroom cache fixture expiration',()=>{
 it('enforces production read limits and expires counters after a simulated quiet interval',()=>{const {sb,base,advance}=fixture();let result;for(let i=0;i<10000;i++){result=sb.call({...base,a:'dget',ps:[{p:'s',w:0}]});if(!result.ok)break;}expect(result.e).toBe('rate-limited');advance(61000);const recovered=sb.call({...base,a:'dget',ps:[{p:'s',w:0}]});expect(recovered.ok).toBe(true);expect(recovered.docs[0].d.note).toBe('Keep this document');expect(sb.readDocument('PLANX').note).toBe('Keep this document');});
 it('expires cached documents after their longer TTL instead of keeping them indefinitely',()=>{const {sb,advance}=fixture();expect(sb.readDocument('PLANX')).toBeTruthy();advance(86400000);expect(sb.readDocument('PLANX')).toBeUndefined();});
});
