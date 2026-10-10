// Used in the browser probe and the focused callback-restoration proof.
function renderWithArmSubmissions(render,renderer,args){
  var scene=args[0],saved=[],submissions=[];
  if(scene&&scene.traverse)scene.traverse(function(object){
    if(!object.isMesh||!/^fr-rescuer-(lower|upper)-(forearm|upper-arm)$/.test(object.name))return;
    var original=object.onBeforeRender,owned=Object.prototype.hasOwnProperty.call(object,'onBeforeRender');
    saved.push({object:object,original:original,owned:owned});
    object.onBeforeRender=function(){
      var result=original.apply(this,arguments),geometry=arguments[3],group=arguments[5];
      var available=geometry.index?geometry.index.count:geometry.attributes.position.count,range=geometry.drawRange;
      var start=Math.max(0,range.start,group?group.start:0),end=Math.min(available,range.start+range.count,group?group.start+group.count:Infinity);
      submissions.push({name:object.name,group:group?{start:group.start,count:group.count,materialIndex:group.materialIndex}:null,indexCount:available,drawRange:{start:range.start,count:range.count===Infinity?'Infinity':range.count},submittedStart:start,submittedCount:Math.max(0,end-start),triangles:Math.max(0,end-start)/3});
      return result;
    };
  });
  try{return {result:render.apply(renderer,args),submissions:submissions};}
  finally{saved.forEach(function(entry){if(entry.owned)entry.object.onBeforeRender=entry.original;else delete entry.object.onBeforeRender;});}
}
module.exports={renderWithArmSubmissions};
