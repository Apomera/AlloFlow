import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stripWeldlabMilestoneFixes } from './weldlab_accessible_milestone_restore.js';
const changes = JSON.parse(readFileSync(resolve('tests/fixtures/weldlab-accessible-phase-fixes.json'), 'utf8'));
// Runtime tests use live production code. Only historical source checks reverse later repairs.
export function stripWeldlabPhaseFixes(source) {
  let result = stripWeldlabMilestoneFixes(source).replace(/\r\n/g, '\n');
  // The later PR #21 merge strengthened this selector's border contrast.
  // Preserve its live 500 border; older full-source checkpoints predate that
  // single reviewed class change (7bd3c0e417 -> a1384d4fcf).
  const mergedBorder = 'w-full rounded-lg border-2 border-slate-500 bg-white text-slate-900 text-sm font-semibold px-3 py-2 focus:outline-none focus:ring-4 ring-orange-500/40';
  if (result.includes(mergedBorder)) {
    if (result.split(mergedBorder).length !== 2) throw Error('Ambiguous merged catalog contrast restoration');
    result = result.replace(mergedBorder, mergedBorder.replace('border-slate-500', 'border-slate-400'));
  }
  // The cross-tool print-shell language pass (36bfcb8596, gated by
  // generated_document_language.test.js) tagged the inspection report shell
  // before the milestone round began; older checkpoints predate that edit.
  const taggedReport = `var html = '<!doctype html><html lang="' + String(document.documentElement.lang || 'en').replace(/[^\\w-]/g, '') + '"' + (document.documentElement.dir === 'rtl' ? ' dir="rtl"' : '') + '><head><meta charset="utf-8"><title>' + esc(REPORT_TITLE) + '</title><style>' +`;
  if (result.includes(taggedReport)) {
    if (result.split(taggedReport).length !== 2) throw Error('Ambiguous report language restoration');
    result = result.replace(taggedReport, () => `var html = '<!doctype html><html><head><meta charset="utf-8"><title>' + esc(REPORT_TITLE) + '</title><style>' +`);
  }
  for (const change of [...changes].reverse()) {
    if (!result.includes(change.new)) continue;
    if (result.split(change.new).length !== 2) throw Error('Ambiguous phase restoration: ' + change.owner);
    result = result.replace(change.new, () => change.old);
  }
  return result;
}
