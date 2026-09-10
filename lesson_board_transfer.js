import { prepareBoard } from './lesson_board_engine.js';
export const BOARD_FILE_FORMAT = 'alloflow-lesson-board';
export const MAX_BOARD_FILE_BYTES = 200000;
const MAX_BOARD_FILE_CHARS = 60000;
const normalize = value => value.normalize('NFC').replace(/\s+/g, ' ').trim();

export function prepareBoardFile(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.format !== BOARD_FILE_FORMAT || raw.version !== 1) throw Error('board-file-format');
  if (typeof raw.source !== 'string' || raw.source.trim().length < 40 || raw.source.length > 12000 || typeof raw.language !== 'string' || !raw.language.trim() || raw.language.length > 80) throw Error('board-file-context');
  let board; try { board = prepareBoard(raw.board, raw.source); } catch (_) { throw Error('board-file-invalid'); }
  // Transport only the validated lesson and game specification, never live data.
  return { format: BOARD_FILE_FORMAT, version: 1, source: raw.source, language: raw.language.trim(), board };
}
export function parseBoardFile(text) {
  if (typeof text !== 'string' || text.length > MAX_BOARD_FILE_CHARS) throw Error('board-file-size');
  let raw; try { raw = JSON.parse(text.replace(/^\uFEFF/, '')); } catch (_) { throw Error('board-file-format'); }
  return prepareBoardFile(raw);
}
export function exportBoardFile(board, source, language) {
  const result = JSON.stringify(prepareBoardFile({ format: BOARD_FILE_FORMAT, version: 1, board, source, language }));
  if (result.length > MAX_BOARD_FILE_CHARS) throw Error('board-file-size');
  return result;
}
export function boardFileCompatibility(pack, source, language) {
  return normalize(pack.source) === normalize(source) && normalize(pack.language).toLowerCase() === normalize(language).toLowerCase();
}
export function boardFileName(title) {
  const stem = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
  return 'lesson-board-' + (stem || 'export') + '.alloboard.json';
}
export async function readBoardFile(file) {
  if (!file || typeof file.size !== 'number' || !Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_BOARD_FILE_BYTES) return Promise.reject(Error('board-file-size'));
  const text = typeof file.text === 'function' ? file.text() : new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(Error('board-file-read')); reader.readAsText(file); });
  return text.then(parseBoardFile);
}
export function downloadBoardFile(board, source, language) {
  const text = exportBoardFile(board, source, language), blob = new Blob([text], { type: 'application/json' }), url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = boardFileName(board.title);
  try { document.body.appendChild(link); link.click(); } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
