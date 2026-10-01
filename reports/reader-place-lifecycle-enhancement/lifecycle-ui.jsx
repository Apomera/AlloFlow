    var [placeStorageState, setPlaceStorageState] = React.useState(null);
    var [placeDownloadState, setPlaceDownloadState] = React.useState(null);
    var [placeBackupOpenState, setPlaceBackupOpenState] = React.useState(null);
    var placeStorage = placeStorageState?.key === placeScopeKey ? placeStorageState : null;
    var placeDownloadNotice = placeDownloadState?.key === placeScopeKey ? placeDownloadState.text : '';
    var placeStorageRef = React.useRef(null), priorPlaceStorageRef = React.useRef(null);
    React.useEffect(function () {
      if (placeStorage?.review) placeStorageRef.current?.focus();
      else if (priorPlaceStorageRef.current === placeScopeKey) placeStatusRef.current?.focus();
      priorPlaceStorageRef.current = placeStorage?.review ? placeScopeKey : null;
    }, [placeStorage?.review, placeScopeKey]);
    function reviewReadingStorage() {
      var current = placeRef.current;
      if (!current.available) return;
      var review = current.store.inspectSaved(current.scope);
      applyPlacePersistence(current);
      setPlaceStorageState({ key: current.key, review, checked: false, busy: false });
    }
    async function changeReadingStorage(action) {
      var current = placeRef.current;
      if (!current.available || !placeStorage?.review || !placeStorage.checked || placeStorage.busy) return;
      setPlaceStorageState({ ...placeStorage, busy: true });
      await current.store.manageSaved(current.scope, placeStorage.review, action);
      if (!placeMountedRef.current || placeRef.current.key !== current.key) return;
      applyPlacePersistence(current); setPlaceStorageState(null);
    }
    function downloadReadingRecovery() {
      var current = placeRef.current, url = null, link = null;
      try {
        var exported = current.store.exportSession(current.scope.learner), lines = [viewText('simplified.place_backup_title', 'Reading work recovery copy'), ''];
        exported.readings.forEach((reading, index) => {
          lines.push(viewText('simplified.place_backup_reading', 'Reading {number}', { number: index + 1 }),
            viewText('simplified.place_backup_passage', 'Exact reading text:'), reading.scope.text || '', '',
            viewText('simplified.place_review_local', 'This page’s draft'), readingRecoveryText(reading.place, reading.scope.text), '');
          reading.recoveryCopies.forEach((saved, savedIndex) => {
            lines.push(viewText('simplified.place_backup_copy', 'Recovery copy {number}', { number: savedIndex + 1 }), readingRecoveryText(saved.place, reading.scope.text), '');
            if (saved.rawRow) lines.push(viewText('simplified.place_backup_original', 'Original saved record for recovery:'), saved.rawRow, '');
          });
        });
        if (placeStorage?.review) lines.push(viewText('simplified.place_backup_original', 'Original saved record for recovery:'), placeStorage.review.token, '');
        url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
        link = document.createElement('a'); link.href = url; link.download = 'reading-work-recovery.txt'; document.body.appendChild(link); link.click();
        setPlaceDownloadState({ key: current.key, text: viewText('simplified.place_download_requested', 'Download requested. Check that the file contains the work you need before closing this page.') });
      } catch (_) {
        setPlaceDownloadState({ key: current.key, text: viewText('simplified.place_download_failed', 'The download could not start. Keep this page open and use the selectable recovery text below.') });
      } finally {
        link?.remove();
        if (url) window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      }
    }
    function readingStorageProblem(state) {
      var problem = state.problem;
      if (problem?.kind === 'answer-size') {
        var labels = { mainIdea: viewText('simplified.prompt_main_idea', 'What is the main idea?'), support: viewText('simplified.prompt_support', 'Which sentence supports it?'),
          confusing: viewText('simplified.prompt_confusing', 'Mark a confusing part.'), confusingNote: viewText('simplified.prompt_confusing_note', 'What is confusing about it? (optional)') };
        var section = outlineSections.find(entry => String(entry.first) === String(problem.section));
        return viewText('simplified.place_answer_limit', '{section} — {question} This answer is too long to save. Copy or download it before shortening it.', {
          section: section?.label || viewText('simplified.place_recovery_paragraph', 'Paragraph {number}', { number: Number(problem.section) + 1 }),
          question: labels[problem.field] });
      }
      if (problem?.kind === 'store-size') return viewText('simplified.place_store_limit', 'The saved reading collection is too large. Download work you need, then open a reading you no longer need and remove its saved work.');
      if (state.reason === 'quota') return viewText('simplified.place_browser_quota', 'The browser could not make room for this save. Download your work, free browser storage if appropriate, then retry.');
      if (state.reason === 'capacity') return viewText('simplified.place_capacity_recovery', 'Open a saved reading you no longer need. Download its work, then use Saved reading storage to remove that reading before retrying here.');
      if (state.reason === 'retry-needed') return viewText('simplified.place_repair_retry', 'The readable saved fields have been repaired. Your newer draft is still here; retry saving it.');
      return '';
    }
    function renderReadingRecoveryActions(state, hasCopyableWork, button, textArea) {
      var backupOpen = placeBackupOpenState?.key === placeScopeKey && placeBackupOpenState.open;
      var session = backupOpen ? placeStore.exportSession(placeLearner) : { readings: [] }, hasSessionWork = placeStore.hasSessionWork(placeLearner);
      return <>
        {!!readingStorageProblem(state) && <p data-reading-storage-problem>{readingStorageProblem(state)}</p>}
        {(hasSessionWork || (placeLearner && state.status === 'failed')) && <details data-reading-storage-tools className="mt-2" open={!!backupOpen} onToggle={event => { var open = event.currentTarget.open; if (open !== !!backupOpen) setPlaceBackupOpenState({ key: placeScopeKey, open }); }}>
          <summary className="min-h-11 cursor-pointer py-2">{viewText('simplified.place_backup_tools', 'Backup and saved reading storage')}</summary>
          <p>{viewText('simplified.place_backup_scope', 'The download includes work opened on this page for this learner, with each exact reading and any recovery copies. Work for other learners is excluded.')}</p>
          <div className="my-2 flex flex-wrap gap-2">
            {hasSessionWork && <button type="button" data-reading-download onClick={downloadReadingRecovery} className={button}>{viewText('simplified.place_download', 'Download recovery copy')}</button>}
            {!!placeLearner && <button type="button" data-reading-storage-review onClick={reviewReadingStorage} disabled={!!placeStorage?.busy} className={button}>{viewText('simplified.place_storage_manage', 'Saved reading storage')}</button>}
          </div>
          {!!placeDownloadNotice && <p role="status">{placeDownloadNotice}</p>}
          {hasSessionWork && <details><summary className="min-h-11 cursor-pointer py-2">{viewText('simplified.place_backup_selectable', 'Select recovery text if download is unavailable')}</summary>
            {session.readings.map((reading, index) => <label key={index} className="my-2 block">{viewText('simplified.place_backup_reading', 'Reading {number}', { number: index + 1 })}<textarea data-reading-session-copy readOnly rows={6} className={textArea} onFocus={event => event.target.select()} value={[reading.scope.text, readingRecoveryText(reading.place, reading.scope.text), ...reading.recoveryCopies.map(saved => readingRecoveryText(saved.place, reading.scope.text) + (saved.rawRow ? '\n' + saved.rawRow : ''))].join('\n\n')} /></label>)}
          </details>}
          {placeStorage && !placeStorage.review && <p role="status">{viewText('simplified.place_storage_unavailable', 'There is no safely readable saved record for this exact reading. Your draft remains available above. A damaged collection cannot be reset here because it may contain other learners’ work.')}</p>}
          {placeStorage?.review && <section data-reading-storage-panel ref={placeStorageRef} tabIndex={-1} aria-busy={placeStorage.busy} aria-label={viewText('simplified.place_storage_manage', 'Saved reading storage')} className="mt-2 space-y-2 rounded border p-3">
            <p>{viewText('simplified.place_storage_scope', 'Only this learner’s saved work for this exact reading will change. Removing it clears its bookmark and answers here. Recovery copies stay on this page until it closes.')}</p>
            <label>{viewText('simplified.place_review_saved', 'Saved work')}<textarea readOnly rows={5} className={textArea} value={readingRecoveryText(placeStorage.review.place)} onFocus={event => event.target.select()} /></label>
            {placeStorage.review.corrupt && <p>{viewText('simplified.place_storage_repair_help', 'This record contains damaged fields. Repair keeps readable fields and retains the original record in a recovery copy. Other damaged records may still prevent saving.')}</p>}
            <button type="button" data-reading-storage-download className={button} onClick={downloadReadingRecovery}>{viewText('simplified.place_download', 'Download recovery copy')}</button>
            <label className="flex min-h-11 items-center gap-2"><input type="checkbox" data-reading-storage-confirm checked={placeStorage.checked} disabled={placeStorage.busy} onChange={event => setPlaceStorageState({ ...placeStorage, checked: event.target.checked })} />{viewText('simplified.place_storage_confirm', 'I have kept a copy of the work I need.')}</label>
            <div className="flex flex-wrap gap-2">
              <button type="button" data-reading-storage-remove disabled={!placeStorage.checked || placeStorage.busy} onClick={() => changeReadingStorage('remove')} className={button}>{viewText('simplified.place_storage_remove', 'Remove this reading’s saved work')}</button>
              {placeStorage.review.corrupt && <button type="button" data-reading-storage-repair disabled={!placeStorage.checked || placeStorage.busy} onClick={() => changeReadingStorage('repair')} className={button}>{viewText('simplified.place_storage_repair', 'Repair readable fields')}</button>}
              <button type="button" disabled={placeStorage.busy} onClick={() => setPlaceStorageState(null)} className={button}>{viewText('common.cancel', 'Cancel')}</button>
            </div>
          </section>}
        </details>}
      </>;
    }
