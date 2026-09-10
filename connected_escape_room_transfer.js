import { prepareRoom } from './connected_escape_room_engine.js';
export const ROOM_FILE_FORMAT = 'alloflow-connected-escape';
export const MAX_ROOM_FILE_BYTES = 200000;
const MAX_ROOM_FILE_CHARS = 60000;
const normalize = value => value.normalize('NFC').replace(/\s+/g, ' ').trim();
export function prepareRoomFile(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.format !== ROOM_FILE_FORMAT || raw.version !== 1) throw Error('room-file-format');
  if (typeof raw.source !== 'string' || raw.source.trim().length < 40 || raw.source.length > 12000 || typeof raw.language !== 'string' || !raw.language.trim() || raw.language.length > 80) throw Error('room-file-context');
  let room; try { room = prepareRoom(raw.room, raw.source); } catch (_) { throw Error('room-file-invalid'); }
  // Only lesson context and the validated puzzle specification travel with a file.
  return { format: ROOM_FILE_FORMAT, version: 1, language: raw.language.trim(), source: raw.source, room };
}
export function parseRoomFile(text) {
  if (typeof text !== 'string' || text.length > MAX_ROOM_FILE_CHARS) throw Error('room-file-size');
  let raw; try { raw = JSON.parse(text.replace(/^\uFEFF/, '')); } catch (_) { throw Error('room-file-format'); }
  return prepareRoomFile(raw);
}
export function exportRoomFile(room, source, language) {
  const pack = prepareRoomFile({ format: ROOM_FILE_FORMAT, version: 1, room, source, language });
  return JSON.stringify(pack);
}
export function roomFileCompatibility(pack, source, language) {
  if (normalize(pack.language).toLowerCase() !== normalize(language).toLowerCase()) return 'language';
  if (normalize(pack.source) !== normalize(source)) return 'lesson';
  return 'compatible';
}
export function roomFileName(title) {
  const stem = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
  return 'escape-room-' + (stem || 'export') + '.alloroom.json';
}
export function readRoomFile(file) {
  if (!file || typeof file.size !== 'number' || file.size > MAX_ROOM_FILE_BYTES) return Promise.reject(Error('room-file-size'));
  const text = typeof file.text === 'function' ? file.text() : new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(Error('room-file-read')); reader.readAsText(file); });
  return text.then(parseRoomFile);
}
