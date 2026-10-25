import { stripWeldlabWorkflowFixes } from './weldlab_accessible_workflows_restore.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const changes=JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-accessible-practice-fixes.json'),'utf8'));
// Historical lesson digests exclude only these exact later accessibility edits.
// Live interaction tests always exercise production source without restoration.
export function stripWeldlabPracticeFixes(source) {
  let result=stripWeldlabWorkflowFixes(source).replace(/\r\n/g,'\n');
  for(const change of [...changes].reverse()) {
    if(!result.includes(change.new)) continue;
    if(result.split(change.new).length!==2) throw Error('Ambiguous practice restoration: '+change.owner);
    result=result.replace(change.new,()=>change.old);
  }
  return result;
}
