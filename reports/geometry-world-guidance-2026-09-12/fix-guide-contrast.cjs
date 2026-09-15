const fs = require('fs');
for (const file of ['stem_lab/stem_tool_geometryworld.js', 'reports/geometry-world-guidance-2026-09-12/guide-visual-helpers.js']) {
  let text = fs.readFileSync(file, 'utf8');
  const before = "{ ink: '#000000', cream: '#ffffff', sage: '#ffffff', amber: '#ffff00', soft: '#ffffff' }";
  const after = "{ ink: '#000000', cream: '#ffffff', sage: '#ffffff', amber: '#ffff00', soft: '#000000' }";
  if (text.split(before).length !== 2) throw Error('Expected exact guide contrast palette in ' + file);
  text = text.replace(before, after);
  const fd = fs.openSync(file, 'r+'); try { fs.writeSync(fd, text); fs.ftruncateSync(fd, Buffer.byteLength(text)); } finally { fs.closeSync(fd); }
  console.log(file);
}
