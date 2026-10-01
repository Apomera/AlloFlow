import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require=createRequire(import.meta.url);
let React,renderToStaticMarkup,formatInteractiveText,toFocusText;
beforeAll(()=>{
  React=require(resolve('desktop/web-app/node_modules/react'));
  ({renderToStaticMarkup}=require(resolve('desktop/web-app/node_modules/react-dom/server')));
  global.React=window.React=React;
  loadAlloModule('phase_n_misc_helpers_module.js');
  formatInteractiveText=window.AlloModules.PhaseNHelpers.formatInteractiveText;
  const host=readFileSync('AlloFlowANTI.txt','utf8');
  const start=host.indexOf('  const toFocusText = (text) => {');
  const end=host.indexOf('\n  };',start);
  expect(start).toBeGreaterThan(-1);expect(end).toBeGreaterThan(start);
  const {code}=require('@babel/core').transformSync(host.slice(start,end+5),{plugins:['@babel/plugin-transform-react-jsx'],babelrc:false,configFile:false});
  toFocusText=new Function('React',code+'\nreturn toFocusText;')(React);
});
function render(text,focusMode,cloze=false){
  const html=renderToStaticMarkup(React.createElement('div',null,formatInteractiveText(text,cloze,false,{
    focusMode,toFocusText,latestGlossary:[],highlightGlossaryTerms:value=>value,
    MathSymbol:({text})=>React.createElement('span',{'data-math':true},text)
  })));
  const container=document.createElement('div');container.innerHTML=html;return container;
}
describe('interactive prose preserves markdown with Bionic on or off',()=>{
  it.each([false,true])('renders bold and italic without leaking delimiters (Bionic=%s)',enabled=>{
    const view=render('The **important** idea is *careful*.',enabled);
    expect(view.textContent).toBe('The important idea is careful.');
    expect(view.querySelector('strong')?.textContent).toBe('important');
    expect(view.querySelector('em')?.textContent).toBe('careful');
    expect(!!view.querySelector('b.font-inherit')).toBe(enabled);
  });
  it.each([false,true])('preserves a fully bold sentence (Bionic=%s)',enabled=>{
    expect(render('**Plants take in water.**',enabled).textContent).toBe('Plants take in water.');
  });
  it.each([false,true])('preserves math and link text without applying Bionic inside them (Bionic=%s)',enabled=>{
    const view=render('Use $a+b$ and [the guide](https://example.com/guide) to **practice**.',enabled);
    expect(view.textContent).toBe('Use $a+b$ and the guide to practice.');
    expect(view.querySelector('[data-math] b')).toBeNull();
    expect(view.querySelector('a')?.getAttribute('href')).toBe('https://example.com/guide');
    expect(view.querySelector('a b')).toBeNull();
  });
  it('retains the deliberate cloze exclusion while preserving bold prose',()=>{
    const view=render('The **evidence** supports this answer.',true,true);
    expect(view.textContent).toBe('The evidence supports this answer.');
    expect(view.querySelector('strong')?.textContent).toBe('evidence');
    expect(view.querySelector('b')).toBeNull();
  });
});
