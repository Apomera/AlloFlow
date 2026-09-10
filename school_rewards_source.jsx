/* global React */
// School Rewards & Store — Leadership Hub tool (2026-09-01).
//
// Until this pass School Rewards was the only hub tool with no in-app surface:
// the hub card was a bare launcher and the connect form lived in Project
// Settings, while Educator Evaluation and the Class Mailbox both carry their
// setup inside the tool. This panel follows the Educator Evaluation pattern.
// A saved address is a launcher, not evidence of a working deployment.
// Not connected: the same resumable checklist shape as the principal Drive
// helper, with copy-source controls for the four package files, a generated
// one-time setup call, and the paste-URL step. This launcher stores its URL and
// checklist, not the school ledger. Classroom tools separately keep pseudonymous
// class state; the managed Store owns its roster, ledger and roles.

const SR_PORTAL_URL_KEY = 'allo_school_rewards_portal_url_v1';
const SR_SETUP_KEY = 'allo_school_rewards_setup_v1';
const SR_SOURCE_DIR = 'apps_script/school_rewards/';
const SR_CDN_BASE = 'https://alloflow-cdn.pages.dev/';
const SR_DEFAULT_THRESHOLDS = [0, 25, 75, 150, 300];
const SR_PATHS = ['practice', 'join', 'setup'];
const SR_LAUNCH_SUFFIXES = Object.freeze({ portal: '', recognition: '?view=recognition', check: '?api=status' });
const SR_GUIDE_TARGETS = Object.freeze({ practice: 'sr-path-practice', connection: 'schoolrewards-portal-url', launch: 'sr-path-launch', check: 'sr-path-check', approval: 'sr-card-approval', handoff: 'sr-path-handoff', files: 'sr-card-code', configuration: 'sr-card-setup', deploy: 'sr-card-deployed' });

// Signatures are checked before anything is copied, so a wrong or partial file
// (a CDN 404 page, a stale mirror) never reaches the principal's project.
const SR_FILES = [
  { name: 'Code.gs', step: 'code', signatures: ['function setupSchoolRewardsRepository', 'function doGet', "var SR_SERVICE = 'alloflow-school-rewards'"] },
  { name: 'Portal.html', step: 'portal', signatures: ['id="school-title"', 'School Rewards sections', 'google.script.run'] },
  { name: 'Index.html', step: 'index', signatures: ["include('Portal')", 'AlloFlow School Rewards'] },
  { name: 'appsscript.json', step: 'manifest', signatures: ['"oauthScopes"', '"access": "DOMAIN"', 'script.send_mail'] },
];

const SR_STEP_ORDER = ['approval', 'project', 'code', 'portal', 'index', 'manifest', 'setup', 'deployed', 'connected', 'verified'];

// Same rule the host and Project Settings enforce: HTTPS, script.google.com,
// /macros/s/{deployment}/exec, nothing else on the URL.
function srNormalizePortalUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || url.port || url.username || url.password || url.search || url.hash) return '';
    if (!/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)) return '';
    return url.origin + url.pathname;
  } catch (_) { return ''; }
}

function srReadLocalPortalUrl() {
  try { return srNormalizePortalUrl(window.localStorage.getItem(SR_PORTAL_URL_KEY)); } catch (_) { return ''; }
}

function srReadSetup() {
  const fallback = { steps: [], form: {} };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SR_SETUP_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return fallback;
    return {
      steps: Array.isArray(parsed.steps) ? parsed.steps.filter((step) => SR_STEP_ORDER.indexOf(step) !== -1) : [],
      form: parsed.form && typeof parsed.form === 'object' ? parsed.form : {},
      verifiedPortalUrl: srNormalizePortalUrl(parsed.verifiedPortalUrl || srReadLocalPortalUrl()),
    };
  } catch (_) { return fallback; }
}

function srWriteSetup(setup) {
  try { window.localStorage.setItem(SR_SETUP_KEY, JSON.stringify(setup)); return true; } catch (_) { return false; }
}

// Clipboard writes are refused by permissions policy inside the Gemini Canvas
// iframe; the app shell's window.alloCopyText falls back to execCommand('copy'),
// which still works there. Route through it when the shell is present, and
// carry the same two-step fallback inline for any host without it.
async function srCopyText(text) {
  if (typeof window !== 'undefined' && typeof window.alloCopyText === 'function') {
    try { return !!(await window.alloCopyText(text)); } catch (_) { return false; }
  }
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') { await navigator.clipboard.writeText(text); return true; }
  } catch (_) {}
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return !!ok;
  } catch (_) { return false; }
}

function srParseThresholds(text) {
  const values = String(text || '').split(/[^0-9]+/).filter(Boolean).map((part) => parseInt(part, 10)).filter((n) => Number.isFinite(n) && n >= 0);
  const unique = Array.from(new Set(values)).sort((a, b) => a - b);
  if (!unique.length) return SR_DEFAULT_THRESHOLDS.slice();
  if (unique[0] !== 0) unique.unshift(0);
  return unique;
}

// The Apps Script editor runs a function by name and cannot pass arguments, so
// the one-time setup is delivered as a tiny wrapper the principal pastes,
// runs once, and may delete. The setup account becomes the first administrator
// and the allowed domain must match its email domain (Code.gs enforces both).
function srSetupSnippet(form) {
  const quote = (value) => "'" + String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ') + "'";
  const thresholds = srParseThresholds(form.levelThresholds);
  return [
    '// Paste at the END of Code.gs. In the function menu choose',
    '// runInitialSchoolRewardsSetup, click Run, and approve the requested',
    '// scopes once. Delete this wrapper after the log shows "ok": true.',
    'function runInitialSchoolRewardsSetup() {',
    '  var result = setupSchoolRewardsRepository({',
    '    allowedDomain: ' + quote(form.allowedDomain) + ',',
    '    schoolName: ' + quote(form.schoolName) + ',',
    '    academicYear: ' + quote(form.academicYear) + ',',
    '    seedHowls: ' + (form.seedHowls === false ? 'false' : 'true') + ',',
    '    levelThresholds: [' + thresholds.join(', ') + ']',
    '  });',
    '  Logger.log(JSON.stringify(result));',
    '}',
  ].join('\n');
}

// Shared fetch for the four package files: local tree first, then the CDN
// mirror, and nothing is accepted unless every signature is present.
async function srFetchPackageFile(file) {
  const path = SR_SOURCE_DIR + file.name;
  const urls = ['/' + path, SR_CDN_BASE + path];
  for (const url of urls) {
    try {
      const response = await fetch(url, { credentials: 'omit' });
      if (!response.ok) continue;
      const source = await response.text();
      if (source && file.signatures.every((token) => source.includes(token))) return source;
    } catch (_) {}
  }
  return '';
}

// IT handoff (2026-09-02). Principals rarely do the editor steps themselves.
// One packet lets a technology coordinator finish the Apps Script work and
// send back the /exec link. The HTML packet embeds the four files and the
// generated setup function with copy buttons; the text version links to the
// published sources instead so it fits in an email.
function srHandoffSteps(form) {
  const school = String(form.schoolName || '').trim() || 'our school';
  return [
    ['Open script.new', 'Sign in to the managed Google Workspace account that will own the ledger (a durable role account is safer than a personal one), then open https://script.new/. Click "Untitled project" at the top and name it AlloFlow School Rewards. Open Project Settings (the gear on the left) and tick "Show appsscript.json manifest file in editor".'],
    ['Replace Code.gs', 'Code.gs is already open with a few starter lines. Click inside it, press Ctrl+A (Cmd+A on a Mac), paste the Code.gs source over it, then press Ctrl+S to save.'],
    ['Add the Portal page', 'In the Files list on the left click the + beside Files and choose HTML. Type Portal as the name (the editor adds .html itself) and press Enter. Select its starter lines with Ctrl+A, paste the Portal.html source, and save.'],
    ['Add the Index page', 'Same again: click the + beside Files, choose HTML, name it Index, press Enter, select the starter lines, paste the Index.html source, and save.'],
    ['Replace appsscript.json', 'Click appsscript.json in the Files list, select everything with Ctrl+A, paste the manifest source, and save.'],
    ['Run the one-time setup', 'Open Code.gs, press Ctrl+End to reach the bottom, paste the setup function (below), and save. In the toolbar, the dropdown beside Debug lists the functions: choose runInitialSchoolRewardsSetup, then click Run. Review the managed account and each requested permission with the district-approved technical owner. Authorise only the reviewed permissions. If Google or district policy blocks access, stop and consult IT; do not bypass a warning. The Execution log should end with "ok": true. You may delete the pasted function afterwards.'],
    ['Deploy privately', 'Click Deploy (top right), then New deployment. Beside "Select type" click the gear and choose Web app. Description: School Rewards. Execute as: Me. Who has access: your organisation (the domain), never Anyone. Click Deploy and copy the Web app URL that ends in /exec.'],
    ['Send the link back', 'Send that /exec link to the person who gave you this packet (for ' + school + '). They save the launcher address in AlloFlow, then separately check the deployment and each intended role with approved test accounts. Saving the address does not verify the Store. If any file changes later, use Deploy, Manage deployments, edit, New version, or the change will not go live.'],
  ];
}
function srHandoffText(form, snippet) {
  const lines = ['AlloFlow School Rewards: setup instructions for the technology coordinator', 'School: ' + (form.schoolName || '(not set yet)'), 'Allowed sign-in domain: ' + (form.allowedDomain || '(not set yet)'), 'The owner, staff and students must use this exact email domain. Different staff/student domains are not supported by this version; review compatibility before installing.', '', 'Sources to paste (open each link, press Ctrl+A, then Ctrl+C):'];
  SR_FILES.forEach((file) => lines.push('  ' + file.name + ': ' + SR_CDN_BASE + SR_SOURCE_DIR + file.name));
  lines.push('');
  srHandoffSteps(form).forEach((step, i) => lines.push((i + 1) + '. ' + step[0], '   ' + step[1], ''));
  lines.push('Setup function to paste at the end of Code.gs (step 6):', '', snippet, '', 'Full manual: ' + SR_CDN_BASE + 'school-rewards-manual');
  return lines.join('\n');
}
function srHandoffHtml(form, snippet, sources) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const block = (id, label, text) => '<section class="file" id="sec-' + id + '"><h3>' + esc(label) + '</h3><p><button type="button" data-copy="' + id + '">Copy ' + esc(label) + '</button> <span class="ok" id="ok-' + id + '" role="status"></span></p><textarea id="' + id + '" readonly spellcheck="false" aria-label="' + esc(label) + ' source">' + esc(text) + '</textarea></section>';
  const files = SR_FILES.map((file) => {
    const id = file.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    if (sources && sources[file.name]) return block(id, file.name, sources[file.name]);
    return '<section class="file"><h3>' + esc(file.name) + '</h3><p>Open <a href="' + esc(SR_CDN_BASE + SR_SOURCE_DIR + file.name) + '">' + esc(file.name) + '</a>, press Ctrl+A, then Ctrl+C.</p></section>';
  }).join('');
  const steps = srHandoffSteps(form).map((step) => '<li><strong>' + esc(step[0]) + '.</strong> ' + esc(step[1]) + '</li>').join('');
  const school = esc(form.schoolName || 'the school');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AlloFlow School Rewards: setup for IT</title><style>body{font:16px/1.5 system-ui,sans-serif;max-width:900px;margin:24px auto;padding:0 16px;color:#172033}h1{font-size:24px}h2{font-size:19px;margin-top:28px}h3{font-size:16px;margin:0 0 6px}ol{padding-left:22px}li{margin:0 0 12px}.file{border:1px solid #cbd5e1;border-radius:12px;padding:12px 14px;margin:12px 0}textarea{width:100%;min-height:140px;font:12px ui-monospace,Consolas,monospace;box-sizing:border-box}button{min-height:40px;border-radius:9px;border:1px solid #1e40af;background:#1e40af;color:#fff;font-weight:700;padding:6px 14px;cursor:pointer}.ok{font-weight:700;color:#166534}.note{background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:10px 12px}</style></head><body><h1>AlloFlow School Rewards: setup for the technology coordinator</h1><p>Prepared for <strong>' + school + '</strong>' + (form.allowedDomain ? ' (sign-in domain <code>' + esc(form.allowedDomain) + '</code>)' : '') + '. Everything you need is on this page: the eight steps, the four files with copy buttons, and the one-time setup function. Both setup routes use the same school-owned Google-authenticated Store. Nothing here contains student data.</p><p class="note">Do this signed in to the managed Google Workspace account that should own the ledger, not a personal account. The account that runs the setup becomes the first administrator. The owner, staff and students must use the same exact email domain; review compatibility before installing if staff and student domains differ.</p><h2>Steps</h2><ol>' + steps + '</ol><h2>Files to paste</h2>' + files + '<h2>Setup function (step 6)</h2>' + block('setup-fn', 'setup function', snippet) + '<p>Full manual: <a href="' + esc(SR_CDN_BASE + 'school-rewards-manual') + '">' + esc(SR_CDN_BASE + 'school-rewards-manual') + '</a></p><script>document.querySelectorAll("[data-copy]").forEach(function(b){b.onclick=function(){var ta=document.getElementById(b.getAttribute("data-copy"));var ok=document.getElementById("ok-"+b.getAttribute("data-copy"));ta.focus();ta.select();var done=false;try{done=document.execCommand("copy")}catch(e){}if(!done&&navigator.clipboard){navigator.clipboard.writeText(ta.value).then(function(){ok.textContent="Copied"},function(){ok.textContent="Press Ctrl+C now; the text is selected."})}else{ok.textContent=done?"Copied":"Press Ctrl+C now; the text is selected."}}});</script></body></html>';
}

