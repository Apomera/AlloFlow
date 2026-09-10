// ═══════════════════════════════════════════
// stem_tool_circuit.js - Circuit Builder Plugin (Enhanced v2)
// Interactive series & parallel circuit builder with Ohm's Law,
// 7 component types (resistor, bulb, switch, LED, ammeter, voltmeter, capacitor),
// electron animation, 10 challenges, quiz, presets, badges, AI tutor,
// Kirchhoff's Laws panel, grade-band content, sound effects & snapshots.
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';

  // Shared steady-DC model. LED approximation: typical forward drop + 10 ohm slope.
  function circuitNumber(value, fallback, min, max) {
    var n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  }
  function circuitForwardVoltage(c) {
    return ({ '#ef4444': 2, '#22c55e': 2.2, '#3b82f6': 3.2, '#eab308': 2.1, '#f8fafc': 3.2 })[c.ledColor] || 2;
  }
  function circuitResistance(c) {
    if (c.type === 'switch') return c.closed ? 0.001 : 1e12;
    if (c.type === 'ammeter' || c.type === 'inductor') return 0.001;
    if (c.type === 'voltmeter') return 1e9;
    if (c.type === 'capacitor') return 1e12;
    if (c.type === 'led') return 10;
    return circuitNumber(c.value, 100, 1, 10000);
  }
  function solveCircuit(state) {
    if(state&&state.mode==='mixed')return solveMixedCircuit(state);
    state = state || {};
    var mode = state.mode === 'parallel' ? 'parallel' : 'series';
    var voltage = circuitNumber(state.voltage == null ? 9 : state.voltage, 9, 0, 24);
    var components = (Array.isArray(state.components) ? state.components : []).filter(function(c) {
      return c && ['resistor', 'bulb', 'led', 'switch', 'capacitor', 'ammeter', 'voltmeter', 'inductor'].indexOf(c.type) !== -1;
    }).map(function(c) {
      return Object.assign({}, c, { value: circuitNumber(c.value, 100, 1, 10000) });
    });
    var rows = components.map(function(c) {
      return { component: c, resistance: circuitResistance(c), current: 0, voltage: 0, power: 0,
        blocked: (c.type === 'switch' && !c.closed) || c.type === 'capacitor' || (c.type === 'led' && c.reversed),
        forward: c.type === 'led' ? circuitForwardVoltage(c) : 0 };
    });
    var blockers = rows.filter(function(r) { return r.blocked; });
    var resistance = rows.reduce(function(sum, r) { return sum + r.resistance; }, 0);
    var forward = rows.reduce(function(sum, r) { return sum + r.forward; }, 0);
    var current = 0;
    if (mode === 'series') {
      current = blockers.length || !rows.length ? 0 : Math.max(0, voltage - forward) / resistance;
      rows.forEach(function(r) {
        r.current = current;
        if (blockers.length) r.voltage = r.blocked ? (blockers.length === 1 ? voltage : null) : 0;
        else if (current > 0) r.voltage = current * r.resistance + r.forward;
        // Below turn-on, individual diode voltages are not determined by this model.
        else r.voltage = r.forward ? (rows.filter(function(x) { return x.forward; }).length === 1 ? voltage : null) : 0;
      });
    } else {
      rows.forEach(function(r) {
        r.voltage = voltage;
        r.current = r.blocked ? 0 : Math.max(0, voltage - r.forward) / r.resistance;
        current += r.current;
      });
    }
    rows.forEach(function(r) { r.power = r.current * (r.voltage || 0); });
    var invR = rows.reduce(function(sum, r) { return sum + (r.blocked ? 0 : 1 / r.resistance); }, 0);
    var totalR = mode === 'series' ? (blockers.length || !rows.length ? 1e12 : resistance) : (invR ? 1 / invR : 1e12);
    if (forward) totalR = current > 0 ? voltage / current : 1e12;
    var isOpen = !rows.length || (mode === 'series' ? blockers.length > 0 || resistance >= 1e8 : invR === 0);
    var isShort = !isOpen && (mode === 'series' ? resistance < 1 && !forward : rows.some(function(r) { return !r.blocked && r.resistance < 1; }));
    return { mode: mode, voltage: voltage, components: components, rows: rows, current: current,
      power: voltage * current, totalR: totalR, isOpen: isOpen, isShort: isShort, hasLED: forward > 0,
      voltageAmbiguous: rows.some(function(r) { return r.voltage == null; }),
      ledOvercurrent: rows.some(function(r) { return r.component.type === 'led' && r.current > 0.020; }) };
  }
  function circuitVoltageText(value, digits) { return value == null ? 'undetermined' : value.toFixed(digits) + 'V'; }
  // Keep small positive measurements visible in the interactive readouts.
  function circuitPreciseVoltageText(value) {
    if(value==null)return 'undetermined';
    if(Math.abs(value)>0&&Math.abs(value)<1)return Math.abs(value)<.001?(value*1e6).toPrecision(3)+' µV':(value*1000).toFixed(2)+' mV';
    return circuitVoltageText(value,2);
  }
  window.StemLab.solveCircuit = solveCircuit;


  // Compare electrical meaning, ignoring regenerated IDs and irrelevant stored fields.

  function circuitExperimentDiff(before, after) {
    var a=solveCircuit(before), b=solveCircuit(after), changes=[];
    if(a.mode!==b.mode) changes.push('connection: '+a.mode+' → '+b.mode);
    if(a.voltage!==b.voltage) changes.push('supply: '+a.voltage+' V → '+b.voltage+' V');
    var pairChanges=function(x,y,index) {
      var out=[],name='part '+(index+1);
      if(x.type!==y.type) return [name+': '+x.type+' → '+y.type];
      if(['resistor','bulb','capacitor'].indexOf(x.type)!==-1&&x.value!==y.value) out.push(name+' '+x.type+': '+x.value+' → '+y.value+(x.type==='capacitor'?' µF':' Ω'));
      if(x.type==='switch'&&!!x.closed!==!!y.closed) out.push(name+' switch: '+(y.closed?'closed':'opened'));
      if(x.type==='led') {
        if(!!x.reversed!==!!y.reversed) out.push(name+' LED polarity reversed');
        if(circuitForwardVoltage(x)!==circuitForwardVoltage(y)) out.push(name+' LED forward voltage: '+circuitForwardVoltage(x)+' → '+circuitForwardVoltage(y)+' V');
      }
      return out;
    };
    // Minimum edit alignment keeps a removed middle part from appearing to change
    // every following part. IDs can change when a saved preset is reloaded.
    var aa=a.components,bb=b.components,cost=Array.from({length:aa.length+1},function(){return [];});
    for(var i=0;i<=aa.length;i++)cost[i][0]=i;
    for(var j=0;j<=bb.length;j++)cost[0][j]=j;
    for(i=1;i<=aa.length;i++)for(j=1;j<=bb.length;j++)cost[i][j]=Math.min(
      cost[i-1][j]+1,cost[i][j-1]+1,cost[i-1][j-1]+pairChanges(aa[i-1],bb[j-1],j-1).length);
    var edits=[];i=aa.length;j=bb.length;
    while(i||j) {
      var pair=i&&j?pairChanges(aa[i-1],bb[j-1],j-1):null;
      if(pair&&cost[i][j]===cost[i-1][j-1]+pair.length){edits.unshift.apply(edits,pair);i--;j--;}
      else if(i&&cost[i][j]===cost[i-1][j]+1){edits.unshift('part '+i+': removed '+aa[i-1].type);i--;}
      else {edits.unshift('part '+j+': added '+bb[j-1].type);j--;}
    }
    changes=changes.concat(edits);
    return {changes:changes,controlled:changes.length===1,unchanged:changes.length===0};
  }
  // Analytic response of one ideal capacitor and its series resistance.
  // Discharge assumes the source is removed and the resistor closes the loop.
  function circuitRCResponse(voltage, resistance, microfarads, time, discharge) {
    var v=circuitNumber(voltage,9,0,24), r=circuitNumber(resistance,1000,0.001,1e9);
    var capacitance=circuitNumber(microfarads,1000,1,10000)*1e-6;
    var tau=r*capacitance, t=circuitNumber(time,0,0,1e12), decay=Math.exp(-t/tau);
    var vc=v*(discharge?decay:1-decay), current=v/r*decay*(discharge?-1:1);
    return {tau:tau,time:t,voltage:vc,current:current,charge:capacitance*vc,
      energy:0.5*capacitance*vc*vc,resistorPower:current*current*r,
      fraction:v===0?0:(discharge?decay:1-decay)};
  }
  function circuitRCParameters(state) {
    var s=solveCircuit(state), caps=s.components.filter(function(c){return c.type==='capacitor';});
    var resistors=s.components.filter(function(c){return c.type==='resistor';});
    if(s.mode!=='series'||caps.length!==1||!resistors.length||s.components.some(function(c){
      return c.type!=='capacitor'&&c.type!=='resistor'&&!(c.type==='switch'&&c.closed);
    })) return null;
    return {voltage:s.voltage,capacitance:caps[0].value,resistance:s.components.reduce(function(sum,c){return sum+(c.type==='capacitor'?0:circuitResistance(c));},0)};
  }
  function circuitCurrentText(value) {
    if(value===0) return '0 A';
    var magnitude=Math.abs(value);
    if(magnitude<0.001) return (value*1e6).toPrecision(3)+' µA';
    if(magnitude<1) return (value*1000).toFixed(2)+' mA';
    return value.toFixed(3)+' A';
  }
  window.StemLab.circuitExperimentDiff=circuitExperimentDiff;
  window.StemLab.circuitRCResponse=circuitRCResponse;
  window.StemLab.circuitRCParameters=circuitRCParameters;


  var CIRCUIT_LESSONS = [
    {id:'resistance',title:'Turn down the current',concept:'Resistance',question:'Keep the supply at 9 V and double the resistance. What happens to the current?',choices:['It halves','It stays the same','It doubles'],answer:0,
      before:{mode:'series',voltage:9,components:[{type:'resistor',value:100,id:1}]},after:{mode:'series',voltage:9,components:[{type:'resistor',value:200,id:1}]},
      reason:'With voltage fixed, I = V/R. Doubling resistance halves the current.',reflect:'Use both current readings to explain the effect of resistance.'},
    {id:'paths',title:'Give charge another path',concept:'Parallel paths',question:'Add a second identical resistor in parallel at the same 9 V. What happens to the total source current?',choices:['It halves','It stays the same','It doubles'],answer:2,
      before:{mode:'parallel',voltage:9,components:[{type:'resistor',value:100,id:1}]},after:{mode:'parallel',voltage:9,components:[{type:'resistor',value:100,id:1},{type:'resistor',value:100,id:2}]},
      reason:'Each branch still has 9 V across 100 Ω and carries 90 mA. The source supplies both branch currents: 180 mA in total.',reflect:'Explain why the original branch current stays the same while source current changes.'},
    {id:'loop',title:'Complete the loop',concept:'Switches',question:'Close the switch in this series bulb circuit. What happens to the current?',choices:['It starts flowing','It stays at zero','Only the switch carries current'],answer:0,
      before:{mode:'series',voltage:9,components:[{type:'bulb',value:100,id:1},{type:'switch',closed:false,id:2}]},after:{mode:'series',voltage:9,components:[{type:'bulb',value:100,id:1},{type:'switch',closed:true,id:2}]},
      reason:'Closing the switch completes a conducting loop. The same current passes through the bulb and the switch; charge is not used up by the bulb.',reflect:'Describe what the bulb transfers and what continues around the loop.'}
  ];
  function circuitLessonResult(id, choice) {
    var lesson=CIRCUIT_LESSONS.find(function(l){return l.id===id;});
    if(!lesson||!Number.isInteger(choice)||choice<0||choice>=lesson.choices.length)return null;
    return {id:id,choice:choice,correct:choice===lesson.answer,
      before:JSON.parse(JSON.stringify(lesson.before)),after:JSON.parse(JSON.stringify(lesson.after))};
  }
  function circuitCoach(state) {
    var s=solveCircuit(state), index=-1;
    var find=function(fn){return s.components.findIndex(fn);};
    var result=function(id,title,body,tone){return {id:id,title:title,body:body,tone:tone||'info',index:index};};
    if(!s.components.length)return result('empty','Start with a question','Load the starter, choose a guided experiment, or add a resistor from the parts shelf.');
    if(s.voltage===0)return result('off','The source is switched off','At 0 V there is no source-driven current in this steady-state model. Raise the supply to test the circuit.');
    if(s.isShort){index=find(function(c){return c.type==='ammeter'||(c.type==='switch'&&c.closed);});return result('short','A very low resistance path','The ideal source predicts a very large current. In parallel, a closed switch or ammeter creates its own branch across the supply. Add a load in series or remove that branch.','warning');}
    if(s.ledOvercurrent){index=s.rows.findIndex(function(r){return r.component.type==='led'&&r.current>.020;});return result('led-high','The LED needs current limiting','This LED exceeds the illustrative 20 mA rating. Reduce voltage or use resistance in the same series path. A separate parallel resistor cannot protect it.','warning');}
    if(s.mode==='series') {
      index=find(function(c){return c.type==='switch'&&!c.closed;});
      if(index>=0)return result('switch-open','The loop has a gap','The open switch interrupts this series path, so every part carries zero current. Inspect the switch and close it to test your prediction.');
      index=find(function(c){return c.type==='led'&&c.reversed;});
      if(index>=0)return result('led-reversed','The LED blocks this direction','The LED is reversed in this model. Restore its polarity to allow forward current, provided the supply exceeds its forward voltage.');
      index=find(function(c){return c.type==='capacitor';});
      if(index>=0)return result('capacitor','You are seeing the final DC state','The capacitor blocks steady current. Open the Capacitor time lab to investigate what happens during charging and discharging.');
      index=find(function(c){return c.type==='voltmeter';});
      if(index>=0)return result('meter','The meter nearly stops the current','A voltmeter has very high resistance. This series placement changes the circuit. Measure voltage across a part; the inspector provides that reading without adding a meter.');
    }
    index=-1;
    if(s.mode==='parallel'&&s.rows.some(function(r){return r.blocked;}))return result('branch','One branch is blocked; others may still conduct','Each part here is a separate branch across the source. An open switch blocks its own branch, not the whole parallel circuit.');
    if(s.hasLED&&s.current===0)return result('threshold','The supply is below LED turn-on','The source must exceed the forward drop before this LED model conducts. Try increasing the voltage.');
    return result('flow',s.mode==='series'?'One path, the same current':'Shared voltage, separate currents',s.mode==='series'?'Every part carries '+circuitCurrentText(s.current)+'. Components transfer energy; they do not consume current. Compare the voltage across each part.':'Every branch has '+s.voltage+' V across it. Add the individual branch currents to recover the source current of '+circuitCurrentText(s.current)+'.');
  }
  window.StemLab.circuitLessonResult=circuitLessonResult;
  window.StemLab.circuitCoach=circuitCoach;

  function CircuitGuidedLab(props) {
    var h=props.React.createElement,d=props.state,lesson=CIRCUIT_LESSONS.find(function(l){return l.id===d.lessonId;}),trial=d.lessonTrial;
    var tested=lesson&&trial&&trial.id===lesson.id, before=tested?solveCircuit(trial.before):null,after=tested?solveCircuit(trial.after):null;
    var changed=tested&&!circuitExperimentDiff(trial.after,d).unchanged;
    return h('details',{className:'circuit-lessons',open:!!d.lessonOpen,onToggle:function(e){if(e.currentTarget.open!==!!d.lessonOpen)props.update('lessonOpen',e.currentTarget.open);}},
      h('summary',null,h('span',null,'Learn with a guided experiment'),h('small',null,'Predict · test · explain')),
      h('p',{className:'circuit-help'},'Choose a question. Loading an experiment replaces the bench circuit; Undo restores your previous build.'),
      h('div',{className:'circuit-lesson-cards'},CIRCUIT_LESSONS.map(function(l,i){return h('button',{key:l.id,type:'button','aria-pressed':d.lessonId===l.id,onClick:function(){props.updateMany(Object.assign({},JSON.parse(JSON.stringify(l.before)),{lessonId:l.id,lessonChoice:null,lessonTrial:null,lessonExplanation:'',lessonOpen:true,selectedPart:0}));}},
        h('span',{className:'circuit-eyebrow'},'0'+(i+1)+' / '+l.concept),h('strong',null,l.title));})),
      lesson&&h('div',{className:'circuit-lesson-body'},
        h('ol',{className:'circuit-learning-steps','aria-label':'Experiment progress'},
          ['Predict', 'Test', 'Explain'].map(function(step,i){return h('li',{key:step,'aria-current':(!tested?(d.lessonChoice==null?0:1):2)===i?'step':undefined},String(i+1)+'  '+step);})),
        h('fieldset',null,h('legend',null,lesson.question),
          h('div',{className:'circuit-action-row'},lesson.choices.map(function(choice,i){return h('button',{key:choice,type:'button',disabled:!!tested,'aria-pressed':d.lessonChoice===i,onClick:function(){props.update('lessonChoice',i);}},choice);}))),
        !tested&&h('div',{className:'circuit-action-row'},
          h('button',{type:'button',disabled:d.lessonChoice==null,onClick:function(){var result=circuitLessonResult(lesson.id,d.lessonChoice);if(result)props.updateMany(Object.assign({},result.after,{lessonTrial:result}));}},'Test my prediction'),
          h('span',{className:'circuit-help'},'Runs the stated change from the experiment baseline.')),
        tested&&h('div',{className:'circuit-lesson-evidence'},
          h('p',{role:'status'},h('strong',null,trial.correct?'Your prediction matches the evidence.':'Use this result to revise your prediction.'),' '+lesson.reason),
          h('div',{className:'circuit-comparison'},
            h('div',null,h('span',null,'Before · source current'),h('strong',null,circuitCurrentText(before.current))),
            h('div',null,h('span',null,'After · source current'),h('strong',null,circuitCurrentText(after.current))),
            h('div',null,h('span',null,'Single change'),h('strong',{className:'circuit-change-label'},circuitExperimentDiff(trial.before,trial.after).changes[0]))),
          h('p',{className:'circuit-help'},changed?'Saved experiment evidence. Your live bench has changed since this test.':'These readings match the experiment now on your bench.'),
          h('label',{htmlFor:'circuit-lesson-explanation'},'Explain using evidence'),
          h('p',{id:'circuit-lesson-prompt',className:'circuit-help'},lesson.reflect),
          h('textarea',{id:'circuit-lesson-explanation','aria-describedby':'circuit-lesson-prompt',rows:2,maxLength:1000,value:d.lessonExplanation||'',placeholder:'I observed… This happened because…',onChange:function(e){props.update('lessonExplanation',e.target.value);}}),
          h('div',{className:'circuit-action-row'},h('button',{type:'button',onClick:function(){props.updateMany(Object.assign({},JSON.parse(JSON.stringify(lesson.before)),{lessonChoice:null,lessonTrial:null,lessonExplanation:''}));}},'Try this experiment again'),
            h('button',{type:'button',onClick:function(){
              var report={format:'circuit-guided-evidence-v1',question:lesson.question,prediction:lesson.choices[trial.choice],before:trial.before,after:trial.after,beforeCurrent:before.current,afterCurrent:after.current,explanation:d.lessonExplanation||'',model:'Ideal DC teaching model'};
              var url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='circuit-'+lesson.id+'-evidence.json';link.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);
            }},'Save experiment evidence')))));
  }


  // Circuit files contain electrical settings only; never restore arbitrary tool state.
  function circuitDesignDocument(state) {
    var s=solveCircuit(state);
    return {format:'circuit-design-v1',circuit:{mode:s.mode,voltage:s.voltage,components:s.components.map(function(c){
      var part={type:c.type};
      if(['resistor','bulb','capacitor'].indexOf(c.type)!==-1)part.value=c.value;
      if(c.type==='switch')part.closed=!!c.closed;
      if(c.type==='led'){part.reversed=!!c.reversed;part.ledColor=c.ledColor||'#ef4444';}
      return part;
    })}};
  }
  function parseCircuitDesign(text) {
    if(typeof text!=='string'||text.length>65536)throw Error('Choose a circuit JSON file smaller than 64 KB.');
    var doc;try{doc=JSON.parse(text);}catch(e){throw Error('This file is not valid JSON. Choose a saved circuit design.');}
    if(!doc||doc.format!=='circuit-design-v1'||!doc.circuit||typeof doc.circuit!=='object')throw Error('This is not a circuit design file. Use a file saved with Download circuit.');
    var s=doc.circuit;
    if(s.mode!=='series'&&s.mode!=='parallel')throw Error('The circuit must use series or parallel connections.');
    if(typeof s.voltage!=='number'||!Number.isFinite(s.voltage)||s.voltage<0||s.voltage>24)throw Error('Supply voltage must be a number from 0 to 24 V.');
    if(!Array.isArray(s.components)||s.components.length>8)throw Error('This bench accepts up to eight components.');
    var components=s.components.map(function(c,i){
      var prefix='Part '+(i+1)+': ';
      if(!c||['resistor','bulb','switch','led','ammeter','voltmeter','capacitor'].indexOf(c.type)===-1)throw Error(prefix+'unrecognized component type.');
      var part={type:c.type,id:i+1};
      if(['resistor','bulb','capacitor'].indexOf(c.type)!==-1){
        if(typeof c.value!=='number'||!Number.isFinite(c.value)||c.value<1||c.value>10000)throw Error(prefix+'value must be between 1 and 10,000 '+(c.type==='capacitor'?'µF.':'Ω.'));
        part.value=c.value;
      }
      if(c.type==='switch'){
        if(typeof c.closed!=='boolean')throw Error(prefix+'switch state must be open or closed.');
        part.closed=c.closed;
      }
      if(c.type==='led'){
        if(typeof c.reversed!=='boolean')throw Error(prefix+'LED polarity is missing.');
        if(['#ef4444','#22c55e','#3b82f6','#eab308','#f8fafc'].indexOf(c.ledColor)===-1)throw Error(prefix+'unsupported LED color.');
        part.reversed=c.reversed;part.ledColor=c.ledColor;
      }
      return part;
    });
    return {mode:s.mode,voltage:s.voltage,components:components};
  }
  function circuitPowerText(value) {
    if(value===0)return '0 W';
    if(Math.abs(value)<.001)return (value*1e6).toPrecision(3)+' µW';
    if(Math.abs(value)<1)return (value*1000).toFixed(2)+' mW';
    return value.toFixed(3)+' W';
  }
  window.StemLab.circuitDesignDocument=circuitDesignDocument;
  window.StemLab.parseCircuitDesign=parseCircuitDesign;
  window.StemLab.circuitPowerText=circuitPowerText;

  function CircuitFileTools(props) {
    var React=props.React,h=React.createElement;
    var pending=React.useState(null),candidate=pending[0],setCandidate=pending[1];
    var feedback=React.useState(''),message=feedback[0],setMessage=feedback[1];
    var errorState=React.useState(false),isError=errorState[0],setError=errorState[1];
    var reading=React.useState(false),busy=reading[0],setBusy=reading[1];
    var generation=React.useRef(0),input=React.useRef(null);
    React.useEffect(function(){return function(){generation.current++;};},[]);
    var readFile=function(e){
      var file=e.target.files&&e.target.files[0],request=++generation.current;
      setCandidate(null);setMessage('');setError(false);
      if(!file){setBusy(false);return;}
      if(file.size>65536){setBusy(false);setError(true);setMessage('Choose a circuit JSON file smaller than 64 KB.');return;}
      setBusy(true);
      file.text().then(function(text){
        if(generation.current!==request)return;
        try{setCandidate(parseCircuitDesign(text));setMessage('Preview ready. Your bench has not changed.');}
        catch(err){setError(true);setMessage(err.message);}
      }).catch(function(){if(generation.current===request){setError(true);setMessage('The file could not be read. Choose it again.');}})
        .finally(function(){if(generation.current===request)setBusy(false);});
    };
    var preview=candidate?solveCircuit(candidate):null;
    return h('details',{className:'circuit-file-tools'},
      h('summary',null,'Save or open a circuit'),
      h('p',{className:'circuit-help'},'Save the electrical design to reuse later. These files contain the circuit only; use the evidence controls to save predictions and explanations.'),
      h('div',{className:'circuit-action-row'},
        h('button',{type:'button',onClick:function(){
          var url=URL.createObjectURL(new Blob([JSON.stringify(circuitDesignDocument(props.state),null,2)],{type:'application/json'})),a=document.createElement('a');
          a.href=url;a.download='circuit-design.json';a.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);
        }},'Download circuit'),
        h('label',{className:'circuit-file-label',htmlFor:'circuit-design-file'},'Open circuit file'),
        h('input',{ref:input,id:'circuit-design-file',type:'file',accept:'.json,application/json',onChange:readFile})),
      h('p',{role:isError?'alert':'status',className:isError?'circuit-file-error':'circuit-help'},busy?'Reading circuit…':message),
      candidate&&h('div',{className:'circuit-file-preview'},
        h('span',{className:'circuit-eyebrow'},'REVIEW BEFORE LOADING'),
        h('h4',null,candidate.components.length+' parts · '+candidate.mode+' · '+candidate.voltage+' V'),
        h('p',{className:'circuit-help'},'Predicted source current: '+circuitCurrentText(preview.current)+'.'),
        h('ol',null,candidate.components.map(function(c,i){return h('li',{key:i},c.type+(c.value!=null?' · '+c.value+(c.type==='capacitor'?' µF':c.type==='inductor'?' mH':' Ω'):c.type==='switch'?' · '+(c.closed?'closed':'open'):c.type==='led'?' · '+(c.reversed?'reversed':'forward'):''));})),
        preview.isShort&&h('p',{className:'circuit-file-error'},'This design has a very low resistance path across the ideal source. Loading it will show a short-circuit warning.'),
        h('div',{className:'circuit-action-row'},
          h('button',{type:'button',onClick:function(){props.updateMany(Object.assign({},candidate,{selectedPart:0}));setCandidate(null);setError(false);setMessage('Circuit loaded. Undo restores your previous build.');if(input.current)input.current.value='';}},'Load this circuit'),
          h('button',{type:'button',onClick:function(){generation.current++;setCandidate(null);setError(false);setMessage('Preview dismissed. Your bench is unchanged.');if(input.current)input.current.value='';}},'Dismiss preview'))));
  }

  function CircuitValueEditor(props) {
    var React=props.React,h=React.createElement;
    var draftState=React.useState(String(props.value)),draft=draftState[0],setDraft=draftState[1];
    var errorState=React.useState(''),error=errorState[0],setError=errorState[1];
    React.useEffect(function(){setDraft(String(props.value));setError('');},[props.value]);
    var commit=function(){
      var value=Number(draft);
      if(!draft.trim()||!Number.isFinite(value)||value<1||value>10000){setError('Enter a number from 1 to 10,000. The circuit still uses '+props.value+' '+props.unit+'.');return;}
      setError('');if(value!==props.value)props.onApply(value);
    };
    return h('div',{className:'circuit-value-editor'},
      h('label',{htmlFor:'circuit-inspector-value'},props.label),
      h('div',{className:'circuit-value-controls'},
        h('input',{id:'circuit-inspector-value',type:'number',min:1,max:10000,step:'any',value:draft,'aria-invalid':!!error,'aria-describedby':'circuit-value-help'+(error?' circuit-value-error':''),onChange:function(e){setDraft(e.target.value);setError('');},onBlur:commit,onKeyDown:function(e){if(e.key==='Enter'){e.preventDefault();commit();}if(e.key==='Escape'){e.preventDefault();setDraft(String(props.value));setError('');}}}),
        h('span',null,props.unit),
        h('button',{type:'button',onClick:commit},'Apply value')),
      h('p',{id:'circuit-value-help',className:'circuit-help'},'Press Enter or leave the field to apply. Escape restores the current value.'),
      error&&h('p',{id:'circuit-value-error',role:'alert',className:'circuit-file-error'},error),
      h('div',{className:'circuit-action-row'},
        h('button',{type:'button',disabled:props.value/2<1,onClick:function(){props.onApply(props.value/2);}},'Halve '+props.quantity),
        h('button',{type:'button',disabled:props.value*2>10000,onClick:function(){props.onApply(props.value*2);}},'Double '+props.quantity),
        h('span',{className:'circuit-help'},'Hold the source voltage fixed to compare the effect.')));
  }

  function CircuitTimeLab(props) {
    var h=props.React.createElement, p=circuitRCParameters(props.state);
    var discharge=props.state.rcPhase==='discharge', multiple=circuitNumber(props.state.rcTime,0,0,5);
    var response=p?circuitRCResponse(p.voltage,p.resistance,p.capacitance,multiple*p.resistance*p.capacitance*1e-6,discharge):null;
    return h('details',{className:'circuit-time-lab',open:!!props.state.showTimeLab,onToggle:function(e){if(e.currentTarget.open!==!!props.state.showTimeLab)props.update('showTimeLab',e.currentTarget.open);}},
      h('summary',null,'Capacitor time lab — watch charge build up'),
      h('p',{className:'circuit-help'},'The main bench shows final DC equilibrium. This separate time experiment shows what happens before equilibrium, using one capacitor and series resistance.'),
      !p?h('div',null,
        h('p',{className:'circuit-help'},'Use a series circuit with one capacitor, at least one resistor, and optional closed switches. Other devices and open switches need a more general transient solver.'),
        h('div',{className:'circuit-action-row'},h('button',{type:'button',onClick:props.loadStarter},'Load RC experiment')))
      :h('div',null,
        h('p',{className:'circuit-help'},p.resistance.toFixed(1)+' Ω · '+p.capacitance+' µF · '+p.voltage+' V · time constant τ = RC = '+response.tau.toPrecision(3)+' s'),
        h('div',{className:'circuit-action-row'},
          ['charge','discharge'].map(function(phase){return h('button',{key:phase,type:'button','aria-pressed':(props.state.rcPhase||'charge')===phase,onClick:function(){props.updateMany({rcPhase:phase,rcTime:0});}},phase==='charge'?'Charge from empty':'Discharge from full');}),
          h('button',{type:'button',onClick:function(){props.update('rcTime',1);}},'Jump to 1τ'),
          h('button',{type:'button',onClick:function(){props.update('rcTime',5);}},'Jump to 5τ')),
        h('p',{className:'circuit-help'},discharge?'Discharge experiment: disconnect the battery and close the resistor–capacitor loop. Initial capacitor voltage equals the supply setting; negative current means charge leaves the capacitor.':'Charging experiment: connect an initially uncharged capacitor to the supply through the resistance. Current begins at V/R and falls as capacitor voltage rises.'),
        h('svg', {viewBox:'0 0 480 200',role: 'img','aria-label':'Capacitor '+(discharge?'discharge':'charge')+' curve. At '+response.time.toPrecision(3)+' seconds, capacitor voltage is '+response.voltage.toFixed(3)+' volts and current is '+circuitCurrentText(response.current)+'.'},
          h('rect',{width:480,height:200,rx:12,fill:'#071520'}),
          [0,1,2,3,4,5].map(function(n){return h('g',{key:n},
            h('line',{x1:44+n*80,x2:44+n*80,y1:20,y2:160,stroke:'#315066',strokeDasharray:'3 4'}),
            h('text',{x:44+n*80,y:180,textAnchor:'middle',fill:'#cbd5e1',fontSize:11},n+'τ'));}),
          h('line',{x1:44,x2:444,y1:160,y2:160,stroke:'#94a3b8'}),
          h('text',{x:12,y:24,fill:'#cbd5e1',fontSize:11},p.voltage+' V'),
          h('text',{x:16,y:164,fill:'#cbd5e1',fontSize:11},'0'),
          h('polyline',{fill:'none',stroke:'#67e8f9',strokeWidth:3,points:Array.from({length:81},function(_,i){
            var f=p.voltage===0?0:(discharge?Math.exp(-i/16):1-Math.exp(-i/16));return (44+i*5)+','+(160-f*140);
          }).join(' ')}),
          h('line',{x1:44+multiple*80,x2:44+multiple*80,y1:20,y2:160,stroke:'#fbbf24',strokeDasharray:'5 3'}),
          h('circle',{cx:44+multiple*80,cy:160-response.fraction*140,r:6,fill:'#fbbf24',stroke:'#071520',strokeWidth:2}),
          h('text',{x:242,y:197,textAnchor:'middle',fill:'#cbd5e1',fontSize:11},'Elapsed time in time constants (τ)')),
        h('label',{className:'circuit-time-slider',htmlFor:'circuit-rc-time'},'Explore time: '+multiple.toFixed(2)+'τ ('+response.time.toPrecision(3)+' s)',
          h('input',{id:'circuit-rc-time',type:'range',min:0,max:5,step:0.01,value:multiple,'aria-valuetext':response.time.toPrecision(3)+' seconds; capacitor '+response.voltage.toFixed(3)+' volts',onChange:function(e){props.update('rcTime',Number(e.target.value));}})),
        h('div',{className:'circuit-comparison'},
          h('div',null,h('span',null,'Capacitor voltage'),h('strong',null,response.voltage.toFixed(3)+' V')),
          h('div',null,h('span',null,'Instantaneous current'),h('strong',null,circuitCurrentText(response.current))),
          h('div',null,h('span',null,'Stored energy'),h('strong',null,(response.energy*1000).toPrecision(3)+' mJ'))),
        h('p',{className:'circuit-help'},'At 1τ, charging reaches about 63.2% of the final voltage; discharging retains about 36.8%. At 5τ the transition is over 99% complete, but the mathematical current is not exactly zero.'),
        h('p',{className:'circuit-help'},'Try doubling R or C: the time constant doubles. Doubling R halves the starting current; doubling C leaves the starting current unchanged.'),
        h('p',{className:'circuit-help'},discharge?'Vc = V₀e^(−t/RC); I = −(V₀/R)e^(−t/RC); energy = ½CVc².':'Vc = V(1 − e^(−t/RC)); I = (V/R)e^(−t/RC); energy = ½CVc².')),
      h('a',{href:'https://openstax.org/books/university-physics-volume-2/pages/10-5-rc-circuits',target:'_blank',rel:'noopener noreferrer',className:'text-xs text-cyan-200 underline'},'RC circuit equations and explanation')
    );
  }

  // ── Reduced motion CSS (WCAG 2.3.3) - shared across all STEAM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-circuit')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-circuit';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();




  // Explain the selected solved row, so a conducting parallel branch is never
  // described as blocked by a different branch.
  function circuitPartInsight(s, row) {
    var c=row.component;
    if(s.timeDomain)return circuitTimeInsight(row);
    var result=function(title,body,prompt,tone){return {title:title,body:body,prompt:prompt,tone:tone||'info'};};
    if(s.voltage===0)return result('Source off','There is no source-driven current at 0 V in this steady-state view. Stored-charge transients are explored separately in the Capacitor time lab.','Predict what will change when you raise the supply.');
    if(c.type==='inductor')return result('Steady magnetic field','At DC equilibrium this inductor has a modeled 0.001 Ω winding resistance. Open a step or AC experiment to see how it opposes changes in current.','How does inductance affect how quickly current changes?');
    if(c.type==='capacitor')return result('Final DC state','A capacitor blocks steady current in this model. Zero current does not mean zero voltage or zero stored energy. Use the Capacitor time lab to explore charging and discharging.','How can a capacitor have voltage across it with no steady current through it?');
    if(c.type==='switch'&&!c.closed)return result('Open switch',s.mode==='parallel'?'This switch blocks only its own branch. Other parallel branches can still carry current.':'The gap breaks the series path, so every part in this path carries zero current.','Predict which readings will change when you close this switch.');
    if(c.type==='led'&&c.reversed)return result('Reverse polarity','This LED blocks reverse current in the simplified model. Reverse breakdown and leakage are not simulated.','Predict what restoring the polarity will do before trying it.');
    if(c.type==='led'&&row.current>.020)return result('LED current too high','This LED exceeds the illustrative 20 mA rating. It needs current-limiting resistance in the same series path; resistance in another parallel branch cannot protect it.','How could you reduce current while keeping the LED on?','warning');
    if((c.type==='ammeter'||c.type==='switch')&&s.isShort&&row.current>0)return result('Very low resistance path','This path has almost no resistance, so the ideal source predicts an extremely large current. Real sources have limits that this model does not simulate.','Where should a load go to limit current in this path?','warning');
    if(c.type==='voltmeter')return result('A meter changes the circuit',s.mode==='series'?'This meter has very high resistance and nearly stops the series current. Voltage is measured across a part; the readings here provide that measurement without adding a meter.':'This voltmeter is across the supply. Its high resistance draws a tiny current; its reading is the voltage between the two supply rails.','Why should a voltmeter draw as little current as possible?');
    if(row.current===0)return result('No current through this part',s.isOpen?'A blocking component elsewhere in this series path stops current here too. Inspect the other parts to find the gap.':'The supply does not exceed the combined LED forward drops in this path, so the LED model does not conduct.','Which change would allow current to flow through this part?');
    if(c.type==='led')return result('Forward conducting','The LED transfers electrical energy into light and heat. Its forward voltage and current come from the simplified diode model; the glow is illustrative.','What happens to LED current if you increase the series resistance?');
    if(c.type==='bulb')return result('Transferring energy','The bulb transfers electrical energy into light and heat. Power describes the rate of that transfer. This model uses a fixed filament resistance; real filament resistance changes with temperature.','Compare power in two bulbs. Which would you expect to glow more brightly?');
    if(c.type==='ammeter')return result('Measuring current','An ammeter has very low resistance and belongs in the current path. Here it carries the series current while adding a very small voltage drop.','Why would connecting an ammeter directly across the supply change the circuit?');
    if(c.type==='switch')return result('Closed switch','The contacts complete this part of the path. The small modeled resistance produces a tiny voltage drop, so most of the supply voltage appears across the loads.','Does a closed switch use up the current that passes through it?');
    return result('Resistance transfers energy','The voltage across this resistor equals its current times its resistance: V = I × R. Electrical energy becomes heat; charge continues through the circuit.',s.mode==='parallel'?'If you double this resistance, what happens to this branch current and the other branch currents?':'If you double this resistance, what happens to the current through every part?');
  }

  // Recover only node potentials fixed by the shared DC solution. Unknown
  // internal nodes stay unknown; known prefixes/suffixes remain measurable.
  function circuitProbeReading(solved, red, black) {
    if(solved.mode==='mixed')return circuitMixedProbe(solved,red,black);
    var n=solved.rows.length,nodes;
    if(solved.mode==='parallel'||!n)nodes=[{label:'N0 · positive rail',voltage:solved.voltage},{label:'N1 · return rail',voltage:0}];
    else{
      nodes=Array.from({length:n+1},function(_,i){return {label:'N'+i+(i===0?' · source +':i===n?' · source −':' · after part '+i),voltage:null};});
      nodes[0].voltage=solved.voltage;nodes[n].voltage=0;
      for(var i=0;i<n-1;i++){if(solved.rows[i].voltage==null)break;nodes[i+1].voltage=nodes[i].voltage-solved.rows[i].voltage;}
      for(var j=n-1;j>0;j--){if(solved.rows[j].voltage==null)break;if(nodes[j].voltage==null)nodes[j].voltage=nodes[j+1].voltage+solved.rows[j].voltage;}
    }
    var index=function(value,fallback){return Number.isInteger(value)?Math.max(0,Math.min(nodes.length-1,value)):fallback;};
    red=index(red,0);black=index(black,nodes.length-1);
    var voltage=red===black?0:nodes[red].voltage==null||nodes[black].voltage==null?null:nodes[red].voltage-nodes[black].voltage;
    // A floating section can have a known differential voltage even when neither
    // endpoint has a resolved absolute potential (for example, an unpowered resistor).
    if(voltage==null&&solved.mode==='series'&&n){
      var low=Math.min(red,black),high=Math.max(red,black),drop=0,known=true;
      for(var p=low;p<high;p++){if(solved.rows[p].voltage==null){known=false;break;}drop+=solved.rows[p].voltage;}
      if(known)voltage=red<black?drop:-drop;
    }
    return {nodes:nodes,red:red,black:black,voltage:voltage};
  }
  window.StemLab.circuitProbeReading=circuitProbeReading;

  function circuitProbeTask(state, selectedIndex, kind) {
    if(['part','source','reverse','same'].indexOf(kind)<0)return null;
    var s=solveCircuit(state),last=circuitProbeReading(s).nodes.length-1;
    selectedIndex=Math.max(0,Math.min(s.rows.length-1,Number.isInteger(selectedIndex)?selectedIndex:0));
    if(kind==='part'&&!s.rows.length)return null;
    var red=kind==='reverse'?last:kind==='part'&&s.mode==='series'?selectedIndex:0;
    var black=kind==='same'||kind==='reverse'?0:kind==='part'&&s.mode==='series'?selectedIndex+1:last;
    var value=circuitProbeReading(s,red,black).voltage;
    return {kind:kind,circuit:circuitDesignDocument(state).circuit,red:red,black:black,expected:value,
      sign:value==null?'undetermined':value===0?'zero':value<0?'negative':'positive',
      title:kind==='part'?'Measure part '+(selectedIndex+1)+' · '+s.rows[selectedIndex].component.type:kind==='source'?'Measure the source':kind==='reverse'?'Reverse the source measurement':'Measure one node against itself',
      prompt:kind==='same'?'Place both leads on the same node. You may choose any node.':'Place the red lead on N'+red+' and the black lead on N'+black+'. Predict the sign before positioning them.'};
  }
  function circuitProbeTaskCheck(task,state,prediction) {
    if(!task||['positive','negative','zero','undetermined'].indexOf(prediction)<0)return null;
    if(!circuitExperimentDiff(task.circuit,state).unchanged)return {stale:true};
    var reading=circuitProbeReading(solveCircuit(state),state.probeRed,state.probeBlack);
    var placed=task.kind==='same'?reading.red===reading.black:reading.red===task.red&&reading.black===task.black;
    var reversed=task.red!==task.black&&reading.red===task.black&&reading.black===task.red;
    return {stale:false,placed:placed,predicted:prediction===task.sign,reading:reading.voltage,red:reading.red,black:reading.black,prediction:prediction,
      hint:placed?'The probe connections match the task.':task.kind==='same'?'Both leads must touch the same node. Equal readings at different nodes do not meet this task.':reversed?'The leads are reversed. Swap them to match the requested orientation.':'Check the node labels. A matching voltage number alone does not mean you measured the requested connection.'};
  }
  window.StemLab.circuitProbeTask=circuitProbeTask;
  window.StemLab.circuitProbeTaskCheck=circuitProbeTaskCheck;

  function CircuitProbePractice(props) {
    var React=props.React,h=React.createElement;
    var practice=props.state.probePractice||{},kind=practice.kind||'part',task=practice.task||null,prediction=practice.prediction||null,result=practice.result||null;
    var updatePractice=function(patch){props.updateMany({probePractice:Object.assign({},practice,patch)});};
    var stale=task&&!circuitExperimentDiff(task.circuit,props.state).unchanged;
    var reading=circuitProbeReading(props.solved,props.state.probeRed,props.state.probeBlack);
    var currentResult=result&&!stale&&result.red===reading.red&&result.black===reading.black&&result.prediction===prediction;
    var start=function(){var next=circuitProbeTask(props.state,props.selectedIndex,kind);if(next)props.updateMany({probePractice:{kind:kind,task:next,prediction:null,result:null,open:true},probeRed:0,probeBlack:0});};
    return h('details',{className:'circuit-probe-practice',open:!!practice.open,onToggle:function(e){if(e.currentTarget.open!==!!practice.open)updatePractice({open:e.currentTarget.open});}},
      h('summary',null,'Practice placing probes'),
      h('p',null,'Use this circuit to predict, measure, and explain. Starting places both leads on N0.'),
      h('div',{className:'circuit-practice-setup'},h('label',{htmlFor:'circuit-probe-task'},'Measurement challenge'),
        h('select',{id:'circuit-probe-task',value:kind,onChange:function(e){updatePractice({kind:e.target.value,task:null,prediction:null,result:null});}},
          h('option',{value:'part'},'Selected component'),h('option',{value:'source'},'Source voltage'),h('option',{value:'reverse'},'Source with reversed leads'),h('option',{value:'same'},'Both leads on one node')),
        h('button',{type:'button',disabled:kind==='part'&&!props.solved.rows.length,onClick:start},task?'Restart measurement challenge':'Start measurement challenge')),
      task&&h('div',{className:'circuit-practice-task'},
        h('h4',null,task.title),h('p',null,task.prompt),
        stale?h('p',{role:'status',className:'circuit-practice-feedback'},'The circuit changed. Restart the challenge to use the new circuit.'):h(React.Fragment,null,
          h('fieldset',null,h('legend',null,'1 · Predict the sign'),h('div',{className:'circuit-practice-predictions'},
            [{id:'positive',label:'Positive (+)'},{id:'zero',label:'Zero'},{id:'negative',label:'Negative (−)'},{id:'undetermined',label:'Undetermined'}].map(function(choice){return h('button',{key:choice.id,type:'button','aria-pressed':prediction===choice.id,onClick:function(){updatePractice({prediction:choice.id,result:null});}},choice.label);}))),
          h('p',null,'2 · Position the leads using the probe controls below.'),
          h('button',{type:'button',className:'circuit-practice-check',disabled:prediction==null,onClick:function(){updatePractice({result:circuitProbeTaskCheck(task,props.state,prediction)});}},'3 · Check my probes'),
          currentResult&&h('div',{className:'circuit-practice-feedback','data-correct':result.placed,role:'status'},
            h('strong',null,result.placed?'Connections correct':'Adjust the probe positions'),h('p',null,result.hint),
            result.placed&&h('p',null,'Measured '+circuitPreciseVoltageText(result.reading)+'. '+(result.predicted?'Your sign prediction matched.':'Your prediction was '+prediction+'; the reading is '+task.sign+'.')),
            result.placed&&h('p',null,'Explain: '+(task.sign==='undetermined'?'Why is an undetermined reading different from zero?':task.sign==='zero'?'Why can the voltage difference be zero even when circuit current is not?':'How does the order of the red and black leads determine the sign?'))),
          result&&!currentResult&&h('p',{role:'status'},'Probe positions changed. Check your placement again.'))));
  }

  // Self-contained vector snapshot, rasterized locally for a portable PNG.
  function circuitBenchSnapshot(scene, solved, selectedIndex, state) {
    var ns='http://www.w3.org/2000/svg',root=document.createElementNS(ns,'svg');
    var notes=[solved.timeDomain?'Passive '+solved.signalMode+' response at '+circuitTimeText(solved.time)+'. Signed measurements use N0-to-N1 reference.':'Idealized steady DC model. Geometry is illustrative, not a breadboard wiring guide.'];
    if(state.sceneProbes){var probe=circuitProbeReading(solved,state.probeRed,state.probeBlack);notes.push('Virtual voltmeter: red N'+probe.red+' − black N'+probe.black+' = '+circuitPreciseVoltageText(probe.voltage)+'. Ideal probes do not load the circuit.');}
    if(state.sceneCurrent)notes.push('Arrows show conventional-current direction, not speed or electron motion.');
    if(state.sceneCurrent&&solved.mode!=='series')notes.push('In parallel, arrows trace the selected branch only; shared rails carry combined branch currents.');
    if(solved.voltageAmbiguous)notes.push('Undetermined voltages are not zero; individual blocked-part voltages may be unresolved.');
    if(solved.isShort)notes.push('Very low resistance: ideal-source current can exceed real source limits.');
    if(solved.ledOvercurrent)notes.push('LED current exceeds the illustrative 20 mA rating. Use current-limiting series resistance.');
    var tableY=1016,footerY=tableY+48+solved.rows.length*40,height=footerY+notes.length*27+30;
    root.setAttribute('width','1280');root.setAttribute('height',String(height));root.setAttribute('viewBox','0 0 1280 '+height);
    root.setAttribute('role','img');root.setAttribute('aria-label','Circuit bench snapshot with component measurements');
    root.setAttribute('font-family','Arial, sans-serif');
    var add=function(tag,attrs,text,parent){var el=document.createElementNS(ns,tag);Object.keys(attrs||{}).forEach(function(k){el.setAttribute(k,String(attrs[k]));});if(text!=null)el.textContent=text;(parent||root).appendChild(el);return el;};
    add('rect',{width:1280,height:height,fill:'#091c29'});
    add('text',{x:40,y:43,fill:'#c4f1e6','font-size':26,'font-weight':700},'Circuit bench · '+solved.mode);
    add('text',{x:40,y:77,fill:'#dbeaf2','font-size':20},'Supply '+circuitPreciseVoltageText(solved.voltage)+' · Current '+circuitCurrentText(solved.current)+' · Power '+circuitPowerText(solved.power));
    var picture=scene.cloneNode(true);picture.setAttribute('x','0');picture.setAttribute('y','104');picture.setAttribute('width','1280');picture.setAttribute('height','820');picture.setAttribute('font-family','Arial, sans-serif');picture.removeAttribute('aria-describedby');root.appendChild(picture);
    // Numbered selection markers are HTML in the live scene; copy their positions into the image.
    if(scene.parentElement)Array.from(scene.parentElement.querySelectorAll('.circuit-scene-pin')).forEach(function(pin){
      var x=parseFloat(pin.style.left)*6.4,y=parseFloat(pin.style.top)*4.1,selected=pin.getAttribute('aria-pressed')==='true';
      if(!Number.isFinite(x)||!Number.isFinite(y))return;
      add('circle',{cx:x,cy:y,r:12,fill:selected?'#b1ecdf':'#102b39',stroke:selected?'#d0fff0':'#779cac','stroke-width':1},null,picture);
      add('text',{x:x,y:y+3.5,fill:selected?'#123c40':'#e2f0f5','font-size':10,'text-anchor':'middle','font-weight':700},pin.textContent,picture);
    });
    add('text',{x:40,y:959,fill:'#d2e9ed','font-size':20},(state.sceneCloseup?'Close-up view':'Bench view')+' · Zoom '+Math.round(circuitCameraState(state).zoom*100)+'%'+' · Selected part '+(selectedIndex+1)+' · Measurements at capture');
    if(state.sceneCloseup||circuitCameraState(state).zoom!==1||circuitCameraState(state).x||circuitCameraState(state).y)add('text',{x:40,y:990,fill:'#b4cdd8','font-size':18},'Framing may hide parts of the circuit. The table includes every connected component.');
    ['PART','VOLTAGE ACROSS','CURRENT THROUGH','POWER TRANSFERRED'].forEach(function(label,i){add('text',{x:[40,465,745,1000][i],y:tableY,fill:'#a5c9d6','font-size':16,'font-weight':700},label);});
    solved.rows.forEach(function(r,i){
      var y=tableY+32+i*40,c=r.component,label=(i+1)+'. '+(c.type==='led'?'LED':c.type);
      if(c.type==='resistor'||c.type==='bulb')label+=' · '+c.value+' Ω';
      if(c.type==='capacitor')label+=' · '+c.value+' µF';
      if(c.type==='inductor')label+=' · '+c.value+' mH';
      if(solved.mode==='mixed')label+=' · branch '+String.fromCharCode(64+r.branch);
      if(c.type==='switch')label+=c.closed?' · closed':' · open';
      if(c.type==='led'&&c.reversed)label+=' · reversed';
      if(i===selectedIndex)add('rect',{x:28,y:y-24,width:1224,height:37,rx:5,fill:'#18404a'});
      [label,circuitPreciseVoltageText(r.voltage),circuitCurrentText(r.current),circuitPowerText(r.power)].forEach(function(value,j){add('text',{x:[40,465,745,1000][j],y:y,fill:['#dfedf3','#bae5fa','#b8edce','#f6dda0'][j],'font-size':19},value);});
    });
    notes.forEach(function(note,i){add('text',{x:40,y:footerY+i*27,fill:'#b9ccd6','font-size':18},note);});
    return new XMLSerializer().serializeToString(root);
  }
  window.StemLab.circuitBenchSnapshot=circuitBenchSnapshot;

  // Parallel supply rails with an ordered series path inside each branch.
  // The explicit connection graph is shared by the solver, probes and both views.
  // Exact passive series-branch responses. AC uses the settled periodic solution;
  // step/release use specified initial charge/current, including all damping cases.
  function circuitTimeConfig(state) {
    var base=solveMixedCircuit(state),mode=['step','release','ac'].includes(state.signalMode)?state.signalMode:'dc';
    var frequency=circuitNumber(state.frequency,50,1,1000),errors=[],slow=0,fast=0;
    var branches=base.branches.map(function(b){
      var R=0,L=0,invC=0;
      b.solved.components.forEach(function(c){
        if(c.type==='led')errors.push('Branch '+b.name+': LEDs need a nonlinear time solver. Remove the LED or use DC equilibrium.');
        if(c.type==='switch'&&!c.closed)errors.push('Branch '+b.name+': close the switch before starting a time experiment. Switching during a run is not modeled.');
        if(c.type==='capacitor')invC+=1/(c.value*1e-6);
        else if(c.type==='inductor'){L+=c.value*.001;R+=.001;}
        else R+=circuitResistance(c);
      });
      if(R<1)errors.push('Branch '+b.name+': add at least 1 Ω of series resistance for this time experiment.');
      var C=invC?1/invC:0,tau=C?R*C:L?L/R:0,hz=0;
      if(C&&L){var alpha=R/(2*L),w0=1/Math.sqrt(L*C),delta=alpha*alpha-w0*w0;
        if(delta<0){hz=Math.sqrt(-delta)/(2*Math.PI);tau=1/alpha;}
        else tau=(alpha+Math.sqrt(Math.max(0,delta)))/(w0*w0);
      }
      slow=Math.max(slow,tau);fast=Math.max(fast,hz);
      return {id:b.id,R:R,L:L,C:C,tau:tau,fastTau:C&&L&&delta>=0?1/(alpha+Math.sqrt(delta)):tau,ringHz:hz};
    });
    if(!base.rows.length)errors.push('Add a passive branch to begin.');
    var auto=mode==='ac'?5/frequency:Math.min(slow?slow*5:1,fast?8/fast:Infinity);
    auto=Math.max(.000001,Math.min(1000000,auto));
    var duration=circuitNumber(state.timeWindow,auto,.000001,1000000),cycles=duration*(mode==='ac'?frequency:fast);
    return {base:base,mode:mode,frequency:frequency,branches:branches,errors:errors,active:mode!=='dc'&&!errors.length,duration:duration,autoDuration:auto,resolved:cycles<=40,sampleCount:Math.max(400,Math.min(1600,Math.ceil(cycles*40)))};
  }
  function circuitPassiveResponse(p,amplitude,mode,frequency,time) {
    var t=Math.max(0,time),R=p.R,L=p.L,C=p.C,u=mode==='release'?0:amplitude,i=0,vc=0,vl=0;
    if(mode==='ac'){
      var w=2*Math.PI*frequency,xc=C?1/(w*C):0,xl=w*L,phase=Math.atan2(xl-xc,R),peak=amplitude/Math.hypot(R,xl-xc),angle=w*t-phase;
      u=amplitude*Math.sin(w*t);i=peak*Math.sin(angle);vc=C?peak*xc*Math.sin(angle-Math.PI/2):0;vl=L?peak*xl*Math.sin(angle+Math.PI/2):0;
    }else if(C&&L){
      var alpha=R/(2*L),w02=1/(L*C),delta=alpha*alpha-w02,qEq=C*u,q0=mode==='release'?C*amplitude:0,A=q0-qEq,qh,ih;
      if(Math.abs(delta)<w02*1e-10){var B=alpha*A,E=Math.exp(-alpha*t);qh=E*(A+B*t);ih=E*(-alpha*B*t);}
      else if(delta<0){var beta=Math.sqrt(-delta),B=alpha*A/beta,E=Math.exp(-alpha*t),ct=Math.cos(beta*t),st=Math.sin(beta*t);qh=E*(A*ct+B*st);ih=E*((B*beta-alpha*A)*ct-(A*beta+alpha*B)*st);}
      else {var root=Math.sqrt(delta),r1=-w02/(alpha+root),r2=-alpha-root,a=-r2*A/(r1-r2),b=A-a,e1=Math.exp(r1*t),e2=Math.exp(r2*t);qh=a*e1+b*e2;ih=r1*a*e1+r2*b*e2;}
      vc=(qEq+qh)/C;i=ih;vl=u-R*i-vc;
    }else if(C){
      var initial=mode==='release'?amplitude:0;
      vc=u+(initial-u)*Math.exp(-t/(R*C));i=(u-vc)/R;
    }else if(L){
      var initial=mode==='release'?amplitude/R:0;
      i=u/R+(initial-u/R)*Math.exp(-t*R/L);vl=u-R*i;
    }else i=u/R;
    return {voltage:u,current:i,capacitorVoltage:vc,inductorVoltage:vl,energy:.5*C*vc*vc+.5*L*i*i};
  }
  function circuitTimeFrame(config,time) {
    if(!config.active)return config.base;
    var t=circuitNumber(time,0,0,100000000),base=config.base,rows=base.rows.map(function(r){return Object.assign({},r);}),nodes=base.nodes.map(function(n){return Object.assign({},n);}),totalCurrent=0,totalEnergy=0,voltage=0;
    var branches=base.branches.map(function(b,bi){var p=config.branches[bi],response=circuitPassiveResponse(p,base.voltage,config.mode,config.frequency,t),potential=response.voltage;
      voltage=response.voltage;totalCurrent+=response.current;totalEnergy+=response.energy;
      b.indices.forEach(function(index){var r=rows[index],c=r.component,drop,energy=0;
        if(c.type==='capacitor'){drop=response.capacitorVoltage*p.C/(c.value*1e-6);energy=.5*c.value*1e-6*drop*drop;}
        else if(c.type==='inductor'){drop=response.inductorVoltage*c.value*.001/p.L+response.current*.001;energy=.5*c.value*.001*response.current*response.current;}
        else drop=response.current*circuitResistance(c);
        r.current=response.current;r.voltage=drop;r.power=drop*response.current;r.energy=energy;r.blocked=false;
        potential-=drop;if(r.nodeB!==1)nodes[r.nodeB].voltage=potential;
      });
      return Object.assign({},b,{solved:Object.assign({},b.solved,{timeDomain:true,signalMode:config.mode,time:t,voltage:response.voltage,current:response.current,power:response.voltage===0?0:response.voltage*response.current,energy:response.energy,rows:b.indices.map(function(i){return rows[i];}),isOpen:false,voltageAmbiguous:false})});
    });
    nodes[0].voltage=voltage;nodes[1].voltage=0;
    return Object.assign({},base,{timeDomain:true,signalMode:config.mode,time:t,frequency:config.frequency,voltage:voltage,current:totalCurrent,power:voltage===0?0:voltage*totalCurrent,energy:totalEnergy,rows:rows,nodes:nodes,branches:branches,isOpen:false,isShort:false,voltageAmbiguous:false});
  }
  function circuitTimeSamples(config,index) {
    var selected=Math.max(0,Math.min(config.base.rows.length-1,index||0));
    var times=Array.from({length:config.sampleCount+1},function(_,i){return config.duration*i/config.sampleCount;});
    // Retain the uniform grid for ringing, and resolve fast exponential startup
    // without drawing a misleading long ramp when branch time constants differ.
    if(config.mode!=='ac')config.branches.forEach(function(p){[p.tau,p.fastTau].forEach(function(tau){
      if(!(tau>0)||tau>=config.duration/config.sampleCount*16)return;
      for(var i=1;i<=80;i++){var t=tau*i/16;if(t<config.duration)times.push(t);}
    });});
    times=Array.from(new Set(times)).sort(function(a,b){return a-b;});
    return times.map(function(time){var s=circuitTimeFrame(config,time),r=s.rows[selected];return {time:time,source:s.voltage,voltage:r?r.voltage:0,current:r?r.current:0,energy:s.energy||0};});
  }
  function circuitScopeCSV(samples) {
    return 'time_s,source_voltage_V,selected_part_voltage_V,selected_branch_current_A,total_stored_energy_J\n'+samples.map(function(p){return [p.time,p.source,p.voltage,p.current,p.energy].join(',');}).join('\n');
  }
  function circuitTimeText(value) {return value<.001?(value*1e6).toPrecision(3)+' µs':value<1?(value*1000).toPrecision(4)+' ms':value.toPrecision(4)+' s';}
  function circuitTimeInsight(row) {
    var c=row.component,reactive=c.type==='capacitor'||c.type==='inductor';
    return {title:reactive?(c.type==='capacitor'?'Electric energy storage':'Magnetic energy storage'):'Instantaneous measurement',tone:'info',
      body:reactive?'Stored energy: '+row.energy.toPrecision(4)+' J. Positive component power means net energy enters; negative power means net energy leaves. Inductors include 0.001 Ω winding resistance.':'These readings are evaluated at the selected time. Negative current means flow opposite the N0-to-N1 branch reference. Resistive parts transfer energy into heat.',
      prompt:reactive?'At what points does the component absorb energy, and when does it return energy?':'Compare the branch current at two times. Which component explains the change?'};
  }
  window.StemLab.circuitTimeConfig=circuitTimeConfig;
  window.StemLab.circuitPassiveResponse=circuitPassiveResponse;
  window.StemLab.circuitTimeFrame=circuitTimeFrame;
  window.StemLab.circuitTimeSamples=circuitTimeSamples;
  window.StemLab.circuitScopeCSV=circuitScopeCSV;

  function CircuitTimeScope(props) {
    var React=props.React,h=React.createElement,cfg=props.config,d=props.state,s=props.solved,index=props.selectedIndex;
    var samples=React.useMemo(function(){return cfg.active&&cfg.resolved?circuitTimeSamples(cfg,index):[];},[cfg,index]);
    var limit=function(key){return Math.max(1e-9,samples.reduce(function(m,p){return Math.max(m,Math.abs(p[key]),key==='voltage'?Math.abs(p.source):0);},0));};
    var vMax=limit('voltage'),iMax=limit('current'),t=cfg.active?s.time:0,percent=Math.min(1,t/cfg.duration),x=100+percent*586;
    var path=function(key,center,amp,max){return samples.map(function(p,i){return (i?'L':'M')+(100+p.time/cfg.duration*586).toFixed(2)+' '+(center-p[key]/max*amp).toFixed(2);}).join(' ');};
    var download=function(){var csv=circuitScopeCSV(samples),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='circuit-'+cfg.mode+'-part-'+(index+1)+'.csv';a.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);};
    return h('section',{className:'circuit-time-scope','aria-labelledby':'circuit-scope-title'},
      h('div',{className:'circuit-step-heading'},h('div',null,h('span',{className:'circuit-eyebrow'},'TIME / SIGNAL / ENERGY'),h('h3',{id:'circuit-scope-title'},'See the circuit respond')),h('span',{className:'circuit-model-chip'},cfg.active?circuitTimeText(t):'DC equilibrium')),
      h('div',{className:'circuit-signal-controls'},
        h('label',null,'Experiment ',h('select',{'aria-label':'Signal experiment',value:cfg.mode,onChange:function(e){props.updateMany({signalMode:e.target.value,timeCursor:0,simRunning:false,timeWindow:'auto'});}},[['dc','DC equilibrium'],['step','DC step from rest'],['release','Release stored energy'],['ac','AC sine · settled response']].map(function(v){return h('option',{key:v[0],value:v[0]},v[1]);}))),
        h('button',{type:'button',onClick:function(){props.load('rc');}},'Load RC timing example'),h('button',{type:'button',onClick:function(){props.load('rlc');}},'Load RLC resonance example')),
      cfg.mode!=='dc'&&cfg.errors.length>0&&h('div',{className:'circuit-warning',role:'status'},h('strong',null,'Time experiment unavailable'),h('ul',null,cfg.errors.map(function(message,i){return h('li',{key:i},message); }))),
      cfg.active&&h(React.Fragment,null,
        h('p',{className:'circuit-help'},cfg.mode==='ac'?'Settled AC response: startup transients have already decayed. The supply setting is peak voltage, not RMS. Signs use the N0 → N1 branch reference.':cfg.mode==='release'?'The source is replaced by a 0 V connection, keeping each branch loop closed. Capacitors start with equal series charge totaling the initial supply voltage. In branches with inductors but no capacitors, current starts at the prior DC value.':'A DC step is applied at t = 0. Capacitors begin uncharged and inductor currents begin at zero. Series capacitors share charge; inductors share branch current.'),
        h('div',{className:'circuit-signal-controls'},
          cfg.mode==='ac'&&h('label',null,'Frequency ',h('input',{type:'range',min:1,max:1000,step:1,value:cfg.frequency,'aria-label':'AC frequency',onChange:function(e){props.updateMany({frequency:Number(e.target.value),timeCursor:0,simRunning:false});}}),h('strong',null,cfg.frequency+' Hz')),
          h('label',null,'Window ',h('select',{'aria-label':'Oscilloscope time window',value:d.timeWindow||'auto',onChange:function(e){props.updateMany({timeWindow:e.target.value,timeCursor:0,simRunning:false});}},[['auto','Automatic'],['0.000001','1 µs'],['0.00001','10 µs'],['0.0001','100 µs'],['0.001','1 ms'],['0.01','10 ms'],['0.1','100 ms'],['1','1 s'],['10','10 s'],['100','100 s']].map(function(v){return h('option',{key:v[0],value:v[0]},v[1]);}))),
          h('label',null,'Trace part ',h('select',{'aria-label':'Oscilloscope component',value:index,onChange:function(e){props.updateMany({selectedPart:Number(e.target.value)});}},cfg.base.rows.map(function(r,i){return h('option',{key:i,value:i},(i+1)+'. '+r.component.type+' · branch '+String.fromCharCode(64+r.branch));})))),
        !cfg.resolved&&h('p',{className:'circuit-warning'},'This window is too wide to resolve the oscillation. Choose a shorter window or Automatic. Cursor readings remain available; trace export waits for a resolved window.'),
        cfg.resolved&&h('div',{className:'circuit-scope-chart',tabIndex:0,role:'region','aria-label':'Scrollable oscilloscope chart'},h('svg', {viewBox:'0 0 720 330',role: 'img','aria-label':'Calculated oscilloscope traces over '+circuitTimeText(cfg.duration)+'. Supply and selected part voltage are on the upper axis; selected branch current is on the lower axis. Cursor at '+circuitTimeText(t)+'. Exact cursor readings follow.'},
          h('rect',{x:0,y:0,width:720,height:330,rx:14,fill:'#081c2a'}),
          [100,217.2,334.4,451.6,568.8,686].map(function(gx,i){return h('g',{key:i},h('path',{d:'M '+gx+' 25 V 292',stroke:'#30505f',strokeWidth:1}),h('text',{x:gx,y:315,fill:'#c0d9e6',fontSize:12,textAnchor:'middle'},circuitTimeText(cfg.duration*i/5)));}),
          [45,105,165,195,240,285].map(function(y,i){return h('path',{key:i,d:'M 100 '+y+' H 686',stroke:i===1||i===4?'#7193a5':'#2a4655',strokeWidth:1});}),
          h('text',{x:92,y:49,fill:'#b4e7dc',fontSize:12,textAnchor:'end'},circuitPreciseVoltageText(vMax)),h('text',{x:92,y:109,fill:'#b4e7dc',fontSize:12,textAnchor:'end'},'0 V'),h('text',{x:92,y:169,fill:'#b4e7dc',fontSize:12,textAnchor:'end'},circuitPreciseVoltageText(-vMax)),
          h('text',{x:92,y:199,fill:'#fde3a3',fontSize:12,textAnchor:'end'},circuitCurrentText(iMax)),h('text',{x:92,y:244,fill:'#fde3a3',fontSize:12,textAnchor:'end'},'0 A'),h('text',{x:92,y:289,fill:'#fde3a3',fontSize:12,textAnchor:'end'},circuitCurrentText(-iMax)),
          h('path',{d:path('source',105,60,vMax),fill:'none',stroke:'#c5b8fa',strokeWidth:2,strokeDasharray:'7 5'}),h('path',{d:path('voltage',105,60,vMax),fill:'none',stroke:'#8bf0d0',strokeWidth:2.5}),h('path',{d:path('current',240,45,iMax),fill:'none',stroke:'#ffda82',strokeWidth:2.5}),
          h('path',{d:'M '+x+' 25 V 292',stroke:'#f1f7fb',strokeWidth:1.5,strokeDasharray:'3 4'}))),
        h('p',{className:'circuit-scope-legend'},h('span',null,'··· Supply voltage'),h('span',null,'— Part voltage'),h('span',null,'— Branch current')),
        h('p',{className:'circuit-help'},'Voltage and current use separate axes. On narrow screens, scroll the chart sideways to see the full window.'),
        h('label',{className:'circuit-scope-cursor'},'Time cursor ',h('strong',null,circuitTimeText(t)),h('input',{type:'range',min:0,max:1000,step:1,value:Math.round(percent*1000),'aria-label':'Simulation time cursor','aria-valuetext':circuitTimeText(t),onChange:function(e){props.updateMany({timeCursor:cfg.duration*Number(e.target.value)/1000,simRunning:false});}})),
        h('div',{className:'circuit-action-row'},h('button',{type:'button',onClick:function(){props.updateMany({simRunning:!d.simRunning,timeCursor:t>=cfg.duration?0:t});}},d.simRunning?'Pause time':'Play time'),h('button',{type:'button',onClick:function(){props.updateMany({timeCursor:0,simRunning:false});}},'Restart time'),h('button',{type:'button',disabled:!cfg.resolved,onClick:download},'Export waveform CSV')),
        h('div',{className:'circuit-scope-readings','aria-label':'Exact cursor readings'},
          h('div',null,h('span',null,'Part voltage'),h('strong',null,circuitPreciseVoltageText(s.rows[index].voltage))),h('div',null,h('span',null,'Branch current'),h('strong',null,circuitCurrentText(s.rows[index].current))),h('div',null,h('span',null,'Total stored energy'),h('strong',null,(s.energy||0).toPrecision(4)+' J'))),
        h('p',{className:'circuit-help'},'Playback traverses the window in about six seconds; it is slowed or sped up for inspection. Scrubbing, probes, the schematic, and 3D measurements share the same calculated instant. Editing the circuit restarts the experiment.'),
        h('details',{className:'circuit-time-model'},h('summary',null,'Understand this model'),h('p',null,'Linear passive branches use exact RC, RL, and RLC responses, including underdamped, critical, and overdamped cases. Capacitors are ideal nonpolar models. Each inductor includes 0.001 Ω winding resistance. Automatic windows limit displayed ringing to eight cycles; the circuit may not yet be settled. Samples are denser near fast startup changes. Very fast changes can look vertical at a wide time scale; choose a shorter window to inspect them. Diodes, open-switch transients, saturation, and component failure are excluded.'),h('p',null,'Net component power includes energy storage and release. Negative power is energy returned, not negative heating. In a resonant circuit, individual capacitor or inductor voltages can exceed the supply.'),h('a',{href:'https://openstax.org/books/university-physics-volume-2/pages/14-6-rlc-series-circuits',target:'_blank',rel:'noopener noreferrer'},'RLC response reference'),h('span',null,' · '),h('a',{href:'https://openstax.org/books/university-physics-volume-2/pages/15-3-rlc-series-circuits-with-ac',target:'_blank',rel:'noopener noreferrer'},'AC impedance reference'))));
  }

  function circuitMixedDesign(state) {
    state=state||{};
    var counts={},components=[];
    (Array.isArray(state.components)?state.components:[]).forEach(function(c){
      if(!c||components.length>=8||['resistor','bulb','led','switch','capacitor','ammeter','voltmeter','inductor'].indexOf(c.type)<0)return;
      var branch=Number.isInteger(c.branch)&&c.branch>=1&&c.branch<=4?c.branch:1;
      if((counts[branch]||0)>=4)return;
      counts[branch]=(counts[branch]||0)+1;
      components.push(Object.assign({},c,{branch:branch,value:circuitNumber(c.value,100,1,10000)}));
    });
    components.sort(function(a,b){return a.branch-b.branch;});
    return {mode:'mixed',voltage:circuitNumber(state.voltage==null?12:state.voltage,12,0,24),components:components};
  }
  function solveMixedCircuit(state) {
    var design=circuitMixedDesign(state),voltage=design.voltage,rows=[],branches=[];
    var nodes=[{label:'N0 · positive rail',voltage:voltage},{label:'N1 · return rail',voltage:0}];
    [1,2,3,4].forEach(function(id){
      var parts=design.components.filter(function(c){return c.branch===id;});if(!parts.length)return;
      var branch=solveCircuit({mode:'series',voltage:voltage,components:parts});
      var localNodes=circuitProbeReading(branch).nodes,indices=[],nodeIndices=[0];
      for(var j=1;j<parts.length;j++){
        nodeIndices.push(nodes.length);
        nodes.push({label:'N'+nodes.length+' · branch '+String.fromCharCode(64+id)+' after part '+(rows.length+j),voltage:localNodes[j].voltage,afterPart:rows.length+j-1});
      }
      nodeIndices.push(1);
      branch.rows.forEach(function(row,i){indices.push(rows.length);rows.push(Object.assign({},row,{branch:id,branchPosition:i,branchSize:parts.length,nodeA:nodeIndices[i],nodeB:nodeIndices[i+1]}));});
      branches.push({id:id,name:String.fromCharCode(64+id),indices:indices,nodeIndices:nodeIndices,solved:branch});
    });
    var current=branches.reduce(function(sum,b){return sum+b.solved.current;},0);
    var conductance=branches.reduce(function(sum,b){return sum+(b.solved.isOpen?0:1/b.solved.totalR);},0);
    return {mode:'mixed',voltage:voltage,components:design.components,rows:rows,branches:branches,nodes:nodes,current:current,power:voltage*current,
      totalR:current>0?voltage/current:conductance?1/conductance:1e12,isOpen:!branches.length||branches.every(function(b){return b.solved.isOpen;}),
      isShort:branches.some(function(b){return b.solved.isShort;}),hasLED:branches.some(function(b){return b.solved.hasLED;}),
      voltageAmbiguous:rows.some(function(r){return r.voltage==null;}),ledOvercurrent:branches.some(function(b){return b.solved.ledOvercurrent;})};
  }
  function circuitMixedProbe(solved,red,black) {
    var nodes=solved.nodes;
    var index=function(v,fallback){return Number.isInteger(v)?Math.max(0,Math.min(nodes.length-1,v)):fallback;};
    red=index(red,0);black=index(black,1);
    var voltage=red===black?0:nodes[red].voltage==null||nodes[black].voltage==null?null:nodes[red].voltage-nodes[black].voltage;
    if(voltage==null)solved.branches.some(function(b){
      var r=b.nodeIndices.indexOf(red),k=b.nodeIndices.indexOf(black);
      if(r<0||k<0)return false;
      voltage=circuitProbeReading(b.solved,r,k).voltage;return voltage!=null;
    });
    return {nodes:nodes,red:red,black:black,voltage:voltage};
  }
  window.StemLab.solveMixedCircuit=solveMixedCircuit;
  window.StemLab.circuitMixedDesign=circuitMixedDesign;

  function CircuitMixedSchematic(props) {
    var h=props.React.createElement,s=props.solved,height=Math.max(240,s.branches.length*145+85);
    return h('section',{className:'circuit-mixed-schematic','aria-label':'Mixed circuit schematic'},
      h('div',{className:'circuit-mixed-scroll',tabIndex:0,role:'region','aria-label':'Scrollable mixed circuit diagram'},
        h('svg', {viewBox:'0 0 900 '+height,role: 'img','aria-label':'Mixed circuit: '+s.branches.length+' parallel branches with components connected in series within each branch. Supply '+s.voltage+' volts; total current '+circuitCurrentText(s.current)+'. Read branch connections and measurements below.'},
          h('rect',{width:900,height:height,rx:18,fill:'#0b2232'}),
          h('path',{d:'M 125 55 V '+(height-30),stroke:'#fb7185',strokeWidth:4}),
          h('path',{d:'M 800 55 V '+(height-30),stroke:'#60a5fa',strokeWidth:4}),
          h('text',{x:125,y:30,fill:'#fda4af',fontSize:16},'N0 · '+circuitPreciseVoltageText(s.voltage)),
          h('text',{x:800,y:30,fill:'#93c5fd',fontSize:16,textAnchor:'end'},'N1 · 0 V'),
          s.branches.map(function(b,bi){var y=bi*145+100;return h('g',{key:b.id},
            h('text',{x:30,y:y+5,fill:'#b6eddc',fontSize:17,fontWeight:700},b.name),
            h('path',{d:'M 125 '+y+' H 800',stroke:'#83a8b8',strokeWidth:3}),
            h('circle',{cx:125,cy:y,r:6,fill:'#fb7185'}),h('circle',{cx:800,cy:y,r:6,fill:'#60a5fa'}),
            h('text',{x:150,y:y-42,fill:'#b6cedb',fontSize:14},'Branch '+b.name+' · '+circuitCurrentText(b.solved.current)),
            b.indices.map(function(index,j){var row=s.rows[index],c=row.component,x=210+j*160,selected=index===props.selectedIndex;
              return h('g',{key:index},
                h('rect',{x:x-40,y:y-25,width:80,height:50,rx:10,fill:selected?'#21564f':'#173b4b',stroke:selected?'#b5efd9':'#6b94a5',strokeWidth:2}),
                h('text',{x:x,y:y-6,textAnchor:'middle',fill:'#f0f9ff',fontSize:13,fontWeight:700},(index+1)+'. '+c.type),
                h('text',{x:x,y:y+13,textAnchor:'middle',fill:'#d4ebf1',fontSize:12},c.type==='switch'?(c.closed?'CLOSED':'OPEN'):c.type==='led'?(c.reversed?'REVERSED':'LED'):c.value+(c.type==='capacitor'?' µF':c.type==='inductor'?' mH':' Ω')),
                h('text',{x:x,y:y+47,textAnchor:'middle',fill:'#bae6fd',fontSize:13},circuitPreciseVoltageText(row.voltage)),
                j<b.indices.length-1&&h('g',null,h('circle',{cx:x+80,cy:y,r:4,fill:'#d0e7f1'}),h('text',{x:x+80,y:y-12,textAnchor:'middle',fill:'#b6cedb',fontSize:12},'N'+row.nodeB)));
            }));}),
          !s.rows.length&&h('text',{x:450,y:120,textAnchor:'middle',fill:'#c6dae5',fontSize:20},'Add a branch to connect a load.'))),
      h('p',{className:'circuit-help'},'Follow a row from N0 (+) to N1 (−). Components on the same row share current. Each complete row has the full supply voltage. Select parts in the connection editor below. On narrow screens, focus the diagram and use arrow keys to scroll.'));
  }

  var CIRCUIT_MIXED_STARTER={mode:'mixed',voltage:12,components:[{id:1,type:'resistor',value:200,branch:1},{id:2,type:'resistor',value:100,branch:1},{id:3,type:'bulb',value:300,branch:2},{id:4,type:'switch',closed:true,branch:2}]};
  function CircuitMixedWorkbench(props) {
    var ctx=props.ctx,React=ctx.React,h=React.createElement,d=(ctx.toolData||{})._circuitMixed||CIRCUIT_MIXED_STARTER;
    var config=React.useMemo(function(){return circuitTimeConfig(d);},[d.components,d.voltage,d.signalMode,d.frequency,d.timeWindow]);
    var solved=React.useMemo(function(){return circuitTimeFrame(config,Math.min(config.duration,Math.max(0,d.timeCursor||0)));},[config,d.timeCursor]);
    React.useEffect(function(){
      if(!d.simRunning||!config.active)return;
      var start=performance.now(),initial=Math.min(config.duration,Math.max(0,d.timeCursor||0)),active=true;
      var timer=setInterval(function(){if(!active)return;var time=Math.min(config.duration,initial+(performance.now()-start)/6000*config.duration);
        ctx.setToolData(function(prev){var prior=prev._circuitMixed;if(!prior||!prior.simRunning)return prev;return Object.assign({},prev,{_circuitMixed:Object.assign({},prior,{timeCursor:time,simRunning:time<config.duration})});});
      },125);
      var hide=function(){if(document.hidden)ctx.setToolData(function(prev){return prev._circuitMixed?Object.assign({},prev,{_circuitMixed:Object.assign({},prev._circuitMixed,{simRunning:false})}):prev;});};
      document.addEventListener('visibilitychange',hide);
      return function(){active=false;clearInterval(timer);document.removeEventListener('visibilitychange',hide);};
    },[d.simRunning,config,ctx.setToolData]);
    var selectedIndex=Math.max(0,Math.min(solved.rows.length-1,d.selectedPart||0)),selected=solved.rows[selectedIndex];
    var updateMany=function(patch){ctx.setToolData(function(prev){
      var prior=prev._circuitMixed||CIRCUIT_MIXED_STARTER,next=Object.assign({},prior,patch);
      if(Object.prototype.hasOwnProperty.call(patch,'components')||Object.prototype.hasOwnProperty.call(patch,'voltage')){
        var normalized=circuitMixedDesign(next);
        if(JSON.stringify(normalized)!==JSON.stringify(circuitMixedDesign(prior))){next.undo=(prior.undo||[]).concat([circuitMixedDesign(prior)]).slice(-30);next.redo=[];}
        next.components=normalized.components;next.voltage=normalized.voltage;next.timeCursor=0;next.simRunning=false;
        next.probeRed=0;next.probeBlack=1; // Connection edits can renumber internal nodes.
      }
      return Object.assign({},prev,{_circuitMixed:next});
    });};
    var update=function(key,value){var patch={};patch[key]=value;updateMany(patch);};
    var history=function(direction){ctx.setToolData(function(prev){var prior=prev._circuitMixed||CIRCUIT_MIXED_STARTER,stack=prior[direction]||[];if(!stack.length)return prev;
      var opposite=direction==='undo'?'redo':'undo',next=Object.assign({},prior,stack[stack.length-1],{probeRed:0,probeBlack:1,timeCursor:0,simRunning:false});
      next[direction]=stack.slice(0,-1);next[opposite]=(prior[opposite]||[]).concat([circuitMixedDesign(prior)]).slice(-30);
      return Object.assign({},prev,{_circuitMixed:next});});};
    var editPart=function(patch){update('components',solved.components.map(function(c,i){return i===selectedIndex?Object.assign({},c,patch):c;}));};
    var add=function(branch){if(solved.rows.length>=8||solved.components.filter(function(c){return c.branch===branch;}).length>=4)return;
      var c={id:Math.max(0,...solved.components.map(function(p){return Number(p.id)||0;}))+1,type:d.addType||'resistor',value:100,branch:branch,closed:true};
      var parts=circuitMixedDesign({voltage:solved.voltage,components:solved.components.concat([c])}).components;
      updateMany({components:parts,selectedPart:parts.findIndex(function(p){return p.id===c.id;})});
    };
    var move=function(delta){if(!selected)return;var branch=solved.branches.find(function(b){return b.id===selected.branch;}),pos=branch.indices.indexOf(selectedIndex),target=branch.indices[pos+delta];if(target==null)return;
      var parts=solved.components.slice(),temp=parts[target];parts[target]=parts[selectedIndex];parts[selectedIndex]=temp;updateMany({components:parts,selectedPart:target});};
    var newBranch=[1,2,3,4].find(function(id){return !solved.branches.some(function(b){return b.id===id;});});
    var simple=(ctx.toolData||{})._circuit||{},simpleSolved=solveCircuit(simple),canCopy=simpleSolved.rows.length>0&&simpleSolved.rows.length<=4;
    return h('div',{'data-circuit-builder-root':'true',className:'circuit-mixed-root'},
      h('header',{className:'circuit-mixed-hero'},h('span',{className:'circuit-eyebrow'},'BUILD / CONNECT / INVESTIGATE'),h('h2',null,'More paths. New possibilities.'),
        h('p',null,'Build series paths that share a supply. Move a part to another branch and discover which readings change.'),
        h('div',{className:'circuit-action-row'},h('button',{type:'button',onClick:function(){updateMany(Object.assign({},CIRCUIT_MIXED_STARTER,{selectedPart:0}));}},'Load two-branch example'),
          h('button',{type:'button',disabled:!canCopy,onClick:function(){updateMany({voltage:simpleSolved.voltage,components:simpleSolved.components.map(function(c,i){return Object.assign({},c,{branch:simpleSolved.mode==='parallel'?i+1:1});}),selectedPart:0});}},'Copy simple circuit')),
        h('p',{className:'circuit-help'},'Up to 8 parts, 4 branches, and 4 parts per branch. Copy supports simple circuits with 1–4 parts. Your simple circuit stays saved.')),
      h('div',{className:'circuit-mixed-controls'},
        h('label',null,config.mode==='ac'?'AC peak ':config.mode==='release'?'Initial supply ':'Supply ',h('input',{type:'range',min:0,max:24,step:.5,value:config.base.voltage,'aria-label':'Mixed circuit supply voltage',onChange:function(e){update('voltage',Number(e.target.value));}}),h('strong',null,config.base.voltage+' V')),
        h('div',{className:'circuit-action-row'},h('button',{type:'button',disabled:!(d.undo||[]).length,onClick:function(){history('undo');}},'Undo wiring'),h('button',{type:'button',disabled:!(d.redo||[]).length,onClick:function(){history('redo');}},'Redo wiring'),
          h('button',{type:'button','aria-pressed':d.benchView!=='schematic',onClick:function(){update('benchView','3d');}},'3D mixed bench'),h('button',{type:'button','aria-pressed':d.benchView==='schematic',onClick:function(){update('benchView','schematic');}},'Mixed schematic'))),
      h(CircuitTimeScope,{React:React,config:config,state:d,solved:solved,selectedIndex:selectedIndex,updateMany:updateMany,load:function(kind){updateMany({mode:'mixed',voltage:12,signalMode:kind==='rc'?'step':'ac',frequency:50,timeWindow:'auto',selectedPart:kind==='rc'?1:2,components:kind==='rc'?[{id:1,type:'resistor',value:1000,branch:1},{id:2,type:'capacitor',value:1000,branch:1},{id:3,type:'resistor',value:2000,branch:2},{id:4,type:'capacitor',value:1000,branch:2}]:[{id:1,type:'resistor',value:10,branch:1},{id:2,type:'inductor',value:100,branch:1},{id:3,type:'capacitor',value:100,branch:1}]});}}),
      solved.isShort&&h('p',{className:'circuit-warning',role:'status'},'A branch has very low resistance. The ideal source predicts extreme current; real batteries have current limits. Add a load in that branch.'),
      solved.ledOvercurrent&&h('p',{className:'circuit-warning',role:'status'},'An LED exceeds the illustrative 20 mA rating. Add current-limiting resistance in the same branch.'),
      d.benchView==='schematic'?h(CircuitMixedSchematic,{React:React,solved:solved,selectedIndex:selectedIndex}):h(CircuitBench3D,{React:React,solved:solved,state:d,update:update,updateMany:updateMany}),
      h('section',{className:'circuit-mixed-connections','aria-labelledby':'circuit-mixed-connections-title'},
        h('div',{className:'circuit-step-heading'},h('h3',{id:'circuit-mixed-connections-title'},'Connection editor'),h('span',{className:'circuit-model-chip'},solved.rows.length+'/8 parts · '+solved.branches.length+'/4 branches')),
        h('p',{className:'circuit-help'},'Each branch is wired left to right between the + and − rails. Choose a part to change its value, order, or branch. An empty branch is removed; it never becomes a bare-wire short.'),
        h('div',{className:'circuit-action-row'},h('label',null,'New component ',h('select',{'aria-label':'New mixed circuit component',value:d.addType||'resistor',onChange:function(e){update('addType',e.target.value);}},['resistor','bulb','switch','led','capacitor','inductor','ammeter','voltmeter'].map(function(type){return h('option',{key:type,value:type},type);}))),
          h('button',{type:'button',disabled:!newBranch||solved.rows.length>=8,onClick:function(){add(newBranch);}},'Add parallel branch')),
        solved.branches.map(function(b){return h('section',{className:'circuit-mixed-branch',key:b.id,'aria-label':'Branch '+b.name},
          h('div',{className:'circuit-mixed-branch-heading'},h('strong',null,'Branch '+b.name),h('span',null,circuitCurrentText(b.solved.current)+' · '+(b.solved.isOpen?'open path':circuitPreciseVoltageText(solved.voltage)+' across path'))),
          h('div',{className:'circuit-mixed-path'},h('span',{className:'circuit-mixed-terminal'},'N0 +'),b.indices.map(function(index){var r=solved.rows[index];return h('button',{type:'button',key:index,'aria-pressed':selectedIndex===index,'aria-label':'Edit mixed part '+(index+1)+' '+r.component.type,onClick:function(){update('selectedPart',index);}},h('strong',null,(index+1)+'. '+r.component.type),h('span',null,'N'+r.nodeA+' → N'+r.nodeB),h('small',null,circuitPreciseVoltageText(r.voltage)));}),h('span',{className:'circuit-mixed-terminal'},'N1 −')),
          h('div',{className:'circuit-action-row'},h('button',{type:'button',disabled:b.indices.length>=4||solved.rows.length>=8,onClick:function(){add(b.id);}},'Add in series to branch '+b.name)));
        }),
        selected&&h('section',{className:'circuit-part-inspector','aria-label':'Edit selected mixed component'},
          h('h3',null,'Part '+(selectedIndex+1)+' · '+selected.component.type),
          ['resistor','bulb','capacitor','inductor'].includes(selected.component.type)&&h(CircuitValueEditor,{key:selectedIndex+'-'+selected.component.id+'-'+selected.component.type,React:React,value:selected.component.value,label:selected.component.type==='inductor'?'Inductance (mH)':selected.component.type==='capacitor'?'Capacitance (µF)':'Resistance (Ω)',unit:selected.component.type==='inductor'?'mH':selected.component.type==='capacitor'?'µF':'Ω',quantity:selected.component.type==='inductor'?'inductance':selected.component.type==='capacitor'?'capacitance':'resistance',onApply:function(value){editPart({value:value});}}),
          h('label',null,'Connect in ',h('select',{id:'circuit-inspect-part','aria-label':'Selected component branch',value:selected.branch,onChange:function(e){var id=selected.component.id,branch=Number(e.target.value),parts=circuitMixedDesign({voltage:solved.voltage,components:solved.components.map(function(c,i){return i===selectedIndex?Object.assign({},c,{branch:branch}):c;})}).components;updateMany({components:parts,selectedPart:parts.findIndex(function(c){return c.id===id;})});}},[1,2,3,4].map(function(id){return h('option',{key:id,value:id,disabled:id!==selected.branch&&solved.components.filter(function(c){return c.branch===id;}).length>=4},'Branch '+String.fromCharCode(64+id));}))),
          h('div',{className:'circuit-action-row'},h('button',{type:'button',disabled:selected.branchPosition===0,onClick:function(){move(-1);}},'Move earlier in branch'),h('button',{type:'button',disabled:selected.branchPosition===selected.branchSize-1,onClick:function(){move(1);}},'Move later in branch'),
            selected.component.type==='switch'&&h('button',{type:'button',onClick:function(){editPart({closed:!selected.component.closed});}},selected.component.closed?'Open selected switch':'Close selected switch'),
            selected.component.type==='led'&&h('button',{type:'button',onClick:function(){editPart({reversed:!selected.component.reversed});}},'Reverse selected LED'),
            h('button',{type:'button',onClick:function(){updateMany({components:solved.components.filter(function(c,i){return i!==selectedIndex;}),selectedPart:Math.max(0,selectedIndex-1)});}},'Remove selected part')))),
      h('section',{className:'circuit-mixed-evidence','aria-label':'Mixed circuit conservation checks'},
        h('span',{className:'circuit-eyebrow'},'FOLLOW THE EVIDENCE'),h('h3',null,'Current splits. Voltage is shared.'),
        h('p',null,'Source current = '+(solved.branches.map(function(b){return circuitCurrentText(b.solved.current);}).join(' + ')||'0 A')+' = '+circuitCurrentText(solved.current)),
        solved.branches.map(function(b){return h('p',{key:b.id},'Branch '+b.name+' voltage: '+(b.solved.voltageAmbiguous?'individual drops are undetermined':b.solved.rows.map(function(r){return circuitPreciseVoltageText(r.voltage);}).join(' + ')+' = '+circuitPreciseVoltageText(solved.voltage)));}),
        h('p',null,(solved.timeDomain?'Instantaneous source power: ':'Source power: ')+circuitPowerText(solved.power)+' · Sum of net component power: '+circuitPowerText(solved.rows.reduce(function(sum,r){return sum+r.power;},0))),
        h('p',null,solved.timeDomain?'At every instant, branch currents add to the source current and voltage drops add around each loop. Capacitors and inductors can return energy, so their net power may be negative.':'Predict what happens if you open a switch or increase resistance in one branch. With an ideal supply, the other branches keep their currents.'),
        h('p',{className:'circuit-help'},'Displayed measurements are rounded. Parallel branches contain series components. Cross-links, shared series feeders, and multiple sources remain outside this model. DC equilibrium supports the existing LED model; time and AC experiments support linear passive parts with closed paths.')));
  }

  // General connected linear networks with optional nonlinear diode iteration.
  // Each terminal names a node; crossing drawings
  // never create connectivity. Linear constraints retain free variables so that
  // floating voltages and redundant-source currents are not reported as zero.
  var CIRCUIT_NETWORK_NODES=['0','A','B','C','D','E','F','G'];
  var CIRCUIT_NETWORK_TYPES={opamp:{name:'Op-amp · finite gain',prefix:'U',unit:'V/V',min:1,max:1000000,value:100000},vcvs:{name:'Voltage-controlled voltage source',prefix:'E',unit:'V/V',min:-100000,max:100000,value:2},vccs:{name:'Voltage-controlled current source',prefix:'G',unit:'A/V',min:-1,max:1,value:.001},cccs:{name:'Current-controlled current source',prefix:'F',unit:'A/A',min:-100000,max:100000,value:2},ccvs:{name:'Current-controlled voltage source',prefix:'H',unit:'Ω',min:-1000000,max:1000000,value:1000},diode:{name:'Diode',prefix:'D',value:0},capacitor:{name:'Capacitor',prefix:'C',unit:'µF',min:.001,max:1000000,value:100},inductor:{name:'Inductor',prefix:'L',unit:'mH',min:.001,max:1000000,value:100},resistor:{name:'Resistor',prefix:'R',unit:'Ω',min:1,max:1000000,value:1000},voltage:{name:'Voltage source',prefix:'V',unit:'V',min:-24,max:24,value:5},current:{name:'Current source',prefix:'I',unit:'A',min:-.1,max:.1,value:.005},wire:{name:'Wire',prefix:'W',value:0},switch:{name:'Switch',prefix:'S',value:0}};
  var CIRCUIT_NETWORK_EXAMPLES=[
    {id:'bridge',name:'Balanced bridge',question:'Both midpoints are at the same voltage. Change R5 to 2000 Ω: which way will current flow through R6?',components:[{id:1,type:'voltage',a:'A',b:'0',value:6},{id:2,type:'resistor',a:'A',b:'B',value:1000},{id:3,type:'resistor',a:'B',b:'0',value:1000},{id:4,type:'resistor',a:'A',b:'C',value:1000},{id:5,type:'resistor',a:'C',b:'0',value:1000},{id:6,type:'resistor',a:'B',b:'C',value:1000}]},
    {id:'shared',name:'Shared series resistor',question:'The two loads share R2. Add another load from B to 0: does the voltage at B stay the same?',components:[{id:1,type:'voltage',a:'A',b:'0',value:12},{id:2,type:'resistor',a:'A',b:'B',value:100},{id:3,type:'resistor',a:'B',b:'0',value:300},{id:4,type:'resistor',a:'B',b:'0',value:600}]},
    {id:'sources',name:'Two voltage sources',question:'V2 raises B above A. Reverse V2: predict the voltage at B and the current through R3.',components:[{id:1,type:'voltage',a:'A',b:'0',value:5},{id:2,type:'voltage',a:'B',b:'A',value:3},{id:3,type:'resistor',a:'B',b:'0',value:1000}]},
    {id:'current',name:'Current-driven load',question:'The source sends 5 mA into A. Double R2: which changes, the source current or the voltage at A?',components:[{id:1,type:'current',a:'0',b:'A',value:.005},{id:2,type:'resistor',a:'A',b:'0',value:1000}]}
    ,{id:'rc-charge',name:'RC charging',duration:.5,question:'At first the capacitor voltage is zero. At one time constant (100 ms), predict how much of the 5 V supply appears across C3.',components:[{id:1,type:'voltage',a:'A',b:'0',value:5},{id:2,type:'resistor',a:'A',b:'B',value:1000},{id:3,type:'capacitor',a:'B',b:'0',value:100}]}
    ,{id:'rl-start',name:'RL startup',duration:.005,question:'L3 starts with zero current. Watch its voltage fall as the current approaches 50 mA. What happens if you double the inductance?',components:[{id:1,type:'voltage',a:'A',b:'0',value:5},{id:2,type:'resistor',a:'A',b:'B',value:100},{id:3,type:'inductor',a:'B',b:'0',value:100}]}
    ,{id:'rlc-ring',name:'RLC ringing',duration:.1,question:'Can C4 rise above the 5 V supply? Energy moves between the inductor and capacitor while R2 dissipates it. Raise R2 to 100 Ω and compare the shape.',components:[{id:1,type:'voltage',a:'A',b:'0',value:5},{id:2,type:'resistor',a:'A',b:'B',value:10},{id:3,type:'inductor',a:'B',b:'C',value:100},{id:4,type:'capacitor',a:'C',b:'0',value:100}]}
    ,{id:'bridge-settle',name:'Bridge settling',duration:.6,question:'C6 starts uncharged, so B and C initially share the same voltage. Why do they separate toward 3 V and 4 V? Compare the capacitor current direction with its voltage polarity.',components:[{id:1,type:'voltage',a:'A',b:'0',value:6},{id:2,type:'resistor',a:'A',b:'B',value:1000},{id:3,type:'resistor',a:'B',b:'0',value:1000},{id:4,type:'resistor',a:'A',b:'C',value:1000},{id:5,type:'resistor',a:'C',b:'0',value:2000},{id:6,type:'capacitor',a:'B',b:'C',value:100}]}
  ];
  var CIRCUIT_NETWORK_WAVES={dc:'DC',sine:'Sine',triangle:'Triangle',pulse:'Pulse'};
  function circuitNetworkWaveform(part){
    if(part.type!=='voltage'&&part.type!=='current')return null;
    var raw=part.waveform||{},duty=circuitNumber(raw.duty,50,1,99);
    return {shape:Object.prototype.hasOwnProperty.call(CIRCUIT_NETWORK_WAVES,raw.shape)?raw.shape:'dc',amplitude:circuitNumber(raw.amplitude,part.type==='voltage'?5:.005,0,part.type==='voltage'?24:.1),frequency:circuitNumber(raw.frequency,10,.01,100000),phase:circuitNumber(raw.phase,0,0,360),duty:duty,edge:circuitNumber(raw.edge,2,.01,Math.min(duty,100-duty)/2)};
  }
  function circuitNetworkSourceValue(part,time){
    var wave=circuitNetworkWaveform(part);
    if(!wave||wave.shape==='dc'||time==null)return part.value;
    var cycles=time*wave.frequency+wave.phase/360,x=((cycles%1)+1)%1,y=0;
    if(wave.shape==='sine')y=Math.sin(2*Math.PI*x);
    else if(wave.shape==='triangle')y=1-4*Math.abs(((x+.25)%1)-.5);
    else if(wave.shape==='pulse'){var edge=wave.edge/100,duty=wave.duty/100;y=x<edge?x/edge:x<duty?1:x<duty+edge?1-(x-duty)/edge:0;}
    return part.value+wave.amplitude*y;
  }
  function circuitNetworkSignalPlan(design,duration){
    var sources=design.components.filter(function(p){return p.waveform&&p.waveform.shape!=='dc'&&p.waveform.amplitude>0;}),maxStep=sources.reduce(function(dt,p){return Math.min(dt,1/(128*p.waveform.frequency));},duration/100),events=[];
    if(duration/maxStep>3990)return {ok:false,sources:sources,maxStep:maxStep,events:[],message:'The time window contains too many signal cycles. Shorten the window or lower the highest source frequency. No undersampled trace is shown.'};
    sources.forEach(function(p){var w=p.waveform,phase=w.phase/360,knots=w.shape==='triangle'?[.25,.75]:w.shape==='pulse'?[0,w.edge/100,w.duty/100,(w.duty+w.edge)/100]:[];
      for(var cycle=-1;cycle<=Math.ceil(duration*w.frequency+phase);cycle++)knots.forEach(function(knot){var time=(cycle+knot-phase)/w.frequency;if(time>0&&time<duration)events.push(time);});
    });
    events.sort(function(a,b){return a-b;});events=events.filter(function(time,index){return !index||time-events[index-1]>duration*1e-12;});
    return {ok:true,sources:sources,maxStep:maxStep,events:events};
  }
  function circuitNetworkSourceColumns(part){var w=part.waveform;return w?[w.shape,w.amplitude,w.frequency,w.phase,w.duty,w.edge]:['','','','','',''];}

  CIRCUIT_NETWORK_EXAMPLES.push(
    {id:'sine-filter',name:'Sine-wave filter',duration:.3,scopeSource:1,question:'Compare the dashed 5 V input with C3. Why is the output smaller and later? Double the frequency, then compare the voltage peaks again.',components:[{id:1,type:'voltage',a:'A',b:'0',value:0,waveform:{shape:'sine',amplitude:5,frequency:10}},{id:2,type:'resistor',a:'A',b:'B',value:1000},{id:3,type:'capacitor',a:'B',b:'0',value:10}]},
    {id:'pulse-smooth',name:'Pulse smoothing',duration:.3,scopeSource:1,question:'The source rises and falls in 2 ms. Does the capacitor reach the full 5 V before the input falls? Reduce pulse width or increase capacitance and compare.',components:[{id:1,type:'voltage',a:'A',b:'0',value:0,waveform:{shape:'pulse',amplitude:5,frequency:10,duty:35,edge:2}},{id:2,type:'resistor',a:'A',b:'B',value:1000},{id:3,type:'capacitor',a:'B',b:'0',value:22}]},
    {id:'triangle-current',name:'Triangle-current drive',duration:.3,scopeSource:1,question:'A changing current source feeds a parallel resistor and capacitor. How does their shared voltage respond as current changes sign?',components:[{id:1,type:'current',a:'0',b:'A',value:0,waveform:{shape:'triangle',amplitude:.005,frequency:10}},{id:2,type:'resistor',a:'A',b:'0',value:1000},{id:3,type:'capacitor',a:'A',b:'0',value:10}]}
  );
  CIRCUIT_NETWORK_EXAMPLES.push(
    {id:'switch-hold',name:'Charge, disconnect, hold',duration:.5,question:'S2 opens at 150 ms and closes again at 300 ms. Predict the capacitor voltage during the gap. What path could let it discharge?',components:[{id:1,type:'voltage',a:'A',b:'0',value:5},{id:2,type:'switch',a:'A',b:'B',closed:true,switching:{enabled:true,events:[{id:1,time:.15,closed:false},{id:2,time:.3,closed:true}]}},{id:3,type:'resistor',a:'B',b:'C',value:1000},{id:4,type:'capacitor',a:'C',b:'0',value:100}]},
    {id:'switch-discharge',name:'Charge then discharge',duration:.5,question:'At 150 ms, S2 opens as S3 closes. Compare Before and After: which stays continuous, capacitor voltage or current? Explain the reversal in current.',components:[{id:1,type:'voltage',a:'A',b:'0',value:5},{id:2,type:'switch',a:'A',b:'B',closed:true,switching:{enabled:true,events:[{id:1,time:.15,closed:false}]}},{id:3,type:'switch',a:'B',b:'0',closed:false,switching:{enabled:true,events:[{id:1,time:.15,closed:true}]}},{id:4,type:'resistor',a:'B',b:'C',value:1000},{id:5,type:'capacitor',a:'C',b:'0',value:100}]},
    {id:'switch-flyback',name:'Inductor flyback',duration:.008,question:'S2 opens at 3 ms. The inductor keeps its current flowing through R3. Why does its voltage reverse? Increase R3 and predict the voltage just after opening.',components:[{id:1,type:'voltage',a:'A',b:'0',value:5},{id:2,type:'switch',a:'A',b:'B',closed:true,switching:{enabled:true,events:[{id:1,time:.003,closed:false}]}},{id:3,type:'resistor',a:'B',b:'0',value:100},{id:4,type:'inductor',a:'B',b:'0',value:100}]}
  );
  // A schedule changes topology without changing the stored initial/DC setting.
  function circuitNetworkSwitching(part){
    if(part.type!=='switch')return null;
    var raw=part.switching||{},used={},events=[];
    (Array.isArray(raw.events)?raw.events:[]).slice(0,8).forEach(function(e){if(!e||typeof e!=='object')return;var id=Number.isSafeInteger(e.id)&&e.id>0&&e.id<=1000000?e.id:1;while(used[id])id++;used[id]=true;events.push({id:id,time:circuitNumber(e.time,.1,.000001,60),closed:e.closed!==false});});
    events.sort(function(a,b){return a.time-b.time||a.id-b.id;});return {enabled:raw.enabled===true,events:events};
  }
  function circuitNetworkSwitchPlan(design,duration){
    var actions=[],problem='';
    design.components.forEach(function(p){if(!p.switching||!p.switching.enabled)return;p.switching.events.forEach(function(e,i,events){if(i&&e.time===events[i-1].time)problem=circuitNetworkLabel(p)+' has two actions at '+circuitTimeText(e.time)+'. Give each action on this switch a different time, or remove the duplicate.';if(e.time<=duration)actions.push({time:e.time,id:p.id,label:circuitNetworkLabel(p),closed:e.closed});});});
    actions.sort(function(a,b){return a.time-b.time||a.id-b.id;});var events=[];actions.forEach(function(a){var event=events[events.length-1];if(!event||event.time!==a.time){event={time:a.time,changes:[]};events.push(event);}event.changes.push(a);});
    return {ok:!problem,events:events,message:problem};
  }
  function circuitNetworkSwitchText(event){return event.changes.map(function(c){return c.label+' '+(c.closed?'closes':'opens');}).join(' · ');}
  function circuitNetworkSwitchColumns(part,frame){var sw=part.switching;return [sw?part.closed:'',sw?sw.enabled:'',sw?sw.events.map(function(e){return e.id+'@'+e.time+'='+(e.closed?'closed':'open');}).join(';'):'',frame.side||'',frame.event?frame.event.changes.map(function(c){return c.label+'='+(c.closed?'closed':'open');}).join(';'):''];}
  CIRCUIT_NETWORK_EXAMPLES.push(
    {id:'diode-half-wave',name:'Half-wave rectifier',duration:.06,scopeSource:1,question:'Compare the input with the load voltage. Which half of each cycle reaches R3? Reverse D2, then predict the sign of the output.',components:[{id:1,type:'voltage',a:'A',b:'0',value:0,waveform:{shape:'sine',amplitude:5,frequency:50}},{id:2,type:'diode',a:'A',b:'B'},{id:3,type:'resistor',a:'B',b:'0',value:1000}]},
    {id:'diode-bridge',name:'Full-wave bridge rectifier',duration:.04,scopeSource:1,question:'Two diodes conduct during each half cycle. Why does R6 keep the same voltage polarity when V1 reverses? Select D2 and D3 to compare their currents.',components:[{id:1,type:'voltage',a:'A',b:'B',value:0,waveform:{shape:'sine',amplitude:5,frequency:50}},{id:2,type:'diode',a:'A',b:'C'},{id:3,type:'diode',a:'B',b:'C'},{id:4,type:'diode',a:'0',b:'A'},{id:5,type:'diode',a:'0',b:'B'},{id:6,type:'resistor',a:'C',b:'0',value:1000}]},
    {id:'diode-filter',name:'Rectifier with smoothing',duration:.06,scopeSource:1,question:'C4 supplies the load between positive peaks. Increase capacitance and compare the ripple. Select D2: does charging happen throughout the whole cycle?',components:[{id:1,type:'voltage',a:'A',b:'0',value:0,waveform:{shape:'sine',amplitude:5,frequency:50}},{id:2,type:'diode',a:'A',b:'B'},{id:3,type:'resistor',a:'B',b:'0',value:1000},{id:4,type:'capacitor',a:'B',b:'0',value:47}]},
    {id:'diode-flyback',name:'Diode flyback path',duration:.02,question:'S2 opens at 3 ms. D3 then carries the inductor current. Compare its voltage with the resistor-only flyback example. Why does current take longer to fall?',components:[{id:1,type:'voltage',a:'A',b:'0',value:5},{id:2,type:'switch',a:'A',b:'B',closed:true,switching:{enabled:true,events:[{id:1,time:.003,closed:false}]}},{id:3,type:'diode',a:'0',b:'B'},{id:4,type:'inductor',a:'B',b:'0',value:100}]}
  );
  var CIRCUIT_NETWORK_DIODE_MODELS={silicon:{name:'Generic silicon',saturationCurrent:1e-9,emission:1.7},schottky:{name:'Generic Schottky',saturationCurrent:1e-6,emission:1.1}};
  function circuitNetworkDiodeModel(part){if(part.type!=='diode')return null;var name=part.diode&&Object.prototype.hasOwnProperty.call(CIRCUIT_NETWORK_DIODE_MODELS,part.diode.model)?part.diode.model:'silicon';return Object.assign({model:name,thermalVoltage:.02585},CIRCUIT_NETWORK_DIODE_MODELS[name]);}
  function circuitNetworkDiodeLaw(part,voltage){
    var model=part.diode||circuitNetworkDiodeModel(part),scale=model.emission*model.thermalVoltage,x=voltage/scale;
    // Avoid overflow rather than silently flattening the exponential model.
    return !Number.isFinite(x)||x>40?{current:Infinity,conductance:Infinity}:{current:model.saturationCurrent*Math.expm1(x),conductance:model.saturationCurrent/scale*Math.exp(x)};
  }
  function circuitNetworkNonlinear(matrix,rhs,parts,index,seed){
    var diodes=parts.filter(function(p){return p.type==='diode';});if(!diodes.length)return circuitNetworkLinear(matrix,rhs);
    var guesses={},linear,volts={},iteration=0,problem='The diode network did not converge. Check source return paths and add series resistance where needed. No approximate readings are shown.';
    diodes.forEach(function(p){guesses[p.id]=seed&&Number.isFinite(seed[p.id])?seed[p.id]:0;});
    for(iteration=0;iteration<100;iteration++){
      var a=matrix.map(function(row){return row.slice();}),b=rhs.slice(),tangents={},bounded=true;
      diodes.forEach(function(p){var v=guesses[p.id],law=circuitNetworkDiodeLaw(p,v),g=law.conductance,offset=law.current-g*v,ia=index(p.a),ib=index(p.b);tangents[p.id]={g:g,offset:offset};if(!Number.isFinite(g)||!Number.isFinite(offset)){bounded=false;return;}if(ia>=0){a[ia][ia]+=g;b[ia]-=offset;}if(ib>=0){a[ib][ib]+=g;b[ib]+=offset;}if(ia>=0&&ib>=0){a[ia][ib]-=g;a[ib][ia]-=g;}});
      if(!bounded)return {ok:false,nonlinearIterations:iteration,message:'The diode model reaches an extreme forward-current range. Add series resistance or reduce the drive. No clipped exponential or approximate readings are shown.'};
      linear=circuitNetworkLinear(a,b);if(!linear.ok)return {ok:false,nonlinearIterations:iteration+1,message:problem};
      var converged=true,known=true;
      diodes.forEach(function(p){var voltage=linear.measure([[index(p.a),1],[index(p.b),-1]]);volts[p.id]=voltage;if(voltage==null){known=false;return;}var law=circuitNetworkDiodeLaw(p,voltage),t=tangents[p.id],predicted=t.g*voltage+t.offset,error=Math.abs(law.current-predicted),tolerance=1e-12+1e-8*Math.max(Math.abs(law.current),Math.abs(predicted));if(!Number.isFinite(law.current)||error>tolerance||Math.abs(voltage-guesses[p.id])>1e-7)converged=false;
        // Limit forward progress in junction voltage; reverse progress can be large.
        guesses[p.id]=voltage>0?Math.min(voltage,Math.max(0,guesses[p.id])+.1):voltage;
      });
      if(!known)return {ok:false,nonlinearIterations:iteration+1,message:'A diode junction voltage is undetermined. Check floating or isolated diode connections and provide a defined return path.'};
      if(converged)return Object.assign({},linear,{diodeVoltages:volts,nonlinearIterations:iteration+1});
    }
    return {ok:false,nonlinearIterations:iteration,message:problem};
  }
  CIRCUIT_NETWORK_EXAMPLES.push(
    {id:'controlled-amplifier',name:'Voltage-controlled amplifier',duration:.3,scopeSource:1,question:'E2 multiplies the input by three without drawing input current. Try a negative gain, then compare the output with the input. Why does changing R3 leave the ideal output voltage unchanged?',components:[{id:1,type:'voltage',a:'A',b:'0',value:0,waveform:{shape:'sine',amplitude:1,frequency:10}},{id:2,type:'vcvs',a:'B',b:'0',value:3,control:{positive:'A',negative:'0'}},{id:3,type:'resistor',a:'B',b:'0',value:1000}]},
    {id:'controlled-current',name:'Voltage-to-current control',duration:.3,scopeSource:2,question:'G2 forces 2 mA per volt into R3. Double R3: which changes, load voltage or load current? Compare the output with the source current.',components:[{id:1,type:'voltage',a:'A',b:'0',value:0,waveform:{shape:'triangle',amplitude:1,frequency:10}},{id:2,type:'vccs',a:'0',b:'B',value:.002,control:{positive:'A',negative:'0'}},{id:3,type:'resistor',a:'B',b:'0',value:1000}]},
    {id:'controlled-sense',name:'Current sensing and gain',question:'V2 is a 0 V sensor in series with R3. F4 copies twice that branch current into R5. Double R3 and predict both measured currents.',components:[{id:1,type:'voltage',a:'A',b:'0',value:5},{id:2,type:'voltage',a:'A',b:'B',value:0},{id:3,type:'resistor',a:'B',b:'0',value:1000},{id:4,type:'cccs',a:'0',b:'C',value:2,control:{source:2}},{id:5,type:'resistor',a:'C',b:'0',value:1000}]},
    {id:'controlled-feedback',name:'Finite-gain feedback',duration:.3,scopeSource:1,question:'E2 senses the error between input A and feedback C. Its gain is 1000, but the feedback divider makes the closed-loop gain almost two. Reduce the source gain to 10 and compare.',components:[{id:1,type:'voltage',a:'A',b:'0',value:0,waveform:{shape:'sine',amplitude:1,frequency:10}},{id:2,type:'vcvs',a:'B',b:'0',value:1000,control:{positive:'A',negative:'C'}},{id:3,type:'resistor',a:'B',b:'C',value:1000},{id:4,type:'resistor',a:'C',b:'0',value:1000},{id:5,type:'resistor',a:'B',b:'0',value:10000}]}
  );
  CIRCUIT_NETWORK_EXAMPLES.push(
    {id:'opamp-buffer',name:'Op-amp voltage follower',duration:.3,scopeSource:1,selected:2,question:'U2 feeds its output back to its minus input. Why is the output almost equal to the input although open-loop gain is 100,000? Reduce that gain to 10, then change the load.',components:[{id:1,type:'voltage',a:'A',b:'0',value:0,waveform:{shape:'sine',amplitude:3,frequency:10}},{id:2,type:'opamp',a:'B',b:'0',value:100000,control:{positive:'A',negative:'B'}},{id:3,type:'resistor',a:'B',b:'0',value:1000}]},
    {id:'opamp-inverting',name:'Inverting amplifier',duration:.3,scopeSource:1,selected:3,question:'R4 is three times R2. Predict the output amplitude and sign. Select U3 to inspect the small input error. Increase input amplitude until the output clips.',components:[{id:1,type:'voltage',a:'A',b:'0',value:0,waveform:{shape:'sine',amplitude:1,frequency:10}},{id:2,type:'resistor',a:'A',b:'C',value:1000},{id:3,type:'opamp',a:'B',b:'0',value:100000,control:{positive:'0',negative:'C'}},{id:4,type:'resistor',a:'B',b:'C',value:3000},{id:5,type:'resistor',a:'B',b:'0',value:10000}]},
    {id:'opamp-clipping',name:'Gain meets the output limits',duration:.3,scopeSource:1,selected:2,question:'The feedback divider asks for a gain near three, but U2 can only reach −5 V and +5 V. Predict when the sine wave flattens. Does the input error stay small while the output is limited?',components:[{id:1,type:'voltage',a:'A',b:'0',value:0,waveform:{shape:'sine',amplitude:2,frequency:10}},{id:2,type:'opamp',a:'B',b:'0',value:100000,control:{positive:'A',negative:'C'}},{id:3,type:'resistor',a:'B',b:'C',value:2000},{id:4,type:'resistor',a:'C',b:'0',value:1000},{id:5,type:'resistor',a:'B',b:'0',value:10000}]},
    {id:'opamp-filter',name:'Active low-pass filter',duration:.15,scopeSource:1,selected:3,question:'R4 and C5 share the feedback path. Compare the output with the input, then double the input frequency. How does capacitor current change the closed-loop gain?',components:[{id:1,type:'voltage',a:'A',b:'0',value:0,waveform:{shape:'sine',amplitude:1,frequency:20}},{id:2,type:'resistor',a:'A',b:'C',value:1000},{id:3,type:'opamp',a:'B',b:'0',value:100000,control:{positive:'0',negative:'C'},opamp:{lower:-12,upper:12}},{id:4,type:'resistor',a:'B',b:'C',value:10000},{id:5,type:'capacitor',a:'B',b:'C',value:1},{id:6,type:'resistor',a:'B',b:'0',value:10000}]}
  );
  function circuitNetworkVoltageOutput(p){return ['voltage','vcvs','ccvs','opamp'].includes(p.type);}
  function circuitNetworkCurrentOutput(p){return ['current','vccs','cccs'].includes(p.type);}
  function circuitNetworkControl(p){var raw=p.control||{};if(p.type==='vcvs'||p.type==='vccs'||p.type==='opamp')return {positive:CIRCUIT_NETWORK_NODES.includes(raw.positive)?raw.positive:'A',negative:CIRCUIT_NETWORK_NODES.includes(raw.negative)?raw.negative:'0'};if(p.type==='cccs'||p.type==='ccvs')return {source:Number.isSafeInteger(raw.source)&&raw.source>0?raw.source:0};return null;}
  function circuitNetworkOpAmpModel(p){if(p.type!=='opamp')return null;var m=p.opamp||{};return {model:'finite-gain-clamp',lower:circuitNumber(m.lower,-5,-24,24),upper:circuitNumber(m.upper,5,-24,24)};}
  function circuitNetworkOpAmpLaw(p,input){var m=p.opamp||circuitNetworkOpAmpModel(p),requested=p.value*input;return {output:Math.max(m.lower,Math.min(m.upper,requested)),requested:requested,region:requested<=m.lower?'lower':requested>=m.upper?'upper':'linear'};}
  function circuitNetworkOpAmpStatus(row){return row.voltage==null||row.opampRegion==='unknown'?'Undetermined':row.opampRegion==='upper'?'Upper limit':row.opampRegion==='lower'?'Lower limit':'Linear range';}
  // Test each piecewise-linear output region against the actual clamped law.
  // This avoids Newton cycling at a hard limit and diagnoses multiple equilibria
  // rather than inventing a stable latch state for this memoryless teaching model.
  function circuitNetworkOperatingPoint(matrix,rhs,parts,index,constraints,nodeCount,seed){
    var amps=parts.filter(function(p){return !!p.opamp;});if(!amps.length)return circuitNetworkNonlinear(matrix,rhs,parts,index,seed);
    if(amps.length>4)return {ok:false,message:'This op-amp model supports up to four amplifiers per network. Reduce the number of op-amps to keep output-region checking bounded.'};
    var bad=amps.find(function(p){return p.opamp.lower>=p.opamp.upper;});if(bad)return {ok:false,message:circuitNetworkLabel(bad)+' needs a lower output limit below its upper limit. Edit the output window; no limits were silently swapped.'};
    var candidates=Math.pow(3,amps.length),accepted=null,acceptedValues=null,unknown=false,iterations=0;
    for(var candidate=0;candidate<candidates;candidate++){
      var a=matrix.map(function(row){return row.slice();}),b=rhs.slice(),code=candidate;
      amps.forEach(function(p){var mode=code%3;code=Math.floor(code/3);var k=nodeCount+constraints.indexOf(p);if(mode===0){var plus=index(p.control.positive),minus=index(p.control.negative);if(plus>=0)a[k][plus]-=p.value;if(minus>=0)a[k][minus]+=p.value;}else b[k]=mode===1?p.opamp.lower:p.opamp.upper;});
      var solved=circuitNetworkNonlinear(a,b,parts,index,seed);iterations+=solved.nonlinearIterations||0;if(!solved.ok)continue;
      var valid=true,values=[],unresolved=false;amps.forEach(function(p){var input=solved.measure([[index(p.control.positive),1],[index(p.control.negative),-1]]),output=solved.measure([[index(p.a),1],[index(p.b),-1]]);if(input==null||output==null){unresolved=true;return;}var target=circuitNetworkOpAmpLaw(p,input).output;if(Math.abs(output-target)>1e-7+1e-8*Math.max(Math.abs(output),Math.abs(target)))valid=false;values.push(input,output);});
      if(!valid)continue;if(unresolved){unknown=true;continue;}
      if(accepted&&values.some(function(v,i){return Math.abs(v-acceptedValues[i])>1e-7+1e-8*Math.max(Math.abs(v),Math.abs(acceptedValues[i]));}))return {ok:false,opampRegionsTried:candidate+1,message:'The op-amp circuit has more than one operating point. Check positive feedback. This memoryless model does not choose a latch state or simulate hysteresis.'};
      if(!accepted){accepted=solved;acceptedValues=values;}
    }
    if(unknown)return {ok:false,opampRegionsTried:candidates,message:'An op-amp input difference or output is undetermined. Define the sensing nodes and output reference; the model cannot infer a saturation state from an unknown input.'};
    return accepted?Object.assign({},accepted,{opampRegionsTried:candidates,nonlinearIterations:iterations}):{ok:false,opampRegionsTried:candidates,message:'No consistent op-amp operating point was found. Check feedback polarity, output shorts or conflicting sources, and reactive starting conditions. No clipped or approximate solution is substituted.'};
  }
  window.StemLab.circuitNetworkOpAmpLaw=circuitNetworkOpAmpLaw;
  function circuitNetworkDesign(state) {
    var raw=state&&Array.isArray(state.components)?state.components:CIRCUIT_NETWORK_EXAMPLES[0].components,used={},parts=[];
    raw.forEach(function(p){if(!p||parts.length>=16||!Object.prototype.hasOwnProperty.call(CIRCUIT_NETWORK_TYPES,p.type))return;var spec=CIRCUIT_NETWORK_TYPES[p.type],id=Number.isSafeInteger(p.id)&&p.id>0&&p.id<=1000000?p.id:1;while(used[id])id++;used[id]=true;
      parts.push({id:id,type:p.type,a:CIRCUIT_NETWORK_NODES.includes(p.a)?p.a:'A',b:CIRCUIT_NETWORK_NODES.includes(p.b)?p.b:'0',value:spec.min==null?0:circuitNumber(p.value==null?spec.value:p.value,spec.value,spec.min,spec.max),closed:p.type==='switch'?p.closed!==false:true,initial:p.type==='capacitor'?circuitNumber(p.initial,0,-24,24):p.type==='inductor'?circuitNumber(p.initial,0,-.1,.1):0,waveform:circuitNetworkWaveform(p),switching:circuitNetworkSwitching(p),diode:circuitNetworkDiodeModel(p),control:circuitNetworkControl(p),opamp:circuitNetworkOpAmpModel(p)});});
    return {components:parts};
  }
  function circuitNetworkLabel(p){return CIRCUIT_NETWORK_TYPES[p.type].prefix+p.id;}
  function circuitNetworkValue(p,closed){if(p.opamp)return p.opamp.lower+'…'+p.opamp.upper+' V output';if(p.control)return Number(p.value.toPrecision(4))+' '+CIRCUIT_NETWORK_TYPES[p.type].unit;if(p.diode)return p.diode.name; if(p.waveform&&p.waveform.shape!=='dc')return CIRCUIT_NETWORK_WAVES[p.waveform.shape]+' · '+Number(p.waveform.frequency.toPrecision(4))+' Hz';return p.type==='switch'?((closed==null?p.closed:closed)?'Closed':'Open'):p.type==='wire'?'Ideal wire':p.type==='capacitor'||p.type==='inductor'?Number(p.value.toPrecision(5))+' '+CIRCUIT_NETWORK_TYPES[p.type].unit:p.type==='current'?circuitCurrentText(p.value):p.type==='voltage'?circuitPreciseVoltageText(p.value):circuitActiveResistanceText(p.value);}
  function circuitNetworkLinear(matrix,rhs) {
    var n=rhs.length,a=matrix.map(function(row,i){var scale=Math.max.apply(null,row.map(Math.abs));return row.concat(rhs[i]).map(function(v){return scale?v/scale:v;});}),pivots=[],rank=0,rhsMagnitude=a.map(function(row){return Math.abs(row[n]);});
    for(var col=0;col<n;col++){var best=rank;for(var r=rank+1;r<n;r++)if(Math.abs(a[r][col])>Math.abs(a[best][col]))best=r;if(rank===n||Math.abs(a[best][col])<1e-11)continue;
      var swap=a[rank];a[rank]=a[best];a[best]=swap;var magnitudeSwap=rhsMagnitude[rank];rhsMagnitude[rank]=rhsMagnitude[best];rhsMagnitude[best]=magnitudeSwap;var pivot=a[rank][col];for(var j=col;j<=n;j++)a[rank][j]/=pivot;rhsMagnitude[rank]/=Math.abs(pivot);
      for(var k=0;k<n;k++){if(k===rank)continue;var factor=a[k][col];for(var t=col;t<=n;t++)a[k][t]-=factor*a[rank][t];rhsMagnitude[k]+=Math.abs(factor)*rhsMagnitude[rank];}pivots.push(col);rank++;
    }
    for(var i=rank;i<n;i++)if(Math.abs(a[i][n])>1e-10*Math.max(1e-300,rhsMagnitude[i]))return {ok:false};
    var values=Array(n).fill(0);pivots.forEach(function(c,i){values[c]=a[i][n];});
    var free=Array.from({length:n},function(_,i){return i;}).filter(function(i){return !pivots.includes(i);}),basis=free.map(function(f){var v=Array(n).fill(0);v[f]=1;pivots.forEach(function(c,i){v[c]=-a[i][f];});return v;});
    var measure=function(terms){for(var i=0;i<basis.length;i++){var effect=0,magnitude=0;terms.forEach(function(t){if(t[0]<0)return;var v=t[1]*basis[i][t[0]];effect+=v;magnitude+=Math.abs(v);});if(Math.abs(effect)>1e-9*Math.max(1e-12,magnitude))return null;}var value=terms.reduce(function(sum,t){return sum+(t[0]<0?0:t[1]*values[t[0]]);},0);return Number.isFinite(value)?value:null;};
    var residual=matrix.reduce(function(max,row,i){var actual=row.reduce(function(sum,v,j){return sum+v*values[j];},0),scale=Math.max(1,Math.abs(rhs[i]),row.reduce(function(sum,v,j){return sum+Math.abs(v*values[j]);},0));return Math.max(max,Math.abs(actual-rhs[i])/scale);},0);
    return residual>1e-8||values.some(function(v){return !Number.isFinite(v);})?{ok:false}:{ok:true,measure:measure,freeVariables:free.length,residual:residual};
  }
  function solveNetworkCircuit(state,dynamic) {
    var design=circuitNetworkDesign(state),parts=design.components,source=function(p){return circuitNetworkSourceValue(p,dynamic?circuitNumber(dynamic.time,0,0,60):null);},used=CIRCUIT_NETWORK_NODES.filter(function(id){return id!=='0'&&parts.some(function(p){return p.a===id||p.b===id||p.control&&(p.control.positive===id||p.control.negative===id);});}),index=function(id){return used.indexOf(id);};
    var isClosed=function(p){return dynamic&&dynamic.switchStates&&Object.prototype.hasOwnProperty.call(dynamic.switchStates,p.id)?dynamic.switchStates[p.id]:p.closed;},carried=function(p){return dynamic&&dynamic.states&&Object.prototype.hasOwnProperty.call(dynamic.states,p.id)?dynamic.states[p.id]:p.initial;};
    var constraints=parts.filter(function(p){return circuitNetworkVoltageOutput(p)||p.type==='wire'||p.type==='switch'&&isClosed(p)||p.type==='inductor'&&!dynamic||p.type==='capacitor'&&dynamic&&dynamic.initial;}),n=used.length+constraints.length,matrix=Array.from({length:n},function(){return Array(n).fill(0);}),rhs=Array(n).fill(0);
    var senseIndex=function(p){var position=constraints.findIndex(function(q){return q.id===p.control.source&&circuitNetworkVoltageOutput(q);});return position<0?-1:used.length+position;},missingSense=parts.find(function(p){return p.control&&p.control.source!=null&&senseIndex(p)<0;});
    var controlTerms=function(p,gain){return p.control.source!=null?[[senseIndex(p),gain]]:[[index(p.control.positive),gain],[index(p.control.negative),-gain]];};
    var add=function(a,b,v){if(a>=0&&b>=0)matrix[a][b]+=v;},inject=function(a,v){if(a>=0)rhs[a]+=v;};
    var conductance=function(a,b,g){add(a,a,g);add(b,b,g);add(a,b,-g);add(b,a,-g);};
    parts.forEach(function(p){var a=index(p.a),b=index(p.b);if(p.type==='resistor')conductance(a,b,1/p.value);
      else if(p.type==='vccs'||p.type==='cccs'){controlTerms(p,p.value).forEach(function(t){add(a,t[0],t[1]);add(b,t[0],-t[1]);});}
      else if(p.type==='current'||p.type==='inductor'&&dynamic&&dynamic.initial){var current=p.type==='current'?source(p):carried(p);inject(a,-current);inject(b,current);}
      else if(dynamic&&!dynamic.initial&&(p.type==='capacitor'||p.type==='inductor')){var previous=dynamic.states[p.id],g=p.type==='capacitor'?p.value*1e-6/dynamic.dt:dynamic.dt/(p.value*.001),history=p.type==='capacitor'?-g*previous:previous;conductance(a,b,g);inject(a,-history);inject(b,history);}
    });
    constraints.forEach(function(p,i){var a=index(p.a),b=index(p.b),k=used.length+i;add(a,k,1);add(b,k,-1);add(k,a,1);add(k,b,-1);rhs[k]=p.type==='voltage'?source(p):p.type==='capacitor'?carried(p):0;if(p.control&&!p.opamp)controlTerms(p,-p.value).forEach(function(t){add(k,t[0],t[1]);});});
    var linear=missingSense?{ok:false,message:circuitNetworkLabel(missingSense)+' needs an existing voltage-output source to sense. Choose a source, or insert a 0 V voltage source in series with the branch to measure its current.'}:circuitNetworkOperatingPoint(matrix,rhs,parts,index,constraints,used.length,dynamic&&dynamic.diodeVoltages),difference=function(a,b){if(a===b)return 0;if(!linear.ok||a!=='0'&&!used.includes(a)||b!=='0'&&!used.includes(b))return null;return linear.measure([[index(a),1],[index(b),-1]]);};
    var rows=parts.map(function(p){var voltage=linear.ok?difference(p.a,p.b):null,current=null;if(linear.ok){if(p.type==='resistor')current=voltage==null?null:voltage/p.value;else if(p.type==='diode')current=voltage==null?null:circuitNetworkDiodeLaw(p,voltage).current;else if(p.type==='current')current=source(p);else if(p.type==='vccs'||p.type==='cccs')current=linear.measure(controlTerms(p,p.value));else if(p.type==='capacitor'&&!dynamic||p.type==='switch'&&!isClosed(p))current=0;else if(p.type==='inductor'&&dynamic&&dynamic.initial)current=carried(p);else if(dynamic&&!dynamic.initial&&(p.type==='capacitor'||p.type==='inductor'))current=voltage==null?null:p.type==='capacitor'?p.value*1e-6/dynamic.dt*(voltage-dynamic.states[p.id]):dynamic.states[p.id]+dynamic.dt/(p.value*.001)*voltage;else current=linear.measure([[used.length+constraints.indexOf(p),1]]);}return {component:p,label:circuitNetworkLabel(p),controlValue:linear.ok&&p.control?linear.measure(controlTerms(p,1)):null,closed:p.type==='switch'?isClosed(p):null,voltage:voltage,current:current,energy:p.type==='capacitor'?(voltage==null?null:.5*p.value*1e-6*voltage*voltage):p.type==='inductor'?(current==null?null:.5*p.value*.001*current*current):0,power:voltage===0||current===0?0:voltage==null||current==null?null:voltage*current};});
    rows.forEach(function(row){if(!row.component.opamp)return;var p=row.component,m=p.opamp,law=row.controlValue==null?null:circuitNetworkOpAmpLaw(p,row.controlValue);row.opampRegion=linear.ok&&law?law.region:'unknown';row.opampRequested=linear.ok&&law?law.requested:null;row.opampHeadroom=row.voltage==null?null:Math.max(0,Math.min(row.voltage-m.lower,m.upper-row.voltage));});
    var nodes=CIRCUIT_NETWORK_NODES.map(function(id){return {id:id,used:id==='0'||used.includes(id),voltage:id==='0'?0:linear.ok&&used.includes(id)?difference(id,'0'):null};});
    var powersKnown=linear.ok&&rows.every(function(r){return r.power!=null;}),absorbed=powersKnown?rows.reduce(function(sum,r){return sum+Math.max(0,r.power);},0):null,delivered=powersKnown?rows.reduce(function(sum,r){return sum+Math.max(0,-r.power);},0):null;
    var balances=nodes.filter(function(node){return node.used;}).map(function(node){var connected=rows.filter(function(r){return r.component.a===node.id||r.component.b===node.id;}),known=linear.ok&&connected.every(function(r){return r.current!=null;});return {id:node.id,current:known?connected.reduce(function(sum,r){return sum+(r.component.a===node.id?r.current:0)-(r.component.b===node.id?r.current:0);},0):null};});
    var floating=nodes.filter(function(node){return node.used&&node.voltage==null;}),ambiguous=rows.filter(function(row){return row.current==null;});
    return {ok:linear.ok,opampRegionsTried:linear.opampRegionsTried||0,diodeVoltages:linear.diodeVoltages||{},nonlinearIterations:linear.nonlinearIterations||0,design:design,rows:rows,nodes:nodes,difference:difference,absorbed:absorbed,delivered:delivered,balances:balances,floating:floating.map(function(node){return node.id;}),ambiguous:ambiguous.map(function(row){return row.label;}),residual:linear.ok?linear.residual:null,
      message:!linear.ok&&linear.message?linear.message:!linear.ok&&dynamic?'The time response has incompatible constraints. Check capacitor starting voltages, inductor starting currents, and ideal source return paths.':!linear.ok?'No consistent DC solution. Check for conflicting ideal voltage sources, a wire shorting a voltage source, or a current source without a return path.':floating.length?'Some node voltages have no defined reference to 0. Voltage differences inside a floating circuit may still be known.':ambiguous.length?'Some ideal-path currents are undetermined. Parallel ideal sources or closed wire loops can share current in more than one way.':dynamic?'The connected network has a consistent time-response solution.':'The connected network has a consistent DC solution.'};
  }
  function circuitNetworkProbe(s,red,black){red=CIRCUIT_NETWORK_NODES.includes(red)?red:'B';black=CIRCUIT_NETWORK_NODES.includes(black)?black:'C';return {red:red,black:black,voltage:s.ok?s.difference(red,black):null};}
  function circuitNetworkSnapshot(s,time){
    var values=CIRCUIT_NETWORK_NODES.map(function(a){return CIRCUIT_NETWORK_NODES.map(function(b){return s.difference(a,b);});});
    return Object.assign({},s,{time:time,difference:circuitNetworkDifferenceReader(values),storedEnergy:s.rows.every(function(r){return r.energy!=null;})?s.rows.reduce(function(sum,r){return sum+r.energy;},0):null});
  }
  function circuitNetworkDifferenceReader(values){return function(a,b){var i=CIRCUIT_NETWORK_NODES.indexOf(a),j=CIRCUIT_NETWORK_NODES.indexOf(b);return i<0||j<0?null:values[i][j];};}
  function circuitNetworkDuration(state){return circuitNumber(state&&state.duration,.5,.000001,60);}
  // Backward Euler Norton companions. Step doubling estimates local state error;
  // accepted half steps retain their own times and satisfy the network equations.
  function circuitNetworkTransient(state){
    var design=circuitNetworkDesign(state),duration=circuitNetworkDuration(state),reactive=design.components.filter(function(p){return p.type==='capacitor'||p.type==='inductor';}),initial=solveNetworkCircuit(design,{initial:true,time:0}),plan=circuitNetworkSignalPlan(design,duration),switchPlan=circuitNetworkSwitchPlan(design,duration),switchStates={},switchIndex=0,steps=0,rejected=0,eventIndex=0;
    design.components.forEach(function(p){if(p.type==='switch')switchStates[p.id]=p.closed;});
    var fail=function(message){return {ok:false,design:design,duration:duration,frames:[],events:[],steps:steps,rejected:rejected,message:message};};
    if(!plan.ok)return fail(plan.message);
    if(!switchPlan.ok)return fail(switchPlan.message);
    if(!initial.ok)return fail(initial.message+' A capacitor voltage or inductor current cannot jump instantly. Add a resistive path or use compatible starting conditions.');
    var statesOf=function(s){var values={};reactive.forEach(function(p){var row=s.rows.find(function(r){return r.component.id===p.id;});values[p.id]=p.type==='capacitor'?row.voltage:row.current;});return values;};
    var known=function(values){return reactive.every(function(p){return Number.isFinite(values[p.id]);});},states=statesOf(initial),stateScale=Object.assign({},states),diodeVoltages=initial.diodeVoltages;
    if(!known(states))return fail('The starting energy state is undetermined. Give each capacitor a defined starting voltage and each inductor a defined starting current.');
    Object.keys(stateScale).forEach(function(id){stateScale[id]=Math.abs(stateScale[id]);});
    var frames=[circuitNetworkSnapshot(initial,0)],time=0,dt=plan.maxStep,maxError=0;
    if(!reactive.length&&!plan.sources.length&&!switchPlan.events.length){frames.push(circuitNetworkSnapshot(initial,duration));return {ok:true,design:design,duration:duration,frames:frames,events:[],steps:0,rejected:0,maxError:0,message:'This resistive network is constant in time. Add a capacitor or inductor to explore stored energy.'};}
    while(time<duration){
      if(steps+rejected>=4000)return fail('The response needs more time steps than this workbench allows. Shorten the time window or reduce extreme component-value ratios. No incomplete trace is shown.');
      while(eventIndex<plan.events.length&&plan.events[eventIndex]<=time+duration*1e-12)eventIndex++;
      var switchEvent=switchPlan.events[switchIndex],boundary=Math.min(eventIndex<plan.events.length?plan.events[eventIndex]:duration,switchEvent?switchEvent.time:duration),endTime=Math.min(time+dt,boundary,duration);if(boundary-endTime<duration*1e-12)endTime=boundary;if(boundary===duration&&duration-endTime<duration*1e-12)endTime=duration;dt=endTime-time;
      if(!(dt>duration*1e-12)||time+dt===time)return fail('The response cannot meet its numerical tolerance at this time scale. Shorten the time window or reduce extreme component-value ratios.');
      var full=solveNetworkCircuit(design,{dt:dt,states:states,time:endTime,switchStates:switchStates,diodeVoltages:diodeVoltages}),half=solveNetworkCircuit(design,{dt:dt/2,states:states,time:time+dt/2,switchStates:switchStates,diodeVoltages:diodeVoltages}),middle=statesOf(half);
      if(!full.ok||!half.ok||!known(middle))return fail((!full.ok?full.message:!half.ok?half.message:'')+' The time-step equations could not be solved reliably. Check return paths and reduce extreme component-value ratios.');
      var fine=solveNetworkCircuit(design,{dt:dt/2,states:middle,time:endTime,switchStates:switchStates,diodeVoltages:half.diodeVoltages}),next=statesOf(fine),coarse=statesOf(full);
      if(!fine.ok||!known(next)||!known(coarse))return fail((!fine.ok?fine.message:'')+' A capacitor voltage or inductor current could not be resolved reliably. Check the network connections and component-value ratios.');
      var error=reactive.reduce(function(max,p){var absolute=p.type==='capacitor'?1e-7:1e-10,scale=Math.max(stateScale[p.id],Math.abs(next[p.id]),Math.abs(middle[p.id]));return Math.max(max,Math.abs(next[p.id]-coarse[p.id])/(absolute+2e-5*scale));},0);
      if(!Number.isFinite(error))return fail('The numerical error estimate is not finite. Reduce component-value ratios or shorten the time window.');
      if(error<=1){frames.push(circuitNetworkSnapshot(half,time+dt/2));time=endTime;frames.push(circuitNetworkSnapshot(fine,time));states=next;diodeVoltages=fine.diodeVoltages;reactive.forEach(function(p){stateScale[p.id]=Math.max(stateScale[p.id],Math.abs(next[p.id]),Math.abs(middle[p.id]));});steps++;maxError=Math.max(maxError,error);
        if(switchEvent&&time===switchEvent.time){
          // Every action at this instant is applied before solving the new topology.
          switchEvent.changes.forEach(function(c){switchStates[c.id]=c.closed;});
          var after=solveNetworkCircuit(design,{initial:true,time:time,states:states,switchStates:switchStates,diodeVoltages:diodeVoltages}),carriedStates=statesOf(after);
          if(!after.ok||!known(carriedStates))return fail('Switch event at '+circuitTimeText(time)+' ('+circuitNetworkSwitchText(switchEvent)+') has no consistent finite solution. Capacitor voltage and inductor current must carry through continuously. Check for a shorted charged capacitor, an inductor without a return path, or conflicting ideal sources. Add a compatible return path or change the schedule.');
          frames[frames.length-1].side='before';frames[frames.length-1].event=switchEvent;
          var afterFrame=circuitNetworkSnapshot(after,time);afterFrame.side='after';afterFrame.event=switchEvent;frames.push(afterFrame);states=carriedStates;diodeVoltages=after.diodeVoltages;switchIndex++;
        }}else rejected++;
      dt=Math.min(plan.maxStep,dt*Math.min(2,Math.max(.15,error===0?2:.85/Math.sqrt(error))));
    }
    return {ok:true,design:design,duration:duration,frames:frames,events:switchPlan.events,steps:steps,rejected:rejected,maxError:maxError,message:'Time response calculated from the configured starting energy. Board, probes, and readings follow the scope cursor.'};
  }
  function circuitNetworkFrame(run,time,side){
    if(!run.ok||!run.frames.length)return null;time=circuitNumber(time,0,0,run.duration);
    var frames=run.frames,low=0,high=frames.length;while(low<high){var mid=Math.floor((low+high)/2);if(frames[mid].time<time)low=mid+1;else high=mid;}
    var index=low===frames.length?low-1:low>0&&time-frames[low-1].time<=frames[low].time-time?low-1:low,chosen=frames[index];
    if(chosen.time===time){while(index>0&&frames[index-1].time===time)index--;if(side!=='before')while(index+1<frames.length&&frames[index+1].time===time)index++;}
    else if(chosen.time>time){while(index>0&&frames[index-1].time===chosen.time)index--;}
    else {while(index+1<frames.length&&frames[index+1].time===chosen.time)index++;}
    return frames[index];
  }
  function circuitNetworkDiodeColumns(p,frame){var m=p.diode;return [m?m.model:'',m?m.saturationCurrent:'',m?m.emission:'',m?m.thermalVoltage:'',frame.nonlinearIterations||0];}
  function circuitNetworkOpAmpColumns(p,row,frame){var m=p.opamp;return m?[m.model,m.lower,m.upper,row.opampRegion,row.opampRequested==null?'':row.opampRequested,row.opampHeadroom==null?'':row.opampHeadroom,frame.opampRegionsTried||0]:['','','','','','',''];}
  function circuitNetworkControlColumns(p,row){return p.control?[p.type,p.control.positive||'',p.control.negative||'',p.control.source||'',p.value,row.controlValue==null?'':row.controlValue,p.control.source!=null?'A':'V']:['','','','','','',''];}
  function circuitNetworkCSV(state,snapshot){var s=snapshot||solveNetworkCircuit(state);if(!s.ok)throw new Error(s.message);return ['component,type,terminal_a,terminal_b,value,unit,closed,voltage_a_minus_b_V,current_a_to_b_A,power_absorbed_W,voltage_known,current_known,initial_value,initial_unit,stored_energy_J,analysis,time_s,source_waveform,source_amplitude,source_frequency_Hz,source_phase_deg,pulse_width_percent,pulse_edge_percent,initial_switch_closed,switch_timing_enabled,switch_schedule_s,time_side,switch_events,diode_model,diode_Is_A,diode_emission,diode_thermal_voltage_V,nonlinear_iterations,controlled_source_kind,control_positive,control_negative,sense_source_id,control_gain,control_value,control_unit,opamp_model,opamp_lower_V,opamp_upper_V,opamp_region,opamp_unlimited_output_V,opamp_headroom_V,opamp_regions_checked'].concat(s.rows.map(function(r){var p=r.component;return [r.label,p.type,p.a,p.b,p.value,CIRCUIT_NETWORK_TYPES[p.type].unit||'',p.type==='switch'?r.closed:'',r.voltage==null?'':r.voltage,r.current==null?'':r.current,r.power==null?'':r.power,r.voltage!=null,r.current!=null,p.initial,p.type==='capacitor'?'V':p.type==='inductor'?'A':'',r.energy==null?'':r.energy,s.time==null?'dc_equilibrium':'time_response',s.time==null?'':s.time].concat(circuitNetworkSourceColumns(p),circuitNetworkSwitchColumns(p,s),circuitNetworkDiodeColumns(p,s),circuitNetworkControlColumns(p,r),circuitNetworkOpAmpColumns(p,r,s)).join(',');})).join('\n');}
  function circuitNetworkTransientCSV(state,calculated){var run=calculated||circuitNetworkTransient(state);if(!run.ok)throw new Error(run.message);var lines=['time_s,component,type,terminal_a,terminal_b,value,unit,closed,initial_value,initial_unit,voltage_a_minus_b_V,current_a_to_b_A,power_absorbed_W,stored_energy_J,voltage_known,current_known,method,relative_local_tolerance,absolute_state_tolerance,window_s,source_waveform,source_amplitude,source_frequency_Hz,source_phase_deg,pulse_width_percent,pulse_edge_percent,initial_switch_closed,switch_timing_enabled,switch_schedule_s,time_side,switch_events,diode_model,diode_Is_A,diode_emission,diode_thermal_voltage_V,nonlinear_iterations,controlled_source_kind,control_positive,control_negative,sense_source_id,control_gain,control_value,control_unit,opamp_model,opamp_lower_V,opamp_upper_V,opamp_region,opamp_unlimited_output_V,opamp_headroom_V,opamp_regions_checked'];run.frames.forEach(function(frame){frame.rows.forEach(function(r){var p=r.component;lines.push([frame.time,r.label,p.type,p.a,p.b,p.value,CIRCUIT_NETWORK_TYPES[p.type].unit||'',p.type==='switch'?r.closed:'',p.initial,p.type==='capacitor'?'V':p.type==='inductor'?'A':'',r.voltage==null?'':r.voltage,r.current==null?'':r.current,r.power==null?'':r.power,r.energy==null?'':r.energy,r.voltage!=null,r.current!=null,frame.time===0?'initial_constraints':frame.side==='after'?'switch_constraints':run.design.components.some(function(p){return p.type==='capacitor'||p.type==='inductor';})?'backward_euler_step_doubling':'algebraic_sample',2e-5,p.type==='capacitor'?1e-7:p.type==='inductor'?1e-10:'',run.duration].concat(circuitNetworkSourceColumns(p),circuitNetworkSwitchColumns(p,frame),circuitNetworkDiodeColumns(p,frame),circuitNetworkControlColumns(p,r),circuitNetworkOpAmpColumns(p,r,frame)).join(','));});});return lines.join('\n');}
  window.StemLab.circuitNetworkDiodeLaw=circuitNetworkDiodeLaw;
  window.StemLab.circuitNetworkSourceValue=circuitNetworkSourceValue;
  window.StemLab.circuitNetworkSignalPlan=circuitNetworkSignalPlan;
  window.StemLab.circuitNetworkSwitchPlan=circuitNetworkSwitchPlan;
  window.StemLab.circuitNetworkDesign=circuitNetworkDesign;
  window.StemLab.solveNetworkCircuit=solveNetworkCircuit;
  window.StemLab.circuitNetworkProbe=circuitNetworkProbe;
  window.StemLab.circuitNetworkCSV=circuitNetworkCSV;
  window.StemLab.circuitNetworkTransient=circuitNetworkTransient;
  window.StemLab.circuitNetworkFrame=circuitNetworkFrame;
  window.StemLab.circuitNetworkTransientCSV=circuitNetworkTransientCSV;

  function circuitNetworkCamera(value){value=value||{};return {side:value.side===-1?-1:1,elevation:circuitNumber(value.elevation,49,35,70),zoom:circuitNumber(value.zoom,1,1,2)};}
  function circuitNetworkPoint(height,x,y,z,solid,camera){var view=circuitNetworkCamera(camera),angle=view.elevation*Math.PI/180,center=(height-10)/2,shear=.22*Math.min(1,450/height)*view.side;return solid?[450+(x-450)*.91-(y-center)*shear,height/2+10+(x-450)*.07*view.side+(y-center)*Math.sin(angle)-(z||0)*Math.cos(angle)*1.35]:[x,y];}
  function circuitNetworkLayout(parts) {
    for(var attempt=0;attempt<20;attempt++){
      var height=(parts.length>8?680:520)+attempt*90,ground=height-90,middle=height===520?245:(75+ground)/2,nodes={'0':[450,ground],A:[450,75],B:[240,middle],C:[660,middle],D:[120,ground],E:[780,ground],F:[120,75],G:[780,75]},occupied=Object.keys(nodes).filter(function(id){return id==='0'||parts.some(function(p){return p.a===id||p.b===id||p.control&&(p.control.positive===id||p.control.negative===id);});}).map(function(id){return {x:nodes[id][0],y:nodes[id][1],node:true};}),centers=[],fits=true;
      for(var i=0;i<parts.length;i++){var part=parts[i],a=nodes[part.a],b=nodes[part.b],ideal={x:(a[0]+b[0])/2,y:(a[1]+b[1])/2};if((part.type==='voltage'||part.type==='current')&&(part.a==='0'||part.b==='0'))ideal.x=95;
        var candidates=[ideal];for(var gy=130;gy<height-60;gy+=90)[90,210,330,450,570,690,810].forEach(function(x){candidates.push({x:x,y:gy});});
        candidates.sort(function(a,b){return Math.pow(a.x-ideal.x,2)+Math.pow(a.y-ideal.y,2)-Math.pow(b.x-ideal.x,2)-Math.pow(b.y-ideal.y,2);});
        var chosen=candidates.find(function(c){return !occupied.some(function(o){if(Math.abs(c.x-o.x)<(o.node?114:140)&&Math.abs(c.y-o.y)<(o.node?88:100))return true;return [-1,1].some(function(side){return [35,49,70].some(function(elevation){var camera={side:side,elevation:elevation},pc=circuitNetworkPoint(height,c.x,c.y,25,true,camera),po=circuitNetworkPoint(height,o.x,o.y,o.node?0:25,true,camera);return Math.abs(pc[0]-po[0])<(o.node?120:138)&&Math.abs(pc[1]-po[1])<(o.node?100:104);});});});});
        if(!chosen){fits=false;break;}centers.push(chosen);occupied.push(chosen);
      }
      if(fits)return {height:height,nodes:nodes,centers:centers};
    }
    // With 16 parts the search has ample room; retain a complete layout if its
    // limits change later rather than dropping a component from the drawing.
    return {height:height,nodes:nodes,centers:parts.map(function(_,i){return {x:90+(i%7)*120,y:150+Math.floor(i/7)*120};})};
  }
  function circuitNetworkPotentialColor(value,scale){
    if(value==null)return '#929eaf';var t=Math.min(1,Math.abs(value)/Math.max(1e-12,scale)),base=[114,150,171],target=value<0?[215,166,255]:[121,239,193];return 'rgb('+base.map(function(v,i){return Math.round(v+(target[i]-v)*t);}).join(',')+')';
  }
  function circuitNetworkResistorBands(value){var colors=['#202429','#95552d','#d94739','#f38b38','#f5d469','#75ae6f','#75b9e3','#b19adf','#c6ccd0','#f4f1df'],exponent=Math.floor(Math.log10(value))-1,digits=Math.round(value/Math.pow(10,exponent));if(digits===100){digits=10;exponent++;}return [colors[Math.floor(digits/10)],colors[digits%10],exponent===-1?'#d5b574':exponent===-2?'#c6ccd0':colors[exponent],'#d5b574'];}
  function circuitNetworkDiodeStatus(row){return row.voltage==null?'Unknown bias':row.voltage>1e-9?'Forward biased':row.voltage< -1e-9?'Reverse biased':'Zero bias';}
  // Route in display coordinates so wires clear both raised packages and their
  // accessible labels. Coordinates and paths depend only on topology and view.
  function circuitNetworkRouteBlocked(a,b,rect){
    if(Math.abs(a[0]-b[0])<1e-8)return a[0]>rect.x0&&a[0]<rect.x1&&Math.max(a[1],b[1])>rect.y0&&Math.min(a[1],b[1])<rect.y1;
    if(Math.abs(a[1]-b[1])<1e-8)return a[1]>rect.y0&&a[1]<rect.y1&&Math.max(a[0],b[0])>rect.x0&&Math.min(a[0],b[0])<rect.x1;
    return false;
  }
  function circuitNetworkRoute(start,end,obstacles,height){
    var xs=[8,892,start[0],end[0]],ys=[8,height-8,start[1],end[1]];
    obstacles.forEach(function(r){xs.push(Math.max(8,r.x0-1),Math.min(892,r.x1+1));ys.push(Math.max(8,r.y0-1),Math.min(height-8,r.y1+1));});
    var unique=function(values){return Array.from(new Set(values)).sort(function(a,b){return a-b;});};xs=unique(xs);ys=unique(ys);
    var width=xs.length,total=width*ys.length,index=function(p){return ys.indexOf(p[1])*width+xs.indexOf(p[0]);},first=index(start),last=index(end),cost=new Float64Array(total),parent=new Int32Array(total),blocked=new Uint8Array(total),heap=[];
    cost.fill(Infinity);parent.fill(-1);
    for(var y=0;y<ys.length;y++)for(var x=0;x<width;x++){var px=xs[x],py=ys[y];blocked[y*width+x]=obstacles.some(function(r){return px>r.x0&&px<r.x1&&py>r.y0&&py<r.y1;})?1:0;}
    var point=function(id){return [xs[id%width],ys[Math.floor(id/width)]];};
    var push=function(entry){var i=heap.length;heap.push(entry);while(i){var p=(i-1)>>1;if(heap[p].rank<=entry.rank)break;heap[i]=heap[p];i=p;}heap[i]=entry;};
    var pop=function(){var top=heap[0],tail=heap.pop();if(heap.length){var i=0;while(i*2+1<heap.length){var child=i*2+1;if(child+1<heap.length&&heap[child+1].rank<heap[child].rank)child++;if(heap[child].rank>=tail.rank)break;heap[i]=heap[child];i=child;}heap[i]=tail;}return top;};
    cost[first]=0;push({id:first,cost:0,rank:0});
    while(heap.length){var at=pop(),id=at.id;if(at.cost!==cost[id])continue;if(id===last)break;var a=point(id),col=id%width,row=Math.floor(id/width),neighbors=[];if(col)neighbors.push(id-1);if(col+1<width)neighbors.push(id+1);if(row)neighbors.push(id-width);if(row+1<ys.length)neighbors.push(id+width);
      neighbors.forEach(function(next){if(blocked[next])return;var b=point(next);if(obstacles.some(function(r){return circuitNetworkRouteBlocked(a,b,r);}))return;var nextCost=cost[id]+Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);if(nextCost>=cost[next])return;cost[next]=nextCost;parent[next]=id;push({id:next,cost:nextCost,rank:nextCost+Math.abs(b[0]-end[0])+Math.abs(b[1]-end[1])});});
    }
    if(!isFinite(cost[last]))return {points:[start,end],clear:false};
    var path=[];for(var id=last;id!==-1;id=parent[id])path.push(point(id));path.reverse();var simple=[];path.forEach(function(p){while(simple.length>1){var a=simple[simple.length-2],b=simple[simple.length-1];if(Math.abs((b[0]-a[0])*(p[1]-b[1])-(b[1]-a[1])*(p[0]-b[0]))>1e-7)break;simple.pop();}simple.push(p);});return {points:simple,clear:true};
  }
  function circuitNetworkRoundedPath(list){
    if(!list.length)return '';var path='M'+list[0].join(' ');
    for(var i=1;i<list.length;i++){var b=list[i];if(i===list.length-1){path+=' L'+b.join(' ');break;}var a=list[i-1],c=list[i+1],ab=Math.hypot(b[0]-a[0],b[1]-a[1]),bc=Math.hypot(c[0]-b[0],c[1]-b[1]),r=Math.min(5,ab/2,bc/2);if(!r)continue;path+=' L'+[b[0]+(a[0]-b[0])*r/ab,b[1]+(a[1]-b[1])*r/ab].join(' ')+' Q'+b.join(' ')+' '+[b[0]+(c[0]-b[0])*r/bc,b[1]+(c[1]-b[1])*r/bc].join(' ');}return path;
  }
  function circuitNetworkRoutes(parts,layout,solid,camera){
    var project=function(x,y,z){return circuitNetworkPoint(layout.height,x,y,z||0,solid,camera);},obstacles=[];
    Object.keys(layout.nodes).forEach(function(id){if(id!=='0'&&!parts.some(function(p){return p.a===id||p.b===id||p.control&&(p.control.positive===id||p.control.negative===id);}))return;var n=project(...layout.nodes[id]);obstacles.push({node:id,x0:n[0]-46,x1:n[0]+46,y0:n[1]-36,y1:n[1]+36});});
    parts.forEach(function(p,i){var c=layout.centers[i],label=project(c.x,c.y+24),corners=[];[-52,52].forEach(function(x){[-26,14].forEach(function(y){[0,40].forEach(function(z){corners.push(project(c.x+x,c.y-12+y,z));});});});obstacles.push({part:p.id,x0:Math.min(label[0]-76,...corners.map(function(p){return p[0]-8;})),x1:Math.max(label[0]+76,...corners.map(function(p){return p[0]+8;})),y0:Math.min(label[1]-33,...corners.map(function(p){return p[1]-8;})),y1:Math.max(label[1]+33,...corners.map(function(p){return p[1]+8;}))});});
    var routes=parts.map(function(p,i){var c=layout.centers[i];return ['a','b'].map(function(terminal){var sign=terminal==='a'?-1:1,port=project(c.x+sign*49,c.y-12),from=project(...layout.nodes[p[terminal]]),avoid=obstacles.filter(function(r){return r.part!==p.id&&r.node!==p[terminal];}),r=circuitNetworkRoute(from,port,avoid,layout.height);r.obstacles=avoid;r.points.push(project(c.x+sign*49,c.y-12,12),project(c.x+sign*31,c.y-12,12));return r;});});var sense={};parts.forEach(function(p,i){if(!p.control)return;var c=layout.centers[i],end=project(c.x,c.y-12,28),references=p.control.source!=null?[{part:p.control.source}]:[{node:p.control.positive},{node:p.control.negative}];sense[p.id]=references.map(function(ref){var source=ref.node?layout.nodes[ref.node]:layout.centers[parts.findIndex(function(q){return q.id===ref.part;})];if(!source)return null;var from=ref.node?project(...source):project(source.x,source.y-12,28),avoid=obstacles.filter(function(r){return r.part!==p.id&&!(ref.part!=null&&r.part===ref.part)&&!(ref.node!=null&&r.node===ref.node);});return circuitNetworkRoute(from,end,avoid,layout.height);}).filter(Boolean);});return {routes:routes,obstacles:obstacles,sense:sense};
  }
  window.StemLab.circuitNetworkCamera=circuitNetworkCamera;
  window.StemLab.circuitNetworkPoint=circuitNetworkPoint;
  window.StemLab.circuitNetworkLayout=circuitNetworkLayout;
  window.StemLab.circuitNetworkRoutes=circuitNetworkRoutes;
  window.StemLab.circuitNetworkRouteBlocked=circuitNetworkRouteBlocked;
  function CircuitNetworkCameraControls(props){
    var h=props.React.createElement,c=props.camera,update=function(values){props.change(Object.assign({},c,values));};
    return h('div',{className:'circuit-network-camera',role:'group','aria-label':'Board camera controls'},
      h('div',{className:'circuit-network-camera-presets'},h('span',{className:'circuit-eyebrow'},'BOARD VIEW'),h('button',{type:'button',disabled:!props.solid,'aria-pressed':props.solid&&c.side===1,onClick:function(){update({side:1});}},'Left perspective'),h('button',{type:'button',disabled:!props.solid,'aria-pressed':props.solid&&c.side===-1,onClick:function(){update({side:-1});}},'Right perspective')),
      h('label',null,'Board tilt · '+c.elevation+'°',h('input',{type:'range','aria-label':'Board tilt',min:35,max:70,step:1,value:c.elevation,disabled:!props.solid,onChange:function(e){update({elevation:Number(e.target.value)});}})),
      h('div',{className:'circuit-network-camera-zoom'},h('button',{type:'button','aria-label':'Zoom out circuit board',disabled:c.zoom<=1,onClick:function(){update({zoom:Math.max(1,c.zoom-.25)});}},'−'),h('output',{'aria-label':'Board zoom'},Math.round(c.zoom*100)+'%'),h('button',{type:'button','aria-label':'Zoom in circuit board',disabled:c.zoom>=2,onClick:function(){update({zoom:Math.min(2,c.zoom+.25)});}},'+'),h('button',{type:'button',onClick:props.reset},'Reset view')),
      h('p',{className:'circuit-help'},'Drag empty board space to pan, or scroll with touch / trackpad. Focus the board and use arrow keys to pan. Home returns to the top left. View changes keep your measurements and time cursor.'));
  }
  function CircuitNetworkDiagram(props) {
    var h=props.React.createElement,s=props.solved,solid=props.solid,voltageMode=props.overlay==='voltage',layout=props.React.useMemo(function(){return circuitNetworkLayout(s.design.components);},[s.design.components.map(function(p){return p.id+':'+p.type+':'+p.a+':'+p.b+':'+JSON.stringify(p.control);}).join('|')]),height=layout.height,project=function(x,y,z){return circuitNetworkPoint(height,x,y,solid?z:0,solid,props.camera);},points=function(list){return list.map(function(p){return project(p[0],p[1],p[2]||0).join(',');}).join(' ');};
    var geometry=props.React.useMemo(function(){return circuitNetworkRoutes(s.design.components,layout,solid,props.camera);},[layout,solid,props.camera.side,props.camera.elevation]),viewRef=props.React.useRef(null),dragRef=props.React.useRef(null),priorZoom=props.React.useRef(props.camera.zoom);
    props.React.useEffect(function(){var el=viewRef.current;if(!el)return;var ratio=props.camera.zoom/priorZoom.current;el.scrollLeft=(el.scrollLeft+el.clientWidth/2)*ratio-el.clientWidth/2;el.scrollTop=(el.scrollTop+el.clientHeight/2)*ratio-el.clientHeight/2;priorZoom.current=props.camera.zoom;},[props.camera.zoom]);
    props.React.useEffect(function(){if(viewRef.current){viewRef.current.scrollLeft=0;viewRef.current.scrollTop=0;}},[props.resetKey]);
    var release=function(e){dragRef.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);e.currentTarget.removeAttribute('data-dragging');};
    var corners=[[35,25],[865,25],[865,height-45],[35,height-45]],top=points(corners),shifted=points(corners.map(function(p){return [p[0],p[1],-14];})),routes=[],bodies=[],scale=props.voltageScale||1,potential=function(node){var n=s.nodes.find(function(n){return n.id===node;});return n?n.voltage:null;};
    s.rows.forEach(function(row,i){var part=row.component,a=layout.nodes[part.a],b=layout.nodes[part.b],c=layout.centers[i],selected=props.selected===part.id,color=selected?'#f6df9d':row.current==null?'#93a2b3':Math.abs(row.current)<1e-12?'#7194a0':'#8bd8c0',direction=row.current!=null&&Math.abs(row.current)>1e-12?(row.current>0?1:-1):0,route=geometry.routes[i];
      routes.push(h('g',{key:part.id,'data-network-route':part.id,'data-route-clear':route.every(function(r){return r.clear;})},route.map(function(r,j){var path=circuitNetworkRoundedPath(r.points);return h('g',{key:j},h('path',{d:path,fill:'none',stroke:'#061620',strokeWidth:selected?10:8,strokeLinejoin:'round',strokeLinecap:'round'}),h('path',{d:path,fill:'none',stroke:voltageMode?circuitNetworkPotentialColor(potential(j?part.b:part.a),scale):color,strokeWidth:selected?4:3,strokeLinejoin:'round',strokeLinecap:'round',strokeDasharray:part.type==='switch'&&!row.closed?'6 6':undefined}));}),
        direction!==0&&(function(){var list=route[0].points,lengths=list.slice(1).map(function(p,j){return Math.hypot(p[0]-list[j][0],p[1]-list[j][1]);}),remaining=lengths.reduce(function(a,b){return a+b;},0)*.45,index=0;while(index<lengths.length-1&&remaining>lengths[index])remaining-=lengths[index++];var pa=list[index],pc=list[index+1],length=lengths[index]||1,dx=(pc[0]-pa[0])/length,dy=(pc[1]-pa[1])/length,ux=dx*direction,uy=dy*direction,mx=pa[0]+remaining*dx,my=pa[1]+remaining*dy;return h('polygon',{className:'circuit-network-current-arrow',points:[[mx+ux*7,my+uy*7],[mx-ux*5-uy*4,my-uy*5+ux*4],[mx-ux*5+uy*4,my-uy*5-ux*4]].map(function(p){return p.join(',');}).join(' '),fill:'#e3f7ef'});})()));
      var items=[],poly=function(key,list,fill,stroke){return h('polygon',{key:key,points:points(list.map(function(p){return [c.x+p[0],c.y-12+p[1],p[2]||0];})),fill:fill,stroke:stroke||'none',strokeWidth:1.2,strokeLinejoin:'round'});},line=function(key,list,color,width){return h('polyline',{key:key,points:points(list.map(function(p){return [c.x+p[0],c.y-12+p[1],p[2]||0];})),fill:'none',stroke:color,strokeWidth:width||2,strokeLinecap:'round',strokeLinejoin:'round'});},oval=function(key,x,y,rx,ry,z,fill,stroke){return poly(key,Array.from({length:32},function(_,j){var theta=j*Math.PI/16;return [x+rx*Math.cos(theta),y+ry*Math.sin(theta),z];}),fill,stroke);},block=function(key,x0,x1,y0,y1,z,fill,edge){return h('g',{key:key},solid&&poly('front',[[x0,y1,0],[x1,y1,0],[x1,y1,z],[x0,y1,z]],'#1b3038',edge),solid&&poly('side',[[props.camera.side===-1?x0:x1,y0,0],[props.camera.side===-1?x0:x1,y1,0],[props.camera.side===-1?x0:x1,y1,z],[props.camera.side===-1?x0:x1,y0,z]],'#29444b',edge),poly('top',[[x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z]],fill,edge));};
      items.push(oval('shadow',4,7,51,22,0,'#030e16'));if(selected)items.push(oval('selection',0,0,53,25,0,'#24443e','#e7cd91'));
      items.push(line('leads',[[-49,0,12],[49,0,12]],'#b9cbd0',4));
      if(part.type==='resistor'){
        items.push(solid&&poly('body-side',[[-32,10,7],[32,10,7],[32,10,24],[-32,10,24]],'#92714c','#c9a974'),poly('resistor',[[-34,-5,24],[-28,-12,24],[28,-12,24],[34,-5,24],[34,5,24],[28,12,24],[-28,12,24],[-34,5,24]],'#dfc395','#f5ddb5'));
        circuitNetworkResistorBands(part.value).forEach(function(color,j){var x=[-22,-10,2,24][j];items.push(poly('band-'+j,[[x,-11,25],[x+5,-11,25],[x+5,11,25],[x,11,25]],color));});
       }else if(part.type==='opamp'){
        var limitColor=row.voltage==null?'#95a3b4':row.opampRegion==='linear'?'#a5e6d2':'#efbb7f';
        [-20,0,20].forEach(function(x,j){items.push(line('pin-top-'+j,[[x,-17,6],[x,-23,6]],'#bdd0d6',3),line('pin-bottom-'+j,[[x,17,6],[x,23,6]],'#bdd0d6',3));});
        items.push(block('opamp-case',-31,31,-17,17,27,'#293c52',limitColor),poly('opamp-triangle',[[-23,0,29],[20,-13,29],[20,13,29]],'#3e526a','#e3eacb'),line('opamp-plus-h',[[7,-6,30],[15,-6,30]],'#e3eacb',1.7),line('opamp-plus-v',[[11,-10,30],[11,-2,30]],'#e3eacb',1.7),line('opamp-minus',[[7,6,30],[15,6,30]],'#e3eacb',1.7),line('opamp-out',[[-31,0,28],[-23,0,28]],limitColor,3));
      }else if(part.type==='capacitor'){
        items.push(block('capacitor',-27,27,-10,11,34,'#367b9c','#a7dbe8'),line('cap-shine',[[-21,-5,35],[20,-5,35]],'#9cdef0',2),line('plate-left',[[-7,-5,36],[-7,7,36]],'#eef6e3',3),line('plate-right',[[7,-5,36],[7,7,36]],'#eef6e3',3));
      }else if(part.type==='inductor'){
        items.push(line('coil-core',[[-30,0,13],[30,0,13]],'#203039',13));var coil=Array.from({length:121},function(_,j){var theta=j/120*Math.PI*12;return [-32+64*j/120,Math.sin(theta)*10,14+Math.cos(theta)*10];});items.push(line('coil-shadow',coil,'#563624',7),line('coil',coil,'#e1a36c',4),line('coil-highlight',coil.map(function(p){return [p[0],p[1]-1,p[2]+1];}),'#ffe0a0',1));
      }else if(part.type==='diode'){
        var forward=row.voltage!=null&&row.voltage>1e-9;
        items.push(solid&&poly('diode-side',[[-31,10,7],[31,10,7],[31,10,24],[-31,10,24]],'#15202c','#617789'),poly('diode',[[-34,-5,24],[-28,-11,24],[28,-11,24],[34,-5,24],[34,5,24],[28,11,24],[-28,11,24],[-34,5,24]],'#243743',forward?'#b6efd3':'#94a9b8'),poly('cathode-band',[[19,-11,25],[25,-11,25],[25,11,25],[19,11,25]],'#e0e8e5'),line('diode-mark',[[-15,0,26],[6,0,26]],forward?'#a4f2ce':'#a7beca',2),poly('diode-polarity',[[-9,-5,26],[0,0,26],[-9,5,26]],forward?'#a4f2ce':'#a7beca'));
      }else if(part.type==='switch'){
        items.push(block('switch-base',-31,31,-13,13,9,'#344652','#819a9d'),oval('contact-a',-23,0,5,5,14,'#ebc77f'),oval('contact-b',23,0,5,5,14,'#ebc77f'),line('lever-shadow',[[-23,0,17],[row.closed?23:9,row.closed?0:-14,row.closed?17:38]],'#152b33',7),line('lever',[[-23,0,18],[row.closed?23:9,row.closed?0:-14,row.closed?18:39]],'#eef0d2',4));
      }else if(part.type==='wire'){
        items.push(line('jumper',[[-31,0,12],[-18,0,28],[18,0,28],[31,0,12]],'#bed9dc',5));
      }else{
        items.push(block('source',-30,30,-16,16,24,part.control?'#56466e':part.type==='voltage'?'#754963':'#355b7a','#c9b9d2'));
        if(part.control)items.push(poly('controlled-symbol',[[-22,0,26],[0,-12,26],[22,0,26],[0,12,26]],'none','#dcccf4'));
        if(circuitNetworkVoltageOutput(part))items.push(line('plus-h',[[-19,0,25],[-9,0,25]],'#f5e2c5',2),line('plus-v',[[-14,-5,25],[-14,5,25]],'#f5e2c5',2),line('minus',[[9,0,25],[19,0,25]],'#f5e2c5',2));
        else items.push(line('arrow-line',[[-17,0,25],[17,0,25]],'#d8edf4',2),line('arrow-head',[[10,-6,25],[17,0,25],[10,6,25]],'#d8edf4',2));
      }
      bodies.push({depth:project(c.x,c.y)[1],element:h('g',{key:part.id,'data-network-body':part.type,'data-component-id':part.id,'data-switch-closed':part.type==='switch'?row.closed:undefined,'data-diode-bias':part.type==='diode'?circuitNetworkDiodeStatus(row):undefined,'data-opamp-region':part.opamp?row.opampRegion:undefined},items)});
    });
    return h('div',{className:'circuit-network-scroll',ref:viewRef,role:'region',tabIndex:0,'aria-label':'Scrollable connected circuit board',onKeyDown:function(e){if(e.target!==e.currentTarget)return;var moves={ArrowLeft:[-70,0],ArrowRight:[70,0],ArrowUp:[0,-70],ArrowDown:[0,70]};if(moves[e.key]){e.preventDefault();e.currentTarget.scrollBy(moves[e.key][0],moves[e.key][1]);}else if(e.key==='Home'){e.preventDefault();e.currentTarget.scrollTo(0,0);}},onPointerDown:function(e){if(e.pointerType!=='mouse'||e.button!==0||e.target.closest('button,input,select'))return;var el=e.currentTarget;dragRef.current={x:e.clientX,y:e.clientY,left:el.scrollLeft,top:el.scrollTop};el.setPointerCapture(e.pointerId);el.setAttribute('data-dragging','true');el.focus({preventScroll:true});e.preventDefault();},onPointerMove:function(e){var drag=dragRef.current;if(!drag)return;e.currentTarget.scrollLeft=drag.left+drag.x-e.clientX;e.currentTarget.scrollTop=drag.top+drag.y-e.clientY;},onPointerUp:release,onPointerCancel:release,onLostPointerCapture:function(){dragRef.current=null;}},h('div',{className:'circuit-network-stage',style:{aspectRatio:'900 / '+height,width:(props.camera.zoom*100)+'%',minWidth:800*props.camera.zoom}},
      h('svg', {viewBox:'0 0 900 '+height,role: 'img','aria-label':(solid?'Projected 3D':'Flat')+' connected circuit board with '+s.rows.length+' components. Resistors have bands; capacitors show plates; inductors show coils. A diode band marks terminal B, the cathode. Switch levers follow the selected time. '+(voltageMode?'Wire colors show node voltage relative to 0. ':'Arrows show conventional current direction. ')+'Only shared node names make electrical connections. Crossings do not connect. Select components and voltage-probe nodes using the adjacent board buttons or connection editor.'},
        h('defs',null,h('linearGradient',{id:'network-board-surface',x1:'0%',y1:'0%',x2:'100%',y2:'100%'},h('stop',{offset:'0%',stopColor:'#204854'}),h('stop',{offset:'100%',stopColor:'#102934'}))),h('rect',{width:900,height:height,rx:18,fill:'#081b29'}),solid&&h('polygon',{points:shifted,fill:'#122a35',stroke:'#4d7782',strokeWidth:2}),h('polygon',{points:top,fill:'url(#network-board-surface)',stroke:'#7399a4',strokeWidth:2}),
        Array.from({length:20},function(_,i){var x=60+i*40;return h('polyline',{key:'gx'+i,points:points([[x,40],[x,height-60]]),fill:'none',stroke:'#80aab3',opacity:.13});}),Array.from({length:Math.floor((height-90)/40)},function(_,i){var y=50+i*40;return h('polyline',{key:'gy'+i,points:points([[50,y],[850,y]]),fill:'none',stroke:'#80aab3',opacity:.13});}),(geometry.sense[props.selected]||[]).map(function(r,i){return h('path',{key:'sense-'+i,'data-network-sense':props.selected,d:circuitNetworkRoundedPath(r.points),fill:'none',stroke:'#cfb2f0',strokeWidth:2,strokeDasharray:'3 7',opacity:.9});}),routes.filter(function(r){return Number(r.key)!==props.selected;}).concat(routes.filter(function(r){return Number(r.key)===props.selected;})),bodies.sort(function(a,b){return a.depth-b.depth;}).map(function(b){return b.element;}),
        s.nodes.filter(function(n){return n.used;}).map(function(node){var p=project(layout.nodes[node.id][0],layout.nodes[node.id][1]);return h('g',{key:node.id},h('circle',{cx:p[0],cy:p[1],r:22,fill:'#071722',stroke:circuitNetworkPotentialColor(node.voltage,scale),strokeWidth:3}),h('circle',{cx:p[0],cy:p[1],r:7,fill:'#ccdfdc'}));})),
      s.rows.map(function(row,i){var c=layout.centers[i],p=project(c.x,c.y+24,0);return h('button',{type:'button',key:row.component.id,className:'circuit-network-part','data-kind':row.component.type,'aria-label':'Select '+row.label+' · '+CIRCUIT_NETWORK_TYPES[row.component.type].name.toLowerCase()+' · '+row.component.a+' to '+row.component.b,'aria-pressed':row.component.id===props.selected,style:{left:(p[0]/9)+'%',top:(p[1]/height*100)+'%'},onClick:function(){props.select(row.component.id);}},h('strong',null,row.label),h('span',null,row.component.opamp?circuitNetworkOpAmpStatus(row):circuitNetworkValue(row.component,row.closed)));}),
      s.nodes.filter(function(n){return n.used;}).map(function(node){var p=project(layout.nodes[node.id][0],layout.nodes[node.id][1]),red=props.probe.red===node.id,black=props.probe.black===node.id;return h('button',{type:'button',key:node.id,className:'circuit-network-node','aria-label':'Place '+props.lead+' probe on node '+node.id,'data-red':red,'data-black':black,style:{left:(p[0]/9)+'%',top:(p[1]/height*100)+'%'},onClick:function(){props.place(node.id);}},h('strong',null,node.id+(red?' R':'')+(black?' K':'')),h('span',null,node.voltage==null?(s.ok?'floating':'unknown'):circuitPreciseVoltageText(node.voltage)));})));
  }
  function circuitNetworkEnergyText(value){return value==null?'Undetermined':value===0?'0 J':Math.abs(value)<1e-9?Number((value*1e12).toPrecision(4))+' pJ':Math.abs(value)<1e-6?Number((value*1e9).toPrecision(4))+' nJ':Math.abs(value)<.001?Number((value*1e6).toPrecision(4))+' µJ':Math.abs(value)<1?Number((value*1000).toPrecision(4))+' mJ':Number(value.toPrecision(4))+' J';}
  function CircuitNetworkSignalEditor(props){
    var React=props.React,h=React.createElement,p=props.component,w=p.waveform,current=p.type==='current',factor=current?1000:1,unit=current?'mA':'V',format=current?circuitCurrentText:circuitPreciseVoltageText;
    var update=function(values){props.edit({waveform:Object.assign({},w,values)});},low=w.shape==='pulse'?p.value:p.value-w.amplitude,high=p.value+w.amplitude,span=high-low||1;
    var sampleTimes=Array.from({length:161},function(_,i){return i/160/w.frequency;}).concat(circuitNetworkSignalPlan({components:[p]},1/w.frequency).events),path=sampleTimes.sort(function(a,b){return a-b;}).map(function(time,i){return (i?'L':'M')+(12+316*time*w.frequency).toFixed(2)+' '+(94-72*(circuitNetworkSourceValue(p,time)-low)/span).toFixed(2);}).join(' ');
    return h('section',{className:'circuit-network-signal','aria-label':'Source signal generator'},
      h('div',{className:'circuit-network-signal-title'},h('span',{className:'circuit-eyebrow'},'SHAPE THE INPUT'),h('strong',null,p.type==='voltage'?'Voltage generator':'Current generator')),
      h('label',null,'Source waveform',h('select',{id:'network-source-waveform','aria-label':'Network source waveform',value:w.shape,onChange:function(e){update({shape:e.target.value});}},Object.keys(CIRCUIT_NETWORK_WAVES).map(function(shape){return h('option',{key:shape,value:shape},shape==='pulse'?'Pulse · finite edges':CIRCUIT_NETWORK_WAVES[shape]);}))),
      w.shape!=='dc'&&h(React.Fragment,null,
        h('div',{className:'circuit-network-signal-preview'},h('svg', {viewBox:'0 0 340 114',role: 'img','aria-label':CIRCUIT_NETWORK_WAVES[w.shape]+' source preview for one period of '+circuitTimeText(1/w.frequency)+'. Range '+format(low)+' to '+format(high)+'. Phase '+w.phase+' degrees.'},h('rect',{width:340,height:114,rx:9,fill:'#0a2031'}),[0,.25,.5,.75,1].map(function(f){return h('line',{key:f,x1:12+316*f,x2:12+316*f,y1:16,y2:100,stroke:'#405773',strokeDasharray:'3 5'});}),h('line',{x1:12,x2:328,y1:94-72*(p.value-low)/span,y2:94-72*(p.value-low)/span,stroke:'#6d7598',strokeDasharray:'4 4'}),h('path',{d:path,fill:'none',stroke:'#d3bafa',strokeWidth:2.8,strokeLinejoin:'round'})),h('div',null,h('span',null,'One period'),h('strong',null,circuitTimeText(1/w.frequency)))),
        h('dl',{className:'circuit-network-signal-levels'},[['Minimum',format(low)],['Maximum',format(high)],['Now',format(circuitNetworkSourceValue(p,props.timed?props.time:null))]].map(function(row){return h('div',{key:row[0]},h('dt',null,row[0]),h('dd',null,row[1]));})),
        h(CircuitActiveControl,{React:React,field:'network-signal-amplitude',label:(w.shape==='pulse'?'Pulse height':'Peak amplitude')+' ('+unit+')',value:w.amplitude*factor,min:0,max:current?100:24,step:current?.1:.1,onChange:function(value){update({amplitude:value/factor});}}),
        h(CircuitActiveControl,{React:React,field:'network-signal-frequency',label:'Frequency (Hz)',value:w.frequency,min:.01,max:100000,step:.01,logarithmic:true,onChange:function(value){update({frequency:value});}}),
        h('div',{className:'circuit-network-signal-shortcuts'},h('button',{type:'button',disabled:w.frequency<=.01,onClick:function(){update({frequency:Math.max(.01,w.frequency/2)});}},'Halve frequency'),h('button',{type:'button',disabled:w.frequency>=100000,onClick:function(){update({frequency:Math.min(100000,w.frequency*2)});}},'Double frequency'),h('button',{type:'button',onClick:function(){props.fit(Math.min(60,3/w.frequency));}},'Show up to 3 cycles')),
        h(CircuitActiveControl,{React:React,field:'network-signal-phase',label:'Phase lead (°)',value:w.phase,min:0,max:360,step:1,onChange:function(value){update({phase:value});}}),
        w.shape==='pulse'&&h(React.Fragment,null,h(CircuitActiveControl,{React:React,field:'network-signal-duty',label:'Pulse width (% of period)',value:w.duty,min:1,max:99,step:1,onChange:function(value){update({duty:value});}}),h(CircuitActiveControl,{React:React,field:'network-signal-edge',label:'Rise / fall (% of period)',value:w.edge,min:.01,max:Math.min(w.duty,100-w.duty)/2,step:.01,onChange:function(value){update({edge:value});}}),h('p',{className:'circuit-help'},'Each edge lasts '+circuitTimeText(w.edge/100/w.frequency)+'. Width measures from the start of the rise to the start of the fall. Narrower pulses also limit the allowed edge duration.')),
        h('p',{className:'circuit-help'},w.shape==='pulse'?'The DC level is the low level. Pulse height adds to it. Finite ramps let reactive parts respond without an ideal instantaneous jump.':'Peak amplitude is measured from the DC level to either peak. Peak-to-peak size is '+format(2*w.amplitude)+'. Positive phase advances the waveform.'),
        h('p',{className:'circuit-network-signal-mode'},props.timed?'Time response follows this signal from t = 0, including the configured phase.':'DC equilibrium uses only the DC level. Choose Time response to run this waveform.'),
        !props.timed&&h('button',{type:'button',onClick:function(){props.fit(Math.min(60,3/w.frequency));}},'Run this signal')),
      w.shape==='dc'&&h('p',{className:'circuit-help'},'A DC source holds its configured level. Choose a waveform to investigate a changing input.'));
  }

  function CircuitNetworkOpAmpReadout(props){
    var h=props.React.createElement,row=props.row,p=row.component,m=p.opamp,known=row.voltage!=null&&m.lower<m.upper,position=known?Math.max(0,Math.min(100,100*(row.voltage-m.lower)/(m.upper-m.lower))):0;
    return h('section',{className:'circuit-network-opamp-state','data-region':row.opampRegion||'unknown','aria-label':props.scope?'Op-amp scope operating point':'Op-amp operating point'},
      h('div',{className:'circuit-network-opamp-state-title'},h('strong',null,circuitNetworkOpAmpStatus(row)),h('span',null,'Output A − B')),
      h('div',{className:'circuit-network-opamp-window'},h('span',null,circuitPreciseVoltageText(m.lower)),h('strong',null,known?circuitPreciseVoltageText(row.voltage):'Undetermined'),h('span',null,circuitPreciseVoltageText(m.upper))),
      known&&h('div',{className:'circuit-network-opamp-meter',role:'meter','aria-label':'Op-amp output within limits','aria-valuemin':m.lower,'aria-valuemax':m.upper,'aria-valuenow':row.voltage,'aria-valuetext':circuitPreciseVoltageText(row.voltage)+' · '+circuitNetworkOpAmpStatus(row)},h('span',{style:{left:position+'%'}})),
      h('dl',null,h('div',null,h('dt',null,'Input error · V+ − V−'),h('dd',null,row.controlValue==null?'Undetermined':circuitPreciseVoltageText(row.controlValue))),h('div',null,h('dt',null,'Nearest output limit'),h('dd',null,row.opampHeadroom==null?'Undetermined':circuitPreciseVoltageText(row.opampHeadroom)+' away'))),
      h('p',{className:'circuit-help'},!known?'Repair the circuit to see the operating point.':row.opampRegion==='linear'?'With negative feedback, high gain keeps the input difference small while the output has room to move. The two inputs are not physically shorted.':'The output has reached a configured limit. It cannot follow the requested gain, so the input error can grow. Reduce the signal or gain, or widen the output window.'));
  }
  function CircuitNetworkOpAmpEditor(props){
    var h=props.React.createElement,p=props.row.component,m=p.opamp,c=p.control,change=function(values){props.edit({opamp:Object.assign({},m,values)});},node=function(label,key){return h('label',null,label,h('select',{'aria-label':label,value:c[key],onChange:function(e){var next=Object.assign({},c);next[key]=e.target.value;props.edit({control:next});}},CIRCUIT_NETWORK_NODES.map(function(id){return h('option',{key:id,value:id},id==='0'?'0 · reference':id);})));};
    return h('section',{className:'circuit-network-opamp-editor','aria-label':'Op-amp controls'},h('span',{className:'circuit-eyebrow'},'FOLLOW THE FEEDBACK'),h('h4',null,'Gain, error, and output limits'),
      h('div',{className:'circuit-network-terminals'},node('Non-inverting input (+)','positive'),node('Inverting input (−)','negative')),
      h(CircuitActiveControl,{React:props.React,field:'network-opamp-gain',label:'Open-loop gain (V/V)',value:p.value,min:1,max:1000000,step:1,logarithmic:true,onChange:function(value){props.edit({value:value});}}),
      h('div',{className:'circuit-network-opamp-shortcuts'},h('button',{type:'button',disabled:p.value<=1,onClick:function(){props.edit({value:Math.max(1,p.value/10)});}},'Gain ÷ 10'),h('button',{type:'button',disabled:p.value>=1000000,onClick:function(){props.edit({value:Math.min(1000000,p.value*10)});}},'Gain × 10'),h('button',{type:'button',onClick:function(){props.measure(c.positive,c.negative);}},'Measure input error')),
      h('p',{className:'circuit-help'},'Open-loop gain multiplies the input difference. The surrounding feedback circuit sets the closed-loop gain. Vout = clamp(gain × (V+ − V−), lower, upper).'),
      h('div',{className:'circuit-network-opamp-shortcuts',role:'group','aria-label':'Output window presets'},[[-5,5,'±5 V window'],[-12,12,'±12 V window'],[0,5,'0–5 V window']].map(function(preset){return h('button',{type:'button',key:preset[2],'aria-pressed':m.lower===preset[0]&&m.upper===preset[1],onClick:function(){change({lower:preset[0],upper:preset[1]});}},preset[2]);})),
      h(CircuitActiveControl,{React:props.React,field:'network-opamp-lower',label:'Lower output limit (V)',value:m.lower,min:-24,max:24,step:.1,onChange:function(value){change({lower:value});}}),
      h(CircuitActiveControl,{React:props.React,field:'network-opamp-upper',label:'Upper output limit (V)',value:m.upper,min:-24,max:24,step:.1,onChange:function(value){change({upper:value});}}),
      h(CircuitNetworkOpAmpReadout,{React:props.React,row:props.row}),
      h('details',null,h('summary',null,'What this op-amp models'),h('p',{className:'circuit-help'},'Finite positive open-loop gain and hard output limits relative to output reference B. Inputs draw zero current and the output has zero impedance with no current limit. The output is internally powered; these limits are settings, not connected supply terminals. Supply current, input common-mode restrictions, input offset/bias, bandwidth, slew rate, and saturation recovery are not modeled.'),h('p',{className:'circuit-help'},'Up to four op-amps can be checked together. Multiple operating points, undefined input differences, or inconsistent output constraints stop the run. This memoryless model does not simulate latches, hysteresis, or comparator propagation delay.')));
  }
  function CircuitNetworkControlEditor(props){
    var h=props.React.createElement,row=props.row,p=row.component,c=p.control,voltageInput=c.source==null,voltageOutput=circuitNetworkVoltageOutput(p),spec=CIRCUIT_NETWORK_TYPES[p.type],format=voltageInput?circuitPreciseVoltageText:circuitCurrentText,senses=props.design.components.filter(circuitNetworkVoltageOutput),sense=senses.find(function(q){return q.id===c.source;});
    var change=function(values){props.edit({control:Object.assign({},c,values)});},node=function(label,key){return h('label',null,label,h('select',{'aria-label':label,value:c[key],onChange:function(e){var values={};values[key]=e.target.value;change(values);}},CIRCUIT_NETWORK_NODES.map(function(n){return h('option',{key:n,value:n},n==='0'?'0 · reference':n);})));};
    return h('section',{className:'circuit-network-control-editor','aria-label':'Controlled source settings'},h('span',{className:'circuit-eyebrow'},'RELATE INPUT TO OUTPUT'),h('h4',null,p.type.toUpperCase()),
      voltageInput?h('div',{className:'circuit-network-terminals'},node('Control positive node','positive'),node('Control negative node','negative')):h('label',null,'Sense branch current',h('select',{'aria-label':'Current sense source',value:sense?c.source:0,onChange:function(e){change({source:Number(e.target.value)});}},h('option',{value:0},'Choose a voltage-output source'),senses.map(function(q){return h('option',{key:q.id,value:q.id},circuitNetworkLabel(q)+' · '+q.a+' → '+q.b);}))),
      h(CircuitActiveControl,{React:props.React,field:'network-controlled-gain',label:'Control gain ('+spec.unit+')',value:p.value,min:spec.min,max:spec.max,step:p.type==='vccs'?.0001:.1,onChange:function(value){props.edit({value:value});}}),
      h('div',{className:'circuit-network-control-equation'},h('strong',null,(voltageOutput?'Vout':'Iout')+' = gain × '+(voltageInput?'(V+ − V−)':'Isense')),h('span',null,(row.controlValue==null?'Undetermined':format(row.controlValue))+' × '+Number(p.value.toPrecision(5))+' '+spec.unit+' → '+((voltageOutput?row.voltage:row.current)==null?'Undetermined':(voltageOutput?circuitPreciseVoltageText:circuitCurrentText)(voltageOutput?row.voltage:row.current)))),
      h('p',{className:'circuit-help'},voltageInput?'Control inputs draw zero current. The source responds to their voltage difference, even when both inputs float together.':'The sensed current is positive from the chosen source’s A terminal to B. Insert a 0 V voltage source in series to sense a branch without adding a voltage drop.'),
      h('p',{className:'circuit-help'},'Output voltage is A minus B; output current is positive from A to B. Negative gain reverses the response. This ideal source has no supply rails, saturation, bandwidth, or current limit; its output energy is not drawn from the sensing input.'));
  }
  function CircuitNetworkDiodeEditor(props){
    var h=props.React.createElement,p=props.row.component,m=p.diode,drop=function(current){return circuitPreciseVoltageText(m.emission*m.thermalVoltage*Math.log1p(current/m.saturationCurrent));};
    return h('section',{className:'circuit-network-diode-editor','aria-label':'Diode model and polarity'},h('span',{className:'circuit-eyebrow'},'FOLLOW THE JUNCTION'),h('h4',null,circuitNetworkDiodeStatus(props.row)),
      h('div',{className:'circuit-network-diode-polarity'},h('span',null,p.a+' · Anode (A)'),h('strong',null,'→'),h('span',null,p.b+' · Cathode (K)')),
      h('p',{className:'circuit-help'},'The light band marks the cathode, terminal B. Forward current flows from anode to cathode. Reverse bias produces a small modeled leakage current.'),
      h('label',null,'Junction model',h('select',{'aria-label':'Network diode model',value:m.model,onChange:function(e){props.edit({diode:{model:e.target.value}});}},Object.keys(CIRCUIT_NETWORK_DIODE_MODELS).map(function(name){return h('option',{key:name,value:name},CIRCUIT_NETWORK_DIODE_MODELS[name].name);}))),
      h('dl',{className:'circuit-network-diode-reference'},[['Drop at 1 mA',drop(.001)],['Drop at 10 mA',drop(.01)]].map(function(item){return h('div',{key:item[0]},h('dt',null,item[0]),h('dd',null,item[1]));})),
      h('p',{className:'circuit-help'},'Forward voltage varies with current; it is not a fixed 0.7 V threshold. These reference drops describe the selected model, not the present circuit reading.'),
      h('button',{type:'button',onClick:function(){props.edit({a:p.b,b:p.a});}},'Reverse diode polarity'),
      h('details',null,h('summary',null,'Diode model assumptions'),h('p',{className:'circuit-help'},'I = Is × (exp(V / (n × VT)) − 1). This generic junction uses Is = '+circuitCurrentText(m.saturationCurrent)+', n = '+m.emission+', and VT = 25.85 mV at approximately 300 K. It includes exponential forward conduction and reverse leakage. Series resistance, reverse breakdown, junction capacitance, reverse recovery, temperature changes, and damage are not modeled. External series resistance controls forward current.')));
  }
  function CircuitNetworkSwitchEditor(props){
    var React=props.React,h=React.createElement,p=props.component,sw=p.switching,events=sw.events,last=events[events.length-1],nextTime=last?Math.min(60,Number((last.time+Math.max(props.duration/4,last.time*.25,.000001)).toPrecision(12))):Math.max(.000001,props.duration/3),canAdd=events.length<8&&(!last||last.time<60);
    var update=function(values){props.edit({switching:Object.assign({},sw,values)});},change=function(id,values){update({events:events.map(function(e){return e.id===id?Object.assign({},e,values):e;})});},add=function(){if(canAdd)update({events:events.concat([{id:Math.max(0,...events.map(function(e){return e.id;}))+1,time:nextTime,closed:last?!last.closed:!p.closed}])});};
    return h('section',{className:'circuit-network-switch-editor','aria-label':'Switch timing editor'},
      h('div',{className:'circuit-network-signal-title'},h('span',{className:'circuit-eyebrow'},'CHANGE THE CONNECTION'),h('strong',null,'Switch timing')),
      h('div',{className:'circuit-network-switch-states'},h('div',null,h('span',null,'Initial / DC state'),h('strong',null,p.closed?'Closed':'Open')),h('div',{'data-closed':props.closed},h('span',null,props.timed?'At cursor · '+circuitTimeText(props.time):'DC equilibrium'),h('strong',null,props.closed==null?'Undetermined':props.closed?'Closed':'Open'))),
      h('button',{type:'button','aria-pressed':p.closed,onClick:function(){props.edit({closed:!p.closed});}},sw.enabled?(p.closed?'Start with switch open':'Start with switch closed'):(p.closed?'Open network switch':'Close network switch')),
      h('button',{type:'button',className:'circuit-network-timing-toggle','aria-pressed':sw.enabled,onClick:function(){update({enabled:!sw.enabled,events:!sw.enabled&&!events.length?[{id:1,time:nextTime,closed:!p.closed}]:events});}},sw.enabled?'Disable scheduled switching':'Enable scheduled switching'),
      sw.enabled&&h(React.Fragment,null,
        h('p',{className:'circuit-help'},'Actions at the same time on different switches happen together. Each switch can have up to 8 actions; use distinct times for its own actions.'),
        h('div',{className:'circuit-network-switch-actions'},events.map(function(e){return h('div',{key:e.id,className:'circuit-network-switch-action'},h('div',{className:'circuit-network-switch-action-title'},h('strong',null,'Action '+e.id),h('span',null,e.time>props.duration?'After window':circuitTimeText(e.time))),
          h(CircuitActiveControl,{React:React,field:'network-switch-'+p.id+'-'+e.id,label:'Switch action '+e.id+' time (s)',value:e.time,min:.000001,max:60,step:.001,logarithmic:true,onChange:function(value){change(e.id,{time:value});}}),
          h('div',{className:'circuit-network-switch-action-controls'},h('label',null,'Set connection',h('select',{'aria-label':'Switch action '+e.id+' state',value:e.closed?'closed':'open',onChange:function(ev){change(e.id,{closed:ev.target.value==='closed'});}},h('option',{value:'open'},'Open'),h('option',{value:'closed'},'Closed'))),h('button',{type:'button','aria-label':'Remove switch action '+e.id,onClick:function(){update({events:events.filter(function(a){return a.id!==e.id;})});requestAnimationFrame(function(){var button=document.getElementById('network-add-switch-action');if(button)button.focus();});}},'Remove'))); })),
        h('div',{className:'circuit-network-signal-shortcuts'},h('button',{id:'network-add-switch-action',type:'button',disabled:!canAdd,onClick:add},'Add switch action'),h('button',{type:'button',disabled:!events.length,onClick:function(){props.fit(Math.min(60,Math.max(.000001,last.time*1.4)));}},props.timed?'Fit scheduled changes':'Run switch schedule')),
        h('p',{className:'circuit-network-signal-mode'},props.timed?'Amber scope markers locate each change. Compare Before and After to inspect the same instant on either side.':'Scheduled actions run only in Time response. DC equilibrium uses the initial switch state.')),
      h('p',{className:'circuit-help'},'An ideal switch changes immediately. Capacitor voltage and inductor current carry through each change; an incompatible connection stops the calculation with a diagnostic.'));
  }

  function CircuitNetworkScope(props){
    var React=props.React,h=React.createElement,run=props.run,selected=props.selected,s=props.solved,row=selected,sources=run.design.components.filter(function(p){return circuitNetworkVoltageOutput(p)||circuitNetworkCurrentOutput(p);}),reference=sources.find(function(p){return p.id===props.compare;}),compare=reference&&selected&&reference.id!==selected.component.id,referenceMetric=reference&&circuitNetworkCurrentOutput(reference)?'current':'voltage',referenceRow=reference&&s.rows.find(function(r){return r.component.id===reference.id;});
    var scopeRef=React.useRef(null),widthState=React.useState(820),width=widthState[0],small=width<480,left=small?12:94,right=width-(small?12:54),plotSpan=right-left;
    React.useEffect(function(){var element=scopeRef.current;if(!element)return;var resize=function(){widthState[1](Math.max(220,Math.round(element.clientWidth)||820));};resize();if(typeof ResizeObserver==='function'){var observer=new ResizeObserver(resize);observer.observe(element);return function(){observer.disconnect();};}window.addEventListener('resize',resize);return function(){window.removeEventListener('resize',resize);};},[run.ok,!!selected]);
    var traces=React.useMemo(function(){if(!run.ok||!selected)return [];return ['voltage','current'].map(function(metric,index){
      var samples=run.frames.map(function(f){var r=f.rows.find(function(r){return r.component.id===selected.component.id;});return {time:f.time,value:r[metric]};}),referenceSamples=compare&&referenceMetric===metric?run.frames.map(function(f){var r=f.rows.find(function(r){return r.component.id===reference.id;});return {time:f.time,value:r[metric]};}):[],known=samples.concat(referenceSamples,metric==='voltage'&&selected.component.opamp?[{value:selected.component.opamp.lower},{value:selected.component.opamp.upper}]:[]).filter(function(p){return p.value!=null;}),low=known.reduce(function(v,p){return Math.min(v,p.value);},0),high=known.reduce(function(v,p){return Math.max(v,p.value);},0),span=high-low||1,pad=span*.08,min=low-pad,max=high+pad,top=40+index*145,bottom=top+100;
      var x=function(t){return left+plotSpan*t/run.duration;},y=function(v){return bottom-(v-min)/(max-min)*100;},makePath=function(points){var path='',pen=false;points.forEach(function(p){if(p.value==null){pen=false;return;}path+=(pen?' L ':'M ')+x(p.time).toFixed(2)+' '+y(p.value).toFixed(2);pen=true;});return path;},path=makePath(samples),referencePath=makePath(referenceSamples);
      return {metric:metric,path:path,referencePath:referencePath,min:min,max:max,top:top,bottom:bottom,zero:y(0),y:y,color:index?'#ffcf88':'#96edd7',format:index?circuitCurrentText:circuitPreciseVoltageText};
    });},[run,selected&&selected.component.id,width,reference&&reference.id]);
    var time=s.time||0,sideText=s.side?' · '+s.side+' switching':'',carriedMetric=selected&&(selected.component.type==='capacitor'?'voltage':selected.component.type==='inductor'?'current':null),before=s.event&&carriedMetric?circuitNetworkFrame(run,time,'before'):null,after=s.event&&carriedMetric?circuitNetworkFrame(run,time,'after'):null;
    return h('section',{className:'circuit-active-panel circuit-network-scope','aria-label':'Connected circuit time response'},
      h('div',{className:'circuit-network-scope-heading'},h('div',null,h('span',{className:'circuit-eyebrow'},'FOLLOW THE CHANGE'),h('h3',null,'Energy takes time.')),h('span',{className:'circuit-network-time-badge'},'t = '+circuitTimeText(time)+sideText)),
      h('p',{className:'circuit-help'},'Select a part to trace its voltage and current, then compare a source on the same scale. Amber markers show scheduled switch changes. Electrical edits restart from the starting conditions.'),
      h('div',{className:'circuit-network-time-controls'},h(CircuitActiveControl,{React:React,field:'network-duration',label:'Time window (s)',value:run.duration,min:.000001,max:60,step:.001,logarithmic:true,onChange:function(value){props.patch({duration:value,time:0});}}),h('div',{className:'circuit-network-playback'},h('button',{type:'button',disabled:!run.ok,onClick:props.toggle},props.playing?'Pause time response':'Play time response'),h('button',{type:'button',disabled:!run.ok,onClick:function(){props.seek(0);}},'Restart time response'))),
      run.ok&&selected&&h(React.Fragment,null,
        h('div',{className:'circuit-network-compare-controls'},h('label',null,'Compare a source',h('select',{'aria-label':'Scope source comparison',value:reference?reference.id:0,onChange:function(e){props.patch({scopeSource:Number(e.target.value)});}},h('option',{value:0},'No source comparison'),sources.map(function(p){return h('option',{key:p.id,value:p.id},circuitNetworkLabel(p)+' · '+(circuitNetworkVoltageOutput(p)?'voltage':'current'));}))),reference&&h('button',{type:'button',onClick:function(){props.patch({selected:reference.id});requestAnimationFrame(function(){var editor=document.getElementById(reference.opamp?'circuit-active-value-network-opamp-gain-slider':reference.control?'circuit-active-value-network-controlled-gain-slider':'network-source-waveform');if(editor){editor.scrollIntoView({block:'center'});editor.focus({preventScroll:true});}});}},reference.opamp?'Edit op-amp':reference.control?'Edit controlled source':'Edit source signal')),
        compare&&h('p',{className:'circuit-network-compare-key'},'Dashed purple · '+circuitNetworkLabel(reference)+' source '+referenceMetric+' · shared '+(referenceMetric==='voltage'?'voltage':'current')+' scale'),
        selected.component.opamp&&h(CircuitNetworkOpAmpReadout,{React:React,row:row,scope:true}),
        selected.component.opamp&&h('p',{className:'circuit-help'},'Amber horizontal dashed lines mark the configured output limits on the voltage trace.'),
        h('div',{className:'circuit-network-scope-legend'},h('strong',null,selected.label+' · '+CIRCUIT_NETWORK_TYPES[selected.component.type].name),h('span',null,'A '+selected.component.a+' → B '+selected.component.b),h('span',null,'Two traces · separate scales')),
        h('div',{className:'circuit-network-scope-scroll',ref:scopeRef,role:'region',tabIndex:0,'aria-label':'Voltage and current scope'},h('svg', {viewBox:'0 0 '+width+' 350',role: 'img','aria-label':'Time response of '+selected.label+'. Voltage A minus B is '+(row.voltage==null?'undetermined':circuitPreciseVoltageText(row.voltage))+'; current A to B is '+(row.current==null?'undetermined':circuitCurrentText(row.current))+' at '+circuitTimeText(time)+sideText+'. Voltage and current use separate scales.'+(compare?' Dashed '+circuitNetworkLabel(reference)+' source '+referenceMetric+' uses the same '+referenceMetric+' scale.':'')+' The cursor and readings are available below.'},
          h('rect',{width:width,height:350,rx:12,fill:'#081e2c'}),traces.map(function(t){return h('g',{key:t.metric},h('text',{x:left,y:t.top-14,fill:t.color,fontSize:small?11:15,fontWeight:600},t.metric==='voltage'?'VOLTAGE · A − B':'CURRENT · A → B'),[0,.25,.5,.75,1].map(function(f){return h('line',{key:f,x1:left+plotSpan*f,x2:left+plotSpan*f,y1:t.top,y2:t.bottom,stroke:'#284959',strokeDasharray:'3 5'});}),h('line',{x1:left,x2:right,y1:t.zero,y2:t.zero,stroke:'#6b8995',strokeDasharray:'4 4'}),h('text',{x:small?right:83,y:small?t.top-14:t.top+5,textAnchor:'end',fontSize:small?11:13,fill:'#c3d9e5'},t.format(t.max)),h('text',{x:small?right:83,y:small?t.bottom+14:t.bottom,textAnchor:'end',fontSize:small?11:13,fill:'#c3d9e5'},t.format(t.min)),(run.events||[]).map(function(event,i){var x=left+plotSpan*event.time/run.duration;return h('g',{key:'switch-'+i},h('line',{x1:x,x2:x,y1:t.top,y2:t.bottom,stroke:'#e9ac71',strokeWidth:1.5,strokeDasharray:'2 4'}),h('path',{d:'M '+(x-4)+' '+t.top+' L '+(x+4)+' '+t.top+' L '+x+' '+(t.top+6)+' Z',fill:'#e9ac71'}));}),t.metric==='voltage'&&selected.component.opamp&&[selected.component.opamp.lower,selected.component.opamp.upper].map(function(limit,i){return h('line',{key:'limit-'+i,'data-opamp-limit':limit,x1:left,x2:right,y1:t.y(limit),y2:t.y(limit),stroke:'#edbb7e',strokeWidth:1.5,strokeDasharray:'8 4'});}),t.referencePath&&h('path',{d:t.referencePath,fill:'none',stroke:'#d3bafa',strokeWidth:2,strokeDasharray:'7 5'}),h('path',{d:t.path,fill:'none',stroke:t.color,strokeWidth:2.5,strokeLinejoin:'round'}),h('line',{x1:left+plotSpan*time/run.duration,x2:left+plotSpan*time/run.duration,y1:t.top,y2:t.bottom,stroke:'#f8efcf',strokeWidth:1.5}),row[t.metric]!=null&&h('circle',{cx:left+plotSpan*time/run.duration,cy:t.y(row[t.metric]),r:4,fill:'#f8efcf',stroke:'#081e2c',strokeWidth:1}));}),[0,.5,1].map(function(f){return h('text',{key:f,x:left+plotSpan*f,y:320,textAnchor:f===0?'start':f===1?'end':'middle',fill:'#c3d9e5',fontSize:small?11:14},circuitTimeText(run.duration*f));}))),
        h('label',{className:'circuit-network-cursor'},'Scope time cursor',h('input',{type:'range','aria-label':'Connected scope time cursor','aria-valuetext':circuitTimeText(time)+sideText,min:0,max:run.duration,step:run.duration/10000,value:time,onKeyDown:function(e){if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();var index=run.frames.indexOf(s),direction=e.key==='ArrowRight'||e.key==='ArrowUp'?1:-1;var target=run.frames[Math.max(0,Math.min(run.frames.length-1,index+direction))];props.seek(target.time,target.side);},onChange:function(e){props.seek(Number(e.target.value));}})),
        h('dl',{className:'circuit-network-scope-readings','data-compare':!!compare},[['Voltage A − B',row.voltage==null?'Undetermined':circuitPreciseVoltageText(row.voltage)],['Current A → B',row.current==null?'Undetermined':circuitCurrentText(row.current)],['Stored energy · all parts',circuitNetworkEnergyText(s.storedEnergy)]].concat(compare?[[circuitNetworkLabel(reference)+' · source '+referenceMetric,referenceRow[referenceMetric]==null?'Undetermined':(referenceMetric==='current'?circuitCurrentText:circuitPreciseVoltageText)(referenceRow[referenceMetric])]]:[]).map(function(r){return h('div',{key:r[0]},h('dt',null,r[0]),h('dd',null,r[1]));})),
        (run.events||[]).length>0&&h('section',{className:'circuit-network-event-panel','aria-label':'Switch event timeline'},
          h('div',{className:'circuit-network-event-heading'},h('h4',null,'At the switch'),h('span',null,run.events.length+' timed '+(run.events.length===1?'event':'events'))),
          h('p',{className:'circuit-help'},'Before and After share one timestamp. They reveal which readings change immediately.'),
          h('ol',{className:'circuit-network-event-list'},run.events.map(function(event,i){return h('li',{key:event.time,'data-active':s.event===event},h('div',null,h('strong',null,circuitTimeText(event.time)),h('span',null,circuitNetworkSwitchText(event))),h('div',{className:'circuit-network-event-buttons'},['before','after'].map(function(side){return h('button',{key:side,type:'button','aria-label':(side==='before'?'Before':'After')+' switch event '+(i+1),'aria-pressed':s.event===event&&s.side===side,onClick:function(){props.seek(event.time,side);}},side==='before'?'Before':'After');})));})),
          before&&after&&h('div',{className:'circuit-network-continuity'},h('strong',null,selected.label+' · '+(carriedMetric==='voltage'?'Voltage':'Current')+' carried through'),h('span',null,(carriedMetric==='voltage'?circuitPreciseVoltageText:circuitCurrentText)(before.rows.find(function(r){return r.component.id===selected.component.id;})[carriedMetric])+' → '+(carriedMetric==='voltage'?circuitPreciseVoltageText:circuitCurrentText)(after.rows.find(function(r){return r.component.id===selected.component.id;})[carriedMetric])),h('p',{className:'circuit-help'},carriedMetric==='voltage'?'The capacitor keeps its voltage and stored energy at the switch. Its current can change immediately.':'The inductor keeps its current and stored energy at the switch. Its voltage can change immediately.'))),
        h('div',{className:'circuit-network-scope-footer'} ,h('p',{className:'circuit-help'},run.frames.length+' calculated samples · cursor snaps to a sample · playback spans about 6 seconds'),h('button',{type:'button',onClick:props.download},'Export time response CSV'))),
      h('details',null,h('summary',null,'Read the response'),h('p',null,'A capacitor stores energy in an electric field: E = ½CV². Its voltage cannot change instantly. An inductor stores energy in a magnetic field: E = ½LI². Its current cannot change instantly. Positive absorbed power can increase stored energy; negative power means energy is returning to the network.'),h('p',{className:'circuit-help'},'DC equilibrium is a separate calculation: capacitors are open and inductors are shorted. A flat trace alone does not prove equilibrium. Time response uses adaptive backward Euler steps; it introduces numerical damping, particularly in lightly damped oscillations. Very stiff networks can exceed the calculation limit. DC, sine, triangle, and finite-edge pulse sources are supported. Sources are sampled at least 256 times per period; pulse edges and triangle corners are included explicitly. This is a startup simulation, not a steady-state AC calculation. Scheduled ideal switches preserve capacitor voltage and inductor current at each event. Generic silicon and Schottky diodes use an exponential junction model. Contact bounce and arcing are not modeled.')));
  }

  function CircuitNetworkWorkbench(props) {
    var ctx=props.ctx,React=ctx.React,h=React.createElement,state=(ctx.toolData||{})._circuitNetwork||{},timed=state.analysis==='time',dc=React.useMemo(function(){return solveNetworkCircuit(state);},[state.components]),run=React.useMemo(function(){return timed?circuitNetworkTransient(state):null;},[timed,state.components,state.duration]),s=timed?circuitNetworkFrame(run,state.time,state.timeSide):dc;
    if(!s)s=Object.assign({},dc,{ok:false,time:0,rows:dc.rows.map(function(r){return Object.assign({},r,{voltage:null,current:null,power:null,energy:null,controlValue:null,opampRegion:'unknown',opampRequested:null,opampHeadroom:null});}),nodes:dc.nodes.map(function(n){return Object.assign({},n,{voltage:n.id==='0'?0:null});}),balances:dc.balances.map(function(b){return {id:b.id,current:null};}),absorbed:null,delivered:null,storedEnergy:null,message:run.message});
    var playState=React.useState(false),playing=playState[0],setPlaying=playState[1],d=s.design,probe=circuitNetworkProbe(s,state.probeRed,state.probeBlack),selected=s.rows.find(function(r){return r.component.id===state.selected;})||s.rows[0],solid=state.view!=='flat',camera=circuitNetworkCamera(state.camera),resetViewState=React.useState(0),resetViewKey=resetViewState[0];
    var voltageScale=React.useMemo(function(){return (timed&&run.ok?run.frames:[dc]).reduce(function(max,frame){return frame.nodes.reduce(function(value,node){return node.voltage==null?value:Math.max(value,Math.abs(node.voltage));},max);},1);},[timed,run,dc]);
    var patch=function(values,electrical){if(electrical||values.analysis!=null||values.duration!=null){setPlaying(false);values=Object.assign({},values,{time:0,timeSide:null});}ctx.setToolData(function(prev){var old=prev._circuitNetwork||{},next=Object.assign({},old,values);if(electrical){var before=circuitNetworkDesign(old),after=circuitNetworkDesign(next);next.components=after.components;if(JSON.stringify(before)!==JSON.stringify(after)){next.undo=(old.undo||[]).slice(-29).concat([before]);next.redo=[];}}return Object.assign({},prev,{_circuitNetwork:next});});};
    var history=function(key){setPlaying(false);ctx.setToolData(function(prev){var old=prev._circuitNetwork||{},stack=old[key]||[];if(!stack.length)return prev;var next=Object.assign({},old,stack[stack.length-1],{time:0,timeSide:null});next[key]=stack.slice(0,-1);next[key==='undo'?'redo':'undo']=(old[key==='undo'?'redo':'undo']||[]).slice(-29).concat([circuitNetworkDesign(old)]);return Object.assign({},prev,{_circuitNetwork:next});});};
    React.useEffect(function(){if(!playing||!timed||!run.ok)return;var from=circuitNumber(state.time,0,0,run.duration),started=performance.now();
      var advance=function(){if(document.hidden){setPlaying(false);return;}var time=Math.min(run.duration,from+(performance.now()-started)/6000*run.duration);ctx.setToolData(function(prev){return Object.assign({},prev,{_circuitNetwork:Object.assign({},prev._circuitNetwork,{time:time,timeSide:null})});});if(time>=run.duration)setPlaying(false);};
      var hidden=function(){if(document.hidden)setPlaying(false);},timer=setInterval(advance,125);document.addEventListener('visibilitychange',hidden);return function(){clearInterval(timer);document.removeEventListener('visibilitychange',hidden);};
    },[playing,timed,run]);
    var seek=function(time,side){setPlaying(false);patch({time:time,timeSide:side||null});};
    var edit=function(values){if(selected)patch({components:d.components.map(function(p){return p.id===selected.component.id?Object.assign({},p,values):p;})},true);};
    var add=function(){if(d.components.length>=16)return;var type=Object.prototype.hasOwnProperty.call(CIRCUIT_NETWORK_TYPES,state.addType)?state.addType:'resistor',spec=CIRCUIT_NETWORK_TYPES[type],id=Math.max(0,...d.components.map(function(p){return p.id;}))+1,p={id:id,type:type,value:spec.value,control:['cccs','ccvs'].includes(type)?{source:(d.components.find(circuitNetworkVoltageOutput)||{}).id||0}:undefined,a:type==='current'?'0':type==='voltage'?'E':['vcvs','vccs','cccs','ccvs','opamp'].includes(type)?'B':type==='wire'||type==='switch'?'D':'A',b:type==='current'?'A':type==='wire'||type==='switch'?'E':'0',closed:true};patch({components:d.components.concat([p]),selected:id},true);};
    var messageState=React.useState(''),downloadMessage=messageState[0],setDownloadMessage=messageState[1];
    var download=function(waveform){var url;try{url=URL.createObjectURL(new Blob([waveform===true?circuitNetworkTransientCSV(d,run):circuitNetworkCSV(d,s)],{type:'text/csv;charset=utf-8'}));var a=document.createElement('a');a.href=url;a.download=waveform===true?'connected-circuit-time-response.csv':timed?'connected-circuit-snapshot.csv':'connected-circuit-dc.csv';a.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);setDownloadMessage(waveform===true?'Saved all calculated times, component settings, starting conditions, signed measurements, and integration metadata.':timed?'Saved the selected time snapshot and component settings. Blank readings are undetermined.':'Saved component connections, source polarity, and calculated DC measurements. Blank readings are undetermined.');}catch(e){if(url)URL.revokeObjectURL(url);setDownloadMessage('The measurements could not be saved. Resolve the circuit issue and try again.');}};
    var measurement=function(value,format){return value==null?'Undetermined':format(value);},nodeSelect=function(label,value,change){return h('label',null,label,h('select',{'aria-label':label,value:value,onChange:function(e){change(e.target.value);}},CIRCUIT_NETWORK_NODES.map(function(id){return h('option',{key:id,value:id},id==='0'?'0 · reference':id);})));};
    var example=CIRCUIT_NETWORK_EXAMPLES.find(function(p){return p.id===(state.exampleId||'bridge');})||CIRCUIT_NETWORK_EXAMPLES[0],loaded=CIRCUIT_NETWORK_EXAMPLES.find(function(p){return p.id===(state.loadedExample||'bridge');});
    return h('section',{'data-circuit-builder-root':'true',className:'circuit-active-root circuit-network-root','aria-label':'Connected circuit workbench'},
      h('header',{className:'circuit-active-hero'},h('span',{className:'circuit-eyebrow'},'CONNECTED NETWORKS · DC + TIME'),h('h2',null,'Build beyond branches.'),h('p',null,'Connect components through shared nodes. Explore bridges, rectifiers, amplifiers, feedback, and shared loads. Watch stored energy and switch events change the response over time.')),
      h('div',{className:'circuit-network-examples'},h('label',null,'Start an investigation',h('select',{'aria-label':'Connected circuit example',value:example.id,onChange:function(e){patch({exampleId:e.target.value});}},CIRCUIT_NETWORK_EXAMPLES.map(function(p){return h('option',{key:p.id,value:p.id},p.name);}))),h('button',{type:'button',onClick:function(){patch({components:example.components,loadedExample:example.id,scopeSource:example.scopeSource||0,analysis:example.duration?'time':'dc',duration:example.duration||.5,selected:example.selected||(example.duration?example.components[example.components.length-1].id:example.components[0].id),probeRed:example.duration?example.components[example.components.length-1].a:example.id==='bridge'?'B':'A',probeBlack:example.duration?example.components[example.components.length-1].b:example.id==='bridge'?'C':'0'},true);}},'Load network example'),h('button',{type:'button',disabled:!(state.undo||[]).length,onClick:function(){history('undo');}},'Undo network edit'),h('button',{type:'button',disabled:!(state.redo||[]).length,onClick:function(){history('redo');}},'Redo network edit')),
      h('div',{className:'circuit-network-mode',role:'group','aria-label':'Connected analysis mode'},h('button',{type:'button','aria-pressed':!timed,onClick:function(){patch({analysis:'dc'});}},'DC equilibrium'),h('button',{type:'button','aria-pressed':timed,onClick:function(){patch({analysis:'time'});}},'Time response'),h('span',null,timed?'Starting energy + signals + switch events → response':'DC levels only · capacitors open · inductors shorted')),
      h('div',{className:'circuit-network-status','data-ok':s.ok,role:'status','aria-live':playing?'off':'polite'},h('strong',null,!s.ok?'Check the connections':s.floating.length||s.ambiguous.length?'Some readings are undetermined':'Network solved'),h('p',null,!s.ok?s.message:timed?run.message:s.message)),
      timed&&h(CircuitNetworkScope,{React:React,run:run,selected:selected,solved:s,compare:state.scopeSource,playing:playing,patch:patch,seek:seek,toggle:function(){if(!playing&&s.time>=run.duration)patch({time:0,timeSide:null});setPlaying(!playing);},download:function(){download(true);}}),
      h('section',{className:'circuit-active-panel'},h('div',{className:'circuit-active-toolbar'},h('h3',null,'01 · Trace the network'),h('div',{role:'group','aria-label':'Connected circuit view'},h('button',{type:'button','aria-pressed':solid,onClick:function(){patch({view:'3d'});}},'3D network board'),h('button',{type:'button','aria-pressed':!solid,onClick:function(){patch({view:'flat'});}},'Flat network map'))),
        h('div',{className:'circuit-active-probe-placement',role:'group','aria-label':'Choose network probe'},h('span',null,'Choose a lead, then a node'),['red','black'].map(function(lead){return h('button',{type:'button',key:lead,'aria-pressed':(state.placeLead==='black'?'black':'red')===lead,onClick:function(){patch({placeLead:lead});}},'Place network '+lead+' probe');})),
        h('div',{className:'circuit-network-board-tools'},h('div',{role:'group','aria-label':'Connected board overlay'},h('button',{type:'button','aria-pressed':state.boardOverlay!=='voltage',onClick:function(){patch({boardOverlay:'current'});}},'Current paths'),h('button',{type:'button','aria-pressed':state.boardOverlay==='voltage',onClick:function(){patch({boardOverlay:'voltage'});}},'Node voltages')),h('p',{className:'circuit-help'},state.boardOverlay==='voltage'?'Purple = negative · blue = zero · green = positive. Scale '+circuitPreciseVoltageText(-voltageScale)+' to +'+circuitPreciseVoltageText(voltageScale)+(timed?' across the whole run.':' for this circuit.')+' Gray = unknown; arrows show current.':'Arrows show conventional current direction. Component shapes, cathode bands, and switch levers explain the connections.')),
        selected&&selected.component.control&&h('div',{className:'circuit-network-sense-note',role:'note','aria-label':'Selected control relationship'},h('strong',null,selected.label+' senses '+(selected.component.control.source!=null?((d.components.find(function(p){return p.id===selected.component.control.source;})||{}).id?'current through '+circuitNetworkLabel(d.components.find(function(p){return p.id===selected.component.control.source;})):'a missing source'):'V('+selected.component.control.positive+') − V('+selected.component.control.negative+')')),h('span',null,'Dashed purple links show sensing relationships, not current-carrying wires. Output terminals remain '+selected.component.a+' → '+selected.component.b+'.')),
        h(CircuitNetworkCameraControls,{React:React,solid:solid,camera:camera,change:function(value){patch({camera:value});},reset:function(){patch({camera:circuitNetworkCamera()});resetViewState[1](function(n){return n+1;});}}),
        h(CircuitNetworkDiagram,{React:React,solved:s,solid:solid,camera:camera,resetKey:resetViewKey,overlay:state.boardOverlay,voltageScale:voltageScale,selected:selected&&selected.component.id,probe:probe,lead:state.placeLead==='black'?'black':'red',select:function(id){patch({selected:id});},place:function(id){var v={};v[state.placeLead==='black'?'probeBlack':'probeRed']=id;patch(v);}}),
        h('p',{className:'circuit-help'},'Only named nodes connect. Wire crossings are not junctions. Select a component to highlight its route and edit it below. R and K mark the red and black probes. Scroll the board on a narrow screen.'),
        h('div',{className:'circuit-network-meter'},h('div',null,h('span',{className:'circuit-eyebrow'},'DIFFERENTIAL VOLTMETER'),h('output',{'aria-label':'Connected voltmeter reading','aria-live':playing?'off':'polite'},measurement(probe.voltage,circuitPreciseVoltageText)),h('span',null,probe.red+' minus '+probe.black+(timed?' · '+circuitTimeText(s.time||0):' · DC'))),h('div',{className:'circuit-network-node-selects'},nodeSelect('Network red probe',probe.red,function(id){patch({probeRed:id});}),nodeSelect('Network black probe',probe.black,function(id){patch({probeBlack:id});}),h('button',{type:'button',onClick:function(){patch({probeRed:probe.black,probeBlack:probe.red});}},'Reverse network probes')))),
      h('section',{className:'circuit-active-panel'},h('div',{className:'circuit-active-toolbar'},h('h3',null,'02 · Make the connections'),h('span',null,d.components.length+'/16 components · 8 named nodes')),
        h('div',{className:'circuit-network-add'},h('label',null,'Component to add',h('select',{'aria-label':'Network component to add',value:state.addType||'resistor',onChange:function(e){patch({addType:e.target.value});}},Object.keys(CIRCUIT_NETWORK_TYPES).map(function(type){return h('option',{key:type,value:type},CIRCUIT_NETWORK_TYPES[type].name);}))),h('button',{type:'button',disabled:d.components.length>=16,onClick:add},'Add network component')),
        h('div',{className:'circuit-network-editor'},h('div',{className:'circuit-network-part-list',role:'group','aria-label':'Network components'},s.rows.map(function(row){return h('button',{type:'button',key:row.component.id,'aria-label':'Edit '+row.label,'aria-pressed':!!selected&&selected.component.id===row.component.id,onClick:function(){patch({selected:row.component.id});}},h('strong',null,row.label+' · '+CIRCUIT_NETWORK_TYPES[row.component.type].name),h('span',null,row.component.a+' → '+row.component.b+' · '+circuitNetworkValue(row.component,row.closed)));}),!s.rows.length&&h('p',null,'Add a component or load an example to begin.')),
          selected&&h('div',{className:'circuit-network-inspector'},h('h4',null,selected.label+' · '+CIRCUIT_NETWORK_TYPES[selected.component.type].name),h('div',{className:'circuit-network-terminals'},nodeSelect(selected.component.opamp?'Output node A':'Terminal A'+(selected.component.type==='voltage'?' (+)':selected.component.type==='diode'?' (anode)':''),selected.component.a,function(id){edit({a:id});}),nodeSelect(selected.component.opamp?'Output reference B':'Terminal B'+(selected.component.type==='voltage'?' (−)':selected.component.type==='diode'?' (cathode)':''),selected.component.b,function(id){edit({b:id});})),
            ['resistor','voltage','current','capacitor','inductor'].includes(selected.component.type)&&h(CircuitActiveControl,{React:React,key:selected.component.id,field:'network-'+selected.component.id,logarithmic:['capacitor','inductor'].includes(selected.component.type),label:selected.component.waveform&&selected.component.waveform.shape!=='dc'?'DC level ('+(selected.component.type==='current'?'mA':'V')+')':selected.component.type==='resistor'?'Resistance (Ω)':selected.component.type==='voltage'?'Source voltage (V)':selected.component.type==='capacitor'?'Capacitance (µF)':selected.component.type==='inductor'?'Inductance (mH)':'Source current (mA)',value:selected.component.value*(selected.component.type==='current'?1000:1),min:CIRCUIT_NETWORK_TYPES[selected.component.type].min*(selected.component.type==='current'?1000:1),max:CIRCUIT_NETWORK_TYPES[selected.component.type].max*(selected.component.type==='current'?1000:1),step:selected.component.type==='resistor'?1:.1,onChange:function(value){edit({value:value/(selected.component.type==='current'?1000:1)});}}),
            selected.component.opamp&&h(CircuitNetworkOpAmpEditor,{key:selected.component.id,React:React,row:selected,edit:edit,measure:function(red,black){patch({probeRed:red,probeBlack:black});}}),
            selected.component.control&&!selected.component.opamp&&h(CircuitNetworkControlEditor,{React:React,row:selected,design:d,edit:edit}),
            selected.component.diode&&h(CircuitNetworkDiodeEditor,{React:React,row:selected,edit:edit}),
            selected.component.waveform&&h(CircuitNetworkSignalEditor,{React:React,component:selected.component,timed:timed,time:s.time||0,edit:edit,fit:function(duration){patch({analysis:'time',duration:duration,scopeSource:selected.component.id});}}),
            ['capacitor','inductor'].includes(selected.component.type)&&h(CircuitActiveControl,{React:React,key:'initial-'+selected.component.id,field:'network-initial-'+selected.component.id,label:selected.component.type==='capacitor'?'Starting voltage A − B (V)':'Starting current A → B (mA)',value:selected.component.initial*(selected.component.type==='inductor'?1000:1),min:selected.component.type==='capacitor'?-24:-100,max:selected.component.type==='capacitor'?24:100,step:.1,onChange:function(value){edit({initial:value/(selected.component.type==='inductor'?1000:1)});}}),
            selected.component.type==='switch'&&h(CircuitNetworkSwitchEditor,{React:React,component:selected.component,closed:s.ok?selected.closed:null,timed:timed,time:s.time||0,duration:circuitNetworkDuration(state),edit:edit,fit:function(duration){patch({analysis:'time',duration:duration});}}),
            h('p',{className:'circuit-help'},selected.component.type==='capacitor'?'Starting voltage applies only in Time response. Capacitor voltage cannot jump instantly. In DC equilibrium the capacitor is open.':selected.component.type==='inductor'?'Starting current applies only in Time response. Inductor current cannot jump instantly. In DC equilibrium the inductor is shorted.':selected.component.type==='voltage'?'Positive source voltage means A is above B. Source current is positive from A to B; a supplying source usually has negative absorbed power.':selected.component.type==='current'?'Positive current is forced from A to B. The rest of the circuit determines the voltage required.':selected.component.type==='wire'||selected.component.type==='switch'?'A wire or closed switch has zero voltage drop. An open switch carries no current.':'Voltage is A minus B. Positive current flows from A to B; negative current flows from B to A.'),
            h('dl',{className:'circuit-network-readings'},[['Voltage A − B',measurement(selected.voltage,circuitPreciseVoltageText)],['Current A → B',measurement(selected.current,circuitCurrentText)],['Power absorbed',measurement(selected.power,circuitPowerText)],['Stored energy',circuitNetworkEnergyText(selected.energy)]].map(function(m){return h('div',{key:m[0]},h('dt',null,m[0]),h('dd',null,m[1]));})),
            h('div',{className:'circuit-network-actions'},h('button',{type:'button',onClick:function(){edit({a:selected.component.b,b:selected.component.a});}},'Swap component terminals'),h('button',{type:'button',onClick:function(){patch({probeRed:selected.component.a,probeBlack:selected.component.b});}},'Measure selected component'),h('button',{type:'button',onClick:function(){patch({components:d.components.filter(function(p){return p.id!==selected.component.id;})},true);}},'Remove network component'))))),
      h('section',{className:'circuit-active-panel circuit-active-reason'},h('div',{className:'circuit-active-toolbar'},h('h3',null,'03 · Check the evidence'),h('button',{type:'button',disabled:!s.ok,onClick:download},'Export connected measurements CSV')),
        h('div',{className:'circuit-network-energy'},h('div',null,h('span',null,'POWER DELIVERED'),h('strong',null,measurement(s.delivered,circuitPowerText))),h('div',null,h('span',null,'POWER ABSORBED'),h('strong',null,measurement(s.absorbed,circuitPowerText)))),
        h('p',null,(timed?'Snapshot at '+circuitTimeText(s.time||0)+'. ':'')+'Positive power means a component absorbs energy. Negative power means it supplies energy. A source may absorb power when another source drives current into it. Capacitors and inductors can store energy and return it later; absorbed power is not always heat.'),
        h('details',null,h('summary',null,'Node voltages and current balance'),h('div',{className:'circuit-network-table-scroll',role:'region',tabIndex:0,'aria-label':'Node voltage and current balance table'},h('table',null,h('caption',null,'Currents leaving each node add to zero for a solved network.'),h('thead',null,h('tr',null,h('th',{scope:'col'},'Node'),h('th',{scope:'col'},'Voltage relative to 0'),h('th',{scope:'col'},'Net current leaving'))),h('tbody',null,s.nodes.filter(function(n){return n.used;}).map(function(n){var balance=s.balances.find(function(b){return b.id===n.id;});return h('tr',{key:n.id},h('th',{scope:'row'},n.id),h('td',null,measurement(n.voltage,circuitPreciseVoltageText)),h('td',null,measurement(balance.current,circuitCurrentText)));}))))),
        h('details',null,h('summary',null,'All component measurements'),h('div',{className:'circuit-network-table-scroll',role:'region',tabIndex:0,'aria-label':'Connected component measurements'},h('table',null,h('caption',null,'Signed readings follow each component’s A and B terminal order.'),h('thead',null,h('tr',null,['Part','A → B','Voltage','Current','Power'].map(function(label){return h('th',{key:label,scope:'col'},label);}))),h('tbody',null,s.rows.map(function(row){return h('tr',{key:row.component.id},h('th',{scope:'row'},row.label),h('td',null,row.component.a+' → '+row.component.b),h('td',null,measurement(row.voltage,circuitPreciseVoltageText)),h('td',null,measurement(row.current,circuitCurrentText)),h('td',null,measurement(row.power,circuitPowerText)));}))))),
        loaded&&h('p',{className:'circuit-network-question'},h('strong',null,'Starting example · '+loaded.name+': '),loaded.question),h('label',{className:'circuit-active-reflection'},'Explain using the readings',h('textarea',{'aria-label':'Connected circuit explanation',rows:3,maxLength:4000,value:state.reflection||'',placeholder:'Predict a change, test it, then explain the voltage and current evidence.',onChange:function(e){patch({reflection:e.target.value});}})),h('p',{role:'status',className:'circuit-help'},downloadMessage)),
      h('details',{className:'circuit-active-panel circuit-model-details'},h('summary',null,'Connected-network model and limits'),h('p',null,'This workspace solves arbitrary connections among up to 16 resistors, capacitors, inductors, diodes, independent and controlled voltage/current sources, wires, and switches on 8 named nodes. Node 0 is the voltage reference. The connection menus define the circuit; the projected board is a visual map, not an electrically modeled breadboard.'),h('p',null,'The solver enforces current conservation at every node and the voltage of each ideal source simultaneously. Floating circuits retain known internal voltage differences without inventing their voltage relative to 0. Redundant ideal paths may have known voltages but undetermined individual currents. Inconsistent constraints hide the calculated readings until you fix the connections.'),h('p',null,'Time response integrates capacitor voltage and inductor current with adaptive backward Euler step doubling. Relative local state tolerance is 0.002% of the largest state magnitude encountered, plus 0.1 µV for capacitor voltage or 0.1 nA for inductor current; this is not a bound on total accumulated error. Invalid starting constraints and calculations exceeding 4000 attempted steps show a diagnostic without a partial trace. Sine, triangle, and finite-edge pulse voltage/current sources are supported. DC equilibrium uses the configured DC level alone; it does not compute the average or RMS of a waveform. Voltage DC level and peak amplitude are each limited to 24 V in magnitude, and current level and amplitude to 100 mA, so their sum may exceed those individual settings. Frequency: 0.01 Hz–100 kHz; the calculation also limits the number of visible cycles. Each switch supports up to 8 scheduled actions from 1 µs to 60 s. Simultaneous actions across switches are applied together; capacitor voltage and inductor current carry through unchanged. An event with incompatible ideal constraints stops the run without a partial trace. Initial/DC switch settings remain separate from the state at the scope cursor. Generic silicon and Schottky diodes use bounded nonlinear iteration with exponential forward conduction and reverse leakage. Failed convergence hides the readings. Diode series resistance, breakdown, capacitance, recovery, and temperature variation are not modeled; include external series resistance. VCVS, VCCS, CCCS, and CCVS ideal controlled sources are supported. Voltage controls draw no input current; current controls sense a chosen voltage-output source branch. Gains are signed and output power is supplied by the ideal source. These four ideal source families do not model supply rails, saturation, bandwidth, or source limits. The separate finite-gain op-amp model clamps its output between configured limits relative to its output reference. Up to four op-amps are checked across their output regions; ambiguous operating points and inconsistent constraints stop the run. Op-amp input current, output impedance/current limit, physical supplies, common-mode restrictions, offset, bandwidth, slew rate, and saturation recovery are not modeled. General transistor and digital models remain future work. Mixed circuits retains its existing passive time/AC experiments, and Active electronics retains its NPN and sensor models. Resistance: 1 Ω–1 MΩ; source voltage: −24–24 V; source current: −100–100 mA. Capacitance: 0.001–1,000,000 µF; inductance: 0.001–1,000,000 mH. Extreme combinations may exceed numerical limits. No wire resistance, source limits, heating, or device damage is modeled.')));
  }

  // Fixed-topology NPN experiments: a resistive lamp and a loaded base drive.
  // Pedagogical piecewise DC model, not a particular transistor's SPICE model.
  function circuitActiveDesign(state) {
    var s=state||{},n=function(key,fallback,min,max){return circuitNumber(s[key]==null?fallback:s[key],fallback,min,max);};
    return {project:['manual','light','dark'].includes(s.project)?s.project:'manual',supply:n('supply',5,3,12),input:n('input',3.3,0,5),light:n('light',50,0,100),baseResistance:n('baseResistance',10000,1000,100000),loadResistance:n('loadResistance',220,100,2000),dividerResistance:n('dividerResistance',10000,1000,100000),beta:n('beta',100,20,300)};
  }
  function solveActiveCircuit(state) {
    var d=circuitActiveDesign(state),sensor=d.project!=='manual';
    var ldr=100000*Math.pow(100,-d.light/100),top=sensor?(d.project==='light'?ldr:d.dividerResistance):0,bottom=sensor?(d.project==='dark'?ldr:d.dividerResistance):0;
    var vth=sensor?d.supply*bottom/(top+bottom):d.input,rth=sensor?top*bottom/(top+bottom):0;
    var ib=Math.max(0,(vth-.7)/(rth+d.baseResistance)),vb=ib>0?.7:vth,drive=vth-ib*rth;
    var limit=(d.supply-.2)/d.loadResistance,ic=Math.min(d.beta*ib,limit),vc=d.supply-ic*d.loadResistance;
    var region=ib===0?'cutoff':d.beta*ib>=limit?'saturated':'active',it=sensor?(d.supply-drive)/top:0,ibottom=sensor?drive/bottom:0;
    var loadPower=ic*ic*d.loadResistance,basePower=ib*ib*d.baseResistance,transistorPower=vc*ic+vb*ib;
    var dividerPower=sensor?it*it*top+ibottom*ibottom*bottom:0;
    var supplyCurrent=ic+it,supplyPower=d.supply*supplyCurrent,inputPower=sensor?0:d.input*ib;
    return {design:d,sensor:sensor,ldr:ldr,topResistance:top,bottomResistance:bottom,theveninVoltage:vth,theveninResistance:rth,driveVoltage:drive,baseVoltage:vb,collectorVoltage:vc,baseCurrent:ib,collectorCurrent:ic,emitterCurrent:ib+ic,topCurrent:it,bottomCurrent:ibottom,loadLimit:limit,region:region,loadVoltage:d.supply-vc,loadPower:loadPower,basePower:basePower,transistorPower:transistorPower,dividerPower:dividerPower,supplyCurrent:supplyCurrent,supplyPower:supplyPower,inputPower:inputPower,totalPower:supplyPower+inputPower,lossPower:loadPower+basePower+transistorPower+dividerPower,brightness:loadPower/(d.supply*d.supply/d.loadResistance),nodes:{supply:d.supply,drive:drive,base:vb,collector:vc,emitter:0}};
  }
  function circuitActiveSweep(state) {
    var d=circuitActiveDesign(state),manual=d.project==='manual';
    return Array.from({length:201},function(_,i){var control=(manual?5:100)*i/200,s=solveActiveCircuit(Object.assign({},d,manual?{input:control}:{light:control}));return {control:control,baseCurrent:s.baseCurrent,collectorCurrent:s.collectorCurrent,collectorVoltage:s.collectorVoltage,driveVoltage:s.driveVoltage,region:s.region};});
  }
  // Locate continuous model boundaries independently of the 201 plotted samples.
  function circuitActiveRegions(state) {
    var d=circuitActiveDesign(state),sensor=d.project!=='manual',max=sensor?100:5,key=sensor?'light':'input';
    var at=function(value){var edit={};edit[key]=value;return solveActiveCircuit(Object.assign({},d,edit));};
    var low=at(0),high=at(max);
    var boundary=function(value){
      var a=0,b=max,fa=value(low),fb=value(high);
      if(fa===0)return a;if(fb===0)return b;if((fa<0)===(fb<0))return null;
      for(var i=0;i<64;i++){var m=(a+b)/2;if(m===a||m===b)break;var fm=value(at(m));if(fm===0)return m;if((fm<0)===(fa<0)){a=m;fa=fm;}else b=m;}
      return (a+b)/2;
    };
    var onset=boundary(function(s){return s.theveninVoltage-.7;}),saturation=boundary(function(s){return d.beta*s.baseCurrent-s.loadLimit;});
    var cuts=[0,max].concat(onset==null?[]:[onset],saturation==null?[]:[saturation]).sort(function(a,b){return a-b;}).filter(function(v,i,a){return !i||v!==a[i-1];});
    var bands=[];
    for(var i=0;i<cuts.length-1;i++){var start=cuts[i],end=cuts[i+1],sample=(start+end)/2;bands.push({region:at(sample).region,start:start,end:end,example:sample});}
    var regions=['cutoff','active','saturated'].map(function(id){var spans=bands.filter(function(b){return b.region===id;}),endpoints=[low,high].map(function(s,i){return s.region===id?i*max:null;}).filter(function(v){return v!=null;});
      var points=spans.reduce(function(a,b){return a.concat([b.start,b.end]);},endpoints),available=points.length>0;
      return {id:id,label:{cutoff:'Cutoff',active:'Active region',saturated:'Saturation'}[id],available:available,start:available?Math.min.apply(null,points):null,end:available?Math.max.apply(null,points):null,example:spans.length?spans[0].example:endpoints.length?endpoints[0]:null};
    });
    return {key:key,max:max,increasing:d.project!=='dark',onset:onset,saturation:saturation,bands:bands,regions:regions};
  }
  window.StemLab.circuitActiveRegions=circuitActiveRegions;

  // Preserve uniform CSV samples; plotted curves also include the exact knees.
  function circuitActivePlotSweep(state) {
    var d=circuitActiveDesign(state),map=circuitActiveRegions(d),rows=circuitActiveSweep(d);
    [map.onset,map.saturation].forEach(function(control){if(control==null||rows.some(function(r){return r.control===control;}))return;var values={};values[map.key]=control;var s=solveActiveCircuit(Object.assign({},d,values));rows.push({control:control,baseCurrent:s.baseCurrent,collectorCurrent:s.collectorCurrent,collectorVoltage:s.collectorVoltage,driveVoltage:s.driveVoltage,region:s.region});});
    return rows.sort(function(a,b){return a.control-b.control;});
  }
  window.StemLab.circuitActivePlotSweep=circuitActivePlotSweep;

  function CircuitActiveRegionGuide(props) {
    var h=props.React.createElement,s=props.solved,map=props.map,demand=s.design.beta*s.baseCurrent,scale=Math.max(demand,s.loadLimit);
    var format=function(v){return Number(v.toPrecision(6))+(s.sensor?' / 100':' V');};
    var span=function(r){if(r.start===r.end)return 'At '+format(r.start);var digits=2;while(digits<6&&Number(r.start.toFixed(digits))===Number(r.end.toFixed(digits)))digits++;if(Number(r.start.toFixed(digits))===Number(r.end.toFixed(digits)))return 'Near '+format(r.example);return '≈ '+Number(r.start.toFixed(digits))+'–'+Number(r.end.toFixed(digits))+(s.sensor?' / 100':' V');};
    var reasons={cutoff:'The base drive stays above 0.70 V throughout this input range.',active:'The circuit has no active-region interval in this input range.',saturated:'Even the strongest input keeps β × IB below the lamp-current limit. Try less base resistance, more gain, or a higher lamp resistance.'};
    var descriptions={cutoff:'No base current, so no lamp current.',active:'Base current sets lamp current: IC = β × IB.',saturated:'The supply and lamp resistance set the current limit.'};
    return h('section',{className:'circuit-active-regions','aria-label':'Operating region explorer'},
      h('div',{className:'circuit-region-heading'},h('div',null,h('span',{className:'circuit-eyebrow'},'READ THE SHAPE'),h('h4',null,'Explore the operating regions')),h('span',{className:'circuit-region-live',role:'status','data-region':s.region},'Now: '+map.regions.find(function(r){return r.id===s.region;}).label)),
      h('p',{className:'circuit-help'},'The shaded graph bands describe the live circuit. Choose a region to try an input inside it; the board, meter, and notebook all use that operating point.'),
      h('div',{className:'circuit-region-cards'},map.regions.map(function(r,index){return h('article',{key:r.id,className:'circuit-region-card','data-region':r.id,'data-current':s.region===r.id},
        h('div',{className:'circuit-region-card-title'},h('span',{'aria-hidden':true},String(index+1).padStart(2,'0')),h('h5',null,r.label)),
        h('strong',{className:'circuit-region-span'},r.available?span(r):'Outside this input range'),
        h('p',null,descriptions[r.id]),h('button',{type:'button',disabled:!r.available,'aria-describedby':!r.available?'circuit-region-unavailable-'+r.id:undefined,onClick:function(){props.explore(r.example);}},'Explore '+r.label.toLowerCase()),
        !r.available&&h('p',{id:'circuit-region-unavailable-'+r.id,className:'circuit-region-unavailable'},reasons[r.id]));})),
      h('div',{className:'circuit-region-balance'},h('h5',null,'What sets the lamp current?'),
        h('div',{className:'circuit-region-budget'},[['Base drive × gain · β × IB',demand,'drive'],['Lamp-current limit · (VCC − 0.20 V) / Rlamp',s.loadLimit,'limit']].map(function(row){return h('div',{key:row[2]},h('div',{className:'circuit-region-budget-label'},h('span',null,row[0]),h('strong',null,circuitCurrentText(row[1]))),h('div',{className:'circuit-region-budget-track','aria-hidden':true},h('span',{'data-budget':row[2],style:{width:(row[1]/scale*100)+'%'}})));})),
        h('p',null,'Lamp current is the smaller value: ',h('strong',null,circuitCurrentText(s.collectorCurrent)),'. '+(s.region==='saturated'?'More base drive increases base current, but the lamp current has reached its limit.':s.region==='cutoff'?'The base drive is at or below turn-on, so the lamp path carries no current.':'More base drive can raise lamp current until it reaches the load limit.'))),
      h('details',{className:'circuit-region-boundaries'},h('summary',null,'How are the transitions found?'),
        h('dl',null,h('div',null,h('dt',null,'Conduction boundary'),h('dd',null,map.onset==null?'Outside this input range':'≈ '+format(map.onset))),h('div',null,h('dt',null,'Saturation boundary'),h('dd',null,map.saturation==null?'Outside this input range':'≈ '+format(map.saturation)))),
        h('p',null,s.sensor?'Conduction starts when the unloaded divider voltage crosses 0.70 V. Saturation starts when β × IB reaches the lamp-current limit, using the loaded divider to calculate IB. '+(map.increasing?'More light increases base drive.':'Less light increases base drive; the region order therefore runs in reverse on the graph.'):'Conduction starts above 0.70 V. Saturation begins at input = 0.70 V + RB × (VCC − 0.20 V) / (β × Rlamp).'),
        h('p',{className:'circuit-help'},'Boundaries are calculated from the live circuit equations, independently of the plotted samples. Values are approximate and rounded; no base current flows exactly at turn-on; saturation begins when the two current limits are equal. These are idealized DC regions, not device guarantees or switching times. Changing a component recalculates the regions.')));
  }

  function circuitActiveCSV(state) {
    var d=circuitActiveDesign(state);
    return [(d.project==='manual'?'input_voltage_V':'relative_light_level')+',base_current_A,collector_current_A,collector_voltage_V,drive_voltage_V,region,project,supply_voltage_V,base_resistance_ohm,lamp_resistance_ohm,divider_resistance_ohm,beta,model_vbe_V,model_vce_sat_V,light_dark_resistance_ohm,light_bright_resistance_ohm'].concat(circuitActiveSweep(d).map(function(r){return [r.control,r.baseCurrent,r.collectorCurrent,r.collectorVoltage,r.driveVoltage,r.region,d.project,d.supply,d.baseResistance,d.loadResistance,d.project==='manual'?'':d.dividerResistance,d.beta,.7,.2,d.project==='manual'?'':100000,d.project==='manual'?'':1000].join(',');})).join('\n');
  }
  function circuitActiveProbe(s,red,black) {
    red=Object.prototype.hasOwnProperty.call(s.nodes,red)?red:'collector';black=Object.prototype.hasOwnProperty.call(s.nodes,black)?black:'emitter';
    return {red:red,black:black,voltage:s.nodes[red]-s.nodes[black]};
  }
  var CIRCUIT_ACTIVE_LESSONS=[
    {id:'gain',title:'Small input, larger current',question:'Raise the input from 1.0 V to 1.5 V. What happens to the lamp current?',before:{project:'manual',input:1},after:{input:1.5},answer:'more',reason:'In the active region, more base current gives more collector current: IC = β × IB. The supply provides the lamp energy.'},
    {id:'limit',title:'Find the limit',question:'Raise the input from 3.3 V to 5.0 V. What happens to the lamp current?',before:{project:'manual',input:3.3},after:{input:5},answer:'same',reason:'The transistor was already saturated. The supply and lamp resistance set the current limit; extra base drive adds base current but cannot raise the lamp current in this model.'},
    {id:'sensor',title:'Make a night light',question:'Lower the relative light level from 80 to 20. What happens to the lamp current?',before:{project:'dark',light:80},after:{light:20},answer:'more',reason:'In the dark sensor circuit, the photoresistor is below the divider junction. Less light raises its resistance, raising the junction voltage and base current.'}
  ];
  function circuitActiveLesson(id) {return CIRCUIT_ACTIVE_LESSONS.find(function(l){return l.id===id;})||CIRCUIT_ACTIVE_LESSONS[0];}
  window.StemLab.circuitActiveDesign=circuitActiveDesign;
  window.StemLab.solveActiveCircuit=solveActiveCircuit;
  window.StemLab.circuitActiveSweep=circuitActiveSweep;
  window.StemLab.circuitActiveCSV=circuitActiveCSV;
  window.StemLab.circuitActiveProbe=circuitActiveProbe;

  function circuitActiveResistanceText(value) {return value>=1000?Number((value/1000).toPrecision(5))+' kΩ':Number(value.toPrecision(5))+' Ω';}
  function circuitActiveComparison(reference,current) {
    if(!reference||reference.version!==1||!reference.design||typeof reference.design!=='object'||Array.isArray(reference.design))return null;
    var before=solveActiveCircuit(reference.design),after=solveActiveCircuit(current),a=before.design,b=after.design;
    var fields=[['project','Circuit'],['supply','Supply'],['baseResistance','Base resistance'],['loadResistance','Lamp resistance'],['beta','Transistor gain β']];
    if(!before.sensor&&!after.sensor)fields.push(['input','Input voltage']);
    if(before.sensor&&after.sensor)fields.push(['light','Relative light'],['dividerResistance','Divider resistance']);
    var format=function(key,value){if(key==='project')return {manual:'Manual control',light:'Light sensor',dark:'Dark sensor'}[value];if(key.includes('Resistance'))return value+' Ω';if(key==='input'||key==='supply')return value+' V';return String(value);};
    var changes=fields.filter(function(f){return a[f[0]]!==b[f[0]];}).map(function(f){return {key:f[0],label:f[1],before:a[f[0]],after:b[f[0]],text:f[1]+': '+format(f[0],a[f[0]])+' → '+format(f[0],b[f[0]])};});
    return {before:before,after:after,changes:changes,sameAxis:before.sensor===after.sensor,sameResponse:['project','supply','baseResistance','loadResistance','beta'].concat(before.sensor?['dividerResistance']:[]).every(function(key){return a[key]===b[key];}),controlled:changes.length===1,unchanged:changes.length===0,
      delta:{baseCurrent:after.baseCurrent-before.baseCurrent,collectorCurrent:after.collectorCurrent-before.collectorCurrent,collectorVoltage:after.collectorVoltage-before.collectorVoltage,loadPower:after.loadPower-before.loadPower}};
  }
  window.StemLab.circuitActiveComparison=circuitActiveComparison;

  function CircuitActiveControl(props) {
    var React=props.React,h=React.createElement,draftState=React.useState(String(props.value)),draft=draftState[0],setDraft=draftState[1];
    var errorState=React.useState(''),error=errorState[0],setError=errorState[1],logarithmic=!!props.logarithmic&&props.min>0,id='circuit-active-value-'+props.field;
    React.useEffect(function(){setDraft(String(props.value));setError('');},[props.value]);
    var commit=function(){var value=Number(draft);if(!draft.trim()||!Number.isFinite(value)||value<props.min||value>props.max){setError('Enter a number from '+props.min+' to '+props.max+'.');return;}setError('');setDraft(String(value));if(value!==props.value)props.onChange(value);};
    return h('div',{className:'circuit-active-range'},h('label',{htmlFor:id+'-slider'},props.label,h('strong',null,props.format?props.format(props.value):Number(props.value.toPrecision(6)))),
      h('div',{className:'circuit-active-value-row'},h('input',{id:id+'-slider',type:'range','aria-label':props.label,min:logarithmic?Math.log10(props.min):props.min,max:logarithmic?Math.log10(props.max):props.max,step:logarithmic?.01:props.step,value:logarithmic?Math.log10(props.value):props.value,'aria-valuetext':logarithmic?String(Number(props.value.toPrecision(6))):undefined,onChange:function(e){setError('');props.onChange(logarithmic?Math.min(props.max,Math.max(props.min,Number(Math.pow(10,Number(e.target.value)).toPrecision(6)))):Number(e.target.value));}}),
        h('input',{type:'number',className:'circuit-active-exact','aria-label':props.label+' exact value','aria-invalid':!!error,'aria-describedby':id+'-help'+(error?' '+id+'-error':''),min:props.min,max:props.max,step:'any',value:draft,onChange:function(e){setDraft(e.target.value);setError('');},onBlur:commit,onKeyDown:function(e){if(e.key==='Enter'){e.preventDefault();commit();}if(e.key==='Escape'){e.preventDefault();setDraft(String(props.value));setError('');}}})),
      h('p',{id:id+'-help',className:'circuit-active-input-help'},props.min+'–'+props.max+(logarithmic?' · Logarithmic slider':'')+' · Enter applies a typed value. Esc resets it.'),error&&h('p',{id:id+'-error',className:'circuit-active-input-error',role:'status'},error));
  }

  function CircuitActiveReference(props) {
    var h=props.React.createElement,c=props.comparison;
    var signed=function(value,format){return Math.abs(value)<1e-12?'No change':(value>0?'+':'')+format(value);};
    return h('section',{className:'circuit-active-reference','aria-label':'Reference circuit comparison'},
      h('div',{className:'circuit-active-toolbar'},h('div',null,h('h4',null,'Keep a reference. Test one change.')),h('button',{type:'button',onClick:props.capture},c?'Replace reference':'Keep current as reference')),
      !c?h('p',null,'Save this operating point, then change an input or component. Compare the readings and both response curves. Your reference stays fixed until you replace it.'):
      h(props.React.Fragment,null,
        h('div',{className:'circuit-active-reference-status','data-controlled':c.controlled},h('strong',null,c.unchanged?'Settings match your reference':c.controlled?'One circuit setting changed':c.changes.length+' circuit settings changed'),h('p',null,c.unchanged?'Choose a different input or component value to begin a comparison.':c.controlled?'Compare the measurements to isolate the effect of this change.':'Several settings changed together. Restore the reference and vary one setting to isolate its effect.')),
        !!c.changes.length&&h('ul',null,c.changes.map(function(change){return h('li',{key:change.key},change.text);})),
        h('div',{className:'circuit-active-reference-metrics'},[['Lamp current','collectorCurrent',circuitCurrentText],['Transistor voltage','collectorVoltage',circuitPreciseVoltageText],['Lamp power','loadPower',circuitPowerText]].map(function(m){return h('div',{key:m[1]},h('h5',null,m[0]),h('dl',null,h('div',null,h('dt',null,'Reference'),h('dd',null,m[2](c.before[m[1]]))),h('div',null,h('dt',null,'Live'),h('dd',null,m[2](c.after[m[1]])))),h('strong',null,signed(c.delta[m[1]],m[2])));})),
        h('p',{className:'circuit-help'},'Reference: '+c.before.region+' · Live: '+c.after.region+'.'+(c.sameAxis?' Both curves share the same current scale.'+(c.sameResponse?' The response curves overlap; their markers identify the saved operating points.':''):' The reference uses a different input axis, so its curve is hidden. Its readings remain available above.')),
        h('div',{className:'circuit-active-quick'},h('button',{type:'button',disabled:c.unchanged,onClick:props.restore},'Restore reference settings'),h('button',{type:'button',onClick:props.clear},'Clear reference'))));
  }

  function CircuitActiveDiagram(props) {
    var h=props.React.createElement,s=props.solved,d=s.design,solid=props.solid,probe=props.probe;
    var p=function(x,y,z){return solid?[450+(x-450)*.94-(y-245)*.24,250+(x-450)*.12+(y-245)*.67-(z||0)*.9]:[x,y];};
    var point=function(v){return p(v[0],v[1],v[2]);},pts=function(list){return list.map(point).map(function(v){return v.join(',');}).join(' ');};
    var parts=[],wires=[],labels=[];
    var text=function(x,y,z,content,color,size){var a=p(x,y,z);labels.push(h('text',{key:labels.length,x:a[0],y:a[1],fill:color||'#dcecf5',fontSize:size||14,fontWeight:600,textAnchor:'middle',paintOrder:'stroke',stroke:'#091c2b',strokeWidth:4,strokeLinejoin:'round'},content));};
    var line=function(list,color,width,flow){var a=pts(list);wires.push(h('g',{key:wires.length},solid&&h('polyline',{points:a,fill:'none',stroke:'#020b12',strokeWidth:(width||4)+5,opacity:.5,transform:'translate(0 3)'}),h('polyline',{points:a,fill:'none',stroke:color,strokeWidth:width||4,strokeLinejoin:'round',strokeLinecap:'round'}),flow&&h('polyline',{points:a,fill:'none',stroke:'#f0fdfb',strokeWidth:1.2,strokeDasharray:'3 10',opacity:.6})));};
    var rect=function(x,y,w,l,height,color){var a=[x-w/2,y-l/2,0],b=[x+w/2,y-l/2,0],c=[x+w/2,y+l/2,0],e=[x-w/2,y+l/2,0],up=function(v){return [v[0],v[1],height];};
      parts.push(h('g',{key:parts.length},solid&&h('polygon',{points:pts([b,c,up(c),up(b)]),fill:'#15232c',stroke:'#758d99'}),solid&&h('polygon',{points:pts([c,e,up(e),up(c)]),fill:'#243a46',stroke:'#758d99'}),h('polygon',{points:pts([up(a),up(b),up(c),up(e)]),fill:color,stroke:'#abc4ce',strokeWidth:1.5})));};
    var resistor=function(x,y,vertical,name,value,sensor){var w=vertical?32:76,l=vertical?66:30;
      if(sensor){var rim=Array.from({length:32},function(_,i){var t=i*Math.PI/16;return [x+25*Math.cos(t),y+25*Math.sin(t),solid?13:0];});
        parts.push(h('g',{key:parts.length},solid&&h('polygon',{points:pts(rim.map(function(v){return [v[0],v[1]+3,v[2]-8];})),fill:'#765244',stroke:'#ccb297'}),h('polygon',{points:pts(rim),fill:'#cdab80',stroke:'#ead4a8',strokeWidth:2})));
        line([[x,y-33,solid?13:0],[x,y-25,solid?13:0]],'#d5dfdf',3);line([[x,y+25,solid?13:0],[x,y+33,solid?13:0]],'#d5dfdf',3);
      }else rect(x,y,w,l,solid?13:0,'#cdbf96');
      var a=p(x,y,solid?14:0);parts.push(h('path',{key:parts.length,d:sensor?'M '+(a[0]-13)+' '+(a[1]-10)+' h 25 v 7 h -25 v 7 h 25 v 7 h -25':vertical?'M '+(a[0]-7)+' '+(a[1]-19)+' v 38 m 7 -38 v 38 m 7 -38 v 38':'M '+(a[0]-15)+' '+(a[1]-9)+' v 18 m 10 -18 v 18 m 10 -18 v 18',stroke:sensor?'#542a23':'#795b2a',strokeWidth:4,fill:'none'}));
      text(x+(vertical?-75:0),y+(vertical?0:-35),solid?18:0,name,'#efe3c3',13);text(x+(vertical?-75:0),y+(vertical?24:-15),solid?18:0,circuitActiveResistanceText(value),'#d6e9f2',12);
    };
    var arrow=function(x,y,z,dir,on,color){if(!on)return;var a=p(x,y,z);labels.push(h('text',{key:labels.length,x:a[0],y:a[1],fontSize:22,fontWeight:800,fill:color||'#b6efd9',textAnchor:'middle'},dir));};
    line([[700,65,0],[700,134,0],[700,134,solid?10:0]],'#8be0c1',4,s.collectorCurrent>0);
    line(solid?[[700,206,10],[700,206,0],[700,285,0],[570,285,0]]:[[700,206,0],[700,285,0],[620,285,0],[620,235,0],[570,235,0]],'#8be0c1',4,s.collectorCurrent>0);
    line([[570,335,0],[570,410,0],[125,410,0]],'#70b6eb',4,s.emitterCurrent>0);
    line([[200,230,0],[297,230,0],[297,230,solid?13:0]],'#f0c783',4,s.baseCurrent>0);
    line([[373,230,solid?13:0],[373,230,0],[430,230,0],[430,260,0],[480,260,0]],'#f0c783',4,s.baseCurrent>0);
    if(s.sensor){line([[700,65,0],[200,65,0],[200,117,0],[200,117,solid?13:0]],'#94a8bc',4);line([[200,183,solid?13:0],[200,183,0],[200,230,0],[200,292,0],[200,292,solid?13:0]],'#94a8bc',4);line([[200,358,solid?13:0],[200,358,0],[200,410,0]],'#94a8bc',4);resistor(200,150,true,d.project==='light'?'LDR':'R divider',s.topResistance,d.project==='light');resistor(200,325,true,d.project==='dark'?'LDR':'R divider',s.bottomResistance,d.project==='dark');}
    else {line([[125,230,0],[200,230,0]],'#f0c783',4,s.baseCurrent>0);line([[125,275,0],[125,410,0]],'#70b6eb',4,s.baseCurrent>0);rect(125,246,95,58,solid?18:0,'#203b53');text(125,245,solid?23:0,'VIN '+d.input.toFixed(2)+' V','#ffe1a5',13);}
    resistor(335,230,false,'RB',d.baseResistance,false);
    rect(700,170,65,72,solid?10:0,'#38454d');var bulb=p(700,170,solid?44:0),glow=Math.sqrt(s.brightness);
    parts.push(h('g',{key:'lamp'},h('circle',{cx:bulb[0],cy:bulb[1],r:47,fill:'url(#active-lamp-glow)',opacity:glow}),h('circle',{cx:bulb[0],cy:bulb[1],r:26,fill:'#243e51',stroke:'#eddfb4',strokeWidth:2}),h('circle',{cx:bulb[0],cy:bulb[1],r:25,fill:'url(#active-lamp-glass)',opacity:glow}),h('path',{d:'M '+(bulb[0]-13)+' '+(bulb[1]+7)+' l 5 -14 l 5 14 l 5 -14 l 5 14',fill:'none',stroke:glow>0?'#fff0b1':'#8096a9',strokeWidth:2.5,opacity:.5+glow*.5}),solid&&h('ellipse',{cx:bulb[0]-8,cy:bulb[1]-10,rx:5,ry:9,fill:'#fff',opacity:.4})));
    text(795,154,0,'LAMP','#ecdfa9',13);text(795,177,0,d.loadResistance+' Ω','#d6e9f2',13);text(795,200,0,circuitPowerText(s.loadPower),'#ecdfa9',12);
    if(solid){
      line([[480,260,0],[496,260,30],[516,260,40]],'#d0dbe4',5);line([[570,285,0],[563,285,30],[548,265,40]],'#d0dbe4',5);line([[570,335,0],[544,315,30],[536,280,40]],'#d0dbe4',5);
      rect(536,259,65,60,48,'#36424d');text(535,253,53,'Q1','#eff6fb',16);text(535,277,53,'NPN','#bdcedc',12);
    }else{
      parts.push(h('g',{key:'npn'},h('circle',{cx:536,cy:278,r:49,fill:'#10293c',stroke:'#adc6d7',strokeWidth:2}),h('path',{d:'M 480 260 H 512 V 304 M 512 268 L 570 235 M 512 291 L 570 335 M 554 316 L 570 335 L 548 328',fill:'none',stroke:'#d5e7f1',strokeWidth:3,strokeLinejoin:'round'})));text(604,205,0,'Q1 NPN','#ddeaf4',13);
    }
    if(!props.onPlace)text(466,287,0,'B','#f0d2a3',14);text(solid?577:581,solid?307:225,0,'C','#b4ecd3',14);text(587,350,0,'E','#b8d9f6',14);
    text(700,40,0,'VCC '+d.supply.toFixed(1)+' V','#b4ecd3',16);text(420,440,0,'COMMON RETURN · 0 V','#b8d9f6',13);
    arrow(700,260,0,'↓',s.collectorCurrent>0);arrow(412,220,0,'→',s.baseCurrent>0,'#f3d7a6');arrow(570,392,0,'↓',s.emitterCurrent>0,'#b8d9f6');
    text(698,337,0,'IC '+circuitCurrentText(s.collectorCurrent),'#b4ecd3',13);text(340,285,0,'IB '+circuitCurrentText(s.baseCurrent),'#f3d7a6',13);
    var positions={supply:[700,65],drive:[200,230],base:[480,260],collector:[700,285],emitter:[570,410]};
    var nodeNames={supply:'VCC · supply',drive:s.sensor?'D · divider junction':'VIN · input',base:'B · base',collector:'C · collector',emitter:'E · common return'},lead=props.lead==='black'?'black':'red';
    var dots=Object.keys(positions).map(function(key){var a=point(positions[key]),mark=(probe.red===key?'R':'')+(probe.black===key?'K':'');return h('g',{key:key},h('circle',{cx:a[0],cy:a[1],r:5,fill:'#dbeef8',stroke:'#082235',strokeWidth:2}),mark&&!props.onPlace&&h('g',null,h('circle',{cx:a[0]+13,cy:a[1]-14,r:13,fill:mark==='R'?'#7d2f47':'#273c55',stroke:mark==='R'?'#ffc0cf':'#d4e6f5',strokeWidth:2}),h('text',{x:a[0]+13,y:a[1]-10,textAnchor:'middle',fontSize:10,fill:'#fff',fontWeight:800},mark)));});
    return h('div',{className:'circuit-active-diagram-scroll',role:'region',tabIndex:0,'aria-label':'Scrollable active circuit diagram'},
      h('div',{className:'circuit-active-board-frame'},h('svg', {viewBox:'0 0 900 485',role: 'img','aria-label':(solid?'3D experiment board':'NPN schematic')+'. '+(s.sensor?(d.project==='light'?'Photoresistor above':'Photoresistor below')+' the loaded divider junction.':'Manual input through a base resistor.')+' Lamp connects from VCC to collector; emitter returns to zero volts. '+s.region+'. Base current '+circuitCurrentText(s.baseCurrent)+'; collector current '+circuitCurrentText(s.collectorCurrent)+'. Measurements and node connections follow below.'},
        h('defs',null,h('radialGradient',{id:'active-lamp-glow'},h('stop',{offset:'0%',stopColor:'#f7c66b',stopOpacity:.65}),h('stop',{offset:'100%',stopColor:'#f7c66b',stopOpacity:0})),h('radialGradient',{id:'active-lamp-glass',cx:'35%',cy:'25%'},h('stop',{offset:'0%',stopColor:'#fff5d9'}),h('stop',{offset:'50%',stopColor:'#b5985d'}),h('stop',{offset:'100%',stopColor:'#594d39'}))),
        h('rect',{width:900,height:485,rx:20,fill:'#091c2b'}),solid&&h('g',null,h('polygon',{points:pts([[70,40,-14],[830,40,-14],[830,453,-14],[70,453,-14]]),fill:'#132d3b',stroke:'#527286',strokeWidth:2}),h('polygon',{points:pts([[70,40,-8],[830,40,-8],[830,453,-8],[70,453,-8]]),fill:'#163b43',stroke:'#6d9295'}),Array.from({length:12},function(_,i){return h('polyline',{key:i,points:pts([[90+i*64,50,-7],[90+i*64,440,-7]]),fill:'none',stroke:'#547b7b',strokeWidth:.5,opacity:.35});})),wires,parts,dots,labels),props.onPlace&&h('div',{className:'circuit-active-node-layer',role:'group','aria-label':'Place selected probe on a circuit node'},Object.keys(positions).map(function(node){var a=point(positions[node]),mark=(probe.red===node?'R':'')+(probe.black===node?'K':'');return h('button',{key:node,type:'button',className:'circuit-active-node','data-lead':lead,'aria-label':'Place '+lead+' probe on '+nodeNames[node],'aria-pressed':probe[lead]===node,title:nodeNames[node]+' · '+circuitPreciseVoltageText(s.nodes[node]),style:{left:(a[0]/900*100)+'%',top:(a[1]/485*100)+'%'},onClick:function(){props.onPlace(node);}},node==='supply'?'+':node==='drive'?(s.sensor?'D':'IN'):node==='base'?'B':node==='collector'?'C':'E',mark&&h('small',{'aria-hidden':true},mark));}))));
  }

  // Portable investigations contain only validated circuit settings and authored evidence.
  function circuitActiveObservation(state,note) {
    var s=solveActiveCircuit(state),p=circuitActiveProbe(s,state.probeRed,state.probeBlack);
    return {design:circuitActiveDesign(state),probeRed:p.red,probeBlack:p.black,note:typeof note==='string'?note:''};
  }
  function circuitActiveInvestigation(state) {
    state=state||{};var s=solveActiveCircuit(state),p=circuitActiveProbe(s,state.probeRed,state.probeBlack),c=circuitActiveComparison(state.reference,state);
    var text=function(value){return typeof value==='string'?value:'';};
    var activity=null,lesson=state.challenge&&CIRCUIT_ACTIVE_LESSONS.find(function(l){return l.id===state.challenge.id;});
    if(lesson){var expected=circuitActiveDesign(Object.assign({},lesson.before,state.challenge.tested?lesson.after:{}));if(JSON.stringify(expected)===JSON.stringify(s.design))activity={id:lesson.id,choice:state.challenge.choice==null?null:state.challenge.choice,tested:!!state.challenge.tested};}
    return {format:'circuit-investigation-v1',model:'npn-piecewise-dc-v1',design:s.design,reference:c?{version:1,design:c.before.design}:null,probes:{red:p.red,black:p.black},view:state.view==='schematic'?'schematic':'3d',
      lessonId:activity?activity.id:CIRCUIT_ACTIVE_LESSONS.some(function(l){return l.id===state.lessonId;})?state.lessonId:'gain',activity:activity,
      notebook:{title:text(state.investigationTitle),question:text(state.investigationQuestion),prediction:text(state.investigationPrediction),explanation:text(state.reflection),
        observations:(Array.isArray(state.observations)?state.observations:[]).map(function(o){return circuitActiveObservation(Object.assign({},o.design,{probeRed:o.probeRed,probeBlack:o.probeBlack}),text(o.note));})}};
  }
  function parseCircuitInvestigation(text) {
    if(typeof text!=='string'||text.length>131072)throw Error('Choose an investigation JSON file smaller than 128 KB.');
    var doc;try{doc=JSON.parse(text);}catch(e){throw Error('This file is not valid JSON. Choose a saved investigation.');}
    var object=function(v){return !!v&&typeof v==='object'&&!Array.isArray(v);};
    if(!object(doc)||doc.format!=='circuit-investigation-v1')throw Error('Choose a file saved with Save investigation JSON in Active electronics.');
    if(doc.model!=='npn-piecewise-dc-v1')throw Error('This investigation uses a different simulation model.');
    var design=function(v,label){if(!object(v))throw Error(label+' settings are missing.');var clean=circuitActiveDesign(v);Object.keys(clean).forEach(function(key){if(key==='project'){if(v.project!==clean.project)throw Error(label+' has an unsupported circuit type.');}else if(typeof v[key]!=='number'||!Number.isFinite(v[key])||v[key]!==clean[key])throw Error(label+' has an invalid '+key+' setting.');});return clean;};
    var string=function(v,label,max){if(typeof v!=='string'||v.length>max)throw Error(label+' must be text with at most '+max+' characters.');return v;};
    var node=function(v){if(!['supply','drive','base','collector','emitter'].includes(v))throw Error('A probe points to an unknown circuit node.');return v;};
    var live=design(doc.design,'Live circuit'),reference=null;
    if(doc.reference!==null){if(!object(doc.reference)||doc.reference.version!==1)throw Error('The reference circuit is not supported.');reference={version:1,design:design(doc.reference.design,'Reference circuit')};}
    if(!object(doc.probes))throw Error('Probe positions are missing.');
    if(doc.view!=='3d'&&doc.view!=='schematic')throw Error('Choose a 3D or schematic investigation view.');
    if(!object(doc.notebook)||!Array.isArray(doc.notebook.observations)||doc.notebook.observations.length>8)throw Error('An investigation holds up to eight observations.');
    var book=doc.notebook,observations=book.observations.map(function(o,i){if(!object(o))throw Error('Observation '+(i+1)+' is invalid.');return {design:design(o.design,'Observation '+(i+1)),probeRed:node(o.probeRed),probeBlack:node(o.probeBlack),note:string(o.note,'Observation note',1000)};});
    if(!CIRCUIT_ACTIVE_LESSONS.some(function(l){return l.id===doc.lessonId;}))throw Error('The selected prediction activity is unknown.');
    var challenge=null;
    if(doc.activity!==null){var a=doc.activity,l=object(a)&&CIRCUIT_ACTIVE_LESSONS.find(function(x){return x.id===a.id;});if(!l||l.id!==doc.lessonId||typeof a.tested!=='boolean'||![null,'more','same','less'].includes(a.choice)||(a.tested&&a.choice===null))throw Error('The prediction activity is invalid.');
      if(JSON.stringify(circuitActiveDesign(Object.assign({},l.before,a.tested?l.after:{})))!==JSON.stringify(live))throw Error('The prediction activity does not match the saved circuit.');challenge={id:a.id,choice:a.choice,tested:a.tested};}
    return Object.assign({},live,{reference:reference,probeRed:node(doc.probes.red),probeBlack:node(doc.probes.black),view:doc.view,lessonId:doc.lessonId,challenge:challenge,
      investigationTitle:string(book.title,'Investigation title',120),investigationQuestion:string(book.question,'Investigation question',1000),investigationPrediction:string(book.prediction,'Investigation prediction',1000),reflection:string(book.explanation,'Explanation',4000),observations:observations});
  }
  function circuitActiveReport(state) {
    var doc=circuitActiveInvestigation(state),clean=parseCircuitInvestigation(JSON.stringify(doc)),s=solveActiveCircuit(clean),comparison=circuitActiveComparison(clean.reference,clean),book=doc.notebook;
    var esc=function(value){return String(value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
    var project=function(d){return {manual:'Manual control',light:'Light sensor',dark:'Dark sensor'}[d.project];};
    var v=circuitPreciseVoltageText,i=circuitCurrentText,p=circuitPowerText;
    var textBlock=function(label,text){return '<section class="writing"><h2>'+label+'</h2><p class="preserve">'+esc(text||'Not yet recorded.')+'</p></section>';};
    var settings=function(d){return '<dl class="settings">'+[['Circuit',project(d)],['Supply',d.supply+' V'],[d.project==='manual'?'Input':'Relative light',d.project==='manual'?d.input+' V':d.light+' / 100'],['Base resistance',d.baseResistance+' Ω'],['Lamp resistance',d.loadResistance+' Ω'],['Gain β',d.beta]].concat(d.project==='manual'?[]:[['Divider resistance',d.dividerResistance+' Ω']]).map(function(row){return '<div><dt>'+esc(row[0])+'</dt><dd>'+esc(row[1])+'</dd></div>';}).join('')+'</dl>';};
    var reading=function(solved,red,black){var probe=circuitActiveProbe(solved,red,black);return '<div class="readings">'+[['Base current',i(solved.baseCurrent)],['Lamp current',i(solved.collectorCurrent)],['Transistor voltage',v(solved.collectorVoltage)],['Lamp power',p(solved.loadPower)],['Probe · '+probe.red+' − '+probe.black,v(probe.voltage)]].map(function(row){return '<div><span>'+esc(row[0])+'</span><strong>'+esc(row[1])+'</strong></div>';}).join('')+'</div>';};
    var sameAxis=comparison&&comparison.sameAxis,limit=Math.max(s.loadLimit,sameAxis?comparison.before.loadLimit:0)*1.15,max=s.sensor?100:5;
    var x=function(n){return 58+n/max*664;},y=function(n){return 210-n/limit*150;};
    var line=function(d){return circuitActivePlotSweep(d).map(function(r,j){return (j?'L':'M')+x(r.control).toFixed(2)+' '+y(r.collectorCurrent).toFixed(2);}).join(' ');};
    var graph='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 780 275" role="img" aria-label="Calculated lamp-current response. Solid teal is the live circuit.'+(sameAxis?' Dashed purple is the reference circuit.':'')+' Exact operating-point readings accompany this graph."><rect width="780" height="275" fill="#fff"/>';
    [0,.25,.5,.75,1].forEach(function(f){graph+='<path d="M 58 '+y(limit*f)+' H 722" stroke="#d4dfe5"/><text x="49" y="'+(y(limit*f)+4)+'" text-anchor="end" font-size="11" fill="#354b59">'+(limit*f*1000).toFixed(1)+'</text><text x="'+x(max*f)+'" y="233" text-anchor="middle" font-size="11" fill="#354b59">'+(max*f).toFixed(s.sensor?0:2)+'</text>';});
    graph+='<text x="58" y="25" font-size="14" fill="#214c52">Lamp current (mA)</text><text x="390" y="259" text-anchor="middle" font-size="13" fill="#354b59">'+(s.sensor?'Relative light level · dark → bright':'Input voltage (V)')+'</text><path d="M 58 '+y(s.loadLimit)+' H 722" stroke="#97651e" stroke-dasharray="6 5" fill="none"/>';
    if(sameAxis){var r=comparison.before,rc=r.sensor?r.design.light:r.design.input;graph+='<path d="'+line(r.design)+'" fill="none" stroke="#81569e" stroke-width="2.5" stroke-dasharray="7 5"/><rect x="'+(x(rc)-5)+'" y="'+(y(r.collectorCurrent)-5)+'" width="10" height="10" transform="rotate(45 '+x(rc)+' '+y(r.collectorCurrent)+')" fill="#fff" stroke="#81569e" stroke-width="2"/>';}
    graph+='<path d="'+line(s.design)+'" fill="none" stroke="#19716b" stroke-width="3"/><circle cx="'+x(s.sensor?s.design.light:s.design.input)+'" cy="'+y(s.collectorCurrent)+'" r="5" fill="#19716b" stroke="#fff" stroke-width="1.5"/></svg>';
    var content='<header><p class="eyebrow">CIRCUIT BENCH · INVESTIGATION</p><h1>'+esc(book.title||'Circuit investigation')+'</h1><p>Active electronics · '+esc(project(s.design))+' · '+esc(s.region)+'</p></header>'+textBlock('Question',book.question)+textBlock('Prediction',book.prediction)+'<section><h2>Live operating point</h2>'+reading(s,clean.probeRed,clean.probeBlack)+settings(s.design)+'</section>';
    if(comparison){content+='<section class="comparison-report"><h2>Reference comparison</h2><p>'+esc(comparison.unchanged?'Circuit settings match.':comparison.controlled?'One circuit setting changed.':comparison.changes.length+' circuit settings changed together.')+'</p><ul>'+comparison.changes.map(function(c){return '<li>'+esc(c.text)+'</li>';}).join('')+'</ul><table><caption>Calculated measurements at the saved reference and live operating points</caption><thead><tr><th scope="col">Measurement</th><th scope="col">Reference</th><th scope="col">Live</th><th scope="col">Live − reference</th></tr></thead><tbody>'+[['Base current','baseCurrent',i],['Lamp current','collectorCurrent',i],['Transistor voltage','collectorVoltage',v],['Lamp power','loadPower',p]].map(function(row){var delta=comparison.delta[row[1]];return '<tr><th scope="row">'+row[0]+'</th><td>'+esc(row[2](comparison.before[row[1]]))+'</td><td>'+esc(row[2](s[row[1]]))+'</td><td>'+esc(Math.abs(delta)<1e-12?'No change':(delta>0?'+':'')+row[2](delta))+'</td></tr>';}).join('')+'</tbody></table><h3>Reference settings</h3>'+settings(comparison.before.design)+(sameAxis?'':'<p>The reference uses a different input axis, so its curve is omitted. The numeric comparison remains available.</p>')+'</section>';}
    content+='<section class="chart"><h2>Response to the input</h2>'+graph+'<p class="caption">Solid teal / circle: live circuit.'+(sameAxis?' Dashed purple / diamond: reference.':'')+' Brown dashed line: live saturation limit.'+(sameAxis&&comparison.sameResponse?' The response curves overlap; their markers identify the saved operating points.':'')+' Every curve uses settled DC solutions; this is an input sweep, not a time trace.</p></section><section><h2>Recorded observations · '+book.observations.length+'</h2>';
    content+=book.observations.length?book.observations.map(function(o,index){var solved=solveActiveCircuit(o.design);return '<article class="observation"><h3>Observation '+(index+1)+' · '+esc(project(o.design))+'</h3><p>'+esc(solved.region)+'</p>'+reading(solved,o.probeRed,o.probeBlack)+settings(o.design)+'<p class="preserve note">'+esc(o.note||'No observation note recorded.')+'</p></article>';}).join(''):'<p>No operating points have been recorded yet.</p>';
    content+='</section>'+textBlock('Explanation using evidence',book.explanation);
    if(doc.activity){var activity=doc.activity,lesson=circuitActiveLesson(activity.id);content+='<section><h2>Guided prediction activity</h2><p>'+esc(lesson.question)+'</p><p>Prediction: '+esc(activity.choice?{more:'Increases',same:'Stays the same',less:'Decreases'}[activity.choice]:'Not selected')+'. '+(activity.tested?(activity.choice===lesson.answer?'Matches the model.':'The model gives a different result.'):'Not yet tested.')+'</p>'+(activity.tested?'<p>'+esc(lesson.reason)+'</p>':'')+'</section>';}
    content+='<footer><h2>Model and limits</h2><p>Generic, fixed-wiring NPN DC model: VBE = 0.70 V when conducting; VCE saturation = 0.20 V; constant adjustable gain. The lamp has fixed resistance. IB = max(0, (Vth − 0.70)/(Rth + RB)); IC = min(β × IB, (VCC − 0.20)/Rlamp). Sensor dividers include base loading. Relative light maps to 100 kΩ × 100^(−level/100), from 100 kΩ to 1 kΩ; it is not a lux calibration. Temperature, switching transients, leakage, and breakdown are excluded. Displayed measurements are rounded; saved investigation JSON retains the circuit settings.</p><p>Model: npn-piecewise-dc-v1. Recorded readings are recalculated from each saved design, not inferred from the current circuit.</p><p class="screen-only">Use your browser’s Print command to print or save a PDF.</p></footer>';
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; style-src &#39;unsafe-inline&#39;"><title>'+esc(book.title||'Circuit investigation')+'</title><style>body{margin:0;background:#edf2f3;color:#243d4b;font:14px/1.6 system-ui,sans-serif}main{max-width:850px;margin:25px auto;padding:38px;background:white;border:1px solid #d2dfe2;border-radius:16px;box-sizing:border-box}header{border-bottom:3px solid #28746e;padding-bottom:18px;margin-bottom:24px}.eyebrow{font-size:11px;letter-spacing:.13em;font-weight:750;color:#346963}h1{font-size:31px;line-height:1.25;margin:10px 0;color:#183b43;overflow-wrap:anywhere}h2{font-size:19px;color:#214e53;margin:8px 0 14px}h3{font-size:15px;margin:15px 0 7px}p{margin:8px 0}.preserve{white-space:pre-wrap;overflow-wrap:anywhere}section{margin:23px 0}.writing{border-left:3px solid #a9c8c0;background:#f3f7f6;padding:12px 17px}.readings{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.readings>div{background:#f1f6f6;border:1px solid #bfd3d1;border-radius:9px;padding:9px 11px}.readings span{display:block;font-size:11px}.readings strong{display:block;color:#175e5d;font:650 17px/1.8 ui-monospace,monospace}.settings{display:grid;grid-template-columns:1fr 1fr;gap:7px 24px;margin:17px 0}.settings>div{display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid #e1e9eb;font-size:12px}.settings dt{color:#3e5967}.settings dd{margin:0;font-weight:650;text-align:right;overflow-wrap:anywhere}table{width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed}caption{text-align:left;font-size:11px;margin:8px 0;color:#48606b}th,td{text-align:left;padding:10px 7px;border-bottom:1px solid #cedee0;overflow-wrap:anywhere}thead{background:#eaf2f1}svg{display:block;width:100%;height:auto;font-family:system-ui,sans-serif}.caption{font-size:11px;color:#435d68}.chart{border:1px solid #c5d7da;border-radius:12px;padding:16px}.observation{border:1px solid #c5d7da;border-radius:10px;padding:15px;margin:14px 0}.note{padding-top:9px;border-top:1px solid #d9e4e7}footer{font-size:11px;border-top:2px solid #a9c6c3;padding-top:18px;margin-top:30px}footer h2{font-size:15px}@media(max-width:600px){main{margin:0;border:0;border-radius:0;padding:20px}.readings{grid-template-columns:1fr 1fr}.readings strong{font-size:14px}.settings{grid-template-columns:1fr}th,td{padding:7px 4px;font-size:11px}}@media print{@page{margin:16mm}body{background:white}main{margin:0;padding:0;max-width:none;border:0;border-radius:0}.screen-only{display:none}body{font-size:13px}section{margin:18px 0}.readings{grid-template-columns:repeat(5,minmax(0,1fr));gap:7px}.readings>div{padding:8px}.readings strong{font-size:14px}.settings{gap:4px 20px;margin:12px 0}.writing{padding:10px 14px}.observation{padding:12px;margin:12px 0}.comparison-report,.chart,.observation,.writing,.readings,table,.settings{break-inside:avoid}h2,h3{break-after:avoid}thead{display:table-header-group}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head><body><main>'+content+'</main></body></html>';
  }
  window.StemLab.circuitActiveObservation=circuitActiveObservation;
  window.StemLab.circuitActiveInvestigation=circuitActiveInvestigation;
  window.StemLab.parseCircuitInvestigation=parseCircuitInvestigation;
  window.StemLab.circuitActiveReport=circuitActiveReport;

  function CircuitActiveInvestigationTools(props) {
    var React=props.React,h=React.createElement,state=props.state,observations=Array.isArray(state.observations)?state.observations:[];
    var pending=React.useState(null),candidate=pending[0],setCandidate=pending[1],feedback=React.useState(''),message=feedback[0],setMessage=feedback[1];
    var fail=React.useState(false),error=fail[0],setError=fail[1],reading=React.useState(false),busy=reading[0],setBusy=reading[1],generation=React.useRef(0),input=React.useRef(null);
    React.useEffect(function(){return function(){generation.current++;};},[]);
    var save=function(report){var url;try{var doc=circuitActiveInvestigation(state);parseCircuitInvestigation(JSON.stringify(doc));var content=report?circuitActiveReport(state):JSON.stringify(doc,null,2);url=URL.createObjectURL(new Blob([content],{type:report?'text/html;charset=utf-8':'application/json'}));var a=document.createElement('a');a.href=url;a.download=report?'circuit-investigation-report.html':'circuit-investigation.json';document.body.appendChild(a);a.click();a.remove();setError(false);setMessage(report?'Report downloaded. Open it in a browser to print or save as PDF.':'Investigation saved with its settings, reference, probe positions, observations, and explanation.');setTimeout(function(){URL.revokeObjectURL(url);},1000);}catch(err){if(url)URL.revokeObjectURL(url);setError(true);setMessage(err.message||'The investigation could not be saved.');}};
    var readFile=function(e){var file=e.target.files&&e.target.files[0],request=++generation.current;setCandidate(null);setMessage('');setError(false);if(!file){setBusy(false);return;}if(file.size>131072){setBusy(false);setError(true);setMessage('Choose an investigation JSON file smaller than 128 KB.');return;}setBusy(true);
      file.text().then(function(text){if(generation.current!==request)return;try{setCandidate(parseCircuitInvestigation(text));setMessage('Preview ready. Review the investigation before loading it.');}catch(err){setError(true);setMessage(err.message);}}).catch(function(){if(generation.current===request){setError(true);setMessage('The investigation could not be read. Choose it again.');}}).finally(function(){if(generation.current===request)setBusy(false);});};
    var field=function(label,key,max,rows,placeholder){var attributes={'aria-label':label,value:state[key]||'',maxLength:max,onChange:function(e){var update={};update[key]=e.target.value;props.patch(update);},placeholder:placeholder};return h('label',{className:'circuit-notebook-field'},label,rows?h('textarea',Object.assign({rows:rows},attributes)):h('input',Object.assign({type:'text'},attributes)));};
    return h('details',{id:'circuit-active-notebook',className:'circuit-active-notebook',open:!!state.notebookOpen,onToggle:function(e){if(e.target===e.currentTarget&&e.currentTarget.open!==!!state.notebookOpen)props.patch({notebookOpen:e.currentTarget.open});}},
      h('summary',null,h('span',null,'Investigation notebook'),h('small',null,observations.length+'/8 observations')),
      h('div',{className:'circuit-notebook-content'},h('p',{className:'circuit-help'},'Ask a question, keep readings as evidence, and explain what you found. Recorded points stay fixed as the live circuit changes.'),
        field('Investigation title','investigationTitle',120,0,'How does the base resistor change the lamp?'),
        h('div',{className:'circuit-notebook-prompts'},field('My investigation question','investigationQuestion',1000,3,'What will you change, measure, and keep the same?'),field('My prediction','investigationPrediction',1000,3,'I predict… because…')),
        h('div',{className:'circuit-notebook-record-actions'},h('button',{type:'button',disabled:observations.length>=8,onClick:props.record},'Record current readings'),state.removedObservation&&h('button',{type:'button',disabled:observations.length>=8,onClick:props.undoRemove},'Undo removed observation'),h('span',null,observations.length>=8?'Notebook full. Remove an observation to record another.':'Keep up to eight operating points.')),
        !observations.length&&h('div',{className:'circuit-notebook-empty'},h('strong',null,'Your evidence starts with one reading.'),h('p',null,'Set the input and place the probes, then record the operating point. You can return to its settings or use it as a reference.')),
        h('div',{className:'circuit-notebook-observations'},observations.map(function(o,index){var s=solveActiveCircuit(o.design),probe=circuitActiveProbe(s,o.probeRed,o.probeBlack);return h('details',{key:index,className:'circuit-notebook-observation'},
          h('summary',null,h('span',null,h('b',null,String(index+1).padStart(2,'0')),' '+({manual:'Manual control',light:'Light sensor',dark:'Dark sensor'})[s.design.project]),h('strong',null,circuitCurrentText(s.collectorCurrent))),
          h('div',{className:'circuit-notebook-observation-body'},h('p',{className:'circuit-help'},s.region+' · '+(s.sensor?'Relative light '+s.design.light+'/100':'Input '+s.design.input+' V')+' · Supply '+s.design.supply+' V · RB '+circuitActiveResistanceText(s.design.baseResistance)+' · Lamp '+circuitActiveResistanceText(s.design.loadResistance)+' · β '+s.design.beta+(s.sensor?' · Divider '+circuitActiveResistanceText(s.design.dividerResistance):'')),
            h('div',{className:'circuit-notebook-readings'},[['IB',circuitCurrentText(s.baseCurrent)],['IC',circuitCurrentText(s.collectorCurrent)],['VCE',circuitPreciseVoltageText(s.collectorVoltage)],['Probe',circuitPreciseVoltageText(probe.voltage)]].map(function(pair){return h('div',{key:pair[0]},h('span',null,pair[0]),h('strong',null,pair[1]));})),
            h('p',{className:'circuit-help'},'Probe: '+probe.red+' − '+probe.black+'. These readings belong to this recorded circuit.'),
            h('label',{className:'circuit-notebook-field'},'What I noticed',h('textarea',{'aria-label':'Observation '+(index+1)+' note',rows:2,maxLength:1000,value:o.note||'',onChange:function(e){props.note(index,e.target.value);},placeholder:'Describe the reading and what changed.'})),
            h('div',{className:'circuit-notebook-record-actions'},h('button',{type:'button',onClick:function(){props.revisit(index);}},'Revisit observation '+(index+1)),h('button',{type:'button',onClick:function(){props.reference(index);}},'Use observation '+(index+1)+' as reference'),h('button',{type:'button',onClick:function(){props.remove(index);}},'Remove observation '+(index+1)))));
        })),
        field('My evidence-based explanation','reflection',4000,3,'Use your recorded readings to support or revise your prediction.'),
        h('section',{className:'circuit-notebook-files','aria-label':'Investigation files'},h('h3',null,'Keep or share your investigation'),h('p',{className:'circuit-help'},'JSON reopens the investigation in this lab. The report is a self-contained HTML page with settings, comparison curves, recorded measurements, and notes; open it in a browser to print.'),
          h('div',{className:'circuit-notebook-record-actions'},h('button',{type:'button',onClick:function(){save(false);}},'Save investigation JSON'),h('button',{type:'button',onClick:function(){save(true);}},'Download investigation report')),
          h('label',{className:'circuit-notebook-file-label'},'Open investigation file',h('input',{type:'file','aria-label':'Open investigation file',accept:'.json,application/json',ref:input,onChange:readFile})),
          h('p',{role:error?'alert':'status',className:error?'circuit-file-error':'circuit-help'},busy?'Reading investigation…':message),
          candidate&&h('div',{className:'circuit-notebook-preview'},h('span',{className:'circuit-eyebrow'},'REVIEW BEFORE LOADING'),h('h4',null,candidate.investigationTitle||'Untitled investigation'),h('p',null,({manual:'Manual control',light:'Light sensor',dark:'Dark sensor'})[candidate.project]+' · '+candidate.supply+' V supply · '+candidate.observations.length+' observations · '+(candidate.reference?'Reference included':'No reference')),h('p',{className:'circuit-help'},'Replaces the active circuit, reference, and notebook. Restore previous investigation will recover the investigation you have open now.'),h('div',{className:'circuit-notebook-record-actions'},h('button',{type:'button',onClick:function(){props.load(candidate);setCandidate(null);setError(false);setMessage('Investigation loaded. The previous investigation is available below.');if(input.current)input.current.value='';}},'Load investigation'),h('button',{type:'button',onClick:function(){generation.current++;setCandidate(null);setError(false);setMessage('Preview dismissed. Your investigation is unchanged.');if(input.current)input.current.value='';}},'Dismiss investigation preview'))),
          state.previousInvestigation&&h('button',{type:'button',onClick:function(){props.restore();setError(false);setMessage('Previous investigation restored.');}},'Restore previous investigation'))));
  }

  function CircuitActiveWorkbench(props) {
    var ctx=props.ctx,React=ctx.React,h=React.createElement,state=(ctx.toolData||{})._circuitActive||{},d=circuitActiveDesign(state),s=solveActiveCircuit(d);
    var patch=function(values,electrical){ctx.setToolData(function(prev){var old=prev._circuitActive||{},next=Object.assign({},old,values);
      if(electrical&&JSON.stringify(circuitActiveDesign(old))!==JSON.stringify(circuitActiveDesign(next))){next.undo=(old.undo||[]).slice(-29).concat([circuitActiveDesign(old)]);next.redo=[];next.challenge=null;}
      return Object.assign({},prev,{_circuitActive:next});});};
    var history=function(key){ctx.setToolData(function(prev){var old=prev._circuitActive||{},list=old[key]||[];if(!list.length)return prev;var next=Object.assign({},old,circuitActiveDesign(list[list.length-1]),{challenge:null});next[key]=list.slice(0,-1);next[key==='undo'?'redo':'undo']=(old[key==='undo'?'redo':'undo']||[]).slice(-29).concat([circuitActiveDesign(old)]);return Object.assign({},prev,{_circuitActive:next});});};
    var observations=Array.isArray(state.observations)?state.observations:[];
    var changeNotebook=function(fn){ctx.setToolData(function(prev){var old=prev._circuitActive||{},values=fn(old);return Object.assign({},prev,{_circuitActive:Object.assign({},old,values)});});};
    var record=function(){changeNotebook(function(old){var list=old.observations||[];return list.length>=8?{investigationNotice:'The notebook is full. Remove an observation before recording another.'}:{observations:list.concat([circuitActiveObservation(old,'')]),investigationNotice:'Recorded observation '+(list.length+1)+'. Open the notebook to add a note.'};});};
    var loadInvestigation=function(candidate){ctx.setToolData(function(prev){var previous=Object.assign({},prev._circuitActive||{});delete previous.previousInvestigation;return Object.assign({},prev,{_circuitActive:Object.assign({},candidate,{undo:[],redo:[],previousInvestigation:previous,notebookOpen:true})});});};
    var restoreInvestigation=function(){ctx.setToolData(function(prev){var old=prev._circuitActive||{};return old.previousInvestigation?Object.assign({},prev,{_circuitActive:Object.assign({},old.previousInvestigation,{notebookOpen:true})}):prev;});};
    var openNotebook=function(){patch({notebookOpen:true});requestAnimationFrame(function(){var el=document.getElementById('circuit-active-notebook');if(el){el.scrollIntoView({block:'start'});el.querySelector('summary').focus();}});};
    var probe=circuitActiveProbe(s,state.probeRed,state.probeBlack),solid=state.view!=='schematic';
    var comparison=circuitActiveComparison(state.reference,d),sameAxis=!!comparison&&comparison.sameAxis;
    var referenceSweep=React.useMemo(function(){return state.reference&&state.reference.version===1&&state.reference.design?circuitActivePlotSweep(state.reference.design):[];},[state.reference]);
    var reference=referenceSweep.length&&comparison?comparison.before:null,referenceControl=reference?(reference.sensor?reference.design.light:reference.design.input):0;
    var sweep=React.useMemo(function(){return circuitActivePlotSweep(d);},[d.project,d.supply,d.baseResistance,d.loadResistance,d.dividerResistance,d.beta]);
    var regionMap=React.useMemo(function(){return circuitActiveRegions(d);},[d.project,d.supply,d.baseResistance,d.loadResistance,d.dividerResistance,d.beta]);
    var control=s.sensor?d.light:d.input,maxControl=s.sensor?100:5,maxCurrent=Math.max(s.loadLimit,sameAxis?reference.loadLimit:0)*1.15,x=function(v){return 65+v/maxControl*670;},y=function(v){return 210-v/maxCurrent*155;};
    var curve=sweep.map(function(r,i){return (i?'L':'M')+x(r.control).toFixed(2)+' '+y(r.collectorCurrent).toFixed(2);}).join(' ');
    var referenceCurve=sameAxis?referenceSweep.map(function(r,i){return (i?'L':'M')+x(r.control).toFixed(2)+' '+y(r.collectorCurrent).toFixed(2);}).join(' '):'';
    var status={cutoff:['Cutoff','The base drive is at or below the model’s 0.70 V turn-on. No base or lamp current flows.'],active:['Active region','Base current controls lamp current. IC = β × IB while the load still allows more current.'],saturated:['Saturation','The load sets the current limit. More base drive cannot increase lamp current here.']}[s.region];
    var range=function(label,key,min,max,step,format){return h(CircuitActiveControl,{React:React,key:key,field:key,label:label,min:min,max:max,step:step,value:d[key],format:format,onChange:function(value){var v={};v[key]=value;patch(v,true);}});};
    var selectNode=function(lead,key){return h('label',null,lead,h('select',{'aria-label':lead,value:probe[key],onChange:function(e){var v={};v[key==='red'?'probeRed':'probeBlack']=e.target.value;patch(v);}},Object.keys(s.nodes).map(function(node){return h('option',{key:node,value:node},({supply:'VCC · supply',drive:s.sensor?'D · divider junction':'VIN · input',base:'B · base',collector:'C · collector',emitter:'E · common return'})[node]);})));};
    var challenge=state.challenge,lesson=circuitActiveLesson(challenge?challenge.id:state.lessonId),tested=challenge&&challenge.tested,before=solveActiveCircuit(lesson.before),after=solveActiveCircuit(Object.assign({},lesson.before,lesson.after));
    var downloadState=React.useState(''),downloadMessage=downloadState[0],setDownloadMessage=downloadState[1];
    var download=function(){var url;try{url=URL.createObjectURL(new Blob([circuitActiveCSV(d)],{type:'text/csv;charset=utf-8'}));var a=document.createElement('a');a.href=url;a.download='npn-'+d.project+'-dc-sweep.csv';document.body.appendChild(a);a.click();a.remove();setDownloadMessage('Saved 201 calculated DC operating points with circuit settings and model constants.');setTimeout(function(){URL.revokeObjectURL(url);},1000);}catch(e){if(url)URL.revokeObjectURL(url);setDownloadMessage('The sweep could not be saved. Try again.');}};
    return h('section',{'data-circuit-builder-root':'true',className:'circuit-active-root','aria-label':'Active electronics workbench'},
      h('header',{className:'circuit-active-hero'},h('span',{className:'circuit-eyebrow'},'ACTIVE ELECTRONICS · NPN TRANSISTOR'),h('h2',null,'A small signal. A brighter idea.'),h('p',null,'Control a lamp with a transistor, then let light become the input. Follow the base, collector, and emitter through three connected experiments.')),
      h(CircuitActiveInvestigationTools,{React:React,state:state,patch:patch,record:record,load:loadInvestigation,restore:restoreInvestigation,
        note:function(index,note){changeNotebook(function(old){return {observations:(old.observations||[]).map(function(o,i){return i===index?Object.assign({},o,{note:note}):o;})};});},
        revisit:function(index){var o=observations[index];if(o)patch(Object.assign({},o.design,{probeRed:o.probeRed,probeBlack:o.probeBlack,investigationNotice:'Observation '+(index+1)+' settings restored. Its note and the notebook stay saved.'}),true);},
        reference:function(index){var o=observations[index];if(o)patch({reference:{version:1,design:circuitActiveDesign(o.design)},investigationNotice:'Observation '+(index+1)+' is now the reference circuit.'});},
        remove:function(index){changeNotebook(function(old){var list=old.observations||[];return list[index]?{observations:list.filter(function(_,i){return i!==index;}),removedObservation:{entry:list[index],index:index},investigationNotice:'Observation removed. Undo removed observation is available in the notebook.'}:{};});},
        undoRemove:function(){changeNotebook(function(old){var list=(old.observations||[]).slice(),removed=old.removedObservation;if(!removed||list.length>=8)return {};list.splice(Math.min(removed.index,list.length),0,removed.entry);return {observations:list,removedObservation:null,investigationNotice:'Observation restored.'};});}}),
      h('div',{className:'circuit-active-projects',role:'group','aria-label':'Active circuit experiments'},[['manual','Manual control','Turn a small input into lamp current.'],['light','Light sensor','More light raises the base drive.'],['dark','Dark sensor','Less light raises the base drive.']].map(function(p){return h('button',{type:'button',key:p[0],'aria-pressed':d.project===p[0],onClick:function(){patch(Object.assign({},circuitActiveDesign({project:p[0]}),{challenge:null}),true);}},h('span',null,p[1]),h('small',null,p[2]));})),
      h('section',{className:'circuit-active-panel'},h('div',{className:'circuit-active-toolbar'},h('h3',null,'01 · Change the input'),h('div',null,h('button',{type:'button',disabled:!(state.undo||[]).length,onClick:function(){history('undo');}},'Undo active edit'),h('button',{type:'button',disabled:!(state.redo||[]).length,onClick:function(){history('redo');}},'Redo active edit'))),
        s.sensor?range('Relative light level','light',0,100,1,function(v){return v+' / 100';}):range('Input voltage (V)','input',0,5,.01,function(v){return v.toFixed(2)+' V';}),
        h('div',{className:'circuit-active-quick'},(s.sensor?[[0,'Dark'],[50,'Mid light'],[100,'Bright']]:[[0,'Input off'],[1,'Input 1 V'],[3.3,'Input 3.3 V']]).map(function(p){return h('button',{type:'button',key:p[1],onClick:function(){patch(s.sensor?{light:p[0]}:{input:p[0]},true);}},p[1]);})),
        h('div',{className:'circuit-active-state','data-region':s.region},h('strong',null,status[0]),h('p',null,status[1])),
        h('div',{className:'circuit-active-metrics'},[['BASE CURRENT · IB',circuitCurrentText(s.baseCurrent),'Input through RB'],['LAMP CURRENT · IC',circuitCurrentText(s.collectorCurrent),'Supply → lamp → collector'],['TRANSISTOR · VCE',circuitPreciseVoltageText(s.collectorVoltage),'Collector relative to emitter']].map(function(m){return h('div',{key:m[0]},h('span',null,m[0]),h('strong',null,m[1]),h('small',null,m[2]));}))),
      h('section',{className:'circuit-active-panel'},h('div',{className:'circuit-active-toolbar'},h('h3',null,'02 · Follow the connections'),h('div',{role:'group','aria-label':'Active circuit view'},h('button',{type:'button','aria-pressed':solid,onClick:function(){patch({view:'3d'});}},'3D experiment board'),h('button',{type:'button','aria-pressed':!solid,onClick:function(){patch({view:'schematic'});}},'NPN schematic'))),
        h('div',{className:'circuit-active-probe-placement',role:'group','aria-label':'Choose probe to place'},h('span',null,'Place a probe on the board'),['red','black'].map(function(lead){return h('button',{type:'button',key:lead,'data-lead':lead,'aria-pressed':(state.placeLead==='black'?'black':'red')===lead,onClick:function(){patch({placeLead:lead});}},'Place '+lead+' probe');})),
        h(CircuitActiveDiagram,{React:React,solved:s,solid:solid,probe:probe,lead:state.placeLead,onPlace:function(node){var v={};v[state.placeLead==='black'?'probeBlack':'probeRed']=node;patch(v);}}),
        h('p',{className:'circuit-help'},'Gold: base input · Mint: lamp path · Blue: common return. Arrows show conventional current. This board is prewired; B, C, and E label circuit terminals, not a real package’s pin order. Select a lead, then choose a labeled node on the board or use the menus below. Scroll the diagram on a narrow screen.'),
        h('div',{className:'circuit-active-probes'},h('strong',null,'Measure between nodes'),h('div',null,selectNode('Red probe','red'),selectNode('Black probe','black'),h('button',{type:'button',onClick:function(){patch({probeRed:probe.black,probeBlack:probe.red});}},'Reverse active probes')),h('div',{className:'circuit-active-probe-shortcuts'},[['Transistor','collector','emitter'],['Base resistor','drive','base'],['Supply','supply','emitter']].map(function(p){return h('button',{type:'button',key:p[0],'aria-label':'Measure '+p[0].toLowerCase(),onClick:function(){patch({probeRed:p[1],probeBlack:p[2]});}},p[0]);})),h('output',{'aria-label':'Active voltmeter reading'},circuitPreciseVoltageText(probe.voltage)),h('span',null,'Red minus black · R / K markers on the board'))),
      h('details',{className:'circuit-active-panel'},h('summary',null,'Tune the components'),h('div',{className:'circuit-active-tuning'},range('Supply voltage (V)','supply',3,12,.1,function(v){return v.toFixed(1)+' V';}),range('Base resistance (Ω)','baseResistance',1000,100000,1000,circuitActiveResistanceText),range('Lamp resistance (Ω)','loadResistance',100,2000,10,circuitActiveResistanceText),range('Transistor gain β','beta',20,300,10),s.sensor&&range('Divider resistance (Ω)','dividerResistance',1000,100000,1000,circuitActiveResistanceText)),h('p',{className:'circuit-help'},'The lamp has fixed resistance in this model. Its glow indicates calculated power; filament temperature and real brightness are not simulated.')),
      h('section',{className:'circuit-active-panel'},h('div',{className:'circuit-active-toolbar'},h('h3',null,'03 · Discover the response'),h('button',{type:'button',onClick:download},'Export active sweep CSV')),
        h(CircuitActiveReference,{React:React,comparison:comparison,capture:function(){patch({reference:{version:1,design:circuitActiveDesign(d)}});},restore:function(){if(comparison)patch(comparison.before.design,true);},clear:function(){patch({reference:null});}}),
        h('p',null,'Each point is a settled DC solution. Follow the dot as you change '+(s.sensor?'the light level':'the input voltage')+'. The dashed line is the lamp-current limit at saturation.'),
        h('div',{className:'circuit-active-graph-control'},h(CircuitActiveControl,{React:React,key:s.sensor?'graph-light':'graph-input',field:s.sensor?'graph-light':'graph-input',label:s.sensor?'Graph light level':'Graph input voltage (V)',value:control,min:0,max:maxControl,step:s.sensor?1:.01,format:function(v){return s.sensor?v+' / 100':v.toFixed(2)+' V';},onChange:function(value){patch(s.sensor?{light:value}:{input:value},true);}})),
        h('div',{className:'circuit-active-plot-scroll',role:'region',tabIndex:0,'aria-label':'Scrollable transistor response graph'},h('svg', {viewBox:'0 0 800 275',role: 'img','aria-label':'Calculated lamp current versus '+(s.sensor?'relative light level':'input voltage')+'. Current point '+control+(s.sensor?' out of 100': ' volts')+', '+circuitCurrentText(s.collectorCurrent)+'. Saturation limit '+circuitCurrentText(s.loadLimit)+'. '+(sameAxis?'Lavender dashed reference curve; reference operating point '+referenceControl+(s.sensor?' out of 100, ': ' volts, ')+circuitCurrentText(reference.collectorCurrent)+'. ':'')+'Shaded bands show live cutoff, active, and saturated regions; the operating region explorer below lists their ranges. Exact readings are above; CSV contains live-circuit samples and settings.'},
          h('rect',{width:800,height:275,rx:14,fill:'#091c2b'}),regionMap.bands.map(function(b,i){return h('rect',{key:'region-'+i,className:'circuit-active-region-band','data-region':b.region,x:x(b.start),y:45,width:x(b.end)-x(b.start),height:165,fill:{cutoff:'#263d55',active:'#174037',saturated:'#453b28'}[b.region],opacity:.7});}),[regionMap.onset,regionMap.saturation].filter(function(v){return v!=null;}).map(function(v,i){return h('path',{key:'boundary-'+i,className:'circuit-active-region-boundary',d:'M '+x(v)+' 45 V 210',stroke:'#8ca4af',strokeWidth:1,strokeDasharray:'2 5'});}),[0,.25,.5,.75,1].map(function(f){var v=maxCurrent*f;return h('g',{key:f},h('path',{d:'M 65 '+y(v)+' H 735',stroke:'#35505f',strokeWidth:1}),h('text',{x:56,y:y(v)+4,textAnchor:'end',fill:'#bbd0df',fontSize:11},(v*1000).toFixed(1)),h('text',{x:x(maxControl*f),y:234,textAnchor:'middle',fill:'#bbd0df',fontSize:12},(maxControl*f).toFixed(s.sensor?0:2)));}),
          h('text',{x:65,y:25,fill:'#b3ead3',fontSize:13},'Lamp current (mA)'),h('text',{x:400,y:260,textAnchor:'middle',fill:'#d4e6f1',fontSize:13},s.sensor?'Relative light level · dark → bright':'Input voltage (V)'),h('path',{d:'M 65 '+y(s.loadLimit)+' H 735',stroke:'#e9c17c',strokeWidth:1.5,strokeDasharray:'6 5'}),sameAxis&&h('path',{className:'circuit-active-reference-curve',d:referenceCurve,stroke:'#d6b8f3',strokeWidth:2.5,strokeDasharray:'8 5',fill:'none',strokeLinejoin:'round'}),h('path',{className:'circuit-active-live-curve',d:curve,stroke:'#9ae5ca',strokeWidth:3,fill:'none',strokeLinejoin:'round'}),h('path',{d:'M '+x(control)+' 45 V 210',stroke:'#bcd7e9',strokeWidth:1,strokeDasharray:'3 4'}),sameAxis&&h('rect',{className:'circuit-active-reference-dot',x:x(referenceControl)-5,y:y(reference.collectorCurrent)-5,width:10,height:10,fill:'#091c2b',stroke:'#e0c6f8',strokeWidth:2,transform:'rotate(45 '+x(referenceControl)+' '+y(reference.collectorCurrent)+')'}),h('circle',{cx:x(control),cy:y(s.collectorCurrent),r:6,fill:'#f8e0a9',stroke:'#081722',strokeWidth:2}))),h('div',{className:'circuit-notebook-record-actions circuit-notebook-graph-actions'},h('button',{type:'button',disabled:observations.length>=8,onClick:record},'Record operating point'),h('button',{type:'button',onClick:openNotebook},'Open investigation notebook'),h('span',null,observations.length+'/8 recorded')),h('p',{className:'circuit-help',role:'status'},state.investigationNotice||''),h('div',{className:'circuit-active-plot-legend'},h('span',null,'● Live circuit · solid mint'),sameAxis&&h('span',null,'◇ Reference · dashed lavender'),h('span',null,'– – Live saturation limit · gold')),h('p',{className:'circuit-help'},'This graph sweeps the input; it does not show time or switching speed. CSV export saves the live circuit and its settings. Focus and use arrow keys to scroll on a narrow screen.'),h('p',{role:'status',className:'circuit-help'},downloadMessage),h(CircuitActiveRegionGuide,{React:React,solved:s,map:regionMap,explore:function(value){patch(s.sensor?{light:value}:{input:value},true);}})),
      h('section',{className:'circuit-active-panel circuit-active-reason'},h('h3',null,'04 · Explain what changes'),
        h('p',null,'Emitter current = collector + base = '+circuitCurrentText(s.collectorCurrent)+' + '+circuitCurrentText(s.baseCurrent)+' = '+circuitCurrentText(s.emitterCurrent)+'.'),
        h('p',null,'Lamp drop '+circuitPreciseVoltageText(s.loadVoltage)+' + transistor drop '+circuitPreciseVoltageText(s.collectorVoltage)+' = supply '+circuitPreciseVoltageText(d.supply)+'.'),
        s.sensor&&h('div',{className:'circuit-active-loading'},h('strong',null,'The sensor divider is loaded'),h('p',null,'LDR: '+(s.ldr/1000).toFixed(2)+' kΩ. Junction with no base connection: '+circuitPreciseVoltageText(s.theveninVoltage)+'. Connected junction: '+circuitPreciseVoltageText(s.driveVoltage)+'.'),h('p',null,'Upper resistor current = lower resistor current + base current: '+circuitCurrentText(s.topCurrent)+' = '+circuitCurrentText(s.bottomCurrent)+' + '+circuitCurrentText(s.baseCurrent)+'. The input branch draws current, so the connected divider voltage can be lower.')),
        h('details',null,h('summary',null,'Where does the energy come from?'),h('p',null,'Main supply: '+circuitPowerText(s.supplyPower)+(s.sensor?'':'. Separate input source: '+circuitPowerText(s.inputPower))+'. Total supplied: '+circuitPowerText(s.totalPower)+'.'),h('p',null,'Lamp '+circuitPowerText(s.loadPower)+' + base resistor '+circuitPowerText(s.basePower)+' + transistor '+circuitPowerText(s.transistorPower)+(s.sensor?' + divider '+circuitPowerText(s.dividerPower):'')+' = '+circuitPowerText(s.lossPower)+'.'),h('p',null,'The transistor controls energy supplied to the lamp. It does not create energy. Transistor dissipation includes both collector and base input power. Values are rounded.')),
        h('div',{className:'circuit-active-predict'},h('h4',null,'Predict, then test'),h('label',null,'Choose an experiment',h('select',{'aria-label':'Transistor prediction experiment',value:state.lessonId||'gain',onChange:function(e){patch({lessonId:e.target.value,challenge:null});}},CIRCUIT_ACTIVE_LESSONS.map(function(l){return h('option',{key:l.id,value:l.id},l.title);}))),h('button',{type:'button',onClick:function(){patch(circuitActiveDesign(lesson.before),true);patch({challenge:{id:lesson.id,choice:null,tested:false}});}},'Start transistor prediction'),
          challenge&&h('div',null,h('p',null,lesson.question),h('fieldset',null,h('legend',null,'Predict the lamp current'),h('div',{className:'circuit-active-quick'},[['more','Increases'],['same','Stays the same'],['less','Decreases']].map(function(c){return h('button',{key:c[0],type:'button',disabled:!!tested,'aria-pressed':challenge.choice===c[0],onClick:function(){patch({challenge:Object.assign({},challenge,{choice:c[0]})});}},c[1]);}))),h('button',{type:'button',disabled:!challenge.choice||!!tested,onClick:function(){patch(circuitActiveDesign(Object.assign({},lesson.before,lesson.after)),true);patch({challenge:Object.assign({},challenge,{tested:true})});}},'Test transistor prediction'),
            tested&&h('div',{className:'circuit-active-feedback',role:'status'},h('strong',null,challenge.choice===lesson.answer?'Your prediction matches the model.':'The readings reveal a different result.'),h('p',null,'Before: '+circuitCurrentText(before.collectorCurrent)+' ('+before.region+'). After: '+circuitCurrentText(after.collectorCurrent)+' ('+after.region+').'),h('p',null,lesson.reason))),
          h('label',{className:'circuit-active-reflection'},'My explanation',h('textarea',{'aria-label':'Transistor experiment explanation',maxLength:4000,rows:2,value:state.reflection||'',placeholder:'Use the base current, lamp current, and voltage readings as evidence.',onChange:function(e){patch({reflection:e.target.value});}})))),
      h('details',{className:'circuit-active-panel circuit-model-details'},h('summary',null,'Model and connections'),h('p',null,'These are fixed, prewired DC experiments using a generic NPN model. Conducting VBE = 0.70 V; saturation VCE = 0.20 V. IB = max(0, (Vth − 0.70)/(Rth + RB)); IC = min(β × IB, (VCC − 0.20)/Rlamp). The divider is replaced by its Thevenin equivalent for the base-current calculation, then all actual branch currents are recovered.'),h('p',null,'Relative light 0–100 maps to an illustrative resistance of 100 kΩ × 100^(−level/100), from 100 kΩ to 1 kΩ. This is not a lux calibration. The light sensor places the LDR above the divider junction; the dark sensor places it below. Both use the main supply. Manual control uses a separate ideal input source with the same return.'),h('p',null,'Gain and junction voltages are idealized constants, not device guarantees. Temperature, leakage, breakdown, reverse operation, switching delay, and lamp heating are outside this model. Transistor heat does not change its parameters. No arbitrary wiring or transistor transient simulation is implied.'),h('p',null,h('a',{href:'https://www.onsemi.com/pdf/datasheet/2n3904-d.pdf',target:'_blank',rel:'noopener noreferrer'},'Compare real transistor characteristics'),' · ',h('a',{href:'https://wiki.analog.com/university/courses/electronics/text/light-sensors-photodiodes',target:'_blank',rel:'noopener noreferrer'},'Read about light-sensor interfaces'))));
  }

  // Camera framing uses SVG coordinates, independent of circuit values and screen size.
  function circuitCameraState(state) {
    return {zoom:circuitNumber(state.cameraZoom,1,.6,1.8),x:circuitNumber(state.cameraPanX,0,-220,220),y:circuitNumber(state.cameraPanY,0,-150,150)};
  }
  function circuitCameraPan(start,dx,dy,width,touch) {
    var scale=640/Math.max(1,width);
    return {cameraPanX:circuitNumber(start.x+dx*scale,0,-220,220),cameraPanY:touch?start.y:circuitNumber(start.y+dy*scale,0,-150,150)};
  }
  window.StemLab.circuitCameraState=circuitCameraState;
  window.StemLab.circuitCameraPan=circuitCameraPan;

  // Projected solid geometry with material shading; all readings come from the DC solver.
  function CircuitBench3D(props) {
    var h=props.React.createElement, solved=props.solved, d=props.state;
    var camera=circuitCameraState(d),panning=d.cameraDragMode==='pan';
    var sceneRef=props.React.useRef(null),exporting=props.React.useRef(false),mounted=props.React.useRef(true);
    var exportState=props.React.useState(''),exportMessage=exportState[0],setExportMessage=exportState[1];
    props.React.useEffect(function(){mounted.current=true;return function(){mounted.current=false;};},[]);
    var saveBenchImage=async function(){
      if(exporting.current||!sceneRef.current)return;
      exporting.current=true;setExportMessage('Preparing image…');
      var sourceUrl=null;
      try{
        // Capture geometry, labels, and solved readings before yielding to image decoding.
        var snapshot=circuitBenchSnapshot(sceneRef.current,solved,selectedIndex,d);
        sourceUrl=URL.createObjectURL(new Blob([snapshot],{type:'image/svg+xml;charset=utf-8'}));
        var img=new Image();
        await new Promise(function(resolve,reject){img.onload=resolve;img.onerror=function(){reject(new Error('Image could not be decoded'));};img.src=sourceUrl;});
        var canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
        var context=canvas.getContext('2d');if(!context)throw new Error('Image export unavailable');context.drawImage(img,0,0);
        var png=await new Promise(function(resolve){canvas.toBlob(resolve,'image/png');});if(!png)throw new Error('Image export unavailable');
        var downloadUrl=URL.createObjectURL(png),link=document.createElement('a');
        try{link.href=downloadUrl;link.download='circuit-bench-'+solved.mode+'.png';link.click();}
        finally{setTimeout(function(){URL.revokeObjectURL(downloadUrl);},1000);}
        if(mounted.current)setExportMessage('Image ready. Your download includes the scene and all component readings.');
      }catch(error){if(mounted.current)setExportMessage('The image could not be saved. Try again.');}
      finally{if(sourceUrl)URL.revokeObjectURL(sourceUrl);exporting.current=false;}
    };

    var drag=props.React.useRef(null),frame=props.React.useRef(null),pending=props.React.useRef(null);
    var dragState=props.React.useState(false),dragging=dragState[0],setDragging=dragState[1];
    props.React.useEffect(function(){return function(){if(frame.current!=null)cancelAnimationFrame(frame.current);};},[]);
    var flushCamera=function(){
      frame.current=null;
      if(pending.current){var next=pending.current;pending.current=null;props.updateMany(next);}
    };
    var endDrag=function(e){
      if(!drag.current||drag.current.id!==e.pointerId)return;
      if(frame.current!=null){cancelAnimationFrame(frame.current);frame.current=null;}
      flushCamera();drag.current=null;setDragging(false);
      if(e.currentTarget.hasPointerCapture&&e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
    };
    var startDrag=function(e){
      if(e.button!==0||e.target.closest('button'))return;
      drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:d.cameraYaw==null?-22:d.cameraYaw,tilt:d.cameraTilt==null?48:d.cameraTilt,pan:camera,mode:panning,width:e.currentTarget.getBoundingClientRect().width};
      e.currentTarget.setPointerCapture(e.pointerId);
    };
    var moveDrag=function(e){
      var start=drag.current;if(!start||start.id!==e.pointerId)return;
      var dx=e.clientX-start.x,dy=e.clientY-start.y;
      if(e.pointerType==='touch'&&Math.abs(dx)<Math.abs(dy)*1.2)return;
      if(Math.abs(dx)+Math.abs(dy)<5)return;
      setDragging(true);
      pending.current=start.mode?circuitCameraPan(start.pan,dx,dy,start.width,e.pointerType==='touch'):{cameraYaw:circuitNumber(start.yaw+dx*.32,-22,-80,80),cameraTilt:e.pointerType==='touch'?start.tilt:circuitNumber(start.tilt-dy*.3,48,20,85)};
      if(frame.current==null)frame.current=requestAnimationFrame(flushCamera);
    };

    var yaw=circuitNumber(d.cameraYaw==null?-22:d.cameraYaw,-22,-80,80)*Math.PI/180;
    var tilt=circuitNumber(d.cameraTilt==null?48:d.cameraTilt,48,20,85)*Math.PI/180;
    var count=solved.rows.length;
    var positions=solved.rows.map(function(r,i){
      if(solved.mode==='mixed'){
        var bi=solved.branches.findIndex(function(b){return b.id===r.branch;});
        return {x:45+(r.branchPosition-(r.branchSize-1)/2)*92,y:solved.branches.length===1?0:-115+bi*230/(solved.branches.length-1)};
      }
      if(solved.mode==='parallel')return {x:count>4?(i%2?115:-10):45,y:count===1?0:-125+i*250/(count-1)};
      var row=Math.floor(i/4),col=i%4;
      return {x:-105+(row%2?3-col:col)*92,y:count<=4?0:-72+row*144};
    });
    var selectedIndex=Math.min(Math.max(0,d.selectedPart||0),Math.max(0,count-1));
    var selectedRow=solved.rows[selectedIndex],insight=selectedRow?circuitPartInsight(solved.mode==='mixed'?solved.branches.find(function(b){return b.id===selectedRow.branch;}).solved:solved,selectedRow):null;
    var compareMetric=['voltage','current','power'].indexOf(d.sceneCompare)>=0?d.sceneCompare:'details';
    var comparing=compareMetric!=='details';
    var probe=circuitProbeReading(solved,d.probeRed,d.probeBlack);
    var compareMax=comparing?solved.rows.reduce(function(max,r){return Math.max(max,Math.abs(r[compareMetric]||0));},0):0;
    var compareUnknown=comparing&&solved.rows.some(function(r){return r[compareMetric]==null;});
    var compareText=function(value){
      if(value==null)return 'undetermined';
      if(compareMetric==='current')return circuitCurrentText(value);
      if(compareMetric==='power')return circuitPowerText(value);
      return circuitPreciseVoltageText(value);
    };
    var compareLesson=solved.mode==='mixed'?(compareMetric==='voltage'?'Voltage drops add to the supply within each branch. Individual parts need not have the full supply voltage.':compareMetric==='current'?'Parts in the same branch share current. Add one current per branch to get the source current.':'Power is energy transferred each second. Add all component powers to get the source power.'):compareMetric==='power'?'Power is energy transferred each second, not energy stored.':compareMetric==='voltage'?(solved.mode==='series'?'Compare how the source voltage is shared across the parts.':'Every parallel branch has the same source voltage across it.'):(solved.mode==='series'?'Every part in this series path carries the same current.':'Compare branch currents: together they make the source current.');
    var editSelected=function(){
      var editor=document.getElementById('circuit-inspector-value')||document.getElementById('circuit-inspect-part');
      if(editor){editor.scrollIntoView({block:'center'});editor.focus({preventScroll:true});}
    };
    var changeSelected=function(){props.update('components',solved.components.map(function(c,i){
      if(i!==selectedIndex)return c;
      return Object.assign({},c,c.type==='switch'?{closed:!c.closed}:{reversed:!c.reversed});
    }));};
    var focus=d.sceneCloseup&&count?positions[selectedIndex]:null;
    var sceneScale=(focus?3:.88)*camera.zoom;
    var project=function(x,y,z) {
      if(focus){x-=focus.x;y-=focus.y;z-=20;}
      var xx=x*Math.cos(yaw)-y*Math.sin(yaw), yy=x*Math.sin(yaw)+y*Math.cos(yaw);
      return [320+camera.x+xx*sceneScale,215+camera.y+(yy*Math.sin(tilt)-z*Math.cos(tilt))*sceneScale,yy*Math.cos(tilt)+z*Math.sin(tilt)];
    };
    var faces=[], labels=[], activePart=null;
    var shade=function(hex,factor) {
      var n=parseInt(hex.slice(1),16);
      return 'rgb('+[n>>16,(n>>8)&255,n&255].map(function(v){return Math.round(Math.min(255,v*factor));}).join(',')+')';
    };
    var push=function(points,node,offset) {
      faces.push({depth:points.reduce(function(sum,p){return sum+p[2];},0)/points.length+(offset||0),node:node});
    };
    var polygon=function(points,fill,stroke,opacity) {
      var p=points.map(function(v){return project(v[0],v[1],v[2]);});
      push(p,h('polygon',{points:p.map(function(v){return v[0]+','+v[1];}).join(' '),fill:fill,stroke:stroke||fill,strokeWidth:.65,strokeLinejoin:'round',opacity:opacity==null?1:opacity}));
    };
    var box=function(x,y,z,w,l,height,color) {
      var a=[x-w/2,y-l/2,z],b=[x+w/2,y-l/2,z],c=[x+w/2,y+l/2,z],e=[x-w/2,y+l/2,z];
      var up=function(v){return [v[0],v[1],z+height];};
      polygon([a,b,up(b),up(a)],shade(color,.56));
      polygon([b,c,up(c),up(b)],shade(color,.68));
      polygon([c,e,up(e),up(c)],shade(color,.42));
      polygon([e,a,up(a),up(e)],shade(color,.76));
      polygon([up(a),up(b),up(c),up(e)],color,shade(color,1.25));
    };
    var cylinder=function(x,y,z,radius,length,color,axis) {
      var circle=function(t,offset) {
        return axis==='x'?[x+offset,y+radius*Math.cos(t),z+radius*Math.sin(t)]:[x+radius*Math.cos(t),y+radius*Math.sin(t),z+offset];
      };
      var top=[], bottom=[], segments=20;
      for(var k=0;k<segments;k++) {
        var a=k*Math.PI*2/segments,b=(k+1)*Math.PI*2/segments;
        var p=circle(a,0),q=circle(b,0),r=circle(b,length),s=circle(a,length);
        polygon([p,q,r,s],shade(color,.52+.45*(1+Math.cos(a-2.2))/2));
        bottom.push(p);top.push(s);
      }
      polygon(bottom,shade(color,.65));polygon(top,shade(color,1.08));
    };

    var roundedPath=function(points,radius) {
      if(points.length<2)return '';
      var path='M '+points[0][0]+' '+points[0][1];
      for(var i=1;i<points.length-1;i++){
        var prev=points[i-1],p=points[i],next=points[i+1];
        var incoming=Math.hypot(p[0]-prev[0],p[1]-prev[1]),outgoing=Math.hypot(next[0]-p[0],next[1]-p[1]);
        if(!incoming||!outgoing)continue;
        var a=Math.min(radius,incoming/2,outgoing/2);
        var start=[p[0]+(prev[0]-p[0])*a/incoming,p[1]+(prev[1]-p[1])*a/incoming];
        var end=[p[0]+(next[0]-p[0])*a/outgoing,p[1]+(next[1]-p[1])*a/outgoing];
        path+=' L '+start[0]+' '+start[1]+' Q '+p[0]+' '+p[1]+' '+end[0]+' '+end[1];
      }
      return path+' L '+points[points.length-1][0]+' '+points[points.length-1][1];
    };
    var footprint=function(x,y,rx,ry,fill,opacity,z) {
      var ring=[];for(var k=0;k<32;k++){var a=k*Math.PI/16;ring.push([x+rx*Math.cos(a),y+ry*Math.sin(a),z||1.2]);}
      polygon(ring,fill,fill,opacity);
    };
    var dome=function(x,y,z,radius,color) {
      for(var ring=0;ring<6;ring++){
        var a=ring*Math.PI/12,b=(ring+1)*Math.PI/12;
        for(var segment=0;segment<24;segment++){
          var c=segment*Math.PI/12,e=(segment+1)*Math.PI/12;
          var point=function(latitude,longitude){return [x+radius*Math.cos(latitude)*Math.cos(longitude),y+radius*Math.cos(latitude)*Math.sin(longitude),z+radius*Math.sin(latitude)];};
          polygon([point(a,c),point(a,e),point(b,e),point(b,c)],shade(color,.6+.35*Math.sin(a)+.25*Math.cos(c-2)));
        }
      }
      var glint=project(x-3,y-3,z+radius*.88);
      push([glint],h('ellipse',{cx:glint[0],cy:glint[1],rx:2.2,ry:3.6,fill:'#fff',opacity:.65,transform:'rotate(-25 '+glint[0]+' '+glint[1]+')'}),2);
    };

    var flowPaths=[];
    var traceFlow=function(points){
      if(d.sceneCurrent&&selectedRow&&Math.abs(selectedRow.current)>1e-12)flowPaths.push(selectedRow.current<0?points.slice().reverse():points);
    };
    var circuitWire=function(points,color){wire(points,color);traceFlow(points);};
    var wire=function(points,color,width) {
      var p=points.map(function(v){return project(v[0],v[1],v[2]);});
      var path=roundedPath(p,focus?14:6), grid=width&&width<1, weight=(width||4)*(focus?2:1);
      push(p,h('g',null,
        !grid&&h('path',{d:path,fill:'none',stroke:'#020a11',strokeWidth:weight+3,strokeLinecap:'round',strokeLinejoin:'round',opacity:.5,transform:'translate(0 2)'}),
        h('path',{d:path,fill:'none',stroke:color||'#5eead4',strokeWidth:weight,strokeLinecap:'round',strokeLinejoin:'round'}),
        !grid&&h('path',{d:path,fill:'none',stroke:'#ffffff',strokeWidth:.65,strokeLinecap:'round',strokeLinejoin:'round',opacity:.4,transform:'translate(0 -.7)'})));
    };
    var label=function(x,y,z,text,color,part) {
      var p=project(x,y,z);
      labels.push({part:!!part,index:activePart,node:h('text',{x:p[0],y:p[1],textAnchor:'middle',fill:color||'#dbeafe',fontSize:focus?13:10.5,fontWeight:600,letterSpacing:.3,paintOrder:'stroke',stroke:'#0b1c2a',strokeWidth:3,strokeLinejoin:'round'},text)});
    };
    var shadeNotLit=function(hex){var n=parseInt(hex.slice(1),16);return '#'+[n>>16,(n>>8)&255,n&255].map(function(v){return Math.round(v*.55+22).toString(16).padStart(2,'0');}).join('');};
    var glass=function(x,y,z,r,lit,color) {
      var p=project(x,y,z); r*=sceneScale;
      push([p],h('g',null,
        lit&&h('circle',{cx:p[0],cy:p[1],r:r*2.3,fill:'url(#circuit-bulb-bloom)',opacity:.75}),
        lit&&h('circle',{cx:p[0],cy:p[1],r:r*1.45,fill:'url(#circuit-bulb-bloom)',opacity:.35}),
        h('circle',{cx:p[0],cy:p[1],r:r,fill:lit?'url(#circuit-glass-warm)':'url(#circuit-glass-cool)',stroke:lit?'#fde68a':'#94a3b8',strokeWidth:1,opacity:.97}),
        h('ellipse',{cx:p[0]-r*.35,cy:p[1]-r*.35,rx:r*.20,ry:r*.38,fill:'#fff',opacity:.65,transform:'rotate(30 '+p[0]+' '+p[1]+')'}),
        h('path',{d:'M '+(p[0]-r*.4)+' '+(p[1]+r*.65)+' Q '+p[0]+' '+(p[1]+r*.85)+' '+(p[0]+r*.6)+' '+(p[1]+r*.4),fill:'none',stroke:'#e0f2fe',strokeWidth:.65,opacity:.65})));
    };
    // A bevelled lab tray, quiet grid, and machined mounting screws.
    box(0,0,-19,550,350,17,'#244a58');
    box(0,0,-20,542,342,2,'#0b1d2a');
    polygon([[-267,-174,0],[267,-174,0],[275,-166,0],[275,166,0],[267,174,0],[-267,174,0],[-275,166,0],[-275,-166,0]],'#153744','#2d5663');
    polygon([[-258,-156,.5],[258,-156,.5],[258,156,.5],[-258,156,.5]],'#12303d','#204955');
    for(var gx=-250;gx<=250;gx+=25)wire([[gx,-150,1],[gx,150,1]],'#204552',.45);
    for(var gy=-150;gy<=150;gy+=25)wire([[-250,gy,1],[250,gy,1]],'#204552',.45);
    [[-261,-160],[261,-160],[-261,160],[261,160]].forEach(function(p){
      cylinder(p[0],p[1],1,4.5,1.8,'#90a7b5');
      wire([[p[0]-2.5,p[1],3],[p[0]+2.5,p[1],3]],'#425768',.8);
    });

    // Contact shadows and pools of light are projected onto the work surface.
    footprint(-214,12,44,78,'#020b13',.24);
    positions.forEach(function(p,i){
      var row=solved.rows[i],emits=(row.component.type==='bulb'&&row.power>.01)||(row.component.type==='led'&&row.current>.005);
      footprint(p.x+8,p.y+10,36,23,'#020b13',.16);
      footprint(p.x+5,p.y+6,28,17,'#020b13',.22);
      if(emits&&!solved.isShort)footprint(p.x,p.y,55,42,'url(#circuit-light-pool-'+i+')',.6,1.3);
    });
    for(var tx=-225;tx<=225;tx+=25){
      wire([[tx,157,1],[tx,tx%50===0?164:161,1]],'#507986',.55);
    }
    var groundFaces=faces;faces=[];

    // Adjustable DC source housing with insulated terminals and a voltage display.
    box(-220,0,1,58,136,38,'#253b4a');
    box(-220,0,39,55,129,3,'#627b87');
    box(-220,0,43,43,86,2,'#142638');

    box(-220,-42,43,43,5,1,'#fbbf24');
    for(var vent=0;vent<6;vent++)wire([[-239+vent*7,68,9],[-239+vent*7,68,29]],'#102735',1.4);
    cylinder(-220,42,43,7,5,'#233f51');
    cylinder(-220,42,48,5.5,1,'#8ea9b5');
    wire([[-220,39,49],[-220,43,49]],'#e1edf0',.8);

    [-1,1].forEach(function(side){
      cylinder(-220,side*60,43,8,3,side<0?'#e76a83':'#58a9eb');
      cylinder(-220,side*60,46,4,4,'#c7d6df');
      wire([[-220,side*60,50],[-220,side*70,48]],side<0?'#fb7185':'#60a5fa',3);
    });
    label(-220,-15,49,solved.signalMode==='ac'?'AC SOURCE':solved.signalMode==='release'?'0 V RETURN':'DC SOURCE','#9eb9ca');
    label(-220,12,49,solved.voltage.toFixed(1)+' V','#fef3c7');
    label(-220,32,49,'+   ━   −','#b6c9d6');
    if(count) {
      if(solved.mode==='mixed') {
        wire([[-220,-70,48],[-150,-145,8],[-150,145,8]],'#fb7185');
        wire([[-220,70,48],[-180,151,8],[235,151,8],[235,-145,8]],'#60a5fa');
        solved.branches.forEach(function(branch){
          var first=positions[branch.indices[0]],last=positions[branch.indices[branch.indices.length-1]],active=selectedRow&&selectedRow.branch===branch.id;
          label(-125,first.y-28,3,'BRANCH '+branch.name,'#b8d8de');
          var incoming=[[-150,first.y,8],[first.x-35,first.y,8]],outgoing=[[last.x+35,last.y,8],[235,last.y,8]];
          wire(incoming,'#fb7185');wire(outgoing,'#60a5fa');
          cylinder(-150,first.y,8,3.5,1,'#e9b1ba');cylinder(235,last.y,8,3.5,1,'#9fc7e9');
          branch.indices.forEach(function(index,j){if(!j)return;var before=positions[branch.indices[j-1]],p=positions[index],path=[[before.x+35,before.y,8],[p.x-35,p.y,8]];wire(path,'#83b6c6');if(active)traceFlow(path);});
          if(active){traceFlow([[-220,-70,48],[-150,-145,8],[-150,first.y,8],[first.x-35,first.y,8]]);traceFlow([[last.x+35,last.y,8],[235,last.y,8],[235,151,8],[-180,151,8],[-220,70,48]]);}
        });
      } else if(solved.mode==='parallel') {
        wire([[-220,-70,48],[-150,-145,8],[-150,145,8]],'#fb7185');
        wire([[-220,70,48],[-180,151,8],[235,151,8],[235,-145,8]],'#60a5fa');
        positions.forEach(function(p,i){
          wire([[-150,p.y,8],[p.x-35,p.y,8]],'#fb7185');
          wire([[p.x+35,p.y,8],[235,p.y,8]],'#60a5fa');
          cylinder(-150,p.y,8,3.5,1,'#e9b1ba');cylinder(235,p.y,8,3.5,1,'#9fc7e9');
          // Follow only the selected branch; common rails also carry other branches.
          if(i===selectedIndex){
            traceFlow([[-220,-70,48],[-150,-145,8],[-150,p.y,8],[p.x-35,p.y,8]]);
            traceFlow([[p.x+35,p.y,8],[235,p.y,8],[235,151,8],[-180,151,8],[-220,70,48]]);
          }
        });
      } else {
        var first=positions[0],last=positions[count-1];
        circuitWire([[-220,-70,48],[-168,-125,8],[first.x-35,-125,8],[first.x-35,first.y,8]],'#fb7185');
        positions.forEach(function(p,i){
          if(!i)return;
          var before=positions[i-1],direction=Math.floor(i/4)%2?-1:1,priorDirection=Math.floor((i-1)/4)%2?-1:1;
          circuitWire([[before.x+priorDirection*35,before.y,8],[before.x+priorDirection*46,before.y,8],[before.x+priorDirection*46,p.y,8],[p.x-direction*35,p.y,8]]);
        });
        var lastDir=Math.floor((count-1)/4)%2?-1:1;
        circuitWire([[last.x+lastDir*35,last.y,8],[last.x+lastDir*45,last.y,8],[last.x+lastDir*45,145,8],[-180,145,8],[-220,70,48]],'#60a5fa');
      }
    }
    var flowNodes=flowPaths.map(function(points,i){
      var p=points.map(function(v){return project(v[0],v[1],v[2]);}),arrows=[];
      for(var j=1;j<p.length;j++){
        var a=p[j-1],b=p[j],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
        // Keep arrows off corners and omit segments too short to read at this angle.
        if(length<26)continue;
        var ux=dx/length,uy=dy/length,n=Math.max(1,Math.floor(length/90));
        for(var k=0;k<n;k++){
          var t=(k+.5)/n,x=a[0]+dx*t,y=a[1]+dy*t,size=focus?6:4.5;
          arrows.push(h('path',{key:j+'-'+k,className:'circuit-flow-arrow',
            d:'M '+(x-ux*size-uy*size)+' '+(y-uy*size+ux*size)+' L '+(x+ux*size)+' '+(y+uy*size)+' L '+(x-ux*size+uy*size)+' '+(y-uy*size-ux*size),
            fill:'none',stroke:'#fff2b2',strokeWidth:focus?2.5:2,strokeLinecap:'round',strokeLinejoin:'round',paintOrder:'stroke'}));
        }
      }
      return h('g',{key:i,'data-current-route':i,'aria-hidden':true},
        h('path',{d:roundedPath(p,focus?14:6),fill:'none',stroke:'#fcd56a',strokeWidth:focus?12:8,opacity:.2,strokeLinecap:'round'}),arrows);
    });
    var wireFaces=faces;faces=[];
    solved.rows.forEach(function(r,i){
      var c=r.component,p=positions[i],selected=selectedIndex===i; activePart=i;
      var lit=Math.abs(r.current)>0.005&&!solved.isShort, color=c.ledColor||'#ef4444';
      // A flush mount gives each part a visible footprint and a selection halo.
      polygon([[p.x-35,p.y-20,1],[p.x+35,p.y-20,1],[p.x+35,p.y+20,1],[p.x-35,p.y+20,1]],selected?'#1b4a53':'#173442',selected?'#a9eed7':'#416371');
      wire([[p.x-35,p.y,8],[p.x-19,p.y,14]],'#b9cbd5',2.5);
      wire([[p.x+19,p.y,14],[p.x+35,p.y,8]],'#b9cbd5',2.5);

      [-1,1].forEach(function(side){cylinder(p.x+side*30,p.y,5,3.8,5,'#8ea6b4');cylinder(p.x+side*30,p.y,10,2.6,1,'#d5e3e9');});
      if(c.type==='resistor') {
        cylinder(p.x-20,p.y,15,6,3,'#9daeb4','x');
        cylinder(p.x+17,p.y,15,6,3,'#9daeb4','x');

        cylinder(p.x-18,p.y,15,8,36,'#dec5a0','x');
        var exponent=Math.floor(Math.log10(c.value))-1,digits=Math.round(c.value/Math.pow(10,exponent));
        var palette=['#20242a','#80512d','#ef4444','#f59e0b','#fde047','#22c55e','#3b82f6','#a855f7','#94a3b8','#f8fafc'];
        // Only render real four-band codes when this value is exactly representable.
        if(Math.abs(digits*Math.pow(10,exponent)-c.value)<1e-8&&digits>=10&&digits<=99) {
          [palette[Math.floor(digits/10)],palette[digits%10],exponent===-1?'#d9b65c':palette[exponent],'#d9b65c'].forEach(function(band,j){
            cylinder(p.x-12+j*7,p.y,15,8.2,2.7,band,'x');
          });
        }
        label(p.x,p.y-23,6,c.value+' Ω','#f3debb',true);
      } else if(c.type==='bulb') {
        cylinder(p.x,p.y,4,16,5,'#516876');
        cylinder(p.x,p.y,9,10,15,'#b9a97e');
        for(var ridge=0;ridge<3;ridge++)cylinder(p.x,p.y,11+ridge*4,10.7,1,'#d4d8ce');
        cylinder(p.x,p.y,24,7,6,'#acbfbd');
        glass(p.x,p.y,48,19,r.power>0.01&&!solved.isShort,'#fbbf24');
        wire([[p.x-6,p.y,28],[p.x-6,p.y,46],[p.x-3,p.y,52],[p.x,p.y,46],[p.x+3,p.y,52],[p.x+6,p.y,46],[p.x+6,p.y,28]],r.power>0.01&&!solved.isShort?'#ffd779':'#a99972',1.1);
      } else if(c.type==='led') {
        cylinder(p.x,p.y,6,13,3,'#627786');
        cylinder(p.x,p.y,10,10,12,color);
        dome(p.x,p.y,22,10,lit?color:shadeNotLit(color));
        label(p.x,p.y-24,10,(!!c.reversed!==(solved.mode==='series'&&Math.floor(i/4)%2===1))?'−   +':'+   −','#fbc4ce',true);
      } else if(c.type==='inductor') {
        box(p.x,p.y,9,44,17,23,'#34424a');
        var coil=[];for(var turn=0;turn<=96;turn++){var angle=turn/96*Math.PI*16;coil.push([p.x-22+turn/96*44,p.y+12*Math.cos(angle),25+12*Math.sin(angle)]);}
        for(var segment=1;segment<coil.length;segment++)wire([coil[segment-1],coil[segment]],shade('#d99155',.85+.3*Math.sin(segment/96*Math.PI*16)),3.5);wire([[p.x-35,p.y,8],coil[0]],'#bdced4',2.5);wire([coil[coil.length-1],[p.x+35,p.y,8]],'#bdced4',2.5);
        label(p.x,p.y-25,5,c.value+' mH','#f2d0a9',true);
      } else if(c.type==='capacitor') {
        cylinder(p.x,p.y,4,13,35,'#3385ac');

        cylinder(p.x,p.y,39,12,2,'#d1e1e6');
        // Jacket stripe, rolled base rim, and scored aluminum vent.
        cylinder(p.x,p.y,4,13.6,2,'#163e55');
        polygon([[p.x-5,p.y-12.5,8],[p.x+5,p.y-12.5,8],[p.x+5,p.y-12.5,36],[p.x-5,p.y-12.5,36]],'#a2cdd7');
        for(var stripe=0;stripe<3;stripe++)wire([[p.x-2,p.y-12.7,13+stripe*8],[p.x+2,p.y-12.7,13+stripe*8]],'#22546d',.8);

        wire([[p.x-8,p.y,41],[p.x+8,p.y,41]],'#728997',.8);
        wire([[p.x,p.y-8,41],[p.x,p.y+8,41]],'#728997',.8);
        label(p.x,p.y-25,5,c.value+' µF','#c5e9f9',true);
      } else if(c.type==='switch') {
        box(p.x,p.y,3,46,27,7,'#344956');
        [-17,17].forEach(function(dx){cylinder(p.x+dx,p.y,10,4.5,4,'#c9d6d9');});
        wire([[p.x-17,p.y,16],[p.x+17,p.y,c.closed?16:39]],c.closed?'#9fe2c7':'#cfb179',5);
        cylinder(p.x-17,p.y,15,5,2,'#b9c9cf');
        box(p.x+10,p.y,c.closed?16:33,13,12,5,'#ecb961');
        label(p.x,p.y-22,6,c.closed?'CLOSED':'OPEN',c.closed?'#9ee6c7':'#fcd6a3',true);
      } else {
        box(p.x,p.y,3,51,37,13,'#4c7685');
        box(p.x,p.y,17,42,27,1,'#0d2631');
        wire([[p.x-18,p.y-12,18.5],[p.x+18,p.y-12,18.5]],'#93bec4',.7);
        label(p.x,p.y-2,20,c.type==='ammeter'?'A':'V','#78cfcf',true);
        label(p.x,p.y+12,20,c.type==='ammeter'?r.current.toFixed(3):r.voltage==null?'—':r.voltage.toFixed(2),'#d6fff1',true);
      }
      label(p.x,p.y+31,4,String(i+1).padStart(2,'0')+'  '+c.type,'#cee0e9',true);
    });
    faces.sort(function(a,b){return a.depth-b.depth;});
    var probeMarkers=[],probePins=[];
    if(d.sceneProbes){
      [{index:probe.red,name:'R',color:'#fda4af'},{index:probe.black,name:'B',color:'#d7e1eb'}].forEach(function(lead,k){
        var at;
        if(lead.index===0)at=[-220,-60,50];
        else if(solved.mode==='mixed'){if(lead.index===1)at=[-220,60,50];else{var nodePart=positions[solved.nodes[lead.index].afterPart];at=[nodePart.x+35,nodePart.y,10];}}
        else if(solved.mode==='parallel'||lead.index===count||!count)at=[-220,60,50];
        else {var part=positions[lead.index-1],dir=Math.floor((lead.index-1)/4)%2?-1:1;at=[part.x+dir*35,part.y,10];}
        var p=project(at[0],at[1],at[2]);
        if(p[0]<0||p[0]>640||p[1]<0||p[1]>410)return;
        var x=Math.max(14,Math.min(626,p[0]+(k?26:-26))),y=Math.max(14,Math.min(396,p[1]+(focus?36:60)));
        probePins.push(h('span',{key:k,className:'circuit-probe-pin','data-lead':lead.name,style:{left:(x/640*100)+'%',top:(y/410*100)+'%'}},lead.name));
        probeMarkers.push(h('g',{key:k,'data-voltage-probe':lead.name,'aria-hidden':true},
          h('path',{d:'M '+p[0]+' '+p[1]+' L '+x+' '+y,stroke:lead.color,strokeWidth:2,fill:'none'}),
          h('circle',{cx:p[0],cy:p[1],r:3.5,fill:lead.color,stroke:'#071823',strokeWidth:1}),
          h('circle',{className:'circuit-probe-badge',cx:x,cy:y,r:11,fill:k?'#162b3e':'#622c3d',stroke:lead.color,strokeWidth:1.5}),
          h('text',{className:'circuit-probe-badge',x:x,y:y+3.5,textAnchor:'middle',fontSize:10,fontWeight:700,fill:'#fff'},lead.name)));
      });
    }
    var stateLabel=solved.timeDomain?(solved.signalMode==='ac'?'AC sample':solved.signalMode==='release'?'Stored energy release':'Step response'):solved.isShort?'Short path':solved.voltage===0?'Source off':solved.isOpen?'Open circuit':solved.current===0?'No current':'Current flowing';
    return h('section',{'aria-label':'3D circuit bench',className:'circuit-3d'},
      h('div',{className:'circuit-scene-heading'},
        h('div',null,h('span',{className:'circuit-eyebrow'},'SPATIAL VIEW'),h('h3',null,'Live circuit bench')),
        h('span',{className:'circuit-scene-status','data-state':solved.isShort?'warning':solved.isOpen||!solved.current?'idle':'active'},h('span',{'aria-hidden':true}),stateLabel)),
      h('div',{className:'circuit-scene-metrics'},
        h('div',null,h('span',null,'SUPPLY'),h('strong',null,solved.voltage.toFixed(1),h('small',null,' V'))),
        h('div',null,h('span',null,'CURRENT'),h('strong',null,circuitCurrentText(solved.current))),
        h('div',null,h('span',null,solved.timeDomain?'NET POWER':'POWER'),h('strong',null,circuitPowerText(solved.power)))),
      d.sceneCurrent&&h('div',{className:'circuit-flow-legend',id:'circuit-flow-note',role:'status','aria-live':solved.timeDomain&&d.simRunning?'off':'polite'},
        h('span',{className:'circuit-flow-symbol','aria-hidden':true},selectedRow&&Math.abs(selectedRow.current)>1e-12?(selectedRow.current<0?'←':'→'):'—'),
        h('div',null,h('strong',null,!selectedRow?'Add a part to trace current':selectedRow.current===0?(solved.mode!=='series'?'No current in selected branch':'No current in this path'):(solved.mode!=='series'?'Tracing branch '+(solved.mode==='mixed'?String.fromCharCode(64+selectedRow.branch):selectedIndex+1):'Tracing the series path')),
          h('p',null,solved.timeDomain?'Arrows follow instantaneous conventional current. Negative current means flow opposite the N0 → N1 reference; arrows show direction, not speed.':selectedRow&&selectedRow.current>0?'Conventional current: + to − through the external circuit. Arrows show direction, not speed or electron motion.':solved.current>0?'Other branches still carry current. Choose a conducting branch to follow its path.':'Arrows appear when the selected path carries current.'),
          solved.mode!=='series'&&selectedRow&&Math.abs(selectedRow.current)>1e-12&&h('p',null,'Selected branch: '+circuitCurrentText(selectedRow.current)+' · Source total: '+circuitCurrentText(solved.current)+'. Shared rails carry combined branch currents.'),
          focus&&h('p',null,'Close-up shows part of the path. Reset camera to return to the overview.'))),
      h('div',{className:'circuit-frame-bar'},
        h('div',{className:'circuit-frame-mode',role:'group','aria-label':'Scene drag action'},
          h('button',{type:'button','aria-pressed':!panning,onClick:function(){props.update('cameraDragMode','orbit');}},'Orbit'),
          h('button',{type:'button','aria-pressed':panning,onClick:function(){props.update('cameraDragMode','pan');}},'Pan')),
        h('div',{className:'circuit-frame-zoom',role:'group','aria-label':'Scene magnification'},
          h('button',{type:'button','aria-label':'Zoom out',disabled:camera.zoom<=.6,onClick:function(){props.update('cameraZoom',Math.max(.6,Math.round((camera.zoom-.1)*100)/100));}},'−'),
          h('span',{'aria-live':'polite'},Math.round(camera.zoom*100)+'%'),
          h('button',{type:'button','aria-label':'Zoom in',disabled:camera.zoom>=1.8,onClick:function(){props.update('cameraZoom',Math.min(1.8,Math.round((camera.zoom+.1)*100)/100));}},'+')),
        h('button',{type:'button',className:'circuit-frame-center',disabled:!camera.x&&!camera.y,onClick:function(){props.updateMany({cameraPanX:0,cameraPanY:0});}},'Center view')),
      h('div',{className:'circuit-scene-viewport','data-dragging':dragging,'data-drag-mode':panning?'pan':'orbit','aria-describedby':'circuit-camera-help',onPointerDown:startDrag,onPointerMove:moveDrag,onPointerUp:endDrag,onPointerCancel:endDrag,onLostPointerCapture:endDrag},
      h('svg', {ref:sceneRef,viewBox:'0 0 640 410',role: 'img','aria-label':'Rotatable 3D representation of the '+solved.mode+' circuit with '+count+' parts. '+circuitCurrentText(solved.current)+'. Read individual measurements below.','aria-describedby':[d.sceneCurrent?'circuit-flow-note':'',d.sceneProbes?'circuit-probe-help':''].filter(Boolean).join(' ')||undefined},
        h('defs',null,
          solved.rows.map(function(r,i){return h('radialGradient',{key:i,id:'circuit-light-pool-'+i},h('stop',{offset:'0%',stopColor:r.component.type==='led'?(r.component.ledColor||'#ef4444'):'#fbbf24',stopOpacity:.45}),h('stop',{offset:'100%',stopColor:'#153744',stopOpacity:0}));}),
          h('radialGradient',{id:'circuit-3d-backdrop',cx:'48%',cy:'45%',r:'70%'},h('stop',{offset:'0%',stopColor:'#21495c'}),h('stop',{offset:'100%',stopColor:'#081723'})),
          h('radialGradient',{id:'circuit-bulb-bloom'},h('stop',{offset:'0%',stopColor:'#ffda80',stopOpacity:.35}),h('stop',{offset:'40%',stopColor:'#fbbf24',stopOpacity:.14}),h('stop',{offset:'100%',stopColor:'#fbbf24',stopOpacity:0})),
          h('radialGradient',{id:'circuit-glass-warm',cx:'30%',cy:'22%',r:'78%'},h('stop',{offset:'0%',stopColor:'#fffef0',stopOpacity:.95}),h('stop',{offset:'30%',stopColor:'#fceca4',stopOpacity:.72}),h('stop',{offset:'75%',stopColor:'#dfa855',stopOpacity:.22}),h('stop',{offset:'100%',stopColor:'#fff0b5',stopOpacity:.62})),
          h('radialGradient',{id:'circuit-glass-cool',cx:'30%',cy:'22%',r:'78%'},h('stop',{offset:'0%',stopColor:'#effaff',stopOpacity:.85}),h('stop',{offset:'35%',stopColor:'#bae6fd',stopOpacity:.12}),h('stop',{offset:'100%',stopColor:'#c6def0',stopOpacity:.42})),
          h('filter',{id:'circuit-board-shadow',x:'-25%',y:'-25%',width:'150%',height:'150%'},h('feGaussianBlur',{stdDeviation:12}))),
        h('rect',{width:640,height:410,fill:'url(#circuit-3d-backdrop)'}),
        h('ellipse',{cx:325,cy:290,rx:248,ry:66,fill:'#020913',opacity:.65,filter:'url(#circuit-board-shadow)'}),
        groundFaces.map(function(f,i){return h('g',{key:'ground-'+i},f.node);}),
        wireFaces.map(function(f,i){return h('g',{key:'wire-'+i},f.node);}),
        flowNodes,
        faces.map(function(f,i){return h('g',{key:i},f.node);}),
        labels.map(function(l,i){return (!l.part||d.sceneLabels!==false)&&(!focus||!l.part||l.index===selectedIndex)?h('g',{key:i},l.node):null;}),
        probeMarkers,
        !count&&h('text',{x:355,y:220,fill:'#cbd5e1',textAnchor:'middle',fontSize:16},'Your next idea starts here.')),

        h('div',{className:'circuit-scene-pins',role:'group','aria-label':'Select a component directly in the 3D scene'},
          solved.rows.map(function(row,i){
            if(d.sceneLabels===false||(focus&&i!==selectedIndex))return null;
            var p=positions[i],height=row.component.type==='bulb'?(focus?90:120):row.component.type==='capacitor'?(focus?70:95):row.component.type==='led'?(focus?60:85):(focus?45:75);
            var anchor=project(p.x,p.y,height);
            if(anchor[0]<12||anchor[0]>628||anchor[1]<12||anchor[1]>398)return null;
            return h('button',{key:i,type:'button',className:'circuit-scene-pin','aria-label':'Select '+row.component.type+' '+(i+1)+' in 3D scene','aria-pressed':selectedIndex===i,
              title:(i+1)+'. '+row.component.type+' · '+circuitCurrentText(row.current),
              style:{left:(anchor[0]/640*100)+'%',top:(anchor[1]/410*100)+'%'},
              onClick:function(){props.update('selectedPart',i);}},String(i+1));
          })),
        h('div',{className:'circuit-scene-probe-pins','aria-hidden':true},probePins)
      ),
      h('div',{className:'circuit-scene-caption',id:'circuit-camera-help'},h('strong',null,focus?'Close-up · '+solved.rows[selectedIndex].component.type:solved.mode+' circuit · spatial view'),h('span',null,panning?'Drag to move the scene. On touch screens, swipe sideways to pan; swipe vertically to scroll. Use Position controls for either direction.':'Drag to orbit · tap a number to inspect. Zoom changes the view, not the circuit. Reset camera restores the overview.')),
      h('div',{className:'circuit-camera'},
        h('label',null,'Zoom ',h('input',{type:'range',min:60,max:180,step:5,value:Math.round(camera.zoom*100),'aria-label':'3D camera zoom','aria-valuetext':Math.round(camera.zoom*100)+' percent',onChange:function(e){props.update('cameraZoom',Number(e.target.value)/100);}})),
        h('label',null,'Orbit ',h('input',{type:'range',min:-80,max:80,value:d.cameraYaw==null?-22:d.cameraYaw,'aria-label':'3D camera orbit',onChange:function(e){props.update('cameraYaw',Number(e.target.value));}})),
        h('label',null,'Tilt ',h('input',{type:'range',min:20,max:85,value:d.cameraTilt==null?48:d.cameraTilt,'aria-label':'3D camera tilt',onChange:function(e){props.update('cameraTilt',Number(e.target.value));}})),
        h('div',{className:'circuit-camera-actions'},
          h('button',{type:'button',onClick:function(){props.updateMany({cameraYaw:0,cameraTilt:85});}},'Top view'),
          h('button',{type:'button',onClick:function(){props.updateMany({cameraYaw:-22,cameraTilt:48,sceneCloseup:false,cameraZoom:1,cameraPanX:0,cameraPanY:0,cameraDragMode:'orbit'});}},'Reset camera'),
          h('button',{type:'button',disabled:!count,'aria-pressed':!!d.sceneCloseup,onClick:function(){props.updateMany({sceneCloseup:!d.sceneCloseup,cameraZoom:1,cameraPanX:0,cameraPanY:0});}},'Close-up'),
          h('button',{type:'button','aria-pressed':!!d.sceneCurrent,'aria-controls':d.sceneCurrent?'circuit-flow-note':undefined,onClick:function(){props.update('sceneCurrent',!d.sceneCurrent);}},'Current direction'),
          h('button',{type:'button',disabled:!count||exporting.current,onClick:saveBenchImage,'aria-describedby':'circuit-image-help'},exporting.current?'Preparing image…':'Save bench image'),
          h('button',{type:'button','aria-pressed':d.sceneLabels!==false,onClick:function(){props.update('sceneLabels',d.sceneLabels===false);}},'Labels'))),
      h('details',{className:'circuit-position-controls'},
        h('summary',null,'Position controls',h('span',null,'Fine-tune the framing')),
        h('div',null,
          h('label',null,'Horizontal ',h('input',{type:'range',min:-220,max:220,step:5,value:camera.x,'aria-label':'3D camera horizontal position',onChange:function(e){props.update('cameraPanX',Number(e.target.value));}})),
          h('label',null,'Vertical ',h('input',{type:'range',min:-150,max:150,step:5,value:camera.y,'aria-label':'3D camera vertical position',onChange:function(e){props.update('cameraPanY',Number(e.target.value));}})))),
      h('div',{className:'circuit-image-help',id:'circuit-image-help'},h('p',null,'Save a PNG of this view with a table of every part’s readings.'),h('p',{role:'status'},exportMessage)),
      h('details',{className:'circuit-probe-panel',open:!!d.sceneProbes,onToggle:function(e){if(e.currentTarget.open!==!!d.sceneProbes)props.update('sceneProbes',e.currentTarget.open);}},
        h('summary',null,'Virtual voltmeter',h('span',null,'Measure between two points')),
        h('p',{id:'circuit-probe-help'},'Choose the red (+) and black (−) probe points. The reading is V(red) − V(black). These ideal probes do not draw current.'),
        solved.mode!=='mixed'&&h(CircuitProbePractice,{React:props.React,state:d,solved:solved,selectedIndex:selectedIndex,updateMany:props.updateMany}),
        h('div',{className:'circuit-probe-controls'},
          [{key:'probeRed',label:'Red (+) lead',value:probe.red},{key:'probeBlack',label:'Black (−) lead',value:probe.black}].map(function(lead){return h('div',{key:lead.key},h('label',{htmlFor:'circuit-'+lead.key},lead.label),h('select',{id:'circuit-'+lead.key,value:lead.value,onChange:function(e){props.update(lead.key,Number(e.target.value));}},probe.nodes.map(function(node,i){return h('option',{key:i,value:i},node.label);})));})),
        h('div',{className:'circuit-probe-display',role:'status','aria-live':solved.timeDomain&&d.simRunning?'off':'polite'},
          h('span',null,'V(red) − V(black)'),h('strong',null,circuitPreciseVoltageText(probe.voltage)),
          h('p',null,probe.voltage==null?'At least one point has an undetermined potential in this model. This is not a zero reading.':probe.red===probe.black?'Both probes touch the same node, so the voltage difference is zero.':probe.voltage<0?'The red probe is at a lower potential than the black probe. The negative sign indicates lead orientation.':probe.voltage===0?'These two points are at the same potential. Zero voltage difference does not necessarily mean zero current.':'The red probe is at a higher potential than the black probe.')),
        h('div',{className:'circuit-action-row'},
          h('button',{type:'button',onClick:function(){props.updateMany({probeRed:probe.black,probeBlack:probe.red});}},'Swap probe leads'),
          h('button',{type:'button',disabled:!count,onClick:function(){props.updateMany({probeRed:solved.mode==='mixed'?selectedRow.nodeA:solved.mode==='parallel'?0:selectedIndex,probeBlack:solved.mode==='mixed'?selectedRow.nodeB:solved.mode==='parallel'?1:selectedIndex+1});}},'Across selected part'),
          h('button',{type:'button',onClick:function(){props.updateMany({probeRed:0,probeBlack:solved.mode==='mixed'?1:probe.nodes.length-1});}},'Across source')),
        h('p',{className:'circuit-probe-tip'},solved.mode==='mixed'?'Each branch spans the same supply rails; intermediate nodes depend on the voltage drops within that branch. Editing wiring resets probes to the supply rails.':solved.mode==='parallel'?'All parallel parts connect to the same two rails. Their voltages match even when branch currents differ.':'A node is a connection shared by ideal wires. No voltage is lost along an ideal wire.'),
        (!!focus||camera.zoom>1||camera.x!==0||camera.y!==0)&&h('p',{className:'circuit-probe-tip'},'Framing may hide a probe. Reset camera to return to the overview.')),
      h(solved.mode==='mixed'?'details':props.React.Fragment,solved.mode==='mixed'?{className:'circuit-mixed-readings'}:null,
      solved.mode==='mixed'&&h('summary',null,'Inspect component readings'),
      selectedRow&&h('section',{className:'circuit-scene-insight','aria-label':'Selected 3D component readings','data-tone':insight.tone},
        h('div',{className:'circuit-selection-nav',role:'group','aria-label':'Step through 3D parts'},
          h('span',{className:'circuit-selection-position','aria-live':'polite','aria-atomic':true},'Part '+(selectedIndex+1)+' of '+count+' · '+(selectedRow.component.type==='led'?'LED':selectedRow.component.type)),
          h('div',null,
            h('button',{type:'button','aria-label':'Previous 3D part',disabled:selectedIndex===0,onClick:function(){props.update('selectedPart',selectedIndex-1);}},h('span',{'aria-hidden':true},'←'), ' Previous'),
            h('button',{type:'button','aria-label':'Next 3D part',disabled:selectedIndex===count-1,onClick:function(){props.update('selectedPart',selectedIndex+1);}},'Next ',h('span',{'aria-hidden':true},'→')))),
        h('div',{className:'circuit-scene-insight-title'},
          h('div',null,h('span',{className:'circuit-eyebrow'},'SELECTED PART '+String(selectedIndex+1).padStart(2,'0')),h('h4',null,selectedRow.component.type)),
          h('span',{className:'circuit-scene-insight-state'},insight.title)),
        h('p',{className:'circuit-scene-insight-topology'},solved.mode==='mixed'?'Branch '+String.fromCharCode(64+selectedRow.branch)+' · same current through every part in this branch':solved.mode==='parallel'?'Branch '+(selectedIndex+1)+' · shares the source voltage':'Series path · same current through every part'),
        h('dl',{className:'circuit-scene-readings'},
          h('div',null,h('dt',null,'Voltage across'),h('dd',null,circuitPreciseVoltageText(selectedRow.voltage))),
          h('div',null,h('dt',null,'Current through'),h('dd',null,circuitCurrentText(selectedRow.current))),
          h('div',null,h('dt',null,'Power transferred'),h('dd',null,circuitPowerText(selectedRow.power)))),
        h('details',{key:selectedIndex+'-'+selectedRow.component.type},h('summary',null,'Understand this reading'),
          h('p',null,insight.body),
          selectedRow.voltage==null&&h('p',{className:'circuit-scene-ambiguity'},'Voltage is undetermined: this model cannot assign individual voltages across multiple blocking parts. It does not simulate initial capacitor charge or diode leakage.'),
          h('p',{className:'circuit-scene-prompt'},h('strong',null,'Think it through: '),insight.prompt)),
        h('div',{className:'circuit-action-row circuit-scene-insight-actions'},
          (selectedRow.component.type==='switch'||selectedRow.component.type==='led')&&h('button',{type:'button',onClick:changeSelected},selectedRow.component.type==='switch'?(selectedRow.component.closed?'Open switch in 3D':'Close switch in 3D'):(selectedRow.component.reversed?'Restore LED polarity in 3D':'Reverse LED in 3D')),
          h('button',{type:'button',onClick:editSelected},'Edit selected part'))),
      h('div',{className:'circuit-part-picker-heading'},'INSPECT & COMPARE',h('span',null,count+' connected')),
      count>0&&h('div',{className:'circuit-part-compare'},
        h('label',{htmlFor:'circuit-part-compare'},'Compare parts by'),
        h('select',{id:'circuit-part-compare',value:compareMetric,'aria-describedby':comparing?'circuit-part-compare-scale':undefined,onChange:function(e){props.update('sceneCompare',e.target.value);}},
          h('option',{value:'details'},'Component details'),h('option',{value:'voltage'},'Voltage across'),h('option',{value:'current'},'Current through'),h('option',{value:'power'},'Power transferred')),
        comparing&&h('div',{id:'circuit-part-compare-scale',className:'circuit-compare-scale'},
          h('p',null,compareMax>0?(solved.timeDomain?'Magnitude scale · signs show direction · longest bar = ':'Shared scale · longest bar = ')+compareText(compareMax):compareUnknown?'No positive known readings to scale.':'All '+compareMetric+' readings are zero.'),
          h('p',null,compareLesson),
          compareUnknown&&h('p',null,'Striped bars mean undetermined, not zero.'))),
      h('div',{className:'circuit-action-row circuit-part-picker','aria-label':'Select a part on the 3D bench'},solved.rows.map(function(r,i){
        var c=r.component,detail=c.type==='resistor'?c.value+' Ω':c.type==='capacitor'?c.value+' µF':c.type==='inductor'?c.value+' mH':c.type==='switch'?(c.closed?'Closed':'Open'):c.type==='voltmeter'?circuitPreciseVoltageText(r.voltage):circuitCurrentText(r.current);
        return h('button',{key:i,type:'button','aria-pressed':selectedIndex===i,'aria-label':'Inspect 3D part '+(i+1)+' '+c.type,'aria-describedby':'circuit-part-reading-'+i,onClick:function(){props.update('selectedPart',i);}},
          h('span',{className:'circuit-part-number'},String(i+1).padStart(2,'0')),
          h('span',{className:'circuit-part-copy'},h('strong',null,c.type==='led'?'LED':c.type),
            h('small',{id:'circuit-part-reading-'+i},comparing?compareText(r[compareMetric]):detail),
            comparing&&h('span',{className:'circuit-compare-track','data-metric':compareMetric,'data-unknown':r[compareMetric]==null,'aria-hidden':true},
              h('span',{style:{width:(r[compareMetric]==null?0:compareMax>0?Math.abs(r[compareMetric])/compareMax*100:0)+'%'}}))));
      })),
      ),
      h('p',{className:'circuit-help'},solved.timeDomain?'Rose rail is N0; blue rail is N1. Signed readings and arrows follow the selected instant. Geometry is illustrative.':'Rose wire leaves +; blue wire returns to −. Geometry is illustrative, not a breadboard wiring guide.')
    );
  }

  // ── Grade band helpers ──
  var getGradeBand = function(ctx) {
    var g = parseInt(ctx.gradeLevel, 10);
    if (isNaN(g) || g <= 2) return 'k2';
    if (g <= 5) return 'g35';
    if (g <= 8) return 'g68';
    return 'g912';
  };
  var gradeText = function(k2, g35, g68, g912) {
    return function(band) {
      if (band === 'k2') return k2;
      if (band === 'g35') return g35;
      if (band === 'g68') return g68;
      return g912;
    };
  };

  // ── Circuit Builder CSS animations ──
  if (!document.getElementById('circuit-css-anims')) {
    var circStyle = document.createElement('style');
    circStyle.id = 'circuit-css-anims';
    circStyle.textContent = [
      '@keyframes circuitPulse { 0%, 100% { box-shadow: 0 0 4px rgba(59,130,246,0.15); } 50% { box-shadow: 0 0 12px rgba(59,130,246,0.3); } }',
      '@keyframes circuitZap { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }',
      '@keyframes circuitSlideIn { 0% { opacity: 0; transform: translateY(8px); } 100% { opacity: 1; transform: translateY(0); } }',
      '@keyframes circuitShortSpark { 0% { opacity: 0; } 20% { opacity: 1; background: rgba(239,68,68,0.15); } 100% { opacity: 0; } }',
      '@keyframes electronGlow { 0%, 100% { filter: drop-shadow(0 0 2px rgba(59,130,246,0.4)); } 50% { filter: drop-shadow(0 0 6px rgba(59,130,246,0.8)); } }',
      '@keyframes circuitBadgePop { 0% { transform: scale(0); } 60% { transform: scale(1.2); } 100% { transform: scale(1); } }',
      '@keyframes neonPulse { 0%, 100% { border-color: rgba(234, 179, 8, 0.4); box-shadow: 0 0 8px rgba(234, 179, 8, 0.2); } 50% { border-color: rgba(234, 179, 8, 0.8); box-shadow: 0 0 16px rgba(234, 179, 8, 0.4); } }',
      '@keyframes shortRedFlash { 0%, 100% { border-color: rgba(239, 68, 68, 0.4); box-shadow: 0 0 8px rgba(239, 68, 68, 0.2); } 50% { border-color: rgba(239, 68, 68, 1); box-shadow: 0 0 16px rgba(239, 68, 68, 0.5); } }',
      // Drift-vs-field paradox: the signal RACES (fast sweep), electrons CRAWL (slow drift).
      '@keyframes circSignalRace { 0% { transform: translateX(-14px); opacity: 0; } 8% { opacity: 1; } 78% { opacity: 1; } 100% { transform: translateX(360px); opacity: 0; } }',
      '@keyframes circElectronDrift { 0% { transform: translateX(0); } 100% { transform: translateX(52px); } }',
      '.circ-signal-pulse { animation: circSignalRace 0.9s linear infinite; }',
      '.circ-electron-drift { animation: circElectronDrift 6s linear infinite; }',
      '.circuit-card { animation: circuitSlideIn 0.3s ease-out; }',
      '.circuit-badge { animation: circuitBadgePop 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55); }',
      '.circuit-active { animation: circuitPulse 2s ease-in-out infinite; }',
      '.circuit-short { animation: circuitShortSpark 0.8s ease-out; }',
      '[data-circuit-builder-root] :focus-visible { outline: 2px solid #eab308 !important; outline-offset: 2px !important; box-shadow: 0 0 0 4px rgba(234, 179, 8, 0.4) !important; }',
      '[data-circuit-builder-root] .glass-panel { background: var(--allo-stem-deeper, rgba(15, 23, 42, 0.6)) !important; backdrop-filter: blur(12px) !important; border: 1px solid var(--allo-stem-border, rgba(255, 255, 255, 0.08)) !important; }',
      '.short-active-flash { animation: shortRedFlash 1s ease-in-out infinite !important; }',
      '.glow-button { transition: all 0.2s ease; }',
      '.glow-button:hover { transform: translateY(-1px); box-shadow: 0 0 10px currentColor; }',
      '@media (prefers-reduced-motion: reduce) { .circ-signal-pulse, .circ-electron-drift, .circuit-card, .circuit-badge, .circuit-active, .circuit-short, .short-active-flash { animation: none !important; } .glow-button { transition: none !important; } .glow-button:hover { transform: none !important; } }'
    ].join('\n');
    circStyle.textContent += "\n[data-circuit-builder-root] .circuit-lab-workflow,[data-circuit-builder-root] .circuit-part-inspector{border:1px solid #315066;border-radius:16px;background:linear-gradient(125deg,#0d2636,#0f172a);padding:18px;margin:16px 0}\n[data-circuit-builder-root] .circuit-step-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}\n[data-circuit-builder-root] .circuit-eyebrow{font-size:11px;letter-spacing:.13em;color:#67e8f9;font-weight:800}\n[data-circuit-builder-root] .circuit-step-heading h3{font-size:20px;font-weight:750;margin:6px 0}\n[data-circuit-builder-root] .circuit-model-chip{font-size:11px;color:#bae6fd;border:1px solid #155e75;border-radius:20px;padding:5px 10px}\n[data-circuit-builder-root] .circuit-help{font-size:12px;line-height:1.65;color:#cbd5e1;margin:8px 0}\n[data-circuit-builder-root] .circuit-prediction-label{display:block;font-size:12px;font-weight:700;color:#e2e8f0;margin:12px 0 6px}\n[data-circuit-builder-root] textarea{width:100%;background:#071520;border:1px solid #527286;color:#f1f5f9;border-radius:9px;padding:10px;font-size:14px;resize:vertical}\n[data-circuit-builder-root] textarea::placeholder{color:#94a3b8}\n[data-circuit-builder-root] .circuit-action-row{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:10px 0}\n[data-circuit-builder-root] .circuit-action-row button,[data-circuit-builder-root] .circuit-camera button,[data-circuit-builder-root] .circuit-part-inspector button{min-height:40px;border:1px solid #547086;border-radius:9px;padding:8px 12px;background:#122d40;color:#e0f2fe;font-size:12px;font-weight:700}\n[data-circuit-builder-root] .circuit-action-row button[aria-pressed=true]{background:#a5f3fc;color:#083344;border-color:#a5f3fc}\n[data-circuit-builder-root] button:disabled{opacity:.45;cursor:not-allowed}\n[data-circuit-builder-root] .circuit-comparison{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}\n[data-circuit-builder-root] .circuit-comparison>div{padding:10px;border:1px solid #315066;border-radius:10px;background:#071520}\n[data-circuit-builder-root] .circuit-comparison span{display:block;font-size:11px;color:#cbd5e1}\n[data-circuit-builder-root] .circuit-comparison strong{display:block;font-size:18px;color:#a5f3fc;font-variant-numeric:tabular-nums;margin-top:5px}\n[data-circuit-builder-root] .circuit-evidence{color:#a7f3d0;font-size:13px;margin:12px 0}\n[data-circuit-builder-root] .circuit-notebook,[data-circuit-builder-root] .circuit-model-details{font-size:12px;line-height:1.7;color:#cbd5e1;margin:12px 0}\n[data-circuit-builder-root] summary{cursor:pointer;font-weight:700;min-height:32px}\n[data-circuit-builder-root] .circuit-notebook li{padding:10px;border-top:1px solid #315066}\n[data-circuit-builder-root] .circuit-view-toolbar{border-top:1px solid #315066;margin-top:20px;padding-top:16px}\n[data-circuit-builder-root] .circuit-3d{border:1px solid #315066;border-radius:16px;overflow:hidden;background:#071520}\n[data-circuit-builder-root] .circuit-3d svg{width:100%;height:auto;display:block}\n[data-circuit-builder-root] .circuit-camera{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:12px}\n[data-circuit-builder-root] .circuit-camera label{display:flex;align-items:center;gap:8px;font-size:12px;flex:1;min-width:180px}\n[data-circuit-builder-root] .circuit-camera input{width:100%;accent-color:#22d3ee;min-height:32px}\n[data-circuit-builder-root] .circuit-3d>.circuit-help{padding:0 14px 8px}\n[data-circuit-builder-root] .circuit-part-inspector{font-size:13px;padding:12px}\n[data-circuit-builder-root] .circuit-part-inspector select{background:#071520;border:1px solid #527286;border-radius:6px;color:#f1f5f9;padding:8px;max-width:100%}\n[data-circuit-builder-root] .circuit-part-inspector p{margin:10px 0;color:#a5f3fc;font-variant-numeric:tabular-nums}\n[data-circuit-builder-root] .circuit-model-note,[data-circuit-builder-root] .circuit-warning{padding:12px;border-left:3px solid #38bdf8;background:#0c2435;color:#e0f2fe;font-size:12px;line-height:1.6;margin:10px 0}\n[data-circuit-builder-root] .circuit-warning{border-color:#fbbf24;background:#362817;color:#fef3c7}\n[data-circuit-builder-root] .circuit-model-details a{color:#67e8f9;text-decoration:underline}\n@media(max-width:480px){[data-circuit-builder-root]{padding:12px!important}[data-circuit-builder-root] .circuit-lab-workflow{padding:12px}[data-circuit-builder-root] .circuit-comparison strong{font-size:14px}[data-circuit-builder-root] .circuit-comparison>div{padding:7px}}\n";
    circStyle.textContent += '\n[data-circuit-motion=paused] *,[data-circuit-motion=paused] *::before,[data-circuit-motion=paused] *::after {animation-play-state:paused!important;transition:none!important}';
    circStyle.textContent += "\n[data-circuit-builder-root] .circuit-time-lab{margin:18px 0;padding:16px;border:1px solid #4b6580;border-radius:14px;background:linear-gradient(135deg,#17243a,#092d36);color:#e2e8f0}\n[data-circuit-builder-root] .circuit-time-lab>summary{color:#a5f3fc;font-size:15px}\n[data-circuit-builder-root] .circuit-time-lab svg{width:100%;height:auto;margin:12px 0}\n[data-circuit-builder-root] .circuit-time-slider{display:block;font-size:13px;color:#e2e8f0;margin:12px 0}\n[data-circuit-builder-root] .circuit-time-slider input{display:block;width:100%;accent-color:#fbbf24;min-height:36px;margin:5px 0}\n[data-circuit-builder-root] .circuit-part-picker{padding:0 12px}\n[data-circuit-builder-root] #circuit-inspector-value{max-width:120px;padding:8px;border:1px solid #527286;border-radius:8px;background:#071520;color:#f1f5f9}\n[data-circuit-builder-root] [data-circuit-comparison] ul{padding-left:18px;list-style:disc;margin-top:6px}\n";
    circStyle.textContent += "\n/* Material bench presentation: scoped to the circuit tool. */\n[data-circuit-builder-root] {background:radial-gradient(ellipse at 8% 0%,#122b3a 0%,#081521 46%)!important;border-color:#2a4355!important;box-shadow:0 20px 65px #02091355!important}\n[data-circuit-builder-root] [data-circuit-bench] {padding:12px 0 18px;border-bottom:1px solid #263e50;margin-bottom:18px}\n[data-circuit-builder-root] #circuit-bench-title {font-size:clamp(26px,3.4vw,36px);line-height:1.13;letter-spacing:-.045em;font-weight:750;margin:10px 0 12px;color:#f0f7fb}\n[data-circuit-builder-root] [data-circuit-bench]>.circuit-help {max-width:640px;line-height:1.75;color:#b8cbd8;font-size:13px}\n[data-circuit-builder-root] .circuit-eyebrow {font-size:10px;letter-spacing:.16em;color:#95e1d6;font-weight:750}\n[data-circuit-builder-root] .circuit-action-row button {border-color:#365568;background:linear-gradient(180deg,#173244,#102735);box-shadow:inset 0 1px #ffffff06;transition:background .15s,border-color .15s}\n[data-circuit-builder-root] .circuit-action-row button:hover:not(:disabled) {background:#204557;border-color:#6d9caa}[data-circuit-builder-root] .circuit-action-row button[aria-pressed=true]:hover:not(:disabled){background:#a5f3fc;color:#083344;border-color:#a5f3fc}\n[data-circuit-builder-root] .circuit-action-row button[aria-pressed=true] {background:#b2eee1;border-color:#b2eee1;color:#0b353b;box-shadow:0 2px 12px #5edec316}\n[data-circuit-builder-root] .circuit-lab-workflow {background:#102330;border-color:#294354;border-radius:14px;padding:16px}\n[data-circuit-builder-root] .circuit-step-heading h3 {font-size:18px;line-height:1.35;letter-spacing:-.02em}\n[data-circuit-builder-root] .circuit-model-chip {color:#c3d7e0;border-color:#3c5b6d;background:#132a38;font-size:10px}\n[data-circuit-builder-root] .circuit-guided-lab>summary {color:#d6e8ef;font-size:12px;line-height:1.7;padding-top:7px}\n[data-circuit-builder-root] .circuit-view-toolbar {border-color:#294354;padding-top:18px;margin-top:22px}\n[data-circuit-builder-root] .circuit-3d {border:1px solid #345566;border-radius:18px;box-shadow:0 16px 38px #02091455,inset 0 1px #ffffff08;background:#0a1b28;isolation:isolate}\n[data-circuit-builder-root] .circuit-scene-heading {display:flex;align-items:center;justify-content:space-between;gap:12px;padding:19px 20px 13px;background:linear-gradient(115deg,#122d3d,#0d2231)}\n[data-circuit-builder-root] .circuit-scene-heading h3 {font-size:20px;font-weight:650;letter-spacing:-.03em;line-height:1.3;margin-top:4px;color:#eef8fc}\n[data-circuit-builder-root] .circuit-scene-status {display:flex;align-items:center;gap:7px;font-size:11px;color:#b9cbd8;background:#102534;border:1px solid #345364;border-radius:30px;padding:7px 10px;white-space:nowrap}\n[data-circuit-builder-root] .circuit-scene-status>span {width:6px;height:6px;border-radius:50%;background:#94a3b8;flex:none}\n[data-circuit-builder-root] .circuit-scene-status[data-state=active] {color:#c1f3da;border-color:#386553}\n[data-circuit-builder-root] .circuit-scene-status[data-state=active]>span {background:#86efac;box-shadow:0 0 9px #86efac33}\n[data-circuit-builder-root] .circuit-scene-status[data-state=warning] {color:#fecaca;border-color:#7d4148}\n[data-circuit-builder-root] .circuit-scene-status[data-state=warning]>span {background:#fda4af}\n[data-circuit-builder-root] .circuit-scene-metrics {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-bottom:1px solid #294353;padding:0 20px 14px;background:#102635}\n[data-circuit-builder-root] .circuit-scene-metrics>div {padding:4px 16px;border-left:1px solid #2a4351;min-width:0}\n[data-circuit-builder-root] .circuit-scene-metrics>div:first-child {padding-left:0;border:0}\n[data-circuit-builder-root] .circuit-scene-metrics span {display:block;font-size:9px;letter-spacing:.13em;color:#a6bfcd;margin-bottom:6px}\n[data-circuit-builder-root] .circuit-scene-metrics strong {font-family:ui-monospace,SFMono-Regular,Consolas,monospace;display:block;font-size:clamp(14px,2.1vw,21px);font-weight:500;color:#e2f6fa;line-height:1.2;overflow-wrap:anywhere}\n[data-circuit-builder-root] .circuit-scene-metrics small {font:inherit;color:#9dbbca;font-size:.7em}\n[data-circuit-builder-root] .circuit-3d>svg {background:#081725}\n[data-circuit-builder-root] .circuit-camera {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 24px;padding:16px 20px;background:#102330;border-top:1px solid #294453;border-bottom:1px solid #294453}\n[data-circuit-builder-root] .circuit-camera label {min-width:0;display:grid;grid-template-columns:auto minmax(0,1fr);gap:10px;color:#bcd0dc;font-size:11px}\n[data-circuit-builder-root] .circuit-camera input {min-width:0;accent-color:#a5e8db}\n[data-circuit-builder-root] .circuit-camera-actions {grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px}\n[data-circuit-builder-root] .circuit-camera button {min-height:34px;background:#142f40;border-color:#385969;padding:6px 12px;font-size:11px;color:#d8eaf1}\n[data-circuit-builder-root] .circuit-camera button[aria-pressed=true] {background:#234a4d;color:#c5f6eb;border-color:#548782}\n[data-circuit-builder-root] .circuit-part-picker-heading {display:flex;justify-content:space-between;gap:8px;color:#aac2cf;font-size:9px;letter-spacing:.12em;padding:19px 20px 0}\n[data-circuit-builder-root] .circuit-part-picker-heading span {letter-spacing:0;color:#bed0dc;font-size:10px}\n[data-circuit-builder-root] .circuit-part-picker {display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:9px;padding:0 20px;margin:10px 0 12px}\n[data-circuit-builder-root] .circuit-part-picker button {position:relative;display:flex;gap:10px;align-items:center;text-align:left;min-height:65px;padding:10px 12px;border-radius:10px;background:#102735;border-color:#2e4c5d;min-width:0}\n[data-circuit-builder-root] .circuit-part-picker button[aria-pressed=true] {background:#193f47;border-color:#7ad4cb;color:#e6fffa;box-shadow:inset 0 0 0 1px #82d8cf22}\n[data-circuit-builder-root] .circuit-part-number {display:grid;place-items:center;flex:none;width:28px;height:28px;border-radius:8px;background:#233e4f;color:#c3d3df;font:11px ui-monospace,Consolas,monospace}\n[data-circuit-builder-root] .circuit-part-picker button[aria-pressed=true] .circuit-part-number {background:#b1ecdf;color:#123c40}\n[data-circuit-builder-root] .circuit-part-copy {display:grid;gap:4px;min-width:0}\n[data-circuit-builder-root] .circuit-part-copy strong {font-size:12px;font-weight:650;text-transform:capitalize;line-height:1.3}\n[data-circuit-builder-root] .circuit-part-copy small {font-size:11px;color:#bbd0db;font-weight:400;line-height:1.3}\n[data-circuit-builder-root] .circuit-3d>.circuit-help {padding:0 20px 16px;margin:0;color:#b6cbd6;font-size:11px;line-height:1.7}\n[data-circuit-builder-root] .circuit-part-inspector {border-color:#3c6470;background:linear-gradient(120deg,#173340,#102430);box-shadow:inset 3px 0 #85dbcf;padding:16px}\n[data-circuit-builder-root] .circuit-part-inspector>label {font-size:12px;color:#d8e9ef;font-weight:650;margin-right:8px}\n[data-circuit-builder-root] .circuit-part-inspector>p {color:#c7f4e8;font-size:13px;line-height:1.8}\n[data-circuit-builder-root] .circuit-comparison>div {background:#0c2130;border-color:#335363;border-radius:10px}\n[data-circuit-builder-root] .circuit-comparison strong {color:#b8ece2}\n[data-circuit-builder-root] .circuit-time-lab {background:linear-gradient(135deg,#142d3d,#11343b);border-color:#3c6070}\n@media(max-width:600px) {\n[data-circuit-builder-root] .circuit-scene-heading {padding:15px 13px 12px;align-items:flex-start;flex-wrap:wrap}\n[data-circuit-builder-root] .circuit-scene-heading h3 {font-size:19px}\n[data-circuit-builder-root] .circuit-scene-status {padding:5px 8px;font-size:10px}\n[data-circuit-builder-root] .circuit-scene-metrics {padding:0 13px 13px}\n[data-circuit-builder-root] .circuit-scene-metrics>div {padding:3px 8px}\n[data-circuit-builder-root] .circuit-scene-metrics strong {font-size:14px}\n[data-circuit-builder-root] .circuit-camera {padding:13px;gap:8px 15px}\n[data-circuit-builder-root] .circuit-camera-actions {gap:6px}\n[data-circuit-builder-root] .circuit-camera button {padding:6px 10px}\n[data-circuit-builder-root] .circuit-part-picker-heading {padding:16px 13px 0}\n[data-circuit-builder-root] .circuit-part-picker {padding:0 13px;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}\n[data-circuit-builder-root] .circuit-part-picker button {padding:9px;gap:7px}\n[data-circuit-builder-root] .circuit-part-number {width:23px;height:27px}\n[data-circuit-builder-root] .circuit-3d>.circuit-help {padding:0 13px 14px}\n[data-circuit-builder-root] .circuit-part-inspector {padding:13px}\n}\n@media(prefers-reduced-motion:reduce) {[data-circuit-builder-root] .circuit-action-row button{transition:none}}\n";
    circStyle.textContent += "\n[data-circuit-builder-root] .circuit-parts-shelf{margin:14px 0 18px;padding:16px;background:#102633;border:1px solid #355261;border-radius:16px}\n[data-circuit-builder-root] .circuit-parts-shelf h3{font-size:16px;color:#ecf9fc;font-weight:700;margin:0 0 10px}\n[data-circuit-builder-root] .circuit-parts-shelf .circuit-supply-row{display:flex;align-items:center;gap:12px;border-bottom:1px solid #34515f;padding-bottom:12px;margin-bottom:12px}\n[data-circuit-builder-root] .circuit-supply-row input{min-width:40px;accent-color:#a5e8db;min-height:36px}\n[data-circuit-builder-root] .circuit-supply-row>span:first-child{font-size:12px;color:#d2e6ee}\n[data-circuit-builder-root] .circuit-supply-row>span:last-child{color:#b1eddf;font-size:18px;width:64px}\n[data-circuit-builder-root] .circuit-parts-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}\n[data-circuit-builder-root] .circuit-parts-grid button{display:block;text-align:left;min-height:66px;padding:10px;border:1px solid #456474;border-radius:10px;background:#163241;color:#e1f2f7;font-size:12px;line-height:1.4}\n[data-circuit-builder-root] .circuit-parts-grid button:hover{background:#254a58;border-color:#9ad4cf}\n[data-circuit-builder-root] .circuit-parts-grid button small{display:block;margin-top:5px;font-size:10px;line-height:1.4;color:#b9d2dd;font-weight:400}\n[data-circuit-builder-root] .circuit-parts-grid button[data-circuit-clear]{background:#322735;border-color:#735361;color:#f5d6dc}\n[data-circuit-builder-root] .circuit-parts-grid>span{grid-column:1/-1;font-size:11px}\n[data-circuit-builder-root] .circuit-lessons{margin:14px 0;padding:14px 16px;border:1px solid #4b687a;border-radius:14px;background:linear-gradient(130deg,#152f42,#182b3a);color:#dbeaf2}\n[data-circuit-builder-root] .circuit-lessons>summary{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;list-style:none;font-size:14px;min-height:32px}\n[data-circuit-builder-root] .circuit-lessons>summary::before{content:'+';font-size:20px;color:#a9eee0}\n[data-circuit-builder-root] .circuit-lessons[open]>summary::before{content:'−'}\n[data-circuit-builder-root] .circuit-lessons>summary>span{flex:1;min-width:150px}\n[data-circuit-builder-root] .circuit-lessons>summary small{font-size:10px;color:#bdd0de;font-weight:400}\n[data-circuit-builder-root] .circuit-lesson-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0}\n[data-circuit-builder-root] .circuit-lesson-cards button{padding:14px 12px;text-align:left;background:#102431;border:1px solid #456171;border-radius:10px;color:#e1eff7;min-width:0}\n[data-circuit-builder-root] .circuit-lesson-cards strong{display:block;font-size:14px;line-height:1.4;margin-top:8px}\n[data-circuit-builder-root] .circuit-lesson-cards button[aria-pressed=true]{border-color:#a9e8d9;background:#214650}\n[data-circuit-builder-root] .circuit-learning-steps{list-style:none;display:flex;gap:8px;margin:18px 0;padding:0}\n[data-circuit-builder-root] .circuit-learning-steps li{flex:1;border-bottom:2px solid #476373;padding:8px 2px;font-size:12px;color:#b9cbd6}\n[data-circuit-builder-root] .circuit-learning-steps li[aria-current=step]{color:#c9fff0;border-color:#9eedcf;font-weight:700}\n[data-circuit-builder-root] .circuit-lesson-body fieldset{border:0;padding:0;margin:14px 0;min-width:0}\n[data-circuit-builder-root] .circuit-lesson-body legend{font-size:15px;line-height:1.6;font-weight:600}\n[data-circuit-builder-root] .circuit-lesson-evidence>p{font-size:13px;line-height:1.8;margin:14px 0;color:#d8ecef}\n[data-circuit-builder-root] .circuit-lesson-evidence .circuit-change-label{font:12px/1.6 system-ui;overflow-wrap:anywhere}\n[data-circuit-builder-root] .circuit-lesson-evidence>label{display:block;margin-top:18px;font-size:13px;font-weight:700}\n[data-circuit-builder-root] .circuit-lessons textarea{box-sizing:border-box;width:100%;padding:12px;resize:vertical;background:#081d2b;color:#e6f5fa;border:1px solid #628192;border-radius:9px;font-size:13px;line-height:1.6}\n[data-circuit-builder-root] .circuit-live-coach{padding:16px 18px;margin:12px 0 18px;border:1px solid #3a696b;border-radius:14px;background:linear-gradient(110deg,#173c42,#112c39);color:#d3e9ed}\n[data-circuit-builder-root] .circuit-live-coach[data-tone=warning]{background:#352c25;border-color:#97764d}\n[data-circuit-builder-root] .circuit-live-coach h3{margin:6px 0;font-size:18px;font-weight:650;color:#effcff;letter-spacing:-.02em}\n[data-circuit-builder-root] .circuit-live-coach p{font-size:13px;line-height:1.8;margin:6px 0}\n[data-circuit-builder-root] .circuit-live-coach>button{margin-top:8px;border:1px solid #7aabae;padding:7px 12px;border-radius:8px;color:#e1fcf4;background:#244852;font-size:12px}\n[data-circuit-builder-root] .circuit-reading-map{margin-top:12px;padding-top:12px;border-top:1px solid #41616c}\n[data-circuit-builder-root] .circuit-reading-map summary{font-size:12px;color:#cef0e7}\n[data-circuit-builder-root] .circuit-reading-map ul{list-style:none;padding:0;margin:12px 0;display:grid;gap:14px}\n[data-circuit-builder-root] .circuit-reading-label{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:12px}\n[data-circuit-builder-root] .circuit-reading-label strong{text-transform:capitalize}\n[data-circuit-builder-root] .circuit-reading-label span{font-variant-numeric:tabular-nums;color:#c8e9ee}\n[data-circuit-builder-root] .circuit-reading-track{height:7px;background:#071d29;border-radius:7px;overflow:hidden;margin:7px 0 4px}\n[data-circuit-builder-root] .circuit-reading-track span{display:block;height:100%;background:linear-gradient(90deg,#70bccc,#b3eed7);border-radius:7px}\n[data-circuit-builder-root] .circuit-reading-map small{font-size:10px;color:#bbd7de}\n[data-circuit-builder-root] .circuit-concept-key{border-top:1px solid #41616c;padding-top:8px}\n[data-circuit-builder-root] .circuit-concept-key p{font-size:11px}\n@media(max-width:600px){[data-circuit-builder-root] .circuit-parts-grid{grid-template-columns:repeat(2,minmax(0,1fr))}[data-circuit-builder-root] .circuit-lesson-cards{grid-template-columns:1fr}[data-circuit-builder-root] .circuit-lesson-cards button{padding:11px;display:flex;align-items:center;gap:12px}[data-circuit-builder-root] .circuit-lesson-cards strong{margin:0;font-size:12px}[data-circuit-builder-root] .circuit-lesson-cards .circuit-eyebrow{max-width:90px;font-size:9px}[data-circuit-builder-root] .circuit-parts-shelf,[data-circuit-builder-root] .circuit-lessons,[data-circuit-builder-root] .circuit-live-coach{padding:13px}}\n";
    circStyle.textContent += '[data-circuit-builder-root] .circuit-lesson-body fieldset button:disabled{opacity:1;color:#c5dce5}[data-circuit-builder-root] .circuit-lesson-body fieldset button:disabled[aria-pressed=true]{color:#0b353b}';
    circStyle.textContent += "\n[data-circuit-builder-root] .circuit-file-tools{margin:12px 0 16px;padding:12px 15px;border:1px solid #39596a;border-radius:12px;background:#102735}\n[data-circuit-builder-root] .circuit-file-tools>summary{color:#d8ecef;font-size:12px}\n[data-circuit-builder-root] .circuit-file-tools input[type=file]{font-size:12px;color:#c9dce5;min-width:0;max-width:100%}\n[data-circuit-builder-root] .circuit-file-tools input::file-selector-button{font:inherit;padding:9px 12px;margin-right:8px;border:1px solid #5d7c8d;border-radius:8px;background:#1b3a4c;color:#e3f5f8;cursor:pointer}\n[data-circuit-builder-root] .circuit-file-label{font-size:12px;font-weight:700;color:#dceaf1}\n[data-circuit-builder-root] .circuit-file-preview{padding:14px;margin:12px 0 0;border:1px solid #5d8c89;border-radius:10px;background:#13323b}\n[data-circuit-builder-root] .circuit-file-preview h4{font-size:17px;margin:7px 0;color:#e0fbf2;font-weight:650}\n[data-circuit-builder-root] .circuit-file-preview ol{padding:0 0 0 22px;margin:10px 0;color:#d0e5ed;font-size:12px;line-height:1.8;list-style:decimal}\n[data-circuit-builder-root] .circuit-file-error{font-size:12px!important;line-height:1.6;color:#ffdbbd!important;margin:8px 0}\n[data-circuit-builder-root] .circuit-inspector-readings{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:14px 0}\n[data-circuit-builder-root] .circuit-inspector-readings>div{padding:12px;background:#0a2431;border:1px solid #42626e;border-radius:10px;min-width:0}\n[data-circuit-builder-root] .circuit-inspector-readings dt{font-size:10px;color:#bad3de;line-height:1.5}\n[data-circuit-builder-root] .circuit-inspector-readings dd{font-family:ui-monospace,Consolas,monospace;color:#c4f9e7;font-size:clamp(13px,2vw,20px);line-height:1.5;margin:5px 0 0;overflow-wrap:anywhere}\n[data-circuit-builder-root] .circuit-value-editor{padding-top:10px;border-top:1px solid #43626e}\n[data-circuit-builder-root] .circuit-value-editor>label{display:block;font-size:12px;font-weight:700;color:#d4e9ee;margin:5px 0 8px}\n[data-circuit-builder-root] .circuit-value-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:13px}\n[data-circuit-builder-root] .circuit-value-controls button{min-height:36px;border:1px solid #6d989f;border-radius:8px;background:#254851;color:#e1fcf4;padding:7px 12px;font-size:12px}\n[data-circuit-builder-root] .circuit-value-editor #circuit-inspector-value{width:120px;max-width:100%;min-height:38px}\n[data-circuit-builder-root] .circuit-value-editor #circuit-inspector-value[aria-invalid=true]{border-color:#fdba74}\n[data-circuit-builder-root] .circuit-value-editor .circuit-help{font-size:11px;color:#c0d6df}\n@media(max-width:480px){[data-circuit-builder-root] .circuit-inspector-readings{gap:6px}[data-circuit-builder-root] .circuit-inspector-readings>div{padding:9px 7px}[data-circuit-builder-root] .circuit-file-tools{padding:12px}}\n";
    circStyle.textContent += "\n[data-circuit-builder-root] .circuit-3d{border-color:#426777;box-shadow:0 18px 48px #02091466,inset 0 1px #ffffff0a}\n[data-circuit-builder-root] .circuit-3d>svg{background:radial-gradient(ellipse at 50% 25%,#183c50,#071522);border-top:1px solid #44606c44}\n[data-circuit-builder-root] .circuit-scene-caption{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 20px;background:#0e2634;border-top:1px solid #355766;font-size:11px;color:#bdd6df}\n[data-circuit-builder-root] .circuit-scene-caption strong{font-size:11px;color:#c5f3e6;font-weight:600;text-transform:capitalize}\n[data-circuit-builder-root] .circuit-camera button[aria-pressed=true]{box-shadow:inset 0 0 0 1px #8fd6c933}\n[data-circuit-builder-root] .circuit-camera-actions{align-items:center}\n@media(max-width:600px){[data-circuit-builder-root] .circuit-scene-caption{padding:10px 13px;font-size:10px;flex-wrap:wrap}}\n";
    circStyle.textContent += "\n[data-circuit-builder-root] .circuit-scene-viewport{position:relative;isolation:isolate;overflow:hidden;touch-action:pan-y;cursor:grab;background:#081725}\n[data-circuit-builder-root] .circuit-scene-viewport[data-dragging=true]{cursor:grabbing}\n[data-circuit-builder-root] .circuit-scene-viewport>svg{display:block;width:100%;height:auto;user-select:none}\n[data-circuit-builder-root] .circuit-scene-pins{position:absolute;inset:0;pointer-events:none}\n[data-circuit-builder-root] .circuit-scene-pin{position:absolute;transform:translate(-50%,-50%);display:grid;place-items:center;min-height:0;width:25px;height:25px;padding:0;border:1px solid #9bbbc8;border-radius:50%;background:#0a2331eF;color:#e7f7fc;font:600 11px ui-monospace,Consolas,monospace;box-shadow:0 2px 8px #020b1599;cursor:pointer;pointer-events:auto}\n[data-circuit-builder-root] .circuit-scene-pin:hover{background:#315a66;border-color:#c6f5e6;box-shadow:0 0 0 4px #9ae8d322}\n[data-circuit-builder-root] .circuit-scene-pin[aria-pressed=true]{background:#b2efda;border-color:#e0fff4;color:#143f42;box-shadow:0 0 0 3px #8ae2c528,0 2px 8px #020b1555}\n[data-circuit-builder-root] .circuit-scene-caption{line-height:1.6}\n@media(max-width:600px){[data-circuit-builder-root] .circuit-scene-pin{width:26px;height:26px;font-size:10px}}\n";
    circStyle.textContent += "\n[data-circuit-builder-root] .circuit-scene-insight{margin:0 20px 18px;padding:16px;border:1px solid #3c655f;border-radius:12px;background:linear-gradient(120deg,#153536,#112837);box-shadow:inset 3px 0 #9ae7d6}\n[data-circuit-builder-root] .circuit-scene-insight-title{display:flex;align-items:center;justify-content:space-between;gap:12px}\n[data-circuit-builder-root] .circuit-scene-insight h4{font-size:18px;line-height:1.3;font-weight:650;text-transform:capitalize;color:#edfff9;margin:3px 0 0}\n[data-circuit-builder-root] .circuit-scene-insight-state{font-size:11px;color:#bef0de;background:#123e38;border:1px solid #417264;border-radius:20px;padding:5px 9px}\n[data-circuit-builder-root] .circuit-scene-insight[data-tone=warning]{border-color:#91694c;box-shadow:inset 3px 0 #f9c47d}\n[data-circuit-builder-root] .circuit-scene-insight[data-tone=warning] .circuit-scene-insight-state{background:#443321;color:#ffe0ac;border-color:#937346}\n[data-circuit-builder-root] .circuit-scene-insight-topology{font-size:11px;color:#b5cdd5;margin:9px 0 13px}\n[data-circuit-builder-root] .circuit-scene-readings{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0 0 12px}\n[data-circuit-builder-root] .circuit-scene-readings>div{padding:10px;background:#091e29;border:1px solid #294753;border-radius:8px;min-width:0}\n[data-circuit-builder-root] .circuit-scene-readings dt{font-size:10px;color:#b6cbd7;margin-bottom:5px}\n[data-circuit-builder-root] .circuit-scene-readings dd{font:500 clamp(12px,1.7vw,18px)/1.4 ui-monospace,Consolas,monospace;margin:0;color:#caedff;overflow-wrap:anywhere}\n[data-circuit-builder-root] .circuit-scene-readings>div:nth-child(2) dd{color:#b8f0d3}\n[data-circuit-builder-root] .circuit-scene-readings>div:nth-child(3) dd{color:#ffe0a1}\n[data-circuit-builder-root] .circuit-scene-insight summary{font-size:12px;color:#c0ece2;cursor:pointer;min-height:28px;line-height:28px}\n[data-circuit-builder-root] .circuit-scene-insight details p{font-size:12px;line-height:1.75;color:#cbdee5;margin:8px 0}\n[data-circuit-builder-root] .circuit-scene-insight .circuit-scene-prompt{padding:10px 12px;border-left:2px solid #8bd7ca;background:#0d2631;border-radius:0 6px 6px 0}\n[data-circuit-builder-root] .circuit-scene-insight .circuit-scene-ambiguity{color:#ffe0a1}\n[data-circuit-builder-root] .circuit-scene-insight-actions{margin:8px 0 0;gap:8px}\n[data-circuit-builder-root] .circuit-scene-insight-actions button{min-height:36px;font-size:11px}\n@media(max-width:600px){[data-circuit-builder-root] .circuit-scene-insight{margin:0 13px 13px;padding:12px}[data-circuit-builder-root] .circuit-scene-insight-title{align-items:flex-start;gap:8px}[data-circuit-builder-root] .circuit-scene-insight-state{max-width:55%;font-size:10px}[data-circuit-builder-root] .circuit-scene-readings{gap:5px}[data-circuit-builder-root] .circuit-scene-readings>div{padding:8px 6px}[data-circuit-builder-root] .circuit-scene-readings dt{font-size:9px}}\n";
    circStyle.textContent += "\n[data-circuit-builder-root] .circuit-flow-legend{display:flex;gap:11px;align-items:flex-start;padding:13px 20px;background:#26322e;border-bottom:1px solid #5a6548;color:#efe6ba}\n[data-circuit-builder-root] .circuit-flow-symbol{display:grid;place-items:center;width:29px;height:29px;flex:none;border:1px solid #85845b;border-radius:8px;color:#ffe59b;background:#3a4130;font-size:21px;line-height:1}\n[data-circuit-builder-root] .circuit-flow-legend strong{font-size:12px;color:#ffedb2;font-weight:650}\n[data-circuit-builder-root] .circuit-flow-legend p{font-size:11px;line-height:1.65;color:#e1ddc6;margin:3px 0 0}\n@media(max-width:600px){[data-circuit-builder-root] .circuit-flow-legend{padding:12px 13px;gap:9px}}\n";
    circStyle.textContent += "\n[data-circuit-builder-root] .circuit-part-compare{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px;padding:12px 20px 0}\n[data-circuit-builder-root] .circuit-part-compare label{font-size:11px;color:#cadfe8}\n[data-circuit-builder-root] .circuit-part-compare select{font-size:12px;min-height:36px;padding:7px 30px 7px 10px;background:#142f40;color:#e1f2f7;border:1px solid #527383;border-radius:8px;max-width:100%}\n[data-circuit-builder-root] .circuit-compare-scale{flex-basis:100%;border-left:2px solid #688f9c;padding-left:10px;margin:2px 0 0}\n[data-circuit-builder-root] .circuit-compare-scale p{font-size:11px;line-height:1.7;color:#bbd2dc;margin:0}\n[data-circuit-builder-root] .circuit-compare-scale p:first-child{color:#dfedf3}\n[data-circuit-builder-root] .circuit-part-copy{flex:1}\n[data-circuit-builder-root] .circuit-compare-track{display:block;width:100%;height:5px;border-radius:4px;background:#071823;overflow:hidden;margin-top:3px}\n[data-circuit-builder-root] .circuit-compare-track>span{display:block;height:100%;background:#a6dfff;border-radius:4px}\n[data-circuit-builder-root] .circuit-compare-track[data-metric=current]>span{background:#9be3c0}\n[data-circuit-builder-root] .circuit-compare-track[data-metric=power]>span{background:#f4d185}\n[data-circuit-builder-root] .circuit-compare-track[data-unknown=true]{background:repeating-linear-gradient(125deg,#96a8b5 0,#96a8b5 2px,#183544 2px,#183544 6px)}\n@media(max-width:600px){[data-circuit-builder-root] .circuit-part-compare{padding:12px 13px 0}[data-circuit-builder-root] .circuit-part-compare select{flex:1;min-width:0}[data-circuit-builder-root] .circuit-part-copy small{overflow-wrap:anywhere}}\n";
    circStyle.textContent += "\n[data-circuit-builder-root] .circuit-camera{margin-bottom:16px}\n[data-circuit-builder-root] .circuit-selection-nav{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;border-bottom:1px solid #3a575e;padding-bottom:12px;margin-bottom:13px}\n[data-circuit-builder-root] .circuit-selection-position{color:#c5dddF;font-size:11px}\n[data-circuit-builder-root] .circuit-selection-nav>div{display:flex;gap:6px}\n[data-circuit-builder-root] .circuit-selection-nav button{border:1px solid #587a84;background:#14313b;color:#e0f3f3;font-size:11px;min-height:34px;padding:6px 10px;border-radius:7px;display:inline-flex;align-items:center;gap:6px}\n[data-circuit-builder-root] .circuit-selection-nav button:hover:not(:disabled){background:#26505a;border-color:#9cdbd3}\n[data-circuit-builder-root] .circuit-selection-nav button:disabled{opacity:.42;cursor:default}\n@media(max-width:600px){[data-circuit-builder-root] .circuit-camera{margin-bottom:13px}[data-circuit-builder-root] .circuit-selection-nav{gap:8px}[data-circuit-builder-root] .circuit-selection-nav button{padding:6px 9px}}\n";
    circStyle.textContent += "\n[data-circuit-builder-root] .circuit-image-help{padding:0 20px 14px;margin-top:-4px;color:#b9ced9;font-size:11px;line-height:1.7}\n[data-circuit-builder-root] .circuit-image-help p{margin:0}\n[data-circuit-builder-root] .circuit-image-help p[role=status]:not(:empty){color:#d1efdf;margin-top:4px}\n@media(max-width:600px){[data-circuit-builder-root] .circuit-image-help{padding:0 13px 13px}}\n";
    circStyle.textContent += "\n[data-circuit-builder-root] .circuit-probe-panel{margin:0 20px 16px;padding:12px 15px;border:1px solid #596478;border-radius:12px;background:linear-gradient(120deg,#1b2c40,#122d39);color:#d7e7ef}\n[data-circuit-builder-root] .circuit-probe-panel>summary{font-size:13px;font-weight:650;color:#e2edf9;cursor:pointer;line-height:24px}\n[data-circuit-builder-root] .circuit-probe-panel>summary>span{font-size:10px;font-weight:400;color:#b8d0df;margin-left:12px;display:inline-block}\n[data-circuit-builder-root] .circuit-probe-panel>p{font-size:12px;line-height:1.7;margin:10px 0;color:#c1d5e2}\n[data-circuit-builder-root] .circuit-probe-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:12px 0}\n[data-circuit-builder-root] .circuit-probe-controls label{display:grid;gap:6px;min-width:0;font-size:11px;color:#edc9d3}\n[data-circuit-builder-root] .circuit-probe-controls label+label{color:#d2e0ed}\n[data-circuit-builder-root] .circuit-probe-controls select{width:100%;min-width:0;min-height:38px;border:1px solid #5d7b90;background:#0f2434;color:#e2edf5;border-radius:7px;padding:6px;font-size:12px}\n[data-circuit-builder-root] .circuit-probe-display{background:#071a26;border:1px solid #3e6475;border-radius:9px;padding:14px}\n[data-circuit-builder-root] .circuit-probe-display>span{font-size:11px;color:#b7d7df;display:block}\n[data-circuit-builder-root] .circuit-probe-display>strong{display:block;color:#bef1dd;font:500 27px/1.5 ui-monospace,Consolas,monospace;overflow-wrap:anywhere}\n[data-circuit-builder-root] .circuit-probe-display>p{font-size:12px;line-height:1.7;color:#c1d7df;margin:3px 0 0}\n[data-circuit-builder-root] .circuit-probe-panel .circuit-action-row button{font-size:11px;min-height:36px}\n[data-circuit-builder-root] .circuit-probe-panel>.circuit-probe-tip{font-size:11px;margin-bottom:0}\n@media(max-width:600px){[data-circuit-builder-root] .circuit-probe-panel{margin:0 13px 13px;padding:11px}[data-circuit-builder-root] .circuit-probe-controls{gap:8px}[data-circuit-builder-root] .circuit-probe-controls select{font-size:11px}}\n";
    circStyle.textContent += '[data-circuit-builder-root] .circuit-probe-controls>div{display:grid;gap:6px;min-width:0}[data-circuit-builder-root] .circuit-probe-controls>div+div label{color:#d2e0ed}';
    circStyle.textContent += "[data-circuit-builder-root] .circuit-frame-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:10px 14px;background:linear-gradient(110deg,#183444,#102332);border-block:1px solid #476777;color:#e6f4fa}[data-circuit-builder-root] .circuit-frame-mode,[data-circuit-builder-root] .circuit-frame-zoom{display:flex;align-items:center;gap:4px}[data-circuit-builder-root] .circuit-frame-bar button{min-height:36px;padding:6px 12px;border:1px solid #668796;border-radius:8px;background:#122b3b;color:#e6f4fa;font-size:12px;font-weight:600}[data-circuit-builder-root] .circuit-frame-bar button[aria-pressed=true]{background:#baeeda;border-color:#baeeda;color:#143f42}[data-circuit-builder-root] .circuit-frame-bar button:disabled{opacity:.48;cursor:default}[data-circuit-builder-root] .circuit-frame-zoom span{min-width:48px;text-align:center;font:600 12px ui-monospace,monospace}[data-circuit-builder-root] .circuit-frame-center{margin-left:auto}[data-circuit-builder-root] .circuit-scene-viewport[data-drag-mode=pan]{cursor:move}[data-circuit-builder-root] .circuit-position-controls{margin:0 18px 12px;padding:12px 14px;background:#122b3b;border:1px solid #527486;border-radius:10px;color:#dcecf5;font-size:12px}[data-circuit-builder-root] .circuit-position-controls summary{cursor:pointer;font-weight:600}[data-circuit-builder-root] .circuit-position-controls summary span{display:inline-block;margin-left:12px;font-weight:400;color:#b8d0dd}[data-circuit-builder-root] .circuit-position-controls>div{display:flex;gap:20px;flex-wrap:wrap;margin-top:14px}[data-circuit-builder-root] .circuit-position-controls label{display:flex;align-items:center;gap:10px;flex:1;min-width:220px}[data-circuit-builder-root] .circuit-position-controls input{width:100%;accent-color:#8ee1c5}[data-circuit-builder-root] .circuit-frame-bar button:focus-visible,[data-circuit-builder-root] .circuit-position-controls :focus-visible{outline:3px solid #facc15;outline-offset:3px}@media(max-width:600px){[data-circuit-builder-root] .circuit-frame-bar{gap:8px;padding:10px}[data-circuit-builder-root] .circuit-frame-bar button{padding:6px 10px}[data-circuit-builder-root] .circuit-position-controls{margin-inline:12px}}";
    circStyle.textContent += "[data-circuit-builder-root].circuit-workspace-switch{max-width:896px;margin:0 auto 14px;padding:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:#0b2232;border:1px solid #456675;border-radius:14px;color:#c9deeb;font-size:12px}[data-circuit-builder-root].circuit-workspace-switch button{padding:10px 16px;border:1px solid #6a8997;border-radius:9px;background:#132d3c;color:#eaf5fb;font-weight:700}[data-circuit-builder-root].circuit-workspace-switch button[aria-pressed=true]{background:#b5efd9;border-color:#b5efd9;color:#143d38}[data-circuit-builder-root].circuit-workspace-switch span{margin-left:auto}[data-circuit-builder-root].circuit-mixed-root{max-width:896px;margin:auto;color:#e6f2f8;background:#081b28;padding:20px;border:1px solid #3e6073;border-radius:20px}[data-circuit-builder-root] .circuit-mixed-hero{padding:8px 4px 20px}[data-circuit-builder-root] .circuit-mixed-hero h2{font-size:30px;line-height:1.2;font-weight:800;margin:12px 0}[data-circuit-builder-root] .circuit-mixed-hero p{font-size:14px;line-height:1.7;color:#c4d9e5}[data-circuit-builder-root] .circuit-mixed-controls{padding:14px;border:1px solid #436477;border-radius:14px;background:#102d3b;margin-bottom:18px}[data-circuit-builder-root] .circuit-mixed-controls>label{display:flex;align-items:center;gap:15px;font-size:13px}[data-circuit-builder-root] .circuit-mixed-controls input{flex:1;min-width:80px;accent-color:#99e5ce}[data-circuit-builder-root].circuit-mixed-root select{max-width:100%;padding:9px;background:#0b2535;border:1px solid #7193a4;border-radius:8px;color:#e5f3fa;font-size:13px}[data-circuit-builder-root] .circuit-mixed-connections{margin-top:20px;padding:16px;border:1px solid #416477;border-radius:16px;background:#102735}[data-circuit-builder-root] .circuit-mixed-connections h3,[data-circuit-builder-root] .circuit-mixed-evidence h3{font-size:20px;font-weight:750}[data-circuit-builder-root] .circuit-mixed-branch{margin-top:14px;padding:14px;background:linear-gradient(120deg,#143947,#102b39);border:1px solid #4f7685;border-radius:12px}[data-circuit-builder-root] .circuit-mixed-branch-heading{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:13px;margin-bottom:15px}[data-circuit-builder-root] .circuit-mixed-branch-heading span{color:#c1dce7;font:12px ui-monospace,monospace}[data-circuit-builder-root] .circuit-mixed-path{display:flex;align-items:center;gap:8px;overflow-x:auto;padding:4px 0 10px}[data-circuit-builder-root] .circuit-mixed-path button{position:relative;flex:1;min-width:105px;padding:12px 8px;border:1px solid #688b9b;border-radius:10px;background:#0a2232;color:#deedf4;text-align:center}[data-circuit-builder-root] .circuit-mixed-path button[aria-pressed=true]{border-color:#afeed7;background:#23504d;box-shadow:0 0 0 2px #9ce5ca22}[data-circuit-builder-root] .circuit-mixed-path button>*{display:block;font-size:12px;line-height:1.8}[data-circuit-builder-root] .circuit-mixed-path small{color:#b9e2ef}[data-circuit-builder-root] .circuit-mixed-terminal{flex-shrink:0;font:700 11px ui-monospace,monospace;color:#d4e6ef}[data-circuit-builder-root] .circuit-mixed-evidence{padding:20px;margin-top:18px;background:linear-gradient(110deg,#153c40,#102d3a);border:1px solid #5d938c;border-radius:16px}[data-circuit-builder-root] .circuit-mixed-evidence p{font-size:13px;line-height:1.8;margin-top:10px;color:#d2e7ee}[data-circuit-builder-root] .circuit-mixed-readings{margin:12px;padding:12px;border:1px solid #557888;border-radius:12px;color:#d7eaf4;font-size:13px}[data-circuit-builder-root] .circuit-mixed-readings>summary{min-height:24px}[data-circuit-builder-root] .circuit-mixed-scroll{overflow-x:auto;border:1px solid #527586;border-radius:16px}[data-circuit-builder-root] .circuit-mixed-schematic svg{display:block;min-width:760px;width:100%;height:auto}@media(max-width:600px){[data-circuit-builder-root].circuit-mixed-root{padding:12px}[data-circuit-builder-root] .circuit-mixed-hero h2{font-size:25px}[data-circuit-builder-root] .circuit-mixed-connections{padding:10px}[data-circuit-builder-root] .circuit-mixed-branch{padding:10px}[data-circuit-builder-root].circuit-workspace-switch span{width:100%;margin-left:0}}";
    circStyle.textContent += "[data-circuit-builder-root] .circuit-time-scope{border:1px solid #52758a;border-radius:16px;padding:18px;margin:18px 0;background:linear-gradient(120deg,#173241,#0c2534);color:#e1f0f5}[data-circuit-builder-root] .circuit-time-scope h3{font-size:22px;font-weight:750;margin-top:7px}[data-circuit-builder-root] .circuit-signal-controls{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:14px 0}[data-circuit-builder-root] .circuit-signal-controls label{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:13px}[data-circuit-builder-root] .circuit-signal-controls button{background:#173d4e;border:1px solid #7494a4;color:#eaf7fc;border-radius:9px;min-height:40px;padding:8px 12px;font-size:12px;font-weight:650}[data-circuit-builder-root] .circuit-signal-controls input{accent-color:#a0eed6;max-width:180px}[data-circuit-builder-root] .circuit-scope-chart{overflow-x:auto;border-radius:14px;border:1px solid #365868}[data-circuit-builder-root] .circuit-scope-chart svg{display:block;width:100%;min-width:660px;height:auto}[data-circuit-builder-root] .circuit-scope-legend{display:flex;flex-wrap:wrap;gap:18px;font-size:12px;margin:12px 0}[data-circuit-builder-root] .circuit-scope-legend span:nth-child(1){color:#d4cafa}[data-circuit-builder-root] .circuit-scope-legend span:nth-child(2){color:#8bf0d0}[data-circuit-builder-root] .circuit-scope-legend span:nth-child(3){color:#ffda82}[data-circuit-builder-root] .circuit-scope-cursor{display:block;font-size:13px;margin:12px 0}[data-circuit-builder-root] .circuit-scope-cursor strong{float:right;font-family:ui-monospace,monospace}[data-circuit-builder-root] .circuit-scope-cursor input{width:100%;accent-color:#a0eed6;display:block;margin-top:10px}[data-circuit-builder-root] .circuit-scope-readings{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}[data-circuit-builder-root] .circuit-scope-readings>div{padding:12px;background:#092130;border:1px solid #496c7c;border-radius:10px}[data-circuit-builder-root] .circuit-scope-readings span{display:block;font-size:11px;color:#bed6e3;margin-bottom:6px}[data-circuit-builder-root] .circuit-scope-readings strong{font:600 15px ui-monospace,monospace;color:#d4fff0}[data-circuit-builder-root] .circuit-time-model{font-size:12px;line-height:1.8;margin-top:12px}[data-circuit-builder-root] .circuit-time-model p{margin:10px 0}[data-circuit-builder-root] .circuit-time-model a{color:#a4e9f4;text-decoration:underline}@media(max-width:600px){[data-circuit-builder-root] .circuit-time-scope{padding:12px}[data-circuit-builder-root] .circuit-scope-readings{grid-template-columns:1fr}[data-circuit-builder-root] .circuit-scope-readings>div{display:flex;justify-content:space-between;gap:8px}[data-circuit-builder-root] .circuit-signal-controls label{width:100%}}";
    circStyle.textContent += '[data-circuit-builder-root] .circuit-scene-probe-pins{position:absolute;inset:0;pointer-events:none}[data-circuit-builder-root] .circuit-probe-pin{position:absolute;transform:translate(-50%,-50%);display:grid;place-items:center;width:21px;height:21px;border-radius:50%;background:#182d3d;border:2px solid #d7e1eb;color:#fff;font:bold 10px/1 Arial,sans-serif;box-shadow:0 1px 5px #02091399}[data-circuit-builder-root] .circuit-probe-pin[data-lead=R]{background:#622c3d;border-color:#fda4af}[data-circuit-builder-root] .circuit-scene-viewport .circuit-probe-badge{visibility:hidden}';
    circStyle.textContent += "\n[data-circuit-builder-root] .circuit-probe-practice{margin:12px 0;padding:11px 12px;border:1px solid #4a627c;border-radius:9px;background:#11263a}\n[data-circuit-builder-root] .circuit-probe-practice>summary{font-size:12px;line-height:26px;cursor:pointer;color:#c6ddfa;font-weight:650}\n[data-circuit-builder-root] .circuit-probe-practice p{font-size:11px;color:#c3d5e4;line-height:1.7;margin:9px 0}\n[data-circuit-builder-root] .circuit-practice-setup{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:12px 0}\n[data-circuit-builder-root] .circuit-practice-setup label{font-size:11px;color:#d4e4ef}\n[data-circuit-builder-root] .circuit-practice-setup select{min-width:0;max-width:100%;min-height:36px;background:#0c1e30;color:#dbeafe;border:1px solid #5e7994;border-radius:7px;font-size:11px;padding:6px}\n[data-circuit-builder-root] .circuit-probe-practice button{min-height:35px;border:1px solid #57778f;border-radius:7px;background:#1a394e;color:#deedf7;padding:7px 10px;font-size:11px}\n[data-circuit-builder-root] .circuit-probe-practice button:disabled{opacity:.45;cursor:default}\n[data-circuit-builder-root] .circuit-probe-practice button[aria-pressed=true]{background:#b5e8dc;color:#123d40;border-color:#b5e8dc}\n[data-circuit-builder-root] .circuit-practice-task{border-top:1px solid #426078;padding-top:12px}\n[data-circuit-builder-root] .circuit-practice-task h4{font-size:14px;font-weight:650;color:#e1efff;margin:0}\n[data-circuit-builder-root] .circuit-practice-task fieldset{border:0;min-width:0;margin:14px 0;padding:0}\n[data-circuit-builder-root] .circuit-practice-task legend{font-size:12px;color:#e2eef7;margin-bottom:8px}\n[data-circuit-builder-root] .circuit-practice-predictions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}\n[data-circuit-builder-root] .circuit-practice-feedback{margin-top:12px;border-left:3px solid #edc184;padding:10px 12px;background:#172f40;border-radius:0 7px 7px 0}\n[data-circuit-builder-root] .circuit-practice-feedback[data-correct=true]{border-color:#98e0bf}\n[data-circuit-builder-root] .circuit-practice-feedback strong{font-size:12px;color:#e0edf4}\n@media(max-width:600px){[data-circuit-builder-root] .circuit-practice-predictions{grid-template-columns:repeat(2,minmax(0,1fr))}[data-circuit-builder-root] .circuit-practice-setup select{width:100%}}\n";
    circStyle.textContent += "\n.circuit-active-regions{margin-top:22px;padding-top:20px;border-top:1px solid #496979}.circuit-region-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.circuit-region-heading h4{margin:3px 0!important}.circuit-region-live{padding:5px 10px;border:1px solid #80b9aa;border-radius:999px;font-size:12px;color:#d0f1e6;background:#143b35}.circuit-region-live[data-region=cutoff]{border-color:#8baecb;background:#263d55;color:#e0edfa}.circuit-region-live[data-region=saturated]{border-color:#d1b16f;background:#453b28;color:#fae1b0}.circuit-region-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:15px 0}.circuit-region-card{min-width:0;border:1px solid #526b7b;border-top:3px solid #b0cbe4;border-radius:12px;padding:13px;background:linear-gradient(145deg,#263d55,#102938)}.circuit-region-card[data-region=active]{border-top-color:#9ae5ca;background:linear-gradient(145deg,#174037,#102938)}.circuit-region-card[data-region=saturated]{border-top-color:#e9c17c;background:linear-gradient(145deg,#453b28,#102938)}.circuit-region-card[data-current=true]{outline:2px solid #dbeef6;outline-offset:2px}.circuit-region-card-title{display:flex;align-items:center;gap:8px}.circuit-region-card-title>span{font:600 11px ui-monospace,monospace;color:#c5d9e6}.circuit-active-root .circuit-region-card h5,.circuit-active-root .circuit-region-balance h5{margin:0;font-size:14px;font-weight:750;color:#f0f6fa}.circuit-region-span{display:block;color:#e0ecf4;font:550 12px/1.7 ui-monospace,monospace;margin-top:7px;overflow-wrap:anywhere}.circuit-region-card p{font-size:12px;line-height:1.65}.circuit-active-root .circuit-region-card button{width:100%;min-height:44px;margin-top:auto;background:#1a3849}.circuit-region-card{display:flex;flex-direction:column}.circuit-region-card .circuit-region-unavailable{font-size:11px;color:#d0dce6}.circuit-region-balance{padding:15px;border:1px solid #4e707b;border-radius:12px;background:#0a202e}.circuit-region-budget{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:12px 0}.circuit-region-budget-label{display:flex;justify-content:space-between;align-items:start;gap:10px;font-size:12px;line-height:1.65}.circuit-region-budget-label strong{color:#eaf6fa;white-space:nowrap;font-family:ui-monospace,monospace}.circuit-region-budget-track{height:8px;border-radius:4px;background:#314955;overflow:hidden;margin-top:9px}.circuit-region-budget-track span{display:block;height:100%;background:#9ae5ca}.circuit-region-budget-track span[data-budget=limit]{background:#e9c17c}.circuit-region-balance p{font-size:12px;margin-bottom:0}.circuit-region-balance p strong{color:#eaf6fa}.circuit-region-boundaries{margin-top:15px}.circuit-region-boundaries dl{margin:12px 0;display:grid;grid-template-columns:1fr 1fr;gap:10px}.circuit-region-boundaries dl>div{padding:10px;background:#112e3f;border:1px solid #486575;border-radius:8px;min-width:0}.circuit-region-boundaries dt{font-size:12px;color:#c8dee9}.circuit-region-boundaries dd{margin:5px 0 0;color:#e5f3f9;font:600 13px/1.6 ui-monospace,monospace;overflow-wrap:anywhere}.circuit-region-boundaries p{font-size:12px}\n@media(max-width:600px){.circuit-region-cards,.circuit-region-budget,.circuit-region-boundaries dl{grid-template-columns:1fr}.circuit-region-card{padding:13px 15px}.circuit-region-budget{gap:15px}.circuit-region-heading{align-items:start}.circuit-region-live{font-size:11px}.circuit-region-budget-label{flex-wrap:wrap}}\n";
    circStyle.textContent += "\n[data-circuit-builder-root].circuit-active-root{max-width:896px;margin:auto;padding:24px;border:1px solid #3d6172;border-radius:22px;background:linear-gradient(145deg,#0c2433,#081724 55%);color:#e4f0f7;font:14px/1.7 system-ui,sans-serif}\n.circuit-active-root *{box-sizing:border-box}.circuit-active-root h2,.circuit-active-root h3,.circuit-active-root h4,.circuit-active-root p{margin:0}.circuit-active-root h2{font-size:34px;line-height:1.2;font-weight:780;margin:10px 0 15px;letter-spacing:-.6px}.circuit-active-hero{padding:4px 4px 24px}.circuit-active-hero p{max-width:650px;color:#c6dbe7}.circuit-active-root h3{font-size:18px;font-weight:750}.circuit-active-root h4{font-size:17px;font-weight:750;margin-bottom:10px}.circuit-active-root button,.circuit-active-root select{min-height:40px;border:1px solid #618194;border-radius:9px;background:#183749;color:#e8f4fa;padding:8px 12px;font:600 12px/1.5 system-ui;max-width:100%}.circuit-active-root button[aria-pressed=true]{background:#b5ebd8;color:#113c39;border-color:#b5ebd8}.circuit-active-root button:hover:not(:disabled){border-color:#b5ebd8}.circuit-active-root p{color:#c9dee9;margin:10px 0;line-height:1.75}.circuit-active-root summary{font-size:14px;color:#e0eff8}.circuit-active-projects{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:20px}.circuit-active-projects button{text-align:left;padding:16px;background:#122d3e}.circuit-active-projects span{display:block;font-size:16px;font-weight:750}.circuit-active-projects small{display:block;margin-top:5px;font-weight:500;font-size:12px;line-height:1.6}.circuit-active-panel{padding:18px;border:1px solid #426376;border-radius:16px;margin:16px 0;background:#0d2635}.circuit-active-toolbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:14px}.circuit-active-toolbar>div{display:flex;gap:6px;flex-wrap:wrap}.circuit-active-range{display:block;min-width:0;margin:15px 0}.circuit-active-range>span{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;color:#d0e2ed}.circuit-active-range strong{color:#b4ead8;font:650 16px/1.5 ui-monospace,monospace;white-space:nowrap}.circuit-active-range input{display:block;width:100%;min-height:36px;accent-color:#b5ebd8}.circuit-active-quick{display:flex;flex-wrap:wrap;gap:7px;margin:8px 0 16px}.circuit-active-state{padding:13px 16px;border-left:3px solid #c5a3ef;border-radius:0 10px 10px 0;background:#1e2e43}.circuit-active-state[data-region=saturated]{border-color:#edcc8f;background:#2b322f}.circuit-active-state[data-region=cutoff]{border-color:#acc9e2;background:#1c3040}.circuit-active-state strong{font-size:16px;color:#edf4f9}.circuit-active-state p{font-size:13px;margin:4px 0 0}.circuit-active-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:16px}.circuit-active-metrics>div{padding:14px 10px;border:1px solid #486c7c;border-radius:11px;background:#0a1d2b}.circuit-active-metrics span,.circuit-active-metrics small{display:block;font-size:10px;line-height:1.7;color:#c0d6e3}.circuit-active-metrics span{letter-spacing:.055em}.circuit-active-metrics strong{display:block;font:650 23px/1.8 ui-monospace,monospace;color:#bcebdc}.circuit-active-metrics>div:first-child strong{color:#f1d5a6}.circuit-active-metrics>div:last-child strong{color:#c8daf5}.circuit-active-metrics>div:first-child span{color:#e4d1b2}.circuit-active-diagram-scroll,.circuit-active-plot-scroll{max-width:100%;overflow-x:auto;border:1px solid #41667b;border-radius:14px}.circuit-active-diagram-scroll svg{display:block;width:100%;min-width:710px;height:auto}.circuit-active-plot-scroll svg{display:block;width:100%;min-width:580px;height:auto}.circuit-active-probes{padding:14px;border:1px solid #4b6d80;border-radius:11px;background:#122e3f;margin-top:15px}.circuit-active-probes>div{display:flex;align-items:end;flex-wrap:wrap;gap:8px;margin:12px 0}.circuit-active-probes label{display:block;flex:1;min-width:150px;font-size:12px}.circuit-active-probes select{display:block;width:100%;margin-top:4px}.circuit-active-probes output{display:block;color:#d5eedc;font:700 26px/1.8 ui-monospace,monospace}.circuit-active-probes>span{color:#c6dce9;font-size:12px}.circuit-active-tuning{display:grid;grid-template-columns:1fr 1fr;gap:0 25px}.circuit-active-reason{background:linear-gradient(120deg,#153c40,#102b3b)}.circuit-active-loading{padding:12px 15px;margin:16px 0;background:#102b3a;border:1px solid #537a85;border-radius:10px}.circuit-active-predict{border-top:1px solid #587c8b;margin-top:20px;padding-top:18px}.circuit-active-predict>label{display:block;font-size:13px}.circuit-active-predict select{display:block;margin:7px 0 10px;min-width:220px}.circuit-active-predict fieldset{padding:0;margin:12px 0;border:0;min-width:0}.circuit-active-predict legend{font-size:13px;color:#e4eff7}.circuit-active-feedback{padding:14px;margin:16px 0;border-left:3px solid #b2e7c9;background:#122d3b;border-radius:0 8px 8px 0}.circuit-active-reflection{margin-top:18px}.circuit-active-reflection textarea{display:block;margin-top:6px}.circuit-active-root .circuit-help{color:#c0d6e3}.circuit-active-root .circuit-model-details p{font-size:12px}\n@media(max-width:600px){[data-circuit-builder-root].circuit-active-root{padding:12px}.circuit-active-root h2{font-size:28px}.circuit-active-projects{grid-template-columns:1fr;gap:8px}.circuit-active-projects button{padding:11px 14px}.circuit-active-projects small{margin-top:2px}.circuit-active-panel{padding:12px}.circuit-active-metrics{grid-template-columns:1fr}.circuit-active-metrics>div{display:grid;grid-template-columns:1fr auto;align-items:center;padding:9px 12px}.circuit-active-metrics strong{font-size:22px;grid-column:2;grid-row:1/3}.circuit-active-metrics small{grid-column:1}.circuit-active-tuning{grid-template-columns:1fr}.circuit-active-toolbar>div{width:100%}.circuit-active-toolbar h3{font-size:17px}}\n";
    circStyle.textContent += "\n.circuit-active-root .circuit-active-range>label{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;color:#d0e2ed}.circuit-active-value-row{display:flex;gap:12px;align-items:center}.circuit-active-value-row input[type=range]{flex:1;min-width:40px}.circuit-active-root .circuit-active-exact{flex:0 0 112px;width:112px;min-height:40px;border:1px solid #7192a6;border-radius:8px;background:#091e2d;color:#edf6fc;padding:7px 9px;font:600 15px ui-monospace,monospace;accent-color:#d0b6f1}.circuit-active-root .circuit-active-exact[aria-invalid=true]{border-color:#f2b587}.circuit-active-root .circuit-active-input-help{font-size:11px;color:#bed2df;margin:2px 0 0}.circuit-active-root .circuit-active-input-error{font-size:12px;color:#ffd6b9;margin:6px 0}.circuit-active-board-frame{position:relative;width:100%;min-width:710px}.circuit-active-node-layer{position:absolute;inset:0;pointer-events:none}.circuit-active-root .circuit-active-node{position:absolute;transform:translate(-50%,-50%);pointer-events:auto;width:30px;height:30px;min-height:30px;padding:0;border-radius:50%;background:#16374d;color:#edf7ff;border:2px solid #bcd7e7;font:750 12px/1 system-ui;box-shadow:0 2px 6px #04101b88}.circuit-active-root .circuit-active-node[aria-pressed=true][data-lead=red]{background:#6d2c42;color:#fff;border-color:#ffc1d2}.circuit-active-root .circuit-active-node[aria-pressed=true][data-lead=black]{background:#26374f;color:#fff;border-color:#f2f6fc}.circuit-active-node small{position:absolute;left:100%;top:100%;transform:translate(-6px,-6px);min-width:17px;height:17px;padding:2px;border-radius:5px;background:#071b2a;color:#fff;border:1px solid #c4dbea;font:700 9px/1.2 system-ui}.circuit-active-probe-placement{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin:6px 0 14px}.circuit-active-probe-placement>span{color:#c9dfe9;font-size:12px;margin-right:auto}.circuit-active-root .circuit-active-probe-placement button[aria-pressed=true][data-lead=red]{background:#efb2c6;border-color:#efb2c6;color:#3f1b29}.circuit-active-root .circuit-active-probe-placement button[aria-pressed=true][data-lead=black]{background:#d0daea;border-color:#d0daea;color:#223249}.circuit-active-probes .circuit-active-probe-shortcuts{margin:4px 0 12px;align-items:center;gap:7px}.circuit-active-reference{border:1px solid #736586;border-radius:13px;background:linear-gradient(125deg,#262d43,#152b3c);padding:16px;margin:15px 0 20px}.circuit-active-root .circuit-active-reference h4{font-size:16px;margin:0}.circuit-active-reference-status{padding:10px 13px;border-left:3px solid #e2c192;background:#172d3c}.circuit-active-reference-status[data-controlled=true]{border-left-color:#b5e8cc}.circuit-active-reference-status p{font-size:12px;margin:4px 0!important}.circuit-active-reference ul{font-size:12px;list-style:disc;padding-left:20px;margin:12px 0;color:#e6deef}.circuit-active-reference-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:15px 0}.circuit-active-reference-metrics>div{min-width:0;border:1px solid #596c84;background:#102538;border-radius:10px;padding:12px}.circuit-active-reference-metrics h5{font-size:12px;color:#d4e5ee;font-weight:650;margin:0 0 9px}.circuit-active-reference-metrics dl{margin:0}.circuit-active-reference-metrics dl>div{display:flex;justify-content:space-between;gap:6px;align-items:baseline;margin:5px 0}.circuit-active-reference-metrics dt{font-size:10px;color:#cbb7e6}.circuit-active-reference-metrics dd{margin:0;font:600 12px ui-monospace,monospace;color:#e4d7f8}.circuit-active-reference-metrics dl>div:last-child dt,.circuit-active-reference-metrics dl>div:last-child dd{color:#b9e8d8}.circuit-active-reference-metrics>div>strong{display:block;border-top:1px solid #445d76;padding-top:9px;margin-top:10px;font:650 14px ui-monospace,monospace;color:#f2ddb5;overflow-wrap:anywhere}.circuit-active-plot-legend{display:flex;flex-wrap:wrap;gap:7px 18px;padding:12px 3px 0;font-size:11px;color:#d4e2ef}.circuit-active-plot-legend span:nth-child(2){color:#dec5f6}\n@media(max-width:650px){.circuit-active-reference-metrics{grid-template-columns:1fr}.circuit-active-reference-metrics>div{display:grid;grid-template-columns:1fr 1fr;gap:0 12px}.circuit-active-reference-metrics h5{grid-column:1;align-self:center;margin-bottom:0}.circuit-active-reference-metrics dl{grid-column:2;grid-row:1/3}.circuit-active-reference-metrics>div>strong{grid-column:1;border:0;margin:0;padding-top:3px}.circuit-active-reference{padding:12px}.circuit-active-probe-placement>span{width:100%}}\n";
    circStyle.textContent += '.circuit-active-graph-control{padding:0 12px;border:1px solid #4b687c;border-radius:10px;background:#102b3a;margin:14px 0}.circuit-active-graph-control .circuit-active-range{margin:10px 0}';
    circStyle.textContent += "\n.circuit-active-notebook{border:1px solid #758294;border-radius:15px;background:linear-gradient(120deg,#20364a,#122c3c);margin:0 0 20px;scroll-margin-top:20px}.circuit-active-notebook>summary{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 17px;list-style:none;min-height:52px;color:#ecf4fa;font-weight:750}.circuit-active-notebook>summary>span:before{content:'▸';display:inline-block;margin-right:10px;color:#d0b8f0}.circuit-active-notebook[open]>summary>span:before{content:'▾'}.circuit-active-notebook>summary::-webkit-details-marker{display:none}.circuit-active-notebook>summary small{font-size:11px;color:#d8c6ec;white-space:nowrap}.circuit-notebook-content{padding:0 17px 17px}.circuit-notebook-field{display:block;min-width:0;font-size:12px;font-weight:650;color:#d5e6ef;margin:14px 0}.circuit-notebook-field>input[type=text],.circuit-notebook-field>textarea{display:block;width:100%;border:1px solid #658494;border-radius:9px;background:#091e2d;color:#e8f2fa;padding:10px;margin-top:7px;font:400 13px/1.65 system-ui;resize:vertical}.circuit-notebook-field input::placeholder,.circuit-notebook-field textarea::placeholder{color:#a9c0d0}.circuit-notebook-prompts{display:grid;grid-template-columns:1fr 1fr;gap:15px}.circuit-notebook-record-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:13px 0}.circuit-notebook-record-actions>span{font-size:11px;color:#c6dae6}.circuit-notebook-empty{padding:16px;border:1px dashed #7295a4;border-radius:12px;background:#102d3c;margin:15px 0}.circuit-notebook-empty strong{font-size:14px;color:#d6eae8}.circuit-notebook-empty p{font-size:12px;margin:7px 0 0!important}.circuit-notebook-observation{border:1px solid #587786;border-radius:11px;margin:10px 0;background:#112b3a;overflow:hidden}.circuit-notebook-observation>summary{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px;list-style:none}.circuit-notebook-observation>summary::-webkit-details-marker{display:none}.circuit-notebook-observation>summary>span{font-size:12px;color:#deedf5}.circuit-notebook-observation>summary b{display:inline-block;padding:4px 7px;margin-right:6px;border-radius:7px;background:#33515d;color:#c5f0dc;font:700 11px ui-monospace,monospace}.circuit-notebook-observation>summary strong{font:650 14px ui-monospace,monospace;color:#b5e6d4}.circuit-notebook-observation>summary strong:after{content:' +';color:#d7c4ec}.circuit-notebook-observation[open]>summary strong:after{content:' −'}.circuit-notebook-observation-body{padding:0 12px 10px}.circuit-notebook-readings{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.circuit-notebook-readings>div{border:1px solid #4f7282;border-radius:8px;padding:8px;background:#0a2332;min-width:0}.circuit-notebook-readings span{display:block;font-size:10px;color:#c5d8e5}.circuit-notebook-readings strong{display:block;font:650 14px/1.8 ui-monospace,monospace;color:#c8ecd9;overflow-wrap:anywhere}.circuit-notebook-files{border-top:1px solid #688495;margin-top:20px;padding-top:20px}.circuit-notebook-file-label{font-size:12px;color:#d4e5ee;font-weight:650;display:block;margin:16px 0}.circuit-notebook-file-label input{display:block;max-width:100%;margin-top:8px;min-height:40px;font-size:12px;color:#d4e5ee}.circuit-notebook-file-label input::file-selector-button{padding:9px 12px;border:1px solid #70919f;background:#254653;color:#e1f3f5;border-radius:8px;margin-right:10px;font:600 12px system-ui}.circuit-notebook-preview{padding:15px;background:#193d43;border:1px solid #7aaba2;border-radius:11px;margin:12px 0}.circuit-notebook-preview h4{margin-top:8px!important;overflow-wrap:anywhere}.circuit-notebook-preview p{font-size:12px}.circuit-notebook-graph-actions{padding-top:8px}.circuit-active-root .circuit-file-error{color:#ffd0b0;font-size:12px;overflow-wrap:anywhere}\n@media(max-width:600px){.circuit-active-notebook>summary{padding:12px;font-size:13px}.circuit-notebook-content{padding:0 12px 12px}.circuit-notebook-prompts{grid-template-columns:1fr;gap:0}.circuit-notebook-readings{grid-template-columns:1fr 1fr}.circuit-notebook-observation>summary{align-items:start}.circuit-notebook-observation>summary>span{line-height:1.8}.circuit-notebook-observation>summary strong{font-size:12px;padding-top:5px}.circuit-notebook-field{margin:12px 0}}\n";
    circStyle.textContent += ".circuit-network-board-tools{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:12px 0}.circuit-network-board-tools [role=group]{display:flex;gap:7px;flex-wrap:wrap}.circuit-network-board-tools p{flex:1;min-width:210px;margin:0}.circuit-network-board-tools button{min-height:44px}.circuit-network-diode-editor{padding:15px;margin:14px 0;border:1px solid #829699;border-radius:12px;background:linear-gradient(140deg,#2b4048,#172e3a)}.circuit-network-diode-editor h4{margin:8px 0!important;color:#c1f1db!important}.circuit-network-diode-polarity{display:flex;flex-wrap:wrap;align-items:center;gap:10px;font-size:12px;padding:12px 0;color:#e2e8da}.circuit-network-diode-polarity strong{color:#aedbce}.circuit-network-diode-reference{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:13px 0}.circuit-network-diode-reference>div{padding:10px;background:#0e2532;border:1px solid #64818b;border-radius:9px}.circuit-network-diode-reference dt{font-size:11px;color:#c1d8e3}.circuit-network-diode-reference dd{margin:6px 0 0;color:#e1efc6;font:600 17px ui-monospace,monospace}.circuit-network-diode-editor>button{width:100%;min-height:44px}.circuit-network-diode-editor details{margin-top:13px}@media(max-width:480px){.circuit-network-board-tools [role=group]{width:100%}.circuit-network-board-tools button{flex:1}.circuit-network-diode-reference{grid-template-columns:1fr}.circuit-network-diode-editor{padding:12px}}";
    circStyle.textContent += ".circuit-network-switch-editor{padding:14px;margin:15px 0;border:1px solid #917659;border-radius:12px;background:linear-gradient(145deg,#302d28,#182f39);min-width:0}.circuit-network-switch-states{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:14px 0}.circuit-network-switch-states>div{background:#112832;border:1px solid #68868e;padding:10px;border-radius:9px;min-width:0}.circuit-network-switch-states span{display:block;font-size:11px;color:#c6dce2}.circuit-network-switch-states strong{display:block;font-size:19px;color:#f4dfb5;margin-top:5px}.circuit-network-switch-states [data-closed=true] strong{color:#aff0d5}.circuit-network-switch-editor>button{width:100%;margin-bottom:8px;min-height:44px}.circuit-network-root .circuit-network-timing-toggle[aria-pressed=true]{background:#604833;border-color:#cba377;color:#fff0d5}.circuit-network-switch-actions{display:grid;gap:10px;margin:12px 0}.circuit-network-switch-action{padding:12px;background:#0d2631;border:1px solid #647f87;border-radius:10px;min-width:0}.circuit-network-switch-action-title{display:flex;justify-content:space-between;align-items:center;gap:8px;color:#f1d5a9;font-size:12px}.circuit-network-switch-action-title>span{font:12px ui-monospace,monospace;color:#d1e1e6}.circuit-network-switch-action .circuit-active-range{margin:12px 0}.circuit-network-switch-action-controls{display:grid;grid-template-columns:1fr auto;gap:9px;align-items:end}.circuit-network-switch-action-controls button{min-height:44px}.circuit-network-event-panel{margin:20px 0;padding:16px;background:#112b35;border:1px solid #a28660;border-radius:12px}.circuit-network-event-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.circuit-network-event-heading h4{margin:0!important;font-size:17px!important;color:#f1dfbc}.circuit-network-event-heading>span{font-size:11px;color:#d2ddd9}.circuit-network-event-list{display:grid;gap:8px;list-style:none;padding:0;margin:12px 0 0;max-height:360px;overflow:auto}.circuit-network-event-list li{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px;background:#0a202b;border:1px solid #506e77;border-radius:9px}.circuit-network-event-list li[data-active=true]{border-color:#e6ba7c;background:#25352e}.circuit-network-event-list li>div:first-child{min-width:0}.circuit-network-event-list strong{display:block;font:600 14px ui-monospace,monospace;color:#f7d8a7}.circuit-network-event-list li span{display:block;font-size:12px;color:#d4e5e9;margin-top:5px;overflow-wrap:anywhere}.circuit-network-event-buttons{display:flex;gap:6px;flex-shrink:0}.circuit-network-event-buttons button{min-height:44px}.circuit-network-root .circuit-network-event-buttons button[aria-pressed=true]{background:#605039;border-color:#f0c98e;color:#fff5da}.circuit-network-continuity{margin-top:12px;border-top:1px solid #728a7f;padding-top:14px}.circuit-network-continuity>strong{font-size:12px;color:#d4e7db}.circuit-network-continuity>span{display:block;font:600 19px ui-monospace,monospace;color:#b3efd8;margin:9px 0;overflow-wrap:anywhere}@media(max-width:480px){.circuit-network-event-panel{padding:12px}.circuit-network-event-list li{align-items:stretch;flex-direction:column;gap:10px}.circuit-network-event-buttons button{flex:1}.circuit-network-switch-editor{padding:12px}.circuit-network-switch-states{grid-template-columns:1fr}.circuit-network-switch-action{padding:10px}}";
    circStyle.textContent += ".circuit-network-mode{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0}.circuit-network-mode>span{font-size:12px;color:#bdd7e1;padding:6px}.circuit-network-scope{background:linear-gradient(145deg,#153d46,#102b3b)!important}.circuit-network-scope-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}.circuit-network-scope-heading h3{font-size:26px!important;margin:5px 0!important;letter-spacing:-.025em}.circuit-network-time-badge{font:600 14px/1.6 ui-monospace,monospace;color:#ecf5d4;padding:9px 12px;background:#0b2630;border:1px solid #72998f;border-radius:9px}.circuit-network-time-controls{display:grid;grid-template-columns:1fr auto;gap:16px;align-items:center;margin:14px 0}.circuit-network-time-controls .circuit-active-range{margin:0}.circuit-network-playback{display:flex;gap:8px;flex-wrap:wrap}.circuit-network-root .circuit-network-playback button{min-height:44px}.circuit-network-scope-legend{display:flex;gap:9px 16px;flex-wrap:wrap;align-items:center;font-size:12px;margin:18px 0 10px;color:#c8dde5}.circuit-network-scope-legend strong{color:#e4f3e8;font-size:14px}.circuit-network-scope-legend>span:last-child{margin-left:auto}.circuit-network-scope-scroll{overflow:auto;border:1px solid #527987;border-radius:12px;background:#081e2c}.circuit-network-scope-scroll svg{display:block;width:100%}.circuit-network-cursor{display:block;margin:15px 0 12px}.circuit-network-cursor input{display:block;width:100%;min-height:44px;accent-color:#a9ebd7}.circuit-network-scope-readings{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:10px 0}.circuit-network-scope-readings>div{padding:12px;background:#0d2b39;border-radius:9px;border:1px solid #577e88;min-width:0}.circuit-network-scope-readings dt{font-size:11px;color:#c5dae3}.circuit-network-scope-readings dd{font:600 21px/1.7 ui-monospace,monospace;color:#a9f0dc;margin:4px 0 0;overflow-wrap:anywhere}.circuit-network-scope-readings>div:nth-child(2) dd{color:#ffcf88}.circuit-network-scope-readings>div:nth-child(3) dd{color:#ede6b6}.circuit-network-scope-footer{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}.circuit-network-scope-footer p{flex:1;min-width:180px}.circuit-network-scope-footer button{min-height:44px}.circuit-network-scope summary{color:#d7eade}.circuit-network-root .circuit-network-mode button[aria-pressed=true]{background:#30614f;color:#f0ffe9;border-color:#a7d9b6}\n@media(max-width:650px){.circuit-network-time-controls{grid-template-columns:1fr}.circuit-network-playback button{flex:1}.circuit-network-scope-readings{grid-template-columns:1fr 1fr}.circuit-network-scope-readings>div:last-child{grid-column:1/-1}.circuit-network-scope-readings dd{font-size:19px}.circuit-network-scope-legend>span:last-child{margin-left:0}.circuit-network-scope-footer button{width:100%}.circuit-network-mode>span{flex-basis:100%}.circuit-network-scope-heading h3{font-size:24px!important}}\r\n";
    circStyle.textContent += "\n.circuit-network-examples,.circuit-network-add{display:flex;gap:9px;align-items:end;flex-wrap:wrap;margin:12px 0 18px}.circuit-network-root label{font-size:12px;color:#d4e6ef}.circuit-network-root select{display:block;margin-top:5px;width:100%}.circuit-network-examples>label{flex:1;min-width:180px}.circuit-network-status{padding:13px 16px;background:#153c3b;border:1px solid #749f93;border-radius:12px;margin-bottom:18px}.circuit-network-status strong{font-size:15px;color:#d6f5e4}.circuit-network-status p{font-size:12px;margin:4px 0 0}.circuit-network-status[data-ok=false]{background:#442e31;border-color:#cc9f93}.circuit-network-status[data-ok=false] strong{color:#ffe3c5}.circuit-network-scroll{overflow:auto;border:1px solid #547c8b;border-radius:14px}.circuit-network-stage{position:relative;min-width:800px;aspect-ratio:900/520}.circuit-network-stage svg{display:block;width:100%;height:100%}.circuit-network-root button.circuit-network-part{position:absolute;transform:translate(-50%,-50%);background:transparent;border:0;border-radius:4px;color:#f5f1e2;width:92px;min-height:44px;padding:2px;font-size:11px;line-height:1.5}.circuit-network-part strong,.circuit-network-part span{display:block}.circuit-network-part strong{font-size:13px;letter-spacing:.04em}.circuit-network-part span{font:11px/1.6 ui-monospace,monospace}.circuit-network-root button.circuit-network-part:hover{background:#efffed18}.circuit-network-root button.circuit-network-node{position:absolute;transform:translate(-50%,-50%);border:1px solid #a4c1c5;border-radius:10px;background:#092332;color:#e2f2fa;min-width:65px;min-height:48px;padding:4px 7px;font-size:12px;line-height:1.5}.circuit-network-node strong,.circuit-network-node span{display:block}.circuit-network-node span{font:10px/1.6 ui-monospace,monospace;color:#c6e7df}.circuit-network-root button.circuit-network-node[data-red=true]{border:2px solid #ffc7a4}.circuit-network-root button.circuit-network-node[data-black=true]{box-shadow:0 0 0 2px #d0dcf2}.circuit-network-meter{display:grid;grid-template-columns:1fr 1.4fr;gap:16px;padding:16px;background:linear-gradient(125deg,#173f43,#102f42);border:1px solid #658b91;border-radius:12px;margin-top:15px}.circuit-network-meter output{display:block;font:700 26px/1.7 ui-monospace,monospace;color:#d6f2de;overflow-wrap:anywhere}.circuit-network-meter>div>span:last-child{font-size:12px;color:#bed7e3}.circuit-network-node-selects{display:grid;grid-template-columns:1fr 1fr;gap:8px}.circuit-network-node-selects button{grid-column:1/-1}.circuit-network-add>label{flex:1;max-width:300px}.circuit-network-editor{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}.circuit-network-part-list{display:grid;grid-template-columns:1fr;gap:8px}.circuit-network-root .circuit-network-part-list button{text-align:left;padding:11px 13px}.circuit-network-part-list strong,.circuit-network-part-list span{display:block}.circuit-network-part-list span{font:11px/1.8 ui-monospace,monospace;margin-top:3px}.circuit-network-inspector{padding:16px;border:1px solid #6c8c91;border-radius:12px;background:#113340;min-width:0}.circuit-network-terminals{display:grid;grid-template-columns:1fr 1fr;gap:10px}.circuit-network-readings{display:grid;gap:8px;margin:15px 0}.circuit-network-readings>div{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;border-bottom:1px solid #426675;padding-bottom:6px}.circuit-network-readings dt{font-size:12px;color:#c9dce6}.circuit-network-readings dd{margin:0;color:#d8f0e7;font:650 13px/1.6 ui-monospace,monospace}.circuit-network-actions{display:grid;gap:8px}.circuit-network-root .circuit-network-actions button{min-height:44px}.circuit-network-energy{display:grid;grid-template-columns:1fr 1fr;gap:12px}.circuit-network-energy>div{padding:14px;border:1px solid #618687;border-radius:12px;background:#11343a}.circuit-network-energy span{font-size:10px;letter-spacing:.06em;color:#bfd8d9}.circuit-network-energy strong{display:block;font:650 22px/1.8 ui-monospace,monospace;color:#d7eee1;overflow-wrap:anywhere}.circuit-network-table-scroll{overflow:auto;margin:12px 0;border:1px solid #64828b;border-radius:10px}.circuit-network-root table{border-collapse:collapse;width:100%;font-size:12px}.circuit-network-root caption{text-align:left;padding:10px;color:#ccdee7}.circuit-network-root th,.circuit-network-root td{text-align:left;padding:10px 12px;border-bottom:1px solid #426270;white-space:nowrap}.circuit-network-root th{color:#d9eee7;background:#173c43}.circuit-network-root td{color:#d6e8f0}.circuit-network-root details{margin-top:15px}.circuit-network-question{padding:13px 15px;border-left:3px solid #dcc48a;background:#263c39;border-radius:0 8px 8px 0}.circuit-network-root textarea{width:100%;background:#0c2637;border:1px solid #7d9ba8;border-radius:8px;padding:10px;color:#e4f1f6;line-height:1.7}.circuit-network-root .circuit-active-range>label{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px}.circuit-network-root .circuit-active-range input{min-width:0}.circuit-network-root .circuit-active-range strong{white-space:normal;overflow-wrap:anywhere}\n@media(max-width:650px){.circuit-network-editor,.circuit-network-meter{grid-template-columns:1fr}.circuit-network-part-list{grid-template-columns:1fr 1fr}.circuit-network-part-list strong{font-size:11px}.circuit-network-part-list span{font-size:10px}.circuit-network-inspector{padding:12px}.circuit-network-energy strong{font-size:18px}.circuit-network-terminals{gap:8px}.circuit-network-node-selects{grid-template-columns:1fr 1fr}.circuit-network-root .circuit-active-toolbar>span{font-size:11px}.circuit-network-root .circuit-active-panel{padding:12px}}\n";
    circStyle.textContent += ".circuit-network-signal{margin:16px 0;padding:13px;border:1px solid #8c80aa;border-radius:12px;background:linear-gradient(145deg,#273746,#203247)}.circuit-network-signal-title{display:grid;gap:5px;margin-bottom:13px}.circuit-network-signal-title .circuit-eyebrow{color:#dbcbef}.circuit-network-signal-title strong{font-size:16px;color:#f0e6ff}.circuit-network-signal-preview{margin:12px 0;border:1px solid #617992;border-radius:10px;overflow:hidden;background:#0a2031}.circuit-network-signal-preview svg{display:block;width:100%}.circuit-network-signal-preview>div{display:flex;justify-content:space-between;gap:8px;padding:8px 10px;border-top:1px solid #455e76;font-size:11px;color:#d4deef}.circuit-network-signal-preview strong{font-family:ui-monospace,monospace;color:#e0cef7}.circuit-network-signal-levels{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin:12px 0 16px}.circuit-network-signal-levels>div{background:#122b3d;border:1px solid #5e7792;border-radius:8px;padding:8px 6px;min-width:0}.circuit-network-signal-levels dt{font-size:10px;color:#c4d7e4}.circuit-network-signal-levels dd{margin:5px 0 0;font:600 12px/1.5 ui-monospace,monospace;color:#e6d6ff;overflow-wrap:anywhere}.circuit-network-signal-shortcuts{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.circuit-network-signal-shortcuts button{flex:1;min-height:44px;font-size:11px!important}.circuit-network-signal-shortcuts button:last-child{flex-basis:100%}.circuit-network-signal-mode{padding:10px 12px;border-left:3px solid #cab3ed;border-radius:0 8px 8px 0;background:#1b2c3f;color:#e7ddf2!important;font-size:12px!important}.circuit-network-compare-controls{display:flex;align-items:end;gap:10px;flex-wrap:wrap;margin:14px 0}.circuit-network-compare-controls label{flex:1;min-width:180px}.circuit-network-compare-controls button{min-height:44px}.circuit-network-compare-key{display:flex;align-items:center;gap:8px;color:#e0cdf8!important;font-size:12px!important;margin:10px 0!important}.circuit-network-compare-key:before{content:'';width:27px;border-top:2px dashed #d3bafa;flex:none}.circuit-network-scope-readings[data-compare=true]{grid-template-columns:repeat(4,minmax(0,1fr))}.circuit-network-scope-readings[data-compare=true]>div:last-child dd{color:#dfc7ff}.circuit-network-signal .circuit-active-range{margin:15px 0}\n@media(max-width:650px){.circuit-network-compare-controls{align-items:stretch}.circuit-network-compare-controls label,.circuit-network-compare-controls button{width:100%}.circuit-network-scope-readings[data-compare=true]{grid-template-columns:1fr 1fr}.circuit-network-scope-readings[data-compare=true]>div:last-child{grid-column:auto}.circuit-network-signal{padding:10px}.circuit-network-signal-levels dd{font-size:11px}.circuit-network-scope-readings[data-compare=true] dd{font-size:17px}}\r\n";
    circStyle.textContent += ".circuit-network-root button.circuit-network-part{width:120px;min-height:44px;background:#102a35e8;border:1px solid #6d9195;border-radius:8px;box-shadow:0 3px 8px #0004}.circuit-network-root button.circuit-network-part[aria-pressed=true]{background:#294a40;border-color:#f1d49d}.circuit-network-root button.circuit-network-part:hover{background:#31504e}.circuit-network-part span{font-size:10px}";
    circStyle.textContent += ".circuit-network-control-editor{padding:15px;margin:14px 0;border:1px solid #998aaf;border-radius:12px;background:linear-gradient(135deg,#343347,#142e3b)}.circuit-network-control-editor h4{margin:8px 0!important;color:#e4d2fb!important}.circuit-network-control-equation{display:grid;gap:10px;padding:13px;background:#102433;border:1px solid #8a7f9c;border-radius:9px;margin:12px 0;overflow-wrap:anywhere}.circuit-network-control-equation strong{font:600 13px ui-monospace,monospace;color:#e3d6f9}.circuit-network-control-equation span{font:13px ui-monospace,monospace;color:#bce3d7}";
    circStyle.textContent += ".circuit-network-camera{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:12px 0;padding:13px;border:1px solid #5b7b8c;border-radius:12px;background:linear-gradient(120deg,#213747,#142b3b)}.circuit-network-camera-presets,.circuit-network-camera-zoom{display:flex;align-items:center;gap:7px;flex-wrap:wrap}.circuit-network-camera-presets>span{width:100%;font-size:10px}.circuit-network-camera>label{flex:1;min-width:130px}.circuit-network-camera input{display:block;width:100%;height:36px;accent-color:#d7c092}.circuit-network-camera button{min-height:44px}.circuit-network-camera-zoom output{font:600 13px ui-monospace,monospace;min-width:44px;text-align:center;color:#e2ecd9}.circuit-network-camera p{width:100%;margin:0!important}.circuit-network-scroll{max-height:640px;cursor:grab;overscroll-behavior:contain;scrollbar-color:#8aa9b4 #102936;scrollbar-width:auto}.circuit-network-scroll[data-dragging=true]{cursor:grabbing;user-select:none}.circuit-network-scroll:focus-visible{outline:3px solid #f1d394;outline-offset:3px}.circuit-network-scroll button{cursor:pointer}.circuit-network-stage{isolation:isolate}.circuit-network-root .circuit-network-camera button:disabled{opacity:.5}@media(max-width:480px){.circuit-network-camera{padding:10px}.circuit-network-camera-presets{width:100%}.circuit-network-camera-presets button{flex:1}.circuit-network-camera-zoom{width:100%;justify-content:space-between}}";
    circStyle.textContent += ".circuit-network-sense-note{display:grid;gap:7px;padding:12px 14px;border-left:3px dashed #cfb2f0;border-radius:0 9px 9px 0;background:#302f45;color:#e1d1f3;margin:12px 0}.circuit-network-sense-note strong{font-size:13px}.circuit-network-sense-note span{font-size:12px;line-height:1.65;color:#d1deea}";
    circStyle.textContent += ".circuit-network-opamp-editor{padding:15px;margin:14px 0;border:1px solid #849cab;border-radius:13px;background:linear-gradient(135deg,#2d3c52,#142d39)}.circuit-network-opamp-editor h4{color:#e0eacd!important;margin:8px 0 18px!important}.circuit-network-opamp-shortcuts{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.circuit-network-opamp-shortcuts button{min-height:44px;flex:1}.circuit-network-opamp-state{margin:16px 0;padding:14px;border:1px solid #849b98;border-radius:12px;background:linear-gradient(125deg,#173e40,#142c3e);color:#d8ece7}.circuit-network-opamp-state[data-region=upper],.circuit-network-opamp-state[data-region=lower]{border-color:#cfa16e;background:linear-gradient(125deg,#423c36,#213445)}.circuit-network-opamp-state-title{display:flex;gap:10px;flex-wrap:wrap;justify-content:space-between;align-items:center}.circuit-network-opamp-state-title strong{font-size:16px;color:#d8efcc}.circuit-network-opamp-state[data-region=upper] .circuit-network-opamp-state-title strong,.circuit-network-opamp-state[data-region=lower] .circuit-network-opamp-state-title strong{color:#f6d19c}.circuit-network-opamp-state-title span{font-size:11px;color:#c4d9e4}.circuit-network-opamp-window{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center;margin:13px 0 10px;font:12px ui-monospace,monospace}.circuit-network-opamp-window strong{font-size:20px;color:#edf0cf}.circuit-network-opamp-meter{position:relative;height:13px;background:linear-gradient(90deg,#c39a75 0 3%,#749f94 3% 97%,#c39a75 97%);border:1px solid #b1bcb1;border-radius:6px;margin:12px 5px 18px}.circuit-network-opamp-meter>span{position:absolute;top:-5px;height:21px;width:4px;background:#f5f3de;border:1px solid #283a45;transform:translateX(-50%);border-radius:2px}.circuit-network-opamp-state dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.circuit-network-opamp-state dt{font-size:11px;color:#c5dbe4}.circuit-network-opamp-state dd{margin:5px 0 0;font:600 15px ui-monospace,monospace;color:#e0edda;overflow-wrap:anywhere}.circuit-network-opamp-state p{margin:12px 0 0!important}.circuit-network-opamp-editor details{font-size:12px}.circuit-network-opamp-editor .circuit-active-range{margin:14px 0}@media(max-width:480px){.circuit-network-opamp-editor{padding:11px}.circuit-network-opamp-state{padding:11px}.circuit-network-opamp-state dl{grid-template-columns:1fr}.circuit-network-opamp-editor .circuit-network-terminals{grid-template-columns:1fr}.circuit-network-opamp-shortcuts button{min-width:90px}}";
    document.head.appendChild(circStyle);
  }

  // ── Sound effects ──
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) {
      try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* audio not available */ }
    }
    return _audioCtx;
  }
  function playTone(freq, dur, type, vol) {
    var ac = getAudioCtx(); if (!ac) return;
    try {
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.12, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15));
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + (dur || 0.15));
    } catch (e) { /* audio not available */ }
  }
  function circuitSound(type) {
    switch (type) {
      case 'addComp':
        playTone(440, 0.08, 'sine', 0.1);
        setTimeout(function() { playTone(554, 0.12, 'sine', 0.12); }, 70);
        break;
      case 'removeComp':
        playTone(440, 0.12, 'triangle', 0.08);
        setTimeout(function() { playTone(330, 0.15, 'triangle', 0.06); }, 80);
        break;
      case 'switchToggle':
        playTone(1200, 0.03, 'square', 0.06);
        setTimeout(function() { playTone(800, 0.04, 'square', 0.05); }, 30);
        break;
      case 'shortCircuit':
        // Intense spark + crackle
        playTone(150, 0.3, 'sawtooth', 0.1);
        playTone(160, 0.3, 'sawtooth', 0.08);
        // Spark noise
        (function() {
          var ac = getAudioCtx(); if (!ac) return;
          try {
            var bufSize = Math.floor(ac.sampleRate * 0.15);
            var buf = ac.createBuffer(1, bufSize, ac.sampleRate);
            var data = buf.getChannelData(0);
            for (var i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.2));
            var src = ac.createBufferSource(); src.buffer = buf;
            var filt = ac.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 3000; filt.Q.value = 1.5;
            var g = ac.createGain(); g.gain.setValueAtTime(0.08, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
            src.connect(filt); filt.connect(g); g.connect(ac.destination); src.start();
          } catch(e) {}
        })();
        break;
      case 'challengeComplete':
        playTone(523, 0.1, 'sine', 0.1);
        setTimeout(function() { playTone(659, 0.1, 'sine', 0.1); }, 100);
        setTimeout(function() { playTone(784, 0.1, 'sine', 0.12); }, 200);
        setTimeout(function() { playTone(1047, 0.2, 'sine', 0.14); }, 300);
        break;
      case 'correct':
        playTone(523, 0.1, 'sine', 0.12);
        setTimeout(function() { playTone(659, 0.1, 'sine', 0.12); }, 80);
        setTimeout(function() { playTone(784, 0.15, 'sine', 0.14); }, 160);
        break;
      case 'wrong':
        playTone(220, 0.25, 'sawtooth', 0.08);
        break;
      case 'badge':
        playTone(523, 0.08, 'sine', 0.1);
        setTimeout(function() { playTone(659, 0.08, 'sine', 0.1); }, 70);
        setTimeout(function() { playTone(784, 0.08, 'sine', 0.1); }, 140);
        setTimeout(function() { playTone(1047, 0.2, 'sine', 0.14); }, 210);
        break;
      case 'electricHum':
        // 60Hz mains hum - brief pulse
        playTone(60, 0.3, 'sine', 0.04);
        playTone(120, 0.25, 'sine', 0.02); // 2nd harmonic
        break;
      case 'capacitorCharge':
        // Rising pitch - charging sound
        (function() {
          var ac = getAudioCtx(); if (!ac) return;
          try {
            var osc = ac.createOscillator(); var g = ac.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(200, ac.currentTime);
            osc.frequency.exponentialRampToValueAtTime(2000, ac.currentTime + 0.4);
            g.gain.setValueAtTime(0.06, ac.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.4);
            osc.connect(g); g.connect(ac.destination); osc.start(); osc.stop(ac.currentTime + 0.4);
          } catch(e) {}
        })();
        break;
      case 'resistorHiss':
        // Gentle thermal noise
        (function() {
          var ac = getAudioCtx(); if (!ac) return;
          try {
            var bufSize = Math.floor(ac.sampleRate * 0.06);
            var buf = ac.createBuffer(1, bufSize, ac.sampleRate);
            var data = buf.getChannelData(0);
            for (var i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
            var src = ac.createBufferSource(); src.buffer = buf;
            var filt = ac.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 1500; filt.Q.value = 3;
            var g = ac.createGain(); g.gain.setValueAtTime(0.025, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.06);
            src.connect(filt); filt.connect(g); g.connect(ac.destination); src.start();
          } catch(e) {}
        })();
        break;
      default:
        playTone(440, 0.08, 'sine', 0.06);
    }
  }

  // ── Badge definitions (10) ──
  var BADGES = [
    { id: 'firstCircuit', icon: '\uD83D\uDD0C', name: 'First Circuit', desc: 'Build your first circuit', check: function(u) { return u.compAdded >= 1; } },
    { id: 'seriesMaster', icon: '\u2192', name: 'Series Master', desc: 'Build a 3+ component series circuit', check: function(u) { return u.seriesBuilt; } },
    { id: 'parallelPro', icon: '\u2261', name: 'Parallel Pro', desc: 'Build a 3+ component parallel circuit', check: function(u) { return u.parallelBuilt; } },
    { id: 'switchWizard', icon: '\uD83D\uDD18', name: 'Switch Wizard', desc: 'Toggle a switch 5 times', check: function(u) { return u.switchToggles >= 5; } },
    { id: 'allComponents', icon: '\uD83E\uDDE9', name: 'Component Collector', desc: 'Use all 7 component types', check: function(u) { return Object.keys(u.typesUsed || {}).length >= 7; } },
    { id: 'challengeChamp', icon: '\uD83C\uDFC6', name: 'Challenge Champ', desc: 'Complete 5 circuit challenges', check: function(u) { return u.challengesDone >= 5; } },
    { id: 'quizAce', icon: '\u26A1', name: 'Ohm Ace', desc: 'Score 5+ on Ohm\'s Law quiz', check: function(u) { return u.quizScore >= 5; } },
    { id: 'quizStreak', icon: '\uD83D\uDD25', name: 'Hot Streak', desc: 'Get 3 quiz answers in a row', check: function(u) { return u.quizStreak >= 3; } },
    { id: 'shortCircuitSurvivor', icon: '\u26A0\uFE0F', name: 'Short Survivor', desc: 'Trigger a short circuit', check: function(u) { return u.shortTriggered; } },
    { id: 'presetExplorer', icon: '\uD83D\uDCCB', name: 'Preset Explorer', desc: 'Load 3 different preset circuits', check: function(u) { return u.presetsLoaded >= 3; } }
  ];

  // ── Circuit presets (5) ──
  var CIRCUIT_PRESETS = [
    { id: 'led_basic', label: '\uD83D\uDD34 LED Circuit', desc: 'Basic LED with current-limiting resistor',
      mode: 'series', voltage: 9, components: [
        { type: 'resistor', value: 470, id: 1 },
        { type: 'led', value: 40, id: 2, ledColor: '#ef4444' },
        { type: 'switch', value: 0, id: 3, closed: true }
      ]
    },
    { id: 'voltage_divider', label: '\u2696 Voltage Divider', desc: 'Two resistors sharing voltage',
      mode: 'series', voltage: 12, components: [
        { type: 'resistor', value: 200, id: 1 },
        { type: 'resistor', value: 100, id: 2 }
      ]
    },
    { id: 'parallel_bulbs', label: '\uD83D\uDCA1 Parallel Bulbs', desc: 'Three bulbs in parallel - remove one, others stay lit',
      mode: 'parallel', voltage: 12, components: [
        { type: 'bulb', value: 100, id: 1 },
        { type: 'bulb', value: 100, id: 2 },
        { type: 'bulb', value: 100, id: 3 }
      ]
    },
    { id: 'ammeter_test', label: '\u26A1 Current Measurement', desc: 'Series ammeter reads total current',
      mode: 'series', voltage: 9, components: [
        { type: 'resistor', value: 100, id: 1 },
        { type: 'ammeter', value: 0, id: 2 },
        { type: 'resistor', value: 200, id: 3 }
      ]
    },
    { id: 'christmas_lights', label: '\uD83C\uDF84 Christmas Lights', desc: 'Series LEDs - if one fails, all go dark!',
      mode: 'series', voltage: 12, components: [
        { type: 'led', value: 40, id: 1, ledColor: '#ef4444' },
        { type: 'led', value: 40, id: 2, ledColor: '#22c55e' },
        { type: 'led', value: 40, id: 3, ledColor: '#3b82f6' },
        { type: 'switch', value: 0, id: 4, closed: true }
      ]
    }
  ];

  // ── Challenge definitions (10) ──
  var CHALLENGES = [
    { label: 'Get 2A current', target: 2, type: 'current', unit: 'A' },
    { label: 'Get 0.5A current', target: 0.5, type: 'current', unit: 'A' },
    { label: 'Total R = 200\u03A9', target: 200, type: 'resistance', unit: '\u03A9' },
    { label: 'Power = 24W', target: 24, type: 'power', unit: 'W' },
    { label: 'Total R = 50\u03A9', target: 50, type: 'resistance', unit: '\u03A9' },
    { label: 'Get exactly 0.1A', target: 0.1, type: 'current', unit: 'A' },
    { label: 'Power = 1W', target: 1, type: 'power', unit: 'W' },
    { label: 'Total R = 500\u03A9', target: 500, type: 'resistance', unit: '\u03A9' },
    { label: 'Get 3A current', target: 3, type: 'current', unit: 'A' },
    { label: 'Power = 100W', target: 100, type: 'power', unit: 'W' }
  ];

  // ── Quiz question generators (8 types) ──
  function makeOhmQuestion() {
    var qTypes = [
      // Type 1: Find current (I = V/R)
      function() {
        var V = [3, 5, 6, 9, 12, 24][Math.floor(Math.random() * 6)];
        var R = [10, 20, 50, 100, 200, 500][Math.floor(Math.random() * 6)];
        var I = V / R;
        return { q: 'A ' + V + 'V battery drives current through a ' + R + '\u03A9 resistor. What is the current?', a: parseFloat(I.toFixed(3)), unit: 'A', formula: 'I = V/R = ' + V + '/' + R + ' = ' + I.toFixed(3) + 'A' };
      },
      // Type 2: Find voltage (V = IR)
      function() {
        var I = [0.1, 0.2, 0.5, 1, 2, 3][Math.floor(Math.random() * 6)];
        var R = [10, 20, 50, 100, 200][Math.floor(Math.random() * 5)];
        var V = I * R;
        return { q: 'A current of ' + I + 'A flows through a ' + R + '\u03A9 resistor. What voltage is required?', a: parseFloat(V.toFixed(1)), unit: 'V', formula: 'V = IR = ' + I + '\u00D7' + R + ' = ' + V.toFixed(1) + 'V' };
      },
      // Type 3: Find resistance (R = V/I)
      function() {
        var V = [6, 9, 12, 24][Math.floor(Math.random() * 4)];
        var I = [0.1, 0.2, 0.5, 1, 2][Math.floor(Math.random() * 5)];
        var R = V / I;
        return { q: 'A ' + V + 'V source pushes ' + I + 'A of current. What is the resistance?', a: parseFloat(R.toFixed(1)), unit: '\u03A9', formula: 'R = V/I = ' + V + '/' + I + ' = ' + R.toFixed(1) + '\u03A9' };
      },
      // Type 4: Find power (P = IV)
      function() {
        var V = [6, 9, 12][Math.floor(Math.random() * 3)];
        var I = [0.5, 1, 2, 3][Math.floor(Math.random() * 4)];
        var P = V * I;
        return { q: 'A ' + V + 'V circuit draws ' + I + 'A. What is the power consumed?', a: parseFloat(P.toFixed(1)), unit: 'W', formula: 'P = IV = ' + I + '\u00D7' + V + ' = ' + P.toFixed(1) + 'W' };
      },
      // Type 5: Series total resistance
      function() {
        var Ra = [50, 100, 200][Math.floor(Math.random() * 3)];
        var Rb = [50, 100, 200][Math.floor(Math.random() * 3)];
        var Rtot = Ra + Rb;
        return { q: 'Two resistors (' + Ra + '\u03A9 and ' + Rb + '\u03A9) are in series. What is the total resistance?', a: parseFloat(Rtot.toFixed(1)), unit: '\u03A9', formula: 'R_total = R1 + R2 = ' + Ra + ' + ' + Rb + ' = ' + Rtot + '\u03A9' };
      },
      // Type 6: Parallel total resistance
      function() {
        var Ra = [100, 200, 300][Math.floor(Math.random() * 3)];
        var Rb = [100, 200, 300][Math.floor(Math.random() * 3)];
        var Rpar = (Ra * Rb) / (Ra + Rb);
        return { q: 'Two resistors (' + Ra + '\u03A9 and ' + Rb + '\u03A9) are in parallel. What is the total resistance?', a: parseFloat(Rpar.toFixed(1)), unit: '\u03A9', formula: 'R = (R1\u00D7R2)/(R1+R2) = (' + Ra + '\u00D7' + Rb + ')/(' + Ra + '+' + Rb + ') = ' + Rpar.toFixed(1) + '\u03A9' };
      },
      // Type 7: Power from R (P = V^2/R)
      function() {
        var V = [6, 9, 12][Math.floor(Math.random() * 3)];
        var R = [10, 20, 50, 100][Math.floor(Math.random() * 4)];
        var P = (V * V) / R;
        return { q: 'A ' + V + 'V source is connected to a ' + R + '\u03A9 resistor. What power is dissipated?', a: parseFloat(P.toFixed(1)), unit: 'W', formula: 'P = V\u00B2/R = ' + V + '\u00B2/' + R + ' = ' + P.toFixed(1) + 'W' };
      },
      // Type 8: Find current from power (I = P/V)
      function() {
        var V = [6, 9, 12, 24][Math.floor(Math.random() * 4)];
        var P = [6, 12, 24, 36, 48][Math.floor(Math.random() * 5)];
        var I = P / V;
        return { q: 'A ' + P + 'W device runs on ' + V + 'V. How much current does it draw?', a: parseFloat(I.toFixed(3)), unit: 'A', formula: 'I = P/V = ' + P + '/' + V + ' = ' + I.toFixed(3) + 'A' };
      }
    ];

    var gen = qTypes[Math.floor(Math.random() * qTypes.length)]();
    var decimals = gen.unit === 'A' ? 3 : 1;
    var wrong1 = parseFloat((gen.a * (1.5 + Math.random())).toFixed(decimals));
    var wrong2 = parseFloat((gen.a * (0.2 + Math.random() * 0.5)).toFixed(decimals));
    var wrong3 = parseFloat((gen.a + (Math.random() > 0.5 ? 1 : -1) * (gen.a * 0.3 + 5)).toFixed(decimals));
    if (wrong2 <= 0) wrong2 = parseFloat((gen.a * 2.5).toFixed(decimals));
    // Distractors must be positive and distinct from the correct answer AND each other, else a negative
    // option could appear (~21% of questions) or a distractor within tolerance would score as correct
    // (inflating XP). Repair any bad option with deterministic fallback multipliers.
    var _qTol = 0.01;
    var _qFallback = [2.5, 0.4, 1.7, 3.3, 0.6, 1.25];
    var _qSeen = {}; _qSeen[gen.a.toFixed(decimals)] = true;
    var _fixOpt = function (w) {
      var fi = 0;
      while ((!(w > 0) || Math.abs(w - gen.a) < _qTol || _qSeen[w.toFixed(decimals)]) && fi < _qFallback.length) {
        w = parseFloat((gen.a * _qFallback[fi]).toFixed(decimals)); fi++;
      }
      _qSeen[w.toFixed(decimals)] = true;
      return w;
    };
    wrong1 = _fixOpt(wrong1); wrong2 = _fixOpt(wrong2); wrong3 = _fixOpt(wrong3);
    var opts = [gen.a, wrong1, wrong2, wrong3].sort(function() { return Math.random() - 0.5; });
    return { text: gen.q, answer: gen.a, unit: gen.unit, formula: gen.formula, opts: opts, answered: false };
  }

  // ══════════════════════════════════════════════════
  // Register the Circuit Builder tool
  // ══════════════════════════════════════════════════
  // --- Helper functions for Branching Electron Paths ---
  function getSeriesPath(components, spacing) {
    var path = [{ x: 35, y: 20 }];
    if (components.length === 0) {
      path.push({ x: 400, y: 20 });
      path.push({ x: 400, y: 140 });
      path.push({ x: 35, y: 140 });
      return path;
    }
    for (var i = 0; i < components.length; i++) {
      var cx = 80 + i * spacing;
      var comp = components[i];
      var compTopY = 55;
      var compBottomY = comp.type === 'resistor' ? 100 : (comp.type === 'switch' ? 95 : (comp.type === 'ammeter' || comp.type === 'voltmeter' ? 90 : (comp.type === 'capacitor' ? 100 : 92)));
      
      if (i % 2 === 0) {
        path.push({ x: cx, y: 20 });
        path.push({ x: cx, y: compTopY });
        path.push({ x: cx, y: compBottomY });
        path.push({ x: cx, y: 140 });
      } else {
        path.push({ x: cx, y: 140 });
        path.push({ x: cx, y: compBottomY });
        path.push({ x: cx, y: compTopY });
        path.push({ x: cx, y: 20 });
      }
    }
    var lastCx = 80 + (components.length - 1) * spacing;
    if ((components.length - 1) % 2 === 0) {
      path.push({ x: 35, y: 140 });
    } else {
      path.push({ x: 400, y: 20 });
      path.push({ x: 400, y: 140 });
      path.push({ x: 35, y: 140 });
    }
    return path;
  }

  function getParallelPath(cy) {
    return [
      { x: 35, y: 20 },
      { x: 180, y: 20 },
      { x: 180, y: cy },
      { x: 200, y: cy },
      { x: 240, y: cy },
      { x: 260, y: cy },
      { x: 260, y: 140 },
      { x: 35, y: 140 }
    ];
  }

  function getPositionAlongPath(path, fraction) {
    if (path.length === 0) return { x: 0, y: 0 };
    if (path.length === 1) return path[0];
    var segs = [];
    var totalLen = 0;
    for (var i = 0; i < path.length - 1; i++) {
      var dx = path[i+1].x - path[i].x;
      var dy = path[i+1].y - path[i].y;
      var len = Math.sqrt(dx*dx + dy*dy);
      segs.push(len);
      totalLen += len;
    }
    var targetDist = fraction * totalLen;
    var accumDist = 0;
    for (var i = 0; i < segs.length; i++) {
      if (accumDist + segs[i] >= targetDist) {
        var segFrac = segs[i] > 0 ? (targetDist - accumDist) / segs[i] : 0;
        var p1 = path[i];
        var p2 = path[i+1];
        return {
          x: p1.x + (p2.x - p1.x) * segFrac,
          y: p1.y + (p2.y - p1.y) * segFrac
        };
      }
      accumDist += segs[i];
    }
    return path[path.length - 1];
  }

  function CircuitConfirmationDialog(props) {
    var React = props.React;
    var h = React.createElement;
    var dialogRef = React.useRef(null);
    var cancelButtonRef = React.useRef(null);
    var cancelHandlerRef = React.useRef(props.onCancel);
    var confirmHandlerRef = React.useRef(props.onConfirm);
    cancelHandlerRef.current = props.onCancel;
    confirmHandlerRef.current = props.onConfirm;

    React.useEffect(function() {
      var dialog = dialogRef.current;
      if (!dialog) return undefined;
      var previousFocus = typeof document !== 'undefined' ? document.activeElement : null;
      var overlay = dialog.parentElement;
      var root = dialog.closest('[data-circuit-builder-root="true"]');
      var blocked = [];

      if (root && overlay) {
        Array.prototype.forEach.call(root.children, function(element) {
          if (element === overlay) return;
          blocked.push({
            element: element,
            hadInert: element.hasAttribute('inert'),
            inertValue: element.getAttribute('inert'),
            hadAriaHidden: element.hasAttribute('aria-hidden'),
            ariaHiddenValue: element.getAttribute('aria-hidden')
          });
          element.setAttribute('inert', '');
          element.setAttribute('aria-hidden', 'true');
        });
      }

      var getFocusable = function() {
        return Array.prototype.slice.call(dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      };
      var focusInitial = function() {
        (cancelButtonRef.current || dialog).focus();
      };
      var onKeyDown = function(event) {
        if (event.key === 'Escape') {
          event.preventDefault();
          cancelHandlerRef.current();
          return;
        }
        if (event.key !== 'Tab') return;
        var focusable = getFocusable();
        if (!focusable.length) {
          event.preventDefault();
          dialog.focus();
          return;
        }
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      };
      var onFocusIn = function(event) {
        if (!dialog.contains(event.target)) focusInitial();
      };

      document.addEventListener('keydown', onKeyDown, true);
      document.addEventListener('focusin', onFocusIn, true);
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(focusInitial);
      else setTimeout(focusInitial, 0);

      return function() {
        document.removeEventListener('keydown', onKeyDown, true);
        document.removeEventListener('focusin', onFocusIn, true);
        blocked.forEach(function(entry) {
          if (entry.hadInert) entry.element.setAttribute('inert', entry.inertValue || '');
          else entry.element.removeAttribute('inert');
          if (entry.hadAriaHidden) entry.element.setAttribute('aria-hidden', entry.ariaHiddenValue || '');
          else entry.element.removeAttribute('aria-hidden');
        });
        var fallbackSelector = props.action && props.action.returnFocusSelector;
        setTimeout(function() {
          var target = previousFocus && previousFocus.isConnected ? previousFocus :
            fallbackSelector && document.querySelector(fallbackSelector);
          if (target && typeof target.focus === 'function') target.focus();
        }, 0);
      };
    }, [props.action]);

    var isRemove = props.action.type === 'remove';
    var title = isRemove ? 'Remove component?' : 'Clear circuit?';
    var description = isRemove
      ? 'Remove this ' + props.action.componentName + '? You can add it back from the toolbox.'
      : 'Clear all ' + props.action.count + ' components from the circuit? This cannot be undone.';
    var confirmLabel = isRemove ? 'Remove component' : 'Clear circuit';

    return h('div', {
      role: 'presentation',
      className: 'fixed inset-0 z-[10050] flex items-center justify-center bg-black/70 p-4',
      onMouseDown: function(event) { if (event.target === event.currentTarget) cancelHandlerRef.current(); }
    },
      h('div', {
        ref: dialogRef,
        role: 'alertdialog',
        'aria-modal': 'true',
        'aria-labelledby': 'circuit-confirm-title',
        'aria-describedby': 'circuit-confirm-description',
        tabIndex: -1,
        className: 'w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-red-500/50 bg-slate-950 p-5 text-slate-100 shadow-2xl'
      },
        h('h2', { id: 'circuit-confirm-title', className: 'text-lg font-black text-white' }, title),
        h('p', { id: 'circuit-confirm-description', className: 'mt-2 text-sm leading-relaxed text-slate-300' }, description),
        h('div', { className: 'mt-5 flex flex-wrap justify-end gap-3' },
          h('button', {
            ref: cancelButtonRef,
            type: 'button',
            onClick: function() { cancelHandlerRef.current(); },
            className: 'min-h-11 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300'
          }, 'Cancel'),
          h('button', {
            type: 'button',
            onClick: function() { confirmHandlerRef.current(); },
            className: 'min-h-11 rounded-lg border border-red-500 bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300'
          }, confirmLabel)
        )
      )
    );
  }

  window.StemLab.registerTool('circuit', {
    icon: '\uD83D\uDD0C',
    label: 'Circuit Builder',
    desc: 'Build series & parallel circuits with Ohm\'s Law',
    color: 'yellow',
    category: 'science',
    questHooks: [
      { id: 'build_3_components', label: 'Build a circuit with 3+ components', icon: '\uD83D\uDD0C', check: function(d) { return (d.components || []).length >= 3; }, progress: function(d) { return (d.components || []).length + '/3 components'; } },
      { id: 'build_5_components', label: 'Build a circuit with 5+ components', icon: '\u26A1', check: function(d) { return (d.components || []).length >= 5; }, progress: function(d) { return (d.components || []).length + '/5 components'; } },
      { id: 'ohm_score_3', label: 'Score 3+ on Ohm\'s Law quiz', icon: '\uD83E\uDDE0', check: function(d) { return (d.ohmScore || 0) >= 3; }, progress: function(d) { return (d.ohmScore || 0) + '/3'; } },
      { id: 'complete_challenge', label: 'Complete a circuit challenge', icon: '\uD83C\uDFAF', check: function(d) { return (d.challengesDone || 0) >= 1; }, progress: function(d) { return (d.challengesDone || 0) >= 1 ? 'Done!' : 'Not yet'; } },
      { id: 'complete_3_challenges', label: 'Complete 3 circuit challenges', icon: '\uD83C\uDFC6', check: function(d) { return (d.challengesDone || 0) >= 3; }, progress: function(d) { return (d.challengesDone || 0) + '/3'; } }
    ],
    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var React = ctx.React;
      var h = React.createElement;

      if (!this._CircuitComponent) {
        this._CircuitComponent = function CircuitLab(props) {
          var ctx = props.ctx;
          var React = ctx.React;
          var h = React.createElement;
          var ArrowLeft = ctx.icons.ArrowLeft;
          var addToast = ctx.addToast;
          var awardXP = ctx.awardXP;
          var announceToSR = ctx.announceToSR;
          var a11yClick = ctx.a11yClick;
          var callGemini = ctx.callGemini;
          var callTTS = ctx.callTTS;
          var setToolSnapshots = ctx.setToolSnapshots;
          var setStemLabTool = ctx.setStemLabTool;
          var setStemLabTab = ctx.setStemLabTab;

          var band = getGradeBand(ctx);

          // ── State via labToolData ──
          var ld = ctx.toolData || {};
          var d = ld._circuit || {};
          var confirmationAction = d.confirmAction || null;
          var circuitSnapshot = function(c) { return { components: (c.components || []).map(function(p) { return Object.assign({}, p); }), mode: c.mode || 'series', voltage: c.voltage == null ? 9 : c.voltage }; };
          var travelHistory = function(direction) {
            ctx.setToolData(function(prev) {
              var prior = prev._circuit || {}, stack = prior[direction] || [];
              if (!stack.length) return prev;
              var other = direction === 'undo' ? 'redo' : 'undo';
              var next = Object.assign({}, prior, stack[stack.length - 1], { confirmAction: null, experimentResult:null });
              next[direction] = stack.slice(0, -1); next[other] = (prior[other] || []).concat([circuitSnapshot(prior)]).slice(-30);
              return Object.assign({}, prev, { _circuit: next });
            });
            if (typeof announceToSR === 'function') announceToSR(direction === 'undo' ? 'Circuit edit undone.' : 'Circuit edit restored.');
          };
          var upd = function(key, val) {
            if (typeof ctx.setToolData === 'function') {
              ctx.setToolData(function(prev) {
                var circ = Object.assign({}, (prev && prev._circuit) || {});
                if (['components', 'mode', 'voltage'].indexOf(key) !== -1 && circ[key] !== val) {
                  circ.undo = (circ.undo || []).concat([circuitSnapshot(circ)]).slice(-30); circ.redo = []; circ.experimentResult=null;
                }
                circ[key] = val;
                return Object.assign({}, prev, { _circuit: circ });
              });
            }
          };
          var updMulti = function(obj) {
            if (typeof ctx.setToolData === 'function') {
              ctx.setToolData(function(prev) {
                var prior = (prev && prev._circuit) || {};
                var circ = Object.assign({}, prior, obj);
                if (['components', 'mode', 'voltage'].some(function(k) { return Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== prior[k]; })) {
                  circ.undo = (prior.undo || []).concat([circuitSnapshot(prior)]).slice(-30); circ.redo = []; circ.experimentResult=null;
                }
                return Object.assign({}, prev, { _circuit: circ });
              });
            }
          };

          // ── State defaults ──

          var solved = React.useMemo(function(){return solveCircuit(d);},[d.components,d.mode,d.voltage]);
          // Keep static solid geometry out of animation-only React updates.
          var spatialView = React.useMemo(function(){
            return d.benchView==='3d'?h(CircuitBench3D,{React:React,solved:solved,state:d,update:upd,updateMany:updMulti}):null;
          },[React,solved,d.benchView,d.cameraYaw,d.cameraTilt,d.cameraZoom,d.cameraPanX,d.cameraPanY,d.cameraDragMode,d.sceneLabels,d.sceneCloseup,d.sceneCurrent,d.sceneCompare,d.sceneProbes,d.probeRed,d.probeBlack,d.probePractice,d.selectedPart,ctx.setToolData]);

          var mode = solved.mode;
          var components = solved.components;
          var voltage = solved.voltage;
          var tick = d.tick || 0;
          var showBadges = d.showBadges || false;
          var showAI = d.showAI || false;
          var showKirchhoff = d.showKirchhoff || false;
          var showPresets = d.showPresets != null ? d.showPresets : false;
          var badges = d.badges || {};
          var aiQuestion = d.aiQuestion || '';
          var aiResponse = d._aiResponse || '';
          var aiLoading = d._aiLoading || false;

          // Badge tracking state
          var compAdded = d.compAdded || 0;
          var switchToggles = d.switchToggles || 0;
          var typesUsed = d.typesUsed || {};
          var challengesDone = d.challengesDone || 0;
          var ohmScore = d.ohmScore || 0;
          var ohmStreak = d.ohmStreak || 0;
          var shortTriggered = d.shortTriggered || false;
          var _prefersReducedMotion = !!d.pauseMotion || ((typeof window !== 'undefined' && window.matchMedia) ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false);
          var presetsLoaded = d.presetsLoaded || 0;
          var presetsLoadedSet = d.presetsLoadedSet || {};
          var challengesDoneSet = d.challengesDoneSet || {};

          // Ohm quiz state
          var ohmQuiz = d.ohmQuiz || null;

          // ── Badge checker ──
          var checkBadges = function(updates) {
            var newBadges = Object.assign({}, badges);
            var awarded = false;
            BADGES.forEach(function(b) {
              if (!newBadges[b.id] && b.check(updates)) {
                newBadges[b.id] = true;
                awarded = true;
                circuitSound('badge');
                if (typeof addToast === 'function') addToast(b.icon + ' Badge: ' + b.name + ' - ' + b.desc, 'success');
                if (typeof awardXP === 'function') awardXP('circuitBadge', 15, b.name);
              }
            });
            if (awarded) upd('badges', newBadges);
          };

          var getBadgeUpdates = function(extra) {
            var base = {
              compAdded: compAdded,
              seriesBuilt: mode === 'series' && components.length >= 3,
              parallelBuilt: mode === 'parallel' && components.length >= 3,
              switchToggles: switchToggles,
              typesUsed: typesUsed,
              challengesDone: challengesDone,
              quizScore: ohmScore,
              quizStreak: ohmStreak,
              shortTriggered: shortTriggered,
              presetsLoaded: presetsLoaded
            };
            if (extra) {
              var keys = Object.keys(extra);
              for (var i = 0; i < keys.length; i++) {
                base[keys[i]] = extra[keys[i]];
              }
            }
            return base;
          };

          // ── Component resistance helper ──
          var getCompR = circuitResistance;
          var reading = function(c) { return solved.rows[components.indexOf(c)]; };

          // ── Toggle switch ──
          var toggleSwitch = function(compId) {
            var newComps = components.map(function(c) {
              if (c.id === compId) return Object.assign({}, c, { closed: !c.closed });
              return c;
            });
            var newToggles = switchToggles + 1;
            updMulti({ components: newComps, switchToggles: newToggles });
            circuitSound('switchToggle');
            checkBadges(getBadgeUpdates({ switchToggles: newToggles }));
          };

          // ── Cycle LED color ──
          var LED_COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#f8fafc'];
          var cycleLedColor = function(compId) {
            var newComps = components.map(function(c) {
              if (c.id !== compId) return c;
              var ci = LED_COLORS.indexOf(c.ledColor || '#ef4444');
              return Object.assign({}, c, { ledColor: LED_COLORS[(ci + 1) % LED_COLORS.length] });
            });
            upd('components', newComps);
            if (typeof addToast === 'function') addToast('💡 LED color changed', 'info');
          };

          // ── Circuit calculations ──
          var hasOpenSwitch = mode === 'series' && components.some(function(c) { return c.type === 'switch' && !c.closed; });

          var noLoadPath = components.length === 0;
          var totalR = solved.totalR;
          var current = solved.current;
          var power = solved.power;
          var isShort = solved.isShort;
          var isOpen = solved.isOpen;
          var hasAmmeter = components.some(function(comp) { return comp.type === 'ammeter'; });
          var hasVoltmeter = components.some(function(comp) { return comp.type === 'voltmeter'; });
          var meterIssue = mode === 'parallel' && hasAmmeter ? 'ammeter-short' :
            mode === 'series' && hasVoltmeter ? 'voltmeter-open' : '';
          var meterStatus = meterIssue === 'ammeter-short' ? __alloT('stem.circuit.meter_status_ammeter_short', 'Unsafe placement: short-circuit path') :
            meterIssue === 'voltmeter-open' ? __alloT('stem.circuit.meter_status_voltmeter_open', 'Incorrect placement: circuit is nearly open') :
            hasAmmeter || hasVoltmeter ? __alloT('stem.circuit.meter_status_correct', 'Measurement placement is correct') : '';
          var meterGuidance = meterIssue === 'ammeter-short'
            ? __alloT('stem.circuit.meter_guidance_ammeter_short', 'An ammeter has nearly zero resistance. Across parallel nodes it bypasses the load and draws extremely high current. Move it into the series path.')
            : meterIssue === 'voltmeter-open'
            ? __alloT('stem.circuit.meter_guidance_voltmeter_open', 'A voltmeter has extremely high resistance. In series it nearly stops current. Connect it across the component whose voltage difference you want.')
            : hasAmmeter
            ? __alloT('stem.circuit.meter_guidance_ammeter_ok', 'The ammeter is in series, so circuit current passes through it.')
            : hasVoltmeter
            ? __alloT('stem.circuit.meter_guidance_voltmeter_ok', 'The voltmeter is in parallel, so it compares electric potential across the branch while drawing negligible current.')
            : '';
          // Award only after commit, never update the host while rendering.
          React.useEffect(function() {
          if (isShort && !shortTriggered) {
            updMulti({ shortTriggered: true });
            circuitSound('shortCircuit');
            checkBadges(getBadgeUpdates({ shortTriggered: true }));
          }

          // Check series/parallel badges (inline, no useEffect)
          if (mode === 'series' && components.length >= 3) {
            checkBadges(getBadgeUpdates({ seriesBuilt: true }));
          }
          if (mode === 'parallel' && components.length >= 3) {
            checkBadges(getBadgeUpdates({ parallelBuilt: true }));
          }

          }, [mode, components.length, isShort, shortTriggered, JSON.stringify(badges)]);

          // ── Conventional-current animation; cleaned up on unmount and pause ──
          var W = 440, H = 200;

          React.useEffect(function() {
          if (current > 0.001 && !isShort && !_prefersReducedMotion) {
            if (window._circuitAnimTimer) clearTimeout(window._circuitAnimTimer);
            if (!document.hidden) window._circuitAnimTimer = setTimeout(function() {
              upd('tick', (tick + 1) % 400);
            }, 60);
          }

            var onVisibility = function() { if (!document.hidden && !_prefersReducedMotion) upd('tick', (tick + 1) % 400); else if (window._circuitAnimTimer) clearTimeout(window._circuitAnimTimer); };
            document.addEventListener('visibilitychange', onVisibility);
            return function() { if (window._circuitAnimTimer) clearTimeout(window._circuitAnimTimer); document.removeEventListener('visibilitychange', onVisibility); };
          }, [current, isShort, _prefersReducedMotion, tick]);

          var electronDots = [];
          if (current > 0.001 && !isShort) {
            if (mode === 'series') {
              var spacing = Math.min(70, 280 / Math.max(components.length, 1));
              var path = getSeriesPath(components, spacing);
              var numDots = Math.min(Math.ceil(current * 10), 30);
              var speed = 0.02 * current;
              for (var ei = 0; ei < numDots; ei++) {
                var fraction = ((tick * speed + ei * (1 / numDots)) % 1);
                var pt = getPositionAlongPath(path, fraction);
                electronDots.push(pt);
              }
            } else {
              // Parallel mode: split dots proportional to branch current
              var maxCy = 40 + (components.length - 1) * Math.min(30, 80 / Math.max(components.length, 1));
              for (var ci = 0; ci < components.length; ci++) {
                var comp = components[ci];
                var compR = getCompR(comp);
                var compI = reading(comp).current;
                if (compI > 0.001) {
                  var cy = 40 + ci * Math.min(30, 80 / Math.max(components.length, 1));
                  var path = getParallelPath(cy);
                  var numDots = Math.min(Math.ceil(compI * 8), 15);
                  var speed = 0.025 * compI;
                  for (var ei = 0; ei < numDots; ei++) {
                    var fraction = ((tick * speed + ei * (1 / numDots)) % 1);
                    var pt = getPositionAlongPath(path, fraction);
                    electronDots.push(pt);
                  }
                }
              }
            }
          }

          // ── Add component helper ──
          var addComponent = function(type, value, extra) {
            if (components.length >= 8) { if (typeof addToast === 'function') addToast('This bench holds eight parts. Remove a part or use Advanced Simulator for larger networks.', 'info'); return; }
            var newComp = Object.assign({ type: type, value: value, id: Date.now() + Math.floor(Math.random() * 1000) }, extra || {});
            var newComps = components.concat([newComp]);
            var newTypesUsed = Object.assign({}, typesUsed);
            newTypesUsed[type] = true;
            var newCount = compAdded + 1;
            updMulti({ components: newComps, typesUsed: newTypesUsed, compAdded: newCount, selectedPart: newComps.length - 1 });
            circuitSound('addComp');
            checkBadges(getBadgeUpdates({ compAdded: newCount, typesUsed: newTypesUsed }));
          };

          // ── Remove component ──
          var performRemoveComponent = function(idx) {
            var newComps = components.filter(function(_, j) { return j !== idx; });
            upd('components', newComps);
            circuitSound('removeComp');
          };
          var removeComponent = function(idx) {
            // Confirm only when removing from a substantial circuit (5+ components),
            // so quick early-stage edits stay frictionless.
            if (components.length >= 5) {
              var comp = components[idx];
              var adjacent = components[idx + 1] || components[idx - 1];
              upd('confirmAction', {
                type: 'remove',
                componentId: comp && comp.id,
                componentName: comp && comp.type ? comp.type : 'component',
                returnFocusSelector: adjacent
                  ? '[data-circuit-remove-id="' + adjacent.id + '"]'
                  : '[data-circuit-add-component="resistor"]'
              });
              return;
            }
            performRemoveComponent(idx);
          };

          // ── Clear components ──
          var clearComponents = function() {
            if (components.length === 0) return;
            upd('confirmAction', {
              type: 'clear',
              count: components.length,
              returnFocusSelector: '[data-circuit-clear="true"]'
            });
          };
          var confirmCircuitAction = function() {
            var action = d.confirmAction;
            if (!action) return;
            if (action.type === 'remove') {
              var remaining = components.filter(function(component) { return component.id !== action.componentId; });
              updMulti({ components: remaining, confirmAction: null });
              if (typeof announceToSR === 'function') announceToSR('Component removed. ' + remaining.length + ' components remain.');
            } else if (action.type === 'clear') {
              updMulti({ components: [], confirmAction: null });
              if (typeof announceToSR === 'function') announceToSR(__alloT('stem.circuit.sr_circuit_cleared', 'Circuit cleared.'));
            }
            circuitSound('removeComp');
          };

          // ── Load preset ──
          var loadPreset = function(preset) {
            var newSet = Object.assign({}, presetsLoadedSet);
            newSet[preset.id] = true;
            var newCount = Object.keys(newSet).length;
            // Deep copy components
            var presetComps = preset.components.map(function(c) {
              return Object.assign({}, c, { id: Date.now() + Math.floor(Math.random() * 10000) + c.id });
            });
            updMulti({
              mode: preset.mode,
              voltage: preset.voltage,
              components: presetComps,
              presetsLoaded: newCount,
              presetsLoadedSet: newSet
            });
            circuitSound('addComp');
            if (typeof addToast === 'function') addToast('\uD83D\uDCCB Loaded: ' + preset.label, 'info');
            checkBadges(getBadgeUpdates({ presetsLoaded: newCount }));
          };

          // ── AI Tutor ──
          var askAI = function() {
            if (aiLoading) return;
            if (!aiQuestion || !aiQuestion.trim()) return;
            updMulti({ _aiLoading: true, _aiResponse: '' });
            var prompt = 'You are a friendly electronics tutor. ' +
              'The student is building ' + mode + ' circuits in the Circuit Builder. ' +
              'Current circuit: ' + components.length + ' components, ' + voltage + 'V. ' +
              'Their question: "' + aiQuestion + '"\n\n' +
              'Give a clear explanation appropriate for grade level (' + band + '). Use Ohm\'s Law examples. Keep under 150 words.';
            if (typeof callGemini === 'function') {
              callGemini(prompt, false, false, 0.7).then(function(resp) {
                updMulti({ _aiResponse: resp, _aiLoading: false });
              }).catch(function() {
                updMulti({ _aiResponse: 'Sorry, could not connect to the AI tutor.', _aiLoading: false });
              });
            } else {
              updMulti({ _aiResponse: 'AI tutor is not available in this environment.', _aiLoading: false });
            }
          };

          // ── LED glow color helper ──
          var getLedGlowColor = function(ledColor, opacity) {
            var map = {
              '#ef4444': 'rgba(239,68,68,' + opacity + ')',
              '#22c55e': 'rgba(34,197,94,' + opacity + ')',
              '#3b82f6': 'rgba(59,130,246,' + opacity + ')',
              '#eab308': 'rgba(234,179,8,' + opacity + ')',
              '#f8fafc': 'rgba(248,250,252,' + opacity + ')'
            };
            return map[ledColor] || 'rgba(239,68,68,' + opacity + ')';
          };

          // ── Component icon helper ──
          var getCompIcon = function(type) {
            if (type === 'resistor') return '\u2AE8';
            if (type === 'bulb') return '\uD83D\uDCA1';
            if (type === 'switch') return '\uD83D\uDD18';
            if (type === 'led') return '\uD83D\uDD34';
            if (type === 'ammeter') return '\u26A1';
            if (type === 'voltmeter') return '\uD83D\uDD0B';
            if (type === 'capacitor') return '\u2E28';
            return '\u2AE8';
          };

          // ── Component label helper ──
          var getCompLabel = function(comp) {
            if (comp.type === 'resistor') return 'R';
            if (comp.type === 'bulb') return __alloT('stem.circuit.comp_bulb', 'Bulb');
            if (comp.type === 'switch') return comp.closed ? __alloT('stem.circuit.switch_on', 'ON') : __alloT('stem.circuit.switch_off', 'OFF');
            if (comp.type === 'led') return __alloT('stem.circuit.comp_led', 'LED');
            if (comp.type === 'ammeter') return __alloT('stem.circuit.comp_ammeter', 'Ammeter');
            if (comp.type === 'voltmeter') return __alloT('stem.circuit.comp_voltmeter', 'Voltmeter');
            if (comp.type === 'capacitor') return __alloT('stem.circuit.comp_cap_abbrev', 'Cap');
            return comp.type;
          };

          // ── Grade-band intro text ──
          var introText = gradeText(
            __alloT('stem.circuit.intro_g_low', 'Build a circuit! Connect parts to make electricity flow and light up bulbs.'),
            __alloT('stem.circuit.intro_g_mid', 'Build series and parallel circuits. Add resistors, bulbs, and switches. Watch how changing voltage affects current!'),
            __alloT('stem.circuit.intro_g_high', 'Explore Ohm\'s Law (V=IR) by building circuits. Compare series vs parallel. Measure with ammeter and voltmeter.'),
            __alloT('stem.circuit.intro_g_adv', 'Analyze series and parallel DC circuits using Ohm\'s Law, Kirchhoff\'s Laws, and power dissipation.')
          )(band);
          var earnedBadgeCount = Object.keys(badges).length;
          var challengeProgress = Object.keys(challengesDoneSet || {}).length;
          var circuitState = voltage === 0 ? {label:'Source off',tone:'#cbd5e1',soft:'#1e293b',note:'Raise the source voltage to energize the circuit.'} : (!isOpen && current === 0 && solved.hasLED) ? {label:'LED below turn-on',tone:'#fbbf24',soft:'#362817',note:'Check the combined LED forward voltage.'} : isShort ? {
            label: __alloT('stem.circuit.state_short_risk', 'Short risk'),
            tone: '#f87171',
            soft: 'rgba(127,29,29,0.38)',
            note: __alloT('stem.circuit.state_short_risk_note', 'Add resistance before current spikes.')
          } : (isOpen || current === 0) ? {
            label: components.length === 0 ? __alloT('stem.circuit.state_ready_to_build', 'Ready to build') : __alloT('stem.circuit.state_open_path', 'Open path'),
            tone: '#fbbf24',
            soft: 'rgba(120,53,15,0.34)',
            note: components.length === 0 ? __alloT('stem.circuit.state_ready_note', 'Start with a load, then close the loop.') : __alloT('stem.circuit.state_open_note', 'Check open switches, capacitor branches, LED polarity, and source voltage.')
          } : {
            label: __alloT('stem.circuit.state_current_flowing', 'Current flowing'),
            tone: '#22d3ee',
            soft: 'rgba(8,145,178,0.20)',
            note: __alloT('stem.circuit.state_current_flowing_note', 'Use the meters and readouts to test the model.')
          };
          var benchStats = [
            { label: __alloT('stem.circuit.stat_parts', 'Parts'), value: String(components.length), hint: mode + ' circuit' },
            { label: __alloT('stem.circuit.stat_voltage', 'Voltage'), value: voltage + 'V', hint: __alloT('stem.circuit.stat_voltage_hint', 'battery source') },
            { label: __alloT('stem.circuit.stat_current', 'Current'), value: current.toFixed(3) + 'A', hint: isShort ? __alloT('stem.circuit.stat_current_too_high', 'too high') : __alloT('stem.circuit.stat_current_live_flow', 'live flow') },
            { label: __alloT('stem.circuit.badges', 'Badges'), value: earnedBadgeCount + '/' + BADGES.length, hint: challengeProgress + ' challenges' }
          ];
          var benchRoutes = [
            { title: __alloT('stem.circuit.route_load_starter', 'Load Starter Circuit'), icon: '\uD83D\uDD34', note: __alloT('stem.circuit.route_load_starter_note', 'LED + resistor baseline'), action: function() { loadPreset(CIRCUIT_PRESETS[0]); }, tone: '#f97316' },
            { title: __alloT('stem.circuit.route_open_presets', 'Open Presets'), icon: '\uD83D\uDCCB', note: __alloT('stem.circuit.route_open_presets_note', 'Voltage dividers, meters, short demo'), action: function() { upd('showPresets', true); setTimeout(function() { var panel=document.getElementById('circuit-presets-panel'); if(panel) panel.scrollIntoView({block:'start'}); },0); }, tone: '#facc15' },
            { title: __alloT('stem.circuit.route_advanced_sim', 'Advanced Simulator'), icon: '\uD83D\uDD0C', note: __alloT('stem.circuit.route_advanced_sim_note', 'CircuitJS meters and real-world challenges'), action: function() { if (typeof ctx.setToolData === 'function') ctx.setToolData(function(prev) { var cur = Object.assign({}, (prev && prev._circuitShelf) || {}); cur.returnTool = 'circuit'; var next = Object.assign({}, prev); next._circuitShelf = cur; return next; }); if (typeof setStemLabTab === 'function') setStemLabTab('explore'); if (typeof setStemLabTool === 'function') { setStemLabTool('circuitShelf'); if (typeof announceToSR === 'function') announceToSR(__alloT('stem.circuit.sr_opening_circuit_shelf_advanced_simulator', 'Opening Circuit Shelf advanced simulator.')); } else if (typeof addToast === 'function') addToast('Advanced simulator is not available right now.', 'info'); }, tone: '#fb923c' },
            { title: __alloT('stem.circuit.route_try_target', 'Try a Target'), icon: '\uD83C\uDFAF', note: challengeProgress + '/' + CHALLENGES.length + ' solved', action: function() { upd('challenge', CHALLENGES[0]); if (typeof addToast === 'function') addToast('Target ready: ' + CHALLENGES[0].label, 'info'); }, tone: '#34d399' },
            { title: band === 'g68' || band === 'g912' ? __alloT('stem.circuit.route_show_laws', 'Show Laws') : __alloT('stem.circuit.route_ask_tutor', 'Ask Tutor'), icon: band === 'g68' || band === 'g912' ? '\u2696' : '\uD83E\uDD16', note: band === 'g68' || band === 'g912' ? __alloT('stem.circuit.route_kirchhoff_support', 'Kirchhoff support') : __alloT('stem.circuit.route_circuit_hint', 'Get a circuit hint'), action: function() { if (band === 'g68' || band === 'g912') upd('showKirchhoff', true); else upd('showAI', true); }, tone: '#a78bfa' }
          ];
          var renderCircuitBench = function() {
            return h('section',{'data-circuit-bench':'true','aria-labelledby':'circuit-bench-title',className:'mb-4'},
              h('span',{className:'circuit-eyebrow'},'ELECTRONICS / EXPLORATION LAB'),
              h('h2',{id:'circuit-bench-title',className:'text-2xl sm:text-3xl font-black text-white mt-2'},'Small circuits. Big discoveries.'),
              h('p',{className:'circuit-help'},introText),
              h('div',{className:'circuit-action-row'},benchRoutes.slice(0,3).map(function(route){return h('button',{key:route.title,type:'button',onClick:route.action},route.title);}),
                h('span',{className:'circuit-model-chip'},circuitState.label+' · '+circuitCurrentText(current))));
          };


          var renderCircuitCoach = function() {
            var coach=circuitCoach(d);
            return h('section',{className:'circuit-live-coach','data-tone':coach.tone,'aria-label':'Circuit insight'},
              h('span',{className:'circuit-eyebrow'},'NOTICE & WONDER'),
              h('h3',null,coach.title),h('p',null,coach.body),
              coach.index>=0&&h('button',{type:'button',onClick:function(){upd('selectedPart',coach.index);setTimeout(function(){var el=document.getElementById('circuit-inspect-part');if(el){el.focus();el.scrollIntoView({block:'center'});}},0);}},'Inspect part '+(coach.index+1)),
              components.length>0&&h('details',{className:'circuit-reading-map'},h('summary',null,'Read the circuit: voltage & current'),
                h('p',null,mode==='series'?'The bars show each part’s share of source voltage. Voltage drops add to the source voltage.':'The bars show each branch’s share of source current. Branch currents add to the source current.'),
                h('ul',null,solved.rows.map(function(r,i){
                  var share=mode==='series'?(r.voltage==null||!voltage?null:r.voltage/voltage):(current?r.current/current:null);
                  return h('li',{key:i},h('div',{className:'circuit-reading-label'},h('strong',null,(i+1)+'. '+r.component.type),h('span',null,circuitVoltageText(r.voltage,2)+' · '+circuitCurrentText(r.current))),
                    h('div',{className:'circuit-reading-track','aria-hidden':true},h('span',{style:{width:share==null?'0%':Math.min(100,Math.max(0,share*100))+'%'}})),
                    h('small',null,share==null?'Share unavailable at this operating point':(share*100).toFixed(1)+'% of source '+(mode==='series'?'voltage':'current')));
                })),
                h('div',{className:'circuit-concept-key'},h('p',null,h('strong',null,'Voltage (V)'),' — energy transferred per unit charge.'),h('p',null,h('strong',null,'Current (A)'),' — charge passing a point each second.'),h('p',null,h('strong',null,'Power (W)'),' — energy transferred each second. P = VI.'))));
          };

          var renderPartsShelf = function() { return h('section',{className:'circuit-parts-shelf','aria-label':'Power supply and parts shelf'},h('h3',null,'Build your circuit'),// Voltage slider row
              h('div', { className: 'circuit-supply-row' },
                h('span', { className: 'text-xl' }, 'Power supply'),
                h('input', {
                  type: 'range', 'aria-label': __alloT('stem.circuit.aria_voltage_slider', 'Voltage slider'), min: 0, max: 24, step: 0.5,
                  value: voltage,
                  'aria-valuetext': voltage + ' volts. ' + (current === 0 ? 'No source current flows.' : ((isShort ? 'Short circuit! ' : '') + 'Total resistance ' + totalR.toFixed(1) + ' ohms, current ' + current.toFixed(3) + ' amps.')),
                  onChange: function(e) { upd('voltage', parseFloat(e.target.value)); },
                  className: 'flex-1 accent-yellow-500 bg-slate-800 rounded-lg h-1.5 appearance-none cursor-pointer'
                }),
                h('span', { className: 'font-bold text-yellow-500 w-12 text-right font-mono' }, voltage + 'V')
              ),h('div', { className: 'circuit-parts-grid' },
              h('button', { 'data-circuit-add-component': 'resistor', 'aria-label': __alloT('stem.circuit.comp_resistor', 'Resistor'),
                disabled: components.length >= 8, onClick: function() { addComponent('resistor', 100); },
                className: 'px-3 py-1.5 bg-yellow-950/20 hover:bg-yellow-500/20 text-yellow-400 font-bold rounded-lg text-xs border border-yellow-500/30 hover:border-yellow-400 transition-all glow-button active:scale-[0.97]'
              }, '\u2795 ' + __alloT('stem.circuit.comp_resistor', 'Resistor'), h('small', null, "Limit current · 100 Ω")),

              h('button', { 'aria-label': __alloT('stem.circuit.comp_bulb', 'Bulb'),
                disabled: components.length >= 8, onClick: function() { addComponent('bulb', 50); },
                className: 'px-3 py-1.5 bg-amber-950/20 hover:bg-amber-500/20 text-amber-400 font-bold rounded-lg text-xs border border-amber-500/30 hover:border-amber-400 transition-all glow-button active:scale-[0.97]'
              }, '\uD83D\uDCA1 ' + __alloT('stem.circuit.comp_bulb', 'Bulb'), h('small', null, "See energy transfer · 50 Ω")),

              h('button', { 'aria-label': __alloT('stem.circuit.comp_switch', 'Switch'),
                disabled: components.length >= 8, onClick: function() { addComponent('switch', 0, { closed: true }); },
                className: 'px-3 py-1.5 bg-emerald-950/20 hover:bg-emerald-500/20 text-emerald-400 font-bold rounded-lg text-xs border border-emerald-500/30 hover:border-emerald-400 transition-all glow-button active:scale-[0.97]'
              }, '\uD83D\uDD18 ' + __alloT('stem.circuit.comp_switch', 'Switch'), h('small', null, "Open or close a path")),

              h('button', { 'aria-label': __alloT('stem.circuit.comp_led', 'LED'),
                disabled: components.length >= 8, onClick: function() { addComponent('led', 40, { ledColor: '#ef4444' }); },
                className: 'px-3 py-1.5 bg-rose-950/20 hover:bg-rose-500/20 text-rose-400 font-bold rounded-lg text-xs border border-rose-500/30 hover:border-rose-400 transition-all glow-button active:scale-[0.97]'
              }, '\uD83D\uDD34 ' + __alloT('stem.circuit.comp_led', 'LED'), h('small', null, "One direction · add series R")),

              h('button', { 'aria-label': __alloT('stem.circuit.comp_ammeter', 'Ammeter'),
                disabled: components.length >= 8, onClick: function() { addComponent('ammeter', 0); },
                className: 'px-3 py-1.5 bg-cyan-950/20 hover:bg-cyan-500/20 text-cyan-400 font-bold rounded-lg text-xs border border-cyan-500/30 hover:border-cyan-400 transition-all glow-button active:scale-[0.97]'
              }, '\u26A1 ' + __alloT('stem.circuit.comp_ammeter', 'Ammeter'), h('small', null, "Measure current · in series")),

              h('button', { 'aria-label': __alloT('stem.circuit.comp_voltmeter', 'Voltmeter'),
                disabled: components.length >= 8, onClick: function() { addComponent('voltmeter', 0); },
                className: 'px-3 py-1.5 bg-orange-950/20 hover:bg-orange-500/20 text-orange-400 font-bold rounded-lg text-xs border border-orange-500/30 hover:border-orange-400 transition-all glow-button active:scale-[0.97]'
              }, '\uD83D\uDD0B ' + __alloT('stem.circuit.comp_voltmeter', 'Voltmeter'), h('small', null, "Measure voltage · across")),

              h('button', { 'aria-label': __alloT('stem.circuit.comp_capacitor', 'Capacitor'),
                disabled: components.length >= 8, onClick: function() { addComponent('capacitor', 100); },
                className: 'px-3 py-1.5 bg-sky-950/20 hover:bg-sky-500/20 text-sky-400 font-bold rounded-lg text-xs border border-sky-500/30 hover:border-sky-400 transition-all glow-button active:scale-[0.97]'
              }, '\u2E28 ' + __alloT('stem.circuit.comp_capacitor', 'Capacitor'), h('small', null, "Store charge · 100 µF")),

              h('button', { 'data-circuit-clear': 'true', 'aria-label': __alloT('stem.circuit.comp_clear', 'Clear'),
                onClick: clearComponents,
                className: 'px-3 py-1.5 bg-red-950/30 hover:bg-red-500/30 text-red-400 font-bold rounded-lg text-xs border border-red-500/30 hover:border-red-400 transition-all active:scale-[0.97]'
              }, '\uD83D\uDDD1 ' + __alloT('stem.circuit.comp_clear', 'Clear'), h('small', null, "Remove all parts · undoable")),

              components.length > 0 && h('span', { className: 'self-center text-xs text-slate-400 ml-auto font-mono' }, components.length + ' / 8 parts' + (components.length >= 8 ? ' · bench full' : ''))
            )); };
          var renderSchematic = function() { return h('div', { className: 'relative', hidden: d.benchView === '3d', style:{maxWidth:'100%',overflowX:'auto'} },
              h('p', {className:'circuit-help'}, 'Schematic: scroll sideways on small screens. Exact measurements are available in Inspect part.'),
              h('svg', {
                viewBox: '0 0 ' + W + ' ' + H,
                className: 'w-full rounded-xl border transition-all ' + (isShort ? 'bg-red-950/20 border-red-500/50 shadow-lg shadow-red-500/10' : 'bg-slate-900 border-slate-800 shadow-inner'),
                role: 'img',
                'aria-label': 'Interactive ' + mode + ' circuit schematic. Battery ' + voltage + ' volts, ' + components.length + ' components, current ' + current.toFixed(3) + ' amps, source power ' + power.toFixed(2) + ' watts. ' + (isShort ? 'Warning: short circuit.' : (current > 0.001 ? 'Circuit energized; animated charge carriers show current flow.' : 'No current is flowing.')),
                style: { minWidth: '600px' }
              },
                // Definitions for gradients & patterns
                h('defs', null,
                  h('pattern', { id: 'grid', width: 20, height: 20, patternUnits: 'userSpaceOnUse' },
                    h('path', { d: 'M 20 0 L 0 0 0 20', fill: 'none', stroke: 'rgba(255,255,255,0.03)', strokeWidth: 1 })
                  ),
                  h('radialGradient', { id: 'circuit-ambient', cx: '42%', cy: '48%', r: '72%' },
                    h('stop', { offset: '0%', stopColor: isShort ? '#ef4444' : '#0891b2', stopOpacity: current > 0.001 ? 0.18 : 0.04 }),
                    h('stop', { offset: '62%', stopColor: isShort ? '#7f1d1d' : '#172554', stopOpacity: current > 0.001 ? 0.12 : 0.03 }),
                    h('stop', { offset: '100%', stopColor: '#020617', stopOpacity: 0 })
                  ),
                  h('linearGradient', { id: 'circuit-battery', x1: '0', y1: '0', x2: '1', y2: '1' },
                    h('stop', { offset: '0%', stopColor: isShort ? '#f87171' : '#fde047' }),
                    h('stop', { offset: '48%', stopColor: isShort ? '#991b1b' : '#ca8a04' }),
                    h('stop', { offset: '100%', stopColor: isShort ? '#450a0a' : '#713f12' })
                  ),
                  h('filter', { id: 'circuit-wire-glow', x: '-30%', y: '-80%', width: '160%', height: '260%' },
                    h('feGaussianBlur', { stdDeviation: isShort ? '2.8' : '1.8', result: 'wireBlur' }),
                    h('feMerge', null,
                      h('feMergeNode', { in: 'wireBlur' }),
                      h('feMergeNode', { in: 'SourceGraphic' })
                    )
                  ),
                  // LED Gradients
                  components.map(function(c) {
                    if (c.type !== 'led') return null;
                    return h('linearGradient', { key: 'led-grad-' + c.id, id: 'led-grad-' + c.id, x1: 0, y1: 0, x2: 0, y2: 1 },
                      h('stop', { offset: '0%', stopColor: c.ledColor || '#ef4444', stopOpacity: 0.7 }),
                      h('stop', { offset: '100%', stopColor: c.ledColor || '#ef4444', stopOpacity: 0 })
                    );
                  })
                ),
                
                // Grid Background
                h('rect', { width: W, height: H, fill: 'url(#grid)', rx: 12 }),
                h('rect', { width: W, height: H, fill: 'url(#circuit-ambient)', rx: 12, pointerEvents: 'none' }),
                
                // Battery
                h('rect', { x: 11, y: 36, width: 48, height: 68, fill: isShort ? '#ef4444' : '#eab308', opacity: current > 0.001 ? 0.18 : 0.08, rx: 10, filter: 'url(#circuit-wire-glow)' }),
                h('rect', { x: 15, y: 40, width: 40, height: 60, fill: 'url(#circuit-battery)', stroke: isShort ? '#fca5a5' : '#fde047', strokeWidth: 2, rx: 6 }),
                // Highlight on battery
                h('rect', { x: 17, y: 42, width: 12, height: 56, fill: 'rgba(255,255,255,0.08)', rx: 3 }),
                h('text', { x: 35, y: 74, textAnchor: 'middle', style: { fontSize: '11px', fontWeight: '900', fontFamily: 'system-ui' }, fill: '#ffffff' }, voltage + 'V'),
                h('text', { x: 35, y: 30, textAnchor: 'middle', style: { fontSize: '12px' } }, '\uD83D\uDD0B'),
                h('text', { x: 20, y: 38, fill: '#ef4444', style: { fontSize: '12px', fontWeight: 'bold' } }, '+'),
                h('text', { x: 20, y: 110, fill: '#3b82f6', style: { fontSize: '12px', fontWeight: 'bold' } }, '\u2212'),

                // Dynamic Wires
                (function() {
                  var wires = [];
                  var wireColor = isShort ? '#fb7185' : (current > 0.001 ? '#22d3ee' : '#64748b');
                  var wWidth = isShort ? 2.5 : 2;
                  
                  if (components.length === 0) {
                    wires.push(h('line', { key: 'w0', x1: 35, y1: 20, x2: 400, y2: 20, stroke: wireColor, strokeWidth: wWidth }));
                    wires.push(h('line', { key: 'w1', x1: 400, y1: 20, x2: 400, y2: 140, stroke: wireColor, strokeWidth: wWidth }));
                    wires.push(h('line', { key: 'w2', x1: 400, y1: 140, x2: 35, y2: 140, stroke: wireColor, strokeWidth: wWidth }));
                  } else if (mode === 'series') {
                    var spacing = Math.min(70, 280 / Math.max(components.length, 1));
                    var cx0 = 80;
                    wires.push(h('line', { key: 'w0', x1: 35, y1: 20, x2: cx0, y2: 20, stroke: wireColor, strokeWidth: wWidth }));
                    
                    for (var i = 0; i < components.length; i++) {
                      var cx = 80 + i * spacing;
                      var comp = components[i];
                      var compTopY = 55;
                      var compBottomY = comp.type === 'resistor' ? 100 : (comp.type === 'switch' ? 95 : (comp.type === 'ammeter' || comp.type === 'voltmeter' ? 90 : (comp.type === 'capacitor' ? 100 : 92)));
                      
                      wires.push(h('line', { key: 'wv1-' + i, x1: cx, y1: 20, x2: cx, y2: compTopY, stroke: wireColor, strokeWidth: wWidth }));
                      wires.push(h('line', { key: 'wv2-' + i, x1: cx, y1: compBottomY, x2: cx, y2: 140, stroke: wireColor, strokeWidth: wWidth }));
                      
                      if (i < components.length - 1) {
                        var nextCx = 80 + (i + 1) * spacing;
                        if (i % 2 === 0) {
                          wires.push(h('line', { key: 'wh-' + i, x1: cx, y1: 140, x2: nextCx, y2: 140, stroke: wireColor, strokeWidth: wWidth }));
                        } else {
                          wires.push(h('line', { key: 'wh-' + i, x1: cx, y1: 20, x2: nextCx, y2: 20, stroke: wireColor, strokeWidth: wWidth }));
                        }
                      }
                    }
                    
                    var lastCx = 80 + (components.length - 1) * spacing;
                    if ((components.length - 1) % 2 === 0) {
                      wires.push(h('line', { key: 'wret', x1: lastCx, y1: 140, x2: 35, y2: 140, stroke: wireColor, strokeWidth: wWidth }));
                    } else {
                      wires.push(h('line', { key: 'wret1', x1: lastCx, y1: 20, x2: 400, y2: 20, stroke: wireColor, strokeWidth: wWidth }));
                      wires.push(h('line', { key: 'wret2', x1: 400, y1: 20, x2: 400, y2: 140, stroke: wireColor, strokeWidth: wWidth }));
                      wires.push(h('line', { key: 'wret3', x1: 400, y1: 140, x2: 35, y2: 140, stroke: wireColor, strokeWidth: wWidth }));
                    }
                  } else {
                    // Parallel mode
                    var maxCy = 40 + (components.length - 1) * Math.min(30, 80 / Math.max(components.length, 1));
                    wires.push(h('line', { key: 'w0', x1: 35, y1: 20, x2: 180, y2: 20, stroke: wireColor, strokeWidth: wWidth }));
                    wires.push(h('line', { key: 'w1', x1: 180, y1: 20, x2: 180, y2: maxCy, stroke: wireColor, strokeWidth: wWidth }));
                    wires.push(h('line', { key: 'w2', x1: 260, y1: maxCy, x2: 260, y2: 140, stroke: wireColor, strokeWidth: wWidth }));
                    wires.push(h('line', { key: 'w3', x1: 260, y1: 140, x2: 35, y2: 140, stroke: wireColor, strokeWidth: wWidth }));
                  }
                  return h('g', { filter: current > 0.001 || isShort ? 'url(#circuit-wire-glow)' : null, opacity: current > 0.001 ? 0.95 : 1 }, wires);
                })(),

                // Battery connections
                h('line', { x1: 35, y1: 40, x2: 35, y2: 20, stroke: isShort ? '#ef4444' : '#475569', strokeWidth: 2 }),
                h('line', { x1: 35, y1: 100, x2: 35, y2: 140, stroke: isShort ? '#ef4444' : '#475569', strokeWidth: 2 }),

                // Electric-field signal pulse: it races around the conductor while
                // individual charge carriers below remain discrete and visibly slower.
                !isShort && current > 0.001 && h('g', { 'aria-hidden': 'true', pointerEvents: 'none' },
                  h('g', { className: 'circ-signal-pulse' },
                    h('rect', { x: 45, y: 16, width: 24, height: 8, rx: 4, fill: '#67e8f9', opacity: 0.24, filter: 'url(#circuit-wire-glow)' }),
                    h('circle', { cx: 57, cy: 20, r: 3.2, fill: '#ecfeff', stroke: '#22d3ee', strokeWidth: 1 }),
                    h('path', { d: 'M51 20 H63', stroke: '#ffffff', strokeWidth: 1.2, opacity: 0.9 })
                  ),
                  h('text', { x: 302, y: 15, fill: '#a5f3fc', style: { fontSize: '7px', fontWeight: 'bold', fontFamily: 'monospace' } }, __alloT('stem.circuit.field_signal_light_speed', 'field signal ≈ light speed'))
                ),
                // Current direction arrow
                !isShort && current > 0.01 && h('g', null,
                  h('polygon', { points: '210,12 220,8 220,16', fill: '#06b6d4', filter: 'drop-shadow(0 0 2px #06b6d4)' }),
                  h('text', { x: 225, y: 15, fill: '#06b6d4', style: { fontSize: '8px', fontWeight: 'bold', fontFamily: 'monospace' } }, 'I = ' + current.toFixed(2) + 'A')
                ),

                // ── Components: Series layout ──
                mode === 'series'
                  ? components.map(function(comp, i) {
                      var spacing = Math.min(70, 280 / Math.max(components.length, 1));
                      var cx = 80 + i * spacing;
                      var compI = current;
                      var compR = getCompR(comp);
                      var compV = reading(comp).voltage;
                      var compP = reading(comp).power;
                      var bulbBright = comp.type === 'bulb' ? Math.min(compP / 12, 1) : 0;
                      var ledGlow = comp.type === 'led' && current > 0.005 ? Math.min(current * 20, 1) : 0;
                      var chargeLvl = Math.min(tick / 120, 1);

                      return h('g', { key: comp.id },
                        // Power aura scales with P = VI, revealing where energy becomes heat or light.
                        compP > 0.01 && comp.type !== 'switch' && comp.type !== 'ammeter' && comp.type !== 'voltmeter' && h('ellipse', {
                          cx: cx, cy: 78, rx: 18 + Math.min(compP, 20) * 0.7, ry: 25 + Math.min(compP, 20) * 0.8,
                          fill: comp.type === 'bulb' ? '#fde047' : (comp.type === 'led' ? (comp.ledColor || '#ef4444') : '#fb923c'),
                          opacity: Math.min(0.08 + compP / 55, 0.34), filter: 'blur(6px)', 'aria-hidden': 'true'
                        }),
                        // Component body
                        comp.type === 'resistor'
                          ? h('g', null,
                              h('rect', { x: cx - 12, y: 55, width: 24, height: 45, fill: '#1e293b', stroke: '#eab308', strokeWidth: 1.5, rx: 4 }),
                              // Color bands
                              h('rect', { x: cx - 12, y: 62, width: 24, height: 4, fill: '#d97706' }),
                              h('rect', { x: cx - 12, y: 70, width: 24, height: 4, fill: '#4f46e5' }),
                              h('rect', { x: cx - 12, y: 78, width: 24, height: 4, fill: '#0891b2' }),
                              h('rect', { x: cx - 12, y: 86, width: 24, height: 4, fill: '#ca8a04' })
                            )

                          : comp.type === 'switch'
                          ? h('g', { onClick: function() { toggleSwitch(comp.id); }, role: 'button', tabIndex: 0, 'aria-label': 'Switch ' + comp.id + ' (currently ' + (comp.closed ? 'closed/ON' : 'open/OFF') + '). Press Enter to toggle.', 'aria-pressed': !!comp.closed, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSwitch(comp.id); } }, style: { cursor: 'pointer' } },
                              h('rect', { x: cx - 14, y: 55, width: 28, height: 40, fill: comp.closed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', stroke: comp.closed ? '#10b981' : '#ef4444', strokeWidth: 1.5, rx: 5 }),
                              h('circle', { cx: cx - 6, cy: 75, r: 3, fill: '#94a3b8' }),
                              h('circle', { cx: cx + 6, cy: 75, r: 3, fill: '#94a3b8' }),
                              // Animated rotating switch arm
                              h('line', { x1: cx - 6, y1: 75, x2: cx + 8, y2: 75, stroke: comp.closed ? '#10b981' : '#ef4444', strokeWidth: 2.5, style: { transform: comp.closed ? 'none' : 'rotate(-35deg)', transformOrigin: (cx - 6) + 'px 75px', transition: 'transform 0.25s ease' } }),
                              h('text', { x: cx, y: 66, textAnchor: 'middle', style: { fontSize: '7px', fontWeight: '900', fontFamily: 'system-ui' }, fill: comp.closed ? '#10b981' : '#ef4444' }, comp.closed ? __alloT('stem.circuit.switch_on', 'ON') : __alloT('stem.circuit.switch_off', 'OFF'))
                            )

                          : comp.type === 'led'
                          ? h('g', { transform: 'rotate(' + ((!!comp.reversed !== (i % 2 === 1)) ? 180 : 0) + ' ' + cx + ' 75)', onClick: function() { cycleLedColor(comp.id); }, role: 'button', tabIndex: 0, 'aria-label': 'LED ' + comp.id + ' (color ' + (comp.ledColor || '#ef4444') + '). Press Enter to cycle color.', onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycleLedColor(comp.id); } }, style: { cursor: 'pointer' } },
                              // Glow light cone
                              ledGlow > 0.1 && h('polygon', { points: (cx - 14) + ',78 ' + (cx + 14) + ',78 ' + cx + ',115', fill: 'url(#led-grad-' + comp.id + ')', pointerEvents: 'none' }),
                              ledGlow > 0.1 && h('circle', { cx: cx, cy: 75, r: 14 + ledGlow * 6, fill: getLedGlowColor(comp.ledColor || '#ef4444', (ledGlow * 0.35).toFixed(2)), filter: 'blur(2px)' }),
                              h('polygon', { points: (cx - 10) + ',65 ' + (cx + 10) + ',65 ' + cx + ',85', fill: ledGlow > 0.2 ? (comp.ledColor || '#ef4444') : '#475569', stroke: comp.ledColor || '#ef4444', strokeWidth: 1.5 }),
                              h('line', { x1: cx - 10, y1: 85, x2: cx + 10, y2: 85, stroke: comp.ledColor || '#ef4444', strokeWidth: 2 })
                            )

                          : comp.type === 'ammeter'
                          ? h('g', null,
                              h('circle', { cx: cx, cy: 75, r: 15, fill: '#0f172a', stroke: '#06b6d4', strokeWidth: 2 }),
                              h('text', { x: cx, y: 79, textAnchor: 'middle', style: { fontSize: '12px', fontWeight: '900', fontFamily: 'monospace' }, fill: '#06b6d4' }, 'A'),
                              current > 0.001 && h('text', { x: cx, y: 66, textAnchor: 'middle', style: { fontSize: '6px', fontWeight: 'bold', fontFamily: 'monospace' }, fill: '#22d3ee' }, current.toFixed(3) + 'A')
                            )

                          : comp.type === 'voltmeter'
                          ? h('g', null,
                              h('circle', { cx: cx, cy: 75, r: 15, fill: '#0f172a', stroke: '#f59e0b', strokeWidth: 2 }),
                              h('text', { x: cx, y: 79, textAnchor: 'middle', style: { fontSize: '12px', fontWeight: '900', fontFamily: 'monospace' }, fill: '#f59e0b' }, 'V'),
                              h('text', { x: cx, y: 66, textAnchor: 'middle', style: { fontSize: '6px', fontWeight: 'bold', fontFamily: 'monospace' }, fill: '#fbbf24' }, voltage.toFixed(1) + 'V')
                            )

                          : comp.type === 'capacitor'
                          ? h('g', null,
                              h('rect', { x: cx - 14, y: 55, width: 28, height: 45, fill: '#0f172a', stroke: '#38bdf8', strokeWidth: 1.5, rx: 4 }),
                              // Parallel plates
                              h('line', { x1: cx - 8, y1: 72, x2: cx + 8, y2: 72, stroke: '#38bdf8', strokeWidth: 2.5 }),
                              h('line', { x1: cx - 8, y1: 80, x2: cx + 8, y2: 80, stroke: '#38bdf8', strokeWidth: 2.5 }),
                              h('text', { x: cx, y: 64, textAnchor: 'middle', style: { fontSize: '6px', fontWeight: 'bold' }, fill: '#38bdf8' }, 'C'),
                              // Charge accumulation signs (+ / -)
                              current > 0.001 && h('g', { opacity: chargeLvl },
                                h('text', { x: cx - 10, y: 70, fill: '#ef4444', style: { fontSize: '8px', fontWeight: 'bold' } }, '+'),
                                h('text', { x: cx + 5, y: 70, fill: '#ef4444', style: { fontSize: '8px', fontWeight: 'bold' } }, '+'),
                                h('text', { x: cx - 10, y: 88, fill: '#3b82f6', style: { fontSize: '8px', fontWeight: 'bold' } }, '\u2212'),
                                h('text', { x: cx + 5, y: 88, fill: '#3b82f6', style: { fontSize: '8px', fontWeight: 'bold' } }, '\u2212')
                              )
                            )

                          // Bulb
                          : h('g', null,
                              bulbBright > 0.1 && h('circle', { cx: cx, cy: 77, r: 18 + bulbBright * 15, fill: 'rgba(251,191,36,' + (bulbBright * 0.35).toFixed(2) + ')', filter: 'blur(3px)' }),
                              h('circle', { cx: cx, cy: 77, r: 15, fill: bulbBright > 0.2 ? 'rgba(253,224,71,' + (0.3 + bulbBright * 0.7).toFixed(2) + ')' : '#334155', stroke: '#eab308', strokeWidth: 1.5 }),
                              // filament
                              h('path', { d: 'M ' + (cx - 4) + ' 82 Q ' + cx + ' 68 ' + (cx + 4) + ' 82', fill: 'none', stroke: bulbBright > 0.2 ? '#ffffff' : '#94a3b8', strokeWidth: 1.5 })
                            ),

                        // Value label
                        comp.type !== 'switch' && comp.type !== 'ammeter' && comp.type !== 'voltmeter'
                          && h('text', {
                            x: cx,
                            y: comp.type === 'resistor' ? 112 : (comp.type === 'led' ? 104 : (comp.type === 'capacitor' ? 112 : 100)),
                            textAnchor: 'middle',
                            style: { fontSize: '8px', fontWeight: 'bold', fontFamily: 'monospace' },
                            fill: '#cbd5e1'
                          }, comp.type === 'led' ? circuitForwardVoltage(comp) + 'V LED' : (comp.type === 'capacitor' ? comp.value + '\u00B5F' : comp.value + '\u03A9')),

                        // Voltage drop label
                        current > 0.01 && comp.type !== 'switch' && comp.type !== 'ammeter' && comp.type !== 'voltmeter'
                          && h('text', {
                            x: cx,
                            y: comp.type === 'resistor' ? 120 : (comp.type === 'led' ? 112 : (comp.type === 'capacitor' ? 120 : 108)),
                            textAnchor: 'middle',
                            style: { fontSize: '7px', fontFamily: 'monospace' },
                            fill: '#38bdf8'
                          }, circuitVoltageText(compV, 1))
                      );
                    })

                  // ── Components: Parallel layout ──
                  : components.map(function(comp, i) {
                      var cy = 40 + i * Math.min(30, 80 / Math.max(components.length, 1));
                      var compR2 = getCompR(comp);
                      var compI2 = reading(comp).current;
                      var compP2 = voltage * compI2;
                      var branchStrength = Math.min(1, Math.log10(1 + Math.max(0, compI2)) / 1.4);
                      var isIdealParallelBranch2 = mode === 'parallel' && compR2 < 0.01;
                      var bulbBright2 = comp.type === 'bulb' ? Math.min(compP2 / 12, 1) : 0;
                      var ledGlow2 = comp.type === 'led' && compI2 > 0.005 ? Math.min(compI2 * 20, 1) : 0;
                      var chargeLvl = Math.min(tick / 120, 1);

                      return h('g', { key: comp.id },
                        // Each branch gets its own P = VI aura, making parallel power sharing visible.
                        compP2 > 0.01 && comp.type !== 'switch' && comp.type !== 'ammeter' && comp.type !== 'voltmeter' && h('ellipse', {
                          cx: 220, cy: cy, rx: 28 + Math.min(compP2, 20) * 0.55, ry: 13 + Math.min(compP2, 20) * 0.35,
                          fill: comp.type === 'bulb' ? '#fde047' : (comp.type === 'led' ? (comp.ledColor || '#ef4444') : '#fb923c'),
                          opacity: Math.min(0.08 + compP2 / 55, 0.34), filter: 'blur(5px)', 'aria-hidden': 'true'
                        }),
                        // Branch glow and junction nodes encode how total current divides.
                        !isShort && compI2 > 0.001 && h('g', { 'aria-hidden': 'true', pointerEvents: 'none', filter: 'url(#circuit-wire-glow)' },
                          h('line', { x1: 180, y1: cy, x2: 202, y2: cy, stroke: '#22d3ee', strokeWidth: 2 + branchStrength * 4, opacity: 0.24 + branchStrength * 0.6 }),
                          h('line', { x1: 238, y1: cy, x2: 260, y2: cy, stroke: '#22d3ee', strokeWidth: 2 + branchStrength * 4, opacity: 0.24 + branchStrength * 0.6 }),
                          h('circle', { cx: 180, cy: cy, r: 2.5 + branchStrength * 1.8, fill: '#a5f3fc', stroke: '#0891b2', strokeWidth: 1 }),
                          h('circle', { cx: 260, cy: cy, r: 2.5 + branchStrength * 1.8, fill: '#a5f3fc', stroke: '#0891b2', strokeWidth: 1 })
                        ),                        // Leads connecting to bus lines
                        h('line', { x1: 180, y1: cy, x2: 200, y2: cy, stroke: '#475569', strokeWidth: 1.5 }),
                        h('line', { x1: 240, y1: cy, x2: 260, y2: cy, stroke: '#475569', strokeWidth: 1.5 }),

                        // Component body (parallel - horizontal)
                        comp.type === 'resistor'
                          ? h('g', null,
                              h('rect', { x: 200, y: cy - 8, width: 40, height: 16, fill: '#1e293b', stroke: '#eab308', strokeWidth: 1.5, rx: 3 }),
                              h('rect', { x: 208, y: cy - 8, width: 3, height: 16, fill: '#d97706' }),
                              h('rect', { x: 216, y: cy - 8, width: 3, height: 16, fill: '#4f46e5' }),
                              h('rect', { x: 224, y: cy - 8, width: 3, height: 16, fill: '#0891b2' })
                            )

                          : comp.type === 'switch'
                          ? h('g', { onClick: function() { toggleSwitch(comp.id); }, role: 'button', tabIndex: 0, 'aria-label': 'Switch ' + comp.id + ' (currently ' + (comp.closed ? 'closed/ON' : 'open/OFF') + '). Press Enter to toggle.', 'aria-pressed': !!comp.closed, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSwitch(comp.id); } }, style: { cursor: 'pointer' } },
                              h('rect', { x: 200, y: cy - 8, width: 40, height: 16, fill: comp.closed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', stroke: comp.closed ? '#10b981' : '#ef4444', strokeWidth: 1.5, rx: 3 }),
                              h('circle', { cx: 208, cy: cy, r: 2.5, fill: '#94a3b8' }),
                              h('circle', { cx: 232, cy: cy, r: 2.5, fill: '#94a3b8' }),
                              h('line', { x1: 208, y1: cy, x2: 232, y2: cy, stroke: comp.closed ? '#10b981' : '#ef4444', strokeWidth: 2, style: { transform: comp.closed ? 'none' : 'rotate(-35deg)', transformOrigin: '208px ' + cy + 'px', transition: 'transform 0.25s ease' } }),
                              h('text', { x: 220, y: cy - 10, textAnchor: 'middle', style: { fontSize: '7px', fontWeight: '900' }, fill: comp.closed ? '#10b981' : '#ef4444' }, comp.closed ? __alloT('stem.circuit.switch_on', 'ON') : __alloT('stem.circuit.switch_off', 'OFF'))
                            )

                          : comp.type === 'led'
                          ? h('g', { transform: 'rotate(' + (comp.reversed ? 90 : -90) + ' 220 ' + cy + ')', onClick: function() { cycleLedColor(comp.id); }, role: 'button', tabIndex: 0, 'aria-label': 'LED ' + comp.id + ' (color ' + (comp.ledColor || '#ef4444') + '). Press Enter to cycle color.', onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycleLedColor(comp.id); } }, style: { cursor: 'pointer' } },
                              ledGlow2 > 0.1 && h('circle', { cx: 220, cy: cy, r: 12 + ledGlow2 * 5, fill: getLedGlowColor(comp.ledColor || '#ef4444', (ledGlow2 * 0.35).toFixed(2)), filter: 'blur(2px)' }),
                              h('polygon', { points: '212,' + (cy - 5) + ' 228,' + (cy - 5) + ' 220,' + (cy + 7), fill: ledGlow2 > 0.2 ? (comp.ledColor || '#ef4444') : '#475569', stroke: comp.ledColor || '#ef4444', strokeWidth: 1.2 }),
                              h('line', { x1: 212, y1: cy + 7, x2: 228, y2: cy + 7, stroke: comp.ledColor || '#ef4444', strokeWidth: 1.5 })
                            )

                          : comp.type === 'ammeter'
                          ? h('g', null,
                              h('circle', { cx: 220, cy: cy, r: 10, fill: '#0f172a', stroke: '#06b6d4', strokeWidth: 1.5 }),
                              h('text', { x: 220, y: cy + 3.5, textAnchor: 'middle', style: { fontSize: '10px', fontWeight: 'bold', fontFamily: 'monospace' }, fill: '#06b6d4' }, 'A')
                            )

                          : comp.type === 'voltmeter'
                          ? h('g', null,
                              h('circle', { cx: 220, cy: cy, r: 10, fill: '#0f172a', stroke: '#f59e0b', strokeWidth: 1.5 }),
                              h('text', { x: 220, y: cy + 3.5, textAnchor: 'middle', style: { fontSize: '10px', fontWeight: 'bold', fontFamily: 'monospace' }, fill: '#f59e0b' }, 'V')
                            )

                          : comp.type === 'capacitor'
                          ? h('g', null,
                              h('rect', { x: 200, y: cy - 8, width: 40, height: 16, fill: '#0f172a', stroke: '#38bdf8', strokeWidth: 1.5, rx: 3 }),
                              h('line', { x1: 216, y1: cy - 6, x2: 216, y2: cy + 6, stroke: '#38bdf8', strokeWidth: 2 }),
                              h('line', { x1: 224, y1: cy - 6, x2: 224, y2: cy + 6, stroke: '#38bdf8', strokeWidth: 2 })
                            )

                          // bulb
                          : h('g', null,
                              bulbBright2 > 0.1 && h('circle', { cx: 220, cy: cy, r: 12 + bulbBright2 * 5, fill: 'rgba(251,191,36,' + (bulbBright2 * 0.25).toFixed(2) + ')', filter: 'blur(3px)' }),
                              h('circle', { cx: 220, cy: cy, r: 10, fill: bulbBright2 > 0.2 ? 'rgba(253,224,71,' + (0.3 + bulbBright2 * 0.7).toFixed(2) + ')' : '#334155', stroke: '#eab308', strokeWidth: 1.2 })
                            ),

                        // Value/reading labels (parallel)
                        comp.type !== 'switch' && comp.type !== 'ammeter' && comp.type !== 'voltmeter'
                          && h('text', { x: 220, y: cy - 10, textAnchor: 'middle', style: { fontSize: '7px', fontWeight: 'bold', fontFamily: 'monospace' }, fill: '#cbd5e1' }, comp.type === 'led' ? circuitForwardVoltage(comp) + 'V LED' : (comp.type === 'capacitor' ? comp.value + '\u00B5F' : comp.value + '\u03A9')),

                        comp.type === 'ammeter' && h('text', { x: 272, y: cy + 3.5, style: { fontSize: '7px', fontWeight: 'bold', fontFamily: 'monospace' }, fill: '#22d3ee' }, isIdealParallelBranch2 ? __alloT('stem.circuit.meter_reading_short', 'short') : compI2.toFixed(3) + 'A'),
                        comp.type === 'voltmeter' && h('text', { x: 272, y: cy + 3.5, style: { fontSize: '7px', fontWeight: 'bold', fontFamily: 'monospace' }, fill: '#fbbf24' }, voltage.toFixed(1) + 'V'),
                        comp.type !== 'ammeter' && comp.type !== 'voltmeter' && h('text', { x: 272, y: cy + 3.5, style: { fontSize: '7px', fontFamily: 'monospace' }, fill: '#38bdf8' }, isIdealParallelBranch2 ? __alloT('stem.circuit.meter_reading_short', 'short') : compI2.toFixed(2) + 'A')
                      );
                    }),

                // Persistent schematic fault marker: visible even without canvas animation.
                isShort && h('g', { 'aria-hidden': 'true', pointerEvents: 'none', className: 'circuit-short' },
                  h('circle', { cx: 70, cy: 69, r: 30, fill: '#ef4444', opacity: 0.12, filter: 'url(#circuit-wire-glow)' }),
                  h('path', { d: 'M55 43 L68 58 L61 65 L78 82 L72 64 L81 58 L67 43 Z', fill: '#fef2f2', stroke: '#fb7185', strokeWidth: 1.4, filter: 'url(#circuit-wire-glow)' }),
                  h('path', { d: 'M91 48 L85 55 L92 61 L84 69', fill: 'none', stroke: '#fda4af', strokeWidth: 2, strokeLinecap: 'round' }),
                  h('path', { d: 'M48 83 L42 89 L49 95', fill: 'none', stroke: '#fda4af', strokeWidth: 2, strokeLinecap: 'round' }),
                  h('rect', { x: 105, y: 50, width: 130, height: 34, rx: 8, fill: '#450a0a', stroke: '#fb7185', strokeWidth: 1.2, opacity: 0.96 }),
                  h('text', { x: 170, y: 64, textAnchor: 'middle', fill: '#fecaca', style: { fontSize: '9px', fontWeight: '900', fontFamily: 'system-ui' } }, __alloT('stem.circuit.short_circuit_label', 'SHORT CIRCUIT')),
                  h('text', { x: 170, y: 76, textAnchor: 'middle', fill: '#fda4af', style: { fontSize: '7px', fontWeight: 'bold', fontFamily: 'monospace' } }, __alloT('stem.circuit.short_circuit_detail', 'near-zero resistance • current surge'))
                ),
                // Electron dots
                electronDots.map(function(dot, i) {
                  return h('circle', { key: 'e' + i, cx: dot.x, cy: dot.y, r: 3, fill: '#06b6d4', opacity: 0.8, filter: 'drop-shadow(0 0 2px #06b6d4)', 'aria-hidden': 'true' });
                }),

                // Empty state
                components.length === 0 && h('text', { x: W / 2, y: H / 2, textAnchor: 'middle', fill: '#94a3b8', style: { fontSize: '12px', fontFamily: 'monospace', fontWeight: 'bold' } }, __alloT('stem.circuit.add_components_below', 'Add components below'))
              ),

              // Transparent HTML5 canvas overlay for short circuit particles
              isShort && h('canvas', {
                'aria-hidden': 'true',
                ref: function(canvas) {
                  if (!canvas) {
                    if (typeof window !== 'undefined' && window._circuitCanvasCleanup) window._circuitCanvasCleanup();
                    return;
                  }
                  if (canvas._circuitSparkInit) {
                    if (canvas._circuitSparkResize) canvas._circuitSparkResize();
                    if (canvas._circuitSparkSchedule) canvas._circuitSparkSchedule();
                    return;
                  }
                  if (typeof window !== 'undefined' && window._circuitCanvasCleanup) window._circuitCanvasCleanup();
                  var ctx2d = canvas.getContext('2d');
                  if (!ctx2d) return;
                  canvas._circuitSparkInit = true;
                  var w = 0;
                  var h = 0;
                  var sparkActive = true;
                  var sparkRaf = null;

                  function resizeCircuitSparkCanvas() {
                    w = canvas.width = canvas.offsetWidth || W;
                    h = canvas.height = canvas.offsetHeight || H;
                  }

                  function isCircuitSparkHidden() {
                    return typeof document !== 'undefined' && !!document.hidden;
                  }

                  function cancelCircuitSparkFrame() {
                    if (sparkRaf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(sparkRaf);
                    sparkRaf = null;
                  }

                  function scheduleCircuitSparkFrame() {
                    if (!sparkActive || sparkRaf || _prefersReducedMotion || isCircuitSparkHidden()) return;
                    if (typeof requestAnimationFrame !== 'function') return;
                    sparkRaf = requestAnimationFrame(loop);
                  }

                  function cleanupCircuitSparkCanvas() {
                    sparkActive = false;
                    cancelCircuitSparkFrame();
                    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onCircuitSparkVisibilityChange);
                    canvas._circuitSparkInit = false;
                    canvas._circuitSparkCleanup = null;
                    canvas._circuitSparkResize = null;
                    canvas._circuitSparkSchedule = null;
                    if (typeof window !== 'undefined' && window._circuitCanvasCleanup === cleanupCircuitSparkCanvas) window._circuitCanvasCleanup = null;
                  }

                  function onCircuitSparkVisibilityChange() {
                    if (!sparkActive) return;
                    if (!canvas.isConnected) { cleanupCircuitSparkCanvas(); return; }
                    if (isCircuitSparkHidden()) cancelCircuitSparkFrame();
                    else { cancelCircuitSparkFrame(); loop(); }
                  }

                  resizeCircuitSparkCanvas();
                  
                  if (!canvas.particles) {
                    canvas.particles = [];
                    for (var p = 0; p < 20; p++) {
                      canvas.particles.push({
                        x: w / 2 + (Math.random() - 0.5) * 60,
                        y: h / 2 + (Math.random() - 0.5) * 60,
                        vx: (Math.random() - 0.5) * 5,
                        vy: -Math.random() * 3 - 2,
                        life: Math.random() * 25 + 10,
                        maxLife: 35,
                        type: Math.random() > 0.45 ? 'spark' : 'smoke',
                        size: Math.random() * 2.5 + 1
                      });
                    }
                  }
                  
                  function loop() {
                    if (!sparkActive) return;
                    sparkRaf = null;
                    if (!canvas.isConnected) { cleanupCircuitSparkCanvas(); return; }
                    if (isCircuitSparkHidden()) { cancelCircuitSparkFrame(); return; }
                    ctx2d.clearRect(0, 0, w, h);
                    
                    // Spawn sparks near battery / short components
                    if (Math.random() < 0.4) {
                      canvas.particles.push({
                        x: 35 + (Math.random() - 0.5) * 15,
                        y: 40 + Math.random() * 60,
                        vx: (Math.random() - 0.5) * 6,
                        vy: (Math.random() - 0.5) * 4 - 2,
                        life: 30,
                        maxLife: 30,
                        type: 'spark',
                        size: Math.random() * 2.5 + 1.5
                      });
                    }
                    if (Math.random() < 0.25) {
                      canvas.particles.push({
                        x: 35 + Math.random() * (w - 70),
                        y: 20 + (Math.random() - 0.5) * 8,
                        vx: (Math.random() - 0.5) * 2,
                        vy: -Math.random() * 2 - 1,
                        life: 45,
                        maxLife: 45,
                        type: 'smoke',
                        size: Math.random() * 6 + 3
                      });
                    }
                    
                    for (var p = 0; p < canvas.particles.length; p++) {
                      var pt = canvas.particles[p];
                      pt.x += pt.vx;
                      pt.y += pt.vy;
                      pt.life--;
                      
                      if (pt.type === 'spark') {
                        ctx2d.save();
                        ctx2d.shadowColor = 'rgba(251,146,60,0.9)'; ctx2d.shadowBlur = 6;
                        ctx2d.fillStyle = 'rgba(251, 146, 60, ' + (pt.life / pt.maxLife).toFixed(2) + ')';
                        ctx2d.beginPath();
                        ctx2d.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
                        ctx2d.fill();
                        ctx2d.strokeStyle = 'rgba(239, 68, 68, ' + (pt.life / pt.maxLife * 0.4).toFixed(2) + ')';
                        ctx2d.lineWidth = 1;
                        ctx2d.stroke();
                        ctx2d.restore();
                      } else {
                        // smoke
                        ctx2d.fillStyle = 'rgba(148, 163, 184, ' + (pt.life / pt.maxLife * 0.15).toFixed(2) + ')';
                        ctx2d.beginPath();
                        ctx2d.arc(pt.x, pt.y, pt.size + (1 - pt.life / pt.maxLife) * 8, 0, Math.PI * 2);
                        ctx2d.fill();
                      }
                    }
                    
                    canvas.particles = canvas.particles.filter(function(pt) { return pt.life > 0; });
                    scheduleCircuitSparkFrame();
                  }
                  
                  canvas._circuitSparkCleanup = cleanupCircuitSparkCanvas;
                  canvas._circuitSparkResize = resizeCircuitSparkCanvas;
                  canvas._circuitSparkSchedule = scheduleCircuitSparkFrame;
                  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onCircuitSparkVisibilityChange);
                  if (typeof window !== 'undefined') window._circuitCanvasCleanup = cleanupCircuitSparkCanvas;
                  loop();
                },
                className: 'absolute inset-0 w-full h-full pointer-events-none'
              })
            ); };
          var renderExperimentBench = function() {
            var snapshot = d.experimentBaseline;
            var comparison=snapshot?circuitExperimentDiff(snapshot.circuit,d):null;
            var sameCircuit = comparison && comparison.unchanged;
            var comparisonKey=snapshot?JSON.stringify([snapshot.circuit,circuitSnapshot(d)]):'';
            var alreadyRecorded=(d.observations||[]).some(function(o){return o.comparisonKey===comparisonKey;});
            var before = snapshot ? solveCircuit(snapshot.circuit) : null;
            var selectedIndex = Math.min(Math.max(0,d.selectedPart||0),Math.max(0,components.length-1));
            var selected = solved.rows[selectedIndex];
            var fmt = function(n) { return n.toFixed(3)+' A'; };
            var describeCircuit = function(c) { return c.mode+' at '+c.voltage+' V: '+c.components.map(function(p,i) {return (i+1)+'. '+p.type+(p.type==='resistor'||p.type==='bulb'?' '+p.value+' Ω':p.type==='switch'?(p.closed?' closed':' open'):p.type==='led'?(p.reversed?' reversed':' forward'):'');}).join(', '); };
            return h(React.Fragment,null,
              h('section',{className:'circuit-lab-workflow','aria-labelledby':'circuit-investigation-title'},
                h('div',{className:'circuit-step-heading'},
                  h('div',null,h('span',{className:'circuit-eyebrow'},'01 / PREDICT'),h('h3',{id:'circuit-investigation-title'},__alloT('stem.circuit.investigation_title','What will change the current?'))),
                  h('span',{className:'circuit-model-chip'},'DC steady state')),
                h('details',{className:'circuit-guided-lab'},
                h('summary',null,'Plan an investigation'),
                h('p',{className:'circuit-help'},__alloT('stem.circuit.investigation_prompt','Try doubling resistance, changing the supply, or switching between series and parallel. Change one thing at a time.')),
                h('label',{className:'circuit-prediction-label',htmlFor:'circuit-prediction'},__alloT('stem.circuit.prediction_label','My prediction and reason')),
                h('textarea',{id:'circuit-prediction',rows:2,maxLength:600,value:d.prediction||'',placeholder:'I think the current will… because…',onChange:function(e){upd('prediction',e.target.value);}}),
                h('div',{className:'circuit-action-row'},
                  h('button',{type:'button',disabled:!components.length,onClick:function(){updMulti({experimentBaseline:{circuit:circuitSnapshot(d),prediction:d.prediction||''},experimentResult:null,explanation:''});}},snapshot?'Replace baseline':'Save baseline'),
                  h('button',{type:'button',disabled:!snapshot||sameCircuit||alreadyRecorded,onClick:function(){
                    if(!snapshot||sameCircuit||alreadyRecorded)return;
                    var observations=(d.observations||[]).concat([{before:snapshot.circuit,after:circuitSnapshot(d),prediction:snapshot.prediction,delta:current-before.current,explanation:d.explanation||'',changes:comparison.changes,controlled:comparison.controlled,comparisonKey:comparisonKey}]).slice(-8);
                    updMulti({observations:observations,experimentResult:{delta:current-before.current}});
                  }},'Record comparison'),
                  h('span',{className:'circuit-help'},!components.length?'Start with a circuit below.':!snapshot?'Save a baseline before making your change.':sameCircuit?'Baseline saved. Now change one variable.':alreadyRecorded?'This comparison is already in your notebook.':comparison&&comparison.controlled?'One variable changed. Record the evidence.':'Multiple variables changed. Record an observation, then repeat with one change to test a cause.')),
                comparison&&!comparison.unchanged&&h('div',{className:comparison.controlled?'circuit-model-note':'circuit-warning','data-circuit-comparison':comparison.controlled?'controlled':'multiple'},
                  h('strong',null,comparison.controlled?'A controlled comparison':'More than one variable changed'),h('ul',null,comparison.changes.map(function(change,i){return h('li',{key:i},change);}))),
                snapshot&&h('label',{className:'circuit-prediction-label',htmlFor:'circuit-explanation'},'Explain the result before recording'),
                snapshot&&h('textarea',{id:'circuit-explanation',rows:2,maxLength:600,value:d.explanation||'',placeholder:'The current changed because… My evidence is…',onChange:function(e){upd('explanation',e.target.value);}}),
                snapshot&&h('div',{className:'circuit-comparison'},
                  h('div',null,h('span',null,'Baseline current'),h('strong',null,fmt(before.current))),
                  h('div',null,h('span',null,'Current now'),h('strong',null,fmt(current))),
                  h('div',null,h('span',null,'Change'),h('strong',null,(current-before.current>0?'+':'')+fmt(current-before.current)))),
                d.experimentResult&&h('p',{role:'status',className:'circuit-evidence'},'Comparison recorded. '+(d.experimentResult.delta>0?'Current increased.':d.experimentResult.delta<0?'Current decreased.':'Current stayed the same.')+' Explain which circuit change caused your result.'),
                (d.observations||[]).length>0&&h('button',{type:'button',className:'text-xs text-cyan-200 underline',onClick:function(){
                  var blob=new Blob([JSON.stringify({format:'circuit-evidence-v1',model:'steady-dc-led-piecewise',trials:d.observations},null,2)],{type:'application/json'});
                  var url=URL.createObjectURL(blob), link=document.createElement('a');link.href=url;link.download='circuit-evidence.json';link.click();setTimeout(function(){URL.revokeObjectURL(url);},1000);
                }},'Download evidence'),
                (d.observations||[]).length>0&&h('details',{className:'circuit-notebook'},
                  h('summary',null,'Evidence notebook (latest '+d.observations.length+' trials)'),
                  h('ol',null,d.observations.map(function(o,i){return h('li',{key:i},h('strong',null,'Trial '+(i+1)+(o.controlled?' · one variable: ':' · observation: ')),describeCircuit(o.before)+' → '+describeCircuit(o.after)+'. ΔI = '+(o.delta>0?'+':'')+fmt(o.delta),h('p',null,'Prediction: '+(o.prediction||'No written prediction.')),h('p',null,'Explanation: '+(o.explanation||'Not recorded.')));}))),
                h('details',{className:'circuit-notebook'},
                  h('summary',null,__alloT('stem.circuit.guided_investigations','Guided investigations')),
                  h('div',{className:'circuit-action-row'},[
                    {label:'1. Share the voltage',mode:'series',voltage:12,components:[{type:'resistor',value:200,id:1},{type:'resistor',value:100,id:2}]},
                    {label:'2. Add another path',mode:'parallel',voltage:9,components:[{type:'resistor',value:100,id:1},{type:'resistor',value:100,id:2}]},
                    {label:'3. Control the loop',mode:'series',voltage:9,components:[{type:'bulb',value:100,id:1},{type:'switch',closed:false,id:2}]}
                  ].map(function(p){return h('button',{key:p.label,type:'button',onClick:function(){updMulti({mode:p.mode,voltage:p.voltage,components:p.components,experimentBaseline:null,experimentResult:null});}},p.label);})))
              ),
              ),
              h(CircuitGuidedLab,{React:React,state:d,update:upd,updateMany:updMulti}),
              h('section',{className:'circuit-view-toolbar','aria-label':'Circuit view and editing controls'},
                h('span',{className:'circuit-eyebrow'},'02 / BUILD & MEASURE'),
                h('div',{className:'circuit-action-row'},
                  ['schematic','3d'].map(function(view){return h('button',{key:view,type:'button','aria-pressed':(d.benchView||'schematic')===view,onClick:function(){upd('benchView',view);}},view==='3d'?'3D bench':'Schematic');}),
                  h('button',{type:'button',disabled:!(d.undo||[]).length,onClick:function(){travelHistory('undo');}},'Undo'),
                  h('button',{type:'button',disabled:!(d.redo||[]).length,onClick:function(){travelHistory('redo');}},'Redo'),
                  h('button',{type:'button','aria-pressed':!!d.pauseMotion,onClick:function(){upd('pauseMotion',!d.pauseMotion);}},d.pauseMotion?'Resume motion':'Pause motion')),
                h('p',{className:'circuit-help'},mode==='series'?'One continuous path: every part carries the same current.':'Each part is a separate branch across the battery. A switch here controls only its own branch.')),
              h(CircuitFileTools,{React:React,state:d,updateMany:updMulti}),
              renderPartsShelf(),
              spatialView,
              d.benchView!=='3d'&&renderSchematic(),
              components.length>0&&h('section',{className:'circuit-part-inspector','aria-label':'Inspect a circuit component'},
                h('label',{htmlFor:'circuit-inspect-part'},'Inspect part '),
                h('select',{id:'circuit-inspect-part',value:selectedIndex,onChange:function(e){upd('selectedPart',Number(e.target.value));}},components.map(function(c,i){return h('option',{key:i,value:i},(i+1)+'. '+c.type);})),

                selected&&h('dl',{className:'circuit-inspector-readings'},
                  h('div',null,h('dt',null,'Voltage across'),h('dd',null,circuitPreciseVoltageText(selected.voltage))),
                  h('div',null,h('dt',null,'Current through'),h('dd',null,circuitCurrentText(selected.current))),
                  h('div',null,h('dt',null,'Power transferred'),h('dd',null,circuitPowerText(selected.power)))),
                selected&&['resistor','bulb','capacitor'].indexOf(selected.component.type)!==-1&&h(CircuitValueEditor,{
                  key:selectedIndex+'-'+selected.component.id+'-'+selected.component.type,React:React,value:selected.component.value,
                  label:selected.component.type==='capacitor'?'Capacitance (µF)':'Resistance (Ω)',
                  unit:selected.component.type==='capacitor'?'µF':'Ω',quantity:selected.component.type==='capacitor'?'capacitance':'resistance',
                  onApply:function(value){upd('components',components.map(function(c,i){return i===selectedIndex?Object.assign({},c,{value:value}):c;}));}}),
                selected&&selected.component.type==='switch'&&h('button',{type:'button',onClick:function(){toggleSwitch(selected.component.id);}},selected.component.closed?'Open selected switch':'Close selected switch'),
                selected&&selected.component.type==='led'&&h('button',{type:'button',onClick:function(){upd('components',components.map(function(c,i){return i===selectedIndex?Object.assign({},c,{reversed:!c.reversed}):c;}));}},selected.component.reversed?'LED reversed — restore polarity':'Reverse LED polarity')),
              renderCircuitCoach(),
              solved.hasLED&&h('p',{className:'circuit-model-note'},'LED model: typical forward voltage plus a 10 Ω slope resistance. Polarity matters. V/I is an operating-point ratio, not a fixed LED resistance.'),
              solved.ledOvercurrent&&h('p',{role:'status',className:'circuit-warning'},'LED current exceeds the illustrative 20 mA rating. Add series resistance or reduce voltage. In parallel, a resistor on a different branch does not protect the LED.'),
              solved.voltageAmbiguous&&h('p',{className:'circuit-warning'},'Individual voltages are undetermined across multiple blocking components in this model. Capacitor initial charge and diode leakage are not simulated.'),
              !isOpen&&current===0&&solved.hasLED&&h('p',{role:'status',className:'circuit-model-note'},'LED below turn-on: the supply does not exceed the combined forward voltage. Increase voltage or use fewer LEDs.'),
              h('details',{className:'circuit-model-details'},
                h('summary',null,'What this simulation models'),
                h('p',null,'An ideal 0–24 V DC source; fixed-resistance bulbs; 0.001 Ω ammeters and closed switches; 1 GΩ voltmeters; capacitors open at steady state. LED forward drops are illustrative and vary by real device.'),
                h('p',null,'Short-circuit currents are ideal-source estimates, not predictions of a real battery. Heating, component failure, general capacitor networks, AC, and arbitrary mixed networks belong in Advanced Simulator. The separate Capacitor time lab models one ideal RC circuit.'),
                h('p',null,'Moving dots show conventional current from + to − around the external circuit. Electron drift is opposite. Motion and brightness are qualitative, not to scale.'),
                h('a',{href:'https://learn.sparkfun.com/tutorials/light-emitting-diodes-leds/delving-deeper',target:'_blank',rel:'noopener noreferrer'},'LED model reference'),
                ' · ',h('a',{href:'https://openstax.org/books/physics/pages/19-2-series-circuits',target:'_blank',rel:'noopener noreferrer'},'Series circuit reference'))
            );
          };

          // ──────────────────────────────────────────
          // RENDER
          // ──────────────────────────────────────────
          return h('div', { 'data-circuit-builder-root': 'true', 'data-circuit-motion': d.pauseMotion ? 'paused' : 'running', className: 'max-w-4xl mx-auto p-5 rounded-2xl border bg-slate-950/90 border-slate-800 text-slate-100 shadow-2xl backdrop-blur-xl animate-in fade-in duration-200 motion-reduce:animate-none' },

            // ── Header ──
            h('div', { className: 'flex items-center gap-3 mb-3 flex-wrap' },
              h('button', {
                onClick: function() { if (typeof setStemLabTool === 'function') setStemLabTool(null); },
                className: 'p-1.5 hover:bg-slate-800 rounded-lg transition-all active:scale-[0.97]',
                'aria-label': __alloT('stem.circuit.back_to_tools', 'Back to tools')
              }, h(ArrowLeft, { size: 18, className: 'text-slate-400' })),

              h('h3', { className: 'text-lg font-bold text-white tracking-tight' }, '\uD83D\uDD0C ' + __alloT('stem.circuit.circuit_builder', 'Circuit Builder')),

              h('span', { className: 'px-2 py-0.5 bg-yellow-950/60 text-yellow-400 text-[0.625rem] font-black rounded-full border border-yellow-500/20' }, __alloT('stem.circuit.interactive_badge', 'INTERACTIVE')),

              isShort && h('span', { className: 'px-2 py-0.5 bg-red-950/60 text-red-400 text-[0.625rem] font-black rounded-full border border-red-500/30 animate-pulse motion-reduce:animate-none' }, '\u26A0 ' + __alloT('stem.circuit.short_circuit_banner', 'SHORT CIRCUIT!')),

              // Badge toggle
              h('button', { 'aria-label': __alloT('stem.circuit.badges', 'Badges'),
                onClick: function() { upd('showBadges', !showBadges); },
                className: 'px-2.5 py-1 text-xs rounded-lg transition-all font-semibold ' + (showBadges ? 'bg-amber-950/40 text-amber-400 border border-amber-600/40' : 'transition-colors bg-slate-900/60 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-white active:scale-[0.97]')
              }, '\uD83C\uDFC5 ' + __alloT('stem.circuit.badges', 'Badges')),

              // AI toggle
              h('button', { 'aria-label': __alloT('stem.circuit.ai_tutor', 'AI Tutor'),
                onClick: function() { upd('showAI', !showAI); },
                className: 'px-2.5 py-1 text-xs rounded-lg transition-all font-semibold ' + (showAI ? 'bg-blue-950/40 text-blue-400 border border-blue-600/40' : 'transition-colors bg-slate-900/60 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-white active:scale-[0.97]')
              }, '\uD83E\uDD16 ' + __alloT('stem.circuit.ai_tutor', 'AI Tutor')),

              // Mode buttons
              h('div', { className: 'flex gap-1 ml-auto' },
                ['series', 'parallel'].map(function(m) {
                  return h('button', { key: m, 'aria-pressed': mode === m,
                    onClick: function() { upd('mode', m); },
                    className: 'px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ' + (mode === m ? 'bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/25' : 'transition-colors bg-slate-900/60 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200 active:scale-[0.97]')
                  }, m);
                })
              )
            ),

            // ── Grade-band intro ──
            renderCircuitBench(),
            renderExperimentBench(),

            // ══════════════════════════════════════
            // SVG Schematic
            // ══════════════════════════════════════
            // ══════════════════════════════════════
            // Component buttons
            // ══════════════════════════════════════
            // ══════════════════════════════════════
            // Voltage slider + component editor
            // ══════════════════════════════════════
            h('div', { className: 'bg-slate-900/60 border border-slate-800 p-4 rounded-xl backdrop-blur-md mt-4' },
              // Component editor list
              components.length > 0 && h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
                components.map(function(comp, i) {
                  var compIcon = getCompIcon(comp.type);
                  var compLabel = getCompLabel(comp);

                  return h('div', { key: comp.id, className: 'flex items-center gap-2 bg-slate-950/60 rounded-lg px-3 py-2 border border-slate-800/80 hover:border-slate-700 transition-all' },
                    h('span', { className: 'text-base' }, compIcon),
                    h('span', { className: 'text-xs font-bold text-slate-300 min-w-[50px] truncate' }, compLabel),

                    // Resistor/Bulb value input
                    (comp.type === 'resistor' || comp.type === 'bulb') && h('input', {
                      type: 'number', min: 1, max: 10000, value: comp.value,
                      'aria-label': compLabel + ' resistance in ohms',
                      onChange: function(e) {
                        var val = circuitNumber(e.target.value, comp.value, 1, 10000);
                        var newComps = components.map(function(c, j) {
                          if (j === i) return Object.assign({}, c, { value: val });
                          return c;
                        });
                        upd('components', newComps);
                      },
                      onKeyDown: function(e) {
                        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                          e.preventDefault();
                          var val = Math.min(comp.value + 10, 10000);
                          var newComps = components.map(function(c, j) { if (j === i) return Object.assign({}, c, { value: val }); return c; });
                          upd('components', newComps);
                          if (typeof announceToSR === 'function') announceToSR(compLabel + ' value set to ' + val + ' ohms');
                        } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                          e.preventDefault();
                          var val = Math.max(comp.value - 10, 1);
                          var newComps = components.map(function(c, j) { if (j === i) return Object.assign({}, c, { value: val }); return c; });
                          upd('components', newComps);
                          if (typeof announceToSR === 'function') announceToSR(compLabel + ' value set to ' + val + ' ohms');
                        }
                      },
                      className: 'w-20 px-2 py-1 text-sm border rounded text-center font-mono bg-slate-900 border-slate-500 text-slate-100 focus:ring-1 focus:ring-yellow-500 focus:outline-none'
                    }),
                    (comp.type === 'resistor' || comp.type === 'bulb') && h('span', { className: 'text-xs text-slate-400' }, '\u03A9'),

                    // Capacitor value input (in uF)
                    comp.type === 'capacitor' && h('input', {
                      type: 'number', min: 1, max: 10000, value: comp.value,
                      'aria-label': compLabel + ' capacitance in microfarads',
                      onChange: function(e) {
                        var val = circuitNumber(e.target.value, comp.value, 1, 10000);
                        var newComps = components.map(function(c, j) {
                          if (j === i) return Object.assign({}, c, { value: val });
                          return c;
                        });
                        upd('components', newComps);
                      },
                      onKeyDown: function(e) {
                        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                          e.preventDefault();
                          var val = Math.min(comp.value + 10, 10000);
                          var newComps = components.map(function(c, j) { if (j === i) return Object.assign({}, c, { value: val }); return c; });
                          upd('components', newComps);
                          if (typeof announceToSR === 'function') announceToSR(compLabel + ' value set to ' + val + ' microfarads');
                        } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                          e.preventDefault();
                          var val = Math.max(comp.value - 10, 1);
                          var newComps = components.map(function(c, j) { if (j === i) return Object.assign({}, c, { value: val }); return c; });
                          upd('components', newComps);
                          if (typeof announceToSR === 'function') announceToSR(compLabel + ' value set to ' + val + ' microfarads');
                        }
                      },
                      className: 'w-20 px-2 py-1 text-sm border rounded text-center font-mono bg-slate-900 border-slate-500 text-slate-100 focus:ring-1 focus:ring-yellow-500 focus:outline-none'
                    }),
                    comp.type === 'capacitor' && h('span', { className: 'text-xs text-slate-400' }, '\u00B5F'),

                    // Switch toggle button
                    comp.type === 'switch' && h('button', { 'aria-label': __alloT('stem.circuit.aria_toggle_switch', 'Toggle Switch'),
                      onClick: function() { toggleSwitch(comp.id); },
                      className: 'px-2 py-1 text-xs font-bold rounded border transition-all ' + (comp.closed ? 'transition-colors bg-emerald-950/30 text-emerald-400 border-emerald-800 hover:bg-emerald-900/40 active:scale-[0.97]' : 'transition-colors bg-red-950/30 text-red-400 border-red-800 hover:bg-red-900/40 active:scale-[0.97]')
                    }, comp.closed ? __alloT('stem.circuit.action_open_switch', 'Open switch') : __alloT('stem.circuit.action_close_switch', 'Close switch')),

                    // LED color cycle button
                    comp.type === 'led' && h('button', { 'aria-label': __alloT('stem.circuit.aria_cycle_led_color', 'Cycle LED Color'),
                      onClick: function() { cycleLedColor(comp.id); },
                      className: 'w-8 h-8 rounded-full border-2 border-slate-700 hover:scale-110 transition-transform',
                      style: { backgroundColor: comp.ledColor || '#ef4444' }
                    }),

                    // Remove button
                    h('button', { 'data-circuit-remove-id': comp.id, 'aria-label': __alloT('stem.circuit.aria_remove_component', 'Remove Component'),
                      onClick: function() { removeComponent(i); },
                      className: 'transition-colors text-slate-500 hover:text-red-400 ml-auto font-bold text-lg px-1 tracking-tight'
                    }, '\u00D7')
                  );
                })
              )
            ),

            // ══════════════════════════════════════
            // Readout cards (4 metrics)
            // ══════════════════════════════════════
            h(CircuitTimeLab,{React:React,state:d,update:upd,updateMany:updMulti,loadStarter:function(){updMulti({mode:'series',voltage:9,components:[{id:1,type:'resistor',value:1000},{id:2,type:'capacitor',value:1000}],rcTime:0,rcPhase:'charge',showTimeLab:true});}}),

            h('div', { className: 'mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2', role: 'status', 'aria-live': 'polite' },
              [
                { label: __alloT('stem.circuit.readout_mode', 'Mode'), val: mode, color: 'slate', icon: mode === 'series' ? '\u2192' : '\u2261', textCls: 'text-slate-400', valCls: 'text-slate-200', borderCls: 'border-slate-800 bg-slate-900/40' },
                { label: __alloT('stem.circuit.readout_resistance', 'Resistance'), val: totalR >= 1e8 ? '\u221E' : totalR.toFixed(1) + '\u03A9', color: 'yellow', icon: '\u2AE8', textCls: 'text-yellow-400/80', valCls: 'text-yellow-400', borderCls: 'border-yellow-500/20 bg-yellow-950/10' },
                { label: __alloT('stem.circuit.stat_current', 'Current'), val: current.toFixed(3) + 'A', color: 'blue', icon: '\u26A1', textCls: 'text-blue-400/80', valCls: 'text-blue-400', borderCls: 'border-blue-500/20 bg-blue-950/10' },
                { label: __alloT('stem.circuit.readout_power', 'Power'), val: power.toFixed(2) + 'W', color: 'red', icon: '\uD83D\uDD25', textCls: 'text-rose-300', valCls: 'text-rose-400', borderCls: 'border-rose-500/20 bg-rose-950/10' }
              ].map(function(m) {
                var isSh = isShort && m.label !== __alloT('stem.circuit.readout_mode', 'Mode');
                return h('div', {
                  key: m.label,
                  className: 'text-center p-3 rounded-xl border backdrop-blur-sm transition-all ' + (isSh ? 'bg-red-950/20 border-red-500/40 short-active-flash' : m.borderCls)
                },
                  h('p', { className: 'text-[0.625rem] font-bold uppercase tracking-wider mb-1 ' + (isSh ? 'text-red-400' : m.textCls) }, m.icon + ' ' + m.label),
                  h('p', { className: 'text-sm font-black font-mono ' + (isSh ? 'text-red-300' : m.valCls) }, m.val)
                );
              })
            ),

            (hasAmmeter || hasVoltmeter) && h('section', {
              className: 'mt-3 rounded-xl border p-3 ' + (meterIssue ? 'bg-red-950/20 border-red-500/40' : 'bg-emerald-950/20 border-emerald-500/30'),
              'aria-labelledby': 'circuitMeterCoachTitle',
              'data-circuit-meter-coach': meterIssue || 'correct'
            },
              h('div', { className: 'flex items-start justify-between gap-3 flex-wrap' },
                h('div', null,
                  h('p', { className: 'text-[0.625rem] font-bold uppercase tracking-wider ' + (meterIssue ? 'text-red-400' : 'text-emerald-400') }, __alloT('stem.circuit.meter_safety_coach', 'Meter Safety Coach')),
                  h('h4', { id: 'circuitMeterCoachTitle', className: 'text-sm font-black ' + (meterIssue ? 'text-red-200' : 'text-emerald-200') }, meterStatus)
                ),
                h('span', {
                  className: 'px-2 py-1 rounded text-[0.625rem] font-bold border ' + (meterIssue ? 'text-red-200 border-red-500/40' : 'text-emerald-200 border-emerald-500/40'),
                  role: 'status',
                  'aria-live': 'polite'
                }, meterIssue ? __alloT('stem.circuit.fix_placement', 'Fix placement') : __alloT('stem.circuit.connected_correctly', 'Connected correctly'))
              ),
              h('p', { className: 'mt-2 text-[0.6875rem] leading-relaxed text-slate-300' }, meterGuidance),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-[0.625rem]' },
                h('div', { className: 'border-l-2 border-cyan-500 pl-2' },
                  h('strong', { className: 'block text-cyan-300' }, __alloT('stem.circuit.ammeter_rule', 'Ammeter rule')),
                  h('span', { className: 'text-slate-400' }, __alloT('stem.circuit.ammeter_rule_desc', 'Series connection; very low internal resistance.'))
                ),
                h('div', { className: 'border-l-2 border-yellow-500 pl-2' },
                  h('strong', { className: 'block text-yellow-300' }, __alloT('stem.circuit.voltmeter_rule', 'Voltmeter rule')),
                  h('span', { className: 'text-slate-400' }, __alloT('stem.circuit.voltmeter_rule_desc', 'Parallel connection; very high internal resistance.'))
                )
              )
            ),

            h('details', { className: 'mt-4 rounded-xl border border-slate-700 p-3' },
              h('summary', { className: 'text-sm text-cyan-200' }, '03 / EXPLAIN — Measurements, energy & circuit laws'),
            // Ohm's-law I-V characteristic — current vs voltage is a line through the origin (slope 1/R).
            components.length > 0 && !isShort && !isOpen && (function() {
              var Vmax = Math.min(24, Math.max(voltage * 1.5, voltage + 1));
              var sweep = Array.from({length:49}, function(_, i) { var v=Vmax*i/48; return {v:v,i:solveCircuit({mode:mode,voltage:v,components:components}).current}; });
              var Imax = Math.max(0.001, sweep[sweep.length-1].i);
              var W = 300, H = 130, pl = 38, pb = 22, pt = 10, pr = 10;
              var sx = function(v) { return pl + (v / Vmax) * (W - pl - pr); };
              var sy = function(i) { return pt + (1 - i / Imax) * (H - pt - pb); };
              return h('div', { className: 'mt-3 bg-slate-900/40 border border-blue-500/20 rounded-xl p-3' },
                h('p', { className: 'text-[0.6875rem] font-bold text-blue-400 uppercase tracking-wider mb-1' }, "⚡ " + __alloT('stem.circuit.response_curve_title', 'Circuit response: current vs voltage')),
                h('p', { className: 'text-[0.625rem] text-slate-400 mb-2' }, (solved.hasLED ? __alloT('stem.circuit.led_curve_desc', 'LED turn-on creates a bend. This curve uses the same LED model as your live measurements.') : __alloT('stem.circuit.ohm_iv_desc', 'For a fixed resistance, current rises in a straight line with voltage (slope = 1/R). Steeper = lower resistance.'))),
                h('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': (solved.hasLED ? 'Current versus voltage includes an LED turn-on threshold; at ' : 'Current versus voltage is a straight line through the origin; at ') + voltage + ' volts the current is ' + current.toFixed(3) + ' amps.' },
                  h('line', { x1: pl, y1: pt, x2: pl, y2: H - pb, stroke: '#334155', strokeWidth: 1 }),
                  h('line', { x1: pl, y1: H - pb, x2: W - pr, y2: H - pb, stroke: '#334155', strokeWidth: 1 }),
                  h('polyline', { points:sweep.map(function(p) {return sx(p.v)+','+sy(p.i);}).join(' '), fill:'none', stroke: '#38bdf8', strokeWidth: 2 }),
                  h('line', { x1: sx(voltage), y1: sy(0), x2: sx(voltage), y2: sy(current), stroke: '#475569', strokeWidth: 1, strokeDasharray: '2 2' }),
                  h('line', { x1: sx(0), y1: sy(current), x2: sx(voltage), y2: sy(current), stroke: '#475569', strokeWidth: 1, strokeDasharray: '2 2' }),
                  h('circle', { cx: sx(voltage), cy: sy(current), r: 4, fill: '#60a5fa', stroke: '#0f172a', strokeWidth: 1 }),
                  h('text', { x: sx(voltage) - 4, y: sy(current) - 4, textAnchor: 'end', fontSize: 8, fill: '#93c5fd', fontWeight: 'bold' }, voltage + 'V, ' + current.toFixed(2) + 'A'),
                  h('text', { x: (pl + W - pr) / 2, y: H - 4, textAnchor: 'middle', fontSize: 8, fill: '#94a3b8' }, __alloT('stem.circuit.axis_voltage', 'Voltage (V) →')),
                  h('text', { x: 8, y: pt + 6, fontSize: 8, fill: '#94a3b8' }, 'I (A)')
                )
              );
            })(),
            // ══════════════════════════════════════
            // Per-component analysis table
            // ══════════════════════════════════════
            components.length > 0 && !noLoadPath && h('div', { className: 'mt-3 bg-slate-900/40 border border-cyan-500/20 rounded-xl p-3 backdrop-blur-md' },
              h('p', { className: 'text-[0.6875rem] font-bold text-cyan-400 uppercase tracking-wider mb-1.5' }, '\uD83E\uDDE0 ' + __alloT('stem.circuit.mental_model_checks', 'Mental-model checks')),
              h('ul', { className: 'space-y-1 text-[0.6875rem] text-slate-300 leading-snug list-disc list-inside marker:text-cyan-500' },
                h('li', null, h('b', { className: 'text-cyan-300' }, __alloT('stem.circuit.mmc_electrons_bold', 'Electrons crawl; the signal races. ')), __alloT('stem.circuit.mmc_electrons_body', 'The glowing dots move fast for visibility, but real electrons drift at only about 0.1 mm/s. The electric field that pushes them travels near light speed, so every bulb lights essentially the instant you connect the battery.')),
                mode === 'series'
                  ? h('li', null, h('b', { className: 'text-cyan-300' }, __alloT('stem.circuit.mmc_series_bold', 'Current is not used up. ')), 'The very same ' + current.toFixed(3) + ' A flows through every component in series \u2014 an ammeter reads the same value before AND after each bulb. Energy gets spent along the way; charge does not.')
                  : h('li', null, h('b', { className: 'text-cyan-300' }, __alloT('stem.circuit.mmc_parallel_bold', 'A parallel branch LOWERS total resistance. ')), 'Adding paths gives charge more ways to flow, so total current rises. Total R (' + (totalR >= 1e8 ? '\u221E' : totalR.toFixed(1) + '\u03A9') + ') is always smaller than the smallest single branch \u2014 counter-intuitive but true.'),
                h('li', null, h('b', { className: 'text-cyan-300' }, __alloT('stem.circuit.mmc_battery_bold', 'The battery sets voltage, not current. ')), 'It holds ' + voltage + ' V steady; the ' + current.toFixed(3) + ' A you read is whatever Ohm\'s law gives for the resistance you built. Lower the resistance and the current climbs \u2014 the battery does not "decide" the current.')
              )
            ),

            // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
            // Per-component analysis table
            // \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
            components.length > 0 && h('div', { className: 'mt-4 bg-slate-900/40 border border-slate-800 p-4 rounded-xl backdrop-blur-md' },
              h('p', { className: 'text-[0.6875rem] font-bold text-yellow-500 uppercase tracking-wider mb-2' }, '\u26A1 ' + __alloT('stem.circuit.per_component_analysis', 'Per-Component Analysis')),
              h('div', { className: 'space-y-1.5' },
                components.map(function(comp, i) {
                  var compR = getCompR(comp);
                  var compI = reading(comp).current;
                  var compV = reading(comp).voltage;
                  var compP = reading(comp).power;
                  var isIdealParallelBranch = mode === 'parallel' && compR < 0.01; // ammeter / closed switch as its own branch reads a meaningless ~V/0 current
                  var typeIcon = comp.type === 'resistor' ? '\u2AE8 R' : comp.type === 'bulb' ? '\uD83D\uDCA1 B' : comp.type === 'switch' ? '\uD83D\uDD18 S' : comp.type === 'led' ? '\uD83D\uDD34 L' : comp.type === 'ammeter' ? '\u26A1 A' : comp.type === 'voltmeter' ? '\uD83D\uDD0B V' : '\u2E28 C';
                  var rDisplay = comp.type === 'switch' ? (comp.closed ? '~0\u03A9' : '\u221E') : comp.type === 'ammeter' ? '~0\u03A9' : comp.type === 'voltmeter' ? '\u221E' : comp.type === 'led' ? circuitForwardVoltage(comp) + 'V LED' : comp.type === 'capacitor' ? '\u221E' : comp.value + '\u03A9';

                  return h('div', { key: comp.id, className: 'flex flex-wrap items-center gap-2 text-xs bg-slate-950/40 rounded-lg px-3 py-2 border border-slate-800/60' },
                    h('span', { className: 'font-bold text-yellow-500 w-16' }, typeIcon + (i + 1)),
                    h('span', { className: 'text-slate-400 w-20 font-mono' }, rDisplay),

                    comp.type === 'ammeter'
                      ? h('span', { className: 'text-cyan-400 w-40 font-mono font-bold' }, isIdealParallelBranch ? '\u26A0 ' + __alloT('stem.circuit.connect_ammeters_series', 'connect ammeters in series') : '\u27A1 ' + compI.toFixed(3) + 'A (reads current)')
                      : comp.type === 'voltmeter'
                      ? h('span', { className: 'text-yellow-400 w-40 font-mono font-bold' }, mode === 'series' ? '\u26A0 ' + __alloT('stem.circuit.connect_voltmeters_parallel', 'connect voltmeters in parallel') : '\u27A1 ' + voltage.toFixed(1) + 'V (reads voltage)')
                      : isIdealParallelBranch ? h('span', { className: 'text-red-400 w-40 font-mono font-bold' }, '\u26A0 ' + __alloT('stem.circuit.short_branch', 'short branch (~0 \u03A9)')) : h(React.Fragment, null,
                          h('span', { className: 'text-cyan-400 w-20 font-mono' }, circuitVoltageText(compV, 2)),
                          h('span', { className: 'text-emerald-400 w-20 font-mono' }, compI.toFixed(3) + 'A'),
                          h('span', { className: 'text-rose-400 w-20 font-mono font-bold' }, compP.toFixed(2) + 'W')
                        ),

                    comp.type === 'bulb' && h('span', { className: 'text-yellow-400 ml-auto' }, compP > 10 ? '\uD83D\uDD06' : compP > 3 ? '\uD83D\uDCA1' : '\uD83D\uDD05'),
                    comp.type === 'switch' && h('span', { className: 'ml-auto ' + (comp.closed ? 'text-emerald-400' : 'text-red-400') }, comp.closed ? '\u2705 ' + __alloT('stem.circuit.status_closed', 'Closed') : '\u274C ' + __alloT('stem.circuit.status_open', 'Open')),
                    comp.type === 'led' && h('span', { className: 'ml-auto', style: { color: comp.ledColor || '#ef4444' } }, compI > 0.005 ? '\u2B50 ' + __alloT('stem.circuit.status_lit', 'Lit') : '\u26AB ' + __alloT('stem.circuit.status_off', 'Off')),
                    comp.type === 'capacitor' && h('span', { className: 'text-sky-400 ml-auto font-mono text-[0.625rem]' }, comp.value + '\u00B5F (blocks DC)')
                  );
                })
              ),

              // Formula reminder
              h('div', { className: 'mt-3 flex items-center gap-2 text-[0.625rem] text-slate-400 font-medium' },
                h('span', null, '\u2696 V = IR'),
                h('span', null, '\u2022'),
                h('span', null, 'P = IV'),
                h('span', null, '\u2022'),
                h('span', null, mode === 'series' ? __alloT('stem.circuit.formula_series_note', 'Series: same current through all') : __alloT('stem.circuit.formula_parallel_note', 'Parallel: same voltage across all'))
              )
            ),

            // ══════════════════════════════════════
            // Energy budget — where the battery's power goes (P = ΣI²R)
            // ══════════════════════════════════════
            current > 0.001 && !isShort && !noLoadPath && (function() {
              // Power delivered by the battery is shared out among the loads. In series each
              // dissipates I²R; in parallel each dissipates V²/R. They must sum to VI — energy
              // is conserved, which is the whole point of the panel.
              var loads = components;
              var segs = loads.map(function(c) {
                var r = getCompR(c);
                var p = reading(c).power;
                var name = c.type === 'resistor' ? 'Resistor ' + c.value + 'Ω' : c.type === 'bulb' ? 'Bulb ' + c.value + 'Ω' : c.type === 'led' ? __alloT('stem.circuit.comp_led', 'LED') : c.type;
                var col = c.type === 'bulb' ? '#f59e0b' : c.type === 'led' ? (c.ledColor || '#ef4444') : c.type === 'switch' ? '#10b981' : '#eab308';
                return { name: name, p: p, col: col, type: c.type };
              }).filter(function(s) { return s.p > 1e-6; });
              var totP = segs.reduce(function(a, s) { return a + s.p; }, 0) || power || 1e-6;
              // Real-world equivalence for the delivered power
              var eq = power < 0.05 ? 'about a digital watch (' + (power * 1000).toFixed(0) + ' mW)'
                : power < 0.5 ? __alloT('stem.circuit.eq_hearing_aid', 'a hearing-aid battery load')
                : power < 3 ? __alloT('stem.circuit.eq_led_nightlight', 'a small LED night-light')
                : power < 10 ? __alloT('stem.circuit.eq_phone_charger', 'a phone fast-charger')
                : power < 40 ? __alloT('stem.circuit.eq_desk_lamp', 'a bright desk lamp')
                : power < 100 ? __alloT('stem.circuit.eq_laptop', 'a laptop under load')
                : __alloT('stem.circuit.eq_appliance', 'a household appliance');
              return h('div', { className: 'circuit-card mt-4 bg-slate-900/40 border border-rose-500/25 rounded-xl p-4 backdrop-blur-md' },
                h('p', { className: 'text-[0.6875rem] font-bold text-rose-400 uppercase tracking-wider mb-1' }, '🔥 ' + __alloT('stem.circuit.energy_budget_title', 'Energy budget — where the power goes')),
                h('p', { className: 'text-[0.6875rem] text-slate-400 mb-2 leading-snug' },
                  __alloT('stem.circuit.energy_budget_intro', 'The battery pours out '), h('b', { className: 'text-rose-300' }, 'P = V×I = ' + power.toFixed(2) + ' W'),
                  ' (like ' + eq + '). Every load turns its share into heat or light — and the shares must add back up to the total. Energy is transferred to light and heat; charge is conserved.'),
                // Segmented power bar
                h('div', { className: 'flex w-full h-7 rounded-lg overflow-hidden border border-slate-700', role: 'img', 'aria-label': 'Power split: ' + segs.map(function(s){ return s.name + ' ' + (s.p/totP*100).toFixed(0) + ' percent'; }).join(', ') },
                  segs.length === 0 ? h('div', { className: 'flex-1 flex items-center justify-center text-[0.625rem] text-slate-500' }, __alloT('stem.circuit.no_dissipating_load', 'no dissipating load'))
                  : segs.map(function(s, i) {
                      var pct = s.p / totP * 100;
                      return h('div', { key: i, style: { width: pct + '%', background: s.col + '33', borderRight: i < segs.length - 1 ? '1px solid rgba(15,23,42,0.6)' : 'none' }, className: 'flex flex-col items-center justify-center overflow-hidden' },
                        pct > 12 && h('span', { className: 'text-[0.625rem] font-black leading-none', style: { color: s.col } }, s.p.toFixed(2) + 'W'),
                        pct > 20 && h('span', { className: 'text-[0.5rem] text-slate-400 leading-none mt-0.5 truncate px-1', style: { maxWidth: '100%' } }, s.name)
                      );
                    })
                ),
                h('div', { className: 'flex justify-between mt-1.5 text-[0.625rem]' },
                  h('span', { className: 'text-slate-500' }, mode === 'series' ? __alloT('stem.circuit.dissipate_series_note', 'Biggest resistor dissipates the most (P = I²R, same I)') : __alloT('stem.circuit.dissipate_parallel_note', 'Smallest resistor dissipates the most (P = V²/R, same V)')),
                  h('span', { className: 'font-mono font-bold text-rose-300' }, 'Σ = ' + totP.toFixed(2) + ' W')
                )
              );
            })(),

            // ══════════════════════════════════════
            // Drift vs. field — the great circuit paradox (made visible)
            // ══════════════════════════════════════
            current > 0.001 && !isShort && !noLoadPath && (function() {
              // Honest physics: v_drift = I / (n·A·e) for copper, assuming a 1 mm² wire.
              // n = 8.5e28 free electrons/m³, e = 1.602e-19 C, A = 1e-6 m².
              var vDrift = current / (8.5e28 * 1e-6 * 1.602e-19); // m/s
              var vDriftMm = vDrift * 1000; // mm/s
              // Time for ONE electron to drift 1 m:
              var driftSecs = 1 / vDrift;
              var driftTime = driftSecs > 3600 ? (driftSecs / 3600).toFixed(1) + ' hours'
                : driftSecs > 60 ? (driftSecs / 60).toFixed(0) + ' minutes'
                : driftSecs.toFixed(0) + ' seconds';
              // Field/signal in copper ≈ 2/3 c → time to cross 1 m:
              var signalSecs = 1 / (2e8);
              var reduced = _prefersReducedMotion;
              function lane(y, label, sub) {
                return h('g', null,
                  h('text', { x: 4, y: y - 12, fontSize: 9, fontWeight: 700, fill: '#cbd5e1' }, label),
                  h('text', { x: 356, y: y - 12, fontSize: 8, fill: '#64748b', textAnchor: 'end' }, sub),
                  h('rect', { x: 4, y: y - 8, width: 352, height: 16, rx: 8, fill: 'rgba(15,23,42,0.7)', stroke: 'rgba(100,116,139,0.4)' })
                );
              }
              return h('div', { className: 'circuit-card mt-4 bg-gradient-to-br from-slate-900 to-blue-950/40 border border-cyan-500/25 rounded-xl p-4 backdrop-blur-md' },
                h('p', { className: 'text-[0.6875rem] font-bold text-cyan-400 uppercase tracking-wider mb-1' }, '🐌⚡ ' + __alloT('stem.circuit.paradox_title', 'The paradox: electrons crawl, the signal races')),
                h('p', { className: 'text-[0.6875rem] text-slate-400 mb-2 leading-snug' }, __alloT('stem.circuit.paradox_body', 'The schematic dots show conventional current, opposite to electron drift. Their speed is exaggerated; real electrons barely creep. So why does the bulb light instantly? Because flipping the switch launches an electric field down the wire at nearly light speed, nudging every electron at once.')),
                h('svg', { viewBox: '0 0 360 120', width: '100%', role: 'img', 'aria-label': __alloT('stem.circuit.aria_paradox_svg', 'Two wires. In the top wire the electric field pulse races across almost instantly. In the bottom wire individual electrons drift very slowly.') },
                  lane(32, '⚡ ' + __alloT('stem.circuit.lane_field_label', 'Electric field / signal'), '≈ 200,000 km/s'),
                  // fast signal pulse
                  h('g', { className: reduced ? '' : 'circ-signal-pulse' },
                    h('rect', { x: 4, y: 24, width: 16, height: 16, rx: 8, fill: '#22d3ee', opacity: 0.9, filter: 'drop-shadow(0 0 5px #22d3ee)' })
                  ),
                  lane(84, '🔵 ' + __alloT('stem.circuit.lane_electrons_label', 'Actual electrons'), '≈ ' + (vDriftMm < 0.1 ? vDriftMm.toFixed(3) : vDriftMm.toFixed(2)) + ' mm/s'),
                  // slow drifting electrons
                  [0, 1, 2, 3, 4, 5].map(function(k) {
                    return h('g', { key: k, className: reduced ? '' : 'circ-electron-drift', style: reduced ? {} : { animationDelay: (-k * 1.0) + 's' } },
                      h('circle', { cx: 12 + k * 52, cy: 84, r: 3.5, fill: '#60a5fa', opacity: 0.9 })
                    );
                  })
                ),
                h('div', { className: 'grid grid-cols-2 gap-2 mt-1' },
                  h('div', { className: 'bg-cyan-950/30 border border-cyan-500/20 rounded-lg p-2 text-center' },
                    h('p', { className: 'text-[0.625rem] uppercase tracking-wider text-cyan-500/80 font-bold' }, __alloT('stem.circuit.signal_crosses_label', 'Signal crosses 1 m in')),
                    h('p', { className: 'text-sm font-black font-mono text-cyan-300' }, '~5 nanoseconds')
                  ),
                  h('div', { className: 'bg-blue-950/30 border border-blue-500/20 rounded-lg p-2 text-center' },
                    h('p', { className: 'text-[0.625rem] uppercase tracking-wider text-blue-400/80 font-bold' }, __alloT('stem.circuit.electron_crosses_label', 'One electron crosses 1 m in')),
                    h('p', { className: 'text-sm font-black font-mono text-blue-300' }, '~' + driftTime)
                  )
                ),
                h('p', { className: 'text-[0.625rem] text-slate-500 italic mt-1.5 leading-snug' }, 'Drift speed computed from your ' + current.toFixed(3) + ' A through an assumed 1 mm² copper wire (v = I ÷ n·A·e). Turn up the voltage and the electrons speed up — but they never come close to the signal.')
              );
            })(),

            // ══════════════════════════════════════
            // How big is your current? — log-scale real-world ladder
            // ══════════════════════════════════════
            current > 0.0005 && !isShort && (function() {
              // Log10 scale from 1 µA (1e-6 A) to 100 kA (1e5 A).
              var lo = -6, hi = 5;
              var frac = function(amps) { return Math.max(0, Math.min(1, (Math.log(Math.max(amps, 1e-7)) / Math.LN10 - lo) / (hi - lo))); };
              var marks = [
                { a: 0.00002, label: 'nerve impulse' },
                { a: 0.02, label: 'LED' },
                { a: 2, label: 'phone charger' },
                { a: 15, label: 'wall outlet trips' },
                { a: 200, label: 'car starter' },
                { a: 30000, label: 'lightning bolt' }
              ];
              return h('div', { className: 'circuit-card mt-4 bg-slate-900/40 border border-amber-500/25 rounded-xl p-4 backdrop-blur-md' },
                h('p', { className: 'text-[0.6875rem] font-bold text-amber-400 uppercase tracking-wider mb-1' }, '📏 How big is ' + current.toFixed(3) + ' A, really?'),
                h('p', { className: 'text-[0.6875rem] text-slate-400 mb-3 leading-snug' }, 'Current spans an enormous range — this ladder is logarithmic (each step is 10× bigger). Your circuit sits here compared with things you know.'),
                h('svg', { viewBox: '0 0 360 78', width: '100%', role: 'img', 'aria-label': 'Logarithmic current ladder from a microamp to 100 kiloamps. Your circuit draws ' + current.toFixed(3) + ' amps, between ' + (function(){ var below=marks[0].label; marks.forEach(function(m){ if (m.a <= current) below = m.label; }); return below; })() + ' and larger loads.' },
                  h('defs', null,
                    h('linearGradient', { id: 'circAmpGrad', x1: 0, y1: 0, x2: 1, y2: 0 },
                      h('stop', { offset: '0%', stopColor: '#0891b2' }),
                      h('stop', { offset: '50%', stopColor: '#eab308' }),
                      h('stop', { offset: '100%', stopColor: '#ef4444' }))),
                  h('rect', { x: 6, y: 30, width: 348, height: 8, rx: 4, fill: 'url(#circAmpGrad)', opacity: 0.65 }),
                  marks.map(function(m, i) {
                    var x = 6 + frac(m.a) * 348;
                    return h('g', { key: i },
                      h('line', { x1: x, y1: 27, x2: x, y2: 41, stroke: '#475569', strokeWidth: 1 }),
                      h('text', { x: x, y: 54, fontSize: 7.5, fill: '#94a3b8', textAnchor: i === 0 ? 'start' : i === marks.length - 1 ? 'end' : 'middle' }, m.label),
                      h('text', { x: x, y: 64, fontSize: 6.5, fill: '#64748b', textAnchor: i === 0 ? 'start' : i === marks.length - 1 ? 'end' : 'middle' }, m.a >= 1000 ? (m.a / 1000) + 'kA' : m.a >= 1 ? m.a + 'A' : (m.a * 1000) + 'mA')
                    );
                  }),
                  // "you are here" pointer
                  (function() {
                    var x = 6 + frac(current) * 348;
                    return h('g', null,
                      h('polygon', { points: (x - 5) + ',18 ' + (x + 5) + ',18 ' + x + ',27', fill: '#f43f5e' }),
                      h('circle', { cx: x, cy: 34, r: 5, fill: '#f43f5e', stroke: '#fff', strokeWidth: 1.2 }),
                      h('text', { x: x, y: 13, fontSize: 8, fontWeight: 800, fill: '#fb7185', textAnchor: 'middle' }, 'your circuit')
                    );
                  })()
                )
              );
            })(),

            // ══════════════════════════════════════
            // KVL Verification (g68 / g912)
            // ══════════════════════════════════════
            (band === 'g68' || band === 'g912') && components.length > 0 && mode === 'series' && current > 0.001 && h('div', { className: 'mt-4 bg-indigo-950/20 border border-indigo-500/30 rounded-xl p-4 backdrop-blur-md' },
              h('p', { className: 'text-[0.6875rem] font-bold text-indigo-400 uppercase tracking-wider mb-2' }, '\u2696 ' + __alloT('stem.circuit.kvl_title', 'Kirchhoff\'s Voltage Law (KVL) Verification')),
              h('p', { className: 'text-xs text-slate-300 mb-2' }, __alloT('stem.circuit.kvl_desc', 'The sum of voltage drops around any closed loop equals the source voltage. The same current flows through every series component, so this isn\'t a lucky coincidence — Ohm\'s law forces it to balance.')),
              h('div', { className: 'space-y-1' },
                components.map(function(comp, i) {
                  var compR = getCompR(comp);
                  var compV = reading(comp).voltage;
                  if (comp.type === 'ammeter' || comp.type === 'voltmeter') return null;
                  return h('div', { key: comp.id, className: 'flex items-center gap-2 text-xs font-mono text-slate-400' },
                    h('span', null, 'V' + (i + 1) + (comp.type === 'led' ? ' = Vf + I × r = ' + circuitForwardVoltage(comp) + ' + ' : ' = I × R = ') + current.toFixed(3) + ' × ' + compR.toFixed(1) + ' = ' + circuitVoltageText(compV, 2))
                  );
                }),
                h('div', { className: 'border-t border-indigo-500/20 mt-2 pt-2' },
                  (function() {
                    var vSum = 0;
                    components.forEach(function(comp) {
                      vSum += reading(comp).voltage || 0;
                    });
                    return h('div', { className: 'flex items-center gap-2 text-xs font-bold' },
                      h('span', { className: 'text-indigo-300' }, '\u2211 V_drops = ' + vSum.toFixed(2) + 'V'),
                      h('span', { className: 'text-indigo-400' }, '\u2248'),
                      h('span', { className: 'text-indigo-300' }, 'V_source = ' + voltage + 'V'),
                      h('span', { className: Math.abs(vSum - voltage) < 0.1 ? 'text-emerald-400' : 'text-rose-400' }, Math.abs(vSum - voltage) < 0.1 ? '\u2713 ' + __alloT('stem.circuit.must_balance', 'must balance: sum of drops = source voltage') : '\u26A0\uFE0F')
                    );
                  })()
                )
              )
            ),

            // ══════════════════════════════════════
            // Open/Short circuit warnings
            // ══════════════════════════════════════
            ),
            isOpen && h('div', { role: 'alert', className: 'mt-4 bg-amber-950/20 rounded-xl border border-amber-500/40 p-4 text-center' },
              h('p', { className: 'text-base font-black text-amber-400' }, '\uD83D\uDD13 ' + __alloT('stem.circuit.circuit_open_title', 'CIRCUIT OPEN')),
              h('p', { className: 'text-xs text-amber-500/90 mt-1' }, (components.length === 0 ? __alloT('stem.circuit.empty_hint', 'Add a component or load a starter circuit.') : hasOpenSwitch ? __alloT('stem.circuit.open_switch_hint', 'An open switch breaks the series path. Close it to complete the loop.') : components.some(function(c) { return c.type === 'capacitor'; }) ? __alloT('stem.circuit.cap_dc_hint', 'At DC steady state, capacitor branches carry no current. Charging takes place before this steady-state view.') : __alloT('stem.circuit.open_other_hint', 'Check LED polarity and meter placement. A series voltmeter nearly stops current.')))
            ),

            isShort && h('div', { role: 'alert', className: 'mt-4 bg-red-950/30 rounded-xl border border-red-500/40 p-4 text-center short-active-flash' },
              h('p', { className: 'text-base font-black text-red-400' }, '\u26A0\uFE0F ' + __alloT('stem.circuit.short_circuit_detected_title', 'SHORT CIRCUIT DETECTED')),
              h('p', { className: 'text-xs text-red-400/90 mt-1' }, __alloT('stem.circuit.short_circuit_detected_desc', 'Total resistance is below 1\u03A9! In real life, this could damage components or cause a fire. Add more resistance.'))
            ),

            // ══════════════════════════════════════
            // Circuit Presets
            // ══════════════════════════════════════
            h('div', { id:'circuit-presets-panel', className: 'mt-4 bg-slate-900/40 border border-slate-800 p-4 rounded-xl backdrop-blur-md' },
              h('button', { 'aria-label': __alloT('stem.circuit.circuit_presets', 'Circuit Presets'), 'aria-expanded': showPresets,
                onClick: function() { upd('showPresets', !showPresets); },
                className: 'flex items-center gap-2 w-full text-left'
              },
                h('p', { className: 'text-[0.6875rem] font-bold text-slate-300 uppercase tracking-wider' }, '\uD83D\uDCCB ' + __alloT('stem.circuit.circuit_presets', 'Circuit Presets')),
                h('span', { className: 'ml-auto text-slate-400 text-xs' }, showPresets ? '\u25B2' : '\u25BC')
              ),
              showPresets && h('div', { className: 'flex flex-wrap gap-2 mt-3' },
                CIRCUIT_PRESETS.map(function(preset) {
                  return h('button', { 'aria-label': __alloT('stem.circuit.aria_load_preset', 'Load Preset'),
                    key: preset.id,
                    onClick: function() { loadPreset(preset); },
                    className: 'px-3 py-2 rounded-lg text-xs border border-slate-800 bg-slate-950/60 hover:bg-slate-800 transition-all text-left w-full sm:w-auto active:scale-[0.97]',
                    title: __alloT('stem.circuit.' + (preset.id) + '_desc', preset.desc)
                  },
                    h('span', { className: 'font-bold text-slate-200 block' }, preset.label),
                    h('span', { className: 'text-[0.625rem] text-slate-400 mt-0.5 block' }, __alloT('stem.circuit.' + (preset.id) + '_desc', preset.desc))
                  );
                })
              )
            ),

            // ══════════════════════════════════════
            // Circuit Challenges (10)
            // ══════════════════════════════════════
            h('div', { className: 'mt-4 bg-amber-950/10 border border-amber-500/20 p-4 rounded-xl backdrop-blur-md' },
              h('p', { className: 'text-[0.6875rem] font-bold text-amber-500 uppercase tracking-wider mb-2' }, '\uD83C\uDFAF ' + __alloT('stem.circuit.circuit_challenges_title', 'Circuit Challenges')),
              h('div', { className: 'flex flex-wrap gap-2' },
                CHALLENGES.map(function(ch, ci) {
                  var actual = ch.type === 'current' ? current : ch.type === 'resistance' ? totalR : power;
                  var close = Math.abs(actual - ch.target) < ch.target * 0.05;

                  return h('button', { key: ci,
                    onClick: function() {
                      if (close) {
                        var newDoneSet = Object.assign({}, challengesDoneSet);
                        if (!newDoneSet[ci]) {
                          newDoneSet[ci] = true;
                          var newDone = Object.keys(newDoneSet).length;
                          updMulti({ challengesDone: newDone, challengesDoneSet: newDoneSet, challenge: ch });
                          circuitSound('challengeComplete');
                          if (typeof addToast === 'function') addToast('\u2705 Challenge complete! You hit ' + actual.toFixed(3) + ch.unit + ' (target: ' + ch.target + ch.unit + ')', 'success');
                          if (typeof awardXP === 'function') awardXP('circuitChallenge', 10, ch.label);
                          checkBadges(getBadgeUpdates({ challengesDone: newDone }));
                        } else {
                          if (typeof addToast === 'function') addToast('\u2705 Already completed! ' + actual.toFixed(3) + ch.unit, 'info');
                        }
                      } else {
                        if (typeof addToast === 'function') addToast('\uD83C\uDFAF Target: ' + ch.target + ch.unit + ' | Current: ' + actual.toFixed(3) + ch.unit + '. Adjust components!', 'info');
                        upd('challenge', ch);
                      }
                    },
                    className: 'px-2.5 py-1 rounded-lg text-[0.625rem] font-bold border transition-all ' + (close ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/40 shadow-sm' : challengesDoneSet[ci] ? 'bg-emerald-950/20 text-emerald-400/80 border-emerald-700' : 'transition-colors bg-slate-900 border-slate-800 text-amber-500 hover:bg-slate-800 active:scale-[0.97]')
                  }, (close || challengesDoneSet[ci] ? '\u2705 ' : '\uD83C\uDFAF ') + ch.label);
                })
              )
            ),

            // ══════════════════════════════════════
            // Ohm's Law Quiz
            // ══════════════════════════════════════
            (function() {
              return h('div', { className: 'mt-4 bg-blue-950/10 border border-blue-500/20 p-4 rounded-xl backdrop-blur-md' },
                h('div', { className: 'flex items-center gap-2 mb-3' },
                  h('button', { onClick: function() { var q = makeOhmQuestion(); upd('ohmQuiz', q); },
                    className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' + (ohmQuiz ? 'bg-blue-900/40 text-blue-300 border border-blue-800' : 'transition-colors bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 active:scale-[0.97]')
                  }, ohmQuiz ? '\uD83D\uDD04 ' + __alloT('stem.circuit.next_question', 'Next Question') : '\u26A1 ' + __alloT('stem.circuit.ohm_law_quiz', 'Ohm\'s Law Quiz')),
                  ohmScore > 0 && h('span', { className: 'text-xs font-bold text-emerald-400' }, '\u2B50 ' + ohmScore + ' correct'),
                  ohmStreak > 1 && h('span', { className: 'text-xs font-bold text-orange-400 animate-pulse motion-reduce:animate-none' }, '\uD83D\uDD25 ' + ohmStreak + ' streak')
                ),

                // Unanswered question
                ohmQuiz && !ohmQuiz.answered && h('div', { className: 'bg-slate-950/40 rounded-lg p-3 border border-blue-900/50' },
                  h('p', { className: 'text-sm font-bold text-blue-200 mb-3' }, ohmQuiz.text),
                  h('div', { className: 'grid grid-cols-2 gap-2' },
                    ohmQuiz.opts.map(function(opt, oi) {
                      return h('button', { key: oi,
                        onClick: function() {
                          var correct = Math.abs(opt - ohmQuiz.answer) < 0.01;
                          var newScore = ohmScore + (correct ? 1 : 0);
                          var newStreak = correct ? ohmStreak + 1 : 0;
                          updMulti({
                            ohmQuiz: Object.assign({}, ohmQuiz, { answered: true, chosen: opt }),
                            ohmScore: newScore,
                            ohmStreak: newStreak
                          });
                          if (correct) {
                            circuitSound('correct');
                            if (typeof addToast === 'function') addToast('\u26A1 Correct! ' + ohmQuiz.formula, 'success');
                            if (typeof awardXP === 'function') awardXP('circuit', 10, 'Ohm\'s Law Quiz');
                          } else {
                            circuitSound('wrong');
                            if (typeof addToast === 'function') addToast('\u274C ' + ohmQuiz.formula, 'error');
                          }
                          checkBadges(getBadgeUpdates({ quizScore: newScore, quizStreak: newStreak }));
                        },
                        className: 'px-3 py-2 rounded-lg text-xs font-bold border border-slate-800 bg-slate-900 text-slate-200 hover:border-blue-500 hover:bg-blue-950/30 transition-all active:scale-[0.97]'
                      }, opt + ohmQuiz.unit);
                    })
                  )
                ),

                // Answered question (feedback)
                ohmQuiz && ohmQuiz.answered && h('div', {
                  className: 'p-3 rounded-lg text-sm font-bold ' + (Math.abs(ohmQuiz.chosen - ohmQuiz.answer) < 0.01 ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/30' : 'bg-red-950/20 text-red-400 border border-red-900/30')
                },
                  Math.abs(ohmQuiz.chosen - ohmQuiz.answer) < 0.01 ? '\u2705 ' + __alloT('stem.circuit.quiz_correct', 'Correct!') : '\u274C Answer: ' + ohmQuiz.answer + ohmQuiz.unit,
                  h('p', {
                    className: 'text-xs font-normal mt-1 ' + (Math.abs(ohmQuiz.chosen - ohmQuiz.answer) < 0.01 ? 'text-emerald-500' : 'text-red-500')
                  }, '\uD83D\uDD0D ' + ohmQuiz.formula)
                )
              );
            })(),

            // ══════════════════════════════════════
            // Badge panel (collapsible)
            // ══════════════════════════════════════
            showBadges && h('div', { className: 'mt-4 bg-amber-950/10 border border-amber-500/20 p-4 rounded-xl backdrop-blur-md' },
              h('p', { className: 'text-[0.6875rem] font-bold text-amber-400 uppercase tracking-wider mb-2' }, '\uD83C\uDFC5 ' + __alloT('stem.circuit.badges', 'Badges') + ' (' + Object.keys(badges).length + '/' + BADGES.length + ')'),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
                BADGES.map(function(b) {
                  var earned = badges[b.id];
                  return h('div', {
                    key: b.id,
                    className: 'flex items-center gap-2.5 p-2 rounded-lg border text-xs ' + (earned ? 'bg-slate-950/60 border-amber-500/30 text-amber-300' : 'bg-slate-900/20 border-slate-900 opacity-40')
                  },
                    h('span', { className: 'text-base' }, earned ? b.icon : '\uD83D\uDD12'),
                    h('div', null,
                      h('p', { className: 'font-bold ' + (earned ? 'text-amber-300' : 'text-slate-500') }, b.name),
                      h('p', { className: 'text-[0.625rem] ' + (earned ? 'text-amber-400/80' : 'text-slate-600') }, __alloT('stem.circuit.' + (b.id) + '_desc', b.desc))
                    )
                  );
                })
              )
            ),

            // ══════════════════════════════════════
            // AI Tutor panel (collapsible)
            // ══════════════════════════════════════
            showAI && h('div', { className: 'mt-4 bg-blue-950/10 border border-blue-500/20 p-4 rounded-xl backdrop-blur-md' },
              h('p', { className: 'text-[0.6875rem] font-bold text-blue-400 uppercase tracking-wider mb-2' }, '\uD83E\uDD16 ' + __alloT('stem.circuit.ai_circuit_tutor', 'AI Circuit Tutor')),
              h('div', { className: 'flex gap-2' },
                h('input', {
                  id: 'circuit-ai-question',
                  type: 'text',
                  'aria-label': __alloT('stem.circuit.ai_question_label', 'Question for the AI Circuit Tutor'),
                  placeholder: __alloT('stem.circuit.placeholder_ask', "Ask about circuits, Ohm's Law, components..."),
                  value: aiQuestion,
                  onChange: function(e) { upd('aiQuestion', e.target.value); },
                  onKeyDown: function(e) { if (e.key === 'Enter') askAI(); },
                  className: 'flex-1 px-3 py-2 text-xs border border-blue-800 bg-slate-950/80 text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500'
                }),
                h('button', { 'aria-label': aiLoading ? __alloT('stem.circuit.aria_ai_thinking', 'AI is thinking') : __alloT('stem.circuit.aria_ask_ai_tutor', 'Ask the AI tutor'), 'aria-busy': aiLoading,
                  onClick: askAI,
                  disabled: aiLoading,
                  className: 'px-4 py-2 text-xs font-bold rounded-lg transition-all ' + (aiLoading ? 'bg-slate-800 text-slate-300' : 'transition-colors bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-600/10 active:scale-[0.97]')
                }, aiLoading ? __alloT('stem.circuit.thinking_ellipsis', 'Thinking...') : __alloT('stem.circuit.ask_btn', 'Ask'))
              ),
              aiLoading && h('div', { className: 'mt-2 text-xs text-blue-400 animate-pulse motion-reduce:animate-none' }, __alloT('stem.circuit.ai_is_thinking', 'AI is thinking...')),
              aiResponse && h('div', { role: 'status', 'aria-live': 'polite', className: 'mt-2 bg-slate-950/80 rounded-lg p-3 border border-blue-900/50 text-xs text-blue-200 whitespace-pre-wrap leading-relaxed' }, aiResponse),
              // Quick-ask suggestions
              h('div', { className: 'flex flex-wrap gap-1.5 mt-2' },
                [__alloT('stem.circuit.qa_ohms_law', "What is Ohm's Law?"), __alloT('stem.circuit.qa_series_parallel', 'Series vs parallel?'), __alloT('stem.circuit.qa_short_circuit', 'What is a short circuit?'), __alloT('stem.circuit.qa_capacitors', 'How do capacitors work?'), __alloT('stem.circuit.qa_ammeter', 'What does an ammeter measure?')].map(function(q) {
                  return h('button', { 'aria-label': __alloT('stem.circuit.aria_ask_question', 'Ask question'),
                    key: q,
                    onClick: function() { updMulti({ aiQuestion: q }); },
                    className: 'px-2.5 py-1 text-[0.625rem] bg-slate-950/60 text-blue-400 border border-blue-900/50 rounded-full hover:bg-blue-950/30 hover:text-blue-300 transition-all active:scale-[0.97]'
                  }, q);
                })
              )
            ),

            // ══════════════════════════════════════
            // Kirchhoff's Laws educational panel (g68/g912)
            // ══════════════════════════════════════
            (band === 'g68' || band === 'g912') && h('div', { className: 'mt-4 bg-violet-950/10 border border-violet-500/20 p-4 rounded-xl backdrop-blur-md' },
              h('button', { 'aria-label': __alloT('stem.circuit.aria_kirchhoff_laws', 'Kirchhoff Laws'), 'aria-expanded': showKirchhoff, onClick: function() { upd('showKirchhoff', !showKirchhoff); },
                className: 'flex items-center gap-2 w-full text-left'
              },
                h('p', { className: 'text-[0.6875rem] font-bold text-violet-400 uppercase tracking-wider' }, '\u2696 ' + __alloT('stem.circuit.kirchhoff_laws_title', "Kirchhoff's Laws")),
                h('span', { className: 'ml-auto text-violet-400 text-xs' }, showKirchhoff ? '\u25B2' : '\u25BC')
              ),
              showKirchhoff && h('div', { className: 'mt-3 space-y-3' },
                // KCL
                h('div', { className: 'bg-slate-950/40 rounded-lg p-3 border border-violet-900/40' },
                  h('p', { className: 'text-xs font-bold text-violet-300 mb-1' }, __alloT('stem.circuit.kcl_title', "Kirchhoff's Current Law (KCL)")),
                  h('p', { className: 'text-xs text-slate-400' }, __alloT('stem.circuit.kcl_desc', 'The total current entering a junction equals the total current leaving that junction.')),
                  h('p', { className: 'text-xs text-violet-400 font-mono mt-1' }, '\u2211 I_in = \u2211 I_out'),
                  mode === 'parallel' && components.length > 0 && h('div', { className: 'mt-2 bg-violet-950/20 rounded p-2 border border-violet-900/30' },
                    h('p', { className: 'text-[0.625rem] font-bold text-violet-300 mb-1' }, __alloT('stem.circuit.your_circuit_label', 'Your circuit:')),
                    h('p', { className: 'text-[0.625rem] text-slate-400 font-mono' }, 'Total current from source: ' + current.toFixed(3) + 'A'),
                    h('p', { className: 'text-[0.625rem] text-slate-400 font-mono mt-0.5' }, 'Branch currents: ' + components.map(function(c, i) {
                      var cR = getCompR(c);
                      var cI = reading(c).current;
                      return 'I' + (i + 1) + '=' + cI.toFixed(3) + 'A';
                    }).join(' + ')),
                    (function() {
                      var branchSum = 0;
                      components.forEach(function(c) { branchSum += reading(c).current; });
                      return h('p', { className: 'text-[0.625rem] font-bold text-violet-300 font-mono mt-1' }, 'Sum of branch currents: ' + branchSum.toFixed(3) + 'A ' + (Math.abs(branchSum - current) < 0.001 ? '\u2705' : ''));
                    })()
                  )
                ),

                // KVL
                h('div', { className: 'bg-slate-950/40 rounded-lg p-3 border border-violet-900/40' },
                  h('p', { className: 'text-xs font-bold text-violet-300 mb-1' }, __alloT('stem.circuit.kvl_law_title', "Kirchhoff's Voltage Law (KVL)")),
                  h('p', { className: 'text-xs text-slate-400' }, __alloT('stem.circuit.kvl_law_desc', 'The sum of all voltage drops around any closed loop equals the source voltage (EMF).')),
                  h('p', { className: 'text-xs text-violet-400 font-mono mt-1' }, '\u2211 V_drops = V_source'),
                  mode === 'series' && components.length > 0 && current > 0.001 && h('div', { className: 'mt-2 bg-violet-950/20 rounded p-2 border border-violet-900/30' },
                    h('p', { className: 'text-[0.625rem] font-bold text-violet-300 mb-1' }, __alloT('stem.circuit.your_circuit_label', 'Your circuit:')),
                    components.map(function(c, i) {
                      if (c.type === 'ammeter' || c.type === 'voltmeter') return null;
                      var cR = getCompR(c);
                      var cV = reading(c).voltage;
                      return h('p', { key: c.id, className: 'text-[0.625rem] text-slate-400 font-mono' }, 'V' + (i + 1) + ' = ' + (c.type === 'led' ? circuitForwardVoltage(c) + ' + ' : '') + current.toFixed(3) + ' × ' + cR.toFixed(1) + ' = ' + circuitVoltageText(cV, 2));
                    }),
                    (function() {
                      var vSum = 0;
                      components.forEach(function(c) {
                        vSum += reading(c).voltage || 0;
                      });
                      return h('p', { className: 'text-[0.625rem] font-bold text-violet-300 font-mono mt-1' }, '\u2211 = ' + vSum.toFixed(2) + 'V \u2248 ' + voltage + 'V ' + (Math.abs(vSum - voltage) < 0.1 ? '\u2705' : '\u26A0\uFE0F'));
                    })()
                  )
                ),

                // Additional formulas for g912
                band === 'g912' && h('div', { className: 'bg-slate-950/40 rounded-lg p-3 border border-violet-900/40' },
                  h('p', { className: 'text-xs font-bold text-violet-300 mb-1' }, __alloT('stem.circuit.key_relationships', 'Key Relationships')),
                  h('div', { className: 'grid grid-cols-2 gap-2 text-[0.625rem] text-slate-400 font-mono' },
                    h('p', null, 'V = IR (Ohm\'s Law)'),
                    h('p', null, 'P = IV = I\u00B2R = V\u00B2/R'),
                    h('p', null, 'R_series = R1 + R2 + ...'),
                    h('p', null, '1/R_par = 1/R1 + 1/R2 + ...'),
                    h('p', null, 'Xc = 1/(2\u03C0fC)'),
                    h('p', null, 'Energy = P \u00D7 t (Joules)')
                  )
                )
              )
            ),

            // ══════════════════════════════════════
            // Oscilloscope / Waveform Display
            // ══════════════════════════════════════
            components.length > 0 && !isOpen ? h('div', { className: 'mt-4 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-xl' },
              h('div', { className: 'px-3 py-2 flex items-center gap-2 border-b border-slate-800 bg-slate-950/60' },
                h('div', { className: 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none' }),
                h('span', { className: 'text-[0.625rem] font-bold text-emerald-400 uppercase tracking-wider font-mono' }, __alloT('stem.circuit.signal_sketch_label', 'Signal sketch · illustrative')),
                h('span', { className: 'ml-auto text-[0.625rem] text-slate-500 font-mono' },
                  voltage.toFixed(1) + 'V  ' + current.toFixed(3) + 'A  ' + totalR.toFixed(1) + '\u03A9')
              ),
              h('canvas', { role: 'img', tabIndex: 0, 'aria-label': __alloT('stem.circuit.aria_oscilloscope', 'Illustrative voltage, current, and capacitor charge sketch, not calculated time samples. Use the mixed workbench oscilloscope for measurements.'),
                ref: function(canvas) {
                  if (!canvas) return;
                  var oc = canvas.getContext('2d');
                  var dpr = window.devicePixelRatio || 1;
                  var ow = canvas.offsetWidth || 400;
                  var oh = 120;
                  var _tw = ow * dpr, _th = oh * dpr;
                  if (canvas.width !== _tw) canvas.width = _tw;
                  if (canvas.height !== _th) canvas.height = _th;
                  canvas.style.height = oh + 'px';
                  // setTransform (absolute) not scale (relative): the realloc that used to
                  // reset the transform is conditional now, so scale() would COMPOUND.
                  oc.setTransform(dpr, 0, 0, dpr, 0, 0);
                  oc.clearRect(0, 0, ow, oh);

                  // Dark CRT background
                  oc.fillStyle = '#050a12'; oc.fillRect(0, 0, ow, oh);

                  // CRT grid pattern
                  oc.strokeStyle = 'rgba(16, 185, 129, 0.08)'; oc.lineWidth = 0.5;
                  for (var gx = 0; gx < ow; gx += ow / 10) {
                    oc.beginPath(); oc.moveTo(gx, 0); oc.lineTo(gx, oh); oc.stroke();
                  }
                  for (var gy = 0; gy < oh; gy += oh / 6) {
                    oc.beginPath(); oc.moveTo(0, gy); oc.lineTo(ow, gy); oc.stroke();
                  }

                  // Center division lines
                  oc.strokeStyle = 'rgba(16, 185, 129, 0.2)'; oc.lineWidth = 1;
                  oc.beginPath(); oc.moveTo(0, oh / 2); oc.lineTo(ow, oh / 2); oc.stroke();
                  oc.beginPath(); oc.moveTo(ow / 2, 0); oc.lineTo(ow / 2, oh); oc.stroke();

                  // 1. Draw capacitor charge wave if present
                  if (components.some(function(c) { return c.type === 'capacitor'; })) {
                    var cap = components.find(function(c) { return c.type === 'capacitor'; });
                    var capVal = cap.value || 100;
                    var period = 100;
                    oc.strokeStyle = '#38bdf8'; oc.lineWidth = 2;
                    oc.shadowColor = '#38bdf8'; oc.shadowBlur = 6;
                    oc.beginPath();
                    for (var sx = 0; sx < ow; sx++) {
                      var phase = (sx + tick * 1.5) % period;
                      var isCharging = phase < period / 2;
                      var t = phase % (period / 2);
                      var normVal;
                      if (isCharging) {
                        normVal = 1 - Math.exp(-t / (capVal * 0.08 + 2));
                      } else {
                        normVal = Math.exp(-t / (capVal * 0.08 + 2));
                      }
                      var sy = oh * 0.75 - normVal * oh * 0.5;
                      if (sx === 0) oc.moveTo(sx, sy); else oc.lineTo(sx, sy);
                    }
                    oc.stroke(); oc.shadowBlur = 0;
                  }

                  // 2. Voltage trace (green, DC flat line at voltage level with noise jitter)
                  var vNorm = Math.min(voltage / 24, 1);
                  var vY = oh * 0.8 - vNorm * oh * 0.6;
                  oc.strokeStyle = '#10b981'; oc.lineWidth = 2;
                  oc.shadowColor = '#10b981'; oc.shadowBlur = 6;
                  oc.beginPath();
                  for (var sx = 0; sx < ow; sx++) {
                    var jitter = (Math.random() - 0.5) * 0.4;
                    if (sx === 0) oc.moveTo(sx, vY + jitter); else oc.lineTo(sx, vY + jitter);
                  }
                  oc.stroke(); oc.shadowBlur = 0;

                  // 3. Current trace (cyan, with slight noise to look realistic)
                  if (!isShort) {
                    var iNorm = Math.min(current / 2, 1);
                    var iY = oh * 0.8 - iNorm * oh * 0.6;
                    oc.strokeStyle = '#06b6d4'; oc.lineWidth = 1.5;
                    oc.shadowColor = '#06b6d4'; oc.shadowBlur = 4;
                    oc.beginPath();
                    for (var sx = 0; sx < ow; sx++) {
                      var noise = (Math.random() - 0.5) * 0.8;
                      if (sx === 0) oc.moveTo(sx, iY + noise); else oc.lineTo(sx, iY + noise);
                    }
                    oc.stroke(); oc.shadowBlur = 0;
                  }

                  // Scanlines overlay for CRT effect
                  oc.fillStyle = 'rgba(255, 255, 255, 0.03)';
                  for (var sy = 0; sy < oh; sy += 3) {
                    oc.fillRect(0, sy, ow, 1.2);
                  }

                  // CRT Vignette glow overlay
                  var vig = oc.createRadialGradient(ow / 2, oh / 2, oh / 2, ow / 2, oh / 2, ow * 0.6);
                  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
                  vig.addColorStop(1, 'rgba(5, 10, 18, 0.7)');
                  oc.fillStyle = vig; oc.fillRect(0, 0, ow, oh);

                  // Legend
                  oc.font = '9px monospace'; oc.textAlign = 'left';
                  oc.fillStyle = '#10b981'; oc.fillText('\u2588 Voltage', 10, oh - 8);
                  oc.fillStyle = '#06b6d4'; oc.fillText('\u2588 Current', 80, oh - 8);
                  if (components.some(function(c) { return c.type === 'capacitor'; })) {
                    oc.fillStyle = '#38bdf8'; oc.fillText('\u2588 Cap-Charge', 150, oh - 8);
                  }

                  // Short circuit warning overlay
                  if (isShort) {
                    oc.fillStyle = 'rgba(127, 29, 29, 0.4)'; oc.fillRect(0, 0, ow, oh);
                    oc.fillStyle = '#f87171'; oc.font = 'bold 13px monospace'; oc.textAlign = 'center';
                    oc.fillText('\u26A0 CRITICAL SHORT DETECTED', ow / 2, oh / 2 + 4);
                  }
                },
                className: 'w-full block', style: { height: '120px' }
              })
            ) : null,

            // ══════════════════════════════════════
            // Component Physics Explainer
            // ══════════════════════════════════════
            (function() {
              var COMP_PHYSICS = {
                resistor: {
                  icon: '\u2AE8', name: __alloT('stem.circuit.comp_resistor', 'Resistor'), color: '#eab308',
                  how: __alloT('stem.circuit.physics_resistor_how', 'Electrons collide with atoms in the resistive material, converting electrical energy into heat. The more collisions (higher resistance), the less current flows.'),
                  equation: 'V = I \u00D7 R (Ohm\'s Law)',
                  analogy: __alloT('stem.circuit.physics_resistor_analogy', 'Like a narrow section of pipe - it restricts water flow and creates pressure difference.')
                },
                bulb: {
                  icon: '\uD83D\uDCA1', name: __alloT('stem.circuit.comp_light_bulb', 'Light Bulb'), color: '#fbbf24',
                  how: __alloT('stem.circuit.physics_bulb_how', "Current heats a thin wire (filament) to ~2,500\u00B0C until it glows white-hot. The filament's resistance increases with temperature."),
                  equation: 'Brightness \u221D Power = I\u00B2 \u00D7 R',
                  analogy: __alloT('stem.circuit.physics_bulb_analogy', 'Like rubbing your hands together fast - friction (resistance) creates heat and light.')
                },
                switch: {
                  icon: '\uD83D\uDD18', name: __alloT('stem.circuit.comp_switch', 'Switch'), color: '#10b981',
                  how: __alloT('stem.circuit.physics_switch_how', 'A physical gap in the conductor. When closed, electrons flow freely. When open, the air gap has near-infinite resistance, stopping current completely.'),
                  equation: 'R_open \u2248 \u221E, R_closed \u2248 0\u03A9',
                  analogy: __alloT('stem.circuit.physics_switch_analogy', 'Like a drawbridge - when up, nothing crosses. When down, traffic flows.')
                },
                led: {
                  icon: '\uD83D\uDD34', name: __alloT('stem.circuit.comp_led', 'LED'), color: '#f43f5e',
                  how: __alloT('stem.circuit.physics_led_how', 'A semiconductor diode that emits photons when electrons drop from a high energy band to a low one. Different materials produce different colors.'),
                  equation: 'V_forward \u2248 1.8-3.3V (varies by color)',
                  analogy: __alloT('stem.circuit.physics_led_analogy', 'Like a one-way door with a light - electrons can only go one direction, and they release light as they pass.')
                },
                ammeter: {
                  icon: '\u26A1', name: __alloT('stem.circuit.comp_ammeter', 'Ammeter'), color: '#06b6d4',
                  how: __alloT('stem.circuit.physics_ammeter_how', 'Measures current by detecting the magnetic field created by flowing electrons. Connected in series so all current passes through it. Has very low internal resistance.'),
                  equation: 'I = reading in Amperes (A)',
                  analogy: __alloT('stem.circuit.physics_ammeter_analogy', 'Like a turnstile counting how many people pass per second.')
                },
                voltmeter: {
                  icon: '\uD83D\uDD0B', name: __alloT('stem.circuit.comp_voltmeter', 'Voltmeter'), color: '#f59e0b',
                  how: __alloT('stem.circuit.physics_voltmeter_how', "Measures potential difference (voltage) between two points. Connected in parallel with very high internal resistance so it doesn't affect the circuit."),
                  equation: 'V = reading in Volts (V)',
                  analogy: __alloT('stem.circuit.physics_voltmeter_analogy', 'Like a pressure gauge on a water pipe - measures the push without blocking flow.')
                },
                capacitor: {
                  icon: '\u2E28', name: __alloT('stem.circuit.comp_capacitor', 'Capacitor'), color: '#38bdf8',
                  how: __alloT('stem.circuit.physics_capacitor_how', 'Two metal plates separated by an insulator. Electrons accumulate on one plate and leave the other, storing energy in an electric field. Releases energy quickly when discharged.'),
                  equation: 'Q = C \u00D7 V, Energy = \u00BDCV\u00B2',
                  analogy: __alloT('stem.circuit.physics_capacitor_analogy', 'Like a water tank - it fills up slowly and can release all its stored water at once.')
                }
              };

              var selectedComp = d._selectedComp || null;
              var physics = selectedComp ? COMP_PHYSICS[selectedComp] : null;

              if (components.length === 0) return null;

              return h('div', { className: 'mt-4 bg-slate-900/40 border border-slate-800 p-4 rounded-xl backdrop-blur-md' },
                h('p', { className: 'text-[0.6875rem] font-bold text-yellow-500 uppercase tracking-wider mb-2' }, '\u269B How Components Work'),
                h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
                  ['resistor', 'bulb', 'switch', 'led', 'ammeter', 'voltmeter', 'capacitor'].map(function(type) {
                    var info = COMP_PHYSICS[type];
                    var active = selectedComp === type;
                    return h('button', { key: type,
                      onClick: function() { upd('_selectedComp', active ? null : type); },
                      className: 'px-2.5 py-1 rounded-lg text-[0.625rem] font-bold transition-all border ' +
                        (active ? 'text-slate-950 font-extrabold shadow-sm' : 'transition-colors bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'),
                      style: active ? { background: info.color, borderColor: info.color } : {}
                    }, info.icon + ' ' + info.name);
                  })
                ),
                physics ? h('div', { className: 'bg-slate-950/60 rounded-xl border border-slate-800/80 p-3 animate-in fade-in duration-200 motion-reduce:animate-none' },
                  h('div', { className: 'flex items-center gap-2 mb-2 flex-wrap' },
                    h('span', { className: 'text-xl' }, physics.icon),
                    h('h4', { className: 'font-bold text-slate-200 text-sm' }, physics.name),
                    h('span', { className: 'ml-auto px-2 py-0.5 rounded-full text-[0.625rem] font-mono font-bold bg-slate-900 text-yellow-500 border border-slate-800' }, physics.equation)
                  ),
                  h('p', { className: 'text-xs text-slate-300 leading-relaxed mb-3' }, physics.how),
                  h('div', { className: 'bg-cyan-950/20 rounded-lg p-2.5 border border-cyan-900/30' },
                    h('span', { className: 'text-[0.625rem] font-bold text-cyan-400' }, '\uD83D\uDCA1 ' + __alloT('stem.circuit.analogy_label', 'Analogy: ')),
                    h('span', { className: 'text-[0.625rem] text-cyan-300 leading-normal' }, physics.analogy)
                  ),
                  typeof callTTS === 'function' ? h('button', { 'aria-label': __alloT('stem.circuit.aria_read_aloud', 'Read aloud'),
                    onClick: function() { callTTS(physics.name + '. ' + physics.how + ' ' + physics.analogy); },
                    className: 'transition-colors mt-2 text-[0.625rem] text-yellow-500 hover:text-yellow-400 font-bold'
                  }, '\uD83D\uDD0A ' + __alloT('stem.circuit.read_aloud', 'Read aloud')) : null
                ) : h('p', { className: 'text-[0.625rem] text-slate-500 italic' }, __alloT('stem.circuit.tap_component_hint', 'Tap a component above to learn how it works inside!'))
              );
            })(),

            // ══════════════════════════════════════
            // Real-World Circuit Applications
            // ══════════════════════════════════════
            h('div', { className: 'mt-4 bg-slate-900/40 border border-slate-800 p-4 rounded-xl backdrop-blur-md' },
              h('p', { className: 'text-[0.6875rem] font-bold text-cyan-400 uppercase tracking-wider mb-2' }, '\uD83C\uDF0D ' + __alloT('stem.circuit.real_world_circuits_title', 'Real-World Circuits')),
              h('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-2' },
                [
                  { emoji: '\uD83D\uDD26', name: __alloT('stem.circuit.app_flashlight_name', 'Flashlight'), circuit: __alloT('stem.circuit.circuit_type_series', 'Series'), desc: __alloT('stem.circuit.app_flashlight_desc', 'Battery + switch + bulb in series. Switch breaks circuit to turn off.'), comps: __alloT('stem.circuit.app_flashlight_comps', 'Switch, Bulb') },
                  { emoji: '\uD83D\uDCF1', name: __alloT('stem.circuit.app_phone_charger_name', 'Phone Charger'), circuit: __alloT('stem.circuit.circuit_type_series_parallel', 'Series + Parallel'), desc: __alloT('stem.circuit.app_phone_charger_desc', 'Transformer reduces 120V to 5V. Capacitors smooth the current for steady charging.'), comps: __alloT('stem.circuit.app_phone_charger_comps', 'Resistor, Capacitor') },
                  { emoji: '\uD83D\uDE97', name: __alloT('stem.circuit.app_car_headlights_name', 'Car Headlights'), circuit: __alloT('stem.circuit.circuit_type_parallel', 'Parallel'), desc: __alloT('stem.circuit.app_car_headlights_desc', 'Headlights wired in parallel so if one burns out, the other stays on.'), comps: __alloT('stem.circuit.app_car_headlights_comps', 'Bulb, Switch') },
                  { emoji: '\uD83C\uDFB5', name: __alloT('stem.circuit.app_guitar_pedal_name', 'Guitar Pedal'), circuit: __alloT('stem.circuit.circuit_type_series_parallel', 'Series + Parallel'), desc: __alloT('stem.circuit.app_guitar_pedal_desc', 'Resistors and capacitors filter frequencies to create distortion or reverb effects.'), comps: __alloT('stem.circuit.app_guitar_pedal_comps', 'Resistor, Capacitor') },
                  { emoji: '\uD83D\uDEA6', name: __alloT('stem.circuit.app_traffic_light_name', 'Traffic Light'), circuit: __alloT('stem.circuit.circuit_type_parallel', 'Parallel'), desc: __alloT('stem.circuit.app_traffic_light_desc', 'Three LED groups in parallel, controlled by a timer circuit switching between them.'), comps: __alloT('stem.circuit.app_traffic_light_comps', 'LED, Switch') },
                  { emoji: '\u2764\uFE0F', name: __alloT('stem.circuit.app_heart_monitor_name', 'Heart Monitor'), circuit: __alloT('stem.circuit.circuit_type_series', 'Series'), desc: __alloT('stem.circuit.app_heart_monitor_desc', 'Amplifies tiny electrical signals from heart muscle. Resistors set gain, capacitors filter noise.'), comps: __alloT('stem.circuit.app_heart_monitor_comps', 'Resistor, Ammeter') }
                ].map(function(app) {
                  var expanded = d._expandedApp === app.name;
                  return h('button', { key: app.name, 'aria-expanded': expanded,
                    onClick: function() { upd('_expandedApp', expanded ? null : app.name); },
                    className: 'text-left rounded-lg p-2.5 border transition-all ' +
                      (expanded ? 'bg-slate-950/80 border-cyan-500/40 shadow-md shadow-cyan-500/5' : 'transition-colors bg-slate-950/40 border-slate-800 hover:border-slate-700')
                  },
                    h('div', { className: 'flex items-center gap-2.5 mb-1.5' },
                      h('span', { className: 'text-base' }, app.emoji),
                      h('div', null,
                        h('span', { className: 'text-xs font-bold text-slate-200 block' }, app.name),
                        h('span', { className: 'text-[0.625rem] text-cyan-400 font-bold uppercase tracking-wider' }, app.circuit)
                      )
                    ),
                    expanded ? h('div', { className: 'animate-in fade-in duration-200 motion-reduce:animate-none mt-1' },
                      h('p', { className: 'text-[0.625rem] text-slate-400 leading-normal mb-1.5' }, app.desc),
                      h('span', { className: 'text-[0.625rem] text-slate-300 font-bold block' }, '\uD83D\uDD27 ' + __alloT('stem.circuit.key_parts_label', 'Key parts: ') + app.comps)
                    ) : null
                  );
                })
              )
            ),

            // ══════════════════════════════════════
            // Snapshot + Footer
            // ══════════════════════════════════════
            h('div', { className: 'mt-4 flex items-center gap-2 justify-end' },
              h('button', { 'aria-label': __alloT('stem.circuit.snapshot', 'Snapshot'),
                onClick: function() {
                  if (typeof setToolSnapshots === 'function') {
                    setToolSnapshots(function(prev) {
                      return prev.concat([{
                        id: 'ci-' + Date.now(),
                        tool: 'circuit',
                        label: components.length + ' parts ' + voltage + 'V ' + mode,
                        data: (function () { var _s = Object.assign({}, d, { mode: mode }); delete _s.tick; delete _s._aiLoading; delete _s._aiResponse; return _s; })(),
                        timestamp: Date.now()
                      }]);
                    });
                  }
                  if (typeof addToast === 'function') addToast('\uD83D\uDCF8 Snapshot saved!', 'success');
                },
                className: 'px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md shadow-indigo-500/10 hover:shadow-lg transition-all'
              }, '\uD83D\uDCF8 ' + __alloT('stem.circuit.snapshot', 'Snapshot')),

              // TTS button
              typeof callTTS === 'function' && h('button', { 'aria-label': __alloT('stem.circuit.read_aloud_btn', 'Read Aloud'),
                onClick: function() {
                  var summary = 'Circuit Builder: ' + mode + ' mode, ' + voltage + ' volts, ' +
                    components.length + ' components. Total resistance ' + totalR.toFixed(1) + ' ohms. ' +
                    'Current ' + current.toFixed(3) + ' amps. Power ' + power.toFixed(2) + ' watts.';
                  if (isShort) summary += ' Warning: short circuit detected!';
                  if (isOpen) summary += ' Circuit is open, no current flowing.';
                  callTTS(summary);
                },
                className: 'px-4 py-2 text-xs font-bold text-slate-300 bg-slate-900/60 rounded-full hover:bg-slate-800 transition-all border border-slate-800 active:scale-[0.97]'
              }, '\uD83D\uDD0A ' + __alloT('stem.circuit.read_aloud_btn', 'Read Aloud'))
            ),

            // Footer
            h('p', { className: 'text-[0.625rem] text-center text-slate-400 mt-4 mb-2 font-mono font-bold' }, '\uD83D\uDD0C ' + __alloT('stem.circuit.circuit_builder', 'Circuit Builder') + ' \u2022 ' + __alloT('stem.circuit.footer_ohm', "Ohm's Law: V = IR") + ' \u2022 ' + __alloT('stem.circuit.footer_power', 'Power: P = IV')),
            confirmationAction && h(CircuitConfirmationDialog, {
              React: React,
              action: confirmationAction,
              onCancel: function() { upd('confirmAction', null); },
              onConfirm: confirmCircuitAction
            })
          );
        };
      }
      var coverage=(ctx.toolData||{})._circuit||{},networkActive=!!coverage.networkWorkbench,activeElectronics=!networkActive&&!!coverage.activeWorkbench,mixedActive=!networkActive&&!activeElectronics&&!!coverage.mixedWorkbench;
      var __circuitMainView = h(React.Fragment,null,
        h('div',{'data-circuit-builder-root':'true',className:'circuit-workspace-switch',role:'group','aria-label':'Circuit workbench coverage'},
          ['Simple circuits','Mixed circuits','Active electronics','Connected circuits'].map(function(label,i){return h('button',{key:label,type:'button','aria-pressed':(networkActive?3:activeElectronics?2:mixedActive?1:0)===i,onClick:function(){ctx.setToolData(function(prev){return Object.assign({},prev,{_circuit:Object.assign({},prev._circuit,{mixedWorkbench:i===1,activeWorkbench:i===2,networkWorkbench:i===3})});});}},label);}),
          h('span',null,networkActive?'Bridges, shared loads, and multiple sources':activeElectronics?'Transistors, sensors, and control':mixedActive?'Series paths across parallel branches':'Learn the foundations')),
        networkActive?h(CircuitNetworkWorkbench,{ctx:ctx}):activeElectronics?h(CircuitActiveWorkbench,{ctx:ctx}):mixedActive?h(CircuitMixedWorkbench,{ctx:ctx}):h(this._CircuitComponent, { ctx: ctx }));

      // ═══════════════════════════════════════════════════════════════════
      // CIRCUIT EXPANSION SECTIONS — interactive electronics reference (2026-05-31)
      // ═══════════════════════════════════════════════════════════════════
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var React = ctx.React;
      var d2 = (labToolData && labToolData.circuit) || {};
      var workspaceTab = d2.workspaceTab || 'build';
      var expSection = d2.expSection || null;
      function setExp(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.circuit) || {};
          return Object.assign({}, prev, { circuit: Object.assign({}, prior, patch) });
        });
      }
      function renderWorkspaceSwitch() {
        var tabs = [
          { id: 'build', label: __alloT('stem.circuit.reference_tab_build', 'Build'), icon: '\uD83D\uDD0C' },
          { id: 'reference', label: __alloT('stem.circuit.reference_tab_reference', 'Reference'), icon: '\uD83D\uDCD8' }
        ];
        var workspaceTabKeyDown = function(e, index) {
          var nextIndex = -1;
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = (index + 1) % tabs.length;
          else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = (index + tabs.length - 1) % tabs.length;
          else if (e.key === 'Home') nextIndex = 0;
          else if (e.key === 'End') nextIndex = tabs.length - 1;
          if (nextIndex < 0) return;
          e.preventDefault();
          var tabNodes = e.currentTarget && e.currentTarget.parentNode
            ? e.currentTarget.parentNode.querySelectorAll('[role="tab"]')
            : [];
          var nextTab = tabNodes[nextIndex];
          if (nextTab) {
            nextTab.focus();
            nextTab.click();
          }
        };
        return h('div', {
          className: 'max-w-3xl mx-auto mb-3 flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-950/90 border border-slate-800 shadow-lg',
          role: 'tablist',
          'aria-label': __alloT('stem.circuit.aria_workspace', 'Circuit Builder workspace')
        }, tabs.map(function(tab, tabIndex) {
          var active = workspaceTab === tab.id;
          return h('button', {
            key: tab.id,
            id: 'circuit-workspace-tab-' + tab.id,
            type: 'button',
            role: 'tab',
            'aria-selected': active ? 'true' : 'false',
            'aria-controls': tab.id === 'reference' ? 'circuit-reference-panel' : 'circuit-build-panel',
            tabIndex: active ? 0 : -1,
            onKeyDown: function(e) { workspaceTabKeyDown(e, tabIndex); },
            onClick: function() { setExp({ workspaceTab: tab.id }); },
            className: 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ' +
              (active ? 'bg-yellow-400 text-slate-950 shadow-sm' : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white')
          },
            h('span', { 'aria-hidden': 'true' }, tab.icon),
            h('span', null, tab.label)
          );
        }));
      }

      var CIRCUIT_LAWS = [
        { name: 'Ohm\'s law', formula: 'V = I × R', desc: 'Voltage across a resistor equals current × resistance. Linear relationship for ohmic materials.', example: 'A 100 Ω resistor with 12 V across it → I = 0.12 A.' },
        { name: 'Kirchhoff\'s current law (KCL)', formula: 'Σ I_in = Σ I_out', desc: 'Sum of currents into a node = sum of currents out. Conservation of charge.', example: 'If 3 A enters a junction and one branch takes 1 A, the other branch carries 2 A.' },
        { name: 'Kirchhoff\'s voltage law (KVL)', formula: 'Σ V around loop = 0', desc: 'Sum of voltage drops around any closed loop = 0. Conservation of energy.', example: '9V battery + 4Ω + 5Ω in series: voltage drops 4×I + 5×I = 9 → I = 1A.' },
        { name: 'Power formula', formula: 'P = V × I = I² × R = V²/R', desc: 'Three equivalent forms. Pick the one matching what you know.', example: '100 W bulb on 120 V mains: I = 0.83 A; R = 144 Ω.' },
        { name: 'Series resistance', formula: 'R_total = R₁ + R₂ + R₃ + ...', desc: 'Resistors in series simply add. Same current through each.', example: '100 Ω + 220 Ω + 470 Ω in series = 790 Ω.' },
        { name: 'Parallel resistance', formula: '1/R_total = 1/R₁ + 1/R₂ + ...', desc: 'Inverses add. Parallel total is ALWAYS less than smallest. Same voltage across each.', example: '100 Ω || 100 Ω = 50 Ω. 100 Ω || 1000 Ω ≈ 91 Ω.' },
        { name: 'Capacitance', formula: 'Q = C × V; I = C × dV/dt', desc: 'Charge stored proportional to voltage. Current = capacitance × rate of voltage change.', example: '100 µF capacitor charged to 10 V holds 1 mC of charge.' },
        { name: 'RC time constant', formula: 'τ = R × C', desc: 'Time to charge to ~63% (or discharge to ~37%). Reaches ~99% in 5τ.', example: '10 kΩ × 100 µF = 1 second. After 5 s, capacitor is fully (>99%) charged.' },
        { name: 'Inductance', formula: 'V = L × dI/dt', desc: 'Inductor resists current changes. Voltage = inductance × rate of current change.', example: '1 mH inductor with current changing at 1000 A/s → 1 V across it.' },
        { name: 'AC reactance', formula: 'X_L = 2πfL; X_C = 1/(2πfC)', desc: 'Frequency-dependent "resistance" of L and C. Combined as impedance Z.', example: '1 µF cap at 60 Hz: X_C = 2.65 kΩ. At 60 kHz: 2.65 Ω.' }
      ];

      var CIRCUIT_COMPONENTS = [
        { name: 'Resistor', symbol: '⏛', units: 'Ω (ohms)', role: 'Limits current, drops voltage, divides voltage. Most common passive component.', colors: 'Color bands: Black=0, Brown=1, Red=2, Orange=3, Yellow=4, Green=5, Blue=6, Violet=7, Gray=8, White=9.' },
        { name: 'Capacitor', symbol: '||', units: 'F (farads)', role: 'Stores charge. Blocks DC, passes AC. Filtering, timing, energy storage.', colors: 'Common sizes: µF (10⁻⁶), nF (10⁻⁹), pF (10⁻¹²). Electrolytic caps polarized.' },
        { name: 'Inductor', symbol: '⌇', units: 'H (henries)', role: 'Stores energy in magnetic field. Resists current changes. Filtering, transformers, motors.', colors: 'Common sizes: mH, µH, nH. Coil of wire, often on a ferrite core.' },
        { name: 'Diode', symbol: '▷|', units: 'V_f (forward voltage)', role: 'One-way valve for current. Conducts when V > V_f (~0.7 V for Si, 0.3 V for Ge).', colors: 'LED V_f varies by color: red ~1.8 V, green ~2.1 V, blue ~3.2 V, white ~3.0 V.' },
        { name: 'Transistor (BJT)', symbol: '3 terminals', units: 'β (gain)', role: 'Current amplifier. Small base current controls large collector current. NPN or PNP.', colors: 'Common: 2N3904 (NPN), 2N3906 (PNP). β often 100-300.' },
        { name: 'Transistor (MOSFET)', symbol: '3 terminals + gate', units: 'V_GS threshold', role: 'Voltage amplifier. Gate voltage controls drain-source current. Very high input impedance.', colors: 'Dominant in modern ICs. Logic levels: V_GS > V_threshold turns on.' },
        { name: 'Op-amp', symbol: '▷', units: 'gain (often 10⁵+)', role: 'High-gain differential amplifier. With feedback, makes amplifiers, filters, comparators.', colors: 'Iconic: 741, LM358, TL072. Modern rail-to-rail: MCP6022.' },
        { name: 'Switch', symbol: '|/', units: '—', role: 'Manual open/close of circuit. SPST, SPDT, DPDT, momentary, toggle, slide, rocker.', colors: 'Mechanical or solid-state (transistor switching).' },
        { name: 'LED', symbol: 'D with arrows', units: 'mcd (millicandela)', role: 'Light-emitting diode. Efficient lighting + indicators. Need current-limiting resistor.', colors: 'Common drop ~2 V; current ~10-20 mA. R = (V_supply − V_LED) / I_LED.' },
        { name: 'Battery', symbol: '|||−', units: 'V + Ah', role: 'DC voltage source. Capacity (Ah) × voltage = energy. Internal resistance limits current.', colors: 'AA: 1.5 V × ~2.5 Ah = 3.75 Wh. 9V: 9 V × ~0.5 Ah = 4.5 Wh.' },
        { name: 'Fuse', symbol: '~', units: 'A (amps) rating', role: 'Sacrifices itself to protect circuit. Wire that melts above rated current.', colors: 'Slow-blow vs fast-blow. Always replace with same or LOWER rating.' },
        { name: 'Crystal oscillator', symbol: '⊙', units: 'Hz', role: 'Provides precise frequency reference. Common: 32.768 kHz (watches), 16 MHz (Arduinos).', colors: 'Stability: ppm or ppb. Temperature-compensated (TCXO) for tighter specs.' }
      ];

      var SERIES_VS_PARALLEL = [
        { aspect: 'Current', series: 'Same through all components', parallel: 'Divides between branches inversely with R' },
        { aspect: 'Voltage', series: 'Divides across components proportional to R', parallel: 'Same across all branches' },
        { aspect: 'Resistance', series: 'Sum: R₁ + R₂ + R₃', parallel: 'Reciprocal: 1/(1/R₁ + 1/R₂ + 1/R₃); always less than smallest' },
        { aspect: 'Single component fails (open)', series: 'Entire circuit stops (like Christmas lights)', parallel: 'Other branches keep working' },
        { aspect: 'Single component fails (short)', series: 'Other components see more current (may burn out)', parallel: 'That branch sees full current; others unaffected' },
        { aspect: 'Power dissipation', series: 'P = I²R; larger R dissipates more (same I)', parallel: 'P = V²/R; smaller R dissipates more (same V)' },
        { aspect: 'Typical use', series: 'Current limiting (resistor + LED)', parallel: 'Independent loads (every outlet in your house)' }
      ];

      var SAFETY_RULES = [
        { rule: 'Power off before working', detail: 'Disconnect battery / unplug from mains. Discharge large capacitors (a CRT cap can hold lethal voltage for weeks).' },
        { rule: '"Right-hand rule" for high-voltage work', detail: 'Keep one hand in pocket. Prevents current flow across chest. Adopted from electric utility safety.' },
        { rule: 'GFCI in wet locations', detail: 'Ground Fault Circuit Interrupter trips in <30 ms if current leaks. Required by code in kitchens, bathrooms, outdoors.' },
        { rule: 'AFCI for electrical fire prevention', detail: 'Arc Fault Circuit Interrupter detects dangerous arcs in damaged wiring. Required in bedrooms in newer codes.' },
        { rule: 'Mains voltage is lethal', detail: '120 V AC can kill at ~10 mA across heart. Voltage drives current through skin resistance (~10-100 kΩ dry, much lower wet).' },
        { rule: 'Battery short circuit', detail: 'Li-ion batteries shorted = fire / explosion. Lead-acid car batteries = molten metal sparks. Even AAs can heat up significantly.' },
        { rule: 'Capacitor discharge before service', detail: 'Use a 10 kΩ resistor with insulated leads, never a screwdriver across terminals (the latter can vaporize the conductor + your eyes).' },
        { rule: 'ESD (electrostatic discharge)', detail: 'Static can destroy ICs. Use wrist strap + ESD mat when handling chips. Walk on carpet → easily 10+ kV body charge.' }
      ];

      var CIRCUIT_PATTERNS = [
        { name: 'Voltage divider', purpose: 'Get fraction of V_in', formula: 'V_out = V_in × R₂ / (R₁ + R₂)', notes: 'Two resistors in series. V_out tapped between them. Common for ADC scaling, biasing.' },
        { name: 'Current divider', purpose: 'Split current between parallel branches', formula: 'I_n = I_total × R_total / R_n', notes: 'More current flows through smaller resistance.' },
        { name: 'Low-pass filter (RC)', purpose: 'Pass low frequencies, block high', formula: 'f_cutoff = 1 / (2π × R × C)', notes: 'Resistor in series with cap to ground. Used for noise filtering, audio.' },
        { name: 'High-pass filter (RC)', purpose: 'Pass high frequencies, block low (incl. DC)', formula: 'f_cutoff = 1 / (2π × R × C)', notes: 'Cap in series with resistor to ground. Same cutoff formula, swapped topology.' },
        { name: 'LED with current limit', purpose: 'Light an LED safely', formula: 'R = (V_supply − V_LED) / I_LED', notes: 'V_LED ~2V, I_LED ~10-20 mA. From 5V: R = (5-2)/0.015 = 200Ω → use 220Ω standard.' },
        { name: 'Pull-up / pull-down resistor', purpose: 'Define logic level when switch open', formula: 'Typically 4.7-10 kΩ', notes: 'Pull-up: switch connects to ground; otherwise input reads HIGH. Pull-down: opposite.' },
        { name: 'Bypass capacitor (decoupling)', purpose: 'Suppress noise on power rails', formula: '0.1 µF ceramic near each IC', notes: 'Provides local energy reservoir for fast current demands. CRITICAL for digital circuits.' },
        { name: 'Common-emitter amplifier (BJT)', purpose: 'Voltage amplification', formula: 'Gain ≈ −R_C / R_E (with emitter degen)', notes: 'Classic textbook amp. Inverts signal. Modern use: still common in audio.' },
        { name: 'Inverting op-amp', purpose: 'Amplify (inverted) with precise gain', formula: 'V_out = −R_f / R_in × V_in', notes: 'Negative input, feedback resistor sets gain. Positive input grounded.' },
        { name: 'Non-inverting op-amp', purpose: 'Amplify (in phase) with precise gain', formula: 'V_out = (1 + R_f / R_g) × V_in', notes: 'Positive input is signal. Gain always ≥ 1.' },
        { name: '555 timer (astable)', purpose: 'Generate square wave', formula: 'f = 1.44 / ((R_a + 2R_b) × C)', notes: 'Iconic chip. Two resistors + cap set frequency. Duty cycle depends on R ratio.' },
        { name: 'Voltage regulator (7805)', purpose: 'Constant 5 V output from higher V_in', formula: 'Input >7V, output 5V, drop = V_in - 5', notes: 'Drop × current = heat dissipation. Add bypass caps in + out. Modern switching regs >90% efficient.' }
      ];

      var DIGITAL_LOGIC = [
        { gate: 'AND', symbol: 'D-shape', truth: '1 only if BOTH inputs = 1', formula: 'Y = A · B', uses: 'Permission logic ("OK to proceed if all conditions met")' },
        { gate: 'OR', symbol: 'Curved', truth: '1 if EITHER input = 1', formula: 'Y = A + B', uses: 'Alarm triggers ("alert if any sensor fires")' },
        { gate: 'NOT', symbol: 'Triangle + bubble', truth: 'Inverts input', formula: 'Y = ¬A', uses: 'Active-low signals, complementary signals' },
        { gate: 'NAND', symbol: 'AND + bubble', truth: '0 only if BOTH inputs = 1', formula: 'Y = ¬(A · B)', uses: 'Universal gate — any logic can be built from NAND alone' },
        { gate: 'NOR', symbol: 'OR + bubble', truth: '1 only if BOTH inputs = 0', formula: 'Y = ¬(A + B)', uses: 'Universal gate. RS latch building block.' },
        { gate: 'XOR', symbol: '⊕ in curved', truth: '1 if inputs DIFFER', formula: 'Y = A ⊕ B', uses: 'Adders, parity checking, encryption' },
        { gate: 'XNOR', symbol: 'XOR + bubble', truth: '1 if inputs MATCH', formula: 'Y = ¬(A ⊕ B)', uses: 'Equality detector' }
      ];

      var CIRCUIT_GLOSSARY = [
        { term: 'Voltage (V)', def: 'Electric potential difference. Drives current through a circuit. Measured in volts.' },
        { term: 'Current (I)', def: 'Flow rate of electric charge. Measured in amperes (A = C/s).' },
        { term: 'Resistance (R)', def: 'Opposition to current flow. Measured in ohms (Ω = V/A).' },
        { term: 'Power (P)', def: 'Energy per unit time. Watts (W = J/s = V·A).' },
        { term: 'Charge (Q)', def: 'Quantity of electricity. Coulombs (C). 1 e⁻ = 1.6 × 10⁻¹⁹ C.' },
        { term: 'Capacitance (C)', def: 'Ability to store charge per volt. Farads (F = C/V). Most caps are µF or pF.' },
        { term: 'Inductance (L)', def: 'Resistance to change in current. Henries (H = V·s/A).' },
        { term: 'Impedance (Z)', def: 'AC equivalent of resistance. Complex: includes resistance + reactance.' },
        { term: 'Frequency (f)', def: 'Cycles per second. Hertz (Hz). AC mains: 50 Hz (Europe) or 60 Hz (US).' },
        { term: 'Period (T)', def: 'Time for one cycle. T = 1/f. 60 Hz → 16.67 ms.' },
        { term: 'Ground (GND)', def: 'Reference point for voltage measurement (often 0 V). Earth ground for safety.' },
        { term: 'Open circuit', def: 'Break in the circuit; no current flows. Infinite resistance.' },
        { term: 'Short circuit', def: 'Path with near-zero resistance; very large current. Often unintended; dangerous.' },
        { term: 'Polarity', def: 'Direction of conventional current flow. Some components (electrolytic caps, batteries, diodes) are polarized; reversing damages them.' },
        { term: 'AC (alternating current)', def: 'Current that reverses direction periodically. Used for power distribution (lower transmission losses).' },
        { term: 'DC (direct current)', def: 'Current flowing in one direction. Batteries, USB, electronic devices internally.' },
        { term: 'Multimeter', def: 'Measures V, I, R (and often more). Auto-ranging multimeters pick the right scale automatically.' },
        { term: 'Oscilloscope', def: 'Visualizes voltage vs time. Bandwidth (MHz) is the key spec.' },
        { term: 'Breadboard', def: 'Prototyping board with sockets connected in standard patterns. No soldering required.' },
        { term: 'PCB', def: 'Printed Circuit Board. Permanent platform with copper traces. Cheap to manufacture even in small quantities.' },
        { term: 'Solder', def: 'Low-melting metal alloy that joins components to PCB. Modern: lead-free (SAC305).' },
        { term: 'Datasheet', def: 'Manufacturer document detailing a component\'s electrical, mechanical, and thermal specifications. Always check before designing.' }
      ];

      function expHeader() {
        return h('div', { className: 'mt-6 mb-2 flex items-center justify-between flex-wrap gap-2 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200' },
          h('div', null,
            h('h3', { className: 'text-base font-black text-amber-900' }, '⚡ ' + __alloT('stem.circuit.reference_library_title', 'Circuit Reference Library')),
            h('div', { className: 'text-[0.6875rem] text-amber-700 mt-0.5' }, __alloT('stem.circuit.reference_library_subtitle', 'Interactive references — pick a topic below to explore.'))
          ),
          expSection && h('button', {
            onClick: function() { setExp({ expSection: null }); },
            className: 'transition-colors px-3 py-1 rounded-md text-xs font-bold bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 active:scale-[0.97]'
          }, '✕ ' + __alloT('stem.circuit.close_section', 'Close section'))
        );
      }

      function expTabBar() {
        // 42 circuits/electronics sections grouped into 6 cohesive domains.
        // All IDs preserved. Groups: Fundamentals · Components · Systems &
        // Computing · Power & Energy · Practical & Reference · History &
        // Careers.
        var TAB_GROUPS = [
          { id: 'fundamentals', label: __alloT('stem.circuit.navgroup_fundamentals', 'Fundamentals'), color: 'amber', tabs: [
            { id: 'laws', label: __alloT('stem.circuit.nav_laws', 'Laws + formulas'), icon: 'V=IR' },
            { id: 'units', label: __alloT('stem.circuit.nav_units', 'Units & constants'), icon: '∑' },
            { id: 'sp', label: __alloT('stem.circuit.nav_sp', 'Series vs parallel'), icon: '⇊' },
            { id: 'patterns', label: __alloT('stem.circuit.nav_patterns', 'Common circuits'), icon: '🔌' },
            { id: 'symbols', label: __alloT('stem.circuit.nav_symbols', 'Schematic symbols'), icon: '⊜' },
            { id: 'fields', label: __alloT('stem.circuit.nav_fields', 'E & M fields'), icon: '⚡' },
            { id: 'ohmInquiry', label: __alloT('stem.circuit.nav_ohm_inquiry', 'Ohm Inquiry'), icon: '🔬' }
          ] },
          { id: 'components', label: __alloT('stem.circuit.navgroup_components', 'Components'), color: 'sky', tabs: [
            { id: 'components', label: __alloT('stem.circuit.nav_components', 'Components'), icon: '⏛' },
            { id: 'resistor', label: __alloT('stem.circuit.nav_resistor_colors', 'Resistor colors'), icon: '🎨' },
            { id: 'capacitor', label: __alloT('stem.circuit.nav_capacitors', 'Capacitors'), icon: '⎮⎮' },
            { id: 'inductor', label: __alloT('stem.circuit.nav_inductors', 'Inductors'), icon: '∿∿' },
            { id: 'semicon', label: __alloT('stem.circuit.nav_semiconductors', 'Semiconductors'), icon: '⌐' },
            { id: 'opamp', label: __alloT('stem.circuit.nav_opamps', 'Op-amps'), icon: '▷' },
            { id: 'filters', label: __alloT('stem.circuit.nav_filters', 'Filters'), icon: '⌒' },
            { id: 'sensors', label: __alloT('stem.circuit.nav_sensors', 'Sensors'), icon: '◉' },
            { id: 'actuators', label: __alloT('stem.circuit.nav_actuators', 'Actuators'), icon: '🔧' },
            { id: 'connectors', label: __alloT('stem.circuit.nav_connectors', 'Connectors'), icon: '🔗' }
          ] },
          { id: 'systems', label: __alloT('stem.circuit.navgroup_systems', 'Systems & Computing'), color: 'violet', tabs: [
            { id: 'logic', label: __alloT('stem.circuit.nav_logic', 'Digital logic'), icon: '0/1' },
            { id: 'micro', label: __alloT('stem.circuit.nav_micro', 'Microcontrollers'), icon: '🧠' },
            { id: 'ics', label: __alloT('stem.circuit.nav_ics', 'Common ICs'), icon: '⬚' },
            { id: 'protos', label: __alloT('stem.circuit.nav_protos', 'Comm protocols'), icon: '↔' },
            { id: 'pcb', label: __alloT('stem.circuit.nav_pcb', 'PCB design'), icon: '▦' },
            { id: 'simulation', label: __alloT('stem.circuit.nav_simulation', 'Circuit sim'), icon: '🖥' }
          ] },
          { id: 'power', label: __alloT('stem.circuit.navgroup_power', 'Power & Energy'), color: 'rose', tabs: [
            { id: 'power', label: __alloT('stem.circuit.nav_power', 'Power supplies'), icon: '🔌' },
            { id: 'batteries', label: __alloT('stem.circuit.nav_batteries', 'Battery types'), icon: '🔋' },
            { id: 'energy', label: __alloT('stem.circuit.nav_energy', 'Energy sources'), icon: '⚡' },
            { id: 'motors', label: __alloT('stem.circuit.nav_motors', 'Motors & gens'), icon: '⚙' },
            { id: 'wireless', label: __alloT('stem.circuit.nav_wireless', 'Wireless power'), icon: '📶' },
            { id: 'fuses', label: __alloT('stem.circuit.nav_fuses', 'Fuses + breakers'), icon: '⌧' },
            { id: 'safety', label: __alloT('stem.circuit.nav_safety', 'Safety'), icon: '⚠' }
          ] },
          { id: 'practical', label: __alloT('stem.circuit.navgroup_practical', 'Practical & Reference'), color: 'emerald', tabs: [
            { id: 'standards', label: __alloT('stem.circuit.nav_standards', 'Standards + plugs'), icon: '🔌' },
            { id: 'wire', label: __alloT('stem.circuit.nav_wire', 'Wire gauges'), icon: '〰' },
            { id: 'lights', label: __alloT('stem.circuit.nav_lights', 'Light bulbs'), icon: '💡' },
            { id: 'household_app', label: __alloT('stem.circuit.nav_household_app', 'Appliance watts'), icon: '🏠' },
            { id: 'circuit_lab', label: __alloT('stem.circuit.nav_circuit_lab', 'Lab equipment'), icon: '🔬' },
            { id: 'common_circuits', label: __alloT('stem.circuit.nav_common_circuits', 'Project circuits'), icon: '⚒' },
            { id: 'troubleshoot', label: __alloT('stem.circuit.nav_troubleshoot', 'Troubleshooting'), icon: '🛠' },
            { id: 'glossary', label: __alloT('stem.circuit.nav_glossary', 'Glossary'), icon: '📖' }
          ] },
          { id: 'history', label: __alloT('stem.circuit.navgroup_history', 'History & Careers'), color: 'slate', tabs: [
            { id: 'famous', label: __alloT('stem.circuit.nav_famous', 'History'), icon: '🕰' },
            { id: 'famouscirc', label: __alloT('stem.circuit.nav_famouscirc', 'Famous circuits'), icon: '🎛' },
            { id: 'computers', label: __alloT('stem.circuit.nav_computers', 'Computer history'), icon: '💻' },
            { id: 'world', label: __alloT('stem.circuit.nav_world', 'World electrification'), icon: '🌐' },
            { id: 'careers', label: __alloT('stem.circuit.nav_careers', 'Careers'), icon: '💼' }
, { id: 'poebulb', label: __alloT('stem.circuit.nav_poebulb', 'Predict bulb'), icon: '💡' }
, { id: 'failDx', label: __alloT('stem.circuit.nav_faildx', 'Why did it fail?'), icon: '🛠' }
          ] }
        ];
        function renderBtn(s, accent) {
          var active = expSection === s.id;
          return h('button', {
            key: s.id,
            onClick: function() { setExp({ expSection: active ? null : s.id }); },
            className: 'px-2 py-1 rounded-md text-[0.6875rem] font-bold border transition-colors ' + (active ? 'bg-' + accent + '-600 text-white border-' + accent + '-700' : 'transition-colors bg-white text-slate-700 border-slate-300 hover:bg- active:scale-[0.97]' + accent + 'transition-colors -50 hover:border-' + accent + '-300')
          }, s.icon + ' ' + s.label);
        }
        return h('div', { className: 'mb-3 p-2 rounded-lg bg-slate-50 border border-slate-200 flex flex-col gap-1.5' },
          TAB_GROUPS.map(function(g) {
            return h('div', { key: g.id, role: 'group', 'aria-label': g.label + ' tabs', className: 'flex items-center gap-2 flex-wrap' },
              h('span', { 'aria-hidden': 'true', className: 'text-[0.625rem] font-extrabold tracking-widest uppercase text-' + g.color + '-700 min-w-[120px] text-right pr-1 border-r border-' + g.color + '-200 shrink-0' }, g.label),
              g.tabs.map(function(s) { return renderBtn(s, g.color); })
            );
          })
        );
      }

      function renderLawsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, 'V=IR Core laws + formulas'),
          h('div', { className: 'space-y-2' },
            CIRCUIT_LAWS.map(function(l, i) {
              return h('div', { key: 'l'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, l.name),
                  h('span', { className: 'text-sm font-bold ml-auto px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-mono' }, l.formula)
                ),
                h('div', { className: 'text-[0.6875rem] text-slate-700 mb-1 leading-relaxed' }, l.desc),
                h('div', { className: 'text-[0.6875rem] text-slate-600 italic' }, 'Example: ', l.example)
              );
            })
          )
        );
      }

      function renderComponentsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⏛ Common components'),
          h('div', { className: 'grid gap-2 grid-cols-1 md:grid-cols-2' },
            CIRCUIT_COMPONENTS.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1' },
                  h('span', { className: 'text-base font-black text-amber-700' }, c.symbol),
                  h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, c.name),
                  h('span', { className: 'text-[0.625rem] font-mono ml-auto px-1.5 py-0.5 rounded bg-amber-100 text-amber-800' }, c.units)
                ),
                h('div', { className: 'text-[0.6875rem] text-slate-700 mb-1 leading-relaxed' }, c.role),
                h('div', { className: 'text-[0.625rem] text-slate-600 italic' }, c.colors)
              );
            })
          )
        );
      }

      function renderSpSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⇊ Series vs parallel circuits'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('caption', { className: 'sr-only' }, 'Series and parallel circuit comparison'),
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Aspect', 'Series', 'Parallel'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                SERIES_VS_PARALLEL.map(function(r, i) {
                  return h('tr', { key: 'r'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('th', { scope: 'row', className: 'px-2 py-1 text-left text-slate-800 font-bold' }, r.aspect),
                    h('td', { className: 'px-2 py-1 text-slate-700' }, r.series),
                    h('td', { className: 'px-2 py-1 text-slate-700' }, r.parallel)
                  );
                })
              )
            )
          )
        );
      }

      function renderPatternsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔌 Common circuit patterns'),
          h('div', { className: 'space-y-2' },
            CIRCUIT_PATTERNS.map(function(p, i) {
              return h('div', { key: 'p'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, p.name),
                  h('span', { className: 'text-[0.625rem] font-bold ml-auto px-2 py-0.5 rounded bg-amber-100 text-amber-800' }, p.purpose)
                ),
                h('div', { className: 'text-[0.6875rem] font-mono text-indigo-800 bg-indigo-50 px-2 py-1 rounded mb-1' }, p.formula),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, p.notes)
              );
            })
          )
        );
      }

      function renderLogicSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '0/1 Digital logic gates'),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, 'Every digital circuit is built from logic gates. Combinational logic computes; sequential logic remembers. NAND or NOR alone is functionally complete (can build all others).'),
          h('div', { className: 'space-y-2' },
            DIGITAL_LOGIC.map(function(g, i) {
              return h('div', { key: 'g'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[0.875rem] font-black text-amber-700' }, g.gate),
                  h('span', { className: 'text-[0.6875rem] font-mono ml-auto px-2 py-0.5 rounded bg-amber-100 text-amber-800' }, g.formula)
                ),
                h('div', { className: 'text-[0.6875rem] text-slate-700 mb-1' }, h('strong', null, 'Truth: '), g.truth),
                h('div', { className: 'text-[0.6875rem] text-slate-600 italic' }, 'Uses: ', g.uses)
              );
            })
          )
        );
      }

      function renderSafetySection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚠ Electrical safety'),
          h('div', { className: 'space-y-2' },
            SAFETY_RULES.map(function(s, i) {
              return h('div', { key: 's'+i, className: 'p-3 rounded-lg bg-red-50 border border-red-200' },
                h('div', { className: 'text-[0.75rem] font-black text-red-900 mb-1' }, '🛡 ' + s.rule),
                h('div', { className: 'text-[0.6875rem] text-red-900 leading-relaxed' }, s.detail)
              );
            })
          )
        );
      }

      // ── Cycle 1 of the inquiry-learning study: Predict-Observe-Explain ──
      // Pattern: learner sees a circuit, predicts an objective electrical quantity,
      // then sees the answer with V=IR and P=VI reasoning.
      // reasoning. Productive struggle from explicit pre-commitment.
      var POE_SCENARIOS = [
        {
          id: 's1',
          title: 'One bulb, 1.5 V battery',
          svg: { battery: 1.5, bulbs: [{ R: 5 }], topology: 'simple' },
          predict: { question: 'How much electrical power will the bulb use?', options: ['0 W', '0.11 W', '0.30 W', '0.45 W', 'More than 1 W'] },
          answerIndex: 3,
          explanation: 'Current I = V/R = 1.5 V ÷ 5 Ω = 0.3 A. Power P = V·I = 0.45 W. The circuit uses power as a consistent brightness proxy; perceived brightness in a real bulb also depends on its rating and construction.'
        },
        {
          id: 's2',
          title: 'Two bulbs in SERIES, same battery',
          svg: { battery: 1.5, bulbs: [{ R: 5 }, { R: 5 }], topology: 'series' },
          predict: { question: 'How much power does each bulb use compared with scenario 1?', options: ['The same power', 'One-half as much power', 'One-quarter as much power', 'No power'] },
          answerIndex: 2,
          explanation: 'In series, resistances add: 10 Ω total. Current drops to 0.15 A. Each bulb receives 0.75 V and uses about 0.11 W — one-quarter of scenario 1\'s 0.45 W. Power, rather than an undefined brightness word, is the comparison measured by this model.'
        },
        {
          id: 's3',
          title: 'Two bulbs in PARALLEL, same battery',
          svg: { battery: 1.5, bulbs: [{ R: 5 }, { R: 5 }], topology: 'parallel' },
          predict: { question: 'How much power does each parallel bulb use compared with scenario 1?', options: ['More power', 'The same power', 'One-half as much power', 'One-quarter as much power', 'No power'] },
          answerIndex: 1,
          explanation: 'In parallel, each bulb receives the full 1.5 V, draws 0.3 A, and uses 0.45 W — the same power as the bulb in scenario 1. The battery supplies 0.6 A total, so it drains faster.'
        },
        {
          id: 's4',
          title: 'Swap one bulb for a 1 Ω resistor (in series with a 10 Ω bulb)',
          svg: { battery: 1.5, bulbs: [{ R: 10, isBulb: true }, { R: 1, isBulb: false }], topology: 'series' },
          predict: { question: 'Approximately how much voltage is across the 10 Ω bulb?', options: ['0 V', '0.14 V', '0.75 V', '1.36 V', '1.50 V']  },
          answerIndex: 3,
          explanation: 'Total R = 11 Ω, so I ≈ 0.136 A. Voltage across the 10 Ω bulb is I·R = 1.36 V; voltage across the 1 Ω resistor is about 0.14 V. In a series circuit, voltage divides in proportion to resistance.'
        }
      ];

      function renderPoebulbSection() {
        var state = d2.poeb || { stage: {} };
        function setPoe(patch) {
          setLabToolData(function(prev) {
            var prior = (prev && prev.circuit) || {};
            var pb = Object.assign({}, prior.poeb || { stage: {} }, patch);
            return Object.assign({}, prev, { circuit: Object.assign({}, prior, { poeb: pb }) });
          });
        }
        function updatePoeStage(scenarioId, patch) {
          var nextStage = Object.assign({}, state.stage);
          nextStage[scenarioId] = Object.assign({ picked: null, revealed: false, revision: '', reason: '', complete: false }, nextStage[scenarioId] || {}, patch);
          setPoe({ stage: nextStage });
        }
        var inquiryComplete = Object.keys(state.stage || {}).filter(function(scenarioId) {
          return state.stage[scenarioId] && state.stage[scenarioId].complete === true;
        }).length;
        // Tiny SVG schematic generator — kept lightweight so the lesson stays the focus
        function drawSchematic(scenario) {
          var s = scenario.svg;
          var bulbs = s.bulbs;
          var schematicParts = bulbs.map(function(part, index) {
            return (part.isBulb === false ? 'resistor ' : 'bulb ') + (index + 1) + ', ' + part.R + (part.R === 1 ? ' ohm' : ' ohms');
          }).join('; ');
          var schematicLabel = scenario.title + '. ' + s.battery + ' volt battery with ' + schematicParts + ' in ' + (s.topology === 'simple' ? 'a single-load closed circuit' : s.topology) + '.';
          var svgChildren = [];
          // Battery
          svgChildren.push(h('line', { x1: 20, y1: 50, x2: 20, y2: 70, stroke: '#fbbf24', strokeWidth: 3 }));
          svgChildren.push(h('line', { x1: 14, y1: 53, x2: 26, y2: 53, stroke: '#fbbf24', strokeWidth: 3 }));
          svgChildren.push(h('line', { x1: 17, y1: 67, x2: 23, y2: 67, stroke: '#fbbf24', strokeWidth: 2 }));
          svgChildren.push(h('text', { x: 30, y: 64, fill: '#fbbf24', fontSize: 10, fontWeight: 'bold' }, s.battery + ' V'));
          // Wire connections vary by topology
          if (s.topology === 'simple') {
            svgChildren.push(h('line', { x1: 20, y1: 70, x2: 20, y2: 110, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 20, y1: 110, x2: 180, y2: 110, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 180, y1: 110, x2: 180, y2: 60, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 180, y1: 60, x2: 145, y2: 60, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 20, y1: 50, x2: 95, y2: 50, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 95, y1: 50, x2: 95, y2: 60, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('circle', { cx: 120, cy: 60, r: 14, fill: '#fde047', stroke: '#facc15', strokeWidth: 2 }));
            svgChildren.push(h('text', { x: 120, y: 63, textAnchor: 'middle', fontSize: 9, fill: '#92400e', fontWeight: 'bold' }, bulbs[0].R + 'Ω'));
          } else if (s.topology === 'series') {
            svgChildren.push(h('line', { x1: 20, y1: 70, x2: 20, y2: 110, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 20, y1: 110, x2: 220, y2: 110, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 220, y1: 110, x2: 220, y2: 60, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 220, y1: 60, x2: 195, y2: 60, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 165, y1: 60, x2: 115, y2: 60, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 85, y1: 60, x2: 20, y2: 60, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 20, y1: 60, x2: 20, y2: 50, stroke: '#cbd5e1', strokeWidth: 2 }));
            // bulb 1
            svgChildren.push(h('circle', { cx: 100, cy: 60, r: 14, fill: '#fde047', stroke: '#facc15', strokeWidth: 2 }));
            svgChildren.push(h('text', { x: 100, y: 63, textAnchor: 'middle', fontSize: 9, fill: '#92400e', fontWeight: 'bold' }, bulbs[0].R + 'Ω'));
            // bulb / resistor 2
            if (bulbs[1].isBulb === false) {
              svgChildren.push(h('rect', { x: 165, y: 53, width: 30, height: 14, fill: '#94a3b8', stroke: '#475569', strokeWidth: 2 }));
              svgChildren.push(h('text', { x: 180, y: 63, textAnchor: 'middle', fontSize: 9, fill: 'white', fontWeight: 'bold' }, bulbs[1].R + 'Ω'));
            } else {
              svgChildren.push(h('circle', { cx: 180, cy: 60, r: 14, fill: '#fde047', stroke: '#facc15', strokeWidth: 2 }));
              svgChildren.push(h('text', { x: 180, y: 63, textAnchor: 'middle', fontSize: 9, fill: '#92400e', fontWeight: 'bold' }, bulbs[1].R + 'Ω'));
            }
          } else if (s.topology === 'parallel') {
            // Top + bottom wires
            svgChildren.push(h('line', { x1: 20, y1: 50, x2: 200, y2: 50, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 20, y1: 70, x2: 200, y2: 70, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 100, y1: 50, x2: 100, y2: 38, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 100, y1: 70, x2: 100, y2: 82, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 170, y1: 50, x2: 170, y2: 38, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('line', { x1: 170, y1: 70, x2: 170, y2: 82, stroke: '#cbd5e1', strokeWidth: 2 }));
            svgChildren.push(h('circle', { cx: 100, cy: 28, r: 12, fill: '#fde047', stroke: '#facc15', strokeWidth: 2 }));
            svgChildren.push(h('text', { x: 100, y: 31, textAnchor: 'middle', fontSize: 9, fill: '#92400e', fontWeight: 'bold' }, bulbs[0].R + 'Ω'));
            svgChildren.push(h('circle', { cx: 100, cy: 92, r: 12, fill: '#fde047', stroke: '#facc15', strokeWidth: 2 }));
            svgChildren.push(h('text', { x: 100, y: 95, textAnchor: 'middle', fontSize: 9, fill: '#92400e', fontWeight: 'bold' }, bulbs[1].R + 'Ω'));
            // close circuit via battery
          }
          return h('svg', { viewBox: '0 0 250 130', width: '100%', role: 'img', 'aria-label': schematicLabel, style: { maxWidth: 280, height: 'auto', background: 'var(--allo-stem-deeper, rgba(15,23,42,0.85))', borderRadius: 8, padding: 4 } }, svgChildren);
        }
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-1' }, '💡 Predict, test, and revise with electrical evidence'),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' },
            'Use the labeled voltage and resistance to predict a measurable result ', h('em', null, 'before'), ' revealing the model evidence. Prediction accuracy is not graded; each completed comparison and evidence-based revision earns inquiry credit. Power is this model\'s brightness proxy; real perceived brightness also depends on the bulb.'),
          POE_SCENARIOS.map(function(scenario, i) {
            var stg = Object.assign({ picked: null, revealed: false, revision: '', reason: '', complete: false }, state.stage[scenario.id] || {});
            var reflectionReady = !!stg.revision && String(stg.reason || '').trim().length >= 12;
            return h('div', { key: scenario.id, className: 'mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200' },
              h('div', { className: 'flex items-baseline gap-2 mb-2' },
                h('span', { className: 'text-[0.625rem] font-mono text-amber-700 font-bold' }, '#' + (i + 1)),
                h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, scenario.title)
              ),
              drawSchematic(scenario),
              h('div', { className: 'mt-2 text-[0.6875rem] font-bold text-slate-700' }, scenario.predict.question),
              h('div', { className: 'flex flex-wrap gap-1 mt-1' },
                scenario.predict.options.map(function(opt, oi) {
                  var picked = stg.picked === oi;
                  var revealed = stg.revealed;
                  var correct = scenario.answerIndex === oi;
                  var bg = revealed
                    ? (correct ? 'bg-green-700 text-white border-green-800' : (picked ? 'bg-amber-100 text-amber-900 border-amber-400' : 'bg-white text-slate-500 border-slate-200'))
                    : (picked ? 'bg-amber-200 text-amber-900 border-amber-400' : 'transition-colors bg-white text-slate-600 border-slate-200 hover:bg-amber-50 active:scale-[0.97]');
                  return h('button', {
                    key: oi,
                    type: 'button',
                    disabled: revealed,
                    'aria-disabled': revealed ? 'true' : 'false',
                    onClick: function() {
                      if (revealed) return;
                      updatePoeStage(scenario.id, { picked: oi, revealed: false, revision: '', reason: '', complete: false });
                    },
                    'aria-pressed': picked ? 'true' : 'false',
                    className: 'px-2 py-1 rounded text-[0.6875rem] font-bold border transition-colors ' + bg
                  }, opt);
                })
              ),
              h('div', { className: 'mt-2 flex items-center gap-2' },
                h('button', {
                  type: 'button',
                  disabled: stg.picked == null || stg.revealed,
                  'aria-disabled': stg.picked == null || stg.revealed ? 'true' : 'false',
                  onClick: function() {
                    if (stg.picked == null || stg.revealed) return;
                    updatePoeStage(scenario.id, { picked: stg.picked, revealed: true, revision: '', reason: '', complete: false });
                  },
                  className: 'transition-colors px-3 py-1 rounded-md text-[0.6875rem] font-bold bg-amber-700 text-white hover:bg-amber-800 disabled:opacity-40 disabled:cursor-not-allowed focus:ring-2 focus:ring-amber-400 focus:outline-none active:scale-[0.97]'
                }, stg.revealed ? '✓ Evidence revealed' : 'Reveal model evidence'),
                stg.revealed && h('span', { role: 'status', className: 'text-[0.6875rem] ' + (scenario.answerIndex === stg.picked ? 'text-green-700 font-bold' : 'text-amber-800 font-bold') },
                  scenario.answerIndex === stg.picked ? 'Evidence supported your estimate' : 'The model produced a different result')
              ),
              stg.revealed && h('div', { className: 'mt-2 p-2 rounded bg-amber-50 border-l-4 border-l-amber-400 text-[0.6875rem] text-slate-700 leading-relaxed' },
                h('strong', { className: 'text-amber-900' }, 'Evidence and reasoning: '), __alloT('stem.circuit.' + (scenario.id) + '_explanation', scenario.explanation)),
              stg.revealed && h('fieldset', { className: 'mt-2 rounded-lg border border-violet-500 bg-white p-2', 'data-circuit-poe-revision': scenario.id },
                h('legend', { className: 'px-1 text-[0.625rem] font-black uppercase tracking-wide text-violet-800' }, 'Revise from the evidence'),
                h('p', { className: 'text-[0.625rem] leading-relaxed text-slate-600' }, 'Choose the honest reflection; no option is scored as correct.'),
                h('div', { className: 'mt-1 grid gap-1 sm:grid-cols-3', role: 'radiogroup', 'aria-label': 'How the circuit evidence affected your thinking for scenario ' + (i + 1) },
                  [
                    { id: 'supported', label: 'It strengthened my reasoning' },
                    { id: 'revised', label: 'I need to revise my reasoning' },
                    { id: 'uncertain', label: 'I would run another test' }
                  ].map(function(option) {
                    var selectedRevision = stg.revision === option.id;
                    return h('label', { key: option.id, className: 'flex cursor-pointer gap-1.5 rounded border p-1.5 text-[0.625rem] font-bold ' + (selectedRevision ? 'border-violet-500 bg-violet-50 text-violet-950' : 'border-slate-200 text-slate-700') },
                      h('input', { type: 'radio', name: 'circuit-poe-revision-' + scenario.id, value: option.id, checked: selectedRevision, onChange: function() { updatePoeStage(scenario.id, { revision: option.id, complete: false }); }, className: 'mt-0.5 h-4 w-4 accent-violet-700' }),
                      h('span', null, option.label)
                    );
                  })
                ),
                h('label', { htmlFor: 'circuit-poe-reason-' + scenario.id, className: 'mt-2 block text-[0.625rem] font-black text-violet-900' }, 'What evidence supports your revision?'),
                h('textarea', { id: 'circuit-poe-reason-' + scenario.id, rows: 2, maxLength: 400, value: stg.reason || '', onChange: function(e) { updatePoeStage(scenario.id, { reason: e.target.value.slice(0, 400), complete: false }); }, placeholder: 'The voltage, current, or power evidence shows...', className: 'mt-1 w-full rounded border border-violet-500 bg-white p-2 text-[0.625rem] text-slate-800' }),
                h('button', { type: 'button', disabled: !reflectionReady || stg.complete, 'aria-disabled': reflectionReady && !stg.complete ? 'false' : 'true', onClick: function() { if (!reflectionReady || stg.complete) return; updatePoeStage(scenario.id, { complete: true }); }, className: 'mt-1.5 rounded bg-violet-700 px-2.5 py-1.5 text-[0.625rem] font-black text-white disabled:cursor-not-allowed disabled:opacity-45' }, stg.complete ? 'Inquiry credit recorded' : 'Record comparison and revision')
              )
            );
          }),
          h('div', { className: 'mt-3 p-2 rounded bg-slate-100 border border-slate-200 text-[0.6875rem] text-slate-700 flex flex-wrap items-center gap-2', 'data-circuit-inquiry-credit': 'completion-revision' },
            h('span', null, '🎯'),
            h('strong', null, 'Inquiry progress: ' + inquiryComplete + ' / ' + POE_SCENARIOS.length),
            h('span', { className: 'text-slate-500 ml-2 italic' }, 'Credit comes from comparing evidence and revising your reasoning, regardless of whether the initial prediction matched.')
          )
        );
      }

      // ── Cycle 6 of the inquiry-learning study: MULTI-STEP SOCRATIC REVEAL ──
      // Addresses the recurrent critic complaint across cycles 2-5: "single-sentence reveal,
      // no scaffolded hint progression." When the learner answers wrong, the reveal is not
      // the answer — it's a follow-up sub-question that elicits the missing reasoning step.
      // Only after 2 wrong attempts does the actual explanation surface.
      var FAIL_DX_CASES = [
        {
          id: 'd1',
          title: 'A 9V battery powering a 5V LED — no resistor in the circuit.',
          symptom: 'The LED flashes brightly for ~half a second, then goes dark and stays dark even after reconnecting.',
          rootCause: 'overcurrent_burnout',
          // Level 0: top-level question
          q0: {
            ask: 'What killed the LED?',
            options: [
              { id: 'voltage_too_low', label: 'The battery voltage was too low' },
              { id: 'overcurrent_burnout', label: 'Overcurrent burnt out the LED (no current-limiting resistor)' },
              { id: 'battery_dead', label: 'The battery is dead' },
              { id: 'wires_disconnected', label: 'A wire came loose' }
            ]
          },
          // Level 1: after wrong, dig into the relationship
          q1: {
            ask: 'Right idea to investigate. Now: the LED is rated for 5V at 20mA. The battery puts out 9V. What does Ohm’s law say about current when more voltage is forced through the same resistance?',
            options: [
              { id: 'current_drops', label: 'Current decreases (V↑ → I↓)' },
              { id: 'current_rises', label: 'Current rises (V↑ → I↑)' },
              { id: 'current_constant', label: 'Current stays the same' }
            ]
          },
          // Level 2: scaffold the final reveal
          q2: {
            ask: 'Exactly — current scales with voltage. What’s missing from this circuit that should have prevented the overcurrent?',
            options: [
              { id: 'fuse', label: 'A fuse' },
              { id: 'resistor', label: 'A current-limiting resistor in series with the LED' },
              { id: 'switch', label: 'A switch' }
            ]
          },
          finalExplanation: 'Without a series resistor, the LED sees the full 9V. Ohm’s law: I = (9V − V_LED) / R. With R≈0, current rockets to hundreds of mA — far past the 20mA rating — and the LED dies of thermal damage in milliseconds. A small resistor (e.g., 220Ω) drops the excess voltage and limits current to safe levels.',
          q1CorrectId: 'current_rises',
          q2CorrectId: 'resistor'
        },
        {
          id: 'd2',
          title: 'Two bulbs in series — but one is much dimmer than the other.',
          symptom: 'Bulb A glows brightly. Bulb B (same brand, same rating supposedly) glows so dimly you can barely see it.',
          rootCause: 'mismatched_resistance',
          q0: {
            ask: 'Why is bulb B much dimmer?',
            options: [
              { id: 'mismatched_resistance', label: 'Bulb B has LOWER resistance. In series both bulbs share the same current, and power = I² × R, so the lower-resistance bulb dissipates less power and glows dimmer.' },
              { id: 'farther_from_battery', label: 'Bulb B is farther from the battery — voltage drops over the wire' },
              { id: 'wrong_polarity', label: 'Bulb B is wired backward' },
              { id: 'bulb_dying', label: 'Bulb B is about to burn out' }
            ]
          },
          q1: {
            ask: 'Series circuits share the same CURRENT through every component. If bulb B has different resistance from bulb A, which statement is true?',
            options: [
              { id: 'voltage_splits_by_R', label: 'Voltage across each bulb splits in proportion to its resistance (more R → more V)' },
              { id: 'voltage_equal', label: 'Each bulb gets the same voltage regardless of resistance' },
              { id: 'voltage_inverse', label: 'Voltage splits inversely with resistance (more R → less V)' }
            ]
          },
          q2: {
            ask: 'V_bulb = I × R_bulb, and P = I² × R. Bulb B is the dimmer one. Compared with bulb A, what must be true of bulb B?',
            options: [
              { id: 'B_more_power', label: 'Bulb B dissipates more power than A and should be brighter' },
              { id: 'B_lower_power', label: 'Bulb B has lower resistance, so with the shared current it dissipates less power (P = I² × R) and drops less voltage, which is why it is dimmer' },
              { id: 'same_power', label: 'Same power, same brightness' }
            ]
          },
          finalExplanation: 'In series, the SAME current flows through both bulbs. Power follows P = I²R, so with the current shared, the bulb with the LOWER resistance dissipates LESS power and glows dimmer. Bulb B is dimmer because it has the lower resistance: it also drops less voltage (V = I × R). The higher-resistance bulb (A) drops more voltage AND dissipates more power, so it is brighter. The counterintuitive part of series circuits: with a shared current, the lower-resistance bulb is the dim one, because brightness here tracks power (I²R).',
          q1CorrectId: 'voltage_splits_by_R',
          q2CorrectId: 'B_lower_power'
        },
        {
          id: 'd3',
          title: 'A circuit with a "missing wire" — but the multimeter shows continuity everywhere.',
          symptom: 'Schematic shows three components on a single wire from + to −. Visually you check: all components connected, no breaks in any wire. Yet the bulb doesn’t light, and the multimeter beeps continuity from end to end.',
          rootCause: 'short_circuit',
          q0: {
            ask: 'What’s the most likely fault?',
            options: [
              { id: 'short_circuit', label: 'A short circuit somewhere — current is bypassing the bulb' },
              { id: 'open_circuit', label: 'An open circuit — current can’t flow' },
              { id: 'low_battery', label: 'Battery is dead' },
              { id: 'bulb_burnt', label: 'Bulb is burnt out' }
            ]
          },
          q1: {
            ask: 'Multimeter beeps continuity, which means there IS a complete current path. If the bulb itself isn’t lighting up, what does that tell you about where the current is actually flowing?',
            options: [
              { id: 'current_through_bulb', label: 'Current is flowing through the bulb (just too little)' },
              { id: 'current_bypassing', label: 'Current is taking a path that BYPASSES the bulb' },
              { id: 'no_current', label: 'No current is flowing' }
            ]
          },
          q2: {
            ask: 'Yes — current always takes the path of least resistance. If a stray wire (or solder bridge) connects the two ends of the bulb directly, what does that wire offer compared to the bulb’s filament?',
            options: [
              { id: 'higher_R', label: 'Higher resistance — current still goes through the bulb' },
              { id: 'much_lower_R', label: 'Much lower resistance — current bypasses the bulb almost entirely' },
              { id: 'same_R', label: 'Same resistance — current splits 50/50' }
            ]
          },
          finalExplanation: 'A short circuit across the bulb gives current a near-zero-resistance bypass. By V = IR, almost all current flows through the short (lots of current, almost no voltage drop) and virtually none through the bulb (tiny current, but the bulb still has its full resistance). The multimeter beeps because the overall circuit IS continuous — it just doesn’t test which path the current prefers. Always check for stray solder, frayed wires, or accidental shorts touching across components.',
          q1CorrectId: 'current_bypassing',
          q2CorrectId: 'much_lower_R'
        }
      ];

      function renderFailDxSection() {
        var state = d2.failDx || { cases: {}, score: 0, depthBonus: 0 };
        function setFD(patch) {
          setLabToolData(function(prev) {
            var prior = (prev && prev.circuit) || {};
            var st = Object.assign({}, prior.failDx || state, patch);
            return Object.assign({}, prev, { circuit: Object.assign({}, prior, { failDx: st }) });
          });
        }
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-1' }, '🛠 Why did it fail? — Socratic diagnostics'),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' },
            'Three broken circuits. Diagnose the root cause. If you’re wrong, you don’t get the answer — you get a follow-up question to fill the missing reasoning step. After two wrong attempts you’ll see the explanation. Right on the first try? Bonus points + the explanation.'),
          FAIL_DX_CASES.map(function(c, idx) {
            var st = state.cases[c.id] || { depth: 0, picks: [], resolved: false, firstTryCorrect: false };
            var depth = st.depth || 0;
            var picks = st.picks || [];
            var currentQ = depth === 0 ? c.q0 : (depth === 1 ? c.q1 : c.q2);
            var isAtFinal = st.resolved;
            function handlePick(optionId) {
              var newPicks = picks.concat([{ depth: depth, picked: optionId }]);
              var newCases = Object.assign({}, state.cases);
              if (depth === 0) {
                if (optionId === c.rootCause) {
                  newCases[c.id] = { depth: 0, picks: newPicks, resolved: true, firstTryCorrect: true };
                  setFD({ cases: newCases, score: (state.score || 0) + 1, depthBonus: (state.depthBonus || 0) + 2 });
                } else {
                  newCases[c.id] = { depth: 1, picks: newPicks, resolved: false, firstTryCorrect: false };
                  setFD({ cases: newCases });
                }
              } else if (depth === 1) {
                if (optionId === c.q1CorrectId) {
                  newCases[c.id] = { depth: 2, picks: newPicks, resolved: false, firstTryCorrect: false };
                } else {
                  newCases[c.id] = { depth: 2, picks: newPicks, resolved: false, firstTryCorrect: false };
                }
                setFD({ cases: newCases });
              } else {
                if (optionId === c.q2CorrectId) {
                  newCases[c.id] = { depth: 2, picks: newPicks, resolved: true, firstTryCorrect: false };
                  setFD({ cases: newCases, score: (state.score || 0) + 0.5, depthBonus: (state.depthBonus || 0) + 1 });
                } else {
                  newCases[c.id] = { depth: 2, picks: newPicks, resolved: true, firstTryCorrect: false };
                  setFD({ cases: newCases });
                }
              }
            }
            return h('div', { key: c.id, className: 'mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200' },
              h('div', { className: 'flex items-baseline gap-2 mb-1' },
                h('span', { className: 'text-[0.625rem] font-mono text-amber-700 font-bold' }, '#' + (idx + 1)),
                h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, c.title)
              ),
              h('div', { className: 'text-[0.6875rem] text-slate-700 italic mb-2' }, h('strong', null, 'Observed: '), c.symptom),
              !isAtFinal && h('div', null,
                depth > 0 && h('div', { className: 'mb-1 text-[0.625rem] uppercase tracking-wider text-amber-700 font-bold' }, 'Scaffold question ' + depth + ' of 2'),
                h('div', { className: 'text-[0.6875rem] font-bold text-slate-700 mb-1' }, currentQ.ask),
                h('div', { className: 'flex flex-wrap gap-1 mb-2' },
                  currentQ.options.map(function(opt) {
                    return h('button', {
                      key: opt.id,
                      onClick: function() { handlePick(opt.id); },
                      className: 'transition-colors px-2 py-1 rounded text-[0.6875rem] font-bold border bg-white text-slate-600 border-slate-300 hover:bg-amber-50 hover:border-amber-300 focus:ring-2 focus:ring-amber-400 focus:outline-none active:scale-[0.97]'
                    }, opt.label);
                  })
                ),
                depth > 0 && h('p', { className: 'text-[0.625rem] text-amber-700 italic' }, '(Your previous answer triggered this follow-up. The next reveal will explain.)')
              ),
              isAtFinal && h('div', null,
                h('div', { className: 'p-2 rounded bg-amber-50 border-l-4 border-l-amber-400 mb-2' },
                  h('div', { className: 'text-[0.75rem] font-black text-amber-900 mb-1' },
                    st.firstTryCorrect ? '✓ First-try diagnosis correct! (+1 case score, +2 depth bonus)' : 'Resolved after ' + picks.length + ' attempts (+ partial credit)'
                  ),
                  h('p', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, h('strong', null, 'Root cause + reasoning: '), c.finalExplanation)
                ),
                h('div', { className: 'text-[0.625rem] text-slate-500 italic' },
                  'Your reasoning path: ' + picks.map(function(p) { return p.picked; }).join(' → ')
                )
              )
            );
          }),
          h('div', { className: 'mt-3 p-2 rounded bg-slate-100 border border-slate-200 text-[0.6875rem] text-slate-700 flex items-center gap-2 flex-wrap' },
            h('span', null, '🎯'),
            h('strong', null, 'Case score: ' + (state.score || 0).toFixed(1) + ' / ' + FAIL_DX_CASES.length),
            h('strong', { className: 'ml-2 text-amber-700' }, 'Depth bonus: +' + (state.depthBonus || 0)),
            h('span', { className: 'text-slate-500 ml-2 italic' }, 'Multi-step reveals — wrong answers earn follow-up questions, not just corrections.')
          )
        );
      }

      function renderGlossarySection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📖 Circuit glossary'),
          h('div', { className: 'space-y-1' },
            CIRCUIT_GLOSSARY.map(function(g, i) {
              return h('div', { key: 'g'+i, className: 'p-2 rounded-md bg-slate-50 border-l-4 border-l-amber-400 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-amber-900' }, g.term),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, g.def)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 2 EXPANSION — Additional circuits references (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var RESISTOR_COLORS = [
        { color: 'Black', value: 0, mult: '×1', tol: '' },
        { color: 'Brown', value: 1, mult: '×10', tol: '±1%' },
        { color: 'Red', value: 2, mult: '×100', tol: '±2%' },
        { color: 'Orange', value: 3, mult: '×1k', tol: '' },
        { color: 'Yellow', value: 4, mult: '×10k', tol: '' },
        { color: 'Green', value: 5, mult: '×100k', tol: '±0.5%' },
        { color: 'Blue', value: 6, mult: '×1M', tol: '±0.25%' },
        { color: 'Violet', value: 7, mult: '×10M', tol: '±0.1%' },
        { color: 'Gray', value: 8, mult: '×100M', tol: '±0.05%' },
        { color: 'White', value: 9, mult: '×1G', tol: '' },
        { color: 'Gold', value: '—', mult: '×0.1', tol: '±5%' },
        { color: 'Silver', value: '—', mult: '×0.01', tol: '±10%' },
        { color: 'None', value: '—', mult: '—', tol: '±20%' }
      ];

      var CAPACITOR_TYPES = [
        { type: 'Ceramic', range: 'pF – µF', voltage: 'up to ~5 kV', notes: 'Cheap, small. Non-polarized. Used for decoupling, RF.' },
        { type: 'Electrolytic (aluminum)', range: 'µF – F', voltage: 'low to medium (~600 V)', notes: 'Polarized! Marked + and −. Power supply filtering. Dries out over time.' },
        { type: 'Tantalum', range: '0.1 µF – 100 µF', voltage: 'low (~50 V)', notes: 'Polarized. More stable than aluminum. Don\'t exceed voltage rating — can catch fire.' },
        { type: 'Film (polyester, polypropylene)', range: 'pF – µF', voltage: 'wide range', notes: 'Non-polarized. Stable. Audio, timing circuits.' },
        { type: 'Mica', range: 'pF – nF', voltage: 'high', notes: 'Very stable. RF circuits, oscillators.' },
        { type: 'Supercapacitor (EDLC)', range: '0.1 F – kF', voltage: 'low (~2.7 V per cell)', notes: 'Stores enormous energy. Backup power, regenerative braking, KERS in F1.' }
      ];

      var CAPACITOR_FORMULAS = [
        { name: 'Charge', formula: 'Q = C·V', plain: 'Total charge stored = capacitance × voltage.' },
        { name: 'Energy', formula: 'E = ½·C·V²', plain: 'Energy in joules stored on a charged cap.' },
        { name: 'Parallel combination', formula: 'C_total = C₁ + C₂ + ...', plain: 'Capacitors in parallel ADD (opposite of resistors).' },
        { name: 'Series combination', formula: '1/C_total = 1/C₁ + 1/C₂ + ...', plain: 'Capacitors in series — reciprocal sum (opposite of resistors).' },
        { name: 'RC time constant', formula: 'τ = R·C', plain: 'After τ, capacitor charged to ~63% of supply voltage. ~5τ → fully charged.' },
        { name: 'Impedance (AC)', formula: 'X_C = 1/(2π·f·C)', plain: 'Impedance decreases with frequency. Caps block DC, pass AC.' }
      ];

      var INDUCTOR_NOTES = [
        { topic: 'What it does', detail: 'Stores energy in a magnetic field. Resists changes in current (Lenz\'s law).' },
        { topic: 'Henry (H)', detail: 'Unit: 1 H = 1 V·s/A. Typical values: μH (radios) to H (transformers).' },
        { topic: 'Voltage formula', detail: 'V = L·(di/dt). Sudden current change → big voltage spike.' },
        { topic: 'Energy stored', detail: 'E = ½·L·I². Like ½CV² but for inductors.' },
        { topic: 'Series', detail: 'L_total = L₁ + L₂ + ... (like resistors).' },
        { topic: 'Parallel', detail: '1/L_total = 1/L₁ + 1/L₂ + ... (like resistors).' },
        { topic: 'RL time constant', detail: 'τ = L/R. Current grows to ~63% after τ seconds.' },
        { topic: 'Impedance (AC)', detail: 'X_L = 2π·f·L. Increases with frequency — opposite of capacitors.' },
        { topic: 'Resonance', detail: 'LC circuit resonates at f₀ = 1/(2π·√(LC)). Used in radio tuners.' },
        { topic: 'Real-world: transformers', detail: 'Two coupled inductors. V₂/V₁ = N₂/N₁ (turns ratio). Step up or step down AC voltage.' },
        { topic: 'Real-world: ignition coil', detail: 'Stores energy in primary, releases to plug via collapsing field — 20,000 V+ spark.' },
        { topic: 'Real-world: switching power supplies', detail: 'Buck/boost converters use inductors to efficiently change DC voltage.' }
      ];

      var SEMICONDUCTORS = [
        { device: 'Diode', symbol: '▷|', behavior: 'Conducts in one direction (anode → cathode); blocks the other.', use: 'Rectifiers, signal demodulation, reverse-polarity protection. ~0.7 V forward drop (Si).' },
        { device: 'LED (light-emitting diode)', symbol: '▷| with arrows', behavior: 'Diode that emits photons when forward biased. Voltage drop depends on color (red ~1.8 V, blue ~3.3 V).', use: 'Indicators, lighting, displays.' },
        { device: 'Zener diode', symbol: '▷ǁ', behavior: 'Breaks down at a specific reverse voltage (Vz). Used in reverse mode.', use: 'Voltage references, regulation.' },
        { device: 'Schottky diode', symbol: '▷| with hooks', behavior: 'Metal-semiconductor junction. Low forward drop (~0.3 V), fast switching.', use: 'High-efficiency rectifiers, RF.' },
        { device: 'BJT (NPN)', symbol: 'three terminals', behavior: 'Base current controls collector→emitter current. Active when V_BE ≈ 0.7 V.', use: 'Amplifiers, switches. Current gain (β or h_FE) typically 50-300.' },
        { device: 'BJT (PNP)', symbol: 'three terminals (arrow in)', behavior: 'Complement of NPN. Current flows emitter→collector.', use: 'High-side switching, complementary pairs.' },
        { device: 'MOSFET (N-channel)', symbol: 'three terminals + gate insulated', behavior: 'Gate voltage controls drain-source channel. Very high input impedance.', use: 'Modern logic (CMOS), power switching. Used in nearly every integrated circuit.' },
        { device: 'MOSFET (P-channel)', symbol: 'three terminals (complementary)', behavior: 'Complement of N-channel.', use: 'Paired with N-channel for CMOS logic.' },
        { device: 'JFET', symbol: 'three terminals', behavior: 'Junction FET. Depletion-mode (normally ON).', use: 'High-impedance amplifiers, oscillators. Less common today than MOSFETs.' },
        { device: 'IGBT', symbol: 'BJT-MOSFET hybrid', behavior: 'MOSFET gate + BJT-like output. High-power switching.', use: 'EV inverters, induction cookers, welders.' },
        { device: 'Thyristor (SCR)', symbol: 'four-layer device', behavior: 'Once triggered, stays on until current drops to zero.', use: 'AC power control, motor control.' },
        { device: 'Triac', symbol: 'bidirectional thyristor', behavior: 'Like SCR but works in both directions.', use: 'Light dimmers, AC motor speed control.' }
      ];

      var OPAMP_CONFIGS = [
        { name: 'Voltage follower (buffer)', gain: '1', use: 'Impedance matching. Output exactly tracks input. No loading on the source.' },
        { name: 'Inverting amplifier', gain: '−R_f/R_in', use: 'Inverts signal, scales by ratio of feedback to input resistor.' },
        { name: 'Non-inverting amplifier', gain: '1 + R_f/R_g', use: 'Same phase as input, gain always ≥ 1.' },
        { name: 'Summing amplifier', gain: '−(V₁/R₁ + V₂/R₂ + ...)·R_f', use: 'Add multiple signals (with optional scaling). Used in audio mixers.' },
        { name: 'Difference amplifier', gain: '(V₂ − V₁) × R_f/R_in', use: 'Subtract two signals. Sensor differential measurements.' },
        { name: 'Integrator', gain: '−1/(RC) ∫', use: 'Output = time-integral of input. Triangle from square wave.' },
        { name: 'Differentiator', gain: '−RC × d/dt', use: 'Output ∝ rate of change. Noisy in practice without filtering.' },
        { name: 'Comparator', gain: '∞ (open loop)', use: 'Output saturates high or low. Used for threshold detection.' },
        { name: 'Schmitt trigger', gain: 'comparator with hysteresis', use: 'Cleans up noisy signals. Two thresholds (rising vs falling).' },
        { name: 'Instrumentation amp', gain: '1 + 2R/R_gain', use: 'High input impedance differential amp. Strain gauges, biomedical sensors.' }
      ];

      var FILTERS = [
        { type: 'Passive RC low-pass', cutoff: 'f_c = 1/(2π·RC)', behavior: 'Passes DC + low frequencies; attenuates high.', use: 'Anti-aliasing before ADC. Smoothing.' },
        { type: 'Passive RC high-pass', cutoff: 'f_c = 1/(2π·RC)', behavior: 'Passes high frequencies; blocks DC.', use: 'AC coupling (block DC offset). DC blocker for speakers.' },
        { type: 'LC bandpass', cutoff: 'centered on resonance', behavior: 'Passes a narrow frequency band.', use: 'Radio receiver tuning.' },
        { type: 'LC band-reject (notch)', cutoff: 'centered on resonance', behavior: 'Blocks a narrow band.', use: 'Remove 50/60 Hz mains hum.' },
        { type: 'Active op-amp low-pass', cutoff: 'designed', behavior: 'Sharper rolloff than passive. Can have gain.', use: 'Audio filters, signal conditioning.' },
        { type: 'Butterworth filter', cutoff: 'designed', behavior: 'Maximally flat passband.', use: 'When passband flatness matters.' },
        { type: 'Chebyshev filter', cutoff: 'designed', behavior: 'Steeper roll-off with passband ripple.', use: 'When sharp transition matters more than ripple.' },
        { type: 'Bessel filter', cutoff: 'designed', behavior: 'Maximally flat group delay (linear phase).', use: 'Audio. Pulse waveform integrity.' },
        { type: 'Digital FIR/IIR', cutoff: 'designed', behavior: 'Implemented in software/DSP.', use: 'Modern audio, comms, sensor data. Linear-phase FIR is unconditionally stable.' }
      ];

      var POWER_SUPPLIES = [
        { type: 'Linear regulator', efficiency: '~30-60%', notes: 'Burns off excess voltage as heat. Quiet output. LM7805, LM317 classics.' },
        { type: 'Switching regulator (buck)', efficiency: '~85-95%', notes: 'Steps voltage DOWN. PWM + inductor.' },
        { type: 'Switching regulator (boost)', efficiency: '~85-95%', notes: 'Steps voltage UP. Single-cell devices that need 5 V from 1.5 V.' },
        { type: 'Switching regulator (buck-boost)', efficiency: '~80-92%', notes: 'Can step up or down. Output can be inverted in some topologies.' },
        { type: 'Flyback converter', efficiency: '~75-90%', notes: 'Isolated. Common in laptop chargers and most low-power wall warts.' },
        { type: 'Forward converter', efficiency: '~75-90%', notes: 'Like flyback but transformer stores no energy. Better for medium power.' },
        { type: 'Half/full-bridge converter', efficiency: '~85-95%', notes: 'High-power. Server power supplies, EV chargers.' },
        { type: 'Charge pump', efficiency: '~75-95%', notes: 'No inductor — uses caps to multiply voltage. Common in chips that need internal high voltage from low-V supply.' },
        { type: 'Linear AC transformer', efficiency: 'varies', notes: 'Heavy, big. Was standard before switching supplies took over. Still used in audio for low noise.' }
      ];

      var MOTORS_GENERATORS = [
        { type: 'DC brushed motor', use: 'Toys, small fans, drills', notes: 'Commutator + brushes reverse current. Simple, cheap. Brushes wear out.' },
        { type: 'DC brushless (BLDC)', use: 'Drones, EVs, computer fans', notes: 'Electronic commutation. No brush wear. Higher efficiency.' },
        { type: 'AC induction motor', use: 'Most industrial motors, EV traction', notes: 'Workhorse motor. Rotor follows rotating stator field. Tesla invented (1888).' },
        { type: 'AC synchronous motor', use: 'High-precision, generators in power plants', notes: 'Rotor rotates exactly with stator field. Used in clocks, large industrial.' },
        { type: 'Stepper motor', use: 'Printers, CNC, 3D printers', notes: 'Steps discrete angles per pulse. Open-loop position control without feedback.' },
        { type: 'Servo motor', use: 'Robotics, RC vehicles', notes: 'Motor + feedback + controller. Precise position/speed.' },
        { type: 'Linear motor', use: 'Maglev trains, CNC tables', notes: 'Force in straight line, no rotation. Same physics as rotary unrolled flat.' },
        { type: 'Generator (alternator)', use: 'Power plants, cars', notes: 'Mechanical → electrical. Faraday\'s law: changing magnetic flux induces voltage.' },
        { type: 'Piezo motor', use: 'Microscopes, camera lenses', notes: 'No magnets. Tiny ultrasonic vibrations move slider. Very precise + quiet.' }
      ];

      var FIELD_NOTES = [
        { topic: 'Electric field (E)', detail: 'Units V/m. Force per unit charge: F = qE. Points from + to − charge.' },
        { topic: 'Magnetic field (B)', detail: 'Units tesla (T) or gauss (1 T = 10,000 G). Force on moving charge: F = qv×B.' },
        { topic: 'Coulomb\'s law', detail: 'F = k·q₁·q₂/r². k ≈ 9×10⁹ N·m²/C². Inverse-square — same form as gravity.' },
        { topic: 'Gauss\'s law', detail: 'Total electric flux through closed surface = enclosed charge / ε₀.' },
        { topic: 'Ampère\'s law', detail: 'Line integral of B around closed loop = μ₀ × enclosed current.' },
        { topic: 'Faraday\'s law', detail: 'EMF = −dΦ_B/dt. Changing magnetic flux induces voltage. Basis of generators, transformers.' },
        { topic: 'Lenz\'s law', detail: 'Induced current opposes the change that caused it (negative sign in Faraday).' },
        { topic: 'Right-hand rule', detail: 'For B from current: thumb in current direction, fingers curl in B direction. For F on charge: thumb F, index v, middle B (orthogonal).' },
        { topic: 'Maxwell\'s equations', detail: 'Four equations completely describe classical electromagnetism. Predict EM waves at c.' },
        { topic: 'Permittivity (ε₀)', detail: '8.854×10⁻¹² F/m. Determines E-field strength.' },
        { topic: 'Permeability (μ₀)', detail: '4π×10⁻⁷ T·m/A. Determines B-field strength.' },
        { topic: 'Speed of light', detail: 'c = 1/√(ε₀·μ₀) ≈ 3×10⁸ m/s. Maxwell\'s amazing derivation.' }
      ];

      var WIRELESS_POWER = [
        { type: 'Inductive coupling (Qi standard)', range: '~1 cm', efficiency: '~60-80%', use: 'Phone wireless charging. Two coils, mutual inductance.' },
        { type: 'Resonant inductive coupling', range: '~10s of cm', efficiency: '~50-70%', use: 'WiTricity, mid-range wireless power.' },
        { type: 'Radio frequency (RF) harvesting', range: 'meters', efficiency: '< 10%', use: 'Powering tiny RFID tags. Very low power.' },
        { type: 'Microwave power transmission', range: 'km (line of sight)', efficiency: '~50%', use: 'Concept for space solar power. Demonstrated experimentally.' },
        { type: 'Laser power transmission', range: 'km', efficiency: '~30-50%', use: 'Powering drones, UAVs in flight. Direct beam — needs line-of-sight.' },
        { type: 'Capacitive coupling', range: 'mm-cm', efficiency: 'high (short range)', use: 'Used for some implantable devices. Less common than inductive.' }
      ];

      var UNITS_CONSTANTS = [
        { quantity: 'Charge (Q)', unit: 'coulomb (C)', notes: '1 C = 6.24×10¹⁸ electrons. AA battery delivers ~0.5 C/sec at 0.5 A.' },
        { quantity: 'Current (I)', unit: 'ampere (A)', notes: '1 A = 1 C/sec. Lethal current threshold: ~100 mA through chest.' },
        { quantity: 'Voltage (V)', unit: 'volt (V)', notes: '1 V = 1 J/C. AA: 1.5 V. Mains: 120/240 V. Tesla coil: kV-MV.' },
        { quantity: 'Resistance (R)', unit: 'ohm (Ω)', notes: '1 Ω = 1 V/A. Human skin (dry): ~100 kΩ. Wet: ~1 kΩ — much more dangerous.' },
        { quantity: 'Conductance (G)', unit: 'siemens (S)', notes: '1 S = 1 / Ω. Used in some calculations (admittance).' },
        { quantity: 'Power (P)', unit: 'watt (W)', notes: '1 W = 1 J/s = 1 V·A. Light bulb: ~10 W (LED). Hair dryer: ~1500 W.' },
        { quantity: 'Energy (E)', unit: 'joule (J), kWh', notes: '1 kWh = 3.6×10⁶ J. US household: ~30 kWh/day.' },
        { quantity: 'Capacitance (C)', unit: 'farad (F)', notes: '1 F is huge — most caps are µF, nF, pF.' },
        { quantity: 'Inductance (L)', unit: 'henry (H)', notes: 'Big in transformers; mH-µH in RF.' },
        { quantity: 'Frequency (f)', unit: 'hertz (Hz)', notes: 'Cycles per second. Mains: 50 Hz (most world) or 60 Hz (Americas).' },
        { quantity: 'Magnetic flux (Φ)', unit: 'weber (Wb)', notes: '1 Wb = 1 V·s. Voltage induced when flux changes.' },
        { quantity: 'Magnetic flux density (B)', unit: 'tesla (T)', notes: 'Earth\'s field: ~50 µT. MRI: 1.5-7 T. Strongest lab magnets: ~45 T continuous.' },
        { quantity: 'Elementary charge (e)', unit: '1.602×10⁻¹⁹ C', notes: 'Smallest unit of free charge.' },
        { quantity: 'Electron mass', unit: '9.109×10⁻³¹ kg', notes: '1/1836 of proton mass.' },
        { quantity: 'Planck constant (h)', unit: '6.626×10⁻³⁴ J·s', notes: 'Quantum of action. Connects energy + frequency: E = hf.' },
        { quantity: 'Boltzmann constant (k_B)', unit: '1.381×10⁻²³ J/K', notes: 'Connects temperature + energy. Thermal voltage at 300 K: ~26 mV.' }
      ];

      var ELECTRICITY_HISTORY = [
        { year: '1600', who: 'William Gilbert', what: 'Coined "electricity" (Latin: electricus, "like amber"). Distinguished electricity from magnetism.' },
        { year: '1745', who: 'von Kleist + van Musschenbroek', what: 'Leyden jar — first capacitor. Stored electrical charge.' },
        { year: '1752', who: 'Benjamin Franklin', what: 'Kite experiment showed lightning is electricity. Invented lightning rod.' },
        { year: '1799', who: 'Alessandro Volta', what: 'Invented voltaic pile — first chemical battery. "Voltage" named for him.' },
        { year: '1820', who: 'Hans Christian Ørsted', what: 'Showed current creates magnetic field. United electricity + magnetism.' },
        { year: '1827', who: 'Georg Ohm', what: 'Ohm\'s law: V = IR.' },
        { year: '1831', who: 'Michael Faraday', what: 'Electromagnetic induction. Basis for generators + transformers.' },
        { year: '1864', who: 'James Clerk Maxwell', what: 'Maxwell\'s equations unified electromagnetism. Predicted light as EM wave.' },
        { year: '1879', who: 'Thomas Edison', what: 'Practical incandescent bulb. Built DC power systems.' },
        { year: '1888', who: 'Nikola Tesla', what: 'Practical AC induction motor + polyphase power systems. AC won "War of the Currents".' },
        { year: '1897', who: 'J.J. Thomson', what: 'Discovered the electron. First subatomic particle.' },
        { year: '1947', who: 'Bardeen, Brattain, Shockley (Bell Labs)', what: 'Invented the transistor. Started semiconductor revolution.' },
        { year: '1958', who: 'Jack Kilby + Robert Noyce', what: 'Integrated circuit — multiple transistors on one chip.' },
        { year: '1971', who: 'Intel', what: 'Intel 4004 — first commercial microprocessor (2,300 transistors).' },
        { year: '2010s+', who: 'Many', what: 'Renewable + storage scale rapidly. Lithium-ion batteries → EVs at scale.' }
      ];

      function renderResistorSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎨 Resistor color code'),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, 'For 4-band resistors: first 2 bands = digits, 3rd = multiplier, 4th = tolerance. Mnemonic: "Big Boys Race Our Young Girls But Violet Generally Wins".'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('caption', { className: 'sr-only' }, 'Resistor color code reference'),
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Color', 'Digit', 'Multiplier', 'Tolerance'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                RESISTOR_COLORS.map(function(c, i) {
                  return h('tr', { key: 'c'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('th', { scope: 'row', className: 'px-2 py-1 text-left font-bold text-slate-800' }, c.color),
                    h('td', { className: 'px-2 py-1 font-mono text-amber-700 font-bold' }, c.value),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700' }, c.mult),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-600' }, c.tol)
                  );
                })
              )
            )
          ),
          h('div', { className: 'mt-3 p-2.5 rounded bg-amber-50 border border-amber-200 text-[0.6875rem] text-amber-900' },
            h('strong', null, 'Example: '), 'Red-Red-Brown-Gold = 22 × 10 = 220 Ω, ±5% tolerance.'
          )
        );
      }

      function renderCapacitorSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⎮⎮ Capacitors'),
          h('div', { className: 'mb-3' },
            h('h5', { className: 'text-[0.75rem] font-bold text-slate-700 mb-1' }, 'Common types'),
            h('div', { className: 'space-y-1' },
              CAPACITOR_TYPES.map(function(c, i) {
                return h('div', { key: 'c'+i, className: 'p-2 rounded bg-slate-50 border border-slate-200' },
                  h('div', { className: 'flex items-baseline gap-2 mb-0.5 flex-wrap' },
                    h('span', { className: 'text-[0.6875rem] font-black text-slate-800' }, c.type),
                    h('span', { className: 'text-[0.625rem] font-mono text-amber-700 ml-auto' }, c.range),
                    h('span', { className: 'text-[0.625rem] font-mono text-slate-600' }, c.voltage)
                  ),
                  h('div', { className: 'text-[0.625rem] text-slate-700' }, c.notes)
                );
              })
            )
          ),
          h('h5', { className: 'text-[0.75rem] font-bold text-slate-700 mb-1' }, 'Key formulas'),
          h('div', { className: 'space-y-1' },
            CAPACITOR_FORMULAS.map(function(f, i) {
              return h('div', { key: 'f'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-amber-400 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                  h('span', { className: 'text-[0.6875rem] font-black text-slate-800' }, f.name),
                  h('span', { className: 'text-[0.6875rem] font-mono ml-auto text-amber-700 font-bold' }, f.formula)
                ),
                h('div', { className: 'text-[0.625rem] text-slate-700' }, f.plain)
              );
            })
          )
        );
      }

      function renderInductorSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '∿∿ Inductors'),
          h('div', { className: 'space-y-1' },
            INDUCTOR_NOTES.map(function(n, i) {
              return h('div', { key: 'n'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-amber-400 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-amber-900 mb-0.5' }, n.topic),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, n.detail)
              );
            })
          )
        );
      }

      function renderSemiconSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⌐ Semiconductor devices'),
          h('div', { className: 'space-y-2' },
            SEMICONDUCTORS.map(function(s, i) {
              return h('div', { key: 's'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, s.device),
                  h('span', { className: 'text-[0.625rem] font-mono text-amber-700 ml-auto px-2 py-0.5 rounded bg-amber-100' }, s.symbol)
                ),
                h('div', { className: 'text-[0.6875rem] text-slate-700 mb-1' }, React.createElement('strong', null, 'Behavior: '), s.behavior),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, React.createElement('strong', null, 'Use: '), s.use)
              );
            })
          )
        );
      }

      function renderOpampSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '▷ Op-amp configurations'),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, 'Op-amp = operational amplifier. High gain (~100,000+), high input impedance, low output impedance. Used with feedback for predictable behavior.'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('caption', { className: 'sr-only' }, 'Operational amplifier configurations'),
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Configuration', 'Gain', 'Use'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                OPAMP_CONFIGS.map(function(o, i) {
                  return h('tr', { key: 'o'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('th', { scope: 'row', className: 'px-2 py-1 text-left font-bold text-slate-800' }, o.name),
                    h('td', { className: 'px-2 py-1 font-mono text-amber-700 font-bold' }, o.gain),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[0.625rem]' }, o.use)
                  );
                })
              )
            )
          )
        );
      }

      function renderFiltersSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⌒ Filters'),
          h('div', { className: 'space-y-2' },
            FILTERS.map(function(f, i) {
              return h('div', { key: 'f'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, f.type),
                  h('span', { className: 'text-[0.625rem] font-mono text-amber-700 ml-auto' }, f.cutoff)
                ),
                h('div', { className: 'text-[0.6875rem] text-slate-700 mb-1' }, React.createElement('strong', null, 'Behavior: '), f.behavior),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, React.createElement('strong', null, 'Use: '), f.use)
              );
            })
          )
        );
      }

      function renderPowerSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔋 Power supply topologies'),
          h('div', { className: 'space-y-2' },
            POWER_SUPPLIES.map(function(p, i) {
              return h('div', { key: 'p'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, p.type),
                  h('span', { className: 'text-[0.625rem] font-mono text-amber-700 ml-auto px-2 py-0.5 rounded bg-amber-100 font-bold' }, p.efficiency)
                ),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, p.notes)
              );
            })
          )
        );
      }

      function renderMotorsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚙ Motors & generators'),
          h('div', { className: 'space-y-2' },
            MOTORS_GENERATORS.map(function(m, i) {
              return h('div', { key: 'm'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-slate-800 mb-1' }, m.type),
                h('div', { className: 'text-[0.625rem] text-amber-700 italic mb-1' }, '→ ' + m.use),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, m.notes)
              );
            })
          )
        );
      }

      function renderFieldsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚡ Electric & magnetic fields'),
          h('div', { className: 'space-y-1' },
            FIELD_NOTES.map(function(n, i) {
              return h('div', { key: 'n'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-amber-400 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-amber-900 mb-0.5' }, n.topic),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, n.detail)
              );
            })
          )
        );
      }

      function renderWirelessSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '📶 Wireless power transmission'),
          h('div', { className: 'space-y-2' },
            WIRELESS_POWER.map(function(w, i) {
              return h('div', { key: 'w'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, w.type),
                  h('span', { className: 'text-[0.625rem] font-mono text-amber-700' }, 'Range: ' + w.range),
                  h('span', { className: 'text-[0.625rem] font-mono text-slate-600' }, 'η: ' + w.efficiency)
                ),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, w.use)
              );
            })
          )
        );
      }

      function renderUnitsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '∑ Units & constants'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('caption', { className: 'sr-only' }, 'Electrical units and constants'),
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Quantity', 'Unit', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                UNITS_CONSTANTS.map(function(u, i) {
                  return h('tr', { key: 'u'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('th', { scope: 'row', className: 'px-2 py-1 text-left font-bold text-slate-800' }, u.quantity),
                    h('td', { className: 'px-2 py-1 font-mono text-amber-700 font-bold' }, u.unit),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, u.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderFamousSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🕰 History of electricity & electronics'),
          h('div', { className: 'space-y-2' },
            ELECTRICITY_HISTORY.map(function(e, i) {
              return h('div', { key: 'e'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-amber-400 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-0.5' },
                  h('span', { className: 'text-[0.625rem] font-mono text-amber-700 font-bold' }, e.year),
                  h('span', { className: 'text-[0.75rem] font-black text-amber-900' }, e.who)
                ),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, e.what)
              );
            })
          )
        );
      }

      function renderOhmInquirySection() {
        var iq = d2.ohmInquiry || { voltage: 9, resistance: 100, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
        function setIQ(patch) { setExp({ ohmInquiry: Object.assign({}, iq, patch) }); }
        function setKey(k, v) { var p = {}; p[k] = v; setIQ(p); }
        var current = iq.voltage / Math.max(0.01, iq.resistance); // A
        var power = iq.voltage * current; // W
        var mA = current * 1000;
        // discrete safety state
        var state = power < 0.25 ? 'tiny' : power < 1 ? 'lowpower' : power < 5 ? 'midpower' : power < 25 ? 'hot' : 'dangerous';
        var sm = ({
          tiny: { label: 'Tiny load', color: '#22d3ee', bg: '#0a1f2e', border: '#0891b2', desc: 'Sub-watt. Anything from a quarter-watt resistor will handle this fine.' },
          lowpower: { label: 'Low power', color: '#4ade80', bg: '#0a2e1a', border: '#16a34a', desc: 'Up to ~1 W. Use a half-watt resistor or larger. Battery-friendly.' },
          midpower: { label: 'Mid power', color: '#facc15', bg: '#2a2410', border: '#eab308', desc: '1–5 W. Resistor will warm; consider 5 W component or heatsink.' },
          hot: { label: 'Hot', color: '#fb923c', bg: '#2a1a0a', border: '#ea580c', desc: '5–25 W. Resistor will get hot enough to burn skin. Mount on heatsink.' },
          dangerous: { label: 'Dangerous', color: '#f87171', bg: '#2a0a0a', border: '#dc2626', desc: '>25 W in a small resistor will smoke or fail. Redesign to limit current.' }
        })[state];
        // SVG: linear I vs R curve at current V
        var rs = [];
        for (var r = 1; r <= 1000; r += 25) { rs.push(r); }
        var pts = rs.map(function(r) {
          var i = iq.voltage / r;
          var x = (r / 1000) * 280 + 30;
          var y = 130 - Math.min(120, i * 100);
          return x + ',' + y;
        }).join(' ');
        var hereX = (Math.min(1000, iq.resistance) / 1000) * 280 + 30;
        var hereY = 130 - Math.min(120, current * 100);
        return h('div', { className: 'rounded-xl p-4', style: { background: sm.bg, border: '1px solid ' + sm.border, color: '#e8f0f5' } },
          h('h3', { style: { margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: sm.color, textTransform: 'uppercase', letterSpacing: 1 } }, '🔬 Ohm Inquiry — V/I/R/P Discovery'),
          h('p', { style: { margin: '0 0 8px', fontSize: 11, opacity: 0.85, lineHeight: 1.4 } }, 'Set voltage and resistance, then observe where dissipation moves from harmless to component-damaging. The safety band updates live; record a hypothesis or pattern you notice.'),
          h('div', { style: { display: 'inline-block', padding: '4px 10px', borderRadius: 999, background: sm.color, color: '#000', fontSize: 11, fontWeight: 800, marginBottom: 6 } }, sm.label),
          h('p', { style: { margin: '0 0 10px', fontSize: 11, opacity: 0.8 } }, sm.desc),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 10 } },
            [
              { label: 'Current', val: (mA >= 1 ? mA.toFixed(1) + ' mA' : (mA * 1000).toFixed(0) + ' µA') },
              { label: 'Power', val: power.toFixed(3) + ' W' },
              { label: 'Ohm check', val: (iq.voltage).toFixed(2) + 'V = ' + current.toFixed(3) + 'A × ' + iq.resistance + 'Ω' }
            ].map(function(m) {
              return h('div', { key: m.label, style: { padding: 6, borderRadius: 4, background: 'var(--allo-stem-deeper, #0a0a1a)', border: '1px solid ' + sm.border, textAlign: 'center' } },
                h('div', { style: { fontSize: 9, opacity: 0.6 } }, m.label),
                h('div', { style: { fontSize: 11, fontWeight: 700, color: sm.color, fontFamily: 'monospace' } }, m.val)
              );
            })
          ),
          h('svg', { width: '100%', height: 160, viewBox: '0 0 320 160', role: 'img', 'aria-label': 'Ohm inquiry current-versus-resistance graph at ' + iq.voltage + ' volts. Current decreases as resistance increases. Current point: ' + iq.resistance + ' ohms, ' + current.toFixed(3) + ' amps, ' + power.toFixed(3) + ' watts; dissipation state: ' + sm.label + '.', style: { background: 'var(--allo-stem-deeper, #0a0a1a)', borderRadius: 6, marginBottom: 10 } },
            h('line', { x1: 30, y1: 130, x2: 310, y2: 130, stroke: '#1e293b' }),
            h('line', { x1: 30, y1: 10, x2: 30, y2: 130, stroke: '#1e293b' }),
            [0, 250, 500, 750, 1000].map(function(r, i) { return h('text', { key: 'rx' + i, x: 30 + (r / 1000) * 280, y: 145, fill: '#64748b', fontSize: 8, textAnchor: 'middle' }, r + 'Ω'); }),
            [0, 0.3, 0.6, 0.9, 1.2].map(function(i, j) { return h('text', { key: 'iy' + j, x: 24, y: 132 - i * 100, fill: '#64748b', fontSize: 8, textAnchor: 'end' }, i + 'A'); }),
            h('polyline', { points: pts, fill: 'none', stroke: sm.color, strokeWidth: 1.5, opacity: 0.7 }),
            h('circle', { cx: hereX, cy: hereY, r: 5, fill: sm.color, stroke: '#fff', strokeWidth: 1 }),
            h('text', { x: hereX + 8, y: hereY - 4, fill: sm.color, fontSize: 10, fontWeight: 700 }, '↘ now'),
            h('text', { x: 160, y: 158, fill: '#94a3b8', fontSize: 9, textAnchor: 'middle' }, 'I = V/R at V = ' + iq.voltage + 'V')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 10 } },
            h('label', null,
              h('div', { style: { fontSize: 11, marginBottom: 2, display: 'flex', justifyContent: 'space-between' } }, h('span', null, 'Voltage'), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.voltage + ' V')),
              h('input', { type: 'range', 'aria-label': __alloT('stem.circuit.a11y_voltage', 'Voltage'), 'aria-valuetext': iq.voltage + ' volts, current ' + current.toFixed(3) + ' amps, power ' + power.toFixed(3) + ' watts', min: 1, max: 48, step: 0.5, value: iq.voltage, onChange: function(e) { setKey('voltage', parseFloat(e.target.value)); }, style: { width: '100%' } })
            ),
            h('label', null,
              h('div', { style: { fontSize: 11, marginBottom: 2, display: 'flex', justifyContent: 'space-between' } }, h('span', null, 'Resistance'), h('span', { style: { color: sm.color, fontFamily: 'monospace', fontWeight: 700 } }, iq.resistance + ' Ω')),
              h('input', { type: 'range', 'aria-label': __alloT('stem.circuit.a11y_resistance', 'Resistance'), 'aria-valuetext': iq.resistance + ' ohms, current ' + current.toFixed(3) + ' amps, power ' + power.toFixed(3) + ' watts', min: 1, max: 1000, step: 1, value: iq.resistance, onChange: function(e) { setKey('resistance', parseInt(e.target.value, 10)); }, style: { width: '100%' } })
            )
          ),
          h('div', { style: { display: 'flex', gap: 8, marginBottom: 10 } },
            h('button', { onClick: function() {
              var t = new Date().toISOString().slice(11, 19);
              setIQ({ log: iq.log.concat([{ t: t, V: iq.voltage, R: iq.resistance, I: current.toFixed(3), P: power.toFixed(3), state: sm.label }]) });
            }, style: { flex: 1, padding: 6, fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid ' + sm.border, background: sm.bg, color: sm.color, cursor: 'pointer' } }, '📋 Log this V/R/I/P snapshot'),
            h('button', { onClick: function() { setIQ({ voltage: 9, resistance: 100 }); }, style: { padding: '6px 10px', fontSize: 11, borderRadius: 6, border: '1px solid #1e293b', background: 'var(--allo-stem-deeper, #0a0a1a)', color: '#94a3b8', cursor: 'pointer' } }, 'Reset')
          ),
          iq.log.length > 0 && h('div', { style: { maxHeight: 80, overflow: 'auto', padding: 6, borderRadius: 6, background: 'var(--allo-stem-deeper, #0a0a1a)', border: '1px solid #1e293b', marginBottom: 10, fontSize: 10, fontFamily: 'monospace', lineHeight: 1.4 } },
            iq.log.slice(-5).map(function(e, i) { return h('div', { key: i }, e.t + '  ' + e.state + ' · V' + e.V + ' R' + e.R + ' I' + e.I + ' P' + e.P); })
          ),
          h('label', { htmlFor: 'circuit-ohm-hypothesis', style: { display: 'block', fontSize: 11, fontWeight: 700, opacity: 0.85, marginBottom: 4 } }, 'Your hypothesis (which moves dissipation fastest — voltage or resistance? In which direction?)'),
          h('textarea', { id: 'circuit-ohm-hypothesis', value: iq.hypothesis, onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, rows: 2, placeholder: 'e.g., doubling voltage quadruples power; halving resistance also quadruples — wait, does it?', style: { width: '100%', padding: 6, borderRadius: 6, border: '1px solid ' + sm.border, background: 'var(--allo-stem-deeper, #0a0a1a)', color: '#e8f0f5', fontSize: 11, marginBottom: 10, resize: 'vertical' } }),
          !iq.stuckRevealed && h('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, style: { padding: '6px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6, border: '1px solid #1e293b', background: 'var(--allo-stem-deeper, #0a0a1a)', color: sm.color, cursor: 'pointer', marginBottom: 10 } }, "🤔 I'm stuck — show open questions"),
          iq.stuckRevealed && h('div', { style: { padding: 10, borderRadius: 6, background: 'var(--allo-stem-deeper, #0a0a1a)', border: '1px dashed ' + sm.border, fontSize: 11, marginBottom: 10, lineHeight: 1.5 } },
            h('div', { style: { fontWeight: 700, color: sm.color, marginBottom: 4 } }, 'Open questions (no answer key)'),
            h('ul', { style: { margin: 0, paddingLeft: 16 } },
              h('li', null, 'P = V²/R and P = I²R both express power. When does each form make intuition easier?'),
              h('li', null, 'If you double V and double R, what happens to I? to P?'),
              h('li', null, 'A 1 kΩ resistor at 48 V — what state? What about a 10 Ω resistor at 5 V?'),
              h('li', null, 'When does heat dissipation become the binding constraint on a circuit design?')
            )
          ),
          h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', marginBottom: 6 } },
            h('input', { type: 'checkbox', checked: iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }),
            h('span', null, 'I can explain why this V/R combination yields this dissipation state.')
          ),
          iq.understood && h('label', { htmlFor: 'circuit-ohm-explanation', style: { display: 'block', fontSize: 11, fontWeight: 700, opacity: 0.85, marginBottom: 4 } }, 'Explain the dissipation state in your own words'),
          iq.understood && h('textarea', { id: 'circuit-ohm-explanation', value: iq.explanation, onChange: function(e) { setIQ({ explanation: e.target.value }); }, rows: 2, placeholder: 'Explain in your own words...', style: { width: '100%', padding: 6, borderRadius: 6, border: '1px solid ' + sm.border, background: '#0a0a1a', color: '#e8f0f5', fontSize: 11, marginBottom: 6, resize: 'vertical' } }),
          h('p', { style: { margin: 0, fontSize: 10, fontStyle: 'italic', opacity: 0.6 } }, 'Inquiry widget — no score, no reveal, no answer dump. P/Resistor wattage thresholds are typical for through-hole carbon-film; SMD and wirewound differ.')
        );
      }

      function renderActiveSection() {
        if (expSection === 'ohmInquiry') return renderOhmInquirySection();
        if (expSection === 'laws') return renderLawsSection();
        if (expSection === 'components') return renderComponentsSection();
        if (expSection === 'sp') return renderSpSection();
        if (expSection === 'patterns') return renderPatternsSection();
        if (expSection === 'logic') return renderLogicSection();
        if (expSection === 'safety') return renderSafetySection();
        if (expSection === 'resistor') return renderResistorSection();
        if (expSection === 'capacitor') return renderCapacitorSection();
        if (expSection === 'inductor') return renderInductorSection();
        if (expSection === 'semicon') return renderSemiconSection();
        if (expSection === 'opamp') return renderOpampSection();
        if (expSection === 'filters') return renderFiltersSection();
        if (expSection === 'power') return renderPowerSection();
        if (expSection === 'motors') return renderMotorsSection();
        if (expSection === 'fields') return renderFieldsSection();
        if (expSection === 'wireless') return renderWirelessSection();
        if (expSection === 'units') return renderUnitsSection();
        if (expSection === 'famous') return renderFamousSection();
        if (expSection === 'micro') return renderMicroSection();
        if (expSection === 'ics') return renderIcsSection();
        if (expSection === 'protos') return renderProtosSection();
        if (expSection === 'sensors') return renderSensorsSection();
        if (expSection === 'actuators') return renderActuatorsSection();
        if (expSection === 'pcb') return renderPcbSection();
        if (expSection === 'troubleshoot') return renderTroubleshootSection();
        if (expSection === 'simulation') return renderSimulationSection();
        if (expSection === 'standards') return renderStandardsSection();
        if (expSection === 'careers') return renderCareersSection();
        if (expSection === 'batteries') return renderBatteriesSection();
        if (expSection === 'energy') return renderEnergySection();
        if (expSection === 'famouscirc') return renderFamouscircSection();
        if (expSection === 'computers') return renderComputersSection();
        if (expSection === 'world') return renderWorldSection();
        if (expSection === 'wire') return renderWireSection();
        if (expSection === 'fuses') return renderFusesSection();
        if (expSection === 'lights') return renderLightsSection();
        if (expSection === 'household_app') return renderHouseholdAppSection();
        if (expSection === 'circuit_lab') return renderCircuitLabSection();
        if (expSection === 'common_circuits') return renderCommonCircuitsSection();
        if (expSection === 'connectors') return renderConnectorsSection();
        if (expSection === 'symbols') return renderSymbolsSection();
        if (expSection === 'poebulb') return renderPoebulbSection();
        if (expSection === 'failDx') return renderFailDxSection();
        if (expSection === 'glossary') return renderGlossarySection();
        return null;
      }

      var SCHEMATIC_SYMBOLS = [
        { name: 'Resistor', us: 'Zigzag line', eu: 'Rectangle', notes: 'IEEE/ANSI uses zigzag; IEC uses rectangle. Both globally understood.' },
        { name: 'Capacitor (non-polarized)', us: 'Two parallel straight lines', eu: 'Same', notes: 'Universal symbol.' },
        { name: 'Capacitor (polarized)', us: 'One straight + one curved line', eu: 'Same with + marker', notes: '+ side = anode. Curved side = cathode.' },
        { name: 'Inductor', us: 'Loops/coils', eu: 'Filled rectangle', notes: 'IEEE: curves like a spring. IEC: filled bar.' },
        { name: 'Battery', us: 'Long line (+) + short line (−)', eu: 'Same', notes: 'Multi-cell shown with multiple line pairs. Universal.' },
        { name: 'Ground (earth)', us: 'Lines decreasing in length', eu: 'Same', notes: 'Multiple variants for chassis, earth, signal ground.' },
        { name: 'LED', us: 'Diode with two arrows pointing OUT', eu: 'Same', notes: 'Arrows = emitted light. Photodiode has arrows pointing IN.' },
        { name: 'Diode', us: 'Triangle pointing to bar', eu: 'Same', notes: 'Triangle = anode side. Current flows in direction of triangle.' },
        { name: 'Transistor (NPN)', us: 'Circle with 3 leads, arrow OUT on emitter', eu: 'Same', notes: 'PNP has arrow pointing IN.' },
        { name: 'MOSFET (N-channel)', us: 'Symbol with gate insulated, arrow IN on body', eu: 'Same', notes: 'Many variations — enhancement vs depletion, with vs without body terminal.' },
        { name: 'Op-amp', us: 'Triangle with + and − inputs + output', eu: 'Same', notes: 'Power supply pins often hidden for clarity.' },
        { name: 'Logic gates', us: 'Distinctive shapes (AND = D-shape, OR = curved)', eu: 'Rectangle with label (&, ≥1, =1)', notes: 'US: graphical. EU: rectangle + Boolean operator symbol.' },
        { name: 'Wire crossing (no connection)', us: 'One wire jumps over other', eu: 'Crossed lines (no dot)', notes: 'Dot = connection. No dot = wires cross without touching.' },
        { name: 'Wire junction (connection)', us: 'Dot at intersection', eu: 'Same', notes: 'T-junctions usually shown without dot; 4-way always with dot.' },
        { name: 'Switch (SPST)', us: 'Hinged line on contact', eu: 'Same', notes: 'SPDT, DPDT, etc. add more contacts.' },
        { name: 'Speaker', us: 'Square + curved triangle', eu: 'Same', notes: 'Loudspeaker, headphone — same basic symbol.' },
        { name: 'Microphone', us: 'Circle with vertical line', eu: 'Same', notes: 'Or circle with diagonal lines.' },
        { name: 'Transformer', us: 'Two coils with bar between', eu: 'Same', notes: 'Bar = iron core. Air-core transformers omit it.' },
        { name: 'Fuse', us: 'Rectangle with curve, or zigzag with line', eu: 'Rectangle', notes: 'Multiple variants. All indicate breakable link.' },
        { name: 'Lamp / bulb', us: 'Circle with X (×) inside', eu: 'Same', notes: 'Or circle with crossed loop.' }
      ];

      function renderSymbolsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⊜ Schematic symbols (US vs EU style)'),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, 'Most schematics use IEEE/ANSI (US) or IEC (European) symbols. Both are clear once you learn them, but mixing in one schematic is confusing.'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('caption', { className: 'sr-only' }, 'Schematic symbols comparison'),
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Component', 'US (IEEE)', 'EU (IEC)', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                SCHEMATIC_SYMBOLS.map(function(s, i) {
                  return h('tr', { key: 's'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('th', { scope: 'row', className: 'px-2 py-1 text-left font-bold text-slate-800' }, s.name),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[0.625rem]' }, s.us),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[0.625rem]' }, s.eu),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, s.notes)
                  );
                })
              )
            )
          )
        );
      }

      var CONNECTORS = [
        { name: 'USB-A', pins: '4 (USB 2.0) / 9 (USB 3.0)', use: 'Computer host ports. Being phased out for USB-C.', notes: 'Rectangular, "only fits one way" — but Murphy says it takes 3 tries.' },
        { name: 'USB-C', pins: '24 (16 + power/data)', use: 'Modern phones, laptops, peripherals. Reversible.', notes: 'Power up to 240W, data up to 80 Gbps. EU mandate for new phones.' },
        { name: 'USB Micro-B', pins: '5', use: 'Older Android phones, small electronics', notes: 'Replaced by USB-C in most new products. Easy to wear out.' },
        { name: 'USB Mini-B', pins: '5', use: 'Older cameras, MP3 players', notes: 'Mostly obsolete.' },
        { name: 'HDMI Type A (standard)', pins: 19, use: 'TVs, monitors, game consoles', notes: 'Audio + video. HDMI 2.1: 48 Gbps, 8K@60.' },
        { name: 'HDMI Mini (Type C)', pins: 19, use: 'Tablets, some cameras', notes: 'Smaller form factor.' },
        { name: 'HDMI Micro (Type D)', pins: 19, use: 'Phones, GoPro, small cameras', notes: 'Even smaller.' },
        { name: 'DisplayPort', pins: 20, use: 'Computer monitors', notes: 'DP 2.0: 80 Gbps. Common on graphics cards + pro displays.' },
        { name: 'Mini DisplayPort', pins: 20, use: 'MacBooks, Surface (older)', notes: 'Largely replaced by USB-C/Thunderbolt.' },
        { name: 'Thunderbolt 3/4 (over USB-C)', pins: 24, use: 'High-speed external storage, eGPUs, docks', notes: 'TB4: 40 Gbps. Same connector as USB-C but more capability.' },
        { name: 'VGA (DE-15)', pins: 15, use: 'Older monitors, projectors', notes: 'Analog. Largely obsolete but still common in education.' },
        { name: 'DVI', pins: '24+5 (DVI-I) / 24 (DVI-D)', use: 'Older flat-panel monitors', notes: 'Digital (DVI-D) or hybrid (DVI-I). Replaced by HDMI + DP.' },
        { name: 'RJ45 (Ethernet)', pins: 8, use: 'Wired networking', notes: 'Cat 5e (1 Gbps), Cat 6 (10 Gbps short), Cat 8 (40 Gbps).' },
        { name: 'RJ11 (telephone)', pins: '4-6', use: 'Landline phones, DSL', notes: 'Smaller than RJ45.' },
        { name: '3.5mm TRS audio', pins: '3 contacts', use: 'Headphones, speakers, line in/out', notes: 'Tip-Ring-Sleeve. 4-contact (TRRS) adds microphone for headsets.' },
        { name: '1/4" TRS', pins: '3 contacts', use: 'Pro audio, guitar cables', notes: 'Same idea as 3.5mm but bigger. Guitar = TS (no ring).' },
        { name: 'XLR (3-pin)', pins: 3, use: 'Professional microphones, mixing boards', notes: 'Balanced audio — rejects noise. Locking connector.' },
        { name: 'RCA (composite)', pins: '1 (+ground shield)', use: 'Old AV equipment', notes: 'Yellow=video, red/white=stereo audio. Mostly obsolete.' },
        { name: 'Banana plug', pins: 1, use: 'Test leads, speakers', notes: 'Single conductor. Common in lab instruments.' },
        { name: 'BNC', pins: 1, use: 'Coax video, RF lab equipment', notes: 'Bayonet locking. Used on oscilloscope probes.' },
        { name: 'F-connector (coax TV)', pins: 1, use: 'Cable TV, satellite, antenna', notes: 'Threaded. 75-ohm impedance.' },
        { name: 'SMA', pins: 1, use: 'RF + microwave equipment, antennas', notes: 'Threaded coax connector. 50-ohm.' },
        { name: 'IEC C13/C14 (kettle plug)', pins: 3, use: 'Computer power supplies, monitors', notes: 'Standard PC cord. International compatibility.' },
        { name: 'Barrel jack (DC)', pins: 2, use: 'Wall warts, small electronics', notes: 'Multiple sizes (5.5×2.1mm common). Center pin polarity varies — check datasheet!' },
        { name: 'JST (PH, XH, etc.)', pins: '2-15+', use: 'Internal connections in electronics', notes: 'Many series. Common in hobby + Arduino projects.' },
        { name: 'Molex (4-pin Mate-N-Lok)', pins: 4, use: 'Old IDE drives, fans', notes: 'PC peripheral power. Largely replaced by SATA power.' },
        { name: 'SATA data + power', pins: '7 + 15', use: 'Internal storage drives', notes: 'Standard since mid-2000s. NVMe replacing for high-end.' },
        { name: 'M.2 (NVMe)', pins: 'B + M keys, varies', use: 'Modern SSDs', notes: 'Direct PCIe connection. Tiny + fast.' },
        { name: 'Lightning (Apple)', pins: 8, use: 'iPhones pre-2024, iPads, accessories', notes: 'Reversible. Being replaced by USB-C across Apple line.' }
      ];

      function renderConnectorsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔌 Common connectors + cables'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('caption', { className: 'sr-only' }, 'Common electrical connectors and cables'),
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Connector', 'Pins', 'Use', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                CONNECTORS.map(function(c, i) {
                  return h('tr', { key: 'c'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('th', { scope: 'row', className: 'px-2 py-1 text-left font-bold text-slate-800' }, c.name),
                    h('td', { className: 'px-2 py-1 font-mono text-amber-700 font-bold text-[0.625rem]' }, c.pins),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[0.625rem]' }, c.use),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, c.notes)
                  );
                })
              )
            )
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 7 — Final circuit data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var PROJECT_CIRCUITS = [
        { project: 'LED + battery', difficulty: 'Beginner', components: 'LED, resistor (220-470 Ω), 9V battery (or AA holder)', skills: 'Polarity, current-limit resistor calculation' },
        { project: 'Series + parallel LEDs', difficulty: 'Beginner', components: 'Multiple LEDs, resistors, battery', skills: 'Series adds voltage drops. Parallel needs separate resistors per branch.' },
        { project: '555 timer LED blink', difficulty: 'Beginner', components: '555 IC, 2 resistors, 1 cap, LED, battery', skills: 'Astable multivibrator. Frequency calc. Reading datasheets.' },
        { project: 'Light-sensing alarm (LDR + 555)', difficulty: 'Beginner-intermediate', components: 'LDR, transistor, 555, speaker', skills: 'Voltage divider with variable R. Transistor switching.' },
        { project: 'Arduino + LED + button', difficulty: 'Beginner', components: 'Arduino, LED, resistor, button, breadboard', skills: 'Digital I/O, pull-up/down resistors, basic programming.' },
        { project: 'Servo motor sweep', difficulty: 'Beginner', components: 'Arduino, servo, power supply', skills: 'PWM signal generation. Library use (Servo.h).' },
        { project: 'Temperature display', difficulty: 'Intermediate', components: 'Arduino, DHT22 sensor, OLED screen', skills: 'I²C, library installation, sensor calibration.' },
        { project: 'Bluetooth speaker (DIY)', difficulty: 'Intermediate', components: 'Bluetooth module, amp board, speaker, battery, switch', skills: 'Audio signal flow. Power management. Enclosure design.' },
        { project: 'Motion-sensing light', difficulty: 'Intermediate', components: 'PIR sensor, MOSFET, LED strip, power supply', skills: 'Digital sensors. High-current switching with MOSFET.' },
        { project: 'Robot car (basic)', difficulty: 'Intermediate', components: 'Arduino, motor driver, 2 DC motors, wheels, chassis, battery, ultrasonic sensor', skills: 'H-bridge motor control. Sensor integration. Mechanical assembly.' },
        { project: 'Weather station (data logger)', difficulty: 'Intermediate-advanced', components: 'ESP32, BME280, DHT22, SD card, OLED, battery', skills: 'Multi-sensor I²C, SD card filesystem, real-time clock, low-power sleep modes.' },
        { project: 'Home automation switch (Wi-Fi)', difficulty: 'Intermediate-advanced', components: 'ESP32/ESP8266, relay, USB power, enclosure', skills: 'AC mains safety (!), Wi-Fi APIs, MQTT or HTTP, mobile app integration.' },
        { project: 'CNC machine controller', difficulty: 'Advanced', components: 'Stepper drivers, steppers, controller board (e.g., GRBL), power supply', skills: 'Stepper microstepping, G-code, mechanical alignment.' },
        { project: '3D printer firmware', difficulty: 'Advanced', components: 'Marlin/Klipper firmware, board (e.g., SKR), endstops, thermistors, fans', skills: 'Firmware compilation, PID tuning for hot end + bed, stepper calibration.' },
        { project: 'Drone build', difficulty: 'Advanced', components: 'Frame, motors (brushless), ESCs, flight controller, receiver, props, LiPo battery', skills: 'PID control, RF binding, safety (props off until ready), regulations.' },
        { project: 'Custom keyboard', difficulty: 'Intermediate-advanced', components: 'Switches, diodes, PCB (custom), USB controller (RP2040/Pro Micro), keycaps', skills: 'Matrix scanning, QMK firmware, PCB design (or hand-wired).' },
        { project: 'Software-defined radio (SDR)', difficulty: 'Advanced', components: 'RTL-SDR dongle (or HackRF), antenna, computer', skills: 'Signal processing, frequency analysis, modulation/demodulation.' },
        { project: 'Custom PCB project', difficulty: 'Advanced', components: 'KiCad/Altium, manufacturer (JLCPCB, PCBWay), parts (DigiKey/Mouser)', skills: 'Schematic capture, layout, ordering, assembly, debugging.' },
        { project: 'Battery management system (BMS)', difficulty: 'Advanced', components: 'Cells, balancing IC, current sensor, MCU, safety FETs', skills: 'Cell balancing, overcurrent + thermal protection, safety!' },
        { project: 'Quadruped robot', difficulty: 'Advanced', components: '12 servos (3 per leg), MCU, IMU, power, chassis', skills: 'Inverse kinematics, gait planning, balance algorithms.' }
      ];

      function renderCommonCircuitsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚒ Hands-on project ideas'),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, 'A learning ladder from "blink an LED" to "build a quadruped robot." Each project builds on skills from earlier ones.'),
          h('div', { className: 'space-y-2' },
            PROJECT_CIRCUITS.map(function(p, i) {
              return h('div', { key: 'p'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, p.project),
                  h('span', { className: 'text-[0.625rem] text-amber-700 font-mono ml-auto px-2 py-0.5 rounded bg-amber-100' }, p.difficulty)
                ),
                h('div', { className: 'text-[0.6875rem] text-slate-700 mb-1' }, h('strong', null, 'Components: '), p.components),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, h('strong', null, 'Skills: '), p.skills)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 6 — Final dense data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var APPLIANCES = [
        { device: 'LED light bulb (typical)', watts: '5-15 W', notes: 'Replaces 40-100W incandescent. ~10× more efficient.' },
        { device: 'Incandescent bulb (60W)', watts: '60 W', notes: 'Mostly heat. Phased out in many countries.' },
        { device: 'Fluorescent ceiling tube (4 ft)', watts: '32 W', notes: 'Office standard for decades.' },
        { device: 'Laptop computer', watts: '15-60 W', notes: 'Higher under load. Charging draws more than running.' },
        { device: 'Desktop PC (typical)', watts: '60-250 W', notes: 'Gaming PCs can hit 500-800 W under load.' },
        { device: 'CRT TV (old, 32")', watts: '~150 W', notes: 'Mostly obsolete.' },
        { device: 'LCD TV (40")', watts: '~75 W', notes: 'Big improvement over CRT.' },
        { device: 'OLED TV (65")', watts: '~120 W', notes: 'Per-pixel emission.' },
        { device: 'Refrigerator', watts: '100-400 W when running', notes: 'Cycles on/off. ~1-2 kWh/day typical.' },
        { device: 'Freezer (chest)', watts: '50-150 W when running', notes: 'More insulated than fridge. Cycles less.' },
        { device: 'Microwave oven', watts: '700-1500 W', notes: '"700 W output" = actual cooking power; input may be 1000+ W.' },
        { device: 'Electric kettle', watts: '1500 W (US) / 3000 W (EU/UK)', notes: 'Higher voltage in EU/UK allows faster boil.' },
        { device: 'Toaster', watts: '800-1500 W', notes: 'Pure resistive heating.' },
        { device: 'Hair dryer', watts: '1200-1875 W', notes: 'Heating element + small motor.' },
        { device: 'Coffee maker (drip)', watts: '600-1200 W', notes: 'Heats water, keeps hot.' },
        { device: 'Espresso machine', watts: '1000-1500 W', notes: 'Brief high-power bursts.' },
        { device: 'Dishwasher', watts: '1200-1500 W during cycle', notes: 'Mostly heating water + pump.' },
        { device: 'Clothes washer', watts: '300-500 W (cold) / ~2000 W (hot)', notes: 'Cold wash much more efficient.' },
        { device: 'Clothes dryer (electric)', watts: '1800-5000 W', notes: 'One of the biggest household loads.' },
        { device: 'Vacuum cleaner', watts: '500-1500 W', notes: 'Motor + air movement.' },
        { device: 'Iron (clothing)', watts: '1000-1800 W', notes: 'Resistive heating.' },
        { device: 'Window AC (5,000 BTU)', watts: '~450 W', notes: '~1 kWh per 2.5 hr of cooling.' },
        { device: 'Central AC (3 ton)', watts: '3500-5000 W', notes: 'Biggest summer load. SEER rating matters.' },
        { device: 'Electric furnace', watts: '10,000-25,000 W', notes: 'Mostly replaced by heat pumps in efficient homes.' },
        { device: 'Heat pump (3 ton)', watts: '1500-3000 W', notes: '~3× more efficient than resistive heat.' },
        { device: 'Water heater (electric tank)', watts: '4500 W', notes: 'On/off cycling. ~3-5 kWh/day for typical household.' },
        { device: 'EV charging (Level 1, 120V)', watts: '1400 W', notes: 'Slow — adds ~4-5 miles/hour of charging.' },
        { device: 'EV charging (Level 2, 240V)', watts: '7000-12,000 W', notes: 'Home garage charger. Adds 20-40 mi/hr.' },
        { device: 'EV DC fast charger', watts: '50,000-350,000 W', notes: 'Highway charging. Can add 200+ mi in 20 min.' },
        { device: 'Phone charger', watts: '5-65 W', notes: 'USB-PD 3.1 allows up to 240 W (laptop charging).' },
        { device: 'Wi-Fi router', watts: '5-20 W', notes: '24/7 — small per hour but adds up.' },
        { device: 'Game console (PS5/Xbox)', watts: '160-200 W gaming / 20 W idle', notes: 'Modern consoles are efficient by default.' },
        { device: 'Treadmill', watts: '600-2000 W', notes: 'Motor scales with speed + incline.' }
      ];

      var LAB_EQUIPMENT = [
        { instrument: 'Digital multimeter (DMM)', use: 'Measures V, I, R (and often continuity, capacitance, frequency).', notes: 'Basic tool. Auto-ranging models common. Higher-end: true RMS for non-sine AC.' },
        { instrument: 'Oscilloscope', use: 'Visualize voltage vs time. See waveform shape, frequency, glitches.', notes: 'Bandwidth (MHz/GHz) determines fastest signals you can see. 4 channels common.' },
        { instrument: 'Logic analyzer', use: 'Capture many digital signals simultaneously.', notes: 'For debugging digital protocols (I²C, SPI, USB).' },
        { instrument: 'Function/arbitrary waveform generator', use: 'Output sine, square, triangle, custom waves.', notes: 'For stimulating circuits during testing.' },
        { instrument: 'Bench DC power supply', use: 'Adjustable voltage + current limit.', notes: 'Multi-output models common. Current limit protects circuits during testing.' },
        { instrument: 'Spectrum analyzer', use: 'Frequency-domain view of signals.', notes: 'Used in RF design, EMI testing.' },
        { instrument: 'Network analyzer', use: 'Measures S-parameters (impedance + transmission) over frequency.', notes: 'Vector network analyzer (VNA) gives phase + magnitude.' },
        { instrument: 'LCR meter', use: 'Measures inductance, capacitance, resistance at various frequencies.', notes: 'Better than multimeter for these parameters.' },
        { instrument: 'Soldering iron', use: 'Joins components via molten solder.', notes: '~350°C typical. Temperature-controlled stations preferred.' },
        { instrument: 'Hot air rework station', use: 'Desolder + place SMT components.', notes: 'Adjustable temp + airflow.' },
        { instrument: 'Solder reflow oven', use: 'Mass-solders PCB assemblies.', notes: 'Toaster ovens can be modified for hobby use.' },
        { instrument: 'Microscope (stereo)', use: 'Inspect SMT components + solder joints.', notes: '10-40× typical. 0603 + smaller require microscope.' },
        { instrument: 'PCB drill / mill', use: 'Make holes + cut traces in prototype boards.', notes: 'CNC machines like Bantam Tools for low-volume.' },
        { instrument: 'Wire strippers', use: 'Remove insulation cleanly.', notes: 'Multi-gauge selectable. Avoid nicking conductors.' },
        { instrument: 'Crimping tool', use: 'Compress connectors onto wires.', notes: 'Right tool for the connector matters — wrong crimp = unreliable.' },
        { instrument: 'Heat gun', use: 'Shrinks heat-shrink tubing. Hot air rework.', notes: '~200-400°C. Don\'t aim at flammable insulation.' },
        { instrument: 'Continuity tester', use: 'Beeps when circuit complete.', notes: 'DMMs have this built-in. Quick wire + trace checks.' },
        { instrument: 'Clamp meter', use: 'Measures current without breaking circuit.', notes: 'Hall-effect sensor reads magnetic field around conductor.' },
        { instrument: 'Insulation tester (megger)', use: 'Tests insulation with high voltage (500-1000+ V DC).', notes: 'For mains wiring + motor windings.' },
        { instrument: 'Earth ground tester', use: 'Verifies grounding system resistance.', notes: '<25 Ω typically required for safety.' },
        { instrument: 'IR thermometer / thermal camera', use: 'Spot hot components or failing connections.', notes: 'Useful for finding hot solder joints or overloaded wires.' },
        { instrument: 'ESD wrist strap', use: 'Prevent static damage to sensitive components.', notes: '1 MΩ resistor to ground. Essential for MOSFETs, modern ICs.' }
      ];

      function renderHouseholdAppSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🏠 Household appliance power'),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, 'Typical wattage of common devices. Watts × hours = watt-hours of energy used. 1 kWh costs ~$0.10-0.30 in most regions.'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('caption', { className: 'sr-only' }, 'Household appliance power reference'),
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Device', 'Power', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                APPLIANCES.map(function(a, i) {
                  return h('tr', { key: 'a'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('th', { scope: 'row', className: 'px-2 py-1 text-left font-bold text-slate-800' }, a.device),
                    h('td', { className: 'px-2 py-1 font-mono text-amber-700 font-bold text-[0.625rem]' }, a.watts),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, a.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderCircuitLabSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔬 Electronics lab equipment'),
          h('div', { className: 'space-y-2' },
            LAB_EQUIPMENT.map(function(L, i) {
              return h('div', { key: 'L'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-slate-800 mb-1' }, L.instrument),
                h('div', { className: 'text-[0.6875rem] text-amber-700 font-bold mb-1' }, 'Use: ' + L.use),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, L.notes)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 5 — Dense data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var WIRE_GAUGES = [
        { awg: 0, dia: '8.25 mm', amps: '195 A', use: 'Large feeder cables.' },
        { awg: 2, dia: '6.54 mm', amps: '130 A', use: 'Battery cables (cars).' },
        { awg: 4, dia: '5.19 mm', amps: '95 A', use: 'Range/cooktop circuits.' },
        { awg: 6, dia: '4.11 mm', amps: '65 A', use: 'Electric clothes dryers.' },
        { awg: 8, dia: '3.26 mm', amps: '50 A', use: 'Electric dryers, ranges.' },
        { awg: 10, dia: '2.59 mm', amps: '30 A', use: 'Water heaters, air conditioners.' },
        { awg: 12, dia: '2.05 mm', amps: '20 A', use: 'Kitchen + bathroom outlets (US).' },
        { awg: 14, dia: '1.63 mm', amps: '15 A', use: 'General lighting + outlets (US).' },
        { awg: 16, dia: '1.29 mm', amps: '10 A', use: 'Extension cords (light duty).' },
        { awg: 18, dia: '1.02 mm', amps: '7 A', use: 'Lamp cords, small appliances.' },
        { awg: 20, dia: '0.81 mm', amps: '5 A', use: 'Speaker wires (low current).' },
        { awg: 22, dia: '0.64 mm', amps: '3 A', use: 'Hookup wire, breadboarding.' },
        { awg: 24, dia: '0.51 mm', amps: '2 A', use: 'Ethernet (Cat 5e). Small hobby projects.' },
        { awg: 26, dia: '0.40 mm', amps: '1 A', use: 'Magnet wire, fine signal wire.' },
        { awg: 28, dia: '0.32 mm', amps: '0.6 A', use: 'Thin signal wire, jumpers.' },
        { awg: 30, dia: '0.25 mm', amps: '0.4 A', use: 'Wire-wrap. Thin transformers.' },
        { awg: 32, dia: '0.20 mm', amps: '0.2 A', use: 'Very fine work.' }
      ];

      var WIRE_NOTES = [
        { topic: 'AWG counterintuitive', detail: 'Lower number = THICKER wire. AWG 0 (0000) = ~12 mm. AWG 36 = ~0.13 mm.' },
        { topic: 'Solid vs stranded', detail: 'Solid: single conductor, cheaper, stiffer. Stranded: multiple thin strands, more flexible.' },
        { topic: 'Insulation ratings', detail: 'THHN (90°C dry), THWN (75°C wet), NM-B (Romex, 90°C). Higher rating = higher temp tolerance.' },
        { topic: 'Voltage drop', detail: 'V = I × R. Long runs need bigger wire to keep drop < ~3%. Online calculators help.' },
        { topic: 'Skin effect', detail: 'At high freq, current concentrates near wire surface. Litz wire (many fine insulated strands) reduces loss.' },
        { topic: 'Color code (US residential)', detail: 'Black: hot. White: neutral. Green/bare: ground. Red: 2nd hot (240V).' },
        { topic: 'Color code (EU)', detail: 'Brown: live. Blue: neutral. Green/yellow stripe: ground.' }
      ];

      var FUSES_BREAKERS = [
        { device: 'Ceramic fuse (5×20 mm)', rating: '~100 mA to ~30 A', notes: 'Common in electronics. Fast (F) or slow-blow (T) variants.' },
        { device: 'Glass fuse (3AG, 6×30 mm)', rating: '~100 mA to ~30 A', notes: 'Older equipment. Easy to inspect (visible filament).' },
        { device: 'Cartridge fuse (auto)', rating: '~5 A to ~80 A', notes: 'Color-coded ATC/ATO blade fuses in modern cars.' },
        { device: 'Resettable fuse (polyfuse, PTC)', rating: '~50 mA to ~10 A', notes: 'Heats up + resets when fault clears. No replacement needed.' },
        { device: 'Thermal fuse', rating: 'temp-rated', notes: 'Opens at specific temp. Coffee makers, hair dryers.' },
        { device: 'Circuit breaker (residential)', rating: '15-200 A', notes: 'Thermal-magnetic. Trips on overcurrent or short. Resettable.' },
        { device: 'GFCI / RCD', rating: 'trips at ~5 mA imbalance', notes: 'Ground Fault Circuit Interrupter. Required in bathrooms, kitchens, outdoors.' },
        { device: 'AFCI', rating: 'detects arcing patterns', notes: 'Arc Fault Circuit Interrupter. Required in bedroom outlets (US).' },
        { device: 'HRC fuse (industrial)', rating: '~10-2000 A', notes: 'High Rupturing Capacity. Industrial equipment, transformers.' }
      ];

      var LIGHT_BULBS = [
        { type: 'Incandescent (Edison)', efficiency: '~2% (15 lm/W)', life: '~1000 hr', notes: 'Tungsten filament glowing hot. Mostly heat, little light. Banned for general lighting in many countries.' },
        { type: 'Halogen', efficiency: '~3% (25 lm/W)', life: '~2000 hr', notes: 'Incandescent variant with halogen gas + quartz envelope. Slightly more efficient.' },
        { type: 'CFL (compact fluorescent)', efficiency: '~10% (60 lm/W)', life: '~10,000 hr', notes: 'Mercury vapor + phosphor coating. Slow warm-up. Mercury disposal concern.' },
        { type: 'Linear fluorescent (T8)', efficiency: '~10% (~85 lm/W)', life: '~20,000 hr', notes: 'Office + commercial standard. Being replaced by LED.' },
        { type: 'LED (white)', efficiency: '~15-30% (~100-150 lm/W)', life: '~25,000-50,000 hr', notes: 'Blue LED + yellow phosphor (or RGB). Most efficient general lighting.' },
        { type: 'LED (filament-style)', efficiency: '~12% (~90 lm/W)', life: '~15,000 hr', notes: 'Mimics incandescent look. Slightly less efficient than standard LED.' },
        { type: 'High-pressure sodium', efficiency: '~25% (~150 lm/W)', life: '~24,000 hr', notes: 'Yellow-orange. Old streetlights. Being replaced by LED.' },
        { type: 'Metal halide', efficiency: '~20% (~100 lm/W)', life: '~15,000 hr', notes: 'White light. Stadiums, parking lots, retail.' },
        { type: 'Mercury vapor', efficiency: '~15%', life: '~24,000 hr', notes: 'Bluish-white. Largely phased out due to mercury + low efficiency vs newer options.' },
        { type: 'Xenon arc', efficiency: '~5-10%', life: '~2000 hr', notes: 'Movie projectors, car HID headlights, IMAX.' },
        { type: 'OLED panel', efficiency: '~15%', life: '~10,000-30,000 hr', notes: 'Flat panel lighting. Architectural use. Expensive.' },
        { type: 'Carbon arc', efficiency: 'high luminance', life: 'short (consumes electrodes)', notes: 'Old movie projection, searchlights. Obsolete.' }
      ];

      var LIGHT_FACTS = [
        { fact: 'Lumens vs watts', detail: '60W incandescent ≈ 800 lumens. Same lumens from LED uses ~9W.' },
        { fact: 'Color temperature', detail: '2700 K (warm/incandescent-like), 3000 K (soft white), 4000 K (neutral), 5000 K+ (daylight/cool).' },
        { fact: 'Color rendering index (CRI)', detail: 'How accurately colors appear. 100 = sunlight. >90 = high quality. Cheap LEDs ~70.' },
        { fact: 'Lumen', detail: 'Total light emitted. Brightness perceived by human eye.' },
        { fact: 'Lux', detail: 'Lumens per square meter. Brightness AT a surface. Office: ~500 lux. Sunlight: ~100,000 lux.' },
        { fact: 'Candela', detail: 'Luminous intensity in one direction. Replaced "candlepower". One candle ≈ 1 cd.' },
        { fact: 'Photopic vs scotopic vision', detail: 'Day (cones) vs night (rods). Peak sensitivity shifts from 555 nm (yellow-green) to 505 nm (blue-green) in dim light.' },
        { fact: 'Blue light + sleep', detail: '~480 nm suppresses melatonin. Why screens late at night affect sleep. "Night mode" shifts to warmer colors.' }
      ];

      function renderWireSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '〰 Wire gauges (AWG)'),
          h('p', { className: 'text-[0.75rem] text-slate-700 mb-3 leading-relaxed' }, 'American Wire Gauge. Lower number = THICKER. Doubles in cross-section every 3 gauges. Current capacity depends on insulation + ambient temp.'),
          h('div', { className: 'overflow-x-auto mb-3' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('caption', { className: 'sr-only' }, 'American Wire Gauge reference'),
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['AWG', 'Diameter', 'Max amps (chassis)', 'Typical use'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                WIRE_GAUGES.map(function(w, i) {
                  return h('tr', { key: 'w'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('th', { scope: 'row', className: 'px-2 py-1 font-mono font-black text-amber-700 text-center' }, w.awg),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[0.625rem]' }, w.dia),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[0.625rem]' }, w.amps),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, w.use)
                  );
                })
              )
            )
          ),
          h('div', { className: 'space-y-1' },
            WIRE_NOTES.map(function(n, i) {
              return h('div', { key: 'n'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-amber-400 border border-slate-200' },
                h('div', { className: 'text-[0.6875rem] font-black text-amber-900 mb-0.5' }, n.topic),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, n.detail)
              );
            })
          )
        );
      }

      function renderFusesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⌧ Fuses + circuit protection'),
          h('div', { className: 'space-y-2' },
            FUSES_BREAKERS.map(function(f, i) {
              return h('div', { key: 'f'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, f.device),
                  h('span', { className: 'text-[0.625rem] text-amber-700 font-mono ml-auto px-2 py-0.5 rounded bg-amber-100' }, f.rating)
                ),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, f.notes)
              );
            })
          )
        );
      }

      function renderLightsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '💡 Light bulb technologies'),
          h('div', { className: 'mb-3' },
            h('div', { className: 'space-y-2' },
              LIGHT_BULBS.map(function(L, i) {
                return h('div', { key: 'L'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                  h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                    h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, L.type),
                    h('span', { className: 'text-[0.625rem] text-amber-700 font-mono' }, L.efficiency),
                    h('span', { className: 'text-[0.625rem] text-slate-600 font-mono ml-auto' }, 'Life: ' + L.life)
                  ),
                  h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, L.notes)
                );
              })
            )
          ),
          h('h5', { className: 'text-[0.75rem] font-bold text-slate-700 mb-1' }, 'Lighting essentials'),
          h('div', { className: 'space-y-1' },
            LIGHT_FACTS.map(function(L, i) {
              return h('div', { key: 'L'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-amber-400 border border-slate-200' },
                h('div', { className: 'text-[0.6875rem] font-black text-amber-900 mb-0.5' }, L.fact),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, L.detail)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 4 — Dense reference data (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var BATTERY_TYPES = [
        { type: 'Alkaline (AA, AAA, C, D, 9V)', voltage: '1.5 V (9V for 9V)', energy: '~100-150 Wh/kg', notes: 'Non-rechargeable. ~10-year shelf life. Most common consumer battery.' },
        { type: 'Carbon-zinc', voltage: '1.5 V', energy: '~40-60 Wh/kg', notes: 'Cheap, lower performance than alkaline. Older "heavy duty" batteries.' },
        { type: 'Lithium primary (CR2032, etc.)', voltage: '3.0 V', energy: '~250 Wh/kg', notes: 'Long shelf life (~10 yr). Coin cells in watches, motherboards.' },
        { type: 'NiCd (nickel-cadmium)', voltage: '1.2 V', energy: '~40-60 Wh/kg', notes: 'Rechargeable. Memory effect. Now mostly replaced by NiMH (Cd is toxic).' },
        { type: 'NiMH (nickel-metal hydride)', voltage: '1.2 V', energy: '~60-120 Wh/kg', notes: 'Rechargeable. Replaced NiCd. Used in older hybrid cars, low-self-discharge variants in remotes.' },
        { type: 'Lead-acid', voltage: '~2.1 V/cell (12 V = 6 cells)', energy: '~30-50 Wh/kg', notes: 'Heavy + cheap. Cars, UPS, off-grid solar. Invented 1859.' },
        { type: 'Li-ion (LiCoO₂)', voltage: '~3.7 V', energy: '~150-250 Wh/kg', notes: 'Phones, laptops. High energy density. Sensitive to overcharge/discharge.' },
        { type: 'Li-ion (LiFePO₄)', voltage: '~3.2 V', energy: '~90-160 Wh/kg', notes: 'Safer (no thermal runaway). EVs (BYD, Tesla LFP), home solar. Long cycle life.' },
        { type: 'Li-ion (NMC, NCA)', voltage: '~3.6 V', energy: '~200-280 Wh/kg', notes: 'Most EV batteries (Tesla, GM). High energy density.' },
        { type: 'Lithium polymer (LiPo)', voltage: '~3.7 V', energy: '~150-200 Wh/kg', notes: 'Pouch cells. Drones, RC. Less safe if punctured/damaged.' },
        { type: 'Solid-state lithium', voltage: '~3.7 V', energy: '~400 Wh/kg (claimed)', notes: 'Emerging. Replace liquid electrolyte with solid. Safer + higher density. Toyota + others aim for 2027+ production.' },
        { type: 'Sodium-ion', voltage: '~3 V', energy: '~140-160 Wh/kg', notes: 'Emerging alternative. Sodium more abundant than lithium. CATL launched 2023.' },
        { type: 'Zinc-air', voltage: '~1.4 V', energy: '~400+ Wh/kg (theoretical)', notes: 'Hearing aids (long runtime). Air activates when tab pulled.' },
        { type: 'Silver-oxide', voltage: '~1.55 V', energy: '~130 Wh/kg', notes: 'Watch batteries. Stable voltage curve.' },
        { type: 'Flow battery (vanadium)', voltage: '~1.4 V/cell', energy: '~25 Wh/kg', notes: 'Grid storage. Tanks scale separately from cells. 20+ yr life.' }
      ];

      var ENERGY_SOURCES = [
        { source: 'Coal', share: '~26% global electricity (2024)', cost: 'low fuel, high external cost', notes: 'Highest CO₂ per kWh. Pollutants: SOx, NOx, mercury, PM2.5. Declining in OECD, still growing in some Asia.' },
        { source: 'Natural gas', share: '~22%', cost: 'low-medium', notes: '~½ CO₂ of coal. Methane leaks during extraction offset some benefit. Fast-ramping for grid balancing.' },
        { source: 'Nuclear', share: '~10%', cost: 'high upfront, low fuel', notes: 'Zero CO₂. Long-lived radioactive waste. New small modular reactors (SMRs) in development.' },
        { source: 'Hydroelectric', share: '~16%', cost: 'high upfront, near-zero fuel', notes: 'Mature. Ecological + community impacts (Three Gorges, Itaipu). Pumped storage = grid battery.' },
        { source: 'Wind (onshore + offshore)', share: '~7-8% rising', cost: 'low operating', notes: 'Variable. Offshore typically more consistent + larger turbines.' },
        { source: 'Solar PV', share: '~5-6% rising fast', cost: 'low operating', notes: 'Modular. Costs dropped ~10× in last decade. Often paired with batteries.' },
        { source: 'Solar thermal (CSP)', share: '<1%', cost: 'medium', notes: 'Mirrors concentrate sunlight to heat fluid → steam turbine. Can store heat overnight.' },
        { source: 'Geothermal', share: '<1%', cost: 'medium', notes: 'Limited to volcanically active regions. Iceland 65% geothermal.' },
        { source: 'Biomass', share: '~2%', cost: 'medium', notes: 'Burning wood, crops. Carbon-neutral IF sustainably grown. Air pollution issues.' },
        { source: 'Tidal + wave', share: '<1%', cost: 'high', notes: 'Predictable (tides) but limited sites + high engineering cost.' },
        { source: 'Hydrogen (storage/carrier)', share: 'minimal', cost: 'high', notes: 'Not a primary source — must be produced (from gas, electrolysis). Heavy industry decarbonization role.' },
        { source: 'Fusion (research)', share: '0%', cost: 'still experimental', notes: 'ITER + private companies (CFS, Helion, TAE). Net energy gain announced 2022. Commercial: still distant.' }
      ];

      var FAMOUS_CIRCUITS = [
        { name: 'Wheatstone bridge', use: 'Measure unknown resistance via null detection', notes: 'Strain gauges, sensor interfaces. Invented 1833 (Hunter Christie), popularized by Charles Wheatstone.' },
        { name: 'Voltage divider', use: 'Split voltage in known ratio', notes: 'V_out = V_in × R₂/(R₁+R₂). Used everywhere.' },
        { name: 'Current mirror', use: 'Copy current from one branch to another', notes: 'Basic op-amp building block.' },
        { name: 'Schmitt trigger', use: 'Clean noisy digital signals via hysteresis', notes: 'Two thresholds prevent rapid toggling on noisy edge.' },
        { name: '555 timer (astable)', use: 'Generate square wave / clock', notes: 'Frequency set by R + C. Was rumored to make up >1% of all chips made (probably exaggerated but iconic).' },
        { name: '555 timer (monostable)', use: 'Single pulse of defined duration', notes: 'One-shot. Pulse length T = 1.1 × R × C.' },
        { name: 'Class A amplifier', use: 'Linear amplification', notes: 'Always on. Low distortion, low efficiency (~25%). Audiophile single-ended designs.' },
        { name: 'Class AB amplifier', use: 'Linear amplification', notes: 'Push-pull. ~50-70% efficient. Most audio amps.' },
        { name: 'Class D amplifier', use: 'Switching amplification', notes: 'PWM. ~90%+ efficient. Modern portable + auto audio.' },
        { name: 'Common emitter (BJT)', use: 'Voltage amplification', notes: 'Standard amplifier configuration. Inverts signal.' },
        { name: 'Common collector (emitter follower)', use: 'Buffer (current gain, voltage gain ≈ 1)', notes: 'High input Z, low output Z. Impedance matching.' },
        { name: 'H-bridge', use: 'Drive motor in either direction', notes: '4 switches (often MOSFETs). Reverses motor polarity.' },
        { name: 'Boost converter', use: 'DC-DC step-up', notes: 'Inductor + switch + diode + capacitor. Powers higher-V circuits from lower-V battery.' },
        { name: 'Buck converter', use: 'DC-DC step-down', notes: 'Most efficient way to reduce DC voltage. Dominant in modern electronics.' },
        { name: 'Phase-locked loop (PLL)', use: 'Lock onto + multiply frequency', notes: 'CPU clocks, FM demodulation, radio synthesis.' },
        { name: 'Sample-and-hold', use: 'Capture momentary voltage for ADC', notes: 'Switch + capacitor. Holds voltage while ADC measures.' },
        { name: 'Charge pump', use: 'Generate higher voltage with no inductor', notes: 'Caps + switches. Used inside chips for internal high voltage.' },
        { name: 'Cockcroft-Walton multiplier', use: 'Very high voltage from low AC', notes: 'Cascade of diodes + caps. Old TV CRT supplies, particle accelerators.' },
        { name: 'Power-over-Ethernet (PoE)', use: 'Power + data on one Ethernet cable', notes: 'Up to 100 W (PoE++) on Cat 5+ cable. Used for IP phones, cameras, access points.' }
      ];

      var COMPUTER_HISTORY = [
        { year: '~150 BCE', what: 'Antikythera mechanism', detail: 'Ancient Greek bronze analog computer for astronomical calculations. Discovered 1901.' },
        { year: '1642', what: 'Pascal\'s calculator', detail: 'Mechanical adder using gears. One of first calculating machines.' },
        { year: '1837', what: 'Analytical Engine (Babbage)', detail: 'Programmable mechanical computer design. Never fully built. Ada Lovelace wrote first algorithm.' },
        { year: '1936', what: 'Turing machine concept', detail: 'Alan Turing\'s mathematical model of computation. Foundation of computer science.' },
        { year: '1937', what: 'Z1 (Konrad Zuse)', detail: 'First programmable mechanical computer. Used binary.' },
        { year: '1944', what: 'Mark I (Harvard, IBM)', detail: 'Electromechanical. 16 m long, 5 tons. Programmed via punched paper tape.' },
        { year: '1945', what: 'ENIAC', detail: 'First general-purpose electronic computer. 17,000+ vacuum tubes. Programmed by physically rewiring.' },
        { year: '1947', what: 'Transistor (Bell Labs)', detail: 'Bardeen, Brattain, Shockley. Replaced vacuum tubes. Nobel 1956.' },
        { year: '1958', what: 'Integrated circuit', detail: 'Jack Kilby (TI) + Robert Noyce (Fairchild). Multiple transistors on one chip.' },
        { year: '1971', what: 'Intel 4004', detail: 'First commercial microprocessor. 2,300 transistors. 4-bit CPU.' },
        { year: '1973', what: 'Xerox Alto', detail: 'First computer with GUI, mouse, ethernet. Inspired Macintosh + Windows.' },
        { year: '1975', what: 'Altair 8800', detail: 'First commercial PC kit. Bill Gates + Paul Allen wrote BASIC for it.' },
        { year: '1976', what: 'Apple I', detail: 'Jobs + Wozniak. Hand-built. Sold for $666.66.' },
        { year: '1977', what: 'Apple II, TRS-80, Commodore PET', detail: 'Personal computer revolution begins.' },
        { year: '1981', what: 'IBM PC', detail: 'Open architecture. Spawned the PC industry.' },
        { year: '1983', what: 'TCP/IP', detail: 'Internet protocol standardized. ARPANET converted in January.' },
        { year: '1984', what: 'Macintosh', detail: 'First mass-market GUI computer. "1984" Super Bowl ad.' },
        { year: '1989', what: 'World Wide Web', detail: 'Tim Berners-Lee at CERN proposes WWW. Released publicly 1991.' },
        { year: '1991', what: 'Linux 0.01', detail: 'Linus Torvalds posts to comp.os.minix. Now powers most servers, Android.' },
        { year: '1993', what: 'Mosaic browser', detail: 'First popular web browser with images. Led to Netscape (1994).' },
        { year: '1995', what: 'JavaScript, Java, Windows 95', detail: 'Pivotal year. Brendan Eich writes JS in 10 days for Netscape.' },
        { year: '1998', what: 'Google founded', detail: 'PageRank algorithm. Search becomes lucrative.' },
        { year: '2007', what: 'iPhone', detail: 'Modern smartphone. Capacitive touch + responsive UI standard.' },
        { year: '2008', what: 'Bitcoin whitepaper', detail: 'Satoshi Nakamoto. Proof-of-work blockchain.' },
        { year: '2012', what: 'AlexNet', detail: 'Deep CNN wins ImageNet by huge margin. Modern AI era begins.' },
        { year: '2017', what: 'Transformer architecture', detail: '"Attention is All You Need". Foundation of GPT, BERT, modern LLMs.' },
        { year: '2022', what: 'ChatGPT', detail: 'Mass-market LLM. 100M users in 2 months.' }
      ];

      var WORLD_ELECTRIC = [
        { region: 'Per capita electricity (US)', detail: '~12,500 kWh/yr per person. Among highest globally.' },
        { region: 'Per capita (Iceland)', detail: '~55,000 kWh/yr — highest globally. Cheap geothermal + hydro.' },
        { region: 'Per capita (Germany)', detail: '~7,000 kWh/yr.' },
        { region: 'Per capita (China)', detail: '~5,500 kWh/yr — risen rapidly from <500 in 1990.' },
        { region: 'Per capita (India)', detail: '~1,300 kWh/yr.' },
        { region: 'Per capita (sub-Saharan Africa avg)', detail: '~500 kWh/yr — many regions still developing grid access.' },
        { region: 'Without electricity', detail: '~675 million people lack reliable access (2024 IEA). Most in sub-Saharan Africa.' },
        { region: 'Top renewable share', detail: 'Iceland ~100%, Norway ~98% (hydro + small geothermal). Costa Rica ~95%.' },
        { region: 'Biggest CO₂ per kWh', detail: 'Coal-heavy grids: India, China, South Africa, Australia, Poland. ~800-1100 g CO₂/kWh.' },
        { region: 'Cleanest grids', detail: 'France ~50 g CO₂/kWh (nuclear). Iceland + Norway near zero (hydro/geo).' },
        { region: 'Grid voltage standards', detail: '120/240 V (Americas, Japan), 220/240 V (rest). 50 Hz almost everywhere except Americas (60 Hz).' },
        { region: 'Plug types', detail: '15+ standards. EU pushing for universal USB-C for devices.' },
        { region: 'Transmission voltages', detail: '~110-765 kV AC for long-distance. HVDC up to ±1100 kV (China). Higher V → less loss for same power.' },
        { region: 'Largest power plants', detail: 'Three Gorges (China): 22.5 GW hydro. Tarbela (Pakistan): 6 GW hydro. Kashiwazaki-Kariwa (Japan): 7.9 GW nuclear (idle since 2011).' }
      ];

      function renderBatteriesSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔋 Battery technologies'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('caption', { className: 'sr-only' }, 'Battery technology comparison'),
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Type', 'Voltage', 'Energy density', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                BATTERY_TYPES.map(function(b, i) {
                  return h('tr', { key: 'b'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('th', { scope: 'row', className: 'px-2 py-1 text-left font-bold text-slate-800' }, b.type),
                    h('td', { className: 'px-2 py-1 font-mono text-amber-700 font-bold text-[0.625rem]' }, b.voltage),
                    h('td', { className: 'px-2 py-1 font-mono text-slate-700 text-[0.625rem]' }, b.energy),
                    h('td', { className: 'px-2 py-1 text-slate-600 text-[0.625rem] italic' }, b.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderEnergySection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚡ Electricity generation sources'),
          h('div', { className: 'space-y-2' },
            ENERGY_SOURCES.map(function(s, i) {
              return h('div', { key: 's'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, s.source),
                  h('span', { className: 'text-[0.625rem] text-amber-700 font-mono ml-auto' }, s.share)
                ),
                h('div', { className: 'text-[0.6875rem] text-slate-700 mb-1' }, h('strong', null, 'Cost: '), s.cost),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, s.notes)
              );
            })
          )
        );
      }

      function renderFamouscircSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎛 Famous circuit building blocks'),
          h('div', { className: 'space-y-2' },
            FAMOUS_CIRCUITS.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-slate-800 mb-1' }, c.name),
                h('div', { className: 'text-[0.6875rem] text-amber-700 font-bold mb-1' }, 'Use: ' + c.use),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, c.notes)
              );
            })
          )
        );
      }

      function renderComputersSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '💻 Computer history timeline'),
          h('div', { className: 'space-y-1' },
            COMPUTER_HISTORY.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-amber-400 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 flex-wrap' },
                  h('span', { className: 'text-[0.625rem] font-mono text-amber-700 font-bold' }, c.year),
                  h('span', { className: 'text-[0.75rem] font-black text-amber-900' }, c.what)
                ),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, c.detail)
              );
            })
          )
        );
      }

      function renderWorldSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🌐 Electricity around the world'),
          h('div', { className: 'space-y-2' },
            WORLD_ELECTRIC.map(function(w, i) {
              return h('div', { key: 'w'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-amber-400 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-amber-900 mb-0.5' }, w.region),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, w.detail)
              );
            })
          )
        );
      }

      // ═════════════════════════════════════════════════════════════════════
      // ROUND 3 EXPANSION (2026-05-31)
      // ═════════════════════════════════════════════════════════════════════

      var MICROCONTROLLERS = [
        { name: 'Arduino Uno (ATmega328P)', specs: '8-bit, 16 MHz, 32 KB flash, 2 KB RAM', notes: 'Most popular education board. 14 digital, 6 analog I/O. 5 V logic.' },
        { name: 'ESP32', specs: '32-bit dual-core, 240 MHz, 4 MB flash', notes: 'Wi-Fi + Bluetooth built in. Hugely popular in IoT. Inexpensive.' },
        { name: 'Raspberry Pi Pico (RP2040)', specs: '32-bit dual-core ARM, 133 MHz, 264 KB RAM', notes: '$4. PIO state machines for custom I/O. MicroPython or C/C++.' },
        { name: 'STM32 (ARM Cortex-M)', specs: 'Wide range: M0 to M7, 32 KB to 2 MB flash', notes: 'Industry standard for embedded. Powerful peripherals.' },
        { name: 'Teensy 4.x', specs: '32-bit ARM Cortex-M7, 600 MHz', notes: 'Very fast. Arduino-compatible. Used in pro audio, DIY MIDI.' },
        { name: 'Raspberry Pi (full)', specs: '64-bit ARM, 1.5+ GHz, runs Linux', notes: 'Single-board computer, not microcontroller. Pi 5 = real desktop performance.' },
        { name: 'BBC micro:bit', specs: '32-bit ARM, 16 MHz', notes: 'Education-focused. Built-in LEDs, accelerometer, Bluetooth. Block-based + Python coding.' },
        { name: 'PIC microcontrollers', specs: '8 to 32-bit, varies', notes: 'Microchip Technology. Common in industrial + consumer products.' },
        { name: 'AVR (Atmel)', specs: '8-bit, various', notes: 'ATmega + ATtiny families. Arduino built on these.' },
        { name: 'ESP8266', specs: '32-bit, 80 MHz, Wi-Fi', notes: 'Predecessor of ESP32. Cheap Wi-Fi MCU.' }
      ];

      var COMMON_ICS = [
        { ic: 'NE555 (timer)', use: 'Oscillator, PWM, monostable. Iconic chip.', notes: 'Released 1972. Billions sold. Easy to learn, infinitely useful.' },
        { ic: '741 op-amp', use: 'General-purpose amplifier.', notes: 'Classic but now superseded. LM358, MCP6002 better choices for new designs.' },
        { ic: '74HC00 series (logic)', use: 'NAND, NOR, AND, OR, flip-flops, counters.', notes: 'Modern CMOS replacements for older 74LS series.' },
        { ic: 'LM7805 (voltage regulator)', use: 'Linear 5 V regulator.', notes: '~1 A output. Heat sink needed for higher currents. Newer switching alternatives are more efficient.' },
        { ic: 'LM317 (adjustable regulator)', use: 'Adjustable 1.25-37 V output.', notes: 'Two resistors set output voltage.' },
        { ic: 'ULN2003 (Darlington array)', use: 'Drive relays, motors, LEDs from logic-level signals.', notes: '7 channels at up to 500 mA each.' },
        { ic: 'L298N (motor driver)', use: 'Drive 2 DC motors or 1 stepper.', notes: 'H-bridge. Common in robotics. Replaced by more efficient MOSFET drivers in newer designs.' },
        { ic: 'DS18B20 (digital thermometer)', use: 'Temperature sensor with 1-wire interface.', notes: 'Range −55 to +125°C. 9-12 bit resolution.' },
        { ic: 'MCP3008 (8-channel ADC)', use: 'Add analog input to a digital MCU.', notes: '10-bit, SPI. Common with Raspberry Pi (which has no built-in ADC).' },
        { ic: 'MAX7219 (LED matrix driver)', use: 'Drive 8×8 LED matrix or 7-segment displays.', notes: 'SPI interface. Cascade multiple modules.' },
        { ic: 'WS2812 (Neopixel)', use: 'Individually addressable RGB LEDs.', notes: 'Single data line. Chain hundreds together.' },
        { ic: 'CD4017 (decade counter)', use: 'Sequence through 10 outputs.', notes: 'Common in chaser-light projects.' }
      ];

      var DIGITAL_PROTOCOLS = [
        { protocol: 'GPIO', wires: '1+ per signal', notes: 'General-purpose I/O. Read/write digital high/low. Simplest.' },
        { protocol: 'PWM', wires: '1', notes: 'Pulse-width modulation. Vary average voltage by changing duty cycle. Used for motors, LEDs, audio.' },
        { protocol: 'I²C', wires: '2 (SDA, SCL) + power + ground', notes: 'Multi-device bus. Each device has 7-bit address. Slow (~100 kHz, 400 kHz, 1 MHz, 5 MHz).' },
        { protocol: 'SPI', wires: '4 (MOSI, MISO, SCK, SS) + power', notes: 'Faster than I²C (up to 50+ MHz). Requires extra SS pin per device.' },
        { protocol: 'UART (serial)', wires: '2 (TX, RX) + power', notes: 'Asynchronous. Common baud rates: 9600, 115200. Used for debug consoles.' },
        { protocol: 'USB', wires: '4 (D+, D−, VBUS, GND)', notes: '1.5 Mbps (Low) to 80 Gbps (USB4 v2). Hot-pluggable, powered.' },
        { protocol: 'CAN bus', wires: '2 differential', notes: 'Used in cars + industrial. Robust to noise.' },
        { protocol: '1-Wire', wires: '1 (+ ground)', notes: 'Dallas/Maxim. Power + data on same wire (parasitic power). DS18B20 thermometer uses it.' },
        { protocol: 'I²S', wires: '3 (BCLK, LRCLK, DATA)', notes: 'Digital audio between chips. 16/24/32-bit samples at various rates.' },
        { protocol: 'Ethernet', wires: '4 twisted pairs (RJ45)', notes: '10 Mbps to 100+ Gbps. PoE can deliver up to 100 W.' }
      ];

      var SENSORS = [
        { sensor: 'Potentiometer', measures: 'Position (angle or linear)', notes: 'Variable resistor. Volume knobs, joysticks.' },
        { sensor: 'Photoresistor (LDR)', measures: 'Light intensity', notes: 'Resistance drops with brighter light. Cheap, slow.' },
        { sensor: 'Photodiode', measures: 'Light intensity', notes: 'Fast. Used in optical receivers, sun trackers, solar cells.' },
        { sensor: 'Thermistor (NTC)', measures: 'Temperature', notes: 'Resistance decreases with temperature. Cheap. Non-linear.' },
        { sensor: 'RTD (Pt100, Pt1000)', measures: 'Temperature', notes: 'Very accurate + linear. More expensive than thermistors.' },
        { sensor: 'Thermocouple (J, K, T types)', measures: 'Temperature', notes: 'Wide range (−200 to +1700°C). Self-generates voltage from temperature difference.' },
        { sensor: 'Infrared (PIR)', measures: 'Motion (warm objects)', notes: 'Passive — detects changes in IR. Cheap motion sensor in security lights.' },
        { sensor: 'Ultrasonic (HC-SR04)', measures: 'Distance (~2 cm - 4 m)', notes: 'Measures time-of-flight of 40 kHz pulses. Cheap, popular for robotics.' },
        { sensor: 'Time-of-flight (VL53L0X)', measures: 'Distance via laser', notes: 'mm-resolution. Less interference than ultrasonic.' },
        { sensor: 'IMU (MPU-6050, BNO055)', measures: 'Acceleration + rotation', notes: '6 or 9-axis. Drones, AR/VR, motion tracking.' },
        { sensor: 'Hall effect sensor', measures: 'Magnetic field', notes: 'Voltage proportional to field. Speed sensors, contactless switches.' },
        { sensor: 'Pressure (BMP280)', measures: 'Air pressure', notes: 'Used as altimeter (1 hPa ≈ 8 m elevation change).' },
        { sensor: 'Humidity (DHT22, SHT3x)', measures: 'Relative humidity + temperature', notes: 'Common in HVAC + weather stations.' },
        { sensor: 'pH probe', measures: 'pH of liquid', notes: 'Glass-electrode based. Used in aquaponics, water quality.' },
        { sensor: 'CO₂ (MH-Z19, SCD30)', measures: 'CO₂ concentration', notes: 'NDIR-based. Used for ventilation control (CO₂ proxies for human exhalation).' }
      ];

      var ACTUATORS = [
        { actuator: 'LED', purpose: 'Visual indicator', notes: 'Forward voltage 1.8-3.3 V. Always use current-limit resistor.' },
        { actuator: 'Buzzer (piezo)', purpose: 'Audio alert', notes: 'Active buzzer = built-in oscillator. Passive needs driving frequency.' },
        { actuator: 'Speaker', purpose: 'Audio output', notes: 'Needs amplifier for most volumes. Impedance matters (typically 4-8 Ω).' },
        { actuator: 'DC motor', purpose: 'Continuous rotation', notes: 'Speed via PWM. Direction via H-bridge.' },
        { actuator: 'Servo (RC)', purpose: 'Position control 0-180° (typically)', notes: 'PWM 50 Hz, 1-2 ms pulse width. Internal feedback + controller.' },
        { actuator: 'Stepper motor', purpose: 'Precise position steps', notes: 'Step-and-direction or full 4-coil drive. Open-loop precision.' },
        { actuator: 'Relay (electromechanical)', purpose: 'High-power switching', notes: 'Logic signal switches separate AC/DC circuit. Audible click.' },
        { actuator: 'Solid-state relay (SSR)', purpose: 'Silent, fast switching', notes: 'Triac or MOSFET inside. Zero-crossing types for AC.' },
        { actuator: 'Solenoid', purpose: 'Linear push/pull', notes: 'Coil pulls iron core when energized. Door locks, pinball flippers.' },
        { actuator: 'Linear actuator', purpose: 'Slow, powerful linear motion', notes: 'Motor + lead screw. TV mounts, standing desks.' },
        { actuator: 'Heating element', purpose: 'Generate heat', notes: 'Resistive (Joule heating). Used with PID control for precise temperature.' },
        { actuator: 'Peltier (thermoelectric)', purpose: 'Cool or heat by electric current', notes: 'One side gets cold, other hot. Mini coolers, thermal cycling.' },
        { actuator: 'Pump (DC)', purpose: 'Move fluid', notes: 'Centrifugal, peristaltic, diaphragm. Hydroponics, dosing.' },
        { actuator: 'LCD display', purpose: 'Show text or graphics', notes: '16×2 character LCDs (HD44780) very common. Graphic OLEDs cheaper now.' },
        { actuator: 'OLED display (SSD1306)', purpose: 'Show graphics', notes: 'Tiny (0.96") I²C. Sharp, no backlight.' }
      ];

      var PCB_TOPICS = [
        { topic: 'Layers', detail: 'Most PCBs: 2 layers (top + bottom). High-density: 4, 6, 8+ layers. Inner layers often power + ground planes.' },
        { topic: 'Vias', detail: 'Plated holes connecting layers. Through-hole (full thickness), blind (surface to inner), buried (inner to inner).' },
        { topic: 'Traces', detail: 'Copper paths. Width determines current capacity (12 mil ~ 1 A on 1 oz copper).' },
        { topic: 'Ground plane', detail: 'Large copper area. Provides low-impedance return path + reduces EMI.' },
        { topic: 'Soldermask', detail: 'Insulating layer (usually green) over copper. Prevents bridging during assembly.' },
        { topic: 'Silkscreen', detail: 'Printed labels (usually white) on top of soldermask. Helps assembly + debug.' },
        { topic: 'Surface mount (SMT)', detail: 'Components soldered onto pads (no leads through holes). Smaller, mass-produced.' },
        { topic: 'Through-hole (THT)', detail: 'Component leads pass through holes + soldered on opposite side. Bigger, easier to hand-solder, mechanically stronger.' },
        { topic: 'Decoupling capacitors', detail: 'Small caps (typically 0.1 μF) near every IC power pin. Smooth supply, reduce noise.' },
        { topic: 'EMI/EMC', detail: 'Electromagnetic interference + compatibility. Shielding, ferrite beads, careful routing.' },
        { topic: 'Impedance control', detail: 'High-speed traces need controlled impedance (50 Ω typical). Trace width + layer stackup determine it.' },
        { topic: 'Differential pairs', detail: 'Two traces routed together. Used for USB, Ethernet, LVDS. Common-mode noise rejected.' },
        { topic: 'Design rules', detail: 'Minimum trace width, spacing, hole size. Determined by manufacturer + cost.' },
        { topic: 'Assembly file', detail: 'BOM (bill of materials), CPL (component placement list), Gerbers (per-layer artwork). Sent to manufacturer.' }
      ];

      var TROUBLESHOOTING = [
        { problem: 'No power', steps: 'Check battery/supply voltage with multimeter. Check fuse. Verify polarity. Check power switch.' },
        { problem: 'Burning smell or smoke', steps: 'Disconnect IMMEDIATELY. Often reversed polarity, shorted component, or under-rated part.' },
        { problem: 'Component getting hot', steps: 'Check current vs rating. Check for short circuit nearby. Add heat sink if appropriate.' },
        { problem: 'Intermittent operation', steps: 'Often a cold solder joint or loose connector. Wiggle test (gently!) while powered.' },
        { problem: 'Voltage drops under load', steps: 'Power supply current limit, undersized wires, or weak battery.' },
        { problem: 'Noisy signal', steps: 'Add decoupling caps, twist signal pairs, ferrite bead. Move away from switching power supplies.' },
        { problem: 'LED not lighting', steps: 'Check polarity (anode = +). Check current-limit resistor value. Probe forward voltage.' },
        { problem: 'Microcontroller not running', steps: 'Check 3.3 V or 5 V supply at MCU pin. Check reset line. Check crystal/clock if external.' },
        { problem: 'Code uploads but no execution', steps: 'Check programming setup, BOOT/RESET pins, oscillator. Power-on reset issue?' },
        { problem: 'Communication failure', steps: 'Verify baud rate match. Check TX↔RX cross. Add ground reference between devices.' },
        { problem: 'Motor runs the wrong direction', steps: 'Swap two of the motor leads (DC) or fix code (servo/stepper).' },
        { problem: 'Capacitor explodes', steps: 'Either exceeded voltage rating or reversed polarity. ALWAYS check before powering.' }
      ];

      var SIM_TOOLS = [
        { tool: 'LTspice', use: 'Analog circuit simulation. Free. Industry standard for switching power supply design.' },
        { tool: 'KiCad', use: 'Open-source PCB design. Free. Schematic, layout, 3D viewer, autorouter.' },
        { tool: 'Altium Designer', use: 'Industry-leading PCB design. Commercial. Used for complex products.' },
        { tool: 'Eagle (Autodesk)', use: 'PCB design. Was popular for hobbyists. Discontinued; transitioning to Fusion Electronics.' },
        { tool: 'CircuitJS / Falstad', use: 'Browser-based interactive circuit simulator. Great for visualizing current + voltage.' },
        { tool: 'Tinkercad Circuits', use: 'Beginner-friendly. Drag-and-drop. Simulates Arduino code.' },
        { tool: 'Multisim (NI)', use: 'Educational circuit simulator. Often used in college labs.' },
        { tool: 'Proteus', use: 'PCB + microcontroller co-simulation. Commercial.' },
        { tool: 'Wokwi', use: 'Browser-based Arduino/ESP32 simulator. Good for learning + testing without hardware.' },
        { tool: 'PSpice', use: 'Industrial-grade analog simulator. Now owned by Cadence.' }
      ];

      var STANDARDS = [
        { standard: 'AC mains: 120 V / 60 Hz', region: 'US, Canada, Mexico, parts of South America + Asia', notes: 'Type A/B plugs (US). Hot, neutral, ground.' },
        { standard: 'AC mains: 230 V / 50 Hz', region: 'Europe, most of Asia + Africa + Australia', notes: 'Various plug types (C, F, G/UK, I/AU).' },
        { standard: 'AC mains: 100 V / 50-60 Hz', region: 'Japan', notes: '50 Hz east, 60 Hz west (Tokyo vs Osaka).' },
        { standard: 'USB Type-A', region: 'Worldwide', notes: 'Traditional rectangular. USB 1.0-3.0. Being replaced by Type-C.' },
        { standard: 'USB Type-C', region: 'Worldwide', notes: 'Reversible. Up to 240 W (USB-PD 3.1). Up to 80 Gbps (USB4 v2). EU mandates for new mobiles.' },
        { standard: 'Lightning (Apple)', region: 'Apple devices (pre-2024)', notes: 'Apple proprietary. iPhone 15+ switched to USB-C (EU regulation).' },
        { standard: 'XLR', region: 'Pro audio', notes: '3-pin (balanced microphone), 4-7 pin variants. Locking connector.' },
        { standard: '1/4" TRS / TS', region: 'Musical instruments + headphones', notes: 'Guitar cables, headphone jacks (also 3.5 mm version).' },
        { standard: 'RJ45 (Ethernet)', region: 'Worldwide', notes: '8 pins, 4 pairs. Cat 5e (1 Gbps), Cat 6 (10 Gbps short runs), Cat 8 (40 Gbps).' },
        { standard: 'HDMI', region: 'Worldwide', notes: 'Audio + video. HDMI 2.1: 48 Gbps, 8K@60.' },
        { standard: 'DisplayPort', region: 'Worldwide', notes: 'Computer displays. DP 2.0: 80 Gbps. Common on monitors.' },
        { standard: 'GPIB / IEEE-488', region: 'Test equipment', notes: 'Old but persistent. Bench multimeters, scopes.' }
      ];

      var ELEC_CAREERS = [
        { career: 'Electrical engineer', detail: 'Design power systems, motors, transformers. Utility scale to portable devices.' },
        { career: 'Electronics engineer', detail: 'Design circuit boards, embedded systems. Signal processing, power electronics.' },
        { career: 'Embedded software engineer', detail: 'Firmware for microcontrollers. C/C++, RTOS. Bridges hardware + software.' },
        { career: 'PCB designer', detail: 'Schematic capture + board layout. Trace routing, signal integrity.' },
        { career: 'Power systems engineer', detail: 'Grid design, generation, transmission. Renewable integration.' },
        { career: 'RF engineer', detail: 'Antennas, wireless systems, radar. Touches everything from satellites to Wi-Fi chips.' },
        { career: 'Field service technician', detail: 'Install + repair industrial equipment, telecom systems, medical devices.' },
        { career: 'Lineworker', detail: 'Install + maintain power lines. Demanding + dangerous; well-paid skilled trade.' },
        { career: 'Electrician', detail: 'Install + maintain building wiring. Residential, commercial, industrial. Licensed trade.' },
        { career: 'Robotics engineer', detail: 'Combines electrical + mechanical + software. Industrial robots, drones, self-driving.' },
        { career: 'Test engineer', detail: 'Validates products. ESD, EMC, environmental, life testing.' },
        { career: 'Audio engineer', detail: 'Equipment design, mixing, mastering. Live sound + studio.' },
        { career: 'Maker / hobbyist', detail: 'Open path with Arduino, RPi, ESP32. Some become professionals; many enjoy as creative outlet.' }
      ];

      function renderMicroSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🧠 Microcontrollers'),
          h('div', { className: 'space-y-2' },
            MICROCONTROLLERS.map(function(m, i) {
              return h('div', { key: 'm'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, m.name),
                  h('span', { className: 'text-[0.625rem] text-amber-700 font-mono ml-auto px-2 py-0.5 rounded bg-amber-100' }, m.specs)
                ),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, m.notes)
              );
            })
          )
        );
      }

      function renderIcsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⬚ Common integrated circuits'),
          h('div', { className: 'space-y-2' },
            COMMON_ICS.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-slate-800 mb-1' }, c.ic),
                h('div', { className: 'text-[0.6875rem] text-amber-700 font-bold mb-1' }, c.use),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, c.notes)
              );
            })
          )
        );
      }

      function renderProtosSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '↔ Digital communication protocols'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('caption', { className: 'sr-only' }, 'Digital communication protocols'),
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Protocol', 'Wires', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                DIGITAL_PROTOCOLS.map(function(p, i) {
                  return h('tr', { key: 'p'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('th', { scope: 'row', className: 'px-2 py-1 text-left font-bold text-slate-800' }, p.protocol),
                    h('td', { className: 'px-2 py-1 font-mono text-amber-700 text-[0.625rem]' }, p.wires),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[0.625rem]' }, p.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderSensorsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '◉ Sensors'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('caption', { className: 'sr-only' }, 'Electronic sensor reference'),
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Sensor', 'Measures', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                SENSORS.map(function(s, i) {
                  return h('tr', { key: 's'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('th', { scope: 'row', className: 'px-2 py-1 text-left font-bold text-slate-800' }, s.sensor),
                    h('td', { className: 'px-2 py-1 text-amber-700 font-medium text-[0.625rem]' }, s.measures),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[0.625rem]' }, s.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderActuatorsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '⚙ Actuators + outputs'),
          h('div', { className: 'overflow-x-auto' },
            h('table', { className: 'min-w-full text-[0.6875rem] border-collapse' },
              h('caption', { className: 'sr-only' }, 'Electronic actuator reference'),
              h('thead', null,
                h('tr', { className: 'bg-slate-100' },
                  ['Actuator', 'Purpose', 'Notes'].map(function(hh, i) {
                    return h('th', { key: 'h'+i, scope: 'col', className: 'px-2 py-1 text-left font-bold text-slate-700 border-b border-slate-300' }, hh);
                  })
                )
              ),
              h('tbody', null,
                ACTUATORS.map(function(a, i) {
                  return h('tr', { key: 'a'+i, className: i % 2 === 0 ? 'bg-white' : 'bg-slate-50' },
                    h('th', { scope: 'row', className: 'px-2 py-1 text-left font-bold text-slate-800' }, a.actuator),
                    h('td', { className: 'px-2 py-1 text-amber-700 font-medium text-[0.625rem]' }, a.purpose),
                    h('td', { className: 'px-2 py-1 text-slate-700 text-[0.625rem]' }, a.notes)
                  );
                })
              )
            )
          )
        );
      }

      function renderPcbSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '▦ PCB design concepts'),
          h('div', { className: 'space-y-1' },
            PCB_TOPICS.map(function(p, i) {
              return h('div', { key: 'p'+i, className: 'p-2 rounded bg-slate-50 border-l-2 border-l-amber-400 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-amber-900 mb-0.5' }, p.topic),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, p.detail)
              );
            })
          )
        );
      }

      function renderTroubleshootSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🛠 Troubleshooting checklist'),
          h('div', { className: 'space-y-2' },
            TROUBLESHOOTING.map(function(t, i) {
              return h('div', { key: 't'+i, className: 'p-3 rounded-lg bg-slate-50 border-l-4 border-l-amber-400 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-amber-900 mb-0.5' }, t.problem),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, t.steps)
              );
            })
          )
        );
      }

      function renderSimulationSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🖥 Circuit simulation tools'),
          h('div', { className: 'space-y-2' },
            SIM_TOOLS.map(function(s, i) {
              return h('div', { key: 's'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-slate-800 mb-1' }, s.tool),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, s.use)
              );
            })
          )
        );
      }

      function renderStandardsSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '🔌 Standards, plugs, and connectors'),
          h('div', { className: 'space-y-2' },
            STANDARDS.map(function(s, i) {
              return h('div', { key: 's'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'flex items-baseline gap-2 mb-1 flex-wrap' },
                  h('span', { className: 'text-[0.75rem] font-black text-slate-800' }, s.standard),
                  h('span', { className: 'text-[0.625rem] text-amber-700 font-mono ml-auto px-2 py-0.5 rounded bg-amber-100' }, s.region)
                ),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, s.notes)
              );
            })
          )
        );
      }

      function renderCareersSection() {
        return h('div', { className: 'rounded-xl bg-white border border-slate-200 p-4 shadow-sm' },
          h('h4', { className: 'text-sm font-black text-slate-800 mb-2' }, '💼 Careers in electronics'),
          h('div', { className: 'space-y-2' },
            ELEC_CAREERS.map(function(c, i) {
              return h('div', { key: 'c'+i, className: 'p-3 rounded-lg bg-slate-50 border border-slate-200' },
                h('div', { className: 'text-[0.75rem] font-black text-amber-900 mb-0.5' }, c.career),
                h('div', { className: 'text-[0.6875rem] text-slate-700 leading-relaxed' }, c.detail)
              );
            })
          )
        );
      }

      var __circuitExpansions = h('div', { id: 'circuit-reference-panel', role: 'tabpanel', 'aria-labelledby': 'circuit-workspace-tab-reference', tabIndex: 0, className: 'mt-4 max-w-3xl mx-auto' },
        expHeader(),
        expTabBar(),
        expSection && h('div', { className: 'mt-2' }, renderActiveSection())
      );

      return h(React.Fragment, null,
        renderWorkspaceSwitch(),
        workspaceTab === 'reference' ? __circuitExpansions : h('div', { id: 'circuit-build-panel', role: 'tabpanel', 'aria-labelledby': 'circuit-workspace-tab-build', tabIndex: 0 }, __circuitMainView)
      );
    }
  });

  console.log('[StemLab] stem_tool_circuit.js loaded - Circuit Builder');
})();
