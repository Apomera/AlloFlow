'use strict';
// Saved-evidence verifier. It launches no browser, test runner, or server.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const acorn = require(path.join(root, 'node_modules/acorn'));
const reportDir = path.relative(root, __dirname).replace(/\\/g, '/');
const local = name => reportDir + '/' + name;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const resolve = name => {
  const target = path.resolve(root, name);
  if (!target.startsWith(root + path.sep)) throw new Error('Input outside repository: ' + name);
  return target;
};
const bytes = name => fs.readFileSync(resolve(name));
const json = name => JSON.parse(bytes(name));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const validTime = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
if (process.argv.includes('--inspect')) {
  for (const name of fs.readdirSync(__dirname).filter(name => /(?:results|receipt|closure).*\.json$/.test(name))) {
    const value = json(local(name));
    console.log(name, JSON.stringify({ keys: Object.keys(value), mode: value.mode, successful: value.successful, completed: value.completed, sourceSha256: value.sourceSha256, checks: value.checks?.length, captures: value.captures?.length, audits: value.audits?.length, cases: value.mode !== 'baseline' && value.cases && [...new Set(value.cases.map(item => item.context))].map(context => { const item = value.cases.find(item => item.context === context); return {...item,text:Array.isArray(item.text)?{count:item.text.length,minimumFont:Math.min(...item.text.map(item=>item.fontSize)),minimumContrast:Math.min(...item.text.map(item=>item.minimumContrast))}:item.text,controls:item.controls?.slice(0,1),svgs:item.svgs&&{count:item.svgs.length},summaryFacts:item.summaryFacts?.slice(0,1)}; }), nativeActions: value.nativeActions && [...new Set(value.nativeActions.map(item=>item.kind))].map(kind=>value.nativeActions.find(item=>item.kind===kind)), receipt: value.sourceBefore ? value : undefined }));
  }
  process.exit(0);
}
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.type === 'string') visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(item => walk(item, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
}
function tokens(source) {
  const reader = acorn.tokenizer(source, { ecmaVersion: 'latest' }), result = [];
  for (;;) {
    const token = reader.getToken();
    if (token.type.label === 'eof') return result;
    result.push([token.type.label, token.value === undefined ? null : token.value]);
  }
}
function preservation(baseline, candidate) {
  const oldAst = acorn.parse(baseline, { ecmaVersion: 'latest' }), ast = acorn.parse(candidate, { ecmaVersion: 'latest' });
  const find = (scope, predicate, label) => {
    const found = []; walk(scope, node => { if (predicate(node)) found.push(node); });
    if (found.length !== 1) throw new Error(label + ' must be unique: ' + found.length);
    return found[0];
  };
  const prop = (node, key) => node && node.type === 'ObjectExpression' ? node.properties.find(item => item.key && (item.key.name || item.key.value) === key) : undefined;
  const element = node => node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && node.callee.object.name === 'React' && node.callee.property.name === 'createElement';
  const firstLiteral = value => value && value.type === 'Literal' ? value.value : value && value.type === 'BinaryExpression' ? firstLiteral(value.left) : null;
  const byClass = (scope, name) => find(scope, node => element(node) && firstLiteral(prop(node.arguments[1], 'className')?.value) === name, name);
  const byId = (scope, name) => find(scope, node => element(node) && prop(node.arguments[1], 'id')?.value.value === name, name);
  const child = (scope, tag) => find(scope, node => element(node) && node.arguments[0].value === tag, tag);
  const edits = [], boundaries = {};
  const edit = (label, node, prior) => { boundaries[label] = (boundaries[label] || 0) + 1; edits.push({ start: node.start, end: node.end, text: prior ? baseline.slice(prior.start, prior.end) : '' }); };
  for (const name of ['WCLiveTransferStory', 'WC_LIVE_TRANSFER_STYLE', 'wcLiveTransfer']) {
    const declaration = find(ast, node => node.type === 'VariableDeclaration' && node.declarations.some(item => item.id.name === name), name);
    if (declaration.declarations.length !== 1) throw new Error(name + ' shares a prior statement');
    edit(name, declaration);
  }
  for (const name of ['ltWaterSymbol', 'renderWcLiveWaterTransfer', 'renderWcLiveHeatPath']) edit(name, find(ast, node => node.type === 'FunctionDeclaration' && node.id.name === name, name));
  for (const name of ['drawMatterEnergyEvidence2d', 'drawFlowChevrons2d', 'drawPhysicalTimeGlyph2d']) {
    const current = find(ast, node => node.type === 'FunctionDeclaration' && node.id.name === name, name);
    const prior = find(oldAst, node => node.type === 'FunctionDeclaration' && node.id.name === name, 'prior ' + name);
    edit('scene:' + name, current.body, prior.body);
  }
  const oldFocus = byId(oldAst, 'wcStageFocusDescription'), focus = byId(ast, 'wcStageFocusDescription');
  edit('focusClass', prop(focus.arguments[1], 'className').value, prop(oldFocus.arguments[1], 'className').value);
  const process = prop(focus.arguments[1], 'data-lt-process');
  if (!process || candidate.slice(process.end).match(/^\s*,/) === null) throw new Error('Process attribute boundary missing');
  boundaries.processAttribute = 1; edits.push({ start: process.start, end: process.end + candidate.slice(process.end).match(/^\s*,/)[0].length, text: '' });
  edit('focusLabel', child(byClass(focus, 'wc-stage-focus-title'), 'strong'), child(byClass(oldFocus, 'wc-stage-focus-title'), 'strong'));
  edit('focusSummary', byClass(focus, 'wc-stage-focus-summary'), byClass(oldFocus, 'wc-stage-focus-summary'));
  edit('waterFigure', find(focus, node => node.type === 'CallExpression' && node.callee.name === 'renderWcLiveWaterTransfer', 'water figure append'), byClass(oldFocus, 'wc-stage-focus-flow'));
  const story = byClass(focus, 'wc-science-story'), oldStory = byClass(oldFocus, 'wc-science-story');
  edit('storyAria', prop(story.arguments[1], 'aria-label').value, prop(oldStory.arguments[1], 'aria-label').value);
  edit('storyHeading', find(story, node => node.type === 'Literal' && node.value === 'Water state', 'water state heading'), find(oldStory, node => node.type === 'Literal' && node.value === 'Water changes', 'prior water heading'));
  edit('storyCue', find(story, node => element(node) && prop(node.arguments[1], 'data-lt-cue')?.value.value === 'story', 'story cue'), find(oldStory, node => element(node) && node.arguments[0].value === 'strong' && node.arguments[2]?.type === 'LogicalExpression' && node.arguments[2].left.name === 'currentStageCue', 'prior story cue'));
  edit('heatPath', find(focus, node => node.type === 'CallExpression' && node.callee.name === 'renderWcLiveHeatPath', 'heat path append'), find(oldFocus, node => node.type === 'MemberExpression' && node.object.name === 'currentMatterEnergy' && node.property.name === 'energyLabel', 'prior energy label'));
  const data = byClass(ast, 'wc-data-view wc-focus-secondary wc-live-data'), oldData = byClass(oldAst, 'wc-data-view wc-focus-secondary');
  edit('dataClass', prop(data.arguments[1], 'className').value, prop(oldData.arguments[1], 'className').value);
  const row = scope => find(scope, node => element(node) && node.arguments[0].value === 'tr' && node.arguments.some(item => element(item) && item.arguments[0].value === 'th' && item.arguments[2]?.value === 'Current process'), 'current process row');
  edit('dataLabel', child(row(data), 'strong'), child(row(oldData), 'strong'));
  edit('dataCue', child(row(data), 'span'), child(row(oldData), 'span'));
  const status = find(ast, node => node.type === 'VariableDeclarator' && node.id.name === 'wcDataViewStatus', 'data status');
  edit('dataStatus', find(status, node => node.type === 'MemberExpression' && node.object.name === 'wcLiveTransfer' && node.property.name === 'label', 'data status label'), find(find(oldAst, node => node.type === 'VariableDeclarator' && node.id.name === 'wcDataViewStatus', 'prior data status'), node => node.type === 'Identifier' && node.name === 'currentStageLabel', 'prior data status label'));
  edit('dataStatusPunctuation', find(status, node => node.type === 'Literal' && node.value === '. ', 'neutral data status punctuation'), find(find(oldAst, node => node.type === 'VariableDeclarator' && node.id.name === 'wcDataViewStatus', 'prior data status'), node => node.type === 'Literal' && node.value === ' selected. ', 'prior selected wording'));
  const canvas = scope => find(scope, node => element(node) && node.arguments[0].value === 'canvas' && prop(node.arguments[1], 'aria-label') && (() => { let match = false; walk(prop(node.arguments[1], 'aria-label').value, item => { if (item.type === 'Identifier' && item.name === 'immersiveStageLabel') match = true; }); return match; })(), 'journey canvas');
  edit('canvasAria', prop(canvas(ast).arguments[1], 'aria-label').value, prop(canvas(oldAst).arguments[1], 'aria-label').value);
  const canvas2d = scope => find(scope, node => element(node) && node.arguments[0].value === 'canvas' && firstLiteral(prop(node.arguments[1], 'aria-label')?.value) === 'Water cycle animation showing ', '2D canvas');
  edit('canvas2dAria', prop(canvas2d(ast).arguments[1], 'aria-label').value, prop(canvas2d(oldAst).arguments[1], 'aria-label').value);
  edits.sort((a, b) => b.start - a.start);
  let restored = candidate, previous = candidate.length;
  for (const item of edits) { if (item.end > previous) throw new Error('Overlapping presentation boundaries'); restored = restored.slice(0, item.start) + item.text + restored.slice(item.end); previous = item.start; }
  const oldTokens = tokens(baseline), retained = tokens(restored);
  const mismatch = oldTokens.findIndex((token, index) => !same(token, retained[index]));
  return { passed: oldTokens.length === retained.length && mismatch === -1, boundaries, baselineTokens: oldTokens.length, candidatePriorTokens: retained.length, mismatch: mismatch === -1 ? null : mismatch, ...(mismatch === -1 ? {} : { mismatchContext: { baseline: oldTokens.slice(mismatch - 8, mismatch + 40), candidate: retained.slice(mismatch - 8, mismatch + 40) } }) };
}
if (process.argv.includes('--review')) {
  const baseline = bytes(local('baseline-runtime.js')), source = bytes('stem_lab/stem_tool_watercycle.js');
  new vm.Script(source.toString('utf8'));
  const review = { baselineSha256: sha(baseline), sourceSha256: sha(source), preservation: preservation(baseline.toString('utf8'), source.toString('utf8')) };
  console.log(JSON.stringify(review, null, 2));
  process.exit(review.preservation.passed ? 0 : 1);
}
const filePin = item => { const data = bytes(item.path); return sha(data) === item.sha256 && data.length === item.bytes; };
const pin = name => { const data = bytes(name); return { path: name, sha256: sha(data), bytes: data.length }; };
const time = value => Date.parse(value);
function contrast(foreground, background) {
  const match = foreground.match(/rgba?\(([^)]+)\)/);
  if (!match || !Array.isArray(background) || background.length !== 3) return NaN;
  const color = match[1].split(',').map(Number), alpha = color.length > 3 ? color[3] : 1;
  const front = color.slice(0, 3).map((value, index) => value * alpha + background[index] * (1 - alpha));
  const lum = values => values.map(value => { value /= 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
  return (Math.max(lum(front), lum(background)) + .05) / (Math.min(lum(front), lum(background)) + .05);
}
function catalog(source) {
  const ast = acorn.parse(source, { ecmaVersion: 'latest' }), declarations = {};
  const names = ['MATTER_ENERGY_TRACE', 'JOURNEY_MATTER_ENERGY_TRACE', 'STAGE_HYDROLOGIC_TIME_TRACE', 'JOURNEY_HYDROLOGIC_TIME_TRACE'];
  walk(ast, node => { if (node.type === 'VariableDeclarator' && names.includes(node.id.name)) { if (declarations[node.id.name]) throw new Error('Duplicate prior trace'); declarations[node.id.name] = source.slice(node.start, node.end); } });
  if (Object.keys(declarations).length !== names.length) throw new Error('Prior trace catalog missing');
  return vm.runInNewContext(names.map(name => 'var ' + declarations[name] + ';').join('\n') + '({stage:MATTER_ENERGY_TRACE,journey:JOURNEY_MATTER_ENERGY_TRACE,stageTime:STAGE_HYDROLOGIC_TIME_TRACE,journeyTime:JOURNEY_HYDROLOGIC_TIME_TRACE})');
}
const result = { checkedAt: new Date().toISOString(), completed: false, successful: false, checks: [], errors: [] };
const check = (label, passed, details) => result.checks.push({ label, passed: Boolean(passed), ...(details === undefined ? {} : { details }) });
function browser(entry, candidateSha, traces) {
  const report = json(entry.path), runtime = bytes(entry.runtimePath), harness = bytes(entry.harnessPath);
  check(entry.path + ' completed and closed', report.completed === true && report.browserClosed === true && report.resourcesClosed === true && report.serverUsed === false && report.serverClosed === true && report.serverClosedAt === null && [report.startedAt, report.browserLaunchedAt, report.browserClosedAt, report.completedAt].every(validTime) && time(report.startedAt) <= time(report.browserLaunchedAt) && time(report.browserLaunchedAt) <= time(report.browserClosedAt) && time(report.browserClosedAt) <= time(report.completedAt));
  check(entry.path + ' actual loaded runtime and frozen executable', report.sourceSha256 === sha(runtime) && report.sourceBytes === runtime.length && report.publicHostSha256 === report.sourceSha256 && report.loadedRuntimeSha256 === report.sourceSha256 && report.loadedRuntimeBytes === runtime.length && report.harnessSha256 === sha(harness));
  check(entry.path + ' retained honest outcome', report.successful === entry.successful && (entry.historical || (report.successful === true && report.checks.every(item => item.passed === true) && report.errors.length === 0 && report.consoleErrors.length === 0)));
  check(entry.path + ' exact PNG captures and chronology', report.captures.length > 0 && report.captures.every(item => { const data = bytes(path.posix.join(path.posix.dirname(entry.path), item.path)); return data.length >= 24 && data.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' && sha(data) === item.sha256 && data.length === item.bytes && data.readUInt32BE(16) === item.width && data.readUInt32BE(20) === item.height && item.sourceSha256 === report.sourceSha256 && validTime(item.capturedAt) && time(report.browserLaunchedAt) <= time(item.capturedAt) && time(item.capturedAt) <= time(report.browserClosedAt); }));
  if (!entry.final) return report;
  check('Final browser loaded current candidate', report.sourceSha256 === candidateSha);
  const displays = report.cases.filter(item => item.context === 'responsive-readout');
  const variants = ['desktop', 'phone320', 'phone390', 'host390', 'dark', 'app-contrast', 'forced-phone'];
  check('Readout and Data measured in all display contexts', variants.every(variant => ['Readout ', 'Data '].every(prefix => displays.some(item => item.label === prefix + variant))));
  for (const variant of variants) {
    const cases = displays.filter(item => item.label === 'Readout ' + variant || item.label === 'Data ' + variant);
    check('Clear text, layout and disclosure target: ' + variant, cases.length === 2 && cases.every(item => !item.pageOverflow && item.scrollWidth <= item.clientWidth + 1 && item.text.length > 0 && item.text.every(text => text.fontSize >= 13 && text.clipped === false) && item.controls.every(control => control.bounds.height >= 43.9 && control.textInside === true)));
    check('Independent measured contrast: ' + variant, cases.every(item => item.text.every(text => text.backgrounds.length > 0 && text.backgrounds.every(background => contrast(text.foreground, background) >= 4.5) && Math.abs(Math.min(...text.backgrounds.map(background => contrast(text.foreground, background))) - text.minimumContrast) < .001)));
  }
  check('Decorative symbols and arrows fit their view boxes', displays.some(item => item.svgs.length > 0) && displays.every(item => item.svgs.every(svg => svg.hidden === 'true' && svg.textCount === 0 && svg.bounds.x >= svg.view.x && svg.bounds.y >= svg.view.y && svg.bounds.x + svg.bounds.width <= svg.view.x + svg.view.width && svg.bounds.y + svg.bounds.height <= svg.view.y + svg.view.height)));
  const views = report.cases.filter(item => item.context === 'live-process-consistency');
  check('All 11 active transfers and six previews covered', Object.keys(traces.journey).every(state => views.some(item => item.active && item.state === state)) && Object.keys(traces.stage).every(stage => views.some(item => !item.active && item.stage === stage)));
  const symbol = label => /vapor/i.test(label) ? 'vapor' : /ice|solid/i.test(label) ? /liquid|droplet|cloud water/i.test(label) ? 'liquid-or-solid' : 'solid' : 'liquid';
  check('Water nodes and storage/choice arrows match frozen prior science', views.length > 0 && views.every(item => {
    const trace = item.active ? traces.journey[item.state] || traces.journey.ocean : traces.stage[item.stage] || traces.stage.collection, water = item.water;
    const kind = item.active && ['ocean', 'complete'].includes(item.state) ? 'storage' : item.active && item.state === 'ground_choice' ? 'choice' : 'transfer';
    return same(trace, item.expectedTrace) && kind === item.expectedKind && water.kind === kind && water.state === (item.active ? item.state : item.stage) && water.nodes.length === (kind === 'storage' ? 1 : 2) && water.nodes[0].place === trace.source && water.nodes[0].phase === trace.phaseFrom && water.nodes[0].symbol === symbol(trace.phaseFrom) && (kind === 'storage' || (water.nodes[1].place === trace.destination && water.nodes[1].phase === trace.phaseTo && water.nodes[1].symbol === symbol(trace.phaseTo))) && water.arrows === (kind === 'transfer' ? 1 : 0) && (kind !== 'choice' || /awaiting/i.test(water.connector));
  }));
  check('Titles, live cues, Data and canvas descriptions agree', views.every(item => item.title === item.expectedLabel && item.data.process === item.expectedLabel && item.dataStatus.startsWith(item.expectedLabel + '. ') && item.canvasLabel.includes(item.expectedLabel) && item.story.includes(item.data.cue) && (!item.active || item.summary === item.data.cue) && (item.water.kind !== 'storage' || /water remains/i.test(item.canvasLabel)) && (item.water.kind !== 'choice' || /awaits your choice/i.test(item.canvasLabel))));
  check('Qualitative heat, driver and physical time remain separate', views.every(item => {
    const trace = item.expectedTrace, physical = item.active ? traces.journeyTime[item.state] || traces.journeyTime.ocean : traces.stageTime[item.stage] || traces.stageTime.collection;
    const fact = term => item.summaryFacts.find(item => item.term === term)?.value || '';
    return item.heat.energy === trace.energyTransfer && item.heat.direction === ({ absorbed: 'into-water', released: 'out-of-water', none: 'not-required' })[trace.energyTransfer] && item.heat.copy.includes(trace.energyLabel) && (trace.energyTransfer !== 'none' || /water can still move, warm or cool/i.test(item.heat.copy)) && fact('Driver') === trace.driver && fact('Physical time').includes(physical.label) && fact('Physical time').includes(physical.caveat) && item.data.rows.find(row => row.label === 'Physical time')?.value.includes('not a physical clock') && item.summaryFacts.every(fact => Object.values(fact.layout).every(value => value === 'block')) && item.heat.layout.readingWidth >= Math.min(100, item.heat.layout.width - 1) && item.heat.labels.every(label => label.fontSize >= 13 && label.display !== 'none');
  }));
  const readOnly = report.nativeActions.filter(item => item.kind === 'read-only-disclosure');
  check('Native Data disclosures preserve learner data and paused pixels', readOnly.length > 0 && readOnly.every(item => item.beforeDataSha256 === item.afterDataSha256 && item.beforeCanvasSha256 === item.afterCanvasSha256 && item.beforeSceneSha256 === item.afterSceneSha256 && item.changedFields.length === 0));
  const allowed = { 'native-stage-preview': ['activeStage', 'stagesViewed'], 'native-route-selection': ['journeyState', 'activeStage', 'journeyPaths', 'journeyLastPath', 'journeyReplayProgress', 'journeyPaused'], 'native-playback-pause': ['journeyPaused'] };
  const intentional = report.nativeActions.filter(item => item.kind !== 'read-only-disclosure');
  check('Existing native controls change only their intended fields', Object.keys(allowed).every(kind => intentional.some(item => item.kind === kind)) && intentional.every(item => { const changed = [...new Set([...Object.keys(item.before), ...Object.keys(item.after)])].filter(key => !same(item.before[key], item.after[key])).sort(); return allowed[item.kind] && same(item.allowedFields.slice().sort(), allowed[item.kind].slice().sort()) && same(changed, item.changedFields.slice().sort()) && changed.every(key => allowed[item.kind].includes(key)) && same(item.awardsBefore, item.awardsAfter); }));
  check('Scoped audits have no violations or unresolved findings', report.audits.length > 0 && report.audits.every(audit => {
    if (audit.violations.length !== 0) return false;
    return audit.incomplete.every(issue => issue.nodes.every(node => audit.manualResolutions.some(resolution => resolution.rule === issue.id && same(resolution.target, node.target) && resolution.html === node.html && resolution.resolved === true && resolution.clipped === false && resolution.backgrounds.length > 0 && resolution.backgrounds.every(background => contrast(resolution.foreground, background) >= 4.5) && Math.abs(Math.min(...resolution.backgrounds.map(background => contrast(resolution.foreground, background))) - resolution.minimumContrast) < .001)));
  }));
  check('Final engine and expected-output checks pass', report.checks.every(item => item.passed === true) && intentional.every(item => item.engine && Object.entries(item.engine).filter(([key]) => /Same$/.test(key)).every(([, value]) => value === true) && item.engine.hooks.every(hook => hook.type === 'function' && hook.same === true)));
  const scenes = report.cases.filter(item => item.context === 'actual-2d-scene');
  check('Native scene evidence covers storage, land choice and precipitation controls', scenes.length === 9 && ['ocean', 'complete', 'ground_choice'].every(state => ['desktop', 'phone320'].every(variant => scenes.some(item => item.label === 'Scene ' + state + '-' + variant))) && scenes.some(item => item.label === 'Scene ground_choice-dark') && scenes.some(item => item.state === 'precipitating') && scenes.some(item => item.label === 'Scene idle-precipitation-desktop'));
  check('Scene recording forwards and restores native methods without changing learner state', scenes.every(item => item.methodsRestored === true && item.dataUnchanged === true && item.awardsUnchanged === true && item.progressUnchanged === true));
  check('Actual storage and choice captions have no transfer arrow or directional lane', scenes.filter(item => item.expectedKind !== 'precipitation').every(item => {
    const storage = item.expectedKind === 'storage', text = item.texts.map(item => item.text).join(' ');
    return ['storage', 'choice'].includes(item.expectedKind) && item.matterEvidenceCue === (storage ? 'ocean-storage' : 'land-pathway-choice') && item.flowCue === (storage ? 'ocean-storage-no-transfer' : 'land-choice-no-transfer') && item.timeLensVisual === (storage ? 'storage-rings' : 'choice-fork') && text.includes(storage ? 'LIQUID WATER IN OCEAN STORAGE' : 'ON LAND — CHOOSE A PATH') && !text.includes('FALLING TRANSPORT') && item.paths.every(path => !path.callers.includes('drawFlowChevrons2d') && !path.callers.includes('evidenceArrow2d'));
  }));
  check('Land choice fork is anchored at the actual parcel', scenes.filter(item => item.expectedKind === 'choice').every(item => {
    const fork = item.paths.find(path => path.operation === 'stroke' && path.callers.includes('drawPhysicalTimeGlyph2d') && path.path.filter(item => item.operation === 'lineTo').length === 3);
    const center = fork?.path.find(item => item.operation === 'lineTo')?.point;
    const parcel = item.paths.find(path => path.operation === 'fill' && path.callers.includes('drawDroplet') && path.color === '#0ea5e9')?.path.find(item => item.operation === 'arc')?.point;
    return center && parcel && Math.abs(center.x - item.width * .34) < .5 && Math.abs(center.y - item.height * .62) < .5 && Math.abs(center.x - parcel.x) < .5 && Math.abs(center.y - parcel.y) < .5;
  }));
  check('Active and remembered precipitation retain falling and directional evidence', scenes.filter(item => item.expectedKind === 'precipitation').length === 2 && scenes.filter(item => item.expectedKind === 'precipitation').every(item => item.matterEvidenceCue === 'process-evidence' && item.flowCue === 'precipitation-directional-chevrons' && item.timeLensVisual === 'transfer-ticks' && item.texts.map(item => item.text).join(' ').includes('GRAVITY — FALLING TRANSPORT') && item.paths.filter(path => path.operation === 'fill' && path.callers.includes('drawFlowChevrons2d')).length === 3 && item.paths.some(path => path.callers.includes('evidenceArrow2d'))));
  return report;
}
function tests(entry, browserReports, candidateSha) {
  const raw = json(entry.raw), receipt = json(entry.receipt), assertions = raw.testResults.flatMap(suite => suite.assertionResults);
  const failedFullRun = entry.mode === 'regression', expectedCount = { unit: 27, regression: 109, 'matter-energy-recheck': 5 }[entry.mode];
  const passed = assertions.filter(item => item.status === 'passed').length, failed = assertions.filter(item => item.status === 'failed').length;
  check(entry.mode + ' complete identities and honest test outcome', expectedCount === entry.count && raw.numTotalTests === expectedCount && assertions.length === expectedCount && raw.numPassedTests === passed && raw.numFailedTests === failed && raw.numPendingTests === 0 && raw.numTodoTests === 0 && passed + failed === expectedCount && (failedFullRun ? raw.success === false && passed === 108 && failed === 1 : raw.success === true && passed === expectedCount && failed === 0) && new Set(assertions.map(item => item.fullName)).size === assertions.length);
  check(entry.mode + ' native runner receipt and chronology', receipt.mode === entry.mode && receipt.expectedSha === candidateSha && receipt.exitCode === (failedFullRun ? 1 : 0) && receipt.complete === !failedFullRun && receipt.signal === null && receipt.preserved === true && validTime(receipt.startedAt) && validTime(receipt.completedAt) && time(receipt.startedAt) <= time(receipt.completedAt) && Number.isInteger(receipt.runnerPid) && Number.isInteger(receipt.childPid) && browserReports.every(report => time(report.completedAt) < time(receipt.startedAt)));
  check(entry.mode + ' exact before/after source and test files', same(receipt.sourceBefore, receipt.sourceAfter) && same(receipt.testsBefore, receipt.testsAfter) && receipt.sourceBefore.every(item => item.sha256 === candidateSha && filePin(item)) && receipt.testsBefore.every(filePin) && same(receipt.testsBefore.map(item => item.path), entry.testPaths));
  check(entry.mode + ' frozen runner, raw results and log', filePin(receipt.recipe) && (entry.mode === 'matter-energy-recheck' || filePin(receipt.baseline)) && filePin(receipt.results) && filePin(receipt.log) && receipt.results.path === entry.raw && receipt.log.path === entry.log && receipt.summary.success === raw.success && receipt.summary.total === assertions.length && receipt.summary.passed === passed && receipt.summary.failed === failed && receipt.summary.pending === 0);
  check(entry.mode + ' explicit sequential single-worker command', receipt.command.args.includes('--maxWorkers=1') && receipt.command.args.includes('--no-file-parallelism') && entry.testPaths.every(name => receipt.command.args.includes(name)));
  if (entry.mode === 'unit') {
    const loaded = json(entry.loaded);
    check('Focused tests actually loaded the frozen runtime, baseline and test', filePin(receipt.loadedRuntime) && receipt.loadedRuntime.path === entry.loaded && loaded.loadedRuntimes.every(filePin) && same(loaded.loadedRuntimes, receipt.sourceBefore) && filePin(loaded.loadedTest) && same(loaded.loadedTest, receipt.testsBefore[0]) && filePin(loaded.loadedBaseline) && same(loaded.loadedBaseline, receipt.baseline) && Number.isInteger(loaded.pid) && validTime(loaded.loadedAt) && validTime(loaded.completedAt) && time(receipt.startedAt) <= time(loaded.loadedAt) && time(loaded.loadedAt) <= time(loaded.completedAt) && time(loaded.completedAt) <= time(receipt.completedAt));
  }
  const cases = raw.testResults.flatMap(suite => suite.assertionResults.map(item => ({ file: path.relative(root, suite.name).replace(/\\/g, '/'), fullName: item.fullName, status: item.status, duration: item.duration })));
  if (entry.mode === 'matter-energy-recheck') {
    check('Recheck preserves the unchanged fixture and exact case identities', same(receipt.fixturesBefore, receipt.fixturesAfter) && receipt.fixturesBefore.length > 0 && receipt.fixturesBefore.every(filePin) && same(receipt.cases, cases.map(({ file, fullName, status }) => ({ file, fullName, status }))) && receipt.command.nodeOptions === '--max-old-space-size=768');
  }
  return { raw, receipt, assertions, cases };
}

// Recompute the saved evidence without opening the simulator or running tests.
try {
  const manifest = json(local('artifact-summary.json'));
  check('Manifest finalized without commit', manifest.status === 'final' && manifest.enhancementCommitted === false && manifest.baselineWasUncommitted === true && validTime(manifest.finalizedAt));
  check('All pinned evidence files retained', manifest.files.length > 0 && manifest.files.every(filePin) && new Set(manifest.files.map(item => item.path)).size === manifest.files.length);
  const source = bytes(manifest.sourcePath), publicSource = bytes(manifest.publicPath), frozen = bytes(manifest.testedRuntimePath), baseline = bytes(manifest.baselinePath);
  check('Main, public and frozen candidate bytes agree', source.equals(publicSource) && source.equals(frozen) && source.length === manifest.sourceBytes && sha(source) === manifest.sourceSha256);
  check('Uncommitted starting baseline exact', sha(baseline) === manifest.baselineSha256 && baseline.length === manifest.baselineBytes && manifest.baselineSha256 === 'd07dee1e72991365377a039453c49ecc9b3fbb45c3d83f76366af75461a40beb');
  new vm.Script(source.toString('utf8'));
  result.preservation = preservation(baseline.toString('utf8'), source.toString('utf8'));
  check('Entire prior source token sequence preserved outside named presentation boundaries', result.preservation.passed, result.preservation);
  const traces = catalog(baseline.toString('utf8'));
  const browserReports = manifest.browsers.map(entry => browser(entry, manifest.sourceSha256, traces));
  const finalBrowser = browserReports.find((report, index) => manifest.browsers[index].final);
  check('Final browser totals match actual receipts', finalBrowser.checks.length === manifest.browserCounts.checks && finalBrowser.captures.length === manifest.browserCounts.captures && finalBrowser.nativeActions.length === manifest.browserCounts.nativeActions && finalBrowser.audits.length === manifest.browserCounts.audits);
  const testReports = manifest.tests.map(entry => tests(entry, browserReports, manifest.sourceSha256));
  check('Final test totals match actual assertions', testReports.every((report, index) => report.assertions.length === manifest.tests[index].count));
  check('Focused, full regression and isolated recheck run sequentially', testReports.length === 3 && time(testReports[0].receipt.completedAt) <= time(testReports[1].receipt.startedAt) && time(testReports[1].receipt.completedAt) <= time(testReports[2].receipt.startedAt));
  const full = testReports[1], recheck = testReports[2], identity = item => item.file + '\n' + item.fullName;
  const fullIdentities = new Set(full.cases.map(identity)), passedIdentities = new Set([...full.cases, ...recheck.cases].filter(item => item.status === 'passed').map(identity));
  const failedCase = full.cases.find(item => item.status === 'failed');
  const recovered = recheck.cases.find(item => failedCase && identity(item) === identity(failedCase));
  check('109 distinct unchanged regression identities have passing evidence', fullIdentities.size === 109 && passedIdentities.size === 109 && [...passedIdentities].every(item => fullIdentities.has(item)) && recheck.cases.every(item => fullIdentities.has(identity(item))) && recovered?.status === 'passed');
  check('The isolated recheck resolves the recorded 15 second timeout', failedCase?.file === 'tests/watercycle_matter_energy.test.js' && failedCase.fullName === 'Water Cycle matter and energy trace server-renders the visible semantic summary and 2D canvas contract' && bytes(manifest.tests[1].log).toString('utf8').includes('Test timed out in 15000ms.') && recovered?.duration < 15000 && same(full.receipt.testsBefore.find(item => item.path === failedCase.file), recheck.receipt.testsBefore[0]));
  if (manifest.previewPath) {
    const preview = json(manifest.previewPath);
    check('Preview receipt served current runtime over HTTP', preview.passed === true && [preview.startedAt, preview.completedAt].every(validTime) && time(preview.startedAt) <= time(preview.completedAt) && preview.page.status === 200 && preview.runtime.status === 200 && preview.source.sha256 === manifest.sourceSha256 && preview.public.sha256 === manifest.sourceSha256 && preview.runtime.sha256 === manifest.sourceSha256 && preview.source.bytes === manifest.sourceBytes && preview.public.bytes === manifest.sourceBytes && preview.runtime.bytes === manifest.sourceBytes);
  }
  const closures = manifest.processClosures.map(entry => ({ entry, closure: json(entry.path), test: testReports.find(report => report.receipt.mode === entry.mode) }));
  check('All seven owned test processes were absent after closure', closures.length === 3 && new Set(closures.flatMap(item => item.closure.ownedProcessIds)).size === 7 && closures.every(({ entry, closure, test }) => test && closure.mode === entry.mode && validTime(closure.checkedAt) && time(closure.checkedAt) >= time(test.receipt.completedAt) && closure.allOwnedClosed === true && closure.allPidsAbsent === true && closure.observedPresent.length === 0 && closure.reusedProcessIds.length === 0 && closure.survivingOwnedProcesses.length === 0 && closure.sourcePreserved === true && closure.childExitCode === test.receipt.exitCode && time(closure.childCloseAt) === time(test.receipt.completedAt) && [test.receipt.runnerPid, test.receipt.childPid].every(pid => closure.ownedProcessIds.includes(pid))));
  result.manifest = pin(local('artifact-summary.json'));
  result.counts = { browserChecks: finalBrowser.checks.length, captures: finalBrowser.captures.length, nativeActions: finalBrowser.nativeActions.length, accessibilityAudits: finalBrowser.audits.length, focusedTests: testReports[0].assertions.length, distinctPassingRegressions: passedIdentities.size, fullRegressionPassed: 108, fullRegressionTimedOut: 1, isolatedRecheckPassed: recheck.assertions.length };
} catch (error) {
  result.errors.push(error.stack || String(error));
}
result.completed = true;
result.successful = result.errors.length === 0 && result.checks.every(item => item.passed);
if (process.argv.includes('--read-only')) {
  try {
    const saved = json(local('verification-summary.json'));
    check('Saved verification agrees with recomputed evidence', saved.completed === true && saved.successful === true && same(saved.manifest, result.manifest) && same(saved.counts, result.counts) && same(saved.preservation, result.preservation) && same(saved.checks, result.checks) && saved.errors.length === 0);
  } catch (error) { result.errors.push(error.stack || String(error)); }
  result.successful = result.errors.length === 0 && result.checks.every(item => item.passed);
} else {
  fs.writeFileSync(path.join(__dirname, 'verification-summary.json'), JSON.stringify(result, null, 2) + '\n');
}
console.log(JSON.stringify({ successful: result.successful, checks: result.checks.length, failed: result.checks.filter(item => !item.passed), errors: result.errors, counts: result.counts }));
process.exitCode = result.successful ? 0 : 1;
