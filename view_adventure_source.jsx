
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
  return Math.max(0, Math.floor(typeof recorded === 'number' && Number.isFinite(recorded)
    ? recorded : (Number.isFinite(legacyTurn) ? legacyTurn : 1) - 1));
}

function AdventureDecisionProgress({ state, t, theme, immersive = false }) {
  const completed = adventureDecisionCount(state);
  const bounded = value => Math.max(3, Math.min(50, Math.round(Number(value) || 20)));
  const limit = Object.prototype.hasOwnProperty.call(state, 'episodeTurnLimit')
    ? (state.episodeTurnLimit == null ? null : bounded(state.episodeTurnLimit))
    : (state.enableAutoClimax ? null : bounded(state.climaxMinTurns));
  const label = adventureSettingsText(t, 'episode_progress', 'Episode progress');
  const detail = completed + ' ' + adventureSettingsText(t, 'decisions_completed', 'completed') + ' · ' +
    (state.isGameOver ? adventureSettingsText(t, 'episode_ended', 'Episode ended')
      : limit == null ? adventureSettingsText(t, 'open', 'Open-ended')
      : Math.max(0, limit - completed) + ' ' + adventureSettingsText(t, 'decisions_remaining', 'remaining'));
  return <div data-adventure-progress style={adventureVisualTokens(theme, immersive)} className="mb-3 text-[var(--av-muted)]">
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs leading-relaxed">
      <span className="font-bold text-[var(--av-ink)]">{label}</span>
      <span className="tabular-nums">{detail}</span>
    </div>
    {limit != null && <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={limit}
      aria-valuenow={Math.min(limit, completed)} aria-valuetext={detail}
      className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--av-wash)] border border-[var(--av-control)]">
      <div className="h-full rounded-full bg-[var(--av-accent)]" style={{ width: Math.min(100, completed / limit * 100) + '%' }} />
    </div>}
  </div>;
}

function AdventureProfileMark({ profile = 'guided', className = '' }) {
  return <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>
    <circle cx="32" cy="32" r="29" fill="currentColor" fillOpacity=".08" stroke="none"/>
    {profile === 'debate' ? <>
      <path d="M10 15h29a5 5 0 0 1 5 5v14a5 5 0 0 1-5 5H22l-9 7v-7a5 5 0 0 1-5-5V20a5 5 0 0 1 2-5Z" fill="currentColor" fillOpacity=".08"/>
      <path d="M29 43h14l9 6v-7a5 5 0 0 0 4-5V26a5 5 0 0 0-5-5M17 24h17M17 31h11"/>
      <circle cx="46" cy="13" r="2" fill="currentColor" stroke="none"/>
    </> : profile === 'systems' ? <>
      <path d="M18 18h28v28H18Z" strokeDasharray="3 4"/>
      <circle cx="18" cy="18" r="5" fill="currentColor" fillOpacity=".18"/><circle cx="46" cy="18" r="5"/><circle cx="46" cy="46" r="5" fill="currentColor" fillOpacity=".18"/><circle cx="18" cy="46" r="5"/>
      <path d="M32 21c-3 5-8 9-8 14a8 8 0 0 0 16 0c0-5-5-9-8-14Z" fill="currentColor" fillOpacity=".1"/><path d="M28 36c0 2 1 3 3 3"/>
    </> : profile === 'social' ? <>
      <circle cx="21" cy="25" r="6"/><circle cx="43" cy="25" r="6"/>
      <path d="M9 48v-4a12 12 0 0 1 24 0v4M33 48v-4a12 12 0 0 1 22 0v4M26 13c4-4 8-4 12 0M30 13h-4V9"/>
      <path d="m26 46 6 5 7-6" fill="currentColor" fillOpacity=".1"/>
    </> : <>
      <path d="m6 43 14-19 12 15 9-11 17 21" fill="currentColor" fillOpacity=".1"/>
      <path d="M26 58c22-8 15-14 5-15s-10-6 1-11" strokeDasharray="3 3"/>
      <circle cx="43" cy="14" r="5"/><path d="M18 13v6M15 16h6"/>
    </>}
  </svg>;
}


function adventureEpisodeDepleted(state) {
  const energy = state.energy == null || state.energy === '' ? NaN : Number(state.energy);
  return Number.isFinite(energy) && energy <= 0 && !state.canStartSequel;
}

function AdventureEpisodeRecap({ state, t, theme, immersive = false, mode, social,
  minimumXP, isProcessing, onExport, onSequel, canContinue = true }) {
  if (!state.isGameOver) return null;
  const label = (key, fallback) => adventureSettingsText(t, 'recap_' + key, fallback);
  const _isDefeat = adventureEpisodeDepleted(state);
  const completed = adventureDecisionCount(state);
  const level = Number(state.level);
  const xp = Number.isFinite(Number(state.xp)) ? Math.max(0, Number(state.xp)) : 0;
  const threshold = Number.isFinite(Number(minimumXP)) ? Math.max(0, Number(minimumXP)) : 0;
  const concepts = Array.from(new Map((Array.isArray(state.stats?.conceptsFound) ? state.stats.conceptsFound : [])
    .filter(value => typeof value === 'string' && value.trim())
    .map(value => [value.trim().toLocaleLowerCase(), value.trim()])).values());
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
  return <section data-adventure-recap aria-label={label('title', 'Episode recap')} style={adventureVisualTokens(theme, immersive)}
    className="w-full max-w-4xl rounded-3xl border border-[var(--av-line)] border-t-[3px] border-t-[var(--av-accent)] bg-[var(--av-surface)] p-4 sm:p-6 text-[var(--av-ink)] shadow-[var(--av-shadow)] min-w-0 [overflow-wrap:anywhere] space-y-4">
    <div className="flex items-start gap-3">
      <AdventureProfileMark profile={profile} className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 text-[var(--av-accent)]" />
      <div className="min-w-0">
        <p className="text-xs font-bold text-[var(--av-accent)] mb-1">{state.canStartSequel
          ? label('chapter_complete', 'Chapter complete') : label('ended', 'Episode ended')}</p>
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight">{label('title', 'Episode recap')}</h3>
      </div>
    </div>
    <p role="status" aria-live="polite" aria-atomic="true" className="text-sm leading-relaxed text-[var(--av-muted)]">{_isDefeat
      ? (mode === 'system' ? label('stability_depleted', 'Stability reached zero. Use what happened to plan your next attempt.')
        : label('energy_depleted', 'Out of energy — the journey ends here. Every attempt teaches something!'))
      : label('review_intro', 'Look back at your decisions, then take one useful idea into your next adventure.')}</p>
    <dl className="grid grid-cols-2 gap-3">
      <div className="rounded-xl border border-[var(--av-line)] bg-[var(--av-wash)] p-3">
        <dt className="text-xs leading-relaxed text-[var(--av-muted)]">{label('decisions', 'Decisions completed')}</dt>
        <dd className="mt-1 text-2xl font-bold tabular-nums">{completed}</dd>
      </div>
      <div className="rounded-xl border border-[var(--av-line)] bg-[var(--av-wash)] p-3">
        <dt className="text-xs leading-relaxed text-[var(--av-muted)]">{label('level', 'Story level reached')}</dt>
        <dd className="mt-1 text-2xl font-bold tabular-nums">{Number.isFinite(level) && level > 0 ? Math.floor(level) : '—'}</dd>
      </div>
    </dl>
    <details className="border-y border-[var(--av-line)]">
      <summary className="min-h-11 py-3 cursor-pointer text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] rounded-lg">
        {label('concepts', 'Concepts to revisit')} <span className="text-[var(--av-muted)] tabular-nums">({concepts.length})</span>
      </summary>
      {concepts.length ? <>
        <p className="text-xs leading-relaxed text-[var(--av-muted)] mb-3">{label('concepts_hint', 'Check these ideas against the lesson, then explain one in your own words.')}</p>
        <ul className="flex flex-wrap gap-2 pb-3">{concepts.map(concept => <li key={concept.toLocaleLowerCase()} className="max-w-full rounded-xl border border-[var(--av-line)] bg-[var(--av-wash)] px-3 py-2 text-xs font-semibold">{concept}</li>)}</ul>
      </> : <p className="text-xs leading-relaxed text-[var(--av-muted)] pb-3">{label('no_concepts', 'Use your journey notebook to choose one idea worth revisiting.')}</p>}
    </details>
    <div className="rounded-xl border-l-[3px] border-[var(--av-accent)] bg-[var(--av-wash)] p-3">
      <p className="text-xs font-bold text-[var(--av-accent)] mb-2">{label('reflect', 'Take one idea with you')}</p>
      <p className="text-sm leading-relaxed">{label(prompt[0], prompt[1])}</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {state.canStartSequel && canContinue && typeof onSequel === 'function' && <button type="button"
        onClick={onSequel} disabled={busy} className={buttonClass}>
        <Sparkles size={17} aria-hidden="true" /><span>{t('adventure.start_sequel')}</span>
      </button>}
      {xp >= threshold && typeof onExport === 'function' ? <button type="button"
        onClick={onExport} disabled={busy} aria-busy={isProcessing || undefined} className={buttonClass}>
        {isProcessing ? <RefreshCw size={17} aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : <BookOpen size={17} aria-hidden="true" />}
        <span>{isProcessing ? t('adventure.storybook_writing') : t('adventure.storybook')}</span>
      </button> : xp < threshold ? <p className="text-xs leading-relaxed text-[var(--av-muted)] flex items-start gap-2 py-2">
        <Lock size={15} className="shrink-0 mt-0.5" aria-hidden="true" />
        <span>{t('adventure.storybook_locked', { needed: Math.max(0, threshold - xp) })}</span>
      </p> : null}
    </div>
    {state.canStartSequel && !canContinue && <p className="text-xs leading-relaxed text-[var(--av-muted)]">{label('teacher_continues', 'Your teacher can continue the story with the class.')}</p>}
  </section>;
}

function AdventureLearningProfiles(props) {
  const { adventureState: state, t, setAdventureState } = props;
  const dark = props.theme === 'dark' || props.theme === 'contrast';
  const contrast = props.theme === 'contrast';
  const accents = { guided: ['#047857', '#a7f3d0', '#ecfdf5'], debate: ['#0369a1', '#7dd3fc', '#f0f9ff'], systems: ['#92400e', '#fcd34d', '#fffbeb'], social: ['#6d28d9', '#c4b5fd', '#f5f3ff'] };
  if (!props.isTeacherMode || typeof setAdventureState !== 'function') return null;
  const profiles = [
    { id: 'guided', title: 'Guided Story', detail: '12 decisions · 3 choices · peaceful exploration', mode: 'choice', free: false, peaceful: true, social: false, difficulty: 'Story', turns: 12, choices: 3 },
    { id: 'debate', title: 'Evidence Debate', detail: '12 decisions · write or dictate · compare evidence', mode: 'debate', free: true, peaceful: true, social: false, difficulty: 'Normal', turns: 12, choices: 3 },
    { id: 'systems', title: 'Systems Challenge', detail: '20 decisions · 4 choices · resource tradeoffs', mode: 'system', free: false, peaceful: true, social: false, difficulty: 'Normal', turns: 20, choices: 4 },
    { id: 'social', title: 'Social Practice', detail: '12 decisions · 4 choices · perspectives and repair', mode: 'choice', free: false, peaceful: true, social: true, difficulty: 'Story', turns: 12, choices: 4 }
  ];
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
    setAdventureState(previous => ({ ...previous, episodeTurnLimit: profile.turns, enableAutoClimax: true, choiceCount: profile.choices, learningProfile: profile.id }));
  };
  return <section aria-label={adventureSettingsText(t, 'profiles', 'Learning profiles')} style={adventureVisualTokens(props.theme)} className="mb-5 rounded-3xl border border-[var(--av-line)] bg-[var(--av-surface)] p-4 sm:p-5 text-[var(--av-ink)] shadow-[var(--av-shadow)]">
    <p className="font-bold text-sm tracking-wide">{adventureSettingsText(t, 'profiles', 'Learning profiles')}</p>
    <p className="text-xs text-[var(--av-muted)] leading-relaxed mt-1 mb-4 max-w-2xl">{adventureSettingsText(t, 'profiles_hint', 'Choose a starting experience, then adjust the settings below. Your lesson, language and custom instructions stay in place.')}</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {profiles.map(profile => {
        const active = state.learningProfile === profile.id && props.adventureInputMode === profile.mode && props.adventureFreeResponseEnabled === profile.free && props.adventureDifficulty === profile.difficulty && !props.adventureChanceMode && props.isAdventureStoryMode === profile.peaceful && props.isSocialStoryMode === profile.social && state.episodeTurnLimit === profile.turns && state.enableAutoClimax && state.choiceCount === profile.choices && !!props.enableFactionResources === (profile.mode === 'system');
        const colors = accents[profile.id];
        const accent = contrast ? '#fde047' : colors[dark ? 1 : 0];
        return <button type="button" key={profile.id} aria-pressed={state.learningProfile === profile.id} disabled={state.isLoading || !!state.currentScene} onClick={() => apply(profile)} style={{ '--av-profile': accent, borderColor: active ? accent : undefined, backgroundColor: active ? (dark ? 'var(--av-wash)' : colors[2]) : 'var(--av-surface)' }} className="group relative min-h-24 min-w-0 flex items-center gap-3 rounded-2xl border-2 border-[var(--av-line)] p-3 sm:p-4 text-left hover:border-[var(--av-profile)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 transition-[border-color,box-shadow] motion-reduce:transition-none disabled:opacity-50">
          <span style={{ color: accent }} className="shrink-0"><AdventureProfileMark profile={profile.id} className="w-12 h-12 sm:w-14 sm:h-14"/></span>
          <span className="block min-w-0 pr-2">
            <span className="block text-sm font-bold leading-snug">{adventureSettingsText(t, 'profile_' + profile.id, profile.title)}</span>
            <span className="block mt-1.5 text-xs leading-relaxed text-[var(--av-muted)]">{adventureSettingsText(t, 'profile_' + profile.id + '_detail', profile.detail)}</span>
          </span>
          {state.learningProfile === profile.id && !active && <span className="block text-xs font-semibold text-[var(--av-muted)]">{adventureSettingsText(t, 'customized', 'Customized')}</span>}
          {active && <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false" className="absolute right-2 top-2 h-4 w-4 text-[var(--av-profile)]" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m4 10 4 4 8-8"/></svg>}
        </button>;
      })}
    </div>
  </section>;
}

