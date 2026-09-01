function EvaluationPortalQr(props) {
  var React = window.React;
  var url = String(props && props.url || '').trim();
  // Routed through the same translator the rest of this file uses. Keys are not
  // in ui_strings.js yet, and the host t() returns undefined on a miss, so the
  // English fallback renders until the translation lane adds them.
  var t = (props && props.t) || function() { return undefined; };
  var _state = React.useState({ status: 'loading', svg: '', error: '' });
  var state = _state[0];
  var setState = _state[1];
  React.useEffect(function() {
    if (!url) return undefined;
    var cancelled = false;
    var timer = null;
    var attempts = 0;
    var build = function() {
      if (cancelled) return;
      var makeQr = window.__alloMakeQrSvg;
      if (typeof makeQr !== 'function') {
        if (attempts++ < 20) {
          timer = setTimeout(build, 250);
        } else if (!cancelled) {
          setState({ status: 'error', svg: '', error: t('project_settings.qr_unavailable_build') || 'The QR generator is not available in this build.' });
        }
        return;
      }
      Promise.resolve(makeQr(url, 'Educator Evaluation district portal')).then(function(svg) {
        if (!cancelled) setState({ status: 'ready', svg: String(svg || ''), error: '' });
      }).catch(function(error) {
        if (!cancelled) setState({ status: 'error', svg: '', error: String(error && error.message || 'The QR code could not be generated.') });
      });
    };
    setState({ status: 'loading', svg: '', error: '' });
    build();
    return function() {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [url]);
  if (!url) return null;
  var copyPortalLink = function() {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url);
        return;
      }
      var input = document.createElement('textarea');
      input.value = url;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    } catch (_) {}
  };
  return (
    <div className="mt-4 grid gap-4 rounded-2xl border border-violet-200 bg-violet-50/60 p-4 sm:grid-cols-[auto,1fr] sm:items-center">
      <div className="flex min-h-44 min-w-44 items-center justify-center rounded-xl border-2 border-violet-200 bg-white p-3">
        {state.status === 'ready' && state.svg
          ? <div role="img" aria-label={t('project_settings.portal_qr_aria') || "Educator Evaluation district portal QR code"} className="h-40 w-40 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: state.svg }} />
          : <span role={state.status === 'error' ? 'alert' : 'status'} aria-live="polite" aria-atomic="true" className="px-3 text-center text-xs font-bold text-violet-800">{state.status === 'error' ? 'QR unavailable' : 'Preparing QR code…'}</span>}
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-violet-700">{t('project_settings.portal_qr_label') || "Portal QR code"}</p>
        <h5 className="mt-1 text-sm font-black text-slate-900">{t('project_settings.portal_qr_title') || "Open the district evaluation portal on another device"}</h5>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">Scanning opens the same authenticated district portal. Google sign-in and server-side assignments still control access; the QR code does not grant permission by itself.</p>
        {state.error && <p className="mt-2 text-xs font-bold text-rose-700">{state.error}</p>}
        <button type="button" onClick={copyPortalLink} className="mt-3 min-h-10 rounded-xl border border-violet-300 bg-white px-3 py-2 text-xs font-black text-violet-800 hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2">Copy portal link</button>
      </div>
    </div>
  );
}

