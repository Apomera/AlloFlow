const fs=require('fs');
let s=fs.readFileSync('story_forge_source.jsx','utf8').replace(/\r\n/g,'\n');
const rep=(a,b)=>{if(!s.includes(a))throw Error('Missing anchor: '+a.slice(0,90));s=s.replace(a,b)};
const between=(a,b,value)=>{const start=s.indexOf(a),end=s.indexOf(b,start);if(start<0||end<0)throw Error(a);s=s.slice(0,start)+value+s.slice(end)};
rep('// Authored content is shared', `// Lesson resources are proposals, never replacements for the authored project.
const prepareStoryForgeLessonImport = (resource) => {
  if (!resource || typeof resource !== 'object') throw new Error('Unsupported resource');
  if (resource.type === 'glossary') {
    const raw = resource.data?.terms || resource.data;
    if (!Array.isArray(raw)) throw new Error('Invalid vocabulary');
    const terms = raw.filter(item => item && typeof item === 'object').map(item => ({ term: item.term || item.word, definition: item.definition || item.def || '' }));
    const clean = sanitizeVocabTerms(terms) || [];
    if (!clean.length) throw new Error('Empty vocabulary');
    return { kind: 'vocabulary', terms: clean, total: terms.length };
  }
  if (resource.type === 'sentence-frames' || resource.type === 'timeline') {
    if (typeof resource.data !== 'string') throw new Error('Invalid lesson plan');
    const frames = resource.data.split(/\\r?\\n/).map(line => line.replace(/^\\s*(?:[-*•]|\\d+[.)])\\s*/, '').trim()).filter(Boolean);
    if (!frames.length) throw new Error('Empty lesson plan');
    const suggestions = normalizeStoryForgePlan({ frames: frames.slice(0, MAX_DRAFT_PARAGRAPHS) });
    return { kind: 'plan', suggestions, total: frames.length };
  }
  if (resource.type === 'simplified' || resource.type === 'lesson-plan') {
    const text = typeof resource.data === 'string' ? resource.data : resource.type === 'simplified' ? resource.data?.originalText : '';
    if (typeof text !== 'string' || !text.trim()) throw new Error('Empty starting idea');
    return { kind: 'prompt', prompt: text.trim().slice(0, 500), total: 1 };
  }
  throw new Error('Unsupported resource');
};
const mergeStoryForgeVocabulary = (existing, incoming) => {
  const result = [...(sanitizeVocabTerms(existing) || [])];
  const key = term => term.normalize('NFKC').toLowerCase();
  const known = new Set(result.map(item => key(item.term)));
  for (const item of sanitizeVocabTerms(incoming) || []) {
    if (result.length >= 64) break;
    if (!known.has(key(item.term))) { result.push(item); known.add(key(item.term)); }
  }
  return result;
};
const storyForgeSectionHasWork = (section, maps = []) => Boolean(section && (
  [section.text, section.scaffoldFrame, section.plotBeat].some(value => typeof value === 'string' && value.trim()) ||
  maps.some(map => map && map[section.id] != null)
));

// Authored content is shared`);
rep("const [planProposal, setPlanProposal] = useState(null);", `const [planProposal, setPlanProposal] = useState(null);
  const [lessonImportProposal, setLessonImportProposal] = useState(null);
  const lessonImportPreviewRef = useRef(null);
  const [projectMutationBusy, setProjectMutationBusy] = useState(false);
  const projectMutationBusyRef = useRef(false);
  const projectRevisionRef = useRef(null);
  const [projectActionUndo, setProjectActionUndo] = useState(null);`);
rep("  const [draftCount, setDraftCount] = useState(1);", `  const [draftCount, setDraftCount] = useState(1);
  // An identity token detects edits during asynchronous checkpoint writes without serializing media.
  projectRevisionRef.current = useMemo(() => ({}), [isOpen, SAVE_KEY, storyTitle, genre, vocabTerms, artStyle, customArtStyle, storyPrompt, rubricText, paragraphs, scaffoldsGenerated, draftCount, phase, language, customLanguage, storyShape, valenceByPara, artifactType, writingView, comicPageLayout, comicPageComposer, comicPrintSafety, comicContinuity, panelDialogue, panelDirections, panelThumbnails, panelLayouts, panelStickers, reviewedDraftSignature, illustrations, coverArt, audioSegments, audioStorePayload, comicFlowReport]);
  useEffect(() => { if (lessonImportProposal) lessonImportPreviewRef.current?.focus(); }, [lessonImportProposal]);
  useEffect(() => {
    if (!focusMode || phase !== 'write') return;
    const timer = setTimeout(() => {
      const card = document.getElementById('sf-para-' + paragraphs[focusParagraphIdx]?.id);
      const editor = card?.querySelector('textarea');
      editor?.focus({ preventScroll: true });
      card?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }, 0);
    return () => clearTimeout(timer);
  }, [focusMode, focusParagraphIdx, phase]);`);
