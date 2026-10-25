/* A read-only magnifier for committed tomato texture. The dashed tool is a
 * movement preview; neither it nor this view changes the ingredient. */
(function(root){
  'use strict';
  var mounted=0,svgNS='http://www.w3.org/2000/svg';
  function finite(value){return typeof value==='number'&&Number.isFinite(value);}
  function normalize(piece){
    if(!piece||!Number.isInteger(piece.index)||piece.index<0||!Number.isInteger(piece.stage)||piece.stage<0||piece.stage>2)return null;
    return {index:piece.index,stage:piece.stage,ready:piece.ready===true,juice:finite(piece.juice)&&piece.juice>=0?piece.juice:null,appearance:piece.stage===2?'crushed':piece.stage===1?'split':piece.ready===true?'softened':'firm'};
  }
  function stageLabel(piece){return {firm:'Firm chunk',softened:'Softened chunk',split:'Split',crushed:'Crushed'}[piece.appearance];}
  function amount(value){if(value===null)return 'Not available';if(value>0&&value<.001)return 'Trace (<0.001 mL)';return String(Number(value.toFixed(3)))+' mL';}
  function pieceArt(piece){
    var skin='class="avatar-tomato-skin" fill="#bd4f32" stroke="#803923" stroke-width="1.05" stroke-linejoin="round"',flesh='class="avatar-tomato-flesh" fill="#e18551" stroke="#a34b2d" stroke-width=".65"',seed='class="avatar-tomato-seed" fill="#f4c181"',vein='class="avatar-tomato-vein" fill="none" stroke="#f3a66e" stroke-width="1" stroke-linecap="round"';
    if(piece.appearance==='firm')return '<path d="M-10 6Q-13-4-4-8L6-7Q13-4 10 6Q1 10-10 6Z" '+skin+'/><path d="M-8 2Q-6-5 0-5T8 2L5 5H-5Z" '+flesh+'/><path d="M0-5V5M-7 0L0 2 7 0" '+vein+'/><g '+seed+'><ellipse cx="-4" cy="0" rx="1.3" ry=".8"/><ellipse cx="4" cy="0" rx="1.3" ry=".8"/></g>';
    if(piece.appearance==='softened')return '<path d="M-12 5Q-11-2-6-5L-1-6 5-4Q11-3 12 4L8 7 1 8-7 7Z" '+skin+'/><path d="M-9 2Q-5-4 0-3L7 0 9 4 3 5-5 4Z" '+flesh+'/><path d="M-7 1Q-1-1 6 2M-4 4L2 5" '+vein+'/><g '+seed+'><ellipse cx="-4" cy="1" rx="1.3" ry=".8"/><ellipse cx="4" cy="3" rx="1.3" ry=".8"/></g>';
    if(piece.appearance==='split')return '<path d="M-13 4Q-12-5-6-6L-2-3-3 2-1 6-7 7Z" '+skin+'/><path d="M2-4Q8-7 12 0L13 5 7 7 2 5 4 2Z" '+skin+'/><path d="M-10 2L-6-3-5 2-4 5-8 5Z" '+flesh+'/><path d="M5-2L9 0 10 4 6 5 6 1Z" '+flesh+'/><g '+seed+'><ellipse cx="-7" cy="1" rx="1.3" ry=".8"/><ellipse cx="8" cy="3" rx="1.3" ry=".8"/></g>';
    return '<path d="M-14 3Q-14-1-9-1L-7-4-2-3 2-5 6-2 11-2 14 2 12 5 7 5 3 8-1 6-7 7-9 5-13 6Z" '+skin+'/><path d="M-10 2L-6-1-3 1 0-2 4 1 8 0 11 3 6 4 2 5-2 3-6 4Z" '+flesh+'/><path d="M-7 1L-4 3M1 1L4 3M7 2L9 3" '+vein+'/><g '+seed+'><ellipse cx="-9" cy="3" rx="1.3" ry=".8"/><ellipse cx="0" cy="4" rx="1.3" ry=".8"/><ellipse cx="6" cy="2" rx="1.3" ry=".8"/></g>';
  }
  function scenePieceMarkup(piece){var normalized=normalize(piece);return normalized?pieceArt(normalized):'';}
  function mount(options){
    if(!options||!options.container||!options.container.ownerDocument)throw new TypeError('Provide a tomato view container.');
    var host=options.container,doc=host.ownerDocument,uid='avatar-tomato-detail-'+(++mounted)+'-',destroyed=false,lastArt='';
    function element(tag,key,text,className){var node=doc.createElement(tag);if(key)node.dataset.avatarTomato=key;if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
    var panel=element('section','panel',undefined,'avatar-tomato-detail');panel.hidden=true;panel.setAttribute('aria-labelledby',uid+'title');
    var eyebrow=element('p',null,'SELECTED INGREDIENT','avatar-tomato-eyebrow'),title=element('h4','title','Tomato piece');title.id=uid+'title';
    var body=element('div',null,undefined,'avatar-tomato-detail-body'),picture=element('div',null,undefined,'avatar-tomato-picture'),drawing=doc.createElementNS(svgNS,'svg');drawing.dataset.avatarTomato='art';drawing.setAttribute('viewBox','0 0 240 150');drawing.setAttribute('aria-hidden','true');drawing.setAttribute('focusable','false');
    drawing.innerHTML='<ellipse class="avatar-tomato-art-shadow" cx="120" cy="116" rx="73" ry="10" fill="#6d4930" opacity=".12"/><path class="avatar-tomato-art-base" d="M30 126h180" stroke="#bdb497" stroke-width="1.5"/><g data-avatar-tomato="piece" transform="translate(120 89) scale(4.5)"></g><g data-avatar-tomato="preview" hidden><g data-avatar-tomato="preview-tool" fill="none" stroke="#3b6659" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="4 3"><path d="M-16-31V-48Q0-63 16-48V-31M0-61V-76"/><ellipse cy="-27" rx="29" ry="8"/><path d="M-25-28L20-24M-12-32L28-27M-20-22L8-33"/></g><ellipse data-avatar-tomato="preview-contact" cx="120" cy="109" rx="61" ry="12" fill="none" stroke="#3b6659" stroke-width="2" stroke-dasharray="4 4"/></g>';
    picture.append(drawing,element('p',null,'Enlarged view · shape is illustrative','avatar-tomato-scale-note'));
    var facts=element('div',null,undefined,'avatar-tomato-detail-facts'),stage=element('strong','stage'),juiceLabel=element('span',null,'Juice retained in this piece','avatar-tomato-juice-label'),juice=element('strong','juice'),readiness=element('p','readiness');facts.append(stage,juiceLabel,juice,readiness);body.append(picture,facts);
    var previewNote=element('p','preview-note','Movement preview: the dashed masher is being positioned. The committed texture and retained juice above have not changed.','avatar-tomato-preview-note');previewNote.hidden=true;
    panel.append(eyebrow,title,body,previewNote);host.append(panel);
    var pieceNode=drawing.querySelector('[data-avatar-tomato=piece]'),previewNode=drawing.querySelector('[data-avatar-tomato=preview]'),previewTool=drawing.querySelector('[data-avatar-tomato=preview-tool]'),previewContact=drawing.querySelector('[data-avatar-tomato=preview-contact]');
    function update(value){
      if(destroyed)return false;var data=value||{},piece=normalize(data.piece);panel.hidden=!piece;if(!piece)return false;
      panel.dataset.index=String(piece.index);panel.dataset.stage=String(piece.stage);panel.dataset.appearance=piece.appearance;panel.dataset.ready=String(piece.ready);panel.dataset.juice=piece.juice===null?'':String(piece.juice);
      var count=Number.isInteger(data.pieceCount)&&data.pieceCount>piece.index?data.pieceCount:null;title.textContent='Tomato piece '+(piece.index+1)+(count?' of '+count:'');stage.textContent=stageLabel(piece);juice.textContent=amount(piece.juice);
      readiness.textContent=piece.stage===2?'This piece is already crushed. Choose another piece to press.':piece.ready?'Soft enough for the next press.':'This piece is still firm. Compare it again after recorded cooking.';
      if(lastArt!==piece.appearance){pieceNode.innerHTML=pieceArt(piece);lastArt=piece.appearance;}pieceNode.dataset.appearance=piece.appearance;
      var preview=data.preview,active=!!(preview&&preview.active===true),contact=active&&finite(preview.contact)?Math.max(0,Math.min(1,preview.contact)):0;if(active)previewNode.removeAttribute('hidden');else previewNode.setAttribute('hidden','');previewNote.hidden=!active;panel.dataset.preview=String(active);previewNode.dataset.contact=String(contact);previewTool.setAttribute('transform','translate(120 '+String(78+contact*21)+')');previewContact.setAttribute('opacity',String(contact));
      return true;
    }
    return {element:panel,update:update,destroy:function(){if(destroyed)return;destroyed=true;panel.remove();}};
  }
  var api={mount:mount,scenePieceMarkup:scenePieceMarkup};if(typeof module==='object'&&module.exports)module.exports=api;root.KitchenAvatarTomatoes=api;
})(typeof globalThis!=='undefined'?globalThis:this);
