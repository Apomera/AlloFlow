const C={ink:'#29484e',teal:'#3d8d89',gold:'#dca43f',red:'#c56458',blue:'#5b92b4',brown:'#987359',pale:'#f5f0e4',green:'#5b8955'};
const path=(d,fill,stroke='none',w=5,extra='')=>`<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const rect=(x,y,w,h,fill,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${fill}" ${extra}/>`;
const circle=(x,y,r,fill,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`;
const ell=(x,y,rx,ry,fill,extra='')=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const arrow=(x,y,X,Y,color=C.ink,tag='')=>path(`M${x} ${y}L${X} ${Y}`,'none',color,10,`marker-end="url(#${color.slice(1)})" data-flow="${tag}"`);
const wrap=s=>`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000"><defs>${Object.values(C).map(c=>`<marker id="${c.slice(1)}" markerWidth="3" markerHeight="3" refX="2.6" refY="1.5" orient="auto"><path d="M0 0L3 1.5L0 3Z" fill="${c}"/></marker>`).join('')}</defs>${rect(0,0,1000,1000,C.pale)}${s}</svg>`;
const leaf=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})">${path('M0 0Q-110 -150 0 -270Q130 -140 0 0',C.green)}${path('M0 0L0 -240','none','#bfd3a3',7)}</g>`;
const sun=(x,y,r=55)=>circle(x,y,r,C.gold)+Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return path(`M${x+Math.cos(a)*(r+15)} ${y+Math.sin(a)*(r+15)}L${x+Math.cos(a)*(r+40)} ${y+Math.sin(a)*(r+40)}`,'none',C.gold,7)}).join('');
const oxygen=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})" data-molecule="oxygen">${circle(-28,0,38,C.red)}${circle(28,0,38,C.red)}</g>`;
const co2=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})" data-molecule="carbon-dioxide">${circle(-64,0,34,C.red)}${circle(0,0,38,C.ink)}${circle(64,0,34,C.red)}</g>`;
const water=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})" data-molecule="water">${circle(0,0,40,C.red)}${circle(-42,35,25,C.blue)}${circle(42,35,25,C.blue)}</g>`;
const sugar=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})" data-symbol="sugar-not-molecule">${path('M0 -65L56 -32L56 32L0 65L-56 32L-56 -32Z',C.gold,C.ink,5)}</g>`;
const lungIcon=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})">${ell(-60,0,48,85,'#dda9a2')}${ell(60,0,48,85,'#dda9a2')}${path('M0 -140V-35M0 -35L-60 20M0 -35L60 20','none',C.ink,15)}</g>`;
const heartIcon=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})">${path('M-50 -60Q20 -100 70 -20Q95 55 0 110Q-75 65 -75 0Q-90 -35 -50 -60',C.red)}${path('M-20 -55V-110M20 -55V-110','none',C.red,25)}</g>`;
const brainIcon=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})">${ell(0,0,100,70,'#ac8aa0')}${path('M-70 0Q-30 -40 -10 0T50 0M0 -50Q40 -30 20 25M30 55L40 110','none','#765d70',9)}</g>`;
const muscleIcon=(x,y,s=1)=>`<g transform="translate(${x} ${y}) scale(${s})">${path('M-120 0Q0 -90 120 0Q0 90 -120 0',C.red)}${path('M-155 0H-120M120 0H155','none',C.brown,15)}</g>`;

module.exports={C,path,rect,circle,ell,arrow,wrap,leaf,sun,oxygen,co2,water,sugar};
