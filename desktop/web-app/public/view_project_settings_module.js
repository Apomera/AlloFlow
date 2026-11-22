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
  // Routed through the same translator the rest of this file uses. Keys are not
  // in ui_strings.js yet, and the host t() returns undefined on a miss, so the
  // English fallback renders until the translation lane adds them.
  var t = props && props.t || function () {
    return undefined;
  };
  var _state = React.useState({
    status: 'loading',
    svg: '',
    error: ''
  });
  var state = _state[0];
  var setState = _state[1];
  var _copyMsg = React.useState('');
  var copyMsg = _copyMsg[0];
  var setCopyMsg = _copyMsg[1];
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
            error: t('project_settings.qr_unavailable_build') || 'The QR generator is not available in this build.'
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
    var notify = function (ok) {
      setCopyMsg(ok ? t('project_settings.portal_link_copied') || 'Portal link copied.' : t('project_settings.portal_link_copy_failed') || 'Could not copy portal link.');
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        Promise.resolve(navigator.clipboard.writeText(url)).then(function () {
          notify(true);
        }, function () {
          notify(false);
        });
        return;
      }
      var input = document.createElement('textarea');
      input.value = url;
      input.setAttribute('readonly', '');
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      var ok = document.execCommand('copy');
      input.remove();
      notify(ok !== false);
    } catch (_) {
      notify(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "mt-4 grid gap-4 rounded-2xl border border-violet-200 bg-violet-50/60 p-4 sm:grid-cols-[auto,1fr] sm:items-center"
  }, /*#__PURE__*/React.createElement("div", {
    "data-allo-qr-preserve": "true",
    className: "flex min-h-44 min-w-44 items-center justify-center rounded-xl border-2 border-violet-200 bg-white p-3",
    style: {
      backgroundColor: '#ffffff',
      color: '#0f172a',
      forcedColorAdjust: 'none'
    }
  }, state.status === 'ready' && state.svg ? /*#__PURE__*/React.createElement("div", {
    role: "img",
    "aria-label": t('project_settings.portal_qr_aria') || "Educator Evaluation district portal QR code",
    className: "h-40 w-40 [&_svg]:h-full [&_svg]:w-full",
    style: {
      backgroundColor: '#ffffff',
      color: '#000000',
      filter: 'none'
    },
    dangerouslySetInnerHTML: {
      __html: state.svg
    }
  }) : /*#__PURE__*/React.createElement("span", {
    role: state.status === 'error' ? 'alert' : 'status',
    "aria-live": "polite",
    "aria-atomic": "true",
    className: "px-3 text-center text-xs font-bold text-violet-800"
  }, state.status === 'error' ? 'QR unavailable' : 'Preparing QR code…')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-black uppercase tracking-wider text-violet-700"
  }, t('project_settings.portal_qr_label') || "Portal QR code"), /*#__PURE__*/React.createElement("h5", {
    className: "mt-1 text-sm font-black text-slate-900"
  }, t('project_settings.portal_qr_title') || "Open the district evaluation portal on another device"), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-xs leading-relaxed text-slate-600"
  }, "Scanning opens the same authenticated district portal. Google sign-in and server-side assignments still control access; the QR code does not grant permission by itself."), state.error && /*#__PURE__*/React.createElement("p", {
    role: "alert",
    className: "mt-2 text-xs font-bold text-rose-700"
  }, state.error), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex flex-wrap items-center gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: copyPortalLink,
    className: "min-h-11 rounded-xl border border-violet-300 bg-white px-3 py-2 text-xs font-black text-violet-800 hover:bg-violet-100 transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-violet-700 focus-visible:outline-offset-2 focus-visible:ring-2 focus-visible:ring-violet-700 focus-visible:ring-offset-2"
  }, "Copy portal link"), /*#__PURE__*/React.createElement("span", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    className: "text-xs font-bold text-violet-900"
  }, copyMsg))));
}
function ProjectSettingsDisclosure(props) {
  var React = window.React;
  var pair = React.useState(Boolean(props.defaultOpen));
  var open = pair[0];
  var setOpen = pair[1];
  return /*#__PURE__*/React.createElement("details", {
    open: open,
    onToggle: function (event) {
      setOpen(Boolean(event.currentTarget && event.currentTarget.open));
    },
    className: props.className
  }, props.children);
}
function ProjectSettingsDialogFocusManager(props) {
  var React = window.React;
  React.useEffect(function () {
    var root = document.getElementById(props.dialogId);
    if (!root) return undefined;
    var previouslyFocused = document.activeElement;
    var isolatedSiblings = [];
    var node = root.parentElement || root;
    while (node && node.parentElement && node !== document.body) {
      var parent = node.parentElement;
      Array.from(parent.children).forEach(function (sibling) {
        if (sibling === node || /^(SCRIPT|STYLE|LINK|TEMPLATE)$/i.test(sibling.tagName)) return;
        if (typeof sibling.matches === 'function' && sibling.matches('[aria-live], [role="status"], [role="alert"], [data-toast-region]')) return;
        isolatedSiblings.push({
          el: sibling,
          hadInert: sibling.hasAttribute('inert'),
          prevAriaHidden: sibling.getAttribute('aria-hidden')
        });
        sibling.inert = true;
        sibling.setAttribute('inert', '');
        sibling.setAttribute('aria-hidden', 'true');
      });
      node = parent;
    }
    var alloScrollLock = window.__alloScrollLockState || (window.__alloScrollLockState = {
      count: 0,
      prev: ''
    });
    var alloScrollLocked = Boolean(document.body);
    if (alloScrollLocked && ++alloScrollLock.count === 1) {
      alloScrollLock.prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    var trapStack = window.__alloFocusTrapStack || (window.__alloFocusTrapStack = []);
    var trap = {
      root: root
    };
    trapStack.push(trap);
    var isTopTrap = function () {
      return trapStack[trapStack.length - 1] === trap;
    };
    var getFocusableElements = function () {
      return Array.from(root.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [contenteditable="true"], [tabindex]:not([tabindex="-1"])')).filter(function (element) {
        if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
        // A summary stays focusable; controls inside any closed disclosure do not.
        var ancestor = element.parentElement;
        while (ancestor && ancestor !== root) {
          if (ancestor.tagName === 'DETAILS' && !ancestor.open) {
            var summary = ancestor.querySelector(':scope > summary');
            if (!summary || !summary.contains(element)) return false;
          }
          if (typeof window.getComputedStyle === 'function') {
            var aStyle = window.getComputedStyle(ancestor);
            if (aStyle && (aStyle.display === 'none' || aStyle.visibility === 'hidden')) return false;
          }
          ancestor = ancestor.parentElement;
        }
        var style = typeof window.getComputedStyle === 'function' ? window.getComputedStyle(element) : null;
        if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
        var hasLayout = typeof root.getBoundingClientRect === 'function' && (root.getBoundingClientRect().width > 0 || root.getBoundingClientRect().height > 0);
        if (hasLayout && typeof element.getClientRects === 'function' && element.getClientRects().length === 0) return false;
        return true;
      });
    };
    var handleKeyDown = function (event) {
      if (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229) return;
      if (!isTopTrap()) return;
      if (event.key === 'Escape' && typeof props.onClose === 'function') {
        event.preventDefault();
        event.stopPropagation();
        props.onClose();
        return;
      }
      if (event.key !== 'Tab') return;
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
    try {
      root.focus();
    } catch (_) {}
    return function () {
      document.removeEventListener('keydown', handleKeyDown);
      if (alloScrollLocked) {
        alloScrollLock.count = Math.max(0, alloScrollLock.count - 1);
        if (alloScrollLock.count === 0 && document.body) document.body.style.overflow = alloScrollLock.prev;
      }
      isolatedSiblings.forEach(function (item) {
        if (!item.el || !item.el.isConnected) return;
        if (!item.hadInert) {
          item.el.inert = false;
          item.el.removeAttribute('inert');
        }
        if (item.prevAriaHidden === null) item.el.removeAttribute('aria-hidden');else if (item.prevAriaHidden !== 'true') item.el.setAttribute('aria-hidden', item.prevAriaHidden);
      });
      var wasTopTrap = isTopTrap();
      var trapIndex = trapStack.indexOf(trap);
      if (trapIndex !== -1) trapStack.splice(trapIndex, 1);
      if (wasTopTrap && previouslyFocused && previouslyFocused !== document.body && previouslyFocused !== document.documentElement && previouslyFocused.isConnected && typeof previouslyFocused.focus === 'function') {
        try {
          previouslyFocused.focus();
        } catch (_) {}
      }
    };
  }, [props.dialogId, props.onClose]);
  return null;
}
function PortalUrlConnectionForm(props) {
  var React = window.React;
  var savedUrl = String(props.savedUrl || '');
  var isConnected = props.isConnected === true;
  var _draftState = React.useState(savedUrl);
  var urlDraft = _draftState[0],
    setUrlDraft = _draftState[1];
  var _openState = React.useState(!isConnected);
  var detailsOpen = _openState[0],
    setDetailsOpen = _openState[1];
  var _confirmState = React.useState(false);
  var confirmingDisconnect = _confirmState[0],
    setConfirmingDisconnect = _confirmState[1];
  var prevConnectedRef = React.useRef(isConnected);
  React.useEffect(function () {
    setUrlDraft(savedUrl);
  }, [savedUrl]);
  React.useEffect(function () {
    if (prevConnectedRef.current && !isConnected) {
      setDetailsOpen(true);
      setConfirmingDisconnect(false);
    } else if (!prevConnectedRef.current && isConnected) {
      setConfirmingDisconnect(false);
    }
    prevConnectedRef.current = isConnected;
  }, [isConnected]);
  var submitUrl = function (nextValue) {
    if (typeof props.onSave !== 'function') return;
    var result = props.onSave(nextValue);
    if (result && result.ok !== false && typeof result.url === 'string') {
      setUrlDraft(result.url);
    }
    return result;
  };
  var accent = props.accent === 'emerald' ? {
    summary: 'text-emerald-800 focus-visible:ring-emerald-700',
    borderTop: 'border-emerald-100',
    inputFocus: 'focus-visible:border-emerald-600 focus-visible:ring-emerald-600',
    submitBtn: 'border-emerald-700 text-emerald-800 hover:bg-emerald-50 focus-visible:ring-emerald-600',
    neutralFocus: 'focus-visible:ring-emerald-600'
  } : {
    summary: 'text-indigo-800 focus-visible:ring-indigo-600',
    borderTop: 'border-indigo-100',
    inputFocus: 'focus-visible:border-indigo-600 focus-visible:ring-indigo-600',
    submitBtn: 'border-indigo-600 text-indigo-700 hover:bg-indigo-50 focus-visible:ring-indigo-600',
    neutralFocus: 'focus-visible:ring-indigo-600'
  };
  return /*#__PURE__*/React.createElement("details", {
    open: detailsOpen,
    onToggle: function (event) {
      setDetailsOpen(Boolean(event.currentTarget && event.currentTarget.open));
    },
    className: "mt-4"
  }, /*#__PURE__*/React.createElement("summary", {
    className: `min-h-11 cursor-pointer rounded-lg px-2 py-3 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 ${accent.summary}`
  }, props.summaryLabel), /*#__PURE__*/React.createElement("form", {
    className: `mt-2 border-t ${accent.borderTop} pt-4`,
    onSubmit: function (event) {
      event.preventDefault();
      submitUrl(urlDraft);
    }
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: props.inputId,
    className: "block text-xs font-black text-slate-700"
  }, props.fieldLabel), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex flex-col gap-2 sm:flex-row"
  }, /*#__PURE__*/React.createElement("input", {
    id: props.inputId,
    type: "url",
    inputMode: "url",
    autoComplete: "off",
    spellCheck: false,
    value: urlDraft,
    onChange: function (event) {
      setUrlDraft(event.target.value);
    },
    "aria-describedby": props.helpId,
    placeholder: "https://script.google.com/macros/s/…/exec",
    className: `min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner focus-visible:outline-none focus-visible:ring-2 ${accent.inputFocus}`
  }), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: `min-h-11 rounded-xl border bg-white px-4 py-2 text-sm font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${accent.submitBtn}`
  }, isConnected ? 'Update connection' : 'Connect portal'), isConnected && !confirmingDisconnect && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      setConfirmingDisconnect(true);
    },
    className: `min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${accent.neutralFocus}`
  }, "Disconnect"), isConnected && confirmingDisconnect && /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2",
    role: "group",
    "aria-label": "Confirm portal disconnect"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      setConfirmingDisconnect(false);
      setUrlDraft('');
      submitUrl('');
    },
    className: "min-h-11 rounded-xl border border-rose-700 bg-rose-700 px-3 py-2 text-sm font-black text-white hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-2"
  }, "Confirm disconnect"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: function () {
      setConfirmingDisconnect(false);
    },
    className: `min-h-11 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${accent.neutralFocus}`
  }, "Cancel"))), /*#__PURE__*/React.createElement("p", {
    id: props.helpId,
    className: "mt-2 text-xs leading-relaxed text-slate-600"
  }, props.helpText)), props.children);
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
  var normalizeRewardsPortalUrl = function (value) {
    try {
      var url = new URL(String(value || '').trim());
      if (url.protocol !== 'https:' || url.hostname !== 'script.google.com' || url.port || url.username || url.password || url.search || url.hash) return '';
      if (!/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)) return '';
      return url.origin + url.pathname;
    } catch (_) {
      return '';
    }
  };
  var locallySavedRewardsUrl = '';
  try {
    locallySavedRewardsUrl = normalizeRewardsPortalUrl(window.localStorage.getItem(rewardsStorageKey));
  } catch (_) {}
  var rewardsPortalUrl = props.rewardsPortalUrl || locallySavedRewardsUrl;
  var isRewardsPortalConnected = props.isRewardsPortalConnected === true || Boolean(rewardsPortalUrl);
  var notifyWarning = function (msg) {
    if (typeof props.addToast === 'function') {
      try {
        props.addToast(msg, 'warning');
        return;
      } catch (_) {}
    }
    try {
      window.alert(msg);
    } catch (_) {}
  };
  var onSaveRewardsPortalUrl = props.onSaveRewardsPortalUrl || function (value) {
    var raw = String(value || '').trim();
    var normalized = raw ? normalizeRewardsPortalUrl(raw) : '';
    if (raw && !normalized) {
      notifyWarning('Use the HTTPS Apps Script deployment URL ending in /macros/s/{deployment}/exec.');
      return {
        ok: false,
        error: 'Invalid Apps Script deployment URL.'
      };
    }
    try {
      if (normalized) window.localStorage.setItem(rewardsStorageKey, normalized);else window.localStorage.removeItem(rewardsStorageKey);
    } catch (_) {
      return {
        ok: false,
        error: 'This browser could not save the launcher URL.'
      };
    }
    return {
      ok: true,
      url: normalized,
      connected: Boolean(normalized)
    };
  };
  var onOpenSchoolRewards = props.onOpenSchoolRewards || function () {
    var url = normalizeRewardsPortalUrl(rewardsPortalUrl || locallySavedRewardsUrl);
    if (!url) {
      notifyWarning('Connect the school or district School Rewards portal below first.');
      return;
    }
    try {
      var popup = window.open(url, '_blank', 'noopener,noreferrer');
      if (popup) popup.opener = null;
    } catch (_) {}
  };
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
  var rewardsPortalUrlDraft = rewardsPortalUrl;
  var applyRewardsPortalUrl = function (value) {
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
      var next = {
        ...prev,
        [key]: value
      };
      if (key === 'allowStudentByokAi' && !value) next.studentByokAdultsConfirmed = false;
      return next;
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
    var settingDefaults = {
      hideStudentAiFeatures: false,
      allowDictation: true,
      allowSocraticTutor: true,
      allowFreeResponse: true,
      allowPersonaFreeResponse: true
    };
    var permissionDefaults = {
      allowDifficultySwitch: true,
      allowModeSwitch: false,
      allowCustomInstructions: false,
      allowLanguageSwitch: true,
      allowVisualsToggle: true,
      lockAllSettings: false
    };
    var settingKeys = Object.keys(settingDefaults);
    var permissionKeys = Object.keys(preset.adventurePermissions);
    return settingKeys.every(function (key) {
      var actual = studentProjectSettings[key] === undefined ? settingDefaults[key] : Boolean(studentProjectSettings[key]);
      return actual === preset[key];
    }) && permissionKeys.every(function (key) {
      var actual = permissions[key] === undefined ? Boolean(permissionDefaults[key]) : Boolean(permissions[key]);
      return actual === preset.adventurePermissions[key];
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
      className: `flex min-h-[88px] cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors motion-reduce:transition-none ${checked ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'}`
    }, /*#__PURE__*/React.createElement("input", {
      id: id,
      type: "checkbox",
      checked: Boolean(checked),
      onChange: event => updateSetting(settingKey, event.target.checked),
      className: "mt-0.5 h-5 w-5 flex-none cursor-pointer rounded border-slate-300 text-indigo-600 focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-1"
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
      className: `flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-3 transition-colors motion-reduce:transition-none ${danger ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white'}`
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      className: `block text-sm font-bold ${danger ? 'text-rose-800' : 'text-slate-800'}`
    }, label), description && /*#__PURE__*/React.createElement("span", {
      className: `mt-0.5 block text-xs leading-relaxed ${danger ? 'text-rose-700' : 'text-slate-600'}`
    }, description)), /*#__PURE__*/React.createElement("input", {
      id: id,
      type: "checkbox",
      checked: Boolean(checked),
      onChange: event => updatePermission(permissionKey, event.target.checked),
      className: `mt-0.5 h-5 w-5 flex-none cursor-pointer rounded border-slate-300 focus-visible:ring-2 focus-visible:ring-offset-1 ${danger ? 'text-rose-600 focus-visible:ring-rose-600' : 'text-indigo-600 focus-visible:ring-indigo-600'}`
    }));
  };
  var activePresetLabel = presetMatches('guided') ? tx('project_settings.preset_guided', 'Guided') : presetMatches('balanced') ? tx('project_settings.preset_balanced', 'Balanced') : presetMatches('open') ? tx('project_settings.preset_open', 'Open exploration') : tx('project_settings.preset_custom', 'Custom');
  var studentAiHidden = Boolean(studentProjectSettings.hideStudentAiFeatures);
  var enabledSupportsCount = ['allowDictation', 'allowSocraticTutor', 'allowFreeResponse', 'allowPersonaFreeResponse'].filter(function (key) {
    return studentProjectSettings[key] !== false;
  }).length;
  var adventureEnabledFlag = studentProjectSettings.adventureEnabled !== false;
  var adventureLockedFlag = Boolean(permissions.lockAllSettings);
  var advancedSummaryTags = [];
  if (!adventureEnabledFlag) advancedSummaryTags.push(tx('project_settings.tag_adv_off', 'Adventure off'));else if (adventureLockedFlag) advancedSummaryTags.push(tx('project_settings.tag_locked', 'Locked'));
  if (String(studentProjectSettings.socraticCustomInstructions || '').trim()) advancedSummaryTags.push(tx('project_settings.tag_tutor_notes', 'Tutor notes set'));
  if (Number(studentProjectSettings.adventureUnlockXP || 0) > 0 || Number(studentProjectSettings.adventureMinXP || 0) > 0) advancedSummaryTags.push(tx('project_settings.tag_xp_gated', 'XP milestones set'));
  if (String(studentProjectSettings.nickname || '').trim()) advancedSummaryTags.push(tx('project_settings.tag_codename', 'Codename set'));
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
    className: "fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none sm:p-6",
    onMouseDown: event => {
      if (event.target === event.currentTarget) handleSetIsProjectSettingsOpenToFalse();
    }
  }, /*#__PURE__*/React.createElement(ProjectSettingsDialogFocusManager, {
    dialogId: "project-settings-dialog",
    onClose: handleSetIsProjectSettingsOpenToFalse
  }), /*#__PURE__*/React.createElement("section", {
    id: "project-settings-dialog",
    tabIndex: -1,
    className: "allo-docsuite flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-2xl",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "project-settings-title",
    "aria-describedby": "project-settings-description",
    onMouseDown: event => event.stopPropagation()
  }, /*#__PURE__*/React.createElement("header", {
    className: "relative flex flex-none items-start gap-3 border-b border-slate-200 bg-gradient-to-r from-indigo-50 via-white to-violet-50 px-5 py-4 pr-16 sm:px-6"
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
    className: "absolute right-3 top-3 min-h-11 min-w-11 grid place-items-center rounded-full p-2 text-slate-600 transition-colors motion-reduce:transition-none hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    className: "min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 sm:px-6"
  }, /*#__PURE__*/React.createElement("div", {
    "data-project-settings-summary": "true",
    className: "flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-slate-600"
  }, tx('project_settings.active_posture', 'Current setup'), ":"), /*#__PURE__*/React.createElement("span", {
    className: "rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-indigo-800"
  }, activePresetLabel), /*#__PURE__*/React.createElement("span", {
    className: `rounded-full border px-2.5 py-0.5 ${studentAiHidden ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`
  }, studentAiHidden ? tx('project_settings.posture_ai_hidden', 'Student AI hidden') : tx('project_settings.posture_ai_on', 'Student AI available')), /*#__PURE__*/React.createElement("span", {
    className: "rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-slate-700 tabular-nums"
  }, enabledSupportsCount, "/4 ", tx('project_settings.posture_supports', 'supports on')), !adventureEnabledFlag && /*#__PURE__*/React.createElement("span", {
    className: "rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-slate-700"
  }, tx('project_settings.tag_adv_off', 'Adventure off')), adventureEnabledFlag && adventureLockedFlag && /*#__PURE__*/React.createElement("span", {
    className: "rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-rose-800"
  }, tx('project_settings.posture_adv_locked', 'Adventure locked')), studentProjectSettings.workStoryEnabled === true && /*#__PURE__*/React.createElement("span", {
    className: "rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-violet-800"
  }, tx('project_settings.posture_work_story', 'Work Story ON'))), /*#__PURE__*/React.createElement("fieldset", null, /*#__PURE__*/React.createElement("legend", {
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
      className: `min-h-11 rounded-xl border p-3 text-left transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 ${selected ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200' : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'}`
    }, /*#__PURE__*/React.createElement("span", {
      className: "flex items-center justify-between gap-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-sm font-black text-slate-900"
    }, preset.title), preset.badge && /*#__PURE__*/React.createElement("span", {
      className: "rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-black uppercase tracking-wide text-indigo-700"
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
  }, renderFeatureToggle('proj-hide-student-ai', 'hideStudentAiFeatures', tx('project_settings.hide_student_ai', 'Hide student AI tools'), tx('project_settings.hide_student_ai_desc', 'Remove student-facing AI controls from this project. Teacher authoring tools remain available.'), false)), renderFeatureToggle('proj-dictation', 'allowDictation', t('project_settings.enable_dictation'), t('project_settings.dictation_desc'), true), renderFeatureToggle('proj-socratic', 'allowSocraticTutor', t('project_settings.enable_socratic'), t('project_settings.socratic_desc'), true), renderFeatureToggle('proj-free-response', 'allowFreeResponse', t('project_settings.enable_free_response'), t('project_settings.free_response_desc'), true), renderFeatureToggle('proj-persona-free', 'allowPersonaFreeResponse', t('project_settings.enable_persona_free'), t('project_settings.persona_free_desc'), true), /*#__PURE__*/React.createElement(ProjectSettingsDisclosure, {
    defaultOpen: studentProjectSettings.workStoryEnabled === true || studentProjectSettings.allowStudentByokAi === true,
    className: "sm:col-span-2 group rounded-xl border border-slate-200 bg-slate-50"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "min-h-11 flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    className: "block text-sm font-black text-slate-900"
  }, "Work Story & adult BYOK AI options"), /*#__PURE__*/React.createElement("span", {
    className: "mt-0.5 block text-xs text-slate-600"
  }, "Optional submission process record and adult-education (18+) personal AI key access.")), /*#__PURE__*/React.createElement("span", {
    className: "text-lg font-bold text-indigo-600 transition-transform motion-reduce:transition-none group-open:rotate-45",
    "aria-hidden": "true"
  }, "+")), /*#__PURE__*/React.createElement("div", {
    className: "grid gap-3 border-t border-slate-200 p-3"
  }, /*#__PURE__*/React.createElement("div", null, renderFeatureToggle('proj-work-story', 'workStoryEnabled', tx('project_settings.work_story', 'Include a Work Story with student submissions'), tx('project_settings.work_story_desc', 'Students see a plain-language record of how their work came together and choose whether to send it. You see time, revision pattern and which AlloFlow supports were used, never a score, and never what they typed.'), false)), /*#__PURE__*/React.createElement("div", null, renderFeatureToggle('proj-allow-student-byok-ai', 'allowStudentByokAi', tx('project_settings.allow_student_byok_ai_adults', 'Allow adult students (18+) to connect their own AI provider'), tx('project_settings.allow_student_byok_ai_adults_desc', 'QR and Class Mailbox links stay AI-off by default. Google Gemini API terms require users to be 18 or older, and other providers set their own conditions for minors, so AlloFlow limits this to adult education and college classes. Students must verify their own session-only key; your API key is never shared.'), false)), studentProjectSettings.allowStudentByokAi === true && /*#__PURE__*/React.createElement("div", null, renderFeatureToggle('proj-student-byok-adults-confirmed', 'studentByokAdultsConfirmed', tx('project_settings.student_byok_adults_confirmed', 'I confirm every student using this project is 18 or older'), tx('project_settings.student_byok_adults_confirmed_desc', 'Required. Until this is checked, student links stay AI-off.'), false)))))), /*#__PURE__*/React.createElement("details", {
    className: "group rounded-xl border border-slate-200 bg-slate-50"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "min-h-11 flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
    className: "flex flex-wrap items-center gap-2 text-sm font-black text-slate-900"
  }, /*#__PURE__*/React.createElement(Settings2, {
    size: 16,
    "aria-hidden": "true"
  }), " ", tx('project_settings.advanced_title', 'Advanced lesson configuration'), advancedSummaryTags.length > 0 && /*#__PURE__*/React.createElement("span", {
    "data-project-settings-advanced-badge": "true",
    className: "rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-800"
  }, advancedSummaryTags.join(' · '))), /*#__PURE__*/React.createElement("span", {
    className: "mt-1 block text-xs text-slate-600"
  }, tx('project_settings.advanced_desc', 'Learner identity, tutor guidance, XP pacing, permissions, and privacy.'))), /*#__PURE__*/React.createElement("span", {
    className: "text-lg font-bold text-indigo-600 transition-transform motion-reduce:transition-none group-open:rotate-45",
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
    className: "mt-1 min-h-11 w-full rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus-visible:outline-none focus-visible:border-indigo-600 focus-visible:ring-4 focus-visible:ring-indigo-600/20"
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
    className: "mt-2 w-full resize-y rounded-lg border-2 border-slate-200 bg-white p-3 text-sm text-slate-800 focus-visible:outline-none focus-visible:border-indigo-600 focus-visible:ring-4 focus-visible:ring-indigo-600/20"
  }), /*#__PURE__*/React.createElement("div", {
    className: "mt-1 text-right text-xs font-medium text-slate-600"
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
    className: "mt-1 min-h-11 w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-indigo-600 focus-visible:ring-4 focus-visible:ring-indigo-600/20"
  }), /*#__PURE__*/React.createElement("span", {
    className: "mt-1 block text-xs font-normal leading-relaxed text-slate-600"
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
    className: "mt-1 min-h-11 w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-indigo-600 focus-visible:ring-4 focus-visible:ring-indigo-600/20"
  }), /*#__PURE__*/React.createElement("span", {
    className: "mt-1 block text-xs font-normal leading-relaxed text-slate-600"
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
    className: "mt-1 min-h-11 w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm focus-visible:outline-none focus-visible:border-indigo-600 focus-visible:ring-4 focus-visible:ring-indigo-600/20"
  }), /*#__PURE__*/React.createElement("span", {
    className: "mt-1 block text-xs font-normal leading-relaxed text-slate-600"
  }, t('project_settings.storybook_xp_desc'))))), /*#__PURE__*/React.createElement("fieldset", null, /*#__PURE__*/React.createElement("legend", {
    className: "text-xs font-black uppercase tracking-wider text-slate-600"
  }, t('project_settings.permissions_header')), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-xs text-slate-600"
  }, tx('project_settings.permissions_desc', 'Control which Adventure setup choices students may change.')), /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, renderFeatureToggle('proj-adventure-enabled', 'adventureEnabled', tx('project_settings.enable_adventure', 'Include Adventure in this assignment'), tx('project_settings.enable_adventure_desc', 'Off hides the Adventure panel from students. Use this when the lesson has no adventure.'), true)), studentProjectSettings.adventureEnabled !== false && /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, renderFeatureToggle('proj-allow-student-stories', 'allowStudentStories', tx('project_settings.allow_student_stories', 'Students can write their own adventure'), tx('project_settings.allow_student_stories_desc', 'Students write a branching story with choices and hand it in. Works without AI.'), true)), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 grid gap-2 sm:grid-cols-2"
  }, renderPermissionToggle('proj-perm-difficulty', 'allowDifficultySwitch', t('project_settings.perm_difficulty'), tx('project_settings.perm_difficulty_desc', 'Change the challenge level.'), true), renderPermissionToggle('proj-perm-mode', 'allowModeSwitch', t('project_settings.perm_mode'), tx('project_settings.perm_mode_desc', 'Choose how responses are entered.'), false), renderPermissionToggle('proj-perm-language', 'allowLanguageSwitch', tx('project_settings.perm_language', 'Change language'), tx('project_settings.perm_language_desc', 'Choose from teacher-provided languages.'), true), renderPermissionToggle('proj-perm-custom', 'allowCustomInstructions', t('project_settings.perm_custom'), tx('project_settings.perm_custom_desc', 'Add custom story guidance.'), false), renderPermissionToggle('proj-perm-visuals', 'allowVisualsToggle', t('project_settings.perm_visuals'), tx('project_settings.perm_visuals_desc', 'Change visual-generation quality settings.'), true), renderPermissionToggle('proj-perm-cloud', 'allowCloudImageStorage', tx('project_settings.perm_cloud', 'Allow cloud image storage'), tx('project_settings.perm_cloud_desc', 'Privacy-sensitive: allow generated Adventure images to be stored online.'), false)), /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, renderPermissionToggle('proj-lock-all', 'lockAllSettings', t('project_settings.perm_lock_all'), tx('project_settings.perm_lock_all_desc', 'Freeze all student-facing Adventure setup controls.'), false, 'danger'))))), isSchoolRole && /*#__PURE__*/React.createElement("details", {
    id: "project-school-connections",
    className: "rounded-xl border border-slate-200 bg-slate-50 p-3"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "min-h-11 cursor-pointer rounded-lg px-1 py-2 text-sm font-bold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, tx('project_settings.school_connections', 'School connections'), /*#__PURE__*/React.createElement("span", {
    className: "mt-1 block text-xs font-normal text-slate-600"
  }, tx('project_settings.school_connections_desc', 'School Rewards and Principal Evaluation'))), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 space-y-4"
  }, isSchoolRole && /*#__PURE__*/React.createElement("section", {
    "aria-labelledby": "school-rewards-title",
    className: "rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-teal-50 p-4 shadow-sm sm:p-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: `text-xs font-black uppercase tracking-wider ${isRewardsPortalConnected ? 'text-emerald-700' : 'text-amber-800'}`
  }, isRewardsPortalConnected ? 'School rewards connected' : 'Google Education setup required'), /*#__PURE__*/React.createElement("h4", {
    id: "school-rewards-title",
    className: "mt-1 text-base font-black text-slate-900"
  }, "School Rewards & Store"), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 max-w-2xl text-sm leading-relaxed text-slate-600"
  }, "A school-owned rewards ledger for staff recognition, private balance emails to managed student addresses, prize previews, and locked trimester checkout. The pilot stays separate from AlloHaven XP and can later point to a district-owned deployment without changing this launcher.")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onOpenSchoolRewards,
    className: `min-h-11 shrink-0 rounded-xl px-4 py-2.5 text-sm font-black shadow-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${isRewardsPortalConnected ? 'bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:ring-emerald-600' : 'border border-amber-500 bg-white text-amber-800 hover:bg-amber-50 focus-visible:ring-amber-600'}`
  }, isRewardsPortalConnected ? 'Open School Rewards' : 'Connect School Rewards')), typeof onSaveRewardsPortalUrl === 'function' && /*#__PURE__*/React.createElement(PortalUrlConnectionForm, {
    accent: "emerald",
    savedUrl: rewardsPortalUrl,
    isConnected: isRewardsPortalConnected,
    summaryLabel: tx('project_settings.connection_setup', 'Connection setup'),
    inputId: "school-rewards-portal-url",
    fieldLabel: "School or district Apps Script web-app URL",
    helpId: "school-rewards-portal-help",
    helpText: isRewardsPortalConnected ? 'This device opens the exact Google-hosted /exec deployment. Google sign-in and server-side roles control awards, checkout, and administration.' : 'Open School Rewards & Store from Leadership Hub for the step-by-step setup: it copies the reviewed apps_script/school_rewards package, generates the one-time setup call, and saves the /exec URL. You can also paste the URL here. AlloFlow stores only the launcher address.',
    onSave: applyRewardsPortalUrl
  })), isSchoolRole && typeof onOpenPrincipalEvaluation === 'function' && /*#__PURE__*/React.createElement("section", {
    "aria-labelledby": "principal-evaluation-title",
    className: "rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-violet-50 p-4 shadow-sm sm:p-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: `text-xs font-black uppercase tracking-wider ${isEvaluationPortalConnected ? 'text-indigo-700' : 'text-amber-800'}`
  }, isEvaluationPortalConnected ? 'District portal connected' : 'On-device workspace · portal not connected'), /*#__PURE__*/React.createElement("h4", {
    id: "principal-evaluation-title",
    className: "mt-1 text-base font-black text-slate-900"
  }, "Principal Evaluation"), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 max-w-2xl text-sm leading-relaxed text-slate-600"
  }, isEvaluationPortalConnected ? 'Opens the Google-authenticated district portal for walkthroughs, formal observations, SPM and SLO workflow, feedback, and trends. Sign-in and server-side assignments decide what each person sees.' : 'Opens the evaluator setup center for three paths: private on-device work, a principal-managed Drive share helper, or the district portal. The private path is per-device (anyone using this device can open it) and is not the official personnel record; connect your district portal for shared, authenticated records. Nothing is uploaded until you deliberately use a district-approved sharing path.')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onOpenPrincipalEvaluation,
    className: `min-h-11 shrink-0 rounded-xl px-4 py-2.5 text-sm font-black shadow-sm transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${isEvaluationPortalConnected ? 'bg-indigo-700 text-white hover:bg-indigo-800 focus-visible:ring-indigo-600' : 'border border-amber-500 bg-white text-amber-800 hover:bg-amber-50 focus-visible:ring-amber-600'}`
  }, isEvaluationPortalConnected ? 'Open district portal' : 'Open Educator Evaluation')), /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-xs font-semibold"
  }, /*#__PURE__*/React.createElement("a", {
    href: "https://alloflow-cdn.pages.dev/educator-evaluation-manual",
    target: "_blank",
    rel: "noopener noreferrer",
    className: "min-h-11 inline-flex items-center rounded text-indigo-700 underline hover:text-indigo-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, "Read the user manual"), /*#__PURE__*/React.createElement("span", {
    className: "ml-1 font-normal text-slate-600"
  }, "covers the private, principal-managed Drive, and district portal paths, plus the evaluation cycle and privacy.")), !isEvaluationPortalConnected && /*#__PURE__*/React.createElement("p", {
    className: "mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-relaxed text-blue-900"
  }, /*#__PURE__*/React.createElement("strong", null, "Need the middle path?"), " Open Educator Evaluation, choose ", /*#__PURE__*/React.createElement("strong", null, "Setup"), ", then select ", /*#__PURE__*/React.createElement("strong", null, "Principal-managed Drive"), ". A resumable seven-step checklist provides script.new, three source-copy buttons, private-deployment warnings, a helper-link field, and the deployment check."), typeof onSaveEvaluationPortalUrl === 'function' && /*#__PURE__*/React.createElement(PortalUrlConnectionForm, {
    accent: "indigo",
    savedUrl: evaluationPortalUrl,
    isConnected: isEvaluationPortalConnected,
    summaryLabel: tx('project_settings.connection_setup', 'Connection setup'),
    inputId: "principal-evaluation-portal-url",
    fieldLabel: "District Apps Script web-app URL",
    helpId: "principal-evaluation-portal-help",
    helpText: isEvaluationPortalConnected ? 'This device will open the exact district /exec deployment in a separate tab. Google sign-in and server assignments control access; emailed links do not.' : 'Paste the district-owned HTTPS Apps Script deployment URL ending in /exec. AlloFlow stores only this launcher address on this device.',
    onSave: applyEvaluationPortalUrl
  }, /*#__PURE__*/React.createElement("details", {
    className: "mt-4 rounded-xl border border-slate-200 bg-white/70 p-3"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "min-h-11 flex items-center cursor-pointer rounded-lg text-xs font-black text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, "Where does this URL come from?"), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 space-y-2 text-xs leading-relaxed text-slate-600"
  }, /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "This is not a self-serve setup."), " The portal is a Google Apps Script web app that a district-controlled Workspace account deploys and owns. It holds personnel records, so your district has to review and approve it first."), /*#__PURE__*/React.createElement("ol", {
    className: "ml-4 list-decimal space-y-1"
  }, /*#__PURE__*/React.createElement("li", null, "Your district creates an Apps Script project from the AlloFlow Educator Evaluation package and reviews the source and its permissions."), /*#__PURE__*/React.createElement("li", null, "They deploy it as a Web app with ", /*#__PURE__*/React.createElement("strong", null, "Execute as: the district owner"), " and ", /*#__PURE__*/React.createElement("strong", null, "Who has access: users in your domain"), ". Never \"Anyone\"."), /*#__PURE__*/React.createElement("li", null, "They run the one-time setup with your school's staff list, evaluator assignments, and roles."), /*#__PURE__*/React.createElement("li", null, "They give you the deployment URL ending in ", /*#__PURE__*/React.createElement("code", null, "/exec"), ". Paste it above.")), /*#__PURE__*/React.createElement("p", null, "AlloFlow stores only that launcher address, on this device. It never holds the records. Access is decided by Google sign-in and the assignments your district configured, so sharing the link or the QR code does not give anyone access they do not already have."), /*#__PURE__*/React.createElement("p", null, "The full setup and compliance checklist ships with the package, at ", /*#__PURE__*/React.createElement("code", {
    className: "break-all"
  }, "apps_script/educator_evaluation/README.md"), "."))), /*#__PURE__*/React.createElement(EvaluationPortalQr, {
    t: t,
    url: isEvaluationPortalConnected ? evaluationPortalUrl : ''
  }))))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      try {
        var reporter = window.AlloModules && window.AlloModules.ErrorReporter;
        // A missing/older reporter must not bypass managed support
        // restrictions by opening the public fallback form directly.
        if (Object.prototype.hasOwnProperty.call(window, 'ALLOFLOW_SUPPORT_REPORTING_POLICY') && (!reporter || typeof reporter.getSupportReportingPolicy !== 'function')) {
          try {
            window.alert('The support reporter is unavailable for this managed configuration. Reload the app or use your organization\'s approved support channel.');
          } catch (_) {}
          return;
        }
        if (reporter && (typeof reporter.openManualReport === 'function' || typeof reporter.openPanel === 'function')) {
          if (typeof reporter.openManualReport === 'function') reporter.openManualReport();else reporter.openPanel('errors');
          handleSetIsProjectSettingsOpenToFalse();
        } else {
          window.open('https://docs.google.com/forms/d/e/1FAIpQLSd9dJexeOjd6fvFio9V0Jd45FDpuL7cSQNnm-BLmqyTwrPrhg/viewform', '_blank', 'noopener,noreferrer');
        }
      } catch (error) {
        console.warn('[Settings] Report-a-problem button failed:', error);
      }
    },
    className: "min-h-11 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition-colors motion-reduce:transition-none hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
  }, /*#__PURE__*/React.createElement(CircleHelp, {
    size: 14,
    "aria-hidden": "true"
  }), tx('project_settings.feedback', 'Report a problem or send feedback'))), /*#__PURE__*/React.createElement("footer", {
    className: "flex flex-none items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:px-6"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600"
  }, tx('project_settings.saved_with_project', 'Changes apply immediately and are saved with student projects.'), !isParentMode && !isIndependentMode ? ' School connections stay on this device.' : ''), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "settings_close_btn",
    onClick: handleSetIsProjectSettingsOpenToFalse,
    className: "min-h-11 flex-none rounded-xl bg-indigo-700 px-6 py-2.5 text-sm font-bold text-white shadow-md transition-colors motion-reduce:transition-none hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
  }, t('common.close')))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ProjectSettingsView = ProjectSettingsView;
  window.AlloModules.ViewProjectSettingsModule = true;
})();
