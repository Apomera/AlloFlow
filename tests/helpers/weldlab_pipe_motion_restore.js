// Remove only the three additive local material-point comparison additions.
// Keep line endings intact so the caller can prove exact baseline recovery.
export function stripPipeMotion(source) {
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  let restored = source;
  for (const label of ['local material-point motion', 'rolled and fixed material comparison']) {
    const first = '        // ⟦pipe13 ' + label + '⟧' + newline;
    const last = '        // ⟦/pipe13 ' + label + '⟧' + newline;
    const start = restored.indexOf(first), end = restored.indexOf(last, start);
    if (start < 0 || end < start || restored.indexOf(first, start + first.length) !== -1) throw new Error('Missing or repeated pipe13 preservation marker: ' + label);
    let stop = end + last.length;
    if (label === 'rolled and fixed material comparison' && restored.slice(stop, stop + newline.length) === newline) stop += newline.length;
    restored = restored.slice(0, start) + restored.slice(stop);
  }
  const call = '            !chalOn && renderPipeMotionComparison(),' + newline;
  if (restored.split(call).length !== 2) throw new Error('Unexpected pipe13 render call count');
  return restored.replace(call, '');
}
