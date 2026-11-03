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
  }
  const button = 'min-h-11 min-w-0 rounded-lg border border-indigo-300 bg-white px-3 py-2 text-start text-sm font-bold text-indigo-800 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-indigo-600';
  return <div key={resource?.id} data-resource-clarity-footer className="shrink-0 border-t border-slate-300 bg-slate-50 p-3 no-print">
    {teacher && <details data-resource-sharing-check className="mb-3 rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900">
      <summary className="cursor-pointer font-bold">{text('resource_check.title', 'Before sharing')}{issues.length ? ' · ' + text(issues.length===1?'resource_check.one_attention':'resource_check.attention',issues.length===1?'1 check needs attention':'{count} checks need attention', { count: issues.length }) : ''}</summary>
      <p className="mt-2 text-xs text-slate-700">{text('resource_check.scope', 'Checks cover detected image descriptions and saved Notes/Timeline review states. This is not a complete accessibility or accuracy review.')}</p>
      {issues.length ? <ul data-resource-check-issues className="mt-2 list-disc space-y-1 ps-5">{issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul> : <p className="mt-2">{text('resource_check.no_flags', 'No concerns were found by these limited checks.')}</p>}
      <p className="mt-2 text-xs text-slate-700">{text('resource_check.manual', 'Preview the student view. Confirm that instructions, linked activities, audio, and sharing settings work for your learners.')}</p>
    </details>}
    <nav aria-label={text('resource_nav.label', 'Resource navigation')} className="items-stretch" style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',gap:'0.5rem'}}>
      <button type="button" disabled={!hasPrev || !!sync} onClick={() => navigate('prev')} className={button} aria-label={previous ? text('resource_nav.previous_named', 'Previous resource: {title}', { title: title(previous) }) : text('resource_nav.previous', 'Previous resource')}><span className="block">{text('resource_nav.previous', 'Previous resource')}</span>{previous && <span className="block truncate text-xs font-normal" aria-hidden="true">{title(previous)}</span>}</button>
      <span className="self-center text-center text-xs font-semibold text-slate-700" style={{gridColumn:'1 / -1',gridRow:2}}>{text('resource_nav.counter', 'Resource {current} of {total}', { current: index >= 0 ? index + 1 : '—', total: history.length })}</span>
      <button type="button" disabled={!hasNext || !!sync} onClick={() => navigate('next')} className={button} style={{gridColumn:2,gridRow:1}} aria-label={next ? text('resource_nav.next_named', 'Next resource: {title}', { title: title(next) }) : text('resource_nav.next', 'Next resource')}><span className="block">{text('resource_nav.next', 'Next resource')}</span>{next && <span className="block truncate text-xs font-normal" aria-hidden="true">{title(next)}</span>}</button>
    </nav>
    {sync && <p role="status" className="mt-2 text-center text-xs text-slate-700">{text('resource_nav.following', 'Following your teacher’s resource. Your teacher controls navigation during this live lesson.')}</p>}
  </div>;
}
