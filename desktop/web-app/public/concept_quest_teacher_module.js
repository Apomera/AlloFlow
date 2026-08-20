/** Concept Quest teacher co-GM controls. Generated from concept_quest_teacher_source.jsx. */
(function() {
  'use strict';
  var React = window.React;
  if (!React) return;
  var _shared = window.__alloShared || {};
  var _firebase = window.__alloFirebase || {};
  var db = _shared.db;
  var doc = _firebase.doc || function() { return {}; };
  var updateDoc = _firebase.updateDoc || function() { return Promise.resolve(); };
  var warnLog = _shared.warnLog || function() { console.warn.apply(console, arguments); };
  const ConceptQuestTeacherControls = React.memo(function ConceptQuestTeacherControls(props) {
  const {
    sessionData,
    activeSessionCode,
    appId,
    addToast,
    callGemini
  } = props;
  const escapeState = sessionData?.escapeRoomState;
  const quest = escapeState?.conceptQuest;
  const engine = window.AlloModules?.ConceptQuestEngine;
  const progress = escapeState?.teamProgress?.All || {};
  const votes = progress.questVotes || {};
  const actions = progress.questActions || {};
  const roles = progress.questRoles || {};
  const currentRoom = engine?.getRoom?.(quest, quest?.currentRoomId);
  const [gmType, setGmType] = React.useState('narrative');
  const [gmItemEffect, setGmItemEffect] = React.useState('shield');
  const [gmRequest, setGmRequest] = React.useState('');
  const [gmDraft, setGmDraft] = React.useState(null);
  const [busy, setBusy] = React.useState(false);
  if (!quest || !engine) return null;
  const sessionRef = () => doc(db, 'artifacts', appId, 'public', 'data', 'sessions', activeSessionCode);
  const sync = async updates => {
    try {
      await updateDoc(sessionRef(), updates);
      return true;
    } catch (error) {
      warnLog('Concept Quest sync failed:', error);
      addToast?.('Concept Quest could not sync.', 'error');
      return false;
    }
  };
  const syncQuest = (nextQuest, clearField) => {
    const updates = {
      'escapeRoomState.conceptQuest': nextQuest
    };
    if (clearField) updates[`escapeRoomState.teamProgress.All.${clearField}`] = {};
    if (nextQuest.phase === 'complete') updates['escapeRoomState.teamProgress.All.isEscaped'] = true;
    return sync(updates);
  };
  const resolveTravel = async roomId => {
    setBusy(true);
    const result = engine.resolveTravel(quest, votes, roomId);
    if (result.error) addToast?.(result.error, 'warning');else await syncQuest(result.quest, 'questVotes');
    setBusy(false);
  };
  const resolveRound = async () => {
    setBusy(true);
    const result = engine.resolveBattle(quest, actions, roles);
    if (result.error) addToast?.(result.error, 'warning');else {
      await syncQuest(result.quest, 'questActions');
      addToast?.(`${result.summary.correct}/${result.summary.total} concept checks succeeded.`, result.summary.enemyDefeated ? 'success' : 'info');
    }
    setBusy(false);
  };
  const manualDraft = () => {
    const description = gmRequest.trim() || 'A new development asks the party to apply the current concept together.';
    const base = {
      type: gmType,
      title: gmType === 'item' ? 'Concept Relic' : gmType === 'enemy' ? 'Misconception Appears' : gmType === 'challenge' ? 'GM Challenge' : 'Story Event',
      description
    };
    if (gmType === 'item') base.item = {
      name: 'Concept Relic',
      emoji: '🎁',
      description,
      effect: {
        type: gmItemEffect,
        amount: 2
      }
    };
    if (gmType === 'challenge') base.challenge = currentRoom?.challenge;
    if (gmType === 'enemy') {
      base.enemy = {
        name: 'Teacher-Created Misconception',
        emoji: '👾',
        hp: 8,
        attack: 2
      };
      base.challenge = currentRoom?.challenge;
    }
    setGmDraft(engine.normalizeGmDraft(base));
  };
  const aiDraft = async () => {
    if (typeof callGemini !== 'function') {
      manualDraft();
      addToast?.('AI is unavailable, so an editable manual draft was created.', 'info');
      return;
    }
    setBusy(true);
    try {
      const prompt = `You assist a teacher co-GMing a cooperative educational dungeon crawler. Draft ONE ${gmType} grounded in "${currentRoom?.concept}". Teacher direction: "${gmRequest || 'Make it engaging and instructionally useful.'}". Return only JSON with type, title, description. For item include item{name,emoji,description,effect{type:heal|shield|clue,amount:1-3}}. For challenge include challenge{prompt,options,correctIndex,explanation}. For enemy include enemy{name,emoji,hp:4-16,attack:1-3} and challenge. Do not determine student outcomes.`;
      const response = await callGemini(prompt, true);
      const jsonText = String(response || '').replace(/```json\s*/gi, '').replace(/```/g, '').trim();
      setGmDraft(engine.normalizeGmDraft(JSON.parse(jsonText)));
    } catch (error) {
      warnLog('Concept Quest AI draft failed:', error);
      manualDraft();
      addToast?.('AI draft failed; an editable manual draft is ready.', 'warning');
    } finally {
      setBusy(false);
    }
  };
  const publishDraft = async () => {
    const nextQuest = engine.publishGmDraft(quest, gmDraft);
    if (await syncQuest(nextQuest, gmDraft?.type === 'enemy' ? 'questActions' : null)) {
      setGmDraft(null);
      setGmRequest('');
      addToast?.('GM event published to every student.', 'success');
    }
  };
  const adjustEncounter = async (kind, amount) => {
    const result = engine.adjustEncounter(quest, kind, amount);
    if (result.error) addToast?.(result.error, 'warning');else await syncQuest(result.quest);
  };
  const useSharedItem = async index => {
    const result = engine.useItem(quest, index);
    if (result.error) addToast?.(result.error, 'warning');else if (await syncQuest(result.quest)) addToast?.(`${result.item.name} used.`, 'success');
  };
  const undoLastGmChange = async () => {
    const result = engine.undoLastGmChange(quest);
    if (result.error) addToast?.(result.error, 'info');else if (await syncQuest(result.quest)) addToast?.('Last GM change undone.', 'success');
  };
  const dismissGmEvent = async () => {
    await syncQuest(engine.dismissEvent(quest));
  };
  const participantCount = Object.keys(sessionData?.roster || {}).length;
  const voteCounts = (currentRoom?.neighbors || []).map(id => ({
    room: engine.getRoom(quest, id),
    count: Object.values(votes).filter(value => value === id).length
  })).filter(entry => entry.room);
  const enemy = currentRoom?.enemy;
  const roleCounts = (quest.roles || engine.ROLES || []).map(role => ({
    ...role,
    count: Object.values(roles).filter(value => value === role.id).length
  }));
  const debrief = engine.createDebrief(quest);
  return /*#__PURE__*/React.createElement("div", {
    className: "mb-4 rounded-2xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-purple-50 p-4 shadow-lg"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center justify-between gap-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-black text-indigo-950"
  }, "🗺️ Concept Quest · Teacher co-GM"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-indigo-700"
  }, "Turn ", quest.turn, " · ", currentRoom?.name, " · ", quest.phase)), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => sync({
      'escapeRoomState.isPaused': !escapeState.isPaused
    }),
    className: "min-h-11 rounded-lg bg-amber-100 px-3 text-sm font-bold text-amber-900"
  }, escapeState.isPaused ? 'Resume' : 'Pause'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => sync({
      'escapeRoomState.isActive': false
    }),
    className: "min-h-11 rounded-lg bg-red-600 px-3 text-sm font-bold text-white"
  }, "End quest"))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 grid gap-4 lg:grid-cols-2"
  }, /*#__PURE__*/React.createElement("section", {
    className: "rounded-xl border border-indigo-200 bg-white p-3",
    "aria-labelledby": "cq-resolve-heading"
  }, /*#__PURE__*/React.createElement("h4", {
    id: "cq-resolve-heading",
    className: "font-black text-slate-900"
  }, "Resolve the cooperative turn"), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg bg-emerald-50 p-2"
  }, /*#__PURE__*/React.createElement("strong", {
    className: "block text-lg text-emerald-700"
  }, quest.party.hp, "/", quest.party.maxHp), "Party HP"), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg bg-blue-50 p-2"
  }, /*#__PURE__*/React.createElement("strong", {
    className: "block text-lg text-blue-700"
  }, Object.keys(votes).length, "/", participantCount), "Votes"), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg bg-purple-50 p-2"
  }, /*#__PURE__*/React.createElement("strong", {
    className: "block text-lg text-purple-700"
  }, Object.keys(actions).length, "/", participantCount), "Actions"), /*#__PURE__*/React.createElement("div", {
    className: "rounded-lg bg-cyan-50 p-2"
  }, /*#__PURE__*/React.createElement("strong", {
    className: "block text-lg text-cyan-700"
  }, (quest.sigils || []).length, "/", quest.sigilsRequired || 3), "Concept sigils")), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex flex-wrap gap-1.5",
    "aria-label": "Party role distribution"
  }, roleCounts.map(role => /*#__PURE__*/React.createElement("span", {
    key: role.id,
    className: "rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700"
  }, role.emoji, " ", role.name, ": ", /*#__PURE__*/React.createElement("strong", null, role.count)))), quest.lastRound && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-2 text-xs text-cyan-950"
  }, /*#__PURE__*/React.createElement("strong", null, "Last round:"), " ", quest.lastRound.correct, "/", quest.lastRound.total, " correct · ", quest.lastRound.damage, " damage", quest.lastRound.combo ? ' · Concept Combo!' : '', quest.lastRound.synergyCount ? ` · ${quest.lastRound.synergyCount} role synergies` : '', quest.lastRound.assistedCount ? ` · ${quest.lastRound.assistedCount} peer assists` : '', quest.lastRound.encounterRule && /*#__PURE__*/React.createElement("p", {
    className: "mt-1"
  }, quest.lastRound.encounterRule)), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-bold text-amber-900"
  }, "Quick pacing controls"), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex flex-wrap gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => adjustEncounter('heal', 3),
    className: "min-h-11 rounded-lg bg-emerald-700 px-3 text-xs font-bold text-white"
  }, "Rally +3 HP"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => adjustEncounter('shield', 2),
    className: "min-h-11 rounded-lg bg-blue-700 px-3 text-xs font-bold text-white"
  }, "Grant +2 shield"), quest.phase === 'battle' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => adjustEncounter('enemy', -3),
    className: "min-h-11 rounded-lg bg-purple-700 px-3 text-xs font-bold text-white"
  }, "Soften enemy −3"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => adjustEncounter('enemy', 3),
    className: "min-h-11 rounded-lg border border-purple-300 bg-white px-3 text-xs font-bold text-purple-800"
  }, "Harden enemy +3")))), quest.phase === 'explore' && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 space-y-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600"
  }, "Select a connected room or honor the leading vote."), voteCounts.map(({
    room,
    count
  }) => /*#__PURE__*/React.createElement("button", {
    key: room.id,
    type: "button",
    disabled: busy,
    onClick: () => resolveTravel(room.id),
    className: "flex min-h-11 w-full items-center justify-between rounded-lg border border-indigo-200 px-3 text-sm font-bold text-indigo-800 hover:bg-indigo-50"
  }, /*#__PURE__*/React.createElement("span", null, room.emoji, " ", room.name), /*#__PURE__*/React.createElement("span", null, count, " vote", count === 1 ? '' : 's')))), quest.phase === 'battle' && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 rounded-lg bg-fuchsia-50 p-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-fuchsia-900"
  }, enemy?.emoji, " ", enemy?.name, ": ", enemy?.hp, "/", enemy?.maxHp, " HP"), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-sm text-slate-700"
  }, currentRoom?.challenge?.prompt), currentRoom?.kind === 'puzzle' && /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-xs font-bold text-cyan-800"
  }, "Reasoning Lock: two-thirds accuracy unlocks bonus damage."), currentRoom?.kind === 'boss' && /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-xs font-bold text-amber-800"
  }, "Mastery Barrier: 60% accuracy breaks the shield."), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-xs text-slate-600"
  }, Object.values(actions).filter(action => action?.supportTargetUid).length, " planned peer assist(s)"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: busy || !Object.keys(actions).length,
    onClick: resolveRound,
    className: "mt-3 min-h-11 w-full rounded-lg bg-fuchsia-700 px-3 font-bold text-white disabled:opacity-50"
  }, "Resolve ", Object.keys(actions).length, " action", Object.keys(actions).length === 1 ? '' : 's')), (quest.phase === 'complete' || quest.phase === 'defeat') && /*#__PURE__*/React.createElement("p", {
    className: "mt-3 rounded-lg bg-slate-100 p-3 text-sm text-slate-700"
  }, "The story reached ", /*#__PURE__*/React.createElement("strong", null, quest.phase), ". You can still publish an epilogue, support item, or new encounter.")), /*#__PURE__*/React.createElement("section", {
    className: "rounded-xl border border-purple-200 bg-white p-3",
    "aria-labelledby": "cq-gm-heading"
  }, /*#__PURE__*/React.createElement("h4", {
    id: "cq-gm-heading",
    className: "font-black text-slate-900"
  }, "Co-GM workshop"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600"
  }, "AI only drafts. You preview, edit, and publish every change."), quest.activeEvent && /*#__PURE__*/React.createElement("div", {
    className: "mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs"
  }, /*#__PURE__*/React.createElement("strong", null, quest.activeEvent.title), /*#__PURE__*/React.createElement("p", null, quest.activeEvent.description), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: dismissGmEvent,
    className: "mt-2 min-h-11 rounded-lg border border-amber-300 bg-white px-3 font-bold text-amber-900"
  }, "Dismiss announcement")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex justify-end"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: !quest.gmUndo,
    onClick: undoLastGmChange,
    className: "min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 disabled:opacity-40"
  }, "Undo GM change", (quest.gmHistory || []).length > 1 ? ` (${quest.gmHistory.length} available)` : '')), /*#__PURE__*/React.createElement("label", {
    className: "mt-3 block text-xs font-bold text-slate-700"
  }, "Type", /*#__PURE__*/React.createElement("select", {
    value: gmType,
    onChange: event => setGmType(event.target.value),
    className: "mt-1 min-h-11 w-full rounded-lg border border-slate-400 p-2"
  }, /*#__PURE__*/React.createElement("option", {
    value: "narrative"
  }, "Story event"), /*#__PURE__*/React.createElement("option", {
    value: "challenge"
  }, "Challenge"), /*#__PURE__*/React.createElement("option", {
    value: "item"
  }, "Item"), /*#__PURE__*/React.createElement("option", {
    value: "enemy"
  }, "Enemy"))), gmType === 'item' && /*#__PURE__*/React.createElement("label", {
    className: "mt-2 block text-xs font-bold text-slate-700"
  }, "Item effect", /*#__PURE__*/React.createElement("select", {
    value: gmItemEffect,
    onChange: event => setGmItemEffect(event.target.value),
    className: "mt-1 min-h-11 w-full rounded-lg border border-slate-400 p-2"
  }, /*#__PURE__*/React.createElement("option", {
    value: "heal"
  }, "Restore party HP"), /*#__PURE__*/React.createElement("option", {
    value: "shield"
  }, "Grant party shield"), /*#__PURE__*/React.createElement("option", {
    value: "clue"
  }, "Reveal a concept clue"))), /*#__PURE__*/React.createElement("label", {
    className: "mt-2 block text-xs font-bold text-slate-700"
  }, "Direction", /*#__PURE__*/React.createElement("textarea", {
    value: gmRequest,
    onChange: event => setGmRequest(event.target.value),
    rows: 3,
    placeholder: "Connect photosynthesis to energy transfer",
    className: "mt-1 w-full rounded-lg border border-slate-400 p-2 text-sm"
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: manualDraft,
    className: "min-h-11 flex-1 rounded-lg border border-indigo-300 px-3 text-sm font-bold text-indigo-800"
  }, "Manual draft"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: busy,
    onClick: aiDraft,
    className: "min-h-11 flex-1 rounded-lg bg-indigo-700 px-3 text-sm font-bold text-white disabled:opacity-50"
  }, busy ? 'Working…' : 'AI draft')), gmDraft && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 rounded-lg border-2 border-amber-300 bg-amber-50 p-3",
    "aria-label": "GM draft preview"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-xs font-black uppercase text-amber-800"
  }, "Preview — not live"), /*#__PURE__*/React.createElement("label", {
    className: "mt-2 block text-xs font-bold"
  }, "Title", /*#__PURE__*/React.createElement("input", {
    value: gmDraft.title,
    onChange: event => setGmDraft({
      ...gmDraft,
      title: event.target.value
    }),
    className: "mt-1 min-h-11 w-full rounded border border-amber-300 p-2 text-sm"
  })), /*#__PURE__*/React.createElement("label", {
    className: "mt-2 block text-xs font-bold"
  }, "Description", /*#__PURE__*/React.createElement("textarea", {
    value: gmDraft.description,
    onChange: event => setGmDraft({
      ...gmDraft,
      description: event.target.value
    }),
    rows: 3,
    className: "mt-1 w-full rounded border border-amber-300 p-2 text-sm"
  })), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setGmDraft(null),
    className: "min-h-11 flex-1 rounded-lg bg-slate-200 font-bold text-slate-700"
  }, "Discard"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: publishDraft,
    className: "min-h-11 flex-1 rounded-lg bg-emerald-700 font-bold text-white"
  }, "Publish to class"))))), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 grid grid-cols-2 gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center text-xs sm:grid-cols-6",
    "aria-label": "Campaign evidence summary"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", {
    className: "block text-lg text-emerald-800"
  }, debrief.accuracy, "%"), "Accuracy"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", {
    className: "block text-lg text-emerald-800"
  }, debrief.combos), "Combos"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", {
    className: "block text-lg text-emerald-800"
  }, debrief.roleSynergies), "Role synergies"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", {
    className: "block text-lg text-emerald-800"
  }, debrief.peerAssists), "Peer assists"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", {
    className: "block text-lg text-emerald-800"
  }, debrief.puzzlesSolved), "Puzzles"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", {
    className: "block text-lg text-emerald-800"
  }, debrief.rounds), "Rounds")), debrief.conceptBreakdown.length > 0 && /*#__PURE__*/React.createElement("details", {
    className: "mt-3 rounded-xl border border-cyan-200 bg-cyan-50 p-3"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "cursor-pointer font-bold text-cyan-950"
  }, "Concept mastery evidence"), debrief.needsReview ? /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-sm text-amber-900"
  }, "Suggested review: ", /*#__PURE__*/React.createElement("strong", null, debrief.needsReview.concept), " (", debrief.needsReview.accuracy, "% across ", debrief.needsReview.rounds, " round", debrief.needsReview.rounds === 1 ? '' : 's', ")") : /*#__PURE__*/React.createElement("p", {
    className: "mt-2 text-sm text-emerald-800"
  }, "Every measured concept is currently at or above 70%."), /*#__PURE__*/React.createElement("ul", {
    className: "mt-2 grid gap-2 text-xs sm:grid-cols-2"
  }, debrief.conceptBreakdown.map(entry => /*#__PURE__*/React.createElement("li", {
    key: entry.concept,
    className: "rounded-lg bg-white p-2"
  }, /*#__PURE__*/React.createElement("strong", null, entry.concept), /*#__PURE__*/React.createElement("span", {
    className: "float-right"
  }, entry.accuracy, "%"), /*#__PURE__*/React.createElement("span", {
    className: "mt-1 block text-slate-600"
  }, entry.correct, "/", entry.total, " checks · ", entry.rounds, " round", entry.rounds === 1 ? '' : 's'))))), /*#__PURE__*/React.createElement("details", {
    className: "mt-4 rounded-xl border border-slate-200 bg-white p-3"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "cursor-pointer font-bold text-slate-800"
  }, "Quest log and shared inventory"), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 grid gap-3 md:grid-cols-2"
  }, /*#__PURE__*/React.createElement("ol", {
    className: "space-y-1 text-xs text-slate-600"
  }, (quest.log || []).slice(-8).reverse().map(entry => /*#__PURE__*/React.createElement("li", {
    key: entry.id
  }, /*#__PURE__*/React.createElement("strong", null, "Turn ", entry.turn, ":"), " ", entry.text))), /*#__PURE__*/React.createElement("ul", {
    className: "space-y-2 text-xs text-slate-600"
  }, quest.inventory.length ? quest.inventory.map((item, index) => /*#__PURE__*/React.createElement("li", {
    key: `${item.id}-${index}`,
    className: "flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-2"
  }, /*#__PURE__*/React.createElement("span", null, item.emoji, " ", /*#__PURE__*/React.createElement("strong", null, item.name), " — ", item.description), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => useSharedItem(index),
    className: "min-h-11 shrink-0 rounded-lg bg-indigo-700 px-3 font-bold text-white"
  }, "Use"))) : /*#__PURE__*/React.createElement("li", null, "No items yet.")))));
});
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ConceptQuestTeacherControls = ConceptQuestTeacherControls;
  window.AlloModules.ConceptQuestTeacherModule = true;
})();
