  function universeFlightPairPanelLayout(width,height,panelWidth,panelHeight,obstacles,current,fullscreen) {
    if(![width,height,panelWidth,panelHeight].every(function(value){return Number.isFinite(value)&&value>0;})||!Number.isFinite(width*height)||!Number.isFinite(panelWidth*panelHeight))return null;
    var maxLeft=Math.max(0,width-panelWidth),maxTop=Math.max(0,height-panelHeight),margin=Math.min(12,maxLeft/2);
    var xs={left:margin,center:maxLeft/2,right:maxLeft-margin};
    var shortWide=!!fullscreen&&width>=520&&height<480,verticalMargin=Math.min(12,maxTop/2);
    var ys=shortWide?{top:verticalMargin,bottom:maxTop-verticalMargin}:{top:Math.min(120,maxTop),bottom:Math.max(0,Math.min(maxTop,height-(fullscreen?148:94)-panelHeight))};
    var blocks=(Array.isArray(obstacles)?obstacles:[]).filter(function(item){
      return item&&[item.left,item.top,item.right,item.bottom,item.weight].every(Number.isFinite)&&item.right>item.left&&item.bottom>item.top&&item.weight>0;
    });
    var best=null;
    // Keep a stable preference when every placement is equally clear. The same
    // measured card moves between docks without changing the camera or its lens.
    (shortWide?['bottom-center','top-center']:['bottom-right','bottom-center','bottom-left','top-right','top-center','top-left']).forEach(function(key){
      var parts=key.split('-'),left=xs[parts[1]],top=ys[parts[0]],score=0;
      blocks.forEach(function(item){
        var overlapWidth=Math.max(0,Math.min(width,left+panelWidth,item.right)-Math.max(0,left,item.left));
        var overlapHeight=Math.max(0,Math.min(height,top+panelHeight,item.bottom)-Math.max(0,top,item.top));
        // Saturate pathological weights instead of exposing Infinity to layout.
        score=Math.min(Number.MAX_VALUE,score+overlapWidth*overlapHeight*item.weight);
      });
      if(!best||score<best.score||(score===best.score&&key===current))best={key:key,left:left,top:top,score:score};
    });
    return best;
  }
