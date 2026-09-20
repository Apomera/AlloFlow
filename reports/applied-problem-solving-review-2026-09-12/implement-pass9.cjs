const fs=require('fs');
const files=new Map();
const read=p=>{if(!files.has(p))files.set(p,fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'));return files.get(p);};
const set=(p,s)=>files.set(p,s);
function replace(p,a,b){const s=read(p);if(!s.includes(a))throw Error('Missing anchor '+p+': '+a.slice(0,160));set(p,s.replace(a,b));}
const p='applied_challenge_source.jsx',sr='studio_response_module.js',doc='doc_pipeline_source.jsx';
let component=fs.readFileSync('reports/applied-problem-solving-review-2026-09-12/pass9-source-components.txt','utf8').replace(/\r\n/g,'\n');
component=component.replace("while (ids.has(id)) id = id.slice(0, 70) + '-' + result.length;","const baseId = id; let suffix = 0;\n    while (ids.has(id)) id = baseId.slice(0, 70) + '-' + (++suffix);");
component=component.replace("title: _apsString(item.title, 350) || new URL(url).hostname","title: typeof item.title === 'string' ? _apsString(item.title, 350) : new URL(url).hostname");
component=component.replace('{source.title}<span',"{source.title || new URL(source.url).hostname}<span");
replace(p,'const APPLIED_REASONING_PARTS =',component+'\nconst APPLIED_REASONING_PARTS =');
replace(p,'schemaVersion: 8,','schemaVersion: 9,');
replace(p,'reasoningReferences: normalizeAppliedReasoningReferences(raw.reasoningReferences),','reasoningReferences: normalizeAppliedReasoningReferences(raw.reasoningReferences),\n    sourceRecords: normalizeAppliedChallengeSources(raw.sourceRecords),');
replace(p,"!['response', 'artifact', 'ledger'].includes(item.source)","!['response', 'artifact', 'ledger', 'sourceNote'].includes(item.source)");
replace(p,"function appliedReasoningSource(data, reference) {","function appliedReasoningSource(data, reference) {\n  if (reference.source === 'sourceNote') { const source = data.sourceRecords.find(item => item.id === reference.rowId); return source?.reviewNote.trim() ? JSON.stringify([source, data.evidenceLedger.find(row => row.id === source.rowId)?.claim || '']) : ''; }");
replace(p,"ledger: 'Pointed to in my evidence notes'","ledger: 'Pointed to in my evidence notes', sourceNote: 'Pointed to in my source-check note'");
replace(p,"  ].filter(choice => appliedReasoningSource(data, choice));","    ...data.sourceRecords.map((source, index) => ({ source: 'sourceNote', rowId: source.id, label: _apsFill(tx('source_note_choice', 'Source-check note {n}'), { n: index + 1 }) })),\n  ].filter(choice => appliedReasoningSource(data, choice));");
replace(p,"    if (ref.source === 'response') return phase('response');","    if (ref.source === 'sourceNote') return { phase: 'possibilities', elementId: 'aps-source-note-' + ref.rowId };\n    if (ref.source === 'response') return phase('response');");
replace(p,'  let rowIssues = 0;',"  data.sourceRecords.forEach((source, index) => { if (!source.reviewNote.trim()) add('source-' + source.id, _apsFill(tx('source_note', 'Record what you checked about source {n}, what remains uncertain, or why you will not use it.'), { n: index + 1 }), { phase: 'possibilities', elementId: 'aps-source-note-' + source.id }); });\n  let rowIssues = 0;");
// Source changes invalidate advice and checks tied to an earlier draft.
set(p,read(p).replaceAll('    reasoningReferences: data.reasoningReferences,','    reasoningReferences: data.reasoningReferences,\n    sourceRecords: data.sourceRecords,'));
replace(p,"    artifactUrl: data.workspace.artifactUrl, artifactDescription: data.workspace.artifactDescription,\n  }));","    artifactUrl: data.workspace.artifactUrl, artifactDescription: data.workspace.artifactDescription,\n    sourceRecords: data.sourceRecords,\n  }));");
replace(p,"feedbackContextVersion: purpose === 'feedback' ? 2", "feedbackContextVersion: purpose === 'feedback' ? 3");
replace(p,"evidenceRows: count('evidenceRows', 12),","evidenceRows: count('evidenceRows', 12), sourceRecords: count('sourceRecords', 24),");
replace(p,"    (coverage.shortenedFields ?", "    _apsFill(_apsT(t, 'applied_challenge.coverage.sources', '{sourceRecords} saved source records.'), coverage) + ' ' +\n    (coverage.shortenedFields ?");
replace(p,"        evidenceLedger: rows.map((row, index) => {","        sourceRecords: data.sourceRecords.map((source, index) => ({ id: source.id, rowId: source.rowId, domain: new URL(source.url).hostname, foundAt: source.foundAt, ...fields(source, ['title', 'author', 'publicationDate', 'reviewNote'], 'sources.' + index), learnerNoteRecorded: !!source.reviewNote.trim(), claimVerified: false })),\n        evidenceLedger: rows.map((row, index) => {");
replace(p,'evidenceRows: rows.length,','evidenceRows: rows.length, sourceRecords: data.sourceRecords.length,');
replace(p,'Links have not been opened. Quote matching is not claim verification.','Links have not been opened. Quote matching and recorded source-check notes are not claim verification.');
replace(p,"if ((!data.brief.factVerified || ledgerNeedsCheck)","if ((!data.brief.factVerified || ledgerNeedsCheck || data.sourceRecords.some(source => !source.reviewNote.trim()))");
// Add saved sources to export models without exposing them in blank task copies.
replace(p,"    reasoningReferences: preset === 'task'", "    sourceRecords: preset === 'task' || preset === 'paper' ? [] : data.sourceRecords.map(source => ({ ...source, connectionLabel: appliedChallengeSourceConnection(source, data.evidenceLedger, t) })),\n    reasoningReferences: preset === 'task'");
replace(p,"  if (!teaching) {\n", "  if (!teaching) {\n    if (m.sourceRecords.length) body += section(tr('sources.heading', 'Saved outside sources'), text(tr('sources.boundary', 'Citation details are separate from your writing. A source-check note records your review; it does not verify a claim. Links are not opened by AI.')) + m.sourceRecords.map(source => '<article><h3><a href=\"' + esc(source.url) + '\" rel=\"noopener noreferrer\">' + esc(source.title || source.url) + '</a></h3>' + text(source.connectionLabel) + text([source.author, source.publicationDate].filter(Boolean).join(' · ')) + (source.foundAt ? text(tr('sources.found', 'Found on') + ' ' + source.foundAt) : '') + text(source.reviewNote || tr('sources.not_recorded', 'Source check not recorded')) + '</article>').join(''));\n");
replace(p,"(safe.validationCycles || []).length || Object.keys", "(safe.validationCycles || []).length || (safe.sourceRecords || []).length || Object.keys");
// Structured capture mode leaves older stand-alone search consumers compatible.
replace(p,"querySuggestions = [] }) {","querySuggestions = [], sourceRecords }) {");
replace(p,'const check = notesMode ? appliedChallengeAttachNoteReference',"const check = sourceRecords ? appliedChallengeSourceCaptureCheck(sourceRecords, rows, evidenceNotes, result, notesMode ? '' : destination || 'new') : notesMode ? appliedChallengeAttachNoteReference");
replace(p,"{check.reason === 'length' &&", "{check.reason === 'sources-full' && <p className='mt-2 text-sm text-amber-900'>{_apsT(t, 'applied_challenge.sources.full', 'You have 24 saved sources. Remove an unused source before adding another.')}</p>}{check.reason === 'length' &&");
replace(p,"{notesMode ? tx('notes_reference'", "{sourceRecords && (notesMode || destination || rows.length < 12) ? tx('saved_separately', 'Citation details are saved in Saved outside sources. Add your own source-check note, then explain how the evidence affects your reasoning.') : notesMode ? tx('notes_reference'");
replace(p,"References you added stay in your writing.","References you added stay saved with your work.");
replace(p,"  const [reviewReturn, setReviewReturn]", "  const sourceNotebookSession = React.useRef({ scope: recoveryScope });\n  if (sourceNotebookSession.current.scope !== recoveryScope) sourceNotebookSession.current = { scope: recoveryScope };\n  const [reviewReturn, setReviewReturn]");
replace(p," : _apsFill(tx('applied_challenge.undo.check_available'", " : recoveryEntry.kind === 'source' ? _apsFill(tx('applied_challenge.undo.source_available', 'Source {n} was removed.'), { n: recoveryEntry.index + 1 }) : _apsFill(tx('applied_challenge.undo.check_available'");
replace(p,"entry.kind === 'evidence' ? 'evidenceLedger' : 'validationCycles'", "entry.kind === 'evidence' ? 'evidenceLedger' : entry.kind === 'source' ? 'sourceRecords' : 'validationCycles'");
replace(p,"limit = key === 'evidenceLedger' ? 12 : 6", "limit = key === 'evidenceLedger' ? 12 : key === 'sourceRecords' ? 24 : 6");
replace(p,"      if (list.length >= limit || list.some(item => item.id === entry.value.id))", "      if (list.length >= limit || list.some(item => item.id === entry.value.id || (key === 'sourceRecords' && item.url === entry.value.url && item.rowId === entry.value.rowId)))");
replace(p,"      if (key === 'evidenceLedger') {", "      if (key === 'sourceRecords') {\n        updateSources(insert); setReviewOpen(false); setHintPhase('possibilities'); setFocusRequest({ phase: 'possibilities', elementId: 'aps-source-note-' + entry.value.id });\n      } else if (key === 'evidenceLedger') {");
const start=read(p).indexOf("  const addOutsideReference = (result, rowId = '') => {");
const end=read(p).indexOf('  const connectLessonFact =',start);
if(start<0||end<0)throw Error('capture boundary');
set(p,read(p).slice(0,start)+`  const updateSources = change => {
    commitField('sourceRecords', old => { const sources = normalizeAppliedChallengeSources(old || data.sourceRecords); return normalizeAppliedChallengeSources(typeof change === 'function' ? change(sources) : change); });
    if (data.coachHint) commitField('coachHint', '');
  };
  const updateSource = (id, patch) => {
    if (isTeacherMode || learnerReadOnly || props.previewMode) return;
    const sources = latestDataRef.current.sourceRecords, source = sources.find(item => item.id === id);
    if (!source) return;
    if ('rowId' in patch && sources.some(item => item.id !== id && item.url === source.url && item.rowId === patch.rowId)) { addToast(tx('applied_challenge.sources.duplicate_connection', 'This source is already connected there. Your notes have not changed.'), 'info'); return; }
    updateSources(items => items.map(item => item.id === id ? { ...item, ...patch } : item));
  };
  const removeSource = id => {
    if (isTeacherMode || learnerReadOnly || props.previewMode) return;
    const sources = latestDataRef.current.sourceRecords, index = sources.findIndex(item => item.id === id);
    if (index < 0) return;
    rememberRemoval({ kind: 'source', value: sources[index], index });
    updateSources(items => items.filter(item => item.id !== id)); setFocusRequest({ elementId: 'aps-undo' });
  };
  const addOutsideReference = (result, rowId = '', manual = false) => {
    if (isTeacherMode || learnerReadOnly || props.previewMode || !resourceActive) return false;
    const current = latestDataRef.current, destination = manual || current.plan.visualMode === 'none' ? '' : rowId || 'new';
    const check = appliedChallengeSourceCaptureCheck(current.sourceRecords, current.evidenceLedger, current.workspace.evidence, result, destination);
    if (!check.ok) { addToast(tx('applied_challenge.sources.cannot_add', 'This source is already saved here, or the source list is full. Your notes have not changed.'), 'info'); return false; }
    const id = 'source-' + Date.now().toString(36) + '-' + String(++ledgerIdCounterRef.current);
    const connectedRow = destination === 'new' ? 'ledger-' + Date.now().toString(36) + '-' + String(++ledgerIdCounterRef.current) : destination;
    if (connectedRow) updateEvidenceLedger(rows => destination === 'new' ? rows.concat({ id: connectedRow, claim: '', evidence: '', tradeoff: '', status: 'needs-check' }) : rows.map(row => row.id === connectedRow ? { ...row, status: 'needs-check' } : row));
    const url = appliedChallengeSafeUrl(result.url);
    updateSources(items => items.concat({ id, url, rowId: connectedRow, title: _apsString(result.title, 350).trim() || new URL(url).hostname, foundAt: manual ? '' : result.foundAt, reviewNote: '', author: '', publicationDate: '' }));
    setLedgerExpanded(!!connectedRow); setReviewOpen(false); setFocusMode(true); setHintPhase('possibilities');
    setFocusRequest({ phase: 'possibilities', elementId: 'aps-source-note-' + id });
    return true;
  };

`+read(p).slice(end));
replace(p,'  const renderReview = () => {',`  const renderSources = editable => <AppliedChallengeSourceNotebook key={recoveryScope + (editable ? '-edit' : '-review')} sources={data.sourceRecords} rows={data.evidenceLedger} editable={editable && !isTeacherMode && !learnerReadOnly && !props.previewMode} onAdd={addOutsideReference} onUpdate={updateSource} onRemove={removeSource} onEdit={!isTeacherMode && !learnerReadOnly && !props.previewMode ? id => editReviewTarget({ phase: 'possibilities', elementId: 'aps-source-note-' + id }) : null} session={sourceNotebookSession} t={t} />;
  const renderReview = () => {`);
replace(p,'      {model.evidenceLedger.length > 0 && <section', '      {renderSources(false)}\n      {model.evidenceLedger.length > 0 && <section');
replace(p,'<AppliedChallengeSourceSearch key={recoveryScope}',"{renderSources(true)}<AppliedChallengeSourceSearch sourceRecords={data.sourceRecords} key={recoveryScope}");
// Shared response sanitizer remains usable when the full resource module is absent.
replace(sr,"const appliedFields = ['reasoningReferences'", "const appliedFields = ['sourceRecords', 'reasoningReferences'");
replace(sr,'coverage version workspaceFields evidenceRows', 'coverage version workspaceFields sourceRecords evidenceRows');
replace(sr,'  function toSubmission(resource, response) {',`  function safeAppliedSources(value) {
    const ids = new Set(), links = new Set(), out = [], text = (v,n) => typeof v === 'string' ? v.slice(0,n) : '';
    for (const item of Array.isArray(value) ? value : []) {
      if (!item || typeof item !== 'object' || out.length >= 24) continue;
      let url; try { url = new URL(text(item.url,2000)); if (!['http:','https:'].includes(url.protocol) || url.username || url.password) continue; } catch (_) { continue; }
      const rowId=text(item.rowId,80), link=url.href+'\\n'+rowId;
      if(links.has(link))continue; links.add(link);
      const base=text(item.id,80).replace(/[^A-Za-z0-9_-]/g,'-')||'source-'+out.length; let id=base,n=0;
      while(ids.has(id))id=base.slice(0,70)+'-'+(++n); ids.add(id);
      out.push({id,url:url.href,rowId,title:typeof item.title==='string'?text(item.title,350):url.hostname,foundAt:/^\\d{4}-\\d{2}-\\d{2}$/.test(item.foundAt)?item.foundAt:'',author:text(item.author,250),publicationDate:text(item.publicationDate,100),reviewNote:text(item.reviewNote,2000)});
    }
    return out;
  }
  function toSubmission(resource, response) {`);
replace(sr,'[key, textTree(raw[key])]',"[key, key === 'sourceRecords' ? safeAppliedSources(raw[key]) : textTree(raw[key])]");
replace(sr,'workspace: {}, reasoningReferences: []','workspace: {}, sourceRecords: [], reasoningReferences: []');
replace(sr,"['reasoningReferences', 'evidenceLedger', 'validationCycles'].some", "['sourceRecords', 'reasoningReferences', 'evidenceLedger', 'validationCycles'].some");
// Full HTML preserves a readable source list even without the resource module.
replace(doc,"['response','artifact','ledger'].includes(ref.source)","['response','artifact','ledger','sourceNote'].includes(ref.source)");
replace(doc,'                  reasoningReferences: (Array.isArray(raw.reasoningReferences)',`                  sourceRecords: (Array.isArray(raw.sourceRecords) ? raw.sourceRecords : []).filter(source => source && safeLink(source.url)).slice(0,24).map(source => ({url:safeLink(source.url),title:str(source.title,350),author:str(source.author,250),publicationDate:str(source.publicationDate,100),foundAt:/^\\d{4}-\\d{2}-\\d{2}$/.test(source.foundAt)?source.foundAt:'',reviewNote:str(source.reviewNote,2000),connectionLabel:source.rowId?'Connected evidence row: '+str(source.rowId,80):'For my overall reasoning'})),
                  reasoningReferences: (Array.isArray(raw.reasoningReferences)`);
replace(doc,'          const reasoningReferencesHtml =',`          const sourcesHtml = (m.sourceRecords || []).length ? '<section class="ace-panel"><h3 class="ace-h3">' + esc(tx('applied_challenge.sources.heading','Saved outside sources')) + '</h3><p>' + esc(tx('applied_challenge.sources.boundary','Citation details are separate from your writing. A source-check note records your review; it does not verify a claim. Links are not opened by AI.')) + '</p>' + m.sourceRecords.map(source => '<article><h4 class="ace-h4"><a href="' + esc(source.url) + '" rel="noopener noreferrer">' + esc(source.title || source.url) + '</a></h4><p>' + esc(source.connectionLabel) + '</p><p>' + esc([source.author,source.publicationDate].filter(Boolean).join(' · ')) + '</p>' + (source.foundAt ? '<p>' + esc(tx('applied_challenge.sources.found','Found on') + ' ' + source.foundAt) + '</p>' : '') + '<p class="ace-p ace-prewrap">' + esc(source.reviewNote || tx('applied_challenge.sources.not_recorded','Source check not recorded')) + '</p></article>').join('') + '</section>' : '';
          const reasoningReferencesHtml =`);
replace(doc,'+ workspaceHtml + reasoningReferencesHtml','+ workspaceHtml + reasoningReferencesHtml + sourcesHtml');
replace('_build_applied_challenge_module.js',"  '    normalizeAppliedChallengeData: normalizeAppliedChallengeData,',","  '    normalizeAppliedChallengeSources: normalizeAppliedChallengeSources,',\n  '    appliedChallengeSourceCaptureCheck: appliedChallengeSourceCaptureCheck,',\n  '    appliedChallengeSourceConnection: appliedChallengeSourceConnection,',\n  '    normalizeAppliedChallengeData: normalizeAppliedChallengeData,',");
for(const [name,content] of files)fs.writeFileSync(name,content);
fs.writeFileSync('public/studio_response_module.js',read(sr));
console.log('Pass 9 source notebook implementation written.');
