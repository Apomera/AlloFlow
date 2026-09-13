/* Local-only, account-scoped save slots for Solo Concept Quest. No network writes. */
(function(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.AlloModules = root.AlloModules || {}; root.AlloModules.ConceptQuestSoloStorage = api; }
})(typeof window !== 'undefined' ? window : null, function() {
  'use strict';
  var VERSION = 1, TTL_MS = 30 * 24 * 60 * 60 * 1000, MAX_CHARS = 8 * 1024 * 1024;
  var ROLES = ['analyst', 'explainer', 'connector', 'investigator'];
  var ABILITIES = ['analyze', 'explain', 'connect', 'question'];
  var STATUSES = ['correct','partially-correct','incorrect','self-reviewed'];
  var PHASES = ['explore', 'battle', 'complete', 'defeat'];
  var dangerous = ['__proto__', 'prototype', 'constructor'];
  var own = function(value, key) { return Object.prototype.hasOwnProperty.call(value, key); };
  var plain = function(value) { return !!value && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null); };
  var integer = function(value, min, max) { return Number.isSafeInteger(value) && value >= min && value <= max; };
  function reject(message) { throw Error(message); }
  function requireValue(ok, message) { if (!ok) reject(message); }
  function boundedText(value, limit, empty) { return typeof value === 'string' && value.length <= limit && (empty || value.trim().length > 0); }
  function identifier(value) { return boundedText(value, 160) && /^[A-Za-z0-9_-]+$/.test(value) && dangerous.indexOf(value) < 0; }

  // Synchronous SHA-256 keeps the read/compare/write sequence in one JS task.
  // The digest scopes exact canonical source content without storing a second copy.
  function digest(text) {
    var bytes = new TextEncoder().encode(text), length = bytes.length;
    var total = Math.ceil((length + 9) / 64) * 64, data = new Uint8Array(total);
    data.set(bytes); data[length] = 128;
    var view = new DataView(data.buffer), bitLength = length * 8;
    view.setUint32(total - 8, Math.floor(bitLength / 4294967296)); view.setUint32(total - 4, bitLength >>> 0);
    var constants = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    var hash = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19], words = new Int32Array(64);
    var rotate = function(value, bits) { return (value >>> bits) | (value << (32 - bits)); };
    for (var offset = 0; offset < total; offset += 64) {
      for (var index = 0; index < 16; index++) words[index] = view.getInt32(offset + index * 4);
      for (var next = 16; next < 64; next++) { var x = words[next - 15], y = words[next - 2]; words[next] = (words[next - 16] + (rotate(x,7)^rotate(x,18)^(x>>>3)) + words[next - 7] + (rotate(y,17)^rotate(y,19)^(y>>>10))) | 0; }
      var a=hash[0],b=hash[1],c=hash[2],d=hash[3],e=hash[4],f=hash[5],g=hash[6],h=hash[7];
      for (var round = 0; round < 64; round++) { var t1 = (h + (rotate(e,6)^rotate(e,11)^rotate(e,25)) + ((e&f)^(~e&g)) + constants[round] + words[round])|0; var t2 = ((rotate(a,2)^rotate(a,13)^rotate(a,22)) + ((a&b)^(a&c)^(b&c)))|0; h=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0; }
      hash=[(hash[0]+a)|0,(hash[1]+b)|0,(hash[2]+c)|0,(hash[3]+d)|0,(hash[4]+e)|0,(hash[5]+f)|0,(hash[6]+g)|0,(hash[7]+h)|0];
    }
    return hash.map(function(value) { return (value >>> 0).toString(16).padStart(8, '0'); }).join('');
  }
  function cleanJson(value, budget, depth) {
    budget = budget || { nodes: 0, seen: new Set() }; depth = depth || 0;
    requireValue(++budget.nodes <= 1000000 && depth <= 40, 'Saved data is too complex.');
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'string') { requireValue(value.length <= MAX_CHARS, 'Saved text is too large.'); return value; }
    if (typeof value === 'number') { requireValue(Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER, 'Saved data contains an invalid number.'); return value; }
    requireValue(Array.isArray(value) || plain(value), 'Saved data must contain plain JSON values.');
    requireValue(!budget.seen.has(value), 'Saved data contains a cycle.'); budget.seen.add(value);
    var output;
    if (Array.isArray(value)) {
      requireValue(value.length <= 100000, 'Saved list is too large.');
      output = value.map(function(item) { return cleanJson(item, budget, depth + 1); });
    } else {
      var keys = Object.keys(value).sort(); requireValue(keys.length <= 100000, 'Saved object is too large.'); output = {};
      keys.forEach(function(key) { requireValue(dangerous.indexOf(key) < 0 && key.length <= 500, 'Saved data contains an unsafe field.'); if (value[key] !== undefined) output[key] = cleanJson(value[key], budget, depth + 1); });
    }
    budget.seen.delete(value); return output;
  }
  function canonical(value) { return JSON.stringify(cleanJson(value)); }
  function sourceFingerprint(context) {
    var content = context && context.generatedContent;
    requireValue(plain(content) && plain(content.data) && Array.isArray(content.data.questions), 'Assessment source is unavailable.');
    return digest(canonical({ type: content.type || 'quiz', title: content.title || '', data: content.data }));
  }
  function identity(context) {
    requireValue(context && boundedText(context.userId, 512) && boundedText(context.appId, 512), 'A learner and app identity are required to save this adventure.');
    var content = context.generatedContent;
    requireValue(plain(content), 'Assessment source is unavailable.');
    var rawId = content.id !== undefined && content.id !== null ? content.id : content.resourceId;
    requireValue(rawId == null || typeof rawId === 'string' || typeof rawId === 'number' && Number.isFinite(rawId), 'The resource identity is invalid.');
    var resourceId = content.id !== undefined && content.id !== null ? String(content.id) : content.resourceId !== undefined && content.resourceId !== null ? String(content.resourceId) : '';
    requireValue(resourceId.length <= 1024, 'The resource identity is too large.');
    if (!resourceId) resourceId = 'source:' + sourceFingerprint(context);
    return { appId: context.appId, userId: context.userId, resourceId: resourceId };
  }
  function keyFor(context) { return 'allo-concept-quest-solo:v1:' + digest(canonical(identity(context))); }
  function safePick(value, keys) { var output = {}; keys.forEach(function(key) { if (own(value, key)) output[key] = value[key]; }); return output; }
  function validateResponse(value) {
    if (value === null || value === undefined) return null;
    requireValue(plain(value), 'The unfinished response is invalid.');
    var output = safePick(value, ['answerIndex','selectedIndices','text','unit','verifyAnswer','wrongIndex','principleAnswer','pairIndex','partnerAnswer','evidenceIndex','guideRevealed','selfReview','abilityId']);
    ['answerIndex','wrongIndex','pairIndex','evidenceIndex'].forEach(function(key) { if (own(output,key)) requireValue(output[key] === null || integer(output[key],0,100000), 'The unfinished response has an invalid index.'); });
    ['text','unit','principleAnswer','partnerAnswer'].forEach(function(key) { if (own(output,key)) requireValue(output[key] === null || boundedText(output[key], key === 'text' ? 100000 : 20000, true), 'The unfinished response has invalid text.'); });
    if (own(output,'selectedIndices')) requireValue(Array.isArray(output.selectedIndices) && output.selectedIndices.every(function(index) { return integer(index,0,100000); }) && new Set(output.selectedIndices).size === output.selectedIndices.length, 'The unfinished selections are invalid.');
    if (own(output,'verifyAnswer')) requireValue(output.verifyAnswer === null || output.verifyAnswer === '' || ['yes','no'].indexOf(output.verifyAnswer) >= 0, 'The unfinished verification is invalid.');
    if (own(output,'guideRevealed')) requireValue(typeof output.guideRevealed === 'boolean', 'The guide state is invalid.');
    if (own(output,'selfReview')) requireValue(output.selfReview === '' || ['understood','needs-practice'].indexOf(output.selfReview) >= 0, 'The self-review state is invalid.');
    if (own(output,'abilityId')) requireValue(['analyze','explain','connect','question'].indexOf(output.abilityId) >= 0, 'The selected ability is invalid.');
    return output;
  }
  function validateQuest(value, context) {
    requireValue(plain(value), 'The saved adventure is missing.');
    var quest = safePick(value, ['version','actionSchema','sessionId','turnKey','excludedQuestions','title','objective','localizedStrings','turn','phase','currentRoomId','rooms','visited','party','inventory','sigils','sigilsRequired','activeEvent','gmUndo','gmHistory','log','abilities','roles','supports','lastRound','roundHistory','solo']);
    requireValue(quest.version === 2 && identifier(quest.sessionId) && integer(quest.turn,1,100000000) && PHASES.indexOf(quest.phase) >= 0, 'The saved adventure version or turn is invalid.');
    requireValue(boundedText(quest.title,10000,true) && boundedText(quest.objective,10000,true), 'The saved adventure text is invalid.');
    requireValue(Array.isArray(quest.rooms) && quest.rooms.length >= 2 && quest.rooms.length <= 10000, 'The saved map is invalid.');
    var ids = new Set();
    quest.rooms.forEach(function(room) { requireValue(plain(room) && identifier(room.id) && !ids.has(room.id), 'The saved map has an invalid location.'); ids.add(room.id); });
    quest.rooms.forEach(function(room) {
      requireValue(['start','battle','puzzle','treasure','boss'].indexOf(room.kind) >= 0 && Array.isArray(room.neighbors) && room.neighbors.every(function(id) { return ids.has(id); }) && new Set(room.neighbors).size === room.neighbors.length, 'The saved map has an invalid path.');
      if (room.enemy !== null && room.enemy !== undefined) requireValue(plain(room.enemy) && integer(room.enemy.maxHp,1,1000000) && integer(room.enemy.hp,0,room.enemy.maxHp) && integer(room.enemy.attack,0,100000), 'A saved encounter has invalid health.');
      if (room.challenges !== undefined) requireValue(Array.isArray(room.challenges) && integer(room.challengeIndex,0,Math.max(0,room.challenges.length-1)), 'A saved encounter has an invalid challenge.');
    });
    requireValue(ids.has(quest.currentRoomId), 'The saved current location is missing.');
    requireValue(Array.isArray(quest.visited) && quest.visited.every(function(id) { return ids.has(id); }) && quest.visited.indexOf(quest.currentRoomId) >= 0, 'The visited map is invalid.');
    requireValue(plain(quest.party) && integer(quest.party.maxHp,1,1000000) && integer(quest.party.hp,0,quest.party.maxHp) && integer(quest.party.shield,0,100000) && integer(quest.party.xp,0,1000000000), 'The saved adventurer has invalid health or experience.');
    requireValue(Array.isArray(quest.inventory) && quest.inventory.length <= 1000 && quest.inventory.every(function(item) { return plain(item) && identifier(item.id) && plain(item.effect) && ['heal','shield','clue'].indexOf(item.effect.type) >= 0 && integer(item.effect.amount,0,100000); }), 'The saved inventory is invalid.');
    requireValue(Array.isArray(quest.sigils) && quest.sigils.length <= quest.rooms.length && quest.sigils.every(function(sigil) { return boundedText(sigil,1000); }) && new Set(quest.sigils).size === quest.sigils.length && integer(quest.sigilsRequired,0,quest.rooms.length), 'The saved concept sigils are invalid.');
    ['log','roundHistory'].forEach(function(key) { requireValue(Array.isArray(quest[key]), 'The saved adventure history is invalid.'); });
    var current = quest.rooms.find(function(room) { return room.id === quest.currentRoomId; });
    if (quest.phase === 'battle') requireValue(current.enemy && current.enemy.hp > 0 && quest.party.hp > 0 && plain(current.challenge), 'The saved encounter cannot continue.');
    if (quest.phase === 'complete') requireValue(current.kind === 'boss' && current.enemy && current.enemy.hp === 0 && quest.party.hp > 0, 'The saved completion is invalid.');
    if (quest.phase === 'defeat') requireValue(quest.party.hp === 0, 'The saved defeat is invalid.');
    requireValue(plain(quest.solo), 'The saved solo assessment state is missing.');
    if (quest.solo !== undefined) {
      var solo = quest.solo, sourceCount = context.generatedContent.data.questions.length;
      requireValue(plain(solo) && solo.version === 1 && Array.isArray(solo.bank) && solo.bank.length > 0 && solo.bank.length <= sourceCount, 'The saved assessment bank is invalid.');
      var sourceIds = new Set();
      var bankBuilder = typeof window !== 'undefined' && window.AlloModules?.ConceptQuestSoloEngine?.normalizeItems;
      if (typeof bankBuilder === 'function') requireValue(canonical(solo.bank) === canonical(bankBuilder(context.generatedContent)), 'The saved question bank does not match this assessment.');
      solo.bank.forEach(function(item) { requireValue(plain(item) && integer(item.sourceIndex,0,sourceCount-1) && !sourceIds.has(item.sourceIndex) && context.generatedContent.data.questions[item.sourceIndex] != null, 'The saved assessment has an invalid source reference.'); sourceIds.add(item.sourceIndex);
        var original = context.generatedContent.data.questions[item.sourceIndex];
        if (typeof bankBuilder !== 'function' && plain(original)) Object.keys(original).forEach(function(key) { if (['type','itemType','id','sourceIndex','prompt','options','correctIndex','selfReviewRequired','items','pairs','answerOptions','evidenceOptions','candidatePartners','concept','explanation','imageUrl','imageAltText','optionImageUrls','optionImageAltTexts','soloPartialCredit','reviewReason'].indexOf(key) < 0 && original[key] !== undefined) requireValue(canonical(item[key]) === canonical(original[key]), 'A saved question no longer matches its source.'); });
      });
      requireValue(integer(solo.cursor,0,solo.bank.length) && integer(solo.currentIndex,0,solo.bank.length-1) && integer(solo.repeatCursor,0,100000000), 'The saved assessment position is invalid.');
      requireValue(plain(solo.attempts) && Array.isArray(solo.history), 'The saved learning history is invalid.');
      Object.keys(solo.attempts).forEach(function(key) { var entry = solo.attempts[key]; requireValue(/^\d+$/.test(key) && sourceIds.has(Number(key)) && plain(entry) && integer(entry.count,1,100000000) && (entry.firstCorrect === null || typeof entry.firstCorrect === 'boolean') && (entry.lastCorrect === null || typeof entry.lastCorrect === 'boolean') && STATUSES.indexOf(entry.firstStatus) >= 0 && STATUSES.indexOf(entry.status) >= 0, 'The saved attempt record is invalid.'); ['selfReview','firstSelfReview'].forEach(function(field) { if (own(entry,field)) requireValue(entry[field] === null || ['understood','needs-practice'].indexOf(entry[field]) >= 0, 'The saved self-review record is invalid.'); }); });
      solo.history.forEach(function(entry) { requireValue(plain(entry) && sourceIds.has(entry.sourceIndex) && ids.has(entry.roomId) && integer(entry.turn,1,quest.turn) && (entry.correct === null || typeof entry.correct === 'boolean') && typeof entry.gradable === 'boolean' && typeof entry.firstAttempt === 'boolean' && STATUSES.indexOf(entry.status) >= 0 && (entry.gradable ? typeof entry.score === 'number' && entry.score >= 0 && typeof entry.maxScore === 'number' && entry.maxScore >= entry.score : entry.score === null && entry.maxScore === null && entry.correct === null && entry.status === 'self-reviewed'), 'The saved learning history has an invalid reference.'); if (entry.response !== undefined) entry.response = validateResponse(entry.response); });
      requireValue(plain(current.challenge) && canonical(current.challenge) === canonical(solo.bank[solo.currentIndex]), 'The active question does not match the saved assessment position.');
    }
    return quest;
  }
  function validateGm(value) {
    if (value === null || value === undefined) return null;
    requireValue(plain(value) && value.version === 1, 'The saved game-master state is invalid.');
    var out=safePick(value,['version','scope','sceneKey','narrative','character','choices','memory','history','origin','feedback','evidence']);
    [['scope',200],['sceneKey',200],['narrative',900],['feedback',600],['evidence',300],['memory',1000]].forEach(function(pair) { if (out[pair[0]] === undefined && ['feedback','evidence','memory'].indexOf(pair[0]) >= 0) out[pair[0]]=''; requireValue(boundedText(out[pair[0]],pair[1],pair[0] !== 'narrative'), 'The saved game-master text is invalid.'); });
    requireValue(['ai','scripted'].indexOf(out.origin) >= 0, 'The saved narration origin is invalid.');
    if (out.character != null) { requireValue(plain(out.character) && boundedText(out.character.name,60,true) && boundedText(out.character.dialogue,500,true), 'The saved character is invalid.'); out.character=safePick(out.character,['name','dialogue']); } else out.character=null;
    requireValue(Array.isArray(out.choices) && out.choices.length <= 3 && out.choices.every(function(choice) { return plain(choice) && ['investigate','talk','explain'].indexOf(choice.intent) >= 0 && boundedText(choice.label,80) && boundedText(choice.prompt,240); }), 'The saved story choices are invalid.');
    out.choices=out.choices.map(function(choice,index) { return {id:'choice-'+(index+1),intent:choice.intent,label:choice.label,prompt:choice.prompt}; });
    requireValue(Array.isArray(out.history) && out.history.length <= 12 && out.history.every(function(entry) { return plain(entry) && ['player','gm'].indexOf(entry.role) >= 0 && boundedText(entry.text,900,true) && integer(entry.turn,0,100000000) && ['investigate','talk','explain','narrate'].indexOf(entry.intent) >= 0; }), 'The saved conversation history is invalid.');
    out.history=out.history.map(function(entry) { return safePick(entry,['role','text','turn','intent']); });
    return out;
  }
  function validate(snapshot, context) {
    try {
      identity(context); var fingerprint = sourceFingerprint(context);
      var data = cleanJson(snapshot);
      requireValue(plain(data) && data.version === VERSION && data.sourceFingerprint === fingerprint, 'This save belongs to a different assessment revision.');
      requireValue(integer(data.savedAt,1,Date.now()+5*60*1000), 'The saved date is invalid.');
      requireValue(ROLES.indexOf(data.roleId) >= 0 && typeof data.recapOpen === 'boolean' && typeof data.aiEnabled === 'boolean', 'The saved adventurer settings are invalid.');
      var abilityId = data.abilityId === undefined ? ABILITIES[ROLES.indexOf(data.roleId)] : data.abilityId;
      requireValue(ABILITIES.indexOf(abilityId) >= 0, 'The saved ability is invalid.');
      var normalized = { version: VERSION, sourceFingerprint: fingerprint, savedAt: data.savedAt, quest: validateQuest(data.quest,context), roleId: data.roleId, abilityId: abilityId, response: validateResponse(data.response), recapOpen: data.recapOpen, gmState: validateGm(data.gmState), aiEnabled: data.aiEnabled };
      requireValue(normalized.gmState === null || plain(normalized.gmState), 'The saved game-master state is invalid.');
      requireValue(!normalized.recapOpen || plain(normalized.quest.lastRound), 'The saved turn recap is missing.');
      requireValue(JSON.stringify(normalized).length <= MAX_CHARS, 'This adventure is too large to save in this browser.');
      return { valid: true, snapshot: normalized, errors: [] };
    } catch (error) { return { valid: false, errors: [error.message || 'The saved adventure is invalid.'] }; }
  }
  function failure(status, message, revision) { return { status: status, message: message, revision: revision === undefined ? null : revision }; }
  function getRaw(storage, context) { var key=keyFor(context); return { key: key, raw: storage.getItem(key) }; }
  function read(storage, context) {
    var raw = null, revision = null;
    try {
      var found=getRaw(storage,context); raw=found.raw;
      if (raw === null) return { status: 'empty', revision: null };
      requireValue(typeof raw === 'string', 'The saved adventure could not be read.'); revision=digest(raw);
      if (raw.length > MAX_CHARS) return failure('corrupt','This saved adventure is too large to restore. Start a new adventure to replace it.',revision);
      var envelope;
      try { envelope=JSON.parse(raw); } catch (_) { return failure('corrupt','This saved adventure could not be read. Start a new adventure to replace it.',revision); }
      try { if (!plain(envelope) || envelope.version !== VERSION || canonical(envelope.owner) !== canonical(identity(context)) || !plain(envelope.snapshot)) return failure('corrupt','This saved adventure does not match this learner and resource.',revision); } catch (_) { return failure('corrupt','This saved adventure does not match this learner and resource.',revision); }
      if (typeof envelope.snapshot.sourceFingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(envelope.snapshot.sourceFingerprint)) return failure('corrupt','The saved source identity is invalid.',revision);
      if (envelope.snapshot.sourceFingerprint !== sourceFingerprint(context)) return failure('stale','The assessment has changed since this adventure was saved. Start a new adventure to use the updated questions.',revision);
      var checked=validate(envelope.snapshot,context);
      if (!checked.valid) return failure('corrupt',checked.errors[0],revision);
      if (Date.now()-checked.snapshot.savedAt > TTL_MS) return failure('expired','This adventure was saved more than 30 days ago. Start a new adventure to replace it.',revision);
      return { status: 'saved', snapshot: checked.snapshot, revision: revision, savedAt: checked.snapshot.savedAt };
    } catch (_) { return failure('unavailable','Saved adventures are unavailable in this browser. Keep this adventure open to preserve your progress.',revision); }
  }
  function matchesRevision(raw, context) { return (raw === null ? null : digest(raw)) === (own(context,'expectedRevision') ? context.expectedRevision : null); }
  function save(storage, context, snapshot) {
    var found, previousRevision=null;
    try { found=getRaw(storage,context); previousRevision=found.raw===null?null:digest(found.raw); } catch (_) { return failure('unavailable','Your adventure could not be saved. Keep it open to preserve your progress.'); }
    if (!matchesRevision(found.raw,context)) return failure('conflict','The saved adventure changed in another tab. Reopen its latest save before continuing.',previousRevision);
    var candidate;
    try { var fingerprint=sourceFingerprint(context); requireValue(!snapshot?.sourceFingerprint || snapshot.sourceFingerprint === fingerprint, 'This adventure belongs to an earlier assessment revision.'); candidate=Object.assign({},snapshot,{version:VERSION,sourceFingerprint:fingerprint,savedAt:Date.now()}); } catch (error) { return failure('invalid',error.message,previousRevision); }
    var checked=validate(candidate,context);
    if (!checked.valid) return failure('invalid',checked.errors[0],previousRevision);
    try {
      var serialized=JSON.stringify({version:VERSION,owner:identity(context),snapshot:checked.snapshot});
      if (serialized.length > MAX_CHARS) return failure('invalid','This adventure is too large to save in this browser.',previousRevision);
      // Recheck immediately before writing; never silently replace a newer tab's save.
      var latest=storage.getItem(found.key);
      if (latest !== found.raw) return failure('conflict','The saved adventure changed in another tab. Reopen its latest save before continuing.',latest===null?null:digest(latest));
      storage.setItem(found.key,serialized);
      var after=storage.getItem(found.key);
      if (after !== serialized) return failure('conflict','Another tab changed the save while this adventure was saving. Reopen its latest save.',after===null?null:digest(after));
      return {status:'saved',snapshot:checked.snapshot,revision:digest(serialized),savedAt:checked.snapshot.savedAt};
    } catch (_) { return failure('unavailable','Your adventure could not be saved. Browser storage may be full or unavailable. Keep it open to preserve your progress.',previousRevision); }
  }
  function clear(storage, context) {
    try {
      var found=getRaw(storage,context), revision=found.raw===null?null:digest(found.raw);
      if (!matchesRevision(found.raw,context)) return failure('conflict','The saved adventure changed in another tab. Reopen its latest save before replacing it.',revision);
      var latest=storage.getItem(found.key);
      if (latest !== found.raw) return failure('conflict','The saved adventure changed in another tab. Reopen its latest save before replacing it.',latest===null?null:digest(latest));
      storage.removeItem(found.key);
      var after=storage.getItem(found.key);
      if (after !== null) return failure('conflict','Another tab saved an adventure while this save was being removed.',digest(after));
      return {status:'cleared',revision:null};
    } catch (_) { return failure('unavailable','The saved adventure could not be removed. Try again when browser storage is available.'); }
  }
  return {VERSION:VERSION,TTL_MS:TTL_MS,MAX_CHARS:MAX_CHARS,keyFor:keyFor,sourceFingerprint:sourceFingerprint,read:read,save:save,clear:clear,validate:validate};
});
