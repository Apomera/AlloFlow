import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_aquarium.js'), 'utf8');
const coreStart = source.indexOf('var AquariumEcosystemCore = (function() {');
const coreEnd = source.indexOf('// === End aquarium ecosystem core ===', coreStart);
if (coreStart < 0 || coreEnd < 0) throw new Error('Aquarium ecosystem core test boundary missing');
const ecosystemCore = runInNewContext(
  '(function(){ var window = {}; ' + source.slice(coreStart, coreEnd) + '; return AquariumEcosystemCore; })()',
  { isFinite, Math, Number, Array, Object }
);

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
    expect(source).toContain('var careScore = persistentVitality ? persistentVitality.score : vitalityCalculation.score;');
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
    expect(source).toContain('var airPumpOxygenAdded = _airPumpEquipment.o2Boost * _equipmentOutput.airPump');
    expect(source).toContain('deltaO2 += airPumpOxygenAdded');
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
    expect(source).toContain("id: 'exchange', title: '7. Trace an Ecosystem Exchange'");
    expect(source).toContain("id: 'stabilize', title: '8. Demonstrate Stability'");
    expect(source).toContain("concept: 'Every aquarium is a controlled ecosystem");
    expect(source).toContain("objective: 'Run at least three aquarium-hour ticks.'");
    expect(source).toContain("why: 'Overfeeding is one of the fastest ways");
    expect(source).toContain("observe: 'Use the chemistry trend, vitality history, and event log");
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
    expect(source).toContain('var environmentPlantRelationship = AquariumEcosystemCore.classifyOrganismPlantRelationship');
    expect(source).toContain('if (environmentPlantRelationship.plantShelterDependent)');
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
    expect(source).toContain("ecosystemFocusType: 'plant', ecosystemFocusId: plant.id");
    expect(source).toContain("!plantStillPresent && ecosystemFocusType === 'plant' && ecosystemFocusId === removed ? 'all'");
    expect(source).toContain("aq.ecosystemFocusType === 'fish' && finalFishInstanceIds.indexOf(aq.ecosystemFocusId) === -1 ? 'all'");
    expect(source).toContain("ecosystemFocusType === 'fish' && ecosystemFocusId === removedInstanceId ? 'all'");

    const derivationStart = source.indexOf('var ecosystemPlantTotals = {');
    const networkStart = source.indexOf('Living Ecosystem Exchange Network');
    const plantPanelStart = source.indexOf('Plant Management Panel', networkStart);
    expect(networkStart).toBeGreaterThan(derivationStart);
    expect(plantPanelStart).toBeGreaterThan(networkStart);
  });

  it('calculates organism vitality behavior and traces individuals through the network', () => {
    const healthy = ecosystemCore.calculateVitality({
      chemistry: { dissolvedO2: 7, ammonia: 0, nitrite: 0, nitrate: 10, temp: 76, pH: 7 },
      species: { tempRange: [72, 80], pHRange: [6.5, 7.5] },
      loadPct: 50, plantBiomass: 5, hunger: 10, stress: 5, illnessSeverity: 0
    });
    const stressed = ecosystemCore.calculateVitality({
      chemistry: { dissolvedO2: 1.5, ammonia: 1.2, nitrite: 0.8, nitrate: 90, temp: 88, pH: 5.8 },
      species: { tempRange: [72, 80], pHRange: [6.5, 7.5] },
      loadPct: 120, plantBiomass: 0, hunger: 95, stress: 90, illnessSeverity: 3
    });

    expect(healthy.score).toBeGreaterThan(80);
    expect(stressed.score).toBeLessThan(healthy.score - 50);
    expect(stressed.factors).toHaveLength(9);
    expect(stressed.limiting.score).toBeLessThanOrEqual(stressed.factors[1].score);
    expect(source).toContain('AquariumEcosystemCore.calculateVitality({');
    expect(source).toContain('persistentVitality ? persistentVitality.score');
    expect(source).toContain('"Vitality " + careScore + "/100"');
    expect(source).toContain('"Why vitality? Limiting: " + limitingVitalityFactor.label');
    expect(source).toContain('"Vitality trajectory"');
    expect(source).toContain("updMulti({ ecosystemFocusType: 'fish', ecosystemFocusId: fishKey })");
    expect(source).toContain('"Trace " + displayName + " through the ecosystem exchange network"');
  });

  it('models temperature, salinity, and volume-aware concentration behavior', () => {
    const coldFresh = ecosystemCore.estimateOxygenSaturationMgL(55, 0);
    const warmFresh = ecosystemCore.estimateOxygenSaturationMgL(82, 0);
    const warmMarine = ecosystemCore.estimateOxygenSaturationMgL(82, 35);

    expect(coldFresh).toBeGreaterThan(warmFresh);
    expect(warmFresh).toBeGreaterThan(warmMarine);
    expect(coldFresh).toBeLessThanOrEqual(14.6);
    expect(warmMarine).toBeGreaterThanOrEqual(4);
    expect(source).toContain('var volumeScale = Math.max(0.2, Math.min(2, 20 / volumeGallons))');
    expect(source).toContain('oxygenSaturationTarget = AquariumEcosystemCore.estimateOxygenSaturationMgL');
    expect(source).toContain("rateBasis: '20-gallon reference concentration model'");
  });

  it('distinguishes plant browsing, shelter use, algae grazing, and detritus recycling', () => {
    const browser = ecosystemCore.classifyOrganismPlantRelationship({
      load: 4,
      habitat: 'Densely vegetated floodplain among submerged roots',
      diet: 'Herbivore — aquatic plants, tender leaves, and algae'
    });
    const algaeOnly = ecosystemCore.classifyOrganismPlantRelationship({
      load: 1,
      habitat: 'Bare rocky stream',
      diet: 'Obligate grazer — algae and biofilm',
      grazeRate: 0.2
    });
    const recycler = ecosystemCore.classifyOrganismPlantRelationship({
      load: 0.5,
      habitat: 'Leaf litter',
      diet: 'Detritivore — decaying plant matter and organic particles'
    });

    expect(browser.plantShelterDependent).toBe(true);
    expect(browser.directPlantEater).toBe(true);
    expect(browser.herbivoryRate).toBeGreaterThan(0);
    expect(algaeOnly.algaeGrazer).toBe(true);
    expect(algaeOnly.directPlantEater).toBe(false);
    expect(recycler.detritusRecycler).toBe(true);
    expect(source).toContain('var plantHerbivoryConsumed = 0');
    expect(source).toContain("environmentStressReasons.push('missing preferred plant cover')");
    expect(source).toContain('herbivoryConsumed: Math.round(plantHerbivoryConsumed');
    expect(source).toContain('herbivoryByPlant: Object.keys(plantHerbivoryByPlant)');
    expect(source).toContain('selectedPlantBrowsingPressure');
    expect(source).toContain('"Browsed -" + ecosystemPlantHerbivoryByPlant[pid]');
    expect(source).toContain('Organism \\u2194 plant relationships');
    expect((source.match(/Organism \\u2194 plant relationships/g) || [])).toHaveLength(1);
  });

  it('adds responsive visual hierarchy to investigations, history, and matter flows', () => {
    expect(source).toContain("'.aquarium-budget-flow { display: grid;");
    expect(source).toContain(".aquarium-budget-flow { grid-template-columns: 1fr; }");
    expect(source).toContain('var budgetVisualMaximum = Math.max');
    expect(source).toContain('magnitude comparison: sources');
    expect(source).toContain('bg-gradient-to-l from-emerald-300 to-emerald-600');
    expect(source).toContain('var ecosystemInvestigationStage =');
    expect(source).toContain('Investigation path');
    expect(source).toContain("role: \"progressbar\"");
    expect(source).toContain("'aria-current': stageActive ? \"step\"");
    expect(source).toContain('var ecosystemBaselineX =');
    expect(source).toContain('A vertical baseline marker identifies the preregistered comparison point.');
    expect(source).toContain('strokeDasharray: "4 3"');
    expect(source).toContain('"BASELINE"');
  });
  it('unifies organism vitality and plant health in a filterable visual map', () => {
    expect(source).toContain("var ecosystemVitalityFilter = ['all', 'attention', 'critical']");
    expect(source).toContain('var ecosystemVitalityItems = []');
    expect(source).toContain("key: 'fish:' + vitalityMapFishId");
    expect(source).toContain("key: 'plant:' + plantId + ':' + vitalityPlantIndex");
    expect(source).toContain('var ecosystemWeakestVitalityItem =');
    expect(source).toContain('Living System Vitality Map');
    expect(source).toContain('Filter living system vitality');
    expect(source).toContain('conic-gradient(');
    expect(source).toContain('Ring length represents the 0–100 score');
    expect(source).toContain('labels preserve meaning without relying on color');
    expect(source).toContain("document.getElementById('aquarium-selected-plant-profile')");
    expect(source).toContain('id: "aquarium-selected-plant-profile"');
    expect(source).toContain("updMulti({ ecosystemFocusType: 'fish', ecosystemFocusId: vitalityItem.id })");
    expect(source).toContain('role: "group", \'aria-label\': "Filtered organism vitality and plant health"');
    expect(source).not.toContain('key: vitalityItem.key, type: "button", role: "listitem"');
  });
  it('scores spatial habitat structure and applies shelter to organism vitality', () => {
    const layout = [
      { id: 'wood-1', type: 'driftwood', x: -3, y: 0, z: -1, rotation: 10, scale: 1 },
      { id: 'cave-1', type: 'cave', x: 3, y: 0, z: 1, rotation: -10, scale: 1 },
      { id: 'stone-1', type: 'river_stone', x: 0, y: 0, z: 0, rotation: 0, scale: 1 }
    ];
    const summary = ecosystemCore.summarizeHabitatLayout(layout);
    expect(summary.items).toBe(3);
    expect(summary.shelterScore).toBeGreaterThan(40);
    expect(summary.territoryScore).toBeGreaterThan(40);
    expect(summary.plantAnchors).toBe(5);
    expect(summary.openSwimScore).toBeGreaterThan(40);
    expect(summary.zoneBalance).toBe(3);

    const sanitized = ecosystemCore.sanitizeHabitatLayout([
      { id: 'unsafe id!', type: 'cave', x: 99, y: -5, z: -99, rotation: 900, scale: 4 },
      { id: 'invalid', type: 'not-real', x: 0, y: 0, z: 0 }
    ]);
    expect(sanitized).toHaveLength(1);
    expect(sanitized[0].id).toBe('unsafeid');
    expect(sanitized[0].x).toBe(5.2);
    expect(sanitized[0].z).toBe(-2.8);
    expect(sanitized[0].scale).toBe(1.6);

    const baseInput = {
      chemistry: { dissolvedO2: 7, ammonia: 0, nitrite: 0, nitrate: 10, temp: 76, pH: 7 },
      species: { tempRange: [72, 80], pHRange: [6.5, 7.5] },
      loadPct: 50, plantBiomass: 0, hunger: 20, stress: 10, illnessSeverity: 0
    };
    const bare = ecosystemCore.calculateVitality({ ...baseInput, habitatShelter: 0 });
    const sheltered = ecosystemCore.calculateVitality({ ...baseInput, habitatShelter: 90 });
    expect(sheltered.score).toBeGreaterThan(bare.score);
    expect(sheltered.factors.find((factor) => factor.id === 'shelter').score).toBe(90);
    const intervention = ecosystemCore.compareInterventionFactors(
      { plants: [], organisms: [], habitat: [], equipment: {}, lightsOn: true },
      { plants: [], organisms: [], habitat: ['cave:0:0'], equipment: {}, lightsOn: true }
    );
    expect(intervention.controlled).toBe(true);
    expect(intervention.changes[0].id).toBe('habitat');
  });

  it('matches habitat structure to species behavior and breeding strategy', () => {
    const bare = ecosystemCore.summarizeHabitatLayout([]);
    const structured = ecosystemCore.summarizeHabitatLayout([
      { id: 'cave-a', type: 'cave', x: -3.5, y: 0, z: -1.5, rotation: 0, scale: 1.2 },
      { id: 'arch-a', type: 'rock_arch', x: 2.8, y: 0, z: 1.2, rotation: 20, scale: 1.1 },
      { id: 'wood-a', type: 'driftwood', x: 0, y: 0, z: -1.8, rotation: -15, scale: 1 }
    ]);
    const schooler = {
      habitat: 'Open water midwater', temperament: 'Peaceful schooling fish',
      diet: 'Omnivore', ecosystemRole: 'Active shoaling consumer', load: 1.5
    };
    const cavePredator = {
      habitat: 'Rocky cave and bottom crevices', temperament: 'Territorial predator',
      diet: 'Predator', ecosystemRole: 'Solitary benthic predator', load: 4
    };
    const schoolerFit = ecosystemCore.calculateHabitatFit(schooler, structured, 0, null);
    const caveBareFit = ecosystemCore.calculateHabitatFit(cavePredator, bare, 0, 'egg_layer');
    const caveStructuredFit = ecosystemCore.calculateHabitatFit(cavePredator, structured, 0, 'egg_layer');
    const breedingFit = ecosystemCore.calculateHabitatFit(schooler, structured, 0, 'egg_scatter');
    const plantedFit = ecosystemCore.calculateHabitatFit(schooler, bare, 7, null);

    expect(schoolerFit.needs.openSwim).toBe(76);
    expect(caveStructuredFit.needs.shelter).toBe(75);
    expect(caveStructuredFit.needs.territory).toBe(72);
    expect(caveStructuredFit.score).toBeGreaterThan(caveBareFit.score);
    expect(breedingFit.factors.find((factor) => factor.id === 'spawning').need).toBe(65);
    expect(plantedFit.supplies.shelter).toBe(90);
    expect(plantedFit.factors.find((factor) => factor.id === 'shelter').score).toBe(100);
    expect(['excellent', 'workable', 'strained', 'poor']).toContain(schoolerFit.status);

    const community = ecosystemCore.summarizeHabitatCommunity([
      { id: 'schooler-1', speciesId: 'schooler', name: 'Schooler', species: schooler, breedingType: null, zone: 'mid' },
      { id: 'predator-1', speciesId: 'predator', name: 'Cave predator', species: cavePredator, breedingType: 'egg_layer', zone: 'bottom' }
    ], structured, 0);
    expect(community.items).toHaveLength(2);
    expect(community.average).toBe(Math.round((schoolerFit.score + caveStructuredFit.score) / 2));
    expect(community.minimum).toBe(Math.min(schoolerFit.score, caveStructuredFit.score));
    expect(community.weakest.score).toBe(community.minimum);
    expect(Object.values(community.counts).reduce((sum, count) => sum + count, 0)).toBe(2);
    expect(ecosystemCore.summarizeHabitatCommunity([], bare, 0)).toMatchObject({ average: 100, minimum: 100, weakest: null });
  });

  it('assigns deterministic refuge, territory, spawning, and open-water occupancy', () => {
    const layout = [
      { id: 'cave-home', type: 'cave', x: -3, y: 0, z: -1, rotation: 0, scale: 1.2 },
      { id: 'arch-home', type: 'rock_arch', x: 2.8, y: 0, z: 1.2, rotation: 0, scale: 1 },
      { id: 'wood-home', type: 'driftwood', x: 0, y: 0, z: -1.8, rotation: 0, scale: 1 }
    ];
    const organisms = [
      { id: 'refuge-fish', score: 60, zone: 'bottom', limiting: { id: 'shelter' } },
      { id: 'territory-fish', score: 72, zone: 'mid', limiting: { id: 'territory' } },
      { id: 'spawning-fish', score: 68, zone: 'bottom', limiting: { id: 'spawning' } },
      { id: 'schooler', score: 82, zone: 'mid', limiting: { id: 'openSwim' } }
    ];
    const assignments = ecosystemCore.assignHabitatOccupancy(organisms, layout, ecosystemCore.getHabitatCatalog());
    expect(assignments.map((item) => item.behaviorMode)).toEqual(['using-refuge', 'holding-territory', 'using-spawning-refuge', 'open-water']);
    expect(assignments[0]).toMatchObject({ anchorId: 'cave-home', anchorLabel: 'Shelter cave' });
    expect(assignments[1].anchorId).toBeTruthy();
    expect(assignments[2].anchorId).toBe('cave-home');
    expect(assignments[3]).toMatchObject({ anchorId: null, anchorLabel: 'Open water' });
    expect(assignments.every((item) => item.targetX >= -5.2 && item.targetX <= 5.2 && item.targetZ >= -2.8 && item.targetZ <= 2.8)).toBe(true);
    expect(ecosystemCore.assignHabitatOccupancy(organisms, layout, ecosystemCore.getHabitatCatalog())).toEqual(assignments);

    const noRefuge = ecosystemCore.assignHabitatOccupancy([organisms[0]], [], ecosystemCore.getHabitatCatalog())[0];
    expect(noRefuge).toMatchObject({ behaviorMode: 'searching-refuge', anchorLabel: 'No suitable structure' });
  });

  it('builds deterministic spatial exchange networks across organisms, plants, algae, and detritus', () => {
    const plantPosition = ecosystemCore.getPlantHabitatPosition('midground', 0);
    expect(plantPosition).toEqual({ x: 0.6, y: 0, z: 0.7 });
    const plants = [{ id: 'anubias', name: 'Anubias', ...plantPosition }];
    const organisms = [
      { id: 'goby-1', speciesId: 'watchman_goby', name: 'Watchman goby', zone: 'bottom', targetX: -2, targetZ: 0.5, symbiosisWith: 'pistol_shrimp', relationship: {} },
      { id: 'shrimp-1', speciesId: 'pistol_shrimp', name: 'Pistol shrimp', zone: 'bottom', targetX: -1.4, targetZ: 0.6, symbiosisWith: 'watchman_goby', relationship: { detritusRecycler: true } },
      { id: 'cleaner-1', speciesId: 'cleaner_shrimp', name: 'Cleaner shrimp', zone: 'mid', targetX: 0, targetZ: 0, cleaningRate: 0.2, relationship: {} },
      { id: 'browser-1', speciesId: 'browser', name: 'Plant browser', zone: 'mid', targetX: 1, targetZ: 0.2, relationship: { directPlantEater: true } },
      { id: 'cover-1', speciesId: 'cover_user', name: 'Cover user', zone: 'mid', targetX: 1.8, targetZ: -0.2, relationship: { plantShelterDependent: true } },
      { id: 'grazer-1', speciesId: 'grazer', name: 'Algae grazer', zone: 'bottom', targetX: 2.5, targetZ: 1, relationship: { algaeGrazer: true } }
    ];
    const network = ecosystemCore.buildSpatialInteractionNetwork(organisms, plants);
    expect(network.total).toBe(network.links.length);
    expect(network.counts).toMatchObject({ symbiosis: 1, cleaning: 2, browsing: 1, cover: 1, grazing: 1, recycling: 1 });
    expect(new Set(network.links.map((link) => link.type))).toEqual(new Set(['symbiosis', 'cleaning', 'browsing', 'cover', 'grazing', 'recycling']));
    expect(network.links.find((link) => link.type === 'symbiosis').bidirectional).toBe(true);
    expect(network.links.find((link) => link.type === 'browsing').bidirectional).toBe(false);
    expect(network.links.every((link) => link.source.id && link.target.id && link.label && link.detail && link.color)).toBe(true);
expect(network.links.every((link) => typeof link.strength === 'number' && link.strength >= 0 && link.strength <= 100 && link.healthSignal && link.limitingEndpoint && link.limitingEndpoint.label)).toBe(true);
    expect(network.links.find((link) => link.type === 'browsing').limitingEndpoint.vitality).toBe(100);
    const weakPath = ecosystemCore.buildSpatialInteractionNetwork([
      { id: 'weak-browser', speciesId: 'weak-browser', name: 'Weak browser', zone: 'mid', targetX: 0, targetZ: 0, score: 42, relationship: { directPlantEater: true } }
    ], [{ id: 'tired-plant', name: 'Tired plant', health: 58, ...plantPosition }]);
    expect(weakPath.links[0]).toMatchObject({ type: 'browsing', strength: 42 });
    expect(weakPath.links[0].healthSignal).toContain('Stress or low health');
    const summary = ecosystemCore.summarizeSpatialInteractionNetwork(network);
    expect(summary).toMatchObject({ total: network.total, averageStrength: 100, minimumStrength: 100 });
    expect(summary.bands.healthy).toBe(network.total);
    expect(summary.weakest.id).toBeTruthy();
    expect(summary.strongest.id).toBeTruthy();
    expect(summary.recommendation).toContain('well supported');
    expect(ecosystemCore.summarizeSpatialInteractionNetwork({ links: [] })).toMatchObject({ total: 0, averageStrength: 0, minimumStrength: 0 });
    expect(ecosystemCore.buildSpatialInteractionNetwork(organisms, plants)).toEqual(network);
  });
  it('evaluates adaptive habitat missions from prediction through observed evidence', () => {
    const missions = ecosystemCore.getHabitatMissionCatalog();
    expect(missions.map((mission) => mission.id)).toEqual(['refuge', 'corridor', 'territory', 'balance']);
    expect(missions.every((mission) => mission.requiredTicks >= 4)).toBe(true);

    const baseline = { shelter: 20, territory: 20, openSwim: 62, average: 58, minimum: 48, vitality: 72, stress: 20 };
    const improved = { shelter: 58, territory: 32, openSwim: 55, average: 69, minimum: 54, vitality: 74, stress: 23 };
    const success = ecosystemCore.evaluateHabitatMission('refuge', baseline, improved, 4, 'shelter');
    expect(success.success).toBe(true);
    expect(success.predictionCorrect).toBe(true);
    expect(success.vitalityProtected).toBe(true);
    expect(success.stars).toBe(3);
    expect(success.points).toBe(300);
    expect(success.conditions.every((condition) => condition.met)).toBe(true);
    expect(success.deltas.shelter).toBe(38);

    const premature = ecosystemCore.evaluateHabitatMission('refuge', baseline, improved, 2, 'shelter');
    expect(premature.success).toBe(false);
    expect(premature.conditions.find((condition) => condition.id === 'observation').met).toBe(false);
    const corridor = ecosystemCore.evaluateHabitatMission('corridor', baseline, { ...improved, shelter: 15, openSwim: 82, minimum: 46, vitality: 68, stress: 27 }, 4, 'openSwim');
    expect(corridor.success).toBe(true);
    expect(corridor.actualLeadingMetric).toBe('openSwim');
    const confounded = ecosystemCore.evaluateHabitatMission('refuge', baseline, { ...improved, controlled: false }, 4, 'shelter');
    expect(confounded.success).toBe(false);
    expect(confounded.conditions.find((condition) => condition.id === 'controlled')).toMatchObject({ met: false });
  });

  it('provides a progressive-enhancement 3D habitat studio with a complete accessible editor', () => {
    expect(source).toContain('Spatial Habitat Studio');
    expect(source).toContain('function createAquariumHabitatScene(canvas, initialOptions)');
    expect(source).toContain('function AquariumHabitat3DViewport(props)');
    expect(source).toContain("window.StemLab.ensureThree({ orbit: true, orbitRequired: false })");
    expect(source).toContain("canvas.addEventListener('webglcontextlost', onContextLost, false)");
    expect(source).toContain('The 3D view could not start. The synchronized habitat plan and controls remain fully available.');
    expect(source).toContain('Accessible plan');
    expect(source).toContain('Editable aquarium habitat floor plan');
    expect(source).toContain('Habitat ecological overlay');
    expect(source).toContain('Move selected habitat object');
    expect(source).toContain('var habitatUndoLayout =');
    expect(source).toContain('var applyHabitatPreset = function(presetId)');
    expect(source).toContain('onClick: function() { applyHabitatPreset(preset.id); }');
    expect(source).toContain("key: 'main-tank-' + item.id");
    expect(source).toContain('habitat mismatch: ');
    expect(source).toContain('var habitatFitEntries = tankFish.map');
    expect(source).toContain('AquariumEcosystemCore.summarizeHabitatCommunity');
    expect(source).toContain('Organism Habitat Fit');
    expect(source).toContain('Add recommended structure');
    expect(source).toContain('What-if Habitat Forecast');
    expect(source).toContain('3D Habitat Field Missions');
    expect(source).toContain('Predict → build → observe → explain');
    expect(source).toContain('var habitatMissionStage =');
    expect(source).toContain('function startHabitatMission(missionId)');
    expect(source).toContain('function chooseHabitatMissionPrediction(metric)');
    expect(source).toContain('function beginHabitatMissionObservation()');
    expect(source).toContain('function evaluateActiveHabitatMission()');
    expect(source).toContain('function recordHabitatMissionReflection()');
    expect(source).toContain('Mission learning-loop stages');
    expect(source).toContain('Lock intervention and observe');
    expect(source).toContain('Evaluate mission evidence');
    expect(source).toContain('Evidence reflection');
    expect(source).toContain('Save reflection and claim points');
    expect(source).toContain('habitatMissionObservationLayoutSignature');
    expect(source).toContain('Confounded trial: the habitat changed after observation began');
    expect(source).toContain("id: 'controlled'");
    expect(source).toContain('habitatMissions: {');
    expect(source).toContain('controlled: habitatMissionObservationControlled');
    expect(source).toContain("habitatOverlay: 'organisms'");
    expect(source).toContain("habitatMissionStage: 'brief'");
    expect(source).toContain('Reversible habitat design forecasts');
    expect(source).toContain('var habitatForecasts = []');
    expect(source).toContain("id: 'reopen-swim'");
    expect(source).toContain('var applyHabitatForecast = function(forecast)');
    expect(source).toContain('Apply this preview');
    expect(source).toContain('Best modeled tradeoff');
    expect(source).toContain('Forecasts are comparative model outputs, not guarantees');
    expect(source).toContain("['none', 'shelter', 'territory', 'flow', 'light', 'organisms', 'interactions']");
    expect(source).toContain("overlay === 'organisms'");
expect(source).toContain("overlay === 'interactions'");
    expect(source).toContain('function buildSpatialInteractionNetwork(organisms, plants)');
    expect(source).toContain('isInteractionPulse');
    expect(source).toContain('interactions: habitatInteractionLinksForScene');
    expect(source).toContain('interactions: habitatInteractionNetwork');
    expect(source).toContain('Living interaction network');
    expect(source).toContain('Interaction diagram legend');
    expect(source).toContain('Visible organism and plant interactions');
expect(source).toContain('interactionStrength');
    expect(source).toContain('modeled pathway strength');
    expect(source).toContain('healthSignal');
    expect(source).toContain('summarizeSpatialInteractionNetwork');
    expect(source).toContain('Network reading:');
    expect(source).toContain('Average interaction pathway strength');
    expect(source).toContain('interactionSummary: habitatInteractionSummary');
expect(source).toContain("habitatInteractionFilter = ['all', 'weak', 'watch', 'healthy']");
    expect(source).toContain('habitatVisibleInteractionLinks');
    expect(source).toContain('Filter interaction pathways by modeled strength');
    expect(source).toContain('Weak <65%');
    expect(source).toContain('Watch 65');
    expect(source).toContain('Healthy 85%+');
expect(source).toContain('requestedHabitatInteractionId');
    expect(source).toContain('habitatInteractionLinksForScene');
    expect(source).toContain('interactionSelected');
    expect(source).toContain('Focus path');
    expect(source).toContain('Clear focus');
    expect(source).toContain('Interaction strength distribution');
    expect(source).toContain('Interaction direction and strength key');
    expect(source).toContain('interactionLearningPrompt');
    expect(source).toContain('Interaction experiment prompt');
    expect(source).toContain('habitatInteractionBaseline');
    expect(source).toContain('habitatInteractionBaselineComparable');
    expect(source).toContain('interactionBaselineDelta');
    expect(source).toContain('Interaction baseline comparison');
    expect(source).toContain('Before / after:');
    expect(source).toContain('Capture baseline');
    expect(source).toContain('Micro-experiment:');
    expect(source).toContain('Endpoint vitality');
    expect(source).toContain('endpointVitality');
    expect(source).toContain('sourceVitality');
    expect(source).toContain('targetVitality');
    expect(source).toContain('limitingEndpoint');
    expect(source).toContain('Limiting endpoint');
    expect(source).toContain('endpointIsLimiting');
    expect(source).toContain('isInteractionLimitHalo');
    expect(source).toContain('limitingLeft');
    expect(source).toContain('Inspect');
    expect(source).toContain('predict, change, observe, and recheck cycle');
    expect(source).toContain('Thicker/brighter paths = stronger');
    expect(source).toContain('Fuchsia emphasis = focused path');
    expect(source).toContain('Focused path:');
    expect(source).toContain('habitatFocusedInteraction');
    expect(source).toContain('Focused in both views');
    expect(source).toContain('new THREE.ConeGeometry');
    expect(source).toContain('isInteractionDirectionMarker');
    expect(source).toContain('interaction.bidirectional ? "\\u21C4" : "\\u2192"');
    expect(source).toContain('new THREE.LineLoop(pathGeometry');
    expect(source).toContain('onSelectFish: function(id)');
    expect(source).toContain('fishInstanceId');
    expect(source).toContain('Behavior map:');
    expect(source).toContain('function assignHabitatOccupancy(entries, layout, catalog)');
    expect(source).toContain('function behaviorOffset(mode, angle, span)');
    expect(source).toContain("behaviorMode = 'holding-territory'");
    expect(source).toContain("behaviorMode = 'using-spawning-refuge'");
    expect(source).toContain("behaviorMode = 'searching-refuge'");
    expect(source).toContain('targetX: fitItem.targetX');
    expect(source).toContain('pathSpan: fitItem.pathSpan');
    expect(source).toContain('var anchoredStructure = layout.find');
    expect(source).toContain('new THREE.TorusGeometry(0.34');
    expect(source).toContain('Anchor: " + fitItem.anchorLabel');
    expect(source).toContain('occupancy: habitatFitItems.map');
    expect(source).toContain('Path size estimates usable movement from habitat fit');
    expect(source).toContain('green excellent • cyan workable • amber strained • rose poor');
    expect(source).toContain('fitItem.zone + " water');
    expect(source).toContain('each mini-bar shows available habitat / modeled need');
    expect(source).toContain('role: "progressbar", \'aria-label\': fitItem.name + " habitat fit"');
    expect(source).toContain('hardscape refuges protect fry');
    expect(source).toContain("var assignedHabitatZone = aq.habitatPlantZones && aq.habitatPlantZones[pId]");
    expect(source).toContain("'habitat_shelter','habitat_territory','habitat_open_swim','habitat_fit_average','habitat_fit_minimum'");
    expect(source).toContain('Habitat changes are recorded as experimental interventions');
    expect(source).not.toContain('key: item.id, type: "button", role: "listitem"');
  });
  it('reconciles live oxygen, carbon, and nitrogen source-sink budgets', () => {
    const budgets = ecosystemCore.buildMatterBudget({
      fish: { oxygenConsumed: 0.3, co2Released: 0.2, ammoniaProduced: 0.2 },
      plants: { oxygenProduced: 0.4, co2Consumed: 0.1, nitrateConsumed: 0.05, nightOxygenConsumed: 0, nightCO2Released: 0, decompositionAmmonia: 0 },
      photosyntheticStock: { oxygenProduced: 0.1, co2Consumed: 0, oxygenConsumed: 0, co2Released: 0 },
      equipment: { oxygenAdded: 0.1, co2Removed: 0.015 },
      atmosphere: { oxygenExchange: -0.02, co2Offgas: 0.03 },
      bacteria: { nitriteToNitrate: 0.08 },
      chemistryDelta: { dissolvedO2: 0.28, co2: 0.055, ammonia: 0.05, nitrate: 0.03 }
    });
    const oxygen = budgets.find((budget) => budget.id === 'oxygen');
    const carbon = budgets.find((budget) => budget.id === 'co2');
    const ammonia = budgets.find((budget) => budget.id === 'ammonia');
    const nitrate = budgets.find((budget) => budget.id === 'nitrate');

    expect(budgets).toHaveLength(4);
    expect(oxygen.sourceTotal).toBe(0.6);
    expect(oxygen.sinkTotal).toBe(0.32);
    expect(oxygen.residual).toBe(0);
    expect(oxygen.direction).toBe('rise');
    expect(carbon.modeledNet).toBe(0.055);
    expect(ammonia.sinks[0].label).toContain('inferred');
    expect(ammonia.residual).toBe(0);
    expect(nitrate.modeledNet).toBe(0.03);
    expect(source).toContain('photosyntheticStock: {');
    expect(source).toContain('co2Offgas: Math.round(co2Offgas');
    expect(source).toContain('Matter budget ledger');
    expect(source).toContain('sources − sinks = modeled net');
    expect(source).toContain("'oxygen_delta','co2_delta','ammonia_delta','nitrate_delta'");
    expect(source).toContain('var pointStock = point.photosyntheticStock || {}');
    expect(source).toContain("'aria-label': \"Matter source and sink budgets for the last aquarium-hour tick\"");
  });
  it('teaches controlled interventions and evaluates preregistered directions', () => {
    const baseline = {
      plants: ['anubias', 'javafern'],
      organisms: ['tetra'],
      equipment: { filter: 1, light: 1 },
      lightsOn: true
    };
    const reordered = ecosystemCore.compareInterventionFactors(baseline, {
      plants: ['javafern', 'anubias'],
      organisms: ['tetra'],
      equipment: { filter: 1, light: 1 },
      lightsOn: true
    });
    const controlled = ecosystemCore.compareInterventionFactors(baseline, {
      plants: ['anubias', 'javafern', 'moss'],
      organisms: ['tetra'],
      equipment: { filter: 1, light: 1 },
      lightsOn: true
    });
    const confounded = ecosystemCore.compareInterventionFactors(baseline, {
      plants: ['anubias', 'javafern'],
      organisms: ['tetra'],
      equipment: { filter: 2, light: 1 },
      lightsOn: false
    });
    const evaluation = ecosystemCore.evaluateDirectionPredictions(
      { oxygen: 'rise', nitrate: 'stable', vitality: 'fall' },
      { oxygen: 0.2, nitrate: 0.05, vitality: -4 }
    );

    expect(reordered.count).toBe(0);
    expect(controlled.controlled).toBe(true);
    expect(controlled.changes[0].id).toBe('plants');
    expect(confounded.confounded).toBe(true);
    expect(confounded.count).toBe(2);
    expect(evaluation.complete).toBe(true);
    expect(evaluation.matched).toBe(3);
    expect(evaluation.score).toBe(100);
    expect(source).toContain('Preregister your prediction');
    expect(source).toContain('Confounded investigation');
    expect(source).toContain('Predictions locked and baseline marked');
    expect(source).toContain('controlledIntervention && baselineAge >= 6');
    expect(source).toContain('predictionEvaluation: ecosystemPredictionEvaluation');
    expect(source).toContain("snapshotParts.push('Prediction check: ' + notePredictionEvaluation.matched");
  });
  it('exports reproducible ecosystem evidence in CSV and JSON formats', () => {
    expect(source).toContain('function downloadEcosystemEvidence(format)');
    expect(source).toContain("var csvHeader = ['tick','day','hour','phase'");
    expect(source).toContain('baseline: ecosystemBaseline');
    expect(source).toContain('tutorialNotebook: tutorialNotebook');
    expect(source).toContain("new Blob([fileBody]");
    expect(source).toContain("downloadEcosystemEvidence('csv')");
    expect(source).toContain("downloadEcosystemEvidence('json')");
    expect(source).toContain('Export CSV');
    expect(source).toContain('Export JSON');
  });
  it('persists bounded exchange history and reversible vitality trajectories', () => {
    const bounded = Array.from({ length: 60 }, (_, tick) => tick).reduce(
      (history, tick) => ecosystemCore.appendBounded(history, { tick }, 48),
      []
    );
    expect(bounded).toHaveLength(48);
    expect(bounded[0].tick).toBe(12);
    expect(bounded[47].tick).toBe(59);

    const critical = { score: 15, limiting: { id: 'oxygen', label: 'O2', score: 10 } };
    let state = null;
    for (let tick = 1; tick <= 7; tick++) state = ecosystemCore.createVitalityState(state, critical, tick);
    expect(state.lowTicks).toBe(7);
    const recovering = ecosystemCore.createVitalityState(state, { score: 95, limiting: { id: 'space', label: 'Space', score: 90 } }, 8);
    expect(recovering.score).toBeGreaterThan(state.score);
    expect(recovering.trend).toBe('recovering');

    expect(source).toContain('ecosystemExchangeHistory: AquariumEcosystemCore.appendBounded');
    expect(source).toContain('vitalityHistory: AquariumEcosystemCore.appendBounded');
    expect(source).toContain('prolonged critical vitality');
    expect(source).toContain('Ecosystem exchange history');
    expect(source).toContain('Mark baseline');
    expect(source).toContain('Guided investigation: make one change');
    expect(source).toContain('var interventionDetected =');
    expect(source).toContain("currentTutorialLesson.id === 'exchange'");
    expect(source).toContain("snapshotParts.push('Since baseline: O2 '");
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
