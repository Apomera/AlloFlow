const fs=require('node:fs'),assert=require('node:assert/strict');
const file='stem_lab/stem_tool_geometryworld_builder.js',raw=fs.readFileSync(file,'utf8'),eol=raw.includes('\r\n')?'\r\n':'\n';let source=raw.replace(/\r\n/g,'\n');
function change(a,b){assert.equal(source.split(a).length,2,a.slice(0,120));source=source.replace(a,b);}
change('  function transformCreationBlocks(blocks, operation, values) {',`  function suggestCreationDuplicate(engine, axis) {
    var snapshot=selectionEditSnapshot(engine);if(!snapshot.ok)return snapshot;
    if(engine._destroyed || engine._showcase || !engine._currentLesson || !engine._currentLesson.sandbox || typeof engine.previewBuildBatch!=='function')return {ok:false,reason:'Open Free Build before duplicating a creation.'};
    if(axis && ['x','y','z'].indexOf(axis)===-1)return {ok:false,reason:'Choose X, Z, or a stack above.'};
    var min={x:Infinity,y:Infinity,z:Infinity},max={x:-Infinity,y:-Infinity,z:-Infinity};
    snapshot.blocks.forEach(function(b){['x','y','z'].forEach(function(a){min[a]=Math.min(min[a],b[a]);max[a]=Math.max(max[a],b[a]);});});
    var choices=axis?[axis]:['x','z','y'];
    for(var i=0;i<choices.length;i++){
      var a=choices[i],distance=max[a]-min[a]+(a==='y'?1:2),signs=a==='y'?[1]:[1,-1];
      for(var j=0;j<signs.length;j++){
        var offset={x:0,y:0,z:0};offset[a]=distance*signs[j];
        var plan=previewSelectionEdit(engine,'duplicate',offset);
        if(plan.ok)return Object.assign({},plan,{suggestedOffset:offset});
        if(plan.code==='block_limit')return plan;
      }
    }
    return {ok:false,reason:'No clear adjacent position was found'+(axis?' along '+axis.toUpperCase():'')+'. Choose another direction or enter an offset, then preview.'};
  }
  function transformCreationBlocks(blocks, operation, values) {`);
change('    selectionEditSnapshot:selectionEditSnapshot, transformCreationBlocks:transformCreationBlocks,','    suggestCreationDuplicate:suggestCreationDuplicate,\n    selectionEditSnapshot:selectionEditSnapshot, transformCreationBlocks:transformCreationBlocks,');
change("      var _stampNotice=React.useState(''), stampNotice=_stampNotice[0], setStampNotice=_stampNotice[1];",`      var _stampNotice=React.useState(''), stampNotice=_stampNotice[0], setStampNotice=_stampNotice[1];
      var _stampGalleryOpen=React.useState(false), stampGalleryOpen=_stampGalleryOpen[0], setStampGalleryOpen=_stampGalleryOpen[1];
      var stampCards=React.useMemo(function(){
        if(!stampGalleryOpen)return [];
        return stampLibrary.stamps.map(function(stamp){var facts=activityBuildFacts(stamp.blocks),svg=activitySnapshotSvg({blocks:stamp.blocks});return {stamp:stamp,facts:facts,image:svg?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg):''};});
      },[stampGalleryOpen,stampLibrary]);`);
change('      function previewCreationChange(){',`      function chooseDuplicatePosition(axis,preview){
        cancelSelectionPreview();
        var plan=suggestCreationDuplicate(window[ENGINE_KEY],axis);
        if(!plan.ok){setSelectionEditNotice(plan.reason);return;}
        var offset=plan.suggestedOffset;setSelectionOffset({x:String(offset.x),y:String(offset.y),z:String(offset.z)});
        if(preview){setSelectionEditPreview(plan);setSelectionEditNotice('Duplicate creation: '+plan.additions.length+' blocks. Review the outline, then apply.');}
        else setSelectionEditNotice('A clear position is suggested. Choose Preview change to review the copy.');
      }
      function previewCreationChange(){`);
change("onChange:function(event){setSelectionEditMode(event.target.value);cancelSelectionPreview();}","onChange:function(event){var mode=event.target.value;setSelectionEditMode(mode);cancelSelectionPreview();if(mode==='duplicate')chooseDuplicatePosition(null,false);}");
change("            (selectionEditMode==='move' || selectionEditMode==='duplicate') && renderCoordinateInputs",`            selectionEditMode==='duplicate' && h('div',{className:'gwe-copy-placement'},
              h('p',{className:'gwe-builder-note'},'Place a copy beside this creation or stack it above. Side copies leave a one-cell gap; stacked copies start on the next grid layer.'),
              h('div',{className:'gwe-copy-directions','aria-label':'Preview a duplicate position'},[['x','Beside X'],['z','Beside Z'],['y','Stack above']].map(function(option){return h('button',{type:'button',key:option[0],onClick:function(){chooseDuplicatePosition(option[0],true);}},option[1]);}))),
            (selectionEditMode==='move' || selectionEditMode==='duplicate') && renderCoordinateInputs`);
