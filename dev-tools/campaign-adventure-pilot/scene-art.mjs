const NS='http://www.w3.org/2000/svg';
const svg=(tag,attrs)=>{const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
function treeSymbol(parent,x,y,size,aspen=false,small=false,deciduous=false){
  const g=svg('g',{transform:'translate('+x+' '+y+') scale('+size+')'});
  g.append(svg('path',{d:'M0 0v-18',stroke:'#655943','stroke-width':small?2:3}));
  if(aspen){g.append(svg('ellipse',{cx:0,cy:-25,rx:12,ry:16,fill:small?'#d0dd83':'#aec783'}));}
  else if(deciduous){g.append(svg('path',{d:'M-14-13C-24-20-14-34-7-31C-10-48 11-48 12-32C27-34 28-14 14-12Z',fill:small?'#a3c7ac':'#376650'}));}
  else g.append(svg('path',{d:'M0-44L-16-14H-9L-18-4H18L9-14H16Z',fill:small?'#a3c7ac':'#376650'}));
  parent.append(g);
}
export function landscape(view,selectLocation,selected){
  const shell=document.createElement('div');shell.className='landscape '+view.campaignId;
  const drawing=svg('svg',{viewBox:'0 0 640 455','aria-hidden':'true',focusable:'false',preserveAspectRatio:'xMidYMid slice'});
  drawing.append(svg('rect',{width:640,height:455,fill:view.campaignId==='watershed'?'#dfe8d3':'#e5e7cd'}));
  if(view.campaignId==='watershed'){
    drawing.append(svg('path',{d:'M0 0H640V115Q492 50 349 98T0 115Z',fill:'#c2d0b9'}));
    drawing.append(svg('path',{d:'M0 50Q164-13 269 47T640 60',fill:'none',stroke:'#b5c5ae','stroke-width':2}));
    drawing.append(svg('path',{d:'M-30 356Q146 229 275 318T690 351V470H-30Z',fill:'#c5d8b8'}));
    for(let i=0;i<7;i++)drawing.append(svg('path',{d:'M-30 '+(130+i*38)+'Q100 '+(40+i*40)+' 223 '+(100+i*37)+'T680 '+(100+i*44),fill:'none',stroke:'#c9d5bd','stroke-width':1.5}));
    drawing.append(svg('path',{d:'M354-25C369 75 198 78 243 170S421 195 354 290S204 357 250 475',fill:'none',stroke:'#95beba','stroke-width':46}));
    drawing.append(svg('path',{d:'M354-25C369 75 198 78 243 170S421 195 354 290S204 357 250 475',fill:'none',stroke:'#d5efed','stroke-width':28}));
    drawing.append(svg('path',{d:'M350-25C365 75 194 78 239 170S417 195 350 290S200 357 246 475',fill:'none',stroke:'#88babb','stroke-width':2,'stroke-dasharray':'20 12',opacity:0.7}));
    [[70,100,1.1],[122,158,.8],[167,63,.9],[80,277,1.1],[126,340,.75],[463,87,.9],[523,142,.8],[573,71,1.1],[522,322,.85],[592,390,.9]].forEach(t=>treeSymbol(drawing,...t));
    for(let i=0;i<5;i++)drawing.append(svg('path',{d:'M420 '+(207+i*12)+'l118 27',stroke:'#b7bd85','stroke-width':7}));
    [[410,354],[451,364],[489,385]].forEach(([x,y])=>{drawing.append(svg('rect',{x,y,width:24,height:20,rx:2,fill:'#ddd3b7'}));drawing.append(svg('path',{d:'M'+(x-4)+' '+y+'l16-12 16 12Z',fill:'#8d8b74'}));});
  } else {
    view.locations.forEach((patch,i)=>{
      const x=42+(i%3)*188,y=29+Math.floor(i/3)*135;
      drawing.append(svg('rect',{x,y,width:178,height:125,rx:20,fill:patch.habitat==='damp'?'#c3d9c9':patch.habitat==='sheltered'?'#cfddbc':'#e2d9b5',stroke:'#f4f1e4','stroke-width':3}));
      if(patch.gap)drawing.append(svg('ellipse',{cx:x+87,cy:y+46,rx:56,ry:29,fill:'#f4eec0',opacity:.8}));
      patch.trees.forEach((t,j)=>treeSymbol(drawing,x+42+j*42,y+53,t.descendant?.55:.9,t.species==='aspen',t.descendant,true));
    });
    drawing.append(svg('path',{d:'M606 0q-28 93 2 158t-1 153t8 180',fill:'none',stroke:'#94b9b0','stroke-width':9}));
  }
  shell.append(drawing);
  const waterPositions={headwaterStreams:[51,17],forestBuffer:[22,39],floodplainWetlands:[42,60],riverMainstem:[44,85],agriculturalWatershed:[76,49],suburbanEdges:[76,82]};
  const shortNames={headwaterStreams:'Headwaters',forestBuffer:'Buffers',floodplainWetlands:'Wetlands',riverMainstem:'Mainstem',agriculturalWatershed:'Farms',suburbanEdges:'Town'};
  for(const [i,loc]of view.locations.entries()){
    const button=document.createElement('button');button.type='button';button.className='map-location';
    button.setAttribute('aria-label',loc.name+', '+loc.value+' '+loc.unit);
    button.setAttribute('aria-pressed',String(selected===loc.id));
    const coords=view.campaignId==='watershed'?waterPositions[loc.id]:[20.5+(i%3)*29.3,26+Math.floor(i/3)*29.7];
    button.style.left=coords[0]+'%';button.style.top=coords[1]+'%';
    const label=document.createElement('span');label.textContent=shortNames[loc.id]||loc.name;
    const count=document.createElement('strong');count.textContent=loc.value;
    button.append(label,count);button.addEventListener('click',()=>selectLocation(loc.id));shell.append(button);
  }
  return shell;
}