rep("    setRevisionHistory(next);\n    setVaultStorageMode('vault');", "    revisionHistoryRef.current = next;\n    setRevisionHistory(next);\n    setVaultStorageMode('vault');");
between('  const restoreRevisionCheckpoint = (revision) => {', '  const draftSaveLabel =', `  const runRecoverableProjectEdit = async (label, commit, { version = projectRevisionRef.current, checkpoint = true } = {}) => {
    if (projectMutationBusyRef.current || draftHydrationState !== 'ready' || isProcessing) return false;
    projectMutationBusyRef.current = true;
    setProjectMutationBusy(true);
    const changed = () => {
      if (version === projectRevisionRef.current) return false;
      const message = ux('edit_changed', 'Your project changed while saving. Nothing was replaced. Try the action again.');
      if (addToast) addToast(message, 'info');
      sfAnnounce(message);
      return true;
    };
    try {
      if (changed()) return false;
      if (checkpoint && !(await saveRevisionCheckpoint(label))) return false;
      if (changed()) return false;
      const previous = checkpoint ? revisionHistoryRef.current[0] : null;
      commit();
      if (previous) setProjectActionUndo(previous);
      return true;
    } finally {
      projectMutationBusyRef.current = false;
      setProjectMutationBusy(false);
    }
  };
  const restoreRevisionCheckpoint = async (revision) => {
    if (!revision?.snapshot) return;
    await runRecoverableProjectEdit(ux('before_restore', 'Before restoring checkpoint'), () => {
      applySanitizedProject(revision.snapshot);
      setIsDirty(true);
      setDraftSaveState('saving');
      if (addToast) addToast(ta('a11y.storyforge_toast_checkpoint_restored').replace('{0}', revision.label || 'Production checkpoint'), 'success');
      sfAnnounce(ta('a11y.storyforge_checkpoint_restored').replace('{0}', revision.label || 'Production checkpoint'));
    });
  };
`);
rep("const persistDraftToStorage = async ({ announce = false, allowDuringHydration = false } = {}) => {", "const persistDraftToStorage = async ({ announce = false, allowDuringHydration = false } = {}) => {\n    if (projectMutationBusyRef.current) return false;");
// Do not let autosave overwrite the recovery checkpoint mid-operation; resume when it completes.
rep("    if (draftHydrationState !== 'ready' || showRestorePrompt) {\n      setDraftSaveState('paused');\n      return undefined;", "    if (draftHydrationState !== 'ready' || showRestorePrompt || projectMutationBusy) {\n      setDraftSaveState('paused');\n      return undefined;");
rep('}, [isOpen, draftHydrationState, showRestorePrompt, storyTitle,', '}, [isOpen, draftHydrationState, showRestorePrompt, projectMutationBusy, storyTitle,');
rep('  const applySanitizedDraft = (value) => {', '  const applySanitizedDraft = (value) => {\n    setLessonImportProposal(null);\n    setPlanProposal(null);\n    setProjectActionUndo(null);');
between('  const importFromResource = (resource) => {', '  // ── Phase navigation with focus management ──', `  const importFromResource = (resource) => {
    try {
      const proposal = prepareStoryForgeLessonImport(resource);
      setLessonImportProposal({ ...proposal, title: String(resource.title || resource.type).slice(0, 160), version: projectRevisionRef.current, sectionIds: paragraphs.map(p => p.id) });
    } catch (error) {
      const message = ux('lesson_invalid', 'This resource has no supported content to import. Your project has not changed.');
      if (addToast) addToast(message, 'info');
      sfAnnounce(message);
    }
  };
  const applyLessonImport = async () => {
    const proposal = lessonImportProposal;
    if (!proposal) return;
    const saved = await runRecoverableProjectEdit(ux('before_lesson', 'Before lesson import'), () => {
      if (proposal.kind === 'vocabulary') setVocabTerms(current => mergeStoryForgeVocabulary(current, proposal.terms));
      else if (proposal.kind === 'prompt') setStoryPrompt(proposal.prompt);
      else {
        setParagraphs(current => mergeStoryForgePlan(current, proposal.suggestions, proposal.sectionIds));
        setScaffoldsGenerated(true);
      }
      setIsDirty(true);
      setLessonImportProposal(null);
      sfAnnounce(ux('lesson_applied', 'Lesson resource applied. Your writing is preserved and a checkpoint is available.'));
    }, { version: proposal.version });
    if (!saved && proposal.version !== projectRevisionRef.current) setLessonImportProposal(null);
  };

  // ── Phase navigation with focus management ──`);
