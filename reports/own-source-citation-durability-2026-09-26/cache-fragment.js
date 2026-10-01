  // Insert in the evidence IIFE, replacing remember/lookup. Dependencies: root,
  // storagePrefix. The original document library uses a different namespace.
  var cacheLimits = Object.freeze({ persistentItems: 200, persistentBytes: 512 * 1024,
    memoryItems: 64, memoryBytes: 256 * 1024, itemBytes: 16 * 1024 });
  var citationMemory = new Map();
  var citationMemoryBytes = 0;
  var citationClock = 0;
  var citationTouchInterval = 60000;
  function citationId(id) { return typeof id === 'string' && /^[a-z0-9-]{1,128}$/.test(id); }
  function citationBytes(key, raw) { return (key.length + raw.length) * 2; }
  function normaliseSnapshot(value) {
    try {
      if (!value || typeof value !== 'object' || Array.isArray(value) || !citationId(value.id)) return null;
      var fields = { sourceId: 200, evidenceId: 200, title: 500, locatorLabel: 200, passage: 1200, suppliedAt: 64 };
      for (var name in fields) {
        if (typeof value[name] !== 'string' || value[name].length > fields[name]) return null;
      }
      if (!value.passage.length || (value.version !== null && (!Number.isSafeInteger(value.version) || value.version <= 0))) return null;
      var item = { id: value.id, sourceId: value.sourceId, evidenceId: value.evidenceId,
        title: value.title, locatorLabel: value.locatorLabel, version: value.version,
        passage: value.passage, suppliedAt: value.suppliedAt };
      // Reserve room for the persistent recency field without shortening quotes.
      if (citationBytes(storagePrefix + item.id, JSON.stringify(item)) + 64 > cacheLimits.itemBytes) return null;
      return item;
    } catch (_) { return null; }
  }
  function citationSame(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
  function citationRecord(key, raw) {
    var value = null, item = null;
    try {
      if (citationBytes(key, raw) <= cacheLimits.itemBytes) {
        value = JSON.parse(raw);
        item = normaliseSnapshot(value);
        if (item && key !== storagePrefix + item.id) item = null;
      }
    } catch (_) {}
    var stamp = item && value && typeof value.__cacheLastUsed === 'number' && Number.isFinite(value.__cacheLastUsed)
      ? value.__cacheLastUsed : (item ? Date.parse(item.suppliedAt) : 0);
    return { key: key, raw: raw, item: item, bytes: citationBytes(key, raw), used: Number.isFinite(stamp) ? stamp : 0 };
  }
  function citationNow() { citationClock = Math.max(Date.now(), citationClock + 1); return citationClock; }
  function citationKeep(item, raw, protectedIds) {
    var old = citationMemory.get(item.id);
    if (old) citationMemoryBytes -= old.bytes;
    citationMemory.delete(item.id);
    var bytes = citationBytes(storagePrefix + item.id, JSON.stringify(item)) + (raw ? raw.length * 2 : 0);
    citationMemory.set(item.id, { item: item, raw: raw, bytes: bytes, touched: Date.now() });
    citationMemoryBytes += bytes;
    var entries = Array.from(citationMemory.keys());
    for (var i = 0; (citationMemory.size > cacheLimits.memoryItems || citationMemoryBytes > cacheLimits.memoryBytes) && i < entries.length; i++) {
      var id = entries[i];
      if (protectedIds && protectedIds.has(id)) continue;
      citationMemoryBytes -= citationMemory.get(id).bytes;
      citationMemory.delete(id);
    }
  }
  function citationStorage() {
    var storage = root.localStorage;
    if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function'
      || typeof storage.key !== 'function' || typeof storage.removeItem !== 'function') throw new Error('Citation storage unavailable');
    return storage;
  }
  function citationScan(storage) {
    var records = new Map();
    for (var i = 0; i < storage.length; i++) {
      var key = storage.key(i);
      if (typeof key !== 'string' || key.indexOf(storagePrefix) !== 0 || !citationId(key.slice(storagePrefix.length))) continue;
      var raw = storage.getItem(key);
      if (raw !== null) records.set(key, citationRecord(key, raw));
    }
    return records;
  }
  function citationQuota(error) {
    return !!error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
  }
  function citationCandidates(records, protectedIds) {
    return Array.from(records.values()).filter(function(record) { return !protectedIds.has(record.key.slice(storagePrefix.length)); })
      .sort(function(a, b) { return a.used - b.used || a.key.localeCompare(b.key); });
  }
  function citationEvict(storage, records, candidates) {
    while (candidates.length) {
      var record = candidates.shift();
      // Another tab may have refreshed this citation since the scan.
      var currentRaw = storage.getItem(record.key);
      if (currentRaw === null) { records.delete(record.key); return true; }
      if (currentRaw !== record.raw) { records.set(record.key, citationRecord(record.key, currentRaw)); continue; }
      storage.removeItem(record.key);
      records.delete(record.key);
      return true;
    }
    return false;
  }
  function citationOverBudget(records) {
    var bytes = 0;
    records.forEach(function(record) { bytes += record.bytes; });
    return records.size > cacheLimits.persistentItems || bytes > cacheLimits.persistentBytes;
  }
  function remember(items) {
    if (!Array.isArray(items)) return false;
    var batch = new Map(), batchBytes = 0;
    for (var i = 0; i < items.length; i++) {
      var item = normaliseSnapshot(items[i]);
      if (!item) return false;
      var prior = batch.get(item.id), cached = citationMemory.get(item.id);
      if ((prior && !citationSame(prior, item)) || (cached && !citationSame(cached.item, item))) return false;
      if (!prior) { batch.set(item.id, item); batchBytes += 2 * citationBytes(storagePrefix + item.id, JSON.stringify(item)) + 64; }
    }
    if (!batch.size) return true;
    // A single operation cannot promise both bounded retention and protection of
    // an oversized batch. Normal generation supplies at most eight passages.
    if (batch.size > cacheLimits.memoryItems || batchBytes > cacheLimits.memoryBytes) return false;
    var protectedIds = new Set(batch.keys()), storage = null, records = null;
    try {
      storage = citationStorage();
      records = citationScan(storage);
      var conflict = false;
      batch.forEach(function(item) {
        var existing = records.get(storagePrefix + item.id);
        if (existing && existing.item && !citationSame(existing.item, item)) conflict = true;
      });
      if (conflict) return false;
    } catch (_) { storage = null; }
    var retainedBytes = 0;
    batch.forEach(function(item) {
      var existing = records && records.get(storagePrefix + item.id);
      var itemBytes = citationBytes(storagePrefix + item.id, JSON.stringify(item));
      retainedBytes += itemBytes + Math.max(itemBytes + 64, existing && existing.item ? existing.raw.length * 2 : 0);
    });
    if (retainedBytes > cacheLimits.memoryBytes) return false;
    batch.forEach(function(item) {
      var record = records && records.get(storagePrefix + item.id);
      citationKeep(item, record && record.item ? record.raw : null, protectedIds);
    });
    if (!storage) return false;
    var candidates = citationCandidates(records, protectedIds), cleanupAllowed = true;
    try {
      var pending = Array.from(batch.values());
      for (var j = 0; j < pending.length; j++) {
        var current = pending[j], key = storagePrefix + current.id;
        var existing = records.get(key), latest = storage.getItem(key);
        if (latest !== (existing ? existing.raw : null)) {
          var changed = latest === null ? null : citationRecord(key, latest);
          if (changed && changed.item && !citationSame(changed.item, current)) return false;
          // Fail closed when the scan became stale; retry is safe and bounded.
          return false;
        }
        var stamp = citationNow(), value = Object.assign({}, current, { __cacheLastUsed: stamp });
        var raw = JSON.stringify(value);
        // An identical durable record is already saved; touching recency is
        // optional and must never evict another snapshot just to refresh it.
        if (existing && existing.item) {
          if (stamp - existing.used >= citationTouchInterval) {
            try { storage.setItem(key, raw); existing = citationRecord(key, raw); records.set(key, existing); }
            catch (_) { cleanupAllowed = false; }
          }
          citationKeep(current, existing.raw, protectedIds);
          continue;
        }
        while (true) {
          try { storage.setItem(key, raw); break; }
          catch (error) {
            if (!citationQuota(error) || !citationEvict(storage, records, candidates)) return false;
          }
        }
        records.set(key, citationRecord(key, raw));
        citationKeep(current, raw, protectedIds);
      }
      // Normal retention pruning only follows successful saves. Security/read
      // failures never initiate quota cleanup.
      while (citationOverBudget(records)) {
        if (!cleanupAllowed || !citationEvict(storage, records, candidates)) return false;
      }
      // Another context can remove a preceding batch member during later writes.
      // Confirm every member before reporting a durable save.
      for (var n = 0; n < pending.length; n++) {
        var savedKey = storagePrefix + pending[n].id, savedRaw = storage.getItem(savedKey);
        var saved = savedRaw === null ? null : citationRecord(savedKey, savedRaw);
        if (!saved || !saved.item || !citationSame(saved.item, pending[n])) return false;
      }
      return true;
    } catch (_) { return false; }
  }
  function lookup(id) {
    if (!citationId(id)) return null;
    var cached = citationMemory.get(id), storage = null, record = null;
    if (!cached) {
      try {
        storage = citationStorage();
        var raw = storage.getItem(storagePrefix + id);
        if (raw === null) return null;
        record = citationRecord(storagePrefix + id, raw);
        if (!record.item) return null;
        citationKeep(record.item, raw);
        cached = citationMemory.get(id);
        // Permit a first cold read to refresh old persisted recency.
        cached.touched = record.used;
      } catch (_) { return null; }
    }
    citationMemory.delete(id);
    citationMemory.set(id, cached);
    if (cached.raw && Date.now() - cached.touched >= citationTouchInterval) {
      cached.touched = Date.now();
      try {
        storage = storage || citationStorage();
        var key = storagePrefix + id;
        if (storage.getItem(key) === cached.raw) {
          var updated = JSON.stringify(Object.assign({}, cached.item, { __cacheLastUsed: citationNow() }));
          storage.setItem(key, updated);
          citationKeep(cached.item, updated);
        }
      } catch (_) {} // Reading a passage never requires a successful metadata write.
    }
    return Object.assign({}, cached.item);
  }
