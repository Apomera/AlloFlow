import {mountFieldJourneys} from './app.mjs';
function boot(){window.CampaignPilot=mountFieldJourneys(document);}
if(document.readyState==='complete')boot();else window.addEventListener('load',boot,{once:true});
