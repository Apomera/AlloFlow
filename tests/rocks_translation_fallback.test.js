import {beforeEach,describe,it,expect} from 'vitest';
import {ReactDOMServer,loadTool,makeCtx,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const candidate=process.env.ROCKS_LABEL_SOURCE||'stem_lab/stem_tool_rocks.js';
beforeEach(()=>{resetStemLab();loadTool(candidate,'rocks');});
function render(mode,t){
 const original={rocks:{mode,quizLog:{0:0},quizScore:3,compare:{notes:{pair:'Keep this note.'}}},rockCycle:{keep:true}};
 const ctx=makeCtx({toolData:original,t});
 const node=window.StemLab._registry.rocks.render(ctx),html=ReactDOMServer.renderToStaticMarkup(node),container=document.createElement('div');container.innerHTML=html;
 expect(original.rocks.quizScore).toBe(3);expect(original.rocks.compare.notes.pair).toBe('Keep this note.');
 return container;
}
describe('Rocks translation fallback labels',()=>{
 it.each([k=>k,()=>undefined,()=>'',()=>{throw Error('Pack still loading');},undefined])('keeps rock names, families and quiz specimen captions readable when translations are unavailable',t=>{
  const rocks=render('rocks',t),quiz=render('quiz',t);
  expect(rocks.querySelector('#rk-rock-tile-granite').textContent).toContain('Granite');
  expect(rocks.textContent).toContain('Igneous');
  expect(quiz.querySelector('[data-rk-quiz-show] figcaption').textContent).toBe('Breccia');
  expect(quiz.querySelector('[data-rk-quiz-show]').textContent).toContain('Conglomerate');
  expect(quiz.querySelector('[data-rk-quiz-active]').textContent).not.toMatch(/stem\.rocks\./);
 });
 it('keeps mineral names and measurement labels readable with a key-returning translator',()=>{
  const minerals=render('minerals',k=>k),density=render('densityLab',k=>k);
  expect(minerals.querySelector('#rk-mineral-tile-quartz').textContent).toContain('Quartz');
  expect(density.querySelector('[data-rk-density-mineral] option').textContent).toBe('Quartz');
  expect(density.querySelector('[data-rk-density-balance]').getAttribute('aria-label')).toBe('Dry specimen mass: Not measured');
 });
 it('preserves a valid translated caption instead of replacing it with English',()=>{
  const quiz=render('quiz',(k)=>k==='stem.rocks.breccia'?'Brèche':k);
  expect(quiz.querySelector('[data-rk-quiz-show] figcaption').textContent).toBe('Brèche');
  expect(quiz.querySelector('[data-rk-quiz-show]').textContent).toContain('Conglomerate');
 });
});