function SrHandoff({ form, snippet, tt }) {
  const [state, setState] = React.useState('');
  const download = async () => {
    setState('loading');
    const sources = {};
    for (const file of SR_FILES) { const source = await srFetchPackageFile(file); if (source) sources[file.name] = source; }
    const missing = SR_FILES.filter((file) => !sources[file.name]).length;
    try {
      const blob = new Blob([srHandoffHtml(form, snippet, sources)], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'school-rewards-setup-for-it.html';
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => { try { URL.revokeObjectURL(url); } catch (_) {} }, 1000);
      setState(missing ? 'partial' : 'downloaded');
    } catch (_) { setState('failed'); }
  };
  const copyText = async () => { setState((await srCopyText(srHandoffText(form, snippet))) ? 'copied' : 'copyfailed'); };
  const messages = {
    loading: tt('schoolrewards.handoff_loading', 'Gathering the files…'),
    downloaded: tt('schoolrewards.handoff_downloaded', 'Downloaded school-rewards-setup-for-it.html. Email it to your technology coordinator; it holds every file, the steps, and the setup function.'),
    partial: tt('schoolrewards.handoff_partial', 'Downloaded school-rewards-setup-for-it.html. Some files could not be fetched just now, so the packet links to them instead.'),
    failed: tt('schoolrewards.handoff_failed', 'The file could not be created in this window. Use the copy button instead.'),
    copied: tt('schoolrewards.handoff_copied', 'Copied. Paste it into an email; the file sources are linked inside.'),
    copyfailed: tt('schoolrewards.handoff_copy_failed', 'Clipboard is blocked in this window. Use the download button instead.'),
  };
  return <div className="mt-3">
    <div className="flex flex-wrap gap-2">
      <button type="button" className={SR_BTN_PRIMARY} onClick={download} disabled={state === 'loading'} data-help-key="schoolrewards_handoff_download">{tt('schoolrewards.handoff_download', 'Download instructions for IT')}</button>
      <button type="button" className={SR_BTN_SECONDARY} onClick={copyText} data-help-key="schoolrewards_handoff_copy">{tt('schoolrewards.handoff_copy', 'Copy as email text')}</button>
    </div>
    {messages[state] && <p className="m-0 mt-2 text-xs text-slate-800" role="status">{messages[state]}</p>}
  </div>;
}

function srMakeTt(t) {
  return (key, fallback) => {
    if (typeof t === 'function') {
      try { const v = t(key); if (v) return v; } catch (_) {}
    }
    return fallback;
  };
}

const SR_BTN = 'inline-flex items-center justify-center min-h-11 rounded-xl px-4 py-2 text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';
const SR_BTN_PRIMARY = SR_BTN + ' bg-emerald-700 text-white hover:bg-emerald-800 focus:ring-emerald-600';
const SR_BTN_SECONDARY = SR_BTN + ' border border-emerald-700 bg-white text-emerald-900 hover:bg-emerald-50 focus:ring-emerald-600';
const SR_BTN_QUIET = SR_BTN + ' border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus:ring-emerald-600';
const SR_INPUT = 'w-full min-h-11 rounded-xl border border-slate-400 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600';

// Package files are fetched only after an explicit copy action, never on path
// selection. If activation expires while fetching, the manual copy fallback
// keeps the validated source selectable for a fresh user gesture.
function SrCopySource({ file, onCopied, tt }) {
  const [state, setState] = React.useState('idle');
  const [manualSource, setManualSource] = React.useState('');
  const sourceRef = React.useRef('');
  const manualRef = React.useRef(null);
  const fetchSource = React.useCallback(async () => {
    if (sourceRef.current) return sourceRef.current;
    const source = await srFetchPackageFile(file);
    if (source) sourceRef.current = source;
    return source;
  }, [file]);
  const finishCopied = () => {
    setManualSource('');
    setState('copied');
    if (typeof onCopied === 'function') onCopied();
    window.setTimeout(() => setState('idle'), 2400);
  };
  const copy = async () => {
    setState('loading');
    setManualSource('');
    const source = await fetchSource();
    if (!source) { setState('invalid'); return; }
    if (await srCopyText(source)) { finishCopied(); return; }
    setManualSource(source);
    setState('manual');
  };
  const selectManual = () => { try { manualRef.current.focus(); manualRef.current.select(); } catch (_) {} };
  React.useEffect(() => { if (state === 'manual') selectManual(); }, [state]);
  const manualId = 'sr-manual-' + file.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const sourceHref = SR_CDN_BASE + SR_SOURCE_DIR + file.name;
  return <div className="mt-2">
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={SR_BTN_SECONDARY} onClick={copy} disabled={state === 'loading'} data-help-key="schoolrewards_copy_source">
        {state === 'loading' ? tt('schoolrewards.loading_source', 'Loading source…') : (state === 'copied' ? tt('schoolrewards.copied', 'Copied ') + file.name : tt('schoolrewards.copy', 'Copy ') + file.name)}
      </button>
      <span className="text-xs text-slate-700">{file.name} · <a className="font-bold text-emerald-900 underline" href={sourceHref} target="_blank" rel="noopener noreferrer">{tt('schoolrewards.view_source', 'view source')}</a></span>
      {state === 'invalid' && <span className="rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-900" role="status">{tt('schoolrewards.unexpected_source', 'Unexpected source received; nothing copied')}</span>}
    </div>
    {state === 'manual' && <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" role="status">
      <p className="m-0 mb-2"><strong>{tt('schoolrewards.clipboard_blocked', 'Clipboard is blocked in this window.')}</strong> {tt('schoolrewards.clipboard_blocked_help', 'The source is selected below: press Ctrl+C (Cmd+C on Mac) to copy it, then paste it into the project. Copying from the box marks this step done.')}</p>
      <label htmlFor={manualId} className="block text-xs font-bold text-amber-950">{file.name} {tt('schoolrewards.source', 'source')}</label>
      <textarea id={manualId} ref={manualRef} className={SR_INPUT + ' mt-1 font-mono text-xs'} readOnly rows={8} value={manualSource} spellCheck={false} onFocus={(event) => event.target.select()} onCopy={finishCopied} />
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className={SR_BTN_QUIET} onClick={selectManual}>{tt('schoolrewards.select_all', 'Select all')}</button>
        <button type="button" className={SR_BTN_PRIMARY} onClick={finishCopied}>{tt('schoolrewards.mark_pasted', 'I pasted it; mark this step done')}</button>
      </div>
    </div>}
  </div>;
}

