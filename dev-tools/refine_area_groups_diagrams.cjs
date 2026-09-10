const fs=require('fs'),{chromium}=require('playwright');
const slugs=['area_perimeter_grade4','equal_groups_grade3'],changes=[];
const ap='allopacks/media/area_perimeter_grade4/',eq='allopacks/media/equal_groups_grade3/';
let m=JSON.parse(fs.readFileSync(ap+'manifest.json'));let a=m.assets.find(a=>a.id==='ap-lesson-4');let s=fs.readFileSync(ap+a.vectorFile,'utf8').replace('data-unit="240"','data-unit="120"').replace('x="110" y="330" width="240" height="240"','x="230" y="330" width="120" height="120"');a.alt='One square tile appears beside a rectangle made from six tiles of exactly the same size.';a.prompt='Exact diagram specification: One square unit beside six identical square units.';fs.writeFileSync(ap+a.vectorFile,s);changes.push([ap,a]);fs.writeFileSync(ap+'manifest.json',JSON.stringify(m,null,2));
m=JSON.parse(fs.readFileSync(eq+'manifest.json'));
for(const id of ['eq-sort-1','eq-sort-4','eq-sort-5','eq-sort-6','eq-sort-7','eq-sort-9','eq-sort-10']){a=m.assets.find(a=>a.id===id);s=fs.readFileSync(eq+a.vectorFile,'utf8');
if(['eq-sort-1','eq-sort-6'].includes(id))s=s.replace(/<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)" fill="#f2eee0"[^>]*\/>/g,(_,x,y,w,h)=>'<ellipse cx="'+(+x+w/2)+'" cy="'+(+y+h/2)+'" rx="'+(w/2-2)+'" ry="'+(h/2-2)+'" fill="#f5f3ea" stroke="#263e50" stroke-width="3"/>');
if(['eq-sort-4','eq-sort-9'].includes(id))s=s.replace(/(<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)" fill="#f2eee0"[^>]*\/>)/g,(_,whole,x,y,w,h)=>'<path d="M'+(+x+w*.3)+' '+y+'v-30q'+(w*.2)+' -35 '+(w*.4)+' 0v30" fill="none" stroke="#263e50" stroke-width="4"/>'+whole);
if(id==='eq-sort-5')s=s.replace('</svg>','</svg>').replace('<g data-group="0"','<rect x="90" y="205" width="550" height="285" rx="20" fill="#dad4c3" stroke="#263e50" stroke-width="3"/><g data-group="0"');
if(id==='eq-sort-7')s=s.replace('</svg>','<path d="M105 290H705 M105 460H705" stroke="#765840" stroke-width="14"/></svg>');
if(id==='eq-sort-10')s=s.replaceAll('rx="24"','rx="2"');
fs.writeFileSync(eq+a.vectorFile,s);changes.push([eq,a]);}
const alts={
'eq-sort-1':'Four oval plates each hold three crackers.',
'eq-sort-2':'Six vases each hold five flowers, with one bloom per stem.',
'eq-sort-3':'Three straight rows each contain eight chairs.',
'eq-sort-4':'Five outlined bags each contain two apples.',
'eq-sort-5':'A rectangular carton contains two rows of six eggs.',
'eq-sort-6':'Three oval plates hold two, five and one cracker.',
'eq-sort-7':'Two shelves hold four books and seven books.',
'eq-sort-8':'Three rows contain four, four and six chairs.',
'eq-sort-9':'Two outlined bags contain six marbles and three marbles.',
'eq-sort-10':'Five boxes contain ten, ten, ten, ten and seven crayons.'
};for(const [id,alt] of Object.entries(alts))m.assets.find(a=>a.id===id).alt=alt;
m.provider='Deterministic SVG diagrams';fs.writeFileSync(eq+'manifest.json',JSON.stringify(m,null,2));
(async()=>{const b=await chromium.launch();try{const p=await b.newPage({viewport:{width:1000,height:1000}});for(const [dir,a] of changes){await p.setContent(fs.readFileSync(dir+a.vectorFile,'utf8'));await p.locator('svg').screenshot({path:dir+a.file});}}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
