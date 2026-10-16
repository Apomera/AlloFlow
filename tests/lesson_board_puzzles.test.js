import {describe,it,expect} from 'vitest';
import * as p from '../lesson_board_puzzles.js';
import * as e from '../lesson_board_engine.js';
import {healBoard,editableDraft} from '../lesson_board_heal.js';
import {responseText} from '../lesson_board_insights.js';
import {canMixPractice,practiceVariant} from '../lesson_board_learning.js';
import {soloWorkspace,saveSolo,readSolo,saveBoard,readLibrary} from '../lesson_board_storage.js';
import {prepareReplay,checkReplay,replayState} from '../lesson_board_replay.js';
import {activitySignature,visualSlots,visualBalance} from '../lesson_board_visual.js';
import {puzzleBoard,getPuzzle,source} from './fixtures/lesson_board_puzzles.js';
const context={attemptId:'attempt',active:true,paused:false};
const memory=()=>{const values=new Map();return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};};
function submit(board,run,value){return e.merge(run,e.processAction(board,run,{attemptId:'attempt',turn:run.turn,requestId:e.requestId(run,'puzzle'),kind:'answer',targetId:e.stepOf(run).targetId,value},'solo',context));}

describe('Bounded allocation and repair puzzles',()=>{
  it('prepares both authored formats without losing their keys, rules or corrections',()=>{
    const board=puzzleBoard();expect(e.validateBoard(board,source)).toEqual([]);
    expect(e.prepareBoard(board,source)).toEqual(board);
    expect(healBoard(board,source).board).toEqual(board);expect(editableDraft(board)).toBe(true);
    const stored=memory();saveBoard(stored,source,'English',board);expect(readLibrary(stored,source,'English')).toEqual([board]);
  });
  it.each(p.PUZZLE_KINDS)('keeps %s transport bounded and copies its arrays',kind=>{
    const node=getPuzzle(kind),answer=e.solution(node),initial=e.initialDraft(node);
    expect(p.validatePuzzle(node)).toEqual([]);expect(p.puzzleSolution(node)).toBe(answer);
    expect(e.validValue(node,answer)).toBe(true);expect(e.validValue(node,initial)).toBe(false);expect(p.puzzleValidDraft(node,initial)).toBe(true);
    for(const invalid of ['',',','00,0,1','1,1,9','1,-1,2','1.0,1,1','1,1,1,1','1,'.repeat(20)])expect(e.validValue(node,invalid)).toBe(false);
    const copy=p.copyPuzzle(node),field=kind==='allocate'?'needs':'items';copy[field][0]='Changed';expect(node[field][0]).not.toBe('Changed');
    expect(responseText(node,answer)).toContain(node[field][0]);expect(p.puzzleFeedback(node,answer).correct).toBe(node[field].length);
    expect(canMixPractice(node)).toBe(false);expect(practiceVariant(node,3)).toBe(node);
  });
  it('enforces available supply and capacity without comparing the draft to the answer',()=>{
    const node=getPuzzle('allocate');
    expect(p.puzzleValidDraft(node,'1,0,0')).toBe(true);expect(e.validValue(node,'1,0,0')).toBe(false);
    expect(e.validValue(node,'6,0,0')).toBe(true);expect('6,0,0').not.toBe(e.solution(node));
    expect(p.puzzleValidDraft(node,'6,1,0')).toBe(false);expect(p.puzzleValidDraft(node,'7,0,0')).toBe(false);
    expect(p.updatePuzzle(node,'0,0,0',0,6)).toBe('6,0,0');expect(p.updatePuzzle(node,'6,0,0',1,1)).toBe('6,0,0');
    expect(p.updatePuzzle(node,'6,0,0',0,5)).toBe('5,0,0');expect(p.updatePuzzle(node,'0,0,0',-1,2)).toBe('0,0,0');
  });
  it('requires a decision about every repair item and reserves corrections for feedback',()=>{
    const node=getPuzzle('repair');expect(p.puzzleValidDraft(node,'1,,0')).toBe(true);expect(e.validValue(node,'1,,0')).toBe(false);
    expect(e.validValue(node,'0,0,0')).toBe(true);expect(e.validValue(node,'1,1,1')).toBe(true);
    expect(p.puzzleFeedback(node,'1,,0')).toBeNull();expect(p.puzzleResponseText(node,'1,0,0')).not.toContain(node.corrections[2]);
    const feedback=p.puzzleFeedback(node,'1,0,0');expect(feedback.correct).toBe(1);expect(feedback.entries[2].correction).toBe(node.corrections[2]);expect(feedback.entries[0]).not.toHaveProperty('correction');
  });
  it('rejects malformed authored keys, missing rules, ambiguous labels and excessive bounds',()=>{
    const allocation=getPuzzle('allocate'),repair=getPuzzle('repair');
    for(const patch of [{budget:0},{budget:13},{budget:1e12},{budget:1.5},{budget:'6'},{allocation:[6,1,0]},{allocation:[3,1.5,1.5]},{allocation:[]},{needs:['A','a ','B']},{needs:['A','B']},{constraints:[]},{constraints:['same',' same ']}])expect(p.validatePuzzle({...allocation,...patch}).length).toBeGreaterThan(0);
    for(const patch of [{repairs:[0,0,0]},{repairs:[1,1,1]},{repairs:[0,0,2]},{repairs:[]},{corrections:['','','']},{corrections:['Extra','','Correction']},{corrections:['','','x'.repeat(401)]},{items:['Same','same ','Other']}])expect(p.validatePuzzle({...repair,...patch}).length).toBeGreaterThan(0);
  });
  it('normalizes explicit numeric strings but never invents missing or ambiguous answers',()=>{
    const board=puzzleBoard();board.locations[0].budget='6';board.locations[0].allocation=['3','2','1'];board.locations[1].repairs=['0','0','1'];
    const healed=healBoard(board,source).board;expect(healed).toEqual(puzzleBoard());
    delete board.locations[0].allocation;delete board.locations[1].repairs;
    const incomplete=healBoard(board,source).board;expect(incomplete.locations[0].kind).toBe('allocate');expect(incomplete.locations[0].allocation).toEqual([]);expect(incomplete.locations[1].kind).toBe('repair');expect(incomplete.locations[1].repairs).toEqual([]);expect(editableDraft(incomplete)).toBe(true);expect(e.validateBoard(incomplete,source).length).toBeGreaterThan(0);
    board.locations[0].allocation=[true,null,'three'];board.locations[1].repairs=[false,true,'yes'];
    const invalid=healBoard(board,source).board;expect(invalid.locations[0].allocation).toEqual([-1,-1,-1]);expect(invalid.locations[1].repairs).toEqual([-1,-1,-1]);
  });
  it.each(p.PUZZLE_KINDS)('grades %s through the real response, retry and restored-run flow',kind=>{
    const board=puzzleBoard(),node=board.locations.find(item=>item.kind===kind),wrong=kind==='allocate'?'6,0,0':'1,1,1';let run=e.merge(e.emptyRun(),e.begin(board,e.emptyRun(),node.id));
    expect(e.stepOf(submit(board,run,e.initialDraft(node))).answers||{}).toEqual({});
    run=submit(board,run,wrong);run=e.merge(run,e.resolve(board,run,{solo:{}}));expect(e.stepOf(run).result.success).toBe(false);
    run=e.merge(run,e.retry(board,run));run=submit(board,run,e.solution(node));run=e.merge(run,e.resolve(board,run,{solo:{}}));
    expect(e.stepOf(run).result.success).toBe(true);expect(e.derive(board,run).visited).toContain(node.id);
    const restored=e.restoreRun(board,JSON.parse(JSON.stringify(run)));expect(e.stepOf(restored).result.success).toBe(true);expect(e.attemptRecords(e.stepOf(restored)).solo).toMatchObject({answered:2,correct:1,firstCorrect:false,lastCorrect:true});
  });
  it.each(p.PUZZLE_KINDS)('preserves incomplete %s drafts in solo saves and private replay',kind=>{
    const board=puzzleBoard(),node=board.locations.find(item=>item.kind===kind),draft=kind==='allocate'?'1,0,0':'1,,',run=e.emptyRun(),key='0:'+node.id;
    expect(soloWorkspace(board,run,{drafts:{[key]:draft}}).drafts[key]).toBe(draft);
    const storage=memory();saveSolo(storage,board,'puzzles','learner',{run,workspace:{drafts:{[key]:draft}}});expect(readSolo(storage,board,'puzzles','learner').workspace.drafts[key]).toBe(draft);
    const ended={...run,turn:47,steps:{t47:{phase:'review',targetId:node.id,result:{success:false}}}};
    const replay=prepareReplay(board,ended,{started:true,targetIds:[node.id],draft});expect(replay.draft).toBe(draft);expect(checkReplay(board,ended,replay).events).toEqual([]);
    const checked=checkReplay(board,ended,{...replay,draft:e.solution(node)});expect(replayState(board,checked).complete).toBe(true);
    expect(prepareReplay(board,ended,{...replay,draft:'6,6,6'}).draft).toBe(e.initialDraft(node));
  });
  it('binds visual support to puzzle rules and keys without exposing corrections as picture slots',()=>{
    const allocation=getPuzzle('allocate'),repair=getPuzzle('repair');
    expect(visualSlots(allocation).map(slot=>slot.id)).toEqual(['prompt','need0','need1','need2']);
    expect(visualSlots(repair).map(slot=>slot.id)).toEqual(['prompt','item0','item1','item2']);
    expect(JSON.stringify(visualSlots(repair))).not.toContain(repair.corrections[2]);
    expect(visualBalance(repair,{})[0]).toMatchObject({total:3,correctOnly:false});
    expect(activitySignature({...allocation,constraints:['New visible rule']})).not.toBe(activitySignature(allocation));
    expect(activitySignature({...repair,corrections:['','','New correction']})).not.toBe(activitySignature(repair));
  });
});