// Staff share: the portal link carries no secret (access is domain sign-in plus
// the roster), so showing it as a QR and a copyable link is safe. Reuses the
// app shell's single QR implementation when it is present.
function SrShareWithStaff({ portalUrl, tt, addToast }) {
  const [svg, setSvg] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const qrRequest = React.useRef(0);
  React.useEffect(() => { qrRequest.current++; setSvg(''); return () => { qrRequest.current++; }; }, [portalUrl]);
  const createQr = async () => {
    const request = ++qrRequest.current;
      try {
        if (typeof window !== 'undefined' && typeof window.__alloMakeQrSvg === 'function') {
          const markup = await window.__alloMakeQrSvg(portalUrl, 'School Rewards');
          if (request === qrRequest.current && typeof markup === 'string' && markup) setSvg(markup);
        }
      } catch (_) { if (request === qrRequest.current) setSvg(''); }
  };
  const copyLink = async () => {
    if (await srCopyText(portalUrl)) { setCopied(true); window.setTimeout(() => setCopied(false), 2000); return; }
    addToast(tt('schoolrewards.share_copy_failed', 'Clipboard is blocked here. Select the link and press Ctrl+C.'), 'info');
  };
  return <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3" data-help-key="schoolrewards_share_staff">
    <h4 className="text-sm font-black text-slate-900">{tt('schoolrewards.share_title', 'Share with staff')}</h4>
    <p className="mt-1 text-xs leading-relaxed text-slate-700">{tt('schoolrewards.share_help', 'Teachers, cashiers, and administrators open this same link with their school Google sign-in; the server decides what each role can do. The link holds no secret, so posting it in a staff channel is fine.')}</p>
    <div className="mt-2 flex flex-wrap items-center gap-3">
      {!svg && <button type="button" className={SR_BTN_QUIET} onClick={createQr} data-help-key="schoolrewards_share_qr">{tt('schoolrewards.share_make_qr', 'Create staff-link QR code')}</button>}
      {svg ? <figure className="m-0" aria-label={tt('schoolrewards.share_qr_label', 'QR code for the School Rewards portal')}><div className="rounded-lg border border-slate-300 bg-white p-1" style={{ width: 132, height: 132 }} dangerouslySetInnerHTML={{ __html: svg }} /></figure> : null}
      <div className="min-w-[220px] flex-1">
        <label htmlFor="schoolrewards-share-link" className="block text-xs font-black text-slate-800">{tt('schoolrewards.share_link', 'Staff link')}</label>
        <input id="schoolrewards-share-link" className={SR_INPUT + ' mt-1 font-mono text-xs'} readOnly value={portalUrl} onFocus={(event) => event.target.select()} />
        <button type="button" className={SR_BTN_SECONDARY + ' mt-2'} onClick={copyLink} data-help-key="schoolrewards_share_copy">{copied ? tt('schoolrewards.share_copied', 'Link copied') : tt('schoolrewards.share_copy', 'Copy staff link')}</button>
      </div>
    </div>
  </div>;
}

// Classroom roster bridge. AlloFlow's roster key is codename-based by design
// (no student names or emails ever leave the teacher's head), while School
// Rewards is keyed by managed Google identity. The honest bridge therefore
// exports the STRUCTURE (groups as homerooms, codenames as a cross-reference)
// as a CSV template the administrator completes from the SIS; the portal's
// importer ignores the two extra columns.
function srReadClassroomRoster() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem('alloflow_roster_key') || 'null');
    if (!parsed || typeof parsed !== 'object') return null;
    const groups = parsed.groups && typeof parsed.groups === 'object' && !Array.isArray(parsed.groups) ? parsed.groups : {};
    const students = parsed.students && typeof parsed.students === 'object' && !Array.isArray(parsed.students) ? parsed.students : {};
    const byGroup = Object.create(null);
    Object.keys(students).forEach((codename) => {
      const value = students[codename];
      const groupId = typeof value === 'string' ? value : (value && typeof value === 'object' ? String(value.groupId || '') : '');
      (byGroup[groupId] = byGroup[groupId] || []).push(codename);
    });
    const list = Object.keys(groups).map((id) => ({ id, name: String((groups[id] && groups[id].name) || id), codenames: (byGroup[id] || []).slice().sort() }));
    const unassigned = Object.keys(byGroup).filter((id) => !groups[id]).reduce((all, id) => all.concat(byGroup[id]), []);
    if (unassigned.length) list.push({ id: '', name: 'Unassigned', codenames: unassigned.slice().sort() });
    return { groups: list, total: Object.keys(students).length };
  } catch (_) { return null; }
}

function srCsvCell(value) {
  const raw = String(value == null ? '' : value);
  // CSV quoting does not stop a spreadsheet from evaluating a formula.
  const text = /^[\t\r\n]|^\s*[=+\-@]/.test(raw) ? "'" + raw : raw;
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function srRosterTemplateCsv(roster, groupIds) {
  const wanted = new Set(groupIds);
  const rows = [['firstName', 'lastInitial', 'grade', 'homeroom', 'email', 'alloflowCodename', 'alloflowGroup']];
  (roster ? roster.groups : []).filter((group) => wanted.has(group.id)).forEach((group) => {
    group.codenames.forEach((codename) => rows.push(['', '', '', group.name, '', codename, group.name]));
  });
  return rows.map((row) => row.map(srCsvCell).join(',')).join('\r\n') + '\r\n';
}

function SrRosterBridge({ tt, addToast }) {
  const [roster, setRoster] = React.useState(() => srReadClassroomRoster());
  const [selected, setSelected] = React.useState(() => new Set());
  const [done, setDone] = React.useState('');
  const refresh = () => { setRoster(srReadClassroomRoster()); setSelected(new Set()); setDone(''); };
  const toggle = (id) => setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const count = roster ? roster.groups.filter((group) => selected.has(group.id)).reduce((sum, group) => sum + group.codenames.length, 0) : 0;
  const download = () => {
    const csv = srRosterTemplateCsv(roster, Array.from(selected));
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'school-rewards-roster-template.csv';
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDone(tt('schoolrewards.roster_downloaded', 'Template downloaded. Complete firstName, lastInitial, grade, and the managed email from the SIS, then import it in the portal Admin tab.'));
    } catch (_) { addToast(tt('schoolrewards.roster_download_failed', 'The template could not be downloaded in this window.'), 'error'); }
  };
  return <section aria-labelledby="schoolrewards-roster-title" className="rounded-2xl border border-slate-200 bg-white p-4" data-help-key="schoolrewards_roster_bridge">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 id="schoolrewards-roster-title" className="text-base font-black text-slate-900">{tt('schoolrewards.roster_title', 'Classroom roster bridge')}</h3>
      <button type="button" className={SR_BTN_QUIET} onClick={refresh}>{tt('schoolrewards.roster_refresh', 'Re-read roster')}</button>
    </div>
    <p className="mt-1 text-sm leading-relaxed text-slate-700">{tt('schoolrewards.roster_help', 'AlloFlow classroom rosters use codenames and hold no student names or emails by design; School Rewards needs managed Google identities. This bridge exports your groups as a roster template (group as homeroom, codename as a cross-reference) that an administrator completes from the SIS before importing it in the portal. Nothing is sent anywhere by this step.')}</p>
    {!roster || !roster.groups.length ? <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700" role="status">{tt('schoolrewards.roster_none', 'No classroom roster key was found on this device. Build groups in the Roster Key first, then re-read.')}</p> : <>
      <ul className="mt-3 list-none space-y-2 p-0">
        {roster.groups.map((group) => <li key={group.id || '__unassigned'}>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-800"><input type="checkbox" className="h-5 w-5 accent-emerald-700" checked={selected.has(group.id)} onChange={() => toggle(group.id)} data-help-key="schoolrewards_roster_group" />{group.name} <span className="font-normal text-slate-600">({group.codenames.length} {group.codenames.length === 1 ? tt('schoolrewards.roster_learner', 'learner') : tt('schoolrewards.roster_learners', 'learners')})</span></label>
        </li>)}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={SR_BTN_SECONDARY} onClick={download} disabled={!count} data-help-key="schoolrewards_roster_download">{tt('schoolrewards.roster_download', 'Download roster template CSV')}{count ? ' (' + count + ')' : ''}</button>
        {done && <span className="text-xs text-slate-700" role="status">{done}</span>}
      </div>
    </>}
  </section>;
}

// Theme support (2026-09-02). The hub tools are Tailwind-utility styled and the
// app's theme is an ancestor class (theme-dark / theme-contrast), not the OS
// preference, so the overrides are scoped to this panel's root and win on
// specificity. Pairs are pinned >= 4.5:1 in the panel tests.
const SR_THEME_STYLES = `
X .bg-white{background:#162032!important}
X .bg-slate-50,X .bg-slate-100{background:#111a2b!important}
X .bg-gradient-to-r,X .bg-sky-50{background:#14233d!important}
X .bg-emerald-50\\/60{background:#0f2a1f!important}
X .bg-amber-50{background:#3a2c08!important}
X .bg-rose-50{background:#3d1520!important}
X .bg-slate-200{background:#2a3650!important}
X .text-slate-900,X .text-slate-800,X .text-slate-700,X .text-emerald-900,X .text-emerald-800{color:#e6ebf5!important}
X .text-slate-600{color:#aab6c8!important}
X .text-rose-950{color:#ffb3c0!important}
X .text-sky-950{color:#cfe0ff!important}
X .text-amber-950,X .text-amber-900{color:#ffe9b8!important}
X .underline{color:#8ab4ff!important}
X .border-slate-200,X .border-slate-300,X .border-slate-400,X .border-emerald-200,X .border-emerald-300{border-color:#34405a!important}
X .border-emerald-700{border-color:#3ecf8e!important}
X .border-rose-200{border-color:#a03a4d!important}
X .border-sky-200{border-color:#365a99!important}
X .border-amber-300,X .border-amber-500{border-color:#8a6a1a!important}
X .bg-emerald-700{background:#157347!important;color:#fff!important}
X .hover\\:bg-emerald-50:hover,X .hover\\:bg-slate-50:hover,X .hover\\:bg-slate-100:hover{background:#1b2740!important}
X input,X textarea{background:#0f172a!important;color:#e6ebf5!important;border-color:#4a5a78!important}
X code{background:#1b2740!important;color:#e6ebf5!important}
Y .bg-white,Y .bg-slate-50,Y .bg-slate-100,Y .bg-gradient-to-r,Y .bg-sky-50,Y .bg-emerald-50\\/60,Y .bg-amber-50,Y .bg-rose-50,Y .bg-slate-200,Y input,Y textarea,Y code{background:#000!important;color:#fff!important}
Y [class*="text-"]{color:#fff!important}
Y .underline{color:#fbbf24!important}
Y [class*="border-"]{border-color:#fff!important;border-width:2px}
Y .border-rose-200,Y .border-sky-200,Y .border-amber-300,Y .border-amber-500,Y .border-emerald-700{border-color:#fbbf24!important}
Y .bg-emerald-700{background:#fbbf24!important;color:#000!important}
Y .hover\\:bg-emerald-50:hover,Y .hover\\:bg-slate-50:hover,Y .hover\\:bg-slate-100:hover{background:#1a1a1a!important}
Y .accent-emerald-700{accent-color:#fbbf24}
Y button:focus-visible,Y input:focus-visible,Y textarea:focus-visible,Y a:focus-visible{outline:3px solid #fbbf24!important;outline-offset:2px}
`.replace(/\bX\b/g, '.theme-dark .sr-root').replace(/\bY\b/g, '.theme-contrast .sr-root');

