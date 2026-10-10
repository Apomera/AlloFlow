import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createContext, Script } from 'node:vm';
import { parse } from 'acorn';

const PATHS = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
const TEST_PATH = 'tests/watercycle_groundwater_flow.test.js';
const EXPECTED = [
  ['left-high', 3, 1, 'right'], ['equal', 2, 2, 'still'], ['right-high', 1, 3, 'left'],
];
const EMPTY = { setup:'left-high', answer:null, checked:false };
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const plain = value => JSON.parse(JSON.stringify(value));
const loadedAt = new Date().toISOString(), loadedTest = readFileSync(TEST_PATH);
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  visit(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(item => walk(item, visit));
    else if (value && typeof value === 'object') walk(value, visit);
  }
}
const sources = PATHS.map(path => {
  const bytes = readFileSync(path), text = bytes.toString('utf8');
  let initializer = null, exported = null;
  walk(parse(text, { ecmaVersion:'latest' }), node => {
    if (node.type === 'VariableDeclarator' && node.id?.name === 'WCGroundwaterFlow') {
      if (initializer) throw Error('Duplicate actual groundwater-flow initializer: ' + path);
      initializer = text.slice(node.init.start, node.init.end);
    }
    if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' &&
        node.left.object.name === 'window' && node.left.property.name === 'WaterCycleGroundwaterFlow' && node.right.name === 'WCGroundwaterFlow') {
      if (exported) throw Error('Duplicate actual groundwater-flow export: ' + path);
      exported = text.slice(node.start, node.end);
    }
  });
  if (!initializer || !exported) throw Error('Missing actual groundwater-flow initializer/export: ' + path);
  return { path, bytes, context:createContext({ window:{} }), script:new Script('var WCGroundwaterFlow = ' + initializer + ';\n' + exported + ';\n({helper:WCGroundwaterFlow,exported:window.WaterCycleGroundwaterFlow});', { filename:path + ':groundwater-flow' }) };
});
afterAll(() => {
  if (process.env.WATER_CYCLE_GROUNDWATER_FLOW_LOADED_REPORT) writeFileSync(process.env.WATER_CYCLE_GROUNDWATER_FLOW_LOADED_REPORT, JSON.stringify({
    loadedAt, completedAt:new Date().toISOString(),
    loadedRuntimes:sources.map(source => ({ path:source.path, sha256:sha(source.bytes), bytes:source.bytes.length })),
    loadedTest:{ path:TEST_PATH, sha256:sha(loadedTest), bytes:loadedTest.length },
  }, null, 2) + '\n');
});
function each(callback) {
  sources.forEach(source => {
    const runtime = source.script.runInContext(source.context, { timeout:30000 });
    callback(runtime.helper, runtime.exported, source);
  });
}
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze); Object.freeze(value);
  }
  return value;
}
const slot = (setup='left-high', answer='right', checked=true) => ({ setup,answer,checked });
const record = (identity='question-one', setup='left-high', answer='right', checked=true) => ({ identity,...slot(setup,answer,checked) });

