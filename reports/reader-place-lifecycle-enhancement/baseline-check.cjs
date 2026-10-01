// Reconstruct the exact pre-delta reader, verify its recorded hash, and compile
// only a report artifact so surrounding failures can be checked independently.
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto'), babel=require('@babel/core');
const out=file=>path.join(__dirname,file), root=path.resolve(__dirname,'../..');
const inputs=JSON.parse(fs.readFileSync(out('candidate-inputs.json'),'utf8'));
let source=fs.readFileSync(out('view_simplified_source.jsx'),'utf8');
source=source.replace(fs.readFileSync(out('lifecycle-ui.jsx'),'utf8')+'\n','')
  .replace('\n  if (window.__alloReadingPlaceGuardCleanup) window.__alloReadingPlaceGuardCleanup();\n  window.__alloReadingPlaceGuardCleanup = readingPlaceStore.watchPage(window);','')
  .replace('\n    React.useEffect(function () { if (placePreview) return placeStore.watchPage(window); }, [placePreview, placeStore]);','')
  .replace('    function readingRecoveryText(place, sourceText) {\n      var recoverySections = sourceText === undefined ? outlineSections : readingOutlineSections(sourceText);','    function readingRecoveryText(place) {')
  .replace('var section = recoverySections.find(entry => String(entry.first) === first);','var section = outlineSections.find(entry => String(entry.first) === first);')
  .replace('        {renderReadingRecoveryActions(state, hasCopyableWork, button, textArea)}\n','');
if(crypto.createHash('sha256').update(source).digest('hex')!==inputs['view_simplified_source.jsx']) throw new Error('Pre-delta source reconstruction did not match its recorded hash.');
const helpers=['reader_place_store.js','reader_support_drafts.js'].map(file=>{
  const text=fs.readFileSync(path.join(root,file),'utf8');
  if(crypto.createHash('sha256').update(text).digest('hex')!==inputs[file]) throw new Error('Helper changed since candidate: '+file);
  return text;
});
const compiled=babel.transformSync([...helpers,source].join('\n'),{plugins:[['@babel/plugin-transform-react-jsx',{useBuiltIns:false}]],babelrc:false,configFile:false,parserOpts:{sourceType:'script',plugins:['jsx']},generatorOpts:{jsescOption:{minimal:true}}});
fs.writeFileSync(out('baseline-view-source.jsx'),source);
fs.writeFileSync(out('baseline-view-module.js'),`(function(){var React=window.React,Fragment=React.Fragment;\n${compiled.code}\nwindow.AlloModules.SimplifiedView=SimplifiedView;})();\n`);
console.log('Compiled the exact pre-delta reader baseline in this report directory.');