// Recognition worksheet (2026-09-02). AlloFlow's live class session records
// recognition tokens against codenames; School Rewards awards against managed
// identities. The host summarises the active session (codename, reasons,
// counts) and the panel turns it into a worksheet the teacher awards from in
// the portal, one student or one group at a time. Codenames only; no names
// or emails exist on this side to leak.
function srRecognitionCsv(recognition) {
  const rows = [['alloflowCodename', 'tokens', 'sessions', 'reasons', 'lastRecognizedAt']];
  ((recognition && recognition.rows) || []).forEach((row) => {
    rows.push([row.codename, String(row.total), String(row.sessions || 1), (row.reasons || []).map((r) => r.label + ' x' + r.count).join('; '), row.lastAt ? new Date(row.lastAt).toISOString() : '']);
  });
  return rows.map((row) => row.map(srCsvCell).join(',')).join('\r\n') + '\r\n';
}

function srRecognitionText(recognition) {
  const rows = (recognition && recognition.rows) || [];
  if (!rows.length) return '';
  return ['School Rewards worksheet from AlloFlow session ' + (recognition.sessionCode || '') + ' (codenames; award in the portal)']
    .concat(rows.map((row) => row.codename + ': ' + row.total + ' token' + (row.total === 1 ? '' : 's') + ' (' + (row.reasons || []).map((r) => r.label + ' x' + r.count).join(', ') + ')'))
    .join('\n');
}

