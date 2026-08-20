/**
 * Concept Quest deterministic game engine.
 *
 * The live transport is intentionally not part of this module.  Callers store
 * the returned state inside escapeRoomState.conceptQuest so the exact same
 * payload works through Firestore and the Google Mailbox session adapter.
 */
(function(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.AlloModules = root.AlloModules || {};
    root.AlloModules.ConceptQuestEngine = api;
    root.AlloModules.ConceptQuestEngineModule = true;
  }
})(typeof window !== 'undefined' ? window : null, function() {
  'use strict';

  var VERSION = 2;
  var ABILITIES = [
    { id: 'analyze', name: 'Analyze', emoji: '\uD83D\uDD0E', description: 'Use evidence to deal 3 damage.', damage: 3 },
    { id: 'explain', name: 'Explain', emoji: '\uD83D\uDCA1', description: 'Teach the idea: 2 damage and restore 1 party HP.', damage: 2, heal: 1 },
    { id: 'connect', name: 'Connect', emoji: '\uD83D\uDD17', description: 'Link concepts: 2 damage and add 1 party shield.', damage: 2, shield: 1 },
    { id: 'question', name: 'Question', emoji: '\u2753', description: 'Probe a misconception: 1 damage even when the answer misses.', damage: 2, missDamage: 1 }
  ];
  var ROLES = [
    { id: 'analyst', name: 'Evidence Analyst', emoji: '\uD83D\uDD0E', abilityId: 'analyze', description: 'Adds 1 damage when Analyze succeeds.' },
    { id: 'explainer', name: 'Concept Explainer', emoji: '\uD83D\uDCA1', abilityId: 'explain', description: 'Adds 1 damage when Explain succeeds.' },
    { id: 'connector', name: 'Pattern Connector', emoji: '\uD83D\uDD17', abilityId: 'connect', description: 'Adds 1 damage when Connect succeeds.' },
    { id: 'investigator', name: 'Question Investigator', emoji: '\u2753', abilityId: 'question', description: 'Adds 1 damage when Question succeeds.' }
  ];
  var SUPPORTS = [
    { id: 'clarify', name: 'Clarify', emoji: '\uD83E\uDDE0', description: 'If your teammate misses, recover 1 damage by clarifying the concept.' },
    { id: 'guard', name: 'Guard', emoji: '\uD83D\uDEE1\uFE0F', description: 'A correct response adds 1 party shield for your teammate.' },
    { id: 'encourage', name: 'Encourage', emoji: '\uD83D\uDE4C', description: 'A correct response restores 1 party HP for your teammate.' }
  ];
  var ROOM_LAYOUT = [
    { x: 8, y: 48 }, { x: 23, y: 22 }, { x: 39, y: 48 }, { x: 54, y: 20 },
    { x: 54, y: 76 }, { x: 70, y: 48 }, { x: 84, y: 22 }, { x: 92, y: 62 }
  ];
  var ROOM_KINDS = ['start', 'battle', 'puzzle', 'treasure', 'battle', 'puzzle', 'battle', 'boss'];
  var ROOM_EMOJIS = ['\uD83C\uDFE0', '\uD83C\uDF32', '\uD83E\uDDED', '\uD83C\uDF81', '\uD83C\uDF0B', '\uD83E\uDDEA', '\uD83C\uDF0C', '\uD83D\uDC09'];

  function clamp(value, min, max) {
    var number = Number(value);
    return Math.max(min, Math.min(max, Number.isFinite(number) ? number : min));
  }

  function cleanText(value, fallback, maxLength) {
    var text = String(value == null ? '' : value).replace(/[<>]/g, '').trim();
    if (!text) text = fallback || '';
    return text.slice(0, maxLength || 500);
  }

  function normalizeQuestion(question, index) {
    question = question || {};
    var options = Array.isArray(question.options) ? question.options :
      (Array.isArray(question.choices) ? question.choices : []);
    options = options.slice(0, 6).map(function(option, optionIndex) {
      if (option && typeof option === 'object') return cleanText(option.text || option.label, 'Choice ' + (optionIndex + 1), 180);
      return cleanText(option, 'Choice ' + (optionIndex + 1), 180);
    });
    if (options.length < 2) {
      options = ['I can support this idea with evidence', 'I need another clue'];
    }
    var correctIndex = Number.isInteger(question.correctIndex) ? question.correctIndex :
      (Number.isInteger(question.correctAnswer) ? question.correctAnswer : 0);
    if (typeof question.correctAnswer === 'string') {
      var answerIndex = options.findIndex(function(option) {
        return option.toLowerCase() === question.correctAnswer.trim().toLowerCase();
      });
      if (answerIndex >= 0) correctIndex = answerIndex;
    }
    correctIndex = clamp(correctIndex, 0, options.length - 1);
    return {
      id: 'challenge-' + (index + 1),
      prompt: cleanText(question.question || question.prompt || question.text, 'Which response best demonstrates the room concept?', 500),
      options: options,
      correctIndex: correctIndex,
      explanation: cleanText(question.explanation || question.feedback || question.rationale, 'Use evidence from the lesson to explain the best answer.', 500)
    };
  }

  function conceptLabel(question, index) {
    question = question || {};
    var label = question.concept || question.standard || question.topic || question.skill || question.category;
    if (Array.isArray(label)) label = label.join(', ');
    if (!label) label = cleanText(question.question || question.prompt, 'Concept ' + (index + 1), 42);
    return cleanText(label, 'Concept ' + (index + 1), 72);
  }

  function createSession(options) {
    options = options || {};
    var sourceQuestions = Array.isArray(options.questions) ? options.questions.filter(Boolean) : [];
    if (!sourceQuestions.length) sourceQuestions = [{}];
    var title = cleanText(options.title, 'The Concept Compass', 100);
    var rooms = ROOM_LAYOUT.map(function(position, index) {
      var source = sourceQuestions[index % sourceQuestions.length];
      var kind = ROOM_KINDS[index];
      var hp = kind === 'boss' ? 18 : (kind === 'battle' ? 9 : 6);
      var neighbors = [];
      if (index > 0) neighbors.push('room-' + index);
      if (index < ROOM_LAYOUT.length - 1) neighbors.push('room-' + (index + 2));
      if (index === 1) neighbors.push('room-5');
      if (index === 4) neighbors.push('room-2');
      var challenges = [];
      var challengeCount = Math.min(3, sourceQuestions.length);
      for (var challengeOffset = 0; challengeOffset < challengeCount; challengeOffset++) {
        challenges.push(normalizeQuestion(sourceQuestions[(index + challengeOffset) % sourceQuestions.length], index * 3 + challengeOffset));
      }
      return {
        id: 'room-' + (index + 1),
        name: index === 0 ? 'Scholar Base' : (kind === 'boss' ? 'Mastery Gate' : conceptLabel(source, index)),
        emoji: ROOM_EMOJIS[index],
        x: position.x,
        y: position.y,
        kind: kind,
        concept: conceptLabel(source, index),
        neighbors: neighbors,
        challengeIndex: 0,
        challenges: challenges,
        challenge: challenges[0],
        enemy: kind === 'start' || kind === 'treasure' ? null : {
          id: 'enemy-' + (index + 1),
          name: kind === 'boss' ? 'The Misconception Hydra' : (kind === 'puzzle' ? 'Riddle Wisp' : 'Confusionling'),
          emoji: kind === 'boss' ? '\uD83D\uDC09' : (kind === 'puzzle' ? '\uD83D\uDC7B' : '\uD83D\uDC7E'),
          hp: hp,
          maxHp: hp,
          attack: kind === 'boss' ? 3 : 2
        },
        reward: kind === 'treasure' ? {
          id: 'item-insight-lens', name: 'Insight Lens', emoji: '\uD83D\uDD0D',
          description: 'The teacher may spend this to reveal a clue.', effect: { type: 'clue', amount: 1 }
        } : null
      };
    });
    return {
      version: VERSION,
      title: title,
      objective: cleanText(options.objective, 'Navigate together, explain the lesson concepts, and defeat the final misconception.', 240),
      turn: 1,
      phase: 'explore',
      currentRoomId: 'room-1',
      rooms: rooms,
      visited: ['room-1'],
      party: { hp: 14, maxHp: 14, shield: 0, xp: 0 },
      inventory: [],
      sigils: [],
      sigilsRequired: 3,
      activeEvent: null,
      gmUndo: null,
      gmHistory: [],
      log: [{ id: 'log-start', turn: 1, text: 'The class entered Scholar Base. Choose the path together.' }],
      abilities: ABILITIES,
      roles: ROLES,
      supports: SUPPORTS,
      lastRound: null,
      roundHistory: []
    };
  }

  function getRoom(quest, roomId) {
    return quest && Array.isArray(quest.rooms) ? quest.rooms.find(function(room) { return room.id === roomId; }) : null;
  }

  function tallyVotes(votes, allowedRoomIds) {
    var counts = {};
    Object.keys(votes || {}).sort().forEach(function(uid) {
      var roomId = votes[uid];
      if (allowedRoomIds.indexOf(roomId) >= 0) counts[roomId] = (counts[roomId] || 0) + 1;
    });
    return allowedRoomIds.slice().sort(function(a, b) {
      return (counts[b] || 0) - (counts[a] || 0) || a.localeCompare(b);
    })[0] || null;
  }

  function resolveTravel(quest, votes, selectedRoomId) {
    var current = getRoom(quest, quest.currentRoomId);
    if (!current || quest.phase !== 'explore') return { quest: quest, error: 'The party is not ready to travel.' };
    var destinationId = selectedRoomId || tallyVotes(votes, current.neighbors || []);
    if ((current.neighbors || []).indexOf(destinationId) < 0) return { quest: quest, error: 'Choose a connected room.' };
    var destination = getRoom(quest, destinationId);
    if (!destination) return { quest: quest, error: 'That room is unavailable.' };
    if (destination.kind === 'boss' && (quest.sigils || []).length < (quest.sigilsRequired || 3)) {
      return { quest: quest, error: 'The Mastery Gate needs ' + ((quest.sigilsRequired || 3) - (quest.sigils || []).length) + ' more concept sigil(s).' };
    }
    var visited = (quest.visited || []).indexOf(destinationId) >= 0 ? (quest.visited || []).slice() : (quest.visited || []).concat([destinationId]);
    var rooms = quest.rooms.map(function(room) {
      if (room.id !== destinationId || !room.reward) return room;
      return Object.assign({}, room, { reward: null });
    });
    var inventory = (quest.inventory || []).slice();
    if (destination.reward && !inventory.some(function(item) { return item.id === destination.reward.id; })) inventory.push(destination.reward);
    var nextPhase = destination.enemy && destination.enemy.hp > 0 ? 'battle' : 'explore';
    return { quest: Object.assign({}, quest, {
      currentRoomId: destinationId,
      rooms: rooms,
      visited: visited,
      inventory: inventory.slice(0, 12),
      phase: nextPhase,
      activeEvent: null,
      turn: quest.turn + 1,
      log: (quest.log || []).concat([{ id: 'log-' + Date.now(), turn: quest.turn + 1, text: 'The party entered ' + destination.name + (destination.reward ? ' and found ' + destination.reward.name + '.' : '.') }]).slice(-30)
    }) };
  }

  function resolveBattle(quest, actions, roles) {
    var room = getRoom(quest, quest.currentRoomId);
    if (!room || !room.enemy || quest.phase !== 'battle') return { quest: quest, error: 'There is no active encounter.' };
    var challenge = room.challenge || {};
    var damage = 0;
    var heal = 0;
    var shield = 0;
    var correct = 0;
    var total = 0;
    var synergyCount = 0;
    var assistedCount = 0;
    var supportHeal = 0;
    var supportShield = 0;
    var correctAbilityIds = [];
    Object.keys(actions || {}).sort().forEach(function(uid) {
      var action = actions[uid] || {};
      var ability = ABILITIES.find(function(entry) { return entry.id === action.abilityId; }) || ABILITIES[0];
      var isCorrect = Number(action.answerIndex) === Number(challenge.correctIndex);
      total += 1;
      if (isCorrect) {
        correct += 1;
        damage += ability.damage || 0;
        heal += ability.heal || 0;
        shield += ability.shield || 0;
        correctAbilityIds.push(ability.id);
        var role = ROLES.find(function(entry) { return entry.id === (roles && roles[uid]); });
        if (role && role.abilityId === ability.id) { damage += 1; synergyCount += 1; }
      } else {
        damage += ability.missDamage || 0;
      }
    });
    if (!total) return { quest: quest, error: 'Wait for at least one student action.' };
    Object.keys(actions || {}).sort().forEach(function(uid) {
      var action = actions[uid] || {};
      var targetUid = cleanText(action.supportTargetUid, '', 128);
      if (!targetUid || targetUid === uid || !actions[targetUid]) return;
      var helperCorrect = Number(action.answerIndex) === Number(challenge.correctIndex);
      if (!helperCorrect) return;
      var supportId = action.supportId;
      if (supportId === 'clarify' && Number(actions[targetUid].answerIndex) !== Number(challenge.correctIndex)) {
        damage += 1;
        assistedCount += 1;
      } else if (supportId === 'guard') {
        supportShield += 1;
        assistedCount += 1;
      } else if (supportId === 'encourage') {
        supportHeal += 1;
        assistedCount += 1;
      }
    });
    var combo = Array.from(new Set(correctAbilityIds)).length >= 3;
    if (combo) damage += 3;
    heal += supportHeal;
    shield += supportShield;
    var accuracy = total ? correct / total : 0;
    var encounterRule = '';
    if (room.kind === 'puzzle') {
      if (correct * 3 >= total * 2) {
        damage += 4;
        encounterRule = 'Puzzle consensus opened the reasoning lock for 4 bonus damage.';
      } else {
        damage = Math.min(damage, 2);
        encounterRule = 'The reasoning lock needs two-thirds consensus; discuss the evidence and try another clue.';
      }
    } else if (room.kind === 'boss') {
      if (accuracy >= 0.6) {
        damage += 2;
        encounterRule = 'The class broke the Mastery Barrier for 2 bonus damage.';
      } else {
        damage = Math.min(damage, 3);
        encounterRule = 'The Mastery Barrier limited damage; regroup around the strongest evidence.';
      }
    }
    damage = clamp(damage, 0, 20);
    heal = clamp(heal, 0, 4);
    shield = clamp(shield, 0, 6);
    var enemyHp = Math.max(0, room.enemy.hp - damage);
    var enemyDefeated = enemyHp === 0;
    var incoming = enemyDefeated ? 0 : room.enemy.attack;
    var totalShield = clamp((quest.party.shield || 0) + shield, 0, 8);
    var absorbed = Math.min(incoming, totalShield);
    var partyHp = clamp(quest.party.hp + heal - Math.max(0, incoming - absorbed), 0, quest.party.maxHp);
    var remainingShield = Math.max(0, totalShield - incoming);
    var rooms = quest.rooms.map(function(entry) {
      if (entry.id !== room.id) return entry;
      var nextChallengeIndex = Array.isArray(entry.challenges) && entry.challenges.length
        ? ((entry.challengeIndex || 0) + 1) % entry.challenges.length : 0;
      return Object.assign({}, entry, {
        enemy: Object.assign({}, entry.enemy, { hp: enemyHp }),
        challengeIndex: nextChallengeIndex,
        challenge: Array.isArray(entry.challenges) && entry.challenges.length ? entry.challenges[nextChallengeIndex] : entry.challenge
      });
    });
    var won = enemyDefeated && room.kind === 'boss';
    var phase = partyHp <= 0 ? 'defeat' : (won ? 'complete' : (enemyDefeated ? 'explore' : 'battle'));
    var sigils = (quest.sigils || []).slice();
    if (enemyDefeated && room.kind !== 'boss' && sigils.indexOf(room.concept) < 0) sigils.push(room.concept);
    var text = correct + '/' + total + ' concept checks succeeded; the party dealt ' + damage + ' damage.';
    if (combo) text += ' A three-ability concept combo added 3 damage!';
    if (synergyCount) text += ' ' + synergyCount + ' party role synergies activated.';
    if (assistedCount) text += ' ' + assistedCount + ' peer assists activated.';
    if (encounterRule) text += ' ' + encounterRule;
    if (enemyDefeated) text += ' ' + room.enemy.name + ' was defeated!';
    else text += ' The party took ' + Math.max(0, incoming - absorbed) + ' damage.';
    return { quest: Object.assign({}, quest, {
      rooms: rooms,
      phase: phase,
      turn: quest.turn + 1,
      party: Object.assign({}, quest.party, { hp: partyHp, shield: remainingShield, xp: (quest.party.xp || 0) + correct * 5 }),
      sigils: sigils,
      lastRound: {
        turn: quest.turn,
        correct: correct,
        total: total,
        damage: damage,
        incoming: Math.max(0, incoming - absorbed),
        combo: combo,
        synergyCount: synergyCount,
        assistedCount: assistedCount,
        encounterRule: encounterRule,
        explanation: cleanText(challenge.explanation, 'Discuss why the strongest answer fits the lesson concept.', 500)
      },
      roundHistory: (quest.roundHistory || []).concat([{
        turn: quest.turn, roomId: room.id, concept: room.concept, correct: correct, total: total,
        accuracy: total ? Math.round((correct / total) * 100) : 0, damage: damage,
        incoming: Math.max(0, incoming - absorbed), combo: combo, synergyCount: synergyCount,
        assistedCount: assistedCount, roomKind: room.kind, encounterRule: encounterRule,
        enemyDefeated: enemyDefeated
      }]).slice(-24),
      log: (quest.log || []).concat([{ id: 'log-' + Date.now(), turn: quest.turn + 1, text: text + (enemyDefeated && room.kind !== 'boss' ? ' A concept sigil was secured.' : '') }]).slice(-30)
    }), summary: { correct: correct, total: total, damage: damage, incoming: Math.max(0, incoming - absorbed), enemyDefeated: enemyDefeated, combo: combo, synergyCount: synergyCount, assistedCount: assistedCount, encounterRule: encounterRule } };
  }

  function gmSnapshot(quest) {
    return {
      rooms: quest.rooms,
      party: quest.party,
      inventory: quest.inventory,
      phase: quest.phase,
      activeEvent: quest.activeEvent,
      logLength: (quest.log || []).length
    };
  }

  function gmHistoryWithCurrent(quest) {
    return (quest.gmHistory || []).concat([gmSnapshot(quest)]).slice(-5);
  }

  function useItem(quest, itemIndex) {
    var index = Number(itemIndex);
    if (!Number.isInteger(index) || index < 0 || index >= (quest.inventory || []).length) return { quest: quest, error: 'Choose an available item.' };
    var inventory = quest.inventory.slice();
    var item = inventory.splice(index, 1)[0];
    var effect = item.effect || {};
    var party = Object.assign({}, quest.party);
    var activeEvent = { type: 'item', title: item.name + ' used', description: item.description, publishedAt: Date.now() };
    if (effect.type === 'heal') party.hp = clamp(party.hp + clamp(effect.amount, 1, 3), 0, party.maxHp);
    if (effect.type === 'shield') party.shield = clamp((party.shield || 0) + clamp(effect.amount, 1, 3), 0, 8);
    if (effect.type === 'clue') {
      var room = getRoom(quest, quest.currentRoomId);
      activeEvent.description = (room && room.challenge && room.challenge.explanation) || 'Look for evidence in the lesson content.';
    }
    var phase = quest.phase === 'defeat' && party.hp > 0 ? 'explore' : quest.phase;
    return { quest: Object.assign({}, quest, {
      inventory: inventory,
      party: party,
      phase: phase,
      gmUndo: gmSnapshot(quest),
      gmHistory: gmHistoryWithCurrent(quest),
      activeEvent: activeEvent,
      log: (quest.log || []).concat([{ id: 'log-' + Date.now(), turn: quest.turn, text: 'The party used ' + item.name + '.' }]).slice(-30)
    }), item: item };
  }

  function normalizeGmDraft(input) {
    input = input || {};
    var allowedTypes = ['narrative', 'item', 'challenge', 'enemy'];
    var type = allowedTypes.indexOf(input.type) >= 0 ? input.type : 'narrative';
    var draft = {
      type: type,
      title: cleanText(input.title, 'A New Development', 100),
      description: cleanText(input.description, 'The situation changes and the party must respond together.', 600)
    };
    if (type === 'item') {
      var effectTypes = ['heal', 'shield', 'clue'];
      var effect = input.item && input.item.effect || {};
      draft.item = {
        id: cleanText(input.item && input.item.id, 'gm-item-' + Date.now(), 80).replace(/[^a-zA-Z0-9_-]/g, '-'),
        name: cleanText(input.item && input.item.name, draft.title, 80),
        emoji: cleanText(input.item && input.item.emoji, '\uD83C\uDF81', 8),
        description: cleanText(input.item && input.item.description, draft.description, 240),
        effect: { type: effectTypes.indexOf(effect.type) >= 0 ? effect.type : 'shield', amount: clamp(effect.amount, 1, 3) }
      };
    }
    if (type === 'challenge') draft.challenge = normalizeQuestion(input.challenge || input, 99);
    if (type === 'enemy') {
      draft.enemy = {
        id: 'gm-enemy-' + Date.now(),
        name: cleanText(input.enemy && input.enemy.name, draft.title, 80),
        emoji: cleanText(input.enemy && input.enemy.emoji, '\uD83D\uDC7E', 8),
        hp: clamp(input.enemy && input.enemy.hp, 4, 16),
        maxHp: clamp(input.enemy && (input.enemy.maxHp || input.enemy.hp), 4, 16),
        attack: clamp(input.enemy && input.enemy.attack, 1, 3)
      };
      draft.challenge = normalizeQuestion(input.challenge || input, 99);
    }
    return draft;
  }

  function publishGmDraft(quest, rawDraft) {
    var draft = normalizeGmDraft(rawDraft);
    var party = Object.assign({}, quest.party);
    var inventory = (quest.inventory || []).slice();
    var rooms = quest.rooms.slice();
    var phase = quest.phase;
    if (draft.type === 'item') {
      inventory.push(draft.item);
      inventory = inventory.slice(-12);
      if (draft.item.effect.type === 'heal') party.hp = clamp(party.hp + draft.item.effect.amount, 0, party.maxHp);
      if (draft.item.effect.type === 'shield') party.shield = clamp((party.shield || 0) + draft.item.effect.amount, 0, 8);
      if (quest.phase === 'defeat' && party.hp > 0) phase = 'explore';
    } else if (draft.type === 'challenge') {
      rooms = rooms.map(function(room) {
        if (room.id !== quest.currentRoomId) return room;
        var gate = room.enemy && room.enemy.hp > 0 ? room.enemy : {
          id: 'gm-challenge-' + Date.now(), name: 'Challenge Gate', emoji: '\uD83E\uDDE9', hp: 4, maxHp: 4, attack: 1
        };
        return Object.assign({}, room, { challenge: draft.challenge, enemy: gate });
      });
      phase = 'battle';
    } else if (draft.type === 'enemy') {
      rooms = rooms.map(function(room) { return room.id === quest.currentRoomId ? Object.assign({}, room, { enemy: draft.enemy, challenge: draft.challenge }) : room; });
      phase = 'battle';
    }
    return Object.assign({}, quest, {
      rooms: rooms,
      party: party,
      inventory: inventory,
      phase: phase,
      gmUndo: gmSnapshot(quest),
      gmHistory: gmHistoryWithCurrent(quest),
      activeEvent: { type: draft.type, title: draft.title, description: draft.description, publishedAt: Date.now() },
      log: (quest.log || []).concat([{ id: 'log-' + Date.now(), turn: quest.turn, text: 'GM: ' + draft.title + ' — ' + draft.description }]).slice(-30)
    });
  }

  function undoLastGmChange(quest) {
    var history = quest && Array.isArray(quest.gmHistory) ? quest.gmHistory.slice() : [];
    var snapshot = history.length ? history.pop() : (quest && quest.gmUndo);
    if (!snapshot) return { quest: quest, error: 'There is no GM change to undo.' };
    var restoredLog = (quest.log || []).slice(0, Math.max(0, snapshot.logLength || 0));
    restoredLog.push({ id: 'log-' + Date.now(), turn: quest.turn, text: 'The teacher undid the last GM change.' });
    return { quest: Object.assign({}, quest, {
      rooms: snapshot.rooms,
      party: snapshot.party,
      inventory: snapshot.inventory,
      phase: snapshot.phase,
      activeEvent: snapshot.activeEvent,
      gmHistory: history,
      gmUndo: history.length ? history[history.length - 1] : null,
      log: restoredLog.slice(-30)
    }) };
  }

  function adjustEncounter(quest, kind, amount) {
    if (!quest || ['heal', 'shield', 'enemy'].indexOf(kind) < 0) return { quest: quest, error: 'Choose a valid pacing adjustment.' };
    amount = clamp(amount, -6, 6);
    var party = Object.assign({}, quest.party);
    var rooms = quest.rooms.slice();
    var phase = quest.phase;
    if (kind === 'heal') party.hp = clamp(party.hp + amount, 0, party.maxHp);
    if (kind === 'shield') party.shield = clamp((party.shield || 0) + amount, 0, 8);
    if (kind === 'enemy') {
      var currentRoom = getRoom(quest, quest.currentRoomId);
      if (!currentRoom || !currentRoom.enemy) return { quest: quest, error: 'There is no encounter to adjust.' };
      var nextEnemyHp = clamp(currentRoom.enemy.hp + amount, 0, currentRoom.enemy.maxHp);
      rooms = rooms.map(function(room) {
        return room.id === currentRoom.id ? Object.assign({}, room, { enemy: Object.assign({}, room.enemy, { hp: nextEnemyHp }) }) : room;
      });
      if (nextEnemyHp === 0 && quest.phase === 'battle') phase = currentRoom.kind === 'boss' ? 'complete' : 'explore';
    }
    var signedAmount = amount > 0 ? '+' + amount : String(amount);
    return { quest: Object.assign({}, quest, {
      party: party,
      rooms: rooms,
      phase: phase,
      gmUndo: gmSnapshot(quest),
      gmHistory: gmHistoryWithCurrent(quest),
      log: (quest.log || []).concat([{ id: 'log-' + Date.now(), turn: quest.turn, text: 'GM pacing adjustment: ' + kind + ' ' + signedAmount + '.' }]).slice(-30)
    }) };
  }

  function dismissEvent(quest) {
    return Object.assign({}, quest, { activeEvent: null });
  }

  function createDebrief(quest) {
    var rounds = quest && Array.isArray(quest.roundHistory) ? quest.roundHistory : [];
    var totalAnswers = rounds.reduce(function(sum, round) { return sum + (round.total || 0); }, 0);
    var correctAnswers = rounds.reduce(function(sum, round) { return sum + (round.correct || 0); }, 0);
    var conceptTotals = {};
    rounds.forEach(function(round) {
      var concept = cleanText(round.concept, 'Unlabeled concept', 72);
      conceptTotals[concept] = conceptTotals[concept] || { concept: concept, correct: 0, total: 0, rounds: 0 };
      conceptTotals[concept].correct += round.correct || 0;
      conceptTotals[concept].total += round.total || 0;
      conceptTotals[concept].rounds += 1;
    });
    var conceptBreakdown = Object.keys(conceptTotals).map(function(key) {
      var entry = conceptTotals[key];
      return Object.assign({}, entry, { accuracy: entry.total ? Math.round((entry.correct / entry.total) * 100) : 0 });
    }).sort(function(a, b) { return a.accuracy - b.accuracy || a.concept.localeCompare(b.concept); });
    return {
      outcome: quest && quest.phase === 'complete' ? 'victory' : (quest && quest.phase === 'defeat' ? 'regroup' : 'in-progress'),
      rounds: rounds.length,
      accuracy: totalAnswers ? Math.round((correctAnswers / totalAnswers) * 100) : 0,
      combos: rounds.filter(function(round) { return round.combo; }).length,
      roleSynergies: rounds.reduce(function(sum, round) { return sum + (round.synergyCount || 0); }, 0),
      peerAssists: rounds.reduce(function(sum, round) { return sum + (round.assistedCount || 0); }, 0),
      puzzlesSolved: rounds.filter(function(round) { return round.roomKind === 'puzzle' && round.enemyDefeated; }).length,
      sigils: (quest && quest.sigils || []).slice(),
      conceptsCleared: Array.from(new Set(rounds.filter(function(round) { return round.enemyDefeated; }).map(function(round) { return round.concept; }))),
      conceptBreakdown: conceptBreakdown,
      needsReview: conceptBreakdown.length && conceptBreakdown[0].accuracy < 70 ? conceptBreakdown[0] : null,
      strongestConcept: conceptBreakdown.length ? conceptBreakdown[conceptBreakdown.length - 1] : null
    };
  }

  return {
    VERSION: VERSION,
    ABILITIES: ABILITIES,
    ROLES: ROLES,
    SUPPORTS: SUPPORTS,
    createSession: createSession,
    getRoom: getRoom,
    tallyVotes: tallyVotes,
    resolveTravel: resolveTravel,
    resolveBattle: resolveBattle,
    useItem: useItem,
    normalizeGmDraft: normalizeGmDraft,
    publishGmDraft: publishGmDraft,
    undoLastGmChange: undoLastGmChange,
    adjustEncounter: adjustEncounter,
    dismissEvent: dismissEvent,
    createDebrief: createDebrief
  };
});
