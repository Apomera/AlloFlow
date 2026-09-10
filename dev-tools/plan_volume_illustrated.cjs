const fs=require('fs'),{chromium}=require('playwright'),slug='volume_grade5',dir='allopacks/media/'+slug+'/';
if(fs.existsSync(dir+'manifest.json'))throw Error('Manifest exists');
const sources=JSON.parse(fs.readFileSync(dir+'source-prompts.json','utf8').replace(/^\uFEFF/,''));
const rect=(x,y,w,h,c)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+c+'"/>';
const line=(d,c='#665842',w=7,extra='')=>'<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+w+'" '+extra+'/>';
function cells(l,w,h,dx=0,dy=0,color='teal'){const a=[];for(let z=0;z<h;z++)for(let y=0;y<w;y++)for(let x=0;x<l;x++)a.push({x:x+dx,y:y+dy,z,color});return a;}
function solid(cs,{s=70,cx=500,cy=640,explode=0}={}){
const has=new Set(cs.map(c=>[c.x,c.y,c.z].join(',')));
const P=(x,y,z,offset=0)=>[cx+(x-y)*s,cy+(x+y)*s*.5-z*s-offset];
let faces=[];
for(const c of cs){const {x,y,z}=c,offset=explode*z,points={top:[[x,y,z+1],[x+1,y,z+1],[x+1,y+1,z+1],[x,y+1,z+1]],right:[[x+1,y,z],[x+1,y+1,z],[x+1,y+1,z+1],[x+1,y,z+1]],left:[[x,y+1,z],[x+1,y+1,z],[x+1,y+1,z+1],[x,y+1,z+1]]};
for(const [f,n] of [['top',[x,y,z+1]],['right',[x+1,y,z]],['left',[x,y+1,z]]]){
if(has.has(n.join(','))&&!(f==='top'&&explode))continue;
const colors=c.color==='gold'?{top:'#e7c783',right:'#b08038',left:'#caa14e'}:{top:'#99c5bf',right:'#397e80',left:'#609f9c'};
faces.push({depth:x+y+z*.001,svg:'<polygon data-cell="'+[x,y,z].join(',')+'" data-face="'+f+'" points="'+points[f].map(v=>P(...v,offset).join(',')).join(' ')+'" fill="'+colors[f]+'" stroke="#f7f0df" stroke-width="3"/>'});
}}
return '<g data-cube-count="'+cs.length+'">'+faces.sort((a,b)=>a.depth-b.depth).map(f=>f.svg).join('')+'</g>';
}
const all={},alts={},caps={},models={};
function def(k,svg,alt,cap,model){all[k]=svg;alts[k]=alt;caps[k]=cap;if(model)models[k]=model;}
const unit=cells(1,1,1),layer=cells(4,3,1),stack=cells(4,3,5),small=cells(2,2,2);
def('unit',solid(unit,{s:230,cx:500,cy:470}),'One cube has three visible faces shaded in teal; its hidden faces complete the solid.','Choose one length unit for every edge of this cube. Its volume is one cubic unit. If each edge is 1 cm, the volume is 1 cubic cm.',{cubes:unit});
def('layer',solid(layer,{s:90,cx:445,cy:400}),'A single layer of cubes has a top grid four units long and three units wide.','Four cubes in each of three rows gives 12 unit cubes in one layer. The base area is 12 square units; the one-unit-thick layer has volume 12 cubic units.',{cubes:layer});
def('stack',solid(stack,{s:78,cx:450,cy:610}),'A rectangular block has four by three squares across its top and five rows of cubes on its sides.','This solid is 4 by 3 by 5 units. Each of five layers contains 12 unit cubes, so its volume is 60 cubic units. Count hidden cubes too, not just visible faces.',{cubes:stack});
def('exploded',[[250,185],[700,185],[250,465],[700,465],[475,745]].map(([cx,cy])=>solid(layer,{s:50,cx,cy})).join(''),'Five separate four-by-three cube layers are arranged in two pairs and one lower layer, with all top grids visible.','Five layers, each containing 12 cubes, make 60 cubic units when joined. The layers are laid out separately for counting; join them without gaps to form the solid.',{sets:[layer,layer,layer,layer,layer]});
def('small',solid(small,{s:155,cx:500,cy:500}),'A two-by-two-by-two cube block has a grid across its three visible outer faces.','The solid contains 8 unit cubes: 4 in the bottom layer and 4 in the top. Some cubes are hidden. Visible squares are faces, not extra cubes.',{cubes:small});
let area='';for(let y=0;y<3;y++)for(let x=0;x<4;x++)area+=rect(180+x*160,260+y*160,156,156,'#609f9c');
def('area',area,'Twelve flat teal squares form three rows of four.','This is a flat area model: 4 by 3 makes 12 square units. Giving every square a height of one unit creates a layer of 12 unit cubes.');
def('base',solid(stack,{s:72,cx:450,cy:590})+line('M234 698L522 842L738 734','#bc7355',14),'A four-by-three-by-five cube block has its two visible bottom edges emphasized in coral.','The base is the bottom 4-by-3 rectangle, with area 12 square units. Its back edges are hidden. Base area times perpendicular height gives prism volume.',{cubes:stack});
def('height',solid(stack,{s:72,cx:430,cy:590})+line('M750 374H820V734H750','#bc7355',12),'A bracket beside a cube block spans vertically from its top level to its base level.','Height is measured perpendicular to the base. This right rectangular prism is five unit cubes tall. In an oblique prism, a slanted side edge is not the height.',{cubes:stack});
const lc=[...cells(4,2,2,0,0),...cells(2,3,2,0,2,'gold')];
def('joined',solid(lc,{s:82,cx:540,cy:470}),'An L-shaped cube solid joins a teal four-by-two-by-two block to an ochre two-by-three-by-two block without overlapping.','The teal block holds 4 × 2 × 2 = 16 cubes. The ochre block holds 2 × 3 × 2 = 12 cubes. They share a boundary face but no space, so add: 28 cubic units.',{cubes:lc});
const c1=cells(6,3,2),c2=cells(9,2,2);
def('compare',solid(c1,{s:49,cx:410,cy:270})+solid(c2,{s:49,cx:310,cy:640}),'Two gridded rectangular solids have different proportions: six by three by two above, nine by two by two below.','With edges measured in centimeters, 6 × 3 × 2 and 9 × 2 × 2 both give 36 cubic cm. Different dimensions can enclose the same volume.',{sets:[c1,c2]});
const netCells=[[1,0],[0,1],[1,1],[2,1],[3,1],[1,2]];let net='';for(const [x,y]of netCells){net+=rect(140+x*180,220+y*180,180,180,'#caa14e');net+=line('M'+(140+x*180)+' '+(220+y*180)+'h180v180h-180Z','#f7f0df',5);}
def('net',net,'Six equal ochre squares form a cross-shaped cube net: four in a row, with one above and one below the second square.','This net folds into a closed cube. If each edge is 2 cm, the six faces total 24 square cm of surface area, while the cube encloses 8 cubic cm. Ignore tabs, seams and material thickness in this model.',{netCells});
const m={slug,prefix:'vo',status:'in-progress',style:'Warm hand-printed object illustrations and exact cube diagrams',provider:'Built-in image generation and deterministic SVG diagrams',groups:['Build with unit cubes','Count complete layers','Add and compare solids','Inside space and outside covering'],lessonTitles:['One cubic unit','One layer','Five layers make a solid','Separate layers to count','Join without overlap','Same volume, different shapes','Water inside a tank','Cover the outside'],note:'Artwork has no baked-in text. Use the native captions for dimensions and units. Gridded solids include hidden cubes; do not count visible faces as cubes. Gaps in the separated-layer diagram are only for display. Object illustrations are conceptual and must not be measured to calculate exact volumes. The tank water is below the rim, so the amount shown is less than full capacity. Sort area cards ask for surface coverage, and perimeter cards ask for boundary length. The packaging challenge uses ideal closed rectangular boxes: ignore material thickness, seams, tabs and waste, and treat rotations as the same dimensions. Educator review remains pending.',sources,assets:[],models};
function add(kind,key){const index=m.assets.filter(a=>a.kind===kind).length,id='vo-'+kind+'-'+(index+1),a={id,kind,index,sourceKey:key,prompt:all[key]?'Exact text-free diagram: '+alts[key]:sources.find(s=>s.key===key).prompt,caption:caps[key]||'The water occupies three-dimensional inside space. The pictured water level is below the rim, so it is less than the full capacity. Use internal measurements to calculate capacity; wall thickness does not hold water.',method:all[key]?'deterministic-svg':'built-in-imagegen',status:'pending'};if(all[key]){Object.assign(a,{file:id+'-diagram.png',vectorFile:id+'.svg',alt:alts[key],status:'diagram-review-pending'});fs.writeFileSync(dir+a.vectorFile,'<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">'+rect(0,0,1000,1000,'#f7f0df')+all[key]+'</svg>');}m.assets.push(a);}
['stack','unit','unit','stack','base','layer','area','height','tank','joined'].forEach(k=>add('term',k));
['small','exploded','stack','joined','unit'].forEach(k=>add('anchor',k));
['sand','garden','tank','carpet','paint','window','fence','ribbon','mirror'].forEach(k=>add('sort',k));
['unit','layer','stack','exploded','joined','compare','tank','net'].forEach(k=>add('lesson',k));
(async()=>{const b=await chromium.launch();try{const p=await b.newPage();for(const a of m.assets.filter(a=>a.vectorFile)){await p.setContent(fs.readFileSync(dir+a.vectorFile,'utf8'));await p.locator('svg').screenshot({path:dir+a.file});}fs.writeFileSync(dir+'manifest.json',JSON.stringify(m,null,2));console.log(m.assets.length);}finally{await b.close();}})();

