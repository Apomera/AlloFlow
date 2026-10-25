// Reverse only the additive local Joint-reference blocks before older scope hashes.
export function stripRobotReference(source) {
  let restored = source.replace(/\r\n/g, '\n');
  const blocks = [
    ['        ', 'reference state'],
    ['                ', 'reference geometry'],
    ['            ', 'reference controls'],
  ];
  if (!restored.includes('// rob12: begin ') && !restored.includes('var robReferenceState = useState(false);')) return restored;
  for (const [indent, label] of blocks) {
    const begin = indent + '// rob12: begin ' + label + '\n';
    const end = indent + '// rob12: end ' + label + '\n';
    if (restored.split(begin).length !== 2 || restored.split(end).length !== 2) throw new Error('Unexpected rob12 preservation marker count: ' + label);
    const a = restored.indexOf(begin), b = restored.indexOf(end, a);
    if (b < a) throw new Error('Unexpected rob12 preservation order: ' + label);
    restored = restored.slice(0, a) + restored.slice(b + end.length);
  }
  if (restored.includes('robReferenceState') || restored.includes('rob12:')) throw new Error('Unexpected rob12 code outside preservation blocks');
  return restored;
}
