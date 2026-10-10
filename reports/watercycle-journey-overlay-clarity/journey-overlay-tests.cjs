/* Read-only focused tests for the real Explorer Journey presentation helpers. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const sourcePath = arg('source');
if (!sourcePath) throw new Error('Use --source ABSOLUTE_CANDIDATE_PATH [--manifest PATH] [--baseline PATH]');
assert(path.isAbsolute(sourcePath), 'The source path must be explicit and absolute.');
const reportDir = __dirname;
const baselinePath = arg('baseline', path.join(reportDir, 'baseline-runtime.js'));
const manifestPath = arg('manifest', path.join(reportDir, 'presentation-changes.json'));
const receiptPath = arg('receipt');
if (receiptPath) assert(!fs.existsSync(receiptPath), 'Use a fresh receipt path; preserve earlier evidence.');
const sourceBytes = fs.readFileSync(sourcePath);
const source = sourceBytes.toString('utf8');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
let passed = 0;
const testResults = [];
function receipt(success) {
  return { completed: true, successful: success, pid: process.pid, passed, tests: testResults,
    sourcePath, sourceSha256: sha(sourceBytes), sourceBytes: sourceBytes.length,
    testPath: __filename, testSha256: sha(fs.readFileSync(__filename)),
    baselinePath, baselineSha256: sha(fs.readFileSync(baselinePath)),
    manifestPath, manifestSha256: sha(fs.readFileSync(manifestPath)) };
}
function saveReceipt(success) { if (receiptPath) fs.writeFileSync(receiptPath, JSON.stringify(receipt(success), null, 2) + '\n'); }
function test(name, fn) {
  try { fn(); passed++; testResults.push({name,passed:true}); process.stdout.write('PASS ' + name + '\n'); }
  catch (error) { testResults.push({name,passed:false,error:error.message}); saveReceipt(false); process.stdout.write('FAIL ' + name + '\n'); throw error; }
}
function region(start, end) {
  const from = source.indexOf(start);
  assert(from >= 0, 'Missing source marker: ' + start);
  assert(source.indexOf(start, from + start.length) < 0, 'Ambiguous source marker: ' + start);
  const to = source.indexOf(end, from + start.length);
  assert(to > from, 'Missing end marker: ' + end);
  return source.slice(from, to);
}
const helperSource = region('function wcLayoutJourneyCards2d', 'function drawPhysicalTimeGlyph2d');
const helpers = new Function(helperSource + '\nreturn { layout: wcLayoutJourneyCards2d, draw: wcDrawJourneyCard2d, snapshot: wcJourneyPaintSnapshot2d, leader: wcDrawStageLabelLeader2d };')();
const traces = new Function(region('var MATTER_ENERGY_TRACE = {', '// ── Canvas narration: init') + '\nreturn { matter: MATTER_ENERGY_TRACE, journey: JOURNEY_MATTER_ENERGY_TRACE };')().journey;
const choices = new Function('t', region('var GROUND_CHOICES = [', '// Helper: interpolate along a waypoint path') + '\nreturn GROUND_CHOICES;')((key, fallback) => fallback);
const labels = new Function(region('var JOURNEY_STATE_LABELS = {', '// Auto-advance states') + '\nreturn JOURNEY_STATE_LABELS;')();
const nextMap = new Function(region('var JOURNEY_NEXT = {', '// Shared ground-choice button definitions') + '\nreturn JOURNEY_NEXT;')();
const states = Object.keys(traces);

function mockContext() {
  const stack = [], calls = [];
  const properties = ['font','fillStyle','strokeStyle','lineWidth','globalAlpha','textAlign','textBaseline','lineJoin','lineCap','shadowBlur','shadowColor'];
  const ctx = { font: '9px test', fillStyle: '#abc', strokeStyle: '#def', lineWidth: 4,
    globalAlpha: 0.41, textAlign: 'right', textBaseline: 'alphabetic', lineJoin: 'bevel',
    lineCap: 'square', shadowBlur: 2, shadowColor: '#123', _dash: [3, 2], calls };
  const snapshot = () => Object.fromEntries(properties.map(name => [name, ctx[name]]).concat([['_dash', ctx._dash.slice()]]));
  ctx.snapshot = snapshot;
  ctx.save = () => { stack.push(snapshot()); calls.push({ method: 'save' }); };
  ctx.restore = () => { assert(stack.length > 0, 'restore without save'); Object.assign(ctx, stack.pop()); calls.push({ method: 'restore' }); };
  ctx.measureText = text => {
    const size = parseFloat(String(ctx.font).match(/([\d.]+)px/)?.[1] || 11);
    return { width: Array.from(String(text)).reduce((sum, ch) => sum + (/\s/u.test(ch) ? .28 : /[MW@]/u.test(ch) ? .93 : /[ilI1.,:]/u.test(ch) ? .24 : ch.codePointAt(0) > 0xffff ? 1 : .55) * size, 0) };
  };
  ctx.fillText = function(text, x, y) { calls.push({ method: 'fillText', args: Array.from(arguments), text, x, y, font: ctx.font, fillStyle: ctx.fillStyle, alpha: ctx.globalAlpha }); };
  ctx.setLineDash = dash => { ctx._dash = dash.slice(); calls.push({ method: 'setLineDash', args: dash.slice() }); };
  ctx.getLineDash = () => ctx._dash.slice();
  for (const method of ['beginPath','closePath','moveTo','lineTo','quadraticCurveTo','bezierCurveTo','roundRect','rect','arc','ellipse','fill','stroke','fillRect','strokeRect','clip']) {
    ctx[method] = function(...args) { calls.push({ method, args, fillStyle: ctx.fillStyle, strokeStyle: ctx.strokeStyle, alpha: ctx.globalAlpha }); };
  }
  ctx.stackDepth = () => stack.length;
  return ctx;
}
function overlap(a, b) { return a.x < b.x + b.w - .001 && b.x < a.x + a.w - .001 && a.y < b.y + b.h - .001 && b.y < a.y + a.h - .001; }
function normalizedLines(card) { return card.lines.map(line => line.text).join(' ').replace(/\s+/g, ' ').trim(); }
function layoutCase({cssWidth=320,cssHeight=380,scale=1,state='evaporating',paused=true,progress=.42,blockers=[]}={}) {
  const ctx = mockContext(), before = ctx.snapshot();
  const model = { trace: traces[state], choices, blockers };
  const frozen = JSON.stringify(model);
  const cards = helpers.layout(ctx, cssWidth * scale, cssHeight * scale, scale, state,
    model.trace, labels[state] || state, paused, progress, model.choices, model.blockers);
  assert.deepEqual(ctx.snapshot(), before, 'Layout must restore context properties.');
  assert.equal(ctx.stackDepth(), 0, 'Layout save/restore is balanced.');
  assert.equal(JSON.stringify(model), frozen, 'Layout must not mutate phase, choices, or blockers.');
  assert(Array.isArray(cards), 'Layout returns cards.');
  return { ctx, cards, width: cssWidth * scale, height: cssHeight * scale, scale, state, blockers };
}
function expectBounds(result) {
  for (const card of result.cards) {
    assert([card.x,card.y,card.w,card.h].every(Number.isFinite), 'Finite card geometry: ' + card.id);
    assert(card.w > 0 && card.h > 0, 'Positive card extent: ' + card.id);
    assert(card.x >= -.001 && card.y >= -.001 && card.x + card.w <= result.width + .001 && card.y + card.h <= result.height + .001, 'Card inside canvas: ' + card.id);
    assert(card.lines.length > 0, 'Visible lines: ' + card.id);
    for (const line of card.lines) {
      assert(typeof line.text === 'string' && line.text.length > 0, 'Nonempty text line.');
      assert(line.size >= 11, 'Minimum 11 CSS px type.');
      result.ctx.font = (line.weight || 'normal') + ' ' + line.size * result.scale + 'px sans-serif';
      assert(result.ctx.measureText(line.text).width <= card.w + .001, 'Natural text fits without compression: ' + line.text);
    }
  }
  for (let a=0; a<result.cards.length; a++) for (let b=a+1; b<result.cards.length; b++)
    assert(!overlap(result.cards[a],result.cards[b]), 'Cards must be distinct: ' + result.cards[a].id + '/' + result.cards[b].id);
  for (const card of result.cards) for (const blocker of result.blockers)
    assert(!overlap(card,blocker), 'Card clears chrome: ' + card.id);
}

test('source parses and exposes both actual pure helpers', () => {
  new Function(source);
  assert.equal(typeof helpers.layout, 'function'); assert.equal(typeof helpers.draw, 'function');
});
test('original route hit rectangles and path identifiers remain exact', () => {
  assert.deepEqual(choices.map(({x,y,w,h,state,pathKey}) => ({x,y,w,h,state,pathKey})), [
    {x:.20,y:.63,w:.18,h:.08,state:'river_runoff',pathKey:'runoff'},
    {x:.28,y:.72,w:.18,h:.08,state:'infiltrating',pathKey:'infiltrate'},
    {x:.50,y:.56,w:.18,h:.08,state:'plant_absorb',pathKey:'plant'}]);
});
test('idle produces no parcel or route card', () => assert.deepEqual(layoutCase({state:'idle'}).cards, []));

for (const state of states) {
  test('exact phase science and readable natural text: ' + state, () => {
    const result = layoutCase({state}), parcel = result.cards.find(card => card.id === 'parcel');
    assert(parcel, 'One current-parcel card.');
    assert.equal(result.cards.filter(card => card.id === 'parcel').length, 1);
    const phase = traces[state].phaseFrom === traces[state].phaseTo ? traces[state].phaseFrom : traces[state].phaseFrom + ' → ' + traces[state].phaseTo;
    assert(normalizedLines(parcel).includes(phase), 'Exact authoritative phase description: ' + phase);
    assert(parcel.lines.some(line => line.size >= 12), 'Title is at least 12 CSS px.');
    expectBounds(result);
  });
}
for (const [cssWidth,cssHeight] of [[320,380],[390,380],[1040,520]]) for (const scale of [1,2]) {
  test('narrow/wide and DPR card layout: ' + cssWidth + '@' + scale, () => {
    for (const state of states) {
      const blockers = [{x:8*scale,y:8*scale,w:120*scale,h:50*scale},
        {x:(cssWidth-148)*scale,y:8*scale,w:140*scale,h:58*scale}];
      expectBounds(layoutCase({cssWidth,cssHeight,scale,state,blockers}));
    }
  });
}
test('pause and late progress preserve the complete phase explanation', () => {
  for (const state of states) for (const progress of [0,.29,.31,.8,.999]) {
    const card = layoutCase({state,progress,paused:true}).cards.find(card=>card.id==='parcel');
    const phase = traces[state].phaseFrom === traces[state].phaseTo ? traces[state].phaseFrom : traces[state].phaseFrom + ' → ' + traces[state].phaseTo;
    assert(normalizedLines(card).includes(phase), 'Explanation persists after the legacy fade threshold.');
  }
});
test('animation progress stays bounded and choice/storage completion omit a moving bar', () => {
  for (const progress of [-4,0,.42,1,4,NaN,Infinity]) {
    const parcel = layoutCase({progress}).cards.find(card=>card.id==='parcel');
    assert(Number.isFinite(parcel.progress) && parcel.progress >= 0 && parcel.progress <= 1, 'Finite display fraction.');
    assert(/animation/i.test(normalizedLines(parcel)), 'Progress is explicitly animation progress.');
  }
  for (const state of ['ground_choice','complete']) {
    const parcel = layoutCase({state}).cards.find(card=>card.id==='parcel');
    assert(parcel.progress == null, 'No animated progress bar at ' + state);
  }
});
test('ground choices have R/U/P captions and exact original target anchors', () => {
  const result = layoutCase({state:'ground_choice'}), prefixes = {runoff:'R',infiltrate:'U',plant:'P'};
  for (const choice of choices) {
    const card = result.cards.find(card=>card.id==='route-'+choice.pathKey);
    assert(card, 'Caption for '+choice.pathKey);
    assert(normalizedLines(card).startsWith(prefixes[choice.pathKey]), 'Correct keyboard prefix.');
    assert(normalizedLines(card).includes(choice.label), 'Full translated route name is retained.');
    assert.equal(card.anchorX,(choice.x+choice.w/2)*result.width);
    assert.equal(card.anchorY,(choice.y+choice.h/2)*result.height);
  }
  assert.equal(result.cards.filter(card=>card.id.startsWith('route-')).length,3);
  for(const state of states.filter(state=>state!=='ground_choice'))
    assert(!layoutCase({state}).cards.some(card=>card.id.startsWith('route-')),'Route captions only during choice.');
});
test('drawing balances the context and uses opaque plates and natural foreground text', () => {
  for (const scale of [1,2]) for (const state of states) {
    const result=layoutCase({scale,state}), ctx=mockContext(), before=ctx.snapshot();
    for(const card of result.cards) helpers.draw(ctx,card,scale);
    assert.deepEqual(ctx.snapshot(),before,'Draw restores every context property.');
    assert.equal(ctx.stackDepth(),0);
    const textCalls=ctx.calls.filter(call=>call.method==='fillText');
    assert(textCalls.length>=result.cards.reduce((sum,card)=>sum+card.lines.length,0));
    for(const call of textCalls) {
      assert.equal(call.args.length,3,'Do not compress text with maxWidth.');
      assert(['#f8fafc','#d7edf5'].includes(call.fillStyle),'Known high-contrast text ground.');
      assert.equal(call.alpha,1,'No fading of the explanation.');
      assert(parseFloat(call.font.match(/([\d.]+)px/)?.[1])>=11*scale,'DPR-scaled readable font.');
    }
    assert(ctx.calls.some(call=>['fill','fillRect'].includes(call.method)&&call.fillStyle==='#071c2c'&&call.alpha===1),'Opaque dark plates.');
  }
});
test('layout remains deterministic and does not consume model progress', () => {
  const first=layoutCase({state:'ground_choice',progress:.42}), second=layoutCase({state:'ground_choice',progress:.42});
  assert.deepEqual(first.cards,second.cards);
});
test('upper free lane clears a lower HUD that blocks every downward candidate', () => {
  for (const scale of [1,2]) {
    const occupied=[{x:20*scale,y:280*scale,w:280*scale,h:100*scale}];
    const api=new Function('dpr','cH','wcCanvasChromeRects2d',
      region('function wcRectsOverlap2d(', 'function wcWrapEvidenceText2d(').replace('function wcRectsOverlap2d(', 'var wcLabelRects2d = [];\nfunction wcRectsOverlap2d(') + '\nreturn { place: wcPlaceLabelY2d, rects: wcLabelRects2d };')
      (scale,380*scale,()=>occupied);
    const original={x:40*scale,y:310*scale,w:200*scale,h:24*scale};
    const y=api.place(original.x,original.y,original.w,original.h);
    const actual={...original,y};
    assert(y<original.y,'Uses available upper lane instead of colliding fallback.');
    assert(y>=6*scale,'Keeps upper inset.');
    assert(!occupied.some(rect=>overlap(actual,rect)),'Label clears lower card.');
    assert.deepEqual(api.rects,[actual],'Reserves actual relocated geometry.');
  }
});
function placementApi(scale, chrome) {
  return new Function('dpr','cH','wcCanvasChromeRects2d',
    'var wcLabelRects2d = [];\n'+region('function wcRectsOverlap2d(', 'function wcWrapEvidenceText2d(')+'\nreturn { place:wcPlaceLabelY2d,rects:wcLabelRects2d };')
    (scale,380*scale,()=>chrome);
}
test('nearest vertical lane uses the closer upper gap before a farther downward gap', () => {
  for(const scale of [1,2]) {
    const blocker={x:20*scale,y:90*scale,w:100*scale,h:40*scale};
    const api=placementApi(scale,[blocker]);
    const y=api.place(30*scale,100*scale,50*scale,10*scale);
    assert.equal(y,80*scale,'20px upward lane must win over 30px downward lane.');
    assert.deepEqual(api.rects,[{x:30*scale,y:80*scale,w:50*scale,h:10*scale}]);
  }
});
test('nearest lane preserves the desired location and has a stable downward tie break', () => {
  for(const scale of [1,2]) {
    const empty=placementApi(scale,[]);
    assert.equal(empty.place(30*scale,100*scale,50*scale,10*scale),100*scale,'No arbitrary move when requested position is free.');
    const tied=placementApi(scale,[{x:20*scale,y:90*scale,w:100*scale,h:30*scale}]);
    assert.equal(tied.place(30*scale,100*scale,50*scale,10*scale),120*scale,'Equal-distance lanes retain a stable down/up order.');
  }
});
test('stage label leader connects the semantic origin to the closest plate edge without arrowheads', () => {
  for(const scale of [1,2]) for(const [x,y,edgeX,edgeY] of [[20,100,40,100],[160,100,140,100],[90,60,90,80],[90,140,90,120],[20,60,40,80],[160,140,140,120]]) {
    const ctx=mockContext(),before=ctx.snapshot(),box={x:40*scale,y:80*scale,w:100*scale,h:40*scale},boxBefore={...box};
    helpers.leader(ctx,box,x*scale,y*scale,scale);
    assert.deepEqual(ctx.snapshot(),before,'Leader restores context.');
    assert.equal(ctx.stackDepth(),0);
    assert.deepEqual(box,boxBefore,'Leader leaves plate geometry unchanged.');
    const moves=ctx.calls.filter(call=>call.method==='moveTo'), lines=ctx.calls.filter(call=>call.method==='lineTo'), arcs=ctx.calls.filter(call=>call.method==='arc');
    assert.deepEqual(moves.map(call=>call.args),[[x*scale,y*scale]],'Exact original semantic anchor.');
    assert.deepEqual(lines.map(call=>call.args),[[edgeX*scale,edgeY*scale]],'Closest point on the plate edge.');
    assert.equal(arcs.length,1,'One origin dot.');
    assert.deepEqual(arcs[0].args,[x*scale,y*scale,1.8*scale,0,Math.PI*2]);
    assert.equal(ctx.calls.filter(call=>call.method==='stroke').length,1,'Only one open connector stroke.');
    assert(!ctx.calls.some(call=>['closePath','bezierCurveTo','quadraticCurveTo'].includes(call.method)),'A leader has no arrowhead or second path.');
    assert(edgeX*scale>=box.x&&edgeX*scale<=box.x+box.w&&edgeY*scale>=box.y&&edgeY*scale<=box.y+box.h,'Connector terminates on bounded plate.');
  }
});
test('stage label leader remains quiet when the semantic origin is inside or close to its plate', () => {
  for(const scale of [1,2]) for(const [x,y] of [[90,100],[40,100],[36,100],[140,125]]) {
    const ctx=mockContext(),before=ctx.snapshot();
    helpers.leader(ctx,{x:40*scale,y:80*scale,w:100*scale,h:40*scale},x*scale,y*scale,scale);
    assert.deepEqual(ctx.snapshot(),before);
    assert.equal(ctx.calls.length,0,'Do not add an unnecessary visual mark.');
  }
});
test('lookahead matches the existing progression gate including transition states and speed fallback', () => {
  const actualStep=new Function('canvasEl','journey','JOURNEY_NEXT',
    region('function advanceJourneyFrame()', '// ── Keep canvas labels clear') + '\nadvanceJourneyFrame(); return {state:canvasEl.dataset.journeyState,progress:journey.progress};');
  const frozen=JSON.stringify(nextMap);
  for(const state of states) for(const progress of [0,.31,.8,.988,.999]) for(const speed of [.5,1,2,0,-1,NaN,Infinity]) for(const paused of [true,false]) {
    const predicted=helpers.snapshot(state,progress,paused,speed,nextMap);
    const actual=actualStep({dataset:{journeyState:state,journeyPaused:String(paused),journeySpeed:String(speed)}},{state,progress,particleTrail:[]},nextMap);
    assert.deepEqual(predicted,actual,'Same gate for '+JSON.stringify({state,progress,speed,paused}));
  }
  assert.equal(JSON.stringify(nextMap),frozen,'Lookahead does not mutate next-state map.');
});
test('choice and completion transition-frame cards reserve the actual foreground geometry', () => {
  const prepare=new Function('ctx','cW','cH','dpr','canvasEl','journey','JOURNEY_NEXT','JOURNEY_MATTER_ENERGY_TRACE','JOURNEY_STATE_LABELS','GROUND_CHOICES','wcCanvasChromeRects2d','interpPath','wcMotionReduced','wcReserveLabelRect2d',
    helperSource+'\nwcPrepareJourneyPlates2d(); return wcJourneyPlates2d;');
  for(const [state,expected] of [['precipitating','ground_choice'],['river_runoff','complete'],['condensing','precipitating']]) {
    const journey={state,progress:.999,particleTrail:[]}, canvas={dataset:{journeyState:state,journeyPaused:'false',journeySpeed:'1',wc2dPaused:'false'}};
    const before=JSON.stringify({journey,canvas}), reserved=[], ctx=mockContext();
    const cards=prepare(ctx,320,380,1,canvas,journey,nextMap,traces,labels,choices,()=>[],()=>({x:.5,y:.5}),false,(x,y,w,h)=>reserved.push({x,y,w,h}));
    assert.equal(JSON.stringify({journey,canvas}),before,'Reservation must not advance the actual parcel.');
    const expectedCards=layoutCase({state:expected,progress:0,paused:false}).cards;
    assert.equal(normalizedLines(cards.find(card=>card.id==='parcel')),normalizedLines(expectedCards.find(card=>card.id==='parcel')),'Reserves next-frame state text.');
    for(const card of cards) assert(reserved.some(rect=>rect.x===card.x&&rect.y===card.y&&rect.w===card.w&&rect.h===card.h),'Actual plate extent is reserved.');
    if(expected==='ground_choice') for(const choice of choices)
      assert(reserved.some(rect=>rect.x===choice.x*320&&rect.y===choice.y*380&&rect.w===choice.w*320&&rect.h===choice.h*380),'Original route hit zone is reserved.');
  }
});
test('manifest reversal restores every nonpresentation byte to the fresh baseline', () => {
  const baselineBytes=fs.readFileSync(baselinePath), manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
  const changes=Array.isArray(manifest)?manifest:manifest.changes||manifest.replacements||manifest.slices;
  assert(Array.isArray(changes)&&changes.length>0,'Explicit presentation replacements.');
  let restored=source;
  for(const change of changes) {
    assert.equal(typeof change.original,'string','Original slice exists.');
    assert.equal(typeof change.replacement,'string','Replacement slice exists.');
    const first=restored.indexOf(change.replacement);
    assert(first>=0,'Replacement present: '+change.id);
    assert(restored.indexOf(change.replacement,first+change.replacement.length)<0,'Replacement is unique: '+change.id);
    restored=restored.slice(0,first)+change.original+restored.slice(first+change.replacement.length);
  }
  assert.deepEqual(Buffer.from(restored),baselineBytes,'Only explicitly reviewed presentation slices changed.');
});
saveReceipt(true);
process.stdout.write(JSON.stringify(receipt(true))+'\n');
