  var PALETTE_HISTORY_LIMIT = 8;
  var PALETTE_HISTORY_MAX_LENGTH = 160000;

  // Checkpoints are portable candidates, never a source-verification cache.
  function normalizeCheckpointManifest(manifest) {
    var candidate = normalizePaletteManifestCandidate(manifest);
    if (!candidate) throw new Error('checkpoint-invalid');
    return {
      schema: candidate.schema, version: 1, title: candidate.title,
      rightsPolicy: 'allowlist:public-domain,cc0,cc-by', maximumAssets: PALETTE_MAX_ASSETS,
      assets: candidate.assets.map(function (item) {
        return Object.assign({}, item, { preparation: candidate.preparation[item.id], attribution: attributionText(item) });
      })
    };
  }

  function checkpointFingerprint(manifest) {
    return JSON.stringify(normalizeCheckpointManifest(manifest));
  }

  function normalizePaletteHistory(value) {
    if (value == null) return [];
    if (!Array.isArray(value)) throw new Error('checkpoint-invalid');
    if (value.length > PALETTE_HISTORY_LIMIT || JSON.stringify(value).length > PALETTE_HISTORY_MAX_LENGTH) throw new Error('checkpoint-full');
    var seen = Object.create(null);
    return value.map(function (entry) {
      if (!entry || !/^checkpoint-[a-z0-9-]{1,80}$/.test(String(entry.id || '')) || seen[entry.id] || !String(entry.name || '').trim() || !Number.isFinite(Date.parse(entry.createdAt))) throw new Error('checkpoint-invalid');
      seen[entry.id] = true;
      return { id: entry.id, name: String(entry.name).trim().slice(0, 80), createdAt: new Date(entry.createdAt).toISOString(), manifest: normalizeCheckpointManifest(entry.manifest) };
    });
  }

  function appendPaletteCheckpoint(history, manifest, name, id, createdAt) {
    var entries = normalizePaletteHistory(history);
    if (entries.length >= PALETTE_HISTORY_LIMIT) throw new Error('checkpoint-full');
    var next = [{ id: id, name: name, createdAt: createdAt, manifest: normalizeCheckpointManifest(manifest) }].concat(entries);
    // Never evict older checkpoints to make room for a save or restore backup.
    var normalized = normalizePaletteHistory(next);
    if (JSON.stringify(normalized).length > PALETTE_HISTORY_MAX_LENGTH) throw new Error('checkpoint-full');
    return normalized;
  }
