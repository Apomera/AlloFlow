// adventure_session_handlers_source.jsx — Phase L of CDN modularization.
// 3 useCallback adventure-session helpers: handleDiceRollComplete,
// generateAdventureImage, generateNarrativeLedger.
//
// useCallback wrapper dropped in shim; functions called from event
// handlers and each other, never passed as memo deps.

const handleDiceRollComplete = (deps) => {
  const { adventureState, pendingAdventureUpdate, adventureChanceMode, adventureDifficulty, adventureCustomInstructions, adventureLanguageMode, adventureInputMode, adventureFreeResponseEnabled, adventureConsistentCharacters, isAdventureStoryMode, isImmersiveMode, isSocialStoryMode, aiBotsActive, narrativeLedger, currentUiLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, inputText, history, isIndependentMode, isTeacherMode, apiKey, appId, activeSessionAppId, activeSessionCode, globalPoints, sessionData, user, adventureArtStyle, adventureCustomArtStyle, imageGenerationStyle, imageAspectRatio, alloBotRef, lastTurnSnapshot, lastReadTurnRef, setAdventureState, setPendingAdventureUpdate, setShowDice, setShowGlobalLevelUp, setActiveView, setGenerationStep, setError, setHistory, setGeneratedContent, setHasSavedAdventure, setIsResumingAdventure, setDiceResult, setFailedAdventureAction, setAdventureEffects, setIsProcessing, useLowQualityVisuals, adventureImageDB, addToast, t, warnLog, debugLog, cleanJson, safeJsonParse, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, archiveAdventureImage, SafetyContentChecker, handleAiSafetyFlag, playAdventureEventSound, playSound, handleScoreUpdate, getAdventureGlossaryTerms, generatePixelArtItem, generateAdventureImage, generateNarrativeLedger, detectClimaxArchetype, flyToElement, resilientJsonParse, storageDB, updateDoc, doc, db, ADVENTURE_GUARDRAIL, NARRATIVE_GUARDRAILS, INVISIBLE_NARRATOR_INSTRUCTIONS, SYSTEM_INVISIBLE_INSTRUCTIONS, SYSTEM_STATE_EXAMPLES } = deps;
  try { if (window._DEBUG_PHASE_L) console.log("[PhaseL] handleDiceRollComplete fired"); } catch(_) {}
      if (!pendingAdventureUpdate) {
          setShowDice(false);
          return;
      }
      const data = pendingAdventureUpdate;
      playAdventureEventSound('transition');
      setAdventureState(prev => {
          const currentStats = prev.stats || { successes: 0, failures: 0, decisions: 0, conceptsFound: [] };
          let newSuccesses = currentStats.successes;
          let newFailures = currentStats.failures;
          const outcomeType = data.outcomeType || data.rollDetails?.outcomeType || 'neutral';
          if (outcomeType === 'strategic_success') newSuccesses++;
          if (outcomeType === 'misconception') newFailures++;
          let newConcepts = [...(currentStats.conceptsFound || [])];
          if (data.conceptsUsed && Array.isArray(data.conceptsUsed)) {
              data.conceptsUsed.forEach(c => {
                  if (!newConcepts.includes(c)) newConcepts.push(c);
              });
          }
          const newStats = {
              successes: newSuccesses,
              failures: newFailures,
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
          if (aiMasteryScore === undefined && currentClimaxState.isActive) {
              const outcomeType = data.outcomeType || data.rollDetails?.outcomeType || 'neutral';
              let delta = -2; // Default slight penalty to maintain pressure
              if (outcomeType === 'strategic_success') delta = 8;
              else if (outcomeType === 'misconception') delta = -8;
              aiMasteryScore = Math.min(100, Math.max(0, (currentClimaxState.masteryScore || 50) + delta));
          }
          let hiddenMastery = currentClimaxState.masteryScore || 0;
          if (!currentClimaxState.isActive) {
              const outcomeType = data.outcomeType || data.rollDetails?.outcomeType || 'neutral';
              let masteryDelta = -2;
              if (outcomeType === 'strategic_success') masteryDelta = 8;
              else if (outcomeType === 'misconception') masteryDelta = -8;
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
              finalResult = data.climaxResult;
              if (finalMasteryScore >= 100) finalResult = 'victory';
              if (finalMasteryScore <= 0) finalResult = 'failure';
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
          if (finalResult === 'victory') {
              const victoryHistory = [
                  ...prev.history,
                  { type: 'scene', text: adventureState.currentScene.text },
                  { type: 'choice', text: choice, source: data.choiceSource || 'option' },
                  { type: 'feedback', text: data.feedback }
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
                  isGameOver: false,
                  history: [...prev.history, { type: 'feedback', text: data.feedback }],
                  currentScene: data.scene, pendingChoice: null,
                  climax: { ...updatedClimax, isActive: false, masteryScore: 100 },
                  canStartSequel: true,
                  isLoading: false,
                  stats: newStats
              };
          } else if (finalResult === 'failure') {
              const failureHistory = [
                  ...adventureState.history,
                  { type: 'scene', text: adventureState.currentScene.text },
                  { type: 'choice', text: choice, source: data.choiceSource || 'option' },
                  { type: 'feedback', text: data.feedback }
              ];
              generateNarrativeLedger(failureHistory, deps);
              addToast(t('adventure.status_messages.log_updated'), "info");
              setTimeout(() => {
                  playAdventureEventSound('failure');
                  addToast(t('adventure.climax.toast_failure'), "error");
              }, 0);
              return {
                  ...prev,
                  history: [...prev.history, { type: 'feedback', text: data.feedback }],
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
              if (data.scene.options.length !== 0 && newEnergy > 0) {
                  generateAdventureImage(data.scene.text, nextTurn, deps);
              }
              if (nextTurn % 5 === 0) {
                  const updatedHistory = [...prev.history, { type: 'feedback', text: feedbackText }];
                  generateNarrativeLedger(updatedHistory, deps);
              }
              if (nextTurn % 10 === 0 && nextTurn > 0) {
                  addToast(t('adventure.save_reminder') || "💾 Consider saving your adventure progress!", "info");
              }
          }, 0);
          return {
              ...prev,
              history: [...prev.history, { type: 'feedback', text: feedbackText }],
              currentScene: { ...data.scene, charactersInScene: data.charactersInScene || [] }, pendingChoice: null,
              isLoading: false,
              turnCount: nextTurn,
              isGameOver: data.scene.options.length === 0 || newEnergy <= 0,
              level: newLevel,
              xp: newXp,
              xpToNextLevel: newXpToNext,
              energy: newEnergy,
              gold: newGold,
              sceneImage: null,
              isImageLoading: true,
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

const generateAdventureImage = async (sceneText, targetTurn, deps) => {
  const { adventureState, pendingAdventureUpdate, adventureChanceMode, adventureDifficulty, adventureCustomInstructions, adventureLanguageMode, adventureInputMode, adventureFreeResponseEnabled, adventureConsistentCharacters, isAdventureStoryMode, isImmersiveMode, isSocialStoryMode, aiBotsActive, narrativeLedger, currentUiLanguage, selectedLanguages, gradeLevel, studentInterests, sourceTopic, inputText, history, isIndependentMode, isTeacherMode, apiKey, appId, activeSessionAppId, activeSessionCode, globalPoints, sessionData, user, adventureArtStyle, adventureCustomArtStyle, imageGenerationStyle, imageAspectRatio, alloBotRef, lastTurnSnapshot, lastReadTurnRef, setAdventureState, setPendingAdventureUpdate, setShowDice, setShowGlobalLevelUp, setActiveView, setGenerationStep, setError, setHistory, setGeneratedContent, setHasSavedAdventure, setIsResumingAdventure, setDiceResult, setFailedAdventureAction, setAdventureEffects, setIsProcessing, useLowQualityVisuals, adventureImageDB, addToast, t, warnLog, debugLog, cleanJson, safeJsonParse, callGemini, callGeminiVision, callImagen, callGeminiImageEdit, archiveAdventureImage, SafetyContentChecker, handleAiSafetyFlag, playAdventureEventSound, playSound, handleScoreUpdate, getAdventureGlossaryTerms, generatePixelArtItem, generateAdventureImage, generateNarrativeLedger, detectClimaxArchetype, flyToElement, resilientJsonParse, storageDB, updateDoc, doc, db, ADVENTURE_GUARDRAIL, NARRATIVE_GUARDRAILS, INVISIBLE_NARRATOR_INSTRUCTIONS, SYSTEM_INVISIBLE_INSTRUCTIONS, SYSTEM_STATE_EXAMPLES } = deps;
  try { if (window._DEBUG_PHASE_L) console.log("[PhaseL] generateAdventureImage fired"); } catch(_) {}
      try {
          let characterContext = "";
          if (adventureConsistentCharacters && adventureState.characters?.length > 0) {
              const sceneChars = adventureState.currentScene?.charactersInScene;
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
          const isSocialMode = adventureInputMode === 'social_story' || (adventureState?.meta?.includes('Social Story'));
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
                      return { ...prev, isImageLoading: false };
                  }
                  return prev;
              });
              return;
          }
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
              const protagonist = adventureState.characters.find(c =>
                  c.role?.toLowerCase().includes('protagonist') ||
                  c.role?.toLowerCase().includes('player')
              ) || adventureState.characters[0];
              if (protagonist?.portrait) {
                  try {
                      const currentBase64 = imageUrl.split(',')[1];
                      const portraitBase64 = protagonist.portrait.split(',')[1];
                      const consistencyPrompt = `
                          Refine the main character in this scene to visually match this reference portrait.
                          Character: ${protagonist.name} — ${protagonist.appearance}.
                          Keep the scene composition, background, lighting, and any other characters unchanged.
                          Only adjust the protagonist's facial features, hair, and clothing to match the reference.
                          NO TEXT. NO LABELS. NO UI ELEMENTS.
                      `;
                      const consistentUrl = await callGeminiImageEdit(consistencyPrompt, currentBase64, targetWidth, targetQual, portraitBase64);
                      if (consistentUrl) {
                          imageUrl = consistentUrl;
                          debugLog("🎭 Character consistency pass applied successfully");
                      }
                  } catch (consistencyErr) {
                      warnLog("Character consistency pass failed, using previous result.", consistencyErr);
                  }
              }
          }
          setAdventureState(prev => {
              if (prev.turnCount === targetTurn) {
                  const newCacheEntry = { turn: targetTurn, image: imageUrl };
                  const updatedCache = [...prev.imageCache, newCacheEntry].slice(-5);
                  adventureImageDB.storeImage(targetTurn, imageUrl);
                  return { ...prev, sceneImage: imageUrl, isImageLoading: false, imageCache: updatedCache };
              }
              return prev;
          });
      } catch (e) {
          warnLog("Adventure Image Gen Failed", e);
          setAdventureState(prev => {
              if (prev.turnCount === targetTurn) {
                  return { ...prev, isImageLoading: false };
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
};