describe('Water Cycle groundwater flow: the actual schematic comparison', () => {
  it('loads and exports the actual helper from identical shipped runtimes', () => {
    expect(sha(sources[0].bytes)).toBe(sha(sources[1].bytes));
    each((helper, exported) => { expect(exported).toBe(helper); expect(Array.from(helper.setups(), row => row.id)).toEqual(EXPECTED.map(row=>row[0])); });
  });
  it.each(EXPECTED)('%s compares horizontal head in the correct direction', (id,leftHead,rightHead,direction) => {
    each(helper => {
      const row = helper.descriptor(id);
      expect(row).toMatchObject({ id,leftHead,rightHead,direction });
      expect(row.label).toBeTruthy(); expect(row.leftLabel).toBeTruthy(); expect(row.rightLabel).toBeTruthy();
      expect(plain(helper.setups().find(candidate => candidate.id === id))).toEqual(plain(row));
      expect(row.direction).toBe(row.leftHead > row.rightHead ? 'right' : row.leftHead < row.rightHead ? 'left' : 'still');
    });
  });
  it('equal heads show no horizontal direction in this comparison and the reversed head arrangement reverses direction', () => {
    each(helper => {
      const equal = helper.descriptor('equal'), left = helper.descriptor('left-high'), right = helper.descriptor('right-high');
      expect(equal.leftHead).toBe(equal.rightHead); expect(equal.direction).toBe('still');
      expect(left.leftHead).toBe(right.rightHead); expect(left.rightHead).toBe(right.leftHead);
      expect(left.direction).toBe('right'); expect(right.direction).toBe('left');
      for (const row of helper.setups()) expect(Object.keys(row).sort()).toEqual(['direction','id','label','leftHead','leftLabel','rightHead','rightLabel']);
    });
  });
  it('returns independent descriptors so a view cannot change later physical meaning', () => {
    each(helper => {
      const expected = plain(helper.setups()), rows = helper.setups(), row = helper.descriptor('equal');
      rows[0].direction='left'; rows[1].leftHead=99; rows.push({ id:'fake' }); row.direction='right';
      expect(plain(helper.setups())).toEqual(expected); expect(plain(helper.descriptor('equal'))).toEqual(expected[1]);
    });
  });
  it('rejects unknown names, case changes, coerced values and prototype keys', () => {
    each(helper => { for (const id of [undefined,null,'','Left-high','down','toString','constructor','__proto__',1,{},['equal']]) expect(helper.descriptor(id)).toBeNull(); });
  });
});

