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

function AdventureEpisodeSettings({ state, onChange, t, locked = false, id = 'adventure-episode-length', theme = 'light', freeResponse = false, includeFinale = false }) {
  const label = (key, fallback) => adventureSetupText(t, key, fallback);
  const limit = adventureSetupLimit(state);
  const previousLength = React.useRef(limit ?? 12);
  const disabled = locked || typeof onChange !== 'function';
  const update = (key, value) => { if (!disabled) onChange(previous => ({ ...previous, [key]: value })); };
  return <AdventureSettingsSurface theme={theme}>
    <fieldset className="as-episode-mode" disabled={disabled} aria-describedby={id + '-hint'}>
      <legend>{label('episode_format', 'Episode format')}</legend>
      <div className="as-grid">
        <label className="as-option"><input type="radio" name={id + '-format'} checked={limit !== null} disabled={disabled} onChange={() => update('episodeTurnLimit', previousLength.current)} />{label('set_length', 'Set-length episode')}</label>
        <label className="as-option"><input type="radio" name={id + '-format'} checked={limit === null} disabled={disabled} onChange={() => { if (!disabled) { previousLength.current = limit ?? previousLength.current; update('episodeTurnLimit', null); } }} />{label('open', 'Open-ended')}</label>
      </div>
    </fieldset>
    <div className="as-grid">
      {limit !== null && <label className="as-field" htmlFor={id}>{label('length', 'Episode length')}
        <select className="as-control" aria-label={label('length', 'Episode length')} id={id} value={String(limit)} disabled={disabled} onChange={e => { previousLength.current = Number(e.target.value); update('episodeTurnLimit', previousLength.current); }}>
          <option value="6">{label('short', 'Short · 6 decisions')}</option><option value="12">{label('standard', 'Standard · 12 decisions')}</option><option value="20">{label('long', 'Long · 20 decisions')}</option>
          {limit != null && ![6, 12, 20].includes(limit) && <option value={String(limit)}>{limit} {label('decisions', 'decisions')}</option>}
        </select>
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
        <input className="as-control" aria-label={label('earliest_finale', 'Earliest finale round (open-ended)')} id={id + '-earliest'} type="number" min="3" max="50" value={state.climaxMinTurns || 20} disabled={disabled} onChange={e => update('climaxMinTurns', Math.max(3, Math.min(50, Number(e.target.value) || 20)))} />
        <span className="as-help">{label('open_finale_hint', 'The finale also waits for sufficient story progress.')}</span>
      </label>}
    </>}
  </AdventureSettingsSurface>;
}

