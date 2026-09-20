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
  return Object.prototype.hasOwnProperty.call(state, 'episodeTurnLimit')
    ? state.episodeTurnLimit == null ? null : bounded(state.episodeTurnLimit)
    : state.enableAutoClimax ? null : bounded(state.climaxMinTurns);
}

function AdventureSettingsSurface({ theme, children, compact = false }) {
  const dark = theme === 'dark' || theme === 'contrast';
  const contrast = theme === 'contrast';
  return <div data-adventure-settings className={compact ? 'as-compact' : ''} style={{
    '--as-ink': dark ? '#f8fafc' : '#17233a', '--as-muted': dark ? '#cbd5e1' : '#475569',
    '--as-bg': contrast ? '#000' : dark ? '#0f172a' : '#fff',
    '--as-wash': contrast ? '#000' : dark ? '#1e293b' : '#f4f6fb',
    '--as-line': contrast ? '#fff' : dark ? '#94a3b8' : '#64748b',
    '--as-accent': contrast ? '#fde047' : dark ? '#a5b4fc' : '#4338ca'
  }}>
    <style>{`
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
      [data-adventure-settings] .as-permissions{border:0;border-top:1px solid var(--as-line);padding:16px 0 0;margin:16px 0 0;min-width:0}
      [data-adventure-settings] .as-permissions legend{padding-right:8px;margin:0}
      [data-adventure-settings] .as-resource-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:12px;overflow-wrap:anywhere}
      [data-adventure-settings] .as-resource-actions .as-help{margin:0;min-width:0}
      [data-adventure-settings] .as-resource{padding:12px;border:1px solid var(--as-line);border-radius:8px;margin:12px 0}
      [data-adventure-settings] .as-resource .as-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,110px),1fr));gap:10px}
      [data-adventure-settings] .as-notice{padding:10px 12px;border-left:3px solid var(--as-accent);background:var(--as-wash);font-size:13px;margin-bottom:16px}
      [data-adventure-settings] .as-summary{font-size:13px;line-height:1.7;padding:12px 0;margin-top:12px;color:var(--as-muted);overflow-wrap:anywhere}
      [data-adventure-settings] .as-summary strong{color:var(--as-ink)}
      @media(max-width:500px){[data-adventure-settings] summary .as-help{display:block;margin-left:16px}}
    `}</style>
    {children}
  </div>;
}

function AdventureSettingSection({ title, summary, children }) {
  return <details><summary><span>{title}</span>{' '}{summary && <span className="as-help">{summary}</span>}</summary><div className="as-detail">{children}</div></details>;
}

// Numeric drafts stay local until valid; empty drafts never erase a saved count.
function adventureSetupDecisionCount(value, fallback = 20) {
  const number = Number(value);
  return String(value ?? '').trim() !== '' && Number.isFinite(number)
    ? Math.max(3, Math.min(50, Math.round(number))) : fallback;
}

function AdventureDecisionInput({ value, onCommit, disabled, id, label, describedBy }) {
  const [draft, setDraft] = React.useState(String(value));
  React.useEffect(() => { setDraft(String(value)); }, [value]);
  const valid = draft.trim() !== '' && Number.isInteger(Number(draft)) && Number(draft) >= 3 && Number(draft) <= 50;
  return <input className="as-control" type="number" min="3" max="50" step="1" id={id} aria-label={label} aria-describedby={describedBy}
    aria-invalid={draft !== '' && !valid ? true : undefined} value={draft} disabled={disabled}
    onChange={event => {
      if (disabled) return;
      const next = event.target.value;
      setDraft(next);
      if (next.trim() !== '' && Number.isInteger(Number(next)) && Number(next) >= 3 && Number(next) <= 50) onCommit(Number(next));
    }}
    onBlur={() => {
      if (disabled) return;
      const next = adventureSetupDecisionCount(draft, value);
      setDraft(String(next));
      if (next !== value) onCommit(next);
    }} />;
}

