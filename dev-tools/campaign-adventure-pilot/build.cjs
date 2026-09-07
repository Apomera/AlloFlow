/* Development-only bridge. Reads existing sources; writes only inside this pilot. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const root = path.resolve(__dirname, '../..');
const sourcePath = 'stem_lab/stem_tool_watercycle.js';
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
function extractWatershed() {
  const source = fs.readFileSync(path.join(root, sourcePath), 'utf8');
  const ast = parser.parse(source, { sourceType: 'script' });
  const functions = ['wcWatershedCopy','localizeWatershedComponents','wcStewardCopy','applyStewardCopy',
    'defaultStewardState','watershedComponents','getWatershedComponent','stewardRng','stewardClamp',
    'startStewardCampaign','applyStewardTech','endStewardYear','advanceFromStewardReview'];
  const variables = ['MAINE_WATERSHED_COMPONENTS','STEWARD_TECHNIQUES','STEWARD_EVENTS','_wcById',
    'STEWARD_FEEDBACK_RULES','STEWARD_CASCADE_HINTS','STEWARD_DIFFICULTIES','_wcT','_wcLocalizedCache','_wcLocalizedFor'];
  const found = new Map();
  function add(name, node, text) {
    if (found.has(name)) throw new Error('Ambiguous watershed declaration: ' + name);
    found.set(name, {name, start:node.start, line:node.loc.start.line, text});
  }
  traverse(ast, {
    FunctionDeclaration(p) { if(functions.includes(p.node.id.name)) add(p.node.id.name,p.node,source.slice(p.node.start,p.node.end)); },
    VariableDeclarator(p) { if(variables.includes(p.node.id.name)) add(p.node.id.name,p.node,'var '+source.slice(p.node.start,p.node.end)+';'); }
  });
  for (const name of functions.concat(variables)) if(!found.has(name)) throw new Error('Missing watershed declaration: '+name);
  const entries = [...found.values()].sort((a,b)=>a.start-b.start);
  const body = entries.map(x=>'// Original '+sourcePath+':'+x.line+'\n'+x.text).join('\n\n');
  const module = [
    '// Generated exact-source bridge. Do not edit; run build.cjs.',
    '// Source SHA-256: '+digest(source),
    'export const sourceSha256 = '+JSON.stringify(digest(source))+';',
    'export function createWatershedRuntime() {',
    'const window = { StemLab: { findById: (items, id) => items.find(item => item.id === id) } };',
    'const t = (key, fallback) => fallback == null ? key : fallback;',
    'const addToast = null, announceToSR = null, awardStemXP = null;',
    'const setTimeout = () => {}, checkWaterCycleChallenges = () => {};',
    'let steward, d = {};',
    'const setSteward = patch => { steward = Object.assign({}, steward, patch); };',
    'const upd = (key, value) => { d[key] = value; };',
    body,
    'applyStewardCopy(t);',
    'const copy = value => JSON.parse(JSON.stringify(value));',
    'return {',
    '  components: copy(watershedComponents()), techniques: copy(STEWARD_TECHNIQUES), difficulties: copy(STEWARD_DIFFICULTIES),',
    "  start: opts => { steward = defaultStewardState(); startStewardCampaign(opts); return copy(steward); },",
    "  apply: (state, tech, target) => { steward = copy(state); applyStewardTech(tech, target); return copy(steward); },",
    "  endYear: state => { steward = copy(state); endStewardYear(); return copy(steward); },",
    "  continue: state => { steward = copy(state); advanceFromStewardReview(); return copy(steward); }",
    '};','}'
  ].join('\n')+'\n';
  return {module, provenance: entries.map(({name,line,text})=>({name,line,sha256:digest(text)}))};
}
function protectedFiles() {
  const dirs = ['', 'desktop/web-app/src', 'desktop/web-app/public'];
  const out = [];
  for (const dir of dirs) {
    const absolute = path.join(root,dir);
    if(!fs.existsSync(absolute)) continue;
    for(const entry of fs.readdirSync(absolute)) {
      if(/adventure/i.test(entry) && /\.(js|jsx)$/.test(entry)) out.push(path.posix.join(dir,entry));
    }
  }
  for(const dir of ['stem_lab','desktop/web-app/public/stem_lab'])
    for(const file of ['stem_tool_watercycle.js','stem_tool_treelab.js'])
      out.push(dir+'/'+file);
  return out.sort();
}
function verifyPreservation() {
  const baseline = JSON.parse(fs.readFileSync(path.join(__dirname,'preservation.json'),'utf8'));
  const changed = Object.entries(baseline.files).filter(([p,hash])=>!fs.existsSync(path.join(root,p))||digest(fs.readFileSync(path.join(root,p)))!==hash).map(([p])=>p);
  if(changed.length) throw new Error('Protected files differ from pilot baseline: '+changed.join(', '));
  return Object.keys(baseline.files).length;
}
function build(check = false) {
  const {module,provenance} = extractWatershed();
  const generated = path.join(__dirname,'watershed-source.mjs');
  const meta = JSON.stringify({source:sourcePath,declarations:provenance},null,2)+'\n';
  for(const [file,data] of [[generated,module],[path.join(__dirname,'provenance.json'),meta]]) {
    if(check) { if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==data) throw new Error('Pilot bridge is stale: '+path.basename(file)); }
    else fs.writeFileSync(file,data);
  }
  return provenance.length;
}
if(require.main===module) {
  const args = process.argv.slice(2);
  if(args.includes('--snapshot')) {
    const target = path.join(__dirname,'preservation.json');
    if(fs.existsSync(target)) throw new Error('Baseline already exists; it must not be overwritten.');
    const files = Object.fromEntries(protectedFiles().map(p=>[p,digest(fs.readFileSync(path.join(root,p)))]));
    fs.writeFileSync(target,JSON.stringify({capturedAt:new Date().toISOString(),files},null,2)+'\n');
    console.log('Captured '+Object.keys(files).length+' protected source/build hashes.');
  }
  console.log('Watershed bridge: '+build(args.includes('--check'))+' exact source declarations.');
  console.log('Preservation: '+verifyPreservation()+' original files unchanged.');
}
module.exports = {build,extractWatershed,verifyPreservation,root};
