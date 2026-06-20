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
    }).catch(function (err) {
      // Don't cache a rejected promise — clear it so a later action can retry.
      _pdCorePromise = null;
      throw err;
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
          className: 'w-full px-4 py-2.5 text-sm font-bold bg-emerald-700 text-white rounded-md hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed',
        }, status.stage === 'submitting' ? 'Submitting...' : 'Submit for review'),
        status.stage === 'success' && e('div', { className: 'mt-2 p-2 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded' }, status.message),
        status.stage === 'error' && e('div', { className: 'mt-2 p-2 text-xs bg-red-50 border border-red-200 text-red-800 rounded' }, status.message)
      )
    );
  }

  // ----- Professional Development: AI authoring (reuses window.callGemini) -----
  // Pull the first JSON object out of an LLM response (handles ```json fences and
  // surrounding prose) — the same extraction other AlloFlow AI tools use.
  function extractFirstJsonObject(text) {
    var raw = typeof text === 'string' ? text : (text && text.text ? text.text : String(text || ''));
    raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    // Try each '{' as a start and scan for its balanced close (respecting string
    // literals/escapes), so prose containing a stray '{' before the real object
    // can't make the naive first-{/last-} slice fail.
    for (var i = 0; i < raw.length; i++) {
      if (raw.charAt(i) !== '{') continue;
      var depth = 0, inStr = false, esc = false;
      for (var j = i; j < raw.length; j++) {
        var ch = raw.charAt(j);
        if (inStr) {
          if (esc) { esc = false; }
          else if (ch === '\\') { esc = true; }
          else if (ch === '"') { inStr = false; }
        } else if (ch === '"') { inStr = true; }
        else if (ch === '{') { depth++; }
        else if (ch === '}') {
          depth--;
          if (depth === 0) {
            try { return JSON.parse(raw.substring(i, j + 1)); } catch (_e) { break; } // try next '{'
          }
        }
      }
    }
    return null;
  }

  function buildPdGenPrompt(opts) {
    opts = opts || {};
    var topic = String(opts.topic || '').trim();
    var audience = String(opts.audience || 'K-12 educators').trim();
    var minutes = Math.max(5, Math.min(60, parseInt(opts.estMinutes, 10) || 15));
    var n = Math.max(1, Math.min(8, parseInt(opts.numQuestions, 10) || 4));
    var notes = String(opts.notes || '').trim();
    var wantReflect = opts.includeReflection !== false;
    var wantSim = !!opts.includeSim;
    return [
      'You are an instructional designer creating a SHORT, self-paced professional-development (PD) module for ' + audience + '.',
      'Topic: ' + topic + '.',
      notes ? ('Author notes / learning objectives to honor: ' + notes) : '',
      '',
      'Return ONLY a JSON object (no prose, no markdown fences) matching EXACTLY this shape:',
      '{',
      '  "schema_version": "pd-1.0",',
      '  "kind": "pd_module",',
      '  "metadata": { "title": string, "topic": string, "summary": string (1-2 sentences), "estMinutes": ' + minutes + ', "audience": "educator", "license": "CC-BY-SA-4.0", "credit": "AI-assisted draft", "ai_generated": true },',
      '  "sections": [',
      '    { "title": "Learn", "activities": [ { "id": "read-1", "type": "read", "title": string, "content": { "body": string (2-4 short paragraphs separated by \\n\\n), "keyPoints": [string, string, string] }, "gate": { "kind": "none" } } ] },',
      '    { "title": "Check your understanding", "activities": [ { "id": "quiz-1", "type": "quiz", "title": string, "content": { "questions": [ exactly ' + n + ' items, each { "prompt": string, "options": [string, string, string, string], "correctIndex": integer 0-3 pointing to the ONE correct option, "explanation": string (one sentence on why the correct option is right) } ] }, "gate": { "kind": "score", "threshold": 0.75 } } ] }' + ((wantSim || wantReflect) ? ',' : ''),
      wantSim ? '    { "title": "Practice", "activities": [ { "id": "sim-1", "type": "sim", "title": string, "content": { "scenario": string (a realistic, concrete classroom scenario for the educator to respond to in writing), "rubric": string (what a strong response demonstrates) }, "gate": { "kind": "none" } } ] }' + (wantReflect ? ',' : '') : '',
      wantReflect ? '    { "title": "Apply it", "activities": [ { "id": "reflect-1", "type": "reflect", "title": string, "content": { "prompt": string asking the educator to apply this to their own practice }, "gate": { "kind": "none" } } ] }' : '',
      '  ]',
      '}',
      '',
      'Rules:',
      '- Every quiz question MUST have exactly one correct option, and correctIndex MUST truly point to it.',
      '- Be ACCURATE and EVIDENCE-BASED. If a claim is contested or a common neuromyth (e.g., "learning styles", left/right-brain learners, "we only use 10% of our brain"), do NOT present it as established fact — note its status or use the replicated alternative.',
      wantSim ? '- If a Practice (sim) section is included, the scenario must be realistic and self-contained, and the sim gate MUST be "none" (it is formative).' : '',
      '- Concise (~' + minutes + ' minutes of reading). No PII and no real student names.',
      '- Output ONLY the JSON object.'
    ].filter(Boolean).join('\n');
  }

  // Generate + validate a pd_module from a topic via the shared AI layer, with ONE
  // auto-repair retry on schema failure. deps {callAI, getCore} are injectable for tests.
  function generatePdModule(opts, deps) {
    deps = deps || {};
    var callAI = deps.callAI || (typeof window !== 'undefined' ? window.callGemini : null);
    var getCore = deps.getCore || function () { return window.AlloModules && window.AlloModules.PdCore; };
    if (typeof callAI !== 'function') return Promise.reject(new Error('AI is not available here (window.callGemini missing).'));
    var Core = getCore();
    if (!Core) return Promise.reject(new Error('The PD engine is still loading — try again in a moment.'));
    if (!opts || !String(opts.topic || '').trim()) return Promise.reject(new Error('Enter a topic first.'));

    // Defensively mark provenance — never trust the model to have set it.
    function stampAi(mod) {
      if (mod && mod.metadata) { mod.metadata.ai_generated = true; mod.metadata.credit = 'AI-assisted draft'; }
      return mod;
    }

    function attempt(prompt) {
      return Promise.resolve(callAI(prompt, true)).then(function (out) {
        var parsed = extractFirstJsonObject(out);
        var v = parsed ? Core.validatePdModule(parsed) : { ok: false, error: 'The AI did not return valid JSON.' };
        return { v: v, parsed: parsed, out: out };
      });
    }

    return attempt(buildPdGenPrompt(opts)).then(function (r1) {
      if (r1.v.ok) return { ok: true, module: stampAi(r1.v.module) };
      var repair = 'This PD module JSON is invalid: ' + r1.v.error +
        '\nHere is the JSON:\n' + (r1.parsed ? JSON.stringify(r1.parsed) : String(r1.out || '').slice(0, 6000)) +
        '\nReturn a corrected pd_module JSON that fixes ONLY that problem and still matches the required schema. Output ONLY the JSON object.';
      return attempt(repair).then(function (r2) {
        if (r2.v.ok) return { ok: true, module: stampAi(r2.v.module), repaired: true };
        return { ok: false, error: r2.v.error || 'Could not generate a valid module.' };
      });
    });
  }

  // ----- Professional Development: progress + completion history (localStorage) -
  var PD_PROGRESS_PREFIX = 'alloflow_pd_progress::';
  var PD_HISTORY_KEY = 'alloflow_pd_history';
  function pdModuleId(mod) {
    return (mod && mod.metadata && mod.metadata.id) || slugify((mod && mod.metadata && mod.metadata.title) || 'module');
  }
  // A lightweight content fingerprint (activity ids/types + quiz length) so saved
  // progress can be invalidated if the module's structure changed since it was saved
  // (otherwise index-based quiz answers could be mis-scored against new questions).
  function pdFingerprint(mod) {
    var parts = [];
    ((mod && mod.sections) || []).forEach(function (sec) {
      ((sec && sec.activities) || []).forEach(function (a) {
        parts.push((a.id || '') + ':' + (a.type || '') + ':' + (((a.content && a.content.questions) || []).length));
      });
    });
    return parts.join('|');
  }
  function loadPdProgress(mod) {
    try { var raw = localStorage.getItem(PD_PROGRESS_PREFIX + pdModuleId(mod)); return raw ? JSON.parse(raw) : null; } catch (_e) { return null; }
  }
  function loadPdProgressById(id) {
    try { var raw = localStorage.getItem(PD_PROGRESS_PREFIX + id); return raw ? JSON.parse(raw) : null; } catch (_e) { return null; }
  }
  function savePdProgress(mod, state) {
    try { localStorage.setItem(PD_PROGRESS_PREFIX + pdModuleId(mod), JSON.stringify(state)); } catch (_e) { /* quota/sandbox */ }
  }
  function clearPdProgress(mod) {
    try { localStorage.removeItem(PD_PROGRESS_PREFIX + pdModuleId(mod)); } catch (_e) { /* no-op */ }
  }
  function loadPdHistory() {
    try { var raw = localStorage.getItem(PD_HISTORY_KEY); var arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch (_e) { return []; }
  }
  function recordPdCompletion(entry) {
    try {
      var hist = loadPdHistory().filter(function (h) { return h && h.moduleId !== entry.moduleId; });
      hist.unshift(entry);
      localStorage.setItem(PD_HISTORY_KEY, JSON.stringify(hist.slice(0, 200)));
    } catch (_e) { /* no-op */ }
  }
  function isPdCompleted(moduleId) {
    return loadPdHistory().some(function (h) { return h && h.moduleId === moduleId && h.complete; });
  }
  // Learning-path progress: how many of a path's modules are completed.
  function pdPathProgress(path, isDone) {
    var slugs = (path && path.moduleSlugs) || [];
    var done = 0;
    slugs.forEach(function (s) { if (isDone(s)) done++; });
    return { done: done, total: slugs.length, complete: slugs.length > 0 && done === slugs.length };
  }
  // Export/import the local history — important because the Canvas sandbox does not
  // persist localStorage across sessions, so a learner can save + restore their record.
  function exportPdHistory() {
    downloadJsonFile({ schema_version: 'pd-history-1.0', kind: 'pd_history', exported_at: new Date().toISOString(), entries: loadPdHistory() }, 'my-pd-learning');
  }
  function importPdHistory(parsed) {
    var incoming = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.entries) ? parsed.entries : null);
    if (!incoming) return { ok: false, error: 'That file is not a PD history export.' };
    var byId = {};
    loadPdHistory().forEach(function (h) { if (h && h.moduleId) byId[h.moduleId] = h; });
    incoming.forEach(function (h) {
      if (!h || !h.moduleId || !h.complete) return;
      var prev = byId[h.moduleId];
      if (!prev || String(h.completedAt || '') > String(prev.completedAt || '')) byId[h.moduleId] = h; // keep the most recent
    });
    var merged = Object.keys(byId).map(function (k) { return byId[k]; })
      .sort(function (a, b) { return String(b.completedAt || '').localeCompare(String(a.completedAt || '')); });
    try { localStorage.setItem(PD_HISTORY_KEY, JSON.stringify(merged.slice(0, 200))); } catch (_e) { return { ok: false, error: 'Could not save imported history.' }; }
    return { ok: true, count: merged.length };
  }

  // ----- Professional Development: printable certificate ----------------------
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function buildPdCertificateHtml(mod, ev, learnerName, nowISO) {
    var title = escapeHtml(mod.metadata && mod.metadata.title);
    var topic = escapeHtml((mod.metadata && mod.metadata.topic) || '');
    var date = escapeHtml(String(nowISO || '').slice(0, 10));
    var who = escapeHtml(learnerName || '');
    return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>PD Certificate — ' + title + '</title><style>' +
      'body{font-family:Georgia,"Times New Roman",serif;color:#0f172a;margin:0;padding:40px;background:#f1f5f9}' +
      '.cert{max-width:760px;margin:0 auto;background:#fff;border:3px double #6366f1;border-radius:16px;padding:48px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.08)}' +
      'h1{font-size:13px;letter-spacing:4px;text-transform:uppercase;color:#6366f1;margin:0 0 4px}' +
      '.sub{color:#64748b;font-size:13px;margin-bottom:18px}' +
      '.who{font-size:20px;margin:14px 0}.who strong{font-size:24px}' +
      'h2{font-size:26px;margin:10px 0 4px;color:#1e293b}.meta{color:#475569;font-size:14px;margin:6px 0}' +
      '.disc{margin-top:26px;font-size:11px;color:#64748b;font-style:italic;line-height:1.5}' +
      '.btn{margin-top:24px}.btn button{padding:10px 18px;font-size:14px;border:1px solid #6366f1;background:#6366f1;color:#fff;border-radius:8px;cursor:pointer}' +
      '@media print{.btn{display:none}body{background:#fff;padding:0}.cert{border:none;box-shadow:none}}</style></head><body>' +
      '<div class="cert" role="document">' +
      '<h1>Certificate of Completion</h1><div class="sub">Self-paced professional development</div>' +
      (who ? ('<div class="who">Awarded to <strong>' + who + '</strong></div>') : '') +
      '<h2>' + title + '</h2>' + (topic ? ('<div class="meta">Topic: ' + topic + '</div>') : '') +
      '<div class="meta">Completed ' + date + ' &middot; ' + ev.passed + ' of ' + ev.total + ' activities passed</div>' +
      '<div class="disc">This is a self-paced completion record generated on the learner\'s own device. ' +
      'It is NOT accredited contact hours, continuing-education units, or a verified credential.</div>' +
      '<div class="btn"><button onclick="window.print()">Print / Save as PDF</button></div>' +
      '</div></body></html>';
  }
  function printPdCertificate(mod, results, learner, addToast) {
    var Core = window.AlloModules && window.AlloModules.PdCore;
    if (!Core) return;
    var ev = Core.evaluateModule(mod, results);
    var html = buildPdCertificateHtml(mod, ev, (learner && learner.name) || '', new Date().toISOString());
    var w = null;
    try { w = window.open('', '_blank'); } catch (_e) { w = null; }
    if (w && w.document) {
      try { w.document.open(); w.document.write(html); w.document.close(); return; } catch (_e2) { /* fall through to download */ }
    }
    // Pop-up blocked (e.g., the Canvas sandbox) → download the certificate HTML instead.
    try {
      var blob = new Blob([html], { type: 'text/html' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a'); a.href = url; a.download = pdModuleId(mod) + '-certificate.html';
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      addToast && addToast('Pop-up blocked — downloaded the certificate as an HTML file you can open and print.', 'info');
    } catch (_e3) { addToast && addToast('Could not open the certificate.', 'error'); }
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
        var labelId = act.id + '-q' + qi + '-label';
        var chosen = answers[qi];
        return e('div', { key: qi, className: 'flex flex-col gap-1' },
          e('div', { id: labelId, className: 'text-sm font-semibold text-slate-800' }, (qi + 1) + '. ' + q.prompt),
          e('div', { role: 'radiogroup', 'aria-labelledby': labelId, className: 'flex flex-col gap-1' },
            (q.options || []).map(function (opt, oi) {
              // After submit, mark the correct option (✓) and any wrong pick (✗).
              var mark = '', cls = 'flex items-center gap-2 text-sm cursor-pointer ';
              if (submitted) {
                if (oi === q.correctIndex) { cls += 'text-emerald-700 font-semibold'; mark = ' ✓'; }
                else if (oi === chosen) { cls += 'text-red-700'; mark = ' ✗'; }
                else { cls += 'text-slate-500'; }
              } else { cls += 'text-slate-700'; }
              return e('label', { key: oi, className: cls },
                e('input', { type: 'radio', name: act.id + '-q' + qi, checked: chosen === oi, disabled: submitted, onChange: function () { pick(qi, oi); } }),
                e('span', null, opt + mark)
              );
            })
          ),
          submitted && q.explanation && e('div', { className: 'text-xs text-slate-600 mt-0.5 pl-6' }, 'Why: ' + q.explanation)
        );
      }),
      !submitted && e('button', {
        disabled: !allAnswered,
        onClick: function () { props.onRaw({ answers: answers, submitted: true }); },
        className: 'self-start px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded disabled:opacity-40 disabled:cursor-not-allowed',
      }, 'Submit answers'),
      submitted && norm && e('div', { className: 'text-sm font-semibold ' + (passed ? 'text-emerald-700' : 'text-amber-700'), role: 'status', 'aria-live': 'polite' },
        'Score: ' + Math.round(norm.score * 100) + '% — ' + (passed ? 'passed' : 'need ' + Math.round(threshold * 100) + '% to continue')),
      submitted && !passed && e('button', {
        onClick: function () { props.onRaw({ answers: answers, submitted: false }); },
        className: 'self-start px-3 py-1 text-xs font-semibold border border-slate-400 text-slate-700 rounded hover:bg-slate-50',
      }, 'Try again')
    );
  }

  function ReflectActivity(props) {
    var c = (props.activity && props.activity.content) || {};
    var text = (props.raw && props.raw.text) || '';
    var fid = ((props.activity && props.activity.id) || 'reflect') + '-reflect';
    return e('div', { className: 'flex flex-col gap-2' },
      c.prompt && e('p', { className: 'text-sm text-slate-600' }, c.prompt),
      e('label', { className: 'block text-xs font-semibold text-slate-700', htmlFor: fid }, 'Your response'),
      e('textarea', {
        id: fid,
        rows: 6,
        value: text,
        onChange: function (ev) { props.onRaw({ text: ev.target.value }); },
        className: 'w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white',
        placeholder: 'Type your response…',
      })
    );
  }

  function VideoActivity(props) {
    var c = (props.activity && props.activity.content) || {};
    var watched = !!(props.raw && props.raw.watched);
    return e('div', { className: 'flex flex-col gap-3' },
      c.body && e('p', { className: 'text-sm text-slate-700 whitespace-pre-wrap' }, c.body),
      c.url && e('a', {
        href: c.url, target: '_blank', rel: 'noopener noreferrer',
        className: 'inline-flex items-center gap-1 self-start px-3 py-1.5 text-sm font-semibold border border-indigo-600 text-indigo-700 rounded hover:bg-indigo-50',
      }, '▶ Watch the video', e('span', { 'aria-hidden': 'true' }, ' ↗')),
      e('label', { className: 'flex items-center gap-2 text-sm text-slate-700 cursor-pointer mt-1' },
        e('input', { type: 'checkbox', checked: watched, onChange: function (ev) { props.onRaw({ watched: ev.target.checked }); } }),
        e('span', null, "I've watched this")
      )
    );
  }

  function ChecklistActivity(props) {
    var items = (props.activity && props.activity.content && props.activity.content.items) || [];
    var checked = (props.raw && props.raw.checked) || [];
    function toggle(i, val) { var next = items.map(function (_x, j) { return j === i ? val : !!checked[j]; }); props.onRaw({ checked: next }); }
    return e('div', { className: 'flex flex-col gap-2' },
      e('p', { className: 'text-xs text-slate-500' }, 'Choose at least one action you will commit to.'),
      items.map(function (item, i) {
        return e('label', { key: i, className: 'flex items-start gap-2 text-sm text-slate-700 cursor-pointer' },
          e('input', { type: 'checkbox', className: 'mt-0.5', checked: !!checked[i], onChange: function (ev) { toggle(i, ev.target.checked); } }),
          e('span', null, item)
        );
      })
    );
  }

  // Build the rubric-scoring prompt for an AI-assessed scenario (sim) activity.
  function buildSimScorePrompt(content, response) {
    var scenario = String((content && content.scenario) || '');
    var rubric = String((content && content.rubric) || 'Accuracy, practicality, empathy, and alignment with evidence-based practice.');
    return [
      'You are a supportive professional-development coach giving FORMATIVE feedback on an educator\'s response to a practice scenario. Be encouraging, specific, and honest.',
      '',
      'SCENARIO:',
      scenario,
      '',
      'WHAT A STRONG RESPONSE SHOWS (rubric):',
      rubric,
      '',
      'EDUCATOR\'S RESPONSE:',
      response,
      '',
      'Return ONLY JSON: { "masteryScore": integer 0-100, "feedback": string }.',
      '- masteryScore: a rough, holistic, formative estimate of how well the response meets the rubric (NOT a grade).',
      '- feedback: 2-4 plain, kind, concrete sentences — name a genuine strength, then the single most useful improvement.'
    ].join('\n');
  }

  function SimActivity(props) {
    var act = props.activity;
    var c = (act && act.content) || {};
    var raw = props.raw || {};
    var resp$ = useState(raw.response || ''); var response = resp$[0], setResponse = resp$[1];
    var st$ = useState(typeof raw.masteryScore === 'number' ? 'done' : 'idle'); var status = st$[0], setStatus = st$[1];
    var err$ = useState(''); var err = err$[0], setErr = err$[1];
    var aiAvailable = typeof window !== 'undefined' && typeof window.callGemini === 'function';
    var score = (typeof raw.masteryScore === 'number') ? raw.masteryScore : null;

    function submit() {
      if (!response.trim() || status === 'scoring') return;
      // Non-scored paths must clear any prior score so an edited/unscored response
      // can never inherit a stale masteryScore (the gate reads raw.masteryScore).
      if (!aiAvailable) { props.onRaw({ response: response, masteryScore: null, feedback: '' }); setErr('AI feedback is not available in this session — your response was recorded.'); setStatus('error'); return; }
      setStatus('scoring'); setErr('');
      Promise.resolve(window.callGemini(buildSimScorePrompt(c, response), true)).then(function (out) {
        var parsed = extractFirstJsonObject(out) || {};
        var msNum = parseInt(parsed.masteryScore, 10);
        if (!isFinite(msNum)) {
          // Empty / non-JSON / score-less reply: do NOT record a fake 0.
          props.onRaw({ response: response, masteryScore: null, feedback: '' });
          setErr('The AI did not return usable feedback — your response was recorded. You can try again.');
          setStatus('error');
          return;
        }
        var ms = Math.max(0, Math.min(100, msNum));
        var fb = String(parsed.feedback || '').slice(0, 2000);
        props.onRaw({ response: response, masteryScore: ms, feedback: fb });
        setStatus('done');
      }).catch(function (e) { props.onRaw({ response: response, masteryScore: null, feedback: '' }); setErr((e && e.message) || 'Scoring failed.'); setStatus('error'); });
    }

    function onEdit(val) {
      setResponse(val);
      // Editing after a score invalidates it — drop the stale score/feedback + display.
      if (typeof raw.masteryScore === 'number') { props.onRaw({ response: val, masteryScore: null, feedback: '' }); setStatus('idle'); }
    }

    return e('div', { className: 'flex flex-col gap-3' },
      c.scenario && e('div', { className: 'p-3 bg-slate-50 border border-slate-200 rounded text-sm text-slate-700 whitespace-pre-wrap' }, c.scenario),
      e('label', { className: 'block text-xs font-semibold text-slate-700', htmlFor: act.id + '-resp' }, 'Your response'),
      e('textarea', {
        id: act.id + '-resp', rows: 5, value: response,
        onChange: function (ev) { onEdit(ev.target.value); },
        className: 'w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white',
        placeholder: 'Write how you would respond…',
      }),
      e('div', { className: 'text-xs text-slate-600' }, 'Your response is sent to an AI service for formative feedback. Don’t include student names or other personal information.'),
      e('button', {
        onClick: submit,
        disabled: !response.trim() || status === 'scoring',
        className: 'self-start px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded disabled:opacity-40 disabled:cursor-not-allowed',
      }, status === 'scoring' ? 'Getting feedback…' : (score != null ? 'Resubmit for feedback' : 'Get AI feedback')),
      status === 'error' && e('div', { className: 'text-xs text-amber-700', role: 'status', 'aria-live': 'polite' }, err),
      score != null && e('div', { className: 'p-3 bg-sky-50 border border-sky-200 rounded flex flex-col gap-1', role: 'status', 'aria-live': 'polite' },
        e('div', { className: 'text-sm font-semibold text-slate-800' }, 'Formative score: ' + score + ' / 100'),
        raw.feedback && e('div', { className: 'text-sm text-slate-700 whitespace-pre-wrap' }, raw.feedback),
        e('div', { className: 'text-[11px] text-slate-600 italic' }, 'AI-generated formative feedback — a rough estimate to prompt reflection, not a definitive assessment.')
      )
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
    // Resume from any saved progress for this module.
    var saved = useMemo(function () {
      var s = loadPdProgress(mod);
      // Discard saved answers if the module's structure changed since they were saved.
      if (s && s.fp && s.fp !== pdFingerprint(mod)) return null;
      return s;
    }, [mod]);
    var idx$ = useState(function () { return (saved && typeof saved.idx === 'number' && saved.idx < steps.length) ? saved.idx : 0; });
    var idx = idx$[0], setIdx = idx$[1];
    var raw$ = useState(function () { return (saved && saved.rawById && typeof saved.rawById === 'object') ? saved.rawById : {}; });
    var rawById = raw$[0], setRawById = raw$[1];
    var done$ = useState(function () { return !!(saved && saved.done); });
    var done = done$[0], setDone = done$[1];
    var resumed$ = useState(!!(saved && (saved.idx > 0 || saved.done || (saved.rawById && Object.keys(saved.rawById).length > 0))));
    var resumed = resumed$[0], setResumed = resumed$[1];
    var headingRef = React.useRef ? React.useRef(null) : { current: null };
    var name$ = useState((props.learner && props.learner.name) || ''); var learnerName = name$[0], setLearnerName = name$[1];

    // Persist progress as the learner moves through the module.
    useEffect(function () {
      if (!Core) return;
      savePdProgress(mod, { idx: idx, rawById: rawById, done: done, fp: pdFingerprint(mod), savedAt: new Date().toISOString() });
    }, [idx, rawById, done, mod, Core]);

    // Move focus to the activity heading on each step (keyboard / screen-reader users).
    useEffect(function () {
      if (headingRef.current && headingRef.current.focus) { try { headingRef.current.focus(); } catch (_e) { /* no-op */ } }
    }, [idx, done]);

    // On completion, record it to the local "My learning" history (once) + clear progress.
    useEffect(function () {
      if (!Core || !done) return;
      var evc = Core.evaluateModule(mod, resultsById());
      if (evc.complete) {
        recordPdCompletion({
          moduleId: pdModuleId(mod),
          moduleTitle: mod.metadata && mod.metadata.title,
          topic: mod.metadata && mod.metadata.topic,
          completedAt: new Date().toISOString(),
          passed: evc.passed, total: evc.total, complete: true,
        });
        clearPdProgress(mod);
      }
    }, [done, mod, Core]);

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
    function startOver() { clearPdProgress(mod); setRawById({}); setIdx(0); setDone(false); setResumed(false); }

    if (done) {
      var ev = Core.evaluateModule(mod, resultsById());
      return e('div', { className: 'flex flex-col gap-4 items-start' },
        e('h3', { ref: headingRef, tabIndex: -1, className: 'font-bold text-lg text-slate-800 outline-none' }, ev.complete ? 'Module complete 🎓' : 'Module summary'),
        e('p', { className: 'text-sm text-slate-600' }, mod.metadata.title),
        e('p', { className: 'text-sm text-slate-700' }, 'Activities passed: ' + ev.passed + ' / ' + ev.total),
        e('div', { className: 'p-3 bg-sky-50 border border-sky-200 rounded text-xs text-slate-700' },
          'This is a self-paced completion record generated on your device — a personal record of your work, not accredited contact hours or a verified credential.'),
        ev.complete && e('div', { className: 'w-full max-w-sm' },
          e('label', { className: 'block text-xs font-semibold text-slate-700 mb-1', htmlFor: 'pd-learner-name' }, 'Name for your record / certificate ',
            e('span', { className: 'font-normal text-slate-500' }, '(optional)')),
          e('input', { id: 'pd-learner-name', type: 'text', maxLength: 80, value: learnerName, onChange: function (ev2) { setLearnerName(ev2.target.value); }, className: 'w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white', placeholder: 'e.g., your name' })
        ),
        e('div', { className: 'flex gap-2 flex-wrap' },
          ev.complete && e('button', {
            onClick: function () {
              var rec = Core.buildCompletionRecord(mod, resultsById(), { name: learnerName.trim() || null }, new Date().toISOString());
              downloadJsonFile(rec, pdModuleId(mod) + '-completion');
              addToast && addToast('Completion record downloaded.', 'success');
            },
            className: 'px-4 py-2 text-sm font-bold bg-emerald-700 text-white rounded-md hover:bg-emerald-800',
          }, 'Download completion record (JSON)'),
          ev.complete && typeof props.onCertificate === 'function' && e('button', {
            onClick: function () { props.onCertificate(mod, resultsById(), { name: learnerName.trim() || null }); },
            className: 'px-4 py-2 text-sm font-semibold border border-emerald-600 text-emerald-700 rounded-md hover:bg-emerald-50',
          }, 'Print certificate'),
          e('button', {
            onClick: function () { startOver(); },
            className: 'px-4 py-2 text-sm font-semibold border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50',
          }, 'Review again'),
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
    var completedCount = 0;
    steps.forEach(function (st) { if (Core.evaluateGate(st.act, Core.normalizeResult(st.act, rawById[st.act.id] || {})).passed) completedCount++; });
    var pct = steps.length ? Math.round((completedCount / steps.length) * 100) : 0;
    var ActView = act.type === 'read' ? ReadActivity
      : act.type === 'quiz' ? QuizActivity
        : act.type === 'reflect' ? ReflectActivity
          : act.type === 'video' ? VideoActivity
            : act.type === 'checklist' ? ChecklistActivity
              : act.type === 'sim' ? SimActivity : null;

    return e('div', { className: 'flex flex-col gap-4' },
      // Header + progress
      e('div', { className: 'flex flex-col gap-2 border-b border-slate-200 pb-3' },
        e('div', { className: 'flex items-center justify-between gap-3' },
          e('div', null,
            e('h3', { className: 'font-bold text-base text-slate-800' }, mod.metadata.title),
            e('p', { className: 'text-xs text-slate-500' }, cur.sec.title + ' · step ' + (idx + 1) + ' of ' + steps.length)
          ),
          e('div', { className: 'flex items-center gap-3' },
            resumed && e('button', { onClick: function () { startOver(); }, className: 'text-xs font-semibold text-slate-500 hover:text-slate-800 underline decoration-dotted' }, 'Start over'),
            e('button', { onClick: props.onExit, className: 'text-sm font-semibold text-slate-600 hover:text-slate-900', 'aria-label': 'Exit module' }, 'Exit')
          )
        ),
        e('div', {
          className: 'h-1.5 w-full bg-slate-200 rounded-full overflow-hidden',
          role: 'progressbar', 'aria-valuenow': completedCount, 'aria-valuemin': 0, 'aria-valuemax': steps.length, 'aria-label': 'Module progress',
        }, e('div', { className: 'h-full bg-indigo-600 rounded-full transition-all', style: { width: pct + '%' } }))
      ),
      resumed && e('div', { className: 'text-xs text-slate-500 -mt-1' }, 'Resumed where you left off.'),
      // Body
      e('div', { className: 'flex flex-col gap-3' },
        e('h4', { ref: headingRef, tabIndex: -1, className: 'font-semibold text-sm text-slate-800 outline-none' }, act.title),
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
          // Persistent live region (always mounted; text toggles) so the gate
          // reason is announced reliably when "Next" is disabled.
          e('span', { id: 'pd-gate-hint', className: 'text-xs text-slate-500', 'aria-live': 'polite' },
            !canNext ? (gate.reason === 'incomplete' ? 'Finish this activity to continue.' : 'Reach the passing score to continue.') : ''),
          e('button', {
            onClick: function () { if (!canNext) return; if (isLast) setDone(true); else setIdx(idx + 1); },
            disabled: !canNext,
            'aria-describedby': !canNext ? 'pd-gate-hint' : undefined,
            className: 'px-4 py-1.5 text-sm font-bold bg-indigo-600 text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed',
          }, isLast ? 'Finish' : 'Next')
        )
      )
    );
  }

  // ----- Professional Development: submit a module ----------------------------

  function PdSubmit(props) {
    var addToast = props.addToast;
    var jsonText$ = useState(props.initialJson || ''); var jsonText = jsonText$[0], setJsonText = jsonText$[1];
    var credit$ = useState(''); var credit = credit$[0], setCredit = credit$[1];
    var aff$ = useState({ author_or_authorized: false, no_pii: false, license_agreed: false, age_eligible: false });
    var aff = aff$[0], setAff = aff$[1];
    var scan$ = useState({ ran: false, findings: [] }); var scan = scan$[0], setScan = scan$[1];
    var piiAck$ = useState(false); var piiAck = piiAck$[0], setPiiAck = piiAck$[1];
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
    // If the PII scan flagged anything, submission is blocked until the author
    // explicitly confirms they've reviewed it (the scan is non-blocking otherwise).
    var canSubmit = validation.ok && scan.ran && allAffsChecked && (scan.findings.length === 0 || piiAck) && status.stage !== 'submitting';

    function handleFileUpload(ev) {
      var f = ev.target.files && ev.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () { setJsonText(String(reader.result || '')); setScan({ ran: false, findings: [] }); setPiiAck(false); };
      reader.readAsText(f);
    }
    function handleScan() { setPiiAck(false); setScan({ ran: true, findings: scanForPii(jsonText) }); }
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
                ),
                e('label', { className: 'flex items-start gap-2 mt-2 text-amber-800 cursor-pointer' },
                  e('input', { type: 'checkbox', className: 'mt-0.5', checked: piiAck, onChange: function (ev) { setPiiAck(ev.target.checked); } }),
                  e('span', null, 'I have reviewed the flagged items and removed any student PII (these may be false positives).')
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
          className: 'w-full px-4 py-2.5 text-sm font-bold bg-emerald-700 text-white rounded-md hover:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed',
        }, status.stage === 'submitting' ? 'Submitting…' : 'Submit for review'),
        status.stage === 'success' && e('div', { className: 'mt-2 p-2 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded' }, status.message),
        status.stage === 'error' && e('div', { className: 'mt-2 p-2 text-xs bg-red-50 border border-red-200 text-red-800 rounded' }, status.message)
      )
    );
  }

  // ----- Professional Development: AI authoring panel -------------------------

  function PdGenerate(props) {
    var addToast = props.addToast;
    var topic$ = useState(''); var topic = topic$[0], setTopic = topic$[1];
    var audience$ = useState('K-12 educators'); var audience = audience$[0], setAudience = audience$[1];
    var notes$ = useState(''); var notes = notes$[0], setNotes = notes$[1];
    var nq$ = useState(4); var numQuestions = nq$[0], setNumQuestions = nq$[1];
    var mins$ = useState(15); var estMinutes = mins$[0], setEstMinutes = mins$[1];
    var reflect$ = useState(true); var includeReflection = reflect$[0], setIncludeReflection = reflect$[1];
    var sim$ = useState(false); var includeSim = sim$[0], setIncludeSim = sim$[1];
    var status$ = useState('idle'); var status = status$[0], setStatus = status$[1]; // idle|generating|done|error
    var result$ = useState(null); var result = result$[0], setResult = result$[1];
    var error$ = useState(''); var error = error$[0], setError = error$[1];

    useEffect(function () { ensurePdCore().catch(function () {}); }, []);

    var aiAvailable = typeof window !== 'undefined' && typeof window.callGemini === 'function';

    function generate() {
      if (!topic.trim() || status === 'generating') return;
      setStatus('generating'); setError(''); setResult(null);
      generatePdModule({ topic: topic, audience: audience, notes: notes, numQuestions: numQuestions, estMinutes: estMinutes, includeReflection: includeReflection, includeSim: includeSim })
        .then(function (res) {
          if (res.ok) {
            setResult(res.module); setStatus('done');
            if (res.repaired) addToast && addToast('Draft generated (auto-corrected one schema issue).', 'info');
          } else { setError(res.error || 'Could not generate a module.'); setStatus('error'); }
        })
        .catch(function (err) { setError(err.message); setStatus('error'); });
    }

    var inputClass = 'w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white';
    var labelClass = 'block text-xs font-semibold text-slate-700 mb-1';

    return e('div', { className: 'flex flex-col gap-4' },
      e('button', { onClick: props.onBack, className: 'self-start text-sm text-indigo-700 hover:underline' }, '← Back to PD library'),
      e('h3', { className: 'font-bold text-base text-slate-800' }, 'Create a PD module with AI'),
      // Honesty banner — AI drafts can be wrong; review before use.
      e('div', { className: 'p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800' },
        'AI drafts can contain mistakes — especially quiz answer keys and any factual or research claims. ',
        e('span', { className: 'font-semibold' }, 'Review and edit every module before assigning or publishing it.'),
        ' Generated modules are marked as AI-assisted drafts.'),
      !aiAvailable && e('div', { className: 'p-2 text-xs bg-red-50 border border-red-200 text-red-800 rounded' },
        'AI generation is not available in this session. You can still author a module by hand via "Submit a module".'),
      // Inputs
      e('div', null,
        e('label', { className: labelClass, htmlFor: 'pdg-topic' }, 'Topic *'),
        e('input', { id: 'pdg-topic', type: 'text', maxLength: 160, className: inputClass, placeholder: 'e.g., Trauma-informed classroom routines', value: topic, onChange: function (ev) { setTopic(ev.target.value); } })
      ),
      e('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
        e('div', null,
          e('label', { className: labelClass, htmlFor: 'pdg-aud' }, 'Audience'),
          e('input', { id: 'pdg-aud', type: 'text', maxLength: 80, className: inputClass, value: audience, onChange: function (ev) { setAudience(ev.target.value); } })
        ),
        e('div', { className: 'grid grid-cols-2 gap-3' },
          e('div', null,
            e('label', { className: labelClass, htmlFor: 'pdg-nq' }, 'Quiz questions'),
            e('input', { id: 'pdg-nq', type: 'number', min: 1, max: 8, className: inputClass, value: numQuestions, onChange: function (ev) { setNumQuestions(parseInt(ev.target.value, 10) || 1); } })
          ),
          e('div', null,
            e('label', { className: labelClass, htmlFor: 'pdg-min' }, 'Length (min)'),
            e('input', { id: 'pdg-min', type: 'number', min: 5, max: 60, className: inputClass, value: estMinutes, onChange: function (ev) { setEstMinutes(parseInt(ev.target.value, 10) || 15); } })
          )
        )
      ),
      e('div', null,
        e('label', { className: labelClass, htmlFor: 'pdg-notes' }, 'Learning objectives or notes ',
          e('span', { className: 'font-normal text-slate-500' }, '(optional)')),
        e('textarea', { id: 'pdg-notes', rows: 3, className: inputClass, placeholder: 'Anything the module must cover, a framework to ground it in, the grade band, etc.', value: notes, onChange: function (ev) { setNotes(ev.target.value); } })
      ),
      e('label', { className: 'flex items-center gap-2 text-xs text-slate-700 cursor-pointer' },
        e('input', { type: 'checkbox', checked: includeReflection, onChange: function (ev) { setIncludeReflection(ev.target.checked); } }),
        e('span', null, 'Include an "apply it" reflection at the end')
      ),
      e('label', { className: 'flex items-center gap-2 text-xs text-slate-700 cursor-pointer' },
        e('input', { type: 'checkbox', checked: includeSim, onChange: function (ev) { setIncludeSim(ev.target.checked); } }),
        e('span', null, 'Include a scenario practice with formative AI feedback (sim)')
      ),
      e('button', {
        onClick: generate,
        disabled: !topic.trim() || status === 'generating' || !aiAvailable,
        className: 'self-start px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed',
      }, status === 'generating' ? 'Generating…' : (status === 'done' ? 'Regenerate' : '✨ Generate draft')),
      status === 'error' && e('div', { className: 'p-2 text-xs bg-red-50 border border-red-200 text-red-800 rounded' }, error),
      // Result preview + actions
      status === 'done' && result && e('div', { className: 'border border-slate-200 rounded-lg p-4 flex flex-col gap-2 bg-slate-50' },
        e('div', { className: 'flex flex-wrap items-center gap-2' },
          e('h4', { className: 'font-bold text-slate-800 text-sm' }, (result.metadata && result.metadata.title) || 'Untitled module'),
          e('span', { className: 'text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold' }, 'AI-assisted draft')
        ),
        result.metadata && result.metadata.summary && e('p', { className: 'text-xs text-slate-600' }, result.metadata.summary),
        e('p', { className: 'text-xs text-slate-500' }, 'Review the content and answer keys, then preview, edit, or submit it.'),
        e('div', { className: 'flex gap-2 flex-wrap pt-1' },
          e('button', { onClick: function () { props.onRun && props.onRun(result); }, className: 'px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700' }, 'Preview / run'),
          e('button', { onClick: function () { props.onUse && props.onUse(JSON.stringify(result, null, 2)); }, className: 'px-3 py-1.5 text-xs font-semibold border border-indigo-600 text-indigo-700 rounded hover:bg-indigo-50' }, 'Edit & submit'),
          e('button', { onClick: function () { downloadJsonFile(result, ((result.metadata && result.metadata.id) || slugify((result.metadata && result.metadata.title) || 'pd-module')) + '-draft'); }, className: 'px-3 py-1.5 text-xs font-semibold border border-slate-400 text-slate-700 rounded hover:bg-slate-50' }, 'Download JSON')
        )
      )
    );
  }

  // ----- Professional Development: home (browse + start runner + submit) -------

  function PdHome(props) {
    var addToast = props.addToast;
    var s = useState({ status: 'loading', entries: [], paths: [], error: null });
    var state = s[0], setState = s[1];
    var run$ = useState(null); var run = run$[0], setRun = run$[1];          // { entry?, module }
    var view$ = useState('browse'); var view = view$[0], setView = view$[1];  // 'browse' | 'generate' | 'submit' | 'history' | 'path'
    var prefill$ = useState(''); var prefill = prefill$[0], setPrefill = prefill$[1];
    var filters$ = useState({ search: '', topic: '' }); var filters = filters$[0], setFilters = filters$[1];
    var histTick$ = useState(0); var setHistTick = histTick$[1]; // bump to refresh history-derived UI
    var activePath$ = useState(null); var activePath = activePath$[0], setActivePath = activePath$[1];

    useEffect(function () {
      var cancelled = false;
      ensurePdCore().catch(function () {}); // warm the engine; browse doesn't need it
      fetch(PD_MANIFEST_URL + '?t=' + Date.now())
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (data) {
          if (cancelled) return;
          var raw = Array.isArray(data.entries) ? data.entries : [];
          var seen = {}, entries = [];
          raw.forEach(function (en) { var id = en.slug || slugify(en.title || ''); if (id && seen[id]) return; if (id) seen[id] = true; entries.push(en); });
          setState({ status: 'ok', entries: entries, paths: Array.isArray(data.paths) ? data.paths : [], error: null });
        })
        .catch(function (err) { if (cancelled) return; setState({ status: 'error', entries: [], paths: [], error: err.message }); });
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

    function entryCompleted(entry) {
      return isPdCompleted(entry.slug) || isPdCompleted(slugify(entry.title || ''));
    }

    if (run) {
      return e(PdRunner, {
        module: run.module, addToast: addToast, learner: props.learner,
        onExit: function () { setRun(null); setHistTick(function (n) { return n + 1; }); },
        onCertificate: function (mod, results, learner) { printPdCertificate(mod, results, learner || props.learner, addToast); },
      });
    }
    if (view === 'generate') {
      return e(PdGenerate, {
        addToast: addToast,
        onBack: function () { setView('browse'); },
        onRun: function (mod) { setRun({ module: mod }); },
        onUse: function (json) { setPrefill(json); setView('submit'); },
      });
    }
    if (view === 'submit') {
      return e('div', { className: 'flex flex-col gap-3' },
        e('button', { onClick: function () { setView('browse'); setPrefill(''); }, className: 'self-start text-sm text-indigo-700 hover:underline' }, '← Back to PD library'),
        e(PdSubmit, { addToast: addToast, initialJson: prefill })
      );
    }
    if (view === 'history') {
      var hist = loadPdHistory();
      return e('div', { className: 'flex flex-col gap-3' },
        e('div', { className: 'flex items-center justify-between gap-3 flex-wrap' },
          e('button', { onClick: function () { setView('browse'); }, className: 'self-start text-sm text-indigo-700 hover:underline' }, '← Back to PD library'),
          e('div', { className: 'flex items-center gap-3 flex-wrap' },
            hist.length > 0 && e('button', {
              onClick: function () { exportPdHistory(); addToast && addToast('Exported your PD history.', 'success'); },
              className: 'text-xs font-semibold text-indigo-700 hover:underline',
            }, 'Export'),
            e('label', { className: 'text-xs font-semibold text-indigo-700 hover:underline cursor-pointer' }, 'Import',
              e('input', {
                type: 'file', accept: 'application/json,.json', className: 'hidden',
                onChange: function (ev) {
                  var f = ev.target.files && ev.target.files[0]; if (!f) return;
                  var reader = new FileReader();
                  reader.onload = function () {
                    var res; try { res = importPdHistory(JSON.parse(String(reader.result || ''))); } catch (e) { res = { ok: false, error: 'Could not read that file.' }; }
                    if (res.ok) { setHistTick(function (n) { return n + 1; }); addToast && addToast('Imported — ' + res.count + ' module' + (res.count !== 1 ? 's' : '') + ' in your history.', 'success'); }
                    else { addToast && addToast(res.error || 'Import failed.', 'error'); }
                  };
                  reader.readAsText(f);
                  ev.target.value = '';
                },
              })
            ),
            hist.length > 0 && e('button', {
              onClick: function () { try { localStorage.removeItem(PD_HISTORY_KEY); } catch (_e) { /* no-op */ } setHistTick(function (n) { return n + 1; }); addToast && addToast('Cleared your local PD history.', 'info'); },
              className: 'text-xs text-slate-500 hover:text-red-700 underline decoration-dotted',
            }, 'Clear history')
          )
        ),
        e('h3', { className: 'font-bold text-base text-slate-800' }, 'My learning'),
        e('p', { className: 'text-xs text-slate-500' }, 'Your completion history is stored only on this device. Use Export to keep a copy (this sandbox may not remember it next session) and Import to restore it.'),
        hist.length === 0
          ? e('p', { className: 'text-sm text-slate-600' }, 'No completed modules yet. Finish a module and it will appear here.')
          : e('div', { className: 'flex flex-col gap-2' },
              hist.map(function (h, i) {
                var match = (state.entries || []).filter(function (en) { return en.slug === h.moduleId || slugify(en.title || '') === h.moduleId; })[0];
                return e('div', { key: h.moduleId || i, className: 'bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap' },
                  e('div', null,
                    e('div', { className: 'font-semibold text-sm text-slate-800' }, '✓ ' + (h.moduleTitle || h.moduleId)),
                    e('div', { className: 'text-xs text-slate-500' },
                      (h.topic ? (h.topic + ' · ') : '') + 'completed ' + String(h.completedAt || '').slice(0, 10) +
                      (typeof h.passed === 'number' ? (' · ' + h.passed + '/' + h.total + ' passed') : ''))
                  ),
                  match && e('button', { onClick: function () { startModule(match); }, className: 'px-3 py-1.5 text-xs font-semibold border border-indigo-600 text-indigo-700 rounded hover:bg-indigo-50' }, 'Review again')
                );
              })
            )
      );
    }
    if (view === 'path' && activePath) {
      var ap = activePath;
      var apProg = pdPathProgress(ap, function (sl) { return isPdCompleted(sl); });
      var apModules = (ap.moduleSlugs || []).map(function (sl) {
        return (state.entries || []).filter(function (en) { return en.slug === sl; })[0] || { slug: sl, title: sl, _missing: true };
      });
      return e('div', { className: 'flex flex-col gap-3' },
        e('button', { onClick: function () { setView('browse'); setActivePath(null); }, className: 'self-start text-sm text-indigo-700 hover:underline' }, '← Back to PD library'),
        e('div', null,
          e('h3', { className: 'font-bold text-base text-slate-800' }, (apProg.complete ? '🎓 ' : '') + (ap.title || 'Learning path')),
          ap.summary && e('p', { className: 'text-sm text-slate-600 mt-1' }, ap.summary),
          e('p', { className: 'text-xs mt-1 ' + (apProg.complete ? 'text-emerald-700 font-semibold' : 'text-slate-500') },
            apProg.complete ? ('Path complete — all ' + apProg.total + ' modules done') : (apProg.done + ' of ' + apProg.total + ' modules complete'))
        ),
        e('ol', { className: 'flex flex-col gap-2' },
          apModules.map(function (en, i) {
            var done = !en._missing && isPdCompleted(en.slug);
            return e('li', { key: en.slug || i, className: 'bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap' },
              e('div', null,
                e('div', { className: 'font-semibold text-sm text-slate-800' }, (done ? '✓ ' : (i + 1) + '. ') + (en.title || en.slug)),
                en._missing
                  ? e('div', { className: 'text-xs text-amber-700' }, 'This module is not in the catalog yet.')
                  : (en.summary && e('div', { className: 'text-xs text-slate-500' }, en.summary))
              ),
              !en._missing && e('button', {
                onClick: function () { startModule(en); },
                className: 'px-3 py-1.5 text-xs font-semibold rounded ' + (done ? 'border border-indigo-600 text-indigo-700 hover:bg-indigo-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'),
              }, done ? 'Review' : 'Start')
            );
          })
        )
      );
    }

    // Browse (default) — derive topic options + apply filters
    var topics = (function () {
      var seen = {}; var out = [];
      (state.entries || []).forEach(function (en) { if (en.topic && !seen[en.topic]) { seen[en.topic] = true; out.push(en.topic); } });
      return out;
    })();
    var visible = (state.entries || []).filter(function (en) {
      if (filters.topic && en.topic !== filters.topic) return false;
      if (filters.search) {
        var hay = ((en.title || '') + ' ' + (en.summary || '') + ' ' + (en.topic || '')).toLowerCase();
        if (hay.indexOf(filters.search.toLowerCase()) === -1) return false;
      }
      return true;
    });
    var completedCount = loadPdHistory().filter(function (h) { return h && h.complete; }).length;

    return e('div', { className: 'flex flex-col gap-4' },
      e('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
        e('p', { className: 'text-sm text-slate-700 max-w-2xl' },
          'Short, self-paced professional-development modules — read, take a knowledge check, and reflect. Finishing one lets you download a self-paced completion record (JSON) or print a certificate. This is a personal record of your work, not accredited contact hours.'),
        e('div', { className: 'shrink-0 flex gap-2 flex-wrap' },
          completedCount > 0 && e('button', {
            onClick: function () { setView('history'); },
            className: 'px-3 py-1.5 text-xs font-semibold border border-emerald-600 text-emerald-700 rounded hover:bg-emerald-50',
          }, 'My learning (' + completedCount + ')'),
          e('button', {
            onClick: function () { setView('generate'); },
            className: 'px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded hover:bg-indigo-700',
          }, '✨ Create with AI'),
          e('button', {
            onClick: function () { setPrefill(''); setView('submit'); },
            className: 'px-3 py-1.5 text-xs font-semibold border border-indigo-600 text-indigo-700 rounded hover:bg-indigo-50',
          }, 'Submit a module')
        )
      ),
      state.status === 'ok' && (state.paths || []).length > 0 && e('div', { className: 'flex flex-col gap-2' },
        e('h3', { className: 'text-sm font-bold text-slate-700' }, 'Learning paths'),
        e('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
          (state.paths || []).map(function (pth) {
            var pr = pdPathProgress(pth, function (sl) { return isPdCompleted(sl); });
            return e('div', { key: pth.slug, className: 'bg-gradient-to-br from-sky-50 to-indigo-50 border border-sky-200 rounded-lg p-4 flex flex-col gap-2' },
              e('div', { className: 'flex items-start justify-between gap-2' },
                e('h4', { className: 'font-bold text-slate-800 text-sm' }, pth.title || '(untitled path)'),
                pr.complete && e('span', { className: 'shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold' }, '✓ Complete')
              ),
              pth.summary && e('p', { className: 'text-xs text-slate-600' }, pth.summary),
              e('div', { className: 'text-xs text-slate-500' }, pr.done + ' / ' + pr.total + ' modules complete'),
              e('div', { className: 'mt-auto pt-1' },
                e('button', { onClick: function () { setActivePath(pth); setView('path'); }, className: 'px-3 py-1.5 text-xs font-semibold border border-indigo-600 text-indigo-700 rounded hover:bg-indigo-50' }, 'View path')
              )
            );
          })
        )
      ),
      state.status === 'ok' && state.entries.length > 0 && e('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200' },
        e('div', { className: 'sm:col-span-2' },
          e('label', { className: 'block text-xs font-semibold text-slate-600 mb-1', htmlFor: 'pd-search' }, 'Search'),
          e('input', { id: 'pd-search', type: 'text', placeholder: 'title, topic, summary…', className: 'w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white', value: filters.search, onChange: function (ev) { setFilters(Object.assign({}, filters, { search: ev.target.value })); } })
        ),
        e('div', null,
          e('label', { className: 'block text-xs font-semibold text-slate-600 mb-1', htmlFor: 'pd-topic' }, 'Topic'),
          e('select', { id: 'pd-topic', className: 'w-full px-3 py-2 border border-slate-300 rounded-md text-sm bg-white', value: filters.topic, onChange: function (ev) { setFilters(Object.assign({}, filters, { topic: ev.target.value })); } },
            e('option', { value: '' }, 'All topics'),
            topics.map(function (tp) { return e('option', { key: tp, value: tp }, tp); })
          )
        )
      ),
      e('div', { className: 'text-sm text-slate-600' },
        state.status === 'loading' ? 'Loading PD library…' :
        state.status === 'error' ? e('span', { className: 'text-red-600' }, 'Could not load PD library: ' + state.error) :
        state.entries.length === 0 ? 'No PD modules published yet. Create one with AI or submit one for review.' :
        visible.length + ' of ' + state.entries.length + ' module' + (state.entries.length !== 1 ? 's' : '')
      ),
      e('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' },
        visible.map(function (entry) {
          var doneBadge = entryCompleted(entry);
          var prog = doneBadge ? null : (loadPdProgressById(entry.slug) || loadPdProgressById(slugify(entry.title || '')));
          var inProgress = !!(prog && !prog.done && ((prog.idx > 0) || (prog.rawById && Object.keys(prog.rawById).length > 0)));
          return e('div', {
            key: entry.slug || entry.path,
            className: 'bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-2 shadow-sm',
          },
            e('div', { className: 'flex items-start justify-between gap-2' },
              e('h3', { className: 'font-bold text-slate-800 text-base' }, entry.title || '(untitled)'),
              doneBadge
                ? e('span', { className: 'shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold' }, '✓ Completed')
                : (inProgress && e('span', { className: 'shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold' }, 'In progress'))
            ),
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
              }, doneBadge ? 'Review again' : (inProgress ? 'Resume' : 'Start'))
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
    var dialogRef = React.useRef ? React.useRef(null) : { current: null };
    useEffect(function () { var el = dialogRef.current; if (el && el.focus) { try { el.focus(); } catch (_e) { /* no-op */ } } }, []);

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
      e('div', {
        className: contentClass, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Community Catalog',
        tabIndex: -1, ref: dialogRef,
        onKeyDown: function (ev) { if (ev.key === 'Escape') { ev.stopPropagation(); props.onClose(); } },
      },
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
            e('div', { role: 'tablist', 'aria-label': 'Catalog sections', className: 'flex items-center gap-2' },
              e('button', { role: 'tab', id: 'pd-tab-browse', 'aria-selected': tab === 'browse', className: tabBtn(tab === 'browse'), onClick: function () { setTab('browse'); } }, 'Browse'),
              e('button', { role: 'tab', id: 'pd-tab-submit', 'aria-selected': tab === 'submit', className: tabBtn(tab === 'submit'), onClick: function () { setTab('submit'); } }, 'Submit'),
              e('button', { role: 'tab', id: 'pd-tab-pd', 'aria-selected': tab === 'pd', className: tabBtn(tab === 'pd'), onClick: function () { setTab('pd'); } }, 'Professional Development')
            ),
            e('button', {
              className: 'ml-3 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900',
              onClick: props.onClose,
              'aria-label': 'Close Community Catalog',
            }, 'Close')
          )
        ),
        // Body
        e('div', { className: bodyClass, role: 'tabpanel', id: 'pd-tabpanel', 'aria-labelledby': tab === 'pd' ? 'pd-tab-pd' : (tab === 'browse' ? 'pd-tab-browse' : 'pd-tab-submit') },
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

  // Idiomatic compound-component attachment: expose the PD sub-views on the
  // catalog component so they can be unit-rendered in tests without a network
  // round-trip (harmless in production — just properties on the function).
  CommunityCatalog.PdHome = PdHome;
  CommunityCatalog.PdRunner = PdRunner;
  CommunityCatalog.PdSubmit = PdSubmit;
  CommunityCatalog.PdGenerate = PdGenerate;
  CommunityCatalog.ReadActivity = ReadActivity;
  CommunityCatalog.QuizActivity = QuizActivity;
  CommunityCatalog.ReflectActivity = ReflectActivity;
  CommunityCatalog.VideoActivity = VideoActivity;
  CommunityCatalog.ChecklistActivity = ChecklistActivity;
  CommunityCatalog.SimActivity = SimActivity;
  CommunityCatalog._buildSimScorePrompt = buildSimScorePrompt;
  CommunityCatalog._generatePdModule = generatePdModule;
  CommunityCatalog._extractFirstJsonObject = extractFirstJsonObject;
  CommunityCatalog._buildPdGenPrompt = buildPdGenPrompt;
  CommunityCatalog._buildPdCertificateHtml = buildPdCertificateHtml;
  CommunityCatalog._loadPdHistory = loadPdHistory;
  CommunityCatalog._recordPdCompletion = recordPdCompletion;
  CommunityCatalog._importPdHistory = importPdHistory;
  CommunityCatalog._pdPathProgress = pdPathProgress;

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.CommunityCatalog = CommunityCatalog;
  console.log('[CDN] CommunityCatalog loaded');
})();
