import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { core, coreSource, compileWords } from './helpers/word_sounds_core.js';

const pack = [{word:'cat',phonemes:['k','a','t']},{word:'cap',phonemes:['k','a','p']},{word:'cup',phonemes:['k','u','p']},{word:'kit',phonemes:['k','i','t']},{word:'jug',phonemes:['j','u','g']},{word:'get',phonemes:['g','e','t']},{word:'gig',phonemes:['g','i','g']}];
describe('Word Sounds sound truth and preparation parity',()=>{
  it.each(['get','give','girl','gift','gig'])('keeps the hard g in %s',word=>expect(core.edgeSound(word,'first')).toBe('g'));
  it.each([['cake','k'],['bike','k'],['home','m'],['nose','z'],['of','v'],['dogs','z'],['fox','s'],['gnome','m'],['giggle','l'],['girls','z'],['gives','z'],['cedar','er'],['honor','er']])('resolves the last sound of %s', (word,sound)=>expect(core.edgeSound(word,'last')).toBe(sound));
  it('distinguishes voiced th and rejects ambiguous or unknown estimates',()=>{
    expect(core.edgeSound('this','first')).toBe('dh');expect(core.edgeSound('thin','first')).toBe('th');
    expect(core.edgeSound('with','last')).toBeNull();expect(core.edgeSound('unreviewedword','last')).toBeNull();
  });
  it('does not let a wrong supplied hard-g label override a known pronunciation',()=>expect(core.edgeSound('get','first',['j'])).toBe('g'));
  it('compiles real Sound Sort boards without labeling cap as a k distractor',()=>{
    const words=compileWords(pack);
    for(const word of words){const board=word.activityItems.sound_sort;if(!board)continue;expect(core.validSoundBoard(board,word.word,words)).toBe(true);}
    const cat=words[0].activityItems.sound_sort;expect(cat.targetChar).toBe('k');
    expect(cat.distractors).not.toContain('cap');expect(cat.distractors).not.toContain('cup');
    expect(words.find(w=>w.word==='jug').activityItems.sound_sort.options).not.toEqual(expect.arrayContaining(['get']));
  });
  it('retains only selected lesson boards and reviews only their text',()=>{
    const profile={taughtPatterns:['c','a','t']};
    const [word]=compileWords([pack[0]],profile,'en',['counting']);
    expect(Object.keys(word.activityItems)).toEqual(['counting']);
    expect(word._preparedActivities).toEqual(['counting']);
    expect(word._instructionalProfile).toEqual(profile);
    expect(word._instructionalCoverage.status).toBe('within_taught_spellings');
  });
  it('preserves the exact order and choices of a valid reviewed board',()=>{
    const board={mode:'first',targetChar:'k',options:['cap','cup'],distractors:['get','jug']};
    expect(core.validSoundBoard(board,'cat',pack)).toBe(true);
    expect(core.validSoundBoard({...board,distractors:['cap','jug']},'cat',pack)).toBe(false);
    expect(core.validSoundBoard({...board,options:['cap','cap']},'cat',pack)).toBe(false);
  });
  it('retains explicit teacher overrides while rejecting ambiguous board shapes',()=>{
    expect(core.validSoundBoard({teacherEdited:true,mode:'last',targetChar:'dh',options:['with'],distractors:['cat']},'bat')).toBe(true);
    expect(core.validSoundBoard({teacherEdited:true,mode:'last',targetChar:'dh',options:['with'],distractors:['with']},'bat')).toBe(false);
  });
  it('embeds identical canonical logic without a CDN load-order dependency',()=>{
    for(const file of ['word_sounds_module.js','word_sounds_setup_source.jsx'])expect(readFileSync(file,'utf8')).toContain(coreSource.trim());
  });
});
const history=(count,difficulty='easy',extra={})=>Array.from({length:count},(_,i)=>({activity:'counting',word:['cat','dog','sun','map','bed','cup'][i%6],correct:true,attempts:1,difficulty,...extra}));
describe('Word Sounds cautious activity-specific progression',()=>{
  it('does not jump to hard after three successes or borrow another skill',()=>{
    expect(core.difficultyDecision(history(3),'counting').difficulty).toBe('easy');
    expect(core.difficultyDecision(history(12),'segmentation').difficulty).toBe('easy');
  });
  it('requires sustained success across distinct words in each successive band',()=>{
    expect(core.difficultyDecision(history(6),'counting').difficulty).toBe('medium');
    expect(core.difficultyDecision([...history(6),...history(8,'medium')],'counting').difficulty).toBe('hard');
    expect(core.difficultyDecision(history(20,'easy',{word:'cat'}),'counting').difficulty).toBe('easy');
  });
  it('retains the earned band through long sessions',()=>{
    const rows=[...history(6),...history(8,'medium'),...history(100,'hard')];
    expect(core.difficultyDecision(rows,'counting').difficulty).toBe('hard');
  });
  it('uses hysteresis, with one miss tolerated but sustained difficulty stepping down',()=>{
    const learned=history(6);expect(core.difficultyDecision([...learned,...history(1,'medium',{correct:false})],'counting').difficulty).toBe('medium');
    expect(core.difficultyDecision([...learned,...history(6,'medium',{correct:false})],'counting').difficulty).toBe('easy');
  });
  it('does not pool support contexts or visible-answer matching',()=>{
    const aac=history(6,'easy',{aacAssisted:true});
    expect(core.difficultyDecision(aac,'counting').difficulty).toBe('easy');
    expect(core.difficultyDecision(aac,'counting',{aacAssisted:true}).difficulty).toBe('medium');
    expect(core.difficultyDecision(history(10,'easy',{taskKind:'word_matching'}),'counting').difficulty).toBe('easy');
    expect(core.difficultyDecision(history(10,'easy',{attempts:2}),'counting').difficulty).toBe('easy');
  });
});
describe('Word Sounds honest text evidence and spelling coverage',()=>{
  it('records missing-image and revealed-answer clues separately from picture cloze',()=>{
    expect(core.textEvidence({activity:'read_sentence',imageAvailable:false})).toMatchObject({taskKind:'word_matching',answerExposed:true,independentReading:false,fallbackReason:'missing_target_image'});
    expect(core.textEvidence({activity:'read_passage',imageAvailable:true})).toMatchObject({taskKind:'picture_supported_cloze',independentReading:false,answerExposed:false});
    expect(core.textEvidence({activity:'read_passage',imageAvailable:true,answerRevealed:true})).toMatchObject({answerExposed:true,fallbackReason:'answer_revealed'});
  });
  it('keeps accented letters in spelling review and normalizes combining marks',()=>{
    expect(core.profileCheck('café',{taughtPatterns:['c','a','f','e']}).untaughtWords).toEqual(['café']);
    expect(core.profileCheck('cafe\u0301',{taughtPatterns:['c','a','f','é']}).status).toBe('within_taught_spellings');
  });
  it('flags untaught spellings instead of treating all familiar vocabulary as taught',()=>{
    const profile={taughtPatterns:['c','a','t','s','sh','i','p'],knownWords:['the']};
    expect(core.profileCheck('the cat',profile).status).toBe('within_taught_spellings');
    expect(core.profileCheck('the ship',profile).status).toBe('within_taught_spellings');
    expect(core.profileCheck('the dog',profile).untaughtWords).toEqual(['dog']);
    expect(core.profileCheck('the cat',{}).status).toBe('not_configured');
    expect(compileWords(pack,profile)[0]._instructionalCoverage.status).toBe('review');
  });
});
