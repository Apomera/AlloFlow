/**
 * AlloFlow Directions Result View
 *
 * Presentation-only renderer for a prepared assignment-directions result.
 * The host owns normalization, objective evaluation, student-safety filtering,
 * markdown rendering/sanitization, persistence, history, and navigation. Only
 * bounded display records and semantic ID callbacks cross this boundary.
 */

const directionsResultNoop = () => undefined;

function directionsResultText(value, fallback, maxLength) {
  if (typeof value !== 'string') return fallback;
  const text = value.trim();
  if (!text) return fallback;
  return text.slice(0, maxLength || 240);
}

function directionsResultTranslation(t, key, fallback, params, maxLength) {
  if (typeof t === 'function') {
    try {
      const translated = t(key, params);
      if (translated && translated !== key) return directionsResultText(translated, fallback, maxLength);
    } catch (_) {}
  }
  return fallback;
}

function directionsResultColor(value, fallback) {
  return typeof value === 'string' && /^#[0-9a-f]{3,8}$/i.test(value)
    ? value
    : fallback;
}

function directionsResultShape(shape, x, y, radius) {
  const points = values => values
    .map(point => point[0].toFixed(1) + ',' + point[1].toFixed(1))
    .join(' ');

  switch (shape) {
    case 'square':
      return {
        tag: 'rect',
        attrs: {
          x: x - radius,
          y: y - radius,
          width: radius * 2,
          height: radius * 2,
          rx: radius * 0.34,
        },
      };
    case 'capsule':
      return {
        tag: 'rect',
        attrs: {
          x: x - radius * 1.32,
          y: y - radius * 0.82,
          width: radius * 2.64,
          height: radius * 1.64,
          rx: radius * 0.82,
        },
      };
    case 'diamond':
      return {
        tag: 'polygon',
        attrs: {
          points: points([
            [x, y - radius * 1.24],
            [x + radius * 1.24, y],
            [x, y + radius * 1.24],
            [x - radius * 1.24, y],
          ]),
        },
      };
    case 'hex':
      return {
        tag: 'polygon',
        attrs: {
          points: points([0, 1, 2, 3, 4, 5].map(index => [
            x + radius * 1.12 * Math.sin(Math.PI * index / 3),
            y - radius * 1.12 * Math.cos(Math.PI * index / 3),
          ])),
        },
      };
    case 'hexflat':
      return {
        tag: 'polygon',
        attrs: {
          points: points([0, 1, 2, 3, 4, 5].map(index => [
            x + radius * 1.12 * Math.cos(Math.PI * index / 3),
            y + radius * 1.12 * Math.sin(Math.PI * index / 3),
          ])),
        },
      };
    case 'scroll':
      return {
        tag: 'path',
        attrs: {
          d: 'M ' + (x - radius * 0.92) + ' ' + (y - radius * 1.1)
            + ' h ' + (radius * 1.84)
            + ' v ' + (radius * 1.7)
            + ' q ' + (-radius * 0.92) + ' ' + (radius * 0.62)
            + ' ' + (-radius * 1.84) + ' 0 Z',
        },
      };
    default:
      return { tag: 'circle', attrs: { cx: x, cy: y, r: radius } };
  }
}

