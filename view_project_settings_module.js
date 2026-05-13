/**
 * AlloFlow View - Project Settings Modal
 * Extracted from AlloFlowANTI.txt isProjectSettingsOpen block (223 lines body).
 * Teacher-side toggles for: dictation, Socratic tutor, free response, persona
 * free response. Plus XP unlock thresholds (adventure, base, storybook).
 * Backdrop click + Escape both dismiss. Display-only outside of toggle setters.
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

  function ProjectSettingsView(props) {
  var t = props.t;
  var studentProjectSettings = props.studentProjectSettings;
  var setStudentProjectSettings = props.setStudentProjectSettings;
  var handleSetIsProjectSettingsOpenToFalse = props.handleSetIsProjectSettingsOpenToFalse;
  return /*#__PURE__*/React.createElement("div", {
    role: "button",
    tabIndex: 0,
    onKeyDown: e => {
      if (e.key === 'Escape') e.currentTarget.click();
    },
    className: "fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300",
    onClick: handleSetIsProjectSettingsOpenToFalse
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full relative border-4 border-indigo-100",
    role: "dialog",
    "aria-modal": "true",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleSetIsProjectSettingsOpenToFalse,
    className: "absolute top-4 right-4 p-2 rounded-full text-slate-600 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-6 text-indigo-900"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-100 p-2 rounded-full"
  }, /*#__PURE__*/React.createElement(Settings2, {
    size: 20,
    className: "text-indigo-600"
  })), /*#__PURE__*/React.createElement("h3", {
    className: "font-black text-lg"
  }, t('project_settings.title'))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 transition-colors hover:border-indigo-200"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.toggle_allow_dictation'),
    type: "checkbox",
    id: "proj-dictation",
    checked: studentProjectSettings.allowDictation,
    onChange: e => setStudentProjectSettings(prev => ({
      ...prev,
      allowDictation: e.target.checked
    })),
    className: "w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 mt-0.5 cursor-pointer"
  }), /*#__PURE__*/React.createElement("label", {
    htmlFor: "proj-dictation",
    className: "text-sm font-bold text-indigo-900 cursor-pointer select-none"
  }, t('project_settings.enable_dictation'), /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-normal text-indigo-500 mt-0.5"
  }, t('project_settings.dictation_desc')))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 transition-colors hover:border-indigo-200"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.toggle_allow_socratic_tutor'),
    type: "checkbox",
    id: "proj-socratic",
    checked: studentProjectSettings.allowSocraticTutor,
    onChange: e => setStudentProjectSettings(prev => ({
      ...prev,
      allowSocraticTutor: e.target.checked
    })),
    className: "w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 mt-0.5 cursor-pointer"
  }), /*#__PURE__*/React.createElement("label", {
    htmlFor: "proj-socratic",
    className: "text-sm font-bold text-indigo-900 cursor-pointer select-none"
  }, t('project_settings.enable_socratic'), /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-normal text-indigo-500 mt-0.5"
  }, t('project_settings.socratic_desc')))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 transition-colors hover:border-indigo-200"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.toggle_allow_free_response'),
    "data-help-key": "settings_free_response",
    type: "checkbox",
    id: "proj-free-response",
    checked: studentProjectSettings.allowFreeResponse,
    onChange: e => setStudentProjectSettings(prev => ({
      ...prev,
      allowFreeResponse: e.target.checked
    })),
    className: "w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 mt-0.5 cursor-pointer"
  }), /*#__PURE__*/React.createElement("label", {
    htmlFor: "proj-free-response",
    className: "text-sm font-bold text-indigo-900 cursor-pointer select-none"
  }, t('project_settings.enable_free_response'), /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-normal text-indigo-500 mt-0.5"
  }, t('project_settings.free_response_desc')))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 transition-colors hover:border-indigo-200"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.toggle_allow_persona_free_response'),
    "data-help-key": "settings_persona_free",
    type: "checkbox",
    id: "proj-persona-free",
    checked: studentProjectSettings.allowPersonaFreeResponse,
    onChange: e => setStudentProjectSettings(prev => ({
      ...prev,
      allowPersonaFreeResponse: e.target.checked
    })),
    className: "w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300 mt-0.5 cursor-pointer"
  }), /*#__PURE__*/React.createElement("label", {
    htmlFor: "proj-persona-free",
    className: "text-sm font-bold text-indigo-900 cursor-pointer select-none"
  }, t('project_settings.enable_persona_free'), /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-normal text-indigo-500 mt-0.5"
  }, t('project_settings.persona_free_desc')))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-black text-slate-600 uppercase tracking-wider mb-2"
  }, t('project_settings.unlock_xp')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-green-100 p-2 rounded-lg text-green-600 border border-green-200"
  }, /*#__PURE__*/React.createElement(MapIcon, {
    size: 18
  })), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.text_field'),
    "data-help-key": "settings_unlock_xp",
    type: "number",
    min: "0",
    step: "100",
    value: studentProjectSettings.adventureUnlockXP,
    onChange: e => setStudentProjectSettings(prev => ({
      ...prev,
      adventureUnlockXP: parseInt(e.target.value) || 0
    })),
    className: "flex-grow p-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none text-sm font-bold text-slate-700"
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-600 mt-1.5 font-medium ml-1"
  }, t('project_settings.unlock_xp_desc'))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-black text-slate-600 uppercase tracking-wider mb-2"
  }, t('project_settings.base_xp')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-blue-100 p-2 rounded-lg text-blue-600 border border-blue-200"
  }, /*#__PURE__*/React.createElement(Trophy, {
    size: 18
  })), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.text_field'),
    "data-help-key": "settings_base_xp",
    type: "number",
    min: "10",
    step: "10",
    value: studentProjectSettings.baseXP,
    onChange: e => setStudentProjectSettings(prev => ({
      ...prev,
      baseXP: parseInt(e.target.value) || 100
    })),
    className: "flex-grow p-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none text-sm font-bold text-slate-700"
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-600 mt-1.5 font-medium ml-1"
  }, t('project_settings.base_xp_desc'))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-black text-slate-600 uppercase tracking-wider mb-2"
  }, t('project_settings.storybook_xp')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-yellow-100 p-2 rounded-lg text-yellow-600 border border-yellow-200"
  }, /*#__PURE__*/React.createElement(Trophy, {
    size: 18
  })), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.text_field'),
    "data-help-key": "settings_adventure_xp",
    type: "number",
    min: "0",
    step: "100",
    value: studentProjectSettings.adventureMinXP,
    onChange: e => setStudentProjectSettings(prev => ({
      ...prev,
      adventureMinXP: parseInt(e.target.value) || 0
    })),
    className: "flex-grow p-2 border-2 border-slate-200 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 outline-none text-sm font-bold text-slate-700"
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-600 mt-1.5 font-medium ml-1"
  }, t('project_settings.storybook_xp_desc'))), /*#__PURE__*/React.createElement("div", {
    className: "pt-4 border-t border-slate-100 mt-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-black text-slate-600 uppercase tracking-wider mb-3"
  }, t('project_settings.permissions_header')), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center justify-between text-sm text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 hover:border-indigo-200 transition-colors cursor-pointer"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-600"
  }, t('project_settings.perm_difficulty')), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.toggle_allow_difficulty_switch'),
    "data-help-key": "settings_perm_difficulty",
    type: "checkbox",
    checked: studentProjectSettings.adventurePermissions?.allowDifficultySwitch ?? true,
    onChange: e => setStudentProjectSettings(prev => ({
      ...prev,
      adventurePermissions: {
        ...prev.adventurePermissions,
        allowDifficultySwitch: e.target.checked
      }
    })),
    className: "w-4 h-4 text-indigo-600 rounded cursor-pointer focus:ring-indigo-500 border-gray-300"
  })), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center justify-between text-sm text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 hover:border-indigo-200 transition-colors cursor-pointer"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-600"
  }, t('project_settings.perm_mode')), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.toggle_allow_mode_switch'),
    "data-help-key": "settings_perm_mode",
    type: "checkbox",
    checked: studentProjectSettings.adventurePermissions?.allowModeSwitch ?? false,
    onChange: e => setStudentProjectSettings(prev => ({
      ...prev,
      adventurePermissions: {
        ...prev.adventurePermissions,
        allowModeSwitch: e.target.checked
      }
    })),
    className: "w-4 h-4 text-indigo-600 rounded cursor-pointer focus:ring-indigo-500 border-gray-300"
  })), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center justify-between text-sm text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 hover:border-indigo-200 transition-colors cursor-pointer"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-600"
  }, t('project_settings.perm_custom')), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.toggle_allow_custom_instructions'),
    "data-help-key": "settings_perm_custom",
    type: "checkbox",
    checked: studentProjectSettings.adventurePermissions?.allowCustomInstructions ?? false,
    onChange: e => setStudentProjectSettings(prev => ({
      ...prev,
      adventurePermissions: {
        ...prev.adventurePermissions,
        allowCustomInstructions: e.target.checked
      }
    })),
    className: "w-4 h-4 text-indigo-600 rounded cursor-pointer focus:ring-indigo-500 border-gray-300"
  })), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center justify-between text-sm text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 hover:border-indigo-200 transition-colors cursor-pointer"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-slate-600"
  }, t('project_settings.perm_visuals')), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.toggle_allow_visuals_toggle'),
    "data-help-key": "settings_perm_visuals",
    type: "checkbox",
    checked: studentProjectSettings.adventurePermissions?.allowVisualsToggle ?? true,
    onChange: e => setStudentProjectSettings(prev => ({
      ...prev,
      adventurePermissions: {
        ...prev.adventurePermissions,
        allowVisualsToggle: e.target.checked
      }
    })),
    className: "w-4 h-4 text-indigo-600 rounded cursor-pointer focus:ring-indigo-500 border-gray-300"
  })), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center justify-between text-sm text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 hover:border-indigo-200 transition-colors cursor-pointer ring-2 ring-red-100"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-red-600 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Lock, {
    size: 14
  }), " ", t('project_settings.perm_lock_all')), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.toggle_lock_all_settings'),
    "data-help-key": "settings_lock_all",
    type: "checkbox",
    checked: studentProjectSettings.adventurePermissions?.lockAllSettings ?? false,
    onChange: e => setStudentProjectSettings(prev => ({
      ...prev,
      adventurePermissions: {
        ...prev.adventurePermissions,
        lockAllSettings: e.target.checked
      }
    })),
    className: "w-4 h-4 text-red-600 rounded cursor-pointer focus:ring-red-500 border-gray-300"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "pt-4 mt-2 border-t border-slate-100"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      try {
        if (window.AlloModules && window.AlloModules.ErrorReporter && window.AlloModules.ErrorReporter.openPanel) {
          window.AlloModules.ErrorReporter.openPanel();
          handleSetIsProjectSettingsOpenToFalse();
        } else {
          // Fallback: open the bare form. ErrorReporter not loaded yet.
          window.open('https://docs.google.com/forms/d/e/1FAIpQLSd9dJexeOjd6fvFio9V0Jd45FDpuL7cSQNnm-BLmqyTwrPrhg/viewform', '_blank', 'noopener,noreferrer');
        }
      } catch (e) {
        console.warn('[Settings] Report-a-problem button failed:', e);
      }
    },
    className: "w-full flex items-center justify-center gap-2 text-xs text-slate-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-lg transition-colors font-medium",
    "aria-label": "Report a problem or send feedback to Aaron"
  }, /*#__PURE__*/React.createElement(CircleHelp, {
    size: 14,
    "aria-hidden": "true"
  }), "Report a problem or send feedback")), /*#__PURE__*/React.createElement("div", {
    className: "pt-2 flex justify-end"
  }, /*#__PURE__*/React.createElement("button", {
    "data-help-key": "settings_close_btn",
    onClick: handleSetIsProjectSettingsOpenToFalse,
    className: "bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 hover:shadow-indigo-300 active:scale-95"
  }, t('common.close'))))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ProjectSettingsView = ProjectSettingsView;
  window.AlloModules.ViewProjectSettingsModule = true;
})();
