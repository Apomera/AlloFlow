    var [placeCopyReviewState, setPlaceCopyReviewState] = React.useState(null);
    var placeCopyReview = placeCopyReviewState?.key === placeScopeKey ? placeCopyReviewState : null;
    var placeCopyReviewRef = React.useRef(null), priorPlaceCopyReviewRef = React.useRef(null);
    React.useEffect(function () {
      if (placeCopyReview) placeCopyReviewRef.current?.focus();
      else if (priorPlaceCopyReviewRef.current === placeScopeKey) placeStatusRef.current?.focus();
      priorPlaceCopyReviewRef.current = placeCopyReview ? placeScopeKey : null;
    }, [placeCopyReview?.review, placeScopeKey]);
    function reviewRecoveryCopy(index) {
      var current = placeRef.current;
      if (!current.available || previewOpenRef.current) return;
      var review = current.store.reviewRecovery(current.scope, index);
      setPlaceCopyReviewState(review ? { key: current.key, review, confirmed: false } : null);
    }
    function changeRecoveryCopy(action) {
      var current = placeRef.current;
      if (!current.available || previewOpenRef.current || !placeCopyReview || (action === 'remove' && !placeCopyReview.confirmed)) return;
      current.store.changeRecovery(current.scope, placeCopyReview.review, action);
      applyPlacePersistence(current); setPlaceCopyReviewState(null);
    }
    function renderRecoveryCopyReview(button, textArea) {
      if (!placeCopyReview) return null;
      var review = placeCopyReview.review;
      return <section data-reading-copy-panel ref={placeCopyReviewRef} tabIndex={-1} aria-label={viewText('simplified.place_copy_review_title', 'Review a recovery copy')} className="my-3 space-y-3 rounded border border-amber-600 bg-white p-3">
        <h4 className="font-bold">{viewText('simplified.place_copy_review_title', 'Review a recovery copy')}</h4>
        <p>{viewText('simplified.place_copy_restore_help', 'Restoring replaces this page’s answers and bookmark with the copy below. Your current work is kept in another recovery copy. Review the restored draft before saving it.')}</p>
        <div className="grid gap-3 md:grid-cols-2">
          <label>{viewText('simplified.place_review_local', 'This page’s draft')}<textarea data-reading-copy-current readOnly rows={6} className={textArea} value={readingRecoveryText(review.local)} onFocus={event => event.target.select()} /></label>
          <label>{viewText('simplified.place_copy_selected', 'Selected recovery copy')}<textarea data-reading-copy-selected readOnly rows={6} className={textArea} value={readingRecoveryText(review.recovered)} onFocus={event => event.target.select()} /></label>
        </div>
        {!review.canRestore && <p>{viewText('simplified.place_copy_no_readable_work', 'This copy has no readable answers or bookmark to restore. Its original record is still available in the recovery download.')}</p>}
        <button type="button" data-reading-copy-restore disabled={!review.canRestore} onClick={() => changeRecoveryCopy('restore')} className={button}>{viewText('simplified.place_copy_restore', 'Restore as a draft')}</button>
        <p>{viewText('simplified.place_copy_remove_help', 'Removing this copy only removes it from this page. It does not change your current answers, bookmark, or saved work.')}</p>
        <label className="flex min-h-11 items-center gap-2"><input data-reading-copy-confirm type="checkbox" checked={placeCopyReview.confirmed} onChange={event => setPlaceCopyReviewState({ ...placeCopyReview, confirmed: event.target.checked })} />{viewText('simplified.place_copy_remove_confirm', 'I have kept this copy or no longer need it.')}</label>
        <div className="flex flex-wrap gap-2">
          <button type="button" data-reading-copy-remove disabled={!placeCopyReview.confirmed} onClick={() => changeRecoveryCopy('remove')} className={button}>{viewText('simplified.place_copy_remove', 'Remove this recovery copy')}</button>
          <button type="button" data-reading-copy-cancel onClick={() => setPlaceCopyReviewState(null)} className={button}>{viewText('common.cancel', 'Cancel')}</button>
        </div>
      </section>;
    }
