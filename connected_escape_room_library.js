import { prepareRoom, identity } from './connected_escape_room_engine.js';
export const ROOM_LIBRARY_LIMIT = 8;
const MAX_LIBRARY_CHARS = 250000;
const hashText = text => { let hash = 2166136261; for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619); return (hash >>> 0).toString(16); };
export const legacyRoomKey = source => 'allo-connected-room-v1:' + hashText(source);
export const libraryKey = (source, language) => 'allo-connected-library-v2:' + hashText(JSON.stringify([source, language]));
export const sameRoom = (a, b) => !!a && !!b && JSON.stringify(a) === JSON.stringify(b);
export function readLibrary(storage, source, language) {
  const empty = { version: 2, source, language, entries: [], selectedId: '' };
  const stored = storage.getItem(libraryKey(source, language));
  if (stored) {
    if (stored.length > MAX_LIBRARY_CHARS) throw Error('library-invalid');
    let raw; try { raw = JSON.parse(stored); } catch (_) { throw Error('library-invalid'); }
    if (raw?.version !== 2 || raw.source !== source || raw.language !== language || !Array.isArray(raw.entries) || raw.entries.length > ROOM_LIBRARY_LIMIT) throw Error('library-invalid');
    const ids = new Set();
    for (const entry of raw.entries) {
      if (!entry || typeof entry.id !== 'string' || !/^saved_[A-Za-z0-9_-]{1,100}$/.test(entry.id) || ids.has(entry.id) || !Number.isFinite(entry.savedAt) || entry.savedAt < 0) throw Error('library-invalid');
      let room; try { room = prepareRoom(entry.room, source); } catch (_) { throw Error('library-invalid'); }
      ids.add(entry.id); empty.entries.push({ id: entry.id, savedAt: entry.savedAt, room });
    }
    empty.selectedId = ids.has(raw.selectedId) ? raw.selectedId : empty.entries[0]?.id || '';
    return empty;
  }
  // Read the old single-room save without deleting it. Its migration is committed
  // only when a new library write succeeds, so a full disk cannot lose that room.
  const legacy = storage.getItem(legacyRoomKey(source));
  if (legacy && legacy.length < 40000) try {
    const candidate = JSON.parse(legacy);
    if (candidate?.language === language) { const room = prepareRoom(candidate.room, source), id = 'saved_legacy'; empty.entries = [{ id, savedAt: 0, room }]; empty.selectedId = id; }
  } catch (_) {}
  return empty;
}
function commit(storage, library) {
  const value = JSON.stringify(library);
  if (value.length > MAX_LIBRARY_CHARS) throw Error('library-full');
  storage.setItem(libraryKey(library.source, library.language), value);
  return library;
}
export function saveLibraryRoom(storage, source, language, rawRoom) {
  const room = prepareRoom(rawRoom, source), library = readLibrary(storage, source, language);
  const existing = library.entries.find(entry => sameRoom(entry.room, room));
  if (!existing && library.entries.length >= ROOM_LIBRARY_LIMIT) throw Error('library-full');
  const entry = { id: existing?.id || identity('saved'), savedAt: Date.now(), room };
  return commit(storage, { ...library, selectedId: entry.id, entries: [entry, ...library.entries.filter(e => e.id !== entry.id)] });
}
export function selectLibraryRoom(storage, source, language, id) {
  const library = readLibrary(storage, source, language);
  if (!library.entries.some(entry => entry.id === id)) throw Error('library-missing');
  return commit(storage, { ...library, selectedId: id });
}
export function removeLibraryRoom(storage, source, language, id) {
  const library = readLibrary(storage, source, language), entries = library.entries.filter(entry => entry.id !== id);
  return commit(storage, { ...library, entries, selectedId: entries.some(entry => entry.id === library.selectedId) ? library.selectedId : entries[0]?.id || '' });
}
