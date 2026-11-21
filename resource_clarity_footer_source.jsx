function ResourceClarityFooter({ resource, history, index, teacher, sync, hasPrev, hasNext, onNavigate, t }) {
  const text = (key, fallback, params) => {
    const value = typeof t === 'function' ? t(key, params) : '';
    let result = typeof value === 'string' && value.trim() && value !== key ? value : fallback;
    Object.keys(params || {}).forEach(key => { result = result.split('{' + key + '}').join(String(params[key])); });
    return result;
  };
  const title = item => String(item?.title || item?.data?.title || item?.type || text('resource_nav.untitled', 'Untitled resource')).trim();
  const previous = history[index - 1], next = history[index + 1];
  const navigate = direction => {
    if (sync || direction === 'prev' && !hasPrev || direction === 'next' && !hasNext) return;
    onNavigate(direction);
    requestAnimationFrame(() => requestAnimationFrame(() => { const heading=document.getElementById('alloflow-resource-heading'); const target=heading?.getClientRects().length ? heading : document.getElementById('allo-resource'); target?.focus(); }));
  };
  const issues = [];
  let images = 0, missing = 0, stale = 0, visited = 0;
  const stack = [resource?.data], seen = new Set();
  while (stack.length && visited < 3000) {
    const item = stack.pop();
    if (!item || typeof item !== 'object' || seen.has(item)) continue;
    seen.add(item); visited++;
    const image = typeof item.imageUrl === 'string' ? item.imageUrl : typeof item.image === 'string' ? item.image : typeof item.iconUrl === 'string' ? item.iconUrl : '';
    if (image && item.decorative !== true && item.iconDecorative !== true) {
      images++;
      const alt = typeof item.altText === 'string' ? item.altText : typeof item.alt === 'string' ? item.alt : typeof item.iconAlt === 'string' ? item.iconAlt : '';
      if (!alt.trim()) missing++;
      else if (item.altHash && typeof window.AlloModules?.AltText?.hashImage === 'function' && window.AlloModules.AltText.hashImage(image) !== item.altHash) stale++;
    }
    for (const key of Object.keys(item)) if (item[key] && typeof item[key] === 'object') stack.push(item[key]);
  }
  if (missing) issues.push(text(missing===1?'resource_check.missing_image':'resource_check.missing_images', missing===1?'1 informative image needs a description.':'{count} informative images need descriptions.', { count: missing }));
  if (stale) issues.push(text(stale===1?'resource_check.stale_image':'resource_check.stale_images', stale===1?'1 image description needs review after an image change.':'{count} image descriptions need review after an image change.', { count: stale }));
  if (stack.length) issues.push(text('resource_check.partial_scan', 'This large resource was only partly checked. Review the remaining content.'));
  const scope = resource?.data?.feedback?.sourceScope;
  if (resource?.type === 'note-taking' && resource.data?.feedback && scope?.status !== 'full') issues.push(text('resource_check.notes_scope', 'Saved notes feedback did not record full-source coverage. Review its source scope.'));
  if (resource?.type === 'timeline') {
    const items = Array.isArray(resource.data) ? resource.data : Array.isArray(resource.data?.items) ? resource.data.items : [];
    const unchecked = items.filter(item => typeof item?.verification?.factual !== 'boolean' || typeof item?.verification?.position !== 'boolean').length;
    const flagged = items.filter(item => item?.verification?.factual === false || item?.verification?.position === false).length;
    if (unchecked) issues.push(text(unchecked===1?'resource_check.timeline_one_unchecked':'resource_check.timeline_unchecked',unchecked===1?'1 timeline item has no saved AI review.':'{count} timeline items have no saved AI review.', { count: unchecked }));
    if (flagged) issues.push(text('resource_check.timeline_flagged', 'AI flagged {count} timeline items for review.', { count: flagged }));
    if (resource?.data?.research?.hasGrounding === false) issues.push(text('resource_check.timeline_ungrounded', 'This topic timeline was drafted without grounded web sources. Verify dates and facts before sharing.'));
  }
  if (resource?.type === 'simplified' || resource?.type === 'same-text-supported') {
    if (Number.isFinite(resource?.levelCheck?.checkedChars) && Number.isFinite(resource?.levelCheck?.totalChars) && resource.levelCheck.checkedChars < resource.levelCheck.totalChars) {
      issues.push(text('resource_check.simplified_level_partial', 'Reading-level check only reviewed {checked} of {total} characters. Review the rest of the passage.', { checked: resource.levelCheck.checkedChars, total: resource.levelCheck.totalChars }));
    }
    if (Number.isFinite(resource?.alignmentCheck?.checkedChars) && Number.isFinite(resource?.alignmentCheck?.totalChars) && resource.alignmentCheck.checkedChars < resource.alignmentCheck.totalChars) {
      issues.push(text('resource_check.simplified_rigor_partial', 'Rigor alignment check only reviewed {checked} of {total} characters. Review the rest of the passage.', { checked: resource.alignmentCheck.checkedChars, total: resource.alignmentCheck.totalChars }));
    }
  }
  if (resource?.type === 'math' && resource?.data?._verification?.reviewRequired === true) {
    issues.push(text('resource_check.math_review_required', 'This math set was edited and needs teacher review before sharing.'));
  }
  if (resource?.type === 'glossary') {
    const rawGlossary = resource.data;
    const terms = Array.isArray(rawGlossary) ? rawGlossary : (Array.isArray(rawGlossary?.terms) ? rawGlossary.terms : Array.isArray(rawGlossary?.items) ? rawGlossary.items : []);
    const activeTerms = terms.filter(entry => entry && typeof entry === 'object' && entry.isSelected !== false && entry.selected !== false);
    const missingDef = activeTerms.filter(entry => !String(entry.def || entry.definition || entry.meaning || '').trim()).length;
    if (missingDef) issues.push(text(missingDef === 1 ? 'resource_check.glossary_one_missing_def' : 'resource_check.glossary_missing_defs', missingDef === 1 ? '1 glossary term is missing a definition.' : '{count} glossary terms are missing definitions.', { count: missingDef }));
    const AD = typeof window !== 'undefined' ? window.AlloDictionary : null;
    if (AD && typeof AD.getCached === 'function') {
      const unmatched = activeTerms.filter(entry => {
        const word = String(entry.term || entry.word || '').trim();
        const def = String(entry.def || entry.definition || '').trim();
        if (!word || !def) return false;
        const cached = AD.getCached(word);
        if (!cached) return false;
        const sense = typeof AD.matchPassageSense === 'function' ? AD.matchPassageSense(cached, def) : (typeof AD.pickSense === 'function' ? AD.pickSense(cached, def) : null);
        return !sense || !sense.definition || (typeof sense.score === 'number' && sense.score <= 0);
      }).length;
      if (unmatched) issues.push(text(unmatched === 1 ? 'resource_check.glossary_one_unmatched_sense' : 'resource_check.glossary_unmatched_senses', unmatched === 1 ? '1 glossary term has a dictionary entry that did not match the lesson meaning. Review it before sharing.' : '{count} glossary terms have dictionary entries that did not match the lesson meaning. Review them before sharing.', { count: unmatched }));
    }
  }
  const seedKind = resource?.lessonPath?.seed?.kind;
  if (seedKind === 'topic' || seedKind === 'word-list') {
    issues.push(text('resource_check.non_passage_start', 'Generated without a pasted source passage ({kind} start). Verify factual accuracy before sharing.', { kind: seedKind }));
  }
  // Slim: one row of navigation; checks open above it. Hide is remembered on this device.
  // Called inline (not as a component), so no hooks: the toggle flips `hidden` on the DOM.
  const attention = teacher && issues.length ? text(issues.length===1?'resource_check.one_attention':'resource_check.attention',issues.length===1?'1 check needs attention':'{count} checks need attention', { count: issues.length }) : '';
  let navHidden = false;
  try { navHidden = !sync && localStorage.getItem('alloflow_resource_nav_hidden') === '1'; } catch (_) {}
  const setNavHidden = (event, value) => {
    const footer = event.currentTarget.closest('[data-resource-clarity-footer]');
    try { localStorage.setItem('alloflow_resource_nav_hidden', value ? '1' : '0'); } catch (_) {}
    if (!footer) return;
    footer.querySelector('[data-resource-nav-full]').hidden = value;
    footer.querySelector('[data-resource-nav-mini]').hidden = !value;
    footer.querySelector(value ? '[data-resource-nav-show]' : '[data-resource-nav-hide]')?.focus();
  };
  const button = 'min-h-11 min-w-0 rounded-lg px-2 py-1 text-sm font-bold text-indigo-800 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-600';
  return <div key={resource?.id} data-resource-clarity-footer className="relative shrink-0 border-t border-slate-300 bg-slate-50 px-2 py-1 no-print">
    <div data-resource-nav-full hidden={navHidden}>
    <nav aria-label={text('resource_nav.label', 'Resource navigation')} className="items-center" style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) auto minmax(0,1fr)',gap:'0.5rem'}}>
      <button type="button" disabled={!hasPrev || !!sync} onClick={() => navigate('prev')} className={button + ' text-start truncate'} aria-label={previous ? text('resource_nav.previous_named', 'Previous resource: {title}', { title: title(previous) }) : text('resource_nav.previous', 'Previous resource')}><span aria-hidden="true">‹ </span>{previous ? <span aria-hidden="true">{title(previous)}</span> : text('resource_nav.previous', 'Previous resource')}</button>
      <div className="flex flex-col items-center text-center">
        <span className="text-xs font-semibold text-slate-700">{text('resource_nav.counter', 'Resource {current} of {total}', { current: index >= 0 ? index + 1 : '—', total: history.length })}</span>
        {teacher && <details data-resource-sharing-check className="text-xs text-slate-900">
          <summary className={'min-h-6 cursor-pointer rounded px-1 font-semibold focus-visible:ring-2 focus-visible:ring-indigo-600 ' + (attention ? 'text-amber-900' : 'text-slate-700')}>{text('resource_check.title', 'Before sharing')}{attention ? ' · ' + attention : ''}</summary>
          <div className="absolute inset-x-2 bottom-full z-20 mb-1 max-h-[50vh] overflow-auto rounded-lg border border-slate-300 bg-white p-3 text-start text-sm shadow-lg">
            <p className="text-xs text-slate-700">{text('resource_check.scope', 'Checks cover detected image descriptions, partial checks, unreviewed edits, non-passage starts, and saved Notes/Timeline review states. This is not a complete accessibility or accuracy review.')}</p>
            {issues.length ? <ul data-resource-check-issues className="mt-2 list-disc space-y-1 ps-5">{issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul> : <p className="mt-2">{text('resource_check.no_flags', 'No concerns were found by these limited checks.')}</p>}
            <p className="mt-2 text-xs text-slate-700">{text('resource_check.manual', 'Preview the student view. Confirm that instructions, linked activities, audio, and sharing settings work for your learners.')}</p>
          </div>
        </details>}
      </div>
      <div className="flex min-w-0 items-center justify-end gap-1">
        <button type="button" disabled={!hasNext || !!sync} onClick={() => navigate('next')} className={button + ' text-end truncate'} aria-label={next ? text('resource_nav.next_named', 'Next resource: {title}', { title: title(next) }) : text('resource_nav.next', 'Next resource')}>{next ? <span aria-hidden="true">{title(next)}</span> : text('resource_nav.next', 'Next resource')}<span aria-hidden="true"> ›</span></button>
        {!sync && <button type="button" data-resource-nav-hide onClick={e => setNavHidden(e, true)} aria-label={text('resource_nav.hide', 'Hide resource navigation')} title={text('resource_nav.hide', 'Hide resource navigation')} className="min-h-11 min-w-11 shrink-0 rounded-lg text-slate-600 hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-indigo-600"><span aria-hidden="true">⌄</span></button>}
      </div>
    </nav>
    {sync && <p role="status" className="mt-1 text-center text-xs text-slate-700">{text('resource_nav.following', 'Following your teacher’s resource. Your teacher controls navigation during this live lesson.')}</p>}
    </div>
    {!sync && <div data-resource-nav-mini hidden={!navHidden} className="text-center"><button type="button" data-resource-nav-show onClick={e => setNavHidden(e, false)} className="min-h-6 rounded px-2 text-xs font-semibold text-indigo-800 hover:underline focus-visible:ring-2 focus-visible:ring-indigo-600">{text('resource_nav.show', 'Show resource navigation')}{attention ? ' · ' + attention : ''}</button></div>}
  </div>;
}
