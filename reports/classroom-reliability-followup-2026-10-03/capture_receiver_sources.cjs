const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const directory = path.join(__dirname, 'source-before');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const files = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx', 'session_transport_module.js', 'desktop/web-app/public/session_transport_module.js'];
const source = fs.readFileSync(path.join(root, files[0]), 'utf8');
function extract(start, end) {
  if (source.split(start).length !== 2) throw new Error('Expected one source anchor: ' + start);
  const from = source.indexOf(start), to = source.indexOf(end, from);
  if (to < 0) throw new Error('Missing closing anchor: ' + end);
  return { code: source.slice(from, to), startLine: source.slice(0, from).split(/\r\n|\n/).length, endLine: source.slice(0, to).split(/\r\n|\n/).length };
}
fs.mkdirSync(directory, { recursive: true });
const fragments = {
  capturedUtc: new Date().toISOString(), productionEdited: false,
  files: files.map(file => ({ file, sha256: digest(fs.readFileSync(path.join(root, file))) })),
  helpers: extract('function _alloPruneResChunks(', '// Non-trickle ICE:'),
  receiver: extract('const applyMbDownPayload = useCallback(', 'const createHomeworkAssignmentLink = useCallback(')
};
fs.writeFileSync(path.join(directory, 'host_lifecycle_fragments.json'), JSON.stringify(fragments, null, 2) + '\n');
fs.copyFileSync(path.join(root, 'session_transport_module.js'), path.join(directory, 'session_transport_module.js'));
process.stdout.write(JSON.stringify({ files: fragments.files, helpers: { startLine: fragments.helpers.startLine, endLine: fragments.helpers.endLine }, receiver: { startLine: fragments.receiver.startLine, endLine: fragments.receiver.endLine }, testsRun: false, productionEdited: false }, null, 2) + '\n');
