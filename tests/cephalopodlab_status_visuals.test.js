import {describe,it} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8');
function region(a,b){const start=source.indexOf(a),end=source.indexOf(b,start);assert.ok(start>=0&&end>start,a);return source.slice(start,end);}
const fractionSource=region('        function clHuntMeterFraction(','        function clHuntVitalMarkup(');
const meterSource=region('        function hudMeter(','        function hudText(');
const fraction=new Function(fractionSource+';return clHuntMeterFraction;')();

function fixture(){
  const writes=[],nodes={};
  for(const key of ['health','energy','stamina','camo']){
    const values={},style={};
    for(const property of ['transform','backgroundColor'])Object.defineProperty(style,property,{get(){return values[property];},set(value){values[property]=value;writes.push({key,property,value});}});
    nodes[key]={style};
  }
  const update=new Function('hudMeterNodes',fractionSource+'\nvar hudMeterValues={};\n'+meterSource+';return hudMeter;')(nodes);
  return {update,nodes,writes};
}

describe('Cephalopod Hunter visual status meters',()=>{
  it('represents remaining resources against their own species maximum and confines invalid values to the empty track',()=>{
    assert.equal(fraction(75,150),.5);assert.equal(fraction(60,120),.5);assert.equal(fraction(75,100),.75);assert.equal(fraction(.62,1),.62);
    assert.equal(fraction(-20,100),0);assert.equal(fraction(200,150),1);assert.equal(fraction(0,150),0);assert.equal(fraction(150,150),1);
    for(const value of [NaN,Infinity,-Infinity,undefined,null,'50',{}])assert.equal(fraction(value,100),0);
    for(const maximum of [0,-10,NaN,Infinity,-Infinity,undefined,null,'100',{}])assert.equal(fraction(50,maximum),0);
  });

  it('avoids repeated style mutations for unchanged frames while keeping value and palette changes independent',()=>{
    const f=fixture();f.update('health',75,150,'green');
    assert.deepEqual(f.writes,[{key:'health',property:'transform',value:'scaleX(0.5)'},{key:'health',property:'backgroundColor',value:'green'}]);
    f.writes.length=0;
    for(let frame=0;frame<120;frame++)f.update('health',150,300,'green');
    assert.deepEqual(f.writes,[]);
    f.update('health',75,150,'yellow');
    assert.deepEqual(f.writes,[{key:'health',property:'backgroundColor',value:'yellow'}]);
    f.writes.length=0;f.update('health',60,150,'yellow');
    assert.deepEqual(f.writes,[{key:'health',property:'transform',value:'scaleX(0.4)'}]);
    f.writes.length=0;f.update('energy',48,120,'yellow');
    assert.deepEqual(f.writes,[{key:'energy',property:'transform',value:'scaleX(0.4)'},{key:'energy',property:'backgroundColor',value:'yellow'}]);
    assert.equal(f.nodes.health.style.transform,'scaleX(0.4)');
  });

  it('recovers from unusable model values without writing invalid CSS or repainting an unchanged clamped endpoint',()=>{
    const f=fixture();f.update('stamina',NaN,100,'blue');
    assert.equal(f.nodes.stamina.style.transform,'scaleX(0)');f.writes.length=0;
    for(const value of [Infinity,-Infinity,-4])f.update('stamina',value,100,'blue');
    assert.deepEqual(f.writes,[]);
    f.update('stamina',50,100,'blue');assert.equal(f.nodes.stamina.style.transform,'scaleX(0.5)');
    f.update('stamina',150,100,'blue');assert.equal(f.nodes.stamina.style.transform,'scaleX(1)');
    f.writes.length=0;f.update('stamina',200,100,'blue');assert.deepEqual(f.writes,[]);
    f.update('stamina',75,100,'blue');assert.equal(f.nodes.stamina.style.transform,'scaleX(0.75)');
  });
});
