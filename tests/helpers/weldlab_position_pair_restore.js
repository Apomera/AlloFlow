// Reverse only the additive local position comparison so authored code can be
// checked independently. The original scene helper and all old copy stay intact.
export function stripJointPositionPair(source) {
  let restored = source.replace(/\r\n/g, '\n');
  for (const label of ['local plate-position pairing', 'plate-position comparison']) {
    const first = '        // ⟦joint8 ' + label + '⟧\n';
    const last = '        // ⟦/joint8 ' + label + '⟧\n';
    const start = restored.indexOf(first), end = restored.indexOf(last, start);
    if (start < 0 || end < start) throw new Error('Missing joint8 preservation marker: ' + label);
    let stop = end + last.length;
    if (label === 'plate-position comparison' && restored[stop] === '\n') stop++;
    restored = restored.slice(0, start) + restored.slice(stop);
  }
  const call = '            renderPlatePositionPair(),\n';
  if (restored.split(call).length !== 2) throw new Error('Unexpected joint8 render call count');
  return restored.replace(call, '');
}
