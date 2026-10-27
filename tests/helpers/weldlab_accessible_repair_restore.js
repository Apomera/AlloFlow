import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {stripWeldlabNotebookFixes} from './weldlab_accessible_notebook_restore.js';
const changes=JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-accessible-repair-fixes.json'),'utf8'));
// Runtime tests use production; historical byte checks reverse only recorded repairs.
export function stripWeldlabRepairFixes(source){
 let result=stripWeldlabNotebookFixes(source).replace(/\r\n/g,'\n');
 for(const change of [...changes].reverse()){
  if(!result.includes(change.new))continue;
  if(result.split(change.new).length!==2)throw Error('Ambiguous repair restoration: '+change.owner);
  result=result.replace(change.new,()=>change.old);
 }
 return result;
}
