// view_pdf_audit_source.jsx — PDF Accessibility Audit modal CDN module
// Extracted from AlloFlowANTI.txt L30982-L38171 (May 2026, Round 4 Tier A).
//
// This is the single largest extraction in the project — 148 props
// flow in from AlloFlowContent. The auto-generated destructure list and the
// host's shorthand-prop call site must stay in sync; they were both produced
// by c:/tmp/generate_pdf_audit_extraction.js.
//
// Risk surface: any rename or addition of a referenced identifier inside the
// modal subtree requires regenerating both this file and the host call site.
// Run `node _verify_view_props.cjs AlloFlowANTI.txt PdfAuditView` after any
// edit to confirm the host still supplies every prop.

// Host-provided focus-trap hook (window.__alloHooks, AlloFlowANTI.txt ~L1920).
// Resolved once at module load so the per-render hook order stays stable;
// no-op fallback keeps the modal working on hosts that predate the hook.
const _alloUseFocusTrap = (typeof window !== 'undefined' && window.__alloHooks && window.__alloHooks.useFocusTrap) || function(){};

// "Where to get expert help" (2026-10-16): a neutral directory in place of the single-vendor
// Knowbility panels (there is no partnership; the old panels also claimed a document-remediation
// service Knowbility does not list, and carried referral tracking tags). The entries, links and
// English text come from the pipeline (createDocPipeline.helpDirectory) so the app and the exported
// reports list the same organizations. Literal t() keys so the i18n gates see every one.
function _helpDirectoryDescs(t) {
  return {
    ada_gov: t('pdf_audit.help_directory.ada_gov_desc'), ada_network: t('pdf_audit.help_directory.ada_network_desc'),
    cast: t('pdf_audit.help_directory.cast_desc'), maine_cite: t('pdf_audit.help_directory.maine_cite_desc'),
    ncademi: t('pdf_audit.help_directory.ncademi_desc'), section508: t('pdf_audit.help_directory.section508_desc'),
    at_programs: t('pdf_audit.help_directory.at_programs_desc'), webaim: t('pdf_audit.help_directory.webaim_desc'),
    aph: t('pdf_audit.help_directory.aph_desc'), bookshare: t('pdf_audit.help_directory.bookshare_desc'),
    dcmp: t('pdf_audit.help_directory.dcmp_desc'), nimac: t('pdf_audit.help_directory.nimac_desc'),
    deque: t('pdf_audit.help_directory.deque_desc'), fable: t('pdf_audit.help_directory.fable_desc'),
    knowbility: t('pdf_audit.help_directory.knowbility_desc'), allyant: t('pdf_audit.help_directory.allyant_desc'),
    continual_engine: t('pdf_audit.help_directory.continual_engine_desc'), equidox: t('pdf_audit.help_directory.equidox_desc'),
    gt_cidi: t('pdf_audit.help_directory.gt_cidi_desc'), level_access: t('pdf_audit.help_directory.level_access_desc'),
  };
}
function _helpDirectoryGroupTitles(t) {
  return {
    free: t('pdf_audit.help_directory.group_free'), formats: t('pdf_audit.help_directory.group_formats'),
    testing: t('pdf_audit.help_directory.group_testing'), paid: t('pdf_audit.help_directory.group_paid'),
  };
}
function AlloHelpDirectory({ t, idBase, intro }) {
  const P = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.createDocPipeline;
  const dir = P && P.helpDirectory;
  if (!dir || !Array.isArray(dir.groups)) return null;
  const tt = typeof t === 'function' ? t : () => '';
  const sortByName = typeof P.helpDirectorySorted === 'function' ? P.helpDirectorySorted : (entries) => entries || [];
  const descs = _helpDirectoryDescs(tt);
  const titles = _helpDirectoryGroupTitles(tt);
  const headingId = (idBase || 'allo-help-directory') + '-h';
  return (
    <section aria-labelledby={headingId} className="space-y-2 text-left">
      <h4 id={headingId} className="text-sm font-bold text-slate-800">{tt('pdf_audit.help_directory.heading') || 'Where to get expert help'}</h4>
      {intro !== false && <p className="text-[11px] text-slate-700 leading-relaxed">{tt('pdf_audit.help_directory.intro') || 'Automated remediation cannot finish every document. These organizations offer free guidance, accessible formats, testing with disabled users, or paid remediation.'}</p>}
      <div className="grid grid-cols-1 gap-2">
        {dir.groups.map((g) => (
          <div key={g.id} className="bg-white rounded-lg border border-slate-200 p-2.5">
            <h5 className="text-[11px] font-black text-slate-800 mb-1">{titles[g.id] || g.title}</h5>
            <ul className="space-y-1 list-none">
              {sortByName(g.entries).map((e) => {
                const _safeHref = _viewSafeHttpUrl(e.url);
                const _linkLabel = e.id === 'at_programs' ? (tt('pdf_audit.help_directory.at_programs_name') || e.name) : e.name;
                return (
                <li key={e.id} className="text-[11px] text-slate-700 leading-snug">
                  {_safeHref ? (
                  <a href={_safeHref} target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-800 hover:text-indigo-950 underline">
                    {_linkLabel}
                    <span className="sr-only"> {tt('pdf_audit.help_directory.new_tab') || '(opens in a new tab)'}</span>
                  </a>
                  ) : (
                  <span className="font-bold text-slate-800">{_linkLabel}</span>
                  )}
                  {': '}{descs[e.id] || e.desc}
                </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-700 italic leading-relaxed">
        {tt('pdf_audit.help_directory.disclaimer') || dir.disclaimer}{' '}
        {(tt('pdf_audit.help_directory.checked') || 'Checked {date}.').replace('{date}', dir.checked)}
      </p>
    </section>
  );
}

// Static PDF-tour copy lives with the lazy PDF surface that owns its anchors.
// The root keeps only the three-setter bridge that starts the shared tour UI.
function buildPdfPipelineTourSteps(kind, translate) {
  const t = typeof translate === 'function' ? translate : () => '';
  return kind === 'results' ? [
      { helpKey: 'pdf_audit_results_whatnow', title: t('ptour.whatnow_title') || 'Start here', text: t('ptour.whatnow_text') || 'This strip is your map: grab the recommended download, optionally compare before/after, and treat everything else on this screen as optional polish.\n**Why it matters:** this screen has over 300 elements — most are for digging deeper, not required. The strip names the one action that gets a usable document into students\' hands.' },
      { helpKey: 'pdf_audit_dashboard_bar', title: t('ptour.dashboard_title') || 'Your navigation bar', text: t('ptour.dashboard_text') || 'This bar sticks to the top while you scroll. The score shows before → after; the chips jump straight to any section — Downloads is the one you\'ll use most.\n**Why it matters:** everything below is organized into sections (verification, recovered content, remaining issues, downloads, the tag inspector) — the chips mean you never scroll hunting for one.' },
      { helpKey: 'pdf_audit_results_score_badge', title: t('ptour.score_title') || 'The score, honestly', text: t('ptour.score_text') || 'AlloFlow\'s own estimate: several independent AI reviews averaged, blended 50/50 with TWO deterministic rule engines (axe-core + IBM Equal Access — when they disagree, the lower score wins).\n**Why it matters:** it\'s honest but it\'s not a certification. For independent checks, use PAC or veraPDF, then review reading order and meaning with a screen reader and an accessibility specialist.' },
      { helpKey: 'pdf_audit_results_tab_original_btn', title: t('ptour.tabs_title') || 'Before and after', text: t('ptour.tabs_text') || 'Flip to the Original tab anytime to see what the document looked like before the fixes.\n**Why it matters:** when a parent, administrator, or IEP team asks "what actually changed?", the answer is one click — and the Compare view shows both versions side by side.' },
      { helpKey: 'pdf_audit_view_report_menu_btn', title: t('ptour.report_title') || 'Reports & records', text: t('ptour.report_text') || 'Printable accessibility reports — for your records, an IEP file, or your district accessibility coordinator. There\'s also a tamper-evident signed version.\n**Why it matters:** public schools have legal accessibility obligations (ADA Title II). A dated report showing what was checked and fixed is the paper trail your district wants to have.' },
      { helpKey: 'pdf_audit_translate_doc_btn', title: t('ptour.translate_title') || 'Any language, verified', text: t('ptour.translate_text') || 'Translate the whole document for families — type ANY language. The structure is checked section by section, the copy gets compare/audio/tagged-PDF downloads of its own, and a review banner keeps it honest.\n**Why it matters:** IDEA requires parent-language access to key documents — districts pay per page for this.' },
      { helpKey: 'pdf_audit_plain_language_btn', title: t('ptour.plain_title') || 'Easy-read version', text: t('ptour.plain_text') || 'Rewrites the full document in plain language (pick the grade band). Facts kept, structure verified, original stays authoritative — and it gets its own compare, audio, and tagged PDF.' },
      { helpKey: 'pdf_audit_make_fillable_btn', title: t('ptour.fillable_title') || 'Make it fillable', text: t('ptour.fillable_text') || 'Turns blanks and checkboxes into REAL typed-into form fields — review the detected list first, then download fillable HTML or a tagged fillable PDF. Students with dysgraphia type instead of handwriting.' },
      { helpKey: 'pdf_audit_alt_formats_summary', title: t('ptour.altformats_title') || 'More ways to share', text: t('ptour.altformats_text') || 'The same accessible content as braille-ready text, ePub for e-readers, plain text, and Markdown.\n**Why it matters:** accessibility isn\'t one format — a student with low vision may want ePub\'s reflowing text, while your district\'s braille transcriber wants the braille-ready file as a starting point. That\'s the tour — the ? button gives per-button help anywhere.' },
    ] : [
      { helpKey: 'pdf_audit_view_make_accessible_btn', title: t('ptour.hero_title') || 'The one-click path', text: t('ptour.hero_text') || 'Make Accessible runs everything automatically: audit → fix → re-check until it hits the target → downloads ready. For most documents, this is all you need.\n**Why it matters:** the pipeline is built to be safe unattended — content is never silently dropped (anything unplaceable lands in a visible Recovery section), and the AI\'s work is re-checked by rule engines every pass.' },
      { helpKey: 'pdf_audit_view_start_btn', title: t('ptour.audit_title') || 'The careful path', text: t('ptour.audit_text') || 'Prefer to look before fixing? Run Audit scores the document and shows every issue first — you choose Fix & Verify when you\'re ready.\n**Why it matters:** for sensitive documents (IEP-adjacent, anything going in a student file), seeing the issues before any rewriting happens keeps you in control of every change.' },
      { helpKey: 'pdf_audit_view_settings_panel', title: t('ptour.settings_title') || 'Settings (optional)', text: t('ptour.settings_text') || 'The defaults are sensible. If you ever need to: more audit passes = steadier score, the target score decides when the automatic loop stops.\n**Why it matters:** more passes cost more of your daily AI quota and more time — the defaults balance reliability against both. The usage meter in AI settings shows what a run actually costs.' },
      { helpKey: 'pdf_audit_view_branding_panel', title: t('ptour.branding_title') || 'Make it look right', text: t('ptour.branding_text') || 'The accessible copy can match your original\'s colors, use a clean preset, or pick up your school\'s branding from a letterhead.\n**Why it matters:** every option is contrast-checked before it ships — a document students can\'t read isn\'t accessible no matter how good its tags are. Accessibility and looking professional aren\'t in tension here.' },
      { helpKey: 'pdf_audit_view_save_project_btn', title: t('ptour.save_title') || 'You can always come back', text: t('ptour.save_text') || 'Save Project keeps the whole session as one file — reload it later and everything returns. A backup also saves automatically after each remediation.\n**Why it matters:** in Gemini Canvas, nothing survives closing the tab EXCEPT downloaded files — the project file IS your save, and it carries your remediation history and settings too. That\'s the tour — hit Make Accessible when ready!' },
    ];
}

// OCR language picker options (2026-06-20). Every code here is supported by the pipeline's
// _toTesseractLang map, so picking one makes the scanned-PDF OCR use the right Tesseract model
// (its word boxes drive the searchable text layer; 'eng' mis-segments non-Latin scripts). '' = the
// auto-detect default. ELL-relevant languages (Somali, Arabic, Pashto, Amharic…) lead the list.
const OCR_LANG_OPTIONS = [
  { code: 'es', label: '🇪🇸 Spanish — Español' }, { code: 'so', label: '🇸🇴 Somali — Soomaali' },
  { code: 'ar', label: '🇸🇦 Arabic — العربية' }, { code: 'vi', label: '🇻🇳 Vietnamese — Tiếng Việt' },
  { code: 'ps', label: '🇦🇫 Pashto — پښتو' }, { code: 'fa', label: '🇮🇷 Dari / Farsi — فارسی' },
  { code: 'am', label: '🇪🇹 Amharic — አማርኛ' }, { code: 'ti', label: '🇪🇷 Tigrinya — ትግርኛ' },
  { code: 'sw', label: '🇰🇪 Swahili — Kiswahili' }, { code: 'ht', label: '🇭🇹 Haitian Creole — Kreyòl' },
  { code: 'fr', label: '🇫🇷 French — Français' }, { code: 'pt', label: '🇧🇷 Portuguese — Português' },
  { code: 'zh', label: '🇨🇳 Chinese — 中文' }, { code: 'ru', label: '🇷🇺 Russian — Русский' },
  { code: 'uk', label: '🇺🇦 Ukrainian — Українська' }, { code: 'ur', label: '🇵🇰 Urdu — اردو' },
  { code: 'hi', label: '🇮🇳 Hindi — हिन्दी' }, { code: 'bn', label: '🇧🇩 Bengali — বাংলা' },
  { code: 'pa', label: '🇮🇳 Punjabi — ਪੰਜਾਬੀ' }, { code: 'gu', label: '🇮🇳 Gujarati — ગુજરાતી' },
  { code: 'ta', label: '🇮🇳 Tamil — தமிழ்' }, { code: 'th', label: '🇹🇭 Thai — ไทย' },
  { code: 'km', label: '🇰🇭 Khmer — ខ្មែរ' }, { code: 'my', label: '🇲🇲 Burmese — မြန်မာ' },
  { code: 'ja', label: '🇯🇵 Japanese — 日本語' }, { code: 'ko', label: '🇰🇷 Korean — 한국어' },
  { code: 'tl', label: '🇵🇭 Tagalog' }, { code: 'tr', label: '🇹🇷 Turkish — Türkçe' },
  { code: 'de', label: '🇩🇪 German — Deutsch' }, { code: 'it', label: '🇮🇹 Italian — Italiano' },
  { code: 'pl', label: '🇵🇱 Polish — Polski' }, { code: 'el', label: '🇬🇷 Greek — Ελληνικά' },
  { code: 'he', label: '🇮🇱 Hebrew — עברית' },
];

// ── Accessible Word (.docx) export ──────────────────────────────────────────
// Keep the UI's delivery decision aligned with the document pipeline. A
// generated file is "verified" only when both saved-byte checks affirmatively
// pass; null/missing/error routes to an explicitly marked unverified choice.
function _alloTaggedPdfDeliveryVerdict(result) {
  try {
    const shared = typeof window !== 'undefined'
      && window.AlloModules
      && window.AlloModules.createDocPipeline
      && window.AlloModules.createDocPipeline.taggedPdfDeliveryVerdict;
    if (typeof shared === 'function' && shared !== _alloTaggedPdfDeliveryVerdict) return shared(result);
  } catch (_) {}
  const typesetSummary = result && result.summary;
  const unicodeWarning = typesetSummary && typesetSummary.unicodeTypesetWarning;
  const typesetDroppedChars = Number(unicodeWarning && unicodeWarning.droppedChars);
  const typesetDroppedImages = Number(typesetSummary && typesetSummary.imagesDropped);
  if ((Number.isFinite(typesetDroppedChars) && typesetDroppedChars > 0) || (Number.isFinite(typesetDroppedImages) && typesetDroppedImages > 0))
    return { ok: false, code: 'typeset-content-dropped', reason: 'the clean rebuild dropped source text or images' };
  const roundTrip = result && result.roundTrip;
  if (!roundTrip) return { ok: false, code: 'roundtrip-unavailable', reason: 'post-save structure verification was unavailable' };
  if (roundTrip.ok !== true) {
    const rtFails = (roundTrip.checks || []).filter((c) => c && c.status === 'fail').map((c) => c.rule);
    const rtWarnings = (roundTrip.warnings || []).filter(Boolean);
    return { ok: false, code: roundTrip.ok === false ? 'roundtrip-failed' : 'roundtrip-unavailable', reason: rtFails.join('; ') || rtWarnings.join('; ') || 'post-save structure verification did not complete successfully' };
  }
  const validator = result && result.postExportValidator;
  if (!validator) return { ok: false, code: 'validator-unavailable', reason: 'byte-level exported-PDF validation was unavailable' };
  if (validator.error) return { ok: false, code: 'validator-error', reason: 'byte-level exported-PDF validation failed to run: ' + validator.error };
  const summary = validator.summary;
  if (!summary || summary.overall !== 'PASS') {
    const byteFails = (validator.checks || []).filter((c) => c && c.status === 'fail').map((c) => c.rule || c.label).filter(Boolean);
    return { ok: false, code: 'validator-failed', reason: byteFails.join('; ') || 'byte-level exported-PDF validation did not pass' };
  }
  const layer = result && result.ocrTextLayer;
  if (layer) {
    const coverage = Number(layer.coveragePct);
    const droppedChars = Number(layer.droppedChars);
    const pagesWithText = Number(layer.pagesWithText);
    const pagesCovered = Number(layer.pagesCovered);
    const pagesIncomplete = Number(layer.pagesIncomplete);
    const pagesEmpty = Number(layer.pagesEmpty);
    const scanned = layer.scanned === true
      || (Number.isFinite(pagesWithText) && pagesWithText > 0)
      || (Number.isFinite(pagesEmpty) && pagesEmpty > 0)
      || (Number.isFinite(droppedChars) && droppedChars > 0);
    if (scanned) {
      const reasons = [];
      if (layer.nonLatinDropped === true || (Number.isFinite(droppedChars) && droppedChars > 0)) reasons.push((Number.isFinite(droppedChars) ? droppedChars : 'some') + ' OCR character(s) could not be embedded');
      if (Number.isFinite(coverage) && coverage < 100) reasons.push('OCR character coverage was ' + coverage + '%');
      if (!Number.isFinite(pagesWithText) || pagesWithText < 1) reasons.push('no scanned page produced a usable OCR text layer');
      if (Number.isFinite(pagesIncomplete) && pagesIncomplete > 0) reasons.push(pagesIncomplete + ' page(s) had incomplete OCR text');
      if (Number.isFinite(pagesEmpty) && pagesEmpty > 0) reasons.push(pagesEmpty + ' page(s) had no OCR text');
      if (Number.isFinite(pagesWithText) && Number.isFinite(pagesCovered) && pagesCovered !== pagesWithText) reasons.push(pagesCovered + ' of ' + pagesWithText + ' text page(s) received a searchable layer');
      if (reasons.length) return { ok: false, code: 'ocr-text-layer-incomplete', reason: reasons.join('; ') };
    }
  }
  return { ok: true, code: 'verified', reason: '' };
}

function _alloExecutableActiveContentFindings(result) {
  const shared = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.createDocPipeline;
  if (shared && typeof shared.executableActiveContentFindings === 'function') {
    return shared.executableActiveContentFindings(result);
  }
  const findings = result && result.activeContent && Array.isArray(result.activeContent.findings) ? result.activeContent.findings : [];
  const executable = { 'open-action': true, javascript: true, launch: true, 'additional-actions': true, 'other-actions': true, multimedia: true };
  return findings.filter((finding) => finding && executable[finding.type]);
}

// One owner for every view-local remediation operation. A React loading flag is
// not an ownership primitive: a watchdog or document reset can clear it while
// the old promise is still alive, and a second operation can then start. This
// controller makes stale progress, commits, toasts, and finalizers fail closed.
function _alloCreateRemediationOperationOwner(options) {
  const opts = options || {};
  let generation = 0;
  let current = null;
  const makeController = () => {
    if (typeof AbortController === 'function') return new AbortController();
    const signal = { aborted: false };
    return { signal, abort: () => { signal.aborted = true; } };
  };
  const documentIsCurrent = (ticket) => {
    if (!ticket || !Number.isInteger(ticket.documentEpoch) || typeof opts.isDocumentCurrent !== 'function') return false;
    try { return opts.isDocumentCurrent(ticket.documentEpoch) === true; } catch (_) { return false; }
  };
  const isCurrent = (ticket) => !!(ticket
    && current === ticket
    && ticket.generation === generation
    && !(ticket.controller && ticket.controller.signal && ticket.controller.signal.aborted)
    && documentIsCurrent(ticket));
  const cancel = (ticket) => {
    if (ticket && current !== ticket) return false;
    const owned = current;
    current = null;
    generation += 1;
    try { if (owned && owned.controller) owned.controller.abort(); } catch (_) {}
    return !!owned;
  };
  const begin = (metadata) => {
    cancel();
    const controller = makeController();
    const documentEpoch = typeof opts.getDocumentEpoch === 'function' ? opts.getDocumentEpoch() : null;
    const htmlToken = typeof opts.captureHtmlToken === 'function' ? opts.captureHtmlToken() : null;
    const ticket = { generation, documentEpoch, htmlToken, controller, metadata: metadata || {} };
    current = ticket;
    return ticket;
  };
  const complete = (ticket) => {
    if (!isCurrent(ticket)) return false;
    current = null;
    generation += 1;
    return true;
  };
  return { begin, cancel, complete, isCurrent, getCurrent: () => current };
}

// Prompt payloads are untrusted even when they came from the document currently
// open in the editor. Break the two fence forms used by view prompts so document
// text cannot close its data block and inject new instructions. Restore only the
// exact reversible marker in model output before parsing/rendering it.
function _viewNeutralizePromptFence(value) {
  return String(value == null ? '' : value)
    .replace(/```/g, '`\u2063``')
    .replace(/"""/g, '"\u2063""');
}
function _viewRestoreNeutralizedPromptFences(value) {
  return String(value == null ? '' : value)
    .replace(/`\u2063``/g, '```')
    .replace(/"\u2063""/g, '"""');
}
function _viewEscapeGeneratedText(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function _viewSafeGeneratedInline(value) {
  return _viewEscapeGeneratedText(value)
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
}
function _viewSafeSimpleMarkdownHtml(value) {
  const lines = _viewRestoreNeutralizedPromptFences(value).split(/\r?\n/);
  const html = [];
  let listType = '';
  const closeList = () => {
    if (!listType) return;
    html.push(`</${listType}>`);
    listType = '';
  };
  for (const rawLine of lines) {
    const line = String(rawLine || '').trim();
    if (!line) { closeList(); continue; }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = Math.min(5, heading[1].length + 2);
      html.push(`<h${level}>${_viewSafeGeneratedInline(heading[2])}</h${level}>`);
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)$/);
    const numbered = line.match(/^\d+[.)]\s+(.+)$/);
    if (bullet || numbered) {
      const wanted = numbered ? 'ol' : 'ul';
      if (listType !== wanted) { closeList(); listType = wanted; html.push(`<${wanted}>`); }
      html.push(`<li>${_viewSafeGeneratedInline((bullet || numbered)[1])}</li>`);
      continue;
    }
    closeList();
    if (/^(---|\*\*\*)$/.test(line)) html.push('<hr>');
    else html.push(`<p>${_viewSafeGeneratedInline(line)}</p>`);
  }
  closeList();
  return html.join('\n');
}
// _ensureDocxLib: lazy-load the docx UMD build (window.docx). Mirror chain —
// cdnjs does NOT carry the docx UMD build, so two verified mirrors only.
function _ensureDocxLib() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.docx && window.docx.Document && window.docx.Packer) return Promise.resolve(window.docx);
  if (document.getElementById('docxlib-cdn')) {
    return new Promise((resolve) => {
      const t0 = Date.now();
      const t = setInterval(() => {
        if (window.docx && window.docx.Packer) { clearInterval(t); resolve(window.docx); }
        else if (Date.now() - t0 > 15000) { clearInterval(t); resolve(window.docx || null); }
      }, 100);
    });
  }
  if (window._isDesktopBundledApp === true) return Promise.resolve(null);
  const urls = [
    'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js',
    'https://unpkg.com/docx@8.5.0/build/index.umd.js',
  ];
  const docxSri = 'sha384-4xaIisuLEy2lo2HkB2C4rEf7v8jbTb2kuogX6TkuEt9feTWKBSFSOzsqNNbV+sKh';
  return new Promise((resolve) => {
    const tryAt = (i) => {
      if (i >= urls.length) { resolve(null); return; }
      const s = document.createElement('script');
      s.id = 'docxlib-cdn';
      s.src = urls[i];
      s.integrity = docxSri;
      s.crossOrigin = 'anonymous';
      s.referrerPolicy = 'no-referrer';
      s.async = true;
      s.onload = () => resolve((window.docx && window.docx.Packer) ? window.docx : null);
      s.onerror = () => { try { s.remove(); } catch (_) {} tryAt(i + 1); };
      document.head.appendChild(s);
    };
    tryAt(0);
  });
}

// _latexToOmml (2026-06-10, STEM item 7): LaTeX → MathML (temml UMD) →
// OMML (mathml2omml, ESM via dynamic import — esbuild-safe Function wrap,
// same pattern as the Harper loader). Returns the OMML string with the m:
// namespace guaranteed on the root, or null on ANY failure (fail-soft —
// callers keep the equation image + spoken alt).
let _ommlToolsPromise = null;
async function _latexToOmml(latex) {
  try {
    if (!latex || typeof window === 'undefined') return null;
    if (window._isDesktopBundledApp === true) return null;
    const _loc = window.location;
    if (_loc && /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(_loc.hostname || '') && String(_loc.pathname || '').indexOf('/app/') === 0) return null;
    if (!_ommlToolsPromise) {
      _ommlToolsPromise = (async () => {
        if (!window.temml || !window.temml.renderToString) {
          await new Promise((resolve, reject) => {
            const urls = ['https://cdn.jsdelivr.net/npm/temml@0.10.34/dist/temml.min.js', 'https://unpkg.com/temml@0.10.34/dist/temml.min.js'];
            const temmlSri = 'sha384-ISVKFwYYJAOKPcfkYhBVHjUVYLIiuwCEo/+yfuDsetu3KNavSmw5JEelaaIEItLj';
            const tryAt = (i) => {
              if (i >= urls.length) { reject(new Error('temml load failed')); return; }
              const s = document.createElement('script');
              s.integrity = temmlSri;
              s.crossOrigin = 'anonymous';
              s.referrerPolicy = 'no-referrer';
              s.src = urls[i];
              s.onload = () => (window.temml ? resolve(null) : reject(new Error('temml missing after load')));
              s.onerror = () => { try { s.remove(); } catch (_) {} tryAt(i + 1); };
              document.head.appendChild(s);
            };
            tryAt(0);
          });
        }
        const _dynImport = new Function('u', 'return import(u)');
        const mod = await _dynImport('https://cdn.jsdelivr.net/npm/mathml2omml@0.5.0/+esm');
        const mml2omml = mod.mml2omml || (mod.default && mod.default.mml2omml) || mod.default;
        if (typeof mml2omml !== 'function') throw new Error('mathml2omml export shape unexpected');
        return { mml2omml };
      })();
      _ommlToolsPromise.catch(() => { _ommlToolsPromise = null; });
    }
    const tools = await _ommlToolsPromise;
    const mathmlFull = window.temml.renderToString(String(latex), { displayMode: true });
    // temml may wrap the <math> element — extract it.
    const m = mathmlFull.match(/<math[\s\S]*<\/math>/);
    if (!m) return null;
    let omml = tools.mml2omml(m[0]);
    if (!omml || typeof omml !== 'string' || !/<m:o/.test(omml)) return null;
    if (!/xmlns:m=/.test(omml)) omml = omml.replace(/<m:(oMathPara|oMath)/, '<m:$1 xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"');
    return omml;
  } catch (_) { return null; }
}
if (typeof window !== 'undefined') window.__alloLatexToOmml = _latexToOmml; // test seam

// _sha256OfBytes: SHA-256 hex of a byte buffer (Uint8Array / ArrayBuffer). Null on empty input
// or any failure. Used to fingerprint shipped PDF bytes AND to BIND a veraPDF verdict to the exact
// bytes it validated — so the signed audit trail can never pair a fingerprint with a verdict that
// was computed on different bytes (the stale-verdict defect, 2026-06-22).
async function _sha256OfBytes(bytes) {
  try {
    if (!bytes || !bytes.byteLength || typeof crypto === 'undefined' || !crypto.subtle) return null;
    const buf = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (_) { return null; }
}

// Project JSON expands substantially while it is parsed on the UI thread; fail
// before a project large enough to exhaust the renderer is read into memory.
const _VIEW_MAX_PROJECT_FILE_BYTES = 64 * 1024 * 1024;
async function _viewSha256Text(text) {
  try {
    if (typeof TextEncoder === 'undefined') return null;
    return await _sha256OfBytes(new TextEncoder().encode(String(text || '')));
  } catch (_) { return null; }
}
function _viewSanitizeProjectImport(parsed, pipeline) {
  const factory = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.createDocPipeline;
  const helper = (pipeline && pipeline.sanitizeRemediationProject) || (factory && factory.sanitizeRemediationProject);
  if (typeof helper !== 'function') throw new Error('Remediation security module is still loading. Please retry in a moment.');
  const result = helper(parsed);
  if (!result || !result.project) throw new Error('The project could not be sanitized safely.');
  return result;
}
function _viewSanitizeMarkupForExport(html, pipeline) {
  const factory = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.createDocPipeline;
  const helper = (pipeline && pipeline.sanitizeRemediationHtml) || (factory && factory.sanitizeRemediationHtml);
  if (typeof helper !== 'function') throw new Error('Remediation security module is still loading. Please retry in a moment.');
  const clean = helper(String(html == null ? '' : html));
  if (typeof clean !== 'string' || !clean.trim()) throw new Error('The markup could not be sanitized safely.');
  return clean;
}
function _viewSafeCssColor(value, fallback, allowGradient) {
  const raw = String(value == null ? '' : value).trim();
  const blocked = /(?:@import|url\s*\(|image-set\s*\(|src\s*:|expression\s*\(|behavior\s*:|javascript\s*:|vbscript\s*:)/i;
  if (!raw || blocked.test(raw) || /[{};]/.test(raw)) return fallback;
  if (/^#[0-9a-f]{3,8}$/i.test(raw) || /^(?:rgb|hsl)a?\([\d\s.,%+\-/]+\)$/i.test(raw)) return raw;
  if (allowGradient && /^linear-gradient\(\s*(?:to\s+(?:top|bottom|left|right)(?:\s+(?:top|bottom|left|right))?|[-+]?\d+(?:\.\d+)?(?:deg|grad|rad|turn))\s*,\s*(?:#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([\d\s.,%+\-/]+\))(?:\s+\d+(?:\.\d+)?%)?(?:\s*,\s*(?:#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([\d\s.,%+\-/]+\))(?:\s+\d+(?:\.\d+)?%)?)+\s*\)$/i.test(raw)) return raw;
  return fallback;
}
function _viewSafeCssFontFamily(value, fallback) {
  const raw = String(value == null ? '' : value).trim();
  if (!raw || /(?:@import|url\s*\(|image-set\s*\(|src\s*:|expression\s*\(|behavior\s*:|javascript\s*:|vbscript\s*:)/i.test(raw) || /[{};]/.test(raw)) return fallback;
  return /^(?:[A-Za-z][A-Za-z0-9 -]*|"[A-Za-z][A-Za-z0-9 -]*"|'[A-Za-z][A-Za-z0-9 -]*')(?:\s*,\s*(?:[A-Za-z][A-Za-z0-9 -]*|"[A-Za-z][A-Za-z0-9 -]*"|'[A-Za-z][A-Za-z0-9 -]*'))*$/.test(raw) ? raw : fallback;
}
function _viewSafeJsonReviver(key, value) {
  return (key === '__proto__' || key === 'constructor' || key === 'prototype') ? undefined : value;
}
function _viewSafeHttpUrl(url) {
  const raw = String(url == null ? '' : url).trim();
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || parsed.username || parsed.password) return '';
    return parsed.href;
  } catch (_) { return ''; }
}
function _viewIsPublicRemoteUrl(urlOrParsed) {
  try {
    const parsed = urlOrParsed instanceof URL ? urlOrParsed : new URL(String(urlOrParsed || '').trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    const host = String(parsed.hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
    if (!host) return false;
    if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return false;
    if (host === '0.0.0.0' || host === '::' || host === '::1' || host.includes(':')) return false;
    const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
    if (ipv4) {
      const a = Number(ipv4[1]), b = Number(ipv4[2]);
      if (a === 0 || a === 10 || a === 127) return false;
      if (a === 169 && b === 254) return false;
      if (a === 172 && b >= 16 && b <= 31) return false;
      if (a === 192 && b === 168) return false;
      if (a === 100 && b >= 64 && b <= 127) return false;
      if (a >= 224) return false;
    }
    if (/^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) return false;
    return true;
  } catch (_) { return false; }
}
function _viewSanitizeAiRestyleCss(rawCss) {
  let clean = String(rawCss == null ? '' : rawCss).trim();
  const fenced = clean.match(/^```(?:css)?\s*\n?([\s\S]*?)\n?```$/i);
  if (fenced) clean = fenced[1].trim();
  clean = clean.replace(/^```(?:css)?\s*\n?/gim, '').replace(/\n?```\s*$/gim, '');
  clean = clean
    .replace(/<\/?style\b[^>]*>/gi, '')
    .replace(/[<\\]/g, '')
    .replace(/@import\s+[^;\n}]+;?/gi, '')
    .replace(/url\s*\([^)]*\)/gi, 'none')
    .replace(/image-set\s*\([^)]*\)/gi, 'none')
    .replace(/expression\s*\([^)]*\)/gi, 'none')
    .replace(/behavior\s*:\s*[^;}\n]+;?/gi, '')
    .replace(/-moz-binding\s*:\s*[^;}\n]+;?/gi, '')
    .replace(/(?:javascript|vbscript)\s*:/gi, '');
  return clean.trim();
}
function _viewSanitizeReconTableHtml(rawHtml) {
  const raw = String(rawHtml == null ? '' : rawHtml);
  if (!raw.trim()) return '';
  try {
    if (typeof window !== 'undefined' && window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
      return window.DOMPurify.sanitize(raw, {
        ALLOWED_TAGS: ['table', 'caption', 'colgroup', 'col', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'p', 'span', 'strong', 'em', 'b', 'i', 'sub', 'sup', 'br', 'ul', 'ol', 'li', 'a', 'math', 'mi', 'mn', 'mo', 'mrow', 'msup', 'msub', 'msubsup', 'mfrac', 'msqrt', 'mroot', 'mtext', 'mtable', 'mtr', 'mtd'],
        ALLOWED_ATTR: ['colspan', 'rowspan', 'scope', 'headers', 'id', 'dir', 'lang', 'aria-label', 'href', 'rel', 'target', 'data-allo-reconstructed'],
      });
    }
    if (typeof DOMParser !== 'undefined') {
      const parsed = new DOMParser().parseFromString(raw, 'text/html');
      parsed.querySelectorAll('script,style,iframe,object,embed,link,meta,base,form,input,button,textarea,select,svg,annotation-xml,maction,mglyph,malignmark,template,noscript,img,audio,video,source').forEach((n) => n.remove());
      const allowedAttrs = new Set(['colspan', 'rowspan', 'scope', 'headers', 'id', 'dir', 'lang', 'aria-label', 'href', 'rel', 'target', 'data-allo-reconstructed']);
      parsed.body.querySelectorAll('*').forEach((el) => {
        Array.from(el.attributes).forEach((attr) => {
          const name = attr.name.toLowerCase();
          if (!allowedAttrs.has(name) || name.startsWith('on')) { el.removeAttribute(attr.name); return; }
          if (name === 'href') {
            const val = String(attr.value || '').trim();
            if (!/^(?:#|https?:\/\/)/i.test(val)) el.removeAttribute(attr.name);
          }
        });
        if (el.tagName && el.tagName.toLowerCase() === 'a' && el.hasAttribute('href')) el.setAttribute('rel', 'noopener noreferrer');
      });
      return parsed.body.innerHTML;
    }
  } catch (_) {}
  return _viewEscapeGeneratedText(raw);
}
function _viewAuditCanStartRemediation(audit) {
  return !!(audit && audit.score !== -1);
}
function _viewUsableCompleteAiAudit(audit) {
  if (!audit || !Number.isFinite(audit.score) || audit._partialAudit === true
      || audit._scoreDegraded === true || audit.synthesized === true) return false;
  const requested = Number(audit.chunksRequested);
  const audited = Number(audit.chunksAudited);
  return Number.isSafeInteger(requested) && requested > 0
    && Number.isSafeInteger(audited) && audited === requested;
}
function _viewAuditFallbackResult(snapshot, file) {
  return snapshot || { _choosing: true, fileName: file && file.name, fileSize: file && file.size || 0 };
}
function _viewVerificationBindingHelper(pipeline, name) {
  try {
    const factory = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.createDocPipeline;
    const helper = (pipeline && pipeline[name]) || (factory && factory[name]);
    return typeof helper === 'function' ? helper : null;
  } catch (_) { return null; }
}
function _viewValidVerificationHtmlBinding(binding) {
  return !!(binding && binding.version === 1 && binding.algorithm === 'SHA-256' &&
    /^[a-f0-9]{64}$/.test(binding.digest || '') && Number.isInteger(binding.utf8ByteLength) && binding.utf8ByteLength >= 0);
}
function _viewAttachRuntimeBindingProof(target, html, bindingKey, snapshotKey, digestKey) {
  const binding = target && target[bindingKey];
  if (!target || typeof target !== 'object' || typeof html !== 'string' || !_viewValidVerificationHtmlBinding(binding)) return false;
  try {
    Object.defineProperty(target, snapshotKey, { value: html, writable: true, configurable: true, enumerable: false });
    Object.defineProperty(target, digestKey, { value: binding.digest, writable: true, configurable: true, enumerable: false });
    return true;
  } catch (_) {
    try { delete target[snapshotKey]; } catch (_) {}
    try { delete target[digestKey]; } catch (_) {}
    return false;
  }
}
// Review attestations are metadata. Keep live proof only for the exact, already-bound HTML.
// (2026-10-28) reviewDecisions: the answer chosen from each finding's decision guide ({ guide, option, at }); undefined keeps it.
function _viewWithReviewAttestations(result, reviewedFindings, pipeline, reviewDecisions) {
  if (!result || typeof result !== 'object') return result;
  const next = { ...result, reviewedFindings };
  if (reviewDecisions !== undefined) next.reviewDecisions = reviewDecisions;
  if (_viewIsLiveVerificationHtmlBound(result, result.accessibleHtml, pipeline)) {
    _viewAttachRuntimeBindingProof(next, result.accessibleHtml, 'verificationHtmlBinding', '_verificationHtmlSnapshot', '_verificationHtmlBindingDigest');
  }
  return next;
}
async function _viewCreateVerificationHtmlBinding(html, pipeline) {
  const shared = _viewVerificationBindingHelper(pipeline, 'createVerificationHtmlBinding');
  if (shared) { try { return await shared(String(html == null ? '' : html)); } catch (_) { return null; } }
  try {
    if (typeof crypto === 'undefined' || !crypto.subtle || typeof TextEncoder === 'undefined') return null;
    const bytes = new TextEncoder().encode(String(html == null ? '' : html));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return {
      version: 1,
      algorithm: 'SHA-256',
      digest: Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join(''),
      utf8ByteLength: bytes.byteLength,
    };
  } catch (_) { return null; }
}
async function _viewVerifyVerificationHtmlBinding(html, binding, pipeline) {
  const shared = _viewVerificationBindingHelper(pipeline, 'verifyVerificationHtmlBinding');
  if (shared) { try { return !!(await shared(String(html == null ? '' : html), binding)); } catch (_) { return false; } }
  if (!_viewValidVerificationHtmlBinding(binding)) return false;
  const fresh = await _viewCreateVerificationHtmlBinding(html, null);
  return !!(fresh && fresh.digest === binding.digest && fresh.utf8ByteLength === binding.utf8ByteLength);
}
function _viewIsLiveVerificationHtmlBound(result, html, pipeline) {
  const shared = _viewVerificationBindingHelper(pipeline, 'isLiveVerificationHtmlBound');
  if (shared) { try { return !!shared(result, html); } catch (_) { return false; } }
  if (!result || !_viewValidVerificationHtmlBinding(result.verificationHtmlBinding)) return false;
  const exact = String(html == null ? result.accessibleHtml == null ? '' : result.accessibleHtml : html);
  let descriptor = null;
  let digestDescriptor = null;
  try {
    descriptor = Object.getOwnPropertyDescriptor(result, '_verificationHtmlSnapshot');
    digestDescriptor = Object.getOwnPropertyDescriptor(result, '_verificationHtmlBindingDigest');
  } catch (_) {}
  if (!descriptor || descriptor.enumerable !== false || descriptor.value !== exact
      || !digestDescriptor || digestDescriptor.enumerable !== false
      || digestDescriptor.value !== result.verificationHtmlBinding.digest) return false;
  try {
    return typeof TextEncoder !== 'undefined' && new TextEncoder().encode(exact).byteLength === result.verificationHtmlBinding.utf8ByteLength;
  } catch (_) { return false; }
}
function _viewEnforceVerificationHtmlBinding(result, reason, pipeline) {
  if (!result || typeof result !== 'object') return result;
  const shared = _viewVerificationBindingHelper(pipeline, 'enforceVerificationHtmlBinding');
  if (shared) { try { return shared(result, reason); } catch (_) {} }
  const value = result;
  if (_viewIsLiveVerificationHtmlBound(value, value.accessibleHtml, null)) return value;
  const why = String(reason || 'verification-html-binding-missing-or-stale');
  const oldReasons = Array.isArray(value.verificationReasons) ? value.verificationReasons : (Array.isArray(value.reasons) ? value.reasons : []);
  const reasons = Array.from(new Set(oldReasons.concat(why)));
  const oldCoverage = value.verificationCoverage || value.coverage || null;
  const coverage = oldCoverage ? { ...oldCoverage, pdfUaSelfCheck: 'not-run' } : oldCoverage;
  const next = {
    ...value,
    verificationState: /^(?:complete|complete-for-tested-scope)$/.test(value.verificationState || '') ? 'partial' : (value.verificationState || 'unavailable'),
    executionState: value.executionState === 'complete' ? 'partial' : (value.executionState || 'unavailable'),
    outcomeState: 'unknown',
    testedScopeComplete: false,
    engineExecutionComplete: false,
    fullyVerifiedSuccess: false,
    success: false,
    afterScoreVerified: false,
    requiresManualReview: true,
    verificationReasons: reasons,
    reasons,
  };
  if (coverage) { next.verificationCoverage = coverage; next.coverage = coverage; }
  return next;
}
async function _viewRehydrateVerificationHtmlBinding(saved, pipeline) {
  const shared = _viewVerificationBindingHelper(pipeline, 'rehydrateVerificationHtmlBinding');
  if (shared) { try { return await shared(saved); } catch (_) {} }
  if (!saved || typeof saved !== 'object') return saved;
  const next = { ...saved };
  // Never trust serialized runtime proof. Recreate it only after SHA-256 verification.
  try { delete next._verificationHtmlSnapshot; } catch (_) {}
  try { delete next._verificationHtmlBindingDigest; } catch (_) {}
  const html = String(next.accessibleHtml == null ? '' : next.accessibleHtml);
  if (await _viewVerifyVerificationHtmlBinding(html, next.verificationHtmlBinding, null)) {
    _viewAttachRuntimeBindingProof(next, html, 'verificationHtmlBinding', '_verificationHtmlSnapshot', '_verificationHtmlBindingDigest');
  }
  return _viewEnforceVerificationHtmlBinding(next, null, null);
}
async function _viewBindFreshVerificationResult(result, html, pipeline) {
  const exact = String(html == null ? '' : html);
  const binding = await _viewCreateVerificationHtmlBinding(exact, pipeline);
  const next = { ...(result || {}), accessibleHtml: exact, verificationHtmlBinding: binding || null };
  if (binding) {
    _viewAttachRuntimeBindingProof(next, exact, 'verificationHtmlBinding', '_verificationHtmlSnapshot', '_verificationHtmlBindingDigest');
  }
  return _viewEnforceVerificationHtmlBinding(next, null, pipeline);
}
async function _viewBindValidationToHtml(validation, html, pipeline) {
  const exact = String(html == null ? '' : html);
  const binding = await _viewCreateVerificationHtmlBinding(exact, pipeline);
  const next = { ...(validation || {}), sourceHtmlBinding: binding || null };
  if (binding) {
    _viewAttachRuntimeBindingProof(next, exact, 'sourceHtmlBinding', '_sourceHtmlSnapshot', '_sourceHtmlBindingDigest');
  }
  return next;
}
// C2 perf memo (2026-07-13): _currentTaggedValidation runs this on EVERY render
// of the 15k-line component once a tagged validation exists, and the old body
// UTF-8-encoded the full document each time (multi-MB doc = visible Chromebook
// jank for the rest of the session). The byteLength of a given (validation,
// exact-html) pair is immutable — memo on validation identity; a different html
// string misses and re-encodes.
const _viewUtf8LenMemo = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
function _viewValidationMatchesHtml(validation, html) {
  if (!validation || !_viewValidVerificationHtmlBinding(validation.sourceHtmlBinding)) return false;
  const exact = String(html == null ? '' : html);
  let descriptor = null;
  let digestDescriptor = null;
  try {
    descriptor = Object.getOwnPropertyDescriptor(validation, '_sourceHtmlSnapshot');
    digestDescriptor = Object.getOwnPropertyDescriptor(validation, '_sourceHtmlBindingDigest');
  } catch (_) {}
  if (!descriptor || descriptor.enumerable !== false || descriptor.value !== exact
      || !digestDescriptor || digestDescriptor.enumerable !== false
      || digestDescriptor.value !== validation.sourceHtmlBinding.digest) return false;
  const memo = _viewUtf8LenMemo ? _viewUtf8LenMemo.get(validation) : null;
  if (memo && memo.html === exact) return memo.len === validation.sourceHtmlBinding.utf8ByteLength;
  try {
    if (typeof TextEncoder === 'undefined') return false;
    const len = new TextEncoder().encode(exact).byteLength;
    try { if (_viewUtf8LenMemo) _viewUtf8LenMemo.set(validation, { html: exact, len }); } catch (_) {}
    return len === validation.sourceHtmlBinding.utf8ByteLength;
  } catch (_) { return false; }
}
function _viewAttachTaggedArtifactProof(value, ticket) {
  if (!value || typeof value !== 'object' || !ticket || !ticket.bytes || !Number.isSafeInteger(ticket.generation)) return value;
  try {
    Object.defineProperties(value, {
      _taggedArtifactBytes: { value: ticket.bytes, enumerable: false, configurable: true },
      _taggedArtifactGeneration: { value: ticket.generation, enumerable: false, configurable: true },
    });
  } catch (_) {}
  return value;
}
function _viewTaggedArtifactProofMatches(value, ticket) {
  if (!value || !ticket || !ticket.bytes || !Number.isSafeInteger(ticket.generation)) return false;
  let bytesDescriptor = null;
  let generationDescriptor = null;
  try {
    bytesDescriptor = Object.getOwnPropertyDescriptor(value, '_taggedArtifactBytes');
    generationDescriptor = Object.getOwnPropertyDescriptor(value, '_taggedArtifactGeneration');
  } catch (_) {}
  return !!(bytesDescriptor && bytesDescriptor.enumerable === false && bytesDescriptor.value === ticket.bytes
    && generationDescriptor && generationDescriptor.enumerable === false && generationDescriptor.value === ticket.generation);
}
function _viewPatchBoundValidation(validation, patch) {
  if (!validation) return validation;
  const next = { ...validation, ...(patch || {}) };
  let descriptor = null;
  let digestDescriptor = null;
  try {
    descriptor = Object.getOwnPropertyDescriptor(validation, '_sourceHtmlSnapshot');
    digestDescriptor = Object.getOwnPropertyDescriptor(validation, '_sourceHtmlBindingDigest');
  } catch (_) {}
  if (_viewValidVerificationHtmlBinding(next.sourceHtmlBinding)
      && descriptor && descriptor.enumerable === false && typeof descriptor.value === 'string'
      && digestDescriptor && digestDescriptor.enumerable === false
      && digestDescriptor.value === next.sourceHtmlBinding.digest) {
    _viewAttachRuntimeBindingProof(next, descriptor.value, 'sourceHtmlBinding', '_sourceHtmlSnapshot', '_sourceHtmlBindingDigest');
  }
  let artifactBytesDescriptor = null;
  let artifactGenerationDescriptor = null;
  try {
    artifactBytesDescriptor = Object.getOwnPropertyDescriptor(validation, '_taggedArtifactBytes');
    artifactGenerationDescriptor = Object.getOwnPropertyDescriptor(validation, '_taggedArtifactGeneration');
  } catch (_) {}
  if (artifactBytesDescriptor && artifactBytesDescriptor.enumerable === false && artifactBytesDescriptor.value
      && artifactGenerationDescriptor && artifactGenerationDescriptor.enumerable === false
      && Number.isSafeInteger(artifactGenerationDescriptor.value)) {
    _viewAttachTaggedArtifactProof(next, { bytes: artifactBytesDescriptor.value, generation: artifactGenerationDescriptor.value });
  }
  return next;
}
// _withTimeout: bound a promise so a hung network (remote TTS / proxy / image fetch) or a stalled
// pdf.js worker (Compare PDF-preview render) can't freeze the audit UI forever. view_pdf_audit had no
// timeout helper, so those awaits were unbounded — this mirrors doc_pipeline's _withTimeout. Race-based:
// the underlying op may still run after the reject, so callers wrap in try/catch and degrade gracefully.
function _withTimeout(promise, ms, label) {
  // S7 (deep dive 2026-07-02): clear the timer when the op settles first — doc_pipeline's
  // copy does; this one leaked a live timer per call, which adds up across a long batch
  // (thousands of pending timeouts holding their closures).
  let _t = null;
  const timeout = new Promise((_, reject) => { _t = setTimeout(() => reject(new Error('Timed out after ' + ms + 'ms: ' + (label || 'operation'))), ms); });
  return Promise.race([promise, timeout]).finally(() => { if (_t) clearTimeout(_t); });
}

function _websiteFetchError(message, code, allowProxy) {
  const error = new Error(message);
  error.websiteFetchCode = code;
  error.allowProxyFallback = !!allowProxy;
  return error;
}
async function _readWebsiteResponseBounded(response, maxBytes, controller) {
  const limit = Number.isFinite(maxBytes) && maxBytes > 0 ? maxBytes : (5 * 1024 * 1024);
  const advertised = Number(response && response.headers && response.headers.get('content-length')) || 0;
  if (advertised > limit) {
    try { controller.abort(); } catch (_) {}
    throw _websiteFetchError('Website response is larger than the 5 MB audit limit.', 'too-large', false);
  }
  if (!response.body || typeof response.body.getReader !== 'function' || typeof TextDecoder === 'undefined') {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > limit) throw _websiteFetchError('Website response is larger than the 5 MB audit limit.', 'too-large', false);
    return typeof TextDecoder !== 'undefined' ? new TextDecoder().decode(bytes) : String.fromCharCode.apply(null, bytes);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = '';
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > limit) {
        try { await reader.cancel(); } catch (_) {}
        try { controller.abort(); } catch (_) {}
        throw _websiteFetchError('Website response is larger than the 5 MB audit limit.', 'too-large', false);
      }
      text += decoder.decode(part.value, { stream: true });
    }
    return text + decoder.decode();
  } finally { try { reader.releaseLock(); } catch (_) {} }
}
async function _fetchWebsiteSourceOnce(url, options, timeoutMs, label, maxBytes) {
  const controller = new AbortController();
  const externalSignal = options && options.signal;
  const abortFromExternal = () => { try { controller.abort(); } catch (_) {} };
  if (externalSignal && externalSignal.aborted) abortFromExternal();
  else if (externalSignal && typeof externalSignal.addEventListener === 'function') externalSignal.addEventListener('abort', abortFromExternal, { once: true });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; try { controller.abort(); } catch (_) {} }, timeoutMs);
  try {
    let response;
    try { response = await fetch(url, { ...(options || {}), signal: controller.signal }); }
    catch (error) {
      if (error && error.websiteFetchCode) throw error;
      throw _websiteFetchError(timedOut ? (label + ' timed out.') : (label + ' was blocked by browser CORS or a network error.'), timedOut ? 'timeout' : 'cors-or-network', true);
    }
    if (!response.ok) throw _websiteFetchError(label + ' returned HTTP ' + response.status + '.', 'http-' + response.status, false);
    const contentType = String((response.headers && response.headers.get('content-type')) || '').toLowerCase();
    if (contentType && !/(text\/html|application\/xhtml\+xml|text\/plain)/.test(contentType)) throw _websiteFetchError('URL did not return HTML or text content (' + contentType + ').', 'content-type', false);
    const html = await _readWebsiteResponseBounded(response, maxBytes, controller);
    return { response, html };
  } catch (error) {
    if (error && error.websiteFetchCode) throw error;
    throw _websiteFetchError(timedOut ? (label + ' timed out.') : (label + ' failed while reading the response.'), timedOut ? 'timeout' : 'network-read', true);
  } finally { clearTimeout(timer);
    try { if (externalSignal && typeof externalSignal.removeEventListener === 'function') externalSignal.removeEventListener('abort', abortFromExternal); } catch (_) {} }
}
function _htmlHasExplicitLanguage(html) {
  return /<html\b[^>]*\blang\s*=\s*(?:"\s*[^"]+\s*"|'\s*[^']+\s*'|[^\s"'=<>]+)(?=[\s>])/i.test(String(html || ''));
}

// Load-order-safe adapter for the pipeline's canonical verification-state helper.
function _viewDeriveVerificationState(input, pipeline) {
  const data = input || {};
  try {
    const modules = typeof window !== 'undefined' && window.AlloModules;
    const policy = modules && modules.VerificationPolicy;
    const factory = modules && modules.createDocPipeline;
    const canonical = (pipeline && pipeline.deriveVerificationState)
      || (policy && policy.deriveVerificationState)
      || (factory && factory.deriveVerificationState);
    if (typeof canonical === 'function') {
      const result = canonical(data);
      if (result && result.coverage && typeof result.verificationState === 'string') return result;
    }
    if (policy && typeof policy.unavailableVerificationState === 'function') {
      return policy.unavailableVerificationState('verification-policy-module-unavailable');
    }
  } catch (_) {}
  const coverage = { standard: 'WCAG 2.2 AA', ai: 'unavailable', axe: 'unavailable', equalAccess: 'unavailable', pdfUaSelfCheck: 'not-run' };
  return {
    verificationCoverage: coverage,
    coverage,
    verificationState: 'unavailable',
    executionState: 'unavailable',
    outcomeState: 'unknown',
    verificationScope: 'full-output',
    testedScopeComplete: false,
    engineExecutionComplete: false,
    fullyVerifiedSuccess: false,
    success: false,
    afterScoreVerified: false,
    requiresManualReview: true,
    reviewCount: 1,
    knownFindingCount: 0,
    knownFindings: { aiIssues: null, axeViolations: null, equalAccessFailures: null, total: 0 },
    scoreEvidence: { ai: null, axe: null, equalAccess: null },
    reasons: ['verification-policy-module-unavailable'],
  };
}
function _viewVerificationForExport(result, pipeline) {
  const value = result || {};
  const derived = _viewDeriveVerificationState({
    ai: value.verificationAudit || null,
    aiVerificationIncomplete: !!value._aiVerificationIncomplete,
    axe: value.axeAudit || null,
    equalAccess: value.secondEngineAudit || null,
    pdfUaSelfCheck: value.verificationCoverage && value.verificationCoverage.pdfUaSelfCheck,
    languageReviewRequired: !!value.languageReviewRequired,
    extraReasons: value.verificationExtraReasons || [],
    verificationScope: value.verificationScope || undefined,
    staticSourceScope: value.verificationScope === 'static-source',
  }, pipeline);
  const binding = _viewValidVerificationHtmlBinding(value.verificationHtmlBinding) ? value.verificationHtmlBinding : null;
  // C7 (2026-07-13): prefix-match the standard so the NEXT version bump doesn't
  // silently demote every canonical save made under the previous label.
  const stored = !!(value.verificationCoverage && /^WCAG 2\.\d+ AA$/.test(String(value.verificationCoverage.standard || '')) && /^(complete|complete-for-tested-scope|review-required|partial|unavailable)$/.test(value.verificationState || ''));
  const liveBound = _viewIsLiveVerificationHtmlBound(value, value.accessibleHtml, pipeline);
  if (stored && liveBound) {
    if (value.verificationState === 'complete-for-tested-scope' && derived.verificationState === 'complete') {
      return { ...derived, verificationState: 'complete-for-tested-scope', verificationScope: 'static-source', testedScopeComplete: true, fullyVerifiedSuccess: false, success: false, afterScoreVerified: false, requiresManualReview: true, verificationHtmlBinding: binding };
    }
    return { ...derived, verificationHtmlBinding: binding };
  }
  const why = stored ? 'verification-html-binding-missing-or-stale' : 'This saved result predates canonical verification coverage and is unverified.';
  const reasons = Array.from(new Set([why].concat(derived.reasons || [])));
  return {
    ...derived,
    verificationState: /^(?:complete|complete-for-tested-scope)$/.test(derived.verificationState || '') ? 'partial' : derived.verificationState,
    executionState: derived.executionState === 'complete' ? 'partial' : (derived.executionState || 'unavailable'),
    outcomeState: 'unknown',
    testedScopeComplete: false,
    engineExecutionComplete: false,
    fullyVerifiedSuccess: false,
    success: false,
    afterScoreVerified: false,
    requiresManualReview: true,
    reviewCount: Math.max(1, derived.reviewCount || 0),
    reasons,
    verificationHtmlBinding: binding,
  };
}
// One teacher-visible residual model for every remediation control. AI, axe-core,
// and Equal Access are deliberately kept as separate counts: the same underlying
// barrier can be reported by more than one engine, so the summed total is a count
// of engine findings, not a claim about unique defects. The canonical verification
// policy still decides whether all three engines completed and whether the document
// may be described as fully verified.
function _viewCanonicalRemediationEvidence(result, pipeline) {
  const value = result || {};
  const engineEvidence = _viewDeriveVerificationState({
    ai: value.verificationAudit || null,
    aiVerificationIncomplete: !!value._aiVerificationIncomplete,
    axe: value.axeAudit || null,
    equalAccess: value.secondEngineAudit || null,
    languageReviewRequired: !!value.languageReviewRequired,
  }, pipeline);
  const verification = _viewVerificationForExport(value, pipeline);
  const findings = engineEvidence.knownFindings || verification.knownFindings || {};
  const count = (value) => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : null;
  const counts = {
    ai: count(findings.aiIssues),
    axe: count(findings.axeViolations),
    equalAccess: count(findings.equalAccessFailures),
  };
  const known = [counts.ai, counts.axe, counts.equalAccess].filter(Number.isFinite);
  const totalEngineFindings = known.length ? known.reduce((sum, value) => sum + value, 0) : null;
  const reviewCount = Number.isFinite(engineEvidence.reviewCount) ? Math.max(0, Math.floor(engineEvidence.reviewCount)) : 0;
  const compactLabel = 'AI ' + (counts.ai === null ? '?' : counts.ai)
    + ' · axe ' + (counts.axe === null ? '?' : counts.axe)
    + ' · EA ' + (counts.equalAccess === null ? '?' : counts.equalAccess)
    + (reviewCount > 0 ? ' · review ' + reviewCount : '');
  return {
    verification,
    counts,
    totalEngineFindings,
    reviewCount,
    compactLabel,
    allThreeComplete: engineEvidence.engineExecutionComplete === true,
    fullyVerifiedSuccess: verification.fullyVerifiedSuccess === true,
  };
}

// Small exported render primitives keep the teacher-visible evidence under a real DOM
// regression test. These are the exact components used by PdfAuditView — the test does not
// merely search source text or accept a write-up hidden in title/aria-label attributes.
function _pdfVerificationReasonValues(reasons) {
  return (Array.isArray(reasons) ? reasons : []).map(reason => String(reason == null ? '' : reason).trim()).filter(Boolean);
}
function _pdfVerificationFreshness(reasons) {
  const values = _pdfVerificationReasonValues(reasons);
  if (values.some(reason => reason === 'content-modified-pending-reverification' || reason === 'secondary-action-requires-canonical-verification')) return 'changed';
  if (values.some(reason => /^verification-html-binding-(?:missing-or-stale|unavailable|mismatch)$/.test(reason))) return 'unconfirmed';
  return null;
}
function _pdfVerificationReasonText(reason) {
  const value = String(reason == null ? '' : reason).trim();
  if (!value) return '';
  let formatted = '';
  try {
    const policy = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.VerificationPolicy;
    if (policy && typeof policy.formatVerificationReason === 'function') formatted = policy.formatVerificationReason(value);
  } catch (_) {}
  if (typeof formatted === 'string' && formatted.trim() && formatted !== 'Verification evidence needs manual review.') {
    // These canonical buckets can have equal counts. Keep their category visible so display
    // deduplication does not erase one of two different sets of review findings.
    const category = /^equal-access-potential:\d+$/.test(value) ? 'Potential issues: '
      : /^equal-access-manual:\d+$/.test(value) ? 'Manual checks: ' : '';
    return category + formatted.trim();
  }
  const aiReview = value.match(/^ai-manual-review:(\d+)$/);
  if (aiReview) return aiReview[1] + ' AI finding' + (aiReview[1] === '1' ? ' needs' : 's need') + ' human review.';
  if (value === 'content-modified-pending-reverification') return 'The document was edited after verification. Run the checks again for the current version.';
  if (value === 'verification-policy-module-unavailable') return 'The verification service in this workspace is unavailable.';
  // Unknown codes remain available for diagnosis, and prose/URLs retain their punctuation.
  return /^[a-z0-9-]+(?::\d+)?$/i.test(value) ? 'Verification detail: ' + value : value;
}
function _pdfVerificationContext(reasons, verificationState) {
  const values = _pdfVerificationReasonValues(reasons);
  const freshness = _pdfVerificationFreshness(values);
  if (freshness) return {
    message: freshness === 'changed' ? 'The document changed after its verification checks.' : 'Verification is not confirmed for this document version.',
    next: 'Re-run verification to check this copy. The checks do not change the document.',
  };
  const incomplete = values.some(reason => /^(?:ai|axe|equal-access)-(?:unavailable|verification-incomplete|partial-audit|score-degraded|synthesized|finding-count-unknown|violation-count-unknown|failure-count-unknown|review-count-unknown)$/.test(reason));
  if (verificationState === 'unavailable' || verificationState === 'partial' || incomplete || values.includes('verification-policy-module-unavailable')) return {
    message: verificationState === 'unavailable' ? 'Current verification evidence is unavailable.' : 'Some checks or finding counts are incomplete.',
    next: 'Re-run verification to finish the checks before deciding whether more repairs are needed.',
  };
  const counted = expression => values.some(reason => { const match = reason.match(expression); return !!match && Number(match[1]) > 0; });
  if (counted(/^(?:ai-confirmed-issues|axe-confirmed-violations|equal-access-confirmed-failures):(\d+)$/)) return {
    message: 'The checks found accessibility issues.',
    next: 'Review the reported findings before choosing another repair pass.',
  };
  if (values.includes('document-language-needs-review')) return {
    message: 'The document language needs confirmation.',
    next: 'Confirm the language against the document, then run verification again.',
  };
  if (counted(/^(?:ai-manual-review|axe-incomplete|equal-access-(?:potential|manual|review-findings)):(\d+)$/)) return {
    message: 'Some findings need human judgment.',
    next: 'Review the flagged items against the document. Acknowledging them does not change verification.',
  };
  if (verificationState === 'complete-for-tested-scope' || values.some(reason => /static(?:[\s-]+html\/?)?[\s-]*source(?:[\s-]+audit)?|excludes live scripts|interaction behavior/i.test(reason))) return {
    message: 'The completed checks cover the static source.',
    next: 'Review keyboard navigation and live interactions in the published page.',
  };
  if (verificationState === 'complete') return { message: '', next: '' };
  return { message: 'Review the available verification evidence.', next: 'Use the details below to decide which checks or findings need attention.' };
}
function _PdfAuditVerificationEngineList({ coverage, engineLabel, reasons }) {
  const value = coverage || {};
  const names = { complete: 'complete', 'complete-with-review': 'complete with review — human judgment needed', partial: 'incomplete check', unavailable: 'unavailable' };
  const label = typeof engineLabel === 'function' ? engineLabel : state => names[state] || 'unavailable';
  const freshness = _pdfVerificationFreshness(reasons);
  const qualifier = freshness === 'changed' ? 'Check predates the latest edit; run again.' : 'Not confirmed for this document version.';
  return (
    <ul data-testid="pdf-verification-engine-list" className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-1 text-[11px]">
      {[
        ['ai', 'AI', value.ai], ['axe', 'axe-core', value.axe], ['equal-access', 'Equal Access', value.equalAccess],
      ].map(([engine, name, state]) => <li key={engine} data-engine={engine}>
        <strong>{name}:</strong> {label(state)}
        {freshness && ['complete', 'complete-with-review', 'partial'].includes(state) && <span data-verification-freshness={freshness} className="block mt-1 font-semibold">{qualifier}</span>}
      </li>)}
    </ul>
  );
}
function _PdfAuditVerificationReasons({ reasons, verificationState }) {
  const context = _pdfVerificationContext(reasons, verificationState);
  const messages = Array.from(new Set(_pdfVerificationReasonValues(reasons).map(_pdfVerificationReasonText).filter(Boolean)));
  return <div data-testid="pdf-verification-explanation" className="mt-2 text-xs">
    {context.message && <p className="font-semibold">{context.message}</p>}
    {context.next && <p className="mt-1">{context.next}</p>}
    {messages.length > 0 && <details className="mt-2"><summary className="font-bold cursor-pointer">Why this status?</summary><ul className="mt-1 ml-5 list-disc space-y-1">{messages.map(message => <li key={message}>{message}</li>)}</ul></details>}
  </div>;
}

// Per-foundation provenance. A completed engine with no matching finding can only
// attest to a foundation when that engine's configured ruleset actually covers the
// rule family. Optional/native-landmark presence checks intentionally say "Not tested"
// instead of borrowing the deterministic result or manufacturing 18/18 agreement.
const _PDF_FOUNDATION_ENGINE_RULES = {
  'html-lang': {
    ai: /^(?:document-language|html-lang|language-of-page)$/i,
    axe: /^(?:html-has-lang|html-lang-valid|html-xml-lang-mismatch)$/i,
    equalAccess: /(?:html|document|page).*(?:lang|language)|(?:lang|language).*(?:html|document|page)/i,
  },
  'page-title': {
    ai: /^(?:document-title|page-title)$/i,
    axe: /^document-title$/i,
    equalAccess: /(?:document|page).*title|title.*(?:document|page)/i,
  },
  main: { ai: /^(?:main-landmark|landmark-main|region-landmarks)$/i, axe: null, equalAccess: null },
  nav: { ai: /^(?:navigation-landmark|region-landmarks)$/i, axe: null, equalAccess: null },
  header: { ai: /^(?:banner-landmark|region-landmarks)$/i, axe: null, equalAccess: null },
  footer: { ai: /^(?:contentinfo-landmark|region-landmarks)$/i, axe: null, equalAccess: null },
  h1: { ai: /^(?:heading-root|page-has-heading-one|heading-hierarchy)$/i, axe: null, equalAccess: null },
  h2: {
    ai: /^(?:heading-order|heading-hierarchy|section-headings)$/i,
    axe: /^heading-order$/i,
    equalAccess: /heading.*(?:order|level|structure)|(?:order|level).*heading/i,
  },
  links: {
    ai: /^(?:link-text|descriptive-links|link-purpose)$/i,
    axe: /^(?:link-name|link-in-text-block)$/i,
    equalAccess: /link.*(?:name|text|purpose)|(?:name|purpose).*link/i,
  },
  'unordered-list': {
    ai: /^(?:semantic-list|list-semantics|unordered-list)$/i,
    axe: /^(?:list|listitem)$/i,
    equalAccess: /(?:unordered|semantic).*list|list.*(?:item|structure|semantic)/i,
  },
  'ordered-list': {
    ai: /^(?:semantic-list|list-semantics|ordered-list)$/i,
    axe: /^(?:list|listitem)$/i,
    equalAccess: /(?:ordered|semantic).*list|list.*(?:item|structure|semantic)/i,
  },
  'table-headers': {
    ai: /^(?:table-header|table-headers|data-table)$/i,
    axe: /^(?:td-headers-attr|th-has-data-cells|empty-table-header|headers-attr-valid)$/i,
    equalAccess: /table.*(?:header|headers)|(?:header|headers).*table/i,
  },
  'table-scope': {
    ai: /^(?:table-header|table-scope|data-table)$/i,
    axe: /^(?:scope-attr-valid|td-headers-attr|th-has-data-cells)$/i,
    equalAccess: /table.*(?:scope|header)|(?:scope|header).*table/i,
  },
  'skip-link': {
    ai: /^(?:skip-link|bypass-blocks|bypass)$/i,
    axe: /^bypass$/i,
    equalAccess: /(?:skip|bypass).*(?:content|block|navigation)|(?:content|block).*(?:skip|bypass)/i,
  },
  'image-alt': {
    ai: /^(?:image-alt|decorative-alt|alt-quality|image-alternative)$/i,
    axe: /^(?:image-alt|image-redundant-alt|input-image-alt|object-alt|svg-img-alt)$/i,
    equalAccess: /(?:image|img|graphic).*(?:alt|alternative|name)|(?:alt|alternative).*(?:image|img|graphic)/i,
  },
  'figure-caption': { ai: /^(?:figure-caption|figcaption)$/i, axe: null, equalAccess: null },
  'form-label': {
    ai: /^(?:form-label|input-label|form-name)$/i,
    axe: /^(?:label|label-title-only|select-name|form-field-multiple-labels)$/i,
    equalAccess: /(?:form|input|select|textarea|control).*(?:label|name)|(?:label|name).*(?:form|input|control)/i,
  },
  'aria-landmark': { ai: /^(?:aria-landmark|region-landmarks)$/i, axe: null, equalAccess: null },
};

function _viewFoundationRecordIdentity(record) {
  if (typeof record === 'string') return record;
  if (!record || typeof record !== 'object') return '';
  return String(record.ruleId || record.id || record.reasonId || record.rule || '').trim();
}
function _viewFoundationRecordText(record) {
  if (typeof record === 'string') return record;
  if (!record || typeof record !== 'object') return '';
  return [record.ruleId, record.id, record.reasonId, record.rule, record.issue, record.description, record.message, record.help]
    .filter(Boolean).join(' ');
}
function _viewFoundationMatches(records, rule, allowDescription) {
  if (!rule) return [];
  return (Array.isArray(records) ? records : []).filter((record) => {
    const identity = _viewFoundationRecordIdentity(record);
    if (identity && rule.test(identity)) return true;
    return !!(allowDescription && rule.test(_viewFoundationRecordText(record)));
  });
}
function _viewFoundationEvidence(foundations, result) {
  if (!foundations) return null;
  const value = result || {};
  const ai = value.verificationAudit || null;
  const axe = value.axeAudit || null;
  const ea = value.secondEngineAudit || null;
  const aiComplete = _viewUsableCompleteAiAudit(ai);
  const axeComplete = !!(axe && Number.isFinite(axe.score));
  const eaComplete = !!(ea && Number.isFinite(ea.score));
  const axeViolations = axe ? [].concat(axe.critical || [], axe.serious || [], axe.moderate || [], axe.minor || []) : [];
  const _finding = (state, detail, records) => ({
    state,
    detail,
    findingIds: Array.from(new Set((records || []).map(_viewFoundationRecordIdentity).filter(Boolean))),
  });
  const engineEvidence = (item, engine, complete, audit, failures, reviews, passes) => {
    if (item.status === 'not-applicable') return _finding('not-applicable', 'This foundation does not apply to the current HTML.', []);
    const rules = _PDF_FOUNDATION_ENGINE_RULES[item.id] || {};
    const rule = rules[engine];
    if (!complete || !audit) return _finding('unavailable', 'This engine has no completed result bound to the current HTML.', []);
    if (!rule) return _finding('not-tested', 'This engine\'s configured WCAG-only ruleset does not test this optional or presence-only foundation.', []);
    const allowDescription = engine === 'equalAccess';
    const failed = _viewFoundationMatches(failures, rule, allowDescription);
    if (failed.length) return _finding('fail', 'Matching finding: ' + failed.map(_viewFoundationRecordIdentity).filter(Boolean).join(', '), failed);
    const review = _viewFoundationMatches(reviews, rule, allowDescription);
    if (review.length) return _finding('review', 'Matching result requires human review: ' + review.map(_viewFoundationRecordIdentity).filter(Boolean).join(', '), review);
    const passed = _viewFoundationMatches(passes, rule, allowDescription);
    return _finding('pass', passed.length
      ? ('Matching rule passed: ' + passed.map(_viewFoundationRecordIdentity).filter(Boolean).join(', '))
      : 'No matching failure or review finding was returned by this completed engine run.', passed);
  };
  const items = (Array.isArray(foundations.items) ? foundations.items : []).map((item) => ({
    ...item,
    evidence: {
      deterministic: item.status === 'passed'
        ? _finding('pass', item.detail || 'Expected HTML pattern detected.', [])
        : item.status === 'missing'
          ? _finding('fail', item.detail || 'Expected HTML pattern was not detected.', [])
          : _finding('not-applicable', item.detail || 'This pattern does not apply.', []),
      ai: engineEvidence(item, 'ai', aiComplete, ai, (ai && ai.issues) || [], [], (ai && ai.passes) || []),
      axe: engineEvidence(item, 'axe', axeComplete, axe, axeViolations, (axe && axe.incomplete) || [], (axe && axe.passes) || []),
      equalAccess: engineEvidence(item, 'equalAccess', eaComplete, ea, (ea && ea.fails) || [], [].concat((ea && ea.potentialFindings) || [], (ea && ea.manualFindings) || []), []),
    },
  }));
  return { ...foundations, evidenceVersion: 1, items };
}

function _PdfHtmlFoundationMatrix({ foundations, imageConcern, imageDetail, onClose, onFix, onFixAll, fixingIds, disabled }) {
  if (!foundations) return null;
  const items = Array.isArray(foundations.items) ? foundations.items : [];
  const computed = items.reduce((acc, item) => {
    if (item && item.status === 'passed') acc.passed += 1;
    else if (item && item.status === 'missing') acc.missing += 1;
    else acc.notApplicable += 1;
    return acc;
  }, { passed: 0, missing: 0, notApplicable: 0, total: items.length });
  const summary = foundations.summary && Number.isFinite(foundations.summary.total)
    ? foundations.summary
    : computed;
  const statusMeta = {
    passed: { label: 'Passed / detected', className: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
    missing: { label: 'Missing', className: 'border-rose-200 bg-rose-50 text-rose-900' },
    'not-applicable': { label: 'Not applicable', className: 'border-slate-200 bg-slate-100 text-slate-800' },
  };
  const evidenceMeta = {
    pass: { label: 'Pass', className: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
    fail: { label: 'Finding', className: 'border-rose-200 bg-rose-50 text-rose-900' },
    review: { label: 'Review', className: 'border-amber-200 bg-amber-50 text-amber-950' },
    'not-tested': { label: 'Not tested', className: 'border-slate-200 bg-slate-50 text-slate-700' },
    unavailable: { label: 'Unavailable', className: 'border-slate-200 bg-slate-100 text-slate-600' },
    'not-applicable': { label: 'N/A', className: 'border-slate-200 bg-slate-100 text-slate-600' },
  };
  const fixingSet = new Set(Array.isArray(fixingIds) ? fixingIds : []);
  const fixableItems = items.filter((item) => item && item.status === 'missing' && item.autoFixable === true);
  const allBusy = !!disabled || fixingSet.size > 0;
  return (
    <section
      id="pdf-html-structure-details"
      data-testid="pdf-html-foundation-matrix"
      role="region"
      aria-labelledby="pdf-html-structure-details-heading"
      className="-mx-1 mt-2 mb-3 rounded-xl border border-sky-200 bg-sky-50/90 p-3 text-slate-700 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 id="pdf-html-structure-details-heading" className="text-sm font-black text-sky-950">HTML foundations: all 18 checks</h3>
          <p data-testid="pdf-html-foundation-explanation" className="mt-1 text-xs leading-relaxed">
            Every foundation is shown below. “Passed / detected” means the expected HTML pattern is present; it does not prove that its value or wording is correct. “Missing” means the pattern applies but was not detected. “Not applicable” means this document has no matching content need. This is not a WCAG score, remediation target, or exported-PDF validation result.
          </p>
          <p data-testid="pdf-html-foundation-provenance-explanation" className="mt-1 text-xs leading-relaxed">
            Each row keeps four evidence sources separate: the deterministic HTML detector, AI review, axe-core, and IBM Equal Access. “Not tested” is intentional when an engine’s configured rules do not cover that foundation. Safe fixes reuse meaning already present in the document; ambiguous semantics remain for review. Every applied fix is re-audited by all three verification engines.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold" data-testid="pdf-html-foundation-summary">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-emerald-900">{summary.passed} passed</span>
            <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-rose-900">{summary.missing} missing</span>
            <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-slate-800">{summary.notApplicable} not applicable</span>
          </div>
          {fixableItems.length > 0 && typeof onFixAll === 'function' && (
            <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 p-2.5 text-xs text-indigo-950">
              <button
                type="button"
                data-testid="pdf-html-foundation-fix-all"
                disabled={allBusy}
                onClick={() => onFixAll(fixableItems.map((item) => item.id))}
                className="rounded-md bg-indigo-700 px-3 py-1.5 font-black text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {allBusy ? 'Fixing and re-verifying…' : ('Fix all safe missing foundations (' + fixableItems.length + ')')}
              </button>
              <span className="ml-2">One guarded batch, followed by AI + axe-core + Equal Access verification.</span>
            </div>
          )}
        </div>
        {typeof onClose === 'function' && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md border border-sky-300 bg-white px-2 py-1 text-[11px] font-bold text-sky-900 hover:bg-sky-100 focus-visible:ring-2 focus-visible:ring-sky-500"
            aria-label="Close HTML structure details"
          >
            Close
          </button>
        )}
      </div>
      {imageConcern && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-950" role="alert">
          <strong>Image fidelity needs review.</strong> {imageDetail}
        </div>
      )}
      {items.length > 0 ? (
        <div className="mt-3 overflow-x-auto rounded-lg border border-sky-200 bg-white">
          <table className="w-full border-collapse text-left text-[11px] leading-relaxed">
            <thead className="bg-sky-100/80 text-sky-950">
              <tr>
                <th scope="col" className="px-2.5 py-2 font-black">Foundation</th>
                <th scope="col" className="px-2.5 py-2 font-black">Status</th>
                <th scope="col" className="px-2.5 py-2 font-black">Evidence by source</th>
                <th scope="col" className="px-2.5 py-2 font-black">What was found</th>
                <th scope="col" className="px-2.5 py-2 font-black">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const status = statusMeta[item.status] || statusMeta['not-applicable'];
                const evidence = item.evidence || {};
                const sources = [
                  ['deterministic', 'HTML detector'],
                  ['ai', 'AI'],
                  ['axe', 'axe-core'],
                  ['equalAccess', 'IBM Equal Access'],
                ];
                const isFixing = fixingSet.has(item.id);
                return (
                  <tr key={item.id} data-foundation-id={item.id} data-status={item.status} className="border-t border-sky-100 align-top">
                    <th scope="row" className="px-2.5 py-2 font-bold text-slate-950">{item.label}</th>
                    <td className="px-2.5 py-2">
                      <span className={'inline-block whitespace-nowrap rounded-full border px-2 py-0.5 font-bold ' + status.className}>{status.label}</span>
                    </td>
                    <td className="min-w-[230px] px-2.5 py-2">
                      <ul className="space-y-1" aria-label={'Evidence sources for ' + item.label}>
                        {sources.map(([key, label]) => {
                          const entry = evidence[key] || { state: 'unavailable', detail: 'No evidence was recorded.' };
                          const meta = evidenceMeta[entry.state] || evidenceMeta.unavailable;
                          return (
                            <li key={key} data-evidence-source={key} data-evidence-state={entry.state} className="grid grid-cols-[108px_auto] items-start gap-1.5">
                              <strong>{label}:</strong>
                              <span>
                                <span className={'inline-block rounded-full border px-1.5 py-0.5 font-bold ' + meta.className}>{meta.label}</span>
                                <span className="mt-0.5 block text-[10px] leading-snug text-slate-600">{entry.detail}</span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </td>
                    <td className="px-2.5 py-2 text-slate-700">{item.detail || 'No additional detail.'}</td>
                    <td className="min-w-[118px] px-2.5 py-2">
                      {item.status === 'missing' && item.autoFixable === true && typeof onFix === 'function' ? (
                        <button
                          type="button"
                          data-testid={'pdf-html-foundation-fix-' + item.id}
                          disabled={allBusy}
                          onClick={() => onFix(item.id)}
                          className="rounded-md border border-indigo-300 bg-white px-2 py-1 font-bold text-indigo-800 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          {isFixing ? 'Fixing…' : 'Fix this'}
                        </button>
                      ) : item.status === 'missing' ? (
                        <span className="font-bold text-amber-800">Review needed</span>
                      ) : (
                        <span className="text-slate-500">No action</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-950">The foundation inventory is unavailable for this result. Re-run verification to populate all 18 checks.</p>
      )}
    </section>
  );
}
function _viewNormalizeLoadedVerification(result, pipeline) {
  const value = result || {};
  const normalized = _viewVerificationForExport(value, pipeline);
  return {
    ...value,
    verificationCoverage: normalized.coverage || normalized.verificationCoverage || null,
    verificationState: normalized.verificationState || 'unavailable',
    verificationReasons: Array.isArray(normalized.reasons) ? normalized.reasons : [],
    verificationReviewCount: Number.isFinite(normalized.reviewCount) ? normalized.reviewCount : 0,
    executionState: normalized.executionState || 'unavailable',
    outcomeState: normalized.outcomeState || 'unknown',
    verificationScope: normalized.verificationScope || value.verificationScope || 'full-output',
    testedScopeComplete: normalized.testedScopeComplete === true,
    engineExecutionComplete: normalized.engineExecutionComplete === true,
    fullyVerifiedSuccess: normalized.fullyVerifiedSuccess === true,
    success: normalized.success === true,
    knownFindingCount: Number.isFinite(normalized.knownFindingCount) ? normalized.knownFindingCount : null,
    knownFindings: normalized.knownFindings || null,
    scoreEvidence: normalized.scoreEvidence || null,
    afterScoreVerified: normalized.afterScoreVerified === true,
    requiresManualReview: normalized.requiresManualReview !== false,
    verificationHtmlBinding: normalized.verificationHtmlBinding || value.verificationHtmlBinding || null,
  };
}
// S7 (deep dive 2026-07-02): unicode token fold for missing-word diffs — DELEGATES to the
// pipeline's canonical _alloNormTokenForDiff (normTokenForDiff static). This fold feeds
// teacher-visible numbers (residual missing-word counts, restoration UI), and the view used
// to carry TWO inline copies that could silently drift from the pipeline's (and did,
// 2026-06-23). The fallback below is for load-order edge cases only and is drift-sentinel
// tested against the pipeline's copy (tests/norm_token_drift.test.js) — edit BOTH or neither.
function _viewNormTokenFallback(s) {
  return String(s || '').toLowerCase().replace(/[​‌‍﻿]/g, '').replace(/ﬀ/g, 'ff').replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl').replace(/ﬃ/g, 'ffi').replace(/ﬄ/g, 'ffl').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/(\p{L})[-­‐‑](\p{L})/gu, '$1$2').replace(/­/g, '').replace(/\s+/g, '');
}
function _normTokenForDiffShared(s) {
  try {
    const f = typeof window !== 'undefined' && window.AlloModules && window.AlloModules.createDocPipeline && window.AlloModules.createDocPipeline.normTokenForDiff;
    if (f) return f(s);
  } catch (_) {}
  return _viewNormTokenFallback(s);
}

