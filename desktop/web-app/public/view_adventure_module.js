/**
 * AlloFlow View - Adventure Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='adventure' block.
 * Source range: 1,304 lines body — second-largest extraction in the
 * project's history (after Simplified at 1,650).
 *
 * Renders: full Adventure game UI — setup form (difficulty/language/art
 * style/free-response/chance/story-mode/character-consistency/system-mode
 * /custom-instructions/climax-config), main scene rendering with image,
 * choice buttons, dictation mode, text input, ledger, inventory modal,
 * shop modal, storybook export modal, immersive mode (Ken Burns animation,
 * hide-UI / show-choices toggles, full-screen scene viewer), session
 * democracy/multi-player vote display, climax progress bar, animated XP.
 *
 * Pre-extraction prep: 4 inline setAdventureState callbacks lifted to
 * named host handlers (handleToggleAdventureImmersive,
 * handleExitAdventureImmersive, handleSetEnableAutoClimax,
 * handleSetClimaxMinTurns) to ensure climax-config form doesn't break.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.AdventureView) {
    console.log('[CDN] ViewAdventureModule already loaded, skipping'); return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewAdventureModule] React not found'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var ArrowDown = _lazyIcon('ArrowDown');
  var Backpack = _lazyIcon('Backpack');
  var BookOpen = _lazyIcon('BookOpen');
  var Download = _lazyIcon('Download');
  var Eye = _lazyIcon('Eye');
  var EyeOff = _lazyIcon('EyeOff');
  var Flag = _lazyIcon('Flag');
  var History = _lazyIcon('History');
  var ImageIcon = _lazyIcon('ImageIcon');
  var Lock = _lazyIcon('Lock');
  var MapIcon = _lazyIcon('MapIcon');
  var Maximize = _lazyIcon('Maximize');
  var Mic = _lazyIcon('Mic');
  var MicOff = _lazyIcon('MicOff');
  var Minimize = _lazyIcon('Minimize');
  var Monitor = _lazyIcon('Monitor');
  var MousePointerClick = _lazyIcon('MousePointerClick');
  var Pencil = _lazyIcon('Pencil');
  var Plus = _lazyIcon('Plus');
  var RefreshCw = _lazyIcon('RefreshCw');
  var Scale = _lazyIcon('Scale');
  var Send = _lazyIcon('Send');
  var Sparkles = _lazyIcon('Sparkles');
  var Trophy = _lazyIcon('Trophy');
  var User = _lazyIcon('User');
  var Users = _lazyIcon('Users');
  var Volume2 = _lazyIcon('Volume2');
  var VolumeX = _lazyIcon('VolumeX');
  var Wifi = _lazyIcon('Wifi');
  var WifiOff = _lazyIcon('WifiOff');
  var X = _lazyIcon('X');
  var Zap = _lazyIcon('Zap');

  // Compiled into both Adventure view bundles: both entry points keep the same
// controls and permission policy without introducing a module-loading dependency.
function adventureSetupText(t, key, fallback) {
  const full = key.includes('.') ? key : 'adventure.learning_settings.' + key;
  const value = typeof t === 'function' ? t(full) : null;
  return value && value !== full ? value : fallback;
}
function adventureSetupLocked(props, permission) {
  if (props.adventureState?.isLoading || props.isProcessing) return true;
  if (props.isTeacherMode) return false;
  const settings = props.studentProjectSettings || {};
  const permissions = settings.adventurePermissions || {};
  if (permissions.lockAllSettings) return true;
  if (permission === 'freeResponse') return settings.allowFreeResponse === false;
  if (permission === 'allowVisualsToggle') return permissions.allowVisualsToggle === false;
  return permission ? permissions[permission] !== true : false;
}
function adventureSetupLimit(state) {
  const bounded = value => Math.max(3, Math.min(50, Math.round(Number(value) || 20)));
  return Object.prototype.hasOwnProperty.call(state, 'episodeTurnLimit') ? state.episodeTurnLimit == null ? null : bounded(state.episodeTurnLimit) : state.enableAutoClimax ? null : bounded(state.climaxMinTurns);
}
function AdventureSettingsSurface({
  theme,
  children,
  compact = false
}) {
  const dark = theme === 'dark' || theme === 'contrast';
  const contrast = theme === 'contrast';
  return /*#__PURE__*/React.createElement("div", {
    "data-adventure-settings": true,
    className: compact ? 'as-compact' : '',
    style: {
      '--as-ink': dark ? '#f8fafc' : '#17233a',
      '--as-muted': dark ? '#cbd5e1' : '#475569',
      '--as-bg': contrast ? '#000' : dark ? '#0f172a' : '#fff',
      '--as-wash': contrast ? '#000' : dark ? '#1e293b' : '#f4f6fb',
      '--as-line': contrast ? '#fff' : dark ? '#94a3b8' : '#64748b',
      '--as-accent': contrast ? '#fde047' : dark ? '#a5b4fc' : '#4338ca'
    }
  }, /*#__PURE__*/React.createElement("style", null, `
      [data-adventure-settings]{color:var(--as-ink);background:var(--as-bg);font-size:14px;line-height:1.5;min-width:0}
      [data-adventure-settings] *{box-sizing:border-box}
      [data-adventure-settings] .as-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:16px}
      [data-adventure-settings].as-compact .as-grid{grid-template-columns:1fr}
      [data-adventure-settings] .as-box{padding:16px;background:var(--as-wash);border:1px solid var(--as-line);border-radius:12px;margin:0 0 16px;min-width:0}
      [data-adventure-settings] .as-title{font-size:15px;font-weight:700;margin:0 0 12px}
      [data-adventure-settings] .as-field{display:block;font-weight:600;font-size:13px;min-width:0;margin:0}
      [data-adventure-settings] .as-control{display:block;width:100%;min-width:0;min-height:44px;background:var(--as-bg);color:var(--as-ink);border:1px solid var(--as-line);border-radius:8px;padding:9px 10px;font:inherit;margin-top:6px}
      [data-adventure-settings] textarea.as-control{resize:vertical;min-height:100px}
      [data-adventure-settings] .as-help{display:block;font-size:12px;font-weight:400;color:var(--as-muted);margin:6px 0 0;line-height:1.6}
      [data-adventure-settings] .as-check{display:flex;align-items:flex-start;gap:10px;min-height:44px;padding:10px 0;cursor:pointer;font-size:13px;font-weight:600}
      [data-adventure-settings] .as-episode-mode{border:0;padding:0;margin:0 0 16px;min-width:0}
      [data-adventure-settings] .as-episode-mode legend{font-size:13px;font-weight:600;margin-bottom:6px}
      [data-adventure-settings] .as-option{display:flex;align-items:center;gap:10px;min-height:44px;padding:10px;border:1px solid var(--as-line);border-radius:8px;background:var(--as-bg);font-size:13px;font-weight:600;cursor:pointer}
      [data-adventure-settings] .as-option:has(input:checked){border:2px solid var(--as-accent);padding:9px}
      [data-adventure-settings] .as-option input{width:20px;height:20px;margin:0;accent-color:var(--as-accent);flex-shrink:0}
      [data-adventure-settings] .as-check input{width:20px;height:20px;flex-shrink:0;margin-top:1px;accent-color:var(--as-accent)}
      [data-adventure-settings] input:disabled,[data-adventure-settings] select:disabled,[data-adventure-settings] textarea:disabled{cursor:not-allowed;color:var(--as-muted);opacity:1;background:var(--as-wash)}
      [data-adventure-settings] .as-button{min-height:44px;padding:8px 12px;border:1px solid var(--as-line);border-radius:8px;background:var(--as-bg);color:var(--as-accent);font-size:13px;font-weight:600;cursor:pointer}
      [data-adventure-settings] .as-button:disabled{cursor:not-allowed;color:var(--as-muted)}
      [data-adventure-settings] :is(input,select,textarea,button,summary):focus-visible{outline:3px solid var(--as-accent);outline-offset:3px}
      [data-adventure-settings] details{border-bottom:1px solid var(--as-line);margin-bottom:4px}
      [data-adventure-settings] summary{min-height:48px;padding:12px 2px;cursor:pointer;font-weight:700;font-size:14px;border-radius:4px}
      [data-adventure-settings] summary .as-help{display:inline;margin-left:10px}
      [data-adventure-settings] .as-detail{padding:4px 0 16px}
      [data-adventure-settings] .as-resource{padding:12px;border:1px solid var(--as-line);border-radius:8px;margin:12px 0}
      [data-adventure-settings] .as-resource .as-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,110px),1fr));gap:10px}
      [data-adventure-settings] .as-notice{padding:10px 12px;border-left:3px solid var(--as-accent);background:var(--as-wash);font-size:13px;margin-bottom:16px}
      [data-adventure-settings] .as-summary{font-size:13px;line-height:1.7;padding:12px 0;margin-top:12px;color:var(--as-muted);overflow-wrap:anywhere}
      [data-adventure-settings] .as-summary strong{color:var(--as-ink)}
      @media(max-width:500px){[data-adventure-settings] summary .as-help{display:block;margin-left:16px}}
    `), children);
}
function AdventureSettingSection({
  title,
  summary,
  children
}) {
  return /*#__PURE__*/React.createElement("details", null, /*#__PURE__*/React.createElement("summary", null, /*#__PURE__*/React.createElement("span", null, title), ' ', summary && /*#__PURE__*/React.createElement("span", {
    className: "as-help"
  }, summary)), /*#__PURE__*/React.createElement("div", {
    className: "as-detail"
  }, children));
}
function AdventureEpisodeSettings({
  state,
  onChange,
  t,
  locked = false,
  id = 'adventure-episode-length',
  theme = 'light',
  freeResponse = false,
  includeFinale = false
}) {
  const label = (key, fallback) => adventureSetupText(t, key, fallback);
  const limit = adventureSetupLimit(state);
  const previousLength = React.useRef(limit ?? 12);
  const disabled = locked || typeof onChange !== 'function';
  const update = (key, value) => {
    if (!disabled) onChange(previous => ({
      ...previous,
      [key]: value
    }));
  };
  return /*#__PURE__*/React.createElement(AdventureSettingsSurface, {
    theme: theme
  }, /*#__PURE__*/React.createElement("fieldset", {
    className: "as-episode-mode",
    disabled: disabled,
    "aria-describedby": id + '-hint'
  }, /*#__PURE__*/React.createElement("legend", null, label('episode_format', 'Episode format')), /*#__PURE__*/React.createElement("div", {
    className: "as-grid"
  }, /*#__PURE__*/React.createElement("label", {
    className: "as-option"
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: id + '-format',
    checked: limit !== null,
    disabled: disabled,
    onChange: () => update('episodeTurnLimit', previousLength.current)
  }), label('set_length', 'Set-length episode')), /*#__PURE__*/React.createElement("label", {
    className: "as-option"
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: id + '-format',
    checked: limit === null,
    disabled: disabled,
    onChange: () => {
      if (!disabled) {
        previousLength.current = limit ?? previousLength.current;
        update('episodeTurnLimit', null);
      }
    }
  }), label('open', 'Open-ended')))), /*#__PURE__*/React.createElement("div", {
    className: "as-grid"
  }, limit !== null && /*#__PURE__*/React.createElement("label", {
    className: "as-field",
    htmlFor: id
  }, label('length', 'Episode length'), /*#__PURE__*/React.createElement("select", {
    className: "as-control",
    "aria-label": label('length', 'Episode length'),
    id: id,
    value: String(limit),
    disabled: disabled,
    onChange: e => {
      previousLength.current = Number(e.target.value);
      update('episodeTurnLimit', previousLength.current);
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "6"
  }, label('short', 'Short · 6 decisions')), /*#__PURE__*/React.createElement("option", {
    value: "12"
  }, label('standard', 'Standard · 12 decisions')), /*#__PURE__*/React.createElement("option", {
    value: "20"
  }, label('long', 'Long · 20 decisions')), limit != null && ![6, 12, 20].includes(limit) && /*#__PURE__*/React.createElement("option", {
    value: String(limit)
  }, limit, " ", label('decisions', 'decisions')))), !freeResponse && /*#__PURE__*/React.createElement("label", {
    className: "as-field",
    htmlFor: id + '-choices'
  }, label('choices', 'Choices per decision'), /*#__PURE__*/React.createElement("select", {
    className: "as-control",
    "aria-label": label('choices', 'Choices per decision'),
    id: id + '-choices',
    value: state.choiceCount || 6,
    disabled: disabled,
    onChange: e => update('choiceCount', Number(e.target.value))
  }, [2, 3, 4, 5, 6].map(count => /*#__PURE__*/React.createElement("option", {
    key: count,
    value: count
  }, count))))), /*#__PURE__*/React.createElement("p", {
    className: "as-help",
    id: id + '-hint'
  }, limit === null ? state.enableAutoClimax ? label('open_with_finale_hint', 'No fixed decision limit. A final challenge can still end the story; turn it off below to keep exploring. Energy depletion can end a run earlier.') : label('open_without_finale_hint', 'No fixed decision limit and no automatic final challenge. Energy depletion can still end a run.') : label('length_hint', 'Length counts decisions, not minutes. The final challenge fits inside a set episode. Energy depletion can end a run earlier.')), includeFinale && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "as-check"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!state.enableAutoClimax,
    disabled: disabled,
    onChange: e => update('enableAutoClimax', e.target.checked)
  }), label('finale', 'Include a final challenge')), limit === null && state.enableAutoClimax && /*#__PURE__*/React.createElement("label", {
    className: "as-field",
    htmlFor: id + '-earliest'
  }, label('earliest_finale', 'Earliest finale round (open-ended)'), /*#__PURE__*/React.createElement("input", {
    className: "as-control",
    "aria-label": label('earliest_finale', 'Earliest finale round (open-ended)'),
    id: id + '-earliest',
    type: "number",
    min: "3",
    max: "50",
    value: state.climaxMinTurns || 20,
    disabled: disabled,
    onChange: e => update('climaxMinTurns', Math.max(3, Math.min(50, Number(e.target.value) || 20)))
  }), /*#__PURE__*/React.createElement("span", {
    className: "as-help"
  }, label('open_finale_hint', 'The finale also waits for sufficient story progress.')))));
}
function AdventureSetupFields(props) {
  const state = props.adventureState || {};
  const settings = props.studentProjectSettings || {};
  const permissions = settings.adventurePermissions || {};
  const label = (key, fallback) => adventureSetupText(props.t, key, fallback);
  const id = props.idPrefix || 'adventure-setup';
  const locked = permission => adventureSetupLocked(props, permission);
  const change = (setter, value, permission) => {
    if (!locked(permission) && typeof props[setter] === 'function') props[setter](value);
  };
  const toggle = (field, setter, title, help, permission, extraDisabled = false) => typeof props[setter] === 'function' && /*#__PURE__*/React.createElement("label", {
    className: "as-check"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!props[field],
    disabled: locked(permission) || extraDisabled,
    onChange: e => change(setter, e.target.checked, permission)
  }), /*#__PURE__*/React.createElement("span", null, title, help && /*#__PURE__*/React.createElement("span", {
    className: "as-help"
  }, help)));
  const field = (key, title, value, setter, options, permission, help) => /*#__PURE__*/React.createElement("label", {
    className: "as-field",
    htmlFor: id + '-' + key
  }, title, /*#__PURE__*/React.createElement("select", {
    className: "as-control",
    "aria-label": title,
    "aria-describedby": help ? id + '-' + key + '-help' : undefined,
    id: id + '-' + key,
    value: value,
    disabled: locked(permission) || typeof props[setter] !== 'function',
    onChange: e => change(setter, e.target.value, permission)
  }, options.map(([value, text]) => /*#__PURE__*/React.createElement("option", {
    key: value,
    value: value
  }, text))), help && /*#__PURE__*/React.createElement("span", {
    className: "as-help",
    id: id + '-' + key + '-help'
  }, help));
  const modes = [['choice', label('adventure.mode_choice', 'Standard Adventure Mode')], ['debate', label('adventure.mode_debate', 'Debate')], ['system', label('adventure.mode_system', 'Systems simulation')]];
  const languages = Array.from(new Set((props.selectedLanguages || []).filter(lang => lang !== 'English')));
  const languageOptions = [['English', label('adventure.lang_options.english_only', 'English only')], ...languages.flatMap(lang => [[lang, lang], [lang + ' + English', lang + ' · ' + label('with_translation', 'with translation')]])];
  if (languages.length > 1) languageOptions.push(['All + English', languages.join(', ') + ' · ' + label('with_translation', 'with translation')]);
  // Preserve a saved selection even if the teacher's current language list differs.
  if (props.adventureLanguageMode && !languageOptions.some(option => option[0] === props.adventureLanguageMode)) languageOptions.push([props.adventureLanguageMode, props.adventureLanguageMode]);
  const resourceMode = props.factionResourceMode === 'manual' ? 'manual' : 'ai';
  const setResourceMode = value => {
    if (locked()) return;
    if (typeof props.setFactionResourceMode === 'function') props.setFactionResourceMode(value);else {
      const handler = value === 'manual' ? props.handleSetFactionResourceModeToManual : props.handleSetFactionResourceModeToAi;
      if (typeof handler === 'function') handler();
    }
  };
  const editResources = update => {
    if (!locked() && typeof props.setAdventureState === 'function') props.setAdventureState(previous => ({
      ...previous,
      systemResources: update(previous.systemResources || [])
    }));
  };
  const supports = typeof props.setAdventureAutoRead === 'function' || typeof props.setAdventureTypingPaceEnabled === 'function' || typeof props.setAdventureFluencyEnabled === 'function';
  const hasCloud = typeof props.setIsAdventureCloudEnabled === 'function';
  const permissionToggle = (key, title, help) => props.isTeacherMode && typeof props.setStudentProjectSettings === 'function' && /*#__PURE__*/React.createElement("label", {
    className: "as-check"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: permissions[key] === true,
    disabled: locked(),
    onChange: e => {
      const checked = e.target.checked;
      if (!locked()) props.setStudentProjectSettings(previous => ({
        ...previous,
        adventurePermissions: {
          ...previous.adventurePermissions,
          [key]: checked
        }
      }));
    }
  }), /*#__PURE__*/React.createElement("span", null, title, /*#__PURE__*/React.createElement("span", {
    className: "as-help"
  }, help)));
  const limit = adventureSetupLimit(state);
  const onOff = value => label(value ? 'common.on' : 'common.off', value ? 'On' : 'Off');
  return /*#__PURE__*/React.createElement(AdventureSettingsSurface, {
    theme: props.theme,
    compact: props.compact
  }, !props.isTeacherMode && /*#__PURE__*/React.createElement("p", {
    className: "as-notice"
  }, permissions.lockAllSettings ? label('student_locked_hint', 'Your teacher has fixed this setup. You can review the settings and start your adventure.') : label('student_edit_hint', 'You can adjust the settings your teacher allows. Unavailable controls are set by your teacher.')), /*#__PURE__*/React.createElement("section", {
    className: "as-box",
    "aria-labelledby": id + '-essential-heading'
  }, /*#__PURE__*/React.createElement("h3", {
    id: id + '-essential-heading',
    className: "as-title"
  }, label('essential_setup', 'Essential setup')), /*#__PURE__*/React.createElement("div", {
    className: "as-grid"
  }, field('input-mode', label('adventure.interaction_mode', 'Interaction mode'), props.adventureInputMode || 'choice', 'setAdventureInputMode', modes, 'allowModeSwitch'), languageOptions.length > 1 && field('language', label('adventure.language_label', 'Adventure language'), props.adventureLanguageMode || 'English', 'setAdventureLanguageMode', languageOptions, 'allowLanguageSwitch', label('translation_hint', 'Story language follows this control; the translation language follows Universal Settings.')), /*#__PURE__*/React.createElement("label", {
    className: "as-field",
    htmlFor: id + '-response'
  }, label('response_format', 'Student responses'), /*#__PURE__*/React.createElement("select", {
    "aria-label": label('response_format', 'Student responses'),
    id: id + '-response',
    className: "as-control",
    value: props.adventureFreeResponseEnabled ? 'written' : 'choice',
    disabled: locked('freeResponse') || typeof props.setAdventureFreeResponseEnabled !== 'function',
    onChange: e => change('setAdventureFreeResponseEnabled', e.target.value === 'written', 'freeResponse')
  }, /*#__PURE__*/React.createElement("option", {
    value: "choice"
  }, label('response_choices', 'Choose from suggestions')), /*#__PURE__*/React.createElement("option", {
    value: "written"
  }, label('response_written', 'Write or dictate'))))), props.isTeacherMode && languageOptions.length === 1 && typeof props.openUniversalSettings === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "as-button",
    style: {
      marginTop: 12
    },
    disabled: locked(),
    onClick: () => {
      if (!locked()) props.openUniversalSettings('languages');
    }
  }, label('add_languages', 'Add languages in Universal Settings')), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(AdventureEpisodeSettings, {
    state: state,
    onChange: props.setAdventureState,
    t: props.t,
    theme: props.theme,
    locked: locked(),
    id: id + '-episode-length',
    freeResponse: props.adventureFreeResponseEnabled,
    includeFinale: true
  })), props.isSocialStoryMode && /*#__PURE__*/React.createElement("label", {
    className: "as-field",
    htmlFor: id + '-social-focus'
  }, label('social_focus', 'Social skill to practise'), /*#__PURE__*/React.createElement("input", {
    id: id + '-social-focus',
    className: "as-control",
    type: "text",
    value: props.socialStoryFocus || '',
    disabled: locked() || typeof props.setSocialStoryFocus !== 'function',
    onChange: e => change('setSocialStoryFocus', e.target.value),
    placeholder: label('adventure.social_story_focus_placeholder', 'e.g., Sharing toys, Dealing with frustration')
  })), props.adventureInputMode === 'system' && /*#__PURE__*/React.createElement("div", null, toggle('enableFactionResources', 'setEnableFactionResources', label('adventure.system_state_label', 'Track resources'), label('adventure.system_state_desc', 'Track how your decisions affect the system.')), props.enableFactionResources && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "as-field",
    htmlFor: id + '-resource-mode'
  }, label('resource_setup', 'Resource setup'), /*#__PURE__*/React.createElement("select", {
    "aria-label": label('resource_setup', 'Resource setup'),
    className: "as-control",
    id: id + '-resource-mode',
    value: resourceMode,
    disabled: locked() || !(props.setFactionResourceMode || props.handleSetFactionResourceModeToManual),
    onChange: e => setResourceMode(e.target.value)
  }, /*#__PURE__*/React.createElement("option", {
    value: "ai"
  }, label('resources_ai', 'AI-generated resources')), /*#__PURE__*/React.createElement("option", {
    value: "manual"
  }, label('resources_manual', 'Teacher-defined resources')))), resourceMode === 'manual' && /*#__PURE__*/React.createElement("div", null, (state.systemResources || []).map((resource, index) => /*#__PURE__*/React.createElement("div", {
    className: "as-resource",
    key: index
  }, /*#__PURE__*/React.createElement("div", {
    className: "as-grid"
  }, [['name', label('resource_name', 'Resource name'), 'text'], ['quantity', label('resource_quantity', 'Starting value'), 'number'], ['unit', label('resource_unit', 'Unit'), 'text']].map(([key, title, type]) => /*#__PURE__*/React.createElement("label", {
    className: "as-field",
    key: key,
    htmlFor: id + '-resource-' + index + '-' + key
  }, title, " ", index + 1, /*#__PURE__*/React.createElement("input", {
    id: id + '-resource-' + index + '-' + key,
    className: "as-control",
    type: type,
    min: type === 'number' ? 0 : undefined,
    value: resource[key] ?? '',
    disabled: locked(),
    onChange: e => {
      const value = type === 'number' ? Math.max(0, Number(e.target.value) || 0) : e.target.value;
      editResources(rows => rows.map((row, i) => i === index ? {
        ...row,
        [key]: value
      } : row));
    }
  })))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "as-button",
    style: {
      marginTop: 10
    },
    disabled: locked(),
    onClick: () => editResources(rows => rows.filter((_, i) => i !== index))
  }, label('remove_resource', 'Remove resource'), " ", index + 1))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "as-button",
    style: {
      marginTop: 12
    },
    disabled: locked(),
    onClick: () => editResources(rows => [...rows, {
      name: '',
      icon: '🔹',
      quantity: 50,
      unit: '%',
      type: 'strategic'
    }])
  }, label('adventure.add_state_variable', 'Add resource')))))), supports && /*#__PURE__*/React.createElement(AdventureSettingSection, {
    title: label('learning_supports', 'Learning supports'),
    summary: label('reading_practice', 'Reading practice') + ': ' + onOff(props.adventureFluencyEnabled)
  }, typeof props.setAdventureAutoRead === 'function' && /*#__PURE__*/React.createElement("label", {
    className: "as-check"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!props.adventureAutoRead,
    disabled: locked(),
    onChange: e => {
      change('setAdventureAutoRead', e.target.checked);
      if (!e.target.checked && typeof props.stopPlayback === 'function') props.stopPlayback();
    }
  }), label('auto_read_setup', 'Read each scene automatically')), toggle('adventureFluencyEnabled', 'setAdventureFluencyEnabled', label('adventure.fluency_setting_label', 'Scene reading practice'), label('adventure.fluency_setting_desc', 'Offer an optional microphone button for practising the current passage.')), props.adventureFreeResponseEnabled && toggle('adventureTypingPaceEnabled', 'setAdventureTypingPaceEnabled', label('adventure.typing_pace_label', 'Typing pace'), label('adventure.typing_pace_desc', 'Descriptive pace and word count for written responses. Never affects points or grades.'))), /*#__PURE__*/React.createElement(AdventureSettingSection, {
    title: label('story_rules', 'Story & game rules'),
    summary: label('adventure.chance_mode_label', 'Chance') + ': ' + onOff(props.adventureChanceMode)
  }, field('difficulty', label('energy_rewards', 'Energy & rewards'), props.adventureDifficulty || 'Normal', 'setAdventureDifficulty', [['Story', label('adventure.diff_story_option', 'Story')], ['Normal', label('adventure.diff_normal_option', 'Normal')], ['Hard', label('adventure.diff_hard_option', 'Hard')], ['Hardcore', label('adventure.diff_hardcore_option', 'Hardcore')]], 'allowDifficultySwitch', label('difficulty_' + (props.adventureDifficulty || 'Normal'), {
    Story: 'Half energy loss; 1.5× XP. Reasoning expectations follow the lesson.',
    Normal: 'Standard energy loss and XP. Reasoning expectations follow the lesson.',
    Hard: '1.5× energy loss; 0.75× XP. Success thresholds stay the same.',
    Hardcore: '2.5× energy loss; 0.5× XP. Success thresholds stay the same.'
  }[props.adventureDifficulty || 'Normal'])), toggle('isAdventureStoryMode', 'setIsAdventureStoryMode', label('adventure.story_mode_label', 'Peaceful mode'), label('adventure.story_mode_desc', 'Focus on exploration and puzzles.')), toggle('adventureChanceMode', 'setAdventureChanceMode', label('adventure.chance_mode_label', 'Chance mode'), label('adventure.chance_mode_desc', 'Chance rolls influence the story outcome.')), toggle('isSocialStoryMode', 'setIsSocialStoryMode', label('adventure.social_story_mode_label', 'Social scenario mode'), label('social_mode_hint', 'Show a target social skill in Essential setup.'))), /*#__PURE__*/React.createElement(AdventureSettingSection, {
    title: label('visual_settings', 'Visuals'),
    summary: label('adventure.art_style_label', 'Art style') + ': ' + label('adventure.art_' + (props.adventureArtStyle || 'auto'), props.adventureArtStyle || 'Auto')
  }, field('art-style', label('adventure.art_style_label', 'Art style'), props.adventureArtStyle || 'auto', 'setAdventureArtStyle', ['universal', 'auto', 'storybook', 'pixel', 'cinematic', 'anime', 'crayon', 'custom'].map(value => [value, label('adventure.art_' + value, {
    universal: 'Use Universal style',
    auto: 'Auto',
    storybook: 'Storybook',
    pixel: 'Pixel art',
    cinematic: 'Cinematic',
    anime: 'Anime',
    crayon: 'Hand-drawn',
    custom: 'Custom'
  }[value])]), 'allowVisualsToggle'), props.adventureArtStyle === 'universal' && /*#__PURE__*/React.createElement("p", {
    className: "as-help"
  }, props.universalImageStyle || label('universal_style_empty', 'No Universal style is set; Adventure will use its automatic style.')), props.adventureArtStyle === 'custom' && /*#__PURE__*/React.createElement("label", {
    className: "as-field",
    htmlFor: id + '-custom-art'
  }, label('custom_art', 'Custom art style'), /*#__PURE__*/React.createElement("input", {
    id: id + '-custom-art',
    className: "as-control",
    value: props.adventureCustomArtStyle || '',
    disabled: locked('allowVisualsToggle'),
    onChange: e => change('setAdventureCustomArtStyle', e.target.value, 'allowVisualsToggle')
  })), toggle('adventureConsistentCharacters', 'setAdventureConsistentCharacters', label('adventure.consistent_characters_label', 'Consistent characters'), label('adventure.consistent_characters_desc', 'Keep character appearances consistent across scenes.')), toggle('useLowQualityVisuals', 'setUseLowQualityVisuals', label('adventure.low_quality_label', 'Faster, simpler visuals'), label('adventure.low_quality_desc', 'Faster generation, less data.'), 'allowVisualsToggle')), /*#__PURE__*/React.createElement(AdventureSettingSection, {
    title: label('story_guidance', 'Story guidance'),
    summary: props.adventureCustomInstructions?.trim() ? label('guidance_added', 'Custom instructions added') : label('guidance_empty', 'No custom instructions')
  }, /*#__PURE__*/React.createElement("label", {
    className: "as-field",
    htmlFor: id + '-custom-instructions'
  }, label('input.custom_instructions', 'Custom instructions'), /*#__PURE__*/React.createElement("textarea", {
    id: id + '-custom-instructions',
    className: "as-control",
    value: props.adventureCustomInstructions || '',
    disabled: locked('allowCustomInstructions'),
    onChange: e => change('setAdventureCustomInstructions', e.target.value, 'allowCustomInstructions'),
    placeholder: label('adventure.placeholder_custom', 'Add guidance for this adventure.')
  }))), (hasCloud || props.isTeacherMode && props.setStudentProjectSettings) && /*#__PURE__*/React.createElement(AdventureSettingSection, {
    title: label('saving_permissions', 'Saving & permissions'),
    summary: label('cloud_images', 'Cloud images') + ': ' + onOff(props.isAdventureCloudEnabled)
  }, hasCloud && (props.isTeacherMode || permissions.allowCloudImageStorage === true) && /*#__PURE__*/React.createElement("label", {
    className: "as-check"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!props.isAdventureCloudEnabled,
    disabled: locked('allowCloudImageStorage'),
    onChange: e => {
      if (locked('allowCloudImageStorage')) return;
      change('setIsAdventureCloudEnabled', e.target.checked, 'allowCloudImageStorage');
      if (typeof props.safeSetItem === 'function') props.safeSetItem('allo_adventure_cloud', e.target.checked ? 'true' : 'false');
    }
  }), /*#__PURE__*/React.createElement("span", null, label('adventure.cloud_storage_label', 'Cloud image storage'), /*#__PURE__*/React.createElement("span", {
    className: "as-help"
  }, label('adventure.cloud_storage_desc', 'Store generated images online.')))), props.adventureFreeResponseEnabled && props.isAdventureCloudEnabled && (props.isTeacherMode || permissions.allowCloudImageStorage) && /*#__PURE__*/React.createElement("p", {
    className: "as-notice"
  }, label('adventure.pii_warning_desc', 'Avoid including personal information in written responses when cloud image storage is enabled.')), permissionToggle('lockAllSettings', label('adventure.lock_settings_label', 'Lock student settings'), label('adventure.lock_settings_desc', 'Keep the adventure setup fixed for students.')), permissionToggle('allowCloudImageStorage', label('adventure.allow_cloud_storage_label', 'Allow cloud image storage'), label('adventure.allow_cloud_storage_desc', 'Allow students to store generated images online.'))), /*#__PURE__*/React.createElement("div", {
    className: "as-summary",
    role: "region",
    "aria-label": label('setup_summary', 'Setup summary')
  }, /*#__PURE__*/React.createElement("strong", null, label('setup_summary', 'Setup summary'), ": "), modes.find(option => option[0] === props.adventureInputMode)?.[1] || modes[0][1], ' · ', limit == null ? label('open', 'Open-ended') : limit + ' ' + label('decisions', 'decisions'), ' · ', props.adventureFreeResponseEnabled ? label('response_written', 'Write or dictate') : (state.choiceCount || 6) + ' ' + label('suggested_choices', 'suggested choices'), ' · ', languageOptions.find(option => option[0] === props.adventureLanguageMode)?.[1] || props.adventureLanguageMode || languageOptions[0][1]));
}
function adventureSettingsText(t, key, fallback) {
  const value = t('adventure.learning_settings.' + key);
  return value && value !== 'adventure.learning_settings.' + key ? value : fallback;
}
function adventureVisualTokens(theme = 'light', immersive = false) {
  const contrast = theme === 'contrast';
  const dark = contrast || immersive || theme === 'dark';
  return {
    '--av-ink': dark ? '#f8fafc' : '#0f172a',
    '--av-muted': dark ? '#cbd5e1' : '#475569',
    '--av-surface': contrast ? '#000000' : dark ? '#0f172a' : '#ffffff',
    '--av-wash': contrast ? '#000000' : dark ? '#19263b' : '#f4f7fb',
    '--av-control': contrast ? '#ffffff' : '#64748b',
    '--av-line': contrast ? '#ffffff' : dark ? '#64748b' : '#cbd5e1',
    '--av-accent': contrast ? '#fde047' : dark ? '#67e8f9' : '#115e59',
    '--av-shadow': contrast ? 'none' : dark ? '0 16px 36px #02061740' : '0 12px 32px #1e3a5f12',
    '--av-focus': contrast ? '#fde047' : dark ? '#67e8f9' : '#4338ca'
  };
}
function adventureDecisionCount(state) {
  // The opening scene is turn one, before the learner has completed a decision.
  const recorded = state.stats && state.stats.decisions;
  const legacyTurn = Number(state.turnCount);
  return Math.max(0, Math.floor(typeof recorded === 'number' && Number.isFinite(recorded) ? recorded : (Number.isFinite(legacyTurn) ? legacyTurn : 1) - 1));
}
function AdventureDecisionProgress({
  state,
  t,
  theme,
  immersive = false
}) {
  const completed = adventureDecisionCount(state);
  const bounded = value => Math.max(3, Math.min(50, Math.round(Number(value) || 20)));
  const limit = Object.prototype.hasOwnProperty.call(state, 'episodeTurnLimit') ? state.episodeTurnLimit == null ? null : bounded(state.episodeTurnLimit) : state.enableAutoClimax ? null : bounded(state.climaxMinTurns);
  const label = adventureSettingsText(t, 'episode_progress', 'Episode progress');
  const detail = completed + ' ' + adventureSettingsText(t, 'decisions_completed', 'completed') + ' · ' + (state.isGameOver ? adventureSettingsText(t, 'episode_ended', 'Episode ended') : limit == null ? adventureSettingsText(t, 'open', 'Open-ended') : Math.max(0, limit - completed) + ' ' + adventureSettingsText(t, 'decisions_remaining', 'remaining'));
  return /*#__PURE__*/React.createElement("div", {
    "data-adventure-progress": true,
    style: adventureVisualTokens(theme, immersive),
    className: "mb-3 text-[var(--av-muted)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs leading-relaxed"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-[var(--av-ink)]"
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, detail)), limit != null && /*#__PURE__*/React.createElement("div", {
    role: "progressbar",
    "aria-label": label,
    "aria-valuemin": 0,
    "aria-valuemax": limit,
    "aria-valuenow": Math.min(limit, completed),
    "aria-valuetext": detail,
    className: "mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--av-wash)] border border-[var(--av-control)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full rounded-full bg-[var(--av-accent)]",
    style: {
      width: Math.min(100, completed / limit * 100) + '%'
    }
  })));
}
function AdventureProfileMark({
  profile = 'guided',
  className = ''
}) {
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 64 64",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    focusable: "false",
    className: className
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "32",
    cy: "32",
    r: "29",
    fill: "currentColor",
    fillOpacity: ".08",
    stroke: "none"
  }), profile === 'debate' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M10 15h29a5 5 0 0 1 5 5v14a5 5 0 0 1-5 5H22l-9 7v-7a5 5 0 0 1-5-5V20a5 5 0 0 1 2-5Z",
    fill: "currentColor",
    fillOpacity: ".08"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M29 43h14l9 6v-7a5 5 0 0 0 4-5V26a5 5 0 0 0-5-5M17 24h17M17 31h11"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "46",
    cy: "13",
    r: "2",
    fill: "currentColor",
    stroke: "none"
  })) : profile === 'systems' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M18 18h28v28H18Z",
    strokeDasharray: "3 4"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "18",
    r: "5",
    fill: "currentColor",
    fillOpacity: ".18"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "46",
    cy: "18",
    r: "5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "46",
    cy: "46",
    r: "5",
    fill: "currentColor",
    fillOpacity: ".18"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "46",
    r: "5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M32 21c-3 5-8 9-8 14a8 8 0 0 0 16 0c0-5-5-9-8-14Z",
    fill: "currentColor",
    fillOpacity: ".1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M28 36c0 2 1 3 3 3"
  })) : profile === 'social' ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "21",
    cy: "25",
    r: "6"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "43",
    cy: "25",
    r: "6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 48v-4a12 12 0 0 1 24 0v4M33 48v-4a12 12 0 0 1 22 0v4M26 13c4-4 8-4 12 0M30 13h-4V9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m26 46 6 5 7-6",
    fill: "currentColor",
    fillOpacity: ".1"
  })) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "m6 43 14-19 12 15 9-11 17 21",
    fill: "currentColor",
    fillOpacity: ".1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M26 58c22-8 15-14 5-15s-10-6 1-11",
    strokeDasharray: "3 3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "43",
    cy: "14",
    r: "5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M18 13v6M15 16h6"
  })));
}
function adventureEpisodeDepleted(state) {
  const energy = state.energy == null || state.energy === '' ? NaN : Number(state.energy);
  return Number.isFinite(energy) && energy <= 0 && !state.canStartSequel;
}
function AdventureEpisodeRecap({
  state,
  t,
  theme,
  immersive = false,
  mode,
  social,
  minimumXP,
  isProcessing,
  onExport,
  onSequel,
  canContinue = true
}) {
  if (!state.isGameOver) return null;
  const label = (key, fallback) => adventureSettingsText(t, 'recap_' + key, fallback);
  const _isDefeat = adventureEpisodeDepleted(state);
  const completed = adventureDecisionCount(state);
  const level = Number(state.level);
  const xp = Number.isFinite(Number(state.xp)) ? Math.max(0, Number(state.xp)) : 0;
  const threshold = Number.isFinite(Number(minimumXP)) ? Math.max(0, Number(minimumXP)) : 0;
  const concepts = Array.from(new Map((Array.isArray(state.stats?.conceptsFound) ? state.stats.conceptsFound : []).filter(value => typeof value === 'string' && value.trim()).map(value => [value.trim().toLocaleLowerCase(), value.trim()])).values());
  const profile = mode === 'system' ? 'systems' : mode === 'debate' ? 'debate' : social ? 'social' : 'guided';
  const prompts = {
    systems: ['systems_reflection', 'Which change helped most, and what tradeoff would you plan for next time?'],
    debate: ['debate_reflection', 'Which claim had the strongest evidence? How would you respond to a counterargument?'],
    social: ['social_reflection', 'Whose perspective did you consider? What could you say or do differently next time?'],
    guided: ['story_reflection', 'Which decision changed the story most? What evidence from the lesson supported it?']
  };
  const prompt = prompts[profile];
  const busy = !!(isProcessing || state.isLoading);
  const buttonClass = 'min-h-11 rounded-xl border border-[var(--av-control)] px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 text-[var(--av-ink)] bg-[var(--av-wash)] hover:bg-[var(--av-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] disabled:opacity-50 disabled:cursor-not-allowed';
  return /*#__PURE__*/React.createElement("section", {
    "data-adventure-recap": true,
    "aria-label": label('title', 'Episode recap'),
    style: adventureVisualTokens(theme, immersive),
    className: "w-full max-w-4xl rounded-3xl border border-[var(--av-line)] border-t-[3px] border-t-[var(--av-accent)] bg-[var(--av-surface)] p-4 sm:p-6 text-[var(--av-ink)] shadow-[var(--av-shadow)] min-w-0 [overflow-wrap:anywhere] space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement(AdventureProfileMark, {
    profile: profile,
    className: "w-12 h-12 sm:w-16 sm:h-16 shrink-0 text-[var(--av-accent)]"
  }), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-[var(--av-accent)] mb-1"
  }, state.canStartSequel ? label('chapter_complete', 'Chapter complete') : label('ended', 'Episode ended')), /*#__PURE__*/React.createElement("h3", {
    className: "text-xl sm:text-2xl font-bold tracking-tight"
  }, label('title', 'Episode recap')))), /*#__PURE__*/React.createElement("p", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    className: "text-sm leading-relaxed text-[var(--av-muted)]"
  }, _isDefeat ? mode === 'system' ? label('stability_depleted', 'Stability reached zero. Use what happened to plan your next attempt.') : label('energy_depleted', 'Out of energy — the journey ends here. Every attempt teaches something!') : label('review_intro', 'Look back at your decisions, then take one useful idea into your next adventure.')), /*#__PURE__*/React.createElement("dl", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-[var(--av-line)] bg-[var(--av-wash)] p-3"
  }, /*#__PURE__*/React.createElement("dt", {
    className: "text-xs leading-relaxed text-[var(--av-muted)]"
  }, label('decisions', 'Decisions completed')), /*#__PURE__*/React.createElement("dd", {
    className: "mt-1 text-2xl font-bold tabular-nums"
  }, completed)), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-[var(--av-line)] bg-[var(--av-wash)] p-3"
  }, /*#__PURE__*/React.createElement("dt", {
    className: "text-xs leading-relaxed text-[var(--av-muted)]"
  }, label('level', 'Story level reached')), /*#__PURE__*/React.createElement("dd", {
    className: "mt-1 text-2xl font-bold tabular-nums"
  }, Number.isFinite(level) && level > 0 ? Math.floor(level) : '—'))), /*#__PURE__*/React.createElement("details", {
    className: "border-y border-[var(--av-line)]"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "min-h-11 py-3 cursor-pointer text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] rounded-lg"
  }, label('concepts', 'Concepts to revisit'), " ", /*#__PURE__*/React.createElement("span", {
    className: "text-[var(--av-muted)] tabular-nums"
  }, "(", concepts.length, ")")), concepts.length ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs leading-relaxed text-[var(--av-muted)] mb-3"
  }, label('concepts_hint', 'Check these ideas against the lesson, then explain one in your own words.')), /*#__PURE__*/React.createElement("ul", {
    className: "flex flex-wrap gap-2 pb-3"
  }, concepts.map(concept => /*#__PURE__*/React.createElement("li", {
    key: concept.toLocaleLowerCase(),
    className: "max-w-full rounded-xl border border-[var(--av-line)] bg-[var(--av-wash)] px-3 py-2 text-xs font-semibold"
  }, concept)))) : /*#__PURE__*/React.createElement("p", {
    className: "text-xs leading-relaxed text-[var(--av-muted)] pb-3"
  }, label('no_concepts', 'Use your journey notebook to choose one idea worth revisiting.'))), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border-l-[3px] border-[var(--av-accent)] bg-[var(--av-wash)] p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-[var(--av-accent)] mb-2"
  }, label('reflect', 'Take one idea with you')), /*#__PURE__*/React.createElement("p", {
    className: "text-sm leading-relaxed"
  }, label(prompt[0], prompt[1]))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-3"
  }, state.canStartSequel && canContinue && typeof onSequel === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onSequel,
    disabled: busy,
    className: buttonClass
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 17,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", null, t('adventure.start_sequel'))), xp >= threshold && typeof onExport === 'function' ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onExport,
    disabled: busy,
    "aria-busy": isProcessing || undefined,
    className: buttonClass
  }, isProcessing ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 17,
    "aria-hidden": "true",
    className: "animate-spin motion-reduce:animate-none"
  }) : /*#__PURE__*/React.createElement(BookOpen, {
    size: 17,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", null, isProcessing ? t('adventure.storybook_writing') : t('adventure.storybook'))) : xp < threshold ? /*#__PURE__*/React.createElement("p", {
    className: "text-xs leading-relaxed text-[var(--av-muted)] flex items-start gap-2 py-2"
  }, /*#__PURE__*/React.createElement(Lock, {
    size: 15,
    className: "shrink-0 mt-0.5",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", null, t('adventure.storybook_locked', {
    needed: Math.max(0, threshold - xp)
  }))) : null), state.canStartSequel && !canContinue && /*#__PURE__*/React.createElement("p", {
    className: "text-xs leading-relaxed text-[var(--av-muted)]"
  }, label('teacher_continues', 'Your teacher can continue the story with the class.')));
}
function AdventureTurnStatus({
  state,
  t,
  theme,
  immersive = false
}) {
  if (!state.isLoading || state.isGameOver) return null;
  const choice = typeof state.pendingChoice === 'string' ? state.pendingChoice.trim() : '';
  const stage = typeof state.loadingStage === 'string' ? state.loadingStage.trim() : '';
  return /*#__PURE__*/React.createElement("section", {
    "data-adventure-turn-status": true,
    "aria-label": adventureSettingsText(t, 'turn_status', 'Turn status'),
    style: adventureVisualTokens(theme, immersive),
    className: "w-full max-w-4xl min-w-0 rounded-2xl border border-[var(--av-line)] bg-[var(--av-surface)] p-4 sm:p-5 shadow-[var(--av-shadow)] text-[var(--av-ink)] [overflow-wrap:anywhere]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--av-wash)] border border-[var(--av-line)] text-[var(--av-accent)]"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 18,
    className: "animate-spin motion-reduce:animate-none"
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold"
  }, adventureSettingsText(t, 'turn_preparing', 'Preparing the next scene')), /*#__PURE__*/React.createElement("p", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    className: "mt-1 text-xs leading-relaxed text-[var(--av-muted)]"
  }, stage || adventureSettingsText(t, 'turn_waiting', 'The story is unfolding…')))), choice && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 rounded-xl border-l-[3px] border-[var(--av-accent)] bg-[var(--av-wash)] p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-semibold text-[var(--av-accent)] mb-1.5"
  }, adventureSettingsText(t, 'turn_decision', 'Your decision')), /*#__PURE__*/React.createElement("blockquote", {
    className: "text-sm leading-relaxed whitespace-pre-wrap text-[var(--av-ink)]"
  }, choice)));
}
function AdventureTurnRecovery({
  t,
  theme,
  immersive = false,
  loading,
  onRetry
}) {
  return /*#__PURE__*/React.createElement("div", {
    "data-adventure-turn-recovery": true,
    role: "alert",
    "aria-atomic": "true",
    style: adventureVisualTokens(theme, immersive),
    className: "w-full min-w-0 rounded-2xl border border-[var(--av-line)] bg-[var(--av-surface)] p-4 sm:p-5 text-[var(--av-ink)] shadow-[var(--av-shadow)] [overflow-wrap:anywhere]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--av-line)] bg-[var(--av-wash)] text-[var(--av-accent)]"
  }, /*#__PURE__*/React.createElement(WifiOff, {
    size: 24,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-sm sm:text-base font-bold"
  }, t('adventure.interrupted_title')), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-sm leading-relaxed text-[var(--av-muted)]"
  }, t('adventure.interrupted_desc')))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.retry_adventure_turn'),
    onClick: onRetry,
    disabled: loading || typeof onRetry !== 'function',
    className: "mt-4 min-h-11 w-full sm:w-auto px-4 py-3 flex items-center justify-center gap-2 rounded-xl border border-[var(--av-control)] bg-[var(--av-wash)] text-[var(--av-ink)] text-sm font-semibold hover:bg-[var(--av-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] disabled:opacity-50 disabled:cursor-not-allowed"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 16,
    "aria-hidden": "true",
    className: loading ? 'animate-spin motion-reduce:animate-none' : ''
  }), t('adventure.retry_action')));
}
function AdventureLearningProfiles(props) {
  const {
    adventureState: state,
    t,
    setAdventureState
  } = props;
  const dark = props.theme === 'dark' || props.theme === 'contrast';
  const contrast = props.theme === 'contrast';
  const accents = {
    guided: ['#047857', '#a7f3d0', '#ecfdf5'],
    debate: ['#0369a1', '#7dd3fc', '#f0f9ff'],
    systems: ['#92400e', '#fcd34d', '#fffbeb'],
    social: ['#6d28d9', '#c4b5fd', '#f5f3ff']
  };
  if (!props.isTeacherMode || typeof setAdventureState !== 'function') return null;
  const profiles = [{
    id: 'guided',
    title: 'Guided Story',
    detail: '12 decisions · 3 choices · peaceful exploration',
    mode: 'choice',
    free: false,
    peaceful: true,
    social: false,
    difficulty: 'Story',
    turns: 12,
    choices: 3
  }, {
    id: 'debate',
    title: 'Evidence Debate',
    detail: '12 decisions · write or dictate · compare evidence',
    mode: 'debate',
    free: true,
    peaceful: true,
    social: false,
    difficulty: 'Normal',
    turns: 12,
    choices: 3
  }, {
    id: 'systems',
    title: 'Systems Challenge',
    detail: '20 decisions · 4 choices · resource tradeoffs',
    mode: 'system',
    free: false,
    peaceful: true,
    social: false,
    difficulty: 'Normal',
    turns: 20,
    choices: 4
  }, {
    id: 'social',
    title: 'Social Practice',
    detail: '12 decisions · 4 choices · perspectives and repair',
    mode: 'choice',
    free: false,
    peaceful: true,
    social: true,
    difficulty: 'Story',
    turns: 12,
    choices: 4
  }];
  const apply = profile => {
    if (state.isLoading || state.currentScene) return;
    props.setAdventureInputMode(profile.mode);
    props.setAdventureDifficulty(profile.difficulty);
    props.setAdventureFreeResponseEnabled(profile.free);
    props.setAdventureChanceMode(false);
    props.setIsAdventureStoryMode(profile.peaceful);
    props.setIsSocialStoryMode(profile.social);
    props.setEnableFactionResources(profile.mode === 'system');
    // Keep manually authored resources when reapplying a profile.
    if (profile.mode === 'system' && props.factionResourceMode !== 'manual') props.setFactionResourceMode('ai');
    setAdventureState(previous => ({
      ...previous,
      episodeTurnLimit: profile.turns,
      enableAutoClimax: true,
      choiceCount: profile.choices,
      learningProfile: profile.id
    }));
  };
  return /*#__PURE__*/React.createElement("section", {
    "aria-label": adventureSettingsText(t, 'profiles', 'Learning profiles'),
    style: adventureVisualTokens(props.theme),
    className: "mb-5 rounded-3xl border border-[var(--av-line)] bg-[var(--av-surface)] p-4 sm:p-5 text-[var(--av-ink)] shadow-[var(--av-shadow)]"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-sm tracking-wide"
  }, adventureSettingsText(t, 'profiles', 'Learning profiles')), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-[var(--av-muted)] leading-relaxed mt-1 mb-4 max-w-2xl"
  }, adventureSettingsText(t, 'profiles_hint', 'Choose a starting experience, then adjust the settings below. Your lesson, language and custom instructions stay in place.')), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-3"
  }, profiles.map(profile => {
    const active = state.learningProfile === profile.id && props.adventureInputMode === profile.mode && props.adventureFreeResponseEnabled === profile.free && props.adventureDifficulty === profile.difficulty && !props.adventureChanceMode && props.isAdventureStoryMode === profile.peaceful && props.isSocialStoryMode === profile.social && state.episodeTurnLimit === profile.turns && state.enableAutoClimax && state.choiceCount === profile.choices && !!props.enableFactionResources === (profile.mode === 'system');
    const colors = accents[profile.id];
    const accent = contrast ? '#fde047' : colors[dark ? 1 : 0];
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      key: profile.id,
      "aria-pressed": state.learningProfile === profile.id,
      disabled: state.isLoading || !!state.currentScene,
      onClick: () => apply(profile),
      style: {
        '--av-profile': accent,
        borderColor: active ? accent : undefined,
        backgroundColor: active ? dark ? 'var(--av-wash)' : colors[2] : 'var(--av-surface)'
      },
      className: "group relative min-h-24 min-w-0 flex items-center gap-3 rounded-2xl border-2 border-[var(--av-line)] p-3 sm:p-4 text-left hover:border-[var(--av-profile)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 transition-[border-color,box-shadow] motion-reduce:transition-none disabled:opacity-50"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: accent
      },
      className: "shrink-0"
    }, /*#__PURE__*/React.createElement(AdventureProfileMark, {
      profile: profile.id,
      className: "w-12 h-12 sm:w-14 sm:h-14"
    })), /*#__PURE__*/React.createElement("span", {
      className: "block min-w-0 pr-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "block text-sm font-bold leading-snug"
    }, adventureSettingsText(t, 'profile_' + profile.id, profile.title)), /*#__PURE__*/React.createElement("span", {
      className: "block mt-1.5 text-xs leading-relaxed text-[var(--av-muted)]"
    }, adventureSettingsText(t, 'profile_' + profile.id + '_detail', profile.detail))), state.learningProfile === profile.id && !active && /*#__PURE__*/React.createElement("span", {
      className: "block text-xs font-semibold text-[var(--av-muted)]"
    }, adventureSettingsText(t, 'customized', 'Customized')), active && /*#__PURE__*/React.createElement("svg", {
      viewBox: "0 0 20 20",
      "aria-hidden": "true",
      focusable: "false",
      className: "absolute right-2 top-2 h-4 w-4 text-[var(--av-profile)]",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2.5"
    }, /*#__PURE__*/React.createElement("path", {
      d: "m4 10 4 4 8-8"
    })));
  })));
}
function AdventureConsequenceCard({
  consequence,
  t,
  immersive = false,
  theme = 'light'
}) {
  if (!consequence || consequence.version !== 1) return null;
  var label = function (key, fallback) {
    var value = t('adventure.debrief.' + key);
    return value && value !== 'adventure.debrief.' + key ? value : fallback;
  };
  var ratings = {
    strategic_success: ['effective', 'Effective strategy'],
    partial_success: ['partial', 'Partly supported strategy'],
    misconception: ['revisit', 'Reasoning to revisit'],
    neutral: ['unrated', 'Strategy not rated']
  };
  var rating = ratings[consequence.reasoning] || ratings.neutral;
  var changes = (Array.isArray(consequence.changes) ? consequence.changes : []).filter(function (c) {
    return c && Number.isFinite(c.before) && Number.isFinite(c.after);
  }).slice(0, 12);
  var concepts = (Array.isArray(consequence.concepts) ? consequence.concepts : []).filter(function (c) {
    return typeof c === 'string';
  }).slice(0, 6);
  return /*#__PURE__*/React.createElement("section", {
    "aria-label": label('title', 'Decision debrief'),
    style: adventureVisualTokens(theme, immersive),
    className: "not-italic rounded-2xl border border-[var(--av-line)] border-t-[3px] border-t-[var(--av-accent)] bg-[var(--av-surface)] p-4 space-y-4 min-w-0 break-words text-[var(--av-ink)] shadow-[var(--av-shadow)]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: `text-[11px] uppercase tracking-wider font-bold text-[var(--av-accent)]`
  }, label('title', 'Decision debrief')), /*#__PURE__*/React.createElement("span", {
    className: `rounded-full px-2 py-1 text-xs font-semibold bg-[var(--av-wash)] text-[var(--av-ink)] border border-[var(--av-line)]`
  }, label(rating[0], rating[1]))), typeof consequence.explanation === 'string' && consequence.explanation && /*#__PURE__*/React.createElement("p", {
    className: "text-sm leading-relaxed whitespace-pre-wrap"
  }, consequence.explanation.slice(0, 1800)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold mb-3 text-[var(--av-muted)]"
  }, label('changes', 'Recorded story changes')), changes.length > 0 ? /*#__PURE__*/React.createElement("dl", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-2"
  }, changes.map(function (change, index) {
    return /*#__PURE__*/React.createElement("div", {
      key: index,
      className: "rounded-xl border border-[var(--av-line)] bg-[var(--av-wash)] px-3 py-3 min-w-0"
    }, /*#__PURE__*/React.createElement("dt", {
      className: "text-xs text-[var(--av-muted)] mb-1"
    }, typeof change.key === 'string' && (change.key.startsWith('resource:') || change.key.startsWith('inventory:')) ? String(change.label || '').slice(0, 80) : label('metric_' + change.key, String(change.label || '').slice(0, 80))), /*#__PURE__*/React.createElement("dd", {
      className: "tabular-nums flex flex-wrap items-baseline gap-x-2 gap-y-1"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-sm text-[var(--av-muted)]"
    }, change.before), /*#__PURE__*/React.createElement("span", {
      className: "text-[var(--av-accent)]",
      "aria-label": label('to', 'to')
    }, "→"), /*#__PURE__*/React.createElement("strong", {
      className: "text-lg leading-tight"
    }, change.after), change.unit && /*#__PURE__*/React.createElement("span", {
      className: "text-xs text-[var(--av-muted)]"
    }, String(change.unit).slice(0, 30))));
  })) : /*#__PURE__*/React.createElement("p", {
    className: "text-xs"
  }, label('no_changes', 'No tracked values changed this turn.'))), /*#__PURE__*/React.createElement("p", {
    className: `text-xs leading-relaxed text-[var(--av-muted)]`
  }, label('ai_note', 'Strategy feedback is AI guidance, not a grade.'), consequence.chanceMode && /*#__PURE__*/React.createElement(React.Fragment, null, " ", Number.isFinite(consequence.chanceRoll) && /*#__PURE__*/React.createElement("strong", null, label('die', 'Chance die'), ": ", consequence.chanceRoll, "/20. "), label('chance_note', 'Chance can change the story result without changing the quality of your reasoning.'))), (consequence.choice || concepts.length > 0 || consequence.learningFeedback) && /*#__PURE__*/React.createElement("details", {
    className: `border-t pt-2 border-[var(--av-line)]`
  }, /*#__PURE__*/React.createElement("summary", {
    className: `cursor-pointer text-xs font-semibold min-h-8 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${immersive || theme === 'dark' || theme === 'contrast' ? 'focus-visible:outline-cyan-300' : 'focus-visible:outline-teal-800'}`
  }, label('reflect', 'Review your decision')), typeof consequence.choice === 'string' && /*#__PURE__*/React.createElement("p", {
    className: "text-sm mt-3 whitespace-pre-wrap border-l-2 border-[var(--av-accent)] pl-3 leading-relaxed"
  }, consequence.choice.slice(0, 1200)), concepts.length > 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-xs mt-2"
  }, /*#__PURE__*/React.createElement("strong", null, label('concepts', 'Concepts to check'), ": "), concepts.join(' · ')), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 grid grid-cols-1 gap-2"
  }, Object.entries(consequence.learningFeedback || {}).filter(([key, value]) => ['evidence', 'reasoning', 'counterpoint', 'immediate', 'delayed', 'tradeoff'].includes(key) && typeof value === 'string').map(([key, value]) => /*#__PURE__*/React.createElement("p", {
    key: key,
    className: "text-xs leading-relaxed rounded-xl border border-[var(--av-line)] bg-[var(--av-wash)] p-3"
  }, /*#__PURE__*/React.createElement("strong", {
    className: "block mb-1"
  }, label('feedback_' + key, {
    evidence: 'Evidence',
    reasoning: 'Reasoning',
    counterpoint: 'Counterargument / next step',
    immediate: 'Immediate effect',
    delayed: 'Possible delayed effect',
    tradeoff: 'Tradeoff'
  }[key]), ": "), /*#__PURE__*/React.createElement("span", null, value.slice(0, 360))))), consequence.mode === 'system' && /*#__PURE__*/React.createElement("p", {
    className: "text-xs mt-2"
  }, label('forecast_note', 'AI scenario estimates. Delayed effects are predictions, not scheduled changes; check the lesson evidence.')), /*#__PURE__*/React.createElement("p", {
    className: "text-xs mt-2"
  }, label('next', 'Which part of your reasoning would you keep or change next time?'))));
}
function AdventureHistoryEntry({
  entry,
  t,
  theme,
  immersive = false,
  renderFormattedText
}) {
  if (!entry || typeof entry !== 'object') return null;
  if (entry.type === 'feedback' && entry.consequence?.version === 1) {
    return /*#__PURE__*/React.createElement(AdventureConsequenceCard, {
      consequence: entry.consequence,
      t: t,
      theme: theme,
      immersive: immersive
    });
  }
  const choice = entry.type === 'choice';
  const label = choice ? adventureSettingsText(t, 'journal_choice', 'Your decision') : entry.type === 'scene' ? adventureSettingsText(t, 'journal_scene', 'Story context') : entry.type === 'feedback' ? adventureSettingsText(t, 'journal_feedback', 'Feedback') : entry.type === 'assist' ? adventureSettingsText(t, 'journal_assist', 'Guiding Hand support') : adventureSettingsText(t, 'journal_note', 'Story note');
  return /*#__PURE__*/React.createElement("article", {
    "aria-label": label,
    style: adventureVisualTokens(theme, immersive),
    className: 'rounded-2xl border bg-[var(--av-surface)] p-4 min-w-0 [overflow-wrap:anywhere] text-[var(--av-ink)] ' + (choice ? 'border-[var(--av-accent)] border-l-[3px]' : 'border-[var(--av-line)]')
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-[var(--av-accent)] mb-2 flex items-center gap-2"
  }, choice ? /*#__PURE__*/React.createElement(MousePointerClick, {
    size: 14,
    "aria-hidden": "true"
  }) : entry.type === 'scene' ? /*#__PURE__*/React.createElement(BookOpen, {
    size: 14,
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(Sparkles, {
    size: 14,
    "aria-hidden": "true"
  }), label), /*#__PURE__*/React.createElement("div", {
    className: 'text-sm leading-relaxed whitespace-pre-wrap ' + (entry.type === 'scene' ? 'font-serif' : '')
  }, renderFormattedText(typeof entry.text === 'string' ? entry.text : '', !immersive, choice)));
}
function adventureRecentHistory(history) {
  const entries = Array.isArray(history) ? history : [];
  let start = 0;
  entries.forEach((entry, index) => {
    if (entry?.type === 'scene') start = index + 1;else if (entry?.type === 'choice') start = index;
  });
  return entries.slice(start);
}
function AdventureJourneyNotebook({
  history,
  t,
  theme,
  immersive = false,
  renderFormattedText
}) {
  const notebookRef = React.useRef(null);
  const [expanded, setExpanded] = React.useState(false);
  const entries = (Array.isArray(history) ? history : []).filter(entry => entry && typeof entry === 'object');
  React.useEffect(() => {
    if (!entries.length) setExpanded(false);
  }, [entries.length]);
  if (!entries.length) return null;
  const label = adventureSettingsText(t, 'journal_title', 'Journey notebook');
  const decisions = entries.filter(entry => entry.type === 'choice').length;
  return /*#__PURE__*/React.createElement("details", {
    ref: notebookRef,
    "data-adventure-notebook": true,
    style: adventureVisualTokens(theme, immersive),
    onToggle: event => setExpanded(event.currentTarget.open),
    className: "rounded-2xl border border-[var(--av-line)] bg-[var(--av-surface)] text-[var(--av-ink)] min-w-0 shadow-[var(--av-shadow)]"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "list-none cursor-pointer min-h-11 p-4 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] [&::-webkit-details-marker]:hidden"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    className: "shrink-0 w-10 h-10 rounded-xl border border-[var(--av-line)] bg-[var(--av-wash)] text-[var(--av-accent)] flex items-center justify-center"
  }, /*#__PURE__*/React.createElement(History, {
    size: 19
  })), /*#__PURE__*/React.createElement("span", {
    className: "min-w-0 flex-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block text-sm font-bold"
  }, label), /*#__PURE__*/React.createElement("span", {
    className: "block text-xs text-[var(--av-muted)] mt-1"
  }, adventureSettingsText(t, 'journal_decisions', 'Recorded decisions'), ": ", /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums"
  }, decisions))), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    className: "text-[var(--av-accent)] text-xl font-semibold w-5 text-center shrink-0"
  }, expanded ? '−' : '+'))), expanded && /*#__PURE__*/React.createElement("div", {
    className: "px-4 pb-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "border-t border-[var(--av-line)] pt-3 pb-4 text-xs leading-relaxed text-[var(--av-muted)]"
  }, adventureSettingsText(t, 'journal_hint', 'Follow the story, your decisions, and what changed. Use the lesson to check the feedback.')), /*#__PURE__*/React.createElement("ol", {
    "aria-label": adventureSettingsText(t, 'journal_records', 'Story records'),
    className: "ml-1 pl-4 border-l border-[var(--av-line)] space-y-3"
  }, entries.map((entry, index) => /*#__PURE__*/React.createElement("li", {
    key: index,
    className: "relative min-w-0"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    className: "absolute -left-[21px] top-5 w-2 h-2 rounded-full bg-[var(--av-accent)]"
  }), /*#__PURE__*/React.createElement(AdventureHistoryEntry, {
    entry: entry,
    t: t,
    theme: theme,
    immersive: immersive,
    renderFormattedText: renderFormattedText
  })))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      if (!notebookRef.current) return;
      notebookRef.current.open = false;
      notebookRef.current.querySelector('summary')?.focus();
    },
    className: "mt-4 min-h-11 w-full rounded-xl border border-[var(--av-control)] bg-[var(--av-wash)] px-3 py-2 text-sm font-bold text-[var(--av-ink)] hover:bg-[var(--av-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)]"
  }, adventureSettingsText(t, 'journal_close', 'Close notebook'))));
}
function useAdventureDialogFocus(isOpen, dialogRef, onClose) {
  var closeHandlerRef = React.useRef(onClose);
  closeHandlerRef.current = onClose;
  React.useEffect(function () {
    if (!isOpen) return undefined;
    var dialog = dialogRef.current;
    if (!dialog) return undefined;
    var previousFocus = document.activeElement;
    var getFocusable = function () {
      return Array.from(dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    };
    (getFocusable()[0] || dialog).focus();
    var onKeyDown = function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeHandlerRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      var focusable = getFocusable();
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener('keydown', onKeyDown);
    return function () {
      dialog.removeEventListener('keydown', onKeyDown);
      if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    };
  }, [isOpen, dialogRef]);
}

// Adventure free response is composition, not a transcription drill. Reuse the
// Typing Lab's five-characters-per-word convention, but keep the result local to
// the current turn and descriptive only. Pasted/dictated responses retain a word
// count while the comparative WPM value is intentionally suppressed.
function useAdventureTypingPace(enabled, text, dictationActive) {
  var startedAtRef = React.useRef(null);
  var pausedAtRef = React.useRef(null);
  var pausedMsRef = React.useRef(0);
  var assistedRef = React.useRef(null);
  var _tickState = React.useState(0);
  var tick = _tickState[0];
  var setTick = _tickState[1];
  var reset = React.useCallback(function () {
    startedAtRef.current = null;
    pausedAtRef.current = null;
    pausedMsRef.current = 0;
    assistedRef.current = null;
    setTick(function (value) {
      return value + 1;
    });
  }, []);
  var pause = React.useCallback(function () {
    if (startedAtRef.current && !pausedAtRef.current) pausedAtRef.current = Date.now();
  }, []);
  var resume = React.useCallback(function () {
    if (!startedAtRef.current || !pausedAtRef.current) return;
    pausedMsRef.current += Date.now() - pausedAtRef.current;
    pausedAtRef.current = null;
  }, []);
  var markAssisted = React.useCallback(function (kind) {
    assistedRef.current = kind || 'assisted';
    setTick(function (value) {
      return value + 1;
    });
  }, []);
  var noteChange = React.useCallback(function (nextText, nativeEvent) {
    if (!enabled) return;
    var value = String(nextText || '');
    if (!value) {
      reset();
      return;
    }
    if (!startedAtRef.current) startedAtRef.current = Date.now();
    var inputType = String(nativeEvent && nativeEvent.inputType || '');
    if (dictationActive || inputType === 'insertFromDictation' || inputType === 'insertFromSpeech') {
      assistedRef.current = 'dictation';
    } else if (inputType === 'insertFromPaste' || inputType === 'insertFromDrop' || inputType === 'insertFromYank') {
      assistedRef.current = 'paste';
    }
    setTick(function (value2) {
      return value2 + 1;
    });
  }, [dictationActive, enabled, reset]);
  React.useEffect(function () {
    if (!enabled || !text) return undefined;
    var timer = setInterval(function () {
      setTick(function (value) {
        return value + 1;
      });
    }, 1000);
    return function () {
      clearInterval(timer);
    };
  }, [enabled, text]);
  React.useEffect(function () {
    if (!enabled || !text) reset();
  }, [enabled, text, reset]);
  React.useEffect(function () {
    if (!enabled) return undefined;
    var onVisibility = function () {
      if (document.hidden) pause();else resume();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return function () {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled, pause, resume]);
  var now = Date.now();
  var activeMs = startedAtRef.current ? Math.max(0, now - startedAtRef.current - pausedMsRef.current - (pausedAtRef.current ? now - pausedAtRef.current : 0)) : 0;
  var charCount = Array.from(String(text || '')).length;
  var wordCount = String(text || '').trim() ? String(text).trim().split(/\s+/).length : 0;
  var wpm = activeMs > 0 && charCount > 0 ? Math.round(charCount / 5 / (activeMs / 60000)) : 0;
  void tick;
  return {
    activeMs: activeMs,
    assisted: assistedRef.current,
    markAssisted: markAssisted,
    noteChange: noteChange,
    pause: pause,
    resume: resume,
    wordCount: wordCount,
    wpm: wpm
  };
}
function AdventureFluencyPractice(props) {
  var open = props.open;
  var t = props.t;
  var sceneText = String(props.sceneText || '').trim();
  var dialogRef = React.useRef(null);
  var recorderRef = React.useRef(null);
  var streamRef = React.useRef(null);
  var chunksRef = React.useRef([]);
  var passageRef = React.useRef(null);
  var _statusState = React.useState('idle');
  var status = _statusState[0];
  var setStatus = _statusState[1];
  var _resultState = React.useState(null);
  var result = _resultState[0];
  var setResult = _resultState[1];
  var _errorState = React.useState('');
  var error = _errorState[0];
  var setError = _errorState[1];
  var _cloudState = React.useState(false);
  var allowCloud = _cloudState[0];
  var setAllowCloud = _cloudState[1];
  var _savedState = React.useState(false);
  var saved = _savedState[0];
  var setSaved = _savedState[1];
  var stopTracks = React.useCallback(function () {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(function (track) {
        try {
          track.stop();
        } catch (_) {}
      });
      streamRef.current = null;
    }
  }, []);
  var closePractice = React.useCallback(function () {
    if (status === 'processing') return;
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch (_) {}
    }
    recorderRef.current = null;
    stopTracks();
    setStatus('idle');
    setResult(null);
    setError('');
    setSaved(false);
    props.onClose();
  }, [props.onClose, status, stopTracks]);
  useAdventureDialogFocus(open, dialogRef, closePractice);
  React.useEffect(function () {
    return stopTracks;
  }, [stopTracks]);
  React.useEffect(function () {
    if (!open) return;
    setStatus('idle');
    setResult(null);
    setError('');
    setSaved(false);
    setAllowCloud(false);
  }, [open, props.sceneId]);
  var blobToBase64 = function (blob) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onloadend = function () {
        resolve(String(reader.result || '').split(',')[1] || '');
      };
      reader.onerror = function () {
        reject(reader.error || new Error('Could not read the recording.'));
      };
      reader.readAsDataURL(blob);
    });
  };
  var startRecording = async function () {
    setError('');
    setResult(null);
    setSaved(false);
    if (!sceneText) {
      setError(t('adventure.fluency_no_scene') || 'There is no scene passage to read yet.');
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError(t('adventure.fluency_microphone_unavailable') || 'Microphone recording is not available in this browser.');
      return;
    }
    try {
      if (typeof props.stopPlayback === 'function') props.stopPlayback();
      var stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      streamRef.current = stream;
      var mimeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
      var mimeType = mimeCandidates.find(function (candidate) {
        return !MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported(candidate);
      }) || '';
      var recorder = mimeType ? new MediaRecorder(stream, {
        mimeType: mimeType
      }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = function (event) {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorderRef.current = recorder;
      passageRef.current = {
        text: sceneText,
        sceneId: props.sceneId,
        turnCount: props.turnCount,
        language: props.language,
        startedAt: Date.now()
      };
      recorder.start();
      setStatus('recording');
    } catch (recordingError) {
      stopTracks();
      setError(t('errors.microphone_access_denied') || 'Microphone access was denied or unavailable.');
      setStatus('idle');
    }
  };
  var stopAndAnalyze = async function () {
    var recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    setStatus('processing');
    setError('');
    try {
      var blob = await new Promise(function (resolve, reject) {
        recorder.onstop = function () {
          var type = recorder.mimeType || 'audio/webm';
          resolve(new Blob(chunksRef.current, {
            type: type
          }));
        };
        recorder.onerror = function (event) {
          reject(event.error || new Error('Recording failed.'));
        };
        recorder.stop();
      });
      stopTracks();
      recorderRef.current = null;
      var captured = passageRef.current;
      var durationSeconds = Math.max(1, (Date.now() - captured.startedAt) / 1000);
      var audioBase64 = await blobToBase64(blob);
      var fluency = window.AlloModules && window.AlloModules.Fluency;
      if (!fluency) throw new Error(t('adventure.fluency_engine_unavailable') || 'Reading analysis is still loading. Please try again.');
      var analysis = null;
      if (typeof fluency.analyzeFluencyLocal === 'function') {
        analysis = await fluency.analyzeFluencyLocal(audioBase64, blob.type || 'audio/webm', captured.text, {});
      }
      if (!analysis && allowCloud && typeof fluency.analyzeFluencyWithGemini === 'function') {
        analysis = await fluency.analyzeFluencyWithGemini(audioBase64, blob.type || 'audio/webm', captured.text);
      }
      if (!analysis || !Array.isArray(analysis.wordData)) {
        throw new Error(allowCloud ? t('adventure.fluency_analysis_failed') || 'The reading could not be analyzed. Your recording was not saved.' : t('adventure.fluency_local_unavailable') || 'On-device analysis is unavailable. Enable cloud analysis to use Google Gemini, or try again on a School Box device.');
      }
      var passageMetadata = typeof fluency.createFluencyPassageMetadata === 'function' ? fluency.createFluencyPassageMetadata(captured.text, {
        passageId: 'adventure-' + String(captured.sceneId || captured.turnCount || Date.now()),
        title: 'Adventure scene ' + String(captured.turnCount || ''),
        grade: props.gradeLevel,
        language: captured.language,
        calibrated: false
      }) : {
        passageId: 'adventure-' + String(captured.sceneId || captured.turnCount || Date.now()),
        calibrated: false
      };
      var totalWords = passageMetadata.wordCount || captured.text.split(/\s+/).filter(Boolean).length;
      var metrics = fluency.calculateLocalFluencyMetrics(analysis.wordData, durationSeconds, totalWords, analysis.insertions || []);
      var recordId = 'adventure-fluency-' + Date.now().toString(36);
      setResult({
        recordId: recordId,
        timestamp: new Date().toISOString(),
        sourceKind: 'adventure-scene',
        sourceText: captured.text,
        sceneId: captured.sceneId,
        turnCount: captured.turnCount,
        audioBase64: audioBase64,
        mimeType: blob.type || 'audio/webm',
        durationSeconds: durationSeconds,
        passageMetadata: passageMetadata,
        wordData: analysis.wordData,
        insertions: analysis.insertions || [],
        feedback: analysis.feedback || '',
        confidence: analysis.confidence || null,
        prosody: analysis.prosody || null,
        method: analysis.method || 'cloud-ai',
        accuracy: metrics.accuracy,
        wcpm: metrics.wcpm,
        correctWords: metrics.correctWords,
        metrics: Object.assign({}, metrics, {
          durationSeconds: durationSeconds,
          totalWords: totalWords
        })
      });
      setStatus('complete');
    } catch (analysisError) {
      stopTracks();
      recorderRef.current = null;
      setError(analysisError && analysisError.message ? analysisError.message : t('adventure.fluency_analysis_failed') || 'The reading could not be analyzed.');
      setStatus('idle');
    }
  };
  var saveResult = async function () {
    if (!result || typeof props.onSave !== 'function' || saved) return;
    try {
      await props.onSave(result);
      setSaved(true);
    } catch (saveError) {
      setError(saveError && saveError.message ? saveError.message : t('adventure.fluency_save_failed') || 'The reading result could not be saved.');
    }
  };
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    role: "presentation",
    className: "fixed inset-0 z-[260] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3",
    onMouseDown: event => {
      if (event.target === event.currentTarget && status !== 'recording' && status !== 'processing') closePractice();
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: dialogRef,
    tabIndex: -1,
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "adventure-fluency-title",
    "aria-describedby": "adventure-fluency-description",
    className: "w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-rose-200 bg-white p-5 shadow-2xl focus:outline-none"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between gap-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    id: "adventure-fluency-title",
    className: "text-xl font-black text-slate-900 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Mic, {
    size: 20,
    "aria-hidden": "true"
  }), " ", t('adventure.fluency_title') || 'Practice reading this scene'), /*#__PURE__*/React.createElement("p", {
    id: "adventure-fluency-description",
    className: "mt-1 text-sm text-slate-600"
  }, t('adventure.fluency_description') || 'Read the AI narrator\u2019s passage aloud. Results are descriptive practice only, not a benchmark score.')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: closePractice,
    disabled: status === 'processing',
    className: "min-w-11 min-h-11 rounded-full p-2 text-slate-700 hover:bg-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 20,
    "aria-hidden": "true"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 max-h-56 overflow-y-auto rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm font-medium leading-relaxed text-slate-800"
  }, sceneText), /*#__PURE__*/React.createElement("label", {
    className: "mt-4 flex min-h-11 items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-slate-700"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: allowCloud,
    disabled: status === 'recording' || status === 'processing',
    onChange: event => setAllowCloud(event.target.checked),
    className: "mt-0.5 h-5 w-5 shrink-0 rounded text-sky-700 focus-visible:ring-2 focus-visible:ring-sky-700"
  }), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", {
    className: "block text-slate-900"
  }, t('adventure.fluency_cloud_label') || 'Allow cloud analysis if on-device analysis is unavailable'), t('adventure.fluency_cloud_desc') || 'When enabled, this recording may be sent to Google Gemini for word-by-word analysis. The recording is not saved unless you choose Save below.')), error && /*#__PURE__*/React.createElement("div", {
    role: "alert",
    className: "mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800"
  }, error), status === 'complete' && result && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl bg-white p-3 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-3xl font-black text-indigo-700"
  }, result.wcpm), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-bold uppercase tracking-wide text-slate-600"
  }, t('fluency.wcpm_label') || 'Words correct per minute')), /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl bg-white p-3 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-3xl font-black text-emerald-700"
  }, result.accuracy, "%"), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-bold uppercase tracking-wide text-slate-600"
  }, t('fluency.accuracy_score') || 'Accuracy'))), /*#__PURE__*/React.createElement("p", {
    className: "mt-3 text-xs font-bold text-indigo-950"
  }, t('adventure.fluency_descriptive_note') || 'Adventure passages are AI-generated and uncalibrated. Use this result for practice and reflection only.'), result.feedback && /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-sm text-slate-700"
  }, result.feedback)), /*#__PURE__*/React.createElement("div", {
    className: "mt-5 flex flex-wrap items-center justify-center gap-3"
  }, status === 'recording' ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: stopAndAnalyze,
    className: "min-h-11 rounded-xl bg-red-700 px-5 py-3 font-black text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\\u25A0"), " ", t('fluency.stop_recording') || 'Stop and analyze') : status === 'processing' ? /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    className: "min-h-11 rounded-xl bg-indigo-100 px-5 py-3 font-black text-indigo-800"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 16,
    className: "mr-2 inline animate-spin motion-reduce:animate-none",
    "aria-hidden": "true"
  }), " ", t('fluency.processing') || 'Analyzing reading...') : /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: startRecording,
    className: "min-h-11 rounded-xl bg-rose-700 px-5 py-3 font-black text-white hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-2"
  }, /*#__PURE__*/React.createElement(Mic, {
    size: 16,
    className: "mr-2 inline",
    "aria-hidden": "true"
  }), " ", status === 'complete' ? t('adventure.fluency_try_again') || 'Try again' : t('fluency.start_recording') || 'Start recording'), status === 'complete' && result && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: saveResult,
    disabled: saved,
    className: "min-h-11 rounded-xl border-2 border-indigo-600 bg-white px-5 py-3 font-black text-indigo-700 hover:bg-indigo-50 disabled:cursor-default disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
  }, saved ? t('adventure.fluency_saved') || 'Saved to reading history' : t('adventure.fluency_save') || 'Save to reading history'))));
}
function AdventureView(props) {
  const [showFullIllustration, setShowFullIllustration] = React.useState(false);
  // State (object-bundle)
  var adventureState = props.adventureState;
  var setAdventureState = props.setAdventureState;
  var episodeLimit = Object.prototype.hasOwnProperty.call(adventureState, 'episodeTurnLimit') ? adventureState.episodeTurnLimit : adventureState.enableAutoClimax ? null : Math.max(3, Math.min(50, Number(adventureState.climaxMinTurns) || 20));
  var glossLanguage = window.AlloModules?.AdventureHandlers?.adventureGlossLanguage?.(props) || 'English';
  // State reads
  var t = props.t;
  var globalPoints = props.globalPoints;
  var soundEnabled = props.soundEnabled;
  var activeView = props.activeView;
  var showLedger = props.showLedger;
  var isProcessing = props.isProcessing;
  var adventureImageSize = props.adventureImageSize;
  var adventureAutoRead = props.adventureAutoRead;
  var adventureTypingPaceEnabled = props.adventureTypingPaceEnabled;
  var adventureFluencyEnabled = props.adventureFluencyEnabled;
  var isDictationMode = props.isDictationMode;
  var adventureTextInput = props.adventureTextInput;
  var adventureInputMode = props.adventureInputMode;
  var adventureArtStyle = props.adventureArtStyle;
  var adventureCustomArtStyle = props.adventureCustomArtStyle;
  var universalImageStyle = props.universalImageStyle;
  var useLowQualityVisuals = props.useLowQualityVisuals;
  var enableFactionResources = props.enableFactionResources;
  var isZenMode = props.isZenMode;
  var showNewGameSetup = props.showNewGameSetup;
  var hasSavedAdventure = props.hasSavedAdventure;
  var isEditingOptions = props.isEditingOptions;
  var editingOptionsBuffer = props.editingOptionsBuffer;
  var adventureChanceMode = props.adventureChanceMode;
  var isAdventureStoryMode = props.isAdventureStoryMode;
  var adventureConsistentCharacters = props.adventureConsistentCharacters;
  var adventureFreeResponseEnabled = props.adventureFreeResponseEnabled;
  var adventureDifficulty = props.adventureDifficulty;
  var adventureLanguageMode = props.adventureLanguageMode;
  var selectedLanguages = props.selectedLanguages;
  var adventureCustomInstructions = props.adventureCustomInstructions;
  var isTeacherMode = props.isTeacherMode;
  var studentProjectSettings = props.studentProjectSettings;
  var failedAdventureAction = props.failedAdventureAction;
  var selectedInventoryItem = props.selectedInventoryItem;
  var showImmersiveInventory = props.showImmersiveInventory;
  var immersiveHideUI = props.immersiveHideUI;
  var immersiveShowChoices = props.immersiveShowChoices;
  var sessionData = props.sessionData;
  var currentUserUid = props.currentUserUid;
  var activeSessionCode = props.activeSessionCode;
  var isPlaying = props.isPlaying;
  var playbackState = props.playbackState;
  var playingContentId = props.playingContentId;
  var theme = props.theme;
  var STYLE_IMAGE_PIXELATED = props.STYLE_IMAGE_PIXELATED;
  // Refs
  var adventureScrollRef = props.adventureScrollRef;
  var adventureInputRef = props.adventureInputRef;
  // Setters
  var setAdventureInputMode = props.setAdventureInputMode;
  var setAdventureDifficulty = props.setAdventureDifficulty;
  var setAdventureLanguageMode = props.setAdventureLanguageMode;
  var setAdventureFreeResponseEnabled = props.setAdventureFreeResponseEnabled;
  var setAdventureChanceMode = props.setAdventureChanceMode;
  var setIsAdventureStoryMode = props.setIsAdventureStoryMode;
  var setAdventureConsistentCharacters = props.setAdventureConsistentCharacters;
  var setAdventureArtStyle = props.setAdventureArtStyle;
  var setAdventureCustomArtStyle = props.setAdventureCustomArtStyle;
  var setUseLowQualityVisuals = props.setUseLowQualityVisuals;
  var setEnableFactionResources = props.setEnableFactionResources;
  var setAdventureCustomInstructions = props.setAdventureCustomInstructions;
  var setAdventureTextInput = props.setAdventureTextInput;
  var setIsDictationMode = props.setIsDictationMode;
  var setSelectedInventoryItem = props.setSelectedInventoryItem;
  var setShowImmersiveInventory = props.setShowImmersiveInventory;
  var setShowLedger = props.setShowLedger;
  var setShowStorybookExportModal = props.setShowStorybookExportModal;
  var setAdventureImageSize = props.setAdventureImageSize;
  var setAdventureAutoRead = props.setAdventureAutoRead;
  var setAdventureTypingPaceEnabled = props.setAdventureTypingPaceEnabled;
  var setAdventureFluencyEnabled = props.setAdventureFluencyEnabled;
  // Handlers (lifted in this session's prep + existing)
  var handleToggleAdventureImmersive = props.handleToggleAdventureImmersive;
  var handleExitAdventureImmersive = props.handleExitAdventureImmersive;
  var handleSetEnableAutoClimax = props.handleSetEnableAutoClimax;
  var handleSetClimaxMinTurns = props.handleSetClimaxMinTurns;
  var handleAddOptionSlot = props.handleAddOptionSlot;
  var handleAdventureChoice = props.handleAdventureChoice;
  var handleAdventureCrashRecovery = props.handleAdventureCrashRecovery;
  var handleAdventureTextSubmit = props.handleAdventureTextSubmit;
  var handleBroadcastOptions = props.handleBroadcastOptions;
  var handleCloseShop = props.handleCloseShop;
  var handleOptionBufferChange = props.handleOptionBufferChange;
  var handleRemoveOptionSlot = props.handleRemoveOptionSlot;
  var handleResumeAdventure = props.handleResumeAdventure;
  var handleRetryAdventureTurn = props.handleRetryAdventureTurn;
  var handleSelectInventoryItem = props.handleSelectInventoryItem;
  var handleSetIsEditingOptionsToFalse = props.handleSetIsEditingOptionsToFalse;
  var handleSetIsZenModeToTrue = props.handleSetIsZenModeToTrue;
  var handleSetSelectedInventoryItemToNull = props.handleSetSelectedInventoryItemToNull;
  var handleSetShowLedgerToFalse = props.handleSetShowLedgerToFalse;
  var handleSetShowLedgerToTrue = props.handleSetShowLedgerToTrue;
  var handleSetShowNewGameSetupToFalse = props.handleSetShowNewGameSetupToFalse;
  var handleSetShowNewGameSetupToTrue = props.handleSetShowNewGameSetupToTrue;
  var handleSetShowStorybookExportModalToTrue = props.handleSetShowStorybookExportModalToTrue;
  var handleShopPurchase = props.handleShopPurchase;
  var handleSpeak = props.handleSpeak;
  var prewarmAdventureAudio = props.prewarmAdventureAudio; // scene TTS pre-warm (2026-07-16)
  var handleAdventureHint = props.handleAdventureHint; // once-per-scene free-response Strategy Hint
  var handleStartAdventure = props.handleStartAdventure;
  var handleStartOptionEdit = props.handleStartOptionEdit;
  var handleStartSequel = props.handleStartSequel;
  var handleToggleImmersiveHideUI = props.handleToggleImmersiveHideUI;
  var handleToggleImmersiveShowChoices = props.handleToggleImmersiveShowChoices;
  var handleUseItem = props.handleUseItem;
  var toggleDemocracyMode = props.toggleDemocracyMode;
  var openAdventureActionVote = props.openAdventureActionVote;
  // Pure helpers
  var renderFormattedText = props.renderFormattedText;
  var formatInteractiveText = props.formatInteractiveText;
  var splitTextToSentences = props.splitTextToSentences;
  var stopPlayback = props.stopPlayback;
  var saveAdventureFluencyResult = props.saveAdventureFluencyResult;
  var executeStartAdventure = props.executeStartAdventure;
  var adventureEffects = props.adventureEffects;
  // Components
  var ErrorBoundary = props.ErrorBoundary;
  var AdventureAmbience = props.AdventureAmbience;
  var AdventureAudioControls = props.AdventureAudioControls || typeof window !== 'undefined' && window.AlloModules && window.AlloModules.AdventureAudioControls;
  var AdventureShop = props.AdventureShop;
  var AnimatedNumber = props.AnimatedNumber;
  var ClimaxProgressBar = props.ClimaxProgressBar;
  var ConfettiExplosion = props.ConfettiExplosion;
  var InventoryGrid = props.InventoryGrid;
  var ledgerDialogRef = React.useRef(null);
  var inventoryDialogRef = React.useRef(null);
  useAdventureDialogFocus(showLedger, ledgerDialogRef, handleSetShowLedgerToFalse);
  useAdventureDialogFocus(!!selectedInventoryItem, inventoryDialogRef, handleSetSelectedInventoryItemToNull);
  var _fluencyOpenState = React.useState(false);
  var adventureFluencyOpen = _fluencyOpenState[0];
  var setAdventureFluencyOpen = _fluencyOpenState[1];
  var typingPace = useAdventureTypingPace(adventureTypingPaceEnabled && adventureFreeResponseEnabled, adventureTextInput, isDictationMode);
  var handleAdventureTextChange = function (event) {
    typingPace.noteChange(event.target.value, event.nativeEvent);
    setAdventureTextInput(event.target.value);
  };
  var renderTypingPace = function (isDark) {
    if (!adventureTypingPaceEnabled || !adventureFreeResponseEnabled || !adventureTextInput) return null;
    var text = typingPace.assisted ? typingPace.wordCount + ' ' + (typingPace.wordCount === 1 ? 'word' : 'words') + ' \u00B7 ' + (t('adventure.typing_pace_assisted') || 'assisted input') : typingPace.wpm + ' ' + (t('adventure.typing_pace_wpm') || 'WPM') + ' \u00B7 ' + typingPace.wordCount + ' ' + (typingPace.wordCount === 1 ? 'word' : 'words');
    return /*#__PURE__*/React.createElement("div", {
      role: "status",
      "aria-live": "off",
      className: (isDark ? 'border-white/20 bg-black/40 text-white/80' : 'border-indigo-200 bg-indigo-50 text-indigo-900') + ' w-fit rounded-full border px-2.5 py-1 text-[11px] font-bold tabular-nums'
    }, text);
  };
  var renderAdventureComposer = function (immersive) {
    var inputId = 'adventure-response-' + (immersive ? 'immersive' : 'standard');
    var isDebate = adventureInputMode === 'debate';
    var guidance = isDebate ? adventureSettingsText(t, 'response_debate_guide', 'State your claim and connect it to evidence from the scene.') : adventureInputMode === 'system' ? adventureSettingsText(t, 'response_system_guide', 'Propose a change, then explain the outcome you expect.') : adventureSettingsText(t, 'response_action_guide', 'Describe what you want to do and why.');
    return /*#__PURE__*/React.createElement("section", {
      "data-adventure-composer": true,
      "aria-labelledby": inputId + '-label',
      style: adventureVisualTokens(theme, immersive),
      className: "min-w-0 rounded-2xl border border-[var(--av-line)] bg-[var(--av-surface)] p-3 sm:p-4 text-[var(--av-ink)] shadow-[var(--av-shadow)]"
    }, /*#__PURE__*/React.createElement("div", {
      className: "mb-3 flex items-start gap-3"
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      className: "hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--av-line)] bg-[var(--av-wash)] text-[var(--av-accent)]"
    }, /*#__PURE__*/React.createElement(Pencil, {
      size: 18
    })), /*#__PURE__*/React.createElement("div", {
      className: "min-w-0"
    }, /*#__PURE__*/React.createElement("label", {
      id: inputId + '-label',
      htmlFor: inputId,
      className: "block text-sm font-black leading-relaxed"
    }, isDebate ? adventureSettingsText(t, 'response_argument_label', 'Your argument') : adventureSettingsText(t, 'response_action_label', 'Your next action')), /*#__PURE__*/React.createElement("p", {
      id: inputId + '-guide',
      className: "m-0 mt-1 text-xs leading-relaxed text-[var(--av-muted)]"
    }, guidance))), /*#__PURE__*/React.createElement("textarea", {
      id: inputId,
      ref: adventureInputRef,
      "data-help-key": "adventure_input_field",
      value: adventureTextInput,
      "aria-describedby": inputId + '-guide ' + inputId + '-keys',
      onChange: handleAdventureTextChange,
      onFocus: typingPace.resume,
      onBlur: typingPace.pause,
      onPaste: () => typingPace.markAssisted('paste'),
      placeholder: isDebate ? t('adventure.placeholder_debate') : t('adventure.placeholder_action'),
      rows: 4,
      autoFocus: immersive,
      className: "block w-full min-w-0 min-h-[120px] max-h-56 resize-y rounded-xl border border-[var(--av-control)] bg-[var(--av-wash)] p-3 text-base leading-relaxed text-[var(--av-ink)] placeholder:text-[var(--av-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)]",
      onKeyDown: e => {
        // Enter may confirm an input-method candidate instead of submitting the action.
        if (e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) return;
        if (e.key === 'Enter' && !e.shiftKey && adventureTextInput.trim() && !adventureState.isLoading) {
          e.preventDefault();
          handleAdventureTextSubmit();
        }
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "mt-2 flex flex-wrap items-start justify-between gap-2"
    }, /*#__PURE__*/React.createElement("p", {
      id: inputId + '-keys',
      className: "m-0 text-xs leading-relaxed text-[var(--av-muted)]"
    }, adventureSettingsText(t, 'response_keyboard_help', 'Enter to send · Shift + Enter for a new line.')), renderTypingPace(immersive || theme !== 'light')), /*#__PURE__*/React.createElement("div", {
      className: "mt-3 flex flex-col gap-2 sm:flex-row sm:justify-between"
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-adventure-dictation": true,
      "aria-pressed": isDictationMode,
      onClick: () => {
        const newState = !isDictationMode;
        setIsDictationMode(newState);
        if (newState) setTimeout(() => {
          if (adventureInputRef.current) adventureInputRef.current.focus();
        }, 100);
      },
      className: 'min-h-11 min-w-0 rounded-xl border border-[var(--av-control)] px-4 py-2.5 text-sm font-bold flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] ' + (isDictationMode ? 'bg-[var(--av-wash)] text-[var(--av-accent)]' : 'bg-[var(--av-surface)] text-[var(--av-ink)] hover:bg-[var(--av-wash)]')
    }, isDictationMode ? /*#__PURE__*/React.createElement(Mic, {
      size: 18,
      "aria-hidden": "true"
    }) : /*#__PURE__*/React.createElement(MicOff, {
      size: 18,
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("span", null, isDictationMode ? adventureSettingsText(t, 'response_dictation_stop', 'Stop dictation') : adventureSettingsText(t, 'response_dictation_start', 'Dictate'))), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-help-key": "adventure_input_send",
      onClick: () => handleAdventureTextSubmit(),
      disabled: !adventureTextInput.trim() || adventureState.isLoading,
      className: "min-h-11 min-w-0 rounded-xl border border-[var(--av-accent)] bg-[var(--av-accent)] px-5 py-2.5 text-sm font-black text-[var(--av-surface)] flex items-center justify-center gap-2 hover:underline disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)]"
    }, /*#__PURE__*/React.createElement(Send, {
      size: 18,
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("span", null, isDebate ? adventureSettingsText(t, 'response_argument_send', 'Send argument') : adventureSettingsText(t, 'response_action_send', 'Send action')))));
  };
  var xpMax = Math.max(1, Number(adventureState.xpToNextLevel) || 1);
  var xpValue = Math.max(0, Math.min(xpMax, Number(adventureState.xp) || 0));
  var xpProgressPercent = Math.max(0, Math.min(100, xpValue / xpMax * 100));
  var energyValue = Math.max(0, Math.min(100, Number(adventureState.energy) || 0));
  var adventureThemeAnchor = (Array.isArray(adventureState.history) ? adventureState.history : []).find(function (entry) {
    return entry && entry.type === 'scene' && entry.text;
  });
  var adventureThemeSeed = activeSessionCode ? 'session:' + String(activeSessionCode) : 'solo:' + String(adventureThemeAnchor && adventureThemeAnchor.text || adventureState.currentScene && adventureState.currentScene.text || adventureInputMode || 'adventure');
  var debateMomentumValue = Math.max(0, Math.min(100, Number(adventureState.debateMomentum) || 0));
  var democracyActive = !!(sessionData && sessionData.democracy && sessionData.democracy.isActive);
  var democracyVotes = democracyActive && sessionData.democracy.votes && typeof sessionData.democracy.votes === 'object' ? sessionData.democracy.votes : {};
  var democracyTotalVotes = Object.keys(democracyVotes).length;
  var democracyRosterTotal = sessionData && sessionData.roster && typeof sessionData.roster === 'object' ? Object.keys(sessionData.roster).length : 0;
  var democracyAudienceTotal = Math.max(democracyTotalVotes, Number(sessionData && sessionData.participantCount) || democracyRosterTotal);
  var currentUserVote = !isTeacherMode && currentUserUid && Object.prototype.hasOwnProperty.call(democracyVotes, currentUserUid) ? String(democracyVotes[currentUserUid]).trim() : '';
  var normalizeAdventureVoteOption = function (option) {
    return String(typeof option === 'object' && option && option.action ? option.action : option).trim();
  };
  var renderDemocracyStatus = function (isDark) {
    if (!democracyActive) return null;
    var message = isTeacherMode ? democracyAudienceTotal > 0 ? democracyTotalVotes + ' of ' + democracyAudienceTotal + ' students voted' : democracyTotalVotes + ' student votes received' : currentUserVote ? 'Vote submitted. Choose another option to change it.' : 'Choose one option. You can change your vote until the teacher continues.';
    return /*#__PURE__*/React.createElement("div", {
      role: "status",
      "aria-live": "polite",
      "aria-atomic": "true",
      className: (isDark ? 'md:col-span-2 bg-teal-500/15 border-teal-300/40 text-teal-50' : 'sm:col-span-2 bg-teal-50 border-teal-300 text-teal-950') + ' flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold'
    }, /*#__PURE__*/React.createElement(Users, {
      size: 15,
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("span", null, message));
  };
  var renderAdventureChoiceListen = function (opt, idx) {
    const optionText = typeof opt === 'object' && opt?.action ? opt.action : String(opt);
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-adventure-listen": true,
      "aria-label": (t('common.listen') || 'Listen') + ': ' + optionText,
      title: t('common.listen'),
      onClick: event => {
        event.stopPropagation();
        if (typeof opt === 'object' && opt?.audio) {
          const audio = new Audio(opt.audio);
          audio.play();
        } else if (handleSpeak) {
          handleSpeak(optionText, 'adventure-option-' + idx);
        }
      },
      className: "min-w-11 min-h-11 shrink-0 self-start mt-2 mr-2 flex items-center justify-center rounded-xl border border-[var(--av-control)] bg-[var(--av-surface)] text-[var(--av-ink)] hover:bg-[var(--av-wash)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)]"
    }, /*#__PURE__*/React.createElement(Volume2, {
      size: 17,
      "aria-hidden": "true"
    }));
  };
  var adventureChoiceClass = function (isMyVote, isReading) {
    return 'min-w-0 rounded-2xl border-2 text-[var(--av-ink)] shadow-sm transition-colors motion-reduce:transition-none motion-reduce:transform-none ' + (isReading || isMyVote ? 'border-[var(--av-accent)] bg-[var(--av-wash)]' : 'border-[var(--av-control)] bg-[var(--av-surface)] hover:border-[var(--av-focus)]');
  };
  var renderAdventureChoiceStatus = function (isDemocracy, isMyVote, voteCount, percent, isReading) {
    if (!(isDemocracy && isTeacherMode) && !isMyVote && !isReading) return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "mx-3 mb-3 pt-2 border-t border-[var(--av-line)] flex flex-wrap items-center gap-2 text-[var(--av-accent)]"
    }, isDemocracy && isTeacherMode && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      "aria-live": "polite",
      "aria-atomic": "true",
      className: `text-[11px] font-bold tabular-nums`
    }, t('adventure.vote_status', {
      count: voteCount,
      percent: percent
    })), /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      className: "h-1 w-12 rounded-full overflow-hidden bg-[var(--av-wash)] border border-[var(--av-control)]"
    }, /*#__PURE__*/React.createElement("span", {
      className: "block h-full bg-[var(--av-accent)]",
      style: {
        width: percent + '%'
      }
    }))), isMyVote && /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-bold flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement("svg", {
      width: "14",
      height: "14",
      viewBox: "0 0 16 16",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      "aria-hidden": "true",
      focusable: "false"
    }, /*#__PURE__*/React.createElement("path", {
      d: "m3 8 3 3 7-7"
    })), adventureSettingsText(t, 'your_vote', 'Your vote')), isReading && /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-bold flex items-center gap-1.5"
    }, /*#__PURE__*/React.createElement(Volume2, {
      size: 14,
      "aria-hidden": "true"
    }), adventureSettingsText(t, 'listening', 'Listening')));
  };
  var renderStrategyHintCard = function (isDark) {
    var hint = adventureState.currentHint;
    if (!hint || hint.turn !== adventureState.turnCount) return null;
    var notice = hint.notice || hint.text;
    return /*#__PURE__*/React.createElement("div", {
      role: "status",
      "aria-live": "polite",
      "aria-atomic": "true",
      className: isDark ? 'p-3 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-50 text-sm backdrop-blur-sm' : 'p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-sm'
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 font-black mb-2"
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, '\u{1F4A1}'), /*#__PURE__*/React.createElement("span", null, t('adventure.hint_card_title') || 'Strategy Hint')), hint.loading ? /*#__PURE__*/React.createElement("div", null, t('adventure.hint_loading') || 'Building a strategy hint...') : /*#__PURE__*/React.createElement("div", {
      className: "space-y-2"
    }, notice && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "font-black uppercase tracking-wide text-[10px] mr-2"
    }, t('adventure.hint_notice_label') || 'Notice'), /*#__PURE__*/React.createElement("span", null, notice)), hint.connect && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "font-black uppercase tracking-wide text-[10px] mr-2"
    }, t('adventure.hint_connect_label') || 'Connect'), /*#__PURE__*/React.createElement("span", null, hint.connect)), hint.tryStep && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      className: "font-black uppercase tracking-wide text-[10px] mr-2"
    }, t('adventure.hint_try_label') || 'Try'), /*#__PURE__*/React.createElement("span", null, hint.tryStep)), hint.starter && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setAdventureTextInput(hint.starter + ' '),
      className: isDark ? 'mt-1 px-2 py-1 rounded-lg bg-amber-400/20 border border-amber-300/40 text-amber-50 text-xs font-bold hover:bg-amber-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300' : 'mt-1 px-2 py-1 rounded-lg bg-amber-100 border border-amber-400 text-amber-950 text-xs font-bold hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700',
      title: t('adventure.hint_use_starter') || 'Use this sentence starter'
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, '\u21B3', " "), "\"", hint.starter, "\""), /*#__PURE__*/React.createElement("div", {
      className: isDark ? 'text-[11px] text-amber-100/80 italic' : 'text-[11px] text-amber-800 italic'
    }, t('adventure.hint_footer') || 'The next move is still yours.')));
  };
  var renderStrategyHintButton = function (isDark) {
    if (!handleAdventureHint) return null;
    var hint = adventureState.currentHint;
    var hintLoading = !!(hint && hint.turn === adventureState.turnCount && hint.loading);
    var hintUsed = adventureState.hintUsedTurn === adventureState.turnCount;
    return /*#__PURE__*/React.createElement("div", {
      className: isDark ? 'w-full' : 'self-start'
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => handleAdventureHint(),
      disabled: adventureState.isLoading || hintLoading || hintUsed,
      className: isDark ? 'min-h-11 w-full bg-transparent border border-amber-400/40 text-amber-200 p-2 rounded-xl text-xs font-bold hover:bg-amber-400/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black' : 'min-h-11 px-3 py-2 rounded-xl border border-amber-400 text-amber-800 text-xs font-bold hover:bg-amber-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2',
      title: t('adventure.hint_button_title') || 'Get one grounded clue and a response strategy'
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, '\u{1F4A1}', " "), hintUsed ? t('adventure.hint_used') || 'Clue used this scene' : t('adventure.hint_button') || 'Give me a clue'), !hintUsed && /*#__PURE__*/React.createElement("div", {
      className: isDark ? 'mt-1 text-center text-[10px] text-amber-100/70' : 'mt-1 text-[10px] text-slate-600'
    }, t('adventure.hint_button_helper') || 'One clue per scene. You still decide what happens.'));
  };
  return /*#__PURE__*/React.createElement(ErrorBoundary, {
    title: t('adventure.error.title'),
    fallbackMessage: t('adventure.error.fallback'),
    retryLabel: t('adventure.error.retry'),
    onRetry: handleAdventureCrashRecovery
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full flex flex-col gap-3 relative"
  }, /*#__PURE__*/React.createElement(ClimaxProgressBar, {
    climaxState: adventureState.climax
  }), /*#__PURE__*/React.createElement(AdventureAmbience, {
    sceneText: adventureState.currentScene?.text,
    soundParams: adventureState.currentScene?.soundParams,
    themeSeed: adventureThemeSeed,
    active: !adventureState.isGameOver && soundEnabled && activeView === 'adventure',
    volume: 0.2
  }), adventureState.isShopOpen && /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: "The adventure shop encountered an error."
  }, /*#__PURE__*/React.createElement(AdventureShop, {
    gold: adventureState.gold,
    globalXP: globalPoints,
    onClose: handleCloseShop,
    onPurchase: handleShopPurchase
  })), showLedger && /*#__PURE__*/React.createElement("div", {
    role: "presentation",
    className: "fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200 motion-reduce:animate-none",
    onClick: handleSetShowLedgerToFalse
  }, /*#__PURE__*/React.createElement("div", {
    ref: ledgerDialogRef,
    tabIndex: -1,
    className: "bg-white rounded-2xl shadow-2xl p-4 sm:p-6 max-w-md w-full max-h-[calc(100vh-1rem)] overflow-y-auto relative border-4 border-indigo-200 transition-all animate-in zoom-in-95 motion-reduce:animate-none",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "adventure-ledger-title",
    "aria-describedby": "adventure-ledger-subtitle",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleSetShowLedgerToFalse,
    className: "absolute top-2 right-2 sm:top-3 sm:right-3 min-w-11 min-h-11 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 20,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center text-center mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-2"
  }, /*#__PURE__*/React.createElement(BookOpen, {
    size: 24,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("h3", {
    id: "adventure-ledger-title",
    className: "text-xl font-black text-indigo-900"
  }, t('adventure.ledger_title')), /*#__PURE__*/React.createElement("p", {
    id: "adventure-ledger-subtitle",
    className: "text-xs text-slate-700"
  }, t('adventure.ledger_subtitle'))), /*#__PURE__*/React.createElement("div", {
    role: "region",
    "aria-label": t('adventure.ledger_title'),
    tabIndex: 0,
    className: "bg-slate-50 p-4 rounded-xl border border-slate-400 text-sm text-slate-700 leading-relaxed max-h-[50vh] overflow-y-auto custom-scrollbar whitespace-pre-line font-serif focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
  }, adventureState.narrativeLedger || t('adventure.ledger_empty')), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 flex flex-col gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('adventure.storybook'),
    onClick: () => {
      setShowLedger(false);
      setShowStorybookExportModal(true);
    },
    disabled: isProcessing || adventureState.history.length === 0,
    "aria-busy": isProcessing,
    className: "min-h-11 w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
  }, isProcessing ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 18,
    className: "animate-spin motion-reduce:animate-none",
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(Download, {
    size: 18,
    "aria-hidden": "true"
  }), t('adventure.storybook')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleSetShowLedgerToFalse,
    className: "min-h-11 w-full px-6 py-2 text-slate-700 font-bold hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2 rounded-xl"
  }, t('common.close'))))), /*#__PURE__*/React.createElement("div", {
    "data-adventure-header": true,
    role: "region",
    "aria-label": adventureSettingsText(t, 'header_controls', 'Adventure controls'),
    style: {
      ...adventureVisualTokens(theme),
      backgroundImage: theme === 'contrast' ? 'none' : 'linear-gradient(120deg, var(--av-wash), var(--av-surface) 70%)'
    },
    className: `rounded-3xl border border-[var(--av-line)] border-t-[3px] border-t-[var(--av-accent)] p-3 sm:p-4 flex flex-col shadow-[var(--av-shadow)] shrink-0 gap-3 relative max-h-[42vh] [@media(max-height:740px)]:max-h-[28vh] overflow-y-auto overscroll-contain ${adventureState.isImmersiveMode || !adventureState.currentScene ? 'hidden' : ''}`
  }, adventureEffects.levelUp && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-[1px]"
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement(ConfettiExplosion, null)), /*#__PURE__*/React.createElement("div", {
    className: "bg-yellow-400 text-indigo-900 px-8 py-4 rounded-2xl border-4 border-white shadow-2xl font-black text-2xl animate-in zoom-in duration-300 rotate-3 motion-reduce:animate-none motion-reduce:transform-none",
    role: "status",
    "aria-live": "assertive",
    "aria-atomic": "true"
  }, t('adventure.feedback.level_up', {
    level: adventureEffects.levelUp
  }))), /*#__PURE__*/React.createElement("div", {
    className: "text-[var(--av-ink)] min-w-0 relative z-10"
  }, /*#__PURE__*/React.createElement("div", {
    tabIndex: 0,
    role: "group",
    "aria-label": adventureSettingsText(t, 'story_status', 'Adventure status'),
    className: "flex flex-wrap items-center gap-2 sm:gap-3 min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--av-focus)]"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "w-full font-bold text-base sm:text-lg tracking-tight flex items-center gap-2.5 min-w-0"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-950 border border-teal-700 shadow-sm"
  }, /*#__PURE__*/React.createElement(MapIcon, {
    size: 18,
    className: "text-yellow-300",
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("span", {
    className: "min-w-0 [overflow-wrap:anywhere]"
  }, t('adventure.title'))), adventureInputMode === 'system' && /*#__PURE__*/React.createElement("div", {
    className: "bg-[var(--av-wash)] text-[var(--av-ink)] border border-[var(--av-line)] px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🏛️"), " ", t('adventure.system_simulation')), /*#__PURE__*/React.createElement("div", {
    "data-adventure-meter": "xp",
    className: "basis-28 flex-1 min-w-0 bg-[var(--av-surface)] px-3 py-2.5 rounded-2xl text-xs font-bold border border-[var(--av-line)] flex flex-wrap items-center gap-x-2 gap-y-2 relative"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[var(--av-ink)]"
  }, t('common.level_abbrev') || 'Lvl', " ", adventureState.level), /*#__PURE__*/React.createElement("span", {
    className: "ml-auto text-[var(--av-muted)] text-[11px] font-medium tabular-nums"
  }, xpValue, "/", xpMax, " ", t('common.xp') || 'XP'), /*#__PURE__*/React.createElement("div", {
    className: "w-full h-2 bg-[var(--av-wash)] border border-[var(--av-line)] rounded-full overflow-hidden",
    role: "progressbar",
    "aria-label": t('common.xp') || 'XP',
    "aria-valuemin": 0,
    "aria-valuemax": xpMax,
    "aria-valuenow": xpValue,
    "aria-valuetext": t('adventure.tooltips.xp', {
      current: xpValue,
      next: xpMax
    })
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-[var(--av-accent)] transition-all duration-1000 ease-out motion-reduce:transition-none",
    "aria-hidden": "true",
    style: {
      width: xpProgressPercent + '%'
    }
  })), adventureEffects.xp !== null && /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    className: `absolute -top-8 left-1/2 transform -translate-x-1/2 text-yellow-300 font-black text-lg animate-[ping_0.8s_ease-out_reverse] motion-reduce:animate-none motion-reduce:transform-none pointer-events-none z-20 whitespace-nowrap drop-shadow-md ${adventureEffects.xp < 0 ? 'text-red-400' : 'text-yellow-300'}`
  }, adventureEffects.xp > 0 ? '+' : '', adventureEffects.xp, " ", t('common.xp') || 'XP')), /*#__PURE__*/React.createElement("div", {
    "data-adventure-meter": "energy",
    className: `basis-28 flex-1 min-w-0 px-3 py-2.5 rounded-2xl text-xs font-bold border flex flex-wrap items-center gap-x-2 gap-y-2 relative transition-colors duration-200 motion-reduce:transition-none ${adventureInputMode === 'system' ? 'bg-[var(--av-surface)] border-[var(--av-line)]' : adventureEffects.energy < 0 ? 'border-red-600 bg-[var(--av-surface)]' : 'bg-[var(--av-surface)] border-[var(--av-line)]'}`,
    title: adventureInputMode === 'system' ? t('adventure.tooltips.stability', {
      value: energyValue
    }) : t('adventure.tooltips.energy', {
      value: energyValue
    })
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5 text-[var(--av-ink)]"
  }, /*#__PURE__*/React.createElement(Zap, {
    size: 13,
    "aria-hidden": "true",
    className: "shrink-0"
  }), adventureInputMode === 'system' ? adventureSettingsText(t, 'header_stability', 'Stability') : adventureSettingsText(t, 'header_energy', 'Energy')), /*#__PURE__*/React.createElement("span", {
    className: "ml-auto tabular-nums text-[var(--av-ink)]"
  }, /*#__PURE__*/React.createElement(AnimatedNumber, {
    value: energyValue
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-full h-2 bg-[var(--av-wash)] border border-[var(--av-line)] rounded-full overflow-hidden relative",
    role: "progressbar",
    "aria-label": adventureInputMode === 'system' ? t('adventure.tooltips.stability', {
      value: energyValue
    }) : t('adventure.tooltips.energy', {
      value: energyValue
    }),
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    "aria-valuenow": energyValue
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: `h-full transition-all duration-500 motion-reduce:transition-none ${adventureInputMode === 'system' ? theme === 'contrast' ? 'bg-yellow-300' : 'bg-amber-500' : adventureState.energy < 20 || adventureEffects.energy < 0 ? 'bg-red-500 animate-pulse motion-reduce:animate-none' : theme === 'contrast' ? 'bg-yellow-300' : 'bg-amber-500'}`,
    style: {
      width: energyValue + '%'
    }
  })), adventureEffects.energy !== null && /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    className: `absolute -top-8 left-1/2 transform -translate-x-1/2 font-black text-lg animate-[ping_0.8s_ease-out_reverse] motion-reduce:animate-none motion-reduce:transform-none pointer-events-none z-20 whitespace-nowrap drop-shadow-md ${adventureEffects.energy > 0 ? 'text-green-400' : 'text-red-500'}`
  }, adventureEffects.energy > 0 ? '+' : '', adventureEffects.energy)), /*#__PURE__*/React.createElement("div", {
    className: "bg-[var(--av-wash)] px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--av-line)] flex flex-wrap items-center gap-1.5 text-[var(--av-ink)] min-w-0",
    title: t('adventure.tooltips.gold', {
      value: adventureState.gold
    })
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "💰"), /*#__PURE__*/React.createElement("span", null, adventureSettingsText(t, 'header_gold', 'Gold')), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums font-bold"
  }, adventureState.gold), adventureState.activeGoldBuffTurns > 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] ml-1 bg-yellow-400 text-black px-1 rounded-full"
  }, adventureState.activeGoldBuffTurns)), (adventureState.stats?.conceptsFound || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-[var(--av-wash)] px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--av-line)] flex flex-wrap items-center gap-1.5 text-[var(--av-ink)] min-w-0",
    title: (t('adventure.mission_report.concepts_secured') || 'Concepts secured') + ': ' + adventureState.stats.conceptsFound.join(', '),
    "aria-label": (t('adventure.mission_report.concepts_secured') || 'Concepts secured') + ': ' + adventureState.stats.conceptsFound.join(', ')
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "🔑"), /*#__PURE__*/React.createElement("span", null, adventureSettingsText(t, 'header_concepts', 'Concepts')), /*#__PURE__*/React.createElement("span", {
    className: "tabular-nums font-bold"
  }, adventureState.stats.conceptsFound.length)), /*#__PURE__*/React.createElement(InventoryGrid, {
    inventory: adventureState.inventory,
    onSelect: handleSelectInventoryItem
  }), adventureInputMode === 'system' && enableFactionResources && (adventureState.systemResources || []).length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "w-full flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--av-line)]"
  }, adventureState.systemResources.slice(0, 5).map((resource, idx) => /*#__PURE__*/React.createElement("div", {
    key: `fr-${idx}`,
    className: "min-w-0 max-w-full bg-[var(--av-wash)] border border-[var(--av-line)] rounded-xl px-2.5 py-2 flex flex-wrap items-center gap-1.5 text-xs [overflow-wrap:anywhere]",
    title: `${resource.name}: ${resource.quantity}${resource.unit || ''}`
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, resource.icon || '📦'), /*#__PURE__*/React.createElement("span", {
    className: "min-w-0 text-[var(--av-muted)]"
  }, resource.name), /*#__PURE__*/React.createElement("span", {
    className: "text-[var(--av-ink)] font-bold tabular-nums"
  }, resource.quantity, resource.unit ? /*#__PURE__*/React.createElement("span", {
    className: "text-[var(--av-muted)] font-normal ml-0.5"
  }, resource.unit) : ''))), adventureState.systemResources.length > 5 && /*#__PURE__*/React.createElement("span", {
    className: "text-[var(--av-muted)] text-xs"
  }, "+", adventureState.systemResources.length - 5))), adventureInputMode === 'debate' && /*#__PURE__*/React.createElement("div", {
    className: "w-full mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative w-full h-4 bg-slate-700 rounded-full border border-slate-600 overflow-hidden shadow-inner",
    role: "progressbar",
    "aria-label": t('adventure.debate_you') + ' / ' + t('adventure.debate_opponent'),
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    "aria-valuenow": debateMomentumValue,
    "aria-valuetext": t('adventure.debate_you') + ': ' + debateMomentumValue + '; ' + t('adventure.debate_opponent') + ': ' + (100 - debateMomentumValue)
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: `h-full transition-all duration-500 ease-out motion-reduce:transition-none ${adventureState.debateMomentum > 60 ? 'bg-green-500' : adventureState.debateMomentum < 40 ? 'bg-red-500' : 'bg-yellow-500'}`,
    style: {
      width: debateMomentumValue + '%'
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/30 z-10",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 flex items-center justify-center z-20 pointer-events-none",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-black text-white drop-shadow-md tracking-wider"
  }, debateMomentumValue, "/100"))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between gap-3 text-xs font-semibold text-[var(--av-muted)] mt-1.5 px-1"
  }, /*#__PURE__*/React.createElement("span", null, t('adventure.debate_opponent')), /*#__PURE__*/React.createElement("span", null, t('adventure.debate_you')))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs leading-relaxed text-[var(--av-muted)] mt-2"
  }, t('adventure.explore_hint'))), /*#__PURE__*/React.createElement("div", {
    "data-adventure-toolbar": true,
    className: "flex flex-wrap items-center gap-2 relative z-10 min-w-0 shrink-0 border-t border-[var(--av-line)] pt-3",
    role: "group",
    "aria-label": adventureSettingsText(t, 'header_tools', 'Story tools')
  }, AdventureAudioControls && /*#__PURE__*/React.createElement(AdventureAudioControls, {
    soundEnabled: soundEnabled,
    t: t
  }), isTeacherMode && adventureState.currentScene && !adventureState.isGameOver && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "adventure_edit_options",
    onClick: handleStartOptionEdit,
    disabled: isEditingOptions,
    className: `min-w-11 min-h-11 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors motion-reduce:transition-none border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] ${isEditingOptions ? 'bg-[var(--av-wash)] text-[var(--av-muted)] border-[var(--av-line)] opacity-50 cursor-not-allowed' : 'bg-[var(--av-surface)] text-[var(--av-ink)] border-[var(--av-control)] hover:bg-[var(--av-wash)]'}`,
    title: t('adventure.edit_options_tooltip'),
    "aria-label": t('adventure.edit_options_tooltip')
  }, /*#__PURE__*/React.createElement(Pencil, {
    size: 14,
    "aria-hidden": "true"
  }), " ", /*#__PURE__*/React.createElement("span", {
    className: "hidden xl:inline"
  }, t('adventure.edit_options_btn'))), isTeacherMode && activeSessionCode && !adventureFreeResponseEnabled && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "democracy_toggle",
    onClick: toggleDemocracyMode,
    className: `min-w-11 min-h-11 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors motion-reduce:transition-none border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] ${sessionData?.democracy?.isActive ? 'bg-teal-700 text-white border-teal-500 ring-2 ring-teal-400' : 'bg-[var(--av-surface)] text-[var(--av-ink)] border-[var(--av-control)] hover:bg-[var(--av-wash)]'}`,
    title: t('adventure.tooltips.democracy_toggle'),
    "aria-label": t('adventure.tooltips.democracy_toggle'),
    "aria-pressed": !!sessionData?.democracy?.isActive
  }, sessionData?.democracy?.isActive ? /*#__PURE__*/React.createElement(Users, {
    size: 14,
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(User, {
    size: 14,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden xl:inline"
  }, sessionData?.democracy?.isActive ? t('adventure.democracy_on') : t('adventure.democracy_off'))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('adventure.ledger_tooltip'),
    onClick: handleSetShowLedgerToTrue,
    className: "min-w-11 min-h-11 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors motion-reduce:transition-none border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] bg-[var(--av-surface)] text-[var(--av-ink)] border-[var(--av-control)] hover:bg-[var(--av-wash)]",
    title: t('adventure.ledger_tooltip')
  }, /*#__PURE__*/React.createElement(BookOpen, {
    size: 14,
    className: "fill-current",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, t('adventure.log_button'))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": adventureState.isImmersiveMode ? t('adventure.exit_immersive') : t('adventure.enter_immersive'),
    "aria-pressed": adventureState.isImmersiveMode,
    onClick: handleToggleAdventureImmersive,
    className: `min-w-11 min-h-11 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors motion-reduce:transition-none border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] ${adventureState.isImmersiveMode ? 'bg-yellow-400 text-indigo-900 border-yellow-500 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'bg-[var(--av-surface)] text-[var(--av-ink)] border-[var(--av-control)] hover:bg-[var(--av-wash)]'}`,
    title: adventureState.isImmersiveMode ? t('adventure.exit_immersive') : t('adventure.enter_immersive')
  }, /*#__PURE__*/React.createElement(Monitor, {
    size: 14,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, adventureState.isImmersiveMode ? t('adventure.view_standard') : t('adventure.view_immersive'))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": adventureAutoRead ? t('adventure.auto_read_disable') : t('adventure.auto_read_enable'),
    "aria-pressed": adventureAutoRead,
    "data-help-key": "adventure_immersive_autoread",
    onClick: () => {
      const newState = !adventureAutoRead;
      setAdventureAutoRead(newState);
      if (!newState) stopPlayback();
    },
    className: `min-w-11 min-h-11 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors motion-reduce:transition-none border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] ${adventureAutoRead ? 'bg-[var(--av-wash)] text-[var(--av-ink)] border-[var(--av-accent)] ring-1 ring-[var(--av-accent)]' : 'bg-[var(--av-surface)] text-[var(--av-ink)] border-[var(--av-control)] hover:bg-[var(--av-wash)]'}`,
    title: adventureAutoRead ? t('adventure.auto_read_disable') : t('adventure.auto_read_enable')
  }, adventureAutoRead ? /*#__PURE__*/React.createElement(Volume2, {
    size: 14,
    className: "fill-current animate-pulse motion-reduce:animate-none",
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(VolumeX, {
    size: 14,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, t('adventure.auto_read_status_label'), ": ", adventureAutoRead ? t('common.on') : t('common.off'))), adventureFluencyEnabled && adventureState.currentScene && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('adventure.fluency_title') || 'Practice reading this scene',
    "aria-haspopup": "dialog",
    "data-help-key": "adventure_scene_reading_practice",
    onClick: () => {
      stopPlayback();
      setAdventureFluencyOpen(true);
    },
    className: "min-w-11 min-h-11 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors motion-reduce:transition-none border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] bg-rose-800 text-rose-100 border-rose-500 hover:bg-rose-700",
    title: t('adventure.fluency_title') || 'Practice reading this scene'
  }, /*#__PURE__*/React.createElement(Mic, {
    size: 14,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, t('adventure.fluency_button_short') || 'Reading practice')), !isZenMode && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('adventure.maximize_tooltip'),
    onClick: handleSetIsZenModeToTrue,
    className: "min-w-11 min-h-11 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors motion-reduce:transition-none border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] bg-[var(--av-surface)] text-[var(--av-ink)] border-[var(--av-control)] hover:bg-[var(--av-wash)]",
    title: t('adventure.maximize_tooltip')
  }, /*#__PURE__*/React.createElement(Maximize, {
    size: 14,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "hidden sm:inline"
  }, t('adventure.view_button'))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.start_new_adventure'),
    "data-help-key": "adventure_start_btn",
    onClick: handleStartAdventure,
    className: "min-w-11 min-h-11 flex items-center gap-2 bg-[var(--av-surface)] text-[var(--av-ink)] border border-[var(--av-control)] px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[var(--av-wash)] transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)]"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: adventureState.isLoading ? "animate-spin motion-reduce:animate-none" : "",
    "aria-hidden": "true"
  }), " ", t('adventure.restart')))), /*#__PURE__*/React.createElement("div", {
    "data-adventure-canvas": true,
    style: adventureVisualTokens(theme),
    className: "flex-grow min-h-0 bg-[var(--av-wash)] rounded-3xl border border-[var(--av-line)] shadow-inner overflow-hidden flex flex-col relative"
  }, !adventureState.isImmersiveMode ? /*#__PURE__*/React.createElement("div", {
    ref: adventureScrollRef,
    className: "flex-grow overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar"
  }, !adventureState.currentScene && adventureState.history.length === 0 && !adventureState.isLoading && /*#__PURE__*/React.createElement("div", {
    className: "min-h-full flex flex-col items-center py-4 sm:py-10 animate-in fade-in zoom-in duration-300 motion-reduce:animate-none"
  }, hasSavedAdventure && !showNewGameSetup ? /*#__PURE__*/React.createElement("div", {
    className: "max-w-md w-full text-center space-y-6 my-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-4 sm:p-8 rounded-3xl shadow-xl border-4 border-indigo-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-sm border-2 border-indigo-200"
  }, /*#__PURE__*/React.createElement(MapIcon, {
    size: 40,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-black text-slate-800 mb-2"
  }, t('adventure.paused_title')), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-600 mb-6 font-medium"
  }, t('adventure.paused_desc')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('adventure.resume'),
    "data-help-key": "adventure_resume_btn",
    onClick: handleResumeAdventure,
    className: "min-h-11 w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-lg shadow-lg hover:scale-105 transition-all motion-reduce:transform-none flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
  }, /*#__PURE__*/React.createElement(History, {
    size: 20,
    "aria-hidden": "true"
  }), " ", t('adventure.resume'))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('adventure.start_overwrite'),
    onClick: handleSetShowNewGameSetupToTrue,
    className: "min-h-11 text-slate-700 hover:text-red-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors px-3 py-2 uppercase tracking-wider rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    "aria-hidden": "true"
  }), " ", t('adventure.start_overwrite'))) : /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-5xl bg-white rounded-2xl shadow-xl border-2 border-indigo-100 overflow-hidden relative my-auto"
  }, hasSavedAdventure && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('adventure.back_to_resume'),
    onClick: handleSetShowNewGameSetupToFalse,
    className: "absolute top-2 left-2 sm:top-4 sm:left-4 min-w-11 min-h-11 text-white hover:bg-white/20 p-2 rounded-full transition-colors z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600",
    title: t('adventure.back_to_resume')
  }, /*#__PURE__*/React.createElement(ArrowDown, {
    className: "rotate-90",
    size: 20,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("div", {
    className: `p-5 sm:p-7 text-white flex justify-between items-center relative overflow-hidden ${theme === 'contrast' ? 'bg-black border-b-2 border-white' : 'bg-gradient-to-br from-indigo-950 via-indigo-900 to-teal-900'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-grow text-center px-8 sm:px-12 relative z-10"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-xl sm:text-2xl font-black uppercase tracking-wide sm:tracking-widest flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(MapIcon, {
    size: 24,
    "aria-hidden": "true"
  }), " ", t('adventure.title')), /*#__PURE__*/React.createElement("p", {
    className: "text-white text-sm font-medium mt-2 leading-relaxed"
  }, t('adventure.setup_subtitle')))), /*#__PURE__*/React.createElement("div", {
    className: "p-4 sm:p-6"
  }, /*#__PURE__*/React.createElement(AdventureLearningProfiles, props), /*#__PURE__*/React.createElement(AdventureSetupFields, props)), /*#__PURE__*/React.createElement("div", {
    className: "p-4 bg-slate-50 border-t border-slate-200 flex justify-center"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('adventure.start'),
    onClick: () => executeStartAdventure(),
    disabled: adventureState.isLoading,
    "aria-busy": adventureState.isLoading,
    className: "min-h-11 w-full md:w-auto px-8 sm:px-16 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all motion-reduce:transform-none flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 20,
    className: "animate-pulse motion-reduce:animate-none",
    "aria-hidden": "true"
  }), t('adventure.start'))))), /*#__PURE__*/React.createElement(AdventureJourneyNotebook, {
    history: adventureState.history,
    t: t,
    theme: theme,
    renderFormattedText: renderFormattedText
  }), adventureRecentHistory(adventureState.history).map((entry, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    "data-adventure-recent": true,
    className: "animate-in motion-reduce:animate-none fade-in slide-in-from-bottom-2 duration-500"
  }, /*#__PURE__*/React.createElement(AdventureHistoryEntry, {
    entry: entry,
    t: t,
    theme: theme,
    renderFormattedText: renderFormattedText
  }))), !failedAdventureAction && /*#__PURE__*/React.createElement(AdventureTurnStatus, {
    state: adventureState,
    t: t,
    theme: theme
  }), adventureState.currentScene && /*#__PURE__*/React.createElement("div", {
    role: "region",
    "aria-labelledby": "adventure-current-scene-heading",
    className: "flex justify-start animate-in fade-in slide-in-from-bottom-4 duration-700 motion-reduce:animate-none"
  }, /*#__PURE__*/React.createElement("div", {
    style: adventureVisualTokens(theme),
    className: "w-full max-w-4xl bg-[var(--av-surface)] p-4 sm:p-6 rounded-3xl border border-[var(--av-line)] border-t-[3px] border-t-[var(--av-accent)] shadow-[var(--av-shadow)] relative min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap justify-between items-center gap-3 mb-4"
  }, /*#__PURE__*/React.createElement("h4", {
    id: "adventure-current-scene-heading",
    className: "text-xs font-bold text-[var(--av-accent)] uppercase tracking-wider flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Flag, {
    size: 12,
    "aria-hidden": "true"
  }), " ", t('adventure.current_scene')), (adventureState.sceneImage || adventureState.sceneImagePreview) && /*#__PURE__*/React.createElement("div", {
    "data-adventure-image-controls": true,
    className: "flex flex-wrap items-center gap-2 w-full sm:w-auto min-w-0"
  }, /*#__PURE__*/React.createElement("label", {
    className: "min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-[var(--av-line)] bg-[var(--av-wash)] px-3 text-[var(--av-muted)]"
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-1.5 text-xs font-semibold"
  }, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 14,
    "aria-hidden": "true"
  }), t('common.adjust_image_size')), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.adjust_image_size'),
    "aria-valuetext": adventureImageSize + ' px',
    type: "range",
    min: "150",
    max: "600",
    step: "50",
    value: adventureImageSize,
    onChange: e => setAdventureImageSize(Number(e.target.value)),
    className: "w-24 h-11 max-w-full cursor-pointer accent-[var(--av-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] rounded-lg"
  }), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    className: "text-[11px] font-medium tabular-nums"
  }, adventureImageSize, " px")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-pressed": showFullIllustration,
    onClick: () => setShowFullIllustration(value => !value),
    className: "min-h-11 min-w-0 px-3 py-2 rounded-xl border border-[var(--av-control)] text-[var(--av-ink)] bg-[var(--av-surface)] hover:bg-[var(--av-wash)] aria-pressed:bg-[var(--av-wash)] aria-pressed:border-[var(--av-accent)] aria-pressed:ring-1 aria-pressed:ring-[var(--av-accent)] text-xs font-semibold flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)]"
  }, /*#__PURE__*/React.createElement(Maximize, {
    size: 14,
    "aria-hidden": "true",
    className: "shrink-0"
  }), adventureSettingsText(t, 'full_illustration', 'Full illustration')))), /*#__PURE__*/React.createElement("div", {
    "data-adventure-illustration": true,
    className: "mb-5 rounded-2xl overflow-hidden bg-[var(--av-wash)] border border-[var(--av-line)] shadow-inner relative group transition-all duration-300 motion-reduce:transition-none",
    style: {
      minHeight: adventureImageSize + 'px'
    }
  }, adventureState.sceneImage || adventureState.sceneImagePreview ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: adventureState.sceneImage || adventureState.sceneImagePreview,
    alt: "",
    style: {
      height: `${adventureImageSize}px`,
      objectFit: showFullIllustration ? 'contain' : 'cover',
      filter: !adventureState.sceneImage && adventureState.sceneImagePreview ? 'blur(1.5px) saturate(0.9)' : 'none'
    },
    className: "block w-full animate-in fade-in duration-500 transition-[filter,opacity] motion-reduce:animate-none motion-reduce:transition-none",
    decoding: "async"
  }), !adventureState.sceneImage && adventureState.sceneImagePreview && /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    className: "absolute left-3 bottom-3 bg-slate-950/80 text-white text-xs font-bold px-3 py-2 rounded-full shadow-lg backdrop-blur-sm"
  }, adventureState.imagePolishStage === 'matching' ? 'Matching your cast…' : 'Polishing scene details…'), /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: "absolute top-2 right-2 bg-black/60 text-white text-[11px] px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity motion-reduce:transition-none backdrop-blur-sm"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 10,
    className: "inline mr-1"
  }), " ", t('adventure.nano_badge'))) : /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    className: "absolute inset-0 flex items-center justify-center text-[var(--av-muted)] flex-col gap-2"
  }, adventureState.isImageLoading ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 24,
    className: "animate-pulse motion-reduce:animate-none",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-medium animate-pulse motion-reduce:animate-none"
  }, adventureState.loadingStage || t('adventure.generating_scene'))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 24,
    className: "opacity-40",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold"
  }, t('adventure.no_image'))))), /*#__PURE__*/React.createElement("div", {
    "data-adventure-prose": true,
    className: "prose prose-sm text-[var(--av-ink)] font-medium font-serif text-base leading-relaxed max-w-[68ch] mx-auto [overflow-wrap:anywhere]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-4",
    onPointerEnter: () => {
      if (prewarmAdventureAudio && adventureState.currentScene) prewarmAdventureAudio(adventureState.currentScene.text, adventureState.currentScene.voices);
    }
  }, (() => {
    const paragraphs = adventureState.currentScene.text.split(/\n{2,}/);
    let sentenceCounter = 0;
    return paragraphs.map((para, pIdx) => {
      const sentences = splitTextToSentences(para);
      if (sentences.length === 0) return null;
      return /*#__PURE__*/React.createElement("p", {
        key: pIdx,
        className: "mb-4 leading-relaxed"
      }, sentences.map((s, sIdx) => {
        const currentGlobalIdx = sentenceCounter;
        sentenceCounter++;
        const isActive = playbackState.currentIdx === currentGlobalIdx && playingContentId === 'adventure-active';
        const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(s.trim());
        const isHeader = s.trim().startsWith('#') || isHtmlHeader;
        const cleanText = isHeader ? isHtmlHeader ? s.trim().replace(/<\/?h[1-6][^>]*>/gi, '') : s.trim().replace(/^#+\s*/, '') : s;
        // Per-sentence read-aloud: the sentence TEXT is the control (click or
        // Enter/Space). The former inline speaker button (52c353dea) was removed
        // 2026-07-16 per Aaron — redundant with click-to-karaoke and visually
        // clunky — while keeping its keyboard/SR semantics on the span itself.
        return /*#__PURE__*/React.createElement("span", {
          key: sIdx,
          id: `sentence-${currentGlobalIdx}`,
          role: "button",
          tabIndex: 0,
          "aria-pressed": isActive,
          "aria-label": (t('adventure.read_aloud_title') || t('common.click_read_aloud') || 'Read aloud') + ': ' + cleanText.replace(/\*\*/g, '').trim(),
          title: t('adventure.read_aloud_title') || t('common.click_read_aloud'),
          onClick: e => {
            e.stopPropagation();
            handleSpeak(adventureState.currentScene.text, 'adventure-active', currentGlobalIdx);
          },
          onKeyDown: e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              handleSpeak(adventureState.currentScene.text, 'adventure-active', currentGlobalIdx);
            }
          },
          className: `transition-colors duration-300 motion-reduce:transition-none rounded px-1 py-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${isActive ? 'bg-yellow-200 text-black shadow-sm' : 'hover:bg-[var(--av-wash)]'} ${isHeader ? 'font-bold block text-lg mt-2' : ''}`
        }, formatInteractiveText(cleanText), " ");
      }));
    });
  })())))), adventureState.isGameOver && (() => {
    const _isDefeat = adventureEpisodeDepleted(adventureState);
    return /*#__PURE__*/React.createElement(React.Fragment, null, !_isDefeat && adventureState.canStartSequel && /*#__PURE__*/React.createElement("div", {
      "aria-hidden": "true"
    }, /*#__PURE__*/React.createElement(ConfettiExplosion, null)), /*#__PURE__*/React.createElement(AdventureEpisodeRecap, {
      state: adventureState,
      t: t,
      theme: theme,
      mode: adventureInputMode,
      social: props.isSocialStoryMode,
      minimumXP: studentProjectSettings.adventureMinXP,
      isProcessing: isProcessing,
      onExport: handleSetShowStorybookExportModalToTrue,
      onSequel: handleStartSequel,
      canContinue: isTeacherMode || !activeSessionCode
    }));
  })()) : /*#__PURE__*/React.createElement("div", {
    className: "relative w-full h-full bg-black rounded-xl overflow-hidden shadow-2xl group select-none relative"
  }, /*#__PURE__*/React.createElement("style", null, `
                                  @keyframes adventure-ken-burns {
                                    0% { transform: scale(1) translate(0, 0); }
                                    100% { transform: scale(1.1) translate(-1%, -1%); }
                                  }
                                  .adventure-ken-burns { animation: adventure-ken-burns 20s ease-in-out infinite alternate; }
                                  @media (prefers-reduced-motion: reduce) {
                                    .adventure-ken-burns { animation: none; }
                                  }
                                `), adventureState.sceneImage || adventureState.sceneImagePreview ? /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: adventureState.sceneImage || adventureState.sceneImagePreview,
    className: `absolute inset-0 w-full h-full ${immersiveHideUI ? 'object-contain' : 'object-cover'} transition-opacity duration-700 adventure-ken-burns motion-reduce:animate-none motion-reduce:transition-none`,
    alt: ""
  }) : /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    className: "absolute inset-0 bg-slate-900 flex items-center justify-center flex-col gap-4 text-slate-200"
  }, adventureState.isImageLoading ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 48,
    className: "animate-spin motion-reduce:animate-none text-indigo-300",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold animate-pulse motion-reduce:animate-none"
  }, adventureState.loadingStage || t('adventure.generating_scene'))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 48,
    className: "opacity-40",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-bold"
  }, t('adventure.no_image')))), !adventureState.sceneImage && adventureState.sceneImagePreview && /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    className: "absolute left-1/2 top-5 -translate-x-1/2 z-20 bg-black/75 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg backdrop-blur-sm"
  }, adventureState.imagePolishStage === 'matching' ? 'Matching your cast…' : 'Polishing scene details…'), theme !== 'contrast' && /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: "absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 pointer-events-none"
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute top-4 left-3 right-3 sm:left-4 sm:right-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-start z-20"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2 min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-black/60 backdrop-blur-md text-white border border-white/20 px-3 py-1 rounded-full text-xs font-bold w-fit max-w-full break-words shadow-sm"
  }, t('common.level_abbrev'), " ", adventureState.level), adventureInputMode === 'system' && /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-r from-amber-600/80 to-amber-800/80 backdrop-blur-md text-amber-100 border border-amber-400/50 px-3 py-1 rounded-full text-[11px] font-bold w-fit shadow-lg flex items-center gap-1.5 animate-pulse motion-reduce:animate-none"
  }, t('adventure.system_simulation')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/20 pr-3 shadow-sm",
    title: adventureInputMode === 'system' ? t('adventure.tooltips.stability', {
      value: energyValue
    }) : t('adventure.tooltips.energy', {
      value: energyValue
    })
  }, /*#__PURE__*/React.createElement("div", {
    className: `p-1 rounded-full ${adventureInputMode === 'system' ? 'bg-amber-500/20' : 'bg-yellow-500/20'}`
  }, /*#__PURE__*/React.createElement(Zap, {
    size: 12,
    "aria-hidden": "true",
    className: `fill-current ${adventureInputMode === 'system' ? 'text-amber-400' : 'text-yellow-400'}`
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-12 sm:w-24 min-w-0 h-2 bg-black/50 rounded-full overflow-hidden border border-white/10",
    role: "progressbar",
    "aria-label": adventureInputMode === 'system' ? t('adventure.tooltips.stability', {
      value: energyValue
    }) : t('adventure.tooltips.energy', {
      value: energyValue
    }),
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    "aria-valuenow": energyValue
  }, /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: `h-full transition-all duration-500 motion-reduce:transition-none ${adventureInputMode === 'system' ? 'bg-gradient-to-r from-amber-400 to-amber-600' : 'bg-gradient-to-r from-yellow-400 to-orange-500'}`,
    style: {
      width: energyValue + '%'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/20 pr-3 shadow-sm",
    title: t('adventure.tooltips.xp', {
      current: adventureState.xp,
      next: adventureState.xpToNextLevel
    })
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-500/20 p-1 rounded-full"
  }, /*#__PURE__*/React.createElement(Trophy, {
    size: 12,
    className: "text-indigo-300 fill-current",
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("div", {
    className: "w-12 sm:w-24 min-w-0 h-2 bg-black/50 rounded-full overflow-hidden border border-white/10",
    role: "progressbar",
    "aria-label": t('common.xp') || 'XP',
    "aria-valuemin": 0,
    "aria-valuemax": xpMax,
    "aria-valuenow": xpValue,
    "aria-valuetext": t('adventure.tooltips.xp', {
      current: xpValue,
      next: xpMax
    })
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all duration-500 motion-reduce:transition-none",
    "aria-hidden": "true",
    style: {
      width: xpProgressPercent + '%'
    }
  })))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-end gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": adventureAutoRead ? t('adventure.auto_read_off_tooltip') : t('adventure.auto_read_on_tooltip'),
    "aria-pressed": adventureAutoRead,
    "data-help-key": "adventure_immersive_autoread",
    onClick: () => {
      const newState = !adventureAutoRead;
      setAdventureAutoRead(newState);
      if (!newState) stopPlayback();
    },
    className: `min-w-11 min-h-11 backdrop-blur-md border p-2 rounded-full transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${adventureAutoRead ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/50' : 'bg-black/50 text-white/70 border-white/20 hover:bg-white/20 hover:text-white'}`,
    title: adventureAutoRead ? t('adventure.auto_read_off_tooltip') : t('adventure.auto_read_on_tooltip')
  }, adventureAutoRead ? /*#__PURE__*/React.createElement(Volume2, {
    size: 16,
    className: "fill-current",
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(VolumeX, {
    size: 16,
    "aria-hidden": "true"
  })), adventureFluencyEnabled && adventureState.currentScene && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('adventure.fluency_title') || 'Practice reading this scene',
    "aria-haspopup": "dialog",
    "data-help-key": "adventure_immersive_reading_practice",
    onClick: () => {
      stopPlayback();
      setAdventureFluencyOpen(true);
    },
    className: "min-w-11 min-h-11 bg-rose-800/90 backdrop-blur-md text-white border border-rose-400 p-2 rounded-full hover:bg-rose-700 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
    title: t('adventure.fluency_title') || 'Practice reading this scene'
  }, /*#__PURE__*/React.createElement(Mic, {
    size: 16,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": immersiveHideUI ? t('adventure.show_ui') : t('adventure.hide_ui'),
    "aria-pressed": immersiveHideUI,
    "data-help-key": "adventure_immersive_toggle_ui",
    onClick: handleToggleImmersiveHideUI,
    className: `min-w-11 min-h-11 backdrop-blur-md border p-2 rounded-full transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${immersiveHideUI ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/50' : 'bg-black/50 text-white/70 border-white/20 hover:bg-white/20 hover:text-white'}`,
    title: immersiveHideUI ? t('adventure.show_ui') : t('adventure.hide_ui')
  }, immersiveHideUI ? /*#__PURE__*/React.createElement(EyeOff, {
    size: 16,
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(Eye, {
    size: 16,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('adventure.tooltips.exit_immersive'),
    "data-help-key": "adventure_immersive_exit",
    onClick: handleExitAdventureImmersive,
    className: "min-w-11 min-h-11 bg-black/50 backdrop-blur-md text-white border border-white/40 p-2 rounded-full hover:bg-white/20 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
    title: t('adventure.tooltips.exit_immersive')
  }, /*#__PURE__*/React.createElement(Minimize, {
    size: 16,
    "aria-hidden": "true"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bg-black/50 backdrop-blur-md text-yellow-300 border border-yellow-500/60 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm",
    "aria-hidden": "true"
  }, "💰"), " ", adventureState.gold), /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('adventure.inventory'),
    "aria-expanded": showImmersiveInventory,
    "aria-controls": "adventure-immersive-inventory",
    "data-help-key": "adventure_immersive_inventory",
    onClick: e => {
      e.stopPropagation();
      setShowImmersiveInventory(!showImmersiveInventory);
    },
    className: `min-w-11 min-h-11 backdrop-blur-md border p-2 rounded-full transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${showImmersiveInventory ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/50' : 'bg-black/50 text-white border-white/20 hover:bg-white/20'}`,
    title: t('adventure.inventory')
  }, /*#__PURE__*/React.createElement(Backpack, {
    size: 16,
    "aria-hidden": "true"
  })), showImmersiveInventory && /*#__PURE__*/React.createElement("div", {
    id: "adventure-immersive-inventory",
    role: "region",
    "aria-label": t('adventure.inventory'),
    className: "absolute top-full right-0 mt-2 w-56 bg-black/80 backdrop-blur-md border border-white/40 rounded-xl p-2 shadow-xl z-50 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 motion-reduce:animate-none"
  }, adventureInputMode === 'system' && enableFactionResources && /*#__PURE__*/React.createElement("div", {
    className: "border-b border-amber-500/30 pb-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-bold text-amber-200 uppercase tracking-wide mb-1 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "📊"), " ", t('adventure.system_state')), (adventureState.systemResources || []).length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-1"
  }, adventureState.systemResources.map((resource, idx) => /*#__PURE__*/React.createElement("div", {
    key: `${resource.name}-${idx}`,
    className: "bg-gradient-to-r from-amber-900/40 to-amber-800/20 border border-amber-600/30 rounded-lg px-2 py-1 flex items-center gap-1.5 hover:border-amber-400/50 transition-all cursor-default",
    title: `${resource.name}: ${resource.quantity}${resource.unit || ''} (${resource.type || 'strategic'})`
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-sm",
    "aria-hidden": "true"
  }, resource.icon || '📊'), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col leading-none"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-amber-200/80 truncate max-w-[60px]"
  }, resource.name), /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-amber-200 font-bold"
  }, resource.quantity, resource.unit && /*#__PURE__*/React.createElement("span", {
    className: "text-amber-400/70 font-normal ml-0.5 text-[11px]"
  }, resource.unit)))))) : /*#__PURE__*/React.createElement("div", {
    className: "text-center text-[11px] text-amber-200/50 py-1 italic"
  }, "No state variables yet")), /*#__PURE__*/React.createElement("div", null, adventureInputMode === 'system' && /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] font-bold text-indigo-300 uppercase tracking-wide mb-1 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "📜"), " Policies & Agreements"), adventureState.inventory.length > 0 ? /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-4 gap-2"
  }, adventureState.inventory.map(item => /*#__PURE__*/React.createElement("button", {
    key: item.id,
    type: "button",
    "aria-label": item.name,
    onClick: e => {
      e.stopPropagation();
      setSelectedInventoryItem(item);
      setShowImmersiveInventory(false);
    },
    className: "group relative w-11 h-11 bg-white/10 rounded-lg border border-white/40 hover:bg-indigo-600 hover:border-indigo-400 flex items-center justify-center transition-all overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
    title: item.name
  }, item.image ? /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: item.image,
    alt: "",
    className: "w-full h-full object-contain p-1"
  }) : /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-white"
  }, item.icon || item.name.charAt(0))))) : /*#__PURE__*/React.createElement("div", {
    className: "text-center text-[11px] text-white/50 py-2 italic"
  }, adventureInputMode === 'system' ? 'No policies enacted' : t('adventure.inventory_empty'))))))), !immersiveHideUI && /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-0 left-0 right-0 px-2 sm:px-4 pb-2 z-30 flex flex-col justify-end"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-black/70 backdrop-blur-md border-t-2 border-white/20 p-3 pt-6 sm:p-6 rounded-2xl shadow-lg relative min-h-[200px] flex flex-col justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center shrink-0 mb-4"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-pressed": immersiveShowChoices,
    "aria-label": immersiveShowChoices ? t('adventure.return_to_story') : adventureState.isGameOver ? adventureSettingsText(t, 'recap_title', 'Episode recap') : t('adventure.make_a_choice'),
    "data-help-key": "adventure_choice_toggle",
    onClick: handleToggleImmersiveShowChoices,
    className: "min-h-11 bg-indigo-600 text-white text-xs font-bold px-6 py-2 rounded-full border-2 border-white/20 shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all motion-reduce:transform-none flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
  }, immersiveShowChoices || adventureState.isGameOver ? /*#__PURE__*/React.createElement(BookOpen, {
    size: 14,
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(MousePointerClick, {
    size: 14,
    "aria-hidden": "true"
  }), immersiveShowChoices ? t('adventure.return_to_story') : adventureState.isGameOver ? adventureSettingsText(t, 'recap_title', 'Episode recap') : t('adventure.make_a_choice'))), immersiveShowChoices ? /*#__PURE__*/React.createElement("div", {
    "data-adventure-actions": "immersive",
    role: "region",
    "aria-label": adventureSettingsText(t, 'available_actions', 'Available actions'),
    style: adventureVisualTokens(theme, true),
    className: "max-h-[55vh] overflow-y-auto overscroll-contain p-1 animate-in motion-reduce:animate-none fade-in slide-in-from-bottom-4 duration-300"
  }, adventureState.currentScene && /*#__PURE__*/React.createElement(AdventureDecisionProgress, {
    state: adventureState,
    t: t,
    theme: theme,
    immersive: true
  }), !failedAdventureAction && /*#__PURE__*/React.createElement(AdventureTurnStatus, {
    state: adventureState,
    t: t,
    theme: theme,
    immersive: true
  }), adventureState.isGameOver ? /*#__PURE__*/React.createElement(AdventureEpisodeRecap, {
    state: adventureState,
    t: t,
    theme: theme,
    mode: adventureInputMode,
    social: props.isSocialStoryMode,
    minimumXP: studentProjectSettings.adventureMinXP,
    isProcessing: isProcessing,
    onExport: handleSetShowStorybookExportModalToTrue,
    onSequel: handleStartSequel,
    canContinue: isTeacherMode || !activeSessionCode,
    immersive: true
  }) : failedAdventureAction ? /*#__PURE__*/React.createElement(AdventureTurnRecovery, {
    t: t,
    theme: theme,
    immersive: true,
    loading: adventureState.isLoading,
    onRetry: handleRetryAdventureTurn
  }) : adventureState.currentScene && (adventureFreeResponseEnabled ? /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-3"
  }, !isTeacherMode && activeSessionCode ? /*#__PURE__*/React.createElement("div", {
    role: "status",
    className: "rounded-xl border border-indigo-300 bg-indigo-950/80 p-4 text-sm text-indigo-100"
  }, /*#__PURE__*/React.createElement("strong", {
    className: "block text-white"
  }, t('adventure.teacher_controls_live') || 'The teacher controls this class adventure.'), /*#__PURE__*/React.createElement("span", {
    className: "mt-1 block"
  }, t('adventure.wait_for_action_round') || 'When a class-action round opens, submit your idea in the private live prompt. Free responses and votes are sent peer to peer.')) : /*#__PURE__*/React.createElement(React.Fragment, null, isTeacherMode && activeSessionCode && typeof openAdventureActionVote === 'function' ? /*#__PURE__*/React.createElement("div", {
    className: "rounded-xl border border-emerald-300 bg-emerald-950/70 p-3"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: openAdventureActionVote,
    className: "min-h-11 w-full rounded-lg border border-emerald-300 bg-emerald-700 px-3 py-2 text-sm font-black text-white hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
  }, /*#__PURE__*/React.createElement(Users, {
    size: 16,
    "aria-hidden": "true"
  }), " ", t('adventure.collect_class_actions') || 'Collect and vote on class actions'), /*#__PURE__*/React.createElement("p", {
    className: "m-0 mt-2 text-[11px] leading-snug text-emerald-100"
  }, t('adventure.collect_class_actions_privacy') || 'Student proposals and votes use the existing peer-to-peer Live Polling channel and are not written to the session document.')) : null, renderStrategyHintCard(true), renderAdventureComposer(true), renderStrategyHintButton(true))) : /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-3"
  }, renderDemocracyStatus(true), (() => {
    const mainTextParagraphs = adventureState.currentScene.text.split(/\n{2,}/);
    const isTable = p => p.trim().startsWith('|') || p.includes('\n|');
    const textSentenceCount = mainTextParagraphs.flatMap(p => isTable(p) ? [] : splitTextToSentences(p)).length;
    return adventureState.currentScene.options.map((opt, idx) => {
      const isDemocracy = democracyActive;
      const optionValue = normalizeAdventureVoteOption(opt);
      const voteCount = isTeacherMode ? Object.values(democracyVotes).filter(v => String(v).trim() === optionValue).length : 0;
      const percent = isTeacherMode && democracyTotalVotes > 0 ? Math.round(voteCount / democracyTotalVotes * 100) : 0;
      const isMyVote = isDemocracy && !isTeacherMode && !!currentUserVote && currentUserVote === optionValue;
      const isReadingThisOption = isPlaying && (playingContentId === 'adventure-option-' + idx || playingContentId === 'adventure-active' && playbackState.currentIdx === textSentenceCount + idx);
      return /*#__PURE__*/React.createElement("div", {
        key: idx,
        "data-adventure-choice": true,
        "data-reading": isReadingThisOption || undefined,
        className: adventureChoiceClass(isMyVote, isReadingThisOption)
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-start gap-1"
      }, /*#__PURE__*/React.createElement("button", {
        type: "button",
        "data-help-key": "adventure_choice_btn",
        onClick: () => handleAdventureChoice(opt),
        disabled: adventureState.isLoading,
        "aria-pressed": isDemocracy && !isTeacherMode ? isMyVote : undefined,
        className: "min-h-11 min-w-0 flex-1 flex flex-col sm:flex-row items-start gap-2 sm:gap-3 p-3 rounded-xl text-left text-sm leading-relaxed font-semibold hover:bg-[var(--av-wash)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] disabled:opacity-50 disabled:cursor-not-allowed"
      }, /*#__PURE__*/React.createElement("span", {
        "aria-hidden": "true",
        className: "w-7 h-7 shrink-0 rounded-lg border border-[var(--av-control)] bg-[var(--av-wash)] text-[var(--av-accent)] flex items-center justify-center text-xs font-bold"
      }, idx + 1), /*#__PURE__*/React.createElement("span", {
        className: "min-w-0 pt-0.5 [overflow-wrap:anywhere]"
      }, typeof opt === 'object' && opt?.action ? opt.action : opt)), renderAdventureChoiceListen(opt, idx)), renderAdventureChoiceStatus(isDemocracy, isMyVote, voteCount, percent, isReadingThisOption));
    });
  })()))) : /*#__PURE__*/React.createElement("div", {
    "data-adventure-reader": true,
    role: "region",
    "aria-label": adventureSettingsText(t, 'story_and_feedback', 'Story and feedback'),
    style: adventureVisualTokens(theme, true),
    className: "max-h-[55vh] overflow-y-auto overscroll-contain p-1 space-y-4 animate-in motion-reduce:animate-none fade-in slide-in-from-bottom-4 duration-300"
  }, failedAdventureAction ? /*#__PURE__*/React.createElement(AdventureTurnRecovery, {
    t: t,
    theme: theme,
    immersive: true,
    loading: adventureState.isLoading,
    onRetry: handleRetryAdventureTurn
  }) : /*#__PURE__*/React.createElement(AdventureTurnStatus, {
    state: adventureState,
    t: t,
    theme: theme,
    immersive: true
  }), (() => {
    const lastFeedback = adventureState.history.slice().reverse().find(h => h && h.type === 'feedback');
    if (lastFeedback) {
      return /*#__PURE__*/React.createElement("div", {
        role: "status",
        "aria-live": "polite",
        "aria-atomic": "true",
        className: "text-yellow-300 text-sm mb-3 italic font-medium border-b border-white/20 pb-2"
      }, lastFeedback.consequence?.version === 1 ? /*#__PURE__*/React.createElement(AdventureConsequenceCard, {
        consequence: lastFeedback.consequence,
        t: t,
        theme: theme,
        immersive: true
      }) : renderFormattedText(lastFeedback.text, false, true));
    }
    return null;
  })(), /*#__PURE__*/React.createElement("div", {
    role: "region",
    "aria-label": t('adventure.current_scene'),
    className: "text-lg md:text-xl text-slate-100 font-medium leading-relaxed font-serif text-shadow-sm min-h-[80px]"
  }, adventureState.currentScene && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4",
    onPointerEnter: () => {
      if (prewarmAdventureAudio && adventureState.currentScene) prewarmAdventureAudio(adventureState.currentScene.text, adventureState.currentScene.voices);
    }
  }, (() => {
    const paragraphs = adventureState.currentScene.text.split(/\n{2,}/);
    let sentenceCounter = 0;
    return paragraphs.map((para, pIdx) => {
      const sentences = splitTextToSentences(para);
      if (sentences.length === 0) return null;
      return /*#__PURE__*/React.createElement("p", {
        key: pIdx,
        className: "mb-4 leading-relaxed"
      }, sentences.map((s, sIdx) => {
        const currentGlobalIdx = sentenceCounter;
        sentenceCounter++;
        const isActive = playbackState.currentIdx === currentGlobalIdx && playingContentId === 'adventure-active';
        const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(s.trim());
        const isHeader = s.trim().startsWith('#') || isHtmlHeader;
        const cleanText = isHeader ? isHtmlHeader ? s.trim().replace(/<\/?h[1-6][^>]*>/gi, '') : s.trim().replace(/^#+\s*/, '') : s;
        // Per-sentence read-aloud (immersive/dark theme): the sentence TEXT is
        // the control — inline speaker button removed 2026-07-16 per Aaron
        // (see the light-theme renderer above for the rationale).
        return /*#__PURE__*/React.createElement("span", {
          key: sIdx,
          id: `sentence-${currentGlobalIdx}`,
          role: "button",
          tabIndex: 0,
          "aria-pressed": isActive,
          "aria-label": (t('adventure.read_aloud_title') || t('common.click_read_aloud') || 'Read aloud') + ': ' + cleanText.replace(/\*\*/g, '').trim(),
          title: t('adventure.read_aloud_title') || t('common.click_read_aloud'),
          onClick: e => {
            e.stopPropagation();
            handleSpeak(adventureState.currentScene.text, 'adventure-active', currentGlobalIdx);
          },
          onKeyDown: e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              handleSpeak(adventureState.currentScene.text, 'adventure-active', currentGlobalIdx);
            }
          },
          className: `transition-colors duration-300 motion-reduce:transition-none rounded px-1 py-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${isActive ? 'bg-cyan-700 text-white shadow-sm ring-2 ring-cyan-400/50' : 'hover:bg-white/10'} ${isHeader ? 'font-bold block text-2xl mt-2 text-yellow-400' : ''}`
        }, formatInteractiveText(cleanText.replace(/\*\*([^*]+)\*\*/g, '$1'), false, true), " ");
      }));
    });
  })())), /*#__PURE__*/React.createElement(AdventureJourneyNotebook, {
    history: adventureState.history,
    t: t,
    theme: theme,
    renderFormattedText: renderFormattedText,
    immersive: true
  }))))), !adventureState.isImmersiveMode && /*#__PURE__*/React.createElement("div", {
    "data-adventure-actions": "standard",
    role: "region",
    "aria-label": adventureSettingsText(t, 'available_actions', 'Available actions'),
    style: adventureVisualTokens(theme),
    className: "p-4 bg-[var(--av-surface)] border-t border-[var(--av-line)] shrink-0 max-h-[45vh] sm:max-h-[50vh] overflow-y-auto overscroll-contain"
  }, adventureState.currentScene && /*#__PURE__*/React.createElement(AdventureDecisionProgress, {
    state: adventureState,
    t: t,
    theme: theme
  }), adventureState.currentScene && !adventureState.isGameOver ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, adventureInputMode === 'debate' && adventureState.debatePhase === 'setup' && /*#__PURE__*/React.createElement("div", {
    className: "text-center mb-2 animate-in motion-reduce:animate-none slide-in-from-top-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bg-teal-100 text-teal-800 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full border border-teal-200 shadow-sm flex items-center justify-center gap-2 w-fit mx-auto"
  }, /*#__PURE__*/React.createElement(Scale, {
    size: 12
  }), " ", t('adventure.debate_stance'))), failedAdventureAction ? /*#__PURE__*/React.createElement(AdventureTurnRecovery, {
    t: t,
    theme: theme,
    loading: adventureState.isLoading,
    onRetry: handleRetryAdventureTurn
  }) : isEditingOptions ? /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col gap-2 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 mb-4 animate-in motion-reduce:animate-none fade-in"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-2"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold text-indigo-500 uppercase tracking-wider"
  }, t('adventure.editing_header')), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-indigo-600 italic"
  }, t('adventure.editing_subtext'))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-3"
  }, editingOptionsBuffer.map((opt, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('adventure.option_placeholder', {
      n: idx + 1
    }),
    type: "text",
    value: opt,
    onChange: e => handleOptionBufferChange(idx, e.target.value),
    className: "flex-grow p-3 rounded-xl border-2 border-indigo-600 text-sm font-bold text-indigo-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none",
    placeholder: t('adventure.option_placeholder', {
      n: idx + 1
    })
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": (t('adventure.tooltips.remove_option') || 'Remove option') + ' ' + (idx + 1),
    onClick: () => handleRemoveOptionSlot(idx),
    className: "min-w-11 min-h-11 p-2 text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2",
    title: t('adventure.tooltips.remove_option')
  }, /*#__PURE__*/React.createElement(X, {
    size: 16,
    "aria-hidden": "true"
  })))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleAddOptionSlot,
    className: "min-h-11 p-3 rounded-xl border-2 border-dashed border-indigo-400 text-indigo-700 hover:bg-indigo-50 font-bold text-sm transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 16,
    "aria-hidden": "true"
  }), " ", t('adventure.add_option'))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 mt-4 pt-3 border-t border-indigo-100"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleBroadcastOptions,
    className: "min-h-11 flex-grow bg-green-700 text-white font-bold py-3 rounded-xl shadow-md hover:bg-green-800 transition-all flex items-center justify-center gap-2 active:scale-95 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-800 focus-visible:ring-offset-2"
  }, /*#__PURE__*/React.createElement(Wifi, {
    size: 18,
    "aria-hidden": "true"
  }), " ", t('adventure.broadcast')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleSetIsEditingOptionsToFalse,
    className: "min-h-11 px-6 py-3 bg-white text-slate-700 font-bold rounded-xl border border-slate-500 hover:bg-slate-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2"
  }, t('common.cancel')))) : !adventureFreeResponseEnabled || adventureInputMode === 'debate' && adventureState.debatePhase === 'setup' ? /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-3"
  }, renderDemocracyStatus(false), (() => {
    const mainTextParagraphs = adventureState.currentScene.text.split(/\n{2,}/);
    const isTable = p => p.trim().startsWith('|') || p.includes('\n|');
    const textSentenceCount = mainTextParagraphs.flatMap(p => isTable(p) ? [] : splitTextToSentences(p)).length;
    return adventureState.currentScene.options.map((opt, idx) => {
      const isDebateSetup = adventureInputMode === 'debate' && adventureState.debatePhase === 'setup';
      const isDemocracy = democracyActive && !isDebateSetup;
      const optionValue = normalizeAdventureVoteOption(opt);
      const voteCount = isTeacherMode ? Object.values(democracyVotes).filter(v => String(v).trim() === optionValue).length : 0;
      const percent = isTeacherMode && democracyTotalVotes > 0 ? Math.round(voteCount / democracyTotalVotes * 100) : 0;
      const isMyVote = isDemocracy && !isTeacherMode && !!currentUserVote && currentUserVote === optionValue;
      const isReadingThisOption = isPlaying && (playingContentId === 'adventure-option-' + idx || playingContentId === 'adventure-active' && playbackState.currentIdx === textSentenceCount + idx);
      return /*#__PURE__*/React.createElement("div", {
        key: idx,
        "data-adventure-choice": true,
        "data-reading": isReadingThisOption || undefined,
        className: adventureChoiceClass(isMyVote, isReadingThisOption)
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex items-start gap-1"
      }, /*#__PURE__*/React.createElement("button", {
        type: "button",
        "data-help-key": "adventure_choice_btn",
        onClick: () => handleAdventureChoice(opt),
        disabled: adventureState.isLoading,
        "aria-pressed": isDemocracy && !isTeacherMode ? isMyVote : undefined,
        className: "min-h-11 min-w-0 flex-1 flex flex-col sm:flex-row items-start gap-2 sm:gap-3 p-3 rounded-xl text-left text-sm leading-relaxed font-semibold hover:bg-[var(--av-wash)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] disabled:opacity-50 disabled:cursor-not-allowed"
      }, /*#__PURE__*/React.createElement("span", {
        "aria-hidden": "true",
        className: "w-7 h-7 shrink-0 rounded-lg border border-[var(--av-control)] bg-[var(--av-wash)] text-[var(--av-accent)] flex items-center justify-center text-xs font-bold"
      }, isDebateSetup ? /*#__PURE__*/React.createElement(Scale, {
        size: 14,
        "aria-hidden": "true"
      }) : idx + 1), /*#__PURE__*/React.createElement("span", {
        className: "min-w-0 pt-0.5 [overflow-wrap:anywhere]"
      }, typeof opt === 'object' && opt?.action ? opt.action : opt)), renderAdventureChoiceListen(opt, idx)), renderAdventureChoiceStatus(isDemocracy, isMyVote, voteCount, percent, isReadingThisOption));
    });
  })()) : renderAdventureComposer(false), handleAdventureHint && adventureFreeResponseEnabled && adventureState.currentScene && !adventureState.isGameOver && /*#__PURE__*/React.createElement("div", {
    className: "w-full mt-2 flex flex-col gap-2"
  }, renderStrategyHintCard(false), renderStrategyHintButton(false)), adventureState.canStartSequel && /*#__PURE__*/React.createElement("div", {
    className: "w-full mt-6 pt-6 border-t border-slate-200 animate-in fade-in slide-in-from-bottom-4 motion-reduce:animate-none flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-slate-600 uppercase tracking-widest mb-3"
  }, t('adventure.sequel_prompt')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('adventure.start_sequel'),
    onClick: handleStartSequel,
    className: "min-h-11 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-black text-lg shadow-xl hover:scale-105 hover:shadow-2xl transition-all motion-reduce:transform-none flex items-center gap-3 border-2 border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 20,
    "aria-hidden": "true"
  }), t('adventure.start_sequel')))) : /*#__PURE__*/React.createElement("div", {
    className: "text-center text-xs text-slate-600 italic"
  }, adventureState.isGameOver ? t('adventure.status.reset_prompt') : t('adventure.status.waiting')))), /*#__PURE__*/React.createElement(AdventureFluencyPractice, {
    open: adventureFluencyOpen,
    onClose: () => setAdventureFluencyOpen(false),
    onSave: saveAdventureFluencyResult,
    t: t,
    sceneText: adventureState.currentScene?.text || '',
    sceneId: adventureState.currentScene?.id || adventureState.turnCount,
    turnCount: adventureState.turnCount,
    language: adventureLanguageMode,
    gradeLevel: props.gradeLevel,
    stopPlayback: stopPlayback
  }), selectedInventoryItem && /*#__PURE__*/React.createElement("div", {
    role: "presentation",
    className: "fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200 motion-reduce:animate-none",
    onClick: handleSetSelectedInventoryItemToNull
  }, /*#__PURE__*/React.createElement("div", {
    ref: inventoryDialogRef,
    tabIndex: -1,
    className: "bg-white rounded-2xl shadow-2xl p-4 sm:p-6 max-w-sm w-full max-h-[calc(100vh-1rem)] overflow-y-auto relative border-4 border-indigo-200 transition-all animate-in zoom-in-95 motion-reduce:animate-none",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "adventure-inventory-item-title",
    "aria-describedby": "adventure-inventory-item-description",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleSetSelectedInventoryItemToNull,
    className: "absolute top-2 right-2 sm:top-3 sm:right-3 min-w-11 min-h-11 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2",
    "aria-label": t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 20,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-24 h-24 bg-indigo-50 rounded-xl border-2 border-indigo-100 flex items-center justify-center mb-4 shadow-inner relative overflow-hidden group"
  }, selectedInventoryItem.image ? /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: selectedInventoryItem.image,
    alt: "",
    className: "w-full h-full object-contain pixelated",
    style: STYLE_IMAGE_PIXELATED
  }) : /*#__PURE__*/React.createElement("span", {
    className: "text-4xl",
    "aria-hidden": "true"
  }, selectedInventoryItem.icon || "📦"), /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    className: "absolute inset-0 bg-indigo-500/10 blur-xl rounded-full"
  })), /*#__PURE__*/React.createElement("h3", {
    id: "adventure-inventory-item-title",
    className: "text-xl font-black text-indigo-900 mb-1"
  }, selectedInventoryItem.name), /*#__PURE__*/React.createElement("span", {
    className: "inline-block max-w-full truncate whitespace-nowrap text-[11px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full mb-3 border border-indigo-300",
    title: t(`adventure.effects.${selectedInventoryItem.effectType}_label`) || t(`adventure.effects.${selectedInventoryItem.effectType}`) || selectedInventoryItem.effectType || "Consumable"
  }, t(`adventure.effects.${selectedInventoryItem.effectType}_label`) || t(`adventure.effects.${selectedInventoryItem.effectType}`) || selectedInventoryItem.effectType || "Consumable"), /*#__PURE__*/React.createElement("p", {
    id: "adventure-inventory-item-description",
    className: "text-sm text-slate-700 mb-6 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-300 w-full"
  }, selectedInventoryItem.description || t('adventure.inventory_fallback_desc')), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3 w-full"
  }, selectedInventoryItem.effectType === 'key_item' ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: true,
    className: "min-h-11 flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl border-2 border-slate-300 cursor-not-allowed flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(Lock, {
    size: 16,
    "aria-hidden": "true"
  }), " ", t('adventure.key_item_btn')) : /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleUseItem,
    className: "min-h-11 flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 motion-reduce:transform-none flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 16,
    "aria-hidden": "true"
  }), " ", t('adventure.use_item'))))))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.AdventureView = AdventureView;
  window.AlloModules.AdventureLearningProfiles = AdventureLearningProfiles;
  window.AlloModules.AdventureEpisodeSettings = AdventureEpisodeSettings;
  window.AlloModules.AdventureSetupFields = AdventureSetupFields;
  window.AlloModules.ViewAdventureModule = true;
})();