// Keep deletion's existing asset pruning, but protect authored material with a durable checkpoint.
rep('  const removeParagraph = (idx) => {\n    if (paragraphs.length <= 1) return;', `  const removeParagraph = async (idx) => {
    if (paragraphs.length <= 1 || !paragraphs[idx]) return;
    const checkpoint = storyForgeSectionHasWork(paragraphs[idx], [audioSegments, illustrations, panelDialogue, panelDirections, panelThumbnails, panelLayouts, panelStickers]);
    await runRecoverableProjectEdit(ux('before_remove', 'Before removing a section'), () => {
      removeParagraphNow(idx);
    }, { checkpoint });
  };
  const removeParagraphNow = (idx) => {
    if (paragraphs.length <= 1) return;`);
rep('onClick={() => removeParagraph(idx)} className=', 'onClick={() => void removeParagraph(idx)} disabled={projectMutationBusy || isProcessing} className=');
rep("const newId = \x60p-\x24{Date.now()}\x60;", "const newId = \x60p-\x24{Date.now()}-\x24{Math.random().toString(36).slice(2, 7)}\x60;");
rep("setParagraphs(prev => [...prev, { id: newId, text: '', scaffoldFrame: '', plotBeat: '' }]);", "setParagraphs(prev => prev.length >= maxParagraphs ? prev : [...prev, { id: newId, text: '', scaffoldFrame: '', plotBeat: '' }]);");
rep("if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });", "if (el) { el.querySelector('textarea')?.focus({ preventScroll: true }); el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' }); }");
// Make the Project menu usable as a compact revision browser at every workflow step.
rep('<div className="absolute right-0 z-[260] mt-2 w-72', '<div className="sf-project-menu-panel absolute right-0 z-[260] mt-2 w-72');
rep('<span className="hidden sm:inline">{ta(\'a11y.storyforge_ui_project\')}</span>', '<span>{ta(\'a11y.storyforge_ui_project\')}</span>');
rep('              <p className="mt-3 px-2 text-[11px] leading-relaxed text-slate-500">{ta(\'a11y.storyforge_ui_backups_and_checkpoints_preserve_work_before\')}</p>', `              {draftHydrationState === 'ready' && (
                <section className="mt-3 border-t border-slate-200 pt-3" aria-labelledby="sf-menu-checkpoints-title">
                  <h3 id="sf-menu-checkpoints-title" className="text-xs font-bold text-slate-800">{ux('checkpoints', 'Checkpoints')}</h3>
                  <label className="mt-2 block text-xs text-slate-700">
                    {ux('checkpoint_name', 'Name the next checkpoint')}
                    <input data-sf-checkpoint-name value={revisionLabel} onChange={e => setRevisionLabel(e.target.value.slice(0, 100))} className="mt-1 w-full rounded-lg border border-slate-400 p-2 text-sm" placeholder={ux('checkpoint_example', 'For example: before the ending')} />
                  </label>
                  <p className="mt-2 text-xs text-slate-600">{ux('checkpoint_restore_help', 'Restoring saves your current version first, so you can undo it.')}</p>
                  {revisionHistory.length === 0 ? <p className="mt-2 text-xs text-slate-600">{ux('no_checkpoints', 'No checkpoints yet. Name one above, then choose Save checkpoint.')}</p> : (
                    <ul className="mt-2 space-y-1">{revisionHistory.slice(0, 6).map(revision => (
                      <li key={revision.id}><button type="button" data-sf-menu-checkpoint={revision.id} disabled={projectMutationBusy || isProcessing} onClick={event => { const menu = event.currentTarget.closest('details'); if (menu) menu.open = false; void restoreRevisionCheckpoint(revision); }} className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-left text-xs text-slate-800 hover:bg-slate-100 disabled:opacity-50">
                        <span className="block font-bold">{revision.label}</span><span className="block mt-1">{new Date(revision.savedAt).toLocaleString()}</span>
                      </button></li>
                    ))}</ul>
                  )}
                </section>
              )}
              <p className="mt-3 px-2 text-[11px] leading-relaxed text-slate-500">{ta('a11y.storyforge_ui_backups_and_checkpoints_preserve_work_before')}</p>`);
