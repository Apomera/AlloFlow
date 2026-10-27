import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {stripWeldlabRepairFixes} from './weldlab_accessible_repair_restore.js';
const changes=JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-accessible-navigation-fixes.json'),'utf8'));
// Runtime checks use live production; only historical byte checks reverse recorded repairs.
export function stripWeldlabNavigationFixes(source){
 let result=stripWeldlabRepairFixes(source).replace(/\r\n/g,'\n');
 for(const change of [...changes].reverse()){
  if(!result.includes(change.new))continue;
  if(result.split(change.new).length!==2)throw Error('Ambiguous navigation restoration: '+change.owner);
  // A retained anchor alone is also present before the repair; do not reinsert it twice.
  if(change.old.includes(change.new)&&result.includes(change.old))continue;
  result=result.replace(change.new,()=>change.old);
 }
 return result;
}
