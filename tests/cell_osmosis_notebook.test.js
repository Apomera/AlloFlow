import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const React=require('../desktop/web-app/node_modules/react');
const {renderToStaticMarkup}=require('../desktop/web-app/node_modules/react-dom/server');
let C;
beforeAll(()=>{window.StemLab={registerTool(){}};new Function(readFileSync('stem_lab/stem_tool_cell.js','utf8'))();C=window.__alloCellPure;});
const trial={inside:100,outside:175,perm:25,cellType:'plant',prediction:'Water will leave.',observation:'Index is -18.75.'};
describe('Cell Osmosis notebook portability and evidence',()=>{
  it('round trips settings, recorded predictions, observations and explanation',()=>{
    const packet=C.osmosisNotebookPacket({...trial,log:[trial],explanation:'The wall does not prevent water loss.'});
    const restored=C.parseOsmosisNotebook(JSON.parse(JSON.stringify(packet)));
    expect(restored).toMatchObject({...trial,explanation:'The wall does not prevent water loss.'});
    expect(restored.log[0]).toMatchObject({...trial,tonicity:'Hypertonic',flow:-18.75,direction:'outward'});
    expect(restored.log[0]).not.toBe(trial);
    expect(trial).not.toHaveProperty('direction');
  });
  it('recalculates forged result labels from settings and preserves zero permeability',()=>{
    const packet=C.osmosisNotebookPacket({...trial,perm:0,log:[{...trial,perm:0}]});
    packet.log[0].direction='inward';packet.log[0].tonicity='Isotonic';packet.log[0].flow=900;
    const restored=C.parseOsmosisNotebook(packet);
    expect(restored.log[0]).toMatchObject({perm:0,direction:'blocked',tonicity:'Hypertonic'});
    expect(Math.abs(restored.log[0].flow)).toBe(0);
  });
  it('rejects unsupported, oversized, and invalid notebooks',()=>{
    const packet=C.osmosisNotebookPacket(trial);
    [null,{}, {...packet,version:2}, {...packet,log:Array(9).fill(trial)}, {...packet,settings:{...trial,perm:101}}, {...packet,log:[{...trial,inside:'100'}]}, {...packet,log:[{...trial,cellType:'fungus'}]}].forEach(value=>expect(()=>C.parseOsmosisNotebook(value)).toThrow());
  });
  it('migrates original records without repeating their incorrect isotonic label',()=>{
    const packet=C.osmosisNotebookPacket({log:[{i:50,o:100,p:0,st:'isotonic'},null]});
    expect(packet.log).toHaveLength(1);
    expect(packet.log[0]).toMatchObject({legacy:true,inside:50,outside:100,perm:0,tonicity:'Hypertonic',direction:'blocked'});
    expect(C.osmosisNotebookReport({log:[{i:50,o:100,p:0,st:'isotonic'}]})).toContain('evidence recalculated with the corrected model');
  });
  it('exports recorded evidence separately from later current settings',()=>{
    const text=C.osmosisNotebookReport({inside:25,outside:25,perm:0,cellType:'animal',log:[trial],explanation:'Two different conditions.'});
    expect(text).toContain('inside 25 mOsm/L');expect(text).toContain('inside 100 mOsm/L');
    expect(text).toContain('Observation: Index is -18.75.');expect(text).toContain('Two different conditions.');
    expect(text).toContain('not a measured rate');
  });
  it('renders malformed imported state without crashing or leaking object strings',()=>{
    const html=renderToStaticMarkup(C.renderOsmosisLab(React.createElement,{prediction:{bad:true},explanation:[],notice:{},observation:{},log:[{...trial,direction:'forged',prediction:{bad:true}}, {direction:'outward',inside:{},outside:100,perm:20},null]},()=>{}));
    expect(html).toContain('data-osmosis-portability');expect(html).not.toContain('[object Object]');expect(html).not.toContain('NaN');
    expect(html).toContain('Download report (.txt)');
  });
  it('allows clearing an explanation even when legacy hypothesis text exists',()=>{
    const html=renderToStaticMarkup(C.renderOsmosisLab(React.createElement,{hypothesis:'Old hypothesis',explanation:''},()=>{}));
    expect(html).not.toContain('Old hypothesis');
  });
});