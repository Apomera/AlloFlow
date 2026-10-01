    var [placeReviewState, setPlaceReviewState] = React.useState(null);
    var [placeReviewBusyState, setPlaceReviewBusyState] = React.useState(null);
    var placeReview = placeReviewState?.key === placeScopeKey ? placeReviewState.review : null;
    var placeReviewBusy = placeReviewBusyState?.key === placeScopeKey && placeReviewBusyState.busy;
    var placeReviewRef = React.useRef(null), placeStatusRef = React.useRef(null), priorPlaceReviewRef = React.useRef(null);
    React.useEffect(function () {
      if (placeReview) placeReviewRef.current?.focus();
      else if (priorPlaceReviewRef.current === placeScopeKey) placeStatusRef.current?.focus();
      priorPlaceReviewRef.current = placeReview ? placeScopeKey : null;
    }, [placeReview, placeScopeKey]);
    function applyPlacePersistence(current) {
      if (!placeMountedRef.current || placeRef.current.key !== current.key || !placeRef.current.available) return;
      var state = current.store.peek(current.scope);
      setReadingPlace(state.place); setPlacePersistence(state);
    }
    function storeReadingPlace(update) {
      var current = placeRef.current;
      if (!current.available) return null;
      var pending = current.store.save(current.scope, update);
      applyPlacePersistence(current);
      return pending.then(function (result) { applyPlacePersistence(current); return result; });
    }
    function reviewReadingConflict() {
      var current = placeRef.current;
      if (!current.available) return;
      var review = current.store.review(current.scope);
      applyPlacePersistence(current);
      setPlaceReviewState(review ? { key: current.key, review } : null);
    }
    async function resolveReadingConflict(choice) {
      var current = placeRef.current;
      if (!current.available || !placeReview || placeReviewBusy) return;
      setPlaceReviewBusyState({ key: current.key, busy: true });
      await current.store.resolve(current.scope, placeReview, choice);
      if (!placeMountedRef.current || placeRef.current.key !== current.key) return;
      applyPlacePersistence(current);
      setPlaceReviewBusyState(null); setPlaceReviewState(null);
    }
    function readingRecoveryText(place) {
      var lines = [], answers = place?.responses || {};
      if (place?.bookmark) lines.push(viewText('simplified.place_recovery_bookmark', 'Bookmark') + ': ' + place.bookmark.snippet, '');
      Object.keys(answers).forEach(first => {
        var answer = answers[first];
        if (!['mainIdea', 'support', 'confusing', 'confusingNote'].some(field => !!answer[field])) return;
        var section = outlineSections.find(entry => String(entry.first) === first);
        lines.push(section ? section.label : viewText('simplified.place_recovery_paragraph', 'Paragraph {number}', { number: Number(first) + 1 }));
        var labels = [
          ['mainIdea', viewText('simplified.prompt_main_idea', 'What is the main idea?')],
          ['support', viewText('simplified.prompt_support', 'Which sentence supports it?')],
          ['confusing', viewText('simplified.prompt_confusing', 'Mark a confusing part.')],
          ['confusingNote', viewText('simplified.prompt_confusing_note', 'What is confusing about it? (optional)')]
        ];
        labels.forEach(([field, label]) => { if (answer[field]) lines.push(label, answer[field], ''); });
      });
      return lines.join('\n').trim() || viewText('simplified.place_recovery_empty', 'No bookmarks or answers yet.');
    }
    function renderPlacePersistence() {
      var state = placePersistence;
      if (!state) return null;
      var label = state.status === 'saved' ? viewText('simplified.place_saved_device', 'Saved on this device for this version of the reading.')
        : state.status === 'saving' ? viewText('simplified.place_saving', 'Saving on this device…')
        : state.status === 'session-only' ? (placePreview ? viewText('simplified.place_preview_only', 'Kept only while this preview is open.') : viewText('simplified.place_page_only', 'Kept only while this page is open. Reloading will clear this work.'))
        : state.status === 'failed' ? viewText('simplified.place_save_failed', 'Couldn’t save on this device. Your work is still here while this page stays open. Reloading may lose these changes.')
        : viewText('simplified.place_save_ready', 'Optional. Answers will be saved on this device when storage is available.');
      var reasons = {
        conflict: ['simplified.place_save_conflict', 'This reading’s saved work changed in another tab. Your draft is still here. Review both versions before choosing which to use.'],
        'review-changed': ['simplified.place_review_changed', 'Your draft or the saved work changed after this review. Review both versions again before choosing.'],
        'version-conflict': ['simplified.place_save_version_conflict', 'The saved work belongs to different text. Your bookmark and answers have not been moved.'],
        'corrupt-store': ['simplified.place_save_corrupt', 'Some saved reading data could not be read. Existing saved data has been left unchanged.'],
        'too-large': ['simplified.place_save_large', 'This work is too large to save. Copy your answers before shortening them.'],
        capacity: ['simplified.place_save_capacity', 'Reading storage is full. Existing bookmarks and answers have been kept.'],
        'coordination-unavailable': ['simplified.place_save_coordination', 'This browser cannot safely save reading work across tabs. Keep this page open or copy your answers.']
      };
      var reason = reasons[state.reason];
      var hasCopyableWork = !!readingPlace?.bookmark || Object.values(readingPlace?.responses || {}).some(answer => ['mainIdea', 'support', 'confusing', 'confusingNote'].some(field => !!answer[field]));
      var textArea = 'block w-full rounded border border-slate-400 bg-white p-2';
      var button = 'min-h-11 rounded-lg border border-amber-700 bg-white px-3 disabled:opacity-50';
      return <div data-reading-persistence={state.status} className={'my-2 rounded-lg p-2 text-sm ' + (state.status === 'failed' ? 'border border-amber-500 bg-amber-50 text-amber-950' : 'text-slate-700')}>
        <p role="status" ref={placeStatusRef} tabIndex={-1}>{label}{reason ? ' ' + viewText(reason[0], reason[1]) : ''}</p>
        {state.status === 'failed' && <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" data-reading-save-retry disabled={placeReviewBusy} onClick={() => storeReadingPlace({})} className={button}>{viewText('simplified.place_retry', 'Retry saving')}</button>
          {['conflict', 'review-changed'].includes(state.reason) && <button type="button" data-reading-conflict-review disabled={placeReviewBusy} onClick={reviewReadingConflict} className={button}>{viewText('simplified.place_review_versions', 'Review both versions')}</button>}
        </div>}
        {placeReview && <section data-reading-conflict-panel ref={placeReviewRef} tabIndex={-1} aria-label={viewText('simplified.place_review_title', 'Choose which work to use')} aria-busy={!!placeReviewBusy} className="mt-3 space-y-3 rounded border border-amber-600 bg-white p-3">
          <h4 className="font-bold">{viewText('simplified.place_review_title', 'Choose which work to use')}</h4>
          <p>{viewText('simplified.place_review_retained', 'A copy of the version you replace stays available below while this page is open.')}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <label>{viewText('simplified.place_review_local', 'This page’s draft')}<textarea data-reading-conflict-local readOnly rows={6} value={readingRecoveryText(placeReview.local)} onFocus={event => event.target.select()} className={textArea} /></label>
            <label>{viewText('simplified.place_review_saved', 'Saved work')}<textarea data-reading-conflict-saved readOnly rows={6} value={placeReview.saved ? readingRecoveryText(placeReview.saved) : viewText('simplified.place_review_removed', 'No saved work remains for this reading.')} onFocus={event => event.target.select()} className={textArea} /></label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" data-reading-conflict-keep disabled={placeReviewBusy} onClick={() => resolveReadingConflict('local')} className={button}>{viewText('simplified.place_review_keep', 'Save this page’s draft instead')}</button>
            <button type="button" data-reading-conflict-use disabled={placeReviewBusy} onClick={() => resolveReadingConflict('saved')} className={button}>{viewText('simplified.place_review_use', 'Use the saved work')}</button>
            <button type="button" data-reading-conflict-cancel disabled={placeReviewBusy} onClick={() => setPlaceReviewState(null)} className={button}>{viewText('common.cancel', 'Cancel')}</button>
          </div>
        </section>}
        {hasCopyableWork && ['failed', 'session-only'].includes(state.status) && <details className="mt-2"><summary className="min-h-11 cursor-pointer py-2">{viewText('simplified.place_copy_work', 'Copy your work')}</summary><label className="block">{viewText('simplified.place_work_to_copy', 'Work to copy')}<textarea data-reading-work-copy readOnly rows={6} value={readingRecoveryText(readingPlace)} onFocus={event => event.target.select()} className={textArea} /></label></details>}
        {!!state.recoveryCopies?.length && <details data-reading-recovery-copies className="mt-2"><summary className="min-h-11 cursor-pointer py-2">{viewText('simplified.place_recovery_copies', 'Recovery copies for this page')}</summary>
          <p>{viewText('simplified.place_recovery_lifetime', 'These copies are temporary. Copy any work you need before closing or reloading this page.')}</p>
          {state.recoveryCopies.map((entry, index) => <label key={index} className="my-2 block">{entry.source === 'local' ? viewText('simplified.place_recovery_local', 'Your earlier draft') : viewText('simplified.place_recovery_saved', 'Previously saved work')}{' ' + (index + 1)}<textarea data-reading-recovery-copy readOnly rows={6} value={readingRecoveryText(entry.place)} onFocus={event => event.target.select()} className={textArea} /></label>)}
        </details>}
      </div>;
    }
