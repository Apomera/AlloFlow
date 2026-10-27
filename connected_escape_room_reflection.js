import { soloStorageKey } from './connected_escape_room_solo.js';
export const reflectionKey = (room, scope) => scope ? 'reflection:' + soloStorageKey(room, scope) : '';
export function readReflection(storage, room, scope) {
  const key = reflectionKey(room, scope);
  if (!key) return { text: '', status: 'preview' };
  if (!storage) return { text: '', status: 'unavailable' };
  try {
    const raw = storage?.getItem(key);
    if (!raw) return { text: '', status: 'empty' };
    const data = JSON.parse(raw);
    if (data.version !== 1 || typeof data.text !== 'string' || data.text.length > 4000) return { text: '', status: 'unavailable' };
    return { text: data.text, status: 'saved' };
  } catch (_) { return { text: '', status: 'unavailable' }; }
}
export function saveReflection(storage, room, scope, text) {
  const key = reflectionKey(room, scope);
  if (!key || !storage || typeof text !== 'string' || text.length > 4000) return false;
  try { storage.setItem(key, JSON.stringify({ version: 1, text })); return true; } catch (_) { return false; }
}