describe('Water Cycle groundwater flow: isolated learner context and saved-state recovery', () => {
  it('retains every legitimate setup and prediction independently in Explorer and Check', () => {
    each(helper => {
      for (const [setup] of EXPECTED) for (const answer of ['left','right','still']) for (const checked of [false,true]) {
        const raw = { explorer:slot(setup,answer,checked), check:record('exact-key',setup,answer,checked) };
        expect(plain(helper.read(raw,'explorer'))).toEqual(slot(setup,answer,checked));
        expect(plain(helper.read(raw,'check','exact-key'))).toEqual(slot(setup,answer,checked));
        expect(helper.read(raw,'explorer')).not.toBe(raw.explorer);
      }
    });
  });
  it('returns null for unsupported scopes and missing Check identities', () => {
    each(helper => {
      for (const scope of [undefined,null,'','Explorer','quiz','__proto__',1,{},['explorer']]) {
        expect(helper.read({},scope,'key')).toBeNull(); expect(helper.transition({},scope,'key',{type:'check'})).toBeNull();
      }
      for (const identity of [undefined,null,'',1,true,{},['key']]) {
        expect(helper.read({},'check',identity)).toBeNull(); expect(helper.transition({},'check',identity,{type:'check'})).toBeNull();
      }
    });
  });
  it('requires the exact complete Check identity and cannot transfer an answer to another question', () => {
    each(helper => {
      const a='question-'+ 'x'.repeat(160)+'-one', b='question-'+ 'x'.repeat(160)+'-two';
      const raw={ explorer:slot('right-high','left'), check:record(a,'equal','still') };
      expect(plain(helper.read(raw,'check',a))).toEqual(slot('equal','still'));
      for (const identity of [b,a.toUpperCase(),a+' ',a.slice(0,160)]) expect(plain(helper.read(raw,'check',identity))).toEqual(EMPTY);
      const next=helper.transition(raw,'check',b,{type:'answer',value:'right'});
      expect(plain(next.check)).toEqual(record(b,'left-high','right',false));
      expect(plain(next.explorer)).toEqual(plain(raw.explorer)); expect(plain(raw.check)).toEqual(record(a,'equal','still'));
    });
  });
  it.each([
    ['missing',undefined], ['null',null], ['number',4], ['string','left-high'], ['array',[]], ['empty',{}],
    ['missing setup',{answer:'right',checked:true}], ['invented setup',{setup:'down',answer:'right',checked:true}],
    ['prototype setup',{setup:'__proto__',answer:'right',checked:true}], ['inherited setup',Object.create(slot('equal','still'))],
  ])('recovers a %s slot without moving an old answer to the fallback setup', (_label,bad) => {
    each(helper => {
      expect(plain(helper.read({explorer:bad},'explorer'))).toEqual(EMPTY);
      const check=bad && typeof bad==='object' && !Array.isArray(bad) ? Object.assign(Object.create(Object.getPrototypeOf(bad)),bad,{identity:'key'}) : bad;
      expect(plain(helper.read({check},'check','key'))).toEqual(EMPTY);
    });
  });
  it('accepts only literal prediction values and a true checked flag', () => {
    each(helper => {
      for (const answer of [undefined,null,'','Left',true,1,{},['right']]) expect(plain(helper.read({explorer:{setup:'equal',answer,checked:true}},'explorer'))).toEqual(slot('equal',null,false));
      for (const checked of [undefined,null,false,1,'true',[],{}]) expect(plain(helper.read({explorer:{setup:'equal',answer:'still',checked}},'explorer'))).toEqual(slot('equal','still',false));
    });
  });
  it('does not execute accessor or inherited context, identity or prediction fields', () => {
    each(helper => {
      let reads=0; const trap=()=>{ reads++; throw Error('Accessor must not execute'); };
      const raw=Object.defineProperty({},'explorer',{get:trap});
      expect(plain(helper.read(raw,'explorer'))).toEqual(EMPTY);
      const fields=Object.defineProperties({setup:'equal'},{answer:{get:trap},checked:{get:trap}});
      expect(plain(helper.read({explorer:fields},'explorer'))).toEqual(slot('equal',null,false));
      expect(plain(helper.read({explorer:Object.defineProperty({},'setup',{get:trap})},'explorer'))).toEqual(EMPTY);
      expect(plain(helper.read(Object.create({explorer:slot('equal','still')}),'explorer'))).toEqual(EMPTY);
      const check=Object.defineProperty(slot('equal','still'),'identity',{get:trap});
      expect(plain(helper.read({check},'check','key'))).toEqual(EMPTY);
      expect(plain(helper.read({check:Object.assign(Object.create({identity:'key'}),slot('equal','still'))},'check','key'))).toEqual(EMPTY);
      const inheritedAnswer=Object.assign(Object.create({answer:'still',checked:true}),{setup:'equal'});
      expect(plain(helper.read({explorer:inheritedAnswer},'explorer'))).toEqual(slot('equal',null,false));
      expect(reads).toBe(0);
    });
  });
  it('recovers from hostile and revoked proxies while discarding unreadable context', () => {
    each(helper => {
      const hostile=new Proxy({},{getOwnPropertyDescriptor(){ throw Error('Unreadable'); }}), revoked=Proxy.revocable({},{}); revoked.revoke();
      for (const raw of [hostile,revoked.proxy]) {
        expect(plain(helper.read(raw,'explorer'))).toEqual(EMPTY);
        expect(plain(helper.transition(raw,'explorer',null,{type:'answer',value:'left'}))).toEqual({explorer:slot('left-high','left',false),check:null});
      }
    });
  });
});

