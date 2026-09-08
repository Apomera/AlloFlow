const fs=require('fs');let p='story_forge_source.jsx';let s=fs.readFileSync(p,'utf8');
function replace(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,90));s=s.replace(a,b);}
replace('const normalizeStoryForgeFeedback = (value) => {',`const normalizeStoryForgeCoach = (kind, value) => {
  const str = v => { if (v == null) return ''; if (typeof v !== 'string') throw Error('Invalid coach text'); return v.slice(0, 6000); };
  const obj = v => { if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error('Invalid coach object'); return v; };
  const fields = (v, names) => { obj(v); return Object.fromEntries(names.map(k => [k, str(v[k])])); };
  const list = (v, fn, max = 32) => { if (!Array.isArray(v) || v.length > max) throw Error('Invalid coach list'); return v.map(fn); };
  const counts = v => { obj(v); if (Object.keys(v).length > 64) throw Error('Too many counts'); return Object.fromEntries(Object.entries(v).map(([k,n]) => { if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) throw Error('Invalid count'); return [k.slice(0,100), n]; })); };
  obj(value);
  if (kind === 'help') return { suggestions: list(value.suggestions, str, 8) };
  if (kind === 'senses') return { ...fields(value, ['strongest','missing','suggestion']), counts: counts(value.counts) };
  if (kind === 'show') return { summary: str(value.summary), tellings: list(value.tellings, v => fields(v,['telling','showing','why']), 8) };
  if (kind === 'arcs') return { summary: str(value.summary), characters: list(value.characters, v => ({ ...fields(v,['name','role','suggestion']), beats: Object.fromEntries(['introduction','want','change','resolution'].map(k => [k, fields(obj(v.beats)[k], ['status','evidence'])])) }), 3) };
  if (kind === 'dialogue') return { summary: str(value.summary), tagCounts: counts(value.tagCounts), overusedTag: str(value.overusedTag), issues: list(value.issues, v => fields(v,['type','line','suggestion','why']), 8) };
  if (kind === 'revision') return { encouragement: str(value.encouragement), tasks: list(value.tasks, v => fields(v,['title','source','detail','why']), 8) };
  if (kind === 'mentor') {
    const mentor = { ...fields(value.mentor,['title','author','text','sourceUrl']), year: value.mentor.year == null ? '' : str(String(value.mentor.year)), uncertain: value.mentor.uncertain === true };
    if (value.mentor.year != null && !['string','number'].includes(typeof value.mentor.year)) throw Error('Invalid mentor year');
    if (mentor.sourceUrl && !/^https?:\\/\\//i.test(mentor.sourceUrl)) throw Error('Invalid mentor URL');
    if (mentor.uncertain) mentor.text = '';
    return { ...fields(value,['sharedTheme','craftToBorrow','studentEcho']), mentor };
  }
  throw Error('Unknown coach');
};

const normalizeStoryForgeFeedback = (value) => {`);
// Imported optional feedback cannot bypass live-response validation.
replace('  const savedReviewSignature = typeof snapshot.reviewedDraftSignature',`  let invalidReviewData = false;
  let cleanGrading = null;
  if (importedReview.gradingResult != null) {
    try { cleanGrading = normalizeStoryForgeFeedback(importedReview.gradingResult); }
    catch (_) { invalidReviewData = true; }
  }
  const cleanReview = { ...importedReview, gradingResult: cleanGrading };
  const savedReviewSignature = typeof snapshot.reviewedDraftSignature`);
replace('    review: importedReview,','    review: cleanReview,\n    invalidReviewData,');
replace("hasReviewData: version >= 2 && value.purpose !== 'handoff' && Boolean(","hasReviewData: !invalidReviewData && version >= 2 && value.purpose !== 'handoff' && Boolean(");
replace('    const summary = validated.summary;\n    const packageDetail',`    if (validated.invalidReviewData) {
      const message = ux('import_review_invalid', 'Your writing was recovered, but the saved feedback was invalid. Complete a new review to continue.');
      setCoachNotice(message);
      if (addToast) addToast(message, 'info');
    }
    const summary = validated.summary;
    const packageDetail`);
