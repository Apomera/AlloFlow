const fs=require('node:fs');
const p='stem_lab/stem_tool_geometryworld.js';
let s=fs.readFileSync(p,'utf8');
function edit(a,b){if(!s.includes(a))throw Error('Missing anchor: '+a.slice(0,100));s=s.replace(a,b);}
const styles=[
 '.gw-root .gw-touch-actions{gap:6px!important;right:12px!important}.gw-root .gw-touch-actions button{box-sizing:border-box;width:64px!important;height:48px!important;min-width:64px!important;min-height:48px!important;padding:3px!important;border:1px solid #afc7b677!important;border-radius:13px!important;background:#153d34f2!important;color:#f5f0e5!important;box-shadow:0 4px 14px #06251e3d,inset 0 1px 0 #edf3dc12;touch-action:manipulation!important}.gw-root .gw-touch-actions button[data-gw-touch-action="place"]{background:#d4e8ca!important;border-color:#edf5e4!important;color:#173b35!important}.gw-root .gw-touch-actions button[data-gw-touch-action="break"]{color:#ffd3bd!important;border-color:#edc5ae66!important}.gw-root .gw-touch-actions button:disabled{opacity:.44;box-shadow:none;cursor:default}.gw-touch-action-content{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:2px;pointer-events:none}.gw-touch-action-content svg{width:20px;height:20px;display:block}.gw-touch-action-name{font-size:11px;font-weight:650;line-height:13px;letter-spacing:.01em}',
 '.gw-root .gw-touch-joystick{background:#112d2b66!important;border:1px solid #e1ecd67d!important;box-shadow:inset 0 0 0 5px #e1ecd60a,0 4px 16px #092b252e}.gw-root .gw-touch-joystick-thumb{background:#d4e8cad9!important;border:1px solid #eff5e7;box-shadow:0 3px 10px #092b2566}.gw-root .gw-touch-look-zone{border:none!important;background:transparent!important;opacity:.45!important;width:42px!important;height:42px!important;right:86px!important;top:46%!important}.gw-root .gw-touch-look-zone>.gw-touch-look-label{display:none}.gw-root .gw-touch-look-reticle{border-color:#e1ecd680!important;background:#153d3422!important}.gw-root .gw-touch-mode-hint{background:#153d34ef!important;border-color:#afc7b644!important;color:#e7efdf!important;box-shadow:none;font-weight:600}',
 '.gw-placement-hint{position:absolute;top:calc(50% + 28px);left:50%;transform:translateX(-50%);z-index:25;box-sizing:border-box;display:flex;align-items:center;gap:7px;width:max-content;max-width:min(300px,calc(100% - 36px));padding:7px 11px;border:1px solid #c4dfc770;border-radius:10px;background:#113b30f2;color:#e8f2e0;font-size:12px;font-weight:600;line-height:1.4;pointer-events:none;box-shadow:0 5px 18px #092b2533}.gw-placement-hint[data-allowed="false"]{background:#502f29f2;border-color:#ecc3a3aa;color:#ffe3cc}.gw-placement-hint-mark{display:grid;flex:0 0 auto;place-items:center;width:18px;height:18px;border:1px solid currentColor;border-radius:50%;font-size:12px;font-weight:800}.gw-root .gw-action-feedback{background:#112d2bf2!important;border-color:#c4dfc766!important;color:#f5f0e5!important}',
 '@media(max-width:800px){.gw-placement-hint{top:128px;bottom:auto;left:12px;transform:none;max-width:calc(100% - 174px);padding:7px 8px;font-size:11px;align-items:flex-start}.gw-root:has(.gwe-builder-dock[data-collapsed="false"]) .gw-placement-hint{display:none}}@media(max-height:520px) and (orientation:landscape){.gw-root .gw-touch-actions{width:calc(100% - 170px);max-width:calc(100% - 170px);flex-direction:row!important;flex-wrap:wrap;justify-content:flex-end;bottom:132px!important}.gw-root .gw-touch-actions button{width:58px!important;min-width:58px!important}.gw-placement-hint{top:64px;max-width:190px}}',
 '.theme-contrast .gw-root .gw-touch-actions button,[data-stem-theme="contrast"] .gw-root .gw-touch-actions button{background:#000!important;border-color:#00ff00!important;color:#00ff00!important;box-shadow:none}.theme-contrast .gw-root .gw-touch-actions button[data-gw-touch-action="place"],[data-stem-theme="contrast"] .gw-root .gw-touch-actions button[data-gw-touch-action="place"]{background:#ffff00!important;color:#000!important;border-color:#fff!important}.theme-contrast .gw-root .gw-touch-joystick,[data-stem-theme="contrast"] .gw-root .gw-touch-joystick{background:#000!important;border-color:#fff!important}.theme-contrast .gw-root .gw-placement-hint,[data-stem-theme="contrast"] .gw-root .gw-placement-hint{background:#000!important;border-color:#ffff00!important;color:#ffff00!important}.theme-contrast .gw-root .gw-placement-hint[data-allowed="false"],[data-stem-theme="contrast"] .gw-root .gw-placement-hint[data-allowed="false"]{border-style:dashed}'
];
edit("      '@media(prefers-reduced-motion:reduce){.gw-root button{transition:none!important;}",styles.map(x=>'      '+JSON.stringify(x)+',').join('\n')+"\n      '@media(prefers-reduced-motion:reduce){.gw-root button{transition:none!important;}");
const iconHelper=`  function renderTouchAction(el, icon, label) {
    var paths={
      up:'M12 20V4M5 11l7-7 7 7', down:'M12 4v16M5 13l7 7 7-7',
      place:'M3 7l9-5 9 5v10l-9 5-9-5ZM3 7l9 5 9-5M12 12v10',
      break:'M4 20L16 8M3 6c7-5 13-1 18 4l-3 3C13 8 8 5 3 6Z',
      measure:'M3 16L16 3l5 5L8 21ZM13 6l3 3M9 10l3 3M5 14l3 3',
      talk:'M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6 4V6a2 2 0 0 1 2-2ZM7 9h10M7 13h6',
      undo:'M8 4L3 9l5 5M3 9h10a7 7 0 0 1 0 14'
    };
    return el('span',{className:'gw-touch-action-content'},
      el('svg',{viewBox:'0 0 24 24','aria-hidden':'true',focusable:'false',fill:'none',stroke:'currentColor',strokeWidth:1.5,strokeLinecap:'round',strokeLinejoin:'round'},el('path',{d:paths[icon] || paths.place})),
      el('span',{className:'gw-touch-action-name'},label));
  }

`;
edit('  // Create Three.js geometry for each shape',iconHelper+'  // Create Three.js geometry for each shape');
edit('              if (engine.moveState.sprint && !engine.moveState.forward) flyVertical = -flySpeed;', '              if (engine.moveState.flyDown || (engine.moveState.sprint && !engine.moveState.forward)) flyVertical = -flySpeed;');
edit('              engine.moveState.left = false; engine.moveState.right = false;\n            }\n          }\n        };', '              engine.moveState.left = false; engine.moveState.right = false;\n              engine.moveState.flyUp = false; engine.moveState.flyDown = false; engine._jumpLock = false;\n            }\n          }\n        };');
s=s.replaceAll('engine.flyMode = !engine.flyMode;', "engine.flyMode = !engine.flyMode;\n                if (!engine.flyMode) { engine.moveState.flyUp=false; engine.moveState.flyDown=false; }\n                upd('flyMode', engine.flyMode);");
edit('eng.flyMode = !eng.flyMode; eng.velocity.y = 0;', "eng.flyMode = !eng.flyMode; eng.velocity.y = 0;\n              if (!eng.flyMode) { eng.moveState.flyUp=false; eng.moveState.flyDown=false; }\n              upd('flyMode', eng.flyMode);");
edit("      function beginMobileJump() {\n        if (!engine.flyMode", "      function beginMobileJump() {\n        engine._touchActive = true;\n        if (!engine.flyMode");
edit('          engine.moveState.flyUp = true;\n        }\n      }\n\n      function activateMobileJump()', '          engine.moveState.flyDown = false; engine.moveState.flyUp = true;\n        }\n      }\n\n      function stopMobileJump() {\n        if (!engine || !engine.moveState) return;\n        engine.moveState.flyUp = false; engine._jumpLock = false;\n      }\n\n      function beginMobileDescent() {\n        if (!engine || !engine.flyMode || !engine.moveState) return;\n        engine._touchActive = true;\n        engine.moveState.flyUp = false; engine.moveState.flyDown = true;\n      }\n\n      function stopMobileDescent() {\n        if (engine && engine.moveState) engine.moveState.flyDown = false;\n      }\n\n      function activateMobileDescent() {\n        beginMobileDescent();\n        setTimeout(stopMobileDescent,150);\n      }\n\n      function activateMobileJump()');
edit("'Touch mode - swipe right to look'", "'Swipe on the right to look'");
edit("el('div', { role: 'img', 'aria-label': __alloT('stem.geometryworld.a11y_touch_joystick", "el('div', { className:'gw-touch-joystick', role: 'img', 'aria-label': __alloT('stem.geometryworld.a11y_touch_joystick");
const touchStart=s.indexOf('          // Right side: action buttons');
const touchEnd=s.indexOf('        // ── Water submersion blue tint',touchStart);
if(touchStart<0||touchEnd<0)throw Error('Touch controls missing');
let touch=s.slice(touchStart,touchEnd);
touch=touch.replace("__alloT('stem.geometryworld.a11y_jump', 'Jump'), title: 'Jump'", "__alloT('stem.geometryworld.a11y_jump_or_fly_up', 'Jump or fly up'), title: engine.flyMode ? 'Hold to fly up' : 'Jump', 'data-gw-touch-action':'up'");
touch=touch.replace('onTouchEnd: function() { engine.moveState.flyUp = false; engine._jumpLock = false; },','onTouchEnd: stopMobileJump, onTouchCancel: stopMobileJump, onBlur: stopMobileJump,');
touch=touch.replace("            }, '\\u2B06\\uFE0F'),",`            }, renderTouchAction(el,'up',engine.flyMode ? 'Up' : 'Jump')),
            engine.flyMode && el('button', {
              type:'button',className:'gw-focusable','aria-label':__alloT('stem.geometryworld.a11y_fly_down','Fly down'),title:'Hold to fly down','data-gw-touch-action':'down',
              onTouchStart:function(ev){runMobileButtonAction('down',beginMobileDescent,ev);},
              onTouchEnd:stopMobileDescent,onTouchCancel:stopMobileDescent,onBlur:stopMobileDescent,
              onClick:function(ev){runMobileButtonAction('down',activateMobileDescent,ev);}
            },renderTouchAction(el,'down','Down')),`);
