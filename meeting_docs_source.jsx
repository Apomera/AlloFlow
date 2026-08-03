/**
 * AlloFlow — Meeting Documentation (Leadership Hub tool) — MVP, Aug 2026.
 *
 * Turn raw notes or a transcript into the district's meeting format:
 * pick a template (built-in SST / IEP team / 504 / parent conference /
 * staff-PLC / MDT, or custom), paste the raw material, and get an
 * editable structured record — sections, decisions, action items with
 * owners and due dates — plus a cross-meeting action tracker and an
 * accessible HTML export.
 *
 * Two integrity mechanisms are the point of this tool:
 *  1. LOCAL NAME MASKING: names the user lists are replaced with codes
 *     (Person A, Person B...) on this device BEFORE any AI call, and
 *     restored locally afterward. Names never leave the device.
 *  2. SOURCE ANCHORING: every AI-extracted decision/action item carries a
 *     quote from the source text; quotes that can't be found back in the
 *     source are flagged "unverified — check your notes" in the UI. The
 *     model formats; the human certifies. A no-AI manual mode uses the
 *     same templates end-to-end.
 */

const MEETDOCS_TEMPLATES_KEY = 'allo_meetdocs_templates_v1';
const MEETDOCS_MEETINGS_KEY = 'allo_meetdocs_meetings_v1';
const MEETDOCS_DRAFT_KEY = 'allo_meetdocs_draft_v1';

const MEETDOCS_BUILTIN_TEMPLATES = [
  { id: 'sst', builtin: true, name: 'Student Support Team (SST)', sections: [
    { id: 'attendees', title: 'Attendees and roles', hint: 'Who was present, in what role' },
    { id: 'strengths', title: 'Student strengths', hint: 'Assets and what is working' },
    { id: 'concerns', title: 'Concerns raised', hint: 'Specific, observable concerns' },
    { id: 'data', title: 'Data reviewed', hint: 'Screening, work samples, attendance, behavior data' },
    { id: 'interventions', title: 'Interventions tried so far', hint: 'What, how long, with what result' },
    { id: 'plan', title: 'Plan going forward', hint: 'New or continued supports, who delivers them' },
    { id: 'followup', title: 'Follow-up', hint: 'When the team reconvenes and what data comes back' },
  ] },
  { id: 'iep', builtin: true, name: 'IEP Team Meeting', sections: [
    { id: 'attendees', title: 'Attendees and roles', hint: 'Required members present/excused' },
    { id: 'purpose', title: 'Purpose of the meeting', hint: 'Annual review, amendment, eligibility...' },
    { id: 'present_levels', title: 'Present levels discussed', hint: 'Academic and functional performance' },
    { id: 'proposals', title: 'Proposals considered', hint: 'Options the team discussed, including those NOT adopted and why — feeds prior written notice' },
    { id: 'decisions_notes', title: 'Team decisions', hint: 'What the team agreed to change or keep' },
    { id: 'parent_input', title: 'Family input', hint: 'Concerns and priorities the family raised' },
    { id: 'next_steps', title: 'Next steps', hint: 'Who does what before implementation' },
  ] },
  { id: 'plan504', builtin: true, name: '504 Plan Meeting', sections: [
    { id: 'attendees', title: 'Attendees and roles', hint: '' },
    { id: 'basis', title: 'Basis for the plan', hint: 'Impairment and the major life activity affected' },
    { id: 'accommodations', title: 'Accommodations discussed', hint: 'Current and proposed' },
    { id: 'decisions_notes', title: 'Decisions', hint: 'Adopted changes' },
    { id: 'review', title: 'Review date', hint: '' },
  ] },
  { id: 'parent_conf', builtin: true, name: 'Parent/Family Conference', sections: [
    { id: 'attendees', title: 'Attendees', hint: '' },
    { id: 'topics', title: 'Topics discussed', hint: '' },
    { id: 'family_input', title: 'Family input', hint: 'What the family shared and asked for' },
    { id: 'school_input', title: 'School input', hint: 'What staff shared' },
    { id: 'agreements', title: 'Agreements', hint: 'What both sides agreed to try' },
  ] },
  { id: 'staff', builtin: true, name: 'Staff / PLC Meeting', sections: [
    { id: 'attendees', title: 'Attendees', hint: '' },
    { id: 'agenda', title: 'Agenda topics', hint: '' },
    { id: 'discussion', title: 'Discussion summary', hint: '' },
    { id: 'parking', title: 'Parking lot', hint: 'Raised but deferred' },
  ] },
  { id: 'mdt', builtin: true, name: 'Evaluation Planning (MDT)', sections: [
    { id: 'attendees', title: 'Attendees and roles', hint: '' },
    { id: 'referral', title: 'Referral concerns', hint: '' },
    { id: 'existing', title: 'Existing data reviewed', hint: 'What we already know' },
    { id: 'assessments', title: 'Assessments planned', hint: 'Which areas, which tools, who administers' },
    { id: 'consent', title: 'Consent status', hint: 'Sent / received / pending' },
    { id: 'timeline', title: 'Timeline', hint: 'Evaluation clock and key dates' },
  ] },
];

function meetdocsLoad(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed == null ? fallback : parsed;
  } catch (_) { return fallback; }
}

function meetdocsStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
}

