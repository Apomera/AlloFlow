import {JourneyHost} from './native-view.mjs';
window.StemLab.registerTool('fieldJourneys',{
  icon:'🌿',label:'Field Journeys (Pilot)',category:'Ecology & Environment',
  lightBackground:true,render:ctx=>ctx.React.createElement(JourneyHost,{ctx,kind:'stem'})
});
