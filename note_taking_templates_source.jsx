// note_taking_templates_source.jsx
// Multi-session note-taking resources (Cornell Notes / Lab Report / Reading Response).
// Lesson-aware pre-population; persists to History so a student's "notebook" is
// the chronological subset of history entries with type='note-taking'.
//
// Per architectural directive (memory: feedback_note_taking_templates_module.md),
// this lives as a standalone CDN module, NOT inline in AlloFlowANTI.txt.

// ── Helpers ─────────────────────────────────────────────────────────────
const _genId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const _CardSection = ({ title, hint, color = 'indigo', children }) => {
  const colors = {
    indigo: { bg: 'bg-indigo-50/60', border: 'border-indigo-200', header: 'text-indigo-800' },
    emerald: { bg: 'bg-emerald-50/60', border: 'border-emerald-200', header: 'text-emerald-800' },
    amber: { bg: 'bg-amber-50/60', border: 'border-amber-200', header: 'text-amber-800' },
    rose: { bg: 'bg-rose-50/60', border: 'border-rose-200', header: 'text-rose-800' },
    sky: { bg: 'bg-sky-50/60', border: 'border-sky-200', header: 'text-sky-800' },
    violet: { bg: 'bg-violet-50/60', border: 'border-violet-200', header: 'text-violet-800' },
    slate: { bg: 'bg-slate-50/60', border: 'border-slate-200', header: 'text-slate-800' },
  };
  const c = colors[color] || colors.indigo;
  return (
    <div className={`${c.bg} border ${c.border} rounded-lg p-4`}>
      <h3 className={`font-black text-sm uppercase tracking-wider mb-2 ${c.header}`}>{title}</h3>
      {hint ? <p className="text-[11px] text-slate-500 italic mb-3 leading-snug">{hint}</p> : null}
      {children}
    </div>
  );
};