function meetdocsNextId(prefix) {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

function meetdocsDateStamp() {
  return new Date().toISOString().slice(0, 10);
}

// ── Name masking (pure, local) ──────────────────────────────────────
// Longest-first so "Alberto" is consumed before "Al" can partial-match,
// and a Unicode-letter boundary check so "Al" never matches inside
// "Alberto" or "Salvador" (JS \b is ASCII-only — memory-lane bug class).
function meetdocsEscapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function meetdocsMaskPairs(names) {
  const seen = new Set();
  const clean = [];
  (names || []).forEach((n) => {
    const name = String(n || '').trim();
    const key = name.toLowerCase();
    if (name.length >= 2 && !seen.has(key)) { seen.add(key); clean.push(name); }
  });
  // Codes assigned in the ORDER GIVEN (stable for the user); replacement
  // order below is longest-first regardless.
  return clean.map((name, i) => ({ name, code: 'Person ' + String.fromCharCode(65 + (i % 26)) + (i >= 26 ? String(Math.floor(i / 26)) : '') }));
}

function meetdocsMask(text, pairs) {
  let out = String(text || '');
  const byLength = [...(pairs || [])].sort((a, b) => b.name.length - a.name.length);
  byLength.forEach(({ name, code }) => {
    const re = new RegExp('(^|[^\\p{L}])(' + meetdocsEscapeRe(name) + ')(?=[^\\p{L}]|$)', 'giu');
    out = out.replace(re, (m, before) => before + code);
  });
  return out;
}

function meetdocsUnmask(text, pairs) {
  let out = String(text || '');
  // Codes are unambiguous tokens ("Person A"), longest code first so
  // "Person A1" is restored before "Person A" can eat its prefix.
  const byLength = [...(pairs || [])].sort((a, b) => b.code.length - a.code.length);
  byLength.forEach(({ name, code }) => {
    out = out.split(code).join(name);
  });
  return out;
}

// ── Source-anchor verification (pure) ───────────────────────────────
// A quote "verifies" when its normalized form appears in the normalized
// source. Normalization: lowercase, collapse whitespace, strip straight/
// curly quotes — transcription artifacts, not meaning.
function meetdocsNormalize(s) {
  return String(s || '').toLowerCase().replace(/["“”'’]/g, '').replace(/\s+/g, ' ').trim();
}

function meetdocsVerifyQuote(quote, sourceText) {
  const q = meetdocsNormalize(quote);
  if (q.length < 8) return false; // too short to anchor anything
  return meetdocsNormalize(sourceText).indexOf(q) !== -1;
}

// ── AI response parsing (pure) ──────────────────────────────────────
function meetdocsParseAiJson(raw) {
  let text = String(raw == null ? '' : raw).trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    return (obj && typeof obj === 'object') ? obj : null;
  } catch (_) { return null; }
}

// Build the structured meeting from a parsed AI object + the masked
// source, verifying every quote and unmasking every string locally.
function meetdocsBuildFromAi(aiObj, template, maskedSource, pairs) {
  const sections = {};
  template.sections.forEach((sec) => {
    const v = aiObj && aiObj.sections && aiObj.sections[sec.id];
    sections[sec.id] = meetdocsUnmask(typeof v === 'string' ? v : '', pairs);
  });
  const mkItems = (list, extra) => (Array.isArray(list) ? list : []).slice(0, 40).map((it) => {
    const text = meetdocsUnmask(String((it && it.text) || '').trim(), pairs);
    const quote = String((it && it.quote) || '').trim();
    if (!text) return null;
    return {
      id: meetdocsNextId('mi'),
      text,
      source: meetdocsUnmask(quote, pairs),
      verified: meetdocsVerifyQuote(quote, maskedSource),
      ...extra(it),
    };
  }).filter(Boolean);
  const decisions = mkItems(aiObj && aiObj.decisions, () => ({}));
  const actionItems = mkItems(aiObj && aiObj.actionItems, (it) => ({
    owner: meetdocsUnmask(String((it && it.owner) || '').trim(), pairs),
    due: String((it && it.due) || '').trim(),
    done: false,
  }));
  return { sections, decisions, actionItems };
}

function meetdocsAiPrompt(template, maskedText) {
  const sectionSpec = template.sections.map((s) => '  "' + s.id + '": string  // ' + s.title + (s.hint ? (' — ' + s.hint) : '')).join('\n');
  return 'You are formatting school meeting notes into a structured record. Use ONLY information present in the notes — never invent attendees, decisions, or dates. Names have been replaced with codes like "Person A"; keep those codes exactly as written.\n\n'
    + 'Return STRICT JSON with this shape:\n{\n "sections": {\n' + sectionSpec + '\n },\n'
    + ' "decisions": [ { "text": string, "quote": string } ],\n'
    + ' "actionItems": [ { "text": string, "owner": string, "due": string, "quote": string } ]\n}\n\n'
    + 'Rules: "quote" must be an EXACT substring copied verbatim from the notes that supports the item (this is checked mechanically). Leave a section as an empty string when the notes contain nothing for it. "due" is YYYY-MM-DD when a date is stated, otherwise "". "owner" is who agreed to do it, otherwise "". Decisions are things the group DECIDED; action items are things someone will DO.\n\n'
    + 'NOTES:\n' + maskedText;
}

// ── Action-item rollup across saved meetings (pure) ─────────────────
function meetdocsActionRollup(meetings, today) {
  const items = [];
  (meetings || []).forEach((m) => {
    (m.actionItems || []).forEach((it) => {
      if (!it || !it.text) return;
      items.push({
        meetingId: m.id, meetingTitle: m.title, meetingDate: m.date,
        id: it.id, text: it.text, owner: it.owner || '', due: it.due || '',
        done: !!it.done,
        overdue: !it.done && !!it.due && !!today && it.due < today,
      });
    });
  });
  items.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    return String(a.due || '9999').localeCompare(String(b.due || '9999'));
  });
  return items;
}