// Block duplicate mutable menu actions during checkpoint writes.
s=s.replaceAll("disabled={draftHydrationState !== 'ready' || draftSaveState === 'saving'}", "disabled={projectMutationBusy || draftHydrationState !== 'ready' || draftSaveState === 'saving'}");
rep('data-sf-project-menu-import onClick={importDraftJSON} disabled={draftHydrationState', 'data-sf-project-menu-import onClick={importDraftJSON} disabled={projectMutationBusy || draftHydrationState');
rep('      <div className="sf-mobile-workflow">', `      {projectActionUndo && <div className="sf-undo-notice flex shrink-0 flex-wrap items-center gap-2 border-b border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-900">
        <span role="status" className="flex-1">{ux('previous_saved', 'Your previous version is saved.')}</span>
        <button type="button" data-sf-undo-project-edit disabled={projectMutationBusy || isProcessing} onClick={() => void restoreRevisionCheckpoint(projectActionUndo)} className="min-h-11 rounded-lg border border-indigo-400 px-3 py-2 font-bold disabled:opacity-50">{ux('undo_last_change', 'Undo last change')}</button>
        <button type="button" onClick={() => setProjectActionUndo(null)} className="min-h-11 rounded-lg px-2 underline">{ux('dismiss', 'Dismiss')}</button>
      </div>}
      <div className="sf-mobile-workflow">`);
rep('              {/* ── Import from Lesson Resources ── */}', `              {lessonImportProposal && (
                <section ref={lessonImportPreviewRef} tabIndex={-1} data-sf-lesson-preview aria-labelledby="sf-lesson-preview-title" className="rounded-2xl border-2 border-indigo-300 bg-indigo-50 p-4">
                  <h3 id="sf-lesson-preview-title" className="font-bold text-indigo-900">{ux('lesson_preview', 'Preview lesson import')}: {lessonImportProposal.title}</h3>
                  <p className="mt-2 text-sm text-indigo-900">{ux('lesson_preserves', 'Your scenes, writing, dialogue, and artwork stay intact. Applying saves a checkpoint first.')}</p>
                  {lessonImportProposal.kind === 'plan' && <>
                    <p className="mt-2 text-sm text-slate-800">{ux('lesson_prompts', 'These planning prompts replace the prompts for matching sections. Extra authored sections are kept.')}</p>
                    <ol className="my-3 list-decimal space-y-2 pl-5 text-sm text-slate-800">{lessonImportProposal.suggestions.map((item, index) => <li key={index}>{item.scaffoldFrame}</li>)}</ol>
                    {lessonImportProposal.total > maxParagraphs && <p className="text-sm font-bold text-amber-900">{ux('lesson_limit', 'Only the first {0} sections fit in this project.').replace('{0}', maxParagraphs)}</p>}
                  </>}
                  {lessonImportProposal.kind === 'vocabulary' && <>
                    <p className="mt-2 text-sm text-slate-800">{ux('lesson_vocab', 'New goals are added. Existing goals and definitions are kept; duplicates are skipped. Projects support up to 64 goals.')}</p>
                    <ul className="my-3 list-disc pl-5 text-sm text-slate-800">{lessonImportProposal.terms.map((item, index) => <li key={index}>{item.term}</li>)}</ul>
                  </>}
                  {lessonImportProposal.kind === 'prompt' && <>
                    {storyPrompt && <p className="mt-3 text-sm text-slate-700"><strong>{ux('current_idea', 'Current starting idea')}: </strong>{storyPrompt}</p>}
                    <p className="my-3 text-sm text-slate-800"><strong>{ux('new_idea', 'New starting idea')}: </strong>{lessonImportProposal.prompt}</p>
                  </>}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" data-sf-apply-lesson onClick={() => void applyLessonImport()} disabled={projectMutationBusy || isProcessing} className="min-h-11 rounded-lg bg-indigo-700 px-4 py-2 font-bold text-white disabled:opacity-50">{ux('apply_lesson', 'Apply lesson resource')}</button>
                    <button type="button" onClick={() => setLessonImportProposal(null)} className="min-h-11 rounded-lg border border-slate-400 bg-white px-4 py-2 font-bold text-slate-800">{ux('cancel_lesson', 'Keep current project')}</button>
                  </div>
                </section>
              )}
              {/* ── Import from Lesson Resources ── */}`);
