// Read-only component review: builds a local fixture, never changes app files.
const fs = require('fs');
const path = require('path');
const { createRequire } = require('module');
const root = path.resolve(__dirname, '../..');
const req = createRequire(path.join(root, 'desktop/web-app/package.json'));
async function main() {
  const config = { ...req('./tailwind.config.js'), content: [path.join(root, 'memory_aid_source.jsx'), path.join(root, 'image_asset_editor_source.jsx')] };
  const css = (await req('postcss')([req('tailwindcss')(config)]).process('@tailwind base;@tailwind components;@tailwind utilities;', {from:undefined})).css;
  const scripts = ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'image_asset_editor_module.js', 'memory_aid_module.js'].map(p => '<script>' + fs.readFileSync(path.join(root,p),'utf8').replace(/<\/script/gi,'<\\/script') + '</script>').join('\n');
  const fixture = {
    type:'memory-aid', id:'ux-review-fixture', data:{
      schemaVersion:2, resourceId:'ux-review-fixture', title:'Remember states of matter',
      instructions:'Study the connection, make the aid your own, and explain how it helps you remember.',
      authorshipMode:'progressive', reflectionLevel:'quick', reasoningRequired:false,
      cards:[
        { id:'solid',target:'Solids keep their shape',type:'keyword-association',mode:'generated',essentialFacts:['A solid keeps its shape.','A solid has a definite volume.'],factLocked:true,factVerified:true,aiExample:'Solid statue: it stays the same shape and takes up the same space.',mapping:'The statue keeps its shape, like a solid. It takes up the same amount of space, reminding you that a solid has a definite volume.',studentPrompt:'Create your own solid cue, or remix the statue example.',reasoningPrompt:'How does your cue help you remember shape and volume?',visualPrompt:'A small stone statue standing on a desk.' },
        { id:'liquid',target:'Liquids take the shape of their container',type:'rhyme-rhythm',mode:'scaffolded',essentialFacts:['A liquid takes the shape of its container.','A liquid has a definite volume.'],factLocked:true,factVerified:true,scaffoldStarter:'Liquid can flow, its shape can ___; the space it takes stays ___.',scaffoldSteps:['Choose words that remind you a liquid changes shape.','Add a line that reminds you its volume stays the same.'],mapping:'The first line cues changing shape. The second line cues definite volume.',studentPrompt:'Complete the rhyme in your own words.',reasoningPrompt:'Which part reminds you about volume?',visualPrompt:'The same amount of water in a tall glass and a wide bowl.' },
        { id:'gas',target:'Gases spread to fill their container',type:'visual-association',mode:'student-authored',essentialFacts:['A gas has no definite shape.','A gas has no definite volume.'],factLocked:true,factVerified:true,coachPrompts:['What familiar scene reminds you of spreading out?','How could your cue show both shape and volume changing?'],mapping:'Connect each part of your scene to one fact about gas.',studentPrompt:'Create a memory cue for how gases behave.',reasoningPrompt:'How does your idea cue both facts?' }
      ]
    }
  };
  const html = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Memory Aid current component review</title><style>'+css+'body{background:#f8fafc}#review-note{font:13px system-ui;padding:8px 20px;background:#e2e8f0;color:#0f172a}</style><div id="review-note">Current component · authored review fixture · images intentionally absent · not a live generation</div><div id="root"></div>'+scripts+'<script>window.fixture='+JSON.stringify(fixture)+';window.reviewTeacher=new URLSearchParams(location.search).has("teacher");if(new URLSearchParams(location.search).has("diagram")){Object.assign(window.fixture.data.cards[0],{visualKind:"groups",visualStatus:"structured",connections:[{cue:"Same shape",factIndex:0,explanation:"The statue holds its shape."},{cue:"Same space",factIndex:1,explanation:"Volume is the space it takes."}]});}function App(){const [resource,setResource]=React.useState(window.fixture);return React.createElement(window.AlloModules.MemoryAidView,{generatedContent:resource,isTeacherMode:window.reviewTeacher,isProcessing:false,activeProfileId:"memory-ux-review-only",handleNoteUpdate:(field,value)=>setResource(old=>({...old,data:{...old.data,[field]:typeof value==="function"?value(old.data[field]):value}})),callGemini:async()=>"{}",callImagen:async()=>"",callGeminiVision:null,callGeminiImageEdit:null,gradeLevel:"4th Grade",addToast:()=>{}})}ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));</script></html>';
  fs.writeFileSync(path.join(__dirname,'current-preview.html'),html);
  console.log('Built current component review fixture.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