function AdventureEpisodeSettings({ state, onChange, t, locked = false, id = 'adventure-episode-length', theme = 'light', freeResponse = false, includeFinale = false }) {
  const label = (key, fallback) => adventureSetupText(t, key, fallback);
  const limit = adventureSetupLimit(state);
  const previousLength = adventureSetupDecisionCount(state.lastEpisodeTurnLimit, 12);
  const showCustomLength = state.episodeLengthMode === 'custom' || (limit !== null && ![6, 12, 20].includes(limit));
  const disabled = locked || typeof onChange !== 'function';
  const update = (key, value) => {
    if (disabled) return;
    onChange(previous => ({ ...previous, [key]: value,
      ...(key === 'episodeTurnLimit' ? { lastEpisodeTurnLimit: value === null ? adventureSetupLimit(previous) ?? previous.lastEpisodeTurnLimit ?? 12 : value } : {})
    }));
  };
  return <AdventureSettingsSurface theme={theme}>
    <fieldset className="as-episode-mode" disabled={disabled} aria-describedby={id + '-hint'}>
      <legend>{label('episode_format', 'Episode format')}</legend>
      <div className="as-grid">
        <label className="as-option"><input type="radio" name={id + '-format'} checked={limit !== null} disabled={disabled} onChange={() => update('episodeTurnLimit', previousLength)} />{label('set_length', 'Set-length episode')}</label>
        <label className="as-option"><input type="radio" name={id + '-format'} checked={limit === null} disabled={disabled} onChange={() => update('episodeTurnLimit', null)} />{label('open', 'Open-ended')}</label>
      </div>
    </fieldset>
    <div className="as-grid">
      {limit !== null && <label className="as-field" htmlFor={id}>{label('length', 'Episode length')}
        <select className="as-control" aria-label={label('length', 'Episode length')} id={id} value={showCustomLength ? 'custom' : String(limit)} disabled={disabled} onChange={e => { if (disabled) return; const selected = e.target.value; onChange(previous => ({ ...previous, episodeLengthMode: selected === 'custom' ? 'custom' : 'preset', ...(selected === 'custom' ? {} : { episodeTurnLimit: Number(selected), lastEpisodeTurnLimit: Number(selected) }) })); }}>
          <option value="6">{label('short', 'Short · 6 decisions')}</option><option value="12">{label('standard', 'Standard · 12 decisions')}</option><option value="20">{label('long', 'Long · 20 decisions')}</option>
          <option value="custom">{label('custom_length', 'Custom length')}</option>
        </select>
      </label>}
      {limit !== null && showCustomLength && <label className="as-field" htmlFor={id + '-custom'}>{label('custom_decisions', 'Custom decision count')}
        <AdventureDecisionInput id={id + '-custom'} label={label('custom_decisions', 'Custom decision count')} describedBy={id + '-custom-help'} value={limit} disabled={disabled} onCommit={count => update('episodeTurnLimit', count)} />
        <span className="as-help" id={id + '-custom-help'}>{label('custom_length_hint', 'Choose 3–50 decisions. This changes episode length, not choices per decision.')}</span>
      </label>}
      {!freeResponse && <label className="as-field" htmlFor={id + '-choices'}>{label('choices', 'Choices per decision')}
        <select className="as-control" aria-label={label('choices', 'Choices per decision')} id={id + '-choices'} value={state.choiceCount || 6} disabled={disabled} onChange={e => update('choiceCount', Number(e.target.value))}>
          {[2, 3, 4, 5, 6].map(count => <option key={count} value={count}>{count}</option>)}
        </select>
      </label>}
    </div>
    <p className="as-help" id={id + '-hint'}>{limit === null
      ? state.enableAutoClimax
        ? label('open_with_finale_hint', 'No fixed decision limit. A final challenge can still end the story; turn it off below to keep exploring. Energy depletion can end a run earlier.')
        : label('open_without_finale_hint', 'No fixed decision limit and no automatic final challenge. Energy depletion can still end a run.')
      : label('length_hint', 'Length counts decisions, not minutes. The final challenge fits inside a set episode. Energy depletion can end a run earlier.')}</p>
    {includeFinale && <>
      <label className="as-check"><input type="checkbox" checked={!!state.enableAutoClimax} disabled={disabled} onChange={e => update('enableAutoClimax', e.target.checked)} />{label('finale', 'Include a final challenge')}</label>
      {limit === null && state.enableAutoClimax && <label className="as-field" htmlFor={id + '-earliest'}>{label('earliest_finale', 'Earliest finale round (open-ended)')}
        <AdventureDecisionInput id={id + '-earliest'} label={label('earliest_finale', 'Earliest finale round (open-ended)')} describedBy={id + '-earliest-help'} value={adventureSetupDecisionCount(state.climaxMinTurns)} disabled={disabled} onCommit={count => update('climaxMinTurns', count)} />
        <span className="as-help" id={id + '-earliest-help'}>{label('finale_count_hint', 'Choose a whole number from 3 to 50. The finale also waits for sufficient story progress.')}</span>
      </label>}
    </>}
  </AdventureSettingsSurface>;
}

