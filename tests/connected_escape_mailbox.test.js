import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url), context={};
require('node:vm').runInNewContext(require('node:fs').readFileSync('apps_script/session_mailbox/Code.gs','utf8'),context);
const action={attemptId:'escape_current',requestId:'action_1',nodeId:'lens',kind:'interact',value:''};
const state=()=>({roster:{u:{uid:'u'}},escapeRoomState:{mode:'connected-room',isActive:true,isPaused:false,attemptId:'escape_current',teams:{u:'All'},teamProgress:{}}});
const path='escapeRoomState.teamProgress.All.connectedActions.u';
const allowed=(updates,data=state())=>context.participantCanPatchSession(updates,'u',data);
describe('Connected room Mailbox permissions',()=>{
 it('accepts only a current bounded action and a self team join',()=>{expect(allowed({[path]:action})).toBe(true);expect(allowed({'escapeRoomState.teams.u':'All'})).toBe(true);expect(allowed({'escapeRoomState.teams.u':'Red'})).toBe(false);});
 it.each([{attemptId:'old'},{requestId:'__proto__'},{requestId:'constructor'},{nodeId:'prototype'},{nodeId:'a.b'},{kind:'solve'},{value:'free answer'},{value:123},{extra:'x'},{requestId:'x'.repeat(161)}])('rejects unsafe and stale action %#',extra=>expect(allowed({[path]:{...action,...extra}})).toBe(false));
 it.each(['escapeRoomState','escapeRoomState.teamProgress','escapeRoomState.teamProgress.All','escapeRoomState.teamProgress.All.connected','escapeRoomState.teamProgress.All.connectedActions.v','escapeRoomState.teamProgress.All.connected.escape_current.solved.lens','escapeRoomState.teams.v','escapeRoomState.isPaused','escapeRoomState.connectedRoom'])('rejects participant edits to %s',path=>expect(allowed({[path]:action})).toBe(false));
 it.each(['paused','ended','outsider','unjoined'])('rejects %s participant actions',caseName=>{const data=state();if(caseName==='paused')data.escapeRoomState.isPaused=true;if(caseName==='ended')data.escapeRoomState.isActive=false;if(caseName==='outsider')data.roster={};if(caseName==='unjoined')data.escapeRoomState.teams={};expect(allowed({[path]:action},data)).toBe(false);});
 it('preserves legacy escape sessions and self roster updates',()=>{expect(allowed({'escapeRoomState.teamProgress.Red.currentRoom':2},{escapeRoomState:{mode:'escape-room'}})).toBe(true);expect(allowed({'roster.u':{uid:'u',name:'Rowan'}})).toBe(true);});
});
