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

    var tab$ = useState(prefill ? 'submit' : 'browse');
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
              e('p', { className: 'text-xs text-slate-500' }, 'Browse + share open-licensed lessons')
            )
          ),
          e('div', { className: 'flex items-center gap-2' },
            e('button', { className: tabBtn(tab === 'browse'), onClick: function () { setTab('browse'); } }, 'Browse'),
            e('button', { className: tabBtn(tab === 'submit'), onClick: function () { setTab('submit'); } }, 'Submit'),
            e('button', {
              className: 'ml-3 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900',
              onClick: props.onClose,
              'aria-label': 'Close Community Catalog',
            }, 'Close')
          )
        ),
        // Body
        e('div', { className: bodyClass },
          tab === 'browse'
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
