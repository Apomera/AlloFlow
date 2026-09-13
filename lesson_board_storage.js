import {prepareReplay} from './lesson_board_replay.js';
import {prepareFinale} from './lesson_board_finale.js';
import * as engine from './lesson_board_engine.js';
import { prepareBoard, emptyRun, derive } from './lesson_board_engine.js';
export const fingerprint = value => { let hash = 2166136261; for (const c of value) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619); return (hash >>> 0).toString(36); };
export const libraryKey = (source, language) => 'allo-lesson-boards:' + fingerprint(language + ':' + source);
export function readLibrary(storage, source, language) {
  const raw = storage.getItem(libraryKey(source, language)); if (!raw) return [];
  if (raw.length > 160000) throw Error('Saved boards could not be read. Existing data has been kept.');
  try { const data = JSON.parse(raw); if (data.version !== 1 || data.source !== source || data.language !== language || !Array.isArray(data.boards) || data.boards.length > 4) throw Error(); return data.boards.map(board => prepareBoard(board, source)); } catch (_) { throw Error('Saved boards could not be read. Existing data has been kept.'); }
}
export function saveBoard(storage, source, language, board) {
  const valid = prepareBoard(board, source), boards = readLibrary(storage, source, language), json = JSON.stringify(valid), previous = boards.findIndex(b => JSON.stringify(b) === json);
  if (previous >= 0) boards.splice(previous, 1); else if (boards.length >= 4) throw Object.assign(Error('Four boards are already saved for this lesson. Replace a saved copy or remove one before saving another.'), { code: 'board-library-full' });
  boards.unshift(valid); storage.setItem(libraryKey(source, language), JSON.stringify({ version: 1, source, language, boards })); return boards;
}
export function removeBoard(storage, source, language, index, expectedBoard) { const boards = readLibrary(storage, source, language); if (!Number.isInteger(index) || index < 0 || index >= boards.length) throw Error('That saved board is no longer available.'); if (expectedBoard && JSON.stringify(boards[index]) !== JSON.stringify(prepareBoard(expectedBoard, source))) throw Error('The saved library changed in another tab. Reopen it before removing a board.'); boards.splice(index, 1); storage.setItem(libraryKey(source, language), JSON.stringify({ version: 1, source, language, boards })); return boards; }
export function restoreSolo(board, raw) {
  if (!raw) return emptyRun();
  try {
    if (raw.length > 200000) throw Error();
    const data = JSON.parse(raw);
    if (![1, 2].includes(data.version) || data.board !== JSON.stringify(board)) throw Error();
    return engine.restoreRun(board, data.run);
  } catch (_) { throw Error('Your saved solo game could not be restored. Start a new local game to replace that save.'); }
}

