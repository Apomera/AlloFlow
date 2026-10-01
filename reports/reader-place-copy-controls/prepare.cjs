// Builds only artifacts in this directory, from captured integration inputs.
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto'), {spawnSync}=require('node:child_process');
const babel=require('@babel/core'), parser=require('@babel/parser'), traverse=require('@babel/traverse').default;
const root=path.resolve(__dirname,'../..'), out=f=>path.join(__dirname,f), read=f=>fs.readFileSync(out(f),'utf8');
const inputFiles=['base-reader_place_store.js','reader_place_store.js','reader_support_drafts.js','base-view_simplified_source.jsx','base-ui_strings.js'];
if(!fs.existsSync(out('base-reader_place_store.js'))) {
  const base=fs.readFileSync(path.join(root,'reader_place_store.js'),'utf8');
  if(crypto.createHash('sha256').update(base).digest('hex')!=='b1861d25b5466d829b05e115cba776bd8d9cc419d12598d473ff1b6b20a9d2fc') throw new Error('Shared helper changed; rebase explicitly.');
  fs.writeFileSync(out('base-reader_place_store.js'),base);
}
const addition=read('copy-ui.jsx'); let source=read('base-view_simplified_source.jsx');
function replaceOnce(before,after) { if(source.split(before).length!==2) throw new Error('Reader anchor changed: '+before.slice(0,100));source=source.replace(before,after); }
replaceOnce('    function storeReadingPlace(update) {','    function storeReadingPlace(update, saveOptions) {');
replaceOnce('var pending = current.store.save(current.scope, update);','var pending = current.store.save(current.scope, update, saveOptions);');
replaceOnce('    function renderPlacePersistence() {',addition+'\n    function renderPlacePersistence() {');
replaceOnce("      var reason = reasons[state.reason];", "      reasons['recovery-changed'] = ['simplified.place_copy_changed', 'The draft or recovery copy changed. Review it again before continuing.'];\n      reasons['recovery-empty'] = ['simplified.place_copy_empty', 'This recovery copy has no readable answers or bookmark to restore.'];\n      var reason = reasons[state.reason];");
replaceOnce("      var label = state.status === 'saved' ?", "      var label = state.reason === 'recovered-draft' ? viewText('simplified.place_copy_restored', 'Recovery copy restored on this page. Review it, then choose Save restored work. Reloading will discard unsaved changes.')\n        : state.status === 'saved' ?");
replaceOnce("onClick={() => storeReadingPlace({})} className={button}>{viewText('simplified.place_retry', 'Retry saving')}", "onClick={() => storeReadingPlace({}, { confirmRecovery: true })} className={button}>{state.reason === 'recovered-draft' ? viewText('simplified.place_copy_save', 'Save restored work') : viewText('simplified.place_retry', 'Retry saving')}");
const oldRow="{state.recoveryCopies.map((entry, index) => <label key={index} className=\"my-2 block\">{entry.source === 'local' ? viewText('simplified.place_recovery_local', 'Your earlier draft') : viewText('simplified.place_recovery_saved', 'Previously saved work')}{' ' + (index + 1)}<textarea data-reading-recovery-copy readOnly rows={6} value={readingRecoveryText(entry.place)} onFocus={event => event.target.select()} className={textArea} /></label>)}";
const newRow="{state.recoveryCopies.map((entry, index) => <div key={index} className=\"my-2\"><label className=\"block\">{entry.source === 'local' ? viewText('simplified.place_recovery_local', 'Your earlier draft') : viewText('simplified.place_recovery_saved', 'Previously saved work')}{' ' + (index + 1)}<textarea data-reading-recovery-copy readOnly rows={6} value={readingRecoveryText(entry.place)} onFocus={event => event.target.select()} className={textArea} /></label><button type=\"button\" data-reading-copy-review onClick={() => reviewRecoveryCopy(index)} className={button}>{viewText('simplified.place_copy_review_action', 'Review copy {number}', { number: index + 1 })}</button></div>)}";
replaceOnce(oldRow,newRow);
replaceOnce('        {renderReadingRecoveryActions(state, hasCopyableWork, button, textArea)}', '        {renderReadingRecoveryActions(state, hasCopyableWork, button, textArea)}\n        {renderRecoveryCopyReview(button, textArea)}');
fs.writeFileSync(out('view_simplified_source.jsx'),source);
const compiled=babel.transformSync(read('reader_place_store.js')+'\n'+read('reader_support_drafts.js')+'\n'+source,{plugins:[['@babel/plugin-transform-react-jsx',{useBuiltIns:false}]],babelrc:false,configFile:false,parserOpts:{sourceType:'script',plugins:['jsx']},generatorOpts:{jsescOption:{minimal:true}}});
fs.writeFileSync(out('view_simplified_module.js'),`(function(){var React=window.React,Fragment=React.Fragment;\n${compiled.code}\nwindow.AlloModules=window.AlloModules||{};window.AlloModules.SimplifiedView=SimplifiedView;window.AlloModules.ViewSimplifiedModule=true;})();\n`);
const strings=JSON.parse(read('base-ui_strings.js')), added={place_copy_changed:'The draft or recovery copy changed. Review it again before continuing.',place_copy_empty:'This recovery copy has no readable answers or bookmark to restore.'};
traverse(parser.parse(source,{sourceType:'script',plugins:['jsx']}),{CallExpression(p){const [key,fallback]=p.node.arguments;if(p.node.callee.name==='viewText'&&key?.type==='StringLiteral'&&fallback?.type==='StringLiteral'&&key.value.startsWith('simplified.place_copy_'))added[key.value.slice(11)]=fallback.value;}});
Object.assign(strings.simplified,added);fs.writeFileSync(out('ui_strings.js'),JSON.stringify(strings,null,2)+'\n');fs.writeFileSync(out('strings.json'),JSON.stringify(added,null,2)+'\n');
let patch='';
for(const [before,after,target] of [['base-reader_place_store.js','reader_place_store.js','reader_place_store.js'],['base-view_simplified_source.jsx','view_simplified_source.jsx','view_simplified_source.jsx'],['base-ui_strings.js','ui_strings.js','ui_strings.js']]) {
  const prefix=path.relative(root,__dirname).replace(/\\/g,'/')+'/';
  const diff=spawnSync('git',['--no-optional-locks','diff','--no-index','--',prefix+before,prefix+after],{cwd:root,encoding:'utf8'});
  if(diff.status>1||diff.error)throw diff.error||new Error(diff.stderr);patch+=diff.stdout.split(prefix+before).join(target).split(prefix+after).join(target);
}
fs.writeFileSync(out('increment.patch'),patch);
fs.writeFileSync(out('input-hashes.json'),JSON.stringify(Object.fromEntries(inputFiles.map(f=>[f,crypto.createHash('sha256').update(read(f)).digest('hex')])),null,2)+'\n');
for(const file of ['reader_place_persistence.test.js','reader_place_lifecycle.test.js']) {
  const test=fs.readFileSync(path.join(root,'tests',file),'utf8').replace("readFileSync('reader_place_store.js', 'utf8')","readFileSync(process.env.ALLO_READING_PLACE_HELPER || 'reports/reader-place-copy-controls/reader_place_store.js', 'utf8')");
  fs.writeFileSync(out(file),test);
}
let fixture=fs.readFileSync(path.join(root,'reports/reader-place-lifecycle-enhancement/ui-regression.test.js'),'utf8')
  .replace("?? 'reports/reader-place-lifecycle-enhancement/';","?? 'reports/reader-place-copy-controls/';");
fs.writeFileSync(out('ui-regression.test.js'),fixture+'\n'+read('ui-cases.js'));
let browser=fs.readFileSync(path.join(root,'reports/reader-place-lifecycle-enhancement/browser-check.cjs'),'utf8')
  .replace("const helper = read('reader_place_store.js')","const helper = read(process.env.ALLO_READING_PLACE_HELPER || 'reports/reader-place-copy-controls/reader_place_store.js')")
  .replace("|| 'reports/reader-place-lifecycle-enhancement/';","|| 'reports/reader-place-copy-controls/';")
  .replace('  await browser.close(); browser = null;',read('browser-cases.js')+'\n  await browser.close(); browser = null;');
fs.writeFileSync(out('browser-check.cjs'),browser);
console.log('Prepared captured-base helper/UI candidate and atomic increment.patch; shared files unchanged.');
