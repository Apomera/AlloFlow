(function(){"use strict";
if(window.AlloModules&&window.AlloModules.AdventureSessionHandlersModule){console.log("[CDN] AdventureSessionHandlersModule already loaded, skipping"); return;}
// adventure_session_handlers_source.jsx — Phase L of CDN modularization.
// 3 useCallback adventure-session helpers: handleDiceRollComplete,
// generateAdventureImage, generateNarrativeLedger.
//
// useCallback wrapper dropped in shim; functions called from event
// handlers and each other, never passed as memo deps.

// ── Mastery pacing constants (2026-07-16, unified) ──────────────────────────
// DURING an active climax the prompt instructs the model to shift masteryScore by
// +20 crit / +10 success / −5 partial|neutral / −15 failure / −25 crit-failure.
// The local fallback (used when the model returns no usable masteryScore) previously
// applied a DIFFERENT scale (+8/−2/−8); it now mirrors the prompt's mid-tier values
// so climax pacing is consistent regardless of which path scored the turn.
const CLIMAX_OUTCOME_DELTAS = { strategic_success: 10, partial_success: -5, neutral: -5, misconception: -15 };
// BEFORE the climax, hidden mastery accumulates toward the ≥80 auto-trigger. This is
// deliberately gentler than the climax scale (exploration shouldn't tank progress),
// and partial_success now earns a small POSITIVE step instead of being punished
// like a neutral turn (3-band assessment, same wave).
const HIDDEN_MASTERY_DELTAS = { strategic_success: 8, partial_success: 3, neutral: -2, misconception: -8 };

const handleDiceRollComplete = (deps) => {
  const { adventureState, pendingAdventureUpdate, adventureChanceMode, adventureDifficulty, adventureCustomInstructions, adventureLanguageMode, adventureInputMode, adventureFreeResponseEnabled, adventureConsistentCharacters, isAdventureStoryMode, isImmersiveMode, isSocialStoryMode, aiBotsActive, narrativeLedger, currentUiLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, inputText, history, isIndependentMode, isTeacherMode, apiKey, appId, activeSessionAppId, activeSessionCode, globalPoints, sessionData, user, adventureArtStyle, adventureCustomArtStyle, imageGenerationStyle, imageAspectRatio, alloBotRef, lastTurnSnapshot, lastReadTurnRef, setAdventureState, setPendingAdventureUpdate, setShowDice, setShowGlobalLevelUp, setActiveView, setGenerationStep, setError, setHistory, setGeneratedContent, setHasSavedAdventure, setIsResumingAdventure, setDiceResult, setFailedAdventureAction, setAdventureEffects, setIsProcessing, useLowQualityVisuals, adventureImageDB, addToast, t, warnLog, debugLog, cleanJson, safeJsonParse, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, archiveAdventureImage, SafetyContentChecker, handleAiSafetyFlag, playAdventureEventSound, playSound, handleScoreUpdate, getAdventureGlossaryTerms, generatePixelArtItem, generateAdventureImage, generateNarrativeLedger, detectClimaxArchetype, flyToElement, resilientJsonParse, storageDB, updateDoc, doc, db, ADVENTURE_GUARDRAIL, NARRATIVE_GUARDRAILS, INVISIBLE_NARRATOR_INSTRUCTIONS, SYSTEM_INVISIBLE_INSTRUCTIONS, SYSTEM_STATE_EXAMPLES } = deps;
  try { if (window._DEBUG_PHASE_L) console.log("[PhaseL] handleDiceRollComplete fired"); } catch(_) {}
      if (!pendingAdventureUpdate) {
          setShowDice(false);
          return;
      }
      const data = pendingAdventureUpdate;
      if (!data.scene || typeof data.scene !== 'object') {
          data.scene = { text: t('adventure.status_messages.continue') || 'The adventure continues.', options: [] };
      }
      data.scene.text = String(data.scene.text || (t('adventure.status_messages.continue') || 'The adventure continues.'));
      if (!Array.isArray(data.scene.options)) data.scene.options = [];
      // ── Deterministic-mode score↔tag consistency guard (2026-07-16) ─────────
      // In deterministic mode the model self-reports BOTH a 1-20 performance score
      // and a pedagogical outcomeType as independent fields; when they disagree
      // (e.g. "misconception" + score 19) the student got +100 XP, a success
      // fanfare, AND stats.failures++ for the same turn. The tag is the
      // pedagogical signal, so the score is reconciled to it. Chance mode is left
      // alone — there the d20 is real dice and the score legitimately diverges.
      if (!adventureChanceMode && data.rollDetails) {
          const _tag = data.outcomeType || data.rollDetails.outcomeType || '';
          let _s = Number(data.rollDetails.total || data.rollDetails.d20 || 10);
          if (!Number.isFinite(_s)) _s = 10;
          _s = Math.max(1, Math.min(20, _s));
          if (_tag === 'misconception' && _s >= 12) _s = 11;            // never grade a misconception as a success
          else if (_tag === 'strategic_success' && _s < 12) _s = 12;    // never fail a tagged strategic success
          data.rollDetails = { ...data.rollDetails, total: _s };
      }
      playAdventureEventSound('transition');
      setAdventureState(prev => {
          const currentStats = prev.stats || { successes: 0, failures: 0, decisions: 0, partials: 0, conceptsFound: [] };
          const strategyHintUsed = prev.hintUsedTurn === prev.turnCount;
          let newSuccesses = currentStats.successes;
          let newFailures = currentStats.failures;
          let newPartials = currentStats.partials || 0;
          const outcomeType = data.outcomeType || data.rollDetails?.outcomeType || 'neutral';
          if (outcomeType === 'strategic_success') newSuccesses++;
          if (outcomeType === 'misconception') newFailures++;
          if (outcomeType === 'partial_success') newPartials++; // 3-band assessment (2026-07-16): partials were invisible
          let newConcepts = [...(currentStats.conceptsFound || [])];
          if (data.conceptsUsed && Array.isArray(data.conceptsUsed)) {
              data.conceptsUsed.forEach(c => {
                  if (!newConcepts.includes(c)) newConcepts.push(c);
              });
          }
          const newStats = {
              successes: newSuccesses,
              failures: newFailures,
              partials: newPartials,
              decisions: (currentStats.decisions || 0) + 1,
              conceptsFound: newConcepts
          };
          const currentEnergy = (typeof prev.energy === 'number' && !isNaN(prev.energy)) ? prev.energy : 100;
          const diffRules = {
              'Story':    { energyLossMult: 0.5,  rewardMult: 1.5 },
              'Normal':   { energyLossMult: 1.0,  rewardMult: 1.0 },
              'Hard':     { energyLossMult: 1.5,  rewardMult: 0.75 },
              'Hardcore': { energyLossMult: 2.5,  rewardMult: 0.5 }
          };
          const rules = diffRules[adventureDifficulty] || diffRules['Normal'];
          let energyDelta = 0;
          if (data.rollDetails) {
            const score = data.rollDetails.total || data.rollDetails.d20 || 10;
            const CRIT_THRESHOLD = adventureChanceMode ? 28 : 18;
            const SUCCESS_THRESHOLD = adventureChanceMode ? 22 : 12;
            const PARTIAL_THRESHOLD = adventureChanceMode ? 16 : 6;
            if (score >= CRIT_THRESHOLD) {
                energyDelta = 10;
            } else if (score >= SUCCESS_THRESHOLD) {
                energyDelta = -5;
            } else if (score >= PARTIAL_THRESHOLD) {
                energyDelta = -10;
            } else {
                energyDelta = -20;
            }
          } else {
              energyDelta = parseInt(data.energyChange, 10);
              if (isNaN(energyDelta)) energyDelta = 0;
          }
          if (energyDelta < 0) {
              energyDelta = Math.round(energyDelta * rules.energyLossMult);
          }
          let newEnergy = Math.min(100, Math.max(0, currentEnergy + energyDelta));
          const safeEnergyDelta = energyDelta;
          const momentumChange = parseInt(data.debateMomentumChange, 10) || 0;
          let currentMomentum = (typeof prev.debateMomentum === 'number') ? prev.debateMomentum : 50;
          let newMomentum = Math.min(100, Math.max(0, currentMomentum + momentumChange));
          let nextDebatePhase = prev.debatePhase || 'setup';
          if (data.resetDebate) {
              newMomentum = 50;
              nextDebatePhase = 'setup';
          } else if (adventureInputMode === 'debate' && nextDebatePhase === 'setup') {
              nextDebatePhase = 'active';
          }
          const xpMult = prev.activeXpMultiplier || 1;
          const goldBuffTurns = prev.activeGoldBuffTurns || 0;
          const isGoldBuffActive = goldBuffTurns > 0;
          let goldAwarded = parseInt(data.goldAwarded, 10) || 0;
          if (data.rollDetails) {
              const rollTotal = data.rollDetails.total || data.rollDetails.d20 || 0;
              if (goldAwarded === 0 && rollTotal >= 12) {
                   if (Math.random() > 0.5) {
                       goldAwarded = Math.floor(Math.random() * 15) + 5;
                   }
              }
          }
          if (isGoldBuffActive) {
              if (goldAwarded > 0) {
                  goldAwarded *= 2;
              } else {
                  goldAwarded = Math.floor(Math.random() * 25) + 15;
              }
          }
          goldAwarded = Math.round(goldAwarded * rules.rewardMult);
          const newGold = (prev.gold || 0) + goldAwarded;
          let xpDelta = 0;
          if (data.rollDetails) {
              const score = data.rollDetails.total || data.rollDetails.d20 || 10;
              const CRIT_THRESHOLD = adventureChanceMode ? 28 : 18;
              const SUCCESS_THRESHOLD = adventureChanceMode ? 22 : 12;
              const PARTIAL_THRESHOLD = adventureChanceMode ? 16 : 6;
              if (score >= CRIT_THRESHOLD) xpDelta = 100;
              else if (score >= SUCCESS_THRESHOLD) xpDelta = 50;
              else if (score >= PARTIAL_THRESHOLD) xpDelta = 25;
              else xpDelta = 10;
          } else {
              xpDelta = parseInt(data.xpAwarded, 10);
              if (isNaN(xpDelta)) xpDelta = 0;
          }
          if (xpDelta > 0) {
              xpDelta = Math.round(xpDelta * rules.rewardMult);
          }
          if (xpDelta > 0) {
              xpDelta = Math.round(xpDelta * xpMult);
          }
          // Keep Strategy Hint use as support metadata without reducing earned XP.
          // The student still chooses and writes the response after receiving the scaffold.
          const safeXpDelta = xpDelta;
          let newXp = prev.xp + safeXpDelta;
          let newLevel = prev.level;
          let newXpToNext = prev.xpToNextLevel;
          let leveledUp = false;
          if (newXp < 0) {
              newXp = 0;
          } else if (newXp >= newXpToNext) {
              newLevel += 1;
              newXp = newXp - newXpToNext;
              newXpToNext = Math.floor(newXpToNext * 1.5);
              leveledUp = true;
              newEnergy = Math.min(100, newEnergy + 50);
          }
          let newInventory = [...prev.inventory];
          let inventoryChanges = [];
          let keyItemAdded = false;
          if (data.inventoryUpdate) {
              if (data.inventoryUpdate.add) {
                  const rawAdd = data.inventoryUpdate.add;
                  const itemsToAdd = Array.isArray(rawAdd) ? rawAdd : [rawAdd];
                  itemsToAdd.forEach(itemData => {
                      const itemName = typeof itemData === 'object' ? itemData.name : itemData;
                      const aiDescription = typeof itemData === 'object' ? itemData.description : null;
                      let itemType = typeof itemData === 'object' ? itemData.type : undefined;
                      if (!itemType) {
                          const lower = itemName.toLowerCase();
                          const isConsumable = /ration|food|potion|drink|snack|eat|bandage|salve|elixir|fruit|bread|water|apple|berry/i.test(lower);
                          itemType = isConsumable ? 'consumable' : 'permanent';
                      }
                      const isPermanent = itemType === 'permanent';
                      if (isPermanent) keyItemAdded = true;
                      const newItem = {
                          id: Date.now() + Math.random(),
                          name: itemName,
                          image: null,
                          isLoading: true,
                          effectType: itemType === 'permanent' ? 'key_item' : 'energy',
                          description: aiDescription || (itemType === 'permanent' ? t('adventure.defaults.key_item_desc') : t('adventure.defaults.energy_desc')),
                          genContext: aiDescription
                      };
                      newInventory.push(newItem);
                      inventoryChanges.push(newItem);
                  });
              }
              if (data.inventoryUpdate.remove) {
                  const removeTarget = data.inventoryUpdate.remove;
                  const itemsToRemove = Array.isArray(removeTarget) ? removeTarget : [removeTarget];
                  newInventory = newInventory.filter(i => !itemsToRemove.includes(i.name));
              }
          }
          let newSystemResources = [...(prev.systemResources || [])];
          const stateUpdate = data.systemStateUpdate || data.systemResourceUpdate;
          if (stateUpdate) {
              if (stateUpdate.add) {
                  const statesToAdd = Array.isArray(stateUpdate.add)
                      ? stateUpdate.add
                      : [stateUpdate.add];
                  statesToAdd.forEach(state => {
                      const existingIdx = newSystemResources.findIndex(r => r.name === state.name);
                      if (existingIdx >= 0) {
                          newSystemResources[existingIdx] = {
                              ...newSystemResources[existingIdx],
                              quantity: (newSystemResources[existingIdx].quantity || 0) + (state.quantity || 1)
                          };
                      } else {
                          newSystemResources.push({
                              id: Date.now() + Math.random(),
                              name: state.name,
                              icon: state.icon || '📊',
                              quantity: state.quantity || 1,
                              type: state.type || 'strategic',
                              unit: state.unit || '',
                          });
                      }
                  });
              }
              if (stateUpdate.remove) {
                  const statesToRemove = Array.isArray(stateUpdate.remove)
                      ? stateUpdate.remove
                      : [stateUpdate.remove];
                  statesToRemove.forEach(state => {
                      const existingIdx = newSystemResources.findIndex(r => r.name === state.name);
                      if (existingIdx >= 0) {
                          const newQuantity = newSystemResources[existingIdx].quantity - (state.quantity || 1);
                          if (newQuantity <= 0) {
                              newSystemResources.splice(existingIdx, 1);
                          } else {
                              newSystemResources[existingIdx] = {
                                  ...newSystemResources[existingIdx],
                                  quantity: newQuantity
                              };
                          }
                      }
                  });
              }
          }
          const nextTurn = prev.turnCount + 1;
          const updatedVoices = { ...prev.voiceMap, ...data.voices };
          let feedbackText = `${data.feedback || data.evaluation}`;
          let aiMasteryScore = data.masteryScore;
          const currentClimaxState = prev.climax || { masteryScore: 0, isActive: false, archetype: 'Auto', attempts: 0 };
          if (currentClimaxState.isActive) {
              // ── Climax score integrity (2026-07-16) ─────────────────────────
              // The model returns the NEW masteryScore directly; previously it was
              // trusted verbatim — a hallucinated 100 (or 9999, or a string) resolved
              // the whole climax in one turn. Now: coerce to number, cap the per-turn
              // shift to the documented ±25 (the largest legal swing, "critical
              // failure"), clamp to 0-100, and fall back to the outcomeType delta
              // when the model returned nothing usable.
              const _prevMastery = Number(currentClimaxState.masteryScore);
              const _prevSafe = Number.isFinite(_prevMastery) ? Math.min(100, Math.max(0, _prevMastery)) : 50;
              let _candidate = Number(aiMasteryScore);
              if (!Number.isFinite(_candidate)) {
                  const outcomeType = data.outcomeType || data.rollDetails?.outcomeType || 'neutral';
                  // Unified with the prompt's documented scale (CLIMAX_OUTCOME_DELTAS).
                  const delta = CLIMAX_OUTCOME_DELTAS[outcomeType] !== undefined ? CLIMAX_OUTCOME_DELTAS[outcomeType] : -5;
                  _candidate = _prevSafe + delta;
              } else {
                  const _shift = Math.max(-25, Math.min(25, _candidate - _prevSafe));
                  _candidate = _prevSafe + _shift;
              }
              aiMasteryScore = Math.min(100, Math.max(0, _candidate));
          }
          let hiddenMastery = currentClimaxState.masteryScore || 0;
          if (!currentClimaxState.isActive) {
              const outcomeType = data.outcomeType || data.rollDetails?.outcomeType || 'neutral';
              const masteryDelta = HIDDEN_MASTERY_DELTAS[outcomeType] !== undefined ? HIDDEN_MASTERY_DELTAS[outcomeType] : -2;
              hiddenMastery = Math.min(100, Math.max(0, hiddenMastery + masteryDelta));
          }
          const adventureGoal = prev.adventureGoal || "Narrative Climax";
          const minTurns = prev.climaxMinTurns || 20;
          const autoTrigger = prev.enableAutoClimax || false;
          const shouldTriggerClimax = adventureGoal === "Narrative Climax"
                                      && !currentClimaxState.isActive
                                      && autoTrigger
                                      && hiddenMastery >= 80
                                      && nextTurn >= minTurns;
          const finalMasteryScore = shouldTriggerClimax ? 50 : (currentClimaxState.isActive ? aiMasteryScore : hiddenMastery);
          let finalResult = null;
          if (currentClimaxState.isActive) {
              // Resolution is derived from the CLAMPED score only (2026-07-16): the
              // model's own climaxResult declaration used to be able to end the climax
              // early (victory below 100 / failure above 0). Now the boss fight
              // resolves exactly when the earned score crosses the line — which also
              // makes the Mission Report's forced 100/0 honest.
              if (finalMasteryScore >= 100) finalResult = 'victory';
              else if (finalMasteryScore <= 0) finalResult = 'failure';
          }
          const updatedClimax = {
              ...currentClimaxState,
              masteryScore: finalMasteryScore,
              isActive: shouldTriggerClimax ? true : currentClimaxState.isActive
          };
          if (data.rollDetails) {
            const total = data.rollDetails.total || data.rollDetails.d20 || 0;
            const outcome = data.rollDetails.outcomeType || data.rollDetails.outcome || "";
            feedbackText += `\n\n${t('adventure.results.header')}\n`;
            if (adventureChanceMode) {
                const d20 = data.rollDetails.d20 || 0;
                const strat = data.rollDetails.strategyRating || (total - d20);
                feedbackText += t('adventure.results.roll_calc', {
                    roll: d20,
                    strat: strat,
                    total: total
                });
            } else {
                feedbackText += t('adventure.results.perf_score', { total: total });
            }
            feedbackText += `\n*${outcome}*`;
          }
          const extraInfo = [];
          if (safeXpDelta > 0) {
              extraInfo.push(t('adventure.feedback.xp_gain', { amount: safeXpDelta }));
          }
          if (xpMult > 1 && safeXpDelta > 0) {
              extraInfo.push(t('adventure.feedback.double_xp'));
          }
          if (safeEnergyDelta !== 0) {
              const sign = safeEnergyDelta > 0 ? '+' : '';
              extraInfo.push(`${sign}${safeEnergyDelta} ${t('adventure.energy')}`);
          }
          if (goldAwarded > 0) {
              let goldStr = t('adventure.feedback.gold_gain', { amount: goldAwarded });
              if (isGoldBuffActive) {
                   goldStr += ` ${t('adventure.feedback.detector_found')}`;
              }
              extraInfo.push(goldStr);
          }
          feedbackText += ` (${extraInfo.join(', ')})`;
          const resolvedChoice = prev.pendingChoice || data.pendingChoice || '';
          if (finalResult === 'victory') {
              // prev.history already contains the final scene+choice (appended at
              // choice time) — re-adding them here double-counted the climactic
              // exchange in the ledger input (fixed 2026-07-16).
              const victoryHistory = [
                  ...prev.history,
                  { type: 'feedback', text: data.feedback || data.evaluation || '', ...(strategyHintUsed ? { support: 'strategy_hint' } : {}) }
              ];
              generateNarrativeLedger(victoryHistory, deps);
              addToast(t('adventure.status_messages.log_updated'), "info");
              setTimeout(() => {
                  playAdventureEventSound('critical_success');
                  addToast(t('adventure.climax.toast_victory'), "success");
                  setShowGlobalLevelUp(true);
                  try { window.dispatchEvent(new CustomEvent('alloflow:bot-celebrate', { detail: { kind: 'backflip', confetti: true } })); } catch (_) {}
              }, 0);
              return {
                  ...prev,
                  isGameOver: true,
                  history: [...prev.history, { type: 'feedback', text: data.feedback || data.evaluation || '', ...(strategyHintUsed ? { support: 'strategy_hint' } : {}) }],
                  currentScene: data.scene, pendingChoice: null,
                  climax: { ...updatedClimax, isActive: false, masteryScore: 100 },
                  canStartSequel: true,
                  isLoading: false,
                  stats: newStats
              };
          } else if (finalResult === 'failure') {
              // Same dedup as the victory path (2026-07-16): scene+choice are already
              // in prev.history from choice time.
              const failureHistory = [
                  ...prev.history,
                  { type: 'feedback', text: data.feedback || data.evaluation || '', ...(strategyHintUsed ? { support: 'strategy_hint' } : {}) }
              ];
              generateNarrativeLedger(failureHistory, deps);
              addToast(t('adventure.status_messages.log_updated'), "info");
              setTimeout(() => {
                  playAdventureEventSound('failure');
                  addToast(t('adventure.climax.toast_failure'), "error");
              }, 0);
              return {
                  ...prev,
                  history: [...prev.history, { type: 'feedback', text: data.feedback, ...(strategyHintUsed ? { support: 'strategy_hint' } : {}) }],
                  currentScene: data.scene, pendingChoice: null,
                  energy: Math.max(0, prev.energy - 20),
                  climax: {
                      ...updatedClimax,
                      isActive: false,
                      masteryScore: 0,
                      attempts: (prev.climax.attempts || 0) + 1
                  },
                  isLoading: false,
                  stats: newStats
              };
          }
          setTimeout(() => {
              setAdventureEffects({
                  xp: safeXpDelta !== 0 ? safeXpDelta : null,
                  energy: safeEnergyDelta !== 0 ? safeEnergyDelta : null,
                  levelUp: leveledUp ? newLevel : null
              });
              if (leveledUp) {
                   playAdventureEventSound('critical_success');
                   addToast(t('toasts.level_up', { level: newLevel }), "success");
                   addToast(t('toasts.shop_unlocked'), "info");
                   addToast(t('adventure.feedback.energy_restored', { amount: 50 }), "success");
                   try { window.dispatchEvent(new CustomEvent('alloflow:bot-celebrate', { detail: { kind: 'backflip', confetti: true } })); } catch (_) {}
              } else {
                  if (data.rollDetails) {
                      const score = data.rollDetails.total || data.rollDetails.d20 || 10;
                      if (score >= 18) {
                          playAdventureEventSound('critical_success');
                      } else if (score >= 12) {
                          playAdventureEventSound('success');
                      } else {
                          if (safeEnergyDelta < 0) {
                              playAdventureEventSound('damage');
                          } else {
                              playAdventureEventSound('failure');
                          }
                      }
                  } else {
                       if (safeXpDelta > 0) playAdventureEventSound('success');
                       else if (safeEnergyDelta < 0) playAdventureEventSound('damage');
                       else playAdventureEventSound('failure');
                  }
              }
              if (data.resetDebate) {
                  playAdventureEventSound('success');
                  addToast(`Debate Concluded! Moving to new topic: ${data.newTopic || 'Next Topic'}`, "success");
              }
              if (goldAwarded > 0) {
                  addToast(t('toasts.gold_earned', { amount: goldAwarded }), "success");
              }
              if (data.inventoryUpdate) {
                  if (data.inventoryUpdate.add) {
                      const rawAdd = data.inventoryUpdate.add;
                      const itemsToAdd = Array.isArray(rawAdd) ? rawAdd : [rawAdd];
                      const names = itemsToAdd.map(i => typeof i === 'object' ? i.name : i).join(', ');
                      addToast(`Obtained: ${names}`, "success");
                      setTimeout(() => playAdventureEventSound('item_get'), 500);
                  }
                  if (data.inventoryUpdate.remove) addToast(`Lost: ${data.inventoryUpdate.remove}`, "error");
              }
              const stateNotification = data.systemStateUpdate || data.systemResourceUpdate;
              if (stateNotification) {
                  if (stateNotification.add) {
                      const adds = Array.isArray(stateNotification.add) ? stateNotification.add : [stateNotification.add];
                      const stateNames = adds.map(s => `${s.icon || '📊'} ${s.name} (+${s.quantity || 1}${s.unit ? ' ' + s.unit : ''})`).join(', ');
                      addToast(`${t('adventure.system_state') || 'System State'}: ${stateNames}`, "success");
                  }
                  if (stateNotification.remove) {
                      const removes = Array.isArray(stateNotification.remove) ? stateNotification.remove : [stateNotification.remove];
                      const stateNames = removes.map(s => `${s.name} (-${s.quantity || 1}${s.unit ? ' ' + s.unit : ''})`).join(', ');
                      addToast(`State Decreased: ${stateNames}`, "warning");
                  }
              }
              inventoryChanges.forEach(item => {
                  generatePixelArtItem(item.name, item.genContext).then(url => {
                      setAdventureState(curr => ({
                          ...curr,
                          inventory: curr.inventory.map(i => i.id === item.id ? { ...i, image: url || null, isLoading: false } : i)
                      }));
                  });
              });
              const shouldContinue = newEnergy > 0
                  && !data.isTerminalTurn
                  && (adventureFreeResponseEnabled || data.scene.options.length !== 0);
              if (shouldContinue) {
                  generateAdventureImage(data.scene.text, nextTurn, deps);
              }
              // Energy-death feedback (2026-07-16): running out of energy ends the
              // adventure, but it used to end SILENTLY (and the game-over UI even
              // celebrated). Tell the student what happened, with the failure sound.
              if (newEnergy <= 0 && !prev.isGameOver) {
                  playAdventureEventSound('failure');
                  addToast(t('adventure.energy_depleted') || '⚡ Out of energy — the adventure ends here. Rest up and try again!', 'error');
              }
              if (nextTurn % 5 === 0) {
                  const updatedHistory = [...prev.history, { type: 'feedback', text: feedbackText, ...(strategyHintUsed ? { support: 'strategy_hint' } : {}) }];
                  generateNarrativeLedger(updatedHistory, deps);
              }
              if (nextTurn % 10 === 0 && nextTurn > 0) {
                  addToast(t('adventure.save_reminder') || "💾 Consider saving your adventure progress!", "info");
              }
          }, 0);
          return {
              ...prev,
              history: [...prev.history, { type: 'feedback', text: feedbackText, ...(strategyHintUsed ? { support: 'strategy_hint' } : {}) }],
              currentScene: { ...data.scene, charactersInScene: data.charactersInScene || [] }, pendingChoice: null,
              isLoading: false,
              turnCount: nextTurn,
              isGameOver: newEnergy <= 0
                  || !!data.isTerminalTurn
                  || (!adventureFreeResponseEnabled && data.scene.options.length === 0),
              level: newLevel,
              xp: newXp,
              xpToNextLevel: newXpToNext,
              energy: newEnergy,
              gold: newGold,
              sceneImage: null,
              sceneImagePreview: null,
              isImageLoading: true,
              imagePolishStage: 'generating',
              loadingStage: 'Painting scene art…',
              inventory: newInventory,
              systemResources: newSystemResources,
              voiceMap: updatedVoices,
              isShopOpen: leveledUp ? true : prev.isShopOpen,
              activeRollModifier: 0,
              activeXpMultiplier: 1,
              activeGoldBuffTurns: Math.max(0, goldBuffTurns - 1),
              lastKeyItemTurn: keyItemAdded ? nextTurn : prev.lastKeyItemTurn,
              debateMomentum: newMomentum,
              debateTopic: data.newTopic || prev.debateTopic,
              debatePhase: nextDebatePhase,
              climax: updatedClimax,
              stats: newStats
          };
      });
      setShowDice(false);
      setPendingAdventureUpdate(null);
};

const selectAdventureReferenceCharacters = (characters, sceneCharacterNames = []) => {
  const portraitCharacters = (Array.isArray(characters) ? characters : []).filter(character => character?.portrait);
  const normalizedSceneNames = new Set((Array.isArray(sceneCharacterNames) ? sceneCharacterNames : [])
      .map(name => String(name || '').trim().toLocaleLowerCase())
      .filter(Boolean));
  const selected = [];
  const addCharacter = (character) => {
      if (character && !selected.includes(character)) selected.push(character);
  };

  portraitCharacters
      .filter(character => normalizedSceneNames.has(String(character.name || '').trim().toLocaleLowerCase()))
      .forEach(addCharacter);
  addCharacter(portraitCharacters.find(character =>
      character.role?.toLowerCase().includes('protagonist') ||
      character.role?.toLowerCase().includes('player')
  ));
  portraitCharacters.forEach(addCharacter);
  return selected.slice(0, 4);
};

const createAdventureReferenceSheet = async (characters) => {
  const portraitCharacters = (Array.isArray(characters) ? characters : [])
      .filter(character => character?.portrait)
      .slice(0, 4);
  if (portraitCharacters.length < 2) return null;

  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Reference sheet canvas is unavailable.');

  const loadPortrait = (src) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('A cast portrait could not be loaded.'));
      image.src = src;
  });
  const images = await Promise.all(portraitCharacters.map(character => loadPortrait(character.portrait)));
  const padding = 24;
  const gap = 16;
  const cellSize = (canvas.width - (padding * 2) - gap) / 2;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  images.forEach((image, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = padding + column * (cellSize + gap);
      const y = padding + row * (cellSize + gap);
      const sourceScale = Math.max(cellSize / image.width, cellSize / image.height);
      const sourceWidth = cellSize / sourceScale;
      const sourceHeight = cellSize / sourceScale;
      const sourceX = Math.max(0, (image.width - sourceWidth) / 2);
      const sourceY = Math.max(0, (image.height - sourceHeight) / 2);
      ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, cellSize, cellSize);
  });

  return canvas.toDataURL('image/png').split(',')[1] || null;
};