function AdventureConsequenceCard({ consequence, t, immersive = false, theme = 'light' }) {
  if (!consequence || consequence.version !== 1) return null;
  var label = function (key, fallback) { var value = t('adventure.debrief.' + key); return value && value !== 'adventure.debrief.' + key ? value : fallback; };
  var ratings = { strategic_success: ['effective', 'Effective strategy'], partial_success: ['partial', 'Partly supported strategy'], misconception: ['revisit', 'Reasoning to revisit'], neutral: ['unrated', 'Strategy not rated'] };
  var rating = ratings[consequence.reasoning] || ratings.neutral;
  var changes = (Array.isArray(consequence.changes) ? consequence.changes : []).filter(function (c) { return c && Number.isFinite(c.before) && Number.isFinite(c.after); }).slice(0, 12);
  var concepts = (Array.isArray(consequence.concepts) ? consequence.concepts : []).filter(function (c) { return typeof c === 'string'; }).slice(0, 6);
  return (
    <section aria-label={label('title', 'Decision debrief')} style={adventureVisualTokens(theme, immersive)} className="not-italic rounded-2xl border border-[var(--av-line)] border-t-[3px] border-t-[var(--av-accent)] bg-[var(--av-surface)] p-4 space-y-4 min-w-0 break-words text-[var(--av-ink)] shadow-[var(--av-shadow)]">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-[11px] uppercase tracking-wider font-bold text-[var(--av-accent)]`}>{label('title', 'Decision debrief')}</span>
        <span className={`rounded-full px-2 py-1 text-xs font-semibold bg-[var(--av-wash)] text-[var(--av-ink)] border border-[var(--av-line)]`}>{label(rating[0], rating[1])}</span>
      </div>
      {typeof consequence.explanation === 'string' && consequence.explanation && <p className="text-sm leading-relaxed whitespace-pre-wrap">{consequence.explanation.slice(0, 1800)}</p>}
      <div>
        <p className="text-xs font-bold mb-3 text-[var(--av-muted)]">{label('changes', 'Recorded story changes')}</p>
        {changes.length > 0 ? <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {changes.map(function (change, index) { return <div key={index} className="rounded-xl border border-[var(--av-line)] bg-[var(--av-wash)] px-3 py-3 min-w-0">
            <dt className="text-xs text-[var(--av-muted)] mb-1">{typeof change.key === 'string' && (change.key.startsWith('resource:') || change.key.startsWith('inventory:')) ? String(change.label || '').slice(0, 80) : label('metric_' + change.key, String(change.label || '').slice(0, 80))}</dt>
            <dd className="tabular-nums flex flex-wrap items-baseline gap-x-2 gap-y-1"><span className="text-sm text-[var(--av-muted)]">{change.before}</span><span className="text-[var(--av-accent)]" aria-label={label('to', 'to')}>→</span><strong className="text-lg leading-tight">{change.after}</strong>{change.unit && <span className="text-xs text-[var(--av-muted)]">{String(change.unit).slice(0, 30)}</span>}</dd>
          </div>; })}
        </dl> : <p className="text-xs">{label('no_changes', 'No tracked values changed this turn.')}</p>}
      </div>
      <p className={`text-xs leading-relaxed text-[var(--av-muted)]`}>
        {label('ai_note', 'Strategy feedback is AI guidance, not a grade.')}
        {consequence.chanceMode && <> {Number.isFinite(consequence.chanceRoll) && <strong>{label('die', 'Chance die')}: {consequence.chanceRoll}/20. </strong>}{label('chance_note', 'Chance can change the story result without changing the quality of your reasoning.')}</>}
      </p>
      {(consequence.choice || concepts.length > 0 || consequence.learningFeedback) && <details className={`border-t pt-2 border-[var(--av-line)]`}>
        <summary className={`cursor-pointer text-xs font-semibold min-h-8 py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${immersive || theme === 'dark' || theme === 'contrast' ? 'focus-visible:outline-cyan-300' : 'focus-visible:outline-teal-800'}`}>{label('reflect', 'Review your decision')}</summary>
        {typeof consequence.choice === 'string' && <p className="text-sm mt-3 whitespace-pre-wrap border-l-2 border-[var(--av-accent)] pl-3 leading-relaxed">{consequence.choice.slice(0, 1200)}</p>}
        {concepts.length > 0 && <p className="text-xs mt-2"><strong>{label('concepts', 'Concepts to check')}: </strong>{concepts.join(' · ')}</p>}
        <div className="mt-4 grid grid-cols-1 gap-2">{Object.entries(consequence.learningFeedback || {}).filter(([key, value]) => ['evidence', 'reasoning', 'counterpoint', 'immediate', 'delayed', 'tradeoff'].includes(key) && typeof value === 'string').map(([key, value]) => <p key={key} className="text-xs leading-relaxed rounded-xl border border-[var(--av-line)] bg-[var(--av-wash)] p-3"><strong className="block mb-1">{label('feedback_' + key, { evidence: 'Evidence', reasoning: 'Reasoning', counterpoint: 'Counterargument / next step', immediate: 'Immediate effect', delayed: 'Possible delayed effect', tradeoff: 'Tradeoff' }[key])}: </strong><span>{value.slice(0, 360)}</span></p>)}</div>
        {consequence.mode === 'system' && <p className="text-xs mt-2">{label('forecast_note', 'AI scenario estimates. Delayed effects are predictions, not scheduled changes; check the lesson evidence.')}</p>}
        <p className="text-xs mt-2">{label('next', 'Which part of your reasoning would you keep or change next time?')}</p>
      </details>}
    </section>
  );
}



function AdventureHistoryEntry({ entry, t, theme, immersive = false, renderFormattedText }) {
  if (!entry || typeof entry !== 'object') return null;
  if (entry.type === 'feedback' && entry.consequence?.version === 1) {
    return <AdventureConsequenceCard consequence={entry.consequence} t={t} theme={theme} immersive={immersive} />;
  }
  const choice = entry.type === 'choice';
  const label = choice ? adventureSettingsText(t, 'journal_choice', 'Your decision')
    : entry.type === 'scene' ? adventureSettingsText(t, 'journal_scene', 'Story context')
    : entry.type === 'feedback' ? adventureSettingsText(t, 'journal_feedback', 'Feedback')
    : entry.type === 'assist' ? adventureSettingsText(t, 'journal_assist', 'Guiding Hand support')
    : adventureSettingsText(t, 'journal_note', 'Story note');
  return <article aria-label={label} style={adventureVisualTokens(theme, immersive)}
    className={'rounded-2xl border bg-[var(--av-surface)] p-4 min-w-0 [overflow-wrap:anywhere] text-[var(--av-ink)] ' +
      (choice ? 'border-[var(--av-accent)] border-l-[3px]' : 'border-[var(--av-line)]')}>
    <p className="text-xs font-bold text-[var(--av-accent)] mb-2 flex items-center gap-2">
      {choice ? <MousePointerClick size={14} aria-hidden="true" /> : entry.type === 'scene' ? <BookOpen size={14} aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />}
      {label}
    </p>
    <div className={'text-sm leading-relaxed whitespace-pre-wrap ' + (entry.type === 'scene' ? 'font-serif' : '')}>
      {renderFormattedText(typeof entry.text === 'string' ? entry.text : '', !immersive, choice)}
    </div>
  </article>;
}

function adventureRecentHistory(history) {
  const entries = Array.isArray(history) ? history : [];
  let start = 0;
  entries.forEach((entry, index) => {
    if (entry?.type === 'scene') start = index + 1;
    else if (entry?.type === 'choice') start = index;
  });
  return entries.slice(start);
}

function AdventureJourneyNotebook({ history, t, theme, immersive = false, renderFormattedText }) {
  const notebookRef = React.useRef(null);
  const [expanded, setExpanded] = React.useState(false);
  const entries = (Array.isArray(history) ? history : []).filter(entry => entry && typeof entry === 'object');
  React.useEffect(() => {
    if (!entries.length) setExpanded(false);
  }, [entries.length]);
  if (!entries.length) return null;
  const label = adventureSettingsText(t, 'journal_title', 'Journey notebook');
  const decisions = entries.filter(entry => entry.type === 'choice').length;
  return <details ref={notebookRef} data-adventure-notebook style={adventureVisualTokens(theme, immersive)}
    onToggle={event => setExpanded(event.currentTarget.open)}
    className="rounded-2xl border border-[var(--av-line)] bg-[var(--av-surface)] text-[var(--av-ink)] min-w-0 shadow-[var(--av-shadow)]">
    <summary className="list-none cursor-pointer min-h-11 p-4 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] [&::-webkit-details-marker]:hidden">
      <span className="flex items-center gap-3">
        <span aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl border border-[var(--av-line)] bg-[var(--av-wash)] text-[var(--av-accent)] flex items-center justify-center"><History size={19} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">{label}</span>
          <span className="block text-xs text-[var(--av-muted)] mt-1">{adventureSettingsText(t, 'journal_decisions', 'Recorded decisions')}: <span className="tabular-nums">{decisions}</span></span>
        </span>
        <span aria-hidden="true" className="text-[var(--av-accent)] text-xl font-semibold w-5 text-center shrink-0">{expanded ? '−' : '+'}</span>
      </span>
    </summary>
    {expanded && <div className="px-4 pb-4">
      <p className="border-t border-[var(--av-line)] pt-3 pb-4 text-xs leading-relaxed text-[var(--av-muted)]">{adventureSettingsText(t, 'journal_hint', 'Follow the story, your decisions, and what changed. Use the lesson to check the feedback.')}</p>
      <ol aria-label={adventureSettingsText(t, 'journal_records', 'Story records')} className="ml-1 pl-4 border-l border-[var(--av-line)] space-y-3">
        {entries.map((entry, index) => <li key={index} className="relative min-w-0">
          <span aria-hidden="true" className="absolute -left-[21px] top-5 w-2 h-2 rounded-full bg-[var(--av-accent)]" />
          <AdventureHistoryEntry entry={entry} t={t} theme={theme} immersive={immersive} renderFormattedText={renderFormattedText} />
        </li>)}
      </ol>
      <button type="button" onClick={() => {
        if (!notebookRef.current) return;
        notebookRef.current.open = false;
        notebookRef.current.querySelector('summary')?.focus();
      }} className="mt-4 min-h-11 w-full rounded-xl border border-[var(--av-control)] bg-[var(--av-wash)] px-3 py-2 text-sm font-bold text-[var(--av-ink)] hover:bg-[var(--av-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)]">
        {adventureSettingsText(t, 'journal_close', 'Close notebook')}
      </button>
    </div>}
  </details>;
}

function useAdventureDialogFocus(isOpen, dialogRef, onClose) {
  var closeHandlerRef = React.useRef(onClose);
  closeHandlerRef.current = onClose;
  React.useEffect(function () {
    if (!isOpen) return undefined;
    var dialog = dialogRef.current;
    if (!dialog) return undefined;
    var previousFocus = document.activeElement;
    var getFocusable = function () { return Array.from(dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')); };
    (getFocusable()[0] || dialog).focus();
    var onKeyDown = function (event) {
      if (event.key === 'Escape') { event.preventDefault(); closeHandlerRef.current(); return; }
      if (event.key !== 'Tab') return;
      var focusable = getFocusable();
      if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
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
    setTick(function (value) { return value + 1; });
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
    setTick(function (value) { return value + 1; });
  }, []);
  var noteChange = React.useCallback(function (nextText, nativeEvent) {
    if (!enabled) return;
    var value = String(nextText || '');
    if (!value) { reset(); return; }
    if (!startedAtRef.current) startedAtRef.current = Date.now();
    var inputType = String(nativeEvent && nativeEvent.inputType || '');
    if (dictationActive || inputType === 'insertFromDictation' || inputType === 'insertFromSpeech') {
      assistedRef.current = 'dictation';
    } else if (inputType === 'insertFromPaste' || inputType === 'insertFromDrop' || inputType === 'insertFromYank') {
      assistedRef.current = 'paste';
    }
    setTick(function (value2) { return value2 + 1; });
  }, [dictationActive, enabled, reset]);

  React.useEffect(function () {
    if (!enabled || !text) return undefined;
    var timer = setInterval(function () { setTick(function (value) { return value + 1; }); }, 1000);
    return function () { clearInterval(timer); };
  }, [enabled, text]);
  React.useEffect(function () {
    if (!enabled || !text) reset();
  }, [enabled, text, reset]);
  React.useEffect(function () {
    if (!enabled) return undefined;
    var onVisibility = function () { if (document.hidden) pause(); else resume(); };
    document.addEventListener('visibilitychange', onVisibility);
    return function () { document.removeEventListener('visibilitychange', onVisibility); };
  }, [enabled, pause, resume]);

  var now = Date.now();
  var activeMs = startedAtRef.current
    ? Math.max(0, now - startedAtRef.current - pausedMsRef.current - (pausedAtRef.current ? now - pausedAtRef.current : 0))
    : 0;
  var charCount = Array.from(String(text || '')).length;
  var wordCount = String(text || '').trim() ? String(text).trim().split(/\s+/).length : 0;
  var wpm = activeMs > 0 && charCount > 0 ? Math.round((charCount / 5) / (activeMs / 60000)) : 0;
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
      streamRef.current.getTracks().forEach(function (track) { try { track.stop(); } catch (_) {} });
      streamRef.current = null;
    }
  }, []);
  var closePractice = React.useCallback(function () {
    if (status === 'processing') return;
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch (_) {}
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
  React.useEffect(function () { return stopTracks; }, [stopTracks]);
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
      reader.onloadend = function () { resolve(String(reader.result || '').split(',')[1] || ''); };
      reader.onerror = function () { reject(reader.error || new Error('Could not read the recording.')); };
      reader.readAsDataURL(blob);
    });
  };
  var startRecording = async function () {
    setError('');
    setResult(null);
    setSaved(false);
    if (!sceneText) { setError(t('adventure.fluency_no_scene') || 'There is no scene passage to read yet.'); return; }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError(t('adventure.fluency_microphone_unavailable') || 'Microphone recording is not available in this browser.');
      return;
    }
    try {
      if (typeof props.stopPlayback === 'function') props.stopPlayback();
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      var mimeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
      var mimeType = mimeCandidates.find(function (candidate) { return !MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported(candidate); }) || '';
      var recorder = mimeType ? new MediaRecorder(stream, { mimeType: mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = function (event) { if (event.data && event.data.size > 0) chunksRef.current.push(event.data); };
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
          resolve(new Blob(chunksRef.current, { type: type }));
        };
        recorder.onerror = function (event) { reject(event.error || new Error('Recording failed.')); };
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
        throw new Error(allowCloud
          ? (t('adventure.fluency_analysis_failed') || 'The reading could not be analyzed. Your recording was not saved.')
          : (t('adventure.fluency_local_unavailable') || 'On-device analysis is unavailable. Enable cloud analysis to use Google Gemini, or try again on a School Box device.'));
      }
      var passageMetadata = typeof fluency.createFluencyPassageMetadata === 'function'
        ? fluency.createFluencyPassageMetadata(captured.text, {
            passageId: 'adventure-' + String(captured.sceneId || captured.turnCount || Date.now()),
            title: 'Adventure scene ' + String(captured.turnCount || ''),
            grade: props.gradeLevel,
            language: captured.language,
            calibrated: false
          })
        : { passageId: 'adventure-' + String(captured.sceneId || captured.turnCount || Date.now()), calibrated: false };
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
        metrics: Object.assign({}, metrics, { durationSeconds: durationSeconds, totalWords: totalWords })
      });
      setStatus('complete');
    } catch (analysisError) {
      stopTracks();
      recorderRef.current = null;
      setError(analysisError && analysisError.message ? analysisError.message : (t('adventure.fluency_analysis_failed') || 'The reading could not be analyzed.'));
      setStatus('idle');
    }
  };
  var saveResult = async function () {
    if (!result || typeof props.onSave !== 'function' || saved) return;
    try {
      await props.onSave(result);
      setSaved(true);
    } catch (saveError) {
      setError(saveError && saveError.message ? saveError.message : (t('adventure.fluency_save_failed') || 'The reading result could not be saved.'));
    }
  };
  if (!open) return null;
  return (
    <div role="presentation" className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3" onMouseDown={(event) => { if (event.target === event.currentTarget && status !== 'recording' && status !== 'processing') closePractice(); }}>
      <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="adventure-fluency-title" aria-describedby="adventure-fluency-description" className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-rose-200 bg-white p-5 shadow-2xl focus:outline-none">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="adventure-fluency-title" className="text-xl font-black text-slate-900 flex items-center gap-2"><Mic size={20} aria-hidden="true"/> {t('adventure.fluency_title') || 'Practice reading this scene'}</h2>
            <p id="adventure-fluency-description" className="mt-1 text-sm text-slate-600">{t('adventure.fluency_description') || 'Read the AI narrator\u2019s passage aloud. Results are descriptive practice only, not a benchmark score.'}</p>
          </div>
          <button type="button" onClick={closePractice} disabled={status === 'processing'} className="min-w-11 min-h-11 rounded-full p-2 text-slate-700 hover:bg-slate-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600" aria-label={t('common.close')}><X size={20} aria-hidden="true"/></button>
        </div>
        <div className="mt-4 max-h-56 overflow-y-auto rounded-xl border border-slate-300 bg-slate-50 p-4 text-sm font-medium leading-relaxed text-slate-800">{sceneText}</div>
        <label className="mt-4 flex min-h-11 items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-slate-700">
          <input type="checkbox" checked={allowCloud} disabled={status === 'recording' || status === 'processing'} onChange={(event) => setAllowCloud(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded text-sky-700 focus-visible:ring-2 focus-visible:ring-sky-700"/>
          <span><strong className="block text-slate-900">{t('adventure.fluency_cloud_label') || 'Allow cloud analysis if on-device analysis is unavailable'}</strong>{t('adventure.fluency_cloud_desc') || 'When enabled, this recording may be sent to Google Gemini for word-by-word analysis. The recording is not saved unless you choose Save below.'}</span>
        </label>
        {error && <div role="alert" className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</div>}
        {status === 'complete' && result && (
          <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-white p-3 shadow-sm"><div className="text-3xl font-black text-indigo-700">{result.wcpm}</div><div className="text-[11px] font-bold uppercase tracking-wide text-slate-600">{t('fluency.wcpm_label') || 'Words correct per minute'}</div></div>
              <div className="rounded-xl bg-white p-3 shadow-sm"><div className="text-3xl font-black text-emerald-700">{result.accuracy}%</div><div className="text-[11px] font-bold uppercase tracking-wide text-slate-600">{t('fluency.accuracy_score') || 'Accuracy'}</div></div>
            </div>
            <p className="mt-3 text-xs font-bold text-indigo-950">{t('adventure.fluency_descriptive_note') || 'Adventure passages are AI-generated and uncalibrated. Use this result for practice and reflection only.'}</p>
            {result.feedback && <p className="mt-2 text-sm text-slate-700">{result.feedback}</p>}
          </div>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {status === 'recording' ? (
            <button type="button" onClick={stopAndAnalyze} className="min-h-11 rounded-xl bg-red-700 px-5 py-3 font-black text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"><span aria-hidden="true">\u25A0</span> {t('fluency.stop_recording') || 'Stop and analyze'}</button>
          ) : status === 'processing' ? (
            <div role="status" aria-live="polite" className="min-h-11 rounded-xl bg-indigo-100 px-5 py-3 font-black text-indigo-800"><RefreshCw size={16} className="mr-2 inline animate-spin motion-reduce:animate-none" aria-hidden="true"/> {t('fluency.processing') || 'Analyzing reading...'}</div>
          ) : (
            <button type="button" onClick={startRecording} className="min-h-11 rounded-xl bg-rose-700 px-5 py-3 font-black text-white hover:bg-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-2"><Mic size={16} className="mr-2 inline" aria-hidden="true"/> {status === 'complete' ? (t('adventure.fluency_try_again') || 'Try again') : (t('fluency.start_recording') || 'Start recording')}</button>
          )}
          {status === 'complete' && result && (
            <button type="button" onClick={saveResult} disabled={saved} className="min-h-11 rounded-xl border-2 border-indigo-600 bg-white px-5 py-3 font-black text-indigo-700 hover:bg-indigo-50 disabled:cursor-default disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2">{saved ? (t('adventure.fluency_saved') || 'Saved to reading history') : (t('adventure.fluency_save') || 'Save to reading history')}</button>
          )}
        </div>
      </div>
    </div>
  );
}

function AdventureView(props) {
  const [showFullIllustration, setShowFullIllustration] = React.useState(false);
  // State (object-bundle)
  var adventureState = props.adventureState;
  var setAdventureState = props.setAdventureState;
  var episodeLimit = Object.prototype.hasOwnProperty.call(adventureState, 'episodeTurnLimit') ? adventureState.episodeTurnLimit : (adventureState.enableAutoClimax ? null : Math.max(3, Math.min(50, Number(adventureState.climaxMinTurns) || 20)));
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
  var prewarmAdventureAudio = props.prewarmAdventureAudio;   // scene TTS pre-warm (2026-07-16)
  var handleAdventureHint = props.handleAdventureHint;       // once-per-scene free-response Strategy Hint
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
  var AdventureAudioControls = props.AdventureAudioControls || (typeof window !== 'undefined' && window.AlloModules && window.AlloModules.AdventureAudioControls);
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
    var text = typingPace.assisted
      ? typingPace.wordCount + ' ' + (typingPace.wordCount === 1 ? 'word' : 'words') + ' \u00B7 ' + (t('adventure.typing_pace_assisted') || 'assisted input')
      : typingPace.wpm + ' ' + (t('adventure.typing_pace_wpm') || 'WPM') + ' \u00B7 ' + typingPace.wordCount + ' ' + (typingPace.wordCount === 1 ? 'word' : 'words');
    return <div role="status" aria-live="off" className={(isDark ? 'border-white/20 bg-black/40 text-white/80' : 'border-indigo-200 bg-indigo-50 text-indigo-900') + ' w-fit rounded-full border px-2.5 py-1 text-[11px] font-bold tabular-nums'}>{text}</div>;
  };
  var xpMax = Math.max(1, Number(adventureState.xpToNextLevel) || 1);
  var xpValue = Math.max(0, Math.min(xpMax, Number(adventureState.xp) || 0));
  var xpProgressPercent = Math.max(0, Math.min(100, (xpValue / xpMax) * 100));
  var energyValue = Math.max(0, Math.min(100, Number(adventureState.energy) || 0));
  var adventureThemeAnchor = (Array.isArray(adventureState.history) ? adventureState.history : []).find(function (entry) { return entry && entry.type === 'scene' && entry.text; });
  var adventureThemeSeed = activeSessionCode
    ? 'session:' + String(activeSessionCode)
    : 'solo:' + String((adventureThemeAnchor && adventureThemeAnchor.text) || (adventureState.currentScene && adventureState.currentScene.text) || adventureInputMode || 'adventure');
  var debateMomentumValue = Math.max(0, Math.min(100, Number(adventureState.debateMomentum) || 0));
  var democracyActive = !!(sessionData && sessionData.democracy && sessionData.democracy.isActive);
  var democracyVotes = democracyActive && sessionData.democracy.votes && typeof sessionData.democracy.votes === 'object'
    ? sessionData.democracy.votes : {};
  var democracyTotalVotes = Object.keys(democracyVotes).length;
  var democracyRosterTotal = sessionData && sessionData.roster && typeof sessionData.roster === 'object'
    ? Object.keys(sessionData.roster).length : 0;
  var democracyAudienceTotal = Math.max(democracyTotalVotes, Number(sessionData && sessionData.participantCount) || democracyRosterTotal);
  var currentUserVote = !isTeacherMode && currentUserUid && Object.prototype.hasOwnProperty.call(democracyVotes, currentUserUid)
    ? String(democracyVotes[currentUserUid]).trim() : '';
  var normalizeAdventureVoteOption = function (option) {
    return String(typeof option === 'object' && option && option.action ? option.action : option).trim();
  };
  var renderDemocracyStatus = function (isDark) {
    if (!democracyActive) return null;
    var message = isTeacherMode
      ? (democracyAudienceTotal > 0
        ? democracyTotalVotes + ' of ' + democracyAudienceTotal + ' students voted'
        : democracyTotalVotes + ' student votes received')
      : (currentUserVote
        ? 'Vote submitted. Choose another option to change it.'
        : 'Choose one option. You can change your vote until the teacher continues.');
    return (
      <div role="status" aria-live="polite" aria-atomic="true"
        className={(isDark
          ? 'md:col-span-2 bg-teal-500/15 border-teal-300/40 text-teal-50'
          : 'sm:col-span-2 bg-teal-50 border-teal-300 text-teal-950') + ' flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold'}>
        <Users size={15} aria-hidden="true" />
        <span>{message}</span>
      </div>
    );
  };

  var renderAdventureChoiceListen = function (opt, idx) {
    const optionText = typeof opt === 'object' && opt?.action ? opt.action : String(opt);
    return <button type="button" data-adventure-listen
      aria-label={(t('common.listen') || 'Listen') + ': ' + optionText}
      title={t('common.listen')}
      onClick={event => {
        event.stopPropagation();
        if (typeof opt === 'object' && opt?.audio) {
          const audio = new Audio(opt.audio);
          audio.play();
        } else if (handleSpeak) {
          handleSpeak(optionText, 'adventure-option-' + idx);
        }
      }}
      className="min-w-11 min-h-11 shrink-0 self-start mt-2 mr-2 flex items-center justify-center rounded-xl border border-[var(--av-control)] bg-[var(--av-surface)] text-[var(--av-ink)] hover:bg-[var(--av-wash)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)]">
      <Volume2 size={17} aria-hidden="true" />
    </button>;
  };
  var adventureChoiceClass = function (isMyVote, isReading) {
    return 'min-w-0 rounded-2xl border-2 text-[var(--av-ink)] shadow-sm transition-colors motion-reduce:transition-none motion-reduce:transform-none ' +
      (isReading || isMyVote ? 'border-[var(--av-accent)] bg-[var(--av-wash)]' : 'border-[var(--av-control)] bg-[var(--av-surface)] hover:border-[var(--av-focus)]');
  };
  var renderAdventureChoiceStatus = function (isDemocracy, isMyVote, voteCount, percent, isReading) {
    if (!(isDemocracy && isTeacherMode) && !isMyVote && !isReading) return null;
    return <div className="mx-3 mb-3 pt-2 border-t border-[var(--av-line)] flex flex-wrap items-center gap-2 text-[var(--av-accent)]">
      {isDemocracy && isTeacherMode && <>
        <span aria-live="polite" aria-atomic="true" className={`text-[11px] font-bold tabular-nums`}>{t('adventure.vote_status', { count: voteCount, percent: percent })}</span>
        <span aria-hidden="true" className="h-1 w-12 rounded-full overflow-hidden bg-[var(--av-wash)] border border-[var(--av-control)]"><span className="block h-full bg-[var(--av-accent)]" style={{ width: percent + '%' }}/></span>
      </>}
      {isMyVote && <span className="text-xs font-bold flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false"><path d="m3 8 3 3 7-7" /></svg>{adventureSettingsText(t, 'your_vote', 'Your vote')}</span>}
      {isReading && <span className="text-xs font-bold flex items-center gap-1.5"><Volume2 size={14} aria-hidden="true" />{adventureSettingsText(t, 'listening', 'Listening')}</span>}
    </div>;
  };

  var renderStrategyHintCard = function (isDark) {
    var hint = adventureState.currentHint;
    if (!hint || hint.turn !== adventureState.turnCount) return null;
    var notice = hint.notice || hint.text;
    return (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={isDark
          ? 'p-3 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-50 text-sm backdrop-blur-sm'
          : 'p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-sm'}
      >
        <div className="flex items-center gap-2 font-black mb-2">
          <span aria-hidden="true">{'\u{1F4A1}'}</span>
          <span>{t('adventure.hint_card_title') || 'Strategy Hint'}</span>
        </div>
        {hint.loading ? (
          <div>{t('adventure.hint_loading') || 'Building a strategy hint...'}</div>
        ) : (
          <div className="space-y-2">
            {notice && (
              <div>
                <span className="font-black uppercase tracking-wide text-[10px] mr-2">
                  {t('adventure.hint_notice_label') || 'Notice'}
                </span>
                <span>{notice}</span>
              </div>
            )}
            {hint.connect && (
              <div>
                <span className="font-black uppercase tracking-wide text-[10px] mr-2">
                  {t('adventure.hint_connect_label') || 'Connect'}
                </span>
                <span>{hint.connect}</span>
              </div>
            )}
            {hint.tryStep && (
              <div>
                <span className="font-black uppercase tracking-wide text-[10px] mr-2">
                  {t('adventure.hint_try_label') || 'Try'}
                </span>
                <span>{hint.tryStep}</span>
              </div>
            )}
            {hint.starter && (
              <button
                type="button"
                onClick={() => setAdventureTextInput(hint.starter + ' ')}
                className={isDark
                  ? 'mt-1 px-2 py-1 rounded-lg bg-amber-400/20 border border-amber-300/40 text-amber-50 text-xs font-bold hover:bg-amber-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300'
                  : 'mt-1 px-2 py-1 rounded-lg bg-amber-100 border border-amber-400 text-amber-950 text-xs font-bold hover:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700'}
                title={t('adventure.hint_use_starter') || 'Use this sentence starter'}
              >
                <span aria-hidden="true">{'\u21B3'} </span>"{hint.starter}"
              </button>
            )}
            <div className={isDark ? 'text-[11px] text-amber-100/80 italic' : 'text-[11px] text-amber-800 italic'}>
              {t('adventure.hint_footer') || 'The next move is still yours.'}
            </div>
          </div>
        )}
      </div>
    );
  };
  var renderStrategyHintButton = function (isDark) {
    if (!handleAdventureHint) return null;
    var hint = adventureState.currentHint;
    var hintLoading = !!(hint && hint.turn === adventureState.turnCount && hint.loading);
    var hintUsed = adventureState.hintUsedTurn === adventureState.turnCount;
    return (
      <div className={isDark ? 'w-full' : 'self-start'}>
        <button
          type="button"
          onClick={() => handleAdventureHint()}
          disabled={adventureState.isLoading || hintLoading || hintUsed}
          className={isDark
            ? 'min-h-11 w-full bg-transparent border border-amber-400/40 text-amber-200 p-2 rounded-xl text-xs font-bold hover:bg-amber-400/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black'
            : 'min-h-11 px-3 py-2 rounded-xl border border-amber-400 text-amber-800 text-xs font-bold hover:bg-amber-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2'}
          title={t('adventure.hint_button_title') || 'Get one grounded clue and a response strategy'}
        >
          <span aria-hidden="true">{'\u{1F4A1}'} </span>
          {hintUsed ? (t('adventure.hint_used') || 'Clue used this scene') : (t('adventure.hint_button') || 'Give me a clue')}
        </button>
        {!hintUsed && (
          <div className={isDark ? 'mt-1 text-center text-[10px] text-amber-100/70' : 'mt-1 text-[10px] text-slate-600'}>
            {t('adventure.hint_button_helper') || 'One clue per scene. You still decide what happens.'}
          </div>
        )}
      </div>
    );
  };
  return (
                  <ErrorBoundary
                      title={t('adventure.error.title')}
                      fallbackMessage={t('adventure.error.fallback')}
                      retryLabel={t('adventure.error.retry')}
                      onRetry={handleAdventureCrashRecovery}
                  >
                  <div className="h-full flex flex-col gap-3 relative">
                      <ClimaxProgressBar climaxState={adventureState.climax} />
                      <AdventureAmbience
                          sceneText={adventureState.currentScene?.text}
                          soundParams={adventureState.currentScene?.soundParams}
                          themeSeed={adventureThemeSeed}
                          active={!adventureState.isGameOver && soundEnabled && activeView === 'adventure'}
                          volume={0.2}
                      />
                      {adventureState.isShopOpen && (<ErrorBoundary fallbackMessage="The adventure shop encountered an error.">
                          <AdventureShop
                              gold={adventureState.gold}
                              globalXP={globalPoints}
                              onClose={handleCloseShop}
                              onPurchase={handleShopPurchase}
                          />
                      </ErrorBoundary>
                      )}
                      {showLedger && (
                        <div role="presentation" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200 motion-reduce:animate-none" onClick={handleSetShowLedgerToFalse}>
                            <div ref={ledgerDialogRef} tabIndex={-1} className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 max-w-md w-full max-h-[calc(100vh-1rem)] overflow-y-auto relative border-4 border-indigo-200 transition-all animate-in zoom-in-95 motion-reduce:animate-none" role="dialog" aria-modal="true" aria-labelledby="adventure-ledger-title" aria-describedby="adventure-ledger-subtitle" onClick={e => e.stopPropagation()}>
                                <button type="button" onClick={handleSetShowLedgerToFalse} className="absolute top-2 right-2 sm:top-3 sm:right-3 min-w-11 min-h-11 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2" aria-label={t('common.close')}><X size={20} aria-hidden="true"/></button>
                                <div className="flex flex-col items-center text-center mb-4">
                                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-2">
                                        <BookOpen size={24} aria-hidden="true" />
                                    </div>
                                    <h3 id="adventure-ledger-title" className="text-xl font-black text-indigo-900">{t('adventure.ledger_title')}</h3>
                                    <p id="adventure-ledger-subtitle" className="text-xs text-slate-700">{t('adventure.ledger_subtitle')}</p>
                                </div>
                                <div role="region" aria-label={t('adventure.ledger_title')} tabIndex={0} className="bg-slate-50 p-4 rounded-xl border border-slate-400 text-sm text-slate-700 leading-relaxed max-h-[50vh] overflow-y-auto custom-scrollbar whitespace-pre-line font-serif focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2">
                                    {adventureState.narrativeLedger || t('adventure.ledger_empty')}
                                </div>
                                <div className="mt-4 flex flex-col gap-2">
                                    <button type="button"
                                        aria-label={t('adventure.storybook')}
                                        onClick={() => {
                                            setShowLedger(false);
                                            setShowStorybookExportModal(true);
                                        }}
                                        disabled={isProcessing || adventureState.history.length === 0} aria-busy={isProcessing}
                                        className="min-h-11 w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
                                    >
                                        {isProcessing ? <RefreshCw size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true"/> : <Download size={18} aria-hidden="true" />}
                                        {t('adventure.storybook')}
                                    </button>
                                    <button type="button"
                                        onClick={handleSetShowLedgerToFalse}
                                        className="min-h-11 w-full px-6 py-2 text-slate-700 font-bold hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2 rounded-xl"
                                    >
                                        {t('common.close')}
                                    </button>
                                </div>
                            </div>
                        </div>
                      )}
                      <div data-adventure-header role="region" aria-label={adventureSettingsText(t, 'header_controls', 'Adventure controls')} style={{ ...adventureVisualTokens(theme), backgroundImage: theme === 'contrast' ? 'none' : 'linear-gradient(120deg, var(--av-wash), var(--av-surface) 70%)' }} className={`rounded-3xl border border-[var(--av-line)] border-t-[3px] border-t-[var(--av-accent)] p-3 sm:p-4 flex flex-col shadow-[var(--av-shadow)] shrink-0 gap-3 relative max-h-[42vh] [@media(max-height:740px)]:max-h-[28vh] overflow-y-auto overscroll-contain ${adventureState.isImmersiveMode || !adventureState.currentScene ? 'hidden' : ''}`}>
                        {adventureEffects.levelUp && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-[1px]">
                                <div aria-hidden="true"><ConfettiExplosion /></div>
                                <div className="bg-yellow-400 text-indigo-900 px-8 py-4 rounded-2xl border-4 border-white shadow-2xl font-black text-2xl animate-in zoom-in duration-300 rotate-3 motion-reduce:animate-none motion-reduce:transform-none" role="status" aria-live="assertive" aria-atomic="true">
                                    {t('adventure.feedback.level_up', { level: adventureEffects.levelUp })}
                                </div>
                            </div>
                        )}
                        <div className="text-[var(--av-ink)] min-w-0 relative z-10">
                            <div tabIndex={0} role="group" aria-label={adventureSettingsText(t, 'story_status', 'Adventure status')} className="flex flex-wrap items-center gap-2 sm:gap-3 min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--av-focus)]">
                                <h3 className="w-full font-bold text-base sm:text-lg tracking-tight flex items-center gap-2.5 min-w-0"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-950 border border-teal-700 shadow-sm"><MapIcon size={18} className="text-yellow-300" aria-hidden="true"/></span><span className="min-w-0 [overflow-wrap:anywhere]">{t('adventure.title')}</span></h3>
                                {adventureInputMode === 'system' && (
                                    <div className="bg-[var(--av-wash)] text-[var(--av-ink)] border border-[var(--av-line)] px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                                        <span aria-hidden="true">🏛️</span> {t('adventure.system_simulation')}
                                    </div>
                                )}
                                <div data-adventure-meter="xp" className="basis-28 flex-1 min-w-0 bg-[var(--av-surface)] px-3 py-2.5 rounded-2xl text-xs font-bold border border-[var(--av-line)] flex flex-wrap items-center gap-x-2 gap-y-2 relative">
                                    <span className="text-[var(--av-ink)]">{t('common.level_abbrev') || 'Lvl'} {adventureState.level}</span><span className="ml-auto text-[var(--av-muted)] text-[11px] font-medium tabular-nums">{xpValue}/{xpMax} {t('common.xp') || 'XP'}</span>
                                    <div className="w-full h-2 bg-[var(--av-wash)] border border-[var(--av-line)] rounded-full overflow-hidden" role="progressbar" aria-label={t('common.xp') || 'XP'} aria-valuemin={0} aria-valuemax={xpMax} aria-valuenow={xpValue} aria-valuetext={t('adventure.tooltips.xp', { current: xpValue, next: xpMax })}>
                                        <div
                                            className="h-full bg-[var(--av-accent)] transition-all duration-1000 ease-out motion-reduce:transition-none" aria-hidden="true"
                                            style={{ width: xpProgressPercent + '%' }}
                                        ></div>
                                    </div>
                                    {adventureEffects.xp !== null && (
                                        <div role="status" aria-live="polite" aria-atomic="true" className={`absolute -top-8 left-1/2 transform -translate-x-1/2 text-yellow-300 font-black text-lg animate-[ping_0.8s_ease-out_reverse] motion-reduce:animate-none motion-reduce:transform-none pointer-events-none z-20 whitespace-nowrap drop-shadow-md ${adventureEffects.xp < 0 ? 'text-red-400' : 'text-yellow-300'}`}>
                                            {adventureEffects.xp > 0 ? '+' : ''}{adventureEffects.xp} {t('common.xp') || 'XP'}
                                        </div>
                                    )}
                                </div>
                                <div data-adventure-meter="energy"
                                    className={`basis-28 flex-1 min-w-0 px-3 py-2.5 rounded-2xl text-xs font-bold border flex flex-wrap items-center gap-x-2 gap-y-2 relative transition-colors duration-200 motion-reduce:transition-none ${
                                        adventureInputMode === 'system'
                                            ? 'bg-[var(--av-surface)] border-[var(--av-line)]'
                                            : adventureEffects.energy < 0
                                                ? 'border-red-600 bg-[var(--av-surface)]'
                                                : 'bg-[var(--av-surface)] border-[var(--av-line)]'
                                    }`}
                                    title={adventureInputMode === 'system' ? t('adventure.tooltips.stability', { value: energyValue }) : t('adventure.tooltips.energy', { value: energyValue })}
                                >
                                    <span className="flex items-center gap-1.5 text-[var(--av-ink)]"><Zap size={13} aria-hidden="true" className="shrink-0" />{adventureInputMode === 'system' ? adventureSettingsText(t, 'header_stability', 'Stability') : adventureSettingsText(t, 'header_energy', 'Energy')}</span>
                                    <span className="ml-auto tabular-nums text-[var(--av-ink)]"><AnimatedNumber value={energyValue} /></span>
                                    <div className="w-full h-2 bg-[var(--av-wash)] border border-[var(--av-line)] rounded-full overflow-hidden relative" role="progressbar" aria-label={adventureInputMode === 'system' ? t('adventure.tooltips.stability', { value: energyValue }) : t('adventure.tooltips.energy', { value: energyValue })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={energyValue}>
                                        <div
                                            aria-hidden="true" className={`h-full transition-all duration-500 motion-reduce:transition-none ${
                                                adventureInputMode === 'system'
                                                    ? (theme === 'contrast' ? 'bg-yellow-300' : 'bg-amber-500')
                                                    : adventureState.energy < 20 || adventureEffects.energy < 0
                                                        ? 'bg-red-500 animate-pulse motion-reduce:animate-none'
                                                        : (theme === 'contrast' ? 'bg-yellow-300' : 'bg-amber-500')
                                            }`}
                                            style={{ width: energyValue + '%' }}
                                        ></div>
                                    </div>
                                    {adventureEffects.energy !== null && (
                                        <div role="status" aria-live="polite" aria-atomic="true" className={`absolute -top-8 left-1/2 transform -translate-x-1/2 font-black text-lg animate-[ping_0.8s_ease-out_reverse] motion-reduce:animate-none motion-reduce:transform-none pointer-events-none z-20 whitespace-nowrap drop-shadow-md ${adventureEffects.energy > 0 ? 'text-green-400' : 'text-red-500'}`}>
                                            {adventureEffects.energy > 0 ? '+' : ''}{adventureEffects.energy}
                                        </div>
                                    )}
                                </div>
                                <div className="bg-[var(--av-wash)] px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--av-line)] flex flex-wrap items-center gap-1.5 text-[var(--av-ink)] min-w-0" title={t('adventure.tooltips.gold', { value: adventureState.gold })}>
                                    <span aria-hidden="true">💰</span><span>{adventureSettingsText(t, 'header_gold', 'Gold')}</span><span className="tabular-nums font-bold">{adventureState.gold}</span>
                                    {adventureState.activeGoldBuffTurns > 0 && (
                                        <span className="text-[11px] ml-1 bg-yellow-400 text-black px-1 rounded-full">
                                            {adventureState.activeGoldBuffTurns}
                                        </span>
                                    )}
                                </div>
                                {/* Live concepts chip (2026-07-16): stats.conceptsFound was accumulated every
                                    turn but only shown on the game-over Mission Report — now visible DURING
                                    play so students/teachers see learning progress as it happens. */}
                                {(adventureState.stats?.conceptsFound || []).length > 0 && (
                                    <div className="bg-[var(--av-wash)] px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--av-line)] flex flex-wrap items-center gap-1.5 text-[var(--av-ink)] min-w-0"
                                        title={(t('adventure.mission_report.concepts_secured') || 'Concepts secured') + ': ' + adventureState.stats.conceptsFound.join(', ')}
                                        aria-label={(t('adventure.mission_report.concepts_secured') || 'Concepts secured') + ': ' + adventureState.stats.conceptsFound.join(', ')}
                                    >
                                        <span aria-hidden="true">🔑</span><span>{adventureSettingsText(t, 'header_concepts', 'Concepts')}</span><span className="tabular-nums font-bold">{adventureState.stats.conceptsFound.length}</span>
                                    </div>
                                )}
                                <InventoryGrid
                                    inventory={adventureState.inventory}
                                    onSelect={handleSelectInventoryItem}
                                />
                                {adventureInputMode === 'system' && enableFactionResources && (adventureState.systemResources || []).length > 0 && (
                                    <div className="w-full flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--av-line)]">
                                        {adventureState.systemResources.slice(0, 5).map((resource, idx) => (
                                            <div
                                                key={`fr-${idx}`}
                                                className="min-w-0 max-w-full bg-[var(--av-wash)] border border-[var(--av-line)] rounded-xl px-2.5 py-2 flex flex-wrap items-center gap-1.5 text-xs [overflow-wrap:anywhere]"
                                                title={`${resource.name}: ${resource.quantity}${resource.unit || ''}`}
                                            >
                                                <span aria-hidden="true">{resource.icon || '📦'}</span>
                                                <span className="min-w-0 text-[var(--av-muted)]">{resource.name}</span><span className="text-[var(--av-ink)] font-bold tabular-nums">{resource.quantity}{resource.unit ? <span className="text-[var(--av-muted)] font-normal ml-0.5">{resource.unit}</span> : ''}</span>
                                            </div>
                                        ))}
                                        {adventureState.systemResources.length > 5 && (
                                            <span className="text-[var(--av-muted)] text-xs">+{adventureState.systemResources.length - 5}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            {adventureInputMode === 'debate' && (
                                <div className="w-full mt-3">
                                    <div className="relative w-full h-4 bg-slate-700 rounded-full border border-slate-600 overflow-hidden shadow-inner" role="progressbar" aria-label={t('adventure.debate_you') + ' / ' + t('adventure.debate_opponent')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={debateMomentumValue} aria-valuetext={t('adventure.debate_you') + ': ' + debateMomentumValue + '; ' + t('adventure.debate_opponent') + ': ' + (100 - debateMomentumValue)}>
                                        <div
                                            aria-hidden="true" className={`h-full transition-all duration-500 ease-out motion-reduce:transition-none ${
                                                adventureState.debateMomentum > 60 ? 'bg-green-500' :
                                                adventureState.debateMomentum < 40 ? 'bg-red-500' :
                                                'bg-yellow-500'
                                            }`}
                                            style={{ width: debateMomentumValue + '%' }}
                                        ></div>
                                        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/30 z-10" aria-hidden="true"></div>
                                        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none" aria-hidden="true">
                                            <span className="text-[11px] font-black text-white drop-shadow-md tracking-wider">
                                                {debateMomentumValue}/100
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between gap-3 text-xs font-semibold text-[var(--av-muted)] mt-1.5 px-1">
                                        <span>{t('adventure.debate_opponent')}</span>
                                        <span>{t('adventure.debate_you')}</span>
                                    </div>
                                </div>
                            )}
                            <p className="text-xs leading-relaxed text-[var(--av-muted)] mt-2">{t('adventure.explore_hint')}</p>
                        </div>
                        <div data-adventure-toolbar className="flex flex-wrap items-center gap-2 relative z-10 min-w-0 shrink-0 border-t border-[var(--av-line)] pt-3" role="group" aria-label={adventureSettingsText(t, 'header_tools', 'Story tools')}>
                            {AdventureAudioControls && <AdventureAudioControls soundEnabled={soundEnabled} t={t} />}
                            {isTeacherMode && adventureState.currentScene && !adventureState.isGameOver && (
                                <button type="button"
                                    data-help-key="adventure_edit_options" onClick={handleStartOptionEdit}
                                    disabled={isEditingOptions}
                                    className={`min-w-11 min-h-11 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors motion-reduce:transition-none border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] ${isEditingOptions ? 'bg-[var(--av-wash)] text-[var(--av-muted)] border-[var(--av-line)] opacity-50 cursor-not-allowed' : 'bg-[var(--av-surface)] text-[var(--av-ink)] border-[var(--av-control)] hover:bg-[var(--av-wash)]'}`}
                                    title={t('adventure.edit_options_tooltip')}
                                    aria-label={t('adventure.edit_options_tooltip')}
                                >
                                    <Pencil size={14} aria-hidden="true" /> <span className="hidden xl:inline">{t('adventure.edit_options_btn')}</span>
                                </button>
                            )}
                            {isTeacherMode && activeSessionCode && !adventureFreeResponseEnabled && (
                                <button type="button"
                                    data-help-key="democracy_toggle" onClick={toggleDemocracyMode}
                                    className={`min-w-11 min-h-11 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors motion-reduce:transition-none border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] ${
                                        sessionData?.democracy?.isActive
                                        ? 'bg-teal-700 text-white border-teal-500 ring-2 ring-teal-400'
                                        : 'bg-[var(--av-surface)] text-[var(--av-ink)] border-[var(--av-control)] hover:bg-[var(--av-wash)]'
                                    }`}
                                    title={t('adventure.tooltips.democracy_toggle')}
                                    aria-label={t('adventure.tooltips.democracy_toggle')}
                                    aria-pressed={!!sessionData?.democracy?.isActive}
                                >
                                    {sessionData?.democracy?.isActive ? <Users size={14} aria-hidden="true" /> : <User size={14} aria-hidden="true" />}
                                    <span className="hidden xl:inline">{sessionData?.democracy?.isActive ? t('adventure.democracy_on') : t('adventure.democracy_off')}</span>
                                </button>
                            )}
                            <button type="button"
                                aria-label={t('adventure.ledger_tooltip')}
                                onClick={handleSetShowLedgerToTrue}
                                className="min-w-11 min-h-11 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors motion-reduce:transition-none border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] bg-[var(--av-surface)] text-[var(--av-ink)] border-[var(--av-control)] hover:bg-[var(--av-wash)]"
                                title={t('adventure.ledger_tooltip')}
                            >
                                <BookOpen size={14} className="fill-current" aria-hidden="true"/>
                                <span className="hidden sm:inline">{t('adventure.log_button')}</span>
                            </button>
                            <button type="button"
                                aria-label={adventureState.isImmersiveMode ? t('adventure.exit_immersive') : t('adventure.enter_immersive')}
                                aria-pressed={adventureState.isImmersiveMode}
                                onClick={handleToggleAdventureImmersive}
                                className={`min-w-11 min-h-11 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors motion-reduce:transition-none border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] ${adventureState.isImmersiveMode ? 'bg-yellow-400 text-indigo-900 border-yellow-500 shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'bg-[var(--av-surface)] text-[var(--av-ink)] border-[var(--av-control)] hover:bg-[var(--av-wash)]'}`}
                                title={adventureState.isImmersiveMode ? t('adventure.exit_immersive') : t('adventure.enter_immersive')}
                            >
                                <Monitor size={14} aria-hidden="true"/>
                                <span className="hidden sm:inline">{adventureState.isImmersiveMode ? t('adventure.view_standard') : t('adventure.view_immersive')}</span>
                            </button>
                            <button type="button"
                                aria-label={adventureAutoRead ? t('adventure.auto_read_disable') : t('adventure.auto_read_enable')}
                                aria-pressed={adventureAutoRead}
                                data-help-key="adventure_immersive_autoread"
                                onClick={() => {
                                    const newState = !adventureAutoRead;
                                    setAdventureAutoRead(newState);
                                    if (!newState) stopPlayback();
                                }}
                                className={`min-w-11 min-h-11 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors motion-reduce:transition-none border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] ${adventureAutoRead ? 'bg-[var(--av-wash)] text-[var(--av-ink)] border-[var(--av-accent)] ring-1 ring-[var(--av-accent)]' : 'bg-[var(--av-surface)] text-[var(--av-ink)] border-[var(--av-control)] hover:bg-[var(--av-wash)]'}`}
                                title={adventureAutoRead ? t('adventure.auto_read_disable') : t('adventure.auto_read_enable')}
                            >
                                {adventureAutoRead ? <Volume2 size={14} className="fill-current animate-pulse motion-reduce:animate-none" aria-hidden="true"/> : <VolumeX size={14} aria-hidden="true"/>}
                                <span className="hidden sm:inline">{t('adventure.auto_read_status_label')}: {adventureAutoRead ? t('common.on') : t('common.off')}</span>
                            </button>
                            {adventureFluencyEnabled && adventureState.currentScene && (
                                <button type="button"
                                    aria-label={t('adventure.fluency_title') || 'Practice reading this scene'}
                                    aria-haspopup="dialog"
                                    data-help-key="adventure_scene_reading_practice"
                                    onClick={() => { stopPlayback(); setAdventureFluencyOpen(true); }}
                                    className="min-w-11 min-h-11 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors motion-reduce:transition-none border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] bg-rose-800 text-rose-100 border-rose-500 hover:bg-rose-700"
                                    title={t('adventure.fluency_title') || 'Practice reading this scene'}
                                >
                                    <Mic size={14} aria-hidden="true"/>
                                    <span className="hidden sm:inline">{t('adventure.fluency_button_short') || 'Reading practice'}</span>
                                </button>
                            )}
                            {!isZenMode && (
                            <button type="button"
                                aria-label={t('adventure.maximize_tooltip')}
                                onClick={handleSetIsZenModeToTrue}
                                className="min-w-11 min-h-11 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-colors motion-reduce:transition-none border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] bg-[var(--av-surface)] text-[var(--av-ink)] border-[var(--av-control)] hover:bg-[var(--av-wash)]"
                                title={t('adventure.maximize_tooltip')}
                            >
                                <Maximize size={14} aria-hidden="true"/>
                                <span className="hidden sm:inline">{t('adventure.view_button')}</span>
                            </button>
                            )}
                            <button type="button" aria-label={t('common.start_new_adventure')}
                                data-help-key="adventure_start_btn" onClick={handleStartAdventure}
                                className="min-w-11 min-h-11 flex items-center gap-2 bg-[var(--av-surface)] text-[var(--av-ink)] border border-[var(--av-control)] px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[var(--av-wash)] transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)]"
                            >
                                <RefreshCw size={14} className={adventureState.isLoading ? "animate-spin motion-reduce:animate-none" : ""} aria-hidden="true" /> {t('adventure.restart')}
                            </button>
                        </div>
                    </div>
                    <div data-adventure-canvas style={adventureVisualTokens(theme)} className="flex-grow min-h-0 bg-[var(--av-wash)] rounded-3xl border border-[var(--av-line)] shadow-inner overflow-hidden flex flex-col relative">
                        {!adventureState.isImmersiveMode ? (
                        <div ref={adventureScrollRef} className="flex-grow overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
                            {!adventureState.currentScene && adventureState.history.length === 0 && !adventureState.isLoading && (
                                <div className="min-h-full flex flex-col items-center py-4 sm:py-10 animate-in fade-in zoom-in duration-300 motion-reduce:animate-none">
                                    {hasSavedAdventure && !showNewGameSetup ? (
                                        <div className="max-w-md w-full text-center space-y-6 my-auto">
                                            <div className="bg-white p-4 sm:p-8 rounded-3xl shadow-xl border-4 border-indigo-100">
                                                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-sm border-2 border-indigo-200">
                                                    <MapIcon size={40} aria-hidden="true" />
                                                </div>
                                                <h2 className="text-2xl font-black text-slate-800 mb-2">{t('adventure.paused_title')}</h2>
                                                <p className="text-slate-600 mb-6 font-medium">
                                                    {t('adventure.paused_desc')}
                                                </p>
                                                <button type="button"
                                                    aria-label={t('adventure.resume')}
                                                    data-help-key="adventure_resume_btn" onClick={handleResumeAdventure}
                                                    className="min-h-11 w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-lg shadow-lg hover:scale-105 transition-all motion-reduce:transform-none flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
                                                >
                                                    <History size={20} aria-hidden="true"/> {t('adventure.resume')}
                                                </button>
                                            </div>
                                            <button type="button"
                                                aria-label={t('adventure.start_overwrite')}
                                                onClick={handleSetShowNewGameSetupToTrue}
                                                className="min-h-11 text-slate-700 hover:text-red-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors px-3 py-2 uppercase tracking-wider rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
                                            >
                                                <RefreshCw size={12} aria-hidden="true"/> {t('adventure.start_overwrite')}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl border-2 border-indigo-100 overflow-hidden relative my-auto">
                                            {hasSavedAdventure && (
                                                <button type="button"
                                                    aria-label={t('adventure.back_to_resume')}
                                                    onClick={handleSetShowNewGameSetupToFalse}
                                                    className="absolute top-2 left-2 sm:top-4 sm:left-4 min-w-11 min-h-11 text-white hover:bg-white/20 p-2 rounded-full transition-colors z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600"
                                                    title={t('adventure.back_to_resume')}
                                                >
                                                    <ArrowDown className="rotate-90" size={20} aria-hidden="true"/>
                                                </button>
                                            )}
                                            <div className={`p-5 sm:p-7 text-white flex justify-between items-center relative overflow-hidden ${theme === 'contrast' ? 'bg-black border-b-2 border-white' : 'bg-gradient-to-br from-indigo-950 via-indigo-900 to-teal-900'}`}>
                                                <div className="flex-grow text-center px-8 sm:px-12 relative z-10">
                                                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide sm:tracking-widest flex items-center justify-center gap-2">
                                                        <MapIcon size={24} aria-hidden="true"/> {t('adventure.title')}
                                                    </h2>
                                                    <p className="text-white text-sm font-medium mt-2 leading-relaxed">{t('adventure.setup_subtitle')}</p>
                                                </div>
                                            </div>
                                            <div className="p-4 sm:p-6">
                                                <AdventureLearningProfiles {...props}/>
                                                <AdventureSetupFields {...props}/>
                                            </div>
                                            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-center">
                                                <button type="button"
                                                    aria-label={t('adventure.start')}
                                                    onClick={() => executeStartAdventure()}
                                                    disabled={adventureState.isLoading} aria-busy={adventureState.isLoading}
                                                    className="min-h-11 w-full md:w-auto px-8 sm:px-16 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all motion-reduce:transform-none flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
                                                >
                                                    <Sparkles size={20} className="animate-pulse motion-reduce:animate-none" aria-hidden="true"/>
                                                    {t('adventure.start')}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            <AdventureJourneyNotebook history={adventureState.history} t={t} theme={theme} renderFormattedText={renderFormattedText} />
                            {adventureRecentHistory(adventureState.history).map((entry, i) => (
                                <div key={i} data-adventure-recent className="animate-in motion-reduce:animate-none fade-in slide-in-from-bottom-2 duration-500">
                                    <AdventureHistoryEntry entry={entry} t={t} theme={theme} renderFormattedText={renderFormattedText} />
                                </div>
                            ))}
                            {adventureState.pendingChoice && adventureState.isLoading && (
                                <div role="status" aria-live="polite" aria-atomic="true" className="flex justify-start animate-in slide-in-from-bottom-2 duration-300 motion-reduce:animate-none">
                                    <div className="max-w-[85%] bg-amber-50 p-4 rounded-2xl rounded-bl-none border border-amber-200 shadow-sm">
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-amber-600 font-bold text-xs uppercase tracking-wider">⚔️ {t('adventure.your_choice') || 'Your Choice'}</span>
                                        </div>
                                        <p className="text-amber-800 text-sm font-medium italic leading-relaxed">"{adventureState.pendingChoice}"</p>
                                        <p className="text-amber-700 text-xs mt-2 animate-pulse motion-reduce:animate-none">{adventureState.loadingStage || t('adventure.story_unfolds') || 'The story unfolds...'}</p>
                                    </div>
                                </div>
                            )}
                            {adventureState.isLoading && !adventureState.pendingChoice && (
                                <div role="status" aria-live="polite" aria-atomic="true" className="flex justify-start animate-pulse motion-reduce:animate-none">
                                    <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-slate-400 flex items-center gap-2 text-slate-600 text-sm">
                                        <RefreshCw size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true"/> {adventureState.loadingStage || t('adventure.status.loading_story')}
                                    </div>
                                </div>
                            )}
                            {adventureState.currentScene && (
                                <div role="region" aria-labelledby="adventure-current-scene-heading" className="flex justify-start animate-in fade-in slide-in-from-bottom-4 duration-700 motion-reduce:animate-none">
                                    <div style={adventureVisualTokens(theme)} className="w-full max-w-4xl bg-[var(--av-surface)] p-4 sm:p-6 rounded-3xl border border-[var(--av-line)] border-t-[3px] border-t-[var(--av-accent)] shadow-[var(--av-shadow)] relative min-w-0">
                                        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                                            <h4 id="adventure-current-scene-heading" className="text-xs font-bold text-[var(--av-accent)] uppercase tracking-wider flex items-center gap-2"><Flag size={12} aria-hidden="true"/> {t('adventure.current_scene')}</h4>
                                            {(adventureState.sceneImage || adventureState.sceneImagePreview) && (
                                                <div data-adventure-image-controls className="flex flex-wrap items-center gap-2 w-full sm:w-auto min-w-0">
                                                    <label className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-[var(--av-line)] bg-[var(--av-wash)] px-3 text-[var(--av-muted)]">
                                                        <span className="flex items-center gap-1.5 text-xs font-semibold"><ImageIcon size={14} aria-hidden="true" />{t('common.adjust_image_size')}</span>
                                                        <input aria-label={t('common.adjust_image_size')} aria-valuetext={adventureImageSize + ' px'}
                                                            type="range" min="150" max="600" step="50" value={adventureImageSize}
                                                            onChange={(e) => setAdventureImageSize(Number(e.target.value))}
                                                            className="w-24 h-11 max-w-full cursor-pointer accent-[var(--av-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] rounded-lg"
                                                        />
                                                        <span aria-hidden="true" className="text-[11px] font-medium tabular-nums">{adventureImageSize} px</span>
                                                    </label>
                                                    <button type="button" aria-pressed={showFullIllustration} onClick={() => setShowFullIllustration(value => !value)}
                                                        className="min-h-11 min-w-0 px-3 py-2 rounded-xl border border-[var(--av-control)] text-[var(--av-ink)] bg-[var(--av-surface)] hover:bg-[var(--av-wash)] aria-pressed:bg-[var(--av-wash)] aria-pressed:border-[var(--av-accent)] aria-pressed:ring-1 aria-pressed:ring-[var(--av-accent)] text-xs font-semibold flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)]">
                                                        <Maximize size={14} aria-hidden="true" className="shrink-0" />{adventureSettingsText(t, 'full_illustration', 'Full illustration')}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div data-adventure-illustration className="mb-5 rounded-2xl overflow-hidden bg-[var(--av-wash)] border border-[var(--av-line)] shadow-inner relative group transition-all duration-300 motion-reduce:transition-none" style={{ minHeight: adventureImageSize + 'px' }}>
                                            {(adventureState.sceneImage || adventureState.sceneImagePreview) ? (
                                                <>
                                                    <img loading="lazy"
                                                        src={adventureState.sceneImage || adventureState.sceneImagePreview}
                                                        alt=""
                                                        style={{ height: `${adventureImageSize}px`, objectFit: showFullIllustration ? 'contain' : 'cover', filter: !adventureState.sceneImage && adventureState.sceneImagePreview ? 'blur(1.5px) saturate(0.9)' : 'none' }}
                                                        className="block w-full animate-in fade-in duration-500 transition-[filter,opacity] motion-reduce:animate-none motion-reduce:transition-none"
                                                        decoding="async"
                                                    />
                                                    {!adventureState.sceneImage && adventureState.sceneImagePreview && (
                                                        <div role="status" aria-live="polite" className="absolute left-3 bottom-3 bg-slate-950/80 text-white text-xs font-bold px-3 py-2 rounded-full shadow-lg backdrop-blur-sm">
                                                            {adventureState.imagePolishStage === 'matching' ? 'Matching your cast…' : 'Polishing scene details…'}
                                                        </div>
                                                    )}
                                                    <div aria-hidden="true" className="absolute top-2 right-2 bg-black/60 text-white text-[11px] px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity motion-reduce:transition-none backdrop-blur-sm">
                                                        <Sparkles size={10} className="inline mr-1"/> {t('adventure.nano_badge')}
                                                    </div>
                                                </>
                                            ) : (
                                                <div role="status" aria-live="polite" aria-atomic="true" className="absolute inset-0 flex items-center justify-center text-[var(--av-muted)] flex-col gap-2">
                                                    {adventureState.isImageLoading ? (
                                                        <>
                                                            <ImageIcon size={24} className="animate-pulse motion-reduce:animate-none" aria-hidden="true"/>
                                                            <span className="text-xs font-medium animate-pulse motion-reduce:animate-none">{adventureState.loadingStage || t('adventure.generating_scene')}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ImageIcon size={24} className="opacity-40" aria-hidden="true"/>
                                                            <p className="text-sm font-bold">{t('adventure.no_image')}</p>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div data-adventure-prose className="prose prose-sm text-[var(--av-ink)] font-medium font-serif text-base leading-relaxed max-w-[68ch] mx-auto [overflow-wrap:anywhere]">
                                            <div className="space-y-4" onPointerEnter={() => { if (prewarmAdventureAudio && adventureState.currentScene) prewarmAdventureAudio(adventureState.currentScene.text, adventureState.currentScene.voices); }}>
                                                {(() => {
                                                    const paragraphs = adventureState.currentScene.text.split(/\n{2,}/);
                                                    let sentenceCounter = 0;
                                                    return paragraphs.map((para, pIdx) => {
                                                        const sentences = splitTextToSentences(para);
                                                        if (sentences.length === 0) return null;
                                                        return (
                                                            <p key={pIdx} className="mb-4 leading-relaxed">
                                                                {sentences.map((s, sIdx) => {
                                                                    const currentGlobalIdx = sentenceCounter;
                                                                    sentenceCounter++;
                                                                    const isActive = playbackState.currentIdx === currentGlobalIdx && playingContentId === 'adventure-active';
                                                                    const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(s.trim());
                                                                    const isHeader = s.trim().startsWith('#') || isHtmlHeader;
                                                                    const cleanText = isHeader ? (isHtmlHeader ? s.trim().replace(/<\/?h[1-6][^>]*>/gi, '') : s.trim().replace(/^#+\s*/, '')) : s;
                                                                    // Per-sentence read-aloud: the sentence TEXT is the control (click or
                                                                    // Enter/Space). The former inline speaker button (52c353dea) was removed
                                                                    // 2026-07-16 per Aaron — redundant with click-to-karaoke and visually
                                                                    // clunky — while keeping its keyboard/SR semantics on the span itself.
                                                                    return (
                                                                        <span
                                                                            key={sIdx}
                                                                            id={`sentence-${currentGlobalIdx}`}
                                                                            role="button"
                                                                            tabIndex={0}
                                                                            aria-pressed={isActive}
                                                                            aria-label={(t('adventure.read_aloud_title') || t('common.click_read_aloud') || 'Read aloud') + ': ' + cleanText.replace(/\*\*/g, '').trim()}
                                                                            title={t('adventure.read_aloud_title') || t('common.click_read_aloud')}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleSpeak(adventureState.currentScene.text, 'adventure-active', currentGlobalIdx);
                                                                            }}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                                    e.preventDefault();
                                                                                    e.stopPropagation();
                                                                                    handleSpeak(adventureState.currentScene.text, 'adventure-active', currentGlobalIdx);
                                                                                }
                                                                            }}
                                                                            className={`transition-colors duration-300 motion-reduce:transition-none rounded px-1 py-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${isActive ? 'bg-yellow-200 text-black shadow-sm' : 'hover:bg-[var(--av-wash)]'} ${isHeader ? 'font-bold block text-lg mt-2' : ''}`}
                                                                        >
                                                                            {formatInteractiveText(cleanText)}
                                                                            {" "}
                                                                        </span>
                                                                    );
                                                                })}
                                                            </p>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {adventureState.isGameOver && (() => {
                                const _isDefeat = adventureEpisodeDepleted(adventureState);
                                return <>
                                    {!_isDefeat && adventureState.canStartSequel && <div aria-hidden="true"><ConfettiExplosion /></div>}
                                    <AdventureEpisodeRecap state={adventureState} t={t} theme={theme} mode={adventureInputMode} social={props.isSocialStoryMode} minimumXP={studentProjectSettings.adventureMinXP} isProcessing={isProcessing} onExport={handleSetShowStorybookExportModalToTrue} onSequel={handleStartSequel} canContinue={isTeacherMode || !activeSessionCode} />
                                </>;
                            })()}
                        </div>
                        ) : (
                            <div className="relative w-full h-full bg-black rounded-xl overflow-hidden shadow-2xl group select-none relative">
                                <style>{`
                                  @keyframes adventure-ken-burns {
                                    0% { transform: scale(1) translate(0, 0); }
                                    100% { transform: scale(1.1) translate(-1%, -1%); }
                                  }
                                  .adventure-ken-burns { animation: adventure-ken-burns 20s ease-in-out infinite alternate; }
                                  @media (prefers-reduced-motion: reduce) {
                                    .adventure-ken-burns { animation: none; }
                                  }
                                `}</style>
                                {(adventureState.sceneImage || adventureState.sceneImagePreview) ? (
                                    <img loading="lazy"
                                        src={adventureState.sceneImage || adventureState.sceneImagePreview}
                                        className={`absolute inset-0 w-full h-full ${immersiveHideUI ? 'object-contain' : 'object-cover'} transition-opacity duration-700 adventure-ken-burns motion-reduce:animate-none motion-reduce:transition-none`}
                                        alt=""
                                    />
                                ) : (
                                    <div role="status" aria-live="polite" aria-atomic="true" className="absolute inset-0 bg-slate-900 flex items-center justify-center flex-col gap-4 text-slate-200">
                                        {adventureState.isImageLoading ? (
                                            <>
                                                <RefreshCw size={48} className="animate-spin motion-reduce:animate-none text-indigo-300" aria-hidden="true"/>
                                                <p className="text-sm font-bold animate-pulse motion-reduce:animate-none">{adventureState.loadingStage || t('adventure.generating_scene')}</p>
                                            </>
                                        ) : (
                                            <>
                                                <ImageIcon size={48} className="opacity-40" aria-hidden="true"/>
                                                <p className="text-sm font-bold">{t('adventure.no_image')}</p>
                                            </>
                                        )}
                                    </div>
                                )}
                                {!adventureState.sceneImage && adventureState.sceneImagePreview && (
                                    <div role="status" aria-live="polite" className="absolute left-1/2 top-5 -translate-x-1/2 z-20 bg-black/75 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg backdrop-blur-sm">
                                        {adventureState.imagePolishStage === 'matching' ? 'Matching your cast…' : 'Polishing scene details…'}
                                    </div>
                                )}
                                {theme !== 'contrast' && (
                                    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 pointer-events-none"></div>
                                )}
                                <div className="absolute top-4 left-3 right-3 sm:left-4 sm:right-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-start z-20">
                                    <div className="flex flex-col gap-2 min-w-0">
                                        <div className="bg-black/60 backdrop-blur-md text-white border border-white/20 px-3 py-1 rounded-full text-xs font-bold w-fit max-w-full break-words shadow-sm">
                                            {t('common.level_abbrev')} {adventureState.level}
                                        </div>
                                        {adventureInputMode === 'system' && (
                                            <div className="bg-gradient-to-r from-amber-600/80 to-amber-800/80 backdrop-blur-md text-amber-100 border border-amber-400/50 px-3 py-1 rounded-full text-[11px] font-bold w-fit shadow-lg flex items-center gap-1.5 animate-pulse motion-reduce:animate-none">
                                                {t('adventure.system_simulation')}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/20 pr-3 shadow-sm" title={adventureInputMode === 'system' ? t('adventure.tooltips.stability', { value: energyValue }) : t('adventure.tooltips.energy', { value: energyValue })}>
                                            <div className={`p-1 rounded-full ${adventureInputMode === 'system' ? 'bg-amber-500/20' : 'bg-yellow-500/20'}`}>
                                                <Zap size={12} aria-hidden="true" className={`fill-current ${adventureInputMode === 'system' ? 'text-amber-400' : 'text-yellow-400'}`} />
                                            </div>
                                            <div className="w-12 sm:w-24 min-w-0 h-2 bg-black/50 rounded-full overflow-hidden border border-white/10" role="progressbar" aria-label={adventureInputMode === 'system' ? t('adventure.tooltips.stability', { value: energyValue }) : t('adventure.tooltips.energy', { value: energyValue })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={energyValue}>
                                                <div
                                                    aria-hidden="true" className={`h-full transition-all duration-500 motion-reduce:transition-none ${adventureInputMode === 'system' ? 'bg-gradient-to-r from-amber-400 to-amber-600' : 'bg-gradient-to-r from-yellow-400 to-orange-500'}`}
                                                    style={{ width: energyValue + '%' }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md p-1.5 rounded-full border border-white/20 pr-3 shadow-sm" title={t('adventure.tooltips.xp', { current: adventureState.xp, next: adventureState.xpToNextLevel })}>
                                            <div className="bg-indigo-500/20 p-1 rounded-full">
                                                <Trophy size={12} className="text-indigo-300 fill-current" aria-hidden="true" />
                                            </div>
                                            <div className="w-12 sm:w-24 min-w-0 h-2 bg-black/50 rounded-full overflow-hidden border border-white/10" role="progressbar" aria-label={t('common.xp') || 'XP'} aria-valuemin={0} aria-valuemax={xpMax} aria-valuenow={xpValue} aria-valuetext={t('adventure.tooltips.xp', { current: xpValue, next: xpMax })}>
                                                <div
                                                    className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all duration-500 motion-reduce:transition-none" aria-hidden="true"
                                                    style={{ width: xpProgressPercent + '%' }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <div className="flex gap-2">
                                            <button type="button"
                                                aria-label={adventureAutoRead ? t('adventure.auto_read_off_tooltip') : t('adventure.auto_read_on_tooltip')}
                                                aria-pressed={adventureAutoRead}
                                                data-help-key="adventure_immersive_autoread"
                                                onClick={() => {
                                                    const newState = !adventureAutoRead;
                                                    setAdventureAutoRead(newState);
                                                    if (!newState) stopPlayback();
                                                }}
                                                className={`min-w-11 min-h-11 backdrop-blur-md border p-2 rounded-full transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${adventureAutoRead ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/50' : 'bg-black/50 text-white/70 border-white/20 hover:bg-white/20 hover:text-white'}`}
                                                title={adventureAutoRead ? t('adventure.auto_read_off_tooltip') : t('adventure.auto_read_on_tooltip')}
                                            >
                                                {adventureAutoRead ? <Volume2 size={16} className="fill-current" aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
                                            </button>
                                            {adventureFluencyEnabled && adventureState.currentScene && (
                                                <button type="button"
                                                    aria-label={t('adventure.fluency_title') || 'Practice reading this scene'}
                                                    aria-haspopup="dialog"
                                                    data-help-key="adventure_immersive_reading_practice"
                                                    onClick={() => { stopPlayback(); setAdventureFluencyOpen(true); }}
                                                    className="min-w-11 min-h-11 bg-rose-800/90 backdrop-blur-md text-white border border-rose-400 p-2 rounded-full hover:bg-rose-700 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                                                    title={t('adventure.fluency_title') || 'Practice reading this scene'}
                                                >
                                                    <Mic size={16} aria-hidden="true" />
                                                </button>
                                            )}
                                            <button type="button"
                                                aria-label={immersiveHideUI ? t('adventure.show_ui') : t('adventure.hide_ui')}
                                                aria-pressed={immersiveHideUI}
                                                data-help-key="adventure_immersive_toggle_ui" onClick={handleToggleImmersiveHideUI}
                                                className={`min-w-11 min-h-11 backdrop-blur-md border p-2 rounded-full transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${immersiveHideUI ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/50' : 'bg-black/50 text-white/70 border-white/20 hover:bg-white/20 hover:text-white'}`}
                                                title={immersiveHideUI ? t('adventure.show_ui') : t('adventure.hide_ui')}
                                            >
                                                {immersiveHideUI ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                                            </button>
                                            <button type="button"
                                                aria-label={t('adventure.tooltips.exit_immersive')}
                                                data-help-key="adventure_immersive_exit" onClick={handleExitAdventureImmersive}
                                                className="min-w-11 min-h-11 bg-black/50 backdrop-blur-md text-white border border-white/40 p-2 rounded-full hover:bg-white/20 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                                                title={t('adventure.tooltips.exit_immersive')}
                                            >
                                                <Minimize size={16} aria-hidden="true" />
                                            </button>
                                        </div>
                                        <div className="bg-black/50 backdrop-blur-md text-yellow-300 border border-yellow-500/60 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm">
                                            <span className="text-sm" aria-hidden="true">💰</span> {adventureState.gold}
                                        </div>
                                        <div className="relative">
                                            <button type="button"
                                                aria-label={t('adventure.inventory')}
                                                aria-expanded={showImmersiveInventory}
                                                aria-controls="adventure-immersive-inventory"
                                                data-help-key="adventure_immersive_inventory" onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowImmersiveInventory(!showImmersiveInventory);
                                                }}
                                                className={`min-w-11 min-h-11 backdrop-blur-md border p-2 rounded-full transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                                                    showImmersiveInventory
                                                    ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/50'
                                                    : 'bg-black/50 text-white border-white/20 hover:bg-white/20'
                                                }`}
                                                title={t('adventure.inventory')}
                                            >
                                                <Backpack size={16} aria-hidden="true" />
                                            </button>
                                            {showImmersiveInventory && (
                                                <div id="adventure-immersive-inventory" role="region" aria-label={t('adventure.inventory')} className="absolute top-full right-0 mt-2 w-56 bg-black/80 backdrop-blur-md border border-white/40 rounded-xl p-2 shadow-xl z-50 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 motion-reduce:animate-none">
                                                    {adventureInputMode === 'system' && enableFactionResources && (
                                                        <div className="border-b border-amber-500/30 pb-2">
                                                            <div className="text-[11px] font-bold text-amber-200 uppercase tracking-wide mb-1 flex items-center gap-1">
                                                                <span aria-hidden="true">📊</span> {t('adventure.system_state')}
                                                            </div>
                                                            {(adventureState.systemResources || []).length > 0 ? (
                                                                <div className="grid grid-cols-2 gap-1">
                                                                    {adventureState.systemResources.map((resource, idx) => (
                                                                        <div
                                                                            key={`${resource.name}-${idx}`}
                                                                            className="bg-gradient-to-r from-amber-900/40 to-amber-800/20 border border-amber-600/30 rounded-lg px-2 py-1 flex items-center gap-1.5 hover:border-amber-400/50 transition-all cursor-default"
                                                                            title={`${resource.name}: ${resource.quantity}${resource.unit || ''} (${resource.type || 'strategic'})`}
                                                                        >
                                                                            <span className="text-sm" aria-hidden="true">{resource.icon || '📊'}</span>
                                                                            <div className="flex flex-col leading-none">
                                                                                <span className="text-[11px] text-amber-200/80 truncate max-w-[60px]">{resource.name}</span>
                                                                                <span className="text-xs text-amber-200 font-bold">{resource.quantity}{resource.unit && <span className="text-amber-400/70 font-normal ml-0.5 text-[11px]">{resource.unit}</span>}</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-center text-[11px] text-amber-200/50 py-1 italic">
                                                                    No state variables yet
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    <div>
                                                        {adventureInputMode === 'system' && (
                                                            <div className="text-[11px] font-bold text-indigo-300 uppercase tracking-wide mb-1 flex items-center gap-1">
                                                                <span aria-hidden="true">📜</span> Policies & Agreements
                                                            </div>
                                                        )}
                                                        {adventureState.inventory.length > 0 ? (
                                                            <div className="grid grid-cols-4 gap-2">
                                                                {adventureState.inventory.map((item) => (
                                                                    <button
                                                                        key={item.id}
                                                                        type="button"
                                                                        aria-label={item.name}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedInventoryItem(item);
                                                                            setShowImmersiveInventory(false);
                                                                        }}
                                                                        className="group relative w-11 h-11 bg-white/10 rounded-lg border border-white/40 hover:bg-indigo-600 hover:border-indigo-400 flex items-center justify-center transition-all overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                                                                        title={item.name}
                                                                    >
                                                                        {item.image ? (
                                                                            <img loading="lazy" src={item.image} alt="" className="w-full h-full object-contain p-1" />
                                                                        ) : (
                                                                            <span className="text-xs font-bold text-white">{item.icon || item.name.charAt(0)}</span>
                                                                        )}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-center text-[11px] text-white/50 py-2 italic">
                                                                {adventureInputMode === 'system' ? 'No policies enacted' : t('adventure.inventory_empty')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {!immersiveHideUI && (
                                <div className="absolute bottom-0 left-0 right-0 px-2 sm:px-4 pb-2 z-30 flex flex-col justify-end">
                                    <div className="bg-black/70 backdrop-blur-md border-t-2 border-white/20 p-3 pt-6 sm:p-6 rounded-2xl shadow-lg relative min-h-[200px] flex flex-col justify-center">
                                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-40">
                                             <button
                                                 type="button"
                                                 aria-pressed={immersiveShowChoices}
                                                 aria-label={immersiveShowChoices ? t('adventure.return_to_story') : (adventureState.isGameOver ? adventureSettingsText(t, 'recap_title', 'Episode recap') : t('adventure.make_a_choice'))}
                                                data-help-key="adventure_choice_toggle" onClick={handleToggleImmersiveShowChoices}
                                                className="min-h-11 bg-indigo-600 text-white text-xs font-bold px-6 py-2 rounded-full border-2 border-white/20 shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all motion-reduce:transform-none flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                                             >
                                                {immersiveShowChoices || adventureState.isGameOver ? <BookOpen size={14} aria-hidden="true"/> : <MousePointerClick size={14} aria-hidden="true"/>}
                                                {immersiveShowChoices ? t('adventure.return_to_story') : (adventureState.isGameOver ? adventureSettingsText(t, 'recap_title', 'Episode recap') : t('adventure.make_a_choice'))}
                                             </button>
                                        </div>
                                        {immersiveShowChoices ? (
                                            <div data-adventure-actions="immersive" role="region" aria-label={adventureSettingsText(t, 'available_actions', 'Available actions')} style={adventureVisualTokens(theme, true)} className="max-h-[55vh] overflow-y-auto overscroll-contain p-1 animate-in motion-reduce:animate-none fade-in slide-in-from-bottom-4 duration-300">
                                                {adventureState.currentScene && <AdventureDecisionProgress state={adventureState} t={t} theme={theme} immersive />}
                                                {adventureState.isGameOver ? (
                                                    <AdventureEpisodeRecap state={adventureState} t={t} theme={theme} mode={adventureInputMode} social={props.isSocialStoryMode} minimumXP={studentProjectSettings.adventureMinXP} isProcessing={isProcessing} onExport={handleSetShowStorybookExportModalToTrue} onSequel={handleStartSequel} canContinue={isTeacherMode || !activeSessionCode} immersive />
                                                ) : failedAdventureAction ? (
                                                    <div role="alert" aria-atomic="true" className="w-full bg-red-900/90 border-2 border-red-500 rounded-xl p-6 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none backdrop-blur-sm">
                                                        <div className="bg-red-500 p-3 rounded-full mb-3 text-white">
                                                            <WifiOff size={24} aria-hidden="true" />
                                                        </div>
                                                        <h3 className="font-bold text-white mb-1">{t('adventure.interrupted_title')}</h3>
                                                        <p className="text-red-200 text-sm mb-4 max-w-xs">
                                                            {t('adventure.interrupted_desc')}
                                                        </p>
                                                        <button type="button" aria-label={t('common.retry_adventure_turn')}
                                                            onClick={handleRetryAdventureTurn}
                                                            className="min-h-11 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 motion-reduce:transform-none border border-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-red-900"
                                                        >
                                                            <RefreshCw size={18} aria-hidden="true" /> {t('adventure.retry_action')}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    adventureState.currentScene && (
                                                        adventureFreeResponseEnabled ? (
                                                            <div className="flex flex-col gap-3">
                                                                {!isTeacherMode && activeSessionCode ? (
                                                                    <div role="status" className="rounded-xl border border-indigo-300 bg-indigo-950/80 p-4 text-sm text-indigo-100">
                                                                        <strong className="block text-white">{t('adventure.teacher_controls_live') || 'The teacher controls this class adventure.'}</strong>
                                                                        <span className="mt-1 block">{t('adventure.wait_for_action_round') || 'When a class-action round opens, submit your idea in the private live prompt. Free responses and votes are sent peer to peer.'}</span>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        {isTeacherMode && activeSessionCode && typeof openAdventureActionVote === 'function' ? (
                                                                            <div className="rounded-xl border border-emerald-300 bg-emerald-950/70 p-3">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={openAdventureActionVote}
                                                                                    className="min-h-11 w-full rounded-lg border border-emerald-300 bg-emerald-700 px-3 py-2 text-sm font-black text-white hover:bg-emerald-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                                                                                >
                                                                                    <Users size={16} aria-hidden="true" /> {t('adventure.collect_class_actions') || 'Collect and vote on class actions'}
                                                                                </button>
                                                                                <p className="m-0 mt-2 text-[11px] leading-snug text-emerald-100">{t('adventure.collect_class_actions_privacy') || 'Student proposals and votes use the existing peer-to-peer Live Polling channel and are not written to the session document.'}</p>
                                                                            </div>
                                                                        ) : null}
                                                                        {renderStrategyHintCard(true)}
                                                                        <textarea
                                                                            aria-label={t('adventure.aria_free_response') || 'Type your adventure action'}
                                                                            data-help-key="adventure_input_field" value={adventureTextInput}
                                                                            onChange={handleAdventureTextChange}
                                                                            onFocus={typingPace.resume}
                                                                            onBlur={typingPace.pause}
                                                                            onPaste={() => typingPace.markAssisted('paste')}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter' && !e.shiftKey && adventureTextInput.trim() && !adventureState.isLoading) {
                                                                                    e.preventDefault();
                                                                                    handleAdventureTextSubmit();
                                                                                }
                                                                            }}
                                                                            placeholder={t('adventure.action_placeholder_short')}
                                                                            className="w-full bg-black/50 text-white border border-white/30 rounded-xl p-3 focus:border-white focus:ring-2 focus:ring-white/20 outline-none resize-none h-24 text-sm font-medium placeholder:text-white/50 backdrop-blur-sm"
                                                                            autoFocus
                                                                        />
                                                                        {renderTypingPace(true)}
                                                                        <button
                                                                            type="button" data-help-key="adventure_input_send" onClick={() => handleAdventureTextSubmit()}
                                                                            disabled={!adventureTextInput.trim() || adventureState.isLoading}
                                                                            className="min-h-11 w-full bg-white/10 hover:bg-white/20 border border-white/30 hover:border-white text-white p-3 rounded-xl font-bold transition-all active:scale-95 motion-reduce:transform-none backdrop-blur-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                                                                        >
                                                                            <Send size={16} aria-hidden="true" /> {t('adventure.send_action')}
                                                                        </button>
                                                                        {renderStrategyHintButton(true)}
                                                                    </>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                {renderDemocracyStatus(true)}
                                                                {(() => {
                                                                    const mainTextParagraphs = adventureState.currentScene.text.split(/\n{2,}/);
                                                                    const isTable = (p) => p.trim().startsWith('|') || p.includes('\n|');
                                                                    const textSentenceCount = mainTextParagraphs.flatMap(p => isTable(p) ? [] : splitTextToSentences(p)).length;
                                                                    return adventureState.currentScene.options.map((opt, idx) => {
                                                                        const isDemocracy = democracyActive;
                                                                        const optionValue = normalizeAdventureVoteOption(opt);
                                                                        const voteCount = isTeacherMode ? Object.values(democracyVotes).filter(v => String(v).trim() === optionValue).length : 0;
                                                                        const percent = isTeacherMode && democracyTotalVotes > 0 ? Math.round((voteCount / democracyTotalVotes) * 100) : 0;
                                                                        const isMyVote = isDemocracy && !isTeacherMode && !!currentUserVote && currentUserVote === optionValue;
                                                                        const isReadingThisOption = isPlaying && (playingContentId === 'adventure-option-' + idx ||
                                                                          (playingContentId === 'adventure-active' && playbackState.currentIdx === (textSentenceCount + idx)));
                                                                        return (
                                                                            <div key={idx} data-adventure-choice data-reading={isReadingThisOption || undefined} className={adventureChoiceClass(isMyVote, isReadingThisOption)}>
                                                                                <div className="flex items-start gap-1">
                                                                                    <button type="button" data-help-key="adventure_choice_btn" onClick={() => handleAdventureChoice(opt)} disabled={adventureState.isLoading}
                                                                                        aria-pressed={isDemocracy && !isTeacherMode ? isMyVote : undefined}
                                                                                        className="min-h-11 min-w-0 flex-1 flex flex-col sm:flex-row items-start gap-2 sm:gap-3 p-3 rounded-xl text-left text-sm leading-relaxed font-semibold hover:bg-[var(--av-wash)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] disabled:opacity-50 disabled:cursor-not-allowed">
                                                                                        <span aria-hidden="true" className="w-7 h-7 shrink-0 rounded-lg border border-[var(--av-control)] bg-[var(--av-wash)] text-[var(--av-accent)] flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                                                                                        <span className="min-w-0 pt-0.5 [overflow-wrap:anywhere]">{typeof opt === 'object' && opt?.action ? opt.action : opt}</span>
                                                                                    </button>
                                                                                    {renderAdventureChoiceListen(opt, idx)}
                                                                                </div>
                                                                                {renderAdventureChoiceStatus(isDemocracy, isMyVote, voteCount, percent, isReadingThisOption)}
                                                                            </div>
                                                                        );
                                                                    });
                                                                })()}
                                                            </div>
                                                        )
                                                    )
                                                )}
                                            </div>
                                        ) : (
                                            <div data-adventure-reader role="region" aria-label={adventureSettingsText(t, 'story_and_feedback', 'Story and feedback')} style={adventureVisualTokens(theme, true)} className="max-h-[55vh] overflow-y-auto overscroll-contain p-1 space-y-4 animate-in motion-reduce:animate-none fade-in slide-in-from-bottom-4 duration-300">
                                                {adventureState.pendingChoice && adventureState.isLoading && (
                                                    <div role="status" aria-live="polite" aria-atomic="true" className="mb-4 animate-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none">
                                                        <div className="bg-amber-900/80 backdrop-blur-sm border border-amber-500/50 rounded-xl p-4 shadow-lg">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="text-amber-700 font-bold text-xs uppercase tracking-wider">⚔️ {t('adventure.your_choice') || 'Your Choice'}</span>
                                                            </div>
                                                            <p className="text-amber-100 text-sm font-medium italic leading-relaxed">"{adventureState.pendingChoice}"</p>
                                                            <div className="flex items-center gap-2 mt-3">
                                                                <div aria-hidden="true" className="w-2 h-2 bg-amber-400 rounded-full animate-pulse motion-reduce:animate-none"></div>
                                                                <p className="text-amber-300 text-xs animate-pulse motion-reduce:animate-none">{t('adventure.story_unfolds') || 'The story unfolds...'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {(() => {
                                                    const lastFeedback = adventureState.history.slice().reverse().find(h => h && h.type === 'feedback');
                                                    if (lastFeedback) {
                                                        return (
                                                            <div role="status" aria-live="polite" aria-atomic="true" className="text-yellow-300 text-sm mb-3 italic font-medium border-b border-white/20 pb-2">
                                                                {lastFeedback.consequence?.version === 1 ? <AdventureConsequenceCard consequence={lastFeedback.consequence} t={t} theme={theme} immersive/> : renderFormattedText(lastFeedback.text, false, true)}
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}
                                                <div role="region" aria-label={t('adventure.current_scene')} className="text-lg md:text-xl text-slate-100 font-medium leading-relaxed font-serif text-shadow-sm min-h-[80px]">
                                                    {adventureState.currentScene && (
                                                            <div className="space-y-4" onPointerEnter={() => { if (prewarmAdventureAudio && adventureState.currentScene) prewarmAdventureAudio(adventureState.currentScene.text, adventureState.currentScene.voices); }}>
                                                                {(() => {
                                                                    const paragraphs = adventureState.currentScene.text.split(/\n{2,}/);
                                                                    let sentenceCounter = 0;
                                                                    return paragraphs.map((para, pIdx) => {
                                                                        const sentences = splitTextToSentences(para);
                                                                        if (sentences.length === 0) return null;
                                                                        return (
                                                                            <p key={pIdx} className="mb-4 leading-relaxed">
                                                                                {sentences.map((s, sIdx) => {
                                                                                    const currentGlobalIdx = sentenceCounter;
                                                                                    sentenceCounter++;
                                                                                    const isActive = playbackState.currentIdx === currentGlobalIdx && playingContentId === 'adventure-active';
                                                                                    const isHtmlHeader = /^<h([1-6])[^>]*>/i.test(s.trim());
                                                                                    const isHeader = s.trim().startsWith('#') || isHtmlHeader;
                                                                                    const cleanText = isHeader ? (isHtmlHeader ? s.trim().replace(/<\/?h[1-6][^>]*>/gi, '') : s.trim().replace(/^#+\s*/, '')) : s;
                                                                                    // Per-sentence read-aloud (immersive/dark theme): the sentence TEXT is
                                                                                    // the control — inline speaker button removed 2026-07-16 per Aaron
                                                                                    // (see the light-theme renderer above for the rationale).
                                                                                    return (
                                                                                        <span
                                                                                            key={sIdx}
                                                                                            id={`sentence-${currentGlobalIdx}`}
                                                                                            role="button"
                                                                                            tabIndex={0}
                                                                                            aria-pressed={isActive}
                                                                                            aria-label={(t('adventure.read_aloud_title') || t('common.click_read_aloud') || 'Read aloud') + ': ' + cleanText.replace(/\*\*/g, '').trim()}
                                                                                            title={t('adventure.read_aloud_title') || t('common.click_read_aloud')}
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                handleSpeak(adventureState.currentScene.text, 'adventure-active', currentGlobalIdx);
                                                                                            }}
                                                                                            onKeyDown={(e) => {
                                                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                                                    e.preventDefault();
                                                                                                    e.stopPropagation();
                                                                                                    handleSpeak(adventureState.currentScene.text, 'adventure-active', currentGlobalIdx);
                                                                                                }
                                                                                            }}
                                                                                            className={`transition-colors duration-300 motion-reduce:transition-none rounded px-1 py-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${
                                                                                                isActive
                                                                                                    ? 'bg-cyan-700 text-white shadow-sm ring-2 ring-cyan-400/50'
                                                                                                    : 'hover:bg-white/10'
                                                                                            } ${isHeader ? 'font-bold block text-2xl mt-2 text-yellow-400' : ''}`}
                                                                                        >
                                                                                            {formatInteractiveText(cleanText.replace(/\*\*([^*]+)\*\*/g, '$1'), false, true)}
                                                                                            {" "}
                                                                                        </span>
                                                                                    );
                                                                                })}
                                                                            </p>
                                                                        );
                                                                    });
                                                                })()}
                                                            </div>
                                                    )}
                                                </div>
                                                <AdventureJourneyNotebook history={adventureState.history} t={t} theme={theme} renderFormattedText={renderFormattedText} immersive />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                )}
                            </div>
                        )}
                        {!adventureState.isImmersiveMode && (
                        <div data-adventure-actions="standard" role="region" aria-label={adventureSettingsText(t, 'available_actions', 'Available actions')} style={adventureVisualTokens(theme)} className="p-4 bg-[var(--av-surface)] border-t border-[var(--av-line)] shrink-0 max-h-[45vh] sm:max-h-[50vh] overflow-y-auto overscroll-contain">
                            {adventureState.currentScene && <AdventureDecisionProgress state={adventureState} t={t} theme={theme} />}
                            {adventureState.currentScene && !adventureState.isGameOver ? (
                                <div className="space-y-3">
                                    {adventureInputMode === 'debate' && adventureState.debatePhase === 'setup' && (
                                        <div className="text-center mb-2 animate-in motion-reduce:animate-none slide-in-from-top-2">
                                             <span className="bg-teal-100 text-teal-800 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full border border-teal-200 shadow-sm flex items-center justify-center gap-2 w-fit mx-auto">
                                                <Scale size={12} /> {t('adventure.debate_stance')}
                                             </span>
                                        </div>
                                    )}
                                    {failedAdventureAction ? (
                                        <div role="alert" aria-atomic="true" className="w-full bg-red-50 border-2 border-red-200 rounded-xl p-6 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-2 motion-reduce:animate-none">
                                            <div className="bg-red-100 p-3 rounded-full mb-3 text-red-500">
                                                <WifiOff size={24} aria-hidden="true" />
                                            </div>
                                            <h3 className="font-bold text-red-900 mb-1">{t('adventure.interrupted_title')}</h3>
                                            <p className="text-red-700/80 text-sm mb-4 max-w-xs">
                                                {t('adventure.interrupted_desc')}
                                            </p>
                                            <button type="button" aria-label={t('common.retry_adventure_turn')}
                                                onClick={handleRetryAdventureTurn}
                                                className="min-h-11 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
                                            >
                                                <RefreshCw size={18} aria-hidden="true" /> {t('adventure.retry_action')}
                                            </button>
                                        </div>
                                    ) : isEditingOptions ? (
                                        <div className="flex flex-col gap-2 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 mb-4 animate-in motion-reduce:animate-none fade-in">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-wider">{t('adventure.editing_header')}</h4>
                                                <div className="text-[11px] text-indigo-600 italic">{t('adventure.editing_subtext')}</div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {editingOptionsBuffer.map((opt, idx) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <input aria-label={t('adventure.option_placeholder', { n: idx + 1 })}
                                                            type="text"
                                                            value={opt}
                                                            onChange={(e) => handleOptionBufferChange(idx, e.target.value)}
                                                            className="flex-grow p-3 rounded-xl border-2 border-indigo-600 text-sm font-bold text-indigo-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                                            placeholder={t('adventure.option_placeholder', { n: idx + 1 })}
                                                        />
                                                        <button
                                                            type="button" aria-label={(t('adventure.tooltips.remove_option') || 'Remove option') + ' ' + (idx + 1)}
                                                            onClick={() => handleRemoveOptionSlot(idx)}
                                                            className="min-w-11 min-h-11 p-2 text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700 focus-visible:ring-offset-2"
                                                            title={t('adventure.tooltips.remove_option')}
                                                        >
                                                            <X size={16} aria-hidden="true" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button type="button"
                                                    onClick={handleAddOptionSlot}
                                                    className="min-h-11 p-3 rounded-xl border-2 border-dashed border-indigo-400 text-indigo-700 hover:bg-indigo-50 font-bold text-sm transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
                                                >
                                                    <Plus size={16} aria-hidden="true" /> {t('adventure.add_option')}
                                                </button>
                                            </div>
                                            <div className="flex gap-2 mt-4 pt-3 border-t border-indigo-100">
                                                <button type="button"
                                                    onClick={handleBroadcastOptions}
                                                    className="min-h-11 flex-grow bg-green-700 text-white font-bold py-3 rounded-xl shadow-md hover:bg-green-800 transition-all flex items-center justify-center gap-2 active:scale-95 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-800 focus-visible:ring-offset-2"
                                                >
                                                    <Wifi size={18} aria-hidden="true" /> {t('adventure.broadcast')}
                                                </button>
                                                <button type="button"
                                                    onClick={handleSetIsEditingOptionsToFalse}
                                                    className="min-h-11 px-6 py-3 bg-white text-slate-700 font-bold rounded-xl border border-slate-500 hover:bg-slate-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2"
                                                >
                                                    {t('common.cancel')}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (!adventureFreeResponseEnabled || (adventureInputMode === 'debate' && adventureState.debatePhase === 'setup')) ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {renderDemocracyStatus(false)}
                                            {(() => {
                                                const mainTextParagraphs = adventureState.currentScene.text.split(/\n{2,}/);
                                                const isTable = (p) => p.trim().startsWith('|') || p.includes('\n|');
                                                const textSentenceCount = mainTextParagraphs.flatMap(p => isTable(p) ? [] : splitTextToSentences(p)).length;
                                                return adventureState.currentScene.options.map((opt, idx) => {
                                                    const isDebateSetup = adventureInputMode === 'debate' && adventureState.debatePhase === 'setup';
                                                    const isDemocracy = democracyActive && !isDebateSetup;
                                                    const optionValue = normalizeAdventureVoteOption(opt);
                                                    const voteCount = isTeacherMode ? Object.values(democracyVotes).filter(v => String(v).trim() === optionValue).length : 0;
                                                    const percent = isTeacherMode && democracyTotalVotes > 0 ? Math.round((voteCount / democracyTotalVotes) * 100) : 0;
                                                    const isMyVote = isDemocracy && !isTeacherMode && !!currentUserVote && currentUserVote === optionValue;
                                                    const isReadingThisOption = isPlaying && (playingContentId === 'adventure-option-' + idx ||
                                                      (playingContentId === 'adventure-active' && playbackState.currentIdx === (textSentenceCount + idx)));
                                                    return (
                                                        <div key={idx} data-adventure-choice data-reading={isReadingThisOption || undefined} className={adventureChoiceClass(isMyVote, isReadingThisOption)}>
                                                            <div className="flex items-start gap-1">
                                                                <button type="button" data-help-key="adventure_choice_btn" onClick={() => handleAdventureChoice(opt)} disabled={adventureState.isLoading}
                                                                    aria-pressed={isDemocracy && !isTeacherMode ? isMyVote : undefined}
                                                                    className="min-h-11 min-w-0 flex-1 flex flex-col sm:flex-row items-start gap-2 sm:gap-3 p-3 rounded-xl text-left text-sm leading-relaxed font-semibold hover:bg-[var(--av-wash)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--av-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--av-surface)] disabled:opacity-50 disabled:cursor-not-allowed">
                                                                    <span aria-hidden="true" className="w-7 h-7 shrink-0 rounded-lg border border-[var(--av-control)] bg-[var(--av-wash)] text-[var(--av-accent)] flex items-center justify-center text-xs font-bold">{isDebateSetup ? <Scale size={14} aria-hidden="true" /> : idx + 1}</span>
                                                                    <span className="min-w-0 pt-0.5 [overflow-wrap:anywhere]">{typeof opt === 'object' && opt?.action ? opt.action : opt}</span>
                                                                </button>
                                                                {renderAdventureChoiceListen(opt, idx)}
                                                            </div>
                                                            {renderAdventureChoiceStatus(isDemocracy, isMyVote, voteCount, percent, isReadingThisOption)}
                                                        </div>
                                                    );
                                                });
                                            })()}
                                        </div>
                                    ) : (
                                        <div className="flex gap-2 animate-in motion-reduce:animate-none fade-in slide-in-from-bottom-2">
                                            <button
                                                aria-label={isDictationMode ? t('adventure.tooltips.dictation_stop') : t('adventure.tooltips.dictation_start')} aria-pressed={isDictationMode}
                                                type="button"
                                                onClick={() => {
                                                    const newState = !isDictationMode;
                                                    setIsDictationMode(newState);
                                                    if (newState && adventureInputRef.current) {
                                                        setTimeout(() => adventureInputRef.current.focus(), 100);
                                                    }
                                                }}
                                                className={`min-w-11 min-h-11 p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2 ${isDictationMode ? 'bg-red-50 border-red-500 text-red-700 animate-pulse motion-reduce:animate-none' : 'bg-white border-indigo-300 text-slate-700 hover:text-indigo-700 hover:border-indigo-500'}`}
                                                title={isDictationMode ? t('adventure.tooltips.dictation_stop') : t('adventure.tooltips.dictation_start')}
                                            >
                                                {isDictationMode ? <Mic size={20} aria-hidden="true" /> : <MicOff size={20} aria-hidden="true" />}
                                            </button>
                                            <div className="flex min-w-0 flex-grow flex-col gap-1.5">
                                                <textarea
                                                    ref={adventureInputRef}
                                                    data-help-key="adventure_input_field" value={adventureTextInput}
                                                    onChange={handleAdventureTextChange}
                                                    onFocus={typingPace.resume}
                                                    onBlur={typingPace.pause}
                                                    onPaste={() => typingPace.markAssisted('paste')}
                                                    placeholder={adventureInputMode === 'debate' ? t('adventure.placeholder_debate') : t('adventure.placeholder_action')}
                                                    aria-label={adventureInputMode === 'debate' ? t('adventure.aria_debate') : t('adventure.aria_action')}
                                                    className="w-full p-3 text-sm border border-purple-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-500/30 outline-none resize-none h-20 bg-purple-50 text-purple-900 placeholder:text-purple-300 transition-shadow duration-300"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' && !e.shiftKey && adventureTextInput.trim() && !adventureState.isLoading) {
                                                            e.preventDefault();
                                                            handleAdventureTextSubmit();
                                                        }
                                                    }}
                                                />
                                                {renderTypingPace(false)}
                                            </div>
                                            <button
                                                type="button" data-help-key="adventure_input_send" onClick={() => handleAdventureTextSubmit()}
                                                disabled={!adventureTextInput.trim() || adventureState.isLoading}
                                                className="min-w-[80px] min-h-11 bg-indigo-600 text-white px-4 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex flex-col items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
                                            >
                                                <Send size={18} aria-hidden="true" />
                                                <span className="text-[11px]">{t('adventure.act_button')}</span>
                                            </button>
                                        </div>
                                    )}
                                    {handleAdventureHint && adventureFreeResponseEnabled && adventureState.currentScene && !adventureState.isGameOver && (
                                        <div className="w-full mt-2 flex flex-col gap-2">
                                            {renderStrategyHintCard(false)}
                                            {renderStrategyHintButton(false)}
                                        </div>
                                    )}
                                    {adventureState.canStartSequel && (
                                        <div className="w-full mt-6 pt-6 border-t border-slate-200 animate-in fade-in slide-in-from-bottom-4 motion-reduce:animate-none flex flex-col items-center">
                                            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">
                                                {t('adventure.sequel_prompt')}
                                            </p>
                                            <button type="button"
                                                aria-label={t('adventure.start_sequel')}
                                                onClick={handleStartSequel}
                                                className="min-h-11 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-black text-lg shadow-xl hover:scale-105 hover:shadow-2xl transition-all motion-reduce:transform-none flex items-center gap-3 border-2 border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
                                            >
                                                <Sparkles size={20} aria-hidden="true" />
                                                {t('adventure.start_sequel')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center text-xs text-slate-600 italic">
                                    {adventureState.isGameOver ? t('adventure.status.reset_prompt') : t('adventure.status.waiting')}
                                </div>
                            )}
                        </div>
                        )}
                    </div>
                    <AdventureFluencyPractice
                        open={adventureFluencyOpen}
                        onClose={() => setAdventureFluencyOpen(false)}
                        onSave={saveAdventureFluencyResult}
                        t={t}
                        sceneText={adventureState.currentScene?.text || ''}
                        sceneId={adventureState.currentScene?.id || adventureState.turnCount}
                        turnCount={adventureState.turnCount}
                        language={adventureLanguageMode}
                        gradeLevel={props.gradeLevel}
                        stopPlayback={stopPlayback}
                    />
                    {selectedInventoryItem && (
                        <div role="presentation" className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200 motion-reduce:animate-none" onClick={handleSetSelectedInventoryItemToNull}>
                            <div ref={inventoryDialogRef} tabIndex={-1} className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 max-w-sm w-full max-h-[calc(100vh-1rem)] overflow-y-auto relative border-4 border-indigo-200 transition-all animate-in zoom-in-95 motion-reduce:animate-none" role="dialog" aria-modal="true" aria-labelledby="adventure-inventory-item-title" aria-describedby="adventure-inventory-item-description" onClick={e => e.stopPropagation()}>
                                <button type="button" onClick={handleSetSelectedInventoryItemToNull} className="absolute top-2 right-2 sm:top-3 sm:right-3 min-w-11 min-h-11 text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2" aria-label={t('common.close')}><X size={20} aria-hidden="true"/></button>
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-24 h-24 bg-indigo-50 rounded-xl border-2 border-indigo-100 flex items-center justify-center mb-4 shadow-inner relative overflow-hidden group">
                                        {selectedInventoryItem.image ? (
                                            <img loading="lazy" src={selectedInventoryItem.image} alt="" className="w-full h-full object-contain pixelated" style={STYLE_IMAGE_PIXELATED} />
                                        ) : (
                                            <span className="text-4xl" aria-hidden="true">{selectedInventoryItem.icon || "📦"}</span>
                                        )}
                                        <div aria-hidden="true" className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full"></div>
                                    </div>
                                    <h3 id="adventure-inventory-item-title" className="text-xl font-black text-indigo-900 mb-1">{selectedInventoryItem.name}</h3>
                                    <span className="inline-block max-w-full truncate whitespace-nowrap text-[11px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full mb-3 border border-indigo-300" title={t(`adventure.effects.${selectedInventoryItem.effectType}_label`) || t(`adventure.effects.${selectedInventoryItem.effectType}`) || selectedInventoryItem.effectType || "Consumable"}>
                                        {t(`adventure.effects.${selectedInventoryItem.effectType}_label`) || t(`adventure.effects.${selectedInventoryItem.effectType}`) || selectedInventoryItem.effectType || "Consumable"}
                                    </span>
                                    <p id="adventure-inventory-item-description" className="text-sm text-slate-700 mb-6 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-300 w-full">
                                        {selectedInventoryItem.description || t('adventure.inventory_fallback_desc')}
                                    </p>
                                    <div className="flex gap-3 w-full">
                                        {selectedInventoryItem.effectType === 'key_item' ? (
                                            <button type="button"
                                                disabled
                                                className="min-h-11 flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl border-2 border-slate-300 cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                <Lock size={16} aria-hidden="true"/> {t('adventure.key_item_btn')}
                                            </button>
                                        ) : (
                                            <button type="button"
                                                onClick={handleUseItem}
                                                className="min-h-11 flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-95 motion-reduce:transform-none flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 focus-visible:ring-offset-2"
                                            >
                                                <Sparkles size={16} aria-hidden="true"/> {t('adventure.use_item')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                  </div>
                  </ErrorBoundary>
  );
}
