import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const require=createRequire(import.meta.url);
const {act}=require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const sources=['stem_lab/stem_tool_climateExplorer.js','desktop/web-app/public/stem_lab/stem_tool_climateExplorer.js'];
const cleanup=[];
let frames;
function mount(source,seed={}){
  resetStemLab();const tool=loadTool(source,'climateExplorer');
  const host=document.createElement('div');document.body.appendChild(host);
  const root=ReactDOMClient.createRoot(host);let current;
  const announce=vi.fn(),award=vi.fn();
  function Host(){
    const[data,setData]=React.useState({climateExplorer:{tab:'keeling',heroMotionPaused:true,...seed}});current=data.climateExplorer;
    return tool.render(makeCtx({toolData:data,setToolData:setData,callGemini:null,announceToSR:announce,awardXP:award}));
  }
  act(()=>root.render(React.createElement(Host)));
  cleanup.push(()=>{act(()=>root.unmount());host.remove();});
  return {host,one:selector=>host.querySelector(selector),all:selector=>[...host.querySelectorAll(selector)],state:()=>current,announce,award};
}
async function settle(){await act(async()=>{await Promise.resolve();vi.runOnlyPendingTimers();frames.splice(0).forEach(fn=>fn(16));await Promise.resolve();});}
async function activate(button){expect(button).toBeTruthy();button.focus();act(()=>button.click());await settle();}
function rows(view){return view.all('#ce-keeling-data-table tbody tr').map(row=>[...row.children].map(cell=>cell.textContent));}
beforeEach(()=>{
  vi.useFakeTimers();vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);frames=[];
  vi.stubGlobal('requestAnimationFrame',fn=>{frames.push(fn);return frames.length;});vi.stubGlobal('cancelAnimationFrame',vi.fn());
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null);
});
afterEach(async()=>{cleanup.splice(0).reverse().forEach(fn=>fn());await settle();vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();});

describe.each(sources)('Keeling record access: %s',source=>{
  it('keeps the data target persistent and empty until requested without stealing focus',async()=>{
    const outside=document.createElement('button');document.body.appendChild(outside);outside.focus();cleanup.push(()=>outside.remove());
    const view=mount(source);await settle();
    expect(document.activeElement).toBe(outside);
    const button=view.one('#ce-keeling-data-toggle'),panel=view.one('#ce-keeling-data-panel');
    expect(button.type).toBe('button');expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.getAttribute('aria-controls')).toBe(panel.id);expect(panel.getAttribute('aria-labelledby')).toBe(button.id);
    expect(panel.hidden).toBe(true);expect(panel.children).toHaveLength(0);
  });
  it('toggles a named region without moving focus or changing other saved work',async()=>{
    const view=mount(source,{rsSolar:43,ccPledges:{},fhReflection:'Keep this reflection'});await settle();
    const button=view.one('#ce-keeling-data-toggle'),panel=view.one('#ce-keeling-data-panel');
    const name=button.textContent.replace(/[▶▼]/g,'').trim();
    await activate(button);expect(panel.hidden).toBe(false);expect(button.getAttribute('aria-expanded')).toBe('true');expect(document.activeElement).toBe(button);
    expect(button.textContent.replace(/[▶▼]/g,'').trim()).toBe(name);
    await activate(button);expect(view.one('#ce-keeling-data-panel')).toBe(panel);expect(panel.hidden).toBe(true);expect(panel.children).toHaveLength(0);expect(document.activeElement).toBe(button);
    expect(view.state()).toMatchObject({rsSolar:43,fhReflection:'Keep this reflection',kcDataOpen:false});
    expect(view.announce).not.toHaveBeenCalled();expect(view.award).not.toHaveBeenCalled();
  });
  it('provides all 19 joined years with signed temperature and explicit missing samples',async()=>{
    const view=mount(source,{kcDataOpen:true});await settle();
    expect(rows(view)).toEqual([
      ['1958','315.0','+0.07'],['1960','316.9','Not in sample'],['1965','320.0','-0.10'],['1970','325.7','+0.04'],
      ['1975','331.1','+0.01'],['1980','338.7','+0.27'],['1985','346.1','+0.13'],['1990','354.4','+0.46'],
      ['1995','360.9','+0.46'],['2000','369.5','+0.42'],['2005','379.8','+0.69'],['2010','389.9','+0.72'],
      ['2013','396.5','Not in sample'],['2015','401.0','+0.90'],['2018','408.5','+0.85'],['2020','414.2','+1.01'],
      ['2022','418.5','+0.89'],['2023','Not in sample','+1.17'],['2024','424.6','+1.28']
    ]);
    expect(view.one('#ce-keeling-data-table caption').textContent).toMatch(/1958–2024/);
    expect(view.all('#ce-keeling-data-table thead th[scope="col"]').map(cell=>cell.textContent)).toEqual(['Year','CO₂ (ppm)','Temp. (°C)']);
    expect(view.one('#ce-keeling-data-table thead th:last-child').getAttribute('aria-label')).toBe('Temperature difference (°C)');
    expect(view.all('#ce-keeling-data-table tbody th[scope="row"]')).toHaveLength(19);
    expect(view.one('#ce-keeling-data-table').getAttribute('aria-describedby')).toBe('ce-keeling-data-note');
    expect(view.one('#ce-keeling-data-note').textContent).toMatch(/1958.*not a complete annual mean.*does not mean zero/);
  });
  it.each([undefined,null,false,1,'true',{},[]])('does not expose a table for malformed restored state %j',async value=>{
    const view=mount(source,{kcDataOpen:value});await settle();expect(view.one('#ce-keeling-data-panel').hidden).toBe(true);
    expect(view.one('#ce-keeling-data-table')).toBeNull();await activate(view.one('#ce-keeling-data-toggle'));expect(rows(view)).toHaveLength(19);
  });
  it('retains the table choice across ordinary tab navigation',async()=>{
    const view=mount(source,{kcDataOpen:true});await settle();
    await activate(view.one('#ce-tab-carbon'));expect(view.one('#ce-keeling-data-table')).toBeNull();
    await activate(view.one('#ce-tab-keeling'));expect(rows(view)).toHaveLength(19);expect(document.activeElement.id).toBe('ce-tab-keeling');
  });
  it('gives matching chart values and explanations without implying a monthly or live record',async()=>{
    const view=mount(source,{kcDataOpen:true});await settle();
    const summary=view.one('#ce-keeling-summary').textContent,legend=view.one('#ce-keeling-legend').textContent;
    expect(summary).toContain('315.0 ppm');expect(summary).toContain('424.6 ppm');expect(summary).toContain('+0.07 °C');expect(summary).toContain('+1.28 °C');
    expect(legend).toMatch(/solid blue.*circles.*dashed amber.*squares/);expect(legend).toContain('1951–1980');
    const panel=view.one('#ce-keeling').textContent;
    expect(panel).toContain('not a live data feed');expect(panel).toContain('do not show that monthly cycle');expect(panel).toContain('Daily readings and annual averages differ');
    expect(panel).not.toContain('projected ~2035');expect(panel).not.toContain('you can see both');
    expect(view.one('#ce-keeling-noaa-source').href).toBe('https://gml.noaa.gov/ccgg/trends/data.html');
    expect(view.one('#ce-keeling-nasa-source').href).toBe('https://data.giss.nasa.gov/gistemp/');
  });
});
