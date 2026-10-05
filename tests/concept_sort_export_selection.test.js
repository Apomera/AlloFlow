import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
const src=readFileSync('view_export_preview_source.jsx','utf8');
const start=src.indexOf('function _builderReadingHistory');
const end=src.indexOf('function ',src.indexOf('function _builderSelectedResourceItems')+10);
const helperCode=src.slice(start,end);
let H,pipeline;
const sort={id:'sort-unique',type:'concept-sort',title:'Sort example',data:{categories:[{id:'mammal',label:'Mammals'}],items:[{id:'otter',content:'UNIQUE OTTER',categoryId:'mammal'}]}};
beforeAll(()=>{
 H=new Function(helperCode+';return {_builderResourceOptions,_builderResourceIncluded,_builderBulkResourceUpdate,_builderSelectedResourceItems};')();
 loadAlloModule('doc_pipeline_module.js');
 pipeline=window.AlloModules.createDocPipeline({callGemini:async()=> '{}',addToast:()=>{},t:k=>k,isRtlLang:()=>false,updateExportPreview:()=>{},getDefaultTitle:()=> 'Document',state:{}});
});
describe('Concept Sort selection agrees with actual export bytes',()=>{
 it('offers the same identity independently of Quiz and supports bulk off/on',()=>{
  expect(H._builderResourceOptions([sort],()=> '')).toEqual([['includeConceptSort','Concept Sort','concept-sort']]);
  expect(H._builderSelectedResourceItems([sort],{},()=> '')).toMatchObject([{id:'sort-unique',included:true}]);
  expect(H._builderBulkResourceUpdate([sort],{},()=> '')).toEqual({includeConceptSort:false});
  expect(H._builderBulkResourceUpdate([sort],{includeConceptSort:false},()=> '')).toEqual({includeConceptSort:true});
 });
 it.each([false,true])('omits disabled section and TOC in worksheet=%s',worksheet=>{
  const html=pipeline.generateFullPackHTML([sort],'Sort packet',worksheet,{}, {includeConceptSort:false,includeQuiz:true,includeTeacherKey:true,annotations:[]});
  expect(html).not.toContain('UNIQUE OTTER');
  expect(html).not.toContain('Mammals');
 });
 it.each([false,true])('exports selected section independently of Quiz in worksheet=%s',worksheet=>{
  const html=pipeline.generateFullPackHTML([sort],'Sort packet',worksheet,{}, {includeConceptSort:true,includeQuiz:false,includeTeacherKey:false,annotations:[]});
  expect(html).toContain('UNIQUE OTTER');
  expect(html).toContain('Mammals');
 });
});
