const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const families = ['content_engine', 'view_misc_panels', 'gemini_api', 'text_pipeline_helpers', 'view_simplified', 'doc_pipeline'];
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const read = name => fs.readFileSync(path.join(root, name));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const baselineFile = path.join(__dirname, 'baseline.json');
const check = process.argv.includes('--check');
if (process.argv.includes('--capture')) {
  const baseline = {};
  for (const family of families) {
    const name = family + '_module.js', bytes = read(name);
    for (const prefix of ['desktop/web-app/public/', 'desktop/app-build/', 'desktop/web-app/build/']) {
      const mirror = prefix + name;
      if (!fs.existsSync(path.join(root, mirror))) continue;
      if (!read(mirror).equals(bytes)) throw new Error('Pre-existing mirror difference: ' + mirror);
      baseline[mirror] = hash(bytes);
    }
    const source = 'desktop/web-app/src/' + family + '_source.jsx';
    if (fs.existsSync(path.join(root, source))) baseline[source] = hash(read(source));
  }
  fs.writeFileSync(baselineFile, JSON.stringify(baseline, null, 2) + '\n');
  console.log('Captured matching module mirrors; source mirror diff reviewed separately.');
} else {
  const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
  const artifactFile = path.join(__dirname, 'artifacts.json');
  const previous = fs.existsSync(artifactFile) ? JSON.parse(fs.readFileSync(artifactFile, 'utf8')) : [];
  const write = (name, bytes, guarded = false) => {
    bytes = Buffer.from(bytes);
    const existing = read(name);
    if (existing.equals(bytes)) return;
    if (check) throw new Error('Stale artifact: ' + name);
    if (guarded && hash(existing) !== baseline[name] && !previous.some(entry => entry.mirrors.includes(name) && entry.sha256 === hash(existing))) throw new Error('Concurrent mirror edit: ' + name);
    fs.writeFileSync(path.join(root, name), bytes);
  };
  const artifacts = [];
  for (const family of families) {
    const name = family + '_module.js', bytes = read(name), pin = hash(bytes).slice(0, 8);
    const mirrors = Object.keys(baseline).filter(value => value.endsWith('/' + name));
    for (const mirror of mirrors) write(mirror, bytes, true);
    const source = 'desktop/web-app/src/' + family + '_source.jsx';
    if (baseline[source]) write(source, read(family + '_source.jsx'), true);
    for (const host of hosts) {
      const source = read(host).toString(), pattern = new RegExp(family + '_module\\.js\\?v=[a-z0-9]+', 'g');
      if (!pattern.test(source)) {
        if (host !== hosts[0] && (source.includes("'./" + name + "'") || source.includes('"./' + name + '"'))) continue;
        throw new Error('Missing loader: ' + host + ' / ' + family);
      }
      write(host, source.replace(pattern, name + '?v=' + pin));
    }
    artifacts.push({ name, sha256: hash(bytes), mirrors });
  }
  if (!check) fs.writeFileSync(path.join(__dirname, 'artifacts.json'), JSON.stringify(artifacts, null, 2) + '\n');
  console.log(JSON.stringify({ check, artifacts }));
}
