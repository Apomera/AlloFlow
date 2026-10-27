// Exact inverse of the reviewed depth-lighting, photophore, minimap and contrast
// additions between PR #21 and main 1499a80. Only historical hash checks call it;
// simulation, geometry and accessibility tests still load the current source.
// The 2026-10-26 rounds (Hunter Sim visuals, soundscape, camouflage skin, Biology
// diagrams) came after main 1499a80, so their exact inverse is applied first.
const edits = require('../fixtures/cephalopod-post-merge-visual-fixes.json');
const laterRounds = require('../fixtures/cephalopod-2026-10-26-rounds.json');
const LATER_ROUNDS_MARKER = 'The squid as the predator below sees it.';
function reverseEdits(text, list, name) {
  for (const edit of [...list].reverse()) {
    const at = text.indexOf(edit.new);
    if (at < 0 || text.indexOf(edit.new, at + 1) >= 0) throw Error(name + ' inverse guard: ' + edit.label);
    text = text.slice(0, at) + edit.old + text.slice(at + edit.new.length);
  }
  return text;
}
function restorePostMergeVisualSource(source) {
  const crlf = source.includes('\r\n');
  let restored = source.replace(/\r\n/g, '\n');
  if (restored.includes(LATER_ROUNDS_MARKER)) restored = reverseEdits(restored, laterRounds, 'Later-round');
  if (!restored.includes('function sunlightFractionAt(realM)')) return source;
  restored = reverseEdits(restored, edits, 'Post-merge visual');
  return crlf ? restored.replace(/\n/g, '\r\n') : restored;
}
module.exports = { restorePostMergeVisualSource };
