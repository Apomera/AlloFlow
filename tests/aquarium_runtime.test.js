import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquarium.js'), 'utf8');

describe('Aquarium runtime and chemistry learning contract', () => {
  it('uses instance-scoped timers and audio with visibility and unmount cleanup', () => {
    expect(source).toContain('runtimeRef.current = { simInterval: null, ambient: null');
    expect(source).not.toContain('window._aquaSimInterval');
    expect(source).toContain('function startAquaSimInterval(speed)');
    expect(source).toContain("document.addEventListener('visibilitychange', onVisibilityChange)");
    expect(source).toContain("document.removeEventListener('visibilitychange', onVisibilityChange)");
    expect(source).toContain('stopAquariumRuntime(true)');
  });

  it('records a bounded 48-hour chemistry history', () => {
    expect(source).toContain('var chemHistory = d.chemHistory || []');
    expect(source).toContain('chemHistory: [{ tick: 0, day: 0, hour: 8');
    expect(source).toContain('chemHistory: _chemHistory.concat([');
    expect(source).toContain(']).slice(-48)');
  });

  it('offers keyboard-operable chemistry cards and described trend graphics', () => {
    expect(source).toContain('return React.createElement("button", {');
    expect(source).toContain("'aria-pressed': isActive");
    expect(source).toContain("'aria-label': \"Nitrogen cycle trends\"");
    expect(source).toContain('role: "img"');
  });

  it('models selectable water-change dilution and blocks empty-tank feeding', () => {
    expect(source).toContain('var waterChangePercent = d.waterChangePercent || 25');
    expect(source).toContain('var remaining = 1 - fraction');
    expect(source).toContain('waterChem.ammonia * remaining');
    expect(source).toContain('waterChem.nitrate * remaining');
    expect(source).toContain('id: "aquarium-water-change-percent"');
    expect(source).toContain('"Preview - NH3 "');
    expect(source).toContain('if (tankFish.length === 0)');
  });

  it('uses native tank controls, clear focus, and accessible event semantics', () => {
    expect(source).toContain('role: "region"');
    expect(source).toContain('return React.createElement("button", { type: "button",');
    expect(source).toContain('"Remove " + displayName + " from tank"');
    expect(source).toContain('role: "log"');
    expect(source).toContain('.aqua-fish:focus-visible, .aqua-fish-svg:focus-visible');
  });

  it('cleans organism state only after the final matching organism is removed', () => {
    expect(source).toContain('var speciesStillPresent = newFish.indexOf(removed) !== -1');
    expect(source).toContain('if (!speciesStillPresent)');
    expect(source).toContain('delete newSickness[removedInstanceId]');
    expect(source).toContain('delete newBreeding[removed]');
    expect(source).toContain('fishSickness: newSickness, fishStress: newStress');
    expect(source).toContain('var plantStillPresent = newPlants.indexOf(removed) !== -1');
    expect(source).toContain('delete newPB[removed]');
  });

  it('migrates legacy tanks to stable per-fish identities', () => {
    expect(source).toContain("var restoreRunningRef = React.useRef(d.simRunning === true)");
    expect(source).toContain('if (restoreWasRunning) aq.simRunning = false');
    expect(source).toContain('var fishInstanceIds = tankFish.map');
    expect(source).toContain('fishIdentityVersion = 3');
    expect(source).toContain('migrateFishState(d.hungerLevels, 50, true)');
    expect(source).toContain('var fishKey = fishInstanceIds[idx]');
    expect(source).toContain('finalFishInstanceIds.push(fryInstanceId)');
  });

  it('persists an accessible sound preference and bounds every event update', () => {
    expect(source).toContain("var soundEnabled = d.soundEnabled !== undefined ? d.soundEnabled : true");
    expect(source).toContain("'aria-label': soundEnabled ? \"Mute aquarium sounds\" : \"Enable aquarium sounds\"");
    expect(source).toContain("'aria-pressed': soundEnabled");
    expect(source).toContain("upd('soundEnabled', !soundEnabled)");
    expect(source).toContain('if (Array.isArray(aq.eventLog) && aq.eventLog.length > 25)');
  });

  it('normalizes legacy chemistry values and names dismiss controls', () => {
    expect(source).toContain('var chemDefaults = {');
    expect(source).toContain("dissolvedO2: 7, co2: 3");
    expect(source).toContain('waterChemNeedsMigration = true');
    expect(source).toContain("'aria-label': \"Close chemistry explanation\"");
    expect(source).toContain("'aria-label': \"Dismiss aquarium event\"");
  });

  it('keeps collision recovery outside identity mapper callbacks', () => {
    const rootMap = source.indexOf('var fishInstanceIds = tankFish.map');
    const rootScan = source.indexOf('fishInstanceIds.forEach(function (instanceId)');
    const rootHelper = source.indexOf('function migrateFishState');
    expect(rootMap).toBeGreaterThan(-1);
    expect(rootScan).toBeGreaterThan(rootMap);
    expect(rootHelper).toBeGreaterThan(rootScan);
    const tickMap = source.indexOf('var _fishInstanceIds = _tankFish.map');
    const tickScan = source.indexOf('_fishInstanceIds.forEach(function (instanceId)');
    const tickHelper = source.indexOf('function migrateTickFishState');
    expect(tickScan).toBeGreaterThan(tickMap);
    expect(tickHelper).toBeGreaterThan(tickScan);
  });

  it('supports persistent fish names and synchronized duplicate removal', () => {
    expect(source).toContain('var fishNames = migrateFishState(d.fishNames)');
    expect(source).toContain("newNames[newInstanceId] = species.name");
    expect(source).toContain("upd('fishNames', updatedNames)");
    expect(source).toContain('delete newNames[removedInstanceId]');
    expect(source).toContain('updMulti({ fishInstanceIds: newFishInstanceIds, fishNames: newNames, fishBirthTicks: newBirthTicks');
    expect(source).toContain('delete newFishNames[removedKey]');
    expect(source).toContain("return fishNames[fishInstanceIds[idx]] ||");
  });

  it('offers targeted treatment and live persistent volume control', () => {
    expect(source).toContain('var medicateFish = function (targetFishId)');
    expect(source).toContain("onClick: function () { medicateFish(fishKey); }");
    expect(source).toContain("ammonia: waterChem.ammonia + (targetInQuarantine ? 0 : targetId ? 0.1 : 0.25)");
    expect(source).toContain('function aquaGain(baseGain)');
    expect(source).toContain("upd('soundVolume', Number(event.target.value))");
    expect(source).toContain("'aria-label': \"Aquarium sound volume\"");
  });

  it('tracks fish age and bounded care history through lifecycle changes', () => {
    expect(source).toContain('var fishBirthTicks = migrateFishState(d.fishBirthTicks, 0, true)');
    expect(source).toContain('var fishCareLog = migrateFishState(d.fishCareLog)');
    expect(source).toContain('newBirthTicks[newInstanceId] = simTick');
    expect(source).toContain("msg: 'Born in this tank'");
    expect(source).toContain('delete newFishBirthTicks[removedKey]');
    expect(source).toContain('delete newFishCareLog[removedKey]');
    expect(source).toContain(']).slice(-8)');
    expect(source).toContain('var ageHours = Math.max(0, simTick - birthTick)');
  });

  it('keeps targeted treatment and Live Feed keys inside indexed callbacks', () => {
    const treatmentStart = source.indexOf('var medicateFish = function (targetFishId)');
    const treatmentLoop = source.indexOf('Object.keys(newSickness).forEach(function (fId)', treatmentStart);
    const treatmentGuard = source.indexOf('if (targetId && fId !== targetId) return', treatmentStart);
    expect(treatmentLoop).toBeGreaterThan(treatmentStart);
    expect(treatmentGuard).toBeGreaterThan(treatmentLoop);
    const liveFeedStart = source.indexOf('var feedLive = function ()');
    const liveFeedLoop = source.indexOf('tankFish.forEach(function (fId, idx)', liveFeedStart);
    const liveFeedKey = source.indexOf('var fishKey = fishInstanceIds[idx]', liveFeedStart);
    expect(liveFeedLoop).toBeGreaterThan(liveFeedStart);
    expect(liveFeedKey).toBeGreaterThan(liveFeedLoop);
  });
  it('supports responsible individual feeding and accessible fish care profiles', () => {
    expect(source).toContain('var expandedCareFish = d.expandedCareFish || null');
    expect(source).toContain('var feedIndividual = function (fishId, speciesId)');
    expect(source).toContain('if (currentHunger <= 10)');
    expect(source).toContain('var individualAmmonia = quarantinedFish[fishId] ? 0 : 0.05');
    expect(source).toContain('var careScore = Math.max(0, Math.min(100, Math.round(');
    expect(source).toContain("'aria-expanded': historyExpanded");
    expect(source).toContain('role: "list"');
    expect(source).toContain('role: "listitem"');
    expect(source).toContain('expandedCareFish: expandedCareFish === removedInstanceId ? null : expandedCareFish');
    expect(source).toContain('finalFishInstanceIds.indexOf(aq.expandedCareFish) !== -1');

    const liveFeedStart = source.indexOf('var feedLive = function ()');
    const individualFeedStart = source.indexOf('var feedIndividual = function (fishId, speciesId)');
    const lightsStart = source.indexOf('var toggleLights = function ()');
    expect(individualFeedStart).toBeGreaterThan(liveFeedStart);
    expect(lightsStart).toBeGreaterThan(individualFeedStart);
  });
  it('models an accessible hospital tank across treatment and simulation systems', () => {
    expect(source).toContain('var quarantinedFish = migrateFishState(d.quarantinedFish)');
    expect(source).toContain('var toggleFishQuarantine = function (fishId)');
    expect(source).toContain('fishSickness: {}, fishStress: {}, quarantinedFish: {}');
    expect(source).toContain('var displayFishCount = fishInstanceIds.filter');
    expect(source).toContain('if (quarantinedFish[fishKey]) return');
    expect(source).toContain('ammonia: waterChem.ammonia + individualAmmonia');
    expect(source).toContain("displayName + ' should stay isolated until treatment clears the illness.'");
    expect(source).toContain('var targetInQuarantine = targetId && quarantinedFish[targetId]');
    expect(source).toContain('ammonia: waterChem.ammonia + (targetInQuarantine ? 0 : targetId ? 0.1 : 0.25)');
    expect(source).toContain('var susceptibleIndexes = _tankFish.map');
    expect(source).toContain('var progressionWindow = _quarantinedFish[fId] ? 16 : 10');
    expect(source).toContain('if (_quarantinedFish[fishKey]) newStress[fishKey] = Math.max');
    expect(source).toContain('delete _quarantinedFish[removedKey]');
    expect(source).toContain('quarantinedFish: _quarantinedFish');
    expect(source).toContain("'aria-pressed': isQuarantined");
    expect(source).toContain('"Move " + displayName + " to the hospital tank"');

    const quarantineStart = source.indexOf('var toggleFishQuarantine = function (fishId)');
    const treatmentStart = source.indexOf('var medicateFish = function (targetFishId)');
    expect(quarantineStart).toBeGreaterThan(-1);
    expect(treatmentStart).toBeGreaterThan(quarantineStart);
  });
  it('models contagious outbreaks and a batch containment response', () => {
    expect(source).toContain('var mainTankSickFishIds = Object.keys(fishSickness).filter');
    expect(source).toContain('var quarantineAllSickFish = function ()');
    expect(source).toContain("msg: 'Moved to hospital tank during outbreak response'");
    expect(source).toContain('var contagiousFishIds = Object.keys(newSickness).filter');
    expect(source).toContain('/^(ich|velvet)$/.test(illness.disease)');
    expect(source).toContain('return fishIndex !== -1 && isFishDiseaseHostByIndex(fishIndex)');
    expect(source).toContain('var healthyMainTankFishIds = _fishInstanceIds.filter');
    expect(source).toContain('var transmissionChance = Math.max(0, Math.min(0.35, contagiousFishIds.length * 0.08) - cleanerProtection)');
    expect(source).toContain('source: sourceFishId');
    expect(source).toContain("'aria-live': \"polite\"");
    expect(source).toContain('" sick fish to the hospital tank"');

    const exposureStart = source.indexOf('var susceptibleIndexes = _tankFish.map');
    const contactStart = source.indexOf('var contagiousFishIds = Object.keys(newSickness).filter', exposureStart);
    const progressionStart = source.indexOf('Object.keys(newSickness).forEach(function (fId)', contactStart);
    expect(contactStart).toBeGreaterThan(exposureStart);
    expect(progressionStart).toBeGreaterThan(contactStart);
  });
  it('provides scheduled preventive maintenance with bounded service records', () => {
    expect(source).toContain("var lastWaterChangeTick = typeof d.lastWaterChangeTick === 'number'");
    expect(source).toContain('var maintenanceLog = Array.isArray(d.maintenanceLog) ? d.maintenanceLog.slice(-12) : []');
    expect(source).toContain('var maintenanceOverdue = hoursSinceWaterChange >= 168');
    expect(source).toContain('waterChem.ammonia >= 1 || waterChem.nitrite >= 1 || waterChem.nitrate >= 80');
    expect(source).toContain('recommendedWaterChangePercent = 50');
    expect(source).toContain('recommendedWaterChangePercent = 25');
    expect(source).toContain('var serviceRecord = {');
    expect(source).toContain('var nextMaintenanceLog = maintenanceLog.concat([serviceRecord]).slice(-12)');
    expect(source).toContain('lastWaterChangeTick: simTick, maintenanceLog: nextMaintenanceLog');
    expect(source).toContain('lastWaterChangeTick: 0, maintenanceLog: [], maintenanceHistoryExpanded: false');
    expect(source).toContain('role: "progressbar"');
    expect(source).toContain("'aria-controls': \"aquarium-maintenance-history\"");
    expect(source).toContain('role: "listitem"');
    expect(source).toContain('"Perform recommended " + recommendedWaterChangePercent + " percent water change"');

    const scheduleStart = source.indexOf('var lastWaterChangeTick =');
    const waterChangeStart = source.indexOf('var doWaterChange = function (requestedPercent)');
    const plannerStart = source.indexOf("'aria-label': \"Aquarium maintenance planner\"");
    expect(waterChangeStart).toBeGreaterThan(scheduleStart);
    expect(plannerStart).toBeGreaterThan(waterChangeStart);
  });
  it('makes equipment upgrades measurable and directly operable', () => {
    expect(source).toContain('function getTickEquipmentDefinition(type)');
    expect(source).toContain("var _filterEquipment = getTickEquipmentDefinition('filter')");
    expect(source).toContain('_filterEquipment.ammoniaReduction * _equipmentOutput.filter');
    expect(source).toContain('_filterEquipment.nitriteReduction * _equipmentOutput.filter');
    expect(source).toContain('deltaO2 += _airPumpEquipment.o2Boost * _equipmentOutput.airPump');
    expect(source).toContain('var lightEff = (0.5 + _lightEquipment.plantBoost) * _equipmentOutput.light');
    expect(source).toContain('pDef.growth * healthFactor * (0.5 + _lightEquipment.plantBoost) * _equipmentOutput.light');
    expect(source).toContain('var effectiveAlgaeMultiplier = 0.2 + (_lightEquipment.algaeMult - 0.2) * _equipmentOutput.light');
    expect(source).toContain('var heaterCorrectionRate = _equipment.heater > 0 && _equipmentOutput.heater > 0');
    expect(source).toContain('var tempDrift = (desiredTemp - _waterChem.temp) * heaterCorrectionRate + tempNoise');
    expect(source).toContain('Aquarium equipment systems');
    expect(source).toContain('Object.keys(EQUIPMENT_CATALOG).map(function (type)');
    expect(source).toContain('onClick: function () { buyEquipment(type); }');
    expect(source).toContain("eventLog: appendTankEvent('\\u2B06\\uFE0F Upgraded '");
    expect(source).toContain("if (newEquip.filter >= 2 && newEquip.heater >= 2");

    const equipmentStateStart = source.indexOf('var _equipment = Object.assign');
    const filterEffectStart = source.indexOf('var newAmm = Math.max', equipmentStateStart);
    const equipmentUiStart = source.indexOf('Aquarium equipment systems');
    expect(filterEffectStart).toBeGreaterThan(equipmentStateStart);
    expect(equipmentUiStart).toBeGreaterThan(filterEffectStart);
  });
  it('models equipment wear, degraded output, and accessible servicing', () => {
    expect(source).toContain('var equipmentCondition = {}');
    expect(source).toContain("equipmentCondition[type] = typeof savedCondition === 'number'");
    expect(source).toContain('var equipmentNeedsServiceCount = Object.keys(equipmentCondition)');
    expect(source).toContain('newEquipmentCondition[type] = 100');
    expect(source).toContain('var serviceEquipment = function (type)');
    expect(source).toContain('if (currentCondition >= 95)');
    expect(source).toContain('var _equipmentWearRates = { filter: 0.18, heater: 0.10, light: 0.08, airPump: 0.12 }');
    expect(source).toContain('_equipmentOutput[type] = _equipmentFaults[type] ? 0 : condition / 100');
    expect(source).toContain('_nextEquipmentCondition[type] = Math.max(0');
    expect(source).toContain('equipmentCondition: _nextEquipmentCondition');
    expect(source).toContain("'aria-label': catalog.name + \" condition\"");
    expect(source).toContain('equipmentNeedsServiceCount > 0 && React.createElement("span", { role: "status"');
    expect(source).toContain('condition < 95 && React.createElement("button"');
    expect(source).toContain('onClick: function () { serviceEquipment(type); }');

    const serviceStart = source.indexOf('var serviceEquipment = function (type)');
    const tutorialStart = source.indexOf('var advanceTutorial = function ()');
    expect(serviceStart).toBeGreaterThan(-1);
    expect(tutorialStart).toBeGreaterThan(serviceStart);
  });

  it('creates preventable equipment faults with persistent outages and repairs', () => {
    expect(source).toContain('var equipmentFaults = {}');
    expect(source).toContain("var savedFault = d.equipmentFaults && d.equipmentFaults[type]");
    expect(source).toContain('var equipmentFaultCount = Object.keys(equipmentFaults).length');
    expect(source).toContain('var newEquipmentFaults = Object.assign({}, equipmentFaults)');
    expect(source).toContain('delete newEquipmentFaults[type]');
    expect(source).toContain('if (equipmentFaults[type])');
    expect(source).toContain('var repairEquipment = function (type)');
    expect(source).toContain('var repairCost = 5 + currentLevel * 5');
    expect(source).toContain('repairedCondition[type] = 75');
    expect(source).toContain('coins: coins - repairCost');
    expect(source).toContain('_equipmentOutput[type] = _equipmentFaults[type] ? 0 : condition / 100');
    expect(source).toContain('var _equipmentFailureRates = { filter: 0.03, heater: 0.025, light: 0.015, airPump: 0.02 }');
    expect(source).toContain('if (!isActiveDevice || condition > 15) return');
    expect(source).toContain("typeof definition.failChance === 'number' ? definition.failChance");
    expect(source).toContain("_equipmentFaults[type] = { tick: newTick, reason: 'Low-condition failure' }");
    expect(source).toContain("msg: '\\u26D4 ' + failedCatalog.name + ' failed at '");
    expect(source).toContain('equipmentFaults: _equipmentFaults');
    expect(source).toContain('equipmentFaultCount > 0 && React.createElement("span", { role: "alert"');
    expect(source).toContain('SYSTEM OFFLINE: no output until repaired.');
    expect(source).toContain('onClick: function () { repairEquipment(type); }');

    const repairStart = source.indexOf('var repairEquipment = function (type)');
    const tutorialStart = source.indexOf('var advanceTutorial = function ()');
    expect(repairStart).toBeGreaterThan(-1);
    expect(tutorialStart).toBeGreaterThan(repairStart);
  });

  it('provides a persistent evidence-based teaching backbone', () => {
    expect(source).toContain("id: 'habitat', title: '1. Choose a Habitat'");
    expect(source).toContain("id: 'cycle', title: '3. Follow the Nitrogen Cycle'");
    expect(source).toContain("id: 'stabilize', title: '7. Demonstrate Stability'");
    expect(source).toContain("concept: 'Every aquarium is a controlled ecosystem");
    expect(source).toContain("objective: 'Run at least three aquarium-hour ticks.'");
    expect(source).toContain("why: 'Overfeeding is one of the fastest ways");
    expect(source).toContain("observe: 'Use the chemistry trend and event log");
    expect(source).not.toContain('Tap the Shop tab to buy new fish and upgrade equipment.');

    expect(source).toContain("var tutorialProgress = d.tutorialProgress && typeof d.tutorialProgress === 'object'");
    expect(source).toContain('function getTutorialEvidence(stepId)');
    expect(source).toContain("if (stepId === 'cycle') return { complete: simTick >= 3");
    expect(source).toContain("if (stepId === 'water') return { complete: maintenanceLog.length > 0");
    expect(source).toContain("if (stepId === 'equipment') return { complete: d.tutorialEquipmentMaintained === true");
    expect(source).toContain("if (stepId === 'stabilize') return { complete: perfectWaterTicks >= 5");
    expect(source).toContain('function recordTutorialLesson(lesson, evidenceLabel)');
    expect(source).toContain('if (!currentTutorialEvidence.complete)');
    expect(source).toContain('tutorialProgress: nextProgress');
    expect((source.match(/tutorialEquipmentMaintained: true/g) || []).length).toBeGreaterThanOrEqual(3);

    expect(source).toContain("'aria-labelledby': \"aquarium-learning-path-title\"");
    expect(source).toContain("'aria-label': \"Aquarium learning path progress\"");
    expect(source).toContain('currentTutorialEvidence.complete ? "\\u2705 Evidence ready: "');
    expect(source).toContain("'aria-controls': \"aquarium-learning-outline\"");
    expect(source).toContain('onClick: function () { selectTutorialLesson(lessonIndex); }');
    expect(source).toContain('onClick: resumeTutorial');
    expect(source).toContain('"Hide learning path"');

    const evidenceStart = source.indexOf('function getTutorialEvidence(stepId)');
    const handlerStart = source.indexOf('var advanceTutorial = function ()');
    const interfaceStart = source.indexOf('Guided Aquarium Learning Path');
    expect(handlerStart).toBeGreaterThan(evidenceStart);
    expect(interfaceStart).toBeGreaterThan(handlerStart);
  });

  it('adds a persistent UDL lesson notebook with live evidence capture', () => {
    expect(source).toContain("predict: 'Predict which chemistry setting will differ most");
    expect(source).toContain("explain: 'Make a final claim about tank stability");
    expect(source).toContain("var tutorialNotebook = d.tutorialNotebook && typeof d.tutorialNotebook === 'object'");
    expect(source).toContain("prediction: typeof savedTutorialNote.prediction === 'string'");
    expect(source).toContain("function updateTutorialNote(field, value)");
    expect(source).toContain("['prediction', 'observation', 'explanation'].indexOf(field)");
    expect(source).toContain("String(value || '').slice(0, 2000)");
    expect(source).toContain("function captureTutorialObservation()");
    expect(source).toContain("'NH3 ' + waterChem.ammonia.toFixed(2) + ' ppm'");
    expect(source).toContain("'O2 ' + waterChem.dissolvedO2.toFixed(1) + ' mg/L'");
    expect(source).toContain("equipmentFaultCount + ' equipment faults'");
    expect(source).toContain("updateTutorialNote('observation', combinedObservation)");
    expect(source).toContain('notebook: {');
    expect(source).toContain('prediction: !!currentTutorialNote.prediction.trim()');

    expect(source).toContain("'aria-controls': \"aquarium-lesson-notebook\"");
    expect(source).toContain('Lesson lab notebook');
    expect(source).toContain('"Predict \\u2192 Observe \\u2192 Explain"');
    expect(source).toContain('value: currentTutorialNote.prediction');
    expect(source).toContain('value: currentTutorialNote.observation');
    expect(source).toContain('value: currentTutorialNote.explanation');
    expect(source).toContain('maxLength: 2000');
    expect(source).toContain("onChange: function (event) { updateTutorialNote('prediction', event.target.value); }");
    expect(source).toContain('onClick: captureTutorialObservation');
    expect(source).toContain('"Claim: ... Evidence: ... Reasoning: ..."');
    expect(source).toContain('writing is not required to operate the simulation.');

    const notebookStateStart = source.indexOf('var tutorialNotebook =');
    const captureStart = source.indexOf('function captureTutorialObservation()');
    const notebookUiStart = source.indexOf('Lesson lab notebook');
    expect(captureStart).toBeGreaterThan(notebookStateStart);
    expect(notebookUiStart).toBeGreaterThan(captureStart);
  });
  it('supports selectable planted specimens with nuanced field guides and live learning', () => {
    expect(source).toContain('var PLANT_PROFILES = {');
    expect(source).toContain("scientific: 'Microsorum pteropus'");
    expect(source).toContain("scientific: 'Rhizophora mangle (common aquarium form)'");
    expect(source).toContain("scientific: 'Chaetomorpha linum complex'");
    expect(source).toContain('function getPlantProfile(plant)');
    expect(source).toContain('nativeRange:');
    expect(source).toContain('lightGuide:');
    expect(source).toContain('co2Guide:');
    expect(source).toContain('nutrition:');
    expect(source).toContain('propagation:');
    expect(source).toContain('compatibility:');
    expect(source).toContain('diagnosis:');
    expect(source).toContain('ecology:');
    expect(source).toContain('aquascape:');
    expect(source).toContain('carePlan:');

    expect(source).toContain("var selectedPlantId = typeof d.selectedPlantId === 'string'");
    expect(source).toContain('var selectedPlantProfile = selectedPlant ? getPlantProfile(selectedPlant) : null');
    expect(source).toContain("var plantLearningAnswers = d.plantLearningAnswers");
    expect(source).toContain('var selectedPlantLiveContribution = selectedPlant ? {');
    expect(source).toContain('oxygenPerHour: selectedPlantPhotosynthesisActive');
    expect(source).toContain('nightOxygenUse: selectedPlant.o2 * 0.15');
    expect(source).toContain("selectedPlantCareAlerts.push({ severity: 'danger'");
    expect(source).toContain("selectedPlantCareAlerts.push({ severity: 'success'");
    expect(source).toContain('var selectPlant = function (plantId)');
    expect(source).toContain('var answerPlantLearningCheck = function (answerIndex)');
    expect(source).toContain('upd(\'plantLearningAnswers\', nextAnswers)');
    expect(source).toContain('selectedPlantId: plant.id');

    expect(source).toContain("'aria-labelledby': \"aquarium-plant-profile-title\"");
    expect(source).toContain('"Identity & habitat"');
    expect(source).toContain('"Light, carbon & nutrition"');
    expect(source).toContain('"Ecology, compatibility & aquascaping"');
    expect(source).toContain('"Live specimen contribution"');
    expect(source).toContain('"Care signals"');
    expect(source).toContain('"Care reasoning check"');
    expect(source).toContain('onClick: function () { answerPlantLearningCheck(optionIndex); }');
    expect(source).toContain('onClick: function () { selectPlant(ps.id); }');
    expect(source).toContain('onClick: function () { selectPlant(pid); }');
    expect(source).toContain('tankPlants.map(function (plantId, plantIndex)');
    expect(source).toContain('onClick: function () { selectPlant(plantId); }');
    expect(source).toContain("'aria-pressed': selectedPlantId === plantId");
    expect(source).toContain('tankPlants.length === 0 && (selectedTank ===');

    const profileStart = source.indexOf('var PLANT_PROFILES = {');
    const liveStateStart = source.indexOf('var selectedPlantLiveContribution =');
    const handlerStart = source.indexOf('var selectPlant = function (plantId)');
    const panelStart = source.indexOf('Selected plant field guide and live specimen analysis');
    const tankPlantStart = source.indexOf('tankPlants.map(function (plantId, plantIndex)');
    expect(liveStateStart).toBeGreaterThan(profileStart);
    expect(handlerStart).toBeGreaterThan(liveStateStart);
    expect(panelStart).toBeGreaterThan(handlerStart);
    expect(tankPlantStart).toBeGreaterThan(panelStart);
  });

  it('renders accessible simulation-aware plant diagrams', () => {
    expect(source).toContain("var selectedPlantPlacementZone = 'midground'");
    expect(source).toContain("selectedPlantPlacementZone = 'refugium'");
    expect(source).toContain("selectedPlantPlacementZone = 'surface'");
    expect(source).toContain("selectedPlantPlacementZone = 'emergent'");
    expect(source).toContain("selectedPlantPlacementZone = 'foreground'");
    expect(source).toContain("selectedPlantPlacementZone = 'background'");
    expect(source).toContain("selectedPlantPlacementZone = 'hardscape'");
    expect(source).toContain('var selectedPlantLightNeed =');
    expect(source).toContain('var selectedPlantLightAvailable =');
    expect(source).toContain('var selectedPlantCarbonAvailable =');
    expect(source).toContain('var selectedPlantNitrogenAvailable =');
    expect(source).toContain("resource.status = resource.gap >= 0 ? 'ready'");
    expect(source).toContain('selectedPlantLimitingResource = selectedPlantResourceDiagram.slice().sort');

    expect(source).toContain('"Aquascape placement map"');
    expect(source).toContain('selectedPlant.name + " placement diagram. Recommended zone: "');
    expect(source).toContain('"Plant physiology flow"');
    expect(source).toContain('selectedPlant.name + " physiology diagram.');
    expect(source).toContain('"Live limiting-factor diagram"');
    expect(source).toContain('role: "progressbar"');
    expect(source).toContain("'aria-valuemin': 0");
    expect(source).toContain("'aria-valuemax': 100");
    expect(source).toContain("'aria-valuenow': resource.available");
    expect(source).toContain('"Available " + resource.available');
    expect(source).toContain('"Need \\u2502 " + resource.need');
    expect(source).toContain('these are not laboratory units.');

    const diagramStateStart = source.indexOf("var selectedPlantPlacementZone = 'midground'");
    const profilePanelStart = source.indexOf('Selected plant field guide and live specimen analysis');
    const placementStart = source.indexOf('Aquascape placement map');
    const physiologyStart = source.indexOf('Plant physiology flow');
    const limitingStart = source.indexOf('Live limiting-factor diagram');
    const detailStart = source.indexOf('Identity & habitat', placementStart);
    expect(diagramStateStart).toBeGreaterThan(source.indexOf('var selectedPlantLiveContribution ='));
    expect(placementStart).toBeGreaterThan(profilePanelStart);
    expect(physiologyStart).toBeGreaterThan(placementStart);
    expect(limitingStart).toBeGreaterThan(physiologyStart);
    expect(detailStart).toBeGreaterThan(limitingStart);
  });

  it('records closed-loop exchanges and applies environmental vitality pressure', () => {
    expect(source).toContain("var ecosystemExchangeView = ['live', 'day', 'night', 'net']");
    expect(source).toContain("var ecosystemFocusType = ['all', 'fish', 'plant', 'bacteria', 'algae', 'water']");
    expect(source).toContain('var plantO2Produced = 0');
    expect(source).toContain('var plantCO2Consumed = 0');
    expect(source).toContain('var plantNightO2Consumed = 0');
    expect(source).toContain('plantO2Produced += plantO2Flow');
    expect(source).toContain('plantNightCO2Released += plantNightCO2Flow');
    expect(source).toContain('var environmentalDiseasePressure = 0');
    expect(source).toContain('if (newChem.ammonia >= 0.25) environmentalDiseasePressure');
    expect(source).toContain('if (newChem.nitrite >= 0.1) environmentalDiseasePressure');
    expect(source).toContain('if (newChem.dissolvedO2 < 5) environmentalDiseasePressure');
    expect(source).toContain('var environmentStressReasons = []');
    expect(source).toContain("environmentStressReasons.push('temperature')");
    expect(source).toContain("environmentStressReasons.push('pH')");
    expect(source).toContain('if (habitatPlantBiomass > 6) environmentStressDelta -= 2');
    expect(source).toContain("msg: 'Environmental stress: ' + environmentStressReasons.join(', ')");

    expect(source).toContain('var algaeGrazingRate = finalTankFish.reduce');
    expect(source).toContain('var algaeGrazed = Math.min(newAlgae, algaeGrazingRate)');
    expect(source).toContain('newAlgae = Math.max(0, newAlgae - algaeGrazed)');
    expect(source).toContain("exchangeReasons.push('\\uD83D\\uDC1F Grazing organisms consumed '");
    expect(source).toContain('var ecosystemExchangeSnapshot = {');
    expect(source).toContain('chemistryDelta: {');
    expect(source).toContain('reasons: exchangeReasons.slice(0, 8)');
    expect(source).toContain('lastEcosystemExchange: ecosystemExchangeSnapshot');

    expect(source).toContain('var scheduledPlantDaylight = _simHour >= 6 && _simHour < 20');
    expect(source).toContain('if (scheduledPlantDaylight && (!_lightsOn || _equipmentOutput.light <= 0))');
    expect(source).not.toContain("if (!isDaylight && pDef.light === 'high') healthDelta -= 0.5");

    const respirationStart = source.indexOf('// ?? Fish respiration: consume O2, produce CO2');
    const exchangeSnapshotStart = source.indexOf('var ecosystemExchangeSnapshot = {');
    const persistenceStart = source.indexOf('lastEcosystemExchange: ecosystemExchangeSnapshot');
    expect(exchangeSnapshotStart).toBeGreaterThan(respirationStart);
    expect(persistenceStart).toBeGreaterThan(exchangeSnapshotStart);
  });

  it('renders a focusable day-night-net ecosystem network with counterfactuals', () => {
    expect(source).toContain('var ecosystemPlantTotals = {');
    expect(source).toContain("if (ecosystemExchangeView === 'day')");
    expect(source).toContain("else if (ecosystemExchangeView === 'night')");
    expect(source).toContain("else if (ecosystemExchangeView === 'net')");
    expect(source).toContain("else if (lastEcosystemExchange && !ecosystemFocusId)");
    expect(source).toContain('var withoutPlantsNextOxygen =');
    expect(source).toContain('var withoutPlantsNextNitrate =');
    expect(source).toContain('var withoutFishNextAmmonia =');
    expect(source).toContain('var ecosystemCausalReasons =');

    expect(source).toContain('"\\uD83C\\uDF0D Living Ecosystem Exchange Network"');
    expect(source).toContain("'aria-labelledby': \"aquarium-exchange-network-title\"");
    expect(source).toContain("'aria-label': \"Exchange time view\"");
    expect(source).toContain("{ id: 'live', label: '\\u25CF Live tick' }");
    expect(source).toContain("{ id: 'net', label: '\\uD83D\\uDCCA 24h net' }");
    expect(source).toContain("upd('ecosystemExchangeView', viewOption.id)");
    expect(source).toContain("'aria-label': \"Focus an ecosystem role\"");
    expect(source).toContain("updMulti({ ecosystemFocusType: focusOption.id, ecosystemFocusId: null })");
    expect(source).toContain('Closed-loop aquarium diagram.');
    expect(source).toContain('"Without these plants next tick"');
    expect(source).toContain('"Without these organisms next tick"');
    expect(source).toContain('"Competition & grazing"');
    expect(source).toContain('"\\uD83D\\uDD0D Why did the ecosystem change?"');
    expect(source).toContain("role: \"log\", 'aria-live': \"polite\"");
    expect(source).toContain("updMulti({ selectedPlantId: plant.id, ecosystemFocusType: 'plant', ecosystemFocusId: plant.id })");

    const derivationStart = source.indexOf('var ecosystemPlantTotals = {');
    const networkStart = source.indexOf('Living Ecosystem Exchange Network');
    const plantPanelStart = source.indexOf('Plant Management Panel', networkStart);
    expect(networkStart).toBeGreaterThan(derivationStart);
    expect(plantPanelStart).toBeGreaterThan(networkStart);
  });

  it('explains every fish vitality score and traces individuals through the network', () => {
    expect(source).toContain('var oxygenVitality =');
    expect(source).toContain('var nitrogenVitality =');
    expect(source).toContain('var temperatureVitality =');
    expect(source).toContain('var pHVitality =');
    expect(source).toContain('var spaceVitality =');
    expect(source).toContain('var shelterVitality =');
    expect(source).toContain('var nutritionVitality =');
    expect(source).toContain('var calmVitality =');
    expect(source).toContain('var illnessVitality =');
    expect(source).toContain('var vitalityFactors = [');
    expect(source).toContain("label: 'O\\u2082'");
    expect(source).toContain("label: 'Shelter'");
    expect(source).toContain('oxygenVitality * 0.15 + nitrogenVitality * 0.15');
    expect(source).toContain('var limitingVitalityFactor = vitalityFactors.slice().sort');
    expect(source).toContain('"Vitality " + careScore + "/100"');
    expect(source).toContain('"Why vitality? Limiting: " + limitingVitalityFactor.label');
    expect(source).toContain("'aria-label': displayName + \" vitality factors\"");
    expect(source).toContain("updMulti({ ecosystemFocusType: 'fish', ecosystemFocusId: fishKey })");
    expect(source).toContain('"Trace " + displayName + " through the ecosystem exchange network"');
    expect(source).toContain('"\\uD83D\\uDD0E Trace"');

    const factorsStart = source.indexOf('var vitalityFactors = [');
    const scoreStart = source.indexOf('var careScore = Math.max', factorsStart);
    const traceStart = source.indexOf('Trace " + displayName', scoreStart);
    const explanationStart = source.indexOf('Why vitality? Limiting:', traceStart);
    expect(scoreStart).toBeGreaterThan(factorsStart);
    expect(traceStart).toBeGreaterThan(scoreStart);
    expect(explanationStart).toBeGreaterThan(traceStart);
  });

  it('models non-fish organisms as distinct ecosystem roles', () => {
    expect((source.match(/id: 'nerite'/g) || []).length).toBe(2);
    expect((source.match(/id: 'stonycoral'/g) || []).length).toBe(2);
    expect((source.match(/id: 'copepods'/g) || []).length).toBe(2);
    expect(source).toContain("organismType: 'Mollusk'");
    expect(source).toContain("ecosystemRole: 'Surface algae grazer'");
    expect(source).toContain('var algaeGrazingRate = finalTankFish.reduce');
    expect(source).toContain("environmentStressReasons.push('shell erosion risk')");
    expect(source).toContain('var stockDayO2Produced = 0');
    expect(source).toContain("environmentStressReasons.push('heat-driven bleaching')");
    expect(source).toContain('var foodWebHungerRelief = 0');
    expect(source).toContain('/copepods|zooplankton|plankton|micro-crustaceans/i');
    expect(source).toContain('sp1.passiveStock || sp2.passiveStock');
    expect(source).toContain('Add Living Stock');
    expect(source).toContain('Preview capacity, compatibility, and chemistry before stocking.');
    expect(source).toContain('Ecology, not a cleanup shortcut:');
    expect(source).toContain('Individual Organism Care');
    expect(source).toContain('stocked organisms and');
  });
  it('models breathing, cleaning, and mutualistic organism mechanics', () => {
    expect((source.match(/id: 'dwarffrog'/g) || []).length).toBe(1);
    expect((source.match(/id: 'pistol'/g) || []).length).toBe(1);
    expect((source.match(/id: 'pederson'/g) || []).length).toBe(1);
    expect(source).toContain("organismType: 'Amphibian'");
    expect(source).toContain("surfaceBreather: true");
    expect(source).toContain("symbiosisWith: 'pistol'");
    expect(source).toContain("symbiosisWith: 'goby'");
    expect(source).toContain('if (symbiosisPartnerPresent) environmentStressDelta -= 2');
    expect(source).toContain('function isFishDiseaseHostByIndex(index)');
    expect(source).toContain("(diseaseSpecies.organismType || 'Fish') === 'Fish'");
    expect(source).toContain('var cleanerProtection = cleaningClientCount > 0');
    expect(source).toContain('environmentalDiseasePressure = Math.max(0');
    expect(source).toContain('activeSymbiosisPairs > 0');
    expect(source).toContain("sp.cleaningRate ? 'Reduces fish parasite pressure'");
    expect(source).toContain('mechanicLabel && React.createElement');
    expect(source).toContain("organismType: 'Macroalga'");
    expect(source).toContain("organismType: 'Echinoderm'");
    expect(source).toContain("organismType: 'Reptile'");
  });
  it('previews responsible stocking decisions without adding navigation clutter', () => {
    expect(source).toContain("var stockCatalogFilter = typeof d.stockCatalogFilter === 'string'");
    expect(source).toContain('var availableStockTypes = species.map');
    expect(source).toContain('var filteredStockSpecies = species.filter');
    expect(source).toContain('Filter living stock by organism type');
    expect(source).toContain("upd('stockCatalogFilter', filterType)");
    expect(source).toContain('var projectedLoad = Math.round((currentLoad + sp.load) * 100) / 100');
    expect(source).toContain('var capacityExceeded = projectedLoad > maxLoad');
    expect(source).toContain('disabled: capacityExceeded');
    expect(source).toContain("'\\u26D4 Over capacity'");
    expect(source).toContain("'\\u26A0 Compatibility review'");
    expect(source).toContain('var chemistryWarnings = []');
    expect(source).toContain("symbiosisPartnerPresent ? '\\u21C4 Partner active' : '\\u21C4 Partner absent'");
    expect(source).toContain('(sp2.compat && sp2.compat.indexOf(sp1.id) !== -1)');
    expect(source).toContain('compatibilityNames.length && addToast');
    expect(source).toContain("projected bioload ' + (currentLoad + species.load)");
  });
});