change("          h('details',{className:'gwe-details gwe-stamp-library'},","          h('details',{className:'gwe-details gwe-stamp-library',onToggle:function(event){setStampGalleryOpen(event.currentTarget.open);}},");
change("if(result.ok){setStampLibrary(result);setStampId(result.stamps[result.stamps.length-1].id);setStampName('');setStampNotice('Stamp saved in this browser.');}","if(result.ok){cancelSelectionPreview();setStampLibrary(result);setStampId(result.stamps[result.stamps.length-1].id);setStampName('');setStampNotice('Stamp saved in this browser.');}");
const start=source.indexOf("              h('label',{className:'gwe-edit-label',htmlFor:'gwe-stamp-choice'},'Choose a stamp'),"),end=source.indexOf("              renderCoordinateInputs('gwe-stamp-corner'",start);assert(start>0&&end>start);
source=source.slice(0,start)+`              h('div',{className:'gwe-stamp-gallery',role:'group','aria-label':'Choose a building stamp'},stampCards.map(function(card){
                var stamp=card.stamp,facts=card.facts,selected=stamp.id===(stampId || stampLibrary.stamps[0].id);
                return h('button',{type:'button',className:'gwe-stamp-card',key:stamp.id,'aria-pressed':selected,'aria-label':'Use stamp '+stamp.name,onClick:function(){setStampId(stamp.id);cancelSelectionPreview();setStampNotice('Selected '+stamp.name+'. Choose its grid corner, then preview.');}},
                  h('span',{className:'gwe-stamp-art'},card.image && h('img',{src:card.image,alt:'',decoding:'async',loading:'lazy'}),h('span',{className:'gwe-stamp-selection','aria-hidden':'true'},selected?'✓ Selected':'Choose')),
                  h('span',{className:'gwe-stamp-card-name'},stamp.name),
                  h('span',{className:'gwe-stamp-card-facts'},stamp.blocks.length+' blocks',facts && h('span',null,facts.width+' wide · '+facts.depth+' deep · '+facts.height+' high')));
              })),
              h('p',{className:'gwe-builder-note'},'Choose a card, then preview its position in the world.'),
`+source.slice(end);
const css='.gwe-stamp-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:12px 0}.gwe-stamp-library .gwe-stamp-card{display:flex;flex-direction:column;min-width:0;padding:0;overflow:hidden;text-align:left;border:1px solid #789786;border-radius:13px;background:#f6f5e9;color:#284d3c;font:inherit;cursor:pointer;box-shadow:0 3px 8px #061f1a12}.gwe-stamp-library .gwe-stamp-card[aria-pressed=true]{border:2px solid #e0c68e;box-shadow:0 0 0 2px #e0c68e26}.gwe-stamp-art{display:block;position:relative;width:100%;height:114px;background:linear-gradient(145deg,#e3ebd9,#f4f3e5)}.gwe-stamp-art img{display:block;object-fit:contain;width:100%;height:100%}.gwe-stamp-selection{position:absolute;top:6px;left:6px;max-width:calc(100% - 12px);box-sizing:border-box;border:1px solid #476d5733;border-radius:999px;background:#fdfbf0ed;padding:3px 7px;color:#355c44;font-size:10px;line-height:1.3}.gwe-stamp-card[aria-pressed=true] .gwe-stamp-selection{background:#294f3c;color:#fff4d8}.gwe-stamp-card-name{display:block;padding:9px 10px 0;font-size:12px;line-height:1.4;font-weight:750;overflow-wrap:anywhere}.gwe-stamp-card-facts{display:flex;flex-direction:column;gap:4px;padding:5px 10px 11px;font-size:10px;line-height:1.4;overflow-wrap:anywhere}.gwe-stamp-card-facts>span{color:#506d58}.gwe-stamp-card:focus-visible{outline:3px solid #f2d394;outline-offset:3px}.gwe-copy-directions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin:10px 0}.gwe-copy-directions button{min-width:0;min-height:44px;padding:7px 3px;font-size:11px}.theme-contrast .gwe-stamp-card,[data-stem-theme=contrast] .gwe-stamp-card{background:#000;color:#fff;border-color:#0ff}.theme-contrast .gwe-stamp-card-facts>span,[data-stem-theme=contrast] .gwe-stamp-card-facts>span{color:#fff}.theme-contrast .gwe-stamp-card[aria-pressed=true],[data-stem-theme=contrast] .gwe-stamp-card[aria-pressed=true]{border-color:#ff0;outline:2px solid #ff0}.gwe-stamp-card:hover{filter:brightness(1.025)}@media(prefers-reduced-motion:no-preference){.gwe-stamp-card{transition:border-color 140ms ease,box-shadow 140ms ease}}';
change('      ".gwe-creation-editor,.gwe-stamp-library{','      '+JSON.stringify(css)+',\n      ".gwe-creation-editor,.gwe-stamp-library{');
new Function(source);const bytes=Buffer.from(source.replace(/\n/g,eol)),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,bytes);fs.ftruncateSync(fd,bytes.length);}finally{fs.closeSync(fd);}
console.log('Added visual stamp cards and bounded clear-position duplicate suggestions.');