function AdventureSetupFields(props) {
  const state = props.adventureState || {};
  const settings = props.studentProjectSettings || {};
  const permissions = settings.adventurePermissions || {};
  const label = (key, fallback) => adventureSetupText(props.t, key, fallback);
  const id = props.idPrefix || 'adventure-setup';
  const locked = permission => adventureSetupLocked(props, permission);
  const change = (setter, value, permission) => { if (!locked(permission) && typeof props[setter] === 'function') props[setter](value); };
  const toggle = (field, setter, title, help, permission, extraDisabled = false) => typeof props[setter] === 'function' && <label className="as-check">
    <input type="checkbox" checked={!!props[field]} disabled={locked(permission) || extraDisabled} onChange={e => change(setter, e.target.checked, permission)} />
    <span>{title}{help && <span className="as-help">{help}</span>}</span>
  </label>;
  const field = (key, title, value, setter, options, permission, help) => <label className="as-field" htmlFor={id + '-' + key}>{title}
    <select className="as-control" aria-label={title} aria-describedby={help ? id + '-' + key + '-help' : undefined} id={id + '-' + key} value={value} disabled={locked(permission) || typeof props[setter] !== 'function'} onChange={e => change(setter, e.target.value, permission)}>
      {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
    </select>{help && <span className="as-help" id={id + '-' + key + '-help'}>{help}</span>}
  </label>;
  const modes = [['choice', label('adventure.mode_choice', 'Standard Adventure Mode')], ['debate', label('adventure.mode_debate', 'Debate')], ['system', label('adventure.mode_system', 'Systems simulation')]];
  const languages = Array.from(new Set((props.selectedLanguages || []).filter(lang => lang !== 'English')));
  const languageOptions = [['English', label('adventure.lang_options.english_only', 'English only')], ...languages.flatMap(lang => [[lang, lang], [lang + ' + English', lang + ' · ' + label('with_translation', 'with translation')]])];
  if (languages.length > 1) languageOptions.push(['All + English', languages.join(', ') + ' · ' + label('with_translation', 'with translation')]);
  // Preserve a saved selection even if the teacher's current language list differs.
  if (props.adventureLanguageMode && !languageOptions.some(option => option[0] === props.adventureLanguageMode)) languageOptions.push([props.adventureLanguageMode, props.adventureLanguageMode]);
  const resourceMode = props.factionResourceMode === 'manual' ? 'manual' : 'ai';
  const setResourceMode = value => {
    if (locked()) return;
    if (typeof props.setFactionResourceMode === 'function') props.setFactionResourceMode(value);
    else { const handler = value === 'manual' ? props.handleSetFactionResourceModeToManual : props.handleSetFactionResourceModeToAi; if (typeof handler === 'function') handler(); }
  };
  const editResources = update => { if (!locked() && typeof props.setAdventureState === 'function') props.setAdventureState(previous => ({ ...previous, systemResources: update(previous.systemResources || []) })); };
  const supports = typeof props.setAdventureAutoRead === 'function' || typeof props.setAdventureTypingPaceEnabled === 'function' || typeof props.setAdventureFluencyEnabled === 'function';
  const hasCloud = typeof props.setIsAdventureCloudEnabled === 'function';
  const permissionToggle = (key, title, help) => props.isTeacherMode && typeof props.setStudentProjectSettings === 'function' && <label className="as-check">
    <input type="checkbox" checked={permissions[key] === true} disabled={locked()} onChange={e => { const checked = e.target.checked; if (!locked()) props.setStudentProjectSettings(previous => ({ ...previous, adventurePermissions: { ...previous.adventurePermissions, [key]: checked } })); }} />
    <span>{title}<span className="as-help">{help}</span></span>
  </label>;
  const limit = adventureSetupLimit(state);
  const onOff = value => label(value ? 'common.on' : 'common.off', value ? 'On' : 'Off');
  return <AdventureSettingsSurface theme={props.theme} compact={props.compact}>
    {!props.isTeacherMode && <p className="as-notice">{permissions.lockAllSettings
      ? label('student_locked_hint', 'Your teacher has fixed this setup. You can review the settings and start your adventure.')
      : label('student_edit_hint', 'You can adjust the settings your teacher allows. Unavailable controls are set by your teacher.')}</p>}
    <section className="as-box" aria-labelledby={id + '-essential-heading'}>
      <h3 id={id + '-essential-heading'} className="as-title">{label('essential_setup', 'Essential setup')}</h3>
      <div className="as-grid">
        {field('input-mode', label('adventure.interaction_mode', 'Interaction mode'), props.adventureInputMode || 'choice', 'setAdventureInputMode', modes, 'allowModeSwitch')}
        {languageOptions.length > 1 && field('language', label('adventure.language_label', 'Adventure language'), props.adventureLanguageMode || 'English', 'setAdventureLanguageMode', languageOptions, 'allowLanguageSwitch', label('translation_hint', 'Story language follows this control; the translation language follows Universal Settings.'))}
        <label className="as-field" htmlFor={id + '-response'}>{label('response_format', 'Student responses')}
          <select aria-label={label('response_format', 'Student responses')} id={id + '-response'} className="as-control" value={props.adventureFreeResponseEnabled ? 'written' : 'choice'} disabled={locked('freeResponse') || typeof props.setAdventureFreeResponseEnabled !== 'function'} onChange={e => change('setAdventureFreeResponseEnabled', e.target.value === 'written', 'freeResponse')}>
            <option value="choice">{label('response_choices', 'Choose from suggestions')}</option><option value="written">{label('response_written', 'Write or dictate')}</option>
          </select>
        </label>
      </div>
      {props.isTeacherMode && languageOptions.length === 1 && typeof props.openUniversalSettings === 'function' && <button type="button" className="as-button" style={{ marginTop: 12 }} disabled={locked()} onClick={() => { if (!locked()) props.openUniversalSettings('languages'); }}>{label('add_languages', 'Add languages in Universal Settings')}</button>}
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
          {resourceMode === 'manual' && <div>
            {(state.systemResources || []).map((resource, index) => <div className="as-resource" key={index}>
              <div className="as-grid">{[['name', label('resource_name', 'Resource name'), 'text'], ['quantity', label('resource_quantity', 'Starting value'), 'number'], ['unit', label('resource_unit', 'Unit'), 'text']].map(([key, title, type]) => <label className="as-field" key={key} htmlFor={id + '-resource-' + index + '-' + key}>{title} {index + 1}
                <input id={id + '-resource-' + index + '-' + key} className="as-control" type={type} min={type === 'number' ? 0 : undefined} value={resource[key] ?? ''} disabled={locked()} onChange={e => { const value = type === 'number' ? Math.max(0, Number(e.target.value) || 0) : e.target.value; editResources(rows => rows.map((row, i) => i === index ? { ...row, [key]: value } : row)); }} />
              </label>)}</div>
              <button type="button" className="as-button" style={{ marginTop: 10 }} disabled={locked()} onClick={() => editResources(rows => rows.filter((_, i) => i !== index))}>{label('remove_resource', 'Remove resource')} {index + 1}</button>
            </div>)}
            <button type="button" className="as-button" style={{ marginTop: 12 }} disabled={locked()} onClick={() => editResources(rows => [...rows, { name: '', icon: '🔹', quantity: 50, unit: '%', type: 'strategic' }])}>{label('adventure.add_state_variable', 'Add resource')}</button>
          </div>}
        </>}
      </div>}
    </section>
    {supports && <AdventureSettingSection title={label('learning_supports', 'Learning supports')} summary={label('reading_practice', 'Reading practice') + ': ' + onOff(props.adventureFluencyEnabled)}>
      {typeof props.setAdventureAutoRead === 'function' && <label className="as-check"><input type="checkbox" checked={!!props.adventureAutoRead} disabled={locked()} onChange={e => { change('setAdventureAutoRead', e.target.checked); if (!e.target.checked && typeof props.stopPlayback === 'function') props.stopPlayback(); }} />{label('auto_read_setup', 'Read each scene automatically')}</label>}
      {toggle('adventureFluencyEnabled', 'setAdventureFluencyEnabled', label('adventure.fluency_setting_label', 'Scene reading practice'), label('adventure.fluency_setting_desc', 'Offer an optional microphone button for practising the current passage.'))}
      {props.adventureFreeResponseEnabled && toggle('adventureTypingPaceEnabled', 'setAdventureTypingPaceEnabled', label('adventure.typing_pace_label', 'Typing pace'), label('adventure.typing_pace_desc', 'Descriptive pace and word count for written responses. Never affects points or grades.'))}
    </AdventureSettingSection>}
    <AdventureSettingSection title={label('story_rules', 'Story & game rules')} summary={label('adventure.chance_mode_label', 'Chance') + ': ' + onOff(props.adventureChanceMode)}>
      {field('difficulty', label('energy_rewards', 'Energy & rewards'), props.adventureDifficulty || 'Normal', 'setAdventureDifficulty', [['Story', label('adventure.diff_story_option', 'Story')], ['Normal', label('adventure.diff_normal_option', 'Normal')], ['Hard', label('adventure.diff_hard_option', 'Hard')], ['Hardcore', label('adventure.diff_hardcore_option', 'Hardcore')]], 'allowDifficultySwitch', label('difficulty_' + (props.adventureDifficulty || 'Normal'), { Story: 'Half energy loss; 1.5× XP. Reasoning expectations follow the lesson.', Normal: 'Standard energy loss and XP. Reasoning expectations follow the lesson.', Hard: '1.5× energy loss; 0.75× XP. Success thresholds stay the same.', Hardcore: '2.5× energy loss; 0.5× XP. Success thresholds stay the same.' }[props.adventureDifficulty || 'Normal']))}
      {toggle('isAdventureStoryMode', 'setIsAdventureStoryMode', label('adventure.story_mode_label', 'Peaceful mode'), label('adventure.story_mode_desc', 'Focus on exploration and puzzles.'))}
      {toggle('adventureChanceMode', 'setAdventureChanceMode', label('adventure.chance_mode_label', 'Chance mode'), label('adventure.chance_mode_desc', 'Chance rolls influence the story outcome.'))}
      {toggle('isSocialStoryMode', 'setIsSocialStoryMode', label('adventure.social_story_mode_label', 'Social scenario mode'), label('social_mode_hint', 'Show a target social skill in Essential setup.'))}
    </AdventureSettingSection>
    <AdventureSettingSection title={label('visual_settings', 'Visuals')} summary={label('adventure.art_style_label', 'Art style') + ': ' + label('adventure.art_' + (props.adventureArtStyle || 'auto'), props.adventureArtStyle || 'Auto')}>
      {field('art-style', label('adventure.art_style_label', 'Art style'), props.adventureArtStyle || 'auto', 'setAdventureArtStyle', ['universal', 'auto', 'storybook', 'pixel', 'cinematic', 'anime', 'crayon', 'custom'].map(value => [value, label('adventure.art_' + value, { universal: 'Use Universal style', auto: 'Auto', storybook: 'Storybook', pixel: 'Pixel art', cinematic: 'Cinematic', anime: 'Anime', crayon: 'Hand-drawn', custom: 'Custom' }[value])]), 'allowVisualsToggle')}
      {props.adventureArtStyle === 'universal' && <p className="as-help">{props.universalImageStyle || label('universal_style_empty', 'No Universal style is set; Adventure will use its automatic style.')}</p>}
      {props.adventureArtStyle === 'custom' && <label className="as-field" htmlFor={id + '-custom-art'}>{label('custom_art', 'Custom art style')}<input id={id + '-custom-art'} className="as-control" value={props.adventureCustomArtStyle || ''} disabled={locked('allowVisualsToggle')} onChange={e => change('setAdventureCustomArtStyle', e.target.value, 'allowVisualsToggle')} /></label>}
      {toggle('adventureConsistentCharacters', 'setAdventureConsistentCharacters', label('adventure.consistent_characters_label', 'Consistent characters'), label('adventure.consistent_characters_desc', 'Keep character appearances consistent across scenes.'))}
      {toggle('useLowQualityVisuals', 'setUseLowQualityVisuals', label('adventure.low_quality_label', 'Faster, simpler visuals'), label('adventure.low_quality_desc', 'Faster generation, less data.'), 'allowVisualsToggle')}
    </AdventureSettingSection>
    <AdventureSettingSection title={label('story_guidance', 'Story guidance')} summary={props.adventureCustomInstructions?.trim() ? label('guidance_added', 'Custom instructions added') : label('guidance_empty', 'No custom instructions')}>
      <label className="as-field" htmlFor={id + '-custom-instructions'}>{label('input.custom_instructions', 'Custom instructions')}
        <textarea id={id + '-custom-instructions'} className="as-control" value={props.adventureCustomInstructions || ''} disabled={locked('allowCustomInstructions')} onChange={e => change('setAdventureCustomInstructions', e.target.value, 'allowCustomInstructions')} placeholder={label('adventure.placeholder_custom', 'Add guidance for this adventure.')} />
      </label>
    </AdventureSettingSection>
    {(hasCloud || (props.isTeacherMode && props.setStudentProjectSettings)) && <AdventureSettingSection title={label('saving_permissions', 'Saving & permissions')} summary={label('cloud_images', 'Cloud images') + ': ' + onOff(props.isAdventureCloudEnabled)}>
      {hasCloud && (props.isTeacherMode || permissions.allowCloudImageStorage === true) && <label className="as-check">
        <input type="checkbox" checked={!!props.isAdventureCloudEnabled} disabled={locked('allowCloudImageStorage')} onChange={e => { if (locked('allowCloudImageStorage')) return; change('setIsAdventureCloudEnabled', e.target.checked, 'allowCloudImageStorage'); if (typeof props.safeSetItem === 'function') props.safeSetItem('allo_adventure_cloud', e.target.checked ? 'true' : 'false'); }} />
        <span>{label('adventure.cloud_storage_label', 'Cloud image storage')}<span className="as-help">{label('adventure.cloud_storage_desc', 'Store generated images online.')}</span></span>
      </label>}
      {props.adventureFreeResponseEnabled && props.isAdventureCloudEnabled && (props.isTeacherMode || permissions.allowCloudImageStorage) && <p className="as-notice">{label('adventure.pii_warning_desc', 'Avoid including personal information in written responses when cloud image storage is enabled.')}</p>}
      {permissionToggle('lockAllSettings', label('adventure.lock_settings_label', 'Lock student settings'), label('adventure.lock_settings_desc', 'Keep the adventure setup fixed for students.'))}
      {permissionToggle('allowCloudImageStorage', label('adventure.allow_cloud_storage_label', 'Allow cloud image storage'), label('adventure.allow_cloud_storage_desc', 'Allow students to store generated images online.'))}
    </AdventureSettingSection>}
    <div className="as-summary" role="region" aria-label={label('setup_summary', 'Setup summary')}>
      <strong>{label('setup_summary', 'Setup summary')}: </strong>{modes.find(option => option[0] === props.adventureInputMode)?.[1] || modes[0][1]}{' · '}
      {limit == null ? label('open', 'Open-ended') : limit + ' ' + label('decisions', 'decisions')}{' · '}
      {props.adventureFreeResponseEnabled ? label('response_written', 'Write or dictate') : (state.choiceCount || 6) + ' ' + label('suggested_choices', 'suggested choices')}{' · '}
      {languageOptions.find(option => option[0] === props.adventureLanguageMode)?.[1] || props.adventureLanguageMode || languageOptions[0][1]}
    </div>
  </AdventureSettingsSurface>;
}

