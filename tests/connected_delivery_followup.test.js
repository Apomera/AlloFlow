import { beforeAll, afterEach, describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { applyPatch } from 'diff';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
const payload = JSON.parse(readFileSync('reports/connected-delivery-track13/delivery-locales.json','utf8'));
let api, shared, live, root, host;
beforeAll(() => {
  window.React=React; globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  for (const name of ['instructional_context_module.js','firestore_sync_module.js','shared_activity_module.js','live_aac_module.js']) loadAlloModule(name);
  api=window.AlloModules.InstructionalContext; shared=window.AlloModules.SharedActivity; live=window.AlloModules.LiveAac;
});
afterEach(() => { if(root)act(()=>root.unmount());root=null;host?.remove();host=null; });
// Read each large catalog once, outside timed test bodies.
const englishCatalog = JSON.parse(readFileSync('ui_strings.js','utf8')).share_collect;
const catalogs = Object.fromEntries(Object.keys(payload.locales).map(slug => [slug, {
  root: JSON.parse(readFileSync('lang/'+slug+'.js','utf8')).share_collect,
  public: JSON.parse(readFileSync('desktop/web-app/public/lang/'+slug+'.js','utf8')).share_collect
}]));
const translate = values => key => values[key.replace('share_collect.','')] || key;
function mount(resources,id,values=payload.english) {
  host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);
  act(()=>root.render(React.createElement(shared.ReceivedReadingDelivery,{resources,currentResourceId:id,enabled:true,t:translate(values)})));
}
describe('received reading view and scoped locales',()=>{
  it('recomputes received audio evidence after a resource replacement without trusting a saved summary',()=>{
    const original=api.createSupportedReading('A small source.',{id:'original',sourceFamilyId:'family'});
    original.deliverySummary={referenceAudio:{inclusion:'included',availability:'ready'}};
    mount([original],original.id);
    expect(host.querySelector('[data-received-audio]').textContent).toBe(payload.english.received_audio_omitted);
    const changed={...original,karaokeAudio:{version:4,entries:{one:{audio:'fixture'}}}};
    act(()=>root.render(React.createElement(shared.ReceivedReadingDelivery,{resources:[changed],currentResourceId:original.id,enabled:true,t:translate(payload.english)})));
    expect(host.querySelector('[data-received-audio]').textContent).toBe(payload.english.reading_audio_included_unchecked);
  });
  it('shows pending and failed whole-pack hydration without implying an empty reading',()=>{
    const resources=[{id:'manifest',type:'session-resources-manifest',__alloResourcesManifestRef:'asset',__alloResourceCount:200}];
    mount(resources,'manifest');expect(host.textContent).toContain(payload.english.contents_pending);
    act(()=>root.render(React.createElement(shared.ReceivedReadingDelivery,{resources,currentResourceId:'manifest',enabled:true,assetStatus:'failed',t:translate(payload.english)})));
    expect(host.textContent).toContain(payload.english.contents_unavailable);
    expect(host.textContent).not.toContain('0 saved word supports');
  });
  for(const [slug,values] of Object.entries(payload.locales)) {
    it('registers and renders all scoped messages in '+slug,()=>{
      const placeholders=s=>(s.match(/\{\w+\}/g)||[]).sort();
      for(const [key,value]of Object.entries(values)) {
        expect(catalogs[slug].root[key]).toBe(value);
        expect(catalogs[slug].public[key]).toBe(value);
        expect(placeholders(value)).toEqual(placeholders(payload.english[key]));
        expect(englishCatalog[key]).toBe(payload.english[key]);
      }
      const original=api.createSupportedReading('A small source.',{id:'original'});mount([original],original.id,values);
      expect(host.textContent).toContain(values.received_reading);
      expect(host.querySelector('[data-received-audio]').textContent).toBe(values.received_audio_omitted);
      expect(host.textContent).not.toContain('share_collect.');
    });
  }
});
describe('recipient integration artifact',()=>{
  it('applies the exact host wiring, rendering received resources and opting into revision receipts',()=>{
    const before=readFileSync('AlloFlowANTI.txt','utf8').replace(/\r\n/g,'\n');
    const source=before.includes('function ReceivedReadingDeliveryStatus(props)') ? before : applyPatch(before,readFileSync('reports/connected-delivery-track13/recipient-integration.patch','utf8'));
    expect(source).toBeTruthy();
    expect(source).toContain('resources={receivedDeliveryResources}');
    expect(source).not.toContain('resources={history}\n          currentResourceId={generatedContent?.id}');
    for (const name of ['hydrated','merged','restoredResources','rawResources']) expect(source).toContain('setReceivedDeliveryResources('+name+');');
    expect(source).toContain('currentResourceId={generatedContent?.id}');
    expect(source).toContain('revisionReceipts={true}');
    expect(source).toContain('getPreparedMailboxResource: item => mbPreparedImagesRef.current.get(item)?.resource || null');
    const from=source.indexOf('function ReceivedReadingDeliveryStatus(props)'),to=source.indexOf('function MailboxImageDeliveryMonitor(props)',from);
    const js=require('@babel/core').transformSync(source.slice(from,to),{plugins:['@babel/plugin-transform-react-jsx'],configFile:false,babelrc:false}).code;
    const View=new Function('React','_alloSharedActivityModule',js+';return ReceivedReadingDeliveryStatus;')(React,()=>shared);
    const original=api.createSupportedReading('A source.',{id:'original'});
    host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);
    act(()=>root.render(React.createElement(View,{resources:[original],currentResourceId:'original',enabled:true,t:translate(payload.english)})));
    expect(host.querySelector('[data-received-reading-delivery]')).toBeTruthy();
  });
});


