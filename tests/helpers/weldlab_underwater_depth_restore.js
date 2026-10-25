// Remove only the additive completed-job depth review before older scope hashes.
// Authored decision cases, cards, feedback, score and saved state stay intact.
export function stripUnderwaterDepths(source) {
  let restored = source.replace(/\r\n/g, '\n');
  if (!restored.includes('// uw13: begin ') && !restored.includes('var uwDepthJobState = useState(0);')) return restored;
  for (const [indent, label] of [
    ['        ', 'local depth selection'],
    ['        ', 'completed-job depth review'],
    ['            ', 'depth review call'],
  ]) {
    const first = indent + '// uw13: begin ' + label + '\n';
    const last = indent + '// uw13: end ' + label + '\n';
    if (restored.split(first).length !== 2 || restored.split(last).length !== 2) throw new Error('Unexpected uw13 preservation marker count: ' + label);
    const start = restored.indexOf(first), end = restored.indexOf(last, start);
    if (end < start) throw new Error('Unexpected uw13 preservation marker order: ' + label);
    restored = restored.slice(0, start) + restored.slice(end + last.length);
  }
  if (restored.includes('uwDepthJobState') || restored.includes('uw13:') || restored.includes('renderJobDepthReview')) throw new Error('Unexpected uw13 code outside preservation blocks');
  return restored;
}
