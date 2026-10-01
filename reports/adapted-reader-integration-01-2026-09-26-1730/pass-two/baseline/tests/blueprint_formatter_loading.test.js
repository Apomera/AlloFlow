import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url);
const React=require(path.resolve('desktop/web-app/node_modules/react'));
const {renderToStaticMarkup}=require(path.resolve('desktop/web-app/node_modules/react-dom/server'));
const babel=require('@babel/core');
const hosts=['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx'];
const renderer=(file,window,deps)=>{
 const source=readFileSync(file,'utf8');
 const start=source.indexOf('  const renderFormattedText = (text, enableGlossary = true, isDarkBg = false) => {');
 const end=source.indexOf('  const BilingualFieldRenderer',start);
 const compiled=babel.transformSync(source.slice(start,end),{plugins:['@babel/plugin-transform-react-jsx'],configFile:false,babelrc:false}).code;
 return new Function('React','window','_alloViewRenderersDeps',compiled+';return renderFormattedText;')(React,window,()=>deps);
};
describe('Blueprint / AI Guide text during formatter loading',()=>{
 it.each(hosts)('%s stays readable and escapes markup while the formatter loads',file=>{
  const render=renderer(file,{AlloModules:{}},{});
  const html=renderToStaticMarkup(render('Read <img src=x onerror=alert(1)>\nThen review the plan.'));
  expect(html).toContain('&lt;img');expect(html).not.toContain('<img');
  expect(html).toContain('Then review the plan.');expect(render(null)).toBeNull();
 });
 it.each(hosts)('%s resumes formatted rendering as soon as the module becomes available',file=>{
  const state={AlloModules:{}};const deps={language:'English'};const render=renderer(file,state,deps);
  expect(renderToStaticMarkup(render('Plan'))).toContain('Plan');
  const rich=vi.fn(()=>React.createElement('strong',null,'Formatted plan'));
  state.AlloModules.ViewRenderers={renderFormattedText:rich};
  expect(renderToStaticMarkup(render('Plan',false,true))).toBe('<strong>Formatted plan</strong>');
  expect(rich).toHaveBeenCalledWith('Plan',false,true,deps);
 });
});
