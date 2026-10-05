const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const folder = path.join(process.cwd(), 'reports/micro-lab-annotation-integrity-2026-10-01/drafts');
const source = fs.readFileSync('stem_lab/stem_tool_microbiology.js', 'utf8');
const fragment = name => fs.readFileSync(path.join(folder, name), 'utf8').replace(/\r\n/g, '\n').trimEnd();
const edits = [
  { old: '    function setReviewNote(value, id, note) {', new: fragment('resistance-annotation-helpers.js') + '\n    function setReviewNote(value, id, note) {' },
  { old: '      save: save, setReviewNote: setReviewNote, removeRecord: removeRecord, restoreRecord: restoreRecord, keepRemoval: keepRemoval,',
    new: '      save: save, setReviewNote: setReviewNote, annotationOwner: annotationOwner, changeReviewNote: changeReviewNote, removeRecord: removeRecord, restoreRecord: restoreRecord, keepRemoval: keepRemoval,' },
  { old: '    function setCitedHour(value, trialId, hour, pinned) {', new: fragment('growth-annotation-helpers.js') + '\n    function setCitedHour(value, trialId, hour, pinned) {' },
  { old: '      reviewNotebook: reviewNotebook, reviewCSV: reviewCSV, csv: csv, evidenceAt: evidenceAt, citedEvidence: citedEvidence, setCitedHour: setCitedHour, similarThreshold: SIMILAR_THRESHOLD, maxRecords: MAX_RECORDS',
    new: '      reviewNotebook: reviewNotebook, reviewCSV: reviewCSV, csv: csv, evidenceAt: evidenceAt, citedEvidence: citedEvidence, setCitedHour: setCitedHour, annotationOwner: annotationOwner, changeExplanation: changeExplanation, similarThreshold: SIMILAR_THRESHOLD, maxRecords: MAX_RECORDS' }
];
let preview = source;
for (const edit of edits) {
  if (source.includes('\r\n')) { edit.old = edit.old.replace(/\n/g, '\r\n'); edit.new = edit.new.replace(/\r?\n/g, '\r\n'); }
  if (preview.split(edit.old).length !== 2) throw new Error('Source anchor must be exact and unique: ' + edit.old);
  preview = preview.replace(edit.old, edit.new);
}
new vm.Script(preview, { filename: 'annotation-core-preview.js' });
fs.writeFileSync(path.join(folder, 'annotation-core-edits.json'), JSON.stringify(edits, null, 2) + '\n');
console.log(edits.length + ' exact edits; integrated preview syntax valid.');
