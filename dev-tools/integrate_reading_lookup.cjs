// Scoped, guarded integration of the reviewed Track 11 candidate bundle.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { applyPatch } = require('diff');
const root = path.resolve(__dirname, '..');
const reportDir = path.join(root, 'reports/lookup-recovery/integration');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const sha = text => crypto.createHash('sha256').update(text).digest('hex');
const sourceFiles = { 'content_engine_source.jsx': 'engine', 'view_simplified_source.jsx': 'reader', 'host_handlers_source.jsx': 'host', 'dictionary_loader.js': 'dictionary' };
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const runtime = ['content_engine_module.js', 'view_simplified_module.js', 'host_handlers_module.js', 'dictionary_loader.js', 'ui_strings.js'];
const helpers = ['reader_place_store.js', 'reader_support_drafts.js', 'instructional_context_module.js', 'pure_helpers_module.js', 'phase_n_misc_helpers_module.js', 'text_pipeline_helpers_module.js'];
const tracked = [...Object.keys(sourceFiles), 'desktop/web-app/src/content_engine_source.jsx', ...runtime, ...runtime.map(file => 'desktop/web-app/public/' + file), ...hosts, ...helpers];
const head = () => execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
function retainTranslationDirection(source) {
  return source.replaceAll("dir={section.key === 'tgt' ? 'ltr' : getContentDirection(section.label)}", 'dir={getContentDirection(section.label)}');
}
function write(file, text) {
  const target = path.join(root, file), temporary = target + '.lookup-integration-' + process.pid + '.tmp';
  try { fs.writeFileSync(temporary, text); fs.renameSync(temporary, target); }
  finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
function snapshot() { return Object.fromEntries([...new Set(tracked)].map(file => [file, sha(read(file))])); }
function updatePins() {
  for (const host of hosts) {
    let text = read(host);
    for (const file of runtime.filter(file => file.endsWith('_module.js'))) {
      const pattern = new RegExp("(loadModule\\('[^']+', '[^']*/" + file.replaceAll('.', '\\.') + "\\?v=)[a-f0-9]+('\\))", 'g');
      if ([...text.matchAll(pattern)].length !== 1) throw Error('Executable module pin not unique: ' + host + ':' + file);
      text = text.replace(pattern, (_, before, after) => before + sha(read(file)).slice(0, 8) + after);
    }
    write(host, text);
  }
}
if (process.argv.includes('--finish')) {
  const baseline = JSON.parse(read('reports/lookup-recovery/context/baseline.json'));
  for (const [file, name] of Object.entries(sourceFiles)) {
    const candidate = read('reports/lookup-recovery/context/' + name + '.candidate.source.js');
    const expected = file === 'view_simplified_source.jsx' ? retainTranslationDirection(candidate) : candidate;
    if (sha(read(file)) !== sha(expected)) throw Error('Integrated source changed before finishing: ' + file);
  }
  const { files: before } = JSON.parse(fs.readFileSync(path.join(reportDir, 'before.json'), 'utf8'));
  for (const file of helpers) if (sha(read(file)) !== before[file]) throw Error('Helper changed before finishing: ' + file);
  updatePins();
  const after = snapshot();
  fs.writeFileSync(path.join(reportDir, 'integration.json'), JSON.stringify({ head: head(), before, after, changedFiles: Object.keys(after).filter(file => before[file] !== after[file]) }, null, 2) + '\n');
  console.log('Finished host pins and recorded the integrated runtime.');
} else if (process.argv.includes('--verify')) {
  const baseline = JSON.parse(fs.readFileSync(path.join(reportDir, 'integration.json'), 'utf8'));
  const current = snapshot(), drift = Object.keys(current).filter(file => baseline.after[file] !== current[file]);
  const reviewFile = path.join(reportDir, 'concurrent-catalog-review.json');
  const reviewed = fs.existsSync(reviewFile) ? JSON.parse(fs.readFileSync(reviewFile, 'utf8')).approvedHashes : {};
  const acceptedExternalDrift = drift.filter(file => reviewed[file] === current[file]);
  const unreviewedDrift = drift.filter(file => !acceptedExternalDrift.includes(file));
  const mirrors = Object.fromEntries(runtime.map(file => [file, read(file) === read('desktop/web-app/public/' + file)]));
  mirrors.contentEngineSource = read('content_engine_source.jsx') === read('desktop/web-app/src/content_engine_source.jsx');
  const pins = {};
  for (const host of hosts) for (const file of runtime.filter(file => file.endsWith('_module.js'))) {
    const pattern = new RegExp("loadModule\\('[^']+', '[^']*/" + file.replaceAll('.', '\\.') + "\\?v=([a-f0-9]+)'\\)");
    pins[host + ':' + file] = read(host).match(pattern)?.[1] === sha(read(file)).slice(0, 8);
  }
  const result = { head: head(), integratedAtHead: baseline.head, drift, acceptedExternalDrift, unreviewedDrift, mirrors, pins,
    verified: unreviewedDrift.length === 0 && Object.values(mirrors).every(Boolean) && Object.values(pins).every(Boolean) };
  fs.writeFileSync(path.join(reportDir, 'verification.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2)); if (!result.verified) process.exitCode = 1;
} else if (process.argv.includes('--apply')) {
  if (fs.existsSync(path.join(reportDir, 'integration.json'))) throw Error('Integration already recorded; inspect it instead of applying twice.');
  const baseline = JSON.parse(read('reports/lookup-recovery/context/baseline.json'));
  const updates = {};
  for (const [file, name] of Object.entries(sourceFiles)) {
    const before = read(file);
    if (sha(before) !== baseline.files[file].sourceSha256) throw Error('Reconcile newer source: ' + file);
    const next = applyPatch(before.replace(/\r\n/g, '\n'), read('reports/lookup-recovery/context/' + name + '.patch'));
    if (next === false || sha(next) !== baseline.files[file].candidateSha256) throw Error('Patch/candidate mismatch: ' + file);
    updates[file] = file === 'view_simplified_source.jsx' ? retainTranslationDirection(next) : next;
  }
  const before = snapshot();
  fs.mkdirSync(reportDir, { recursive: true });
  for (const file of Object.keys(before)) {
    const target = path.join(reportDir, 'before', file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(path.join(root, file), target);
  }
  fs.writeFileSync(path.join(reportDir, 'before.json'), JSON.stringify({ head: head(), files: before }, null, 2) + '\n');
  for (const file of Object.keys(before)) if (sha(read(file)) !== before[file]) throw Error('Concurrent change before integration: ' + file);
  for (const [file, text] of Object.entries(updates)) write(file, text);
  write('desktop/web-app/src/content_engine_source.jsx', updates['content_engine_source.jsx']);
  write('desktop/web-app/public/dictionary_loader.js', updates['dictionary_loader.js']);
  let strings = read('ui_strings.js');
  const copy = {
    lookup_ai_available: 'AI word help is available. You can try again.',
    lookup_ai_unavailable: 'AI word help is unavailable right now. Any available help is still shown.',
    lookup_picture_timeout: 'The picture took too long to load. You can try again.',
    word_audio_timeout: 'Audio took too long to start. You can try again.'
  };
  const anchor = '    "lookup_ai_timeout":';
  if (strings.split(anchor).length !== 2) throw Error('English lookup-copy anchor changed');
  const additions = Object.entries(copy).filter(([key]) => !strings.includes('"' + key + '":')).map(([key, value]) => '    ' + JSON.stringify(key) + ': ' + JSON.stringify(value) + ',').join('\n');
  strings = strings.replace(anchor, additions + '\n' + anchor);
  write('ui_strings.js', strings); write('desktop/web-app/public/ui_strings.js', strings);
  for (const args of [['_build_content_engine_module.js'], ['_build_view_simplified_module.js'], ['_build_first_wave_view_modules.js', 'HostHandlers']]) {
    execFileSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  }
  updatePins();
  const after = snapshot();
  for (const file of helpers) if (after[file] !== before[file]) throw Error('Concurrent helper change during generation: ' + file);
  fs.writeFileSync(path.join(reportDir, 'integration.json'), JSON.stringify({ head: head(), before, after, copy, changedFiles: Object.keys(after).filter(file => before[file] !== after[file]) }, null, 2) + '\n');
  console.log('Integrated the four reviewed patches, scoped generated modules/mirrors, English fallback copy, and three host pins.');
} else throw Error('Use --apply, --finish, or --verify.');
