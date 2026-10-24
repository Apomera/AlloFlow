import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const view=readFileSync('view_quiz_source.jsx','utf8'), grader=readFileSync('quiz_live_aggregators.js','utf8');
const begin=grader.indexOf('function assessmentItemSignature');
const canonical=new Function(grader.slice(begin,grader.indexOf('\n  function ',begin+10))+';return assessmentItemSignature;')();
const fallback=new Function('window',view.slice(view.indexOf('function _quizAssessmentItemSignature'),view.indexOf('function _quizResponseSnapshot'))+';return _quizAssessmentItemSignature;')({});
const question={type:'relation-mismatch',question:'Which pair needs repair?',pairs:[{left:'Root',right:'Light',leftImageUrl:'root.svg',rightImageUrl:'sun.svg'},{left:'Leaf',right:'Water'}],candidatePartners:['Water','Soil'],candidatePartnerImageUrls:['water.svg','soil.svg'],wrongPairIndex:0,correctPartnerForWrong:'Water'};
describe('Assess public question-version contract',()=>{
  it.each([
    {},question,
    {type:'mcq',question:'Choose',options:['A','B'],optionImageUrls:['a.svg','b.svg']},
    {type:'answer-evidence',question:'Why?',answerOptions:['A','B'],evidenceOptions:['E1','E2'],evidencePrompt:'Choose evidence',answerImageUrls:['a.svg'],evidenceImageUrls:['e.svg']},
    {type:'sequence-sense',items:['Start','End'],presentedOrder:[1,0],principleOptions:['Time','Size'],principleOptionsImageUrls:['clock.svg','ruler.svg']},
    {type:'numeric-response',contextSentence:'Measure the line.',unit:'cm',imageUrl:'line.svg'},
  ])('uses the same signature with or without the live grader loaded',q=>{expect(fallback(q)).toBe(canonical(q));});
  it('matches a student copy with withheld keys and changed translations/alt text',()=>{
    const student=structuredClone(question);delete student.wrongPairIndex;delete student.correctPartnerForWrong;
    student.question_en='A revised gloss';student.pairs[0].left_en='Raíz';student.pairs[0].leftImageAltText='A plant root';student.candidatePartnerImageAltTexts=['Water picture','Soil picture'];
    expect(fallback(student)).toBe(canonical(question));
  });
  it.each([
    q=>{q.pairs.reverse();},q=>{q.pairs[0].left='Stem';},q=>{q.pairs[0].leftImageUrl='stem.svg';},q=>{q.candidatePartners.reverse();},q=>{q.question='New prompt';},
  ])('detects response-bearing changes before saved positions can be graded',change=>{const changed=structuredClone(question);change(changed);expect(fallback(changed)).not.toBe(canonical(question));});
});
