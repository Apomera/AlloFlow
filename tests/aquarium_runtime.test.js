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
    expect(source).toContain("ammonia: waterChem.ammonia + (targetId ? 0.1 : 0.25)");
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