describe('Water Cycle groundwater flow: reversible setup and prediction transitions', () => {
  it.each(EXPECTED)('%s supports a wrong guess, check, revision and recheck without any model reward', (setup,_left,_right,direction) => {
    each(helper => {
      let raw=helper.transition(null,'explorer',null,{type:'setup',id:setup});
      raw=helper.transition(raw,'explorer',null,{type:'check'}); expect(raw.explorer.checked).toBe(false);
      const wrong=direction==='right'?'left':'right';
      raw=helper.transition(raw,'explorer',null,{type:'answer',value:wrong});
      expect(plain(raw.explorer)).toEqual(slot(setup,wrong,false));
      raw=helper.transition(raw,'explorer',null,{type:'check'}); expect(plain(raw.explorer)).toEqual(slot(setup,wrong,true));
      expect(raw.explorer.answer).not.toBe(helper.descriptor(setup).direction);
      raw=helper.transition(raw,'explorer',null,{type:'answer',value:direction}); expect(raw.explorer.checked).toBe(false);
      raw=helper.transition(raw,'explorer',null,{type:'check'}); expect(plain(raw.explorer)).toEqual(slot(setup,direction,true));
      expect(Object.keys(raw).sort()).toEqual(['check','explorer']);
    });
  });
  it('resets the answer for an actual setup change while retaining same-setup checked feedback', () => {
    each(helper => {
      for (const [setup] of EXPECTED) {
        const raw={ explorer:slot(setup,'right'),check:record('key','equal','still') };
        expect(plain(helper.transition(raw,'explorer',null,{type:'setup',id:setup}))).toEqual(raw);
        for (const [id] of EXPECTED.filter(row=>row[0]!==setup)) expect(plain(helper.transition(raw,'explorer',null,{type:'setup',id}).explorer)).toEqual(slot(id,null,false));
        expect(plain(helper.transition(raw,'explorer',null,{type:'answer',value:'right'}).explorer)).toEqual(slot(setup,'right',false));
      }
    });
  });
  it('preserves the other context as an independent copy for every valid action', () => {
    each(helper => {
      const raw=freeze({explorer:slot('right-high','left'),check:record('key','equal','still')});
      for (const action of [{type:'setup',id:'left-high'},{type:'answer',value:'right'},{type:'check'}]) {
        const explored=helper.transition(raw,'explorer',null,action), checked=helper.transition(raw,'check','key',action);
        expect(plain(explored.check)).toEqual(plain(raw.check)); expect(explored.check).not.toBe(raw.check);
        expect(plain(checked.explorer)).toEqual(plain(raw.explorer)); expect(checked.explorer).not.toBe(raw.explorer);
        explored.check.answer='left'; checked.explorer.setup='equal';
        expect(plain(raw)).toEqual({explorer:slot('right-high','left'),check:record('key','equal','still')});
      }
    });
  });
  it('ignores malformed actions, accessors and inherited action properties without touching feedback', () => {
    each(helper => {
      let reads=0; const trap=()=>{reads++;throw Error('Action accessor');};
      const raw={explorer:slot('equal','still'),check:record('key','right-high','left')};
      const hostile=new Proxy({},{getOwnPropertyDescriptor(){throw Error('Unreadable action');}}), revoked=Proxy.revocable({},{});revoked.revoke();
      for (const action of [undefined,null,{},[],'check',{type:'unknown'},{type:'setup',id:'toString'},{type:'answer',value:'yes'},
        Object.create({type:'check'}),Object.assign(Object.create({id:'left-high'}),{type:'setup'}),
        Object.defineProperty({},'type',{get:trap}),Object.defineProperty({type:'setup'},'id',{get:trap}),
        Object.defineProperty({type:'answer'},'value',{get:trap}),hostile,revoked.proxy]) {
        expect(plain(helper.transition(raw,'explorer',null,action))).toEqual(raw);
      }
      expect(reads).toBe(0);
    });
  });
  it('discards foreign score, scene, recharge, notebook and campaign metadata while retaining input bytes', () => {
    each(helper => {
      const raw=freeze({explorer:{...slot('equal','still'),climate:21,recharge:99},check:{...record('key'),score:100},
        landSaturation:65,wcQuiz:{score:9},researchPoints:25,notes:['Keep me'],campaign:{year:2,hoursLeft:9}});
      const before=JSON.stringify(raw);
      for (const scope of ['explorer','check']) {
        const next=helper.transition(raw,scope,'key',freeze({type:'setup',id:'right-high'}));
        expect(Object.keys(next).sort()).toEqual(['check','explorer']);
        expect(Object.keys(next.explorer).sort()).toEqual(['answer','checked','setup']);
        expect(Object.keys(next.check).sort()).toEqual(['answer','checked','identity','setup']);
      }
      expect(JSON.stringify(raw)).toBe(before);
    });
  });
});