replace('  const [gradingResult, setGradingResult] = useState(null);',`  const [gradingResult, setGradingResult] = useState(null);
  const [coachNotice, setCoachNotice] = useState('');
  const [comicEditProposal, setComicEditProposal] = useState(null);
  const comicEditPreviewRef = useRef(null);
  useEffect(() => { if (comicEditProposal) comicEditPreviewRef.current?.focus(); }, [comicEditProposal]);`);
replace("    setFeedbackNotice('');\n    setGradingResult(null);","    setFeedbackNotice('');\n    setCoachNotice('');\n    setGradingResult(null);");
// Extend validation and current-draft checks to optional coaches.
const coaches=[['helpMeWrite','help','setHelpMeResult'],['findMentorStory','mentor','setMentorLoading'],['checkSenses','senses','setSensesLoading'],['analyzeShowTell','show','setShowTellLoading'],['analyzeCharacterArcs','arcs','setArcLoading'],['analyzeDialogue','dialogue','setDialogueLoading'],['synthesizeRevisionPlan','revision','setRevisionPlanLoading']];
for(const [name,kind,setter] of coaches){
 const start=s.indexOf('  const '+name+' = async');const end=s.indexOf('\n  };',start)+5;if(start<0||end<5)throw Error(name);
 let b=s.slice(start,end);const opening=b.indexOf('\n');b=b.slice(0,opening)+`\n    const coachVersion = feedbackStateRef.current;\n    setCoachNotice('');`+b.slice(opening);
 b=b.replaceAll("const fullText = paragraphs.map(p => p.text.trim()).filter(Boolean).join('\\n\\n');","const fullText = authoredText;");
 b=b.replace("const fullText = paragraphs.map((p, i) => `[Paragraph ${i + 1}] ${p.text.trim()}`).filter(Boolean).join('\\n\\n');","const fullText = authoredText;");
 if(kind==='dialogue')b=b.replace("if (!fullText.includes", "if (!(layoutMode === 'comic' && paragraphs.some(p => panelDialogue[p.id]?.speech)) && !fullText.includes");
 const variable=kind==='mentor'?'parsed':'data';
 b=b.replace('const '+variable+' = JSON.parse(cleanJson(result));',`const ${variable} = normalizeStoryForgeCoach('${kind}', JSON.parse(cleanJson(result)));\n      if (coachVersion !== feedbackStateRef.current) throw Error('Draft changed during coaching');`);
 b=b.replace("    } catch (err) {",`    } catch (err) {
      setCoachNotice(ux('coach_failed', 'This coach could not finish for the current draft. Your writing is safe. Try the tool again, or use your self-check.'));`);
 if(kind==='help')b=b.replace('      setHelpMeResult([', '      if (coachVersion === feedbackStateRef.current) setHelpMeResult([');
 s=s.slice(0,start)+b+s.slice(end);
}
// Generated bubble changes are proposals, never immediate replacements.
for(const name of ['draftComicBubbles','tightenComicBubbles']){
 const start=s.indexOf('  const '+name+' = async');const end=s.indexOf('\n  };',start)+5;let b=s.slice(start,end);
 const opening=b.indexOf('\n');b=b.slice(0,opening)+'\n    const proposalVersion = projectRevisionRef.current;'+b.slice(opening);
 const a=b.indexOf(name==='draftComicBubbles'?'      const dialogueApplied =':'      const applied =');const z=b.indexOf('\n    } catch (err)',a);
 if(a<0||z<0)throw Error('comic replace missing');
 b=b.slice(0,a)+`      if (proposalVersion !== projectRevisionRef.current) throw Error('Draft changed during generation');
      if (!Object.keys(updates).length) throw Error('No valid comic edits');
      setComicEditProposal({ version: proposalVersion, updates, directions: ${name==='draftComicBubbles'?'directionUpdates':'{}'}, before: panelDialogue, beforeDirections: panelDirections });`+b.slice(z);
 s=s.slice(0,start)+b+s.slice(end);
}
replace('  const draftComicBubbles = async (targetIdx = null) => {',`  const applyComicEditProposal = async () => {
    const proposal = comicEditProposal;
    if (!proposal) return;
    const applied = await runRecoverableProjectEdit(ux('before_comic_edit', 'Before applying comic bubble suggestions'), () => {
      setPanelDialogue(prev => { const next = { ...prev }; Object.entries(proposal.updates).forEach(([id,value]) => { next[id] = value; }); return next; });
      setPanelDirections(prev => { const next = { ...prev }; Object.entries(proposal.directions).forEach(([id,value]) => { next[id] = { ...(next[id] || {}), ...value }; }); return next; });
      setIsDirty(true);
      setComicEditProposal(null);
    }, { version: proposal.version });
    if (!applied && proposal.version !== projectRevisionRef.current) setComicEditProposal(null);
  };

  const draftComicBubbles = async (targetIdx = null) => {`);