const buildAdventureConsistencyReference = async ({ portraitCharacters, protagonist, useReferenceSheet, createReferenceSheet = createAdventureReferenceSheet, warn = () => {} }) => {
  let referenceBase64 = protagonist?.portrait?.split(',')[1] || null;
  let consistencyPrompt = `
      Refine the main character in this scene to visually match this reference portrait.
      Character: ${protagonist?.name || 'Protagonist'} — ${protagonist?.appearance || 'Use the supplied portrait'}.
      Keep the scene composition, background, lighting, and any other characters unchanged.
      Only adjust the protagonist's facial features, hair, and clothing to match the reference.
      NO TEXT. NO LABELS. NO UI ELEMENTS.
  `;
  if (useReferenceSheet) {
      try {
          const compositeReference = await createReferenceSheet(portraitCharacters);
          if (compositeReference) {
              referenceBase64 = compositeReference;
              consistencyPrompt = `
                  The attached reference sheet shows this story's cast.
                  Refine the characters in this scene to match their appearances in the reference sheet.
                  Keep the scene composition, background, and lighting unchanged.
                  NO TEXT. NO LABELS. NO UI ELEMENTS.
              `;
          }
      } catch (referenceSheetErr) {
          warn('Character reference sheet failed; falling back to the protagonist portrait.', referenceSheetErr);
      }
  }
  return { referenceBase64, consistencyPrompt };
};

