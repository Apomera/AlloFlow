/* Production-derived tile views. The shared grader/audio boundary is observed;
 * hooks preserve state and effects across renders without loading a browser. */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const repoArg=process.argv.find(x=>x.startsWith('--repo='));
const repo=repoArg?path.resolve(repoArg.slice(7)):process.env.WORD_SOUNDS_REPO||path.resolve(__dirname,'..');
const arg=process.argv.find(x=>x.startsWith('--source='));
const source=fs.readFileSync(arg?path.resolve(arg.slice(9)):path.join(repo,'word_sounds_module.js'),'utf8');
const start=source.includes('    // BEGIN WORD SOUNDS TILE ANSWER LIFECYCLE')?source.indexOf('    // BEGIN WORD SOUNDS TILE ANSWER LIFECYCLE'):source.indexOf('    const OrthographyView = React.memo(');
const end=source.indexOf('    const LetterTraceView = React.memo(',start);
assert.ok(start>=0&&end>start,'Production tile view extraction');
const section=source.slice(start,end);
const realReact=require(path.join(repo,'desktop/web-app/node_modules/react'));
const flatten=(v,out=[])=>{if(Array.isArray(v))v.forEach(x=>flatten(x,out));else if(v&&typeof v==='object'){out.push(v);flatten(v.props?.children,out);}return out;};
function fixture(kind='orthography',overrides={}){
 const hooks=[], timers=[], events=[], calls=[]; let cursor=0,dirty=false,pending=[],nodes=[],unmounted=false;
 const props={data:{word:'cat',correct:'cat',phonemes:['k','a','t'],graphemes:['c','a','t']},
   isMountedRef:{current:true},submissionLockRef:{current:false},advanceEpochRef:{current:4},answerEpoch:4,answerDisabled:false,isEditing:false,
   t:key=>key,ts:()=>'',onUpdateOption(){},onPlayAudio:(...args)=>events.push({kind:'audio',args}),playSound:(...args)=>events.push({kind:'sound',args}),...overrides};
 let attempts=0;
 props.onCheckAnswer=answer=>{calls.push(answer);events.push({kind:'grade',answer});const correct=kind==='mapping'?answer==='correct':answer===props.data.correct;if(correct||attempts>=1||props.probe)props.submissionLockRef.current=true;attempts++;};
 const effect=(fn,deps)=>{const i=cursor++,old=hooks[i];if(!old||!deps||deps.some((v,j)=>!Object.is(v,old.deps[j]))){pending.push(()=>{old?.cleanup?.();const cleanup=fn();hooks[i]={deps,cleanup};});}};
 const React={...realReact,memo:fn=>fn,useRef:value=>{const i=cursor++;return hooks[i]||(hooks[i]={current:value});},useState:initial=>{const i=cursor++;if(!hooks[i])hooks[i]={value:typeof initial==='function'?initial():initial};return[hooks[i].value,value=>{hooks[i].value=typeof value==='function'?value(hooks[i].value):value;dirty=true;}];},useEffect:effect,useLayoutEffect:effect};
 const components=new Function('React','fisherYatesShuffle','Volume2','X','ChevronRight','LETTER_NAME_AUDIO','debugLog','setTimeout','clearTimeout',section+'\nreturn { OrthographyView, SoundMappingView };')(React,x=>x,()=>null,()=>null,()=>null,{},()=>{},(fn,delay)=>{timers.push({fn,delay});return timers.length;},()=>{});
 const render=()=>{assert.equal(unmounted,false);let cycles=0;do{dirty=false;cursor=0;pending=[];nodes=flatten(components[kind==='mapping'?'SoundMappingView':'OrthographyView'](props));pending.forEach(fn=>fn());assert.ok(++cycles<8,'Effects settle');}while(dirty);return api;};
 const api={props,calls,events,timers,render,get nodes(){return nodes;},input(){return nodes.find(n=>n.type==='input');},check(){return nodes.find(n=>n.type==='button'&&n.props['aria-label']==='common.next');},form(){return nodes.find(n=>n.type==='form');},chip(text){const n=nodes.find(n=>n.type==='button'&&n.props['aria-label']==='Select sound '+text);assert.ok(n,'Chip '+text);return n;},slot(index){return nodes.find(n=>n.type==='button'&&new RegExp('^(Empty Slot|Slot) '+(index+1)+'(?:$|:)').test(n.props['aria-label']||''));},type(value){api.input().props.onChange({target:{value}});return render();},place(text){api.chip(text).props.onClick();return render();},unmount(){unmounted=true;hooks.forEach(h=>h?.cleanup?.());},clear(){events.length=0;calls.length=0;},};return render();
}
const event=overrides=>({key:'Enter',preventDefault(){},...overrides});
let passed=0;function group(name,fn){fn();console.log('PASS '+name);passed++;}
group('orthography grades correct answers synchronously and final locks reject edits and duplicate checks',()=>{
 const f=fixture().type(' CAT '),oldInput=f.input(),oldCheck=f.check();oldCheck.props.onClick(event());
 assert.deepEqual(f.calls,['cat']);assert.equal(f.timers.length,0);oldInput.props.onChange({target:{value:'dog'}});oldCheck.props.onClick(event());f.render();
 assert.deepEqual(f.calls,['cat']);assert.equal(f.input().props.value,' CAT ');assert.equal(f.input().props.disabled,true);assert.equal(f.check().props.disabled,true);
});
group('orthography allows an edited retry after one wrong answer but blocks an unchanged duplicate',()=>{
 const f=fixture().type('cot');f.check().props.onClick(event());f.check().props.onClick(event());f.render();f.check().props.onClick(event());
 assert.deepEqual(f.calls,['cot']);assert.equal(f.input().props.disabled,false);f.type('cat');f.check().props.onClick(event());assert.deepEqual(f.calls,['cot','cat']);
});
group('orthography ignores blank input and missing targets',()=>{
 for(const value of ['', '   ','\t\n']){const f=fixture().type(value);assert.equal(f.check().props.disabled,true);f.check().props.onClick(event());assert.deepEqual(f.calls,[]);}
 const f=fixture('orthography',{data:{word:'',correct:''}}).type('cat');f.check().props.onClick(event());assert.deepEqual(f.calls,[]);
});
group('orthography Enter rejects key repeat and composition without submitting the form',()=>{
 const f=fixture().type('cat');for(const extra of [{repeat:true},{isComposing:true},{nativeEvent:{isComposing:true}},{keyCode:229}]){let prevented=false;f.input().props.onKeyDown(event({...extra,preventDefault(){prevented=true;}}));assert.equal(prevented,true);}
 assert.deepEqual(f.calls,[]);f.input().props.onKeyDown(event());assert.deepEqual(f.calls,['cat']);
});
group('orthography input-ref scoring uses the latest synchronous edit even before rerender',()=>{
 const f=fixture(),input=f.input(),check=f.check();input.props.onChange({target:{value:'cat'}});check.props.onClick(event());assert.deepEqual(f.calls,['cat']);
});
group('live parent mount, epoch and final locks reject stale handlers without effects',()=>{
 for(const kind of ['orthography','mapping'])for(const mode of ['mount','epoch','lock']){const f=fixture(kind);if(kind==='orthography')f.type('cat');f.clear();if(mode==='mount')f.props.isMountedRef.current=false;if(mode==='epoch')f.props.advanceEpochRef.current++;if(mode==='lock')f.props.submissionLockRef.current=true;
 if(kind==='orthography'){f.input().props.onChange({target:{value:'dog'}});f.check().props.onClick(event());const tile=f.nodes.find(n=>n.props?.role==='button');tile.props.onClick();}else{f.chip('c').props.onClick();f.slot(0).props.onClick();}
 assert.deepEqual(f.events,[]);assert.deepEqual(f.calls,[]);}
});
group('local child unmount blocks retained handlers even when the modal remains mounted',()=>{
 for(const kind of ['orthography','mapping']){const f=fixture(kind);if(kind==='orthography')f.type('cat');const action=kind==='orthography'?f.check().props.onClick:f.chip('c').props.onClick;f.unmount();action(event());assert.deepEqual(f.calls,[]);assert.deepEqual(f.events,[]);}
});
group('rendered parent-disabled and teacher-editing controls cannot submit or play tile audio',()=>{
 for(const kind of ['orthography','mapping'])for(const extra of [{answerDisabled:true},{isEditing:true},{submissionLockRef:{current:true}}]){const f=fixture(kind,extra);if(kind==='mapping'){for(const n of f.nodes.filter(n=>n.type==='button'&&/^Select sound|^Empty Slot/.test(n.props['aria-label']||'')))assert.equal(n.props.disabled,true);}else if(!extra.isEditing){assert.equal(f.input().props.disabled,true);assert.equal(f.check().props.disabled,true);}
 assert.equal(f.timers.length,0,'No child owns an unscoped startup/grading timer');}
});
group('mapping grades its final placement synchronously and plays no competing final-chip audio',()=>{
 const f=fixture('mapping');f.place('c').place('a');f.clear();f.chip('t').props.onClick();assert.deepEqual(f.calls,['correct']);assert.deepEqual(f.events,[{kind:'grade',answer:'correct'}]);assert.equal(f.timers.length,0);f.render();assert.equal(f.slot(0).props.disabled,true);
});
group('mapping repeated clicks cannot reuse a chip and rapid different chips retain every placement',()=>{
 const f=fixture('mapping'),c=f.chip('c').props.onClick,a=f.chip('a').props.onClick,t=f.chip('t').props.onClick;c();c();a();t();t();assert.deepEqual(f.calls,['correct']);f.render();assert.equal(f.slot(0).props.children,'c');assert.equal(f.slot(1).props.children,'a');assert.equal(f.slot(2).props.children,'t');
});
group('mapping first wrong arrangement remains editable and corrected retry grades exactly once',()=>{
 const f=fixture('mapping');f.place('a').place('c').place('t');assert.deepEqual(f.calls,['incorrect']);assert.equal(f.slot(0).props.disabled,false);f.slot(0).props.onClick();f.slot(1).props.onClick();f.render();f.place('c').place('a');assert.deepEqual(f.calls,['incorrect','correct']);assert.equal(f.slot(0).props.disabled,true);
});
group('mapping final wrong and probe attempts immediately lock retained slot and chip handlers',()=>{
 for(const probe of [false,true]){const f=fixture('mapping',{probe});const oldChip=f.chip('c').props.onClick;f.place('a').place('c').place('t');if(!probe){f.slot(0).props.onClick();f.render();f.place('a');}const expected=probe?1:2;assert.equal(f.calls.length,expected);f.clear();oldChip();f.slot(0).props.onClick();assert.deepEqual(f.events,[]);assert.equal(f.slot(0).props.disabled,true);}
});
group('mapping board edits for the same word clear prior slots and invalidate old handlers',()=>{
 const f=fixture('mapping');f.place('c');const old=f.chip('a').props.onClick;f.props.data={...f.props.data,graphemes:['k','a','t']};f.render();old();assert.equal(f.slot(0).props.children,1);assert.ok(f.chip('k'));assert.equal(f.calls.length,0);f.place('k').place('a').place('t');assert.deepEqual(f.calls,['correct']);
});
group('mapping sizes response slots by graphemes and treats repeated letters as interchangeable',()=>{
 const f=fixture('mapping',{data:{word:'ll',phonemes:['l'],graphemes:['l','l']}});assert.ok(f.slot(1));const choices=f.nodes.filter(n=>n.type==='button'&&n.props['aria-label']==='Select sound l');choices[1].props.onClick();choices[0].props.onClick();assert.deepEqual(f.calls,['correct']);
});
group('orthography edited boards clear answers and invalidate retained old checks',()=>{
 const f=fixture().type('cat'),old=f.check().props.onClick;f.props.data={word:'dog',correct:'dog'};f.render();old(event());assert.equal(f.input().props.value,'');assert.deepEqual(f.calls,[]);f.type('dog');f.check().props.onClick(event());assert.deepEqual(f.calls,['dog']);
});
group('runtime supplies both tiles the live submission lock, epoch and occurrence keys',()=>{
 for(const name of ['OrthographyView','SoundMappingView']){const a=source.indexOf('React.createElement('+name+', {');const b=source.indexOf('                data:',a);assert.ok(a>=0&&b>a);const props=source.slice(a,b);assert.match(props,/key: JSON\.stringify\(\[advanceEpochRef\.current, currentWordIndex, currentWordSoundsWord/);assert.match(props,/submissionLockRef,/);assert.match(props,/advanceEpochRef,/);assert.match(props,/answerEpoch: advanceEpochRef\.current/);assert.match(props,/answerDisabled: isMinimized \|\| showReviewPanel \|\| showSessionComplete \|\| showProbeResults \|\| submissionLockRef\.current/);}
});
console.log(`PASS ${passed} tile answer lifecycle regression groups`);
