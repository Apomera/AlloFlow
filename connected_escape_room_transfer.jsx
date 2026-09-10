import { exportRoomFile, roomFileName, readRoomFile, roomFileCompatibility } from './connected_escape_room_transfer.js';
const React = window.React;
const { useState, useEffect, useRef } = React;
const tr = (t, key, fallback, params = {}) => {
  const full = 'connected_escape.' + key, value = typeof t === 'function' ? t(full, params) : '';
  return Object.entries(params).reduce((s, [k, v]) => s.replaceAll('{' + k + '}', String(v)), typeof value === 'string' && value && value !== full ? value : fallback);
};
export function RoomTransfer({ room, source, language, disabled, unsaved, onOpen, onReading, t }) {
  const [candidate, setCandidate] = useState(null), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const request = useRef(0), inputRef = useRef(null), summaryRef = useRef(null), urls = useRef(new Map());
  useEffect(() => () => { request.current++; urls.current.forEach((timer, url) => { clearTimeout(timer); URL.revokeObjectURL(url); }); }, []);
  const errorText = error => {
    const messages = { 'room-file-size': tr(t, 'file_too_large', 'Choose a room file smaller than 200 KB.'), 'room-file-format': tr(t, 'file_wrong_format', 'This is not a supported AlloFlow connected-room file. Choose an .alloroom.json file exported from room setup.'), 'room-file-context': tr(t, 'file_missing_context', 'The file is missing a valid lesson excerpt or room language.'), 'room-file-invalid': tr(t, 'file_invalid_room', 'The file contains invalid puzzles, connections, or lesson references. Export a valid room and try again.') };
    return messages[error?.message] || tr(t, 'file_read_failed', 'The room file could not be read. Choose it again to retry.');
  };
  const choose = async event => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file || disabled) return;
    const id = ++request.current; setCandidate(null); setError(''); setNotice(''); onReading(true);
    try { const pack = await readRoomFile(file); if (request.current === id) { setCandidate(pack); setNotice(tr(t, 'file_checked', 'Room file checked. Review its details before opening it.')); } }
    catch (error) { if (request.current === id) setError(errorText(error)); }
    finally { if (request.current === id) onReading(false); }
  };
  const download = () => {
    if (disabled || !room) return;
    try {
      const text = exportRoomFile(room, source, language), url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
      const link = document.createElement('a'); link.href = url; link.download = roomFileName(room.title); document.body.appendChild(link);
      try { link.click(); } finally { link.remove(); const timer = setTimeout(() => { URL.revokeObjectURL(url); urls.current.delete(url); }, 60000); urls.current.set(url, timer); }
      setError(''); setNotice(tr(t, 'file_download_started', 'Room file download requested. Keep this file to reuse the room in another browser.'));
    } catch (_) { setError(tr(t, 'file_download_failed', 'The room file could not be created. Check that all room text is filled in and try again.')); }
  };
  const compatible = candidate && roomFileCompatibility(candidate, source, language);
  return <details className="cer-library" data-room-transfer>
    <summary ref={summaryRef}>{tr(t, 'room_files', 'Download or import a room')}</summary>
    <p className="cer-muted">{tr(t, 'file_contents', 'Room files include the lesson excerpt, clues, hints, and solutions. Roster information, live-session details, and play progress are not included. To import, open the same lesson and language in the other browser.')}</p>
    <button type="button" data-download-room disabled={disabled || !room} onClick={download}>{tr(t, 'download_room', 'Download room file')}</button>
    <label>{tr(t, 'choose_room_file', 'Choose a room file')}<input ref={inputRef} data-import-room type="file" accept=".json,.alloroom.json,application/json" disabled={disabled} onChange={choose}/></label>
    <p className={notice ? 'cer-muted' : 'sr-only'} role="status" aria-live="polite">{notice}</p>
    {error && <p className="cer-alert cer-error" role="alert">{error}</p>}
    {candidate && <section className="cer-panel" data-room-file-preview aria-label={tr(t, 'file_preview', 'Room file preview')}>
      <h3>{candidate.room.title}</h3><p>{tr(t, 'file_summary', '{language} · {objects} objects · {areas} areas', { language: candidate.language, objects: candidate.room.nodes.length, areas: candidate.room.areas.length })}</p>
      <details><summary>{tr(t, 'file_source', 'Lesson excerpt in the file')}</summary><p tabIndex={0} style={{ whiteSpace: 'pre-wrap', maxHeight: 220, overflowY: 'auto' }}>{candidate.source}</p></details>
      {compatible === 'compatible' ? <p>{unsaved ? tr(t, 'file_replace_warning', 'Opening this file replaces your unsaved preview. Save or download that preview first if you want to keep it.') : tr(t, 'file_ready', 'This file matches the current lesson and language. It is ready to open for review, solo play, or a live session.')}</p> : <p className="cer-alert" role="alert">{compatible === 'language' ? tr(t, 'file_language_mismatch', 'The room language differs from the current lesson language. Switch to {language}, then choose the file again.', { language: candidate.language }) : tr(t, 'file_lesson_mismatch', 'This file belongs to a different lesson excerpt. Open the matching lesson first, then choose this file again.')}</p>}
      <div className="cer-row"><button type="button" data-open-imported disabled={disabled || compatible !== 'compatible'} onClick={() => { if (onOpen(candidate.room)) { setCandidate(null); setNotice(tr(t, 'file_opened', 'Imported room opened. Review its clues, then save it or start playing.')); summaryRef.current?.focus(); } }}>{unsaved ? tr(t, 'replace_imported', 'Replace preview with imported room') : tr(t, 'open_imported', 'Open imported room')}</button><button type="button" disabled={disabled} onClick={() => { setCandidate(null); setNotice(''); inputRef.current?.focus(); }}>{tr(t, 'cancel', 'Cancel')}</button></div>
    </section>}
  </details>;
}
