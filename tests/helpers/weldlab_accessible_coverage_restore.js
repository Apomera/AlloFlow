import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stripWeldlabReaderContrastFixes } from './weldlab_accessible_reader_contrast_restore.js';
const changes=JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-accessible-coverage-fixes.json'),'utf8'));
// Historical lesson digests reverse these exact subsequent accessibility edits.
// Runtime tests load the production source without any restoration.
export function stripWeldlabCoverageFixes(source) {
  let result=stripWeldlabReaderContrastFixes(source).replace(/\r\n/g,'\n');
  for(const change of [...changes].reverse()) {
    if(!result.includes(change.new)) continue;
    if(result.split(change.new).length!==2) throw Error('Ambiguous coverage restoration: '+change.owner);
    result=result.replace(change.new,()=>change.old);
  }
  return result;
}
