import {JourneyHost} from './native-view.mjs';
import {makeRun, makeRunId, dispatch, materialize, validateRun, saveRun, readRun, saveKey, MAX_COMMANDS} from './core.mjs';
import {validateResponses} from './response-records.mjs';
import {createWatershedRuntime} from './watershed-source.mjs';
if (typeof window !== 'undefined' && window.StemLab && typeof window.StemLab.registerTool === 'function') {
window.StemLab.registerTool('fieldJourneys',{
  icon:'🌿',label:'Field Journeys (Pilot)',category:'Ecology & Environment',
  desc:'Try a story-led Watershed or Grove campaign. Explore the landscape, make decisions, and keep a field journal. Optional pilot with separate saves.',
  lightBackground:true,render:ctx=>ctx.React.createElement(JourneyHost,{ctx,kind:'stem'})
});
}

// Inert unless the existing test harness explicitly opts in before loading.
if (typeof window !== 'undefined' && window.__RR_TEST_EXPORTS__) {
  window.__RR_TEST_EXPORTS__.fieldJourneys = {
    makeRun, makeRunId, dispatch, materialize, validateRun, validateResponses,
    createWatershedRuntime, saveRun, readRun, saveKey, MAX_COMMANDS
  };
}
