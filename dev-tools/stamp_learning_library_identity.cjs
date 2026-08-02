#!/usr/bin/env node
/*
 * stamp_learning_library_identity.cjs (2026-07-31) — bind every learning-library
 * (and library-QA) JSON to its pack's identity: packId, version, visibility.
 *
 * WHY: the hub's library fetch runs in STRICT bound-identity mode whenever the
 * manifest entry carries a sha256 (test_prep_hub_source.jsx, learning-library
 * effect): the catalog must carry packId/version/visibility matching the
 * selected pack, or the fetch is rejected and the tab shows 'unavailable'.
 * Only the AP-pilot generator ever emitted all three fields — the other 23
 * sha-bound packs (EPPP included) failed validation, so "Review learning
 * library" silently never loaded for ANY of them.
 *
 * Individual build_*_learning_library.cjs generators emit at most packId, and
 * hand-stamping their outputs does not survive a rebuild. So this runs inside
 * _build_test_prep_hub_module.js AFTER all library generators and BEFORE
 * build_test_prep_pack_manifest.cjs (which recomputes the sha256 digests from
 * the stamped bytes — order matters).
 *
 * Identity truth = the entry's PACK JSON (post-build) when the entry carries a
 * packUrl (a pack build this run may have bumped the version); most entries
 * carry NO packUrl — their id/version/visibility live on the manifest entry
 * itself, which is exactly what the hub compares against (selectedPack.*).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(ROOT, 'test_prep', 'pack_manifest.json');

const localPath = (url) => {
  const tail = String(url || '').split('/test_prep/').pop();
  return tail ? path.join(ROOT, 'test_prep', tail) : null;
};
const publicTwin = (p) => path.join(ROOT, 'desktop', 'web-app', 'public', 'test_prep', path.basename(p));

const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
let stamped = 0, ok = 0, missing = 0;

for (const entry of manifest.entries || []) {
  const packPath = localPath(entry.packUrl);
  const pack = packPath && fs.existsSync(packPath)
    ? JSON.parse(fs.readFileSync(packPath, 'utf8'))
    : entry;
  const identity = { packId: pack.id, version: pack.version, visibility: pack.visibility };
  if (!identity.packId) continue;

  for (const url of [entry.learningLibraryUrl, entry.learningLibraryQaUrl]) {
    const p = localPath(url);
    if (!p) continue;
    if (!fs.existsSync(p)) { missing += 1; console.warn('  ! library asset missing: ' + path.basename(p)); continue; }
    let s = fs.readFileSync(p, 'utf8');
    const j = JSON.parse(s);
    // Wall-clock generation timestamps make otherwise identical release
    // artifacts hash differently on every rebuild. Review dates live in the
    // authored/QA metadata, so omit this volatile field from released bytes.
    let changed = false;
    if (Object.prototype.hasOwnProperty.call(j, 'generatedAt')) {
      s = s.replace(/\s*"generatedAt":\s*("[^"]*"|[^,}\]\n]+),?/, '');
      changed = true;
    }
    const wrong = ['packId', 'version', 'visibility'].filter((k) => String(j[k] ?? '') !== String(identity[k] ?? ''));
    if (!wrong.length && !changed) { ok += 1; continue; }
    // Remove any stale identity keys, then inject the fresh trio after the
    // opening brace — textual, so a 13MB library keeps its exact formatting.
    for (const k of wrong) {
      // Value may be a string OR a bare scalar; a survivor would appear AFTER
      // the injected key and win JSON.parse's duplicate-key resolution.
      if (j[k] !== undefined) s = s.replace(new RegExp('\\s*"' + k + '":\\s*("[^"]*"|[^,}\\]\\n]+),?', ''), '');
    }
    const inject = Object.entries(identity).filter(([k]) => wrong.includes(k))
      .map(([k, v]) => JSON.stringify(k) + ': ' + JSON.stringify(v)).join(', ');
    if (inject) {
      const brace = s.indexOf('{');
      s = s.slice(0, brace + 1) + '\n  ' + inject + ',' + s.slice(brace + 1);
    }
    const check = JSON.parse(s);
    if (Object.prototype.hasOwnProperty.call(check, 'generatedAt')) throw new Error('volatile generatedAt survived release finalization for ' + p);
    for (const k of Object.keys(identity)) {
      if (String(check[k]) !== String(identity[k])) throw new Error('stamp validation failed for ' + p + ' key ' + k);
    }
    fs.writeFileSync(p, s, 'utf8');
    const twin = publicTwin(p);
    if (fs.existsSync(path.dirname(twin))) fs.writeFileSync(twin, s, 'utf8');
    stamped += 1;
  }
}

console.log('Learning-library identity: ' + stamped + ' stamped, ' + ok + ' already bound, ' + missing + ' missing.');
if (missing) process.exitCode = 0; // missing assets are the manifest builder's problem to flag
