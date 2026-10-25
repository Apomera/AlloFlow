import { stripWeldlabCoverageFixes } from './weldlab_accessible_coverage_restore.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const changes=JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-accessible-workflows-fixes.json'),'utf8'));
// Reverse only recorded later accessibility edits for historical lesson digests.
// Runtime interaction tests always use the unchanged live source loader.
export function stripWeldlabWorkflowFixes(source) {
  let result=stripWeldlabCoverageFixes(source).replace(/\r\n/g,'\n');
  for(const change of [...changes].reverse()) {
    if(!result.includes(change.new)) continue;
    if(result.split(change.new).length!==2) throw Error('Ambiguous workflow restoration: '+change.owner);
    result=result.replace(change.new,()=>change.old);
  }
  return result;
}
