// Reproduce the pinned local MVT decoder from official npm tarballs.
// Run explicitly when updating vendor dependencies; no package install scripts run.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const packages = [
  { name: '@mapbox/vector-tile', version: '2.0.4', folder: 'vector-tile', integrity: 'sha512-AkOLcbgGTdXScosBWwmmD7cDlvOjkg/DetGva26pIRiZPdeJYjYKarIlb4uxVzi6bwHO6EWH82eZ5Nuv4T5DUg==' },
  { name: 'pbf', version: '4.0.1', folder: 'pbf', integrity: 'sha512-SuLdBvS42z33m8ejRbInMapQe8n0D3vN/Xd5fmWM3tufNgRQFBpaW2YVJxQZV4iPNqb0vEFvssMEo5w9c6BTIA==' },
  { name: '@mapbox/point-geometry', version: '1.1.0', folder: 'point-geometry', integrity: 'sha512-YGcBz1cg4ATXDCM/71L9xveh4dynfGmcLDqufR+nQQy3fKwsAZsWd/x4621/6uJaeB9mwOHE6hPeDgXz9uViUQ==' }
];
async function main() {
  const records = [];
  for (const item of packages) {
    const url = 'https://registry.npmjs.org/' + item.name + '/-/' + item.folder + '-' + item.version + '.tgz';
    const response = await fetch(url);
    if (!response.ok) throw new Error('Download failed: ' + response.status);
    const data = Buffer.from(await response.arrayBuffer());
    if (data.length > 1000000 || 'sha512-' + crypto.createHash('sha512').update(data).digest('base64') !== item.integrity) throw new Error('Integrity mismatch: ' + item.name);
    const directory = path.join(root, 'vendor/skyschool-vector', item.folder);
    await fs.mkdir(directory, { recursive: true });
    const archive = path.join(directory, 'source.tgz');
    await fs.writeFile(archive, data);
    const names = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split(/\r?\n/);
    if (names.some(name => !/^package\/[A-Za-z0-9_./-]+$/.test(name) || name.split('/').includes('..'))) throw new Error('Unexpected archive entry.');
    execFileSync('tar', ['-xzf', archive, '--strip-components=1', '-C', directory]);
    await fs.unlink(archive);
    records.push({ ...item, url, downloadedAt: new Date().toISOString(), sha256: crypto.createHash('sha256').update(data).digest('hex') });
  }
  await fs.writeFile(path.join(root, 'vendor/skyschool-vector/provenance.json'), JSON.stringify({ packages: records }, null, 2) + '\n');
  console.log('Verified and retained three pinned decoder dependencies.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
