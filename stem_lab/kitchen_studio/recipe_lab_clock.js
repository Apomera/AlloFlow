/* Learner-set reminders use simulated time only; they do not decide readiness. */
(function(root){
'use strict';
var durations=[15,30,60,120,300],steps=[5,15,30,60],vessels=['pot','pan'];
function create(now,seconds){return Number.isInteger(now)&&now>=0&&durations.indexOf(seconds)>=0&&now+seconds<=3600?{setAt:now,dueAt:now+seconds,status:'waiting'}:null;}
function restore(raw,now){var out={pot:null,pan:null};vessels.forEach(function(v){var t=raw&&raw[v];if(!t||!Number.isInteger(t.setAt)||!Number.isInteger(t.dueAt)||t.setAt>now)return;var valid=create(t.setAt,t.dueAt-t.setAt);if(valid){valid.status=valid.dueAt<=now?'elapsed':'waiting';out[v]=valid;}});return out;}
function settle(timers,now){return restore(timers,now);}
function limit(timers,now,seconds){var end=now+seconds;vessels.forEach(function(v){var t=timers[v];if(t&&t.status==='waiting'&&t.dueAt>now)end=Math.min(end,t.dueAt);});return end-now;}
function crossed(timers,from,to){if(!Number.isFinite(from)||!Number.isFinite(to)||from<0||to<=from)return [];return vessels.filter(function(v){var t=timers&&timers[v];return t&&t.status==='waiting'&&Number.isFinite(t.dueAt)&&t.dueAt>from&&t.dueAt<=to;}).map(function(v){return {vessel:v,dueAt:timers[v].dueAt,finishedAt:to,lateSeconds:to-timers[v].dueAt};});}
function step(value){return steps.indexOf(value)>=0?value:30;}
var api={crossed:crossed,durations:durations,steps:steps,create:create,restore:restore,settle:settle,limit:limit,step:step};root.KitchenRecipeClock=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
