/**
 * AlloFlow View - Project Settings Modal
 * Progressive-disclosure teacher controls with Guided, Balanced, and Open
 * presets; four everyday learner-support choices; and advanced identity,
 * tutor-guidance, XP, Adventure permission, privacy, and locking controls.
 * Backdrop click + Escape both dismiss; settings update the host state directly.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.ProjectSettingsView) {
    console.log('[CDN] ViewProjectSettingsModule already loaded, skipping'); return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewProjectSettingsModule] React not found'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var X = _lazyIcon('X');
  var Settings2 = _lazyIcon('Settings2');
  var MapIcon = _lazyIcon('MapIcon');
  var Trophy = _lazyIcon('Trophy');
  var Lock = _lazyIcon('Lock');
  var CircleHelp = _lazyIcon('CircleHelp');

  function EvaluationPortalQr(props) {
  var React = window.React;
  var url = String(props && props.url || '').trim();
  var _state = React.useState({
    status: 'loading',
    svg: '',
    error: ''
  });
  var state = _state[0];
  var setState = _state[1];
  React.useEffect(function () {
    if (!url) return undefined;
    var cancelled = false;
    var timer = null;
    var attempts = 0;
    var build = function () {
      if (cancelled) return;
      var makeQr = window.__alloMakeQrSvg;
      if (typeof makeQr !== 'function') {
        if (attempts++ < 20) {
          timer = setTimeout(build, 250);
        } else if (!cancelled) {
          setState({
            status: 'error',
            svg: '',
            error: 'The QR generator is not available in this build.'
          });
        }
        return;
      }
      Promise.resolve(makeQr(url, 'Educator Evaluation district portal')).then(function (svg) {
        if (!cancelled) setState({
          status: 'ready',
          svg: String(svg || ''),
          error: ''
        });
      }).catch(function (error) {
        if (!cancelled) setState({
          status: 'error',
          svg: '',
          error: String(error && error.message || 'The QR code could not be generated.')
        });
      });
    };
    setState({
      status: 'loading',
      svg: '',
      error: ''
    });
    build();
    return function () {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [url]);
  if (!url) return null;
  var copyPortalLink = function () {
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
  return /*#__PURE__*/React.createElement("div", {
    className: "mt-4 grid gap-4 rounded-2xl border border-violet-200 bg-violet-50/60 p-4 sm:grid-cols-[auto,1fr] sm:items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex min-h-44 min-w-44 items-center justify-center rounded-xl border-2 border-violet-200 bg-white p-3",
    "aria-label": "Educator Evaluation district portal QR code"
  }, state.status === 'ready' && state.svg ? /*#__PURE__*/React.createElement("div", {
    className: "h-40 w-40 [&_svg]:h-full [&_svg]:w-full",
    dangerouslySetInnerHTML: {
      __html: state.svg
    }
  }) : /*#__PURE__*/React.createElement("span", {
    className: "px-3 text-center text-xs font-bold text-violet-800"
  }, state.status === 'error' ? 'QR unavailable' : 'Preparing QR code…')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-black uppercase tracking-wider text-violet-700"
  }, "Portal QR code"), /*#__PURE__*/React.createElement("h5", {
    className: "mt-1 text-sm font-black text-slate-900"
  }, "Open the district evaluation portal on another device"), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-xs leading-relaxed text-slate-600"
  }, "Scanning opens the same authenticated district portal. Google sign-in and server-side assignments still control access; the QR code does not grant permission by itself."), state.error && /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-xs font-bold text-rose-700"
  }, state.error), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: copyPortalLink,
    className: "mt-3 min-h-10 rounded-xl border border-violet-300 bg-white px-3 py-2 text-xs font-black text-violet-800 hover:bg-violet-100 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
  }, "Copy portal link")));
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
  // This view intentionally remains hook-free because it is also invoked by
  // project export/test renderers. The uncontrolled input updates this
  // render-closure draft; the host owns persistence, validation, and toasts.
  var portalUrlDraft = evaluationPortalUrl;
  var applyEvaluationPortalUrl = function (value) {
    if (typeof onSaveEvaluationPortalUrl !== 'function') return;
    var result = onSaveEvaluationPortalUrl(value);
    if (result && result.ok !== false && typeof result.url === 'string') portalUrlDraft = result.url;
    return result;
  };
  var permissions = studentProjectSettings.adventurePermissions || {};
  var tx = function (key, fallback) {
    try {
      var value = t(key);
      return value && value !== key ? value : fallback;
    } catch (_) {
      return fallback;
    }
  };
  var updateSetting = function (key, value) {
    setStudentProjectSettings(function (prev) {
      return {
        ...prev,
        [key]: value
      };
    });
  };
  var updatePermission = function (key, value) {
    setStudentProjectSettings(function (prev) {
      return {
        ...prev,
        adventurePermissions: {
          ...(prev.adventurePermissions || {}),
          [key]: value
        }
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
  var presetMatches = function (name) {
    var preset = presets[name];
    var settingKeys = ['hideStudentAiFeatures', 'allowDictation', 'allowSocraticTutor', 'allowFreeResponse', 'allowPersonaFreeResponse', 'workStoryEnabled'];
    var permissionKeys = Object.keys(preset.adventurePermissions);
    return settingKeys.every(function (key) {
      return studentProjectSettings[key] === preset[key];
    }) && permissionKeys.every(function (key) {
      return permissions[key] === preset.adventurePermissions[key];
    });
  };
  var applyPreset = function (name) {
    var preset = presets[name];
    setStudentProjectSettings(function (prev) {
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
  var renderFeatureToggle = function (id, settingKey, label, description, defaultValue) {
    var checked = studentProjectSettings[settingKey];
    if (checked === undefined) checked = defaultValue;
    return /*#__PURE__*/React.createElement("label", {
      htmlFor: id,
      className: `flex min-h-[88px] cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${checked ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'}`
    }, /*#__PURE__*/React.createElement("input", {
      id: id,
      type: "checkbox",
      checked: Boolean(checked),
      onChange: event => updateSetting(settingKey, event.target.checked),
      className: "mt-0.5 h-5 w-5 flex-none cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
    }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      className: "block text-sm font-bold text-slate-800"
    }, label), /*#__PURE__*/React.createElement("span", {
      className: "mt-1 block text-xs leading-relaxed text-slate-600"
    }, description)));
  };
  var renderPermissionToggle = function (id, permissionKey, label, description, defaultValue, tone) {
    var checked = permissions[permissionKey];
    if (checked === undefined) checked = defaultValue;
    var danger = tone === 'danger';
    return /*#__PURE__*/React.createElement("label", {
      htmlFor: id,
      className: `flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-3 ${danger ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'}`
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      className: `block text-sm font-bold ${danger ? 'text-rose-800' : 'text-slate-800'}`
    }, label), description && /*#__PURE__*/React.createElement("span", {
      className: `mt-0.5 block text-xs leading-relaxed ${danger ? 'text-rose-700' : 'text-slate-600'}`
    }, description)), /*#__PURE__*/React.createElement("input", {
      id: id,
      type: "checkbox",
      checked: Boolean(checked),
      onChange: event => updatePermission(permissionKey, event.target.checked),
      className: `mt-0.5 h-5 w-5 flex-none cursor-pointer rounded border-slate-300 focus:ring-2 ${danger ? 'text-rose-600 focus:ring-rose-500' : 'text-indigo-600 focus:ring-indigo-500'}`
    }));
  };
  var presetOptions = [{
    id: 'guided',
    title: tx('project_settings.preset_guided', 'Guided'),
    description: tx('project_settings.preset_guided_desc', 'Tighter guardrails and fewer student choices.')
  }, {
    id: 'balanced',
    title: tx('project_settings.preset_balanced', 'Balanced'),
    badge: tx('project_settings.recommended', 'Recommended'),
    description: tx('project_settings.preset_balanced_desc', 'Common supports on with advanced choices limited.')
  }, {
    id: 'open',
    title: tx('project_settings.preset_open', 'Open exploration'),
    description: tx('project_settings.preset_open_desc', 'More student control and customization.')
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm animate-in fade-in duration-200 sm:p-6",
    onMouseDown: event => {
      if (event.target === event.currentTarget) handleSetIsProjectSettingsOpenToFalse();
    },
    onKeyDown: event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleSetIsProjectSettingsOpenToFalse();
      }
    }
  }, /*#__PURE__*/React.createElement("section", {
    className: "flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-2xl",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "project-settings-title",
    "aria-describedby": "project-settings-description",
    onMouseDown: event => event.stopPropagation()
  }, /*#__PURE__*/React.createElement("header", {
    className: "flex flex-none items-start gap-3 border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-white to-violet-50 px-5 py-4 pr-16 sm:px-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl bg-indigo-100 p-2 text-indigo-700",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement(Settings2, {
    size: 22
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    id: "project-settings-title",
    className: "text-lg font-black text-slate-900"
  }, t('project_settings.title')), /*#__PURE__*/React.createElement("p", {
    id: "project-settings-description",
    className: "mt-1 max-w-2xl text-sm leading-relaxed text-slate-600"
  }, tx('project_settings.intro', 'Choose a starting point, then adjust only what this lesson needs.'))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleSetIsProjectSettingsOpenToFalse,
    className: "absolute right-5 top-4 rounded-full p-2 text-slate-600 transition-colors hover:bg-white hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    className: "min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6"
  }, isSchoolRole && typeof onOpenPrincipalEvaluation === 'function' && /*#__PURE__*/React.createElement("section", {
    "aria-labelledby": "principal-evaluation-title",
    className: "rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-4 shadow-sm sm:p-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: `text-xs font-black uppercase tracking-wider ${isEvaluationPortalConnected ? 'text-indigo-700' : 'text-amber-700'}`
  }, isEvaluationPortalConnected ? 'District portal connected' : 'Demonstration only, not connected'), /*#__PURE__*/React.createElement("h4", {
    id: "principal-evaluation-title",
    className: "mt-1 text-base font-black text-slate-900"
  }, "Principal Evaluation"), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 max-w-2xl text-sm leading-relaxed text-slate-600"
  }, isEvaluationPortalConnected ? 'Opens the Google-authenticated district portal for walkthroughs, formal observations, SPM and SLO workflow, feedback, and trends. Sign-in and server-side assignments decide what each person sees.' : 'No district portal is connected, so this opens a demonstration you can click through. Anything you type stays in this browser, is visible to anyone using this device, and is not a personnel record. Do not enter real staff information here.')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onOpenPrincipalEvaluation,
    className: `shrink-0 rounded-xl px-4 py-2.5 text-sm font-black shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${isEvaluationPortalConnected ? 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500' : 'border border-amber-500 bg-white text-amber-800 hover:bg-amber-50 focus:ring-amber-500'}`
  }, isEvaluationPortalConnected ? 'Open district portal' : 'Open the demonstration')), typeof onSaveEvaluationPortalUrl === 'function' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("form", {
    className: "mt-4 border-t border-indigo-100 pt-4",
    onSubmit: function (event) {
      event.preventDefault();
      applyEvaluationPortalUrl(portalUrlDraft);
    }
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: "principal-evaluation-portal-url",
    className: "block text-xs font-black text-slate-700"
  }, "District Apps Script web-app URL"), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex flex-col gap-2 sm:flex-row"
  }, /*#__PURE__*/React.createElement("input", {
    id: "principal-evaluation-portal-url",
    type: "url",
    inputMode: "url",
    autoComplete: "off",
    spellCheck: false,
    defaultValue: portalUrlDraft,
    onChange: function (event) {
      portalUrlDraft = event.target.value;
    },
    "aria-describedby": "principal-evaluation-portal-help",
    placeholder: "https://script.google.com/macros/s/…/exec",
    className: "min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
  }), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "min-h-11 rounded-xl border border-indigo-600 bg-white px-4 py-2 text-sm font-black text-indigo-700 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
  }, isEvaluationPortalConnected ? 'Update connection' : 'Connect portal'), isEvaluationPortalConnected && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      applyEvaluationPortalUrl('');
    },
    className: "min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
  }, "Disconnect")), /*#__PURE__*/React.createElement("p", {
    id: "principal-evaluation-portal-help",
    className: "mt-2 text-xs leading-relaxed text-slate-500"
  }, isEvaluationPortalConnected ? 'This device will open the exact district /exec deployment in a separate tab. Google sign-in and server assignments control access; emailed links do not.' : 'Paste the district-owned HTTPS Apps Script deployment URL ending in /exec. AlloFlow stores only this launcher address on this device.')), /*#__PURE__*/React.createElement("details", {
    className: "mt-4 rounded-xl border border-slate-200 bg-white/70 p-3"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "cursor-pointer text-xs font-black text-slate-800"
  }, "Where does this URL come from?"), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 space-y-2 text-xs leading-relaxed text-slate-600"
  }, /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "This is not a self-serve setup."), " The portal is a Google Apps Script web app that a district-controlled Workspace account deploys and owns. It holds personnel records, so your district has to review and approve it first."), /*#__PURE__*/React.createElement("ol", {
    className: "ml-4 list-decimal space-y-1"
  }, /*#__PURE__*/React.createElement("li", null, "Your district creates an Apps Script project from the AlloFlow Educator Evaluation package and reviews the source and its permissions."), /*#__PURE__*/React.createElement("li", null, "They deploy it as a Web app with ", /*#__PURE__*/React.createElement("strong", null, "Execute as: the district owner"), " and ", /*#__PURE__*/React.createElement("strong", null, "Who has access: users in your domain"), ". Never \"Anyone\"."), /*#__PURE__*/React.createElement("li", null, "They run the one-time setup with your school's staff list, evaluator assignments, and roles."), /*#__PURE__*/React.createElement("li", null, "They give you the deployment URL ending in ", /*#__PURE__*/React.createElement("code", null, "/exec"), ". Paste it above.")), /*#__PURE__*/React.createElement("p", null, "AlloFlow stores only that launcher address, on this device. It never holds the records. Access is decided by Google sign-in and the assignments your district configured, so sharing the link or the QR code does not give anyone access they do not already have."), /*#__PURE__*/React.createElement("p", null, "The full setup and compliance checklist ships with the package, at ", /*#__PURE__*/React.createElement("code", null, "apps_script/educator_evaluation/README.md"), "."))), /*#__PURE__*/React.createElement(EvaluationPortalQr, {
    url: isEvaluationPortalConnected ? evaluationPortalUrl : ''
  }))), /*#__PURE__*/React.createElement("fieldset", null, /*#__PURE__*/React.createElement("legend", {
    className: "text-xs font-black uppercase tracking-wider text-slate-600"
  }, tx('project_settings.starting_point', 'Starting point')), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 grid gap-2 sm:grid-cols-3",
    role: "group",
    "aria-label": tx('project_settings.starting_point', 'Starting point')
  }, presetOptions.map(preset => {
    var selected = presetMatches(preset.id);
    return /*#__PURE__*/React.createElement("button", {
      key: preset.id,
      type: "button",
      "aria-pressed": selected,
      onClick: () => applyPreset(preset.id),
      className: `rounded-xl border p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${selected ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'}`
    }, /*#__PURE__*/React.createElement("span", {
      className: "flex items-center justify-between gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-sm font-black text-slate-900"
    }, preset.title), preset.badge && /*#__PURE__*/React.createElement("span", {
      className: "rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-indigo-700"
    }, preset.badge)), /*#__PURE__*/React.createElement("span", {
      className: "mt-1 block text-xs leading-relaxed text-slate-600"
    }, preset.description));
  }))), /*#__PURE__*/React.createElement("fieldset", null, /*#__PURE__*/React.createElement("legend", {
    className: "text-xs font-black uppercase tracking-wider text-slate-600"
  }, tx('project_settings.everyday_controls', 'Everyday controls')), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-xs text-slate-600"
  }, tx('project_settings.everyday_controls_desc', 'The settings teachers change most often for a lesson.')), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 grid gap-3 sm:grid-cols-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sm:col-span-2"
  }, renderFeatureToggle('proj-hide-student-ai', 'hideStudentAiFeatures', tx('project_settings.hide_student_ai', 'Hide student AI tools'), tx('project_settings.hide_student_ai_desc', 'Remove student-facing AI controls from this project. Teacher authoring tools remain available.'), false)), /*#__PURE__*/React.createElement("div", {
    className: "sm:col-span-2"
  }, renderFeatureToggle('proj-work-story', 'workStoryEnabled', tx('project_settings.work_story', 'Include a Work Story with student submissions'), tx('project_settings.work_story_desc', 'Students see a plain-language record of how their work came together and choose whether to send it. You see time, revision pattern and which AlloFlow supports were used, never a score, and never what they typed.'), false)), /*#__PURE__*/React.createElement("div", {
    className: "sm:col-span-2"
  }, renderFeatureToggle('proj-allow-student-byok-ai', 'allowStudentByokAi', tx('project_settings.allow_student_byok_ai', 'Allow students to connect their own AI provider'), tx('project_settings.allow_student_byok_ai_desc', 'QR and Class Mailbox links stay AI-off by default. Enable only when school or district policy permits student-managed provider accounts and charges. Students must verify their own session-only key; your API key is never shared.'), false)), renderFeatureToggle('proj-dictation', 'allowDictation', t('project_settings.enable_dictation'), t('project_settings.dictation_desc'), true), renderFeatureToggle('proj-socratic', 'allowSocraticTutor', t('project_settings.enable_socratic'), t('project_settings.socratic_desc'), true), renderFeatureToggle('proj-free-response', 'allowFreeResponse', t('project_settings.enable_free_response'), t('project_settings.free_response_desc'), true), renderFeatureToggle('proj-persona-free', 'allowPersonaFreeResponse', t('project_settings.enable_persona_free'), t('project_settings.persona_free_desc'), true))), /*#__PURE__*/React.createElement("details", {
    className: "group rounded-xl border border-slate-200 bg-slate-50"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2 text-sm font-black text-slate-900"
  }, /*#__PURE__*/React.createElement(Settings2, {
    size: 16,
    "aria-hidden": "true"
  }), " ", tx('project_settings.advanced_title', 'Advanced lesson configuration')), /*#__PURE__*/React.createElement("span", {
    className: "mt-1 block text-xs text-slate-600"
  }, tx('project_settings.advanced_desc', 'Learner identity, tutor guidance, XP pacing, permissions, and privacy.'))), /*#__PURE__*/React.createElement("span", {
    className: "text-lg font-bold text-indigo-600 transition-transform group-open:rotate-45",
    "aria-hidden": "true"
  }, "+")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-6 border-t border-slate-200 bg-white p-4"
  }, /*#__PURE__*/React.createElement("section", {
    "aria-labelledby": "project-settings-profile-heading"
  }, /*#__PURE__*/React.createElement("h4", {
    id: "project-settings-profile-heading",
    className: "text-xs font-black uppercase tracking-wider text-slate-600"
  }, tx('project_settings.learner_profile', 'Learner profile')), /*#__PURE__*/React.createElement("label", {
    htmlFor: "proj-nickname",
    className: "mt-3 block text-sm font-bold text-slate-800"
  }, tx('project_settings.nickname_label', 'Preferred name or codename')), /*#__PURE__*/React.createElement("input", {
    id: "proj-nickname",
    type: "text",
    maxLength: 80,
    value: studentProjectSettings.nickname || '',
    onChange: event => updateSetting('nickname', event.target.value.slice(0, 80)),
    placeholder: tx('project_settings.nickname_placeholder', 'Optional name used in saved work'),
    className: "mt-1 w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
  }), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-xs text-slate-600"
  }, tx('project_settings.nickname_desc', 'Use a codename when identifiable student information should not appear in project files.'))), isTeacherMode && studentProjectSettings.allowSocraticTutor !== false && /*#__PURE__*/React.createElement("section", {
    "aria-labelledby": "project-settings-tutor-heading"
  }, /*#__PURE__*/React.createElement("h4", {
    id: "project-settings-tutor-heading",
    className: "text-xs font-black uppercase tracking-wider text-slate-600"
  }, tx('project_settings.tutor_guidance', 'Tutor guidance')), /*#__PURE__*/React.createElement("label", {
    htmlFor: "proj-socratic-instructions",
    className: "mt-3 block text-sm font-bold text-slate-800"
  }, t('project_settings.socratic_instructions_label')), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-xs text-slate-600"
  }, t('project_settings.socratic_instructions_desc')), /*#__PURE__*/React.createElement("textarea", {
    id: "proj-socratic-instructions",
    value: studentProjectSettings.socraticCustomInstructions || '',
    onChange: event => updateSetting('socraticCustomInstructions', event.target.value.slice(0, 600)),
    maxLength: 600,
    rows: 3,
    placeholder: t('project_settings.socratic_instructions_placeholder'),
    className: "mt-2 w-full resize-y rounded-lg border-2 border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mt-1 text-right text-[11px] font-medium text-slate-500"
  }, (studentProjectSettings.socraticCustomInstructions || '').length, "/600")), /*#__PURE__*/React.createElement("section", {
    "aria-labelledby": "project-settings-progression-heading"
  }, /*#__PURE__*/React.createElement("h4", {
    id: "project-settings-progression-heading",
    className: "text-xs font-black uppercase tracking-wider text-slate-600"
  }, tx('project_settings.progression', 'Progression and XP')), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 grid gap-3 sm:grid-cols-3"
  }, /*#__PURE__*/React.createElement("label", {
    className: "text-sm font-bold text-slate-800"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(MapIcon, {
    size: 16,
    className: "text-emerald-600",
    "aria-hidden": "true"
  }), " ", t('project_settings.unlock_xp')), /*#__PURE__*/React.createElement("input", {
    "data-help-key": "settings_unlock_xp",
    type: "number",
    min: "0",
    step: "100",
    value: studentProjectSettings.adventureUnlockXP ?? 0,
    onChange: event => updateSetting('adventureUnlockXP', Math.max(0, parseInt(event.target.value, 10) || 0)),
    className: "mt-1 w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
  }), /*#__PURE__*/React.createElement("span", {
    className: "mt-1 block text-[11px] font-normal leading-relaxed text-slate-600"
  }, t('project_settings.unlock_xp_desc'))), /*#__PURE__*/React.createElement("label", {
    className: "text-sm font-bold text-slate-800"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Trophy, {
    size: 16,
    className: "text-blue-600",
    "aria-hidden": "true"
  }), " ", t('project_settings.base_xp')), /*#__PURE__*/React.createElement("input", {
    "data-help-key": "settings_base_xp",
    type: "number",
    min: "10",
    step: "10",
    value: studentProjectSettings.baseXP ?? 100,
    onChange: event => updateSetting('baseXP', Math.max(10, parseInt(event.target.value, 10) || 100)),
    className: "mt-1 w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
  }), /*#__PURE__*/React.createElement("span", {
    className: "mt-1 block text-[11px] font-normal leading-relaxed text-slate-600"
  }, t('project_settings.base_xp_desc'))), /*#__PURE__*/React.createElement("label", {
    className: "text-sm font-bold text-slate-800"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Trophy, {
    size: 16,
    className: "text-amber-600",
    "aria-hidden": "true"
  }), " ", t('project_settings.storybook_xp')), /*#__PURE__*/React.createElement("input", {
    "data-help-key": "settings_adventure_xp",
    type: "number",
    min: "0",
    step: "100",
    value: studentProjectSettings.adventureMinXP ?? 0,
    onChange: event => updateSetting('adventureMinXP', Math.max(0, parseInt(event.target.value, 10) || 0)),
    className: "mt-1 w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
  }), /*#__PURE__*/React.createElement("span", {
    className: "mt-1 block text-[11px] font-normal leading-relaxed text-slate-600"
  }, t('project_settings.storybook_xp_desc'))))), /*#__PURE__*/React.createElement("fieldset", null, /*#__PURE__*/React.createElement("legend", {
    className: "text-xs font-black uppercase tracking-wider text-slate-600"
  }, t('project_settings.permissions_header')), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-xs text-slate-600"
  }, tx('project_settings.permissions_desc', 'Control which Adventure setup choices students may change.')), /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, renderFeatureToggle('proj-adventure-enabled', 'adventureEnabled', tx('project_settings.enable_adventure', 'Include Adventure in this assignment'), tx('project_settings.enable_adventure_desc', 'Off hides the Adventure panel from students. Use this when the lesson has no adventure.'), true)), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 grid gap-2 sm:grid-cols-2"
  }, renderPermissionToggle('proj-perm-difficulty', 'allowDifficultySwitch', t('project_settings.perm_difficulty'), tx('project_settings.perm_difficulty_desc', 'Change the challenge level.'), true), renderPermissionToggle('proj-perm-mode', 'allowModeSwitch', t('project_settings.perm_mode'), tx('project_settings.perm_mode_desc', 'Choose how responses are entered.'), false), renderPermissionToggle('proj-perm-language', 'allowLanguageSwitch', tx('project_settings.perm_language', 'Change language'), tx('project_settings.perm_language_desc', 'Choose from teacher-provided languages.'), true), renderPermissionToggle('proj-perm-custom', 'allowCustomInstructions', t('project_settings.perm_custom'), tx('project_settings.perm_custom_desc', 'Add custom story guidance.'), false), renderPermissionToggle('proj-perm-visuals', 'allowVisualsToggle', t('project_settings.perm_visuals'), tx('project_settings.perm_visuals_desc', 'Change visual-generation quality settings.'), true), renderPermissionToggle('proj-perm-cloud', 'allowCloudImageStorage', tx('project_settings.perm_cloud', 'Allow cloud image storage'), tx('project_settings.perm_cloud_desc', 'Privacy-sensitive: allow generated Adventure images to be stored online.'), false)), /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, renderPermissionToggle('proj-lock-all', 'lockAllSettings', t('project_settings.perm_lock_all'), tx('project_settings.perm_lock_all_desc', 'Freeze all student-facing Adventure setup controls.'), false, 'danger'))))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
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
    },
    className: "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-700",
    "aria-label": t('a11y.report_problem')
  }, /*#__PURE__*/React.createElement(CircleHelp, {
    size: 14,
    "aria-hidden": "true"
  }), tx('project_settings.feedback', 'Report a problem or send feedback'))), /*#__PURE__*/React.createElement("footer", {
    className: "flex flex-none items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:px-6"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600"
  }, tx('project_settings.saved_with_project', 'Changes apply immediately and are saved with student projects.')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "settings_close_btn",
    onClick: handleSetIsProjectSettingsOpenToFalse,
    className: "flex-none rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
  }, t('common.close')))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ProjectSettingsView = ProjectSettingsView;
  window.AlloModules.ViewProjectSettingsModule = true;
})();
