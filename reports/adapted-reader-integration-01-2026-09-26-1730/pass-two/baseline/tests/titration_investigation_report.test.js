import fs from 'node:fs';
import {describe,it,expect} from 'vitest';

const source=fs.readFileSync('stem_lab/stem_tool_titration.js','utf8');
const notebook=source.slice(source.indexOf('function titrationBenchNotebook('),source.indexOf('// Guided endpoint investigation.'));
const helpers=source.slice(source.indexOf('function titrationInvestigationState('),source.indexOf('function TitrationInvestigationReportPreview('));
const api=new Function(notebook+helpers+';return {key:titrationInvestigationKey,progress:titrationInvestigationProgress,report:titrationInvestigationReport,html:titrationInvestigationReportHTML};')();
const t=(key,fallback)=>fallback;
const row=(id,volume,value,patch={})=>({id,volume,value,preset:'sa_sb',setup:'HCl (0.1 M) + NaOH (0.1 M)',axis:'pH',indicator:'Phenolphthalein',observation:'Simulated reading',note:'',...patch});
const records=[row(1,0,1,{note:'Colorless at the start.'}),row(2,25,7),row(3,25.1,10.3,{note:'Pink after the addition.'})];
function completed(rows=records,patch={}){
  const study={version:1,active:true,prediction:21,evidence:rows.map(api.key),compared:'',explanation:'My prediction was low. The saved readings bracket the indicator color change.',completed:true};
  study.compared=api.progress(study,rows).pair?.key||'';
  return {...study,...patch};
}

describe('saved titration investigation report',()=>{
  it('requires a completed conclusion with all reviewed evidence still available',()=>{
    for(const study of [null,{version:2},completed(records,{prediction:null}),completed(records,{completed:false}),completed(records,{explanation:' \n '}),completed(records,{compared:''})]){
      expect(api.report(study,records)).toBeNull();
      expect(api.html(study,records,t,'en','ltr')).toBeNull();
    }
    for(const rows of [[],records.slice(1),records.slice(0,2),[records[0],records[1],{...records[2],value:12}]])expect(api.report(completed(),rows)).toBeNull();
  });
  it('exports the saved prediction, three relevant readings, notes, and explanation',()=>{
    const unrelated=row(8,40,12,{note:'Unrelated notebook entry'}),study=completed(),report=api.report(study,[unrelated,...records]);
    expect(report).toEqual({prediction:21,explanation:study.explanation,setup:records[1].setup,indicator:'Phenolphthalein',interval:{low:25,high:25.1},equivalence:25,readings:[{role:'start',reading:records[0]},{role:'before',reading:records[1]},{role:'after',reading:records[2]}]});
    expect(api.html(study,[unrelated,...records],t)).not.toContain('Unrelated notebook entry');
  });
  it('remains available during free exploration and preserves the reviewed interval',()=>{
    const wide=[records[0],row(4,24.9,2.7),records[2]],study=completed(wide,{active:false}),all=[...wide,records[1]];
    study.evidence=all.map(api.key);
    expect(api.report(study,all).interval).toEqual({low:24.9,high:25.1});
    expect(api.report(study,all).readings.map(x=>x.reading.id)).toEqual([1,4,3]);
  });
  it('includes updated saved notes without mutating state or sharing output records',()=>{
    const study=completed(),rows=records.map(r=>({...r,note:'Updated note'})),before=JSON.stringify({study,rows});
    const report=api.report(study,rows);report.readings[0].reading.note='Changed output';report.interval.low=5;
    expect(JSON.stringify({study,rows})).toBe(before);
    expect(api.report(study,rows).readings[0].reading.note).toBe('Updated note');
    expect(api.html(study,rows,t)).toContain('Updated note');
  });
  it('escapes student and translated text in the standalone HTML',()=>{
    const hostile='</p><img src=x onerror="alert(1)"><script>bad()</script>&\'"',rows=records.map(r=>({...r,note:hostile})),study=completed(rows,{explanation:hostile});
    const html=api.html(study,rows,(k,f)=>k.endsWith('invest_report_title')?hostile:f,'en','ltr');
    expect(html).not.toContain('<img');expect(html).not.toContain('<script');
    expect(html).toContain('&lt;script&gt;bad()&lt;/script&gt;&amp;&#39;&quot;');
    expect(html.match(/onclick=/g)).toHaveLength(1);
    expect(html).toContain('onclick="window.print()"');
  });
  it('keeps multiline Unicode and makes truncated surrogate pairs safe to download',()=>{
    const explanation='Evidence 🧪\nConclusion: ΔpH → pink.\ud800',rows=records.map(r=>({...r,note:'\udc00 saved note 🧪'}));
    const html=api.html(completed(rows,{explanation}),rows,t,'en','ltr');
    expect(html).toContain('Evidence 🧪\nConclusion: ΔpH → pink.�');
    expect(html).toContain('� saved note 🧪');
    expect(()=>encodeURIComponent(html)).not.toThrow();
    const truncated=api.html(completed(records,{explanation:'a'.repeat(699)+'🧪'}),records,t);
    expect(()=>encodeURIComponent(truncated)).not.toThrow();
  });
  it('accepts language tags and limits document direction and injected attributes',()=>{
    expect(api.html(completed(),records,t,'ar','rtl')).toContain('<html lang="ar" dir="rtl">');
    expect(api.html(completed(),records,t,'zh-Hant-TW','ltr')).toContain('<html lang="zh-Hant-TW" dir="ltr">');
    for(const language of [undefined,'','en" onload="bad()',42])expect(api.html(completed(),records,t,language,'rtl" onload="bad()')).toContain('<html lang="en" dir="ltr">');
  });
  it('produces a standalone document with print controls and explicit scope',()=>{
    const html=api.html(completed(),records,t,'en','ltr');
    expect(html).toMatch(/^<!doctype html>/);
    expect(html).toContain('Starting sample: 25.0 mL of 0.1 M HCl');
    expect(html).toContain('25.0–25.1 mL');expect(html).toContain('Completion is not an automatic grade.');
    expect(html).toContain('Other notebook entries are not included.');
    expect(html).toContain('@media print');expect(html).toContain('.toolbar{display:none}');
    expect(html.match(/scope="row"/g)).toHaveLength(3);
    expect(html).not.toMatch(/<script|<link|<img|<iframe|https?:\/\//);
  });
});