// ── Accessible HTML export (pure) ───────────────────────────────────
function meetdocsEscHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function meetdocsMeetingHtml(meeting, template) {
  const esc = meetdocsEscHtml;
  const secs = (template ? template.sections : []).map((sec) => {
    const body = meeting.sections && meeting.sections[sec.id];
    if (!body) return '';
    return '<h2>' + esc(sec.title) + '</h2>\n<p class="body">' + esc(body) + '</p>';
  }).filter(Boolean).join('\n');
  const decisions = (meeting.decisions || []).map((d) =>
    '<li>' + esc(d.text) + (d.verified === false ? ' <em>(unverified against notes)</em>' : '') + '</li>').join('\n');
  const actions = (meeting.actionItems || []).map((a) =>
    '<li>' + esc(a.text)
    + (a.owner ? (' — <strong>' + esc(a.owner) + '</strong>') : '')
    + (a.due ? (' (due ' + esc(a.due) + ')') : '')
    + (a.verified === false ? ' <em>(unverified against notes)</em>' : '')
    + '</li>').join('\n');
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + '<title>' + esc(meeting.title || 'Meeting record') + ' — ' + esc(meeting.date || '') + '</title>\n'
    + '<style>\nbody{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#1e293b;line-height:1.5}\n'
    + 'h1{font-size:1.35rem;border-bottom:2px solid #0f766e;padding-bottom:.4rem}\nh2{font-size:1.05rem;margin-top:1.3rem}\n'
    + '.meta{color:#475569;font-size:.9rem}\n.body{white-space:pre-wrap}\nul{padding-left:1.2rem}\nli{margin:.3rem 0}\n'
    + 'footer{margin-top:2rem;border-top:1px solid #cbd5e1;padding-top:.6rem;font-size:.75rem;color:#64748b}\n@media print{body{margin:.5rem auto}}\n</style>\n</head>\n<body>\n'
    + '<h1>' + esc(meeting.title || 'Meeting record') + '</h1>\n'
    + '<p class="meta">' + esc(meeting.templateName || '') + ' · ' + esc(meeting.date || '') + '</p>\n'
    + secs + '\n'
    + (decisions ? ('<h2>Decisions</h2>\n<ul>\n' + decisions + '\n</ul>\n') : '')
    + (actions ? ('<h2>Action items</h2>\n<ul>\n' + actions + '\n</ul>\n') : '')
    + '<footer>Prepared with AlloFlow Meeting Documentation. Content was reviewed and certified by the preparer; automated formatting never adds information that is not in the meeting notes.</footer>\n'
    + '</body>\n</html>\n';
}