for(const [key,label,emoji] of [['place','Place','\\uD83E\\uDDF1'],['break','Break','\\u26CF\\uFE0F'],['measure','Measure','\\uD83D\\uDCCF'],['talk','Talk','\\uD83D\\uDDE3\\uFE0F'],['undo','Undo','\\u21A9']]){
  const suffix="            }, '"+emoji+"')";
  if(!touch.includes(suffix))throw Error('Touch icon missing: '+key);
  touch=touch.replace(suffix,"            }, renderTouchAction(el,'"+key+"','"+label+"'))");
}
touch=touch.replace("title: 'Place block',", "title: 'Place block', 'data-gw-touch-action':'place',");
touch=touch.replace("title: 'Break block',", "title: 'Break block', 'data-gw-touch-action':'break',");
touch=touch.replace("// Talk to NPC button\n            el('button'", "// Talk is available in worlds with characters.\n            engine.npcs && engine.npcs.length > 0 && el('button'");
const talkStart=touch.indexOf('              onTouchStart: function(ev) {\n                ev.stopPropagation();');
const talkEnd=touch.indexOf("              onClick: function(ev) { runMobileButtonAction('talk'",talkStart);
if(talkStart<0||talkEnd<0)throw Error('Talk handler missing');
touch=touch.slice(0,talkStart)+"              onTouchStart: function(ev) { runMobileButtonAction('talk', talkToNearbyNpc, ev); },\n"+touch.slice(talkEnd);
const captions=touch.indexOf('          // Label hints');
if(captions<0)throw Error('Touch captions missing');
touch=touch.slice(0,captions).replace(/\),\s*$/,')\n')+'        ),\n';
s=s.slice(0,touchStart)+touch+s.slice(touchEnd);
// Rotation is already visible in the shape tray; the extra floating badge covered it.
const rotationStart=s.indexOf('        // ── Block rotation indicator (near shape selector)');
const rotationEnd=s.indexOf('        // ── Measurement history panel',rotationStart);
if(rotationStart<0||rotationEnd<0)throw Error('Rotation badge missing');
s=s.slice(0,rotationStart)+s.slice(rotationEnd);
edit('        // ── Action feedback toast (center-bottom, fades in/out)',`        worldActive && !d.showcaseActive && openModals.length === 0 && d.placementHint && el('div', {
          className:'gw-placement-hint','data-allowed':d.placementHint.allowed ? 'true':'false',
          'data-placement-code':d.placementHint.code,role:'status','aria-live':'polite','aria-atomic':'true'
        },el('span',{className:'gw-placement-hint-mark','aria-hidden':'true'},d.placementHint.allowed ? '\\u2713':'!'),el('span',null,d.placementHint.reason)),
        // ── Action feedback toast (center-bottom, fades in/out)`);
new Function(s);
for(const f of [p,'desktop/web-app/public/'+p]){const fd=fs.openSync(f,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}
console.log('Touch controls, descent, and placement status applied and mirrored.');
