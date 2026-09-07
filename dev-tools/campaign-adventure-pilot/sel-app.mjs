import {JourneyHost} from './native-view.mjs';
window.SelHub.registerTool('practiceJourneys',{
  icon:'🗺️',label:'Practice Journeys (Pilot)',category:'relationship-skills',
  recommendedRange:'5-12',lightBackground:true,
  desc:'Practice a group project through four connected encounters. Use choices, your own words, or both.',
  render:ctx=>ctx.React.createElement(JourneyHost,{ctx,kind:'sel'})
});
