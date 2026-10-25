/* Selected mushroom detail: the exposed surface is visible now; each A/B card
 * describes only an actual recorded turn. No hidden underside is read here. */
(function(root){
  'use strict';
  var mounted=0,svgNS='http://www.w3.org/2000/svg',colors=['pale','golden','dark','scorched'];
  function finite(value){return typeof value==='number'&&Number.isFinite(value);}
  function capital(value){return value.charAt(0).toUpperCase()+value.slice(1);}
  function color(value){return colors.includes(value)?value:null;}
  function quantity(value,digits,unit){if(!finite(value)||value<0)return 'Not available';var smallest=Math.pow(10,-digits);if(value>0&&value<smallest)return 'Trace (<'+smallest+' '+unit+')';return String(Number(value.toFixed(digits)))+' '+unit;}
  function clock(seconds){var whole=Math.floor(seconds);return Math.floor(whole/60)+':'+String(whole%60).padStart(2,'0');}
  function knownFace(reading,index){
    if(!reading||reading.face!==index||!color(reading.color)||!Number.isInteger(reading.actionNumber)||reading.actionNumber<1||!finite(reading.time)||reading.time<0||typeof reading.current!=='boolean')return null;
    return {face:index,color:reading.color,actionNumber:reading.actionNumber,time:reading.time,current:reading.current,actor:reading.actor==='demonstrator'?'Watch':reading.actor==='learner'?'Learner':null};
  }
  function scenePieceMarkup(value){
    var name=color(value);if(!name)return '';
    var palette={pale:['#dfcba8','#9b805b','#f5e4c5'],golden:['#c58b42','#7c4e28','#edc57f'],dark:['#805331','#4b321f','#ba8953'],scorched:['#43352a','#24221c','#977b54']},c=palette[name];
    var art='<path class="avatar-mushroom-skin" d="M-12 3Q-14-8-5-11L2-12Q12-11 14 0L7 3 5 2 6 10-4 10-3 3-7 4Z" fill="'+c[0]+'" stroke="'+c[1]+'" stroke-width="1.15" stroke-linejoin="round"/><path class="avatar-mushroom-highlight" d="M-8-4Q-3-10 5-7M-9 0L-4 1M5-1L10 0M-1 5V8" fill="none" stroke="'+c[2]+'" stroke-width="1.4" stroke-linecap="round"/>';
    if(name==='golden')art+='<g class="avatar-mushroom-marks" fill="'+c[1]+'"><ellipse cx="-5" cy="-3" rx="1.4" ry="1"/><ellipse cx="4" cy="-6" rx="1.6" ry="1"/><ellipse cx="7" cy="0" rx="1.3" ry=".8"/></g>';
    if(name==='dark')art+='<g class="avatar-mushroom-marks" fill="'+c[1]+'"><path d="M-8-3L-5-6-2-3-4-1Z"/><path d="M2-8L7-6 8-2 4-3Z"/><path d="M-1 1L3 0 4 3 0 4Z"/><ellipse cx="-1" cy="7" rx="1.5" ry="1"/></g>';
    if(name==='scorched')art+='<path class="avatar-mushroom-marks" d="M-10-3L-7-8-3-6 0-10 4-7 8-7 11-2 7 1 4-1 0 3-4 0-8 2ZM-2 5L3 4 4 8-2 9Z" fill="'+c[1]+'"/><path class="avatar-mushroom-highlight" d="M-6-5L-3-3M2-6L5-4M0 0L3-1" stroke="'+c[2]+'" stroke-width=".9" fill="none" stroke-linecap="round"/>';
    return art;
  }
  function unknownMarkup(){return '<path class="avatar-mushroom-unknown" d="M-12 3Q-14-8-5-11L2-12Q12-11 14 0L7 3 5 2 6 10-4 10-3 3-7 4Z" fill="none" stroke="#899180" stroke-width="1.15" stroke-dasharray="2 2"/><path class="avatar-mushroom-unknown" d="M-3-4Q-2-8 2-7 6-6 2-2L0 0M0 4V5" fill="none" stroke="#67765e" stroke-width="1.5" stroke-linecap="round"/>';}
  function mount(options){
    if(!options||!options.container||!options.container.ownerDocument)throw new TypeError('Provide a mushroom detail container.');
    var host=options.container,doc=host.ownerDocument,uid='avatar-mushroom-detail-'+(++mounted)+'-',destroyed=false,liveArtKey='';
    function element(tag,key,text,className){var node=doc.createElement(tag);if(key)node.dataset.avatarMushroom=key;if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
    function art(key,viewBox){var node=doc.createElementNS(svgNS,'svg');node.dataset.avatarMushroom=key;node.setAttribute('viewBox',viewBox);node.setAttribute('aria-hidden','true');node.setAttribute('focusable','false');return node;}
    var panel=element('section','panel',undefined,'avatar-mushroom-detail');panel.hidden=true;panel.setAttribute('aria-labelledby',uid+'title');
    var eyebrow=element('p',null,'SELECTED MUSHROOM','avatar-mushroom-eyebrow'),title=element('h4','title','Mushroom piece');title.id=uid+'title';
    var live=element('div',null,undefined,'avatar-mushroom-live'),drawing=art('art','-27 -25 54 48');
    drawing.innerHTML='<ellipse class="avatar-mushroom-shadow" cx="0" cy="13" rx="19" ry="3" fill="#5a4730" opacity=".12"/><g data-avatar-mushroom="live-piece"></g><g data-avatar-mushroom="preview-tool" hidden fill="none" stroke="#3e6a58" stroke-width="1.4" stroke-dasharray="2 2" stroke-linecap="round"><path d="M-21-20Q-23-3-16 7L-12 6M21-20Q23-3 16 7L12 6"/></g>';
    var liveWords=element('div'),liveHeading=element('span',null,'Visible now','avatar-mushroom-live-label'),liveColor=element('strong','live-color'),liveSide=element('p','live-side');liveWords.append(liveHeading,liveColor,liveSide);live.append(drawing,liveWords);
    var facts=element('dl','facts',undefined,'avatar-mushroom-facts'),rows={};
    [['contact','Modeled pan contact'],['crowding','Crowding'],['pan-water','Free water in the pan'],['pan-temperature','Pan temperature'],['width','Piece width'],['relative-heat','Position heat factor']].forEach(function(pair){var row=element('div'),term=element('dt',null,pair[1]),value=element('dd',pair[0]);row.append(term,value);facts.append(row);rows[pair[0]]={row:row,value:value};});
    var evidenceHeading=element('h5',null,'Recorded face reveals','avatar-mushroom-evidence-heading'),evidence=element('div','faces',undefined,'avatar-mushroom-detail-faces');
    var cards=[0,1].map(function(index){var card=element('section',null,undefined,'avatar-mushroom-detail-face');card.dataset.face=String(index);var heading=element('h6',null,'Face '+(index===0?'A':'B'));heading.id=uid+'face-'+index;card.setAttribute('aria-labelledby',heading.id);var position=element('p','face-position'),image=art('face-art','-27 -23 54 46'),label=element('strong','face-color'),meta=element('p','face-meta'),freshness=element('p','face-freshness');card.append(heading,position,image,label,meta,freshness);evidence.append(card);return {node:card,position:position,image:image,label:label,meta:meta,freshness:freshness,artKey:null};});
    var note=element('p','scope','Water belongs to the whole pan. Only recorded turns fill the face cards.','avatar-mushroom-scope'),previewNote=element('p','preview-note',undefined,'avatar-mushroom-preview-note');previewNote.hidden=true;
    panel.append(eyebrow,title,live,facts,evidenceHeading,evidence,note,previewNote);host.append(panel);
    var livePiece=drawing.querySelector('[data-avatar-mushroom=live-piece]'),previewTool=drawing.querySelector('[data-avatar-mushroom=preview-tool]');
    function update(value){
      if(destroyed)return false;var data=value||{},piece=data.piece,valid=!!piece&&Number.isInteger(piece.index)&&piece.index>=0&&(piece.topFace===0||piece.topFace===1);panel.hidden=!valid;if(!valid)return false;
      var count=Number.isInteger(data.pieceCount)&&data.pieceCount>piece.index?data.pieceCount:null,currentColor=color(piece.topColor),pan=data.pan||{};
      panel.dataset.index=String(piece.index);panel.dataset.topFace=String(piece.topFace);panel.dataset.topColor=currentColor||'unknown';title.textContent='Mushroom piece '+(piece.index+1)+(count?' of '+count:'');liveColor.textContent=currentColor?capital(currentColor):'Color not available';liveSide.textContent='Face '+(piece.topFace===0?'A':'B')+' is exposed.';
      if(liveArtKey!==currentColor){livePiece.innerHTML=currentColor?scenePieceMarkup(currentColor):unknownMarkup();liveArtKey=currentColor;}
      var contact=finite(data.contact)&&data.contact>=0&&data.contact<=1?data.contact:null,neighbors=Number.isInteger(data.neighbors)&&data.neighbors>=0?data.neighbors:null;
      rows.contact.value.textContent=contact===null?'Not available':String(Number((contact*100).toFixed(1)))+'%';panel.dataset.contact=contact===null?'':String(contact);
      rows.crowding.value.textContent=(typeof piece.crowded==='boolean'?piece.crowded?'Crowded':'Not crowded':'Not available')+(neighbors===null?'':' · '+neighbors+' nearby');
      rows['pan-water'].value.textContent=quantity(pan.freeWaterMl,3,'mL');rows['pan-temperature'].value.textContent=quantity(pan.temperature,1,'°C');
      rows.width.row.hidden=data.widthMm===undefined;rows.width.value.textContent=quantity(data.widthMm,2,'mm');rows['relative-heat'].row.hidden=data.relativeHeat===undefined;rows['relative-heat'].value.textContent=quantity(data.relativeHeat,2,'×');
      cards.forEach(function(card,index){var reading=knownFace(Array.isArray(piece.faces)?piece.faces[index]:null,index),exposed=piece.topFace===index,key=reading?reading.color:'unknown';card.position.textContent=exposed?'Exposed now':'Against the pan';card.node.dataset.position=exposed?'exposed':'pan';card.node.dataset.freshness=reading?reading.current?'current':'historical':'unobserved';card.node.dataset.actionNumber=reading?String(reading.actionNumber):'';
        if(card.artKey!==key){card.image.innerHTML=reading?scenePieceMarkup(reading.color):unknownMarkup();card.artKey=key;}
        card.label.textContent=reading?capital(reading.color)+' when revealed':'No recorded turn';card.meta.textContent=reading?'Action '+reading.actionNumber+' · '+clock(reading.time)+(reading.actor?' · '+reading.actor:''):'';card.meta.hidden=!reading;card.freshness.textContent=reading?reading.current?'Unchanged since this reveal.':'Earlier reveal. Turn again to check.':exposed?'Visible above; no turn recorded.':'Turn to record this face.';
      });
      var preview=data.preview,active=!!(preview&&preview.active===true);panel.dataset.preview=String(active);previewNote.hidden=!active;if(active)previewTool.removeAttribute('hidden');else previewTool.setAttribute('hidden','');
      previewNote.textContent=(preview&&preview.kind==='turnMushroom'?'Turning preview':preview&&preview.kind==='moveMushroom'?'Placement preview':'Movement preview')+': the face, quantities and recorded reveals stay unchanged until Release.';
      return true;
    }
    return {element:panel,update:update,destroy:function(){if(destroyed)return;destroyed=true;panel.remove();}};
  }
  var api={mount:mount,scenePieceMarkup:scenePieceMarkup};if(typeof module==='object'&&module.exports)module.exports=api;root.KitchenAvatarMushrooms=api;
})(typeof globalThis!=='undefined'?globalThis:this);
