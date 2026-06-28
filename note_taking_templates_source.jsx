// note_taking_templates_source.jsx
// Multi-session note-taking resources (Cornell Notes / Lab Report / Reading Response).
// Lesson-aware pre-population; persists to History so a student's "notebook" is
// the chronological subset of history entries with type='note-taking'.
//
// Per architectural directive (memory: feedback_note_taking_templates_module.md),
// this lives as a standalone CDN module, NOT inline in AlloFlowANTI.txt.

// ── Helpers ─────────────────────────────────────────────────────────────
const _genId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// Loose comparison for Guided Notes self-check: case/space/punctuation-insensitive
// so "Mitochondria." matches "mitochondria". Deliberately forgiving — the point
// is recall of the concept, not exact spelling/punctuation.
const _normalizeBlank = (s) => String(s == null ? '' : s)
  .trim()
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .replace(/[.,;:!?'"()]/g, '');

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

// ── AI Feedback (per-instance) ───────────────────────────────────────────
// Strengths-first feedback on a saved template. Returns one specific strength,
// one growth nudge, and a soft source-alignment check. XP is awarded via
// handleScoreUpdate; the max-score tracker prevents grinding by capping XP
// to the delta above the student's previous best on this resource id.
//
// Design notes:
// - Rubric scores are INTERNAL ONLY (used to compute XP). They are NOT shown
//   to the student to avoid the demotivation framing of a numeric grade.
// - Source check is "soft" per Aaron's design call: if a quoted line isn't
//   found in the source, AI frames as "I couldn't find this in the text —
//   did you paraphrase?" rather than flagging incorrect.
// - Lead with one specific strength, then ONE growth nudge (not a list).
//   Hattie's research: multiple critiques in one feedback episode reduce
//   retention of any single suggestion.

const _NOTE_RUBRICS = {
  'cornell-notes': {
    strengthsFocus: [
      'cue column quality (are cues retrieval prompts vs just headings?)',
      'notes column substance (do notes capture key ideas from the source?)',
      'summary synthesis (does the summary synthesize, or just restate?)',
      'cross-field coherence (can the cues actually be answered from the notes?)',
    ],
    growthAreas: [
      'cues that are more inferential ("Why might X have led to Y?") rather than purely factual ("What year did X happen?")',
      'fuller summary that connects ideas rather than listing them',
      'cues that map directly to notes so retrieval practice works',
      'specific examples in the notes column to anchor abstract ideas',
      'a connection to something outside the lesson — another subject, a real-world example, or a memory hook of your own',
    ],
  },
  'lab-report': {
    strengthsFocus: [
      'hypothesis (testable + has reasoning?)',
      'procedure reproducibility (could another student follow this exactly?)',
      'data hygiene (units present, specific measurements, qualitative + quantitative)',
      'CER quality (claim-evidence-reasoning all present, reasoning especially)',
      'conclusion (addresses hypothesis + sources of error?)',
    ],
    growthAreas: [
      'reasoning section (the WHY) — students reliably skip this; it is where the science thinking happens',
      'specific measurements with units rather than vague descriptions',
      'procedure detail sufficient for reproducibility',
      'naming sources of error in the conclusion',
      'a testable hypothesis with reasoning ("because ___") rather than a guess',
      'a connection from the results to the real world, another experiment, or a concept from class',
    ],
  },
  'reading-response': {
    strengthsFocus: [
      'evidence (is the favorite line a real quote from the text?)',
      'thinking section depth (substantive reflection vs surface)',
      'connection quality (is the connection substantive, or just "this reminds me of...")',
      'question (genuine inquiry vs comprehension-check question)',
    ],
    growthAreas: [
      'a connection beyond the surface — what specifically about this text triggered the connection?',
      'a genuine inquiry question (something the text leaves open, not something it already answered)',
      'a direct quote with the page number rather than a paraphrase',
      'pushing past the first thought to a deeper response',
    ],
  },
  'double-entry': {
    strengthsFocus: [
      'quote selection (did the student pick a meaningful, specific passage rather than a random line?)',
      'response depth (does the right column analyze/react, or just restate the quote?)',
      'dialogue with the text (does the response question, connect, or interpret rather than summarize?)',
      'balance (are both columns substantive, or is one side thin?)',
    ],
    growthAreas: [
      'a response that interprets or questions the quote rather than restating it',
      'choosing a quote that genuinely puzzled or struck you, not just the first line',
      'connecting the quote to a bigger idea, another text, or your own experience',
      'pushing one response past the first reaction to a deeper "why does this matter?"',
    ],
  },
  'guided-notes': {
    strengthsFocus: [
      'completion (did the student fill in the blanks rather than leaving them empty?)',
      'accuracy of the key terms (do filled answers match the concept?)',
      "own-notes quality (does the extra notes space add the student's own thinking?)",
      'engagement with the material beyond the blanks',
    ],
    growthAreas: [
      'using the "my own notes" space to add an example or question of your own',
      'going back to fill any blanks you skipped — the gaps are the key terms worth knowing',
      'rephrasing a filled-in term in your own words to check you understand it',
      'noting which blanks were hardest — those are worth a second look',
      'a memory hook or analogy of your own for one of the trickier key terms',
    ],
  },
  'q-and-a': {
    strengthsFocus: [
      'question quality (are questions higher-order "why/how" rather than only recall "what"?)',
      'answer completeness (do answers fully address the question?)',
      'coverage (do the pairs span the key ideas, not just one corner of the topic?)',
      'self-testing value (could a peer study from these pairs?)',
    ],
    growthAreas: [
      'mixing in a "why" or "how" question, not only "what" recall questions',
      'an answer that explains rather than just names — add the reasoning',
      'covering an idea from the source you have not turned into a question yet',
      'writing one question you genuinely are not sure of the answer to',
      'a question that connects this topic to something outside it (another subject or real life)',
    ],
  },
};

// Build a compact text dump of the student's filled-in template, suitable for
// embedding in the AI prompt. We strip empty fields so the AI focuses on what
// the student actually wrote.
function _serializeTemplateForFeedback(templateType, data) {
  if (!data) return '';
  const parts = [];
  if (data.title) parts.push(`TITLE: ${data.title}`);
  if (templateType === 'cornell-notes') {
    const cues = (Array.isArray(data.cues) ? data.cues : []).map(c => (c.text || '').trim()).filter(Boolean);
    const notes = (Array.isArray(data.notes) ? data.notes : []).map(n => (n.text || '').trim()).filter(Boolean);
    if (cues.length) parts.push('CUES:\n' + cues.map((c, i) => `  ${i + 1}. ${c}`).join('\n'));
    if (notes.length) parts.push('NOTES:\n' + notes.map((n, i) => `  ${i + 1}. ${n}`).join('\n'));
    if (data.summary) parts.push(`SUMMARY: ${data.summary}`);
  } else if (templateType === 'lab-report') {
    if (data.question) parts.push(`RESEARCH QUESTION: ${data.question}`);
    if (data.hypothesis) parts.push(`HYPOTHESIS: ${data.hypothesis}`);
    const materials = (Array.isArray(data.materials) ? data.materials : []).map(m => (m.text || '').trim()).filter(Boolean);
    const procedure = (Array.isArray(data.procedure) ? data.procedure : []).map(p => (p.text || '').trim()).filter(Boolean);
    if (materials.length) parts.push('MATERIALS: ' + materials.join(', '));
    if (procedure.length) parts.push('PROCEDURE:\n' + procedure.map((p, i) => `  ${i + 1}. ${p}`).join('\n'));
    if (data.data) parts.push(`DATA/OBSERVATIONS: ${data.data}`);
    if (data.analysis) parts.push(`ANALYSIS (CER): ${data.analysis}`);
    if (data.conclusion) parts.push(`CONCLUSION: ${data.conclusion}`);
  } else if (templateType === 'reading-response') {
    if (data.author) parts.push(`AUTHOR: ${data.author}`);
    if (data.pageRange) parts.push(`PAGES: ${data.pageRange}`);
    if (data.favoriteLine) parts.push(`FAVORITE LINE: ${data.favoriteLine}`);
    if (data.thinkings) parts.push(`THINKING: ${data.thinkings}`);
    if (data.connection && data.connection.text) parts.push(`CONNECTION (${data.connection.type || 'text-to-self'}): ${data.connection.text}`);
    if (data.question) parts.push(`QUESTION: ${data.question}`);
  } else if (templateType === 'double-entry') {
    if (data.author) parts.push(`AUTHOR: ${data.author}`);
    if (data.pageRange) parts.push(`PAGES: ${data.pageRange}`);
    const entries = (Array.isArray(data.entries) ? data.entries : [])
      .filter(en => en && ((en.quote || '').trim() || (en.response || '').trim()));
    if (entries.length) {
      parts.push('DOUBLE-ENTRY (quote → response):\n' + entries.map((en, i) =>
        `  ${i + 1}. QUOTE: ${(en.quote || '').trim() || '(none)'}\n     RESPONSE: ${(en.response || '').trim() || '(none)'}`).join('\n'));
    }
  } else if (templateType === 'guided-notes') {
    const blanks = Array.isArray(data.blanks) ? data.blanks : [];
    const filled = blanks.filter(b => b && (b.studentAnswer || '').trim());
    if (blanks.length) {
      const correct = filled.filter(b => _normalizeBlank(b.studentAnswer) === _normalizeBlank(b.answer)).length;
      parts.push(`GUIDED NOTES: ${filled.length}/${blanks.length} blanks filled, ${correct} matching the key term.`);
      parts.push('STATEMENTS:\n' + blanks.map((b, i) =>
        `  ${i + 1}. ${(b.before || '')}[${(b.studentAnswer || '').trim() || '___'}]${(b.after || '')}`).join('\n'));
    }
    if (data.notesExtra) parts.push(`MY OWN NOTES: ${data.notesExtra}`);
  } else if (templateType === 'q-and-a') {
    const pairs = (Array.isArray(data.pairs) ? data.pairs : [])
      .filter(p => p && ((p.question || '').trim() || (p.answer || '').trim()));
    if (pairs.length) {
      parts.push('Q&A PAIRS:\n' + pairs.map((p, i) =>
        `  ${i + 1}. Q: ${(p.question || '').trim() || '(none)'}\n     A: ${(p.answer || '').trim() || '(none)'}`).join('\n'));
    }
  }
  // Optional cross-template elaboration field — the student's own connections to
  // outside knowledge / memory hooks. Surfaced so feedback can build on it.
  if (data.connections && String(data.connections).trim()) parts.push(`CONNECTIONS & MEMORY HOOKS: ${String(data.connections).trim()}`);
  return parts.join('\n\n');
}

// Detect whether the student filled in enough to warrant feedback. Returns
// { ok: bool, reason: string } — if not ok, we skip the AI call entirely.
function _checkTemplateReadyForFeedback(templateType, data) {
  if (!data) return { ok: false, reason: 'empty' };
  if (templateType === 'cornell-notes') {
    const notes = (Array.isArray(data.notes) ? data.notes : []).filter(n => (n.text || '').trim());
    if (notes.length < 2) return { ok: false, reason: 'cornell_needs_notes' };
  } else if (templateType === 'lab-report') {
    if (!(data.hypothesis || '').trim() && !(data.analysis || '').trim() && !(data.conclusion || '').trim()) {
      return { ok: false, reason: 'lab_needs_substance' };
    }
  } else if (templateType === 'reading-response') {
    if (!(data.thinkings || '').trim() && !(data.connection && data.connection.text || '').trim()) {
      return { ok: false, reason: 'reading_needs_thinking' };
    }
  } else if (templateType === 'double-entry') {
    const responded = (Array.isArray(data.entries) ? data.entries : []).filter(en => en && (en.response || '').trim());
    if (responded.length < 1) return { ok: false, reason: 'double_entry_needs_response' };
  } else if (templateType === 'guided-notes') {
    const blanks = Array.isArray(data.blanks) ? data.blanks : [];
    const filled = blanks.filter(b => b && (b.studentAnswer || '').trim());
    if (filled.length < Math.max(1, Math.ceil(blanks.length / 2)) && !(data.notesExtra || '').trim()) {
      return { ok: false, reason: 'guided_needs_blanks' };
    }
  } else if (templateType === 'q-and-a') {
    const complete = (Array.isArray(data.pairs) ? data.pairs : []).filter(p => p && (p.question || '').trim() && (p.answer || '').trim());
    if (complete.length < 2) return { ok: false, reason: 'qanda_needs_pairs' };
  }
  return { ok: true, reason: '' };
}

// Build the AI prompt. Source text is OPTIONAL — when present, the AI does a
// soft source-alignment check. When absent, the rubric-only path runs.
function _buildNotesFeedbackPrompt(templateType, data, sourceText) {
  const meta = _NOTE_RUBRICS[templateType] || _NOTE_RUBRICS['cornell-notes'];
  const sourceBlock = sourceText
    ? `\nSOURCE TEXT (what the student was reading / studying):\n"""\n${(sourceText || '').slice(0, 3000)}\n"""\n`
    : '';
  const templateLabel = ({
    'cornell-notes': 'Cornell Notes',
    'lab-report': 'Lab Report',
    'reading-response': 'Reading Response',
    'double-entry': 'Double-Entry Journal',
    'guided-notes': 'Guided Notes',
    'q-and-a': 'Q&A Study Notes',
  })[templateType] || 'Note Template';
  return `
You are a supportive teacher giving feedback on a student's ${templateLabel} note-taking work.

Your tone is strengths-first. You ALWAYS lead with one specific thing the student did well, citing what they actually wrote. Then you give ONE growth nudge — not a list, just one concrete next step. Multiple critiques in one feedback episode reduce the chance the student acts on any of them (Hattie). If the student's work is rough, the strength can be effort-based ("you filled in every section even when it was hard"), but it must be specific.

When the student's work is already substantively complete and accurate, prefer a growth nudge that pushes ELABORATION rather than fixing a gap: invite them to connect this to something they already know (another subject, a real-world example, a personal experience), to explain in their own words WHY it matters or why it's true, or to invent an analogy or memory hook of their own. This generative connection-making (elaborative interrogation / self-explanation) is where durable understanding forms. If the student already wrote a "Connections & Memory Hooks" note, acknowledge it specifically and push it one step further. Keep it to ONE such invitation, never a list.

You are NOT a grader. The student does not see a numeric score. You provide rubric scores in the JSON for the system's internal XP calculation only.

Quality dimensions for ${templateLabel}:
${meta.strengthsFocus.map(s => `- ${s}`).join('\n')}

Common growth areas to consider for the nudge:
${meta.growthAreas.map(g => `- ${g}`).join('\n')}

${sourceBlock}STUDENT WORK:
"""
${_serializeTemplateForFeedback(templateType, data)}
"""

Return ONLY JSON:
{
  "strength": "1-2 sentences naming a specific strong choice the student made, with a brief quote from their work in single quotes. Strengths-first; effort counts as a strength if the work is rough.",
  "growthNudge": "1-2 sentences with ONE concrete next-step suggestion. No list. Frame as 'next time, try ___' or 'one thing that could push this further: ___'.",
  "sourceAlignment": {
    "found": ${sourceText ? 'true or false (was the student work substantively connected to the source text? If they quoted, was the quote actually present?)' : 'null (no source text provided)'},
    "message": "If you found a soft alignment issue, frame as 'I couldn't find this exact line in the text — did you paraphrase?' Never 'incorrect'. Empty string if no issue."
  },
  "rubric": {
    "completion": 0-3,
    "quality": 0-15,
    "alignment": 0-5
  }
}
`.trim();
}

// XP calc: completion floor + quality ceiling + source bonus + first-time bonus.
// Returns the candidate "current score" to pass to handleScoreUpdate (which
// awards only the delta above the student's previous best on this resource).
function _calculateNotesXPScore(rubric, isFirstTime) {
  if (!rubric) return 0;
  const completion = Math.max(0, Math.min(3, Math.round(rubric.completion || 0)));
  const quality = Math.max(0, Math.min(15, Math.round(rubric.quality || 0)));
  const alignment = Math.max(0, Math.min(5, Math.round(rubric.alignment || 0)));
  const firstTime = isFirstTime ? 5 : 0;
  return completion + quality + alignment + firstTime;
}

// Inline panel that displays the feedback after the AI returns. Strengths-
// first design: green strength block (top), amber growth nudge (middle), soft
// source-alignment note (bottom, only if non-empty), small XP toast.
const _NotesFeedbackPanel = ({ feedback, xpEarned, onDismiss, t }) => {
  if (!feedback) return null;
  return (
    <div className="max-w-3xl mx-auto px-4 pb-6">
      <div className="bg-gradient-to-br from-emerald-50 to-amber-50 border-2 border-emerald-300 rounded-xl p-5 shadow-md animate-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">💬</span>
            <h3 className="font-black text-base text-emerald-800">{t('notes_feedback.title') || 'Feedback on your notes'}</h3>
          </div>
          <button
            onClick={onDismiss}
            className="text-slate-600 hover:text-slate-600 text-lg leading-none"
            aria-label={t('notes_feedback.dismiss_aria') || 'Dismiss feedback'}
          >✕</button>
        </div>
        <div className="space-y-3">
          <div className="bg-emerald-100/70 border-l-4 border-emerald-500 rounded-r-md p-3">
            <div className="text-[11px] font-black text-emerald-800 uppercase tracking-wider mb-1">{t('notes_feedback.strength_label') || 'What you did well'}</div>
            <div className="text-sm text-slate-700 leading-relaxed">{feedback.strength}</div>
          </div>
          <div className="bg-amber-100/70 border-l-4 border-amber-500 rounded-r-md p-3">
            <div className="text-[11px] font-black text-amber-900 uppercase tracking-wider mb-1">{t('notes_feedback.growth_label') || 'One thing to try next time'}</div>
            <div className="text-sm text-slate-700 leading-relaxed">{feedback.growthNudge}</div>
          </div>
          {feedback.sourceAlignment && feedback.sourceAlignment.message ? (
            <div className="bg-sky-100/70 border-l-4 border-sky-500 rounded-r-md p-3">
              <div className="text-[11px] font-black text-sky-800 uppercase tracking-wider mb-1">{t('notes_feedback.source_label') || 'About the source text'}</div>
              <div className="text-sm text-slate-700 leading-relaxed">{feedback.sourceAlignment.message}</div>
            </div>
          ) : null}
          {xpEarned > 0 ? (
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-4 py-2">
              <span aria-hidden="true">⭐</span>
              <span>{t('notes_feedback.xp_earned', { xp: xpEarned }) || `+${xpEarned} XP`}</span>
            </div>
          ) : (
            <div className="text-center text-[11px] italic text-slate-500">
              {t('notes_feedback.no_xp_hint') || "You've already earned XP from this entry before. Keep going — new improvements earn more XP."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Hook factory that wires the "Get AI Feedback" button to the AI call + XP
// dispatch. Returns { feedbackState, isLoading, requestFeedback, dismiss }.
// Each view component instantiates this and renders the button + panel.
function _useNotesFeedback(props, templateType) {
  const [feedback, setFeedback] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [xpEarned, setXpEarned] = React.useState(0);
  const generatedContent = props.generatedContent;
  const callGemini = props.callGemini;
  const addToast = props.addToast || (() => {});
  const handleScoreUpdate = props.handleScoreUpdate;
  const inputText = props.inputText || '';
  const t = props.t || ((k, d) => d || k);

  const requestFeedback = React.useCallback(async () => {
    if (typeof callGemini !== 'function') {
      addToast(t('notes_feedback.no_ai') || 'AI feedback is not available right now.', 'warning');
      return;
    }
    const data = (generatedContent && generatedContent.data) || {};
    const ready = _checkTemplateReadyForFeedback(templateType, data);
    if (!ready.ok) {
      const reasonMsg = ({
        cornell_needs_notes: t('notes_feedback.cornell_needs_notes') || 'Add at least 2 rows of notes before asking for feedback.',
        lab_needs_substance: t('notes_feedback.lab_needs_substance') || 'Fill in the hypothesis, analysis, or conclusion before asking for feedback.',
        reading_needs_thinking: t('notes_feedback.reading_needs_thinking') || 'Write at least your thinking or connection before asking for feedback.',
        double_entry_needs_response: t('notes_feedback.double_entry_needs_response') || 'Respond to at least one quote before asking for feedback.',
        guided_needs_blanks: t('notes_feedback.guided_needs_blanks') || 'Fill in at least half the blanks (or add your own notes) before asking for feedback.',
        qanda_needs_pairs: t('notes_feedback.qanda_needs_pairs') || 'Write at least 2 complete question-and-answer pairs before asking for feedback.',
        empty: t('notes_feedback.empty') || 'Fill in some of the template before asking for feedback.',
      })[ready.reason] || (t('notes_feedback.empty') || 'Fill in some of the template before asking for feedback.');
      addToast(reasonMsg, 'info');
      return;
    }
    setIsLoading(true);
    addToast(t('notes_feedback.thinking') || 'Reading your notes...', 'info');
    try {
      const prompt = _buildNotesFeedbackPrompt(templateType, data, inputText);
      const raw = await callGemini(prompt, true);
      const parsed = JSON.parse((window.__alloUtils && window.__alloUtils.cleanJson ? window.__alloUtils.cleanJson(raw) : raw));
      setFeedback(parsed);
      // XP wiring — first-time bonus uses the resource's prior max via the
      // handleScoreUpdate delta calc, but we also check whether THIS template
      // type has any feedback history yet for the +5 first-time bonus.
      const isFirstTime = !((generatedContent && generatedContent.data && generatedContent.data.feedbackCount) || 0);
      const score = _calculateNotesXPScore(parsed.rubric, isFirstTime);
      const resourceId = (generatedContent && generatedContent.id) || null;
      const activityName = ({
        'cornell-notes': 'Cornell Notes Feedback',
        'lab-report': 'Lab Report Feedback',
        'reading-response': 'Reading Response Feedback',
        'double-entry': 'Double-Entry Journal Feedback',
        'guided-notes': 'Guided Notes Feedback',
        'q-and-a': 'Q&A Study Notes Feedback',
      })[templateType] || 'Notes Feedback';
      if (typeof handleScoreUpdate === 'function' && resourceId) {
        // handleScoreUpdate returns void; we compute the actual delta by
        // tracking the previous max ourselves for the UI display only.
        const prevMax = (generatedContent && generatedContent.data && generatedContent.data.prevFeedbackScore) || 0;
        const delta = Math.max(0, score - prevMax);
        handleScoreUpdate(score, activityName, resourceId);
        setXpEarned(delta);
        // Persist the new max + feedback count on the entry so future calls
        // know whether this is a first-time-on-this-type submission. We use
        // the handleNoteUpdate prop if available to do this cleanly.
        if (typeof props.handleNoteUpdate === 'function') {
          props.handleNoteUpdate('prevFeedbackScore', score);
          props.handleNoteUpdate('feedbackCount', (data.feedbackCount || 0) + 1);
        }
      } else {
        setXpEarned(0);
      }
    } catch (e) {
      console.warn('[NotesFeedback] failed', e);
      addToast(t('notes_feedback.error') || 'Could not generate feedback right now. Try again in a moment.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [callGemini, generatedContent, inputText, templateType, addToast, handleScoreUpdate, t, props]);

  const dismiss = React.useCallback(() => {
    setFeedback(null);
    setXpEarned(0);
  }, []);

  return { feedback, isLoading, xpEarned, requestFeedback, dismiss };
}

// Optional elaboration scaffold shared across templates that don't already
// structure connection-making (Cornell / Lab / Q&A). Invites the student to link
// the material to outside knowledge, a real-world example, an analogy, or a memory
// hook of their own — generative connection-making (elaborative interrogation /
// self-explanation). Always optional; never gates AI feedback.
const _ConnectionsSection = ({ value, onChange, hint, t }) => {
  const tt = t || ((k, d) => d || k);
  return (
    <_CardSection
      title={tt('notes_connections.title') || 'Connections & Memory Hooks'}
      hint={hint || (tt('notes_connections.hint') || "Optional — link this to something you already know: another subject, a real-world example, an analogy, or a memory trick of your own. Making your own connections is what makes learning stick.")}
      color="violet"
    >
      <textarea
        value={value || ''}
        onChange={onChange}
        placeholder={tt('notes_connections.placeholder') || 'e.g. This is like… / It connects to… / A way to remember this is…'}
        className="w-full text-sm text-slate-700 bg-white border border-slate-200 rounded-md p-3 outline-none focus:ring-2 focus:ring-violet-300 resize-y min-h-[70px]"
        rows={3}
        aria-label={tt('a11y.notes_connections') || 'Connections and memory hooks'}
        data-help-key="notes_connections_field"
      />
    </_CardSection>
  );
};

// Inline "Get AI Feedback" button used by each view above the footer.
const _GetFeedbackButton = ({ onClick, isLoading, t, colorClass = 'emerald' }) => {
  const palette = ({
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700',
    sky: 'bg-sky-600 hover:bg-sky-700 text-white border-sky-700',
    violet: 'bg-violet-600 hover:bg-violet-700 text-white border-violet-700',
    rose: 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700',
    cyan: 'bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-700',
  })[colorClass] || 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700';
  return (
    <div className="flex justify-center pt-2">
      <button
        onClick={onClick}
        disabled={isLoading}
        className={`px-5 py-2 text-sm font-bold rounded-full border shadow-sm transition-all ${palette} disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2`}
        aria-busy={isLoading}
        data-help-key="notes_feedback_button"
      >
        <span aria-hidden="true">{isLoading ? '⏳' : '💬'}</span>
        <span>{isLoading ? (t('notes_feedback.loading') || 'Reading your notes...') : (t('notes_feedback.button') || 'Get AI Feedback')}</span>
      </button>
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
  const fb = _useNotesFeedback(props, 'cornell-notes');
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
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4" data-help-key="cornell_notes_panel">
      <div className="bg-slate-50 border-l-4 border-indigo-600 p-3 rounded">
        <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">Cornell Notes</div>
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Today's lesson title"
          className="w-full text-xl font-black text-slate-800 bg-transparent border-b border-slate-300 focus:border-indigo-500 outline-none py-1"
          aria-label={t("a11y.cornell_title")}
          data-help-key="cornell_notes_title_field"
        />
        {lessonRef.generatedAt ? (
          <div className="text-[11px] text-slate-500 mt-1">Started: {new Date(lessonRef.generatedAt).toLocaleString()}</div>
        ) : null}
      </div>
      <div className="border-2 border-slate-300 rounded-xl overflow-hidden bg-white" data-help-key="cornell_notes_two_column_grid">
        <div className="grid grid-cols-[35%_65%] bg-slate-100 border-b border-slate-300">
          <div className="px-4 py-2 font-black text-xs uppercase tracking-wider text-slate-700 border-r border-slate-300" data-help-key="cornell_notes_cue_column">Cues / Questions</div>
          <div className="px-4 py-2 font-black text-xs uppercase tracking-wider text-slate-700" data-help-key="cornell_notes_notes_column">Notes</div>
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
                  className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 text-xs px-1"
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
          aria-label={t("a11y.cornell_add_row")}
          data-help-key="cornell_notes_add_row_button"
        >+ Add row</button>
      </div>
      <_CardSection title="Summary" hint="Write a short summary after the lesson. The act of summarizing in your own words consolidates the learning." color="emerald">
        <textarea
          value={summary}
          onChange={handleSummaryChange}
          placeholder={t("placeholders.type_summary_after")}
          className="w-full text-sm text-slate-700 bg-white border border-slate-200 rounded-md p-3 outline-none focus:ring-2 focus:ring-emerald-300 resize-y min-h-[100px]"
          rows={4}
          aria-label={t("a11y.cornell_summary")}
          data-help-key="cornell_notes_summary_section"
        />
      </_CardSection>
      <_ConnectionsSection value={data.connections} onChange={(e) => handleNoteUpdate('connections', e.target.value)} t={t} />
      <_GetFeedbackButton onClick={fb.requestFeedback} isLoading={fb.isLoading} t={t} colorClass="emerald" />
      <_NotesFeedbackPanel feedback={fb.feedback} xpEarned={fb.xpEarned} onDismiss={fb.dismiss} t={t} />
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
  const fb = _useNotesFeedback(props, 'lab-report');
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
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4" data-help-key="lab_report_panel">
      <div className="bg-slate-50 border-l-4 border-sky-600 p-3 rounded">
        <div className="text-xs font-bold text-sky-700 uppercase tracking-wider mb-1">Lab Report</div>
        <input
          type="text"
          value={title}
          onChange={(e) => handleNoteUpdate('title', e.target.value)}
          placeholder={t("placeholders.experiment_title")}
          className="w-full text-xl font-black text-slate-800 bg-transparent border-b border-slate-300 focus:border-sky-500 outline-none py-1"
          aria-label={t("a11y.lab_report_title")}
          data-help-key="lab_report_title_field"
        />
        {lessonRef.generatedAt ? (
          <div className="text-[11px] text-slate-500 mt-1">Started: {new Date(lessonRef.generatedAt).toLocaleString()}</div>
        ) : null}
      </div>
      <_CardSection title="Research Question" hint="What are you investigating? Frame it as a question you can answer through observation." color="sky">
        <textarea
          value={question}
          onChange={(e) => handleNoteUpdate('question', e.target.value)}
          placeholder={t("placeholders.research_question_q")}
          className="w-full text-sm bg-white border border-slate-200 rounded p-2 outline-none focus:ring-2 focus:ring-sky-300 resize-y min-h-[60px]"
          rows={2}
          aria-label={t("a11y.research_question")}
        />
      </_CardSection>
      <_CardSection title="Hypothesis" hint="Sentence frame: 'I predict that ___ will happen because ___.'" color="violet">
        <textarea
          value={hypothesis}
          onChange={(e) => handleNoteUpdate('hypothesis', e.target.value)}
          placeholder={t("placeholders.hypothesis_predict")}
          className="w-full text-sm bg-white border border-slate-200 rounded p-2 outline-none focus:ring-2 focus:ring-violet-300 resize-y min-h-[60px]"
          rows={2}
          aria-label={t("a11y.hypothesis")}
          data-help-key="lab_report_hypothesis_field"
        />
      </_CardSection>
      <_CardSection title="Materials" hint="List everything you need to run the experiment." color="amber">
        <ul className="space-y-1">
          {materials.length === 0 ? (
            <li className="text-xs text-slate-600 italic">No materials added yet.</li>
          ) : materials.map((m, idx) => (
            <li key={m.id || idx} className="flex items-center gap-2 group">
              <span className="text-slate-600 text-xs">•</span>
              <input
                type="text"
                value={m.text || ''}
                onChange={(e) => updateMaterialAt(idx, e.target.value)}
                className="flex-1 text-sm bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-amber-300"
                aria-label={`Material ${idx + 1}`}
              />
              <button onClick={() => removeMaterialAt(idx)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 text-xs" aria-label={t("a11y.remove_material")}>✕</button>
            </li>
          ))}
        </ul>
        <button onClick={addMaterial} className="mt-2 px-3 py-1 text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded hover:bg-amber-200">+ Add material</button>
      </_CardSection>
      <_CardSection title="Procedure" hint="Number each step. Another student should be able to follow your procedure and reproduce your experiment." color="emerald">
        <ol className="space-y-1">
          {procedure.length === 0 ? (
            <li className="text-xs text-slate-600 italic">No steps added yet.</li>
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
              <button onClick={() => removeProcedureStepAt(idx)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 text-xs mt-2" aria-label={t("a11y.remove_step")}>✕</button>
            </li>
          ))}
        </ol>
        <button onClick={addProcedureStep} className="mt-2 px-3 py-1 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded hover:bg-emerald-200" data-help-key="lab_report_add_step_button">+ Add step</button>
      </_CardSection>
      <_CardSection title="Data / Observations" hint="Record what you see, measure, or count. Use specific numbers and units when possible." color="indigo">
        <textarea
          value={dataObservations}
          onChange={(e) => handleNoteUpdate('data', e.target.value)}
          placeholder={t("placeholders.record_observations")}
          className="w-full text-sm bg-white border border-slate-200 rounded p-2 outline-none focus:ring-2 focus:ring-indigo-300 resize-y min-h-[100px] font-mono"
          rows={5}
          aria-label={t("a11y.data_observations")}
          data-help-key="lab_report_data_observations_field"
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
          data-help-key="lab_report_cer_section"
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
          data-help-key="lab_report_conclusion_field"
        />
      </_CardSection>
      <_ConnectionsSection value={data.connections} onChange={(e) => handleNoteUpdate('connections', e.target.value)} hint="Optional — how do these results connect to the real world, another experiment, or a concept you've learned? An analogy or memory hook is welcome too." t={t} />
      <_GetFeedbackButton onClick={fb.requestFeedback} isLoading={fb.isLoading} t={t} colorClass="sky" />
      <_NotesFeedbackPanel feedback={fb.feedback} xpEarned={fb.xpEarned} onDismiss={fb.dismiss} t={t} />
      <div className="text-[11px] text-slate-500 italic text-center">Lab Report saved to your history. Open it later to keep adding observations across days.</div>
    </div>
  );
});

// ── Reading Response Journal Entry ──────────────────────────────────────
const ReadingResponseView = React.memo((props) => {
  const generatedContent = props.generatedContent;
  const handleNoteUpdate = props.handleNoteUpdate || (() => {});
  const t = props.t || ((k, d) => d || k);
  const data = (generatedContent && generatedContent.data) || {};
  const title = data.title || '';
  const author = data.author || '';
  const fb = _useNotesFeedback(props, 'reading-response');
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
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4" data-help-key="reading_response_panel">
      <div className="bg-slate-50 border-l-4 border-violet-600 p-3 rounded">
        <div className="text-xs font-bold text-violet-700 uppercase tracking-wider mb-1">Reading Response</div>
        <input
          type="text"
          value={title}
          onChange={(e) => handleNoteUpdate('title', e.target.value)}
          placeholder="Title of what you read"
          className="w-full text-xl font-black text-slate-800 bg-transparent border-b border-slate-300 focus:border-violet-500 outline-none py-1"
          aria-label="Reading title"
          data-help-key="reading_response_title_field"
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
          data-help-key="reading_response_evidence_field"
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
        <div className="flex flex-wrap gap-2 mb-3" data-help-key="reading_response_connection_type_toggle">
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
          data-help-key="reading_response_connection_field"
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
          data-help-key="reading_response_open_question_field"
        />
      </_CardSection>
      <_GetFeedbackButton onClick={fb.requestFeedback} isLoading={fb.isLoading} t={t} colorClass="violet" />
      <_NotesFeedbackPanel feedback={fb.feedback} xpEarned={fb.xpEarned} onDismiss={fb.dismiss} t={t} />
      <div className="text-[11px] text-slate-500 italic text-center">Reading Response saved to your history. Browse all your responses to build a record of your reading life.</div>
    </div>
  );
});

// ── Double-Entry (Dialectical) Journal ───────────────────────────────────
// Two paired columns: a quote/passage FROM the text on the left, the student's
// response/interpretation on the right. Distinct from Reading Response (a single
// reflection) and from the AI-generated T-Chart (a sorting task) — this is a
// running dialogue with the text. Left column seeded with salient quotes; the
// student writes the right column.
const DoubleEntryView = React.memo((props) => {
  const generatedContent = props.generatedContent;
  const handleNoteUpdate = props.handleNoteUpdate || (() => {});
  const t = props.t || ((k, d) => d || k);
  const data = (generatedContent && generatedContent.data) || {};
  const title = data.title || '';
  const author = data.author || '';
  const pageRange = data.pageRange || '';
  const entries = Array.isArray(data.entries) ? data.entries : [];
  const lessonRef = data.lessonRef || {};
  const fb = _useNotesFeedback(props, 'double-entry');
  const rowCount = Math.max(entries.length, 1);
  const updateEntry = (idx, field, value) => {
    const next = entries.slice();
    while (next.length <= idx) next.push({ id: _genId('de'), quote: '', response: '' });
    next[idx] = { ...next[idx], [field]: value };
    handleNoteUpdate('entries', next);
  };
  const addRow = () => handleNoteUpdate('entries', entries.concat([{ id: _genId('de'), quote: '', response: '' }]));
  const removeRow = (idx) => handleNoteUpdate('entries', entries.filter((_, i) => i !== idx));
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4" data-help-key="double_entry_panel">
      <div className="bg-slate-50 border-l-4 border-rose-600 p-3 rounded">
        <div className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-1">Double-Entry Journal</div>
        <input
          type="text"
          value={title}
          onChange={(e) => handleNoteUpdate('title', e.target.value)}
          placeholder="Title of what you read"
          className="w-full text-xl font-black text-slate-800 bg-transparent border-b border-slate-300 focus:border-rose-500 outline-none py-1"
          aria-label="Reading title"
          data-help-key="double_entry_title_field"
        />
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <input type="text" value={author} onChange={(e) => handleNoteUpdate('author', e.target.value)} placeholder="Author" className="flex-1 text-sm text-slate-600 bg-transparent border-b border-slate-200 focus:border-rose-300 outline-none py-1" aria-label="Author" />
          <input type="text" value={pageRange} onChange={(e) => handleNoteUpdate('pageRange', e.target.value)} placeholder="Pages or chapter" className="sm:w-40 text-sm text-slate-600 bg-transparent border-b border-slate-200 focus:border-rose-300 outline-none py-1" aria-label="Pages or chapter" />
        </div>
        {lessonRef.generatedAt ? (
          <div className="text-[11px] text-slate-500 mt-1">Started: {new Date(lessonRef.generatedAt).toLocaleString()}</div>
        ) : null}
      </div>
      <div className="border-2 border-slate-300 rounded-xl overflow-hidden bg-white" data-help-key="double_entry_grid">
        <div className="grid grid-cols-2 bg-slate-100 border-b border-slate-300">
          <div className="px-4 py-2 font-black text-xs uppercase tracking-wider text-slate-700 border-r border-slate-300">Quote / Passage from the text</div>
          <div className="px-4 py-2 font-black text-xs uppercase tracking-wider text-slate-700">My response / thinking</div>
        </div>
        {Array.from({ length: rowCount }).map((_, idx) => {
          const en = entries[idx] || { quote: '', response: '' };
          return (
            <div key={(en && en.id) || idx} className="grid grid-cols-2 border-b border-slate-200 last:border-b-0 group">
              <div className="px-3 py-2 border-r border-slate-200">
                <textarea
                  value={en.quote || ''}
                  onChange={(e) => updateEntry(idx, 'quote', e.target.value)}
                  placeholder={idx === 0 ? '"Copy a line or passage that struck you..." (p. ___)' : ''}
                  className="w-full text-sm italic text-slate-700 bg-transparent resize-none outline-none focus:ring-2 focus:ring-rose-300 rounded p-1 min-h-[70px]"
                  rows={3}
                  aria-label={`Quote ${idx + 1}`}
                />
              </div>
              <div className="px-3 py-2 relative">
                <textarea
                  value={en.response || ''}
                  onChange={(e) => updateEntry(idx, 'response', e.target.value)}
                  placeholder={idx === 0 ? 'React, question, interpret. Why did this strike you? What does it make you think?' : ''}
                  className="w-full text-sm text-slate-700 bg-transparent resize-none outline-none focus:ring-2 focus:ring-rose-300 rounded p-1 min-h-[70px]"
                  rows={3}
                  aria-label={`Response ${idx + 1}`}
                />
                <button
                  onClick={() => removeRow(idx)}
                  className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 text-xs px-1"
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
          onClick={addRow}
          className="px-4 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-300 rounded-full hover:bg-rose-100"
          aria-label="Add a new quote and response row"
          data-help-key="double_entry_add_row_button"
        >+ Add entry</button>
      </div>
      <_GetFeedbackButton onClick={fb.requestFeedback} isLoading={fb.isLoading} t={t} colorClass="rose" />
      <_NotesFeedbackPanel feedback={fb.feedback} xpEarned={fb.xpEarned} onDismiss={fb.dismiss} t={t} />
      <div className="text-[11px] text-slate-500 italic text-center">Double-Entry Journal: quotes on the left, your thinking on the right. A dialogue with the text — saved to your notebook.</div>
    </div>
  );
});

// ── Guided Notes (fill-in-the-blank) ─────────────────────────────────────
// Teacher-style skeleton notes with the key terms blanked out. The AI generates
// the statements + correct answers from the source; the student completes the
// blanks during the lesson and self-checks. A deterministic "Check answers"
// reveal scores locally (no AI needed); the AI feedback button reflects on the
// student's own-notes space + overall engagement.
const GuidedNotesView = React.memo((props) => {
  const generatedContent = props.generatedContent;
  const handleNoteUpdate = props.handleNoteUpdate || (() => {});
  const t = props.t || ((k, d) => d || k);
  const data = (generatedContent && generatedContent.data) || {};
  const title = data.title || '';
  const blanks = Array.isArray(data.blanks) ? data.blanks : [];
  const notesExtra = typeof data.notesExtra === 'string' ? data.notesExtra : '';
  const lessonRef = data.lessonRef || {};
  const fb = _useNotesFeedback(props, 'guided-notes');
  const [revealed, setRevealed] = React.useState(false);
  const updateBlank = (idx, value) => {
    if (!blanks[idx]) return;
    const next = blanks.slice();
    next[idx] = { ...next[idx], studentAnswer: value };
    handleNoteUpdate('blanks', next);
  };
  const filledCount = blanks.filter(b => b && (b.studentAnswer || '').trim()).length;
  const correctCount = blanks.filter(b => b && _normalizeBlank(b.studentAnswer) && _normalizeBlank(b.studentAnswer) === _normalizeBlank(b.answer)).length;
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4" data-help-key="guided_notes_panel">
      <div className="bg-slate-50 border-l-4 border-emerald-600 p-3 rounded">
        <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">Guided Notes</div>
        <input
          type="text"
          value={title}
          onChange={(e) => handleNoteUpdate('title', e.target.value)}
          placeholder="Today's lesson title"
          className="w-full text-xl font-black text-slate-800 bg-transparent border-b border-slate-300 focus:border-emerald-500 outline-none py-1"
          aria-label="Lesson title"
          data-help-key="guided_notes_title_field"
        />
        {lessonRef.generatedAt ? (
          <div className="text-[11px] text-slate-500 mt-1">Started: {new Date(lessonRef.generatedAt).toLocaleString()}</div>
        ) : null}
      </div>
      <_CardSection title="Fill in the blanks" hint="Read or listen along, then complete each key term. Use Check answers when you're done to see how you did — matching ignores capitals and punctuation." color="emerald">
        {blanks.length === 0 ? (
          <p className="text-xs text-slate-600 italic">No guided notes were generated for this source. Use the notes space below to take your own.</p>
        ) : (
          <ol className="space-y-3">
            {blanks.map((b, idx) => {
              const studentAnswer = b.studentAnswer || '';
              const isCorrect = !!_normalizeBlank(studentAnswer) && _normalizeBlank(studentAnswer) === _normalizeBlank(b.answer);
              const showState = revealed && !!studentAnswer.trim();
              const inputBorder = showState
                ? (isCorrect ? 'border-emerald-500 bg-emerald-50' : 'border-rose-400 bg-rose-50')
                : 'border-slate-300 focus:ring-2 focus:ring-emerald-300';
              return (
                <li key={b.id || idx} className="text-sm text-slate-700 leading-relaxed">
                  <span className="text-slate-500 text-xs font-bold mr-1">{idx + 1}.</span>
                  <span>{b.before || ''}</span>
                  <input
                    type="text"
                    value={studentAnswer}
                    onChange={(e) => updateBlank(idx, e.target.value)}
                    placeholder="________"
                    className={`inline-block mx-1 px-2 py-0.5 text-sm font-semibold text-slate-800 bg-white border-b-2 rounded-sm outline-none align-baseline ${inputBorder}`}
                    aria-label={`Blank ${idx + 1}`}
                    style={{ width: Math.max(110, ((b.answer || '').length + 4) * 9) + 'px' }}
                  />
                  <span>{b.after || ''}</span>
                  {revealed && studentAnswer.trim() && isCorrect ? (
                    <span className="ml-1 text-xs font-black text-emerald-700" aria-label="Correct">✓</span>
                  ) : null}
                  {revealed && !isCorrect ? (
                    <span className="ml-2 text-xs font-bold text-emerald-700">
                      {studentAnswer.trim() ? <span className="text-rose-700" aria-label="Incorrect">✗ </span> : null}→ {b.answer}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
        {blanks.length > 0 ? (
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => setRevealed(r => !r)}
              className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 rounded-full hover:bg-emerald-200"
              aria-pressed={revealed}
              data-help-key="guided_notes_check_button"
            >{revealed ? 'Hide answers' : 'Check answers'}</button>
            {revealed ? (
              <span className="text-xs font-bold text-slate-600">{correctCount}/{blanks.length} correct · {filledCount}/{blanks.length} filled</span>
            ) : null}
          </div>
        ) : null}
      </_CardSection>
      <_CardSection title="My own notes" hint="Add anything else worth remembering — an example, a question, a connection to something you already know, or a memory hook of your own." color="indigo">
        <textarea
          value={notesExtra}
          onChange={(e) => handleNoteUpdate('notesExtra', e.target.value)}
          placeholder="Your own notes, questions, examples..."
          className="w-full text-sm text-slate-700 bg-white border border-slate-200 rounded-md p-3 outline-none focus:ring-2 focus:ring-indigo-300 resize-y min-h-[80px]"
          rows={3}
          aria-label="My own notes"
          data-help-key="guided_notes_own_notes_field"
        />
      </_CardSection>
      <_GetFeedbackButton onClick={fb.requestFeedback} isLoading={fb.isLoading} t={t} colorClass="emerald" />
      <_NotesFeedbackPanel feedback={fb.feedback} xpEarned={fb.xpEarned} onDismiss={fb.dismiss} t={t} />
      <div className="text-[11px] text-slate-500 italic text-center">Guided Notes saved to your notebook. The blanks are the key terms — revisit them to study.</div>
    </div>
  );
});

// ── Q&A Study Notes ──────────────────────────────────────────────────────
// Question/answer pairs for active-recall self-testing. Seeded with study
// questions + model answers from the source; the student edits/adds their own.
// "Quiz me" mode hides the answers so the student must retrieve them — the
// retrieval-practice payoff that a plain two-column table does not provide.
const QAndAView = React.memo((props) => {
  const generatedContent = props.generatedContent;
  const handleNoteUpdate = props.handleNoteUpdate || (() => {});
  const t = props.t || ((k, d) => d || k);
  const data = (generatedContent && generatedContent.data) || {};
  const title = data.title || '';
  const pairs = Array.isArray(data.pairs) ? data.pairs : [];
  const lessonRef = data.lessonRef || {};
  const fb = _useNotesFeedback(props, 'q-and-a');
  const [quizMode, setQuizMode] = React.useState(false);
  const [shown, setShown] = React.useState({});
  const rowCount = Math.max(pairs.length, 1);
  const updatePair = (idx, field, value) => {
    const next = pairs.slice();
    while (next.length <= idx) next.push({ id: _genId('qa'), question: '', answer: '' });
    next[idx] = { ...next[idx], [field]: value };
    handleNoteUpdate('pairs', next);
  };
  const addPair = () => handleNoteUpdate('pairs', pairs.concat([{ id: _genId('qa'), question: '', answer: '' }]));
  const removePair = (idx) => handleNoteUpdate('pairs', pairs.filter((_, i) => i !== idx));
  const toggleShown = (key) => setShown(s => ({ ...s, [key]: !s[key] }));
  const hasStudyable = pairs.some(p => p && (p.question || '').trim() && (p.answer || '').trim());
  const quizPairs = pairs.filter(p => p && (p.question || '').trim());
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4" data-help-key="qanda_panel">
      <div className="bg-slate-50 border-l-4 border-cyan-600 p-3 rounded">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold text-cyan-700 uppercase tracking-wider mb-1">Q&amp;A Study Notes</div>
          {hasStudyable ? (
            <button
              onClick={() => setQuizMode(q => !q)}
              className="px-3 py-1 text-xs font-bold rounded-full border border-cyan-300 text-cyan-800 bg-cyan-50 hover:bg-cyan-100"
              aria-pressed={quizMode}
              data-help-key="qanda_quiz_toggle"
            >{quizMode ? '✏️ Edit mode' : '🎯 Quiz me'}</button>
          ) : null}
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => handleNoteUpdate('title', e.target.value)}
          placeholder="Study set title"
          className="w-full text-xl font-black text-slate-800 bg-transparent border-b border-slate-300 focus:border-cyan-500 outline-none py-1"
          aria-label="Study set title"
          data-help-key="qanda_title_field"
        />
        {lessonRef.generatedAt ? (
          <div className="text-[11px] text-slate-500 mt-1">Started: {new Date(lessonRef.generatedAt).toLocaleString()}</div>
        ) : null}
      </div>
      {quizMode ? (
        <div className="space-y-3" data-help-key="qanda_quiz_view">
          {quizPairs.map((p, idx) => {
            const key = p.id || idx;
            return (
              <div key={key} className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="text-sm font-bold text-slate-800 mb-2"><span className="text-cyan-700 mr-1">Q{idx + 1}.</span>{p.question}</div>
                {shown[key] ? (
                  <>
                    <div className="text-sm text-slate-700 bg-cyan-50 border-l-4 border-cyan-400 rounded-r p-2">
                      {(p.answer || '').trim() ? p.answer : <span className="italic text-slate-600">No answer written yet.</span>}
                    </div>
                    <button onClick={() => toggleShown(key)} className="mt-2 text-[11px] text-slate-500 hover:text-slate-700 underline">Hide answer</button>
                  </>
                ) : (
                  <button onClick={() => toggleShown(key)} className="text-xs font-bold text-cyan-700 bg-cyan-50 border border-cyan-300 rounded-full px-3 py-1 hover:bg-cyan-100">Show answer</button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {Array.from({ length: rowCount }).map((_, idx) => {
            const p = pairs[idx] || { question: '', answer: '' };
            return (
              <div key={(p && p.id) || idx} className="bg-white border border-slate-200 rounded-lg p-3 group">
                <div className="flex items-start gap-2">
                  <span className="text-cyan-700 text-xs font-black mt-2 w-8 flex-shrink-0">Q{idx + 1}</span>
                  <div className="flex-1 space-y-2">
                    <textarea
                      value={p.question || ''}
                      onChange={(e) => updatePair(idx, 'question', e.target.value)}
                      placeholder={idx === 0 ? 'Write a study question (try a "why" or "how", not just "what")...' : 'Question...'}
                      className="w-full text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded p-2 outline-none focus:ring-2 focus:ring-cyan-300 resize-y min-h-[48px]"
                      rows={1}
                      aria-label={`Question ${idx + 1}`}
                    />
                    <textarea
                      value={p.answer || ''}
                      onChange={(e) => updatePair(idx, 'answer', e.target.value)}
                      placeholder="Answer — explain, don't just name."
                      className="w-full text-sm text-slate-700 bg-white border border-slate-200 rounded p-2 outline-none focus:ring-2 focus:ring-cyan-300 resize-y min-h-[48px]"
                      rows={2}
                      aria-label={`Answer ${idx + 1}`}
                    />
                  </div>
                  <button onClick={() => removePair(idx)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-500 text-xs mt-2" aria-label={`Remove pair ${idx + 1}`} title="Remove">✕</button>
                </div>
              </div>
            );
          })}
          <div className="flex justify-center">
            <button
              onClick={addPair}
              className="px-4 py-1.5 text-xs font-bold text-cyan-700 bg-cyan-50 border border-cyan-300 rounded-full hover:bg-cyan-100"
              aria-label="Add a question and answer pair"
              data-help-key="qanda_add_pair_button"
            >+ Add question</button>
          </div>
        </>
      )}
      <_ConnectionsSection value={data.connections} onChange={(e) => handleNoteUpdate('connections', e.target.value)} hint="Optional — connect this topic to another subject or real life, or invent a memory hook of your own for a tricky answer." t={t} />
      <_GetFeedbackButton onClick={fb.requestFeedback} isLoading={fb.isLoading} t={t} colorClass="cyan" />
      <_NotesFeedbackPanel feedback={fb.feedback} xpEarned={fb.xpEarned} onDismiss={fb.dismiss} t={t} />
      <div className="text-[11px] text-slate-500 italic text-center">Q&amp;A Study Notes saved to your notebook. Switch to Quiz me to self-test with active recall.</div>
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
  if (templateType === 'double-entry') return React.createElement(DoubleEntryView, props);
  if (templateType === 'guided-notes') return React.createElement(GuidedNotesView, props);
  if (templateType === 'q-and-a') return React.createElement(QAndAView, props);
  return null;
});

// ── Notebook Overlay ─────────────────────────────────────────────────────
// Header-button-launched overlay listing all the student's saved instructional
// resources (note-taking entries + anchor charts) across history, with filter
// chips per resource kind. Clicking an entry loads it into the main view.
// Matches the teacher-mode "jump to lesson plan" header-button precedent —
// first-class concept, dedicated surface, easy discovery.
const NOTEBOOK_TEMPLATE_META = {
  'cornell-notes':    { label: 'Cornell Notes',         accent: 'indigo',  short: 'Cornell',   icon: '📓' },
  'lab-report':       { label: 'Lab Report',            accent: 'sky',     short: 'Lab',       icon: '🧪' },
  'reading-response': { label: 'Reading Response',      accent: 'violet',  short: 'Reading',   icon: '📖' },
  'double-entry':     { label: 'Double-Entry Journal',  accent: 'rose',    short: 'Dialectic', icon: '✍️' },
  'guided-notes':     { label: 'Guided Notes',          accent: 'emerald', short: 'Guided',    icon: '📝' },
  'q-and-a':          { label: 'Q&A Study Notes',       accent: 'cyan',    short: 'Q&A',       icon: '❓' },
  'anchor-chart':     { label: 'Anchor Chart',          accent: 'amber',   short: 'Chart',     icon: '📋' },
};

// Normalize an entry to a single "kind" key. Note-taking entries discriminate
// by data.templateType; anchor-chart entries identify by entry.type directly.
const _entryKind = (entry) => {
  if (!entry) return null;
  if (entry.type === 'anchor-chart') return 'anchor-chart';
  if (entry.type === 'note-taking') return (entry.data && entry.data.templateType) || 'cornell-notes';
  return null;
};

const _accentClasses = (accent, kind) => {
  const map = {
    indigo: { chip: 'bg-indigo-600 text-white border-indigo-700', chipOff: 'bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50', badge: 'bg-indigo-100 text-indigo-800 border-indigo-300', bar: 'bg-indigo-500' },
    sky:    { chip: 'bg-sky-600 text-white border-sky-700',       chipOff: 'bg-white text-sky-700 border-sky-300 hover:bg-sky-50',         badge: 'bg-sky-100 text-sky-800 border-sky-300',         bar: 'bg-sky-500' },
    violet: { chip: 'bg-violet-600 text-white border-violet-700', chipOff: 'bg-white text-violet-700 border-violet-300 hover:bg-violet-50', badge: 'bg-violet-100 text-violet-800 border-violet-300', bar: 'bg-violet-500' },
    amber:  { chip: 'bg-amber-600 text-white border-amber-700',   chipOff: 'bg-white text-amber-800 border-amber-300 hover:bg-amber-50',   badge: 'bg-amber-100 text-amber-900 border-amber-300',   bar: 'bg-amber-500' },
    rose:   { chip: 'bg-rose-600 text-white border-rose-700',     chipOff: 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50',     badge: 'bg-rose-100 text-rose-800 border-rose-300',     bar: 'bg-rose-500' },
    emerald:{ chip: 'bg-emerald-600 text-white border-emerald-700', chipOff: 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', bar: 'bg-emerald-500' },
    cyan:   { chip: 'bg-cyan-600 text-white border-cyan-700',     chipOff: 'bg-white text-cyan-700 border-cyan-300 hover:bg-cyan-50',     badge: 'bg-cyan-100 text-cyan-800 border-cyan-300',     bar: 'bg-cyan-500' },
    slate:  { chip: 'bg-slate-700 text-white border-slate-800',   chipOff: 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50',   badge: 'bg-slate-100 text-slate-700 border-slate-300',   bar: 'bg-slate-500' },
  };
  return (map[accent] || map.slate)[kind] || '';
};

const _entryPreview = (entry) => {
  const data = (entry && entry.data) || {};
  if (entry && entry.type === 'anchor-chart') {
    const sections = Array.isArray(data.sections) ? data.sections : [];
    if (sections.length === 0) return '';
    const labels = sections.slice(0, 4).map(s => s && s.label).filter(Boolean).join(' · ');
    return labels || (sections[0] && Array.isArray(sections[0].bullets) && sections[0].bullets[0]) || '';
  }
  const tt = data.templateType;
  if (tt === 'cornell-notes') {
    const firstNote = (Array.isArray(data.notes) ? data.notes : []).find(n => n && (n.text || '').trim());
    if (firstNote) return firstNote.text;
    const firstCue = (Array.isArray(data.cues) ? data.cues : []).find(n => n && (n.text || '').trim());
    if (firstCue) return firstCue.text;
    if (data.summary) return data.summary;
    return '';
  }
  if (tt === 'lab-report') {
    return data.question || data.hypothesis || data.conclusion || '';
  }
  if (tt === 'reading-response') {
    return data.thinkings || data.favoriteLine || (data.connection && data.connection.text) || '';
  }
  if (tt === 'double-entry') {
    const entries = Array.isArray(data.entries) ? data.entries : [];
    const withResp = entries.find(en => en && (en.response || '').trim());
    if (withResp) return withResp.response;
    const withQuote = entries.find(en => en && (en.quote || '').trim());
    if (withQuote) return withQuote.quote;
    return '';
  }
  if (tt === 'guided-notes') {
    if ((data.notesExtra || '').trim()) return data.notesExtra;
    const blanks = Array.isArray(data.blanks) ? data.blanks : [];
    const first = blanks.find(b => b && ((b.before || '').trim() || (b.studentAnswer || '').trim()));
    if (first) return ((first.before || '') + ((first.studentAnswer || '').trim() || '___') + (first.after || '')).trim();
    return '';
  }
  if (tt === 'q-and-a') {
    const pairs = Array.isArray(data.pairs) ? data.pairs : [];
    const firstQ = pairs.find(p => p && (p.question || '').trim());
    if (firstQ) return firstQ.question;
    const firstA = pairs.find(p => p && (p.answer || '').trim());
    if (firstA) return firstA.answer;
    return '';
  }
  return '';
};

const _entryTitle = (entry) => {
  const data = (entry && entry.data) || {};
  if (data.title && data.title.trim()) return data.title.trim();
  const kind = _entryKind(entry);
  const meta = NOTEBOOK_TEMPLATE_META[kind];
  return meta ? `Untitled ${meta.label}` : 'Untitled entry';
};

// ── Longitudinal Insights ────────────────────────────────────────────────
// Process feedback across the student's saved note-taking history. Different
// from per-instance feedback — this is metacognitive, looks at patterns over
// time, and is NOT scored or XP-bearing. The point is growth, not evaluation.
function _buildNoteInsightsPrompt(noteEntries) {
  // Group entries by type + summarize each so we don't blow the context window.
  const byType = { 'cornell-notes': [], 'lab-report': [], 'reading-response': [], 'double-entry': [], 'guided-notes': [], 'q-and-a': [] };
  for (const entry of noteEntries) {
    const tt = (entry && entry.data && entry.data.templateType) || null;
    if (!tt || !byType[tt]) continue;
    byType[tt].push(_serializeTemplateForFeedback(tt, entry.data || {}).slice(0, 800));
  }
  const blocks = [];
  for (const [type, samples] of Object.entries(byType)) {
    if (samples.length === 0) continue;
    const label = ({ 'cornell-notes': 'Cornell Notes', 'lab-report': 'Lab Reports', 'reading-response': 'Reading Responses', 'double-entry': 'Double-Entry Journals', 'guided-notes': 'Guided Notes', 'q-and-a': 'Q&A Study Notes' })[type];
    blocks.push(`=== ${label} (${samples.length} entries) ===\n${samples.slice(0, 5).map((s, i) => `--- entry ${i + 1} ---\n${s}`).join('\n\n')}`);
  }
  return `
You are a supportive teacher analyzing a student's note-taking pattern across many sessions. The goal is metacognitive growth feedback, not evaluation of individual entries.

Look for PATTERNS across multiple entries, not problems with any single one. Examples of patterns worth surfacing:
- "Your Cornell cues tend to be factual ('What year did X happen?') rather than inferential ('Why might X have led to Y?'). Try mixing in some inference cues for deeper retrieval practice."
- "Your CER Reasoning sections average ~8 words. Research suggests aim for 25-40 words — Reasoning is where the scientific thinking lives."
- "You consistently write text-to-self connections in Reading Response. Try a text-to-text connection next time to push different thinking."
- "Your hypotheses are getting more specific over time — keep going."

Tone: warm, growth-focused, specific. Always frame as "try ___ next time" not "you should ___ ".

The student does NOT see scores or grades from this. This is process feedback only.

NOTE-TAKING HISTORY:
${blocks.join('\n\n')}

Return ONLY JSON:
{
  "summary": "1-2 sentence overview of the student's note-taking practice based on the entries provided. Specific and warm.",
  "patterns": [
    {
      "title": "Short label (4-8 words) naming the pattern",
      "observation": "1-2 sentences describing what you noticed, specific to this student's work",
      "tryNext": "1 sentence with a concrete, actionable suggestion"
    }
  ],
  "celebration": "1 sentence naming something the student is doing well and should keep doing."
}

Generate 2-4 patterns. Quality over quantity — one really specific pattern is worth more than three generic ones.
`.trim();
}

const _NoteInsightsModal = ({ isOpen, onClose, insights, isLoading, t }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="note-insights-modal-title">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="flex items-start justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-violet-50">
          <div>
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Note-Taking Insights</div>
            <h2 id="note-insights-modal-title" className="text-2xl font-black text-slate-800 mt-0.5">📊 {t('note_insights.title') || 'Your note-taking patterns'}</h2>
            <p className="text-xs text-slate-600 mt-1 leading-snug">{t('note_insights.subtitle') || 'Growth-focused observations across your saved entries. Not a grade — a mirror.'}</p>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-700 text-2xl leading-none p-1 -mt-1 -mr-1 rounded hover:bg-slate-100" aria-label={t('note_insights.close_aria') || 'Close insights'}>✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50 space-y-3">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3 animate-pulse">📓</div>
              <p className="text-slate-600 font-bold">{t('note_insights.loading') || 'Looking across your notebook...'}</p>
              <p className="text-xs text-slate-500 mt-1">{t('note_insights.loading_hint') || 'This takes a few seconds — patterns need a careful read.'}</p>
            </div>
          ) : !insights ? (
            <div className="text-center py-12 text-slate-500 text-sm">{t('note_insights.no_data') || 'No insights yet.'}</div>
          ) : (
            <>
              {insights.summary ? (
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">{t('note_insights.overview_label') || 'Overview'}</div>
                  <div className="text-sm text-slate-700 leading-relaxed">{insights.summary}</div>
                </div>
              ) : null}
              {Array.isArray(insights.patterns) && insights.patterns.map((p, i) => (
                <div key={i} className="bg-white border-l-4 border-violet-400 rounded-r-xl p-4 shadow-sm">
                  <div className="text-sm font-black text-violet-800 mb-1">{p.title}</div>
                  <div className="text-sm text-slate-700 leading-relaxed mb-2">{p.observation}</div>
                  <div className="text-xs bg-violet-50 border border-violet-200 rounded p-2 text-violet-900">
                    <span className="font-bold">{t('note_insights.try_next_label') || 'Try next:'}</span> {p.tryNext}
                  </div>
                </div>
              ))}
              {insights.celebration ? (
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 mt-4">
                  <div className="text-[11px] font-black text-emerald-800 uppercase tracking-wider mb-1">🌱 {t('note_insights.celebration_label') || 'Keep doing this'}</div>
                  <div className="text-sm text-slate-700 leading-relaxed">{insights.celebration}</div>
                </div>
              ) : null}
            </>
          )}
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-white text-[11px] text-slate-500 italic">
          {t('note_insights.footer') || "These observations are a mirror, not a grade. Use what's useful, set aside what isn't."}
        </div>
      </div>
    </div>
  );
};

const NotebookOverlay = React.memo((props) => {
  const isOpen = !!props.isOpen;
  const onClose = props.onClose || (() => {});
  const history = Array.isArray(props.history) ? props.history : [];
  const onSelectEntry = props.onSelectEntry || (() => {});
  const t = props.t || ((k, d) => d || k);
  const callGemini = props.callGemini;
  const addToast = props.addToast || (() => {});
  const [activeFilter, setActiveFilter] = React.useState('all');
  const [insightsOpen, setInsightsOpen] = React.useState(false);
  const [insights, setInsights] = React.useState(null);
  const [insightsLoading, setInsightsLoading] = React.useState(false);

  const noteEntries = history.filter(h => h && h.type === 'note-taking');

  const handleGenerateInsights = React.useCallback(async () => {
    if (typeof callGemini !== 'function') {
      addToast(t('note_insights.no_ai') || 'AI is not available right now.', 'warning');
      return;
    }
    if (noteEntries.length < 2) {
      addToast(t('note_insights.need_more_entries') || 'Save at least 2 note-taking entries before generating insights.', 'info');
      return;
    }
    setInsightsOpen(true);
    setInsightsLoading(true);
    setInsights(null);
    try {
      const prompt = _buildNoteInsightsPrompt(noteEntries);
      const raw = await callGemini(prompt, true);
      const parsed = JSON.parse((window.__alloUtils && window.__alloUtils.cleanJson ? window.__alloUtils.cleanJson(raw) : raw));
      setInsights(parsed);
    } catch (e) {
      console.warn('[NoteInsights] failed', e);
      addToast(t('note_insights.error') || 'Could not generate insights right now. Try again in a moment.', 'error');
      setInsightsOpen(false);
    } finally {
      setInsightsLoading(false);
    }
  }, [callGemini, noteEntries, addToast, t]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const notebookEntries = history.filter(h => h && (h.type === 'note-taking' || h.type === 'anchor-chart'));
  const sortedEntries = notebookEntries.slice().sort((a, b) => {
    const aTime = a.id || 0;
    const bTime = b.id || 0;
    return bTime - aTime;
  });
  const filtered = activeFilter === 'all'
    ? sortedEntries
    : sortedEntries.filter(e => _entryKind(e) === activeFilter);
  const counts = {
    all: sortedEntries.length,
    'cornell-notes':    sortedEntries.filter(e => _entryKind(e) === 'cornell-notes').length,
    'lab-report':       sortedEntries.filter(e => _entryKind(e) === 'lab-report').length,
    'reading-response': sortedEntries.filter(e => _entryKind(e) === 'reading-response').length,
    'double-entry':     sortedEntries.filter(e => _entryKind(e) === 'double-entry').length,
    'guided-notes':     sortedEntries.filter(e => _entryKind(e) === 'guided-notes').length,
    'q-and-a':          sortedEntries.filter(e => _entryKind(e) === 'q-and-a').length,
    'anchor-chart':     sortedEntries.filter(e => _entryKind(e) === 'anchor-chart').length,
  };
  const handlePrintAll = () => {
    try { window.print(); } catch (_) {}
  };
  const filters = [
    { id: 'all',              label: 'All',             accent: 'slate' },
    { id: 'cornell-notes',    label: 'Cornell Notes',   accent: 'indigo' },
    { id: 'lab-report',       label: 'Lab Reports',     accent: 'sky' },
    { id: 'reading-response', label: 'Reading',         accent: 'violet' },
    { id: 'double-entry',     label: 'Double-Entry',    accent: 'rose' },
    { id: 'guided-notes',     label: 'Guided Notes',    accent: 'emerald' },
    { id: 'q-and-a',          label: 'Q&A',             accent: 'cyan' },
    { id: 'anchor-chart',     label: 'Anchor Charts',   accent: 'amber' },
  ];
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 nt-no-print"
      role="dialog"
      aria-modal="true"
      aria-label="Notebook — all your saved entries"
    >
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="flex items-start justify-between p-5 border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-sky-50 to-violet-50">
          <div>
            <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">My Notebook</div>
            <h2 className="text-2xl font-black text-slate-800 mt-0.5">📓 Notebook</h2>
            <p className="text-xs text-slate-600 mt-1 leading-snug">Everything you've saved across sessions — Cornell Notes, Lab Reports, Reading Responses, Double-Entry Journals, Guided Notes, Q&amp;A sets, and Anchor Charts.</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-700 text-2xl leading-none p-1 -mt-1 -mr-1 rounded hover:bg-slate-100"
            aria-label="Close notebook"
            title="Close (Esc)"
          >✕</button>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-slate-100 bg-white">
          {filters.map((f) => {
            const isActive = activeFilter === f.id;
            const count = counts[f.id] || 0;
            return (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${isActive ? _accentClasses(f.accent, 'chip') : _accentClasses(f.accent, 'chipOff')}`}
                aria-pressed={isActive}
              >
                {f.label} <span className="opacity-75 ml-1">({count})</span>
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={handleGenerateInsights}
              disabled={insightsLoading || noteEntries.length < 2}
              className="px-3 py-1.5 text-xs font-bold text-violet-800 bg-violet-100 border border-violet-300 rounded-full hover:bg-violet-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              aria-label={t('note_insights.button_aria') || 'Generate note-taking insights across your saved entries'}
              title={noteEntries.length < 2 ? (t('note_insights.need_more_entries_short') || 'Save 2+ entries to unlock') : (t('note_insights.button_tooltip') || 'AI looks for patterns across your notes and offers growth suggestions')}
              data-help-key="note_insights_button"
            >
              {insightsLoading ? '⏳' : '📊'} {t('note_insights.button') || 'Insights'}
            </button>
            <button
              onClick={handlePrintAll}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-300 rounded-full hover:bg-slate-200"
              aria-label="Print or export notebook as PDF"
              title="Print or save as PDF"
            >🖨️ Print / PDF</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 bg-slate-50">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-3 opacity-50">📓</div>
              <p className="text-slate-600 font-bold mb-1">
                {sortedEntries.length === 0 ? 'Your notebook is empty.' : 'No entries match this filter.'}
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                {sortedEntries.length === 0
                  ? 'Open Note-Taking or Anchor Chart from the sidebar to start saving. Each finished entry lands here.'
                  : 'Switch filters above to see other entry types.'}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((entry) => {
                const kind = _entryKind(entry) || 'cornell-notes';
                const meta = NOTEBOOK_TEMPLATE_META[kind] || NOTEBOOK_TEMPLATE_META['cornell-notes'];
                const title = _entryTitle(entry);
                const preview = _entryPreview(entry);
                const previewTruncated = preview && preview.length > 140 ? preview.slice(0, 137) + '…' : preview;
                const ts = entry.data && entry.data.lessonRef && entry.data.lessonRef.generatedAt
                  ? entry.data.lessonRef.generatedAt
                  : entry.id;
                let when = '';
                try { when = new Date(ts).toLocaleString(); } catch (_) { when = ''; }
                return (
                  <li key={entry.id}>
                    <button
                      onClick={() => onSelectEntry(entry)}
                      className="w-full text-left bg-white border border-slate-200 rounded-lg p-3 hover:border-indigo-400 hover:shadow-md transition-all group focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      aria-label={`Open ${meta.label}: ${title}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-1 self-stretch rounded-full ${_accentClasses(meta.accent, 'bar')}`} aria-hidden="true" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${_accentClasses(meta.accent, 'badge')}`}>
                              {meta.icon} {meta.short}
                            </span>
                            {when ? <span className="text-[11px] text-slate-600">{when}</span> : null}
                          </div>
                          <div className="font-bold text-slate-800 text-sm truncate group-hover:text-indigo-700">{title}</div>
                          {previewTruncated ? (
                            <div className="text-xs text-slate-500 mt-1 leading-snug line-clamp-2">{previewTruncated}</div>
                          ) : (
                            <div className="text-xs text-slate-600 italic mt-1">No notes yet — open to start writing.</div>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-white text-[11px] text-slate-500 flex items-center justify-between">
          <span>Click any entry to open it. Your notebook stays with you across sessions.</span>
          <span className="font-mono">{sortedEntries.length} total</span>
        </div>
      </div>
      <_NoteInsightsModal
        isOpen={insightsOpen}
        onClose={() => setInsightsOpen(false)}
        insights={insights}
        isLoading={insightsLoading}
        t={t}
      />
    </div>
  );
});
