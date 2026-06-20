/**
 * AlloFlow Community Catalog Module
 *
 * In-canvas Browse + Submit views for the GitHub-hosted lesson catalog.
 *
 * Browse tab: fetches the manifest from raw.githubusercontent.com, renders
 * filterable cards, and lets users download a lesson JSON or load it into
 * the current AlloFlow session.
 *
 * Submit tab: form for contributing a lesson. Validates schema + scans for
 * PII client-side, then POSTs to the Cloudflare Worker proxy which validates
 * server-side and commits to catalog/pending/ on GitHub.
 *
 * Module export: window.AlloModules.CommunityCatalog (React component).
 *
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   addToast: (msg, type) => void
 *   loadProjectFromJson?: (parsed) => void   optional; if provided,
 *     the "Load in AlloFlow" button on each card calls it instead of just
 *     downloading. The monolith wires this up to its existing load handler.
 */
(function () {
  'use strict';

  if (window.AlloModules && window.AlloModules.CommunityCatalog) {
    console.log('[CDN] CommunityCatalog already loaded, skipping');
    return;
  }

  var React = window.React;
  if (!React) {
    console.error('[CDN] CommunityCatalog requires window.React');
    return;
  }
  var e = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useMemo = React.useMemo;
  var useCallback = React.useCallback;

  // ----- Constants ------------------------------------------------------------

  var WORKER_URL = 'https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/submit';
  var MANIFEST_URL = 'https://raw.githubusercontent.com/Apomera/AlloFlow/main/catalog/index.json';
  var ENTRY_BASE_URL = 'https://raw.githubusercontent.com/Apomera/AlloFlow/main/';
  var SCHEMA_VERSION = '1.0';
  var PENDING_SUBMISSION_KEY = 'alloflow_pending_submission';

  // ----- Professional Development (PD) plumbing -------------------------------
  // PD reuses the same GitHub-raw catalogue base for browse, but submits to a
  // PRIVATE worker route (/submitPd -> Cloudflare KV) so educator-authored
  // content is staged for review WITHOUT landing in the public git repo.
  var PD_MANIFEST_URL = 'https://raw.githubusercontent.com/Apomera/AlloFlow/main/catalog/pd/index.json';
  var PD_ENTRY_BASE_URL = ENTRY_BASE_URL; // PD entry.path is repo-relative, like lessons
  var PD_WORKER_URL = WORKER_URL.replace(/\/submit$/, '/submitPd');
  var PD_INTENT_KEY = 'alloflow_pd_intent';
  var PD_CORE_FALLBACK_URL = 'https://alloflow-cdn.pages.dev/pd_core_module.js';

  // Capture this script's own URL while document.currentScript is valid (during
  // synchronous IIFE execution) so we can lazy-load pd_core_module.js from the
  // SAME origin this module was served from (CDN / public mirror / local).
  var _selfSrc = '';
  try {
    if (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) {
      _selfSrc = document.currentScript.src;
    }
  } catch (_e) { /* no-op */ }

  var ALLOWED_SUBJECTS = [
    'Math', 'Science', 'ELA / Literacy', 'Social Studies',
    'SEL / Character', 'Art / Music', 'World Languages',
    'STEM (cross-disciplinary)', 'Other',
  ];

  var ALLOWED_LICENSES = [
    { value: 'CC-BY-SA-4.0', label: 'CC-BY-SA-4.0 (recommended; remix and share alike)' },
    { value: 'CC-BY-4.0',    label: 'CC-BY-4.0 (remix freely with attribution)' },
    { value: 'CC0',          label: 'CC0 (public domain dedication)' },
  ];

  var PII_PATTERNS = [
    { type: 'email',              re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
    { type: 'phone (US)',         re: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g },
    { type: 'SSN',                re: /\d{3}-\d{2}-\d{4}/g },
    { type: 'social URL',         re: /(?:facebook\.com|instagram\.com|tiktok\.com|linkedin\.com)\/[A-Za-z0-9._-]+/gi },
    { type: 'street address',     re: /\d{1,5}\s+[A-Z][A-Za-z]+\s+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Way|Court|Ct\.?)/gi },
    { type: 'titled name',        re: /(?:Mr|Mrs|Ms|Dr|Mx)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/g },
    { type: 'diagnostic acronym', re: /\b(?:ADHD|ASD|ODD|OCD|PTSD|TBI|SLD|EBD|OHI|IEP|504\sPlan)\b/g },
  ];

  // ----- Helpers --------------------------------------------------------------

  function scanForPii(text) {
    var findings = [];
    PII_PATTERNS.forEach(function (p) {
      var matches = text.match(p.re);
      if (matches && matches.length > 0) {
        findings.push({ type: p.type, count: matches.length, samples: matches.slice(0, 3) });
      }
    });
    return findings;
  }

  function validateLessonJson(text) {
    if (!text || !text.trim()) return { ok: false, error: 'Paste or upload a lesson JSON first.' };
    try {
      var obj = JSON.parse(text);
      if (typeof obj !== 'object' || obj === null) return { ok: false, error: 'Top-level value must be a JSON object.' };
      if (!obj.payload && !obj.history && !obj.lesson_content && !obj.tool && !obj.world && !obj.adventure && !obj.title) {
        return { ok: false, error: 'JSON does not look like an AlloFlow lesson. Expected at least one of: history, payload, lesson_content, tool, world, adventure.' };
      }
      return { ok: true, parsed: obj };
    } catch (err) {
      return { ok: false, error: 'Could not parse JSON: ' + err.message };
    }
  }

  function slugify(s) {
    return String(s || 'untitled').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'untitled';
  }

  function downloadJsonFile(parsed, baseFilename) {
    var blob = new Blob([JSON.stringify(parsed, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = slugify(baseFilename) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Single-shot deep-link flag: the Educator-Hub "Professional Development" card
  // sets window.__alloPdIntent (and a localStorage fallback) before opening this
  // modal, so we can open straight to the PD tab WITHOUT a new prop from the host.
  // Reading it clears it, so a later open defaults back to Browse.
  function readPdIntent() {
    try {
      if (typeof window !== 'undefined' && window.__alloPdIntent) { window.__alloPdIntent = false; return true; }
      var v = localStorage.getItem(PD_INTENT_KEY);
      if (v) { localStorage.removeItem(PD_INTENT_KEY); return true; }
    } catch (_e) { /* no-op */ }
    return false;
  }

  function pdCoreUrl() {
    if (_selfSrc && _selfSrc.indexOf('catalog_module.js') !== -1) {
      return _selfSrc.replace(/catalog_module\.js(\?.*)?$/, 'pd_core_module.js');
    }
    return PD_CORE_FALLBACK_URL;
  }

  // Lazily load pd_core_module.js (window.AlloModules.PdCore). The PD logic lives
  // in its own tested module; catalog_module.js does not hard-depend on a host
  // <script> tag for it. Idempotent + forward-compatible (resolves immediately if
  // a host loadModule already registered PdCore).
  var _pdCorePromise = null;
  function ensurePdCore() {
    if (window.AlloModules && window.AlloModules.PdCore) return Promise.resolve(window.AlloModules.PdCore);
    if (_pdCorePromise) return _pdCorePromise;
    _pdCorePromise = new Promise(function (resolve, reject) {
      try {
        var s = document.createElement('script');
        s.src = pdCoreUrl();
        s.async = true;
        s.onload = function () {
          var tries = 0;
          (function check() {
            if (window.AlloModules && window.AlloModules.PdCore) return resolve(window.AlloModules.PdCore);
            if (tries++ > 50) return reject(new Error('PD engine loaded but did not register.'));
            setTimeout(check, 40);
          })();
        };
        s.onerror = function () { reject(new Error('Could not load the PD engine (pd_core_module.js).')); };
        document.head.appendChild(s);
      } catch (err) { reject(err); }
    });
    return _pdCorePromise;
  }

  // ----- Browse tab -----------------------------------------------------------

  function BrowseTab(props) {
    var addToast = props.addToast;
    var loadProjectFromJson = props.loadProjectFromJson;
    var s = useState({ status: 'loading', entries: [], error: null });
    var state = s[0], setState = s[1];
    var f = useState({ subject: '', grade: '', search: '' });
    var filters = f[0], setFilters = f[1];

    useEffect(function () {
      var cancelled = false;
      fetch(MANIFEST_URL + '?t=' + Date.now())
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function (data) {
          if (cancelled) return;
          setState({ status: 'ok', entries: Array.isArray(data.entries) ? data.entries : [], error: null });
        })
        .catch(function (err) {
          if (cancelled) return;
          setState({ status: 'error', entries: [], error: err.message });
        });
      return function () { cancelled = true; };
    }, []);

    var filteredEntries = useMemo(function () {
      return state.entries.filter(function (entry) {
        if (filters.subject && entry.subject !== filters.subject) return false;
        if (filters.grade && (!entry.grade_level || entry.grade_level.toLowerCase().indexOf(filters.grade.toLowerCase()) === -1)) return false;
        if (filters.search) {
          var hay = ((entry.title || '') + ' ' + (entry.tags || []).join(' ')).toLowerCase();
          if (hay.indexOf(filters.search.toLowerCase()) === -1) return false;
        }
        return true;
      });
    }, [state.entries, filters]);

    // Catalog/approved files are wrapped submission records when they came in
    // via the Worker: { schema_version, metadata, affirmations, pii_scan,
    // lesson_payload }. The actual lesson is the lesson_payload field. If a
    // file was placed directly in approved/ (raw lesson, no wrapper), there's
    // no lesson_payload field and we use the object as-is.
    function unwrapLesson(fetched) {
      return fetched && fetched.lesson_payload ? fetched.lesson_payload : fetched;
    }

    function handleLoadIntoApp(entry) {
      fetch(ENTRY_BASE_URL + entry.path + '?t=' + Date.now())
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function (fetched) {
          var lesson = unwrapLesson(fetched);
          if (loadProjectFromJson) {
            loadProjectFromJson(lesson);
            addToast && addToast('Loaded "' + entry.title + '" into AlloFlow.', 'success');
          } else {
            downloadJsonFile(lesson, entry.slug);
            addToast && addToast('Downloaded "' + entry.title + '". Use Load Project to open it in AlloFlow.', 'info');
          }
        })
        .catch(function (err) {
          addToast && addToast('Could not fetch lesson: ' + err.message, 'error');
        });
    }

    function handleDownload(entry) {
      fetch(ENTRY_BASE_URL + entry.path + '?t=' + Date.now())
        .then(function (r) { return r.json(); })
        .then(function (fetched) { downloadJsonFile(unwrapLesson(fetched), entry.slug); })
        .catch(function (err) { addToast && addToast('Download failed: ' + err.message, 'error'); });
    }

    return e('div', { className: 'flex flex-col gap-4' },
      // Filter bar
      e('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200' },
        e('div', null,
          e('label', { className: 'block text-xs font-semibold text-slate-600 mb-1', htmlFor: 'cat-filter-subject' }, 'Subject'),
          e('select', {
            id: 'cat-filter-subject',
            className: 'w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white',
            value: filters.subject,
            onChange: function (ev) { setFilters(Object.assign({}, filters, { subject: ev.target.value })); },
          },
            e('option', { value: '' }, 'All subjects'),
            ALLOWED_SUBJECTS.map(function (subj) { return e('option', { key: subj, value: subj }, subj); })
          )
        ),
        e('div', null,
          e('label', { className: 'block text-xs font-semibold text-slate-600 mb-1', htmlFor: 'cat-filter-grade' }, 'Grade level'),
          e('input', {
            id: 'cat-filter-grade',
            type: 'text',
            placeholder: 'e.g., 3, 6-8, K',
            className: 'w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white',
            value: filters.grade,
            onChange: function (ev) { setFilters(Object.assign({}, filters, { grade: ev.target.value })); },
          })
        ),
        e('div', null,
          e('label', { className: 'block text-xs font-semibold text-slate-600 mb-1', htmlFor: 'cat-filter-search' }, 'Search title or tags'),
          e('input', {
            id: 'cat-filter-search',
            type: 'text',
            placeholder: 'photosynthesis, peer-teaching...',
            className: 'w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white',
            value: filters.search,
            onChange: function (ev) { setFilters(Object.assign({}, filters, { search: ev.target.value })); },
          })
        )
      ),
      // Status / count line
      e('div', { className: 'text-sm text-slate-600' },
        state.status === 'loading' ? 'Loading catalog...' :
        state.status === 'error' ? e('span', { className: 'text-red-600' }, 'Could not load catalog: ' + state.error) :
        state.entries.length === 0 ? 'No published lessons yet. Be the first to contribute via the Submit tab.' :
        filteredEntries.length + ' of ' + state.entries.length + ' entries'
      ),
      // Cards grid
      e('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' },
        filteredEntries.map(function (entry) {
          return e('div', {
            key: entry.slug,
            className: 'bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-2 shadow-sm',
          },
            e('h3', { className: 'font-bold text-slate-800 text-base' }, entry.title || '(untitled)'),
            e('div', { className: 'flex flex-wrap gap-1' },
              entry.subject && e('span', { className: 'text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold' }, entry.subject),
              entry.grade_level && e('span', { className: 'text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold' }, 'Grade ' + entry.grade_level),
              (entry.tags || []).slice(0, 3).map(function (tag) {
                return e('span', { key: tag, className: 'text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700' }, tag);
              })
            ),
            entry.credit && e('div', { className: 'text-xs text-slate-500' }, 'Credit: ' + entry.credit),
            e('div', { className: 'text-[10px] text-slate-600 font-mono' }, 'License: ' + (entry.license || '(unspecified)')),
            e('div', { className: 'flex gap-2 mt-auto pt-2' },
              e('button', {
                onClick: function () { handleDownload(entry); },
                className: 'flex-1 px-3 py-1.5 text-xs font-semibold border border-indigo-600 text-indigo-700 rounded hover:bg-indigo-50',
              }, 'Download JSON'),
              e('button', {
                onClick: function () { handleLoadIntoApp(entry); },
                className: 'flex-1 px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700',
              }, loadProjectFromJson ? 'Load in AlloFlow' : 'Open')
            )
          );
        })
      )
    );
  }

  // ----- Submit tab -----------------------------------------------------------

  function SubmitTab(props) {
    var addToast = props.addToast;
    var initialJson = props.initialJson || '';
    var initialTitle = props.initialTitle || '';

    var jsonText$ = useState(initialJson);
    var jsonText = jsonText$[0], setJsonText = jsonText$[1];
    var meta$ = useState({ title: initialTitle, subject: '', grade_level: '', tags: '', credit: '', license: 'CC-BY-SA-4.0' });
    var meta = meta$[0], setMeta = meta$[1];
    var aff$ = useState({ author_or_authorized: false, no_pii: false, license_agreed: false, age_eligible: false });
    var aff = aff$[0], setAff = aff$[1];
    var scan$ = useState({ ran: false, findings: [] });
    var scan = scan$[0], setScan = scan$[1];
    var status$ = useState({ stage: 'idle', message: '' });
    var status = status$[0], setStatus = status$[1];

    var validation = useMemo(function () { return validateLessonJson(jsonText); }, [jsonText]);
    var metaComplete = meta.title.trim() && meta.subject && meta.grade_level.trim();
    var allAffsChecked = aff.author_or_authorized && aff.no_pii && aff.license_agreed && aff.age_eligible;
    var canSubmit = validation.ok && metaComplete && scan.ran && allAffsChecked && status.stage !== 'submitting';

    function handleFileUpload(ev) {
      var f = ev.target.files && ev.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () { setJsonText(String(reader.result || '')); setScan({ ran: false, findings: [] }); };
      reader.readAsText(f);
    }

    function handleScan() {
      var findings = scanForPii(jsonText);
      setScan({ ran: true, findings: findings });
    }

    function handleSubmit() {
      if (!canSubmit) return;
      setStatus({ stage: 'submitting', message: '' });
      var payload = {
        lesson_payload: validation.parsed,
        metadata: {
          title: meta.title.trim(),
          subject: meta.subject,
          grade_level: meta.grade_level.trim(),
          tags: meta.tags.split(',').map(function (t) { return t.trim(); }).filter(Boolean).slice(0, 20),
          credit: meta.credit.trim() || null,
          license: meta.license,
        },
        affirmations: aff,
      };
      fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, body: j }; }); })
        .then(function (res) {
          if (res.body && res.body.ok) {
            setStatus({ stage: 'success', message: 'Submitted. Reference: ' + (res.body.slug || res.body.filename || '?') });
            addToast && addToast('Submission received. A maintainer will review it.', 'success');
          } else {
            setStatus({ stage: 'error', message: (res.body && res.body.error) || ('Submission failed (HTTP ' + res.status + ')') });
          }
        })
        .catch(function (err) {
          setStatus({ stage: 'error', message: 'Network error: ' + err.message });
        });
    }

    var inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white';
    var labelClass = 'block text-xs font-semibold text-slate-700 mb-1';

    return e('div', { className: 'flex flex-col gap-4' },
      // Lead paragraph
      e('p', { className: 'text-sm text-slate-700' },
        'Submissions are reviewed manually before publishing to the public catalog. By submitting you agree to the open-license terms below.'
      ),
      // JSON input row
      e('div', null,
        e('label', { className: labelClass, htmlFor: 'cat-json' }, 'Lesson JSON ',
          e('span', { className: 'font-normal text-slate-500' }, '(paste or upload)')),
        e('div', { className: 'flex gap-2 mb-2' },
          e('input', { type: 'file', accept: 'application/json,.json', onChange: handleFileUpload, className: 'text-xs' })
        ),
        e('textarea', {
          id: 'cat-json',
          rows: 8,
          className: inputClass + ' font-mono text-xs',
          placeholder: '{\n  "mode": "teacher",\n  "history": [...]\n}',
          value: jsonText,
          onChange: function (ev) { setJsonText(ev.target.value); setScan({ ran: false, findings: [] }); },
        }),
        jsonText.trim() && e('div', { className: 'mt-1 text-xs ' + (validation.ok ? 'text-emerald-700' : 'text-red-700') },
          validation.ok ? 'Schema check: OK' : 'Schema error: ' + validation.error)
      ),
      // PII scan
      e('div', null,
        e('button', {
          onClick: handleScan,
          disabled: !jsonText.trim(),
          className: 'px-3 py-1.5 text-xs font-semibold border border-slate-400 text-slate-700 rounded hover:bg-slate-50 disabled:opacity-50',
        }, scan.ran ? 'Re-scan for PII' : 'Scan for PII'),
        scan.ran && e('div', { className: 'mt-2 text-xs ' + (scan.findings.length === 0 ? 'text-emerald-700' : 'text-amber-700') },
          scan.findings.length === 0
            ? 'No common PII patterns detected. Still please review for names or identifying details before submitting.'
            : e('div', null,
                e('div', { className: 'font-semibold' }, 'Possible PII detected (please review):'),
                e('ul', { className: 'list-disc ml-5 mt-1' },
                  scan.findings.map(function (f) {
                    return e('li', { key: f.type },
                      f.type + ': ' + f.count + ' match' + (f.count !== 1 ? 'es' : '') +
                      ' (e.g., ' + f.samples.map(function (s) { return JSON.stringify(s); }).join(', ') + ')'
                    );
                  })
                )
              )
        )
      ),
      // Metadata row
      e('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
        e('div', null,
          e('label', { className: labelClass, htmlFor: 'cat-title' }, 'Title *'),
          e('input', { id: 'cat-title', type: 'text', maxLength: 200, className: inputClass, value: meta.title, onChange: function (ev) { setMeta(Object.assign({}, meta, { title: ev.target.value })); } })
        ),
        e('div', null,
          e('label', { className: labelClass, htmlFor: 'cat-subject' }, 'Subject *'),
          e('select', { id: 'cat-subject', className: inputClass, value: meta.subject, onChange: function (ev) { setMeta(Object.assign({}, meta, { subject: ev.target.value })); } },
            e('option', { value: '' }, 'Choose one'),
            ALLOWED_SUBJECTS.map(function (subj) { return e('option', { key: subj, value: subj }, subj); })
          )
        ),
        e('div', null,
          e('label', { className: labelClass, htmlFor: 'cat-grade' }, 'Grade level *'),
          e('input', { id: 'cat-grade', type: 'text', placeholder: 'e.g., 3, 6-8, K-2', className: inputClass, value: meta.grade_level, onChange: function (ev) { setMeta(Object.assign({}, meta, { grade_level: ev.target.value })); } })
        ),
        e('div', null,
          e('label', { className: labelClass, htmlFor: 'cat-tags' }, 'Tags ',
            e('span', { className: 'font-normal text-slate-500' }, '(comma-separated)')),
          e('input', { id: 'cat-tags', type: 'text', placeholder: 'photosynthesis, peer-teaching', className: inputClass, value: meta.tags, onChange: function (ev) { setMeta(Object.assign({}, meta, { tags: ev.target.value })); } })
        ),
        e('div', null,
          e('label', { className: labelClass, htmlFor: 'cat-credit' }, 'Credit ',
            e('span', { className: 'font-normal text-slate-500' }, '(optional)')),
          e('input', { id: 'cat-credit', type: 'text', maxLength: 80, placeholder: 'e.g., "Anya G., 7th grade" or leave blank for anonymous', className: inputClass, value: meta.credit, onChange: function (ev) { setMeta(Object.assign({}, meta, { credit: ev.target.value })); } })
        ),
        e('div', null,
          e('label', { className: labelClass, htmlFor: 'cat-license' }, 'License'),
          e('select', { id: 'cat-license', className: inputClass, value: meta.license, onChange: function (ev) { setMeta(Object.assign({}, meta, { license: ev.target.value })); } },
            ALLOWED_LICENSES.map(function (lic) { return e('option', { key: lic.value, value: lic.value }, lic.label); })
          )
        )
      ),
      // Affirmations
      e('div', { className: 'border border-slate-200 rounded-lg p-3 bg-amber-50' },
        e('div', { className: 'text-xs font-semibold text-slate-700 mb-2' }, 'Please confirm before submitting'),
        [
          { key: 'author_or_authorized', label: 'I am the author of this lesson, or have permission to share it.' },
          { key: 'no_pii',                label: 'I have reviewed the lesson and confirmed it does NOT contain PII (full names of minors, addresses, school names, IEP details, etc.).' },
          { key: 'license_agreed',        label: 'I agree to release this lesson under the chosen license.' },
          { key: 'age_eligible',          label: 'I am 13 years or older, OR an adult is submitting on my behalf.' },
        ].map(function (a) {
          return e('label', { key: a.key, className: 'flex items-start gap-2 text-xs text-slate-700 mb-1.5 cursor-pointer' },
            e('input', {
              type: 'checkbox',
              className: 'mt-0.5',
              checked: aff[a.key],
              onChange: function (ev) { var next = {}; next[a.key] = ev.target.checked; setAff(Object.assign({}, aff, next)); },
            }),
            e('span', null, a.label)
          );
        })
      ),
      // Submit row
      e('div', null,
        e('button', {
          onClick: handleSubmit,
          disabled: !canSubmit,
          className: 'w-full px-4 py-2.5 text-sm font-bold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed',
        }, status.stage === 'submitting' ? 'Submitting...' : 'Submit for review'),
        status.stage === 'success' && e('div', { className: 'mt-2 p-2 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded' }, status.message),
        status.stage === 'error' && e('div', { className: 'mt-2 p-2 text-xs bg-red-50 border border-red-200 text-red-800 rounded' }, status.message)
      )
    );
  }

  // ----- Professional Development: activity views -----------------------------
  // Each view renders ONE activity and reports its raw interaction up via onRaw.
  // All scoring/gating/record logic lives in window.AlloModules.PdCore — these
  // views only collect the raw shapes PdCore.normalizeResult expects.

  function ReadActivity(props) {
    var c = (props.activity && props.activity.content) || {};
    var acked = !!(props.raw && props.raw.acknowledged);
    return e('div', { className: 'flex flex-col gap-3' },
      c.body && e('p', { className: 'text-sm text-slate-700 whitespace-pre-wrap' }, c.body),
      Array.isArray(c.keyPoints) && c.keyPoints.length > 0 && e('ul', { className: 'list-disc ml-5 text-sm text-slate-600' },
        c.keyPoints.map(function (k, i) { return e('li', { key: i }, k); })),
      Array.isArray(c.links) && c.links.length > 0 && e('div', { className: 'flex flex-col gap-1' },
        c.links.map(function (l, i) {
          return e('a', { key: i, href: l.url, target: '_blank', rel: 'noopener noreferrer', className: 'text-xs text-indigo-700 hover:underline' }, l.label || l.url);
        })),
      e('label', { className: 'flex items-center gap-2 text-sm text-slate-700 cursor-pointer mt-1' },
        e('input', { type: 'checkbox', checked: acked, onChange: function (ev) { props.onRaw({ acknowledged: ev.target.checked }); } }),
        e('span', null, "I've read this")
      )
    );
  }

  function QuizActivity(props) {
    var act = props.activity;
    var qs = (act.content && act.content.questions) || [];
    var answers = (props.raw && props.raw.answers) || [];
    var submitted = !!(props.raw && props.raw.submitted);
    var threshold = (act.gate && typeof act.gate.threshold === 'number') ? act.gate.threshold : 0.8;
    var Core = window.AlloModules && window.AlloModules.PdCore;
    var norm = (submitted && Core) ? Core.normalizeResult(act, { answers: answers }) : null;
    var allAnswered = qs.length > 0 && answers.length === qs.length && answers.indexOf(undefined) === -1 && answers.indexOf(null) === -1;
    function pick(qi, oi) { var next = answers.slice(); next[qi] = oi; props.onRaw({ answers: next, submitted: false }); }
    var passed = norm && norm.score >= threshold - 1e-9;
    return e('div', { className: 'flex flex-col gap-4' },
      qs.map(function (q, qi) {
        return e('div', { key: qi, className: 'flex flex-col gap-1' },
          e('div', { className: 'text-sm font-semibold text-slate-800' }, (qi + 1) + '. ' + q.prompt),
          (q.options || []).map(function (opt, oi) {
            return e('label', { key: oi, className: 'flex items-center gap-2 text-sm text-slate-700 cursor-pointer' },
              e('input', { type: 'radio', name: act.id + '-q' + qi, checked: answers[qi] === oi, disabled: submitted, onChange: function () { pick(qi, oi); } }),
              e('span', null, opt)
            );
          })
        );
      }),
      !submitted && e('button', {
        disabled: !allAnswered,
        onClick: function () { props.onRaw({ answers: answers, submitted: true }); },
        className: 'self-start px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded disabled:opacity-40 disabled:cursor-not-allowed',
      }, 'Submit answers'),
      submitted && norm && e('div', { className: 'text-sm font-semibold ' + (passed ? 'text-emerald-700' : 'text-amber-700') },
        'Score: ' + Math.round(norm.score * 100) + '% — ' + (passed ? 'passed' : 'need ' + Math.round(threshold * 100) + '% to continue')),
      submitted && !passed && e('button', {
        onClick: function () { props.onRaw({ answers: [], submitted: false }); },
        className: 'self-start px-3 py-1 text-xs font-semibold border border-slate-400 text-slate-700 rounded hover:bg-slate-50',
      }, 'Try again')
    );
  }

  function ReflectActivity(props) {
    var c = (props.activity && props.activity.content) || {};
    var text = (props.raw && props.raw.text) || '';
    return e('div', { className: 'flex flex-col gap-2' },
      c.prompt && e('p', { className: 'text-sm text-slate-600' }, c.prompt),
      e('textarea', {
        rows: 6,
        value: text,
        onChange: function (ev) { props.onRaw({ text: ev.target.value }); },
        className: 'w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white',
        placeholder: 'Type your response…',
      })
    );
  }

  // ----- Professional Development: module runner ------------------------------

  function PdRunner(props) {
    var addToast = props.addToast;
    var mod = props.module;
    var Core = window.AlloModules && window.AlloModules.PdCore;
    var steps = useMemo(function () {
      var out = [];
      (mod.sections || []).forEach(function (sec) {
        (sec.activities || []).forEach(function (act) { out.push({ sec: sec, act: act }); });
      });
      return out;
    }, [mod]);
    var idx$ = useState(0); var idx = idx$[0], setIdx = idx$[1];
    var raw$ = useState({}); var rawById = raw$[0], setRawById = raw$[1];
    var done$ = useState(false); var done = done$[0], setDone = done$[1];

    if (!Core) return e('div', { className: 'p-6 text-center text-sm text-slate-600' }, 'Loading the PD engine…');

    function setRaw(actId, patch) {
      setRawById(function (prev) {
        var n = Object.assign({}, prev);
        n[actId] = Object.assign({}, prev[actId] || {}, patch);
        return n;
      });
    }
    function resultsById() {
      var r = {};
      steps.forEach(function (st) { r[st.act.id] = Core.normalizeResult(st.act, rawById[st.act.id] || {}); });
      return r;
    }

    if (done) {
      var ev = Core.evaluateModule(mod, resultsById());
      return e('div', { className: 'flex flex-col gap-4 items-start' },
        e('h3', { className: 'font-bold text-lg text-slate-800' }, ev.complete ? 'Module complete 🎓' : 'Module summary'),
        e('p', { className: 'text-sm text-slate-600' }, mod.metadata.title),
        e('p', { className: 'text-sm text-slate-700' }, 'Activities passed: ' + ev.passed + ' / ' + ev.total),
        e('div', { className: 'p-3 bg-sky-50 border border-sky-200 rounded text-xs text-slate-700' },
          'This is a self-paced completion record generated on your device — a personal record of your work, not accredited contact hours or a verified credential.'),
        e('div', { className: 'flex gap-2 flex-wrap' },
          ev.complete && e('button', {
            onClick: function () {
              var rec = Core.buildCompletionRecord(mod, resultsById(), props.learner || { name: null }, new Date().toISOString());
              downloadJsonFile(rec, ((mod.metadata && mod.metadata.id) || 'pd') + '-completion');
              addToast && addToast('Completion record downloaded.', 'success');
            },
            className: 'px-4 py-2 text-sm font-bold bg-emerald-600 text-white rounded-md hover:bg-emerald-700',
          }, 'Download completion record (JSON)'),
          e('button', {
            onClick: props.onExit,
            className: 'px-4 py-2 text-sm font-semibold border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50',
          }, 'Back to PD library')
        )
      );
    }

    var cur = steps[idx]; var act = cur.act;
    var curResult = Core.normalizeResult(act, rawById[act.id] || {});
    var gate = Core.evaluateGate(act, curResult);
    var canNext = gate.passed;
    var isLast = idx === steps.length - 1;
    var ActView = act.type === 'read' ? ReadActivity
      : act.type === 'quiz' ? QuizActivity
        : act.type === 'reflect' ? ReflectActivity : null;

    return e('div', { className: 'flex flex-col gap-4' },
      // Header
      e('div', { className: 'flex items-center justify-between gap-3 border-b border-slate-200 pb-3' },
        e('div', null,
          e('h3', { className: 'font-bold text-base text-slate-800' }, mod.metadata.title),
          e('p', { className: 'text-xs text-slate-500' }, cur.sec.title + ' · ' + (idx + 1) + ' / ' + steps.length)
        ),
        e('button', { onClick: props.onExit, className: 'text-sm font-semibold text-slate-600 hover:text-slate-900', 'aria-label': 'Exit module' }, 'Exit')
      ),
      // Body
      e('div', { className: 'flex flex-col gap-3' },
        e('h4', { className: 'font-semibold text-sm text-slate-800' }, act.title),
        ActView
          ? e(ActView, { activity: act, raw: rawById[act.id] || {}, onRaw: function (patch) { setRaw(act.id, patch); } })
          : e('p', { className: 'text-sm text-slate-500' }, 'This activity type is not supported yet.')
      ),
      // Footer (gated Next)
      e('div', { className: 'flex items-center justify-between gap-3 border-t border-slate-200 pt-3' },
        e('button', {
          onClick: function () { if (idx > 0) setIdx(idx - 1); },
          disabled: idx === 0,
          className: 'px-3 py-1.5 text-sm font-semibold border border-slate-300 text-slate-700 rounded disabled:opacity-40',
        }, 'Back'),
        e('div', { className: 'flex items-center gap-3' },
          !canNext && e('span', { className: 'text-xs text-slate-500' },
            gate.reason === 'incomplete' ? 'Finish this activity to continue.' : 'Reach the passing score to continue.'),
          e('button', {
            onClick: function () { if (!canNext) return; if (isLast) setDone(true); else setIdx(idx + 1); },
            disabled: !canNext,
            className: 'px-4 py-1.5 text-sm font-bold bg-indigo-600 text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed',
          }, isLast ? 'Finish' : 'Next')
        )
      )
    );
  }

  // ----- Professional Development: submit a module ----------------------------

  function PdSubmit(props) {
    var addToast = props.addToast;
    var jsonText$ = useState(''); var jsonText = jsonText$[0], setJsonText = jsonText$[1];
    var credit$ = useState(''); var credit = credit$[0], setCredit = credit$[1];
    var aff$ = useState({ author_or_authorized: false, no_pii: false, license_agreed: false, age_eligible: false });
    var aff = aff$[0], setAff = aff$[1];
    var scan$ = useState({ ran: false, findings: [] }); var scan = scan$[0], setScan = scan$[1];
    var status$ = useState({ stage: 'idle', message: '' }); var status = status$[0], setStatus = status$[1];
    var core$ = useState(!!(window.AlloModules && window.AlloModules.PdCore)); var coreReady = core$[0], setCoreReady = core$[1];

    useEffect(function () {
      var cancelled = false;
      ensurePdCore().then(function () { if (!cancelled) setCoreReady(true); }).catch(function () {});
      return function () { cancelled = true; };
    }, []);

    var validation = useMemo(function () {
      var Core = window.AlloModules && window.AlloModules.PdCore;
      if (!Core) return { ok: false, error: 'PD engine still loading…' };
      return Core.validatePdModule(jsonText);
    }, [jsonText, coreReady]);

    var allAffsChecked = aff.author_or_authorized && aff.no_pii && aff.license_agreed && aff.age_eligible;
    var canSubmit = validation.ok && scan.ran && allAffsChecked && status.stage !== 'submitting';

    function handleFileUpload(ev) {
      var f = ev.target.files && ev.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () { setJsonText(String(reader.result || '')); setScan({ ran: false, findings: [] }); };
      reader.readAsText(f);
    }
    function handleScan() { setScan({ ran: true, findings: scanForPii(jsonText) }); }
    function handleSubmit() {
      if (!canSubmit) return;
      setStatus({ stage: 'submitting', message: '' });
      var payload = { pd_module: validation.module, credit: credit.trim() || null, affirmations: aff };
      fetch(PD_WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, body: j }; }); })
        .then(function (res) {
          if (res.body && res.body.ok) {
            setStatus({ stage: 'success', message: 'Submitted privately for review. Reference: ' + (res.body.slug || res.body.id || '?') });
            addToast && addToast('PD module submitted for review.', 'success');
          } else {
            setStatus({ stage: 'error', message: (res.body && res.body.error) || ('Submission failed (HTTP ' + res.status + ')') });
          }
        })
        .catch(function (err) { setStatus({ stage: 'error', message: 'Network error: ' + err.message }); });
    }

    var inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white';
    var labelClass = 'block text-xs font-semibold text-slate-700 mb-1';

    return e('div', { className: 'flex flex-col gap-4' },
      e('p', { className: 'text-sm text-slate-700' },
        'Share a PD module (a pd_module JSON — see the seed module for the shape). Submissions are staged ',
        e('span', { className: 'font-semibold' }, 'privately'),
        ' for maintainer review and are NOT posted to the public repo. A maintainer publishes approved modules.'),
      e('div', null,
        e('label', { className: labelClass, htmlFor: 'pd-json' }, 'PD module JSON ',
          e('span', { className: 'font-normal text-slate-500' }, '(paste or upload)')),
        e('div', { className: 'flex gap-2 mb-2' },
          e('input', { type: 'file', accept: 'application/json,.json', onChange: handleFileUpload, className: 'text-xs' })
        ),
        e('textarea', {
          id: 'pd-json',
          rows: 8,
          className: inputClass + ' font-mono text-xs',
          placeholder: '{\n  "schema_version": "pd-1.0",\n  "kind": "pd_module",\n  "metadata": { "title": "..." },\n  "sections": [ ... ]\n}',
          value: jsonText,
          onChange: function (ev) { setJsonText(ev.target.value); setScan({ ran: false, findings: [] }); },
        }),
        jsonText.trim() && e('div', { className: 'mt-1 text-xs ' + (validation.ok ? 'text-emerald-700' : 'text-red-700') },
          validation.ok ? 'Schema check: OK' : 'Schema error: ' + validation.error)
      ),
      e('div', null,
        e('button', {
          onClick: handleScan,
          disabled: !jsonText.trim(),
          className: 'px-3 py-1.5 text-xs font-semibold border border-slate-400 text-slate-700 rounded hover:bg-slate-50 disabled:opacity-50',
        }, scan.ran ? 'Re-scan for PII' : 'Scan for PII'),
        scan.ran && e('div', { className: 'mt-2 text-xs ' + (scan.findings.length === 0 ? 'text-emerald-700' : 'text-amber-700') },
          scan.findings.length === 0
            ? 'No common PII patterns detected. Still please review for student names or identifying details before submitting.'
            : e('div', null,
                e('div', { className: 'font-semibold' }, 'Possible PII detected (please review):'),
                e('ul', { className: 'list-disc ml-5 mt-1' },
                  scan.findings.map(function (f) {
                    return e('li', { key: f.type },
                      f.type + ': ' + f.count + ' match' + (f.count !== 1 ? 'es' : '') +
                      ' (e.g., ' + f.samples.map(function (s) { return JSON.stringify(s); }).join(', ') + ')');
                  })
                )
              )
        )
      ),
      e('div', null,
        e('label', { className: labelClass, htmlFor: 'pd-credit' }, 'Credit ',
          e('span', { className: 'font-normal text-slate-500' }, '(optional, shown on the card)')),
        e('input', { id: 'pd-credit', type: 'text', maxLength: 80, placeholder: 'e.g., "Maine RiSE Center" or leave blank', className: inputClass, value: credit, onChange: function (ev) { setCredit(ev.target.value); } })
      ),
      e('div', { className: 'border border-slate-200 rounded-lg p-3 bg-amber-50' },
        e('div', { className: 'text-xs font-semibold text-slate-700 mb-2' }, 'Please confirm before submitting'),
        [
          { key: 'author_or_authorized', label: 'I am the author of this module, or have permission to share it.' },
          { key: 'no_pii',                label: 'I have reviewed it and confirmed it does NOT contain PII (student names, addresses, school names, IEP details, etc.).' },
          { key: 'license_agreed',        label: 'I agree to release this module under an open license (e.g., CC-BY-SA-4.0).' },
          { key: 'age_eligible',          label: 'I am 13 years or older, OR an adult is submitting on my behalf.' },
        ].map(function (a) {
          return e('label', { key: a.key, className: 'flex items-start gap-2 text-xs text-slate-700 mb-1.5 cursor-pointer' },
            e('input', {
              type: 'checkbox',
              className: 'mt-0.5',
              checked: aff[a.key],
              onChange: function (ev) { var next = {}; next[a.key] = ev.target.checked; setAff(Object.assign({}, aff, next)); },
            }),
            e('span', null, a.label)
          );
        })
      ),
      e('div', null,
        e('button', {
          onClick: handleSubmit,
          disabled: !canSubmit,
          className: 'w-full px-4 py-2.5 text-sm font-bold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed',
        }, status.stage === 'submitting' ? 'Submitting…' : 'Submit for review'),
        status.stage === 'success' && e('div', { className: 'mt-2 p-2 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded' }, status.message),
        status.stage === 'error' && e('div', { className: 'mt-2 p-2 text-xs bg-red-50 border border-red-200 text-red-800 rounded' }, status.message)
      )
    );
  }

  // ----- Professional Development: home (browse + start runner + submit) -------

  function PdHome(props) {
    var addToast = props.addToast;
    var s = useState({ status: 'loading', entries: [], error: null });
    var state = s[0], setState = s[1];
    var run$ = useState(null); var run = run$[0], setRun = run$[1];          // { entry, module }
    var sub$ = useState(false); var showSubmit = sub$[0], setShowSubmit = sub$[1];

    useEffect(function () {
      var cancelled = false;
      ensurePdCore().catch(function () {}); // warm the engine; browse doesn't need it
      fetch(PD_MANIFEST_URL + '?t=' + Date.now())
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (data) { if (cancelled) return; setState({ status: 'ok', entries: Array.isArray(data.entries) ? data.entries : [], error: null }); })
        .catch(function (err) { if (cancelled) return; setState({ status: 'error', entries: [], error: err.message }); });
      return function () { cancelled = true; };
    }, []);

    function startModule(entry) {
      ensurePdCore().then(function (Core) {
        return fetch(PD_ENTRY_BASE_URL + entry.path + '?t=' + Date.now())
          .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
          .then(function (parsed) {
            var v = Core.validatePdModule(parsed);
            if (!v.ok) { addToast && addToast('This PD module is invalid: ' + v.error, 'error'); return; }
            setRun({ entry: entry, module: v.module });
          });
      }).catch(function (err) { addToast && addToast('Could not start module: ' + err.message, 'error'); });
    }

    if (run) {
      return e(PdRunner, { module: run.module, addToast: addToast, learner: props.learner, onExit: function () { setRun(null); } });
    }
    if (showSubmit) {
      return e('div', { className: 'flex flex-col gap-3' },
        e('button', { onClick: function () { setShowSubmit(false); }, className: 'self-start text-sm text-indigo-700 hover:underline' }, '← Back to PD library'),
        e(PdSubmit, { addToast: addToast })
      );
    }

    return e('div', { className: 'flex flex-col gap-4' },
      e('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
        e('p', { className: 'text-sm text-slate-700 max-w-2xl' },
          'Short, self-paced professional-development modules — read, take a knowledge check, and reflect. Finishing one lets you download a self-paced completion record (JSON). This is a personal record of your work, not accredited contact hours.'),
        e('button', {
          onClick: function () { setShowSubmit(true); },
          className: 'shrink-0 px-3 py-1.5 text-xs font-semibold border border-indigo-600 text-indigo-700 rounded hover:bg-indigo-50',
        }, 'Submit a module')
      ),
      e('div', { className: 'text-sm text-slate-600' },
        state.status === 'loading' ? 'Loading PD library…' :
        state.status === 'error' ? e('span', { className: 'text-red-600' }, 'Could not load PD library: ' + state.error) :
        state.entries.length === 0 ? 'No PD modules published yet. Submit one for review via "Submit a module".' :
        state.entries.length + ' module' + (state.entries.length !== 1 ? 's' : '')
      ),
      e('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' },
        state.entries.map(function (entry) {
          return e('div', {
            key: entry.slug || entry.path,
            className: 'bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-2 shadow-sm',
          },
            e('h3', { className: 'font-bold text-slate-800 text-base' }, entry.title || '(untitled)'),
            e('div', { className: 'flex flex-wrap gap-1' },
              entry.topic && e('span', { className: 'text-[11px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-semibold' }, entry.topic),
              entry.estMinutes && e('span', { className: 'text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700' }, '~' + entry.estMinutes + ' min')
            ),
            entry.summary && e('p', { className: 'text-xs text-slate-600' }, entry.summary),
            entry.credit && e('div', { className: 'text-xs text-slate-500' }, 'Credit: ' + entry.credit),
            e('div', { className: 'text-[10px] text-slate-600 font-mono' }, 'License: ' + (entry.license || '(unspecified)')),
            e('div', { className: 'mt-auto pt-2' },
              e('button', {
                onClick: function () { startModule(entry); },
                className: 'w-full px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700',
              }, 'Start')
            )
          );
        })
      )
    );
  }

  // ----- Top-level component --------------------------------------------------

  function CommunityCatalog(props) {
    if (!props.isOpen) return null;

    // Read prefilled submission staged by the Share button on history items
    var prefill$ = useState(function () {
      try {
        var raw = localStorage.getItem(PENDING_SUBMISSION_KEY);
        if (!raw) return null;
        var parsed = JSON.parse(raw);
        localStorage.removeItem(PENDING_SUBMISSION_KEY);
        return parsed;
      } catch (err) { return null; }
    });
    var prefill = prefill$[0];

    var tab$ = useState(prefill ? 'submit' : (readPdIntent() ? 'pd' : 'browse'));
    var tab = tab$[0], setTab = tab$[1];

    var initialJson = prefill && prefill.payload ? JSON.stringify(prefill.payload, null, 2) :
                      prefill && prefill.lesson_payload ? JSON.stringify(prefill.lesson_payload, null, 2) : '';
    var initialTitle = (prefill && prefill.title) || '';

    var modalClass = 'fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4';
    var contentClass = 'bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col';
    var headerClass = 'flex items-center justify-between px-5 py-4 border-b border-slate-200';
    var bodyClass = 'flex-1 overflow-y-auto px-5 py-4';
    var tabBtn = function (active) {
      return 'px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ' +
        (active ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100');
    };

    return e('div', {
      className: modalClass,
      onClick: function (ev) { if (ev.target === ev.currentTarget) props.onClose(); },
    },
      e('div', { className: contentClass, role: 'dialog', 'aria-label': 'Community Catalog' },
        // Header
        e('div', { className: headerClass },
          e('div', { className: 'flex items-center gap-3' },
            e('span', { className: 'text-2xl', 'aria-hidden': 'true' }, '📚'),
            e('div', null,
              e('h2', { className: 'font-bold text-lg text-slate-800' }, 'Community Catalog'),
              e('p', { className: 'text-xs text-slate-500' }, 'Lessons, professional development, and community sharing')
            )
          ),
          e('div', { className: 'flex items-center gap-2' },
            e('button', { className: tabBtn(tab === 'browse'), onClick: function () { setTab('browse'); } }, 'Browse'),
            e('button', { className: tabBtn(tab === 'submit'), onClick: function () { setTab('submit'); } }, 'Submit'),
            e('button', { className: tabBtn(tab === 'pd'), onClick: function () { setTab('pd'); } }, 'Professional Development'),
            e('button', {
              className: 'ml-3 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900',
              onClick: props.onClose,
              'aria-label': 'Close Community Catalog',
            }, 'Close')
          )
        ),
        // Body
        e('div', { className: bodyClass },
          tab === 'pd'
            ? e(PdHome, { addToast: props.addToast })
            : tab === 'browse'
              ? e(BrowseTab, { addToast: props.addToast, loadProjectFromJson: props.loadProjectFromJson })
              : e(SubmitTab, { addToast: props.addToast, initialJson: initialJson, initialTitle: initialTitle })
        )
      )
    );
  }

  // ----- Register -------------------------------------------------------------

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.CommunityCatalog = CommunityCatalog;
  console.log('[CDN] CommunityCatalog loaded');
})();
