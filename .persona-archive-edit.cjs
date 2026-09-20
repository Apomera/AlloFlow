const fs=require('node:fs');
function write(path,data){for(let attempt=0;;attempt++){try{fs.writeFileSync(path,data);return;}catch(error){if(attempt===7)throw error;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,300);}}}
function edit(path,fn){const original=fs.readFileSync(path,'utf8');const result=fn(original.replace(/\r\n/g,'\n'));write(path,original.includes('\r\n')?result.replace(/\n/g,'\r\n'):result);}
edit('view_persona_chat_source.jsx',source=>{
 function replace(from,to){if(!source.includes(from))throw Error('Missing view anchor: '+from.slice(0,70));source=source.replace(from,to);}
 replace('  var _characterDetailsOpenState = React.useState(false);', `  var archiveActionLabel = function (key, fallback) {
    var value = t('persona.archive_actions.' + key);
    return value && value !== 'persona.archive_actions.' + key ? value : fallback;
  };
  var _characterDetailsOpenState = React.useState(false);`);
 replace(`  var _archiveBusyState = React.useState(null);
  var personaArchiveBusyKey = _archiveBusyState[0];
  var setPersonaArchiveBusyKey = _archiveBusyState[1];`, `  var _archiveActionState = React.useState(null);
  var personaArchiveAction = _archiveActionState[0];
  var setPersonaArchiveAction = _archiveActionState[1];
  var personaArchiveBusyKey = personaArchiveAction && personaArchiveAction.status === 'pending' ? personaArchiveAction.key : null;
  // Lock synchronously: repeated activation can happen before React renders.
  var _archiveActionRef = React.useRef(null);`);
 replace(`    setIsPersonaArchiveOpen(true);
    setPersonaArchiveConfirmKey(null);
    _loadPersonaArchive();`, `    setIsPersonaArchiveOpen(true);
    setPersonaArchiveConfirmKey(null);
    setPersonaArchiveAction(_archiveActionRef.current);
    _loadPersonaArchive();`);
 const start=source.indexOf('  var _archiveDownload = function (row, format) {');
 const end=source.indexOf('  var personaCloseHandlerRef =',start);
 if(start<0||end<0)throw Error('Missing action block');
 source=source.slice(0,start)+`  var _runPersonaArchiveAction = function (row, kind, request) {
    if (_archiveActionRef.current) return;
    var action = { key: row.key, kind: kind, status: 'pending' };
    _archiveActionRef.current = action;
    setPersonaArchiveConfirmKey(null);
    setPersonaArchiveAction(action);
    Promise.resolve().then(request).then(function (ok) {
      // Host handlers report storage/download failures as null as well as rejects.
      if (ok !== true) throw new Error('Persona archive action failed');
      if (kind === 'delete') {
        setPersonaArchiveAction(null);
        var closeControl = personaArchiveCloseRef.current;
        if (closeControl && closeControl.isConnected) closeControl.focus({ preventScroll: true });
        _loadPersonaArchive();
      } else {
        setPersonaArchiveAction({ key: row.key, kind: kind, status: 'complete' });
      }
    }).catch(function () {
      setPersonaArchiveAction({ key: row.key, kind: kind, status: 'failed' });
    }).finally(function () {
      if (_archiveActionRef.current === action) _archiveActionRef.current = null;
    });
  };
  var _archiveDownload = function (row, format) {
    if (_archiveActionRef.current || !row || typeof handleDownloadPersonaSessionArchive !== 'function') return;
    _runPersonaArchiveAction(row, format, function () { return handleDownloadPersonaSessionArchive(row.key, format); });
  };
  var _archiveDelete = function (row) {
    if (_archiveActionRef.current || !row || typeof handleDeletePersonaSessionArchive !== 'function') return;
    // Two-tap arm: the first tap turns the button into a confirm control, the
    // second deletes. No window.confirm - it is blocked in embedded hosts.
    if (personaArchiveConfirmKey !== row.key) {
      setPersonaArchiveAction(null);
      setPersonaArchiveConfirmKey(row.key);
      return;
    }
    _runPersonaArchiveAction(row, 'delete', function () { return handleDeletePersonaSessionArchive(row.key); });
  };
`+source.slice(end);
 replace('personaArchiveRows.sessions.map(function (row) {', 'personaArchiveRows.sessions.map(function (row, rowIndex) {');
 replace(`                                            var rowBusy = personaArchiveBusyKey === row.key;
                                            var rowArmed = personaArchiveConfirmKey === row.key;`, `                                            var rowBusy = personaArchiveBusyKey === row.key;
                                            var rowArmed = personaArchiveConfirmKey === row.key;
                                            var rowAction = personaArchiveAction && personaArchiveAction.key === row.key ? personaArchiveAction : null;
                                            var deletePromptId = 'persona-archive-delete-' + rowIndex;`);
 replace('<li key={row.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">','<li key={row.key} data-persona-archive-row className="rounded-xl border border-slate-200 bg-slate-50 p-3">');
 const buttonStart=source.indexOf('                                                    <div className="mt-2 flex flex-wrap gap-2">',source.indexOf('personaArchiveRows.sessions.map'));
 const buttonEnd=source.indexOf('                                                </li>',buttonStart);
 if(buttonStart<0||buttonEnd<0)throw Error('Missing row button block');
 source=source.slice(0,buttonStart)+`                                                    {rowArmed && (
                                                        <p id={deletePromptId} className="mt-2 text-sm text-red-800">{archiveActionLabel('delete_prompt', 'Delete this saved session and its narration from this device? This cannot be undone.')}</p>
                                                    )}
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        <button type="button" disabled={Boolean(personaArchiveBusyKey)} aria-busy={rowBusy && rowAction.kind === 'html' ? 'true' : 'false'}
                                                            aria-label={t('persona.archive_download_page') + ': ' + row.title}
                                                            onClick={function () { _archiveDownload(row, 'html'); }}
                                                            className="min-h-[44px] rounded-lg border border-emerald-200 bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                                            {t('persona.archive_download_page')}
                                                        </button>
                                                        <button type="button" disabled={Boolean(personaArchiveBusyKey)} aria-busy={rowBusy && rowAction.kind === 'json' ? 'true' : 'false'}
                                                            aria-label={t('persona.archive_download_file') + ': ' + row.title}
                                                            onClick={function () { _archiveDownload(row, 'json'); }}
                                                            className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                                            {t('persona.archive_download_file')}
                                                        </button>
                                                        <button type="button" data-persona-archive-delete disabled={Boolean(personaArchiveBusyKey)} aria-busy={rowBusy && rowAction.kind === 'delete' ? 'true' : 'false'}
                                                            aria-label={(rowArmed ? t('persona.archive_delete_confirm') : t('persona.archive_delete')) + ': ' + row.title}
                                                            aria-describedby={rowArmed ? deletePromptId : undefined}
                                                            onClick={function () { _archiveDelete(row); }}
                                                            className={rowArmed
                                                                ? 'min-h-[44px] rounded-lg border border-red-300 bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
                                                                : 'min-h-[44px] rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'}>
                                                            {rowArmed ? t('persona.archive_delete_confirm') : t('persona.archive_delete')}
                                                        </button>
                                                        {rowArmed && (
                                                            <button type="button" disabled={Boolean(personaArchiveBusyKey)}
                                                                onClick={function (event) {
                                                                    var rowElement = event.currentTarget.closest('[data-persona-archive-row]');
                                                                    var deleteControl = rowElement && rowElement.querySelector('[data-persona-archive-delete]');
                                                                    setPersonaArchiveConfirmKey(null);
                                                                    if (deleteControl) deleteControl.focus({ preventScroll: true });
                                                                }}
                                                                className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                                                {archiveActionLabel('cancel_delete', 'Cancel deletion')}
                                                            </button>
                                                        )}
                                                    </div>
                                                    {rowAction && rowAction.status === 'failed' && (
                                                        <p role="alert" className="mt-2 text-sm text-red-800">{rowAction.kind === 'delete'
                                                            ? archiveActionLabel('delete_failed', 'This session could not be deleted. Try again.')
                                                            : archiveActionLabel('download_failed', 'This session could not be downloaded. Try downloading again.')}</p>
                                                    )}
                                                    {rowAction && rowAction.status !== 'failed' && (
                                                        <p role="status" aria-live="polite" className="mt-2 text-sm text-slate-700">{rowAction.status === 'complete'
                                                            ? archiveActionLabel('download_started', 'Download started.')
                                                            : rowAction.kind === 'delete'
                                                                ? archiveActionLabel('deleting', 'Deleting session…')
                                                                : archiveActionLabel('downloading', 'Preparing download…')}</p>
                                                    )}
`+source.slice(buttonEnd);
 return source;
});
const labels={delete_prompt:'Delete this saved session and its narration from this device? This cannot be undone.',cancel_delete:'Cancel deletion',delete_failed:'This session could not be deleted. Try again.',download_failed:'This session could not be downloaded. Try downloading again.',download_started:'Download started.',deleting:'Deleting session…',downloading:'Preparing download…'};
for(const path of ['ui_strings.js','desktop/web-app/public/ui_strings.js']) edit(path,source=>{
 const anchor=/^( +)"archive_delete_confirm": "Tap again to delete",$/m;
 if(!anchor.test(source))throw Error('Missing strings anchor: '+path);
 if(JSON.parse(source).persona.archive_actions)throw Error('Archive action labels already exist');
 const updated=source.replace(anchor,(line,indent)=>line+'\n'+indent+'"archive_actions": '+JSON.stringify(labels,null,2).split('\n').join('\n'+indent)+',');
 JSON.parse(updated);return updated;
});
const verify=fs.readFileSync('reports/persona-resume-lifecycle-2026-09-19/verify.cjs','utf8')+`\nconst rootStrings=JSON.parse(fs.readFileSync('ui_strings.js','utf8')).persona.archive_actions;\nconst desktopStrings=JSON.parse(fs.readFileSync('desktop/web-app/public/ui_strings.js','utf8')).persona.archive_actions;\nif(JSON.stringify(rootStrings)!==JSON.stringify(desktopStrings))throw Error('Archive action strings differ');\nconsole.log('Verified archive action strings in both distributions.');\n`;
write('reports/persona-archive-actions-2026-09-19/verify.cjs',verify);
console.log('Updated Persona archive actions and targeted strings.');