replace('              {/* ═══ Pre-grade Self-Assessment ═══ */}',`              {coachNotice && <p data-sf-coach-notice role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{coachNotice}</p>}
              {/* ═══ Pre-grade Self-Assessment ═══ */}`);
replace('          {/* ═══ REVIEW PHASE ═══ */}',`          {/* ═══ REVIEW PHASE ═══ */}`);
// Place the preview within the scrollable Draft work area.
replace('              {/* ═══ Pre-grade Self-Assessment ═══ */}','              {/* ═══ Pre-grade Self-Assessment ═══ */}');
const marker='              {planProposal && (';if(!s.includes(marker))throw Error('plan marker');
s=s.replace(marker,`              {comicEditProposal && (
                <section ref={comicEditPreviewRef} tabIndex={-1} data-sf-comic-edit-preview aria-labelledby="sf-comic-edit-title" className="rounded-2xl border-2 border-indigo-300 bg-indigo-50 p-4">
                  <h4 id="sf-comic-edit-title" className="font-bold text-indigo-950">{ux('comic_edit_preview', 'Review comic bubble suggestions')}</h4>
                  <p className="mt-1 text-sm text-indigo-900">{ux('comic_edit_explanation', 'Compare your current text with the suggestions. Applying replaces these bubble fields and any proposed directions, and saves a checkpoint for Undo.')}</p>
                  {Object.entries(comicEditProposal.updates).map(([id, value]) => (
                    <div key={id} className="mt-3 rounded-xl border border-indigo-200 bg-white p-3 text-sm text-slate-800">
                      <p className="font-bold">{ux('panel', 'Panel')} {paragraphs.findIndex(p => p.id === id) + 1}</p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[['Current', comicEditProposal.before[id] || {}, comicEditProposal.beforeDirections[id] || {}], ['Suggested', value, comicEditProposal.directions[id] || comicEditProposal.beforeDirections[id] || {}]].map(([label, dialogue, direction]) => <div key={label}><h5 className="font-bold">{ux(label.toLowerCase(), label)}</h5><dl>{Object.entries({ ...dialogue, ...direction }).map(([key,text]) => <div key={key}><dt className="font-medium">{key}</dt><dd className="whitespace-pre-wrap break-words">{text || '—'}</dd></div>)}</dl></div>)}
                      </div>
                    </div>
                  ))}
                  <button type="button" data-sf-apply-comic-edit onClick={() => void applyComicEditProposal()} disabled={isProcessing || projectMutationBusy} className="mt-3 min-h-11 rounded-lg bg-indigo-700 px-4 py-2 font-bold text-white disabled:opacity-50">{ux('apply_comic_edit', 'Apply suggestions')}</button>
                  <button type="button" onClick={() => setComicEditProposal(null)} className="mt-3 ml-2 min-h-11 rounded-lg border border-indigo-400 px-4 py-2 font-bold text-indigo-900">{ux('discard_comic_edit', 'Keep my version')}</button>
                </section>
              )}
`+marker);
fs.writeFileSync(p,s);
p='_build_story_forge_module.js';s=fs.readFileSync(p,'utf8').replace('_meta = { normalizeStoryForgeFeedback','_meta = { normalizeStoryForgeCoach, normalizeStoryForgeFeedback');fs.writeFileSync(p,s);
