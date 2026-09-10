import { useBoardEscape } from './lesson_board_accessibility.js';
import { tr } from './lesson_board_strings.js';
import { boardFileCompatibility, downloadBoardFile, readBoardFile } from './lesson_board_transfer.js';
const React = window.React;
const { useState, useEffect, useRef } = React;
const fileError = (error, t) => ({
  'board-file-format': tr(t, 'file_format', 'Choose a supported AlloFlow lesson board file (.alloboard.json).'),
  'board-file-context': tr(t, 'file_context', 'The file needs a lesson source and a board language.'),
  'board-file-invalid': tr(t, 'file_invalid', 'This board did not pass the activity, lesson evidence, path or resource checks. The current board is unchanged.'),
  'board-file-size': tr(t, 'file_size', 'That file is empty or too large for a lesson board.'),
  'board-file-read': tr(t, 'file_read', 'The file could not be read. Choose it again.'),
}[error?.message] || tr(t, 'file_failed', 'The board file could not be opened or downloaded. The current board is unchanged.'));

export function BoardDownload({ board, source, language, disabled, t }) {
  const [error, setError] = useState('');
  useEffect(() => setError(''), [board, source, language]);
  return <><button type="button" data-export-board disabled={disabled || !board} onClick={() => { try { downloadBoardFile(board, source, language); setError(''); } catch (error) { setError(fileError(error, t)); } }}>{tr(t, 'export_board', 'Download board file')}</button>{error && <p role="alert">{error}</p>}</>;
}

export function BoardTransfer({ board, source, language, disabled, onImport, t }) {
  const [pack, setPack] = useState(null), [error, setError] = useState(''), [reading, setReading] = useState(false), serial = useRef(0), mounted = useRef(true), review = useRef(null), group = useRef(null), input = useRef(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; serial.current++; }; }, []);
  useEffect(() => { serial.current++; setPack(null); setError(''); setReading(false); if (input.current) input.current.value = ''; }, [source, language]);
  const choose = async file => {
    if (!file) return; const id = ++serial.current; setPack(null); setError(''); setReading(true);
    try { const next = await readBoardFile(file); if (mounted.current && id === serial.current) { setPack(next); setTimeout(() => review.current?.focus(), 0); } }
    catch (error) { if (mounted.current && id === serial.current) setError(fileError(error, t)); }
    finally { if (mounted.current && id === serial.current) setReading(false); }
  };
  const cancel = () => { serial.current++; setPack(null); setError(''); setReading(false); if (input.current) { input.current.value = ''; input.current.focus(); } };
  useBoardEscape(group, () => { if (!disabled) cancel(); }, !!pack);
  const compatible = pack && boardFileCompatibility(pack, source, language);
  return <details data-board-transfer><summary>{tr(t, 'board_files', 'Board files and backups')}</summary>
    <p>{tr(t, 'file_contents', 'A board file includes its lesson source, activities, solutions and hints. It does not include learner identities, responses or live-session progress.')}</p>
    <BoardDownload board={board} source={source} language={language} disabled={disabled} t={t}/>
    <label>{tr(t, 'import_board', 'Choose a board file')}<input ref={input} data-import-board type="file" accept=".alloboard.json,application/json" disabled={disabled} onChange={event => choose(event.target.files?.[0])}/></label>
    {reading && <p role="status">{tr(t, 'reading_file', 'Checking the board file…')}</p>}{error && <p role="alert">{error}</p>}
    {pack && <section ref={group} className="lb-notice" data-board-file-review aria-label={tr(t, 'file_review', 'Review imported board')}>
      <h3 ref={review} tabIndex={-1}>{pack.board.title}</h3><p>{pack.board.mission}</p><p>{tr(t, 'file_summary', '{locations} locations · {language}', { locations: pack.board.locations.length, language: pack.language })}</p>
      <p>{compatible ? tr(t, 'file_matches', 'The lesson source and language match this setup.') : tr(t, 'file_different', 'This file uses a different lesson or language. Opening it uses the included lesson in this board setup; the main lesson stays unchanged.')}</p>
      <details><summary>{tr(t, 'included_source', 'Included lesson source')}</summary><blockquote>{pack.source}</blockquote></details>
      <p>{tr(t, 'file_replace_notice', 'Opening replaces the current board preview and its unsaved edits. Your saved library copies stay available. It does not launch a live session.')}</p>
      <div className="lb-row"><button type="button" data-open-board-file disabled={disabled} onClick={() => { onImport(pack); setPack(null); if (input.current) input.current.value = ''; }}>{tr(t, 'open_board_file', 'Open this board')}</button><button type="button" disabled={disabled} onClick={cancel}>{tr(t, 'cancel', 'Cancel')}</button></div>
    </section>}
  </details>;
}
