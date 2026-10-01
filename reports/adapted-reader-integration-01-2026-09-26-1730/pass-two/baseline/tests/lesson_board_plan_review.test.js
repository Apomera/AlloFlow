import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {emptyRun} from '../lesson_board_engine.js';
import {simulatePlan} from '../lesson_board_sandbox.js';
import {planReview,previewSupport} from '../lesson_board_plan_review.js';
const {makeBoard,support}=createRequire(import.meta.url)('../dev-tools/fixtures/lesson_board_support.cjs');
const route=['heater','cloud','research','river','bridge'];
const review=(goal,ids=route)=>{const board={...makeBoard(),goal};return planReview(board,simulatePlan(board,emptyRun(),ids));};

describe('Projected mission and construction explanations',()=>{
  it('distinguishes all three mission goals for the same route',()=>{
    expect(review('core')).toMatchObject({missingConcepts:[],remainingProjects:0,remainingLocations:[]});
    expect(review('expedition').remainingLocations.map(node=>node.id)).toEqual(['rain','lake','sequence','cooler','weather']);
    expect(review('architect')).toMatchObject({missingConcepts:[],remainingProjects:1,remainingLocations:[]});
  });
  it('names unseen concepts without treating them as incorrect learner responses',()=>{
    expect(review('core',['heater']).missingConcepts.map(concept=>concept.name)).toEqual(['Water-cycle processes']);
    expect(review('core',['heater']).remainingProjects).toBe(2);
  });
  it('attributes only later planned exploration bonuses to each new construction',()=>{
    expect(review('expedition').effects.find(effect=>effect.project.id==='research').earned).toBe(1);
    expect(review('expedition',['heater','cloud','bridge','river','research']).effects.find(effect=>effect.project.id==='research').earned).toBe(0);
    const board={...makeBoard(),goal:'expedition'},base=simulatePlan(board,emptyRun(),['heater','cloud','research']).run;
    expect(planReview(board,simulatePlan(board,base,['river','bridge'])).effects.map(effect=>effect.project.id)).toEqual(['bridge']);
  });
  it('distinguishes a useful shortcut from a destination already reachable or explored',()=>{
    expect(review('expedition',['heater','cloud','bridge']).effects[0]).toMatchObject({opened:true,visitedBefore:false});
    expect(review('expedition',['heater','cloud','rain','bridge']).effects[0]).toMatchObject({opened:false,visitedBefore:false});
    expect(review('expedition',['heater','cloud','rain','sequence','bridge']).effects[0]).toMatchObject({opened:false,visitedBefore:true});
  });
  it('does not promise a new route after a construction finishes the mission',()=>{
    expect(review('core').effects.find(effect=>effect.project.id==='bridge').opened).toBe(false);
  });
  it('limits review-only glossary pictures to actually reviewed locations even for a shared term',()=>{
    const raw={...support(),definitionMode:'review'};raw.terms[0].locations=['heater','cloud'];
    const before=JSON.stringify(raw),limited=previewSupport(raw,['heater']);
    expect(limited.terms[0].locations).toEqual(['heater']);
    expect(previewSupport(raw,[]).terms).toEqual([]);
    expect(JSON.stringify(raw)).toBe(before);
    expect(limited.assets).toBe(raw.assets);
  });
  it('preserves available glossary pictures and handles a board without support',()=>{
    const raw=support();expect(previewSupport(raw,[])).toBe(raw);expect(previewSupport(undefined,[])).toBeUndefined();
  });
});