function adventureSetupSummaryParts(props) {
  const state = props.adventureState || {};
  const label = (key, fallback) => adventureSetupText(props.t, key, fallback);
  const mode = props.adventureInputMode || 'choice';
  const experience = mode === 'system' ? label('profile_systems', 'Systems Challenge')
    : mode === 'debate' ? label('profile_debate', 'Evidence Debate')
    : props.isSocialStoryMode ? label('profile_social', 'Social Practice')
    : state.learningProfile === 'guided' ? label('profile_guided', 'Guided Story')
    : label('adventure.mode_choice', 'Standard Adventure Mode');
  const limit = adventureSetupLimit(state);
  const language = props.adventureLanguageMode || 'English';
  let languageLabel = language;
  if (language.includes(' + English')) {
    const source = language.replace(' + English', '');
    const content = source === 'All' ? (props.selectedLanguages || []).filter(value => value !== 'English').join(', ') : source;
    // Match Adventure's existing gloss policy, including its English fallback.
    let target = 'English';
    const contentLanguage = source === 'All' ? '' : source;
    if (typeof props.resolveTranslationPolicy === 'function' && props.currentUiLanguage) {
      try {
        const policy = props.resolveTranslationPolicy(props.translationMode, contentLanguage, props.currentUiLanguage);
        if (policy?.enabled && policy.target) target = policy.target;
        else if (!contentLanguage && String(props.translationMode) !== 'off') target = props.currentUiLanguage;
      } catch (_) { /* Older hosts retain Adventure's English fallback. */ }
    }
    languageLabel = content + ' · ' + target + ' ' + label('translation', 'translation');
  }
  return [experience, props.isSocialStoryMode && props.socialStoryFocus?.trim(),
    limit == null ? label('open', 'Open-ended') : limit + ' ' + label('decisions', 'decisions'),
    props.adventureFreeResponseEnabled ? label('response_written', 'Write or dictate')
      : (state.choiceCount || 6) + ' ' + label('suggested_choices', 'suggested choices'),
    languageLabel, label('final_challenge', 'Final challenge') + ': ' + label(state.enableAutoClimax ? 'common.on' : 'common.off', state.enableAutoClimax ? 'On' : 'Off')
  ].filter(Boolean);
}

function AdventureSetupSummary(props) {
  const label = adventureSetupText(props.t, 'setup_summary', 'Setup summary');
  return <AdventureSettingsSurface theme={props.theme} compact={props.compact}>
    <div className="as-summary" role="region" aria-label={label}>
      <strong>{label}: </strong>{adventureSetupSummaryParts(props).join(' · ')}
    </div>
  </AdventureSettingsSurface>;
}

function AdventureSetupFields(props) {
  const fixed = !props.isTeacherMode && props.studentProjectSettings?.adventurePermissions?.lockAllSettings;
  return <AdventureSettingsSurface theme={props.theme} compact={props.compact}>
    {(props.adventureState?.isLoading || props.isProcessing) && <p className="as-notice" role="status">{adventureSetupText(props.t, 'setup_busy_hint', 'The adventure is updating. Editing is temporarily paused.')}</p>}
    {!props.hideSummary && <AdventureSetupSummary {...props} />}
    {fixed ? <>
      <p className="as-notice">{adventureSetupText(props.t, 'student_locked_hint', 'Your teacher has fixed this setup. You can review the settings and start your adventure.')}</p>
      <details><summary>{adventureSetupText(props.t, 'view_teacher_settings', 'View teacher settings')}</summary>
        <AdventureSetupEditor {...props} hideNotice />
      </details>
    </> : <AdventureSetupEditor {...props} />}
  </AdventureSettingsSurface>;
}

