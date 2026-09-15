const fs=require('fs'),path=require('path'),assert=require('assert'),{transformSync}=require('esbuild');
const root=path.resolve(__dirname,'../..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
for(const file of ['memory_aid_module.js','doc_pipeline_module.js','generate_dispatcher_module.js','studio_response_module.js','ui_strings.js','help_strings.js'])assert.equal(read(file),read('desktop/web-app/public/'+file),file+' mirror');
assert.equal(read('generate_dispatcher_source.jsx'),read('desktop/web-app/src/generate_dispatcher_source.jsx'));
assert(read('desktop/web-app/src/App.jsx').includes("const [memoryAidAuthorshipMode, setMemoryAidAuthorshipMode] = useState('generated');"));
transformSync(read('desktop/web-app/src/App.jsx'),{loader:'jsx',target:'es2020'});
console.log('Runtime mirrors match. Updated app defaults present. App JSX compiles.');
