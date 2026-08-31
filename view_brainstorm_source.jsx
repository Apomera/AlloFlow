
// ── Activity-kind bodies (2026-08-16 Activities redesign) ──────────────────
// Brainstorm data items may carry an optional `kind`: absent/'idea' renders the
// classic idea card; 'discussion' and 'jigsaw' render the structured bodies
// below. Bodies are VIEW-ONLY in v1 (no inline editing — regenerate instead);
// the shared ladder (guide/worksheet/rubric) still applies to every kind.
// Shapes are pure data (docs/ACTIVITIES_RESOURCE_DESIGN_2026-08-16.md §D4).

function activityDisplayText(value) {
  return String(value == null ? '' : value)
    .replace(/&lt;br\s*\/?&gt;/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/(^|\n)\s*#{1,6}\s+(?=\S)/g, '$1')
    .replace(/(^|\n)\s*#{1,6}\s*(?=\n|$)/g, '$1')
    .trim();
}

function ActivityArtifactSummary(props) {
  var item = props.item || {};
  var t = props.t;
  var definitions = [
    ['guide', t('brainstorm.teacher_guide') || 'Teacher guide'],
    ['worksheet', t('brainstorm.student_worksheet') || 'Student worksheet'],
    ['rubric', t('brainstorm.activity_rubric') || 'Activity rubric'],
    ['cover', t('brainstorm.cover') || 'Cover image']
  ];
  var statusText = { 'not-created': 'not created', generating: 'creating', ready: 'ready', edited: 'edited', failed: 'needs retry' };
  var readyCount = 0;
  var pills = definitions.map(function (entry) {
    var kind = entry[0];
    var value = kind === 'cover' ? item.coverImage : item[kind];
    var hasValue = kind === 'rubric' ? !!(value && Array.isArray(value.criteria) && value.criteria.length) : !!(typeof value === 'string' ? value.trim() : value);
    var meta = item.derivatives && item.derivatives[kind];
    var status = meta && meta.status ? meta.status : (hasValue ? 'ready' : 'not-created');
    if (hasValue) readyCount++;
    return <span key={kind} className="text-[10px] font-bold rounded-full border px-2 py-0.5 border-slate-200 bg-slate-50 text-slate-700">
      {entry[1]}: {statusText[status] || status}
    </span>;
  });
  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-3" aria-label={(t('brainstorm.resource_status') || 'Activity resources') + ': ' + readyCount + '/' + definitions.length}>
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 mr-1">{t('brainstorm.resource_status') || 'Resources'}</span>
      {pills}
    </div>
  );
}

function DiscussionKitBody(props) {
  var t = props.t;
  var item = props.item;
  var isTeacherMode = props.isTeacherMode;
  var renderFormattedText = props.renderFormattedText;
  var protocolLabel = t('brainstorm.protocol_' + String(item.protocol || '').replace(/-/g, '_'))
    || ({ 'socratic-seminar': 'Socratic Seminar', 'think-pair-share': 'Think-Pair-Share', 'fishbowl': 'Fishbowl', 'gallery-walk': 'Gallery Walk' }[item.protocol] || item.protocol || 'Discussion');
  var stemCats = ['agree', 'disagree', 'clarify', 'build'];
  var stemLabels = {
    agree: t('brainstorm.stems_agree') || 'Agreeing',
    disagree: t('brainstorm.stems_disagree') || 'Disagreeing respectfully',
    clarify: t('brainstorm.stems_clarify') || 'Asking for clarity',
    build: t('brainstorm.stems_build') || 'Building on ideas',
  };
  var depthLabels = {
    literal: t('brainstorm.depth_literal') || 'Right there in the text',
    inferential: t('brainstorm.depth_inferential') || 'Between the lines',
    evaluative: t('brainstorm.depth_evaluative') || 'Your judgment',
  };
  var stems = item.talkStems && typeof item.talkStems === 'object' ? item.talkStems : {};
  var hasStems = stemCats.some(function (c) { return Array.isArray(stems[c]) && stems[c].length; });
  return (
    <div data-help-key="brainstorm_discussion_card">
      <h4 className="font-bold text-lg text-indigo-900 mb-1 flex items-center gap-2">
        <MessageSquare size={18} className="text-cyan-700 shrink-0"/> {activityDisplayText(item.title)}
      </h4>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider bg-cyan-50 text-cyan-900 border border-cyan-200 rounded-full px-2.5 py-0.5">{protocolLabel}</span>
        {item.grouping ? <span className="text-xs text-slate-600">{activityDisplayText(item.grouping)}</span> : null}
      </div>
      {item.openingQuestion ? (
        <p className="text-sm font-semibold text-slate-800 bg-cyan-50/60 border border-cyan-100 rounded-lg p-3 mb-4 whitespace-pre-line">{activityDisplayText(item.openingQuestion)}</p>
      ) : null}
      {(Array.isArray(item.questionSets) ? item.questionSets : []).map(function (set, setIdx) {
        var qs = set && Array.isArray(set.questions) ? set.questions : [];
        if (!qs.length) return null;
        return (
          <div key={setIdx} className="mb-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">{depthLabels[set.depth] || set.depth || ''}</h5>
            <ol className="list-decimal ml-5 text-sm text-slate-700 space-y-1">
              {qs.map(function (q, qIdx) { return <li key={qIdx}>{activityDisplayText(q)}</li>; })}
            </ol>
          </div>
        );
      })}
      {hasStems ? (
        <div className="mb-4">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">{t('brainstorm.talk_stems') || 'Talk stems'}</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {stemCats.map(function (cat) {
              var list = Array.isArray(stems[cat]) ? stems[cat] : [];
              if (!list.length) return null;
              return (
                <div key={cat} className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <strong className="block text-[11px] uppercase tracking-wider text-slate-600 mb-1">{stemLabels[cat]}</strong>
                  <ul className="text-xs text-slate-700 space-y-1">
                    {list.map(function (s, sIdx) { return <li key={sIdx}>&ldquo;{activityDisplayText(s)}&rdquo;</li>; })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      {isTeacherMode && item.facilitationNotes ? (
        <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 border border-slate-300 mb-3">
          <h5 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><ListChecks size={16}/> {t('brainstorm.facilitation_notes') || 'Facilitation notes (teacher)'}</h5>
          <div className="prose prose-sm max-w-none">{renderFormattedText(item.facilitationNotes)}</div>
        </div>
      ) : null}
      {isTeacherMode && Array.isArray(item.lookFors) && item.lookFors.length ? (
        <div className="text-xs text-slate-600 mb-3">
          <strong className="block uppercase tracking-wider text-[11px] mb-1">{t('brainstorm.look_fors') || 'Participation look-fors'}</strong>
          <ul className="list-disc ml-4 space-y-0.5">
            {item.lookFors.map(function (l, lIdx) { return <li key={lIdx}>{activityDisplayText(l)}</li>; })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function JigsawBody(props) {
  var t = props.t;
  var item = props.item;
  var isTeacherMode = props.isTeacherMode;
  var renderFormattedText = props.renderFormattedText;
  var chunks = Array.isArray(item.chunks) ? item.chunks : [];
  var checks = Array.isArray(item.accountabilityCheck) ? item.accountabilityCheck : [];
  return (
    <div data-help-key="brainstorm_jigsaw_card">
      <h4 className="font-bold text-lg text-indigo-900 mb-1 flex items-center gap-2">
        <Users size={18} className="text-emerald-700 shrink-0"/> {activityDisplayText(item.title)}
      </h4>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-full px-2.5 py-0.5">
          {(t('brainstorm.jigsaw_group_size') || 'Home groups of {n}').replace('{n}', String(item.groupSize || chunks.length || 4))}
        </span>
      </div>
      {chunks.map(function (chunk, cIdx) {
        var tb = chunk && chunk.teachBack && typeof chunk.teachBack === 'object' ? chunk.teachBack : {};
        var keyPoints = Array.isArray(tb.keyPoints) ? tb.keyPoints : [];
        var checkQs = Array.isArray(tb.checkQuestions) ? tb.checkQuestions : [];
        return (
          <details key={cIdx} className="mb-2 rounded-lg border border-emerald-200 bg-white group">
            <summary className="cursor-pointer list-none px-3 py-2 text-sm font-bold text-emerald-900 flex items-center justify-between hover:bg-emerald-50 rounded-lg">
              <span>{activityDisplayText(chunk.label || ((t('brainstorm.expert_group') || 'Expert group') + ' ' + (cIdx + 1)))}</span>
              <span className="text-emerald-700/70 group-open:rotate-180 transition-transform motion-reduce:transition-none" aria-hidden="true">&#9662;</span>
            </summary>
            <div className="px-3 pb-3 pt-1 text-sm text-slate-700">
              <div className="prose prose-sm max-w-none mb-2">{renderFormattedText(chunk.expertPacket || '')}</div>
              {keyPoints.length ? (
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-2.5 mb-2">
                  <strong className="block text-[11px] uppercase tracking-wider text-emerald-900 mb-1">{t('brainstorm.teach_back_points') || 'When you teach your group, cover:'}</strong>
                  <ul className="list-disc ml-4 text-xs space-y-0.5">
                    {keyPoints.map(function (p, pIdx) { return <li key={pIdx}>{activityDisplayText(p)}</li>; })}
                  </ul>
                </div>
              ) : null}
              {checkQs.length ? (
                <div className="text-xs text-slate-600">
                  <strong className="block uppercase tracking-wider text-[11px] mb-1">{t('brainstorm.teach_back_questions') || 'Check your group understood:'}</strong>
                  <ol className="list-decimal ml-4 space-y-0.5">
                    {checkQs.map(function (q, qIdx) { return <li key={qIdx}>{activityDisplayText(q)}</li>; })}
                  </ol>
                </div>
              ) : null}
            </div>
          </details>
        );
      })}
      {item.homeGroupTask ? (
        <div className="mt-3 mb-2">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">{t('brainstorm.home_group_task') || 'Home-group task'}</h5>
          <div className="prose prose-sm max-w-none text-sm text-slate-700">{renderFormattedText(item.homeGroupTask)}</div>
        </div>
      ) : null}
      {item.synthesisOrganizer ? (
        <div className="mb-2">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">{t('brainstorm.synthesis_organizer') || 'Putting it together'}</h5>
          <div className="prose prose-sm max-w-none text-sm text-slate-700">{renderFormattedText(item.synthesisOrganizer)}</div>
        </div>
      ) : null}
      {checks.length ? (
        <div className="mb-3">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">{t('brainstorm.accountability_check') || 'Show what you learned (everyone answers)'}</h5>
          <ol className="list-decimal ml-5 text-sm text-slate-700 space-y-1">
            {checks.map(function (c, aIdx) { return <li key={aIdx}>{activityDisplayText(c && c.q)}</li>; })}
          </ol>
          {isTeacherMode ? (
            <details className="mt-2">
              <summary className="cursor-pointer list-none inline-flex items-center gap-2 text-xs font-bold text-violet-700 hover:bg-violet-50 px-3 py-1.5 rounded-full border border-violet-200">
                <ListChecks size={14}/> {t('brainstorm.answer_key') || 'Answer key (teacher only)'}
              </summary>
              <ol className="list-decimal ml-5 text-xs text-slate-600 mt-2 space-y-1">
                {checks.map(function (c, aIdx) { return <li key={aIdx}>{activityDisplayText(c && c.answer)}</li>; })}
              </ol>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function BrainstormView(props) {
  var t = props.t;
  var generatedContent = props.generatedContent;
  var isTeacherMode = props.isTeacherMode;
  var isEditingBrainstorm = props.isEditingBrainstorm;
  var isGeneratingGuide = props.isGeneratingGuide;
  var isGeneratingBrainstormRubric = props.isGeneratingBrainstormRubric || {};
  var isGeneratingWorksheet = props.isGeneratingWorksheet;
  var isGeneratingWorksheetCover = props.isGeneratingWorksheetCover;
  var handleToggleIsEditingBrainstorm = props.handleToggleIsEditingBrainstorm;
  var handleBrainstormChange = props.handleBrainstormChange;
  var handleGenerateGuide = props.handleGenerateGuide;
  var handleGenerateBrainstormRubric = props.handleGenerateBrainstormRubric;
  var handleGenerateWorksheet = props.handleGenerateWorksheet;
  var handleGenerateWorksheetCover = props.handleGenerateWorksheetCover;
  var handleOpenActivityInStudio = props.handleOpenActivityInStudio;
  var getRows = props.getRows;
  var renderFormattedText = props.renderFormattedText;
  return (
                  <div className="space-y-6" data-help-key="brainstorm_panel">
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 mb-6 flex justify-between items-center gap-4">
                        <p className="text-sm text-yellow-800 flex-grow"><strong>UDL Goal:</strong> Providing options for engagement. Connecting concepts to student lives and physical activities increases relevance and motivation.</p>
                        <div className="flex gap-2">
                            <button
                                aria-label={t('common.toggle_edit_brainstorm')}
                                onClick={handleToggleIsEditingBrainstorm}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isEditingBrainstorm ? 'bg-yellow-600 text-white hover:bg-yellow-700' : 'bg-white text-yellow-700 border border-yellow-200 hover:bg-yellow-50'}`}
                            >
                                {isEditingBrainstorm ? <CheckCircle2 size={14}/> : <Pencil size={14}/>}
                                {isEditingBrainstorm ? t('common.done_editing') : t('brainstorm.edit')}
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                         {(Array.isArray(generatedContent?.data) ? generatedContent?.data : []).map((idea, idx) => (
                             <div key={idx} className="bg-white p-6 rounded-xl border border-slate-400 shadow-sm hover:shadow-md transition-shadow" data-help-key="brainstorm_card">
                                 {idea.kind === 'discussion' ? (
                                     <DiscussionKitBody item={idea} t={t} isTeacherMode={isTeacherMode} renderFormattedText={renderFormattedText} />
                                 ) : idea.kind === 'jigsaw' ? (
                                     <JigsawBody item={idea} t={t} isTeacherMode={isTeacherMode} renderFormattedText={renderFormattedText} />
                                 ) : isEditingBrainstorm ? (
                                     <>
                                        <div className="flex items-center gap-2 mb-2">
                                            <Lightbulb size={18} className="text-yellow-500 fill-current shrink-0"/>
                                            <input aria-label={t('common.enter_idea')}
                                                type="text"
                                                value={idea.title}
                                                onChange={(e) => handleBrainstormChange(idx, 'title', e.target.value)}
                                                className="w-full font-bold text-lg text-indigo-900 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none transition-all"
                                                placeholder={t('brainstorm.placeholder_title')}
                                                readOnly={!isTeacherMode}
                                            />
                                        </div>
                                        <textarea
                                            aria-label={t('brainstorm.edit_description') || 'Edit idea description'}
                                            value={idea.description}
                                            onChange={(e) => handleBrainstormChange(idx, 'description', e.target.value)}
                                            className="w-full text-slate-700 mb-4 text-sm leading-relaxed bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all"
                                            rows={getRows(idea.description)}
                                            placeholder={t('brainstorm.placeholder_desc')}
                                            readOnly={!isTeacherMode}
                                        />
                                        <div className="bg-indigo-50 p-3 rounded-lg text-xs text-indigo-800 font-medium border border-indigo-100 mb-4">
                                            <strong className="block mb-1">{t('brainstorm.label_connection')}:</strong>
                                            <textarea
                                                aria-label={t('brainstorm.edit_connection') || 'Edit topic connection'}
                                                value={idea.connection}
                                                onChange={(e) => handleBrainstormChange(idx, 'connection', e.target.value)}
                                                className="w-full bg-transparent border border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-1 outline-none resize-none transition-all"
                                                rows={getRows(idea.connection)}
                                                placeholder={t('brainstorm.placeholder_connection')}
                                                readOnly={!isTeacherMode}
                                            />
                                        </div>
                                     </>
                                 ) : (
                                     <>
                                        <h4 className="font-bold text-lg text-indigo-900 mb-2 flex items-center gap-2">
                                            <Lightbulb size={18} className="text-yellow-500 fill-current"/> {activityDisplayText(idea.title)}
                                        </h4>
                                        <p className="text-slate-700 mb-4 text-sm leading-relaxed whitespace-pre-line">{activityDisplayText(idea.description)}</p>
                                        <div className="bg-indigo-50 p-3 rounded-lg text-xs text-indigo-800 font-medium border border-indigo-100 mb-4">
                                            <strong>{t('brainstorm.label_connection')}:</strong> {activityDisplayText(idea.connection)}
                                        </div>
                                     </>
                                 )}
                                 <ActivityArtifactSummary item={idea} t={t} />
                                 <div className="border-t border-slate-100 pt-3">
                                     {idea.guide ? (
                                         <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 border border-slate-400" data-help-key="brainstorm_guide">
                                             <h5 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><ListChecks size={16}/> {t('brainstorm.teacher_guide')}</h5>
                                             {isEditingBrainstorm ? (
                                                 <textarea
                                                     aria-label={t('brainstorm.edit_guide') || 'Edit teacher guide'}
                                                     value={idea.guide}
                                                     onChange={(e) => handleBrainstormChange(idx, 'guide', e.target.value)}
                                                     className="w-full bg-white border border-slate-400 hover:border-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded px-3 py-2 outline-none resize-y transition-all font-mono text-xs leading-relaxed"
                                                     rows={Math.max(8, getRows(idea.guide))}
                                                     placeholder={t('brainstorm.placeholder_guide') || 'Step-by-step teacher guide (markdown supported)…'}
                                                     readOnly={!isTeacherMode}
                                                 />
                                             ) : (
                                                 <div className="prose prose-sm max-w-none">
                                                     {renderFormattedText(idea.guide)}
                                                 </div>
                                             )}
                                         </div>
                                     ) : (
                                         <button
                                             aria-label={t('common.refresh')}
                                            onClick={() => handleGenerateGuide(idx)}
                                            disabled={isGeneratingGuide[idx]}
                                            aria-busy={!!isGeneratingGuide[idx]}
                                            className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-full transition-colors border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                         >
                                             {isGeneratingGuide[idx] ? <RefreshCw size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true"/> : <ListChecks size={14} aria-hidden="true"/>}
                                             {isGeneratingGuide[idx] ? t('brainstorm.creating_guide') : t('brainstorm.generate_guide')}
                                         </button>
                                     )}
                                     {idea.guide && (
                                         idea.worksheet ? (
                                             <details className="mt-3 group">
                                                 <summary className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 cursor-pointer list-none transition-colors">
                                                     <FileText size={14} />
                                                     {t('brainstorm.student_worksheet') || 'Student Worksheet'}
                                                     <span className="text-emerald-700/70 ml-0.5 group-open:rotate-180 transition-transform">▾</span>
                                                 </summary>
                                                 <div className="mt-2 bg-emerald-50/40 rounded-lg p-4 text-sm text-slate-700 border border-emerald-200" data-help-key="brainstorm_worksheet">
                                                     {idea.coverImage && (
                                                         <div className="mb-3 flex justify-center">
                                                             <img
                                                                 src={idea.coverImage}
                                                                 alt={(t('brainstorm.cover_alt', { title: activityDisplayText(idea.title) })) || ('Illustration for ' + activityDisplayText(idea.title))}
                                                                 className="max-h-40 rounded-lg border border-emerald-200 bg-white shadow-sm"
                                                             />
                                                         </div>
                                                     )}
                                                     <div className="mb-3 flex justify-end gap-2 flex-wrap">
                                                         {isTeacherMode && typeof handleOpenActivityInStudio === 'function' ? (
                                                             <button
                                                                 onClick={() => handleOpenActivityInStudio(idx)}
                                                                 className="text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 px-2 py-1 rounded-full transition-colors border border-indigo-200 flex items-center gap-1"
                                                                 title="Open this worksheet as editable Page Designer objects"
                                                             >
                                                                 <Pencil size={11} aria-hidden="true"/> Edit in Page Designer
                                                             </button>
                                                         ) : null}
                                                         <button
                                                             onClick={() => handleGenerateWorksheetCover(idx)}
                                                             disabled={isGeneratingWorksheetCover[idx]}
                                                             aria-busy={!!isGeneratingWorksheetCover[idx]}
                                                             className="text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 px-2 py-1 rounded-full transition-colors border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                                             title={idea.coverImage ? (t('brainstorm.regenerate_cover') || 'Regenerate cover image') : (t('brainstorm.generate_cover_tip') || 'Optional: add a cover illustration to this worksheet')}
                                                         >
                                                             {isGeneratingWorksheetCover[idx] ? <RefreshCw size={11} className="animate-spin motion-reduce:animate-none" aria-hidden="true"/> : <ImageIcon size={11} aria-hidden="true"/>}
                                                             {isGeneratingWorksheetCover[idx]
                                                                 ? (t('brainstorm.creating_cover') || 'Creating cover…')
                                                                 : idea.coverImage
                                                                     ? (t('brainstorm.regenerate_cover') || 'Regenerate cover')
                                                                     : (t('brainstorm.generate_cover') || 'Add cover image')}
                                                         </button>
                                                     </div>
                                                     {isEditingBrainstorm ? (
                                                         <textarea
                                                             aria-label={t('brainstorm.edit_worksheet') || 'Edit student worksheet'}
                                                             value={idea.worksheet}
                                                             onChange={(e) => handleBrainstormChange(idx, 'worksheet', e.target.value)}
                                                             className="w-full bg-white border border-slate-400 hover:border-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-3 py-2 outline-none resize-y transition-all font-mono text-xs leading-relaxed"
                                                             rows={Math.max(10, getRows(idea.worksheet))}
                                                             placeholder={t('brainstorm.placeholder_worksheet') || 'Student worksheet (markdown)…'}
                                                             readOnly={!isTeacherMode}
                                                         />
                                                     ) : (
                                                         <div className="prose prose-sm max-w-none">
                                                             {renderFormattedText(idea.worksheet)}
                                                         </div>
                                                     )}
                                                 </div>
                                             </details>
                                         ) : (
                                             <button
                                                 aria-label={t('brainstorm.generate_worksheet') || 'Generate student worksheet'}
                                                 onClick={() => handleGenerateWorksheet(idx)}
                                                 disabled={isGeneratingWorksheet[idx]}
                                                 aria-busy={!!isGeneratingWorksheet[idx]}
                                                 className="mt-3 flex items-center gap-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-full transition-colors border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                             >
                                                 {isGeneratingWorksheet[idx] ? <RefreshCw size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true"/> : <FileText size={14} aria-hidden="true"/>}
                                                 {isGeneratingWorksheet[idx] ? (t('brainstorm.creating_worksheet') || 'Creating worksheet…') : (t('brainstorm.generate_worksheet') || 'Generate Student Worksheet')}
                                             </button>
                                         )
                                     )}
                                     {idea.rubric && Array.isArray(idea.rubric.criteria) && idea.rubric.criteria.length ? (
                                         <details className="mt-3 group">
                                             <summary className="inline-flex items-center gap-2 text-xs font-bold text-violet-700 hover:bg-violet-50 px-3 py-1.5 rounded-full border border-violet-200 cursor-pointer list-none transition-colors">
                                                 <ListChecks size={14} />
                                                 {activityDisplayText(idea.rubric.title) || 'Activity Rubric'}
                                                 <span className="text-violet-700/70 ml-0.5 group-open:rotate-180 transition-transform">&#9662;</span>
                                             </summary>
                                             <div className="mt-2 overflow-x-auto rounded-lg border border-violet-200" data-help-key="brainstorm_rubric">
                                                 <table className="min-w-[760px] w-full text-xs text-left text-slate-700">
                                                     <caption className="sr-only">{activityDisplayText(idea.rubric.title) || 'Activity rubric with four performance levels'}</caption>
                                                     <thead className="bg-violet-50 text-violet-950">
                                                         <tr>
                                                             <th scope="col" className="p-2">Criterion</th>
                                                             <th scope="col" className="p-2 w-16">Weight</th>
                                                             <th scope="col" className="p-2">4 - Exceeds</th>
                                                             <th scope="col" className="p-2">3 - Meets</th>
                                                             <th scope="col" className="p-2">2 - Developing</th>
                                                             <th scope="col" className="p-2">1 - Beginning</th>
                                                         </tr>
                                                     </thead>
                                                     <tbody className="divide-y divide-violet-100 bg-white">
                                                         {idea.rubric.criteria.map((criterion, criterionIndex) => (
                                                             <tr key={criterionIndex} className="align-top">
                                                                 <th scope="row" className="p-2 font-semibold text-slate-900">{activityDisplayText(criterion.criterion)}</th>
                                                                 <td className="p-2">{Number.isFinite(Number(criterion.weight)) ? `${criterion.weight}%` : '--'}</td>
                                                                 <td className="p-2 whitespace-pre-line">{activityDisplayText(criterion.levels && criterion.levels['4'])}</td>
                                                                 <td className="p-2 whitespace-pre-line">{activityDisplayText(criterion.levels && criterion.levels['3'])}</td>
                                                                 <td className="p-2 whitespace-pre-line">{activityDisplayText(criterion.levels && criterion.levels['2'])}</td>
                                                                 <td className="p-2 whitespace-pre-line">{activityDisplayText(criterion.levels && criterion.levels['1'])}</td>
                                                             </tr>
                                                         ))}
                                                     </tbody>
                                                 </table>
                                             </div>
                                         </details>
                                     ) : isTeacherMode ? (
                                         <button
                                             aria-label="Generate activity rubric"
                                             onClick={() => handleGenerateBrainstormRubric(idx)}
                                             disabled={isGeneratingBrainstormRubric[idx]}
                                             aria-busy={!!isGeneratingBrainstormRubric[idx]}
                                             className="mt-3 flex items-center gap-2 text-xs font-bold text-violet-700 hover:bg-violet-50 px-3 py-1.5 rounded-full transition-colors border border-violet-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                         >
                                             {isGeneratingBrainstormRubric[idx] ? <RefreshCw size={12} className="animate-spin motion-reduce:animate-none" aria-hidden="true"/> : <ListChecks size={14} aria-hidden="true"/>}
                                             {isGeneratingBrainstormRubric[idx] ? 'Creating rubric...' : 'Generate Activity Rubric'}
                                         </button>
                                     ) : null}
                                 </div>
                             </div>
                          ))}
                    </div>
                  </div>
  );
}