// Focus navigation: numbered, touch-sized targets; honest limit state; predictable keyboard focus.
rep('className="flex items-center justify-between bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-3"', 'data-sf-focus-navigation className="flex flex-wrap items-center justify-between gap-2 bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-3"');
rep('<div className="text-center">\n                    <div className="text-xs font-bold text-indigo-700">', '<div className="sf-focus-summary text-center">\n                    <div className="text-xs font-bold text-indigo-700">');
rep('<div className="text-[11px] text-indigo-400 mt-0.5">', '<div className="text-[11px] text-indigo-700 mt-0.5">');
rep('<div className="flex justify-center gap-1 mt-1.5">\n                      {paragraphs.map', '<div className="sf-focus-jumps flex flex-wrap justify-center gap-1 mt-1.5" role="group" aria-label={ux(\'choose_section\', \'Choose a section\')}>\n                      {paragraphs.map');
rep("className={\x60w-2 h-2 rounded-full transition-all \x24{\n                            pi === focusParagraphIdx ? 'bg-indigo-600 scale-125' : pp.text.trim().length > 10 ? 'bg-green-400' : 'bg-slate-300'\n                          }\x60}", "className={\x60sf-focus-jump rounded-lg border font-bold transition-colors \x24{\n                            pi === focusParagraphIdx ? 'bg-indigo-700 text-white border-indigo-700' : 'bg-white text-indigo-900 border-indigo-300'\n                          }\x60}");
rep("aria-current={pi === focusParagraphIdx ? 'true' : undefined}\n                        />", "aria-current={pi === focusParagraphIdx ? 'true' : undefined}\n                        >{pi + 1}</button>");
rep("                    {focusParagraphIdx >= paragraphs.length - 1\n                      ? (artifactType === 'comic' ? '+ New panel' : '+ New scene')", "                    {focusParagraphIdx >= paragraphs.length - 1\n                      ? (paragraphs.length >= maxParagraphs ? ux('section_limit', 'Section limit reached') : artifactType === 'comic' ? '+ New panel' : '+ New scene')");
rep("if (focusParagraphIdx >= paragraphs.length - 1) {\n                        // Add new paragraph if at end", "if (focusParagraphIdx >= paragraphs.length - 1) {\n                        // Add new paragraph if at end");
const focusStart=s.indexOf('data-sf-focus-navigation');const focusEnd=s.indexOf('{/* Paragraph Cards */}',focusStart);
let focus=s.slice(focusStart,focusEnd);const nextClass='className="px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-colors flex items-center gap-1"';
if(!focus.includes(nextClass))throw Error('focus next');focus=focus.replace(nextClass,'data-sf-focus-next disabled={focusParagraphIdx >= paragraphs.length - 1 && paragraphs.length >= maxParagraphs} '+nextClass);s=s.slice(0,focusStart)+focus+s.slice(focusEnd);
rep('.sf-mobile-workflow{display:none}', `.sf-mobile-workflow{display:none}
        .sf-project-menu-panel{max-height:calc(100dvh - 6rem);overflow-y:auto;overscroll-behavior:contain}
        .sf-modal-root .sf-focus-jump{width:44px;height:44px;flex-shrink:0}
        [data-sf-focus-navigation]>button{min-height:44px;max-width:45%}
        @media(max-width:639px){.sf-focus-summary{order:3;width:100%}.sf-focus-jumps{max-width:100%}}
        .sf-modal-root.theme-dark .sf-undo-notice{background:#172554;color:#e0e7ff;border-color:#6366f1}
        .sf-modal-root.theme-contrast .sf-undo-notice{background:#000;color:#ff0;border-color:#ff0}`);
fs.writeFileSync('story_forge_source.jsx',s);
let b=fs.readFileSync('_build_story_forge_module.js','utf8');b=b.replace('_meta = { getComicExportProof,','_meta = { prepareStoryForgeLessonImport, mergeStoryForgeVocabulary, storyForgeSectionHasWork, getComicExportProof,');fs.writeFileSync('_build_story_forge_module.js',b);
const strings={};for(const m of s.matchAll(/ux\('([^']+)', '([^']+)'\)/g))strings[m[1]]=m[2];
for(const p of ['ui_strings.js','desktop/web-app/public/ui_strings.js']){let last;for(let n=0;n<15;n++)try{const d=JSON.parse(fs.readFileSync(p,'utf8'));d.storyforge_updates={...d.storyforge_updates,...strings};fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');last=null;break}catch(e){last=e;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,250)}if(last)throw last;}
console.log('Second pass implemented');
