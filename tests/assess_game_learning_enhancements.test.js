import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
import { readReflection, saveReflection, reflectionKey } from '../connected_escape_room_reflection.js';
import { prepareReplay, replayTransfer } from '../lesson_board_replay.js';
const require=createRequire(import.meta.url), base=require('../concept_quest_engine.js'), solo=require('../concept_quest_solo_engine.js'), saves=require('../concept_quest_solo_storage.js');
const {makeBoard}=require('../dev-tools/fixtures/lesson_board.cjs');
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
beforeAll(()=>{window.React=require('../desktop/web-app/node_modules/react');loadAlloModule('escape_room_module.js');});

describe('Assess game follow-through evidence',()=>{
 it('isolates local escape reflections by learner/attempt and room revision and reports storage failure',()=>{
  const storage=memory(),room={title:'Room',nodes:[]};
  expect(saveReflection(storage,room,'learner-a:attempt-1','The two clues share a cause.')).toBe(true);
  expect(readReflection(storage,room,'learner-a:attempt-1')).toMatchObject({status:'saved',text:'The two clues share a cause.'});
  expect(readReflection(storage,room,'learner-b:attempt-1').status).toBe('empty');
  expect(readReflection(storage,room,'learner-a:attempt-2').status).toBe('empty');
  expect(reflectionKey({...room,title:'Revised'},'learner-a:attempt-1')).not.toBe(reflectionKey(room,'learner-a:attempt-1'));
  expect(saveReflection({setItem(){throw Error('full');}},room,'scope','Work')).toBe(false);
  expect(saveReflection(storage,room,'','Preview')).toBe(false);
 });
 it('restores bounded transfer writing without turning self-review into a game score',()=>{
  const board=makeBoard(),run={turn:47,steps:{t47:{phase:'review',result:{success:false},targetId:'heater'}}},concept=board.locations.find(node=>node.id==='heater').conceptId,before=JSON.stringify({board,run});
  const replay=prepareReplay(board,run,{started:true,targetIds:['heater'],transfer:{[concept]:{example:'My new example',reviewed:true,score:100},unknown:{example:'Ignored'}}});
  expect(replayTransfer(board,replay)[0]).toMatchObject({example:'My new example',reviewed:true});
  expect(replay.transfer[concept]).not.toHaveProperty('score');expect(replay.transfer).not.toHaveProperty('unknown');
  expect(prepareReplay(board,run,{...replay,transfer:{[concept]:{example:' ',reviewed:true}}}).transfer[concept].reviewed).toBe(false);
  expect(JSON.stringify({board,run})).toBe(before);
 });
 it('keeps per-learner first and repeated responses when the round log is capped',()=>{
  let quest=base.resolveTravel(base.createSession({questions:[{question:'Which?',options:['A','B'],correctIndex:0}]}),{},'room-2').quest;
  quest.party.hp=quest.party.maxHp=10000;base.getRoom(quest,quest.currentRoomId).enemy.hp=base.getRoom(quest,quest.currentRoomId).enemy.maxHp=10000;
  for(let index=0;index<28;index++){
   const key=base.getTurnKey(quest),actions={a:{abilityId:'analyze',answerIndex:index===0?1:0,turnKey:key},b:{abilityId:'explain',answerIndex:0,turnKey:key,supportTargetUid:'a',supportId:'guard'}};
   quest=JSON.parse(JSON.stringify(base.resolveBattle(quest,actions).quest));
  }
  const report=base.createDebrief(quest);expect(quest.roundHistory).toHaveLength(24);expect(report.learnerHistoryComplete).toBe(true);
  expect(report.learnerEvidence.find(row=>row.uid==='a')).toMatchObject({responses:28,firstResponses:1,firstCorrect:0,repeatResponses:27,repeatCorrect:27,peerSupportReceived:28});
  expect(report.learnerEvidence.find(row=>row.uid==='b')).toMatchObject({firstCorrect:1,peerSupportReceived:0});
 });
 it('preserves focused practice alongside the original quest and rejects targets outside its bank',()=>{
  const source={id:'practice-source',data:{questions:[{question:'Which?',options:['A','B'],correctAnswer:'A'}]}},context={generatedContent:source,userId:'a',appId:'school'},quest=solo.createSession(base,source,(_,fallback)=>fallback),before=JSON.stringify(quest),storage=memory();
  const snapshot={version:1,quest,roleId:'analyst',abilityId:'analyze',response:{},recapOpen:false,gmState:null,aiEnabled:false,practice:{targets:[0],entries:[{answerIndex:1}],response:{},checked:true}};
  expect(saves.save(storage,context,snapshot).status).toBe('saved');
  expect(saves.read(storage,context).snapshot.practice).toEqual(snapshot.practice);expect(JSON.stringify(quest)).toBe(before);
  expect(saves.save(storage,context,{...snapshot,practice:{...snapshot.practice,targets:[999]}}).status).not.toBe('saved');
 });
 it('reveals authored support progressively, charges one puzzle budget and preserves correctness',()=>{
  const puzzle={id:'p',type:'mcq',question:'Which?',options:['A','B'],correctIndex:0,hint:'Orient',hintSteps:['Inspect the evidence','Work the first step']};
  const state={escapeRoomState:{isActive:true,puzzles:[puzzle],solvedPuzzles:new Set(),hintsRemaining:1,hintsUsed:{},hintLevels:{},hasStarted:true},isEscapeTimerRunning:true,escapeTimeLeft:300};
  const engine=window.AlloModules.createEscapeRoomEngine({getState:()=>state,setState:{setEscapeRoomState:next=>{state.escapeRoomState=typeof next==='function'?next(state.escapeRoomState):next;}},t:key=>key,addToast:()=>{},playSound:()=>{}});
  for(let level=1;level<=3;level++){engine.handleRevealHint('p');expect(state.escapeRoomState.hintLevels.p).toBe(level);expect(state.escapeRoomState.totalHintsUsed).toBe(1);expect(state.escapeRoomState.hintsRemaining).toBe(0);}
  engine.handleRevealHint('p');expect(state.escapeRoomState.hintLevels.p).toBe(3);expect(state.escapeRoomState.solvedPuzzles.size).toBe(0);expect(puzzle.correctIndex).toBe(0);
 });
});