describe('received consistency messages',()=>{
  it('shows an unreadable body warning without displaying the damaged payload',()=>{
    const original=api.createSupportedReading('A source.',{id:'original'});
    const adapted={id:'adapted',type:'simplified',data:'{"PRIVATE_DAMAGED_BODY":',dataEncoding:'json-text/v1',sourceSnapshot:original.sourceSnapshot,instructionalText:{form:'adapted',role:'supplemental'}};
    mount([adapted],adapted.id);
    expect(host.querySelector('[data-reading-body-unavailable]').textContent).toBe(payload.english.reading_body_unavailable);
    expect(host.textContent).not.toContain('PRIVATE_DAMAGED_BODY');
    expect(host.textContent).not.toContain(payload.english.received_adapted);
  });
  it('explains unavailable supports without counting their notes as active',()=>{
    const original=api.createSupportedReading('A source.',{id:'original'});
    original.readingSupports=api.validateReadingSupports(original,{annotations:[{start:2,end:8,quote:'source',text:'PRIVATE_NOTE',origin:'educator'}]});
    original.readingSupports.status='unavailable';
    mount([original],original.id);
    expect(host.textContent).toContain(payload.english.reading_supports_unavailable);
    expect(host.textContent).toContain('0 saved word supports.');
    expect(host.textContent).not.toContain('PRIVATE_NOTE');
  });
});


describe('received original replacement',()=>{
 it('updates original availability and support counts when the matching original arrives and is removed',()=>{
  const original=api.createSupportedReading('A source.',{id:'original',sourceFamilyId:'family',unitId:'unit'});
  original.readingSupports=api.validateReadingSupports(original,{annotations:[{start:2,end:8,quote:'source',text:'A beginning',origin:'educator'}]});
  const adapted={id:'adapted',type:'simplified',data:'A beginning.',sourceSnapshot:original.sourceSnapshot,sourceFamilyId:'family',unitId:'unit',instructionalText:{form:'adapted',role:'supplemental'},readingSourceAvailability:{status:'unavailable',reason:'source-unavailable'}};
  mount([adapted],adapted.id);
  expect(host.textContent).not.toContain(payload.english.received_original);
  const render=resources=>act(()=>root.render(React.createElement(shared.ReceivedReadingDelivery,{resources,currentResourceId:adapted.id,enabled:true,t:translate(payload.english)})));
  render([adapted,original]);
  expect(host.textContent).toContain(payload.english.received_original);
  expect(host.textContent).toContain('1 saved word supports.');
  expect(host.textContent).not.toContain('Matching original unavailable');
  render([adapted]);
  expect(host.textContent).not.toContain(payload.english.received_original);
  expect(host.textContent).not.toContain('1 saved word supports.');
 });
});
