import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
const source=readFileSync('AlloFlowANTI.txt','utf8').replace(/\r\n/g,'\n');
const start=source.indexOf('        const serializeItems = (items, stripImages) => {'),end=source.indexOf('        const publishMediaReceipt =',start);
if(start<0||end<=start)throw Error('Missing offline serializer');
const serialize=new Function('window','warnLog',source.slice(start,end)+';return serializeItems;')(window,()=>{});
let describeDelivery,api;
beforeAll(()=>{
 loadAlloModule('instructional_context_module.js');loadAlloModule('firestore_sync_module.js');api=window.AlloModules.InstructionalContext;
 const shared=readFileSync('shared_activity_source.jsx','utf8');describeDelivery=new Function('window',shared.slice(shared.indexOf('function _alloReadingDeliveryCapabilities('),shared.indexOf('// Assignment packet shaping'))+';return _alloDescribeAssignmentDelivery;')(window);
});
const reopen=items=>window.hydrateHistory(JSON.parse(JSON.stringify(items)));
describe('host offline text-envelope preservation',()=>{
 it.each(['{"broken":','{"not":"text"}','null','42'])('keeps failed decoding unavailable across full and quota saves: %s',data=>{
  const item={id:'adapted',type:'simplified',data,dataEncoding:'json-text/v1',instructionalText:{form:'adapted',role:'supplemental'}};
  const before=JSON.stringify(item);
  for(const stripImages of [false,true]){
   let items=reopen([item]);
   for(let cycle=0;cycle<2;cycle++){
    items=reopen(serialize(items,stripImages));
    expect(items[0].data).toBe(data);
    expect(describeDelivery(items,item.id).readings[0]).toMatchObject({bodyStatus:'unavailable',bodyReason:'invalid-text-envelope'});
   }
  }
  expect(JSON.stringify(item)).toBe(before);
 });
 it.each(['"quoted prose"','{"not":"text"}','null','42'])('preserves valid explicitly encoded and plain text: %s',text=>{
  const original=api.createSupportedReading(text,{id:'original'});
  for(const item of [{...original,dataEncoding:'text/v1'},{...original,data:JSON.stringify(text),dataEncoding:'json-text/v1'}]){
   for(const stripImages of [false,true]){
    const [received]=reopen(serialize([item],stripImages));expect(received.data).toBe(text);expect(api.isSupportedOriginal(received)).toBe(true);
    expect(reopen(serialize([received],stripImages))[0].data).toBe(text);
   }
  }
 });
 it('keeps non-reading structured resources on their existing JSON path',()=>{
  const item={id:'glossary',type:'glossary',data:[{term:'leaf',image:'picture'}]};
  expect(reopen(serialize([item],false))[0].data).toEqual(item.data);
  expect(reopen(serialize([item],true))[0].data).toEqual([{term:'leaf'}]);
 });
});
