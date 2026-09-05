import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Universe guided timeline and topic navigation', () => {
  let host, root, config, state;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    Element.prototype.scrollIntoView = vi.fn();
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_universe.js', 'universe');
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });
  afterEach(async () => {
    if (window._universeTimeLapse) clearInterval(window._universeTimeLapse);
    window._universeTimeLapse = null;
    await act(async () => root.unmount());
    host.remove(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  });
  async function mount(initial = {}) {
    function Harness() {
      const [toolData, setToolData] = React.useState({ universe: { tutorialDismissed: true, ...initial } });
      state = toolData.universe;
      return config.render(makeCtx({ toolData, setToolData }));
    }
    await act(async () => root.render(React.createElement(Harness)));
  }
  async function click(el) { await act(async () => el.click()); }
  async function tick(ms = 100) { await act(async () => vi.advanceTimersByTime(ms)); }
  const byLabel = label => host.querySelector('[aria-label="' + label + '"]');

  it('reaches every early milestone at its physical age and exposes readable slider values', async () => {
    await mount();
    const ages = [0, 0.00038, 0.001, 0.2, 0.4, 4.6, 9.2, 13.8, 13.81];
    for (let i = 0; i < ages.length; i++) {
      await click(host.querySelectorAll('.uni-epoch-stops button')[i]);
      expect(state.cosmicTime).toBe(ages[i]);
      expect(host.querySelector('#universe-cosmic-time').value).toBe(String(i));
      expect(host.querySelectorAll('.uni-epoch-stops [aria-pressed="true"]')).toHaveLength(1);
    }
    expect(state.epochsVisited).toHaveLength(9);
    await click(host.querySelectorAll('.uni-epoch-stops button')[1]);
    expect(host.querySelector('#universe-cosmic-time').getAttribute('aria-valuetext')).toContain('380 thousand years');
    expect(host.querySelector('.uni-think').textContent).toContain('before the first stars');
    expect(host.querySelector('#universe-timeline-hint').textContent).toContain('not equal time');
  });

  it('pauses playback on a milestone and stops at the future instead of looping', async () => {
    await mount();
    await click(byLabel('Play cosmic timeline playback')); await tick();
    expect(state.cosmicTime).toBeGreaterThan(0);
    await click(host.querySelectorAll('.uni-epoch-stops button')[1]); await tick(500);
    expect(state.cosmicTime).toBe(0.00038); expect(state.isPlaying).toBe(false);
    await click(host.querySelectorAll('.uni-epoch-stops button')[7]);
    await click(byLabel('Play cosmic timeline playback')); await tick(2600);
    expect(state.cosmicTime).toBe(13.81); expect(state.isPlaying).toBe(false);
    expect(window._universeTimeLapse).toBeNull();
    await click(byLabel('Play cosmic timeline playback')); await tick(50);
    expect(state.cosmicTime).toBeLessThan(0.00038);
  });

  it('lets keyboard users move through early epochs without skipping recombination', async () => {
    await mount();
    const canvas = host.querySelector('[data-universe-canvas]');
    await act(async () => canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    expect(state.cosmicTime).toBe(0.00038);
    await act(async () => canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })));
    expect(state.cosmicTime).toBe(13.81);
  });

  it('opens the investigation disclosure and transfers focus to a selected topic', async () => {
    await mount();
    expect(host.querySelector('#universe-investigations').open).toBe(false);
    await click(host.querySelectorAll('.uni-path button')[1]); await tick();
    expect(host.querySelector('#universe-investigations').open).toBe(true);
    await click(byLabel('Open topic: Distance Ladder')); await tick();
    expect(state.showDistance).toBe(true);
    expect(document.activeElement.id).toBe('unisec-distance-ladder');
    expect(host.querySelector('#unisec-distance-ladder').classList.contains('uni-hidden')).toBe(false);
    expect(host.querySelector('#uni-topic-distance-ladder').getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('#unisec-star-lifecycle').classList.contains('uni-hidden')).toBe(true);
    await click(host.querySelector('#unisec-distance-ladder .uni-toggle')); await tick();
    expect(document.activeElement.id).toBe('uni-topic-distance-ladder');
    expect(state.showDistance).toBe(false);
  });
  it('keeps each learner explanation with its epoch and pauses time while writing', async () => {
    await mount();
    const text = host.querySelector('#universe-reflection-0');
    await click(byLabel('Play cosmic timeline playback'));
    await act(async () => text.focus());
    expect(state.isPlaying).toBe(false);
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(text, 'Space expands and the universe cools.');
      text.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(state.epochReflections['0']).toBe('Space expands and the universe cools.');
    await click(host.querySelectorAll('.uni-epoch-stops button')[1]);
    expect(host.querySelector('#universe-reflection-1').value).toBe('');
    await click(host.querySelectorAll('.uni-epoch-stops button')[0]);
    expect(host.querySelector('#universe-reflection-0').value).toBe('Space expands and the universe cools.');
  });

  it('provides bounded previous and next controls and an explicit still-scene preference', async () => {
    await mount();
    let controls = host.querySelectorAll('.uni-step-controls button');
    expect(controls[0].disabled).toBe(true);
    await click(controls[1]);
    expect(state.cosmicTime).toBe(0.00038);
    await click(host.querySelectorAll('.uni-epoch-stops button')[8]);
    expect(host.querySelectorAll('.uni-step-controls button')[1].disabled).toBe(true);
    await click(byLabel('Still scene'));
    expect(state.sceneMotion).toBe('still');
    expect(host.querySelector('[data-universe-canvas]').dataset.sceneMotion).toBe('still');
    await click(byLabel('Still scene'));
    expect(state.sceneMotion).toBe('animated');
  });

  it('saves mission-specific evidence even when a different thread is selected', async () => {
    await mount({activeCosmicMission: 'first-light', cosmicEvidenceThread: 'lensing'});
    const save = [...host.querySelectorAll('button')].find(b => b.textContent === 'Save mission example');
    await click(save);
    const note = state.cosmicEvidenceNotebook.find(n => n.key === 'mission:first-light');
    expect(note.claim).toBe('The early universe was hot, dense, and nearly uniform.');
    expect(note.evidence).toContain('microwave glow');
  });

  it('does not mark an evidence thread mastered just for copying a worked example', async () => {
    await mount();
    await click([...host.querySelectorAll('button')].find(b => b.textContent === 'Save example note'));
    expect(state.cosmicEvidenceNotebook).toHaveLength(1);
    expect(state.evidenceThreadsMastered || []).toHaveLength(0);
  });

  it('stops running playback when choosing an evidence thread', async () => {
    await mount();
    await click(byLabel('Play cosmic timeline playback'));
    await click(host.querySelectorAll('#universe-investigation-evidence button[aria-pressed]')[1]);
    await tick(400);
    expect(state.cosmicTime).toBe(0.00038);
    expect(state.isPlaying).toBe(false);
    expect(window._universeTimeLapse).toBeNull();
  });

  it('does not promote legacy click-only completion to reviewed learning', async () => {
    await mount({ cosmicMissionsCompleted: ['expansion'], evidenceThreadsMastered: ['redshift'] });
    const button=[...host.querySelectorAll('button')].find(b=>b.textContent==='Record mission self-review');
    expect(button.disabled).toBe(true);
    expect(state.selfReviewedMissions || []).toHaveLength(0);
    expect(host.querySelector('#universe-investigation-evidence').textContent).toContain('0/5 self-reviewed');
  });

  async function input(el,value) {
    await act(async()=>{
      const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);
      el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));
    });
  }

  it('records a response and explicit self-review, then reopens review when revised', async()=>{
    await mount();
    const record=()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Record self-review');
    expect(record().disabled).toBe(true);
    for(const name of ['prediction','observation','explanation','limitation']) await input(host.querySelector('#universe-response-'+name),'My '+name);
    expect(record().disabled).toBe(true);
    await click(host.querySelector('.uni-review-check input'));
    await click(record());
    expect(state.selfReviewedEvidence).toEqual(['redshift']);
    expect(state.evidenceThreadsMastered || []).toEqual([]);
    await click([...host.querySelectorAll('button')].find(b=>b.textContent==='Record mission self-review'));
    expect(state.selfReviewedMissions).toEqual(['expansion']);
    await input(host.querySelector('#universe-response-explanation'),'Revised reasoning');
    expect(state.selfReviewedEvidence).toEqual([]);
    expect(state.selfReviewedMissions).toEqual([]);
  });

  it('accepts supported response routes without treating choices as demonstrated mastery', async()=>{
    await mount({cosmicEvidenceThread:'cmb'});
    await input(host.querySelector('#universe-response-mode'),'supported');
    for(const name of ['prediction','observation','explanation','limitation']) {
      await click(host.querySelector('#universe-response-'+name+' input')); 
    }
    await click(host.querySelector('.uni-review-check input'));
    await click([...host.querySelectorAll('button')].find(b=>b.textContent==='Record self-review'));
    expect(state.selfReviewedEvidence).toEqual(['cmb']);
    expect(state.evidenceThreadsMastered || []).toEqual([]);
    expect(host.querySelector('#universe-cmb-measurement table').textContent).toContain('383.478');
    await input(host.querySelector('#universe-cmb-pattern'),'flat');
    expect(host.querySelector('.uni-feedback').textContent).toContain('Look again');
    await input(host.querySelector('#universe-cmb-pattern'),'peak');
    expect(host.querySelector('.uni-feedback').textContent).toContain('Pattern check correct');
  });

  it('shows every notebook example, searches learner work, and preserves revisions', async()=>{
    await mount({cosmicEvidenceNotebook:Array.from({length:10},(_,i)=>({key:'note-'+i,title:'Example '+i,claim:'Claim '+i})),epochReflections:{'0':'Initial explanation'}});
    await input(host.querySelector('[aria-label="Notebook entries"]'),'examples');
    expect(host.querySelectorAll('.uni-notebook-entry')).toHaveLength(10);
    await click([...host.querySelectorAll('button')].find(b=>b.textContent==='Save a revision'));
    await input(host.querySelector('#universe-reflection-0'),'A revised explanation');
    await click([...host.querySelectorAll('button')].find(b=>b.textContent==='Save a revision'));
    expect(state.explanationRevisions).toHaveLength(2);
    expect(state.explanationRevisions[0].text).toBe('Initial explanation');
    await input(host.querySelector('[aria-label="Notebook entries"]'),'mine');
    await input(host.querySelector('[aria-label="Search notebook"]'),'revised');
    expect(host.querySelectorAll('.uni-notebook-entry')).toHaveLength(1);
    expect(host.querySelector('.uni-notebook-entry').textContent).toContain('Initial explanation');
    expect(state.epochReflections['big-bang']).toBe('A revised explanation');
  });

  it('keeps stable epoch visits and pins a before-state across navigation', async()=>{
    await mount({visitedEpochIds:['recombination'],epochReflections:{recombination:'Stable note'}});
    await click([...host.querySelectorAll('button')].find(b=>b.textContent==='Pin this epoch'));
    await click(host.querySelectorAll('.uni-epoch-stops button')[1]);
    expect(state.visitedEpochIds).toEqual(['recombination','big-bang']);
    expect(host.querySelector('#universe-reflection-1').value).toBe('Stable note');
    expect(state.comparisonEpochId).toBe('big-bang');
    expect(host.querySelectorAll('.uni-comparison-grid>div')).toHaveLength(2);
    expect(host.querySelector('.uni-visual-column #universe-timeline')).not.toBeNull();
  });

  it('opens the actual local mission destination even under a conflicting topic filter', async()=>{
    await mount({activeCosmicMission:'stellar-rulers',uniQuery:'black hole'});
    await click([...host.querySelectorAll('#universe-investigation-missions button')].find(b=>b.textContent==='Continue investigation'));
    await tick();
    expect(state.uniQuery).toBe('');
    expect(state.showDistance).toBe(true);
    expect(document.activeElement.id).toBe('unisec-distance-ladder');
  });

  it('offers a targeted retry for missed concepts and preserves per-question results',async()=>{
    await mount({showQuiz:true,quizIdx:10,quizScore:1,quizResponses:{2:false,10:true}});
    expect(host.querySelector('.uni-quiz-review').textContent).toContain('cosmic microwave background');
    await click([...host.querySelectorAll('button')].find(b=>b.textContent==='Retry missed questions'));
    expect(state.quizReviewDeck).toEqual([2]);
    expect(host.querySelector('#unisec-quiz').textContent).toContain('Question 1 of 1');
    expect(host.querySelector('#unisec-quiz').textContent).toContain('What is the cosmic microwave background?');
  });

  it('reveals a closed investigation from quiz review and returns to the same results',async()=>{
    await mount({showQuiz:true,quizIdx:10,quizScore:0,quizResponses:{2:false}});
    expect(host.querySelector('#universe-investigations').open).toBe(false);
    await click(host.querySelector('.uni-quiz-review .uni-quiz-concept button'));await tick();
    expect(host.querySelector('#universe-investigations').open).toBe(true);
    expect(document.activeElement.id).toBe('universe-cmb-measurement');
    expect(host.querySelector('#universe-cmb-measurement .uni-quiz-return').textContent).toContain('cosmic microwave background');
    await click(host.querySelector('#universe-cmb-measurement .uni-quiz-return button'));await tick();
    expect(document.activeElement.id).toBe('unisec-quiz');
    expect(state.quizResponses).toEqual({2:false});
    expect(state.quizIdx).toBe(10);
  });

  it('opens the reflection disclosure and focuses the editable field when revisiting a note',async()=>{
    await mount({cosmicTime:0.00038,epochReflections:{'big-bang':'Saved early idea'}});
    await click([...host.querySelectorAll('button')].find(b=>b.textContent==='Revisit & revise'));await tick();
    const field=host.querySelector('#universe-reflection-0');
    expect(field.closest('details').open).toBe(true);
    expect(document.activeElement).toBe(field);
    expect(field.hasAttribute('tabindex')).toBe(false);
  });

  it('inspects a real sample and appends its value and source without replacing the learner text',async()=>{
    await mount({cosmicEvidenceThread:'cmb',evidenceWork:{cmb:{observation:'My original observation'}}});
    await input(host.querySelector('#universe-cmb-sample'),'9');
    expect(host.querySelector('.uni-sample-values').textContent).toContain('4.523');
    const add=()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='Add sample to my observation');
    await click(add());
    expect(state.evidenceWork.cmb.observation).toContain('My original observation');
    expect(state.evidenceWork.cmb.observation).toContain('21.33 cm⁻¹');
    expect(state.evidenceWork.cmb.observation).toContain('4.523 ± 0.282 MJy/sr');
    expect(state.evidenceWork.cmb.sources).toEqual(['https://lambda.gsfc.nasa.gov/product/cobe/firas_monopole_spect.html']);
    expect([...host.querySelectorAll('button')].find(b=>b.textContent==='Sample added to my observation').disabled).toBe(true);
    await input(host.querySelector('#universe-cmb-sample'),'2');await click(add());
    expect(state.evidenceWork.cmb.sources).toHaveLength(1);
    expect(state.evidenceWork.cmb.observation).toContain('383.478 ± 0.018 MJy/sr');
  });

  it('keeps self-review when changing reading controls, but saves earlier work when the explanation changes',async()=>{
    await mount({cosmicEvidenceThread:'cmb',evidenceWork:{cmb:{prediction:'A curve',observation:'A peak',explanation:'Thermal origin',limitation:'Not a sky map',reviewed:true}}});
    await click([...host.querySelectorAll('button')].find(b=>b.textContent==='Record self-review'));
    expect(state.evidenceRevisions).toHaveLength(1);
    await input(host.querySelector('#universe-response-mode'),'supported');
    await input(host.querySelector('#universe-cmb-pattern'),'peak');
    expect(state.selfReviewedEvidence).toEqual(['cmb']);
    expect(state.evidenceWork.cmb.reviewed).toBe(true);
    await input(host.querySelector('#universe-response-mode'),'written');
    await input(host.querySelector('#universe-response-explanation'),'New reasoning');
    expect(state.selfReviewedEvidence).toEqual([]);
    expect(state.evidenceWork.cmb.reviewed).toBe(false);
    expect(state.evidenceRevisions[0].text).toContain('Thermal origin');
    await click(host.querySelector('.uni-review-check input'));
    await click([...host.querySelectorAll('button')].find(b=>b.textContent==='Record self-review'));
    expect(state.evidenceRevisions).toHaveLength(2);
    expect(host.querySelector('.uni-notebook-entry').textContent).toContain('Thermal origin');
  });

  it('does not create empty notebook responses and clears stale filters when reviewing current work',async()=>{
    await mount({cosmicEvidenceThread:'cmb',notebookFilter:'examples',notebookSearch:'missing',evidenceWork:{cmb:{mode:'written',pattern:'peak'}}});
    expect(host.querySelector('.uni-notebook').textContent).toContain('0 entries total');
    await input(host.querySelector('#universe-response-observation'),'A useful observation');
    await click([...host.querySelectorAll('button')].find(b=>b.textContent==='Review in my notebook'));await tick();
    expect(state.notebookFilter).toBe('mine');expect(state.notebookSearch).toBe('');
    expect(host.querySelector('.uni-notebook-entry').textContent).toContain('A useful observation');
    expect(document.activeElement.id).toBe('universe-investigation-notebook');
  });

  it('preserves a self-reviewed response created before revision history existed',async()=>{
    await mount({cosmicEvidenceThread:'cmb',selfReviewedEvidence:['cmb'],evidenceWork:{cmb:{prediction:'Original prediction',observation:'Original signal',explanation:'Earlier reasoning',limitation:'A limit',reviewed:true}}});
    await input(host.querySelector('#universe-response-explanation'),'A new explanation');
    expect(state.evidenceRevisions).toHaveLength(1);
    expect(state.evidenceRevisions[0].text).toContain('Earlier reasoning');
    expect(state.evidenceWork.cmb.explanation).toBe('A new explanation');
    expect(state.selfReviewedEvidence).toEqual([]);
  });

  it('reveals saved examples despite a stale notebook filter without marking a mission started',async()=>{
    await mount({notebookFilter:'mine',notebookSearch:'unmatched',epochReflections:{'big-bang':'My own idea'}});
    await click([...host.querySelectorAll('#universe-investigation-notebook button')].find(b=>b.textContent==='Save example note'));
    expect(state.notebookFilter).toBe('examples');expect(state.notebookSearch).toBe('');
    expect(host.querySelectorAll('.uni-notebook-entry')).toHaveLength(1);
    expect(host.querySelector('.uni-notebook-entry').textContent).toContain('Worked example');
    await click([...host.querySelectorAll('#universe-investigation-notebook button')].find(b=>b.textContent==='Save mission example'));
    expect(host.querySelectorAll('.uni-notebook-entry')).toHaveLength(2);
    expect(state.cosmicMissionsLaunched||[]).toHaveLength(0);
    expect(state.epochReflections['big-bang']).toBe('My own idea');
  });

  it('resumes a CMB draft at its next unanswered field while preserving recorded observations',async()=>{
    await mount({cosmicEvidenceThread:'redshift',evidenceWork:{cmb:{prediction:'A thermal curve',observation:'A peak in the spectrum'}}});
    await click([...host.querySelectorAll('.uni-notebook-entry button')].find(b=>b.textContent==='Continue this response'));await tick();
    expect(state.cosmicEvidenceThread).toBe('cmb');
    expect(document.activeElement.id).toBe('universe-response-explanation');
    expect(host.querySelector('#universe-investigations').open).toBe(true);
    expect(state.evidenceWork.cmb.observation).toBe('A peak in the spectrum');
    expect(host.querySelectorAll('.uni-note-response dt')).toHaveLength(4);
    expect(host.querySelector('.uni-note-status').textContent).toBe('Draft');
  });

  it('recovers hidden notebook entries without changing their contents',async()=>{
    await mount({notebookFilter:'examples',notebookSearch:'missing',epochReflections:{'big-bang':'An earlier idea'}});
    expect(host.querySelector('.uni-notebook-empty').textContent).toContain('No entries match this view');
    await click([...host.querySelectorAll('.uni-notebook-empty button')].find(b=>b.textContent==='Clear notebook filters'));await tick();
    expect(state.notebookFilter).toBe('all');expect(state.notebookSearch).toBe('');
    expect(document.activeElement.id).toBe('universe-notebook-results');
    expect(host.querySelector('.uni-notebook-entry').textContent).toContain('An earlier idea');
    expect(state.epochReflections['big-bang']).toBe('An earlier idea');
  });

  it('moves to the timeline when an investigation requests it and keeps the draft intact',async()=>{
    await mount({cosmicTime:13.8,cosmicEvidenceThread:'cmb',isPlaying:true,evidenceWork:{cmb:{observation:'Keep this measurement'}}});
    await click([...host.querySelectorAll('#universe-investigation-evidence button')].find(b=>b.textContent==='Show this on the timeline'));await tick();
    expect(state.cosmicTime).toBe(0.00038);expect(state.isPlaying).toBe(false);
    expect(document.activeElement.id).toBe('universe-timeline');
    await click([...host.querySelectorAll('#universe-investigation-missions button')].find(b=>b.textContent==='Show mission on timeline'));await tick();
    expect(document.activeElement.id).toBe('universe-timeline');
    expect(state.cosmicMissionsLaunched).toHaveLength(1);
    expect(state.evidenceWork.cmb.observation).toBe('Keep this measurement');
  });

  it('saves a notebook version for its own epoch without changing the selected epoch',async()=>{
    await mount({cosmicTime:.00038,epochReflections:{'big-bang':'An early explanation'}});
    await click([...host.querySelectorAll('.uni-note-actions button')].find(b=>b.textContent==='Save current version'));await tick();
    expect(state.cosmicTime).toBe(.00038);
    expect(state.explanationRevisions).toHaveLength(1);
    expect(state.explanationRevisions[0]).toMatchObject({epochId:'big-bang',text:'An early explanation'});
    expect(document.activeElement.id).toBe('universe-thinking-epoch-big-bang');
    expect(host.querySelector('.uni-thinking').open).toBe(true);
    expect(host.querySelector('.uni-thinking-status').textContent).toContain('matches your current words');
    expect([...host.querySelectorAll('.uni-note-actions button')].find(b=>b.textContent==='Current version saved').disabled).toBe(true);
  });

  it('saves a partial evidence draft without recording a self-review',async()=>{
    await mount({cosmicEvidenceThread:'cmb',evidenceWork:{cmb:{observation:'A rise and fall in the spectrum'}}});
    await click([...host.querySelectorAll('.uni-note-actions button')].find(b=>b.textContent==='Save current version'));await tick();
    expect(state.evidenceRevisions).toHaveLength(1);
    expect(state.evidenceRevisions[0].evidenceId).toBe('cmb');
    expect(state.evidenceRevisions[0].text).toContain('A rise and fall in the spectrum');
    expect(state.selfReviewedEvidence||[]).toEqual([]);
    expect(state.evidenceWork.cmb.reviewed).toBeUndefined();
    expect(host.querySelector('.uni-note-status').textContent).toBe('Draft');
  });

  it('keeps reflections separate for each revision and preserves their writing context after later edits',async()=>{
    await mount({epochReflections:{'big-bang':'Current idea'},explanationRevisions:[{epochId:'big-bang',text:'Earliest idea',savedAt:'2026-09-01T12:00:00Z'},{epochId:'big-bang',text:'Another idea',savedAt:'2026-09-02T12:00:00Z'}]});
    const id='#universe-thinking-epoch-big-bang';
    expect(host.querySelector(id+'-version').value).toBe('1');
    await input(host.querySelector(id+'-change'),'The grid changed my interpretation');
    await input(host.querySelector(id+'-version'),'0');
    expect(host.querySelector(id+'-change').value).toBe('');
    await input(host.querySelector(id+'-question'),'What observation would test expansion?');
    await input(host.querySelector(id+'-version'),'1');
    expect(host.querySelector(id+'-change').value).toBe('The grid changed my interpretation');
    expect(host.querySelector(id+'-question').value).toBe('');
    await input(host.querySelector('#universe-reflection-0'),'My later interpretation');
    expect(state.notebookComparisons['epoch:big-bang'][1].currentText).toBe('Current idea');
    expect(state.notebookComparisons['epoch:big-bang'][1].beforeText).toBe('Another idea');
    expect(state.notebookComparisons['epoch:big-bang'][0].nextQuestion).toContain('test expansion');
    expect(host.querySelector('.uni-thinking-context').textContent).toContain('Current idea');
    expect(host.querySelectorAll('.uni-thinking-history .uni-note-revision')).toHaveLength(2);
  });

  it('clears comparison reflections and selected revisions with an explicit progress reset',async()=>{
    await mount({epochReflections:{'big-bang':'My idea'},notebookComparisons:{'epoch:big-bang':{0:{change:'A changed idea'}}},notebookRevisionChoice:{'epoch:big-bang':0}});
    await click(byLabel('Reset all Universe Explorer progress'));
    await click(byLabel('Confirm and erase all progress'));await tick();
    expect(state.notebookComparisons).toEqual({});
    expect(state.notebookRevisionChoice).toEqual({});
    expect(state.epochReflections).toEqual({});
  });

  it('guides unanswered prompts through review without recording a review automatically',async()=>{
    await mount({cosmicEvidenceThread:'cmb'});
    expect(host.querySelector('.uni-response-next').textContent).toContain('Next prompt: Predict');
    await click(host.querySelector('.uni-response-next button'));await tick();
    expect(document.activeElement.id).toBe('universe-response-prediction');
    for(const field of ['prediction','observation','explanation','limitation'])await input(host.querySelector('#universe-response-'+field),'My '+field);
    expect(host.querySelectorAll('.uni-response-steps [data-recorded=true]')).toHaveLength(4);
    expect(host.querySelector('.uni-response-next').textContent).toContain('Review your explanation');
    await click(host.querySelector('.uni-response-next button'));await tick();
    expect(document.activeElement.id).toBe('universe-evidence-review');
    expect(state.evidenceWork.cmb.reviewed).toBe(false);
    await click(host.querySelector('#universe-evidence-review'));
    await click(host.querySelector('.uni-response-next button'));await tick();
    expect(document.activeElement.id).toBe('universe-record-review');
    expect(state.selfReviewedEvidence||[]).toEqual([]);
    await click(host.querySelector('#universe-record-review'));
    expect(host.querySelector('.uni-response-next').textContent).toContain('Choose what to investigate next');
    await click(host.querySelector('.uni-response-next button'));await tick();
    expect(document.activeElement.id).toBe('universe-investigation-notebook');
  });

  it('lets learners jump to a supported prompt without changing their recorded answers',async()=>{
    await mount({cosmicEvidenceThread:'cmb',evidenceWork:{cmb:{mode:'supported',observation:'I need help identifying a pattern in the spectrum.'}}});
    await click(host.querySelectorAll('.uni-response-steps button')[2]);await tick();
    expect(document.activeElement.id).toBe('universe-response-explanation');
    expect(document.activeElement.tagName).toBe('FIELDSET');
    expect(state.evidenceWork.cmb.observation).toBe('I need help identifying a pattern in the spectrum.');
    expect(host.querySelectorAll('.uni-response-steps [data-recorded=true]')).toHaveLength(1);
    expect(state.selfReviewedEvidence||[]).toEqual([]);
  });

  it('reopens a saved investigation question at its own revision despite hidden notebook entries',async()=>{
    const key='epoch:big-bang';
    await mount({notebookFilter:'examples',notebookSearch:'missing',epochReflections:{'big-bang':'Current idea'},explanationRevisions:[{epochId:'big-bang',text:'Earlier idea'},{epochId:'big-bang',text:'Later idea'}],notebookRevisionChoice:{[key]:1},notebookComparisons:{[key]:{0:{nextQuestion:'Which observation would test my first idea?'},1:{nextQuestion:'What remains uncertain now?'}}}});
    expect(host.querySelectorAll('.uni-notebook-questions li')).toHaveLength(2);
    expect(host.querySelectorAll('.uni-notebook-entry')).toHaveLength(0);
    await click(host.querySelector('.uni-notebook-questions button'));await tick();
    expect(state.notebookFilter).toBe('mine');expect(state.notebookSearch).toBe('');
    expect(state.notebookRevisionChoice[key]).toBe(0);
    expect(document.activeElement.id).toBe('universe-thinking-epoch-big-bang-question');
    expect(document.activeElement.value).toBe('Which observation would test my first idea?');
    expect(host.querySelector('.uni-thinking').open).toBe(true);
    expect(state.notebookComparisons[key][1].nextQuestion).toBe('What remains uncertain now?');
  });

  it('omits empty or unlinked investigation questions from the notebook index',async()=>{
    await mount({epochReflections:{'big-bang':'My idea'},explanationRevisions:[{epochId:'big-bang',text:'Earlier idea'}],notebookComparisons:{'epoch:big-bang':{0:{nextQuestion:'   '},5:{nextQuestion:'A question without a saved revision'}}}});
    expect(host.querySelector('.uni-notebook-questions')).toBeNull();
  });

  it('compares two FIRAS values with consistent units and synchronizes measurement A with the inspector',async()=>{
    await mount({cosmicEvidenceThread:'cmb'});
    expect(host.querySelector('#universe-cmb-comparison').hidden).toBe(true);
    await click(host.querySelector('.uni-comparison-toggle'));await tick();
    expect(document.activeElement.id).toBe('universe-cmb-comparison');
    expect(host.querySelector('#universe-cmb-comparison').hidden).toBe(false);
    expect(host.querySelector('.uni-firas-difference strong').textContent).toBe('-378.955 MJy/sr');
    expect(host.querySelectorAll('.uni-firas-uncertainty')[1].textContent).toContain('0.282');
    expect(host.querySelector('.uni-measurement-plot svg').getAttribute('aria-label')).toContain('A and B');
    await input(host.querySelector('#universe-cmb-compare-a'),'9');
    expect(host.querySelector('#universe-cmb-sample').value).toBe('9');
    expect(host.querySelector('.uni-firas-difference strong').textContent).toBe('0.000 MJy/sr');
    expect(host.querySelector('.uni-firas-comparison-actions button').disabled).toBe(true);
    await input(host.querySelector('#universe-cmb-compare-b'),'2');
    expect(host.querySelector('.uni-firas-difference strong').textContent).toBe('378.955 MJy/sr');
    expect(host.querySelector('.uni-firas-difference').textContent).toContain('higher intensity');
  });

  it('appends a comparison only once while retaining the original observation and source',async()=>{
    await mount({cosmicEvidenceThread:'cmb',cmbCompareOpen:true,evidenceWork:{cmb:{observation:'My original observation'}}});
    const add=()=>host.querySelector('.uni-firas-comparison-actions button');
    await click(add());
    const saved=state.evidenceWork.cmb.observation;
    expect(saved).toContain('My original observation');
    expect(saved).toContain('A at 5.45 cm⁻¹ is 383.478 ± 0.018 MJy/sr');
    expect(saved).toContain('B at 21.33 cm⁻¹ is 4.523 ± 0.282 MJy/sr');
    expect(saved).toContain('B − A = -378.955 MJy/sr');
    expect(state.evidenceWork.cmb.sources).toEqual(['https://lambda.gsfc.nasa.gov/product/cobe/firas_monopole_spect.html']);
    expect(add().disabled).toBe(true);await click(add());
    expect(state.evidenceWork.cmb.observation).toBe(saved);
    await input(host.querySelector('#universe-cmb-compare-b'),'0');await click(add());
    expect(state.evidenceWork.cmb.observation).toContain('B − A = -182.755 MJy/sr');
    expect(state.evidenceWork.cmb.sources).toHaveLength(1);
    expect(state.evidenceWork.cmb.observation).toContain(saved);
  });

  it('keeps a self-review while inspecting samples and preserves it as a revision when adding the comparison',async()=>{
    await mount({cosmicEvidenceThread:'cmb',selfReviewedEvidence:['cmb'],evidenceWork:{cmb:{prediction:'My prediction',observation:'Earlier observation',explanation:'My reasoning',limitation:'My limit',reviewed:true}}});
    await click(host.querySelector('.uni-comparison-toggle'));await input(host.querySelector('#universe-cmb-compare-b'),'0');
    expect(state.selfReviewedEvidence).toEqual(['cmb']);
    expect(state.evidenceWork.cmb.reviewed).toBe(true);
    await click(host.querySelector('.uni-firas-comparison-actions button'));
    expect(state.selfReviewedEvidence).toEqual([]);
    expect(state.evidenceWork.cmb.reviewed).toBe(false);
    expect(state.evidenceRevisions).toHaveLength(1);
    expect(state.evidenceRevisions[0].text).toContain('Earlier observation');
    expect(state.evidenceRevisions[0].text).not.toContain('FIRAS comparison:');
  });

  it('resets the sample comparison controls with explicit progress reset',async()=>{
    await mount({cosmicEvidenceThread:'cmb',cmbCompareOpen:true,cmbSampleIndex:0,cmbCompareIndex:4});
    await click(byLabel('Reset all Universe Explorer progress'));
    await click(byLabel('Confirm and erase all progress'));await tick();
    expect(state.cmbCompareOpen).toBe(false);
    expect(state.cmbCompareIndex).toBe(9);
    expect(state.cmbSampleIndex).toBe(2);
  });

});