export function replaceSavedBoard(storage, source, language, expectedBoard, replacement) {
  const boards = readLibrary(storage, source, language), expected = JSON.stringify(prepareBoard(expectedBoard, source)), valid = prepareBoard(replacement, source), next = JSON.stringify(valid);
  const index = boards.findIndex(board => JSON.stringify(board) === expected);
  if (index < 0) throw Error('The saved library changed in another tab. Reopen it before replacing a board.');
  const updated = [valid, ...boards.filter((board, i) => i !== index && JSON.stringify(board) !== next)];
  storage.setItem(libraryKey(source, language), JSON.stringify({ version: 1, source, language, boards: updated }));
  return updated;
}
// The old key remains readable only from this tab for one-way migration.
export const legacySoloStorageKey = (board, appId, uid = 'local') => 'allo-board-solo:' + appId + ':' + uid + ':' + fingerprint(JSON.stringify(board));
const soloIdentity = (appId, uid) => ({ appId: String(appId || 'alloflow-local'), uid: String(uid || 'local') });
export const soloStorageKey = (board, appId, uid) => {
  const identity = soloIdentity(appId, uid);
  return 'allo-board-solo-v2:' + encodeURIComponent(identity.appId) + ':' + encodeURIComponent(identity.uid) + ':' + fingerprint(JSON.stringify(board));
};
export function soloWorkspace(board, run, value) {
  const selected = [...board.locations, ...board.projects].some(item => item.id === value?.selected) ? value.selected : board.starts[0];
  const result = { selected, view: ['list','focus'].includes(value?.view) ? value.view : 'board', drafts: {} };
  const replay=prepareReplay(board,run,value?.replay);if(replay)result.replay=replay;
  const finale=prepareFinale(board,run,value?.finale);if(finale)result.finale=finale;
  if (value?.showImages === false) result.showImages = false;
  if (['active','off'].includes(value?.guideMode)) result.guideMode = value.guideMode;
  if (board.projects.some(project => project.id === value?.projectGoal)) result.projectGoal = value.projectGoal;
  for (const node of board.locations) {
    const round = engine.stepOf(run).retryRound || 0, key = run.turn + ':' + (round ? round + ':' : '') + node.id, draft = value?.drafts?.[key];
    if (typeof draft !== 'string' || draft.length > 24) continue;
    const partialSettings = node.kind === 'settings' && draft.split(',').length === node.controls.length && draft.split(',').every((part, index) => part === '' || /^[0-9]$/.test(part) && Number(part) < node.controls[index].options.length);
    if (draft === engine.initialDraft(node) || engine.validValue(node, draft) || partialSettings) result.drafts[key] = draft;
  }
  return result;
}
// Revisions are the exact stored bytes. Comparing them avoids hash collisions and
// catches stale-tab writes; localStorage has no cross-tab atomic transaction.
export function readSolo(storage, board, appId, uid, legacyStorage) {
  let raw;
  try { raw = storage.getItem(soloStorageKey(board, appId, uid)); }
  catch (_) { return { status: 'unavailable', revision: undefined }; }
  if (raw !== null) {
    try {
      if (raw.length > 200000) throw Error();
      const value = JSON.parse(raw), identity = soloIdentity(appId, uid);
      if (value.version !== 2 || value.identity?.appId !== identity.appId || value.identity?.uid !== identity.uid || !Number.isSafeInteger(value.savedAt) || value.savedAt <= 0) throw Error();
      const run = restoreSolo(board, raw);
      return { status: 'saved', revision: raw, run, workspace: soloWorkspace(board, run, value.workspace), savedAt: value.savedAt, ...(typeof value.reportAttemptId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value.reportAttemptId) ? {reportAttemptId:value.reportAttemptId} : {}) };
    } catch (_) { return { status: 'corrupt', revision: raw }; }
  }
  if (legacyStorage) {
    const legacyKey = legacySoloStorageKey(board, appId, uid); let legacy;
    try { legacy = legacyStorage.getItem(legacyKey); } catch (_) { return { status: 'unavailable', revision: null }; }
    try {
      if (legacy !== null) {
        const run = restoreSolo(board, legacy); let workspace;
        try { const draft = legacyStorage.getItem(legacyKey + ':draft'); if (draft && draft.length < 50000) { const saved = JSON.parse(draft); if (saved.board === JSON.stringify(board)) workspace = saved; } } catch (_) {}
        return { status: 'legacy', revision: null, run, workspace: soloWorkspace(board, run, workspace), savedAt: null };
      }
    } catch (_) { return { status: 'corrupt', revision: null, legacy: true }; }
  }
  return { status: 'empty', revision: null };
}
export function saveSolo(storage, board, appId, uid, { run, workspace, expectedRevision = null, reportAttemptId }) {
  let encoded, normalized;
  try {
    prepareBoard(board);
    normalized = restoreSolo(board, JSON.stringify({ version: 2, board: JSON.stringify(board), run }));
    const value = { version: 2, identity: soloIdentity(appId, uid), board: JSON.stringify(board), run: normalized, workspace: soloWorkspace(board, normalized, workspace), savedAt: Date.now(), ...(typeof reportAttemptId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(reportAttemptId) ? {reportAttemptId} : {}) };
    encoded = JSON.stringify(value);
    if (encoded.length > 200000) throw Error();
  } catch (_) { return { status: 'invalid' }; }
  const key = soloStorageKey(board, appId, uid);
  try {
    const previous = storage.getItem(key);
    if (previous !== expectedRevision) return { status: 'conflict', revision: previous };
    storage.setItem(key, encoded);
    const actual = storage.getItem(key);
    if (actual !== encoded) return { status: 'conflict', revision: actual };
    return { status: 'saved', revision: encoded, run: normalized, workspace: JSON.parse(encoded).workspace, savedAt: JSON.parse(encoded).savedAt };
  } catch (_) { return { status: 'unavailable', revision: expectedRevision }; }
}
export function soloStatus(storage, board, appId, uid, legacyStorage) {
  if (!board) return null;
  const saved = readSolo(storage, board, appId, uid, legacyStorage);
  if (saved.status === 'empty') return null;
  if (!['saved', 'legacy'].includes(saved.status)) return { status: 'unavailable' };
  const progress = derive(board, saved.run);
  return { status: progress.complete ? 'complete' : 'resume', turn: saved.run.turn + 1, concepts: progress.concepts.length, projects: progress.built.length, legacy: saved.status === 'legacy', savedAt: saved.savedAt };
}