function SrRecognitionWorksheet({ recognition, tt, addToast }) {
  const rows = (recognition && Array.isArray(recognition.rows)) ? recognition.rows : [];
  const [copied, setCopied] = React.useState(false);
  const download = () => {
    try {
      const blob = new Blob([srRecognitionCsv(recognition)], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'school-rewards-recognition-worksheet.csv';
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (_) { addToast(tt('schoolrewards.worksheet_download_failed', 'The worksheet could not be downloaded in this window.'), 'error'); }
  };
  const copy = async () => {
    if (await srCopyText(srRecognitionText(recognition))) { setCopied(true); window.setTimeout(() => setCopied(false), 2000); return; }
    addToast(tt('schoolrewards.worksheet_copy_failed', 'Clipboard is blocked here. Download the CSV instead.'), 'info');
  };
  return <section aria-labelledby="schoolrewards-worksheet-title" className="rounded-2xl border border-slate-200 bg-white p-4" data-help-key="schoolrewards_recognition_worksheet">
    <h3 id="schoolrewards-worksheet-title" className="text-base font-black text-slate-900">{tt('schoolrewards.worksheet_title', 'Recognition worksheet')}</h3>
    <p className="mt-1 text-sm leading-relaxed text-slate-700">{tt('schoolrewards.worksheet_help', 'Recognition given during the live class session, by codename. Award it in the portal: pick the student, or use a group award when the reason is the same. Nothing here is sent to the ledger automatically.')}</p>
    {!rows.length ? <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700" role="status">{tt('schoolrewards.worksheet_none', recognition && recognition.sessionCode ? 'No recognition has been recorded in the active session yet.' : 'Start a class session and recognise students in AlloHaven; the worksheet fills in here and keeps the last sessions on this device.')}</p> : <>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="text-xs font-black text-slate-700"><th className="py-1 pr-3">{tt('schoolrewards.worksheet_codename', 'Codename')}</th><th className="py-1 pr-3">{tt('schoolrewards.worksheet_tokens', 'Tokens')}</th><th className="py-1 pr-3">{tt('schoolrewards.worksheet_sessions', 'Sessions')}</th><th className="py-1">{tt('schoolrewards.worksheet_reasons', 'Reasons')}</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.codename} className="border-t border-slate-200 text-slate-800" data-help-key="schoolrewards_worksheet_row"><td className="py-1 pr-3 font-bold">{row.codename}</td><td className="py-1 pr-3">{row.total}</td><td className="py-1 pr-3">{row.sessions || 1}</td><td className="py-1">{(row.reasons || []).map((r) => r.label + ' \u00d7' + r.count).join(', ')}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={SR_BTN_SECONDARY} onClick={download} data-help-key="schoolrewards_worksheet_download">{tt('schoolrewards.worksheet_download', 'Download worksheet CSV')}</button>
        <button type="button" className={SR_BTN_QUIET} onClick={copy} data-help-key="schoolrewards_worksheet_copy">{copied ? tt('schoolrewards.worksheet_copied', 'Copied') : tt('schoolrewards.worksheet_copy', 'Copy as text')}</button>
        <span className="text-xs text-slate-600">{recognition.sessionCode ? tt('schoolrewards.worksheet_session', 'Live session ') + recognition.sessionCode : tt('schoolrewards.worksheet_no_live', 'No live session')}{recognition.sessionCount > 1 ? ' · ' + recognition.sessionCount + tt('schoolrewards.worksheet_sessions_kept', ' sessions kept on this device') : ''}</span>
      </div>
    </>}
  </section>;
}

function SchoolRewardsPanel(props) {
  const { onClose, t, onSavePortalUrl, onOpenPortal } = props;
  const addToast = typeof props.addToast === 'function' ? props.addToast : () => {};
  const tt = React.useMemo(() => srMakeTt(t), [t]);
  const [portalUrl, setPortalUrl] = React.useState(() => typeof props.portalUrl === 'string' ? srNormalizePortalUrl(props.portalUrl) : srReadLocalPortalUrl());
  React.useEffect(() => { if (typeof props.portalUrl === 'string') setPortalUrl(srNormalizePortalUrl(props.portalUrl)); }, [props.portalUrl]);
  const connected = Boolean(portalUrl);
  const [setup, setSetup] = React.useState(() => srReadSetup());
  const lastWrittenSetup = React.useRef(setup);
  const [setupSaveFailed, setSetupSaveFailed] = React.useState(false);
  const persistSetup = value => {
    const saved = srWriteSetup(value);
    if (saved) lastWrittenSetup.current = value;
    setSetupSaveFailed(!saved);
    return saved;
  };
  React.useEffect(() => { if (lastWrittenSetup.current !== setup) persistSetup(setup); }, [setup]);
  const [path, setPath] = React.useState(() => SR_PATHS.includes(props.initialPath) ? props.initialPath : (portalUrl ? 'join' : ''));
  const [guideOpen, setGuideOpen] = React.useState(() => props.initialGuide === true && SR_PATHS.includes(props.initialPath));
  const [guideIndex, setGuideIndex] = React.useState(0);
  const [focusTarget, setFocusTarget] = React.useState('');
  const guide = React.useMemo(() => typeof createSchoolStoreSetupGuide === 'function' ? createSchoolStoreSetupGuide() : null, []);
  const troubleshooting = guide && typeof guide.getTroubleshooting === 'function' ? guide.getTroubleshooting() : [];
  const guidePath = guide && guide.getPath(path);
  const guideStep = guidePath && guidePath.steps[Math.min(guideIndex, guidePath.steps.length - 1)];
  const [setupRoute, setSetupRoute] = React.useState('guided');
  const [showSetup, setShowSetup] = React.useState(() => props.initialPath === 'setup');
  const lastHostPath = React.useRef({ path: props.initialPath, guide: props.initialGuide, serial: props.guideRequestSerial });
  React.useEffect(() => {
    if (lastHostPath.current.path === props.initialPath && lastHostPath.current.guide === props.initialGuide && lastHostPath.current.serial === props.guideRequestSerial) return;
    lastHostPath.current = { path: props.initialPath, guide: props.initialGuide, serial: props.guideRequestSerial };
    const next = SR_PATHS.includes(props.initialPath) ? props.initialPath : (portalUrl ? 'join' : '');
    setPath(next); setGuideIndex(0); setGuideOpen(props.initialGuide === true && !!next); if (next === 'setup') setShowSetup(true);
    setFocusTarget(next ? (props.initialGuide === true ? 'sr-local-guide' : 'sr-path-heading') : 'sr-path-choices');
  }, [props.initialPath, props.initialGuide, props.guideRequestSerial, portalUrl]);
  const [urlDraft, setUrlDraft] = React.useState(portalUrl);
  React.useEffect(() => { setUrlDraft(portalUrl); }, [portalUrl]);
  const [urlMessage, setUrlMessage] = React.useState({ text: '', tone: 'info' });
  const urlDirty = String(urlDraft || '').trim() !== portalUrl;
  const [launchAttempt, setLaunchAttempt] = React.useState(null);
  React.useEffect(() => { setLaunchAttempt(null); }, [urlDraft, portalUrl]);
  const launchTarget = kind => !urlDirty && portalUrl && srNormalizePortalUrl(portalUrl) === portalUrl
    && Object.prototype.hasOwnProperty.call(SR_LAUNCH_SUFFIXES, kind) ? portalUrl + SR_LAUNCH_SUFFIXES[kind] : '';
  const fallbackTarget = launchAttempt && launchAttempt.baseUrl === portalUrl ? launchTarget(launchAttempt.kind) : '';
  const [snippetState, setSnippetState] = React.useState('idle');
  const dialogRef = React.useRef(null);
  React.useEffect(() => {
    if (!focusTarget) return;
    const target = dialogRef.current && Array.from(dialogRef.current.querySelectorAll('[id]')).find(node => node.id === focusTarget);
    if (target && !target.closest('[hidden]')) { target.focus(); if (typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'nearest' }); }
    setFocusTarget('');
  }, [focusTarget, path, showSetup, setupRoute, guideOpen, guideIndex]);
  const choosePath = next => {
    if (!SR_PATHS.includes(next)) return;
    setPath(next); setGuideIndex(0); if (next === 'setup') setShowSetup(true); setFocusTarget(guideOpen ? 'sr-local-guide' : 'sr-path-heading');
  };
  const focusGuideSection = () => {
    const target = guideStep && Object.prototype.hasOwnProperty.call(SR_GUIDE_TARGETS, guideStep.target) && SR_GUIDE_TARGETS[guideStep.target];
    if (!target) return;
    if (path === 'setup') { setShowSetup(true); setSetupRoute(guideStep.target === 'handoff' ? 'it' : 'guided'); }
    setFocusTarget(target);
  };

  const completed = React.useMemo(() => {
    const set = new Set(setup.steps);
    if (connected) set.add('connected'); else set.delete('connected');
    if (!connected || setup.verifiedPortalUrl !== portalUrl) set.delete('verified');
    return set;
  }, [setup.steps, setup.verifiedPortalUrl, connected, portalUrl]);
  const doneCount = SR_STEP_ORDER.filter((step) => completed.has(step)).length;
  const nextStep = SR_STEP_ORDER.find((step) => !completed.has(step));
  const setStep = React.useCallback((step, on) => {
    setSetup((current) => {
      const steps = current.steps.filter((item) => item !== step);
      if (on) steps.push(step);
      return Object.assign({}, current, { steps }, step === 'verified' ? { verifiedPortalUrl: on ? portalUrl : '' } : {});
    });
  }, [portalUrl]);
  const setForm = React.useCallback((key, value) => {
    setSetup((current) => Object.assign({}, current, { form: Object.assign({}, current.form, { [key]: value }) }));
  }, []);
  const form = setup.form || {};
  const snippet = React.useMemo(() => srSetupSnippet(form), [form]);

  const savePortalUrl = (value, remove = false) => {
    const raw = String(value || '').trim();
    if (!raw && !remove) { setUrlMessage({ text: tt('schoolrewards.url_blank', 'Enter the approved Store address. To remove a saved address, use Disconnect on this device.'), tone: 'error', invalid: true }); return; }
    if (raw && !srNormalizePortalUrl(raw)) { setUrlMessage({ text: tt('schoolrewards.url_invalid', 'Use the HTTPS Apps Script deployment URL ending in /macros/s/{deployment}/exec.'), tone: 'error', invalid: true }); return; }
    if (typeof onSavePortalUrl === 'function') {
      let result;
      try { result = onSavePortalUrl(raw); } catch (_) { setUrlMessage({ text: tt('schoolrewards.url_save_failed', 'This browser could not save the launcher URL.'), tone: 'error' }); return; }
      if (result && result.ok === false) { setUrlMessage({ text: result.error || tt('schoolrewards.url_invalid', 'Use the HTTPS Apps Script deployment URL ending in /macros/s/{deployment}/exec.'), tone: 'error' }); return; }
      if (!result || result.ok !== true || typeof result.url !== 'string' || typeof result.then === 'function') { setUrlMessage({ text: tt('schoolrewards.url_save_unconfirmed', 'Saving this address was not confirmed. The previous destination was kept; try again or discard your changes.'), tone: 'error' }); return; }
      const saved = srNormalizePortalUrl(result.url);
      if (saved !== srNormalizePortalUrl(raw) || (result.url !== '' && !saved)) { setUrlMessage({ text: tt('schoolrewards.url_save_unconfirmed', 'Saving this address was not confirmed. The previous destination was kept; try again or discard your changes.'), tone: 'error' }); return; }
      setPortalUrl(saved); setUrlDraft(saved); setLaunchAttempt(null);
      setUrlMessage({ text: saved ? tt('schoolrewards.url_saved', 'Launcher saved on this device. Open the deployment check to confirm the portal answers.') : tt('schoolrewards.url_cleared', 'Launcher removed from this device.'), tone: 'info' });
      return;
    }
    const normalized = raw ? srNormalizePortalUrl(raw) : '';
    if (raw && !normalized) { setUrlMessage({ text: tt('schoolrewards.url_invalid', 'Use the HTTPS Apps Script deployment URL ending in /macros/s/{deployment}/exec.'), tone: 'error' }); return; }
    try { if (normalized) window.localStorage.setItem(SR_PORTAL_URL_KEY, normalized); else window.localStorage.removeItem(SR_PORTAL_URL_KEY); } catch (_) { setUrlMessage({ text: tt('schoolrewards.url_save_failed', 'This browser could not save the launcher URL.'), tone: 'error' }); return; }
    setPortalUrl(normalized); setUrlDraft(normalized); setLaunchAttempt(null);
    setUrlMessage({ text: normalized ? tt('schoolrewards.url_saved', 'Launcher saved on this device. Open the deployment check to confirm the portal answers.') : tt('schoolrewards.url_cleared', 'Launcher removed from this device.'), tone: 'info' });
  };

  const openWindow = (kind, useHost = false) => {
    const target = launchTarget(kind);
    if (!target) return false;
    try {
      // noopener can return null even when a new tab opens. No page visibility,
      // Google authorization or successful navigation can be inferred here.
      const dispatched = useHost && typeof onOpenPortal === 'function' ? onOpenPortal() !== false : (window.open(target, '_blank', 'noopener,noreferrer'), true);
      setLaunchAttempt({ baseUrl: portalUrl, kind, dispatched });
      return dispatched;
    } catch (_) { setLaunchAttempt({ baseUrl: portalUrl, kind, dispatched: false }); return false; }
  };
  const openPortal = () => {
    openWindow('portal', true);
  };
  const openRecognition = () => {
    // Navigation only: no identities, transcript, amount or reason cross this boundary.
    openWindow('recognition');
  };
  // Code.gs answers ?api=status with a plain-language check page (and
  // ?api=health with JSON), but only for a signed-in domain account, so the
  // check opens in the browser rather than being fetched from this frame.
  const [healthHint, setHealthHint] = React.useState(false);
  const previousPortalUrl = React.useRef(portalUrl);
  React.useEffect(() => {
    const changed = previousPortalUrl.current !== portalUrl;
    previousPortalUrl.current = portalUrl;
    if (changed) setHealthHint(false);
    setSetup(current => current.steps.includes('verified') && (changed || !portalUrl || current.verifiedPortalUrl !== portalUrl)
      ? Object.assign({}, current, { steps: current.steps.filter(step => step !== 'verified'), verifiedPortalUrl: '' }) : current);
  }, [portalUrl]);
  const editUrl = value => {
    setUrlDraft(value); setUrlMessage({ text: '', tone: 'info' }); setLaunchAttempt(null);
    if (srNormalizePortalUrl(value) !== portalUrl) { setStep('verified', false); setHealthHint(false); }
  };
  const discardUrl = () => {
    setUrlDraft(portalUrl); setUrlMessage({ text: tt('schoolrewards.url_discarded', 'Unsaved address changes discarded. The saved destination was not changed.'), tone: 'info' });
    setLaunchAttempt(null); setHealthHint(false); setFocusTarget('schoolrewards-portal-url');
  };
  const openHealth = () => {
    if (!launchTarget('check')) return;
    setHealthHint(openWindow('check'));
  };
  const copySnippet = async () => {
    if (await srCopyText(snippet)) { setSnippetState('copied'); window.setTimeout(() => setSnippetState('idle'), 2400); return; }
    setSnippetState('manual');
    addToast(tt('schoolrewards.snippet_copy_failed', 'Clipboard is blocked here. Select the setup function text and press Ctrl+C.'), 'info');
  };

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    const previousFocus = document.activeElement;
    const trapStack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
    const trap = { root: dialog };
    trapStack.push(trap);
    const isTopTrap = () => trapStack[trapStack.length - 1] === trap;
    const getFocusable = () => Array.from(dialog.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])'
    )).filter((el) => {
      if (el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
      for (let parent = el.parentElement; parent && parent !== dialog; parent = parent.parentElement) {
        if (parent.tagName === 'DETAILS' && !parent.open) {
          const summary = Array.from(parent.children).find(child => child.tagName === 'SUMMARY');
          if (!summary || !summary.contains(el)) return false;
        }
      }
      return true;
    });
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

  const stepLabels = {
    approval: tt('schoolrewards.next_approval', 'Confirm district review and the managed account.'),
    project: tt('schoolrewards.next_project', 'Open script.new and create the private Apps Script project.'),
    code: tt('schoolrewards.next_code', 'Copy Code.gs into the project.'),
    portal: tt('schoolrewards.next_portal', 'Add the Portal page.'),
    index: tt('schoolrewards.next_index', 'Add the Index page.'),
    manifest: tt('schoolrewards.next_manifest', 'Replace the appsscript.json manifest.'),
    setup: tt('schoolrewards.next_setup', 'Run the one-time repository setup.'),
    deployed: tt('schoolrewards.next_deployed', 'Deploy as a domain-restricted web app.'),
    connected: tt('schoolrewards.next_connected', 'Paste the deployment URL and connect.'),
    verified: tt('schoolrewards.next_verified', 'Open the deployment check and verify each role.'),
  };
  const stepCard = (step, title, body, children) => {
    const done = completed.has(step);
    const derived = step === 'connected';
    const number = SR_STEP_ORDER.indexOf(step) + 1;
    const inputId = 'sr-step-' + step;
    return <li key={step} id={'sr-card-' + step} tabIndex={-1} className={'rounded-2xl border p-4 focus:outline-none focus:ring-2 focus:ring-emerald-600 ' + (done ? 'border-emerald-300 bg-emerald-50/60' : (nextStep === step ? 'border-emerald-700 bg-white shadow-sm' : 'border-slate-200 bg-white'))} data-help-key={'schoolrewards_step_' + step}>
      <div className="flex items-start gap-3">
        <input id={inputId} type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-emerald-700" checked={done} disabled={derived} onChange={derived ? undefined : (event) => setStep(step, event.target.checked)} aria-describedby={inputId + '-body'} />
        <div className="min-w-0 flex-1">
          <label htmlFor={inputId} className={'block text-base font-black ' + (done ? 'text-emerald-900 line-through decoration-2' : 'text-slate-900')}>{number}. {title}</label>
          <p id={inputId + '-body'} className="mt-1 text-sm leading-relaxed text-slate-700">{body}</p>
          {children}
        </div>
      </div>
    </li>;
  };
  const fileCard = (file, title, body) => stepCard(file.step, title, body, <SrCopySource file={file} tt={tt} onCopied={() => setStep(file.step, true)} />);
  const portalUrlForm = <form className="mt-3" noValidate onSubmit={event => { event.preventDefault(); savePortalUrl(urlDraft); }}>
    <label htmlFor="schoolrewards-portal-url" className="block text-xs font-black text-slate-800">{tt('schoolrewards.approved_url_label', 'Approved school Store address')}</label>
    <div className="mt-1 flex flex-col gap-2 sm:flex-row">
      <input id="schoolrewards-portal-url" className={SR_INPUT} type="url" inputMode="url" autoComplete="off" spellCheck={false} value={urlDraft} onChange={event => editUrl(event.target.value)} placeholder="https://script.google.com/macros/s/.../exec" aria-describedby="schoolrewards-portal-url-help" aria-invalid={urlMessage.invalid === true ? 'true' : undefined} />
      <button type="submit" className={SR_BTN_PRIMARY + ' shrink-0'} data-help-key="schoolrewards_connect">{tt('schoolrewards.save_address', 'Save address')}</button>
      {urlDirty && <button type="button" className={SR_BTN_QUIET + ' shrink-0'} onClick={discardUrl} data-help-key="schoolrewards_discard_address">{tt('schoolrewards.discard_address', 'Discard changes')}</button>}
    </div>
    <p id="schoolrewards-portal-url-help" className={'mt-2 text-xs leading-relaxed ' + (urlMessage.tone === 'error' ? 'text-rose-900' : 'text-slate-700')} role={urlMessage.text ? 'status' : undefined}>{urlMessage.text || tt('schoolrewards.url_help', 'Only an HTTPS script.google.com address ending in /macros/s/{deployment}/exec is accepted.')}</p>
  </form>;

  return <div className="sr-root fixed inset-0 z-[260] flex items-center justify-center bg-slate-900/60 p-3 sm:p-6" style={{ zIndex: 260 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <style>{SR_THEME_STYLES}</style>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="schoolrewards-title" aria-describedby="schoolrewards-subtitle" tabIndex={-1} className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl focus:outline-none">
      <header className="border-b border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-teal-50 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <h2 id="schoolrewards-title" className="flex items-center gap-2 text-xl font-black text-slate-900"><span aria-hidden="true">{'🎟️'}</span> {tt('schoolrewards.title', 'School Rewards & Store')}</h2>
        <div className="flex shrink-0 items-center gap-2">
          <a className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600" href="https://alloflow-cdn.pages.dev/school-rewards-manual" target="_blank" rel="noopener noreferrer" data-help-key="schoolrewards_manual">{tt('schoolrewards.manual', 'Manual')}</a>
          <button type="button" onClick={onClose} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-xl text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600" aria-label={tt('schoolrewards.close', 'Close School Rewards & Store')}>{'✕'}</button>
        </div>
        </div>
        <p id="schoolrewards-subtitle" className="mt-2 text-sm text-slate-700">{tt('schoolrewards.path_subtitle', 'Practice with fictional data, join your school’s Store, or set up a shared rewards ledger.')}</p>
      </header>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {setupSaveFailed && <div className="rounded-xl border border-amber-500 bg-amber-50 p-4 text-sm text-amber-950" role="status" data-help-key="schoolrewards_persistence_warning">
          <p>{tt('schoolrewards.setup_local_only', 'Your latest checklist and form changes are kept in this tab only. Local saving failed; closing this tab may lose those changes. Your approvals were not changed.')}</p>
          <button type="button" className={SR_BTN_SECONDARY + ' mt-2'} onClick={() => persistSetup(setup)} data-help-key="schoolrewards_retry_setup_save">{tt('schoolrewards.retry_setup_save', 'Retry saving')}</button>
        </div>}
        <section aria-labelledby="sr-path-choices" data-help-key="schoolrewards_paths">
          <h3 id="sr-path-choices" tabIndex={-1} className="text-base font-black text-slate-900">{tt('schoolrewards.choose_path', 'What would you like to do?')}</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {[['practice', 'Try demo'], ['join', 'Join existing Store'], ['setup', 'Set up school Store']].map(([id, label]) => <button key={id} type="button" className={path === id ? SR_BTN_PRIMARY : SR_BTN_SECONDARY} aria-pressed={path === id} onClick={() => choosePath(id)} data-store-path={id}>{tt('schoolrewards.path_' + id, label)}</button>)}
          </div>
          {!path && <p className="mt-3 text-sm text-slate-700">{tt('schoolrewards.choose_path_help', 'Teachers usually join their existing school Store. A district-approved administrator sets up the shared Store once.')}</p>}
        </section>
        {path && <section aria-labelledby="sr-path-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="sr-path-heading" tabIndex={-1} className="text-base font-black text-slate-900">{guidePath ? guidePath.title : path === 'practice' ? 'Try the demo' : path === 'join' ? 'Join existing Store' : 'Set up school Store'}</h3>
            <button type="button" className={SR_BTN_SECONDARY} disabled={!guidePath} aria-expanded={guideOpen} aria-controls="sr-local-guide" onClick={() => { setGuideOpen(value => !value); setFocusTarget(guideOpen ? 'sr-path-heading' : 'sr-local-guide'); }} data-help-key="schoolrewards_guide">{tt('schoolrewards.guide_me', 'Guide me')}</button>
          </div>
          <p className="mt-2 text-sm text-slate-700">{guidePath ? guidePath.intro : tt('schoolrewards.guide_unavailable', 'The local guide is unavailable in this version. Use the controls below or the manual.')}</p>
          {guideOpen && guideStep && <section id="sr-local-guide" tabIndex={-1} aria-labelledby="sr-guide-title" className="mt-3 rounded-xl border border-sky-300 bg-sky-50 p-4 focus:outline-none focus:ring-2 focus:ring-emerald-600">
            <p className="text-xs font-bold text-slate-700" aria-live="polite">{tt('schoolrewards.guide_step', 'Guide step')} {guideIndex + 1} / {guidePath.steps.length}</p>
            <h4 id="sr-guide-title" className="mt-1 text-base font-black text-slate-900">{guideStep.title}</h4>
            <p className="mt-2 text-sm text-slate-800">{guideStep.body}</p>
            <p className="mt-2 text-xs text-slate-700">{tt('schoolrewards.guide_local_only', 'Local guidance only. Next does not save, approve, verify, or complete any step.')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={SR_BTN_QUIET} disabled={guideIndex === 0} onClick={() => { setGuideIndex(index => index - 1); setFocusTarget('sr-local-guide'); }} data-help-key="schoolrewards_guide_back">{tt('schoolrewards.guide_back', 'Back')}</button>
              <button type="button" className={SR_BTN_PRIMARY} onClick={focusGuideSection} disabled={!Object.prototype.hasOwnProperty.call(SR_GUIDE_TARGETS, guideStep.target)} data-help-key="schoolrewards_guide_section">{tt('schoolrewards.guide_section', 'Show this section')}</button>
              <button type="button" className={SR_BTN_QUIET} disabled={guideIndex === guidePath.steps.length - 1} onClick={() => { setGuideIndex(index => index + 1); setFocusTarget('sr-local-guide'); }} data-help-key="schoolrewards_guide_next">{tt('schoolrewards.guide_next', 'Next')}</button>
              <a className={SR_BTN_QUIET} href={SR_CDN_BASE + 'school-rewards-manual' + (/^[a-z0-9-]+$/.test(guideStep.manualHash) ? '#' + guideStep.manualHash : '')} target="_blank" rel="noopener noreferrer">{tt('schoolrewards.guide_manual', 'Read this in the manual')}</a>
            </div>
          </section>}
        </section>}
        {path === 'practice' && <section id="sr-path-practice" tabIndex={-1} aria-labelledby="sr-practice-title" className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <h3 id="sr-practice-title" className="text-base font-black text-slate-900">{tt('schoolrewards.practice_title', 'Fictional practice, no school setup')}</h3>
          <p className="mt-2 text-sm text-slate-800">{tt('schoolrewards.practice_help', 'The real portal running on a fictional ledger in your browser: award, undo, group awards, checkout, and the student view, with a role switcher, scenario presets, and a tour you can edit. Nothing reaches a real ledger.')}</p>
          <a className={SR_BTN_PRIMARY + ' mt-3'} href="https://alloflow-cdn.pages.dev/school-rewards-practice" target="_blank" rel="noopener noreferrer" data-help-key="schoolrewards_practice">{tt('schoolrewards.practice', 'Practice with fictional data')}</a>
          <p className="mt-3 text-xs text-slate-700">{tt('schoolrewards.local_demo_separate', 'The separate local guided demo is optional and needs its presentation server running. It is not the public practice link. See the manual for that walkthrough; do not use real student data in either demo.')}</p>
        </section>}
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-950" role="note">
          <strong>{tt('schoolrewards.boundary_title', 'Student-data boundary:')}</strong> {tt('schoolrewards.launcher_boundary_body', 'This Store launcher stores its address and setup checklist on this device; it does not copy the school ledger. Classroom tools may separately keep codename-based class state. Names, managed emails, balances and Store roles belong in the school-managed repository. The Store stays separate from AlloHaven XP.')}
        </div>

        {(path === 'join' || path === 'setup') && <section id="sr-path-launch" tabIndex={-1} aria-labelledby="schoolrewards-launch-title" className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-teal-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="schoolrewards-launch-title" className="text-base font-black text-slate-900">{tt('schoolrewards.launch_title', 'Launch')}</h3>
            <span className={'rounded-full px-3 py-1 text-xs font-black ' + (connected ? 'bg-emerald-700 text-white' : 'border border-amber-500 bg-white text-amber-900')} data-help-key="schoolrewards_status">{connected ? tt('schoolrewards.status_address_saved', 'Store address saved') : tt('schoolrewards.status_no_address', 'No Store address saved')}</span>
          </div>
          {urlDirty && <div className="mt-3 rounded-xl border border-amber-500 bg-amber-50 p-3 text-sm text-amber-950" role="status" data-help-key="schoolrewards_unsaved_address">
            <p>{tt('schoolrewards.unsaved_address', 'You have unsaved address changes. Save or discard them before opening, checking or sharing the Store. The saved destination has not changed.')}</p>
            <button type="button" className={SR_BTN_QUIET + ' mt-2'} onClick={() => { if (path === 'setup') setShowSetup(true); setFocusTarget('schoolrewards-portal-url'); }} data-help-key="schoolrewards_review_address">{tt('schoolrewards.review_address', 'Review address changes')}</button>
          </div>}
          {connected ? <div className="mt-3 space-y-3">
            <label htmlFor="schoolrewards-saved-url" className="block text-xs font-black text-slate-800">{tt('schoolrewards.saved_url', 'Saved deployment')}</label>
            <input id="schoolrewards-saved-url" className={SR_INPUT + ' font-mono text-xs'} readOnly value={portalUrl} onFocus={(event) => event.target.select()} />
            <div className="flex flex-wrap gap-2">
              <button type="button" className={SR_BTN_PRIMARY} onClick={openPortal} disabled={urlDirty} data-help-key="schoolrewards_open_portal">{tt('schoolrewards.open_portal', 'Open School Rewards portal')}</button>
              <button type="button" className={SR_BTN_SECONDARY} onClick={openRecognition} disabled={urlDirty} data-help-key="schoolrewards_open_recognition">{tt('schoolrewards.open_recognition', 'Open recognition')}</button>
              <button id="sr-path-check" type="button" className={SR_BTN_SECONDARY} onClick={openHealth} disabled={urlDirty} data-help-key="schoolrewards_open_check">{tt('schoolrewards.open_check', 'Open deployment check')}</button>
              <button type="button" className={SR_BTN_QUIET} onClick={() => savePortalUrl('', true)} data-help-key="schoolrewards_disconnect">{tt('schoolrewards.disconnect', 'Disconnect on this device')}</button>
            </div>
            {path === 'setup' && !urlDirty && <SrShareWithStaff portalUrl={portalUrl} tt={tt} addToast={addToast} />}
            <p className="text-xs leading-relaxed text-slate-700">{tt('schoolrewards.launch_help', 'The portal opens in a new tab under Google sign-in; server-side roles decide who can award, check out, or administer. The deployment check page should say "Deployment check passed" and show the school, domain, and your role.')}</p>
          </div> : <p id="sr-path-check" tabIndex={-1} className="mt-2 text-sm leading-relaxed text-slate-700">{tt('schoolrewards.get_approved_address', 'Ask your school administrator for the approved Store address and your staff or cashier access. Save the address here, then open it with your managed school account. Saving does not grant access or verify the deployment.')}</p>}
          {path === 'join' && portalUrlForm}
          {fallbackTarget && <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-slate-900" role="status" data-help-key="schoolrewards_launch_feedback">
            <p>{launchAttempt.dispatched
              ? tt('schoolrewards.launch_unconfirmed', 'An opening request was sent to your browser. AlloFlow cannot confirm whether a new tab opened or whether Google allowed access.')
              : tt('schoolrewards.launch_rejected', 'The opening request could not be dispatched. No Store access or deployment result was verified.')}</p>
            <a className={SR_BTN_SECONDARY + ' mt-2'} href={fallbackTarget} target="_blank" rel="noopener noreferrer" data-help-key="schoolrewards_launch_fallback">{launchAttempt.kind === 'check' ? tt('schoolrewards.direct_check', 'Open deployment check directly') : launchAttempt.kind === 'recognition' ? tt('schoolrewards.direct_recognition', 'Open recognition directly') : tt('schoolrewards.direct_store', 'Open saved Store directly')}</a>
            <p className="mt-2 text-xs">{tt('schoolrewards.launch_fallback_help', 'If nothing appeared, try the direct link. Use your managed school account; contact your administrator if access is denied.')}</p>
          </div>}
          <p className="mt-3 text-xs leading-relaxed text-slate-700">{tt('schoolrewards.address_is_not_verification', 'A saved address is not a connection test. Read the separate deployment check; AlloFlow and AlloBot cannot see or certify that Google page.')}</p>
          {healthHint && <p className="mt-2 text-xs text-slate-800" role="status" data-help-key="schoolrewards_health_hint">{tt('schoolrewards.health_self_check', 'Read the check in the separate tab and confirm the expected school and role. No verification box was changed automatically.')}</p>}
          {Array.isArray(troubleshooting) && troubleshooting.length > 0 && <details className="mt-3 rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900" data-help-key="schoolrewards_opening_help">
            <summary className="min-h-11 cursor-pointer py-2 font-bold">{tt('schoolrewards.opening_help', 'Help opening your Store')}</summary>
            <p className="mt-2 text-xs text-slate-700">{tt('schoolrewards.opening_help_local', 'General local guidance, not a diagnosis of your Google account or Store. Nothing is checked or sent by opening these notes.')}</p>
            {troubleshooting.filter(item => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.body === 'string' && /^[a-z0-9-]+$/.test(item.manualHash)).map(item => <details key={item.id} className="mt-2 border-t border-slate-200 pt-2" data-help-key="schoolrewards_troubleshooting_item">
              <summary className="min-h-11 cursor-pointer py-2 font-bold">{item.title}</summary>
              <p className="mt-2 leading-relaxed">{item.body}</p>
              <a className="mt-2 inline-flex min-h-11 items-center font-bold text-emerald-900 underline" href={SR_CDN_BASE + 'school-rewards-manual#' + item.manualHash} target="_blank" rel="noopener noreferrer">{tt('schoolrewards.guide_manual', 'Read this in the manual')}</a>
            </details>)}
          </details>}
          {path === 'join' && <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-slate-900" data-help-key="schoolrewards_voice_boundary">
            <h4 className="font-black">{tt('schoolrewards.voice_boundary_title', 'Voice awards belong inside the signed-in Store')}</h4>
            <p className="mt-2">{tt('schoolrewards.voice_boundary_body', 'Open recognition, load your reviewed class links, and select a class and category. The Store can use on-device speech to fill a draft when the browser supports it. Review the student and confirm the award separately. If local speech is unavailable or blocked, type instead. Do not use the ordinary Allobot microphone for student awards; its selected engine may use remote transcription.')}</p>
            <p className="mt-2">{tt('schoolrewards.voice_pathways', 'Canvas and desktop are launchers, not the points ledger. Classroom authorization only imports rosters. The managed Store records official points; practice uses fictional data. Educator Evaluation has its own personnel records and permissions, and receives no award transcript.')}</p>
          </div>}
        </section>}

        {path === 'setup' && <><section aria-label={tt('schoolrewards.create_store', 'Create a school Store')}>
          <section id="sr-school-details" tabIndex={-1} aria-labelledby="sr-details-title" className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 id="sr-details-title" className="font-black text-slate-900">{tt('schoolrewards.details_first', 'Start with your school details')}</h3>
            <p className="mt-2 text-sm text-slate-700">{tt('schoolrewards.shared_backend', 'Both setup routes create the same school-owned Store: Google school-account sign-in, shared balances and inventory in protected Google Sheets and Drive. Teachers and cashiers join that Store once it is ready.')}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">                <label className="block text-xs font-black text-slate-800">{tt('schoolrewards.form_school', 'School name')}<input className={SR_INPUT + ' mt-1 font-normal'} value={form.schoolName || ''} onChange={(event) => setForm('schoolName', event.target.value)} placeholder="Example Elementary" /></label>
                <label className="block text-xs font-black text-slate-800">{tt('schoolrewards.form_domain', 'School sign-in domain')}<span className="block font-normal text-slate-700">{tt('schoolrewards.form_domain_help', 'The part after the @ in your school email, for example lincoln.k12.example. Only accounts on this domain can sign in.')}</span><input className={SR_INPUT + ' mt-1 font-normal'} value={form.allowedDomain || ''} onChange={(event) => setForm('allowedDomain', event.target.value)} placeholder="school.example" inputMode="url" autoComplete="off" spellCheck={false} /></label>
                <label className="block text-xs font-black text-slate-800">{tt('schoolrewards.form_year', 'Academic year')}<input className={SR_INPUT + ' mt-1 font-normal'} value={form.academicYear || ''} onChange={(event) => setForm('academicYear', event.target.value)} placeholder="2026-27" /></label>
                <label className="block text-xs font-black text-slate-800">{tt('schoolrewards.form_thresholds', 'Growth levels')}<span className="block font-normal text-slate-700">{tt('schoolrewards.form_thresholds_help', 'Students reach a new level at each number of points. The defaults suit most schools; change them only if you already have levels.')}</span><input className={SR_INPUT + ' mt-1 font-normal'} value={form.levelThresholds || ''} onChange={(event) => setForm('levelThresholds', event.target.value)} placeholder="0, 25, 75, 150, 300" inputMode="numeric" /></label>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-800 sm:col-span-2"><input type="checkbox" className="h-5 w-5 accent-emerald-700" checked={form.seedHowls !== false} onChange={(event) => setForm('seedHowls', event.target.checked)} />{tt('schoolrewards.form_seed', 'Start with the built-in recognition categories (you can rename or replace them in the portal later)')}</label>
</div>
            <p className="mt-3 text-sm text-slate-700" data-help-key="schoolrewards_domain_requirement">{tt('schoolrewards.domain_requirement', 'The setup owner, staff and students must currently use the same exact email domain. For example, district.org and students.district.org are different domains. If your school uses both, ask IT to review compatibility before installing; this version does not support multiple sign-in domains.')}</p>
          </section>
          <fieldset className="mb-4" aria-describedby="sr-route-help">
            <legend className="font-black text-slate-900">{tt('schoolrewards.setup_route_title', 'Who will set up the Store?')}</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <button type="button" className={setupRoute === 'guided' ? SR_BTN_PRIMARY : SR_BTN_SECONDARY} aria-pressed={setupRoute === 'guided'} data-store-setup-route="guided" onClick={() => setSetupRoute('guided')}>{tt('schoolrewards.route_guided', 'Guided school setup')}</button>
              <button type="button" className={setupRoute === 'it' ? SR_BTN_PRIMARY : SR_BTN_SECONDARY} aria-pressed={setupRoute === 'it'} data-store-setup-route="it" onClick={() => setSetupRoute('it')}>{tt('schoolrewards.route_it', 'Have district IT set it up')}</button>
            </div>
            <p id="sr-route-help" className="mt-2 text-sm text-slate-700">{tt('schoolrewards.route_help', 'Use guided setup if you are the approved technical owner, or prepare a packet for your technology coordinator. Both routes require school approval and use Google Apps Script. A district-owned Store is not a central multi-school district platform.')}</p>
          </fieldset>
          {setupRoute === 'it' && <section id="sr-path-handoff" data-help-key="schoolrewards_handoff" tabIndex={-1} aria-labelledby="sr-it-title" className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 id="sr-it-title" className="font-black text-slate-900">{tt('schoolrewards.it_packet_title', 'Send your school details and setup packet to IT')}</h3>
            <p className="mt-2 text-sm text-slate-700">{tt('schoolrewards.it_packet_help', 'Check the school details above, then download the packet or copy the instructions. Your coordinator reviews the files, completes setup and returns the approved Store address. Downloading a packet does not create or verify a Store.')}</p>
            <SrHandoff form={form} snippet={snippet} tt={tt} />
            <h4 className="mt-4 font-bold text-slate-900">{tt('schoolrewards.it_return', 'When IT sends back your Store address')}</h4>
            {portalUrlForm}
            <p className="mt-2 text-sm text-slate-700">{tt('schoolrewards.it_verify', 'Save the address, open the deployment check, and test administrator, staff, cashier and student access with approved test accounts. Each person signs in with their own school Google account. Saving the address does not grant access.')}</p>
          </section>}
          {setupRoute === 'guided' && <>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="schoolrewards-setup-title" className="text-base font-black text-slate-900">{tt('schoolrewards.setup_title', 'Setup checklist')}</h3>
            <button type="button" className={SR_BTN_QUIET} aria-expanded={showSetup} aria-controls="schoolrewards-setup-body" onClick={() => setShowSetup((value) => !value)} data-help-key="schoolrewards_toggle_setup">{showSetup ? tt('schoolrewards.hide_setup', 'Hide checklist') : tt('schoolrewards.show_setup', 'Show checklist')}</button>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label={tt('schoolrewards.progress_label', 'School Rewards setup progress')} aria-valuemin={0} aria-valuemax={SR_STEP_ORDER.length} aria-valuenow={doneCount} aria-valuetext={doneCount + ' of ' + SR_STEP_ORDER.length}>
            <div className="h-full rounded-full bg-emerald-700" style={{ width: Math.round((doneCount / SR_STEP_ORDER.length) * 100) + '%' }} />
          </div>
          <p className="mt-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950" role="status" data-help-key="schoolrewards_next_step">
            {nextStep ? <><strong>{tt('schoolrewards.next_step', 'Next step:')}</strong> {stepLabels[nextStep]}</> : <strong>{tt('schoolrewards.checklist_attested_complete', 'Your checklist is complete. These are your confirmations, not automatic deployment verification.')}</strong>}
          </p>
          <p className="mt-2 text-xs text-slate-700">{tt('schoolrewards.setup_once_attested', 'The district-approved technical owner completes this shared setup once. Checkboxes record your own confirmations; neither copying files nor AlloBot verifies the installed Store.')}</p>
          <ol id="schoolrewards-setup-body" hidden={!showSetup} className="mt-3 list-none space-y-3 p-0">
            {stepCard('approval', tt('schoolrewards.step_approval', 'Confirm district review and the managed account'), tt('schoolrewards.step_approval_body', 'The school or district reviews Code.gs, Portal.html, Index.html, and appsscript.json, plus Apps Script use, Sheet storage, mail sending, and retention. Sign into the managed Google Education account that will own the ledger, the mail trigger, and the private print-model folder; a durable role account is safer than a personal one.'))}
            {stepCard('project', tt('schoolrewards.step_project', 'Create the private project'), <>{tt('schoolrewards.step_project_body_a', 'Open ')}<a className="font-bold text-emerald-900 underline" href="https://script.new/" target="_blank" rel="noopener noreferrer">script.new</a>{tt('schoolrewards.step_project_body_b', ', verify the account again, and name the project ')}<code className="rounded bg-slate-100 px-1">AlloFlow School Rewards</code>{tt('schoolrewards.step_project_body_c', '. In Project Settings turn on "Show appsscript.json manifest file in editor".')}</>)}
            {fileCard(SR_FILES[0], tt('schoolrewards.step_code', 'Replace Code.gs'), tt('schoolrewards.step_code_body', 'Code.gs is already open in the editor with a few starter lines. Click inside it, press Ctrl+A (Cmd+A on a Mac) to select everything, paste this source over it with Ctrl+V, then save with Ctrl+S. The copy button puts the whole file on your clipboard.'))}
            {fileCard(SR_FILES[1], tt('schoolrewards.step_portal', 'Add the Portal page'), <>{tt('schoolrewards.step_portal_body_a', 'In the Files list on the left, click the + beside Files and choose HTML. A new file appears with its name selected: type ')}<code className="rounded bg-slate-100 px-1">Portal</code>{tt('schoolrewards.step_portal_body_b', ' (the editor adds .html itself) and press Enter. Select its starter lines with Ctrl+A, paste this source, and save with Ctrl+S.')}</>)}
            {fileCard(SR_FILES[2], tt('schoolrewards.step_index', 'Add the Index page'), <>{tt('schoolrewards.step_index_body_a', 'Same as the Portal page: click the + beside Files, choose HTML, type ')}<code className="rounded bg-slate-100 px-1">Index</code>{tt('schoolrewards.step_index_body_b', ', press Enter, select the starter lines, paste this source, and save. This page only wraps the Portal page; it is what the web address opens.')}</>)}
            {fileCard(SR_FILES[3], tt('schoolrewards.step_manifest', 'Replace appsscript.json'), tt('schoolrewards.step_manifest_body', 'In the Files list click appsscript.json (it appears once the Project Settings option from step 2 is on). Select everything in it with Ctrl+A, paste this manifest, and save. It restricts the web app to your domain, runs it as the deploying account, and declares the Sheets, Drive, mail, and trigger scopes the ledger needs.'))}
            {stepCard('setup', tt('schoolrewards.step_setup', 'Run the one-time repository setup'), tt('schoolrewards.step_setup_details_first', 'Check the school details above and copy the generated function. In the editor open Code.gs, press Ctrl+End to reach the bottom, paste it there, and save. In the toolbar the dropdown beside Debug lists the functions: choose runInitialSchoolRewardsSetup and click Run only after district review. Confirm the managed account and approve only the reviewed permissions. If Google or district policy blocks access, stop and consult IT; do not bypass a warning. The Execution log should end with "ok": true. The account that runs it becomes the first administrator, and the domain must match its email. Staff, cashiers, and students are added later inside the portal.'),
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="schoolrewards-setup-snippet" className="block text-xs font-black text-slate-800">{tt('schoolrewards.snippet_label', 'Generated setup function')}</label>
                  <textarea id="schoolrewards-setup-snippet" className={SR_INPUT + ' mt-1 font-mono text-xs'} readOnly rows={9} value={snippet} spellCheck={false} onFocus={(event) => event.target.select()} data-help-key="schoolrewards_setup_snippet" />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className={SR_BTN_SECONDARY} onClick={copySnippet} data-help-key="schoolrewards_copy_snippet">{snippetState === 'copied' ? tt('schoolrewards.snippet_copied', 'Copied setup function') : tt('schoolrewards.snippet_copy', 'Copy setup function')}</button>
                    {snippetState === 'manual' && <span className="text-xs text-amber-950" role="status">{tt('schoolrewards.snippet_manual', 'Clipboard blocked: click the box, press Ctrl+A, then Ctrl+C.')}</span>}
                  </div>
                </div>
              </div>)}
            {stepCard('deployed', tt('schoolrewards.step_deployed', 'Deploy as a domain-restricted web app'), tt('schoolrewards.step_deployed_body', 'Click Deploy (top right), then New deployment. Beside "Select type" click the gear and choose Web app. Execute as: Me. Who has access: your organisation (the domain), never Anyone. Click Deploy, approve if asked, and copy the Web app URL that ends in /exec. Any later change to a file needs Deploy, Manage deployments, New version before it goes live.'))}
            {stepCard('connected', tt('schoolrewards.step_saved_address', 'Save the approved Store address'), tt('schoolrewards.step_connected_body', 'Saved on this device only; each leader who needs the launcher pastes it once. Google sign-in still decides what each person can see.'), portalUrlForm)}
            {stepCard('verified', tt('schoolrewards.step_verified_self', 'I personally checked the deployment and intended roles'), tt('schoolrewards.step_verified_self_body', 'Read the deployment check for the expected school and role. Test each intended role with approved test accounts and fictional records, then use Admin setup for the first-week checklist. This checkbox records your confirmation only; AlloFlow and AlloBot cannot inspect or certify the separate signed-in Google page.'),
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={SR_BTN_SECONDARY} onClick={openHealth} disabled={!connected || urlDirty}>{tt('schoolrewards.open_check', 'Open deployment check')}</button>
                <button type="button" className={SR_BTN_SECONDARY} onClick={openPortal} disabled={!connected || urlDirty}>{tt('schoolrewards.open_portal', 'Open School Rewards portal')}</button>
              </div>)}
          </ol>
          </>}
        </section>

        <details className="rounded-xl border border-slate-200 bg-slate-50 p-4" data-help-key="schoolrewards_add_later">
          <summary className="cursor-pointer font-black text-slate-900">{tt('schoolrewards.add_later', 'Add later: class links, printing, email and reporting')}</summary>
          <p className="mt-3 text-sm text-slate-700">{tt('schoolrewards.add_later_help', 'Start with staff access, a roster, recognition categories, prizes and a shopping window inside the Store. Add classroom links, Print Lab, guardian email and SIS snapshot imports after the basic award and purchase workflow is working. District reports currently summarize one Store; cross-school administration and live SIS synchronization are not included.')}</p>
          <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-slate-900" role="note" data-help-key="schoolrewards_voice_boundary">
            <h3 className="font-black">{tt('schoolrewards.voice_boundary_title', 'Voice awards belong inside the signed-in Store')}</h3>
            <p className="mt-2">{tt('schoolrewards.voice_boundary_body', 'Open recognition, load your reviewed class links, and select a class and category. The Store can use on-device speech to fill a draft when the browser supports it. Review the student and confirm the award separately. If local speech is unavailable or blocked, type instead. Do not use the ordinary Allobot microphone for student awards; its selected engine may use remote transcription.')}</p>
            <p className="mt-2">{tt('schoolrewards.voice_pathways', 'Canvas and desktop are launchers, not the points ledger. Classroom authorization only imports rosters. The managed Store records official points; practice uses fictional data. Educator Evaluation has its own personnel records and permissions, and receives no award transcript.')}</p>
          </div>
        <SrRosterBridge tt={tt} addToast={addToast} />
        <SrRecognitionWorksheet recognition={props.recognition || null} tt={tt} addToast={addToast} />
        </details>
        </>}
      </div>
    </div>
  </div>;
}