function ProjectSettingsDialogFocusManager(props) {
  var React = window.React;
  React.useEffect(function() {
    var root = document.getElementById(props.dialogId);
    if (!root) return undefined;
    var previouslyFocused = document.activeElement;
    var trapStack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
    var trap = { root: root };
    trapStack.push(trap);
    var isTopTrap = function() {
      return trapStack[trapStack.length - 1] === trap;
    };
    var getFocusableElements = function() {
      return Array.from(root.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [contenteditable="true"], [tabindex]:not([tabindex="-1"])'
      )).filter(function(element) {
        if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
        var style = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(element) : null;
        return !style || (style.display !== 'none' && style.visibility !== 'hidden');
      });
    };
    var handleKeyDown = function(event) {
      if (!isTopTrap() || event.key !== 'Tab') return;
      var focusableElements = getFocusableElements();
      if (!focusableElements.length) {
        event.preventDefault();
        root.focus();
        return;
      }
      var first = focusableElements[0];
      var last = focusableElements[focusableElements.length - 1];
      var activeIndex = focusableElements.indexOf(document.activeElement);
      if (event.shiftKey && (activeIndex <= 0 || !root.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (activeIndex === -1 || activeIndex === focusableElements.length - 1)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    try { root.focus(); } catch (_) {}
    return function() {
      document.removeEventListener('keydown', handleKeyDown);
      var wasTopTrap = isTopTrap();
      var trapIndex = trapStack.indexOf(trap);
      if (trapIndex !== -1) trapStack.splice(trapIndex, 1);
      if (wasTopTrap && previouslyFocused && previouslyFocused !== document.body
          && previouslyFocused.isConnected && typeof previouslyFocused.focus === 'function') {
        try { previouslyFocused.focus(); } catch (_) {}
      }
    };
  }, [props.dialogId]);
  return null;
}

function ProjectSettingsView(props) {
  var t = props.t;
  var studentProjectSettings = props.studentProjectSettings || {};
  var setStudentProjectSettings = props.setStudentProjectSettings;
  var isTeacherMode = props.isTeacherMode;
  // Family mode and independent mode both run with isTeacherMode true, so
  // "is this a school user?" is isTeacherMode AND neither of these. Anything
  // school-only in this modal has to test isSchoolRole, not isTeacherMode.
  var isParentMode = props.isParentMode === true;
  var isIndependentMode = props.isIndependentMode === true;
  var isSchoolRole = isTeacherMode && !isParentMode && !isIndependentMode;
  var handleSetIsProjectSettingsOpenToFalse = props.handleSetIsProjectSettingsOpenToFalse;
  var onOpenPrincipalEvaluation = props.onOpenPrincipalEvaluation;
  var evaluationPortalUrl = props.evaluationPortalUrl || '';
  var isEvaluationPortalConnected = props.isEvaluationPortalConnected === true;
  var onSaveEvaluationPortalUrl = props.onSaveEvaluationPortalUrl;
  var rewardsStorageKey = 'allo_school_rewards_portal_url_v1';
  var normalizeRewardsPortalUrl = function(value) {
    try {
      var url = new URL(String(value || '').trim());
      if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || url.port || url.username || url.password || url.search || url.hash) return '';
      if (!/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)) return '';
      return url.origin + url.pathname;
    } catch (_) { return ''; }
  };
  var locallySavedRewardsUrl = '';
  try { locallySavedRewardsUrl = normalizeRewardsPortalUrl(window.localStorage.getItem(rewardsStorageKey)); } catch (_) {}
  var rewardsPortalUrl = props.rewardsPortalUrl || locallySavedRewardsUrl;
  var isRewardsPortalConnected = props.isRewardsPortalConnected === true || Boolean(rewardsPortalUrl);
  var onSaveRewardsPortalUrl = props.onSaveRewardsPortalUrl || function(value) {
    var raw = String(value || '').trim();
    var normalized = raw ? normalizeRewardsPortalUrl(raw) : '';
    if (raw && !normalized) {
      try { window.alert('Use the HTTPS Apps Script deployment URL ending in /macros/s/{deployment}/exec.'); } catch (_) {}
      return { ok: false, error: 'Invalid Apps Script deployment URL.' };
    }
    try { if (normalized) window.localStorage.setItem(rewardsStorageKey, normalized); else window.localStorage.removeItem(rewardsStorageKey); } catch (_) { return { ok: false, error: 'This browser could not save the launcher URL.' }; }
    return { ok: true, url: normalized, connected: Boolean(normalized) };
  };
  var onOpenSchoolRewards = props.onOpenSchoolRewards || function() {
    var url = normalizeRewardsPortalUrl(rewardsPortalUrl || locallySavedRewardsUrl);
    if (!url) {
      try { window.alert('Connect the school or district School Rewards portal below first.'); } catch (_) {}
      return;
    }
    try { var popup = window.open(url, '_blank', 'noopener,noreferrer'); if (popup) popup.opener = null; } catch (_) {}
  };
  // This view intentionally remains hook-free because it is also invoked by
  // project export/test renderers. The uncontrolled input updates this
  // render-closure draft; the host owns persistence, validation, and toasts.
  var portalUrlDraft = evaluationPortalUrl;
  var applyEvaluationPortalUrl = function(value) {
    if (typeof onSaveEvaluationPortalUrl !== 'function') return;
    var result = onSaveEvaluationPortalUrl(value);
    if (result && result.ok !== false && typeof result.url === 'string') portalUrlDraft = result.url;
    return result;
  };
  var rewardsPortalUrlDraft = rewardsPortalUrl;
  var applyRewardsPortalUrl = function(value) {
    if (typeof onSaveRewardsPortalUrl !== 'function') return;
    var result = onSaveRewardsPortalUrl(value);
    if (result && result.ok !== false && typeof result.url === 'string') {
      rewardsPortalUrlDraft = result.url;
      rewardsPortalUrl = result.url;
      locallySavedRewardsUrl = result.url;
    }
    return result;
  };
  var permissions = studentProjectSettings.adventurePermissions || {};

  var tx = function(key, fallback) {
    try {
      var value = t(key);
      return value && value !== key ? value : fallback;
    } catch (_) {
      return fallback;
    }
  };

  var updateSetting = function(key, value) {
    setStudentProjectSettings(function(prev) {
      return { ...prev, [key]: value };
    });
  };

  var updatePermission = function(key, value) {
    setStudentProjectSettings(function(prev) {
      return {
        ...prev,
        adventurePermissions: { ...(prev.adventurePermissions || {}), [key]: value }
      };
    });
  };

  var presets = {
    guided: {
      hideStudentAiFeatures: false,
      allowDictation: true,
      allowSocraticTutor: true,
      allowFreeResponse: false,
      allowPersonaFreeResponse: false,
      adventurePermissions: {
        allowDifficultySwitch: false,
        allowModeSwitch: false,
        allowCustomInstructions: false,
        allowLanguageSwitch: false,
        allowVisualsToggle: false,
        lockAllSettings: true
      }
    },
    balanced: {
      hideStudentAiFeatures: false,
      allowDictation: true,
      allowSocraticTutor: true,
      allowFreeResponse: true,
      allowPersonaFreeResponse: true,
      adventurePermissions: {
        allowDifficultySwitch: true,
        allowModeSwitch: false,
        allowCustomInstructions: false,
        allowLanguageSwitch: true,
        allowVisualsToggle: true,
        lockAllSettings: false
      }
    },
    open: {
      hideStudentAiFeatures: false,
      allowDictation: true,
      allowSocraticTutor: true,
      allowFreeResponse: true,
      allowPersonaFreeResponse: true,
      adventurePermissions: {
        allowDifficultySwitch: true,
        allowModeSwitch: true,
        allowCustomInstructions: true,
        allowLanguageSwitch: true,
        allowVisualsToggle: true,
        lockAllSettings: false
      }
    }
  };

  var presetMatches = function(name) {
    var preset = presets[name];
    var settingKeys = ['hideStudentAiFeatures', 'allowDictation', 'allowSocraticTutor', 'allowFreeResponse', 'allowPersonaFreeResponse', 'workStoryEnabled'];
    var permissionKeys = Object.keys(preset.adventurePermissions);
    return settingKeys.every(function(key) {
      return studentProjectSettings[key] === preset[key];
    }) && permissionKeys.every(function(key) {
      return permissions[key] === preset.adventurePermissions[key];
    });
  };

  var applyPreset = function(name) {
    var preset = presets[name];
    setStudentProjectSettings(function(prev) {
      return {
        ...prev,
        hideStudentAiFeatures: preset.hideStudentAiFeatures,
        allowDictation: preset.allowDictation,
        allowSocraticTutor: preset.allowSocraticTutor,
        allowFreeResponse: preset.allowFreeResponse,
        allowPersonaFreeResponse: preset.allowPersonaFreeResponse,
        adventurePermissions: {
          ...(prev.adventurePermissions || {}),
          ...preset.adventurePermissions
        }
      };
    });
  };

  var renderFeatureToggle = function(id, settingKey, label, description, defaultValue) {
    var checked = studentProjectSettings[settingKey];
    if (checked === undefined) checked = defaultValue;
    return (
      <label htmlFor={id} className={`flex min-h-[88px] cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${checked ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
        <input
          id={id}
          type="checkbox"
          checked={Boolean(checked)}
          onChange={(event) => updateSetting(settingKey, event.target.checked)}
          className="mt-0.5 h-5 w-5 flex-none cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span>
          <span className="block text-sm font-bold text-slate-800">{label}</span>
          <span className="mt-1 block text-xs leading-relaxed text-slate-600">{description}</span>
        </span>
      </label>
    );
  };

  var renderPermissionToggle = function(id, permissionKey, label, description, defaultValue, tone) {
    var checked = permissions[permissionKey];
    if (checked === undefined) checked = defaultValue;
    var danger = tone === 'danger';
    return (
      <label htmlFor={id} className={`flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-3 ${danger ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'}`}>
        <span>
          <span className={`block text-sm font-bold ${danger ? 'text-rose-800' : 'text-slate-800'}`}>{label}</span>
          {description && <span className={`mt-0.5 block text-xs leading-relaxed ${danger ? 'text-rose-700' : 'text-slate-600'}`}>{description}</span>}
        </span>
        <input
          id={id}
          type="checkbox"
          checked={Boolean(checked)}
          onChange={(event) => updatePermission(permissionKey, event.target.checked)}
          className={`mt-0.5 h-5 w-5 flex-none cursor-pointer rounded border-slate-300 focus:ring-2 ${danger ? 'text-rose-600 focus:ring-rose-500' : 'text-indigo-600 focus:ring-indigo-500'}`}
        />
      </label>
    );
  };

  var presetOptions = [
    {
      id: 'guided',
      title: tx('project_settings.preset_guided', 'Guided'),
      description: tx('project_settings.preset_guided_desc', 'Tighter guardrails and fewer student choices.')
    },
    {
      id: 'balanced',
      title: tx('project_settings.preset_balanced', 'Balanced'),
      badge: tx('project_settings.recommended', 'Recommended'),
      description: tx('project_settings.preset_balanced_desc', 'Common supports on with advanced choices limited.')
    },
    {
      id: 'open',
      title: tx('project_settings.preset_open', 'Open exploration'),
      description: tx('project_settings.preset_open_desc', 'More student control and customization.')
    }
  ];

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm animate-in fade-in duration-200 sm:p-6"
      onMouseDown={(event) => { if (event.target === event.currentTarget) handleSetIsProjectSettingsOpenToFalse(); }}
      onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); handleSetIsProjectSettingsOpenToFalse(); } }}
    >
      <ProjectSettingsDialogFocusManager dialogId="project-settings-dialog" />
      <section
        id="project-settings-dialog"
        tabIndex={-1}
        className="allo-docsuite flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-settings-title"
        aria-describedby="project-settings-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex flex-none items-start gap-3 border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-white to-violet-50 px-5 py-4 pr-16 sm:px-6">
          <div className="rounded-xl bg-indigo-100 p-2 text-indigo-700" aria-hidden="true"><Settings2 size={22}/></div>
          <div>
            <h3 id="project-settings-title" className="text-lg font-black text-slate-900">{t('project_settings.title')}</h3>
            <p id="project-settings-description" className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
              {tx('project_settings.intro', 'Choose a starting point, then adjust only what this lesson needs.')}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSetIsProjectSettingsOpenToFalse}
            className="absolute right-5 top-4 rounded-full p-2 text-slate-600 transition-colors hover:bg-white hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label={t('common.close')}
          ><X size={20}/></button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6">
          {isSchoolRole && (
            <section aria-labelledby="school-rewards-title" className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-teal-50 p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className={`text-xs font-black uppercase tracking-wider ${isRewardsPortalConnected ? 'text-emerald-700' : 'text-amber-700'}`}>{isRewardsPortalConnected ? 'School rewards connected' : 'Google Education setup required'}</p>
                  <h4 id="school-rewards-title" className="mt-1 text-base font-black text-slate-900">School Rewards & Store</h4>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">A school-owned rewards ledger for staff recognition, private balance emails to managed student addresses, prize previews, and locked trimester checkout. The pilot stays separate from AlloHaven XP and can later point to a district-owned deployment without changing this launcher.</p>
                </div>
                <button type="button" onClick={onOpenSchoolRewards} className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-black shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${isRewardsPortalConnected ? 'bg-emerald-700 text-white hover:bg-emerald-800 focus:ring-emerald-600' : 'border border-amber-500 bg-white text-amber-800 hover:bg-amber-50 focus:ring-amber-500'}`}>{isRewardsPortalConnected ? 'Open School Rewards' : 'Connect School Rewards'}</button>
              </div>
              {typeof onSaveRewardsPortalUrl === 'function' && (
                <form className="mt-4 border-t border-emerald-100 pt-4" onSubmit={function(event) { event.preventDefault(); applyRewardsPortalUrl(rewardsPortalUrlDraft); }}>
                  <label htmlFor="school-rewards-portal-url" className="block text-xs font-black text-slate-700">School or district Apps Script web-app URL</label>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input id="school-rewards-portal-url" type="url" inputMode="url" autoComplete="off" spellCheck={false} defaultValue={rewardsPortalUrlDraft} onChange={function(event) { rewardsPortalUrlDraft = event.target.value; }} aria-describedby="school-rewards-portal-help" placeholder="https://script.google.com/macros/s/…/exec" className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                    <button type="submit" className="min-h-11 rounded-xl border border-emerald-700 bg-white px-4 py-2 text-sm font-black text-emerald-800 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2">{isRewardsPortalConnected ? 'Update connection' : 'Connect portal'}</button>
                    {isRewardsPortalConnected && <button type="button" onClick={function() { applyRewardsPortalUrl(''); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2">Disconnect</button>}
                  </div>
                  <p id="school-rewards-portal-help" className="mt-2 text-xs leading-relaxed text-slate-500">{isRewardsPortalConnected ? 'This device opens the exact Google-hosted /exec deployment. Google sign-in and server-side roles control awards, checkout, and administration.' : 'Deploy the reviewed apps_script/school_rewards package from a managed school account, restrict it to your Google Education domain, and paste its /exec URL here. AlloFlow stores only the launcher address.'}</p>
                </form>
              )}
            </section>
          )}
          {/* School role only. A parent running a lesson for their own child has
              no use for a district personnel-evaluation portal, and offering
              them a field for a district Apps Script URL is actively confusing. */}
          {isSchoolRole && typeof onOpenPrincipalEvaluation === 'function' && (
            <section aria-labelledby="principal-evaluation-title" className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {/* Three record paths sit behind this entry point, so the badge,
                      the button and the prose all have to say which one you are
                      about to get. Before this the not-connected state read
                      "Local preview available", which does not tell a principal
                      whether the tool is ready to use on real staff. */}
                  <p className={`text-xs font-black uppercase tracking-wider ${isEvaluationPortalConnected ? 'text-indigo-700' : 'text-amber-700'}`}>{isEvaluationPortalConnected ? 'District portal connected' : 'On-device workspace · portal not connected'}</p>
                  <h4 id="principal-evaluation-title" className="mt-1 text-base font-black text-slate-900">Principal Evaluation</h4>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
                    {isEvaluationPortalConnected
                      ? 'Opens the Google-authenticated district portal for walkthroughs, formal observations, SPM and SLO workflow, feedback, and trends. Sign-in and server-side assignments decide what each person sees.'
                      : 'Opens the evaluator setup center for three paths: private on-device work, a principal-managed Drive share helper, or the district portal. The private path is per-device (anyone using this device can open it) and is not the official personnel record; connect your district portal for shared, authenticated records. Nothing is uploaded until you deliberately use a district-approved sharing path.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onOpenPrincipalEvaluation}
                  className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-black shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${isEvaluationPortalConnected ? 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500' : 'border border-amber-500 bg-white text-amber-800 hover:bg-amber-50 focus:ring-amber-500'}`}
                >{isEvaluationPortalConnected ? 'Open district portal' : 'Open Educator Evaluation'}</button>
              </div>
              <p className="mt-2 text-xs font-semibold">
                <a
                  href="https://alloflow-cdn.pages.dev/educator-evaluation-manual"
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-700 underline hover:text-indigo-900"
                >Read the user manual</a>
                <span className="ml-1 font-normal text-slate-600">covers the private, principal-managed Drive, and district portal paths, plus the evaluation cycle and privacy.</span>
              </p>
              {!isEvaluationPortalConnected && <p className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-900"><strong>Need the middle path?</strong> Open Educator Evaluation, choose <strong>Setup</strong>, then select <strong>Principal-managed Drive</strong>. A resumable seven-step checklist provides script.new, three source-copy buttons, private-deployment warnings, a helper-link field, and the deployment check.</p>}
              {typeof onSaveEvaluationPortalUrl === 'function' && (
                <>
                  <form className="mt-4 border-t border-indigo-100 pt-4" onSubmit={function(event) { event.preventDefault(); applyEvaluationPortalUrl(portalUrlDraft); }}>
                  <label htmlFor="principal-evaluation-portal-url" className="block text-xs font-black text-slate-700">District Apps Script web-app URL</label>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <input
                      id="principal-evaluation-portal-url"
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      spellCheck={false}
                      defaultValue={portalUrlDraft}
                      onChange={function(event) { portalUrlDraft = event.target.value; }}
                      aria-describedby="principal-evaluation-portal-help"

                      placeholder="https://script.google.com/macros/s/…/exec"
                      className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                    <button type="submit" className="min-h-11 rounded-xl border border-indigo-600 bg-white px-4 py-2 text-sm font-black text-indigo-700 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">{isEvaluationPortalConnected ? 'Update connection' : 'Connect portal'}</button>
                    {isEvaluationPortalConnected && <button type="button" onClick={function() { applyEvaluationPortalUrl(''); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">Disconnect</button>}
                  </div>
                  <p id="principal-evaluation-portal-help" className="mt-2 text-xs leading-relaxed text-slate-500">
                    {isEvaluationPortalConnected ? 'This device will open the exact district /exec deployment in a separate tab. Google sign-in and server assignments control access; emailed links do not.' : 'Paste the district-owned HTTPS Apps Script deployment URL ending in /exec. AlloFlow stores only this launcher address on this device.'}
                  </p>

                  </form>
                  {/* The setup steps used to live only in
                      apps_script/educator_evaluation/README.md, a repo file no
                      principal will ever open. The field above asked for a URL
                      and never said where to get one. */}
                  <details className="mt-4 rounded-xl border border-slate-200 bg-white/70 p-3">
                    <summary className="cursor-pointer text-xs font-black text-slate-800">Where does this URL come from?</summary>
                    <div className="mt-2 space-y-2 text-xs leading-relaxed text-slate-600">
                      <p><strong>This is not a self-serve setup.</strong> The portal is a Google Apps Script web app that a district-controlled Workspace account deploys and owns. It holds personnel records, so your district has to review and approve it first.</p>
                      <ol className="ml-4 list-decimal space-y-1">
                        <li>Your district creates an Apps Script project from the AlloFlow Educator Evaluation package and reviews the source and its permissions.</li>
                        <li>They deploy it as a Web app with <strong>Execute as: the district owner</strong> and <strong>Who has access: users in your domain</strong>. Never "Anyone".</li>
                        <li>They run the one-time setup with your school's staff list, evaluator assignments, and roles.</li>
                        <li>They give you the deployment URL ending in <code>/exec</code>. Paste it above.</li>
                      </ol>
                      <p>AlloFlow stores only that launcher address, on this device. It never holds the records. Access is decided by Google sign-in and the assignments your district configured, so sharing the link or the QR code does not give anyone access they do not already have.</p>
                      <p>The full setup and compliance checklist ships with the package, at <code className="break-all">apps_script/educator_evaluation/README.md</code>.</p>
                    </div>
                  </details>
                  <EvaluationPortalQr t={t} url={isEvaluationPortalConnected ? evaluationPortalUrl : ''} />
                </>
              )}
            </section>
          )}
          <fieldset>
            <legend className="text-xs font-black uppercase tracking-wider text-slate-600">
              {tx('project_settings.starting_point', 'Starting point')}
            </legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-3" role="group" aria-label={tx('project_settings.starting_point', 'Starting point')}>
              {presetOptions.map((preset) => {
                var selected = presetMatches(preset.id);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => applyPreset(preset.id)}
                    className={`rounded-xl border p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${selected ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-sm font-black text-slate-900">{preset.title}</span>
                      {preset.badge && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-indigo-700">{preset.badge}</span>}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-600">{preset.description}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-black uppercase tracking-wider text-slate-600">
              {tx('project_settings.everyday_controls', 'Everyday controls')}
            </legend>
            <p className="mt-1 text-xs text-slate-600">{tx('project_settings.everyday_controls_desc', 'The settings teachers change most often for a lesson.')}</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                {renderFeatureToggle('proj-hide-student-ai', 'hideStudentAiFeatures', tx('project_settings.hide_student_ai', 'Hide student AI tools'), tx('project_settings.hide_student_ai_desc', 'Remove student-facing AI controls from this project. Teacher authoring tools remain available.'), false)}
              </div>
              <div className="sm:col-span-2">
                {/* Process Provenance opt-in. Without this the ledger is never
                    created at all — the student-side collection gate reads it
                    off the assignment packet. */}
                {renderFeatureToggle('proj-work-story', 'workStoryEnabled', tx('project_settings.work_story', 'Include a Work Story with student submissions'), tx('project_settings.work_story_desc', 'Students see a plain-language record of how their work came together and choose whether to send it. You see time, revision pattern and which AlloFlow supports were used, never a score, and never what they typed.'), false)}
              </div>
              <div className='sm:col-span-2'>
                {renderFeatureToggle(
                  'proj-allow-student-byok-ai',
                  'allowStudentByokAi',
                  tx('project_settings.allow_student_byok_ai', 'Allow students to connect their own AI provider'),
                  tx('project_settings.allow_student_byok_ai_desc', 'QR and Class Mailbox links stay AI-off by default. Enable only when school or district policy permits student-managed provider accounts and charges. Students must verify their own session-only key; your API key is never shared.'),
                  false
                )}
              </div>
              {renderFeatureToggle('proj-dictation', 'allowDictation', t('project_settings.enable_dictation'), t('project_settings.dictation_desc'), true)}
              {renderFeatureToggle('proj-socratic', 'allowSocraticTutor', t('project_settings.enable_socratic'), t('project_settings.socratic_desc'), true)}
              {renderFeatureToggle('proj-free-response', 'allowFreeResponse', t('project_settings.enable_free_response'), t('project_settings.free_response_desc'), true)}
              {renderFeatureToggle('proj-persona-free', 'allowPersonaFreeResponse', t('project_settings.enable_persona_free'), t('project_settings.persona_free_desc'), true)}
            </div>
          </fieldset>

          <details className="group rounded-xl border border-slate-200 bg-slate-50">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
              <span>
                <span className="flex items-center gap-2 text-sm font-black text-slate-900"><Settings2 size={16} aria-hidden="true"/> {tx('project_settings.advanced_title', 'Advanced lesson configuration')}</span>
                <span className="mt-1 block text-xs text-slate-600">{tx('project_settings.advanced_desc', 'Learner identity, tutor guidance, XP pacing, permissions, and privacy.')}</span>
              </span>
              <span className="text-lg font-bold text-indigo-600 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
            </summary>

            <div className="space-y-6 border-t border-slate-200 bg-white p-4">
              <section aria-labelledby="project-settings-profile-heading">
                <h4 id="project-settings-profile-heading" className="text-xs font-black uppercase tracking-wider text-slate-600">{tx('project_settings.learner_profile', 'Learner profile')}</h4>
                <label htmlFor="proj-nickname" className="mt-3 block text-sm font-bold text-slate-800">
                  {tx('project_settings.nickname_label', 'Preferred name or codename')}
                </label>
                <input
                  id="proj-nickname"
                  type="text"
                  maxLength={80}
                  value={studentProjectSettings.nickname || ''}
                  onChange={(event) => updateSetting('nickname', event.target.value.slice(0, 80))}
                  placeholder={tx('project_settings.nickname_placeholder', 'Optional name used in saved work')}
                  className="mt-1 w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
                />
                <p className="mt-1 text-xs text-slate-600">{tx('project_settings.nickname_desc', 'Use a codename when identifiable student information should not appear in project files.')}</p>
              </section>

              {isTeacherMode && studentProjectSettings.allowSocraticTutor !== false && (
                <section aria-labelledby="project-settings-tutor-heading">
                  <h4 id="project-settings-tutor-heading" className="text-xs font-black uppercase tracking-wider text-slate-600">{tx('project_settings.tutor_guidance', 'Tutor guidance')}</h4>
                  <label htmlFor="proj-socratic-instructions" className="mt-3 block text-sm font-bold text-slate-800">{t('project_settings.socratic_instructions_label')}</label>
                  <p className="mt-1 text-xs text-slate-600">{t('project_settings.socratic_instructions_desc')}</p>
                  <textarea
                    id="proj-socratic-instructions"
                    value={studentProjectSettings.socraticCustomInstructions || ''}
                    onChange={(event) => updateSetting('socraticCustomInstructions', event.target.value.slice(0, 600))}
                    maxLength={600}
                    rows={3}
                    placeholder={t('project_settings.socratic_instructions_placeholder')}
                    className="mt-2 w-full resize-y rounded-lg border-2 border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
                  />
                  <div className="mt-1 text-right text-[11px] font-medium text-slate-500">{(studentProjectSettings.socraticCustomInstructions || '').length}/600</div>
                </section>
              )}

              <section aria-labelledby="project-settings-progression-heading">
                <h4 id="project-settings-progression-heading" className="text-xs font-black uppercase tracking-wider text-slate-600">{tx('project_settings.progression', 'Progression and XP')}</h4>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <label className="text-sm font-bold text-slate-800">
                    <span className="flex items-center gap-2"><MapIcon size={16} className="text-emerald-600" aria-hidden="true"/> {t('project_settings.unlock_xp')}</span>
                    <input data-help-key="settings_unlock_xp" type="number" min="0" step="100" value={studentProjectSettings.adventureUnlockXP ?? 0} onChange={(event) => updateSetting('adventureUnlockXP', Math.max(0, parseInt(event.target.value, 10) || 0))} className="mt-1 w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"/>
                    <span className="mt-1 block text-[11px] font-normal leading-relaxed text-slate-600">{t('project_settings.unlock_xp_desc')}</span>
                  </label>
                  <label className="text-sm font-bold text-slate-800">
                    <span className="flex items-center gap-2"><Trophy size={16} className="text-blue-600" aria-hidden="true"/> {t('project_settings.base_xp')}</span>
                    <input data-help-key="settings_base_xp" type="number" min="10" step="10" value={studentProjectSettings.baseXP ?? 100} onChange={(event) => updateSetting('baseXP', Math.max(10, parseInt(event.target.value, 10) || 100))} className="mt-1 w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"/>
                    <span className="mt-1 block text-[11px] font-normal leading-relaxed text-slate-600">{t('project_settings.base_xp_desc')}</span>
                  </label>
                  <label className="text-sm font-bold text-slate-800">
                    <span className="flex items-center gap-2"><Trophy size={16} className="text-amber-600" aria-hidden="true"/> {t('project_settings.storybook_xp')}</span>
                    <input data-help-key="settings_adventure_xp" type="number" min="0" step="100" value={studentProjectSettings.adventureMinXP ?? 0} onChange={(event) => updateSetting('adventureMinXP', Math.max(0, parseInt(event.target.value, 10) || 0))} className="mt-1 w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"/>
                    <span className="mt-1 block text-[11px] font-normal leading-relaxed text-slate-600">{t('project_settings.storybook_xp_desc')}</span>
                  </label>
                </div>
              </section>

              <fieldset>
                <legend className="text-xs font-black uppercase tracking-wider text-slate-600">{t('project_settings.permissions_header')}</legend>
                <p className="mt-1 text-xs text-slate-600">{tx('project_settings.permissions_desc', 'Control which Adventure setup choices students may change.')}</p>
                {/* Governs the whole feature, so it sits above the per-choice
                    permissions. Off hides the Adventure panel from students
                    entirely, for lessons that do not have an adventure. */}
                <div className="mt-3">
                  {renderFeatureToggle('proj-adventure-enabled', 'adventureEnabled', tx('project_settings.enable_adventure', 'Include Adventure in this assignment'), tx('project_settings.enable_adventure_desc', 'Off hides the Adventure panel from students. Use this when the lesson has no adventure.'), true)}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {renderPermissionToggle('proj-perm-difficulty', 'allowDifficultySwitch', t('project_settings.perm_difficulty'), tx('project_settings.perm_difficulty_desc', 'Change the challenge level.'), true)}
                  {renderPermissionToggle('proj-perm-mode', 'allowModeSwitch', t('project_settings.perm_mode'), tx('project_settings.perm_mode_desc', 'Choose how responses are entered.'), false)}
                  {renderPermissionToggle('proj-perm-language', 'allowLanguageSwitch', tx('project_settings.perm_language', 'Change language'), tx('project_settings.perm_language_desc', 'Choose from teacher-provided languages.'), true)}
                  {renderPermissionToggle('proj-perm-custom', 'allowCustomInstructions', t('project_settings.perm_custom'), tx('project_settings.perm_custom_desc', 'Add custom story guidance.'), false)}
                  {renderPermissionToggle('proj-perm-visuals', 'allowVisualsToggle', t('project_settings.perm_visuals'), tx('project_settings.perm_visuals_desc', 'Change visual-generation quality settings.'), true)}
                  {renderPermissionToggle('proj-perm-cloud', 'allowCloudImageStorage', tx('project_settings.perm_cloud', 'Allow cloud image storage'), tx('project_settings.perm_cloud_desc', 'Privacy-sensitive: allow generated Adventure images to be stored online.'), false)}
                </div>
                <div className="mt-3">
                  {renderPermissionToggle('proj-lock-all', 'lockAllSettings', t('project_settings.perm_lock_all'), tx('project_settings.perm_lock_all_desc', 'Freeze all student-facing Adventure setup controls.'), false, 'danger')}
                </div>
              </fieldset>
            </div>
          </details>

          <button
            type="button"
            onClick={() => {
              try {
                if (window.AlloModules && window.AlloModules.ErrorReporter && window.AlloModules.ErrorReporter.openPanel) {
                  window.AlloModules.ErrorReporter.openPanel();
                  handleSetIsProjectSettingsOpenToFalse();
                } else {
                  window.open('https://docs.google.com/forms/d/e/1FAIpQLSd9dJexeOjd6fvFio9V0Jd45FDpuL7cSQNnm-BLmqyTwrPrhg/viewform', '_blank', 'noopener,noreferrer');
                }
              } catch (error) {
                console.warn('[Settings] Report-a-problem button failed:', error);
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-700"
          >
            <CircleHelp size={14} aria-hidden="true"/>
            {tx('project_settings.feedback', 'Report a problem or send feedback')}
          </button>
        </div>

        <footer className="flex flex-none items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:px-6">
          <p className="text-xs text-slate-600">{tx('project_settings.saved_with_project', 'Changes apply immediately and are saved with student projects.')}</p>
          <button
            type="button"
            data-help-key="settings_close_btn"
            onClick={handleSetIsProjectSettingsOpenToFalse}
            className="flex-none rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {t('common.close')}
          </button>
        </footer>
      </section>
    </div>
  );
}
