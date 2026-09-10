import { prepareBoard, emptyRun, emptyStep, begin, merge, MAX_TURNS } from './lesson_board_engine.js';
export const fingerprint = value => { let hash = 2166136261; for (const c of value) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619); return (hash >>> 0).toString(36); };
export const libraryKey = (source, language) => 'allo-lesson-boards:' + fingerprint(language + ':' + source);
export function readLibrary(storage, source, language) {
  const raw = storage.getItem(libraryKey(source, language)); if (!raw) return [];
  if (raw.length > 160000) throw Error('Saved boards could not be read. Existing data has been kept.');
  try { const data = JSON.parse(raw); if (data.version !== 1 || data.source !== source || data.language !== language || !Array.isArray(data.boards) || data.boards.length > 4) throw Error(); return data.boards.map(board => prepareBoard(board, source)); } catch (_) { throw Error('Saved boards could not be read. Existing data has been kept.'); }
}
export function saveBoard(storage, source, language, board) {
  const valid = prepareBoard(board, source), boards = readLibrary(storage, source, language), json = JSON.stringify(valid), previous = boards.findIndex(b => JSON.stringify(b) === json);
  if (previous >= 0) boards.splice(previous, 1); else if (boards.length >= 4) throw Error('Four boards are already saved for this lesson. Remove one before saving another.');
  boards.unshift(valid); storage.setItem(libraryKey(source, language), JSON.stringify({ version: 1, source, language, boards })); return boards;
}
export function removeBoard(storage, source, language, index) { const boards = readLibrary(storage, source, language); if (!Number.isInteger(index) || index < 0 || index >= boards.length) throw Error('That saved board is no longer available.'); boards.splice(index, 1); storage.setItem(libraryKey(source, language), JSON.stringify({ version: 1, source, language, boards })); return boards; }
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
