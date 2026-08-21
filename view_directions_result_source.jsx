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
      if (translated) return directionsResultText(translated, fallback, maxLength);
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
  const translationKeys = {
    mapHide: 'directions.map_hide',
    mapShow: 'directions.map_show',
    mapSummary: 'directions.map_summary',
    stationsVisited: 'directions.map_stations',
    goals: 'takehome.evidence_goals',
    mapStart: 'directions.map_start',
    mapNextPin: 'directions.map_next_pin',
    mapNextLabel: 'directions.map_next_label',
    mapNextGoal: 'directions.map_next_goal',
    mapAlsoReady: 'directions.map_also_ready',
    mapAllVisited: 'directions.map_all_visited',
    mapJumpAny: 'directions.map_jump_any',
    mapVisitedSr: 'directions.map_visited_sr',
    yourGoals: 'directions.your_goals',
    goalDone: 'directions.goal_done',
    goalOpen: 'directions.goal_open',
    signalsNote: 'directions.signals_note',
  };
  const text = (key, fallback, maxLength, params) => directionsResultTranslation(
    t,
    translationKeys[key] || key,
    fallback,
    params,
    maxLength,
  );

  // Defensive limits mirror the host contract. They protect rendering without
  // turning this view into a second source of filtering or policy decisions.
  const stations = (Array.isArray(stationViews) ? stationViews : [])
    .filter(station => station && typeof station === 'object' && station.id)
    .slice(0, 12)
    .map(station => ({
      id: String(station.id).slice(0, 120),
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
    .slice(0, 24)
    .map(goal => ({
      id: String(goal.id).slice(0, 120),
      label: directionsResultText(goal.label, 'Goal', 240),
      kind: directionsResultText(goal.kind, '', 24),
      done: goal.done === true,
      progressText: directionsResultText(goal.progressText, '', 80),
      resourceRef: typeof goal.resourceRef === 'string' ? goal.resourceRef.slice(0, 120) : '',
    }));
  const recommendation = recommendationView && typeof recommendationView === 'object'
    ? recommendationView
    : {};
  const nextId = typeof recommendation.nextId === 'string' ? recommendation.nextId.slice(0, 120) : '';
  const nextStation = stations.find(station => station.id === nextId) || null;
  const alternateIds = (Array.isArray(recommendation.alternateIds) ? recommendation.alternateIds : [])
    .filter(id => typeof id === 'string')
    .map(id => id.slice(0, 120))
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
        resourceId: String(item.resourceId).slice(0, 120),
        label: directionsResultText(item.label, 'Activity', 120),
        description: directionsResultText(item.description, '', 240),
        icon: directionsResultText(item.icon, '', 8),
        typeIcon: directionsResultText(item.typeIcon, '•', 8),
        typeLabel: directionsResultText(item.typeLabel, 'Resource', 80),
      }))
    : [];
  const selectedRef = choiceValue && typeof choiceValue.selectedRef === 'string'
    ? choiceValue.selectedRef.slice(0, 120)
    : '';
  const selectedChoice = choiceItems.find(item => item.resourceId === selectedRef) || null;
  const missingChoiceCount = choiceValue
    ? Math.max(0, Math.min(6, Number(choiceValue.missingCount) || 0))
    : 0;
  const choiceBoard = choiceValue && choiceItems.length >= 2
    ? {
      title: directionsResultText(choiceValue.title, 'Choose an activity', 120),
      prompt: directionsResultText(choiceValue.prompt, 'Pick one activity to work on first.', 240),
      items: choiceItems,
    }
    : null;

  const visitedCount = stations.filter(station => station.visited).length;
  const doneCount = goals.filter(goal => goal.done).length;
  const showMap = showQuestMap === true;
  const mapWidth = Math.max(340, 100 + stations.length * 88);
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
    + (goals.length ? ', ' + doneCount + '/' + goals.length + ' ' + text('goals', 'goals') : '');
  const trustedBodyHtml = typeof bodyHtml === 'string' ? bodyHtml : '';

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList size={20} className="text-amber-600" aria-hidden="true" />
          <h1 className="text-lg font-bold text-slate-800 flex-1">{directionsResultText(title, text('directions.title', 'Assignment Directions'), 140)}</h1>
          {stations.length > 0 && (
            <button
              type="button"
              onClick={onToggleMap}
              aria-pressed={showMap}
              className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:border-indigo-400 rounded-lg px-2 py-1 transition-all flex-shrink-0"
            >
              🗺️ {showMap ? text('mapHide', 'Hide map') : text('mapShow', 'Quest map')}
            </button>
          )}
        </div>

        {showMap && stations.length > 0 && (
          <div className="mb-4 overflow-x-auto rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-amber-50/40 p-2">
            <svg
              role="img"
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
              <text x="34" y="92" textAnchor="middle" fontSize="7.5" fill="#92400e" fontWeight="bold">{text('mapStart', 'Start here')}</text>
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
                  <g key={station.id} onClick={() => travelTo(station)} style={{ cursor: 'pointer' }}>
                    {isNext && <circle cx={x} cy={y} r="20" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" opacity="0.9" />}
                    {React.createElement(shape.tag, { ...shape.attrs, ...skin })}
                    <text x={x} y={y + 4} textAnchor="middle" fontSize="11" aria-hidden="true">{station.visited ? '✓' : station.icon}</text>
                    <text x={x} y={y + 26} textAnchor="middle" fontSize="7" fill="#475569">{(station.title || station.typeLabel).slice(0, 14)}</text>
                    <text x={x} y={y + 34} textAnchor="middle" fontSize="6" fill={isNext ? '#b45309' : '#94a3b8'} fontWeight={isNext ? 'bold' : 'normal'}>{isNext ? text('mapNextPin', 'NEXT') : station.typeLabel.slice(0, 16)}</text>
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
                  className="flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm shadow-sm transition-all"
                >
                  <span aria-hidden="true">{nextStation.icon}</span>
                  <span>{text('mapNextLabel', 'Go here next') + ': ' + (nextStation.title || nextStation.typeLabel).slice(0, 40)}</span>
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
                {nextGoalLabel && (
                  <span className="text-[11px] text-amber-700 font-semibold">
                    {text('mapNextGoal', 'finishes your goal: ' + nextGoalLabel, 300, { goal: nextGoalLabel })}
                  </span>
                )}
                {alternateStations.map(station => (
                  <button
                    type="button"
                    key={'alt' + station.id}
                    onClick={() => travelTo(station)}
                    className="flex items-center gap-1 px-2 py-1 bg-white border border-amber-200 hover:border-amber-400 text-amber-800 font-semibold rounded-lg text-[11px] transition-all"
                  >
                    <span aria-hidden="true">{station.icon}</span>
                    <span>{text('mapAlsoReady', 'or') + ' ' + (station.title || station.typeLabel).slice(0, 26)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs font-bold text-emerald-700">{text('mapAllVisited', '🎉 You have been to every station on this map.')}</p>
            )}
            <details className="mt-2">
              <summary className="text-[11px] text-indigo-700 font-bold cursor-pointer">{text('mapJumpAny', 'Go to any station')}</summary>
              <ul className="flex flex-wrap gap-1.5 mt-2 list-none p-0 m-0">
                {stations.map(station => (
                  <li key={'jump' + station.id}>
                    <button
                      type="button"
                      onClick={() => travelTo(station)}
                      className={'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all ' + (station.visited ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:border-emerald-400' : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400')}
                    >
                      <span aria-hidden="true">{station.icon}</span>
                      <span>{(station.title || station.typeLabel).slice(0, 30)}</span>
                      <span className="sr-only">{' — ' + station.typeLabel + (station.visited ? ', ' + text('mapVisitedSr', 'already visited') : '')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}

        {trustedBodyHtml && (
          <div
            className="prose prose-sm max-w-none text-slate-700 mb-4"
            dangerouslySetInnerHTML={{ __html: (typeof window !== 'undefined' && typeof window.sanitizeHtml === 'function') ? window.sanitizeHtml(trustedBodyHtml) : '' }}
          />
        )}

        {missingChoiceCount > 0 && (
          <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            {text('missingChoices', 'Some activity choices are no longer available in this assignment. Choose from the activities still listed below or ask your teacher for an updated board.', 500)}
          </div>
        )}

        {choiceBoard && (
          <section className="border-t border-indigo-100 pt-4 mb-4" aria-labelledby="directions-choice-board-title">
            <div className="flex flex-wrap items-start gap-2 mb-3">
              <div className="flex-1 min-w-[220px]">
                <h2 id="directions-choice-board-title" className="text-base font-black text-indigo-900">{choiceBoard.title}</h2>
                <p className="text-xs text-slate-600 mt-1">{choiceBoard.prompt}</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200">{choiceBoard.items.length} {text('choices', 'choices')}</span>
            </div>
            {selectedChoice && (
              <p role="status" className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900">
                {text('selectedPrefix', 'Selected') + ': ' + selectedChoice.label + '. ' + text('selectedSuffix', 'You can choose another activity below.')}
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
                  className={'group flex min-h-24 items-start gap-3 rounded-xl border-2 p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 ' + (selectedRef === item.resourceId ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200' : 'border-indigo-100 bg-gradient-to-br from-indigo-50 to-white')}
                >
                  <span aria-hidden="true" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-xl text-white shadow-sm">{item.icon || item.typeIcon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-slate-800">{item.label}</span>
                    <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-indigo-700">{item.typeLabel}</span>
                    {item.description && <span className="mt-1 block text-xs leading-5 text-slate-600">{item.description}</span>}
                    <span className="mt-2 block text-[11px] font-bold text-indigo-700 group-hover:text-indigo-900">{text('openActivity', 'Open activity')} <ArrowRight size={12} className="inline" aria-hidden="true" /></span>
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-slate-500">{text('choiceHint', 'Choose one activity to begin. You can return here and choose another card later.', 300)}</p>
          </section>
        )}

        {goals.length > 0 && (
          <div className="border-t border-amber-100 pt-3" role="group" aria-label={text('yourGoals', 'Your goals')}>
            <p className="text-xs font-bold text-amber-700 mb-2" aria-live="polite">{text('yourGoals', 'Your goals')} · {doneCount}/{goals.length}</p>
            <ul className="space-y-2 list-none p-0 m-0">
              {goals.map(goal => (
                <li key={goal.id} className="flex items-center gap-2">
                  {goal.kind === 'manual' ? (
                    <input
                      type="checkbox"
                      checked={goal.done}
                      onChange={() => onToggleManual(goal.id)}
                      aria-label={goal.label}
                      className="w-4 h-4 accent-emerald-600 flex-shrink-0"
                    />
                  ) : (
                    goal.done
                      ? <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" aria-hidden="true" />
                      : <span className="w-4 h-4 rounded-full border-2 border-slate-300 inline-block flex-shrink-0" aria-hidden="true" />
                  )}
                  <span className={'text-sm ' + (goal.done ? 'text-emerald-700 line-through decoration-emerald-300' : 'text-slate-700')}>
                    {goal.label}
                    {goal.kind !== 'manual' && <span className="sr-only">{goal.done ? ' — ' + text('goalDone', 'complete') : ' — ' + text('goalOpen', 'not yet complete')}</span>}
                  </span>
                  {goal.progressText && !goal.done && <span className="text-[11px] text-amber-600 font-bold ml-auto flex-shrink-0">{goal.progressText}</span>}
                  {goal.done && <span className="text-[11px] text-emerald-600 font-bold ml-auto flex-shrink-0" aria-hidden="true">✓</span>}
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-slate-400 mt-3">{text('signalsNote', 'Goals check themselves on this device as you play and earn XP — and your own checkmarks count too.', 500)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