function DirectionsResultView({
  t,
  title,
  bodyHtml,
  showQuestMap = false,
  stationViews = [],
  goalViews = [],
  choiceBoardView = null,
  recommendationView = null,
  onToggleMap = directionsResultNoop,
  onTravel = directionsResultNoop,
  onChoose = directionsResultNoop,
  onToggleManual = directionsResultNoop,
}) {
  const bionicOn = (typeof window !== 'undefined' && typeof window.__alloUseBionic === 'function') ? window.__alloUseBionic() : false;
  const bt = s => (bionicOn && typeof s === 'string' && typeof window !== 'undefined' && typeof window.__alloBionicReact === 'function') ? window.__alloBionicReact(s) : s;
  const translationKeys = {
    mapHide: 'directions.map_hide',
    mapShow: 'directions.map_show',
    mapSummary: 'directions.map_summary',
    stationsVisited: 'directions.map_stations',
    goals: 'directions.goals',
    mapStart: 'directions.map_start',
    mapNextPin: 'directions.map_next_pin',
    mapNextLabel: 'directions.map_next_label',
    mapNextGoal: 'directions.map_next_goal',
    mapAlsoReady: 'directions.map_also_ready',
    mapAllVisited: 'directions.map_all_visited',
    mapJumpAny: 'directions.map_jump_any',
    mapVisitedSr: 'directions.map_visited_sr',
    // Own keys: directions.your_goals / signals_note belong to the command palette.
    yourGoals: 'directions.goals_heading',
    goalDone: 'directions.goal_done',
    goalOpen: 'directions.goal_open',
    goalMissing: 'directions.goal_not_in_pack',
    signalsNote: 'directions.goals_device_note',
    missingChoices: 'directions.missing_choices',
    choices: 'directions.choices',
    selectedPrefix: 'directions.selected_prefix',
    selectedSuffix: 'directions.selected_suffix',
    chooseActivity: 'directions.choose_activity',
    openActivity: 'directions.open_activity',
    choiceHint: 'directions.choice_hint',
    listenDirections: 'directions.listen_directions',
    listen: 'directions.listen',
    stopListening: 'directions.stop_listening',
  };
  const text = (key, fallback, maxLength, params) => directionsResultTranslation(
    t,
    Object.prototype.hasOwnProperty.call(translationKeys, key) ? translationKeys[key] : key,
    fallback,
    params,
    maxLength,
  );

  // Keep the complete host-provided assignment; validate display records without
  // silently removing stations or goals.
  const stations = (Array.isArray(stationViews) ? stationViews : [])
    .filter(station => station && typeof station === 'object' && station.id)
    .map(station => ({
      id: String(station.id).slice(0, 200),
      title: directionsResultText(station.title, '', 140),
      typeLabel: directionsResultText(station.typeLabel, 'Resource', 80),
      icon: directionsResultText(station.icon, '📄', 8),
      shape: ['square', 'capsule', 'diamond', 'hex', 'hexflat', 'scroll', 'circle'].includes(station.shape)
        ? station.shape
        : 'circle',
      fill: directionsResultColor(station.fill, '#f8fafc'),
      stroke: directionsResultColor(station.stroke, '#64748b'),
      visited: station.visited === true,
    }));
  const goals = (Array.isArray(goalViews) ? goalViews : [])
    .filter(goal => goal && typeof goal === 'object' && goal.id)
    .map(goal => ({
      id: String(goal.id).slice(0, 200),
      label: directionsResultText(goal.label, 'Goal', Infinity),
      kind: directionsResultText(goal.kind, '', 24),
      done: goal.done === true,
      progressText: directionsResultText(goal.progressText, '', 80),
      resourceRef: typeof goal.resourceRef === 'string' ? goal.resourceRef.slice(0, 200) : '',
      missing: goal.missing === true && goal.done !== true,
    }));
  const recommendation = recommendationView && typeof recommendationView === 'object'
    ? recommendationView
    : {};
  const nextId = typeof recommendation.nextId === 'string' ? recommendation.nextId.slice(0, 200) : '';
  const nextStation = stations.find(station => station.id === nextId) || null;
  const alternateIds = (Array.isArray(recommendation.alternateIds) ? recommendation.alternateIds : [])
    .filter(id => typeof id === 'string')
    .map(id => id.slice(0, 200))
    .slice(0, 2);
  const alternateStations = alternateIds
    .map(id => stations.find(station => station.id === id))
    .filter(Boolean);
  const nextGoalLabel = directionsResultText(recommendation.nextGoalLabel, '', 240);

  const choiceValue = choiceBoardView && typeof choiceBoardView === 'object'
    ? choiceBoardView
    : null;
  const choiceItems = choiceValue
    ? (Array.isArray(choiceValue.items) ? choiceValue.items : [])
      .filter(item => item && typeof item === 'object' && item.resourceId)
      .slice(0, 6)
      .map(item => ({
        resourceId: String(item.resourceId).slice(0, 200),
        label: directionsResultText(item.label, 'Activity', 120),
        description: directionsResultText(item.description, '', 240),
        icon: directionsResultText(item.icon, '', 8),
        typeIcon: directionsResultText(item.typeIcon, '•', 8),
        typeLabel: directionsResultText(item.typeLabel, 'Resource', 80),
      }))
    : [];
  const selectedRef = choiceValue && typeof choiceValue.selectedRef === 'string'
    ? choiceValue.selectedRef.slice(0, 200)
    : '';
  const selectedChoice = choiceItems.find(item => item.resourceId === selectedRef) || null;
  const missingChoiceCount = choiceValue
    ? Math.max(0, Math.min(6, Number(choiceValue.missingCount) || 0))
    : 0;
  const choiceBoard = choiceValue && choiceItems.length >= 1
    ? {
      title: directionsResultText(choiceValue.title, text('directions.choice_board_title', 'Choose an activity', 120), 120),
      prompt: directionsResultText(choiceValue.prompt, text('directions.choice_board_prompt', 'Pick one activity to work on first. You can return here and choose another later.', 240), 240),
      items: choiceItems,
    }
    : null;

  const visitedCount = stations.filter(station => station.visited).length;
  const doneCount = goals.filter(goal => goal.done).length;
  // A goal whose resource is not in this pack can never tick, so it is not counted.
  const goalTotal = goals.filter(goal => !goal.missing).length;
  const showMap = showQuestMap === true;
  const mapWidth = Math.max(340, 100 + stations.length * 88, goals.length ? 120 + (goals.length - 1) * 92 : 0);
  const nodeX = index => 100 + index * 88;
  const nodeY = index => 50 + (index % 2) * 26;
  const goalX = index => 70 + index * 92;
  const goalResourceIndex = goal => goal.resourceRef
    ? stations.findIndex(station => station.id === goal.resourceRef)
    : -1;
  const travelTo = station => {
    if (station && station.id) onTravel(station.id);
  };

  const mapAriaLabel = text('mapSummary', 'Quest map') + ': ' + visitedCount + '/' + stations.length + ' '
    + text('stationsVisited', 'stations visited')
    + (goalTotal ? ', ' + doneCount + '/' + goalTotal + ' ' + text('goals', 'goals') : '');
  const trustedBodyHtml = typeof bodyHtml === 'string' ? bodyHtml : '';
  const resolvedTitle = directionsResultText(title, text('directions.title', 'Lesson Directions'), 140);
  const speakingState = typeof React.useState === 'function' ? React.useState(false) : [false, directionsResultNoop];
  const isSpeaking = speakingState[0];
  const updateSpeaking = speakingState[1];
  const goalFilterState = typeof React.useState === 'function' ? React.useState('all') : ['all', directionsResultNoop];
  const goalFilter = goalFilterState[0];
  const updateGoalFilter = goalFilterState[1];
  const openGoalCount = goals.filter(goal => !goal.missing && !goal.done).length;
  const goalProgressPct = goalTotal > 0 ? Math.round((doneCount / goalTotal) * 100) : 0;
  const canFilterGoals = goals.length >= 3 && openGoalCount > 0 && doneCount > 0;
  const effectiveGoalFilter = canFilterGoals && goalFilter === 'open' ? 'open' : 'all';
  const displayedGoals = effectiveGoalFilter === 'open' ? goals.filter(goal => !goal.done) : goals;
  const mountedRef = typeof React.useRef === 'function' ? React.useRef(true) : { current: true };
  const speakingRef = typeof React.useRef === 'function' ? React.useRef(false) : { current: false };
  speakingRef.current = isSpeaking;
  const speechListenerRef = typeof React.useRef === 'function' ? React.useRef(null) : { current: null };
  const detachSpeechListener = () => {
    if (speechListenerRef.current && typeof window !== 'undefined') {
      window.removeEventListener('allo-speech-state', speechListenerRef.current);
    }
    speechListenerRef.current = null;
  };
  if (typeof React.useEffect === 'function') {
    React.useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
        detachSpeechListener();
        if (!speakingRef.current || typeof window === 'undefined') return;
        try { if (window.AlloSpeechPlayer && typeof window.AlloSpeechPlayer.stop === 'function') window.AlloSpeechPlayer.stop(); } catch (_) {}
        try { if (window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') window.speechSynthesis.cancel(); } catch (_) {}
      };
    }, []);
  }
  const htmlToPlainText = (rawHtml) => {
    if (!rawHtml) return '';
    if (typeof window !== 'undefined' && typeof window.sanitizeHtml === 'function' && typeof document !== 'undefined') {
      try {
        const scratch = document.createElement('div');
        scratch.innerHTML = window.sanitizeHtml(rawHtml);
        return String(scratch.textContent || '').replace(/\s+/g, ' ').trim();
      } catch (_) {}
    }
    if (typeof DOMParser === 'function') {
      try {
        const parsedDoc = new DOMParser().parseFromString(String(rawHtml), 'text/html');
        parsedDoc.querySelectorAll('script,style').forEach(node => node.remove());
        return String((parsedDoc.body && parsedDoc.body.textContent) || '').replace(/\s+/g, ' ').trim();
      } catch (_) {}
    }
    return String(rawHtml).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  };
  const speakDirections = () => {
    const plainBody = htmlToPlainText(trustedBodyHtml);
    const goalLines = goals.filter(g => !g.missing && g.label).map(g => g.label);
    const parts = [resolvedTitle];
    if (plainBody) parts.push(plainBody);
    if (choiceBoard && choiceBoard.prompt) parts.push(choiceBoard.title + '. ' + choiceBoard.prompt);
    if (goalLines.length) parts.push(text('yourGoals', 'Your goals') + ': ' + goalLines.join('. '));
    const speechText = parts.join('. ').trim();
    if (!speechText || typeof window === 'undefined') return;
    const player = window.AlloSpeechPlayer;
    const done = () => { detachSpeechListener(); if (mountedRef.current) updateSpeaking(false); };
    detachSpeechListener();
    if (isSpeaking) {
      try { if (player && typeof player.stop === 'function') player.stop(); } catch (_) {}
      try { if (window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') window.speechSynthesis.cancel(); } catch (_) {}
      updateSpeaking(false);
      return;
    }
    try {
      if (window.__alloMuted === true || window._alloGlobalMute === true || window._alloGlobalMuted === true || (typeof window.__alloIsGlobalMuted === 'function' && window.__alloIsGlobalMuted())) return;
    } catch (_) {}
    if (player && typeof player.speak === 'function') {
      if (typeof player.isPlaying === 'function' && player.isPlaying() && typeof player.stop === 'function') {
        player.stop();
      }
      let ourId = null;
      const onState = (e) => {
        const d = (e && e.detail) || {};
        if (ourId === null) { if (d.isPlaying) ourId = d.currentId; return; }
        if (!d.isPlaying || d.currentId !== ourId) done();
      };
      speechListenerRef.current = onState;
      window.addEventListener('allo-speech-state', onState);
      updateSpeaking(true);
      Promise.resolve(player.speak(speechText)).then(result => {
        if (result === null && ourId === null) done();
      }, done);
    } else if (window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function') {
      if (typeof window.speechSynthesis.cancel === 'function') window.speechSynthesis.cancel();
      const utterance = new window.SpeechSynthesisUtterance(speechText);
      const rawRate = Number(window.__alloPlaybackRate);
      utterance.rate = Number.isFinite(rawRate) && rawRate > 0 ? Math.max(0.5, Math.min(2, rawRate)) : 1;
      utterance.volume = Number.isFinite(window.__alloVoiceVolume) ? Math.max(0, Math.min(1, window.__alloVoiceVolume)) : 1;
      utterance.onend = done;
      utterance.onerror = done;
      updateSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-lg p-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <ClipboardList size={20} className="text-amber-600" aria-hidden="true" />
          <h1 className="text-lg font-bold text-slate-800 flex-1 min-w-0">{resolvedTitle}</h1>
          <button
            type="button"
            data-directions-listen="true"
            aria-pressed={isSpeaking}
            onClick={speakDirections}
            aria-label={isSpeaking ? text('stopListening', 'Stop listening') : text('listenDirections', 'Listen to directions')}
            className="min-h-11 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-300 hover:bg-amber-100 rounded-lg px-2.5 py-1 transition-all motion-reduce:transition-none flex-shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
          >
            {isSpeaking ? '⏹️ ' + text('stopListening', 'Stop') : '🔊 ' + text('listen', 'Listen')}
          </button>
          {stations.length > 0 && (
            <button
              type="button"
              onClick={onToggleMap}
              aria-pressed={showMap}
              className="min-h-11 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:border-indigo-400 rounded-lg px-2 py-1 transition-all motion-reduce:transition-none flex-shrink-0"
            >
              🗺️ {showMap ? text('mapHide', 'Hide map') : text('mapShow', 'Quest map')}
            </button>
          )}
        </div>

        {showMap && stations.length > 0 && (
          <div className="mb-4 overflow-x-auto rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-amber-50/40 p-2">
            <svg
              role="group"
              aria-label={mapAriaLabel}
              viewBox={'0 0 ' + mapWidth + ' ' + (goals.length ? 178 : 118)}
              style={{ minWidth: mapWidth * 0.75 + 'px' }}
              className="w-full h-auto"
            >
              <line
                x1="34"
                y1="62"
                x2={nodeX(0)}
                y2={nodeY(0)}
                stroke={stations[0] && stations[0].visited ? '#059669' : '#cbd5e1'}
                strokeWidth="2.5"
                strokeDasharray={stations[0] && stations[0].visited ? 'none' : '4 3'}
              />
              {stations.slice(0, -1).map((station, index) => (
                <line
                  key={'e' + station.id}
                  x1={nodeX(index)}
                  y1={nodeY(index)}
                  x2={nodeX(index + 1)}
                  y2={nodeY(index + 1)}
                  stroke={station.visited && stations[index + 1].visited ? '#059669' : '#cbd5e1'}
                  strokeWidth="2.5"
                  strokeDasharray={station.visited && stations[index + 1].visited ? 'none' : '4 3'}
                />
              ))}
              {goals.map((goal, index) => {
                const resourceIndex = goalResourceIndex(goal);
                const x = goalX(index);
                const y = 150;
                const targetX = resourceIndex >= 0 ? nodeX(resourceIndex) : 34;
                const targetY = resourceIndex >= 0 ? nodeY(resourceIndex) + 12 : 74;
                return (
                  <line
                    key={'ge' + goal.id}
                    x1={x}
                    y1={y - 10}
                    x2={targetX}
                    y2={targetY}
                    stroke={goal.done ? '#059669' : '#e2e8f0'}
                    strokeWidth="1.5"
                    strokeDasharray="2 3"
                  />
                );
              })}
              <circle cx="34" cy="62" r="15" fill="#fef3c7" stroke="#d97706" strokeWidth="2.5" />
              <text x="34" y="67" textAnchor="middle" fontSize="13" aria-hidden="true">🚩</text>
              <text x="34" y="92" textAnchor="middle" fontSize="7.5" fill="currentColor" className="text-amber-800" fontWeight="bold">{text('mapStart', 'Start here')}</text>
              {stations.map((station, index) => {
                const x = nodeX(index);
                const y = nodeY(index);
                const isNext = nextStation && nextStation.id === station.id;
                const shape = directionsResultShape(station.shape, x, y, 13);
                const skin = {
                  fill: station.visited ? '#d1fae5' : station.fill,
                  stroke: station.visited ? '#059669' : station.stroke,
                  strokeWidth: 2.5,
                };
                return (
                  <g key={station.id} role="button" tabIndex={0} className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700" aria-label={(station.title || station.typeLabel) + (station.visited ? ", " + text('mapVisitedSr', 'already visited') : "")} onClick={() => travelTo(station)} onKeyDown={event => { if (event.nativeEvent?.isComposing || event.isComposing || event.keyCode === 229 || event.altKey || event.ctrlKey || event.metaKey) return; if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); travelTo(station); } }} style={{ cursor: 'pointer' }}>
                    <circle cx={x} cy={y} r={22} fill="transparent" />
                    <title>{station.title || station.typeLabel}</title>
                    {isNext && <circle cx={x} cy={y} r="20" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" opacity="0.9" />}
                    {React.createElement(shape.tag, { ...shape.attrs, ...skin })}
                    <text x={x} y={y + 4} textAnchor="middle" fontSize="11" aria-hidden="true">{station.visited ? '✓' : station.icon}</text>
                    <text x={x} y={y + 26} textAnchor="middle" fontSize="7" fill="currentColor" className="text-slate-600">{(station.title || station.typeLabel).slice(0, 14)}</text>
                    <text x={x} y={y + 34} textAnchor="middle" fontSize="6" fill="currentColor" className={isNext ? 'text-amber-800' : 'text-slate-600'} fontWeight={isNext ? 'bold' : 'normal'}>{isNext ? text('mapNextPin', 'NEXT') : station.typeLabel.slice(0, 16)}</text>
                  </g>
                );
              })}
              {goals.map((goal, index) => (
                <g key={'g' + goal.id}>
                  <rect x={goalX(index) - 34} y={140} width="68" height="20" rx="10" fill={goal.done ? '#d1fae5' : '#ffffff'} stroke={goal.done ? '#059669' : '#cbd5e1'} strokeWidth="1.5" />
                  <text x={goalX(index)} y={153} textAnchor="middle" fontSize="7.5" fill={goal.done ? '#065f46' : '#475569'} fontWeight={goal.done ? 'bold' : 'normal'}>{(goal.done ? '✓ ' : '') + goal.label.slice(0, 14)}</text>
                </g>
              ))}
            </svg>
          </div>
        )}

        {stations.length > 0 && (
          <div className="mb-4">
            {nextStation ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => travelTo(nextStation)}
                  className="min-h-11 flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-sm shadow-sm transition-all motion-reduce:transition-none"
                >
                  <span aria-hidden="true">{nextStation.icon}</span>
                  <span>{text('mapNextLabel', 'Go here next') + ': ' + (nextStation.title || nextStation.typeLabel).slice(0, 40)}</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
                {nextGoalLabel && (
                  <span className="text-xs text-amber-700 font-semibold">
                    {text('mapNextGoal', 'finishes your goal: ' + nextGoalLabel, 300, { goal: nextGoalLabel })}
                  </span>
                )}
                {alternateStations.map(station => (
                  <button
                    type="button"
                    key={'alt' + station.id}
                    onClick={() => travelTo(station)}
                    className="min-h-11 flex items-center gap-1 px-2 py-1 bg-white border border-amber-200 hover:border-amber-400 text-amber-800 font-semibold rounded-lg text-xs transition-all motion-reduce:transition-none"
                  >
                    <span aria-hidden="true">{station.icon}</span>
                    <span>{text('mapAlsoReady', 'or') + ' ' + (station.title || station.typeLabel).slice(0, 26)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs font-bold text-emerald-700">{visitedCount === stations.length ? text('mapAllVisited', '🎉 You have been to every station on this map.') : text('directions.map_choose_station', 'Choose a station from the map or the list below to continue.')}</p>
            )}
            <details className="mt-2">
              <summary className="min-h-11 inline-flex items-center text-xs text-indigo-700 font-bold cursor-pointer">{text('mapJumpAny', 'Go to any station')}</summary>
              <ul className="flex flex-wrap gap-1.5 mt-2 list-none p-0 m-0">
                {stations.map(station => (
                  <li key={'jump' + station.id}>
                    <button
                      type="button"
                      onClick={() => travelTo(station)}
                      className={'min-h-11 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border transition-all motion-reduce:transition-none ' + (station.visited ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:border-emerald-400' : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400')}
                    >
                      <span aria-hidden="true">{station.icon}</span>
                      <span>{(station.title || station.typeLabel).slice(0, 30)}</span>
                      <span className="sr-only">{', ' + station.typeLabel + (station.visited ? ', ' + text('mapVisitedSr', 'already visited') : '')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}

        {trustedBodyHtml && (
          <div
            className="prose prose-sm max-w-none text-slate-700 mb-4 break-words"
            dangerouslySetInnerHTML={{ __html: (() => { const clean = (typeof window !== 'undefined' && typeof window.sanitizeHtml === 'function') ? window.sanitizeHtml(trustedBodyHtml) : ''; return (bionicOn && clean && typeof window !== 'undefined' && typeof window.__alloBionicHtml === 'function') ? window.__alloBionicHtml(clean) : clean; })() }}
          />
        )}

        {missingChoiceCount > 0 && (
          <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            {bt(text('missingChoices', 'Some activity choices are no longer available in this assignment. Choose from the activities still listed below or ask your teacher for an updated board.', 500))}
          </div>
        )}

        {choiceBoard && (
          <section className="border-t border-indigo-100 pt-4 mb-4" aria-labelledby="directions-choice-board-title">
            <div className="flex flex-wrap items-start gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <h2 id="directions-choice-board-title" className="text-base font-black text-indigo-900">{choiceBoard.title}</h2>
                <p className="text-xs text-slate-600 mt-1">{bt(choiceBoard.prompt)}</p>
              </div>
              <span className="text-xs font-bold uppercase tracking-wide rounded-full px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200">{choiceBoard.items.length} {choiceBoard.items.length === 1 ? text('directions.choice', 'choice') : text('choices', 'choices')}</span>
            </div>
            {selectedChoice && (
              <p role="status" className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
                {text('selectedPrefix', 'Selected') + ': ' + selectedChoice.label + '. ' + (choiceBoard.items.length > 1 ? text('selectedSuffix', 'You can choose another activity below.') : text('directions.single_choice_selected', 'You can return to this activity at any time.'))}
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {choiceBoard.items.map(item => (
                <button
                  type="button"
                  key={item.resourceId}
                  onClick={() => onChoose(item.resourceId)}
                  aria-label={text('chooseActivity', 'Choose activity') + ': ' + item.label}
                  aria-pressed={selectedRef === item.resourceId}
                  className={'group flex min-h-24 items-start gap-3 rounded-xl border-2 p-3 text-left shadow-sm transition-all motion-reduce:transition-none motion-safe:hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 ' + (selectedRef === item.resourceId ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200' : 'border-indigo-100 bg-gradient-to-br from-indigo-50 to-white')}
                >
                  <span aria-hidden="true" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-xl text-white shadow-sm">{item.icon || item.typeIcon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-slate-800">{bt(item.label)}</span>
                    <span className="mt-1 block text-xs font-bold uppercase tracking-wide text-indigo-700">{item.typeLabel}</span>
                    {item.description && <span className="mt-1 block text-xs leading-5 text-slate-600">{bt(item.description)}</span>}
                    <span className="mt-2 block text-xs font-bold text-indigo-700 group-hover:text-indigo-900">{text('openActivity', 'Open activity')} <ArrowRight size={12} className="inline" aria-hidden="true" /></span>
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-600">{bt(choiceBoard.items.length > 1 ? text('choiceHint', 'Choose one activity to begin. You can return here and choose another card later.', 300) : text('directions.single_choice_hint', 'Open the remaining activity, or ask your teacher for an updated board.', 300))}</p>
          </section>
        )}

        {goals.length > 0 && (
          <div className="border-t border-amber-100 pt-3" role="group" aria-label={text('yourGoals', 'Your goals')}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="text-xs font-bold text-amber-700" aria-live="polite">{text('yourGoals', 'Your goals')}{goalTotal > 0 ? ' · ' + doneCount + '/' + goalTotal : ''}</p>
              {goalTotal > 0 && doneCount === goalTotal && (
                <span data-directions-all-goals-done="true" className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                  🎉 {text('directions.all_goals_done', 'All goals complete!')}
                </span>
              )}
              {canFilterGoals && (
                <div className="flex items-center gap-1" role="group" aria-label={text('directions.goal_filter_group', 'Filter goals')}>
                  <button
                    type="button"
                    data-directions-goal-filter="all"
                    aria-pressed={effectiveGoalFilter === 'all'}
                    onClick={() => updateGoalFilter('all')}
                    className={'min-h-11 rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 ' + (effectiveGoalFilter === 'all' ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50')}
                  >
                    {text('directions.goal_filter_all', 'All')} ({goals.length})
                  </button>
                  <button
                    type="button"
                    data-directions-goal-filter="open"
                    aria-pressed={effectiveGoalFilter === 'open'}
                    onClick={() => updateGoalFilter('open')}
                    className={'min-h-11 rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 ' + (effectiveGoalFilter === 'open' ? 'border-indigo-700 bg-indigo-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50')}
                  >
                    {text('directions.goal_filter_open', 'To do')} ({openGoalCount})
                  </button>
                </div>
              )}
            </div>
            {goalTotal > 0 && (
              <div
                data-directions-progress-bar="true"
                role="progressbar"
                aria-label={text('yourGoals', 'Your goals')}
                aria-valuenow={doneCount}
                aria-valuemin={0}
                aria-valuemax={goalTotal}
                className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-200"
              >
                <div
                  className={'h-full rounded-full transition-all motion-reduce:transition-none ' + (doneCount === goalTotal ? 'bg-emerald-600' : 'bg-amber-500')}
                  style={{ width: goalProgressPct + '%' }}
                />
              </div>
            )}
            <ul className="space-y-2 list-none p-0 m-0">
              {displayedGoals.map(goal => {
                const linkedStation = (!goal.done && !goal.missing && goal.resourceRef)
                  ? stations.find(station => station.id === goal.resourceRef) || null
                  : null;
                return goal.missing ? (
                <li key={goal.id} className="flex items-center gap-2" data-goal-missing="true">
                  <span className="w-4 h-4 rounded-full border-2 border-dashed border-slate-300 inline-block flex-shrink-0" aria-hidden="true" />
                  <span className="text-sm text-slate-600">{bt(goal.label)}<span className="sr-only">{', '}</span></span>
                  <span className="text-xs text-slate-600 font-semibold ml-auto flex-shrink-0">{text('goalMissing', 'Not in this pack')}</span>
                </li>
              ) : (
                <li key={goal.id} className={goal.kind === 'manual' ? 'min-h-11 flex items-center gap-2' : 'flex items-center gap-2'}>
                  {goal.kind === 'manual' ? (
                    <label className="min-h-11 flex items-center gap-2 cursor-pointer flex-1">
                      <input
                        type="checkbox"
                        checked={goal.done}
                        onChange={() => onToggleManual(goal.id)}
                        className="w-4 h-4 accent-emerald-600 flex-shrink-0"
                      />
                      <span className={'text-sm ' + (goal.done ? 'text-emerald-700 line-through decoration-emerald-300' : 'text-slate-700')}>
                        {bt(goal.label)}
                      </span>
                    </label>
                  ) : (
                    <>
                      {goal.done
                        ? <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" aria-hidden="true" />
                        : <span className="w-4 h-4 rounded-full border-2 border-slate-300 inline-block flex-shrink-0" aria-hidden="true" />}
                      <span className={'text-sm ' + (goal.done ? 'text-emerald-700 line-through decoration-emerald-300' : 'text-slate-700')}>
                        {bt(goal.label)}
                        <span className="sr-only">{goal.done ? ', ' + text('goalDone', 'complete') : ', ' + text('goalOpen', 'not yet complete')}</span>
                      </span>
                    </>
                  )}
                  {goal.progressText && !goal.done && <span className="text-xs text-amber-700 font-bold ml-auto flex-shrink-0">{goal.progressText}</span>}
                  {linkedStation && (
                    <button
                      type="button"
                      data-directions-goal-jump={goal.id}
                      onClick={() => travelTo(linkedStation)}
                      aria-label={text('openActivity', 'Open activity') + ': ' + (linkedStation.title || linkedStation.typeLabel)}
                      className={(goal.progressText ? 'ml-1 ' : 'ml-auto ') + 'min-h-11 flex-shrink-0 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:border-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700'}
                    >
                      {text('directions.goal_go', 'Go')} →
                    </button>
                  )}
                  {goal.done && <span className="text-xs text-emerald-600 font-bold ml-auto flex-shrink-0" aria-hidden="true">✓</span>}
                </li>
              );
              })}
            </ul>
            <p className="text-xs text-slate-600 mt-3">{bt(text('signalsNote', 'Goals check themselves on this device as you play and earn XP, and your own checkmarks count too.', 500))}</p>
          </div>
        )}
      </div>
    </div>
  );
}
