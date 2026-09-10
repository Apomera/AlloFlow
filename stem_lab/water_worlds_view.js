/* React view for the Water Worlds kernel. No physical calculations in the renderer. */
(function (root) {
  'use strict';
  var K = root.WaterWorldsKernel;
  if (!K) throw new Error('Water Worlds kernel must load before its view.');
  var CSS = `
.ww{--ww-bg:#f5f8f5;--ww-card:#fff;--ww-ink:#153d38;--ww-muted:#42625c;--ww-line:#b7cdc4;--ww-accent:#165f50;color:var(--ww-ink);background:var(--ww-bg);padding:20px;border:1px solid var(--ww-line);border-radius:16px;font:14px/1.5 system-ui,sans-serif;max-width:1160px;margin:0 auto;box-sizing:border-box}
.ww.is-dark{--ww-bg:#122b2a;--ww-card:#183735;--ww-ink:#e4f6ee;--ww-muted:#b9d4cb;--ww-line:#50786b;--ww-accent:#98e1c4}.ww *{box-sizing:border-box}.ww h2,.ww h3,.ww p{margin:0}.ww h2{font-weight:750;font-size:27px;letter-spacing:-.04em;color:var(--ww-ink)}.ww h3{font-weight:700;font-size:16px;color:var(--ww-ink)}.ww p{color:var(--ww-muted)}.ww-heading{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:15px}.ww-kicker{font-size:11px;letter-spacing:.12em;font-weight:750;text-transform:uppercase;color:var(--ww-muted)}.ww-heading p{max-width:620px;margin-top:3px}.ww label{display:block;font-weight:650;color:var(--ww-ink)}.ww select,.ww input,.ww textarea{max-width:100%;font:inherit;color:var(--ww-ink);background:var(--ww-card);border:1px solid var(--ww-line);border-radius:7px;padding:9px;min-height:44px}.ww select{width:100%}.ww button{font:650 13px/1.35 system-ui,sans-serif;color:var(--ww-ink);background:var(--ww-card);border:1px solid var(--ww-line);border-radius:8px;min-height:44px;padding:9px 12px;cursor:pointer}.ww button:hover:not(:disabled){border-color:var(--ww-accent);box-shadow:inset 0 0 0 1px var(--ww-accent)}.ww button[aria-pressed=true]{border:2px solid var(--ww-accent);background:var(--ww-bg)}.ww button.ww-primary{background:#165f50;color:#fff;border-color:#165f50}.ww button:disabled{opacity:.55;cursor:default}.ww :is(button,select,input,textarea,summary,canvas,[tabindex]):focus-visible{outline:3px solid #b45309;outline-offset:3px}.ww.is-dark :focus-visible{outline-color:#f8d479}.ww-main{display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:16px}.ww-world{min-width:0}.ww-scene{position:relative;border:1px solid var(--ww-line);border-radius:12px;overflow:hidden;background:#c5e4e0}.ww canvas{display:block;width:100%;height:auto;aspect-ratio:900/560;touch-action:pan-y}.ww-scene-bar{padding:10px 12px;display:flex;justify-content:space-between;gap:8px;background:var(--ww-card);align-items:center;flex-wrap:wrap}.ww-scene-bar span{font-size:12px;color:var(--ww-muted)}.ww-tools{display:flex;gap:6px;flex-wrap:wrap}.ww-time{font-variant-numeric:tabular-nums;font-weight:750}.ww-controls{display:grid;gap:13px;align-content:start}.ww-panel{padding:13px;border:1px solid var(--ww-line);border-radius:10px;background:var(--ww-card)}.ww-panel h3{margin-bottom:8px}.ww-field{margin-top:10px}.ww-field-head{display:flex;justify-content:space-between;gap:8px;font-size:12px}.ww input[type=range]{width:100%;padding:0;border:0;accent-color:var(--ww-accent)}.ww-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.ww-caption{font-size:12px;margin-top:8px!important}.ww-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}.ww-metric{border-top:3px solid #387f70;background:var(--ww-card);padding:9px 10px;border-radius:3px 3px 8px 8px}.ww-metric strong{font-size:20px;display:block;font-variant-numeric:tabular-nums;letter-spacing:-.03em}.ww-metric span{font-size:11px;color:var(--ww-muted)}.ww-status{padding:10px 12px;border-left:3px solid var(--ww-accent);background:var(--ww-card);margin-top:10px;min-height:44px;color:var(--ww-ink)}.ww-bottom{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px}.ww summary{min-height:44px;padding:10px 0;font-weight:700;cursor:pointer}.ww textarea{width:100%;margin-top:6px;resize:vertical}.ww table{width:100%;border-collapse:collapse;font-size:12px;color:var(--ww-ink)}.ww th,.ww td{padding:8px 5px;text-align:left;border-bottom:1px solid var(--ww-line);font-variant-numeric:tabular-nums}.ww caption{text-align:left;font-weight:700;padding:8px 0}.ww-table-scroll{overflow:auto;max-height:270px}.ww-graph{width:100%;display:block;color:var(--ww-ink)}.ww-legend{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;margin-top:5px}.ww-key{display:inline-block;width:13px;height:10px;margin-right:4px;border-radius:2px}.ww-subsoil{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0}.ww-soil-meter{height:12px;background:#c6b595;border:1px solid #78664d;overflow:hidden}.ww-soil-meter i{display:block;height:100%;background:#187992}.ww-detail{font-size:12px;display:flex;justify-content:space-between;gap:6px;margin:5px 0}.ww-boundary{margin-top:14px!important;font-size:12px;padding-top:12px;border-top:1px solid var(--ww-line)}
@media(max-width:900px){.ww-main{grid-template-columns:1fr}.ww-controls{grid-template-columns:1fr 1fr}.ww-bottom{grid-template-columns:1fr}.ww-heading{align-items:start}.ww-heading label{max-width:180px}}@media(max-width:560px){.ww{padding:12px;border-radius:10px}.ww-heading{display:block}.ww-heading label{margin-top:10px;max-width:none}.ww-controls{grid-template-columns:1fr}.ww-metrics{grid-template-columns:1fr 1fr}.ww canvas{aspect-ratio:900/560}.ww-scene-bar{padding:8px}.ww-tools button{padding:7px 9px}.ww h2{font-size:24px}.ww-main{gap:12px}.ww-bottom{gap:12px}.ww-actions button{flex:1 1 135px}}
.ww-cutaway{margin-top:12px;display:grid;gap:8px}.ww-layer{border:1px solid var(--ww-line);border-left:5px solid #2188a3;border-radius:5px;padding:8px;background:var(--ww-bg)}.ww-layer strong{display:block;font-size:13px}.ww-layer span{display:block;font-size:12px;color:var(--ww-muted)}.ww-layer-soil{border-left-color:#967143}.ww-layer-ground{border-left-color:#61799b}.ww-flow-note{padding:10px 12px;background:var(--ww-card);border-top:1px solid var(--ww-line);font-size:12px}.ww-comparison{padding:12px;margin-top:12px;border:1px solid var(--ww-line);border-radius:8px;background:var(--ww-bg)}.ww-comparison strong{display:block}.ww-comparison p{font-size:13px;margin-top:4px}.ww-layer .ww-soil-meter{margin-top:6px}
.ww-timeline{margin:12px 0;padding:12px;background:var(--ww-card);border:1px solid var(--ww-line);border-radius:10px}.ww-timeline input{width:100%}.ww-check{display:flex!important;align-items:center;gap:8px;font-size:12px}.ww-scene .ww-check{padding:8px 12px;background:var(--ww-card);border-top:1px solid var(--ww-line)}.ww-check input{flex:0 0 20px;min-height:44px}.ww-guide{margin:12px 0;padding:12px;background:var(--ww-bg);border:1px solid var(--ww-line);border-radius:8px}.ww-guide ol{margin:8px 0 0;padding-left:20px;list-style:decimal}.ww-guide li{margin:6px 0}.ww-inspection{border-left:4px solid #967143;padding-left:10px;margin-top:8px!important}
.ww-difference{padding:12px;background:var(--ww-card);border-top:1px solid var(--ww-line)}.ww-difference label{font-size:12px}.ww-difference select{margin:6px 0}.ww-difference-key{display:flex;gap:12px;flex-wrap:wrap;font-size:12px;margin-top:8px}.ww-difference-key b{padding:2px 7px;border:1px solid currentColor;border-radius:4px;margin-right:4px}.ww-difference-readout{margin-top:12px;padding:10px;border:1px solid var(--ww-line);border-radius:8px;background:var(--ww-bg)}.ww-difference-readout h3{font-size:14px}
.theme-contrast .ww{--ww-bg:#000;--ww-card:#000;--ww-ink:#fff;--ww-muted:#fff;--ww-line:#fff;--ww-accent:#ff0}.theme-contrast .ww button.ww-primary{background:#000;color:#ff0;border-color:#ff0}@media(forced-colors:active){.ww{--ww-bg:Canvas;--ww-card:Canvas;--ww-ink:CanvasText;--ww-muted:CanvasText;--ww-line:CanvasText;--ww-accent:Highlight}.ww button.ww-primary{background:ButtonFace;color:ButtonText;border-color:ButtonText}}
`;
  function n(v, digits) { return Number(v).toFixed(digits == null ? 1 : digits); }
  function signed(v,digits){var value=n(Math.abs(v),digits);return Number(value)===0?value:(v>0?'+':'−')+value;}
  function difference(label,current,baseline,precision,unit) {
    var delta=current-baseline,amount=n(Math.abs(delta),precision);
    return Number(amount)===0?label+' is unchanged at the displayed precision.':label+' is '+amount+' '+unit+' '+(delta<0?'lower':'higher')+' than the baseline.';
  }
  function projection(c) { return { x: 420 + (c.x - c.y) * 39, y: 112 + (c.x + c.y) * 19 - c.elevation * 17 }; }
  function polygon(ctx, points, fill, stroke) {
    ctx.beginPath(); points.forEach(function (p, i) { if (!i) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function corners(c) {
    return [[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(function(v){
      var x=c.x+v[0],y=c.y+v[1],z=(K.rows-1-y)*.16+Math.pow(Math.abs(x-5.5),1.35)*.18;
      return {x:420+(x-y)*39,y:112+(x+y)*19-z*17};
    });
  }
  function variation(c,seed){var v=Math.sin(c.x*127.1+c.y*311.7+seed*73.3)*43758.5453;return v-Math.floor(v);}
  function oval(ctx,x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
  function tree(ctx,x,y,size,pine){
    oval(ctx,x+size*.28,y+2,size*.46,size*.14,'rgba(21,54,41,.19)');
    ctx.fillStyle='#79614b';ctx.fillRect(x-1.6,y-size*.55,3.2,size*.6);
    if(pine){
      polygon(ctx,[{x:x,y:y-size},{x:x-size*.32,y:y-size*.32},{x:x+size*.32,y:y-size*.32}],'#225e49');
      polygon(ctx,[{x:x,y:y-size*.79},{x:x-size*.4,y:y-size*.12},{x:x+size*.4,y:y-size*.12}],'#2f7856');
      polygon(ctx,[{x:x,y:y-size},{x:x-size*.32,y:y-size*.32},{x:x-1,y:y-size*.39}],'#65a875');
    }else{
      oval(ctx,x,y-size*.57,size*.38,size*.39,'#276b4d');
      oval(ctx,x-size*.17,y-size*.72,size*.27,size*.25,'#579458');
      oval(ctx,x+size*.18,y-size*.66,size*.25,size*.27,'#387d4e');
      oval(ctx,x-size*.11,y-size*.84,size*.18,size*.14,'#83b774');
    }
  }
  function shore(ctx,pts,p,f){
    var q=pts.map(function(v){return{x:p.x+(v.x-p.x)*f,y:p.y+(v.y-p.y)*f};});
    ctx.beginPath();ctx.moveTo((q[3].x+q[0].x)/2,(q[3].y+q[0].y)/2);
    q.forEach(function(v,i){var next=q[(i+1)%4];ctx.quadraticCurveTo(v.x,v.y,(v.x+next.x)/2,(v.y+next.y)/2);});ctx.closePath();
  }
  function draw(canvas, s) {
    if (!canvas) return; var ctx = canvas.getContext('2d'); if (!ctx) return;
    var pixelRatio=Math.min(2,root.devicePixelRatio||1);canvas.width=Math.round(900*pixelRatio);canvas.height=Math.round(560*pixelRatio);ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);
    canvas.dataset.pixelRatio=String(pixelRatio);
    var wetSky=!!(s.run&&!s.run.complete&&s.world.minutes-s.run.start.minutes<s.run.forcing.duration);
    var sky = ctx.createLinearGradient(0,0,0,560); sky.addColorStop(0,wetSky?'#adc7cc':'#bcdfe2'); sky.addColorStop(0.65,wetSky?'#dce7df':'#f2f2df'); sky.addColorStop(1,'#b8ceba');
    ctx.fillStyle=sky;ctx.fillRect(0,0,900,560);
    var light=ctx.createRadialGradient(720,62,5,720,62,235);light.addColorStop(0,wetSky?'rgba(246,248,228,.18)':'rgba(255,249,211,.68)');light.addColorStop(1,'rgba(255,249,211,0)');ctx.fillStyle=light;ctx.fillRect(0,0,900,300);
    // Background atmosphere is illustrative; it does not drive the water model.
    [[140,93,125],[690,66,155]].forEach(function(v){oval(ctx,v[0],v[1],v[2],14,wetSky?'rgba(110,144,150,.16)':'rgba(255,255,240,.24)');});
    // Distant ridges provide scale without competing with the editable valley.
    polygon(ctx,[{x:0,y:195},{x:65,y:140},{x:110,y:164},{x:225,y:61},{x:335,y:150},{x:405,y:98},{x:530,y:204}], '#abc9bf');
    polygon(ctx,[{x:370,y:208},{x:515,y:118},{x:573,y:147},{x:680,y:80},{x:814,y:161},{x:900,y:135},{x:900,y:252}], '#b3d0c7');
    for(var shadow=5;shadow>0;shadow--)oval(ctx,518,411,285+shadow*10,77+shadow*5,'rgba(36,68,51,.025)');
    var cells=s.world.cells.slice().sort(function(a,b){return (a.x+a.y)-(b.x+b.y);});
    cells.forEach(function(c){
      var p=projection(c),pts=corners(c);
      function soilFace(a,b,dark){
        polygon(ctx,[a,b,{x:b.x,y:b.y+32},{x:a.x,y:a.y+32}],dark?'#88705b':'#a48b68');
        polygon(ctx,[a,b,{x:b.x,y:b.y+7},{x:a.x,y:a.y+7}],dark?'#5c6145':'#70754c');
        ctx.strokeStyle=dark?'#ad9374':'#c7ad83';ctx.lineWidth=1;
        [15,24].forEach(function(depth){ctx.beginPath();ctx.moveTo(a.x,a.y+depth);ctx.lineTo(b.x,b.y+depth);ctx.stroke();});
      }
      if(c.x===K.cols-1)soilFace(pts[1],pts[2],true);
      if(c.y===K.rows-1)soilFace(pts[2],pts[3],false);
      var base=K.covers[c.cover].color,analytic=s.lens==='soil'||s.lens==='difference';
      polygon(ctx,pts,base,analytic?'rgba(36,68,55,.19)':null);
      if(!analytic){
        polygon(ctx,pts,c.x<6?'rgba(241,235,180,.13)':'rgba(22,64,44,.07)');
        ctx.save();polygon(ctx,pts);ctx.clip();
        for(var speck=0;speck<12;speck++){
          var sx=p.x+(variation(c,speck*2)-.5)*70,sy=p.y+(variation(c,speck*2+1)-.5)*34;
          oval(ctx,sx,sy,1.2+variation(c,speck+35)*1.4,.65,speck%2?'rgba(245,242,201,.14)':'rgba(29,65,40,.1)');
        }ctx.restore();
      }
      if(s.lens==='difference'&&s.spatial){
        var delta=s.spatial.cells[c.y*K.cols+c.x][s.differenceStore].differenceMm,amount=Math.min(1,Math.abs(delta)/10);
        polygon(ctx,pts,'#eff1e9','rgba(36,68,55,.25)');
        if(Math.abs(delta)>=.05){polygon(ctx,pts,delta>0?'rgba(12,110,171,'+(.2+.65*amount)+')':'rgba(172,83,30,'+(.2+.65*amount)+')');
          ctx.fillStyle='#122f35';ctx.font='bold 15px system-ui';ctx.textAlign='center';ctx.fillText(delta>0?'+':'−',p.x,p.y+5);ctx.textAlign='start';}
      }
      else if(s.lens==='soil'){polygon(ctx,pts,'rgba(8,86,120,'+(c.soil/120*.8)+')');}
      else {
        if(c.soil>55) polygon(ctx,pts,'rgba(9,48,37,'+Math.min(.3,(c.soil-55)/170)+')');
        if(c.cover==='stream'){
          polygon(ctx,pts,'#a8ac97');
          ctx.save();polygon(ctx,pts);ctx.clip();
          for(var stone=0;stone<8;stone++)oval(ctx,p.x+(variation(c,stone+41)-.5)*58,p.y+(variation(c,stone+71)-.5)*23,2.4,1.2,stone%2?'#c6c6af':'#86988b');
          ctx.restore();
        }
        if(c.cover==='paved'){
          ctx.save();polygon(ctx,pts);ctx.clip();ctx.strokeStyle='rgba(236,236,222,.48)';ctx.lineWidth=1;
          [-.25,.25].forEach(function(f){ctx.beginPath();ctx.moveTo(p.x-40,p.y-20+f*32);ctx.lineTo(p.x+40,p.y+20+f*32);ctx.stroke();});ctx.restore();
        }
        if(c.cover==='basin'){
          oval(ctx,p.x,p.y,27,12,'#477a60');oval(ctx,p.x,p.y-1,22,9,'#799563');
          ctx.strokeStyle='#d2c697';ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(p.x,p.y,27,12,0,0,Math.PI);ctx.stroke();
        }
        if(c.surface>.15){
          var f=Math.min(1,.24+c.surface/13),channel=c.cover==='stream';
          ctx.save();polygon(ctx,pts);ctx.clip();
          if(channel||f===1)polygon(ctx,pts);else shore(ctx,pts,p,f);
          var water=channel?ctx.createLinearGradient(420,110,420,490):ctx.createLinearGradient(p.x-15,p.y-18,p.x+18,p.y+20);
          water.addColorStop(0,'rgba(78,178,186,'+(channel?.88:Math.min(.84,.36+c.surface/35))+')');
          water.addColorStop(1,'rgba(20,113,151,'+(channel?.94:Math.min(.9,.42+c.surface/30))+')');
          ctx.fillStyle=water;ctx.fill();ctx.clip();
          ctx.strokeStyle='rgba(218,250,238,.65)';ctx.lineWidth=1;
          for(var ripple=0;ripple<3;ripple++){
            var rx=p.x-18+variation(c,ripple+91)*25,ry=p.y-8+ripple*7;
            ctx.beginPath();ctx.moveTo(rx,ry);ctx.quadraticCurveTo(rx+5,ry+3,rx+12,ry+2);ctx.stroke();
          }
          ctx.restore();
        }
        if(c.cover==='forest'){
          [[-12,-4],[10,3]].forEach(function(off,i){tree(ctx,p.x+off[0],p.y+off[1],29+variation(c,i+112)*15,variation(c,i+122)>.42);});
        }else if((c.cover==='grass'&&c.surface<2)||c.cover==='basin'){
          for(var blade=0;blade<3;blade++){
            var bx=p.x+(blade-1)*12,by=p.y+(blade-1)*4;
            if(c.cover==='basin'){bx=p.x+(blade-1)*23;by=p.y+7;}
            ctx.strokeStyle=c.cover==='basin'?'#2e6748':'#5b854b';ctx.lineWidth=1.2;
            ctx.beginPath();ctx.moveTo(bx-3,by-3);ctx.lineTo(bx,by+1);ctx.lineTo(bx+2,by-5);ctx.stroke();
          }
        }
        if(s.showGrid){ctx.lineWidth=.8;polygon(ctx,pts,null,'rgba(28,66,51,.32)');}

      }
    });
    if(s.lens==='flow'){
      var rain=s.run&&!s.run.complete&&s.world.minutes-s.run.start.minutes<s.run.forcing.duration?K.rainDuring(s.run.forcing,s.world.minutes-s.run.start.minutes,.25):0;
      var routes=K.diagnose(s.world,rain).routes, count=0, strongest={};
      routes.forEach(function(r){if(!strongest[r.from]||r.flowM3s>strongest[r.from].flowM3s)strongest[r.from]=r;});
      routes.forEach(function(route){
        if(route.flowM3s<.00001||(route.from!==s.selected&&strongest[route.from]!==route))return;
        var a=projection(s.world.cells[route.from]),b=route.to<0?{x:a.x-39,y:a.y+24}:projection(s.world.cells[route.to]);
        var dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length;
        var start={x:a.x+dx*.13,y:a.y+dy*.13},end={x:a.x+dx*.76,y:a.y+dy*.76};
        ctx.lineCap='round';ctx.lineWidth=5;ctx.strokeStyle='#153d38';ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(end.x,end.y);ctx.stroke();
        ctx.lineWidth=2;ctx.strokeStyle='#fff8b5';ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(end.x,end.y);ctx.stroke();
        polygon(ctx,[end,{x:end.x-ux*9-uy*4,y:end.y-uy*9+ux*4},{x:end.x-ux*9+uy*4,y:end.y-uy*9-ux*4}],'#fff8b5','#153d38');count++;
      });canvas.dataset.flowArrows=String(count);ctx.lineCap='butt';
    } else canvas.dataset.flowArrows='0';
    var changes=0;
    if(s.showChanges&&s.baseline){ctx.setLineDash([5,3]);ctx.lineWidth=3;s.world.cells.forEach(function(c,i){if(c.cover!==s.baseline.run.start.cells[i].cover){polygon(ctx,corners(c),null,'#713ca3');changes++;}});ctx.setLineDash([]);}
    canvas.dataset.changedCells=String(changes);
    var selected=s.world.cells[s.selected],ps=corners(selected);ctx.lineWidth=5;polygon(ctx,ps,null,'#245148');ctx.lineWidth=2.5;polygon(ctx,ps,null,'#fff3a3');ctx.lineWidth=1;
    var sp=projection(selected);ctx.fillStyle='#133e39';ctx.beginPath();ctx.arc(sp.x,sp.y-36,11,0,7);ctx.fill();ctx.strokeStyle='#fff';ctx.beginPath();ctx.moveTo(sp.x,sp.y-42);ctx.lineTo(sp.x,sp.y-30);ctx.moveTo(sp.x-6,sp.y-36);ctx.lineTo(sp.x+6,sp.y-36);ctx.stroke();
    var raining=s.run&&!s.run.complete&&s.world.minutes-s.run.start.minutes<s.run.forcing.duration;
    if(raining){ctx.strokeStyle='rgba(35,91,113,.35)';ctx.lineWidth=1.4;for(var i=0;i<Math.min(100,15+K.rainAt(s.run.forcing,s.world.minutes-s.run.start.minutes));i++){var rx=165+(i*97)%650,ry=85+(i*67+(s.world.minutes*5))%320;ctx.beginPath();ctx.moveTo(rx,ry);ctx.lineTo(rx-4,ry+11);ctx.stroke();}}
    ctx.fillStyle='#17483f';ctx.font='700 15px system-ui';ctx.fillText(s.lens==='difference'?'WATER DIFFERENCE · SAME MINUTE':s.lens==='soil'?'SOIL MOISTURE':s.lens==='flow'?'FOLLOW THE FLOW':'A LIVING WATERSHED',25,32);
    ctx.font='12px system-ui';ctx.fillText(raining?'Rain reaches the valley · '+n(K.rainAt(s.run.forcing,s.world.minutes-s.run.start.minutes),1)+' mm/hour':'Prescribed weather · '+(s.run?'rain has stopped':'ready to explore'),25,54);
    ctx.fillStyle='#214d45';ctx.font='12px system-ui';ctx.fillText('20 m per cell · heights and water depth exaggerated for visibility',25,538);
    canvas.dataset.differenceMinute=s.spatial?String(s.spatial.minute):'';canvas.dataset.differenceStore=s.lens==='difference'?s.differenceStore:'';
    canvas.dataset.waterVolume=n(K.measure(s.world).surfaceM3,4);canvas.dataset.modelTime=String(s.world.minutes);
  }
  function hit(canvas,event,w){var r=canvas.getBoundingClientRect(),x=(event.clientX-r.left)*900/r.width,y=(event.clientY-r.top)*560/r.height;
    var best=-1,distance=Infinity;w.cells.forEach(function(c,i){var p=projection(c),d=Math.abs((x-p.x)/39)+Math.abs((y-p.y)/18);if(d<1.15&&d<distance){distance=d;best=i;}});return best;}
  function chart(h,s,inspectTime){if(!s.run&&!s.baseline)return h('div',{className:'ww-panel',style:{marginTop:12,minHeight:150,display:'grid',placeItems:'center'}},h('p',null,'Run a storm to reveal the stream response.'));var a=s.run?s.run.samples:[],b=s.baseline?s.baseline.run.samples:[],maxT=Math.max(1,...a.map(function(v){return v.t;}),...b.map(function(v){return v.t;})),maxQ=Math.max(.001,...a.map(function(v){return v.q;}),...b.map(function(v){return v.q;}));
    function line(data){return data.map(function(v){return (48+v.t/maxT*530)+','+(160-v.q/maxQ*125);}).join(' ');}
    return h('svg',{viewBox:'0 0 600 205',className:'ww-graph',role:'img','aria-label':'Outlet flow over time. Solid teal is this run; dashed purple is the pinned baseline. The data table provides exact readings.'},
      s.run&&h('rect',{x:48,y:28,width:530*Math.min(maxT,s.run.forcing.duration)/maxT,height:132,fill:'#228bb1',opacity:.10}),
      inspectTime!=null&&h('line',{x1:48+inspectTime/maxT*530,x2:48+inspectTime/maxT*530,y1:28,y2:160,stroke:'currentColor',strokeWidth:2,strokeDasharray:'3 3'}),
      h('path',{d:'M48 28V160H580',fill:'none',stroke:'currentColor',strokeWidth:1}),
      [0,.5,1].map(function(f){return h('g',{key:f},h('line',{x1:48,x2:580,y1:160-f*125,y2:160-f*125,stroke:'currentColor',opacity:.14}),h('text',{x:43,y:164-f*125,textAnchor:'end',fontSize:11,fill:'currentColor'},n(maxQ*f,maxQ<.01?4:3)));}),
      b.length>0&&h('polyline',{points:line(b),fill:'none',stroke:s.level==='notice'?'#855cc9':'#9166bc',strokeWidth:3,strokeDasharray:'7 5'}),
      a.length>0&&h('polyline',{points:line(a),fill:'none',stroke:'#238976',strokeWidth:3}),
      h('text',{x:48,y:184,fontSize:11,fill:'currentColor'},'0'),h('text',{x:578,y:184,textAnchor:'end',fontSize:11,fill:'currentColor'},n(maxT,0)+' min'),h('text',{x:48,y:18,fontSize:12,fill:'currentColor'},'Outlet flow (m³/s)'));
  }
  function rainProfile(h,forcing,label){
    var first=K.rainAt(forcing,0),second=K.rainAt(forcing,forcing.duration/2);
    return h('div',{className:'ww-rain-profile'},h('p',{className:'ww-caption'},label+' · '+K.patterns[K.settings(forcing).pattern]+' · '+n(forcing.rain*forcing.duration/60,1)+' mm total'),
      h('div',{style:{display:'flex',height:48,alignItems:'end',gap:4,marginTop:6},'aria-hidden':true},[first,second].map(function(v,i){return h('div',{key:i,style:{width:'50%',height:(v/150*100)+'%',minHeight:2,background:'#287ba1',borderRadius:'3px 3px 0 0'}});})),
      h('p',{className:'ww-caption'},'0–'+n(forcing.duration/2,1)+' min: '+n(first,1)+' mm/h; '+n(forcing.duration/2,1)+'–'+n(forcing.duration,1)+' min: '+n(second,1)+' mm/h.'));
  }
  function View(props) {
    var React=props.React,h=React.createElement;
    var pair=React.useState(function(){var restored=K.restore(props.saved);if(!props.saved){var grade=String(props.gradeLevel||'').toLowerCase();if(/kindergarten|^k$|1st|2nd/.test(grade))restored.level='notice';else if(/9th|10th|11th|12th|high/.test(grade))restored.level='model';}return restored;}),s=pair[0],set=pair[1];
    var notice=React.useState('Select a patch of ground, then start a storm.'),message=notice[0],say=notice[1];
    var inspection=React.useState(null),inspect=inspection[0],setInspect=inspection[1];
    var gridToggle=React.useState(false),showGrid=gridToggle[0],setShowGrid=gridToggle[1];
    var changeToggle=React.useState(false),showChanges=changeToggle[0],setShowChanges=changeToggle[1];
    var inspecting=!!(inspect&&inspect.run===s.run&&s.run&&s.run.complete),inspectTime=inspecting?inspect.time:null;
    var shown=React.useMemo(function(){return inspecting?K.atTime(s.run,inspectTime):s.world;},[s.world,s.run,inspecting,inspectTime]);
    var canCompare=!!(s.run&&s.run.complete&&K.comparison(s).fair),effectiveLens=s.lens==='difference'&&!canCompare?'water':s.lens;
    var spatial=React.useMemo(function(){return effectiveLens==='difference'?K.spatialDifference(s,inspecting?inspectTime:undefined):null;},[s.run,s.baseline,s.world,effectiveLens,inspecting,inspectTime]);
    var canvas=React.useRef(null),save=React.useRef(props.onSave);save.current=props.onSave;
    React.useEffect(function(){if(!document.getElementById('water-worlds-style')){var st=document.createElement('style');st.id='water-worlds-style';st.textContent=CSS;document.head.appendChild(st);}},[]);
    React.useEffect(function(){if(save.current)save.current(s);},[s]);
    React.useEffect(function(){var sceneRun=inspecting?Object.assign({},s.run,{complete:inspectTime>=s.run.forcing.duration+60}):s.run;draw(canvas.current,Object.assign({},s,{world:shown,run:sceneRun,showChanges:showChanges,showGrid:showGrid,lens:effectiveLens,spatial:spatial}));},[s,shown,inspecting,inspectTime,showChanges,showGrid,effectiveLens,spatial]);
    React.useEffect(function(){if(!s.running)return;var id=setInterval(function(){set(function(old){return K.advance(old,1);});},250);return function(){clearInterval(id);};},[s.running]);
    React.useEffect(function(){if(s.run&&s.run.complete)say('Run complete. Water is still stored in the valley. Pin a baseline or start another storm.');},[s.run&&s.run.complete]);
    var active=!!(s.run&&!s.run.complete),m=K.measure(shown),cell=shown.cells[s.selected];
    var elapsed=s.run?shown.minutes-s.run.start.minutes:0,raining=!!(s.run&&(active||inspecting)&&elapsed<s.run.forcing.duration);
    var diagnostic=K.diagnose(shown,raining?K.rainDuring(s.run.forcing,elapsed,.25):0),local=diagnostic.cells[s.selected],comparison=K.comparison(s);
    function update(p){set(function(old){return Object.assign({},old,p);});}
    function button(label,fn,disabled,primary){return h('button',{type:'button',onClick:fn,disabled:!!disabled,className:primary?'ww-primary':undefined},label);}
    function start(replay){set(function(old){return K.begin(old,replay);});say(replay==='timing'?'Testing your rainfall pattern from the baseline’s initial water and ground cover. Mean rain and duration are fixed.':replay?'Replaying baseline weather and water stores with your current ground cover.':'Storm started from the water currently stored in the valley.');}
    function edit(cover,patch){if(inspecting)return;var ids=[s.selected];if(patch){ids=[];for(var y=Math.max(0,cell.y-1);y<=Math.min(K.rows-1,cell.y+1);y++)for(var x=Math.max(0,cell.x-1);x<=Math.min(K.cols-1,cell.x+1);x++)ids.push(y*K.cols+x);}
      var count=ids.filter(function(i){return s.world.cells[i].cover!=='stream'&&s.world.cells[i].cover!==cover;}).length;
      set(function(old){return K.edit(old,ids,cover);});say(count?count+' '+(count===1?'cell changed':'cells changed')+' to '+K.covers[cover].label+'. Stored water is preserved. You can undo this edit.':'This ground already has that cover. Your result is unchanged.');}
    function select(i){update({selected:i});say('Cell '+(i%K.cols+1)+', row '+(Math.floor(i/K.cols)+1)+': '+K.covers[s.world.cells[i].cover].label+'.');}
    function field(key,label,min,max,step,unit){return h('label',{className:'ww-field',htmlFor:'ww-'+key},h('span',{className:'ww-field-head'},label,h('output',null,s.settings[key]+unit)),h('input',{id:'ww-'+key,'aria-label':label,type:'range',min:min,max:max,step:step,value:s.settings[key],disabled:active,onChange:function(e){var v=Number(e.target.value);set(function(old){return Object.assign({},old,{settings:Object.assign({},old.settings,{[key]:v})});});}}));}
    function download(asText){var blob=new Blob([asText?K.report(s):JSON.stringify(K.evidence(s),null,2)],{type:asText?'text/plain;charset=utf-8':'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='water-worlds-investigation.'+(asText?'txt':'json');document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);say('Downloaded the model conditions, time series, baseline, and your explanation.');}
    var levels={notice:'Notice · simple observations',investigate:'Investigate · fair comparisons',model:'Model · water accounting'};
    var prompts={notice:'Where did the rain go? Point to a wet place and a dry place. What changed?',investigate:'Keep the storm and starting water the same. Change the land cover. Which evidence supports your explanation?',model:'Account for input, output, and storage. Does a lower peak also mean less total outflow? Which assumptions limit your conclusion?'};
    var questions={free:'My own question',cover:'Can changing the ground change the stream?',retention:'Can a garden hold back a storm?',memory:'Does the valley remember rain?',timing:'Does the timing of rain matter?'};
    var guides={
      timing:{notice:['Run a storm and pin it as a baseline.','Choose heavier rain in the other half. Use Test rainfall timing.','Watch when the stream grows.'],investigate:['Pin a completed baseline, then choose a different rainfall pattern.','Use Test rainfall timing to keep cover, starting water, total rain, and duration fixed.','Compare peak flow and total outflow, and inspect the midpoint of the storm.'],model:['Predict how the rainfall sequence interacts with changing soil storage.','Use Test rainfall timing; compare equal-depth storms from identical initial conditions.','Explain differences in the hydrograph, recognizing that the observation ends 60 minutes after rain stops.']},
      cover:{notice:['Watch where water gathers on paving.','Change a patch to woodland and replay the baseline.','Point to something that changed.'],investigate:['Finish and pin a baseline storm.','Change one patch. Replay baseline weather to keep the initial water and rain identical.','Compare peak flow, total outflow, and water remaining.'],model:['Predict how cover changes infiltration and surface storage.','Use baseline replay to isolate the cover change.','Compare peak and cumulative outflow; account for stored water and evaporation.']},
      retention:{notice:['Find a low patch and make a retention garden.','Watch it fill during the rain.','Does any water leave the garden?'],investigate:['Pin a storm before adding a retention garden.','Add one garden patch and replay the baseline.','Inspect the garden during rain and after rain. Does it delay flow, reduce it, or both?'],model:['Use the 28 mm depression threshold to predict overflow.','Keep rainfall and initial water fixed with baseline replay.','Distinguish peak reduction, storage change, and water that may leave after the observation window.']},
      memory:{notice:['Run a storm and look at the wet soil.','Start another storm with the same rain settings.','What did the valley keep from the first storm?'],investigate:['Pin the first completed storm. Keep cover and rain settings unchanged.','Start another storm to retain the first storm’s water.','Compare the runs as a sequence: initial water differs, so this is not a controlled cover test.'],model:['Keep cover, rainfall intensity, and duration fixed.','Start a second storm from the final water stores of the first.','Explain changes using antecedent storage and infiltration; do not label the sequence a cover-only comparison.']}
    };
    var r=s.run?K.result(s.world,s.run):null,visibleResult=s.run?K.result(shown,s.run):null,br=s.baseline?K.result(s.baseline.world,s.baseline.run):null;
    return h('section',{className:'ww'+(props.isDark?' is-dark':''),'aria-labelledby':'ww-title','data-water-worlds':true},
      h('div',{className:'ww-heading'},h('div',null,h('span',{className:'ww-kicker'},'OPEN INVESTIGATION'),h('h2',{id:'ww-title'},'Water Worlds'),h('p',null,'Shape the ground. Follow a storm. Discover what the valley remembers.')),
        h('label',null,'Learning lens',h('select',{'aria-label':'Learning lens',value:s.level,onChange:function(e){update({level:e.target.value});}},Object.keys(levels).map(function(k){return h('option',{value:k,key:k},levels[k]);})))),
      h('div',{className:'ww-main'},h('div',{className:'ww-world'},
        h('div',{className:'ww-scene'},h('canvas',{ref:canvas,width:900,height:560,tabIndex:0,role:'img','aria-label':'Interactive valley. Click a ground cell or use arrow keys to select. Ground-cell selector below offers the same control. Readings are shown beneath the scene.',
          onClick:function(e){var i=hit(canvas.current,e,s.world);if(i>=0)select(i);},onKeyDown:function(e){var v={ArrowLeft:-1,ArrowRight:1,ArrowUp:-K.cols,ArrowDown:K.cols}[e.key];if(v){e.preventDefault();var x=s.selected%K.cols,y=Math.floor(s.selected/K.cols);if((e.key==='ArrowLeft'&&x===0)||(e.key==='ArrowRight'&&x===K.cols-1)||(e.key==='ArrowUp'&&y===0)||(e.key==='ArrowDown'&&y===K.rows-1))return;select(s.selected+v);}}},'The valley is also available through the ground-cell selector and readings.'),
          h('div',{className:'ww-scene-bar'},h('div',null,h('div',{className:'ww-time'},s.run?n(elapsed,0)+' min · '+(inspecting?'Inspecting recorded time':s.run.complete?'Run complete':raining?'Rain falling':'After the rain'):'Ready for the first storm'),h('span',null,s.run?'Rain at this minute: '+n(K.rainAt(s.run.forcing,elapsed),1)+' mm/h · '+K.patterns[K.settings(s.run.forcing).pattern]:'3.84 hectares · water persists between storms')),
            h('div',{className:'ww-tools'},['water','soil','flow','difference'].map(function(l){return h('button',{type:'button',key:l,'aria-pressed':effectiveLens===l,disabled:l==='difference'&&!canCompare,onClick:function(){update({lens:l});}},l==='water'?'Surface water':l==='soil'?'Soil moisture':l==='flow'?'Flow paths':'Differences');}))),
          h('p',{className:'ww-flow-note'},effectiveLens==='difference'?'Current minus baseline at '+n(spatial.minute,0)+' minutes. Both runs use the same initial water and rainfall. More or less water in one store is not a score.':effectiveLens==='flow'?'Arrows show each cell’s strongest surface transfer in the next 15-second model step. The selected cell shows all its routes. Tiny flows are hidden; arrow size does not represent speed.':effectiveLens==='soil'?'Darker blue means more water in the soil. Select a cell to read how much space remains.':'Water collects in low ground and retention gardens. Select a cell to inspect its stores.'),
          spatial&&h('div',{className:'ww-difference'},
            h('label',null,'Compare water store',h('select',{'aria-label':'Compare water store',value:s.differenceStore,onChange:function(e){update({differenceStore:e.target.value});}},[['surface','Surface water'],['soil','Soil water'],['ground','Delayed subsurface water']].map(function(v){return h('option',{key:v[0],value:v[0]},v[1]);}))),
            h('div',{className:'ww-difference-key'},h('span',null,h('b',{style:{background:'#ecd7c6',color:'#673b20'}},'−'),'Less water'),h('span',null,h('b',{style:{background:'#d5e9f3',color:'#164c65'}},'+'),'More water')),
            h('p',{className:'ww-caption'},'Fixed scale: colors deepen up to ±10 mm. Cells within 0.05 mm are neutral; exact readings are below. '+(s.differenceStore==='soil'?'More soil water can mean more retained rain, but also less room for the next storm.':s.differenceStore==='ground'?'Delayed water can feed the stream later; it is not a water-table height.':'Less surface water can accompany infiltration or movement elsewhere; check the other stores too.')),
            h('p',{className:'ww-caption'},'Whole-valley difference in this store: '+signed(spatial.totalsM3[s.differenceStore],2)+' m³.')),
          !canCompare&&h('p',{className:'ww-flow-note'},'To unlock Differences: pin a completed baseline, replay its weather, then finish that run.'),
          h('label',{className:'ww-check'},h('input',{type:'checkbox',checked:showGrid,onChange:function(e){setShowGrid(e.target.checked);}}),'Show ground-cell grid'),
        s.baseline&&h('label',{className:'ww-check'},h('input',{type:'checkbox',checked:showChanges,onChange:function(e){setShowChanges(e.target.checked);}}),'Highlight changed land · '+comparison.changedCells+' cells'),
          h('p',{className:'ww-flow-note'},'Each cell is 20 m across. Terrain, soil bands, plants, and visible water depth are illustrative, not to scale.')),
        h('div',{className:'ww-metrics'},[['Rain in',visibleResult?visibleResult.rainfallM3:0,'m³'],['Water at surface',m.surfaceM3,'m³'],['Left through stream',visibleResult?visibleResult.outflowM3:0,'m³'],['Peak streamflow',visibleResult?visibleResult.peakM3s:0,'m³/s']].map(function(v){return h('div',{className:'ww-metric',key:v[0]},h('span',null,v[0]),h('strong',null,n(v[1],v[2]==='m³/s'?3:1)),h('span',null,v[2]));})),
        s.run&&s.run.complete&&h('div',{className:'ww-timeline'},
          h('h3',null,'Revisit this storm'),
          h('label',{htmlFor:'ww-inspect-time'},'Inspection minute · '+n(elapsed,0)),
          h('input',{id:'ww-inspect-time','aria-label':'Inspection minute',type:'range',min:0,max:s.run.forcing.duration+60,step:1,value:inspecting?inspectTime:s.run.forcing.duration+60,onChange:function(e){setInspect({run:s.run,time:Number(e.target.value)});}}),
          h('div',{className:'ww-actions'},button('When rain stops',function(){setInspect({run:s.run,time:s.run.forcing.duration});}),button('Return to final state',function(){setInspect(null);},!inspecting)),
          h('p',{className:inspecting?'ww-caption ww-inspection':'ww-caption'},inspecting?'Inspecting the recorded past. The scene, gauges, and selected-cell readings show this minute. The comparison and exports retain the completed result. Return to the final state to edit land.':'Scrub through the completed run to follow rainfall and drainage. Inspection does not alter water or recorded evidence.')),
        h('div',{className:'ww-actions'},button(active?(s.running?'Pause':'Resume'):'Start '+(s.world.minutes?'another storm':'storm'),function(){if(active)update({running:!s.running});else start(false);},false,true),
          button('Advance 15 min',function(){set(function(old){return K.advance(Object.assign({},old,{running:false}),15);});say('Advanced the water model by up to 15 minutes.');},!active),
          button('Finish this run',function(){set(function(old){return K.advance(old,240);});},!active)),
        h('div',{className:'ww-status',role:'status','aria-live':'polite'},message),
        h('p',{className:'ww-caption'},'Each run follows the storm plus 60 minutes of drainage. Play advances one model minute every quarter second; pause and step at your own pace.'),
        h('div',{className:'ww-legend'},Object.keys(K.covers).map(function(c){return h('span',{key:c},h('i',{className:'ww-key',style:{background:K.covers[c].color}}),K.covers[c].label);}))),
      h('div',{className:'ww-controls',role:'group','aria-label':'Watershed controls'},
        h('div',{className:'ww-panel'},h('h3',null,'The next storm'),field('rain','Mean rainfall',5,100,5,' mm/h'),field('duration','Rain duration',10,120,5,' min'),
          h('label',{className:'ww-field'},'Rainfall pattern',h('select',{'aria-label':'Rainfall pattern',value:s.settings.pattern,disabled:active,onChange:function(e){var value=e.target.value;set(function(old){return Object.assign({},old,{settings:Object.assign({},old.settings,{pattern:value})});});}},Object.keys(K.patterns).map(function(k){return h('option',{value:k,key:k},K.patterns[k]);}))),
          rainProfile(h,s.settings,'Next storm'),
          h('p',{className:'ww-caption'},'Same mean rain and duration give the same total water. Patterns redistribute it between the two halves.'),
          h('details',null,h('summary',null,'Starting soil wetness'),field('wetness','Soil filled',0,100,5,'%'),button('Reset valley water',function(){set(function(old){return Object.assign({},old,{world:K.create(old.settings.wetness),run:null,running:false,editHistory:[]});});say('Valley water and cover reset. Your pinned baseline is retained.');},active||inspecting),h('p',{className:'ww-caption'},'Applies when you reset. Reset restores the original ground cover; a second storm keeps current water.'))),
        h('div',{className:'ww-panel'},h('h3',null,'Selected ground'),h('label',null,'Ground cell',h('select',{'aria-label':'Ground cell',value:s.selected,onChange:function(e){select(Number(e.target.value));}},s.world.cells.map(function(c,i){return h('option',{key:i,value:i},'Column '+(c.x+1)+', row '+(c.y+1)+' · '+K.covers[c.cover].label);}))),
          spatial&&h('div',{className:'ww-difference-readout','data-ww-cell-difference':spatial.cells[s.selected][s.differenceStore].differenceMm},
            h('h3',null,'Same cell · same minute'),
            h('div',{className:'ww-detail'},h('span',null,'Pinned baseline'),h('strong',null,n(spatial.cells[s.selected][s.differenceStore].baselineMm,2)+' mm')),
            h('div',{className:'ww-detail'},h('span',null,'This run'),h('strong',null,n(spatial.cells[s.selected][s.differenceStore].currentMm,2)+' mm')),
            h('div',{className:'ww-detail'},h('span',null,'Difference'),h('strong',null,signed(spatial.cells[s.selected][s.differenceStore].differenceMm,2)+' mm'))),
          h('div',{className:'ww-detail'},h('span',null,'Surface depth'),h('strong',null,n(cell.surface)+' mm')),
          h('div',{className:'ww-detail'},h('span',null,'Soil filled'),h('strong',null,n(cell.soil/120*100,0)+'%')),
          h('div',{className:'ww-soil-meter','aria-hidden':true},h('i',{style:{width:(cell.soil/120*100)+'%'}})),
          h('div',{className:'ww-cutaway','aria-label':'Water stores in the selected cell'},
            h('div',{className:'ww-layer'},h('strong',null,'On the surface · '+n(cell.surface)+' mm'),h('span',null,cell.cover==='basin'?'Retention threshold: 28 mm. Water above this can flow downhill.':'Water above '+n(K.covers[cell.cover].depression)+' mm can flow toward lower water surfaces.')),
            h('div',{className:'ww-layer ww-layer-soil'},h('strong',null,'In the soil · '+n(cell.soil)+' / 120 mm'),h('span',null,n(120-cell.soil)+' mm of modeled storage remains.'),h('div',{className:'ww-soil-meter','aria-hidden':true},h('i',{style:{width:(cell.soil/120*100)+'%'}}))),
            h('div',{className:'ww-layer ww-layer-ground'},h('strong',null,'Delayed drainage · '+n(cell.ground,2)+' mm'),h('span',null,'Releases gradually into the stream.'))),
          h('details',null,h('summary',null,'What happens next?'),
            h('p',{className:'ww-caption'},'During the next 15 seconds of model time with the weather currently reaching the valley:'),
            h('div',{className:'ww-detail'},h('span',null,'Surface → soil'),h('strong',null,n(local.infiltrationMm,3)+' mm')),
            h('div',{className:'ww-detail'},h('span',null,'Soil → delayed storage'),h('strong',null,n(local.drainageMm,3)+' mm')),
            h('div',{className:'ww-detail'},h('span',null,'Delayed storage → stream'),h('strong',null,n(local.releaseMm,3)+' mm')),
            h('p',{className:'ww-caption'},'Surface flow from this cell: '+(diagnostic.routes.filter(function(v){return v.from===s.selected;}).map(function(v){return (v.to<0?'out of the valley':'column '+(v.to%K.cols+1)+', row '+(Math.floor(v.to/K.cols)+1))+' ('+n(v.depthMm,3)+' mm)';}).join('; ')||'none in the next step')+'.'),
            h('p',{className:'ww-caption'},'These arrows connect water stores. Millimetres describe water volume spread over this cell, not soil-layer thickness or water-table depth.')),
          h('p',{className:'ww-caption'},cell.cover==='stream'?'Stream beds stay connected. Select land to change its cover.':'Change a cell or the surrounding 3 × 3 patch. Stream beds stay unchanged.'),
          ['grass','forest','paved','basin'].map(function(c){return h('div',{className:'ww-actions',key:c},button(K.covers[c].label,function(){edit(c,false);},active||inspecting||cell.cover==='stream'),button('Patch: '+K.covers[c].label,function(){edit(c,true);},active||inspecting));}),
          h('div',{className:'ww-actions'},button('Undo land edit',function(){set(function(old){return K.undo(old);});say('Restored the previous ground cover and its completed result, if available.');},active||inspecting||!s.editHistory||!s.editHistory.length)),
          active&&h('p',{className:'ww-caption'},'Finish this run before changing the ground. This keeps each experiment interpretable.')))),
      s.run&&h('div',{className:'ww-panel',style:{marginTop:16}},h('h3',null,'Recorded rainfall'),rainProfile(h,s.run.forcing,'This run'),s.baseline&&rainProfile(h,s.baseline.run.forcing,'Pinned baseline')),
      h('div',{className:'ww-bottom'},h('div',{className:'ww-panel'},h('h3',null,'Compare the stream'),chart(h,s,inspectTime),
        h('div',{className:'ww-legend'},h('span',null,'━ This run'),h('span',null,'┄ Pinned baseline'),h('span',null,'Shading: rain during current run')),
        h('div',{className:'ww-actions'},button('Pin this baseline',function(){set(function(old){return K.record(old);});say('Baseline pinned. Change ground cover, then replay its weather and initial water stores.');},!s.run||!s.run.complete||inspecting),button('Replay baseline weather',function(){start(true);},!s.baseline||active),button('Test rainfall timing',function(){start('timing');},!s.baseline||active)),
        s.baseline&&h('p',{className:'ww-caption'},'Timing test uses the selected pattern with the baseline’s cover, starting water, mean rain, and duration. Current land edits are replaced by baseline cover.'),
        h('p',{className:'ww-caption'},K.timingComparison(s)?'Timing comparison: cover, initial water, total rain, and duration match. Only the pattern can differ.':comparison.fair?'Fair comparison: identical initial water stores and rainfall. Only ground cover can differ.':'Starting another storm retains water from the previous one. Use baseline replay to isolate ground-cover changes.'),
        br&&r&&s.run.complete&&(comparison.fair||K.timingComparison(s))&&h('div',{className:'ww-comparison','data-ww-comparison':true},
          h('strong',null,K.timingComparison(s)?'Same amount of rain. Different timing?':'Same storm. What changed?'),
          h('p',null,difference('Peak streamflow',r.peakM3s,br.peakM3s,3,'m³/s')),
          h('p',null,difference('Total outflow',r.outflowM3,br.outflowM3,1,'m³')+' Compare both: peak flow and total outflow answer different questions.'),
          h('p',null,'Water still stored can leave later. This comparison ends 60 minutes after the rain stops.')),
        br&&h('table',null,h('caption',null,'Baseline and current run'+(s.run&&!s.run.complete?' · current run still in progress':'')),h('thead',null,h('tr',null,h('th',{scope:'col'},'Measure'),h('th',{scope:'col'},'Baseline'),h('th',{scope:'col'},'Current'))),h('tbody',null,[['Peak (m³/s)','peakM3s',3],['Outflow (m³)','outflowM3',1],['Storage change (m³)','storageChangeM3',1]].map(function(v){return h('tr',{key:v[1]},h('th',{scope:'row'},v[0]),h('td',null,n(br[v[1]],v[2])),h('td',null,r?n(r[v[1]],v[2]):'—'));}))),
        spatial&&h('details',null,h('summary',null,'Read cell-by-cell differences'),h('div',{className:'ww-table-scroll',tabIndex:0,role:'region','aria-label':'Cell water differences'},h('table',null,
          h('caption',null,'At '+n(spatial.minute,0)+' min · '+s.differenceStore+' water (mm)'),
          h('thead',null,h('tr',null,['Cell','Baseline','Current','Difference'].map(function(t){return h('th',{scope:'col',key:t},t);}))),
          h('tbody',null,spatial.cells.map(function(c){var d=c[s.differenceStore];return h('tr',{key:c.index},h('th',{scope:'row'},c.column+', '+c.row),h('td',null,n(d.baselineMm,2)),h('td',null,n(d.currentMm,2)),h('td',null,signed(d.differenceMm,2)));}))))),
        h('details',null,h('summary',null,'Read the time-series table'),h('div',{className:'ww-table-scroll',tabIndex:0,role:'region','aria-label':'Current-run readings'},h('table',null,h('caption',null,'Current run · one-minute samples'),h('thead',null,h('tr',null,['Minute','Flow (m³/s)','Surface (m³)','Soil (m³)'].map(function(t){return h('th',{key:t,scope:'col'},t);}))),h('tbody',null,(s.run?s.run.samples:[]).map(function(v){return h('tr',{key:v.t},h('th',{scope:'row'},n(v.t,0)),h('td',null,n(v.q,3)),h('td',null,n(v.surface)),h('td',null,n(v.soil)));}))))),
        s.level==='model'&&h('div',null,h('h3',null,'Water accounting'),h('p',{className:'ww-caption'},'Initial storage + rainfall − outflow − evaporation = current storage. Internal transfers cancel.'),
          h('div',{className:'ww-detail'},h('span',null,'Final/current soil / delayed subsurface'),h('strong',null,n(K.measure(s.world).soilM3)+' / '+n(K.measure(s.world).groundM3)+' m³')),
          h('div',{className:'ww-detail'},h('span',null,'Evaporation during run'),h('strong',null,n(r?r.evaporationM3:0,2)+' m³')),
          h('div',{className:'ww-detail'},h('span',null,'Balance error'),h('strong',{'data-ww-balance':K.measure(s.world).errorM3},K.measure(s.world).errorM3.toExponential(2)+' m³')))),
      h('div',{className:'ww-panel'},h('h3',null,'Your investigation'),h('p',null,prompts[s.level]),
        h('label',{className:'ww-field'},'Choose an investigation',h('select',{'aria-label':'Choose an investigation',value:s.question,onChange:function(e){update({question:e.target.value});}},Object.keys(questions).map(function(q){return h('option',{key:q,value:q},questions[q]);}))),
        s.question!=='free'&&h('div',{className:'ww-guide','data-ww-guide':true},h('strong',null,questions[s.question]),h('ol',null,guides[s.question][s.level].map(function(step,i){return h('li',{key:i},step);})),h('p',{className:'ww-caption'},'These prompts do not change your storm, cover, or writing.')),
        s.question==='free'&&h('p',{className:'ww-caption'},'Try following one patch through time, testing a garden, or comparing two consecutive storms.'),
        h('label',{className:'ww-field'},'My prediction',h('textarea',{'aria-label':'My prediction',rows:2,maxLength:1000,value:s.prediction,onChange:function(e){update({prediction:e.target.value});},placeholder:s.level==='notice'?'I think the water will…':'I predict… because…'})),
        h('label',{className:'ww-field'},'My explanation',h('textarea',{'aria-label':'My explanation',rows:4,maxLength:2000,value:s.reflection,onChange:function(e){update({reflection:e.target.value});},placeholder:s.level==='notice'?'I noticed…':'What changed? Cite a reading. What can this model not tell you?'})),
        h('p',{className:'ww-caption'},'You can also explain aloud, draw, or discuss with a partner. Recording a run does not grade your understanding.'),
        h('div',{className:'ww-actions'},button('Download investigation',function(){download(false);},!s.run&&!s.baseline),button('Download readable report',function(){download(true);},!s.run&&!s.baseline)))),
      h('p',{className:'ww-boundary'},'Teaching model, not a flood forecast. Rainfall is prescribed. Infiltration fills soil; only some soil water drains into delayed subsurface storage. Evaporation leaves this local valley. The model uses simplified flow and constant mild evaporative demand; it does not resolve aquifer pressure, erosion, snow, or cloud feedback. Surface depths are exaggerated in the picture.'));
  }
  root.WaterWorldsView=View;
})(window);
