const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const name = 'view_misc_panels_module.js';
const mirrors = ['desktop/web-app/public/', 'desktop/app-build/', 'desktop/web-app/build/'].map(prefix => prefix + name);
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const read = file => fs.readFileSync(path.join(root, file));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const receipt = path.join(__dirname, 'artifacts.json');
const baseline = path.join(__dirname, 'baseline.json');
const loaderPattern = () => /view_misc_panels_module\.js\?v=[a-z0-9]+/g;
const relativeLoader = (host, text) => host !== hosts[0] && (text.includes("'./" + name + "'") || text.includes('"./' + name + '"'));
function verify(readFile) {
  const bytes = readFile(name), pin = hash(bytes).slice(0, 8);
  for (const mirror of mirrors) if (!readFile(mirror).equals(bytes)) throw new Error('Stale or concurrently changed mirror: ' + mirror);
  for (const host of hosts) {
    const current = readFile(host).toString(), pattern = loaderPattern();
    if (!pattern.test(current)) {
      if (relativeLoader(host, current)) continue;
      throw new Error('Missing named loader: ' + host);
    }
    if (current !== current.replace(pattern, name + '?v=' + pin)) throw new Error('Stale loader: ' + host);
  }
}
if (process.argv.includes('--selftest')) {
  const fixtureRoot = path.join(__dirname, 'sync-fixture');
  const fixtureRead = file => fs.readFileSync(path.join(fixtureRoot, file));
  const fixtureWrite = (file, bytes) => {
    const target = path.join(fixtureRoot, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  };
  const bytes = Buffer.from('/* module parity fixture */\n'), pin = hash(bytes).slice(0, 8);
  for (const file of [name, ...mirrors]) fixtureWrite(file, bytes);
  hosts.forEach((host, index) => fixtureWrite(host, index ? "'./" + name + "'" : "'" + name + '?v=' + pin + "'"));
  verify(fixtureRead);
  const mutations = [
    [mirrors[0], Buffer.from('/* stale module */\n'), 'Stale or concurrently changed mirror:'],
    [hosts[0], Buffer.from("'" + name + "?v=00000000'"), 'Stale loader:'],
    [hosts[0], Buffer.from('/* missing loader */\n'), 'Missing named loader:'],
  ];
  for (const [file, mutation, expected] of mutations) {
    const original = fixtureRead(file);
    try {
      fixtureWrite(file, mutation);
      let failure;
      try { verify(fixtureRead); } catch (error) { failure = error; }
      if (!failure?.message.startsWith(expected)) throw new Error('Mutation was not detected: ' + file);
    } finally {
      fixtureWrite(file, original);
      if (!fixtureRead(file).equals(original)) throw new Error('Fixture restoration failed: ' + file);
      verify(fixtureRead);
    }
  }
  console.log(JSON.stringify({ selftest: true, mutations: mutations.length, restoresVerified: mutations.length }));
} else if (process.argv.includes('--capture')) {
  const bytes = read(name);
  for (const mirror of mirrors) if (!read(mirror).equals(bytes)) throw new Error('Pre-existing mirror difference: ' + mirror);
  fs.writeFileSync(baseline, JSON.stringify({ name, sha256: hash(bytes), mirrors }, null, 2) + '\n');
  console.log('Matching pre-edit mirrors verified.');
} else {
  const check = process.argv.includes('--check'), bytes = read(name), sha256 = hash(bytes), pin = sha256.slice(0, 8);
  if (check) verify(read);
  const allowed = [JSON.parse(fs.readFileSync(baseline, 'utf8')).sha256];
  if (fs.existsSync(receipt)) allowed.push(JSON.parse(fs.readFileSync(receipt, 'utf8')).sha256);
  for (const mirror of mirrors) {
    const current = read(mirror);
    if (current.equals(bytes)) continue;
    if (check || !allowed.includes(hash(current))) throw new Error('Stale or concurrently changed mirror: ' + mirror);
    fs.writeFileSync(path.join(root, mirror), bytes);
  }
  for (const host of hosts) {
    const current = read(host).toString(), pattern = loaderPattern();
    if (!pattern.test(current)) {
      if (relativeLoader(host, current)) continue;
      throw new Error('Missing named loader: ' + host);
    }
    const next = current.replace(pattern, name + '?v=' + pin);
    if (current === next) continue;
    if (check) throw new Error('Stale loader: ' + host);
    fs.writeFileSync(path.join(root, host), next);
  }
  const result = { name, sha256, pin, mirrors, hosts };
  if (!check) fs.writeFileSync(receipt, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ check, ...result }));
}
