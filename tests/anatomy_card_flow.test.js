import fs from 'node:fs';
import {beforeEach, describe, expect, it} from 'vitest';
import {loadTool, makeCtx, renderTool, resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const paths = ['stem_lab/stem_tool_anatomy.js', 'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'];
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const match = find(child, predicate); if (match) return match; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
function text(node) { return node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(text).join(' ') : text(node.props?.children); }
function session(file, extra = {}) {
  const tool = loadTool(file, 'anatomy');
  let data = {anatomy:{_activeTab:'flashcards',system:'skeletal',view:'anterior',complexity:1,_structureNotes:{femur:'Keep this note'},...extra}};
  const render = () => tool.render(makeCtx({toolData:data,setToolData:update=>{data=typeof update==='function'?update(data):update;}}));
  const node = predicate => {const found=find(render(),predicate);expect(found).not.toBeNull();return found;};
  return {
    data:()=>data.anatomy,
    patch:patch=>{data={anatomy:{...data.anatomy,...patch}};},
    click:label=>node(n=>n.type==='button'&&(text(n).trim()===label||n.props['aria-label']===label)).props.onClick(),
    action:value=>node(n=>n.props?.['data-anatomy-round-next']===value).props.onClick(),
    html:()=>{const root=document.createElement('div');root.innerHTML=renderTool('anatomy',data);return root;},
  };
}
function finish(s, ratings) {
  const count=Number(s.html().querySelector('[role=progressbar][aria-label="Cards rated this round"]').getAttribute('aria-valuemax'));
  for(let i=0;i<count;i++) {s.click('Reveal function');s.click(ratings[i]||'OK Got it');if(i<count-1)s.click('Next flashcard');}
  return count;
}
beforeEach(resetStemLab);

for(const file of paths) describe('Clear anatomy card flow: '+file,()=>{
  it('distinguishes card position from ratings and keeps the structure name on the answer',()=>{
    const s=session(file);
    expect(s.html().querySelector('[data-anatomy-round-rated]').textContent).toContain('0 / 6');
    s.click('Next flashcard');
    expect(s.html().querySelector('[aria-label="Flashcard progress"]').textContent).toBe('2/6');
    expect(s.html().querySelector('[role=progressbar][aria-label="Cards rated this round"]').getAttribute('aria-valuenow')).toBe('0');
    s.click('Reveal function');
    expect(s.html().querySelector('.anatomy-card-answer-name').textContent).toContain('Ribs');
    s.click('~ Learning');s.click('~ Learning');
    expect(s.html().querySelector('[data-anatomy-round-rated]').textContent).toContain('1 / 6');
    expect(s.html().querySelector('[data-anatomy-card-completion]')).toBeNull();
  });
  it('opens the chosen structure for recall while retaining the round, ratings and notes',()=>{
    const s=session(file);s.click('Reveal function');s.click('~ Learning');
    const deck=s.data()._flashcardDeck.slice();
    s.click('Explore');s.patch({selectedStructure:'femur'});s.click('Practice this structure');
    expect(s.data()).toMatchObject({_activeTab:'flashcards',selectedStructure:'femur',_flashcardFlipped:false,_flashcardScope:'all',_flashcardRoundRated:{skull:true},_structureNotes:{femur:'Keep this note'}});
    expect(s.data()._flashcardDeck).toEqual(deck);
    expect(s.data()._flashcardIdx).toBe(deck.indexOf('femur'));
    s.click('Explore');s.click('Cards');
    expect(s.html().querySelector('[data-anatomy-recall-card]').dataset.anatomyRecallCard).toBe('femur');
    expect(s.data()._flashcardRoundRated).toEqual({skull:true});
  });
  it('summarizes self-ratings and starts a focused review without losing the completed all-structures round',()=>{
    const s=session(file);const count=finish(s,['! Need practice','~ Learning']);
    const complete=s.html().querySelector('[data-anatomy-card-completion]');
    expect(complete.textContent).toContain('self-ratings');
    for(const [id,value] of [['practice',1],['learning',1],['mastered',count-2]])expect(complete.querySelector('[data-anatomy-round-rating="'+id+'"] dd').textContent).toBe(String(value));
    expect(s.html().querySelector('[data-anatomy-next-unrated]').disabled).toBe(true);
    s.action('review');
    expect(s.data()._flashcardDeck).toEqual(['skull']);
    expect(s.data()._flashcardRoundRated).toEqual({});
    expect(s.html().querySelector('[data-anatomy-card-completion]')).toBeNull();
    s.click('All structures');
    expect(s.html().querySelector('[data-anatomy-card-completion]')).not.toBeNull();
    expect(Object.keys(s.data()._flashcardRoundRated)).toHaveLength(count);
    expect(s.data()._structureNotes.femur).toBe('Keep this note');
  });
  it('continues to quiz after rating the deck and resumes the completed cards afterward',()=>{
    const s=session(file);const count=finish(s,[]);s.action('quiz');
    expect(s.data()).toMatchObject({_activeTab:'quiz',quizMode:true,_structureNotes:{femur:'Keep this note'}});
    s.click('Cards');
    expect(Object.keys(s.data()._flashcardRoundRated)).toHaveLength(count);
    expect(s.html().querySelector('[data-anatomy-card-completion]')).not.toBeNull();
    s.click('Refresh round');
    expect(s.data()._flashcardRoundRated).toEqual({});
    expect(s.data()._structureConfidence.femur).toBe('mastered');
  });
  it('does not present an empty review deck as a completed round',()=>{
    const s=session(file,{_flashcardScope:'review'});
    expect(s.html().textContent).toContain('No cards are due for review');
    expect(s.html().querySelector('[data-anatomy-card-completion]')).toBeNull();
    expect(s.html().querySelector('.anatomy-card-round-meter')).toBeNull();
  });
});

describe('Card flow translations',()=>{
  const source=fs.readFileSync(paths[0],'utf8');
  const entries=[...source.matchAll(/t\('stem\.anatomy\.(card_flow_[^']+)', '([^']*)'\)/g)];
  for(const lang of ['french','spanish_latin_america','arabic'])it(lang+' includes each new label and preserves placeholders',()=>{
    const file='lang/'+lang+'.js',raw=fs.readFileSync(file,'utf8'),anatomy=JSON.parse(raw).stem.anatomy;
    for(const [,key,english] of entries){expect(anatomy[key],key).toBeTruthy();expect(anatomy[key],key).not.toBe(english);expect(anatomy[key].match(/\{\w+\}/g)||[]).toEqual(english.match(/\{\w+\}/g)||[]);}
    expect(fs.readFileSync('desktop/web-app/public/'+file,'utf8')).toBe(raw);
  });
});