const generateAdventureImage = async (sceneText, targetTurn, deps) => {
  const { adventureState, pendingAdventureUpdate, adventureChanceMode, adventureDifficulty, adventureCustomInstructions, adventureLanguageMode, adventureInputMode, adventureFreeResponseEnabled, adventureConsistentCharacters, isGeminiImageBackend, isAdventureStoryMode, isImmersiveMode, isSocialStoryMode, aiBotsActive, narrativeLedger, currentUiLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, inputText, history, isIndependentMode, isTeacherMode, apiKey, appId, activeSessionAppId, activeSessionCode, globalPoints, sessionData, user, adventureArtStyle, adventureCustomArtStyle, imageGenerationStyle, imageAspectRatio, alloBotRef, lastTurnSnapshot, lastReadTurnRef, setAdventureState, setPendingAdventureUpdate, setShowDice, setShowGlobalLevelUp, setActiveView, setGenerationStep, setError, setHistory, setGeneratedContent, setHasSavedAdventure, setIsResumingAdventure, setDiceResult, setFailedAdventureAction, setAdventureEffects, setIsProcessing, useLowQualityVisuals, adventureImageDB, addToast, t, warnLog, debugLog, cleanJson, safeJsonParse, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, archiveAdventureImage, SafetyContentChecker, handleAiSafetyFlag, playAdventureEventSound, playSound, handleScoreUpdate, getAdventureGlossaryTerms, generatePixelArtItem, generateAdventureImage, generateNarrativeLedger, detectClimaxArchetype, flyToElement, resilientJsonParse, storageDB, updateDoc, doc, db, ADVENTURE_GUARDRAIL, NARRATIVE_GUARDRAILS, INVISIBLE_NARRATOR_INSTRUCTIONS, SYSTEM_INVISIBLE_INSTRUCTIONS, SYSTEM_STATE_EXAMPLES } = deps;
  try { if (window._DEBUG_PHASE_L) console.log("[PhaseL] generateAdventureImage fired"); } catch(_) {}
      try {
          setAdventureState(prev => prev.turnCount === targetTurn
              ? { ...prev, sceneImage: null, sceneImagePreview: null, loadingStage: 'Painting scene art…', imagePolishStage: 'generating' }
              : prev);
          let characterContext = "";
          if (adventureConsistentCharacters && adventureState.characters?.length > 0) {
              const sceneChars = pendingAdventureUpdate?.charactersInScene
                  || pendingAdventureUpdate?.scene?.charactersInScene
                  || adventureState.currentScene?.charactersInScene;
              let relevantChars;
              if (sceneChars && Array.isArray(sceneChars) && sceneChars.length > 0) {
                  relevantChars = adventureState.characters.filter(c =>
                      sceneChars.some(name => c.name.toLowerCase() === name.toLowerCase())
                  );
                  if (relevantChars.length === 0) relevantChars = [adventureState.characters[0]];
              } else {
                  relevantChars = adventureState.characters.filter(c =>
                      c.role?.toLowerCase().includes('protagonist') ||
                      c.role?.toLowerCase().includes('player')
                  );
                  if (relevantChars.length === 0) relevantChars = [adventureState.characters[0]];
              }
              characterContext = relevantChars.map(c =>
                  `${c.name} (${c.role}): ${c.appearance}`
              ).join('. ') + '. ';
          } else {
              const isCreature = /animal|creature|dragon|alien|robot|monster|fox|cat|dog|dinosaur/i.test(adventureCustomInstructions || "");
              if (!isCreature) {
                 const gradeMap = {
                     'Kindergarten': '5 year old child', '1st Grade': '6 year old child', '2nd Grade': '7 year old child',
                     '3rd Grade': '8 year old child', '4th Grade': '9 year old child', '5th Grade': '10 year old child',
                     '6th Grade': '11 year old child', '7th Grade': '12 year old child', '8th Grade': '13 year old teen',
                     '9th Grade': '14 year old teen', '10th Grade': '15 year old teen', '11th Grade': '16 year old teen',
                     '12th Grade': '17 year old teen', 'Higher Ed': 'young adult student', 'Adult': 'adult professional',
                 };
                 const ageDesc = gradeMap[gradeLevel] || 'student';
                 const storedAppearance = adventureState.characterAppearance;
                 if (storedAppearance) {
                     characterContext = `Main character: ${storedAppearance}. `;
                 } else {
                     const hairOptions = ['brown hair', 'black hair', 'blonde hair', 'red hair'];
                     const outfitOptions = ['casual clothes', 'adventure outfit', 'school uniform', 'colorful attire'];
                     const randomHair = hairOptions[Math.floor(Math.random() * hairOptions.length)];
                     const randomOutfit = outfitOptions[Math.floor(Math.random() * outfitOptions.length)];
                     const generatedAppearance = `${ageDesc} with ${randomHair}, wearing ${randomOutfit}, friendly expression`;
                     setAdventureState(prev => ({ ...prev, characterAppearance: generatedAppearance }));
                     characterContext = `Main character: ${generatedAppearance}. `;
                 }
              } else {
                 const storedAppearance = adventureState.characterAppearance;
                 if (storedAppearance) {
                     characterContext = `Main character: ${storedAppearance}. `;
                 } else {
                     const creatureMatch = (adventureCustomInstructions || "").match(/(?:a|an|the)?\s*([\w\s]+(?:dragon|fox|cat|dog|robot|alien|creature|monster|dinosaur|animal|bird|wolf|bear|owl|bunny|rabbit))/i);
                     let creatureType = creatureMatch ? creatureMatch[1].trim() : 'friendly creature';
                     const colorOptions = ['golden', 'silver', 'emerald green', 'sapphire blue', 'sunset orange', 'midnight black', 'snow white'];
                     const featureOptions = ['bright curious eyes', 'a fluffy appearance', 'sleek shiny fur', 'colorful markings', 'a gentle demeanor'];
                     const randomColor = colorOptions[Math.floor(Math.random() * colorOptions.length)];
                     const randomFeature = featureOptions[Math.floor(Math.random() * featureOptions.length)];
                     const generatedAppearance = `${randomColor} ${creatureType} with ${randomFeature}`;
                     setAdventureState(prev => ({ ...prev, characterAppearance: generatedAppearance }));
                     characterContext = `Main character: ${generatedAppearance}. `;
                 }
              }
          }
          const isSocialMode = isSocialStoryMode
              || adventureInputMode === 'social_story'
              || (adventureState?.meta?.includes('Social Story'));
          const ART_STYLE_MAP = {
              'auto': null,
              'storybook': 'Soft watercolor storybook illustration, rounded shapes, warm palette, family-friendly, whimsical',
              'pixel': '16-bit pixel art retro game style, vibrant colors, clean sprites, nostalgic',
              'cinematic': 'Cinematic digital painting, dramatic lighting, widescreen composition, photorealistic',
              'anime': 'Anime-style illustration, clean linework, expressive characters, vibrant colors, manga-inspired',
              'crayon': "Children's hand-drawn crayon illustration, simple and colorful, playful, sketchy lines",
          };
          let styleDescription;
          if (adventureArtStyle && adventureArtStyle !== 'auto') {
              if (adventureArtStyle === 'custom' && adventureCustomArtStyle) {
                  styleDescription = adventureCustomArtStyle;
              } else {
                  styleDescription = ART_STYLE_MAP[adventureArtStyle] || "Educational adventure game. High quality, immersive environment.";
              }
          } else if (isAdventureStoryMode || isSocialMode) {
              styleDescription = "Storybook illustration. Whimsical, soft lighting, family-friendly digital painting. Vibrant and inviting.";
          } else {
              styleDescription = "Educational adventure game. High quality, immersive environment.";
          }
          let prompt = `Cinematic digital art of: ${sceneText.substring(0, 400)}. ${characterContext} Style: ${styleDescription} STRICTLY NO TEXT, NO LABELS, NO UI, NO WORDS. Visual only.`;
          if (adventureState.isImmersiveMode) {
              prompt += " Style: Cinematic wide angle, landscape composition, rule of thirds.";
          }
          const targetWidth = useLowQualityVisuals ? 300 : 800;
          const targetQual = useLowQualityVisuals ? 0.5 : 0.9;
          let imageUrl = await callImagen(prompt, targetWidth, targetQual);
          if (!imageUrl) {
              warnLog("Imagen returned no image, skipping refinement.");
              setAdventureState(prev => {
                  if (prev.turnCount === targetTurn) {
                      return { ...prev, isImageLoading: false, sceneImagePreview: null, imagePolishStage: null, loadingStage: null };
                  }
                  return prev;
              });
              return;
          }
          setAdventureState(prev => prev.turnCount === targetTurn
              ? {
                  ...prev,
                  sceneImagePreview: imageUrl,
                  isImageLoading: true,
                  imagePolishStage: 'cleaning',
                  loadingStage: 'Polishing scene details…',
              }
              : prev);
          try {
              const rawBase64 = imageUrl.split(',')[1];
              const editPrompt = `
                Refine this image to look like a ${(isAdventureStoryMode || isSocialMode) ? 'high-quality storybook illustration' : 'high-quality, cinematic screenshot'} of: "${sceneText.substring(0, 200)}...".
                CRITICAL INSTRUCTION: REMOVE ALL TEXT.
                1. Erase any text, letters, numbers, speech bubbles, labels, or UI elements visible in the image.
                2. Paint over these areas to seamlessly match the background scenery.
                3. Ensure the image is purely visual with zero writing.
                ${(isAdventureStoryMode || isSocialMode) ? "4. Ensure it looks friendly and inviting." : ""}
              `;
              const refinedUrl = await callGeminiImageEdit(editPrompt, rawBase64, targetWidth, targetQual);
              if (refinedUrl) {
                  imageUrl = refinedUrl;
              }
          } catch (refineErr) {
              warnLog("Adventure image refinement failed, using original.", refineErr);
          }
          if (adventureConsistentCharacters && adventureState.characters?.length > 0) {
              setAdventureState(prev => prev.turnCount === targetTurn
                  ? {
                      ...prev,
                      sceneImagePreview: imageUrl,
                      imagePolishStage: 'matching',
                      loadingStage: 'Matching your cast…',
                  }
                  : prev);
              const sceneCharacterNames = pendingAdventureUpdate?.charactersInScene
                  || pendingAdventureUpdate?.scene?.charactersInScene
                  || adventureState.currentScene?.charactersInScene
                  || [];
              const portraitCharacters = selectAdventureReferenceCharacters(adventureState.characters, sceneCharacterNames);
              const protagonist = adventureState.characters.find(c =>
                  c.role?.toLowerCase().includes('protagonist') ||
                  c.role?.toLowerCase().includes('player')
              ) || adventureState.characters[0];
              const useGeminiReferenceSheet = isGeminiImageBackend && portraitCharacters.length >= 2;
              if (protagonist?.portrait || useGeminiReferenceSheet) {
                  try {
                      const currentBase64 = imageUrl.split(',')[1];
                      const { referenceBase64, consistencyPrompt } = await buildAdventureConsistencyReference({
                          portraitCharacters,
                          protagonist,
                          useReferenceSheet: useGeminiReferenceSheet,
                          warn: warnLog,
                      });
                      if (referenceBase64) {
                          const consistentUrl = await callGeminiImageEdit(consistencyPrompt, currentBase64, targetWidth, targetQual, referenceBase64);
                          if (consistentUrl) {
                              imageUrl = consistentUrl;
                              debugLog('Character consistency pass applied successfully');
                          }
                      }
                  } catch (consistencyErr) {
                      warnLog('Character consistency pass failed, using previous result.', consistencyErr);
                  }
              }
          }
          setAdventureState(prev => {
              if (prev.turnCount === targetTurn) {
                  const newCacheEntry = { turn: targetTurn, image: imageUrl };
                  const updatedCache = [...(prev.imageCache || []), newCacheEntry].slice(-5);
                  adventureImageDB.storeImage(targetTurn, imageUrl);
                  return {
                      ...prev,
                      sceneImage: imageUrl,
                      sceneImagePreview: null,
                      isImageLoading: false,
                      imagePolishStage: null,
                      loadingStage: null,
                      imageCache: updatedCache,
                  };
              }
              return prev;
          });
      } catch (e) {
          warnLog("Adventure Image Gen Failed", e);
          setAdventureState(prev => {
              if (prev.turnCount === targetTurn) {
                  return { ...prev, isImageLoading: false, sceneImagePreview: null, imagePolishStage: null, loadingStage: null };
              }
              return prev;
          });
      }
};

