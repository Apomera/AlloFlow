// Embedded by _build_view_simplified_module.js; no additional runtime loader.
// The host owns learner identity. Never promote an anonymous draft to a profile.
function createReadingPlaceStore(options) {
  options = options || {};
  var storageKey = 'alloflow_reading_places_v1';
  var entries = new Map();
  var lifecycleTarget = null, guardAttached = false;
  var fields = ['mainIdea', 'support', 'confusing', 'confusingNote'];
  var maxChars = options.maxChars || 1500000;
  var maxAnswerChars = options.maxAnswerChars || 16000;
  var maxRecords = options.maxRecords || 400;
  // Answers and bookmarks untouched this long may make room on a full device.
  var staleWorkMs = options.staleWorkMs || 180 * 24 * 60 * 60 * 1000;
  var maxEmptyEntries = Number.isSafeInteger(options.maxEmptyEntries) && options.maxEmptyEntries > 0 ? options.maxEmptyEntries : 20;
  var now = options.now || Date.now;
  var object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  var equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  var copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
  var index = value => Number.isSafeInteger(value) && value >= 0;
  var keyOf = scope => [scope.learner || '', scope.itemId, scope.fingerprint].join('|');
  var memoryKey = scope => JSON.stringify([scope.learner || '', scope.itemId, scope.fingerprint, scope.text]);
  var hasWork = row => !!row && (!!row.bookmark || Object.values(row.responses || {}).some(answer => fields.some(field => !!answer[field])));
  var authoredToken = row => JSON.stringify(row ? { responses: row.responses || {}, bookmark: row.bookmark || null } : null);
  // The key holds the text's FNV-1a hash and length; this second, independent
  // hash tells versions apart without storing the text in every row.
  var textCheck = text => {
    var a = 5381, b = 0x9e3779b9;
    for (var i = 0; i < text.length; i++) { var c = text.charCodeAt(i); a = Math.imul(a, 33) ^ c; b = Math.imul(b ^ c, 0x85ebca6b); b ^= b >>> 13; }
    return 'c1-' + (a >>> 0).toString(16) + '-' + (b >>> 0).toString(16);
  };
  function normalize(value) {
    var bad = !object(value), row = { responses: {} };
    if (bad) return { row: null, bad: true };
    for (var name of ['paragraph', 'snippet', 'resume', 'at', 'bookmark', 'responses', 'sourceText', 'sourceCheck', 'revision']) {
      if (!Object.prototype.hasOwnProperty.call(value, name)) continue;
      var v = value[name];
      if (name === 'responses') {
        if (!object(v)) { bad = true; continue; }
        for (var section of Object.keys(v)) {
          if (!/^(0|[1-9]\d*)$/.test(section) || !index(Number(section)) || !object(v[section])) { bad = true; continue; }
          var answer = {};
          fields.forEach(field => { if (v[section][field] !== undefined) { if (typeof v[section][field] === 'string') answer[field] = v[section][field]; else bad = true; } });
          row.responses[section] = answer;
        }
      } else if (name === 'bookmark') {
        if (v === null) row.bookmark = null;
        else if (object(v) && index(v.paragraph) && typeof v.snippet === 'string') row.bookmark = { paragraph: v.paragraph, snippet: v.snippet };
        else bad = true;
      } else if ((name === 'paragraph' || name === 'revision') ? index(v)
        : name === 'at' ? typeof v === 'number' && Number.isFinite(v) && v >= 0
        : name === 'resume' ? typeof v === 'boolean' : typeof v === 'string') row[name] = v;
      else bad = true;
    }
    return { row, bad };
  }
  function read() {
    try {
      var storage = options.getStorage(), raw = storage.getItem(storageKey);
      if (raw && raw.length > maxChars) return { rows: {}, reason: 'too-large', problem: { kind: 'store-size', length: raw.length, limit: maxChars } };
      var all = raw == null ? {} : JSON.parse(raw);
      if (!object(all)) return { rows: {}, reason: 'corrupt-store' };
      // A damaged row blocks only the reader it belongs to (see problemFor); it
      // stays byte-for-byte for repair, and other learners keep saving.
      var rows = Object.create(null), damaged = Object.create(null);
      Object.keys(all).forEach(key => { var checked = normalize(all[key]); if (checked.row) rows[key] = checked.row; if (checked.bad) damaged[key] = true; });
      return { rows, all, storage, damaged, reason: null };
    } catch (error) { return { rows: {}, reason: error && error.name === 'SyntaxError' ? 'corrupt-store' : 'denied' }; }
  }
  function problemFor(loaded, scope) {
    return loaded.reason || (loaded.damaged && loaded.damaged[keyOf(scope)] ? 'corrupt-store' : null);
  }
  function flatten(row) {
    var flat = {};
    if (!row) return flat;
    // Position is one field so paragraph/snippet/resume cannot be mixed across tabs.
    if (row.paragraph !== undefined) flat.position = { paragraph: row.paragraph, snippet: row.snippet || '', resume: !!row.resume };
    if (row.bookmark !== undefined) flat.bookmark = row.bookmark;
    Object.keys(row.responses || {}).forEach(section => fields.forEach(field => {
      if (row.responses[section][field] !== undefined) flat[section + ':' + field] = row.responses[section][field];
    }));
    return flat;
  }
  function expand(flat, metadata) {
    var row = { ...metadata, responses: {} };
    Object.keys(flat).forEach(key => {
      if (key === 'position') Object.assign(row, flat[key]);
      else if (key === 'bookmark') row.bookmark = flat[key];
      else { var parts = key.split(':'); row.responses[parts[0]] = { ...row.responses[parts[0]], [parts[1]]: flat[key] }; }
    });
    return row;
  }
  function result(entry) {
    syncGuard();
    return { status: entry.status, reason: entry.reason || null, place: copy(entry.draft), retained: 'page-session',
      medium: entry.status === 'saved' ? 'localstorage' : 'memory', draftRevision: entry.revision,
      persistedRevision: entry.base ? entry.base.revision || 0 : null, recoveryCopies: copy(entry.recoveryCopies), problem: copy(entry.problem) || null };
  }
  function fail(entry, reason, problem) { entry.status = 'failed'; entry.reason = reason; entry.problem = problem || null; return result(entry); }
  function needsRecovery(entry) {
    if (entry.recoveryCopies.length) return true;
    if (!entry.scope.learner) return hasWork(entry.draft);
    if (entry.status === 'failed' && hasWork(entry.draft)) return true;
    var local = flatten(entry.draft), base = flatten(entry.base);
    return [...entry.dirty].some(key => key !== 'position' && !equal(local[key] || null, base[key] || null));
  }
  function hasUnsavedWork() { return [...entries.values()].some(needsRecovery); }
  // Unnamed learners share one page scope; a new learner on the page (or "Clear my
  // reading work") drops that page-only work. Named learners are untouched.
  function forgetAnonymous() { [...entries.keys()].forEach(key => { if (!entries.get(key).scope.learner) entries.delete(key); }); syncGuard(); }
  function hasSessionWork(learner) { return [...entries.values()].some(entry => entry.scope.learner === learner && (hasWork(entry.draft) || entry.recoveryCopies.length || needsRecovery(entry))); }
  function guardLeaving(event) {
    if (!hasUnsavedWork()) return;
    event.preventDefault(); event.returnValue = '';
  }
  function syncGuard() {
    if (!lifecycleTarget) return;
    var needed = hasUnsavedWork();
    if (needed === guardAttached) return;
    lifecycleTarget[needed ? 'addEventListener' : 'removeEventListener']('beforeunload', guardLeaving);
    guardAttached = needed;
  }
  function watchPage(target) {
    if (lifecycleTarget && guardAttached) lifecycleTarget.removeEventListener('beforeunload', guardLeaving);
    lifecycleTarget = target; guardAttached = false; syncGuard();
    return function () {
      if (lifecycleTarget !== target) return;
      if (guardAttached) target.removeEventListener('beforeunload', guardLeaving);
      lifecycleTarget = null; guardAttached = false;
    };
  }
  function exportSession(learner) {
    return { format: 'alloflow-reading-recovery', version: 1, readings: [...entries.values()]
      .filter(entry => entry.scope.learner === learner && (hasWork(entry.draft) || entry.recoveryCopies.length || needsRecovery(entry)))
      .map(entry => ({ scope: copy(entry.scope), place: copy(entry.draft), recoveryCopies: copy(entry.recoveryCopies), status: entry.status })) };
  }
  function matching(row, scope) {
    return row && (row.sourceText !== undefined ? row.sourceText === scope.text : row.sourceCheck === undefined || row.sourceCheck === textCheck(String(scope.text || '')));
  }
  function trimEmptyEntries(current) {
    // Exact-text keys can be large. Bound only pristine, never-saved readings;
    // authored work, positions, pending writes, removals and recovery evidence
    // remain available for this page's lifetime, regardless of this limit.
    var empty = [];
    entries.forEach((entry, key) => {
      if (!entry.base && !entry.removed && !entry.recoveryPending && !entry.problem &&
          (entry.status === 'ready' || entry.status === 'session-only') &&
          !entry.dirty.size && !entry.recoveryCopies.length && !hasWork(entry.draft) &&
          entry.draft.paragraph === undefined) empty.push(key);
    });
    var remaining = empty.length;
    for (var key of empty) {
      if (remaining <= maxEmptyEntries) break;
      if (key !== current) { entries.delete(key); remaining--; }
    }
  }
  function entryFor(scope) {
    var key = memoryKey(scope), entry = entries.get(key);
    if (!entry) {
      var loaded = scope.learner ? read() : { rows: {} };
      var row = loaded.rows[keyOf(scope)];
      if (!matching(row, scope)) row = null;
      entry = { scope: { ...scope }, draft: copy(row) || { responses: {} }, base: copy(row), dirty: new Set(), revision: 0, generation: 0, recoveryCopies: [],
        status: !scope.learner ? 'session-only' : problemFor(loaded, scope) ? 'failed' : row ? 'saved' : 'ready', reason: problemFor(loaded, scope), problem: loaded.problem };
      entries.set(key, entry);
    }
    // Map insertion order is the recency order for the disposable entries.
    entries.delete(key); entries.set(key, entry);
    trimEmptyEntries(key);
    return entry;
  }
  function reconcile(entry, remote) {
    var base = flatten(entry.base), local = flatten(entry.draft), latest = flatten(remote), conflict = false;
    // Do not silently resurrect a save removed by another tab/profile action.
    if (entry.base && !remote) {
      if (hasWork(entry.base)) return false;
      // Position-only records may have been evicted by our bounded cache.
      // They must not prevent a later explicit answer/bookmark from saving.
      entry.base = null; base = {};
    }
    entry.dirty.forEach(key => {
      // Position is a last-interaction hint; authored answers/bookmarks conflict.
      if (key !== 'position' && !equal(latest[key], base[key]) && !equal(latest[key], local[key])) conflict = true;
      if (local[key] === undefined) delete latest[key]; else latest[key] = local[key];
    });
    // Adopt the observed baseline for untouched fields, retaining the original
    // baseline of dirty fields until they commit or their conflict is resolved.
    if (remote) {
      var nextBase = flatten(remote);
      entry.dirty.forEach(key => { if (base[key] === undefined) delete nextBase[key]; else nextBase[key] = base[key]; });
      entry.base = expand(nextBase, { at: remote.at, revision: remote.revision, sourceText: remote.sourceText, sourceCheck: remote.sourceCheck });
    }
    entry.draft = expand(latest, { at: entry.dirty.size ? entry.draft.at : remote && remote.at, sourceCheck: textCheck(String(entry.scope.text || '')) });
    return !conflict;
  }
  function load(scope) {
    var entry = entryFor(scope), loaded = scope.learner ? read() : { rows: {} };
    var own = loaded.rows[keyOf(scope)];
    if (scope.learner) {
      if (problemFor(loaded, scope)) fail(entry, problemFor(loaded, scope), loaded.problem);
      else if (own && !matching(own, scope)) fail(entry, 'version-conflict');
      else if (!reconcile(entry, own)) fail(entry, 'conflict');
      else if (!entry.dirty.size) { entry.base = copy(own) || null; entry.status = own ? 'saved' : 'ready'; entry.reason = null; entry.problem = null; }
    }
    var prefix = [scope.learner || '', scope.itemId, ''].join('|');
    var revised = !own && Object.keys(loaded.rows).some(key => key.startsWith(prefix) && (hasWork(loaded.rows[key]) || loaded.rows[key].paragraph > 0));
    entries.forEach(other => { if (other !== entry && other.scope.learner === scope.learner && other.scope.itemId === scope.itemId && (hasWork(other.draft) || other.draft.paragraph > 0)) revised = revised || !own; });
    if (own && !matching(own, scope)) revised = true;
    return { ...result(entry), revised };
  }
  function accept(entry, patch) {
    var flat = flatten(entry.draft);
    if (patch.paragraph !== undefined || patch.resume !== undefined) {
      flat.position = { ...(flat.position || { paragraph: 0, snippet: '', resume: false }), ...patch };
      delete flat.position.responses; delete flat.position.bookmark;
      entry.dirty.add('position');
    }
    if (patch.bookmark !== undefined) { flat.bookmark = copy(patch.bookmark); entry.dirty.add('bookmark'); }
    Object.keys(patch.responses || {}).forEach(section => fields.forEach(field => {
      if (typeof patch.responses[section][field] === 'string') { var key = section + ':' + field; flat[key] = patch.responses[section][field]; entry.dirty.add(key); }
    }));
    entry.draft = expand(flat, { at: now(), sourceCheck: textCheck(String(entry.scope.text || '')) });
    entry.revision++;
  }
  function commit(entry) {
    var loaded = read(), scope = entry.scope, key = keyOf(scope), remote = loaded.rows[key];
    if (problemFor(loaded, scope)) return fail(entry, problemFor(loaded, scope), loaded.problem);
    if (remote && !matching(remote, scope)) return fail(entry, 'version-conflict');
    if (!reconcile(entry, remote)) return fail(entry, 'conflict');
    for (var section of Object.keys(entry.draft.responses)) {
      for (var field of fields) {
        var length = (entry.draft.responses[section][field] || '').length;
        if (length > maxAnswerChars) return fail(entry, 'too-large', { kind: 'answer-size', section, field, length, limit: maxAnswerChars });
      }
    }
    var next = { ...entry.draft, at: now(), revision: (remote && remote.revision || 0) + 1 };
    delete next.sourceText;
    // A place alone needs no version check: Continue compares the paragraph text.
    if (!hasWork(next)) delete next.sourceCheck;
    var all = { ...loaded.all, [key]: next }, keys = Object.keys(all);
    // Make room oldest first: places, then answers and bookmarks no one has
    // touched for staleWorkMs. Recent work is never removed to make room.
    var age = other => loaded.rows[other] ? loaded.rows[other].at || 0 : 0;
    var keep = other => other === key || !!loaded.damaged[other];
    var removable = keys.filter(other => !keep(other) && !hasWork(loaded.rows[other])).sort((a, b) => age(a) - age(b))
      .concat(keys.filter(other => !keep(other) && hasWork(loaded.rows[other]) && typeof loaded.rows[other].at === 'number' && now() - age(other) >= staleWorkMs).sort((a, b) => age(a) - age(b)));
    while (keys.length > maxRecords && removable.length) { var old = removable.shift(); delete all[old]; keys = Object.keys(all); }
    // Blocked by others' work, not this reader's: say so (the fix differs).
    var crowd = () => { var mine = keys.filter(other => other !== key && other.startsWith((scope.learner || '') + '|')).length; return { kind: 'store-crowded', own: mine, others: keys.length - 1 - mine }; };
    if (keys.length > maxRecords) return fail(entry, 'capacity', crowd());
    try {
      var serialized = JSON.stringify(all);
      while (serialized.length > maxChars && removable.length) { delete all[removable.shift()]; keys = Object.keys(all); serialized = JSON.stringify(all); }
      if (serialized.length > maxChars) return fail(entry, 'too-large', { ...crowd(), kind: 'store-size', length: serialized.length, limit: maxChars });
      loaded.storage.setItem(storageKey, serialized);
      entry.base = copy(next); entry.draft = copy(next); entry.dirty.clear(); entry.status = 'saved'; entry.reason = null; entry.problem = null;
      return result(entry);
    } catch (error) { return fail(entry, error && error.name === 'QuotaExceededError' ? 'quota' : 'denied'); }
  }
  function save(scope, patch, saveOptions) {
    var entry = entryFor(scope);
    // Removing a reading is intentional. Scroll/retry must not recreate it.
    if (entry.removed && !patch?.responses && !patch?.bookmark) return Promise.resolve(result(entry));
    entry.removed = false;
    accept(entry, patch || {});
    if (!scope.learner) { entry.status = 'session-only'; entry.reason = 'anonymous'; return Promise.resolve(result(entry)); }
    // Restoring a recovery copy is a page-memory action. Scroll or typing must
    // not silently authorize writing that restored draft to durable storage.
    if (entry.recoveryPending && !saveOptions?.confirmRecovery) return Promise.resolve(fail(entry, 'recovered-draft'));
    entry.recoveryPending = false;
    entry.status = 'saving'; entry.reason = null; entry.problem = null; syncGuard();
    try {
      var locks = options.getLocks && options.getLocks();
      // localStorage read/modify/write is not atomic. Refuse an unsafe fallback.
      if (!locks || typeof locks.request !== 'function') return Promise.resolve(fail(entry, 'coordination-unavailable'));
      var generation = entry.generation;
      return Promise.resolve(locks.request(storageKey, () => entry.generation === generation ? commit(entry) : result(entry)))
        .catch(() => entry.generation === generation ? fail(entry, 'unavailable') : result(entry));
    } catch (_) { return Promise.resolve(fail(entry, 'unavailable')); }
  }
  function review(scope) {
    if (!scope.learner) return null;
    var entry = entryFor(scope), loaded = read(), saved = loaded.rows[keyOf(scope)] || null;
    if (problemFor(loaded, scope)) { fail(entry, problemFor(loaded, scope), loaded.problem); return null; }
    if (saved && !matching(saved, scope)) { fail(entry, 'version-conflict'); return null; }
    reconcile(entry, saved);
    return { scopeKey: memoryKey(scope), token: authoredToken(saved), draftToken: authoredToken(entry.draft), draftRevision: entry.revision,
      local: copy(entry.draft), saved: copy(saved) };
  }
  function retainCopy(entry, place, source) {
    if (!hasWork(place)) return;
    // These are recovery copies for this exact learner/version and this page
    // only. Never serialize them into the shared durable store.
    var snapshot = { responses: copy(place.responses || {}), bookmark: copy(place.bookmark) || null };
    if (!entry.recoveryCopies.some(previous => previous.source === source && equal(previous.place, snapshot))) {
      entry.recoveryCopies.push({ source, place: snapshot });
    }
  }
  function resolve(scope, reviewed, choice) {
    var entry = entryFor(scope);
    if (!scope.learner || !reviewed || reviewed.scopeKey !== memoryKey(scope) || !['local', 'saved'].includes(choice)) {
      return Promise.resolve(fail(entry, 'review-changed'));
    }
    try {
      var locks = options.getLocks && options.getLocks();
      if (!locks || typeof locks.request !== 'function') return Promise.resolve(fail(entry, 'coordination-unavailable'));
      return Promise.resolve(locks.request(storageKey, function () {
        var loaded = read(), saved = loaded.rows[keyOf(scope)] || null;
        if (problemFor(loaded, scope)) return fail(entry, problemFor(loaded, scope), loaded.problem);
        if (saved && !matching(saved, scope)) return fail(entry, 'version-conflict');
        // Compare the reviewed snapshot inside the same lock as the write.
        // A new remote edit or newly typed local text requires another review.
        if (reviewed.token !== authoredToken(saved) || reviewed.draftToken !== authoredToken(entry.draft)) return fail(entry, 'review-changed');
        // Earlier queued autosaves must not recreate work explicitly discarded
        // by this choice, including a removed record with a pending scroll save.
        entry.generation++;
        entry.recoveryPending = false;
        if (choice === 'saved') {
          retainCopy(entry, entry.draft, 'local');
          entry.base = copy(saved); entry.draft = copy(saved) || { responses: {} };
          entry.removed = !saved;
          entry.dirty.clear(); entry.revision++; entry.status = saved ? 'saved' : 'ready'; entry.reason = null; entry.problem = null;
          return result(entry);
        }
        retainCopy(entry, saved, 'saved');
        entry.removed = false;
        entry.base = copy(saved);
        entry.dirty = new Set(Object.keys(flatten(entry.draft)));
        entry.revision++;
        return commit(entry);
      })).catch(() => fail(entry, 'unavailable'));
    } catch (_) { return Promise.resolve(fail(entry, 'unavailable')); }
  }
  function inspectSaved(scope) {
    if (!scope.learner) return null;
    var entry = entryFor(scope);
    try {
      var raw = options.getStorage().getItem(storageKey), all = raw == null ? {} : JSON.parse(raw);
      if (!object(all)) { fail(entry, 'corrupt-store'); return null; }
      var key = keyOf(scope);
      if (!Object.prototype.hasOwnProperty.call(all, key)) return null;
      var original = all[key], checked = normalize(original);
      if (object(original) && !matching(original, scope)) { fail(entry, 'version-conflict'); return null; }
      return { scopeKey: memoryKey(scope), token: JSON.stringify(original), draftToken: authoredToken(entry.draft),
        place: checked.row, corrupt: checked.bad, characters: JSON.stringify(original).length };
    } catch (error) { fail(entry, error?.name === 'SyntaxError' ? 'corrupt-store' : 'denied'); return null; }
  }
  function reviewRecovery(scope, index) {
    var entry = entryFor(scope), selected = Number.isSafeInteger(index) && entry.recoveryCopies[index];
    if (!selected) return null;
    return { scopeKey: memoryKey(scope), index, token: JSON.stringify(selected), draftToken: authoredToken(entry.draft),
      local: copy(entry.draft), recovered: copy(selected.place), rawRow: selected.rawRow || null, canRestore: hasWork(selected.place) };
  }
  function changeRecovery(scope, reviewed, action) {
    var entry = entryFor(scope), selected = reviewed && entry.recoveryCopies[reviewed.index];
    if (!reviewed || reviewed.scopeKey !== memoryKey(scope) || !selected || JSON.stringify(selected) !== reviewed.token || !['restore', 'remove'].includes(action)) return fail(entry, 'recovery-changed');
    if (action === 'remove') {
      entry.recoveryCopies.splice(reviewed.index, 1);
      if (!entry.dirty.size && ['recovery-changed', 'recovery-empty'].includes(entry.reason)) return load(scope);
      return result(entry);
    }
    if (reviewed.draftToken !== authoredToken(entry.draft)) return fail(entry, 'recovery-changed');
    var checked = normalize(selected.place);
    if (checked.bad || !hasWork(checked.row)) return fail(entry, 'recovery-empty');
    var before = flatten(entry.draft);
    if (authoredToken(entry.draft) !== authoredToken(checked.row)) retainCopy(entry, entry.draft, 'local');
    entry.draft = { ...entry.draft, responses: copy(checked.row.responses), bookmark: copy(checked.row.bookmark) || null, at: now() };
    var after = flatten(entry.draft);
    [...new Set([...Object.keys(before), ...Object.keys(after)])].forEach(key => { if (key !== 'position') entry.dirty.add(key); });
    // Old queued saves may finish after the review. They cannot publish this
    // restored draft without its explicit save confirmation.
    entry.generation++; entry.revision++; entry.removed = false;
    entry.recoveryPending = !!scope.learner; entry.problem = null;
    entry.status = scope.learner ? 'failed' : 'session-only'; entry.reason = scope.learner ? 'recovered-draft' : 'anonymous';
    return result(entry);
  }
  function manageSaved(scope, reviewed, action) {
    var entry = entryFor(scope);
    if (!scope.learner || !reviewed || reviewed.scopeKey !== memoryKey(scope) || !['remove', 'repair'].includes(action)) return Promise.resolve(fail(entry, 'review-changed'));
    try {
      var locks = options.getLocks && options.getLocks();
      if (!locks || typeof locks.request !== 'function') return Promise.resolve(fail(entry, 'coordination-unavailable'));
      return Promise.resolve(locks.request(storageKey, function () {
        var fresh = inspectSaved(scope);
        if (!fresh || fresh.token !== reviewed.token || fresh.draftToken !== reviewed.draftToken) return fail(entry, 'review-changed');
        var storage = options.getStorage(), all = JSON.parse(storage.getItem(storageKey)), key = keyOf(scope);
        // The second read also protects against a legacy writer not using locks.
        if (!object(all) || JSON.stringify(all[key]) !== reviewed.token) return fail(entry, 'review-changed');
        var next = fresh.place || { responses: {} };
        if (action === 'remove') delete all[key];
        else {
          if (!fresh.corrupt) return fail(entry, 'review-changed');
          next = { ...next, sourceCheck: textCheck(String(scope.text || '')), revision: (next.revision || 0) + 1, at: now() };
          delete next.sourceText;
          all[key] = next;
        }
        // Removal may reduce an already oversized store. Do not forbid recovery.
        var serialized = JSON.stringify(all);
        if (action === 'repair' && serialized.length > maxChars) return fail(entry, 'too-large', { kind: 'store-size', length: serialized.length, limit: maxChars });
        storage.setItem(storageKey, serialized);
        entry.generation++;
        if (action === 'remove') retainCopy(entry, entry.draft, 'local');
        entry.recoveryCopies.push({ source: 'saved', place: copy(fresh.place) || { responses: {} }, rawRow: fresh.token });
        if (action === 'remove') {
          entry.base = null; entry.draft = { responses: {} }; entry.dirty.clear(); entry.removed = true;
          entry.recoveryPending = false;
          entry.status = 'ready'; entry.reason = null;
        } else {
          entry.base = copy(next);
          if (!entry.dirty.size) entry.draft = copy(next);
          entry.status = entry.dirty.size ? 'failed' : 'saved'; entry.reason = entry.recoveryPending ? 'recovered-draft' : entry.dirty.size ? 'retry-needed' : null;
        }
        entry.problem = null; entry.revision++;
        return result(entry);
      })).catch(error => fail(entry, error?.name === 'QuotaExceededError' ? 'quota' : 'unavailable'));
    } catch (_) { return Promise.resolve(fail(entry, 'unavailable')); }
  }
  return { key: storageKey, load, save, review, resolve, reviewRecovery, changeRecovery, inspectSaved, manageSaved, watchPage, hasUnsavedWork, hasSessionWork, exportSession, forgetAnonymous, peek: scope => result(entryFor(scope)) };
}
