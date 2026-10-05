const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('stem_lab/stem_tool_microbiology.js', 'utf8');
const edits = [];
for (const [name, old, field] of [
  ['selectRecord', '    function changeReviewNote(value, id, text, owner) {', 'records'],
  ['selectTrial', '    function changeExplanation(value, id, text, owner) {', 'trials']
]) {
  const code = `    function ${name}(value, id, owner) {
      function result(status, notebook) { return Object.freeze({ notebook: notebook === undefined ? value : notebook, changed: status === 'selected', status: status,
        id: status === 'selected' || status === 'unchanged' || status === 'stale' ? id : null }); }
      if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.${field}) || !validId(id)) return result('invalid');
      var target = annotationTarget(value, id);
      if (!target) return result('missing');
      if (owner !== undefined && (!owner || typeof owner !== 'object' || Array.isArray(owner) || owner.id !== id || owner.record !== target.item)) return result('stale');
      if (value.selectedId === id) return result('unchanged');
      return result('selected', Object.assign({}, value, { selectedId: id }));
    }
`;
  edits.push({ old, new: code + old });
}
for (const [name, fragment] of [
  ['selectRecord', '      save: save, setReviewNote: setReviewNote, annotationOwner: annotationOwner, changeReviewNote: changeReviewNote,'],
  ['selectTrial', 'annotationOwner: annotationOwner, changeExplanation: changeExplanation, similarThreshold:']
]) {
  const candidates = source.split('\n').filter(line => line.includes(fragment));
  if (candidates.length !== 1) throw Error('Expected one API export anchor.');
  const old = candidates[0];
  const mark = name === 'selectRecord' ? 'changeReviewNote: changeReviewNote,' : 'changeExplanation: changeExplanation,';
  edits.push({ old, new: old.replace(mark, mark + ' ' + name + ': ' + name + ',') });
}
let preview = source;
for (const edit of edits) {
  if (preview.split(edit.old).length !== 2) throw Error('Expected one selection anchor.');
  preview = preview.replace(edit.old, edit.new);
}
new vm.Script(preview);
fs.writeFileSync('reports/micro-lab-annotation-integrity-2026-10-01/drafts/selection-core-root-edits.json', JSON.stringify(edits, null, 2) + '\n');
console.log('Prepared four raw-preserving selection core edits; syntax passed.');
