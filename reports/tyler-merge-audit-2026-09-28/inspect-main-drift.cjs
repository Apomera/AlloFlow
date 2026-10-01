const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const diff = require(path.join(__dirname, '../../node_modules/diff'));
const main = path.resolve(__dirname, '../..');
const candidate = 'C:/tmp/tyler_integration_candidate';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'integration-final-manifest.json'), 'utf8'));
const canonical = ['AlloFlowANTI.txt', 'ui_strings.js', 'lang/arabic.js', 'lang/french.js', 'lang/spanish_latin_america.js'];
const hashes = manifest.files.filter(row => row.mainChangedSinceSnapshot).map(row => {
  const bytes = fs.readFileSync(path.join(main, row.path));
  return { path: row.path, mainNowSha256: sha(bytes), mainBytes: bytes.length, changedSinceManifest: sha(bytes) !== row.mainNowSha256 };
});
const summarizeValue = value => value === undefined ? null : JSON.stringify(value).slice(0, 350);
const results = [];
for (const rel of canonical) {
  const beforeBytes = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, 'integration-preimages', rel + '.gz')));
  const mainBytes = fs.readFileSync(path.join(main, rel));
  const candidateBytes = fs.readFileSync(path.join(candidate, rel));
  const before = beforeBytes.toString('utf8');
  const current = mainBytes.toString('utf8');
  const integrated = candidateBytes.toString('utf8');
  const result = { path: rel, baselineSha256: sha(beforeBytes), mainSha256: sha(mainBytes), candidateSha256: sha(candidateBytes) };
  if (rel.endsWith('.js')) {
    const b = JSON.parse(before), m = JSON.parse(current), c = JSON.parse(integrated);
    const changes = [];
    function walk(bp, mp, cp, names) {
      if (JSON.stringify(bp) === JSON.stringify(mp)) return;
      if (bp && mp && typeof bp === 'object' && typeof mp === 'object' && !Array.isArray(bp) && !Array.isArray(mp)) {
        for (const key of new Set([...Object.keys(bp), ...Object.keys(mp)])) walk(bp[key], mp[key], cp?.[key], [...names, key]);
      } else {
        const changedInCandidate = JSON.stringify(bp) !== JSON.stringify(cp);
        const alreadyInCandidate = JSON.stringify(mp) === JSON.stringify(cp);
        changes.push({ key: names.join('.'), before: summarizeValue(bp), main: summarizeValue(mp), candidate: summarizeValue(cp), changedInCandidate, alreadyInCandidate, divergentOverlap: changedInCandidate && !alreadyInCandidate });
      }
    }
    walk(b, m, c, []);
    const groups = {};
    for (const row of changes) { const group = row.key.split('.').slice(0, 2).join('.'); groups[group] = (groups[group] || 0) + 1; }
    Object.assign(result, { changedKeys: changes.length, groups, divergentOverlaps: changes.filter(row => row.divergentOverlap), changes });
    console.log(JSON.stringify({ path: rel, changedKeys: changes.length, groups, overlaps: result.divergentOverlaps.map(row => row.key), samples: changes.slice(0, 6) }));
  } else {
    const normalizedBefore = before.replace(/\r\n/g, '\n'), normalizedCurrent = current.replace(/\r\n/g, '\n'), normalizedIntegrated = integrated.replace(/\r\n/g, '\n');
    const mainPatch = diff.structuredPatch(rel, rel, normalizedBefore, normalizedCurrent, '', '', { context: 2 });
    const candidatePatch = diff.structuredPatch(rel, rel, normalizedBefore, normalizedIntegrated, '', '', { context: 0 });
    const overlaps = mainPatch.hunks.map(h => ({ oldStart: h.oldStart, oldLines: h.oldLines, newStart: h.newStart, newLines: h.newLines, overlapsCandidate: candidatePatch.hunks.filter(c => c.oldStart <= h.oldStart + h.oldLines && c.oldStart + c.oldLines >= h.oldStart).map(c => ({ oldStart: c.oldStart, oldLines: c.oldLines })) }));
    Object.assign(result, { hunks: mainPatch.hunks, overlapRanges: overlaps, exactContextAppliesToCandidate: diff.applyPatch(normalizedIntegrated, mainPatch) !== false });
    console.log(JSON.stringify({ path: rel, hunks: mainPatch.hunks.length, overlaps, exactContextAppliesToCandidate: result.exactContextAppliesToCandidate, excerpts: mainPatch.hunks.map(h => h.lines.join('\n').slice(0, 2000)) }));
  }
  results.push(result);
}
const evidence = { recordedAt: new Date().toISOString(), main, candidate, hashes, results };
fs.writeFileSync(path.join(__dirname, 'main-drift-evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
