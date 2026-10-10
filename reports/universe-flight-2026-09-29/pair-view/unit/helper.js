  function universeFlightPairFrame(position, first, second, fov, aspect) {
    function vector(value) { return Array.isArray(value)&&value.length===3&&value.every(Number.isFinite); }
    if(!vector(position)||!vector(first)||!vector(second)||!Number.isFinite(fov)||fov<10||fov>100||!Number.isFinite(aspect)||aspect<=0)return null;
    var directions=[first,second].map(function(center){
      var ray=center.map(function(value,i){return value-position[i];}),range=Math.hypot.apply(Math,ray);
      return range>0&&Number.isFinite(range)?ray.map(function(value){return value/range;}):null;
    });
    if(!directions[0]||!directions[1])return null;
    var a=directions[0],b=directions[1],sum=a.map(function(value,i){return value+b[i];}),length=Math.hypot.apply(Math,sum);
    if(!Number.isFinite(length)||length<1e-10)return null;
    var sight=sum.map(function(value){return value/length;}),pitch=Math.atan2(sight[1],Math.hypot(sight[0],sight[2]));
    // This camera has no roll and stops short of a vertical sightline.
    if(Math.abs(pitch)>Math.PI/2-.01)return null;
    var yaw=((Math.atan2(sight[0],sight[2])%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
    var sy=Math.sin(yaw),cy=Math.cos(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch);
    var camera=directions.map(function(direction){return [direction[0]*cy-direction[2]*sy,-direction[0]*sy*sp+direction[1]*cp-direction[2]*cy*sp,direction[0]*sy*cp+direction[1]*sp+direction[2]*cy*cp];});
    if(camera.some(function(direction){return !direction.every(Number.isFinite)||direction[2]<=1e-10;}))return null;
    // Include both landmark centers with a 16% screen margin. The catalog's
    // arrival distances are inspection limits, not physical object radii.
    var extent=camera.reduce(function(maximum,direction){return Math.max(maximum,Math.abs(direction[0]/direction[2])/aspect,Math.abs(direction[1]/direction[2]));},0);
    var required=2*Math.atan(extent/.68)*180/Math.PI;
    if(!Number.isFinite(required)||required>100+1e-10)return null;
    var lens=Math.ceil(Math.max(fov,Math.min(100,required))),scale=1/Math.tan(lens*Math.PI/360);
    var screens=camera.map(function(direction){return [.5+direction[0]*scale/direction[2]/aspect/2,.5-direction[1]*scale/direction[2]/2];});
    if(screens.some(function(screen){return screen.some(function(value){return !Number.isFinite(value)||value<.16-1e-10||value>.84+1e-10;});}))return null;
    var cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=a.reduce(function(total,value,i){return total+value*b[i];},0);
    return {yaw:yaw,pitch:pitch,fov:lens,angleDeg:Math.atan2(Math.hypot.apply(Math,cross),Math.max(-1,Math.min(1,dot)))*180/Math.PI,screens:screens};
  }
