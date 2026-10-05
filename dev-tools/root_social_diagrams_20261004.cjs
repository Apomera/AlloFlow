'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),base=path.join(root,'allopacks/media');
const C={ink:'#294557',blue:'#7bb9d5',green:'#83b691',gold:'#eac16f',rose:'#d99583',paper:'#fff9ed'};
const rect=(x,y,w,h,fill=C.paper,rx=3)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;
const line=(x,y,x2,y2,extra='')=>`<path d="M${x} ${y}L${x2} ${y2}" fill="none" ${extra}/>`;
const circle=(x,y,r,fill=C.gold)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
const g=(s,x=0,y=0,scale=1)=>`<g transform="translate(${x} ${y}) scale(${scale})">${s}</g>`;
const arrow=(x,y,x2,y2,color=C.ink)=>line(x,y,x2,y2,`stroke="${color}" marker-end="url(#arrow)"`);
const person=(x,y,color=C.blue)=>g(circle(0,0,6,'#c88e66')+`<path d="M-9 15Q0 6 9 15L9 34L-9 34Z" fill="${color}"/>`+line(-5,34,-6,46)+line(5,34,6,46),x,y);
const people=()=>person(30,40)+person(60,35,C.green)+person(90,40,C.rose);
const paper=()=>rect(27,20,65,80)+`<path d="M77 20L92 35H77Z" fill="${C.gold}"/>`;
const coins=()=>[0,1,2].map(i=>`<ellipse cx="${35+i*24}" cy="${83-i*9}" rx="13" ry="5" fill="${C.gold}"/>`+line(22+i*24,76-i*9,22+i*24,83-i*9)+line(48+i*24,76-i*9,48+i*24,83-i*9)).join('');
const civic=()=>`<path d="M18 43L60 20L102 43Z" fill="${C.blue}"/>`+rect(17,90,86,8,C.gold)+[28,50,72,94].map(x=>rect(x,45,8,45)).join('');
const home=()=>`<path d="M15 55L60 18L105 55Z" fill="${C.rose}"/>`+rect(25,55,70,50,C.paper)+rect(54,76,18,29,C.gold)+rect(33,66,13,15,C.blue)+rect(78,66,13,15,C.blue);
const crown=()=>`<path d="M23 41L38 57L60 24L82 57L98 41L89 89H32Z" fill="${C.gold}"/>`;
const scales=()=>line(60,24,60,99)+line(25,39,95,39)+line(35,39,20,74)+line(35,39,50,74)+line(85,39,70,74)+line(85,39,100,74)+`<path d="M18 74Q35 99 52 74Z M68 74Q85 99 102 74Z" fill="${C.gold}"/>`+line(40,100,80,100);
const desk=()=>rect(20,54,80,13,C.gold)+line(28,67,28,104)+line(92,67,92,104)+g(paper(),27,18,.35)+line(75,45,87,25);
const lock=()=>rect(35,58,50,42,C.gold)+`<path d="M45 58V38Q45 12 70 28" fill="none"/>`+circle(60,76,4,C.ink);
const hand=()=>`<path d="M38 98L26 68Q20 58 29 55L43 66V32Q43 19 49 26V53V20Q51 10 57 21V51V22Q63 11 66 25V52V34Q72 25 75 37V66Q83 58 89 66L75 95Z" fill="#c88e66"/>`;
const box=()=>rect(22,41,76,60,C.gold)+line(22,41,59,60)+line(98,41,59,60)+line(59,60,59,101);
const harbor=()=>`<path d="M14 89Q30 75 47 90T81 90T111 90M14 103Q30 89 47 104T81 104T111 104" fill="none" stroke="${C.blue}"/>`+line(20,22,20,84)+line(99,22,99,84)+rect(20,43,79,12,C.rose)+rect(20,61,79,12,C.rose);
const militia=()=>people()+line(12,40,12,99)+line(108,40,108,99)+rect(9,82,6,17,C.gold)+rect(105,82,6,17,C.gold);
const debate=()=>g(people(),0,-9)+rect(15,77,90,12,C.gold)+[32,55,78].map(x=>rect(x,64,15,10)).join('');
const scroll=()=>rect(24,22,67,77,C.paper)+circle(25,23,8)+circle(91,99,8);
const tree=()=>line(60,68,60,105)+`<path d="M22 75L60 13L99 75Z" fill="${C.green}"/>`;
const tent=()=>`<path d="M17 99L60 22L104 99Z" fill="${C.gold}"/><path d="M41 99L60 64L78 99Z" fill="${C.ink}"/>`;
const bridge=()=>`<path d="M7 79H113V66Q60 22 7 66Z" fill="${C.gold}"/>`+line(20,79,20,106)+line(100,79,100,106)+`<path d="M10 112Q30 98 51 110T104 110" fill="none" stroke="${C.blue}"/>`;
const compass=()=>`<path d="M60 10L72 53L104 60L72 70L60 103L48 70L17 60L48 53Z" fill="${C.blue}"/><path d="M60 10L60 61L48 53Z" fill="${C.ink}"/>`;
const road=()=>`<path d="M10 88C15 20 45 110 63 50S96 11 110 76" fill="none" stroke="${C.gold}" stroke-width="14"/>`;
const scale=()=>road()+line(20,96,100,96)+[20,40,60,80,100].map(x=>line(x,88,x,104)).join('');
const waterTower=()=>`<ellipse cx="60" cy="38" rx="31" ry="12" fill="${C.blue}"/>`+rect(29,38,62,22,C.blue)+line(38,60,27,105)+line(82,60,93,105)+line(34,82,86,82)+line(38,60,90,103)+line(82,60,29,103);
const key=()=>rect(8,8,104,104)+g(tent(),11,12,.23)+g(tree(),11,35,.23)+g(bridge(),11,59,.23)+g(home(),11,82,.23);
const icons={paper,coins,civic,home,crown,scales,desk,lock,hand,box,harbor,militia,debate,scroll,tree,tent,bridge,compass,road,scale,waterTower,key,people,
 stamp:()=>paper()+rect(67,64,30,14,C.rose)+rect(75,47,15,17,C.gold),
 representation:()=>people()+g(civic(),42,-2,.35),
 boycott:()=>g(hand(),-12,0,.85)+g(box(),53,34,.53),
 protest:()=>people()+line(20,45,18,9)+rect(4,6,45,25),
 repeal:()=>g(paper(),-3,0,.8)+arrow(75,58,109,58),
 together:()=>people()+`<path d="M15 103Q60 123 104 103" fill="none"/>`,
 rope:()=>line(14,62,106,62)+g(hand(),-7,15,.55)+g(hand(),63,15,.55),
 spinning:()=>circle(59,62,34,C.paper)+[0,60,120].map(a=>`<path d="M26 62H92" transform="rotate(${a} 59 62)"/>`).join('')+line(32,92,26,109)+line(81,92,91,109)+rect(18,16,20,23,C.gold),
 tea:()=>g(box(),0,17,.65)+g(box(),45,4,.65)+`<path d="M8 112Q25 98 46 109T108 109" fill="none" stroke="${C.blue}"/>`,
 council:()=>g(civic(),0,0,.85)+g(harbor(),54,38,.55),
 veto:()=>g(paper(),-5,0,.8)+arrow(106,61,75,61),
 override:()=>g(paper(),35,1,.7)+people()+arrow(15,104,106,104),
 federalism:()=>g(civic(),44,-3,.3)+[10,47,84].map(x=>g(home(),x,57,.28)+line(60,34,x+17,71)).join(''),
 amendment:()=>paper()+rect(44,65,67,24,C.blue),
 ratify:()=>scroll()+g(hand(),45,53,.45),
 impeach:()=>g(civic(),-5,32,.6)+g(paper(),55,-5,.6),
 review:()=>g(scales(),-10,29,.7)+g(paper(),55,-7,.6),
 compromise:()=>person(25,33,C.blue)+person(95,33,C.rose)+arrow(39,64,60,64)+arrow(83,64,62,64)+rect(51,56,19,17,C.gold),
 gears:()=>[30,60,90].map((x,i)=>circle(x,50+(i%2)*30,20,i%2?C.gold:C.blue)+circle(x,50+(i%2)*30,7,C.paper)).join(''),
 war:()=>`<path d="M35 20L75 96M85 20L45 96" stroke-width="7"/>`+line(25,68,53,53)+line(68,51,97,68),
 nomination:()=>g(paper(),-7,0,.8)+person(92,62,C.green)+arrow(52,67,80,67),
 map:()=>rect(13,13,94,94)+rect(19,21,35,60,C.blue)+rect(22,24,29,12)+rect(72,20,26,27,C.gold)+rect(59,61,39,23,C.rose)+rect(38,92,30,15,C.green),
 symbol:()=>g(tent(),0,26,.33)+g(tree(),39,26,.33)+g(bridge(),78,26,.33),
 border:()=>`<g stroke="none">${rect(10,15,50,90,C.green)}${rect(60,15,50,90,C.gold)}</g>`+line(60,15,60,105,'stroke-dasharray="5 5"')+`<path d="M84 15Q72 50 89 78T89 106" fill="none" stroke="${C.blue}" stroke-width="7"/>`,
 distance:()=>g(home(),0,38,.33)+g(home(),81,38,.33)+line(37,75,81,75,'stroke-dasharray="3 7"'),
 region:()=>rect(4,22,36,79,C.green)+rect(40,22,39,79,C.gold)+rect(79,22,37,79,'#ecd3a7')+g(tree(),0,20,.35)+g(tree(),17,51,.3)+[46,57,68].map(x=>line(x,32,x,93)).join('')+`<path d="M84 78Q99 51 111 78" fill="none"/>`,
 missing:()=>rect(15,15,91,91)+g(road(),10,8,.8)+`<path d="M76 106L106 76V106Z" fill="${C.blue}"/>`,
 dog:()=>home()+`<path d="M39 94Q34 88 30 87M42 91H69V99H42Z" fill="${C.gold}"/>`+line(47,99,45,109)+line(66,99,68,109)+circle(74,89,10,C.gold)+`<path d="M67 81L68 73L78 81M81 89H89V94H82" fill="${C.gold}"/>`,
 fence:()=>[18,38,58,78,98].map((x,i)=>rect(x,36,13,67,[C.blue,C.rose,C.green,C.gold,C.blue][i])).join('')+rect(15,50,95,9)+rect(15,81,95,9),
 cars:()=>[0,1,2].map(i=>g(rect(12,32,97,47,[C.blue,C.gold,C.green][i])+rect(32,21,44,22)+circle(33,84,10,C.ink)+circle(89,84,10,C.ink),9,i*38,.55)).join(''),
 noise:()=>g(icons.cars(),0,0,.8)+`<path d="M95 25Q119 60 95 96M86 37Q102 60 86 83" fill="none"/>`,
 library:()=>civic()+g(paper(),49,64,.3)
};
const defs=`<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="${C.ink}"/></marker></defs>`;
const svg=(body,w=480,h=480,view='0 0 120 120')=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${view}">${defs}<rect width="100%" height="100%" fill="${C.paper}"/><g stroke="${C.ink}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`;
const manifests={};
function add(slug,id,body,alt,extra={}){const folder=path.join(base,slug);fs.mkdirSync(folder,{recursive:true});const vectorFile=id+'.svg';fs.writeFileSync(path.join(folder,vectorFile),body);const asset={id,kind:'term',file:id+'.png',webpFile:id+'.webp',vectorFile,alt,prompt:'Authored text-free SVG diagram: '+alt,provider:'Authored SVG diagram',status:'visual-review-pending',...extra};(manifests[slug]||=[]).push(asset);return id;}
function icon(slug,id,name,alt){return add(slug,id,svg(icons[name]()),alt);}
module.exports={root,base,C,rect,line,circle,g,arrow,person,people,paper,civic,home,scales,desk,tree,tent,bridge,compass,road,key,icons,svg,add,icon,manifests};
