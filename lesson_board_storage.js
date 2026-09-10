import { prepareBoard, emptyRun, emptyStep, begin, merge, derive, MAX_TURNS } from './lesson_board_engine.js';
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
    if (raw.length > 130000) throw Error(); const data = JSON.parse(raw), saved = data.run;
    if (data.version !== 1 || data.board !== JSON.stringify(board) || !saved || !Number.isInteger(saved.turn) || saved.turn < 0 || saved.turn >= MAX_TURNS) throw Error();
    let run = emptyRun();
    for (let i = 0; i <= saved.turn; i++) {
      run.turn = i; const step = saved.steps?.['t' + i]; if (!step || !['choose', 'answer', 'review'].includes(step.phase) || i < saved.turn && step.phase !== 'review') throw Error();
      run.steps['t' + i] = emptyStep(); if (step.phase === 'choose') continue;
      run = merge(run, begin(board, run, step.targetId)); const node = board.locations.find(n => n.id === step.targetId);
      if (step.phase === 'answer') { if (!node) throw Error(); continue; }
      if (node) {
        const answer = step.result?.marks?.solo; if (typeof answer !== 'boolean' || step.result.success !== answer) throw Error();
        run.steps['t' + i] = { ...emptyStep(), phase: 'review', targetId: node.id, result: { success: answer, marks: { solo: answer } } };
      } else if (step.result?.success !== true) throw Error();
    }
    return run;
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
export const soloStorageKey = (board, appId, uid = 'local') => 'allo-board-solo:' + appId + ':' + uid + ':' + fingerprint(JSON.stringify(board));
export function soloStatus(storage, board, appId, uid) {
  if (!board) return null;
  try {
    const raw = storage.getItem(soloStorageKey(board, appId, uid)); if (!raw) return null;
    const run = restoreSolo(board, raw), progress = derive(board, run);
    return { status: progress.complete ? 'complete' : 'resume', turn: run.turn + 1, concepts: progress.concepts.length, projects: progress.built.length };
  } catch (_) { return { status: 'unavailable' }; }
}