// ── Cornell Notes ───────────────────────────────────────────────────────
// Two-column note-taking with a summary band. Cues column AI-populated with
// key terms / anticipated questions from today's source; Notes column has
// structural scaffolds the student fills during the lesson; Summary band
// the student writes after.
const CornellNotesView = React.memo((props) => {
  const generatedContent = props.generatedContent;
  const handleNoteUpdate = props.handleNoteUpdate || (() => {});
  const t = props.t || ((k, d) => d || k);
  const isTeacherMode = !!props.isTeacherMode;
  const data = (generatedContent && generatedContent.data) || {};
  const title = data.title || '';
  const cues = Array.isArray(data.cues) ? data.cues : [];
  const notes = Array.isArray(data.notes) ? data.notes : [];
  const summary = typeof data.summary === 'string' ? data.summary : '';
  const lessonRef = data.lessonRef || {};
  const rowCount = Math.max(cues.length, notes.length, 1);
  const handleCueChange = (idx, newText) => {
    const next = cues.slice();
    while (next.length <= idx) next.push({ id: _genId('cue'), text: '' });
    next[idx] = { ...next[idx], text: newText };
    handleNoteUpdate('cues', next);
  };
  const handleNoteChange = (idx, newText) => {
    const next = notes.slice();
    while (next.length <= idx) next.push({ id: _genId('note'), text: '' });
    next[idx] = { ...next[idx], text: newText };
    handleNoteUpdate('notes', next);
  };
  const handleAddRow = () => {
    handleNoteUpdate('cues', cues.concat([{ id: _genId('cue'), text: '' }]));
    handleNoteUpdate('notes', notes.concat([{ id: _genId('note'), text: '' }]));
  };
  const handleRemoveRow = (idx) => {
    handleNoteUpdate('cues', cues.filter((_, i) => i !== idx));
    handleNoteUpdate('notes', notes.filter((_, i) => i !== idx));
  };
  const handleSummaryChange = (e) => handleNoteUpdate('summary', e.target.value);
  const handleTitleChange = (e) => handleNoteUpdate('title', e.target.value);
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div className="bg-slate-50 border-l-4 border-indigo-600 p-3 rounded">
        <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">Cornell Notes</div>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Today's lesson title"
          className="w-full text-xl font-black text-slate-800 bg-transparent border-b border-slate-300 focus:border-indigo-500 outline-none py-1"
          aria-label="Cornell Notes title"
        />
        {lessonRef.generatedAt ? (
          <div className="text-[11px] text-slate-500 mt-1">Started: {new Date(lessonRef.generatedAt).toLocaleString()}</div>
        ) : null}
      </div>
      <div className="border-2 border-slate-300 rounded-xl overflow-hidden bg-white">
        <div className="grid grid-cols-[35%_65%] bg-slate-100 border-b border-slate-300">
          <div className="px-4 py-2 font-black text-xs uppercase tracking-wider text-slate-700 border-r border-slate-300">Cues / Questions</div>
          <div className="px-4 py-2 font-black text-xs uppercase tracking-wider text-slate-700">Notes</div>
        </div>
        {Array.from({ length: rowCount }).map((_, idx) => {
          const cueText = (cues[idx] && cues[idx].text) || '';
          const noteText = (notes[idx] && notes[idx].text) || '';
          return (
            <div key={idx} className="grid grid-cols-[35%_65%] border-b border-slate-200 last:border-b-0 group">
              <div className="px-3 py-2 border-r border-slate-200 relative">
                <textarea
                  value={cueText}
                  onChange={(e) => handleCueChange(idx, e.target.value)}
                  placeholder={idx === 0 ? 'Key term, question, cue...' : ''}
                  className="w-full text-sm text-slate-700 bg-transparent resize-none outline-none focus:ring-2 focus:ring-indigo-300 rounded p-1 min-h-[60px]"
                  rows={2}
                  aria-label={`Cue ${idx + 1}`}
                />
              </div>
              <div className="px-3 py-2 relative">
                <textarea
                  value={noteText}
                  onChange={(e) => handleNoteChange(idx, e.target.value)}
                  placeholder={idx === 0 ? 'Notes, details, examples...' : ''}
                  className="w-full text-sm text-slate-700 bg-transparent resize-none outline-none focus:ring-2 focus:ring-indigo-300 rounded p-1 min-h-[60px]"
                  rows={2}
                  aria-label={`Notes for row ${idx + 1}`}
                />
                <button
                  onClick={() => handleRemoveRow(idx)}
                  className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 text-xs px-1"
                  aria-label={`Remove row ${idx + 1}`}
                  title="Remove row"
                >✕</button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-center">
        <button
          onClick={handleAddRow}
          className="px-4 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-300 rounded-full hover:bg-indigo-100"
          aria-label="Add a row to Cornell Notes"
        >+ Add row</button>
      </div>
      <_CardSection title="Summary" hint="Write a short summary after the lesson. The act of summarizing in your own words consolidates the learning." color="emerald">
        <textarea
          value={summary}
          onChange={handleSummaryChange}
          placeholder="Write your summary here after the lesson..."
          className="w-full text-sm text-slate-700 bg-white border border-slate-200 rounded-md p-3 outline-none focus:ring-2 focus:ring-emerald-300 resize-y min-h-[100px]"
          rows={4}
          aria-label="Cornell Notes summary"
        />
      </_CardSection>
      <div className="text-[11px] text-slate-500 italic text-center">Cornell Notes: cues on the left, notes on the right, summary below. Saved to your history so this entry stays with you across lessons.</div>
    </div>
  );
});

// ── Lab Report ──────────────────────────────────────────────────────────
const LabReportView = React.memo((props) => {
  const generatedContent = props.generatedContent;
  const handleNoteUpdate = props.handleNoteUpdate || (() => {});
  const t = props.t || ((k, d) => d || k);
  const data = (generatedContent && generatedContent.data) || {};
  const title = data.title || '';
  const question = data.question || '';
  const hypothesis = data.hypothesis || '';
  const materials = Array.isArray(data.materials) ? data.materials : [];
  const procedure = Array.isArray(data.procedure) ? data.procedure : [];
  const dataObservations = typeof data.data === 'string' ? data.data : '';
  const analysis = data.analysis || '';
  const conclusion = data.conclusion || '';
  const lessonRef = data.lessonRef || {};
  const updateMaterialAt = (idx, newText) => {
    const next = materials.slice();
    while (next.length <= idx) next.push({ id: _genId('mat'), text: '' });
    next[idx] = { ...next[idx], text: newText };
    handleNoteUpdate('materials', next);
  };
  const addMaterial = () => handleNoteUpdate('materials', materials.concat([{ id: _genId('mat'), text: '' }]));
  const removeMaterialAt = (idx) => handleNoteUpdate('materials', materials.filter((_, i) => i !== idx));
  const updateProcedureAt = (idx, newText) => {
    const next = procedure.slice();
    while (next.length <= idx) next.push({ id: _genId('step'), text: '' });
    next[idx] = { ...next[idx], text: newText };
    handleNoteUpdate('procedure', next);
  };
  const addProcedureStep = () => handleNoteUpdate('procedure', procedure.concat([{ id: _genId('step'), text: '' }]));
  const removeProcedureStepAt = (idx) => handleNoteUpdate('procedure', procedure.filter((_, i) => i !== idx));
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="bg-slate-50 border-l-4 border-sky-600 p-3 rounded">
        <div className="text-xs font-bold text-sky-700 uppercase tracking-wider mb-1">Lab Report</div>
        <input
          type="text"
          value={title}
          onChange={(e) => handleNoteUpdate('title', e.target.value)}
          placeholder="Experiment title"
          className="w-full text-xl font-black text-slate-800 bg-transparent border-b border-slate-300 focus:border-sky-500 outline-none py-1"
          aria-label="Lab Report title"
        />
        {lessonRef.generatedAt ? (
          <div className="text-[11px] text-slate-500 mt-1">Started: {new Date(lessonRef.generatedAt).toLocaleString()}</div>
        ) : null}
      </div>
      <_CardSection title="Research Question" hint="What are you investigating? Frame it as a question you can answer through observation." color="sky">
        <textarea
          value={question}
          onChange={(e) => handleNoteUpdate('question', e.target.value)}
          placeholder="What question is this experiment trying to answer?"
          className="w-full text-sm bg-white border border-slate-200 rounded p-2 outline-none focus:ring-2 focus:ring-sky-300 resize-y min-h-[60px]"
          rows={2}
          aria-label="Research question"
        />
      </_CardSection>
      <_CardSection title="Hypothesis" hint="Sentence frame: 'I predict that ___ will happen because ___.'" color="violet">
        <textarea
          value={hypothesis}
          onChange={(e) => handleNoteUpdate('hypothesis', e.target.value)}
          placeholder="I predict that..."
          className="w-full text-sm bg-white border border-slate-200 rounded p-2 outline-none focus:ring-2 focus:ring-violet-300 resize-y min-h-[60px]"
          rows={2}
          aria-label="Hypothesis"
        />
      </_CardSection>
      <_CardSection title="Materials" hint="List everything you need to run the experiment." color="amber">
        <ul className="space-y-1">
          {materials.length === 0 ? (
            <li className="text-xs text-slate-400 italic">No materials added yet.</li>
          ) : materials.map((m, idx) => (
            <li key={m.id || idx} className="flex items-center gap-2 group">
              <span className="text-slate-400 text-xs">•</span>
              <input
                type="text"
                value={m.text || ''}
                onChange={(e) => updateMaterialAt(idx, e.target.value)}
                className="flex-1 text-sm bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-amber-300"
                aria-label={`Material ${idx + 1}`}
              />
              <button onClick={() => removeMaterialAt(idx)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 text-xs" aria-label="Remove material">✕</button>
            </li>
          ))}
        </ul>
        <button onClick={addMaterial} className="mt-2 px-3 py-1 text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded hover:bg-amber-200">+ Add material</button>
      </_CardSection>
      <_CardSection title="Procedure" hint="Number each step. Another student should be able to follow your procedure and reproduce your experiment." color="emerald">
        <ol className="space-y-1">
          {procedure.length === 0 ? (
            <li className="text-xs text-slate-400 italic">No steps added yet.</li>
          ) : procedure.map((s, idx) => (
            <li key={s.id || idx} className="flex items-start gap-2 group">
              <span className="text-slate-500 text-xs font-bold mt-1.5 w-5 flex-shrink-0">{idx + 1}.</span>
              <textarea
                value={s.text || ''}
                onChange={(e) => updateProcedureAt(idx, e.target.value)}
                className="flex-1 text-sm bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-300 resize-y min-h-[40px]"
                rows={1}
                aria-label={`Procedure step ${idx + 1}`}
              />
              <button onClick={() => removeProcedureStepAt(idx)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 text-xs mt-2" aria-label="Remove step">✕</button>
            </li>
          ))}
        </ol>
        <button onClick={addProcedureStep} className="mt-2 px-3 py-1 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded hover:bg-emerald-200">+ Add step</button>
      </_CardSection>
      <_CardSection title="Data / Observations" hint="Record what you see, measure, or count. Use specific numbers and units when possible." color="indigo">
        <textarea
          value={dataObservations}
          onChange={(e) => handleNoteUpdate('data', e.target.value)}
          placeholder="Record observations, measurements, or data tables..."
          className="w-full text-sm bg-white border border-slate-200 rounded p-2 outline-none focus:ring-2 focus:ring-indigo-300 resize-y min-h-[100px] font-mono"
          rows={5}
          aria-label="Data and observations"
        />
      </_CardSection>
      <_CardSection title="Analysis (Claim / Evidence / Reasoning)" hint="State your claim. List the evidence from your data. Explain the reasoning that connects them." color="rose">
        <textarea
          value={analysis}
          onChange={(e) => handleNoteUpdate('analysis', e.target.value)}
          placeholder="Claim: ...\nEvidence: ...\nReasoning: ..."
          className="w-full text-sm bg-white border border-slate-200 rounded p-2 outline-none focus:ring-2 focus:ring-rose-300 resize-y min-h-[100px]"
          rows={5}
          aria-label="Analysis (Claim, Evidence, Reasoning)"
        />
      </_CardSection>
      <_CardSection title="Conclusion" hint="Did your data support your hypothesis? What did you learn? What new questions came up?" color="slate">
        <textarea
          value={conclusion}
          onChange={(e) => handleNoteUpdate('conclusion', e.target.value)}
          placeholder="Restate your hypothesis, summarize the results, reflect on what you learned..."
          className="w-full text-sm bg-white border border-slate-200 rounded p-2 outline-none focus:ring-2 focus:ring-slate-400 resize-y min-h-[80px]"
          rows={4}
          aria-label="Conclusion"
        />
      </_CardSection>
      <div className="text-[11px] text-slate-500 italic text-center">Lab Report saved to your history. Open it later to keep adding observations across days.</div>
    </div>
  );
});

// ── Reading Response Journal Entry ──────────────────────────────────────
const ReadingResponseView = React.memo((props) => {
  const generatedContent = props.generatedContent;
  const handleNoteUpdate = props.handleNoteUpdate || (() => {});
  const data = (generatedContent && generatedContent.data) || {};
  const title = data.title || '';
  const author = data.author || '';
  const pageRange = data.pageRange || '';
  const favoriteLine = data.favoriteLine || '';
  const thinkings = data.thinkings || '';
  const connection = data.connection || { type: 'text-to-self', text: '' };
  const question = data.question || '';
  const lessonRef = data.lessonRef || {};
  const setConnectionType = (newType) => handleNoteUpdate('connection', { ...connection, type: newType });
  const setConnectionText = (newText) => handleNoteUpdate('connection', { ...connection, text: newText });
  const connTypes = [
    { id: 'text-to-self',  label: 'Text to Self',  hint: 'How does this connect to something in your own life?' },
    { id: 'text-to-text',  label: 'Text to Text',  hint: 'How does this connect to another book, story, or article?' },
    { id: 'text-to-world', label: 'Text to World', hint: 'How does this connect to something happening in the world?' },
  ];
  const activeConnType = connTypes.find(ct => ct.id === connection.type) || connTypes[0];
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div className="bg-slate-50 border-l-4 border-violet-600 p-3 rounded">
        <div className="text-xs font-bold text-violet-700 uppercase tracking-wider mb-1">Reading Response</div>
        <input
          type="text"
          value={title}
          onChange={(e) => handleNoteUpdate('title', e.target.value)}
          placeholder="Title of what you read"
          className="w-full text-xl font-black text-slate-800 bg-transparent border-b border-slate-300 focus:border-violet-500 outline-none py-1"
          aria-label="Reading title"
        />
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <input
            type="text"
            value={author}
            onChange={(e) => handleNoteUpdate('author', e.target.value)}
            placeholder="Author"
            className="flex-1 text-sm text-slate-600 bg-transparent border-b border-slate-200 focus:border-violet-300 outline-none py-1"
            aria-label="Author"
          />
          <input
            type="text"
            value={pageRange}
            onChange={(e) => handleNoteUpdate('pageRange', e.target.value)}
            placeholder="Pages or chapter"
            className="sm:w-40 text-sm text-slate-600 bg-transparent border-b border-slate-200 focus:border-violet-300 outline-none py-1"
            aria-label="Pages or chapter"
          />
        </div>
        {lessonRef.generatedAt ? (
          <div className="text-[11px] text-slate-500 mt-1">Started: {new Date(lessonRef.generatedAt).toLocaleString()}</div>
        ) : null}
      </div>
      <_CardSection title="Favorite Line or Passage" hint="Pick a quote that stuck with you. Include the page number." color="amber">
        <textarea
          value={favoriteLine}
          onChange={(e) => handleNoteUpdate('favoriteLine', e.target.value)}
          placeholder='"Quote here..." (p. ___)'
          className="w-full text-sm italic bg-white border border-slate-200 rounded p-2 outline-none focus:ring-2 focus:ring-amber-300 resize-y min-h-[60px]"
          rows={2}
          aria-label="Favorite line or passage"
        />
      </_CardSection>
      <_CardSection title="What This Made Me Think About" hint="Free-write what came up for you as you read." color="violet">
        <textarea
          value={thinkings}
          onChange={(e) => handleNoteUpdate('thinkings', e.target.value)}
          placeholder="Reflect on what came up for you while reading..."
          className="w-full text-sm bg-white border border-slate-200 rounded p-2 outline-none focus:ring-2 focus:ring-violet-300 resize-y min-h-[100px]"
          rows={5}
          aria-label="What this made me think about"
        />
      </_CardSection>
      <_CardSection title="Connection" hint={activeConnType.hint} color="sky">
        <div className="flex flex-wrap gap-2 mb-3">
          {connTypes.map((ct) => (
            <button
              key={ct.id}
              onClick={() => setConnectionType(ct.id)}
              className={`px-3 py-1 text-xs font-bold rounded-full border ${connection.type === ct.id ? 'bg-sky-600 text-white border-sky-700' : 'bg-white text-sky-700 border-sky-300 hover:bg-sky-50'}`}
              aria-pressed={connection.type === ct.id}
            >
              {ct.label}
            </button>
          ))}
        </div>
        <textarea
          value={connection.text || ''}
          onChange={(e) => setConnectionText(e.target.value)}
          placeholder={`Describe the ${activeConnType.label.toLowerCase()} connection...`}
          className="w-full text-sm bg-white border border-slate-200 rounded p-2 outline-none focus:ring-2 focus:ring-sky-300 resize-y min-h-[80px]"
          rows={4}
          aria-label="Connection text"
        />
      </_CardSection>
      <_CardSection title="One Question I Have" hint="What did this reading leave you wondering about?" color="emerald">
        <textarea
          value={question}
          onChange={(e) => handleNoteUpdate('question', e.target.value)}
          placeholder="What's one question you still have after this reading?"
          className="w-full text-sm bg-white border border-slate-200 rounded p-2 outline-none focus:ring-2 focus:ring-emerald-300 resize-y min-h-[60px]"
          rows={2}
          aria-label="Question"
        />
      </_CardSection>
      <div className="text-[11px] text-slate-500 italic text-center">Reading Response saved to your history. Browse all your responses to build a record of your reading life.</div>
    </div>
  );
});

// ── Dispatcher ───────────────────────────────────────────────────────────
const NoteTakingView = React.memo((props) => {
  const generatedContent = props.generatedContent;
  if (!generatedContent || generatedContent.type !== 'note-taking') return null;
  const templateType = (generatedContent.data && generatedContent.data.templateType) || 'cornell-notes';
  if (templateType === 'cornell-notes') return React.createElement(CornellNotesView, props);
  if (templateType === 'lab-report') return React.createElement(LabReportView, props);
  if (templateType === 'reading-response') return React.createElement(ReadingResponseView, props);
  return null;
});
