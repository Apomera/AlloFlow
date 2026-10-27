import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {stripWeldlabMacroFixes} from './weldlab_accessible_macro_restore.js';
const changes=JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-accessible-notebook-fixes.json'),'utf8'));
// Runtime tests use production; historical byte checks reverse recorded repairs.
export function stripWeldlabNotebookFixes(source){
 let result=stripWeldlabMacroFixes(source).replace(/\r\n/g,'\n');
 for(const change of [...changes].reverse()){
  if(!result.includes(change.new))continue;
  if(result.split(change.new).length!==2)throw Error('Ambiguous notebook restoration: '+change.owner);
  result=result.replace(change.new,()=>change.old);
 }
 return result;
}
