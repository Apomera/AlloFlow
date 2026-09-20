import {beforeAll,describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
let C;
beforeAll(()=>{window.StemLab={registerTool(){}};new Function(readFileSync('stem_lab/stem_tool_cell.js','utf8'))();C=window.__alloCellPure;});
describe('Cell review navigation and study status',()=>{
  it('cycles valid review structures and avoids a no-op for the last item',()=>{
    expect(C.nextCellReviewKey('animal',['nucleus','mitochondria'],'nucleus')).toBe('mitochondria');
    expect(C.nextCellReviewKey('animal',['nucleus','mitochondria'],'mitochondria')).toBe('nucleus');
    expect(C.nextCellReviewKey('animal',['nucleus','mitochondria'],'golgi')).toBe('nucleus');
    expect(C.nextCellReviewKey('animal',['chloroplast','constructor','nucleus','nucleus'],'nucleus')).toBeNull();
    expect(C.nextCellReviewKey('animal',[],'nucleus')).toBeNull();
  });
  it('updates one structure without changing recall scores, exploration or unrelated mastery',()=>{
    const cell={interiorSeen:['nucleus','golgi'],interiorReview:['nucleus','mitochondria'],interiorMastered:['golgi'],interiorQuizAttempts:4,interiorQuizCorrect:3};
    const changed=C.changeCellStudyStatus(cell,'animal','nucleus','mastered');
    expect(cell.interiorReview).toEqual(['nucleus','mitochondria']);
    expect(changed.interiorReview).toEqual(['mitochondria']);
    expect(changed.interiorMastered).toEqual(['golgi','nucleus']);
    const reset=C.changeCellStudyStatus(changed,'animal','nucleus','explored');
    expect(C.cellStudyStatus(reset,'nucleus')).toBe('explored');
    expect(reset.interiorSeen).toEqual(cell.interiorSeen);
    expect(reset.interiorQuizAttempts).toBe(4);expect(reset.interiorQuizCorrect).toBe(3);
    expect(reset.interiorMastered).toEqual(['golgi']);
    expect(C.cellStudyStatus(C.changeCellStudyStatus(reset,'animal','nucleus','review'),'nucleus')).toBe('review');
  });
  it('rejects invalid keys and statuses and handles absent lists',()=>{
    const cell={};expect(C.changeCellStudyStatus(cell,'animal','chloroplast','mastered')).toBe(cell);
    expect(C.changeCellStudyStatus(cell,'animal','constructor','review')).toBe(cell);
    expect(C.changeCellStudyStatus(cell,'animal','nucleus','wrong')).toBe(cell);
    expect(C.cellStudyStatus(C.changeCellStudyStatus(cell,'animal','nucleus','review'),'nucleus')).toBe('review');
  });
});