const generateNarrativeLedger = async (currentHistory, deps) => {
  const { adventureState, pendingAdventureUpdate, adventureChanceMode, adventureDifficulty, adventureCustomInstructions, adventureLanguageMode, adventureInputMode, adventureFreeResponseEnabled, adventureConsistentCharacters, isAdventureStoryMode, isImmersiveMode, isSocialStoryMode, aiBotsActive, narrativeLedger, currentUiLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, inputText, history, isIndependentMode, isTeacherMode, apiKey, appId, activeSessionAppId, activeSessionCode, globalPoints, sessionData, user, adventureArtStyle, adventureCustomArtStyle, imageGenerationStyle, imageAspectRatio, alloBotRef, lastTurnSnapshot, lastReadTurnRef, setAdventureState, setPendingAdventureUpdate, setShowDice, setShowGlobalLevelUp, setActiveView, setGenerationStep, setError, setHistory, setGeneratedContent, setHasSavedAdventure, setIsResumingAdventure, setDiceResult, setFailedAdventureAction, setAdventureEffects, setIsProcessing, useLowQualityVisuals, adventureImageDB, addToast, t, warnLog, debugLog, cleanJson, safeJsonParse, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, archiveAdventureImage, SafetyContentChecker, handleAiSafetyFlag, playAdventureEventSound, playSound, handleScoreUpdate, getAdventureGlossaryTerms, generatePixelArtItem, generateAdventureImage, generateNarrativeLedger, detectClimaxArchetype, flyToElement, resilientJsonParse, storageDB, updateDoc, doc, db, ADVENTURE_GUARDRAIL, NARRATIVE_GUARDRAILS, INVISIBLE_NARRATOR_INSTRUCTIONS, SYSTEM_INVISIBLE_INSTRUCTIONS, SYSTEM_STATE_EXAMPLES } = deps;
  try { if (window._DEBUG_PHASE_L) console.log("[PhaseL] generateNarrativeLedger fired"); } catch(_) {}
      setIsProcessing(true);
      setGenerationStep("Consolidating adventure memory...");
      try {
          const historyText = currentHistory.map(h => `${h.type.toUpperCase()}: ${h.text}`).join('\n');
          const prompt = `
            You are an Adventure Logkeeper.
            Your goal is to summarize the recent events of an interactive story into a concise "Narrative Ledger" to preserve long-term memory/context for the AI.
            Current History Log:
            ${historyText}
            Previous Ledger Summary:
            "${adventureState.narrativeLedger || "None"}",
            Task:
            1. Consolidate the "Current History Log" and the "Previous Ledger" into a single, updated narrative summary.
            2. Focus on:
               - Major Plot Points & Decisions made.
               - Current Location.
               - Player Status (Allies, Reputation, Health state).
               - Cast Status: For each named character, note whether they are currently with the protagonist, absent, or if their relationship has changed.
            3. Inventory: Explicitly list ONLY "Key Items" (Quest items, Artifacts, plot-relevant tools).
               - STRICTLY IGNORE "Consumable Items" like Rations, Food, Energy Potions, or Gold. Do not mention them.
            Return ONLY the updated summary text. Keep it under 300 words.
          `;
          const result = await callGemini(prompt);
          setAdventureState(prev => ({
              ...prev,
              narrativeLedger: result
          }));
          addToast(t('adventure.status_messages.log_updated'), "success");
      } catch (e) {
          warnLog("Ledger Gen Error", e);
      } finally {
          setIsProcessing(false);
      }
};

window.AlloModules = window.AlloModules || {};
window.AlloModules.AdventureSessionHandlers = {
  handleDiceRollComplete,
  generateAdventureImage,
  generateNarrativeLedger,
  selectAdventureReferenceCharacters,
  createAdventureReferenceSheet,
  buildAdventureConsistencyReference,
};
window.AlloModules.AdventureSessionHandlersModule = true;
console.log("[AdventureSessionHandlers] 3 helpers registered");
})();