function AdventureSetupEditor(props) {
  const state = props.adventureState || {};
  const settings = props.studentProjectSettings || {};
  const permissions = settings.adventurePermissions || {};
  const label = (key, fallback) => adventureSetupText(props.t, key, fallback);
  const id = props.idPrefix || 'adventure-setup';
  const locked = permission => adventureSetupLocked(props, permission);
  // Explain the teacher policy independently of a temporary processing lock.
  const fixedByTeacher = permission => !props.isTeacherMode && adventureSetupLocked({ isTeacherMode: false, studentProjectSettings: settings }, permission);
  const fixedHint = (permission, key) => fixedByTeacher(permission) && <span className="as-help" id={id + '-' + key + '-fixed'}>{label('teacher_fixed_field', 'Set by your teacher.')}</span>;
  const describedBy = (permission, key, help) => [help && id + '-' + key + '-help', fixedByTeacher(permission) && id + '-' + key + '-fixed'].filter(Boolean).join(' ') || undefined;
  const change = (setter, value, permission) => { if (!locked(permission) && typeof props[setter] === 'function') props[setter](value); };
  const toggle = (field, setter, title, help, permission, extraDisabled = false) => typeof props[setter] === 'function' && <label className="as-check">
    <input type="checkbox" aria-label={title} aria-describedby={describedBy(permission, field, help)} checked={!!props[field]} disabled={locked(permission) || extraDisabled} onChange={e => change(setter, e.target.checked, permission)} />
    <span>{title}{help && <span className="as-help" id={id + '-' + field + '-help'}>{help}</span>}{fixedHint(permission, field)}</span>
  </label>;
  const field = (key, title, value, setter, options, permission, help) => <label className="as-field" htmlFor={id + '-' + key}>{title}
    <select className="as-control" aria-label={title} aria-describedby={describedBy(permission, key, help)} id={id + '-' + key} value={value} disabled={locked(permission) || typeof props[setter] !== 'function'} onChange={e => change(setter, e.target.value, permission)}>
      {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
    </select>{help && <span className="as-help" id={id + '-' + key + '-help'}>{help}</span>}{fixedHint(permission, key)}
  </label>;
  const modeGuide = props.adventureInputMode === 'debate'
    ? label('mode_debate_guide', 'Choose a position first. Then support your argument with lesson evidence and consider another perspective.')
    : props.adventureInputMode === 'system'
      ? label('mode_system_guide', 'Change a policy or part of a system, then compare its effects and resource tradeoffs.')
      : props.isSocialStoryMode
        ? label('mode_social_guide', 'Practise what you could say or do, with room for boundaries, different perspectives, and repair.')
        : label('mode_story_guide', 'Explore a story through decisions that use ideas from the lesson.');
  const modes = [['choice', label('adventure.mode_choice', 'Standard Adventure Mode')], ['debate', label('adventure.mode_debate', 'Debate')], ['system', label('adventure.mode_system', 'Systems simulation')]];
  const languages = Array.from(new Set((props.selectedLanguages || []).filter(lang => lang !== 'English')));
  const languageOptions = [['English', label('adventure.lang_options.english_only', 'English only')], ...languages.flatMap(lang => [[lang, lang], [lang + ' + English', lang + ' · ' + label('with_translation', 'with translation')]])];
  if (languages.length > 1) languageOptions.push(['All + English', languages.join(', ') + ' · ' + label('with_translation', 'with translation')]);
  // Preserve a saved selection even if the teacher's current language list differs.
  if (props.adventureLanguageMode && !languageOptions.some(option => option[0] === props.adventureLanguageMode)) languageOptions.push([props.adventureLanguageMode, props.adventureLanguageMode]);
  const resources = Array.isArray(state.systemResources) ? state.systemResources : [];
  const [removedResource, setRemovedResource] = React.useState(null);
  const [resourceAnnouncement, setResourceAnnouncement] = React.useState('');
  const pendingResourceFocus = React.useRef(null);
  const resourceEditorRef = React.useRef(null);
  const resourcesLocked = locked() || typeof props.setAdventureState !== 'function';
  React.useEffect(() => {
    const target = pendingResourceFocus.current;
    if (target) {
      const control = resourceEditorRef.current?.querySelector('[id="' + target + '"]');
      if (control) { control.focus(); pendingResourceFocus.current = null; }
    }
  }, [state.systemResources]);
  React.useEffect(() => { setRemovedResource(null); setResourceAnnouncement(''); pendingResourceFocus.current = null; }, [state.currentScene]);
  const resourceNameKey = value => typeof value === 'string' ? value.trim().slice(0, 80).toLocaleLowerCase() : '';
  const resourceNameIssue = index => {
    if (index >= 24) return label('resource_limit_issue', 'Only the first 24 resources are used. Remove an earlier row to include this one.');
    const key = resourceNameKey(resources[index]?.name);
    if (!key) return label('resource_name_missing', 'Add a name to include this resource in the story. Unnamed rows are skipped.');
    if (resources.slice(0, index).some(resource => resourceNameKey(resource?.name) === key)) return label('resource_name_duplicate', 'This name is already used above. Give this resource a distinct name; only the first entry is used.');
    return '';
  };
  const resourceMode = props.factionResourceMode === 'manual' ? 'manual' : 'ai';
  const setResourceMode = value => {
    if (locked()) return;
    if (typeof props.setFactionResourceMode === 'function') props.setFactionResourceMode(value);
    else { const handler = value === 'manual' ? props.handleSetFactionResourceModeToManual : props.handleSetFactionResourceModeToAi; if (typeof handler === 'function') handler(); }
  };
  const editResources = update => { if (!locked() && typeof props.setAdventureState === 'function') props.setAdventureState(previous => ({ ...previous, systemResources: update(previous.systemResources || []) })); };
  const addResource = () => {
    if (resourcesLocked || resources.length >= 24) return;
    pendingResourceFocus.current = id + '-resource-' + resources.length + '-name';
    editResources(rows => rows.length >= 24 ? rows : [...rows, { name: '', icon: '🔹', quantity: 50, unit: '%', type: 'strategic' }]);
  };
  const removeResource = index => {
    if (resourcesLocked || !resources[index]) return;
    setRemovedResource({ resource: { ...resources[index] }, index });
    setResourceAnnouncement(label('resource_removed', 'Removed resource') + ': ' + (resources[index].name || label('resource_unnamed', 'Unnamed resource')));
    pendingResourceFocus.current = resources.length > 1 ? id + '-resource-' + Math.min(index, resources.length - 2) + '-name' : id + '-add-resource';
    editResources(rows => rows.filter((_, i) => i !== index));
  };
  const undoResourceRemoval = () => {
    if (resourcesLocked || !removedResource) return;
    const index = Math.min(removedResource.index, resources.length);
    pendingResourceFocus.current = id + '-resource-' + index + '-name';
    editResources(rows => { const next = rows.slice(); next.splice(Math.min(removedResource.index, next.length), 0, { ...removedResource.resource }); return next; });
    setResourceAnnouncement(label('resource_restored', 'Restored resource') + ': ' + (removedResource.resource.name || label('resource_unnamed', 'Unnamed resource')));
    setRemovedResource(null);
  };
  const supports = typeof props.setAdventureAutoRead === 'function' || typeof props.setAdventureTypingPaceEnabled === 'function' || typeof props.setAdventureFluencyEnabled === 'function';
  const hasCloud = typeof props.setIsAdventureCloudEnabled === 'function';
  const permissionToggle = (key, title, help, defaultAllowed = false) => props.isTeacherMode && typeof props.setStudentProjectSettings === 'function' && <label className="as-check">
    <input type="checkbox" aria-label={title} checked={defaultAllowed ? permissions[key] !== false : permissions[key] === true} disabled={locked() || (key !== 'lockAllSettings' && permissions.lockAllSettings === true)} onChange={e => { const checked = e.target.checked; if (!locked() && (key === 'lockAllSettings' || !permissions.lockAllSettings)) props.setStudentProjectSettings(previous => ({ ...previous, adventurePermissions: { ...previous.adventurePermissions, [key]: checked } })); }} />
    <span>{title}<span className="as-help">{help}</span></span>
  </label>;
  const limit = adventureSetupLimit(state);
  const onOff = value => label(value ? 'common.on' : 'common.off', value ? 'On' : 'Off');
  return <AdventureSettingsSurface theme={props.theme} compact={props.compact}>
    {!props.isTeacherMode && !props.hideNotice && !state.isLoading && !props.isProcessing && <p className="as-notice">{permissions.lockAllSettings
      ? label('student_locked_hint', 'Your teacher has fixed this setup. You can review the settings and start your adventure.')
      : label('student_edit_hint', 'You can adjust the settings your teacher allows. Unavailable controls are set by your teacher.')}</p>}
    <section className="as-box" aria-labelledby={id + '-essential-heading'}>
      <h3 id={id + '-essential-heading'} className="as-title">{label('essential_setup', 'Essential setup')}</h3>
      <div className="as-grid">
        {field('input-mode', label('adventure.interaction_mode', 'Interaction mode'), props.adventureInputMode || 'choice', 'setAdventureInputMode', modes, 'allowModeSwitch', modeGuide)}
        {languageOptions.length > 1 && field('language', label('adventure.language_label', 'Adventure language'), props.adventureLanguageMode || 'English', 'setAdventureLanguageMode', languageOptions, 'allowLanguageSwitch', label('translation_hint', 'Story language follows this control; the translation language follows Universal Settings.'))}
        <label className="as-field" htmlFor={id + '-response'}>{label('response_format', 'Student responses')}
          <select aria-label={label('response_format', 'Student responses')} aria-describedby={describedBy('freeResponse', 'response')} id={id + '-response'} className="as-control" value={props.adventureFreeResponseEnabled ? 'written' : 'choice'} disabled={locked('freeResponse') || typeof props.setAdventureFreeResponseEnabled !== 'function'} onChange={e => change('setAdventureFreeResponseEnabled', e.target.value === 'written', 'freeResponse')}>
            <option value="choice">{label('response_choices', 'Choose from suggestions')}</option><option value="written">{label('response_written', 'Write or dictate')}</option>
          </select>{fixedHint('freeResponse', 'response')}
        </label>
      </div>
      {props.isTeacherMode && typeof props.openUniversalSettings === 'function' && <button type="button" className="as-button" style={{ marginTop: 12 }} disabled={locked()} onClick={() => { if (!locked()) props.openUniversalSettings('languages'); }}>{languageOptions.length === 1 ? label('add_languages', 'Add languages in Universal Settings') : label('manage_languages', 'Manage languages in Universal Settings')}</button>}
      <div style={{ marginTop: 16 }}><AdventureEpisodeSettings state={state} onChange={props.setAdventureState} t={props.t} theme={props.theme} locked={locked()} id={id + '-episode-length'} freeResponse={props.adventureFreeResponseEnabled} includeFinale /></div>
      {props.isSocialStoryMode && <label className="as-field" htmlFor={id + '-social-focus'}>{label('social_focus', 'Social skill to practise')}
        <input id={id + '-social-focus'} className="as-control" type="text" value={props.socialStoryFocus || ''} disabled={locked() || typeof props.setSocialStoryFocus !== 'function'} onChange={e => change('setSocialStoryFocus', e.target.value)} placeholder={label('adventure.social_story_focus_placeholder', 'e.g., Sharing toys, Dealing with frustration')} />
      </label>}
      {props.adventureInputMode === 'system' && <div>
        {toggle('enableFactionResources', 'setEnableFactionResources', label('adventure.system_state_label', 'Track resources'), label('adventure.system_state_desc', 'Track how your decisions affect the system.'))}
        {props.enableFactionResources && <>
          <label className="as-field" htmlFor={id + '-resource-mode'}>{label('resource_setup', 'Resource setup')}
            <select aria-label={label('resource_setup', 'Resource setup')} className="as-control" id={id + '-resource-mode'} value={resourceMode} disabled={locked() || !(props.setFactionResourceMode || props.handleSetFactionResourceModeToManual)} onChange={e => setResourceMode(e.target.value)}>
              <option value="ai">{label('resources_ai', 'AI-generated resources')}</option><option value="manual">{label('resources_manual', 'Teacher-defined resources')}</option>
            </select>
          </label>
          {resourceMode === 'manual' && <div ref={resourceEditorRef}>
            <p className="as-help">{label('resources_manual_hint', 'Give each resource a distinct name and unit. Percentages stay between 0 and 100; other values can exceed 100 and include decimals.')}</p>
            {resources.length === 0 && <p className="as-notice">{label('resources_empty', 'No resources yet. Add a resource such as Budget (credits), Water (litres), or Trust (%).')}</p>}
            <p className="as-help">{label('resource_count', 'Resource rows')}: {resources.length} / 24</p>
            {resources.map((resource, index) => <div className="as-resource" key={index}>
              <div className="as-grid">{[['name', label('resource_name', 'Resource name'), 'text'], ['quantity', label('resource_quantity', 'Starting value'), 'number'], ['unit', label('resource_unit', 'Unit'), 'text']].map(([key, title, type]) => <label className="as-field" key={key} htmlFor={id + '-resource-' + index + '-' + key}>{title} {index + 1}
                <input id={id + '-resource-' + index + '-' + key} className="as-control" aria-label={title + ' ' + (index + 1)} aria-invalid={key === 'name' && !!resourceNameIssue(index) ? true : undefined} aria-describedby={key === 'name' && resourceNameIssue(index) ? id + '-resource-' + index + '-issue' : undefined} maxLength={key === 'name' ? 80 : key === 'unit' ? 30 : undefined} type={type} min={type === 'number' ? 0 : undefined} step={type === 'number' ? 'any' : undefined} max={type === 'number' && /^(%|percent|percentage)$/i.test(String(resource.unit || '').trim()) ? 100 : undefined} value={resource[key] ?? ''} disabled={resourcesLocked} onChange={e => { const value = type === 'number' ? Math.min(/^(%|percent|percentage)$/i.test(String(resource.unit || '').trim()) ? 100 : Infinity, Math.max(0, Number(e.target.value) || 0)) : e.target.value; editResources(rows => rows.map((row, i) => i === index ? { ...row, [key]: value } : row)); }} />
                {key === 'name' && resourceNameIssue(index) && <span id={id + '-resource-' + index + '-issue'} className="as-help">{resourceNameIssue(index)}</span>}
              </label>)}</div>
              <button type="button" className="as-button" style={{ marginTop: 10 }} disabled={resourcesLocked} onClick={() => removeResource(index)}>{label('remove_resource', 'Remove resource')} {index + 1}</button>
            </div>)}
            <button id={id + '-add-resource'} type="button" className="as-button" style={{ marginTop: 12 }} disabled={resourcesLocked || resources.length >= 24} onClick={addResource}>{label('adventure.add_state_variable', 'Add resource')}</button>
            <div className="as-resource-actions">
              <span className="as-help" role="status" aria-live="polite" aria-atomic="true">{resourceAnnouncement}</span>
              {removedResource && <button type="button" className="as-button" disabled={resourcesLocked} onClick={undoResourceRemoval}>{label('undo_resource_removal', 'Undo resource removal')}</button>}
            </div>
            {resources.length >= 24 && <p className="as-help">{label('resource_limit_hint', 'The story supports up to 24 resources. Remove a row before adding another.')}</p>}
          </div>}
        </>}
      </div>}
    </section>
    {supports && <AdventureSettingSection title={label('learning_supports', 'Learning supports')} summary={[typeof props.setAdventureAutoRead === 'function' && label('auto_read_short', 'Auto-read') + ': ' + onOff(props.adventureAutoRead), label('microphone_practice', 'Microphone practice') + ': ' + onOff(props.adventureFluencyEnabled), props.adventureFreeResponseEnabled && label('adventure.typing_pace_label', 'Typing pace') + ': ' + onOff(props.adventureTypingPaceEnabled)].filter(Boolean).join(' · ')}>
      {typeof props.setAdventureAutoRead === 'function' && <label className="as-check"><input type="checkbox" checked={!!props.adventureAutoRead} disabled={locked()} onChange={e => { change('setAdventureAutoRead', e.target.checked); if (!e.target.checked && typeof props.stopPlayback === 'function') props.stopPlayback(); }} />{label('auto_read_setup', 'Read each scene automatically')}</label>}
      {toggle('adventureFluencyEnabled', 'setAdventureFluencyEnabled', label('adventure.fluency_setting_label', 'Scene reading practice'), label('adventure.fluency_setting_desc', 'Offer an optional microphone button for practising the current passage.'))}
      {props.adventureFreeResponseEnabled && toggle('adventureTypingPaceEnabled', 'setAdventureTypingPaceEnabled', label('adventure.typing_pace_label', 'Typing pace'), label('adventure.typing_pace_desc', 'Descriptive pace and word count for written responses. Never affects points or grades.'))}
    </AdventureSettingSection>}
    <AdventureSettingSection title={label('story_rules', 'Story & game rules')} summary={[label('energy_rewards', 'Energy & rewards') + ': ' + label('adventure.diff_' + (props.adventureDifficulty || 'Normal').toLowerCase() + '_option', props.adventureDifficulty || 'Normal'), label('adventure.story_mode_label', 'Peaceful mode') + ': ' + onOff(props.isAdventureStoryMode), label('adventure.chance_mode_label', 'Chance') + ': ' + onOff(props.adventureChanceMode)].join(' · ')}>
      {field('difficulty', label('energy_rewards', 'Energy & rewards'), props.adventureDifficulty || 'Normal', 'setAdventureDifficulty', [['Story', label('adventure.diff_story_option', 'Story')], ['Normal', label('adventure.diff_normal_option', 'Normal')], ['Hard', label('adventure.diff_hard_option', 'Hard')], ['Hardcore', label('adventure.diff_hardcore_option', 'Hardcore')]], 'allowDifficultySwitch', label('difficulty_' + (props.adventureDifficulty || 'Normal'), { Story: 'Half energy loss; 1.5× XP. Reasoning expectations follow the lesson.', Normal: 'Standard energy loss and XP. Reasoning expectations follow the lesson.', Hard: '1.5× energy loss; 0.75× XP. Success thresholds stay the same.', Hardcore: '2.5× energy loss; 0.5× XP. Success thresholds stay the same.' }[props.adventureDifficulty || 'Normal']))}
      {toggle('isAdventureStoryMode', 'setIsAdventureStoryMode', label('adventure.story_mode_label', 'Peaceful mode'), label('adventure.story_mode_desc', 'Focus on exploration and puzzles.'))}
      {toggle('adventureChanceMode', 'setAdventureChanceMode', label('adventure.chance_mode_label', 'Chance mode'), label('adventure.chance_mode_desc', 'Chance rolls influence the story outcome.'))}
      {toggle('isSocialStoryMode', 'setIsSocialStoryMode', label('adventure.social_story_mode_label', 'Social scenario mode'), label('social_mode_hint', 'Show a target social skill in Essential setup.'))}
    </AdventureSettingSection>
    <AdventureSettingSection title={label('visual_settings', 'Visuals')} summary={[
      label('adventure.art_style_label', 'Art style') + ': ' + label('adventure.art_' + (props.adventureArtStyle || 'auto'), props.adventureArtStyle || 'Auto'),
      label('adventure.protagonist_age_label', 'Protagonist age') + ': ' + label('adventure.protagonist_age_' + (props.adventureProtagonistAge || 'auto').replaceAll('-', '_'), { auto: 'Auto (match the audience)', child: 'Child', teen: 'Teen', 'young-adult': 'Young adult', adult: 'Adult', 'older-adult': 'Older adult' }[props.adventureProtagonistAge || 'auto'] || props.adventureProtagonistAge),
      props.adventureConsistentCharacters && label('adventure.consistent_characters_label', 'Consistent characters'),
      props.useLowQualityVisuals && label('adventure.low_quality_label', 'Faster, simpler visuals')
    ].filter(Boolean).join(' · ')}>
      {field('art-style', label('adventure.art_style_label', 'Art style'), props.adventureArtStyle || 'auto', 'setAdventureArtStyle', ['universal', 'auto', 'storybook', 'pixel', 'cinematic', 'anime', 'crayon', 'custom'].map(value => [value, label('adventure.art_' + value, { universal: 'Use Universal style', auto: 'Auto', storybook: 'Storybook', pixel: 'Pixel art', cinematic: 'Cinematic', anime: 'Anime', crayon: 'Hand-drawn', custom: 'Custom' }[value])]), 'allowVisualsToggle')}
      {props.adventureArtStyle === 'universal' && <p className="as-help">{props.universalImageStyle || label('universal_style_empty', 'No Universal style is set; Adventure will use its automatic style.')}</p>}
      {props.adventureArtStyle === 'custom' && <label className="as-field" htmlFor={id + '-custom-art'}>{label('custom_art', 'Custom art style')}<input id={id + '-custom-art'} aria-label={label('custom_art', 'Custom art style')} aria-describedby={describedBy('allowVisualsToggle', 'custom-art')} className="as-control" value={props.adventureCustomArtStyle || ''} disabled={locked('allowVisualsToggle')} onChange={e => change('setAdventureCustomArtStyle', e.target.value, 'allowVisualsToggle')} />{fixedHint('allowVisualsToggle', 'custom-art')}</label>}
      {toggle('adventureConsistentCharacters', 'setAdventureConsistentCharacters', label('adventure.consistent_characters_label', 'Consistent characters'), label('adventure.consistent_characters_desc', 'Keep character appearances consistent across scenes.'), 'allowVisualsToggle')}
      {field('protagonist-age', label('adventure.protagonist_age_label', 'Protagonist age'), props.adventureProtagonistAge || 'auto', 'setAdventureProtagonistAge', [['auto', label('adventure.protagonist_age_auto', 'Auto (match the audience)')], ['child', label('adventure.protagonist_age_child', 'Child')], ['teen', label('adventure.protagonist_age_teen', 'Teen')], ['young-adult', label('adventure.protagonist_age_young_adult', 'Young adult')], ['adult', label('adventure.protagonist_age_adult', 'Adult')], ['older-adult', label('adventure.protagonist_age_older_adult', 'Older adult')]], 'allowVisualsToggle', label('adventure.protagonist_age_help', 'Who the learner plays as. Auto follows the target level. Reading level is unchanged either way.'))}
      {toggle('useLowQualityVisuals', 'setUseLowQualityVisuals', label('adventure.low_quality_label', 'Faster, simpler visuals'), label('adventure.low_quality_desc', 'Faster generation, less data.'), 'allowVisualsToggle')}
    </AdventureSettingSection>
    <AdventureSettingSection title={label('story_guidance', 'Story guidance')} summary={props.adventureCustomInstructions?.trim() ? label('guidance_added', 'Custom instructions added') : label('guidance_empty', 'No custom instructions')}>
      <label className="as-field" htmlFor={id + '-custom-instructions'}>{label('input.custom_instructions', 'Custom instructions')}
        <textarea id={id + '-custom-instructions'} aria-label={label('input.custom_instructions', 'Custom instructions')} aria-describedby={describedBy('allowCustomInstructions', 'custom-instructions')} className="as-control" value={props.adventureCustomInstructions || ''} disabled={locked('allowCustomInstructions')} onChange={e => change('setAdventureCustomInstructions', e.target.value, 'allowCustomInstructions')} placeholder={label('adventure.placeholder_custom', 'Add guidance for this adventure.')} />{fixedHint('allowCustomInstructions', 'custom-instructions')}
      </label>
    </AdventureSettingSection>
    {(hasCloud || (props.isTeacherMode && props.setStudentProjectSettings)) && <AdventureSettingSection title={label('saving_permissions', 'Saving & permissions')} summary={[label('cloud_images', 'Cloud images') + ': ' + onOff(props.isAdventureCloudEnabled), permissions.lockAllSettings ? label('student_setup_fixed', 'Student setup fixed') : label('student_setup_adjustable', 'Student setup adjustable')].join(' · ')}>
      {hasCloud && (props.isTeacherMode || permissions.allowCloudImageStorage === true) && <label className="as-check">
        <input type="checkbox" checked={!!props.isAdventureCloudEnabled} disabled={locked('allowCloudImageStorage')} onChange={e => { if (locked('allowCloudImageStorage')) return; change('setIsAdventureCloudEnabled', e.target.checked, 'allowCloudImageStorage'); if (typeof props.safeSetItem === 'function') props.safeSetItem('allo_adventure_cloud', e.target.checked ? 'true' : 'false'); }} />
        <span>{label('adventure.cloud_storage_label', 'Cloud image storage')}<span className="as-help">{label('adventure.cloud_storage_desc', 'Store generated images online.')}</span></span>
      </label>}
      {props.adventureFreeResponseEnabled && props.isAdventureCloudEnabled && (props.isTeacherMode || permissions.allowCloudImageStorage) && <p className="as-notice">{label('adventure.pii_warning_desc', 'Avoid including personal information in written responses when cloud image storage is enabled.')}</p>}
      {props.isTeacherMode && typeof props.setStudentProjectSettings === 'function' && <fieldset className="as-permissions">
        <legend className="as-title">{label('student_editing', 'Student editing')}</legend>
        {permissionToggle('lockAllSettings', label('adventure.lock_settings_label', 'Lock student settings'), label('adventure.lock_settings_desc', 'Keep the adventure setup fixed for students.'))}
        <p className="as-help">{permissions.lockAllSettings ? label('permissions_paused_hint', 'Unlock student settings to use the permissions below. Your selections are kept while locked.') : label('permissions_scope_hint', 'Choose which additional settings students can change. Episode pacing, learning supports, and general story rules remain adjustable unless you lock student settings.')}</p>
        <div className="as-grid">
          {permissionToggle('allowModeSwitch', label('allow_mode_edit', 'Change interaction mode'), label('allow_mode_edit_hint', 'Choose standard adventure, debate, or systems simulation.'))}
          {permissionToggle('allowLanguageSwitch', label('allow_language_edit', 'Change adventure language'), label('allow_language_edit_hint', 'Choose from the available story languages.'))}
          {permissionToggle('allowDifficultySwitch', label('allow_energy_edit', 'Change energy & rewards'), label('allow_energy_edit_hint', 'Adjust energy loss and XP multipliers.'))}
          {permissionToggle('allowCustomInstructions', label('allow_guidance_edit', 'Edit story guidance'), label('allow_guidance_edit_hint', 'Add or change custom story instructions.'))}
          {permissionToggle('allowVisualsToggle', label('allow_visual_edit', 'Change visual settings'), label('allow_visual_edit_hint', 'Choose art style, protagonist age, character consistency, and faster visuals.'), true)}
          {permissionToggle('allowCloudImageStorage', label('adventure.allow_cloud_storage_label', 'Allow cloud image storage'), label('adventure.allow_cloud_storage_desc', 'Allow students to store generated images online.'))}
        </div>
      </fieldset>}
    </AdventureSettingSection>}

  </AdventureSettingsSurface>;
}