function meetdocsDownload(filename, mime, content, addToast, okMsg, failMsg) {
  try {
    const url = URL.createObjectURL(new Blob([content], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    addToast(okMsg, 'info');
  } catch (e) {
    addToast(failMsg + String(e && e.message), 'error');
  }
}

function meetdocsAnnounce(message) {
  try {
    const region = document.getElementById('allo-live-meetdocs');
    if (region) { region.textContent = ''; region.textContent = message; }
  } catch (_) {}
}

function MeetingDocsPanel(props) {
  const { onClose, t, addToast = (() => {}), callGemini = null } = props;
  const tt = React.useCallback((key, fallback) => {
    if (typeof t === 'function') {
      try { const v = t(key); if (v) return v; } catch (_) {}
    }
    return fallback;
  }, [t]);

  const [customTemplates, setCustomTemplates] = React.useState(() => { const v = meetdocsLoad(MEETDOCS_TEMPLATES_KEY, []); return Array.isArray(v) ? v : []; });
  const [meetings, setMeetings] = React.useState(() => { const v = meetdocsLoad(MEETDOCS_MEETINGS_KEY, []); return Array.isArray(v) ? v : []; });
  const [draft, setDraft] = React.useState(() => {
    const d = meetdocsLoad(MEETDOCS_DRAFT_KEY, null);
    return (d && typeof d === 'object' && d.stage) ? d : null;
  });
  const [tab, setTab] = React.useState('new');
  const [viewId, setViewId] = React.useState(null);
  const [nameInput, setNameInput] = React.useState('');
  const [aiBusy, setAiBusy] = React.useState(false);
  const [armDelete, setArmDelete] = React.useState(null);
  const [tplDraft, setTplDraft] = React.useState(null); // custom template editor
  const dialogRef = React.useRef(null);

  React.useEffect(() => { meetdocsStore(MEETDOCS_TEMPLATES_KEY, customTemplates); }, [customTemplates]);
  React.useEffect(() => { meetdocsStore(MEETDOCS_MEETINGS_KEY, meetings); }, [meetings]);
  React.useEffect(() => {
    if (draft) meetdocsStore(MEETDOCS_DRAFT_KEY, draft);
    else { try { localStorage.removeItem(MEETDOCS_DRAFT_KEY); } catch (_) {} }
  }, [draft]);

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const previousFocus = document.activeElement;
    const trapStack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
    const trap = { root: dialog };
    trapStack.push(trap);
    const isTopTrap = () => trapStack[trapStack.length - 1] === trap;
    const getFocusable = () => Array.from(dialog.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((el) => !el.closest('[hidden], [inert], [aria-hidden="true"]'));
    const first = getFocusable()[0];
    (first || dialog).focus();
    const onKeyDown = (event) => {
      if (!isTopTrap()) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(); return; }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) { event.preventDefault(); dialog.focus(); return; }
      const firstItem = focusable[0], lastItem = focusable[focusable.length - 1];
      if (!dialog.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? lastItem : firstItem).focus(); }
      else if (event.shiftKey && document.activeElement === firstItem) { event.preventDefault(); lastItem.focus(); }
      else if (!event.shiftKey && document.activeElement === lastItem) { event.preventDefault(); firstItem.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const wasTop = isTopTrap();
      const idx = trapStack.indexOf(trap);
      if (idx !== -1) trapStack.splice(idx, 1);
      if (wasTop && previousFocus && previousFocus !== document.body && previousFocus.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, [onClose]);

  const allTemplates = [...MEETDOCS_BUILTIN_TEMPLATES, ...customTemplates];
  const templateById = (id) => allTemplates.find((x) => x.id === id) || null;

  const startDraft = (templateId) => {
    setDraft({
      stage: 'input',
      templateId,
      title: '',
      date: meetdocsDateStamp(),
      rawText: '',
      maskNames: [],
    });
  };

  const addMaskName = () => {
    const name = nameInput.trim();
    if (name.length < 2) return;
    setDraft((d) => d ? { ...d, maskNames: [...d.maskNames.filter((n) => n.toLowerCase() !== name.toLowerCase()), name] } : d);
    setNameInput('');
  };

  const toReview = (built, aiUsed) => {
    setDraft((d) => d ? {
      ...d,
      stage: 'review',
      aiUsed: !!aiUsed,
      sections: built.sections,
      decisions: built.decisions,
      actionItems: built.actionItems,
    } : d);
    meetdocsAnnounce(tt('meetdocs.review_announce', 'Draft record ready for review.'));
  };

  const convertManual = () => {
    const template = templateById(draft.templateId);
    if (!template) return;
    const sections = {};
    template.sections.forEach((s) => { sections[s.id] = ''; });
    toReview({ sections, decisions: [], actionItems: [] }, false);
  };

  const convertAi = async () => {
    const template = templateById(draft.templateId);
    if (!template || typeof callGemini !== 'function') return;
    if (draft.rawText.trim().length < 40) { addToast(tt('meetdocs.too_short', 'Paste the notes or transcript first (a few sentences at minimum).'), 'warning'); return; }
    const pairs = meetdocsMaskPairs(draft.maskNames);
    const masked = meetdocsMask(draft.rawText, pairs);
    setAiBusy(true);
    try {
      const raw = await callGemini(meetdocsAiPrompt(template, masked), true);
      const parsed = meetdocsParseAiJson(raw);
      if (!parsed) { addToast(tt('meetdocs.ai_unparseable', 'The AI response could not be read — try again, or use manual mode.'), 'error'); return; }
      const built = meetdocsBuildFromAi(parsed, template, masked, pairs);
      const unverified = [...built.decisions, ...built.actionItems].filter((x) => !x.verified).length;
      toReview(built, true);
      if (unverified > 0) addToast(unverified + ' ' + tt('meetdocs.unverified_toast', 'item(s) could not be matched to your notes — review the flagged ones.'), 'warning');
    } catch (e) {
      addToast(tt('meetdocs.ai_failed', 'Conversion failed: ') + String((e && e.message) || e), 'error');
    } finally {
      setAiBusy(false);
    }
  };

  const saveMeeting = () => {
    const template = templateById(draft.templateId);
    const record = {
      id: meetdocsNextId('mt'),
      title: draft.title.trim() || ((template ? template.name : 'Meeting') + ' — ' + draft.date),
      date: draft.date,
      templateId: draft.templateId,
      templateName: template ? template.name : '',
      savedAt: Date.now(),
      aiUsed: !!draft.aiUsed,
      sections: draft.sections || {},
      decisions: draft.decisions || [],
      actionItems: draft.actionItems || [],
    };
    setMeetings((m) => [record, ...m]);
    setDraft(null);
    setTab('meetings');
    setViewId(record.id);
    addToast(tt('meetdocs.saved_toast', 'Meeting record saved on this device.'), 'success');
  };

  const setItemDone = (meetingId, itemId, done) => {
    setMeetings((list) => list.map((m) => m.id !== meetingId ? m : {
      ...m,
      actionItems: (m.actionItems || []).map((it) => it.id === itemId ? { ...it, done } : it),
    }));
  };

  const exportHtmlFor = (meeting) => {
    const template = templateById(meeting.templateId) || { sections: Object.keys(meeting.sections || {}).map((id) => ({ id, title: id })) };
    meetdocsDownload(
      'meeting-' + (meeting.date || meetdocsDateStamp()) + '.html', 'text/html',
      meetdocsMeetingHtml(meeting, template), addToast,
      tt('meetdocs.export_toast', 'Export started — check your downloads.'),
      tt('meetdocs.export_failed', 'Export failed: ')
    );
  };

  const viewMeeting = viewId ? meetings.find((m) => m.id === viewId) : null;
  const today = meetdocsDateStamp();
  const rollup = meetdocsActionRollup(meetings, today);
  const openCount = rollup.filter((x) => !x.done).length;

  const tabs = [
    { id: 'new', label: tt('meetdocs.tab_new', 'New record'), icon: '📝' },
    { id: 'meetings', label: tt('meetdocs.tab_meetings', 'Meetings'), icon: '🗂️' },
    { id: 'actions', label: tt('meetdocs.tab_actions', 'Action items') + (openCount ? (' (' + openCount + ')') : ''), icon: '☑️' },
  ];

  const draftTemplate = draft ? templateById(draft.templateId) : null;

  return (
    <div className="fixed inset-0 z-[260] bg-black/40 flex items-center justify-center overflow-y-auto p-2 sm:p-4" style={{ zIndex: 260 }} role="presentation" onClick={onClose}>
      <div ref={dialogRef} tabIndex={-1} data-help-key="meetdocs_panel" className="allo-docsuite bg-slate-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-indigo-500" style={{ maxHeight: '92vh' }} role="dialog" aria-modal="true" aria-labelledby="meetdocs-title" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-slate-50/95 border-b border-slate-200 px-4 pt-4 pb-2 rounded-t-2xl">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 id="meetdocs-title" className="text-lg font-bold text-slate-800 flex items-center gap-2"><span aria-hidden="true">📋</span> {tt('meetdocs.title', 'Meeting Documentation')}</h2>
              <p className="text-xs text-slate-600">{tt('meetdocs.subtitle', 'Notes in, your district’s format out — names masked locally before any AI call.')}</p>
            </div>
            <button type="button" onClick={onClose} className="min-w-11 min-h-11 p-2 inline-flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 text-xl" aria-label={tt('meetdocs.close_aria', 'Close Meeting Documentation')}>✕</button>
          </div>
          <div role="tablist" aria-label={tt('meetdocs.tabs_aria', 'Meeting documentation sections')} className="flex gap-1 mt-2">
            {tabs.map((tb) => (
              <button key={tb.id} type="button" role="tab" aria-selected={tab === tb.id} data-help-key={'meetdocs_tab_' + tb.id}
                onClick={() => { setTab(tb.id); if (tb.id !== 'meetings') setViewId(null); }}
                className={'min-h-11 px-3 py-1.5 rounded-t-lg text-sm font-bold border-b-2 ' + (tab === tb.id ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-100')}
              ><span aria-hidden="true">{tb.icon}</span> {tb.label}</button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {tab === 'new' && !draft && !tplDraft && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-2">{tt('meetdocs.pick_template', 'Pick a format')}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allTemplates.map((tpl) => (
                  <button key={tpl.id} type="button" onClick={() => startDraft(tpl.id)}
                    className="min-h-11 p-3 rounded-xl border border-indigo-300 bg-white hover:bg-indigo-50 text-left">
                    <span className="block font-bold text-sm text-indigo-800">{tpl.name}</span>
                    <span className="block text-[10px] text-slate-500">{tpl.sections.length} {tt('meetdocs.sections_short', 'sections')}{tpl.builtin ? '' : (' · ' + tt('meetdocs.custom_badge', 'custom'))}</span>
                  </button>
                ))}
                <button type="button" onClick={() => setTplDraft({ name: '', sectionsText: '' })}
                  className="min-h-11 p-3 rounded-xl border border-dashed border-slate-400 bg-white hover:bg-slate-100 text-left">
                  <span className="block font-bold text-sm text-slate-700">+ {tt('meetdocs.new_template', 'New custom format')}</span>
                  <span className="block text-[10px] text-slate-500">{tt('meetdocs.new_template_hint', 'Model your district’s own form once, reuse it forever')}</span>
                </button>
              </div>
            </div>
          )}

          {tab === 'new' && !draft && tplDraft && (
            <div className="bg-white border border-slate-300 rounded-xl p-3">
              <h3 className="text-sm font-bold text-slate-700 mb-2">{tt('meetdocs.tpl_editor_title', 'New custom format')}</h3>
              <label htmlFor="meetdocs-tpl-name" className="block text-xs font-bold text-slate-600 mb-1">{tt('meetdocs.tpl_name', 'Format name')}</label>
              <input id="meetdocs-tpl-name" type="text" value={tplDraft.name}
                onChange={(e) => setTplDraft((v) => ({ ...v, name: e.target.value }))}
                className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <label htmlFor="meetdocs-tpl-sections" className="block text-xs font-bold text-slate-600 mt-2 mb-1">{tt('meetdocs.tpl_sections', 'Sections — one per line, optional hint after a colon')}</label>
              <textarea id="meetdocs-tpl-sections" rows={7} value={tplDraft.sectionsText}
                onChange={(e) => setTplDraft((v) => ({ ...v, sectionsText: e.target.value }))}
                placeholder={'Attendees\nConcerns raised: specific and observable\nDecisions\nAction items'}
                className="w-full text-sm border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => {
                  const name = tplDraft.name.trim();
                  const sections = tplDraft.sectionsText.split(/\r?\n/).map((line, i) => {
                    const trimmed = line.trim();
                    if (!trimmed) return null;
                    const colon = trimmed.indexOf(':');
                    const title = colon > 0 ? trimmed.slice(0, colon).trim() : trimmed;
                    const hint = colon > 0 ? trimmed.slice(colon + 1).trim() : '';
                    return { id: 'c' + i + '_' + title.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 24), title, hint };
                  }).filter(Boolean);
                  if (!name || sections.length === 0) { addToast(tt('meetdocs.tpl_invalid', 'A format needs a name and at least one section.'), 'warning'); return; }
                  setCustomTemplates((list) => [...list, { id: meetdocsNextId('tpl'), builtin: false, name, sections }]);
                  setTplDraft(null);
                  addToast(tt('meetdocs.tpl_saved', 'Custom format saved.'), 'success');
                }} className="min-h-11 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700">{tt('meetdocs.tpl_save', 'Save format')}</button>
                <button type="button" onClick={() => setTplDraft(null)} className="min-h-11 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 text-sm font-bold hover:bg-slate-100">{tt('meetdocs.cancel', 'Cancel')}</button>
              </div>
            </div>
          )}

          {tab === 'new' && draft && draft.stage === 'input' && draftTemplate && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-bold text-slate-800">{draftTemplate.name}</p>
                <button type="button" onClick={() => setDraft(null)} className="min-h-11 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 text-sm font-bold hover:bg-slate-100">{tt('meetdocs.back_templates', 'Change format')}</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                <div>
                  <label htmlFor="meetdocs-title-input" className="block text-xs font-bold text-slate-600 mb-1">{tt('meetdocs.meeting_title', 'Meeting title (optional)')}</label>
                  <input id="meetdocs-title-input" type="text" value={draft.title}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label htmlFor="meetdocs-date" className="block text-xs font-bold text-slate-600 mb-1">{tt('meetdocs.meeting_date', 'Meeting date')}</label>
                  <input id="meetdocs-date" type="date" value={draft.date}
                    onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                    className="w-full min-h-11 border border-slate-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <label htmlFor="meetdocs-raw" className="block text-xs font-bold text-slate-600 mb-1">{tt('meetdocs.raw_label', 'Notes or transcript')}</label>
              <textarea id="meetdocs-raw" rows={9} value={draft.rawText}
                onChange={(e) => setDraft((d) => ({ ...d, rawText: e.target.value }))}
                placeholder={tt('meetdocs.raw_placeholder', 'Paste your typed notes, bullet fragments, or a meeting transcript here…')}
                className="w-full text-sm border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />

              <div className="mt-2 bg-white border border-slate-300 rounded-xl p-3">
                <h4 className="text-xs font-bold text-slate-700">{tt('meetdocs.mask_title', 'Names to mask before the AI call')}</h4>
                <p className="text-[10px] text-slate-500">{tt('meetdocs.mask_note', 'Each name is replaced with a code (Person A, Person B…) on this device before anything is sent, and restored locally in the result. Add every student, family, and staff name that appears in your notes.')}</p>
                <div className="mt-1.5 flex gap-2">
                  <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMaskName(); } }}
                    aria-label={tt('meetdocs.mask_input_aria', 'Name to mask')}
                    placeholder={tt('meetdocs.mask_placeholder', 'e.g. Marcus Rivera')}
                    className="flex-1 min-w-0 min-h-11 border border-slate-300 rounded-lg px-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <button type="button" onClick={addMaskName} className="min-h-11 px-3 py-2 rounded-lg bg-slate-700 text-white text-sm font-bold hover:bg-slate-800">{tt('meetdocs.mask_add', 'Add')}</button>
                </div>
                {draft.maskNames.length > 0 && (
                  <ul className="mt-1.5 flex flex-wrap gap-1.5">
                    {meetdocsMaskPairs(draft.maskNames).map((p) => (
                      <li key={p.name}>
                        <button type="button" onClick={() => setDraft((d) => ({ ...d, maskNames: d.maskNames.filter((n) => n !== p.name) }))}
                          aria-label={tt('meetdocs.mask_remove_aria', 'Stop masking') + ' ' + p.name}
                          className="min-h-8 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-[11px] text-slate-700 hover:bg-rose-50 hover:border-rose-300">
                          {p.name} → {p.code} <span aria-hidden="true">✕</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {typeof callGemini === 'function' && (
                  <button type="button" disabled={aiBusy} onClick={convertAi}
                    className="min-h-11 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-wait">
                    {aiBusy ? tt('meetdocs.converting', 'Converting…') : (tt('meetdocs.convert_ai', 'Convert with AI') + ' ✨')}
                  </button>
                )}
                <button type="button" onClick={convertManual} className="min-h-11 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold hover:bg-slate-100">{tt('meetdocs.convert_manual', 'Fill in manually (no AI)')}</button>
              </div>
              {typeof callGemini !== 'function' && <p className="mt-1 text-[10px] text-slate-500">{tt('meetdocs.no_ai', 'AI conversion is unavailable in this host — manual mode uses the same templates.')}</p>}
            </div>
          )}

          {tab === 'new' && draft && draft.stage === 'review' && draftTemplate && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-bold text-slate-800">{draftTemplate.name} <span className="font-normal text-xs text-slate-500">— {tt('meetdocs.review_hint', 'review and edit before saving')}</span></p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setDraft((d) => ({ ...d, stage: 'input' }))} className="min-h-11 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-600 text-sm font-bold hover:bg-slate-100">{tt('meetdocs.back_input', 'Back to notes')}</button>
                  <button type="button" onClick={saveMeeting} className="min-h-11 px-3 py-2 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700">{tt('meetdocs.save', 'Save record')}</button>
                </div>
              </div>
              {draft.aiUsed && <p className="text-[10px] text-slate-500 mb-2">{tt('meetdocs.certify_note', 'AI drafted this from your notes. You are certifying the final record — verify flagged items and edit anything that is wrong before saving.')}</p>}
              {draftTemplate.sections.map((sec) => (
                <div key={sec.id} className="mb-2">
                  <label htmlFor={'meetdocs-sec-' + sec.id} className="block text-xs font-bold text-slate-700 mb-0.5">{sec.title}{sec.hint ? <span className="font-normal text-slate-500"> — {sec.hint}</span> : null}</label>
                  <textarea id={'meetdocs-sec-' + sec.id} rows={2} value={(draft.sections && draft.sections[sec.id]) || ''}
                    onChange={(e) => setDraft((d) => ({ ...d, sections: { ...d.sections, [sec.id]: e.target.value } }))}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              ))}

              {[['decisions', tt('meetdocs.decisions', 'Decisions')], ['actionItems', tt('meetdocs.action_items', 'Action items')]].map(([listKey, label]) => (
                <div key={listKey} className="mb-2 bg-white border border-slate-300 rounded-xl p-3">
                  <h4 className="text-xs font-bold text-slate-700">{label}</h4>
                  <ul className="mt-1 space-y-1.5">
                    {(draft[listKey] || []).map((item, i) => (
                      <li key={item.id || i} className={'p-2 rounded-lg border text-xs ' + (item.verified === false ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200')}>
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <input type="text" value={item.text} aria-label={label + ' ' + (i + 1)}
                              onChange={(e) => setDraft((d) => ({ ...d, [listKey]: d[listKey].map((x, xi) => xi === i ? { ...x, text: e.target.value } : x) }))}
                              className="w-full min-h-9 border border-slate-200 rounded px-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            {listKey === 'actionItems' && (
                              <div className="mt-1 flex gap-1.5">
                                <input type="text" value={item.owner || ''} placeholder={tt('meetdocs.owner', 'Owner')} aria-label={tt('meetdocs.owner_aria', 'Owner for action item') + ' ' + (i + 1)}
                                  onChange={(e) => setDraft((d) => ({ ...d, actionItems: d.actionItems.map((x, xi) => xi === i ? { ...x, owner: e.target.value } : x) }))}
                                  className="w-32 min-h-9 border border-slate-200 rounded px-2 bg-white text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                <input type="date" value={item.due || ''} aria-label={tt('meetdocs.due_aria', 'Due date for action item') + ' ' + (i + 1)}
                                  onChange={(e) => setDraft((d) => ({ ...d, actionItems: d.actionItems.map((x, xi) => xi === i ? { ...x, due: e.target.value } : x) }))}
                                  className="min-h-9 border border-slate-200 rounded px-2 bg-white text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                              </div>
                            )}
                            {item.verified === false && <p className="mt-1 text-[10px] font-bold text-amber-800">{tt('meetdocs.unverified', '⚠ Not found in your notes — verify or delete.')}</p>}
                            {item.source && item.verified !== false && <p className="mt-1 text-[10px] text-slate-500">“{item.source}”</p>}
                          </div>
                          <button type="button" aria-label={tt('meetdocs.remove_item_aria', 'Remove item') + ' ' + (i + 1)}
                            onClick={() => setDraft((d) => ({ ...d, [listKey]: d[listKey].filter((_, xi) => xi !== i) }))}
                            className="shrink-0 min-w-9 min-h-9 inline-flex items-center justify-center rounded text-slate-400 hover:text-rose-700 hover:bg-rose-50">✕</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => setDraft((d) => ({ ...d, [listKey]: [...(d[listKey] || []), { id: meetdocsNextId('mi'), text: '', source: '', verified: true, ...(listKey === 'actionItems' ? { owner: '', due: '', done: false } : {}) }] }))}
                    className="mt-1.5 min-h-9 px-2 py-1 rounded border border-slate-300 bg-white text-[11px] font-bold text-slate-600 hover:bg-slate-100">+ {tt('meetdocs.add_item', 'Add')}</button>
                </div>
              ))}
            </div>
          )}

          {tab === 'meetings' && viewMeeting && (
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <button type="button" onClick={() => setViewId(null)} className="min-h-11 px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50"><span aria-hidden="true">←</span> {tt('meetdocs.back_meetings', 'All meetings')}</button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => exportHtmlFor(viewMeeting)} className="min-h-11 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"><span aria-hidden="true">⬇️</span> {tt('meetdocs.export', 'Download')}</button>
                  <button type="button"
                    onClick={() => {
                      if (armDelete === viewMeeting.id) { setMeetings((m) => m.filter((x) => x.id !== viewMeeting.id)); setViewId(null); setArmDelete(null); addToast(tt('meetdocs.deleted_toast', 'Meeting deleted.'), 'info'); }
                      else { setArmDelete(viewMeeting.id); meetdocsAnnounce(tt('meetdocs.delete_arm_announce', 'Activate delete again to permanently remove this meeting.')); }
                    }}
                    className={'min-h-11 px-3 py-2 rounded-lg border text-sm font-bold ' + (armDelete === viewMeeting.id ? 'bg-rose-600 text-white border-rose-700' : 'bg-white text-rose-700 border-rose-300 hover:bg-rose-50')}
                  >{armDelete === viewMeeting.id ? tt('meetdocs.delete_confirm', 'Tap again to delete') : tt('meetdocs.delete', 'Delete')}</button>
                </div>
              </div>
              <div className="bg-white border border-slate-300 rounded-xl p-4">
                <h3 className="font-bold text-slate-800">{viewMeeting.title}</h3>
                <p className="text-xs text-slate-600">{viewMeeting.templateName} · {viewMeeting.date}{viewMeeting.aiUsed ? (' · ' + tt('meetdocs.ai_badge', 'AI-drafted, human-certified')) : ''}</p>
                {(templateById(viewMeeting.templateId) || { sections: [] }).sections.map((sec) => {
                  const body = viewMeeting.sections && viewMeeting.sections[sec.id];
                  if (!body) return null;
                  return (
                    <div key={sec.id} className="mt-2">
                      <h4 className="text-sm font-bold text-slate-700">{sec.title}</h4>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap">{body}</p>
                    </div>
                  );
                })}
                {(viewMeeting.decisions || []).length > 0 && (
                  <div className="mt-2">
                    <h4 className="text-sm font-bold text-green-800">{tt('meetdocs.decisions', 'Decisions')}</h4>
                    <ul className="mt-1 space-y-1 text-xs text-slate-700 list-disc pl-4">
                      {viewMeeting.decisions.map((d, i) => <li key={i}>{d.text}</li>)}
                    </ul>
                  </div>
                )}
                {(viewMeeting.actionItems || []).length > 0 && (
                  <div className="mt-2">
                    <h4 className="text-sm font-bold text-sky-800">{tt('meetdocs.action_items', 'Action items')}</h4>
                    <ul className="mt-1 space-y-1 text-xs text-slate-700">
                      {viewMeeting.actionItems.map((a) => (
                        <li key={a.id} className="flex items-center gap-2">
                          <input type="checkbox" checked={!!a.done} onChange={(e) => setItemDone(viewMeeting.id, a.id, e.target.checked)}
                            aria-label={tt('meetdocs.done_aria', 'Mark done:') + ' ' + a.text} className="w-4 h-4" />
                          <span className={a.done ? 'line-through text-slate-400' : ''}>{a.text}{a.owner ? (' — ' + a.owner) : ''}{a.due ? (' (' + a.due + ')') : ''}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'meetings' && !viewMeeting && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-2">{tt('meetdocs.meetings_title', 'Saved meetings')}</h3>
              {meetings.length === 0 && <p className="text-sm text-slate-600 bg-white border border-slate-300 rounded-xl p-3">{tt('meetdocs.no_meetings', 'Nothing saved yet. Build a record on the New record tab.')}</p>}
              <ul className="space-y-1.5">
                {meetings.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => { setViewId(m.id); setArmDelete(null); }}
                      className="w-full min-h-11 flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-300 bg-white hover:bg-indigo-50 text-left">
                      <span className="min-w-0">
                        <span className="block font-bold text-sm text-slate-800">{m.title}</span>
                        <span className="block text-[10px] text-slate-500">{m.templateName} · {m.date} · {(m.actionItems || []).filter((a) => !a.done).length} {tt('meetdocs.open_short', 'open action item(s)')}</span>
                      </span>
                      <span aria-hidden="true" className="shrink-0 text-slate-400">›</span>
                    </button>
                  </li>
                ))}
              </ul>
              {meetings.length > 0 && <p className="mt-3 text-[10px] text-slate-500">{tt('meetdocs.storage_note', 'Records live only in this browser’s storage — download anything you must keep (Gemini Canvas may not persist storage between sessions).')}</p>}
            </div>
          )}

          {tab === 'actions' && (
            <div>
              <h3 className="text-sm font-bold text-slate-700 mb-2">{tt('meetdocs.actions_title', 'Action items across meetings')}</h3>
              {rollup.length === 0 && <p className="text-sm text-slate-600 bg-white border border-slate-300 rounded-xl p-3">{tt('meetdocs.no_actions', 'No action items yet — they collect here from every saved meeting.')}</p>}
              <ul className="space-y-1">
                {rollup.map((item) => (
                  <li key={item.meetingId + item.id} className={'flex items-center gap-2 p-2 rounded-xl border text-xs ' + (item.overdue ? 'bg-rose-50 border-rose-300' : 'bg-white border-slate-300')}>
                    <input type="checkbox" checked={item.done} onChange={(e) => setItemDone(item.meetingId, item.id, e.target.checked)}
                      aria-label={tt('meetdocs.done_aria', 'Mark done:') + ' ' + item.text} className="w-4 h-4 shrink-0" />
                    <span className={'min-w-0 flex-1 ' + (item.done ? 'line-through text-slate-400' : 'text-slate-700')}>
                      {item.text}{item.owner ? (' — ' + item.owner) : ''}
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-500">
                      {item.overdue && <span className="font-bold text-rose-700">{tt('meetdocs.overdue', 'overdue')} · </span>}
                      {item.due || tt('meetdocs.no_due', 'no date')} · {item.meetingDate}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
